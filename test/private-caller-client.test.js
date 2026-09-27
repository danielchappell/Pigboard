import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import { createServer, request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { deliverCredential, prepareCredentialDirectory } from "../src/hosted/authority-bootstrap.js";
import { inspectPrivateCaller, PRIVATE_SERVICE, readCallerTokenFile,
  CallerClientError } from "../src/hosted/private-caller-client.js";
import { runCallerCommand } from "../scripts/inspect-pigboard-caller.mjs";

const OWNER_TOKEN = `pb1_${"O".repeat(43)}`;
const AGENT_TOKEN = `pb1_${"A".repeat(43)}`;
const UNKNOWN_TOKEN = `pb1_${"U".repeat(43)}`;

function privateFile(token = OWNER_TOKEN) {
  const home = fs.mkdtempSync(join(tmpdir(), "pigboard-caller-"));
  const prepared = prepareCredentialDirectory(home);
  const path = deliverCredential(prepared, 1, token);
  return { home, path, directory: prepared.directory,
    cleanup: () => fs.rmSync(home, { recursive: true, force: true }) };
}

async function fixture(handler, callback) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const calls = [];
  const request = (options, onResponse) => {
    calls.push(options);
    return httpRequest({ ...options, host: "127.0.0.1",
      port: server.address().port }, onResponse);
  };
  try {
    return await callback({ request, calls });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

function respond(response, code, body, headers = {}) {
  response.writeHead(code, { "content-type": "application/json; charset=utf-8",
    ...headers });
  response.end(typeof body === "string" ? body : JSON.stringify(body));
}

function okBody(name, kind, grants) {
  return { schemaVersion: 1, status: "ok", team: "pilot", generation: 1,
    principal: { id: randomUUID(), name, kind }, grants };
}

test("reads the actual newline-terminated owner file and rejects unsafe custody before network", async () => {
  const item = privateFile();
  try {
    assert.equal(readCallerTokenFile(item.path), OWNER_TOKEN);
    const badPath = join(item.directory, "malformed.token");
    fs.writeFileSync(badPath, `${OWNER_TOKEN}\nextra`, { mode: 0o600 });
    assert.throws(() => readCallerTokenFile(badPath), (error) =>
      error instanceof CallerClientError && error.reason === "invalid_token_file");
    fs.chmodSync(badPath, 0o644);
    assert.throws(() => readCallerTokenFile(badPath), (error) =>
      error instanceof CallerClientError && error.reason === "unsafe_token_file");
    fs.chmodSync(item.directory, 0o755);
    assert.throws(() => readCallerTokenFile(item.path), (error) =>
      error instanceof CallerClientError && error.reason === "unsafe_token_file");
    fs.chmodSync(item.directory, 0o700);
    const wrongOwnerOps = { ...fs, fstatSync(fd) {
      const stat = fs.fstatSync(fd);
      return { dev: stat.dev, ino: stat.ino, size: stat.size,
        mode: stat.mode, uid: process.getuid() + 1,
        isFile: () => stat.isFile() };
    } };
    assert.throws(() => readCallerTokenFile(item.path, { ops: wrongOwnerOps }),
      (error) => error instanceof CallerClientError &&
        error.reason === "unsafe_token_file");
    const link = join(item.directory, "link.token");
    fs.symlinkSync(item.path, link);
    assert.throws(() => readCallerTokenFile(link), CallerClientError);
    let requests = 0;
    const result = await inspectPrivateCaller({ tokenFile: badPath,
      request: () => { requests += 1; throw Error("must not connect"); } });
    assert.equal(result.status, "unverified");
    assert.equal(requests, 0);
    assert.ok(!JSON.stringify(result).includes(OWNER_TOKEN));
  } finally {
    item.cleanup();
  }
});

test("detects a protected parent replaced during the credential read", () => {
  const item = privateFile();
  try {
    const moved = `${item.directory}-moved`;
    let swapped = false;
    const ops = { ...fs, readSync(...args) {
      const count = fs.readSync(...args);
      if (!swapped) {
        swapped = true;
        fs.renameSync(item.directory, moved);
        fs.symlinkSync(moved, item.directory);
      }
      return count;
    } };
    assert.throws(() => readCallerTokenFile(item.path, { ops }), (error) =>
      error instanceof CallerClientError && error.reason === "unsafe_token_file");
  } finally {
    item.cleanup();
  }
});

test("owner and future agent inspect only their own grant through the fixed private request", async () => {
  const owner = privateFile(OWNER_TOKEN);
  const agent = privateFile(AGENT_TOKEN);
  const ownerBody = okBody("Joseph Chappell", "human", ["owner", "connection_admin"]);
  const agentBody = okBody("Pilot agent", "agent", ["connection_admin"]);
  try {
    await fixture((request, response) => {
      const body = request.headers.authorization === `Bearer ${OWNER_TOKEN}` ? ownerBody :
        request.headers.authorization === `Bearer ${AGENT_TOKEN}` ? agentBody : null;
      respond(response, body ? 200 : 401, body ?? { schemaVersion: 1,
        status: "denied", reason: "invalid_credential", nextAction: "Ask the owner." });
    }, async ({ request, calls }) => {
      const ownerResult = await inspectPrivateCaller({ tokenFile: owner.path, request });
      const agentResult = await inspectPrivateCaller({ tokenFile: agent.path, request });
      assert.equal(ownerResult.status, "ok");
      assert.deepEqual(ownerResult.grants, ["owner", "connection_admin"]);
      assert.equal(agentResult.status, "ok");
      assert.deepEqual(agentResult.principal, agentBody.principal);
      assert.deepEqual(agentResult.grants, ["connection_admin"]);
      assert.ok(!JSON.stringify(agentResult).includes(OWNER_TOKEN));
      assert.ok(!JSON.stringify(agentResult).includes(ownerBody.principal.name));
      for (const call of calls) {
        assert.equal(call.method, "GET");
        assert.equal(call.path, "/v1/authority/me");
        assert.equal(call.host, PRIVATE_SERVICE.ip);
        assert.equal(call.port, PRIVATE_SERVICE.port);
        assert.equal(call.headers.Host, PRIVATE_SERVICE.host);
      }
      const lines = [];
      const status = await runCallerCommand(["--token-file", agent.path, "--format", "json"],
        { inspect: (options) => inspectPrivateCaller({ ...options, request }),
          output: (line) => lines.push(line) });
      assert.equal(status, 0);
      assert.deepEqual(JSON.parse(lines[0]).principal, agentBody.principal);
      assert.ok(!lines[0].includes(OWNER_TOKEN));
      assert.ok(!lines[0].includes(ownerBody.principal.name));
      const humanLines = [];
      assert.equal(await runCallerCommand(["--token-file", owner.path],
        { inspect: (options) => inspectPrivateCaller({ ...options, request }),
          output: (line) => humanLines.push(line) }), 0);
      assert.match(humanLines[0], /Pigboard grant: verified/);
      assert.match(humanLines[0], /Joseph Chappell/);
      assert.match(humanLines[0], /owner, connection_admin/);
      assert.ok(!humanLines[0].includes(OWNER_TOKEN));
    });
  } finally {
    owner.cleanup();
    agent.cleanup();
  }
});

test("a well-formed unissued token is denied, while a valid 503 remains unavailable", async () => {
  const item = privateFile(UNKNOWN_TOKEN);
  try {
    await fixture((_request, response) => respond(response, 401, {
      schemaVersion: 1, status: "denied", reason: "invalid_credential",
      nextAction: "Raw server text must not be used."
    }), async ({ request }) => {
      const result = await inspectPrivateCaller({ tokenFile: item.path, request });
      assert.equal(result.status, "denied");
      assert.ok(!result.nextAction.includes("Raw server text"));
    });
    await fixture((_request, response) => respond(response, 503, {
      schemaVersion: 1, status: "unavailable", reason: "inspection_unverified",
      omissions: ["current_grant"], nextAction: "Raw server text must not be used."
    }), async ({ request }) => {
      const result = await inspectPrivateCaller({ tokenFile: item.path, request });
      assert.equal(result.status, "unavailable");
      assert.deepEqual(result.omissions, ["current_grant"]);
      assert.ok(!result.nextAction.includes("Raw server text"));
    });
  } finally {
    item.cleanup();
  }
});

test("unknown, malformed and unsafe-name replies never become verified grants or redirects", async () => {
  const item = privateFile();
  const unsafeNames = ["Owner\nGrant: admin", "Owner\u001b[31m", "Owner\u2028Agent"];
  const cases = [
    [302, { schemaVersion: 1, status: "ok" }, { location: "https://example.com" }],
    [200, "not json"],
    [200, { ...okBody("Owner", "human", ["owner"]), schemaVersion: 2 }],
    [200, { ...okBody("Owner", "human", ["owner"]), leaked: OWNER_TOKEN }],
    ...unsafeNames.map((name) => [200, okBody(name, "human", ["owner"])])
  ];
  try {
    for (const [code, body, headers] of cases) {
      let requests = 0;
      await fixture((_request, response) => {
        requests += 1;
        respond(response, code, body, headers);
      }, async ({ request }) => {
        const result = await inspectPrivateCaller({ tokenFile: item.path, request });
        assert.equal(result.status, "unverified");
        assert.deepEqual(result.omissions, ["current_grant"]);
        assert.ok(!JSON.stringify(result).includes(OWNER_TOKEN));
      });
      assert.equal(requests, 1);
    }
    await fixture((_request, response) => {
      response.writeHead(200, { "content-type": "text/plain" });
      response.end(JSON.stringify(okBody("Owner", "human", ["owner"])));
    }, async ({ request }) => {
      assert.equal((await inspectPrivateCaller({ tokenFile: item.path, request })).status,
        "unverified");
    });
    await fixture((_request, response) => {
      respond(response, 200, "x".repeat(9000));
    }, async ({ request }) => {
      assert.equal((await inspectPrivateCaller({ tokenFile: item.path, request })).status,
        "unverified");
    });
    await fixture((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.write('{"schemaVersion":1');
      response.destroy();
    }, async ({ request }) => {
      assert.equal((await inspectPrivateCaller({ tokenFile: item.path, request })).status,
        "unverified");
    });
  } finally {
    item.cleanup();
  }
});

test("a trickling response still reaches one total deadline", async () => {
  const item = privateFile();
  try {
    await fixture((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      let sent = 0;
      const tick = setInterval(() => {
        if (response.destroyed || sent >= 20) {
          clearInterval(tick);
          if (!response.destroyed) response.end();
          return;
        }
        response.write(" ");
        sent += 1;
      }, 10);
    }, async ({ request }) => {
      const started = Date.now();
      const result = await inspectPrivateCaller({ tokenFile: item.path, request,
        deadlineMs: 60 });
      assert.equal(result.status, "unverified");
      assert.equal(result.reason, "deadline_exceeded");
      assert.ok(Date.now() - started < 500);
    });
  } finally {
    item.cleanup();
  }
});

test("the real CLI has safe help, usage and pre-network refusal", () => {
  const script = new URL("../scripts/inspect-pigboard-caller.mjs", import.meta.url).pathname;
  const help = execFileSync(process.execPath, [script, "--help"], { encoding: "utf8" });
  assert.match(help, /caller:me/);
  const invalid = spawnSync(process.execPath, [script, "--token-file", "relative.token"],
    { encoding: "utf8" });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stdout, /unverified/);
  assert.equal(invalid.stderr, "");
  const usage = spawnSync(process.execPath, [script, "--unknown"], { encoding: "utf8" });
  assert.equal(usage.status, 2);
  assert.match(usage.stdout, /invalid_usage/);
  assert.equal(usage.stderr, "");
});
