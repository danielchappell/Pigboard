# Set up the owner and fixed pilot agent

This is an **operator-only** path for the dedicated Pigboard Neon production database. It installs the authority tables, creates one named human owner and writes one caller credential to a private local file. It also provides protected enroll/status/revoke commands for one fixed `pilot-agent`. It does not configure a private peer, create Jira credentials, select a board, or establish live recipient acceptance. The owner database login must never be placed in the normal Pigboard host or handed to a caller.

## Before you start

- Use the dedicated Pigboard Neon Free project, production branch, direct root endpoint, `pigboard` database and `pigboard_owner` role. The reviewed non-secret [owner pin](../config/neon-owner-root.json) is separate from the runtime `pigboard_app` pin. The command rejects a child, pooler, other database or runtime role before connecting. A match to the reviewed hostname cannot independently prove Neon's project/branch identity if an administrator reassigns that endpoint.
- Obtain the owner connection URL through the authorized Neon owner channel. Save it in a **regular, nonsymlink, mode-0600 file** in a **user-owned mode-0700 directory**. Give the command its absolute path with `--owner-url-file`; do not put the URL in a shell argument, environment dump, ticket, repository, Fly secret or log. The password file is local operator custody, not part of the Pigboard runtime.
- Run from a checkout with `npm ci` completed. This code and local tests do not establish that the live owner login, TLS, permissions, or migrations have passed. Perform the live steps only when the operator can securely retain both the database URL and the issued caller credential.
- Before migration, create and verify the restricted `pigboard_app` login with the [owner-only Neon setup command](hosted-neon-preflight.md#create-the-restricted-runtime-login). It saves a separate runtime passfile. The owner URL and project-scoped Neon key remain under infrastructure custody, not in the service or a caller's credential file.

## Install, inspect, and create the owner

The examples use a placeholder path. They do not show a real secret.

```bash
npm run --silent owner:migrate -- --owner-url-file /absolute/private/owner.url
npm run --silent owner:inspect -- --owner-url-file /absolute/private/owner.url
npm run --silent owner:bootstrap -- --owner-url-file /absolute/private/owner.url --name 'Joseph Chappell'
npm run --silent owner:inspect -- --owner-url-file /absolute/private/owner.url
```

The migration uses its existing dedicated install lock before the authority row exists. Current schema is **v3**: fresh installation applies versions 1, 2 and 3; a verified v1 or v2 installation upgrades forward. V2's runtime column reads remain SELECT-only. V3 adds agent events and permanent credential-digest uniqueness, including revoked credentials. Duplicate historical digests, changed source checksums, latest catalog drift or changed runtime grants return `schema_conflict`; migration never deletes history or repairs it silently. `already_current` reports the current generation and verified latest receipt/catalog. `migration_required` means valid old schema needs upgrade. `runtime_role_missing` requires protected runtime-role setup first. A lost migration reply is `schema_outcome_unknown`: inspect receipts/catalog before any explicit retry.

Before a live upgrade, stop old operator processes and fence private Flycast ingress using the [controlled v3 upgrade](hosted-pigboard-first-service.md#upgrade-v3-with-private-ingress-fenced). A stopped Machine with autostart enabled can restart on incoming traffic; stopping alone is insufficient. Never deploy a v2 operator against v3 or reverse the migration. Preserve SQL001/002 source and historical receipts. Owner mutation and agent mutation now use explicit READ COMMITTED, await the same authority row lock, then read current schema/generation/authority.

The first owner command locks that one row, verifies no active owner, and commits a named human principal, owner and connection-admin grants, a one-way credential digest and generation event together. It never prints the token. On success it prints the location of a new mode-0600 file under `~/.config/pigboard/owner-credentials/`. The directory is mode 0700. Read and retain the token through a secure local owner channel. Do not copy it into a ticket, source file, terminal log or Fly runtime secret. A second bootstrap returns `owner_exists` and cannot retrieve the first token. JSON output is available with `--format json` for a noninteractive operator workflow; it also omits the token and digest.

The owner-only CLI inspection reports the schema state, current authority generation and active owner's name/principal ID without credential material. It is safe to repeat. With v3 installed, the private host retains caller self-inspection at `GET /v1/authority/me`; see the [private service guide](hosted-pigboard-first-service.md#inspect-a-current-owner-grant). This read does not create grants or select a Jira pair. Keep the owner database URL out of the service.

After the private Fly Machine, restricted runtime login and owner-specific peer are verified, run `caller:me` with the owner's own file. Owner acceptance recorded 4 October is dated historical evidence; new migration/image and agent acceptance require fresh proof. The current two-PR batch is agent connect/disconnect followed by approved read-only named Jira metadata discovery, then regroup. See the [current queue](delivery-plan.md#active-delivery-queue--approved-4-october-2026). Owner secrets never go to an agent. General invitations, administration HTTP APIs, arbitrary names, roster listing and uninterrupted rotation remain deferred.

## Connect, inspect and disconnect the fixed agent

These commands are available in this checkout; independent committed-code review, hosted CI, authorized merge/deploy and live recipient acceptance are recorded separately in the [pilot plan](plans/pigboard-pilot-agent.md). Use the pinned protected owner URL, never a runtime URL. Only fixed `pilot-agent` and `connection_admin` are supported. No name, role, token, digest, generation or target override is accepted.

```
npm run --silent agent:enroll -- --owner-url-file /absolute/private/owner.url --format json
npm run --silent agent:status -- --owner-url-file /absolute/private/owner.url --format json
```

Enrollment generates a new UUID and bearer, saves `~/.config/pigboard/agent-credentials/agent-<UUID>.token` as an owned mode 0600 regular nonsymlink file under owned mode 0700 custody, and syncs file/directories **before** activation. Only the versioned one-way digest enters SQL. Output includes the managed path, UUID, generation and grant counts, never bearer/digest. `enrolled` means SQL committed; `already_active` means the exact existing intent was reconciled without event/generation writes. Both retain `delivery_unverified` and `peer_unverified`. Follow [private recipient and peer proof](hosted-pigboard-first-service.md#prove-and-remove-the-pilot-agent) to finish setup.

If an enrollment reply is unknown, keep its original file and inspect/retry that exact immutable intent:

```
npm run --silent agent:status -- --owner-url-file /absolute/private/owner.url --credential-file /absolute/managed/agent-UUID.token --format json
npm run --silent agent:enroll -- --owner-url-file /absolute/private/owner.url --credential-file /absolute/managed/agent-UUID.token --format json
```

The example file must be the exact path previously returned under the managed operator directory. A copied recipient file is used only by `caller:me`. The UUID filename and immutable token bind the intent. An existing file is safely read and synced again before activation; it is never overwritten. Partial/corrupt/unsafe/missing files fail before SQL. If the first output was lost, inspect the protected local directory for its UUID filename and use that file; do not generate another credential blindly. Status without a selector returns one active identity, else the last enrolled revoked identity, else `absent`; it is not a roster. `--principal-id UUID` inspects an exact identity when its file is lost. It cannot be combined with `--credential-file`.

Status returns `active`, `revoked`, `absent`, `refused` or `unknown`. JSON has top-level `schemaVersion`, `command`, `status`, `reason`, `authority`, `local`, `omissions`, `nextAction`; text carries the same meaning. Verified authority includes schemaVersion3, safe generation, fixed principal or null, active credential count, sorted grant roles and optional file-match boolean. Unknown has no guessed authority and includes `current_authority_unverified`. Database unavailable/unknown never means absent or revoked. Human/owner targets, conflicting UUID/token/name, mixed-human state or multiple active agents fail closed.

For a lost bearer, inspect current UUID, explicitly revoke, then enroll a new UUID. Replacement interrupts access; seamless rotation is deferred. A revoked token is permanently unusable, even with a new UUID.

```
npm run --silent agent:revoke -- --owner-url-file /absolute/private/owner.url --principal-id UUID --format json
npm run --silent agent:status -- --owner-url-file /absolute/private/owner.url --principal-id UUID --format json
```

Revoke removes **all** active credentials and grants for the exact fixed agent. It refuses human/owner targets. `revoked` commits one event/generation; `already_revoked` makes no write. It retains `peer_removal_unverified`: SQL revocation is not full offboarding. Prove next recipient call is a valid 401, remove the exact mapped peer, then prove owner 200 and preserved owner peer. A503 or transport failure is not revocation proof. An absent revoke target exits1; successful enroll/revoke and verified status exit0; operational failure exits1; invalid flags exit2. Help is safe and noninteractive.

A lost commit reply is `unknown`/`outcome_unknown`; inspect the same file or revoke UUID before any explicit retry. No command retries SQL automatically, changes another agent or re-enables revoked authority. Unsafe custody requires inspection, not file deletion/overwrite by the command. A second active agent is refused rather than silently replaced.

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

The caller credential is a high-entropy `pb1_` token; only a versioned one-way digest is stored. After migration version 3, the unchanged private service verifies it with constant-time comparison and current grants at `GET /v1/authority/me`, returning only that caller's grant. Keep the owner database login separately under infrastructure custody. If it leaks, stop administrative use and rotate/audit before continuing.

For local code checks, run `npm test`. The suite starts disposable TLS PostgreSQL servers and uses independent sessions; `initdb`, `pg_ctl` and `openssl` are required and absence fails rather than skipping. The required CI test job installs these tools. The owner client resolves trusted PostgreSQL functions before the public schema; authority relations are explicitly in `public`. Inspection reads generation and owner in one database snapshot. The schema fingerprint includes identity columns and backing sequences. Newly created credential directories and their parent entries are synced before issuing the token; a delivered token file and its directory entry are synced before success is reported. Local success is separate from live Neon identity, runtime-role, Fly, Jira and hosted PR checks.
