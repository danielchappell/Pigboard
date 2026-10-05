import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import pg from "pg";
import { createLocalTlsPostgres } from "./support/local-tls-postgres.js";
import { authorityCatalogChecksum, changeOwner, digestCallerToken, inspectAuthority, migrateAuthority,
  prepareCredentialDirectory, prepareAgentCredential, verifyCallerToken, enrollAgent, inspectAgent, revokeAgent } from "../src/hosted/authority-bootstrap.js";
import { inspectOwnGrant } from "../src/hosted/authority-self.js";
import { startHealthServer } from "../src/hosted/health-server.js";
import { runAgentCommand } from "../scripts/manage-pigboard-agent.mjs";
import { runOwnerCommand } from "../scripts/bootstrap-pigboard-owner.mjs";

function requireBinary(name) {
  const result = spawnSync("/usr/bin/env", ["sh", "-c", `command -v ${name}`], { encoding: "utf8" });
  assert.equal(result.status, 0, `${name} is required for the non-skipping owner race test`);
}

test("real independent Postgres sessions serialize migration, setup, and recovery", async () => {
  for (const name of ["initdb", "pg_ctl", "openssl"]) requireBinary(name);
  let fixture;
  let primaryError;
  let appServer;
  const clients = [];
  try {
    fixture = await createLocalTlsPostgres();
    const { temp, port, cert } = fixture;
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
      { status: "upgraded", schemaVersion: 3, generation: 0 });
    assert.equal((await inspectAuthority(legacy)).status, "schema_current");
    // Upgrade an actual v2 database with its original receipts and duplicate history.
    await first.query("CREATE DATABASE pigboard_legacy_v2");
    const v2 = new pg.Client({ host: "localhost", port, database: "pigboard_legacy_v2",
      user: process.env.USER, ssl: { rejectUnauthorized: true, servername: "localhost",
        ca: readFileSync(cert, "utf8") } });
    await v2.connect(); clients.push(v2);
    await v2.query(firstMigration);
    const v1Catalog = await authorityCatalogChecksum(v2);
    await v2.query(runtimeMigration);
    const v2Catalog = await authorityCatalogChecksum(v2);
    for (const [version, source, catalog] of [[1, firstMigration, v1Catalog], [2, runtimeMigration, v2Catalog]]) {
      await v2.query("INSERT INTO pigboard_schema_migrations(version,checksum,catalog_checksum) VALUES($1,$2,$3)",
        [version, createHash("sha256").update(source).digest("hex"), catalog]);
    }
    assert.equal((await inspectAuthority(v2)).status, "migration_required");
    const duplicatePrincipal = randomUUID();
    await v2.query("INSERT INTO pigboard_principals(id,name,kind) VALUES($1,'Historical','human')", [duplicatePrincipal]);
    for (let index = 0; index < 2; index++) await v2.query(`INSERT INTO pigboard_credentials
      (id,principal_id,digest_version,digest,issued_generation,active) VALUES($1,$2,'sha256-v1',$3,1,false)`,
      [randomUUID(), duplicatePrincipal, "f".repeat(64)]);
    assert.deepEqual(await migrateAuthority(v2), { status: "schema_conflict" });
    assert.equal((await v2.query("SELECT count(*)::int AS n FROM pigboard_schema_migrations")).rows[0].n, 2);
    await v2.query("DELETE FROM pigboard_credentials WHERE id=(SELECT id FROM pigboard_credentials LIMIT 1)");
    assert.deepEqual(await migrateAuthority(v2), { status: "upgraded", schemaVersion: 3, generation: 0 });
    const upgradedReceipts = (await v2.query("SELECT version,checksum,catalog_checksum FROM pigboard_schema_migrations ORDER BY version")).rows;
    assert.equal(upgradedReceipts.length, 3);
    assert.equal(upgradedReceipts[0].catalog_checksum, v1Catalog);
    assert.notEqual(upgradedReceipts[2].catalog_checksum, v2Catalog);
    // The immutable v2 operator accepts only one/two receipts (baseline schemaState).
    assert.equal([1, 2].includes(upgradedReceipts.length), false);
    assert.equal((await inspectAuthority(v2)).status, "schema_current");
    const migrations = await Promise.all([migrateAuthority(first), migrateAuthority(second)]);
    assert.deepEqual(migrations.map((item) => item.status).sort(), ["already_current", "applied"]);
    assert.deepEqual(migrations.map((item) => item.generation), [0, 0]);
    await first.query(`CREATE FUNCTION public.to_regclass(text)
      RETURNS pg_catalog.regclass LANGUAGE sql AS 'SELECT NULL::pg_catalog.regclass'`);
    await first.query("SET search_path = pg_catalog, public");
    await second.query("SET search_path = pg_catalog, public");
    assert.equal((await inspectAuthority(first)).status, "schema_current");
    assert.deepEqual(migrations.map((item) => item.schemaVersion), [3, 3]);
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
    assert.deepEqual(rerun, { status: "already_current", schemaVersion: 3, generation: 1 });
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
    // Agent lifecycle uses real independent sessions, SQL grants and HTTP; no fake lock.
    const intent = () => ({ principalId: randomUUID(), token: `pb1_${randomUUID().replaceAll("-", "").padEnd(43, "A")}` });
    const recoveryRacer = intent();
    const [ownerRecovery, agentDuringRecovery] = await Promise.all([
      changeOwner(first, { name: "Owner During Agent Race", expectGeneration: 4 }),
      enrollAgent(second, recoveryRacer)
    ]);
    // Agent enrollment may win first, making the guarded owner generation stale.
    assert.equal(agentDuringRecovery.status, "enrolled");
    let preservedOwnerToken;
    if (ownerRecovery.status === "recovered") preservedOwnerToken = ownerRecovery.token;
    else {
      assert.equal(ownerRecovery.status, "stale_generation");
      const recovery = await changeOwner(first, { name: "Owner After Agent Race",
        expectGeneration: (await inspectAuthority(first)).generation });
      assert.equal(recovery.status, "recovered");
      preservedOwnerToken = recovery.token;
    }
    assert.equal((await revokeAgent(second, { principalId: recoveryRacer.principalId })).status, "revoked");
    const activeOwner = (await inspectAuthority(first)).owner;
    const ownerBeforeAgent = await first.query("SELECT digest FROM pigboard_credentials WHERE principal_id=$1 AND active", [activeOwner.principalId]);
    assert.equal((await requestGrant(preservedOwnerToken)).status, 200);
    const one = intent(); const two = intent();
    await first.query("SET default_transaction_isolation='repeatable read'");
    await second.query("SET default_transaction_isolation='serializable'");
    const concurrent = await Promise.all([enrollAgent(first, one), enrollAgent(second, two)]);
    assert.deepEqual(concurrent.map((item) => item.status).sort(), ["enrolled", "refused"]);
    assert.equal(concurrent.find((item) => item.status === "refused").reason, "agent_exists");
    const used = concurrent[0].status === "enrolled" ? one : two;
    const afterEnroll = await inspectAgent(first);
    assert.equal(afterEnroll.status, "active");
    assert.equal(afterEnroll.authority.principal.id, used.principalId);
    assert.deepEqual(afterEnroll.authority.grantActiveRoles, ["connection_admin"]);
    const retries = await Promise.all([enrollAgent(first, used), enrollAgent(second, used)]);
    assert.deepEqual(retries.map((row) => row.status), ["already_active", "already_active"]);
    const noWrite = retries[1];
    assert.equal(noWrite.status, "already_active");
    assert.equal(noWrite.authority.generation, afterEnroll.authority.generation);
    assert.equal((await inspectAgent(first, used)).authority.credentialMatch, true);
    assert.equal((await inspectAgent(first, { principalId: activeOwner.principalId })).status, "refused");
    assert.equal((await revokeAgent(first, { principalId: activeOwner.principalId })).status, "refused");
    const agentHTTP = await requestGrant(used.token);
    assert.equal(agentHTTP.status, 200);
    assert.equal((await agentHTTP.json()).principal.kind, "agent");
    const mismatched = await enrollAgent(first, { ...used, token: intent().token });
    assert.equal(mismatched.reason, "identity_conflict");
    // A stored future-generation credential fails inspection but can still be fully revoked.
    await first.query("UPDATE pigboard_credentials SET issued_generation=$1 WHERE principal_id=$2",
      [afterEnroll.authority.generation + 10, used.principalId]);
    assert.equal((await inspectAgent(second)).reason, "authority_conflict");
    await first.query("UPDATE pigboard_credentials SET issued_generation=$1 WHERE principal_id=$2",
      [afterEnroll.authority.generation, used.principalId]);
    // Full revoke removes every credential, even when the target's active shape is contradictory.
    const secondBearer = intent().token;
    await first.query(`INSERT INTO pigboard_credentials(id,principal_id,digest_version,digest,issued_generation)
      VALUES($1,$2,'sha256-v1',$3,$4)`,
      [randomUUID(), used.principalId, digestCallerToken(secondBearer), afterEnroll.authority.generation]);
    assert.equal((await inspectAgent(second)).status, "unknown");
    const lostAgentRevoke = await revokeAgent(lostCommitReply, { principalId: used.principalId });
    assert.equal(lostAgentRevoke.status, "unknown");
    assert.equal(lostAgentRevoke.reason, "outcome_unknown");
    assert.equal((await requestGrant(used.token)).status, 401);
    assert.equal((await requestGrant(secondBearer)).status, 401);
    const revoked = await inspectAgent(first, used);
    assert.equal(revoked.status, "revoked");
    const repeatedRevoke = await revokeAgent(second, { principalId: used.principalId });
    assert.equal(repeatedRevoke.status, "already_revoked");
    assert.equal(repeatedRevoke.authority.generation, revoked.authority.generation);
    assert.equal((await enrollAgent(first, used)).reason, "credential_revoked");
    const another = intent();
    const lostEnrollment = await enrollAgent(lostCommitReply, another);
    assert.equal(lostEnrollment.status, "unknown");
    assert.equal((await inspectAgent(first, another)).status, "active");
    assert.equal((await enrollAgent(first, another)).status, "already_active");
    const rebound = await enrollAgent(first, { ...intent(), token: another.token });
    assert.equal(rebound.reason, "identity_conflict");
    await assert.rejects(first.query(`INSERT INTO pigboard_credentials(id,principal_id,digest_version,digest,issued_generation,active)
      VALUES($1,$2,'sha256-v1',$3,1,false)`, [randomUUID(), another.principalId, digestCallerToken(used.token)]),
      { code: "23505" });
    const humanImposter = randomUUID();
    await first.query("INSERT INTO pigboard_principals(id,name,kind) VALUES($1,'pilot-agent','human')", [humanImposter]);
    assert.equal((await inspectAgent(second)).reason, "authority_conflict");
    await first.query("DELETE FROM pigboard_principals WHERE id=$1", [humanImposter]);
    const extra = randomUUID();
    await first.query("INSERT INTO pigboard_principals(id,name,kind) VALUES($1,'other-agent','agent')", [extra]);
    await first.query("INSERT INTO pigboard_grants(principal_id,role) VALUES($1,'connection_admin')", [extra]);
    assert.equal((await revokeAgent(second, { principalId: another.principalId })).reason, "authority_conflict");
    await first.query("DELETE FROM pigboard_grants WHERE principal_id=$1", [extra]);
    await first.query("DELETE FROM pigboard_principals WHERE id=$1", [extra]);
    const beforeRace = (await inspectAuthority(first)).generation;
    // Hold the actual row lock, start revoke, then advance generation before releasing it.
    await first.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    await first.query("SELECT generation FROM pigboard_team_authority WHERE team_key='pilot' FOR UPDATE");
    let lockReached;
    const waiting = new Promise((resolve) => { lockReached = resolve; });
    const wrappedSecond = { query: async (sql, params) => {
      if (sql.includes("FOR UPDATE")) lockReached();
      return second.query(sql, params);
    } };
    const blockedRevoke = revokeAgent(wrappedSecond, { principalId: another.principalId });
    await waiting;
    await first.query("UPDATE pigboard_team_authority SET generation=$1 WHERE team_key='pilot'", [beforeRace + 1]);
    await first.query("COMMIT");
    const freshRevoke = await blockedRevoke;
    assert.equal(freshRevoke.status, "revoked");
    assert.equal(freshRevoke.authority.generation, beforeRace + 2);
    assert.equal((await inspectAuthority(first)).owner.principalId, activeOwner.principalId);
    assert.deepEqual((await first.query("SELECT digest FROM pigboard_credentials WHERE principal_id=$1 AND active", [activeOwner.principalId])).rows,
      ownerBeforeAgent.rows);
    const latest = await inspectAgent(first);
    assert.equal(latest.status, "revoked");
    assert.equal(latest.authority.principal.id, another.principalId);
    assert.equal((await inspectAgent(first, { principalId: randomUUID() })).status, "absent");
    // Bound overflow without changing owner authority or allowing an unsafe increment.
    const generation = (await inspectAuthority(first)).generation;
    await first.query("UPDATE pigboard_team_authority SET generation=$1 WHERE team_key='pilot'", [Number.MAX_SAFE_INTEGER]);
    assert.equal((await enrollAgent(second, intent())).reason, "generation_exhausted");
    await first.query("UPDATE pigboard_team_authority SET generation=$1 WHERE team_key='pilot'", [generation]);
    const cliLines = [];
    const cliOptions = { home: temp, output: (line) => cliLines.push(line), openConnection: newClient };
    const cliBase = ["--owner-url-file", "/unused/test/path", "--format", "json"];
    assert.equal(await runAgentCommand(["enroll", ...cliBase], cliOptions), 0);
    const cliEnrollment = JSON.parse(cliLines.pop());
    assert.deepEqual(Object.keys(cliEnrollment), ["schemaVersion", "command", "status", "reason", "authority", "local", "omissions", "nextAction"]);
    assert.equal(cliEnrollment.status, "enrolled");
    assert.equal(cliEnrollment.local.status, "prepared_locally");
    assert.deepEqual(cliEnrollment.omissions, ["delivery_unverified", "peer_unverified"]);
    const cliToken = readFileSync(cliEnrollment.local.credentialFile, "utf8").trim();
    const cliId = cliEnrollment.authority.principal.id;
    const cliFile = ["--credential-file", cliEnrollment.local.credentialFile];
    assert.equal(await runAgentCommand(["enroll", ...cliBase, ...cliFile], cliOptions), 0);
    assert.equal(JSON.parse(cliLines.pop()).status, "already_active");
    assert.equal(await runAgentCommand(["status", ...cliBase, ...cliFile], cliOptions), 0);
    const cliStatus = JSON.parse(cliLines.pop());
    assert.equal(cliStatus.status, "active");
    assert.equal(cliStatus.authority.credentialMatch, true);
    assert.equal(await runAgentCommand(["status", "--owner-url-file", "/unused/test/path", "--principal-id", cliId], cliOptions), 0);
    const cliText = cliLines.pop();
    assert.match(cliText, new RegExp(`generation: ${cliStatus.authority.generation}`));
    assert.match(cliText, /status: active/);
    assert.doesNotMatch(cliText, /pb1_|digest/);
    assert.equal((await requestGrant(cliToken)).status, 200);
    const authoritySnapshot = async () => (await first.query(`SELECT
      (SELECT jsonb_agg(a ORDER BY team_key) FROM public.pigboard_team_authority a) AS authority,
      (SELECT jsonb_agg(p ORDER BY id) FROM public.pigboard_principals p) AS principals,
      (SELECT jsonb_agg(c ORDER BY id) FROM public.pigboard_credentials c) AS credentials,
      (SELECT jsonb_agg(g ORDER BY id) FROM public.pigboard_grants g) AS grants,
      (SELECT jsonb_agg(e ORDER BY generation) FROM public.pigboard_authority_events e) AS events`)).rows[0];
    const unissuedFile = prepareAgentCredential({ home: temp });
    const beforeStatus = await authoritySnapshot();
    assert.equal((await inspectAgent(first, unissuedFile)).status, "absent");
    assert.equal(await runAgentCommand(["status", ...cliBase, "--credential-file", unissuedFile.credentialFile], cliOptions), 0);
    const unissuedStatus = JSON.parse(cliLines.pop());
    assert.equal(unissuedStatus.status, "absent");
    assert.equal(unissuedStatus.authority.principal, null);
    assert.equal(unissuedStatus.authority.credentialMatch, false);
    assert.deepEqual(await authoritySnapshot(), beforeStatus);
    // A syntactically valid file for an absent UUID is contradictory when its
    // bearer is already bound elsewhere, not an unissued durable intent.
    const foreignFile = prepareAgentCredential({ home: temp });
    writeFileSync(foreignFile.credentialFile, `${cliToken}\n`);
    const assertForeignStatusRefused = async () => {
      const before = await authoritySnapshot();
      const inspected = await inspectAgent(first,
        { principalId: foreignFile.principalId, token: cliToken });
      assert.deepEqual(inspected, { status: "refused", reason: "identity_conflict", authority: null });
      assert.equal(await runAgentCommand(["status", ...cliBase, "--credential-file", foreignFile.credentialFile], cliOptions), 1);
      const output = cliLines.pop();
      const status = JSON.parse(output);
      assert.equal(status.status, "refused");
      assert.equal(status.reason, "identity_conflict");
      assert.equal(status.authority, null);
      assert.doesNotMatch(output, /pb1_|"digest"|"token"/);
      assert.deepEqual(await authoritySnapshot(), before);
      assert.equal((await first.query("SELECT id FROM public.pigboard_principals WHERE id=$1", [foreignFile.principalId])).rows.length, 0);
    };
    await assertForeignStatusRefused(); // Foreign digest is currently active.
    const revokeRetryRace = await Promise.all([revokeAgent(first, { principalId: cliId }),
      enrollAgent(second, { principalId: cliId, token: cliToken })]);
    assert.equal(revokeRetryRace[0].status, "revoked");
    assert.ok(["already_active", "refused"].includes(revokeRetryRace[1].status));
    if (revokeRetryRace[1].status === "refused") assert.equal(revokeRetryRace[1].reason, "credential_revoked");
    assert.equal((await requestGrant(cliToken)).status, 401);
    assert.equal(await runAgentCommand(["revoke", ...cliBase, "--principal-id", cliId.toUpperCase()], cliOptions), 0);
    const cliRevoke = JSON.parse(cliLines.pop());
    assert.equal(cliRevoke.status, "already_revoked");
    await assertForeignStatusRefused(); // The same foreign digest is permanently revoked.
    const afterRevokedForeignStatus = await authoritySnapshot();
    assert.equal(await runAgentCommand(["status", ...cliBase, "--credential-file", unissuedFile.credentialFile], cliOptions), 0);
    assert.equal(JSON.parse(cliLines.pop()).status, "absent");
    assert.deepEqual(await authoritySnapshot(), afterRevokedForeignStatus);
    assert.deepEqual(cliRevoke.omissions, ["peer_removal_unverified"]);
    assert.equal((await requestGrant(preservedOwnerToken)).status, 200);
    assert.equal((await inspectAuthority(first)).owner.principalId, activeOwner.principalId);
    const finalGeneration = (await inspectAuthority(first)).generation;
    await first.query("UPDATE pigboard_grants SET active = false WHERE role = 'owner' AND active");
    assert.deepEqual(await changeOwner(second, { name: "Unsafe New Bootstrap" }),
      { status: "owner_missing_needs_repair", generation: finalGeneration });
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
  } catch (error) {
    primaryError = error;
  } finally {
    const cleanupErrors = [];
    if (appServer?.listening) {
      try {
        await new Promise((resolve, reject) => appServer.close((error) => error ? reject(error) : resolve()));
      } catch (error) { cleanupErrors.push(error); }
    }
    for (const client of clients) {
      try { await client.end(); } catch (error) { cleanupErrors.push(error); }
    }
    if (fixture) {
      try { fixture.cleanup(); } catch (error) { cleanupErrors.push(error); }
    }
    if (cleanupErrors.length) throw new AggregateError(
      primaryError ? [primaryError, ...cleanupErrors] : cleanupErrors,
      "Owner PostgreSQL test cleanup failed; all original and cleanup errors follow");
  }
  if (primaryError) throw primaryError;
});
