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
  assert.equal(adapter.getItem("item-1").leaseOwner, undefined);
  assert.equal(adapter.events[0].body, "Built adapter");
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
