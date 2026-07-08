import { readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

const SECRET_URL_PATTERN = /https?:\/\/[^/\s:@]+:[^/\s@]+@/i;
const TOKEN_PATTERN = /\b(?:x-access-token|ghp|github_pat|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{12,}/i;
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
  files.push(...(await resolveGitConfigPaths(worktree)));

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
  if (UNSAFE_GIT_CONFIG_PATTERN.test(text) || hasUnsafeSectionForm(text)) {
    throw new WorktreeSafetyError("git config contains credential-bearing settings", { file });
  }
}

function hasUnsafeSectionForm(text) {
  let section = "";
  for (const line of String(text ?? "").split("\n")) {
    const sectionMatch = line.match(/^\s*\[([^\]]+)]/);
    if (sectionMatch) {
      section = sectionMatch[1].toLowerCase();
      if (section.startsWith("credential")) return true;
      continue;
    }

    const keyMatch = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=/);
    if (!keyMatch) continue;
    const key = keyMatch[1].toLowerCase();
    if ((section === "http" || section.startsWith("http ")) && key === "extraheader") return true;
    if ((section === "url" || section.startsWith("url ")) && key === "insteadof") return true;
    if ((section === "remote" || section.startsWith("remote ")) && key === "pushurl") return true;
    if (section === "core" && key === "sshcommand") return true;
    if ((section === "include" || section.startsWith("includeif ")) && key === "path") return true;
    if ((section === "lfs" || section.startsWith("lfs ")) && key === "url") return true;
  }
  return false;
}

async function resolveGitConfigPaths(worktree) {
  const dotGit = join(worktree, ".git");
  const dotGitText = await readOptionalFile(dotGit);
  if (dotGitText?.startsWith("gitdir:")) {
    const gitDir = resolveGitPath(worktree, dotGitText.slice("gitdir:".length).trim());
    const paths = [join(gitDir, "config")];
    const commonDirText = (await readOptionalFile(join(gitDir, "commondir"))).trim();
    if (commonDirText) {
      paths.push(join(resolveGitPath(gitDir, commonDirText), "config"));
    } else if (dirname(gitDir).endsWith("worktrees")) {
      paths.push(join(dirname(dirname(gitDir)), "config"));
    }
    return [...new Set(paths)];
  }
  try {
    const info = await stat(dotGit);
    if (info.isDirectory()) return [join(dotGit, "config")];
  } catch {
    return [];
  }
  return [];
}

function resolveGitPath(base, value) {
  return isAbsolute(value) ? value : resolve(base, value);
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
