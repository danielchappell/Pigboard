# Using Pigboard as an agent

Pigboard skills are instructions plus references and, where needed, prepared tools.
An agent loads the relevant `SKILL.md` and follows its input, execution and reporting
contract. [Install the complete bundle](install.md) before delivery runs. Reading a
skill from a reviewed checkout is also useful for authoring or inspection; it does
not register the skill with a host or prepare its execution dependencies.

The target application's instructions apply to work on that application. Pigboard's
[contributor agreement](../CONTRIBUTING.md) applies when changing Pigboard itself.
Do not impose its two-reviewer gate on customers: the installed implementer uses
one independent plan reviewer. Installation grants neither service access nor
permission to publish, transition, merge or deploy.

## Choose the capability

The [bundle manifest](../config/skill-bundle.json) lists twenty-two skills. These are
entrypoints and helpers, not twenty-two autonomous workers:

| Skill | Use and minimum context |
| --- | --- |
| [write-pr-sized-stories](../skills/write-pr-sized-stories/SKILL.md) | Author or split scoped work from supplied requirements and verified repository ownership. Reads human-writing and its ticket references. Drafting does not authorize Jira publication. |
| [implementer-entrypoint](../skills/implementer-entrypoint/SKILL.md) | Compose one authorized native Story/Bug in In Progress using its current versioned assignment, verified scope, High/Medium controls and prepared tools. |
| [implementer-job](../skills/implementer-job/SKILL.md) | Plan/execute the assigned code, same PR, current CI and prepared artifacts. Returns evidence; never changes Jira. |
| [planner](../skills/planner/SKILL.md) | One source-grounded implementation plan from the job's verified assignment; no scheduling or execution approval. |
| [investigate-codebase](../skills/investigate-codebase/SKILL.md) | Read the affected flow, suitable reuse and constraints needed for a specific engineering decision. |
| [design-change](../skills/design-change/SKILL.md) | Choose or reuse the design, ownership and interfaces within the agreed scope. |
| [engineering-principles](../skills/engineering-principles/SKILL.md) | Shared judgment loaded once per phase; no extra report or authority. |
| [diagnose-problem](../skills/diagnose-problem/SKILL.md) | Bounded investigation of an unexpected result; return a supported correction and recovery route to the job. |
| [verify-change](../skills/verify-change/SKILL.md) | Final author checks, relevant intermediate checks and a repeatable verification recipe for the exact code state. |
| [implementer-jira](../skills/implementer-jira/SKILL.md) | Read-only preflight or final typed append/read-back/recheck/direct transition. Never edits code/PRs or admission state. |
| [pigboard-pr-review](../skills/pigboard-pr-review/SKILL.md) | An authorized native Story/Bug in In Review and its current open Bitbucket PR, target instructions, prepared review tools and independent High profile. Owns current-revision evidence and PR approval; composes reviewer-jira for Jira handoff. |
| [reviewer-jira](../skills/reviewer-jira/SKILL.md) | Read-only current assignment/implementation preflight or one canonical final publication/read-back/recheck/direct transition; never reviews code or changes PRs. |
| [qa-entrypoint](../skills/qa-entrypoint/SKILL.md) | An authorized Story in QA, reviewed open PR/current CI, prescribed cases, prepared artifacts, required ready preview/access and evidence destination. Dispatches only the named QA skills in order. |
| [qa-jira](../skills/qa-jira/SKILL.md) | Read-only eligibility preflight or standalone publication of a complete prepared QA assessment for the current native Story/Bug, assignment/review/open PR and configured tools. Executes no helpers; retained dispatcher integration remains PGB-78. |
| [pr-review](../skills/pr-review/SKILL.md) | Shared review criteria and saved review-state contract; used by pigboard-pr-review. Read it for review mechanics, not as a replacement for the Jira stage wrapper. |
| [pr-commenting](../skills/pr-commenting/SKILL.md) | Publication and existing-thread handling for review comments. Requires the specific PR, findings and authorized tool route. |
| [request-rework](../skills/request-rework/SKILL.md) | Explicit human record-and-queue request, in-scope findings/evidence, current Human Review assignment and compatible completed QA chain on the same open PR, configured actor/tools and durable output. Human invoked; no automatic worker. |
| [human-writing](../skills/human-writing/SKILL.md) | Clear writing for work items, reports and comments, using the supplied facts and intended audience. |
| [qa-api](../skills/qa-api/SKILL.md) | Assess prescribed API cases with exact expectations and named prepared execution helpers. |
| [qa-bruno](../skills/qa-bruno/SKILL.md) | Execute the assigned prepared Bruno requests/assertions with supplied environment, access and evidence requirements. Locked CLI dependencies are installed beforehand. |
| [qa-database](../skills/qa-database/SKILL.md) | Prepared read-only observations with exact queries, parameters, permitted data and restricted access. The bundled reader is PostgreSQL; do not infer DynamoDB support. |
| [qa-ui](../skills/qa-ui/SKILL.md) | Prescribed UI cases using prepared computer use, test identity/data, a supplied target and inspected screenshot evidence. |

