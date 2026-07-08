import assert from "node:assert/strict";
import test from "node:test";

import { formatPublicEventComment, PublicOutputRejectedError, sanitizePublicOutput } from "../src/index.js";

test("public output sanitizer keeps concise GitHub-safe evidence", () => {
  const safe = sanitizePublicOutput({
    runId: "run-1",
    workerType: "reviewer",
    outcome: "completed",
    nextStatus: "Babysit",
    summary: "No blocking findings.",
    evidence: ["npm test", "PR checks are green"],
    blocker: "Waiting for required approval",
    prUrl: "https://github.com/acme/repo/pull/42"
  });

  assert.deepEqual(safe.evidence, ["npm test", "PR checks are green"]);
  assert.equal(safe.blocker, "Waiting for required approval");
  assert.equal(safe.prUrl, "https://github.com/acme/repo/pull/42");
  assert.match(formatPublicEventComment(safe), /Outcome: completed/);
  assert.match(formatPublicEventComment(safe), /Blocker: Waiting for required approval/);
});

test("public output sanitizer rejects secrets, local paths, and stream artifacts", () => {
  for (const summary of [
    "GITHUB_TOKEN=ghp_1234567890123456",
    "OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz",
    "Raw key sk-proj-abcdefghijklmnopqrstuvwxyz leaked",
    "See /Users/joseph/.codex/auth.json",
    "See /workspace/ski-stack/stream.jsonl",
    "Full stream is in stream.jsonl"
  ]) {
    assert.throws(
      () =>
        sanitizePublicOutput({
          runId: "run-1",
          workerType: "implementer",
          outcome: "blocked",
          summary
        }),
      PublicOutputRejectedError
    );
  }
});
