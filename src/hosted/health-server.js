import { createServer } from "node:http";

const LIVE_BODY = { schemaVersion: 1, status: "live" };

function sendJson(response, status, body) {
  const value = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(value),
    "cache-control": "no-store"
  });
  response.end(value);
}

function bearerFrom(request) {
  const occurrences = request.rawHeaders.filter((header, index) =>
    index % 2 === 0 && header.toLowerCase() === "authorization").length;
  if (occurrences !== 1) return null;
  const header = request.headers.authorization;
  if (typeof header !== "string" || header.length > 128 ||
      !/^Bearer pb1_[A-Za-z0-9_-]{43}$/iu.test(header)) return null;
  return header.slice(7);
}

export function createHealthServer({ inspectSelf } = {}) {
  return createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, LIVE_BODY);
      return;
    }
    if (request.method === "GET" && request.url === "/v1/authority/me") {
      const token = bearerFrom(request);
      if (!token) {
        sendJson(response, 401, { schemaVersion: 1, status: "denied",
          reason: "invalid_credential" });
        return;
      }
      let result;
      try {
        result = typeof inspectSelf === "function" ? await inspectSelf(token) :
          { schemaVersion: 1, status: "unavailable", reason: "inspection_unverified",
            omissions: ["current_grant"] };
      } catch {
        result = { schemaVersion: 1, status: "unavailable", reason: "inspection_unverified",
          omissions: ["current_grant"] };
      }
      sendJson(response, result.status === "ok" ? 200 : result.status === "denied" ? 401 : 503,
        result);
      return;
    }
    response.writeHead(404, { "content-length": 0, "cache-control": "no-store" });
    response.end();
  });
}

export async function startHealthServer({ host = "0.0.0.0", port = 8080,
  inspectSelf } = {}) {
  const server = createHealthServer({ inspectSelf });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  return server;
}
