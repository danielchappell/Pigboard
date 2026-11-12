# QA entry-point skill — authoring and evidence

## Delivered scope

`skills/qa-entrypoint/` contains the stage skill, execution/report contract and
Cursor invocation profile. It reads the current Story and PR, validates prescribed
cases, dispatches named skills sequentially, combines evidence and publishes the
authorized handoff before a verified Jira transition:

- PASS -> Human Review, PR open for the human QA reviewer and owning developer.
- In-scope FAIL without blockers -> In Progress on the same PR.
- Any unresolved execution, evidence, cleanup or scope blocker -> Blocked, preserving
  earlier defects and ending model work. Failed handoff delivery remains explicit.

The current `qa-api`, `qa-bruno`, `qa-database` and `qa-ui` contracts are reused.
No helper is changed. The general installed qa-verify remains untouched; its
exploratory defaults are not invoked here. Latest upstream qa-verify was inspected
at ai-working-kit main `5bef5cf140bd5ea92e6600f0ff2a0be726e4c7ac`, blob
`d6a43e0cac1ac73344ae681bfd46cc5e8bbec452`. This is a new entry point with a distinct
execution-only boundary, not a claim that upstream already implemented this workflow.

## Plan review

Two fresh independent Sol High reviewers returned CLEAN for plan SHA256
`5965f92a2bb7605a2e77eed20125dce600a2378a6fa2b4c0258047bda383dea3`.
Each covered 6/6 governing/plan/helper artifacts and 8/8 behavior clauses, performed
a second sweep and assessed all seven principles. The product review found omitted
Story-type eligibility; the plan now explicitly rejects non-Stories without helper
execution or Jira writes. The updated exact plan was re-reviewed by both reviewers.

## Independent forward exercise

A separate fresh Sol High agent used the actual instruction skill with a local
recording connector double. It selected actions and results; the double supplied
fictional inputs/receipts and recorded calls, without computing the QA verdict.
Prepared artifact abstractions and limitations are explicit in
`evidence/2026-11-12-entrypoint/fixture-notes.md`. No real connector or application
was called. These are instruction-behavior tests, not a new orchestration runtime.

| Fixture | Selected helpers | Test result | Delivered state | Calls |
| --- | --- | --- | --- | --- |
| pass_nested | S1 qa-api (owns S1.1 qa-bruno), S2 qa-database | PASS | Human Review | 12 |
| fail_dependency | S1 qa-api, S3 qa-ui; S2 skipped for F1 | FAIL | In Progress | 12 |
| mixed_blocker | S1 qa-api, S2 qa-database; no S3 | BLOCKED; earlier F1 retained | Blocked | 11 |
| non_story | None | NOT RUN | Unchanged QA; INELIGIBLE | 2 |
| publication_denied | S1 qa-api, S2 qa-database | PASS | Unchanged QA; delivery BLOCKED | 9 |
| transition_timeout_committed | S1 qa-api, S2 qa-database | PASS | Human Review after one reconciliation read | 12 |

All six traces passed requirement-based assertions for prescribed helper order,
no duplicate nested request, correct verdict/destination, required report/PR access
before transition, status readback, no calls after blocker, no writes for non-Story,
no publication retry after revoked authority, and one transition after timeout.
There were 58 recorded calls: 20 context reads, 10 helper calls, 9 evidence reads,
5 report attempts, 4 PR-link checks, 4 transitions and 6 retained final receipts.
A mistyped fixture name failed before any state action; no state was changed.

The evaluator identified two report ambiguities, now clarified without changing
routing: delivery COMPLETED can mean a successful Blocked handoff, while delivery
BLOCKED means a failed handoff; assessed coverage counts actual PASS/FAIL judgments,
with BLOCKED/NOT RUN kept in the denominator and separate counts. Existing trace
results already use these definitions. No extra fixture execution was needed.

Full scenario inputs, the recording driver, six call traces and assertion summary
are retained in `evidence/2026-11-12-entrypoint/`. Twelve additional raw boundary
scenarios are provided there for independent final review, covering missing skills/
cases/screenshots, stale inputs/stage, duplicates, scope increases, unavailable
transitions, unresolved write outcomes, inaccessible Jira and partial publication.

Skill-format validation and all relative-reference checks pass. This changes
instructions and isolated evaluation material only; no application test suite was
rerun or counted as fresh integration evidence.

## Author assessment and limits

Intuitive: the three destinations and two separate test/delivery results explain
the next actor. Discoverable: explicit prerequisites, report fields and missing-input
outcomes expose readiness. Delightful: same-PR rework and once-only nested calls avoid
repeated actions. Token saver: no discovery, case generation or recovery loops.
Secure: trusted invocation, current eligibility and scoped actions preserve authority;
comments and labels are not permissions. Agents are equal: structured inputs and
human-readable evidence support both actors. Dependable: evidence and status receipts
prevent false success, while partial writes and observed defects remain visible.

Live Cursor model/effort, authentication, exclusive dispatch, real preview access,
reviewer-accessible artifact storage and Jira/PR transitions remain unverified.
This skill does not supply a lock, transaction mechanism, preview environment or
Teams automation. No real ticket was moved by the fixture; no source push, PR,
merge, deployment or automation activation occurred. Exact committed-artifact
review and local installation are recorded after their completion below.
