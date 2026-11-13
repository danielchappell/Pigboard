# Pigboard structured ticket contract v1

Use readable Jira headings, labels, lists and tables. This is a text contract, not
a new custom-field schema or parser. Keep the four sections and exact labels below.
IDs make requirements, cases, findings and evidence refer to the same things across
stages; prose supplies their meaning. Never infer authority from a label or body.

## Where information belongs

| Source | Owns |
| --- | --- |
| Native Jira fields | Project, Story type, parent epic, human assignee, workstream label, status and issue key. Use supplied/verified values; do not duplicate a competing copy in the description. |
| Story description | Accepted scope, one repository/base, requirements, all cases, named skill order, expected outcomes and explicitly declared preparation slots. |
| Implementer handoff comment | Same PR/branch, exact revisions, accepted plan/review, verified local/CI results, completed preparation slots and accessible artifacts. |
| PR pipeline comment | Environment URL, readiness, deployed revision and pipeline provenance. Never copy credentials or turn a guessed URL into readiness. |
| Trusted run configuration | Allowed actions/destinations, credentials, connectors, transition IDs, evidence storage and actual model/CI limits. Actual run links/IDs are optional evidence metadata; no exclusive-run/visit-ID prerequisite applies to the basic MVP. These are not authoring fields. |
| Reviewer and QA comments | Exact-revision verdicts, findings, coverage, retained evidence and actual handoff receipts. Use existing stage report contracts. |

A missing configured runtime capability blocks execution. It does not require the
writer to invent a new ticket field. A Story need not have a PR or deployment before
implementation starts. Once they exist, keep one linked PR throughout rework.

## Description template

Replace angle-bracket placeholders before readiness. Use `None — <reason>` when a
conditional item genuinely does not apply. `Unresolved — <question; owner>` makes
an item provisional, not ready. Never put a secret value in the ticket or evidence.

```markdown
Problem to solve

<Current problem, affected person/system and usable outcome in two or three sentences.>

Acceptance Criteria

- AC-01: <Observable outcome, including the exact expected behavior.>
- AC-02: <Required boundary/failure/permission behavior, when applicable.>

Technical Acceptance Criteria

- Ticket contract: pigboard-story/v1
- Repository: <Unambiguous repository URL or organization/repository.>
- Base branch: <Verified branch name.>
- Change boundary: <Components/behavior this repository owns and may change.>
- Out of scope: <Explicit exclusions; related work remains separate.>
- Related repositories: <Responsibilities/contracts and linked separately owned work, or None — reason.>
- Accepted decisions: <Relevant authoritative decisions/contract links, or None — reason.>
- TAC-01: <Required technical/security/data/compatibility constraint, when applicable.>

Testing Strategy

- Testing types: <UI, API, database, or the explicitly configured other type.>
- QA dispatch: <Entry-point-owned step IDs, in order. Child steps are listed beneath their caller, not dispatched twice.>
- Test data and access: <Known actor/tenant, role/permission, nonsecret access reference, data state and owner; never credentials.>
- Environment source: <Pipeline-owned PR environment comment for deployed QA; other approved supplied target only if this test type requires it.>
- Execution preparation: <P-01 etc: exact mechanical detail implementer must supply; or None — details already prepared.>

### TC-01 — <Case purpose>

- Requirements: <AC/TAC IDs this case proves.>
- Actor: <Explicit role and tenant/test identity reference.>
- Preconditions: <Data, flags, access and prior case/step outcomes; or None — reason.>
- Case dependencies: <Exact case/step IDs and required outputs, or None — independent.>

| Step | Caller | Skill | Action / prepared artifact | Input and output bindings | Expected outcome | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| TC-01.S1 | qa-entrypoint | <exact skill ID> | <Prescribed action; existing artifact or preparation slot ID> | <Named input and returned output, or None> | <Explicit result grounded in AC/TAC> | <Screenshot checkpoint or request/query/result evidence> |

- Observation limits: <Prescribed finite schedule/deadline if asynchronous; otherwise None — synchronous.>
- Cleanup: <Prescribed authorized bounded steps and owner, or None — read-only/no persistent test changes.>
- Manual QA: <How a human executes/inspects these same steps, not a second case list.>

<Repeat the complete case block for every required acceptance case.>

- Automated regression: <Broad behavior and suitable automated test level to add/update.>
```

