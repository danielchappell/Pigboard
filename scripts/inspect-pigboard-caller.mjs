import { pathToFileURL } from "node:url";
import { inspectPrivateCaller } from "../src/hosted/private-caller-client.js";

const HELP = `Inspect only your current Pigboard grant through the private service.

Usage:
  npm run --silent caller:me -- --token-file /absolute/private/caller.token [--format text|json]
  npm run --silent caller:me -- --help

The token file must be owned by you, regular, nonsymlink and mode 0600 inside
an owned mode-0700 directory. Use your own WireGuard peer and the reviewed
private Flycast route. Never paste the token into a command or use a public URL.
The bootstrapped human owner can use this after live setup. Named human and
agent recipients can use it after separate credential issuance. No grant is
created or changed. Exit 0 means verified; 1 means denied, unavailable or
unverified; 2 means invalid usage. See docs/hosted-pigboard-first-service.md.`;

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
  if (!values.tokenFile || !["text", "json"].includes(values.format)) return null;
  return values;
}

function textResult(result) {
  if (result.status === "ok") {
    return `Pigboard grant: verified\nPrincipal: ${JSON.stringify(result.principal.name)} (${result.principal.kind}, ${result.principal.id})\nTeam: ${result.team}\nGeneration: ${result.generation}\nGrants: ${result.grants.join(", ")}`;
  }
  return `Pigboard grant: ${result.status}\nReason: ${result.reason}\nCurrent grant: omitted\nNext: ${result.nextAction}`;
}

export async function runCallerCommand(args, { inspect = inspectPrivateCaller,
  output = console.log } = {}) {
  const options = parseArgs(args);
  if (options?.help) {
    output(HELP);
    return 0;
  }
  if (!options) {
    const error = { schemaVersion: 1, status: "unverified", reason: "invalid_usage",
      omissions: ["current_grant"], nextAction: "Use --token-file ABSOLUTE_PATH and optional --format text|json. See --help." };
    const json = args.some((arg, index) => arg === "--format" && args[index + 1] === "json");
    output(json ? JSON.stringify(error) : textResult(error));
    return 2;
  }
  let result;
  try {
    result = await inspect({ tokenFile: options.tokenFile });
  } catch {
    result = { schemaVersion: 1, status: "unverified", reason: "inspection_unverified",
      omissions: ["current_grant"],
      nextAction: "Check the private Pigboard route and service, then retry inspection." };
  }
  output(options.format === "json" ? JSON.stringify(result) : textResult(result));
  return result.status === "ok" ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await runCallerCommand(process.argv.slice(2));
}
