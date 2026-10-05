import { pathToFileURL } from "node:url";
import { connectOwner, OwnerError } from "../src/hosted/owner-root.js";
import { AuthorityError, enrollAgent, inspectAgent, prepareAgentCredential,
  revokeAgent } from "../src/hosted/authority-bootstrap.js";

const HELP = `Protected operator setup for one fixed pilot-agent. No public administration API.

Usage:
  npm run --silent agent:enroll -- --owner-url-file /absolute/private/owner.url [--credential-file /absolute/managed/agent-UUID.token] [--format text|json]
  npm run --silent agent:status -- --owner-url-file /absolute/private/owner.url [--credential-file /absolute/managed/agent-UUID.token | --principal-id UUID] [--format text|json]
  npm run --silent agent:revoke -- --owner-url-file /absolute/private/owner.url --principal-id UUID [--format text|json]

Install v3 while operators and private ingress are quiesced. Enrollment durably
saves one immutable mode-0600 token file under ~/.config/pigboard/agent-credentials/
before activation. The token and digest are never printed. Retry an unknown
result with status and the SAME credential file; never silently replace it.
A lost file requires status, explicit UUID revoke, then a new enrollment.
Database success does not prove private delivery, peer routing or peer removal.
Guide: docs/hosted-pigboard-authority.md`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const REASONS = Object.freeze({
  invalid_usage: "Use --help for the fixed agent commands and exact flags.",
  schema_absent: "Run the protected owner migration with ingress fenced, then inspect.",
  migration_required: "Quiesce old operators and fence private ingress, then install v3 and inspect.",
  schema_conflict: "Stop and inspect migration receipts, catalog and runtime grants under owner custody.",
  owner_invalid: "Inspect and repair the human owner under owner custody before agent changes.",
  authority_conflict: "Inspect contradictory agent authority under owner custody; do not issue a replacement.",
  agent_exists: "Inspect the existing pilot agent; revoke its exact UUID only if replacement is intended.",
  identity_conflict: "Check the exact UUID and original protected file; never reuse another identity or token.",
  credential_revoked: "This credential is permanently revoked; enroll a new UUID after checking current agent status.",
  generation_exhausted: "Stop and inspect the authority generation under owner custody.",
  unsafe_credential_directory: "Fix managed directory ownership, symlinks and modes before retrying.",
  unsafe_credential_file: "Inspect the original managed file and its ownership, symlinks and modes; never overwrite it.",
  credential_file_missing: "Inspect agent status, revoke the exact current UUID if the bearer is lost, then enroll anew.",
  invalid_credential_file: "Keep the corrupt file for custody inspection; inspect status and revoke before replacement.",
  outcome_unknown: "Run agent:status with the same managed file or exact revoke UUID before any explicit retry.",
  inspection_unverified: "Restore database access and inspect again; unknown is not proof of absence or revocation.",
  agent_change_failed: "Inspect with the original managed file or exact UUID before deciding whether to retry.",
  unsafe_owner_url_file: "Fix the private owner URL file and parent ownership, symlinks and modes.",
  invalid_owner_url_file: "Supply an absolute path to one protected owner URL file.",
  invalid_owner_url: "Correct the protected direct TLS owner URL without printing it.",
  owner_target_mismatch: "Check the private URL against the reviewed owner pin; never use a child, pooler or runtime role.",
  owner_pin_mismatch: "Stop and review the source-controlled owner and runtime pins.",
  owner_identity_mismatch: "Verify actual owner database, role and TLS identity before continuing.",
  owner_connection_unverified: "Restore pinned owner database access, then inspect current state before retrying."
});

function parse(args) {
  if (args.length === 1 && args[0] === "--help" ||
      args.length === 2 && ["enroll", "status", "revoke"].includes(args[0]) && args[1] === "--help") {
    return { help: true };
  }
  const command = args[0];
  if (!["enroll", "status", "revoke"].includes(command)) return null;
  const options = { command, format: "text" };
  const flags = new Map([["--owner-url-file", "ownerUrlFile"],
    ["--credential-file", "credentialFile"], ["--principal-id", "principalId"], ["--format", "format"]]);
  const seen = new Set();
  for (let index = 1; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flags.has(flag) || seen.has(flag) || !value || value.startsWith("--")) return null;
    seen.add(flag);
    options[flags.get(flag)] = value;
  }
  if (!options.ownerUrlFile || !["text", "json"].includes(options.format)) return null;
  if (options.principalId && !UUID.test(options.principalId)) return null;
  if (options.principalId) options.principalId = options.principalId.toLowerCase();
  if (command === "enroll" && options.principalId ||
      command === "revoke" && (!options.principalId || options.credentialFile) ||
      command === "status" && options.principalId && options.credentialFile) return null;
  return options;
}

