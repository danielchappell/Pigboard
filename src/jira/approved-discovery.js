const ID = /^[1-9]\d*$/u;
const UNSAFE_NAME = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const BODY_LIMIT = 256 * 1024;
const AUTH_URL = "https://auth.atlassian.com/oauth/token";

function validName(value) {
  return typeof value === "string" && value.trim().length > 0 &&
    [...value].length <= 120 && !UNSAFE_NAME.test(value);
}

function validId(value) {
  return (typeof value === "string" || Number.isSafeInteger(value)) &&
    ID.test(String(value));
}

export function validApprovedJira(value) {
  return value && Object.keys(value).sort().join(",") ===
      "accountId,cloudId,maxBoards,maxPages,maxResultsPerPage,projects,site" &&
    value.site === "scubapig.atlassian.net" &&
    value.cloudId === "9b7d0e3f-4bd2-4017-a2a5-f99a443bec68" &&
    value.accountId === "712020:8e6999c1-1a8e-493e-aea0-2b2902cde2bf" &&
    Array.isArray(value.projects) && value.projects.length === 1 &&
    Object.keys(value.projects[0]).sort().join(",") === "id,key" &&
    value.projects[0].id === "10001" && value.projects[0].key === "PIG" &&
    value.maxPages === 4 && value.maxResultsPerPage === 50 && value.maxBoards === 200;
}

function fail(status, reason) { return { status, reason }; }

async function boundedJson(url, init, { fetchImpl, signal, remaining }) {
  const ms = Math.min(15_000, remaining());
  if (ms <= 0 || signal?.aborted) return fail("uncertain", "metadata_unverified");
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, ms);
  let response;
  let reader;
  let finished = false;
  try {
    response = await fetchImpl(url, { ...init, redirect: "manual", signal: controller.signal });
    if (response.status !== 200) {
      return fail([401, 403].includes(response.status) ? "unavailable" : "uncertain",
        [401, 403].includes(response.status) ? "jira_unavailable" : "metadata_unverified");
    }
    reader = response.body?.getReader();
    if (!reader) return fail("uncertain", "metadata_unverified");
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > BODY_LIMIT) {
        return fail("uncertain", "metadata_unverified");
      }
      chunks.push(value);
    }
    if (signal?.aborted || remaining() <= 0) return fail("uncertain", "metadata_unverified");
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true })
      .decode(Buffer.concat(chunks, size)));
    finished = true;
    return { status: "ok", value };
  } catch {
    return fail("uncertain", "metadata_unverified");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    if (!finished) {
      // Own every response body, including redirects and authorization errors.
      // Do not wait on an untrusted stream's cancellation to report failure.
      try { Promise.resolve(reader ? reader.cancel() : response?.body?.cancel()).catch(() => {}); }
      catch { /* No provider text. */ }
      controller.abort();
    }
  }
}

async function pages(path, normalize, config, context) {
  let startAt = 0;
  let total = null;
  const output = [];
  const seen = new Set();
  for (let page = 0; page < config.maxPages; page += 1) {
    const reply = await boundedJson(`${context.base}${path}&startAt=${startAt}&maxResults=${config.maxResultsPerPage}`,
      { method: "GET", headers: { Accept: "application/json", Authorization: `Bearer ${context.token}` } },
      context);
    if (reply.status !== "ok") return reply;
    const body = reply.value;
    if (!body || !Array.isArray(body.values) || !Number.isSafeInteger(body.startAt) ||
        !Number.isSafeInteger(body.maxResults) || !Number.isSafeInteger(body.total) ||
        typeof body.isLast !== "boolean" || body.startAt !== startAt ||
        body.maxResults < 1 || body.maxResults > config.maxResultsPerPage ||
        body.total < 0 || body.total > config.maxPages * config.maxResultsPerPage ||
        body.values.length > body.maxResults ||
        (total !== null && body.total !== total)) return fail("uncertain", "metadata_unverified");
    total = body.total;
    if (!body.isLast && body.values.length === 0) return fail("uncertain", "metadata_unverified");
    for (const item of body.values) {
      const entry = normalize(item);
      if (!entry || seen.has(entry.id)) return fail("uncertain", "metadata_unverified");
      seen.add(entry.id);
      output.push(entry);
    }
    startAt += body.values.length;
    if (startAt > total || (body.isLast && startAt !== total) ||
        (!body.isLast && startAt >= total)) return fail("uncertain", "metadata_unverified");
    if (body.isLast) return { status: "ok", values: output };
  }
  return fail("uncertain", "metadata_unverified");
}

function project(item) {
  return validId(item?.id) && validName(item?.key) && validName(item?.name) ?
    { id: String(item.id), key: item.key, name: item.name } : null;
}

function board(item) {
  return validId(item?.id) && validName(item?.name) && validName(item?.type) ?
    { id: String(item.id), name: item.name, type: item.type } : null;
}

function numericIdOrder(a, b) {
  return BigInt(a.id) < BigInt(b.id) ? -1 : BigInt(a.id) > BigInt(b.id) ? 1 : 0;
}

export async function discoverApprovedJira({ config, clientId, clientSecret,
  fetchImpl = fetch, signal, deadlineAt, now = Date.now } = {}) {
  if (!validApprovedJira(config) || typeof clientId !== "string" || !clientId ||
      typeof clientSecret !== "string" || !clientSecret) return fail("unavailable", "jira_unavailable");
  const remaining = () => deadlineAt - now();
  if (!Number.isFinite(deadlineAt) || remaining() <= 0) return fail("uncertain", "metadata_unverified");
  const auth = await boundedJson(AUTH_URL, { method: "POST", headers: {
    "content-type": "application/x-www-form-urlencoded", Accept: "application/json"
  }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret,
    grant_type: "client_credentials" }) }, { fetchImpl, signal, remaining });
  if (auth.status !== "ok") return auth.status === "uncertain" ?
    fail("unavailable", "jira_unavailable") : auth;
  const token = auth.value?.access_token;
  if (typeof token !== "string" || token.length < 1 || token.length > 8192 ||
      !/^[\x21-\x7e]+$/u.test(token)) return fail("unavailable", "jira_unavailable");
  const context = { fetchImpl, signal, remaining,
    base: `https://api.atlassian.com/ex/jira/${config.cloudId}`, token };
  const identity = await boundedJson(`${context.base}/rest/api/3/myself`, {
    method: "GET", headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
  }, context);
  if (identity.status !== "ok") return identity;
  if (identity.value?.accountId !== config.accountId) return fail("uncertain", "metadata_unverified");
  const approved = config.projects[0];
  const projects = await pages(`/rest/api/3/project/search?keys=${approved.key}`,
    project, config, context);
  if (projects.status !== "ok") return projects;
  const matches = projects.values.filter(value => value.id === approved.id && value.key === approved.key);
  if (matches.length !== 1) return fail("uncertain", "metadata_unverified");
  const boards = await pages(`/rest/agile/1.0/board?projectKeyOrId=${approved.id}`,
    board, config, context);
  if (boards.status !== "ok" || boards.values.length > config.maxBoards) {
    return fail("uncertain", "metadata_unverified");
  }
  return { status: "complete", site: config.site, projects: [{ ...matches[0],
    boards: boards.values.sort(numericIdOrder) }] };
}
