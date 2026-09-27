import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, closeSync, existsSync, mkdtempSync, readFileSync, rmSync,
  writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import pg from "pg";
import { checkEndpoint, scramVerifier, setupRuntimeLogin
} from "../src/hosted/runtime-login-setup.js";
import { runRuntimeLoginCommand } from "../scripts/setup-pigboard-runtime-login.mjs";

function target(port = 5432) {
  const common = { projectId: "local-test", branchId: "local-branch",
    endpointId: "local-endpoint", host: "127.0.0.1", port, database: "pigboard" };
  return { owner: { ...common, role: "pigboard_owner" },
    runtime: { ...common, role: "pigboard_app" } };
}

function passChecks() {
  const ids = ["root_target", "passfile", "connection", "identity", "tls",
    "role_attributes", "role_membership", "database_privileges", "schema_privileges"];
  return { checks: [...ids.map((id) => ({ id, status: "pass" })),
    { id: "fixture_grants", status: "unverified", reason: "fixture_missing" }],
  omissions: ["fixture_grants"] };
}

const restrictedRights = { login: true, superuser: false, createdb: false,
  createrole: false, replication: false, bypassrls: false, member: false,
  db_connect: true, db_create: false, no_schema_create: true, public_usage: true };

function ownerStub({ existing = false, failAt, defaults =
  { db_create: false, schema_create: false } } = {}) {
  const queries = [];
  const client = {
    async query(sql) {
      queries.push(sql);
      if (sql === failAt) throw new Error("private driver material");
      if (sql.includes("aclexplode")) return { rows: [defaults] };
      if (sql.includes("to_regrole")) return { rows: [{ exists: existing }] };
      if (sql.includes("FROM pg_roles r")) return { rows: [restrictedRights] };
      return { rows: [] };
    },
    async end() {}
  };
  return { client, queries };
}

function setupOptions(directory, overrides = {}) {
  const { owner, runtime } = target();
  const { client, queries } = ownerStub(overrides);
  return { args: { ownerUrlFile: join(directory, "owner.url"),
    neonKeyFile: join(directory, "neon.key"), passfile: join(directory, "app.pgpass") },
  deps: { target: owner, runtime, readKey: () => "key",
    openOwner: async () => client, endpointCheck: async () => true,
    preflight: async () => passChecks() }, queries };
}

test("the endpoint check pins project, branch, endpoint, host and read-write type", async () => {
  const { owner } = target();
  const endpoint = { project_id: owner.projectId, branch_id: owner.branchId,
    id: owner.endpointId, host: owner.host, type: "read_write" };
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return { ok: true, text: async () => JSON.stringify({ endpoint }) };
  };
  assert.equal(await checkEndpoint("private-test-key", owner, fetchImpl), true);
  assert.match(request.url, /local-test\/endpoints\/local-endpoint$/u);
  assert.equal(request.options.headers.Authorization, "Bearer private-test-key");
  for (const patch of [{ branch_id: "child" }, { host: "other" },
    { project_id: "other" }, { id: "other" }, { type: "read_only" }]) {
    assert.equal(await checkEndpoint("key", owner, async () => ({ ok: true,
      text: async () => JSON.stringify({ endpoint: { ...endpoint, ...patch } }) })), false);
  }
  assert.equal(await checkEndpoint("key", owner, async () => ({ ok: true,
    text: async () => `{"endpoint":${JSON.stringify(endpoint)},"endpoint":${JSON.stringify(endpoint)}}` })), false);
  assert.equal(await checkEndpoint("key", owner, async () => ({ ok: true,
    text: async () => `{"endpoint":${JSON.stringify(endpoint).replace('"id":"local-endpoint"',
      '"id":"local-endpoint","\\u0069d":"local-endpoint"')}}` })), false);
  assert.equal(await checkEndpoint("key", owner, async () => { throw new Error("secret"); }), false);
  assert.equal(await checkEndpoint("key", owner, async () => ({ ok: false })), false);
});

