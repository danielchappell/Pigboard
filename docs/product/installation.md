# Install and operate Pigboard in the customer's AWS account

| ID | Required behavior |
| --- | --- |
| O01 | Deliver a customer-owned AWS Lambda package with DynamoDB state and no Scuba Pig runtime access, customer-data collection or telemetry. There is no SaaS tenancy or public admission endpoint in this release. |
| O02 | Keep manager policy/application logic cloud-neutral, Jira behavior in its adapter, state guarantees in an interface, and DynamoDB/Lambda/IaC in AWS components. Only the AWS deployment ships; do not revive archived runtime code or build speculative providers. |
| O03 | One canonical customer configuration owns one Jira site, allowed projects and their repositories, labels and status/type/actor mappings, budgets and secret references. Derive resource bindings and installation outputs; don't require humans to synchronize competing configuration files. Automatic Jira/Cursor provisioning is later work. |
| O04 | Deterministic environment setup fetches a reviewed pinned Pigboard skill bundle outside the application repository. Refresh occurs through the configured Build process; verify installed skills before enabling an updated environment. Keep agent prompts minimal and source-controlled behavior in skills. |
| O05 | Separate Jira-owned work/status, customer configuration, operational state and secret ownership. DynamoDB stores installation, stream, attempt and retained-member records; not code, descriptions or transcripts. Preserve history in separate records, not a growing stream blob. |
| O06 | The manager persists a conditional transition intent before its own Jira side effects. It verifies comment and admission-pointer publication, rechecks source facts, sends one directed transition, then conditionally confirms the outcome. Queueing B preserves its old admission pointer until later admission. Workers publish their own handoffs without accessing manager state. |
| O07 | Failed/incomplete reads, unsupported versions and changed facts before intent produce no writes; a later invocation evaluates fresh inputs. Once a durable intent exists, uncertainty or changed facts retain that intent for human reconciliation across invocations and upgrades. This protects scheduling consistency, not duplicate Cursor launches. |
| O08 | Human reconciliation disables/drains admission, examines the named attempt and positive provider evidence, then conditionally records confirmed application or proved rejection. Unknown remains held; no timer-based unlock, force-success or automatic retry. Some ambiguous sent requests may remain unresolved in release one. |
| O09 | Scope runtime IAM to its table, secret and logs; separate operator/deployer permissions. Validate configured HTTPS destinations and prohibit credential-bearing redirects, secret values or customer content in logs. Document actual Jira permission limits rather than promise per-role isolation. |
| O10 | Install disabled with writes off, bounded invocation/read budgets, finite log retention and documented preview/enable/stop journeys. Verify complete service-account visibility and one admitting installation for its scheduling domain before enabling. |
| O11 | Version configuration, work contracts and state separately. A compatible upgrade on a supported installation preserves its configuration, retained history and pending attempts; incompatible rollback/restore cannot write until reconciled. Deletion/replacement retains the table; report retained resources and costs. No TTL unlock, migration engine or automated state retirement is added. |
| O12 | Roll out authoring, validators, role skills, Story/Bug routing, environment bundle and manager as a compatible set with delivery off. Installed-package acceptance covers all three manager edges and failure holds. PGB-58 delivery acceptance and explicit owner activation follow; provider probes alone never authorize launch. |
| O13 | Pig Boss supports multiple projects in one customer installation, with project-specific mappings and project-scoped stream/state identity. Equal labels across projects do not collide; moves/removal cannot discard retained work. Test mixed mappings and shared versus isolated failures. |
| O14 | A read-only readable/JSON health command distinguishes disabled, starting, healthy, degraded, stale and unknown; shows current-revision completion freshness, errors, budget use and work holds without changing Jira/state. |
| O15 | AWS packaging supplies missing-completion, error/throttle and capacity alarms, optional customer SNS routing, safe disabled/enable/upgrade behavior and an operator runbook. Monitoring stays customer-owned; no worker polling, automatic recovery or untested capacity promise. |

### Which installations O11 covers

The planned lifecycle commands for verified drain, in-place upgrade, safe
re-enable and verified removal require an
installation provisioned with lifecycle safeguards. Those safeguards identify
the original State table and record which operation may change the host.
An older installation keeps its original inspection and protective stop
procedures. It stays held when the operator cannot verify drain.

For installed acceptance case AT-01.6, provision a separate, fresh installation
with the safeguards. Record its stack and State table IDs. On that same
installation, record the canonical configuration digest, retained history and
pending attempts immediately before and after the in-place upgrade. Compare
all three and include the results in the case evidence. [PGB-91 installed acceptance](https://scubapig.atlassian.net/browse/PGB-91)

Leave the older AWS test stack disabled with its original PGBT-6 and PGBT-7
admissions in place. [Owner decision](https://scubapig.atlassian.net/browse/PGB-86?focusedCommentId=11337)

The [state contract](../architecture/manager-state.md) and
[release design](../architecture/manager-release-one.md) own the technical detail.
The reviewed discovery closure further fixes atomic attempt/stream updates,
retained membership, no automatic record retirement and evidence-only recovery;
those changes must be incorporated in the combined design before Story freeze.

The isolated AWS/Jira proof is evidence about specific provider operations. Its
throttled final observation and unrun stale-completion/repair checks stay explicitly
partial. The finished implementation must supply its own failure, concurrency,
permission and lifecycle acceptance. Do not repeat an exploratory deployment merely
to present a green discovery checklist.

[Company scope and health contract](../architecture/pig-boss-operations.md) is the approved scope addition; 50-project scaling is a measured follow-on target.
