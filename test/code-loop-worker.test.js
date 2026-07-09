import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { GitHubCodeLoopWorker, MemoryQueueAdapter, parseClaimId, runSettledWorkerSlot, Status, WorkerType } from "../src/index.js";

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
  const calls = { setup: 0, verify: 0, reset: 0, listUntracked: 0, logs: 0, cleanup: 0, push: 0 };
  const untrackedSnapshots = [
    ["package-lock.json"],
    ["package-lock.json", "src/worker-output.js"],
    ["package-lock.json", "src/worker-output.js", "coverage/lcov.info"]
  ];
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-1",
    model: "gpt-test",
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
    resetTrackedChangesImpl: async () => {
      calls.reset += 1;
    },
    listUntrackedFilesImpl: async () => {
      calls.listUntracked += 1;
      return untrackedSnapshots.shift() ?? [];
    },
    assertCredentialFreeWorktreeImpl: async () => ({ ok: true }),
    runCodexExecImpl: async ({ model, outputPath }) => {
      assert.equal(model, "gpt-test");
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
    hasDiffImpl: async ({ ignoredPaths }) => {
      assert.deepEqual(ignoredPaths, ["package-lock.json"]);
      return true;
    },
    commitAllImpl: async ({ ignoredPaths }) => {
      assert.deepEqual(ignoredPaths, ["package-lock.json", "coverage/lcov.info"]);
      return "a".repeat(40);
    },
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
  assert.deepEqual(calls, { setup: 1, verify: 1, reset: 1, listUntracked: 3, logs: 1, cleanup: 1, push: 1 });
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
  assert.deepEqual(pushes[0].slice(-3), ["--no-verify", "https://github.com/acme/repo.git", "HEAD:ski/12-run"]);
});

test("worker re-checks worktree git config after Codex before git operations", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-post-codex-config",
      title: "Build thing",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1",
      repository: "acme/repo",
      contentType: "Issue",
      number: 12
    }
  ]);
  let safetyChecks = 0;
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-post-codex-config",
    repoPolicy: { cwd: root, allowCreatePr: true, githubToken: "test-token" },
    runLogDir: join(root, "runs"),
    createImplementationWorktreeImpl: async () => {
      const worktreePath = join(root, "worktree");
      await mkdir(worktreePath, { recursive: true });
      return { worktreePath, branchName: "ski/12-run" };
    },
    runRepoCommandsImpl: async () => [],
    assertCredentialFreeWorktreeImpl: async () => {
      safetyChecks += 1;
      return { ok: true };
    },
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
    commitAllImpl: async () => {
      assert.equal(safetyChecks, 2);
      return "a".repeat(40);
    },
    execFileImpl: async () => ({ stdout: "", stderr: "" }),
    ensurePullRequestImpl: async () => ({ number: 42, url: "https://github.com/acme/repo/pull/42" }),
    writeRunArtifactsImpl: async () => ({ runDir: join(root, "runs", "run") }),
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(adapter.getItem("item-post-codex-config").status, Status.REVIEW);
  assert.equal(safetyChecks, 2);
});

test("generic worker failures release instead of blocking after claim drift", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-drifted",
      title: "Build thing",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1",
      repository: "acme/repo",
      contentType: "Issue",
      number: 12
    }
  ]);
  const claimResult = await adapter.claimReadyForWorker({
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-drift",
    leaseSeconds: 1800
  });
  await adapter.transition(claimResult.item.id, Status.REVIEW);
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-drift",
    repoPolicy: { cwd: await mkdtemp(join(tmpdir(), "ski-worker-")) }
  });

  await worker.failClaimAfterError(claimResult.claim.id, "release failed after transition");

  assert.equal(adapter.getItem("item-drifted").status, Status.REVIEW);
  assert.equal(adapter.getItem("item-drifted").leaseOwner, undefined);
});

test("stale PR snapshot failures release instead of blocking", async () => {
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-head-drift",
      title: "Review queue adapter",
      status: Status.REVIEW,
      workerType: WorkerType.REVIEWER
    })
  ]);
  const claimResult = await adapter.claimReadyForWorker({
    workerType: WorkerType.REVIEWER,
    workerId: "reviewer-drift",
    leaseSeconds: 1800
  });
  adapter.failClaim = async () => {
    throw new Error("stale PR snapshots should not fail the item");
  };
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.REVIEWER,
    workerId: "reviewer-drift",
    repoPolicy: { cwd: await mkdtemp(join(tmpdir(), "ski-worker-")) }
  });

  await worker.failClaimAfterError(claimResult.claim.id, "claim lost: head_drift");

  assert.equal(adapter.getItem("item-head-drift").status, Status.REVIEW);
  assert.equal(adapter.getItem("item-head-drift").leaseOwner, undefined);
});