test("client SCRAM verifier has fixed grammar and does not contain the password", () => {
  const password = randomBytes(48).toString("base64url");
  const verifier = scramVerifier(password, Buffer.alloc(16, 7));
  assert.match(verifier, /^SCRAM-SHA-256\$4096:[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/u);
  assert.equal(verifier.includes(password), false);
});

test("unverified Neon branch mapping stops before any SQL or passfile write", async () => {
  const directory = mkdtempSync(join(tmpdir(), "pigboard-role-branch-"));
  const passfile = join(directory, "app.pgpass");
  const { owner, runtime } = target();
  let sql = 0;
  let closed = false;
  try {
    chmodSync(directory, 0o700);
    const result = await setupRuntimeLogin({ ownerUrlFile: join(directory, "owner.url"),
      neonKeyFile: join(directory, "neon.key"), passfile }, {
      target: owner, runtime, readKey: () => "key",
      openOwner: async () => ({ async query() { sql += 1; },
        async end() { closed = true; } }), endpointCheck: async () => false });
    assert.equal(result.status, "endpoint_unverified");
    assert.equal(sql, 0);
    assert.equal(closed, true);
    assert.equal(existsSync(passfile), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("wrong pins and unsafe private paths refuse setup before SQL", async () => {
  const directory = mkdtempSync(join(tmpdir(), "pigboard-role-inputs-"));
  const other = mkdtempSync(join(tmpdir(), "pigboard-role-unsafe-"));
  try {
    chmodSync(directory, 0o700);
    chmodSync(other, 0o755);
    const options = setupOptions(directory);
    assert.equal((await setupRuntimeLogin(options.args, { ...options.deps,
      runtime: { ...options.deps.runtime, branchId: "wrong" } })).status, "wrong_target");
    assert.equal(options.queries.length, 0);
    assert.equal((await setupRuntimeLogin({ ...options.args, passfile: join(other, "app.pgpass") },
      options.deps)).status, "unsafe_passfile_target");
    assert.equal(options.queries.length, 0);
    assert.equal((await setupRuntimeLogin(options.args, { ...options.deps,
      readKey: () => { throw new Error("private key"); } })).status, "unsafe_private_file");
    assert.equal(options.queries.length, 0);
    writeFileSync(options.args.neonKeyFile, "test-key\n", { mode: 0o644 });
    assert.equal((await setupRuntimeLogin(options.args, { ...options.deps,
      readKey: undefined })).status, "unsafe_private_file");
    assert.equal(options.queries.length, 0);
    assert.equal((await setupRuntimeLogin(options.args, { ...options.deps,
      openOwner: async () => { throw new Error("private owner url"); } })).status,
    "owner_unverified");
    assert.equal(options.queries.length, 0);
    assert.equal(existsSync(options.args.passfile), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
    rmSync(other, { recursive: true, force: true });
  }
});

test("broad defaults and existing role never create a second credential", async () => {
  const directory = mkdtempSync(join(tmpdir(), "pigboard-role-existing-"));
  try {
    chmodSync(directory, 0o700);
    const broad = setupOptions(directory, { defaults: { db_create: true,
      schema_create: false } });
    assert.equal((await setupRuntimeLogin(broad.args, broad.deps)).status, "broad_defaults");
    assert.equal(broad.queries.some((sql) => sql.includes("CREATE ROLE")), false);
    const existing = setupOptions(directory, { existing: true });
    assert.equal((await setupRuntimeLogin(existing.args, existing.deps)).status, "role_exists");
    assert.equal(existing.queries.includes("ROLLBACK"), true);
    assert.equal(existing.queries.some((sql) => sql.includes("CREATE ROLE")), false);
    assert.equal(existsSync(existing.args.passfile), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("definite precommit failure rolls back and reports an orphan passfile", async () => {
  const directory = mkdtempSync(join(tmpdir(), "pigboard-role-rollback-"));
  try {
    chmodSync(directory, 0o700);
    const options = setupOptions(directory);
    const result = await setupRuntimeLogin(options.args, { ...options.deps,
      writePassfile: (path) => {
        writeFileSync(path, "orphan\n", { mode: 0o600 });
        const error = new Error("private write error");
        error.fileCreated = true;
        throw error;
      } });
    assert.equal(result.status, "precommit_failed");
    assert.equal(result.fileCreated, true);
    assert.equal(options.queries.includes("ROLLBACK"), true);
    assert.equal(options.queries.includes("COMMIT"), false);
    assert.equal(existsSync(options.args.passfile), true);
    assert.equal(JSON.stringify(result).includes("private write error"), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("a descriptor-close failure still reports a durable orphan passfile", async () => {
  const directory = mkdtempSync(join(tmpdir(), "pigboard-role-close-"));
  try {
    chmodSync(directory, 0o700);
    const options = setupOptions(directory);
    let closeCalls = 0;
    const result = await setupRuntimeLogin(options.args, { ...options.deps,
      closePassfileDescriptor: (fd) => {
        closeSync(fd);
        if (++closeCalls === 1) throw new Error("private close failure");
      } });
    assert.equal(result.status, "precommit_failed");
    assert.equal(result.fileCreated, true);
    assert.equal(closeCalls, 2);
    assert.equal(options.queries.includes("ROLLBACK"), true);
    assert.equal(options.queries.includes("COMMIT"), false);
    assert.equal(existsSync(options.args.passfile), true);
    assert.equal(JSON.stringify(result).includes("private close failure"), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("postcommit endpoint mismatch preserves the credential and refuses success", async () => {
  const directory = mkdtempSync(join(tmpdir(), "pigboard-role-reassigned-"));
  try {
    chmodSync(directory, 0o700);
    const options = setupOptions(directory);
    let endpointCalls = 0;
    const result = await setupRuntimeLogin(options.args, { ...options.deps,
      endpointCheck: async () => ++endpointCalls === 1 });
    assert.equal(result.status, "outcome_unknown");
    assert.equal(result.fileCreated, true);
    assert.equal(endpointCalls, 2);
    assert.equal(options.queries.includes("COMMIT"), true);
    assert.equal(existsSync(options.args.passfile), true);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("postcommit preflight failure and exception expose safe diagnostics", async () => {
  const directory = mkdtempSync(join(tmpdir(), "pigboard-role-postcheck-"));
  try {
    chmodSync(directory, 0o700);
    const options = setupOptions(directory);
    const failed = await setupRuntimeLogin(options.args, { ...options.deps,
      preflight: async () => ({ checks: passChecks().checks.map((check) => check.id ===
        "connection" ? { id: "connection", status: "fail", reason: "connection_failed" } :
        check), omissions: ["identity"] }) });
    assert.equal(failed.status, "created_unverified");
    assert.equal(failed.preflightChecks.find((check) => check.id === "connection").reason,
      "connection_failed");
    assert.ok(failed.omissions.includes("fixture_grants"));
    assert.equal(existsSync(options.args.passfile), true);
    rmSync(options.args.passfile);
    const thrown = await setupRuntimeLogin(options.args, { ...options.deps,
      preflight: async () => { throw new Error("private preflight material"); } });
    assert.equal(thrown.status, "created_unverified");
    assert.deepEqual(thrown.omissions, ["saved_passfile_login"]);
    assert.equal(JSON.stringify(thrown).includes("private preflight material"), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("uncertain COMMIT preserves the new passfile and never reports success", async () => {
  const directory = mkdtempSync(join(tmpdir(), "pigboard-role-unknown-"));
  const passfile = join(directory, "app.pgpass");
  const { owner, runtime } = target();
  const rights = { login: true, superuser: false, createdb: false,
    createrole: false, replication: false, bypassrls: false, member: false,
    db_connect: true, db_create: false, no_schema_create: true, public_usage: true };
  const queries = [];
  const client = {
    async query(sql) {
      queries.push(sql);
      if (sql === "COMMIT") throw new Error("private driver material");
      if (sql.includes("aclexplode")) return { rows: [{ db_create: false, schema_create: false }] };
      if (sql.includes("to_regrole")) return { rows: [{ exists: false }] };
      if (sql.includes("FROM pg_roles r")) return { rows: [rights] };
      return { rows: [] };
    },
    async end() {}
  };
  try {
    chmodSync(directory, 0o700);
    const result = await setupRuntimeLogin({ ownerUrlFile: join(directory, "owner.url"),
      neonKeyFile: join(directory, "neon.key"), passfile }, {
      target: owner, runtime, readKey: () => "key", openOwner: async () => client,
      endpointCheck: async () => true, preflight: async () => passChecks() });
    assert.equal(result.status, "outcome_unknown");
    assert.equal(result.fileCreated, true);
    assert.equal(existsSync(passfile), true);
    assert.match(readFileSync(passfile, "utf8"), /pigboard_app:/u);
    assert.equal(queries.includes("ROLLBACK"), false);
    assert.equal(JSON.stringify(result).includes("private driver material"), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("CLI has noninteractive JSON and human help without exposing credentials", async () => {
  const output = [];
  assert.equal(await runRuntimeLoginCommand(["--help"], { output: (line) => output.push(line) }), 0);
  assert.match(output.pop(), /--neon-key-file/u);
  assert.equal(await runRuntimeLoginCommand(["--owner-url-file", "/tmp/owner",
    "--neon-key-file", "/tmp/key", "--passfile", "/tmp/app",
    "--format", "json"], { output: (line) => output.push(line),
    setup: async () => ({ schemaVersion: 1, status: "created_unverified", checks: [],
      omissions: [], nextAction: "inspect the role" }) }), 1);
  assert.equal(JSON.parse(output.pop()).status, "created_unverified");
  assert.equal(await runRuntimeLoginCommand(["--owner-url-file", "secret"], {
    output: (line) => output.push(line) }), 2);
  assert.equal(JSON.parse(output.pop()).status, "invalid_usage");
  assert.equal(await runRuntimeLoginCommand(["--owner-url-file", "/tmp/owner",
    "--neon-key-file", "/tmp/key", "--passfile", "/tmp/app"], {
    output: (line) => output.push(line), setup: async () => ({ schemaVersion: 1,
      status: "created_unverified", checks: [{ id: "commit", status: "pass" }],
      preflightChecks: [{ id: "connection", status: "fail", reason: "connection_failed" },
        { id: "identity", status: "unverified", reason: "connection_failed" }],
      omissions: ["identity"], nextAction: "inspect the role" }) }), 1);
  const human = output.pop();
  assert.match(human, /fail: connection \(connection_failed\)/u);
  assert.match(human, /unverified: identity \(connection_failed\)/u);
  assert.match(human, /omissions: identity/u);
});

async function port() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const number = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return number;
}

test("a restricted role commits only with a saved passfile that authenticates", async () => {
  const docker18 = process.env.PIGBOARD_TEST_PG18 === "1";
  for (const binary of [...(docker18 ? ["docker"] : ["initdb", "pg_ctl"]), "psql"]) {
    execFileSync("which", [binary], { stdio: "ignore" });
  }
  const directory = mkdtempSync(join(tmpdir(), "pigboard-role-real-"));
  const data = join(directory, "data");
  const passfile = join(directory, "app.pgpass");
  const adminPassword = randomBytes(24).toString("base64url");
  const ownerPassword = randomBytes(24).toString("base64url");
  const adminPasswordFile = join(directory, "admin.pw");
  const number = await port();
  const containerName = `pigboard-runtime-test-${randomBytes(6).toString("hex")}`;
  let started = false;
  let admin;
  try {
    chmodSync(directory, 0o700);
    if (docker18) {
      execFileSync("docker", ["run", "--detach", "--rm", "--name", containerName,
        "--publish", `127.0.0.1:${number}:5432`, "--env", "POSTGRES_USER=probe_admin",
        "--env", `POSTGRES_PASSWORD=${adminPassword}`, "--env", "POSTGRES_DB=postgres",
        "postgres:18.6-bookworm"], { stdio: "ignore" });
    } else {
      writeFileSync(adminPasswordFile, `${adminPassword}\n`, { mode: 0o600 });
      execFileSync("initdb", ["-D", data, "--username=probe_admin", "--auth-local=trust",
        "--auth-host=scram-sha-256", `--pwfile=${adminPasswordFile}`], { stdio: "ignore" });
      execFileSync("pg_ctl", ["-D", data, "-o", `-h 127.0.0.1 -p ${number}`,
        "-l", join(directory, "postgres.log"), "-w", "start"], { stdio: "ignore" });
    }
    started = true;
    for (let attempt = 0; attempt < (docker18 ? 180 : 1); attempt += 1) {
      admin = new pg.Client({ host: "127.0.0.1", port: number, database: "postgres",
        user: "probe_admin", password: adminPassword, connectionTimeoutMillis: 1000 });
      try { await admin.connect(); break; }
      catch (error) {
        try { await admin.end(); } catch { /* Disposable startup retry. */ }
        if (attempt === 179 || !docker18) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    if (docker18) assert.match((await admin.query("SHOW server_version")).rows[0].server_version,
      /^18\.6/u);
    await admin.query(`CREATE ROLE pigboard_owner LOGIN CREATEROLE PASSWORD '${ownerPassword}'`);
    await admin.query("CREATE DATABASE pigboard OWNER pigboard_owner");
    const { owner, runtime } = target(number);
    const openOwner = async () => {
      const client = new pg.Client({ host: "127.0.0.1", port: number, database: "pigboard",
        user: "pigboard_owner", password: ownerPassword });
      await client.connect();
      return client;
    };
    const preflight = async ({ passfile: savedFile }) => {
      let user;
      try {
        user = execFileSync("psql", ["-X", "-w", "-A", "-t", "-h", runtime.host,
          "-p", String(number), "-d", runtime.database, "-U", runtime.role,
          "-c", "SELECT current_user"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
          env: { PATH: process.env.PATH, LANG: "C", PGPASSFILE: savedFile,
            PGSSLMODE: "disable" } }).trim();
      } catch { return { checks: [], omissions: ["connection"] }; }
      return user === runtime.role ? passChecks() : { checks: [], omissions: ["identity"] };
    };
    const options = { target: owner, runtime, readKey: () => "test-key", openOwner,
      endpointCheck: async () => true, preflight };
    const args = { ownerUrlFile: join(directory, "owner.url"),
      neonKeyFile: join(directory, "neon.key"), passfile };
    const success = await setupRuntimeLogin(args, options);
    assert.equal(success.status, "created_verified", JSON.stringify(success));
    assert.deepEqual(success.omissions, ["fixture_grants"]);
    assert.equal((await admin.query("SELECT rolcreaterole, rolsuper FROM pg_roles WHERE rolname = 'pigboard_app'"))
      .rows[0].rolcreaterole, false);
    assert.equal((await setupRuntimeLogin(args, options)).status, "passfile_exists");
    // In a fresh disposable role, an unusable saved file must keep the role
    // and return a partial result rather than silently retrying creation.
    await admin.query("DROP ROLE pigboard_app");
    rmSync(passfile);
    const failedLogin = await setupRuntimeLogin(args, { ...options,
      preflight: async ({ passfile: savedFile }) => {
        writeFileSync(savedFile, "corrupt\n", { mode: 0o600 });
        return preflight({ passfile: savedFile });
      } });
    assert.equal(failedLogin.status, "created_unverified", JSON.stringify(failedLogin));
    assert.equal(failedLogin.fileCreated, true);
    assert.equal((await admin.query("SELECT count(*)::integer AS count FROM pg_roles WHERE rolname = 'pigboard_app'"))
      .rows[0].count, 1);
  } finally {
    if (admin) await admin.end();
    if (started) {
      if (docker18) execFileSync("docker", ["stop", containerName], { stdio: "ignore" });
      else execFileSync("pg_ctl", ["-D", data, "-m", "immediate", "-w", "stop"],
        { stdio: "ignore" });
    }
    rmSync(directory, { recursive: true, force: true });
  }
});
