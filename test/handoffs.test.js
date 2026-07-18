import test from "node:test";
import assert from "node:assert/strict";

import {
  createStageHandoff,
  formatStageHandoffComment,
  HandoffStage,
  parseStageHandoffComment,
  validateImplementationPlanPayload,
  verifyStageHandoff
} from "../src/index.js";

const secret = "test-handoff-secret-01234567890123456789";

test("signed stage handoffs round-trip and bind their source item", () => {
  const envelope = createStageHandoff({
    secret,
    repository: "acme/repo",
    issueNumber: 12,
    itemId: "PVTI_12",
    stage: HandoffStage.IMPLEMENTATION,
    inputFingerprint: "input-1",
    payload: { branchName: "ski/issue-12", headSha: "a".repeat(40) },
    createdAt: "2026-07-18T12:00:00.000Z"
  });

  const parsed = parseStageHandoffComment(formatStageHandoffComment(envelope));
  assert.deepEqual(
    verifyStageHandoff(parsed, {
      secret,
      repository: "acme/repo",
      issueNumber: 12,
      itemId: "PVTI_12"
    }),
    envelope
  );
  assert.throws(() => verifyStageHandoff(parsed, { secret, itemId: "PVTI_OTHER" }), /item mismatch/);
});

test("signed stage handoffs reject forged and edited comments", () => {
  const envelope = createStageHandoff({
    secret,
    repository: "acme/repo",
    issueNumber: 12,
    itemId: "PVTI_12",
    stage: HandoffStage.REVIEW,
    inputFingerprint: "input-1",
    payload: { verdict: "clean", findings: [] }
  });
  assert.throws(() => verifyStageHandoff({ ...envelope, signature: "0".repeat(64) }, { secret }), /signature/);
  assert.throws(
    () => parseStageHandoffComment(`${formatStageHandoffComment(envelope)}\nforged`),
    /edited/
  );
});

test("implementation plans require distinct reviews and a final clean round", () => {
  const payload = {
    repository: "acme/repo",
    baseRef: "main",
    baseSha: "a".repeat(40),
    plan: "1. Implement the contract.\n2. Verify it.",
    acceptanceCriteria: ["The contract is enforced."],
    tests: ["npm test"],
    risks: ["Migration drift"],
    adversarialReview: {
      verdict: "clean",
      rounds: [{
        reviews: [
          { reviewerId: "review-a", lens: "correctness", findings: [] },
          { reviewerId: "review-b", lens: "failure recovery", findings: [] }
        ]
      }]
    }
  };

  assert.deepEqual(
    validateImplementationPlanPayload(payload, { completedReviewerIds: ["review-a", "review-b"] }),
    payload
  );
  assert.throws(
    () => validateImplementationPlanPayload(payload, { completedReviewerIds: ["review-a"] }),
    /two completed review subagents/
  );
  assert.throws(
    () => validateImplementationPlanPayload({
      ...payload,
      adversarialReview: {
        verdict: "clean",
        rounds: [{ reviews: [
          { reviewerId: "review-a", lens: "correctness", findings: [{
            summary: "bug",
            disposition: "accepted",
            revision: "Corrected the plan.",
            rationale: "The finding is valid."
          }] },
          { reviewerId: "review-b", lens: "recovery", findings: [] }
        ] }]
      }
    }),
    /final adversarial review round must be clean/
  );
  assert.throws(
    () => validateImplementationPlanPayload({
      ...payload,
      adversarialReview: {
        verdict: "clean",
        rounds: [
          { reviews: [
            { reviewerId: "review-a", lens: "correctness", findings: [{ summary: "bug" }] },
            { reviewerId: "review-b", lens: "recovery", findings: [] }
          ] },
          payload.adversarialReview.rounds[0]
        ]
      }
    }),
    /finding disposition/
  );
});

test("stage handoffs reject credentials and machine-local paths before publication", () => {
  const input = {
    secret,
    repository: "acme/repo",
    issueNumber: 12,
    itemId: "PVTI_12",
    stage: HandoffStage.IMPLEMENTATION,
    inputFingerprint: "input-1"
  };
  assert.throws(
    () => createStageHandoff({ ...input, payload: { summary: "token=github_pat_1234567890abcdef" } }),
    /unsafe public output/
  );
  assert.throws(
    () => createStageHandoff({ ...input, payload: { summary: "See /Users/operator/private/run.jsonl" } }),
    /unsafe public output/
  );
  assert.throws(
    () => createStageHandoff({ ...input, payload: { summary: "See /workspace/ski-stack/run.jsonl" } }),
    /unsafe public output/
  );
});
