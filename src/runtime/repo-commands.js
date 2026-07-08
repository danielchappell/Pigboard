import { spawn } from "node:child_process";
import { access } from "node:fs/promises";

import { buildRepoCommandEnv } from "./command-env.js";
import { assertCredentialFreeWorktree } from "./worktree-safety.js";

export async function runRepoCommands({
  commands = [],
  cwd,
  network = "off",
  env = buildRepoCommandEnv({ baseEnv: process.env }),
  spawnImpl = spawn
}) {
  if (network !== "off") {
    throw new Error("Scoped repo-command network policies are not implemented in v1");
  }
  await assertCredentialFreeWorktree(cwd);
  const wrapper = await resolveNetworkOffWrapper();
  const results = [];
  for (const command of commands) {
    const result = await runShellCommand({ command, cwd, env, spawnImpl, wrapper });
    results.push(result);
    await assertCredentialFreeWorktree(cwd);
  }
  return results;
}

async function resolveNetworkOffWrapper() {
  if (process.platform === "darwin") {
    const sandboxExec = "/usr/bin/sandbox-exec";
    try {
      await access(sandboxExec);
      return {
        command: sandboxExec,
        args: ["-p", "(version 1) (allow default) (deny network*)", "/bin/sh", "-lc"]
      };
    } catch {
      // Fall through to fail closed.
    }
  }
  throw new Error("No supported network-off wrapper available for repo commands");
}

function runShellCommand({ command, cwd, env, spawnImpl, wrapper }) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(wrapper.command, [...wrapper.args, command], {
      cwd,
      env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      const result = { command, stdout, stderr, code, signal };
      if (code === 0) resolve(result);
      else reject(Object.assign(new Error(`repo command failed: ${command}`), result));
    });
  });
}
