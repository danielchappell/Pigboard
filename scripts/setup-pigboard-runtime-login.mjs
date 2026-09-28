import { pathToFileURL } from "node:url";
import { setupRuntimeLogin } from "../src/hosted/runtime-login-setup.js";

const HELP = `Create and verify the restricted Pigboard Neon runtime login.

Usage:
  npm run --silent owner:runtime-login -- --owner-url-file /absolute/private/owner.url --neon-key-file /absolute/private/neon.key --passfile /absolute/private/app.pgpass [--format text|json]
  npm run --silent owner:runtime-login -- --help

This owner-only command is pinned to the Pigboard production branch. The owner
URL and project-scoped Neon API key files must be regular, owned and mode 0600
under mode-0700 directories. The passfile must not exist. It is saved privately
before the role commits and is used for the verified post-commit login. No
credential is printed. On an uncertain result, inspect before any retry.
The guide is docs/hosted-neon-preflight.md.`;

function parse(args) {
  if (args.length === 1 && args[0] === "--help") return { help: true };
  const values = { format: "text" };
  const flags = new Map([["--owner-url-file", "ownerUrlFile"],
    ["--neon-key-file", "neonKeyFile"], ["--passfile", "passfile"],
    ["--format", "format"]]);
  const seen = new Set();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flags.has(flag) || seen.has(flag) || !value || value.startsWith("--")) return null;
    seen.add(flag);
    values[flags.get(flag)] = value;
  }
  return values.ownerUrlFile && values.neonKeyFile && values.passfile &&
    ["text", "json"].includes(values.format) ? values : null;
}

function textResult(result) {
  const lines = [`status: ${result.status}`];
  for (const check of result.checks ?? []) lines.push(`${check.status}: ${check.id}`);
  for (const check of result.preflightChecks ?? []) {
    lines.push(`${check.status}: ${check.id}${check.reason ? ` (${check.reason})` : ""}`);
  }
  if (result.omissions?.length) lines.push(`omissions: ${result.omissions.join(", ")}`);
  if (result.fileCreated !== undefined) lines.push(`passfileCreated: ${result.fileCreated}`);
  if (result.nextAction) lines.push(`nextAction: ${result.nextAction}`);
  return lines.join("\n");
}

export async function runRuntimeLoginCommand(args, { output = console.log,
  setup = setupRuntimeLogin } = {}) {
  const options = parse(args);
  if (options?.help) { output(HELP); return 0; }
  if (!options) {
    output(JSON.stringify({ schemaVersion: 1, status: "invalid_usage",
      nextAction: "Use --help for the three private file paths." }));
    return 2;
  }
  const result = await setup(options);
  output(options.format === "json" ? JSON.stringify(result) : textResult(result));
  return result.status === "created_verified" ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runRuntimeLoginCommand(process.argv.slice(2));
}
