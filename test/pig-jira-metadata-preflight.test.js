import assert from "node:assert/strict";
import * as fs from "node:fs";
import { chmodSync, linkSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkPigJiraMetadata, formatPigJiraMetadata, readJiraCredentialFile } from
  "../src/jira/pig-metadata-preflight.js";
import { runPigJiraMetadataCommand } from "../scripts/check-pig-jira-metadata.mjs";

const CLOUD = "9b7d0e3f-4bd2-4017-a2a5-f99a443bec68";
const API = `https://api.atlassian.com/ex/jira/${CLOUD}`;
const ACCOUNT = "712020:8e6999c1-1a8e-493e-aea0-2b2902cde2bf";

function credentials(t) {
  const dir = mkdtempSync(join(tmpdir(), "pig-jira-metadata-"));
  chmodSync(dir, 0o700);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const clientIdFile = join(dir, "client-id");
  const clientSecretFile = join(dir, "client-secret");
  writeFileSync(clientIdFile, "client-id-value\n", { mode: 0o600 });
  writeFileSync(clientSecretFile, "client-secret-value\n", { mode: 0o600 });
  return { dir, clientIdFile, clientSecretFile };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function fixture(path) {
  if (path === "/rest/api/3/myself") return { accountId: ACCOUNT };
  if (path === "/rest/api/3/project/10001") return { id: "10001", key: "PIG", name: "Pigboard" };
  if (path.startsWith("/rest/api/3/project/search?")) return {
    isLast: true, values: [{ id: "10001", key: "PIG", name: "Pigboard" },
      { id: "99999", key: "OTHER", name: "Do not disclose" }]
  };
  if (path === "/rest/api/3/project/10001/statuses") return [
    { id: "10009", name: "Task", statuses: [{ id: "20001", name: "To Do" },
      { id: "20002", name: "Done" }] }
  ];
  if (path.startsWith("/rest/agile/1.0/board?")) return {
    isLast: true, values: [{ id: 2, name: "KAN board", type: "kanban" },
      { id: 35, name: "Pigboard Selection QA", type: "kanban" },
      { id: 999, name: "Do not disclose", type: "kanban" }]
  };
  const match = /^\/rest\/agile\/1\.0\/board\/(2|35)(?:\/(configuration|project\/full))?$/u.exec(path);
  if (match) {
    const [, id, kind] = match;
    if (!kind) return { id: Number(id), name: id === "2" ? "KAN board" : "Pigboard Selection QA",
      type: "kanban" };
    if (kind === "configuration") return {
      id: Number(id), filter: { id: id === "2" ? 10001 : 10034 },
      columnConfig: { columns: [{ name: "To Do", statuses: [{ id: "20001" }] },
        { name: "Done", statuses: [{ id: "20002" }] }] }
    };
    return id === "2" ? [] : { isLast: true, values: [{ id: "10001", name: "Pigboard" }] };
  }
  if (path === "/rest/api/3/filter/10001") return { id: 10001, jql: "project = PIG ORDER BY Rank ASC" };
  if (path === "/rest/api/3/filter/10034") return { id: 10034, jql: "project = PIG ORDER BY Rank ASC" };
  throw new Error(`Unexpected fake path ${path}`);
}

function fakeFetch(overrides = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url === "https://auth.atlassian.com/oauth/token") {
      return overrides.token || json({ access_token: "test-bearer" });
    }
    assert.ok(url.startsWith(API + "/"));
    const path = url.slice(API.length);
    if (overrides[path]) return overrides[path];
    return json(fixture(path));
  };
  return { calls, fetchImpl };
}

test("complete target metadata stays read-only and keeps absent static association separate", async t => {
  const files = credentials(t);
  const { calls, fetchImpl } = fakeFetch();
  const result = await checkPigJiraMetadata({ ...files, fetchImpl });
  assert.equal(result.status, "metadata_complete");
  assert.equal(result.routes.length, 14);
  assert.ok(result.routes.every(route => route.complete &&
    ["ok", "static_association_not_established"].includes(route.reason)));
  assert.equal(result.routes.find(route => route.label === "board_2_static_projects")?.reason,
    "static_association_not_established");
  assert.deepEqual(result.omissions, ["pair_validity", "issue_membership", "caller_audience", "other_D1_evidence"]);
  assert.equal(calls[0].url, "https://auth.atlassian.com/oauth/token");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(calls[0].init.body.get("client_id"), "client-id-value");
  assert.equal(calls[0].init.body.get("client_secret"), "client-secret-value");
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.equal(calls[1].url, `${API}/rest/api/3/myself`);
  for (const call of calls.slice(1)) {
    assert.equal(call.init.method, "GET");
    assert.equal(call.init.redirect, "error");
    assert.equal(call.init.headers.Authorization, "Bearer test-bearer");
    assert.ok(call.url.startsWith(API + "/"));
    assert.ok(!/\/issue(?:\/|\?|$)|\/comment|\/transition/u.test(call.url));
    assert.ok(!JSON.stringify(call.init).includes("client-secret-value"));
    assert.ok(!JSON.stringify(call.init).includes("client-id-value"));
  }
  const rendered = formatPigJiraMetadata(result, "json");
  assert.ok(!rendered.includes("client-secret-value"));
  assert.ok(!rendered.includes("test-bearer"));
  assert.ok(!rendered.includes("ORDER BY"));
  assert.ok(!rendered.includes("Do not disclose"));
});

