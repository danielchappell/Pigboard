# D3 hosted deployment and team access: decision brief

22 September 2026. This is a design for one team and one active Cursor job,
not provisioned infrastructure. It applies the reviewed
[durable attempt contract](hosted-work-contract.md), the
[INT connection gates](jira-connection-discovery.md) and the
[runner capability decision](runner-capabilities.md). The owner has not chosen
the account, host, service identity, team login or cost ceiling. D3 remains open.

## Smallest complete hosted shape

Use one always-on Node service with HTTPS ingress for authenticated Jira wake
events and human/agent inspection commands, plus an internal bounded coordinator
loop. The loop resumes from durable checkpoints after restart; it does not keep
the only copy of an attempt in memory. Run one instance for the pilot, but rely
on database uniqueness, transactions and conditional updates for ownership,
because deploy overlap or a paused sender can still exist. Keep one active
provider-capacity slot. Hosted execution remains Cursor's separate service; the
coordinator does not run a local coding daemon or checkout.

Use paid managed PostgreSQL for the first shared run store. Unique constraints
and transactions implement the D2 attempt/current-slot/effect reservations;
all external sends occur *after* their durable intent. The store records
immutable input and provider IDs, evidence digests, lease generations, effect
receipts and recovery state. Jira comments are projections, not the lock.
Database availability is a prerequisite for new effects. A backup is useful
only after a restoration drill covers effects committed *after* the recovery
point: those intents may be absent from the restored DB while the external
Cursor run or Jira comment still exists. DB constraints alone cannot find
such a lost effect.

The service exposes a plain liveness check, an HTTP readiness check for
critical infrastructure such as the store, and a separate authenticated
execution-readiness view for connection credentials and capabilities. A revoked
provider credential blocks new sends but leaves inspection/recovery available;
the HTTP check must not restart the service merely because setup is incomplete.
The operator view distinguishes pending, provider-running, valid, stale,
publication-uncertain and needs-attention, with exact attempt IDs, timestamps,
last scan, bounded failures and a safe next action. Human Jira comments show
progress/result only to the selected audience. The application API returns
structured equivalents for agents. Do not put secrets, ticket bodies or raw
provider responses in public health output or routine logs.

## Hosting options checked against the contract

