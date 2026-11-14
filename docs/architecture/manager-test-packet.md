# Isolated manager discovery tests

Prepared for PGB-67/PGB-68, 14 November 2026. **Not executed or authorized to run.**
This packet defines the cases, fixture and ceilings. Actual provider IDs, access and
reviewed executable requests must be bound before any resource creation or write.
Use the [manifest](examples/manager-probe.yaml) as the one preparation record.

## Purpose and boundary

Prove three facts before ready implementation Stories: Jira honors the required
source edges, handoff data survives the real API round trip, and customer DynamoDB
retains an uncertain intent across invocations. These are disposable research tests,
not the manager implementation or a Cursor delivery test. Installed-package and
real delivery acceptance remain later, separate gates.

The AWS account exists on the Free plan. Its observed console region is Stockholm;
use `eu-north-1` for this proposed isolated proof unless account capabilities prevent
it. A region choice here does not prescribe the customer's production region.
No paid-plan upgrade is permitted. Stop if Free-plan limits prevent the test.
Credits cover eligible usage only while available; account creation is not proof
that this package is free indefinitely.

Jira target: propose a new **Pigboard Test (PGBT)** project on the Scuba Pig site.
PGBT is a proposed name/key, not an existing project. Do not reuse PGB, PIG, SAM1,
Safeguard INT or an existing workflow by assumption. Fixture creation is a separate
explicit authorization step after this definition is reviewed. Do not change a
shared workflow or permissions scheme. If the account cannot create an isolated
workflow, leave that setup blocked and complete offline work.

No fixture has a real employee label, application repository, real PR, production
data, Cursor webhook or delivery automation. Use a clearly synthetic stream label
`PROBE-Daniel-1` only within fixture records. Before writes, inspect project and
global automation scopes; any rule that could launch delivery prevents the test.
An empty project alone is not proof of isolation.

## Exact Jira fixture

Create four synthetic Stories, with initial **Ready to Work** status. Record stable
IDs after creation, rather than inventing keys or IDs in the test artifacts.

| Fixture | Purpose | Initial position |
| --- | --- | --- |
| F1 | New-work success and wrong-source repeat | Ready to Work |
| F2 | Queue-update and rework-admission success/repeat | Human Review via setup edge |
| F3 | New-work transition with deliberately unsaved confirmation | Ready to Work |
| F4 | Queue-update then rework-admission with unsaved confirmations | Human Review via setup edge |

The isolated workflow has four statuses and four directed edges. It has no global
transitions, self-transitions or automatic transitions:

| Edge | Source | Target | Use |
| --- | --- | --- | --- |
| setup | Ready to Work | Human Review | Position F2/F4 only; never a manager permission |
| new | Ready to Work | In Progress | Manager admission |
| queue | Human Review | Rework Queued | Manager stack update |
| repair | Rework Queued | In Progress | Manager rework admission |

Use a separate fixture operator for setup where available. Record the actual Jira
permission breadth if the provider cannot isolate individual edges. Do not claim
configuration validation reduces the identity's underlying rights. Preserve the
workflow export/source-edge evidence and actual transition IDs in the receipt.

## Proposed AWS fixture

One disposable CloudFormation stack, a name beginning `pigboard-proof-`, with:

- One DynamoDB table, on-demand capacity, no TTL or streams. Synthetic IDs only.
- One Lambda, no schedule, function URL, API Gateway, event source or resource-based
  public invocation. Proposed Python managed runtime; verify its current availability
  before binding the executable package. No archived Pigboard code or runtime imports.
- One execution role: access only to the test table and its log group, plus the one
  test secret only if the reviewed combined Jira/Lambda probe actually requires it.
- One optional dedicated probe operator role, trusted only by the verified current
  customer principal. It may invoke this function and read test evidence. A restricted
  STS session of that role supplies the live denied-invoker check; no new IAM user or
  long-lived access key. Never invent the trusted principal ARN.
- One log group with one-day retention. No event/payload/credential logging.
- At most one test secret, if required, containing only a fixture-scoped Jira token;
  user supplies it directly to customer storage. No Bitbucket token reuse.

