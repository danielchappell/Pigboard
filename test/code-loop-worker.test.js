import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { GitHubCodeLoopWorker, MemoryQueueAdapter, runSettledWorkerSlot, Status, WorkerType } from "../src/index.js";

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
  const calls = { setup: 0, verify: 0, logs: 0, cleanup: 0, push: 0 };
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
    execFileImpl: async (_command, args) => {
      if (args.includes("push")) calls.push += 1;
      return { stdout: "", stderr: "" };
    },
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
  assert.deepEqual(calls, { setup: 1, verify: 1, logs: 1, cleanup: 1, push: 1 });
});

test("initial claim verification failures write artifacts and fail the item", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-missing-head",
      title: "Review missing PR metadata",
      status: Status.REVIEW,
      workerType: WorkerType.REVIEWER,
      priority: "P1",
      repository: "acme/repo",
      contentType: "PullRequest",
      number: 42
    }
  ]);
  let logged = false;
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.REVIEWER,
    workerId: "reviewer-missing-head",
    repoPolicy: { cwd: root },
    runLogDir: join(root, "runs"),
    writeRunArtifactsImpl: async () => {
      logged = true;
      return { runDir: join(root, "runs", "run") };
    },
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.match(result.error.message, /missing_head_sha/);
  assert.equal(logged, true);
  assert.equal(adapter.getItem("item-missing-head").status, Status.BLOCKED);
  assert.equal(adapter.getItem("item-missing-head").leaseOwner, undefined);
});

test("PR creation implies pushing the generated branch", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-push-for-pr",
      title: "Build thing",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1",
      repository: "acme/repo",
      contentType: "Issue",
      number: 12
    }
  ]);
  const pushes = [];
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-push",
    repoPolicy: { cwd: root, allowCreatePr: true, githubToken: "test-token" },
    runLogDir: join(root, "runs"),
    createImplementationWorktreeImpl: async () => {
      const worktreePath = join(root, "worktree");
      await mkdir(worktreePath, { recursive: true });
      return { worktreePath, branchName: "ski/12-run" };
    },
    runRepoCommandsImpl: async () => [],
    assertCredentialFreeWorktreeImpl: async () => ({ ok: true }),
    runCodexExecImpl: async ({ outputPath }) => {
      await writeFile(
        outputPath,
        JSON.stringify({
          outcome: "completed",
          nextStatus: Status.REVIEW,
          summary: "Implemented."
        })
      );
      return { stdout: "", stderr: "" };
    },
    hasDiffImpl: async () => true,
    commitAllImpl: async () => "a".repeat(40),
    execFileImpl: async (_command, args) => {
      if (args.includes("push")) pushes.push(args);
      return { stdout: "", stderr: "" };
    },
    ensurePullRequestImpl: async () => ({ number: 42, url: "https://github.com/acme/repo/pull/42" }),
    writeRunArtifactsImpl: async () => ({ runDir: join(root, "runs", "run") }),
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(pushes.length, 1);
  assert.deepEqual(pushes[0].slice(-2), ["https://github.com/acme/repo.git", "HEAD:ski/12-run"]);
});

test("settled worker slots report failures without throwing", async () => {
  const errors = [];
  const result = await runSettledWorkerSlot({
    key: "implementer:acme_repo:0",
    worker: {
      runOnce: async () => {
        throw new Error("claim lookup failed");
      }
    },
    onError: (error) => errors.push(error.message)
  });

  assert.equal(result.key, "implementer:acme_repo:0");
  assert.equal(result.ran, false);
  assert.match(result.error.message, /claim lookup failed/);
  assert.deepEqual(errors, ["claim lookup failed"]);
});

