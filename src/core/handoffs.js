import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const HANDOFF_VERSION = 1;
const HANDOFF_MARKER = "ski-stack-handoff";
const MAX_COMMENT_BYTES = 60 * 1024;
const MIN_SECRET_BYTES = 32;

export const HandoffStage = Object.freeze({
  ARCHITECTURE: "architecture",
  GROOMING: "grooming",
  IMPLEMENTATION_PLAN: "implementation_plan",
  IMPLEMENTATION: "implementation",
  REVIEW: "review",
  BABYSIT: "babysit"
});

export function createStageHandoff({
  secret,
  repository,
  issueNumber,
  itemId,
  stage,
  inputFingerprint,
  payload,
  createdAt = new Date().toISOString()
}) {
  const signingKey = normalizeHandoffSecret(secret);
  const normalizedPayload = structuredClone(payload ?? {});
  assertSafeHandoffPayload(normalizedPayload);
  const payloadHash = hashCanonical(normalizedPayload);
  const operationId = stageOperationId({ itemId, stage, inputFingerprint });
  const unsigned = {
    version: HANDOFF_VERSION,
    repository: required(repository, "repository"),
    issueNumber: positiveInteger(issueNumber, "issueNumber"),
    itemId: required(itemId, "itemId"),
    stage: normalizeStage(stage),
    inputFingerprint: required(inputFingerprint, "inputFingerprint"),
    operationId,
    payloadHash,
    createdAt: validDate(createdAt, "createdAt"),
    payload: normalizedPayload
  };
  return { ...unsigned, signature: signEnvelope(unsigned, signingKey) };
}

export function verifyStageHandoff(envelope, { secret, repository, issueNumber, itemId, stage } = {}) {
  const signingKey = normalizeHandoffSecret(secret);
  if (!envelope || envelope.version !== HANDOFF_VERSION) throw new Error("Unsupported handoff version");
  const { signature, ...unsigned } = envelope;
  const expected = signEnvelope(unsigned, signingKey);
  if (!safeEqual(signature, expected)) throw new Error("Invalid handoff signature");
  if (hashCanonical(envelope.payload ?? {}) !== envelope.payloadHash) throw new Error("Handoff payload hash mismatch");
  assertSafeHandoffPayload(envelope.payload ?? {});
  if (stageOperationId(envelope) !== envelope.operationId) {
    throw new Error("Handoff operation id mismatch");
  }
  if (repository && envelope.repository.toLowerCase() !== String(repository).toLowerCase()) {
    throw new Error("Handoff repository mismatch");
  }
  if (issueNumber && envelope.issueNumber !== Number(issueNumber)) throw new Error("Handoff issue mismatch");
  if (itemId && envelope.itemId !== itemId) throw new Error("Handoff item mismatch");
  if (stage && envelope.stage !== stage) throw new Error("Handoff stage mismatch");
  return structuredClone(envelope);
}

export function formatStageHandoffComment(envelope) {
  assertSafeHandoffPayload(envelope?.payload ?? {});
  const encoded = Buffer.from(canonicalStringify(envelope), "utf8").toString("base64url");
  const body = [
    `## Ski Stack ${stageTitle(envelope.stage)} Handoff`,
    "",
    renderPayload(envelope),
    "",
    `<!-- ${HANDOFF_MARKER}:v${HANDOFF_VERSION}:${encoded} -->`
  ].join("\n");
  if (Buffer.byteLength(body, "utf8") > MAX_COMMENT_BYTES) throw new Error("Stage handoff comment exceeds size limit");
  return body;
}

export function parseStageHandoffComment(body) {
  const match = String(body ?? "").match(new RegExp(`<!--\\s*${HANDOFF_MARKER}:v(\\d+):([A-Za-z0-9_-]+)\\s*-->`));
  if (!match) return null;
  if (Number(match[1]) !== HANDOFF_VERSION) throw new Error("Unsupported handoff comment version");
  const envelope = JSON.parse(Buffer.from(match[2], "base64url").toString("utf8"));
  const expectedBody = formatStageHandoffComment(envelope);
  if (expectedBody !== String(body)) throw new Error("Stage handoff comment was edited");
  return envelope;
}

