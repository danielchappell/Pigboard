#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createDynamoState } from '../lib/aws/dynamodb.mjs';
import { transitionProof } from '../lib/state/contract.mjs';
import { runStateCommand } from './manager-state.mjs';
import { prepared, beginInput, fixture, row } from '../test/helpers/state-provider.mjs';

export const proofFixture = JSON.parse(readFileSync(new URL('../test/fixtures/transition-proof.json', import.meta.url)));
const clone = value => structuredClone(value);
/** Dummy-only prepared fixtures. No input file, URL or credential override. */
export async function transitionFixture({ operation = 'admit_ready', largeRecord = false } = {}) {
  const context = await prepared();
  const cause = largeRecord ? Array(proofFixture.record_size_cause_count).fill({ ...fixture.evidence.references[0], ticket_id: '9'.repeat(255), comment_id: '8'.repeat(255) }) : [];
  const member = { ...fixture.memberA, assignment: operation === 'queue_repair' ? proofFixture.preserved_assignment : null };
  assert.equal((await context.state.begin(beginInput({ attempt: { ...fixture.attemptA, operation, cause }, required_members: [member] }))).status, 'confirmed');
  const attempt = row(context.provider, 'attempt', fixture.attemptA);
  context.provider.seed({ ...attempt, extensions: { unrelated_flag: true } });
  const records = () => ({ installation: row(context.provider, 'installation', fixture.binding), stream: row(context.provider, 'stream', fixture.streamA), attempt: row(context.provider, 'attempt', fixture.attemptA) });
  const input = extra => { const r = records(); return { attempt_id: fixture.attemptA.attempt_id, expected_installation_revision: r.installation.revision, expected_stream_revision: r.stream.revision, expected_attempt_revision: r.attempt.revision, ...extra }; };
  const observations = clone(proofFixture.publication_observations);
  if (operation === 'queue_repair') observations.pointer = { mode: 'preserved', assignment: clone(proofFixture.preserved_assignment) };
  const retain = extra => context.state.retainPublication(input({ reference: proofFixture.reference, now: fixture.now, ...extra }));
  const prepare = extra => context.state.prepareTransitionCapture(input({ transition_id: proofFixture.transition_id, producer_invocation_id: proofFixture.producer_invocation_id, publication_observations: observations, now: fixture.now, ...extra }));
  const response = (status = 204, extra = {}) => context.state.recordTransitionResponse(input({ request_digest: records().attempt.extensions.pb_capture_request_digest, http_status: status, observed_at: proofFixture.received_at, provider_request_id: proofFixture.provider_request_id, ...extra }));
  async function inspect() {
    const control = { ...fixture.control, schedule_enabled: true, writes_enabled: true };
    const dependencies = { resolveInstallation: async () => ({ binding: fixture.binding, control }), createState: options => createDynamoState({ ...options, client: context.provider }) };
    const before = context.provider.snapshot(), writes = context.provider.audit.filter(a => a.name === 'TransactWriteCommand').length;
    const args = ['inspect', '--config', '/synthetic/company.yaml', '--installation', '/synthetic/generated.json', '--kind', 'attempt'];
    const readable = await runStateCommand(args, dependencies), json = await runStateCommand([...args, '--json'], dependencies);
    assert.equal(readable.exitCode, 0); assert.equal(json.exitCode, 0); assert.deepEqual(JSON.parse(json.stdout).data.records, [records().attempt]);
    assert.equal(context.provider.snapshot(), before); assert.equal(context.provider.audit.filter(a => a.name === 'TransactWriteCommand').length, writes);
    return { readable: readable.stdout, json: JSON.parse(json.stdout), restarted_with_same_provider: true };
  }
  return { ...context, records, input, observations, retain, prepare, response, inspect };
}
export async function runTransitionProofCase(caseId) {
  const traces = [];
  if (caseId === 'R1-29-H01') {
    for (const status of proofFixture.h01_statuses) {
      const c = await transitionFixture(), outputs = [];
      outputs.push(await c.retain()); outputs.push(await c.prepare()); assert(outputs.every(o => o.status === 'confirmed'));
      const preparedOnly = await c.inspect(); assert.match(preparedOnly.readable, /prepared/);
      outputs.push(await c.response(status)); assert.equal(outputs.at(-1).status, 'confirmed');
      const inspected = await c.inspect(), records = c.records();
      assert.equal(records.attempt.outcome, 'pending'); assert.equal(records.stream.pending_attempt_id, fixture.attemptA.attempt_id); assert.equal(records.stream.revision, 0);
      assert.equal(records.attempt.extensions.unrelated_flag, true); assert.equal(transitionProof(records.attempt).http_status, status);
      traces.push({ variant: 'original_http_' + status, outputs, prepared_only: preparedOnly, inspected, records, command_audit: clone(c.provider.audit) });
    }
  } else if (caseId === 'R1-29-H02') {
    for (const variant of proofFixture.h02_variants) {
      const c = await transitionFixture({ largeRecord: variant === 'record_size' });
      if (variant === 'extension_capacity') { const a = c.records().attempt; c.provider.seed({ ...a, extensions: Object.fromEntries(Array.from({ length: 7 }, (_, n) => ['unrelated_' + n, true])) }); }
      if (!['stale_revision', 'disabled_controls'].includes(variant)) assert.equal((await c.retain()).status, 'confirmed');
      if (['duplicate_preparation', 'duplicate_response'].includes(variant)) assert.equal((await c.prepare()).status, 'confirmed');
      if (variant === 'duplicate_response') assert.equal((await c.response()).status, 'confirmed');
      if (variant === 'disabled_controls') c.provider.disable();
      const before = c.provider.snapshot(), writes = c.provider.audit.filter(a => a.name === 'TransactWriteCommand').length;
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
      traces.push({ variant, output, before, after: c.provider.snapshot(), inspected, records: c.records(), command_audit: clone(c.provider.audit) });
    }
  } else throw Error('Unknown prescribed case');
  return { developer_observation: 'confirmed_local_fixture', human_acceptance: 'pending', actual_core_integration: 'blocked', integration_code: 'CORE_PREREQUISITE', external_calls: clone(proofFixture.expected.external_calls), traces };
}
async function main(args) {
  if (args.length === 1 && args[0] === '--help') { console.log('node scripts/test-transition-proof.mjs --case R1-29-H01|R1-29-H02 --output NEW_DIRECTORY\nOr --all. Dummy local fixtures only; actual83/84 composition and human acceptance remain pending.'); return; }
  const input = {};
  for (let n = 0; n < args.length; n++) { const flag = args[n]; if (!['--case', '--all', '--output'].includes(flag) || Object.hasOwn(input, flag)) throw Error(); if (flag === '--all') input[flag] = true; else { if (!args[n + 1] || args[n + 1].startsWith('--')) throw Error(); input[flag] = args[++n]; } }
  if (!input['--output'] || Boolean(input['--all']) === Boolean(input['--case']) || input['--case'] && !['R1-29-H01', 'R1-29-H02'].includes(input['--case'])) throw Error();
  const root = fileURLToPath(new URL('../', import.meta.url)), git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
  const revision = git('rev-parse', 'HEAD'), dirty = git('status', '--porcelain').length !== 0, output = resolve(input['--output']);
  await mkdir(output); await writeFile(join(output, 'fixture-inputs.json'), JSON.stringify({ state: fixture, proof: proofFixture }, null, 2) + '\n');
  const outcomes = [];
  for (const case_id of input['--all'] ? ['R1-29-H01', 'R1-29-H02'] : [input['--case']]) {
    const evidence = { schema: 'pigboard-transition-proof-evidence/v1', case_id, revision, dirty, simulated_fixture: true, ...await runTransitionProofCase(case_id) };
    await writeFile(join(output, case_id + '.json'), JSON.stringify(evidence, null, 2) + '\n');
    outcomes.push({ case_id, developer_observation: evidence.developer_observation, human_acceptance: evidence.human_acceptance, actual_core_integration: evidence.actual_core_integration });
  }
  const summary = { revision, dirty, simulated_fixture: true, output, outcomes };
  await writeFile(join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n'); console.log(JSON.stringify(summary));
  process.exitCode = 1; // Early injected fixtures cannot satisfy actual83/84 composition.
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(process.argv.slice(2)); } catch { console.error('Transition-proof fixture failed. Retain partial output and check the prescribed preparation; do not retry or contact live services.'); process.exitCode = 2; }
}
