import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { promisify } from "node:util";

import { buildDaemonGitEnv } from "./command-env.js";
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
  await rewriteCredentialFreeRemote({ worktreePath, repository, execFileImpl });
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
    const { stdout } = await execFileImpl("git", ["-C", repoPath, "rev-parse", "FETCH_HEAD"]);
    if (stdout.trim() !== expectedHeadSha) {
      throw new Error("pull request head drifted after claim");
    }
  }
  await execFileImpl("git", ["-C", repoPath, "worktree", "add", "--detach", worktreePath, expectedHeadSha ?? "FETCH_HEAD"], {
    env: buildDaemonGitEnv({ githubToken })
  });
  await rewriteCredentialFreeRemote({ worktreePath, repository, execFileImpl });
  await assertCredentialFreeWorktree(worktreePath);
  return { worktreePath };
}

export async function hasDiff({ worktreePath, execFileImpl = execFileAsync }) {
  const { stdout } = await execFileImpl("git", ["-C", worktreePath, "status", "--porcelain"]);
  return stdout.trim().length > 0;
}

export async function commitAll({ worktreePath, message, execFileImpl = execFileAsync }) {
  await execFileImpl("git", ["-C", worktreePath, "add", "-A"]);
  await execFileImpl("git", ["-C", worktreePath, "commit", "-m", message]);
  const { stdout } = await execFileImpl("git", ["-C", worktreePath, "rev-parse", "HEAD"]);
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

async function rewriteCredentialFreeRemote({ worktreePath, repository, execFileImpl }) {
  await execFileImpl("git", ["-C", worktreePath, "remote", "set-url", "origin", `https://github.com/${repository}.git`]);
  await execFileImpl("git", ["-C", worktreePath, "remote", "set-url", "--push", "origin", `https://github.com/${repository}.git`]);
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
