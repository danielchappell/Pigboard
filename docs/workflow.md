# Jira delivery workflow

Jira owns routing and ticket state. Cursor environments prepare Pigboard before an
agent starts. Entry-point skills own the work and record evidence on the ticket
and pull request. The human employee remains accountable.

## Ticket contract

The [structured Story reference](../skills/write-pr-sized-stories/references/pigboard-ticket.md)
is canonical for field labels, case ordering and preparation ownership. Use the
[Story-writing skill](../skills/write-pr-sized-stories/SKILL.md) to produce it. Native
Jira metadata stays in Jira fields; accepted requirements stay in the description;
implementation/review/QA outputs use versioned handoff comments. All acceptance
cases and expectations remain on the ticket, with reviewed executable artifacts
linked from the implementation handoff.


A ready Story names one codebase and base branch, its ownership boundaries, scope
and exclusions, acceptance criteria, and the exact test strategy and cases. One
Story produces one PR, at most 20 changed files and less than two human working
days. Split cross-repository work into linked Stories before execution.

QA instructions name the skills in execution order. Each case supplies its ID,
steps or prepared request/query, expected outcome, required test data/access and
evidence requirements. Supply the PR and tested commit before QA. The pipeline
will publish the environment URL and deployed revision in its PR comment, as
described below; do not duplicate that environment handoff on the Jira ticket. Agents do not invent missing cases, discover environments or
expand scope to make a ticket executable. Implementation records verification and
prepared testing information for review and QA.

## Stage ownership

| Trigger | Entry point | Required outcome |
| --- | --- | --- |
| In Progress | `implementer-entrypoint` | Grok High plan, one independent High adversarial plan review, Medium execution, same or new PR, passing current CI, verification handoff; move to In Review. |
| In Review | `pigboard-pr-review` | Grok High review against ticket and shared `pr-review` criteria, existing comment handling, PR and ticket evidence; approve and move to QA, or confirm rework and move to In Progress. |
| QA | `qa-entrypoint` | Grok High; execute named QA skills and prescribed cases in order, collect outcomes and evidence; move to Human Review on pass, In Progress for confirmed implementation defects, or Blocked if unable to complete. |

QA remains on the open PR. `qa-api` assesses prescribed API cases and calls the
named execution helper (such as `qa-bruno`). `qa-database` executes prepared
read-only database observations. `qa-ui` uses computer use and captures screenshots.
Exact inputs, stopping conditions and evidence formats live in each skill.

Confirmed fixes return to In Progress on the same PR and must pass the review/QA
chain again. Discussion alone stays in In Review or QA. Missing access, incomplete
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
means production deployment. Those human and release stages are not agent triggers.

## Deterministic wiring and setup

Jira admission selects only new work for a stream such as `AI-Daniel-1`. It does
not choose rework. Column owners make the next stage handoff. Project/label/status
filtering, authorized repository selection, webhook authentication and duplicate
event handling belong in deterministic Jira/Cursor wiring. The ticket repository
must be available to the selected environment; initially Plexus/master.

Use the [setup guide](../README.md#fetch-the-skills-outside-the-application-repository)
and [current automation record](../config/cursor/AI-Daniel-1.md). Skills are installed
outside the application and invoked with the versioned minimal prompt. Refresh
happens during a human-controlled environment Build, never through agent-led setup.

## Remaining rollout work

[PGB-58](https://scubapig.atlassian.net/browse/PGB-58) tracks current work. All delivery automations remain inactive. The prepared
Cursor environment does not yet prove a real Jira Story can complete. Verify Jira event/authentication/serialization wiring,
connected Jira/Bitbucket tools and full handoffs before dispatching tickets.
Explicit High/Medium Task selections were verified in a separate setup-only run;
that is not real-Story or provider-write acceptance. Use the [three-stage setup matrix](../config/cursor/automations.md), complete its
remaining capabilities, then verify an explicitly authorized bounded end-to-end Story.

## PR environment handoff — agreed contract, pending implementation

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
records the agreed interface only: comment format/producer identity and verified
consumer handling still need implementation and acceptance. The installed skill
bundle is unchanged; its generic supplied-environment checks do not prove this
new comment contract is implemented.

 Teams blocker alerts are later Jira wiring; alert routing
does not belong in skills. No hosted Pigboard runtime is required for this MVP.
