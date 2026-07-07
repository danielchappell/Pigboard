import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const REQUIRED_PROJECT_SCOPES = ["project"];

export class GitHubProjectScopeError extends Error {
  constructor({ source, scopes = [], message }) {
    super(message ?? "GitHub token is missing Projects scopes");
    this.name = "GitHubProjectScopeError";
    this.source = source;
    this.scopes = scopes;
  }
}

export async function resolveGitHubAuth() {
  if (process.env.GITHUB_TOKEN) {
    return { token: process.env.GITHUB_TOKEN, source: "GITHUB_TOKEN" };
  }
  if (process.env.GH_TOKEN) {
    return { token: process.env.GH_TOKEN, source: "GH_TOKEN" };
  }

  try {
    const { stdout } = await execFileAsync("gh", ["auth", "token"]);
    const token = stdout.trim();
    return token ? { token, source: "gh" } : null;
  } catch {
    return null;
  }
}

export async function assertGitHubProjectScopes({ token, source, fetchImpl = globalThis.fetch }) {
  const response = await fetchImpl("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "ski-stack"
    }
  });
  if (!response.ok) return;

  const scopeHeader = response.headers.get("x-oauth-scopes");
  if (!scopeHeader) return;

  const scopes = parseScopes(scopeHeader);
  const missing = REQUIRED_PROJECT_SCOPES.filter((scope) => !scopes.has(scope));
  if (!missing.length) return;

  throw new GitHubProjectScopeError({
    source,
    scopes: [...scopes],
    message: `GitHub token is missing required scope(s): ${missing.join(", ")}`
  });
}

export function createGraphqlClient({ token, source }) {
  return async function graphql(query, variables = {}) {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "ski-stack"
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`GitHub GraphQL request failed: ${response.status}`);
    }

    const payload = await response.json();
    if (payload.errors?.length) {
      const message = payload.errors.map((error) => error.message).join("; ");
      if (isGitHubProjectScopeMessage(message)) {
        throw new GitHubProjectScopeError({ source, message });
      }
      throw new Error(message);
    }

    return payload.data;
  };
}

export function formatGitHubAuthError(error, auth) {
  const isScopeError =
    error instanceof GitHubProjectScopeError || isGitHubProjectScopeMessage(error?.message);
  if (!isScopeError) return null;

  const source = error.source ?? auth?.source;
  const scopes = error.scopes?.length ? error.scopes.join(", ") : "unknown";
  const lines = [
    "GitHub authentication is missing Projects permission.",
    "",
    `Current token source: ${source ?? "unknown"}`,
    `Current OAuth scopes: ${scopes}`,
    "",
    "Ski Stack needs Projects scopes to create/provision the queue board.",
    ""
  ];

  if (source === "gh") {
    lines.push(
      "Refresh your local GitHub CLI auth, then rerun the setup command:",
      "",
      "  gh auth refresh --scopes project",
      "  npm run setup:github-project"
    );
  } else {
    lines.push(
      `Update ${source ?? "your token"} to include these scopes:`,
      "",
      "  project",
      "",
      "Then rerun the setup command."
    );
  }

  return lines.join("\n");
}

export function missingGitHubAuthMessage() {
  return `Missing GitHub authentication.

Set GITHUB_TOKEN/GH_TOKEN or authenticate the local GitHub CLI with:
  gh auth login

For GitHub Projects setup, the token also needs:
  gh auth refresh --scopes project
`;
}

export function isGitHubProjectScopeMessage(message) {
  return /required scopes|read:project|createProjectV2|project scope|Projects permission/i.test(
    String(message ?? "")
  );
}

function parseScopes(scopeHeader) {
  return new Set(
    scopeHeader
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean)
  );
}
