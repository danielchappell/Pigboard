import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync, chmodSync, symlinkSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ROOT_TARGET } from "../src/hosted/root-target.js";
import { buildPsqlInvocation, checkPassfile, evaluateSnapshot,
  formatPreflightText, runPreflight } from "../src/hosted/neon-preflight.js";

const command = fileURLToPath(new URL("../scripts/check-neon-root.mjs", import.meta.url));
const goodSnapshot = {
  user: ROOT_TARGET.role, database: ROOT_TARGET.database,
  ssl: { enabled: true, version: "TLSv1.3" },
  role: { login: true, superuser: false, createdb: false, createrole: false,
    replication: false, bypassrls: false },
  otherRoleMembership: false, dbConnect: true, dbCreate: false,
  schemas: [{ name: "public", usage: true, create: false }],
  fixtureExists: true,
  fixture: { select: true, insert: true, update: false, delete: false,
    truncate: false, references: false, trigger: false, maintain: false }
};

function fakeSpawn(snapshot = goodSnapshot, capture = () => {}) {
  return (executable, args, options) => {
    capture({ executable, args, options });
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stderr.resume = () => {};
    child.kill = () => {};
    queueMicrotask(() => {
      child.stdout.emit("data", Buffer.from(`${JSON.stringify(snapshot)}\n`));
      child.emit("close", 0, null);
    });
    return child;
  };
}

function fakeChild(onStart) {
  return () => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stderr.resume = () => {};
    child.kill = () => { child.killed = true; };
    queueMicrotask(() => onStart(child));
    return child;
  };
}

function privateMetadata() {
  return { isFile: () => true, isSymbolicLink: () => false, uid: 12, mode: 0o600 };
}

test("private passfile policy rejects missing, broad, symlink and wrong-owner files", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "pig-neon-passfile-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "pgpass");
  writeFileSync(file, "secret-must-never-print", { mode: 0o600 });
  assert.equal(checkPassfile(file).status, "pass");
  assert.equal(checkPassfile(join(dir, "missing")).reason, "passfile_unavailable");
  chmodSync(file, 0o644);
  assert.equal(checkPassfile(file).reason, "passfile_not_private");
  chmodSync(file, 0o600);
  chmodSync(file, 0o700);
  assert.equal(checkPassfile(file).reason, "passfile_not_private");
  chmodSync(file, 0o400);
  assert.equal(checkPassfile(file).status, "pass");
  chmodSync(file, 0o600);
  const link = join(dir, "link");
  symlinkSync(file, link);
  assert.equal(checkPassfile(link).reason, "passfile_not_private");
  assert.equal(checkPassfile(file, { uid: process.getuid() + 1 }).reason, "passfile_not_private");
  assert.equal(checkPassfile("relative.pgpass").reason, "invalid_passfile");
});

test("psql invocation pins host and TLS without inherited PG secrets", () => {
  const invocation = buildPsqlInvocation("/tmp/pigboard-private", { pathEnv: "/bin" });
  assert.equal(invocation.executable, "psql");
  assert.deepEqual(invocation.options.env, {
    PATH: "/bin", LANG: "C", PGPASSFILE: "/tmp/pigboard-private",
    PGSSLMODE: "verify-full", PGSSLROOTCERT: "system", PGGSSENCMODE: "disable",
    PGCONNECT_TIMEOUT: "10"
  });
  assert.equal(invocation.options.shell, false);
  for (const value of [ROOT_TARGET.host, ROOT_TARGET.database, ROOT_TARGET.role]) {
    assert.ok(invocation.args.includes(value));
  }
  assert.ok(!JSON.stringify(invocation).includes("secret-must-never-print"));
});

test("effective CREATE and inherited privilege violations cannot pass", () => {
  assert.ok(evaluateSnapshot(goodSnapshot).every((item) => item.status === "pass"));
  const database = evaluateSnapshot({ ...goodSnapshot, dbCreate: true });
  assert.equal(database.find((item) => item.id === "database_privileges").status, "fail");
  const schema = evaluateSnapshot({ ...goodSnapshot,
    schemas: [...goodSnapshot.schemas, { name: "pgx", usage: true, create: true }] });
  assert.equal(schema.find((item) => item.id === "schema_privileges").status, "fail");
  const member = evaluateSnapshot({ ...goodSnapshot, otherRoleMembership: true });
  assert.equal(member.find((item) => item.id === "role_membership").status, "fail");
  const trigger = evaluateSnapshot({ ...goodSnapshot,
    fixture: { ...goodSnapshot.fixture, trigger: true } });
  assert.equal(trigger.find((item) => item.id === "fixture_grants").status, "fail");
  const missing = evaluateSnapshot({ ...goodSnapshot, fixtureExists: false, fixture: null });
  assert.equal(missing.find((item) => item.id === "fixture_grants").status, "unverified");
});

