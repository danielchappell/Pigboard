import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { GitHubCodeLoopWorker, MemoryQueueAdapter, Status, WorkerType } from "../src/index.js";

test("implementer runs Codex, commits a non-empty diff, logs locally, and transitions to Review", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-1",
      title: "Build thing",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1",
      repository: "acme/repo",
      contentType: "Issue",
      number: 12
    }
  ]);
  const calls = { setup: 0, verify: 0, logs: 0, cleanup: 0 };
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-1",
    repoPolicy: {
      cwd: root,
      setupCommands: ["npm install"],
      verifyCommands: ["npm test"],
      allowPushBranches: false,
      allowCreatePr: true,
      githubToken: "test-token"
    },
    runLogDir: join(root, "runs"),
    createImplementationWorktreeImpl: async () => {
      const worktreePath = join(root, "worktree");
      await mkdir(worktreePath, { recursive: true });
      return { worktreePath, branchName: "ski/12-run" };
    },
    runRepoCommandsImpl: async ({ commands }) => {
      if (commands.includes("npm install")) calls.setup += 1;
      if (commands.includes("npm test")) calls.verify += 1;
      return [];
    },
    assertCredentialFreeWorktreeImpl: async () => ({ ok: true }),
    runCodexExecImpl: async ({ outputPath }) => {
      await writeFile(
        outputPath,
        JSON.stringify({
          outcome: "completed",
          nextStatus: Status.REVIEW,
          summary: "Implemented.",
          evidence: ["unit tests"]
        })
      );
      return { stdout: "", stderr: "" };
    },
    hasDiffImpl: async () => true,
    commitAllImpl: async () => "a".repeat(40),
    ensurePullRequestImpl: async ({ title, body }) => {
      assert.equal(title, "Ski Stack: Build thing");
      assert.match(body, /Outcome: completed/);
      return { number: 42, url: "https://github.com/acme/repo/pull/42" };
    },
    writeRunArtifactsImpl: async () => {
      calls.logs += 1;
      return { runDir: join(root, "runs", "run") };
    },
    cleanupWorktreeImpl: async () => {
      calls.cleanup += 1;
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(adapter.getItem("item-1").status, Status.REVIEW);
  assert.equal(adapter.getItem("item-1").leaseOwner, undefined);
  assert.equal(adapter.events[0].outcome, "completed");
  assert.match(adapter.events[0].evidence.at(-2), /^Commit a{40}$/);
  assert.equal(adapter.events[0].evidence.at(-1), "PR https://github.com/acme/repo/pull/42");
  assert.equal(adapter.getItem("item-1").fields.PR, "https://github.com/acme/repo/pull/42");
  assert.deepEqual(calls, { setup: 1, verify: 1, logs: 1, cleanup: 1 });
});

test("reviewer transitions clean PRs to Babysit", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-2",
      title: "Review queue adapter",
      status: Status.REVIEW,
      workerType: WorkerType.REVIEWER
    })
  ]);
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.REVIEWER,
    result: {
      outcome: "completed",
      nextStatus: Status.BABYSIT,
      summary: "No blocking findings."
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(adapter.getItem("item-2").status, Status.BABYSIT);
  assert.equal(adapter.events[0].workerType, WorkerType.REVIEWER);
});

test("pr-babysitter requires explicit approved-and-clean flag to mark Done", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-3",
      title: "Babysit queue adapter",
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER
    })
  ]);
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.PR_BABYSITTER,
    result: {
      outcome: "completed",
      nextStatus: Status.DONE,
      summary: "Approved and checks are clean.",
      doneWhenApprovedAndClean: true
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(adapter.getItem("item-3").status, Status.DONE);
});

test("pr-babysitter blocks Done without approved-and-clean flag", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-4",
      title: "Babysit queue adapter",
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER
    })
  ]);
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.PR_BABYSITTER,
    result: {
      outcome: "completed",
      nextStatus: Status.DONE,
      summary: "Approved and checks are clean."
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.match(result.error.message, /doneWhenApprovedAndClean/);
  assert.equal(adapter.getItem("item-4").status, Status.BLOCKED);
});

function workerWithCodexResult({ root, adapter, workerType, result }) {
  return new GitHubCodeLoopWorker({
    adapter,
    workerType,
    workerId: `${workerType}-1`,
    repoPolicy: { cwd: root },
    runLogDir: join(root, "runs"),
    createPullRequestWorktreeImpl: async () => {
      const worktreePath = join(root, "worktree");
      await mkdir(worktreePath, { recursive: true });
      return { worktreePath };
    },
    runRepoCommandsImpl: async () => [],
    assertCredentialFreeWorktreeImpl: async () => ({ ok: true }),
    runCodexExecImpl: async ({ outputPath }) => {
      await writeFile(outputPath, JSON.stringify(result));
      return { stdout: "", stderr: "" };
    },
    writeRunArtifactsImpl: async () => ({ runDir: join(root, "runs", "run") }),
    cleanupWorktreeImpl: async () => {}
  });
}

function pullRequestItem({ id, title, status, workerType }) {
  return {
    id,
    title,
    status,
    workerType,
    priority: "P2",
    repository: "acme/repo",
    contentType: "PullRequest",
    number: 42,
    url: "https://github.com/acme/repo/pull/42",
    baseRef: "main",
    baseSha: "b".repeat(40),
    headRef: "feature",
    headSha: "a".repeat(40)
  };
}
