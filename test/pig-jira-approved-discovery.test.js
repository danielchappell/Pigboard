import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { discoverApprovedJira, validApprovedJira } from "../src/jira/approved-discovery.js";

const config = JSON.parse(readFileSync(new URL("../config/pigboard-approved-jira.json", import.meta.url), "utf8"));
const reply = (value, status = 200) => Response.json(value, { status });

function fixture({ projectPages, boardPages, identity = config.accountId } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), method: init.method, redirect: init.redirect });
    if (url === "https://auth.atlassian.com/oauth/token") return reply({ access_token: "service-token" });
    if (String(url).endsWith("/rest/api/3/myself")) return reply({ accountId: identity });
    const parsed = new URL(url);
    const start = Number(parsed.searchParams.get("startAt"));
    if (parsed.pathname.endsWith("/project/search")) return reply(projectPages?.[start] ?? {
      startAt: start, maxResults: 50, total: 1, isLast: true,
      values: [{ id: "10001", key: "PIG", name: "Pigboard" }] });
    if (parsed.pathname.endsWith("/board")) return reply(boardPages?.[start] ?? {
      startAt: start, maxResults: 50, total: 2, isLast: true,
      values: [{ id: 35, name: "Pigboard Selection QA", type: "kanban" },
        { id: 2, name: "KAN board", type: "simple" }] });
    throw new Error("unexpected request");
  };
  return { calls, fetchImpl };
}

async function discover(fetchImpl, extra = {}) {
  return discoverApprovedJira({ config, clientId: "private-id", clientSecret: "private-secret",
    fetchImpl, deadlineAt: Date.now() + 2000, ...extra });
}

test("approved PIG and fully paged boards return sorted names and IDs only", async () => {
  assert.equal(validApprovedJira(config), true);
  const f = fixture({
    projectPages: { 0: { startAt: 0, maxResults: 1, total: 1, isLast: true,
      values: [{ id: "10001", key: "PIG", name: "Pigboard" }] } },
    boardPages: {
      0: { startAt: 0, maxResults: 1, total: 2, isLast: false,
        values: [{ id: 35, name: "Pigboard Selection QA", type: "kanban" }] },
      1: { startAt: 1, maxResults: 1, total: 2, isLast: true,
        values: [{ id: 2, name: "KAN board", type: "simple" }] }
    }
  });
  const result = await discover(f.fetchImpl);
  assert.deepEqual(result, { status: "complete", site: "scubapig.atlassian.net",
    projects: [{ id: "10001", key: "PIG", name: "Pigboard", boards: [
      { id: "2", name: "KAN board", type: "simple" },
      { id: "35", name: "Pigboard Selection QA", type: "kanban" }
    ] }] });
  assert.equal(f.calls.length, 5);
  assert.ok(f.calls.every(call => call.redirect === "manual"));
  assert.equal(JSON.stringify(result).includes("private-secret"), false);
});

test("complete empty boards are different from unfinished or inconsistent pages", async () => {
  const empty = fixture({ boardPages: { 0: { startAt: 0, maxResults: 50,
    total: 0, isLast: true, values: [] } } });
  assert.deepEqual((await discover(empty.fetchImpl)).projects[0].boards, []);
  for (const first of [
    { startAt: 0, maxResults: 1, total: 2, isLast: false, values: [] },
    { startAt: 0, maxResults: 1, total: 2, isLast: true,
      values: [{ id: 2, name: "KAN board", type: "simple" }] },
    { startAt: 1, maxResults: 1, total: 1, isLast: true,
      values: [{ id: 2, name: "KAN board", type: "simple" }] }
  ]) {
    const f = fixture({ boardPages: { 0: first } });
    assert.deepEqual(await discover(f.fetchImpl), { status: "uncertain", reason: "metadata_unverified" });
  }
});

