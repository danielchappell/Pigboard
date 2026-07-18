import assert from "node:assert/strict";
import test from "node:test";

import {
  availabilityFingerprint,
  DependencyState,
  evaluateQueueAvailability,
  Status,
  UnavailableReason,
  WorkerType
} from "../src/index.js";

test("availability accepts dependency-free and fully completed work", () => {
  const noDependencies = item({ id: "no-dependencies" });
  const completed = item({
    id: "completed",
    sourceOrder: 1,
    dependencies: [
      dependency("blocker-1", DependencyState.COMPLETED),
      dependency("blocker-2", DependencyState.COMPLETED)
    ]
  });

  const result = select([noDependencies, completed]);

  assert.deepEqual(result.available.map((candidate) => candidate.item.id), ["no-dependencies", "completed"]);
  assert.equal(result.unavailable.length, 0);
});

test("availability fails closed for pending, canceled, unknown, and missing dependencies", () => {
  const result = select([
    item({ id: "pending", dependencies: [dependency("a", DependencyState.ACTIVE)] }),
    item({ id: "canceled", dependencies: [dependency("b", DependencyState.CANCELED)] }),
    item({ id: "unknown", dependencies: [dependency("c", DependencyState.UNKNOWN)] }),
    item({ id: "missing", dependencies: [{ kind: "blockedBy", state: DependencyState.COMPLETED }] })
  ]);

  assert.equal(result.available.length, 0);
  assert.deepEqual(
    Object.fromEntries(result.unavailable.map((entry) => [entry.item.id, entry.reasons[0].code])),
    {
      pending: UnavailableReason.DEPENDENCY_PENDING,
      canceled: UnavailableReason.DEPENDENCY_CANCELED,
      unknown: UnavailableReason.DEPENDENCY_UNKNOWN,
      missing: UnavailableReason.DEPENDENCY_UNKNOWN
    }
  );
});

test("availability detects self-cycles and multi-item dependency cycles", () => {
  const result = select([
    item({ id: "self", contentId: "issue-self", dependencies: [dependency("issue-self")] }),
    item({ id: "a", contentId: "issue-a", dependencies: [dependency("issue-b")] }),
    item({ id: "b", contentId: "issue-b", dependencies: [dependency("issue-a")] })
  ]);

  assert.equal(result.available.length, 0);
  for (const entry of result.unavailable) {
    assert.ok(entry.reasons.some((reason) => reason.code === UnavailableReason.DEPENDENCY_CYCLE));
  }
});

test("availability filters status, worker, repository, and foreign leases", () => {
  const result = select(
    [
      item({ id: "todo", status: Status.TODO }),
      item({ id: "qa", status: Status.QA, workerType: WorkerType.QA }),
      item({ id: "other-repo", repository: "acme/other" }),
      item({
        id: "leased",
        leaseOwner: "other-worker",
        leaseExpiresAt: "2026-07-07T13:00:00.000Z"
      }),
      item({
        id: "own-lease",
        leaseOwner: "worker-1",
        leaseExpiresAt: "2026-07-07T13:00:00.000Z"
      })
    ],
    { repositories: ["acme/repo"] }
  );

  assert.deepEqual(result.available.map((candidate) => candidate.item.id), ["own-lease"]);
  assert.deepEqual(
    Object.fromEntries(result.unavailable.map((entry) => [entry.item.id, entry.reasons[0].code])),
    {
      todo: UnavailableReason.STATUS,
      qa: UnavailableReason.WORKER,
      "other-repo": UnavailableReason.REPOSITORY,
      leased: UnavailableReason.FOREIGN_LEASE
    }
  );
});

