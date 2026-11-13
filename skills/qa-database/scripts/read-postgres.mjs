import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isIP } from "node:net";

export class QaError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
const requireValue = (condition, code) => {
  if (!condition) throw new QaError(code);
};
const nonempty = (value) =>
  typeof value === "string" && value.trim().length > 0;

export function safeError(error) {
  const own = error instanceof QaError;
  const sqlCode =
    typeof error?.code === "string" && /^[0-9A-Z]{5}$/.test(error.code);
  return {
    status: "INCOMPLETE",
    error: own ? error.code : "DATABASE_OR_TOOL_ERROR",
    ...(sqlCode && !own ? { sqlState: error.code } : {}),
  };
}

export function armDeadline(ms = 20000) {
  return setTimeout(() => {
    process.stderr.write(
      JSON.stringify({
        status: "INCOMPLETE",
        error: "PROCESS_DEADLINE_EXCEEDED",
      }) + "\n",
    );
    process.exit(2);
  }, ms);
}

export function connectionConfig(context, rawUrl, tls = {}) {
  requireValue(
    context && ["dev", "qa", "test", "personal"].includes(context.environment),
    "LOWER_ENVIRONMENT_REQUIRED",
  );
  requireValue(
    nonempty(context.stage) &&
      !/(^|[-_])(prod|production)([-_]|$)/i.test(context.stage),
    "APPROVED_STAGE_REQUIRED",
  );
  requireValue(
    nonempty(context.targetIdentityEvidence) &&
      nonempty(context.readOnlyRoleEvidence),
    "VERIFIED_ACCESS_CONTEXT_REQUIRED",
  );
  requireValue(nonempty(rawUrl), "CONNECTION_ENV_MISSING");
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new QaError("INVALID_DATABASE_URL");
  }
  requireValue(
    ["postgres:", "postgresql:"].includes(url.protocol),
    "INVALID_DATABASE_PROTOCOL",
  );
  requireValue(!url.search && !url.hash, "DATABASE_URL_OPTIONS_FORBIDDEN");
  const db = context.database;
  let user, password, database;
  try {
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
    database = decodeURIComponent(url.pathname.slice(1));
  } catch {
    throw new QaError("INVALID_DATABASE_URL");
  }
  const host = url.hostname;
  const port = Number(url.port || 5432);
  requireValue(
    nonempty(user) &&
      nonempty(password) &&
      nonempty(database) &&
      nonempty(host),
    "EXPLICIT_DATABASE_CREDENTIALS_REQUIRED",
  );
  requireValue(
    db &&
      db.host === host &&
      db.port === port &&
      db.name === database &&
      db.user === user,
    "DATABASE_TARGET_MISMATCH",
  );
  // pg replaces a custom TLS name with host when host is a DNS name.
  requireValue(
    !tls.servername || tls.servername === host || isIP(host) !== 0,
    "TLS_SERVERNAME_OVERRIDE_REQUIRES_IP_HOST",
  );
  return {
    host,
    port,
    database,
    user,
    password,
    ssl: {
      rejectUnauthorized: true,
      ...(tls.ca ? { ca: tls.ca } : {}),
      ...(tls.servername ? { servername: tls.servername } : {}),
    },
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
    statement_timeout: 5000,
    lock_timeout: 2000,
    idle_in_transaction_session_timeout: 7000,
    options: "-c default_transaction_read_only=on",
    application_name: "qa-observer",
  };
}

export async function readDatabase(input, makeClient) {
  const config = connectionConfig(input.context, input.rawUrl, input.tls);
  requireValue(
    typeof input.sql === "string" && /^\s*(select|with)\b/i.test(input.sql),
    "SELECT_COMPATIBLE_QUERY_REQUIRED",
  );
  requireValue(Array.isArray(input.params ?? []), "PARAMETER_ARRAY_REQUIRED");
  const sql = input.sql.trim().replace(/;\s*$/, "");
  const client = makeClient(config);
  // Never forward asynchronous driver errors containing connection details.
  let asyncError;
  client.on?.("error", (error) => {
    asyncError = error;
  });
  let connected = false,
    result,
    failure;
  try {
    await client.connect();
    connected = true;
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '5s'");
    const role = await client.query(
      "SELECT current_user AS role, rolsuper, rolcreaterole, rolcreatedb, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = current_user",
    );
    requireValue(
      role.rows.length === 1 &&
        [
          "rolsuper",
          "rolcreaterole",
          "rolcreatedb",
          "rolreplication",
          "rolbypassrls",
        ].every((key) => role.rows[0][key] === false),
      "PRIVILEGED_OR_UNKNOWN_DATABASE_ROLE",
    );
    const observed = await client.query({
      name: "qa-observation",
      queryMode: "extended",
      text: `SELECT * FROM (\n${sql}\n) AS qa_observation LIMIT 201`,
      values: input.params ?? [],
    });
    result = {
      status: "OBSERVED",
      observedAt: new Date().toISOString(),
      environment: input.context.environment,
      stage: input.context.stage,
      role: role.rows[0].role,
      rows: observed.rows.slice(0, 200),
      rowCount: Math.min(observed.rows.length, 200),
      truncated: observed.rows.length > 200,
      limit: 200,
      method: "PostgreSQL read-only transaction; no product verdict",
    };
  } catch (error) {
    failure = error;
  } finally {
    if (connected) {
      try {
        await client.query("ROLLBACK");
      } catch (error) {
        failure ??= error;
      }
    }
    try {
      await client.end();
    } catch (error) {
      failure ??= error;
    }
  }
  if (failure || asyncError) throw failure ?? asyncError;
  return result;
}

async function main(args) {
  requireValue(
    [3, 4].includes(args.length),
    "USAGE_CONTEXT_CONNECTION_ENV_SQL_PARAMS",
  );
  const [contextFile, connectionEnv, sqlFile, paramsFile] = args;
  requireValue(
    /^[A-Za-z_][A-Za-z0-9_]*$/.test(connectionEnv),
    "CONNECTION_ENV_NAME_REQUIRED",
  );
  const input = {
    context: JSON.parse(readFileSync(contextFile, "utf8")),
    rawUrl: process.env[connectionEnv],
    sql: readFileSync(sqlFile, "utf8"),
    params: paramsFile ? JSON.parse(readFileSync(paramsFile, "utf8")) : [],
    tls: {
      ca: process.env.QA_DB_CA_FILE
        ? readFileSync(process.env.QA_DB_CA_FILE, "utf8")
        : undefined,
      servername: process.env.QA_DB_TLS_SERVERNAME || undefined,
    },
  };
  const { Client } = await import("pg");
  return readDatabase(input, (config) => new Client(config));
}

if (
  process.argv[1] &&
  realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])
) {
  const timer = armDeadline();
  try {
    process.stdout.write(
      JSON.stringify(await main(process.argv.slice(2)), null, 2) + "\n",
    );
  } catch (error) {
    process.stderr.write(JSON.stringify(safeError(error)) + "\n");
    process.exitCode = 2;
  } finally {
    clearTimeout(timer);
  }
}
