import { constants, closeSync, fstatSync, fsyncSync, lstatSync, openSync,
  readFileSync, writeSync } from "node:fs";
import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";
import { dirname, isAbsolute } from "node:path";
import { OWNER_TARGET, checkOwnerPin, connectOwner } from "./owner-root.js";
import { ROOT_TARGET } from "./root-target.js";
import { runPreflight } from "./neon-preflight.js";

const NEXT_ACTION = Object.freeze({
  invalid_input: "Supply three absolute private file paths; see --help.",
  unsafe_private_file: "Fix the Neon key file and its parent ownership, type or modes before retrying.",
  unsafe_passfile_target: "Use a new file path in an existing owner-controlled mode-0700 directory.",
  passfile_exists: "Inspect the existing private file and pinned role; never overwrite it.",
  wrong_target: "Review the source-controlled Pigboard owner and runtime pins; do not override the target.",
  endpoint_unverified: "Restore Neon API access and confirm the pinned endpoint maps to the production branch before retrying.",
  owner_unverified: "Check the private owner URL, Neon access and verified TLS before retrying.",
  broad_defaults: "Remove broad PUBLIC database or schema CREATE rights under owner custody before retrying.",
  role_exists: "Inspect the existing pinned role and its credential; this command never replaces it.",
  precommit_failed: "Confirm the role is absent on the pinned branch. If this command left an orphan file, inspect its private metadata and remove only that file before an explicit retry.",
  outcome_unknown: "Do not rerun. Recheck endpoint mapping, then inspect the pinned role and saved file; run neon:preflight if both exist.",
  created_unverified: "Keep the saved file. Inspect the pinned role and run neon:preflight; do not recreate or rotate it automatically."
});

function report(status, checks = [], extras = {}) {
  const allChecks = [...checks, ...(extras.preflightChecks ?? [])];
  return { schemaVersion: 1, status, checks,
    omissions: allChecks.filter((check) => check.status === "unverified").map((check) => check.id),
    ...(NEXT_ACTION[status] ? { nextAction: NEXT_ACTION[status] } : {}), ...extras };
}

