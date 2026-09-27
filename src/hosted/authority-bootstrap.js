import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { constants, closeSync, existsSync, fstatSync, fsyncSync, lstatSync,
  mkdirSync, openSync, readFileSync, realpathSync, writeSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SQL = readFileSync(new URL("../../sql/001-pigboard-authority.sql", import.meta.url), "utf8");
const READ_SQL = readFileSync(new URL("../../sql/002-pigboard-owner-read.sql", import.meta.url), "utf8");
const CHECKSUM = createHash("sha256").update(SQL).digest("hex");
const READ_CHECKSUM = createHash("sha256").update(READ_SQL).digest("hex");
const TABLES = ["pigboard_schema_migrations", "pigboard_team_authority",
  "pigboard_principals", "pigboard_credentials", "pigboard_grants",
  "pigboard_authority_events"];
const MIGRATION_LOCK = 870010021;
const RUNTIME_READ_COLUMNS = {
  pigboard_schema_migrations: {},
  pigboard_team_authority: { team_key: true, generation: true },
  pigboard_principals: { id: true, name: true, kind: true, created_at: false },
  pigboard_credentials: { id: false, principal_id: true, digest_version: true,
    digest: true, issued_generation: true, active: true, created_at: false },
  pigboard_grants: { id: false, principal_id: true, role: true,
    active: true, created_at: false },
  pigboard_authority_events: {}
};
const CATALOG_QUERIES = [
  `SELECT c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
   FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = ANY($1::text[]) ORDER BY c.relname`,
  `SELECT c.relname, a.attnum, a.attname,
     pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
     a.attnotnull, a.attidentity,
     pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS default_expr,
     pg_catalog.pg_get_serial_sequence(
       pg_catalog.format('%I.%I', n.nspname, c.relname), a.attname
     ) AS backing_sequence
   FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
   LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
   WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
     AND a.attnum > 0 AND NOT a.attisdropped
     ORDER BY c.relname, a.attnum`,
  `SELECT c.relname, a.attnum, a.attidentity,
     seq_ns.nspname AS sequence_schema, seq.relname AS sequence_name,
     s.seqstart, s.seqincrement, s.seqmin, s.seqmax, s.seqcache, s.seqcycle
   FROM pg_catalog.pg_class c
   JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
   LEFT JOIN pg_catalog.pg_depend dep
     ON dep.refclassid = 'pg_catalog.pg_class'::pg_catalog.regclass
     AND dep.refobjid = c.oid AND dep.refobjsubid = a.attnum
     AND dep.classid = 'pg_catalog.pg_class'::pg_catalog.regclass
     AND dep.deptype IN ('a', 'i')
   LEFT JOIN pg_catalog.pg_class seq ON seq.oid = dep.objid AND seq.relkind = 'S'
   LEFT JOIN pg_catalog.pg_namespace seq_ns ON seq_ns.oid = seq.relnamespace
   LEFT JOIN pg_catalog.pg_sequence s ON s.seqrelid = seq.oid
   WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
     AND a.attnum > 0 AND NOT a.attisdropped
   ORDER BY c.relname, a.attnum, seq_ns.nspname, seq.relname`,
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
      name.length < 1 || name.length > 120 ||
      /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(name)) {
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
    `SELECT names.name, c.oid AS relation
     FROM unnest($1::text[]) AS names(name)
     LEFT JOIN pg_catalog.pg_namespace n ON n.nspname = 'public'
     LEFT JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid AND c.relname = names.name`,
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

async function runtimeReadGrantsCurrent(client) {
  const role = await client.query("SELECT to_regrole('pigboard_app') IS NOT NULL AS exists");
  if (role.rows[0]?.exists !== true) return false;
  const schema = await client.query(`SELECT
    has_schema_privilege('pigboard_app', 'public', 'USAGE') AS can_use,
    has_schema_privilege('pigboard_app', 'public', 'CREATE') AS can_create`);
  if (schema.rows[0]?.can_use !== true || schema.rows[0]?.can_create !== false) return false;
  const columns = Object.entries(RUNTIME_READ_COLUMNS).flatMap(([table, expected]) =>
    Object.entries(expected).map(([column, shouldRead]) =>
      ({ table, column, shouldRead })));
  const actual = await client.query(`WITH expected AS (
      SELECT * FROM jsonb_to_recordset($1::jsonb)
        AS e(table_name text, column_name text, should_read boolean)
    ) SELECT table_name, column_name, should_read,
      has_column_privilege('pigboard_app', format('public.%I', table_name),
        column_name, 'SELECT') AS can_read
    FROM expected`, [JSON.stringify(columns.map(({ table, column, shouldRead }) =>
    ({ table_name: table, column_name: column, should_read: shouldRead })))]);
  if (actual.rows.length !== columns.length ||
      actual.rows.some((row) => row.can_read !== row.should_read)) return false;
  const forbidden = await client.query(`SELECT table_name,
      has_any_column_privilege('pigboard_app', format('public.%I', table_name),
        'SELECT') AS can_read_any,
      has_any_column_privilege('pigboard_app', format('public.%I', table_name),
        'INSERT') AS can_insert,
      has_any_column_privilege('pigboard_app', format('public.%I', table_name),
        'UPDATE') AS can_update,
      has_table_privilege('pigboard_app', format('public.%I', table_name),
        'DELETE') AS can_delete
    FROM unnest($1::text[]) AS tables(table_name)`, [TABLES]);
  return forbidden.rows.length === TABLES.length && forbidden.rows.every((row) =>
    !row.can_insert && !row.can_update && !row.can_delete &&
    (row.table_name !== "pigboard_schema_migrations" &&
     row.table_name !== "pigboard_authority_events" || !row.can_read_any));
}

async function schemaState(client) {
  const present = await tablePresence(client);
  if (TABLES.every((name) => !present.get(name))) return { status: "schema_absent" };
  if (TABLES.some((name) => !present.get(name))) return { status: "schema_conflict" };
  let receipts;
  try {
    receipts = (await client.query(
      "SELECT version, checksum, catalog_checksum FROM public.pigboard_schema_migrations ORDER BY version"
    )).rows;
  } catch {
    return { status: "schema_conflict" };
  }
  if (![1, 2].includes(receipts.length) || receipts[0].version !== 1 ||
      receipts[0].checksum !== CHECKSUM ||
      (receipts.length === 2 &&
       (receipts[1].version !== 2 || receipts[1].checksum !== READ_CHECKSUM))) {
    return { status: "schema_conflict" };
  }
  try {
    const catalog = await catalogChecksum(client);
    if (catalog !== receipts[0].catalog_checksum ||
        (receipts.length === 2 && catalog !== receipts[1].catalog_checksum)) {
      return { status: "schema_conflict" };
    }
  } catch {
    return { status: "schema_conflict" };
  }
  const authority = await client.query(
    "SELECT generation FROM public.pigboard_team_authority WHERE team_key = 'pilot'"
  );
  if (authority.rows.length !== 1) return { status: "schema_conflict" };
  const generation = Number(authority.rows[0].generation);
  if (!Number.isSafeInteger(generation) || generation < 0) return { status: "schema_conflict" };
  if (receipts.length === 2) {
    try {
      if (!(await runtimeReadGrantsCurrent(client))) return { status: "schema_conflict" };
    } catch {
      return { status: "schema_conflict" };
    }
  }
  return { status: receipts.length === 2 ? "schema_current" : "migration_required",
    schemaVersion: receipts.length,
    generation };
}

export async function inspectAuthority(client) {
  let inTransaction = false;
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    inTransaction = true;
    const schema = await schemaState(client);
    if (schema.status !== "schema_current") {
      await client.query("COMMIT");
      inTransaction = false;
      return schema;
    }
    const result = await client.query(`
      SELECT p.id AS principal_id, p.name, c.active AS credential_active
      FROM public.pigboard_grants g
      JOIN public.pigboard_principals p ON p.id = g.principal_id
      JOIN public.pigboard_credentials c ON c.principal_id = p.id
      WHERE g.role = 'owner' AND g.active
    `);
    await client.query("COMMIT");
    inTransaction = false;
    if (result.rows.length > 1) return { status: "schema_conflict" };
    const row = result.rows[0];
    return { ...schema, owner: row ? {
      principalId: row.principal_id, name: row.name,
      active: row.credential_active === true
    } : null };
  } catch {
    if (inTransaction) try { await client.query("ROLLBACK"); } catch { /* Connection may be lost. */ }
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
    if (before.status !== "schema_current") {
      const role = await client.query("SELECT to_regrole('pigboard_app') IS NOT NULL AS exists");
      if (role.rows[0]?.exists !== true) {
        await client.query("ROLLBACK");
        return { status: "runtime_role_missing" };
      }
    }
    if (before.status === "schema_absent") {
      await client.query(SQL);
      const catalog = await catalogChecksum(client);
      await client.query(`INSERT INTO public.pigboard_schema_migrations
        (version, checksum, catalog_checksum) VALUES (1, $1, $2)`, [CHECKSUM, catalog]);
    }
    if (before.status !== "schema_current") {
      await client.query(READ_SQL);
      const catalog = await catalogChecksum(client);
      await client.query(`INSERT INTO pigboard_schema_migrations
        (version, checksum, catalog_checksum) VALUES (2, $1, $2)`, [READ_CHECKSUM, catalog]);
    }
    const after = await schemaState(client);
    if (after.status !== "schema_current") throw new AuthorityError("schema_conflict");
    committing = true;
    await client.query("COMMIT");
    return { status: before.status === "schema_absent" ? "applied" :
      before.status === "migration_required" ? "upgraded" : "already_current",
    schemaVersion: 2, generation: after.generation };
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
  await client.query("INSERT INTO public.pigboard_principals(id, name, kind) VALUES ($1, $2, 'human')",
    [principalId, name]);
  await client.query(`INSERT INTO public.pigboard_credentials
    (id, principal_id, digest_version, digest, issued_generation)
    VALUES ($1, $2, 'sha256-v1', $3, $4)`,
  [credentialId, principalId, digestCallerToken(token), generation]);
  for (const role of ["owner", "connection_admin"]) {
    await client.query("INSERT INTO public.pigboard_grants(principal_id, role) VALUES ($1, $2)",
      [principalId, role]);
  }
  await client.query(`INSERT INTO public.pigboard_authority_events
    (generation, event_type, principal_id, previous_principal_id)
    VALUES ($1, $2, $3, $4)`,
  [generation, previousId ? "owner_recovered" : "owner_bootstrapped", principalId, previousId]);
  await client.query("UPDATE public.pigboard_team_authority SET generation = $1 WHERE team_key = 'pilot'",
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
      "SELECT generation FROM public.pigboard_team_authority WHERE team_key = 'pilot' FOR UPDATE"
    );
    if (authority.rows.length !== 1) throw new AuthorityError("schema_conflict");
    const currentGeneration = Number(authority.rows[0].generation);
    const owner = await client.query(`SELECT p.id, p.name FROM public.pigboard_grants g
      JOIN public.pigboard_principals p ON p.id = g.principal_id
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
      await client.query("UPDATE public.pigboard_credentials SET active = false WHERE principal_id = $1 AND active", [active.id]);
      await client.query("UPDATE public.pigboard_grants SET active = false WHERE principal_id = $1 AND active", [active.id]);
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

function syncDirectory(path, identity) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    if (!stat.isDirectory() || stat.dev !== identity.dev || stat.ino !== identity.ino) {
      throw new AuthorityError("unsafe_credential_directory");
    }
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

export function prepareCredentialDirectory(home = homedir()) {
  try {
    const homeIdentity = safeDirectory(home);
    const config = join(home, ".config");
    if (!existsSync(config)) mkdirSync(config, { mode: 0o700 });
    const configIdentity = safeDirectory(config);
    const app = join(config, "pigboard");
    if (!existsSync(app)) mkdirSync(app, { mode: 0o700 });
    const appIdentity = safeDirectory(app, 0o700);
    const directory = join(app, "owner-credentials");
    if (!existsSync(directory)) mkdirSync(directory, { mode: 0o700 });
    const identity = safeDirectory(directory, 0o700);
    // Persist every ancestor entry before a database commit can issue a token.
    for (const [path, current] of [[directory, identity], [app, appIdentity],
      [config, configIdentity], [home, homeIdentity]]) {
      syncDirectory(path, current);
    }
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
  let directoryFd;
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
    directoryFd = openSync(directory, constants.O_RDONLY | constants.O_DIRECTORY |
      constants.O_NOFOLLOW);
    const directoryStat = fstatSync(directoryFd);
    if (!directoryStat.isDirectory() || directoryStat.dev !== identity.dev ||
        directoryStat.ino !== identity.ino) {
      throw new AuthorityError("credential_undelivered");
    }
    fsyncSync(directoryFd);
    return path;
  } catch {
    throw new AuthorityError("credential_undelivered");
  } finally {
    if (directoryFd !== undefined) closeSync(directoryFd);
    if (fd !== undefined) closeSync(fd);
  }
}