test("wrong service identity stops before project or board reads", async t => {
  const files = credentials(t);
  const { calls, fetchImpl } = fakeFetch({ "/rest/api/3/myself": json({ accountId: "wrong" }) });
  const result = await checkPigJiraMetadata({ ...files, fetchImpl });
  assert.equal(result.status, "metadata_incomplete");
  assert.equal(result.routes.at(-1).reason, "wrong_identity");
  assert.equal(calls.length, 2);
  for (const body of [{}, null, { accountId: "bad\nvalue" }]) {
    const malformed = fakeFetch({ "/rest/api/3/myself": json(body) });
    const invalid = await checkPigJiraMetadata({ ...files, fetchImpl: malformed.fetchImpl });
    assert.equal(invalid.routes.at(-1).reason, "malformed_body");
    assert.equal(malformed.calls.length, 2);
  }
});

test("unsafe, shared and invalid credential files make no network request", async t => {
  const files = credentials(t);
  const { calls, fetchImpl } = fakeFetch();
  chmodSync(files.clientSecretFile, 0o644);
  let result = await checkPigJiraMetadata({ ...files, fetchImpl });
  assert.equal(result.reason, "unsafe_credential_file");
  assert.equal(calls.length, 0);
  chmodSync(files.clientSecretFile, 0o600);
  const link = join(files.dir, "link");
  symlinkSync(files.clientSecretFile, link);
  result = await checkPigJiraMetadata({ ...files, clientSecretFile: link, fetchImpl });
  assert.equal(result.reason, "unsafe_credential_file");
  result = await checkPigJiraMetadata({ ...files, clientSecretFile: files.clientIdFile, fetchImpl });
  assert.equal(result.reason, "unsafe_credential_file");
  const hardLink = join(files.dir, "hard-link");
  linkSync(files.clientIdFile, hardLink);
  result = await checkPigJiraMetadata({ ...files, clientSecretFile: hardLink, fetchImpl });
  assert.equal(result.reason, "unsafe_credential_file");
  writeFileSync(files.clientSecretFile, "bad value\n", { mode: 0o600 });
  result = await checkPigJiraMetadata({ ...files, fetchImpl });
  assert.equal(result.reason, "invalid_credential_file");
  assert.equal(calls.length, 0);
});

test("protected parent replacement is refused", t => {
  const files = credentials(t);
  let visits = 0;
  const ops = { ...fs, realpathSync(path) {
    if (path === files.dir && ++visits === 2) return "/replaced-parent";
    return fs.realpathSync(path);
  } };
  assert.throws(() => readJiraCredentialFile(files.clientIdFile, { ops }),
    error => error.reason === "unsafe_credential_file");
});

test("known target, QA filter and incomplete listing drift fail without raw JQL", async t => {
  const files = credentials(t);
  const wrongProject = fakeFetch({ "/rest/api/3/project/10001":
    json({ id: "10001", key: "OTHER", name: "Other" }) });
  const wrongResult = await checkPigJiraMetadata({ ...files, fetchImpl: wrongProject.fetchImpl });
  const projectRoute = wrongResult.routes.find(route => route.label === "pig_project");
  assert.equal(projectRoute.reason, "missing_known_target");
  assert.equal(projectRoute.selected, undefined);
  assert.ok(!formatPigJiraMetadata(wrongResult, "json").includes('"name":"Other"'));
  const cases = [
    ["/rest/api/3/project/10001", { key: "PIG", name: "Pigboard" }, "malformed_body"],
    ["/rest/api/3/project/10001/statuses", [{ id: "10009", name: "Bug",
      statuses: [{ id: "20001", name: "To Do" }] }], "fixture_mismatch"],
    ["/rest/api/3/project/10001/statuses", [{ id: "10009",
      statuses: [{ id: "20001", name: "To Do" }] }], "malformed_body"],
    ["/rest/api/3/project/10001/statuses", [{ id: "10001", name: "Bug",
      statuses: [{ id: "20001", name: "To Do" }] }], "missing_known_target"],
    ["/rest/api/3/project/search?keys=PIG&startAt=0&maxResults=50",
      { isLast: true, values: [] }, "missing_known_target"],
    ["/rest/api/3/project/search?keys=PIG&startAt=0&maxResults=50",
      { isLast: true, values: [{ id: "10001", key: "PIG", name: "Pigboard" },
        { id: "10001", key: "PIG", name: "Pigboard" }] }, "malformed_body"],
    ["/rest/agile/1.0/board?projectKeyOrId=10001&startAt=0&maxResults=50",
      { isLast: false, values: [{ id: 2, name: "KAN board", type: "kanban" }] }, "unfinished_page"],
    ["/rest/agile/1.0/board/35/configuration",
      { id: 35, filter: { id: 999 }, columnConfig: { columns: [
        { name: "To Do", statuses: [{ id: "20001" }] }] } }, "fixture_mismatch"],
    ["/rest/agile/1.0/board/35", { name: "Pigboard Selection QA", type: "kanban" }, "malformed_body"],
    ["/rest/api/3/filter/10034",
      { id: 10034, jql: "project = OTHER ORDER BY Rank ASC" }, "fixture_mismatch"]
  ];
  for (const [path, body, expected] of cases) {
    const { fetchImpl } = fakeFetch({ [path]: json(body) });
    const result = await checkPigJiraMetadata({ ...files, fetchImpl });
    assert.equal(result.status, "metadata_incomplete");
    assert.ok(result.routes.some(route => route.reason === expected));
    assert.ok(!formatPigJiraMetadata(result, "json").includes("project = OTHER"));
  }
});