Do not add empty AC/TAC entries to satisfy the template. Coverage is against every
actual AC and testable TAC. Preserve IDs during editing; new requirements/cases get
new IDs. Renaming an ID needs an explicit mapping in the handoff. Do not silently
reuse a removed ID for another requirement.

## Ordered skills and bindings

The currently bundled QA skills are `qa-api`, `qa-bruno`, `qa-database` and `qa-ui`.
Name exact identifiers; the testing type alone never selects a skill. A different
skill requires explicit preparation/approval before readiness, not an invented name.

Every step has one caller. A direct step names `qa-entrypoint`. A wrapper's child
names its parent step ID. For API execution, prescribe `qa-api` as the assessment
step and `qa-bruno` as its request-execution child. Include both in the table:

| Step | Caller | Skill | Purpose |
| --- | --- | --- | --- |
| TC-01.S1 | qa-entrypoint | qa-database | Prepared baseline observation |
| TC-01.S2 | qa-entrypoint | qa-api | Assess the stated API outcome; owns S2.1 |
| TC-01.S2.1 | TC-01.S2 | qa-bruno | Execute the exact prepared request/assertions once |
| TC-01.S3 | qa-entrypoint | qa-database | Prepared after-observation using S2.1's returned ID |

The dispatch list is S1, S2, S3. S2.1 is executed only by S2. Specify an exact field
binding such as `TC-01.S2.1.response.id -> TC-01.S3.params.record_id`; the implementer
may prepare the concrete extraction syntax, never guess a different record at QA.
A child receipt counts as execution; do not repeat it at entry-point level.

For database steps, prescribe engine, selected prepared read-only reader, required
record/tenant/column scope, observations and expectations. SQL/parameters may be
explicit preparation slots. For UI steps, prescribe visible actions, expected
states and screenshot checkpoints; required browser/viewport/device coverage must
be explicit, not invented. For API steps, state method, operation/route where
established, input, auth role, expected status/body and downstream checks. Do not
require Postman when the named prepared executor is Bruno.

## Readiness by stage

**Ready for implementation:** native metadata and repo/base/boundary are resolved;
accepted requirements and complete cases have explicit expectations, ordered skills,
actors/data/access requirements, dependencies, observation limits and cleanup. All
scope/product/security decisions are resolved. Required runtime/tool/access setup
is separately prepared by its owner. Only listed mechanical preparation slots may
remain for implementation. Estimate and delivery dependencies stay in the plan;
respect one repo/PR, at most 20 changed files and less than two working days.

A preparation slot says `P-01 — owner: implementer; supplies: <exact artifact/binding>;
used by: <step IDs>; acceptance: <what the prepared detail must preserve>`. It cannot
stand for missing requirements, expected results, selected skills, access decisions
or arbitrary environment discovery. The implementer may add verified route/fixture
and command details within the accepted scope. Required scope growth blocks for a
human. It cannot silently rewrite the test to fit its implementation.

**Ready for Review:** the implementer links the same PR and exact source/base;
records plan plus one independent review, actual local checks and current required
passing CI; supplies every preparation slot in a handoff comment/table with exact
artifact paths/revisions and access references. Unfinished slots cannot be handed
to QA as discovery work. The reviewer checks the resulting instructions against
all original cases and requirements.

**Ready for QA:** reviewed execution details are complete and accessible; every
prescribed tool/access target is available; the open PR, approval, source/target
and required CI are current; environment-dependent cases have the matching ready
pipeline comment; evidence capture/retention and authorized cleanup are prepared.
The QA agent executes the table, not a newly designed suite.

Missing or conflicting required fields block the affected stage. An unexpected
prerequisite blocker stops QA and marks remaining cases NOT RUN. Confirmed product
defects can continue independent prescribed cases; their dependent cases are NOT
RUN. This contract does not change the entrypoint's verdict/handoff precedence.

## Stage output pointers

Keep the case definitions and expected outcomes in the description. Stage comments
link their actual records without replacing the requirements body:

- Implementer: [input and handoff contract](../../implementer-entrypoint/references/handoff.md).
- Reviewer: [Jira handoff](../../pigboard-pr-review/references/jira-handoff.md).
- QA: [ordered evidence ledger](../../qa-entrypoint/references/execution-record.md).

Pin artifacts to the reviewed revision. Record the requirement content fingerprint
at execution; the writer does not invent a future hash, run ID, approval or result.
If requirements materially change, existing evidence covers only its recorded inputs.
