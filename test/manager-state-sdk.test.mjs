import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createDynamoState, createDynamoClient, createDynamoOperatorState, createDynamoLifecycleState } from '../lib/aws/dynamodb.mjs';
import { StateProvider, fixture, beginInput } from './helpers/state-provider.mjs';
import { parse } from 'yaml';
import { proofFixture, expectedCommitment } from '../scripts/test-transition-proof.mjs';
import { operatorActorId } from '../lib/state/contract.mjs';

const runtimeRequire = createRequire(new URL('../runtime/aws/package.json', import.meta.url));
const { DynamoDBClient } = runtimeRequire('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = runtimeRequire('@aws-sdk/lib-dynamodb');
const { marshall, unmarshall } = runtimeRequire('@aws-sdk/util-dynamodb');

test('production SDK factory uses pinned nested packages, one attempt and standard credentials', async () => {
  const client = createDynamoClient(fixture.binding);
  try {
    assert.equal(await client.config.maxAttempts(), 1);
    assert.equal(await client.config.region(), fixture.binding.region);
    const endpoint = await client.config.endpointProvider({ Region: fixture.binding.region, UseDualStack: false, UseFIPS: false });
    assert.equal(endpoint.url.hostname, 'dynamodb.eu-west-1.amazonaws.com');
    const manifest = JSON.parse(await readFile(new URL('../runtime/aws/package.json', import.meta.url)));
    for (const name of Object.keys(manifest.dependencies)) {
      assert.equal(runtimeRequire(name + '/package.json').version, manifest.dependencies[name]);
      assert.match(runtimeRequire.resolve(name), /runtime\/aws\/node_modules\//);
    }
  } finally { client.destroy(); }
});

async function localSDK(t, stateFactory = createDynamoState, wireReads = false) {
  const provider = new StateProvider();
  const requests = []; let failure = false, readFault;
  function item(Key) {
    const row = provider.rows.get(JSON.stringify([Key.PK.S, Key.SK.S]));
    return row ? { Item: marshall(row) } : {};
  }
  const server = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    const request = { target: req.headers['x-amz-target'], body: JSON.parse(body) };
    requests.push(request);
    let value = {};
    if (wireReads && request.target.endsWith('.GetItem')) value = item(request.body.Key);
    if (wireReads && request.target.endsWith('.TransactGetItems')) {
      value = { Responses: request.body.TransactItems.map(({ Get }) => item(Get.Key)) };
    }
    const fault = readFault?.(request, value);
    res.writeHead(fault?.status ?? (failure ? 500 : 200), { 'content-type': 'application/x-amz-json-1.0' });
    res.end(JSON.stringify(fault?.body ?? (failure ? { __type: 'InternalServerError', message: 'synthetic local fault' } : value)));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: fixture.binding.region, maxAttempts: 1, credentials: { accessKeyId: 'LOCAL_DUMMY', secretAccessKey: 'LOCAL_DUMMY' }, endpoint: 'http://127.0.0.1:' + server.address().port }));
  t.after(async () => { client.destroy(); server.close(); await once(server, 'close'); });
  const transport = { async send(command, options) {
    const name = command.constructor.name;
    if (wireReads && ['GetCommand', 'TransactGetCommand'].includes(name)) return client.send(command, options);
    if (name === 'TransactWriteCommand') await client.send(command, options);
    return provider.send(command, options);
  } };
  const state = stateFactory({ binding: fixture.binding, control: fixture.control, client: transport });
  return { requests, provider, state, transport, fail: () => { failure = true; }, faultRead: handler => { readFault = handler; } };
}
test('actual SDK serializes the production transaction and does not retry unknown writes', async t => {
  const { requests, provider, state, transport, fail } = await localSDK(t);
  assert.equal((await state.initialize({ fresh_installation: fixture.fresh, now: fixture.now })).status, 'confirmed');
  assert.equal(requests[0].target, 'DynamoDB_20120810.TransactWriteItems');
  const initial = requests[0].body.TransactItems[0].Put;
  assert.equal(initial.Item.kind.S, 'installation'); assert.equal(initial.Item.writes_enabled.BOOL, false);
  provider.enable();
  const writer = createDynamoState({ binding: fixture.binding, control: { ...fixture.control, schedule_enabled: true, writes_enabled: true }, client: transport });
  assert.equal((await writer.begin(beginInput())).status, 'confirmed');
  const transaction = requests[1].body.TransactItems;
  assert.equal(transaction.length, 4);
  assert.equal(transaction[1].Put.Item.pending_attempt_id.S, fixture.attemptA.attempt_id);
  assert.equal(transaction[2].Put.Item.attempt_id.S, fixture.attemptA.attempt_id);
  assert.equal(transaction[3].Put.Item.ticket_id.S, fixture.memberA.ticket_id);
  // One further distinct fixture initialization receives exactly one failed request.
  provider.rows.clear(); fail(); const before = requests.length;
  const unknown = await state.initialize({ fresh_installation: fixture.fresh, now: fixture.now });
  assert.equal(unknown.status, 'uncertain'); assert.equal(requests.length - before, 1); assert.equal(provider.records().length, 0);
});
test('SDK prepares native evidence in one revision-fenced insert-only transaction', async t => {
  const {requests, provider, state, transport} = await localSDK(t);
  assert.equal((await state.initialize({fresh_installation: fixture.fresh, now: fixture.now})).status, 'confirmed');
  provider.enable();
  const writer = createDynamoState({binding: fixture.binding,
    control: {...fixture.control, schedule_enabled: true, writes_enabled: true}, client: transport});
  const begun = await writer.begin(beginInput());
  assert.equal(begun.status, 'confirmed');
  const revisions = (installation, stream, attempt) => ({
    attempt_id: fixture.attemptA.attempt_id, expected_installation_revision: installation,
    expected_stream_revision: stream, expected_attempt_revision: attempt, now: fixture.now
  });
  const {reference, transition_id, producer_invocation_id, publication_observations} = proofFixture;
  const retained = await writer.retainPublication({...revisions(1, 0, 0), reference});
  assert.equal(retained.status, 'confirmed');
  const metadata = {...publication_observations.comments[0],
    created: '2026-11-15T13:00:00.000+01:00', updated: '2026-11-15T13:00:00.000+01:00'};
  const start = requests.length;
  const prepared = await writer.prepareTransitionCapture({
    ...revisions(2, 0, 1), transition_id, producer_invocation_id,
    publication_observations: {...publication_observations, comments: [metadata]}
  });
  assert.equal(prepared.status, 'confirmed', JSON.stringify(prepared));
  assert.equal(requests.length - start, 1);
  const wire = requests.at(-1).body.TransactItems;
  assert.equal(wire.length, 4);
  assert(wire.length <= 100 && Buffer.byteLength(JSON.stringify(marshall({actions: provider.audit.at(-1).input.TransactItems}))) <= 1048576);
  const {request_digest, publication_digest} = expectedCommitment(fixture.binding);
  const {installation_id, site} = fixture.binding;
  const PK = 'installation#' + installation_id;
  const expected = {
    PK, SK: 'N#' + fixture.attemptA.attempt_id, schema: 'pigboard-native-publication/v1', installation_id, site,
    attempt_id: fixture.attemptA.attempt_id, request_digest, publication_digest, comments: [metadata]
  };
  const {Put: put} = wire.find(action => action.Put);
  assert.equal(put.TableName, fixture.binding.table_name);
  assert.equal(put.ConditionExpression, 'attribute_not_exists(PK)');
  assert.deepEqual(unmarshall(put.Item), expected);
  assert(Buffer.byteLength(JSON.stringify(put.Item)) <= 32768);
  const guards = new Map(wire.filter(action => !action.Put).map(action => {
    const condition = action.Update ?? action.ConditionCheck;
    assert.equal(condition.Key.PK.S, PK);
    assert.equal(condition.TableName, fixture.binding.table_name);
    assert.match(condition.ConditionExpression, /#revision = :revision/);
    return [condition.Key.SK.S.slice(0, 2), condition];
  }));
  for (const [prefix, revision] of [['I#', '2'], ['S#', '0'], ['A#', '1']]) {
    assert.equal(guards.get(prefix).ExpressionAttributeValues[':revision'].N, revision);
  }
  assert.match(guards.get('S#').ConditionExpression, /pending_attempt_id = :pending/);
  assert.equal(guards.get('S#').ExpressionAttributeValues[':pending'].S, fixture.attemptA.attempt_id);
  assert.equal(prepared.data.attempt.extensions.pb_capture_request_digest, request_digest);
  assert.equal(prepared.data.attempt.extensions.pb_capture_publication_digest, publication_digest);
});

const operatorIdentity = { Account: '123456789012', UserId: 'AROAEXAMPLE:fixture', Arn: 'arn:aws:sts::123456789012:assumed-role/operator/fixture' };
const operatorActor = { account_id: operatorIdentity.Account, user_id: operatorIdentity.UserId, arn: operatorIdentity.Arn };
const birthScope = ['installation_id', 'domain_id', 'site', 'stack_id', 'installation_generation', 'table_arn'];
const originEvidence = {
  ...Object.fromEntries(birthScope.map(field => [field, fixture.binding[field]])),
  table_id: '12564bc1-4961-4ca7-aeed-bd869519fa69', table_created_at: fixture.now,
  role_event_id: 'role-event', role_event_at: fixture.now,
  table_event_id: 'table-event', table_event_at: fixture.now, policy_digest: 'sha256:' + 'f'.repeat(64)
};
const protectedTable = {
  TableArn: fixture.binding.table_arn, TableStatus: 'ACTIVE',
  TableId: originEvidence.table_id, CreationDateTime: new Date(originEvidence.table_created_at)
};
const protectedInit = { fresh_installation: fixture.fresh, now: fixture.now };
const operatorOptions = (client, control = fixture.control) => ({ binding: fixture.binding, control, client, identity: operatorIdentity, originEvidence });
const withTable = (transport, Table = protectedTable) => ({
  send: (command, options) => command.constructor.name === 'DescribeTableCommand' ? { Table } : transport.send(command, options)
});

test('protected init verifies the second physical table read before an atomic and insert-only origin write', async t => {
  const { requests, provider, transport, state } = await localSDK(t);
  assert.equal(state.reconcileAttempt, undefined);
  assert.equal(state.readDecision, undefined);
  for (const altered of [
    { TableId: undefined }, { TableId: 'f3548c19-2ad8-40dd-a3e4-05f771944642' },
    { CreationDateTime: undefined }, { CreationDateTime: new Date(Date.parse(fixture.now) + 1000) }
  ]) {
    const client = withTable(transport, { ...protectedTable, ...altered });
    const result = await createDynamoOperatorState(operatorOptions(client), 'initialize').initialize(protectedInit);
    assert.equal(result.code, 'ORIGIN_UNVERIFIED', JSON.stringify(altered));
    assert.equal(requests.length, 0);
    assert.equal(provider.rows.size, 0);
  }
  const client = withTable(transport);
  const operator = createDynamoOperatorState(operatorOptions(client), 'initialize');
  assert.equal(operator.readDecision, undefined);
  assert.equal((await operator.initialize(protectedInit)).status, 'confirmed');
  assert.equal(requests.length, 1);
  const transaction = requests[0].body.TransactItems;
  assert.equal(transaction.length, 2);
  const [installation, origin] = transaction.map(({ Put }) => {
    assert.equal(Put.ConditionExpression, 'attribute_not_exists(PK)');
    return unmarshall(Put.Item);
  });
  assert.equal(installation.PK, 'installation#' + fixture.binding.installation_id);
  assert.equal(installation.writes_enabled, false);
  assert.deepEqual(origin, { PK: 'operator-decision#' + fixture.binding.installation_id, SK: 'ORIGIN',
    schema: 'pigboard-operator-origin/v1', ...originEvidence, actor: operatorActor, package_revision: fixture.binding.package_revision });
  assert.equal((await operator.initialize(protectedInit)).code, 'ALREADY_INITIALIZED');
  assert.equal(requests.length, 1);
});

test('protected SDK reads prove absence and coherent history with full rows on the real pinned wire boundary', async t => {
  const { requests, provider, transport, faultRead } = await localSDK(t, createDynamoState, true);
  const init = createDynamoOperatorState(operatorOptions(withTable(transport)), 'initialize');
  assert.equal((await init.initialize(protectedInit)).status, 'confirmed');
  provider.enable();
  const writer = createDynamoState({ binding: fixture.binding, control: { ...fixture.control, schedule_enabled: true, writes_enabled: true }, client: transport });
  assert.equal((await writer.begin(beginInput())).status, 'confirmed');
  const { reference, transition_id, producer_invocation_id, publication_observations } = proofFixture;
  const attempt_id = fixture.attemptA.attempt_id;
  const revisions = (installation, attempt) => ({
    attempt_id, expected_installation_revision: installation, expected_stream_revision: 0, expected_attempt_revision: attempt
  });
  assert.equal((await writer.retainPublication({ ...revisions(1, 0), reference, now: fixture.now })).status, 'confirmed');
  const prepared = await writer.prepareTransitionCapture({ ...revisions(2, 1), transition_id, producer_invocation_id, publication_observations, now: fixture.now });
  assert.equal(prepared.status, 'confirmed');
  const proof = expectedCommitment(fixture.binding);
  assert.equal((await writer.recordTransitionResponse({ ...revisions(3, 2), request_digest: proof.request_digest, http_status: 204,
    observed_at: fixture.now, provider_request_id: null })).status, 'confirmed');
  const control = { ...fixture.control, maintenance: true };
  const stop = { pb_stop_version: 1, pb_stop_id: 'f2ad8c6e-1beb-40b3-a830-abe9d6a83848',
    pb_stop_actor: operatorActorId(operatorActor), pb_stop_config_digest: control.configuration_digest,
    pb_stop_package_revision: fixture.binding.package_revision, pb_stop_resource_digest: 'sha256:' + '1'.repeat(64),
    pb_stop_bounds_digest: 'sha256:' + '2'.repeat(64), pb_stop_fence_revision: 5,
    pb_stop_started_at: '2026-11-15T11:00:00.000Z', pb_stop_window_ms: 1000,
    pb_stop_completed_at: fixture.now, pb_stop_elapsed_ms: 3600000 };
  const installed = provider.records().find(record => record.kind === 'installation');
  provider.seed({ ...installed, ...control, revision: 5, extensions: stop });
  const stopped = createDynamoState({ binding: fixture.binding, control, client: transport });
  const pending = await stopped.readAttempt({ attempt_id });
  assert.equal(pending.status, 'confirmed');
  const operator = createDynamoOperatorState(operatorOptions(transport, control), 'reconcile');
  const inspect = createDynamoOperatorState(operatorOptions(transport, control), 'inspect');
  assert.equal(inspect.reconcileAttempt, undefined);
  assert.equal(inspect.initialize, undefined);

  const lookupStart = requests.length;
  assert.deepEqual((await operator.readDecision({ attempt_id })).data, { attempt: pending.data.attempt, operator_decision: null });
  const [presence, pair] = requests.slice(lookupStart);
  const protectedPK = 'operator-decision#' + fixture.binding.installation_id;
  const normalPK = 'installation#' + fixture.binding.installation_id;
  const protectedKey = { PK: protectedPK, SK: 'A#' + attempt_id };
  const attemptKey = { PK: normalPK, SK: 'A#attempt:' + attempt_id };
  const originKey = { PK: protectedPK, SK: 'ORIGIN' };
  assert.equal(presence.target, 'DynamoDB_20120810.GetItem');
  assert.deepEqual(presence.body, { TableName: fixture.binding.table_name, ConsistentRead: true, Key: marshall(protectedKey) });
  const getters = keys => keys.map(Key => ({ Get: { TableName: fixture.binding.table_name, Key: marshall(Key) } }));
  assert.equal(pair.target, 'DynamoDB_20120810.TransactGetItems');
  assert.deepEqual(pair.body, { TransactItems: getters([originKey, attemptKey]) });
  faultRead((req, body) => req.target.endsWith('.TransactGetItems') ? { body: { Responses: [body.Responses[0], {}] } } : null);
  assert.equal((await operator.readDecision({ attempt_id })).status, 'unavailable');
  faultRead(null);

  const request = { schema: 'pigboard-reconciliation-request/v1', ...revisions(5, 3), disposition: 'confirmed_applied' };
  const before = provider.snapshot();
  const options = { request, snapshot: pending.data, stop, now: fixture.now };
  provider.fault = 'before';
  assert.equal((await operator.reconcileAttempt(options)).status, 'uncertain');
  assert.equal(provider.snapshot(), before);
  assert.equal((await operator.readDecision({ attempt_id })).data.operator_decision, null);
  provider.fault = 'after';
  assert.equal((await operator.reconcileAttempt(options)).status, 'uncertain');
  const wire = requests.at(-1).body.TransactItems;
  assert.equal(wire.length, 4);
  const last = wire[3].Put;
  assert.equal(last.ConditionExpression, 'attribute_not_exists(PK)');
  const { PK, SK, ...decision } = unmarshall(last.Item);
  assert.deepEqual({ PK, SK }, protectedKey);
  assert.deepEqual(decision.actor, operatorActor);
  assert.equal(decision.request_digest, proof.request_digest);
  assert.equal(decision.publication_digest, proof.publication_digest);
  assert.equal(decision.attempt_revision, 4);
  assert.equal(decision.stop_id, stop.pb_stop_id);
  for (const [index, prefix, revision] of [[0, 'I#', '5'], [1, 'S#', '0'], [2, 'A#', '3']]) {
    const { Update } = wire[index];
    assert.equal(Update.Key.PK.S, normalPK);
    assert(Update.Key.SK.S.startsWith(prefix));
    assert.equal(Update.ExpressionAttributeValues[':revision'].N, revision);
  }
  assert.deepEqual(unmarshall(wire[0].Update.ExpressionAttributeValues)[':guard_extensions'], stop);
  assert.equal(wire[1].Update.ExpressionAttributeValues[':guard_pending_attempt_id'].S, attempt_id);
  assert.deepEqual(unmarshall(wire[2].Update.ExpressionAttributeValues)[':guard_extensions'], pending.data.attempt.extensions);

  const finalized = provider.snapshot();
  assert.equal((await operator.reconcileAttempt(options)).code, 'REVISION_CONFLICT');
  assert.equal(provider.snapshot(), finalized);
  const verifyStart = requests.length;
  const verified = await inspect.readDecision({ attempt_id });
  assert.equal(verified.status, 'confirmed', JSON.stringify(verified));
  assert.deepEqual(verified.data.operator_decision, decision);
  assert.equal(verified.data.attempt.revision, 4);
  assert.equal(verified.data.attempt.outcome, 'applied');
  assert.deepEqual(verified.data.attempt.publication, pending.data.attempt.publication);
  assert.deepEqual(requests.slice(verifyStart).map(row => row.body), [
    presence.body, { TransactItems: getters([originKey, protectedKey, attemptKey]) }
  ]);
  for (const corrupt of [
    (req) => req.target.endsWith('.GetItem') ? { status: 400, body: { __type: 'AccessDeniedException' } } : null,
    (req, body) => req.target.endsWith('.TransactGetItems') ? { body: { Responses: [body.Responses[0], null, body.Responses[2]] } } : null,
    (req, body) => req.target.endsWith('.TransactGetItems') ? { body: { Responses: [body.Responses[0], body.Responses[1], { Item: marshall(attemptKey) }] } } : null
  ]) {
    faultRead(corrupt);
    const rejected = await inspect.readDecision({ attempt_id });
    assert.equal(rejected.status, 'unavailable');
    assert.equal(rejected.data, null);
  }
  assert.equal(provider.snapshot(), finalized);
});

test('copied package resolves only its own prepared runtime; missing runtime is SETUP', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'pigboard-state-layout-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const path of ['lib', 'contracts', 'config', 'node_modules', 'package.json', 'package-lock.json']) await cp(new URL('../' + path, import.meta.url), join(directory, path), { recursive: true });
  await mkdir(join(directory, 'runtime/aws'), { recursive: true });
  for (const path of ['package.json', 'package-lock.json', 'node_modules']) await cp(new URL('../runtime/aws/' + path, import.meta.url), join(directory, 'runtime/aws', path), { recursive: true });
  const staged = await import(pathToFileURL(join(directory, 'lib/aws/dynamodb.mjs')));
  const loaded = staged.createDynamoClient(fixture.binding); assert.equal(await loaded.config.maxAttempts(), 1); loaded.destroy();
  const { state, requests } = await localSDK(t, staged.createDynamoState);
  assert.equal((await state.initialize({ fresh_installation: fixture.fresh, now: fixture.now })).status, 'confirmed');
  assert.equal(requests[0].body.TransactItems[0].Put.Item.installation_id.S, fixture.binding.installation_id);
  await rm(join(directory, 'runtime/aws/node_modules'), { recursive: true, force: true });
  assert.throws(() => staged.createDynamoState({ binding: fixture.binding, control: fixture.control }), e => e.stateResult?.code === 'SETUP');
  const root = JSON.parse(await readFile(join(directory, 'package.json')));
  assert.deepEqual(Object.keys(root.dependencies).sort(), ['ajv', 'ajv-formats', 'canonicalize', 'parse5', 'yaml']);
  const allowlist = await readFile(new URL('../config/skill-bundle.json', import.meta.url), 'utf8');
  assert(!allowlist.includes('runtime/aws'));
});
test('CI prepares root and isolated locked runtime before mandatory root test glob', async () => {
  const workflow = parse(await readFile(new URL('../.github/workflows/test.yml', import.meta.url), 'utf8'));
  const steps = workflow.jobs['skills-and-setup'].steps;
  const root = steps.findIndex(s => s.run === 'npm ci --ignore-scripts --no-audit --no-fund');
  const runtime = steps.findIndex(s => s.run === 'npm ci --prefix runtime/aws --ignore-scripts --no-audit --no-fund');
  const tests = steps.findIndex(s => s.run === 'npm test');
  assert(root >= 0 && runtime > root && tests > runtime);
  assert.deepEqual(steps.find(s => s.uses?.startsWith('actions/setup-node')).with['cache-dependency-path'].trim().split('\n'), ['package-lock.json', 'runtime/aws/package-lock.json']);
});

