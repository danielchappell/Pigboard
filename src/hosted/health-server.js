import { createServer } from "node:http";
import { deniedGrant, unavailableGrant } from "./authority-self.js";

const LIVE_BODY = { schemaVersion: 1, status: "live" };
const CHOICE_OMISSIONS = ["pair_selection", "board_filter_eligibility", "issue_access"];
const CHOICE_LIMIT = 64 * 1024;
const CHOICE_DEADLINE_MS = 90_000;

function choiceFailure(status, reason) {
  const nextAction = status === "denied" ?
    "Use a current Pigboard connection administrator credential or ask the owner to inspect its grant." :
    status === "unavailable" ?
      "Check the private host, current grant and Jira service access, then retry discovery." :
      "Ask the owner to inspect the safe Jira metadata check, then retry discovery.";
  return { schemaVersion: 1, status, reason, omissions: ["approved_choices"], nextAction };
}

function grantAllowed(value) {
  return value?.status === "ok" && value.team === "pilot" &&
    ["human", "agent"].includes(value.principal?.kind) &&
    typeof value.principal.id === "string" &&
    Array.isArray(value.grants) && value.grants.includes("connection_admin");
}

function raceAbort(work, signal) {
  if (signal.aborted) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      resolve(value);
    };
    const onAbort = () => finish(null);
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve().then(() => signal.aborted ? null : work()).then(finish, () => finish(null));
  });
}

function sendJson(response, status, body) {
  const value = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(value),
    "cache-control": "no-store"
  });
  response.end(value);
}

function bearerFrom(request) {
  const occurrences = request.rawHeaders.filter((header, index) =>
    index % 2 === 0 && header.toLowerCase() === "authorization").length;
  if (occurrences !== 1) return null;
  const header = request.headers.authorization;
  if (typeof header !== "string" || header.length > 128 ||
      !/^Bearer pb1_[A-Za-z0-9_-]{43}$/iu.test(header)) return null;
  return header.slice(7);
}

export function createHealthServer({ inspectSelf, discoverChoices,
  choiceDeadlineMs = CHOICE_DEADLINE_MS, now = Date.now } = {}) {
  return createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, LIVE_BODY);
      return;
    }
    if (request.method === "GET" && request.url === "/v1/authority/me") {
      const token = bearerFrom(request);
      if (!token) {
        sendJson(response, 401, deniedGrant());
        return;
      }
      let result;
      try {
        result = typeof inspectSelf === "function" ? await inspectSelf(token) :
          unavailableGrant("inspection_unverified");
      } catch {
        result = unavailableGrant("inspection_unverified");
      }
      sendJson(response, result.status === "ok" ? 200 : result.status === "denied" ? 401 : 503,
        result);
      return;
    }
    if (request.method === "GET" && request.url === "/v1/jira/choices") {
      const token = bearerFrom(request);
      if (!token) {
        sendJson(response, 401, choiceFailure("denied", "invalid_credential"));
        return;
      }
      const controller = new AbortController();
      const deadlineAt = now() + choiceDeadlineMs;
      const timeout = setTimeout(() => {
        controller.abort();
        // The deadline owns the HTTP response too. A direct API caller must
        // not keep an idle socket after the provider/authority work is aborted.
        if (!response.writableEnded && !response.destroyed) response.destroy();
      }, choiceDeadlineMs);
      const onClose = () => { if (!response.writableEnded) controller.abort(); };
      response.once("close", onClose);
      const expired = () => {
        if (now() >= deadlineAt) {
          controller.abort();
          if (!response.writableEnded && !response.destroyed) response.destroy();
        }
        return controller.signal.aborted || response.destroyed;
      };
      try {
        const first = await raceAbort(() => typeof inspectSelf === "function" ?
          inspectSelf(token, controller.signal, deadlineAt) : null, controller.signal);
        if (expired()) return;
        if (!grantAllowed(first)) {
          const denied = first?.status === "denied" || first?.status === "ok";
          sendJson(response, denied ? 401 : 503, choiceFailure(denied ? "denied" : "unavailable",
            denied ? first?.status === "ok" ? "grant_denied" : "invalid_credential" :
              "authority_unverified"));
          return;
        }
        const choices = await raceAbort(() => typeof discoverChoices === "function" ?
          discoverChoices({ signal: controller.signal, deadlineAt }) : null, controller.signal);
        if (expired()) return;
        if (choices?.status !== "complete") {
          const unavailable = choices?.status === "unavailable";
          sendJson(response, unavailable ? 503 : 502,
            choiceFailure(unavailable ? "unavailable" : "uncertain",
              unavailable ? "jira_unavailable" : "metadata_unverified"));
          return;
        }
        const final = await raceAbort(() => inspectSelf(token, controller.signal, deadlineAt),
          controller.signal);
        if (expired()) return;
        if (!grantAllowed(final) || final.principal.id !== first.principal.id ||
            final.principal.kind !== first.principal.kind) {
          const denied = final?.status === "denied" || final?.status === "ok";
          sendJson(response, denied ? 401 : 503, choiceFailure(denied ? "denied" : "unavailable",
            denied ? "grant_denied" : "authority_unverified"));
          return;
        }
        const body = { schemaVersion: 1, status: "complete", site: choices.site,
          projects: choices.projects, omissions: CHOICE_OMISSIONS,
          nextAction: "Review these names and IDs; saving and validating a pair comes later." };
        if (Buffer.byteLength(JSON.stringify(body)) > CHOICE_LIMIT) {
          sendJson(response, 502, choiceFailure("uncertain", "metadata_unverified"));
          return;
        }
        if (expired()) return;
        sendJson(response, 200, body);
      } finally {
        clearTimeout(timeout);
        response.off("close", onClose);
      }
      return;
    }
    response.writeHead(404, { "content-length": 0, "cache-control": "no-store" });
    response.end();
  });
}

export async function startHealthServer({ host = "0.0.0.0", port = 8080,
  inspectSelf, discoverChoices, choiceDeadlineMs, now } = {}) {
  const server = createHealthServer({ inspectSelf, discoverChoices, choiceDeadlineMs, now });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  return server;
}
