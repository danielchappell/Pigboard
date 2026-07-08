import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  commitAll,
  createPullRequestWorktree,
  assertCredentialFreeWorktree,
  inspectGitConfigText,
  parseCodexLoginStatus,
  runCodexIsolationDiagnostics,
  runRepoCommands,
  WorktreeSafetyError
} from "../src/index.js";
import {
  assertNoDeniedEnv,
  buildCodexRunnerEnv,
  buildDaemonGitEnv,
  buildRepoCommandEnv
} from "../src/runtime/command-env.js";

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
    CODEX_HOME: "/Users/joseph/.codex",
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
    HOME: "/Users/joseph",
    CODEX_HOME: "/Users/joseph/.codex",
    LANG: "en_US.UTF-8"
  });
  assert.throws(() => assertNoDeniedEnv({ PATH: "/bin", GITHUB_TOKEN: "ghp_test" }), /GITHUB_TOKEN/);
});

test("repo commands use Linux network namespace wrapper when available", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-linux-commands-"));
  const calls = [];
  const results = await runRepoCommands({
    commands: ["echo ok"],
    cwd: root,
    platform: "linux",
    accessImpl: async (path) => {
      assert.equal(path, "/usr/bin/unshare");
    },
    spawnImpl: (command, args) => {
      calls.push({ command, args });
      return fakeCommandSpawn({ stdoutText: "ok\n" });
    }
  });

  assert.equal(calls[0].command, "/usr/bin/unshare");
  assert.deepEqual(calls[0].args, ["-n", "/bin/sh", "-lc", "echo ok"]);
  assert.equal(results[0].stdout, "ok\n");
});

test("daemon git env wires HTTPS auth without exposing GITHUB_TOKEN", () => {
  const env = buildDaemonGitEnv({
    baseEnv: { PATH: "/bin", GITHUB_TOKEN: "ignored" },
    githubToken: "gho_tokenvalue123456"
  });

  assert.equal(env.GITHUB_TOKEN, undefined);
  assert.equal(env.GIT_TERMINAL_PROMPT, "0");
  assert.equal(env.GIT_CONFIG_KEY_0, "http.https://github.com/.extraheader");
  assert.match(env.GIT_CONFIG_VALUE_0, /^AUTHORIZATION: basic /);
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
  assert.throws(
    () =>
      inspectGitConfigText(`
        [remote "origin"]
          url = https://ghp_abcdefghijklmnop@github.com/acme/repo.git
      `),
    /embedded credentials/
  );
});

test("worktree safety follows gitdir and common config paths", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-worktree-config-"));
  const worktree = join(root, "worktree");
  const gitDir = join(root, ".git", "worktrees", "worktree");
  await mkdir(worktree, { recursive: true });
  await mkdir(gitDir, { recursive: true });
  await writeFile(join(worktree, ".git"), `gitdir: ${gitDir}\n`);
  await writeFile(join(gitDir, "commondir"), "../..\n");
  await writeFile(join(root, ".git", "config"), "[credential]\n  helper = store\n");

  await assert.rejects(() => assertCredentialFreeWorktree(worktree), /credential-bearing/);
});

test("repo commands skip network wrapper lookup when command list is empty", async () => {
  const root = await mkdtemp(join(tmpdir(), "ski-empty-commands-"));
  const results = await runRepoCommands({
    commands: [],
    cwd: root,
    spawnImpl: () => {
      throw new Error("spawn should not run");
    }
  });

  assert.deepEqual(results, []);
});

test("Codex isolation diagnostics parse escaped agent-message JSON", async () => {
  await assert.rejects(
    () =>
      runCodexIsolationDiagnostics({
        cwd: "/tmp",
        spawnImpl: fakeCodexSpawn(
          `${JSON.stringify({
            type: "item.completed",
            item: {
              type: "agent_message",
              text: JSON.stringify({ secretReadable: true, networkReachable: false })
            }
          })}\n`
        )
      }),
    /local secrets/
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

test("automated commits use scrubbed env with explicit identity", async () => {
  const envs = [];
  const execFileImpl = async (_command, args, options = {}) => {
    envs.push({ args, env: options.env });
    if (args.includes("rev-parse")) return { stdout: `${"a".repeat(40)}\n`, stderr: "" };
    return { stdout: "", stderr: "" };
  };

  const sha = await commitAll({
    worktreePath: "/tmp/worktree",
    message: "Test commit",
    execFileImpl
  });

  const commitEnv = envs.find((call) => call.args.includes("commit")).env;
  assert.equal(sha, "a".repeat(40));
  assert.equal(commitEnv.GIT_AUTHOR_NAME, "Ski Stack Worker");
  assert.equal(commitEnv.GIT_COMMITTER_EMAIL, "ski-stack@users.noreply.github.com");
  assert.equal(commitEnv.HOME, undefined);
  assert.equal(commitEnv.GITHUB_TOKEN, undefined);
});

function fakeCodexSpawn(stdoutText) {
  return () => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = { end: () => {} };
    queueMicrotask(() => {
      child.stdout.emit("data", stdoutText);
      child.emit("close", 0);
    });
    return child;
  };
}

function fakeCommandSpawn({ stdoutText = "", stderrText = "", code = 0 } = {}) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  queueMicrotask(() => {
    if (stdoutText) child.stdout.emit("data", stdoutText);
    if (stderrText) child.stderr.emit("data", stderrText);
    child.emit("close", code);
  });
  return child;
}
