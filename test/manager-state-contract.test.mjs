import test from 'node:test';
import assert from 'node:assert/strict';
import { createDynamoState } from '../lib/aws/dynamodb.mjs';
import { recordId, projectRetainedInventory, transitionPublication, transitionRequestDigest, transitionProof, CAPTURE_KEYS } from '../lib/state/contract.mjs';
import { transitionFixture, proofFixture, expectedCommitment } from '../scripts/test-transition-proof.mjs';
import { fixture, prepared, beginInput, finalizeInput, allLimits, row } from './helpers/state-provider.mjs';

// Future adapters run these same observable invariants through their own disposable
// provider harness. Fault/fixture setup belongs to the harness, never the state API.
export function stateConformance(name, make) {
  test(name + ': disabled initialization and four bounded record kinds', async () => {
    const { state, provider, disabled } = await make();
    assert.equal((await disabled.initialize({ fresh_installation: fixture.fresh, now: fixture.now })).code, 'ALREADY_INITIALIZED');
    assert.equal((await state.begin(beginInput())).status, 'confirmed');
    assert.equal((await state.finalize(finalizeInput())).status, 'confirmed');
    provider.disable();
    for (const kind of ['installation', 'stream', 'attempt', 'member']) {
      const result = await disabled.inspect({ kind });
      assert.equal(result.status, 'confirmed'); assert.equal(result.data.records.length, 1);
    }
    const before = provider.snapshot();
    assert.equal((await disabled.readInventory({ limits: allLimits })).status, 'confirmed');
    assert.equal(provider.snapshot(), before);
    const history = await disabled.readAttempt({ attempt_id: fixture.attemptA.attempt_id });
    assert.equal(history.data.attempt.outcome, 'applied');
  });
  test(name + ': competing expected revisions have one atomic winner', async () => {
    const { state, provider } = await make();
    const other = beginInput({ attempt: { ...fixture.attemptA, attempt_id: '33333333-3333-4333-8333-333333333333' } });
    const results = await Promise.all([state.begin(beginInput()), state.begin(other)]);
    assert.equal(results.filter(r => r.status === 'confirmed').length, 1);
    assert.equal(results.filter(r => r.status === 'conflict').length, 1);
    assert.deepEqual(provider.records().map(r => r.kind).sort(), ['attempt', 'installation', 'member', 'stream']);
    const attempt = provider.records().find(r => r.kind === 'attempt');
    assert.equal(row(provider, 'stream', fixture.streamA).pending_attempt_id, attempt.attempt_id);
    assert.equal(row(provider, 'installation', fixture.binding).revision, 1);
  });
  for (const operation of ['begin', 'finalize']) for (const fault of ['before', 'after']) {
    test(name + ': ' + operation + ' ' + fault + ' persistence is uncertain and atomic', async () => {
      const { state, provider } = await make();
      if (operation === 'finalize') assert.equal((await state.begin(beginInput())).status, 'confirmed');
      const before = provider.snapshot(); provider.fault = fault;
      const result = await state[operation](operation === 'begin' ? beginInput() : finalizeInput());
      assert.equal(result.status, 'uncertain'); assert.equal(result.data, null);
      assert.equal(provider.audit.filter(a => a.name === 'TransactWriteCommand').length, operation === 'begin' ? 2 : 3, 'no implicit retry');
      if (fault === 'before') assert.equal(provider.snapshot(), before);
      else if (operation === 'begin') {
        assert.equal(provider.records().length, 4);
        assert.equal(row(provider, 'stream', fixture.streamA).pending_attempt_id, fixture.attemptA.attempt_id);
        assert.equal((await state.readAttempt({ attempt_id: fixture.attemptA.attempt_id })).data.attempt.outcome, 'pending');
      } else {
        assert.equal(provider.records().length, 4);
        assert.equal(row(provider, 'stream', fixture.streamA).pending_attempt_id, null);
        assert.equal((await state.readAttempt({ attempt_id: fixture.attemptA.attempt_id })).data.attempt.outcome, 'applied');
      }
    });
  }
  test(name + ': stale finalizer never clears a newer pending reference', async () => {
    const { state, provider } = await make();
    assert.equal((await state.begin(beginInput())).status, 'confirmed');
    assert.equal((await state.finalize(finalizeInput())).status, 'confirmed');
    const nextId = '33333333-3333-4333-8333-333333333333';
    assert.equal((await state.begin(beginInput({ expected_installation_revision: 2, expected_stream_revision: 1, attempt: { ...fixture.attemptA, attempt_id: nextId }, required_members: [{ ...fixture.memberA, expected_revision: 0 }] }))).status, 'confirmed');
    const before = provider.snapshot();
    assert.equal((await state.finalize(finalizeInput())).status, 'conflict');
    assert.equal((await state.finalize(finalizeInput({ expected_installation_revision: 3, expected_stream_revision: 2 }))).status, 'conflict');
    assert.equal(provider.snapshot(), before); assert.equal(row(provider, 'stream', fixture.streamA).pending_attempt_id, nextId);
    assert.equal(provider.records().filter(r => r.kind === 'attempt').length, 2);
  });
  test(name + ': begin checks existing assignment without changing it', async () => {
    const { state, provider } = await make();
    assert.equal((await state.retainMembers({ expected_installation_revision: 0, members: [fixture.memberA], now: fixture.now })).status, 'confirmed');
    const before = provider.snapshot(), writes = provider.audit.filter(a => a.name === 'TransactWriteCommand').length;
    const mismatch = await state.begin(beginInput({ expected_installation_revision: 1, required_members: [{ ...fixture.memberA, expected_revision: 0, assignment: fixture.evidence.references[0] }] }));
    assert.equal(mismatch.status, 'conflict'); assert.equal(mismatch.code, 'REVISION_CONFLICT'); assert.equal(mismatch.data, null);
    assert.equal(provider.snapshot(), before); assert.equal(provider.audit.filter(a => a.name === 'TransactWriteCommand').length, writes);
    const matching = await state.begin(beginInput({ expected_installation_revision: 1, required_members: [{ ...fixture.memberA, expected_revision: 0 }] }));
    assert.equal(matching.status, 'confirmed');
    assert.equal(row(provider, 'member', fixture.memberA).assignment, null); assert.equal(row(provider, 'member', fixture.memberA).revision, 0);
    assert.equal(row(provider, 'stream', fixture.streamA).pending_attempt_id, fixture.attemptA.attempt_id);
    assert.equal(row(provider, 'attempt', fixture.attemptA).outcome, 'pending');

    const nonNull = await make();
    const assignment = fixture.evidence.references[0];
    assert.equal((await nonNull.state.retainMembers({ expected_installation_revision: 0, members: [{ ...fixture.memberA, assignment }], now: fixture.now })).status, 'confirmed');
    const stored = row(nonNull.provider, 'member', fixture.memberA);
    nonNull.provider.seed({ ...stored, extensions: { later_flag: true } });
    const unchangedMember = row(nonNull.provider, 'member', fixture.memberA);
    const reordered = Object.fromEntries(Object.entries(assignment).reverse());
    assert.deepEqual(reordered, unchangedMember.assignment);
    assert.notEqual(JSON.stringify(reordered), JSON.stringify(unchangedMember.assignment));
    const nonNullBefore = nonNull.provider.snapshot(), nonNullWrites = nonNull.provider.audit.filter(a => a.name === 'TransactWriteCommand').length;
    const nonNullCalls = nonNull.provider.audit.length;
    const crossTicket = await nonNull.state.begin(beginInput({ expected_installation_revision: 1, required_members: [{ ...fixture.memberA, expected_revision: 0, assignment: { ...assignment, ticket_id: '1002' } }] }));
    assert.equal(crossTicket.status, 'invalid'); assert.equal(crossTicket.code, 'INVALID_INPUT'); assert.equal(crossTicket.data, null);
    assert.equal(nonNull.provider.snapshot(), nonNullBefore); assert.equal(nonNull.provider.audit.length, nonNullCalls);
    for (const [field, value] of Object.entries({ comment_id: '701', record_id: '33333333-3333-4333-8333-333333333333', digest: 'sha256:' + 'b'.repeat(64) })) {
      const changed = await nonNull.state.begin(beginInput({ expected_installation_revision: 1, required_members: [{ ...fixture.memberA, expected_revision: 0, assignment: { ...assignment, [field]: value } }] }));
      assert.equal(changed.status, 'conflict', field); assert.equal(changed.code, 'REVISION_CONFLICT', field); assert.equal(changed.data, null, field);
      assert.equal(nonNull.provider.snapshot(), nonNullBefore, field);
      assert.equal(nonNull.provider.audit.filter(a => a.name === 'TransactWriteCommand').length, nonNullWrites, field);
    }
    assert.equal((await nonNull.state.begin(beginInput({ expected_installation_revision: 1, required_members: [{ ...fixture.memberA, expected_revision: 0, assignment: reordered }], now: '2026-11-15T12:01:00.000Z' }))).status, 'confirmed');
    assert.deepEqual(row(nonNull.provider, 'member', fixture.memberA), unchangedMember);
    assert.equal(row(nonNull.provider, 'installation', fixture.binding).revision, 2);
    assert.equal(row(nonNull.provider, 'stream', fixture.streamA).pending_attempt_id, fixture.attemptA.attempt_id);
    assert.equal(row(nonNull.provider, 'attempt', fixture.attemptA).outcome, 'pending');
  });
  test(name + ': original membership persists while assignment can advance', async () => {
    const { state, provider } = await make();
    assert.equal((await state.retainMembers({ expected_installation_revision: 0, members: [fixture.memberA], now: fixture.now })).status, 'confirmed');
    const original = row(provider, 'member', fixture.memberA);
    provider.seed({ ...original, extensions: { later_flag: true } });
    const advanced = { ...fixture.memberA, expected_revision: 0, assignment: fixture.evidence.references[0] };
    assert.equal((await state.retainMembers({ expected_installation_revision: 1, members: [advanced], now: fixture.now })).status, 'confirmed');
    assert.deepEqual(row(provider, 'member', fixture.memberA).assignment, fixture.evidence.references[0]);
    assert.equal(row(provider, 'member', fixture.memberA).revision, 1);
    assert.equal(row(provider, 'member', fixture.memberA).extensions.later_flag, true);
    const unchangedMember = row(provider, 'member', fixture.memberA);
    const reordered = Object.fromEntries(Object.entries(advanced.assignment).reverse());
    assert.deepEqual(reordered, unchangedMember.assignment);
    assert.notEqual(JSON.stringify(reordered), JSON.stringify(unchangedMember.assignment));
    assert.equal((await state.retainMembers({ expected_installation_revision: 2, members: [{ ...advanced, expected_revision: 1, assignment: reordered }], now: '2026-11-15T12:01:00.000Z' })).status, 'confirmed');
    const actions = provider.audit.filter(a => a.name === 'TransactWriteCommand').at(-1).input.TransactItems;
    const memberActions = actions.filter(action => Object.values(action)[0].Key?.SK === 'M#' + unchangedMember.record_id);
    assert.equal(memberActions.length, 1); assert.ok(memberActions[0].ConditionCheck);
    assert.deepEqual(row(provider, 'member', fixture.memberA), unchangedMember);
    assert.equal(row(provider, 'installation', fixture.binding).revision, 3);
    const changedAssignment = { ...advanced.assignment, comment_id: '701' };
    assert.equal((await state.retainMembers({ expected_installation_revision: 3, members: [{ ...advanced, expected_revision: 1, assignment: changedAssignment }], now: '2026-11-15T12:02:00.000Z' })).status, 'confirmed');
    assert.deepEqual(row(provider, 'member', fixture.memberA), { ...unchangedMember, assignment: changedAssignment, revision: 2, updated_at: '2026-11-15T12:02:00.000Z' });
    assert.equal(row(provider, 'installation', fixture.binding).revision, 4);
    const before = provider.snapshot();
    assert.equal((await state.retainMembers({ expected_installation_revision: 4, members: [{ ...advanced, expected_revision: 2, assignment: changedAssignment, label: 'AI-Maria-2' }], now: fixture.now })).code, 'OWNERSHIP_CONFLICT');
    assert.equal(provider.snapshot(), before); assert.equal(provider.records().filter(r => r.kind === 'member').length, 1);
  });
  test(name + ': equal labels in two projects retain independent pending occupancy', async () => {
    const { state, provider } = await make();
    assert.equal((await state.begin(beginInput())).status, 'confirmed');
    const streamB = { ...fixture.streamA, project_id: '200' };
    const attemptB = { ...fixture.attemptA, attempt_id: '33333333-3333-4333-8333-333333333333', ticket_id: '2001', epic_id: '2000', issue_key: 'BBB-1' };
    const memberB = { ...fixture.memberA, ...streamB, ticket_id: '2001', epic_id: '2000' };
    assert.equal((await state.begin(beginInput({ expected_installation_revision: 1, stream: streamB, attempt: attemptB, required_members: [memberB] }))).status, 'confirmed');
    const before = provider.snapshot();
    assert.equal((await state.finalize(finalizeInput({ expected_installation_revision: 2, stream: streamB }))).status, 'conflict');
    assert.equal(provider.snapshot(), before);
    const inventory = await state.readInventory({ limits: allLimits });
    assert.equal(inventory.data.streams.length, 2); assert.equal(inventory.data.pending_attempts.length, 2);
    assert.notEqual(recordId('stream', fixture.streamA), recordId('stream', streamB));
    const projection = projectRetainedInventory(inventory.data);
    assert.equal(projection.retained_members.length, 2); assert.equal(projection.pending_intents[0].project_id, '100');
  });
  test(name + ': targeted finalization preserves compatible extension fields', async () => {
    const { state, provider } = await make(); await state.begin(beginInput());
    for (const record of provider.records()) provider.seed({ ...record, extensions: { future_flag: true } });
    assert.equal((await state.finalize(finalizeInput())).status, 'confirmed');
    for (const record of provider.records()) assert.equal(record.extensions.future_flag, true);
  });
}
stateConformance('DynamoDB production adapter', prepared);

