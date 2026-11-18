import { isDeepStrictEqual } from 'node:util';
import { bindJiraReceipts } from '../jira/receipts.mjs';
import { parseInventoryInput } from '../jira/inventory.mjs';
import {
  prepareTransitionEvidence, projectRetainedInventory, proofEqual,
  transitionProof, transitionPublication, transitionRequestDigest
} from '../state/contract.mjs';

const limits = { pages: 10000, requests: 10000, milliseconds: 30000 };
const inventoryLimits = { streams: 1000, members: 1000, pending_attempts: 1000, ...limits };
const maxHistoryDisplayBytes = 65536;
const controlFields = ['configuration_digest', 'schedule_enabled', 'writes_enabled', 'maintenance'];
const messages = {
  OK: 'Evidence inspected. The retained attempt and its outcome stay as observed.',
  INVALID_INPUT: 'Use --jira-evidence with one --kind attempt --record-id attempt:<UUID>.',
  CONFIG_INVALID: 'Check the canonical configuration with the configuration checker.',
  RECOVERY_SECRET_INVALID: 'Use separate full sender and recovery secret ARNs in the configured AWS account and region.',
  OPERATOR_UNAUTHORIZED: 'Choose the prepared profile for the exact configured operator role and account.',
  OPERATOR_SESSION_UNAVAILABLE: 'Check the selected AWS profile and its STS session.',
  INSTALLATION_UNAVAILABLE: 'Check the generated current receipt, applied package and State resource identity.',
  ATTEMPT_UNAVAILABLE: 'Use the pending attempt ID from the same verified installation and stream.',
  ATTEMPT_NOT_PENDING: 'Inspect the current stream to identify its pending attempt.',
  ORIGINAL_CAPTURE_MISSING: 'The original request commitment was never retained. Keep the hold.',
  ORIGINAL_CAPTURE_UNSUPPORTED: 'The saved capture is unsupported or has inconsistent request commitments. Keep the hold.',
  ORIGINAL_RESPONSE_UNRECORDED: 'The request was prepared and no original reply was saved. Keep the hold.',
  ORIGINAL_RESPONSE_UNSUPPORTED: 'The original reply status is outside the supported 204 and 409 interpretations. Keep the hold.',
  ORIGINAL_AUTHORITY_MISSING: 'Supply the saved sending installation receipt with --original-installation.',
  ORIGINAL_METADATA_MISSING: 'Original publication metadata was never retained for this attempt. Keep the hold.',
  ORIGINAL_METADATA_MISMATCH: 'The retained publication commitments cannot be reproduced. Keep the hold.',
  ORIGINAL_METADATA_UNAVAILABLE: 'Check read access to the retained State table and repeat this named inspection.',
  RETAINED_INVENTORY_INCOMPLETE: 'Check the bounded State inventory and its member and pending attempt records.',
  RECOVERY_SECRET_MISSING: 'Check whether the applied installation was prepared with a separate recovery Jira secret.',
  RECOVERY_SECRET_DENIED: 'Check the operator role permission on the exact configured recovery secret.',
  RECOVERY_SECRET_IDENTITY_MISMATCH: 'Check the exact recovery secret ARN and its returned identity.',
  RECOVERY_SECRET_UNAVAILABLE: 'Check the recovery secret’s availability and its raw Jira token value.',
  JIRA_UNAVAILABLE: 'Check the recovery account’s visibility of the named Jira evidence in the configured scope.',
  JIRA_DEADLINE: 'Review the configured read budget before another inspection.',
  JIRA_LIMIT_REACHED: 'Review the Jira read bounds and scope before another inspection.',
  JIRA_CLEANUP_UNCONFIRMED: 'Confirm recovery credential and Jira read cleanup before another inspection.',
  TLS_FAILED: 'Check TLS trust, hostname, certificate validity and local clock.',
  REDIRECT_REJECTED: 'Check access to the configured Jira gateway.',
  RATE_LIMITED: 'Wait for an operator-approved later inspection.',
  ASSIGNMENT_MISMATCH: 'Compare the observed assignment result and its source with the retained attempt.',
  PUBLICATION_UNAVAILABLE: 'Check the recovery account’s visibility of the exact publication and its issue.',
  PUBLICATION_MISMATCH: 'Compare the original publication commitments with the acquired Jira observations.',
  RECORDED_PROOF_INVALID: 'Review the retained handoff chain and its exact recorded proof.',
  HISTORY_UNAVAILABLE: 'Check changelog visibility and completeness for the named Jira issue.',
  STATE_CHANGED: 'State changed during the read. Inspect the same attempt again for current evidence.',
  STATE_FENCE_UNAVAILABLE: 'The closing State read could not be confirmed. Check access and inspect the same attempt again.'
};
const initialCodes = {
  INVALID_INPUT: 'invalid',
  CONFIG_INVALID: 'invalid',
  RECOVERY_SECRET_INVALID: 'invalid',
  OPERATOR_UNAUTHORIZED: 'unavailable',
  OPERATOR_SESSION_UNAVAILABLE: 'unavailable',
  INSTALLATION_UNAVAILABLE: 'unavailable',
  ATTEMPT_UNAVAILABLE: 'unavailable'
};
const safeReaderCodes = new Set([
  'AUTHORITY_MISSING', 'ATTEMPT_MISSING', 'ATTEMPT_MISMATCH', 'ATTEMPT_UNSUPPORTED', 'CAPTURE_MISSING',
  'RETAINED_TUPLE_MISSING', 'PUBLICATION_METADATA_CHANGED', 'MANAGER_TARGET_MISMATCH', 'ASSIGNMENT_MISMATCH',
  'CLOSURE_INCOMPLETE', 'RECORDED_PROOF_INVALID', 'ISSUE_MISMATCH', 'INPUT_INVALID', 'CONFIG_INVALID',
  'SETUP_MISSING', 'SECRET_UNAVAILABLE', 'RESOLVER_CANCEL_UNCONFIRMED', 'SCOPE_UNKNOWN',
  'READ_DENIED_OR_MISSING', 'RETAINED_INCOMPLETE', 'WORK_INVALID', 'REFERENCE_INVALID', 'POINTER_UNKNOWN',
  'PAGE_INCOMPLETE', 'HISTORY_PAGE_INCOMPLETE', 'HISTORY_UNSUPPORTED', 'CHANGED_INPUT', 'RATE_LIMITED',
  'TLS_FAILED', 'REDIRECT_REJECTED', 'RESPONSE_INVALID', 'LIMIT_REACHED'
]);
const dimension = (status, code = null, details = {}) => ({ status, code, ...details });
const safeCode = code => safeReaderCodes.has(code) ? code : null;
const pick = (value, fields) => Object.fromEntries(fields.map(field => [field, value[field]]));
const revisions = snapshot => Object.fromEntries(['installation', 'stream', 'attempt'].map(key => [key, snapshot[key].revision]));
const confirmed = answer => answer?.status === 'confirmed' ? answer.data : null;