function privateFile(path) {
  if (!isAbsolute(path)) throw new Error("unsafe_private_file");
  let fd;
  try {
    const parent = lstatSync(dirname(path));
    const before = lstatSync(path);
    if (!parent.isDirectory() || parent.uid !== process.getuid() ||
      (parent.mode & 0o777) !== 0o700 || !before.isFile() ||
      before.uid !== process.getuid() || (before.mode & 0o777) !== 0o600) {
      throw new Error("unsafe_private_file");
    }
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.uid !== process.getuid() ||
      (opened.mode & 0o777) !== 0o600 || opened.dev !== before.dev ||
      opened.ino !== before.ino || opened.size > 4096) {
      throw new Error("unsafe_private_file");
    }
    const value = readFileSync(fd, "utf8").replace(/\r?\n$/, "");
    if (!value || /[\s\r\n]/u.test(value) || value.includes("://")) {
      throw new Error("unsafe_private_file");
    }
    return value;
  } catch {
    throw new Error("unsafe_private_file");
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function passfileParent(path) {
  if (!isAbsolute(path)) throw new Error("unsafe_passfile_target");
  let parent;
  try {
    parent = lstatSync(dirname(path));
    if (!parent.isDirectory() || parent.uid !== process.getuid() ||
      (parent.mode & 0o777) !== 0o700) throw new Error("unsafe_passfile_target");
    try {
      lstatSync(path);
      throw new Error("passfile_exists");
    } catch (error) {
      if (error?.message === "passfile_exists") throw error;
      if (error?.code !== "ENOENT") throw new Error("unsafe_passfile_target");
    }
  } catch (error) {
    if (["passfile_exists", "unsafe_passfile_target"].includes(error?.message)) throw error;
    throw new Error("unsafe_passfile_target");
  }
  return { dev: parent.dev, ino: parent.ino };
}

function escapePassfile(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll(":", "\\:");
}

function writePassfile(path, password, target, parentIdentity, closeFile = closeSync) {
  let fd;
  let directoryFd;
  let created = false;
  let failure;
  try {
    const line = [target.host, target.port, target.database, target.role, password]
      .map(escapePassfile).join(":") + "\n";
    fd = openSync(path, constants.O_WRONLY | constants.O_CREAT |
      constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    created = true;
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.uid !== process.getuid() ||
      (stat.mode & 0o777) !== 0o600) throw new Error("passfile_write_failed");
    const bytes = Buffer.from(line, "utf8");
    try {
      let offset = 0;
      while (offset < bytes.length) offset += writeSync(fd, bytes, offset, bytes.length - offset);
      fsyncSync(fd);
    } finally { bytes.fill(0); }
    directoryFd = openSync(dirname(path), constants.O_RDONLY |
      constants.O_DIRECTORY | constants.O_NOFOLLOW);
    const parent = fstatSync(directoryFd);
    if (!parent.isDirectory() || parent.uid !== process.getuid() ||
      (parent.mode & 0o777) !== 0o700 || parent.dev !== parentIdentity.dev ||
      parent.ino !== parentIdentity.ino) throw new Error("passfile_write_failed");
    fsyncSync(directoryFd);
  } catch (error) {
    failure = new Error(error?.code === "EEXIST" ?
      "passfile_exists" : "passfile_write_failed");
    failure.fileCreated = created;
  } finally {
    for (const descriptor of [directoryFd, fd]) {
      if (descriptor === undefined) continue;
      try { closeFile(descriptor); }
      catch {
        if (!failure) {
          failure = new Error("passfile_write_failed");
          failure.fileCreated = created;
        }
      }
    }
  }
  if (failure) throw failure;
}

export function scramVerifier(password, salt = randomBytes(16)) {
  const salted = pbkdf2Sync(password, salt, 4096, 32, "sha256");
  const clientKey = createHmac("sha256", salted).update("Client Key").digest();
  const storedKey = createHash("sha256").update(clientKey).digest();
  const serverKey = createHmac("sha256", salted).update("Server Key").digest();
  const value = `SCRAM-SHA-256$4096:${salt.toString("base64")}$` +
    `${storedKey.toString("base64")}:${serverKey.toString("base64")}`;
  salted.fill(0); clientKey.fill(0);
  return value;
}

function duplicateJsonKeys(raw) {
  const stack = [];
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === "{" || char === "[") {
      stack.push(char === "{" ? { keys: new Set(), expectsKey: true } : null);
    } else if (char === "}" || char === "]") {
      stack.pop();
    } else if (char === "," && stack.at(-1)) {
      stack.at(-1).expectsKey = true;
    } else if (char === '"') {
      const start = index;
      index += 1;
      while (index < raw.length) {
        if (raw[index] === "\\") index += 2;
        else if (raw[index] === '"') break;
        else index += 1;
      }
      const frame = stack.at(-1);
      if (frame?.expectsKey) {
        const key = JSON.parse(raw.slice(start, index + 1));
        if (frame.keys.has(key)) return true;
        frame.keys.add(key);
        frame.expectsKey = false;
      }
    }
  }
  return false;
}

export async function checkEndpoint(key, target = OWNER_TARGET, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`https://console.neon.tech/api/v2/projects/${
      encodeURIComponent(target.projectId)}/endpoints/${encodeURIComponent(target.endpointId)}`, {
      method: "GET", redirect: "error", cache: "no-store",
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) return false;
    const raw = await response.text();
    if (raw.length > 64 * 1024) return false;
    const payload = JSON.parse(raw);
    if (duplicateJsonKeys(raw)) return false;
    const endpoint = payload?.endpoint;
    return endpoint?.project_id === target.projectId &&
      endpoint?.branch_id === target.branchId && endpoint?.id === target.endpointId &&
      endpoint?.host === target.host && endpoint?.type === "read_write";
  } catch {
    return false;
  }
}

