import test from 'node:test';
import assert from 'node:assert/strict';
import { reconciliationContext, reconciliationCase } from '../scripts/test-manager-state.mjs';
import { operatorActorId, validOperatorActor, parseReconciliationRequest, completedStop, transitionProof } from '../lib/state/contract.mjs';

test('original H01 positive204/409 finalizes only named attempt and retains disabled stop/capture', async () => {
  const packet = await reconciliationCase('R1-15-H01'); assert.equal(packet.traces.length, 2);
  for (const trace of packet.traces) {
    assert.equal(trace.output.outcome.status, 'confirmed');
    const { installation, stream, attempt } = trace.inspected.data;
    assert.equal(installation.schedule_enabled, false); assert.equal(installation.writes_enabled, false); assert.equal(installation.maintenance, true);
    assert.equal(installation.extensions.unrelated_flag, true); assert.equal(stream.pending_attempt_id, null);
    assert.equal(transitionProof(attempt).state, 'response-captured');
    assert.notEqual(attempt.configuration_digest, installation.configuration_digest, 'original capture config is distinct from stopped config');
    assert.equal(attempt.evidence.actor_id.startsWith('aws:'), true);
    assert.equal(trace.service_audit.jira_mutations + trace.service_audit.worker_calls, 0);
  }
});
test('original H02 seven variants remain held, including valid capture with unavailable history', async () => {
  const packet = await reconciliationCase('R1-15-H02'); assert.equal(packet.traces.length, 7);
  const history = packet.traces.find(t => t.variant === 'absent_history');
  assert.equal(history.output.outcome.code, 'HISTORY_UNAVAILABLE'); assert.equal(history.before, history.after);
  assert.equal(transitionProof(history.inspected.data.attempt).state, 'response-captured');
  assert.equal(packet.actual82_history_transport, 'unavailable'); assert.equal(packet.human_acceptance, 'pending');
});
test('history status and overall completeness remain explicit; empty complete history is supported', async () => {
  for (const variant of ['missing', 'incomplete', 'contradictory']) {
    const c = await reconciliationContext(); const before = c.provider.snapshot();
    if (variant === 'missing') delete c.jira.data.history;
    if (variant === 'incomplete') { c.jira.data.history.status = 'incomplete'; c.jira.status = 'incomplete'; c.jira.data.complete = false; }
    if (variant === 'contradictory') c.jira.data.complete = false;
    const answer = await c.command(); assert.equal(answer.exitCode, 1); assert.equal(c.provider.snapshot(), before);
    assert.equal(answer.outcome.code, variant === 'missing' ? 'HISTORY_UNAVAILABLE' : variant === 'incomplete' ? 'HISTORY_INCOMPLETE' : 'PUBLICATION_MISMATCH');
  }
  const complete = await reconciliationContext(409); assert.deepEqual(complete.jira.data.history, { status: 'complete', items: [] });
  assert.equal((await complete.command()).outcome.status, 'confirmed');
});
test('missing private capability or changed bound projection never grants terminal authority', async () => {
  for (const port of ['readBoundRuntime', 'projectBoundRuntime', 'readReconciliationFacts']) {
    const c = await reconciliationContext(), before = c.provider.snapshot();
    const answer = await c.command({}, true, { ...c.capabilities, [port]: undefined });
    assert.equal(answer.outcome.code, 'CORE_PREREQUISITE'); assert.equal(answer.exitCode, 2); assert.equal(c.provider.snapshot(), before);
  }
  const c = await reconciliationContext(), before = c.provider.snapshot(); c.runtime.scheduler.delivery_bound_ms++;
  assert.equal((await c.command()).outcome.code, 'BOUNDS_UNSUPPORTED'); assert.equal(c.provider.snapshot(), before);
});
test('exact native principal encoding is reversible, bounded and not a truncated/hash identity', async () => {
  const actor = operatorActorId({ account_id: '123456789012', user_id: 'AROA:session' }); assert(validOperatorActor(actor));
  assert(!validOperatorActor(actor + '=')); assert(!validOperatorActor('aws:arbitrary'));
  assert.throws(() => operatorActorId({ account_id: '123456789012', user_id: 'a'.repeat(187) }), e => e.stateResult.code === 'OPERATOR_ID_UNSUPPORTED');
  const c = await reconciliationContext(); const stop = completedStop(c.records().installation, c.binding);
  assert.equal(stop.pb_stop_id, c.f.stop_id);
  c.provider.seed({ ...c.records().installation, extensions: { ...c.records().installation.extensions, pb_stop_bounds_digest: 'sha256:' + 'e'.repeat(64) } });
  assert.equal((await c.command()).outcome.code, 'DRAIN_INCOMPLETE');
});
test('conditional terminal persistence uncertainty is not replayed and reinspects actual outcome', async () => {
  for (const fault of ['before', 'after']) {
    const c = await reconciliationContext(), before = c.provider.snapshot(), writes = c.provider.audit.filter(a => a.name === 'TransactWriteCommand').length;
    c.provider.fault = fault; const answer = await c.command();
    assert.equal(answer.outcome.status, 'uncertain'); assert.equal(answer.outcome.data, null); assert.equal(answer.exitCode, 2);
    assert.equal(c.provider.audit.filter(a => a.name === 'TransactWriteCommand').length, writes + 1);
    const read = await c.inspect(); assert.equal(read.data.attempt.outcome, fault === 'before' ? 'pending' : 'applied');
    if (fault === 'before') assert.equal(c.provider.snapshot(), before);
    assert.equal(c.audit.jira_mutations + c.audit.worker_calls, 0);
  }
});
test('queue retained member read is fenced against concurrent changes before evaluation', async () => {
  const c = await reconciliationContext(); const attempt = c.records().attempt;
  c.provider.seed({ ...attempt, operation: 'queue_repair' });
  const original = c.state.inspect.bind(c.state); let memberRead = false;
  c.state.inspect = async input => { const output = await original(input); if (input.kind === 'member') { memberRead = true; const i = c.records().installation; c.provider.seed({ ...i, revision: i.revision + 1 }); } return output; };
  const { reconcile } = await import('../lib/manager/reconcile.mjs');
  const answer = await reconcile({ request: c.request(), binding: c.binding, canonicalConfig: c.f.canonicalConfig, state: c.state }, c.capabilities);
  assert(memberRead); assert.equal(answer.code, 'REVISION_CONFLICT'); assert.equal(c.audit.jira_reads, 0);
});
test('reconciliation request rejects duplicate, unknown and non-JSON authority fields', () => {
  assert.throws(() => parseReconciliationRequest('{"schema":"x","schema":"y"}'));
  assert.throws(() => parseReconciliationRequest('schema: pigboard-reconciliation-request/v1'));
  assert.throws(() => parseReconciliationRequest('{"drained":true}'));
});
