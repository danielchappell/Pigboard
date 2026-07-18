import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  DependencyState,
  GitHubCodeLoopWorker,
  HandoffStage,
  MemoryQueueAdapter,
  contextFingerprint,
  parseClaimId,
  runSettledWorkerSlot,
  Status,
  WorkerType
} from "../src/index.js";

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
    reasoningEffort: "xhigh",
    repoPolicy: {
      cwd: root,
      setupCommands: ["npm install"],
      verifyCommands: ["npm test"],
      allowPushBranches: true,
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
    runCodexExecImpl: async ({ model, reasoningEffort, outputPath }) => {
      assert.equal(model, "gpt-test");
      assert.equal(reasoningEffort, "xhigh");
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
    ensurePullRequestImpl: async () => {
      throw new Error("implementer must not create pull requests");
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
  assert.match(adapter.events[0].evidence.at(-1), /^Commit a{40}$/);
  assert.equal(adapter.getItem("item-1").fields?.PR, undefined);
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

test("implementation pushes the reserved branch without creating a PR", async () => {
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
    repoPolicy: { cwd: root, allowPushBranches: true, githubToken: "test-token" },
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
    ensurePullRequestImpl: async () => {
      throw new Error("implementer must not create pull requests");
    },
    writeRunArtifactsImpl: async () => ({ runDir: join(root, "runs", "run") }),
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(pushes.length, 1);
  assert.deepEqual(pushes[0].slice(-3), ["--no-verify", "https://github.com/acme/repo.git", "HEAD:refs/heads/ski/12-run"]);
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
    repoPolicy: { cwd: root, allowCreatePr: true, allowPushBranches: true, githubToken: "test-token" },
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

test("code-loop error handling releases a dependency-stale claim before failing it", async () => {
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-dependency-error",
      title: "Build thing",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1",
      repository: "acme/repo",
      contentType: "Issue",
      number: 12,
      dependencies: [{ kind: "blockedBy", targetId: "blocker", state: DependencyState.COMPLETED }]
    }
  ]);
  const claimResult = await adapter.claimReadyForWorker({
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-dependency-error",
    leaseSeconds: 1800
  });
  adapter.items.get("item-dependency-error").dependencies[0].state = DependencyState.ACTIVE;
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-dependency-error",
    repoPolicy: { cwd: await mkdtemp(join(tmpdir(), "ski-worker-")) }
  });

  await worker.failClaimAfterError(claimResult.claim.id, "codex crashed");

  assert.equal(adapter.getItem("item-dependency-error").status, Status.IMPLEMENTATION);
  assert.equal(adapter.getItem("item-dependency-error").leaseOwner, undefined);
  assert.equal(adapter.events.length, 0);
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

test("unsafe implementation handoff output is blocked before any PR side effect", async () => {
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
  let prCalls = 0;
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-unsafe-pr-body",
    repoPolicy: { cwd: root, allowPushBranches: true, githubToken: "test-token" },
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
    ensurePullRequestImpl: async () => {
      prCalls += 1;
      return { number: 42, url: "https://github.com/acme/repo/pull/42" };
    },
    writeRunArtifactsImpl: async () => ({ runDir: join(root, "runs", "run") }),
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(prCalls, 0);
  assert.match(result.error.message, /unsafe public output/);
  assert.equal(adapter.getItem("item-unsafe-pr-body").status, Status.BLOCKED);
});

test("dependency drift during a code-loop run releases without blocking or publishing side effects", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-dependency-drift",
      title: "Build after blocker",
      status: Status.IMPLEMENTATION,
      workerType: WorkerType.IMPLEMENTER,
      priority: "P1",
      repository: "acme/repo",
      contentType: "Issue",
      number: 12,
      dependencies: [
        { kind: "blockedBy", targetId: "blocker", state: DependencyState.COMPLETED }
      ]
    }
  ]);
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "impl-dependency-drift",
    repoPolicy: { cwd: root },
    runLogDir: join(root, "runs"),
    createImplementationWorktreeImpl: async () => {
      const worktreePath = join(root, "worktree");
      await mkdir(worktreePath, { recursive: true });
      return { worktreePath, branchName: "ski/12-run" };
    },
    runRepoCommandsImpl: async () => [],
    assertCredentialFreeWorktreeImpl: async () => ({ ok: true }),
    runCodexExecImpl: async ({ outputPath }) => {
      adapter.items.get("item-dependency-drift").dependencies[0].state = DependencyState.ACTIVE;
      await writeFile(
        outputPath,
        JSON.stringify({ outcome: "completed", nextStatus: Status.REVIEW, summary: "Implemented." })
      );
      return { stdout: "", stderr: "" };
    },
    writeRunArtifactsImpl: async () => ({ runDir: join(root, "runs", "run") }),
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.match(result.error.message, /dependency_pending/);
  assert.equal(adapter.getItem("item-dependency-drift").status, Status.IMPLEMENTATION);
  assert.equal(adapter.getItem("item-dependency-drift").leaseOwner, undefined);
  assert.equal(adapter.events.length, 0);
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
    repoPolicy: { cwd: root, allowCreatePr: true, allowPushBranches: true, githubToken: "test-token" },
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

