import { pathToFileURL } from "node:url";
import { checkPigJiraMetadata, formatPigJiraMetadata } from "../src/jira/pig-metadata-preflight.js";

const HELP = `Check the fixed Scubapig PIG project and boards 2/35 with the dedicated Jira service account.

Usage:
  npm run --silent jira:metadata -- --client-id-file /absolute/private/client-id --client-secret-file /absolute/private/client-secret [--format text|json]
  npm run --silent jira:metadata -- --help

Use two separate owned mode-0600 files under owned mode-0700 directories.
Never put credential values in a command, environment variable or prompt.
Exit 0 proves only targeted metadata reads, not pair validity or S02a acceptance.
Exit 1 means incomplete metadata; 2 means invalid usage or an unsafe local file.
See docs/pig-jira-metadata-preflight.md for setup, scopes and recovery.`;

function parseArgs(args) {
  if (args.length === 1 && args[0] === "--help") return { help: true };
  const result = { format: "text" };
  const seen = new Set();
  if (args.length % 2 !== 0) return null;
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!["--client-id-file", "--client-secret-file", "--format"].includes(flag) ||
        seen.has(flag) || typeof value !== "string" || !value || value.startsWith("--")) return null;
    seen.add(flag);
    result[flag === "--client-id-file" ? "clientIdFile" :
      flag === "--client-secret-file" ? "clientSecretFile" : "format"] = value;
  }
  return result.clientIdFile && result.clientSecretFile &&
    ["text", "json"].includes(result.format) ? result : null;
}

export async function runPigJiraMetadataCommand(args, { check = checkPigJiraMetadata,
  output = console.log } = {}) {
  const options = parseArgs(args);
  if (options?.help) { output(HELP); return 0; }
  const json = args.some((arg, index) => arg === "--format" && args[index + 1] === "json");
  if (!options) {
    const result = { schemaVersion: 1, status: "metadata_incomplete", reason: "invalid_usage",
      routes: [], omissions: ["pair_validity", "issue_membership", "caller_audience", "other_D1_evidence"],
      nextAction: "Usage: --client-id-file ABSOLUTE_PATH --client-secret-file ABSOLUTE_PATH [--format text|json]. See --help." };
    output(formatPigJiraMetadata(result, json ? "json" : "text"));
    return 2;
  }
  let result;
  try { result = await check(options); } catch {
    result = { schemaVersion: 1, status: "metadata_incomplete", reason: "request_failed",
      routes: [], omissions: ["pair_validity", "issue_membership", "caller_audience", "other_D1_evidence"],
      nextAction: "Check the protected files and Jira connection, then retry." };
  }
  output(formatPigJiraMetadata(result, options.format));
  if (result.status === "metadata_complete") return 0;
  return ["unsafe_credential_file", "invalid_credential_file"].includes(result.reason) ? 2 : 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await runPigJiraMetadataCommand(process.argv.slice(2));
}