function summary(status, code, data = null) {
  const codes = new Set([code]);
  for (const value of Object.values(data ?? {})) if (value?.code && Object.hasOwn(messages, value.code)) codes.add(value.code);
  return {
    schema: 'pigboard-transition-inspection/v1', status, code,
    diagnostics: [...codes].map(code => ({ code, message: messages[code] })),
    writes: 0, execution_authorized: false, data
  };
}

export function rejectTransitionInspection(code) {
  if (!Object.hasOwn(initialCodes, code)) code = 'INSTALLATION_UNAVAILABLE';
  return summary(initialCodes[code], code);
}

function captureObservation(attempt) {
  const proof = transitionProof(attempt);
  const capture = attempt.extensions;
  const code = {
    none: 'ORIGINAL_CAPTURE_MISSING',
    unsupported: 'ORIGINAL_CAPTURE_UNSUPPORTED',
    prepared: 'ORIGINAL_RESPONSE_UNRECORDED'
  }[proof.state] ?? ([204, 409].includes(proof.http_status) ? null : 'ORIGINAL_RESPONSE_UNSUPPORTED');
  return {
    ...dimension(code ? 'held' : 'confirmed', code),
    ...proof,
    prepared_at: proof.request_digest ? capture.pb_capture_prepared_at : null,
    received_at: proof.request_digest ? capture.pb_capture_received_at : null,
    publication_digest: proof.request_digest ? capture.pb_capture_publication_digest : null,
    interpretation: ({ 204: 'success_reply', 409: 'rejection_reply' })[proof.http_status] ?? null
  };
}

