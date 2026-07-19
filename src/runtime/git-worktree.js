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
  const remoteUrl = githubRemoteUrl(repository);
  const baseRunRef = runScopedRef(runId, "base");
  await mkdir(join(worktreeRoot, repositorySegment), { recursive: true });
  await assertCredentialFreeWorktree(repoPath);
  await execFileImpl("git", ["-C", repoPath, "fetch", "--no-tags", remoteUrl, `+${branchRemoteRef(baseBranch)}:${baseRunRef}`], {
    env: buildDaemonGitEnv({ githubToken })
  });
  await execFileImpl("git", ["-c", "core.hooksPath=/dev/null", "-C", repoPath, "worktree", "add", "-B", safeBranchName, worktreePath, baseRunRef], {
    env: buildRepoCommandEnv()
  });
  await assertCredentialFreeWorktree(worktreePath);
  return { worktreePath, branchName: safeBranchName };
}

export async function createDetachedBaseWorktree({
  repoPath,
  repository,
  baseBranch,
  expectedBaseSha,
  runId,
  worktreeRoot = defaultWorktreeRoot(),
  execFileImpl = execFileAsync,
  githubToken
}) {
  return createDetachedRemoteWorktree({
    repoPath,
    repository,
    remoteRef: branchRemoteRef(baseBranch),
    expectedSha: expectedBaseSha,
    runId,
    refName: "base",
    worktreeRoot,
    execFileImpl,
    githubToken
  });
}

export async function createImplementationBranchWorktree({
  repoPath,
  repository,
  baseBranch,
  baseSha,
  branchName,
  expectedHeadSha,
  runId,
  worktreeRoot = defaultWorktreeRoot(),
  execFileImpl = execFileAsync,
  githubToken
}) {
  const source = expectedHeadSha
    ? { remoteRef: branchRemoteRef(branchName), expectedSha: expectedHeadSha, refName: "implementation-head" }
    : { remoteRef: branchRemoteRef(baseBranch), expectedSha: baseSha, refName: "implementation-base" };
  const worktree = await createDetachedRemoteWorktree({
    repoPath,
    repository,
    ...source,
    runId,
    worktreeRoot,
    execFileImpl,
    githubToken
  });
  return { ...worktree, branchName, resumed: Boolean(expectedHeadSha) };
}

export async function createPullRequestWorktree({
  repoPath,
  repository,
  pullRequestNumber,
  runId,
  baseRef,
  expectedHeadSha,
  worktreeRoot = defaultWorktreeRoot(),
  execFileImpl = execFileAsync,
  githubToken
}) {
  const repositorySegment = safePathSegment(repository);
  const worktreePath = join(worktreeRoot, repositorySegment, safePathSegment(runId));
  const remoteUrl = githubRemoteUrl(repository);
  const headRunRef = runScopedRef(runId, "pr-head");
  await mkdir(join(worktreeRoot, repositorySegment), { recursive: true });
  await assertCredentialFreeWorktree(repoPath);
  await execFileImpl(
    "git",
    ["-C", repoPath, "fetch", "--no-tags", remoteUrl, `+${pullRequestRemoteRef(pullRequestNumber)}:${headRunRef}`],
    {
      env: buildDaemonGitEnv({ githubToken })
    }
  );
  const { stdout: fetchedHead } = await execFileImpl("git", ["-C", repoPath, "rev-parse", headRunRef], {
    env: buildRepoCommandEnv()
  });
  const headSha = fetchedHead.trim();
  if (expectedHeadSha && headSha !== expectedHeadSha) {
    throw new Error("pull request head drifted after claim");
  }
  if (baseRef) {
    await execFileImpl(
      "git",
      ["-C", repoPath, "fetch", "--no-tags", remoteUrl, `+${branchRemoteRef(baseRef)}:${runScopedRef(runId, "base")}`],
      {
        env: buildDaemonGitEnv({ githubToken })
      }
    );
  }
  await execFileImpl("git", ["-c", "core.hooksPath=/dev/null", "-C", repoPath, "worktree", "add", "--detach", worktreePath, expectedHeadSha ?? headSha], {
    env: buildRepoCommandEnv()
  });
  await assertCredentialFreeWorktree(worktreePath);
  return { worktreePath };
}

export async function resetTrackedChanges({ worktreePath, execFileImpl = execFileAsync }) {
  await execFileImpl("git", ["-C", worktreePath, "reset", "--hard", "HEAD"], {
    env: buildRepoCommandEnv()
  });
}

export async function listUntrackedFiles({ worktreePath, execFileImpl = execFileAsync }) {
  const { stdout } = await execFileImpl("git", ["-C", worktreePath, "ls-files", "--others", "--exclude-standard", "-z"], {
    env: buildRepoCommandEnv()
  });
  return stdout.split("\0").filter(Boolean);
}

export async function hasDiff({ worktreePath, execFileImpl = execFileAsync, ignoredPaths = [] }) {
  const { stdout } = await execFileImpl("git", ["-C", worktreePath, "status", "--porcelain", "--untracked-files=all"], {
    env: buildRepoCommandEnv()
  });
  const ignored = new Set(ignoredPaths);
  return parsePorcelainPaths(stdout).some((path) => !ignored.has(path));
}