These are proposed ceilings, not permission to provision. The exact package must
name which optional resources it uses; unused resources are omitted. Keep source
and any inline code inspectable. Do not add NAT gateways, VPCs, buckets, databases,
paid support or broader shared policies to make a failing prerequisite pass.
Reserved concurrency one is preferred; new-account quotas may prevent reservation.
If so, record that limit rather than silently relaxing the deployment contract.
The DynamoDB conditional-write test does not rely on Lambda concurrency for safety.

## Test order and request budget

All case expectations are fixed before execution. Use `qa-api` with its prescribed
`qa-bruno` child for prepared HTTP/SigV4 observations only when that supported path
is verified. A human operator performs all fixture mutations, transitions and fault injection,
including infrastructure setup and denied-identity/session steps. QA skills only
perform the prescribed read observations/assertions; they never transition a Jira
work item as a side effect of their helper role. Do not invent a DynamoDB `qa-database` adapter: the retained helper is Postgres.
Each case below requires the named exact requests to be prepared and reviewed;
missing auth/request artifacts mean NOT RUN, never an improvised live call.

| Case | Actions and expected result | Evidence |
| --- | --- | --- |
| P0 isolation | Read account, region, plan, caller identity, Jira project/workflow and all applicable automation scopes; verify exact fixture allowlist | Sanitized identity, workflow export, no-delivery-rule evidence and bound manifest |
| P7a handoff preparation | Publish and read back the typed manager record needed before each P1/P4 transition; set/read admission pointer only for admission | Comment ID, server actor/edit metadata, canonical digest and property value; failure prevents transition |
| P1 source edges | F1: new then same-edge repeat. F2: queue then repeat, repair then repeat. Every first call reaches target; every repeat is rejected with unchanged status/history | Installed edge IDs, permission identity, response/status/history for all three edges |
| P2 fresh read | Reconcile F1/F2 by known stable IDs after their successful transitions | Each requested ID appears once with its actual current status; no claim about undiscovered work |
| P3 competing intents | Two different attempts conditionally create the same stream/revision record | Exactly one succeeds, one condition fails, strong read returns winner; no Jira call |
| P4 lost confirmation | F3: new. F4: queue, then repair only after operator reconciliation of the prior queue attempt. Persist intent first, perform one transition, deliberately omit confirmation write | Three distinct pending attempts survive; later observations issue zero Jira writes; no automatic retry |
| P5 stale completion | Conditionally reconcile one synthetic pending record at its observed revision; then submit an update using the old revision | Stale update fails and cannot change the reconciled record |
| P6 permissions | Invoke read-only probe with allowed session, then with a restrictive session explicitly denying this function | Allowed result and genuine access denial; no public permission; no secret/body exposure |
| P7b worker records | Publish/read representative implementation, approval, QA, repair, dependency-wait, blocked and human resume-authorization records; compare parsed content/metadata | Required fields/nulls/references survive; AI/human outcomes stay distinct; transport does not imply real PR work happened |

`P7a` is interleaved before each relevant transition, not a late simulation of
publication order. Worker records in P7b are visibly synthetic and do not transition
anything. Actual PR revision validity and Blocked resumption semantics are offline contract
cases, not fake live approval or unblock acceptance. The four-status fixture does
not test human-unblock automation, which remains separately scoped. Source fields and evidence links use reserved invalid domains in fixtures.

Hard ceilings across the whole packet, including expected denials and setup:

- 4 issue creations; 2 positioning transitions; P1 uses 6 transition requests; P4
  uses 3. Total planned **11**, maximum **12** Jira transition requests. The unused
  request is headroom, not permission to retry a failed/uncertain call.
- At most **13 comment creations**: six manager records before the P1/P4 operations,
  six representative worker outcomes and one human resume-authorization record. At most **4 property writes**, for the
  four admissions. Queue-only operations preserve the prior pointer. Where a fixture
  lacks a prior live worker chain, its record is transport-only and cannot establish
  business eligibility. Local contract cases supply the coherent A/B chain.
- At most **40 DynamoDB write requests**, counting failed conditional attempts;
  at most **120 Jira reads**, **120 AWS data-plane reads/invocations** and **30 minutes**
  of active case execution. Setup/control-plane calls are separately listed and
  bounded in the executable request manifest before authorization.
- Mutating API retries disabled. Proposed individual HTTP deadline 10 seconds and
  Lambda deadline 30 seconds. Read retry count zero for the research packet; a failed
  read is recorded rather than chased to green. Do not infer production limits from
  these deliberately small fixture limits.