test("stale worker-type reroutes release without blocking the item", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-partial-failure",
      title: "Build thing",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1",
      repository: "acme/repo",
      contentType: "Issue",
      number: 12
    }
  ]);
  adapter.clearWorkerTypeForClaim = async () => ({ cleared: false, reason: "worker_type_changed" });
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-partial",
    repoPolicy: { cwd: root, allowCreatePr: true, githubToken: "test-token" },
    runLogDir: join(root, "runs"),
    createImplementationWorktreeImpl: async () => {
      const worktreePath = join(root, "worktree");
      await mkdir(worktreePath, { recursive: true });
      return { worktreePath, branchName: "ski/12-run" };
    },
    runRepoCommandsImpl: async () => [],
    assertCredentialFreeWorktreeImpl: async () => ({ ok: true }),
    runCodexExecImpl: async ({ outputPath }) => {
      await writeFile(
        outputPath,
        JSON.stringify({
          outcome: "completed",
          nextStatus: Status.REVIEW,
          summary: "Implemented."
        })
      );
      return { stdout: "", stderr: "" };
    },
    hasDiffImpl: async () => true,
    commitAllImpl: async () => "a".repeat(40),
    execFileImpl: async () => ({ stdout: "", stderr: "" }),
    ensurePullRequestImpl: async () => ({ number: 42, url: "https://github.com/acme/repo/pull/42" }),
    writeRunArtifactsImpl: async () => ({ runDir: join(root, "runs", "run") }),
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.match(result.error.message, /worker_type_changed/);
  assert.equal(adapter.getItem("item-partial-failure").status, Status.REVIEW);
  assert.equal(adapter.getItem("item-partial-failure").leaseOwner, undefined);
});

test("implementer blocks instead of advancing to Review without PR creation", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-no-pr",
      title: "Build thing",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1",
      repository: "acme/repo",
      contentType: "Issue",
      number: 12
    }
  ]);
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-no-pr",
    repoPolicy: { cwd: root, allowCreatePr: false },
    runLogDir: join(root, "runs"),
    createImplementationWorktreeImpl: async () => {
      const worktreePath = join(root, "worktree");
      await mkdir(worktreePath, { recursive: true });
      return { worktreePath, branchName: "ski/12-run" };
    },
    runRepoCommandsImpl: async () => [],
    assertCredentialFreeWorktreeImpl: async () => ({ ok: true }),
    runCodexExecImpl: async ({ outputPath }) => {
      await writeFile(
        outputPath,
        JSON.stringify({
          outcome: "completed",
          nextStatus: Status.REVIEW,
          summary: "Implemented."
        })
      );
      return { stdout: "", stderr: "" };
    },
    hasDiffImpl: async () => true,
    writeRunArtifactsImpl: async () => ({ runDir: join(root, "runs", "run") }),
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.match(result.error.message, /requires allowCreatePr/);
  assert.equal(adapter.getItem("item-no-pr").status, Status.BLOCKED);
  assert.equal(adapter.getItem("item-no-pr").leaseOwner, undefined);
});

test("worker fails the claim even when local failure logging fails", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-log-fail",
      title: "Build thing",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1",
      repository: "acme/repo",
      contentType: "Issue",
      number: 12
    }
  ]);
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-log-fail",
    repoPolicy: { cwd: root, allowCreatePr: true, githubToken: "test-token" },
    runLogDir: join(root, "runs"),
    createImplementationWorktreeImpl: async () => {
      const worktreePath = join(root, "worktree");
      await mkdir(worktreePath, { recursive: true });
      return { worktreePath, branchName: "ski/12-run" };
    },
    runRepoCommandsImpl: async () => [],
    assertCredentialFreeWorktreeImpl: async () => ({ ok: true }),
    runCodexExecImpl: async ({ outputPath }) => {
      await writeFile(
        outputPath,
        JSON.stringify({
          outcome: "completed",
          nextStatus: Status.QA,
          summary: "Wrong transition."
        })
      );
      return { stdout: "", stderr: "" };
    },
    writeRunArtifactsImpl: async () => {
      throw new Error("disk full");
    },
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.match(result.error.message, /complete to Review/);
  assert.equal(adapter.getItem("item-log-fail").status, Status.BLOCKED);
  assert.equal(adapter.getItem("item-log-fail").leaseOwner, undefined);
});

test("issue-backed reviewer work requires PR metadata instead of falling back to issue number", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const worker = new GitHubCodeLoopWorker({
    adapter: new MemoryQueueAdapter([]),
    workerType: WorkerType.REVIEWER,
    repoPolicy: { cwd: root }
  });

  await assert.rejects(
    () =>
      worker.prepareWorktree({
        item: {
          id: "item-issue-review",
          contentType: "Issue",
          number: 42,
          repository: "acme/repo"
        },
        claim: {
          repository: "acme/repo",
          runId: "run-1",
          headSha: "a".repeat(40)
        }
      }),
    /reviewer requires a pull request/
  );
});

