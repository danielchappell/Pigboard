import assert from "node:assert/strict";
import test from "node:test";

import { planDeliveryLifecycleMigration, Status } from "../src/index.js";

test("delivery lifecycle migration preserves every recoverable evidence class", () => {
  const now = new Date("2026-07-18T12:00:00.000Z");
  const items = [
    item("lease", { leaseExpiresAt: "2026-07-18T12:05:00.000Z" }),
    item("plan", { hasSignedPlan: true }),
    item("run", { lastWorkerRun: "ski.claim" }),
    item("attempt", { attempts: 1 }),
    item("pr", { status: Status.REVIEW, prUrl: "https://github.com/acme/repo/pull/42" }),
    item("branch", { status: Status.REVIEW })
  ];
  const remoteBranches = new Map([["branch", { branchName: "ski/issue-12", headSha: "a".repeat(40) }]]);

  const changes = planDeliveryLifecycleMigration(items, { now, remoteBranches });

  assert.deepEqual(changes.map((change) => change.reason), [
    "active_lease",
    "signed_plan",
    "worker_evidence",
    "worker_evidence",
    "pull_request",
    "remote_branch"
  ]);
  assert.ok(changes.every((change) => change.action === "preserve"));
});

test("delivery lifecycle migration moves only unclaimed unrecoverable Implementation or Review cards", () => {
  const changes = planDeliveryLifecycleMigration([
    item("implementation"),
    item("review", { status: Status.REVIEW }),
    item("babysit", { status: Status.BABYSIT }),
    item("expired", { leaseExpiresAt: "2026-07-18T11:00:00.000Z" })
  ], { now: new Date("2026-07-18T12:00:00.000Z") });

  assert.deepEqual(changes, [
    { itemId: "implementation", action: "move", from: Status.IMPLEMENTATION, to: Status.IMPLEMENTATION_PLANNING },
    { itemId: "review", action: "move", from: Status.REVIEW, to: Status.IMPLEMENTATION_PLANNING },
    { itemId: "expired", action: "move", from: Status.IMPLEMENTATION, to: Status.IMPLEMENTATION_PLANNING }
  ]);
});

function item(id, overrides = {}) {
  return { id, status: Status.IMPLEMENTATION, repository: "acme/repo", contentType: "Issue", number: 12, ...overrides };
}
