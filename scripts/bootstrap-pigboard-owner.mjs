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
Create the restricted pigboard_app role before migrating; migration v2 gives it
only the columns needed for private self-inspection.
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

const NEXT_ACTION = Object.freeze({
  schema_absent: "Run the protected owner migration, then inspect before bootstrap.",
  migration_required: "Run the protected owner migration to install the next schema version before bootstrap or service inspection.",
  runtime_role_missing: "Create the restricted pigboard_app login under owner custody, then rerun the protected migration.",
  schema_conflict: "Stop; inspect the migration receipt and managed schema under owner custody before any repair.",
  inspection_unverified: "Check database availability and inspect again; do not assume a prior operation failed.",
  schema_outcome_unknown: "Inspect the current schema and owner before any explicit migration retry.",
  outcome_unknown: "Inspect the current schema and owner before any explicit retry or recovery.",
  owner_exists: "Inspect the current owner; if its credential is lost, use guarded recovery instead of bootstrap.",
  owner_missing_needs_repair: "Stop and investigate the authority record under infrastructure custody; do not bootstrap again.",
  stale_generation: "Inspect the current generation and owner before deciding whether guarded recovery is still needed.",
  credential_undelivered: "Inspect the current owner, then run guarded recovery; do not repeat bootstrap.",
  credential_file_exists: "Inspect the generation and existing private file; never overwrite it. Use guarded recovery if the credential is lost.",
  unsafe_credential_directory: "Fix local ownership, symlinks or modes, then inspect before attempting a change.",
  unsafe_owner_url_file: "Fix the private URL file and its parent ownership, symlinks or modes before retrying.",
  invalid_owner_url_file: "Supply an absolute path to one protected owner URL file.",
  invalid_owner_url: "Correct the protected URL file without printing its contents; use a direct TLS Postgres URL.",
  owner_target_mismatch: "Compare the private URL target with the reviewed owner pin; do not use a child, pooler or runtime role.",
  owner_pin_mismatch: "Stop and review the source-controlled owner and runtime pins before connecting.",
  owner_identity_mismatch: "Stop and verify the actual owner database, role and TLS identity before any mutation.",
  owner_connection_unverified: "Check Neon availability, owner login and TLS; inspect after restoring the connection.",
  invalid_owner_name: "Use a nonempty single-line owner name of at most 120 characters.",
  invalid_expected_generation: "Use the positive generation returned by a fresh inspection.",
  owner_change_failed: "Inspect current owner state before deciding whether any explicit retry is safe."
});

function withNextAction(result) {
  return NEXT_ACTION[result.status] && !result.nextAction ?
    { ...result, nextAction: NEXT_ACTION[result.status] } : result;
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
  return ["applied", "upgraded", "already_current", "schema_current", "bootstrapped", "recovered"].includes(status);
}

export async function runOwnerCommand(args, { output = console.log,
  openConnection = connectOwner, prepareDirectory = prepareCredentialDirectory, home } = {}) {
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
        const prepared = prepareDirectory(home);
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
    const safe = withNextAction(publicResult(result));
    output(render(safe, options.format));
    return successful(safe.status) ? 0 : 1;
  } catch (error) {
    const reason = error instanceof OwnerError || error instanceof AuthorityError ?
      error.reason : "operation_unverified";
    output(render(withNextAction({ status: reason }), options.format));
    return 1;
  } finally {
    if (client) try { await client.end(); } catch { /* No raw driver output. */ }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runOwnerCommand(process.argv.slice(2));
}
