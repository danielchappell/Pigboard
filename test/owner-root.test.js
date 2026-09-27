import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { OWNER_TARGET, checkOwnerPin, connectOwner, OwnerError,
  parseOwnerUrl, readOwnerUrlFile } from "../src/hosted/owner-root.js";

function urlFor(target = OWNER_TARGET, password = "owner-private-password") {
  return `postgresql://${target.role}:${password}@${target.host}:${target.port}/${target.database}?sslmode=require`;
}

test("owner pin is distinct from runtime pin and refuses a child, pooler, or role change", () => {
  assert.equal(checkOwnerPin(), true);
  for (const change of [
    { host: "ep-child.example.neon.tech" },
    { host: OWNER_TARGET.host.replace(".c-6.", "-pooler.c-6.") },
    { role: "pigboard_app" },
    { branchId: "another-branch" }
  ]) {
    assert.throws(() => checkOwnerPin({ ...OWNER_TARGET, ...change }),
      { reason: "owner_pin_mismatch" });
  }
  assert.equal(parseOwnerUrl(urlFor()).user, "pigboard_owner");
  assert.throws(() => parseOwnerUrl(urlFor({ ...OWNER_TARGET, host: "child.invalid" })),
    { reason: "owner_target_mismatch" });
  for (const suffix of ["&channel_binding=require", "&sslmode=require", "#fragment"]) {
    assert.throws(() => parseOwnerUrl(urlFor() + suffix), { reason: "invalid_owner_url" });
  }
});

test("owner URL must be a protected regular local file beneath a private directory", () => {
  const dir = mkdtempSync(join(tmpdir(), "pigboard-owner-root-"));
  const file = join(dir, "owner.url");
  try {
    chmodSync(dir, 0o700);
    writeFileSync(file, `${urlFor()}\n`, { mode: 0o600 });
    assert.equal(readOwnerUrlFile(file), urlFor());
    chmodSync(file, 0o644);
    assert.throws(() => readOwnerUrlFile(file), { reason: "unsafe_owner_url_file" });
    chmodSync(file, 0o600);
    symlinkSync(file, join(dir, "linked.url"));
    assert.throws(() => readOwnerUrlFile(join(dir, "linked.url")),
      { reason: "unsafe_owner_url_file" });
    chmodSync(dir, 0o755);
    assert.throws(() => readOwnerUrlFile(file), { reason: "unsafe_owner_url_file" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the owner client verifies TLS and session identity without returning a password", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pigboard-owner-connect-"));
  const file = join(dir, "owner.url");
  chmodSync(dir, 0o700);
  writeFileSync(file, urlFor(), { mode: 0o600 });
  let config;
  let ended = false;
  const queries = [];
  class RecordingClient {
    constructor(value) { config = value; }
    async connect() {}
    async query(sql) { queries.push(sql); return { rows: [{ role: OWNER_TARGET.role,
      database: OWNER_TARGET.database, ssl: true }] }; }
    async end() { ended = true; }
  }
  try {
    const client = await connectOwner(file, { ClientClass: RecordingClient });
    assert.ok(queries.includes("SET search_path = pg_catalog, public"));
    assert.equal(config.ssl.rejectUnauthorized, true);
    assert.equal(config.ssl.servername, OWNER_TARGET.host);
    assert.equal(config.enableChannelBinding, true);
    assert.equal(config.connectionString, undefined);
    await client.end();
    assert.equal(ended, true);
    class WrongIdentity extends RecordingClient {
      async query() { return { rows: [{ role: "pigboard_app",
        database: OWNER_TARGET.database, ssl: true }] }; }
    }
    await assert.rejects(connectOwner(file, { ClientClass: WrongIdentity }),
      { reason: "owner_identity_mismatch" });
    class BadTLS extends RecordingClient {
      async connect() { throw new Error("owner-private-password"); }
    }
    await assert.rejects(connectOwner(file, { ClientClass: BadTLS }),
      (error) => error instanceof OwnerError &&
        error.reason === "owner_connection_unverified" &&
        !error.message.includes("owner-private-password"));
    writeFileSync(file, urlFor({ ...OWNER_TARGET, host: "child.invalid" }), { mode: 0o600 });
    let constructed = 0;
    class NeverConnect { constructor() { constructed += 1; } }
    await assert.rejects(connectOwner(file, { ClientClass: NeverConnect }),
      { reason: "owner_target_mismatch" });
    assert.equal(constructed, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
