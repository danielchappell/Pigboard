# Pigboard Product project management

[PGB in Jira](https://scubapig.atlassian.net/jira/software/projects/PGB/boards/70) is the source of truth for product scope, priorities, dependencies, status, decisions and the active delivery queue from 23 October 2026.

The [PGB-50 handover record](https://scubapig.atlassian.net/browse/PGB-50) links the historical reconciliation, original source documents, delivered/superseded dispositions and documentation publication state. Keep source code, engineering instructions, reviewed designs and exact acceptance evidence in this repository; link them from the Jira work item.

## Find and record work

1. Read the Jira Epic and linked Tasks/Stories before choosing work. Check current code and recent PR evidence; a dated plan is not current execution status.
2. Put new ideas and unresolved decisions in Jira. Use Tasks for discovery, design, documentation and acceptance investigation. Link duplicate requests to the existing outcome.
3. Use `write-pr-sized-stories` when grooming development work. One Story delivers one usable outcome in one PR, at most 20 changed files and less than two human working days. Resolve scope-changing Tasks before calling a Story ready; label later previews provisional.
4. Keep priority, dependencies and current stage in Jira. A repository plan describes the intended implementation and links its Jira key; it must not become a second active queue.
5. Record design/plan/code review results, exact revisions, validation evidence and PR links on the Jira item. Distinguish local checks, hosted CI, merge, release and live acceptance. Update status only when the corresponding outcome is actually achieved.

Use PGB for the product backlog. PIG is an experimental runtime/integration fixture; keep its existing project keys, boards and configuration. PR42 and PR45 completed the agreed two-PR batch. The 2/2 STOP and owner regroup gate still apply; backlog migration does not authorize a third product PR. Imported Story previews remain provisional until their discovery and reviews are complete.

## Read historical documents

Roadmaps, handoffs, local work notes and dated queue tables are historical evidence after the handover. Their technical requirements remain useful until explicitly superseded; their old status/order does not override Jira. Follow the reconciliation's successor link instead of reimplementing an old unchecked box. If new source evidence changes scope, record the source and reason in the existing Jira item or a new linked Task.

Repository engineering, security, independent-review and owner merge/release rules still govern delivery. Jira status and a CLEAN review do not themselves grant merge, deployment, credential or provider-action authority.

## Agent use and recovery

Agents use the same Jira project and keys as humans. Read current issue fields before editing and preserve unrelated changes. Link the immutable source revision and exact reviewed commit when available. After an uncertain create/update, inspect the existing issue and migration journal before retrying; do not duplicate an outcome because a response was lost.

Keep implementation detail in linked documents and concise current results in Jira. Historical source packs and publication receipts are attached to PGB-50; gaps and owner decisions remain explicit Tasks rather than silent omissions.
