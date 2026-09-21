import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateWorkflowProfile, formatWorkflowProfileReport } from "../src/core/workflow-profile.js";
import * as publicApi from "../src/index.js";

const example = JSON.parse(readFileSync(new URL("../ski.workflow.example.json", import.meta.url), "utf8"));
const profile = () => structuredClone(example);

function invalid(value, path, code) {
  const result = validateWorkflowProfile(value);
  assert.equal(result.ok, false);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.liveReady, false);
  assert.equal(result.code, "invalid_profile");
  assert.ok(result.errors.some((error) => error.path === path && error.code === code), JSON.stringify(result));
  assert.equal(Object.hasOwn(result, "route"), false);
  assert.equal(Object.hasOwn(result, "digest"), false);
  return result;
}

test("public validator previews the complete route and never claims live readiness", () => {
  assert.equal(publicApi.validateWorkflowProfile, validateWorkflowProfile);
  assert.equal(publicApi.formatWorkflowProfileReport, formatWorkflowProfileReport);
  const result = validateWorkflowProfile(profile());
  assert.equal(result.ok, true);
  assert.equal(result.profileId, example.id);
  assert.match(result.digest, /^[a-f0-9]{64}$/);
  assert.deepEqual(result.route, {
    teamRef: example.teamRef, board: example.board,
    stage: example.worker.stage, role: example.worker.role,
    repository: example.repository, runner: example.runner
  });
  assert.equal(result.liveReady, false);
  assert.deepEqual(result.unchecked, [
    "connection_access", "native_workflow_resolution", "repository_access",
    "model_availability", "execution_authorization"
  ].map((code) => ({ code, status: "not_checked" })));
});

test("digest is stable across key order, but identifies changed profile content", () => {
  function reverse(value) {
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).reverse().map(([key, entry]) => [key, reverse(entry)]));
  }
  const original = validateWorkflowProfile(profile());
  assert.deepEqual(validateWorkflowProfile(reverse(profile())), original);
  const changed = profile();
  changed.board.optInLabel = "ai-pilot";
  assert.notEqual(validateWorkflowProfile(changed).digest, original.digest);
});

test("validation does not mutate input and the route shares no mutable input objects", () => {
  const input = profile();
  for (const value of Object.values(input)) if (typeof value === "object") Object.freeze(value);
  Object.freeze(input);
  const result = validateWorkflowProfile(input);
  result.route.board.projectKey = "OTHER";
  result.route.runner.model = "different";
  result.route.repository.revision = "a".repeat(40);
  assert.deepEqual(input, example);
  assert.deepEqual(validateWorkflowProfile(input), validateWorkflowProfile(profile()));
});

test("unsupported fixed choices are actionable and safe", () => {
  for (const [parent, field, value] of [
    [null, "version", 2], ["board", "type", "other"], ["runner", "type", "other"],
    ["worker", "role", "implementer"], ["worker", "stage", "implementation"]
  ]) {
    const input = profile();
    (parent ? input[parent] : input)[field] = value;
    invalid(input, parent ? `$.${parent}.${field}` : `$.${field}`, "unsupported_value");
  }
});

test("all required fields and nested object shapes are checked", () => {
  for (const parent of [null, "board", "worker", "repository", "runner"]) {
    const fields = parent ? example[parent] : example;
    for (const field of Object.keys(fields)) {
      const input = profile();
      delete (parent ? input[parent] : input)[field];
      invalid(input, parent ? `$.${parent}.${field}` : `$.${field}`, "missing_field");
    }
    const input = profile();
    if (parent) {
      input[parent] = [];
      invalid(input, `$.${parent}`, "wrong_type");
    }
  }
  for (const value of [null, [], true, "source", 1, undefined, new Date()]) invalid(value, "$", "wrong_type");
});

test("diagnostics reject unknown fields at known parents without leaking names or values", () => {
  const secret = "private-token-do-not-echo";
  for (const parent of [null, "board", "worker", "repository", "runner"]) {
    const input = profile();
    (parent ? input[parent] : input)[secret] = { [secret]: secret };
    const result = invalid(input, parent ? `$.${parent}` : "$", "unexpected_field");
    assert.ok(!JSON.stringify(result).includes(secret));
    assert.ok(!formatWorkflowProfileReport(result).includes(secret));
  }
  const input = profile();
  input.worker.role = secret;
  assert.ok(!JSON.stringify(invalid(input, "$.worker.role", "unsupported_value")).includes(secret));
});

