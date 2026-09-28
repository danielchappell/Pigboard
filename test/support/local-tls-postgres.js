import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

function logSize(path) {
  try { return statSync(path).size; } catch { return 0; }
}

function logSince(path, offset) {
  try { return readFileSync(path).subarray(offset).toString("utf8"); }
  catch { return "PostgreSQL did not write a log for this start attempt"; }
}

function clusterState(data) {
  const result = spawnSync("pg_ctl", ["-D", data, "status"], { encoding: "utf8" });
  if (result.error) return "unknown";
  if (result.status === 0) return "running";
  if (result.status === 3) return "stopped";
  return "unknown";
}

function recoveryError(message, data, log, cause) {
  return new Error(`${message}\nCluster data: ${data}\nLog: ${log}\n` +
    `If this server is running, stop it with pg_ctl -D '${data}' -m immediate -w stop before removing the directory.`,
  { cause });
}

export async function createLocalTlsPostgres() {
  const temp = mkdtempSync(join(tmpdir(), "pigboard-tls-postgres-"));
  const data = join(temp, "data");
  const log = join(temp, "postgres.log");
  const cert = join(temp, "server.crt");
  const key = join(temp, "server.key");
  let port;
  let startupAttempted = false;
  let disposed = false;

  function stop() {
    const before = clusterState(data);
    if (before === "stopped") return;
    if (before !== "running") throw recoveryError("Cannot determine whether disposable PostgreSQL is running.", data, log);
    try {
      execFileSync("pg_ctl", ["-D", data, "-m", "immediate", "-w", "stop"], { stdio: "pipe" });
    } catch (error) {
      throw recoveryError("Disposable PostgreSQL stop failed.", data, log, error);
    }
    if (clusterState(data) !== "stopped") {
      throw recoveryError("Disposable PostgreSQL stop could not be verified.", data, log);
    }
  }

  function cleanup() {
    if (disposed) return;
    stop();
    try { rmSync(temp, { recursive: true }); }
    catch (error) { throw recoveryError("Could not remove the stopped PostgreSQL test cluster.", data, log, error); }
    disposed = true;
  }

  async function start(initial = false) {
    if (disposed) throw new Error("Cannot restart a cleaned-up PostgreSQL test cluster.");
    if (clusterState(data) !== "stopped") {
      throw recoveryError("PostgreSQL test cluster is already running or its state is unknown.", data, log);
    }
    const attempts = initial ? 3 : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (initial) port = await freePort();
      const offset = logSize(log);
      startupAttempted = true;
      try {
        execFileSync("pg_ctl", ["-D", data, "-l", log, "-o",
          `-h localhost -p ${port}`, "-w", "start"], { stdio: "pipe" });
        if (clusterState(data) !== "running") {
          throw new Error("pg_ctl reported startup, but the cluster is not verifiably running.");
        }
        return;
      } catch (error) {
        const currentLog = logSince(log, offset);
        const failure = new Error(`Disposable PostgreSQL startup failed on port ${port}:\n${currentLog}`, { cause: error });
        const state = clusterState(data);
        if (state === "running") {
          try { stop(); }
          catch (stopError) { throw new AggregateError([failure, stopError],
            `PostgreSQL startup failed and the cluster may still be running; data: ${data}; log: ${log}`); }
        } else if (state !== "stopped") {
          throw new AggregateError([failure, recoveryError("Startup left an unknown cluster state.", data, log)],
            `PostgreSQL startup failed and its state is unknown; data: ${data}; log: ${log}`);
        }
        if (initial && attempt + 1 < attempts && /address already in use/i.test(currentLog)) continue;
        throw failure;
      }
    }
  }

  try {
    execFileSync("initdb", ["-D", data, "-A", "trust", "--no-instructions"], { stdio: "pipe" });
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
      "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost",
      "-keyout", key, "-out", cert], { stdio: "pipe" });
    chmodSync(key, 0o600);
    writeFileSync(join(data, "postgresql.conf"),
      `\nssl = on\nssl_cert_file = '${cert}'\nssl_key_file = '${key}'\nunix_socket_directories = '${temp}'\n`, { flag: "a" });
    await start(true);
    return { temp, data, log, cert, ca: readFileSync(cert, "utf8"), port,
      start: () => start(false), stop, cleanup };
  } catch (error) {
    if (!startupAttempted) {
      try { rmSync(temp, { recursive: true }); }
      catch (cleanupError) { throw new AggregateError([error, cleanupError],
        `PostgreSQL setup and cleanup failed; data: ${data}; log: ${log}`); }
      throw error;
    }
    try { cleanup(); }
    catch (cleanupError) { throw new AggregateError([error, cleanupError],
      `PostgreSQL setup and cleanup failed; data: ${data}; log: ${log}`); }
    throw error;
  }
}
