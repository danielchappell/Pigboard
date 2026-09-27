import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import pg from "pg";
import { authorityCatalogChecksum, changeOwner, digestCallerToken, inspectAuthority, migrateAuthority,
  prepareCredentialDirectory, verifyCallerToken } from "../src/hosted/authority-bootstrap.js";
import { inspectOwnGrant } from "../src/hosted/authority-self.js";
import { startHealthServer } from "../src/hosted/health-server.js";
import { runOwnerCommand } from "../scripts/bootstrap-pigboard-owner.mjs";

function requireBinary(name) {
  const result = spawnSync("/usr/bin/env", ["sh", "-c", `command -v ${name}`], { encoding: "utf8" });
  assert.equal(result.status, 0, `${name} is required for the non-skipping owner race test`);
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test("real independent Postgres sessions serialize migration, setup, and recovery", async () => {
  for (const name of ["initdb", "pg_ctl", "openssl"]) requireBinary(name);
  const temp = mkdtempSync(join(tmpdir(), "pigboard-owner-race-"));
  const data = join(temp, "data");
  const log = join(temp, "postgres.log");
  const cert = join(temp, "server.crt");
  const key = join(temp, "server.key");
  let running = false;
  let appServer;
  const clients = [];
  try {
    execFileSync("initdb", ["-D", data, "-A", "trust", "--no-instructions"], { stdio: "pipe" });
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
      "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost",
      "-keyout", key, "-out", cert], { stdio: "pipe" });
    chmodSync(key, 0o600);
    const port = await freePort();
    writeFileSync(join(data, "postgresql.conf"),
      `\nssl = on\nssl_cert_file = '${cert}'\nssl_key_file = '${key}'\nunix_socket_directories = '${temp}'\n`, { flag: "a" });
    try {
      execFileSync("pg_ctl", ["-D", data, "-l", log, "-o",
        `-h localhost -p ${port}`, "-w", "start"], { stdio: "pipe" });
    } catch (error) {
      let serverLog = "PostgreSQL did not write a log";
      try { serverLog = readFileSync(log, "utf8"); } catch { /* Startup may fail before log creation. */ }
      throw new Error(`Disposable PostgreSQL startup failed:\n${serverLog}`, { cause: error });
    }
    running = true;
    for (let i = 0; i < 2; i += 1) {
      const client = new pg.Client({ host: "localhost", port,
        database: "postgres", user: process.env.USER,
        ssl: { rejectUnauthorized: true, servername: "localhost", ca: readFileSync(cert, "utf8") } });
      await client.connect();
      clients.push(client);
    }
    const [first, second] = clients;
    assert.deepEqual(await inspectAuthority(first), { status: "schema_absent" });
    assert.deepEqual(await migrateAuthority(first), { status: "runtime_role_missing" });
    const missingRoleOutput = [];
    assert.equal(await runOwnerCommand(["migrate", "--owner-url-file", "/unused/test/path",
      "--format", "json"], { output: (line) => missingRoleOutput.push(line),
      openConnection: async () => ({ query: first.query.bind(first), end: async () => {} }) }), 1);
    assert.equal(JSON.parse(missingRoleOutput[0]).status, "runtime_role_missing");
    assert.match(JSON.parse(missingRoleOutput[0]).nextAction, /pigboard_app/);
    assert.deepEqual(await inspectAuthority(second), { status: "schema_absent" });
    await first.query("CREATE ROLE pigboard_app LOGIN");
    await first.query("CREATE DATABASE pigboard_legacy_v1");
    const legacy = new pg.Client({ host: "localhost", port,
      database: "pigboard_legacy_v1", user: process.env.USER,
      ssl: { rejectUnauthorized: true, servername: "localhost", ca: readFileSync(cert, "utf8") } });
    await legacy.connect();
    clients.push(legacy);
    const firstMigration = readFileSync(new URL("../sql/001-pigboard-authority.sql", import.meta.url), "utf8");
    const runtimeMigration = readFileSync(new URL("../sql/002-pigboard-owner-read.sql", import.meta.url), "utf8");
    await legacy.query(firstMigration);
    await legacy.query(`INSERT INTO pigboard_schema_migrations
      (version, checksum, catalog_checksum) VALUES (1, $1, $2)`, [
      createHash("sha256").update(firstMigration).digest("hex"),
      await authorityCatalogChecksum(legacy)
    ]);
    assert.equal((await legacy.query(`SELECT has_any_column_privilege(
      'pigboard_app', 'public.pigboard_credentials', 'SELECT') AS can_read`))
      .rows[0].can_read, false);
    assert.deepEqual(await inspectAuthority(legacy),
      { status: "migration_required", schemaVersion: 1, generation: 0 });
    const pendingOutput = [];
    assert.equal(await runOwnerCommand(["inspect", "--owner-url-file", "/unused/test/path",
      "--format", "json"], { output: (line) => pendingOutput.push(line),
      openConnection: async () => ({ query: legacy.query.bind(legacy), end: async () => {} }) }), 1);
    assert.equal(JSON.parse(pendingOutput[0]).status, "migration_required");
    assert.match(JSON.parse(pendingOutput[0]).nextAction, /migration/);
    assert.deepEqual(await migrateAuthority(legacy),
      { status: "upgraded", schemaVersion: 2, generation: 0 });
    assert.equal((await inspectAuthority(legacy)).status, "schema_current");
    const migrations = await Promise.all([migrateAuthority(first), migrateAuthority(second)]);
    assert.deepEqual(migrations.map((item) => item.status).sort(), ["already_current", "applied"]);
    assert.deepEqual(migrations.map((item) => item.generation), [0, 0]);
    await first.query(`CREATE FUNCTION public.to_regclass(text)
      RETURNS pg_catalog.regclass LANGUAGE sql AS 'SELECT NULL::pg_catalog.regclass'`);
    await first.query("SET search_path = pg_catalog, public");
    await second.query("SET search_path = pg_catalog, public");
    assert.equal((await inspectAuthority(first)).status, "schema_current");
    assert.deepEqual(migrations.map((item) => item.schemaVersion), [2, 2]);
    const app = new pg.Client({ host: "localhost", port, database: "postgres",
      user: "pigboard_app", ssl: { rejectUnauthorized: true,
        servername: "localhost", ca: readFileSync(cert, "utf8") } });
    await app.connect();
    clients.push(app);
    await assert.rejects(app.query("UPDATE pigboard_team_authority SET generation = 99"),
      { code: "42501" });
    await assert.rejects(app.query("CREATE TABLE public.pigboard_illegal(id integer)"),
      { code: "42501" });
    await assert.rejects(app.query("SELECT * FROM pigboard_authority_events"),
      { code: "42501" });
    const inspectAsApp = (token) => inspectOwnGrant(token, {
      secret: "held-by-private-host", openConnection: async () =>
        ({ client: app, close: async () => {} })
    });
    const creations = await Promise.all([
      changeOwner(first, { name: "First Owner" }),
      changeOwner(second, { name: "Other Owner" })
    ]);
    assert.deepEqual(creations.map((item) => item.status).sort(), ["bootstrapped", "owner_exists"]);
    const issued = creations.find((item) => item.status === "bootstrapped");
    assert.match(issued.token, /^pb1_[A-Za-z0-9_-]{43}$/u);
    assert.equal(issued.generation, 1);
    const inspection = await inspectAuthority(second);
    assert.equal(inspection.status, "schema_current");
    assert.equal(inspection.generation, 1);
    assert.equal(inspection.owner.principalId, issued.principalId);
    assert.equal(inspection.owner.active, true);
    const rerun = await migrateAuthority(first);
    assert.deepEqual(rerun, { status: "already_current", schemaVersion: 2, generation: 1 });
    const originalCredential = (await first.query(
      "SELECT digest_version, digest, active FROM pigboard_credentials WHERE principal_id = $1",
      [issued.principalId])).rows[0];
    assert.equal(originalCredential.digest, digestCallerToken(issued.token));
    assert.equal(verifyCallerToken(issued.token, originalCredential.digest_version,
      originalCredential.digest), true);
    assert.equal(verifyCallerToken("pb1_" + "A".repeat(43), originalCredential.digest_version,
      originalCredential.digest), false);
    const selfBeforeRecovery = await inspectAsApp(issued.token);
    assert.equal(selfBeforeRecovery.status, "ok");
    assert.equal(selfBeforeRecovery.principal.id, issued.principalId);
    assert.deepEqual(selfBeforeRecovery.grants, ["connection_admin", "owner"]);
    assert.equal(selfBeforeRecovery.generation, 1);
    const startPrivateRoute = () => startHealthServer({ host: "127.0.0.1", port: 0,
      inspectSelf: inspectAsApp });
    const requestGrant = (token) => fetch(
      `http://127.0.0.1:${appServer.address().port}/v1/authority/me`,
      { headers: { Authorization: `Bearer ${token}` } });
    appServer = await startPrivateRoute();
    assert.equal((await requestGrant(issued.token)).status, 200);
    await new Promise((resolve) => appServer.close(resolve));
    appServer = await startPrivateRoute();
    assert.equal((await requestGrant(issued.token)).status, 200);
    let statementDone;
    const statementReached = new Promise((resolve) => { statementDone = resolve; });
    let releaseRead;
    const heldResult = new Promise((resolve) => { releaseRead = resolve; });
    const inFlightRead = inspectOwnGrant(issued.token, { openConnection: async () => ({
      client: { query: async (sql, params) => {
        const result = await app.query(sql, params);
        statementDone();
        await heldResult;
        return result;
      } }, close: async () => {}
    }) });
    await statementReached;
    let replacements;
    try {
      replacements = await Promise.all([
        changeOwner(first, { name: "Recovered Owner", expectGeneration: 1 }),
        changeOwner(second, { name: "Competing Recovery", expectGeneration: 1 })
      ]);
    } finally {
      releaseRead();
    }
    const authorizedBeforeCommit = await inFlightRead;
    assert.equal(authorizedBeforeCommit.status, "ok");
    assert.equal(authorizedBeforeCommit.generation, 1);
    assert.deepEqual(replacements.map((item) => item.status).sort(), ["recovered", "stale_generation"]);
    const replacement = replacements.find((item) => item.status === "recovered");
    assert.equal(replacement.generation, 2);
    assert.equal((await inspectAuthority(first)).owner.principalId, replacement.principalId);
    assert.equal((await inspectAsApp(issued.token)).status, "denied");
    assert.equal((await inspectAsApp(replacement.token)).principal.id,
      replacement.principalId);
    assert.equal((await requestGrant(issued.token)).status, 401);
    assert.equal((await requestGrant(replacement.token)).status, 200);
    assert.equal((await migrateAuthority(second)).generation, 2);
    const old = (await second.query(
      "SELECT active FROM pigboard_credentials WHERE principal_id = $1",
      [issued.principalId])).rows[0];
    assert.equal(old.active, false);
    const activeOwners = await first.query(
      "SELECT count(*)::int AS count FROM pigboard_grants WHERE role = 'owner' AND active");
    assert.equal(activeOwners.rows[0].count, 1);
    const events = await first.query("SELECT generation, event_type FROM pigboard_authority_events ORDER BY generation");
    assert.deepEqual(events.rows.map((row) => Number(row.generation)), [1, 2]);
    assert.deepEqual(events.rows.map((row) => row.event_type),
      ["owner_bootstrapped", "owner_recovered"]);
    assert.equal((await first.query("SELECT generation FROM pigboard_team_authority WHERE team_key = 'pilot'"))
      .rows[0].generation, "2");
    // Simulate a transport failure after the server committed. The caller must
    // inspect rather than replay an owner-changing operation.
    const lostCommitReply = { query: async (sql, params) => {
      const result = await second.query(sql, params);
      if (sql === "COMMIT") throw new Error("reply lost after commit");
      return result;
    } };
    const ambiguous = await changeOwner(lostCommitReply,
      { name: "Owner After Lost Reply", expectGeneration: 2 });
    assert.deepEqual(ambiguous, { status: "outcome_unknown" });
    const afterUnknown = await inspectAuthority(first);
    assert.equal(afterUnknown.generation, 3);
    assert.equal(afterUnknown.owner.name, "Owner After Lost Reply");
    assert.deepEqual(await migrateAuthority(lostCommitReply),
      { status: "schema_outcome_unknown" });
    assert.equal((await inspectAuthority(first)).generation, 3);
    await first.query("REVOKE SELECT (digest) ON pigboard_credentials FROM pigboard_app");
    assert.deepEqual(await inspectAuthority(second), { status: "schema_conflict" });
    assert.deepEqual(await migrateAuthority(first), { status: "schema_conflict" });
    await first.query("GRANT SELECT (digest) ON pigboard_credentials TO pigboard_app");
    assert.equal((await inspectAuthority(second)).status, "schema_current");
    for (const [grant, revoke] of [
      ["GRANT SELECT ON pigboard_team_authority TO pigboard_app",
        "REVOKE SELECT ON pigboard_team_authority FROM pigboard_app"],
      ["GRANT TRUNCATE ON pigboard_team_authority TO pigboard_app",
        "REVOKE TRUNCATE ON pigboard_team_authority FROM pigboard_app"],
      ["GRANT REFERENCES (generation) ON pigboard_team_authority TO pigboard_app",
        "REVOKE REFERENCES (generation) ON pigboard_team_authority FROM pigboard_app"],
      ["GRANT TRIGGER ON pigboard_team_authority TO PUBLIC",
        "REVOKE TRIGGER ON pigboard_team_authority FROM PUBLIC"]
    ]) {
      await first.query(grant);
      assert.deepEqual(await inspectAuthority(second), { status: "schema_conflict" });
      await first.query(revoke);
      await first.query(runtimeMigration);
      assert.equal((await inspectAuthority(second)).status, "schema_current", revoke);
    }
    const serverVersion = Number((await first.query("SHOW server_version_num")).rows[0].server_version_num);
    if (serverVersion >= 170000) {
      await first.query("GRANT MAINTAIN ON pigboard_team_authority TO PUBLIC");
      assert.deepEqual(await inspectAuthority(second), { status: "schema_conflict" });
      await first.query("REVOKE MAINTAIN ON pigboard_team_authority FROM PUBLIC");
      assert.equal((await inspectAuthority(second)).status, "schema_current");
    }
    const newClient = async () => {
      const client = new pg.Client({ host: "localhost", port,
        database: "postgres", user: process.env.USER,
        ssl: { rejectUnauthorized: true, servername: "localhost", ca: readFileSync(cert, "utf8") } });
      await client.connect();
      clients.push(client);
      return client;
    };
    const vanishedOutput = [];
    assert.equal(await runOwnerCommand(["recover", "--owner-url-file", "/unused/test/path",
      "--name", "Would Lose Directory", "--expect-generation", "3", "--format", "json"], {
      home: temp, output: (line) => vanishedOutput.push(line), openConnection: newClient,
      prepareDirectory: (home) => {
        const prepared = prepareCredentialDirectory(home);
        rmSync(prepared.directory, { recursive: true, force: true });
        return prepared;
      }
    }), 1);
    assert.equal(JSON.parse(vanishedOutput[0]).status, "unsafe_credential_directory");
    assert.match(JSON.parse(vanishedOutput[0]).nextAction, /Fix local ownership/);
    assert.equal((await inspectAuthority(first)).generation, 3);
    const staleOutput = [];
    assert.equal(await runOwnerCommand(["recover", "--owner-url-file", "/unused/test/path",
      "--name", "Would Be Stale", "--expect-generation", "2", "--format", "json"], {
      home: temp, output: (line) => staleOutput.push(line), openConnection: newClient
    }), 1);
    assert.equal(JSON.parse(staleOutput[0]).status, "stale_generation");
    assert.match(JSON.parse(staleOutput[0]).nextAction, /Inspect the current generation/);
    const prepared = prepareCredentialDirectory(temp);
    writeFileSync(join(prepared.directory, "owner-generation-4.token"), "existing", { mode: 0o600 });
    const existingOutput = [];
    assert.equal(await runOwnerCommand(["recover", "--owner-url-file", "/unused/test/path",
      "--name", "Would Overwrite", "--expect-generation", "3", "--format", "json"], {
      home: temp, output: (line) => existingOutput.push(line), openConnection: newClient
    }), 1);
    assert.equal(JSON.parse(existingOutput[0]).status, "credential_file_exists");
    assert.match(JSON.parse(existingOutput[0]).nextAction, /never overwrite it/);
    assert.equal((await inspectAuthority(first)).generation, 3);
    let ownerQueryReached = false;
    const interleavedInspection = { query: async (sql, params) => {
      if (!ownerQueryReached && sql.includes("SELECT p.id AS principal_id")) {
        ownerQueryReached = true;
        const next = await changeOwner(second,
          { name: "Owner During Inspection", expectGeneration: 3 });
        assert.equal(next.status, "recovered");
      }
      return first.query(sql, params);
    } };
    const stable = await inspectAuthority(interleavedInspection);
    assert.equal(stable.generation, 3);
    assert.equal(stable.owner.name, "Owner After Lost Reply");
    assert.equal((await inspectAuthority(first)).generation, 4);
    await first.query("UPDATE pigboard_grants SET active = false WHERE role = 'owner' AND active");
    assert.deepEqual(await changeOwner(second, { name: "Unsafe New Bootstrap" }),
      { status: "owner_missing_needs_repair", generation: 4 });
    await first.query("DROP INDEX public.pigboard_one_active_owner");
    assert.deepEqual(await migrateAuthority(second), { status: "schema_conflict" });
    assert.deepEqual(await inspectAuthority(first), { status: "schema_conflict" });
    await first.query(`CREATE UNIQUE INDEX pigboard_one_active_owner
      ON pigboard_grants (role) WHERE role = 'owner' AND active`);
    assert.equal((await inspectAuthority(second)).status, "schema_current");
    await first.query("ALTER TABLE public.pigboard_grants ALTER COLUMN id DROP IDENTITY");
    assert.deepEqual(await inspectAuthority(second), { status: "schema_conflict" });
    await first.query("UPDATE pigboard_schema_migrations SET checksum = $1 WHERE version = 1",
      ["0".repeat(64)]);
    assert.deepEqual(await migrateAuthority(second), { status: "schema_conflict" });
    assert.deepEqual(await inspectAuthority(first), { status: "schema_conflict" });
  } finally {
    if (appServer?.listening) await new Promise((resolve) => appServer.close(resolve));
    for (const client of clients) try { await client.end(); } catch { /* Cleanup. */ }
    if (running) spawnSync("pg_ctl", ["-D", data, "-m", "immediate", "-w", "stop"], { stdio: "pipe" });
    rmSync(temp, { recursive: true, force: true });
  }
});
