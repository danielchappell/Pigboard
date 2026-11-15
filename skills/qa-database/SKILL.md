---
name: qa-database
description: Execute prepared read-only database observations for prescribed QA cases and assess persisted outcomes against explicit expectations. Block on missing queries, access or evidence; do not discover schema or repair setup.
---

# Prescribed database verification

Execute the supplied observations and judge their evidence. The ticket supplies
case IDs, requirement references/version, ordered observations, explicit expected
state and required evidence. The implementer supplies reviewed parameterized SQL
and parameter bindings, including declared IDs from earlier steps. Do not design
queries, inspect migrations/catalogs to discover a data path, choose new checks or
copy implementation logic as the expected answer. Only the selected reader's fixed
identity/safety checks may make its existing prerequisite catalog reads.

## Structured invocation

Read the [common structured-step contract](../qa-api/references/structured-steps.md) before acting. It owns original
raw work/start context, exact AI assignment, trusted environment receipt, declared
observations, revision-bound results and stop rules. Require the full original
inputs; a basic prose handoff or a helper fragment is insufficient.


## Required handoff

Require the reviewed PR/source revision, matching current deployed revision and
ready nonproduction target; exact engine, selected reader/tool, prepared query and
parameters; permitted tenant/record/column scope; expected results; verified restricted
read-only identity, TLS/network context; private evidence destination; observation
order/baseline and cleanup (or explicit none). Asynchronous cases must supply finite
observation intervals/deadlines and freshness expectations. Missing, stale, ambiguous
or conflicting prerequisites mean BLOCKED before observation.

Inspect supplied query/parameters and their requirement mapping before running.
Queries must have minimal columns, bounded results and scoped parameterized filters.
Do not execute write functions, EXPLAIN ANALYZE of writes, migrations, seed scripts,
queue operations or permission/connection-setting changes. Test data must already
be prepared by its authorized owner. A developer/admin credential is not a
substitute for verified restricted read-only access. Reject a mismatched query or
scope without editing it. Never relax TLS, grant permissions, open a tunnel, renew
credentials or switch databases/tools to obtain a result.

This release supports only prescribed `postgresql` with the stable reader ID
`qa-database/read-postgres.mjs`. Resolve that identifier through this selected
skill to `scripts/read-postgres.mjs`; the stable ID is not an executable path.
Unsupported engine/reader means BLOCKED before connecting, with no alternate
connector, SQL rewriting or query discovery.
This copy intentionally omits the source's optional AWS access/tunnel composer:
access arrives ready and is not established by QA.

## Exact two-hop parameters

Resolve completed earlier named outputs into this step's `inputs` through its
`bindings`, checking actual revision/actor/tenant/evidence provenance first.
Then copy the prepared `database.parameters` array and apply only declared
`parameter_bindings`: each `input` must be resolved, each zero-based `index` must
be unique/in range and within the trusted parameter count, and each bound slot
must originally be null. Preserve all literal values and unbound intentional SQL
nulls. For example, the prepared `["tenant-a", null]` with `record_id` bound to
index 1 becomes `["tenant-a", <actual record_id>]`; never insert the expected ID.
Missing, late, stale or wrong-tenant values block before opening a connection.
No string substitution, expression evaluation, coercion or SQL interpolation.

Do not mutate the original work, SQL file or parameters. Write only the mechanical
bound-params JSON array to the approved private run directory for the supplied CLI
invocation. Compare query filters, selected columns, scope and max_rows against
the prescribed contract. Keep original SQL/parameters, actual input provenance
and bound parameters in evidence. The existing reader trims SQL/trailing semicolon
and wraps it in `SELECT * FROM (...) AS qa_observation LIMIT 201`; preserve the
original bytes and executed-query audit. Its extended-protocol `values` carry
parameters separately. This existing wrapper is not permission to rewrite SQL.

## Prepared PostgreSQL reader

Resolve `QA_DATABASE_ROOT` to the directory containing this `SKILL.md`. Preparation
by the operator/implementer installs the locked pg 8.23.1 package before QA:

```sh
npm ci --prefix "$QA_DATABASE_ROOT/scripts"
```

This command is not QA recovery. Missing dependencies or tools block; do not install
or choose unpinned/global packages during QA. Run the supplied observation once:

