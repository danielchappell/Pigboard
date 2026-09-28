import * as fs from "node:fs";
import { dirname, isAbsolute } from "node:path";

const CLOUD_ID = "9b7d0e3f-4bd2-4017-a2a5-f99a443bec68";
const ACCOUNT_ID = "712020:8e6999c1-1a8e-493e-aea0-2b2902cde2bf";
const PROJECT_ID = "10001";
const PROJECT_KEY = "PIG";
const TASK_TYPE_ID = "10009";
const BOARD_IDS = ["2", "35"];
const QA_FILTER_ID = "10034";
const AUTH_URL = "https://auth.atlassian.com/oauth/token";
const JIRA_BASE = `https://api.atlassian.com/ex/jira/${CLOUD_ID}`;
const MAX_BODY = 256 * 1024;
const MAX_OUTPUT = 64 * 1024;
const ID = /^[1-9]\d*$/u;
const UNSAFE_NAME = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

export class JiraMetadataError extends Error {
  constructor(reason) {
    super(reason);
    this.name = "JiraMetadataError";
    this.reason = reason;
  }
}

function privateParent(path, original, ops) {
  const current = ops.lstatSync(path);
  return current.isDirectory() && current.uid === process.getuid() &&
    (current.mode & 0o777) === 0o700 && current.dev === original.dev &&
    current.ino === original.ino && ops.realpathSync(path) === original.realpath;
}

function readCredentialRecord(path, { ops = fs } = {}) {
  if (typeof path !== "string" || !isAbsolute(path)) throw new JiraMetadataError("unsafe_credential_file");
  let fd;
  try {
    const parentPath = dirname(path);
    const parent = ops.lstatSync(parentPath);
    if (!parent.isDirectory() || parent.uid !== process.getuid() ||
        (parent.mode & 0o777) !== 0o700) throw new JiraMetadataError("unsafe_credential_file");
    const parentIdentity = { dev: parent.dev, ino: parent.ino, realpath: ops.realpathSync(parentPath) };
    const before = ops.lstatSync(path);
    if (!before.isFile() || before.uid !== process.getuid() ||
        (before.mode & 0o777) !== 0o600 || before.size < 1 || before.size > 4096) {
      throw new JiraMetadataError("unsafe_credential_file");
    }
    fd = ops.openSync(path, ops.constants.O_RDONLY | ops.constants.O_NOFOLLOW);
    const opened = ops.fstatSync(fd);
    if (!opened.isFile() || opened.uid !== process.getuid() ||
        (opened.mode & 0o777) !== 0o600 || opened.dev !== before.dev ||
        opened.ino !== before.ino || opened.size !== before.size) {
      throw new JiraMetadataError("unsafe_credential_file");
    }
    const bytes = Buffer.alloc(4097);
    let length = 0;
    while (length < bytes.length) {
      const count = ops.readSync(fd, bytes, length, bytes.length - length, length);
      if (count === 0) break;
      length += count;
    }
    if (length !== opened.size || length > 4096 ||
        !privateParent(parentPath, parentIdentity, ops)) {
      throw new JiraMetadataError("unsafe_credential_file");
    }
    const end = bytes[length - 1] === 10 ? length - 1 : length;
    if (end < 1) throw new JiraMetadataError("invalid_credential_file");
    for (let index = 0; index < end; index += 1) {
      if (bytes[index] < 33 || bytes[index] > 126) throw new JiraMetadataError("invalid_credential_file");
    }
    return { value: bytes.subarray(0, end).toString("ascii"),
      dev: opened.dev, ino: opened.ino };
  } catch (error) {
    if (error instanceof JiraMetadataError) throw error;
    throw new JiraMetadataError("unsafe_credential_file");
  } finally {
    if (fd !== undefined) ops.closeSync(fd);
  }
}

export function readJiraCredentialFile(path, options) {
  return readCredentialRecord(path, options).value;
}

function validId(value) {
  return (typeof value === "string" || typeof value === "number") && ID.test(String(value));
}

function validName(value) {
  return typeof value === "string" && value.trim().length > 0 &&
    [...value].length <= 120 && !UNSAFE_NAME.test(value);
}

function boundedArray(value, limit = 50) {
  return Array.isArray(value) && value.length <= limit;
}

