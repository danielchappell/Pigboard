import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { findRuns, readRunTranscript, writeRunArtifacts } from "../src/index.js";

test("run logs can be retrieved by issue title, worker, status, and latest run", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "ski-runs-"));
  await writeRunArtifacts({
    rootDir,
    runId: "run-1",
    stream: JSON.stringify({
      type: "item.completed",
      item: { type: "agent_message", text: "Working on issue one." }
    }),
    result: { outcome: "completed", summary: "Implemented issue one." },
    metadata: {
      workerType: "implementer",
      status: "Implementation",
      issueNumber: 12,
      issueTitle: "Build webhook worker",
      projectItemId: "PVTI_1",
      projectItemTitle: "Build webhook worker"
    }
  });
  await writeRunArtifacts({
    rootDir,
    runId: "run-2",
    stream: "",
    result: { outcome: "blocked", summary: "Missing approval." },
    metadata: {
      workerType: "reviewer",
      status: "Review",
      prNumber: 7,
      prTitle: "Queue adapter",
      projectItemId: "PVTI_2",
      projectItemTitle: "Review queue adapter"
    }
  });

  const issueRuns = await findRuns({ rootDir, filters: { issue: "webhook", worker: "implementer" } });
  assert.equal(issueRuns.length, 1);
  assert.equal(issueRuns[0].runId, "run-1");

  const latestReview = await findRuns({ rootDir, filters: { status: "Review", latest: true } });
  assert.equal(latestReview.length, 1);
  assert.equal(latestReview[0].runId, "run-2");

  const transcript = await readRunTranscript(issueRuns[0]);
  assert.match(transcript, /Working on issue one/);
  assert.match(transcript, /Implemented issue one/);
});

