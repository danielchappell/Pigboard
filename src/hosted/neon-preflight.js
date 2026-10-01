import { spawn } from "node:child_process";
import { lstatSync } from "node:fs";
import { isAbsolute } from "node:path";
import { ROOT_TARGET, checkRootTarget, publicTarget } from "./root-target.js";

const MAX_OUTPUT_BYTES = 64 * 1024;
const PROCESS_TIMEOUT_MS = 15_000;
const OMITTED_AFTER_PRECHECK = [
  "connection", "identity", "tls", "role_attributes", "role_membership",
  "database_privileges", "schema_privileges", "fixture_grants"
];

export const DIAGNOSTIC_SQL = `
SELECT json_build_object(
  'user', current_user,
  'database', current_database(),
  'role', (SELECT json_build_object(
      'login', rolcanlogin, 'superuser', rolsuper, 'createdb', rolcreatedb,
      'createrole', rolcreaterole, 'replication', rolreplication,
      'bypassrls', rolbypassrls)
    FROM pg_roles WHERE rolname = current_user),
  'otherRoleMembership', (SELECT COALESCE(bool_or(pg_has_role(
      (SELECT oid FROM pg_roles WHERE rolname = current_user), r.oid, 'MEMBER'
    )), false) FROM pg_roles r WHERE r.rolname <> current_user),
  'dbConnect', has_database_privilege(current_user, current_database(), 'CONNECT'),
  'dbCreate', has_database_privilege(current_user, current_database(), 'CREATE'),
  'schemas', (SELECT COALESCE(json_agg(json_build_object(
      'name', n.nspname,
      'usage', has_schema_privilege(current_user, n.oid, 'USAGE'),
      'create', has_schema_privilege(current_user, n.oid, 'CREATE')
    ) ORDER BY n.nspname), '[]'::json)
    FROM pg_namespace n
    WHERE left(n.nspname, 3) <> 'pg_' AND n.nspname <> 'information_schema'),
  'fixtureExists', to_regclass('public.pigboard_runtime_role_probe') IS NOT NULL,
  'fixture', (SELECT CASE WHEN to_regclass('public.pigboard_runtime_role_probe') IS NULL
    THEN NULL ELSE json_build_object(
      'select', has_table_privilege(current_user, to_regclass('public.pigboard_runtime_role_probe')::oid, 'SELECT'),
      'insert', has_table_privilege(current_user, to_regclass('public.pigboard_runtime_role_probe')::oid, 'INSERT'),
      'update', has_table_privilege(current_user, to_regclass('public.pigboard_runtime_role_probe')::oid, 'UPDATE'),
      'updateAnyColumn', has_any_column_privilege(current_user, to_regclass('public.pigboard_runtime_role_probe')::oid, 'UPDATE'),
      'delete', has_table_privilege(current_user, to_regclass('public.pigboard_runtime_role_probe')::oid, 'DELETE'),
      'truncate', has_table_privilege(current_user, to_regclass('public.pigboard_runtime_role_probe')::oid, 'TRUNCATE'),
      'references', has_table_privilege(current_user, to_regclass('public.pigboard_runtime_role_probe')::oid, 'REFERENCES'),
      'referencesAnyColumn', has_any_column_privilege(current_user, to_regclass('public.pigboard_runtime_role_probe')::oid, 'REFERENCES'),
      'trigger', has_table_privilege(current_user, to_regclass('public.pigboard_runtime_role_probe')::oid, 'TRIGGER'),
      'maintain', has_table_privilege(current_user, to_regclass('public.pigboard_runtime_role_probe')::oid, 'MAINTAIN')
    ) END)
)::text;
`;

function check(id, status, reason, message) {
  return { id, status, reason, message };
}

function safeRequestedHost(host) {
  return typeof host === "string" && /^[A-Za-z0-9.-]{1,253}$/.test(host) ? host : null;
}

function result(checks, requestedHost = ROOT_TARGET.host) {
  const status = checks.some((item) => item.status === "fail") ? "fail" :
    checks.some((item) => item.status === "unverified") ? "unverified" : "pass";
  return {
    schemaVersion: 1,
    status,
    target: publicTarget(),
    requestedHost: safeRequestedHost(requestedHost),
    checks,
    omissions: checks.filter((item) => item.status === "unverified").map((item) => item.id)
  };
}

function incomplete(checks, reason, requestedHost) {
  return result([...checks, ...OMITTED_AFTER_PRECHECK.map((id) =>
    check(id, "unverified", reason, "This check was not completed."))], requestedHost);
}

