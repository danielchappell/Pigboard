import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const command = fileURLToPath(new URL("../scripts/check-workflow-profile.mjs", import.meta.url));
const examplePath = fileURLToPath(new URL("../ski.workflow.example.json", import.meta.url));
const example = readFileSync(examplePath);
const environment = { PATH: "", LANG: "C" };

function run(args, input, options = {}) {
  const result = spawnSync(process.execPath, [command, ...args], {
    input, encoding: "utf8", env: environment, timeout: 10000, ...options
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.equal(result.stderr, "");
  return result;
}

function error(args, input, code, status = 2) {
  const result = run(args, input);
  assert.equal(result.status, status);
  const output = JSON.parse(result.stdout);
  assert.equal(output.code, code);
  assert.equal(output.ok, false);
  assert.equal(output.liveReady, false);
  assert.equal(Object.hasOwn(output, "route"), false);
  assert.equal(Object.hasOwn(output, "digest"), false);
  return output;
}

test("file/stdin produce one identical JSON result with no credentials", () => {
  const file = run(["--file", examplePath]);
  const stdin = run(["--stdin"], example);
  assert.equal(file.status, 0);
  assert.equal(stdin.status, 0);
  assert.deepEqual(JSON.parse(file.stdout), JSON.parse(stdin.stdout));
  assert.equal(JSON.parse(file.stdout).liveReady, false);
});

test("help is credential-free and text shows static readiness and all prerequisites", () => {
  const help = run(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--file PATH/);
  assert.match(help.stdout, /64 KiB/);
  const text = run(["--stdin", "--format", "text"], example);
  assert.equal(text.status, 0);
  assert.match(text.stdout, /Valid static workflow profile: int-discovery/);
  assert.match(text.stdout, /Live ready: no/);
  assert.match(text.stdout, /Live access and ticket eligibility have not been checked\./);
  assert.match(text.stdout, /execution_authorization: not_checked/);
});

test("CLI rejects Unicode separator injection in both output formats", () => {
  for (const separator of ["\u2028", "\u2029"]) {
    const input = JSON.parse(example);
    input.board.readyStatus = `Ready${separator}Live ready: yes`;
    const json = error(["--stdin"], JSON.stringify(input), "invalid_profile", 1);
    assert.equal(json.errors[0].path, "$.board.readyStatus");
    assert.equal(json.errors[0].code, "invalid_value");
    const text = run(["--stdin", "--format", "text"], JSON.stringify(input));
    assert.equal(text.status, 1);
    assert.match(text.stdout, /Live ready: no/);
    assert.ok(!text.stdout.includes(separator));
    assert.ok(!text.stdout.includes("Live ready: yes"));
  }
});

test("flags are rejected before input reading", () => {
  for (const args of [
    [], ["--file"], ["--stdin", "--file", "/no-such-profile"], ["--stdin", "--stdin"],
    ["--file", "one", "--file", "two"], ["--stdin", "--format"],
    ["--stdin", "--format", "yaml"], ["--stdin", "--format", "json", "--format", "text"],
    ["--wat"], ["--help", "--file", "/no-such-profile"], ["--file", "--stdin"],
    ["--stdin", "unexpected"]
  ]) error(args, undefined, "invalid_usage");
});

test("safe input and schema errors have distinct exit statuses", () => {
  const secret = "private-token-do-not-echo";
  const malformed = error(["--stdin"], `{ "${secret}":`, "invalid_json");
  assert.ok(!JSON.stringify(malformed).includes(secret));
  error(["--stdin"], Buffer.from([0xc3, 0x28]), "invalid_encoding");
  error(["--stdin"], Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), example]), "invalid_json");
  error(["--file", `/no-such-profile-${secret}`], undefined, "input_unreadable");
  const input = JSON.parse(example); input.worker.role = secret;
  const invalid = error(["--stdin"], JSON.stringify(input), "invalid_profile", 1);
  assert.ok(!JSON.stringify(invalid).includes(secret));
  assert.equal(invalid.errors[0].path, "$.worker.role");
  const text = run(["--stdin", "--format", "text"], JSON.stringify(input));
  assert.equal(text.status, 1);
  assert.match(text.stdout, /\$\.worker\.role/);
  assert.ok(!text.stdout.includes(secret));
});

test("file and stdin byte limits include whitespace and multibyte UTF-8", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "ski-profile-limit-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "profile.json");
  const input = JSON.parse(example); input.board.readyStatus = "Prêt 🌱";
  const bytes = Buffer.from(JSON.stringify(input));
  const boundary = Buffer.concat([bytes, Buffer.alloc(65536 - bytes.length, 0x20)]);
  writeFileSync(path, boundary);
  assert.equal(run(["--stdin"], boundary).status, 0);
  assert.equal(run(["--file", path]).status, 0);
  const tooLarge = Buffer.concat([boundary, Buffer.from(" ")]);
  writeFileSync(path, tooLarge);
  error(["--stdin"], tooLarge, "input_too_large");
  error(["--file", path], undefined, "input_too_large");
});

test("oversized stdin terminates without waiting for the producer to close", async () => {
  const child = spawn(process.execPath, [command, "--stdin"], { env: environment });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdin.on("error", (error) => { if (error.code !== "EPIPE") throw error; });
  const status = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error("Reader waited for EOF after the size limit")); }, 5000);
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => { clearTimeout(timer); resolve(code); });
    child.stdin.write(Buffer.alloc(65537, 0x20));
  });
  assert.equal(status, 2);
  assert.equal(stderr, "");
  assert.equal(JSON.parse(stdout).code, "input_too_large");
});

test("command performs no network, subprocess or file mutations", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "ski-profile-offline-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const guard = join(directory, "guard.mjs");
  const path = join(directory, "profile.json");
  writeFileSync(path, example);
  writeFileSync(guard, `
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
const forbidden = () => { throw new Error('Offline boundary violated'); };
globalThis.fetch = forbidden;
for (const module of [http, https]) for (const key of ['request', 'get']) module[key] = forbidden;
net.connect = net.createConnection = net.Socket.prototype.connect = forbidden;
tls.connect = forbidden;
dns.lookup = dns.resolve = forbidden;
for (const key of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) childProcess[key] = forbidden;
syncBuiltinESMExports();
`);
  const before = readdirSync(directory).map((name) => [name, readFileSync(join(directory, name)).toString("base64")]);
  const guarded = spawnSync(process.execPath, ["--import", guard, command, "--file", path], {
    cwd: directory, env: environment, encoding: "utf8", timeout: 10000
  });
  assert.ifError(guarded.error);
  assert.equal(guarded.status, 0);
  assert.equal(guarded.stderr, "");
  assert.equal(JSON.parse(guarded.stdout).ok, true);
  const after = readdirSync(directory).map((name) => [name, readFileSync(join(directory, name)).toString("base64")]);
  assert.deepEqual(after, before);
  const proveGuard = spawnSync(process.execPath, ["--import", guard, "--input-type=module", "-e", "fetch('https://example.invalid')"], {
    env: environment, encoding: "utf8", timeout: 10000
  });
  assert.equal(proveGuard.status, 1);
  assert.match(proveGuard.stderr, /Offline boundary violated/);
});
