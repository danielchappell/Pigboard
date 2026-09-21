import { randomUUID } from "node:crypto";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const AGENT_ID = new RegExp(`^bc-${UUID}$`, "i");
const RUN_ID = new RegExp(`^run-${UUID}$`, "i");
const STATES = new Set(["CREATING", "RUNNING", "FINISHED", "ERROR", "CANCELLED", "EXPIRED"]);
const TERMINAL = new Set(["FINISHED", "ERROR", "CANCELLED", "EXPIRED"]);

export class CursorCloudError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "CursorCloudError";
    this.code = code;
    Object.assign(this, details);
  }
}

function invalid(message) {
  throw new CursorCloudError("invalid_request", message);
}

function text(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function keys(value, allowed) {
  return value && typeof value === "object" && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value))
    && Object.keys(value).every((key) => allowed.includes(key));
}

export function validateCursorRequest(request) {
  if (!keys(request, ["agentId", "name", "prompt", "model", "repos", "mode", "autoCreatePR", "workOnCurrentBranch"])) {
    invalid("Use only the fields produced by prepare; environment secrets and extra tools are not supported.");
  }
  if (!AGENT_ID.test(request.agentId ?? "")) invalid("A saved bc-<uuid> agentId is required before starting work.");
  if (!keys(request.prompt, ["text"]) || !text(request.prompt.text)) invalid("A non-empty prompt.text is required.");
  if (!keys(request.model, ["id", "params"]) || !text(request.model.id)) invalid("An explicit model.id is required; use models to discover supported IDs.");
  if (request.model.params !== undefined && (!Array.isArray(request.model.params)
    || request.model.params.some((param) => !keys(param, ["id", "value"]) || !text(param.id) || !text(param.value))
    || new Set(request.model.params.map((param) => param.id)).size !== request.model.params.length)) {
    invalid("Model params must contain unique IDs and string values from model discovery.");
  }
  if (request.name !== undefined && (!text(request.name) || request.name.length > 100)) invalid("Name must contain between 1 and 100 characters.");
  if (request.mode !== "plan" || request.autoCreatePR !== false || request.workOnCurrentBranch !== false) {
    invalid("This runner requires plan mode, autoCreatePR: false, and workOnCurrentBranch: false.");
  }
  if (request.repos !== undefined && (!Array.isArray(request.repos) || request.repos.length !== 1
    || !keys(request.repos[0], ["url", "startingRef"])
    || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(request.repos[0].url ?? "")
    || !text(request.repos[0].startingRef))) {
    invalid("Use one HTTPS GitHub repository URL and an explicit startingRef, or omit repos.");
  }
  return structuredClone(request);
}

export function prepareCursorRequest({ prompt, model, name, repository, ref }) {
  if (Boolean(repository) !== Boolean(ref)) invalid("Repository and ref must be supplied together.");
  return validateCursorRequest({
    agentId: `bc-${randomUUID()}`,
    ...(name === undefined ? {} : { name }),
    prompt: { text: prompt },
    model,
    ...(repository ? { repos: [{ url: repository, startingRef: ref }] } : {}),
    mode: "plan",
    autoCreatePR: false,
    workOnCurrentBranch: false
  });
}

function ids(agentId, runId) {
  if (!AGENT_ID.test(agentId ?? "")) invalid("agentId must be bc-<uuid>.");
  if (runId !== undefined && !RUN_ID.test(runId)) invalid("runId must be run-<uuid>.");
}

function invalidResponse(agentId) {
  return new CursorCloudError("invalid_response", "Cursor returned an unexpected response; retrieve the saved ID again.", { agentId });
}

export class CursorCloudRunner {
  #key;
  #fetch;
  #timeout;

  constructor({ apiKey, fetchImpl = globalThis.fetch, timeoutMs = 30000 } = {}) {
    if (!text(apiKey) || /[\s\x00-\x1f\x7f]/.test(apiKey)) {
      throw new CursorCloudError("missing_auth", "Set CURSOR_API_KEY to a valid Cursor API key.");
    }
    if (typeof fetchImpl !== "function" || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) {
      invalid("Supply a fetch function and timeoutMs between 1 and 120000.");
    }
    this.#key = apiKey;
    this.#fetch = fetchImpl;
    this.#timeout = timeoutMs;
  }

  #redact(value) {
    if (typeof value === "string") return value.replaceAll(this.#key, "[REDACTED]");
    if (Array.isArray(value)) return value.map((item) => this.#redact(item));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [this.#redact(key), this.#redact(item)]));
    }
    return value;
  }

