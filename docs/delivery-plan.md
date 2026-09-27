# Ski Stack development plan

Updated 27 September 2026. This is the active development queue. It follows the
[architecture direction](architecture-plan.md) and [working process](development-workflow.md).
Earlier architecture and delivery-plan reviews were CLEAN for their recorded
versions. Their [review record](development-review.md) identifies those
historical verdicts and exact hashes. The current revision's independent
verdicts belong in this documentation Task PR; historical verdicts do not
approve changed documents. This plan does not claim unresolved discovery is finished.

## Owner decision and current sequence — 27 September 2026

Pigboard's [product direction](product-strategy.md) is an opinionated AI SDLC
that we maintain and improve. The owner identifies the existing Ski Stack process
as a working starting point and directs us to settle the architecture, roadmap
and core functionality before iterating on the development method.

Current focus: **S01 and S03 merged; D1 Pigboard discovery, D3 and D4 live gates open**.
The owner selected one shared-cpu-1x/1 GB Fly Machine and a dedicated Pigboard
Neon Free project with point restore limited to the actual usable history, at
most about six hours or 1 GB of changes, and no scheduled snapshots. The
[selected D3 design](designs/hosted-fly-neon-free.md) carries decisions from
an [earlier reviewed revision](reviews/hosted-fly-neon-free.md). Its current
revision requires its own exact-artifact review before implementation. Live
isolation, quota, load, authority and restore gates remain open.
The earlier Neon Launch and Fly Managed Postgres reviews are historical for
their exact artifacts. The approved 90-day lifetime for minimal completed-run
metadata is a separate policy and remains unchanged.
The authorized next six-outcome order is **S02a → S02b → S04 → S26 → S05 → S06**. S02a
owns customer project-and-board selection; S02b owns read-only ticket
eligibility. The owner approved the S02 split on 27 September 2026 to keep one
complete outcome per PR. The [D3 first-service Task](designs/s02a-first-service.md)
found that combining the first host, authentication, SQL store, Jira metadata and
pair selection in S02a is roughly 22–26 changed files. It cannot be promoted as
one Story under the 20-file limit. Re-groom one or more complete prerequisite
technical outcomes before coding; the final PR count may exceed six. Each slice
still needs its own resolved prerequisites, reviewed implementation plan,
exact committed-code review and current-head checks; the stack order does not
turn a blocked Story into a ready one.
Earlier architecture/queue alignment was CLEAN only for the exact artifacts in
[review evidence](development-review.md). The earlier PIG revision has its own
CLEAN [design review](reviews/pig-jira-connection-discovery.md) at `902b62b`;
PR #19 gave the revised project-board design and six-outcome plan fresh CLEAN
reviews at `a8aa7b7` and merged them with the same file tree. This new D3
first-service revision and queue require their own exact-artifact reviews;
live gates remain open. The implementation reuses D2's unchanged
behavior and S01 Story/plan after a current-code check. D2's current file has
editorial S02a/S02b references that need exact-revision review. Two fresh independent
committed-code reviews are CLEAN; [S01 evidence](reviews/workflow-profile.md)
records exact revisions and coverage. [PR #9](https://github.com/danielchappell/ski-stack/pull/9)
and its documentation base [PR #8](https://github.com/danielchappell/ski-stack/pull/8)
were merged externally. The babysitting cycle corrected two valid
display-safety/eligibility findings; its fresh review gate is recorded
separately from those initial CLEAN verdicts.
Earlier review verdicts remain tied to their exact artifacts.

The order is:

1. Confirm the retained component/authority boundaries and this delivery order;
   resolve D1/D3/D4 facts before their dependent live Stories.
2. Deliver M1/M2 through small usable slices: setup/inspection, provider execution,
   shared ownership/state, result validation, Jira publication, automatic recovery
   and laptop-independent operation. A1 records the full hosted acceptance.
3. Carry the existing process through M3's reviewed lifecycle handoffs. D5 defines
   the necessary migration contracts without redesigning the method first.
4. Improve that running baseline from observed interventions, rework and delivery
   results. M4/M5 packages and MCP retain their real dependencies; M6 scale and
   later process work do not become prerequisites to the first useful foundation.

D0 market research and a complete native-versus-package experiment are deferred
from the critical path. They inform later commercial choices, not permission to
build the authorized core. The [competitor comparison](research/2026-09-21-competitor-build-versus-buy.md)
and [sources](research/2026-09-21-competitor-sources.md) remain useful inputs for
concrete integration choices. This owner decision supersedes the research's
recommendation to make commercial discovery a prior foundation gate.

Jira adapter remains before a later installable Jira app. Company Cursor use stays
limited to trivial adapter checks; meaningful live acceptance still needs an
appropriate authorized account/budget. No roadmap change expands that authority.

## How to use this queue

Start with the discovery decisions below, then promote only the Stories whose
inputs are resolved. Each Story gets a concrete repository-grounded implementation
plan and two independent CLEAN plan reviews before code. Do not implement the
entire roadmap as one project-sized branch.

The product architecture covers the whole direction. Later Story previews give
that direction a delivery shape without inventing implementation contracts or
claiming an estimate before discovery. **All Stories except S01 and S03 remain
Provisional — not ready for delivery.** S01 and S03 are independently reviewed and merged;
live discovery and hosted acceptance remain outstanding as recorded below.
Each preview must be sized and, if necessary, split after
its blocking Tasks. No estimated file/day count below is a delivery commitment.

A ready Story must have one usable outcome, a credible changed-file inventory of
at most 20 total files, less than two human working days including tests/docs/PR
preparation, concrete QA access, resolved security/contracts and a reviewed plan.
Tasks that change those facts precede readiness. Keep discoveries and implementation
separate. All Story bodies use the owner's `write-pr-sized-stories` structure.

## Ready discovery queue

[Task bodies](tasks/architecture-decisions.md) define outputs and validation.
The Tasks may proceed without another routine approval where access is already
authorized; missing credentials/access or a genuine owner choice remain explicit.

| Order | Task | State | Why now |
| --- | --- | --- | --- |
| Later commercial discovery | D0: Test the product need | Deferred from the foundation path; target-team evidence and outreach authority unresolved | Inform audience, offer, adoption and commercial rollout; not a prerequisite to the authorized one-team foundation or baseline process. |
| Complete decision; current revision review gate | D2: Define durable attempts and recovery | Two reviewers found an earlier [contract](designs/hosted-work-contract.md) revision CLEAN. PR #23 also changes its validation, binding and publication guards, so that verdict does not cover this revision. Record the exact-final-revision verdict on PR #23 before merge. | Defines logical ownership/interfaces/recovery and resolves S01 configuration-only inputs; physical/live guarantees remain D1/D3/D4 gates. |
| Revised PIG design; new early-service revision review and live gates apply | D1: Verify Jira identity and workflow | [Active Pigboard design](designs/pig-jira-connection-discovery.md) selects `PIG` Task + To Do + `ai-enabled` through an explicit project-board pair. PR #19 reviewed its earlier PIG revision CLEAN; this owner-approved project-scope revision needs its own exact-artifact review. The [INT record](designs/jira-connection-discovery.md) is historical. A Scubapig Jira User service account exists, but its credential, effective permissions, native IDs, blocker mapping, per-issue authority and transition guard remain open. | Review the owner-approved project chooser and pair-scope change, then complete identity-scoped preflight and controlled checks before Jira write Stories. S02a needs project/board metadata; S02b needs issue/link/audience facts. |
| Revised design reviewed; live gates open | D4: Define and verify runner capabilities | The [runner design](designs/runner-capabilities.md) and [review record](reviews/runner-capabilities.md) cover the imported-run format/source correction and PR #7's separate standalone code. | Treat PR #7 as manual S03; S04 inspects an existing run; S05 cannot send until the live gates are met. |
| Authorized live checks pending | [D4L: Verify Cursor pilot access and source identity](tasks/architecture-decisions.md#d4l--verify-cursor-pilot-access-and-source-identity) | No import source-audience, repository, actual-commit, enforced read-only, teammate or meaningful-work proof yet | Record each pass/failure/unknown in the named evidence artifact. No company-account substantive compute. |
| Contingent on failed Cursor read-only or source binding | [D4F: Evaluate a hosted Codex fallback](tasks/architecture-decisions.md#d4f--evaluate-a-hosted-codex-fallback) | No provider switch has been chosen | If Cursor cannot meet both real-repository gates, evaluate Codex and obtain an explicit revised provider decision before S05/A1. |
| Revised Neon Free design; exact-revision review and staged live gates apply | D3: Choose deployment and team access | [Selected one-team design](designs/hosted-fly-neon-free.md) and the [earlier revision’s review record](reviews/hosted-fly-neon-free.md). The [Neon Launch design/review](designs/hosted-fly-neon-launch.md) and prior [Fly MPG brief](designs/hosted-deployment-options.md) are historical for their exact artifacts. | The [first-service Task](designs/s02a-first-service.md) moves the Fly-held secret boundary no later than S02a and requires an owner-approved project scope, named human/agent grants, a scoped SQL role and a pinned original-root endpoint. Re-groom the oversized combined S02a before implementation. The first hosted Story must prove secret-safe restart/rollback, sleep-safe liveness and bounded store failure; S02a then rejects a child target before any pair read or save. Before S02b, prove current-team human viewer and scoped agent inspect grants before lookup, a denied same-pair caller and D1's minimal issue-audience lookup before richer reads. Before S04, prove root/child endpoint identity and ordinary grant boundaries, a disposable two-client SQL feasibility probe, actual Free limits and test identities. S04 reuses the pin for registered-run inspection and tests child-read denial on that path; S05 proves no child-target send. S08 adds coordinator load/second-teammate and quota checks to that first host. S29-S31 build recovery; A1 proves the measured within-project Free restore window and full interlock. |

These are Tasks, not promises of two-day implementation. **D3-design** means the
selected Fly + Neon Free architecture has two CLEAN independent design
reviews of the exact revision being implemented. The linked historical record
alone does not establish that gate for a changed file. **D3-early authority/store** gates S02a's first shared-store use: a concrete owner bootstrap and scoped human/agent grant path, owner-approved project set, scoped SQL role, separate original-root pin and versioned pair record. Its first-host obligations may be delivered by a separate complete prerequisite Story because the combined S02a estimate exceeds 20 files. S02a implements and tests effective-target rejection on startup, reconnect and before selection reads or writes, including a changed secret pointing to a child. S02b additionally needs verified viewer/agent inspect grants before any issue lookup, a denied-caller check and D1's minimal metadata proof of issue audience before richer reads or output. **D3-store/access** is the narrower pre-S04 live
gate: dedicated Pigboard Neon isolation, scoped SQL/test identities, recorded root/child endpoint identities and ordinary grant boundary, and a disposable
two-client SQL transaction/reconnect probe. S04 reuses S02a's pin for application registration/inspection and tests child-read denial on its run path; S05 proves no child-target send. **D3-host/recovery** remains open
through S08 and S29-S31 until Fly load/team operation, control grants,
the measured Free restore history and the full restore interlock are proven at A1. S04 does
not depend on capabilities those later Stories implement. The 90-day minimal
post-terminal metadata policy is unchanged; other data-class retention choices
must be recorded before the Story that first stores each class: S26 for any
provider result, S05 for copied Jira source, prepared requests or sealed
credentials, and S06 for publication evidence. If an earlier Story stores a
class, its decision moves earlier. **D4-design** means a
reviewed runner mapping and PR #7 manual disposition. S04 additionally needs
D4L's run-specific origin and source-audience import proof before any shared
provider status/result inspection; pair registration alone is not proof.
Recheck current source-to-target disclosure on every S04/S26 read.
**D4-source** means D4L
has verified which immutable commit Cursor actually used for the saved run; a model
reply or local digest alone does not close it. **D4-live** means D4L has also
verified the repository grant, enforced read-only behavior, second-user access
and authorized meaningful-work check for the exact hosted connection, repository
and permission policy S05 will use. Evidence from another account or connection
does not close this gate; a change to those inputs reopens the affected checks.
D4-design can support S03/S04 without
D4-live. S26 may format-check an audience-authorized import without D4-source,
but must not mark repository-backed output as validated ticket work or eligible
for publication until that exact run has D4-source and the separate trusted
original-request binding. S05/A1 need D4-live. If read-only or source
binding fails, D4F and a new owner provider choice
precede hosted activation. D2's substantive contract was reviewed at its
recorded earlier revision. The current D4 imported-run format correction has
its own design verdict in the [D4 review record](reviews/runner-capabilities.md).
The configuration-only
portions of D1/D4 are resolved in that contract; their live identity,
permission and capability checks remain open.
S01 can be implemented without those live checks because its complete outcome is
a truthful offline route preview. It never authorizes live execution.

## First Story and ordered milestone previews

Story IDs stay stable when review adds a missing slice; table order and
dependencies determine sequence, not the numeric ID. Dependencies indicate real
prerequisites, not a forced serial schedule. D2/D3/D4
can resolve without D1's live access, but write activation cannot bypass D1.
The numeric order is a suggested progression; independent work may overlap once
its decisions and plan are ready.

| ID | One complete outcome | Depends on | Likely change boundary; must validate sizing |
| --- | --- | --- | --- |
| [S01](stories/validate-workflow-profile.md) | Validate a saved workflow configuration and explain its route | Reviewed D2 plus configuration-only D1/D4 decisions; [per-Story plan](plans/validate-workflow-profile.md) must have two CLEAN reviews | Nine expected implementation files, twelve including supporting updates; estimated 12 human hours. |
| S02a | Choose and correct one Jira project-and-board pair | S01, D1 service-identity project/board/filter/column metadata and safe correction fixture, D3 reviewed first-host/authentication/scope/store path plus any complete prerequisite technical Story | A verified human or agent connection administrator chooses named projects inside current owner-approved site/project scope, then an associated board; save revalidates Task/To Do visibility and records a versioned pair. The first service holds SQL/Jira secrets, pins the original root separately, and rejects a child target before reads or writes. Correction refuses active/uncertain effects; old records stay inspectable. No issue inspection or Jira write. The combined preview is estimated at 22–26 files and is **Provisional — not ready for delivery** until split and independently plan-reviewed. |
| S02b | Explain whether one Jira ticket is eligible without starting it | S02a, D1 issue/link/audience and minimal-field facts, D3 current-team human viewer/scoped agent inspect grants and denied-caller proof | Jira reads/normalization and existing core policy, one inspection command limited to S02a's selected project-board pair and the caller's source audience. Check app caller authority before any issue lookup, then use only proven minimal metadata to establish project, board and issue audience before richer reads or output. Denied callers and denied/unknown audiences get no ticket facts. Recheck file/time size after D1/D3. |
| S03 | Start and retrieve one manual Cursor cloud job with stable identity | D4-design; PR #7 retrospective Story/plan and committed-code reviews CLEAN | Existing standalone CLI and library, kept separate from hosted launch authority; no repository-backed acceptance claimed. |
| S04 | Register and inspect an existing provider run across processes | S03, D2, D3-store/access, D4-design, D4L run-specific import audience proof | Reuse S02a's live-root authority boundary with selected isolated Neon Postgres, independently pinned original-root endpoint and current Pigboard-scoped access; persist immutable run identity, trusted original-audience evidence, current source-to-connection disclosure grant, registration-time selected pair/version and last status/time with explicit result omissions. Pair/version or account/repository match does not prove a run's original audience. Recheck source disclosure and target viewer/agent grant on each shared read, hiding saved ID/status/link on revocation; deny provider reads and registration without run-specific proof. Discard co-returned result text. Mutable or unattested revisions remain inspection-only after audience proof. S26 owns result observation and validation. Recheck 20-file/<2-day size after D3 store/access and D4L import proofs. |
| S26 | Observe and validate a saved provider result | S04, D2, D4-design, policy for any stored provider result; D4-source and trusted original-request binding gate validated ticket work and publication eligibility | One observation/validation command stores bounded output, format outcome and binding state. Read an imported result only after S04's current source-audience authorization is rechecked; it can be format-checked within that audience without D4-source but stays nonpublishable. Publication eligibility additionally requires S05's trusted immutable launch record, independent original-request binding and proof of the actual checkout commit. |
| S05 | Explicitly start one eligible Jira request once | S02b, S03, S04, D1, D2, D3-store/access, D4-design, D4-live, policies for any stored source/request/credential | Atomic root authority check and attempt/send reservation plus D2 provider facade and one operator-invoked launch/reconcile command. The original root endpoint is pinned separately from the connection secret; changing that secret to a historical child denies reads and sends. Recheck size after discovery; full disaster-recovery implementation remains a later gate. |
| S06 | Publish one stored result back to its Jira ticket safely | S05, S26, D1, D2, policy for stored publication evidence | Publish only a format-valid result with proven trusted launch, original request and actual checkout commit for unchanged ticket input; an unbound import stays nonpublishable. Append-only progress/result comments and recoverable publication; automatic transition only if Jira enforces the full eligibility guard, otherwise manual handoff. |
| S07 | Pick up eligible tickets and reconcile existing attempts automatically | S05, S26, S06 | Bounded scheduled coordinator tick, one active attempt, stored polling/progress; no new queue policy. |
| S08 | Run the automatic coordinator on the existing Fly service | S07, D3-design, D3-store/access, earlier hosted selection path | Add the scheduled coordinator to the first-hosted service, then prove shared-cpu-1x/1 GB load, second-user operation, quota observation and sleep-safe coordinator health. Earlier hosted selection owns its own secret/TLS/restart/rollback proof. |
| S29 | Quarantine one restored connection | S08, D3-design | Install the initial `normal` manifest and effect-read gate in a recovery-capable revision; recovery principal records expected-head cutover state, while the custodian proves exclusive deploy/provider fence and zero old Machines before attaching a Neon child branch in quarantine. Provisional — re-groom to the 20-file/<2-day limit after focused control-repository feasibility checks. |
| S30 | Reconcile one restored connection's external effects | S29, D1, D3-design, D4-design | Current-authority operator observes exact Jira/Cursor effects through a read-only quarantine route; record known effects and unknown or unbounded windows, never completion without enumeration evidence. Provisional — re-groom after focused credential/observation checks. |
| S31 | Reapply current access and reopen a restored connection | S30, D3-design | Use the live-root authority journal, rebind current provider credentials, reconcile and copy child data back into the root before atomic effect admission resumes; reopen only with full evidence and expected-head manifest update. Provisional — likely needs splitting after feasibility checks and a size inventory. |

S02a is usable connection setup, and S02b is usable read-only inspection; neither
silently starts work. S04 is a usable shared run-inspection capability, including a process restart;
it is not an unused schema migration. S05 exposes a deliberate single-ticket
operation before automatic scheduling. S26 observes and validates the role result before S06 can publish it. S06 is a
complete recoverable publishing operation for a validated ticket-linked attempt. S08 does not silently
add a dashboard, subscription billing or multi-tenant administration.

**A1: Accept the hosted Jira discovery journey** is a queued validation Task
[with its own body](tasks/architecture-decisions.md#a1--accept-the-hosted-jira-discovery-journey).
It is blocked on S01-S08, S26 and S29-S31 delivering their intended outcomes, D1-D3,
D4-design and D4-live
resolved, required reviewed checks passing, and an authorized acceptance
environment. A1 alone closes M2 after recording all required live evidence:
 demonstrate the complete Jira journey,
replay/restart/failure recovery, one writer, laptop independence and second-user
visibility. It includes a measured Neon Free **within-project** restore drill
with pre-attachment quarantine, a lost effect and access change, verified
copy-back to the live root and the full role-denial matrix. The selected policy
does not cover project or account loss. A meaningful
model task needs an authorized environment; company
Cursor checks remain trivial. Local mocked results are useful tests but are not
live acceptance. Mark M2 complete only when A1 records those results against the actual deployed
revision and the owner/product acceptance outcome; record a failed or unavailable
check as outstanding. Until then, every dependency on M2 remains unsatisfied.

## Remaining product map and Story previews

The [Story catalog](stories/development-roadmap.md) includes every S item. Later
milestones first revisit their focused design Tasks; none bypasses design review.
These rows preserve the complete product without turning uncertain work into
ready implementation.

| ID | One complete outcome | Milestone / real dependencies |
| --- | --- | --- |
| S09 | Produce a product brief from an idea ticket | M3; D5, M2, researcher handoff pattern. |
| S27 | Publish a reviewed technical-discovery handoff | M3; D5, M2, S09 or equivalent scoped product input; bridge the pilot researcher result into lifecycle evidence. |
| S10 | Record an independently reviewed architecture handoff | M3; D5, S09/S27 or equivalent accepted product/technical inputs; uses existing Architect role. |
| S11 | Groom reviewed architecture into linked PR-sized Stories | M3; D5, S10 or equivalent accepted design handoff. |
| S12 | Produce a reviewed implementation plan for one Story | M3; D5, S11 or an already-ready source Story; reuse existing planner protocol. |
| S13 | Implement one planned Story through a configured runner | M3; D5/D4, S12; source-write authority and supported isolated execution. |
| S14 | Independently review the committed result | M3; D5, S13 or an existing committed candidate; no self-review substitution. |
| S28 | Publish one non-draft PR for the reviewed commit | M3; D5, S14; recover an ambiguous create before another write. |
| S15 | Reconcile PR feedback and report readiness to the owner | M3; D5, S28 or an existing reviewed PR, source-control checks/feedback contract; no merge authority change. |
| S16 | Install one versioned Ski Stack role/skill package for Cursor | M4; D6, supported Cursor installation mechanism and M1 configuration contract. |
| S17 | Install the equivalent supported package for Codex | M4; D6, supported Codex mechanism; independent of S16 implementation. |
| S18 | Preview and apply one package upgrade without losing local configuration | M4; D6, one installed package from S16 or S17. |
| S19 | Inspect the team and a ticket run through MCP | M5; D7, shared application inspection from M2. |
| S20 | Create an ideation ticket through the same authorized control plane | M5; D7, S19 connection/auth context, D1 ticket-create contract. |
| S21 | Request a deliberate retry with a traceable new attempt | M5; D7, durable attempt contract and supported runner capability; UI/CLI and MCP share authorization. |
| S22 | Run two eligible jobs without ownership collisions | M6; D8, M2, transactional/fencing evidence and bounded provider capacity. |
| S23 | Operate a second team with isolated connections and run visibility | M6; D8 tenancy/access design, existing single-team commands. |
| S24 | Enforce a configured team launch limit and expose why work waits | M6; D8, launch accounting/limits and existing eligibility inspection. |
| S25 | Extend restored-state recovery beyond the one-team pilot | M6; D8, S29-S31 one-team restore and multi-team isolation evidence. |

The researcher path in M2 supplies the first technical answer. S27 explicitly
adapts it into the reviewed technical-discovery handoff; S09 adds the distinct
product viewpoint. S10-S15 and S28 carry reviewed outputs into delivery. Human acceptance,
questions and tie-breaking stay explicit. Additional UI beyond the board, source
control and provider views is designed only where inspection shows a real gap.
Interrupt/cancel is a capability-gated follow-up in D7; S21 must not pretend a
retry stops a running provider job. Broader providers, self-service commercial
onboarding and billing remain later product choices, not silently required code.

D5-D8 are [focused design Tasks](tasks/architecture-decisions.md) for lifecycle,
packages, MCP and multi-team operations; A1 is the pilot acceptance Task. They are queued by milestone, not blockers
on the first pilot. Each resolves the necessary contracts and obtains independent
CLEAN review before its Story previews can be sized and promoted. D5 carries the
existing method into hosted handoffs; later changes to the method are separate
slices supported by evidence from operating that baseline.

## Current work and evidence

- S01 (22 September): implemented on `codex/workflow-profile-preview`, explicitly
  stacked on the documentation Task at `6d44a924e403634c871dedeaa9069dc2ab1408ae`.
  Eleven changed files include tests, guides and queue/review bookkeeping.
  Implementation commit `74dee57e82b9463b6f674ca810e28b1a7e0c3113` has two
  independent CLEAN reviews; both reviewers also passed all 215 local tests
  (17 new). [PR #9](https://github.com/danielchappell/ski-stack/pull/9) was
  merged externally at `005419b63460540bfbb96400c46e7274a47af723`, after
  its base [PR #8](https://github.com/danielchappell/ski-stack/pull/8).
  The initial publication added only queue/review bookkeeping. A subsequent
  babysitting cycle fixed two valid text-report findings with regression coverage:
  19 focused and 217 full local tests pass. Fresh exact-commit review outcomes
  are recorded on PR #9, separately from the initial verdicts. There is no hosted
  CI workflow, PR-description thumbs-up approval reaction or live acceptance.
  See [exact evidence](reviews/workflow-profile.md).
- Completed: marker-only Cursor API discovery, including ambiguous-create
  recovery and duplicate rejection; [evidence](pilots/cursor-api-probe-result.json).
- Merged externally: [Cursor PR #7](https://github.com/danielchappell/ski-stack/pull/7),
  reviewed commit `da2fc8ccc0cdc4cd0493c16691d286309f513c9f`. The retrospective Story/plan
  reviews and two fresh full-PR committed-code reviews are CLEAN for that SHA;
  [evidence](reviews/runner-capabilities.md#pr-7-retrospective-and-committed-code-evidence)
  records coverage. Focused 22 and full 239 local tests passed at that revision. It remains
  separate from hosted launch and has no hosted CI or repository-backed live proof.
- D4's [runner design](designs/runner-capabilities.md) maps PR #7 to S03's
  usable standalone command. S04 stores and inspects an existing run; S05 is
  the first hosted send after durable ownership and D4-live evidence. A recovered
  manual run is not automatically bound to the hosted request. D4's
  repository/read-only/visibility gates remain open.
- D1's [active PIG connection design](designs/pig-jira-connection-discovery.md)
  keeps the identifier-only project Automation candidate, defers richer admin
  webhooks, and requires verified blocker mapping. Progress comments are
  append-only; status movement stays manual unless a full eligibility guard is
  proven. No service API credential, REST metadata, comment write or transition test
  is yet verified; S02a/S02b and automatic publication are not ready.
- Current main has no hosted CI workflow. This is an evidence gap to record in
  each future plan, not permission to describe local tests as hosted checks or
  to add infrastructure as an unreviewed side effect.
- The Scubapig Pigboard project key changed from KAN to PIG on 26 September;
  no ticket, workflow, permission, credential, automation rule or membership was
  changed. No provider work was launched.

## Author's delivery-plan assessment

| Principle | Assessment |
| --- | --- |
| Intuitive | An administrator chooses a named project within owner-approved scope, then a board in S02a; a teammate inspects a ticket in S02b before launch. Correction names active or uncertain work that must be reconciled. PIG Task + To Do + `ai-enabled` stays the visible opt-in route. Owner bootstrap adds pilot setup; the D3 store is not a teammate step. |
| Discoverable | Task outputs, separate setup/inspection Story bodies, readiness rules and the six-outcome order are linked from this queue. The oversized combined S02a is visibly provisional, with a prerequisite split pending. Human and agent setup guides must explain owner approval, credentials and current grants. |
| Delightful experience | One hosted secret holder and saved S02a pair avoid distributing powerful secrets or asking for Jira IDs on each inspection. The Free store can sleep, so first wake delay is reported honestly; Fly health must not keep it active. Owner approval is deliberate extra setup for broader project scope. |
| Token saver | Reuses current code/API evidence and avoids speculative full implementation plans for blocked later Stories. Agent responses must include uncertainty and omissions, not just short success text. |
| Secure | The owner alone approves site/project scope and issues grants; a current connection administrator may select only inside that scope. S02b checks current viewer/agent inspect grants before issue lookup, then verifies audience from minimal metadata before richer reads or output. Pair correction and later effect reservations use the live-root authority order and saved version. A stolen runtime SQL password can alter granted tables, so first-host custody matters. S04 additionally requires run-specific origin and current source-to-target disclosure; D1 audience, D4 source/read-only and later D3 recovery fences remain unproven live. |
| Agents are equal | Authorized human and agent callers both have scoped S02a selection and S02b inspection, with a distinct agent inspect grant and noninteractive structured choices/results. The recovery preview includes a noninteractive CLI observation route with the same role and connection checks; no browser-only handoff is required. |
| Dependable | S01/S03 merged scope, historical reviews, selected Free design and open live gates remain distinct. The first hosted Story must prove restart/rollback, bounded store wake and no silent repeat of an ambiguous pair save. S02a's saved pair does not prove S02b issue-read authority; a changed pair makes an old inspection stale. S26 reports format-valid but unbound results as nonpublishable. Free quota exhaustion closes new effects; S29-S31 remain provisional, with restore limited to measured within-project history. |

S01 delivers the reviewed M1 configuration outcome at merged main
`005419b63460540bfbb96400c46e7274a47af723`. The Scubapig integration
service account exists; D1 still needs its API credential and identity-scoped
permission, transition and human-edit race evidence. D4's imported-run
provenance and format-source correction received fresh exact-artifact reviews;
its live access gates remain open. PR #7's standalone Story/plan and code are
independently CLEAN at the recorded SHA, and its feedback revisions have two
exact-artifact CLEAN reviews in the linked review record.
Repository permissions, enforced read-only behavior, second-user visibility
and meaningful-work authority remain unverified. S02a/S02b and hosted activation
stay gated on their respective decisions. PR #7 merged externally; its live
repository-backed acceptance remains open.
