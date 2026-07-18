import assert from "node:assert/strict";
import test from "node:test";

import { ensurePullRequest, mergePullRequest } from "../src/index.js";

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
        head: { ref: "ski/12-run", sha: "a".repeat(40), repo: { full_name: "acme/repo" } },
        base: { ref: "main", sha: "b".repeat(40) }
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
    draft: false,
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
        head: { ref: "ski/12-run", sha: "a".repeat(40), repo: { full_name: "acme/repo" } },
        base: { ref: "main", sha: "b".repeat(40) }
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

test("ensurePullRequest fails closed when GitHub omits the expected PR head", async () => {
  const fetchImpl = async (_url, options) => {
    if (options.method === "GET") return jsonResponse([]);
    return jsonResponse({ number: 42, html_url: "https://github.com/acme/repo/pull/42" });
  };

  await assert.rejects(
    () => ensurePullRequest({
      token: "token",
      repository: "acme/repo",
      branchName: "ski/issue-12",
      baseBranch: "main",
      expectedHeadSha: "a".repeat(40),
      title: "Ski Stack: Build thing",
      body: "Body",
      fetchImpl
    }),
    /head drifted/
  );
});

test("mergePullRequest sends an expected head SHA guard", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (options.method === "PUT") {
      return jsonResponse({
        merged: true,
        sha: "m".repeat(40),
        message: "Pull Request successfully merged"
      });
    }
    throw new Error(`unexpected ${options.method}`);
  };

  const merged = await mergePullRequest({
    token: "token",
    repository: "acme/repo",
    number: 42,
    expectedHeadSha: "a".repeat(40),
    method: "squash",
    title: "Ski Stack: merge PR #42",
    message: "Ready for QA",
    fetchImpl
  });

  assert.equal(merged.sha, "m".repeat(40));
  assert.equal(calls[0].options.method, "PUT");
  assert.match(calls[0].url, /\/repos\/acme\/repo\/pulls\/42\/merge$/);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    sha: "a".repeat(40),
    merge_method: "squash",
    commit_title: "Ski Stack: merge PR #42",
    commit_message: "Ready for QA"
  });
});

function jsonResponse(body) {
  return {
    ok: true,
    json: async () => body,
    text: async () => JSON.stringify(body)
  };
}
