import assert from "node:assert/strict";
import test from "node:test";

import {
  assertGitHubProjectScopes,
  formatGitHubAuthError,
  GitHubProjectScopeError
} from "../scripts/lib/github-auth.mjs";

test("assertGitHubProjectScopes rejects tokens missing Projects scopes", async () => {
  await assert.rejects(
    assertGitHubProjectScopes({
      token: "test-token",
      source: "gh",
      fetchImpl: async () => ({
        ok: true,
        headers: new Headers({
          "x-oauth-scopes": "repo, read:org, workflow"
        })
      })
    }),
    GitHubProjectScopeError
  );
});

test("formatGitHubAuthError suggests refreshing gh Projects scopes", () => {
  const message = formatGitHubAuthError(
    new GitHubProjectScopeError({
      source: "gh",
      scopes: ["repo", "read:org"],
      message: "missing project scope"
    }),
    { source: "gh" }
  );

  assert.match(message, /gh auth refresh --scopes project/);
  assert.match(message, /Current token source: gh/);
});
