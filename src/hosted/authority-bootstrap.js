import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { constants, closeSync, existsSync, fstatSync, fsyncSync, lstatSync,
  mkdirSync, openSync, readFileSync, realpathSync, writeSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SQL = readFileSync(new URL("../../sql/001-pigboard-authority.sql", import.meta.url), "utf8");
const CHECKSUM = createHash("sha256").update(SQL).digest("hex");
const TABLES = ["pigboard_schema_migrations", "pigboard_team_authority",
  "pigboard_principals", "pigboard_credentials", "pigboard_grants",
  "pigboard_authority_events"];
const MIGRATION_LOCK = 870010021;
const CATALOG_QUERIES = [
  `SELECT c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
   FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = ANY($1::text[]) ORDER BY c.relname`,
  `SELECT c.relname, a.attnum, a.attname,
     pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
     a.attnotnull, pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS default_expr
   FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
   LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
   WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
     AND a.attnum > 0 AND NOT a.attisdropped
   ORDER BY c.relname, a.attnum`,
  `SELECT c.relname, k.conname, k.contype,
     pg_catalog.pg_get_constraintdef(k.oid, true) AS definition
   FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid = k.conrelid
   JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
   ORDER BY c.relname, k.conname`,
  `SELECT c.relname, i.relname AS index_name,
     pg_catalog.pg_get_indexdef(i.oid) AS definition
   FROM pg_catalog.pg_index x JOIN pg_catalog.pg_class c ON c.oid = x.indrelid
   JOIN pg_catalog.pg_class i ON i.oid = x.indexrelid
   JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
   ORDER BY c.relname, i.relname`
];

export class AuthorityError extends Error {
  constructor(reason) {
    super(reason);
    this.name = "AuthorityError";
    this.reason = reason;
  }
}

function cleanName(name) {
  if (typeof name !== "string" || name.trim() !== name ||
      name.length < 1 || name.length > 120 || /[\r\n\u0000-\u001f]/u.test(name)) {
    throw new AuthorityError("invalid_owner_name");
  }
  return name;
}

export function digestCallerToken(token) {
  return createHash("sha256").update("pigboard-caller-token-v1\0", "utf8")
    .update(token, "utf8").digest("hex");
}

export function verifyCallerToken(token, digestVersion, storedDigest) {
  if (digestVersion !== "sha256-v1" || typeof token !== "string" ||
      !/^pb1_[A-Za-z0-9_-]{43}$/u.test(token) ||
      typeof storedDigest !== "string" || !/^[0-9a-f]{64}$/u.test(storedDigest)) {
    return false;
  }
  return timingSafeEqual(Buffer.from(digestCallerToken(token), "hex"),
    Buffer.from(storedDigest, "hex"));
}

function newToken() {
  return `pb1_${randomBytes(32).toString("base64url")}`;
}

async function tablePresence(client) {
  const response = await client.query(
    "SELECT name, to_regclass('public.' || name) AS relation FROM unnest($1::text[]) AS table_name(name)",
    [TABLES]
  );
  return new Map(response.rows.map((row) => [row.name, row.relation !== null]));
}

async function catalogChecksum(client) {
  const catalog = [];
  for (const sql of CATALOG_QUERIES) {
    catalog.push((await client.query(sql, [TABLES])).rows);
  }
  return createHash("sha256").update(JSON.stringify(catalog)).digest("hex");
}

async function schemaState(client) {
  const present = await tablePresence(client);
  if (TABLES.every((name) => !present.get(name))) return { status: "schema_absent" };
  if (TABLES.some((name) => !present.get(name))) return { status: "schema_conflict" };
  let receipts;
  try {
    receipts = (await client.query(
      "SELECT version, checksum, catalog_checksum FROM pigboard_schema_migrations ORDER BY version"
    )).rows;
  } catch {
    return { status: "schema_conflict" };
  }
  if (receipts.length !== 1 || receipts[0].version !== 1 || receipts[0].checksum !== CHECKSUM) {
    return { status: "schema_conflict" };
  }
  try {
    if ((await catalogChecksum(client)) !== receipts[0].catalog_checksum) {
      return { status: "schema_conflict" };
    }
  } catch {
    return { status: "schema_conflict" };
  }
  const authority = await client.query(
    "SELECT generation FROM pigboard_team_authority WHERE team_key = 'pilot'"
  );
  if (authority.rows.length !== 1) return { status: "schema_conflict" };
  const generation = Number(authority.rows[0].generation);
  if (!Number.isSafeInteger(generation) || generation < 0) return { status: "schema_conflict" };
  return { status: "schema_current", schemaVersion: 1,
    generation };
}

export async function inspectAuthority(client) {
  let schema;
  try {
    schema = await schemaState(client);
    if (schema.status !== "schema_current") return schema;
    const result = await client.query(`
      SELECT p.id AS principal_id, p.name, c.active AS credential_active
      FROM pigboard_grants g
      JOIN pigboard_principals p ON p.id = g.principal_id
      JOIN pigboard_credentials c ON c.principal_id = p.id
      WHERE g.role = 'owner' AND g.active
    `);
    if (result.rows.length > 1) return { status: "schema_conflict" };
    const row = result.rows[0];
    return { ...schema, owner: row ? {
      principalId: row.principal_id, name: row.name,
      active: row.credential_active === true
    } : null };
  } catch {
    return { status: "inspection_unverified" };
  }
}

export async function migrateAuthority(client) {
  let committing = false;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK]);
    const before = await schemaState(client);
    if (before.status === "schema_conflict") {
      await client.query("ROLLBACK");
      return before;
    }
    if (before.status === "schema_absent") {
      await client.query(SQL);
      const catalog = await catalogChecksum(client);
      await client.query(`INSERT INTO pigboard_schema_migrations
        (version, checksum, catalog_checksum) VALUES (1, $1, $2)`, [CHECKSUM, catalog]);
    }
    const after = await schemaState(client);
    if (after.status !== "schema_current") throw new AuthorityError("schema_conflict");
    committing = true;
    await client.query("COMMIT");
    return { status: before.status === "schema_absent" ? "applied" : "already_current",
      schemaVersion: 1, generation: after.generation };
  } catch {
    if (!committing) {
      try { await client.query("ROLLBACK"); } catch { /* Connection may be lost. */ }
    }
    return { status: "schema_outcome_unknown" };
  }
}

