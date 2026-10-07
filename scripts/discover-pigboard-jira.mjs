import { pathToFileURL } from "node:url";
import { discoverPrivateJira } from "../src/hosted/private-caller-client.js";

const HELP = `Find approved Jira projects and boards by name through private Pigboard.

Usage:
  npm run --silent jira:choices -- --token-file /absolute/private/caller.token [--format text|json]
  npm run --silent jira:choices -- --help

Use your own protected mode-0600 bearer file, owned mode-0700 parent and mapped
private WireGuard peer. Do not paste a token into a command. This read-only
command does not save a pair or prove board workflow eligibility. Exit 0 means
complete; 1 means denied, unavailable, uncertain or unverified; 2 is bad usage.
See docs/hosted-pigboard-first-service.md for setup and recovery.`;

function parseArgs(args) {
  if (args.length === 1 && args[0] === "--help") return { help: true };
  const values = { format: "text" };
  const seen = new Set();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!["--token-file", "--format"].includes(flag) || seen.has(flag) ||
        typeof value !== "string" || !value || value.startsWith("--")) return null;
    seen.add(flag);
    values[flag === "--token-file" ? "tokenFile" : "format"] = value;
  }
  return values.tokenFile && ["text", "json"].includes(values.format) ? values : null;
}

function asText(result) {
  if (result.status !== "complete") {
    return `Pigboard Jira choices: ${result.status}\nReason: ${result.reason}\nChoices: omitted\nNext: ${result.nextAction}`;
  }
  const project = result.projects[0];
  return ["Pigboard Jira choices: complete",
    `${project.key} — ${project.name} (${project.id})`,
    ...project.boards.map(board => `  ${board.name} (${board.id}, ${board.type})`),
    ...(project.boards.length === 0 ? ["  No boards returned for this project."] : []),
    "Not yet: pair selection, board eligibility, issue access",
    `Next: ${result.nextAction}`].join("\n");
}

export async function runJiraChoicesCommand(args, { discover = discoverPrivateJira,
  output = console.log } = {}) {
  const options = parseArgs(args);
  if (options?.help) { output(HELP); return 0; }
  if (!options) {
    const result = { schemaVersion: 1, status: "unverified", reason: "invalid_usage",
      omissions: ["approved_choices"],
      nextAction: "Use --token-file ABSOLUTE_PATH and optional --format text|json. See --help." };
    const json = args.some((arg, index) => arg === "--format" && args[index + 1] === "json");
    output(json ? JSON.stringify(result) : asText(result));
    return 2;
  }
  let result;
  try { result = await discover({ tokenFile: options.tokenFile }); }
  catch { result = { schemaVersion: 1, status: "unverified", reason: "request_unverified",
    omissions: ["approved_choices"], nextAction: "Check the private route, then retry discovery." }; }
  output(options.format === "json" ? JSON.stringify(result) : asText(result));
  return result.status === "complete" ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await runJiraChoicesCommand(process.argv.slice(2));
}
