---
name: implementer-entrypoint
description: Complete one assigned Jira Story or Bug in In Progress through High planning, one independent High review, Medium implementation and a verified typed Jira handoff.
---

# Implement one assigned ticket

The operator supplies the assigned key and invokes this skill in the prepared
release. Use the [input contract](references/handoff.md#input-contract) and the
[Cursor profile](references/cursor.md) to resolve the rest from canonical setup
and permitted observations. Own one ticket, one repository and one PR.

1. Invoke [implementer-jira](../implementer-jira/SKILL.md) in **preflight** mode.
   Follow the [ordinary worker release boundary](references/handoff.md#ordinary-worker-release-boundary).
   Select the proof for the next action. A missing future mechanical input can
   leave strict start pending while current assignment and next-action proof let
   planning and edits proceed. Stop at the affected action if that proof fails.
2. Load the target repository's instructions. Invoke
   [implementer-job](../implementer-job/SKILL.md) in **plan** mode at verified
   High. Obtain exactly one fresh independent High reviewer per round using the
   [review prompt](references/plan-review.md). Require complete coverage, a
   second sweep and CLEAN for the exact plan. Pass every assigned request,
   outstanding cause and required parent to each phase.
3. With unchanged plan hash, current checkout and verified write authority,
   dispatch one Medium continuation. Pass the accepted plan and review, actual
   dispatch receipts, requirements, assignment, branch/PR, parent, all known
   action effects and unfinished preparations. The continuation runs the job's
   **execute** mode, then invokes Jira **final** for READY or a supported
   inability with its retained diagnosis. An early supported inability goes
   directly from High to Jira **final** without dispatching Medium. The Jira
   publisher independently establishes permission and outcome proof.
4. Return the [durable result](references/handoff.md#durable-result). Preserve
   confirmed and unknown effects, incomplete checks and the exact missing fact
   or human action. Unsupported inability and ineligible work stay local.
   NEEDS_HIGH_PLAN returns to High before changed-approach edits. New scope,
   another repository, over 20 files or at least two human days requires a
   human decision.

Use the [publication protocol](references/handoff.md#publication-protocol) for
original receipts and unknown effects. The parent never repeats completed or
uncertain actions. The job never writes Jira. Admission, scheduling, automatic
resume, merge, deployment and activation remain outside this skill's authority.

The [structured reviewer](../pigboard-pr-review/SKILL.md) reads the verified
implementation receipt. Review and prescribed QA recheck the repaired revision.
