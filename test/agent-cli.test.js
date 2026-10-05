import assert from "node:assert/strict";
import * as fs from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { prepareAgentCredential } from "../src/hosted/authority-bootstrap.js";
import { runAgentCommand } from "../scripts/manage-pigboard-agent.mjs";
import { OwnerError } from "../src/hosted/owner-root.js";

function withHome(run) {
  const home = fs.mkdtempSync(join(tmpdir(), "pigboard-agent-home-"));
  fs.chmodSync(home, 0o700);
  try { return run(home); } finally { fs.rmSync(home, { recursive: true, force: true }); }
}

test("managed immutable intent is synced before use and exact retry retains UUID/token", () => {
  withHome((home) => {
    const events = [];
    const intent = prepareAgentCredential({ home, ops: { ...fs,
      writeSync: (fd, bytes, offset, length) => {
        events.push("write");
        return fs.writeSync(fd, bytes, offset, Math.min(length, 9));
      }, fsyncSync: (fd) => { events.push("sync"); return fs.fsyncSync(fd); }
    } });
    assert.equal(events.at(-1), "sync");
    assert.ok(events.filter((event) => event === "write").length > 1);
    assert.equal(intent.localStatus, "prepared_locally");
    assert.match(intent.principalId, /^[0-9a-f-]{36}$/u);
    assert.equal(fs.readFileSync(intent.credentialFile, "utf8"), `${intent.token}\n`);
    assert.equal(fs.statSync(intent.credentialFile).mode & 0o777, 0o600);
    assert.equal(fs.statSync(join(home, ".config/pigboard/agent-credentials")).mode & 0o777, 0o700);
    const retry = prepareAgentCredential({ home, credentialFile: intent.credentialFile });
    assert.equal(retry.localStatus, "read_existing");
    assert.equal(retry.principalId, intent.principalId);
    assert.equal(retry.token, intent.token);
    assert.equal(fs.readdirSync(join(home, ".config/pigboard/agent-credentials")).length, 1);
    const readOnly = prepareAgentCredential({ home, credentialFile: intent.credentialFile,
      durable: false, ops: { ...fs, fsyncSync: () => { throw new Error("read-only inspection must not sync"); } } });
    assert.equal(readOnly.token, intent.token);
  });
});

test("missing, partial, malformed and unsafe managed files cannot become new intents", () => {
  withHome((home) => {
    const intent = prepareAgentCredential({ home });
    const file = intent.credentialFile;
    const original = fs.readFileSync(file);
    for (const value of ["partial", `${intent.token}X`, `pb1_${"!".repeat(43)}\n`, `${intent.token}\n\n`]) {
      fs.writeFileSync(file, value);
      assert.throws(() => prepareAgentCredential({ home, credentialFile: file }),
        (error) => ["unsafe_credential_file", "invalid_credential_file"].includes(error.reason));
    }
    fs.writeFileSync(file, original);
    fs.chmodSync(file, 0o644);
    assert.throws(() => prepareAgentCredential({ home, credentialFile: file }), { reason: "unsafe_credential_file" });
    fs.chmodSync(file, 0o600);
    const saved = `${file}.saved`;
    fs.renameSync(file, saved);
    assert.throws(() => prepareAgentCredential({ home, credentialFile: file }), { reason: "credential_file_missing" });
    assert.equal(fs.existsSync(file), false);
    fs.symlinkSync(saved, file);
    assert.throws(() => prepareAgentCredential({ home, credentialFile: file }), { reason: "unsafe_credential_file" });
    fs.unlinkSync(file); fs.linkSync(saved, file);
    assert.throws(() => prepareAgentCredential({ home, credentialFile: file }), { reason: "unsafe_credential_file" });
    fs.unlinkSync(file); fs.renameSync(saved, file);
    assert.throws(() => prepareAgentCredential({ home, credentialFile: file.replace("agent-", "caller-") }),
      { reason: "unsafe_credential_file" });
    assert.throws(() => prepareAgentCredential({ home, credentialFile: file,
      ops: { ...fs, fstatSync: (fd) => ({ ...fs.fstatSync(fd), uid: process.getuid() + 1,
        isFile: () => true }) } }), { reason: "unsafe_credential_file" });
    const directory = join(home, ".config/pigboard/agent-credentials");
    fs.chmodSync(directory, 0o755);
    assert.throws(() => prepareAgentCredential({ home, credentialFile: file }), { reason: "unsafe_credential_directory" });
  });
});

test("file or parent substitution during read is refused without silently overwriting", () => {
  withHome((home) => {
    const intent = prepareAgentCredential({ home });
    const directory = join(home, ".config/pigboard/agent-credentials");
    const previous = `${directory}-previous`;
    let replaced = false;
    assert.throws(() => prepareAgentCredential({ home, credentialFile: intent.credentialFile,
      ops: { ...fs, readSync: (...args) => {
        const result = fs.readSync(...args);
        if (!replaced) {
          replaced = true;
          fs.renameSync(directory, previous); fs.mkdirSync(directory, { mode: 0o700 });
          fs.writeFileSync(intent.credentialFile, `${intent.token}\n`, { mode: 0o600 });
        }
        return result;
      } }
    }), { reason: "unsafe_credential_file" });
    assert.equal(fs.readFileSync(join(previous, intent.credentialFile.split("/").at(-1)), "utf8"), `${intent.token}\n`);
  });
  withHome((home) => {
    const intent = prepareAgentCredential({ home });
    let swapped = false;
    assert.throws(() => prepareAgentCredential({ home, credentialFile: intent.credentialFile,
      ops: { ...fs, openSync: (...args) => {
        if (!swapped) {
          swapped = true;
          fs.renameSync(intent.credentialFile, `${intent.credentialFile}.original`);
          fs.writeFileSync(intent.credentialFile, `${intent.token}\n`, { mode: 0o600 });
        }
        return fs.openSync(...args);
      } }
    }), { reason: "unsafe_credential_file" });
  });
});

