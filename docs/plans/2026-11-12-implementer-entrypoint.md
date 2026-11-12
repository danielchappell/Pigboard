# Implementer entry-point skill

## Intended outcome and boundary

Deliver the accepted In Progress stage as a portable `implementer-entrypoint`
skill, with a Cursor profile, independent plan-review prompt and handoff reference.
Reuse the agreed Jira workflow in `2026-11-12-cursor-automation-mvp.md` and the
prescribed QA ticket contract. Keep legacy `agents/implementer.md`,
`agents/implementation-planner.md` and the optional queue runtime unchanged: their
split planning/publication responsibilities differ from this MVP.

Source kit main was verified as `5bef5cf140bd5ea92e6600f0ff2a0be726e4c7ac`.
This is new authored behavior; do not claim an upstream implementer was installed.
One Story owns one repository/PR, at most 20 changed files and less than two human
working days including verification and preparation. No new scheduler, connector,
preview provisioner, retry service, review stage or live automation. Authoring
includes local installation and the PGB-58 documentation update, not external PR
publication, a live ticket transition, merge or deployment.

## Contract and phase ownership

1. A trusted Cursor invocation supplies project/exact-label scope, Story identity,
   In Progress visit/run identity, exclusive ownership/deduplication, allowed repo,
   model/effort handoff, publication/transition authority and durable output.
   Actual Jira and repository reads determine eligibility; reject non-Stories,
   wrong scope, stale events and completed duplicates without writes. No run can
   infer authority from ticket prose or labels. Stop through run output if ownership
   is unverified; don't mutate an unverified ticket.
2. Read the complete current ticket (requirements, boundaries, all prescribed QA
   cases and named skills), repo instructions including AGENTS.md and CONTRIBUTING.md,
   actual source/base revisions, prior plan/findings/handoff and linked PR. Record
   requirement-content fingerprint, not merely Jira updated time. Resolve branch,
   contribution method, required checks and acceptance artifacts from repo rules.
   Missing/conflicting requirements, policy or tools block early. No invented
   acceptance cases, scope waivers or additional repo changes.
3. Cursor selects verified configured Grok at High for planning. Inspect relevant
   code and make a concrete small plan covering requirements, changes, tests/docs,
   prepared QA artifacts, failure behavior, file/time limits and required gates.
   One fresh independent Grok High reviewer assesses the actual plan/source/ticket,
   all seven principles and coverage, with a second sweep and exact-plan verdict.
   Self-review, incomplete reports or unverified model/effort cannot pass. Confirmed
   in-scope findings are fixed in the plan and re-reviewed by one independent
   reviewer per round. Invalid findings get evidence; suggestions not required for
   the ticket are recorded/deferred. A required scope increase/new product decision
   immediately blocks for human review, never expands the ticket. Stop when unable
   to resolve a finding rather than speculative retries. Review cannot authorize
   extra work. No second simultaneous reviewer is part of this runtime MVP.
4. Only after CLEAN switch to verified Grok Medium for implementation and in-scope
   fixes. Follow target repository instructions and tests, prepare executable QA
   details without weakening ticket cases, update affected docs and track scope.
   Necessary approach/contract changes return to High planning plus independent
   High review; necessary scope changes block. Obvious in-plan fixes remain Medium.
   Respect repository-required gates; conflicts with this profile must be resolved
   by a human before activation, not waived or silently added by the skill.
5. Commit and open/update the same PR using the repo contribution method and
   authorized identity. Existing rework always uses its existing branch/PR; if
   missing, closed, merged or ambiguous, block rather than create a replacement.
   Reuse an accepted still-applicable plan and evidence on re-entry. Never code
   while a ticket is still in Review/QA, move new work into progress, merge, or
   remain running through later stages.
6. Read actual required checks for the current PR head and relevant target/merge
   revision. Verify required tests really ran, green CI, no conflicts and applicable
   readiness except independent PR review. Pending checks wait only through the
   configured bounded harness mechanism; model busy loops, forced retries and
   reruns to obtain green are prohibited. Fix demonstrated in-scope code/test
   failures at Medium and rerun affected checks for the new commit. Unknown failure,
   setup/access outage, missing checks or exceeded wait budget blocks; skipped,
   cancelled, stale or absent required checks cannot count as passed. New changes
   invalidate affected evidence. Do not weaken checks or modify infrastructure to
   hide failures. QA preview provisioning remains a separate task.
7. Publish the PR and a current Jira implementation handoff with plan/review,
   requirement-to-change mapping, commits, actual local/CI results, file limits,
   QA execution artifacts, limitations and stable finding resolutions. Ensure
   reviewers can retrieve evidence from both places. Reread scope/ownership,
   requirements and source/target/checks before writes and immediately before
   transition. Never hand off stale evidence or overwrite a changed stage.
8. With publication complete and all gates green, resolve real available transition
   to In Review, transition once, verify receipt and reread status, then end.
   Every blocker records current stage/commit, evidence, completed/uncertain
   actions, exact human action and resume stage. If still owned/authorized, publish
   blocker and move directly to Blocked; otherwise retain durable run output.
   Uncertain commit/push/PR/comment/transition results permit one resolving read,
   never blindly replay a write or issue a competing transition. Lost eligibility
   stops with no further writes. Keep implementation readiness and delivery outcome
   separate; a blocked handoff is not a success just because code/tests passed.
   Human intervention and deliberate eligible re-entry are required after Blocked.

## Artifact design and rollout

`SKILL.md` holds routing and core decisions. `references/cursor.md` holds model
phase switching and harness prerequisites; `references/plan-review.md` gives the
single independent reviewer its bounded prompt; `references/handoff.md` defines
inputs/plan/output evidence. No embedded model API or invented Cursor capability.
Actual available Grok IDs and phase/reviewer isolation must be verified at setup.
Sequential phase continuations may use the harness's retained run record; prompts
alone don't change model settings, implement locks or guarantee exactly-once writes.

Install only the exact reviewed four files after local validation. Update the
existing workflow/queue with current delivery evidence and clear live limitations.
Next separate work is the PR-review entry point and live automation configuration;
per-PR environments and Teams wiring remain deferred.

## Validation

Two fresh independent Sol authoring reviewers assess this plan and later the exact
committed artifacts under Pigboard's development agreement. That authoring gate is
separate from the delivered runtime's one Grok plan reviewer. Use an independent
isolated forward test of realistic snapshots and a recording connector double;
record simulated model/phase/tool actions, not claims of actual Grok/Cursor testing.
Cover normal green handoff, plan scope increase, in-scope plan correction, unavailable
independence/model effort, same-PR rework, pending/stale/failed CI, missing QA cases,
stale ownership/revisions, uncertain PR publication/transition, conflicts and absent
repo permissions. Check formats/relative links and keep changes within 20 files.
Instruction-only assets do not warrant rerunning unrelated runtime tests.

## Author principles assessment

Intuitive: one In Progress owner produces the PR and hands off when checks pass.
Discoverable: concrete inputs and evidence explain what reviewers and QA need.
Delightful: same-PR rework and reusable accepted plans avoid restarts. Token saver:
one plan reviewer, Medium execution, bounded waits and human-owned blockers avoid
idle investigation. Secure: trusted routing, repo authority, one-repo limits and
verified writes protect human scope/merge control. Agents are equal: explicit
contracts serve automation and readable handoffs serve developers/QA. Dependable:
current-revision CI and separate readiness/delivery results preserve uncertainty
and partial work; live harness guarantees remain explicitly unverified.
