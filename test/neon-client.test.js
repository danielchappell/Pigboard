import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createServer, connect } from "node:net";
import { createSecureContext, TLSSocket } from "node:tls";
import { createLocalTlsPostgres } from "./support/local-tls-postgres.js";
import { ROOT_TARGET } from "../src/hosted/root-target.js";
import { checkRuntimeTarget, diagnoseNeonRoot, openPinnedRuntimeClient,
  PinnedNeonError, queryWithAbort } from "../src/hosted/neon-client.js";

function urlFor(target, password = "private-test-password") {
  return `postgresql://${encodeURIComponent(target.role)}:${encodeURIComponent(password)}@${target.host}:${target.port}/${encodeURIComponent(target.database)}?sslmode=require`;
}

function verifiedSocket() {
  return { encrypted: true, authorized: true, getProtocol: () => "TLSv1.3" };
}

test("required channel binding fails before constructing a client", async () => {
  let created = 0;
  class NeverConnect {
    constructor() { created += 1; }
  }
  const result = await diagnoseNeonRoot(`${urlFor(ROOT_TARGET)}&channel_binding=require`, {
    ClientClass: NeverConnect
  });
  assert.equal(result.status, "fail");
  assert.equal(result.checks[0].reason, "unsupported_channel_binding");
  assert.deepEqual(result.omissions, ["connection", "identity", "tls"]);
  assert.equal(created, 0);
  assert.equal(JSON.stringify(result).includes("private-test-password"), false);
});

test("the production pin rejects a child or pooler before a client exists", async () => {
  let created = 0;
  class NeverConnect {
    constructor() { created += 1; }
  }
  for (const host of [
    "ep-hidden-feather-b2qm5pb0.c-6.eu-central-1.aws.neon.tech",
    ROOT_TARGET.host.replace(".c-6.", "-pooler.c-6.")
  ]) {
    const result = await diagnoseNeonRoot(urlFor({ ...ROOT_TARGET, host }), { ClientClass: NeverConnect });
    assert.equal(result.status, "fail");
    assert.equal(result.checks[0].reason, "target_mismatch");
    assert.deepEqual(result.omissions, ["connection", "identity", "tls"]);
  }
  assert.equal(created, 0);
  assert.equal(checkRuntimeTarget(urlFor(ROOT_TARGET)).status, "pass");
  assert.equal(checkRuntimeTarget(urlFor({ ...ROOT_TARGET, role: "pigboard_owner" })).status, "fail");
  assert.equal(checkRuntimeTarget(urlFor(ROOT_TARGET).replace("sslmode=require", "sslmode=disable")).status, "fail");
});

