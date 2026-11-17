# Pig Boss: company installation and operating health

17 November 2026. Owner-approved scope clarification and basic-health addition to
PGB-66. Proposed release behavior, not shipped functionality. This document
supersedes label-only identity and ambiguous monitoring exclusions in earlier
manager documents. The manager component is **Pig Boss**; the product is Pigboard.
Existing technical filenames and schema identifiers keep their names.

Pig Boss coordinates the [Pigboard crew](../product/branding.md): Hardhat Ham
(implementer), Inspector Pork (PR reviewer) and Snout Scout (QA).

The [local configuration checker](../configuration.md) now validates and resolves
project scope and previews changes without provider calls or state writes. This
local capability does not implement the proposed manager or health behavior below,
prove native readiness, or establish live capacity.

## One installation, multiple projects

A company deploys Pig Boss once into its AWS account for one Jira site. One
canonical configuration lists its managed project IDs and each project's native
status/type/actor mappings, worker prefixes and repository allowlist. Shared
defaults may be inherited explicitly; unresolved or conflicting mappings fail
validation. Adding a project changes that configuration, not the deployment model.
Preview inventories the new scope before an operator enables it.

One installation owns each configured project. Overlapping installations are
unsupported: enablement requires the operator's ownership inventory, not a claim
that DynamoDB coordinates separate installations. Boards are views, not ownership
boundaries. One scheduled scan runs at a time across the installation; independent
Cursor workers can run concurrently after admission. No customer deploys a manager
per board, and increasing Lambda concurrency is not a supported scaling action.

The stream key is `(Jira site identity, immutable project ID, full label)`.
`AI-Maria-1` in projects A and B represents two independent streams. Epic ownership,
occupancy, five-ticket cap, repair order, retained membership and conditional state
updates all use that composite key. Within one project, the same label still has
at most one active opted-in Epic. People remain responsible for code independence
between streams, including streams in different projects using the same repository.

Native Jira metadata supplies the project, not a user-editable YAML field. Receipt
ticket IDs and configured site identify the issue. Admission payloads also bind the immutable `project_id`; downstream records inherit it through their assignment reference. Worker preflight rejects a changed native project against that binding. References and Epic membership
must be resolved and checked against native project metadata. An Epic's members
belong to its project. Explicit prerequisites may reference other allowed projects;
they never merge the two stream identities. A missing cross-project prerequisite
holds its dependent stream. An inaccessible project or incomplete shared inventory
holds the scan when safe scope cannot be established. A known, isolated stream
conflict does not prevent independent complete streams from progressing.

Retained member/attempt records preserve original site/project identity. A project
move, label edit or project removal cannot silently release old occupancy, migrate
an unresolved attempt or make old work disappear. Preview reports the affected
scope; apply holds it. Release one has no automatic membership-transfer feature.
Unknown pending work during reconfiguration keeps writes disabled. A project-key
rename with an unchanged immutable ID does not create another stream.

## Basic health in release one

Customers need to answer: is Pig Boss scheduled, is it completing scans, what is
waiting, and is this installation approaching its configured limits? This is
manager health only. Cursor heartbeats, transcript collection, cancellation and
worker recovery remain deferred.

Preview execution returns a versioned scan summary. The AWS wrapper writes
one sanitized completion event to the existing log group and emits CloudWatch
embedded metrics. No second operational database or worker ledger is introduced.
Ordinary apply retains its existing outcome logs and native metrics; it does not
produce this scan-summary contract. Missing detailed apply health remains
unverified and cannot imply healthy or complete execution. Keep mode, canonical
configuration and package identities distinct; older preview evidence cannot
establish current apply completion. The existing health evaluator may report
starting or stale when no current completion exists; it adds no separate
unsupported-apply state.
Summary fields: scan ID, installation/configuration revision, start/end timestamps,
mode, complete/incomplete/failed result, counts of scanned projects/streams/issues,
Jira requests and pages, consumed time, configured bounds, selected/held counts and
bounded reason codes. Per-project results use stable IDs in logs, not metric
dimensions. Never log ticket bodies, tokens, transcripts or raw provider errors.

