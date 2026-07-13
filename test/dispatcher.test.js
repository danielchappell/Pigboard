import assert from "node:assert/strict";
import test from "node:test";

import { DependencyState, MemoryQueueAdapter, QueueDispatcher, Status, WorkerType } from "../src/index.js";

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

test("dispatcher releases a stale dependency claim when the worker throws", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "dependency-drift",
      title: "Dependency drift",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1",
      dependencies: [{ kind: "blockedBy", targetId: "blocker", state: DependencyState.COMPLETED }]
    }
  ]);
  const dispatcher = new QueueDispatcher({
    adapter,
    workerId: "impl-1",
    workerType: WorkerType.IMPLEMENTER,
    runWorker: async () => {
      adapter.items.get("dependency-drift").dependencies[0].state = DependencyState.ACTIVE;
      throw new Error("worker crashed");
    }
  });

  const result = await dispatcher.runOnce();

  assert.equal(result.stale, true);
  assert.equal(result.reason, "dependency_pending");
  assert.equal(adapter.getItem("dependency-drift").status, Status.IMPLEMENTATION);
  assert.equal(adapter.getItem("dependency-drift").leaseOwner, undefined);
  assert.equal(adapter.events.length, 0);
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

test("dispatcher uses the coordinator and continues past candidates that fail during claim", async () => {
  const calls = [];
  const adapter = new MemoryQueueAdapter([
    { id: "bad", status: Status.REVIEW, workerType: WorkerType.REVIEWER, priority: "P1" },
    { id: "good", status: Status.REVIEW, workerType: WorkerType.REVIEWER, priority: "P1" }
  ]);
  const originalClaimCandidate = adapter.claimCandidate.bind(adapter);
  adapter.claimCandidate = async (input) => {
    calls.push(input.itemId);
    if (input.itemId === "bad") return { claimed: false, reason: "pr_metadata_failed" };
    return originalClaimCandidate(input);
  };
  adapter.claimReadyForWorker = async () => {
    throw new Error("legacy claim wrapper must not be used");
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
