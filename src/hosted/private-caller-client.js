import * as fs from "node:fs";
import { request as httpRequest } from "node:http";
import { dirname, isAbsolute } from "node:path";

export const PRIVATE_SERVICE = Object.freeze(JSON.parse(fs.readFileSync(
  new URL("../../config/pigboard-private-service.json", import.meta.url), "utf8"
)));

const TOKEN = /^pb1_[A-Za-z0-9_-]{43}\n?$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const UNSAFE_NAME = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const GRANTS = new Set(["owner", "connection_admin"]);
const UNAVAILABLE_REASONS = new Set([
  "target_mismatch", "invalid_secret", "unsupported_channel_binding", "identity_mismatch",
  "tls_not_active", "tls_verification_failed", "authority_conflict",
  "schema_or_grant_mismatch", "inspection_unverified", "authentication_failed",
  "temporarily_unavailable"
]);
const REVIEWED_PRIVATE_IP = "fdaa:cb:e98:0:1::2";
const MAX_RESPONSE_BYTES = 8192;
// The host can spend up to 30s connecting to a sleeping Neon branch, then
// 5s validating the root and 5s reading the grant.
const DEADLINE_MS = 45_000;

export class CallerClientError extends Error {
  constructor(reason) {
    super(reason);
    this.name = "CallerClientError";
    this.reason = reason;
  }
}

function samePrivateParent(path, initial, ops) {
  const current = ops.lstatSync(path);
  return current.isDirectory() && current.uid === process.getuid() &&
    (current.mode & 0o777) === 0o700 && current.dev === initial.dev &&
    current.ino === initial.ino && ops.realpathSync(path) === initial.realpath;
}

export function readCallerTokenFile(path, { ops = fs } = {}) {
  if (typeof path !== "string" || !isAbsolute(path)) {
    throw new CallerClientError("unsafe_token_file");
  }
  let fd;
  try {
    const parentPath = dirname(path);
    const parent = ops.lstatSync(parentPath);
    if (!parent.isDirectory() || parent.uid !== process.getuid() ||
        (parent.mode & 0o777) !== 0o700) {
      throw new CallerClientError("unsafe_token_file");
    }
    const parentIdentity = { dev: parent.dev, ino: parent.ino,
      realpath: ops.realpathSync(parentPath) };
    const before = ops.lstatSync(path);
    if (!before.isFile() || before.uid !== process.getuid() ||
        (before.mode & 0o777) !== 0o600 || before.size < 47 || before.size > 64) {
      throw new CallerClientError("unsafe_token_file");
    }
    fd = ops.openSync(path, ops.constants.O_RDONLY | ops.constants.O_NOFOLLOW);
    const opened = ops.fstatSync(fd);
    if (!opened.isFile() || opened.uid !== process.getuid() ||
        (opened.mode & 0o777) !== 0o600 || opened.dev !== before.dev ||
        opened.ino !== before.ino || opened.size !== before.size) {
      throw new CallerClientError("unsafe_token_file");
    }
    const bytes = Buffer.alloc(65);
    let length = 0;
    while (length < bytes.length) {
      const count = ops.readSync(fd, bytes, length, bytes.length - length, length);
      if (count === 0) break;
      length += count;
    }
    if (length !== opened.size || length > 64 ||
        !samePrivateParent(parentPath, parentIdentity, ops)) {
      throw new CallerClientError("unsafe_token_file");
    }
    const value = bytes.subarray(0, length).toString("utf8");
    if (!TOKEN.test(value)) throw new CallerClientError("invalid_token_file");
    return value.endsWith("\n") ? value.slice(0, -1) : value;
  } catch (error) {
    if (error instanceof CallerClientError) throw error;
    throw new CallerClientError("unsafe_token_file");
  } finally {
    if (fd !== undefined) ops.closeSync(fd);
  }
}

function onlyKeys(value, keys) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function unverified(reason) {
  const nextAction = reason === "unsafe_token_file" || reason === "invalid_token_file" ?
    "Check the protected credential file and retry inspection." :
    "Check the private Pigboard route and service, then retry inspection.";
  return { schemaVersion: 1, status: "unverified", reason,
    omissions: ["current_grant"], nextAction };
}