test("claim heartbeat interval is scheduled before short leases expire", async () => {
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  let intervalMs;
  globalThis.setInterval = (_fn, ms) => {
    intervalMs = ms;
    return { unref: () => {} };
  };
  globalThis.clearInterval = () => {};
  try {
    const worker = new GitHubCodeLoopWorker({
      adapter: new MemoryQueueAdapter([]),
      workerType: WorkerType.IMPLEMENTER,
      repoPolicy: { cwd: await mkdtemp(join(tmpdir(), "ski-worker-")) },
      leaseSeconds: 30
    });

    worker.startClaimExtender("claim-id").stop();

    assert.equal(intervalMs < 30_000, true);
    assert.equal(intervalMs, 10_000);
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test("worker prompt uses resolved worker type when Worker Type field is blank", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-blank-worker",
      title: "Build thing",
      status: Status.IMPLEMENTATION,
      priority: "P1",
      repository: "acme/repo",
      contentType: "Issue",
      number: 12
    }
  ]);
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-blank",
    repoPolicy: { cwd: root, allowCreatePr: true, githubToken: "test-token" },
    runLogDir: join(root, "runs"),
    createImplementationWorktreeImpl: async () => {
      const worktreePath = join(root, "worktree");
      await mkdir(worktreePath, { recursive: true });
      return { worktreePath, branchName: "ski/12-run" };
    },
    runRepoCommandsImpl: async () => [],
    assertCredentialFreeWorktreeImpl: async () => ({ ok: true }),
    runCodexExecImpl: async ({ prompt, outputPath }) => {
      assert.match(prompt, /`implementer` stage/);
      assert.doesNotMatch(prompt, /`undefined` stage/);
      await writeFile(
        outputPath,
        JSON.stringify({
          outcome: "completed",
          nextStatus: Status.REVIEW,
          summary: "Implemented."
        })
      );
      return { stdout: "", stderr: "" };
    },
    hasDiffImpl: async () => true,
    commitAllImpl: async () => "a".repeat(40),
    execFileImpl: async () => ({ stdout: "", stderr: "" }),
    ensurePullRequestImpl: async () => ({ number: 42, url: "https://github.com/acme/repo/pull/42" }),
    writeRunArtifactsImpl: async () => ({ runDir: join(root, "runs", "run") }),
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
});

test("worker extends the claim while a run is active", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-heartbeat",
      title: "Build thing",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1",
      repository: "acme/repo",
      contentType: "Issue",
      number: 12
    }
  ]);
  let extensions = 0;
  const originalExtend = adapter.extendClaim.bind(adapter);
  adapter.extendClaim = async (...args) => {
    extensions += 1;
    return originalExtend(...args);
  };
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-heartbeat",
    leaseSeconds: 60,
    claimHeartbeatMs: 1,
    repoPolicy: { cwd: root, allowCreatePr: true, githubToken: "test-token" },
    runLogDir: join(root, "runs"),
    createImplementationWorktreeImpl: async () => {
      const worktreePath = join(root, "worktree");
      await mkdir(worktreePath, { recursive: true });
      return { worktreePath, branchName: "ski/12-run" };
    },
    runRepoCommandsImpl: async () => [],
    assertCredentialFreeWorktreeImpl: async () => ({ ok: true }),
    runCodexExecImpl: async ({ outputPath }) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      await writeFile(
        outputPath,
        JSON.stringify({
          outcome: "completed",
          nextStatus: Status.REVIEW,
          summary: "Implemented."
        })
      );
      return { stdout: "", stderr: "" };
    },
    hasDiffImpl: async () => true,
    commitAllImpl: async () => "a".repeat(40),
    execFileImpl: async () => ({ stdout: "", stderr: "" }),
    ensurePullRequestImpl: async () => ({ number: 42, url: "https://github.com/acme/repo/pull/42" }),
    writeRunArtifactsImpl: async () => ({ runDir: join(root, "runs", "run") }),
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(extensions > 0, true);
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
