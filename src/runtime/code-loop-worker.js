import { mkdir, readFile } from "node:fs/promises";
import { hostname } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { applyWorkerResult } from "./apply-result.js";
import { runCodexExec } from "./codex-runner.js";
import { buildDaemonGitEnv } from "./command-env.js";
import { ensurePullRequest } from "./github-pr.js";
import {
  cleanupWorktree,
  commitAll,
  createImplementationWorktree,
  createPullRequestWorktree,
  hasDiff,
  listUntrackedFiles,
  resetTrackedChanges
} from "./git-worktree.js";
import { runRepoCommands } from "./repo-commands.js";
import { defaultRunLogDir, writeRunArtifacts } from "./run-logs.js";
import { assertCredentialFreeWorktree } from "./worktree-safety.js";
import { buildWorkerPrompt } from "./prompt.js";
import { parseClaimId } from "../core/claims.js";
import { formatPublicEventComment, formatWithheldPublicEvent } from "../core/public-output.js";
import { Status, WorkerType } from "../core/status.js";

const execFileAsync = promisify(execFile);

export class GitHubCodeLoopWorker {
  constructor({
    adapter,
    workerType,
    repoPolicy,
    workerId = `${hostname()}:${process.pid}:${workerType}`,
    leaseSeconds = 1800,
    runLogDir = defaultRunLogDir(),
    codexBin = "codex",
    schemaPath = join(process.cwd(), "schemas", "ski-worker-result.schema.json"),
    execFileImpl = execFileAsync,
    runCodexExecImpl = runCodexExec,
    runRepoCommandsImpl = runRepoCommands,
    writeRunArtifactsImpl = writeRunArtifacts,
    hasDiffImpl = hasDiff,
    commitAllImpl = commitAll,
    listUntrackedFilesImpl = listUntrackedFiles,
    resetTrackedChangesImpl = resetTrackedChanges,
    createImplementationWorktreeImpl = createImplementationWorktree,
    createPullRequestWorktreeImpl = createPullRequestWorktree,
    cleanupWorktreeImpl = cleanupWorktree,
    assertCredentialFreeWorktreeImpl = assertCredentialFreeWorktree,
    ensurePullRequestImpl = ensurePullRequest,
    claimHeartbeatMs
  }) {
    if (!adapter) throw new Error("adapter is required");
    if (!workerType) throw new Error("workerType is required");
    if (!repoPolicy?.cwd) throw new Error("repoPolicy.cwd is required");
    this.adapter = adapter;
    this.workerType = workerType;
    this.repoPolicy = repoPolicy;
    this.workerId = workerId;
    this.leaseSeconds = leaseSeconds;
    this.runLogDir = runLogDir;
    this.codexBin = codexBin;
    this.schemaPath = schemaPath;
    this.execFileImpl = execFileImpl;
    this.runCodexExecImpl = runCodexExecImpl;
    this.runRepoCommandsImpl = runRepoCommandsImpl;
    this.writeRunArtifactsImpl = writeRunArtifactsImpl;
    this.hasDiffImpl = hasDiffImpl;
    this.commitAllImpl = commitAllImpl;
    this.listUntrackedFilesImpl = listUntrackedFilesImpl;
    this.resetTrackedChangesImpl = resetTrackedChangesImpl;
    this.createImplementationWorktreeImpl = createImplementationWorktreeImpl;
    this.createPullRequestWorktreeImpl = createPullRequestWorktreeImpl;
    this.cleanupWorktreeImpl = cleanupWorktreeImpl;
    this.assertCredentialFreeWorktreeImpl = assertCredentialFreeWorktreeImpl;
    this.ensurePullRequestImpl = ensurePullRequestImpl;
    this.claimHeartbeatMs = claimHeartbeatMs;
  }

