import assert from "node:assert/strict";
import test from "node:test";

import { createClaimId, createClaimV2Id, parseClaimId } from "../src/index.js";

test("claim IDs round-trip across processes", () => {
  const claimId = createClaimId({
    itemId: "PVTI_item_1",
    workerId: "host:123:implementer",
    expiresAt: "2026-07-07T12:30:00.000Z"
  });

  assert.match(claimId, /^ski\./);
  assert.deepEqual(parseClaimId(claimId), {
    itemId: "PVTI_item_1",
    workerId: "host:123:implementer",
    expiresAt: "2026-07-07T12:30:00.000Z"
  });
});

test("structured claim envelopes round-trip bounded run context", () => {
  const claimId = createClaimV2Id({
    itemId: "PVTI_item_1",
    workerId: "host:123:reviewer",
    attemptId: "attempt-1",
    runId: "run-1",
    expiresAt: "2026-07-07T12:30:00.000Z",
    resolvedWorkerType: "reviewer",
    claimedStatus: "Review",
    repository: "acme/repo",
    contentType: "PullRequest",
    pullRequestNumber: 42,
    baseRef: "main",
    baseSha: "b".repeat(40),
    headRef: "feature",
    headSha: "a".repeat(40),
    availabilityFingerprint: "f".repeat(64),
    claimedAt: "2026-07-07T12:00:00.000Z"
  });

  assert.match(claimId, /^ski2\./);
  assert.deepEqual(parseClaimId(claimId), {
    version: 2,
    itemId: "PVTI_item_1",
    workerId: "host:123:reviewer",
    attemptId: "attempt-1",
    runId: "run-1",
    expiresAt: "2026-07-07T12:30:00.000Z",
    resolvedWorkerType: "reviewer",
    claimedStatus: "Review",
    repository: "acme/repo",
    contentType: "PullRequest",
    pullRequestNumber: 42,
    baseRef: "main",
    baseSha: "b".repeat(40),
    headRef: "feature",
    headSha: "a".repeat(40),
    availabilityFingerprint: "f".repeat(64),
    claimedAt: "2026-07-07T12:00:00.000Z"
  });
});

test("structured claim envelopes reject oversized payloads", () => {
  assert.throws(
    () =>
      createClaimV2Id(
        {
          itemId: "PVTI_item_1",
          workerId: "worker",
          attemptId: "attempt",
          runId: "run",
          expiresAt: "2026-07-07T12:30:00.000Z",
          resolvedWorkerType: "implementer",
          claimedStatus: "Implementation",
          repository: "acme/repo",
          contentType: "Issue",
          claimedAt: "2026-07-07T12:00:00.000Z",
          branchName: "x".repeat(200)
        },
        { maxBytes: 120 }
      ),
    /exceeds 120 bytes/
  );
});
