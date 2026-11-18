import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createDynamoState, createDynamoClient } from '../lib/aws/dynamodb.mjs';
import { StateProvider, fixture, beginInput } from './helpers/state-provider.mjs';
import { parse } from 'yaml';
import { proofFixture, expectedCommitment } from '../scripts/test-transition-proof.mjs';

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

async function localSDK(t, stateFactory = createDynamoState) {
  const requests = []; let failure = false;
  const server = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    requests.push({ target: req.headers['x-amz-target'], body: JSON.parse(body) });
    res.writeHead(failure ? 500 : 200, { 'content-type': 'application/x-amz-json-1.0' });
    res.end(failure ? JSON.stringify({ __type: 'InternalServerError', message: 'synthetic local fault' }) : '{}');
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: fixture.binding.region, maxAttempts: 1, credentials: { accessKeyId: 'LOCAL_DUMMY', secretAccessKey: 'LOCAL_DUMMY' }, endpoint: 'http://127.0.0.1:' + server.address().port }));
  t.after(async () => { client.destroy(); server.close(); await once(server, 'close'); });
  const provider = new StateProvider();
  const transport = { async send(command, options) { if (command.constructor.name === 'TransactWriteCommand') await client.send(command, options); return provider.send(command, options); } };
  const state = stateFactory({ binding: fixture.binding, control: fixture.control, client: transport });
  return { requests, provider, state, transport, fail: () => { failure = true; } };
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
