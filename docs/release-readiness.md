# Check Pig Boss release evidence

The readiness command compares a pinned external skill release, the canonical
customer configuration and saved observations. It explains what agrees, what
conflicts and what remains unverified. It never enables an automation. Its strongest
result is **compatible supplied evidence**, with the evidence's origin and limits
still visible. It does not authenticate or refresh hosted observations.

## Prepare and refresh explicitly

Use Node 20+, Git and the clean source checkout at the full approved revision.
Prepare its root dependencies before this run. Keep the application checkout,
setup checkout and external release cache separate. Follow the
[installation guide](install.md) for the exact preparation and recovery commands.
For example, replace these dummy paths and the revision before running:

```sh
node /absolute/pigboard-setup/scripts/prepare-pigboard-skills.mjs \
  --source https://github.com/danielchappell/Pigboard.git \
  --ref APPROVED_40_CHARACTER_COMMIT \
  --cache /absolute/private/pigboard-releases \
  --app /absolute/application
```

Retain the printed JSON receipt privately. It contains `commit`, `release`,
`skills` and `manifest`; the last three are absolute paths. Preparation builds the
complete allowlisted bundle and its dependencies. To verify it and select a stable
skill link explicitly, use the existing installer instead:

```sh
node /absolute/pigboard-setup/scripts/install-cursor-skills.mjs \
  --source https://github.com/danielchappell/Pigboard.git \
  --ref APPROVED_40_CHARACTER_COMMIT \
  --app /absolute/application \
  --root /absolute/private/pigboard
```

The installer adds `stableSkills` and `verification`. Retain all twenty-two complete
skill folders, their sibling references, validator payload and locked dependencies.
Readiness reuses the existing verifier and its eight smoke checks, including the
nonexecuting repair preview. That preview does not activate deferred repair work.
The verifier runs prepared local dependency code and creates/removes disposable
local smoke inputs. It does not install missing dependencies.

For Cursor, refresh the approved pin in the environment's Install Script and run
an explicit Build. Inspect the actual receipt and select the successful Build.
Preserve the prior selection if preparation or verification fails. A selected
Build and an enabled delivery automation are separate settings. Never put refresh,
credential discovery or setup repair in a worker prompt or Start Script.

## Run the local comparison

Use the same approved revision for source, skills, manager package and saved
installation/health evidence. The canonical configuration owns project mappings;
the [configuration guide](configuration.md) explains its schema and native IDs.

```sh
node /absolute/pigboard-setup/scripts/check-readiness.mjs \
  --config /absolute/private/customer.json \
  --release /absolute/private/skill-receipt.json \
  --revision APPROVED_40_CHARACTER_COMMIT \
  --package-manifest /absolute/private/manager-manifest.json \
  --installation /absolute/private/installation-receipt.json \
  --health /absolute/private/saved-health.json \
  --observations /absolute/private/saved-observations.json \
  --json
```

Omit `--json` for readable output. `--help` alone displays usage. Supply absolute
paths and a lowercase forty-character commit. Required inputs are configuration,
skill receipt and revision. Omitted optional evidence is UNVERIFIED; an explicitly
supplied unreadable or malformed file is an ERROR. Each JSON input is limited to
1 MiB, with depth at most 16 and at most 1,000 items per array. A v2 lifecycle
package manifest can be up to 4 MiB. A v2 installation receipt can be up to 8 MiB,
including an embedded manifest that still has a 4 MiB limit. The embedded limit
applies even with an explicit manifest. These limits also apply when the receipt
is the only source of the manifest. The verifier uses its own format for the
skill-release catalogue.

| Exit | Meaning | Next action |
| --- | --- | --- |
| 0 | All required local and supplied comparisons passed | Retain the exact report; inspect remaining human/live/activation layers. |
| 1, incompatible | A definite comparison failed | Correct the named evidence or setup through its owning process. |
| 1, unverified | Required evidence is absent or incomplete | Supply the missing observation; keep unexecuted behavior unverified. |
| 2 | Input, prepared-runtime or unexpected checker error | Correct that prerequisite; preserve independent completed results. |