export function checkPassfile(path, options = {}) {
  const stat = options.lstat ?? lstatSync;
  const uid = options.uid ?? process.getuid?.();
  if (!path || !isAbsolute(path) || uid === undefined) {
    return check("passfile", "fail", "invalid_passfile", "Supply an absolute private password-file path.");
  }
  let metadata;
  try {
    metadata = stat(path);
  } catch {
    return check("passfile", "fail", "passfile_unavailable", "The private password file is unavailable.");
  }
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.uid !== uid ||
    (metadata.mode & 0o400) === 0 || (metadata.mode & 0o177) !== 0) {
    return check("passfile", "fail", "passfile_not_private", "The password file must be a regular nonsymlink file owned by this user with mode 0600 or stricter.");
  }
  return check("passfile", "pass", "private_file_metadata", "The password file has the required type, owner and mode. Its contents were not read.");
}

export function buildPsqlInvocation(passfile, options = {}) {
  const { host, port, database, role } = ROOT_TARGET;
  return {
    executable: options.psqlBinary ?? "psql",
    args: ["-X", "-w", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-h", host,
      "-p", String(port), "-d", database, "-U", role, "-c", DIAGNOSTIC_SQL],
    options: {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        PATH: options.pathEnv ?? process.env.PATH ?? "",
        LANG: "C",
        PGPASSFILE: passfile,
        PGSSLMODE: "verify-full",
        PGSSLROOTCERT: "system",
        PGGSSENCMODE: "disable",
        PGCONNECT_TIMEOUT: "10"
      }
    }
  };
}

function runPsql(invocation, spawnCommand = spawn, timeoutMs = PROCESS_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawnCommand(invocation.executable, invocation.args, invocation.options);
    } catch {
      resolve({ ok: false, reason: "client_unavailable" });
      return;
    }
    let settled = false;
    let output = "";
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ ok: false, reason: "client_timeout" });
    }, timeoutMs);
    child.stdout?.on("data", (chunk) => {
      output += chunk.toString("utf8");
      if (Buffer.byteLength(output) > MAX_OUTPUT_BYTES) {
        child.kill();
        finish({ ok: false, reason: "client_output_too_large" });
      }
    });
    child.stderr?.resume();
    child.on("error", () => finish({ ok: false, reason: "client_unavailable" }));
    child.on("close", (code, signal) => {
      if (code !== 0 || signal) finish({ ok: false, reason: "connection_failed" });
      else finish({ ok: true, output });
    });
  });
}

export function evaluateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return OMITTED_AFTER_PRECHECK.slice(1).map((id) => check(id, "unverified", "invalid_report", "The database report was incomplete."));
  }
  const checks = [];
  checks.push(snapshot.user === ROOT_TARGET.role && snapshot.database === ROOT_TARGET.database ?
    check("identity", "pass", "pinned_identity", "The session uses the pinned database and role.") :
    check("identity", "fail", "identity_mismatch", "The session database or role differs from the pin."));
  checks.push(check("tls", "unverified", "client_tls_unverified",
    "A database snapshot cannot establish the client's TLS transport."));
  const role = snapshot.role;
  const expectedRole = { login: true, superuser: false, createdb: false,
    createrole: false, replication: false, bypassrls: false };
  checks.push(role && Object.entries(expectedRole).every(([key, value]) => role[key] === value) ?
    check("role_attributes", "pass", "restricted_role", "The runtime role has the required restricted attributes.") :
    role && Object.keys(expectedRole).every((key) => typeof role[key] === "boolean") ?
      check("role_attributes", "fail", "broad_role", "The runtime role has unexpected login or administrative attributes.") :
      check("role_attributes", "unverified", "role_unavailable", "The role attributes could not be established."));
  checks.push(snapshot.otherRoleMembership === false ?
    check("role_membership", "pass", "no_other_role_membership", "The runtime login has no membership in another database role.") :
    snapshot.otherRoleMembership === true ?
      check("role_membership", "fail", "other_role_membership", "The runtime login belongs to another database role and may gain additional powers.") :
      check("role_membership", "unverified", "membership_unavailable", "Database role memberships could not be established."));
  const db = snapshot.dbConnect === true && snapshot.dbCreate === false;
  checks.push(db ? check("database_privileges", "pass", "database_grants_restricted", "Database CONNECT is allowed and effective CREATE is denied.") :
    typeof snapshot.dbConnect === "boolean" && typeof snapshot.dbCreate === "boolean" ?
      check("database_privileges", "fail", "database_grants_broad", "Database CONNECT is missing or effective CREATE is allowed.") :
      check("database_privileges", "unverified", "database_grants_unavailable", "Database privileges could not be established."));
  const schemas = snapshot.schemas;
  const publicSchema = Array.isArray(schemas) && schemas.find((schema) => schema?.name === "public");
  checks.push(Array.isArray(schemas) && publicSchema && schemas.every((schema) =>
    typeof schema?.create === "boolean" && schema.create === false) && publicSchema.usage === true ?
    check("schema_privileges", "pass", "schema_grants_restricted", "Public USAGE is allowed and effective CREATE is denied on every non-system schema.") :
    Array.isArray(schemas) && publicSchema && schemas.every((schema) => typeof schema?.create === "boolean") &&
      typeof publicSchema.usage === "boolean" ?
      check("schema_privileges", "fail", "schema_grants_broad", "Public USAGE is missing or effective schema CREATE is allowed.") :
      check("schema_privileges", "unverified", "schema_grants_unavailable", "Schema privileges could not be established."));
  const fixture = snapshot.fixture;
  const fixtureDenied = ["update", "updateAnyColumn", "delete", "truncate",
    "references", "referencesAnyColumn", "trigger", "maintain"];
  checks.push(snapshot.fixtureExists === true && fixture?.select === true && fixture?.insert === true &&
    fixtureDenied.every((key) => fixture?.[key] === false) ?
    check("fixture_grants", "pass", "fixture_grants_restricted", "The disposable fixture allows only SELECT/INSERT.") :
    snapshot.fixtureExists === false ? check("fixture_grants", "unverified", "fixture_missing", "The owner-created disposable fixture is missing.") :
      snapshot.fixtureExists === true && fixture && ["select", "insert", ...fixtureDenied].every((key) =>
        typeof fixture[key] === "boolean") ?
        check("fixture_grants", "fail", "fixture_grants_broad", "The disposable fixture grants differ from the restricted policy.") :
        check("fixture_grants", "unverified", "fixture_grants_unavailable", "Fixture grants could not be established."));
  return checks;
}

