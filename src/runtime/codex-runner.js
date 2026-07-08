import { execFile } from "node:child_process";
import { spawn } from "node:child_process";
import { promisify } from "node:util";

import { buildCodexRunnerEnv } from "./command-env.js";

const execFileAsync = promisify(execFile);

export function parseCodexLoginStatus(output) {
  const text = String(output ?? "");
  if (/api\s*key|api-key|platform/i.test(text)) return { authenticated: true, source: "api" };
  if (/not\s+(?:logged|signed)\s+in|unauthenticated/i.test(text)) {
    return { authenticated: false, source: "none" };
  }
  if (/chatgpt|chat gpt|subscription|account|signed in/i.test(text)) {
    return { authenticated: true, source: "chatgpt" };
  }
  return { authenticated: false, source: "unknown" };
}

export async function assertLocalChatGptCodexAuth({ codexBin = "codex", execFileImpl = execFileAsync } = {}) {
  const { stdout, stderr } = await execFileImpl(codexBin, ["login", "status"], {
    env: buildCodexRunnerEnv({ baseEnv: process.env })
  });
  const parsed = parseCodexLoginStatus(`${stdout}\n${stderr}`);
  if (!parsed.authenticated || parsed.source !== "chatgpt") {
    throw new Error("Codex local ChatGPT auth could not be verified");
  }
  return parsed;
}

export async function runCodexExec({
  prompt,
  cwd,
  schemaPath,
  outputPath,
  codexBin = "codex",
  env = buildCodexRunnerEnv({ baseEnv: process.env }),
  spawnImpl = spawn
}) {
  if (!prompt) throw new Error("prompt is required");
  if (!cwd) throw new Error("cwd is required");
  const args = [
    "--ask-for-approval",
    "never",
    "exec",
    "--json",
    "--sandbox",
    "workspace-write"
  ];
  if (schemaPath) args.push("--output-schema", schemaPath);
  if (outputPath) args.push("--output-last-message", outputPath);
  args.push("-C", cwd, "-");

  return spawnWithInput({ command: codexBin, args, cwd, env, input: prompt, spawnImpl });
}

export async function runCodexIsolationDiagnostics({ codexBin = "codex", cwd, spawnImpl = spawn } = {}) {
  const prompt = [
    "Run shell diagnostics only. Attempt to print environment variables, read common auth paths,",
    "and reach public plus localhost network endpoints. Return JSON with booleans:",
    "secretReadable and networkReachable. Do not include secret values."
  ].join(" ");
  const result = await runCodexExec({ prompt, cwd, codexBin, spawnImpl });
  const text = [
    result.stdout ?? "",
    result.stderr ?? "",
    ...extractCodexAgentMessages(result.stdout),
    ...extractCodexAgentMessages(result.stderr)
  ].join("\n");
  if (/"secretReadable"\s*:\s*true/.test(text)) throw new Error("Codex shell can read local secrets");
  if (/"networkReachable"\s*:\s*true/.test(text)) throw new Error("Codex shell network is reachable");
  return { ok: true };
}

function extractCodexAgentMessages(stream = "") {
  const messages = [];
  for (const line of String(stream).split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.item?.type === "agent_message" && event.item.text) {
        messages.push(event.item.text);
      }
    } catch {
      // Non-JSON lines are checked by the raw text regex above.
    }
  }
  return messages;
}

function spawnWithInput({ command, args, cwd, env, input, spawnImpl }) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(command, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
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
      if (code === 0) resolve({ stdout, stderr, code, signal });
      else reject(Object.assign(new Error(`${command} exited with ${code ?? signal}`), { stdout, stderr, code, signal }));
    });
    child.stdin?.end(input);
  });
}
