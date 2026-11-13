# Basic MVP skill contract correction — PGB-58

Status: implementation plan for the owner's explicit correction on 13 November
2026. Keep delivery automations and Jira rules inactive. No Story/PR write fixture,
API dispatcher, database, admission code or duplicate-prevention test is included.

## Outcome and reused decisions

A Jira-triggered implementer, reviewer or QA agent can execute its assigned Story
without proving exclusive ownership, acquiring a lock or receiving a stage-visit
ID. Reuse the existing Jira → Cursor webhook flow, prepared central skill bundle,
Atlassian connection, Plexus/master scope, current High/Medium model bindings,
same-PR rework and the prescribed ticket/QA contract. The owner explicitly accepts
manual care around repeated launches for the basic MVP; dispatcher evaluation is
post-MVP PGB-63–65. Do not claim exactly-once execution or cancellation guarantees.

Skills execute assigned work. They cannot enforce scheduling or deduplication.
The Jira rules route one worker per type; the complete numbered label identifies
the stream. The existing board still isolates AI-Daniel-1 only.

## Changes and boundaries

- Remove mandatory exclusive ownership, serialization, deduplication and trusted
  run/visit-ID prerequisites from all three entrypoints and their active references.
  Missing run metadata is not a blocker. A supplied actual Cursor run link/ID may
  identify evidence; otherwise use Story, stage, revision and execution time.
- Verify current ticket project/type/label/status, repository and PR identity from
  actual configured tools. Stop INELIGIBLE if the ticket is in a different stage.
  Do not claim same-stage re-entry/duplicate detection from these checks.
- Preserve authorized actions, requirement/revision freshness, independent review,
  same-PR continuity, case/skill order and all existing scope/blocker rules.
- Preserve known action receipts and bounded reconciliation of uncertain writes.
  Avoiding a second PR/comment/test action within a run is not a cross-run lock.
  Reviewer thread reuse and shared pr-review criteria/comment handling are unchanged.
- Update current human guides and Story contract so no author, setup operator or
  agent is told a dispatcher/visit-ID/lock is needed for this basic MVP. Historical
  plans remain dated records and do not define current activation prerequisites.

Exactly 20 files, one PR, under two working days:

1–3. implementer-entrypoint SKILL.md, references/cursor.md, references/handoff.md.
4–7. pigboard-pr-review SKILL.md, references/cursor.md, references/jira-handoff.md,
references/rovito-cli.md.
8–10. qa-entrypoint SKILL.md, references/cursor.md, references/execution-record.md.
11. write-pr-sized-stories/references/pigboard-ticket.md.
12–14. README.md, docs/workflow.md, docs/jira-setup.md.
15–19. config/cursor/automations.md, jira-access.md, AI-Daniel-1-pr-review.md,
AI-Daniel-1-qa.md, rovito-cli.md.
20. This plan. No installer/runtime changes or new test files.

## Verification and rollout

1. Two fresh independent Sol reviewers assess this plan against the owner's scope,
   relevant sources, all seven principles and the full file/contract surface.
2. Edit the complete affected contract and current docs. Inspect remaining matches
   to distinguish legitimate repository/step ownership and receipt reuse from the
   removed exclusive-run requirement. Validate skill format and local links.
3. Exercise realistic normal assignments with no run/visit/lock metadata, wrong-stage
   events, same-PR rework, required scope expansion, uncertain write outcomes, reviewer
   approval/rework/Blocked and QA PASS/FAIL/BLOCKED. Use isolated instruction evaluation;
   no delivery services or real Story mutation. Label this instruction evidence.
4. Run npm test. Commit, then obtain two fresh independent Sol reviews of the exact
   diff including scenario outcomes, coverage denominators and a second sweep.
5. Open PR, require current CI, merge under existing authority and verify merged tree.
6. Refresh the saved Cursor environment to the reviewed published skill revision,
   preserve CLI setup/secrets and run its Build checks. Select only a successful
   inspected Build. Verify all three workers still reference it and remain inactive.
   Record actual Build acceptance separately in a subsequent setup-only update.
7. Update PGB-58 with source/review/test/Build evidence and remaining basic rollout
   checks. No go-live or production Story execution follows implicitly. Actual
   delivery/PR writes and preview acceptance remain distinct from skill preparation.

On failed checks or Build, retain evidence and the previous successful Build.
Do not repair shared infrastructure, broaden scope or enable workers to hide failure.

## Author principles assessment

- Intuitive: an assigned agent executes the Story rather than asking for a lock.
- Discoverable: current docs state required inputs and optional run metadata clearly.
- Delightful: removes an artificial setup blocker without introducing another service.
- Token saver: no ownership discovery, duplicate-detection reasoning or model retries.
- Secure: retain configured scope, permitted writes, freshness and human merge authority;
  disclose that prompt checks are cooperative and do not prevent concurrent runs.
- Agents are equal: runnable stage inputs and retained results work without hidden IDs;
  human operators receive the same explicit limitations and recovery instructions.
- Dependable: preserve evidence/uncertain-action stops and distinguish source changes,
  successful Build, real delivery and deferred duplicate/cancellation guarantees.
