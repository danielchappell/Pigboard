import assert from "node:assert/strict";
import test from "node:test";

import { MemoryQueueAdapter, QueueDispatcher, Status, WorkerType } from "../src/index.js";

test("dispatcher claims one ready item and transitions it", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "1",
      title: "Build the adapter seam",
      status: Status.READY,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1",
      body: "Do the thing"
    }
  ]);

  const dispatcher = new QueueDispatcher({
    adapter,
    workerId: "worker-1",
    workerType: WorkerType.IMPLEMENTER,
    leaseSeconds: 60,
    runWorker: async () => ({
      outcome: "completed",
      nextStatus: Status.REVIEW,
      summary: "Implemented",
      evidence: ["unit test"]
    })
  });

  const result = await dispatcher.runOnce();
  assert.equal(result.ran, true);
  assert.equal(adapter.getItem("1").status, Status.REVIEW);
  assert.equal(adapter.events.length, 1);
  assert.equal(adapter.events[0].outcome, "completed");
});

test("dispatcher marks blocked when worker throws", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "2",
      title: "Broken item",
      status: Status.READY,
      workerType: WorkerType.QA,
      priority: "P2"
    }
  ]);

  const dispatcher = new QueueDispatcher({
    adapter,
    workerId: "qa-1",
    workerType: WorkerType.QA,
    runWorker: async () => {
      throw new Error("missing staging URL");
    }
  });

  const result = await dispatcher.runOnce();
  assert.equal(result.ran, true);
  assert.equal(adapter.getItem("2").status, Status.BLOCKED);
  assert.match(adapter.events[0].body, /missing staging URL/);
});

test("dispatcher releases claims after partial apply failures", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "partial-apply",
      title: "Partial apply",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1"
    }
  ]);
  adapter.clearWorkerTypeForClaim = async () => ({ cleared: false, reason: "worker_type_changed" });
  adapter.failClaim = async () => ({ failed: false, reason: "status_changed" });

  const dispatcher = new QueueDispatcher({
    adapter,
    workerId: "impl-1",
    workerType: WorkerType.IMPLEMENTER,
    runWorker: async () => ({
      outcome: "completed",
      nextStatus: Status.REVIEW,
      summary: "Built it"
    })
  });

  const result = await dispatcher.runOnce();

  assert.equal(result.ran, true);
  assert.match(result.error.message, /worker_type_changed/);
  assert.equal(adapter.getItem("partial-apply").status, Status.REVIEW);
  assert.equal(adapter.getItem("partial-apply").leaseOwner, undefined);
});

test("dispatcher claims items in a worker-specific status column", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "3",
      title: "Implement from implementation column",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P0"
    }
  ]);

  const dispatcher = new QueueDispatcher({
    adapter,
    workerId: "impl-1",
    workerType: WorkerType.IMPLEMENTER,
    runWorker: async () => ({
      outcome: "completed",
      nextStatus: Status.REVIEW,
      summary: "Built it"
    })
  });

  const result = await dispatcher.runOnce();
  assert.equal(result.ran, true);
  assert.equal(adapter.getItem("3").status, Status.REVIEW);
});

test("dispatcher continues past ready items that fail during claim", async () => {
  const calls = [];
  const adapter = {
    listReady: async () => [
      { id: "bad", status: Status.REVIEW, workerType: WorkerType.REVIEWER },
      { id: "good", status: Status.REVIEW, workerType: WorkerType.REVIEWER }
    ],
    claimReadyForWorker: async ({ itemId }) => {
      calls.push(itemId);
      if (itemId === "bad") throw new Error("GitHub pull request metadata request failed: 404");
      return {
        claimed: true,
        claim: { id: "ski.eyJpdGVtSWQiOiJnb29kIiwid29ya2VySWQiOiJyZXZpZXdlci0xIiwiZXhwaXJlc0F0IjoiMjAyNi0wNy0wN1QxMjozMDowMC4wMDBaIn0", itemId },
        item: { id: itemId, status: Status.REVIEW, workerType: WorkerType.REVIEWER }
      };
    },
    appendEventForClaim: async () => ({ appended: true }),
    transitionForClaim: async () => ({ transitioned: true }),
    clearWorkerTypeForClaim: async () => ({ cleared: true }),
    releaseClaim: async () => ({ released: true })
  };

  const dispatcher = new QueueDispatcher({
    adapter,
    workerId: "reviewer-1",
    workerType: WorkerType.REVIEWER,
    runWorker: async () => ({
      outcome: "completed",
      nextStatus: Status.BABYSIT,
      summary: "No findings"
    })
  });

  const result = await dispatcher.runOnce();

  assert.equal(result.ran, true);
  assert.equal(result.itemId, "good");
  assert.deepEqual(calls, ["bad", "good"]);
});