test("the diagnostic keeps TLS errors, timeouts, and the secret out of results", async () => {
  const password = "do-not-print-this-password";
  class BadCertificate {
    async connect() {
      throw Object.assign(new Error(`private: ${password}`), { code: "ERR_TLS_CERT_ALTNAME_INVALID" });
    }
    async end() {}
  }
  const tls = await diagnoseNeonRoot(urlFor(ROOT_TARGET, password), { ClientClass: BadCertificate });
  assert.equal(tls.status, "fail");
  assert.equal(tls.checks[1].reason, "tls_verification_failed");
  assert.equal(JSON.stringify(tls).includes(password), false);

  for (const code of ["UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "CERT_NOT_YET_VALID", "INVALID_CA"]) {
    class BadChain {
      async connect() {
        throw Object.assign(new Error(`private: ${password}`), { code });
      }
      async end() {}
    }
    const result = await diagnoseNeonRoot(urlFor(ROOT_TARGET, password), { ClientClass: BadChain });
    assert.equal(result.status, "fail");
    assert.equal(result.checks[1].reason, "tls_verification_failed");
    assert.equal(JSON.stringify(result).includes(password), false);
  }

  class NeverFinishes {
    async connect() { return new Promise(() => {}); }
    async end() {}
  }
  const started = Date.now();
  const timeout = await diagnoseNeonRoot(urlFor(ROOT_TARGET, password), {
    ClientClass: NeverFinishes, connectionTimeoutMs: 20
  });
  assert.equal(timeout.status, "unverified");
  assert.equal(timeout.checks[1].reason, "temporarily_unavailable");
  assert.ok(Date.now() - started < 2_000);
  assert.equal(JSON.stringify(timeout).includes(password), false);
});

test("completed transport remains verified when identity SQL fails or times out", async () => {
  const password = "query-error-secret";
  for (const mode of ["rejection", "timeout"]) {
    let queries = 0;
    let closes = 0;
    let destroys = 0;
    class FailedIdentity {
      constructor() {
        this.connection = { stream: { ...verifiedSocket(), destroy() { destroys += 1; } } };
      }
      async connect() {}
      async query() {
        queries += 1;
        if (mode === "timeout") return new Promise(() => {});
        throw new Error(`private query detail: ${password}`);
      }
      async end() { closes += 1; }
    }
    const result = await diagnoseNeonRoot(urlFor(ROOT_TARGET, password), {
      ClientClass: FailedIdentity, queryTimeoutMs: 20
    });
    assert.equal(result.status, "unverified");
    assert.equal(result.checks.find((item) => item.id === "connection").status, "pass");
    assert.equal(result.checks.find((item) => item.id === "tls").status, "pass");
    assert.equal(result.checks.find((item) => item.id === "tls").reason, "verified_tls");
    assert.equal(result.checks.find((item) => item.id === "identity").status, "unverified");
    assert.deepEqual(result.omissions, ["identity"]);
    assert.equal(queries, 1);
    assert.equal(closes, 1);
    assert.equal(destroys, mode === "timeout" ? 1 : 0);
    assert.equal(JSON.stringify(result).includes(password), false);
  }
});

test("the diagnostic uses an explicit verified-TLS config and only a read query", async () => {
  let config;
  let sql;
  class RecordingClient {
    constructor(value) { config = value; this.connection = { stream: verifiedSocket() }; }
    async connect() {}
    async query(value) {
      sql = value;
      return { rows: [{ role: ROOT_TARGET.role, database: ROOT_TARGET.database, ssl: false }] };
    }
    async end() {}
  }
  const result = await diagnoseNeonRoot(urlFor(ROOT_TARGET), { ClientClass: RecordingClient });
  assert.equal(result.status, "pass");
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.ssl.servername, ROOT_TARGET.host);
  assert.equal(config.enableChannelBinding, true);
  assert.equal(config.connectionString, undefined);
  assert.match(sql, /^\s*SELECT\b/i);
  assert.equal(JSON.stringify(result).includes(config.password), false);
});

test("the application connection checks pin and server identity before protected SQL", async () => {
  let created = 0;
  const wrong = urlFor({ ...ROOT_TARGET, host: "wrong.example.test" });
  class RecordingClient {
    constructor(config) {
      created += 1;
      assert.equal(config.ssl.rejectUnauthorized, true);
      assert.equal(config.ssl.servername, ROOT_TARGET.host);
      assert.equal(config.connectionString, undefined);
      this.connection = { stream: verifiedSocket() };
    }
    async connect() {}
    async query(sql) {
      assert.match(sql, /current_user/);
      return { rows: [{ role: ROOT_TARGET.role,
        database: ROOT_TARGET.database, ssl: false }] };
    }
    async end() {}
  }
  await assert.rejects(openPinnedRuntimeClient(wrong, { ClientClass: RecordingClient }),
    (error) => error instanceof PinnedNeonError && error.reason === "target_mismatch");
  assert.equal(created, 0);
  const connection = await openPinnedRuntimeClient(urlFor(ROOT_TARGET),
    { ClientClass: RecordingClient });
  assert.equal(created, 1);
  await connection.close();
  class WrongSession extends RecordingClient {
    async query() { return { rows: [{ role: "pigboard_owner",
      database: ROOT_TARGET.database, ssl: true }] }; }
  }
  await assert.rejects(openPinnedRuntimeClient(urlFor(ROOT_TARGET),
    { ClientClass: WrongSession }),
  (error) => error instanceof PinnedNeonError && error.reason === "identity_mismatch");
});

test("missing, plaintext, untrusted or obsolete client transport refuses SQL and closes", async () => {
  for (const stream of [undefined, { encrypted: false, authorized: true },
    { encrypted: true, authorized: false, getProtocol: () => "TLSv1.3" },
    { encrypted: true, authorized: true, getProtocol: () => "TLSv1.1" },
    { encrypted: true, authorized: true }]) {
    let queries = 0;
    let closes = 0;
    class UnverifiedClient {
      constructor() { this.connection = { stream }; }
      async connect() {}
      async query() { queries += 1; return { rows: [{ role: ROOT_TARGET.role,
        database: ROOT_TARGET.database, ssl: true }] }; }
      async end() { closes += 1; }
    }
    const result = await diagnoseNeonRoot(urlFor(ROOT_TARGET), { ClientClass: UnverifiedClient });
    assert.equal(result.status, "fail");
    assert.equal(result.checks.find((item) => item.id === "tls").reason, "tls_not_active");
    assert.deepEqual(result.omissions, ["identity"]);
    await assert.rejects(openPinnedRuntimeClient(urlFor(ROOT_TARGET),
      { ClientClass: UnverifiedClient }), { reason: "tls_not_active" });
    assert.equal(queries, 0);
    assert.equal(closes, 2);
    assert.ok(!JSON.stringify(result).includes("private-test-password"));
  }
});

