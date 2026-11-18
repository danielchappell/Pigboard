#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { createDynamoInspectionState, createDynamoState } from '../lib/aws/dynamodb.mjs';
import { resolveInstallation as productionResolver } from '../lib/aws/installation.mjs';
import { attemptSchema, result, transitionProof, valid } from '../lib/state/contract.mjs';
import { inspectTransition, rejectTransitionInspection } from '../lib/manager/inspect-transition.mjs';

const help = `Usage:
  node scripts/manager-state.mjs init --config FILE --installation FILE --operator-profile NAME [--json]
  node scripts/manager-state.mjs inspect --config FILE --installation FILE --kind installation|stream|attempt|member [--record-id ID|--cursor CURSOR] [--limit 1..100] --operator-profile NAME [--recovery] [--json]
  node scripts/manager-state.mjs inspect --config FILE --installation FILE --kind attempt --record-id attempt:<UUID> --operator-profile NAME --jira-evidence [--original-installation FILE] [--json]

Initialize a verified fresh installation while disabled, or inspect retained state.
Use the canonical configuration and generated installation receipt. No resource
override, enable, unlock, purge, reconciliation or retry command exists.
Prepare pinned root and runtime/aws dependencies before use; commands never install.
Select the prepared operator profile; its exact canonical role is verified.
Use inspect --recovery only after partial configure: original resources remain
verified, but package/runtime safety is unverified. It grants no enable/apply/replay.

Trusted writers use retainPublication, prepareTransitionCapture and
recordTransitionResponse through the internal API; these are not CLI commands.
Capture states: none, prepared, response-captured or unsupported. HTTP status is
an original response fact, not a final outcome or permission to send again.
An unknown write must be inspected using the same installation and attempt ID.
Use stream inspection to find its pending attempt UUID. Add --jira-evidence to
inspect current Jira facts with the configured recovery credential. For original
sending authority that differs from today's installation, supply the saved
sender receipt with --original-installation. This check never settles the hold.
For evidence inspection, exit 0 means complete, 1 means partial, and 2 means
invalid input or an unavailable operator, installation or named snapshot.
`;
function parse(argv) {
  if (argv.length === 1 && ['--help', '-h'].includes(argv[0])) return { help: true };
  if (!['init', 'inspect'].includes(argv[0])) throw Error();
  const out = { command: argv[0], json: false };
  const allowed = new Set(['config', 'installation', 'operator-profile', ...(out.command === 'inspect' ? ['kind', 'record-id', 'cursor', 'limit', 'original-installation'] : [])]);
  const seen = new Set();
  for (let n = 1; n < argv.length; n++) {
    const flag = argv[n]; if (!flag.startsWith('--') || seen.has(flag)) throw Error(); seen.add(flag);
    if (flag === '--recovery') { if(out.command !== 'inspect') throw Error(); out.recovery = true; continue; }
    if (flag === '--jira-evidence') { if (out.command !== 'inspect') throw Error(); out.jiraEvidence = true; continue; }
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
  if (out.jiraEvidence) {
    const id = out['record-id'];
    if (out.kind !== 'attempt' || out.cursor || out.limit || out.recovery
      || !id?.startsWith('attempt:') || !valid(id.slice(8), attemptSchema.properties.attempt_id)) throw Error();
  } else if (out['original-installation']) throw Error();
  return out;
}
export function stateExitCode(outcome) {
  if (outcome.schema === 'pigboard-transition-inspection/v1') return ({ complete: 0, partial: 1 })[outcome.status] ?? 2;
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
      if (record.kind === 'attempt') {
        const proof = transitionProof(record);
        rows.push('Transition capture: ' + proof.state + '; attempt ' + record.attempt_id);
        if (proof.request_digest) rows.push('Request commitment: ' + proof.request_digest);
        if (proof.http_status !== null) rows.push('Original HTTP response: ' + proof.http_status + '; outcome remains ' + record.outcome);
        if (record.outcome === 'pending') rows.push('Pending hold: ' + record.attempt_id);
      }
    }
    if (outcome.data.complete === false) rows.push('More records: use --cursor ' + outcome.data.next_cursor + ' with the same kind and installation.');
  }
  return rows.join('\n') + '\n';
}
function readableRecord(record) {
  // JSON escapes ASCII line breaks and ESC. Escape the remaining terminal controls and line separators too.
  return JSON.stringify(record).replace(/[\u007f-\u009f\u2028\u2029]/g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));
}

