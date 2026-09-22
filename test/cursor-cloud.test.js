import assert from "node:assert/strict";
import test from "node:test";
import { CursorCloudRunner, prepareCursorRequest, validateCursorRequest } from "../src/index.js";

const KEY = "test-credential-not-for-output";
const AGENT = "bc-a7514709-a589-40cf-af18-fe8a177f4584";
const RUN = "run-6bb8a0ad-1822-4d9e-b1c6-653f9d15d2fb";
const OTHER = "run-00000000-0000-4000-8000-000000000001";
const request = () => ({ ...prepareCursorRequest({ prompt: "Reply OK.", model: { id: "example-model" } }), agentId: AGENT });
const run = (status = "FINISHED", extra = {}) => ({ id: RUN, agentId: AGENT, status, ...(status === "FINISHED" ? { result: "OK", durationMs: 78838 } : {}), ...extra });
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status });

function harness(responses) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, ...options, body: options.body ? JSON.parse(options.body) : undefined });
    assert.ok(responses.length, "Unexpected additional provider call");
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next;
  };
  return { calls, runner: new CursorCloudRunner({ apiKey: KEY, fetchImpl }) };
}

test("prepare produces a stable saved identity before network work and protects the constrained request shape", () => {
  const saved = request();
  assert.equal(saved.agentId, AGENT);
  assert.equal(saved.mode, "plan");
  assert.equal(saved.autoCreatePR, false);
  assert.equal(saved.workOnCurrentBranch, false);
  assert.equal(saved.repos, undefined);
  assert.notEqual(prepareCursorRequest({ prompt: "OK", model: { id: "m" } }).agentId, saved.agentId);
  const copy = validateCursorRequest(saved);
  copy.prompt.text = "changed";
  assert.equal(saved.prompt.text, "Reply OK.");
  assert.throws(() => validateCursorRequest(Object.create(saved)), { code: "invalid_request" });
  for (const change of [{ agentId: undefined }, { model: {} }, { mode: "agent" }, { autoCreatePR: true }, { envVars: { key: "secret" } }, { mcpServers: [] }, { prompt: { text: "OK", images: [] } }]) {
    assert.throws(() => validateCursorRequest({ ...saved, ...change }), { code: "invalid_request" });
  }
});

test("a repository is explicit, singular, and has a revision without embedded credentials", () => {
  const input = { prompt: "Read package.json", model: { id: "m" }, repository: "https://github.com/acme/app", ref: "a1b2c3" };
  assert.deepEqual(prepareCursorRequest(input).repos, [{ url: input.repository, startingRef: input.ref }]);
  assert.throws(() => prepareCursorRequest({ ...input, ref: undefined }), { code: "invalid_request" });
  assert.throws(() => prepareCursorRequest({ ...input, repository: "https://token@github.com/acme/app" }), { code: "invalid_request" });
  assert.throws(() => validateCursorRequest({ ...request(), model: { id: "m", params: [{ id: "x", value: "1" }, { id: "x", value: "2" }] } }), { code: "invalid_request" });
});

test("start sends exactly one safe create and returns a run-level receipt", async () => {
  const { runner, calls } = harness([reply({ agent: { id: AGENT }, run: run("CREATING") })]);
  const result = await runner.start(request());
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.cursor.com/v1/agents");
  assert.equal(calls[0].headers.Authorization, `Bearer ${KEY}`);
  assert.equal(calls[0].redirect, "error");
  assert.ok(calls[0].signal instanceof AbortSignal);
  assert.deepEqual(calls[0].body, request());
  assert.equal(JSON.stringify(calls[0].body).includes(KEY), false);
  assert.deepEqual(result, { provider: "cursor", agentId: AGENT, runId: RUN, url: `https://cursor.com/agents/${AGENT}`, status: "CREATING", terminal: false, result: null, durationMs: null, disposition: "started" });
  assert.equal(JSON.stringify(runner).includes(KEY), false);
});

for (const [label, response] of [
  ["lost launch response", () => new Error(`socket problem ${KEY}`)],
  ["duplicate create", () => reply({ error: { code: "agent_id_conflict" } }, 409)],
  ["provider server error", () => reply({ error: { message: KEY } }, 503)],
  ["unreadable accepted response", () => new Response("not JSON", { status: 200 })],
  ["malformed accepted receipt", () => reply({ agent: { id: "wrong" }, run: run() })]
]) {
  test(`${label} recovers through reads without a second POST`, async () => {
    const { runner, calls } = harness([response(), reply({ items: [run()] }), reply(run())]);
    const result = await runner.start(request());
    assert.equal(result.disposition, "recovered");
    assert.equal(result.result, "OK");
    assert.equal(result.runId, RUN);
    assert.deepEqual(calls.map(({ method }) => method), ["POST", "GET", "GET"]);
    assert.equal(calls[1].url, `https://api.cursor.com/v1/agents/${AGENT}/runs?limit=2`);
    assert.equal(calls[2].url, `https://api.cursor.com/v1/agents/${AGENT}/runs/${RUN}`);
  });
}