async function issueOwner(client, name, generation, previousId) {
  const principalId = randomUUID();
  const credentialId = randomUUID();
  const token = newToken();
  await client.query("INSERT INTO pigboard_principals(id, name, kind) VALUES ($1, $2, 'human')",
    [principalId, name]);
  await client.query(`INSERT INTO pigboard_credentials
    (id, principal_id, digest_version, digest, issued_generation)
    VALUES ($1, $2, 'sha256-v1', $3, $4)`,
  [credentialId, principalId, digestCallerToken(token), generation]);
  for (const role of ["owner", "connection_admin"]) {
    await client.query("INSERT INTO pigboard_grants(principal_id, role) VALUES ($1, $2)",
      [principalId, role]);
  }
  await client.query(`INSERT INTO pigboard_authority_events
    (generation, event_type, principal_id, previous_principal_id)
    VALUES ($1, $2, $3, $4)`,
  [generation, previousId ? "owner_recovered" : "owner_bootstrapped", principalId, previousId]);
  await client.query("UPDATE pigboard_team_authority SET generation = $1 WHERE team_key = 'pilot'",
    [generation]);
  return { status: previousId ? "recovered" : "bootstrapped", generation,
    principalId, name, token };
}

export async function changeOwner(client, { name, expectGeneration = null } = {}) {
  cleanName(name);
  if (expectGeneration !== null &&
      (!Number.isSafeInteger(expectGeneration) || expectGeneration < 1)) {
    throw new AuthorityError("invalid_expected_generation");
  }
  let committing = false;
  try {
    await client.query("BEGIN");
    const schema = await schemaState(client);
    if (schema.status !== "schema_current") {
      await client.query("ROLLBACK");
      return schema;
    }
    const authority = await client.query(
      "SELECT generation FROM pigboard_team_authority WHERE team_key = 'pilot' FOR UPDATE"
    );
    if (authority.rows.length !== 1) throw new AuthorityError("schema_conflict");
    const currentGeneration = Number(authority.rows[0].generation);
    const owner = await client.query(`SELECT p.id, p.name FROM pigboard_grants g
      JOIN pigboard_principals p ON p.id = g.principal_id
      WHERE g.role = 'owner' AND g.active`);
    if (owner.rows.length > 1) throw new AuthorityError("schema_conflict");
    const active = owner.rows[0];
    if (expectGeneration === null && active) {
      await client.query("ROLLBACK");
      return { status: "owner_exists", generation: currentGeneration };
    }
    if (expectGeneration === null && currentGeneration !== 0) {
      await client.query("ROLLBACK");
      return { status: "owner_missing_needs_repair", generation: currentGeneration };
    }
    if (expectGeneration !== null && (currentGeneration !== expectGeneration || !active)) {
      await client.query("ROLLBACK");
      return { status: "stale_generation", generation: currentGeneration };
    }
    if (expectGeneration !== null) {
      await client.query("UPDATE pigboard_credentials SET active = false WHERE principal_id = $1 AND active", [active.id]);
      await client.query("UPDATE pigboard_grants SET active = false WHERE principal_id = $1 AND active", [active.id]);
    }
    const receipt = await issueOwner(client, name, currentGeneration + 1, active?.id ?? null);
    committing = true;
    await client.query("COMMIT");
    return receipt;
  } catch (error) {
    if (!committing) {
      try { await client.query("ROLLBACK"); } catch { /* Preserve safe outcome. */ }
    }
    return { status: committing ? "outcome_unknown" :
      error instanceof AuthorityError ? error.reason : "owner_change_failed" };
  }
}

