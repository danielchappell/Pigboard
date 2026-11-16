# Author a versioned Story or Bug

Use [ticket.yaml](ticket.yaml) as the complete editable body for
`pigboard-ticket/v1`. The short title sits above the body in native Jira metadata.
Story and Bug use the same body schema. Native Jira owns type, key, project,
parent Epic, assignee, full workstream labels and status. Do not add those keys
to the closed work schema. Drafting does not authorize publishing or changing them.

The [worked examples](pigboard-example.md) include a mixed Story and a human-only
Bug, with separate synthetic validation contexts. They illustrate shape and
meaning; they grant no permission for real work.

## Fill the full template

Retain every declared field, including optional nulls and inactive alternatives.
Use `null` for unresolved values, never empty strings, dummy credentials, invented
paths or angle-bracket placeholders. Replace unused optional list scaffolding
with `[]`. Repeat objects for actual requirements/cases only; `constraints: []`
is valid when none applies. On a complete step, populate only its selected
`api`, `database` or `ui` section and set the others to null. Draft permits the
full incomplete alternatives shown in the template.

Keep the four section comments and keys: Problem to solve / `problem_to_solve`,
Acceptance Criteria / `acceptance_criteria`, Technical Acceptance Criteria /
`technical_acceptance_criteria`, Testing Strategy / `testing_strategy`. Values
are short plain prose; use YAML multiline strings when useful. Maintain one body,
not a second prose requirements copy. Preserve existing AC/TAC/case/step/actor/
fixture/preparation IDs when revising. Give a changed requirement a new ID rather
than recycling an old one.

- Problem: the current problem, affected reader/system and impact.
- AC: observable outcomes, including relevant failure and permission behavior.
- TAC: exact repository URL, verified base branch, permitted change boundary and
  exclusions, related-repository responsibilities, accepted decisions and required
  technical constraints. Do not guess the base from the project name.
- Testing: every prescribed acceptance case, actors, fixtures, prerequisites,
  ordered actions, expectations, evidence and cleanup. Internal unit-test lists
  belong elsewhere; `automated_regression` names broad behavior and test level.

Each Story/Bug is one complete usable outcome in one repository and one PR,
no more than 20 changed files total and strictly less than two human working days,
including tests, configuration, docs and PR preparation. Split known larger work
into complete bounded outcomes. Resolve unknown boundaries, interfaces, security,
feasibility or sizing through a Task first. Later requested previews say
**Provisional — not ready for delivery**. Estimates, dependencies and reviews stay
in the delivery plan; explicit ticket prerequisites still belong in this body.

## Scope and trusted facts

`prerequisites` lists actual ticket keys with `required_outcome: ai_qa_complete`;
`[]` means none. Stream order is not a dependency. Other-repository changes require
separate linked Stories. Preserve every caller-supplied `context.related_changes`
repository/Story pair as a minimum obligation. That inventory is not an exhaustive
list of separately approved work: additional linked Stories may name already
allowed repositories under normal scope review. They confer no extra writes,
second PR, launch or completion authority. A `change_story` alone creates no
prerequisite edge; declare required dependencies explicitly.

Optional `contract_reference` and accepted-decision `reference` values are nonblank
supporting citations. They need not occur in `context.references`. They grant no
authority, trigger no fetch and are not source-verified by local validation.
Authors/reviewers assess their actual support. Reuse as a runtime input requires
its corresponding trusted-context membership.

