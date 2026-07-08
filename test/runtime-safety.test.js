import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createPullRequestWorktree,
  inspectGitConfigText,
  parseCodexLoginStatus,
  WorktreeSafetyError
} from "../src/index.js";
import { assertNoDeniedEnv, buildCodexRunnerEnv, buildRepoCommandEnv } from "../src/runtime/command-env.js";

test("Codex auth parser distinguishes ChatGPT local auth from API-key auth", () => {
  assert.deepEqual(parseCodexLoginStatus("Signed in with ChatGPT account joseph@example.com"), {
    authenticated: true,
    source: "chatgpt"
  });
  assert.deepEqual(parseCodexLoginStatus("Authenticated using API key from OPENAI_API_KEY"), {
    authenticated: true,
    source: "api"
  });
  assert.deepEqual(parseCodexLoginStatus("Not signed in"), {
    authenticated: false,
    source: "none"
  });
});

test("repo and Codex runner env builders strip secret-bearing variables", () => {
  const baseEnv = {
    PATH: "/bin",
    HOME: "/Users/joseph",
    OPENAI_API_KEY: "sk-test",
    GITHUB_TOKEN: "ghp_test",
    GH_CONFIG_DIR: "/tmp/gh",
    LANG: "en_US.UTF-8"
  };

  assert.deepEqual(buildRepoCommandEnv({ baseEnv }), {
    PATH: "/bin",
    LANG: "en_US.UTF-8"
  });
  assert.deepEqual(buildCodexRunnerEnv({ baseEnv }), {
    PATH: "/bin",
    LANG: "en_US.UTF-8"
  });
  assert.throws(() => assertNoDeniedEnv({ PATH: "/bin", GITHUB_TOKEN: "ghp_test" }), /GITHUB_TOKEN/);
});

test("worktree safety rejects credential-bearing git config", () => {
  assert.throws(
    () =>
      inspectGitConfigText(`
        [remote "origin"]
          url = https://x-access-token:ghp_1234567890123456@github.com/acme/repo.git
      `),
    WorktreeSafetyError
  );
  assert.throws(
    () =>
      inspectGitConfigText(`
        [credential]
          helper = osxkeychain
      `),
    /credential-bearing/
  );
});

test("pull request worktree creation rejects claimed head drift", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worktrees-"));
  const calls = [];
  const execFileImpl = async (_command, args) => {
    calls.push(args);
    if (args.includes("rev-parse")) return { stdout: `${"b".repeat(40)}\n`, stderr: "" };
    return { stdout: "", stderr: "" };
  };

  await assert.rejects(
    () =>
      createPullRequestWorktree({
        repoPath: root,
        repository: "acme/repo",
        pullRequestNumber: 42,
        runId: "run-1",
        worktreeRoot: root,
        expectedHeadSha: "a".repeat(40),
        execFileImpl
      }),
    /head drifted/
  );
  assert.equal(calls.some((args) => args.includes("worktree") && args.includes("add")), false);
});

test("pull request worktree creation checks out the claimed head", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worktrees-"));
  const expectedHeadSha = "a".repeat(40);
  const calls = [];
  const execFileImpl = async (_command, args) => {
    calls.push(args);
    if (args.includes("rev-parse")) return { stdout: `${expectedHeadSha}\n`, stderr: "" };
    if (args.includes("worktree") && args.includes("add")) {
      const worktreePath = args[args.indexOf("add") + 2];
      await mkdir(join(worktreePath, ".git"), { recursive: true });
      await writeFile(join(worktreePath, ".git", "config"), "[remote \"origin\"]\n  url = https://github.com/acme/repo.git\n");
    }
    return { stdout: "", stderr: "" };
  };

  const result = await createPullRequestWorktree({
    repoPath: root,
    repository: "acme/repo",
    pullRequestNumber: 42,
    runId: "run-1",
    worktreeRoot: root,
    expectedHeadSha,
    execFileImpl
  });

  assert.equal(result.worktreePath.endsWith("acme_repo/run-1"), true);
  assert.equal(calls.some((args) => args.includes(expectedHeadSha)), true);
});
