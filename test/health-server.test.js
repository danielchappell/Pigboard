import assert from "node:assert/strict";
import { test } from "node:test";
import { startHealthServer } from "../src/hosted/health-server.js";
import { deniedGrant } from "../src/hosted/authority-self.js";

test("private liveness works without a database secret or database call", async () => {
  const server = await startHealthServer({ host: "127.0.0.1", port: 0 });
  try {
    const { port } = server.address();
    const live = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { schemaVersion: 1, status: "live" });
    assert.equal(live.headers.get("cache-control"), "no-store");
    const other = await fetch(`http://127.0.0.1:${port}/admin?secret=x`);
    assert.equal(other.status, 404);
    assert.equal(await other.text(), "");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("private owner inspection authenticates once and separates denial from outage", async () => {
  const token = `pb1_${"A".repeat(43)}`;
  let calls = 0;
  const server = await startHealthServer({ host: "127.0.0.1", port: 0,
    inspectSelf: async (provided) => {
      calls += 1;
      assert.equal(provided, token);
      return { schemaVersion: 1, status: "ok", team: "pilot", generation: 1,
        principal: { id: "p1", name: "First Owner", kind: "human" },
        grants: ["owner", "connection_admin"] };
    } });
  try {
    const url = `http://127.0.0.1:${server.address().port}/v1/authority/me`;
    const missing = await fetch(url);
    assert.equal(missing.status, 401);
    assert.equal((await missing.json()).reason, "invalid_credential");
    assert.equal(calls, 0);
    const granted = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(granted.status, 200);
    assert.equal((await granted.json()).principal.name, "First Owner");
    assert.equal(granted.headers.get("cache-control"), "no-store");
    assert.equal(calls, 1);
    const other = await fetch(url, { method: "POST",
      headers: { Authorization: `Bearer ${token}` } });
    assert.equal(other.status, 404);
    assert.equal(calls, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  const unavailable = await startHealthServer({ host: "127.0.0.1", port: 0,
    inspectSelf: async () => ({ schemaVersion: 1, status: "unavailable",
      reason: "inspection_unverified", omissions: ["current_grant"] }) });
  try {
    const response = await fetch(`http://127.0.0.1:${unavailable.address().port}/v1/authority/me`,
      { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 503);
    assert.deepEqual((await response.json()).omissions, ["current_grant"]);
  } finally {
    await new Promise((resolve) => unavailable.close(resolve));
  }
});

test("malformed and revoked bearers have one generic response, while a handler failure is unavailable", async () => {
  const token = `pb1_${"A".repeat(43)}`;
  const server = await startHealthServer({ host: "127.0.0.1", port: 0,
    inspectSelf: async () => deniedGrant() });
  try {
    const url = `http://127.0.0.1:${server.address().port}/v1/authority/me`;
    const malformed = await fetch(url, { headers: { Authorization: "Bearer malformed" } });
    const revoked = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(malformed.status, 401);
    assert.equal(revoked.status, 401);
    assert.deepEqual(await malformed.json(), await revoked.json());
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  const failed = await startHealthServer({ host: "127.0.0.1", port: 0,
    inspectSelf: async () => { throw new Error("private driver details"); } });
  try {
    const response = await fetch(`http://127.0.0.1:${failed.address().port}/v1/authority/me`,
      { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.deepEqual(body.omissions, ["current_grant"]);
    assert.equal(typeof body.nextAction, "string");
    assert.equal(JSON.stringify(body).includes("private driver"), false);
  } finally {
    await new Promise((resolve) => failed.close(resolve));
  }
});