function safeDirectory(path, mode = null) {
  let stat;
  let resolved;
  try {
    stat = lstatSync(path);
    resolved = realpathSync(path);
  } catch {
    throw new AuthorityError("unsafe_credential_directory");
  }
  if (!stat.isDirectory() || stat.uid !== process.getuid() ||
      (mode === null ? (stat.mode & 0o022) !== 0 : (stat.mode & 0o777) !== mode)) {
    throw new AuthorityError("unsafe_credential_directory");
  }
  return { dev: stat.dev, ino: stat.ino, resolved };
}

export function prepareCredentialDirectory(home = homedir()) {
  try {
    safeDirectory(home);
    const config = join(home, ".config");
    if (!existsSync(config)) mkdirSync(config, { mode: 0o700 });
    safeDirectory(config);
    const app = join(config, "pigboard");
    if (!existsSync(app)) mkdirSync(app, { mode: 0o700 });
    safeDirectory(app, 0o700);
    const directory = join(app, "owner-credentials");
    if (!existsSync(directory)) mkdirSync(directory, { mode: 0o700 });
    const identity = safeDirectory(directory, 0o700);
    return { directory, identity };
  } catch (error) {
    if (error instanceof AuthorityError) throw error;
    throw new AuthorityError("unsafe_credential_directory");
  }
}

export function preflightCredentialTarget(prepared, generation) {
  const { directory, identity } = prepared;
  const current = safeDirectory(directory, 0o700);
  if (current.dev !== identity.dev || current.ino !== identity.ino ||
      current.resolved !== identity.resolved) {
    throw new AuthorityError("unsafe_credential_directory");
  }
  const path = join(directory, `owner-generation-${generation}.token`);
  try {
    lstatSync(path);
    throw new AuthorityError("credential_file_exists");
  } catch (error) {
    if (error instanceof AuthorityError) throw error;
    if (error?.code !== "ENOENT") throw new AuthorityError("unsafe_credential_directory");
  }
  return path;
}

export function deliverCredential(prepared, generation, token) {
  const { directory, identity } = prepared;
  const path = join(directory, `owner-generation-${generation}.token`);
  let fd;
  try {
    const current = safeDirectory(directory, 0o700);
    if (current.dev !== identity.dev || current.ino !== identity.ino ||
        current.resolved !== identity.resolved) {
      throw new AuthorityError("credential_undelivered");
    }
    fd = openSync(path, constants.O_WRONLY | constants.O_CREAT |
      constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o600) {
      throw new AuthorityError("credential_undelivered");
    }
    const bytes = Buffer.from(`${token}\n`, "utf8");
    let written = 0;
    while (written < bytes.length) {
      written += writeSync(fd, bytes, written, bytes.length - written);
    }
    fsyncSync(fd);
    return path;
  } catch {
    throw new AuthorityError("credential_undelivered");
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
