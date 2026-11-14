# Admission scenarios and edit handling

PGB-67 discovery, 14 November 2026. This is a design truth table, not implemented
behavior or a live test result. It consolidates the owner's decisions and the
[work](manager-work-contract.md), [stack](manager-stack-repair.md),
[handoff](manager-handoff-contract.md) and [state](manager-state.md) contracts.
No additional worker, status, monitoring or automatic recovery is introduced.

## What the manager decides

An admission starts one complete automated cycle, including implementation, review
and AI QA. A queue operation only moves a stale completed child into Rework Queued.
It does not start a worker. Preview returns the same eligibility/reason with zero
Jira or operational-state writes. Current native Jira facts and valid linked
handoffs remain required even when an earlier scan recorded a decision.

In the table, A/B/C are in one numbered stream unless stated otherwise. All
unmentioned inputs are complete and valid; no earlier-priority work exists. Every
permitted mutation still requires the fresh reads, durable intent and source edge
in the admission protocol. “Hold” means no manager mutation for the affected
stream, not an automatic Jira Blocked transition. Unknown shared scope holds all
writes for that scan.

## Candidate and capacity matrix

| ID | Situation | Required result |
| --- | --- | --- |
| S01 | Opted-in Epic is In Progress; A is Ready to Work; stream empty; zero Human Review | Select A for new admission |
| S02 | Epic has no configured opt-in label, or is not In Progress | No admission or manager stack-queue mutation; active workers may finish their own permitted cycle |
| S03 | Earlier A is in refinement; later independent B is Ready to Work | Ignore A as candidate; select B |
| S04 | A is Ready to Work but has a required null; independent B is complete | Report A's field error; B can be selected; no agent launched to finish A's specification |
| S05 | B requires A's AI-QA completion; A is unready, unfinished or lacks coherent current evidence | B is ineligible; do not invent completion or a different prerequisite condition |
| S06 | Complete prerequisite A is Human Review, Product Acceptance or Done, with matching completion evidence and no unresolved repair affecting B | A's prerequisite is satisfied; human merge/testing is not an extra implicit admission gate |
| S07 | Ready Bug B and independent ready Story A are both eligible | Select B; Epic order breaks ties between eligible Bugs |
| S08 | Bug B is unready; Story A is eligible and independent | Ignore B as candidate; select A |
| S09 | Understood repair A is queued; new Bug B is ready | Repair A precedes B; a missing repair input holds the repair chain rather than opening a bypass |
| S10 | Ready prerequisite P is needed to execute the queued repair; it is otherwise eligible | P precedes the repair; unrelated new work does not replace it |
| S11 | A occupies In Progress, In Review or QA | No second admission in that stream; changing worker type does not free it |
| S12 | One stream has four Human Review tickets, no active cycle and an eligible candidate | One candidate can start; its return would make five |
| S13 | One stream has five Human Review tickets and an eligible Story or Bug | No admission; Bugs obey the same cap |
| S14 | Rework A is queued and four other tickets are in Human Review | A can start if other gates pass; reserve its return as the fifth ticket |
| S15 | Rework A is queued and five other tickets are in Human Review | A waits for human work to free capacity; no repair exception to the cap |
| S16 | A leaves Human Review for a configured later accepted stage | It no longer occupies the five-ticket Human Review count; retain facts needed for dependencies and lineage |
| S17 | A is genuinely Blocked, or the stream has an unresolved manager intent | Hold the stream; no autonomous unblock, expiry or replay |
| S18 | AI-Daniel-1 is occupied; AI-Daniel-2 has an eligible ticket and no shared uncertainty | Daniel-2 can proceed independently; full labels identify streams |

Capacity counts every known member in Human Review, including Bugs and pending
human test cases. A candidate in Ready to Work/Rework Queued is not already in that
count. Its admission requires `Human Review count + 1 <= 5`. A queue-only operation
may remove B from Human Review even when the count is five; it starts nothing and
cannot let unrelated C bypass the required repair. Existing active work is never
interrupted to enforce a newly observed inconsistency.

## Repair and live-work matrix