A dirty source checkout or mismatched source/receipt pin cannot claim complete
release verification. Independent configuration, active-flag and absence results
remain visible. The checker neither fetches dependencies nor calls AWS, Jira or
Cursor. It does not invoke workers, scan, configure, disable hosted rules or retry
an uncertain action.

## Inspect the inactive setup

`inactive_setup.kind` is `local_inactive_projection`. This report output comes
from the canonical configuration; it is not a provider import or another authored
configuration. Every configured project shows its native Story and Bug IDs,
actors, repositories, opt-in label, worker prefixes and these ordinary routes:

| Entry stage | Worker | Successful handoff |
| --- | --- | --- |
| In Progress | implementer | In Review |
| In Review | reviewer | QA |
| QA | qa | Human Review |

Each observed full label must match its configured prefix followed by digits.
Stream identity is `[Jira site, immutable project ID, full label]`; the same
`AI-Daniel-1` label in two projects identifies two streams. Each observed stream
needs implementer, reviewer and QA rows for that same full label and project.
Missing roles remain unverified for that stream; a wholly absent configured
project remains unverified too. Supply the complete saved inactive setup for each
observed label. All saved Jira-rule
and Cursor-automation flags must be false. A true flag fails; an absent flag
remains unverified. The checker reports it without changing a hosted setting.
Historical Story-only exports in [Jira setup](jira-setup.md) do not prepare current
Story/Bug routing. No automatic repair/Blocked/Rework Queued trigger is generated
for this ordinary journey. Ordinary failures stop locally with findings and
receipts retained; deferred automatic repair is not a fallback.

## Verify the three worker setups

Copy these prompt files verbatim. Keep scope, tools, receipts and model controls
in trusted setup; avoid adding operational instructions to the prompts.

Implementer ([source](../config/cursor/implementer-prompt.txt)):

```text
Complete the provided Jira ticket in the codebase specified by that ticket, following /opt/pigboard/skills/implementer-entrypoint/SKILL.md.
```

Reviewer ([source](../config/cursor/pr-review-prompt.txt)):

```text
Review the open pull request for the provided Jira ticket in the codebase specified by that ticket, following /opt/pigboard/skills/pigboard-pr-review/SKILL.md.
```

QA ([source](../config/cursor/qa-prompt.txt)):

```text
Execute QA for the provided Jira ticket on its current open pull request, following /opt/pigboard/skills/qa-entrypoint/SKILL.md.
```

| Profile | Required setup |
| --- | --- |
| [Implementer](../skills/implementer-entrypoint/references/cursor.md) | Grok High parent/planning; one fresh High plan reviewer; Medium execution; Fast off. Accepted Task bindings are `generalPurpose`, `grok-4.7-high` review / `grok-4.7-medium` execution, `same_machine`, foreground, with a fresh independent review context. |
| [Reviewer](../skills/pigboard-pr-review/references/cursor.md) | Separate independent configured latest available Grok High, Fast off; actual approval actor, complete comparison/comments/CI and authorized handoff capabilities. |
| [QA](../skills/qa-entrypoint/references/cursor.md) | Separate configured latest available Grok High, Fast off; same-release helpers and actual prepared access/clock only where the prescribed cases need them. |

Retain the actual accepted dispatch/agent IDs, setup selection and capability
evidence. A matching model name or child's self-description does not establish
capabilities. Where the harness returns no per-call model/effort, record
`not_returned`; preserve accepted explicit binding plus its setup evidence. Any
conflicting returned metadata fails the comparison. Latest availability is not
reobserved by this local checker. A changed model/version/runner needs renewed
setup acceptance through the owning profile.

Prepare finite CI waits with deadlines, current receipt/revision reads and private
reviewer-accessible evidence. QA runtime cases need their actual prepared helpers,
target and bounded clock controls. Human-only zero-AI work needs no invented
deployment, helper execution or clock. Do not discover credentials or repair setup
inside delivery. Missing prerequisites stop locally and retain completed work.

## Describe saved evidence

The [manager installation guide](manager-installation.md) explains how to obtain
the package manifest and successful installation receipt. Use the matching pair
for your revision.

