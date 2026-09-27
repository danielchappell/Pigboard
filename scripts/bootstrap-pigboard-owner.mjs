import { pathToFileURL } from "node:url";
import { connectOwner, OwnerError } from "../src/hosted/owner-root.js";
import { AuthorityError, changeOwner, deliverCredential, inspectAuthority,
  migrateAuthority, prepareCredentialDirectory, preflightCredentialTarget
} from "../src/hosted/authority-bootstrap.js";

const HELP = `Owner-only Pigboard authority setup. This does not start a service or select a Jira board.

Usage:
  npm run --silent owner:migrate -- --owner-url-file /absolute/private/owner.url [--format json|text]
  npm run --silent owner:bootstrap -- --owner-url-file /absolute/private/owner.url --name 'Name' [--format json|text]
  npm run --silent owner:recover -- --owner-url-file /absolute/private/owner.url --name 'Name' --expect-generation N [--format json|text]
  npm run --silent owner:inspect -- --owner-url-file /absolute/private/owner.url [--format json|text]

The URL file and its parent must be owner-only. The credential is saved once in
~/.config/pigboard/owner-credentials/ and is never printed. On an unknown result,
inspect before retrying; on an undelivered credential, inspect then recover.
The guide is docs/hosted-pigboard-authority.md.`;

function parse(args) {
  if ((args.length === 1 && args[0] === "--help") ||
      (args.length === 2 && args[1] === "--help" &&
        ["migrate", "bootstrap", "recover", "inspect"].includes(args[0]))) {
    return { help: true };
  }
  const command = args[0];
  if (!["migrate", "bootstrap", "recover", "inspect"].includes(command)) return null;
  const options = { command, format: "text" };
  const flags = new Map([["--owner-url-file", "ownerUrlFile"],
    ["--name", "name"], ["--expect-generation", "expectGeneration"],
    ["--format", "format"]]);
  const seen = new Set();
  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    if (!flags.has(flag) || seen.has(flag) || !value || value.startsWith("--")) return null;
    seen.add(flag);
    options[flags.get(flag)] = value;
  }
  if (!options.ownerUrlFile || !["text", "json"].includes(options.format)) return null;
  if (["bootstrap", "recover"].includes(command) !== Boolean(options.name)) return null;
  if (command === "recover") {
    if (!/^[1-9][0-9]*$/u.test(options.expectGeneration ?? "")) return null;
    options.expectGeneration = Number(options.expectGeneration);
    if (!Number.isSafeInteger(options.expectGeneration)) return null;
  } else if (options.expectGeneration !== undefined) return null;
  return options;
}

function publicResult(result) {
  if (!result || typeof result !== "object") return { status: "operation_unverified" };
  const { token: _secret, ...safe } = result;
  return safe;
}

function render(result, format) {
  if (format === "json") return JSON.stringify(result);
  const fields = ["status", "schemaVersion", "generation", "name", "principalId",
    "credentialFile", "nextAction"];
  const lines = fields.filter((field) => result[field] !== undefined)
    .map((field) => `${field}: ${result[field]}`);
  if (result.owner) {
    lines.push(`owner: ${result.owner.name} (${result.owner.principalId})`);
    lines.push(`ownerActive: ${result.owner.active}`);
  }
  return lines.join("\n");
}

function successful(status) {
  return ["applied", "already_current", "schema_current", "bootstrapped", "recovered"].includes(status);
}

export async function runOwnerCommand(args, { output = console.log,
  openConnection = connectOwner, home } = {}) {
  const options = parse(args);
  if (options?.help) {
    output(HELP);
    return 0;
  }
  if (!options) {
    output(JSON.stringify({ status: "invalid_usage", nextAction: "Use --help for owner-only commands." }));
    return 2;
  }
  let client;
  try {
    client = await openConnection(options.ownerUrlFile);
    let result;
    if (options.command === "migrate") result = await migrateAuthority(client);
    if (options.command === "inspect") result = await inspectAuthority(client);
    if (["bootstrap", "recover"].includes(options.command)) {
      const before = await inspectAuthority(client);
      if (before.status !== "schema_current") {
        result = before;
      } else if (options.command === "bootstrap" && before.owner) {
        result = { status: "owner_exists", generation: before.generation };
      } else {
        const prepared = prepareCredentialDirectory(home);
        preflightCredentialTarget(prepared, before.generation + 1);
        result = await changeOwner(client, {
          name: options.name,
          expectGeneration: options.command === "recover" ? options.expectGeneration : null
        });
        if (result.token) {
          try {
            const path = deliverCredential(prepared, result.generation, result.token);
            result = { ...publicResult(result), credentialFile: path };
          } catch {
            result = { status: "credential_undelivered", generation: result.generation,
              nextAction: "Inspect the current owner, then run guarded recovery; do not repeat bootstrap." };
          }
        }
      }
    }
    const safe = publicResult(result);
    if (["outcome_unknown", "schema_outcome_unknown"].includes(safe.status)) {
      safe.nextAction = "Inspect the current schema and owner before any explicit retry.";
    }
    output(render(safe, options.format));
    return successful(safe.status) ? 0 : 1;
  } catch (error) {
    const reason = error instanceof OwnerError || error instanceof AuthorityError ?
      error.reason : "operation_unverified";
    output(render({ status: reason }, options.format));
    return 1;
  } finally {
    if (client) try { await client.end(); } catch { /* No raw driver output. */ }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runOwnerCommand(process.argv.slice(2));
}
