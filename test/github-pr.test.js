import assert from "node:assert/strict";
import test from "node:test";

import { ensurePullRequest } from "../src/index.js";

test("ensurePullRequest creates a PR when no open branch PR exists", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (options.method === "GET") return jsonResponse([]);
    if (options.method === "POST") {
      return jsonResponse({
        number: 42,
        html_url: "https://github.com/acme/repo/pull/42",
        node_id: "PR_node",
        head: { sha: "a".repeat(40) },
        base: { sha: "b".repeat(40) }
      });
    }
    throw new Error(`unexpected ${options.method}`);
  };

  const pr = await ensurePullRequest({
    token: "token",
    repository: "acme/repo",
    branchName: "ski/12-run",
    baseBranch: "main",
    title: "Ski Stack: Build thing",
    body: "Body",
    fetchImpl
  });

  assert.equal(pr.url, "https://github.com/acme/repo/pull/42");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[1].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    title: "Ski Stack: Build thing",
    head: "ski/12-run",
    base: "main",
    body: "Body",
    maintainer_can_modify: true
  });
});

test("ensurePullRequest updates an existing open branch PR", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (options.method === "GET") return jsonResponse([{ number: 42 }]);
    if (options.method === "PATCH") {
      return jsonResponse({
        number: 42,
        html_url: "https://github.com/acme/repo/pull/42",
        node_id: "PR_node",
        head: { sha: "a".repeat(40) },
        base: { sha: "b".repeat(40) }
      });
    }
    throw new Error(`unexpected ${options.method}`);
  };

  const pr = await ensurePullRequest({
    token: "token",
    repository: "acme/repo",
    branchName: "ski/12-run",
    baseBranch: "main",
    title: "Ski Stack: Build thing",
    body: "Updated body",
    fetchImpl
  });

  assert.equal(pr.number, 42);
  assert.equal(calls[1].options.method, "PATCH");
  assert.match(calls[1].url, /\/repos\/acme\/repo\/pulls\/42$/);
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    title: "Ski Stack: Build thing",
    body: "Updated body"
  });
});

function jsonResponse(body) {
  return {
    ok: true,
    json: async () => body,
    text: async () => JSON.stringify(body)
  };
}

