# QA entry-point skill

## Scope and reuse

Build `qa-entrypoint` to orchestrate the accepted Jira QA stage. Reuse the agreed
workflow and installed prescribed `qa-api`, `qa-bruno`, `qa-database`, `qa-ui`
contracts. This is a skill, not a new runtime, scheduler or Jira automation.
Keep generic exploratory `qa-verify` unchanged and do not invoke it from this flow.
Its latest upstream source (main `5bef5cf140bd5ea92e6600f0ff2a0be726e4c7ac`,
blob `d6a43e0cac1ac73344ae681bfd46cc5e8bbec452`) was inspected: discovery,
case design, alternative methods and FAIL-first precedence conflict with this MVP.

Deliver a portable skill, concise report/dispatch reference and Cursor invocation
profile. Cursor config supplies a verified Grok High model, tools/permissions,
project/label and real status mapping, exclusive run identity and prepared target.
The shared skill does not select models or claim prompts enforce concurrency.
Install the reviewed new skill locally; preserve all other skills. No real test
target, Jira status, automation, source push, PR, merge or deployment is authorized
by authoring this skill. Existing PGB-58 queue documentation may be updated.

## Behavior

1. Read the actual ticket and linked open PR using configured connectors. Verify
   the configured project/label, Story issue type, current QA status, repo/PR scope, current review
   approval, required CI and source/target revision, preview readiness and deployed
   revision. A stale/duplicate wake or lost stage ownership stops without testing
   or moving a ticket from a human/other stage. Non-Stories and other out-of-scope
   issues are ineligible: stop without invoking helpers or changing Jira. Exclusive dispatch is a harness
   prerequisite; an absent guarantee cannot be fixed with model polling.
2. Validate every requirement and complete ticket case set, exact skill mapping,
   ordering/dependencies, reviewed execution artifacts, expected outcomes, data/
   access/action limits, evidence destination and cleanup. No empty suite, invented
   cases or arbitrary N/A. Use a requirement-content/version fingerprint, not the
   issue's update timestamp alone: report comments must not invalidate themselves.
   Missing/ambiguous inputs or required capabilities block before test actions.
3. Resolve only named approved skills and construct the exact ticket-prescribed
   execution order. A named wrapper's explicit delegated step (such as qa-api
   calling qa-bruno) is executed once and recorded under its actual executor;
   the entry point must not run that same step again. Ambiguous action ownership
   blocks. No parallel agents, fallback skills or silent reordering.
4. Invoke helpers with the immutable case expectations and current run context.
   Collect per-step/case observations, actual skill/version, correlation IDs,
   expected/actual outcomes and retrievable evidence. Validate required evidence,
   including inspected screenshots, rather than trusting a helper PASS label.
   Preserve partial results after helper faults. No retries or uncertain-write replay.
5. FAIL permits remaining independent cases; defect-prevented dependencies are
   NOT RUN. Any prerequisite, evidence, cleanup, scope or helper capability blocker
   immediately stops dispatch and marks remaining cases NOT RUN. Preserve observed
   defects. Required unexecuted work without a demonstrated defect dependency blocks.
   Reuse only case-specific still-valid evidence; never replay completed mutations
   merely to regenerate a report. No automatic recovery or resume after Blocked.
6. Aggregate: all requirements/cases evidenced PASS -> Human Review; demonstrated
   in-scope defects and no unresolved blocker -> In Progress, same PR; any blocker
   or scope decision -> Blocked. Never merge, approve as a human, change scope,
   create a replacement PR or admit new work. Preserve human assignee and labels.
7. Retain the report, publish a concise ticket comment and ensure the report/evidence
   are accessible from the same PR using a verified link or authorized PR comment.
   Record run/case IDs, revisions, coverage, findings and human recovery. Recheck
   current stage/ownership, requirement content and PR/preview revisions immediately
   before publication/transition; stale evidence cannot advance the ticket.
8. Use actual configured status IDs and currently available transitions; never
   guess IDs, create statuses or walk through intermediate columns. Verify the
   mutation receipt and current issue status before claiming it moved. Publication
   or handoff failure is separate from test outcome: stop with delivery BLOCKED,
   preserve any successful earlier write and evidence. When permitted and current
   QA ownership is verified, record the blocker and move to Blocked. If Jira writes
   are unavailable or a mutation outcome is uncertain, report through the run result;
   do not blindly retry or make a competing transition. One read to resolve an
   uncertain write is allowed; no polling/recovery loop. A changed stage is never
   overwritten. Teams notification wiring stays outside the skill.

## Validation and delivery

Review this bounded plan independently. Use isolated fictional ticket/PR snapshots,
scripted helper receipts and a recording connector double to exercise dispatch and
handoff decisions. This is behavioral evaluation of an instruction skill, not a
production runtime or live Jira proof. Evaluators receive raw cases and tool
responses without author verdicts. Cover success, fail/dependent skips, mixed
defect/blocker, missing skill/cases, nested execution, missing screenshot evidence,
stale revisions/status, duplicate delivery, scope expansion, publication failure,
transition refusal/uncertainty and Jira unavailability. Retain call traces and
reports, validate skill format/relative references, commit and independently
review exact artifacts. No unrelated repository tests for this instruction-only
change. Install only reviewed files and update the queue with validation limits.

## Seven principles

Intuitive: three destinations and one report expose the next actor. Discoverable:
the input contract and missing-input result explain readiness. Delightful: prepared
cases, same-PR rework and no duplicate calls avoid repeated work. Token saver:
prescribed sequential dispatch and stopped blockers avoid discovery/recovery loops.
Secure: trusted invocation, scoped helpers and current-state checks preserve
permissions; labels never grant authority. Agents are equal: explicit inputs and
recorded outcomes also serve human QA/developers. Dependable: requirement-specific
evidence, preserved partial writes and verified transitions prevent false success;
prompt checks are not a concurrency lock or distributed transaction guarantee.
