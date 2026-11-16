#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { createDynamoState } from '../lib/aws/dynamodb.mjs';
import { resolveInstallation as productionResolver } from '../lib/aws/installation.mjs';
import { result } from '../lib/state/contract.mjs';

const help = `Usage:
  node scripts/manager-state.mjs init --config FILE --installation FILE --operator-profile NAME [--json]
  node scripts/manager-state.mjs inspect --config FILE --installation FILE --kind installation|stream|attempt|member [--record-id ID|--cursor CURSOR] [--limit 1..100] --operator-profile NAME [--recovery] [--json]

Initialize a verified fresh installation while disabled, or inspect retained state.
Use the canonical configuration and generated installation receipt. No resource
override, enable, unlock, purge, reconciliation or retry command exists.
Prepare pinned root and runtime/aws dependencies before use; commands never install.
Select the prepared operator profile; its exact canonical role is verified.
Use inspect --recovery only after partial configure: original resources remain
verified, but package/runtime safety is unverified. It grants no enable/apply/replay.
An unknown write must be inspected using the same installation and attempt ID.
`;
function parse(argv) {
  if (argv.length === 1 && ['--help', '-h'].includes(argv[0])) return { help: true };
  if (!['init', 'inspect'].includes(argv[0])) throw Error();
  const out = { command: argv[0], json: false };
  const allowed = new Set(['config', 'installation', 'operator-profile', ...(out.command === 'inspect' ? ['kind', 'record-id', 'cursor', 'limit'] : [])]);
  const seen = new Set();
  for (let n = 1; n < argv.length; n++) {
    const flag = argv[n]; if (!flag.startsWith('--') || seen.has(flag)) throw Error(); seen.add(flag);
    if (flag === '--recovery') { if(out.command !== 'inspect') throw Error(); out.recovery = true; continue; }
    if (flag === '--json') { out.json = true; continue; }
    const field = flag.slice(2); if (!allowed.has(field) || typeof argv[n + 1] !== 'string' || argv[n + 1].startsWith('--') || !argv[n + 1].length || argv[n + 1].length > 4096) throw Error();
    out[field] = argv[++n];
  }
  if (!out.config || !out.installation || !out['operator-profile']) throw Error();
  if (out.command === 'inspect') {
    if (!['installation', 'stream', 'attempt', 'member'].includes(out.kind) || out['record-id'] && out.cursor) throw Error();
    if (out.limit !== undefined) { if (!/^(?:[1-9]|[1-9][0-9]|100)$/.test(out.limit)) throw Error(); out.limit = Number(out.limit); }
    if (out['record-id'] && !/^[A-Za-z0-9._:-]{1,255}$/.test(out['record-id'])) throw Error();
    if (out.cursor && (!/^[A-Za-z0-9_-]+$/.test(out.cursor) || out.cursor.length > 2048)) throw Error();
  }
  return out;
}
export function stateExitCode(outcome) {
  if (outcome.status === 'confirmed') return 0;
  return outcome.status === 'conflict' || outcome.code === 'INCOMPLETE_INVENTORY' ? 1 : 2;
}
function readable(outcome) {
  const rows = [outcome.status + ': ' + outcome.code, ...outcome.diagnostics.map(d => d.message)];
  if (outcome.recovery) rows.push('Recovery: ' + JSON.stringify(outcome.recovery));
  if (outcome.data) {
    rows.push('Canonical/applied controls: ' + (outcome.data.controls_match ? 'match' : 'differ; inspect remains read-only'));
    for (const record of outcome.data.records ?? (outcome.data.installation ? [outcome.data.installation] : [])) {
      rows.push(JSON.stringify(record));
      if (record.kind === 'stream' && record.pending_attempt_id) rows.push('Pending hold: ' + record.pending_attempt_id);
      if (record.kind === 'attempt' && record.outcome === 'pending') rows.push('Pending hold: ' + record.attempt_id);
    }
    if (outcome.data.complete === false) rows.push('More records: use --cursor ' + outcome.data.next_cursor + ' with the same kind and installation.');
  }
  return rows.join('\n') + '\n';
}
/** Core supplies its trusted resolver here at final PGB-82/83 integration. This
 * function never reads an alternate config, imports arbitrary modules or accepts
 * resource/credential/freshness assertions from command-line inputs. */
export async function runStateCommand(argv, { resolveInstallation = productionResolver, createState = createDynamoState, now = () => new Date().toISOString() } = {}) {
  let options;
  try { options = parse(argv); } catch { const outcome = result('invalid', 'INVALID_INPUT'); return { outcome, stdout: argv.includes('--json') ? JSON.stringify(outcome) + '\n' : readable(outcome), exitCode: 2 }; }
  if (options.help) return { outcome: null, stdout: help, exitCode: 0 };
  let state, outcome, resolved;
  try {
    if (typeof resolveInstallation !== 'function') outcome = result('unavailable', 'CORE_PREREQUISITE');
    else {
      resolved = await resolveInstallation({ configPath: options.config, installationPath: options.installation, purpose: options.recovery ? 'recovery-inspect' : options.command, operatorProfile: options['operator-profile'] });
      state = createState({ binding: resolved.binding, control: resolved.control, client: resolved.client });
      outcome = options.command === 'init'
        ? await state.initialize({ fresh_installation: resolved.fresh_installation, now: now() })
        : await state.inspect({ kind: options.kind, ...(options['record-id'] ? { record_id: options['record-id'] } : {}), ...(options.cursor ? { cursor: options.cursor } : {}), ...(options.limit ? { limit: options.limit } : {}) });
      if(options.recovery && resolved.recovery) outcome = {...outcome, recovery:resolved.recovery};
    }
  } catch (error) { outcome = error.stateResult ?? result('unavailable', 'UNAVAILABLE'); }
  finally { state?.close?.(); resolved?.dispose?.(); }
  return { outcome, stdout: options.json ? JSON.stringify(outcome) + '\n' : readable(outcome), exitCode: stateExitCode(outcome) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const answer = await runStateCommand(process.argv.slice(2)); process.stdout.write(answer.stdout); process.exitCode = answer.exitCode;
}
