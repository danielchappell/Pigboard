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

The [bundle manifest](../config/skill-bundle.json) lists fifteen skills. These are
entrypoints and helpers, not fifteen autonomous workers:

| Skill | Use and minimum context |
| --- | --- |
| [write-pr-sized-stories](../skills/write-pr-sized-stories/SKILL.md) | Author or split scoped work from supplied requirements and verified repository ownership. Reads human-writing and its ticket references. Drafting does not authorize Jira publication. |
| [implementer-entrypoint](../skills/implementer-entrypoint/SKILL.md) | Compose one authorized native Story/Bug in In Progress using its current versioned assignment, verified scope, High/Medium controls and prepared tools. |
| [implementer-job](../skills/implementer-job/SKILL.md) | Plan/execute the assigned code, same PR, current CI and prepared artifacts. Returns evidence; never changes Jira. |
| [implementer-jira](../skills/implementer-jira/SKILL.md) | Read-only preflight or final typed append/read-back/recheck/direct transition. Never edits code/PRs or admission state. |
| [pigboard-pr-review](../skills/pigboard-pr-review/SKILL.md) | An authorized native Story/Bug in In Review and its current open Bitbucket PR, target instructions, prepared review tools and independent High profile. Owns current-revision evidence and PR approval; composes reviewer-jira for Jira handoff. |
| [reviewer-jira](../skills/reviewer-jira/SKILL.md) | Read-only current assignment/implementation preflight or one canonical final publication/read-back/recheck/direct transition; never reviews code or changes PRs. |
| [qa-entrypoint](../skills/qa-entrypoint/SKILL.md) | An authorized Story in QA, reviewed open PR/current CI, prescribed cases, prepared artifacts, required ready preview/access and evidence destination. Dispatches only the named QA skills in order. |
| [pr-review](../skills/pr-review/SKILL.md) | Shared review criteria and saved review-state contract; used by pigboard-pr-review. Read it for review mechanics, not as a replacement for the Jira stage wrapper. |
| [pr-commenting](../skills/pr-commenting/SKILL.md) | Publication and existing-thread handling for review comments. Requires the specific PR, findings and authorized tool route. |
| [request-rework](../skills/request-rework/SKILL.md) | Explicit human record-and-queue request, in-scope findings/evidence, current Human Review assignment and compatible completed QA chain on the same open PR, configured actor/tools and durable output. Human invoked; no automatic worker. |
| [human-writing](../skills/human-writing/SKILL.md) | Clear writing for work items, reports and comments, using the supplied facts and intended audience. |
| [qa-api](../skills/qa-api/SKILL.md) | Assess prescribed API cases with exact expectations and named prepared execution helpers. |
| [qa-bruno](../skills/qa-bruno/SKILL.md) | Execute the assigned prepared Bruno requests/assertions with supplied environment, access and evidence requirements. Locked CLI dependencies are installed beforehand. |
| [qa-database](../skills/qa-database/SKILL.md) | Prepared read-only observations with exact queries, parameters, permitted data and restricted access. The bundled reader is PostgreSQL; do not infer DynamoDB support. |
| [qa-ui](../skills/qa-ui/SKILL.md) | Prescribed UI cases using prepared computer use, test identity/data, a supplied target and inspected screenshot evidence. |

Read the selected skill for its complete contract. QA helpers get bounded cases,
step IDs and original expectations from the QA entrypoint; they do not select new
work or change the whole ticket's stage. Preserve required sibling references.
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
the reviewer consumes structured assignments and canonical implementation receipts. Only retained QA requires its [basic prose contract](../skills/write-pr-sized-stories/references/basic-workflow-ticket.md).
Do not feed YAML to retained QA or activate this mixed bundle.

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
