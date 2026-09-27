import { createServer } from "node:http";

const LIVE_BODY = JSON.stringify({ schemaVersion: 1, status: "live" });

export function createHealthServer() {
  return createServer((request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "content-length": Buffer.byteLength(LIVE_BODY),
        "cache-control": "no-store"
      });
      response.end(LIVE_BODY);
      return;
    }
    response.writeHead(404, { "content-length": 0, "cache-control": "no-store" });
    response.end();
  });
}

export async function startHealthServer({ host = "0.0.0.0", port = 8080 } = {}) {
  const server = createHealthServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  return server;
}
