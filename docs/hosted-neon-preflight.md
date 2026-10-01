# Check the Pigboard Neon production root

This is an operator diagnostic for the first hosted Pigboard service. It checks
that a dedicated runtime login reaches the reviewed production root with
hostname-verified TLS, has restricted role and effective database/schema
privileges, and can read and insert into one disposable owner-created table but
cannot update or delete it. It does not create a role, configure Fly, select a
Jira board, or prove that S02a is ready.

TLS evidence is measured at the client boundary. Neon can terminate client TLS
at its proxy, so PostgreSQL's `pg_stat_ssl` describes a different connection and
cannot establish whether this client is encrypted. This diagnostic launches
`psql` with a clean environment, mandatory `PGSSLMODE=verify-full`, system trust,
and the pinned hostname. Only successful, parsed query completion under that
policy supplies the `tls` check. A SQL snapshot alone leaves client TLS
unverified; backend SSL flags cannot make it pass or fail. A failed, timed-out,
oversized or malformed process result cannot certify TLS. This does not make a
claim about provider-internal transport. See [Neon's security model](https://github.com/neondatabase/website/blob/main/content/docs/security/security-overview.md)
and [PostgreSQL backend statistics](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-SSL-VIEW).

## Prerequisites

Use Node.js 20+ and PostgreSQL `psql`/libpq 17 or later. The reviewed non-secret
pin is in [`config/neon-pilot-root.json`](../config/neon-pilot-root.json). Its
project is `purple-pine-29285744`, production branch
`br-delicate-snow-b27m6vma`, direct host
`ep-raspy-dust-b2a3yxki.c-6.eu-central-1.aws.neon.tech`, database `pigboard`,
and role `pigboard_app`. The known child host is deliberately refused. The
diagnostic alone cannot detect same-host endpoint reassociation. The owner-only
setup command below checks the current branch mapping around role creation.

An infrastructure owner first creates the restricted `pigboard_app` LOGIN with
the [owner-only setup command](#create-the-restricted-runtime-login). This saves
its generated password in a private file without printing it. Do not use the
Neon Console Add role control: [Neon's role guide](https://github.com/neondatabase/website/blob/main/content/docs/guides/logical-replication-materialize.md#L244-L260)
says Console-created roles receive broad `neon_superuser` membership that this
diagnostic rejects.
Only `pigboard_owner` creates the disposable fixture using
[`sql/runtime-role-probe.sql`](../sql/runtime-role-probe.sql). That SQL grants
USAGE on `public` and SELECT/INSERT on the fixture, with no other table grant.
Do not run it twice while the fixture exists. The diagnostic itself changes no
database records. Effective database `CREATE` and CREATE on every non-system
schema must also be denied, and the login must not be a member of any other
role, even if that membership is not currently inherited. A role flag alone
cannot establish this. If the
owner cannot establish the exact role and grants, stop and record the open gate.

The owner installs a PostgreSQL password-file entry for the pinned
`host:5432:pigboard:pigboard_app` tuple in an absolute path outside the repository.
The file must be regular, nonsymlink, owned by the executing user and mode 0600
or stricter. Keep the password out of terminal arguments, environment values,
shell history, repository files, tickets, chat and logs. The command checks file
metadata only and passes its path through `PGPASSFILE`; it cannot verify the
entry text. Successful authentication under the pinned connection parameters
is the live evidence that a matching credential was available. Role and file
setup is separate from the diagnostic; no example here contains a
password. An agent that runs the diagnostic needs authorized access to this
operator file but does not receive an application owner grant.

## Create the restricted runtime login

This one-time command is for the infrastructure owner. It requires the pinned
Pigboard production branch, Node.js 20+, `psql`/libpq 17 or later, a private
direct `pigboard_owner` URL file, and a **Pigboard-project-scoped** Neon API key.
The URL and key must be in separate regular, nonsymlink, user-owned mode-0600
files, each under an existing user-owned mode-0700 directory. Keep them outside
the repository and Fly runtime. The new passfile path must be absolute and absent
under an existing user-owned mode-0700 directory. Do not paste credentials into
the command, a ticket, chat or logs.

```bash
npm run --silent owner:runtime-login -- --owner-url-file /absolute/private/owner.url --neon-key-file /absolute/private/neon.key --passfile /absolute/private/app.pgpass
npm run --silent owner:runtime-login -- --owner-url-file /absolute/private/owner.url --neon-key-file /absolute/private/neon.key --passfile /absolute/private/app.pgpass --format json
```

Choose either text or JSON output, not both runs. `--help` shows the same inputs.
The command accepts no project, branch, endpoint, host, database, role or password
override. It checks Neon's current endpoint-to-branch mapping, opens the pinned
owner connection with verified TLS, checks PUBLIC defaults and creates the fixed
restricted login. It writes and syncs the password file before database COMMIT.
After commit, it authenticates through that **saved file** with the pinned direct
`psql` connection and verifies identity, TLS and effective rights. It checks the
Neon branch mapping again before reporting `created_verified`. The disposable
fixture is a separate check, so `fixture_grants` may be the only omission in a
successful setup result. The setup command does not grant table access, deploy
Fly, issue a service caller or select a Jira board.

Exit 0 means the role, file-backed login and branch mapping were verified. Exit
1 means failed or uncertain; exit 2 means invalid usage. Text and JSON include a
stable status, completed checks and omissions. Failed or uncertain results also
include a safe `nextAction`. Neither
format prints a password, verifier, owner URL, key, raw database error or file
contents. A missing or mismatched endpoint mapping refuses mutation. Do not
reassign the Neon endpoint while provisioning; an administrator can change a
mapping between two checks, and a later mismatch is reported as uncertain.

If `passfile_exists` or `role_exists`, inspect the existing file and pinned role;
the command never overwrites, resets or drops either. `precommit_failed` means
no COMMIT was attempted and any started transaction's rollback was confirmed,
but a passfile may remain: confirm role absence
on the pinned branch, inspect the exact private orphan file, remove only that
file under owner custody and explicitly rerun. `outcome_unknown` means COMMIT,
rollback, or the final branch mapping could not be established; **do not rerun**. Recheck the
mapping and inspect both role and file. If both exist, run the pinned diagnostic
with the file; its connection, identity, TLS, role and database/schema checks
can reconcile the credential even while the fixture is still missing.
`created_unverified` means COMMIT was known to finish but the file-backed login
or a required check failed. Keep the file and inspect the role and diagnostic.
If a role exists but the file is missing or cannot authenticate, stop: before any
migration, grant or service use, the infrastructure owner may inspect
dependencies, disable/drop only this unused role, confirm its absence and rerun.
Once it is in use, a separate guarded password rotation is required. Never
delete, rotate or recreate a role from an unverified endpoint mapping.

## Run and read the result

```bash
npm run --silent neon:preflight -- --passfile /absolute/private/path
npm run --silent neon:preflight -- --passfile /absolute/private/path --format json
```

The command defaults to the pinned root. `--target-host` exists only to verify
that another target is refused *before* file inspection or connection:

```bash
npm run --silent neon:preflight -- --passfile /absolute/private/path \
  --target-host ep-hidden-feather-b2qm5pb0.c-6.eu-central-1.aws.neon.tech
```

The normal result includes `root_target`, `passfile`, `connection`, `identity`,
`tls`, `role_attributes`, `role_membership`, `database_privileges`,
`schema_privileges` and `fixture_grants`. Text and JSON carry the same status.
JSON has `schemaVersion`, `status`, non-secret expected `target`, a safely
printable `requestedHost` (null for malformed input), `checks[]` with stable
IDs/status/reasons, and `omissions[]`. Exit 0 means all checks passed; exit 1
means a failure or an unverified check; exit 2 means invalid command usage.
Neither a timeout nor a missing field can pass. The command never prints the
password-file path or contents, a connection string, or raw database stderr.
The fixture check also rejects column-level UPDATE or REFERENCES grants; a
table-only ACL check would miss those effective privileges.

If `root_target` fails, compare the host with the source-controlled pin; do not
change the pin merely to make a child pass. If `passfile` fails, repair its
absolute path, type, owner or mode privately. If `connection` fails, check the
role/credential and network/TLS from the operator environment without pasting
the password into an issue or chat. If `database_privileges` or
`schema_privileges` fails, the owner must remove broad effective rights,
including inherited rights, before deployment. If `fixture_grants` is
unverified, create or inspect the disposable fixture as owner, then rerun.

After recording live evidence, the owner separately runs:

```sql
DROP TABLE public.pigboard_runtime_role_probe;
```

Verify the table is absent. If cleanup fails, record the remaining table and
stop; do not call the fixture cleaned. A passing diagnostic is evidence for
this login and current pin only. Fly secret custody, restart/rollback, Jira
scope, app grants and pair selection have their own later gates.