export function validateImplementationPlanPayload(payload, { completedReviewerIds } = {}) {
  if (!payload || typeof payload !== "object") throw new Error("implementation plan payload is required");
  if (!String(payload.plan ?? "").trim()) throw new Error("implementation plan Markdown is required");
  if (!payload.repository || !payload.baseRef || !payload.baseSha) {
    throw new Error("implementation plan repository and base snapshot are required");
  }
  for (const field of ["acceptanceCriteria", "tests", "risks"]) {
    if (!Array.isArray(payload[field])) throw new Error(`implementation plan ${field} must be an array`);
  }
  if (!payload.acceptanceCriteria.length || !payload.tests.length) {
    throw new Error("implementation plan acceptanceCriteria and tests cannot be empty");
  }
  const rounds = payload.adversarialReview?.rounds;
  if (!Array.isArray(rounds) || !rounds.length) throw new Error("adversarial review rounds are required");
  for (const [roundIndex, round] of rounds.entries()) {
    if (!Array.isArray(round?.reviews) || round.reviews.length < 2) {
      throw new Error(`adversarial review round ${roundIndex + 1} requires two reviews`);
    }
    const ids = new Set();
    for (const review of round.reviews) {
      const reviewerId = required(review?.reviewerId, "reviewerId");
      ids.add(reviewerId);
      required(review?.lens, "review lens");
      if (!Array.isArray(review?.findings)) throw new Error("review findings must be an array");
      for (const finding of review.findings) {
        required(finding?.summary ?? finding?.body, "review finding summary");
        required(finding?.disposition, "review finding disposition");
        required(finding?.revision, "review finding revision");
        required(finding?.rationale, "review finding rationale");
      }
    }
    if (ids.size < 2) throw new Error(`adversarial review round ${roundIndex + 1} requires distinct reviewers`);
  }
  const finalRound = rounds.at(-1);
  if (finalRound.reviews.some((review) => review.findings.length)) {
    throw new Error("final adversarial review round must be clean");
  }
  if (payload.adversarialReview?.verdict !== "clean") throw new Error("adversarial review verdict must be clean");
  if (completedReviewerIds !== undefined) {
    const completed = new Set(completedReviewerIds);
    if (completed.size < 2) throw new Error("Codex transcript must contain two completed review subagents");
    if (finalRound.reviews.some((review) => !completed.has(review.reviewerId))) {
      throw new Error("declared final reviewers were not completed in the Codex transcript");
    }
  }
  return structuredClone(payload);
}

export function contextFingerprint(value) {
  return hashCanonical(value ?? null);
}

export function stageOperationId({ itemId, stage, inputFingerprint }) {
  return hashCanonical({
    itemId: required(itemId, "itemId"),
    stage: normalizeStage(stage),
    inputFingerprint: required(inputFingerprint, "inputFingerprint")
  });
}

export function canonicalStringify(value) {
  return JSON.stringify(sortValue(value));
}

export function normalizeHandoffSecret(secret) {
  const value = String(secret ?? "");
  if (Buffer.byteLength(value, "utf8") < MIN_SECRET_BYTES) {
    throw new Error(`SKI_HANDOFF_SECRET must be at least ${MIN_SECRET_BYTES} bytes`);
  }
  return value;
}

export function assertSafeHandoffPayload(payload) {
  const serialized = canonicalStringify(payload);
  const unsafePatterns = [
    /(?:^|[\s(["'`])\/(?:Users|home|workspace|private|tmp|var|opt|etc|root)\//,
    /[A-Za-z]:\\(?:Users|Windows|ProgramData|Temp)\\/i,
    /(?:ghp_|github_pat_|sk-(?:proj-)?)[A-Za-z0-9_-]{12,}/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}/i,
    /\b(?:token|password|secret|api[_-]?key)\s*[=:]\s*["']?[A-Za-z0-9._~+\/-]{12,}/i
  ];
  if (unsafePatterns.some((pattern) => pattern.test(serialized))) {
    throw new Error("Stage handoff payload contains unsafe public output");
  }
  return structuredClone(payload);
}

function signEnvelope(unsigned, secret) {
  return createHmac("sha256", secret).update(canonicalStringify(unsigned)).digest("hex");
}

function hashCanonical(value) {
  return createHash("sha256").update(canonicalStringify(value)).digest("hex");
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left ?? ""));
  const rightBuffer = Buffer.from(String(right ?? ""));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function renderPayload(envelope) {
  const payload = envelope.payload ?? {};
  if (envelope.stage === HandoffStage.IMPLEMENTATION_PLAN) return String(payload.plan ?? "").trim();
  if (envelope.stage === HandoffStage.REVIEW) {
    const findings = payload.findings ?? [];
    return findings.length
      ? [`Verdict: ${payload.verdict}`, "", ...findings.map((finding) => `- [${finding.severity ?? "unspecified"}] ${finding.summary ?? finding.body ?? "Finding"}`)].join("\n")
      : `Verdict: ${payload.verdict ?? "clean"}`;
  }
  return String(payload.summary ?? `${stageTitle(envelope.stage)} handoff completed.`).trim();
}

function stageTitle(stage) {
  return String(stage).split("_").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ");
}

function normalizeStage(stage) {
  if (!Object.values(HandoffStage).includes(stage)) throw new Error(`Unsupported handoff stage: ${stage}`);
  return stage;
}

function required(value, name) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

function positiveInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`${name} must be a positive integer`);
  return number;
}

function validDate(value, name) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`${name} must be a valid date`);
  return date.toISOString();
}