test("unsafe PR body output falls back to withheld public text", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-unsafe-pr-body",
      title: "Build thing",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1",
      repository: "acme/repo",
      contentType: "Issue",
      number: 12
    }
  ]);
  let prBody;
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-unsafe-pr-body",
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
          summary: "Details are in /Users/joseph/.ski-stack/runs/run-1"
        })
      );
      return { stdout: "", stderr: "" };
    },
    hasDiffImpl: async () => true,
    commitAllImpl: async () => "a".repeat(40),
    execFileImpl: async () => ({ stdout: "", stderr: "" }),
    ensurePullRequestImpl: async ({ body }) => {
      prBody = body;
      return { number: 42, url: "https://github.com/acme/repo/pull/42" };
    },
    writeRunArtifactsImpl: async () => ({ runDir: join(root, "runs", "run") }),
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.match(prBody, /output withheld locally/);
  assert.doesNotMatch(prBody, /\/Users\/joseph/);
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

test("implementer preserves blocked results instead of replacing the blocker", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-blocked",
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
    workerId: "impl-blocked",
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
          outcome: "blocked",
          summary: "Missing product decision.",
          blocker: "Choose the integration target."
        })
      );
      return { stdout: "", stderr: "" };
    },
    hasDiffImpl: async () => {
      throw new Error("blocked implementer should not inspect diffs");
    },
    writeRunArtifactsImpl: async () => ({ runDir: join(root, "runs", "run") }),
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(adapter.getItem("item-blocked").status, Status.BLOCKED);
  assert.equal(adapter.events[0].body, "Missing product decision.");
  assert.equal(adapter.events[0].blocker, "Choose the integration target.");
});

test("worker preserves Codex stderr when exec fails", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-codex-fails",
      title: "Build thing",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1",
      repository: "acme/repo",
      contentType: "Issue",
      number: 12
    }
  ]);
  let logged;
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-codex-fails",
    repoPolicy: { cwd: root, allowCreatePr: true, githubToken: "test-token" },
    runLogDir: join(root, "runs"),
    createImplementationWorktreeImpl: async () => {
      const worktreePath = join(root, "worktree");
      await mkdir(worktreePath, { recursive: true });
      return { worktreePath, branchName: "ski/12-run" };
    },
    runRepoCommandsImpl: async () => [],
    assertCredentialFreeWorktreeImpl: async () => ({ ok: true }),
    runCodexExecImpl: async () => {
      throw Object.assign(new Error("codex failed"), {
        stdout: "{\"type\":\"turn.started\"}\n",
        stderr: "schema validation failed"
      });
    },
    writeRunArtifactsImpl: async (artifact) => {
      logged = artifact;
      return { runDir: join(root, "runs", "run") };
    },
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.match(result.error.message, /codex failed/);
  assert.equal(logged.stream, "{\"type\":\"turn.started\"}\n");
  assert.equal(logged.stderr, "schema validation failed");
  assert.equal(adapter.getItem("item-codex-fails").status, Status.BLOCKED);
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

