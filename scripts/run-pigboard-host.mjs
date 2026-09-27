#!/usr/bin/env node
import { checkRuntimeTarget, diagnoseNeonRoot } from "../src/hosted/neon-client.js";
import { inspectOwnGrant } from "../src/hosted/authority-self.js";
import { startHealthServer } from "../src/hosted/health-server.js";

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
    const server = await startHealthServer({ inspectSelf: (token) =>
      inspectOwnGrant(token, { secret: process.env.PIGBOARD_NEON_URL }) });
    const stop = () => server.close();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  }
}
