# Admission discovery and the bounded platform proof

14 November 2026. PGB-68 working contract. These are design choices and a proposed
test plan, not an installed manager or successful live acceptance. No AWS/Jira test
writes are authorized by this document. All delivery automations remain untouched.

## What the manager may do

The same application handles three operations through one configuration and one
state adapter: preview, admit an eligible ticket, and queue a required stack update.
Preview is read-only in Jira and DynamoDB. Apply has exactly these Jira transitions:

| Operation | Source | Target | Additional requirement |
| --- | --- | --- | --- |
| Admit new work | Ready to Work | In Progress | Complete execution contract, free stream, prerequisites and capacity |
| Admit repair/update | Rework Queued | In Progress | Same gates plus complete repair/parent evidence |
| Queue stack update | Human Review | Rework Queued | Approved stack rule, completed parent repair and stale child evidence |

No manager operation resumes Blocked, advances worker stages, merges a PR or cancels
a worker. A stale PR discovered by implementer preflight requires human handling.

Proposed domain contract: one active manager installation owns admission for the
configured Jira site/projects and full numbered stream labels. Workers and humans
do not independently start In Progress. Separate labels may run independently.
This operating rule is not technical enforcement of human permissions or protection
against another installation using a different table; those claims are excluded.

## Read protocol to validate

1. Load the installation identity, supported schema/configuration versions and
   strongly consistent stream state. Inaccessible/unknown state is never empty.
2. Discover opted-in Epics and relevant work within the configured projects using
   bounded complete pagination. Discovery can lag; newly created work may wait.
3. Build the required issue-ID set from Epic membership, dependency/lineage references
   and retained IDs previously handled by this manager. A filtered search returning
   no active issues cannot erase a known active, queued, blocked or Human Review item.
4. Reconcile known IDs in batches of at most 50. Request only required fields. Check
   each required ID appears once with expected project, identity and scope. Missing
   or inaccessible IDs hold the affected stream; incomplete shared discovery holds
   the scan. Do not declare absence from an eventually consistent search proof of
   completion, removal or free capacity.
5. Validate native stage/membership before evaluating candidates. Readiness checks
   ignore unfinished requirement fields on known preparation-stage tickets. They
   do not ignore an unknown native stage, hidden live issue or incomplete page.
6. Read the exact candidate, Epic, dependency and repair evidence again before a
   mutation. If anything relevant changed, return a changed-input result and make
   no write. A fresh read is not a cross-issue transaction; external concurrent
   edits remain a documented limit of this first-release operating model.

Successful issue IDs must remain discoverable in operational state until safe
retirement. The exact record layout, retirement rule and initial-install inventory
check remain part of the combined contract. Do not initialize an existing domain
as empty because a new deployment cannot see its previous state. Migration and
renumbering cannot silently abandon active work or the human-review cap.

## One mutation protocol

The following applies to queueing B as well as admission to In Progress:

1. Evaluate complete current inputs. Validate the configured source-specific
   transition and its target. A global transition or an unverifiable source edge
   cannot be treated as a conditional change merely because a read showed that
   source a moment ago. Resolve the workflow contract before apply is supported.
2. Conditionally persist an intent for the observed stream revision, operation,
   ticket, source/target, cause and unique attempt ID. Proceed only on confirmed
   success. Any pending intent prevents another transition for that stream.
3. Send one Jira transition request, with the bounded request deadline and retries
   for mutations disabled. Include the attempt ID in supported history metadata
   and visible evidence where the verified workflow permits it. Those fields help
   diagnosis; they are not provider idempotency keys.
4. On a confirmed successful response, conditionally save confirmation for that
   same attempt/revision. Retain the affected issue ID for subsequent fresh reads.
   A successful queue operation means queued, not a worker launch or completed fix.
5. On a lost response, process failure or unclassified error, leave the intent and
   return an uncertain result. No later invocation replays it automatically. Even
   a failure saving success must retain a human hold rather than repeat the action.
6. Definite rejection may be recorded as not applied only for statuses proven by
   the fixture contract. Otherwise it remains uncertain. On a state conflict or
   pre-write read failure, make no Jira mutation and re-evaluate on a later scan.

Do not add an automatic lease expiry, retry queue or worker dispatcher. Conditional
state updates protect the manager's own attempt records, not delivery of Cursor
webhooks. Paused Epics and known blockers continue to prevent new admission.

## Human reconciliation

The operator sees the ticket/stream, intended transition, attempt identity and
sanitized evidence. Disable admission and drain the bounded invocation before
reconciliation. A pending request is not known cancelled merely because Lambda
ended. Inspect Jira's current state and history for the attempted transition.

If the outcome is proven, record that disposition with evidence using a revision
check; the next scan re-evaluates live state. If it cannot be proven, keep the hold
and ask the responsible Jira operator to resolve it. Do not treat absence of a
history entry or elapsed time alone as proof that a request cannot later apply.
Do not provide a blind "delete lock" recovery path or automatically unblock Jira.

This procedure must be tested with the supported workflow. The first release is
allowed to stop for human intervention; it must not advertise automatic recovery
or a transaction spanning Jira and DynamoDB.

## Platform evidence obtained

- Jira's documented transition representation includes `isGlobal`; full workflow
  definitions describe directed source-status links. Transition requests themselves
  have no documented expected-source-status argument. Thus transition IDs and
  source edges are installation facts, not guesses based on a column name.
