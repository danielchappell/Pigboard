import assert from "node:assert/strict";
import test from "node:test";

import {
  claimNextAvailable,
  DependencyState,
  GitHubCodeLoopWorker,
  MemoryQueueAdapter,
  Status,
  WorkerType
} from "../src/index.js";

test("claim coordinator skips blocked high-priority work for lower-priority available work", async () => {
  const adapter = new MemoryQueueAdapter([
    workItem({
      id: "blocked-p0",
      priority: "P0",
      dependencies: [dependency("blocker", DependencyState.ACTIVE)]
    }),
    workItem({ id: "available-p2", priority: "P2" })
  ]);

  const result = await claimNextAvailable({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "worker-1",
    leaseSeconds: 1800
  });

  assert.equal(result.claimed, true);
  assert.equal(result.item.id, "available-p2");
  await adapter.releaseClaim(result.claim.id);
});

test("claim coordinator releases a claim when dependencies change after claiming", async () => {
  const adapter = new MemoryQueueAdapter([
    workItem({
      id: "drift",
      dependencies: [dependency("blocker", DependencyState.COMPLETED)]
    })
  ]);
  const originalClaimCandidate = adapter.claimCandidate.bind(adapter);
  adapter.claimCandidate = async (input) => {
    const result = await originalClaimCandidate(input);
    adapter.items.get(input.itemId).dependencies[0].state = DependencyState.ACTIVE;
    return result;
  };

  const result = await claimNextAvailable({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "worker-1",
    leaseSeconds: 1800
  });

  assert.equal(result.claimed, false);
  assert.equal(result.reason, "candidates_changed");
  assert.equal(result.skipped[0].reason, "dependency_pending");
  assert.equal(adapter.getItem("drift").status, Status.IMPLEMENTATION);
  assert.equal(adapter.getItem("drift").leaseOwner, undefined);
});

test("code-loop workers use the coordinator and leave unavailable work in place", async () => {
  const adapter = new MemoryQueueAdapter([
    workItem({
      id: "blocked-code-loop",
      dependencies: [dependency("blocker", DependencyState.ACTIVE)]
    })
  ]);
  adapter.claimReadyForWorker = async () => {
    throw new Error("legacy claim wrapper must not be used");
  };
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "worker-1",
    repoPolicy: { cwd: "/tmp" }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, false);
  assert.equal(result.reason, "none_available");
  assert.equal(adapter.getItem("blocked-code-loop").status, Status.IMPLEMENTATION);
  assert.equal(adapter.events.length, 0);
});

function workItem(overrides = {}) {
  return {
    id: "item",
    title: "Implement dependency engine",
    status: Status.IMPLEMENTATION,
    workerType: WorkerType.IMPLEMENTER,
    priority: "P1",
    repository: "acme/repo",
    contentType: "Issue",
    number: 1,
    dependencies: [],
    ...overrides
  };
}

function dependency(targetId, state) {
  return { kind: "blockedBy", targetId, title: targetId, state };
}
