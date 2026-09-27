import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ROOT_TARGET } from "../src/hosted/root-target.js";
import { checkRuntimeTarget, diagnoseNeonRoot, openPinnedRuntimeClient,
  PinnedNeonError } from "../src/hosted/neon-client.js";

function urlFor(target, password = "private-test-password") {
  return `postgresql://${encodeURIComponent(target.role)}:${encodeURIComponent(password)}@${target.host}:${target.port}/${encodeURIComponent(target.database)}?sslmode=require`;
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

test("the diagnostic uses an explicit verified-TLS config and only a read query", async () => {
  let config;
  let sql;
  class RecordingClient {
    constructor(value) { config = value; }
    async connect() {}
    async query(value) {
      sql = value;
      return { rows: [{ role: ROOT_TARGET.role, database: ROOT_TARGET.database, ssl: true }] };
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
    }
    async connect() {}
    async query(sql) {
      assert.match(sql, /current_user/);
      return { rows: [{ role: ROOT_TARGET.role,
        database: ROOT_TARGET.database, ssl: true }] };
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

function available(binary) {
  return spawnSync("/usr/bin/env", ["sh", "-c", `command -v ${binary}`], { encoding: "utf8" }).status === 0;
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test("a real local TLS Postgres reconnect repeats the root pin check", async (t) => {
  if (!["initdb", "pg_ctl", "openssl"].every(available)) {
    t.skip("initdb, pg_ctl, and openssl are needed for the local TLS reconnect test");
    return;
  }
  const temp = mkdtempSync(join(tmpdir(), "pigboard-neon-client-"));
  const data = join(temp, "data");
  const cert = join(temp, "server.crt");
  const key = join(temp, "server.key");
  const log = join(temp, "postgres.log");
  let running = false;
  try {
    execFileSync("initdb", ["-D", data, "-A", "trust", "--no-instructions"], { stdio: "pipe" });
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
      "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost",
      "-keyout", key, "-out", cert], { stdio: "pipe" });
    chmodSync(key, 0o600);
    const port = await freePort();
    writeFileSync(join(data, "postgresql.conf"), `\nlisten_addresses = 'localhost'\nport = ${port}\nssl = on\nssl_cert_file = '${cert}'\nssl_key_file = '${key}'\nunix_socket_directories = '${temp}'\n`, { flag: "a" });
    const start = () => {
      try {
        execFileSync("pg_ctl", ["-D", data, "-l", log, "-w", "start"], { stdio: "pipe" });
      } catch (error) {
        let serverLog = "PostgreSQL did not write a log";
        try { serverLog = readFileSync(log, "utf8"); } catch { /* Startup may fail before log creation. */ }
        throw new Error(`Disposable PostgreSQL startup failed:\n${serverLog}`, { cause: error });
      }
      running = true;
    };
    const stop = () => {
      execFileSync("pg_ctl", ["-D", data, "-m", "immediate", "-w", "stop"], { stdio: "pipe" });
      running = false;
    };
    const target = { host: "localhost", port, database: "postgres", role: process.env.USER };
    assert.ok(target.role);
    const options = { expectedTarget: target, tlsCa: readFileSync(cert, "utf8") };
    const first = async () => diagnoseNeonRoot(urlFor(target), options);
    start();
    assert.equal((await first()).status, "pass");
    const untrusted = await diagnoseNeonRoot(urlFor(target), { expectedTarget: target });
    assert.equal(untrusted.status, "fail");
    assert.equal(untrusted.checks[1].reason, "tls_verification_failed");
    stop();
    start();
    const child = await diagnoseNeonRoot(urlFor({ ...target, host: "127.0.0.1" }), options);
    assert.equal(child.checks[0].reason, "target_mismatch");
    assert.equal((await first()).status, "pass");
  } finally {
    if (running) spawnSync("pg_ctl", ["-D", data, "-m", "immediate", "-w", "stop"], { stdio: "pipe" });
    rmSync(temp, { recursive: true, force: true });
  }
});
