import assert from "node:assert/strict";
import test from "node:test";

import {
  applyWorkerResult,
  MemoryQueueAdapter,
  Status,
  WorkerType
} from "../src/index.js";

test("applyWorkerResult appends evidence, transitions, and releases", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-1",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      repository: "owner/repo",
      contentType: "Issue"
    }
  ]);
  const { claim } = await adapter.claimReadyForWorker({
    itemId: "item-1",
    workerType: WorkerType.IMPLEMENTER,
    workerId: "worker-1",
    leaseSeconds: 60
  });

  const result = await applyWorkerResult({
    adapter,
    claimId: claim.id,
    workerType: WorkerType.IMPLEMENTER,
    result: {
      outcome: "completed",
      nextStatus: Status.REVIEW,
      summary: "Built adapter",
      evidence: ["npm test"]
    }
  });

  assert.deepEqual(result, { itemId: "item-1", status: Status.REVIEW, released: true });
  assert.equal(adapter.getItem("item-1").status, Status.REVIEW);
  assert.equal(adapter.getItem("item-1").workerType, undefined);
  assert.equal(adapter.getItem("item-1").leaseOwner, undefined);
  assert.equal(adapter.events[0].body, "Built adapter");
});

test("applyWorkerResult preserves Worker Type only when requested", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-preserve",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      repository: "owner/repo",
      contentType: "Issue"
    }
  ]);
  const { claim } = await adapter.claimReadyForWorker({
    itemId: "item-preserve",
    workerType: WorkerType.IMPLEMENTER,
    workerId: "worker-1",
    leaseSeconds: 60
  });

  await applyWorkerResult({
    adapter,
    claimId: claim.id,
    workerType: WorkerType.IMPLEMENTER,
    result: {
      outcome: "completed",
      nextStatus: Status.REVIEW,
      summary: "Built adapter",
      preserveWorkerType: true
    }
  });

  assert.equal(adapter.getItem("item-preserve").workerType, WorkerType.IMPLEMENTER);
});

test("applyWorkerResult blocks needs-human outcomes", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-2",
      status: Status.QA,
      workerType: WorkerType.QA,
      repository: "owner/repo",
      contentType: "Issue"
    }
  ]);
  const { claim } = await adapter.claimReadyForWorker({
    itemId: "item-2",
    workerType: WorkerType.QA,
    workerId: "qa-1",
    leaseSeconds: 60
  });

  await applyWorkerResult({
    adapter,
    claimId: claim.id,
    workerType: WorkerType.QA,
    result: {
      outcome: "needs-human",
      summary: "Missing staging URL",
      blocker: "Need staging URL"
    }
  });

  assert.equal(adapter.getItem("item-2").status, Status.BLOCKED);
});

test("applyWorkerResult allows manual worker completed transitions", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-manual",
      status: Status.QA,
      workerType: WorkerType.QA,
      repository: "owner/repo",
      contentType: "Issue"
    }
  ]);
  const { claim } = await adapter.claimReadyForWorker({
    itemId: "item-manual",
    workerType: WorkerType.QA,
    workerId: "qa-1",
    leaseSeconds: 60
  });

  await applyWorkerResult({
    adapter,
    claimId: claim.id,
    workerType: WorkerType.QA,
    result: {
      outcome: "completed",
      nextStatus: Status.REVIEW,
      summary: "QA complete"
    }
  });

  assert.equal(adapter.getItem("item-manual").status, Status.REVIEW);
  assert.equal(adapter.getItem("item-manual").leaseOwner, undefined);
});

test("applyWorkerResult uses fail path for failed outcomes", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-3",
      status: Status.REVIEW,
      workerType: WorkerType.REVIEWER,
      repository: "owner/repo",
      contentType: "PullRequest"
    }
  ]);
  const { claim } = await adapter.claimReadyForWorker({
    itemId: "item-3",
    workerType: WorkerType.REVIEWER,
    workerId: "reviewer-1",
    leaseSeconds: 60
  });

  await applyWorkerResult({
    adapter,
    claimId: claim.id,
    workerType: WorkerType.REVIEWER,
    result: {
      outcome: "failed",
      summary: "Unexpected exception"
    }
  });

  assert.equal(adapter.getItem("item-3").status, Status.BLOCKED);
  assert.equal(adapter.events[0].type, "worker_failed");
});

test("applyWorkerResult drains beforeRelease before failed outcome release", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-failed-before-release",
      status: Status.REVIEW,
      workerType: WorkerType.REVIEWER,
      repository: "owner/repo",
      contentType: "PullRequest"
    }
  ]);
  const { claim } = await adapter.claimReadyForWorker({
    itemId: "item-failed-before-release",
    workerType: WorkerType.REVIEWER,
    workerId: "reviewer-1",
    leaseSeconds: 60
  });
  let drained = false;
  const failClaim = adapter.failClaim.bind(adapter);
  adapter.failClaim = async (...args) => {
    assert.equal(drained, true);
    return failClaim(...args);
  };

  await applyWorkerResult({
    adapter,
    claimId: claim.id,
    workerType: WorkerType.REVIEWER,
    result: {
      outcome: "failed",
      summary: "Structured failure"
    },
    beforeRelease: async () => {
      drained = true;
    }
  });

  assert.equal(adapter.getItem("item-failed-before-release").status, Status.BLOCKED);
  assert.equal(adapter.getItem("item-failed-before-release").leaseOwner, undefined);
});

test("applyWorkerResult does not mutate after a claim is rerouted", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-4",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      repository: "owner/repo",
      contentType: "Issue"
    }
  ]);
  const { claim } = await adapter.claimReadyForWorker({
    itemId: "item-4",
    workerType: WorkerType.IMPLEMENTER,
    workerId: "worker-1",
    leaseSeconds: 60
  });
  await adapter.transition("item-4", Status.REVIEW);

  await assert.rejects(
    () =>
      applyWorkerResult({
        adapter,
        claimId: claim.id,
        workerType: WorkerType.IMPLEMENTER,
        result: {
          outcome: "completed",
          nextStatus: Status.REVIEW,
          summary: "Stale result",
          evidence: ["npm test"]
        }
      }),
    /claim lost: status_changed/
  );

  assert.equal(adapter.getItem("item-4").status, Status.REVIEW);
  assert.equal(adapter.getItem("item-4").leaseOwner, "worker-1");
  assert.equal(adapter.events.length, 0);
});

test("applyWorkerResult carries PR head guards through claim-aware mutations", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-pr-head-drift",
      status: Status.REVIEW,
      workerType: WorkerType.REVIEWER,
      repository: "owner/repo",
      contentType: "PullRequest",
      number: 42,
      headSha: "a".repeat(40)
    }
  ]);
  const { claim } = await adapter.claimReadyForWorker({
    itemId: "item-pr-head-drift",
    workerType: WorkerType.REVIEWER,
    workerId: "reviewer-1",
    leaseSeconds: 60
  });
  const appendEventForClaim = adapter.appendEventForClaim.bind(adapter);
  adapter.appendEventForClaim = async (...args) => {
    const result = await appendEventForClaim(...args);
    adapter.items.get("item-pr-head-drift").headSha = "b".repeat(40);
    return result;
  };

  await assert.rejects(
    applyWorkerResult({
      adapter,
      claimId: claim.id,
      workerType: WorkerType.REVIEWER,
      verifyOptions: { requireHeadSha: true },
      result: {
        outcome: "completed",
        nextStatus: Status.BABYSIT,
        summary: "No findings."
      }
    }),
    /head_drift/
  );

  assert.equal(adapter.getItem("item-pr-head-drift").status, Status.REVIEW);
});
