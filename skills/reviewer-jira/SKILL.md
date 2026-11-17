---
name: reviewer-jira
description: Validate current native Jira Story/Bug reviewer assignments in read-only preflight, or publish and verify one canonical reviewer handoff and direct transition in final mode. Use through pigboard-pr-review; never review code or change PRs/admission state.
---

# Reviewer Jira boundary

## Ordinary worker release boundary

Only current `new_work` implementer READY, reviewer approval and successful QA
are supported. Reject unsupported invocation before work or candidate construction: repair,
resume, human request-rework, failed review/QA, blocked and dependency-wait
publication are deferred. Preserve local findings, partial ledgers and original
receipts; return precise inability and hold with no mutation. Required repair
still holds. Do not fall back to strict chain or manager recorded proof.

Follow the [ordinary worker proof and publication contract](../work-validator/docs/handoffs.md#ordinary-worker-release-boundary)
(installed); source help is repository `docs/handoffs.md`.
Use the pinned checker in explicit `--mode worker-current` for actual predecessor
preflight and real-leaf readback. Current own/required-parent/action proof stays
required; ancestry needs no old context or mandatory capture. Genuine retained
mismatches reject. Independently compare complete candidate semantics, record-check
before append once, and compare original canonical bytes/digest/UUID at exact
readback. Unknown append/transition holds original identity without replay. No
manager completion grant, source fallback or dependency repair.

Linked caller/profile/reference instructions may describe legacy classification or
repair/resume. Those descriptions are deferred and grant no ordinary mutation
authority. Local FAIL/BLOCKED/REWORK_QUEUED/DEPENDENCY_WAIT labels preserve evidence,
not Jira status. The owning publisher must reject unsupported final outcomes
before candidate construction or append, regardless of an upstream label.


Read [the reviewer contract](../pigboard-pr-review/references/jira-handoff.md).
Require explicit `preflight` or `final` mode and its trusted inputs. This skill owns
Jira preflight/publication only; [pigboard-pr-review](../pigboard-pr-review/SKILL.md)
owns shared review, comments and approval. Do not mutate PRs, code, requirements,
labels, assignee, work-context pointer or manager state; no In Progress/DynamoDB.

In `preflight`, establish native eligibility, full configured scope, exact current
new_work assignment with no resume/repair and actual implementation worker-current
proof, current PR/evidence, prepared actor/tools and
available direct edges. Return verified facts or honest inability with no writes.
Unreadable eligibility is NOT RUN; do not speculate a blocker on an unverified issue.

In `final`, accept only the wrapper's complete current approved PASS to QA.
FAIL, REWORK_QUEUED, BLOCKED, INCOMPLETE, wait or resume stops before candidate
construction or append; retain full local findings, coverage/gaps and original
receipts with no transition. Follow the contract's publication protocol only for
QA: independently compare complete candidate semantics, record-check the original
candidate and worker-current-check actual predecessors; append once; compare
original canonical record bytes/digest/UUID and validate the real leaf in
worker-current mode; freshness recheck; direct In Review -> QA; verify native status.
Discussion has no final publication. Keep durable result and completed review evidence
when publication is unavailable or uncertain. A formatter validates encoding, never
authority, live freshness or successful delivery. Stop after failed/unknown writes
without replay, replacement terminal record or competing transition.