test("implementer blocks instead of advancing to Review without branch push permission", async () => {
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
  assert.match(result.error.message, /branch push permission/);
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

test("issue-backed reviewer work requires an implementation branch handoff", async () => {
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
    /reviewer requires an implementation branch handoff/
  );
});

test("implementer refuses claims without a signed clean implementation plan", async () => {
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
    /requires a signed clean implementation plan/
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
  const verifyOptions = [];
  const verifyClaim = adapter.verifyClaim.bind(adapter);
  adapter.verifyClaim = async (claimId, options) => {
    verifyOptions.push(options);
    return verifyClaim(claimId, options);
  };
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
  assert.equal(verifyOptions.some((options) => options?.requireHeadSha === true), true);
});

test("reviewer recomputes stage context from the live item", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    {
      ...pullRequestItem({
        id: "item-live-context",
        title: "Review live requirements",
        status: Status.REVIEW,
        workerType: WorkerType.REVIEWER
      }),
      body: "Original requirements"
    }
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
    beforeResultWrite: async () => {
      adapter.items.get("item-live-context").body = "Changed requirements";
    }
  });

  const result = await worker.runOnce();

  assert.match(result.error.message, /context_drift/);
  assert.equal(adapter.getItem("item-live-context").status, Status.REVIEW);
});

test("read-only workers snapshot repository state after setup", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-read-only-setup",
      title: "Review after setup",
      status: Status.REVIEW,
      workerType: WorkerType.REVIEWER
    })
  ]);
  let setupComplete = false;
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.REVIEWER,
    repoPolicy: { cwd: root, setupCommands: ["npm install"] },
    result: {
      outcome: "completed",
      nextStatus: Status.BABYSIT,
      summary: "No blocking findings."
    },
    runRepoCommandsImpl: async () => {
      setupComplete = true;
      return [];
    },
    execFileImpl: async (_command, args) => {
      assert.equal(setupComplete, true);
      if (args.includes("rev-parse")) return { stdout: `${"a".repeat(40)}\n`, stderr: "" };
      return { stdout: "", stderr: "" };
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.error, undefined);
  assert.equal(adapter.getItem("item-read-only-setup").status, Status.BABYSIT);
});

test("implementation planner runs read-only and persists a transcript-backed clean plan", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-planner-"));
  const adapter = new MemoryQueueAdapter([
    {
      id: "item-plan",
      title: "Plan queue lifecycle",
      body: "Create the delivery lifecycle.",
      status: Status.IMPLEMENTATION_PLANNING,
      workerType: WorkerType.IMPLEMENTATION_PLANNER,
      repository: "acme/repo",
      contentType: "Issue",
      number: 12
    }
  ]);
  let sandbox;
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTATION_PLANNER,
    workerId: "planner-1",
    repoPolicy: { cwd: root, requireSignedHandoffs: true },
    runLogDir: join(root, "runs"),
    createDetachedBaseWorktreeImpl: async () => {
      const worktreePath = join(root, "worktree");
      await mkdir(worktreePath, { recursive: true });
      return { worktreePath, headSha: "b".repeat(40) };
    },
    runRepoCommandsImpl: async () => [],
    assertCredentialFreeWorktreeImpl: async () => ({ ok: true }),
    execFileImpl: async (_command, args) => {
      if (args.includes("rev-parse")) return { stdout: `${"b".repeat(40)}\n`, stderr: "" };
      return { stdout: "", stderr: "" };
    },
    runCodexExecImpl: async ({ outputPath, streamPath, sandbox: selectedSandbox }) => {
      sandbox = selectedSandbox;
      await writeFile(
        streamPath,
        [
          JSON.stringify({ type: "subagent", agent_id: "review-a", status: "completed" }),
          JSON.stringify({ type: "subagent", agent_id: "review-b", status: "completed" })
        ].join("\n")
      );
      await writeFile(outputPath, JSON.stringify({
        outcome: "completed",
        nextStatus: Status.IMPLEMENTATION,
        summary: "Plan reviewed clean.",
        details: {
          implementationPlan: {
            plan: "1. Add the lifecycle.\n2. Verify recovery behavior.",
            acceptanceCriteria: ["The lifecycle reaches Ready for Owner."],
            tests: ["npm test"],
            risks: ["Migration drift"],
            adversarialReview: {
              verdict: "clean",
              rounds: [{ reviews: [
                { reviewerId: "review-a", lens: "correctness", findings: [] },
                { reviewerId: "review-b", lens: "recovery", findings: [] }
              ] }]
            }
          }
        }
      }));
      return { stdout: "", stderr: "", streamPath };
    },
    hasDiffImpl: async () => false,
    writeRunArtifactsImpl: async () => ({ runDir: join(root, "runs", "run") }),
    cleanupWorktreeImpl: async () => {}
  });

  const result = await worker.runOnce();

  assert.equal(result.error, undefined);
  assert.equal(sandbox, "read-only");
  assert.equal(adapter.getItem("item-plan").status, Status.IMPLEMENTATION);
  assert.equal(adapter.handoffs.length, 1);
  assert.equal(adapter.handoffs[0].envelope.stage, "implementation_plan");
  assert.equal(adapter.handoffs[0].envelope.payload.baseSha, "b".repeat(40));
});