test("a stalled application connection is bounded and reports no private URL", async () => {
  const password = "application-private-password";
  class StalledClient {
    async connect() { return new Promise(() => {}); }
    async end() {}
  }
  const started = Date.now();
  await assert.rejects(openPinnedRuntimeClient(urlFor(ROOT_TARGET, password), {
    ClientClass: StalledClient, connectionTimeoutMs: 20
  }), (error) => error instanceof PinnedNeonError &&
    error.reason === "temporarily_unavailable" && !error.message.includes(password));
  assert.ok(Date.now() - started < 2_000);
});

test("an aborted pending application connect destroys the owned stream and never waits for late callback", async () => {
  const controller = new AbortController();
  let settleConnect;
  let destroys = 0;
  let closes = 0;
  class LateConnect {
    constructor() {
      this.connection = { stream: { ...verifiedSocket(), destroy() { destroys++; } } };
    }
    connect() { return new Promise(resolve => { settleConnect = resolve; }); }
    async query() { throw new Error("must not query after abort"); }
    async end() { closes++; }
  }
  const pending = openPinnedRuntimeClient(urlFor(ROOT_TARGET), {
    ClientClass: LateConnect, signal: controller.signal });
  await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await assert.rejects(pending, PinnedNeonError);
  assert.ok(destroys >= 1);
  assert.ok(closes >= 1);
  settleConnect();
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(destroys >= 2);
});

test("abort after connect but during root query destroys the current stream and closes", async () => {
  const controller = new AbortController();
  let queried = false;
  let destroys = 0;
  let closes = 0;
  class StalledRoot {
    constructor() {
      this.connection = { stream: { ...verifiedSocket(), destroy() { destroys++; } } };
    }
    async connect() {}
    query() { queried = true; return new Promise(() => {}); }
    async end() { closes++; }
  }
  const pending = openPinnedRuntimeClient(urlFor(ROOT_TARGET), {
    ClientClass: StalledRoot, signal: controller.signal });
  while (!queried) await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await assert.rejects(pending, PinnedNeonError);
  assert.ok(destroys >= 1);
  assert.ok(closes >= 1);
});

test("a stalled grant query rejects on route abort without awaiting its driver callback", async () => {
  const controller = new AbortController();
  let started = false;
  const client = { query: () => { started = true; return new Promise(() => {}); } };
  const pending = queryWithAbort(client, controller.signal, "SELECT 1");
  while (!started) await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await assert.rejects(pending, PinnedNeonError);
  const sqlError = Object.assign(new Error("private SQL detail"), { code: "42501" });
  await assert.rejects(queryWithAbort({ query: async () => { throw sqlError; } },
    new AbortController().signal, "SELECT 1"), error => error === sqlError);
});

function available(binary) {
  return spawnSync("/usr/bin/env", ["sh", "-c", `command -v ${binary}`], { encoding: "utf8" }).status === 0;
}

test("a real local TLS Postgres reconnect repeats the root pin check", async () => {
  assert.ok(["initdb", "pg_ctl", "openssl"].every(available),
    "initdb, pg_ctl and openssl are required; this integration check cannot skip");
  let fixture;
  let primaryError;
  try {
    fixture = await createLocalTlsPostgres();
    const target = { host: "localhost", port: fixture.port, database: "postgres", role: process.env.USER };
    assert.ok(target.role);
    const options = { expectedTarget: target, tlsCa: fixture.ca };
    const first = async () => diagnoseNeonRoot(urlFor(target), options);
    assert.equal((await first()).status, "pass");
    const untrusted = await diagnoseNeonRoot(urlFor(target), { expectedTarget: target });
    assert.equal(untrusted.status, "fail");
    assert.equal(untrusted.checks[1].reason, "tls_verification_failed");
    fixture.stop();
    await fixture.start();
    const child = await diagnoseNeonRoot(urlFor({ ...target, host: "127.0.0.1" }), options);
    assert.equal(child.checks[0].reason, "target_mismatch");
    assert.equal((await first()).status, "pass");
  } catch (error) {
    primaryError = error;
  } finally {
    if (fixture) {
      try { fixture.cleanup(); }
      catch (cleanupError) { throw new AggregateError(
        primaryError ? [primaryError, cleanupError] : [cleanupError],
        "Neon TLS test cleanup failed; all original and cleanup errors follow"); }
    }
  }
  if (primaryError) throw primaryError;
});

