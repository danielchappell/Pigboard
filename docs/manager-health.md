# Inspect manager health

This source command inspects the customer-owned Pig Boss installation.
Detailed scan summaries and completion health cover preview scans. The ordinary
apply sender retains basic sanitized invocation/result logs and native Lambda
metrics; it does not emit a preview scan summary or completion metric. This command
does not certify apply execution. Old preview evidence cannot satisfy a changed
apply configuration/enablement identity. It reads
binding, applied State, the existing log group and fixed CloudWatch metrics. It
performs no scan, Jira transition, State write or schedule change. Source fixtures
do not prove deployed AWS permissions, human acceptance or activation. Alarms and
SNS are deferred from this reduced release; no alarm state or push alert is implied.

Prepare the exact root and AWS dependencies outside a delivery run as described
in [installation](manager-installation.md). Use the canonical configuration, the
original/current verified installation receipt and an explicit operator profile:

```sh
node scripts/manager-health.mjs --config /absolute/config.json --installation /absolute/installation.json --operator-profile customer-operator
node scripts/manager-health.mjs --config /absolute/config.json --installation /absolute/installation.json --operator-profile customer-operator --json
```

The selected profile is verified against the configured account and operator role.
There is no ambient credential fallback or target/namespace override. Unknown or
repeated flags are invalid. JSON carries the same state, timestamps, observations,
links, omissions and next step as readable output. Exit codes are 0 for healthy or
disabled, 1 for degraded or stale, and 2 for starting, unknown or invalid input.

| State | Meaning and next step |
| --- | --- |
| unknown | A required read failed, evidence is invalid/unbound or host/State changed during inspection. Check access, configuration and logs for this same installation. |
| degraded | Desired and actual schedule differ, the latest current attempt failed/incomplete, or a configured budget reached the warning threshold. Inspect the listed reason. |
| disabled | Desired and observed schedules are stopped. Use the existing stop procedure to confirm stopped execution; retained work is not drained. |
| stale | No current completion within freshness. Inspect schedule and logs; a recent failure does not restart the clock. |
| starting | Enabled within freshness without a current completion. Allow telemetry ingestion and inspect again; this command never launches a scan. |
| healthy | A fresh current completion exists without an earlier condition. Work holds remain separate. |

Evaluation order is unknown, schedule mismatch, disabled, stale, current degraded,
starting, healthy. Age equal to freshness is still within the window. A failed
first scan is degraded before expiry and stale afterward. A recent failure with
an expired success remains stale and retains the failure as a secondary reason.
Unreadable telemetry wins even when scheduling is disabled.

The output includes current package/configuration/generation identity, desired,
observed and applied controls, observation and query timestamps, latest complete
and latest attempt, latest failure (including relevant unbound failures), maximum
budget utilization, count completeness, held work, direct AWS logs/metrics/function/
schedule links and a safe next step. Query absence means absent within the reported
window, not never ran. Ignored historical records are counted. Missing metrics
may reflect ingestion delay; they never supply fabricated completion or an SLA.
Worker health is always `not_observed`; selected work counts are policy proposals,
not admissions or Cursor launches.

Every finished valid preview invocation emits one `pigboard-scan-summary/v1`
record. It contains scan and installation IDs; package, canonical configuration,
health generation and evidence revision; start/end; mode; complete/incomplete/failed
result; project/stream/issue, Jira request/page and selected/held counts; count
completeness; elapsed time; configured bounds; measured budget ratios; fixed State
safeguards; maximum utilization; safe reason codes and bounded project counts.
Unavailable fields are null. Missing optional request peaks are `not_observed`,
never zero or proof of spare capacity. A hard crash emits no completion.

Complete means required reads and decisions finished. Empty work, a five-ticket
Human Review wait and retained uncertain work can be complete with separate holds.
Denied reads, missing pages and exhausted acquisition are incomplete; setup or
infrastructure exceptions are failed. Summary fields never contain ticket bodies,
secrets or raw provider messages. At most 100 projects, 64 distinct reason codes
and 64 KiB sanitized summary are allowed; omitted detail is explicit/incomplete.

Budget utilization compares measured requests, combined search/comment pages,
Epics, streams, known issues, comments, total response/observation bytes, maximum
single response bytes, maximum single request time, scan time and invocation time
with their corresponding limits. The maximum ratio drives warnings (80% by default,
including exactly 80%). `page_size` is a batch size, not a capacity threshold.
Unobserved metrics stay null. A warning is a diagnosis prompt, not an instruction
to weaken bounds or a guarantee that the installation can scale.

Metrics use namespace `Pigboard/Manager`, exactly `InstallationId` plus
`EvidenceRevision`, and Maximum statistics. CompletePresence is emitted only for
complete scans; AttemptPresence for finished scans; FailurePresence for incomplete/
failed scans; DurationMilliseconds and measured MaximumBudgetUtilization accompany
them. Duplicate events/points do not inflate an exact run count. Ticket, project
and stream identities are bounded log fields only.

Evidence hashes package revision, canonical configuration digest and the retained
enablement generation. The real configure lifecycle produces the generation after
host readiness; normal scans/readers never refresh it. Old revision success cannot
satisfy current health. Initial disabled installation can have no epoch: logs still
must be readable, and epoch metric reads are explicitly not applicable. A newer
relevant failure lacking epoch remains visible and makes enabled health unknown.
The reader reacquires both actual host and retained State to reject mixed evidence.

The command allows 30 seconds overall, 10 seconds per call, 10 log pages, 1,000
fetched records and 1 MiB decoded logs. Historical and invalid records count toward
the same limits. Empty pages with continuation tokens do not mean completion.
Five fixed metric reads use periods bounded to 1,440 points. Failed/partial reads,
invalid or future points and contradictory duplicate scan records yield unknown.

The additive operator policy grants `logs:FilterLogEvents` only for this physical
log group and `cloudwatch:GetMetricStatistics` with Resource `*` restricted to the
configured region. AWS does not resource-scope this metric action to installation
dimensions; fixed namespace/dimensions are enforced by this command. The operator
retains its existing lifecycle powers. “Read-only health” describes the command
and its additive grants. Runtime keeps existing log writes and needs no metric
write client or permission.

For uncertainty, inspect the same installation and original pending attempt. An
existing authorized stop remains a separate command. Never replay an uncertain
mutation to make a health result green. Repair access or config only within your
existing authority, then perform a new inspection; health does not repair anything.

The finite developer fixture packet is:

```sh
node scripts/test-manager-health.mjs --case R1-22-H01 --output /tmp/new-health-h01
node scripts/test-manager-health.mjs --all --output /tmp/new-health-evidence
```

It accepts only the four existing H01–H04 IDs and a new output directory, uses
simulated providers/dummy credentials, preserves partial results and closes local
fixtures. Local PASS remains distinct from the four human assessments, which stay
NOT_RUN until performed. Keep evidence, then remove disposable fixture output.
