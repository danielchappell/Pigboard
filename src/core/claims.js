const CLAIM_PREFIX = "ski.";
const CLAIM_V2_PREFIX = "ski2.";
const DEFAULT_MAX_CLAIM_BYTES = 8192;

export function createClaimId({ itemId, workerId, expiresAt }) {
  if (!itemId) throw new Error("itemId is required");
  if (!workerId) throw new Error("workerId is required");
  if (!expiresAt) throw new Error("expiresAt is required");

  const payload = JSON.stringify({ itemId, workerId, expiresAt });
  return `${CLAIM_PREFIX}${Buffer.from(payload, "utf8").toString("base64url")}`;
}

export function createClaimV2Id(input, { maxBytes = DEFAULT_MAX_CLAIM_BYTES } = {}) {
  const claim = normalizeClaimV2(input);
  const payload = JSON.stringify(claim);
  const byteLength = Buffer.byteLength(payload, "utf8");
  if (byteLength > maxBytes) {
    throw new Error(`Ski Stack structured claim exceeds ${maxBytes} bytes`);
  }
  return `${CLAIM_V2_PREFIX}${Buffer.from(payload, "utf8").toString("base64url")}`;
}

export function parseClaimId(claimId) {
  if (claimId?.startsWith(CLAIM_V2_PREFIX)) {
    const payload = Buffer.from(claimId.slice(CLAIM_V2_PREFIX.length), "base64url").toString("utf8");
    return normalizeClaimV2(JSON.parse(payload));
  }

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

export function isClaimV2(claim) {
  return claim?.version === 2;
}

function normalizeClaimV2(input) {
  const claim = {
    version: 2,
    itemId: required(input.itemId, "itemId"),
    workerId: required(input.workerId, "workerId"),
    attemptId: required(input.attemptId, "attemptId"),
    runId: required(input.runId, "runId"),
    expiresAt: required(input.expiresAt, "expiresAt"),
    resolvedWorkerType: required(input.resolvedWorkerType, "resolvedWorkerType"),
    claimedStatus: required(input.claimedStatus, "claimedStatus"),
    repository: required(input.repository, "repository"),
    contentType: required(input.contentType, "contentType"),
    claimedAt: required(input.claimedAt, "claimedAt")
  };

  for (const key of [
    "claimedWorkerType",
    "issueNumber",
    "pullRequestNumber",
    "prUrl",
    "baseRef",
    "baseSha",
    "headRef",
    "headRepository",
    "headSha",
    "branchName",
    "availabilityFingerprint"
  ]) {
    if (input[key] !== undefined && input[key] !== null && input[key] !== "") {
      claim[key] = input[key];
    }
  }

  return claim;
}

function required(value, name) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}
