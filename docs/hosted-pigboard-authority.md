# Set up the first Pigboard owner

This is an **operator-only** path for the dedicated Pigboard Neon production database. It installs the authority tables, creates one named human owner and writes one caller credential to a private local file. It does not start a Fly Machine, create a Jira credential, select a board, issue agent grants, or make the service ready for users. The owner database login must never be placed in the normal Pigboard host or handed to a caller.

## Before you start

- Use the dedicated Pigboard Neon Free project, production branch, direct root endpoint, `pigboard` database and `pigboard_owner` role. The reviewed non-secret [owner pin](../config/neon-owner-root.json) is separate from the runtime `pigboard_app` pin. The command rejects a child, pooler, other database or runtime role before connecting. A match to the reviewed hostname cannot independently prove Neon's project/branch identity if an administrator reassigns that endpoint.
- Obtain the owner connection URL through the authorized Neon owner channel. Save it in a **regular, nonsymlink, mode-0600 file** in a **user-owned mode-0700 directory**. Give the command its absolute path with `--owner-url-file`; do not put the URL in a shell argument, environment dump, ticket, repository, Fly secret or log. The password file is local operator custody, not part of the Pigboard runtime.
- Run from a checkout with `npm ci` completed. This code and local tests do not establish that the live owner login, TLS, permissions, or migrations have passed. Perform the live steps only when the operator can securely retain both the database URL and the issued caller credential.

## Install, inspect, and create the owner

The examples use a placeholder path. They do not show a real secret.

```bash
npm run --silent owner:migrate -- --owner-url-file /absolute/private/owner.url
npm run --silent owner:inspect -- --owner-url-file /absolute/private/owner.url
npm run --silent owner:bootstrap -- --owner-url-file /absolute/private/owner.url --name 'Joseph Chappell'
npm run --silent owner:inspect -- --owner-url-file /absolute/private/owner.url
```

The migration uses a dedicated install lock before the unique authority row exists. `applied` means both schema versions committed on a fresh database; `upgraded` means version 2 was applied to a verified version 1 installation. Version 2 grants `pigboard_app` only the columns needed to inspect a caller's own current grant. `already_current` means both migration receipts, the installed table/constraint/index catalog and the runtime SQL grants match; it reports the **current** generation, which becomes greater than zero after owner setup. `migration_required` on inspection means version 1 is installed and must be upgraded before the host can inspect grants. `runtime_role_missing` means the custodian must create the restricted `pigboard_app` login before migration. A partial or different schema or changed runtime grant reports `schema_conflict` and must be examined; this command never drops or reverses tables. `schema_outcome_unknown` means inspect before deciding whether to rerun the migration.

The first owner command locks that one row, verifies no active owner, and commits a named human principal, owner and connection-admin grants, a one-way credential digest and generation event together. It never prints the token. On success it prints the location of a new mode-0600 file under `~/.config/pigboard/owner-credentials/`. The directory is mode 0700. Read and retain the token through a secure local owner channel. Do not copy it into a ticket, source file, terminal log or Fly runtime secret. A second bootstrap returns `owner_exists` and cannot retrieve the first token. JSON output is available with `--format json` for a noninteractive operator workflow; it also omits the token and digest.

The owner-only CLI inspection reports the schema state, current authority generation and active owner's name/principal ID without credential material. It is safe to repeat. After version 2, the private host offers caller self-inspection at `GET /v1/authority/me`; see the [private service guide](hosted-pigboard-first-service.md#inspect-a-current-owner-grant). This read does not create grants or select a Jira pair. Keep the owner database URL out of the service.

## Interrupted setup and recovery

If a database operation reports `outcome_unknown` or `schema_outcome_unknown`, **inspect before retrying**. A server commit may have completed even when its response was lost. If inspection finds no owner and the schema is current, first bootstrap can be attempted explicitly. If it finds an owner, do not repeat bootstrap.

If setup committed but the credential file could not be safely delivered, the result is `credential_undelivered` with the generation; the plaintext cannot be recovered. Inspect, then explicitly replace it:

```bash
npm run --silent owner:recover -- --owner-url-file /absolute/private/owner.url --name 'Joseph Chappell' --expect-generation 1
npm run --silent owner:inspect -- --owner-url-file /absolute/private/owner.url
```

Replace `1` with the generation just inspected. Recovery locks the authority row, checks that exact generation, revokes the previous owner credential/grants and creates one replacement in the same transaction. A stale value returns `stale_generation` without rotating anything. A changed/unsafe private directory or existing generation file prevents delivery; after a committed but undelivered recovery, inspect the new generation before another guarded recovery. Never rerun on an ambiguous commit automatically. An old credential is invalid once recovery commits. Do not exercise live recovery on an active owner's credential merely to claim QA; use an authorized disposable setup or report that live recovery remains unproved.

If the generation is above zero but inspection finds no active owner, first bootstrap returns `owner_missing_needs_repair` instead of silently creating a new owner. Stop and investigate the authority record under the infrastructure custodian's control.

Other failures include a short `nextAction` in text and JSON. For `owner_target_mismatch`, check the protected URL against the reviewed owner pin; never try a child, pooler or runtime-role URL as a workaround. For `owner_connection_unverified`, check Neon availability, the owner login and TLS, then inspect after restoring access. `unsafe_credential_directory` means fix local ownership, symlinks or modes before retrying. If `credential_file_exists`, do not overwrite or delete the file on the command's behalf: inspect the authority generation and verify local custody, then use guarded recovery only if the issued credential is lost. A `stale_generation` result means inspect again and decide whether replacement is still required. No failure status automatically retries a database mutation.

The caller credential is a high-entropy `pb1_` token; only a versioned one-way digest is stored. The future service will verify it with constant-time comparison and current grants. This Story does **not** yet expose that service. Keep the owner database login separately under infrastructure custody. If it leaks, stop administrative use and rotate/audit before continuing.

For local code checks, run `npm test`. The suite starts disposable TLS PostgreSQL servers and uses independent sessions; `initdb`, `pg_ctl` and `openssl` are required and absence fails rather than skipping. The required CI test job installs these tools. The owner client resolves trusted PostgreSQL functions before the public schema; authority relations are explicitly in `public`. Inspection reads generation and owner in one database snapshot. The schema fingerprint includes identity columns and backing sequences. Newly created credential directories and their parent entries are synced before issuing the token; a delivered token file and its directory entry are synced before success is reported. Local success is separate from live Neon identity, runtime-role, Fly, Jira and hosted PR checks.
