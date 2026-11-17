#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createDynamoState } from '../lib/aws/dynamodb.mjs';
import { transitionProof } from '../lib/state/contract.mjs';
import { createHash } from 'node:crypto';
import canonicalize from 'canonicalize';
import { prepared, beginInput, fixture, row } from '../test/helpers/state-provider.mjs';

export const proofFixture = JSON.parse(readFileSync(new URL('../test/fixtures/transition-proof.json', import.meta.url)));
const clone = value => structuredClone(value);
/** Expected values are assembled from prescribed inputs, not capture helpers or
 * stored proof. Legacy fixture digests below remain independent golden pins. */
export function expectedCommitment(binding, { operation = 'admit_ready', cause = [] } = {}) {
  const ref = proofFixture.reference, tuple = r => [r.ticket_id, r.comment_id, r.record_id, r.digest];
  const metadata = proofFixture.publication_observations.comments[0];
  const publication = { comments: [[tuple(ref), metadata.author_id, metadata.update_author_id, metadata.created, metadata.updated]], pointer: operation === 'queue_repair' ? ['preserved', tuple(proofFixture.preserved_assignment)] : ['published', tuple(ref)] };
  const hash = value => 'sha256:' + createHash('sha256').update(canonicalize(value)).digest('hex');
  const publication_digest = hash(publication);
  const identity = { schema_version: 1, installation_id: binding.installation_id, domain_id: binding.domain_id, record_id: 'attempt:' + fixture.attemptA.attempt_id, site: binding.site, project_id: fixture.streamA.project_id, label: fixture.streamA.label, attempt_id: fixture.attemptA.attempt_id, ticket_id: fixture.attemptA.ticket_id, epic_id: fixture.attemptA.epic_id, issue_key: fixture.attemptA.issue_key, operation, source_status_id: fixture.attemptA.source_status_id, target_status_id: fixture.attemptA.target_status_id, configuration_digest: binding.configuration_digest, created_at: fixture.now, cause };
  const request = { version: 1, identity, method: 'POST', route: 'issue_transitions', transition_id: proofFixture.transition_id, body: { transition: { id: proofFixture.transition_id } }, publication_digest };
  return { publication, request, publication_digest, request_digest: hash(request) };
}
/** API-only dummy fixture is independent of command/resolver prerequisites. */
export async function transitionFixture(options = {}) {
  const context = await prepared();
  return completeFixture({ ...context, binding: fixture.binding }, options);
}
/** Actual canonical -> manifest -> generated receipt -> bind/resolve -> selected
 * operator CLI. Only the disposable stored writer controls are enabled. */