Completion means all required reads and decisions finished, and any attempted
effects have a known or explicitly retained uncertain outcome. A normal wait, no
ready work, five-ticket cap or retained human-reconciliation hold is a complete
scan with separately visible work holds. Missing pages, denied reads, exhausted
budgets or infrastructure failures are incomplete/failed scans, never healthy
empty work. A crash emits no completion; absence must be detectable externally.

Expose a read-only health command with readable and JSON output. It reads the
deployed schedule/configuration, retained applied controls, current-revision summaries and metrics;
it never scans or transitions Jira or changes scheduling state. Report:

| Result | Meaning |
| --- | --- |
| disabled | Desired schedule is disabled and observed scheduler is stopped; no periodic success is expected. |
| starting | Enabled within the configured freshness window; no current-revision completion yet. |
| healthy | Latest supported preview scan is complete and fresh, with no capacity warning. Work holds are listed separately. |
| degraded | Latest scan failed/incomplete, capacity is near its bound, or actual schedule differs from desired intent in either direction. |
| stale | No current-revision complete scan within the freshness window. |
| unknown | Health/configuration evidence cannot be read or validated; never report healthy. |

Evaluate health in this order and return the first matching result. Keep secondary
reasons in the output; a primary state never hides an observed failure:

1. **unknown:** a required configuration/schedule/telemetry read failed, evidence is
   invalid, or the current evidence revision cannot be established. A successful
   read finding no completion is known absence, not a read failure.
2. **degraded:** observed scheduler state differs from canonical intent in either
   direction. This wins even if scan evidence is also stale.
3. **disabled:** desired and observed schedule are both disabled. Old scan data or
   prior failures do not turn an intentional stop into stale/unhealthy scheduling.
   Safe-stop confirmation still uses the existing drain procedure.
4. **stale:** scheduling is enabled and the last current-revision complete scan is
   older than freshness, or there is no such completion and the current revision's
   enablement age exceeds freshness. A recent failed attempt cannot reset this age.
5. **degraded:** the latest attempt failed/incomplete, a current capacity warning
   exists, while freshness has not expired.
6. **starting:** enabled within the freshness window, with no current-revision
   complete scan and none of the failure conditions above.
7. **healthy:** a fresh complete scan exists and none of the above applies.

The boundary uses `age > freshness`; equality is still within the window. Thus an
intentional stop with old success is disabled; expired success plus recent failure
is stale with the failure also reported; a failed first scan is degraded before
expiry and stale afterward. The CLI, JSON output and acceptance fixtures share this
ordered decision table. Alarm/SNS provisioning, reads, conditions and links are deferred in the reduced release.

Report evidence timestamps, desired/actual schedule state, last complete and latest
attempt, scan duration, maximum budget utilization, held-work counts and direct
AWS logs, metrics, function and schedule links. Exit 0 for healthy or intentionally disabled, 1
for degraded/stale, and 2 for starting/unknown/invalid configuration; JSON always
includes the state so disabled cannot be mistaken for running. Never substitute
an older configuration's success. Permission failures are unknown, not disabled. Any desired/actual mismatch takes precedence over disabled or starting; a failed stop is degraded with exit 1. Confirm stopped/drained execution using the existing stop procedure before declaring a safe stop.

Canonical configuration owns schedule interval, scan budget, log retention, health
freshness and warning threshold.
Initial defaults: five-minute cadence, scan time budget below that cadence,
freshness three cadences, and warning at 80% of any configured scan bound. The
installer validates positive bounds and freshness longer than a full scan plus
cadence. Default values require installed acceptance; they are not capacity claims.

The reduced release uses the existing log group and embedded metrics only. No
alarm or SNS resource, read, state condition or link is part of PGB-100. Runtime
keeps its existing log-write grants; it does not call PutMetricData. Namespace
`Pigboard/Manager` has exactly `InstallationId` and `EvidenceRevision` dimensions.
Metrics are CompletePresence, AttemptPresence, FailurePresence,
MaximumBudgetUtilization and DurationMilliseconds. Presence and utilization use
Maximum; duplicate events or points are never interpreted as exact run counts.
Per-project counts and reasons belong in bounded logs, not metric dimensions.

