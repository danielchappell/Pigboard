# Deliver one ticket through its open PR

Entry points compose separate job skills and role-specific Jira handoff skills.
The employee remains responsible for the outcome. Skills are source-controlled;
automation prompts only identify the assigned ticket and entry point.

## Approved role amendment — 16 November 2026

The [role amendment](../delivery/manager-r1/role-amendment.md) changes current-fact
preparation and historical-proof consumption for W01/W03–W09/W12. It is an approved
target for PGB-161/PGB-164–166, not a claim that the existing entrypoints already
prepare these inputs. The roles, requirement rows and transition table below
remain the retained baseline.

Keep High planning → independent High review → Medium implementation. The
implementer obtains current facts from canonical setup and permitted reads and
fills only declared mechanical preparation slots. Code-dependent artifacts may
follow code; actual permissions and facts needed for each next action may not.
Reviewer and QA consume completed prepared inputs, reread current work and check
their applicable PR/CI/evidence and configured action facts. They do not invent
queries, expectations, artifacts or environments. Actual parent incorporation
uses current required-parent facts, without reconstructing the parent's old
execution context.

Full current `start`, complete prepared-input coverage and applicable current
PR/CI/evidence checks remain mandatory before implementation READY and at the
reviewer/QA action boundaries. An assignment/inability check grants no execution
authority. Missing proof stops the affected action: unsupported or unauthenticated
inability stays local, and only an authorized existing blocker shape may be
published. Missing inputs alone are not a demonstrated product defect.

Ordered helpers/children, complete partial ledgers and pending human cases stay
intact. Human request-rework still needs explicit record-and-queue authorization,
current QA basis and the same open PR/current revision/evidence. It has no Blocked
producer. Every publisher validates its candidate, appends and reads back the
actual immutable record, then checks freshness before its allowed transition.
Unknown publication or transition outcomes retain the original identity and
completed work without replay.

## Retained requirement baseline

| ID | Required behavior |
| --- | --- |
| W01 | Implementer plans at Grok High, obtains one independent adversarial plan review at High, and implements at Grok Medium. Reviewer and QA use Grok High. Harness configuration supplies supported model selections; business skills do not clone/install themselves. |
| W02 | The implementer reads the Epic and surrounding workstream tickets for context, while changing only its assigned ticket's repository/PR scope. Context is not permission to implement adjacent work. |
| W03 | Implementer follows the application repository's AGENTS/CONTRIBUTING guidance, opens or updates its one PR, verifies CI for the current revision and publishes preparation/verification evidence before moving to In Review. Additional required scope means Blocked. |
| W04 | At PR creation/update, implementer determines the actual base from current predecessor PR/merge facts and records actual parent identity and incorporated revision. Epic order alone is not a code dependency. Humans own merge order and routine retargeting in Human Review. |
| W05 | Reviewer checks the ticket's full requirements and current PR using existing shared `pr-review` criteria and comment handling. It records PR and Jira evidence; confirmed approval moves to QA, confirmed in-scope fixes to Rework Queued, inability/scope growth to Blocked. Discussion stays in Review. |
| W06 | QA runs the ticket's named skills and prescribed cases in order on the open PR. It records each scenario, outcome, tested revision and evidence, including UI screenshots. All assigned AI cases passing, or an explicitly human-only plan reported as zero AI cases, moves to Human Review; confirmed in-scope defects move to Rework Queued; inability to execute moves to Blocked. Discussion stays in QA. |
| W07 | Existing API/Bruno, PostgreSQL read-only and computer-use UI skills execute bounded prescribed work. They return evidence, not Jira transitions. No missing environment, access, expected result or unsupported engine is solved by open-ended exploration. |
| W08 | The pipeline supplies the PR environment through a trusted PR comment naming the PR, deployed revision, readiness and pipeline evidence. Consumers check the current revision before environment-dependent work. Static review need not wait for an environment; environment-dependent checks do. Provisioning that environment is separate work. |
| W09 | Confirmed repairs keep the same PR and enter Rework Queued; no worker sends work directly to In Progress. A known upstream defect preventing completion also queues a dependency wait with unfinished checks explicitly NOT RUN. Blocked is reserved for human intervention. |
| W10 | Humans request repair or authorize unblock; automation performs transitions. No permission-enforcement project is required to prevent humans dragging cards. Agents do not clear blockers, fabricate human approval, merge, deploy to UAT/production or complete human test cases. |
| W11 | Human Review presents both the developer and human QA reviewer with the PR, automated evidence and pending human cases. The designated humans complete and record their reviews and prescribed human cases before acceptance. Product Acceptance represents the UAT stage; Done represents production deployment. Those stages do not launch delivery workers. |
| W12 | Role handoff skills publish structured, revision-bound results and evidence, verify publication, then make their one allowed transition. Changed assignment/stage/requirements or uncertain writes stop safely without replay. Shared identities are a known limitation; this is not run deduplication or exclusive-worker ownership. |

## Transition responsibilities

| Owner | From | Allowed destination |
| --- | --- | --- |
| Manager | Ready to Work or Rework Queued | In Progress |
| Implementer | In Progress | In Review, Rework Queued for known dependency wait, or Blocked |
| Reviewer | In Review | QA, Rework Queued or Blocked |
| QA entry point | QA | Human Review, Rework Queued or Blocked |
| Manager | Human Review | Rework Queued for a recorded required stack update only |
| Human-request path | Human Review / Blocked | Requested repair queue / explicitly authorized original stage, respectively |

The owner chose a separate human-invoked `request-rework` skill on 14 November
2026. The human tells their existing assistant which ticket needs an in-scope fix
and supplies the findings. The skill checks the current Human Review assignment,
open PR and unchanged requirement/revision evidence; records a typed repair request;
verifies publication; then moves that ticket to Rework Queued. The manager later
admits it when the stream and capacity permit. There is no manual card drag, new
automatic worker, Jira form or manager inference from ordinary discussion.

Story writing owns creating/revising specifications. Requesting rework owns this
bounded handoff, sharing the work contracts, validation and human-writing guidance.
It does not rewrite acceptance criteria, change scope, start implementation, unblock
work or repair multiple PRs. If the request needs different scope, the PR is closed,
or required evidence/access is missing, it explains the problem and makes no queue
transition. An uncertain publication/transition is reported without replay. See
[the human repair contract](../architecture/manager-human-rework.md).

The missing human-unblock producer remains the separate follow-up identified in
the index. No role fills that gap by moving a ticket without authorization. If
Jira access is unavailable, retain the failure in run output; do not claim a
blocker transition or alert was delivered. Human acceptance is a process and
documentation requirement here, not a new technical permission-enforcement feature.

The [handoff contract](../architecture/manager-handoff-contract.md) owns exact
fields, actor checks, revision/assignment references and publication ordering.
Keep the job skills, shared review/comment skills, QA helpers and role-specific
Jira skills separate, then install them together as a compatible bundle.