function validatedResponse(httpStatus, headers, data) {
  const contentType = headers["content-type"];
  if (typeof contentType !== "string" ||
      !/^application\/json(?:;\s*charset=utf-8)?$/iu.test(contentType)) return unverified("invalid_response");
  let body;
  try {
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data));
  } catch {
    return unverified("invalid_response");
  }
  if (body?.schemaVersion !== 1) return unverified("invalid_response");
  if (httpStatus === 200 && onlyKeys(body, ["schemaVersion", "status", "team",
    "generation", "principal", "grants"]) && body.status === "ok" &&
      body.team === "pilot" && Number.isSafeInteger(body.generation) &&
      body.generation > 0 && onlyKeys(body.principal, ["id", "name", "kind"]) &&
      typeof body.principal.id === "string" && UUID.test(body.principal.id) &&
      typeof body.principal.name === "string" &&
      [...body.principal.name].length >= 1 && [...body.principal.name].length <= 120 &&
      !UNSAFE_NAME.test(body.principal.name) &&
      ["human", "agent"].includes(body.principal.kind) &&
      Array.isArray(body.grants) && body.grants.length >= 1 &&
      body.grants.length <= GRANTS.size &&
      body.grants.every((grant) => GRANTS.has(grant)) &&
      new Set(body.grants).size === body.grants.length) {
    return { schemaVersion: 1, status: "ok", team: "pilot",
      generation: body.generation,
      principal: { id: body.principal.id, name: body.principal.name,
        kind: body.principal.kind }, grants: [...body.grants] };
  }
  if (httpStatus === 401 && onlyKeys(body, ["schemaVersion", "status", "reason",
    "nextAction"]) && body.status === "denied" && body.reason === "invalid_credential" &&
      typeof body.nextAction === "string" && body.nextAction.length <= 512) {
    return { schemaVersion: 1, status: "denied", reason: "invalid_credential",
      nextAction: "Use a current Pigboard caller credential or ask the owner to inspect its grant." };
  }
  if (httpStatus === 503 && onlyKeys(body, ["schemaVersion", "status", "reason",
    "omissions", "nextAction"]) && body.status === "unavailable" &&
      UNAVAILABLE_REASONS.has(body.reason) &&
      Array.isArray(body.omissions) && body.omissions.length === 1 &&
      body.omissions[0] === "current_grant" &&
      typeof body.nextAction === "string" && body.nextAction.length <= 512) {
    return { schemaVersion: 1, status: "unavailable", reason: body.reason,
      omissions: ["current_grant"],
      nextAction: "Check the private Pigboard service and owner migration, then retry inspection." };
  }
  return unverified("invalid_response");
}

function validTarget(target) {
  return target && target.app === "pigboard-pilot-jdc" &&
    target.host === "pigboard-pilot-jdc.flycast" &&
    target.ip === REVIEWED_PRIVATE_IP && target.port === 80;
}

export async function inspectPrivateCaller({ tokenFile, request = httpRequest,
  deadlineMs = DEADLINE_MS, fileOps = fs } = {}) {
  let token;
  try {
    token = readCallerTokenFile(tokenFile, { ops: fileOps });
  } catch (error) {
    return unverified(error instanceof CallerClientError ? error.reason : "unsafe_token_file");
  }
  if (!validTarget(PRIVATE_SERVICE) || !Number.isSafeInteger(deadlineMs) || deadlineMs < 1) {
    return unverified("private_target_unverified");
  }
  return new Promise((resolve) => {
    const controller = new AbortController();
    let settled = false;
    let responseEnded = false;
    let clientRequest;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => {
      finish(unverified("deadline_exceeded"));
      controller.abort();
      if (clientRequest) clientRequest.destroy();
    }, deadlineMs);
    try {
      clientRequest = request({ host: PRIVATE_SERVICE.ip, port: PRIVATE_SERVICE.port, method: "GET",
        path: "/v1/authority/me", signal: controller.signal,
        headers: { Host: PRIVATE_SERVICE.host, Authorization: `Bearer ${token}`,
          Accept: "application/json" } }, (response) => {
        let size = 0;
        const chunks = [];
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > MAX_RESPONSE_BYTES) {
            finish(unverified("invalid_response"));
            clientRequest.destroy();
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          responseEnded = true;
          finish(validatedResponse(response.statusCode, response.headers,
            Buffer.concat(chunks)));
        });
        response.on("close", () => {
          if (!responseEnded) finish(unverified("transport_unverified"));
        });
      });
      clientRequest.on("error", () => finish(unverified("transport_unverified")));
      clientRequest.end();
    } catch {
      if (clientRequest) clientRequest.destroy();
      finish(unverified("transport_unverified"));
    }
  });
}

const CHOICES_BYTES = 64 * 1024;
const CHOICES_DEADLINE_MS = 95_000;
const CHOICE_OMISSIONS = ["pair_selection", "board_filter_eligibility", "issue_access"];
const CHOICE_FAILURES = {
  denied: new Set(["invalid_credential", "grant_denied"]),
  unavailable: new Set(["authority_unverified", "jira_unavailable"]),
  uncertain: new Set(["metadata_unverified"])
};