test("implementation planner recovers a signed completion without rerunning Codex", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-planner-recovery-"));
  const item = {
    id: "item-plan-recovery",
    title: "Recover plan",
    body: "Plan this story.",
    status: Status.IMPLEMENTATION_PLANNING,
    workerType: WorkerType.IMPLEMENTATION_PLANNER,
    repository: "acme/repo",
    contentType: "Issue",
    number: 12
  };
  const adapter = new MemoryQueueAdapter([item]);
  const seed = await adapter.claimReadyForWorker({
    workerType: WorkerType.IMPLEMENTATION_PLANNER,
    workerId: "seed",
    leaseSeconds: 1800
  });
  const upstream = contextFingerprint({
    itemId: item.id,
    body: item.body,
    dependencies: [],
    handoffFingerprint: contextFingerprint([]),
    headSha: null
  });
  const payload = {
    repository: "acme/repo",
    baseRef: "main",
    baseSha: "b".repeat(40),
    plan: "1. Implement.\n2. Test.",
    acceptanceCriteria: ["Behavior is complete."],
    tests: ["npm test"],
    risks: [],
    adversarialReview: {
      verdict: "clean",
      rounds: [{ reviews: [
        { reviewerId: "review-a", lens: "correctness", findings: [] },
        { reviewerId: "review-b", lens: "recovery", findings: [] }
      ] }]
    }
  };
  await adapter.appendStageHandoffForClaim(seed.claim.id, {
    stage: HandoffStage.IMPLEMENTATION_PLAN,
    inputFingerprint: upstream,
    payload
  });
  await adapter.releaseClaim(seed.claim.id);
  const worker = new GitHubCodeLoopWorker({
    adapter,
    workerType: WorkerType.IMPLEMENTATION_PLANNER,
    workerId: "planner-recovery",
    repoPolicy: { cwd: root, requireSignedHandoffs: true },
    runCodexExecImpl: async () => {
      throw new Error("Codex must not run for a durable completion");
    },
    createDetachedBaseWorktreeImpl: async () => {
      throw new Error("recovery must not create a worktree");
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.recovered, true);
  assert.equal(adapter.getItem(item.id).status, Status.IMPLEMENTATION);
});

test("pr-babysitter hands authorized approval to the owner without merging", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-3",
      title: "Babysit queue adapter",
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER
    })
  ], { ownerApprovers: ["owner"] });
  adapter.items.get("item-3").thumbsUpActors = ["owner"];
  let mergeCalls = 0;
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.PR_BABYSITTER,
    result: {
      outcome: "completed",
      nextStatus: Status.READY_FOR_OWNER,
      summary: "Authorized owner approval is present."
    },
    mergePullRequestImpl: async () => {
      mergeCalls += 1;
      return { merged: true, sha: "m".repeat(40), message: "merged" };
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.equal(result.error, undefined);
  assert.equal(adapter.getItem("item-3").status, Status.READY_FOR_OWNER);
  assert.equal(mergeCalls, 0);
});

test("pr-babysitter rejects an unauthorized owner handoff", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worker-"));
  const adapter = new MemoryQueueAdapter([
    pullRequestItem({
      id: "item-unapproved",
      title: "Babysit queue adapter",
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER
    })
  ], { ownerApprovers: ["owner"] });
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.PR_BABYSITTER,
    result: {
      outcome: "completed",
      nextStatus: Status.READY_FOR_OWNER,
      summary: "Approval claimed without evidence."
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.match(result.error.message, /owner approval is not valid/);
  assert.equal(adapter.getItem("item-unapproved").status, Status.BLOCKED);
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
  assert.deepEqual(pushes[0].slice(-3), [
    `--force-with-lease=refs/heads/feature:${"a".repeat(40)}`,
    "https://github.com/acme/repo.git",
    "HEAD:refs/heads/feature"
  ]);
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
  let statusCalls = 0;
  const worker = workerWithCodexResult({
    root,
    adapter,
    workerType: WorkerType.REVIEWER,
    result: {
      outcome: "completed",
      nextStatus: Status.BABYSIT,
      summary: "No blocking findings."
    },
    execFileImpl: async (_command, args) => {
      if (args.includes("rev-parse")) return { stdout: `${"a".repeat(40)}\n`, stderr: "" };
      if (args.includes("status")) {
        statusCalls += 1;
        return { stdout: statusCalls === 1 ? "" : " M src/index.js\n", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    }
  });

  const result = await worker.runOnce();

  assert.equal(result.ran, true);
  assert.match(result.error.message, /read-only worker changed repository state/);
  assert.equal(adapter.getItem("item-dirty-reviewer").status, Status.BLOCKED);
});

test("pr-babysitter cannot route automated work into legacy QA", async () => {
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
  assert.match(result.error.message, /pr-babysitter cannot transition to QA/);
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
  execFileImpl = async () => ({ stdout: "", stderr: "" }),
  beforeResultWrite = async () => {}
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
      await beforeResultWrite();
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
