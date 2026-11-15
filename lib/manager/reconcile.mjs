import { valid, reconciliationRequestSchema, result, proofEqual, transitionProof, transitionPublication, recordId } from '../state/contract.mjs';
import { validateReceiptChain } from '../contracts/receipts.mjs';
import { extractHandoff, validateHandoff } from '../contracts/handoff.mjs';
import { resolveProjects } from '../config/projects.mjs';
import { readReconciliationContext } from '../aws/reconcile-context.mjs';

const held = code => result('conflict', code);
/** Data-only assessment. Provenance comes from trusted package composition, not
 * any public supplied receipt, completeness flag or digest. */
export function assessReconciliation({ request, stateView, operatorObservation, jiraObservation }) {
  try {
    if (!valid(request, reconciliationRequestSchema)) return result('invalid', 'INVALID_INPUT');
    if (operatorObservation?.status !== 'confirmed') return operatorObservation ?? result('unavailable', 'CORE_PREREQUISITE');
    const { installation, stream, attempt } = stateView, context = operatorObservation.data;
    if (attempt.attempt_id !== request.attempt_id || installation.revision !== request.expected_installation_revision || stream.revision !== request.expected_stream_revision || attempt.revision !== request.expected_attempt_revision || attempt.outcome !== 'pending' || stream.pending_attempt_id !== attempt.attempt_id) return held('REVISION_CONFLICT');
    const source = jiraObservation, jira = source?.data;
    if (!jira?.history || jira.history.status === 'unavailable') return held('HISTORY_UNAVAILABLE');
    if (jira.history.status !== 'complete' || !Array.isArray(jira.history.items)) return held('HISTORY_INCOMPLETE');
    if (!['complete', 'unavailable', 'incomplete', 'unsupported'].includes(source.status) || jira.complete !== (source.status === 'complete') || source.status !== 'complete' || !source.source || typeof source.source !== 'object') return held('PUBLICATION_MISMATCH');
    const proof = transitionProof(attempt);
    if (proof.state !== 'response-captured') return held(proof.state === 'unsupported' ? 'CAPTURE_UNSUPPORTED' : 'CAPTURE_MISSING');
    if (proof.http_status !== (request.disposition === 'confirmed_applied' ? 204 : 409)) return held('CAPTURE_UNSUPPORTED');
    const input = jira.receipt_input;
    if (!input || input.consumer !== 'manager' || input.trusted?.site !== attempt.site) return held('PUBLICATION_MISMATCH');
    const scope = resolveProjects(context.canonicalConfig), project = scope.projects.find(p => p.id === attempt.project_id);
    if (!project || scope.site !== attempt.site) return held('PUBLICATION_MISMATCH');
    for (const supplied of input.trusted.projects ?? []) {
      const actual = scope.projects.find(p => p.id === supplied.id);
      if (!actual || ['actors', 'stages', 'repositories', 'accepted_later_stage_ids'].some(k => !proofEqual(supplied[k], actual[k]))) return held('PUBLICATION_MISMATCH');
    }
    const issue = input.issues?.find(i => i.id === attempt.ticket_id);
    if (!issue || issue.site !== attempt.site || issue.project_id !== attempt.project_id || issue.stream !== attempt.label || !proofEqual(issue.pointer?.assignment, jira.publication_observations?.pointer?.assignment)) return held('POINTER_MISMATCH');
    const publication = transitionPublication(attempt, jira.publication_observations, stateView.retained_assignment ?? null);
    if (publication.digest !== attempt.extensions.pb_capture_publication_digest) return held('PUBLICATION_MISMATCH');
    const managerReference = attempt.publication.find(r => r.record_id === attempt.attempt_id && r.ticket_id === attempt.ticket_id);
    if (!managerReference || !proofEqual(input.target, managerReference)) return held('PUBLICATION_MISMATCH');
    for (const observation of jira.publication_observations.comments) {
      const comments = (input.comment_pages ?? []).filter(p => p.site === attempt.site && p.ticket_id === observation.reference.ticket_id).flatMap(p => p.comments);
      const native = comments.find(c => c.id === observation.reference.comment_id);
      if (!native || ['author_id', 'update_author_id', 'created', 'updated'].some(k => native[k] !== observation[k])) return held('PUBLICATION_MISMATCH');
      if (!validateHandoff(native.body, { format: native.format }).valid) return held('PUBLICATION_MISMATCH');
      const record = extractHandoff(native.body, { format: native.format });
      if (record.record_digest !== observation.reference.digest || record.value.record_id !== observation.reference.record_id || record.value.ticket_id !== observation.reference.ticket_id) return held('PUBLICATION_MISMATCH');
      if (observation.reference.record_id === attempt.attempt_id && (record.value.operation_id !== attempt.attempt_id || record.value.role !== 'manager' || record.value.kind !== (attempt.operation === 'queue_repair' ? 'stack_update_request' : 'admission') || attempt.operation !== 'queue_repair' && (record.value.payload.project_id !== attempt.project_id || record.value.payload.stream !== attempt.label) || project.stages[record.value.from_stage] !== attempt.source_status_id || project.stages[record.value.to_stage] !== attempt.target_status_id)) return held('PUBLICATION_MISMATCH');
    }
    if (!validateReceiptChain(JSON.stringify(input)).valid) return held('PUBLICATION_MISMATCH');
    return result('confirmed', 'OK', { attempt_id: attempt.attempt_id, expected_installation_revision: installation.revision, expected_stream_revision: stream.revision, expected_attempt_revision: attempt.revision, stop_id: context.stop.pb_stop_id, request_digest: proof.request_digest, publication_digest: publication.digest, disposition: request.disposition, actor_id: context.actor_id, now: context.observed_at });
  } catch (error) { return error.stateResult ?? held('PUBLICATION_MISMATCH'); }
}
export async function reconcile({ request, binding, canonicalConfig, state }, capabilities = {}) {
  try {
    if (!valid(request, reconciliationRequestSchema)) return result('invalid', 'INVALID_INPUT');
    if (typeof capabilities.readReconciliationFacts !== 'function' || typeof capabilities.readBoundRuntime !== 'function' || typeof capabilities.projectBoundRuntime !== 'function' || !capabilities.limits || typeof capabilities.limits !== 'object') return result('unavailable', 'CORE_PREREQUISITE');
    const read = await state.readAttempt({ attempt_id: request.attempt_id }); if (read.status !== 'confirmed') return read;
    const stateView = read.data;
    if (stateView.attempt.operation === 'queue_repair') {
      const member = await state.inspect({ kind: 'member', record_id: recordId('member', stateView.attempt) });
      const record = member.data?.records?.[0];
      if (member.status !== 'confirmed' || !record || ['site', 'project_id', 'label', 'epic_id', 'ticket_id'].some(k => record[k] !== stateView.attempt[k])) return held('PUBLICATION_MISMATCH');
      const fence = await state.readAttempt({ attempt_id: request.attempt_id });
      if (fence.status !== 'confirmed' || !proofEqual(fence.data.installation, stateView.installation) || !proofEqual(fence.data.stream, stateView.stream) || !proofEqual(fence.data.attempt, stateView.attempt)) return held('REVISION_CONFLICT');
      stateView.retained_assignment = record.assignment;
    }
    const operatorObservation = await readReconciliationContext({ binding, canonicalConfig, state, stateView }, capabilities);
    if (operatorObservation.status !== 'confirmed') return operatorObservation;
    const jiraObservation = await capabilities.readReconciliationFacts({ attempt: stateView.attempt, publicationReferences: stateView.attempt.publication, limits: capabilities.limits });
    const assessed = assessReconciliation({ request, stateView, operatorObservation, jiraObservation });
    return assessed.status === 'confirmed' ? state.reconcileAttempt(assessed.data) : assessed;
  } catch (error) { return error.stateResult ?? result('unavailable', 'UNAVAILABLE'); }
}
