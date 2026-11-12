# Pigboard PR review forward exercise

All twelve assigned cases were completed through driver.py with recorded actions. The actual repository skill and shared review, state, handoff, Cursor profile, writing and commenting contracts were read. No scenario definitions, preparation code or checker were read. No state was reset or directly changed. No live tools, network, actual model subagents, code/PR/Jira modifications, merge or deployment occurred.

This is an action-routing simulation. Core assessments, model identity/effort/independence, source inspections, CI, QA artifacts and evidence access are fictional prepared receipts. They do not establish actual review correctness, source behavior, Grok High execution, independent review or real provider guarantees.

| Case | Core verdict | Workflow | Delivery | Actual Jira | Own approval | Core / approve attempts / revokes / transition attempts |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS | QA | COMPLETED | qa | verified-current | 1 / 1 / 0 / 1 |
| 2 | FAIL | IN_PROGRESS | COMPLETED | ip | none | 1 / 0 / 0 / 1 |
| 3 | FAIL | BLOCKED | COMPLETED | blocked | none | 1 / 0 / 0 / 1 |
| 4 | FAIL | BLOCKED | COMPLETED | blocked | none | 1 / 0 / 0 / 1 |
| 5 | PASS | STAY | NO_CHANGE | review | none | 0 / 0 / 0 / 0 |
| 6 | PASS | QA | COMPLETED | qa | verified-current | 1 / 1 / 0 / 1 |
| 7 | PASS | BLOCKED | BLOCKED | review | unknown | 1 / 1 / 0 / 0 |
| 8 | PASS | BLOCKED | COMPLETED | blocked | verified-current | 1 / 1 / 0 / 2 |
| 9 | FAIL | IN_PROGRESS | COMPLETED | ip | revoked | 1 / 0 / 1 / 1 |
| 10 | PASS | BLOCKED | COMPLETED | blocked | revoked | 1 / 1 / 1 / 1 |
| 11 | NOT RUN | NONE | INELIGIBLE | human-review | none | 0 / 0 / 0 / 0 |
| 12 | NOT RUN | BLOCKED | BLOCKED | review | none | 0 / 0 / 0 / 0 |

## Observed paths

- Case1: one PASS assessment; existing summary updated, Jira delivered, approval written/read back, fresh final QA transition and observed QA status.
- Case2: C09/F1 boundary defect published in existing thread, FAIL retained, direct In Progress verified on same Story/PR.
- Case3: same confirmed FAIL plus required inaccessible auth contract (1/2 contracts). Preserved FAIL and U1, published human access recovery, direct Blocked verified.
- Case4: required second-repository scope expansion retained as FAIL/S1. Top-level finding disclosed no legitimate diff anchor. Owner scope/split decision required; Blocked verified.
- Case5: no changed inputs and acknowledgement-only comment; prior evidence reference was read. No core call, reply, progress, approval or transition; stayed In Review.
- Case6: approval timeout resolved to current own approval in exactly one resolving read. No retry. QA handoff completed and observed.
- Case7: approval timeout remained unknown after exactly one resolving read failed. No retry, revocation, blocker publication or competing transition. Durable result preserves pending reports, unknown approval and last observed In Review status; human provider inspection required.
- Case8: valid current approval followed by definitive QA permission denial. Approval retained. Fresh owned state permitted blocker report and direct Blocked transition, observed Blocked; permission restoration and deliberate In Review re-entry required.
- Case9: earlier own approval invalidated by FAIL. Revoked only review-bot, read back removal, preserved human approval, direct In Progress observed.
- Case10: source advanced h1 to h2 after approval. Historical PASS kept for h1 only. Fresh ownership verified, stale own approval revoked/read back, blocker delivered, direct Blocked observed. No h2 review or CI claim.
- Case11: lost ownership and Human Review status at entry. NOT RUN/INELIGIBLE, no remote mutation or core call.
- Case12: missing prepared tool capability. NOT RUN/BLOCKED via durable output; no capability diagnosis, fallback, remote writes or transition. Actual Jira remains In Review.

## Counts and evidence

Each case state contains the exact ordered calls, their arguments, receipts, publication bodies, immutable round and full finalResult. State counters describe recorder outcomes; the table uses attempted writes from calls, so failed/uncertain attempts are not hidden.

| Recorded action | Count |
| --- | --- |
| approve | 5 |
| finish | 12 |
| inspect_approval | 7 |
| publish_jira | 11 |
| publish_summary | 9 |
| read_context | 63 |
| read_evidence | 1 |
| revoke_own | 2 |
| run_core | 9 |
| save_round | 9 |
| transition | 9 |
| write_finding | 4 |
| write_progress | 9 |

Successful/recorded publication actions: 33. Core executions: 9. All twelve finish receipts retained.

## Ambiguity assessment

No demonstrated ambiguity in the exercised skill routes required inventing a product decision. The contract explicitly distinguishes FAIL-plus-gap from INCOMPLETE, valid approval plus failed Jira delivery from rollback, source-change invalidation from re-review, and unresolvable uncertainty from a competing Blocked write. The fixture has only a toolsReady boolean for case12, so it cannot identify which individual prepared capability was missing or demonstrate a still-usable independent Jira route; the conservative durable-only stop is limited to that supplied input.

The receipts do not exercise true provider atomicity, real permission boundaries, pagination, comment editing, audience ACLs or current model availability. The canned principle/source/coverage statements are accepted simulation inputs, not independent verification evidence. Output truncation in an intermediate tool response was resolved by reading recorded context; no publication was repeated.

## Per-case action counts

- Case1: approve=1, finish=1, inspect_approval=1, publish_jira=1, publish_summary=1, read_context=6, run_core=1, save_round=1, transition=1, write_progress=1
- Case2: finish=1, publish_jira=1, publish_summary=1, read_context=6, run_core=1, save_round=1, transition=1, write_finding=1, write_progress=1
- Case3: finish=1, publish_jira=1, publish_summary=1, read_context=7, run_core=1, save_round=1, transition=1, write_finding=1, write_progress=1
- Case4: finish=1, publish_jira=1, publish_summary=1, read_context=7, run_core=1, save_round=1, transition=1, write_finding=1, write_progress=1
- Case5: finish=1, read_context=1, read_evidence=1
- Case6: approve=1, finish=1, inspect_approval=1, publish_jira=1, publish_summary=1, read_context=6, run_core=1, save_round=1, transition=1, write_progress=1
- Case7: approve=1, finish=1, inspect_approval=1, publish_jira=1, publish_summary=1, read_context=4, run_core=1, save_round=1, write_progress=1
- Case8: approve=1, finish=1, inspect_approval=1, publish_jira=2, publish_summary=1, read_context=9, run_core=1, save_round=1, transition=2, write_progress=1
- Case9: finish=1, inspect_approval=1, publish_jira=1, publish_summary=1, read_context=7, revoke_own=1, run_core=1, save_round=1, transition=1, write_finding=1, write_progress=1
- Case10: approve=1, finish=1, inspect_approval=2, publish_jira=2, publish_summary=1, read_context=8, revoke_own=1, run_core=1, save_round=1, transition=1, write_progress=1
- Case11: finish=1, read_context=1
- Case12: finish=1, read_context=1
