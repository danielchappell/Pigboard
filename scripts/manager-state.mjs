#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { createDynamoInspectionState, createDynamoOperatorState, createDynamoState } from '../lib/aws/dynamodb.mjs';
import { resolveInstallation as productionResolver } from '../lib/aws/installation.mjs';
import { attemptSchema, failure, parseReconciliationRequest, result, transitionProof, valid } from '../lib/state/contract.mjs';
import { inspectTransition, rejectTransitionInspection } from '../lib/manager/inspect-transition.mjs';
import { reconcile } from '../lib/manager/reconcile.mjs';

const help = `Usage:
  node scripts/manager-state.mjs init --config FILE --installation FILE --operator-profile NAME [--json]
  node scripts/manager-state.mjs inspect --config FILE --installation FILE --kind installation|stream|attempt|member [--record-id ID|--cursor CURSOR] [--limit 1..100] --operator-profile NAME [--recovery] [--json]
  node scripts/manager-state.mjs inspect --config FILE --installation FILE --kind attempt --record-id attempt:<UUID> --operator-profile NAME --jira-evidence [--original-installation FILE] [--json]
  node scripts/manager-state.mjs reconcile --config FILE --installation FILE --operator-profile NAME --request FILE [--original-installation FILE] [--json]

Initialize a verified fresh installation while disabled, inspect retained State,
or reconcile one named attempt with original proof and a verified completed stop.
Use the canonical configuration and generated installation receipt.
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
For reconcile, use the closed request in docs/manager-state.md. A saved 204 or
409 supports only its matching disposition. New decisions require original
protected installation history and trusted stop evidence. New installed decisions
remain held until the PGB-86 stop producer can verify a completed stop.
To confirm an uncertain write, inspect the named attempt or repeat the same request.
Ordinary named State inspection can show a verified original operator decision
without reading Jira. For settlement, 0 confirms the decision, 1 holds with a
conflict, and 2 indicates invalid input, unavailable evidence or uncertainty.
`;
function parse(argv) {
  if (argv.length === 1 && ['--help', '-h'].includes(argv[0])) return { help: true };
  if (!['init', 'inspect', 'reconcile'].includes(argv[0])) throw Error();
  const out = { command: argv[0], json: false };
  const allowed = new Set(['config', 'installation', 'operator-profile',
    ...(out.command === 'inspect' ? ['kind', 'record-id', 'cursor', 'limit', 'original-installation'] : []),
    ...(out.command === 'reconcile' ? ['request', 'original-installation'] : [])]);
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
  } else if (out.command === 'reconcile') {
    if (!out.request) throw Error();
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
    if (typeof outcome.data.controls_match === 'boolean') {
      rows.push('Canonical/applied controls: ' + (outcome.data.controls_match ? 'match' : 'differ; inspect remains read-only'));
    }
    const records = outcome.data.records ?? [outcome.data.installation, outcome.data.stream, outcome.data.attempt].filter(Boolean);
    for (const record of records) {
      rows.push(readableRecord(record));
      if (record.kind === 'stream' && record.pending_attempt_id) rows.push('Pending hold: ' + record.pending_attempt_id);
      if (record.kind === 'attempt') {
        const proof = transitionProof(record);
        rows.push('Transition capture: ' + proof.state + '; attempt ' + record.attempt_id);
        if (proof.request_digest) rows.push('Request commitment: ' + proof.request_digest);
        if (proof.http_status !== null) rows.push('Original HTTP response: ' + proof.http_status + '; outcome remains ' + record.outcome);
        if (record.outcome === 'pending') rows.push('Pending hold: ' + record.attempt_id);
      }
    }
    if (outcome.data.operator_decision) rows.push('Verified operator decision ' + readableRecord(outcome.data.operator_decision));
    if (outcome.data.operator_decision_provenance && !outcome.data.operator_decision) {
      rows.push('Operator decision provenance ' + readableRecord(outcome.data.operator_decision_provenance));
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

async function readRequestFile(path) {
  let file;
  try {
    file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
    if (!(await file.stat()).isFile()) throw Error();
    const buffer = Buffer.alloc(16385);
    let count = 0;
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

function operatorOptions(resolved) {
  return { binding: resolved.binding, control: { ...resolved.control, configuration_digest: resolved.binding.configuration_digest },
    client: resolved.client, originEvidence: resolved.originEvidence, identity: resolved.session?.operator?.identity };
}

async function addOperatorDecision(outcome, binding, resolution, attemptId, resolveInstallation, createOperatorState) {
  let trusted;
  function withProvenance(status, code, verified = null) {
    return {
      ...outcome,
      diagnostics: status === 'unavailable' ? [...outcome.diagnostics, ...result(status, 'OPERATOR_PROVENANCE_UNAVAILABLE').diagnostics] : outcome.diagnostics,
      data: {
        ...outcome.data, operator_decision_provenance: { status, code },
        ...(verified ? { records: [verified.attempt], operator_decision: verified.operator_decision } : {})
      }
    };
  }
  try {
    trusted = await resolveInstallation({ ...resolution, purpose: 'decision-inspect' });
    const fields = ['installation_id', 'domain_id', 'site', 'stack_id', 'table_arn', 'installation_generation'];
    if (fields.some(field => trusted.binding[field] !== binding[field])) return withProvenance('unavailable', 'BINDING_MISMATCH');
    if (trusted.birthClassification === 'legacy') return withProvenance('absent', 'OPERATOR_PROVENANCE_ABSENT');
    const read = await createOperatorState(operatorOptions(trusted), 'inspect').readDecision({ attempt_id: attemptId });
    if (read.status !== 'confirmed') return withProvenance('unavailable', read.code);
    if (!read.data.operator_decision) return withProvenance('absent', 'OPERATOR_PROVENANCE_ABSENT');
    return withProvenance('verified', 'OK', read.data);
  } catch (error) {
    return withProvenance('unavailable', error.stateResult?.code ?? 'OPERATOR_PROVENANCE_UNAVAILABLE');
  } finally { await trusted?.dispose?.(); }
}

export async function runStateCommand(argv, {
  resolveInstallation = productionResolver, createState = createDynamoState, createInspectionState = createDynamoInspectionState,
  createOperatorState = createDynamoOperatorState, readRequest = readRequestFile, now = () => new Date().toISOString()
} = {}) {
  let options;
  try { options = parse(argv); } catch {
    const json = argv.includes('--json');
    if (argv.includes('--jira-evidence') || argv[0] !== 'reconcile' && argv.includes('--original-installation')) {
      return formatTransitionInspection(rejectTransitionInspection('INVALID_INPUT'), json);
    }
    const outcome = result('invalid', 'INVALID_INPUT');
    return { outcome, stdout: json ? JSON.stringify(outcome) + '\n' : readable(outcome), exitCode: 2 };
  }
  if (options.help) return { outcome: null, stdout: help, exitCode: 0 };
  if (options.jiraEvidence) return runTransitionInspection(options, resolveInstallation, createInspectionState);
  let state, outcome, resolved;
  const resolution = { configPath: options.config, installationPath: options.installation, operatorProfile: options['operator-profile'] };
  try {
    const request = options.command === 'reconcile' ? parseReconciliationRequest(await readRequest(options.request)) : null;
    if (typeof resolveInstallation !== 'function') throw failure('CORE_PREREQUISITE');
    resolved = await resolveInstallation({ ...resolution, purpose: options.recovery ? 'recovery-inspect' : options.command,
      ...(request ? { originalInstallationPath: options['original-installation'] } : {}) });
    if (request) {
      const live = operatorOptions(resolved);
      const operatorState = createOperatorState(live, 'reconcile');
      state = createInspectionState({ binding: live.binding, control: live.control, client: live.client });
      outcome = await reconcile({ request, resolved, inspectionState: state, operatorState });
    } else {
      if (options.command === 'init') {
        if (resolved.birthClassification === 'protected') state = createOperatorState(operatorOptions(resolved), 'initialize');
        else if (resolved.birthClassification === 'legacy') state = createState({ binding: resolved.binding, control: resolved.control, client: resolved.client });
        else throw failure('ORIGIN_UNVERIFIED');
        outcome = await state.initialize({ fresh_installation: resolved.fresh_installation, now: now() });
      } else {
        state = createState({ binding: resolved.binding, control: resolved.control, client: resolved.client });
        const recordId = options['record-id'];
        outcome = await state.inspect({ kind: options.kind, ...(recordId ? { record_id: recordId } : {}),
          ...(options.cursor ? { cursor: options.cursor } : {}), ...(options.limit ? { limit: options.limit } : {}) });
        if (options.recovery && resolved.recovery) outcome = { ...outcome, recovery: resolved.recovery };
        if (!options.recovery && outcome.status === 'confirmed' && options.kind === 'attempt'
          && recordId?.startsWith('attempt:') && valid(recordId.slice(8), attemptSchema.properties.attempt_id)) {
          outcome = await addOperatorDecision(outcome, resolved.binding, resolution, recordId.slice(8), resolveInstallation, createOperatorState);
        }
      }
    }
  } catch (error) {
    const known = ['OPERATOR_UNAUTHORIZED', 'OPERATOR_SESSION_UNAVAILABLE', 'INSTALLATION_UNAVAILABLE', 'ORIGIN_UNVERIFIED'];
    outcome = error.stateResult ?? result('unavailable', known.includes(error.code) ? error.code : 'UNAVAILABLE');
  }
  finally { state?.close?.(); resolved?.dispose?.(); }
  return { outcome, stdout: options.json ? JSON.stringify(outcome) + '\n' : readable(outcome), exitCode: stateExitCode(outcome) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const answer = await runStateCommand(process.argv.slice(2)); process.stdout.write(answer.stdout); process.exitCode = answer.exitCode;
}