See [engineering skills](engineering-skills.md) for the composed planning, diagnosis
and verification flow, worked examples and current trial limits. Read the selected
skill for its complete contract. Structured QA helpers receive
complete bounded AI step inputs and original expectations from an authorized
caller; the retained QA entrypoint does not yet construct these inputs. Helpers
do not select new work or change the whole ticket's stage. Preserve required sibling references.
Load only assigned helpers, preserving case order and avoiding duplicate execution
when one helper delegates a step to another.

## Authoring and direct reuse

An agent that can read Markdown can use the writing/authoring instructions with
supplied context. For example, after preparation, substitute the actual `skills`
path returned by the installer:

> Read `<skills>/write-pr-sized-stories/SKILL.md`. Turn the supplied agreed scope
> into a draft work item for the verified repository and base branch. Use its
> versioned Epic or Story/Bug YAML template for Pigboard authoring. Validate saved
> raw YAML with the shared checker. Identify unresolved inputs;
> keep research/design as Tasks. Return the draft for review.

The writer keeps four readable sections inside complete YAML, with stable IDs,
explicit nulls/lists and every prescribed AI/human case. See its
[ticket guide](../skills/write-pr-sized-stories/references/pigboard-ticket.md),
[Epic guide](../skills/write-pr-sized-stories/references/pigboard-epic.md) and
[complete examples](../skills/write-pr-sized-stories/references/pigboard-example.md).
Use [local validation](authoring.md) with the same receipt's prepared checker.
Draft/structure need no trusted context; start does and never proves live readiness.
Missing setup/context preserves the draft and checks-not-run report. The writer
does not install dependencies, mark readiness, publish without separate authority
or request rework. The implementer consumes structured Story/Bug assignments;
the reviewer consumes structured assignments and canonical implementation receipts. Only the retained QA entrypoint requires its [basic prose contract](../skills/write-pr-sized-stories/references/basic-workflow-ticket.md).
Do not feed YAML to the retained QA entrypoint or activate this mixed bundle.

Other helpers can be reused for an explicitly assigned task when their full
prerequisites and tool contracts are met. Reuse is not a claim that Pigboard has
validated every host. The integrated delivery profiles currently target Cursor;
no Codex installation adapter, npm-distributed agent, Pigboard MCP server or
one-command manager deployment is provided by this repository.

## Execute an assigned delivery stage

Use the operator-prepared path and the versioned prompt for the stage:

