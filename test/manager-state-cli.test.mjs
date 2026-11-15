import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { runStateCommand, stateExitCode } from '../scripts/manager-state.mjs';
import { createDynamoState } from '../lib/aws/dynamodb.mjs';
import { result } from '../lib/state/contract.mjs';
import { fixture, StateProvider, prepared, beginInput } from './helpers/state-provider.mjs';
const flags = ['--config', '/fixture/company.yaml', '--installation', '/fixture/generated.json'];
test('help is available without constructing SDK or resolving installation', async () => {
  const answer = await runStateCommand(['--help'], { resolveInstallation() { throw Error('must not run'); } });
  assert.equal(answer.exitCode, 0); assert.match(answer.stdout, /canonical configuration/);
  const process = spawnSync('node', ['scripts/manager-state.mjs', '--help'], { encoding: 'utf8' }); assert.equal(process.status, 0);
});
test('unknown, duplicate, raw resource and unbounded flags reject before the resolver', async () => {
  let called = 0; const dependencies = { resolveInstallation() { called++; } };
  for (const bad of [['inspect', ...flags, '--kind', 'stream', '--table', 'secret'], ['inspect', ...flags, '--kind', 'stream', '--limit', '101'], ['init', ...flags, '--config', 'other'], ['init', ...flags, '--fresh-installation', 'file'], ['inspect', ...flags, '--kind', 'stream', '--cursor', 'x', '--record-id', 'x']]) {
    assert.equal((await runStateCommand(bad, dependencies)).exitCode, 2);
  }
  assert.equal(called, 0);
});
test('standalone command honestly reports missing core resolver', async () => {
  const answer = await runStateCommand(['inspect', ...flags, '--kind', 'installation', '--json']);
  assert.equal(answer.outcome.code, 'CORE_PREREQUISITE'); assert.equal(answer.exitCode, 2);
  assert.equal(JSON.parse(answer.stdout).data, null);
});
test('init passes generated binding through trusted injected resolver, disabled only', async () => {
  const provider = new StateProvider(); let observed;
  const answer = await runStateCommand(['init', ...flags, '--json'], {
    async resolveInstallation(input) { observed = input; return { binding: fixture.binding, control: fixture.control, fresh_installation: fixture.fresh }; },
    createState: options => createDynamoState({ ...options, client: provider }), now: () => fixture.now
  });
  assert.equal(answer.exitCode, 0); assert.equal(answer.outcome.data.installation.writes_enabled, false);
  assert.deepEqual(observed, { configPath: flags[1], installationPath: flags[3], purpose: 'init' });
  const repeated = await runStateCommand(['init', ...flags], { resolveInstallation: async () => ({ binding: fixture.binding, control: fixture.control, fresh_installation: fixture.fresh }), createState: options => createDynamoState({ ...options, client: provider }), now: () => fixture.now });
  assert.equal(repeated.outcome.code, 'ALREADY_INITIALIZED'); assert.equal(repeated.exitCode, 1);
});
test('inspect readable and JSON outputs show same retained IDs and make no writes', async () => {
  const { state, provider } = await prepared(); await state.begin(beginInput()); provider.disable();
  const dependencies = { resolveInstallation: async () => ({ binding: fixture.binding, control: fixture.control }), createState: options => createDynamoState({ ...options, client: provider }) };
  const before = provider.snapshot(), writes = provider.audit.filter(a => a.name === 'TransactWriteCommand').length;
  const readable = await runStateCommand(['inspect', ...flags, '--kind', 'stream'], dependencies);
  const json = await runStateCommand(['inspect', ...flags, '--kind', 'stream', '--json'], dependencies);
  assert.equal(readable.exitCode, 0); assert.equal(json.exitCode, 0);
  assert.match(readable.stdout, new RegExp(json.outcome.data.records[0].pending_attempt_id));
  assert.equal(provider.snapshot(), before); assert.equal(provider.audit.filter(a => a.name === 'TransactWriteCommand').length, writes);
});
test('provider bodies and raw thrown errors never appear in command output', async () => {
  const secret = 'SECRET_PROVIDER_BODY';
  const answer = await runStateCommand(['inspect', ...flags, '--kind', 'attempt', '--json'], { resolveInstallation() { throw new Error(secret); } });
  assert.equal(answer.exitCode, 2); assert(!answer.stdout.includes(secret));
  for (const status of ['unsupported_version', 'unavailable', 'invalid', 'uncertain']) assert.equal(stateExitCode(result(status, 'UNAVAILABLE')), 2);
  assert.equal(stateExitCode(result('unavailable', 'INCOMPLETE_INVENTORY')), 1);
});