// This owned loopback proxy accepts PostgreSQL SSLRequest, terminates real TLS,
// then relays plaintext to the disposable trust-authenticated backend.
async function createTlsProxy(fixture) {
  const sockets = new Set();
  const context = createSecureContext({ cert: readFileSync(fixture.cert),
    key: readFileSync(join(fixture.temp, "server.key")) });
  function own(socket) {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
    socket.on("error", () => socket.destroy());
    socket.setTimeout(15_000, () => socket.destroy());
    return socket;
  }
  const server = createServer((raw) => {
    own(raw);
    let header = Buffer.alloc(0);
    function receive(chunk) {
      header = Buffer.concat([header, chunk]);
      if (header.length < 8) return;
      raw.pause();
      raw.removeListener("data", receive);
      if (header.readUInt32BE(0) !== 8 || header.readUInt32BE(4) !== 80877103) {
        raw.destroy();
        return;
      }
      if (header.length > 8) raw.unshift(header.subarray(8));
      raw.write("S");
      const secured = own(new TLSSocket(raw, { isServer: true,
        secureContext: context, minVersion: "TLSv1.2" }));
      const backend = own(connect({ host: "127.0.0.1", port: fixture.port }));
      secured.once("close", () => backend.destroy());
      backend.once("close", () => secured.destroy());
      secured.pipe(backend).pipe(secured);
      raw.resume();
    }
    raw.on("data", receive);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { port: server.address().port, close: async () => {
    const closed = [...sockets].map((socket) => new Promise((resolve) => socket.once("close", resolve)));
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    let timer;
    try {
      await Promise.race([Promise.all(closed), new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Owned proxy socket cleanup did not complete")), 2_000);
      })]);
    } finally { clearTimeout(timer); }
    assert.equal(sockets.size, 0, "all owned proxy sockets must close");
  } };
}

test("verified client TLS works through a real proxy with a plaintext backend", async () => {
  assert.ok(["initdb", "pg_ctl", "openssl"].every(available),
    "initdb, pg_ctl and openssl are required; this integration check cannot skip");
  let fixture;
  let proxy;
  let connection;
  const errors = [];
  try {
    fixture = await createLocalTlsPostgres();
    proxy = await createTlsProxy(fixture);
    const target = { host: "localhost", port: proxy.port, database: "postgres", role: process.env.USER };
    assert.ok(target.role);
    const options = { expectedTarget: target, tlsCa: fixture.ca };
    assert.equal((await diagnoseNeonRoot(urlFor(target), options)).status, "pass");
    connection = await openPinnedRuntimeClient(urlFor(target), options);
    const backend = await connection.client.query(
      "SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()");
    assert.equal(backend.rows[0].ssl, false, "the proxy-to-backend connection must actually be plaintext");
    assert.equal(connection.client.connection.stream.encrypted, true);
    assert.equal(connection.client.connection.stream.authorized, true);
    await connection.close();
    connection = undefined;
    const untrusted = await diagnoseNeonRoot(urlFor(target), { expectedTarget: target });
    assert.equal(untrusted.status, "fail");
    assert.equal(untrusted.checks[1].reason, "tls_verification_failed");
    await assert.rejects(openPinnedRuntimeClient(urlFor(target), { expectedTarget: target }),
      { reason: "tls_verification_failed" });
    // Match the URL pin to 127.0.0.1, so refusal must come from the real
    // certificate's localhost-only SAN rather than pre-connection pin checking.
    const wrongHost = { ...target, host: "127.0.0.1" };
    const wrongOptions = { expectedTarget: wrongHost, tlsCa: fixture.ca };
    const wrong = await diagnoseNeonRoot(urlFor(wrongHost), wrongOptions);
    assert.equal(wrong.checks[0].status, "pass");
    assert.equal(wrong.checks[1].reason, "tls_verification_failed");
    await assert.rejects(openPinnedRuntimeClient(urlFor(wrongHost), wrongOptions),
      { reason: "tls_verification_failed" });
  } catch (error) {
    errors.push(error);
  } finally {
    if (connection) { try { await connection.close(); } catch (error) { errors.push(error); } }
    if (proxy) { try { await proxy.close(); } catch (error) { errors.push(error); } }
    if (fixture) { try { fixture.cleanup(); } catch (error) { errors.push(error); } }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length) throw new AggregateError(errors, "TLS proxy regression and owned cleanup failed");
});