export async function commitAll({ worktreePath, message, execFileImpl = execFileAsync, ignoredPaths = [] }) {
  const env = buildRepoCommandEnv({
    extraEnv: {
      GIT_AUTHOR_NAME: "Ski Stack Worker",
      GIT_AUTHOR_EMAIL: "ski-stack@users.noreply.github.com",
      GIT_COMMITTER_NAME: "Ski Stack Worker",
      GIT_COMMITTER_EMAIL: "ski-stack@users.noreply.github.com"
    }
  });
  await execFileImpl("git", ["-C", worktreePath, "add", "-A"], { env });
  if (ignoredPaths.length) {
    await execFileImpl("git", ["-C", worktreePath, "reset", "--", ...ignoredPaths], { env });
  }
  const { stdout: staged } = await execFileImpl("git", ["-C", worktreePath, "diff", "--cached", "--name-only"], { env });
  if (!staged.trim()) throw new Error("worker produced no committable diff");
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

export async function snapshotGitState({ worktreePath, execFileImpl = execFileAsync }) {
  const [{ stdout: head }, { stdout: status }, { stdout: refs }] = await Promise.all([
    execFileImpl("git", ["-C", worktreePath, "rev-parse", "HEAD"], { env: buildRepoCommandEnv() }),
    execFileImpl("git", ["-C", worktreePath, "status", "--porcelain", "--untracked-files=all"], { env: buildRepoCommandEnv() }),
    execFileImpl("git", ["-C", worktreePath, "for-each-ref", "--format=%(refname) %(objectname)", "refs/heads", "refs/tags"], {
      env: buildRepoCommandEnv()
    })
  ]);
  return { head: head.trim(), status, refs };
}

export async function assertGitStateUnchanged({ before, worktreePath, execFileImpl = execFileAsync }) {
  const after = await snapshotGitState({ worktreePath, execFileImpl });
  if (before.head !== after.head || before.status !== after.status || before.refs !== after.refs) {
    throw new Error("read-only worker changed repository state");
  }
  return after;
}

async function createDetachedRemoteWorktree({
  repoPath,
  repository,
  remoteRef,
  expectedSha,
  runId,
  refName,
  worktreeRoot,
  execFileImpl,
  githubToken
}) {
  const repositorySegment = safePathSegment(repository);
  const worktreePath = join(worktreeRoot, repositorySegment, safePathSegment(runId));
  const remoteUrl = githubRemoteUrl(repository);
  const runRef = runScopedRef(runId, refName);
  await mkdir(join(worktreeRoot, repositorySegment), { recursive: true });
  await assertCredentialFreeWorktree(repoPath);
  await execFileImpl("git", ["-C", repoPath, "fetch", "--no-tags", remoteUrl, `+${remoteRef}:${runRef}`], {
    env: buildDaemonGitEnv({ githubToken })
  });
  const { stdout } = await execFileImpl("git", ["-C", repoPath, "rev-parse", runRef], { env: buildRepoCommandEnv() });
  const headSha = stdout.trim();
  if (expectedSha && headSha !== expectedSha) throw new Error("remote ref drifted after claim");
  await execFileImpl("git", ["-c", "core.hooksPath=/dev/null", "-C", repoPath, "worktree", "add", "--detach", worktreePath, headSha], {
    env: buildRepoCommandEnv()
  });
  await assertCredentialFreeWorktree(worktreePath);
  return { worktreePath, headSha };
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

function githubRemoteUrl(repository) {
  const value = String(repository ?? "").trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) {
    throw new Error(`Invalid GitHub repository: ${repository}`);
  }
  return `https://github.com/${value}.git`;
}

function branchRemoteRef(branchName) {
  const value = String(branchName ?? "").trim();
  if (!isSafeRemoteRefName(value)) throw new Error(`Invalid branch ref: ${branchName}`);
  return `refs/heads/${value}`;
}

function pullRequestRemoteRef(pullRequestNumber) {
  const value = Number(pullRequestNumber);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid pull request number: ${pullRequestNumber}`);
  return `refs/pull/${value}/head`;
}

function runScopedRef(runId, name) {
  return `refs/ski-stack/${safePathSegment(runId)}/${name}`;
}

function isSafeRemoteRefName(value) {
  return (
    Boolean(value) &&
    !value.includes("..") &&
    !value.includes("@{") &&
    !value.startsWith("/") &&
    !value.endsWith("/") &&
    !/[\s~^:?*[\\]/.test(value) &&
    value
      .split("/")
      .every((segment) => segment && segment !== "." && segment !== ".." && !segment.endsWith(".") && !segment.endsWith(".lock"))
  );
}

function parsePorcelainPaths(output) {
  return String(output ?? "")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const path = line.slice(3);
      return path.includes(" -> ") ? path.split(" -> ").at(-1) : path;
    });
}