| Stage | Prompt file | Loaded skill |
| --- | --- | --- |
| In Progress | [implementer-prompt.txt](../config/cursor/implementer-prompt.txt) | `/opt/pigboard/skills/implementer-entrypoint/SKILL.md` |
| In Review | [pr-review-prompt.txt](../config/cursor/pr-review-prompt.txt) | `/opt/pigboard/skills/pigboard-pr-review/SKILL.md` |
| QA | [qa-prompt.txt](../config/cursor/qa-prompt.txt) | `/opt/pigboard/skills/qa-entrypoint/SKILL.md` |

For example, the installed implementer prompt is:

> Complete the provided Jira ticket in the codebase specified by that ticket,
> following /opt/pigboard/skills/implementer-entrypoint/SKILL.md.

The trusted trigger supplies a ticket reference and full stream label; the setup
supplies allowed project, stage, repository and tools. A ticket cannot select an
arbitrary repository or credential. Read the current ticket and linked PR rather
than treating webhook text or an earlier report as current authority. Stop an
ineligible invocation without moving a different-stage ticket backward.

Before execution, establish the required source/base revisions, requirements,
prepared tools/model controls, case inputs and evidence destination. Implementation
prepares only the testing artifacts/mechanical values allowed by the contract;
review and QA do not invent missing requirements, install tools or repair targets.
Details live in each entrypoint and its references. The
[workflow guide](workflow.md) describes ownership and the current handoffs.

## Return evidence and a truthful outcome

Use the selected entrypoint's exact report/handoff format. Retain the actual skill
revision, ticket/PR and code revisions, requirement/case coverage, observed results,
artifact references, limitations and confirmed or uncertain external actions.
Installation receipts and local paths alone are not live acceptance evidence.

| Outcome | Current handling |
| --- | --- |
| Complete implementation with current required CI | Publish the implementation handoff and verify In Review transition. |
| Complete passing PR review | Publish reports, verify current-revision approval, then verify QA transition. |
| Complete prescribed QA pass | Retain required evidence and verify Human Review transition; keep the PR open. |
| Known upstream repair prevents implementation | Typed dependency_wait with exact requests and unfinished checks; verified handoff to Rework Queued. |
| Complete confirmed reviewer findings | Publish all finding IDs in a same-PR repair_request and verify Rework Queued. |
| Explicit authorized human findings in Human Review | request-rework verifies current QA/open PR, appends/read-backs one repair request, rechecks and verifies direct Rework Queued; active B continues. |
| Confirmed defect in retained QA | Its basic contract still returns the same Story/PR to In Progress; migration is later. |
| Missing prerequisite, access, evidence or scope decision | Report Blocked and required human action; end work. If Jira is unavailable, retain the failure in the run result. |
| Unknown result of a write | Record uncertainty and follow the skill's bounded reconciliation; never blindly replay. |