export async function runPreflight({ targetHost = ROOT_TARGET.host, passfile, spawnCommand,
  lstat, uid, psqlBinary, pathEnv, timeoutMs } = {}) {
  const checks = [];
  checks.push(checkRootTarget({ host: targetHost, port: ROOT_TARGET.port,
    database: ROOT_TARGET.database, role: ROOT_TARGET.role }));
  if (checks[0].status !== "pass") {
    checks.push(check("passfile", "unverified", "target_refused", "No password file was inspected."));
    return incomplete(checks, "target_refused", targetHost);
  }
  checks.push(checkPassfile(passfile, { lstat, uid }));
  if (checks[1].status !== "pass") return incomplete(checks, "passfile_refused", targetHost);
  const invocation = buildPsqlInvocation(passfile, { psqlBinary, pathEnv });
  const response = await runPsql(invocation, spawnCommand, timeoutMs);
  if (!response.ok) {
    checks.push(check("connection", "fail", response.reason, "The pinned database connection did not complete."));
    return result([...checks, ...OMITTED_AFTER_PRECHECK.slice(1).map((id) =>
      check(id, "unverified", response.reason, "This check was not completed."))], targetHost);
  }
  let snapshot;
  try {
    snapshot = JSON.parse(response.output.trim());
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      throw new Error("invalid_report");
    }
  } catch {
    checks.push(check("connection", "unverified", "invalid_report", "The database returned an unreadable diagnostic report."));
    return result([...checks, ...OMITTED_AFTER_PRECHECK.slice(1).map((id) =>
      check(id, "unverified", "invalid_report", "This check was not completed."))], targetHost);
  }
  checks.push(check("connection", "pass", "query_completed", "The pinned database diagnostic query completed."));
  // A successful query under the fixed clean libpq verify-full policy proves
  // this client's transport. SQL backend statistics cannot provide that proof.
  const evaluated = evaluateSnapshot(snapshot).map((item) => item.id === "tls" ?
    check("tls", "pass", "verified_tls_session",
      "The client completed its query with mandatory certificate and hostname verification.") : item);
  return result([...checks, ...evaluated], targetHost);
}

export function formatPreflightText(report) {
  const heading = report.status === "pass" ? "PASS" : report.status === "fail" ? "FAIL" : "UNVERIFIED";
  return [
    `Pigboard Neon root preflight: ${heading}`,
    `Expected root: ${report.target.host}:${report.target.port}/${report.target.database} as ${report.target.role}`,
    `Requested host: ${report.requestedHost ?? "not available"}`,
    ...report.checks.map((item) => `${item.status.toUpperCase()} ${item.id}: ${item.message}`),
    `Omissions: ${report.omissions.length ? report.omissions.join(", ") : "none"}`,
    report.status === "pass" ? "This diagnostic passed; it does not prove Fly deployment or S02a readiness." :
      "Do not treat this login as deployment-ready. Repair the named failure and rerun."
  ].join("\n");
}
