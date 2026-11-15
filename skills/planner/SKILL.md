---
name: planner
description: Turn a verified implementation assignment into one source-grounded plan with clear decisions, ordered changes and meaningful verification; also revise a plan after a changed assumption.
---

# Plan one complete change

The existing implementer job calls this method in its planning phase. Require its
verified assignment, requirements, source/base, repository rules, prescribed cases,
accepted decisions and any existing PR/repair history. This method does not select
work, change Jira, dispatch models or authorize execution.

Read [engineering-principles](../engineering-principles/SKILL.md) and apply
[human-writing](../human-writing/SKILL.md). Use
[investigate-codebase](../investigate-codebase/SKILL.md) to establish deciding facts,
then [design-change](../design-change/SKILL.md) to choose the approach. These are
methods used by this agent, not instructions to spawn more workers. Reuse current,
verified context and accepted design where they still apply.

Write one plan using [the plan record](references/plan.md). Keep context and design
inside it. Map every requirement and prescribed case to its implementation,
verification or declared preparation owner. Order changes by real dependencies;
each step names the intended outcome, relevant paths and useful checks. Do not
prewrite routine code or prescribe a check after every edit.

Settle the choices that affect ownership, interfaces, permissions, compatibility
and recovery. State what the implementer can decide locally. Plan final author
verification against observable behavior and affected consumers, using meaningful
existing coverage where possible. Include the repository's required checks and
the rerun instructions that will accompany the work. Required checks that cannot
be performed are a gap, not a future PASS.

Count tests, configuration, documentation and preparation in sizing: one repository,
one PR, at most 20 changed files and less than two human working days. Uncertain
work that could change this boundary cannot be declared ready. Explain the precise
scope decision through the caller; do not silently split the assignment or expand it.

Return **DRAFT_COMPLETE** only when the plan is feasible within the assignment and
no deciding question remains. Otherwise return **UNRESOLVED**, preserving completed
investigation and the exact missing fact or decision. Neither result approves
execution. The composer obtains its existing independent review of the exact plan
and current inputs. A revised approach requires an updated plan and fresh review;
the same still-open PR and valid completed evidence remain part of the continuation.