function originalAuthority(attempt, authority) {
  const matchesCapture = readerBinding => readerBinding
    && ['installation_id', 'domain_id', 'site', 'configuration_digest'].every(key => readerBinding[key] === attempt[key])
    && readerBinding.package_revision === attempt.extensions.pb_capture_package_revision;
  if (matchesCapture(authority.binding)) return { source: 'current_receipt', original: null };
  if (matchesCapture(authority.original?.binding)) return { source: 'original_receipt', original: authority.original };
  return null;
}

function metadataMatches(attempt, companion, assignment) {
  const extension = attempt.extensions;
  const repair = attempt.operation === 'queue_repair';
  const pointer = { mode: repair ? 'preserved' : 'published', assignment };
  try {
    const rebuilt = prepareTransitionEvidence(attempt, extension.pb_capture_transition_id, { comments: companion.comments, pointer }, repair ? assignment : null);
    return proofEqual(rebuilt, companion) && rebuilt.request_digest === extension.pb_capture_request_digest
      && rebuilt.publication_digest === extension.pb_capture_publication_digest;
  } catch {
    return false;
  }
}

function historyObservation(history) {
  if (!history) return dimension('not_established');
  const items = [];
  let bytes = 0;
  for (const item of history.items) {
    const row = pick(item, ['issue_id', 'history_id', 'item_index', 'actor_id', 'from_status_id', 'to_status_id', 'created']);
    bytes += Buffer.byteLength(JSON.stringify(row)) + 1;
    if (bytes > maxHistoryDisplayBytes) break;
    items.push(row);
  }
  const complete = history.status === 'complete';
  const status = complete ? (history.items.length ? 'complete' : 'complete_empty')
    : (history.items.length || history.status === 'incomplete' ? 'incomplete' : 'unavailable');
  return dimension(status, complete ? null : 'HISTORY_UNAVAILABLE', {
    reader_code: safeCode(history.code), observed_count: history.items.length, items,
    truncated: items.length !== history.items.length,
    request_attribution: 'none'
  });
}

function observePublication(data, native, snapshot, assignment) {
  const publication = native.publication;
  const code = safeCode(publication.code);
  if (code === 'ASSIGNMENT_MISMATCH') {
    data.assignment = dimension('mismatch', 'ASSIGNMENT_MISMATCH', { source: 'native' });
    return;
  }

  const observed = native.publication_observations;
  if (observed) {
    data.assignment = dimension('matched', null, { source: 'native', ...observed.pointer });
    data.recorded_proof = dimension('confirmed');
    const attempt = snapshot.attempt;
    const capture = attempt.extensions;
    let agrees = false;
    try {
      const checked = transitionPublication(attempt, observed, assignment);
      agrees = checked.digest === capture.pb_capture_publication_digest
        && transitionRequestDigest(attempt, capture.pb_capture_transition_id, checked.digest) === capture.pb_capture_request_digest;
    } catch {
      // A changed or unsupported publication tuple cannot confirm the retained commitment.
    }
    data.publication = dimension(agrees ? 'confirmed' : 'mismatch', agrees ? null : 'PUBLICATION_MISMATCH', {
      commitment_matches: agrees,
      comments: observed.comments
    });
    return;
  }

  // This reader reports the following codes only after checking the native pointer.
  if (['PUBLICATION_METADATA_CHANGED', 'MANAGER_TARGET_MISMATCH', 'RETAINED_TUPLE_MISSING', 'RECORDED_PROOF_INVALID'].includes(code)) {
    data.assignment = dimension('matched', null, { source: 'native', assignment });
  }
  if (code === 'RECORDED_PROOF_INVALID') {
    data.recorded_proof = dimension('invalid', code);
    return;
  }
  if ((native.proof?.validation ?? native.proof)?.valid) data.recorded_proof = dimension('confirmed');
  const mismatch = ['PUBLICATION_METADATA_CHANGED', 'MANAGER_TARGET_MISMATCH', 'ISSUE_MISMATCH'].includes(code);
  data.publication = dimension(mismatch ? 'mismatch' : 'unavailable', mismatch ? 'PUBLICATION_MISMATCH' : 'PUBLICATION_UNAVAILABLE', { reader_code: code });
}