test("read-only status cannot create missing custody directories", () => {
  withHome((home) => {
    assert.throws(() => prepareAgentCredential({ home, durable: false,
      credentialFile: join(home, ".config/pigboard/agent-credentials/agent-00000000-0000-4000-8000-000000000000.token") }),
    { reason: "unsafe_credential_directory" });
    assert.equal(fs.existsSync(join(home, ".config")), false);
  });
});

test("CLI help and exact flags require no connection; owner errors never leak raw text", async () => {
  const lines = [];
  const output = (line) => lines.push(line);
  let opened = 0;
  const openConnection = async () => { opened++; throw new OwnerError("owner_target_mismatch"); };
  for (const args of [["--help"], ["enroll", "--help"], ["status", "--help"], ["revoke", "--help"]]) {
    assert.equal(await runAgentCommand(args, { output, openConnection }), 0);
    assert.match(lines.pop(), /same credential file/i);
  }
  const base = ["--owner-url-file", "/private/owner.url"];
  for (const args of [[], ["list", ...base], ["revoke", ...base], ["enroll", ...base, "--name", "other"],
    ["enroll", ...base, "--expect-generation", "1"], ["status", ...base, ...base],
    ["status", ...base, "--format", "xml"], ["status", ...base, "--principal-id", "bad"],
    ["status", ...base, "--principal-id", "00000000-0000-4000-8000-000000000000", "--credential-file", "/private/file"],
    ["status", ...base, "--format"]]) {
    assert.equal(await runAgentCommand(args, { output, openConnection }), 2);
    assert.equal(JSON.parse(lines.pop()).reason, "invalid_usage");
  }
  assert.equal(opened, 0);
  assert.equal(await runAgentCommand(["status", ...base, "--format", "json"], { output, openConnection }), 1);
  const failed = JSON.parse(lines.pop());
  assert.equal(failed.reason, "owner_target_mismatch");
  assert.equal(failed.authority, null);
  assert.ok(failed.nextAction);
  assert.equal(await runAgentCommand(["status", ...base, "--format", "json"], { output,
    openConnection: async () => { throw new Error("SECRET_DRIVER_URL_AND_TOKEN"); } }), 1);
  const unknown = lines.pop();
  assert.doesNotMatch(unknown, /SECRET_DRIVER/);
  assert.equal(JSON.parse(unknown).status, "unknown");
  assert.ok(JSON.parse(unknown).omissions.includes("current_authority_unverified"));
});

test("zero-progress write and fsync failure stop before SQL and retain partial files", async () => {
  for (const failingOps of [
    { writeSync: () => 0 },
    { fsyncSync: () => { throw new Error("sync failure"); } }
  ]) {
    const home = fs.mkdtempSync(join(tmpdir(), "pigboard-agent-failure-"));
    fs.chmodSync(home, 0o700);
    try {
      let queries = 0;
      const lines = [];
      assert.equal(await runAgentCommand(["enroll", "--owner-url-file", "/private/file", "--format", "json"], {
        home, output: (line) => lines.push(line),
        prepareCredential: (options) => prepareAgentCredential({ ...options, ops: { ...fs, ...failingOps } }),
        openConnection: async () => ({ query: async () => { queries++; }, end: async () => {} })
      }), 1);
      assert.equal(queries, 0);
      assert.equal(JSON.parse(lines[0]).local.status, "unverified");
      assert.equal(JSON.parse(lines[0]).authority, null);
      assert.equal(fs.readdirSync(join(home, ".config/pigboard/agent-credentials")).length, 1);
      assert.doesNotMatch(lines[0], /pb1_|digest|sync failure/);
    } finally { fs.rmSync(home, { recursive: true, force: true }); }
  }
});

test("a durable prepared intent remains visible when SQL cannot be verified", async () => {
  const home = fs.mkdtempSync(join(tmpdir(), "pigboard-agent-sql-failure-"));
  fs.chmodSync(home, 0o700);
  try {
    let synced = false;
    const lines = [];
    assert.equal(await runAgentCommand(["enroll", "--owner-url-file", "/private/file", "--format", "json"], {
      home, output: (line) => lines.push(line),
      prepareCredential: (options) => {
        const result = prepareAgentCredential(options); synced = true; return result;
      }, openConnection: async () => ({ query: async () => {
        assert.equal(synced, true); throw new Error("raw-driver-secret");
      }, end: async () => {} })
    }), 1);
    const result = JSON.parse(lines[0]);
    assert.equal(result.status, "refused");
    assert.equal(result.local.status, "prepared_locally");
    assert.ok(fs.existsSync(result.local.credentialFile));
    assert.doesNotMatch(lines[0], /pb1_|raw-driver-secret|"token"|"digest"/);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});
