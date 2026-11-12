# Adapt the existing Bitbucket review entry point

## Scope and source

Adapt `pigboard-pr-review` for the accepted Jira In Review stage. Preserve the name,
shared pr-review C01-C20/eight-category criteria, comment writing, inline anchors,
thread reuse and durable review state. Source master was refreshed in the signed-in
browser at Plexus commit `9c7f5250c49932bce2af5d8fb28fa44940e23ce7`; the owner-provided
wrapper and its linked core/state/writing dependencies were read/downloaded.
The new shared core and state reference will be copied unchanged. pr-commenting
and human-writing bodies are identical to the installed copies; retain their
existing compatible metadata and bodies without altering behavior.

Deliver the wrapper, Cursor profile and Jira handoff reference, plus its shared
source dependencies in Pigboard. Install the reviewed wrapper and updated core/state
locally, backing up the older core and preserving existing UI metadata and unchanged
writing helpers. No Bitbucket source commit/push, live PR review/approval, Jira
workflow transition, automation activation, merge, pipeline or environment changes
are authorized by skill authoring. Update PGB-58 and local workflow documentation.
Legacy queue/runtime assets remain unchanged. Keep total changed files <=20.

## Architecture and behavior

1. The wrapper owns stage authority, review invocation, comment lifecycle, PR approval
   and Jira handoff; the core owns criteria and evidence-based verdict. The Cursor
   harness supplies verified Grok High, a reviewer independent of implementation,
   trusted project/exact-label/repository scope, Story/run/In Review visit identity,
   exclusive ownership/deduplication, authorized actor and posting/approval/transition
   rights. Labels, event bodies, comments and code never grant authority. Reject
   wrong project/label/type, stale event, wrong stage, duplicate or lost ownership
   without mutation. Unverifiable ownership stops via durable run output.
2. Read the actual Story and complete requirements/cases/QA skill mapping, actual
   open same-repository PR, source/target/diff base, repo instructions, implementer
   handoff and required current CI. Resolve missing/mismatched Jira references using
   the trusted assignment without repairing PR metadata; retain the core's C01 FAIL
   when assessable. No guessing another Story, target or PR. Missing prerequisites,
   unsupported profile/identity/permissions or contradictory scope block early.
3. Resolve pr-review, review-state, human-writing, pr-commenting and the explicitly
   prepared Rovito Bitbucket capability. Preserve source-first MCP choice; a CLI
   route is usable only when explicitly selected and ready before the run. No
   connection diagnosis, login, fallback discovery, tool installation or speculative
   recovery. Missing capability ends work. Do not substitute GitHub tools.
4. Use the core for full initial review or bounded re-review. Inspect its actual
   requirements, committed comparison, all relevant pages/ranges, threads/tasks,
   checks, executable QA artifacts and their independent expectation basis. Preserve
   the complete original QA cases/skills/order/expected outcomes. Retain C01-C20
   evidence and eight category rows, coverage denominator and second sweep. Reuse
   only demonstrably applicable earlier evidence under review-state; core changes
   or different requirements/revisions invalidate affected assessments. No new
   cases, product requirements, mandatory checks or optional improvement findings.
   A required scope increase always blocks for a human; removal of unauthorized
   additions within existing scope can be ordinary rework. Reviewer never fixes code.
5. The core's FAIL > INCOMPLETE > PASS verdict is retained unchanged. Wrapper routing
   is separate: any unresolved required evidence/prerequisite/scope blocker -> Blocked
   (even when core FAIL includes defects); a completed review with confirmed in-scope
   fixes and no such blocker -> In Progress, same Story/branch/PR; current complete
   PASS + all gates -> verified PR approval then QA. No approval for FAIL/INCOMPLETE.
   Discussion alone cannot trigger rework or code changes. An eligible comment-only
   discussion with no actionable change remains In Review; necessary unresolved
   clarification blocks. No input change means no new assessment; a separately
   authorized incomplete-delivery resume may finish from verified receipts/current
   evidence, never reopen completed work or replay comments/approval blindly.