function observeJira(data, observation, snapshot, assignment, authority) {
  const native = observation.data;
  if (!observation.source && !native) {
    if (observation.code === 'AUTHORITY_MISSING') data.original_authority = dimension('held', 'ORIGINAL_AUTHORITY_MISSING');
    else if (observation.code === 'ASSIGNMENT_MISMATCH') data.assignment = dimension('retained_mismatch', 'ASSIGNMENT_MISMATCH', { source: 'retained' });
    else data.jira_acquisition = dimension('refused', 'JIRA_UNAVAILABLE', { reader_code: safeCode(observation.code) });
    return;
  }

  const reader = observation.diagnostics ?? [];
  const secretStatus = authority.recoverySecretOutcome();
  const secretFailed = observation.code === 'SECRET_UNAVAILABLE' || reader.some(row => row.code === 'SECRET_UNAVAILABLE' && row.operation === null);
  const limit = reader.find(row => row.code === 'LIMIT_REACHED' && row.operation !== 'changelog');
  const rejected = ['TLS_FAILED', 'REDIRECT_REJECTED', 'RATE_LIMITED'].includes(observation.code) ? observation.code : null;
  const cleanup = observation.cleanup?.resolver === 'cancel_unconfirmed';
  const requests = observation.counters?.requests_attempted ?? 0;
  const credentialCode = secretFailed && !cleanup && !(limit && secretStatus === 'not-called') ? ({
    RECOVERY_SECRET_IDENTITY_MISMATCH: 'RECOVERY_SECRET_IDENTITY_MISMATCH',
    RECOVERY_SECRET_DENIED: 'RECOVERY_SECRET_DENIED',
    RECOVERY_SECRET_UNAVAILABLE: 'RECOVERY_SECRET_UNAVAILABLE'
  }[secretStatus] ?? 'RECOVERY_SECRET_UNAVAILABLE') : null;
  if (credentialCode) data.recovery_credential = dimension('unavailable', credentialCode);
  else if (secretStatus === 'OK') data.recovery_credential = dimension('acquired');

  const acquisitionCode = cleanup ? 'JIRA_CLEANUP_UNCONFIRMED'
    : limit ? (['request_timeout_ms', 'scan_timeout_ms'].includes(limit.bound) ? 'JIRA_DEADLINE' : 'JIRA_LIMIT_REACHED')
      : (rejected ?? ((!native || !requests) && !credentialCode ? 'JIRA_UNAVAILABLE' : null));
  data.jira_acquisition = dimension(acquisitionCode || credentialCode ? 'unavailable' : 'acquired', acquisitionCode, {
    reader_code: safeCode(observation.code), requests_attempted: requests
  });
  if (credentialCode) return;
  if (requests) data.jira_observations = 'as_observed';
  for (const key of ['assignment', 'publication', 'recorded_proof', 'native_history']) data[key] = dimension('not_established');
  if (!native || !requests) return;

  observePublication(data, native, snapshot, assignment);
  data.native_history = historyObservation(native.history);
}