test("implementer refuses PR-backed claims instead of opening a replacement PR", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const worker = new GitHubCodeLoopWorker({
    adapter: new MemoryQueueAdapter([]),
    workerType: WorkerType.IMPLEMENTER,
    repoPolicy: { cwd: root }
  });

  await assert.rejects(
    () =>
      worker.prepareWorktree({
        item: {
          id: "item-issue-with-pr",
          contentType: "Issue",
          number: 12,
          repository: "acme/repo"
        },
        claim: {
          repository: "acme/repo",
          runId: "run-1",
          pullRequestNumber: 42
        }
      }),
    /must stay in Babysit/
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

test("PR workers receive feedback context in the Codex prompt", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-feedback-context",
      title: "Babysit feedback",
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER
    })
  ]);
  adapter.loadPullRequestFeedbackForClaim = async () => ({
    reviewComments: [{ path: "src/example.js", line: 10, body: "Fix this comment" }],
    ci: { failingCheckRuns: [{ name: "unit", conclusion: "failure" }] }
  });
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.PR_BABYSITTER,
    workerId: "babysitter-feedback",
    repoPolicy: { cwd: root },
    runLogDir: join(root, "runs"),
    createPullRequestWorktreeImpl: async () => {
      const worktreePath = join(root, "worktree");
      await mkdir(worktreePath, { recursive: true });
      return { worktreePath };
    },
    runRepoCommandsImpl: async () => [],
    assertCredentialFreeWorktreeImpl: async () => ({ ok: true }),
    runCodexExecImpl: async ({ prompt, outputPath }) => {
      assert.match(prompt, /## Pull Request Feedback/);
      assert.match(prompt, /Fix this comment/);
      assert.match(prompt, /failingCheckRuns/);
      await writeFile(
        outputPath,
        JSON.stringify({
          outcome: "no-op",
          nextStatus: Status.BABYSIT,
          summary: "Waiting."
        })
      );
      return { stdout: "", stderr: "" };
    },
    hasDiffImpl: async () => false,
    writeRunArtifactsImpl: async () => ({ runDir: join(root, "runs", "run") }),
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(result.error, undefined);
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

test("worker drains pending claim extensions before release", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-extension-release",
      title: "Build thing",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1",
      repository: "acme/repo",
      contentType: "Issue",
      number: 12
    }
  ]);
  const order = [];
  adapter.extendClaim = async () => {
    order.push("extend-start");
    await new Promise((resolve) => setTimeout(resolve, 20));
    order.push("extend-end");
    return { extended: true };
  };
  const releaseClaim = adapter.releaseClaim.bind(adapter);
  adapter.releaseClaim = async (...args) => {
    order.push("release");
    return releaseClaim(...args);
  };
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-extension-release",
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
      await new Promise((resolve) => setTimeout(resolve, 5));
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
  assert.deepEqual(order, ["extend-start", "extend-end", "release"]);
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

test("pr-babysitter merges verifier-approved PRs before moving to QA", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-3",
      title: "Babysit queue adapter",
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER
    })
  ]);
  let qaVerifications = 0;
  adapter.verifyPullRequestReadyForQaForClaim = async () => {
    qaVerifications += 1;
    return { ready: true };
  };
  const merges = [];
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.PR_BABYSITTER,
    repoPolicy: { cwd: root, githubToken: "test-token", mergeMethod: "squash", allowMerge: true },
    result: {
      outcome: "completed",
      nextStatus: Status.QA,
      summary: "Verifier approved merge before QA.",
      mergeWhenApprovedAndClean: true
    },
    mergePullRequestImpl: async (input) => {
      merges.push(input);
      return { merged: true, sha: "m".repeat(40), message: "merged" };
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(adapter.getItem("item-3").status, Status.QA);
  assert.equal(qaVerifications, 1);
  assert.equal(merges.length, 1);
  assert.equal(merges[0].number, 42);
  assert.equal(merges[0].expectedHeadSha, "a".repeat(40));
  assert.equal(merges[0].method, "squash");
  assert.match(adapter.events[0].evidence.at(-1), /^Merged PR #42 at m{40}$/);
});

test("pr-babysitter skips merge call when PR is already merged", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-already-merged",
      title: "Babysit queue adapter",
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER
    })
  ]);
  adapter.verifyPullRequestReadyForQaForClaim = async () => ({ ready: true, reason: "merged" });
  let mergeCalls = 0;
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.PR_BABYSITTER,
    result: {
      outcome: "completed",
      nextStatus: Status.QA,
      summary: "PR is already merged.",
      mergeWhenApprovedAndClean: true
    },
    mergePullRequestImpl: async () => {
      mergeCalls += 1;
      return { merged: true, sha: "m".repeat(40), message: "merged" };
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(adapter.getItem("item-already-merged").status, Status.QA);
  assert.equal(mergeCalls, 0);
  assert.equal(adapter.events[0].evidence.at(-1), "PR #42 already merged");
});

