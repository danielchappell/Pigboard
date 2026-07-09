import { execFile, spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";

import { buildRepoCommandEnv } from "./command-env.js";
import { assertCredentialFreeWorktree } from "./worktree-safety.js";

const execFileAsync = promisify(execFile);

export async function runRepoCommands({
  commands = [],
  cwd,
  network = "off",
  env = buildRepoCommandEnv({ baseEnv: process.env }),
  spawnImpl = spawn,
  execFileImpl = execFileAsync,
  platform = process.platform,
  accessImpl = access
}) {
  if (network !== "off") {
    throw new Error("Scoped repo-command network policies are not implemented in v1");
  }
  await assertCredentialFreeWorktree(cwd);
  if (!commands.length) return [];
  const wrapper = await resolveNetworkOffWrapper({ platform, accessImpl, execFileImpl, env });
  const results = [];
  for (const command of commands) {
    const result = await runShellCommand({ command, cwd, env, spawnImpl, wrapper });
    results.push(result);
    await assertCredentialFreeWorktree(cwd);
  }
  return results;
}

async function resolveNetworkOffWrapper({
  platform = process.platform,
  accessImpl = access,
  execFileImpl = execFileAsync,
  env = buildRepoCommandEnv()
} = {}) {
  if (platform === "darwin") {
    const sandboxExec = "/usr/bin/sandbox-exec";
    try {
      await accessImpl(sandboxExec);
      return {
        command: sandboxExec,
        args: ["-p", "(version 1) (allow default) (deny network*)", "/bin/sh", "-c"]
      };
    } catch {
      // Fall through to fail closed.
    }
  }
  if (platform === "linux") {
    for (const unshare of ["/usr/bin/unshare", "/bin/unshare"]) {
      const candidates = [
        { probeArgs: ["--map-root-user", "-n", "true"], args: ["--map-root-user", "-n", "/bin/sh", "-c"] },
        { probeArgs: ["-r", "-n", "true"], args: ["-r", "-n", "/bin/sh", "-c"] },
        { probeArgs: ["-n", "true"], args: ["-n", "/bin/sh", "-c"] }
      ];
      for (const candidate of candidates) {
        try {
          await accessImpl(unshare);
          await execFileImpl(unshare, candidate.probeArgs, { env });
          return {
            command: unshare,
            args: candidate.args
          };
        } catch {
          // Try the next supported invocation.
        }
      }
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