test("references and names enforce bounds without normalizing", () => {
  for (const bad of ["", ".start", "space here", "../path", "a".repeat(65), "a\n", "é"]) {
    const input = profile(); input.id = bad;
    invalid(input, "$.id", "invalid_value");
  }
  for (const bad of ["", " outer", "outer ", "a\nb", "a\u0000b", "a\u0085b", "a\u202eb", "\ud800", "x".repeat(129)]) {
    const input = profile(); input.board.readyStatus = bad;
    invalid(input, "$.board.readyStatus", "invalid_value");
  }
  const input = profile();
  input.id = "a".repeat(64);
  input.board.readyStatus = "🌱".repeat(128);
  assert.equal(validateWorkflowProfile(input).ok, true);
  input.runner.model = { toString() { throw new Error("must not call"); } };
  invalid(input, "$.runner.model", "wrong_type");
});

test("repository URL excludes credentials and mutable or ambiguous source paths", () => {
  for (const url of [
    "http://github.com/o/r", "https://secret@github.com/o/r", "https://github.com:443/o/r",
    "https://github.com/o/r?token=secret", "https://github.com/o/r#main", "https://github.com/o/r/",
    "https://github.com/o/r/tree/main", "https://github.com/o/..", "https://github.com/o/.",
    "https://github.com/o/r\n", "https://github.com.evil/o/r", "https://github.com/o/%2e%2e",
    "https://github.com/o/r\\other", "https://github.com/o/" + "r".repeat(2048)
  ]) {
    const input = profile(); input.repository.url = url;
    const result = invalid(input, "$.repository.url", "invalid_value");
    assert.ok(!JSON.stringify(result).includes("secret"));
  }
  for (const revision of ["main", "a".repeat(39), "a".repeat(41), "z".repeat(40), "a".repeat(40) + "\n"]) {
    const input = profile(); input.repository.revision = revision;
    invalid(input, "$.repository.revision", "invalid_value");
  }
  const input = profile(); input.repository.revision = "A".repeat(40);
  assert.equal(validateWorkflowProfile(input).ok, true);
});

test("non-JSON library values cannot execute callbacks or reach recursive serialization", () => {
  let called = 0;
  const input = profile();
  Object.defineProperty(input, "id", { enumerable: true, get() { called += 1; return "oops"; } });
  invalid(input, "$.id", "wrong_type");
  const serializer = profile();
  serializer.toJSON = () => { called += 1; return example; };
  invalid(serializer, "$", "unexpected_field");
  const proxy = new Proxy({}, { getPrototypeOf() { called += 1; throw new Error("trap"); } });
  invalid(proxy, "$", "wrong_type");
  const { proxy: revoked, revoke } = Proxy.revocable({}, {}); revoke();
  invalid(revoked, "$", "wrong_type");
  const cycle = profile(); cycle.board = cycle;
  invalid(cycle, "$.board", "unexpected_field");
  const deep = profile(); deep.repository.url = { nested: {} };
  deep.repository.url.nested = deep.repository.url;
  invalid(deep, "$.repository.url", "wrong_type");
  for (const value of [undefined, 1n, () => {}, Symbol("secret")]) {
    const input = profile(); input.id = value;
    invalid(input, "$.id", "wrong_type");
  }
  const hidden = profile(); Object.defineProperty(hidden, "id", { enumerable: false });
  invalid(hidden, "$.id", "wrong_type");
  const symbol = profile(); symbol[Symbol("secret")] = true;
  invalid(symbol, "$", "unexpected_field");
  const huge = profile(); huge.board.readyStatus = "x".repeat(65537);
  invalid(huge, "$.board.readyStatus", "invalid_value");
  assert.equal(called, 0);
  assert.equal(validateWorkflowProfile(Object.assign(Object.create(null), example)).ok, true);
});

test("text report includes every route choice and every live limitation", () => {
  const result = validateWorkflowProfile(profile());
  const text = formatWorkflowProfileReport(result);
  for (const value of [result.profileId, result.digest, result.route.teamRef,
    ...Object.values(result.route.board), result.route.stage, result.route.role,
    ...Object.values(result.route.repository), ...Object.values(result.route.runner)]) assert.ok(text.includes(value));
  for (const { code, status } of result.unchecked) assert.ok(text.includes(`${code}: ${status}`));
  assert.match(text, /Live ready: no/);
});