Counter receipts include operation ID, request purpose, prior count and observed
response category. Any exceeded ceiling, unexpected permission, unknown status,
missing workflow source evidence or uncertain real mutation stops dependent tests.
Preserve earlier outcomes. Deliberately omitting local confirmation in P4 is labelled
fault injection; a genuinely lost provider response is a different unresolved result.

## Offline contract matrix

These cases require no credentials, infrastructure or ticket writes. Apply safe
YAML parsing, JSON Schema and the semantic rules separately; report which layer
rejects the input. Do not claim a JSON Schema pass proves the semantic algorithm.

| ID | Input/change | Expected outcome |
| --- | --- | --- |
| H01 | Complete A/B repair chain described in handoff contract | Parent passes before B queues; B consumes roots; repeated scan does not queue it again |
| H02 | Missing required field or required null | Schema error names field; no handoff |
| H03 | Unknown field, duplicate YAML key, alias/tag or second document | Extraction/schema failure; no inferred correction |
| H04 | Unsupported schema | Explicit unsupported version |
| H05 | Worker result references prior assignment | Stale assignment; cannot advance current work |
| H06 | Ticket requirement digest changed | Earlier evidence is historical, no completion |
| H07 | Edited/deleted reference or wrong digest | Hold; no silent repair of evidence |
| H08 | Body claims manager role but server actor is not allowed | Reject actor; body role grants no authority |
| H09 | Same role/assignment has two differing final records | Conflict; identical repetitions are one logical result only |
| H10 | Review or QA has different PR/source revision | No coherent completion |
| H11 | B is independent, wrong stream/repository or ordinary retarget | No automatic stack queueing |
| H12 | Missing AI step, missing evidence or unexplained NOT_RUN | Cannot publish QA success |
| H13 | AI claims a human case passed or dispatches it | Reject ownership violation |
| H14 | No AI steps, complete human cases and explicit reason | Zero AI cases; human cases pending; still requires CI and PR review |
| H15 | Newer parent repair arrives before B admission | Consume all applicable roots at latest verified parent; no dropped earlier finding |
| H16 | Comment/property publication uncertain | Intent holds, zero transition calls |
| H17 | B queued but not yet admitted | Old admission pointer remains; later admission gets a new identity |
| H18 | Dependency wait before first PR | Resume with no existing PR only when prior evidence proves none published; never forget a known PR |
| H19 | QA blocked, human authorizes that exact blocker, unchanged work resumes | New result slot accepted only through the unique authorized chain; old blocker preserved; unauthorized, competing, edited or changed-work resumes rejected |

Schema fixture validation can run locally now. Server-metadata, current-stage and
scheduling assertions require a future implementation or explicit manual contract
walkthrough; label those results accordingly. The probe is not a hidden implementation
of scheduler policy, worker run ownership or automatic recovery.

## Cleanup and retained evidence

Stop invoking; inspect all actual outcomes. Preserve pending records until the
operator records what happened. Export sanitized evidence and reviewed artifact
revision. Remove only verified disposable resources by exact receipt IDs, following
a separately approved cleanup plan. Do not delete unresolved state, shared roles,
secrets, workflows or Jira history to make the test appear clean. Leaving fixtures
in place pending review is an honest partial cleanup, not a failure to conceal.

## Remaining setup decisions and execution gate

Preparation can continue without the user. Live execution waits for: isolated Jira
project/workflow authorization; verified fixture-only credentials and customer AWS
principal; complete workflow/status/issue/resource IDs; exact executable artifacts
and permissions reviewed to CLEAN; then explicit approval of the bounded run.
No request is made to enable delivery or broaden access to company application data.

The account's creation is complete. This packet does not claim the new project,
resources, credentials or test evidence already exist. If a platform constraint
requires a different scope, record the choice for the owner; continue offline work.

Author assessment: intuitive—four clearly named fake tickets; discoverable—case
order, expected results and missing setup are explicit; delightful—one small isolated
packet; token saver—fixed requests with stop conditions; secure—no delivery triggers,
customer-only access and no paid upgrade; agents are equal—named helpers and human
setup responsibilities; dependable—provider proof, fault injection and release
acceptance are separate; unified configuration—one manifest, generated receipts.
