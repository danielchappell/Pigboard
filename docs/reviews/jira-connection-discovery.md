# D1 Jira connection discovery review

22 September 2026. The historical design round below had two independent Sol reviewers assessing the read-only
[INT connection design](../designs/jira-connection-discovery.md), the
[delivery queue](../delivery-plan.md) and the
[D1 Task](../tasks/architecture-decisions.md#d1--verify-the-jira-connection-and-workflow).
The CLEAN design-round file SHA-256 values, before adding this record, were:

| File | SHA-256 |
| --- | --- |
| `docs/designs/jira-connection-discovery.md` | `a128996336c48bbaba3ca3d3a3ae275caf76c1e64569e97c6575c21ac4aae72f` |
| `docs/delivery-plan.md` | `9ea72c7fae1c4199a02fe7d729a4874be3596dd6de1b8bf8adc4f8ed9975f860` |
| `docs/tasks/architecture-decisions.md` | `c20257de58716e55aed6bc780e49679a1cd094eec1a55f0e72c89de159c60830` |

Both first-round verdicts were NOT CLEAN. The product reviewer found that one
pilot issue could not prove transitions for every source status and that the
queue still described PR #7 as an 18-file conflict-resolution task. The
technical reviewer found missing board-filter/assignee admission and per-ticket
source-audience checks before provider send. The author fixed those four
in-scope findings together and disclosed the residual race after content has
been sent to a provider.

Both design re-reviews were **CLEAN for the exact historical hashes above**. This
record then changed only the delivery plan's D1 status/link line; its SHA-256
at that point was `f5c28480ab2a8201e3b0aa3fad4544555e67a501693db0dd001e57374ef742ef`.
That metadata delta is reviewed separately and does not change the D1 design
or Task content. The product
review covered 3/3 changed files (149/149 design lines, 233/233 queue lines,
31/31 D1 Task lines), relevant D2/pilot context and a second sweep from S01
through S07. The technical review covered 3/3 changed files, 2/2 governing
documents, 2/2 context documents, 4/4 official Atlassian source areas and a
second admission/send/publication/recovery sweep. Each reviewer independently
assessed all seven principles, including human-board versus noninteractive
agent behavior. Those verdicts do not cover the later PR feedback revision.

This verdict covers a **read-only discovery design**, not a completed D1 Task:
the service identity, native metadata, contextual permissions, event
installation, comment behavior and safe transition capability still need
authorized evidence. No Jira mutation or live integration check was performed.
Documentation-only changes needed no new automated tests; relative links and
`git diff --check` passed locally.

## PR #12 feedback revision

The [product/documentation review](jira-connection-product.md) and
[technical/security review](jira-connection-technical.md) independently return
**CLEAN** for the later five-file revision against `381dcb9`. Each report lists
the exact source SHA-256 values, examines 5/5 changed source files and all 6/6
PR feedback topics, makes a second sweep, and records its own concrete
assessment of all seven principles for human and agent use. The reviewed
revision defines native Jira blocker mapping; defers rich webhook payloads;
uses append-only progress comments; and permits automatic transition only with
a full server-enforced eligibility guard. The provisional S06 Story and delivery
queue agree on a manual handoff when that guard is unavailable. The PR #7
review evidence is inherited from the updated stacked base, not supplied by D1.

The reviewer reports name the earlier SHA-256 of this record before this
verdict paragraph and the queue status update. These final edits record review
status only; they do not change the D1 design, Task or Story criteria. D1's
identity, link configuration, source audience, comment write and transition
checks remain open. Design CLEAN is not live acceptance or permission to mutate
Jira.
