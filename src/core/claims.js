const CLAIM_PREFIX = "ski.";

export function createClaimId({ itemId, workerId, expiresAt }) {
  if (!itemId) throw new Error("itemId is required");
  if (!workerId) throw new Error("workerId is required");
  if (!expiresAt) throw new Error("expiresAt is required");

  const payload = JSON.stringify({ itemId, workerId, expiresAt });
  return `${CLAIM_PREFIX}${Buffer.from(payload, "utf8").toString("base64url")}`;
}

export function parseClaimId(claimId) {
  if (!claimId?.startsWith(CLAIM_PREFIX)) {
    throw new Error("Invalid Ski Stack claim id");
  }

  const payload = Buffer.from(claimId.slice(CLAIM_PREFIX.length), "base64url").toString("utf8");
  const parsed = JSON.parse(payload);

  if (!parsed.itemId || !parsed.workerId || !parsed.expiresAt) {
    throw new Error("Invalid Ski Stack claim payload");
  }

  return parsed;
}

