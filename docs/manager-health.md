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
If the applied configuration names an SNS topic, the verified operator reads the
attributes of that one topic.
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
| unknown | A required read failed, evidence is invalid, a lifecycle operation is pending, or the host or State changed during inspection. Check the reason code and follow the recovery action. |
| degraded | A host control, alarm definition or routing check found a mismatch, the latest attempt failed or was incomplete, or measured budget use reached the warning threshold. Inspect the listed reason. |
| disabled | Effective intent and the observed schedule agree that scheduled work is off. For a full drain, use the installation stop procedure. |
| stale | No current completion within freshness. Inspect schedule and logs; a recent failure does not restart the clock. |
| starting | Enabled within freshness without a current completion. Allow telemetry ingestion and inspect again; this command never launches a scan. |
| healthy | A fresh current completion exists without an earlier condition. Work holds remain separate. |

Evaluation order is unknown, confirmed control, alarm or routing mismatch, disabled, stale, current degraded,
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

Both formats report the physical stack and function, observation interval,
expected and observed ALARM, OK and INSUFFICIENT_DATA destination lists, action
state, raw CloudWatch state and a console link for each alarm. An empty list is
shown as `[]`. An unavailable observation is `unknown` in readable output and
`null` in JSON. JSON also carries the full definitions in `alarm_evidence`.
`stable_host_and_state` says whether the host and protected State matched at both
ends of that inspection. The same snapshot reports `operator_account_id` from the
verified session, `operator_role_arn` after matching that session to the canonical
IAM role, and `table_id` from the physical State table. Definition alignment
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
and under `prior_observation` in JSON. The current operator account, role and table
ID fields are null. Any earlier values are under
`prior_observation.alarm_diagnostics` with unverified attribution. Check the current receipt and the operator's read
access, then inspect the same installation again.

## Check SNS routing

With `manager.health.sns_topic_arn` omitted, all four alarms are console-only and
their expected destination lists are empty. With a topic configured, all four
ALARM lists should contain its exact ARN. OK and INSUFFICIENT_DATA lists remain
empty. Intentional disablement suppresses actions and preserves the configured
destination. When a CloudWatch read is denied, check the named alarm grants in
the generated template and inspect again with the same receipt.

The routing result is in `alarm_evidence.topic_routing` in JSON and under
**Notification routing** in readable output. It shows the expected ARN, observed
ARN when available, reason code and recovery action. A verified result means the
four destinations and the recognized topic publication policy agree at the time
of inspection. A known missing or wrong destination or an incompatible policy
is `misconfigured`. Denied or incomplete reads and topic policies the command
cannot evaluate are `unknown`. If the closing host or State observation changes
or fails, the route is `unknown` and the earlier observation is retained with its
timestamp and unverified attribution.

