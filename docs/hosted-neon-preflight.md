# Check the Pigboard Neon production root

This is an operator diagnostic for the first hosted Pigboard service. It checks
that a dedicated runtime login reaches the reviewed production root with
hostname-verified TLS, has restricted role and effective database/schema
privileges, and can read and insert into one disposable owner-created table but
cannot update or delete it. It does not create a role, configure Fly, select a
Jira board, or prove that S02a is ready.

## Prerequisites

Use Node.js 20+ and PostgreSQL `psql`/libpq 17 or later. The reviewed non-secret
pin is in [`config/neon-pilot-root.json`](../config/neon-pilot-root.json). Its
project is `purple-pine-29285744`, production branch
`br-delicate-snow-b27m6vma`, direct host
`ep-raspy-dust-b2a3yxki.c-6.eu-central-1.aws.neon.tech`, database `pigboard`,
and role `pigboard_app`. The known child host is deliberately refused. The
same-host endpoint reassociation is outside this early diagnostic; later
recovery work must address that case.

A named owner must first create the restricted `pigboard_app` LOGIN in this
dedicated Neon production branch and privately take custody of its password.
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
is the live evidence that a matching credential was available. The role and
private file setup are separate sensitive actions; no example here contains a
password. An agent that runs the diagnostic needs authorized access to this
operator file but does not receive an application owner grant.

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
