import assert from "node:assert/strict";
import test from "node:test";

import {
  createClaimV2Id,
  MemoryQueueAdapter,
  parseClaimId,
  stageOperationId,
  Status,
  WorkerType
} from "../src/index.js";

test("lifecycle reconciliation makes successful closure terminal from any active stage", async () => {
  const adapter = new MemoryQueueAdapter([issueItem({ status: Status.IMPLEMENTATION })]);

  const result = await adapter.reconcileLifecycleEvent({
    eventName: "issues",
    action: "closed",
    repository: "acme/repo",
    issueNumber: 12,
    issueStateReason: "completed"
  });

  assert.deepEqual(result, { reconciled: true, itemId: "item-12", status: Status.DONE });
  assert.equal(adapter.getItem("item-12").workerType, undefined);
});

test("not-planned issue closure cancels work", async () => {
  const adapter = new MemoryQueueAdapter([issueItem({ status: Status.REVIEW })]);

  await adapter.reconcileLifecycleEvent({
    eventName: "issues",
    action: "closed",
    repository: "acme/repo",
    issueNumber: 12,
    issueStateReason: "not_planned"
  });

  assert.equal(adapter.getItem("item-12").status, Status.CANCELED);
});

test("authorized approval can be added and removed without a worker or merge call", async () => {
  const adapter = new MemoryQueueAdapter([issueItem({
    status: Status.BABYSIT,
    workerType: WorkerType.PR_BABYSITTER,
    pullRequestNumber: 42
  })], { ownerApprovers: ["owner"] });

  await adapter.reconcileLifecycleEvent(reactionEvent("created"));
  assert.equal(adapter.getItem("item-12").status, Status.READY_FOR_OWNER);

  await adapter.reconcileLifecycleEvent(reactionEvent("deleted"));
  assert.equal(adapter.getItem("item-12").status, Status.BABYSIT);

  await adapter.reconcileLifecycleEvent({
    eventName: "pull_request",
    action: "closed",
    repository: "acme/repo",
    pullRequestNumber: 42,
    pullRequestMerged: true
  });
  assert.equal(adapter.getItem("item-12").status, Status.DONE);
});

test("merge/completion wins terminal races and cannot be downgraded by cancellation", async () => {
  const adapter = new MemoryQueueAdapter([issueItem({
    status: Status.CANCELED,
    pullRequestNumber: 42
  })]);
  await adapter.reconcileLifecycleEvent({
    eventName: "pull_request",
    action: "closed",
    repository: "acme/repo",
    pullRequestNumber: 42,
    pullRequestMerged: true
  });
  assert.equal(adapter.getItem("item-12").status, Status.DONE);

  const lateCancellation = await adapter.reconcileLifecycleEvent({
    eventName: "issues",
    action: "closed",
    repository: "acme/repo",
    issueNumber: 12,
    issueStateReason: "not_planned"
  });
  assert.equal(lateCancellation.reason, "terminal_state_protected");
  assert.equal(adapter.getItem("item-12").status, Status.DONE);
});

test("external head changes clear cooldown while the worker's own head event preserves it", async () => {
  const lastWorkerRun = createClaimV2Id({
    itemId: "item-12",
    workerId: "babysitter-1",
    attemptId: "attempt-1",
    runId: "run-1",
    expiresAt: "2026-07-18T13:00:00.000Z",
    resolvedWorkerType: WorkerType.PR_BABYSITTER,
    claimedStatus: Status.BABYSIT,
    claimedWorkerType: WorkerType.PR_BABYSITTER,
    repository: "acme/repo",
    contentType: "Issue",
    issueNumber: 12,
    pullRequestNumber: 42,
    headSha: "a".repeat(40),
    nextEligibleAt: "2026-07-18T12:10:00.000Z",
    claimedAt: "2026-07-18T12:00:00.000Z"
  });
  const adapter = new MemoryQueueAdapter([issueItem({
    status: Status.BABYSIT,
    workerType: WorkerType.PR_BABYSITTER,
    pullRequestNumber: 42,
    headSha: "a".repeat(40),
    lastWorkerRun,
    availableAfter: "2026-07-18T12:10:00.000Z"
  })]);

  const own = await adapter.reconcileLifecycleEvent(synchronizeEvent("a".repeat(40)));
  assert.equal(own.reconciled, false);
  assert.equal(adapter.getItem("item-12").availableAfter, "2026-07-18T12:10:00.000Z");

  const external = await adapter.reconcileLifecycleEvent(synchronizeEvent("b".repeat(40)));
  assert.equal(external.cooldownCleared, true);
  assert.equal(adapter.getItem("item-12").availableAfter, undefined);
  assert.equal(parseClaimId(adapter.getItem("item-12").lastWorkerRun).nextEligibleAt, undefined);
});