Ask the topic owner to confirm that the intended subscriptions are active, that
CloudWatch has the applicable KMS key permissions for encrypted delivery, and
that the intended subscribers receive a real notification. The reader inspects
one topic and keeps only the attributed verdict in its report. See the customer
policy example, access setup and recovery steps in the [installation guide](manager-installation.md#cloudwatch-alarm-permissions-and-settings).

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
The reader uses one named alarm request, one SNS attributes request when
configured, and up to five fixed metric requests,
each bounded to 1,440 metric points. Failed or partial reads,
invalid or future points and contradictory duplicate scan records yield unknown.

The additive operator policy grants `logs:FilterLogEvents` only for this physical
log group and `cloudwatch:GetMetricStatistics` with Resource `*` restricted to the
configured region. AWS does not resource-scope this metric action to installation
dimensions; fixed namespace/dimensions are enforced by this command. The operator
retains its existing lifecycle powers. “Read-only health” describes the command
and its additive grants. Runtime keeps existing log writes and needs no metric
write client or permission.

## Restore inactive readiness after an unhealthy observation

1. **Inspect the same installation.** Run the readable and JSON health commands
   above with the canonical configuration, verified receipt and prepared operator
   profile. Keep both outputs. Follow the generated AWS links for the named
   alarms, logs, metrics, Lambda and Scheduler. Check the account, Region, stack,
   function, table ID and generation. Compare requested configuration, protected
   intent, actual schedule and applied controls. Read each alarm's raw state and
   timestamp alongside its definition verdict and the observation interval.
2. **Protect admission when stopping is authorized.** Use the active configuration
   and its current successful receipt. A protective stop may confirm the State
   fence, disabled schedule and zero reserved concurrency while leaving drain
   proof unconfirmed. It preserves external detection while intent is still
   scheduled. Record the operation UUID, actual fence and host checks, action
   observations, proof, pending work and any unknown effect. Keep a partial result
   even if a fence succeeded. A Jira request already sent or a Cursor worker
   already started may continue.
3. **Diagnose from the saved pre-stop observation.** Compare `CompletePresence`
   against cadence and freshness for the reported evidence revision. Check the
   native sparse Lambda Errors and Throttles metrics for the same function.
   CloudWatch ingestion and evaluation can lag the log and the current alarm
   definition. Use the scan's measured numerator, configured bound, unit and
   interval if supplied. In the H04 preview, a complete scan used 80 Jira
   requests against a bound of 100 during the saved scan's start/end interval.
   That is 80%, equal to the configured warning threshold, so health is
   `degraded` with exit 1 even with a fresh complete scan. Use
   `latest_complete.budgets.requests` and the scan's timestamps in JSON to verify
   the example. Keep missing measures unobserved. Measured usage describes that
   workload and its bounds only.
4. **Resolve the recorded prerequisite.** Keep one manager at its supported
   concurrency. Do not raise reserved concurrency or run a second manager for
   this installation. Do not replay an uncertain Jira write. Inspect the original
   attempt and preserve retained holds. Use read-only State inspection with the
   currently verified configuration and receipt for this installation and the
   sender's `apply.attempt_id` after the `attempt:` prefix. For an interrupted
   lifecycle operation, supply the recorded operation UUID and the original inputs
   matching that operation. Follow the [installation recovery procedure](manager-installation.md#upgrade-the-same-installation)
   for the operation and use the verified operator profile for either inspection.
   A denied read, new operation owner or unconfirmed effect calls for the named
   access or operation recovery procedure. Avoid reinitializing State or repeating
   an uncertain request.
5. **Configure inactive maintenance and verify drain.** After resolving any
   operation that still owns the host, use the current verified receipt to
   configure the same source and installation generation with schedule and writes
   off and maintenance on. Prepare its exact versioned asset and preserve
   package lineage as described in [verify drain](manager-installation.md#verify-drain-on-a-lifecycle-installation).
   Run strict stop using the returned successful receipt. Confirm the disabled
   schedule, zero reserved concurrency, matching physical resources, the measured
   drain interval and verified proof. Record the State fence and verify the four
   alarm actions are off. Preserve retained work and any unconfirmed result.
6. **Save and compare.** Rerun health with the maintenance configuration and
   successful receipt. Save the stable `disabled` result with the current epoch
   cleared and any retained epoch or earlier scan recorded as history. Confirm
   the two dormant definitions and all four disabled actions. Use that config,
   receipt and saved health with the matching source and skill receipt in
   [offline readiness](release-readiness.md#run-the-local-comparison). Keep the
   package and health verdicts, aggregate exit and independent outstanding layers.
   For console-only routing, use the console or CLI. For a configured topic, check
   all four exact ALARM destinations and follow the [customer delivery checks](#check-sns-routing).
   Inactive readiness ends here. Any later enablement requires separate operator
   authority.

Use these commands from the prepared checkout. Save each result with its exit
code. Resolve any held operation or unconfirmed prerequisite before moving from
the initial stop to configure. Use a fresh output path for the receipt.

```sh
node scripts/manager-installation.mjs stop --config active.json --installation current-receipt.json --operator-profile customer-operator --json
node scripts/manager-installation.mjs configure --config maintenance.json --installation current-receipt.json --manifest maintenance-package/manifest.json --asset maintenance-asset.json --operator-profile customer-operator --deployer-profile customer-deployer --output maintenance-receipt.json --json
node scripts/manager-installation.mjs stop --config maintenance.json --installation maintenance-receipt.json --operator-profile customer-operator --json
node scripts/manager-health.mjs --config maintenance.json --installation maintenance-receipt.json --operator-profile customer-operator --json
```

For ordinary State inspection, use the currently verified configuration and
receipt for this installation with the original `attempt:ORIGINAL_ATTEMPT_UUID`.
See [Jira evidence for one pending attempt](manager-state.md#inspect-jira-evidence-for-one-pending-attempt)
when you also need the current applied receipt and historical sending receipt.
For lifecycle inspection, use the recorded operation UUID and the original inputs
matching that operation. The example shows the operation's original configuration
and receipt. The [installation recovery procedure](manager-installation.md#upgrade-the-same-installation)
gives the inputs for a restricted successor.

```sh
node scripts/manager-state.mjs inspect --config current-config.json --installation current-receipt.json --operator-profile customer-operator --kind attempt --record-id attempt:ORIGINAL_ATTEMPT_UUID --json
node scripts/manager-installation.mjs inspect-operation --config original.json --installation original-receipt.json --operator-profile customer-operator --operation ORIGINAL_UUID --json
```

## Review retained resources and costs

Use the original [removal preview and result](manager-installation.md#remove-and-recover).
For each preview row, compare its logical name and physical identity against
the result. Verify the original State table ID and ARN as well as its retained
status. Keep the terminal report and its original status. If later inspection
returned a separate `current_observation`, record its timestamp, match it to
the same preview and removal UUID, and state what that observation established.
Keep partial removal marked partial even when individual deletions are verified.

| Preview row | Evidence and possible ongoing charges |
| --- | --- |
| AsyncInvocation, Function, LifecycleSchedule, RuntimeRole, SchedulerRole | Record each physical identity and whether its deletion was verified or is unobservable. |
| LogGroup | Check its disposition in the deployed preview and the result. The generated template requests deletion. Retained logs can incur storage charges. |
| StateTable | Verify the exact original physical ID and ARN. A retained table can incur DynamoDB charges. Record an unreadable or mismatched table as unobservable and protect the original State. |
| MissingCompletionAlarm, LambdaErrorsAlarm, LambdaThrottlesAlarm, MeasuredBudgetAlarm | Check each named alarm individually. Unconfirmed deletion can leave a continuing CloudWatch charge. |
| Customer-owned Secrets Manager secrets, versioned artifacts and IAM roles | Mark each resource that appears in the preview as external. Secrets and stored artifact versions may continue to incur charges. |
| Customer-owned SNS topic and subscriptions, when configured | Record the exact topic ARN as external. The topic and subscriptions remain customer-managed and may incur charges. |

Record a cost amount and unit only when the preview supplies them. For an
unobservable row, use read-only inspection of the original removal operation.

```sh
node scripts/manager-installation.mjs inspect-operation --config maintenance.json --installation maintenance-receipt.json --operation ORIGINAL_REMOVAL_UUID --operator-profile customer-operator --json
```

For the H04 walkthrough, use the retained H02 complete and partial removal
branches and the H03-C configured-topic removal evidence supplied with the
exercise. Match every row and original table. In the partial observations,
missing deletion proof for `MeasuredBudgetAlarm` leaves possible CloudWatch
cost. H03-C also identifies the external SNS topic. Retain the original revisions
and digests with your comparison. The walkthrough uses saved removal evidence
and sends zero deletion requests.

### R1-23-H04 operator walkthrough

Use a disposable fixture from a clean checkout at the reviewed revision, with
prepared Node 24 dependencies and the external skill receipt for that revision.

```sh
node scripts/test-aws-manager.mjs --case R1-23-H04 \
  --output /absolute/private/NEW-alarms-h04 \
  --release /absolute/private/skill-receipt.json
```

Follow the steps above with the generated unhealthy outputs and saved removal
inventory. Check the supported commands with their `--help` output open.
For the concurrency and replay questions, record the guide's refusal and the
supported inspection route. These are decisions about the documented commands.
The fixture has no pending attempt. Keep unchanged State and provider audit
evidence for those decisions. Read and retain the final inactive offline result
along with the pre-stop measurement, both stop results and the matching receipt.

Retain the tested revision, exact argv, sanitized reports, original removal
evidence references and cleanup record, then remove the owned disposable fixture
and build outputs. Record fresh human execution and deployed notification
delivery independently from the simulated walkthrough.

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
node scripts/test-aws-manager.mjs --case R1-23-H03-C --output /tmp/new-alarms-h03-c
```

These cases cover generated alarm definitions, controlled signal timestamps,
direct adoption, interrupted operations, removal and routing with absent,
permitted, and denied or misconfigured topics using simulated providers.
Retain the reports with their tested revision for human review. The reports
separate simulated observations from installed AWS evaluation and permissions.
