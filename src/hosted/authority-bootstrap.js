import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { constants, closeSync, existsSync, fstatSync, fsyncSync, lstatSync,
  mkdirSync, openSync, readFileSync, realpathSync, writeSync } from "node:fs";
import * as fs from "node:fs";
import { homedir } from "node:os";
import { basename, isAbsolute, join } from "node:path";

const SQL = readFileSync(new URL("../../sql/001-pigboard-authority.sql", import.meta.url), "utf8");
const READ_SQL = readFileSync(new URL("../../sql/002-pigboard-owner-read.sql", import.meta.url), "utf8");
const AGENT_SQL = readFileSync(new URL("../../sql/003-pigboard-pilot-agent.sql", import.meta.url), "utf8");
const AGENT_CHECKSUM = createHash("sha256").update(AGENT_SQL).digest("hex");
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

export async function authorityCatalogChecksum(client) {
  const catalog = [];
  for (const sql of CATALOG_QUERIES) {
    catalog.push((await client.query(sql, [TABLES])).rows);
  }
  return createHash("sha256").update(JSON.stringify(catalog)).digest("hex");
}

async function runtimeReadGrantsCurrent(client) {
  const role = await client.query("SELECT pg_catalog.to_regrole('pigboard_app') IS NOT NULL AS exists");
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
      has_table_privilege('pigboard_app', format('public.%I', table_name),
        'SELECT') AS can_select_table,
      has_any_column_privilege('pigboard_app', format('public.%I', table_name),
        'SELECT') AS can_read_any,
      has_any_column_privilege('pigboard_app', format('public.%I', table_name),
        'INSERT') AS can_insert,
      has_any_column_privilege('pigboard_app', format('public.%I', table_name),
        'UPDATE') AS can_update,
      has_table_privilege('pigboard_app', format('public.%I', table_name),
        'DELETE') AS can_delete,
      has_table_privilege('pigboard_app', format('public.%I', table_name),
        'TRUNCATE') AS can_truncate,
      has_any_column_privilege('pigboard_app', format('public.%I', table_name),
        'REFERENCES') AS can_reference,
      has_table_privilege('pigboard_app', format('public.%I', table_name),
        'TRIGGER') AS can_trigger,
      CASE WHEN current_setting('server_version_num')::integer >= 170000
        THEN has_table_privilege('pigboard_app', format('public.%I', table_name),
          'MAINTAIN') ELSE false END AS can_maintain
    FROM unnest($1::text[]) AS tables(table_name)`, [TABLES]);
  return forbidden.rows.length === TABLES.length && forbidden.rows.every((row) =>
    !row.can_select_table && !row.can_insert && !row.can_update &&
    !row.can_delete && !row.can_truncate && !row.can_reference &&
    !row.can_trigger && !row.can_maintain &&
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
  const checksums = [CHECKSUM, READ_CHECKSUM, AGENT_CHECKSUM];
  if (receipts.length < 1 || receipts.length > checksums.length ||
      receipts.some((receipt, index) => receipt.version !== index + 1 ||
        receipt.checksum !== checksums[index] ||
        !/^[0-9a-f]{64}$/u.test(receipt.catalog_checksum))) {
    return { status: "schema_conflict" };
  }
  try {
    const catalog = await authorityCatalogChecksum(client);
    if (catalog !== receipts.at(-1).catalog_checksum) {
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
  if (receipts.length >= 2) {
    try {
      if (!(await runtimeReadGrantsCurrent(client))) return { status: "schema_conflict" };
    } catch {
      return { status: "schema_conflict" };
    }
  }
  return { status: receipts.length === 3 ? "schema_current" : "migration_required",
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
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK]);
    const before = await schemaState(client);
    if (before.status === "schema_conflict") {
      await client.query("ROLLBACK");
      return before;
    }
    if (before.status !== "schema_current") {
      const role = await client.query("SELECT pg_catalog.to_regrole('pigboard_app') IS NOT NULL AS exists");
      if (role.rows[0]?.exists !== true) {
        await client.query("ROLLBACK");
        return { status: "runtime_role_missing" };
      }
    }
    if (before.status === "schema_absent") {
      await client.query(SQL);
      const catalog = await authorityCatalogChecksum(client);
      await client.query(`INSERT INTO public.pigboard_schema_migrations
        (version, checksum, catalog_checksum) VALUES (1, $1, $2)`, [CHECKSUM, catalog]);
    }
    if (before.status === "schema_absent" || before.schemaVersion === 1) {
      await client.query(READ_SQL);
      const catalog = await authorityCatalogChecksum(client);
      await client.query(`INSERT INTO public.pigboard_schema_migrations
        (version, checksum, catalog_checksum) VALUES (2, $1, $2)`, [READ_CHECKSUM, catalog]);
    }
    if (before.status !== "schema_current") {
      const duplicates = await client.query(`SELECT 1 FROM public.pigboard_credentials
        GROUP BY digest_version, digest HAVING count(*) > 1 LIMIT 1`);
      if (duplicates.rows.length) {
        await client.query("ROLLBACK");
        return { status: "schema_conflict" };
      }
      await client.query(AGENT_SQL);
      const catalog = await authorityCatalogChecksum(client);
      await client.query(`INSERT INTO public.pigboard_schema_migrations
        (version, checksum, catalog_checksum) VALUES (3, $1, $2)`, [AGENT_CHECKSUM, catalog]);
    }
    const after = await schemaState(client);
    if (after.status !== "schema_current") throw new AuthorityError("schema_conflict");
    committing = true;
    await client.query("COMMIT");
    return { status: before.status === "schema_absent" ? "applied" :
      before.status === "migration_required" ? "upgraded" : "already_current",
    schemaVersion: 3, generation: after.generation };
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
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    const present = await tablePresence(client);
    if (TABLES.some((table) => !present.get(table))) {
      await client.query("ROLLBACK");
      return { status: TABLES.every((table) => !present.get(table)) ?
        "schema_absent" : "schema_conflict" };
    }
    const authority = await client.query(
      "SELECT generation FROM public.pigboard_team_authority WHERE team_key = 'pilot' FOR UPDATE"
    );
    if (authority.rows.length !== 1) throw new AuthorityError("schema_conflict");
    const schema = await schemaState(client);
    if (schema.status !== "schema_current") {
      await client.query("ROLLBACK");
      return schema;
    }
    const currentGeneration = schema.generation;
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
    if (currentGeneration === Number.MAX_SAFE_INTEGER) throw new AuthorityError("generation_exhausted");
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

function prepareDirectory(home, leaf) {
  try {
    const homeIdentity = safeDirectory(home);
    const config = join(home, ".config");
    if (!existsSync(config)) mkdirSync(config, { mode: 0o700 });
    const configIdentity = safeDirectory(config);
    const app = join(config, "pigboard");
    if (!existsSync(app)) mkdirSync(app, { mode: 0o700 });
    const appIdentity = safeDirectory(app, 0o700);
    const directory = join(app, leaf);
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

export function prepareCredentialDirectory(home = homedir()) {
  return prepareDirectory(home, "owner-credentials");
}

const AGENT_NAME = "pilot-agent";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const AGENT_FILE = /^agent-([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.token$/u;

function agentFileIdentity(prepared, path, ops) {
  const current = safeDirectory(prepared.directory, 0o700);
  if (current.dev !== prepared.identity.dev || current.ino !== prepared.identity.ino ||
      current.resolved !== prepared.identity.resolved ||
      path !== join(prepared.directory, basename(path))) {
    throw new AuthorityError("unsafe_credential_file");
  }
  let stat;
  try { stat = ops.lstatSync(path); }
  catch (error) {
    throw new AuthorityError(error?.code === "ENOENT" ?
      "credential_file_missing" : "unsafe_credential_file");
  }
  if (!stat.isFile() || stat.uid !== process.getuid() ||
      (stat.mode & 0o777) !== 0o600 || stat.nlink !== 1 || stat.size !== 48) {
    throw new AuthorityError("unsafe_credential_file");
  }
  return stat;
}

// File operations can be injected only by in-process tests; the CLI has no overrides.
export function prepareAgentCredential({ home = homedir(), credentialFile = null,
  durable = true, ops = fs } = {}) {
  const directory = join(home, ".config", "pigboard", "agent-credentials");
  let prepared;
  if (durable) prepared = prepareDirectory(home, "agent-credentials");
  else {
    safeDirectory(home);
    safeDirectory(join(home, ".config"));
    safeDirectory(join(home, ".config", "pigboard"), 0o700);
    prepared = { directory, identity: safeDirectory(directory, 0o700) };
  }
  let path = credentialFile;
  let principalId;
  let token;
  let fd;
  let fileIdentity;
  const existing = credentialFile !== null;
  try {
    if (existing) {
      if (typeof path !== "string" || !isAbsolute(path) ||
          !AGENT_FILE.test(basename(path)) ||
          path !== join(prepared.directory, basename(path))) {
        throw new AuthorityError("unsafe_credential_file");
      }
      principalId = AGENT_FILE.exec(basename(path))[1];
      fileIdentity = agentFileIdentity(prepared, path, ops);
      fd = ops.openSync(path, ops.constants.O_RDONLY | ops.constants.O_NOFOLLOW);
      const opened = ops.fstatSync(fd);
      if (opened.dev !== fileIdentity.dev || opened.ino !== fileIdentity.ino ||
          !opened.isFile() || opened.uid !== process.getuid() ||
          (opened.mode & 0o777) !== 0o600 || opened.nlink !== 1 || opened.size !== 48) {
        throw new AuthorityError("unsafe_credential_file");
      }
      const bytes = Buffer.alloc(49);
      let length = 0;
      while (length < bytes.length) {
        const count = ops.readSync(fd, bytes, length, bytes.length - length, length);
        if (count === 0) break;
        length += count;
      }
      const content = bytes.subarray(0, length).toString("utf8");
      if (length !== 48 || !/^pb1_[A-Za-z0-9_-]{43}\n$/u.test(content)) {
        throw new AuthorityError("invalid_credential_file");
      }
      token = content.slice(0, -1);
    } else {
      if (!durable) throw new AuthorityError("credential_file_missing");
      principalId = randomUUID();
      token = newToken();
      path = join(prepared.directory, `agent-${principalId}.token`);
      fd = ops.openSync(path, ops.constants.O_WRONLY | ops.constants.O_CREAT |
        ops.constants.O_EXCL | ops.constants.O_NOFOLLOW, 0o600);
      const opened = ops.fstatSync(fd);
      if (!opened.isFile() || opened.uid !== process.getuid() ||
          (opened.mode & 0o777) !== 0o600 || opened.nlink !== 1) {
        throw new AuthorityError("unsafe_credential_file");
      }
      fileIdentity = opened;
      const bytes = Buffer.from(`${token}\n`, "utf8");
      let written = 0;
      while (written < bytes.length) {
        const count = ops.writeSync(fd, bytes, written, bytes.length - written);
        if (!Number.isSafeInteger(count) || count < 1 || count > bytes.length - written) {
          throw new AuthorityError("unsafe_credential_file");
        }
        written += count;
      }
    }
    if (durable) ops.fsyncSync(fd);
    const final = agentFileIdentity(prepared, path, ops);
    const descriptor = ops.fstatSync(fd);
    if (final.dev !== fileIdentity.dev || final.ino !== fileIdentity.ino ||
        descriptor.dev !== fileIdentity.dev || descriptor.ino !== fileIdentity.ino ||
        descriptor.size !== 48) throw new AuthorityError("unsafe_credential_file");
    if (durable) syncDirectory(prepared.directory, prepared.identity);
    return { principalId, token, credentialFile: path,
      localStatus: existing ? "read_existing" : "prepared_locally" };
  } catch (error) {
    if (error instanceof AuthorityError) throw error;
    throw new AuthorityError("unsafe_credential_file");
  } finally {
    if (fd !== undefined) ops.closeSync(fd);
  }
}

function validAgentIntent(principalId, token) {
  if (typeof principalId !== "string" || !UUID.test(principalId) ||
      typeof token !== "string" || !/^pb1_[A-Za-z0-9_-]{43}$/u.test(token)) {
    throw new AuthorityError("identity_conflict");
  }
}

async function lockAuthority(client) {
  const present = await tablePresence(client);
  if (TABLES.some((table) => !present.get(table))) {
    throw new AuthorityError(TABLES.every((table) => !present.get(table)) ?
      "schema_absent" : "schema_conflict");
  }
  const lock = await client.query(
    "SELECT generation FROM public.pigboard_team_authority WHERE team_key = 'pilot' FOR UPDATE"
  );
  if (lock.rows.length !== 1) throw new AuthorityError("schema_conflict");
}

async function currentAgentSchema(client) {
  const schema = await schemaState(client);
  if (schema.status !== "schema_current") throw new AuthorityError(schema.status);
  const owner = await client.query(`SELECT p.id, p.kind,
    (SELECT count(*)::int FROM public.pigboard_credentials c
      WHERE c.principal_id=p.id AND c.active) AS credential_count,
    (SELECT count(*)::int FROM public.pigboard_credentials c
      WHERE c.principal_id=p.id AND c.active AND c.digest_version='sha256-v1'
        AND c.digest ~ '^[0-9a-f]{64}$' AND c.issued_generation <= $1) AS valid_count,
    (SELECT array_agg(g2.role ORDER BY g2.role) FROM public.pigboard_grants g2
      WHERE g2.principal_id=p.id AND g2.active) AS roles
    FROM public.pigboard_grants g JOIN public.pigboard_principals p ON p.id=g.principal_id
    WHERE g.role='owner' AND g.active`, [schema.generation]);
  const row = owner.rows[0];
  if (owner.rows.length !== 1 || row.kind !== "human" || row.credential_count !== 1 ||
      row.valid_count !== 1 || JSON.stringify(row.roles) !== '["connection_admin","owner"]') {
    throw new AuthorityError("owner_invalid");
  }
  return schema;
}

async function agentContext(client, principalId = null, generation = Number.MAX_SAFE_INTEGER) {
  // Aggregate current inconsistencies, then select exactly one target; never expose a roster.
  const aggregate = await client.query(`WITH states AS (
    SELECT p.id, p.name, p.kind,
      EXISTS(SELECT 1 FROM public.pigboard_credentials c WHERE c.principal_id=p.id AND c.active)
      OR EXISTS(SELECT 1 FROM public.pigboard_grants g WHERE g.principal_id=p.id AND g.active) AS active,
      EXISTS(SELECT 1 FROM public.pigboard_grants g WHERE g.principal_id=p.id AND g.active AND g.role='owner') AS owns,
      (SELECT count(*) FROM public.pigboard_credentials c WHERE c.principal_id=p.id AND c.active) AS credential_count,
      (SELECT count(*) FROM public.pigboard_credentials c WHERE c.principal_id=p.id AND c.active
        AND c.issued_generation <= $2) AS valid_count,
      (SELECT count(*) FROM public.pigboard_grants g WHERE g.principal_id=p.id AND g.active) AS grant_count,
      EXISTS(SELECT 1 FROM public.pigboard_grants g WHERE g.principal_id=p.id AND g.active
        AND g.role='connection_admin') AS connects
    FROM public.pigboard_principals p
  ) SELECT count(*) FILTER (WHERE name='pilot-agent' AND kind!='agent')::int AS human_count,
    count(*) FILTER (WHERE kind='agent' AND active)::int AS active_count,
    count(*) FILTER (WHERE kind='agent' AND active AND (name!='pilot-agent' OR owns OR
      (id::text IS DISTINCT FROM $1::text AND
        (credential_count!=1 OR valid_count!=1 OR grant_count!=1 OR NOT connects))))::int AS invalid_count,
    min(id::text) FILTER (WHERE kind='agent' AND active) AS active_id FROM states`, [principalId, generation]);
  const state = aggregate.rows[0];
  if (state.human_count || state.active_count > 1 || state.invalid_count) {
    throw new AuthorityError("authority_conflict");
  }
  let selectedId = principalId ?? state.active_id;
  if (!selectedId) {
    selectedId = (await client.query(`SELECT principal_id FROM public.pigboard_authority_events
      WHERE event_type='agent_enrolled' ORDER BY generation DESC LIMIT 1`)).rows[0]?.principal_id ?? null;
  }
  if (!selectedId) return { principal: null, credentialActiveCount: 0, grantActiveRoles: [],
    credentialMatch: null, activeId: state.active_id };
  const principal = (await client.query(
    "SELECT id, name, kind FROM public.pigboard_principals WHERE id=$1", [selectedId])).rows[0];
  if (!principal) return { principal: null, credentialActiveCount: 0, grantActiveRoles: [],
    credentialMatch: null, activeId: state.active_id };
  if (principal.kind !== "agent" || principal.name !== AGENT_NAME) {
    throw new AuthorityError("identity_conflict");
  }
  const credentials = (await client.query(`SELECT count(*) FILTER (WHERE active)::int AS active_count,
    count(*) FILTER (WHERE active AND issued_generation <= $2)::int AS valid_count
    FROM public.pigboard_credentials WHERE principal_id=$1`, [selectedId, generation])).rows[0];
  const owns = await client.query("SELECT 1 FROM public.pigboard_grants WHERE principal_id=$1 AND role='owner'", [selectedId]);
  if (owns.rows.length) throw new AuthorityError("identity_conflict");
  const grants = await client.query(`SELECT role FROM public.pigboard_grants
    WHERE principal_id=$1 AND active ORDER BY role`, [selectedId]);
  return { principal, credentialActiveCount: credentials.active_count,
    grantActiveRoles: grants.rows.map((row) => row.role), credentialMatch: null,
    activeId: state.active_id, validCredentialCount: credentials.valid_count };
}

function agentAuthority(schema, context) {
  const { activeId: _private, validCredentialCount: _count, ...publicContext } = context;
  return { schemaVersion: 3, generation: schema.generation, ...publicContext };
}

function consistentAgent(context) {
  return context.credentialActiveCount === 1 && context.validCredentialCount === 1 &&
    JSON.stringify(context.grantActiveRoles) === '["connection_admin"]';
}

function inactiveAgent(context) {
  return context.credentialActiveCount === 0 && context.grantActiveRoles.length === 0;
}

async function matchingAgentCredential(client, principalId, token) {
  const matches = await client.query(`SELECT principal_id, active, issued_generation
    FROM public.pigboard_credentials WHERE digest_version='sha256-v1' AND digest=$1`,
  [digestCallerToken(token)]);
  return matches.rows.length === 1 ? matches.rows[0] : null;
}

export async function inspectAgent(client, { principalId = null, token = null } = {}) {
  let inTransaction = false;
  try {
    if (principalId !== null && !UUID.test(principalId)) throw new AuthorityError("identity_conflict");
    if (token !== null) validAgentIntent(principalId, token);
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    inTransaction = true;
    const schema = await currentAgentSchema(client);
    const context = await agentContext(client, principalId, schema.generation);
    if (token !== null) {
      const credential = await matchingAgentCredential(client, principalId, token);
      context.credentialMatch = credential?.principal_id === principalId;
      if (!context.credentialMatch && (credential || context.principal)) {
        throw new AuthorityError("identity_conflict");
      }
    }
    if (context.principal && !consistentAgent(context) && !inactiveAgent(context)) {
      throw new AuthorityError("authority_conflict");
    }
    await client.query("COMMIT");
    inTransaction = false;
    return { status: !context.principal ? "absent" : inactiveAgent(context) ? "revoked" : "active",
      reason: null, authority: agentAuthority(schema, context) };
  } catch (error) {
    if (inTransaction) try { await client.query("ROLLBACK"); } catch { /* Safe inspection only. */ }
    return { status: error instanceof AuthorityError && error.reason === "identity_conflict" ?
      "refused" : "unknown", reason: error instanceof AuthorityError ? error.reason :
      "inspection_unverified", authority: null };
  }
}

async function mutateAgent(client, command, { principalId, token = null }) {
  let committing = false;
  try {
    if (!UUID.test(principalId)) throw new AuthorityError("identity_conflict");
    if (command === "enroll") validAgentIntent(principalId, token);
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    await lockAuthority(client);
    const schema = await currentAgentSchema(client);
    const context = await agentContext(client, principalId, schema.generation);
    let status;
    if (command === "enroll") {
      const credential = await matchingAgentCredential(client, principalId, token);
      if (credential && !credential.active) throw new AuthorityError("credential_revoked");
      if (credential && credential.principal_id !== principalId) throw new AuthorityError("identity_conflict");
      if (context.principal) {
        if (!credential || !consistentAgent(context) ||
            Number(credential.issued_generation) > schema.generation) {
          throw new AuthorityError("identity_conflict");
        }
        context.credentialMatch = true;
        await client.query("ROLLBACK");
        return { status: "already_active", reason: null, authority: agentAuthority(schema, context) };
      }
      if (credential) throw new AuthorityError("identity_conflict");
      if (context.activeId) throw new AuthorityError("agent_exists");
      if (schema.generation === Number.MAX_SAFE_INTEGER) throw new AuthorityError("generation_exhausted");
      const generation = schema.generation + 1;
      await client.query("INSERT INTO public.pigboard_principals(id,name,kind) VALUES ($1,$2,'agent')",
        [principalId, AGENT_NAME]);
      await client.query(`INSERT INTO public.pigboard_credentials
        (id,principal_id,digest_version,digest,issued_generation) VALUES ($1,$2,'sha256-v1',$3,$4)`,
      [randomUUID(), principalId, digestCallerToken(token), generation]);
      await client.query("INSERT INTO public.pigboard_grants(principal_id,role) VALUES ($1,'connection_admin')", [principalId]);
      context.principal = { id: principalId, name: AGENT_NAME, kind: "agent" };
      context.credentialActiveCount = 1;
      context.validCredentialCount = 1;
      context.grantActiveRoles = ["connection_admin"];
      context.credentialMatch = true;
      status = "enrolled";
    } else {
      if (!context.principal || inactiveAgent(context)) {
        await client.query("ROLLBACK");
        return { status: context.principal ? "already_revoked" : "absent", reason: null,
          authority: agentAuthority(schema, context) };
      }
      if (context.grantActiveRoles.includes("owner")) throw new AuthorityError("identity_conflict");
      if (schema.generation === Number.MAX_SAFE_INTEGER) throw new AuthorityError("generation_exhausted");
      await client.query("UPDATE public.pigboard_credentials SET active=false WHERE principal_id=$1 AND active", [principalId]);
      await client.query("UPDATE public.pigboard_grants SET active=false WHERE principal_id=$1 AND active", [principalId]);
      context.credentialActiveCount = 0;
      context.grantActiveRoles = [];
      status = "revoked";
    }
    const generation = schema.generation + 1;
    await client.query(`INSERT INTO public.pigboard_authority_events
      (generation,event_type,principal_id,previous_principal_id) VALUES ($1,$2,$3,NULL)`,
    [generation, command === "enroll" ? "agent_enrolled" : "agent_revoked", principalId]);
    await client.query("UPDATE public.pigboard_team_authority SET generation=$1 WHERE team_key='pilot'", [generation]);
    committing = true;
    await client.query("COMMIT");
    return { status, reason: null, authority: agentAuthority({ generation }, context) };
  } catch (error) {
    if (!committing) try { await client.query("ROLLBACK"); } catch { /* No raw driver output. */ }
    return { status: committing ? "unknown" : "refused", reason: committing ? "outcome_unknown" :
      error instanceof AuthorityError ? error.reason : "agent_change_failed", authority: null };
  }
}

export function enrollAgent(client, intent) { return mutateAgent(client, "enroll", intent); }
export function revokeAgent(client, { principalId }) {
  return mutateAgent(client, "revoke", { principalId });
}
