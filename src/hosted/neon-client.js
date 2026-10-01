import pg from "pg";
import { ROOT_TARGET, checkRootTarget } from "./root-target.js";
import { hasVerifiedPostgresTls } from "./postgres-tls.js";

const { Client } = pg;
const CONNECTION_TIMEOUT_MS = 30_000;
const QUERY_TIMEOUT_MS = 5_000;
const DIAGNOSTIC_SQL = `
  SELECT current_user AS role, current_database() AS database
`;
const AFTER_PIN = ["connection", "identity", "tls"];
// Node/OpenSSL X509 verification failures must not be described as transient
// connectivity. Keep unknown transport errors unverified instead.
const TLS_VERIFICATION_FAILURE_CODES = new Set([
  "ERR_TLS_CERT_ALTNAME_INVALID", "HOSTNAME_MISMATCH",
  "UNABLE_TO_GET_ISSUER_CERT", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "UNABLE_TO_GET_CRL", "UNABLE_TO_DECRYPT_CERT_SIGNATURE",
  "UNABLE_TO_DECRYPT_CRL_SIGNATURE", "UNABLE_TO_DECODE_ISSUER_PUBLIC_KEY",
  "CERT_SIGNATURE_FAILURE", "CRL_SIGNATURE_FAILURE",
  "CERT_NOT_YET_VALID", "CERT_HAS_EXPIRED",
  "CRL_NOT_YET_VALID", "CRL_HAS_EXPIRED",
  "ERROR_IN_CERT_NOT_BEFORE_FIELD", "ERROR_IN_CERT_NOT_AFTER_FIELD",
  "ERROR_IN_CRL_LAST_UPDATE_FIELD", "ERROR_IN_CRL_NEXT_UPDATE_FIELD",
  "DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_CHAIN_TOO_LONG", "CERT_REVOKED",
  "INVALID_CA", "PATH_LENGTH_EXCEEDED", "INVALID_PURPOSE",
  "CERT_UNTRUSTED", "CERT_REJECTED"
]);

function check(id, status, reason, message) {
  return { id, status, reason, message };
}

function report(checks, expectedTarget) {
  const status = checks.some((item) => item.status === "fail") ? "fail" :
    checks.some((item) => item.status === "unverified") ? "unverified" : "pass";
  return {
    schemaVersion: 1,
    status,
    target: {
      host: expectedTarget.host,
      port: expectedTarget.port,
      database: expectedTarget.database,
      role: expectedTarget.role
    },
    checks,
    omissions: checks.filter((item) => item.status === "unverified").map((item) => item.id)
  };
}

function omitted(ids, reason) {
  return ids.map((id) => check(id, "unverified", reason, "This check was not completed."));
}

function parseSecret(secret) {
  if (typeof secret !== "string" || !secret || secret.length > 4096) {
    throw new Error("invalid_secret");
  }
  let url;
  try {
    url = new URL(secret);
  } catch {
    throw new Error("invalid_secret");
  }
  if (!(["postgres:", "postgresql:"].includes(url.protocol)) || url.hash ||
    !url.hostname || !url.username || !url.password || !url.pathname.startsWith("/")) {
    throw new Error("invalid_secret");
  }
  const seen = new Set();
  for (const [name, value] of url.searchParams) {
    if (name === "channel_binding" && value === "require") {
      // pg enables PLUS when offered but does not enforce the URL's "require".
      throw new Error("unsupported_channel_binding");
    }
    if (seen.has(name) ||
      (name === "sslmode" && !["require", "verify-full"].includes(value)) ||
      name !== "sslmode") {
      throw new Error("invalid_secret");
    }
    seen.add(name);
  }
  let role;
  let password;
  let database;
  try {
    role = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
    database = decodeURIComponent(url.pathname.slice(1));
  } catch {
    throw new Error("invalid_secret");
  }
  if (!role || !password || !database || database.includes("/")) {
    throw new Error("invalid_secret");
  }
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    database,
    role,
    password
  };
}

