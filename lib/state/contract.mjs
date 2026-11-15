import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { receiptInputSchema } from '../contracts/receipts.mjs';
import { streamKey } from '../config/projects.mjs';
import canonicalize from 'canonicalize';

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
export const publicationObservationsSchema = obj({ comments: { ...list(obj({ reference, author_id: token, update_author_id: token, created: utcTime, updated: utcTime })), minItems: 1 }, pointer: obj({ mode: { enum: ['published', 'preserved'] }, assignment: reference }) });
export const retainPublicationSchema = obj({ ...proofRevisions, reference, now: utcTime });
export const prepareCaptureSchema = obj({ ...proofRevisions, transition_id: id, producer_invocation_id: attemptSchema.properties.attempt_id, publication_observations: publicationObservationsSchema, now: utcTime });
export const recordResponseSchema = obj({ ...proofRevisions, request_digest: hash, http_status: { type: 'integer', minimum: 100, maximum: 599 }, observed_at: utcTime, provider_request_id: nullable({ type: 'string', maxLength: 2048 }) });
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
  MALFORMED_RECORD: 'Stored state does not match its supported record contract.', UNSUPPORTED_VERSION: 'Use a release supporting this state version; no state was changed.', BINDING_MISMATCH: 'Resource or retained identity differs from the installation binding.', CONTROL_MISMATCH: 'Canonical and applied controls differ or admission writes are disabled.',
  REVISION_CONFLICT: 'State changed. Obtain a fresh inventory before evaluating again.', PENDING_ATTEMPT: 'An unresolved attempt holds this stream.', OWNERSHIP_CONFLICT: 'Retained membership cannot be moved to a different original owner.', INCOMPLETE_INVENTORY: 'The bounded inventory is incomplete; do not use it as empty state.',
  ALREADY_INITIALIZED: 'This installation already has state; use inspect.', UNAVAILABLE: 'State could not be confirmed. Check access and inspect the same installation.', UNCERTAIN_WRITE: 'Persistence is unknown. Inspect this same installation and attempt ID; do not create a new attempt to retry.',
  FRESH_INSTALLATION_REQUIRED: 'Initialization requires the package resolver’s verified fresh installation observation.', TRANSACTION_LIMIT: 'Keep the record, extension and transaction limits before any producer effect.',
  PUBLICATION_MISMATCH: 'Retained publication and verified pointer observations must match this pending operation.', PROOF_CONFLICT: 'Original proof already exists or differs. Inspect this same attempt; do not send or replay.', UNSUPPORTED_PROOF: 'The named capture group is incomplete or unsupported. Keep the pending hold.'
};
export function result(status = 'confirmed', code = 'OK', data = null) { return { schema: 'pigboard-state-result/v1', status, code, diagnostics: [{ code, message: messages[code] ?? messages.UNAVAILABLE }], data: status === 'confirmed' ? data : null }; }
export function failure(code, status = code === 'UNSUPPORTED_VERSION' ? 'unsupported_version' : code === 'BINDING_MISMATCH' ? 'conflict' : 'unavailable') { return Object.assign(new Error(code), { stateResult: result(status, code) }); }
export function projectRetainedInventory(inventory) {
  if (!inventory || inventory.complete !== true || !Array.isArray(inventory.members) || !Array.isArray(inventory.pending_attempts)) throw failure('INCOMPLETE_INVENTORY');
  return { retained_members: inventory.members.map(({ ticket_id, project_id, epic_id, label, assignment }) => ({ ticket_id, project_id, epic_id, label, assignment })), pending_intents: inventory.pending_attempts.map(({ project_id, label, ticket_id, attempt_id }) => ({ project_id, label, ticket_id, attempt_id })) };
}
export function nextRevision(n) { if (!Number.isSafeInteger(n) || n < 0 || n === Number.MAX_SAFE_INTEGER) throw failure('INVALID_INPUT', 'invalid'); return n + 1; }
export const schemas = { obj, list, nullable, revision, timestamp, reference };
