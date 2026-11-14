# First manager release — Jira delivery plan

Status: the original design was reviewed CLEAN for discovery/design Task grooming.
The DynamoDB/state-lifecycle addition is a new design revision with its own review
record. Earlier CLEAN results do not cover these additions. No implementation Story
is ready. No runtime or deployment is authorized by this plan. Jira PGB owns the active queue; local documents are evidence.

## Ordered queue

| Order | Item | Outcome and dependency |
| --- | --- | --- |
| 1 | [PGB-67](https://scubapig.atlassian.net/browse/PGB-67) — Freeze the manager's admission contract | Exact versioned inputs and scenario outcomes; independent of D2. |
| 1 | [PGB-68](https://scubapig.atlassian.net/browse/PGB-68) — Prove safe Jira admission from customer-owned Lambda | Evidence for invocation, complete reads, transitions, failure hold, permissions and deployment; independent of D1 until final contract review. |
| 2 | [PGB-69](https://scubapig.atlassian.net/browse/PGB-69) — Groom the first manager release into reviewed Stories | Requires D1 and D2; final reviewed architecture, ordered complete slices, cases and size audit. |
| Separate gate | PGB-58 existing delivery loop | Must pass before real manager-driven delivery is enabled; does not prevent fixture-based design/build. |
| Follow-on | [PGB-70](https://scubapig.atlassian.net/browse/PGB-70) monitoring discovery | Later status visibility only; separate from first release and not a dependency. |
| Follow-on | Existing PGB-63 → PGB-64 → PGB-65 | Verified duplicate-prevention/dispatch feasibility, accepted design, then grooming; no migration in first release. |
| Developer tooling | Codex GitHub review setup | Pigboard PRs cannot merge without current-revision bot thumbs-up; separate from customer runtime. |

D1 and D2 need Tasks because their answers determine interfaces, safety, sizing and
deployment. Creating implementation Stories now would invent those answers. D3
owns the ensuing grooming; it cannot silently convert a scope increase to a Story.

## Provisional — not ready for delivery

These are candidate increments, not Jira implementation Stories or committed
estimates. D3 must revise/split them after discovery. All target only
https://github.com/danielchappell/Pigboard, main, without archived runtime reuse.

1. Preview the next eligible ticket with reasons from validated Jira data. Consumer:
   customer operator. Must produce an executable read-only command and complete
   scenario evidence, not unused selection functions. Contract changes needed to
   produce those inputs must be delivered as a complete usable authoring increment.
2. Install and operate that preview inside the customer's AWS account. Consumer:
   customer administrator. Complete Lambda deployment, secrets, least permissions,
   disabled schedule, diagnostics, upgrade and removal; no public endpoint or vendor
   access. Split if this cannot fit the limit without losing the usable outcome.
3. Admit eligible new work under the agreed readiness, priority and capacity rules.
   Consumer: existing Jira-to-Cursor flow. No apply mode before tested safe transition
   and operator failure behavior. Basic intermediate use must clearly exclude queued
   repairs until the next complete workflow slice, without bypassing them.
4. Coordinate queued repairs and affected stack updates. Consumer: workers and human
   reviewers. Role handoff skills, Jira configuration contract and admission logic
   must be mutually compatible; split by usable behavior, never enable half a chain.
5. Accept the installed release on authorized fixtures, then separately authorize
   pilot activation. Operational validation is a Task unless it changes code.

Before any implementation Story is ready: one repository/PR, no more than 20 changed
files total, less than two human working days including tests/docs/PR preparation;
resolved contracts; exact QA skills/cases; relevant role instructions and runbook;
independent delivery-plan review. Do not provide invented time/file estimates for
unresolved increments. Keep estimates and dependencies here/Jira plan, not ceremony
inside every Story.

## Scope freeze and changes

Frozen outcome: securely install in customer-owned AWS Lambda and advance eligible
work through the existing Jira dispatch path. Retain all ten design admission rules and the approved manager-owned stack queue
transition described in [the stack contract](manager-stack-repair.md).
Out: monitoring, duplicate-agent prevention, dispatch proxy, transcript storage,
recovery/cancellation, SaaS, multi-cloud deployment and legacy code reuse.

The owner approved customer-owned DynamoDB for admission state on 14 November 2026.
[State ownership and upgrades](manager-state.md) define the new boundary;
[discovery progress](manager-discovery.md) separates settled contracts from open gates.
The approved [stack rule](manager-stack-repair.md), draft [work contract](manager-work-contract.md)
and [bounded platform proof](manager-admission-proof.md) are the current discovery artifacts.
The complete fixed Story set, scope coverage, dependencies, sizing and acceptance
must be presented to the owner before implementation begins.

Confirmed in-scope design defects are fixed and re-reviewed. A different datastore,
additional hosted service, changed capacity/rework policy or missing owner decision
is recorded for the owner before dependent Stories become ready. Do not expand
PGB-58 or repurpose historic implementation items into this release.

No AI worker labels or launch-ready status are added to the new grooming items.
All remain in the normal planning workflow. Existing live automations are untouched.

## Author principles assessment

- Intuitive: queue begins with explicit contract and deployment questions.
- Discoverable: each Task states the artifact and evidence needed to finish it.
- Delightful: independent discovery can proceed together without repeated decisions.
- Token saver: no speculative implementation or duplicate follow-on research tickets.
- Secure: permission and uncertain-write contracts block readiness until resolved.
- Agents are equal: subsequent Stories must provide executable cases and named skills.
- Dependable: previews are labelled provisional; no groomed Task is claimed as a delivered feature.