function pinCheck(candidate, expectedTarget) {
  if (expectedTarget === ROOT_TARGET) return checkRootTarget(candidate);
  const mismatch = ["host", "port", "database", "role"].find(
    (field) => candidate[field] !== expectedTarget[field]
  );
  return mismatch ?
    check("root_target", "fail", "target_mismatch", `The ${mismatch} is not the pinned root. No connection was attempted.`) :
    check("root_target", "pass", "pinned_root", "The target matches the pinned root.");
}

function prepare(secret, expectedTarget) {
  let candidate;
  try {
    candidate = parseSecret(secret);
  } catch (error) {
    if (error?.message === "unsupported_channel_binding") {
      return {
        check: check("root_target", "fail", "unsupported_channel_binding",
          "This client cannot enforce channel_binding=require. Remove only that URL option; verified TLS remains required."),
        candidate: null
      };
    }
    return {
      check: check("root_target", "fail", "invalid_secret", "A valid private Postgres URL is required."),
      candidate: null
    };
  }
  return { check: pinCheck(candidate, expectedTarget), candidate };
}

function clientConfig(candidate, expectedTarget, { tlsCa, connectionTimeoutMs, queryTimeoutMs }) {
  return {
    host: candidate.host,
    port: candidate.port,
    database: candidate.database,
    user: candidate.role,
    password: candidate.password,
    ssl: {
      rejectUnauthorized: true,
      servername: expectedTarget.host,
      ...(tlsCa ? { ca: tlsCa } : {})
    },
    enableChannelBinding: true,
    connectionTimeoutMillis: connectionTimeoutMs,
    query_timeout: queryTimeoutMs,
    statement_timeout: queryTimeoutMs
  };
}

export function checkRuntimeTarget(secret) {
  return prepare(secret, ROOT_TARGET).check;
}

function connectionFailure(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  if (TLS_VERIFICATION_FAILURE_CODES.has(code)) {
    return check("connection", "fail", "tls_verification_failed", "The server TLS identity could not be verified.");
  }
  if (["28P01", "28000"].includes(code)) {
    return check("connection", "fail", "authentication_failed", "The restricted runtime login was not accepted.");
  }
  return check("connection", "unverified", "temporarily_unavailable",
    "The root connection did not complete. Its cause is unknown; retry the operator diagnostic after checking the service and Neon status.");
}

async function withinDeadline(operation, timeoutMs, client) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          client.connection?.stream?.destroy();
          reject(Object.assign(new Error("deadline"), { code: "PIGBOARD_TIMEOUT" }));
        }, timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function closeClient(client) {
  const close = Promise.resolve().then(() => client.end());
  let timer;
  try {
    await Promise.race([
      close,
      new Promise((resolve) => {
        timer = setTimeout(() => {
          client.connection?.stream?.destroy();
          resolve();
        }, 1_000);
      })
    ]);
  } catch {
    // Closing is best effort; no raw driver error can reach the diagnostic result.
  } finally {
    clearTimeout(timer);
  }
}