- A read-only connector inspection of PGB-67 returned To Do, In Progress and Done
  transitions. It did not return source/global-edge metadata. PGB is the planning
  project, not proof of the Safeguard INT workflow; no transition was executed.
- Jira search reconciliation applies to specified known IDs, maximum 50 per call.
  It does not establish completeness for unknown or permission-hidden work.
- DynamoDB provides strong base-table reads and conditional changes. Its transaction
  request token has a finite idempotency window; it is not a permanent scheduling
  record and never makes Jira requests idempotent. Durable attempt identity is
  required independently of any SDK retry/token behavior.
- The local environment has no AWS CLI on PATH. The parallel signup agent has now
  verified an actual Scuba Pig AWS development account on the Free plan with $100
  credits and $0 due, ending 14 May 2027 or earlier on credit exhaustion. The service
  catalog lists Lambda, DynamoDB, CloudFormation and IAM; IAM access was inspected.
  This is account/catalog evidence, not deployment acceptance. No scoped probe
  credential, selected deployment region or disposable Jira fixture is ready, and
  no probe resources, roles, credentials or paid upgrade were created.

## Concrete bounded proof proposal

Purpose: resolve the provider guarantees that affect the implementation contract.
This is a disposable research probe, not implementation of the manager or a test of
the Cursor delivery loop. Prepare/review the exact probe artifact after the target
account and workflow are selected; authorization applies to that artifact and its
listed resources/actions, not arbitrary cloud work.

Proposed resource ceiling: one temporary DynamoDB table, one temporary Lambda with
its narrowly scoped role and log group, no schedule or public endpoint, and four
synthetic Jira tickets in an isolated fixture project. Use no real employee labels,
application repositories, PRs, Cursor calls or production data. Verify fixture Jira
rules cannot launch delivery before any transitions. Do not edit shared workflows;
the fixture must already expose the required directed edges or receive a separately
approved isolated workflow setup. Credentials stay in customer-approved storage.

| Case | Bounded action | Required evidence |
| --- | --- | --- |
| P1 — all three directed edges | For Ready to Work -> In Progress, Rework Queued -> In Progress, and Human Review -> Rework Queued, inspect the installed edge, perform one synthetic transition and repeat that same edge after leaving its source | Separate source/target, transition ID, effective permission, response and history evidence for each edge; every wrong-source repeat is rejected without a new transition |
| P2 — fresh known issue | Reconcile the fixture ID after its transition | Exact ID and current status; no claim about unknown issues |
| P3 — competing intents | Two conditionally written intents for the same stream revision | One succeeds; the other conflicts; one durable owner |
| P4 — lost outcome for each operation | For each of the three edges in P1, persist a distinct intent, perform the authorized fixture transition and deliberately omit local confirmation | Each later probe reads its pending intent and sends zero further Jira writes; queueing and both admission sources must all be covered |
| P5 — stale completion | Reconcile a fixture attempt, then submit its old revision's completion | Conditional update rejects stale completion |
| P6 — cloud boundary | Invoke read-only/no-write probe under allowed role; test a separately prepared denied identity | No public invocation, appropriate access denial, sanitized output and retained state |

P1 reserves six requests: one success and one wrong-source repeat for each edge.
P4 reserves three more, one uncertain-confirmation case per edge. The remaining
three requests within the ceiling cover any fixture positioning. Count every setup
transition, including initial placement; four tickets may be reused only after an
explicit evidence-backed reconciliation of their prior probe attempt. If the chosen
workflow needs more positioning, stop and revise the reviewed/authorized packet
before running it. Do not omit an edge or silently increase the ceiling. Discovery
cannot close on the strength of just the new-work admission edge.

Cap the complete proof at 12 Jira transition requests and 40 DynamoDB write requests;
set bounded read counts/time in the reviewed probe. Stop on unexpected access,
unexplained transition behavior or uncertainty. Do not retry a mutated case merely
to obtain a green result. Record skipped cases and actual writes. Cleanup applies
only to proven disposable probe resources; preserve any unresolved evidence/state
until the operator reviews it. No cleanup of customer secrets, shared roles or data.

Installation/upgrade/removal of the production package and real delivery-loop
acceptance remain later release acceptance, not claims this small probe can prove.
Required permission matrix, actual workflow constraints and safe rejection handling
must be established before dependent apply-mode Stories are called ready.

## Sources

- [Jira issue transitions](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/)
- [Jira workflow definitions](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-workflows/)
- [Jira search reconciliation](https://developer.atlassian.com/cloud/jira/platform/search-and-reconcile/)
- [DynamoDB transaction token limits](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html)
- [DynamoDB consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html)

## Author assessment

- Intuitive: the same preview/apply contract covers admission and queueing; holds
  report what the operator needs to inspect.
- Discoverable: explicit source edges and bounded proof cases expose prerequisites.
- Delightful: reuse customer infrastructure and stop once facts are insufficient;
  actual fixture setup is still needed before the proof can run.
- Token saver: deterministic reads/writes; no AI polling or repeated repair attempts.
- Secure: one customer domain, restricted resources, no public endpoint or secrets
  in artifacts; provider privileges and missing fixture authority remain explicit.
- Agents are equal: structured outcomes/evidence accompany the human recovery guide;
  no agent must invent the target, permissions or tests.
- Dependable: pending outcomes survive invocation loss; queued and completed differ;
  source freshness and external-write uncertainty are not overstated.
- Unified configuration: one adapter/configuration/state path handles both manager
  mutations; the proof does not introduce a second production configuration system.
