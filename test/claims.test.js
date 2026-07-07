import assert from "node:assert/strict";
import test from "node:test";

import { createClaimId, parseClaimId } from "../src/index.js";

test("claim IDs round-trip across processes", () => {
  const claimId = createClaimId({
    itemId: "PVTI_item_1",
    workerId: "host:123:implementer",
    expiresAt: "2026-07-07T12:30:00.000Z"
  });

  assert.match(claimId, /^ski\./);
  assert.deepEqual(parseClaimId(claimId), {
    itemId: "PVTI_item_1",
    workerId: "host:123:implementer",
    expiresAt: "2026-07-07T12:30:00.000Z"
  });
});