test("pr-babysitter merges no-op approved PRs before moving to QA", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-no-op-qa",
      title: "Babysit queue adapter",
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER
    })
  ]);
  adapter.verifyPullRequestReadyForQaForClaim = async () => ({ ready: true });
  let mergeCalls = 0;
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.PR_BABYSITTER,
    repoPolicy: { cwd: root, githubToken: "test-token", allowMerge: true },
    result: {
      outcome: "no-op",
      nextStatus: Status.QA,
      summary: "Approved with no local edits.",
      mergeWhenApprovedAndClean: true
    },
    mergePullRequestImpl: async () => {
      mergeCalls += 1;
      return { merged: true, sha: "m".repeat(40), message: "merged" };
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(adapter.getItem("item-no-op-qa").status, Status.QA);
  assert.equal(mergeCalls, 1);
});

test("pr-babysitter cannot move to QA when live PR state is not ready", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-live-not-ready",
      title: "Babysit queue adapter",
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER
    })
  ]);
  adapter.verifyPullRequestReadyForQaForClaim = async () => ({ ready: false, reason: "checks_not_clean" });
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.PR_BABYSITTER,
    repoPolicy: { cwd: root, allowMerge: true },
    result: {
      outcome: "completed",
      nextStatus: Status.QA,
      summary: "Verifier approved merge before QA.",
      mergeWhenApprovedAndClean: true
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.match(result.error.message, /checks_not_clean/);
  assert.equal(adapter.getItem("item-live-not-ready").status, Status.BLOCKED);
});

test("pr-babysitter cannot merge before QA without merge permission", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-merge-not-allowed",
      title: "Babysit queue adapter",
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER
    })
  ]);
  adapter.verifyPullRequestReadyForQaForClaim = async () => ({ ready: true });
  let mergeCalls = 0;
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.PR_BABYSITTER,
    repoPolicy: { cwd: root, githubToken: "test-token", allowMerge: false },
    result: {
      outcome: "no-op",
      nextStatus: Status.QA,
      summary: "Approved with no local edits.",
      mergeWhenApprovedAndClean: true
    },
    mergePullRequestImpl: async () => {
      mergeCalls += 1;
      return { merged: true, sha: "m".repeat(40), message: "merged" };
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.match(result.error.message, /allowMerge/);
  assert.equal(mergeCalls, 0);
  assert.equal(adapter.getItem("item-merge-not-allowed").status, Status.BLOCKED);
});

test("pr-babysitter waits in Babysit for transient mergeability", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-mergeability-unknown",
      title: "Babysit queue adapter",
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER
    })
  ]);
  adapter.verifyPullRequestReadyForQaForClaim = async () => ({ ready: false, reason: "mergeability_unknown" });
  let mergeCalls = 0;
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.PR_BABYSITTER,
    repoPolicy: { cwd: root, githubToken: "test-token", allowMerge: true },
    result: {
      outcome: "no-op",
      nextStatus: Status.QA,
      summary: "Approved with no local edits.",
      mergeWhenApprovedAndClean: true
    },
    mergePullRequestImpl: async () => {
      mergeCalls += 1;
      return { merged: true, sha: "m".repeat(40), message: "merged" };
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(result.error, undefined);
  assert.equal(mergeCalls, 0);
  assert.equal(adapter.getItem("item-mergeability-unknown").status, Status.BABYSIT);
  assert.equal(adapter.getItem("item-mergeability-unknown").leaseOwner, undefined);
  assert.equal(adapter.events[0].outcome, "no-op");
  assert.match(adapter.events[0].body, /mergeability_unknown/);
});

test("pr-babysitter commits PR feedback fixes and stays in Babysit", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-babysit-fix",
      title: "Babysit queue adapter",
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER
    })
  ]);
  const pushes = [];
  const diffChecks = [true, false];
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.PR_BABYSITTER,
    repoPolicy: { cwd: root, allowPushBranches: true, githubToken: "test-token" },
    result: {
      outcome: "completed",
      nextStatus: Status.BABYSIT,
      summary: "Addressed review comments."
    },
    hasDiffImpl: async () => diffChecks.shift() ?? false,
    commitAllImpl: async () => "c".repeat(40),
    execFileImpl: async (_command, args) => {
      if (args.includes("push")) pushes.push(args);
      return { stdout: "", stderr: "" };
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(result.error, undefined);
  assert.equal(adapter.getItem("item-babysit-fix").status, Status.BABYSIT);
  assert.equal(parseClaimId(adapter.getItem("item-babysit-fix").lastWorkerRun).headSha, "c".repeat(40));
  assert.deepEqual(pushes[0].slice(-3), ["--no-verify", "https://github.com/acme/repo.git", "HEAD:feature"]);
  assert.match(adapter.events[0].evidence.at(-1), /^Commit c{40}$/);
});