| Package | Manifest and successful receipt |
| --- | --- |
| Legacy v1 | `pigboard-manager-package/v1` and `pigboard-installation-receipt/v1` |
| Lifecycle v2 | `pigboard-manager-package/v2` and `pigboard-installation-receipt/v2` |

You can omit `--package-manifest` to use the manifest embedded in the receipt.
When you supply both, they must agree. The manifest's source revision and the
receipt's package revision must equal `--revision`. Use the complete saved
manifest including dependency, payload and, for v2, zip digests. A confirmed
package comparison covers the declared metadata. Verifying deployed Lambda bytes
belongs to installation.

The checker compares the six core resources and canonical binding. For v2 it
also compares the protected origin, original physical table ID and role. An
upgrade can legitimately have a different birth revision. The ready-to-review
controls have schedule and writes off. Maintenance is allowed. A partial result
or recovery-only receipt cannot establish a successful installation. Use any
recovery result with its own installation procedure and preserve the original
receipt and operation ID.

Save an authorized observation from the same installation and revision. The
[health command](manager-health.md) reads the provider. Readiness uses its
complete JSON output without invoking it.

```sh
node /absolute/pigboard-setup/scripts/manager-health.mjs \
  --config /absolute/private/customer.json \
  --installation /absolute/private/installation-receipt.json \
  --operator-profile PREPARED_PROFILE --json
```

A matching inactive snapshot reports `disabled` with health exit 0, inactive
applied controls, zero writes and `worker_health: not_observed`. For an
alarm-capable package, check that the stable closing observation matches the
installation's stack, function, region, generation, physical table ID and verified
operator account and role. The saved intent is `disabled` or
`upgrade-maintenance`, with zero reserved concurrency. The four saved alarm
identities, normalized definitions and destination lists must match the generated
inactive definitions. All actions are disabled. The two custom alarms use dormant
definitions. Raw CloudWatch state and its timestamp can reflect earlier
evaluation. Earlier observations from a failed closing read have unverified
attribution.