function resultFor(command, status, reason, authority, local) {
  const unknown = status === "unknown";
  return { schemaVersion: 1, command, status, reason,
    authority, local,
    omissions: [...(command === "revoke" ? ["peer_removal_unverified"] :
      ["delivery_unverified", "peer_unverified"]), ...(unknown ? ["current_authority_unverified"] : [])],
    nextAction: reason ? REASONS[reason] : command === "enroll" ?
      "Privately retain this file, map a distinct peer and verify the agent's own caller:me; setup is not yet proved." :
      command === "revoke" && status === "absent" ?
        "This UUID is absent; inspect the current agent and exact peer mapping before taking another action." :
      command === "revoke" ? "Verify next-call denial, remove the exact mapped peer and recheck the owner." :
      status === "revoked" ? "Remove the exact mapped peer and verify the owner; use a new UUID for an intended replacement." :
      status === "absent" ? "No selected agent is present; reconcile any unknown file intent before enrolling anew." :
      "Verify private recipient custody, its distinct peer and its own caller:me; status alone does not prove setup." };
}

function render(result, format) {
  if (format === "json") return JSON.stringify(result);
  const lines = [`command: ${result.command}`, `status: ${result.status}`];
  if (result.reason) lines.push(`reason: ${result.reason}`);
  if (result.authority) {
    lines.push(`schemaVersion: ${result.authority.schemaVersion}`, `generation: ${result.authority.generation}`);
    if (result.authority.principal) lines.push(`principalId: ${result.authority.principal.id}`,
      `name: ${result.authority.principal.name}`, `kind: ${result.authority.principal.kind}`);
    lines.push(`credentialActiveCount: ${result.authority.credentialActiveCount}`,
      `grantActiveRoles: ${result.authority.grantActiveRoles.join(", ")}`);
    if (result.authority.credentialMatch !== null) lines.push(`credentialMatch: ${result.authority.credentialMatch}`);
  }
  lines.push(`local: ${result.local.status}`);
  if (result.local.credentialFile) lines.push(`credentialFile: ${result.local.credentialFile}`);
  lines.push(`omissions: ${result.omissions.join(", ")}`, `nextAction: ${result.nextAction}`);
  return lines.join("\n");
}

export async function runAgentCommand(args, { output = console.log, home,
  openConnection = connectOwner, prepareCredential = prepareAgentCredential } = {}) {
  const options = parse(args);
  if (options?.help) { output(HELP); return 0; }
  if (!options) {
    output(JSON.stringify(resultFor(["enroll", "status", "revoke"].includes(args[0]) ? args[0] :
      "status", "refused", "invalid_usage", null, { status: "not_requested", credentialFile: null })));
    return 2;
  }
  let client;
  let local = { status: "not_requested", credentialFile: null };
  try {
    // Validate the pinned owner connection before generating any new local intent.
    client = await openConnection(options.ownerUrlFile);
    let intent;
    if (options.command === "enroll" || options.credentialFile) {
      intent = prepareCredential({ home, credentialFile: options.credentialFile ?? null,
        durable: options.command === "enroll" });
      local = { status: intent.localStatus, credentialFile: intent.credentialFile };
    }
    const result = options.command === "enroll" ? await enrollAgent(client, intent) :
      options.command === "revoke" ? await revokeAgent(client, { principalId: options.principalId }) :
      await inspectAgent(client, { principalId: intent?.principalId ?? options.principalId ?? null,
        token: intent?.token ?? null });
    const safe = resultFor(options.command, result.status, result.reason, result.authority, local);
    output(render(safe, options.format));
    return ["enrolled", "already_active", "active", "revoked", "already_revoked"].includes(safe.status) ||
      options.command === "status" && safe.status === "absent" ? 0 : 1;
  } catch (error) {
    const candidate = error instanceof OwnerError || error instanceof AuthorityError ? error.reason :
      "inspection_unverified";
    const reason = Object.hasOwn(REASONS, candidate) ? candidate : "inspection_unverified";
    if (reason.includes("credential_")) local = { status: "unverified", credentialFile: null };
    output(render(resultFor(options.command, reason === "inspection_unverified" ||
      reason === "owner_connection_unverified" ? "unknown" : "refused", reason, null, local), options.format));
    return 1;
  } finally {
    if (client) try { await client.end(); } catch { /* Never emit raw driver output. */ }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runAgentCommand(process.argv.slice(2));
}
