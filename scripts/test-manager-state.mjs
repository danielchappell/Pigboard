#!/usr/bin/env node
// Prepared local fixture packet. Never accepts an AWS resource, endpoint or credentials.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { fixture, prepared, beginInput, finalizeInput, row, StateProvider } from '../test/helpers/state-provider.mjs';
import { createDynamoState } from '../lib/aws/dynamodb.mjs';
import { operatorActorId, proofEqual, transitionProof } from '../lib/state/contract.mjs';
import { runStateCommand } from './manager-state.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const originalCases = ['R1-14-H01', 'R1-14-H02', 'R1-14-H03'];
const cases = [...originalCases, 'R1-15-H01', 'R1-15-H02'];
export const reconciliationFixture = JSON.parse(readFileSync(new URL('../test/fixtures/reconciliation.json', import.meta.url)));
export async function reconciliationContext(status = 204) {
  const f = structuredClone(reconciliationFixture), receipt = f.receipt_input, issue = receipt.issues[0];
  const binding = { ...fixture.binding, site: receipt.trusted.site }, provider = new StateProvider(binding);
  const initial = createDynamoState({ binding, control: fixture.control, client: provider });
  assert.equal((await initial.initialize({ fresh_installation: { ...fixture.fresh, site: binding.site }, now: fixture.now })).status, 'confirmed');
  provider.enable(); const writer = createDynamoState({ binding, control: { ...fixture.control, schedule_enabled: true, writes_enabled: true }, client: provider });
  const attempt = { ...fixture.attemptA, attempt_id: receipt.target.record_id, ticket_id: issue.id, epic_id: '900', issue_key: issue.key, source_status_id: receipt.trusted.projects[0].stages['Ready to Work'], target_status_id: receipt.trusted.projects[0].stages['In Progress'] };
  const stream = { site: binding.site, project_id: issue.project_id, label: issue.stream };
  const member = { ...fixture.memberA, ...stream, ticket_id: issue.id, epic_id: attempt.epic_id };
  assert.equal((await writer.begin(beginInput({ stream, attempt, required_members: [member] }))).status, 'confirmed');
  const records = () => ({ installation: provider.records().find(r => r.kind === 'installation'), stream: provider.records().find(r => r.kind === 'stream'), attempt: provider.records().find(r => r.kind === 'attempt') });
  const revisions = () => { const r = records(); return { attempt_id: attempt.attempt_id, expected_installation_revision: r.installation.revision, expected_stream_revision: r.stream.revision, expected_attempt_revision: r.attempt.revision }; };
  assert.equal((await writer.retainPublication({ ...revisions(), reference: receipt.target, now: fixture.now })).status, 'confirmed');
  assert.equal((await writer.prepareTransitionCapture({ ...revisions(), transition_id: '31', producer_invocation_id: '33333333-3333-4333-8333-333333333333', publication_observations: f.publication_observations, now: fixture.now })).status, 'confirmed');
  assert.equal((await writer.recordTransitionResponse({ ...revisions(), request_digest: records().attempt.extensions.pb_capture_request_digest, http_status: status, observed_at: '2026-11-15T12:00:01.000Z', provider_request_id: 'fixture-request' })).status, 'confirmed');
  const stoppedBinding = { ...binding, configuration_digest: f.stop_config_digest }, control = { configuration_digest: f.stop_config_digest, schedule_enabled: false, writes_enabled: false, maintenance: true };
  const installed = records().installation, fence = installed.revision + 1;
  provider.seed({ ...installed, ...control, revision: fence, extensions: { unrelated_flag: true, pb_stop_version: 1, pb_stop_id: f.stop_id, pb_stop_actor: operatorActorId(f.operator), pb_stop_config_digest: f.stop_config_digest, pb_stop_package_revision: binding.package_revision, pb_stop_resource_digest: f.projection.resource_digest, pb_stop_bounds_digest: f.projection.bounds_digest, pb_stop_fence_revision: fence, pb_stop_started_at: fixture.now, pb_stop_window_ms: 6000, pb_stop_completed_at: f.stopped_at, pb_stop_elapsed_ms: 6000 } });
  const runtime = { observed_at: f.reconciled_at, installation_id: binding.installation_id, installation_generation: binding.installation_generation, configuration_digest: f.stop_config_digest, package_revision: binding.package_revision, operator: f.operator, controls: { desired: control, applied: control, agree: true }, scheduler: { resource_arn: 'arn:aws:scheduler:eu-west-1:123456789012:schedule/default/pigboard', state: 'disabled', target_function_arn: 'arn:aws:lambda:eu-west-1:123456789012:function:pigboard', delivery_bound_ms: 1000 }, function: { resource_arn: 'arn:aws:lambda:eu-west-1:123456789012:function:pigboard', code_revision: binding.package_revision, invocation_timeout_ms: 2000, request_timeout_ms: 3000 } };
  // Private normalized controls do not include the separate configuration digest.
  runtime.controls.desired = runtime.controls.applied = { schedule_enabled: false, writes_enabled: false, maintenance: true };
  const projectedSource = structuredClone({ scheduler: runtime.scheduler, function: runtime.function });
  if (status === 409) issue.stage_id = receipt.trusted.projects[0].stages['Ready to Work'];
  const jira = { status: 'complete', reasons: [], source: { simulated: true, site: binding.site, observed_at: f.reconciled_at }, data: { complete: true, history: { status: 'complete', items: [] }, publication_observations: f.publication_observations, receipt_input: receipt } };
  const audit = { runtime_reads: 0, jira_reads: 0, jira_mutations: 0, worker_calls: 0, live_aws_calls: 0 };
  const capabilities = {
    limits: { pages: 2, requests: 4, milliseconds: 1000 },
    readBoundRuntime: async () => { audit.runtime_reads++; return { status: 'confirmed', data: structuredClone(runtime), reasons: [] }; },
    projectBoundRuntime: async ({ observation, binding: observedBinding, canonicalConfig }) => proofEqual({ scheduler: observation.data.scheduler, function: observation.data.function }, projectedSource) && proofEqual(observedBinding, stoppedBinding) && proofEqual(canonicalConfig, f.canonicalConfig) ? { status: 'confirmed', data: f.projection } : { status: 'unsupported', reasons: ['BOUNDS_UNSUPPORTED'] },
    readReconciliationFacts: async selectors => { audit.jira_reads++; assert.equal(selectors.attempt.attempt_id, attempt.attempt_id); assert.deepEqual(selectors.publicationReferences, [receipt.target]); return structuredClone(jira); }
  };
  const request = () => ({ schema: 'pigboard-reconciliation-request/v1', ...revisions(), disposition: status === 409 ? 'confirmed_not_applied' : 'confirmed_applied' });
  const factory = options => createDynamoState({ ...options, client: provider });
  const command = (extra = {}, json = true, ports = capabilities) => runStateCommand(['reconcile', '--config', '/synthetic/config.json', '--installation', '/synthetic/generated.json', '--request', '/synthetic/request.json', ...(json ? ['--json'] : [])], { resolveInstallation: async () => ({ binding: stoppedBinding, control, canonicalConfig: f.canonicalConfig }), createState: factory, readRequest: async () => JSON.stringify({ ...request(), ...extra }), reconciliationCapabilities: ports });
  async function inspect() {
    const restarted = factory({ binding: stoppedBinding, control });
    const r = await restarted.readAttempt({ attempt_id: attempt.attempt_id }); assert.equal(r.status, 'confirmed'); return r;
  }
  return { f, binding: stoppedBinding, control, provider, records, revisions, runtime, jira, audit, capabilities, request, command, inspect, state: factory({ binding: stoppedBinding, control }) };
}
export async function reconciliationCase(caseId) {
  const traces = [];
  for (const variant of caseId === 'R1-15-H01' ? ['applied', 'not_applied'] : reconciliationFixture.h02_variants) {
    const c = await reconciliationContext(variant === 'not_applied' ? 409 : 204);
    if (variant === 'enabled_runtime') c.runtime.controls.desired.schedule_enabled = true;
    if (variant === 'in_flight_invocation') { const r = c.records().installation; c.provider.seed({ ...r, extensions: { ...r.extensions, pb_stop_elapsed_ms: 1 } }); }
    if (variant === 'unknown_response') { const r = c.records().attempt; c.provider.seed({ ...r, extensions: { ...r.extensions, pb_capture_status: null, pb_capture_received_at: null, pb_capture_provider_request_id: null } }); }
    if (variant === 'absent_history') { c.jira.status = 'unavailable'; c.jira.reasons = ['HISTORY_UNAVAILABLE']; c.jira.data.complete = false; c.jira.data.history = { status: 'unavailable', items: [] }; assert.equal(transitionProof(c.records().attempt).state, 'response-captured'); }
    if (variant === 'wrong_actor') c.runtime.operator.arn = 'arn:aws:sts::123456789012:assumed-role/RuntimeRole/session';
    if (variant === 'changed_pointer') c.jira.data.publication_observations.pointer.assignment.comment_id = '999';
    const before = c.provider.snapshot(), writes = c.provider.audit.filter(a => a.name === 'TransactWriteCommand').length;
    const output = await c.command(variant === 'stale_revision' ? { expected_attempt_revision: 0 } : {});
    const inspected = await c.inspect();
    if (caseId === 'R1-15-H01') { assert.equal(output.exitCode, 0); assert.equal(output.outcome.status, 'confirmed'); assert.equal(inspected.data.attempt.outcome, variant === 'applied' ? 'applied' : 'not_applied'); assert.equal(inspected.data.stream.pending_attempt_id, null); }
    else { assert.equal(output.exitCode, 1); assert.equal(output.outcome.status, 'conflict'); assert.equal(c.provider.snapshot(), before); assert.equal(c.provider.audit.filter(a => a.name === 'TransactWriteCommand').length, writes); assert.equal(inspected.data.attempt.outcome, 'pending'); if (variant === 'absent_history') assert.equal(output.outcome.code, 'HISTORY_UNAVAILABLE'); }
    assert.deepEqual(c.audit, { runtime_reads: c.audit.runtime_reads, jira_reads: c.audit.jira_reads, jira_mutations: 0, worker_calls: 0, live_aws_calls: 0 });
    traces.push({ variant, before, after: c.provider.snapshot(), output, inspected, provider_audit: structuredClone(c.provider.audit), service_audit: c.audit });
  }
  return { developer_observation: 'confirmed_local_fixture', human_acceptance: 'pending', actual_core_integration: 'blocked', actual82_history_transport: 'unavailable', simulated_fixture: true, traces };
}
function parse(args) {
  if (args.length === 1 && args[0] === '--help') return null;
  const input = {};
  for (let n = 0; n < args.length; n++) {
    const key = args[n]; if (!['--all', '--case', '--output'].includes(key) || Object.hasOwn(input, key)) throw Error('Use --case ID or --all, and --output NEW_DIRECTORY.');
    if (key === '--all') input[key] = true;
    else { if (!args[n + 1] || args[n + 1].startsWith('--')) throw Error('Supply the documented value.'); input[key] = args[++n]; }
  }
  if (!input['--output'] || Boolean(input['--case']) === Boolean(input['--all']) || input['--case'] && !cases.includes(input['--case'])) throw Error('Select one prescribed case or --all and a new output directory.');
  return { selected: input['--all'] ? originalCases : [input['--case']], output: resolve(input['--output']) };
}
async function h02() {
  const traces = [];
  const capture = (step, provider, outcomes, before) => traces.push({ step, outcomes, before, after: provider.snapshot(), records: provider.records(), command_audit: structuredClone(provider.audit) });
  {
    const { state, provider } = await prepared(); const before = provider.snapshot();
    const outputs = await Promise.all([state.begin(beginInput()), state.begin(beginInput({ attempt: { ...fixture.attemptA, attempt_id: '33333333-3333-4333-8333-333333333333' } }))]);
    assert.equal(outputs.filter(o => o.status === 'confirmed').length, 1); assert.equal(outputs.filter(o => o.status === 'conflict').length, 1); assert.equal(provider.records().length, 4);
    capture('Two competing expected revisions', provider, outputs, before);
  }
  for (const operation of ['begin', 'finalize']) for (const fault of ['before', 'after']) {
    const { state, provider } = await prepared();
    if (operation === 'finalize') assert.equal((await state.begin(beginInput())).status, 'confirmed');
    const before = provider.snapshot(); provider.fault = fault;
    const output = await state[operation](operation === 'begin' ? beginInput() : finalizeInput());
    assert.equal(output.status, 'uncertain'); assert.equal(output.data, null);
    if (fault === 'before') assert.equal(provider.snapshot(), before);
    else {
      assert.equal(provider.records().length, 4);
      assert.equal(row(provider, 'stream', fixture.streamA).pending_attempt_id, operation === 'begin' ? fixture.attemptA.attempt_id : null);
    }
    capture(operation + ' fault ' + fault + ' atomic persistence', provider, [output], before);
  }
  {
    const { state, provider } = await prepared(); const outputs = [];
    outputs.push(await state.begin(beginInput())); outputs.push(await state.finalize(finalizeInput()));
    const next = '33333333-3333-4333-8333-333333333333';
    outputs.push(await state.begin(beginInput({ expected_installation_revision: 2, expected_stream_revision: 1, attempt: { ...fixture.attemptA, attempt_id: next }, required_members: [{ ...fixture.memberA, expected_revision: 0 }] })));
    assert(outputs.every(o => o.status === 'confirmed'));
    const before = provider.snapshot();
    outputs.push(await state.finalize(finalizeInput()));
    outputs.push(await state.finalize(finalizeInput({ expected_installation_revision: 3, expected_stream_revision: 2 })));
    assert(outputs.slice(3).every(o => o.status === 'conflict')); assert.equal(provider.snapshot(), before); assert.equal(row(provider, 'stream', fixture.streamA).pending_attempt_id, next);
    capture('Matching finalizer, then stale and cross-attempt finalizers', provider, outputs, before);
  }
  return { developer_observation: 'confirmed_local_fixture', human_acceptance: 'pending', traces, limitations: ['Simulated Dynamo provider; no real AWS or Jira acceptance.', 'Human reviewer must assess the retained evidence; this command cannot record a human PASS.'] };
}
async function main() {
  const options = parse(process.argv.slice(2));
  if (!options) { console.log('node scripts/test-manager-state.mjs --case R1-14-H01|R1-14-H02|R1-14-H03|R1-15-H01|R1-15-H02 --output NEW_DIRECTORY\n--all preserves the three R1-14 groups. Run each R1-15 group explicitly. Local fixtures only; actual core integration and human acceptance remain pending.'); return; }
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const revision = git('rev-parse', 'HEAD'), dirty = git('status', '--porcelain').length !== 0;
  await mkdir(options.output); // Refuse to overwrite any retained evidence directory.
  await writeFile(join(options.output, 'fixture-inputs.json'), JSON.stringify(options.selected.some(id => id.startsWith('R1-15-')) ? { state: fixture, reconciliation: reconciliationFixture } : fixture, null, 2) + '\n');
  const outcomes = [];
  for (const case_id of options.selected) {
    const observation = case_id.startsWith('R1-15-') ? await reconciliationCase(case_id) : case_id === 'R1-14-H02' ? await h02() : {
      developer_observation: 'blocked', human_acceptance: 'pending', code: 'CORE_PREREQUISITE',
      reason: 'The actual reviewed PGB-82 collector and PGB-83 generated binding/resolver package are not available. No substitute preview was executed.',
      remaining: case_id === 'R1-14-H01' ? ['Actual disabled initialization/CLI binding composition', 'Four-kind inspection and retained-ID preview after native label change', 'Byte-identical state and zero state/Jira writes'] : ['Real preview after key rename, issue move and configured project removal', 'Original project identity/occupancy held', 'Stale cross-project completion']
    };
    const evidence = { schema: 'pigboard-state-fixture-evidence/v1', case_id, revision, dirty, ...observation };
    await writeFile(join(options.output, case_id + '.json'), JSON.stringify(evidence, null, 2) + '\n');
    outcomes.push({ case_id, developer_observation: observation.developer_observation, human_acceptance: 'pending', ...(observation.actual_core_integration ? { actual_core_integration: observation.actual_core_integration, actual82_history_transport: observation.actual82_history_transport, simulated_fixture: true } : {}) });
  }
  const summary = { revision, dirty, output: options.output, outcomes };
  await writeFile(join(options.output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary));
  if (outcomes.some(o => o.developer_observation === 'blocked') || options.selected.some(id => id.startsWith('R1-15-'))) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); } catch { console.error('Fixture packet failed. Keep any produced evidence; check preparation and use a new output directory only after correcting a mechanical setup failure.'); process.exitCode = 2; }
}