test('lifecycle State fences a participating owner, accounts for dispatch, and reads back immutable outcomes', async () => {
  const provider = new StateProvider();
  const table = { ...protectedTable, TableName: fixture.binding.table_name,
    KeySchema: [{ AttributeName: 'PK', KeyType: 'HASH' }, { AttributeName: 'SK', KeyType: 'RANGE' }],
    AttributeDefinitions: [{ AttributeName: 'PK', AttributeType: 'S' }, { AttributeName: 'SK', AttributeType: 'S' }] };
  const client = withTable(provider, table);
  const options = { ...operatorOptions(client), lifecycle: true };
  const state = createDynamoLifecycleState(options);
  const init = await createDynamoOperatorState(options, 'initialize').initialize(protectedInit);
  assert.equal(init.status, 'confirmed');
  const initialTransaction = provider.audit.find(entry => entry.name === 'TransactWriteCommand').input.TransactItems;
  assert.equal(initialTransaction.length, 3);
  assert.equal(initialTransaction[2].Put.Item.PK, 'operator-lifecycle#' + fixture.binding.installation_id);
  assert.equal(initialTransaction[2].Put.ConditionExpression, 'attribute_not_exists(PK)');

  const read = async () => {
    const result = await state.read();
    assert.equal(result.status, 'confirmed');
    return result.data;
  };
  const bootstrap = '11ff2f17-a1f3-4e1b-b736-d165bba1b523';
  const stopId = '22ff2f17-a1f3-4e1b-b736-d165bba1b523';
  const finishingId = '33ff2f17-a1f3-4e1b-b736-d165bba1b523';
  const now = fixture.now;
  const bornId = '44ff2f17-a1f3-4e1b-b736-d165bba1b523';
  const born = await state.mutate({ type: 'reserve', expected: await read(), now, id: bornId,
    kind: 'bootstrap', effects: [], details: {} });
  assert.equal((await state.mutate({ type: 'finish', expected: born.data, now, id: bornId,
    outcome: 'completed', terminal: {} })).status, 'confirmed');
  const initial = await read();
  const reserved = await state.mutate({ type: 'reserve', expected: initial, now, id: bootstrap,
    kind: 'upgrade', effects: ['create-change-set', 'execute-change-set'], details: { token: bootstrap } });
  assert.equal(reserved.status, 'confirmed');
  const changeSet = fixture.binding.stack_id.split(':stack/')[0] + ':changeSet/pigboard-lifecycle-' + bootstrap + '/' + finishingId;
  const create = { type: 'claim', now, id: bootstrap, effect: 'create-change-set' };
  const record = { type: 'record-change-set', now, id: bootstrap, change_set_id: changeSet };
  const execute = { type: 'claim', now, id: bootstrap, effect: 'execute-change-set', change_set_id: changeSet };
  assert.equal((await state.mutate({ ...create, expected: initial })).code, 'REVISION_CONFLICT');
  assert.equal((await state.mutate({ ...record, expected: reserved.data })).code, 'REVISION_CONFLICT');
  assert.equal((await state.mutate({ ...create, expected: reserved.data })).status, 'confirmed');
  const created = await state.mutate({ ...create, type: 'settle', expected: await read() });
  assert.equal(created.status, 'confirmed');
  assert.equal((await state.mutate({ ...execute, expected: created.data })).code, 'REVISION_CONFLICT');
  assert.equal((await state.mutate({ ...record, expected: created.data, change_set_id: changeSet.replace('123456789012', '000000000000') })).code, 'REVISION_CONFLICT');
  const alternateIdentity = { ...operatorIdentity, UserId: 'AROAEXAMPLE:alternate', Arn: operatorIdentity.Arn.replace('/fixture', '/alternate') };
  const alternate = createDynamoLifecycleState({ ...options, identity: alternateIdentity });
  assert.equal((await alternate.mutate({ ...record, expected: created.data })).code, 'REVISION_CONFLICT');
  const selected = await state.mutate({ ...record, expected: created.data });
  assert.equal(selected.status, 'confirmed');
  assert.equal(selected.data.lifecycle.owner.details.change_set_id, changeSet);
  assert.equal((await state.mutate({ ...record, expected: selected.data })).code, 'REVISION_CONFLICT');
  assert.equal((await state.mutate({ ...execute, expected: selected.data, change_set_id: changeSet + '-other' })).code, 'REVISION_CONFLICT');
  assert.equal((await state.mutate({ ...execute, expected: selected.data })).status, 'confirmed');

  provider.fault = 'after';
  const emergency = await state.mutate({ type: 'emergency', expected: await read(), now, id: stopId,
    kind: 'stop', effects: [], details: {} });
  assert.equal(emergency.status, 'uncertain');
  const observed = await read();
  assert.equal(observed.lifecycle.fence_id, stopId);
  assert.equal(observed.lifecycle.owner.id, bootstrap);
  assert.equal(observed.installation.writes_enabled, false);
  assert.equal(observed.installation.schedule_enabled, false);
  assert.equal(observed.installation.maintenance, true);
  const finish = { type: 'finish', id: bootstrap, now, outcome: 'superseded', terminal: { provider_token: bootstrap } };
  assert.equal((await state.mutate({ ...finish, expected: observed })).code, 'REVISION_CONFLICT');
  assert.equal((await state.mutate({ type: 'settle', expected: observed, now, id: bootstrap, effect: 'execute-change-set' })).status, 'confirmed');
  assert.equal((await state.mutate({ ...finish, expected: await read() })).status, 'confirmed');
  const stored = (await state.readOperation(bootstrap)).data;
  assert.equal(stored.outcome, 'superseded');
  assert.equal(stored.fence_id, stopId);
  assert.equal(stored.owner.details.change_set_id, changeSet);
  assert.deepEqual(stored.owner.actor, operatorActor);
  assert.deepEqual((await state.readOperation(bootstrap)).data, stored);

  const stopped = await state.mutate({ type: 'reserve', expected: await read(), now, id: finishingId,
    kind: 'stop', effects: [], details: {} });
  const stop = { pb_stop_version: 1, pb_stop_id: finishingId, pb_stop_actor: operatorActorId(operatorActor),
    pb_stop_config_digest: fixture.binding.configuration_digest, pb_stop_package_revision: fixture.binding.package_revision,
    pb_stop_resource_digest: 'sha256:' + 'a'.repeat(64), pb_stop_bounds_digest: 'sha256:' + 'b'.repeat(64),
    pb_stop_fence_revision: stopped.data.lifecycle.owner.installation_revision, pb_stop_started_at: now, pb_stop_window_ms: 121000,
    pb_stop_completed_at: new Date(Date.parse(now) + 121000).toISOString(), pb_stop_elapsed_ms: 121000 };
  const completed = await state.mutate({ type: 'finish', expected: stopped.data, now: stop.pb_stop_completed_at, id: finishingId,
    outcome: 'completed', stop, terminal: { status: 'drained' } });
  assert.equal(completed.status, 'confirmed');
  const scope = { ...Object.fromEntries(birthScope.map(field => [field, fixture.binding[field]])), table_id: originEvidence.table_id };
  assert.equal((await state.readGeneration(scope)).data.stop_id, finishingId);
  const replacement = createDynamoLifecycleState({ ...options, client: withTable(provider, { ...table, TableId: bootstrap }) });
  assert.equal((await replacement.readGeneration(scope)).code, 'ORIGIN_UNVERIFIED');
  assert.deepEqual((await state.readOperation(bootstrap)).data, stored);
});
