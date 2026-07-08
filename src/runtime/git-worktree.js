import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { promisify } from "node:util";

import { buildDaemonGitEnv, buildRepoCommandEnv } from "./command-env.js";
import { assertCredentialFreeWorktree } from "./worktree-safety.js";

const execFileAsync = promisify(execFile);

export function defaultWorktreeRoot(env = process.env) {
  return env.SKI_WORKTREE_ROOT ?? join(env.HOME ?? process.cwd(), ".ski-stack", "worktrees");
}

export async function createImplementationWorktree({
  repoPath,
  repository,
  baseBranch,
  branchName,
  runId,
  worktreeRoot = defaultWorktreeRoot(),
  execFileImpl = execFileAsync,
  githubToken
}) {
  const repositorySegment = safePathSegment(repository);
  const worktreePath = join(worktreeRoot, repositorySegment, safePathSegment(runId));
  const safeBranchName = safeGitRefName(branchName);
  await mkdir(join(worktreeRoot, repositorySegment), { recursive: true });
  await execFileImpl("git", ["-C", repoPath, "fetch", "origin", baseBranch], {
    env: buildDaemonGitEnv({ githubToken })
  });
  await execFileImpl("git", ["-C", repoPath, "worktree", "add", "-B", safeBranchName, worktreePath, `origin/${baseBranch}`], {
    env: buildDaemonGitEnv({ githubToken })
  });
  await assertCredentialFreeWorktree(worktreePath);
  return { worktreePath, branchName: safeBranchName };
}

export async function createPullRequestWorktree({
  repoPath,
  repository,
  pullRequestNumber,
  runId,
  expectedHeadSha,
  worktreeRoot = defaultWorktreeRoot(),
  execFileImpl = execFileAsync,
  githubToken
}) {
  const repositorySegment = safePathSegment(repository);
  const worktreePath = join(worktreeRoot, repositorySegment, safePathSegment(runId));
  await mkdir(join(worktreeRoot, repositorySegment), { recursive: true });
  await execFileImpl("git", ["-C", repoPath, "fetch", "origin", `pull/${pullRequestNumber}/head`], {
    env: buildDaemonGitEnv({ githubToken })
  });
  if (expectedHeadSha) {
    const { stdout } = await execFileImpl("git", ["-C", repoPath, "rev-parse", "FETCH_HEAD"], {
      env: buildRepoCommandEnv()
    });
    if (stdout.trim() !== expectedHeadSha) {
      throw new Error("pull request head drifted after claim");
    }
  }
  await execFileImpl("git", ["-C", repoPath, "worktree", "add", "--detach", worktreePath, expectedHeadSha ?? "FETCH_HEAD"], {
    env: buildDaemonGitEnv({ githubToken })
  });
  await assertCredentialFreeWorktree(worktreePath);
  return { worktreePath };
}

export async function hasDiff({ worktreePath, execFileImpl = execFileAsync }) {
  const { stdout } = await execFileImpl("git", ["-C", worktreePath, "status", "--porcelain"], {
    env: buildRepoCommandEnv()
  });
  return stdout.trim().length > 0;
}

export async function commitAll({ worktreePath, message, execFileImpl = execFileAsync }) {
  const env = buildRepoCommandEnv({
    extraEnv: {
      GIT_AUTHOR_NAME: "Ski Stack Worker",
      GIT_AUTHOR_EMAIL: "ski-stack@users.noreply.github.com",
      GIT_COMMITTER_NAME: "Ski Stack Worker",
      GIT_COMMITTER_EMAIL: "ski-stack@users.noreply.github.com"
    }
  });
  await execFileImpl("git", ["-C", worktreePath, "add", "-A"], { env });
  await execFileImpl("git", ["-C", worktreePath, "commit", "--no-verify", "-m", message], { env });
  const { stdout } = await execFileImpl("git", ["-C", worktreePath, "rev-parse", "HEAD"], { env });
  return stdout.trim();
}

export async function cleanupWorktree({ repoPath, worktreePath, keep = false, execFileImpl = execFileAsync }) {
  if (keep) return;
  try {
    await execFileImpl("git", ["-C", repoPath, "worktree", "remove", "--force", worktreePath]);
  } catch {
    await rm(worktreePath, { recursive: true, force: true });
  }
}

function safePathSegment(value) {
  return String(value ?? basename(process.cwd())).replace(/[^A-Za-z0-9_.-]+/g, "_");
}

function safeGitRefName(value) {
  const segments = String(value ?? "ski/work")
    .split("/")
    .map((segment) =>
      segment
        .replace(/[^A-Za-z0-9_.-]+/g, "-")
        .replace(/^[.-]+|[.-]+$/g, "")
        .slice(0, 80)
    )
    .filter(Boolean);
  return segments.length ? segments.join("/") : "ski/work";
}