test("wrong identity, duplicate boards and unrelated project visibility fail closed", async () => {
  const wrong = fixture({ identity: "someone-else" });
  assert.equal((await discover(wrong.fetchImpl)).status, "uncertain");
  assert.equal(wrong.calls.length, 2);
  const duplicate = fixture({ boardPages: { 0: { startAt: 0, maxResults: 50, total: 2,
    isLast: true, values: [{ id: 2, name: "Board", type: "simple" },
      { id: 2, name: "Board", type: "simple" }] } } });
  assert.equal((await discover(duplicate.fetchImpl)).status, "uncertain");
  const other = fixture({ projectPages: { 0: { startAt: 0, maxResults: 50, total: 1,
    isLast: true, values: [{ id: 999, key: "OTHER", name: "Unrelated" }] } } });
  const result = await discover(other.fetchImpl);
  assert.equal(result.status, "uncertain");
  assert.ok(!JSON.stringify(result).includes("Unrelated"));
});

test("missing host secrets, aborted reads and provider denial never expose names", async () => {
  let requests = 0;
  const unavailable = await discoverApprovedJira({ config, clientId: "", clientSecret: "",
    fetchImpl: () => { requests++; throw new Error("must not fetch"); }, deadlineAt: Date.now() + 1000 });
  assert.equal(unavailable.status, "unavailable");
  assert.equal(requests, 0);
  const controller = new AbortController();
  controller.abort();
  const aborted = await discover(fixture().fetchImpl, { signal: controller.signal });
  assert.equal(aborted.status, "unavailable");
  const denied = await discover(async () => reply({ private: "secret" }, 403));
  assert.equal(denied.status, "unavailable");
  assert.ok(!JSON.stringify(denied).includes("secret"));
});

test("board access refusal on either page stays unavailable without partial names", async () => {
  const firstPage = { startAt: 0, maxResults: 1, total: 2, isLast: false,
    values: [{ id: 35, name: "PRIVATE BOARD NAME", type: "kanban" }] };
  for (const status of [401, 403]) {
    for (const deniedStart of [0, 1]) {
      const f = fixture({ boardPages: { 0: firstPage } });
      const fetchImpl = async (url, init) => {
        const parsed = new URL(url);
        if (parsed.pathname.endsWith("/board") &&
            Number(parsed.searchParams.get("startAt")) === deniedStart) {
          return reply({ private: "PRIVATE BOARD NAME" }, status);
        }
        return f.fetchImpl(url, init);
      };
      const result = await discover(fetchImpl);
      assert.deepEqual(result, { status: "unavailable", reason: "jira_unavailable" });
      assert.equal(JSON.stringify(result).includes("PRIVATE BOARD NAME"), false);
    }
  }
});

test("streaming provider denial and redirect release unread bodies before the deadline listener goes away", async () => {
  for (const status of [403, 302]) {
    let cancelled = false;
    let aborted = false;
    const controller = new AbortController();
    const fetchImpl = async (_url, init) => {
      init.signal.addEventListener("abort", () => { aborted = true; }, { once: true });
      const stream = new ReadableStream({
        start(inner) { inner.enqueue(new TextEncoder().encode("{")); },
        cancel() { cancelled = true; }
      });
      return new Response(stream, { status });
    };
    const result = await discover(fetchImpl, { signal: controller.signal });
    assert.equal(result.status, "unavailable");
    assert.equal(cancelled, true);
    assert.equal(aborted, true);
    controller.abort();
    assert.equal(cancelled, true);
  }
});

test("an unread failure body with stalled cancel does not hold the discovery result open", async () => {
  let cancellationStarted = false;
  const fetchImpl = async () => ({ status: 403, body: { cancel() {
    cancellationStarted = true;
    return new Promise(() => {});
  } } });
  let watchdog;
  let result;
  try { result = await Promise.race([discover(fetchImpl), new Promise((_, reject) => {
    watchdog = setTimeout(() => reject(new Error("unbounded body cleanup")), 100);
  })]); } finally { clearTimeout(watchdog); }
  assert.equal(result.status, "unavailable");
  assert.equal(cancellationStarted, true);
});