| Option | Fit for one-team pilot | Cost/operation boundary | Decision |
| --- | --- | --- | --- |
| [Render paid web service](https://render.com/docs/service-types) + [paid Render Postgres](https://render.com/docs/postgresql-backups) | One HTTPS service, managed DB, [HTTP health checks](https://render.com/docs/health-checks), [private DB networking](https://render.com/docs/private-network) and [Blueprint configuration](https://render.com/docs/infrastructure-as-code) fit the shape with little platform code. Paid DB has point-in-time recovery; Hobby currently documents a three-day window. | Requires an authorized Render workspace, Git repository grant, paid compute/database, [secrets set outside source](https://render.com/docs/configure-environment-variables) and an app-level team auth decision. Free web service can spin down and free Postgres expires after 30 days with no managed backups; those free plans cannot prove laptop-independent, durable M2 acceptance. | Preferred **if** the owner accepts a new paid host and data location. No account or payment has been authorized. |
| [AWS ECS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html) + [RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html) | Can meet the same Node/Postgres contract and use [Secrets Manager injection](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html) and RDS point-in-time restore. May fit existing company control and IAM. | Needs approved AWS account, network/load balancer, deploy pipeline, database and identity administration. More setup and fixed services for this tiny pilot; real cost depends on region and account choices. | Prefer if company governance requires AWS or an approved stack already exists. No AWS resources have been inspected or created. |
| Always-on VM + local SQLite | Can satisfy basic transactions for one process if carefully backed up. | Host patching, disk backup/restore, secret handling and restart behavior become our job; one disk is a shared failure domain. Multi-instance handoff needs another design. | Do not pick solely to avoid managed DB cost; revisit only with a concrete owner-managed operations plan. |

These are architecture candidates, not cost quotes. Current official
[Render pricing](https://render.com/pricing) and the selected AWS region/account
calculator must be checked with the owner before provisioning. Cursor provider
usage is a separate variable cost. A1 must record actual resource and provider
spend; free-tier or zero-valued early usage data is not cost proof.

## Team authority and setup journey

Infrastructure dashboard membership does not grant Pigboard application access.
For M2, the owner selects an organizational identity provider or another
per-person authentication scheme. Each human must have a distinct, revocable
identity mapped to the one team and a role: viewer sees only scoped progress
and permitted results; operator can inspect/reconcile attempts; connection
administrator can bind and rotate integration credentials. An agent uses a
scoped noninteractive service credential with the same application checks,
never a human's browser session or an unscoped shared token. Role names are
proposed boundaries, not implemented permissions. Authentication mechanism,
bootstrap and credential custodian are owner decisions before team access
Stories are delivery-ready.

The onboarding proof is concrete: an operator deploys the chosen revision,
binds the INT/Cursor connections through service-held secrets, and adds one
authorized teammate. The teammate can inspect the same attempt and result
after the operator's laptop is off. A denied teammate cannot read ticket
content, raw result or operation state **through Pigboard**. Independently
verify the intended Jira issue/comment and Cursor run audiences; Pigboard
authorization cannot revoke either vendor's own access. Revoking a human's
Pigboard access removes that person's inspection and commands, not
already-authorized coordinator effects or an in-flight attempt. The service retains
auditable actor, action, team, attempt and time for consequential operations.
Jira and provider UI access may differ; neither silently substitutes for the
application's authorization.

## Limits, retention and recovery

Before a live send, configure one active cloud job and a per-run model/option
allowlist. The owner sets an approved pilot allowance and a count/time-based
**launch admission guard**; S05 remains an explicit operator launch. Fresh
observed usage may stop admission when it exceeds an owner-set threshold.
This is not a hard billing cap: a running job can accrue cost after admission,
provider usage data may lag, and no Cursor hard cap has been verified. If usage
is unknown, automatic S07 launches remain disabled. An owner requiring a
guaranteed monetary ceiling must first verify an enforceable provider/account
limit or leave automatic launches off. Revoked credentials block new sends
while allowing safe observation/recovery. Retries need an explicit authorized
request after prior effect certainty is resolved.

Proposed pilot retention for owner review: keep full provider output for 30
days after a resolved attempt and minimal attempt/effect/audit metadata for 90
days; unresolved or publication-uncertain records cannot be pruned merely by
age. Encrypt storage/backups and restrict restore/export to operators with a
recorded purpose. These durations are **not approved** and no cleanup behavior
may ship until audience, deletion and recovery needs are settled.

On a normal restart, load durable attempts and reserved effects, reconcile the
exact provider/Jira identities read-only, then resume only proven-safe steps.
On DB outage, stop new effects and report unavailable. On secret rotation,
old running attempts remain inspectable if authorized; no fallback credential
is silently used.

Point-in-time restore is a separate, fail-closed operation. First disable
ingress/scheduling, stop the old service at the host and verify no old sender
can resume; an in-flight external request still needs reconciliation. If the
old sender cannot be fenced, do not cut over. Disable all INT launches and
publications during recovery. Restore into an
isolated database and establish the recovery point and full lost-write window.
Compare the original DB if available, deployment/audit records and provider/Jira
evidence for every possible external effect in that window. Quarantine the
entire connection, not just attempts visible in the restored DB: a lost intent
may make an affected ticket appear never started. Reconstruct an exact
intent/identity only from positive evidence, then use D2 read-only
reconciliation. If the window cannot be enumerated or an effect remains
ambiguous, keep the connection in maintenance/needs-attention with no new
sends; do not assert that the backup restored operational safety. An operator
records the evidence and deliberate cutover. A restore drill must include a
simulated post-recovery-point send and prove both duplicate prevention and the
fail-closed path when evidence is missing. This favors safety over automatic
recovery; an independent durable outbound journal may be needed later if this
manual recovery burden is unacceptable.

## What must be proved before M2/A1

1. Select the host/account, region, budget and owner for deployment, secrets,
   monitoring, backup and billing. Record the actual paid plans and limits.
2. Select and test per-person team authentication and scoped agent/service
   credentials, including one allowed and one denied second-user inspection.
3. On the chosen database, test concurrent reservation, stale lease fencing,
   crash before/after external send, process restart, single capacity slot and
   PITR with a post-recovery-point effect missing from the restored DB. Prove
   quarantine/no duplicate send when the window cannot be reconciled. A mock
   or memory store is not enough.
4. Show HTTPS event intake, bounded scan, health/last-progress reporting and
   alerting for a stopped coordinator without depending on a developer laptop.
   Show launch-admission counts and actual provider spend separately; do not
   label admission as a guaranteed monetary cap.
5. Finish D1/D4 identity, Jira publication and runner repository gates. The
   company Cursor account may only run trivial checks; useful discovery
   acceptance requires an appropriately authorized environment.

S04 can be groomed once the shared store and team access choice is made: save
and inspect an **existing** provider run across process restart. S05 is the
first service-controlled provider send; S08 deploys the already functional
coordinator. Do not disguise missing auth or storage as an inert schema Story.

## Author's seven-principle assessment

| Principle | Assessment |
| --- | --- |
| Intuitive | Jira remains the work surface; teammates see plain attempt states and next actions rather than store internals. |
| Discoverable | Human setup and structured agent capabilities reveal missing host, credential and access gates before a send. |
| Delightful experience | One small service and managed DB avoid repeated laptop setup; initial connection and identity onboarding are real work to document. |
| Token saver | Status summaries and bounded detail avoid retrieving full histories for routine inspection. |
| Secure | Separate per-person/service authority, scoped secrets and denied-user test prevent dashboard membership from becoming data access. |
| Agents are equal | Agents receive noninteractive scoped inspection and recovery commands, not UI-only access or a borrowed human token. |
| Dependable | Paid recoverable storage, explicit effect checkpoints, outage behavior and restore drill protect against duplicate sends and false completion. |