test("availability orders by priority, source order, then stable item id", () => {
  const result = select([
    item({ id: "p2", priority: "P2", sourceOrder: 0 }),
    item({ id: "p0", priority: "P0", sourceOrder: 50 }),
    item({ id: "p1-z", priority: "P1", sourceOrder: 4 }),
    item({ id: "p1-b", priority: "P1", sourceOrder: 2 }),
    item({ id: "p1-a", priority: "P1", sourceOrder: 2 })
  ]);

  assert.deepEqual(result.available.map((candidate) => candidate.item.id), ["p0", "p1-a", "p1-b", "p1-z", "p2"]);
});

test("availability fingerprints cover routing and dependencies but not dispatch rank", () => {
  const base = item({
    id: "fingerprint",
    priority: "P1",
    sourceOrder: 3,
    dependencies: [dependency("blocker", DependencyState.COMPLETED)]
  });
  const fingerprint = availabilityFingerprint(base);

  assert.equal(availabilityFingerprint({ ...base, priority: "P0", sourceOrder: 99 }), fingerprint);
  assert.notEqual(availabilityFingerprint({ ...base, repository: "acme/other" }), fingerprint);
  assert.notEqual(availabilityFingerprint({ ...base, status: Status.QA, workerType: WorkerType.QA }), fingerprint);
  assert.notEqual(
    availabilityFingerprint({ ...base, dependencies: [dependency("blocker", DependencyState.ACTIVE)] }),
    fingerprint
  );
});

test("availability skips only items whose persisted cooldown has not elapsed", () => {
  const now = new Date("2026-07-18T12:00:00.000Z");
  const selection = evaluateQueueAvailability({ items: [
    item({ id: "cooling", status: Status.BABYSIT, workerType: WorkerType.PR_BABYSITTER, contentType: "PullRequest", availableAfter: "2026-07-18T12:05:00.000Z" }),
    item({ id: "ready", status: Status.BABYSIT, workerType: WorkerType.PR_BABYSITTER, contentType: "PullRequest" })
  ] }, { workerType: WorkerType.PR_BABYSITTER, now });

  assert.deepEqual(selection.available.map((candidate) => candidate.item.id), ["ready"]);
  assert.equal(selection.unavailable[0].reasons[0].code, UnavailableReason.NOT_BEFORE);
});

test("automated planning and implementation require source issues", () => {
  const selection = evaluateQueueAvailability({ items: [
    item({
      id: "draft",
      status: Status.IMPLEMENTATION_PLANNING,
      workerType: WorkerType.IMPLEMENTATION_PLANNER,
      contentType: "DraftIssue"
    })
  ] }, { workerType: WorkerType.IMPLEMENTATION_PLANNER });

  assert.equal(selection.available.length, 0);
  assert.equal(selection.unavailable[0].reasons[0].code, UnavailableReason.UNSUPPORTED_CONTENT_TYPE);
});

test("terminal source content is never claimed before lifecycle reconciliation", () => {
  const closed = item({ contentType: "Issue", contentState: "CLOSED" });
  const result = evaluateQueueAvailability([closed], { workerType: WorkerType.IMPLEMENTER });
  assert.equal(result.available.length, 0);
  assert.equal(result.unavailable[0].reasons[0].code, UnavailableReason.SOURCE_TERMINAL);
});

function select(items, overrides = {}) {
  return evaluateQueueAvailability(
    { items },
    {
      workerType: WorkerType.IMPLEMENTER,
      workerId: "worker-1",
      now: new Date("2026-07-07T12:00:00.000Z"),
      ...overrides
    }
  );
}

function item(overrides = {}) {
  return {
    id: "item",
    title: "Work item",
    status: Status.IMPLEMENTATION,
    workerType: WorkerType.IMPLEMENTER,
    priority: "P1",
    sourceOrder: 0,
    repository: "acme/repo",
    dependencies: [],
    ...overrides
  };
}

function dependency(targetId, state = DependencyState.ACTIVE) {
  return {
    kind: "blockedBy",
    targetId,
    title: targetId,
    url: `https://github.com/acme/repo/issues/${targetId}`,
    state
  };
}
