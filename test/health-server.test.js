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

test("Jira choices require a current grant before lookup and the same principal before disclosure", async () => {
  const token = `pb1_${"A".repeat(43)}`;
  const agent = { status: "ok", team: "pilot", generation: 4,
    principal: { id: "agent-1", kind: "agent" }, grants: ["connection_admin"] };
  const names = { status: "complete", site: "scubapig.atlassian.net", projects: [
    { id: "10001", key: "PIG", name: "Pigboard", boards: [
      { id: "2", name: "KAN board", type: "simple" }] }] };
  let grants = [agent, { ...agent, generation: 5 }];
  let lookups = 0;
  const server = await startHealthServer({ host: "127.0.0.1", port: 0,
    inspectSelf: async () => grants.shift(),
    discoverChoices: async () => { lookups++; return names; } });
  try {
    const url = `http://127.0.0.1:${server.address().port}/v1/jira/choices`;
    const missing = await fetch(url);
    assert.equal(missing.status, 401);
    assert.equal(lookups, 0);
    const complete = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(complete.status, 200);
    assert.equal((await complete.json()).projects[0].boards[0].id, "2");
    assert.equal(complete.headers.get("cache-control"), "no-store");
    assert.equal(lookups, 1);
    grants = [{ ...agent, grants: [] }];
    const ungranted = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(ungranted.status, 401);
    assert.equal(lookups, 1);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test("revoke, principal change and authority outage during Jira lookup withhold buffered names", async () => {
  const token = `pb1_${"A".repeat(43)}`;
  const agent = { status: "ok", team: "pilot", generation: 4,
    principal: { id: "agent-1", kind: "agent" }, grants: ["connection_admin"] };
  for (const final of [
    { status: "denied" },
    { ...agent, principal: { id: "agent-2", kind: "agent" } },
    { status: "unavailable" }
  ]) {
    let calls = 0;
    const server = await startHealthServer({ host: "127.0.0.1", port: 0,
      inspectSelf: async () => ++calls === 1 ? agent : final,
      discoverChoices: async () => ({ status: "complete", site: "scubapig.atlassian.net",
        projects: [{ id: "10001", key: "PIG", name: "PRIVATE BOARD NAME", boards: [] }] }) });
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/v1/jira/choices`,
        { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(response.status, final.status === "unavailable" ? 503 : 401);
      const body = await response.text();
      assert.ok(!body.includes("PRIVATE BOARD NAME"));
      assert.ok(!body.includes("10001"));
      assert.equal(calls, 2);
    } finally { await new Promise(resolve => server.close(resolve)); }
  }
});

test("expired choices request aborts stalled authority without a Jira lookup", async () => {
  const token = `pb1_${"A".repeat(43)}`;
  let aborted = false;
  let lookups = 0;
  const server = await startHealthServer({ host: "127.0.0.1", port: 0,
    choiceDeadlineMs: 20,
    inspectSelf: async (_token, signal) => {
      signal.addEventListener("abort", () => { aborted = true; }, { once: true });
      return new Promise(() => {});
    },
    discoverChoices: async () => { lookups++; return null; } });
  try {
    const started = Date.now();
    const request = fetch(`http://127.0.0.1:${server.address().port}/v1/jira/choices`,
      { headers: { Authorization: `Bearer ${token}` } });
    let watchdog;
    try {
      await assert.rejects(Promise.race([request, new Promise((_, reject) => {
        watchdog = setTimeout(() => reject(new Error("server did not close expired choices response")), 300);
      })]), error => !/server did not close/u.test(error.message));
    } finally { clearTimeout(watchdog); }
    assert.ok(Date.now() - started < 300);
    assert.equal(aborted, true);
    assert.equal(lookups, 0);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test("wall-clock expiry after each stage or serialization withholds choices before a delayed timer", async () => {
  const token = `pb1_${"A".repeat(43)}`;
  const agent = { status: "ok", team: "pilot", principal: { id: "agent-1", kind: "agent" },
    grants: ["connection_admin"] };
  for (const stage of ["first_grant", "jira", "final_grant", "serialization"]) {
    let clock = 0;
    let grants = 0;
    let lookups = 0;
    let aborted = false;
    const board = { id: "2", type: "simple" };
    Object.defineProperty(board, "name", { enumerable: true, get() {
      if (stage === "serialization") clock = 5001;
      return "PRIVATE BOARD NAME";
    } });
    const server = await startHealthServer({ host: "127.0.0.1", port: 0,
      choiceDeadlineMs: 5000, now: () => clock,
      inspectSelf: async (_token, signal) => {
        signal.addEventListener("abort", () => { aborted = true; }, { once: true });
        grants += 1;
        if ((stage === "first_grant" && grants === 1) ||
            (stage === "final_grant" && grants === 2)) clock = 5001;
        return agent;
      },
      discoverChoices: async () => {
        lookups += 1;
        if (stage === "jira") clock = 5001;
        return { status: "complete", site: "scubapig.atlassian.net", projects: [
          { id: "10001", key: "PIG", name: "Pigboard", boards: [board] }] };
      } });
    try {
      await assert.rejects(fetch(`http://127.0.0.1:${server.address().port}/v1/jira/choices`,
        { headers: { Authorization: `Bearer ${token}` } }), undefined, stage);
      assert.equal(aborted, true, stage);
      assert.equal(lookups, stage === "first_grant" ? 0 : 1, stage);
      assert.equal(grants, ["first_grant", "jira"].includes(stage) ? 1 : 2, stage);
    } finally {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  }
});
