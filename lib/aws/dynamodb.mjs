import canonicalize from 'canonicalize';
import { createRequire } from 'node:module';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sep } from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { streamKey } from '../config/projects.mjs';
import { STATE_LIMITS, KINDS, valid, validBinding, validateRecord, recordId, result, failure, nextRevision, memberSchema, streamSchema, attemptSchema, evidenceSchema, schemas } from '../state/contract.mjs';

const { obj, list, nullable, revision, timestamp } = schemas;
const clone = value => structuredClone(value);
const same = (a, b) => canonicalize(a) === canonicalize(b);
const prefixes = { installation: 'I#', stream: 'S#', attempt: 'A#', member: 'M#' };
function loadSDK() {
  try {
    const manifestURL = new URL('../../runtime/aws/package.json', import.meta.url);
    const require = createRequire(manifestURL), manifest = JSON.parse(readFileSync(manifestURL));
    const base = realpathSync(fileURLToPath(new URL('./node_modules/', manifestURL))) + sep;
    for (const name of ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb']) {
      const packagePath = realpathSync(require.resolve(name + '/package.json'));
      if (!packagePath.startsWith(base) || !realpathSync(require.resolve(name)).startsWith(base) || JSON.parse(readFileSync(packagePath)).version !== manifest.dependencies[name]) throw Error();
    }
    return { ...require('@aws-sdk/client-dynamodb'), ...require('@aws-sdk/lib-dynamodb'), ...require('@aws-sdk/util-dynamodb') };
  } catch { throw failure('SETUP'); }
}
export function createDynamoClient(binding) {
  const sdk = loadSDK();
  return sdk.DynamoDBDocumentClient.from(new sdk.DynamoDBClient({ region: binding.region, maxAttempts: 1 }), { marshallOptions: { removeUndefinedValues: false } });
}
export function createDynamoState({ binding, control, client } = {}) {
  if (!validBinding(binding, control)) throw failure('INVALID_INPUT', 'invalid');
  binding = clone(binding); control = clone(control);
  const sdk = loadSDK();
  const ownedClient = !client;
  client ??= createDynamoClient(binding);
  const PK = 'installation#' + binding.installation_id;
  const operation = new AsyncLocalStorage();
  const key = (kind, id) => ({ PK, SK: prefixes[kind] + id });
  const item = record => ({ ...key(record.kind, record.record_id), ...record });
  function checked(stored, kind, id) {
    if (!stored || stored.PK !== PK || stored.SK !== prefixes[kind] + id) throw failure('MALFORMED_RECORD');
    const { PK: ignoredPK, SK: ignoredSK, ...record } = stored;
    const error = validateRecord(record, binding); if (error) throw failure(error);
    if (Buffer.byteLength(JSON.stringify(sdk.marshall(record))) > STATE_LIMITS.record_bytes) throw failure('MALFORMED_RECORD');
    if (record.kind !== kind || record.record_id !== id) throw failure('MALFORMED_RECORD');
    return record;
  }
  async function send(Command, input, write = false, duration = 10000) {
    duration = Math.min(duration, (operation.getStore()?.deadline ?? Date.now() + 30000) - Date.now());
    if (duration <= 0) throw failure('UNAVAILABLE');
    const abort = new AbortController(); const timer = setTimeout(() => abort.abort(), duration);
    try { return await client.send(new sdk[Command](input), { abortSignal: abort.signal }); }
    catch (error) {
      if (error.stateResult) throw error;
      if (write && error.name === 'TransactionCanceledException' && Array.isArray(error.CancellationReasons) && error.CancellationReasons.some(r => r.Code === 'ConditionalCheckFailed') && error.CancellationReasons.every(r => ['None', 'ConditionalCheckFailed'].includes(r.Code))) throw failure('REVISION_CONFLICT', 'conflict');
      if (write && error.name === 'ConditionalCheckFailedException') throw failure('REVISION_CONFLICT', 'conflict');
      if (['AccessDeniedException', 'ResourceNotFoundException', 'ValidationException', 'UnrecognizedClientException', 'ExpiredTokenException'].includes(error.name)) throw failure('UNAVAILABLE');
      throw failure(write ? 'UNCERTAIN_WRITE' : 'UNAVAILABLE', write ? 'uncertain' : 'unavailable');
    } finally { clearTimeout(timer); }
  }
  async function get(kind, id) { const response = await send('GetCommand', { TableName: binding.table_name, Key: key(kind, id), ConsistentRead: true }); return response.Item ? checked(response.Item, kind, id) : null; }
  async function installation() { const found = await get('installation', binding.installation_id); if (!found) throw failure('MISSING_INSTALLATION'); return found; }
  const controlsMatch = i => i.package_revision === binding.package_revision && ['configuration_digest', 'schedule_enabled', 'writes_enabled', 'maintenance'].every(k => i[k] === control[k]);
  function gate(i, expected) {
    nextRevision(expected);
    if (i.revision !== expected) throw failure('REVISION_CONFLICT', 'conflict');
    if (!controlsMatch(i) || !control.schedule_enabled || !control.writes_enabled || control.maintenance) throw failure('CONTROL_MISMATCH', 'conflict');
  }
  function envelope(kind, value, now) { return { kind, schema_version: 1, installation_id: binding.installation_id, domain_id: binding.domain_id, record_id: recordId(kind, value), revision: 0, created_at: now, updated_at: now, extensions: {} }; }
  function condition(record) {
    return { ConditionExpression: '#revision = :revision AND #version = :version AND installation_id = :installation AND domain_id = :domain', ExpressionAttributeNames: { '#revision': 'revision', '#version': 'schema_version' }, ExpressionAttributeValues: { ':revision': record.revision, ':version': 1, ':installation': binding.installation_id, ':domain': binding.domain_id } };
  }
  function update(record, changes) {
    ensureRecord({ ...record, ...changes });
    const out = { TableName: binding.table_name, Key: key(record.kind, record.record_id), ...condition(record) };
    const fields = Object.entries(changes);
    out.UpdateExpression = 'SET ' + fields.map(([field, value], i) => { out.ExpressionAttributeNames['#f' + i] = field; out.ExpressionAttributeValues[':v' + i] = value; return '#f' + i + ' = :v' + i; }).join(', ');
    return { Update: out };
  }
  const absent = record => ({ Put: { TableName: binding.table_name, Item: item(record), ConditionExpression: 'attribute_not_exists(PK)' } });
  function installUpdate(i, now) {
    const action = update(i, { revision: nextRevision(i.revision), updated_at: now });
    for (const field of ['configuration_digest', 'schedule_enabled', 'writes_enabled', 'maintenance', 'installation_generation', 'site', 'table_arn']) {
      const n = '#gate_' + field, v = ':gate_' + field;
      action.Update.ConditionExpression += ' AND ' + n + ' = ' + v;
      action.Update.ExpressionAttributeNames[n] = field; action.Update.ExpressionAttributeValues[v] = i[field];
    }
    return action;
  }
  async function transact(actions) {
    if (actions.length > STATE_LIMITS.actions || Buffer.byteLength(JSON.stringify(actions)) > STATE_LIMITS.transaction_bytes) throw failure('TRANSACTION_LIMIT', 'invalid');
    // Attribute names and values are ASCII or bounded UTF-8; reserve space for Dynamo's
    // type envelopes as well as JSON. The conservative cap is below its 4 MiB limit.
    const wire = sdk.marshall({ actions });
    if (Buffer.byteLength(JSON.stringify(wire)) > STATE_LIMITS.transaction_bytes) throw failure('TRANSACTION_LIMIT', 'invalid');
    await send('TransactWriteCommand', { TransactItems: actions }, true);
  }
  function ensureRecord(record) { const code = validateRecord(record, binding); if (code || Buffer.byteLength(JSON.stringify(sdk.marshall(record))) > STATE_LIMITS.record_bytes) throw failure(code ?? 'TRANSACTION_LIMIT', 'invalid'); return record; }
  function input(value, schema) { if (!valid(value, schema)) throw failure('INVALID_INPUT', 'invalid'); }
  function memberInput(members) { if (new Set(members.map(m => m.ticket_id)).size !== members.length) throw failure('INVALID_INPUT', 'invalid'); for (const m of members) if (m.expected_revision !== null) nextRevision(m.expected_revision); }
  async function bounded(work) { return operation.run({ deadline: Date.now() + 30000 }, async () => { try { return await work(); } catch (e) { return e.stateResult ?? result('unavailable', 'UNAVAILABLE'); } }); }
  async function memberActions(members, now, assignmentMode) {
    if (new Set(members.map(m => m.ticket_id)).size !== members.length) throw failure('INVALID_INPUT', 'invalid');
    const actions = [];
    for (const member of members) {
      streamKey(member.site, member.project_id, member.label);
      if (member.site !== binding.site) throw failure('BINDING_MISMATCH', 'conflict');
      const id = recordId('member', member), existing = await get('member', id);
      if (member.expected_revision === null) {
        if (existing) throw failure('REVISION_CONFLICT', 'conflict');
        const { expected_revision, ...fields } = member;
        actions.push(absent(ensureRecord({ ...envelope('member', member, now), ...fields })));
      } else {
        nextRevision(member.expected_revision);
        if (!existing || existing.revision !== member.expected_revision) throw failure('REVISION_CONFLICT', 'conflict');
        if (['site', 'project_id', 'label', 'epic_id', 'ticket_id'].some(k => existing[k] !== member[k])) throw failure('OWNERSHIP_CONFLICT', 'conflict');
        // Begin checks current assignment expectations; only retainMembers may advance them.
        if (!same(existing.assignment, member.assignment) && assignmentMode !== 'advance') throw failure('REVISION_CONFLICT', 'conflict');
        if (same(existing.assignment, member.assignment)) actions.push({ ConditionCheck: { TableName: binding.table_name, Key: key('member', id), ...condition(existing) } });
        else actions.push(update(existing, { assignment: member.assignment, revision: nextRevision(existing.revision), updated_at: now }));
      }
    }
    return actions;
  }
  const nowField = { now: timestamp };
  return {
    initialize: value => bounded(async () => {
      const freshSchema = obj({ installation_id: { const: binding.installation_id }, domain_id: { const: binding.domain_id }, site: { const: binding.site }, configuration_digest: { const: binding.configuration_digest }, installation_generation: { const: binding.installation_generation }, observed_at: timestamp, new_installation: { const: true }, table_empty: { const: true } });
      input(value, obj({ fresh_installation: freshSchema, ...nowField }));
      if (control.schedule_enabled || control.writes_enabled || control.maintenance) throw failure('FRESH_INSTALLATION_REQUIRED', 'invalid');
      const description = await send('DescribeTableCommand', { TableName: binding.table_name });
      if (description.Table?.TableArn !== binding.table_arn || description.Table?.TableStatus !== 'ACTIVE') throw failure('BINDING_MISMATCH', 'conflict');
      if (await get('installation', binding.installation_id)) throw failure('ALREADY_INITIALIZED', 'conflict');
      const scan = await send('ScanCommand', { TableName: binding.table_name, ConsistentRead: true, Limit: 1 });
      if (!Array.isArray(scan.Items) || scan.Items.length || scan.LastEvaluatedKey) throw failure('FRESH_INSTALLATION_REQUIRED', 'conflict');
      const { schema, ...fields } = binding;
      const record = ensureRecord({ ...envelope('installation', binding, value.now), ...fields, ...control });
      await transact([absent(record)]);
      return result('confirmed', 'OK', { installation: record, controls_match: true });
    }),
    readInventory: value => bounded(async () => {
      const cap = maximum => ({ type: 'integer', minimum: 1, maximum });
      input(value, obj({ limits: obj({ streams: cap(1000), members: cap(1000), pending_attempts: cap(1000), pages: cap(10000), requests: cap(10000), milliseconds: cap(30000) }) }));
      operation.getStore().deadline = Date.now() + value.limits.milliseconds;
      const limits = value.limits, start = Date.now(); let requests = 0, pages = 0;
      const tick = () => { if (++requests > limits.requests || Date.now() - start >= limits.milliseconds) throw failure('INCOMPLETE_INVENTORY'); };
      tick(); const before = await installation();
      const all = {};
      for (const kind of ['stream', 'member']) {
        const records = []; let last;
        do {
          if (++pages > limits.pages) throw failure('INCOMPLETE_INVENTORY'); tick();
          const response = await send('QueryCommand', { TableName: binding.table_name, KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)', ExpressionAttributeValues: { ':pk': PK, ':prefix': prefixes[kind] }, ConsistentRead: true, Limit: Math.min(100, limits[kind + 's'] - records.length + 1), ...(last ? { ExclusiveStartKey: last } : {}) }, false, Math.max(1, limits.milliseconds - (Date.now() - start)));
          if (!Array.isArray(response.Items)) throw failure('MALFORMED_RECORD');
          for (const row of response.Items) { records.push(checked(row, kind, row.record_id)); if (records.length > limits[kind + 's']) throw failure('INCOMPLETE_INVENTORY'); }
          last = response.LastEvaluatedKey;
          if (last && (last.PK !== PK || typeof last.SK !== 'string' || !last.SK.startsWith(prefixes[kind]))) throw failure('MALFORMED_RECORD');
        } while (last);
        if (new Set(records.map(r => r.record_id)).size !== records.length) throw failure('MALFORMED_RECORD');
        all[kind + 's'] = records;
      }
      const attempts = [];
      for (const stream of all.streams) if (stream.pending_attempt_id !== null) {
        if (attempts.length >= limits.pending_attempts) throw failure('INCOMPLETE_INVENTORY'); tick();
        const attempt = await get('attempt', recordId('attempt', { attempt_id: stream.pending_attempt_id }));
        if (!attempt) throw failure('MISSING_ATTEMPT');
        if (attempt.outcome !== 'pending' || streamKey(attempt.site, attempt.project_id, attempt.label) !== streamKey(stream.site, stream.project_id, stream.label)) throw failure('MALFORMED_RECORD');
        attempts.push(attempt);
      }
      tick(); const after = await installation();
      if (before.revision !== after.revision) throw failure('REVISION_CONFLICT', 'conflict');
      if (Date.now() - start >= limits.milliseconds) throw failure('INCOMPLETE_INVENTORY');
      return result('confirmed', 'OK', { installation: after, ...all, pending_attempts: attempts, complete: true, controls_match: controlsMatch(after) });
    }),
    inspect: value => bounded(async () => {
      input(value, obj({ kind: { enum: KINDS }, record_id: { type: 'string', pattern: '^[A-Za-z0-9._:-]{1,255}$' }, cursor: { type: 'string', maxLength: 2048 }, limit: { type: 'integer', minimum: 1, maximum: 100 } }, ['record_id', 'cursor', 'limit']));
      if (value.record_id && value.cursor) throw failure('INVALID_INPUT', 'invalid');
      let last;
      if (value.cursor) {
        try {
          const cursor = JSON.parse(Buffer.from(value.cursor, 'base64url').toString());
          input(cursor, obj({ kind: { const: value.kind }, installation_id: { const: binding.installation_id }, last_record_id: { type: 'string', pattern: '^[A-Za-z0-9._:-]{1,255}$' } }));
          last = key(value.kind, cursor.last_record_id);
        } catch { throw failure('INVALID_INPUT', 'invalid'); }
      }
      const installed = await installation();
      let records, next = null;
      if (value.record_id) {
        const found = await get(value.kind, value.record_id);
        if (!found) throw failure(value.kind === 'attempt' ? 'MISSING_ATTEMPT' : value.kind === 'stream' ? 'MISSING_STREAM' : value.kind === 'installation' ? 'MISSING_INSTALLATION' : 'UNAVAILABLE');
        records = [found];
      } else {
        const page = await send('QueryCommand', { TableName: binding.table_name, KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)', ExpressionAttributeValues: { ':pk': PK, ':prefix': prefixes[value.kind] }, ConsistentRead: true, Limit: value.limit ?? 50, ...(last ? { ExclusiveStartKey: last } : {}) });
        if (!Array.isArray(page.Items)) throw failure('MALFORMED_RECORD');
        records = page.Items.map(row => checked(row, value.kind, row.record_id));
        if (page.LastEvaluatedKey) {
          if (page.LastEvaluatedKey.PK !== PK || typeof page.LastEvaluatedKey.SK !== 'string' || !page.LastEvaluatedKey.SK.startsWith(prefixes[value.kind])) throw failure('MALFORMED_RECORD');
          next = Buffer.from(JSON.stringify({ kind: value.kind, last_record_id: page.LastEvaluatedKey.SK.slice(2), installation_id: binding.installation_id })).toString('base64url');
        }
      }
      return result('confirmed', 'OK', { records, complete: next === null, next_cursor: next, controls_match: controlsMatch(installed) });
    }),
    readAttempt: value => bounded(async () => {
      input(value, obj({ attempt_id: attemptSchema.properties.attempt_id }));
      const id = recordId('attempt', value), first = await get('attempt', id); if (!first) throw failure('MISSING_ATTEMPT');
      const streamId = recordId('stream', first);
      const response = await send('TransactGetCommand', { TransactItems: [['installation', binding.installation_id], ['stream', streamId], ['attempt', id]].map(([kind, id]) => ({ Get: { TableName: binding.table_name, Key: key(kind, id) } })) });
      if (!Array.isArray(response.Responses) || response.Responses.length !== 3) throw failure('MALFORMED_RECORD');
      const records = response.Responses.map((r, i) => { if (!r.Item) throw failure(['MISSING_INSTALLATION', 'MISSING_STREAM', 'MISSING_ATTEMPT'][i]); return checked(r.Item, ['installation', 'stream', 'attempt'][i], [binding.installation_id, streamId, id][i]); });
      const [installed, stream, attempt] = records;
      if (streamKey(first.site, first.project_id, first.label) !== streamKey(attempt.site, attempt.project_id, attempt.label) || streamKey(stream.site, stream.project_id, stream.label) !== streamKey(attempt.site, attempt.project_id, attempt.label) || first.ticket_id !== attempt.ticket_id || attempt.outcome === 'pending' && stream.pending_attempt_id !== attempt.attempt_id || attempt.outcome !== 'pending' && stream.pending_attempt_id === attempt.attempt_id) throw failure('REVISION_CONFLICT', 'conflict');
      return result('confirmed', 'OK', { installation: installed, stream, attempt, controls_match: controlsMatch(installed) });
    }),
    retainMembers: value => bounded(async () => {
      input(value, obj({ expected_installation_revision: revision, members: { ...list(memberSchema, 99), minItems: 1 }, ...nowField }));
      memberInput(value.members);
      nextRevision(value.expected_installation_revision);
      const installed = await installation(); gate(installed, value.expected_installation_revision);
      const actions = await memberActions(value.members, value.now, 'advance');
      await transact([installUpdate(installed, value.now), ...actions]);
      return result('confirmed', 'OK', { installation_revision: nextRevision(installed.revision) });
    }),
    begin: value => bounded(async () => {
      input(value, obj({ expected_installation_revision: revision, stream: streamSchema, expected_stream_revision: nullable(revision), attempt: attemptSchema, required_members: list(memberSchema, 97), ...nowField }));
      memberInput(value.required_members);
      nextRevision(value.expected_installation_revision); if (value.expected_stream_revision !== null) nextRevision(value.expected_stream_revision);
      const streamId = recordId('stream', value.stream);
      if (value.stream.site !== binding.site || value.attempt.configuration_digest !== control.configuration_digest || value.required_members.some(m => streamKey(m.site, m.project_id, m.label) !== streamKey(value.stream.site, value.stream.project_id, value.stream.label))) throw failure('BINDING_MISMATCH', 'conflict');
      if (!value.required_members.some(m => m.ticket_id === value.attempt.ticket_id && m.epic_id === value.attempt.epic_id)) throw failure('INVALID_INPUT', 'invalid');
      const attempt = ensureRecord({ ...envelope('attempt', value.attempt, value.now), ...value.stream, ...value.attempt, outcome: 'pending', evidence: null });
      const stream = ensureRecord({ ...envelope('stream', value.stream, value.now), ...value.stream, pending_attempt_id: attempt.attempt_id });
      const installed = await installation(); gate(installed, value.expected_installation_revision);
      const existing = await get('stream', streamId);
      if ((existing?.revision ?? null) !== value.expected_stream_revision) throw failure('REVISION_CONFLICT', 'conflict');
      if (existing && streamKey(existing.site, existing.project_id, existing.label) !== streamKey(value.stream.site, value.stream.project_id, value.stream.label)) throw failure('OWNERSHIP_CONFLICT', 'conflict');
      if (existing?.pending_attempt_id) throw failure('PENDING_ATTEMPT', 'conflict');
      const actions = await memberActions(value.required_members, value.now, 'check');
      const streamAction = existing ? update(existing, { revision: nextRevision(existing.revision), pending_attempt_id: attempt.attempt_id, updated_at: value.now }) : absent(stream);
      if (existing) { streamAction.Update.ConditionExpression += ' AND pending_attempt_id = :pending'; streamAction.Update.ExpressionAttributeValues[':pending'] = null; }
      await transact([installUpdate(installed, value.now), streamAction, absent(attempt), ...actions]);
      return result('confirmed', 'OK', { installation_revision: nextRevision(installed.revision), stream_revision: existing ? nextRevision(existing.revision) : 0, attempt_revision: 0, attempt_id: attempt.attempt_id });
    }),
    finalize: value => bounded(async () => {
      input(value, obj({ expected_installation_revision: revision, stream: streamSchema, expected_stream_revision: revision, attempt_id: attemptSchema.properties.attempt_id, expected_attempt_revision: revision, outcome: { enum: ['applied', 'not_applied'] }, evidence: evidenceSchema, ...nowField }));
      for (const k of ['expected_installation_revision', 'expected_stream_revision', 'expected_attempt_revision']) nextRevision(value[k]);
      if (value.evidence.disposition !== 'confirmed_' + value.outcome) throw failure('INVALID_INPUT', 'invalid');
      const installed = await installation(); gate(installed, value.expected_installation_revision);
      const stream = await get('stream', recordId('stream', value.stream)); if (!stream) throw failure('MISSING_STREAM');
      const attempt = await get('attempt', recordId('attempt', value)); if (!attempt) throw failure('MISSING_ATTEMPT');
      if (streamKey(value.stream.site, value.stream.project_id, value.stream.label) !== streamKey(stream.site, stream.project_id, stream.label) || streamKey(attempt.site, attempt.project_id, attempt.label) !== streamKey(stream.site, stream.project_id, stream.label) || stream.revision !== value.expected_stream_revision || attempt.revision !== value.expected_attempt_revision || stream.pending_attempt_id !== value.attempt_id || attempt.outcome !== 'pending') throw failure('REVISION_CONFLICT', 'conflict');
      const streamAction = update(stream, { revision: nextRevision(stream.revision), pending_attempt_id: null, updated_at: value.now });
      streamAction.Update.ConditionExpression += ' AND pending_attempt_id = :pending'; streamAction.Update.ExpressionAttributeValues[':pending'] = value.attempt_id;
      const attemptAction = update(attempt, { revision: nextRevision(attempt.revision), outcome: value.outcome, evidence: value.evidence, updated_at: value.now });
      attemptAction.Update.ConditionExpression += ' AND outcome = :outcome'; attemptAction.Update.ExpressionAttributeValues[':outcome'] = 'pending';
      await transact([installUpdate(installed, value.now), streamAction, attemptAction]);
      return result('confirmed', 'OK', { installation_revision: nextRevision(installed.revision), stream_revision: nextRevision(stream.revision), attempt_revision: nextRevision(attempt.revision), attempt_id: value.attempt_id });
    }),
    close() { if (ownedClient) client.destroy(); }
  };
}