test('invalid inputs, duplicate targets, oversized batches and revision overflow perform no I/O', async () => {
  const { state, provider } = await prepared(); const calls = provider.audit.length;
  const invalid = [beginInput({ required_members: [fixture.memberA, fixture.memberA] }), beginInput({ expected_installation_revision: Number.MAX_SAFE_INTEGER }), beginInput({ stream: { ...fixture.streamA, site: 'https://user:secret@example.atlassian.net' } }), beginInput({ attempt: { ...fixture.attemptA, raw_body: 'secret' } }), beginInput({ required_members: Array.from({ length: 98 }, () => fixture.memberA) }), beginInput({ attempt: { ...fixture.attemptA, cause: Array(100).fill(fixture.evidence.references[0]), publication: Array(100).fill(fixture.evidence.references[0]) } })];
  for (const value of invalid) assert.equal((await state.begin(value)).status, 'invalid');
  assert.equal(provider.audit.length, calls);
  for (const existing of [false, true]) {
    const { state: memberState, provider: memberProvider } = await prepared();
    if (existing) assert.equal((await memberState.retainMembers({ expected_installation_revision: 0, members: [{ ...fixture.memberA, assignment: fixture.evidence.references[0] }], now: fixture.now })).status, 'confirmed');
    const member = { ...fixture.memberA, expected_revision: existing ? 0 : null, assignment: { ...fixture.evidence.references[0], ticket_id: '1002' } };
    const before = memberProvider.snapshot(), memberCalls = memberProvider.audit.length;
    for (const operation of ['retainMembers', 'begin']) {
      const value = operation === 'retainMembers'
        ? { expected_installation_revision: existing ? 1 : 0, members: [member], now: fixture.now }
        : beginInput({ expected_installation_revision: existing ? 1 : 0, required_members: [member] });
      const result = await memberState[operation](value);
      assert.equal(result.status, 'invalid', operation + '/' + existing); assert.equal(result.code, 'INVALID_INPUT'); assert.equal(result.data, null);
      assert.equal(memberProvider.audit.length, memberCalls); assert.equal(memberProvider.snapshot(), before);
    }
  }
});
test('missing, unsupported, malformed and incomplete state are distinct with no usable payload', async () => {
  const { state, provider } = await prepared();
  assert.equal((await state.readAttempt({ attempt_id: fixture.attemptA.attempt_id })).code, 'MISSING_ATTEMPT');
  const installed = row(provider, 'installation', fixture.binding);
  provider.seed({ ...installed, schema_version: 2 });
  let result = await state.readInventory({ limits: allLimits }); assert.equal(result.status, 'unsupported_version'); assert.equal(result.data, null);
  provider.seed({ ...installed, raw_body: 'not allowed' });
  assert.equal((await state.inspect({ kind: 'installation' })).code, 'MALFORMED_RECORD');
  provider.rows.clear(); assert.equal((await state.readInventory({ limits: allLimits })).code, 'MISSING_INSTALLATION');
});
test('inventory revision fence, limits and pending linkage fail closed', async () => {
  const { state, provider } = await prepared(); await state.begin(beginInput());
  assert.equal((await state.readInventory({ limits: { ...allLimits, requests: 1 } })).code, 'INCOMPLETE_INVENTORY');
  provider.before = async name => { if (name === 'GetCommand') setImmediate(() => {}); };
  const originalSend = provider.send.bind(provider); let installationReads = 0;
  provider.send = async (command, options) => {
    if (command.constructor.name === 'GetCommand' && command.input.Key.SK.startsWith('I#') && ++installationReads === 2) {
      const record = row(provider, 'installation', fixture.binding); provider.seed({ ...record, revision: record.revision + 1 });
    }
    return originalSend(command, options);
  };
  assert.equal((await state.readInventory({ limits: allLimits })).status, 'conflict');
  provider.send = originalSend;
  const attempt = row(provider, 'attempt', fixture.attemptA); provider.seed({ ...attempt, outcome: 'applied' });
  assert.equal((await state.readInventory({ limits: allLimits })).code, 'MALFORMED_RECORD');
});
test('disabled, maintenance and desired/applied mismatch allow reads and reject writes', async () => {
  const { provider, disabled } = await prepared({ enabled: false });
  const before = provider.snapshot();
  assert.equal((await disabled.begin(beginInput())).code, 'CONTROL_MISMATCH');
  for (const control of [{ ...fixture.control, maintenance: true }, { ...fixture.control, configuration_digest: 'sha256:' + 'b'.repeat(64) }]) {
    const binding = { ...fixture.binding, configuration_digest: control.configuration_digest };
    const state = createDynamoState({ binding, control, client: provider });
    const result = await state.readInventory({ limits: allLimits }); assert.equal(result.status, 'confirmed'); assert.equal(result.data.controls_match, false);
    assert.equal((await state.begin(beginInput())).status, 'conflict');
  }
  assert.equal(provider.snapshot(), before);
});
test('inspect continuation is explicit, installation-bound, and read-only', async () => {
  const { state, provider } = await prepared(); await state.begin(beginInput()); await state.finalize(finalizeInput());
  await state.begin(beginInput({ expected_installation_revision: 2, expected_stream_revision: 1, attempt: { ...fixture.attemptA, attempt_id: '33333333-3333-4333-8333-333333333333' }, required_members: [{ ...fixture.memberA, expected_revision: 0 }] }));
  const before = provider.snapshot(); const first = await state.inspect({ kind: 'attempt', limit: 1 });
  assert.equal(first.data.complete, false); assert(first.data.next_cursor);
  const second = await state.inspect({ kind: 'attempt', cursor: first.data.next_cursor, limit: 1 });
  assert.equal(second.data.complete, true); assert.notEqual(first.data.records[0].attempt_id, second.data.records[0].attempt_id);
  const calls = provider.audit.length;
  assert.equal((await state.inspect({ kind: 'member', cursor: first.data.next_cursor })).status, 'invalid');
  assert.equal(provider.audit.length, calls); assert.equal(provider.snapshot(), before);
});

