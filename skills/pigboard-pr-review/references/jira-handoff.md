# Review inputs and stage receipt

Reuse the shared [review-state record](../../pr-review/references/review-state.md).
The wrapper adds delivery fields; it does not replace the core's review criteria
or immutable rounds. Retain conclusions/evidence, not private reasoning.

## Required inputs

- Configured project/exact-label/Story scope, current In Review status; approved
  repo/PR, posting/approval/own-revocation/transition
  authority, independent Grok High profile and durable output.
- Actual requirement text or immutable reference plus content fingerprint, scope,
  accepted decisions, all prescribed QA case IDs/skill mapping/order/expectations,
  and prepared implementation/verification/QA artifact handoff.
- Actual open PR metadata, source/target/diff base, complete comparison/file inventory,
  applicable AGENTS/CONTRIBUTING and other rules, current required checks/readiness.
- Prior rounds/findings/threads/summary IDs, external comment versions and processed
  inputs; actual approval actor/state and confirmed writes/pending delivery.
- Prepared connector/skill versions, allowed diagnostics/data, ignored/private cache,
  authorized evidence audience and actual available direct Jira transitions.

The shared core may report FAIL for a missing Jira title/body reference while the
trusted assignment still gives an unambiguous Story and complete requirements.
Preserve that finding. Inaccessible or conflicting requirements are unresolved
assessment gaps, never an empty requirement inventory or a waiver.

## Verdict and destination are separate

Keep `reviewVerdict` PASS, FAIL or INCOMPLETE from the shared core, including its
FAIL-first precedence. Use NOT RUN only when assessment did not execute. Record
`workflowDecision` QA, IN_PROGRESS, BLOCKED, STAY or NONE separately. Required gaps
or scope blockers override rework routing without changing a core FAIL to INCOMPLETE.

Use `deliveryOutcome` COMPLETED for a verified intended handoff (including Blocked),
BLOCKED when required publication/approval/transition cannot complete, INELIGIBLE
for rejected scope or changed stage, or
NO_CHANGE for completed discussion/no-new-input handling that stays In Review.
COMPLETED does not mean the PR passed. Record observed Jira status or explicitly
unknown, independent of intended destination.

An actual Cursor run link/ID may identify the report. Otherwise use Story, stage,
revision and execution time; missing run/visit metadata is not a blocker. Do not
invent identity or use report markers as cross-run locks.

In addition to core/state fields, retain:

- Exact model/effort, reviewer and approval actor; requirements/rules fingerprint,
  source/target/diff base, current required check evidence and assessed input versions.
- Newly examined versus reused coverage; all C01-C20 assessments, eight category
  results, second sweep, stable finding IDs, omissions and supporting evidence.
  Put detailed working records behind the concise report; do not publish a second
  mandatory 20-row checklist. Preserve source mapping and justified exclusions.
- Summary/finding/thread/Jira-report IDs and accessible links, write receipts and
  uncertain writes; own generated comments excluded from external-input fingerprints.
- Approval: none/verified-current/revoked/stale/unknown, actor, assessed revisions,
  receipt and actual provider readback. Another actor's approval is never a substitute
  for this run's required approval and must never be revoked by this workflow.
- Intended direct transition, observed destination, receipt/readback, next owner and
  successful partial writes. Provider approval plus failed Jira transition is a
  partial handoff, not a transaction to roll back automatically.
- Blocker: failed prerequisite or scope decision, preserved defects and unverified
  work, completed/uncertain actions, exact human resolution and resume stage.
  Resume In Review for access/evidence; approved scope/implementation changes return
  to In Progress on the same PR. No automatic resume while status remains Blocked.

Jira summary shape:

```text
PR review <Story / revision / execution time> — <core verdict>; action <QA|In Progress|Blocked|Stay>
Story / same PR / source-target-base / requirements and rules version
Review: <verified eight-category PR summary link>; coverage and material omissions
Confirmed findings / unresolved evidence / required human scope decision
Current checks and QA artifact assessment: <evidence references>
Approval state and actor: <verified receipt or honest limitation>
Requested handoff / actual Jira status / next owner or human recovery
```

Do not promise approval before it is verified. A pre-approval Jira report can say
approval pending and QA intended; retain the final approval/transition receipts in
the retained execution record. Any needed Jira report update occurs while still
in In Review; after the verified transition, end without further publication or
moving the ticket back to repair a report. For a Blocked handoff, an
accessible ticket recovery record or durable run output is sufficient; missing PR
access stays explicit without initiating connection or publication repair.
