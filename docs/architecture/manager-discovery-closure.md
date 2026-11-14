# Manager release one: closing the remaining technical choices

14 November 2026. Consolidated technical closure for PGB-67/PGB-68, based on
published design fd725b7b1eac6ead32fe61fffe811bcc3dfecfaf. The original local
closure received two independent CLEAN reviews. This updated combined artifact
requires its own review. It does not authorize implementation or activation.

## Release boundary

The manager previews work, admits eligible tickets, and queues a recorded dependent
stack repair. It runs in customer AWS Lambda with one customer DynamoDB table.
Jira owns requirements and status. Workers keep their existing delivery duties.
No worker monitoring, launch deduplication, cancellation, automatic recovery,
SaaS, new cloud, new QA engine or automatic Jira/Cursor provisioning is added.

## 1. State ownership and retention

Use four kinds of version-one records in the same table:

| Record | Owns | Does not own |
| --- | --- | --- |
| Installation | Installation identity, configured domain identity, supported versions, enabled/maintenance state | A second copy of customer configuration |
| Stream | Full numbered label, revision, unresolved attempt reference | Worker execution state or transcripts |
| Attempt | Immutable operation/issue/stream/cause, expected revision, publication receipts, outcome and reconciliation evidence | Jira status or ticket requirements |
| Member | Stable Jira issue ID, associated stream/Epic identity and evidence references needed to retain known work | Cached ticket contents or a substitute for a fresh Jira read |

Keep attempt history and member IDs out of the stream item. The adapter uses
separate items; ordinary key spelling is an implementation detail, not another
product decision. No secondary index or second store is required for release one.
Read coupled safety state consistently. Begin atomically creates the attempt and
sets the stream's pending reference under the observed stream revision. Finalize
atomically records that attempt's outcome and clears only its matching reference.
Persist required member identity before any Jira side effect; an incomplete write
prevents that effect. Stale revisions cannot finish another attempt.

The core interface returns confirmed, conflict, unavailable, unsupported-version
or uncertain results. It exposes no AWS SDK values. A timeout during a state write
does not authorize a Jira action. Read the same attempt identity on a later scan;
do not use a fresh attempt to bypass possible persistence.

Retain all attempt and member records in release one. No TTL, automated retirement,
history cleanup, export service or migration engine. Stack removal retains the table;
the guide states that retained storage has an ongoing cost. Existing version and
restore rules remain: restored state stays disabled until reconciled with Jira.

## 2. Inventory and visibility

The configured Jira site and project IDs define the scheduling domain. An enabled
Pigboard Epic defines numbered streams and their ordered tickets. The first disabled
scan inventories every relevant stage, including active, queued, blocked and Human
Review work; readiness filters apply to candidates only, never to occupancy.

An operator verifies the service account can browse the whole declared domain,
including issue-security restrictions, and that only this installation admits work
for it. These are installation prerequisites. Search results alone cannot prove
that invisible issues do not exist; release one does not claim to detect arbitrary
concurrent permission changes or another independently configured manager.

Each scan consumes complete bounded discovery pages, then unions current Epic
membership/dependencies/lineage with retained member IDs and reads those known IDs
fresh. Prior stream ownership survives a label edit. Known missing, inaccessible,
out-of-domain or conflicting work holds its affected stream; uncertainty whose
scope cannot be determined holds the whole scan. A new empty table cannot replace
an existing installation's authority. Initial installation over existing work
requires the disabled inventory to be reviewed before enabling admission.

An independent unstarted ticket removed from the Epic stops being a candidate.
Its retained record is not erased. Active/queued/blocked/Human Review work cannot
release its former stream solely because someone changed a label or parent.
Release one provides no automatic membership-transfer or retirement operation;
restore the expected Jira membership or leave the affected stream held for human
resolution. This preserves the already-agreed missing-work behavior without adding
a separate reconfiguration feature.

Configuration bounds Epic, stream, known-member, page, comment and request counts,
plus total scan time. Hitting any bound yields an explicit incomplete result and
no mutation based on the incomplete view. A first pilot defaults to a deliberately
small supported domain; exact defaults and their measured acceptance belong in the
implementation plan, not an assumption that the four-ticket probe measures scale.
No incremental crawler, paging checkpoint service or background queue is added.

## 3. Uncertain outcomes and human reconciliation

