const DEFAULT_MAX_TEXT_LENGTH = 1200;
const DEFAULT_MAX_EVIDENCE_ITEMS = 8;

const UNSAFE_PATTERNS = [
  /\b[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|ACCESS_KEY|API_KEY)[A-Z0-9_]*\s*[:=]\s*\S+/i,
  /\b(?:sk|ghp|github_pat|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{12,}/,
  /(?:^|[\s(["'`])\/(?:Users|home|private|tmp|var|opt|etc|root)\//,
  /[A-Za-z]:\\(?:Users|Windows|ProgramData|Temp)\\/i,
  /\b(?:file|vscode|cursor):\/\//i,
  /\b(?:stream\.jsonl|stderr\.log|metadata\.json|transcript\.md|auth\.json)\b/i,
  /\b(?:CODEX_HOME|GH_CONFIG_DIR|SSH_AUTH_SOCK|GIT_ASKPASS)\b/,
  /"type"\s*:\s*"(?:thread\.started|turn\.started|item\.started|item\.completed|turn\.completed)"/,
  /^#{1,3}\s*(?:Prompt|System|Developer|User Message|Codex Worker Run)\b/im
];

export class PublicOutputRejectedError extends Error {
  constructor(reason) {
    super(`Unsafe public output: ${reason}`);
    this.name = "PublicOutputRejectedError";
    this.reason = reason;
  }
}

export function sanitizePublicOutput(input, options = {}) {
  const maxTextLength = options.maxTextLength ?? DEFAULT_MAX_TEXT_LENGTH;
  const maxEvidenceItems = options.maxEvidenceItems ?? DEFAULT_MAX_EVIDENCE_ITEMS;

  const output = {
    runId: requiredShortText(input.runId, "runId", 160),
    workerType: requiredShortText(input.workerType, "workerType", 80),
    outcome: requiredShortText(input.outcome, "outcome", 80),
    nextStatus: optionalShortText(input.nextStatus, "nextStatus", 80),
    summary: sanitizeText(input.summary ?? "", "summary", maxTextLength),
    evidence: sanitizeEvidence(input.evidence ?? [], maxEvidenceItems, maxTextLength),
    prUrl: optionalPublicUrl(input.prUrl, "prUrl"),
    commitUrl: optionalPublicUrl(input.commitUrl, "commitUrl"),
    commitSha: optionalShortText(input.commitSha, "commitSha", 80)
  };

  return Object.fromEntries(Object.entries(output).filter(([, value]) => value !== undefined));
}

export function formatPublicEventComment(output) {
  const safe = sanitizePublicOutput(output);
  const lines = [
    "## Ski Stack Worker Event",
    "",
    `Run: ${safe.runId}`,
    `Worker: ${safe.workerType}`,
    `Outcome: ${safe.outcome}`,
    safe.nextStatus ? `Next status: ${safe.nextStatus}` : null,
    "",
    safe.summary
  ].filter((line) => line !== null);

  if (safe.evidence.length) {
    lines.push("", "Evidence:");
    for (const item of safe.evidence) lines.push(`- ${item}`);
  }
  if (safe.prUrl) lines.push("", `PR: ${safe.prUrl}`);
  if (safe.commitUrl) lines.push(`Commit: ${safe.commitUrl}`);
  else if (safe.commitSha) lines.push(`Commit: ${safe.commitSha}`);
  return lines.join("\n");
}

export function formatWithheldPublicEvent({ runId, workerType, outcome = "blocked" }) {
  return formatPublicEventComment({
    runId,
    workerType,
    outcome,
    summary: "Worker output withheld locally by Ski Stack sanitizer",
    evidence: []
  });
}

function sanitizeEvidence(evidence, maxItems, maxTextLength) {
  if (!Array.isArray(evidence)) throw new PublicOutputRejectedError("evidence must be an array");
  return evidence.slice(0, maxItems).map((item, index) => sanitizeText(String(item), `evidence[${index}]`, maxTextLength));
}

function sanitizeText(value, field, maxLength) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.length > maxLength) throw new PublicOutputRejectedError(`${field} exceeds ${maxLength} characters`);
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(text)) throw new PublicOutputRejectedError(`${field} contains unsafe content`);
  }
  return text.replace(/\[([^\]]+)\]\((?:file|vscode|cursor):\/\/[^)]+\)/gi, "$1");
}

function requiredShortText(value, field, maxLength) {
  const text = sanitizeText(value, field, maxLength);
  if (!text) throw new PublicOutputRejectedError(`${field} is required`);
  return text;
}

function optionalShortText(value, field, maxLength) {
  if (value === undefined || value === null || value === "") return undefined;
  return sanitizeText(value, field, maxLength);
}

function optionalPublicUrl(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  const url = sanitizeText(value, field, 500);
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/|$)/.test(url)) {
    throw new PublicOutputRejectedError(`${field} must be a public GitHub URL`);
  }
  return url;
}
