# Pig Boss: company installation and operating health

14 November 2026. Owner-approved scope clarification and basic-health addition to
PGB-66. Proposed release behavior, not shipped functionality. This document
supersedes label-only identity and ambiguous monitoring exclusions in earlier
manager documents. The manager component is **Pig Boss**; the product is Pigboard.
Existing technical filenames and schema identifiers keep their names.

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

The portable application returns a versioned scan summary. The AWS wrapper writes
one sanitized completion event to the existing log group and emits CloudWatch
embedded metrics. No second operational database or worker ledger is introduced.
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
deployed schedule/configuration, current-revision summaries, metrics and alarms;
it never scans or transitions Jira or changes scheduling state. Report:

| Result | Meaning |
| --- | --- |
| disabled | Desired schedule is disabled and observed scheduler is stopped; no periodic success is expected. |
| starting | Enabled within the configured freshness window; no current-revision completion yet. |
| healthy | Latest scan is complete and fresh, with no capacity warning. Work holds are listed separately. |
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
   exists, or a current error/throttle alarm is active, while freshness has not expired.
6. **starting:** enabled within the freshness window, with no current-revision
   complete scan and none of the failure conditions above.
7. **healthy:** a fresh complete scan exists and none of the above applies.

The boundary uses `age > freshness`; equality is still within the window. Thus an
intentional stop with old success is disabled; expired success plus recent failure
is stale with the failure also reported; a failed first scan is degraded before
expiry and stale afterward. The CLI, JSON output and acceptance fixtures share this
ordered decision table. Provider alarm states are observations, not substitutes
for this health evaluation.

Report evidence timestamps, desired/actual schedule state, last complete and latest
attempt, scan duration, maximum budget utilization, held-work counts, alarm states
and direct AWS log/alarm links. Exit 0 for healthy or intentionally disabled, 1
for degraded/stale, and 2 for starting/unknown/invalid configuration; JSON always
includes the state so disabled cannot be mistaken for running. Never substitute
an older configuration's success. Permission failures are unknown, not disabled. Any desired/actual mismatch takes precedence over disabled or starting; a failed stop is degraded with exit 1. Confirm stopped/drained execution using the existing stop procedure before declaring a safe stop.

Canonical configuration owns schedule interval, scan budget, log retention, health
freshness and warning threshold, plus an optional existing customer SNS topic ARN.
Initial defaults: five-minute cadence, scan time budget below that cadence,
freshness three cadences, and warning at 80% of any configured scan bound. The
installer validates positive bounds and freshness longer than a full scan plus
cadence. Default values require installed acceptance; they are not capacity claims.

AWS packaging supplies alarms for missing successful scans, Lambda errors/throttles
and high scan-budget utilization. Completion metrics use a fixed installation
dimension and a current evidence revision; no ticket/stream dimensions. An evidence revision is generated from the deployed code/package revision and canonical configuration digest, including project scope, health settings and enablement generation. It is shared by summaries, command and alarms. Configuration-only changes rotate it too. Old
metrics cannot satisfy a new revision's alarm. Missing completion data breaches;
missing sparse error data does not. Use maximum values for presence/utilization,
not metric sums as exact run counts, because log-derived metrics can duplicate.
Alarm evaluation and ingestion delay are documented; the freshness command gives
the precise observed age, not a promised real-time SLA. An optional SNS action
uses customer-owned routing; without it the guide explicitly says console/command
only, no push alert. Subscription confirmation and notification delivery are
operator checks. No Teams integration, dashboard or incident-management service.

Install disabled with alarm actions disabled. Enable/stop/upgrade tooling derives
alarm action state from the same desired schedule setting; unexpected scheduler
disablement must not silence alarms. Intentional stop remains visible as disabled.
An upgrade starts a new evidence window and keeps unresolved scheduling state.
Removal reports retained logs/state and monitoring resources/costs; the existing
state retention rules do not change. Readiness rejects missing or mismatched health
resources before delivery is enabled. The operator guide explains each health
result, safe stop/diagnosis, credential/access repair, log retention and capacity.
No alarm automatically retries an uncertain Jira operation or starts another scan.

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
disabled/start/upgrade, alarm routing and safe capacity warnings. Local fixtures do
not prove installed AWS alarm delivery. Installed acceptance covers both projects
and the health lifecycle with delivery automations inactive.

Author assessment: intuitive—one installation and familiar health states;
discoverable—readable/JSON output and direct evidence links; delightful—one config
and no per-board deployment; token saver—deterministic summaries without worker
polling; secure—customer-only logs, bounded metrics and read-only inspection;
agents are equal—structured states and stable identities; dependable—missing data
is explicit, work holds differ from failures, and no unmeasured scale claim.

Provider references checked 14 November 2026:
- [CloudWatch embedded metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html): extraction, permissions, cost and duplicate delivery.
- [CloudWatch missing data](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html): missing-data evaluation can extend beyond nominal alarm periods.
- [Lambda metrics](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html): errors, throttles and duration are distinct signals.
- [Jira rate limits](https://developer.atlassian.com/cloud/jira/platform/rate-limiting/): respect provider budgets; capacity testing must not overload a tenant.
