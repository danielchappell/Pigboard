# Inspect manager health

This source command inspects the customer-owned Pig Boss installation.
Detailed summaries cover preview and ordinary apply processing in this source
revision. Apply completion requires complete acquisition and policy evaluation;
a selected admission also requires complete recheck and confirmed finalization.
This is source capability: an older installed package must not be assumed to emit
apply summaries. Installing, deploying and activating remain separate authorized
actions. The command reports the verified applied mode and reads
binding, applied State, the existing log group and fixed CloudWatch metrics. It
performs no scan, Jira transition, State write or schedule change. Alarm-capable
lifecycle packages also show the four CloudWatch alarms and their console links.
This source check leaves installed AWS permissions, human acceptance and
activation to their respective acceptance steps.

Prepare the exact root and AWS dependencies outside a delivery run as described
in [installation](manager-installation.md). Use the canonical configuration, the
current verified installation receipt and an explicit operator profile. On a
new alarm-capable installation, complete the disabled bootstrap before using
the command for readiness.

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
| unknown | A required read failed, evidence is invalid, a lifecycle operation is pending, or the host or State changed during inspection. Check access, configuration and the original operation on this installation. |
| degraded | The host or an alarm differs from the expected controls, the latest attempt failed or was incomplete, or measured budget use reached the warning threshold. Inspect the listed reason. |
| disabled | Effective intent and the observed schedule agree that scheduled work is off. For a full drain, use the installation stop procedure. |
| stale | No current completion within freshness. Inspect schedule and logs; a recent failure does not restart the clock. |
| starting | Enabled within freshness without a current completion. Allow telemetry ingestion and inspect again; this command never launches a scan. |
| healthy | A fresh current completion exists without an earlier condition. Work holds remain separate. |

Evaluation order is unknown, confirmed control or alarm mismatch, disabled, stale, current degraded,
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

## Inspect the four alarms

Open the console links in the health or stack outputs to inspect the four signals.

| Alarm | Signal |
| --- | --- |
| Missing completion | A complete scan is absent for the required consecutive periods after startup grace. Grace includes the freshness deadline. Duplicate completions count as presence for the period. |
| Lambda errors | At least one Lambda error in a minute, including during startup. |
| Lambda throttles | At least one Lambda throttle in a minute, including during startup. |
| Measured budget | The current manager metric reaches the configured warning percentage during one schedule period. With no sample, budget use is unobserved. |

The output gives the requested schedule, the effective intent recorded in
protected State, and the actual Scheduler state. After a compatible upgrade,
`UPGRADE_MAINTENANCE` explains why scheduling and actions are off even if the
configuration still requests scheduling. A Scheduler stop during scheduled
operation appears as a mismatch. Inspect the named alarms and the schedule
before deciding whether to restore service via the installation commands.
Manual writes-only mode leaves all four actions disabled and the two custom
definitions dormant while allowing authorized manual work. Intentional disable
turns off alarm actions.

In JSON, `alarm_evidence` reports the physical stack and function, observation
interval, expected and actual definitions, action state, raw CloudWatch state,
and a link for each alarm. `stable_host_and_state` says whether the host and
protected State matched at both ends of that inspection. Definition alignment
and evaluation are separate fields. A raw `ALARM`, `OK`, or
`INSUFFICIENT_DATA` can persist after the definition is replaced. The reader
reports that provider state and its timestamp with current evaluation marked
unverified. The two custom alarms report `dormant` when scheduling is
intentionally off and their dormant definitions are verified. A retained epoch
without matching current scheduled intent has unknown revision attribution.
Health can show an earlier valid log
separately under `latest_historical_scan`.

If the final host or State read changes or fails, health returns `unknown`
with exit code 2. Current binding, scan and budget fields are unverified.
The report still shows the raw alarm states, observed actions, timestamps and
named definitions it received. Prior scan samples, budget measurements and
the initially observed binding appear as earlier observations in the terminal
and under `prior_observation` in JSON. Their attribution to the current
installation is unverified. Check the current receipt and the operator's read
access, then inspect the same installation again.

