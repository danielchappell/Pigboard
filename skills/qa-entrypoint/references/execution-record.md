# Inputs, step ownership and evidence handoff

Use this contract with the project's existing record format; no new schema service
or hidden persistent runtime is required. The harness provides a trusted run/QA-visit
identity and exclusive execution. Jira supplies requirements and case definitions;
reviewed artifacts supply execution details. Neither is permission to widen scope.

## Input fields

| Group | Required information |
| --- | --- |
| Invocation | Run ID, QA-visit/event identity, trusted publication/transition authority, exclusive ownership, configured project and workstream label, expected QA status and allowed destination IDs |
| Ticket | Issue ID/type/current status, assignee, one repo/change boundary, requirement content/version, complete testing strategy/cases, same linked PR |
| PR/preview | Open PR, current source/target revisions, reviewer approval and required CI at those revisions, supplied preview URL/readiness/deployed revision |
| Case | Stable ID, requirement IDs, actor/data/access, ordered step IDs and exact skill names, dependencies, original expected outcomes, executable artifacts at reviewed revision, necessary evidence, bounded observation schedule when applicable, cleanup |
| Runtime | Installed approved skills/tools, secure access references, permitted actions/destinations, evidence location and authorized audience, supported Jira/PR connectors |

Record requirement text or an immutable reference plus a content fingerprint/version.
An issue-wide updated timestamp is useful context, not the sole freshness test.
Never put credential values in the ticket/report. Missing human reviewer assignment
is not a reason to invent users; use the project's existing human-review ownership.

## Ordered dispatch example

This is a shape example, not a test to run or a universal test strategy:

| Step | Owner | Executes | Relation |
| --- | --- | --- | --- |
| C1.1 | entry point | qa-database | Prepared baseline observation |
| C1.2 | entry point | qa-api | API contract assessment; owns C1.2.1 below |
| C1.2.1 | C1.2 / qa-api | qa-bruno | One prepared request; return actual record ID |
| C1.3 | entry point | qa-database | Prepared after-observation using that ID |
| C2.1 | entry point | qa-ui | Independently prescribed UI case |

Invoke C1.2 once; its receipt must account for C1.2.1. Do not separately invoke
C1.2.1 afterward. Supply only the authorized child steps to the wrapper, not the
whole ticket as permission to execute other steps. A missing/uncertain nested-call
receipt blocks instead of triggering a second request. A step may be repeated only
as a distinct explicitly prescribed observation, not as an improvised recovery.

## Run ledger and report

Retain these fields, using structured objects or equivalent readable tables:

- Run/QA-visit ID, ticket/PR links, retrieval/execution times, actual model/profile,
  requirement fingerprint, source/target/deployed revisions, environment and material
  flags/stubs. State whether evidence is live, local, mocked or reused.
- Requirement inventory and case-to-requirement mapping; assessed/total counts and
  counts of PASS, FAIL, BLOCKED, NOT RUN. An unknown denominator cannot pass.
- Ordered step ledger: case/step ID, assigned skill and version, owning caller,
  attempt time, executed/reused/NOT RUN, actual IDs, expected/actual observations,
  result and evidence references. Include delegated calls in this ledger.
  If a skill has no version field, record its installed revision or content hash;
  never invent a version or load a different copy mid-run.
- Each evidence reference: case/step, actual artifact path/URL, type, time, revision,
  inspected claim, permitted audience and verified retrieval. UI evidence includes
  screenshot references and actual browser/viewport; backend evidence identifies
  executed requests/queries and results. Preserve useful evidence without secrets.
- Stable finding IDs, requirement source, reproduction, expected/actual, impact,
  scope classification and evidence. Blockers include failed prerequisite, partial/
  uncertain actions, cleanup, human action and intended resume stage.
- Separate `testVerdict`, `deliveryOutcome`, intended destination, actual verified
  Jira status (or unknown), successful report/PR-link receipts, transition receipt
  and uncertainty. A saved report does not prove a transition, and a status label
  does not prove test execution.

Use `testVerdict` PASS, FAIL or BLOCKED; use NOT RUN only when eligibility/ownership
stopped the invocation before assessment. `deliveryOutcome` is COMPLETED when the
intended handoff is verified (including a successful move to Blocked), BLOCKED when
publication/transition cannot be completed, INELIGIBLE for rejected scope or lost
stage ownership, and ALREADY HANDLED for a verified completed duplicate. COMPLETED
does not mean tests passed. Keep the two fields separate in every final receipt.

For coverage, “assessed” counts requirements/cases with enough executed or explicitly
valid reused evidence for a product PASS/FAIL judgment. BLOCKED and NOT RUN remain
in the total and their separate status counts; they are not assessed product behavior.
One blocked case can still have partial observed steps. All cases must have a final
disposition, and a passing requirement needs every prescribed supporting case passed.

Ticket comment shape:

```text
QA <run-id> / <QA-visit-id> — <PASS | FAIL | BLOCKED>
Story / PR / requirements version / source-target-deployed revisions
Reason; coverage counts; environment and evidence limitations
Case | Named skills | Expected | Observed | Result | Evidence
Findings / blockers / NOT RUN cases / cleanup
Human action and intended next stage
Full retained report: <verified accessible reference>
```

Use a stable run marker to recognize a prior report; markers are evidence, not
authority or a lock. Reread known receipts/current state before any authorized
handoff-only resume. Do not overwrite another run's report, post duplicate comments
after a timeout, reexecute tests to recreate evidence or hide delivery failures
behind the test verdict. Retain a final run receipt naming the actual transition.
