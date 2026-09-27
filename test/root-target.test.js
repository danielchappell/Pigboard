import test from "node:test";
import assert from "node:assert/strict";
import { ROOT_TARGET, checkRootTarget, publicTarget } from "../src/hosted/root-target.js";

test("the reviewed production root is the only accepted target", () => {
  assert.equal(checkRootTarget(ROOT_TARGET).status, "pass");
  for (const mutation of [
    { host: "ep-hidden-feather-b2qm5pb0.c-6.eu-central-1.aws.neon.tech" },
    { host: ROOT_TARGET.host.replace(".c-6.", "-pooler.c-6.") },
    { host: "127.0.0.1" },
    { port: 5433 }, { database: "other" }, { role: "pigboard_owner" }
  ]) {
    const result = checkRootTarget({ ...ROOT_TARGET, ...mutation });
    assert.equal(result.status, "fail");
    assert.equal(result.reason, "target_mismatch");
  }
  assert.deepEqual(publicTarget(), ROOT_TARGET);
});
