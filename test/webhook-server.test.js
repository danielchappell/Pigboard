import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { Readable } from "node:stream";
import test from "node:test";

import {
  createGitHubWebhookServer,
  handleGitHubWebhookRequest,
  isGlobalQueueWakeup,
  parseGitHubWebhook,
  verifyGitHubSignature
} from "../src/index.js";

test("verifyGitHubSignature validates sha256 webhook signatures", () => {
  const rawBody = Buffer.from(JSON.stringify({ action: "opened" }));
  const signature = `sha256=${createHmac("sha256", "secret").update(rawBody).digest("hex")}`;

  assert.equal(verifyGitHubSignature({ rawBody, signature, secret: "secret" }), true);
  assert.equal(verifyGitHubSignature({ rawBody, signature: "sha256=bad", secret: "secret" }), false);
});

test("GitHub webhook server accepts signed JSON events", async () => {
  const events = [];
  const body = JSON.stringify({
    action: "opened",
    repository: { full_name: "acme/repo" },
    issue: { number: 12 }
  });
  const response = await dispatchWebhook({
    secret: "secret",
    onEvent: async (event) => events.push(event),
    body,
    headers: {
      "content-type": "application/json",
      "x-github-event": "issues",
      "x-github-delivery": "delivery-1",
      "x-hub-signature-256": sign(body, "secret")
    }
  });

  assert.equal(response.status, 202);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    source: "github",
    kind: "repo",
    eventName: "issues",
    action: "opened",
    repository: "acme/repo",
    issueNumber: 12,
    pullRequestNumber: undefined,
    delivery: "delivery-1"
  });
});

test("issue and Project events wake every queue partition", () => {
  assert.equal(isGlobalQueueWakeup({ kind: "project", eventName: "projects_v2_item" }), true);
  assert.equal(isGlobalQueueWakeup({ kind: "repo", eventName: "issues", repository: "acme/repo" }), true);
  assert.equal(isGlobalQueueWakeup({ kind: "repo", eventName: "issue_comment", repository: "acme/repo" }), false);
});

test("reaction webhooks distinguish PR-description approval from comment reactions", () => {
  const base = {
    action: "created",
    repository: { full_name: "acme/repo" },
    issue: { number: 42, pull_request: { url: "https://api.github.com/repos/acme/repo/pulls/42" } },
    reaction: { id: 1, content: "+1" },
    sender: { login: "owner" }
  };
  assert.equal(parseGitHubWebhook({ eventName: "reaction", payload: base }).reactionSubject, "pull_request_description");
  assert.equal(
    parseGitHubWebhook({ eventName: "reaction", payload: { ...base, comment: { id: 2 } } }).reactionSubject,
    "comment"
  );
});

test("GitHub webhook server rejects wrong content type and bad signatures", async () => {
  const wrongType = await dispatchWebhook({
    secret: "secret",
    body: "{}",
    headers: { "content-type": "text/plain" }
  });
  assert.equal(wrongType.status, 415);

  const badSignature = await dispatchWebhook({
    secret: "secret",
    body: "{}",
    headers: {
      "content-type": "application/json",
      "x-github-event": "issues",
      "x-hub-signature-256": "sha256=bad"
    }
  });
  assert.equal(badSignature.status, 401);
});

test("GitHub webhook server rejects oversized bodies", async () => {
  const body = JSON.stringify({ oversized: true });
  const response = await dispatchWebhook({
    secret: "secret",
    maxBodyBytes: 4,
    body,
    headers: {
      "content-type": "application/json",
      "x-github-event": "issues",
      "x-hub-signature-256": sign(body, "secret")
    }
  });

  assert.equal(response.status, 413);
});

test("insecure webhook mode is loopback-only", () => {
  assert.throws(
    () =>
      createGitHubWebhookServer({
        insecureLocalWebhook: true,
        host: "0.0.0.0"
      }),
    /loopback/
  );
});

function sign(body, secret) {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

async function dispatchWebhook({ secret, onEvent, maxBodyBytes, body, headers }) {
  const req = Readable.from([body]);
  req.method = "POST";
  req.url = "/webhooks/github";
  req.headers = headers;
  const res = responseRecorder();
  await handleGitHubWebhookRequest({ secret, onEvent, maxBodyBytes }, req, res);
  return res;
}

function responseRecorder() {
  return {
    status: undefined,
    body: "",
    writeHead(status) {
      this.status = status;
    },
    end(body = "") {
      this.body += body;
    }
  };
}