test("pr-babysitter runs verification before pushing PR feedback fixes", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-babysit-verify",
      title: "Babysit queue adapter",
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER
    })
  ]);
  const calls = [];
  const diffChecks = [true, false];
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.PR_BABYSITTER,
    repoPolicy: {
      cwd: root,
      allowPushBranches: true,
      githubToken: "test-token",
      verifyCommands: ["npm test"],
      verifyNetwork: "off"
    },
    result: {
      outcome: "completed",
      nextStatus: Status.BABYSIT,
      summary: "Addressed review comments."
    },
    hasDiffImpl: async () => diffChecks.shift() ?? false,
    listUntrackedFilesImpl: async () => (calls.includes("verify") ? ["coverage/lcov.info", "tmp/report.txt"] : ["coverage/lcov.info"]),
    runRepoCommandsImpl: async ({ commands, network }) => {
      if (!commands.length) return [];
      calls.push("verify");
      assert.deepEqual(commands, ["npm test"]);
      assert.equal(network, "off");
      return [];
    },
    commitAllImpl: async ({ ignoredPaths }) => {
      assert.deepEqual(ignoredPaths, ["tmp/report.txt"]);
      calls.push("commit");
      return "c".repeat(40);
    },
    execFileImpl: async (_command, args) => {
      if (args.includes("push")) calls.push("push");
      return { stdout: "", stderr: "" };
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(result.error, undefined);
  assert.deepEqual(calls, ["verify", "commit", "push"]);
});

test("pr-babysitter requires branch push permission for PR feedback fixes", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-babysit-no-push",
      title: "Babysit queue adapter",
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER
    })
  ]);
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.PR_BABYSITTER,
    repoPolicy: { cwd: root, allowCreatePr: true, githubToken: "test-token" },
    result: {
      outcome: "completed",
      nextStatus: Status.BABYSIT,
      summary: "Addressed review comments."
    },
    hasDiffImpl: async () => true
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.match(result.error.message, /branch push permission/);
  assert.equal(adapter.getItem("item-babysit-no-push").status, Status.BLOCKED);
});

test("pr-babysitter no-op can stay in Babysit while waiting", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-waiting-babysit",
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
      outcome: "no-op",
      nextStatus: Status.BABYSIT,
      summary: "Still waiting for checks."
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(result.error, undefined);
  assert.equal(adapter.getItem("item-waiting-babysit").status, Status.BABYSIT);
});

test("reviewer dirty worktrees block instead of discarding edits", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-dirty-reviewer",
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
    },
    hasDiffImpl: async () => true
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.match(result.error.message, /reviewer produced a worktree diff/);
  assert.equal(adapter.getItem("item-dirty-reviewer").status, Status.BLOCKED);
});

test("pr-babysitter blocks QA without merge flag", async () => {
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
      nextStatus: Status.QA,
      summary: "Verifier approved merge before QA."
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.match(result.error.message, /mergeWhenApprovedAndClean/);
  assert.equal(adapter.getItem("item-4").status, Status.BLOCKED);
});

function workerWithCodexResult({
  root,
  adapter,
  workerType,
  result,
  repoPolicy = { cwd: root },
  hasDiffImpl = async () => false,
  commitAllImpl,
  mergePullRequestImpl,
  listUntrackedFilesImpl = async () => [],
  runRepoCommandsImpl = async () => [],
  execFileImpl = async () => ({ stdout: "", stderr: "" })
}) {
  return new GitHubCodeLoopWorker({
    adapter,
    workerType,
    workerId: `${workerType}-1`,
    repoPolicy,
    runLogDir: join(root, "runs"),
    createPullRequestWorktreeImpl: async () => {
      const worktreePath = join(root, "worktree");
      await mkdir(worktreePath, { recursive: true });
      return { worktreePath };
    },
    runRepoCommandsImpl,
    assertCredentialFreeWorktreeImpl: async () => ({ ok: true }),
    runCodexExecImpl: async ({ outputPath }) => {
      await writeFile(outputPath, JSON.stringify(result));
      return { stdout: "", stderr: "" };
    },
    hasDiffImpl,
    commitAllImpl,
    listUntrackedFilesImpl,
    mergePullRequestImpl,
    execFileImpl,
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
    headRepository: "acme/repo",
    headSha: "a".repeat(40)
  };
}
