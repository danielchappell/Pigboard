#!/usr/bin/env node
// Prepared local fixture packet. Never accepts an AWS resource, endpoint or credentials.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixture, StateProvider, prepared, beginInput, finalizeInput, allLimits, row } from '../test/helpers/state-provider.mjs';
import { createDynamoState } from '../lib/aws/dynamodb.mjs';
import { projectRetainedInventory } from '../lib/state/contract.mjs';
import { runInspectionGroup } from './test-manager-apply.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const cases = ['R1-14-H01', 'R1-14-H02', 'R1-14-H03'];
const inspectionCases = ['INSPECT-H01', 'INSPECT-H02'];
function parse(args) {
  if (args.length === 1 && args[0] === '--help') return null;
  const input = {};
  for (let n = 0; n < args.length; n++) {
    const key = args[n]; if (!['--all', '--case', '--output'].includes(key) || Object.hasOwn(input, key)) throw Error('Use --case ID or --all, and --output NEW_DIRECTORY.');
    if (key === '--all') input[key] = true;
    else { if (!args[n + 1] || args[n + 1].startsWith('--')) throw Error('Supply the documented value.'); input[key] = args[++n]; }
  }
  if (!input['--output'] || Boolean(input['--case']) === Boolean(input['--all']) || input['--case'] && ![...cases,...inspectionCases].includes(input['--case'])) throw Error('Select one prescribed case or --all and a new output directory.');
  return { selected: input['--all'] ? cases : [input['--case']], output: resolve(input['--output']) };
}
const observation = traces => ({ developer_observation: 'confirmed_local_api_fixture', human_acceptance: 'pending', installed_acceptance: 'pending', traces,
  limitations: ['Simulated Dynamo provider; no real AWS or Jira acceptance.', 'Human reviewer must assess the retained evidence; this command cannot record a human PASS.', 'PGB-83 owns actual installation/CLI and collection-to-policy acceptance.'] });
