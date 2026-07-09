import { execFile } from "node:child_process";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
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
  model,
  schemaPath,
  outputPath,
  streamPath,
  stderrPath,
  maxBufferedOutputBytes = 256 * 1024,
  codexBin = "codex",
  env = buildCodexRunnerEnv({ baseEnv: process.env }),
  spawnImpl = spawn
}) {
  if (!prompt) throw new Error("prompt is required");
  if (!cwd) throw new Error("cwd is required");
  const selectedModel = model == null ? undefined : normalizeCodexModel(model);
  const args = [
    "--ask-for-approval",
    "never",
    "exec",
    "--json",
    "--sandbox",
    "workspace-write"
  ];
  if (selectedModel) args.push("--model", selectedModel);
  if (schemaPath) args.push("--output-schema", schemaPath);
  if (outputPath) args.push("--output-last-message", outputPath);
  args.push("-C", cwd, "-");

  return spawnWithInput({
    command: codexBin,
    args,
    cwd,
    env,
    input: prompt,
    spawnImpl,
    streamPath,
    stderrPath,
    maxBufferedOutputBytes
  });
}

export function normalizeCodexModel(model) {
  if (typeof model !== "string" || !model.trim()) {
    throw new Error("Codex model must be a non-empty string");
  }
  return model.trim();
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
  const diagnostics = parseIsolationDiagnostics(text);
  if (diagnostics.secretReadable !== false) throw new Error("Codex shell can read local secrets");
  if (diagnostics.networkReachable !== false) throw new Error("Codex shell network is reachable");
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

async function spawnWithInput({
  command,
  args,
  cwd,
  env,
  input,
  spawnImpl,
  streamPath,
  stderrPath,
  maxBufferedOutputBytes
}) {
  const stdoutStream = streamPath ? await openOutputStream(streamPath) : null;
  const stderrStream = stderrPath ? await openOutputStream(stderrPath) : null;
  return new Promise((resolve, reject) => {
    const child = spawnImpl(command, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout = appendBounded(stdout, chunk, maxBufferedOutputBytes);
      stdoutStream?.write(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr = appendBounded(stderr, chunk, maxBufferedOutputBytes);
      stderrStream?.write(chunk);
    });
    child.on("error", async (error) => {
      await closeOutputStreams(stdoutStream, stderrStream);
      reject(error);
    });
    child.on("close", async (code, signal) => {
      await closeOutputStreams(stdoutStream, stderrStream);
      const result = { stdout, stderr, code, signal, streamPath, stderrPath };
      if (code === 0) resolve(result);
      else reject(Object.assign(new Error(`${command} exited with ${code ?? signal}`), result));
    });
    child.stdin?.end(input);
  });
}

async function openOutputStream(path) {
  await mkdir(dirname(path), { recursive: true });
  return createWriteStream(path, { flags: "w" });
}

function closeOutputStreams(...streams) {
  return Promise.all(
    streams
      .filter(Boolean)
      .map(
        (stream) =>
          new Promise((resolve, reject) => {
            stream.on("error", reject);
            stream.end(resolve);
          })
      )
  );
}

function appendBounded(current, chunk, maxBytes) {
  const next = `${current}${chunk}`;
  if (Buffer.byteLength(next) <= maxBytes) return next;
  return next.slice(-maxBytes);
}

function parseIsolationDiagnostics(text) {
  for (const candidate of jsonCandidates(text)) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed?.secretReadable === "boolean" && typeof parsed?.networkReachable === "boolean") {
        return parsed;
      }
    } catch {
      // Keep searching for a structured diagnostic payload.
    }
  }
  throw new Error("Codex isolation diagnostics did not report safe booleans");
}

function jsonCandidates(text) {
  const candidates = [];
  for (const line of String(text ?? "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    candidates.push(trimmed);
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first !== -1 && last > first) candidates.push(trimmed.slice(first, last + 1));
  }
  return candidates;
}