The evidence revision hashes the closed tuple of package revision, canonical
configuration digest and retained health generation. The existing final conditional
configure update establishes `health_generation` and `health_enabled_at` after
verified host readiness when enabling, changing enabled configuration or establishing
a missing epoch. An unchanged enabled configure preserves its epoch. Stop retains
it; explicit re-enable rotates it. Scans, failures and health reads never rotate
it. These are two scalars in the existing bounded installation extensions, with
no second State store. General source upgrades remain outside this release.

Disabled initial installation can have no epoch. Its successfully read logs and
coherent stopped controls permit disabled; epoch-dependent metrics are explicitly
not applicable. Enabled installation without a coherent epoch is unknown. Old
code/configuration/generation success cannot satisfy a current completion. A newer
relevant unbound failure remains visible and makes enabled health unknown; missing
identity does not prove that a failure belongs to another installation. Only
validated other identity or both log and completion timestamps before enablement
exclude it. The reader reacquires actual host and State after telemetry and rejects
changed evidence.

The read-only command has finite acquisition limits: 30 seconds overall, 10 seconds
per call, 10 log pages, 1,000 fetched records, 1 MiB decoded log bytes and five fixed
metric reads. Every fetched record counts, including historical or invalid records.
Empty pages with a continuation token continue within the same budget. Partial,
denied, invalid or changed evidence is unknown. Readable and JSON output name query
coverage, omissions and missing metric ingestion; no completion is fabricated.
CloudWatch alignment and ingestion delay have no promised real-time SLA.

See [health use and recovery](../manager-health.md) and the
[installation lifecycle](../manager-installation.md). Customer-owned deployed
acceptance, human acceptance and activation remain separate from source fixtures.
No health observation retries uncertain Jira operations or starts another scan.

## Capacity and the path to 50 projects

Ten projects is a benchmark step, not a product maximum. Fifty projects is the
explicit next capacity target. Project count alone is insufficient: publish a
tested envelope with active Epics, streams, current and retained members, pages,
request latency, rate-limit behavior, cadence and scan bounds. Version one makes
only measured claims; there is no promised 50-project support before evidence.

After the first working release, measure local deterministic fixtures at 1, 10,
25 and 50 projects, including the same label in each and uneven project sizes.
Use a reference workload of two active Epics, four streams and 100 tracked members
per project (50 projects = 200 streams and 5,000 members), with 25 eligible streams
per scan and configurable retained-history growth. Measure no-op, admission and
repair paths separately, p95 scan duration, request count, throttling responses,
memory and observed oldest unevaluated work. Run provider acceptance at separately
authorized modest volume; never stress-test Jira's public rate limits.

First optimize bounded queries and repeated reads without weakening complete-view
or fresh-read rules. If a single scan cannot fit the agreed envelope with headroom,
design disjoint project groups inside one installation. That later design must
resolve cross-project dependencies, fair scheduling, ownership transfer, failure
isolation and shared rate budgets before adding concurrency. Keep one configuration,
one deployment experience and one writer per project. Do not build this machinery
in the first release. The capacity Task delivers measured gaps and PR-sized follow-on
Stories for owner approval, not an automatic expansion of the MVP.

## Review and acceptance

Add cases for equal labels across projects, different mappings, key rename, project
move/removal, cross-project prerequisites, isolated versus shared read failure,
complete empty scans, business holds, failed/stale/unknown health, missing telemetry,
disabled/start/re-enable and safe capacity warnings. General upgrades, alarms and
SNS routing are deferred. Local fixtures do not prove installed AWS behavior. Installed acceptance covers both projects
and the health lifecycle with delivery automations inactive.

Author assessment: intuitive—one installation and familiar health states;
discoverable—readable/JSON output and direct evidence links; delightful—one config
and no per-board deployment; token saver—deterministic summaries without worker
polling; secure—customer-only logs, bounded metrics and read-only inspection;
agents are equal—structured states and stable identities; dependable—missing data
is explicit, work holds differ from failures, and no unmeasured scale claim.

Provider references checked 14 November 2026:
- [CloudWatch embedded metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html): extraction, permissions, cost and duplicate delivery.
- [Jira rate limits](https://developer.atlassian.com/cloud/jira/platform/rate-limiting/): respect provider budgets; capacity testing must not overload a tenant.