export function renderTransitionInspection(outcome) {
  const rows = [outcome.status + ' ' + outcome.code, ...outcome.diagnostics.map(d => d.message)];
  const { data } = outcome;
  if (!data) return rows.join('\n') + '\n';

  rows.push('Named State snapshot ' + readableRecord({
    attempt_id: data.attempt_id, pending_attempt_id: data.pending_attempt_id, state_outcome: data.state_outcome, revisions: data.revisions
  }));
  rows.push('Controls ' + readableRecord({
    desired: data.desired_controls, applied: data.applied_controls, observed_schedule: data.observed_schedule,
    controls_match: data.controls_match, schedule_matches_applied: data.schedule_matches_applied
  }));
  const capture = data.original_capture;
  rows.push('Original capture ' + readableRecord(capture));
  if (capture.interpretation === 'success_reply') rows.push('Original HTTP 204 was the sender’s success reply.');
  if (capture.interpretation === 'rejection_reply') rows.push('Original HTTP 409 was the sender’s rejection reply. Earlier comments and assignment may still exist.');
  rows.push('Evidence agreement ' + readableRecord({
    state_fence: data.state_fence, current_agreement: data.current_agreement, jira_observations: data.jira_observations
  }));
  for (const [label, key] of [
    ['Pending eligibility', 'pending'], ['Original authority', 'original_authority'], ['Original publication metadata', 'original_metadata'],
    ['Retained inventory', 'inventory'], ['Recovery credential', 'recovery_credential'], ['Jira acquisition', 'jira_acquisition'],
    ['Jira assignment', 'assignment'], ['Recorded proof', 'recorded_proof']
  ]) rows.push(label + ' ' + readableRecord(data[key]));
  const { comments, ...publication } = data.publication;
  rows.push('Jira publication ' + readableRecord(publication));
  for (const comment of comments ?? []) rows.push('Jira publication comment ' + readableRecord(comment));
  const { items, ...history } = data.native_history;
  rows.push('Native history ' + readableRecord(history));
  for (const item of items ?? []) rows.push('Native history item ' + readableRecord(item));
  if (items?.length) rows.push('Native history does not identify which request produced an event.');
  return rows.join('\n') + '\n';
}

export function formatTransitionInspection(outcome, json) {
  return {
    outcome, stdout: json ? JSON.stringify(outcome) + '\n' : renderTransitionInspection(outcome),
    exitCode: stateExitCode(outcome)
  };
}

async function runTransitionInspection(options, resolveInstallation, createInspectionState) {
  let resolved, state, outcome;
  try {
    resolved = await resolveInstallation({
      configPath: options.config, installationPath: options.installation, operatorProfile: options['operator-profile'],
      purpose: 'evidence-inspect', originalInstallationPath: options['original-installation']
    });
    // Only the verified receipt digest binds these reads. Desired controls are displayed separately.
    state = createInspectionState({
      binding: resolved.binding, control: { ...resolved.control, configuration_digest: resolved.binding.configuration_digest },
      client: resolved.client
    });
    ({ outcome } = await inspectTransition({
      state, attemptId: options['record-id'].slice(8), authority: resolved.evidenceAuthority,
      desired: resolved.control, schedule: resolved.observed?.schedule?.State
    }));
  } catch (error) {
    outcome = rejectTransitionInspection(error.code ?? error.stateResult?.code);
  } finally {
    state?.close?.();
    resolved?.dispose?.();
  }
  return formatTransitionInspection(outcome, options.json);
}

/** Core supplies its trusted resolver here at final PGB-82/83 integration. This
 * function never reads an alternate config, imports arbitrary modules or accepts
 * resource/credential/freshness assertions from command-line inputs. */
export async function runStateCommand(argv, { resolveInstallation = productionResolver, createState = createDynamoState, createInspectionState = createDynamoInspectionState, now = () => new Date().toISOString() } = {}) {
  let options;
  try { options = parse(argv); } catch {
    const json = argv.includes('--json');
    if (argv.includes('--jira-evidence') || argv.includes('--original-installation')) {
      return formatTransitionInspection(rejectTransitionInspection('INVALID_INPUT'), json);
    }
    const outcome = result('invalid', 'INVALID_INPUT');
    return { outcome, stdout: json ? JSON.stringify(outcome) + '\n' : readable(outcome), exitCode: 2 };
  }
  if (options.help) return { outcome: null, stdout: help, exitCode: 0 };
  if (options.jiraEvidence) return runTransitionInspection(options, resolveInstallation, createInspectionState);
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
