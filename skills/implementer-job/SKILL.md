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

**Plan (High).** Inspect actual source/base, applicable AGENTS/CONTRIBUTING,
contribution/check rules, complete requirements and every prescribed case. Produce
ordered edits, interfaces, tests, docs, failure paths, preparation mapping, file/time
count and your own seven-principle assessment. One repository/PR, <=20 changed files
and <2 human working days includes docs/tests/preparation. The composer uses exactly
one fresh High reviewer per round with the shared
[plan-review prompt](../implementer-entrypoint/references/plan-review.md). Require
CLEAN on the applicable plan; do not turn reviewer suggestions into new scope.
Rework can reuse a still-applicable plan only with an explicit recorded basis.

**Execute (Medium).** Verify the trusted continuation and retained plan/assignment/
checkout/PR/action receipts before editing. Follow target-repository gates and
preserve unrelated work. Incorporate every assigned repair cause and required actual
parent revision in the same still-open PR. Stop before approach changes with
NEEDS_HIGH_PLAN; scope growth/missing prerequisites is BLOCKED. A known upstream
repair preventing completion is DEPENDENCY_WAIT with exact requests. Never replace
a closed/missing repair PR or infer pre-first-PR history.

Run meaningful regression and required local checks, update affected documentation,
and prepare only declared mechanical QA artifacts with retrievable hashes, IDs,
owners/consumers and unchanged expectations/order. Read only named helpers'
preparation contracts. Consume supplied environment evidence where required; do
not provision or discover access. Do not claim independent QA or human PASS.

Publish/update one ready non-draft PR through the authorized repository method,
after its required gates. Verify actual current head/target, no conflicts, and each
required CI check's executed passing result at that revision. Missing/pending/
skipped/cancelled/stale/failed results cannot pass. Wait only within the supplied
finite mechanism. Fix demonstrated in-scope defects at Medium; changed approach
needs High review, unknown cause/access/infrastructure needs Blocked. Never weaken
tests, extend timeouts or repair unrelated infrastructure. A first PR requires
complete prior receipts and branch-PR inspection; an uncertain creation forbids a
second PR. No self-approval, merge or deployment.

Return evidence and a complete canonical candidate as specified in the
[record mapping](../implementer-entrypoint/references/handoff.md#record-mapping),
plus the [durable phase result](../implementer-entrypoint/references/handoff.md#durable-result).
For READY return exactly the admission's assigned references once, not flattened
roots; retain every cause/parent incorporation evidence under that mapping. Partial
wait/block claims no consumption. Preserve genuine precreation proof and actual PR
creation/readback through continuation and return, following the shared
[phase-specific publication checks](../implementer-entrypoint/references/handoff.md#publication-protocol).
Keep unfinished checks explicit and actual action effects distinct from readiness.
The composer/Jira skill publishes the candidate; the job does not invent provider
receipts or report Jira advanced.
