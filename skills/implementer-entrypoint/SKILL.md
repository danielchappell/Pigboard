---
name: implementer-entrypoint
description: Compose one authorized native Jira Story or Bug in In Progress through High planning, one independent High review, Medium implementation and a verified typed Jira handoff. Use the current versioned assignment; stop ineligible work or uncertain writes.
---

# Implement one assigned ticket

Own one ticket, one repository and one PR. This entrypoint dispatches phases;
[implementer-job](../implementer-job/SKILL.md) owns implementation evidence and
[implementer-jira](../implementer-jira/SKILL.md) owns Jira reads/publication. Neither
an installed skill nor ticket prose grants service authority. Do not schedule,
admit, lock, deduplicate, interrupt another ticket, merge, deploy or activate.

1. Read the shared [input contract](references/handoff.md#input-contract) and the
   [Cursor profile](references/cursor.md) for a Cursor run. Invoke implementer-jira
   in **preflight** mode. Use only the verified current assignment and native
   Story/Bug scope; unverified/ineligible work stops before code or provider writes.
2. Load the target repository's applicable instructions. Invoke implementer-job in
   **plan** mode at the verified High profile. Obtain exactly one fresh independent
   High reviewer per round using the unchanged [review prompt](references/plan-review.md).
   Its generic “Story” means the assigned Story or Bug; eligibility is owned by
   preflight. Require full coverage, second sweep, model/independence evidence and
   CLEAN for the exact plan before execution. Resolve only in-scope findings.
3. Dispatch one verified Medium continuation with accepted plan/review, preflight,
   requirements, checkout/PR identity and all prior action receipts. It invokes the
   job's **execute** mode, then Jira **final** mode for a valid candidate. A job
   cannot mutate Jira. Preserve the returned receipts; the parent never repeats
   completed execution/publication. NEEDS_HIGH_PLAN returns to High before changed
   approach edits; new scope or >=2 human days/>20 files requires human Blocked.
4. Return the shared [durable result](references/handoff.md#durable-result), including
   exact implementation and delivery outcomes, visible record and observed status
   or unknown. Early High-phase blockers may use the profile's authorized blocker
   handoff without claiming Medium ran. Stop after the assigned handoff.

Retain accepted work and receipts on repair/resume. Never infer a missing PR,
assignment, human authorization, CI success or provider write. Current local
validation is supplied-fact checking, not live authority. Read the shared
[publication and uncertainty rules](references/handoff.md#publication-protocol)
when a final handoff is needed. This structured implementer does not convert old
prose tickets. Retained reviewer/QA workers still require their basic contract;
this mixed bundle is not an active compatible delivery loop.