test("denied configuration, unfinished static page and malformed or oversized body stay incomplete", async t => {
  const files = credentials(t);
  const cases = [
    ["/rest/agile/1.0/board/2/configuration", json({ errorMessages: ["private detail"] }, 403), "permission_denied"],
    ["/rest/agile/1.0/board/2/project/full", json({ isLast: false, values: [] }), "unfinished_page"],
    ["/rest/agile/1.0/board/2/project/full", json([null]), "malformed_body"],
    ["/rest/api/3/project/10001", new Response("not-json"), "malformed_body"],
    ["/rest/api/3/project/10001", new Response("x".repeat(256 * 1024 + 1)), "oversized_body"]
  ];
  for (const [path, response, expected] of cases) {
    const { fetchImpl } = fakeFetch({ [path]: response });
    const result = await checkPigJiraMetadata({ ...files, fetchImpl });
    assert.equal(result.status, "metadata_incomplete");
    assert.ok(result.routes.some(route => route.reason === expected));
    assert.ok(!formatPigJiraMetadata(result, "json").includes("private detail"));
  }
});

test("timeout is a named incomplete outcome without vendor error text", async t => {
  const files = credentials(t);
  const result = await checkPigJiraMetadata({ ...files, fetchImpl: async () => {
    const error = new Error("private upstream detail");
    error.name = "TimeoutError";
    throw error;
  } });
  assert.equal(result.status, "metadata_incomplete");
  assert.equal(result.routes[0].reason, "timeout");
  assert.ok(!formatPigJiraMetadata(result, "json").includes("private upstream detail"));
  const abortingBody = new Response(new ReadableStream({
    pull(controller) {
      const error = new Error("private streaming detail");
      error.name = "AbortError";
      controller.error(error);
    }
  }));
  const streamed = fakeFetch({ "/rest/api/3/project/10001": abortingBody });
  const streamedResult = await checkPigJiraMetadata({ ...files, fetchImpl: streamed.fetchImpl });
  const projectRoute = streamedResult.routes.find(route => route.label === "pig_project");
  assert.equal(streamedResult.status, "metadata_incomplete");
  assert.equal(projectRoute.httpStatus, 200);
  assert.equal(projectRoute.reason, "timeout");
  assert.ok(!formatPigJiraMetadata(streamedResult, "json").includes("private streaming detail"));
});

test("redirect returns incomplete and causes no follow-up request", async t => {
  const files = credentials(t);
  const { calls, fetchImpl } = fakeFetch({ token: new Response(null, {
    status: 302, headers: { Location: "https://example.invalid/steal" }
  }) });
  const result = await checkPigJiraMetadata({ ...files, fetchImpl });
  assert.equal(result.status, "metadata_incomplete");
  assert.equal(result.routes[0].reason, "redirect_refused");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.redirect, "error");
});

test("CLI gives matching JSON and text meaning with stable exit codes", async () => {
  const result = { schemaVersion: 1, status: "metadata_incomplete", reason: "identity_unverified",
    routes: [{ label: "service_identity", httpStatus: 200, reason: "wrong_identity", complete: false }],
    omissions: ["pair_validity"], nextAction: "Check identity." };
  const out = [];
  const args = ["--client-id-file", "/private/id", "--client-secret-file", "/private/secret"];
  assert.equal(await runPigJiraMetadataCommand([...args, "--format", "json"], {
    check: async () => result, output: value => out.push(value)
  }), 1);
  assert.deepEqual(JSON.parse(out[0]), result);
  assert.equal(await runPigJiraMetadataCommand(args, {
    check: async () => result, output: value => out.push(value)
  }), 1);
  assert.match(out[1], /service_identity: wrong_identity/);
  assert.equal(await runPigJiraMetadataCommand(["--client-id-file", "secret-value"], {
    check: async () => { throw new Error("must not call"); }, output: value => out.push(value)
  }), 2);
  assert.ok(!out.at(-1).includes("secret-value"));
  assert.match(out.at(-1), /--client-id-file ABSOLUTE_PATH --client-secret-file ABSOLUTE_PATH/);
});