async function inspectEvidence({ data, state, selector, authority, snapshot }) {
  const { installation, stream, attempt } = snapshot;
  if (data.pending.code || !data.original_capture.request_digest) return;

  const original = originalAuthority(attempt, authority);
  data.original_authority = original
    ? dimension('confirmed', null, { source: original.source, configuration_digest: attempt.configuration_digest, package_revision: attempt.extensions.pb_capture_package_revision })
    : dimension('held', 'ORIGINAL_AUTHORITY_MISSING');
  const retained = await state.readNativePublication(selector);
  const companion = confirmed(retained)?.publication;
  if (!companion) {
    const code = retained.status === 'confirmed' ? 'ORIGINAL_METADATA_MISSING'
      : (retained.code === 'MALFORMED_RECORD' ? 'ORIGINAL_METADATA_MISMATCH' : 'ORIGINAL_METADATA_UNAVAILABLE');
    data.original_metadata = dimension('held', code);
    return;
  }
  const repair = attempt.operation === 'queue_repair';
  const manager = attempt.publication.find(row => row.ticket_id === attempt.ticket_id && row.record_id === attempt.attempt_id);
  const capture = attempt.extensions;
  if (!manager || companion.request_digest !== capture.pb_capture_request_digest || companion.publication_digest !== capture.pb_capture_publication_digest
    || (!repair && !metadataMatches(attempt, companion, manager))) {
    data.original_metadata = dimension('held', 'ORIGINAL_METADATA_MISMATCH');
    return;
  }
  if (!repair) data.original_metadata = dimension('confirmed');

  const inventory = confirmed(await state.readInventory({ limits: inventoryLimits }));
  const sameInstallation = inventory && isDeepStrictEqual(inventory.installation, installation);
  const sameStream = sameInstallation && inventory.streams.some(row => isDeepStrictEqual(row, stream));
  const sameAttempt = sameStream && inventory.pending_attempts.some(row => isDeepStrictEqual(row, attempt));
  if (!inventory?.complete || !sameAttempt) {
    data.inventory = dimension('incomplete', 'RETAINED_INVENTORY_INCOMPLETE');
    return;
  }
  let projected;
  try {
    projected = parseInventoryInput({ ...projectRetainedInventory(inventory), retained_complete: true });
  } catch {
    data.inventory = dimension('incomplete', 'RETAINED_INVENTORY_INCOMPLETE');
    return;
  }
  const intents = projected.pending_intents.filter(row => row.attempt_id === attempt.attempt_id || row.ticket_id === attempt.ticket_id);
  const members = projected.retained_members.filter(row => row.ticket_id === attempt.ticket_id);
  if (intents.length !== 1 || !['project_id', 'label', 'ticket_id', 'attempt_id'].every(key => intents[0][key] === attempt[key])
    || members.length !== 1 || !['project_id', 'epic_id', 'label'].every(key => members[0][key] === attempt[key])) {
    data.inventory = dimension('incomplete', 'RETAINED_INVENTORY_INCOMPLETE');
    return;
  }
  data.inventory = dimension('confirmed', null, { installation_revision: inventory.installation.revision });

  const assignment = members[0].assignment;
  if (!assignment || assignment.ticket_id !== attempt.ticket_id || proofEqual(assignment, manager) === repair) {
    data.assignment = dimension('retained_mismatch', 'ASSIGNMENT_MISMATCH', { source: 'retained' });
    return;
  }
  if (repair && !metadataMatches(attempt, companion, assignment)) {
    data.original_metadata = dimension('held', 'ORIGINAL_METADATA_MISMATCH');
    return;
  }
  data.original_metadata = dimension('confirmed');

  if (!original || !authority.recoverySecretConfigured) return;
  const reader = bindJiraReceipts({
    configInput: authority.configInput, resolveSecret: authority.resolveSecret,
    binding: authority.binding, original: original.original,
    state: {
      ...projected, attempt,
      retained: companion.comments.map(({ reference, ...metadata }) => ({ ...reference, ...metadata, site: companion.site }))
    }
  });
  const observation = await reader.readReconciliationFacts({ attempt, publicationReferences: attempt.publication, limits });
  observeJira(data, observation, snapshot, assignment, authority);
  return observation.data;
}

