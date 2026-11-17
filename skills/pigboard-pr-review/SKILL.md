---
name: pigboard-pr-review
description: Review an authorized native Jira Story or Bug in In Review and its current open Bitbucket PR using shared criteria and existing threads. Verify current approval before QA, queue all confirmed in-scope repairs on the same PR, or retain a truthful blocker.
metadata:
  short-description: Independent PR review and typed Jira handoff
  source: Daniel Chappell
---

# Review the current PR and hand off

This entrypoint owns PR review, comments and approval. Delegate Jira reads and
publication to [reviewer-jira](../reviewer-jira/SKILL.md), first in `preflight`, then
in `final` mode only for a terminal handoff. Read the shared
[handoff contract](references/jira-handoff.md) for both modes and the durable result.
Cursor runs require the verified [Grok High profile](references/cursor.md).
Never fix code, create/replace/retarget PRs, change requirements, merge or deploy.

## Ordinary worker release boundary

Use the same-release support matrix: source repository `docs/handoffs.md`,
heading `Ordinary worker release boundary`; installed
`<receipt.skills>/work-validator/docs/handoffs.md`, the same heading in that
immutable prepared release. Only current `new_work` is supported.
Complete confirmed defects can queue the same open PR; repair assignments, resume,
wait and inability publication remain deferred. The wrapper owns complete review,
comments and its own approval; reviewer-jira independently owns Jira publication.

## Establish the exact review

Obtain a successful read-only preflight before PR writes. Require the prepared
Rovito Bitbucket route (`rovito-safeguard` MCP or explicitly setup-selected
[CLI](references/rovito-cli.md)); never discover a fallback after failure or use
GitHub tools for Bitbucket. Missing tools/model/access are inability, not permission
to install, diagnose connections or expand scope. Require reviewer independence
from implementation and actual configured actor/capabilities, not prompt claims.

Read the full structured requirements, prescribed cases/artifacts, accepted scope,
repository rules, current implementation receipt and exact open PR. Inspect complete
paged comparison/file inventory, source/target/diff-base, required executed CI and
all threads/versions. Missing Jira PR metadata is C01 under a trusted assignment;
conflicting identity blocks. Static review needs no invented preview; runtime checks
need actual matching deployment evidence. Keep original case IDs and expectations.

## Assess once, preserve the shared job

Use unchanged [pr-review](../pr-review/SKILL.md) and its
[review-state](../pr-review/references/review-state.md),
[human-writing](../human-writing/SKILL.md) and
[pr-commenting](../pr-commenting/SKILL.md). The core is the read-only review job;
do not add a redundant reviewer-job or call an implementation agent.
Choose a full first review or bounded reassessment with explicit still-valid evidence
for every unchanged obligation. No author-PASS inheritance or second same-input
assessment merely to publish. Invoke the core once for the selected snapshot.
Preserve all C01-C20 checks, fixed eight-category mapping, FAIL-first verdict,
examined/total coverage, second sweep and applicable principles in private records.
Independently inspect prepared QA requests/assertions/SQL/UI steps against the
original ticket cases, named skills, expectations and order; do not invent cases or
change expectations to fit implementation. Optional improvements are follow-ups;
required scope growth blocks instead of authorizing patches.
Missing evidence/unknown denominator cannot become PASS; retain every finding and gap.

Before each consequential PR/Jira boundary perform the contract's freshness check.
Post/update one existing or new in-progress summary, then assess. Save immutable
completed round/index only after the round completes; interrupted work cannot replace
completed evidence. Verify private cache is ignored/untracked or use prepared storage.
Publish each confirmed finding once through pr-commenting with correct diff side and
smallest useful range, or justified top-level fallback. Reuse existing threads;
resolve only after verified fixes/counterevidence, retain superseded links and stable
IDs. Evidence gaps are not invented code defects. Final human report includes the change
summary and grouped file map, eight category rows, coverage and linked full evidence.
It does not require a twenty-row appendix.
Never omit low-severity in-scope findings or pending finding references.
Replace the progress summary with the final report. When editing is known unsupported
before an attempt, publish a linked replacement; failed/unknown attempted editing
never permits another comment. Keep summary/threads consistent, retain unpublished
findings and disclose delivery failures. Verify the evidence audience can access
actual PR/report links; local cache alone cannot establish a ready QA handoff.

## Decide separately from the verdict

- Required unresolved scope/capability/evidence gap: BLOCKED, retaining all findings.
- Complete assessment with confirmed in-scope corrections: REWORK_QUEUED, same PR.
- Complete current PASS and all live gates: verified own current approval, then QA.
- Discussion only: STAY/NOT_ATTEMPTED, ordinary authorized PR replies; no canonical
  approval/repair/block record and no transition. Unchanged inputs need no comment spam.

Before approval, verify the success route and configured direct QA edge. Before
queue publication, rerun predecessor proof with explicit `publisher.intent: repair_request`
and the direct Rework Queued edge. Initial read-only preflight checks both routes
separately; one missing route is a capability limitation, not failure of the other.
Reuse only verified current approval by the configured independent actor; otherwise
request approval once and inspect actual actor/revision-bound provider state.
Transport success alone is insufficient. A stale own approval is revoked only with
supported authorized controls and verified removal before repair; never remove
another actor's approval. Unsupported/definitively failed revocation retains its
state and blocks when safely possible. Unknown revocation stops under uncertainty.

Send actual complete/reused report, all findings/references, approval observations
and current inputs to reviewer-jira final mode. Only it publishes/transitions Jira.
PASS alone is neither approved nor delivered. Retain separate confirmed receipts
and actual status. No In Progress transition, admission, DynamoDB, locks, automatic
resume or competing-run investigation. Human QA/merge/release remain separate.

Failed or unknown comment/edit/approval/revocation/transition ends without repeat or
replacement terminal actions. At most one resolving read may conclusively verify
that exact prior action; only then may distinct remaining steps proceed with fresh
gates. Preserve confirmed partial work. Follow the shared contract's final-attempt
boundary even for definitive append failure. End after a handoff or blocker; no
polling, recovery subagents or staying active through QA.