function choiceUnverified(reason) {
  return { schemaVersion: 1, status: "unverified", reason,
    omissions: ["approved_choices"],
    nextAction: "Check the protected token file and private Pigboard route, then retry discovery." };
}

function validChoiceName(value) {
  return typeof value === "string" && value.trim().length > 0 &&
    [...value].length <= 120 && !UNSAFE_NAME.test(value);
}

function validChoiceId(value) { return typeof value === "string" && /^[1-9]\d*$/u.test(value); }

function exact(value, keys) { return onlyKeys(value, keys); }

function validatedChoices(httpStatus, headers, bytes) {
  if (!/^application\/json(?:;\s*charset=utf-8)?$/iu.test(headers["content-type"] ?? "") ||
      headers["cache-control"] !== "no-store") return choiceUnverified("invalid_response");
  let value;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { return choiceUnverified("invalid_response"); }
  if (value?.schemaVersion !== 1 || typeof value.nextAction !== "string" ||
      value.nextAction.length > 512 || /[\p{Cc}\p{Cf}]/u.test(value.nextAction)) {
    return choiceUnverified("invalid_response");
  }
  if (httpStatus === 200 && value.status === "complete" &&
      exact(value, ["schemaVersion", "status", "site", "projects", "omissions", "nextAction"]) &&
      value.site === "scubapig.atlassian.net" && Array.isArray(value.projects) &&
      value.projects.length === 1 && Array.isArray(value.omissions) &&
      value.omissions.length === CHOICE_OMISSIONS.length &&
      value.omissions.every((item, index) => item === CHOICE_OMISSIONS[index])) {
    const project = value.projects[0];
    if (exact(project, ["id", "key", "name", "boards"]) &&
        project.id === "10001" && project.key === "PIG" &&
        validChoiceName(project.name) && Array.isArray(project.boards) &&
        project.boards.length <= 200) {
      let previous = 0n;
      const seen = new Set();
      for (const board of project.boards) {
        if (!exact(board, ["id", "name", "type"]) || !validChoiceId(board.id) ||
            !validChoiceName(board.name) || !validChoiceName(board.type) ||
            BigInt(board.id) <= previous || seen.has(board.id)) return choiceUnverified("invalid_response");
        previous = BigInt(board.id);
        seen.add(board.id);
      }
      return value;
    }
  }
  const expected = { denied: 401, unavailable: 503, uncertain: 502 };
  if (expected[value.status] === httpStatus &&
      exact(value, ["schemaVersion", "status", "reason", "omissions", "nextAction"]) &&
      CHOICE_FAILURES[value.status]?.has(value.reason) &&
      Array.isArray(value.omissions) && value.omissions.length === 1 &&
      value.omissions[0] === "approved_choices") return value;
  return choiceUnverified("invalid_response");
}

export async function discoverPrivateJira({ tokenFile, request = httpRequest,
  deadlineMs = CHOICES_DEADLINE_MS, fileOps = fs } = {}) {
  let token;
  try { token = readCallerTokenFile(tokenFile, { ops: fileOps }); }
  catch (error) { return choiceUnverified(error instanceof CallerClientError ? error.reason : "unsafe_token_file"); }
  if (!validTarget(PRIVATE_SERVICE) || !Number.isSafeInteger(deadlineMs) || deadlineMs < 1) {
    return choiceUnverified("private_target_unverified");
  }
  return new Promise((resolve) => {
    let settled = false;
    let ended = false;
    let clientRequest;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => {
      finish(choiceUnverified("deadline_exceeded"));
      clientRequest?.destroy();
    }, deadlineMs);
    try {
      clientRequest = request({ host: PRIVATE_SERVICE.ip, port: PRIVATE_SERVICE.port,
        method: "GET", path: "/v1/jira/choices",
        headers: { Host: PRIVATE_SERVICE.host, Authorization: `Bearer ${token}`,
          Accept: "application/json" } }, (response) => {
        let size = 0;
        const chunks = [];
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > CHOICES_BYTES) {
            finish(choiceUnverified("invalid_response"));
            clientRequest.destroy();
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          ended = true;
          finish(validatedChoices(response.statusCode, response.headers, Buffer.concat(chunks)));
        });
        response.on("close", () => {
          if (!ended) finish(choiceUnverified("transport_unverified"));
        });
      });
      clientRequest.on("error", () => finish(choiceUnverified("transport_unverified")));
      clientRequest.end();
    } catch {
      clientRequest?.destroy();
      finish(choiceUnverified("transport_unverified"));
    }
  });
}
