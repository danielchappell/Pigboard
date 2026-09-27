import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, readFileSync, renameSync,
  rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { AuthorityError, deliverCredential, prepareCredentialDirectory,
  preflightCredentialTarget } from "../src/hosted/authority-bootstrap.js";
import { OwnerError } from "../src/hosted/owner-root.js";
import { runOwnerCommand } from "../scripts/bootstrap-pigboard-owner.mjs";

test("owner command gives bounded help, usage, and connection failures", async () => {
  const lines = [];
  const output = (line) => lines.push(line);
  assert.equal(await runOwnerCommand(["--help"], { output }), 0);
  assert.match(lines.pop(), /inspect before retrying/i);
  assert.equal(await runOwnerCommand(["migrate", "--help"], { output }), 0);
  assert.match(lines.pop(), /owner:migrate/);
  assert.equal(await runOwnerCommand(["recover", "--owner-url-file", "/private/file",
    "--name", "New"], { output }), 2);
  assert.equal(JSON.parse(lines.pop()).status, "invalid_usage");
  assert.equal(await runOwnerCommand(["inspect", "--owner-url-file", "/private/file",
    "--format", "json"], {
    output,
    openConnection: async () => { throw new OwnerError("owner_target_mismatch"); }
  }), 1);
  assert.deepEqual(JSON.parse(lines.pop()), {
    status: "owner_target_mismatch",
    nextAction: "Compare the private URL target with the reviewed owner pin; do not use a child, pooler or runtime role."
  });
  assert.equal(await runOwnerCommand(["inspect", "--owner-url-file", "/private/file",
    "--format", "json"], {
    output,
    openConnection: async () => { throw new OwnerError("owner_connection_unverified"); }
  }), 1);
  assert.match(JSON.parse(lines.pop()).nextAction, /Check Neon availability/);
});

test("a credential is delivered only into the original private directory", () => {
  const home = mkdtempSync(join(tmpdir(), "pigboard-owner-home-"));
  try {
    chmodSync(home, 0o700);
    const prepared = prepareCredentialDirectory(home);
    const path = preflightCredentialTarget(prepared, 1);
    assert.equal(existsSync(path), false);
    const token = "pb1_" + "A".repeat(43);
    assert.equal(deliverCredential(prepared, 1, token), path);
    assert.equal(readFileSync(path, "utf8"), `${token}\n`);
    assert.throws(() => preflightCredentialTarget(prepared, 1),
      { reason: "credential_file_exists" });
    assert.throws(() => deliverCredential(prepared, 1, token),
      { reason: "credential_undelivered" });
    const old = `${prepared.directory}-old`;
    renameSync(prepared.directory, old);
    const replaced = prepareCredentialDirectory(home);
    assert.notEqual(replaced.identity.ino, prepared.identity.ino);
    assert.throws(() => deliverCredential(prepared, 2, token),
      { reason: "credential_undelivered" });
    assert.equal(existsSync(join(replaced.directory, "owner-generation-2.token")), false);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("an unsafe home and existing output never receive a secret", () => {
  const home = mkdtempSync(join(tmpdir(), "pigboard-owner-unsafe-"));
  try {
    chmodSync(home, 0o777);
    assert.throws(() => prepareCredentialDirectory(home),
      (error) => error instanceof AuthorityError && error.reason === "unsafe_credential_directory");
    chmodSync(home, 0o700);
    const prepared = prepareCredentialDirectory(home);
    const path = join(prepared.directory, "owner-generation-1.token");
    writeFileSync(path, "existing", { mode: 0o600 });
    assert.throws(() => preflightCredentialTarget(prepared, 1),
      { reason: "credential_file_exists" });
    assert.equal(readFileSync(path, "utf8"), "existing");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
