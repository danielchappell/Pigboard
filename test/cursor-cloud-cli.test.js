import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { runCursorCloudCli } from "../scripts/cursor-cloud.mjs";
import { CursorCloudRunner } from "../src/index.js";

const KEY = "local-fixture-credential";
const RUN = "run-6bb8a0ad-1822-4d9e-b1c6-653f9d15d2fb";
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status });

async function cli(args, options = {}) {
  let out = "";
  let err = "";
  const code = await runCursorCloudCli(args, { env: {}, stdout: (s) => { out += s; }, stderr: (s) => { err += s; }, ...options });
  return { code, out, err };
}

test("real command help works without credentials and documents noninteractive JSON recovery", async () => {
  const { stdout } = await promisify(execFile)(process.execPath, ["scripts/cursor-cloud.mjs", "--help"], { cwd: new URL("..", import.meta.url), env: {} });
  assert.match(stdout, /prepare/);
  assert.match(stdout, /get --agent-id ID/);
  assert.match(stdout, /Command results and errors are JSON; help is text/);
});

test("saved request flows through prepare, start, and a fresh client get without new model work", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ski-cursor-"));
  try {
    const prompt = join(dir, "question.txt");
    const saved = join(dir, "request.json");
    await writeFile(prompt, "Reply SKI_STACK_CURSOR_PROBE_OK.");
    let networkCalls = 0;
    const prepared = await cli(["prepare", "--prompt-file", prompt, "--model", "example-model", "--param", "reasoning=none"], {
      runnerFactory: () => { throw new Error("prepare must be offline"); }
    });
    assert.equal(prepared.code, 0);
    await writeFile(saved, prepared.out);
    const request = JSON.parse(prepared.out);
    assert.match(request.agentId, /^bc-/);
    assert.deepEqual(request.model.params, [{ id: "reasoning", value: "none" }]);
    let accepted = false;
    const fetchImpl = async (url, options) => {
      networkCalls += 1;
      if (options.method === "POST") {
        assert.deepEqual(JSON.parse(options.body), request);
        if (accepted) return reply({ error: { code: "agent_id_conflict" } }, 409);
        accepted = true;
        return reply({ agent: { id: request.agentId }, run: { id: RUN, agentId: request.agentId, status: "CREATING" } });
      }
      const run = { id: RUN, agentId: request.agentId, status: "FINISHED", result: "SKI_STACK_CURSOR_PROBE_OK" };
      return url.endsWith("?limit=2") ? reply({ items: [run] }) : reply(run);
    };
    let clients = 0;
    const options = { env: { CURSOR_API_KEY: KEY }, runnerFactory: ({ apiKey }) => {
      clients += 1;
      return new CursorCloudRunner({ apiKey, fetchImpl });
    } };
    const started = await cli(["start", "--request", saved], options);
    const receipt = JSON.parse(started.out);
    assert.equal(receipt.status, "CREATING");
    const fetched = await cli(["get", "--agent-id", receipt.agentId, "--run-id", receipt.runId], options);
    assert.equal(fetched.code, 0);
    assert.equal(JSON.parse(fetched.out).result, "SKI_STACK_CURSOR_PROBE_OK");
    assert.equal(clients, 2);
    assert.equal(networkCalls, 2);
    const resumed = await cli(["start", "--request", saved], options);
    assert.equal(JSON.parse(resumed.out).disposition, "recovered");
    assert.equal(JSON.parse(resumed.out).runId, receipt.runId);
    assert.equal(await readFile(saved, "utf8"), prepared.out);
    assert.equal([started, fetched, resumed].some((r) => (r.out + r.err).includes(KEY)), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("CLI keeps argument, file, and authentication failures structured and private", async () => {
  for (const args of [["unknown"], ["start", "--model", "wrong"], ["prepare"], ["get", "--api-key", KEY]]) {
    const result = await cli(args);
    assert.equal(result.code, 1);
    assert.equal(result.out, "");
    assert.equal(result.err.includes(KEY), false);
    assert.ok(JSON.parse(result.err).error.code);
  }
  const noKey = await cli(["models"]);
  assert.equal(JSON.parse(noKey.err).error.code, "missing_auth");
  const badFile = await cli(["start", "--request", "missing.json"], { env: { CURSOR_API_KEY: KEY } });
  assert.equal(JSON.parse(badFile.err).error.code, "invalid_request_file");
});

test("prepare never emits a credential accidentally included in prompt input", async () => {
  const result = await cli(["prepare", "--prompt-file", "question", "--model", "m"], {
    env: { CURSOR_API_KEY: KEY }, readFileImpl: async () => `secret ${KEY}`
  });
  assert.equal(result.code, 1);
  assert.equal(result.out, "");
  assert.equal(result.err.includes(KEY), false);
});

test("failed provider runs remain observable JSON with nonzero exit, while a running turn exits zero", async () => {
  for (const status of ["RUNNING", "FINISHED", "ERROR", "CANCELLED", "EXPIRED"]) {
    const result = await cli(["get", "--agent-id", "placeholder"], { runnerFactory: () => ({ get: async () => ({ status, result: null }) }) });
    assert.equal(result.code, ["ERROR", "CANCELLED", "EXPIRED"].includes(status) ? 1 : 0);
    assert.equal(JSON.parse(result.out).status, status);
    assert.equal(result.err, "");
  }
});

test("model discovery can return one model and rejects a missing selection", async () => {
  const options = { runnerFactory: () => ({ models: async () => [{ id: "one" }, { id: "two" }] }) };
  const one = await cli(["models", "--model", "two"], options);
  assert.deepEqual(JSON.parse(one.out), [{ id: "two" }]);
  assert.equal(JSON.parse((await cli(["models", "--model", "missing"], options)).err).error.code, "unknown_model");
});
