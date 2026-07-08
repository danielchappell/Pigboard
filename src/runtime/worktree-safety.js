import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const SECRET_URL_PATTERN = /https?:\/\/[^/\s:@]+:[^/\s@]+@/i;
const TOKEN_PATTERN = /\b(?:x-access-token|ghp_|github_pat_|gho_|ghu_|ghs_|ghr_)\b/i;
const UNSAFE_GIT_CONFIG_PATTERN =
  /(?:credential\.|^\s*\[credential\b|http\..*\.extraheader|core\.sshcommand|url\..*\.insteadof|include(?:if)?\.path|remote\..*\.pushurl|lfs\..*\.url)/im;

export class WorktreeSafetyError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "WorktreeSafetyError";
    this.details = details;
  }
}

export async function assertCredentialFreeWorktree(worktree, { allowSubmodules = false } = {}) {
  if (!worktree) throw new WorktreeSafetyError("worktree is required");
  await assertPathExists(worktree);

  const files = [join(worktree, ".gitmodules")];
  const gitConfigPath = await resolveGitConfigPath(worktree);
  if (gitConfigPath) files.push(gitConfigPath);

  for (const file of files) {
    const text = await readOptionalFile(file);
    if (!text) continue;
    inspectGitConfigText(text, file);
    if (!allowSubmodules && file.endsWith(".gitmodules") && text.trim()) {
      throw new WorktreeSafetyError("submodules are disabled in v1", { file });
    }
  }

  return { ok: true };
}

export function inspectGitConfigText(text, file = "git config") {
  if (SECRET_URL_PATTERN.test(text) || TOKEN_PATTERN.test(text)) {
    throw new WorktreeSafetyError("git config contains embedded credentials", { file });
  }
  if (UNSAFE_GIT_CONFIG_PATTERN.test(text)) {
    throw new WorktreeSafetyError("git config contains credential-bearing settings", { file });
  }
}

async function resolveGitConfigPath(worktree) {
  const dotGit = join(worktree, ".git");
  const dotGitText = await readOptionalFile(dotGit);
  if (dotGitText?.startsWith("gitdir:")) {
    const gitDir = dotGitText.slice("gitdir:".length).trim();
    return join(worktree, gitDir, "config");
  }
  try {
    const info = await stat(dotGit);
    if (info.isDirectory()) return join(dotGit, "config");
  } catch {
    return null;
  }
  return null;
}

async function readOptionalFile(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "EISDIR") return "";
    throw error;
  }
}

async function assertPathExists(path) {
  try {
    await stat(path);
  } catch (error) {
    throw new WorktreeSafetyError(`worktree does not exist: ${path}`, { cause: error });
  }
}