test("external head changes revoke Ready for Owner until a new approval event", async () => {
  const lastWorkerRun = createClaimV2Id({
    itemId: "item-12",
    workerId: "babysitter-1",
    attemptId: "attempt-1",
    runId: "run-1",
    expiresAt: "2026-07-18T13:00:00.000Z",
    resolvedWorkerType: WorkerType.PR_BABYSITTER,
    claimedStatus: Status.BABYSIT,
    repository: "acme/repo",
    contentType: "Issue",
    issueNumber: 12,
    pullRequestNumber: 42,
    headSha: "a".repeat(40),
    claimedAt: "2026-07-18T12:00:00.000Z"
  });
  const adapter = new MemoryQueueAdapter([issueItem({
    status: Status.READY_FOR_OWNER,
    pullRequestNumber: 42,
    headSha: "a".repeat(40),
    lastWorkerRun
  })], { ownerApprovers: ["owner"] });

  const changed = await adapter.reconcileLifecycleEvent(synchronizeEvent("b".repeat(40)));

  assert.equal(changed.ownerApprovalInvalidated, true);
  assert.equal(adapter.getItem("item-12").status, Status.BABYSIT);
  assert.equal(
    parseClaimId(adapter.getItem("item-12").lastWorkerRun).approvalInvalidatedHeadSha,
    "b".repeat(40)
  );

  await adapter.reconcileLifecycleEvent(reactionEvent("created"));
  assert.equal(adapter.getItem("item-12").status, Status.READY_FOR_OWNER);
  assert.equal(
    parseClaimId(adapter.getItem("item-12").lastWorkerRun).approvalInvalidatedHeadSha,
    undefined
  );
});

test("startup reconciliation releases only leases bound to an exact signed completion", async () => {
  const adapter = new MemoryQueueAdapter([issueItem()]);
  const seeded = await adapter.claimReadyForWorker({
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-1",
    leaseSeconds: 1800
  });
  const parsed = parseClaimId(seeded.claim.id);
  const inputFingerprint = "input-fingerprint";
  const operationId = stageOperationId({
    itemId: "item-12",
    stage: "implementation",
    inputFingerprint
  });
  const boundClaim = createClaimV2Id({ ...parsed, inputFingerprint, operationId });
  await adapter.setFieldForClaim(seeded.claim.id, "Last Worker Run", boundClaim);
  await adapter.appendStageHandoffForClaim(boundClaim, {
    stage: "implementation",
    inputFingerprint,
    payload: { branchName: "ski/issue-12", headSha: "a".repeat(40) }
  });

  const result = await adapter.reconcileCompletedOperations();

  assert.equal(result.reconciled, 1);
  assert.equal(adapter.getItem("item-12").leaseOwner, undefined);
  assert.equal(adapter.getItem("item-12").status, Status.IMPLEMENTATION);
});

function issueItem(overrides = {}) {
  return {
    id: "item-12",
    title: "Lifecycle item",
    status: Status.IMPLEMENTATION,
    workerType: WorkerType.IMPLEMENTER,
    repository: "acme/repo",
    contentType: "Issue",
    number: 12,
    ...overrides
  };
}

function reactionEvent(action) {
  return {
    eventName: "reaction",
    action,
    repository: "acme/repo",
    issueNumber: 42,
    reactionSubject: "pull_request_description",
    reactionContent: "+1",
    reactionUser: "owner"
  };
}

function synchronizeEvent(headSha) {
  return {
    eventName: "pull_request",
    action: "synchronize",
    repository: "acme/repo",
    pullRequestNumber: 42,
    pullRequestHeadSha: headSha
  };
}
