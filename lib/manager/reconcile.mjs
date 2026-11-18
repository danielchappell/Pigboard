import { inspectTransition } from './inspect-transition.mjs';
import { operatorRequestDigest, proofEqual, reconciliationRequestSchema, result, transitionProof, valid } from '../state/contract.mjs';

const held = code => result('conflict', code);
const snapshotFields = ['installation', 'stream', 'attempt'];

function matchesRequest(snapshot, request) {
  return snapshot.attempt.attempt_id === request.attempt_id && snapshot.attempt.outcome === 'pending'
    && snapshot.stream.pending_attempt_id === request.attempt_id
    && snapshotFields.every(field => snapshot[field].revision === request['expected_' + field + '_revision']);
}

function checkCapture(attempt, disposition) {
  const proof = transitionProof(attempt);
  if (proof.state === 'none') return held('CAPTURE_MISSING');
  if (proof.state === 'prepared') return held('ORIGINAL_RESPONSE_UNRECORDED');
  if (proof.state !== 'response-captured' || proof.http_status !== (disposition === 'confirmed_applied' ? 204 : 409)) {
    return held('CAPTURE_UNSUPPORTED');
  }
  return result();
}

export function assessReconciliation({ request, snapshot, evidence }) {
  if (!evidence || !snapshotFields.every(field => proofEqual(snapshot[field], evidence.snapshot?.[field]))
    || !matchesRequest(snapshot, request)) return held('REVISION_CONFLICT');
  const { native } = evidence;
  if (native?.history?.status !== 'complete' || !Array.isArray(native.history.items)) return held('HISTORY_UNAVAILABLE');
  const proof = native.proof?.validation ?? native.proof;
  const reference = snapshot.attempt.publication.find(row => row.ticket_id === snapshot.attempt.ticket_id && row.record_id === request.attempt_id);
  if (native.complete !== true || native.publication?.status !== 'complete' || proof?.valid !== true
    || !reference || !proofEqual(proof.target, reference) || !native.publication_observations?.pointer) return held('PUBLICATION_MISMATCH');
  return checkCapture(snapshot.attempt, request.disposition);
}

function historical(readback, request, binding) {
  if (readback.status !== 'confirmed') return readback;
  const { attempt, operator_decision: decision } = readback.data;
  if (!decision) return null;
  if (decision.operator_request_digest !== operatorRequestDigest(binding, request)) return held('ALREADY_SETTLED_CONFLICT');
  return result('confirmed', 'ALREADY_SETTLED', { attempt, operator_decision: decision });
}

export async function reconcile({ request, resolved, inspectionState, operatorState }) {
  try {
    if (!valid(request, reconciliationRequestSchema)) return result('invalid', 'INVALID_INPUT');
    const selector = { attempt_id: request.attempt_id };
    const initial = await operatorState.readDecision(selector);
    const prior = historical(initial, request, resolved.binding);
    if (prior) return prior;
    if (initial.data.attempt.outcome !== 'pending') return held('OPERATOR_PROVENANCE_ABSENT');
    if (typeof resolved.checkReconciliationStop !== 'function' || typeof resolved.getEvidenceAuthority !== 'function') {
      return result('unavailable', 'CORE_PREREQUISITE');
    }
    const read = await inspectionState.readAttempt(selector);
    if (read.status !== 'confirmed') return read;
    const snapshot = read.data;
    if (!matchesRequest(snapshot, request) || !proofEqual(snapshot.attempt, initial.data.attempt)) return held('REVISION_CONFLICT');
    const before = await resolved.checkReconciliationStop(snapshot.installation);
    if (before.status !== 'confirmed') return before;
    const capture = checkCapture(snapshot.attempt, request.disposition);
    if (capture.status !== 'confirmed') return capture;

    const { outcome, evidence } = await inspectTransition({ state: inspectionState, attemptId: request.attempt_id,
      authority: await resolved.getEvidenceAuthority(), desired: resolved.control, schedule: resolved.observed?.schedule?.State });
    if (outcome.status !== 'complete' || outcome.code !== 'OK') {
      const code = outcome.code === 'STATE_CHANGED' ? 'REVISION_CONFLICT' : outcome.code;
      const refused = held(code);
      return { ...refused, diagnostics: outcome.diagnostics };
    }
    if (outcome.data.controls_match !== true || outcome.data.schedule_matches_applied !== true) return held('CONTROL_MISMATCH');
    const assessed = assessReconciliation({ request, snapshot, evidence });
    if (assessed.status !== 'confirmed') return assessed;
    const after = await resolved.checkReconciliationStop(evidence.snapshot.installation);
    if (after.status !== 'confirmed') return after;
    if (!proofEqual(before.data.stop, after.data.stop)) return held('DRAIN_INCOMPLETE');

    const written = await operatorState.reconcileAttempt({ request, snapshot: evidence.snapshot, stop: after.data.stop, now: after.data.observed_at });
    if (written.status !== 'uncertain' && written.code !== 'REVISION_CONFLICT') return written;
    // A concurrent settlement or a lost acknowledgement may have committed the four rows.
    const readback = await operatorState.readDecision(selector);
    if (readback.status === 'confirmed' && readback.data.operator_decision) return historical(readback, request, resolved.binding);
    if (written.status === 'conflict' && readback.status === 'confirmed') return written;
    return result('uncertain', 'UNCERTAIN_WRITE');
  } catch (error) { return error.stateResult ?? result('unavailable', 'UNAVAILABLE'); }
}
