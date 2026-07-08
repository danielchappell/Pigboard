import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

import { parseGitHubWebhook } from "./webhook.js";

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

export function verifyGitHubSignature({ rawBody, signature, secret }) {
  if (!secret) throw new Error("GITHUB_WEBHOOK_SECRET is required");
  if (!signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function createGitHubWebhookServer({
  secret,
  onEvent,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  insecureLocalWebhook = false,
  host = "127.0.0.1"
}) {
  if (!secret && !(insecureLocalWebhook && isLoopbackHost(host))) {
    throw new Error("GitHub webhook secret is required unless insecure local webhook mode is enabled on loopback");
  }
  if (insecureLocalWebhook && !isLoopbackHost(host)) {
    throw new Error("--insecure-local-webhook is only allowed on loopback hosts");
  }

  return createServer((req, res) =>
    handleGitHubWebhookRequest({ secret, onEvent, maxBodyBytes }, req, res)
  );
}

export async function handleGitHubWebhookRequest({ secret, onEvent, maxBodyBytes = DEFAULT_MAX_BODY_BYTES }, req, res) {
  try {
    if (req.method === "GET" && req.url === "/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method !== "POST" || req.url !== "/webhooks/github") {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    if (!/^application\/json(?:\s*;.*)?$/i.test(req.headers["content-type"] ?? "")) {
      res.writeHead(415);
      res.end("GitHub webhook content_type=json is required");
      return;
    }

    const rawBody = await readRawBody(req, maxBodyBytes);
    if (secret && !verifyGitHubSignature({ rawBody, signature: req.headers["x-hub-signature-256"], secret })) {
      res.writeHead(401);
      res.end("invalid signature");
      return;
    }

    const eventName = req.headers["x-github-event"];
    const delivery = req.headers["x-github-delivery"];
    const payload = JSON.parse(rawBody.toString("utf8"));
    if (eventName === "ping") {
      res.writeHead(202);
      res.end("ok");
      return;
    }
    const event = parseGitHubWebhook({ eventName, payload });
    event.delivery = delivery;
    await onEvent?.(event);
    res.writeHead(202);
    res.end("accepted");
  } catch (error) {
    const status = /too large/i.test(error.message) ? 413 : 400;
    res.writeHead(status);
    res.end(error instanceof Error ? error.message : String(error));
  }
}

function readRawBody(req, maxBodyBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxBodyBytes) {
        reject(new Error("webhook body too large"));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function isLoopbackHost(host) {
  return ["127.0.0.1", "::1", "localhost"].includes(host);
}
