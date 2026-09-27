import { digestCallerToken, verifyCallerToken } from "./authority-bootstrap.js";
import { openPinnedRuntimeClient, PinnedNeonError } from "./neon-client.js";

const TOKEN_PATTERN = /^pb1_[A-Za-z0-9_-]{43}$/u;
const DUMMY_DIGEST = "0".repeat(64);
const SELF_SQL = `
  SELECT a.team_key, a.generation, p.id AS principal_id, p.name, p.kind,
    c.digest_version, c.digest, array_agg(g.role ORDER BY g.role) AS roles
  FROM public.pigboard_team_authority a
  JOIN public.pigboard_credentials c
    ON c.digest = $1 AND c.active AND c.issued_generation <= a.generation
  JOIN public.pigboard_principals p ON p.id = c.principal_id
  JOIN public.pigboard_grants g ON g.principal_id = p.id AND g.active
  WHERE a.team_key = 'pilot'
  GROUP BY a.team_key, a.generation, p.id, p.name, p.kind,
    c.digest_version, c.digest
`;

export function unavailableGrant(reason) {
  const rootProblem = ["target_mismatch", "invalid_secret", "unsupported_channel_binding",
    "identity_mismatch", "tls_not_active", "tls_verification_failed"].includes(reason);
  return { schemaVersion: 1, status: "unavailable", reason,
    omissions: ["current_grant"], nextAction: rootProblem ?
      "Check the private runtime URL against the reviewed root pin and TLS settings; do not try another branch." :
      "Check the private host, Neon and owner migration, then retry inspection; do not treat this as a denied grant." };
}

export function deniedGrant() {
  return { schemaVersion: 1, status: "denied", reason: "invalid_credential",
    nextAction: "Use a current Pigboard caller credential or ask the owner to inspect its grant." };
}

export async function inspectOwnGrant(token, { secret = process.env.PIGBOARD_NEON_URL,
  openConnection = openPinnedRuntimeClient } = {}) {
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) return deniedGrant();
  let connection;
  try {
    connection = await openConnection(secret);
    const result = await connection.client.query(SELF_SQL, [digestCallerToken(token)]);
    if (result.rows.length === 0) {
      verifyCallerToken(token, "sha256-v1", DUMMY_DIGEST);
      return deniedGrant();
    }
    if (result.rows.length !== 1) return unavailableGrant("authority_conflict");
    const row = result.rows[0];
    if (!verifyCallerToken(token, row.digest_version, row.digest)) return deniedGrant();
    const generation = Number(row.generation);
    if (!Number.isSafeInteger(generation) || generation < 1 ||
        row.team_key !== "pilot" || !["human", "agent"].includes(row.kind) ||
        !Array.isArray(row.roles) || row.roles.length === 0) {
      return unavailableGrant("authority_conflict");
    }
    return { schemaVersion: 1, status: "ok", team: row.team_key,
      generation, principal: { id: row.principal_id, name: row.name, kind: row.kind },
      grants: row.roles };
  } catch (error) {
    if (error instanceof PinnedNeonError) return unavailableGrant(error.reason);
    return unavailableGrant(["42501", "42P01", "42703"].includes(error?.code) ?
      "schema_or_grant_mismatch" : "inspection_unverified");
  } finally {
    if (connection) try { await connection.close(); } catch { /* No raw driver output. */ }
  }
}
