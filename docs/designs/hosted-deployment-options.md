# D3 hosted deployment and team access: decision brief

23 September 2026; Pigboard target updated 26 September. This is a design for one team and one active Cursor job,
not provisioned infrastructure. The owner selected their signed-in Fly.io
account as the hosting provider; read-only CLI checks confirmed sign-in and
multiple available organizations. The deployment organization is not yet
selected. This design applies the reviewed
[durable attempt contract](hosted-work-contract.md), the
[active PIG connection gates](pig-jira-connection-discovery.md) and the
[runner capability decision](runner-capabilities.md). Team login, service
identity, region, organization, cost ceiling and retention remain open D3 facts.

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
provider credential blocks new sends **and authenticated provider observation
and recovery** until a new authorized credential is bound. Already-stored
Pigboard results remain inspectable under application roles; the service does
not claim it can inspect the provider while that credential is gone.
The HTTP check must not restart the service merely because setup is incomplete.
The operator view distinguishes pending, provider-running, valid, stale,
publication-uncertain and needs-attention, with exact attempt IDs, timestamps,
last scan, bounded failures and a safe next action. Human Jira comments show
progress/result only to the selected audience. The application API returns
structured equivalents for agents. Do not put secrets, ticket bodies or raw
provider responses in public health output or routine logs.

## Selected hosting path and alternatives

