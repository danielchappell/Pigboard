import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { ROOT_TARGET } from "../src/hosted/root-target.js";

function run(args, secret) {
  return spawnSync(process.execPath, ["scripts/run-pigboard-host.mjs", ...args], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, PIGBOARD_NEON_URL: secret },
    encoding: "utf8",
    timeout: 3_000
  });
}

test("the operator diagnostic refuses a child target with safe structured output", () => {
  const password = "do-not-print-this-password";
  const secret = `postgresql://${ROOT_TARGET.role}:${password}@ep-hidden-feather-b2qm5pb0.c-6.eu-central-1.aws.neon.tech:${ROOT_TARGET.port}/${ROOT_TARGET.database}?sslmode=require`;
  const result = run(["--diagnose-root"], secret);
  assert.equal(result.status, 1);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.checks[0].reason, "target_mismatch");
  assert.deepEqual(parsed.omissions, ["connection", "identity", "tls"]);
  assert.equal(`${result.stdout}${result.stderr}`.includes(password), false);
});

test("the host fails closed on a missing secret without echoing input", () => {
  const result = run([], "not-a-private-postgres-url");
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stderr).check.reason, "invalid_secret");
  assert.equal(`${result.stdout}${result.stderr}`.includes("not-a-private-postgres-url"), false);
});

test("unexpected CLI arguments fail with usage, without using the secret", () => {
  const result = run(["--unsafe"], "top-secret");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage:/);
  assert.equal(`${result.stdout}${result.stderr}`.includes("top-secret"), false);
});