  async runOnce() {
    const claimResult = await this.adapter.claimReadyForWorker({
      workerType: this.workerType,
      workerId: this.workerId,
      leaseSeconds: this.leaseSeconds
    });
    if (!claimResult.claimed) return { ran: false, reason: claimResult.reason };

    const { claim, item } = claimResult;
    let parsedClaim = parseClaimId(claim.id);
    let worktree;
    let codexOutput = { stdout: "", stderr: "", preserveStreamFiles: false };
    let setupIgnoredPaths = [];
    let claimExtender;
    try {
      parsedClaim = await this.verifyOrThrow(claim.id);
      claimExtender = this.startClaimExtender(claim.id);
      worktree = await this.prepareWorktree({ item, claim: parsedClaim });
      await this.runRepoCommandsImpl({
        commands: this.repoPolicy.setupCommands ?? [],
        cwd: worktree.worktreePath,
        network: this.repoPolicy.setupNetwork ?? "off"
      });
      if ((this.repoPolicy.setupCommands ?? []).length) {
        await this.resetTrackedChangesImpl({ worktreePath: worktree.worktreePath, execFileImpl: this.execFileImpl });
        setupIgnoredPaths = await this.listUntrackedFilesImpl({
          worktreePath: worktree.worktreePath,
          execFileImpl: this.execFileImpl
        });
      }
      await this.assertCredentialFreeWorktreeImpl(worktree.worktreePath);

      const runId = safePathSegment(parsedClaim.runId ?? claim.id);
      const runDir = join(this.runLogDir, runId);
      const resultPath = join(runDir, "worker-result.json");
      const streamPath = join(runDir, "stream.jsonl");
      const stderrPath = join(runDir, "stderr.log");
      await mkdir(runDir, { recursive: true });
      const promptItem = {
        ...item,
        workerType: parsedClaim.resolvedWorkerType ?? this.workerType
      };
      const prompt = buildWorkerPrompt({ item: promptItem, claim, workerRole: this.repoPolicy.workerRole });
      let codex;
      try {
        codex = await this.runCodexExecImpl({
          prompt,
          cwd: worktree.worktreePath,
          codexBin: this.codexBin,
          schemaPath: this.schemaPath,
          outputPath: resultPath,
          streamPath,
          stderrPath
        });
      } catch (error) {
        codexOutput = {
          stdout: error?.stdout ?? "",
          stderr: error?.stderr ?? "",
          preserveStreamFiles: Boolean(error?.streamPath || error?.stderrPath)
        };
        throw error;
      }
      codexOutput = {
        ...codex,
        preserveStreamFiles: Boolean(codex.streamPath || codex.stderrPath)
      };
      await this.verifyOrThrow(claim.id);
      const result = await readWorkerResult(resultPath, codex.stdout);

      await this.applyWorkerOutcome({ claimId: claim.id, item, result, worktree, ignoredPaths: setupIgnoredPaths });
      await this.writeRunArtifactsImpl({
        rootDir: this.runLogDir,
        runId,
        stream: codexOutput.preserveStreamFiles ? undefined : codex.stdout ?? "",
        stderr: codexOutput.preserveStreamFiles ? undefined : codex.stderr ?? "",
        preserveStreamFiles: codexOutput.preserveStreamFiles,
        result,
        metadata: metadataForRun({ claim: parsedClaim, item, workerType: this.workerType, worktree, result })
      });
      return { ran: true, itemId: item.id, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failedResult = {
        outcome: "failed",
        summary: message,
        blocker: message
      };
      try {
        await this.writeRunArtifactsImpl({
          rootDir: this.runLogDir,
          runId: safePathSegment(parsedClaim.runId ?? claim.id),
          stream: codexOutput.preserveStreamFiles ? undefined : codexOutput.stdout ?? "",
          stderr: codexOutput.preserveStreamFiles ? undefined : codexOutput.stderr ?? "",
          preserveStreamFiles: codexOutput.preserveStreamFiles,
          result: failedResult,
          metadata: metadataForRun({ claim: parsedClaim, item, workerType: this.workerType, worktree, result: failedResult })
        });
      } catch {
        // Claim failure must still be recorded even if local logging is unavailable.
      }
      await this.failClaimAfterError(claim.id, message);
      return { ran: true, itemId: item.id, error };
    } finally {
      claimExtender?.stop();
      if (worktree) {
        await this.cleanupWorktreeImpl({
          repoPath: this.repoPolicy.cwd,
          worktreePath: worktree.worktreePath,
          keep: process.env.SKI_KEEP_WORKTREES === "1",
          execFileImpl: this.execFileImpl
        });
      }
    }
  }

  async prepareWorktree({ item, claim }) {
    const repository = item.repository ?? claim.repository;
    const baseBranch = this.repoPolicy.defaultBaseBranch ?? "main";
    if (this.workerType === WorkerType.IMPLEMENTER) {
      if (claim.pullRequestNumber) {
        throw new Error("PR-backed items must stay in Babysit; pr-babysitter owns existing PR fixes in v1");
      }
      const branchName =
        claim.branchName ?? `ski/${safeGitRefSegment(item.number ?? item.id)}-${safeGitRefSegment(claim.runId)}`;
      return this.createImplementationWorktreeImpl({
        repoPath: this.repoPolicy.cwd,
        repository,
        baseBranch,
        branchName,
        runId: claim.runId,
        githubToken: this.repoPolicy.githubToken,
        execFileImpl: this.execFileImpl
      });
    }

    if (this.workerType === WorkerType.REVIEWER || this.workerType === WorkerType.PR_BABYSITTER) {
      const pullRequestNumber = claim.pullRequestNumber ?? (item.contentType === "PullRequest" ? item.number : undefined);
      if (!pullRequestNumber) throw new Error(`${this.workerType} requires a pull request`);
      return this.createPullRequestWorktreeImpl({
        repoPath: this.repoPolicy.cwd,
        repository,
        pullRequestNumber,
        runId: claim.runId,
        baseRef: claim.baseRef,
        expectedHeadSha: claim.headSha,
        githubToken: this.repoPolicy.githubToken,
        execFileImpl: this.execFileImpl
      });
    }

    throw new Error(`Worker type is not auto-runnable in v1: ${this.workerType}`);
  }

  async applyWorkerOutcome({ claimId, item, result, worktree, ignoredPaths = [] }) {
    await this.verifyOrThrow(claimId);

    if (this.workerType === WorkerType.IMPLEMENTER && result.outcome === "completed") {
      if (result.outcome !== "completed" || result.nextStatus !== Status.REVIEW) {
        throw new Error("implementer must complete to Review in v1");
      }
      if (!this.repoPolicy.allowCreatePr) {
        throw new Error("implementer requires allowCreatePr to advance to Review in v1");
      }
      if (!(await this.hasDiffImpl({ worktreePath: worktree.worktreePath, execFileImpl: this.execFileImpl, ignoredPaths }))) {
        throw new Error("implementer produced no diff");
      }
      let commitIgnoredPaths = ignoredPaths;
      let untrackedBeforeVerify = [];
      const verifyCommands = this.repoPolicy.verifyCommands ?? [];
      if (verifyCommands.length) {
        untrackedBeforeVerify = await this.listUntrackedFilesImpl({
          worktreePath: worktree.worktreePath,
          execFileImpl: this.execFileImpl
        });
      }
      await this.runRepoCommandsImpl({
        commands: verifyCommands,
        cwd: worktree.worktreePath,
        network: this.repoPolicy.verifyNetwork ?? "off"
      });
      if (verifyCommands.length) {
        const untrackedAfterVerify = await this.listUntrackedFilesImpl({
          worktreePath: worktree.worktreePath,
          execFileImpl: this.execFileImpl
        });
        commitIgnoredPaths = combineIgnoredPaths(
          ignoredPaths,
          untrackedAfterVerify.filter((path) => !untrackedBeforeVerify.includes(path))
        );
      }
      await this.verifyOrThrow(claimId);
      const commitSha = await this.commitAllImpl({
        worktreePath: worktree.worktreePath,
        message: `Ski Stack ${this.workerType} ${new Date().toISOString()}`,
        execFileImpl: this.execFileImpl,
        ignoredPaths: commitIgnoredPaths
      });
      await this.verifyOrThrow(claimId);
      if (this.repoPolicy.allowPushBranches || this.repoPolicy.allowCreatePr) {
        const claim = await this.verifyOrThrow(claimId);
        await this.execFileImpl(
          "git",
          ["-C", worktree.worktreePath, "push", "--no-verify", `https://github.com/${claim.repository}.git`, `HEAD:${worktree.branchName}`],
          {
            env: buildDaemonGitEnv({ githubToken: this.repoPolicy.githubToken })
          }
        );
      }
      result.evidence = [...(result.evidence ?? []), `Commit ${commitSha}`];
      if (this.repoPolicy.allowCreatePr) {
        await this.verifyOrThrow(claimId);
        const claim = await this.verifyOrThrow(claimId);
        const pr = await this.ensurePullRequestImpl({
          token: this.repoPolicy.githubToken,
          repository: claim.repository,
          branchName: worktree.branchName,
          baseBranch: this.repoPolicy.defaultBaseBranch ?? "main",
          title: `Ski Stack: ${item?.title ?? "Worker change"}`,
          body: safePublicEventComment({
            runId: claim.runId,
            workerType: this.workerType,
            outcome: result.outcome,
            nextStatus: result.nextStatus,
            summary: result.summary,
            evidence: result.evidence
          })
        });
        await this.verifyOrThrow(claimId);
        if (typeof this.adapter.setFieldForClaim !== "function") {
          throw new Error("adapter cannot write PR field");
        }
        const updated = await this.adapter.setFieldForClaim(claimId, "PR", pr.url);
        if (updated?.updated === false) throw new Error(`claim lost: ${updated.reason ?? "pr_field"}`);
        result.prUrl = pr.url;
        result.evidence = [...(result.evidence ?? []), `PR ${pr.url}`];
      }
    }

    await this.verifyOrThrow(claimId);
    if (this.workerType === WorkerType.PR_BABYSITTER && result.outcome === "completed") {
      await this.applyBabysitterDiff({ claimId, result, worktree, ignoredPaths });
    }
    await this.verifyOrThrow(claimId);
    if (this.workerType !== WorkerType.IMPLEMENTER) {
      await this.rejectNonImplementerDiff({ worktree, ignoredPaths });
    }
    await this.verifyOrThrow(claimId);
    if (
      this.workerType === WorkerType.PR_BABYSITTER &&
      result.outcome === "completed" &&
      result.nextStatus === Status.QA &&
      result.qaWhenApprovedAndClean === true
    ) {
      await this.verifyPullRequestReadyState(claimId);
    }
    return applyWorkerResult({
      adapter: this.adapter,
      claimId,
      workerType: this.workerType,
      result
    });
  }

  async applyBabysitterDiff({ claimId, result, worktree, ignoredPaths }) {
    const dirty = await this.hasDiffImpl({
      worktreePath: worktree.worktreePath,
      execFileImpl: this.execFileImpl,
      ignoredPaths
    });
    if (!dirty) return;
    if (result.nextStatus !== Status.BABYSIT) {
      throw new Error("pr-babysitter fixes must stay in Babysit for another review/check cycle");
    }
    if (!(this.repoPolicy.allowPushBranches || this.repoPolicy.allowCreatePr)) {
      throw new Error("pr-babysitter requires branch push permission to push PR fixes in v1");
    }
    const claim = await this.verifyOrThrow(claimId);
    this.assertPatchablePrClaim(claim);
    const commitSha = await this.commitAllImpl({
      worktreePath: worktree.worktreePath,
      message: `Ski Stack ${this.workerType} ${new Date().toISOString()}`,
      execFileImpl: this.execFileImpl,
      ignoredPaths
    });
    await this.verifyOrThrow(claimId);
    await this.execFileImpl(
      "git",
      ["-C", worktree.worktreePath, "push", "--no-verify", `https://github.com/${claim.repository}.git`, `HEAD:${claim.headRef}`],
      {
        env: buildDaemonGitEnv({ githubToken: this.repoPolicy.githubToken })
      }
    );
    result.evidence = [...(result.evidence ?? []), `Commit ${commitSha}`];
  }

  assertPatchablePrClaim(claim) {
    if (!claim.pullRequestNumber) throw new Error("pr-babysitter requires a pull request claim");
    if (!claim.headRef) throw new Error("pr-babysitter requires a pull request head branch");
    const headRepository = claim.headRepository ?? claim.repository;
    if (String(headRepository).toLowerCase() !== String(claim.repository).toLowerCase()) {
      throw new Error("pr-babysitter cannot push fixes to fork PRs in v1");
    }
  }

  async rejectNonImplementerDiff({ worktree, ignoredPaths }) {
    const dirty = await this.hasDiffImpl({
      worktreePath: worktree.worktreePath,
      execFileImpl: this.execFileImpl,
      ignoredPaths
    });
    if (dirty) {
      throw new Error(`${this.workerType} produced a worktree diff; v1 does not persist non-implementer edits`);
    }
  }

  async verifyOrThrow(claimId) {
    const verified = await this.adapter.verifyClaim(claimId, {
      requireHeadSha: this.workerType === WorkerType.REVIEWER || this.workerType === WorkerType.PR_BABYSITTER
    });
    if (!verified.active) throw new Error(`claim lost: ${verified.reason}`);
    return verified.claim;
  }

  async failClaimAfterError(claimId, message) {
    if (typeof this.adapter.failClaim !== "function") return;
    const claimLostReason = String(message ?? "").match(/^claim lost: ([a-z_]+)/)?.[1];
    if (isClaimDriftReason(claimLostReason)) {
      await this.adapter.releaseClaim?.(claimId);
      return;
    }
    const failed = await this.adapter.failClaim(claimId, message);
    if (failed?.failed === false && isClaimDriftReason(failed.reason)) {
      await this.adapter.releaseClaim?.(claimId);
    }
  }

  async verifyPullRequestReadyState(claimId) {
    const verifier =
      this.adapter.verifyPullRequestReadyForQaForClaim ?? this.adapter.verifyPullRequestReadyForDoneForClaim;
    if (typeof verifier !== "function") {
      throw new Error("adapter cannot verify live PR state before QA");
    }
    const verified = await verifier.call(this.adapter, claimId);
    if (verified?.ready !== true) {
      throw new Error(`pr-babysitter cannot move to QA: ${verified?.reason ?? "pr_not_ready"}`);
    }
  }

  startClaimExtender(claimId) {
    const intervalMs =
      this.claimHeartbeatMs ?? Math.max(250, Math.min(60_000, Math.floor((this.leaseSeconds * 1000) / 3)));
    const timer = setInterval(() => {
      this.adapter.extendClaim?.(claimId, this.leaseSeconds).catch(() => {
        // The next guarded mutation will detect and report a lost claim.
      });
    }, intervalMs);
    timer.unref?.();
    return {
      stop: () => clearInterval(timer)
    };
  }
}

function safePathSegment(value) {
  return String(value ?? "run").replace(/[^A-Za-z0-9_.-]+/g, "_");
}

function safeGitRefSegment(value) {
  return String(value ?? "item")
    .replace(/[^A-Za-z0-9_.-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 80);
}

function safePublicEventComment(output) {
  try {
    return formatPublicEventComment(output);
  } catch {
    return formatWithheldPublicEvent({
      runId: output.runId,
      workerType: output.workerType,
      outcome: output.outcome
    });
  }
}

function combineIgnoredPaths(...pathGroups) {
  return [...new Set(pathGroups.flat().filter(Boolean))];
}

function isClaimDriftReason(reason) {
  return [
    "status_changed",
    "worker_type_changed",
    "repository_changed",
    "pr_changed",
    "head_drift",
    "base_drift",
    "run_mismatch"
  ].includes(reason);
}

async function readWorkerResult(path, stdout) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    const lines = String(stdout ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    for (const line of lines.toReversed()) {
      try {
        const event = JSON.parse(line);
        if (event.type === "item.completed" && event.item?.type === "agent_message") {
          return JSON.parse(event.item.text);
        }
      } catch {
        // Keep searching.
      }
    }
    throw new Error("Could not read worker result JSON");
  }
}

function metadataForRun({ claim, item, workerType, worktree, result }) {
  return {
    runId: claim.runId,
    workerType,
    outcome: result.outcome,
    status: item.status,
    repository: item.repository,
    projectItemId: item.id,
    projectItemTitle: item.title,
    issueNumber: item.contentType === "Issue" ? item.number : undefined,
    issueTitle: item.contentType === "Issue" ? item.title : undefined,
    prNumber: item.contentType === "PullRequest" ? item.number : claim.pullRequestNumber,
    prTitle: item.contentType === "PullRequest" ? item.title : undefined,
    branch: worktree?.branchName,
    worktreePath: worktree?.worktreePath,
    createdAt: new Date().toISOString()
  };
}