Keep the existing write order: persisted intent, verified comment, verified pointer
for admission, final source check, one source-specific Jira transition, conditional
confirmation. Each provider mutation has automatic retries disabled.

Any uncertain comment, pointer, transition or state outcome holds that stream.
The operator first disables admission and drains bounded active invocations, then
inspects the named attempt, publication receipts and Jira history. Draining prevents
further client sends; it does not prove an already-sent provider request was cancelled.

Supported reconciliation outcomes are:

- **Confirmed applied:** positive evidence identifies the same attempt's permitted
  transition and publication chain; preserve the evidence and conditionally finalize.
- **Confirmed not applied:** a provider result or durable execution evidence proves
  that this attempt cannot still apply, and publication side effects are accounted
  for. Only verified rejection classifications may use this outcome.
- **Unknown:** retain the hold. Elapsed time, current status, missing history or a
  changed database revision alone cannot establish non-application.

There is no blind unlock, manual force-success, pointer rollback, automatic retry
or provider cancellation in this release. In a genuinely ambiguous sent-request
case, release one may be unable to resume that stream safely. The human guide must
state this limitation. Do not invent a negative-proof test or recovery subsystem to
remove it. Operator reconciliation makes no Jira transition and launches no worker;
only a later fresh scan can consider admission.

The isolated proof exercised positive known outcomes and deliberately omitted
local confirmation for one admission. The planned stale-completion check did not
run after the observer was throttled. It does not prove every real network
ambiguity can be resolved. Production crash/race tests and the actual operator
command belong in the implementation Stories.

## 4. What closes discovery, and what implementation delivers

The [worker transport result](manager-worker-transport.md) identifies the existing
Atlassian operations, HTML code-block representation and bounded exact-comment
lookup. Read-only MCP observations matched eight raw REST fixture records, including
nulls and actor/edit metadata. This resolves the representation and lookup choice;
actual Cursor write/site compatibility remains installed acceptance before activation.
No new worker credential or provider integration is added.

The authorized isolated Jira/AWS proof established the three source-specific Jira
edges, known-ID fresh reads, conditional state conflict, retained history, a verified
manual positive reconciliation, denied AWS action, and structured comment/property
round trips. Its final observer call was throttled: F4 repair and stale-completion
checks were not run. Both independent evidence audits accepted this PARTIAL account
and classified those checks as implementation verification obligations, not a new
pre-groom feasibility experiment. Never report the whole packet passed. Customer
runtime IAM, atomic adapter failure tests and finished-package journeys remain
implementation acceptance.

The production package starts disabled, keeps core/Jira/state/AWS boundaries, derives
resource bindings from canonical configuration and exposes no public endpoint.
Its scheduler and invocation settings must not replay manager mutations. Install,
upgrade, restore and removal behavior follows the published state lifecycle rules.
Writing the package and running those journeys are implementation work, not missing
discovery artifacts.

Rollout order stays: compatible authoring/validation and role skills/filters first;
verified environment bundle; manager installed disabled; installed acceptance; then
explicit activation. No delivery automation is enabled during discovery.

The owner approved explicitly human-only QA with no invented AI passes and pausing
all manager transitions, including queue-only moves, on 14 November 2026. The owner also selected a separate human-invoked
[request-rework skill](manager-human-rework.md) for the request-to-Rework-Queued
journey. Human unblock remains its separate follow-up.

## Author assessment

- Intuitive: Jira remains the source of work; named holds explain why work waits.
- Discoverable: one contract distinguishes retained state, provider proof and future
  acceptance; diagnostics identify the affected issue/stream and missing evidence.
- Delightful: reuse the existing non-root login; avoid new setup and unsupported
  recovery promises. Real ambiguous outcomes still require human attention.
- Token saver: deterministic bounded scans and direct references avoid worker polling;
  omissions and limits remain visible rather than being treated as empty work.
- Secure: customer-only state, existing operator authority and narrower runtime IAM;
  no new credentials, vendor access or hidden permission widening.
- Agents are equal: structured outcomes are usable without guessing; operators receive
  the same evidence in readable form, with no need to infer success from a timeout.
- Dependable: atomic state changes retain uncertainty; a known limitation is explicit
  instead of inventing exactly-once delivery or clearing a hold without proof.

Combined design review, complete grooming,
independent delivery-plan review and owner review remain separate gates. No
implementation or release acceptance is claimed.
