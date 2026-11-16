# Jira delivery workflow

Jira owns routing and ticket state. Cursor environments prepare Pigboard before an
agent starts. Entry-point skills own the work and record evidence on the ticket
and pull request. The human employee remains accountable.

## Ticket contract

The [writing skill](../skills/write-pr-sized-stories/SKILL.md) prepares versioned YAML
with [local validation](authoring.md). The structured implementer accepts native
Story/Bug current assignments through [its input contract](../skills/implementer-entrypoint/references/handoff.md#input-contract).
The [QA composer](../skills/qa-entrypoint/SKILL.md) also requires full structured
work, separately trusted start context and current canonical predecessors. The
[basic examples](../skills/write-pr-sized-stories/references/basic-workflow-ticket.md)
remain historical; no automatic prose conversion is provided. The
[reviewer](../skills/pigboard-pr-review/SKILL.md) consumes canonical implementation
receipts through [reviewer-jira](../skills/reviewer-jira/SKILL.md). Saved wiring,
installed/live acceptance and activation remain separate gates. Native
Jira metadata stays in Jira fields; accepted requirements stay in the description;
implementation/review/QA outputs use versioned handoff comments. All acceptance
cases and expectations remain on the ticket, with reviewed executable artifacts
linked from the implementation handoff.


A ready Story or Bug names one codebase and base branch, its ownership boundaries, scope
and exclusions, acceptance criteria, and the exact test strategy and cases. One
Story produces one PR, at most 20 changed files and less than two human working
days. Split cross-repository work into linked Stories before execution.

QA instructions name the skills in execution order. Each case supplies its ID,
steps or prepared request/query, expected outcome, required test data/access and
evidence requirements. Supply the PR and tested commit before QA. The configured pipeline must supply the environment URL and deployed revision in its PR comment, as
described below; do not duplicate that environment handoff on the Jira ticket. Agents do not invent missing cases, discover environments or
expand scope to make a ticket executable. Implementation records verification and
prepared testing information for review and QA.

## Stage ownership

| Trigger | Entry point | Required outcome |
| --- | --- | --- |
| In Progress | `implementer-entrypoint` | Grok High plan, one independent High adversarial plan review, Medium execution, same or new PR, passing current CI/artifacts, typed append/read-back and recheck before direct In Review; known dependency wait to Rework Queued, human blocker to Blocked. |
| In Review | `pigboard-pr-review` | Grok High review against ticket and shared `pr-review` criteria, existing comment handling, PR and ticket evidence; approve and move to QA, or publish all confirmed in-scope findings as a same-PR repair_request and move to Rework Queued. |
| QA | `qa-entrypoint` | Actual Grok High; structured inventory, exact ordered AI units and complete partial evidence; qa-jira alone publishes/read-backs and verifies Human Review, same-PR Rework Queued for repair/causal wait, or Blocked for inability. Humans stay pending. |

QA remains on the open PR. The four domain helpers now accept exact structured
AI steps under their [common contract](../skills/qa-api/references/structured-steps.md).
`qa-api` owns its one named `qa-bruno` child once; `qa-database` binds actual named
outputs to prepared read-only PostgreSQL parameters; `qa-ui` follows the supplied
surface/viewport and retains inspected checkpoints. All return revision-bound
observations and explicit inability/defect results, without Jira or human cases.
The composer follows `dispatch_order` without regrouping. It binds only actual
earlier named values with original extraction/revision/actor/tenant provenance.
Finite observations use the supplied actual clock, whole-unit/child bounds and
deadline: no overlap, missed-offset catch-up or origin reset. It retains every
attempt and one aggregate canonical PASS/FAIL/NOT_RUN row per expanded step.
Local bounded helper exercises are not full-loop acceptance or activation.

Reviewer and QA fixes queue on the same open PR; discussion stays In Review or
QA. QA retains defects during later inability, marks every unfinished row NOT_RUN
and carries the union of finding IDs only through explicit failed/skipped case
dependencies, including chains and joins. Actual causal upstream wait retains
its typed unresolved request and findings; inability takes priority. These are
source contracts, not proof that an active loop has been accepted.
The implementer composes separate [job](../skills/implementer-job/SKILL.md) and
[Jira](../skills/implementer-jira/SKILL.md) skills: code/PR evidence never mutates
Jira, while preflight/publication never edits code/PRs. Exact current assignment,
server actor metadata, requirements, actual parent/source/base and current CI
bind the result. The same still-open repair PR is mandatory; only documented
pre-first-PR dependency wait with complete no-PR history permits null. No admission,
pointer writes, worker exclusivity, deduplication or new provider engine is added.

Failed/unknown writes stop without replacement records or competing transitions.
At most one resolving read may confirm a lost response; confirmed earlier actions
are retained. Local record/chain checks do not establish live freshness. See the
[publication protocol](../skills/implementer-entrypoint/references/handoff.md#publication-protocol). Discussion alone stays in In Review or QA. Missing access, incomplete
instructions, unavailable tools or necessary scope expansion moves work to Blocked
with the reason, evidence, human action needed and stage to resume. All blocked
work waits for a human; no autonomous retry or scope expansion. The agent can
record a failed transition if its Jira access itself is unavailable.

The AI board has a separate Blocked column. Showing the previous stage on each
card and resuming it through a human-requested automation are agreed follow-up
work in [PGB-62](https://scubapig.atlassian.net/browse/PGB-62), not configured
capabilities. The [Jira setup record](jira-setup.md) captures the board mappings,
disabled rules, installation IDs and remaining access dependencies for a
future installer. Humans should not drag tickets to resume them.

Human Review is for both the responsible developer and human QA reviewer. Agents
do not merge. Product Acceptance follows human merge and UAT deployment; Done
means production deployment. Those human and release stages are not automatic
agent triggers. A human can
explicitly invoke [request-rework](../skills/request-rework/SKILL.md) for in-scope
findings on the same still-open PR. With current compatible completed QA lineage,
it verifies and appends one canonical human-request record, reads it back, rechecks
facts and verifies one direct Human Review -> Rework Queued transition. It changes
no pointer, requirements or active B and starts no worker. The manager later admits
A under its normal gates; no manual card drag is needed. Missing access/evidence,
discussion, new scope, closed PR or stale facts yields no queue transition. Already
queued work is inspection-only; unknown writes stop without replay and preserve
findings/receipts. See the [complete usage and fixed cases](../skills/request-rework/references/example.md).
The compatible QA composer supplies that typed chain through qa-jira when its
checks succeed. This does not deploy the manager or activate saved wiring.

## Deterministic wiring and setup

The dated basic Jira wiring selected new work for a stream such as `AI-Daniel-1`.
The planned manager will own new/repair admission; the implementer never admits
work. Current implementer/reviewer instructions use structured assignments and
receipts. QA now composes the structured contract; dated pilot wiring still needs
its separate compatibility check.
The matrix's [structured reviewer setup boundary](../config/cursor/automations.md#structured-reviewer-setup-boundary)
distinguishes the current Story/Bug reviewer and QA/Rework Queued/Blocked outcomes
from the old Story-only filter and reviewer In Progress checklist. Following that
old checklist does not prepare the structured reviewer or QA composer. Use the
current QA profile and same-release siblings for source invocation.

Project/label/status filtering, authorized repository selection and webhook
authentication belong in deterministic Jira/Cursor wiring. The ticket repository
must be available to the selected environment; initially Plexus/master.

The basic MVP does not provide automatic duplicate prevention, cross-run locks or
API cancellation. Those belong to the deferred dispatcher evaluation. The owner
takes care around repeated launches. Skills do not require exclusive ownership
proof or run/visit IDs and do not investigate competing agents. They still read the
current ticket before work and handoff, stop on changed stage/scope/revision, and
retain receipts rather than repeat uncertain actions. These checks are not locks.

Use the [setup guide](../README.md#fetch-the-skills-outside-the-application-repository)
and [current automation record](../config/cursor/AI-Daniel-1.md). Skills are installed
outside the application and invoked with the versioned minimal prompt. Refresh
happens during a human-controlled environment Build, never through agent-led setup.

## Remaining rollout work

[PGB-58](https://scubapig.atlassian.net/browse/PGB-58) tracks current work. All delivery automations remain inactive. The prepared
Cursor environment does not yet prove a real Jira Story can complete. Verify Jira event/authentication wiring,
connected Jira/Bitbucket tools and full handoffs before dispatching tickets.
Explicit High/Medium Task selections were verified in a separate setup-only run;
that is not real-Story or provider-write acceptance. Use the [three-stage setup matrix](../config/cursor/automations.md#structured-reviewer-setup-boundary)
for the current reviewer boundary. [PGB-90](https://scubapig.atlassian.net/browse/PGB-90)
owns coordinated updating or superseding of saved inactive setup artifacts and
compatible-release readiness; it has not migrated the old Story-only reviewer
filter or In Progress checklist here. Actual provider setup evidence, compatible
full-loop acceptance under PGB-58 and explicit activation remain separate gates.
An authorized bounded direct exercise with complete current inputs/capabilities
can proceed under its skill contract without claiming those gates are complete.

## PR environment handoff — consumer checks and pending producer

Per-PR environment provisioning and its comment producer are a separate pipeline
task. The pipeline, not an agent, will publish or update a recognizable comment on
the PR with its PR identity, environment URL, full deployed commit, readiness
(`ready`, `building` or `failed`), and pipeline-run link. No credentials belong in
that comment. The Jira ticket keeps requirements and prescribed cases; the PR
comment is the canonical environment handoff.

Before environment-dependent work, the consumer must verify the configured
pipeline identity and exact PR/commit match. A heading or URL in an arbitrary
comment is insufficient provenance. Missing, conflicting, failed or stale evidence
blocks required environment-dependent work; agents neither discover alternatives
nor create, repair or poll environments. The pipeline owns refresh on new commits.

QA always needs its supplied target. Static PR review can proceed without a
preview; runtime diagnostics require a ready matching environment. This change
records the agreed producer interface; pipeline publication and full-loop acceptance
remain separate. Structured helpers now inspect the supplied raw receipt and
configured author before runtime actions. The implementer consumes configured deployment evidence where its assigned work
needs an environment; static work does not require one. No pipeline producer or
preview infrastructure is delivered here. Static zero-AI work retains its exact
human IDs/no-AI reason and current PR/review/CI without invented deployment or
helper execution. Humans are never marked PASS by the composer.

 Teams blocker alerts are later Jira wiring; alert routing
does not belong in skills. No hosted Pigboard runtime is required for this MVP.

## Structured helper preparation and recovery

Follow [the usage guide](using-pigboard.md#prescribed-structured-qa-helpers) for
complete work/start facts, original trusted ready PR receipt, scope/access,
prepared artifacts, exact installed revision and private evidence. The helpers
consume that supplied environment receipt; they do not create previews or add a
pipeline receipt producer. PGB-90 owns saved automation compatibility and PGB-58
owns full-loop live acceptance; neither follows from a helper PASS. Missing/stale
receipt, artifact/access, unsupported engine or UI capability stops before action.
Keep partial effects/defects and NOT RUN reasons; obtain the concrete missing
prerequisite before a fresh assigned run. Never retry an uncertain child action.

## Standalone prepared QA publication

Use [qa-jira](../skills/qa-jira/SKILL.md) directly with a complete prepared
assessment and trusted setup. Its read-only preflight establishes eligibility;
final repeats current checks. Verified complete AI evidence or explicit static
zero-AI work goes directly from QA to Human Review, with exact pending human IDs.
A confirmed defect or real outstanding typed upstream request goes to Rework
Queued. Unresolved access/evidence/cleanup/scope inability takes priority and goes
to Blocked only when a supported complete canonical blocker can validate. Preserve
earlier findings and partial rows. Discussion stays QA with no terminal record.

Publication and native transition are separate effects. Keep the complete durable
result and exact known receipts on failure; an uncertain append/transition permits
one resolving read, never replay or a fallback transition. The
[direct guide](using-pigboard.md#publish-prepared-qa-evidence) supplies inputs and
recovery. The compatible qa-entrypoint submits one complete actual assessment
through this boundary. It never writes directly, issues a second final call or
replays helpers after an unknown publisher return. Valid resume needs the existing
unique human authorization and case-specific reuse proof. Preserve completed
actions, original bytes/receipts and actual/unknown status. Same-release source
compatibility does not enable delivery or prove installed/live acceptance.

## Ordinary new-work delivery

Ordinary implementer READY, reviewer approval and successful QA use explicit `worker-current` proof. The selected current start, own and required-parent PR/evidence and configured action authority remain checked. Authenticated recorded ancestry needs no old execution context or mandatory prior capture; supplied retained mismatches still reject. Repair/resume, human rework and unsuccessful/blocked/wait publication are deferred: retain local findings and hold without mutation. Unknown writes keep their original identity without replay.

See the [ordinary worker contract](handoffs.md#ordinary-worker-release-boundary) for the closed envelope, exact readback and recovery.
