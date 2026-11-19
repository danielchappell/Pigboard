import canonicalize from 'canonicalize';
import { createRequire } from 'node:module';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sep } from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { streamKey } from '../config/projects.mjs';
import { STATE_LIMITS, KINDS, valid, validBinding, validateRecord, recordId, result, failure, nextRevision, memberSchema, streamSchema, attemptSchema, evidenceSchema, schemas, retainPublicationSchema, prepareCaptureSchema, recordResponseSchema, nativePublicationSchema, prepareTransitionEvidence, transitionProof, providerRequestId } from '../state/contract.mjs';
import { closedDecisionRequest, completedStop, operatorActorId, operatorDecisionSchema, operatorOriginSchema, operatorPrincipal, operatorRequestDigest, originEvidenceSchema, reconciliationRequestSchema, validPrincipal } from '../state/contract.mjs';

import { lifecycleActionSchema, lifecycleOperationSchema, lifecycleSchema, proofEqual } from '../state/contract.mjs';
import { currentSupersededUpdate, lifecycleTransition, stopGeneration } from '../manager/lifecycle.mjs';

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
export function createDynamoState(options) {
  return bindDynamoState(options).state;
}

// Private operator composition. No mutations or public inspection kind for the companion.
export function createDynamoInspectionState(options) {
  if (typeof options?.client?.send !== 'function') throw failure('SETUP');
  const { state, readNativePublication } = bindDynamoState(options);
  return { readAttempt: state.readAttempt, readInventory: state.readInventory, readNativePublication, close: state.close };
}

// Internal operator composition supplied with a verified host session and AWS birth observation.
export function createDynamoOperatorState(options, purpose) {
  if (typeof options?.client?.send !== 'function' || !['initialize', 'inspect', 'reconcile', 'lifecycle'].includes(purpose)) throw failure('SETUP');
  if (!validBinding(options.binding, options.control)) throw failure('INVALID_INPUT', 'invalid');
  const actor = operatorPrincipal(options.identity, options.binding);
  const { originEvidence, binding } = options;
  const scope = ['installation_id', 'domain_id', 'site', 'stack_id', 'installation_generation', 'table_arn'];
  if (!valid(originEvidence, originEvidenceSchema) || scope.some(field => originEvidence[field] !== binding[field])) throw failure('ORIGIN_UNVERIFIED');
  const { initialize, readDecision, reconcileAttempt, lifecycle } = bindDynamoState(options, { actor, originEvidence: clone(originEvidence), lifecycle: options.lifecycle === true });
  if (purpose === 'lifecycle') return lifecycle;
  if (purpose === 'initialize') return { initialize };
  return purpose === 'reconcile' ? { readDecision, reconcileAttempt } : { readDecision };
}

export function createDynamoLifecycleState(options) {
  return createDynamoOperatorState(options, 'lifecycle');
}

export function validLifecycleChangeSetId(value, stackId, operationId) {
  if (typeof value !== 'string' || typeof stackId !== 'string' || !valid(operationId, attemptSchema.properties.attempt_id)) return false;
  const base = stackId.split(':stack/')[0] + ':changeSet/pigboard-lifecycle-' + operationId + '/';
  return value.startsWith(base) && /^[A-Za-z0-9-]{1,255}$/.test(value.slice(base.length));
}
const changeSetActionSchema = obj({
  type: { const: 'record-change-set' }, expected: obj({ installation: { type: 'object' }, lifecycle: lifecycleSchema }),
  id: attemptSchema.properties.attempt_id, now: timestamp, change_set_id: { type: 'string', maxLength: 2048 }
});

