# Manager state: ownership, persistence and upgrades

14 November 2026. The owner approved customer-owned DynamoDB for release one.
This document defines the proposed implementation contract for independent review.
It does not authorize implementation or make the admission design delivery-ready.

## One coherent state model

Pigboard keeps its operational state in the customer's AWS account. The first
package uses DynamoDB; S3 remains suitable for deployment artifacts, not manager
coordination. Future approved stateful features extend the same persistence
approach. A new feature does not automatically get another database, a second
configuration file or a copy of Jira's workflow.

| Information | Authority | Pigboard treatment |
| --- | --- | --- |
| Requirements, Epic order and issue status/type/parent/labels | Jira | Read and validate; never silently replace from a stored snapshot |
| Deployment, integrations, allowed actions and scheduling policy | Canonical customer configuration | Validate once; derive provider settings and generated resource references |
| Admission intent, outcome uncertainty and human reconciliation | Pigboard operational store | Durable, conditionally updated records |
| Worker execution status, if monitoring is later approved | Worker provider | Any stored observation names its source, observation time and possible staleness |
| Credentials | Customer secret store | Configuration contains references; no credential values in state or logs |
| Builds, logs and test evidence | Their existing artifact/log/evidence services | Store references when needed; do not copy payloads into coordination records |

Jira workstream plans are work data, not competing deployment configuration.
Generated installation IDs, table names and receipts are outputs, not settings a
human must copy between systems. Scuba Pig has no runtime access or telemetry.

## Release-one storage boundary

The cloud-independent application owns admission behavior. A state interface owns
the guarantees it needs. The DynamoDB adapter implements those guarantees; the AWS
package owns provisioning, permissions and resource references. No AWS SDK types,
table keys, environment lookups or cloud identifiers enter scheduling policy.

The first implementation supports one regional table per installation and one
writer for its configured scheduling domain. On-demand capacity is the proposed
default. No indexes, streams, replication, monitoring records or generic database
framework are required for the current access pattern.

Record types have a versioned envelope: record kind, schema version, installation
and scheduling-domain identity, stable record ID and monotonic revision. An admission
record contains the full numbered stream, immutable Jira issue ID plus display key,
Epic ID, attempt ID, intended source/target statuses, relevant configuration version,
timestamps and an outcome code. A reconciliation records the operator, disposition,
time and evidence references. No descriptions, code, transcripts, secrets or raw
provider responses belong in these records.

Exact key layout and attempt-history retention are still part of PGB-68. Do not
implement speculative future record types. Separate record kinds rather than
growing a single unbounded JSON object for the entire installation.

Required interface behavior:

- Read current safety state with strong consistency. A missing, inaccessible,
  malformed or unsupported record has a distinct result; an error is never empty.
- Begin an admission only if the stream's observed revision still matches and no
  unresolved intent exists. Concurrent attempts cannot both pass that condition.
- Record the outcome only for the same attempt and expected revision. A stale
  completion cannot clear or replace a newer intent.
- Human reconciliation uses the same revision check and preserves an evidence
  record. It cannot be a blind delete or a timestamp-based expiry.
- Return structured success, conflict, unsupported-version and unavailable results.
  Storage conflicts cause a fresh evaluation later, not a Jira write retry.

These semantics, including race/failure cases, must be a shared adapter contract
test suite. A future non-AWS adapter must meet them. Generic `get`/`save` wrappers
alone do not establish portability. Only the DynamoDB adapter ships now.

## Uncertain Jira outcomes

Before sending a permitted Jira transition, durably record the intent. Send no
transition unless that write is confirmed. Once an intent exists, all later scans
hold that stream until its outcome is confirmed or a human reconciles it.

| Failure point | Required behavior |
| --- | --- |
| State read or intent write fails | No Jira write; report unavailable or uncertain state |
| Process stops after intent but before Jira call | Intent remains; later scans hold for human reconciliation |
| Jira accepts transition but response is lost | Preserve intent; do not replay transition |
| Jira confirms success but saving confirmation fails | Intent remains; later scans hold; do not repeat the completed Jira action |
| Old process tries to finish a reconciled attempt | Revision/attempt check rejects the stale update |
| Unknown state schema or incompatible configuration | No admission; identify the upgrade/configuration problem |

A database transaction cannot include Jira. This design remembers uncertainty;
it does not promise exactly-once transitions or Cursor launches. The definitive
Jira-rejection classifications, successful-admission retention and complete fresh
read protocol must be resolved in PGB-68 before apply mode is ready.

