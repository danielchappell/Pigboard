import assert from "node:assert/strict";
import { test } from "node:test";
import { digestCallerToken } from "../src/hosted/authority-bootstrap.js";
import { inspectOwnGrant } from "../src/hosted/authority-self.js";
import { PinnedNeonError } from "../src/hosted/neon-client.js";

const TOKEN = `pb1_${"A".repeat(43)}`;

test("a current caller sees only their own grant from one statement", async () => {
  let queries = 0;
  let closed = 0;
  const result = await inspectOwnGrant(TOKEN, { secret: "private-url",
    openConnection: async (secret) => {
      assert.equal(secret, "private-url");
      return { client: { query: async (sql, params) => {
        queries += 1;
        assert.match(sql, /^\s*SELECT\b/u);
        assert.doesNotMatch(sql, /FOR SHARE|FOR UPDATE/iu);
        assert.deepEqual(params, [digestCallerToken(TOKEN)]);
        return { rows: [{ team_key: "pilot", generation: "2",
          principal_id: "p1", name: "First Owner", kind: "human",
          digest_version: "sha256-v1", digest: digestCallerToken(TOKEN),
          roles: ["connection_admin", "owner"] }] };
      } }, close: async () => { closed += 1; } };
    } });
  assert.deepEqual(result, { schemaVersion: 1, status: "ok", team: "pilot",
    generation: 2, principal: { id: "p1", name: "First Owner", kind: "human" },
    grants: ["connection_admin", "owner"] });
  assert.equal(queries, 1);
  assert.equal(closed, 1);
  assert.equal(JSON.stringify(result).includes("private-url"), false);
  assert.equal(JSON.stringify(result).includes(TOKEN), false);
});

test("invalid and inactive credentials reveal no caller data", async () => {
  let opens = 0;
  const openConnection = async () => {
    opens += 1;
    return { client: { query: async () => ({ rows: [] }) }, close: async () => {} };
  };
  const malformed = await inspectOwnGrant("not-a-token", { openConnection });
  assert.equal(malformed.status, "denied");
  assert.equal(opens, 0);
  const inactive = await inspectOwnGrant(TOKEN, { openConnection });
  assert.equal(inactive.status, "denied");
  assert.equal(opens, 1);
  assert.equal("principal" in inactive, false);
  assert.equal("grants" in inactive, false);
});

test("wrong root, SQL grants, and unknown database errors are unavailable, not denial", async () => {
  const wrongRoot = await inspectOwnGrant(TOKEN, {
    openConnection: async () => { throw new PinnedNeonError("target_mismatch"); }
  });
  assert.equal(wrongRoot.status, "unavailable");
  assert.equal(wrongRoot.reason, "target_mismatch");
  assert.deepEqual(wrongRoot.omissions, ["current_grant"]);
  assert.match(wrongRoot.nextAction, /root pin/);
  const deniedSql = await inspectOwnGrant(TOKEN, { openConnection: async () => ({
    client: { query: async () => {
      throw Object.assign(new Error("secret private SQL error"), { code: "42501" });
    } }, close: async () => {}
  }) });
  assert.equal(deniedSql.status, "unavailable");
  assert.equal(deniedSql.reason, "schema_or_grant_mismatch");
  assert.equal(JSON.stringify(deniedSql).includes("secret"), false);
  const down = await inspectOwnGrant(TOKEN, { openConnection: async () => {
    throw new Error("secret connection URL in driver error");
  } });
  assert.equal(down.status, "unavailable");
  assert.equal(down.reason, "inspection_unverified");
  assert.equal(JSON.stringify(down).includes("secret"), false);
});
