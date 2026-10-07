#!/usr/bin/env node
import { checkRuntimeTarget, diagnoseNeonRoot } from "../src/hosted/neon-client.js";
import { openPinnedRuntimeClient, PinnedNeonError, queryWithAbort } from "../src/hosted/neon-client.js";
import { inspectOwnGrant } from "../src/hosted/authority-self.js";
import { startHealthServer } from "../src/hosted/health-server.js";
import { discoverApprovedJira, validApprovedJira } from "../src/jira/approved-discovery.js";
import { readFileSync } from "node:fs";

let approvedJira;
try {
  const loaded = JSON.parse(readFileSync(new URL("../config/pigboard-approved-jira.json", import.meta.url), "utf8"));
  if (validApprovedJira(loaded)) approvedJira = loaded;
} catch { /* Discovery fails closed; liveness and grant inspection remain. */ }

function inspectDiscoveryGrant(token, signal, deadlineAt) {
  return inspectOwnGrant(token, { secret: process.env.PIGBOARD_NEON_URL,
    openConnection: async (secret) => {
      const remaining = deadlineAt - Date.now();
      if (signal.aborted || remaining <= 0) throw new PinnedNeonError("temporarily_unavailable");
      const connection = await openPinnedRuntimeClient(secret, { signal,
        connectionTimeoutMs: remaining, queryTimeoutMs: remaining });
      if (signal.aborted) { await connection.close(); throw new PinnedNeonError("temporarily_unavailable"); }
      return { client: { query: (...args) => queryWithAbort(connection.client, signal, ...args) },
        close: connection.close };
    } });
}

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--diagnose-root")) {
  process.stderr.write("Usage: node scripts/run-pigboard-host.mjs [--diagnose-root]\n");
  process.exitCode = 2;
} else if (args[0] === "--diagnose-root") {
  const result = await diagnoseNeonRoot(process.env.PIGBOARD_NEON_URL);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.status === "pass" ? 0 : 1;
} else {
  const target = checkRuntimeTarget(process.env.PIGBOARD_NEON_URL);
  if (target.status !== "pass") {
    process.stderr.write(`${JSON.stringify({ status: "fail", check: target })}\n`);
    process.exitCode = 1;
  } else {
    const server = await startHealthServer({
      inspectSelf: (token, signal, deadlineAt) => signal ?
        inspectDiscoveryGrant(token, signal, deadlineAt) :
        inspectOwnGrant(token, { secret: process.env.PIGBOARD_NEON_URL }),
      discoverChoices: ({ signal, deadlineAt }) => discoverApprovedJira({
        config: approvedJira, clientId: process.env.PIGBOARD_JIRA_CLIENT_ID,
        clientSecret: process.env.PIGBOARD_JIRA_CLIENT_SECRET, signal, deadlineAt })
    });
    const stop = () => server.close();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  }
}
