import assert from "node:assert/strict";
import test from "node:test";

import {
  applyWorkerResult,
  createClaimId,
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
      leaseOwner: "worker-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z"
    }
  ]);
  const claimId = createClaimId({
    itemId: "item-1",
    workerId: "worker-1",
    expiresAt: "2026-07-07T12:30:00.000Z"
  });

  const result = await applyWorkerResult({
    adapter,
    claimId,
    result: {
      outcome: "completed",
      nextStatus: Status.QA,
      summary: "Built adapter",
      evidence: ["npm test"]
    }
  });

  assert.deepEqual(result, { itemId: "item-1", status: Status.QA, released: true });
  assert.equal(adapter.getItem("item-1").status, Status.QA);
  assert.equal(adapter.getItem("item-1").leaseOwner, undefined);
  assert.equal(adapter.events[0].body, "Built adapter");
});

test("applyWorkerResult blocks needs-human outcomes", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-2",
      status: Status.QA,
      workerType: WorkerType.QA
    }
  ]);
  const claimId = createClaimId({
    itemId: "item-2",
    workerId: "qa-1",
    expiresAt: "2026-07-07T12:30:00.000Z"
  });

  await applyWorkerResult({
    adapter,
    claimId,
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
      workerType: WorkerType.REVIEWER
    }
  ]);
  const claimId = createClaimId({
    itemId: "item-3",
    workerId: "reviewer-1",
    expiresAt: "2026-07-07T12:30:00.000Z"
  });

  await applyWorkerResult({
    adapter,
    claimId,
    result: {
      outcome: "failed",
      summary: "Unexpected exception"
    }
  });

  assert.equal(adapter.getItem("item-3").status, Status.BLOCKED);
  assert.equal(adapter.events[0].type, "worker_failed");
});