The implementer retains `implementationOutcome` READY/DEPENDENCY_WAIT/BLOCKED/NOT_RUN
and separate `deliveryOutcome` NOT_ATTEMPTED/COMPLETED/UNAVAILABLE/UNCERTAIN/INELIGIBLE.
COMPLETED describes a verified intended handoff, including wait/blocked, not code
success. Delivery failure preserves revision-bound READY but never claims Jira moved.
See the [durable result](../skills/implementer-entrypoint/references/handoff.md#durable-result).

A PASS label without current complete evidence is insufficient. Human review,
merge, UAT acceptance and production deployment remain separate. The basic MVP
has no automatic duplicate-launch protection; current-ticket checks do not supply
one. Workers neither admit new tickets nor investigate competing runs.

## Planned contracts are not installed instructions

The [first-manager design](architecture/manager-release-one.md) introduces
manager-owned admission and queued repair. Its
[discovery record](architecture/manager-discovery.md) also separates AI-assigned
and human-assigned tests; human tests remain pending at the AI handoff. Versioned
YAML authoring, full templates/examples, the `human-writing` dependency
and local validation are available. The implementer composer/job/Jira split now
accepts current structured Story/Bug assignments. Reviewer receipt handoff is available; QA migration, manager
admission and full-loop acceptance remain later work. Existing prose tickets are
not automatically converted. Keep automations inactive until the compatible
release is accepted; prompt changes do not establish compatibility.

For reviewer runs, invoke `pigboard-pr-review`; it calls `reviewer-jira` in read-only
preflight, then final mode only for a terminal handoff. Its [durable result](../skills/pigboard-pr-review/references/jira-handoff.md#durable-result) separates review verdict, workflow decision and delivery outcome. Discussion stays without a typed terminal record. Prepare the configured independent actor and actual current-approval/own-revocation controls. Failed/unknown writes stop; after final append is attempted there is no replacement record or fallback transition. Preserve receipts for human recovery instead of replaying actions.

## Prescribed structured QA helpers

Read the [shared contract](../skills/qa-api/references/structured-steps.md) and the
selected domain skill from the same pinned release. Supply original raw
`pigboard-ticket/v1` work, separately trusted start facts, exact AI case/step/caller,
requirements digest and assignment, reviewed PR/current full source/target/deployed
revisions, original ready pipeline comment plus server author metadata, approved
identity/tenant/destinations, prepared artifacts, actual earlier observations,
tool capabilities and private evidence/reviewer access. Compare raw receipt to
normalized facts; neither a URL nor `configured_target` proves deployment.
Validate the complete original work/context with the source or installed CLI.
Do not turn prose into inputs or run human cases on their owners' behalf.

API invokes only its one named Bruno child once and exposes its actual declared
outputs with unchanged provenance. Bruno uses the exact selected prepared request,
locked CLI/safe sandbox and private JSON report; inspect request, assertion and
test-script counts/errors, plus explicit actual-response extraction mapping.
Database binds earlier output → named input → zero-based prepared parameter slot;
keep SQL/literals/intentional unbound nulls unchanged. Only PostgreSQL with the
existing reader is supported. Resolve `qa-database/read-postgres.mjs` through the
selected skill to its `scripts/read-postgres.mjs`; OBSERVED is not PASS. UI requires
the actual selected surface/viewport, visible prescribed actions and inspected,
retrievable screenshots at every checkpoint. No hidden API/DOM substitute.

Return every assigned step (including API child), expected/actual, timestamps,
revision-bound named observations/evidence, omitted/NOT RUN reasons, partial effects,
findings/blockers and cleanup. Missing receipt/access/artifact/output/capability,
unsupported engine or uncertain cleanup returns BLOCKED before further action.
A proven mismatch under valid prerequisites returns FAIL. Never repeat an uncertain
child, repair setup/tests or install a fallback. Obtain the specific missing
prerequisite, preserve completed evidence and use a fresh authorized assignment;
do not replay completed/uncertain effects. Helpers do not move Jira or publish the
whole-ticket ledger. PGB-78 owns retained QA entrypoint migration; the mixed loop
remains inactive. Human H01/H02, hosted CI and release acceptance remain separate.

### Fixed source-only preparation example

For the designated developer/human QA reviewer, the fixed fixture exports one
synthetic `record-001`/`tenant-a`/`ready` journey and a distinct inaccessible tenant-b
row. It is test-only, not installed or a helper executor. Node 20+, the committed
source and locked dependencies must already be prepared. Choose an owned private
run directory and unused loopback HTTP/PostgreSQL ports. Run before any helper:

```sh
PGB77_SOURCE=/absolute/committed/pigboard
PGB77_RUN=/absolute/private/disposable-run
node "$PGB77_SOURCE/test/fixtures/qa-helper-case.mjs" prepare "$PGB77_RUN"
node "$PGB77_SOURCE/test/fixtures/qa-helper-case.mjs" serve "$PGB77_RUN" HTTP_PORT
```

`prepare` writes the collection/selected request and unselected sentinel, immutable
query/seed, work/context templates, explicit response-output mapping, DB context
and UI assets. `serve` binds 127.0.0.1 only; retain its actual endpoint/PID receipt
and private method/path/time audit. It does not seed a database or assert results.
Inspect `preparation.json`: fill actual endpoint, installed/source full revision,
mock raw PR receipt/metadata, separately trusted scope, DB/TLS/role evidence and
supported UI surface/viewport/retention receipt. Freeze matching complete operation
facts and input/artifact hashes. Templates are **not ready** until these facts are
established; do not invent deployment, role or viewport proof. Validate `work.yaml`
and `facts.yaml` after preparation; JSON text is valid YAML for these templates.

Prepare a disposable existing PostgreSQL installation separately as fixture owner:
private cluster/socket/unused port, loopback only, TLS with short-lived CA and
localhost/127.0.0.1 SAN, key mode 0600, hostssl SCRAM for only the fixture DB/reader,
non-TLS rejection. Apply `seed.sql`; create `qa_reader` with no super/create-db/
create-role/replication/bypass-RLS/membership/ownership privileges, only database
CONNECT, schema USAGE and SELECT on the three columns. Enable/force RLS with the
tenant-a policy in the seed. Owner administration uses only the owned private
socket, never QA credentials. Retain actual grants/policy/TLS proof separately;
provide QA only restricted access. Keep ephemeral password out of commands/source/
shared reports; supply runtime `PGB77_DATABASE_URL`, `QA_DB_CA_FILE` and
`QA_DB_TLS_SERVERNAME=localhost`. URL/context must agree on numeric 127.0.0.1,
port/database/qa_reader, with no URL options. Never weaken TLS or repair during QA.

Install the exact local committed candidate into an isolated root with the real
installer before local instruction exercises (customer installs use published
reviewed revisions). Inspect its receipt, twenty-two entrypoints, seven smoke checks,
locked dependency versions and hashes. Use the receipt's `skills`, not stableSkills:

```sh
node "$PGB77_SOURCE/scripts/install-cursor-skills.mjs" --source "$PGB77_SOURCE" --ref FULL_COMMIT --app "$PGB77_RUN/app" --root "$PGB77_RUN/installed"
# From any unrelated working directory, using receipt-derived PIGBOARD_SKILLS:
node "$PIGBOARD_SKILLS/work-validator/scripts/validate-work.mjs" --mode start --input "$PGB77_RUN/work.yaml" --context "$PGB77_RUN/facts.yaml" --json
# From the prepared collection directory, using supplied absolute roots:
"$QA_BRUNO_ROOT/scripts/node_modules/.bin/bru" run selected.bru --sandbox=safe --bail --noproxy --reporter-json "$PGB77_RUN/bruno-report.json" --reporter-skip-all-headers
node "$QA_DATABASE_ROOT/scripts/read-postgres.mjs" "$PGB77_RUN/db-context.json" PGB77_DATABASE_URL "$PGB77_RUN/query.sql" "$PGB77_RUN/bound-params.json"
```

The caller must read/execute the installed helper instructions; running engines
alone proves only engine behavior. Use the actual Bruno report's explicit mapped
record ID for both parent observation and generated bound-params array; the frozen
expectation is not an observation. Audit one selected request/zero sentinel and
one database **observation** query (existing reader prerequisite catalog queries
are separate), original/bound parameters, rows, rollback/close and unchanged SQL.
Through supported computer use navigate `/ui`, capture/inspect/retain start,
enter that actual ID, capture input, activate Lookup once, then capture result.
Record actual dimensions and retrievable image references; inability to retain
means BLOCKED. No guessed artifact paths or viewport/mobile claims.

For isolated H02 preparations, preserve coherent inputs except the single missing/
stale/untrusted receipt, absent selected request, wrong-tenant output/access,
unsupported engine, unavailable UI evidence capability or unresolved child receipt.
Retain supplied mock history as mock and observe zero new operation calls; do not
manufacture an uncertain write. An isolated `response.json` state `pending` variant
keeps the prepared `ready` assertion unchanged to demonstrate FAIL. No retry/test
repair. These exercises do not mark designated human H01/H02 complete.

After retaining sanitized evidence, stop only the owned HTTP process and private
PostgreSQL cluster (`pg_ctl -D OWNED_PGDATA stop`), then remove only owned disposable
output. Preserve uncertain cleanup instead of claiming it succeeded. The reader's
advertised missing standalone test suite is pre-existing PGB-103; do not install/
restore it here or claim it passed. Direct reader regressions/local fallback and
actual installed-helper acceptance are distinct evidence categories.

## Ask your assistant to queue human findings

After installation, load `<receipt.skills>/request-rework/SKILL.md` and its complete
example. For example: “For EX-1, F01: searching the exact saved-filter name gives
no result; F02: the no-match message is unclear. Expected: exact-name results and
understandable wording under AC-01. Evidence: the supplied current-PR observations.
I authorize recording these in-scope findings and queueing EX-1 for rework.”

Prepare trusted config, native identity/full stream, current compatible completed QA
chain, open-PR/evidence reads, configured human actor and direct append/read/transition
capabilities beforehand. Retained QA does not produce that chain yet; missing
compatible evidence means inability, not an invented QA completion. No manual card
drag or extra routine approval is required when the explicit authorization exists.
Story writing stays separate. Discussion/new scope/stale facts make no queue move.
Already queued work is inspected without another append or transition; additional
findings are retained as unrecorded. Unknown publication or transition stops without
retry. The result distinguishes the recorded request from confirmed queueing; the
manager later admits A when its separate normal gates pass, while B continues.

[The complete example](../skills/request-rework/references/example.md) supplies exact
source/installed validation commands and all twelve fixed PREP-01 variants. These
are synthetic local instruction exercises, not live Jira or completed human
acceptance. It explains dependency preparation, evidence retention and cleanup.

## Publish prepared QA evidence

Load `<receipt.skills>/qa-jira/SKILL.md` directly. The source entrypoint is
[qa-jira](../skills/qa-jira/SKILL.md). It is the permanent publication/failure
contract; the retained qa-entrypoint remains incompatible until PGB-78 integrates
it. The caller retains evidence and supplies an assessment; this skill executes
no QA helpers and makes no human test pass.

Supply these named instruction inputs (references contain no secret values):

```yaml
mode: preflight # later invoke final separately; final repeats current checks
scope: /private/run/scope.yaml # trusted config, site/project/full stream, native ID/type/stage, allowed repository/PR/actors
capabilities: /private/run/prepared-capabilities.json # same-release immutable validator root, Jira/PR/evidence reads, append/exact read/direct transitions/status, private destination/audience
work:
  raw: /private/run/work.yaml
  format: yaml
  start_context: /private/run/facts.yaml # separately trusted original bytes
assignment: /private/run/current-pointer.json # lookup hint; actual verified pointer wins
prepared_assessment: null # final: /private/run/assessment.json
known_requests: [] # final wait: exact typed request references + unresolved evidence
retained_delivery: null # if present, original bytes/UUID/known receipts/uncertainty and explicit existing resume
```

Preflight requires no invented finished assessment or deployment for static work.
For final, supply the complete actual `qa_report`, declared findings, detailed
observations/artifacts, coverage counts, cleanup and case-specific reuse basis.
For example, static human-only work has `steps: []`, the exact two prescribed human
IDs and the original `no_ai_cases_reason`; its result reports zero AI work and
pending humans. It still needs the current PR/review/CI. A partial assessment
retains an earlier FAIL/finding and all later NOT_RUN rows/reasons. If a later
access inability remains unresolved, propose Blocked while retaining the defect;
if a real unresolved typed upstream request prevents completion without inability,
propose dependency_wait. The skill verifies the actual evidence and route itself.
PASS/FAIL claims always require their actual tested PR and environment proof.

The returned structured object separates `test_verdict` from `delivery_outcome`,
includes complete rows/findings/humans, counts/cleanup/evidence/limitations and
known publication/transition/status receipts. `COMPLETED` means the intended native
status was independently observed, including delivery to Blocked. Preflight and
discussion have `NOT_ATTEMPTED`. Preserve UNAVAILABLE/UNCERTAIN results and full
original evidence locally. Never replay an attempted append or transition. One
bounded resolving read may establish conclusive success; otherwise stop with the
known actions, uncertainty and exact human recovery required. Only an existing
valid explicit canonical resume chain permits a later result slot.

### Prepare source-only simulated publisher inputs

From the source checkout, supply a fresh absolute private root whose parent exists:

```sh
node --input-type=module -e 'import {prepareQaFixture} from "./test/fixtures/qa-helper-case.mjs"; await prepareQaFixture(process.argv[1], {suite: "publication"});' /absolute/private/pgb110-case
```

The command refuses an existing root/unsupported suite and returns NOT_READY
preparation, not a test result. It creates fixed inputs, labelled supplied/mock
PNG evidence, operator-only cards/expectations/validator candidates, invocation
instructions and empty output folders. It starts no server, database or browser.
Bind the reviewed source/installed commit, manifest and input hashes before use.
Keep `operator/expectations.json` and `operator/validator-inputs` withheld from the
executing skill. Read generated `manual-echo.md`: the operator captures the actual
submitted transport and echoes only those unchanged bytes with preselected fixed
server metadata; never inject a fixed terminal candidate, UUID or expected outcome.
Retain the request/response derivation audit and independently validate actual
produced output. Inspect the mock PNG contents; it is never a live screenshot.

These source-only packets support simulated instruction exercises, separate from
real provider/Grok execution, default installed acceptance and the three native
human cases. Retain sanitized commands/results, hashes, ordered calls, mutations,
actual model/profile, native status or unknown, cleanup and human action before
removing only the owned disposable root. R1-24-H01/H02/H03 remain human-owned until
the designated developer and QA reviewer execute them.

## Prepare prescribed QA inputs

PGB-132's source-only PREP-01 exports the finite I01–I14 inputs for human-owned
R1-27-H01/H02/H03. Use the already prepared same-release source checkout and
immutable installed skills. This command creates a fresh private folder; it
runs no helpers, timers, model, provider transport or publication:

```sh
node --input-type=module -e 'import {prepareQaFixture} from "./test/fixtures/qa-helper-case.mjs"; await prepareQaFixture(process.argv[1], {suite:"dispatch-inputs"});' /absolute/private/fresh-run
```

Use a new absolute path each time. Existing paths are rejected, preserving prior
failed evidence. The default `prepareQaFixture` publication suite, older local
helper `prepare`/`serve` commands and fixed histories are unchanged. The source
preparer is not installed into customer bundles.

`preparation.json` lists every variant. Each `cases/<variant>/input/` contains:

- Full original `work.yaml`, separately trusted mock `facts.yaml`, customer
  `scope.yaml`, current-review `predecessors.json` and exact `known-requests.json`.
- Separate `access.json` and pipeline/server metadata in `cards.json`. Mock access
  and deployment facts are labelled mock and grant no live permission.
- The selected Bruno request/assertions, `extraction.json`, SQL and parameter
  layout, database context, UI route/browser/viewport and named screenshot cards.
- Finite `clock.json`, operation bounds, capabilities and a hashed `index.json`.
  These are supplied inputs; the preparer executes no schedule.

`output/` is empty. `operator/` is outside each consumer root and must be withheld.
No current terminal record, assessment, verdict or final ledger is supplied.
Designated human cases remain NOT RUN. The I13 control alone keeps the required
historical partial observations, blocker and later human authorization; they are
historical supplied/mock inputs, with separate case-specific reuse proof.

Before exercising a variant, record `git rev-parse HEAD`, the SHA256 of
`test/fixtures/qa-helper-case.mjs`, the exact immutable installed `skills` root,
its source revision and manifest/payload hashes from the preparation/install
receipt. Record each emitted input's actual SHA256 and compare the hashes in
`input/index.json`; hash the index itself too. `preparation.json` remains
`NOT_READY` until these bindings and the chosen exercise capabilities are supplied.
Do not use a mutable installed link as revision proof. Fixed `.invalid` destinations,
dummy identity and simulated database/TLS facts are mock inputs, not usable live
connection credentials or hosted acceptance.

For R1-27-H01, choose fresh I01 Story and Bug folders. An independently authorized
caller opens the immutable installed `qa-api/SKILL.md` and common structured-step
reference. Supply full raw work/context, scope, exact assignment/current review,
PR/revision, access, capabilities, output/audience and exact case/step/caller.
Top-level logical caller is `qa-entrypoint`; trusted invocation must establish its
identity and action scope independently of the ticket. Run the API unit once;
it alone calls its named Bruno child. The fixed operator responds only to actual
requested tool actions using the frozen cards and retains request/response audit.
Keep all helper output under `output/`, labelled supplied/mock.

Use the actual child's declared output and original report pointer to expose the
parent output. Pass that actual value and provenance through the declared DB and
UI bindings; never use the requirement's expected ID or prefill a bound parameter.
Invoke the installed database and UI instructions for their exact units. Inspect
the original query, parameters, rollback/close evidence and actual three UI
checkpoint screenshots. A card is an input response; a helper's actual retained
result is the observation. These exercises do not prove live Bruno, PostgreSQL,
browser or deployment behavior.

Independently assess those actual results, preserving every row, finding, unknown
effect and pending human. Invoke immutable `qa-jira/SKILL.md` in `preflight`, then
`final` when appropriate, with that actual `prepared_assessment`, full raw work
and trusted context, scope/capabilities, assignment, original predecessors,
known requests and any valid retained delivery. The publisher owns destination,
append/readback, transition and uncertain-write recovery. For simulated stored
writes, echo only the actual submitted transport bytes with the fixed card's
metadata; retain ordered calls and actual/unknown status. Never inject an expected
record, verdict, UUID or route. Use the existing standalone publisher guidance
above; the legacy full `qa-entrypoint` remains incompatible until PGB-78.

For R1-27-H02, inspect positive controls and the named missing extraction,
query/parameters, checkpoint, identity/tenant, bounds and cause variants in fresh
folders. Run only the applicable existing read-only validation/preflight. Some
missing artifact facts belong to instruction preflight rather than the raw work
schema; start-valid declarations alone do not mean execution-ready. Do not fix a
negative by guessing a fact, inferring permission or changing case expectations.

For R1-27-H03, inspect static human-only work, all-NOT_RUN missing-environment,
partial observations without proof, earlier mismatch then inability, pure wait,
mismatch plus wait and retained-evidence controls. A typed unresolved request
needs its actual current-case cause. Any supplied PASS/FAIL or reused claim needs
nonnull tested PR and trusted matching environment proof. Static human-only work
needs no invented environment. Preserve prior findings when a later unit cannot
run. I12 contains only the existing publisher's unknown-write seam; it does not
repeat the publication matrix or permit replay.

When a required fact is missing, retain the original inputs, exact missing
field/artifact/consumer, parser or preflight diagnostics and actual partial results.
Ask the named preparation/access owner for that fact through the authorized
workflow. Stop the affected prescribed check after its bounded attempt; an
untestable case remains unverified for the authorized human decision. The PGB-110
evidence exception does not transfer. Do not reconstruct a result or retry a
completed action. Retain sanitized evidence first, then remove only the owned
disposable fixture folder; this preparer creates no services or live resources.