test('a different package can inspect the mismatch but cannot mutate retained state', async () => {
  const { state, provider } = await prepared();
  assert.equal((await state.begin(beginInput())).status, 'confirmed');
  const before = provider.snapshot(), writes = provider.audit.filter(a => a.name === 'TransactWriteCommand').length;
  const other = createDynamoState({ binding: { ...fixture.binding, package_revision: '6'.repeat(40) }, control: { ...fixture.control, schedule_enabled: true, writes_enabled: true }, client: provider });
  for (const outcome of [await other.inspect({ kind: 'installation' }), await other.readInventory({ limits: allLimits }), await other.readAttempt({ attempt_id: fixture.attemptA.attempt_id })]) {
    assert.equal(outcome.status, 'confirmed'); assert.equal(outcome.data.controls_match, false);
  }
  const operations = [
    await other.retainMembers({ expected_installation_revision: 1, members: [{ ...fixture.memberA, expected_revision: 0 }], now: fixture.now }),
    await other.begin(beginInput({ expected_installation_revision: 1, expected_stream_revision: 0 })),
    await other.finalize(finalizeInput()),
    await other.retainPublication({ attempt_id: fixture.attemptA.attempt_id, expected_installation_revision: 1, expected_stream_revision: 0, expected_attempt_revision: 0, reference: proofFixture.reference, now: fixture.now }),
    await other.prepareTransitionCapture({ attempt_id: fixture.attemptA.attempt_id, expected_installation_revision: 1, expected_stream_revision: 0, expected_attempt_revision: 0, transition_id: proofFixture.transition_id, producer_invocation_id: proofFixture.producer_invocation_id, publication_observations: proofFixture.publication_observations, now: fixture.now }),
    await other.recordTransitionResponse({ attempt_id: fixture.attemptA.attempt_id, expected_installation_revision: 1, expected_stream_revision: 0, expected_attempt_revision: 0, request_digest: proofFixture.expected.request_digest, http_status: 204, observed_at: proofFixture.received_at, provider_request_id: null })
  ];
  for (const outcome of operations) { assert.equal(outcome.status, 'conflict'); assert.equal(outcome.code, 'CONTROL_MISMATCH'); assert.equal(outcome.data, null); }
  assert.equal(provider.snapshot(), before);
  assert.equal(provider.audit.filter(a => a.name === 'TransactWriteCommand').length, writes);
});