  async #request(method, path, body) {
    let response;
    let data;
    try {
      response = await this.#fetch(`https://api.cursor.com/v1${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.#key}`, "Content-Type": "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(this.#timeout),
        ...(body ? { body: JSON.stringify(body) } : {})
      });
    } catch {
      throw new CursorCloudError("request_failed", "Cursor could not be reached or its reply could not be read.", { uncertain: method === "POST" });
    }
    try { data = await response.json(); }
    catch {
      if (response.ok) throw new CursorCloudError("invalid_response", "Cursor returned an unreadable response.", { uncertain: method === "POST" });
    }
    if (!response.ok) {
      const conflict = response.status === 409 && data?.error?.code === "agent_id_conflict";
      throw new CursorCloudError(conflict ? "agent_id_conflict" : "provider_error", `Cursor returned HTTP ${response.status}.`, {
        httpStatus: response.status,
        uncertain: method === "POST" && (response.status >= 500 || response.status === 408)
      });
    }
    return this.#redact(data);
  }

  #result(run, agentId, runId = run?.id) {
    if (!run || !RUN_ID.test(run.id ?? "") || run.id !== runId || run.agentId !== agentId || !STATES.has(run.status)
      || (run.result !== undefined && typeof run.result !== "string")
      || (run.durationMs !== undefined && (!Number.isFinite(run.durationMs) || run.durationMs < 0))) {
      throw invalidResponse(agentId);
    }
    return {
      provider: "cursor",
      agentId,
      runId: run.id,
      url: `https://cursor.com/agents/${agentId}`,
      status: run.status,
      terminal: TERMINAL.has(run.status),
      result: run.result ?? null,
      durationMs: run.durationMs ?? null
    };
  }

  async models() {
    const data = await this.#request("GET", "/models");
    if (!Array.isArray(data?.items) || data.items.some((model) => !model || !text(model.id))) throw invalidResponse();
    return data.items;
  }

  async get({ agentId, runId } = {}) {
    ids(agentId, runId);
    try {
      if (runId === undefined) {
        const runs = await this.#request("GET", `/agents/${agentId}/runs?limit=2`);
        if (!Array.isArray(runs?.items)) throw invalidResponse(agentId);
        if (runs.items.length > 1 || runs.nextCursor) {
          throw new CursorCloudError("ambiguous_run", "This agent has multiple runs. Supply the original runId; no new work was started.", { agentId });
        }
        if (!runs.items.length) throw new CursorCloudError("run_unavailable", "No run is available yet. Retry get with the same agentId.", { agentId });
        runId = runs.items[0]?.id;
        if (!RUN_ID.test(runId ?? "") || runs.items[0].agentId !== agentId) throw invalidResponse(agentId);
      }
      const run = await this.#request("GET", `/agents/${agentId}/runs/${runId}`);
      return this.#result(run, agentId, runId);
    } catch (error) {
      if (error instanceof CursorCloudError) Object.assign(error, { agentId, ...(runId ? { runId } : {}) });
      throw error;
    }
  }

  async start(input) {
    const request = validateCursorRequest(input);
    // A caller may accidentally put its credential in a prompt or configuration.
    if (JSON.stringify(this.#redact(request)) !== JSON.stringify(request)) invalid("Remove the API key from the request; it is sent only as an authentication header.");
    try {
      const data = await this.#request("POST", "/agents", request);
      if (data?.agent?.id !== request.agentId) throw invalidResponse(request.agentId);
      return { ...this.#result(data.run, request.agentId), disposition: "started" };
    } catch (error) {
      if (!(error instanceof CursorCloudError)) throw error;
      error.agentId = request.agentId;
      if (!error.uncertain && !["agent_id_conflict", "invalid_response"].includes(error.code)) throw error;
      try {
        return {
          ...await this.get({ agentId: request.agentId }),
          disposition: "recovered",
          recoveryReason: error.code === "agent_id_conflict" ? "duplicate_id" : "uncertain_launch"
        };
      } catch (recoveryError) {
        throw new CursorCloudError("launch_unresolved", "Launch outcome is unresolved. Use get with this agentId (and the original runId if known); do not generate a replacement ID.", {
          agentId: request.agentId,
          recoveryRequired: true,
          recoveryCode: recoveryError instanceof CursorCloudError ? recoveryError.code : "request_failed"
        });
      }
    }
  }
}