All four alarms are console-only. The destination lists are empty. Alarm
observations leave retries, uncertain Jira effects and capacity under their
existing controls. When a read is denied, check the named CloudWatch grants in
the generated template. Retain any available evidence and inspect again using
the same receipt. See [permissions and lifecycle recovery](manager-installation.md#cloudwatch-alarm-permissions-and-settings).

Every finished valid preview or apply invocation constructs one
`pigboard-scan-summary/v1` summary and attempts one health record. Apply output
failures are contained and may leave no record. It contains scan and installation IDs; package, canonical configuration,
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

Apply scope counts describe observed policy input and proposals. They do not count
actual Jira mutations; the original runtime result retains those effects separately.
Invocation-wide Jira request/page/byte/time, writer and State consumption are not
collected, so those workload totals and ratios stay null/`not_observed`. Measured
invocation duration remains available. One acquisition pass never represents both
passes or all invocation work. Newly uncertain writes, failed proof capture or
unconfirmed finalization are incomplete even when some effects succeeded. A
pre-existing pending uncertain attempt safely held can be complete processing;
it remains unresolved. One admitted scope cannot conceal another incomplete scope.
Health or timing output failure preserves the admission outcome without replay;
missing telemetry can consequently produce starting or stale health.

For preview, budget utilization compares measured requests, combined search/comment pages,
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
satisfy current health. Mode and retained enabled time must also match; old preview
evidence cannot satisfy current apply completion. The reader queries current
manager metrics on an alarm-capable package only with a verified scheduled
intent and matching epoch. Logs remain required on intentionally inactive
packages, which report null current epoch and evidence revision. A newer
relevant failure lacking epoch remains visible and makes enabled health unknown.
The reader reacquires both actual host and retained State to reject mixed evidence.

The command allows 30 seconds overall, 10 seconds per call, 10 log pages, 1,000
fetched records and 1 MiB decoded logs. Historical and invalid records count toward
the same limits. Empty pages with continuation tokens do not mean completion.
The reader uses one named alarm request and up to five fixed metric requests,
each bounded to 1,440 metric points. Failed or partial reads,
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

For the additive apply cases, use one selector at a time:

```sh
node scripts/test-manager-health.mjs --case HEALTH-A-H01 --output /tmp/new-apply-health-h01
node scripts/test-manager-health.mjs --case HEALTH-A-H02 --output /tmp/new-apply-health-h02
node scripts/test-manager-health.mjs --case HEALTH-A-H03 --output /tmp/new-apply-health-h03
node scripts/test-manager-health.mjs --case HEALTH-A-H04 --output /tmp/new-apply-health-h04
```

H01 covers admission, empty work, holds and mixed scope coverage, including actual
text/JSON reader output. H02 covers denied acquisition, timeout, new uncertainty,
finalization and missing binding. H03 covers mode/identity and freshness. H04
exercises the production root JSON emitter, failed output and denied/changed reads.
Each uses disposable loopback TLS/DynamoDB/AWS fixtures, never a live customer.
`--all` retains the original preview packet; it does not rerun the apply groups.

It accepts the four existing R1-22-H01–H04 and four HEALTH-A-H01–H04 IDs and a new output directory, uses
simulated providers/dummy credentials, preserves partial results and closes local
fixtures. Local PASS remains distinct from the four human assessments, which stay
NOT_RUN until performed. Keep evidence, then remove disposable fixture output.

For alarm-capable packages, run the controlled signal and operation cases with
prepared Node 24 and a new output directory for each:

```sh
node scripts/test-aws-manager.mjs --case R1-23-H01 --output /tmp/new-alarms-h01
node scripts/test-aws-manager.mjs --case R1-23-H02 --output /tmp/new-alarms-h02
```

These cases cover generated alarm definitions, controlled signal timestamps,
direct adoption, interrupted operations and removal using simulated providers.
Retain the reports with their tested revision for human review. The reports
separate simulated observations from installed AWS evaluation and permissions.