test("child target is refused before passfile access or process launch", async () => {
  let calls = 0;
  const report = await runPreflight({
    targetHost: "ep-hidden-feather-b2qm5pb0.c-6.eu-central-1.aws.neon.tech",
    passfile: "/unused",
    lstat: () => { calls += 1; throw new Error("unexpected file access"); },
    spawnCommand: () => { calls += 1; throw new Error("unexpected spawn"); }
  });
  assert.equal(calls, 0);
  assert.equal(report.status, "fail");
  assert.equal(report.checks[0].reason, "target_mismatch");
  assert.ok(report.omissions.includes("connection"));
});

test("complete check gives one safe JSON/text result; partial report is unverified", async () => {
  let invocation;
  const report = await runPreflight({ passfile: "/private/pgpass", uid: 12,
    lstat: () => ({ isFile: () => true, isSymbolicLink: () => false, uid: 12, mode: 0o600 }),
    spawnCommand: fakeSpawn(goodSnapshot, (value) => { invocation = value; }), pathEnv: "/bin" });
  assert.equal(report.status, "pass");
  assert.deepEqual(report.omissions, []);
  assert.equal(report.checks.length, 10);
  assert.equal(invocation.options.env.PGPASSFILE, "/private/pgpass");
  const human = formatPreflightText(report);
  assert.match(human, /PASS root_target/);
  assert.match(human, /Omissions: none/);
  assert.ok(!human.includes("secret-must-never-print"));
  const partial = await runPreflight({ passfile: "/private/pgpass", uid: 12,
    lstat: () => ({ isFile: () => true, isSymbolicLink: () => false, uid: 12, mode: 0o600 }),
    spawnCommand: fakeSpawn({ ...goodSnapshot, ssl: null }) });
  assert.equal(partial.status, "unverified");
  assert.ok(partial.omissions.includes("tls"));
});

test("connection failure and usage never disclose a supplied secret", async () => {
  const report = await runPreflight({ passfile: "/private/secret-must-never-print", uid: 12,
    lstat: () => ({ isFile: () => true, isSymbolicLink: () => false, uid: 12, mode: 0o600 }),
    spawnCommand: () => { throw new Error("secret-must-never-print"); } });
  assert.equal(report.status, "fail");
  assert.equal(report.checks.find((item) => item.id === "connection").reason, "client_unavailable");
  assert.ok(!JSON.stringify(report).includes("secret-must-never-print"));
  const invalid = spawnSync(process.execPath, [command, "--passfile", "/private/secret-must-never-print", "--wat"],
    { encoding: "utf8", env: { PATH: "/bin", LANG: "C" }, timeout: 10000 });
  assert.equal(invalid.status, 2);
  assert.equal(invalid.stderr, "");
  assert.ok(!invalid.stdout.includes("secret-must-never-print"));
  const invalidJson = spawnSync(process.execPath,
    [command, "--format", "json", "--passfile", "/private/secret-must-never-print", "--wat"],
    { encoding: "utf8", env: { PATH: "/bin", LANG: "C" }, timeout: 10000 });
  assert.equal(invalidJson.status, 2);
  assert.equal(JSON.parse(invalidJson.stdout).checks[0].reason, "invalid_usage");
  assert.ok(!invalidJson.stdout.includes("secret-must-never-print"));
});

test("nonzero psql, timeout and oversized output fail closed with named omissions", async () => {
  const options = { passfile: "/private/pgpass", uid: 12, lstat: privateMetadata };
  const nonzero = await runPreflight({ ...options,
    spawnCommand: fakeChild((child) => child.emit("close", 2, null)) });
  assert.equal(nonzero.status, "fail");
  assert.equal(nonzero.checks.find((item) => item.id === "connection").reason, "connection_failed");
  assert.ok(nonzero.omissions.includes("fixture_grants"));

  let timedOutChild;
  const timeout = await runPreflight({ ...options, timeoutMs: 5,
    spawnCommand: fakeChild((child) => { timedOutChild = child; }) });
  assert.equal(timeout.status, "fail");
  assert.equal(timeout.checks.find((item) => item.id === "connection").reason, "client_timeout");
  assert.equal(timedOutChild.killed, true);

  let largeChild;
  const oversized = await runPreflight({ ...options,
    spawnCommand: fakeChild((child) => {
      largeChild = child;
      child.stdout.emit("data", Buffer.alloc(65_537, 0x20));
    }) });
  assert.equal(oversized.status, "fail");
  assert.equal(oversized.checks.find((item) => item.id === "connection").reason, "client_output_too_large");
  assert.equal(largeChild.killed, true);
  assert.ok(!JSON.stringify(oversized).includes(" ".repeat(1024)));
});
