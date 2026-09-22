import { createHash } from "node:crypto";
import { isProxy } from "node:util/types";
import { canonicalStringify } from "./handoffs.js";

const MAX_BYTES = 64 * 1024;
const reference = { kind: "reference" };
const name = { kind: "name" };
const schema = {
  version: { kind: "literal", value: 1 },
  id: reference,
  teamRef: reference,
  board: {
    type: { kind: "literal", value: "jira" },
    connectionRef: reference,
    projectKey: name,
    issueType: name,
    readyStatus: name,
    optInLabel: name
  },
  worker: {
    stage: { kind: "literal", value: "technical-discovery" },
    role: { kind: "literal", value: "researcher" }
  },
  repository: { url: { kind: "repository" }, revision: { kind: "revision" } },
  runner: {
    type: { kind: "literal", value: "cursor" },
    connectionRef: reference,
    model: name
  }
};
const uncheckedCodes = [
  "connection_access", "native_workflow_resolution", "repository_access",
  "model_availability", "execution_authorization"
];

/** Check JSON data without resolving connections or granting execution authority. */
export function validateWorkflowProfile(profile) {
  const errors = [];
  const clean = validateObject(profile, schema, "$", errors);
  if (errors.length) return { schemaVersion: 1, ok: false, liveReady: false, code: "invalid_profile", errors };

  // Only detached, bounded, schema-validated data reaches the recursive serializer.
  const canonical = canonicalStringify(clean);
  if (Buffer.byteLength(canonical, "utf8") > MAX_BYTES) {
    return {
      schemaVersion: 1, ok: false, liveReady: false, code: "input_too_large",
      errors: [{ path: "$", code: "input_too_large", message: "Profile must fit within 64 KiB of UTF-8 JSON." }]
    };
  }
  return {
    schemaVersion: 1,
    ok: true,
    profileId: clean.id,
    digest: createHash("sha256").update(canonical).digest("hex"),
    route: {
      teamRef: clean.teamRef,
      board: clean.board,
      stage: clean.worker.stage,
      role: clean.worker.role,
      repository: clean.repository,
      runner: clean.runner
    },
    liveReady: false,
    unchecked: uncheckedCodes.map((code) => ({ code, status: "not_checked" }))
  };
}

function validateObject(value, fields, path, errors) {
  if (!value || typeof value !== "object" || isProxy(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    errors.push({ path, code: "wrong_type", message: "Expected a plain JSON object." });
    return;
  }
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string" || !Object.hasOwn(fields, key))) {
    errors.push({ path, code: "unexpected_field", message: "Only documented fields are allowed in this object." });
  }
  const clean = {};
  for (const [key, rule] of Object.entries(fields)) {
    const fieldPath = `${path}.${key}`;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) {
      errors.push({ path: fieldPath, code: "missing_field", message: "Required field is missing." });
    } else if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
      errors.push({ path: fieldPath, code: "wrong_type", message: "Expected an enumerable JSON data field." });
    } else if (!rule.kind) {
      clean[key] = validateObject(descriptor.value, rule, fieldPath, errors);
    } else if (validateField(descriptor.value, rule, fieldPath, errors)) {
      clean[key] = descriptor.value;
    }
  }
  return clean;
}

function validateField(value, rule, path, errors) {
  const type = rule.kind === "literal" ? typeof rule.value : "string";
  if (typeof value !== type) {
    errors.push({ path, code: "wrong_type", message: `Expected a ${type}.` });
    return false;
  }
  if (rule.kind === "literal") {
    if (value === rule.value) return true;
    errors.push({ path, code: "unsupported_value", message: `Supported value: ${JSON.stringify(rule.value)}.` });
    return false;
  }
  let valid;
  let message;
  switch (rule.kind) {
    case "reference":
      valid = value.length <= 64 && value.trim() === value && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value);
      message = "Use 1-64 ASCII letters, digits, dots, underscores or hyphens, starting with a letter or digit.";
      break;
    case "name":
      valid = value.length > 0 && value.length <= 256 && [...value].length <= 128 &&
        value.trim() === value && !/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(value);
      message = "Use 1-128 characters without outer whitespace, control characters or line/paragraph separators.";
      break;
    case "repository": {
      const match = value.length <= 2048 && /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+)$/.exec(value);
      valid = Boolean(match && match[0] === value && ![".", ".."].includes(match[2]));
      message = "Use a credential-free https://github.com/owner/repository URL with no query, fragment or extra path.";
      break;
    }
    case "revision":
      valid = value.length === 40 && /^[a-fA-F0-9]{40}$/.test(value);
      message = "Use an immutable 40-character hexadecimal source revision.";
      break;
  }
  if (!valid) errors.push({ path, code: "invalid_value", message });
  return Boolean(valid);
}

/** Human-readable view of a validator/CLI result; JSON remains the machine contract. */
export function formatWorkflowProfileReport(result) {
  if (!result.ok) {
    return [
      `Workflow profile check failed (${result.code}).`,
      ...result.errors.map((error) => `${error.path}: ${error.message} (${error.code})`),
      "Live ready: no. No work was started."
    ].join("\n");
  }
  const { route } = result;
  return [
    `Valid static workflow profile: ${result.profileId}`,
    `Digest (SHA-256): ${result.digest}`,
    `Team: ${route.teamRef}`,
    `Board: ${route.board.type} / ${route.board.projectKey} (${route.board.connectionRef})`,
    `Ticket: ${route.board.issueType}; status: ${route.board.readyStatus}; opt-in label: ${route.board.optInLabel}`,
    `Worker: ${route.role}; stage: ${route.stage}`,
    `Repository: ${route.repository.url} @ ${route.repository.revision}`,
    `Runner: ${route.runner.type} (${route.runner.connectionRef}); model: ${route.runner.model}`,
    "Live ready: no. This is an offline preview; no work was started.",
    "Live access and ticket eligibility have not been checked.",
    "Live prerequisites:",
    ...result.unchecked.map(({ code, status }) => `  ${code}: ${status}`)
  ].join("\n");
}
