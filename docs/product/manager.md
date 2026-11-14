# Advance eligible work without AI scheduling

The manager uses Jira work data and recorded evidence to select the next ticket.
It does not run an AI, inspect agent transcripts or decide whether a PR is correct.

| ID | Required behavior |
| --- | --- |
| M01 | A configured Pigboard opt-in label and an In Progress Epic enable admission. Full labels such as `AI-Daniel-1` identify sequential streams; the worker-type routing may ignore the numeric suffix. |
| M02 | One full stream label belongs to at most one active opted-in Epic. Different numbered streams may run independently; their human planner is responsible for separating conflicting work. Conflicting active ownership holds that stream. |
| M03 | Only Ready to Work Stories/Bugs are ordinary candidates. Other preparation statuses are ignored even if earlier in Epic order. An invalid ready ticket gets a reason and is skipped when independent valid work exists; unresolved required repairs cannot be bypassed this way. |
| M04 | In Progress, In Review and QA occupy one automated slot across all worker types. Blocked, unresolved manager intent or inconsistent occupancy holds the stream. Human Review releases the automated slot. |
| M05 | At most five tickets wait in Human Review per full stream, including Bugs and pending human cases. Admission requires room for the selected ticket to return. The same capacity rule applies to rework; active work is never interrupted to enforce it. |
| M06 | Among eligible work, prerequisites needed by the repair chain come first, then queued repairs/required stack updates, then Bugs, then Stories. Epic order breaks ties. Unready unrelated work never overrides readiness. |
| M07 | Required prerequisites need matching current automated completion evidence and Human Review or a later accepted stage. Removal, cancellation or missing evidence is not completion. Order alone is not a prerequisite. |
| M08 | Confirmed repair on A waits while B completes its existing cycle. Then fix the recorded stack oldest first, one ticket/PR per cycle, before new unrelated work. No automatic run pause/cancel/resume is needed. |
| M09 | When A's repaired revision completes review and AI QA, queue completed B only if B records an actual dependency on the older parent revision. Manager owns Human Review → Rework Queued and records the cause; queueing launches no worker. |
| M10 | B incorporates and revalidates A on B's own PR. Recorded repair roots and incorporated parent completion prevent repeated queueing for the same update; propagate to actual descendants oldest first. Preserve newer and older unresolved causes. |
| M11 | Independent B, ordinary merge or retargeting causes no cascade. Active B is not interrupted; Blocked B retains its blocker. Missing lineage or new scope needs human handling. Worker preflight checks whether the PR is still open; manager adds no PR polling integration. |
| M12 | Pausing an Epic stops new cycles, including rework, while its existing worker cycle may finish to Human Review if it needs no correction. Queue-only stack updates also wait until the Epic resumes (D02). |
| M13 | Inventory covers occupancy as well as candidates. Retain stable identities across label/parent/list edits and read known work fresh. Missing/inaccessible/conflicting state holds the affected scope; incomplete shared discovery holds the scan. Never infer a free stream from a filtered or incomplete result. |
| M14 | Preview explains selections and waits with zero Jira or operational-state writes. Apply uses fresh validated inputs, bounded reads and only the three manager-owned directed transitions. Unknown outcomes hold for human reconciliation rather than replay. |

The [41-scenario matrix](../architecture/manager-scenarios.md) is the behavioral
acceptance inventory. The [stack contract](../architecture/manager-stack-repair.md)
and [work contract](../architecture/manager-work-contract.md) supply exact evidence
and capacity semantics. These sources must be reconciled together during review.

A human creates/formats a new Bug when a merged ticket needs new work. The manager
prioritizes that ready Bug; it does not convert Stories or create Bugs automatically.
An admission is not proof a Cursor run exists or that delivery occurs exactly once.