| Option | Fit for one-team pilot | Cost/operation boundary | Decision |
| --- | --- | --- | --- |
| [Fly App on Machines](https://fly.io/docs/launch/deploy/) + [Fly Managed Postgres](https://fly.io/docs/mpg/) | One Node app with HTTPS ingress, an always-on coordinator and private-network PostgreSQL. MPG includes high availability, backups, connection pooling and a documented [restore into a new cluster](https://fly.io/docs/flyctl/mpg-restore/). | Select the Fly organization/region and paid machine/MPG plan before provisioning. The current MPG Basic plan starts at $38/month plus provisioned storage; app machines, traffic and a temporary restored cluster add cost. These are provider list prices, not a pilot quote. | Selected provider path; no app, database, token or secret has been created. |
| Fly App + a single local SQLite volume | Could provide local transactions on one machine. | [Fly volumes are local and not automatically replicated](https://fly.io/docs/volumes/overview/); restoring a volume is not the reviewed shared-store/PITR path. | Not selected for the first shared run store. |
| Render or AWS from the earlier comparison | Both can host a Node service and managed database. | Would introduce a different account and setup path after the owner's Fly decision. | Historical alternatives only; reopen if Fly fails a required contract. |

Keep a versioned `fly.toml` in the later deployment Story, with the intended
single Machine and auto-stop setting explicit. Fly's first deploy can create
redundant Machines by default, so do not infer the desired instance count from
the source alone. Use [app-scoped deploy tokens](https://fly.io/docs/security/tokens/)
for automation, not the signed-in person's broad `fly auth token`. Inject
runtime credentials through [Fly app secrets](https://fly.io/docs/apps/secrets/),
not the image or config file. A secret update restarts Machines, so restart
recovery must be exercised. MPG stays on the Fly private network; the app uses
the [pooled connection for normal requests and direct connection where a
transaction/session feature requires it](https://fly.io/docs/mpg/client-configuration/).
Fly organization membership does not replace Pigboard application roles.
Cursor usage is a separate variable cost. A1 records actual resource and
provider spend; a zero-valued early usage display is not cost proof.

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

The onboarding proof is concrete: a deploy owner deploys the chosen revision,
a connection administrator binds the PIG/Cursor connections through service-held
secrets, and a team administrator adds one authorized teammate. The teammate
can inspect the same attempt and result
after the operator's laptop is off. A denied teammate cannot read ticket
content, raw result or operation state **through Pigboard**. Independently
verify the intended Jira issue/comment and Cursor run audiences; Pigboard
authorization cannot revoke either vendor's own access. Revoking a human's
Pigboard access removes that person's inspection and commands, not
already-authorized coordinator effects or an in-flight attempt. The service retains
auditable actor, action, team, attempt and time for consequential operations.
Jira and provider UI access may differ; neither silently substitutes for the
application's authorization.

The access proof covers commands, not just a page view. Roles are independent;
holding connection administration does not implicitly grant operator rights.
All permissions are scoped to the selected team and connection. The D3 role
contract must implement and test this allow/deny matrix before access Stories
are ready:

| Command | Viewer | Operator | Connection admin | Scoped agent | Recovery principal |
| --- | --- | --- | --- | --- | --- |
| Inspect approved ticket/result | Allow | Allow | Deny unless separately granted viewer/operator | Allow only with an explicit inspect grant | Deny; recovery metadata only |
| Launch or retry | Deny | Allow with normal eligibility/budget checks | Deny unless separately granted operator | Allow only with an explicit launch/retry grant and the same checks | Deny |
| Reconcile a normal attempt | Deny | Allow | Deny unless separately granted operator | Allow only with an explicit reconcile grant | Deny |
| Enter recovery and set the external marker | Deny | Deny | Deny | Deny | Allow for the named app, connection and expected target, before DB attachment |
| Inspect recovery window, record restore evidence or reopen | Deny | Deny | Deny | Deny | Allow only for the named connection in recovery mode |
| Bind or rotate Jira/Cursor credentials | Deny | Deny | Allow | Deny | Deny; may verify a current secret version without reading its value |

The recovery principal is separate from all roles stored in the database being
restored. For the Fly pilot, investigate a named operator using a short-lived,
app-scoped [machine-exec token](https://fly.io/docs/security/tokens/) to reach
the recovery CLI, plus an out-of-database connection grant. A Fly token alone
does not establish command confinement. The recovery CLI
checks the named app and connection on every command, the expected database
target and an out-of-database grant before entering recovery, and the active
recovery marker on all later commands. It audits both entry and subsequent
commands. It
exposes only recovery IDs, digests, window and evidence status before current
application roles are rebuilt, never raw ticket/provider content. D3 must
verify the Fly token scope, revocation and operator audit in a controlled
environment; if that mechanism cannot enforce the matrix, choose an external
identity-backed recovery path before S29. Test allowed and denied cases for
each boundary, including removed members, reduced roles and scoped agents.

## Limits, retention and recovery

Before a live send, configure one active cloud job and a per-run model/option
allowlist. The owner sets an approved pilot allowance and a count/time-based
**launch admission guard**; S05 remains an explicit operator launch. Fresh
observed usage may stop admission when it exceeds an owner-set threshold.
This is not a hard billing cap: a running job can accrue cost after admission,
provider usage data may lag, and no Cursor hard cap has been verified. If usage
is unknown, automatic S07 launches remain disabled. An owner requiring a
guaranteed monetary ceiling must first verify an enforceable provider/account
limit or leave automatic launches off. Revoked credentials block new sends and
authenticated provider observation/recovery until a new authorized credential
can access the original run. Retries need an explicit authorized
request after prior effect certainty is resolved.

Before live ticket capture, the owner must approve retention and deletion for
each stored class: copied Jira source content; prepared prompts/provider
requests; raw provider output; validated evidence and comments; and minimal
attempt/effect/audit metadata. The policy must also cover backup copies,
restored clusters, exports, unresolved or publication-uncertain attempts, and
the time needed for recovery. No class inherits another class's duration by
default. Encrypt storage/backups and restrict restore/export to named
operators with a recorded purpose. No live source capture, cleanup job or
retention claim may ship while a required duration/audience/deletion rule is
unapproved. S04 can store minimal identifiers under an approved minimal-record
policy; S05 needs the complete policy for its input and output classes.

On a normal restart, load durable attempts and reserved effects, reconcile the
exact provider/Jira identities read-only when their credentials remain valid,
then resume only proven-safe steps.
On DB outage, stop new effects and report unavailable. On secret rotation,
old running attempts remain locally inspectable if authorized. Provider reads
require an authorized new credential that can access the original run; if none
exists, observation and recovery remain unavailable/needs-attention. No
fallback credential is silently used.

Point-in-time restore is a separate, fail-closed operation. First establish an
externally durable recovery marker and expected database target in Fly app
configuration, outside the database being restored. The app and deployment
workflow must reject a changed database target unless this marker is active;
every Machine checks it before scheduling or allowing an effect, including
after restart or overlapping deploys. Set recovery mode, disable
ingress/scheduling, stop the old service at the host and verify no old sender
can resume; an in-flight external request still needs reconciliation. If the
old sender cannot be fenced or the marker cannot be verified on every Machine,
do not attach the restored target. Disable all PIG launches and publications
during recovery. Restore into an
isolated database and establish the recovery point and full lost-write window.
Compare the original DB if available, deployment/audit records and provider/Jira
evidence for every possible external effect in that window. Quarantine the
entire connection, not just attempts visible in the restored DB: a lost intent
may make an affected ticket appear never started. Reconstruct an exact
intent/identity only from positive evidence, then use D2 read-only
reconciliation. If the original DB or audit/provider/Jira evidence cannot bound
and enumerate the window, record it explicitly as unknown or unbounded; an
empty restored attempt list cannot make it complete. Also reconcile authorization changes in the lost-write window:
membership revocations, role reductions, credential rotations and connection
scope changes. Only the separately authorized recovery principal can inspect
minimal recovery metadata and record evidence while normal application access
is quarantined. Apply current authority before restored ticket/result inspection
or ordinary commands are exposed; a restored role or secret reference never
reinstates access. If authority cannot be reconstructed, keep the connection and access
surface quarantined. If the effect window cannot be enumerated or an effect remains
ambiguous, keep the connection in maintenance/needs-attention with no new
sends; do not assert that the backup restored operational safety. The recovery
principal records the evidence and deliberate cutover. A restore drill must include a
simulated post-recovery-point send and a revoked member/rotated credential.
It must prove duplicate prevention, denied stale access and the fail-closed
path when evidence is missing. Fly Managed Postgres
[restores into a new cluster](https://fly.io/docs/flyctl/mpg-restore/), so cutover
must explicitly rebind the app's database secret, verify the new cluster and
retain the old cluster until accepted. The restored cluster is billed
separately. This favors safety over automatic recovery; an independent durable
outbound journal may be needed later if manual recovery is too costly.

The minimal one-team restore path belongs **before A1**: S29 quarantines a
restored connection and exposes its recovery window without launching work;
S30 records exact external effects or unresolved evidence; S31 rechecks current
authority and either reopens the verified connection or leaves it quarantined.
These are provisional small outcomes that need a concrete file/day check before
grooming. The broader
multi-team restore Story S25 remains in M6. A1 cannot count a backup restore
test as passed until S29-S31 and a Fly MPG drill show both safe cutover and the
fail-closed case.

## What must be proved before M2/A1

1. Confirm the Fly organization, region, budget and owner for deployment, secrets,
   monitoring, backup and billing. Record the actual paid plans and limits.
2. Select and test per-person team authentication and scoped agent/service
   credentials. Cover viewer/operator/connection-administrator and agent
   allowed/denied inspection, launch, reconciliation and credential commands.
3. On the chosen database, test concurrent reservation, stale lease fencing,
   crash before/after external send, process restart, single capacity slot and
   PITR with a post-recovery-point effect and access/credential change missing
   from the restored DB. Prove quarantine/no duplicate send and no stale access
   when the window cannot be reconciled. A mock
   or memory store is not enough.
4. Show HTTPS event intake, bounded scan, health/last-progress reporting and
   alerting for a stopped coordinator without depending on a developer laptop.
   Show launch-admission counts and actual provider spend separately; do not
   label admission as a guaranteed monetary cap.
5. Finish D1/D4 identity, Jira publication and runner repository gates. The
   company Cursor account may only run trivial checks; useful discovery
   acceptance requires an appropriately authorized environment.

S04 can be groomed once the shared store, retention and team access choice is made: save
and inspect an **existing** provider run across process restart. S05 is the
first service-controlled provider send; S08 deploys the already functional
coordinator. Do not disguise missing auth or storage as an inert schema Story.

## Author's seven-principle assessment

| Principle | Assessment |
| --- | --- |
| Intuitive | Jira remains the work surface; teammates see plain attempt states and next actions rather than store internals. |
| Discoverable | Human setup and structured agent capabilities reveal missing host, credential and access gates before a send. |
| Delightful experience | One Fly service and managed DB avoid repeated laptop setup; initial connection and identity onboarding are real work to document. |
| Token saver | Status summaries and bounded detail avoid retrieving full histories for routine inspection. |
| Secure | Per-person/service roles, scoped Fly tokens/secrets, command-denial tests and restored-role reconciliation prevent dashboard or stale database access from becoming application authority. |
| Agents are equal | Agents receive noninteractive scoped inspection and recovery commands, not UI-only access or a borrowed human token. |
| Dependable | Fly Managed Postgres, explicit effect checkpoints, outage behavior and the pre-A1 quarantine/reconcile/cutover drill protect against duplicate sends and stale access. |