function bindDynamoState({ binding, control, client } = {}, operator = null) {
  if (!validBinding(binding, control)) throw failure('INVALID_INPUT', 'invalid');
  binding = clone(binding); control = clone(control);
  const sdk = loadSDK();
  const ownedClient = !client;
  client ??= createDynamoClient(binding);
  const PK = 'installation#' + binding.installation_id;
  const decisionPK = 'operator-decision#' + binding.installation_id;
  const lifecyclePK = 'operator-lifecycle#' + binding.installation_id;
  const lifecycleKey = { PK: lifecyclePK, SK: 'CONTROL' };
  const lifecycleOperationKey = id => ({ PK: lifecyclePK, SK: 'O#' + id });
  const originKey = { PK: decisionPK, SK: 'ORIGIN' };
  const decisionKey = id => ({ PK: decisionPK, SK: 'A#' + id });
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
  const absentItem = Item => ({ Put: { TableName: binding.table_name, Item, ConditionExpression: 'attribute_not_exists(PK)' } });
  const absent = record => absentItem(item(record));
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
  function memberInput(members) { if (new Set(members.map(m => m.ticket_id)).size !== members.length) throw failure('INVALID_INPUT', 'invalid'); for (const m of members) { if (m.assignment !== null && m.assignment.ticket_id !== m.ticket_id) throw failure('INVALID_INPUT', 'invalid'); if (m.expected_revision !== null) nextRevision(m.expected_revision); } }
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
  async function proofRecords(value) {
    for (const k of ['expected_installation_revision', 'expected_stream_revision', 'expected_attempt_revision']) nextRevision(value[k]);
    const attemptId = recordId('attempt', value), first = await get('attempt', attemptId);
    if (!first) throw failure('MISSING_ATTEMPT');
    const streamId = recordId('stream', first);
    const response = await send('TransactGetCommand', { TransactItems: [['installation', binding.installation_id], ['stream', streamId], ['attempt', attemptId]].map(([kind, id]) => ({ Get: { TableName: binding.table_name, Key: key(kind, id) } })) });
    if (!Array.isArray(response.Responses) || response.Responses.length !== 3) throw failure('MALFORMED_RECORD');
    const [installed, stream, attempt] = response.Responses.map((r, i) => {
      if (!r.Item) throw failure(['MISSING_INSTALLATION', 'MISSING_STREAM', 'MISSING_ATTEMPT'][i]);
      return checked(r.Item, ['installation', 'stream', 'attempt'][i], [binding.installation_id, streamId, attemptId][i]);
    });
    gate(installed, value.expected_installation_revision);
    if (stream.revision !== value.expected_stream_revision || attempt.revision !== value.expected_attempt_revision || attempt.outcome !== 'pending' || stream.pending_attempt_id !== value.attempt_id || streamKey(stream.site, stream.project_id, stream.label) !== streamKey(attempt.site, attempt.project_id, attempt.label) || streamKey(first.site, first.project_id, first.label) !== streamKey(attempt.site, attempt.project_id, attempt.label) || first.ticket_id !== attempt.ticket_id) throw failure('REVISION_CONFLICT', 'conflict');
    return { installation: installed, stream, attempt };
  }
  async function saveProof(records, changes, now, nativePublication) {
    const { installation: installed, stream, attempt } = records;
    const nextAttempt = ensureRecord({ ...attempt, ...changes, revision: nextRevision(attempt.revision), updated_at: now });
    const streamCheck = { TableName: binding.table_name, Key: key('stream', stream.record_id), ...condition(stream) };
    streamCheck.ConditionExpression += ' AND pending_attempt_id = :pending'; streamCheck.ExpressionAttributeValues[':pending'] = attempt.attempt_id;
    const actions = [
      installUpdate(installed, now),
      update(attempt, { ...changes, revision: nextAttempt.revision, updated_at: now }),
      { ConditionCheck: streamCheck }
    ];
    if (nativePublication) {
      const companion = { PK, SK: 'N#' + attempt.attempt_id, ...nativePublication };
      if (Buffer.byteLength(JSON.stringify(sdk.marshall(companion))) > STATE_LIMITS.record_bytes) throw failure('TRANSACTION_LIMIT', 'invalid');
      actions.push(absentItem(companion));
    }
    await transact(actions);
    return result('confirmed', 'OK', { installation: ensureRecord({ ...installed, revision: nextRevision(installed.revision), updated_at: now }), stream, attempt: nextAttempt });
  }
  function existingProof(attempt) {
    const proof = transitionProof(attempt);
    if (proof.state === 'unsupported') throw failure('UNSUPPORTED_PROOF');
    return proof;
  }
  function extendGuard(action, field, value) {
    const name = '#guard_' + field, parameter = ':guard_' + field;
    action.Update.ConditionExpression += ' AND ' + name + ' = ' + parameter;
    action.Update.ExpressionAttributeNames[name] = field;
    action.Update.ExpressionAttributeValues[parameter] = value;
  }
  function checkedProtected(stored, expected, schema, code) {
    if (!stored || stored.PK !== expected.PK || stored.SK !== expected.SK) throw failure(code);
    const { PK: ignoredPK, SK: ignoredSK, ...record } = stored;
    if (!valid(record, schema) || Buffer.byteLength(JSON.stringify(sdk.marshall(stored))) > STATE_LIMITS.record_bytes
      || !validPrincipal(record.actor, binding)) throw failure(code);
    try { operatorActorId(record.actor); } catch { throw failure(code); }
    return record;
  }
  function checkedOrigin(item) {
    const { schema, actor, package_revision, ...evidence } = checkedProtected(item, originKey, operatorOriginSchema, 'ORIGIN_UNVERIFIED');
    if (!same(evidence, operator.originEvidence)) throw failure('ORIGIN_UNVERIFIED');
  }
  async function protectedItems(keys) {
    const response = await send('TransactGetCommand', { TransactItems: keys.map(Key => ({ Get: { TableName: binding.table_name, Key } })) });
    if (!Array.isArray(response?.Responses) || response.Responses.length !== keys.length
      || [...response.Responses].some(slot => !slot || Object.keys(slot).length !== 1 || !slot.Item)) throw failure('OPERATOR_PROVENANCE_UNAVAILABLE');
    return response.Responses.map(slot => slot.Item);
  }
  async function decisionPresent(attemptId) {
    const expected = decisionKey(attemptId);
    const response = await send('GetCommand', { TableName: binding.table_name, Key: expected, ConsistentRead: true });
    if (!response || typeof response !== 'object' || Array.isArray(response)
      || Object.keys(response).some(field => field !== '$metadata' && field !== 'Item')) throw failure('OPERATOR_PROVENANCE_UNAVAILABLE');
    if (response.Item === undefined) return false;
    checkedProtected(response.Item, expected, operatorDecisionSchema, 'OPERATOR_PROVENANCE_UNAVAILABLE');
    return true;
  }
  function checkedDecision(item, attempt, attemptId) {
    const code = 'OPERATOR_PROVENANCE_UNAVAILABLE';
    const decision = checkedProtected(item, decisionKey(attemptId), operatorDecisionSchema, code);
    const proof = transitionProof(attempt);
    const expected = decision.disposition === 'confirmed_applied' ? 'applied' : 'not_applied';
    if (decision.installation_id !== binding.installation_id || decision.installation_generation !== binding.installation_generation
      || decision.attempt_id !== attemptId || decision.stream_id !== recordId('stream', attempt)
      || decision.attempt_revision !== attempt.revision || decision.expected_attempt_revision + 1 !== attempt.revision
      || !['expected_installation_revision', 'expected_stream_revision', 'expected_attempt_revision'].every(field => decision[field] < Number.MAX_SAFE_INTEGER)
      || decision.outcome !== expected || decision.outcome !== attempt.outcome
      || decision.recorded_at !== attempt.updated_at || proof.state !== 'response-captured'
      || proof.http_status !== (expected === 'applied' ? 204 : 409) || proof.request_digest !== decision.request_digest
      || attempt.extensions.pb_capture_publication_digest !== decision.publication_digest
      || attempt.evidence?.disposition !== decision.disposition || attempt.evidence?.actor_id !== operatorActorId(decision.actor)
      || !same(attempt.evidence?.references, attempt.publication)
      || decision.operator_request_digest !== operatorRequestDigest(binding, closedDecisionRequest(decision))) throw failure(code);
    return decision;
  }
  const readDecision = value => bounded(async () => {
    input(value, obj({ attempt_id: attemptSchema.properties.attempt_id }));
    const id = recordId('attempt', value), attemptKey = key('attempt', id), protectedKey = decisionKey(value.attempt_id);
    if (!await decisionPresent(value.attempt_id)) {
      const [origin, stored] = await protectedItems([originKey, attemptKey]);
      checkedOrigin(origin);
      const attempt = checked(stored, 'attempt', id);
      if (attempt.outcome === 'pending' || !await decisionPresent(value.attempt_id)) {
        return result('confirmed', 'OK', { attempt, operator_decision: null });
      }
    }
    const [origin, decision, stored] = await protectedItems([originKey, protectedKey, attemptKey]);
    checkedOrigin(origin);
    const attempt = checked(stored, 'attempt', id);
    return result('confirmed', 'OK', { attempt, operator_decision: checkedDecision(decision, attempt, value.attempt_id) });
  });
  const reconcileAttempt = ({ request, snapshot, stop, now }) => bounded(async () => {
    input(request, reconciliationRequestSchema);
    input(now, timestamp);
    const { installation: installed, stream, attempt } = snapshot;
    for (const record of [installed, stream, attempt]) ensureRecord(record);
    if (installed.kind !== 'installation' || stream.kind !== 'stream' || attempt.kind !== 'attempt'
      || installed.revision !== request.expected_installation_revision || stream.revision !== request.expected_stream_revision
      || attempt.revision !== request.expected_attempt_revision || attempt.attempt_id !== request.attempt_id
      || stream.pending_attempt_id !== request.attempt_id || attempt.outcome !== 'pending' || attempt.evidence !== null
      || recordId('stream', attempt) !== stream.record_id) throw failure('REVISION_CONFLICT', 'conflict');
    if (!controlsMatch(installed)) throw failure('CONTROL_MISMATCH', 'conflict');
    if (!same(completedStop(installed, binding), stop)) throw failure('DRAIN_INCOMPLETE', 'conflict');
    const proof = transitionProof(attempt);
    const outcome = request.disposition === 'confirmed_applied' ? 'applied' : 'not_applied';
    if (proof.state !== 'response-captured' || proof.http_status !== (outcome === 'applied' ? 204 : 409)) throw failure('CAPTURE_UNSUPPORTED', 'conflict');
    const evidence = { references: attempt.publication, disposition: request.disposition, actor_id: operatorActorId(operator.actor) };
    if (!valid(evidence, evidenceSchema)) throw failure('PUBLICATION_MISMATCH', 'conflict');
    const updated = record => ({ revision: nextRevision(record.revision), updated_at: now });
    const streamChanges = { ...updated(stream), pending_attempt_id: null };
    const attemptChanges = { ...updated(attempt), outcome, evidence };
    const decision = {
      ...request, schema: 'pigboard-operator-decision/v1', installation_id: binding.installation_id,
      installation_generation: binding.installation_generation, stream_id: stream.record_id, stop_id: stop.pb_stop_id,
      request_digest: proof.request_digest, publication_digest: attempt.extensions.pb_capture_publication_digest,
      operator_request_digest: operatorRequestDigest(binding, request), attempt_revision: attemptChanges.revision,
      outcome, actor: operator.actor, recorded_at: now
    };
    input(decision, operatorDecisionSchema);
    const decisionItem = { ...decisionKey(attempt.attempt_id), ...decision };
    if (Buffer.byteLength(JSON.stringify(sdk.marshall(decisionItem))) > STATE_LIMITS.record_bytes) throw failure('TRANSACTION_LIMIT', 'invalid');
    const installationAction = installUpdate(installed, now);
    extendGuard(installationAction, 'extensions', installed.extensions);
    extendGuard(installationAction, 'package_revision', installed.package_revision);
    const streamAction = update(stream, streamChanges);
    extendGuard(streamAction, 'pending_attempt_id', attempt.attempt_id);
    const attemptAction = update(attempt, attemptChanges);
    for (const field of ['outcome', 'evidence', 'extensions', 'publication']) extendGuard(attemptAction, field, attempt[field]);
    await transact([installationAction, streamAction, attemptAction, absentItem(decisionItem)]);
    return result('confirmed', 'OPERATOR_SETTLED', {
      installation: { ...installed, ...updated(installed) }, stream: { ...stream, ...streamChanges },
      attempt: { ...attempt, ...attemptChanges }, operator_decision: decision, controls_match: true
    });
  });
  const readNativePublication = value => bounded(async () => {
    input(value, obj({ attempt_id: attemptSchema.properties.attempt_id }));
    const SK = 'N#' + value.attempt_id;
    const { Item } = await send('GetCommand', { TableName: binding.table_name, Key: { PK, SK }, ConsistentRead: true });
    if (!Item) return result('confirmed', 'OK', { publication: null });
    const { PK: actualPK, SK: actualSK, ...publication } = Item;
    if (actualPK !== PK || actualSK !== SK || !valid(publication, nativePublicationSchema)
      || publication.installation_id !== binding.installation_id || publication.site !== binding.site
      || publication.attempt_id !== value.attempt_id
      || Buffer.byteLength(JSON.stringify(sdk.marshall(Item))) > STATE_LIMITS.record_bytes) {
      throw failure('MALFORMED_RECORD');
    }
    return result('confirmed', 'OK', { publication });
  });

  const initialize = value => bounded(async () => {
    const freshSchema = obj({ installation_id: { const: binding.installation_id }, domain_id: { const: binding.domain_id }, site: { const: binding.site }, configuration_digest: { const: binding.configuration_digest }, installation_generation: { const: binding.installation_generation }, observed_at: timestamp, new_installation: { const: true }, table_empty: { const: true } });
    input(value, obj({ fresh_installation: freshSchema, ...nowField }));
    if (control.schedule_enabled || control.writes_enabled || control.maintenance) throw failure('FRESH_INSTALLATION_REQUIRED', 'invalid');
    const { Table: table } = await send('DescribeTableCommand', { TableName: binding.table_name });
    if (table?.TableArn !== binding.table_arn || table?.TableStatus !== 'ACTIVE') throw failure('BINDING_MISMATCH', 'conflict');
    if (operator?.lifecycle) await physicalLifecycleTable();
    if (operator && (table.TableId !== operator.originEvidence.table_id
      || !(table.CreationDateTime instanceof Date) || table.CreationDateTime.valueOf() !== Date.parse(operator.originEvidence.table_created_at))) throw failure('ORIGIN_UNVERIFIED');
    if (await get('installation', binding.installation_id)) throw failure('ALREADY_INITIALIZED', 'conflict');
    const scan = await send('ScanCommand', { TableName: binding.table_name, ConsistentRead: true, Limit: 1 });
    if (!Array.isArray(scan.Items) || scan.Items.length || scan.LastEvaluatedKey) throw failure('FRESH_INSTALLATION_REQUIRED', 'conflict');
    const { schema, ...fields } = binding;
    const record = ensureRecord({ ...envelope('installation', binding, value.now), ...fields, ...control });
    const actions = [absent(record)];
    if (operator) {
      const origin = { ...operator.originEvidence, schema: 'pigboard-operator-origin/v1', package_revision: binding.package_revision, actor: operator.actor };
      input(origin, operatorOriginSchema);
      actions.push(absentItem({ ...originKey, ...origin }));
      if (operator.lifecycle) actions.push(absentItem({ ...lifecycleKey, schema: 'pigboard-lifecycle/v1',
        origin: operator.originEvidence, actor: operator.actor, revision: 0, fence_id: null, owner: null,
        generation: null, last_operation_id: null, bootstrapped: false, recovery: [] }));

    }
    await transact(actions);
    return result('confirmed', 'OK', { installation: record, controls_match: true });
  });

  async function physicalLifecycleTable() {
    const { Table: table } = await send('DescribeTableCommand', { TableName: binding.table_name });
    const origin = operator.originEvidence;
    if (table?.TableName !== binding.table_name || table.TableStatus !== 'ACTIVE' || table.TableArn !== binding.table_arn ||
        table.TableId !== origin.table_id || Number(new Date(table.CreationDateTime)) !== Date.parse(origin.table_created_at) ||
        !same(table.KeySchema, [{ AttributeName: 'PK', KeyType: 'HASH' }, { AttributeName: 'SK', KeyType: 'RANGE' }]) ||
        !Array.isArray(table.AttributeDefinitions) || table.AttributeDefinitions.length !== 2 ||
        !['PK', 'SK'].every(AttributeName => table.AttributeDefinitions.some(attribute => attribute.AttributeName === AttributeName && attribute.AttributeType === 'S'))) {
      throw failure('ORIGIN_UNVERIFIED');
    }
  }
  async function lifecycleSnapshot() {
    await physicalLifecycleTable();
    const [origin, stored, record] = await protectedItems([originKey, lifecycleKey, key('installation', binding.installation_id)]);
    checkedOrigin(origin);
    const lifecycle = checkedProtected(stored, lifecycleKey, lifecycleSchema, 'OPERATOR_PROVENANCE_UNAVAILABLE');
    if (!same(lifecycle.origin, operator.originEvidence) || !same(lifecycle.actor, origin.actor) ||
        lifecycle.owner && !validPrincipal(lifecycle.owner.actor, binding)) throw failure('ORIGIN_UNVERIFIED');
    await physicalLifecycleTable();
    return { installation: checked(record, 'installation', binding.installation_id), lifecycle };
  }
  async function protectedOperation(id) {
    input(id, attemptSchema.properties.attempt_id);
    const expected = lifecycleOperationKey(id);
    const { Item } = await send('GetCommand', { TableName: binding.table_name, Key: expected, ConsistentRead: true });
    if (!Item) return null;
    const stored = checkedProtected(Item, expected, lifecycleOperationSchema, 'OPERATOR_PROVENANCE_UNAVAILABLE');
    if (stored.owner.id !== id || !same(stored.origin, operator.originEvidence) ||
        !validPrincipal(stored.owner.actor, binding)) throw failure('ORIGIN_UNVERIFIED');
    return stored;
  }
  async function collectLifecycleInventory(before) {
    const seen = new Set();
    let count = 0;
    const records = [], publications = [], decisions = [];
    for (const partition of [PK, decisionPK]) {
      let last, pages = 0;
      do {
        if (++pages > 20 || count >= STATE_LIMITS.records) throw failure('INCOMPLETE_INVENTORY');
        const response = await send('QueryCommand', { TableName: binding.table_name, KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: { ':pk': partition }, ConsistentRead: true, Limit: 100,
          ...(last ? { ExclusiveStartKey: last } : {}) }).catch(() => { throw failure('UNAVAILABLE'); });
        if (!Array.isArray(response?.Items) || response.Items.length > 100) throw failure('UNAVAILABLE');
        for (const row of response.Items) {
          if (row?.PK !== partition || typeof row.SK !== 'string') throw failure('UNAVAILABLE');
          const id = row.SK.slice(2), index = partition + '/' + row.SK;
          if (seen.has(index)) throw failure('UNAVAILABLE');
          seen.add(index);
          count++;
          if (count > STATE_LIMITS.records) throw failure('INCOMPLETE_INVENTORY');
          if (partition === decisionPK) {
            if (row.SK === originKey.SK) checkedOrigin(row);
            else if (row.SK.startsWith('A#')) decisions.push(row);
            else throw failure('MALFORMED_RECORD');
          } else if (row.SK.startsWith('N#')) {
            const { PK: pk, SK: sk, ...publication } = row;
            if (!valid(publication, nativePublicationSchema) || publication.attempt_id !== id ||
                publication.installation_id !== binding.installation_id || publication.site !== binding.site ||
                Buffer.byteLength(JSON.stringify(sdk.marshall(row))) > STATE_LIMITS.record_bytes) throw failure('MALFORMED_RECORD');
            publications.push(publication);
          } else {
            const kind = Object.keys(prefixes).find(kind => row.SK.startsWith(prefixes[kind]));
            if (!kind) throw failure('MALFORMED_RECORD');
            records.push(checked(row, kind, id));
          }
        }
        const previous = last;
        last = response.LastEvaluatedKey;
        if (last && (last.PK !== partition || typeof last.SK !== 'string' || previous?.SK === last.SK)) throw failure('UNAVAILABLE');
      } while (last);
    }
    const installation = records.find(row => row.kind === 'installation');
    if (!same(installation, before.installation) || !seen.has(decisionPK + '/' + originKey.SK)) throw failure('UNAVAILABLE');
    const attempts = new Map(records.filter(row => row.kind === 'attempt').map(row => [row.attempt_id, row]));
    const streams = new Map(records.filter(row => row.kind === 'stream').map(row => [row.record_id, row]));
    const pending_attempts = [...attempts.values()].filter(row => row.outcome === 'pending');
    if (pending_attempts.some(row => streams.get(recordId('stream', row))?.pending_attempt_id !== row.attempt_id) ||
        [...streams.values()].some(row => row.pending_attempt_id !== null &&
          (attempts.get(row.pending_attempt_id)?.outcome !== 'pending' || recordId('stream', attempts.get(row.pending_attempt_id)) !== row.record_id))) throw failure('MALFORMED_RECORD');
    for (const attempt of attempts.values()) {
      const proof = transitionProof(attempt);
      const publication = publications.find(row => row.attempt_id === attempt.attempt_id);
      if (proof.state === 'unsupported' || Boolean(publication) !== (proof.state === 'prepared' || proof.state === 'response-captured') ||
          publication && (publication.request_digest !== proof.request_digest ||
            publication.publication_digest !== attempt.extensions.pb_capture_publication_digest)) throw failure('UNSUPPORTED_PROOF');
    }
    if (publications.some(row => !attempts.has(row.attempt_id))) throw failure('MALFORMED_RECORD');
    const verifiedDecisions = decisions.map(row => {
      const id = row.SK.slice(2), attempt = attempts.get(id);
      if (!attempt) throw failure('MALFORMED_RECORD');
      return checkedDecision(row, attempt, id);
    });
    return { records, publications, decisions: verifiedDecisions, pending_attempts };
  }

  const lifecycle = {
    read: () => bounded(async () => result('confirmed', 'OK', await lifecycleSnapshot())),
    readOperation: id => bounded(async () => {
      const snapshot = await lifecycleSnapshot();
      const stored = await protectedOperation(id);
      return result('confirmed', 'OK', stored ?? (snapshot.lifecycle.owner?.id === id ? snapshot.lifecycle.owner : null));
    }),
    readGeneration: scope => bounded(async () => {
      const { installation: i, lifecycle } = await lifecycleSnapshot();
      const stop = completedStop(i, binding);
      const expected = stopGeneration(lifecycle.origin, stop);
      if (lifecycle.owner || !proofEqual(lifecycle.generation, expected) ||
          !proofEqual(scope, Object.fromEntries(['installation_id', 'domain_id', 'site', 'stack_id', 'table_arn', 'table_id', 'installation_generation'].map(key => [key, expected[key]])))) {
        throw failure('DRAIN_INCOMPLETE', 'conflict');
      }
      return result('confirmed', 'OK', lifecycle.generation);
    }),
    mutate: action => bounded(async () => {
      const { change_set_id, ...transition } = action ?? {};
      const recording = action?.type === 'record-change-set';
      const executing = action?.type === 'claim' && action.effect === 'execute-change-set';
      input(recording ? action : transition, recording ? changeSetActionSchema : lifecycleActionSchema);
      if (!recording && !executing && change_set_id !== undefined) throw failure('INVALID_INPUT', 'invalid');
      const before = await lifecycleSnapshot();
      if (!same(before, action.expected)) throw failure('REVISION_CONFLICT', 'conflict');
      if (['remove', 'removal'].includes(action.kind) || action.stop_id) {
        const generation = before.lifecycle.generation;
        if (!generation || generation.stop_id !== action.stop_id ||
            !proofEqual(generation, stopGeneration(before.lifecycle.origin, completedStop(before.installation, binding)))) {
          throw failure('DRAIN_INCOMPLETE', 'conflict');
        }
      }
      if (action.superseded_id) {
        const superseded = await protectedOperation(action.superseded_id);
        const maintenance = action.type === 'reserve' && ['maintenance-only', 'maintenance_only'].includes(action.kind);
        const stop = action.type === 'emergency' && action.kind === 'stop';
        if ((!maintenance && !stop) || !currentSupersededUpdate(superseded, before) ||
            !validLifecycleChangeSetId(superseded.owner.details.change_set_id, binding.stack_id, superseded.owner.id) ||
            (maintenance && (!same(action.details.held, superseded.owner.details.source) || !same(action.details.source, superseded.owner.details.target))) ||
            (stop && action.details.source_manifest !== superseded.owner.details.target.manifest_digest)) {
          throw failure('REVISION_CONFLICT', 'conflict');
        }
      }
      if ((action.type === 'reserve' || action.type === 'emergency') &&
          (action.id === before.lifecycle.fence_id || await protectedOperation(action.id))) throw failure('REVISION_CONFLICT', 'conflict');
      if ((action.kind === 'bootstrap' && before.lifecycle.bootstrapped) ||
          (['configure', 'upgrade', 'remove', 'removal', 'maintenance-only', 'maintenance_only'].includes(action.kind) && !before.lifecycle.bootstrapped) ||
          (['maintenance-only', 'maintenance_only'].includes(action.kind) && !action.superseded_id)) {
        throw failure('REVISION_CONFLICT', 'conflict');
      }
      const owner = before.lifecycle.owner;
      if (action.type === 'record-enablement' && (!same(owner?.actor, operator.actor) ||
          !validLifecycleChangeSetId(owner?.details.change_set_id, binding.stack_id, action.id))) {
        throw failure('REVISION_CONFLICT', 'conflict');
      }
      if (action.type === 'finish' && action.terminal.bootstrap_acknowledged &&
          !validLifecycleChangeSetId(owner?.details.change_set_id, binding.stack_id, action.id)) {
        throw failure('REVISION_CONFLICT', 'conflict');
      }
      if (recording || executing) {
        if (!owner || owner.id !== action.id || owner.fence_id !== before.lifecycle.fence_id ||
            !same(owner.actor, operator.actor) ||
            !validLifecycleChangeSetId(change_set_id, binding.stack_id, action.id)) {
          throw failure('REVISION_CONFLICT', 'conflict');
        }
        if (recording && (owner.details.change_set_id !== undefined || owner.phase !== 'settled' ||
            owner.effects.find(effect => effect.name === 'create-change-set')?.state !== 'settled' ||
            owner.effects.find(effect => effect.state !== 'settled')?.name !== 'execute-change-set')) {
          throw failure('REVISION_CONFLICT', 'conflict');
        }
        if (executing && owner.details.change_set_id !== change_set_id) throw failure('REVISION_CONFLICT', 'conflict');
      }
      if ((action.type === 'reserve' || action.type === 'emergency') && action.details.change_set_id !== undefined) {
        throw failure('INVALID_INPUT', 'invalid');
      }
      const next = lifecycleTransition(before, transition, operator.actor, ensureRecord);
      if (recording) next.lifecycle.owner = { ...owner, details: { ...owner.details, change_set_id } };
      input(next.lifecycle, lifecycleSchema);
      const guard = update(before.installation, next.changes);
      for (const field of ['table_arn', 'stack_id', 'installation_generation', 'site', 'configuration_digest', 'package_revision', 'schedule_enabled', 'writes_enabled', 'maintenance', 'extensions']) {
        extendGuard(guard, field, before.installation[field]);
      }
      const actions = [guard, { Put: { TableName: binding.table_name, Item: { ...lifecycleKey, ...next.lifecycle },
        ConditionExpression: '#revision = :revision AND #origin = :origin AND #owner = :owner AND fence_id = :fence',
        ExpressionAttributeNames: { '#revision': 'revision', '#origin': 'origin', '#owner': 'owner' },
        ExpressionAttributeValues: { ':revision': before.lifecycle.revision, ':origin': before.lifecycle.origin,
          ':owner': before.lifecycle.owner, ':fence': before.lifecycle.fence_id } } }];
      if (next.operation) {
        input(next.operation, lifecycleOperationSchema);
        actions.push(absentItem({ ...lifecycleOperationKey(action.id), ...next.operation }));
      }
      for (const item of [next.lifecycle, ...(next.operation ? [next.operation] : [])]) {
        if (Buffer.byteLength(JSON.stringify(sdk.marshall(item))) > STATE_LIMITS.record_bytes) throw failure('TRANSACTION_LIMIT', 'invalid');
      }
      await transact(actions);
      // A replacement cannot be confirmed as the target even if a retained copy
      // contains the same origin and revision values.
      try { await physicalLifecycleTable(); } catch { throw failure('UNCERTAIN_WRITE', 'uncertain'); }
      return result('confirmed', 'OK', { installation: next.installation, lifecycle: next.lifecycle });
    }),
    inventory: () => bounded(async () => {
      const before = await lifecycleSnapshot();
      let inventory, rejected;
      try {
        inventory = await collectLifecycleInventory(before);
      } catch (error) {
        rejected = error.stateResult;
        if (!['MALFORMED_RECORD', 'UNSUPPORTED_VERSION', 'UNSUPPORTED_PROOF', 'INCOMPLETE_INVENTORY',
          'BINDING_MISMATCH', 'OPERATOR_PROVENANCE_UNAVAILABLE'].includes(rejected?.code)) throw error;
      }
      const after = await lifecycleSnapshot();
      if (!same(before, after)) throw failure('REVISION_CONFLICT', 'conflict');
      // Only retained-content validation under a stable, authenticated installation
      // can support a protective proposal. Transport and origin failures stay unmarked.
      if (rejected) return { ...rejected, inventory_validation: true };
      return result('confirmed', 'OK', { ...after, ...inventory, complete: true,
        provisional: Boolean(after.lifecycle.owner) || after.installation.schedule_enabled || after.installation.writes_enabled });
    })
  };

  const state = {
    initialize,
    retainPublication: value => bounded(async () => {
      input(value, retainPublicationSchema);
      const records = await proofRecords(value), attempt = records.attempt;
      if (existingProof(attempt).state !== 'none') throw failure('PROOF_CONFLICT', 'conflict');
      if (value.reference.ticket_id !== attempt.ticket_id || value.reference.record_id !== attempt.attempt_id) throw failure('PUBLICATION_MISMATCH', 'conflict');
      if (attempt.publication.some(r => r.record_id === value.reference.record_id || r.comment_id === value.reference.comment_id && r.ticket_id === value.reference.ticket_id)) throw failure('PROOF_CONFLICT', 'conflict');
      return saveProof(records, { publication: [...attempt.publication, value.reference] }, value.now);
    }),
    prepareTransitionCapture: value => bounded(async () => {
      input(value, prepareCaptureSchema);
      const records = await proofRecords(value), attempt = records.attempt;
      if (existingProof(attempt).state !== 'none') throw failure('PROOF_CONFLICT', 'conflict');
      if (Object.keys(attempt.extensions).length + 10 > 16) throw failure('TRANSACTION_LIMIT', 'invalid');
      let assignment = null;
      if (attempt.operation === 'queue_repair') {
        const member = await get('member', recordId('member', attempt));
        if (!member || ['site', 'project_id', 'label', 'epic_id', 'ticket_id'].some(k => member[k] !== attempt[k])) throw failure('PUBLICATION_MISMATCH', 'conflict');
        assignment = member.assignment;
      }
      const nativePublication = prepareTransitionEvidence(attempt, value.transition_id, value.publication_observations, assignment);
      const extensions = { ...attempt.extensions, pb_capture_version: 1, pb_capture_transition_id: value.transition_id, pb_capture_request_digest: nativePublication.request_digest, pb_capture_publication_digest: nativePublication.publication_digest, pb_capture_package_revision: binding.package_revision, pb_capture_invocation_id: value.producer_invocation_id, pb_capture_prepared_at: value.now, pb_capture_status: null, pb_capture_received_at: null, pb_capture_provider_request_id: null };
      return saveProof(records, { extensions }, value.now, nativePublication);
    }),
    recordTransitionResponse: value => bounded(async () => {
      input(value, recordResponseSchema);
      const records = await proofRecords(value), attempt = records.attempt, proof = existingProof(attempt);
      if (proof.state !== 'prepared' || proof.request_digest !== value.request_digest) throw failure('PROOF_CONFLICT', 'conflict');
      const extensions = { ...attempt.extensions, pb_capture_status: value.http_status, pb_capture_received_at: value.observed_at, pb_capture_provider_request_id: providerRequestId(value.provider_request_id) };
      return saveProof(records, { extensions }, value.observed_at);
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
      if (value.attempt.publication.length >= attemptSchema.properties.publication.maxItems) throw failure('INVALID_INPUT', 'invalid');
      const publicationTuples = value.attempt.publication.map(r => canonicalize([r.ticket_id, r.comment_id, r.record_id, r.digest]));
      if (new Set(publicationTuples).size !== publicationTuples.length) throw failure('INVALID_INPUT', 'invalid');
      if (value.attempt.publication.some(reference => reference.record_id === value.attempt.attempt_id)) throw failure('INVALID_INPUT', 'invalid');
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
  return { state, readNativePublication, initialize, readDecision, reconcileAttempt, lifecycle };
}