const DEFAULT_RIGHTS_SQL = `SELECT
  EXISTS (SELECT 1 FROM pg_database d,
    LATERAL aclexplode(COALESCE(d.datacl, acldefault('d', d.datdba))) a
    WHERE d.datname = current_database() AND a.grantee = 0 AND a.privilege_type = 'CREATE') AS db_create,
  EXISTS (SELECT 1 FROM pg_namespace n,
    LATERAL aclexplode(COALESCE(n.nspacl, acldefault('n', n.nspowner))) a
    WHERE left(n.nspname, 3) <> 'pg_' AND n.nspname <> 'information_schema'
      AND a.grantee = 0 AND a.privilege_type = 'CREATE') AS schema_create`;

const ROLE_RIGHTS_SQL = `SELECT
  r.rolcanlogin AS login, r.rolsuper AS superuser, r.rolcreatedb AS createdb,
  r.rolcreaterole AS createrole, r.rolreplication AS replication,
  r.rolbypassrls AS bypassrls,
  EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member = r.oid) AS member,
  has_database_privilege(r.oid, current_database(), 'CONNECT') AS db_connect,
  has_database_privilege(r.oid, current_database(), 'CREATE') AS db_create,
  (SELECT COALESCE(bool_and(NOT has_schema_privilege(r.oid, n.oid, 'CREATE')), false)
    FROM pg_namespace n WHERE left(n.nspname, 3) <> 'pg_'
      AND n.nspname <> 'information_schema') AS no_schema_create,
  has_schema_privilege(r.oid, 'public', 'USAGE') AS public_usage
  FROM pg_roles r WHERE r.rolname = $1`;

function restricted(row) {
  return row?.login === true && row?.db_connect === true &&
    row?.no_schema_create === true && row?.public_usage === true &&
    ["superuser", "createdb", "createrole", "replication", "bypassrls",
      "member", "db_create"].every((field) => row[field] === false);
}

function preflightAcceptable(value) {
  const checks = value?.checks;
  const required = ["root_target", "passfile", "connection", "identity", "tls",
    "role_attributes", "role_membership", "database_privileges", "schema_privileges",
    "fixture_grants"];
  return Array.isArray(checks) && checks.length === required.length &&
    new Set(checks.map((check) => check.id)).size === required.length &&
    required.every((id) => checks.some((check) => check.id === id)) &&
    checks.every((check) => check.id === "fixture_grants" ?
      (check.status === "pass" ||
        (check.status === "unverified" && check.reason === "fixture_missing")) :
      check.status === "pass");
}

function safePreflightChecks(value) {
  const checks = value?.checks;
  if (!Array.isArray(checks) || checks.length === 0) return [{ id: "saved_passfile_login",
    status: "unverified", reason: "preflight_unavailable" }];
  return checks.map((check) => ({
    id: typeof check?.id === "string" && /^[a-z][a-z0-9_]{0,63}$/u.test(check.id) ?
      check.id : "unknown_check",
    status: ["pass", "fail", "unverified"].includes(check?.status) ?
      check.status : "unverified",
    reason: typeof check?.reason === "string" &&
      /^[a-z][a-z0-9_]{0,63}$/u.test(check.reason) ? check.reason : "reason_unavailable"
  }));
}