export async function composedTransitionFixture(options = {}) {
  const { preparedCloud } = await import('./test-aws-manager.mjs');
  const { runStateCommand } = await import('./manager-state.mjs');
  const f = await preparedCloud();
  try {
    const initArgs = ['init', '--config', f.configPath, '--installation', f.installationPath, '--operator-profile', 'operator', '--json'];
    const initialized = await runStateCommand(initArgs, { resolveInstallation: f.resolve, now: () => fixture.now });
    assert.equal(initialized.exitCode, 0, initialized.stdout);
    assert.equal(f.config.manager.controls.writes_enabled, false);
    assert.equal(f.environment.PB_MODE, 'preview'); assert.equal(f.environment.PB_WRITES_ENABLED, 'false');
    f.provider.enable(); // Synthetic trusted-writer precondition; no host activation.
    const control = { configuration_digest: f.binding.configuration_digest, schedule_enabled: true, writes_enabled: true, maintenance: false };
    const state = createDynamoState({ binding: f.binding, control, client: f.provider });
    const context = await completeFixture({ provider: f.provider, state, binding: f.binding }, options);
    const preparation = { canonical: f.config, manifest: f.manifest, receipt: f.receipt, generated_binding: f.binding, init: { args: initArgs, output: initialized }, synthetic_writer_controls: control, activation: false };
    async function inspect() {
      const before = f.provider.snapshot(), writes = f.provider.audit.filter(a => a.name === 'TransactWriteCommand').length, auditStart = f.audit.length, destroyedStart = f.destroyed.length;
      const args = ['inspect', '--config', f.configPath, '--installation', f.installationPath, '--operator-profile', 'operator', '--kind', 'attempt', '--record-id', context.records().attempt.record_id];
      const readable = await runStateCommand(args, { resolveInstallation: f.resolve });
      const json = await runStateCommand([...args, '--json'], { resolveInstallation: f.resolve });
      assert.equal(readable.exitCode, 0, readable.stdout); assert.equal(json.exitCode, 0, json.stdout);
      assert.deepEqual(JSON.parse(json.stdout).data.records, [context.records().attempt]);
      const enabled = context.records().installation.writes_enabled;
      assert.equal(json.outcome.data.controls_match, !enabled);
      assert.match(readable.stdout, enabled ? /differ; inspect remains read-only/ : /controls: match/);
      assert.equal(f.provider.snapshot(), before); assert.equal(f.provider.audit.filter(a => a.name === 'TransactWriteCommand').length, writes);
      const audit = f.audit.slice(auditStart), disposed = f.destroyed.slice(destroyedStart);
      assert(audit.every(a => a.identity === 'SELECTED_OPERATOR'));
      assert(audit.every(a => /^(Get|Describe|Query|TransactGet)/.test(a.action)));
      assert(disposed.length > 0); assert(disposed.every(a => a.identity === 'SELECTED_OPERATOR'));
      return { args, readable: readable.stdout, json: json.outcome, restarted_with_same_provider: true, resolver_audit: clone(audit), disposed: clone(disposed) };
    }
    return { ...context, inspect, preparation, cloudAudit: () => clone(f.audit), cleanup: () => { state.close(); f.cleanup(); } };
  } catch (error) { f.cleanup(); throw error; }
}
async function completeFixture(context, { operation = 'admit_ready', largeRecord = false } = {}) {
  const binding = context.binding, stream = { ...fixture.streamA, site: binding.site };
  const cause = largeRecord ? Array(proofFixture.record_size_cause_count).fill({ ...fixture.evidence.references[0], ticket_id: '9'.repeat(255), comment_id: '8'.repeat(255) }) : [];
  const member = { ...fixture.memberA, site: binding.site, assignment: operation === 'queue_repair' ? proofFixture.preserved_assignment : null };
  const attemptInput = { ...fixture.attemptA, configuration_digest: binding.configuration_digest, operation, cause };
  const begun = await context.state.begin(beginInput({ stream, attempt: attemptInput, required_members: [member] }));
  assert.equal(begun.status, 'confirmed', JSON.stringify(begun));
  const attempt = row(context.provider, 'attempt', attemptInput);
  context.provider.seed({ ...attempt, extensions: { unrelated_flag: true } });
  const records = () => ({ installation: row(context.provider, 'installation', binding), stream: row(context.provider, 'stream', stream), attempt: row(context.provider, 'attempt', attemptInput) });
  const input = extra => { const r = records(); return { attempt_id: attemptInput.attempt_id, expected_installation_revision: r.installation.revision, expected_stream_revision: r.stream.revision, expected_attempt_revision: r.attempt.revision, ...extra }; };
  const observations = clone(proofFixture.publication_observations);
  if (operation === 'queue_repair') observations.pointer = { mode: 'preserved', assignment: clone(proofFixture.preserved_assignment) };
  const retain = extra => context.state.retainPublication(input({ reference: proofFixture.reference, now: fixture.now, ...extra }));
  const prepare = extra => context.state.prepareTransitionCapture(input({ transition_id: proofFixture.transition_id, producer_invocation_id: proofFixture.producer_invocation_id, publication_observations: observations, now: fixture.now, ...extra }));
  const response = (status = 204, extra = {}) => context.state.recordTransitionResponse(input({ request_digest: records().attempt.extensions.pb_capture_request_digest, http_status: status, observed_at: proofFixture.received_at, provider_request_id: proofFixture.provider_request_id, ...extra }));
  const inspect = () => context.state.inspect({ kind: 'attempt' });
  return { ...context, records, input, observations, retain, prepare, response, inspect, expected: expectedCommitment(binding, { operation, cause }) };
}
export async function runTransitionProofCase(caseId, { onTrace = async () => {} } = {}) {
  const traces = [];
  if (caseId === 'R1-29-H01') {
    for (const status of proofFixture.h01_statuses) {
      const c = await composedTransitionFixture(), outputs = [];
      let before;
      try {
      before = c.provider.snapshot();
      outputs.push(await c.retain()); outputs.push(await c.prepare()); assert(outputs.every(o => o.status === 'confirmed'));
      const preparedOnly = await c.inspect(); assert.match(preparedOnly.readable, /prepared/);
      outputs.push(await c.response(status)); assert.equal(outputs.at(-1).status, 'confirmed');
      const inspected = await c.inspect(), records = c.records();
      assert.equal(records.attempt.outcome, 'pending'); assert.equal(records.stream.pending_attempt_id, fixture.attemptA.attempt_id); assert.equal(records.stream.revision, 0);
      assert.equal(records.attempt.extensions.pb_capture_publication_digest, c.expected.publication_digest);
      assert.equal(records.attempt.extensions.pb_capture_request_digest, c.expected.request_digest);
      assert.equal(records.attempt.extensions.unrelated_flag, true); assert.equal(transitionProof(records.attempt).http_status, status);
      traces.push({ variant: 'original_http_' + status, before, preparation: c.preparation, expected_commitment: c.expected, outputs, prepared_only: preparedOnly, inspected, records, command_audit: clone(c.provider.audit), resolver_audit: c.cloudAudit() });
      await onTrace(traces.at(-1));
      } catch (error) {
        await onTrace({ variant: 'original_http_' + status, developer_observation: 'failed_local_fixture', failure: { name: error.name, message: error.message }, before: before ?? null, after: c.provider.snapshot(), preparation: c.preparation, records: c.records(), command_audit: clone(c.provider.audit), resolver_audit: c.cloudAudit() });
        throw error;
      } finally { c.cleanup(); }
    }
  } else if (caseId === 'R1-29-H02') {
    for (const variant of proofFixture.h02_variants) {
      const c = await composedTransitionFixture({ largeRecord: variant === 'record_size' });
      let before;
      try {
      if (variant === 'extension_capacity') { const a = c.records().attempt; c.provider.seed({ ...a, extensions: Object.fromEntries(Array.from({ length: 7 }, (_, n) => ['unrelated_' + n, true])) }); }
      if (!['stale_revision', 'disabled_controls'].includes(variant)) assert.equal((await c.retain()).status, 'confirmed');
      if (['duplicate_preparation', 'duplicate_response'].includes(variant)) assert.equal((await c.prepare()).status, 'confirmed');
      if (variant === 'duplicate_response') assert.equal((await c.response()).status, 'confirmed');
      if (variant === 'disabled_controls') c.provider.disable();
      before = c.provider.snapshot();
      const writes = c.provider.audit.filter(a => a.name === 'TransactWriteCommand').length;
      let output;
      if (variant === 'stale_revision') output = await c.retain({ expected_installation_revision: 0 });
      else if (variant === 'changed_reference') output = await c.retain({ reference: { ...proofFixture.reference, comment_id: '701' } });
      else if (variant === 'duplicate_response') output = await c.response(409);
      else if (variant === 'disabled_controls') output = await c.retain();
      else { if (variant.startsWith('persistence_')) c.provider.fault = variant === 'persistence_before' ? 'before' : 'after'; output = await c.prepare(); }
      assert.equal(output.data, null);
      if (variant.startsWith('persistence_')) {
        assert.equal(output.status, 'uncertain'); assert.equal(c.provider.audit.filter(a => a.name === 'TransactWriteCommand').length, writes + 1);
        if (variant === 'persistence_before') assert.equal(c.provider.snapshot(), before);
        else assert.equal(transitionProof(c.records().attempt).state, 'prepared');
      } else { assert(['conflict', 'invalid'].includes(output.status)); assert.equal(c.provider.snapshot(), before); assert.equal(c.provider.audit.filter(a => a.name === 'TransactWriteCommand').length, writes); }
      const inspected = await c.inspect(); assert.equal(c.records().attempt.outcome, 'pending');
      traces.push({ variant, preparation: c.preparation, expected_commitment: c.expected, output, before, after: c.provider.snapshot(), inspected, records: c.records(), command_audit: clone(c.provider.audit), resolver_audit: c.cloudAudit() });
      await onTrace(traces.at(-1));
      } catch (error) {
        await onTrace({ variant, developer_observation: 'failed_local_fixture', failure: { name: error.name, message: error.message }, before: before ?? null, after: c.provider.snapshot(), preparation: c.preparation, records: c.records(), command_audit: clone(c.provider.audit), resolver_audit: c.cloudAudit() });
        throw error;
      } finally { c.cleanup(); }
    }
  } else throw Error('Unknown prescribed case');
  return { developer_observation: 'confirmed_local_fixture', human_acceptance: 'pending', actual_core_integration: 'confirmed_local_simulated_providers', durable_restart: 'same_retained_simulated_provider', external_calls: clone(proofFixture.expected.external_calls), traces };
}
async function main(args) {
  if (args.length === 1 && args[0] === '--help') { console.log('node scripts/test-transition-proof.mjs --case R1-29-H01|R1-29-H02 --output NEW_DIRECTORY\nOr --all. Actual83/84 composition with dummy simulated providers; human/installed acceptance remain pending.'); return; }
  const input = {};
  for (let n = 0; n < args.length; n++) { const flag = args[n]; if (!['--case', '--all', '--output'].includes(flag) || Object.hasOwn(input, flag)) throw Error(); if (flag === '--all') input[flag] = true; else { if (!args[n + 1] || args[n + 1].startsWith('--')) throw Error(); input[flag] = args[++n]; } }
  if (!input['--output'] || Boolean(input['--all']) === Boolean(input['--case']) || input['--case'] && !['R1-29-H01', 'R1-29-H02'].includes(input['--case'])) throw Error();
  const root = fileURLToPath(new URL('../', import.meta.url)), git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
  const revision = git('rev-parse', 'HEAD'), dirty = git('status', '--porcelain').length !== 0, output = resolve(input['--output']);
  await mkdir(output); await writeFile(join(output, 'fixture-inputs.json'), JSON.stringify({ state: fixture, proof: proofFixture }, null, 2) + '\n');
  const outcomes = [];
  for (const case_id of input['--all'] ? ['R1-29-H01', 'R1-29-H02'] : [input['--case']]) {
    const evidence = { schema: 'pigboard-transition-proof-evidence/v1', case_id, revision, dirty, simulated_fixture: true, ...await runTransitionProofCase(case_id, { onTrace: trace => writeFile(join(output, case_id + '-' + trace.variant + '.json'), JSON.stringify(trace, null, 2) + '\n') }) };
    await writeFile(join(output, case_id + '.json'), JSON.stringify(evidence, null, 2) + '\n');
    outcomes.push({ case_id, developer_observation: evidence.developer_observation, human_acceptance: evidence.human_acceptance, actual_core_integration: evidence.actual_core_integration });
  }
  const summary = { revision, dirty, simulated_fixture: true, output, outcomes };
  await writeFile(join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n'); console.log(JSON.stringify(summary));
  process.exitCode = 0; // Local composition assertions only; human acceptance stays pending.
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(process.argv.slice(2)); } catch (error) { console.error(JSON.stringify({ name: error.name, message: error.message })); console.error('Transition-proof fixture failed. Retain partial output and check the prescribed preparation; do not retry or contact live services.'); process.exitCode = 2; }
}
