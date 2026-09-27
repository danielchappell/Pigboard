import assert from "node:assert/strict";
import { test } from "node:test";
import { startHealthServer } from "../src/hosted/health-server.js";

test("private liveness works without a database secret or database call", async () => {
  const server = await startHealthServer({ host: "127.0.0.1", port: 0 });
  try {
    const { port } = server.address();
    const live = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { schemaVersion: 1, status: "live" });
    assert.equal(live.headers.get("cache-control"), "no-store");
    const other = await fetch(`http://127.0.0.1:${port}/admin?secret=x`);
    assert.equal(other.status, 404);
    assert.equal(await other.text(), "");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