async function h01() {
  const provider = new StateProvider();
  const disabled = createDynamoState({ binding: fixture.binding, control: fixture.control, client: provider });
  const initialization = await disabled.initialize({ fresh_installation: fixture.fresh, now: fixture.now });
  assert.equal(initialization.status, 'confirmed');
  assert.equal(initialization.data.installation.writes_enabled, false);
  assert.equal(initialization.data.installation.schedule_enabled, false);
  // Only the disposable provider changes controls; no production enable API exists.
  provider.enable();
  const writer = createDynamoState({ binding: fixture.binding, control: { ...fixture.control, writes_enabled: true, schedule_enabled: true }, client: provider });
  assert.equal((await writer.begin(beginInput())).status, 'confirmed');
  provider.disable();
  const before = provider.snapshot(), auditStart = provider.audit.length, inspections = {};
  for (const kind of ['installation', 'stream', 'attempt', 'member']) {
    inspections[kind] = await disabled.inspect({ kind });
    assert.equal(inspections[kind].status, 'confirmed');
    assert.equal(inspections[kind].data.records.length, 1);
  }
  const inventory = await disabled.readInventory({ limits: allLimits });
  assert.equal(inventory.status, 'confirmed');
  const projection = projectRetainedInventory(inventory.data);
  assert.deepEqual(projection.retained_members, [{ ticket_id: '1001', project_id: '100', epic_id: '1000', label: 'AI-Maria-1', assignment: null }]);
  assert.deepEqual(projection.pending_intents, [{ project_id: '100', label: 'AI-Maria-1', ticket_id: '1001', attempt_id: fixture.attemptA.attempt_id }]);
  assert.equal(provider.snapshot(), before);
  assert(!provider.audit.slice(auditStart).some(a => a.name === 'TransactWriteCommand'));
  for (const record of provider.records()) for (const key of ['description', 'body', 'transcript', 'code', 'raw_body']) assert(!Object.hasOwn(record, key));
  return observation([{ step: 'Disabled initialization, four kinds and complete read-only retained projection', initialization, inspections, inventory, projection, before, after: provider.snapshot(), command_audit: provider.audit }]);
}
async function h03() {
  const { state, provider } = await prepared();
  assert.equal((await state.begin(beginInput())).status, 'confirmed');
  const streamB = { ...fixture.streamA, project_id: '200' };
  const memberB = { ...fixture.memberA, ...streamB, ticket_id: '2001', epic_id: '2000' };
  const attemptB = { ...fixture.attemptA, attempt_id: '33333333-3333-4333-8333-333333333333', ticket_id: '2001', epic_id: '2000', issue_key: 'BBB-1' };
  assert.equal((await state.begin(beginInput({ expected_installation_revision: 1, stream: streamB, attempt: attemptB, required_members: [memberB] }))).status, 'confirmed');
  const before = provider.snapshot(), auditStart = provider.audit.length, traces = [];
  const nativeObservations = [
    { change: 'key rename', ticket_id: '1001', key: 'RENAMED-1', project_id: '100', configured_projects: ['100', '200'] },
    { change: 'issue move', ticket_id: '1001', key: 'BBB-2', project_id: '200', configured_projects: ['100', '200'] },
    { change: 'project removal', ticket_id: '1001', key: 'BBB-2', project_id: '200', configured_projects: ['200'] }
  ];
  for (const native_observation of nativeObservations) {
    // Native facts are intentionally not state mutations. The later collector
    // joins these observations to the preserved original ownership.
    const inventory = await state.readInventory({ limits: allLimits });
    assert.equal(inventory.status, 'confirmed');
    const projection = projectRetainedInventory(inventory.data);
    assert.deepEqual(projection.retained_members.map(m => [m.ticket_id, m.project_id, m.label]).sort(), [['1001', '100', 'AI-Maria-1'], ['2001', '200', 'AI-Maria-1']]);
    assert.deepEqual(projection.pending_intents.map(p => [p.project_id, p.attempt_id]).sort(), [['100', fixture.attemptA.attempt_id], ['200', attemptB.attempt_id]]);
    assert.equal(provider.snapshot(), before);
    traces.push({ native_observation, inventory, projection });
  }
  const stale = await state.finalize(finalizeInput({ expected_installation_revision: 2, stream: streamB }));
  assert.equal(stale.status, 'conflict'); assert.equal(provider.snapshot(), before);
  assert(!provider.audit.slice(auditStart).some(a => a.name === 'TransactWriteCommand'));
  return observation([{ step: 'Original project ownership survives changed native observations; cross-project completion rejects', traces, stale, before, after: provider.snapshot(), command_audit: provider.audit }]);
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
  return observation(traces);
}
async function main() {
  const options = parse(process.argv.slice(2));
  if (!options) {
    console.log('node scripts/test-manager-state.mjs --case R1-14-H01|R1-14-H02|R1-14-H03|INSPECT-H01|INSPECT-H02 --output NEW_DIRECTORY\nUse --all for the three R1-14 API groups. The two INSPECT groups exercise local CLI fixtures with simulated providers. Human acceptance remains pending.');
    return;
  }
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const revision = git('rev-parse', 'HEAD'), dirty = git('status', '--porcelain').length !== 0;
  await mkdir(options.output); // Refuse to overwrite any retained evidence directory.
  await writeFile(join(options.output, 'fixture-inputs.json'), JSON.stringify(fixture, null, 2) + '\n');
  const outcomes = [];
  for (const case_id of options.selected) {
    const observed = inspectionCases.includes(case_id)
      ? {developer_observation:'confirmed_local_cli_fixture',human_acceptance:'pending',installed_acceptance:'pending',
        limitations:['Disposable local State and TLS Jira fixtures with simulated AWS identity and credentials.'],
        cleanup:'Disposable fixture resources removed; this evidence remains.',...await runInspectionGroup(case_id)}
      : await ({ 'R1-14-H01': h01, 'R1-14-H02': h02, 'R1-14-H03': h03 })[case_id]();
    const evidence = { schema: 'pigboard-state-fixture-evidence/v1', case_id, revision, dirty, command:process.argv, ...observed };
    await writeFile(join(options.output, case_id + '.json'), JSON.stringify(evidence, null, 2) + '\n');
    outcomes.push({ case_id, developer_observation: observed.developer_observation, human_acceptance: 'pending', installed_acceptance: 'pending' });
  }
  const summary = { revision, dirty, output: options.output, outcomes };
  await writeFile(join(options.output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary));
  if (outcomes.some(o => o.developer_observation === 'blocked')) process.exitCode = 1;
}
try { await main(); } catch (error) {
  console.error('Fixture packet failed. Keep any produced evidence; check preparation and use a new output directory only after correcting a mechanical setup failure.');
  if(process.argv.some(arg=>inspectionCases.includes(arg)))console.error(error.stack);
  process.exitCode = 2;
}