test('begin rejects current-attempt publication before I/O and preserves prior references', async () => {
  const reference = { ...proofFixture.preserved_assignment, comment_id: '699' };
  for (const publication of [[proofFixture.reference], [{ ...proofFixture.reference, ticket_id: '1002' }], [reference, reference]]) {
    const rejected = await prepared();
    try {
      const before = rejected.provider.snapshot(), calls = rejected.provider.audit.length;
      const outcome = await rejected.state.begin(beginInput({ attempt: { ...fixture.attemptA, publication } }));
      assert.equal(outcome.status, 'invalid'); assert.equal(outcome.code, 'INVALID_INPUT'); assert.equal(outcome.data, null);
      assert.equal(rejected.provider.snapshot(), before); assert.equal(rejected.provider.audit.length, calls);
    } finally { rejected.state.close(); }
  }
  const accepted = await prepared();
  try {
    const outcome = await accepted.state.begin(beginInput({ attempt: { ...fixture.attemptA, publication: [reference] } }));
    assert.equal(outcome.status, 'confirmed', JSON.stringify(outcome));
    assert.deepEqual(row(accepted.provider, 'attempt', fixture.attemptA).publication, [reference]);
    const input = extra => ({
      attempt_id: fixture.attemptA.attempt_id,
      expected_installation_revision: row(accepted.provider, 'installation', fixture.binding).revision,
      expected_stream_revision: row(accepted.provider, 'stream', fixture.streamA).revision,
      expected_attempt_revision: row(accepted.provider, 'attempt', fixture.attemptA).revision,
      now: fixture.now, ...extra
    });
    assert.equal((await accepted.state.retainPublication(input({ reference: proofFixture.reference }))).status, 'confirmed');
    const observations = structuredClone(proofFixture.publication_observations);
    observations.comments.push({ ...observations.comments[0], reference });
    assert.equal((await accepted.state.prepareTransitionCapture(input({
      transition_id: proofFixture.transition_id, producer_invocation_id: proofFixture.producer_invocation_id,
      publication_observations: observations
    }))).status, 'confirmed');
    assert.deepEqual(row(accepted.provider, 'attempt', fixture.attemptA).publication, [reference, proofFixture.reference]);
    assert.equal(transitionProof(row(accepted.provider, 'attempt', fixture.attemptA)).state, 'prepared');
  } finally { accepted.state.close(); }
});