With no configured SNS topic, all three destination lists per alarm are empty.
Use the console and CLI for inspection. With a configured topic,
each alarm has the exact same ALARM ARN and empty OK and INSUFFICIENT_DATA lists.
Look for separate confirmation of the alarm reads, the topic read and their
combined routing. Confirm subscriptions, any encryption permissions and actual
notification receipt through [customer delivery acceptance](manager-health.md#check-sns-routing).

The saved `observed_at`, query `start`/`end` and retained `health_enabled_at` must
be canonical ISO timestamps, such as `2026-11-16T12:00:00.000Z`. The query starts
before it ends, and its end equals `observed_at`. Retained enablement must be no
later than that saved observation; it may predate the query. Readiness checks
these saved relationships without deriving a lookback or using today's clock.
For the quartet, the alarm read begins at or after that query end. The saved
alarm observation, topic observation and end of the alarm interval follow in
that order. Equal timestamps are allowed for those boundaries.
Coverage must be complete, with integer `pages` from 1 through 10,
`fetched_events` from 0 through 1000 and `decoded_bytes` from 0 through 1048576.
Zero events require zero bytes; positive events require at least one byte per
event. `last_complete_absence` must be `within_query_window_only`: absence is
bounded to the saved query window. The checker does not reconstruct logs or
certify their exact byte totals.

A fresh disabled installation has explicit null health generation, enabled time
and evidence revision. The metric status is `not_applicable` with `Maximum`
statistics and an empty metrics map. On a previously enabled alarm-capable
installation that is now deliberately disabled, those current fields are also
null. A retained generation and enablement time can appear in
`alarm_evidence.retained_epoch` with unknown revision attribution. Treat the
retained epoch and earlier log samples as history.

A legacy target without the quartet can still have a retained epoch and current
metric evidence. That path requires a matching generation digest and all five
`Maximum` metric records with status `observed`. Each record has `points`,
`maximum` and `latest_at`. Zero points use null maximum and time. A positive
point count, up to 1,440, requires a finite nonnegative maximum and a canonical
timestamp within the window from the query start rounded down to a minute up to,
but excluding, the query end. Presence maxima are at most 1.

### Interpret saved alarm outcomes

| Check outcome | What you can do with the result |
| --- | --- |
| PASS | Retain the matching package, installation and health checks with the snapshot interval and revision. The saved scoped reads support what the operator observed at that time. |
| FAIL | Follow the named contradiction, such as an altered alarm threshold, a wrong ARN or enabled controls. Correct the evidence or use its owning setup procedure before saving a new observation. |
| UNVERIFIED | Obtain the named missing observation. A denied alarm read, absent row or failed closing read leaves current attribution unverified. Preserve any definite independent mismatch. |
| ERROR | Correct the malformed input, unreadable file or checker prerequisite. Retain other completed checks. |

Read the individual checks with the aggregate exit.
An ERROR takes precedence at exit 2, followed by FAIL (incompatible, exit 1)
and UNVERIFIED (unverified, exit 1). Complete compatible supplied evidence returns
exit 0. The separately reported PGB-58 check is outside that aggregate. For
example, C04 and C05 can pass while the overall result is unverified because
installed acceptance evidence is absent.

### R1-23-H03 saved evidence walkthrough

Use the clean tested source, prepared Node 24 dependencies and a skill receipt
prepared externally at the same full revision. Start with the original
R1-23-H03-C evidence at its own revision. Review the absent, permitted and
denied or misconfigured SNS outcomes. Check the four named destinations, exact
topic ARN and the original scoped permission evidence. Use the current pinned
source for the separate saved comparison.

```sh
node scripts/test-aws-manager.mjs --case R1-23-H03 \
  --output /absolute/private/NEW-alarms-h03 \
  --release /absolute/private/skill-receipt.json
```

Open the recorded argv and run or inspect both formats of the offline command
for each input. C04 passes for those four package and receipt pairs. C05 passes
for the never-enabled, bootstrapped console-only snapshot with the embedded
manifest. With the explicit manifest, a saved budget threshold of 81 against
the canonical 80 fails, a denied alarm read is unverified, and a non-string
dimension name in the saved measured-budget definition gives
`C05_HEALTH/ERROR/HEALTH_INPUT_INVALID`. Expect aggregate exit 1
for the matching and denied variants when installed acceptance is absent,
exit 1 incompatible for the contradictory threshold, and exit 2 for malformed
input. Check the actual named result in each saved format. For the operator's
separate recovery walkthrough, use [R1-23-H04](manager-health.md#r1-23-h04-operator-walkthrough).

Retain the command lines, both revisions, input digests, readable and JSON
outputs, and cleanup record before removing the owned disposable directories.
These are simulated provider observations and local checker results. Record the
designated humans' execution, installed AWS permissions and subscription
delivery independently.

## Supply saved observations

`--observations` is the checker's local input notes format,
`pigboard-readiness-observations/v1`; no provider is required to emit it. Its top
level contains `schema`, `revision`, `configuration_digest`, `installation_id` and
optional `expected_site`, `application_path`, `application_inspection`, `artifacts`,
`routes`, `workers`, `acceptance`, `reviewers`. Unknown keys and wrong types are
input errors. Use the original producer's `observed_at`; do not invent a current
observation time when copying saved evidence.

| Field | Shape and interpretation |
| --- | --- |
| `artifacts` | `{id,path,sha256,kind,observed_at}` entries; absolute regular-file path, lowercase hex SHA256, kind `original_observation` or `simulated_fixture`. The checker hashes bytes without executing files. An original label remains the caller's claim. |
| `application_inspection` | `{no_skill_copies,evidence_ids}`. Original saved app diff/inspection must support no app-local skill copies. External bundle placement alone does not establish this. |
| `routes` | `{project_id,full_label,role,story_type_id,bug_type_id,stage_id,jira_rule_enabled,cursor_automation_enabled,evidence_ids}`. Roles are `implementer`, `reviewer`, `qa`; include all configured projects. |
| `workers` | `{role,profile_sha256,prompt_sha256,model,effort,fast,phase_bindings,capabilities,evidence_ids}`. Hash exact pinned bytes. `capabilities` is `{status,evidence_ids}`, with `reported_complete`, `partial` or `missing`; completeness describes the pinned profile within the ordinary boundary. |
| `phase_bindings` | Implementer review/execution entries `{phase,subagent_type,model,machine,foreground,fresh_context,accepted_agent_id,setup_evidence_ids,telemetry}`. `machine` is `same_machine`; telemetry is `not_returned` or actual `{model,effort}`. Review and execution have distinct accepted IDs. |
| `acceptance` | Optional `installed_package` and `pgb58` records `{result,execution,revision,configuration_digest,installation_id,evidence_ids}`. Results: `passed`, `failed`, `partial`, `not_run`; execution: `actual_installed`, `simulated`, `local_only`. Only matching actual-installed original evidence can be supplied-compatible. |
| `reviewers` | Optional `{developer,human_qa}` display names for the two designated humans; missing identities are shown explicitly. |

Every `evidence_ids` reference must name an artifact above. Simulated fixtures can
pass diagnostic assertions while actual installed and PGB-58 acceptance remain
unverified. Keep local compatibility, installation binding, installed-package
acceptance, saved health, PGB-58, human review and explicit activation separate.
The checker does not capture new provider evidence or sign receipts.

## Human Review and recovery

Give the designated developer and human QA reviewer the exact revision, automated
checks, original/simulated evidence labels, report and pending cases. All four
original human groups remain **NOT_RUN** until those people perform them:

| Case | Human action and original expected result |
| --- | --- |
| R1-20-H01 | Fetch/prepare/refresh the external disposable install; inspect readiness and application diff. Expect the complete compatible bundle, exact prompts, full routing, inactive flags and no app-local copies. |
| R1-20-H02 | Inspect old worker, missing helper, model/capability mismatch, active-rule and absent-acceptance variants. Expect actionable mismatch/missing-evidence diagnostics with no setting changes or activation. |
| R1-20-H03 | Walk Human Review with both designated humans and automated evidence. Expect explicit human responsibilities, pending cases and no worker acceptance/deployment transition. |
| R1-20-H04 | Inspect two-project, missing-health-resource and old-evidence-revision variants. Expect only complete matching mappings/resources to pass, actionable mismatches and no scan, activation or delivery mutation. |

Prepare and run a selected whole group, or use `--all` for those four groups:

```sh
node /absolute/pigboard-setup/scripts/test-release-readiness.mjs \
  --case R1-20-H02 \
  --output /absolute/private/NEW-readiness-fixtures \
  --release /absolute/private/actual-prepared-skill-receipt.json \
  --revision APPROVED_40_CHARACTER_COMMIT
```

The output directory must not exist. The fixture supplies the fixed DATA-01
canonical configuration; the explicit receipt supplies the already-prepared real
external bundle. The approved revision is a separate required argument. The runner
never searches for the latest receipt, prepares dependencies or infers approval.
It retains exact invocations, hashes, actual outputs, independent literal expected
assertions, the original human steps/expectations and cleanup. H02 retains its five
variants; H04 retains its three. The missing-helper variant damages only an owned
copy of a previously verified real release. It preserves prepared dependency
symlinks and uses the unchanged verifier; it never damages the supplied release.

A failed source-pin prerequisite leaves the affected developer assertions pending.
H04 uses the actual saved reader's unknown shape for missing-resource diagnostics.
Its old-revision variant retains both manifest input routes and a matching control.
The saved empty
fixture provider trace describes this local fixture, not a live-provider audit.
Developer assertions never mark human execution PASS. Retain outputs before
removing only owned disposable fixtures/build output. Do not alter live records
or resources.

Human Review → UAT/Product Acceptance → production/Done requires human action.
Humans resolve blockers and authorize resumption within their existing authority.
The checker does not move a ticket, accept a case, merge or deploy. Its activation
record always says `authorized:false`, `performed:false`; green output grants
neither permission.

On a missing observation, obtain that specific saved evidence and retain completed
results. On a mismatch, use the owning setup procedure; do not rerun delivery to
manufacture a receipt. A manager recovery receipt with
`recovery_metadata.package_verified:false` is not a successful current-package
installation receipt. If configure confirmed success but full receipt publication
failed, retain the emitted full receipt in a new private file as the installation
guide directs. Do not reconstruct it, repeat configure or use a truncated output.
Follow the linked installation/health guides for their original receipt and
observation recovery procedures.
