import { constants, fstatSync, lstatSync, openSync, readFileSync, closeSync } from "node:fs";
import { isAbsolute, dirname } from "node:path";
import pg from "pg";
import { ROOT_TARGET } from "./root-target.js";

export const OWNER_TARGET = Object.freeze(JSON.parse(readFileSync(
  new URL("../../config/neon-owner-root.json", import.meta.url), "utf8"
)));

export class OwnerError extends Error {
  constructor(reason) {
    super(reason);
    this.name = "OwnerError";
    this.reason = reason;
  }
}

const PIN_FIELDS = ["projectId", "branchId", "host", "port", "database"];

export function checkOwnerPin(target = OWNER_TARGET, runtime = ROOT_TARGET) {
  if (PIN_FIELDS.some((field) => target[field] !== runtime[field]) ||
      target.role !== "pigboard_owner" || runtime.role !== "pigboard_app" ||
      target.host.includes("-pooler")) {
    throw new OwnerError("owner_pin_mismatch");
  }
  return true;
}

function privateStats(stats, mode) {
  return stats.uid === process.getuid() && (stats.mode & 0o777) === mode;
}

export function readOwnerUrlFile(filePath) {
  if (!isAbsolute(filePath)) throw new OwnerError("invalid_owner_url_file");
  let fd;
  try {
    const parent = lstatSync(dirname(filePath));
    const before = lstatSync(filePath);
    if (!parent.isDirectory() || !privateStats(parent, 0o700) ||
        !before.isFile() || !privateStats(before, 0o600)) {
      throw new OwnerError("unsafe_owner_url_file");
    }
    fd = openSync(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = fstatSync(fd);
    if (!opened.isFile() || !privateStats(opened, 0o600) ||
        opened.dev !== before.dev || opened.ino !== before.ino || opened.size > 4096) {
      throw new OwnerError("unsafe_owner_url_file");
    }
    const value = readFileSync(fd, "utf8").replace(/\r?\n$/, "");
    if (!value || value.includes("\n") || value.includes("\r")) {
      throw new OwnerError("invalid_owner_url_file");
    }
    return value;
  } catch (error) {
    if (error instanceof OwnerError) throw error;
    throw new OwnerError("unsafe_owner_url_file");
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

export function parseOwnerUrl(value, target = OWNER_TARGET) {
  checkOwnerPin(target);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new OwnerError("invalid_owner_url");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hash ||
      !url.username || !url.password || url.searchParams.size > 1 ||
      [...url.searchParams].some(([key, mode]) =>
        key !== "sslmode" || !["require", "verify-full"].includes(mode))) {
    throw new OwnerError("invalid_owner_url");
  }
  let role;
  let database;
  let password;
  try {
    role = decodeURIComponent(url.username);
    database = decodeURIComponent(url.pathname.slice(1));
    password = decodeURIComponent(url.password);
  } catch {
    throw new OwnerError("invalid_owner_url");
  }
  if (role !== target.role || database !== target.database ||
      url.hostname !== target.host || Number(url.port || 5432) !== target.port ||
      !password || database.includes("/") || url.pathname === "/") {
    throw new OwnerError("owner_target_mismatch");
  }
  return { host: target.host, port: target.port, database, user: role, password };
}

export async function connectOwner(filePath, options = {}) {
  const target = options.target ?? OWNER_TARGET;
  const ClientClass = options.ClientClass ?? pg.Client;
  const connection = parseOwnerUrl(readOwnerUrlFile(filePath), target);
  const client = new ClientClass({
    ...connection,
    ssl: { rejectUnauthorized: true, servername: target.host,
      ...(options.tlsCa ? { ca: options.tlsCa } : {}) },
    enableChannelBinding: true,
    connectionTimeoutMillis: 10_000,
    query_timeout: 5_000,
    statement_timeout: 5_000
  });
  try {
    await client.connect();
    const result = await client.query(`SELECT current_user AS role,
      current_database() AS database,
      (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS ssl`);
    const row = result.rows?.[0];
    if (row?.role !== target.role || row?.database !== target.database || row?.ssl !== true) {
      throw new OwnerError("owner_identity_mismatch");
    }
    // A role-level search_path must not redirect migration DDL or authority queries.
    await client.query("SET search_path = public, pg_catalog");
    return client;
  } catch (error) {
    try { await client.end(); } catch { /* Preserve the safe reason. */ }
    if (error instanceof OwnerError) throw error;
    throw new OwnerError("owner_connection_unverified");
  }
}
