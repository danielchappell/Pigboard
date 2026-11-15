#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createDynamoState } from '../lib/aws/dynamodb.mjs';
import { result, transitionProof, parseReconciliationRequest } from '../lib/state/contract.mjs';
import { reconcile } from '../lib/manager/reconcile.mjs';

const help = `Usage:
  node scripts/manager-state.mjs init --config FILE --installation FILE [--json]
  node scripts/manager-state.mjs inspect --config FILE --installation FILE --kind installation|stream|attempt|member [--record-id ID|--cursor CURSOR] [--limit 1..100] [--json]
  node scripts/manager-state.mjs reconcile --config FILE --installation FILE --request FILE [--json]

Initialize a verified fresh installation while disabled, inspect retained state,
or reconcile one positively proved outcome.
Use the canonical configuration and generated installation receipt. No resource
override, enable, unlock, purge or retry command exists.
Prepare pinned root and runtime/aws dependencies before use; commands never install.
This early checkpoint requires the core installation resolver before normal use.
An unknown write must be inspected using the same installation and attempt ID.
Attempt inspection summarizes retained proof as none, prepared, response-captured
or unsupported. HTTP status is evidence only; it does not finalize pending work.
Capture operations are internal trusted-writer APIs, not command inputs.
Reconcile requires actual operator/stop/runtime and complete Jira/history facts.
The request selects one attempt, supported disposition and exact revisions only.
`;
function parse(argv) {
  if (argv.length === 1 && ['--help', '-h'].includes(argv[0])) return { help: true };
  if (!['init', 'inspect', 'reconcile'].includes(argv[0])) throw Error();
  const out = { command: argv[0], json: false };
  const allowed = new Set(['config', 'installation', ...(out.command === 'inspect' ? ['kind', 'record-id', 'cursor', 'limit'] : out.command === 'reconcile' ? ['request'] : [])]);
  const seen = new Set();
  for (let n = 1; n < argv.length; n++) {
    const flag = argv[n]; if (!flag.startsWith('--') || seen.has(flag)) throw Error(); seen.add(flag);
    if (flag === '--json') { out.json = true; continue; }
    const field = flag.slice(2); if (!allowed.has(field) || typeof argv[n + 1] !== 'string' || argv[n + 1].startsWith('--') || !argv[n + 1].length || argv[n + 1].length > 4096) throw Error();
    out[field] = argv[++n];
  }
  if (!out.config || !out.installation) throw Error();
  if (out.command === 'reconcile' && !out.request) throw Error();
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
  if (outcome.data) {
    if (Object.hasOwn(outcome.data, 'controls_match')) rows.push('Canonical/applied controls: ' + (outcome.data.controls_match ? 'match' : 'differ; inspect remains read-only'));
    for (const record of outcome.data.records ?? (outcome.data.attempt ? [outcome.data.installation, outcome.data.stream, outcome.data.attempt] : outcome.data.installation ? [outcome.data.installation] : [])) {
      rows.push(JSON.stringify(record));
      if (record.kind === 'stream' && record.pending_attempt_id) rows.push('Pending hold: ' + record.pending_attempt_id);
      if (record.kind === 'attempt' && record.outcome === 'pending') rows.push('Pending hold: ' + record.attempt_id);
      if (record.kind === 'attempt') {
        const proof = transitionProof(record);
        rows.push('Retained transition evidence: ' + proof.state + '; attempt ' + record.attempt_id + '; outcome ' + record.outcome + '; request digest ' + (proof.request_digest ?? 'none') + '; original HTTP status ' + (proof.http_status ?? 'none') + '. No send/retry or terminal outcome is authorized by this summary.');
      }
    }
    if (outcome.data.complete === false) rows.push('More records: use --cursor ' + outcome.data.next_cursor + ' with the same kind and installation.');
  }
  return rows.join('\n') + '\n';
}
/** Core supplies its trusted resolver here at final PGB-82/83 integration. This
 * function never reads an alternate config, imports arbitrary modules or accepts
 * resource/credential/freshness assertions from command-line inputs. */
async function readRequestFile(path) {
  let file;
  try {
    file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
    if (!(await file.stat()).isFile()) throw Error();
    const buffer = Buffer.alloc(16385); let count = 0;
    while (count < buffer.length) {
      const part = await file.read(buffer, count, buffer.length - count, null);
      if (!part.bytesRead) break;
      count += part.bytesRead;
    }
    if (count > 16384) throw Error();
    return buffer.subarray(0, count);
  } catch { throw Object.assign(Error(), { stateResult: result('invalid', 'INVALID_INPUT') }); }
  finally { await file?.close(); }
}
export async function runStateCommand(argv, { resolveInstallation, createState = createDynamoState, now = () => new Date().toISOString(), readRequest = readRequestFile, reconciliationCapabilities } = {}) {
  let options;
  try { options = parse(argv); } catch { const outcome = result('invalid', 'INVALID_INPUT'); return { outcome, stdout: argv.includes('--json') ? JSON.stringify(outcome) + '\n' : readable(outcome), exitCode: 2 }; }
  if (options.help) return { outcome: null, stdout: help, exitCode: 0 };
  let state, outcome;
  try {
    const request = options.command === 'reconcile' ? parseReconciliationRequest(await readRequest(options.request)) : null;
    if (typeof resolveInstallation !== 'function') outcome = result('unavailable', 'CORE_PREREQUISITE');
    else {
      const resolved = await resolveInstallation({ configPath: options.config, installationPath: options.installation, purpose: options.command });
      state = createState({ binding: resolved.binding, control: resolved.control });
      outcome = options.command === 'reconcile' ? await reconcile({ request, binding: resolved.binding, canonicalConfig: resolved.canonicalConfig, state }, reconciliationCapabilities) : options.command === 'init'
        ? await state.initialize({ fresh_installation: resolved.fresh_installation, now: now() })
        : await state.inspect({ kind: options.kind, ...(options['record-id'] ? { record_id: options['record-id'] } : {}), ...(options.cursor ? { cursor: options.cursor } : {}), ...(options.limit ? { limit: options.limit } : {}) });
    }
  } catch (error) { outcome = error.stateResult ?? result('unavailable', 'UNAVAILABLE'); }
  finally { state?.close?.(); }
  return { outcome, stdout: options.json ? JSON.stringify(outcome) + '\n' : readable(outcome), exitCode: stateExitCode(outcome) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const answer = await runStateCommand(process.argv.slice(2)); process.stdout.write(answer.stdout); process.exitCode = answer.exitCode;
}