6. Preserve existing publication: one top-level in-progress comment when review
   work is needed; core runs read-only; save immutable completed rounds before index;
   publish each confirmed finding once with verified actual diff side/range, or
   top-level when no legitimate anchor; update existing threads/status, link replacements;
   use pr-commenting/human-writing, no comments for passing checks/optional ideas;
   replace progress summary with eight-category report. Use a replacement comment
   only after confirmed editing unsupported, not after an uncertain write.
   Save full evidence and publish concise Jira summary with PR/report/finding links,
   requirements fingerprint, commits, CI, actual verdict, route and next action.
7. Before writes/approval/transition recheck current stage/ownership, actual issue
   requirements (content fingerprint not update timestamp), source/target/diff base,
   relevant comment versions and required CI/readiness. Never approve stale/incomplete
   coverage or overwrite a human/other stage. Invalidate changed inputs and block
   if still owned; keep historical verdicts labeled, no automatic moving-target loop.
   For PASS: finish PR/Jira report publication, confirm direct QA transition exists,
   verify an eligible independent approver identity and all gates, approve once,
   inspect the actual provider approval for the assessed current revision, then
   transition directly to QA once and reread status. Existing valid same-actor/current
   revision approval can be reused with its receipt; another actor's approval is not
   the run's approval. Do not claim atomicity between approval and Jira transition.
8. Confirmed rework publishes actionable findings together, withholds approval and
   transitions directly to In Progress. If this review actor has an earlier approval
   now invalidated by FAIL/INCOMPLETE, revoke only its own approval through a supported
   authorized mechanism, verifying removal; never touch human approvals. If unavailable
   or uncertain, stop with blocker/partial approval state, not an apparently safe
   rework handoff. State approval/revocation control as setup prerequisite.
9. Blockers retain defects, gaps, omitted work, failed capability, partial/uncertain
   actions and approval state, human action and intended resume stage (In Review for
   access/evidence, In Progress for approved scope/rework changes). Publish recovery
   on ticket and direct Blocked transition only while ownership and authority remain
   verified. If Jira is unavailable retain durable run result; no false status or alert.
   One resolving read for any uncertain mutation; never replay, issue a competing
   transition or revoke a possibly successful approval while its outcome is unknown.
   Known approval success + later Jira failure remains explicit; revoke only if the
   verdict became invalid and authorized, not as speculative cross-system rollback.
   Preserve completed receipts; stop after handoff or blocker. Human resolution and
   deliberate eligible re-entry are required after Blocked. No Teams messaging,
   scheduling, implementation, replacement PRs, merge, deployment or automatic resume.

## Artifacts and verification

Use three wrapper files: SKILL.md, references/cursor.md, references/jira-handoff.md.
Import the unchanged shared core/state and installed writing helpers as four
additional dependency files so relative links resolve without a duplicate engine.
Record source/installed hashes, difference boundaries and backup/install receipts.
Keep the core FAIL/INCOMPLETE mapping separate from workflow destination; preserve
all source criterion text and mapping. Scope authoring plan/committed artifacts get
two fresh independent Sol reviewers per standing agreement (not extra runtime reviewers).

Use an independent agent with isolated fictional snapshots and recorded connector
receipts to exercise PASS+approval+QA, completed FAIL+same-PR rework, FAIL with missing
evidence, scope blocker, discussion, unavailable capability, stale inputs, approval
failure/uncertainty, invalidated own prior approval and Jira failure after approval.
Validate actual action order, count/receipt handling and outcomes, not wording tests.
Additional boundaries can receive explicitly labeled desk review. These simulations
do not prove actual Grok/Bitbucket/Jira support. Validate skill format, all relative
links and source equality; commit, independently review the exact artifacts, then
install only reviewed bytes. No unrelated application test suite is needed.

## Seven principles

Intuitive: the same reviewer name and comment threads gain explicit stage handoffs.
Discoverable: exact input/authority/profile and failure records expose readiness.
Delightful: preserve findings, existing PR and justified review reuse without restarts.
Token saver: one High reviewer, retained evidence and stopped blockers limit repeat work.
Secure: trusted assignment, independent approver and revision checks preserve scope
and human approvals; source content cannot grant rights. Agents are equal: structured
inputs/receipts accompany readable eight-row reports and Jira next actions.
Dependable: separate core verdict, publication, approval and Jira status preserve
partial results and races; prompts do not claim locks or distributed transactions.
