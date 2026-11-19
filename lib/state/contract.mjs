import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { receiptInputSchema } from '../contracts/receipts.mjs';
import { streamKey } from '../config/projects.mjs';
import canonicalize from 'canonicalize';
import { parseContract } from '../contracts/work.mjs';

export const STATE_LIMITS = Object.freeze({ record_bytes: 32768, transaction_bytes: 1048576, actions: 100, records: 1000 });
export const KINDS = Object.freeze(['installation', 'stream', 'attempt', 'member']);
const id = { type: 'string', pattern: '^[0-9]{1,255}$' };
const token = { type: 'string', pattern: '^[A-Za-z0-9._:-]{1,255}$' };
const text = { type: 'string', minLength: 1, maxLength: 255, pattern: '^\\S+$' };
const timestamp = { type: 'string', format: 'date-time', maxLength: 64 };
const revision = { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
const hash = { type: 'string', pattern: '^sha256:[0-9a-f]{64}$' };
const origin = { type: 'string', format: 'uri', maxLength: 2048 };
const obj = (properties, optional = []) => ({ type: 'object', properties, required: Object.keys(properties).filter(k => !optional.includes(k)), additionalProperties: false });
const list = (items, maxItems = 100) => ({ type: 'array', items, maxItems });
const nullable = value => ({ anyOf: [value, { type: 'null' }] });
const reference = structuredClone(receiptInputSchema.$defs.reference);
for (const field of ['ticket_id', 'comment_id']) reference.properties[field].maxLength = 255;
const extensions = { type: 'object', maxProperties: 16, propertyNames: { pattern: '^[a-z][a-z0-9_]{0,31}$' }, additionalProperties: { anyOf: [{ type: 'boolean' }, { type: 'number' }, { type: 'null' }, { type: 'string', maxLength: 255, pattern: '^[A-Za-z0-9._:-]*$' }] } };
const identity = { site: origin, project_id: id, label: text };
const controls = { configuration_digest: hash, schedule_enabled: { type: 'boolean' }, writes_enabled: { type: 'boolean' }, maintenance: { type: 'boolean' } };
export const bindingSchema = obj({ schema: { const: 'pigboard-aws-installation/v1' }, installation_id: token, domain_id: token, site: origin, configuration_digest: hash, package_revision: { type: 'string', pattern: '^[0-9a-f]{40}$' }, region: { type: 'string', pattern: '^[a-z]{2}(?:-gov)?-[a-z]+-[0-9]$' }, stack_id: { type: 'string', maxLength: 2048, pattern: '^arn:aws(?:-us-gov|-cn)?:cloudformation:[a-z0-9-]+:[0-9]{12}:stack/[A-Za-z0-9-]+/[A-Za-z0-9-]+$' }, table_name: { type: 'string', pattern: '^[A-Za-z0-9_.-]{3,255}$' }, table_arn: { type: 'string', pattern: '^arn:aws(?:-us-gov|-cn)?:dynamodb:[a-z0-9-]+:[0-9]{12}:table/[A-Za-z0-9_.-]+$' }, installation_generation: token });
export const controlSchema = obj(controls);
export const streamSchema = obj(identity);
export const memberSchema = obj({ ...identity, epic_id: id, ticket_id: id, assignment: nullable(reference), expected_revision: nullable(revision) });
export const attemptSchema = obj({ attempt_id: { type: 'string', format: 'uuid' }, ticket_id: id, epic_id: id, issue_key: { type: 'string', pattern: '^[A-Z][A-Z0-9_]{0,100}-[1-9][0-9]{0,100}$' }, operation: { enum: ['admit_ready', 'admit_rework', 'queue_repair'] }, source_status_id: id, target_status_id: id, configuration_digest: hash, cause: list(reference), publication: list(reference) });
export const evidenceSchema = obj({ references: { ...list(reference), minItems: 1 }, disposition: { enum: ['confirmed_applied', 'confirmed_not_applied'] }, actor_id: token });
const utcTime = { ...timestamp, pattern: 'Z$' };
const proofRevisions = { attempt_id: attemptSchema.properties.attempt_id, expected_installation_revision: revision, expected_stream_revision: revision, expected_attempt_revision: revision };
const publicationComments = time => ({
  ...list(obj({ reference, author_id: token, update_author_id: token, created: time, updated: time })),
  minItems: 1
});
const publicationPointer = obj({ mode: { enum: ['published', 'preserved'] }, assignment: reference });
export const publicationObservationsSchema = obj({ comments: publicationComments(utcTime), pointer: publicationPointer });
const nativeComments = publicationComments(timestamp);
const nativeObservationsSchema = obj({ comments: nativeComments, pointer: publicationPointer });
export const nativePublicationSchema = obj({
  schema: { const: 'pigboard-native-publication/v1' },
  installation_id: token,
  site: origin,
  attempt_id: attemptSchema.properties.attempt_id,
  request_digest: hash,
  publication_digest: hash,
  comments: nativeComments
});
export const retainPublicationSchema = obj({ ...proofRevisions, reference, now: utcTime });
export const prepareCaptureSchema = obj({ ...proofRevisions, transition_id: id, producer_invocation_id: attemptSchema.properties.attempt_id, publication_observations: nativeObservationsSchema, now: utcTime });
export const recordResponseSchema = obj({ ...proofRevisions, request_digest: hash, http_status: { type: 'integer', minimum: 200, maximum: 599 }, observed_at: utcTime, provider_request_id: nullable({ type: 'string', maxLength: 2048 }) });
export const CAPTURE_KEYS = Object.freeze(['pb_capture_version', 'pb_capture_transition_id', 'pb_capture_request_digest', 'pb_capture_publication_digest', 'pb_capture_package_revision', 'pb_capture_invocation_id', 'pb_capture_prepared_at', 'pb_capture_status', 'pb_capture_received_at', 'pb_capture_provider_request_id']);
const captureSchema = obj({ pb_capture_version: { const: 1 }, pb_capture_transition_id: id, pb_capture_request_digest: hash, pb_capture_publication_digest: hash, pb_capture_package_revision: bindingSchema.properties.package_revision, pb_capture_invocation_id: attemptSchema.properties.attempt_id, pb_capture_prepared_at: utcTime, pb_capture_status: nullable(recordResponseSchema.properties.http_status), pb_capture_received_at: nullable(utcTime), pb_capture_provider_request_id: nullable(token) });
export const proofEqual = (a, b) => canonicalize(a) === canonicalize(b);
const sha256 = value => 'sha256:' + createHash('sha256').update(canonicalize(value)).digest('hex');
const referenceTuple = r => [r.ticket_id, r.comment_id, r.record_id, r.digest];
/** One canonical publication tuple shared with the later reconciliation consumer.
 * Producer verifies bodies/readback; this helper validates their exact bindings. */
export function transitionPublication(attempt, observations, retainedAssignment = null) {
  if (!valid(observations, publicationObservationsSchema) || !Array.isArray(attempt.publication) || !attempt.publication.length) throw failure('PUBLICATION_MISMATCH', 'conflict');
  const retained = attempt.publication.map(r => canonicalize(referenceTuple(r))).sort();
  const observed = observations.comments.map(c => canonicalize(referenceTuple(c.reference))).sort();
  if (new Set(retained).size !== retained.length || new Set(observed).size !== observed.length || !proofEqual(retained, observed)) throw failure('PUBLICATION_MISMATCH', 'conflict');
  if (observations.comments.some(c => c.author_id !== c.update_author_id || c.created !== c.updated)) throw failure('PUBLICATION_MISMATCH', 'conflict');
  const manager = attempt.publication.filter(r => r.ticket_id === attempt.ticket_id && r.record_id === attempt.attempt_id);
  if (manager.length !== 1) throw failure('PUBLICATION_MISMATCH', 'conflict');
  const pointer = observations.pointer;
  if (attempt.operation === 'queue_repair') {
    if (pointer.mode !== 'preserved' || !valid(retainedAssignment, reference) || !proofEqual(pointer.assignment, retainedAssignment) || pointer.assignment.ticket_id !== attempt.ticket_id || proofEqual(pointer.assignment, manager[0])) throw failure('PUBLICATION_MISMATCH', 'conflict');
  } else if (pointer.mode !== 'published' || !proofEqual(pointer.assignment, manager[0])) throw failure('PUBLICATION_MISMATCH', 'conflict');
  const comments = observations.comments.map(c => [referenceTuple(c.reference), c.author_id, c.update_author_id, c.created, c.updated]).sort((a, b) => canonicalize(a[0]) < canonicalize(b[0]) ? -1 : canonicalize(a[0]) > canonicalize(b[0]) ? 1 : 0);
  const tuple = { comments, pointer: [pointer.mode, referenceTuple(pointer.assignment)] };
  return { tuple, digest: sha256(tuple) };
}
export function transitionRequestDigest(attempt, transitionId, publicationDigest) {
  if (!valid(transitionId, id) || !valid(publicationDigest, hash)) throw failure('INVALID_INPUT', 'invalid');
  const fields = ['schema_version', 'installation_id', 'domain_id', 'record_id', 'site', 'project_id', 'label', 'attempt_id', 'ticket_id', 'epic_id', 'issue_key', 'operation', 'source_status_id', 'target_status_id', 'configuration_digest', 'created_at', 'cause'];
  const identity = Object.fromEntries(fields.map(k => [k, attempt[k]]));
  return sha256({ version: 1, identity, method: 'POST', route: 'issue_transitions', transition_id: transitionId, body: { transition: { id: transitionId } }, publication_digest: publicationDigest });
}

/** Derive the canonical commitment and its exact native evidence from one verified observation. */
export function prepareTransitionEvidence(attempt, transitionId, observations, retainedAssignment) {
  if (!valid(observations, nativeObservationsSchema)) throw failure('PUBLICATION_MISMATCH', 'conflict');
  const nativeIdentities = new Set();
  const comments = observations.comments.map(comment => {
    const { reference, author_id, update_author_id, created, updated } = comment;
    const nativeIdentity = JSON.stringify([reference.ticket_id, reference.comment_id]);
    const instant = Date.parse(created);
    if (nativeIdentities.has(nativeIdentity) || author_id !== update_author_id || created !== updated || !Number.isFinite(instant)) {
      throw failure('PUBLICATION_MISMATCH', 'conflict');
    }
    nativeIdentities.add(nativeIdentity);
    const utc = new Date(instant).toISOString();
    return { reference, author_id, update_author_id, created: utc, updated: utc };
  });
  const publication = transitionPublication(attempt, { comments, pointer: observations.pointer }, retainedAssignment);
  const evidence = {
    schema: 'pigboard-native-publication/v1',
    installation_id: attempt.installation_id,
    site: attempt.site,
    attempt_id: attempt.attempt_id,
    request_digest: transitionRequestDigest(attempt, transitionId, publication.digest),
    publication_digest: publication.digest,
    comments: structuredClone(observations.comments)
  };
  if (!valid(evidence, nativePublicationSchema)) throw failure('PUBLICATION_MISMATCH', 'conflict');
  return evidence;
}

/** Unsupported named groups remain inspectable as evidence, never authority. */
export function transitionProof(attempt) {
  const ext = attempt.extensions ?? {}, named = Object.keys(ext).filter(k => k.startsWith('pb_capture_'));
  if (!named.length) return { state: 'none', request_digest: null, http_status: null };
  const capture = Object.fromEntries(CAPTURE_KEYS.map(k => [k, ext[k]]));
  if (named.length !== CAPTURE_KEYS.length || named.some(k => !CAPTURE_KEYS.includes(k)) || !valid(capture, captureSchema) || (capture.pb_capture_status === null) !== (capture.pb_capture_received_at === null) || capture.pb_capture_status === null && capture.pb_capture_provider_request_id !== null) return { state: 'unsupported', request_digest: null, http_status: null };
  try { if (transitionRequestDigest(attempt, capture.pb_capture_transition_id, capture.pb_capture_publication_digest) !== capture.pb_capture_request_digest) throw Error(); } catch { return { state: 'unsupported', request_digest: null, http_status: null }; }
  return { state: capture.pb_capture_status === null ? 'prepared' : 'response-captured', request_digest: capture.pb_capture_request_digest, http_status: capture.pb_capture_status };
}
export function providerRequestId(value) { return valid(value, token) ? value : null; }
export const reconciliationRequestSchema = obj({ schema: { const: 'pigboard-reconciliation-request/v1' }, ...proofRevisions, disposition: { enum: ['confirmed_applied', 'confirmed_not_applied'] } });
const actorSchema = obj({
  account_id: { type: 'string', pattern: '^[0-9]{12}$' },
  user_id: { type: 'string', minLength: 1, maxLength: 255 },
  arn: { type: 'string', pattern: '^arn:aws:sts::[0-9]{12}:assumed-role/[A-Za-z0-9_+=,.@-]+/[A-Za-z0-9_+=,.@-]+$', maxLength: 2048 }
});
const { installation_id, domain_id, site, stack_id, installation_generation, table_arn, package_revision } = bindingSchema.properties;
const physicalScope = { installation_id, domain_id, site, stack_id, installation_generation, table_arn };
const originFields = {
  ...physicalScope, table_id: token, table_created_at: utcTime,
  role_event_id: token, role_event_at: utcTime, table_event_id: token, table_event_at: utcTime, policy_digest: hash
};
export const originEvidenceSchema = obj(originFields);
export const operatorOriginSchema = obj({ schema: { const: 'pigboard-operator-origin/v1' }, ...originFields, package_revision, actor: actorSchema });
export const operatorDecisionSchema = obj({
  schema: { const: 'pigboard-operator-decision/v1' }, installation_id, installation_generation,
  stream_id: token, ...proofRevisions, stop_id: attemptSchema.properties.attempt_id,
  request_digest: hash, publication_digest: hash, operator_request_digest: hash,
  disposition: reconciliationRequestSchema.properties.disposition, attempt_revision: revision,
  outcome: { enum: ['applied', 'not_applied'] }, actor: actorSchema, recorded_at: utcTime
});
export function operatorRequestDigest(binding, request) {
  return sha256({ schema: 'pigboard-operator-request-digest/v1',
    installation_id: binding.installation_id, installation_generation: binding.installation_generation,
    request });
}
export function closedDecisionRequest(decision) {
  return { schema: 'pigboard-reconciliation-request/v1', attempt_id: decision.attempt_id,
    expected_installation_revision: decision.expected_installation_revision,
    expected_stream_revision: decision.expected_stream_revision, expected_attempt_revision: decision.expected_attempt_revision,
    disposition: decision.disposition };
}
export function parseReconciliationRequest(raw) {
  try {
    const value = parseContract(raw, { bytes: 16384, depth: 8, list: 32 });
    JSON.parse(typeof raw === 'string' ? raw : new TextDecoder('utf-8', { fatal: true }).decode(raw));
    if (!valid(value, reconciliationRequestSchema)) throw Error();
    return value;
  } catch { throw failure('INVALID_INPUT', 'invalid'); }
}
export function operatorActorId({ account_id, user_id } = {}) {
  if (typeof account_id !== 'string' || !/^[0-9]{12}$/.test(account_id) || typeof user_id !== 'string' || !user_id.length || /[\u0000-\u001f\u007f]/.test(user_id)) throw failure('OPERATOR_ID_UNSUPPORTED', 'conflict');
  const encoded = Buffer.from(canonicalize([account_id, user_id]));
  if (encoded.length > 186) throw failure('OPERATOR_ID_UNSUPPORTED', 'conflict');
  return 'aws:' + encoded.toString('base64url');
}
export function validOperatorActor(actor) {
  try {
    if (typeof actor !== 'string' || !/^aws:[A-Za-z0-9_-]+$/.test(actor)) return false;
    const native = JSON.parse(Buffer.from(actor.slice(4), 'base64url').toString('utf8'));
    return Array.isArray(native) && native.length === 2 && operatorActorId({ account_id: native[0], user_id: native[1] }) === actor;
  } catch { return false; }
}
export function operatorPrincipal(identity, binding) {
  const actor = { account_id: identity?.Account, user_id: identity?.UserId, arn: identity?.Arn };
  if (!validPrincipal(actor, binding)) throw failure('OPERATOR_UNAUTHORIZED');
  operatorActorId(actor);
  return actor;
}
export function validPrincipal(actor, binding) {
  return valid(actor, actorSchema) && actor.account_id === binding.table_arn.split(':')[4]
    && actor.arn.split(':')[4] === actor.account_id;
}
export const STOP_KEYS = Object.freeze(['pb_stop_version', 'pb_stop_id', 'pb_stop_actor', 'pb_stop_config_digest', 'pb_stop_package_revision', 'pb_stop_resource_digest', 'pb_stop_bounds_digest', 'pb_stop_fence_revision', 'pb_stop_started_at', 'pb_stop_window_ms', 'pb_stop_completed_at', 'pb_stop_elapsed_ms']);
const stopSchema = obj({ pb_stop_version: { const: 1 }, pb_stop_id: attemptSchema.properties.attempt_id, pb_stop_actor: token, pb_stop_config_digest: hash, pb_stop_package_revision: bindingSchema.properties.package_revision, pb_stop_resource_digest: hash, pb_stop_bounds_digest: hash, pb_stop_fence_revision: revision, pb_stop_started_at: utcTime, pb_stop_window_ms: { ...revision, minimum: 1 }, pb_stop_completed_at: nullable(utcTime), pb_stop_elapsed_ms: nullable(revision) });
const lifecycleId = attemptSchema.properties.attempt_id;
const lifecycleKind = { enum: ['bootstrap', 'configure', 'upgrade', 'stop', 'removal', 'remove', 'maintenance-only', 'maintenance_only', 'emergency'] };
const lifecycleDetails = { type: 'object', maxProperties: 32 };
const verifiedEnablement = obj({ health_generation: lifecycleId,
  health_enabled_at: { ...utcTime, pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$' } });
const lifecycleOwner = obj({
  id: lifecycleId, kind: lifecycleKind, fence_id: lifecycleId,
  phase: { enum: ['reserved', 'dispatching', 'settled', 'enablement-recorded'] }, details: lifecycleDetails, actor: actorSchema,
  created_at: utcTime, installation_revision: revision,
  effects: list(obj({ name: token, state: { enum: ['pending', 'claimed', 'settled'] } }), 12),
  verified_enablement: verifiedEnablement
}, ['verified_enablement']);
const lifecycleRecovery = list(obj({ attempt_id: lifecycleId, request_digest: nullable(hash), publication_digest: nullable(hash) }), 100);
export const stopGenerationSchema = obj({ ...physicalScope, table_id: token,
  producer_generation: { const: 'pigboard-stop-producer/v1' }, stop_id: lifecycleId,
  fence_revision: revision, configuration_digest: hash, package_revision, resource_digest: hash, bounds_digest: hash
});
export const lifecycleSchema = obj({
  schema: { const: 'pigboard-lifecycle/v1' }, origin: originEvidenceSchema, actor: actorSchema,
  revision, fence_id: nullable(lifecycleId), owner: nullable(lifecycleOwner),
  generation: nullable(stopGenerationSchema), last_operation_id: nullable(lifecycleId),
  bootstrapped: { type: 'boolean' }, recovery: lifecycleRecovery
});
export const lifecycleOperationSchema = obj({
  schema: { const: 'pigboard-lifecycle-operation/v1' }, origin: originEvidenceSchema, owner: lifecycleOwner,
  fence_id: lifecycleId, outcome: { enum: ['completed', 'superseded', 'partial'] }, terminal: lifecycleDetails,
  actor: actorSchema, recorded_at: utcTime
});
const lifecycleActionBase = { now: utcTime, id: lifecycleId, expected: obj({ installation: {type: 'object'}, lifecycle: lifecycleSchema }) };
const lifecycleReserveFields = { ...lifecycleActionBase, kind: lifecycleKind, details: lifecycleDetails, effects: list(token, 12),
  superseded_id: lifecycleId, stop_id: lifecycleId };
export const lifecycleActionSchema = { oneOf: [
  obj({ ...lifecycleReserveFields, type: { enum: ['reserve', 'emergency'] } }, ['superseded_id', 'stop_id']),
  obj({ ...lifecycleActionBase, type: { enum: ['claim', 'settle', 'skip'] }, effect: token }),
  obj({ ...lifecycleActionBase, type: { const: 'record-enablement' } }),
  obj({ ...lifecycleActionBase, type: { const: 'retain-recovery' }, recovery: lifecycleRecovery }),
  obj({ ...lifecycleActionBase, type: { const: 'finish' }, outcome: lifecycleOperationSchema.properties.outcome,
    terminal: lifecycleDetails, controls: obj({ ...controls, package_revision }), stop: stopSchema, recovery: lifecycleRecovery
  }, ['controls', 'stop', 'recovery'])
] };
export function completedStop(installation, binding) {
  const ext = installation.extensions ?? {}, named = Object.keys(ext).filter(k => k.startsWith('pb_stop_'));
  const stop = Object.fromEntries(STOP_KEYS.map(k => [k, ext[k]]));
  if (named.length !== STOP_KEYS.length || named.some(k => !STOP_KEYS.includes(k)) || !valid(stop, stopSchema) || !validOperatorActor(stop.pb_stop_actor)) throw failure('DRAIN_INCOMPLETE', 'conflict');
  if (installation.schedule_enabled || installation.writes_enabled || !installation.maintenance || stop.pb_stop_config_digest !== installation.configuration_digest || stop.pb_stop_config_digest !== binding.configuration_digest || stop.pb_stop_package_revision !== binding.package_revision || installation.package_revision !== binding.package_revision) throw failure('CONTROL_MISMATCH', 'conflict');
  if (stop.pb_stop_completed_at === null || Date.parse(stop.pb_stop_completed_at) < Date.parse(stop.pb_stop_started_at)
    || stop.pb_stop_elapsed_ms === null || stop.pb_stop_elapsed_ms < stop.pb_stop_window_ms
    || stop.pb_stop_fence_revision > installation.revision) throw failure('DRAIN_INCOMPLETE', 'conflict');
  return stop;
}
const envelope = { kind: { enum: KINDS }, schema_version: { const: 1 }, installation_id: token, domain_id: token, record_id: token, revision, created_at: timestamp, updated_at: timestamp, extensions };
const { expected_revision: ignored, ...memberFields } = memberSchema.properties;
export const recordSchemas = {
  installation: obj({ ...envelope, kind: { const: 'installation' }, ...bindingSchema.properties, schema: undefined, ...controls }),
  stream: obj({ ...envelope, kind: { const: 'stream' }, ...identity, pending_attempt_id: nullable(attemptSchema.properties.attempt_id) }),
  member: obj({ ...envelope, kind: { const: 'member' }, ...memberFields }),
  attempt: obj({ ...envelope, kind: { const: 'attempt' }, ...identity, ...attemptSchema.properties, outcome: { enum: ['pending', 'applied', 'not_applied'] }, evidence: nullable(evidenceSchema) })
};
// Receipt schema identifies an output document, not the stored record envelope.
delete recordSchemas.installation.properties.schema;
recordSchemas.installation.required = recordSchemas.installation.required.filter(k => k !== 'schema');
const ajv = new Ajv2020({ allErrors: false, strict: false, ownProperties: true });
addFormats(ajv);
const cache = new WeakMap();
export function valid(value, schema) {
  try {
    if (Buffer.byteLength(JSON.stringify(value)) > STATE_LIMITS.transaction_bytes) return false;
    const walk = (v, depth = 0) => {
      if (depth > 32) throw Error();
      if (!v || typeof v !== 'object') return;
      if (Object.hasOwn(v, 'site') && !validOrigin(v.site)) throw Error();
      if (Object.hasOwn(v, 'site') && Object.hasOwn(v, 'project_id') && Object.hasOwn(v, 'label')) streamKey(v.site, v.project_id, v.label);
      for (const child of Object.values(v)) walk(child, depth + 1);
    };
    walk(value);
    let validate = cache.get(schema); if (!validate) { validate = ajv.compile({ ...schema, $defs: receiptInputSchema.$defs }); cache.set(schema, validate); }
    return validate(value);
  } catch { return false; }
}
export function validOrigin(site) { try { const u = new URL(site); return u.protocol === 'https:' && u.origin === site && !u.username && !u.password; } catch { return false; } }
export function validBinding(binding, control) {
  if (!valid(binding, bindingSchema) || !valid(control, controlSchema) || !validOrigin(binding.site)) return false;
  const arn = binding.table_arn.split(':');
  return arn[3] === binding.region && binding.table_arn.endsWith('/' + binding.table_name) && binding.configuration_digest === control.configuration_digest;
}
export function recordId(kind, value) {
  if (kind === 'installation') return value.installation_id;
  if (kind === 'attempt') return 'attempt:' + value.attempt_id;
  const identity = kind === 'stream' ? streamKey(value.site, value.project_id, value.label) : value.ticket_id;
  return kind + ':' + createHash('sha256').update(identity).digest('hex');
}
export function validateRecord(record, binding) {
  if (!record || typeof record !== 'object') return 'MALFORMED_RECORD';
  if (!Number.isSafeInteger(record.schema_version) || record.schema_version < 1) return 'MALFORMED_RECORD';
  if (record.schema_version !== 1) return 'UNSUPPORTED_VERSION';
  if (!KINDS.includes(record.kind) || !valid(record, recordSchemas[record.kind]) || Buffer.byteLength(JSON.stringify(record)) > STATE_LIMITS.record_bytes) return 'MALFORMED_RECORD';
  if (record.installation_id !== binding.installation_id || record.domain_id !== binding.domain_id || record.site !== binding.site) return 'BINDING_MISMATCH';
  try { if (record.record_id !== recordId(record.kind, record)) return 'MALFORMED_RECORD'; if (record.kind !== 'installation') streamKey(record.site, record.project_id, record.label); } catch { return 'MALFORMED_RECORD'; }
  if (record.kind === 'installation' && ['region', 'table_name', 'table_arn', 'stack_id', 'installation_generation'].some(k => record[k] !== binding[k])) return 'BINDING_MISMATCH';
  return null;
}
const messages = {
  OK: 'State observation confirmed. This does not authorize a Jira effect.', INVALID_INPUT: 'Supply the documented bounded input fields.', SETUP: 'Prepare the pinned AWS runtime before using state commands.', CORE_PREREQUISITE: 'The reviewed installation resolver is required before running this command.',
  MISSING_INSTALLATION: 'Installation state is missing. Inspect the retained installation; do not initialize a replacement.', MISSING_STREAM: 'The requested retained stream is missing.', MISSING_ATTEMPT: 'The requested retained attempt is missing.',
  MALFORMED_RECORD: 'Stored state does not match its supported record contract.', UNSUPPORTED_VERSION: 'Use a release supporting this state version; no state was changed.', BINDING_MISMATCH: 'Resource or retained identity differs from the installation binding.', CONTROL_MISMATCH: 'Canonical configuration, package or applied controls differ, or admission writes are disabled.',
  REVISION_CONFLICT: 'State changed. Obtain a fresh inventory before evaluating again.', PENDING_ATTEMPT: 'An unresolved attempt holds this stream.', OWNERSHIP_CONFLICT: 'Retained membership cannot be moved to a different original owner.', INCOMPLETE_INVENTORY: 'The bounded inventory is incomplete; do not use it as empty state.',
  ALREADY_INITIALIZED: 'This installation already has state; use inspect.', UNAVAILABLE: 'State could not be confirmed. Check access and inspect the same installation.', UNCERTAIN_WRITE: 'Persistence is unknown. Inspect this same installation and attempt ID; do not create a new attempt to retry.',
  FRESH_INSTALLATION_REQUIRED: 'Initialization requires the package resolver’s verified fresh installation observation.', TRANSACTION_LIMIT: 'Keep the record, extension and transaction limits before any producer effect.',
  PUBLICATION_MISMATCH: 'Retained publication and verified pointer observations must match this pending operation.', PROOF_CONFLICT: 'Original proof already exists or differs. Inspect this same attempt; do not send or replay.', UNSUPPORTED_PROOF: 'The named capture group is incomplete or unsupported. Keep the pending hold.',
  ENABLEMENT_UNVERIFIED: 'The original verified schedule enablement time is missing. Keep admission fenced and inspect the operation.',
  CAPTURE_MISSING: 'No original completed supported response is retained. Keep the pending hold.', CAPTURE_UNSUPPORTED: 'Original response evidence cannot support this disposition.', POINTER_MISMATCH: 'Fresh pointer observations differ from the retained operation.', HISTORY_UNAVAILABLE: 'The required native-history observation is missing or unavailable. Keep the hold.', HISTORY_INCOMPLETE: 'The required native-history read did not complete. Keep the hold.', DRAIN_INCOMPLETE: 'The matching completed stop generation and measured drain are required.', BOUNDS_UNSUPPORTED: 'Actual complete delivery, invocation and request bounds must be justified by the bound package.', OPERATOR_UNAUTHORIZED: 'The current principal must match the installed operator role and have its conditional state permission.', OPERATOR_ID_UNSUPPORTED: 'The exact native principal cannot be represented within the supported bound.',
  ORIGIN_UNVERIFIED: 'The original protected installation could not be verified. Use the same installation and check its AWS creation history.',
  OPERATOR_PROVENANCE_ABSENT: 'There is no verified operator decision for this attempt.',
  OPERATOR_PROVENANCE_UNAVAILABLE: 'The operator decision could not be verified. Ordinary State remains available as observed.',
  ALREADY_SETTLED: 'The same operator decision was already recorded. The original decision and actor are shown.',
  ALREADY_SETTLED_CONFLICT: 'The attempt has a different verified operator decision. Inspect its original decision and actor.',
  OPERATOR_SETTLED: 'The operator decision was recorded. Keep admission disabled.',
  ORIGINAL_RESPONSE_UNRECORDED: 'No original reply was saved. Keep the pending hold.',
  ASSIGNMENT_MISMATCH: 'The observed assignment differs from the retained attempt. Keep the pending hold.'
};
export function result(status = 'confirmed', code = 'OK', data = null) { return { schema: 'pigboard-state-result/v1', status, code, diagnostics: [{ code, message: messages[code] ?? messages.UNAVAILABLE }], data: status === 'confirmed' ? data : null }; }
export function failure(code, status = code === 'UNSUPPORTED_VERSION' ? 'unsupported_version' : code === 'BINDING_MISMATCH' ? 'conflict' : 'unavailable') { return Object.assign(new Error(code), { stateResult: result(status, code) }); }
export function projectRetainedInventory(inventory) {
  if (!inventory || inventory.complete !== true || !Array.isArray(inventory.members) || !Array.isArray(inventory.pending_attempts)) throw failure('INCOMPLETE_INVENTORY');
  return { retained_members: inventory.members.map(({ ticket_id, project_id, epic_id, label, assignment }) => ({ ticket_id, project_id, epic_id, label, assignment })), pending_intents: inventory.pending_attempts.map(({ project_id, label, ticket_id, attempt_id }) => ({ project_id, label, ticket_id, attempt_id })) };
}
export function nextRevision(n) { if (!Number.isSafeInteger(n) || n < 0 || n === Number.MAX_SAFE_INTEGER) throw failure('INVALID_INPUT', 'invalid'); return n + 1; }
export const schemas = { obj, list, nullable, revision, timestamp, reference };