function reasonForStatus(status) {
  if (status === 401) return "authentication_denied";
  if (status === 403) return "permission_denied";
  if (status === 404) return "not_visible";
  if (status >= 300 && status < 400) return "redirect_refused";
  return "http_failure";
}

function isTimeout(error) {
  return error?.name === "TimeoutError" || error?.name === "AbortError";
}

async function boundedJson(url, init, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(url, { ...init, redirect: "error", signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    return { reason: isTimeout(error) ? "timeout" : "request_failed", httpStatus: null };
  }
  const httpStatus = response?.status;
  if (!Number.isInteger(httpStatus) || httpStatus < 100 || httpStatus > 599) {
    return { reason: "invalid_response", httpStatus: null };
  }
  if (httpStatus !== 200) return { reason: reasonForStatus(httpStatus), httpStatus };
  try {
    const reader = response.body?.getReader();
    if (!reader) return { reason: "malformed_body", httpStatus };
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) {
        await reader.cancel();
        return { reason: "oversized_body", httpStatus };
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks, size);
    return { body: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)), httpStatus };
  } catch (error) {
    return { reason: isTimeout(error) ? "timeout" : "malformed_body", httpStatus };
  }
}

function report(status, routes, reason = null) {
  const result = {
    schemaVersion: 1,
    status,
    site: "scubapig.atlassian.net",
    projectId: PROJECT_ID,
    boardIds: BOARD_IDS,
    routes,
    omissions: ["pair_validity", "issue_membership", "caller_audience", "other_D1_evidence"],
    nextAction: status === "metadata_complete" ?
      "Continue the separate D1 pair, issue and permission checks before S02a acceptance." :
      reason === "unsafe_credential_file" || reason === "invalid_credential_file" ?
        "Check the protected credential files before retrying; no Jira request was made." :
        "Resolve the named incomplete route or credential result, then retry the read-only check."
  };
  if (reason) result.reason = reason;
  if (Buffer.byteLength(JSON.stringify(result)) > MAX_OUTPUT) {
    return { schemaVersion: 1, status: "metadata_incomplete", reason: "output_limit",
      routes: [], omissions: result.omissions,
      nextAction: "Reduce the returned metadata and retry the read-only check." };
  }
  return result;
}