```sh
node "$QA_DATABASE_ROOT/scripts/read-postgres.mjs" /approved/run/db-context.json QA_DATABASE_URL /approved/run/query.sql /approved/run/params.json
```

Use actual supplied paths; the parameter-file argument is optional when the
prepared query has none. The URL comes from the named runtime environment variable,
never command arguments or files. The context is supplied, not invented to pass the
helper. Its shape is:

```json
{
  "environment": "qa",
  "stage": "approved-stage",
  "targetIdentityEvidence": "/approved/run/deployment-receipt.json",
  "readOnlyRoleEvidence": "/approved/run/access-verification.json",
  "database": {
    "host": "approved-host",
    "port": 5432,
    "name": "app",
    "user": "qa_reader"
  }
}
```

Evidence references must identify actual current authorization/identity records.
The helper cannot verify those records or effective grants itself. It verifies
matching connection fields, rejects privileged PostgreSQL roles, uses validated
TLS and a read-only transaction, and requires a SELECT-compatible statement.
These safeguards do not replace verified restricted identity or query review.

Only `dev`, `qa`, `test` or `personal` environment labels are accepted; labels alone
do not prove target identity. URL query options are rejected to protect TLS settings.
Use supplied `QA_DB_CA_FILE`/`QA_DB_TLS_SERVERNAME` when needed. A TLS name different
from the endpoint requires a numeric IP (for a prepared local tunnel, `127.0.0.1`,
not `localhost`) matching context and URL. Never disable certificate verification.

Reader bounds remain: 5-second connection/query timeout, 2-second lock timeout,
7-second idle transaction timeout and a 20-second process deadline including
cleanup. No reconnect loop. Success requires rollback and connection close.
`OBSERVED` means an observation, not a test pass; helper `INCOMPLETE`, timeout or
unconfirmed cleanup means BLOCKED. Preserve any partial evidence and stop.

## Evaluate and retain evidence

Compare results with the prescribed expectations and correlate tenant, record IDs,
timestamps and baseline/after evidence. A preexisting row cannot prove creation by
this action. A before/after snapshot cannot prove no transient writes or dependency
calls. An outbox row proves intent, not event delivery. Distinguish live observations,
supplied receipts and mocks; do not infer API authorization or UI behavior from rows.
Missing stronger evidence required by the case blocks; do not invent new queries.

The reader returns at most 200 rows, probing a 201st row for truncation. Enforce
any smaller prescribed max_rows and exact column/tenant/record scope when assessing
actual rows. Excess, truncation or missing required completeness evidence cannot
prove PASS. No extra query, invented pagination or narrowed SQL. One invocation
executes only its assigned observation; separately prescribed later units belong
to the caller. Reader OBSERVED/exit 0 is not a helper/product PASS.
Keep timestamps/freshness of separate observations visible. Use only predeclared
finite observations for async requirements, without ad hoc retries or recovery.

Return every case ID with expected versus actual, PASS/FAIL/BLOCKED/NOT RUN,
requirement source, sanitized query/parameters, relevant rows/counts, baseline
comparison, environment/identity labels, source/deployed revisions, timestamps,
limits/truncation, execution artifact and cleanup status. Reader output can contain
sensitive rows; keep raw evidence private and sanitize before sharing. An
inaccessible query is never an empty successful result.

PASS requires all required observations and evidence meeting the case. A demonstrated
state mismatch under verified prerequisites is FAIL; return the assigned unit and
dependent NOT RUN reasons. Only the caller may continue already prescribed
independent work; this helper never selects another case.
A prerequisite/artifact/evidence blocker stops the job immediately: retain prior
defects, mark all remaining cases NOT RUN, return aggregate BLOCKED with the needed
human action and intended resume point. BLOCKED takes precedence over FAIL; a
defect-caused dependency skip alone remains FAIL. No test/query repairs, retries or
recovery agents. Perform only already authorized bounded cleanup and report any
uncertainty. The QA entry point owns whole-ticket reporting and transitions; this
helper never approves, merges, deploys or moves a ticket.
Recheck the supplied requirement and source/deployed revisions before returning
success. If they changed, affected evidence is stale: return BLOCKED for a fresh
handoff rather than testing a different revision or declaring it passed.
