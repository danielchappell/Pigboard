import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export function defaultRunLogDir(env = process.env) {
  return env.SKI_RUN_LOG_DIR ?? join(env.HOME ?? process.cwd(), ".ski-stack", "runs");
}

export async function writeRunArtifacts({ rootDir = defaultRunLogDir(), runId, stream = "", stderr = "", result = {}, metadata = {}, diff = "" }) {
  if (!runId) throw new Error("runId is required");
  const runDir = join(rootDir, runId);
  await mkdir(runDir, { recursive: true });
  await writeFile(join(runDir, "stream.jsonl"), stream);
  await writeFile(join(runDir, "stderr.log"), stderr);
  await writeFile(join(runDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(join(runDir, "metadata.json"), `${JSON.stringify({ ...metadata, runId, runDir }, null, 2)}\n`);
  await writeFile(join(runDir, "transcript.md"), transcriptFromStream(stream, { result, metadata }));
  if (diff) await writeFile(join(runDir, "diff.patch"), diff);
  await appendIndex(rootDir, { ...metadata, runId, runDir });
  return { runDir };
}

export async function findRuns({ rootDir = defaultRunLogDir(), filters = {} } = {}) {
  const indexPath = join(rootDir, "index.jsonl");
  const text = await readOptional(indexPath);
  const entries = text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((entry) => matchesFilters(entry, filters));
  return filters.latest ? entries.slice(-1) : entries;
}

export async function readRunTranscript(run) {
  return readFile(join(run.runDir, "transcript.md"), "utf8");
}

function transcriptFromStream(stream, { result, metadata }) {
  const lines = [`# Ski Stack Run ${metadata.runId ?? ""}`.trim(), ""];
  for (const line of stream.split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type?.startsWith("item.") && event.item?.type === "agent_message" && event.item.text) {
        lines.push(event.item.text, "");
      } else if (event.type === "item.completed" && event.item?.type === "command_execution") {
        lines.push(`Command completed: \`${event.item.command ?? "command"}\``, "");
      } else if (event.type === "turn.completed") {
        lines.push("Turn completed.", "");
      }
    } catch {
      lines.push(line, "");
    }
  }
  if (result?.summary) lines.push("## Result", "", result.summary, "");
  return lines.join("\n");
}

async function appendIndex(rootDir, entry) {
  await mkdir(rootDir, { recursive: true });
  const indexPath = join(rootDir, "index.jsonl");
  await appendFile(indexPath, `${JSON.stringify(entry)}\n`);
}

async function readOptional(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

function matchesFilters(entry, filters) {
  if (filters.run && entry.runId !== filters.run) return false;
  if (filters.worker && entry.workerType !== filters.worker) return false;
  if (filters.status && entry.status !== filters.status) return false;
  if (filters.pr && !matchesNumberOrTitle(entry.prNumber, entry.prTitle, filters.pr)) return false;
  if (filters.issue && !matchesNumberOrTitle(entry.issueNumber, entry.issueTitle, filters.issue)) return false;
  if (filters.item && !matchesNumberOrTitle(entry.projectItemId, entry.projectItemTitle, filters.item)) return false;
  return true;
}

function matchesNumberOrTitle(number, title, value) {
  const needle = String(value).toLowerCase();
  return String(number ?? "").toLowerCase() === needle || String(title ?? "").toLowerCase().includes(needle);
}
