---
name: implementer-job
description: Plan or execute the implementation of one preflight-verified Jira Story or Bug, producing one PR and revision-bound verification and preparation evidence. Called by implementer-entrypoint; never changes Jira or selects another ticket.
---

# Produce the implementation evidence

Require the composer's verified preflight, trusted repository/PR/evidence authority,
current requirements and phase assignment. Read the shared
[input and lineage rules](../implementer-entrypoint/references/handoff.md#input-contract)
and [job contract](../implementer-entrypoint/references/handoff.md#job-contract).
Use the same [Cursor phase controls](../implementer-entrypoint/references/cursor.md);
text claiming a model is not model selection. No Jira mutations, manager state,
admission, worker coordination, new QA engines or setup/dependency repair.

**Plan (High).** Use [planner](../planner/SKILL.md) to produce one source-grounded
plan from this verified assignment. It calls the investigation and design methods
within the same agent. Return its exact artifact hash and current input bindings;
DRAFT_COMPLETE is an author result, not permission to execute. One repository/PR,
<=20 changed files and <2 human working days includes docs/tests/preparation.
The composer uses exactly one fresh High reviewer per round with the shared
[plan-review prompt](../implementer-entrypoint/references/plan-review.md). Require
CLEAN on the applicable plan; do not turn reviewer suggestions into new scope.
Rework can reuse a still-applicable plan only with an explicit recorded basis.

**Execute (Medium).** Verify the trusted continuation, unchanged plan hash and
current assignment/checkout/PR before editing. Verify the next write is authorized
independently of the publisher’s permission. Follow target-repository gates and
preserve unrelated work. Apply [engineering-principles](../engineering-principles/SKILL.md)
without repeating its rules as a report. Resolve ordinary details locally within
the accepted approach; an omission alone does not require another owner question.
Incorporate every assigned repair cause and required actual
parent revision in the same still-open PR. Stop before approach changes with
NEEDS_HIGH_PLAN; scope growth/missing prerequisites is BLOCKED. A known upstream
repair preventing completion is DEPENDENCY_WAIT with exact requests. Never replace
a closed/missing repair PR or infer pre-first-PR history. Keep unavailable
permissions and ambiguous effects local.

Use [diagnose-problem](../diagnose-problem/SKILL.md) when observed behavior or checks
contradict expectations, before another speculative fix. Supply a finite allowance
within the run. Apply supported local corrections yourself; REPLAN maps to
NEEDS_HIGH_PLAN, validated UPSTREAM_WAIT to DEPENDENCY_WAIT, and unresolved cause
or missing authority to BLOCKED under the shared contract.

Update affected tests and documentation. Use [verify-change](../verify-change/SKILL.md)
for final author verification and useful intermediate checkpoints. Fill reported
gaps and rerun affected checks after fixes or conflict resolution. Return its
revision-bound results and a repeatable recipe in the existing evidence references;
PASS alone is not READY. Preserve unfinished checks on FAIL or INCOMPLETE.

When the necessary code or fixture exists, fill only the
[declared preparation slots](../implementer-entrypoint/references/handoff.md#prepared-inputs-recipe).
Verify the prescribed operation and retrieve the actual hashed bytes as the
intended audience. Keep unknown authority, unsafe target or missing expectations
local. Preserve the declared bounds, child order, checks and cleanup. Use the
named helper's preparation contract. Report independent QA and human cases as pending.

Publish/update one ready non-draft PR through the authorized repository method,
after its required gates. Verify actual current head/target, no conflicts, and each
required CI check's executed passing result at that revision. Missing/pending/
skipped/cancelled/stale/failed results cannot pass. Wait only within the supplied
finite mechanism. Fix demonstrated in-scope defects at Medium; changed approach
needs High review, unknown cause/access/infrastructure needs Blocked. Never weaken
tests, extend timeouts or repair unrelated infrastructure. A first PR requires
complete prior receipts and branch-PR inspection; an uncertain creation forbids a
second PR. Capture genuine worker-current predecessor proof before opening the
first PR or updating an admitted open PR, while that state is observable. At a
repair checkpoint prepare the code-dependent artifact locally on the authorized
continuation, then validate full start on the admitted PR before updating it.
Retain that original proof. After readback reassemble strict start and current
prepared receipts, PR, parent and CI for the actual final revision. No self-approval,
merge or deployment.

Return evidence using the
[record mapping](../implementer-entrypoint/references/handoff.md#record-mapping)
and [durable result](../implementer-entrypoint/references/handoff.md#durable-result).
For READY, return each direct assigned request once and retain every underlying
cause and parent incorporation. For a possible inability, return the observed
diagnosis and missing slot/step or eligible outstanding roots, plus unfinished
work and action receipts. Wait and blocker results claim no consumption. The
Jira publisher independently checks eligibility and builds the candidate.