test("an unresolved launch retains identity without inventing a failure outcome or retrying", async () => {
  const { runner, calls } = harness([new Error("timeout"), reply({ items: [] })]);
  await assert.rejects(runner.start(request()), (error) => {
    assert.equal(error.code, "launch_unresolved");
    assert.equal(error.agentId, AGENT);
    assert.equal(error.recoveryRequired, true);
    assert.equal(error.recoveryCode, "run_unavailable");
    assert.match(error.message, /do not generate a replacement ID/);
    return true;
  });
  assert.deepEqual(calls.map(({ method }) => method), ["POST", "GET"]);
});

test("external follow-ups require an explicit run ID instead of changing which result is retrieved", async () => {
  const { runner, calls } = harness([reply({ items: [run("RUNNING", { id: OTHER }), run()] }), reply(run())]);
  await assert.rejects(runner.get({ agentId: AGENT }), { code: "ambiguous_run", agentId: AGENT });
  assert.equal(calls.length, 1);
  const original = await runner.get({ agentId: AGENT, runId: RUN });
  assert.equal(original.runId, RUN);
  assert.equal(original.result, "OK");
});

test("HTTP auth/rate errors are actionable and never echo provider messages or trigger a create retry", async () => {
  for (const status of [400, 401, 403, 429]) {
    const { runner, calls } = harness([new Response(`<html>${KEY}</html>`, { status })]);
    await assert.rejects(runner.start(request()), (error) => {
      assert.equal(error.code, "provider_error");
      assert.equal(error.httpStatus, status);
      assert.equal(error.agentId, AGENT);
      assert.equal(String(error).includes(KEY), false);
      return true;
    });
    assert.equal(calls.length, 1);
  }
});

test("get handles every documented run status and does not equate terminal with accepted", async () => {
  for (const status of ["CREATING", "RUNNING", "FINISHED", "ERROR", "CANCELLED", "EXPIRED"]) {
    const { runner, calls } = harness([reply(run(status))]);
    const result = await runner.get({ agentId: AGENT, runId: RUN });
    assert.equal(result.status, status);
    assert.equal(result.terminal, !["CREATING", "RUNNING"].includes(status));
    assert.equal(result.accepted, undefined);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "GET");
  }
});

test("malformed and mismatched provider records never become trustworthy results", async () => {
  for (const bad of [run("NEW_STATE"), run("FINISHED", { id: OTHER }), run("FINISHED", { agentId: "other" }), run("FINISHED", { result: {} }), run("FINISHED", { result: undefined }), run("FINISHED", { result: "  " }), run("FINISHED", { durationMs: -1 })]) {
    const { runner } = harness([reply(bad)]);
    await assert.rejects(runner.get({ agentId: AGENT, runId: RUN }), { code: "invalid_response", agentId: AGENT, runId: RUN });
  }
});

test("invalid IDs and accidental credential inclusion fail before any network call", async () => {
  const { runner, calls } = harness([]);
  await assert.rejects(runner.get({ agentId: "../wrong" }), { code: "invalid_request" });
  await assert.rejects(runner.get({ agentId: AGENT, runId: "../wrong" }), { code: "invalid_request" });
  await assert.rejects(runner.start({ ...request(), prompt: { text: `My key is ${KEY}` } }), { code: "invalid_request" });
  assert.equal(calls.length, 0);
  assert.throws(() => new CursorCloudRunner(), { code: "missing_auth" });
  assert.throws(() => new CursorCloudRunner({ apiKey: "bad\nkey" }), { code: "missing_auth" });
});

test("model discovery and run output redact an unexpectedly reflected credential", async () => {
  const { runner } = harness([reply({ items: [{ id: "m", displayName: KEY }] }), reply(run("FINISHED", { result: `value ${KEY}` }))]);
  assert.deepEqual(await runner.models(), [{ id: "m", displayName: "[REDACTED]" }]);
  assert.equal((await runner.get({ agentId: AGENT, runId: RUN })).result, "value [REDACTED]");
});

test("malformed model discovery fails with a structured provider-response error", async () => {
  for (const data of [{ items: [null] }, { items: [{}] }, { items: "not-an-array" }]) {
    const { runner } = harness([reply(data)]);
    await assert.rejects(runner.models(), { code: "invalid_response" });
  }
});