// The private facts are for trusted in-process composition. CLI callers receive only outcome.
export async function inspectTransition({ state, attemptId, authority, desired, schedule }) {
  const selector = { attempt_id: attemptId };
  const first = await state.readAttempt(selector);
  const snapshot = confirmed(first);
  if (!snapshot) {
    const code = first?.code === 'MISSING_INSTALLATION' ? 'INSTALLATION_UNAVAILABLE' : 'ATTEMPT_UNAVAILABLE';
    return { outcome: rejectTransitionInspection(code), evidence: null };
  }
  const { installation, stream, attempt } = snapshot;
  if (!authority || installation.configuration_digest !== authority.binding.configuration_digest
    || installation.package_revision !== authority.binding.package_revision) {
    return { outcome: rejectTransitionInspection('INSTALLATION_UNAVAILABLE'), evidence: null };
  }

  const desiredControls = pick(desired, controlFields);
  const appliedControls = pick(installation, controlFields);
  const observedSchedule = ['ENABLED', 'DISABLED'].includes(schedule) ? schedule : null;
  const pending = attempt.outcome === 'pending' && stream.pending_attempt_id === attempt.attempt_id;
  const data = {
    attempt_id: attempt.attempt_id, pending_attempt_id: stream.pending_attempt_id, state_outcome: attempt.outcome,
    revisions: revisions(snapshot), desired_controls: desiredControls, applied_controls: appliedControls,
    observed_schedule: observedSchedule,
    controls_match: isDeepStrictEqual(desiredControls, appliedControls),
    schedule_matches_applied: observedSchedule === null ? null : (observedSchedule === 'ENABLED') === appliedControls.schedule_enabled,
    pending: dimension(pending ? 'held' : 'ineligible', pending ? null : 'ATTEMPT_NOT_PENDING'),
    original_capture: captureObservation(attempt), original_authority: dimension('not_established'),
    original_metadata: dimension('not_established'), inventory: dimension('not_consulted'),
    recovery_credential: authority.recoverySecretConfigured ? dimension('not_consulted') : dimension('unavailable', 'RECOVERY_SECRET_MISSING'),
    jira_acquisition: dimension('not_consulted'), assignment: dimension('not_consulted'),
    publication: dimension('not_consulted'), recorded_proof: dimension('not_consulted'),
    native_history: dimension('not_consulted'), jira_observations: 'not_consulted',
    current_agreement: 'unknown', state_fence: dimension('unknown', 'STATE_FENCE_UNAVAILABLE')
  };

  let native;
  try {
    native = await inspectEvidence({ data, state, selector, authority, snapshot });
  } catch {
    data.jira_acquisition = dimension('unavailable', 'JIRA_UNAVAILABLE');
  }
  try {
    const closing = await state.readAttempt(selector);
    const after = confirmed(closing);
    if (after && ['installation', 'stream', 'attempt'].every(key => isDeepStrictEqual(after[key], snapshot[key]))) {
      data.state_fence = dimension('confirmed');
      if (data.publication.status === 'confirmed') data.current_agreement = 'confirmed';
      else if (data.publication.status === 'mismatch' || data.assignment.status === 'mismatch') data.current_agreement = 'mismatch';
    } else if (after || ['REVISION_CONFLICT', 'BINDING_MISMATCH'].includes(closing?.code)) {
      data.state_fence = dimension('stale', 'STATE_CHANGED');
      data.current_agreement = 'stale';
    }
  } catch {
    // The initial revisions remain as-observed when the closing read fails.
  }
  if (data.state_fence.code && data.jira_observations === 'as_observed') data.jira_observations = 'provisional';

  const precedence = [
    'state_fence', 'pending', 'original_capture', 'original_authority', 'original_metadata', 'inventory',
    'recovery_credential', 'jira_acquisition', 'assignment', 'publication', 'recorded_proof', 'native_history'
  ];
  const code = precedence.map(key => data[key].code).find(Boolean);
  const outcome = summary(code ? 'partial' : 'complete', code ?? 'OK', data);
  return { outcome, evidence: !code && native ? { snapshot, native } : null };
}