test('capture ordering requires retained publication and freezes it after preparation', async () => {
  const c = await transitionFixture(); const before = c.provider.snapshot();
  assert.equal((await c.prepare()).code, 'PUBLICATION_MISMATCH'); assert.equal(c.provider.snapshot(), before);
  assert.equal((await c.retain()).status, 'confirmed');
  assert.equal((await c.prepare()).status, 'confirmed');
  const captured = c.provider.snapshot();
  assert.equal((await c.retain({ reference: { ...proofFixture.reference, comment_id: '701' } })).code, 'PROOF_CONFLICT');
  assert.equal((await c.response(204, { request_digest: 'sha256:' + 'b'.repeat(64) })).code, 'PROOF_CONFLICT');
  assert.equal(c.provider.snapshot(), captured);
  assert.equal((await c.response(400, { provider_request_id: 'unsupported/provider/id' })).status, 'confirmed');
  assert.equal(c.records().attempt.extensions.pb_capture_provider_request_id, null);
  assert.equal(transitionProof(c.records().attempt).http_status, 400); assert.equal(c.records().attempt.outcome, 'pending');
});
test('completed responses reject interim statuses before I/O', async () => {
  const c = await transitionFixture();
  try {
    assert.equal((await c.retain()).status, 'confirmed');
    assert.equal((await c.prepare()).status, 'confirmed');
    const before = c.provider.snapshot(), calls = c.provider.audit.length;
    for (const status of [100, 199]) {
      const outcome = await c.response(status);
      assert.equal(outcome.status, 'invalid'); assert.equal(outcome.code, 'INVALID_INPUT'); assert.equal(outcome.data, null);
      assert.equal(c.provider.snapshot(), before); assert.equal(c.provider.audit.length, calls);
    }
    assert.equal((await c.response(200)).status, 'confirmed');
    assert.equal(transitionProof(c.records().attempt).state, 'response-captured');
    assert.equal(transitionProof(c.records().attempt).http_status, 200);
    assert.equal(c.records().attempt.attempt_id, fixture.attemptA.attempt_id);
    assert.equal(c.records().attempt.outcome, 'pending');
  } finally { c.state.close(); }
});
test('retained interim capture remains unsupported and inspectable', async () => {
  const c = await transitionFixture();
  try {
    assert.equal((await c.retain()).status, 'confirmed');
    assert.equal((await c.prepare()).status, 'confirmed');
    const attempt = c.records().attempt;
    c.provider.seed({ ...attempt, extensions: { ...attempt.extensions, pb_capture_status: 100, pb_capture_received_at: proofFixture.received_at, pb_capture_provider_request_id: proofFixture.provider_request_id } });
    const before = c.provider.snapshot(), calls = c.provider.audit.length;
    const inspected = await c.inspect();
    assert.equal(inspected.status, 'confirmed');
    assert.deepEqual(inspected.data.records, [c.records().attempt]);
    assert.equal(inspected.data.records[0].extensions.pb_capture_status, 100);
    assert.equal(inspected.data.records[0].extensions.pb_capture_received_at, proofFixture.received_at);
    assert.deepEqual(transitionProof(inspected.data.records[0]), { state: 'unsupported', request_digest: null, http_status: null });
    assert.equal(inspected.data.records[0].outcome, 'pending');
    assert.equal(c.provider.snapshot(), before);
    assert(c.provider.audit.slice(calls).every(call => /^(Get|Query|TransactGet)Command$/.test(call.name)));
  } finally { c.state.close(); }
});
test('uncertain pre-pointer retention returns no continuation data and never retries', async () => {
  for (const fault of ['before', 'after']) {
    const c = await transitionFixture(); const before = c.provider.snapshot(), writes = c.provider.audit.filter(a => a.name === 'TransactWriteCommand').length;
    c.provider.fault = fault; const retained = await c.retain();
    assert.equal(retained.status, 'uncertain'); assert.equal(retained.data, null);
    assert.equal(c.provider.audit.filter(a => a.name === 'TransactWriteCommand').length, writes + 1);
    assert.equal(c.records().attempt.publication.length, fault === 'before' ? 0 : 1);
    if (fault === 'before') assert.equal(c.provider.snapshot(), before);
    await c.inspect(); assert.equal(transitionProof(c.records().attempt).state, 'none');
  }
});
test('queue repair captures preserved assignment, admission captures its own published assignment', async () => {
  const c = await transitionFixture({ operation: 'queue_repair' }); await c.retain();
  const before = c.provider.snapshot();
  const changed = structuredClone(c.observations); changed.pointer.assignment = proofFixture.reference;
  assert.equal((await c.prepare({ publication_observations: changed })).code, 'PUBLICATION_MISMATCH'); assert.equal(c.provider.snapshot(), before);
  const prepared = await c.prepare(); assert.equal(prepared.status, 'confirmed');
  assert.equal(c.records().attempt.outcome, 'pending');
  assert.deepEqual(row(c.provider, 'member', fixture.memberA).assignment, proofFixture.preserved_assignment);
  const admission = await transitionFixture(); await admission.retain();
  assert.equal((await admission.prepare({ publication_observations: c.observations })).code, 'PUBLICATION_MISMATCH');
});
test('publication commitment has canonical ordering and binds metadata, pointer and immutable request facts', async () => {
  const c = await transitionFixture(); await c.retain(); const attempt = c.records().attempt;
  const extra = fixture.evidence.references[0], observations = structuredClone(c.observations);
  attempt.publication.push(extra); observations.comments.push({ ...observations.comments[0], reference: extra });
  const commitment = transitionPublication(attempt, observations);
  const reordered = structuredClone(observations); reordered.comments.reverse(); reordered.pointer.assignment = Object.fromEntries(Object.entries(reordered.pointer.assignment).reverse());
  assert.equal(transitionPublication(attempt, reordered).digest, commitment.digest);
  const changed = structuredClone(observations); changed.comments[0].author_id = changed.comments[0].update_author_id = 'another-manager';
  assert.notEqual(transitionPublication(attempt, changed).digest, commitment.digest);
  assert.notEqual(transitionRequestDigest(attempt, '32', commitment.digest), transitionRequestDigest(attempt, '31', commitment.digest));
  assert.notEqual(transitionRequestDigest({ ...attempt, project_id: '200' }, '31', commitment.digest), transitionRequestDigest(attempt, '31', commitment.digest));
  const duplicate = structuredClone(observations); duplicate.comments.push(duplicate.comments[0]);
  assert.throws(() => transitionPublication(attempt, duplicate), e => e.stateResult?.code === 'PUBLICATION_MISMATCH');
});
test('partial/unsupported capture remains visible, blocks proof mutation, and invalid API input performs no I/O', async () => {
  const c = await transitionFixture(); await c.retain();
  c.provider.seed({ ...c.records().attempt, extensions: { ...c.records().attempt.extensions, pb_capture_version: 1 } });
  const before = c.provider.snapshot(); assert.equal(transitionProof(c.records().attempt).state, 'unsupported');
  assert.equal((await c.prepare()).code, 'UNSUPPORTED_PROOF'); assert.equal(c.provider.snapshot(), before);
  const inspected = await c.inspect(); assert.equal(transitionProof(inspected.data.records[0]).state, 'unsupported');
  const calls = c.provider.audit.length;
  assert.equal((await c.state.recordTransitionResponse(c.input({ request_digest: proofFixture.expected.request_digest, http_status: 600, observed_at: proofFixture.received_at, provider_request_id: null }))).status, 'invalid');
  assert.equal((await c.state.retainPublication(c.input({ reference: proofFixture.reference, now: fixture.now, force: true }))).status, 'invalid');
  assert.equal(c.provider.audit.length, calls);
});

test('independent legacy golden commitments bind exact publication and original request', async () => {
  const expected = expectedCommitment(fixture.binding);
  assert.equal(expected.publication_digest, proofFixture.expected.publication_digest);
  assert.equal(expected.request_digest, proofFixture.expected.request_digest);
  const c = await transitionFixture();
  assert.equal((await c.retain()).status, 'confirmed');
  assert.equal((await c.prepare()).status, 'confirmed');
  assert.equal(c.records().attempt.extensions.pb_capture_publication_digest, expected.publication_digest);
  assert.equal(c.records().attempt.extensions.pb_capture_request_digest, expected.request_digest);
});