// The expected-target and client seams are for isolated tests. The production
// entry point calls this function without overrides and always uses ROOT_TARGET.
export async function diagnoseNeonRoot(secret, options = {}) {
  const expectedTarget = options.expectedTarget ?? ROOT_TARGET;
  const ClientClass = options.ClientClass ?? Client;
  const connectionTimeoutMs = Number.isInteger(options.connectionTimeoutMs) && options.connectionTimeoutMs > 0 ?
    Math.min(options.connectionTimeoutMs, CONNECTION_TIMEOUT_MS) : CONNECTION_TIMEOUT_MS;
  const queryTimeoutMs = Number.isInteger(options.queryTimeoutMs) && options.queryTimeoutMs > 0 ?
    Math.min(options.queryTimeoutMs, QUERY_TIMEOUT_MS) : QUERY_TIMEOUT_MS;
  const { check: rootCheck, candidate } = prepare(secret, expectedTarget);
  if (rootCheck.status !== "pass") {
    return report([rootCheck, ...omitted(AFTER_PIN, "not_attempted")], expectedTarget);
  }

  const client = new ClientClass(clientConfig(candidate, expectedTarget, {
    tlsCa: options.tlsCa, connectionTimeoutMs, queryTimeoutMs
  }));
  let connected = false;
  let verifiedTls;
  try {
    await withinDeadline(() => client.connect(), connectionTimeoutMs, client);
    connected = true;
    const secondPin = pinCheck(candidate, expectedTarget);
    if (secondPin.status !== "pass") {
      return report([secondPin, ...omitted(AFTER_PIN, "not_attempted")], expectedTarget);
    }
    if (!hasVerifiedPostgresTls(client)) {
      return report([rootCheck,
        check("connection", "pass", "connected", "The root connection completed."),
        ...omitted(["identity"], "tls_not_active"),
        check("tls", "fail", "tls_not_active", "The client transport is not verified TLS.")], expectedTarget);
    }
    verifiedTls = check("tls", "pass", "verified_tls", "The client transport uses TLS with a verified server hostname.");
    const response = await withinDeadline(() => client.query(DIAGNOSTIC_SQL), queryTimeoutMs, client);
    const row = response.rows?.[0];
    const identity = row?.role === expectedTarget.role && row?.database === expectedTarget.database ?
      check("identity", "pass", "expected_identity", "The session uses the pinned role and database.") :
      check("identity", "fail", "identity_mismatch", "The session identity differs from the pinned role or database.");
    return report([rootCheck, check("connection", "pass", "connected", "The root connection completed."), identity, verifiedTls], expectedTarget);
  } catch (error) {
    const failure = connectionFailure(error);
    const checks = connected ?
      [rootCheck, check("connection", "pass", "connected", "The root connection completed."),
        ...omitted(["identity"], failure.reason),
        ...(verifiedTls ? [verifiedTls] : omitted(["tls"], failure.reason))] :
      [rootCheck, failure, ...omitted(["identity", "tls"], failure.reason)];
    return report(checks, expectedTarget);
  } finally {
    await closeClient(client);
  }
}

export class PinnedNeonError extends Error {
  constructor(reason) {
    super(reason);
    this.name = "PinnedNeonError";
    this.reason = reason;
  }
}

// The expected target and ClientClass seams are for isolated tests. The hosted
// entry point uses the source-controlled runtime root pin without overrides.
export async function openPinnedRuntimeClient(secret, options = {}) {
  const expectedTarget = options.expectedTarget ?? ROOT_TARGET;
  const ClientClass = options.ClientClass ?? Client;
  const connectionTimeoutMs = Number.isInteger(options.connectionTimeoutMs) && options.connectionTimeoutMs > 0 ?
    Math.min(options.connectionTimeoutMs, CONNECTION_TIMEOUT_MS) : CONNECTION_TIMEOUT_MS;
  const queryTimeoutMs = Number.isInteger(options.queryTimeoutMs) && options.queryTimeoutMs > 0 ?
    Math.min(options.queryTimeoutMs, QUERY_TIMEOUT_MS) : QUERY_TIMEOUT_MS;
  const { check: rootCheck, candidate } = prepare(secret, expectedTarget);
  if (rootCheck.status !== "pass") throw new PinnedNeonError(rootCheck.reason);
  const client = new ClientClass(clientConfig(candidate, expectedTarget, {
    tlsCa: options.tlsCa, connectionTimeoutMs, queryTimeoutMs
  }));
  try {
    await withinDeadline(() => client.connect(), connectionTimeoutMs, client);
    if (pinCheck(candidate, expectedTarget).status !== "pass") {
      throw new PinnedNeonError("target_mismatch");
    }
    if (!hasVerifiedPostgresTls(client)) throw new PinnedNeonError("tls_not_active");
    const response = await withinDeadline(() => client.query(DIAGNOSTIC_SQL), queryTimeoutMs, client);
    const row = response.rows?.[0];
    if (row?.role !== expectedTarget.role || row?.database !== expectedTarget.database) {
      throw new PinnedNeonError("identity_mismatch");
    }
    return { client, close: () => closeClient(client) };
  } catch (error) {
    await closeClient(client);
    throw error instanceof PinnedNeonError ? error :
      new PinnedNeonError(connectionFailure(error).reason);
  }
}