The caller supplies trusted repository/branch, configured target, actor identity,
fixture, prepared artifact, database access, supplied-default viewport and full
operation facts separately. Do not derive permission or read-only/duration/SQL
bounds from work prose to make validation pass. The repository/schema links below
are contributor context, not installed relative paths or instructions to fetch.
Canonical schemas stay in the repository's
[ticket schema](https://github.com/danielchappell/Pigboard/blob/main/contracts/ticket-v1.schema.json)
and the same release's prepared `work-validator/contracts/` payload. There is no
writer-private schema.

## AI and human cases

Every AC/TAC has AI or human coverage. AI cases name only approved installed
`qa-api`, `qa-bruno`, `qa-database` or `qa-ui`. Preserve the complete case set;
unsupported engines remain null with an owned open question, never an invented
replacement. A blocked AI case cannot silently become human work.

Each top-level step names caller `qa-entrypoint` and enters `dispatch_order`
exactly once. An API parent owns one named Bruno child in the same case; both
agree on the API prescription. The child's caller is its parent ID, and the child
runs once through that parent, never again in dispatch. Bindings name outputs
from earlier steps and copy them to declared inputs. Database parameter bindings
then copy inputs to exact zero-based slots in the prepared parameter array.
Use the existing PostgreSQL reader contract, bounded records/columns/rows and
reviewed read-only operation facts. Do not invent another engine. Asynchronous
observations need the prescribed read step, finite schedule/deadline and operation
bounds; local validation checks these against separately supplied facts.

Human cases stay in `human_review.cases`, with owner role, requirements,
prerequisites, ordered steps, expected result, evidence and cleanup. Never dispatch
them or prefill PASS. An agreed all-human plan has a reason and empty AI `cases`,
`dispatch_order` and `testing_types`. CI and PR review still apply. A configured
non-runtime human review target needs no invented deployment receipt. Before an
environment-dependent human test, its owner checks the required target/revision/
readiness evidence. AI does not complete or preflight the human portion.

## Preparation and unresolved input

An implementer preparation slot may defer only a named mechanical artifact,
route, selector or parameter detail. It names its exact consumers in `used_by`
and preserves the original requirements/expectations in `preserves`. Keep both
concrete-value and preparation-ID fields present, choosing the appropriate one.
A preparation slot cannot stand for missing scope, expectations, identity,
authority or installed skill availability. Missing facts stay null and have a
question/owner in `open_questions`; this list must be `[]` before local start.
Keep the draft and report the missing inputs. Do not install/repair dependencies
inside an authoring or delivery run.

## Save, check and return

Use the shared checker on saved **raw YAML**, retaining its numeric parser
provenance. Do not parse/reserialize through an object API to bypass its numeric
checks. The two supported locations are:

```sh
# Contributor checkout: run from its root after setup.
node scripts/validate-work.mjs --mode draft --input /absolute/ticket.yaml --json
node scripts/validate-work.mjs --mode structure --input /absolute/ticket.yaml --json
node scripts/validate-work.mjs --mode scheduling --input /absolute/ticket.yaml --config /absolute/company.yaml --scheduling /absolute/scheduling.yaml --json
node scripts/validate-work.mjs --mode start --input /absolute/ticket.yaml --context /absolute/facts.yaml --json
# Prepared installation: replace with the same receipt's exact skills path.
node /absolute/receipt/skills/work-validator/scripts/validate-work.mjs --mode draft --input /absolute/ticket.yaml --json
node /absolute/receipt/skills/work-validator/scripts/validate-work.mjs --mode structure --input /absolute/ticket.yaml --json
node /absolute/receipt/skills/work-validator/scripts/validate-work.mjs --mode scheduling --input /absolute/ticket.yaml --config /absolute/company.yaml --scheduling /absolute/scheduling.yaml --json
node /absolute/receipt/skills/work-validator/scripts/validate-work.mjs --mode start --input /absolute/ticket.yaml --context /absolute/facts.yaml --json
```

Use the versioned receipt path when refresh could overlap the run. The
[installation guide](https://github.com/danielchappell/Pigboard/blob/main/docs/install.md)
explains preparation outside delivery. A missing/corrupt checker means setup is
missing: preserve the draft, report validation not run, and ask its setup owner
to restore the reviewed installation. Never claim it passed or fetch packages.

`draft` checks editable completeness; `structure` checks complete shape.
`scheduling` checks complete declarations against canonical configuration and
separate `pigboard-work-scheduling/v1` facts: exact subject site/project ID/key,
complete reachable prerequisite graph and minimum related-change obligations.
Use its selected canonical project's repository URLs and the actual installed
supported skills. There is no default project or caller skill override. Valid
mechanical preparation slots may stay unfilled while coverage, ownership,
expectations and reciprocal consumers remain complete. See the
[authoring guide](https://github.com/danielchappell/Pigboard/blob/main/docs/authoring.md#check-complete-scheduling-declarations)
for the complete example, APIs, bounds and human acceptance preparation.

`start` additionally requires its full independently prepared execution context,
including branch authority, runtime references and reviewed operations. Do not
invent future facts to pass either check. Without that context, run scheduling
for complete declarations or draft/structure for shape and report start not run.
Scheduling reports its purpose, readiness not evaluated and execution unauthorized;
it never makes the human Ready to Work decision. Configuration/facts are raw
YAML/JSON even with ADF work; do not mix raw and value API input forms. Report the selected mode,
actual result, exact missing paths and unresolved owners. Successful local start
reports live readiness not evaluated; it executes no tests and authorizes no
transition. Deliver the draft plus that concise summary. This writer does not
mark Ready to Work, publish without separate authorization, complete work, launch
a worker or request rework. Requesting rework is a separate capability; do not
simulate it when absent. Existing basic workers still require their
[retained prose contract](basic-workflow-ticket.md), pending coordinated migration.
