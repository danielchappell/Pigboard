#!/usr/bin/env node
// Prepared local fixture packet. Never accepts an AWS resource, endpoint or credentials.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixture, prepared, beginInput, finalizeInput, row } from '../test/helpers/state-provider.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const cases = ['R1-14-H01', 'R1-14-H02', 'R1-14-H03'];
function parse(args) {
  if (args.length === 1 && args[0] === '--help') return null;
  const input = {};
  for (let n = 0; n < args.length; n++) {
    const key = args[n]; if (!['--all', '--case', '--output'].includes(key) || Object.hasOwn(input, key)) throw Error('Use --case ID or --all, and --output NEW_DIRECTORY.');
    if (key === '--all') input[key] = true;
    else { if (!args[n + 1] || args[n + 1].startsWith('--')) throw Error('Supply the documented value.'); input[key] = args[++n]; }
  }
  if (!input['--output'] || Boolean(input['--case']) === Boolean(input['--all']) || input['--case'] && !cases.includes(input['--case'])) throw Error('Select one prescribed case or --all and a new output directory.');
  return { selected: input['--all'] ? cases : [input['--case']], output: resolve(input['--output']) };
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
  if (!options) { console.log('node scripts/test-manager-state.mjs --case R1-14-H01|R1-14-H02|R1-14-H03 --output NEW_DIRECTORY\nUse --all for only these three groups. Local fixtures only; H01/H03 await actual PGB-82/83 integration.'); return; }
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const revision = git('rev-parse', 'HEAD'), dirty = git('status', '--porcelain').length !== 0;
  await mkdir(options.output); // Refuse to overwrite any retained evidence directory.
  await writeFile(join(options.output, 'fixture-inputs.json'), JSON.stringify(fixture, null, 2) + '\n');
  const outcomes = [];
  for (const case_id of options.selected) {
    const observation = case_id === 'R1-14-H02' ? await h02() : {
      developer_observation: 'blocked', human_acceptance: 'pending', code: 'CORE_PREREQUISITE',
      reason: 'The actual reviewed PGB-82 collector and PGB-83 generated binding/resolver package are not available. No substitute preview was executed.',
      remaining: case_id === 'R1-14-H01' ? ['Actual disabled initialization/CLI binding composition', 'Four-kind inspection and retained-ID preview after native label change', 'Byte-identical state and zero state/Jira writes'] : ['Real preview after key rename, issue move and configured project removal', 'Original project identity/occupancy held', 'Stale cross-project completion']
    };
    const evidence = { schema: 'pigboard-state-fixture-evidence/v1', case_id, revision, dirty, ...observation };
    await writeFile(join(options.output, case_id + '.json'), JSON.stringify(evidence, null, 2) + '\n');
    outcomes.push({ case_id, developer_observation: observation.developer_observation, human_acceptance: 'pending' });
  }
  const summary = { revision, dirty, output: options.output, outcomes };
  await writeFile(join(options.output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary));
  if (outcomes.some(o => o.developer_observation === 'blocked')) process.exitCode = 1;
}
try { await main(); } catch { console.error('Fixture packet failed. Keep any produced evidence; check preparation and use a new output directory only after correcting a mechanical setup failure.'); process.exitCode = 2; }