export async function setupRuntimeLogin({ ownerUrlFile, neonKeyFile, passfile }, deps = {}) {
  const target = deps.target ?? OWNER_TARGET;
  const runtime = deps.runtime ?? ROOT_TARGET;
  const checks = [];
  let client;
  let inTransaction = false;
  let commitAttempted = false;
  let committed = false;
  let fileCreated = false;
  try {
    if (![ownerUrlFile, neonKeyFile, passfile].every((value) =>
      typeof value === "string" && isAbsolute(value))) return report("invalid_input");
    try { checkOwnerPin(target, runtime); } catch { return report("wrong_target"); }
    let parent;
    try { parent = passfileParent(passfile); }
    catch (error) { return report(error?.message === "passfile_exists" ?
      "passfile_exists" : "unsafe_passfile_target"); }
    let key;
    try { key = (deps.readKey ?? privateFile)(neonKeyFile); }
    catch { return report("unsafe_private_file"); }
    try {
      const ownerStat = lstatSync(ownerUrlFile);
      const keyStat = lstatSync(neonKeyFile);
      if (ownerStat.dev === keyStat.dev && ownerStat.ino === keyStat.ino) {
        return report("invalid_input");
      }
    } catch {
      if (!deps.readKey) return report("owner_unverified");
    }
    try { client = await (deps.openOwner ?? connectOwner)(ownerUrlFile); }
    catch { return report("owner_unverified"); }
    const endpoint = deps.endpointCheck ?? checkEndpoint;
    if (!await endpoint(key, target, deps.fetchImpl)) return report("endpoint_unverified");
    checks.push({ id: "endpoint_before", status: "pass" });
    const defaults = (await client.query(DEFAULT_RIGHTS_SQL)).rows?.[0];
    if (!defaults || defaults.db_create !== false ||
        defaults.schema_create !== false) return report("broad_defaults", checks);
    checks.push({ id: "public_defaults", status: "pass" });
    await client.query("BEGIN");
    inTransaction = true;
    const existing = (await client.query("SELECT to_regrole($1) IS NOT NULL AS exists", [runtime.role]))
      .rows?.[0]?.exists;
    if (existing !== false) {
      await client.query("ROLLBACK"); inTransaction = false;
      return report(existing === true ? "role_exists" : "precommit_failed", checks);
    }
    const password = randomBytes(48).toString("base64url");
    const verifier = scramVerifier(password);
    // Verifier grammar is fixed from base64-encoded random bytes, not caller text.
    if (!/^SCRAM-SHA-256\$4096:[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/u.test(verifier)) {
      throw new Error("invalid_verifier");
    }
    await client.query(`CREATE ROLE pigboard_app WITH LOGIN NOSUPERUSER NOCREATEDB ` +
      `NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${verifier}'`);
    const rights = (await client.query(ROLE_RIGHTS_SQL, [runtime.role])).rows?.[0];
    if (!restricted(rights)) throw new Error("role_rights_unverified");
    checks.push({ id: "role_rights", status: "pass" });
    try {
      (deps.writePassfile ?? writePassfile)(passfile, password, runtime, parent,
        deps.closePassfileDescriptor);
      fileCreated = true;
    } catch (error) {
      fileCreated = error?.fileCreated === true;
      throw error;
    }
    checks.push({ id: "passfile_durable", status: "pass" });
    commitAttempted = true;
    await client.query("COMMIT");
    inTransaction = false;
    committed = true;
    checks.push({ id: "commit", status: "pass" });
    let preflight;
    try { preflight = await (deps.preflight ?? runPreflight)({ passfile }); }
    catch { return report("created_unverified", checks, { fileCreated,
      preflightChecks: safePreflightChecks() }); }
    if (!preflightAcceptable(preflight)) return report("created_unverified", checks,
      { fileCreated, preflightChecks: safePreflightChecks(preflight) });
    checks.push({ id: "saved_passfile_login", status: "pass" });
    if (!await endpoint(key, target, deps.fetchImpl)) return report("outcome_unknown", checks,
      { fileCreated });
    checks.push({ id: "endpoint_after", status: "pass" });
    return report("created_verified", checks, { fileCreated,
      omissions: preflight.omissions.filter((id) => id === "fixture_grants") });
  } catch (error) {
    if (committed) return report("created_unverified", checks, { fileCreated,
      preflightChecks: safePreflightChecks() });
    if (commitAttempted) return report("outcome_unknown", checks, { fileCreated });
    if (inTransaction) try { await client.query("ROLLBACK"); } catch { /* Closing aborts the transaction. */ }
    return report(error?.message === "passfile_exists" ? "passfile_exists" :
      "precommit_failed", checks, { fileCreated });
  } finally {
    if (client) try { await client.end(); } catch { /* No raw driver output. */ }
  }
}