Human recovery is an operator action, distinct from a ticket's Blocked status.
The operator disables admission, waits for the bounded invocation and outstanding
request window to end, inspects the attempt and actual Jira history, and records a
disposition with evidence. If the result cannot be established, the hold remains.
Only a subsequent fresh scan may admit work. No agent automatically clears a hold,
and this action does not unblock a Jira issue or start a Cursor run.

The final recovery contract must address the external-write race: changing a
database revision cannot cancel an already-sent Jira request. Reconciliation must
not create another writer while an old request may still act. Until that procedure
is proven, recovery is an open discovery gate, not a supported command.

## Upgrade and removal rules

1. Version configuration, ticket documents and operational records separately.
   Each release declares supported read/write versions and minimum compatible
   release. Unknown versions produce a no-write diagnostic, never guessed defaults.
2. Keep compatible additions optional with defined defaults. Preserve fields owned
   by a newer compatible record version during updates; do not replace whole items
   from an older in-memory representation. Changes to meaning or invariants require
   an explicit version change and compatibility decision.
3. Installation starts with scheduling disabled and writes off. Upgrades cannot
   enable either. For an incompatible migration, disable admission, drain the
   bounded invocation, take a recovery backup and inspect the proposed migration
   before changing records. All writers must obey this maintenance boundary.
4. A migration must preserve unresolved intents, identities, revisions and human
   holds. It must be restartable without repeating completed work. First release
   introduces version one; it does not need a speculative migration engine.
5. Rollback is allowed only when the old code can read the current records and
   configuration safely. Otherwise keep writes off and use the documented forward
   repair. Never restore an old database snapshot and enable it over newer Jira
   side effects; recovered state must be reconciled first.
6. Preserve the operational table on stack deletion and replacement. A replacement
   table must not become an empty live scheduling authority. Key/schema/identity
   changes need an explicit migration, not an ordinary automatic stack update.
   Removal stops admission and reports retained data and continuing resource costs.
7. Pending intents and unresolved holds never have TTL. Cleanup applies only to
   records proven unnecessary for safety or recovery. Retention length is a pending
   operational contract choice; first release must document it before delivery.
8. Reinstallation and backup restore must identify retained state and reconcile it
   before writes are enabled. A missing table is an error for an existing install,
   not permission to recreate an empty authority. Permanent purge is a separate
   deliberate customer action after stopping the installation.

The AWS package must scope runtime access to its own table and configured secret,
and separate operator/deployer privileges from normal scheduling. Strong reads
and conditional writes are explicit adapter requirements. The installer must check
state identity and configuration compatibility before enabling apply mode.

## Verification required before implementation readiness

- Shared contract cases: simultaneous intents, stale completion, unavailable store,
  unknown schema, and human reconciliation conflicting with an old revision.
- Failure traces: stop at each boundary in the table above; repeat invocation and
  verify no new transition follows an unresolved attempt.
- Lifecycle cases: compatible upgrade preserves pending work; incompatible rollback
  refuses writes; removal retains state; restore never silently repeats Jira work.
- Security cases: runtime cannot access another table/secret; outputs omit customer
  content and credentials; no vendor principal or public endpoint is installed.
- Local policy/application tests run without AWS imports or credentials. Separately
  record actual AWS/Jira acceptance, hosted CI, reviews and release evidence.

## Evidence and remaining scope

AWS documents [strong reads](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html)
and [conditional writes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html).
Safety reads must use the base table, not an eventually consistent secondary index.
[TTL deletion is asynchronous](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html);
it is not a safe unlock or retry timer.
[DeletionPolicy](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html)
and [UpdateReplacePolicy](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatereplacepolicy.html)
cover different resource-removal paths; the deployment design must address both.
These are platform documentation facts, not live acceptance evidence.

Monitoring, worker launch deduplication, automatic recovery, alternate clouds and
additional storage engines remain follow-on work. DynamoDB approval changes the
first release's admission-state boundary only. PGB-67/PGB-68 must finish before
PGB-69 produces the complete independently reviewed Story set for owner review.

## Author assessment

- Intuitive: one state owner per fact; customers keep using Jira for work status.
- Discoverable: explicit wait/conflict/version results explain what to inspect.
- Delightful: one configuration and retained state avoid repeated manual setup;
  recovery still needs a clear operator procedure before it is usable.
- Token saver: deterministic persistence and recovery receipts avoid AI polling;
  essential uncertainty remains visible.
- Secure: customer-only table, scoped roles and secret references; no vendor access.
- Agents are equal: structured outcomes and shared contracts support noninteractive
  tools; humans receive readable evidence and deliberate recovery controls.
- Dependable: unresolved intent survives failure and upgrade; external Jira races
  remain explicit discovery work rather than an exactly-once claim.
- Unified configuration: adapters consume one validated intent; resource IDs and
  state are generated outputs, not competing editable setup files.