export async function checkPigJiraMetadata({ clientIdFile, clientSecretFile, ops = fs,
  fetchImpl = fetch } = {}) {
  const routes = [];
  if (clientIdFile === clientSecretFile) return report("metadata_incomplete", routes, "unsafe_credential_file");
  let clientIdRecord;
  let clientSecretRecord;
  try {
    clientIdRecord = readCredentialRecord(clientIdFile, { ops });
    clientSecretRecord = readCredentialRecord(clientSecretFile, { ops });
  } catch (error) {
    return report("metadata_incomplete", routes, error instanceof JiraMetadataError ?
      error.reason : "unsafe_credential_file");
  }
  if (clientIdRecord.dev === clientSecretRecord.dev &&
      clientIdRecord.ino === clientSecretRecord.ino) {
    return report("metadata_incomplete", routes, "unsafe_credential_file");
  }
  const clientId = clientIdRecord.value;
  const clientSecret = clientSecretRecord.value;

  const tokenReply = await boundedJson(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret,
      grant_type: "client_credentials" })
  }, fetchImpl);
  if (tokenReply.reason || typeof tokenReply.body?.access_token !== "string" ||
      tokenReply.body.access_token.length < 1 || tokenReply.body.access_token.length > 8192 ||
      !/^[\x21-\x7e]+$/u.test(tokenReply.body.access_token)) {
    routes.push({ label: "oauth_token", httpStatus: tokenReply.httpStatus,
      reason: tokenReply.reason || "malformed_body", complete: false });
    return report("metadata_incomplete", routes, "authentication_unverified");
  }
  routes.push({ label: "oauth_token", httpStatus: 200, reason: "ok", complete: true });
  const token = tokenReply.body.access_token;
  async function get(label, path, validate) {
    const reply = await boundedJson(`${JIRA_BASE}${path}`, {
      method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
    }, fetchImpl);
    if (reply.reason) {
      routes.push({ label, httpStatus: reply.httpStatus, reason: reply.reason, complete: false });
      return null;
    }
    let checked;
    try { checked = validate(reply.body); } catch { checked = null; }
    if (!checked || typeof checked.complete !== "boolean") checked = { complete: false, reason: "malformed_body" };
    const entry = { label, httpStatus: reply.httpStatus,
      reason: checked.reason || (checked.complete ? "ok" : "malformed_body"), complete: checked.complete };
    if (checked.selected) entry.selected = checked.selected;
    routes.push(entry);
    return checked.complete ? reply.body : null;
  }

  const identity = await get("service_identity", "/rest/api/3/myself", value => ({
    complete: value?.accountId === ACCOUNT_ID,
    reason: typeof value?.accountId !== "string" ||
      !/^[A-Za-z0-9:-]{1,128}$/u.test(value.accountId) ? "malformed_body" :
      value.accountId === ACCOUNT_ID ? "ok" : "wrong_identity"
  }));
  if (!identity) return report("metadata_incomplete", routes, "identity_unverified");

  await get("pig_project", `/rest/api/3/project/${PROJECT_ID}`, value => {
    if (!validId(value?.id) || !validName(value?.key) || !validName(value?.name)) {
      return { complete: false, reason: "malformed_body" };
    }
    const matches = value && String(value.id) === PROJECT_ID && value.key === PROJECT_KEY;
    const complete = !!matches && validName(value.name);
    return { complete, reason: complete ? "ok" : !matches ? "missing_known_target" : "malformed_body",
      selected: complete ? { id: PROJECT_ID, key: PROJECT_KEY, name: value.name } : undefined };
  });
  await get("pig_project_search", `/rest/api/3/project/search?keys=${PROJECT_KEY}&startAt=0&maxResults=50`, value => {
    if (!boundedArray(value?.values) || !value.values.every(item =>
      validId(item?.id) && validName(item?.key) && validName(item?.name))) {
      return { complete: false, reason: "malformed_body" };
    }
    if (value.isLast !== true) return { complete: false, reason: "unfinished_page" };
    const targets = value.values.filter(item => String(item?.id) === PROJECT_ID && item?.key === PROJECT_KEY);
    const target = targets[0];
    return { complete: targets.length === 1 && validName(target.name),
      reason: targets.length === 0 ? "missing_known_target" :
        targets.length === 1 && validName(target.name) ? "ok" : "malformed_body",
      selected: target && validName(target.name) ? { id: PROJECT_ID, key: PROJECT_KEY, name: target.name } : undefined };
  });
  let toDoStatusId;
  await get("pig_task_statuses", `/rest/api/3/project/${PROJECT_ID}/statuses`, value => {
    if (!boundedArray(value) || !value.every(item => validId(item?.id))) {
      return { complete: false, reason: "malformed_body" };
    }
    const tasks = value.filter(item => String(item?.id) === TASK_TYPE_ID);
    if (tasks.length === 0) return { complete: false, reason: "missing_known_target" };
    const statuses = tasks[0]?.statuses;
    if (tasks.length !== 1 || !validName(tasks[0].name) || !boundedArray(statuses) ||
        !statuses.every(item => validId(item?.id) && validName(item?.name))) {
      return { complete: false, reason: "malformed_body" };
    }
    if (tasks[0].name !== "Task") return { complete: false, reason: "fixture_mismatch" };
    const toDo = statuses.filter(item => item.name === "To Do");
    if (toDo.length !== 1) return { complete: false, reason: "status_mapping_incomplete" };
    toDoStatusId = String(toDo[0].id);
    return { complete: true, selected: { taskTypeId: TASK_TYPE_ID,
      taskTypeName: "Task", toDoStatusId } };
  });
  await get("pig_board_list", `/rest/agile/1.0/board?projectKeyOrId=${PROJECT_ID}&startAt=0&maxResults=50`, value => {
    if (!boundedArray(value?.values) || !value.values.every(item =>
      validId(item?.id) && validName(item?.name) && validName(item?.type))) {
      return { complete: false, reason: "malformed_body" };
    }
    if (value.isLast !== true) return { complete: false, reason: "unfinished_page" };
    const matches = BOARD_IDS.map(id => value.values.filter(item => String(item?.id) === id));
    if (matches.some(items => items.length === 0)) return { complete: false, reason: "missing_known_target" };
    if (matches.some(items => items.length !== 1)) return { complete: false, reason: "malformed_body" };
    const selected = matches.map(items => items[0]);
    if (selected.some(item => !validName(item.name) || !validName(item.type))) {
      return { complete: false, reason: "malformed_body" };
    }
    return { complete: true, selected: selected.map(item =>
      ({ id: String(item.id), name: item.name, type: item.type })) };
  });

  for (const boardId of BOARD_IDS) {
    await get(`board_${boardId}`, `/rest/agile/1.0/board/${boardId}`, value => {
      if (!validId(value?.id) || !validName(value?.name) || !validName(value?.type)) {
        return { complete: false, reason: "malformed_body" };
      }
      const complete = String(value.id) === boardId;
      return { complete, reason: complete ? "ok" : "missing_known_target",
        selected: complete ? { id: boardId, name: value.name, type: value.type } : undefined };
    });
    let filterId;
    await get(`board_${boardId}_configuration`, `/rest/agile/1.0/board/${boardId}/configuration`, value => {
      const columns = value?.columnConfig?.columns;
      if (String(value?.id) !== boardId || !validId(value?.filter?.id) ||
          !boundedArray(columns, 20) || columns.length === 0 ||
          !columns.every(column => validName(column?.name) && boundedArray(column?.statuses, 20) &&
            column.statuses.every(status => validId(status?.id)))) {
        return { complete: false, reason: "malformed_body" };
      }
      filterId = String(value.filter.id);
      const mapped = columns.flatMap(column => column.statuses
        .filter(status => String(status.id) === toDoStatusId).map(() => column.name));
      if (!toDoStatusId || mapped.length !== 1 || mapped[0] !== "To Do") {
        return { complete: false, reason: "status_mapping_incomplete" };
      }
      if (boardId === "35" && filterId !== QA_FILTER_ID) {
        return { complete: false, reason: "fixture_mismatch" };
      }
      return { complete: true, selected: { id: boardId, filterId, taskToDoMapped: true } };
    });
    await get(`board_${boardId}_static_projects`, `/rest/agile/1.0/board/${boardId}/project/full`, value => {
      const projects = Array.isArray(value) ? value : value?.values;
      if (!boundedArray(projects) || !projects.every(item => validId(item?.id))) {
        return { complete: false, reason: "malformed_body" };
      }
      if (!Array.isArray(value) && value.isLast !== true) {
        return { complete: false, reason: "unfinished_page" };
      }
      const includesPIG = projects.some(item => String(item?.id) === PROJECT_ID);
      return { complete: true, reason: includesPIG ? "ok" : "static_association_not_established",
        selected: { includesPIG } };
    });
    if (!filterId) {
      routes.push({ label: `board_${boardId}_actual_filter`, httpStatus: null,
        reason: "not_attempted", complete: false });
      continue;
    }
    await get(`board_${boardId}_actual_filter`, `/rest/api/3/filter/${filterId}`, value => {
      if (String(value?.id) !== filterId || typeof value?.jql !== "string" ||
          value.jql.length < 1 || value.jql.length > 8192) {
        return { complete: false, reason: "malformed_body" };
      }
      const qaPigOnly = value.jql.trim().replace(/\s+/gu, " ").toUpperCase() ===
        "PROJECT = PIG ORDER BY RANK ASC";
      if (boardId === "35" && !qaPigOnly) return { complete: false, reason: "fixture_mismatch" };
      return { complete: true, selected: { id: filterId, jqlPresent: true,
        ...(boardId === "35" ? { qaPigOnly: true } : {}) } };
    });
  }
  return report(routes.every(route => route.complete) ? "metadata_complete" : "metadata_incomplete", routes);
}

export function formatPigJiraMetadata(result, format = "text") {
  if (format === "json") return JSON.stringify(result);
  const lines = [`PIG Jira metadata: ${result.status}`];
  if (result.reason) lines.push(`Reason: ${result.reason}`);
  for (const route of result.routes || []) {
    const details = route.selected ? ` ${JSON.stringify(route.selected)}` : "";
    lines.push(`${route.label}: ${route.reason} (${route.httpStatus ?? "no HTTP response"})${details}`);
  }
  lines.push(`Not proved: ${(result.omissions || []).join(", ")}`);
  lines.push(`Next: ${result.nextAction}`);
  return lines.join("\n");
}