| ID | Situation | Required result |
| --- | --- | --- |
| S19 | A needs confirmed repair while B is already active | The responsible reviewer/QA worker or authorized human-request path records A in Rework Queued; B's existing cycle continues; no concurrent A implementer |
| S20 | B can finish its assigned cases without depending on the unresolved A repair | B can reach Human Review; then A repair is considered before new C |
| S21 | A's known defect makes B's required checks impossible | Responsible B worker records dependency wait and unfinished checks, moves B to Rework Queued; manager does not repair it or start A concurrently |
| S22 | A's repair is implemented but review/AI QA is incomplete | Do not queue completed B on implementation evidence alone |
| S23 | A completes its repaired revision; B's recorded actual parent is A at an older affected revision; B is in Human Review | Manager queues B with the repair roots and required parent completion; preserve B's old assignment pointer until admission |
| S24 | Same evidence as S23, but B is active | Do not interrupt or move active B; later re-evaluate its published result and current stage |
| S25 | B has already consumed the applicable repair roots at the required parent completion | Do not queue B again |
| S26 | B is next in Epic order but does not record a code dependency on A | No stack update merely from order or a shared stream |
| S27 | A is normally merged/retargeted without a recorded repair | No stack update merely from the merge/retarget; humans own PR maintenance |
| S28 | B must update its stack, but its PR is already merged, lineage is absent, or the fix needs more scope | Human handling; no replacement/multi-PR job inferred. Implementer PR preflight owns the actual open-PR check |
| S29 | A second parent repair arrives before B starts | Preserve all applicable repair causes and select current coherent parent evidence; no dropped older finding |

The manager has no PR polling API in this release. S28's merged-PR fact is supplied
by worker preflight or trusted handoff evidence; scheduling cannot promise advance
knowledge it does not have. Missing required Jira lineage is detectable directly.
The detailed reference/root rules remain owned by the handoff contract.

## Membership changes and incomplete knowledge

| ID | Situation | Required result |
| --- | --- | --- |
| S30 | One full label appears in two active opted-in Epics | Hold that stream and show both Epics; do not choose one by timestamp/order |
| S31 | A known live/queued/blocked/Human Review ticket loses its label, changes parent or disappears from the Epic list | Continue reading its retained stable ID; hold its previous stream until a human reconciles the mismatch; do not free capacity from a filtered search |
| S32 | The same known ticket is relabelled into another configured stream | Include both old and proposed scopes in the mismatch diagnostic; do not admit it under the new label while its previous ownership is unresolved |
| S33 | An unstarted independent preparation/Ready ticket is removed from the Epic plan | It is no longer a candidate; removal is allowed only when no required dependency refers to it |
| S34 | A prerequisite is removed or cancelled | This does not satisfy its required outcome; dependent work stays ineligible pending revised human requirements |
| S35 | A ticket enters an unmapped or ambiguous native status | Hold the affected scope; Jira's broad To Do/In Progress/Done category cannot determine product meaning |
| S36 | A required known ID is inaccessible/deleted, a page is missing, or a search is incomplete | Hold affected scope; shared discovery uncertainty holds the scan; never count missing as finished |
| S37 | Human reorders eligible independent tickets before admission | New Epic order controls future ties; do not rewrite an existing assignment or actual parent lineage |
| S38 | Requirements, relevant Epic membership or completion revision changes before durable intent | Return changed-input/no-write; use a later fresh evaluation rather than continuing an old selection |
| S39 | Two tickets are already active in one stream | Report inconsistent occupancy and hold new manager mutations; do not stop either Cursor run automatically |
| S40 | Epic is paused after one worker cycle started | No new admission or manager queue operation; that cycle may reach Human Review if it needs no correction |
| S41 | Relevant inputs change after durable intent or comment/pointer publication but before transition | Send no transition; preserve the intent and already-published evidence as a human hold. A fresh scan cannot clear it or replay publication |

These edit rules do not create a migration, cancellation or human-unblock feature.
A cancellation is never successful completion. The first release must map native
accepted and cancelled outcomes separately and document how an operator reconciles
retained ownership. Until those operational steps and initial inventory are tested,
they remain implementation-readiness gates; a truth table is not that proof.

## Remaining proof and owner choices

No new product decision is needed for the scenarios above beyond the existing
proposal that Epic pause also prevents manager queue-only mutations. Keep that
proposal visible for the owner's complete Story-set review; workers' permitted
handoffs are unaffected by the manager pause.

The following remain technical discovery work: bounded initial inventory, retained
ID/state layout and retirement, tested Jira source edges, actor/property transport,
request ceilings, exact IAM and safe operator reconciliation. Do not manufacture
ready Stories from this matrix while those facts are missing. The complete delivery
plan must map each scenario to its implementation slice and executable acceptance
case. Current local observation checks cover transport only.

## Author assessment

Intuitive: one automated cycle occupies one stream. Discoverable: each case states
an observable decision and responsible component. Delightful: independent ready
work proceeds without interrupting paid active work. Token saver: readiness,
priority and holds are deterministic. Secure: missing scope is not treated as
absence and text cannot grant new authority. Agents are equal: exact outcomes and
unfinished evidence complement readable human diagnostics. Dependable: capacity,
queued repair and uncertain ownership remain distinct. Unified configuration:
existing native mappings and the one customer configuration own all interpretation;
this table introduces no new settings or competing work record.
