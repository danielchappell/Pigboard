# Ski Stack development plan

21 September 2026. This is the active development queue. It follows the
[architecture direction](architecture-plan.md) and [working process](development-workflow.md).
Earlier architecture and delivery-plan reviews were CLEAN for their recorded
versions. The [review record](development-review.md) separately identifies the
current alignment verdicts and exact hashes; historical verdicts do not approve
changed documents. This plan does not claim unresolved discovery is finished.

## Owner decision and current sequence — 21 September 2026

Pigboard's [product direction](product-strategy.md) is an opinionated AI SDLC
that we maintain and improve. The owner identifies the existing Ski Stack process
as a working starting point and directs us to settle the architecture, roadmap
and core functionality before iterating on the development method.

Current focus: **S01 merged; D4 design CLEAN, D1 and D4 live discovery open**.
Architecture/queue alignment is CLEAN for the exact artifacts in
[review evidence](development-review.md). The implementation reuses the unchanged
D2 contract and S01 Story/plan after a current-code check. Two fresh independent
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
claiming an estimate before discovery. **All Stories except S01 remain Provisional — not
ready for delivery.** S01 is implemented, independently reviewed and merged;
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
| Complete | D2: Define durable attempts and recovery | Design CLEAN from two independent reviewers; [contract](designs/hosted-work-contract.md) | Defines logical ownership/interfaces/recovery and resolves S01 configuration-only inputs; physical/live guarantees remain D1/D3/D4 gates. |
| Next | D1: Verify Jira identity and workflow | Competitive docs/UI-shell evidence collected; service identity, action availability and workflow contract remain open | Pin connection/transition/race constraints and reuse suitable native capabilities before Jira delivery Stories. |
| Design CLEAN; live gates open | D4: Define and verify runner capabilities | [Runner design](designs/runner-capabilities.md) and [review record](reviews/runner-capabilities.md) separate the reviewed mapping from repository, read-only, teammate and meaningful-work checks | Treat PR #7 as manual S03; S04 inspects an existing run; S05 cannot send until the live gates are met. |
| Authorized live checks pending | [D4L: Verify Cursor pilot access and source identity](tasks/architecture-decisions.md#d4l--verify-cursor-pilot-access-and-source-identity) | No repository, actual-commit, enforced read-only, teammate or meaningful-work proof yet | Record each pass/failure/unknown in the named evidence artifact. No company-account substantive compute. |
| Contingent on failed Cursor read-only or source binding | [D4F: Evaluate a hosted Codex fallback](tasks/architecture-decisions.md#d4f--evaluate-a-hosted-codex-fallback) | No provider switch has been chosen | If Cursor cannot meet both real-repository gates, evaluate Codex and obtain an explicit revised provider decision before S05/A1. |
| After relevant D1/D4 facts | D3: Choose deployment and team access | Ready for options/access discovery; final selection follows D1/D2/D4 constraints | Make hosting, credential custody, shared inspection and operating costs concrete before deployment Stories. |

These are Tasks, not promises of two-day implementation. **D4-design** means a
reviewed runner mapping and PR #7 manual disposition. **D4-source** means D4L
has verified which immutable commit Cursor actually used for the saved run; a model
reply or local digest alone does not close it. **D4-live** means D4L has also
verified the repository grant, enforced read-only behavior, second-user access
and authorized meaningful-work check for the exact hosted connection, repository
and permission policy S05 will use. Evidence from another account or connection
does not close this gate; a change to those inputs reopens the affected checks.
D4-design can support S03/S04 without
D4-live; S26 needs D4-source, and S05/A1 need D4-live. If read-only or source
binding fails, D4F and a new owner provider choice
precede hosted activation. D2 is now reviewed. The configuration-only portions of D1/D4 are resolved in
that contract; their live identity, permission and capability checks remain open.
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
| S02 | Explain whether one Jira ticket is eligible without starting it | S01, D1 | Jira reads/normalization and existing core policy, one inspection command. |
| S03 | Start and retrieve one manual Cursor cloud job with stable identity | D4-design; PR #7 retrospective Story/plan and committed-code reviews | Existing standalone CLI and library, kept separate from hosted launch authority; no repository-backed acceptance claimed. |
| S04 | Save and retrieve an existing provider run from shared durable state | S03, D2, D3, D4-design | Manually register and inspect a run after restart; mutable or unattested revisions are inspection-only, not validation/publication input. |
| S05 | Explicitly start one eligible Jira request once | S02, S03, S04, D1, D2, D3, D4-design, D4-live | Atomic attempt/send reservation plus D2 provider facade and one operator-invoked launch/recovery command. Recheck size after discovery; split only into complete usable outcomes. |
| S26 | Observe and validate a saved provider result | S04, D2, D4-design, D4-source | One observation/validation command stores a role result or needs-attention; source revision must be proven immutable before validation. |
| S06 | Publish one stored result back to its Jira ticket safely | S05, S26, D1, D2 | Progress/result projection, guarded transition and recoverable publication command. |
| S07 | Pick up eligible tickets and reconcile existing attempts automatically | S05, S26, S06 | Bounded scheduled coordinator tick, one active attempt, stored polling/progress; no new queue policy. |
| S08 | Run that coordinator independently of a developer's computer | S07, D3 | Deployment/configuration using selected services, authenticated health/inspection and operational guide. |

S04 is a usable shared run-inspection capability, including a process restart;
it is not an unused schema migration. S05 exposes a deliberate single-ticket
operation before automatic scheduling. S26 observes and validates the role result before S06 can publish it. S06 is a
complete recoverable publishing operation for a validated ticket-linked attempt. S08 does not silently
add a dashboard, subscription billing or multi-tenant administration.

**A1: Accept the hosted Jira discovery journey** is a queued validation Task
[with its own body](tasks/architecture-decisions.md#a1--accept-the-hosted-jira-discovery-journey).
It is blocked on S01-S08 and S26 delivering their intended outcomes, D1-D3,
D4-design and D4-live
resolved, required reviewed checks passing, and an authorized acceptance
environment. A1 alone closes M2 after recording all required live evidence:
 demonstrate the complete Jira journey,
replay/restart/failure recovery, one writer, laptop independence and second-user
visibility. A meaningful model task needs an authorized environment; company
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
| S25 | Restore stored run state and reconcile outstanding work after recovery | M6; D8, selected backup mechanism and existing resume/publication behavior. |

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
- Existing but unmerged: [Cursor PR #7](https://github.com/danielchappell/ski-stack/pull/7),
  current commit `da2fc8ccc0cdc4cd0493c16691d286309f513c9f` against
  `005419b63460540bfbb96400c46e7274a47af723`. The retrospective Story/plan
  reviews and two fresh full-PR committed-code reviews are CLEAN for that SHA;
  [evidence](reviews/runner-capabilities.md#pr-7-retrospective-and-committed-code-evidence)
  records coverage. Focused 22 and full 239 local tests pass. It remains
  separate from hosted launch and has no hosted CI or repository-backed live proof.
- D4's [runner design](designs/runner-capabilities.md) maps PR #7 to S03's
  usable standalone command. S04 stores and inspects an existing run; S05 is
  the first hosted send after durable ownership and D4-live evidence. A recovered
  manual run is not automatically bound to the hosted request. D4's
  repository/read-only/visibility gates remain open; preserve PR #7's branch.
- Current main has no hosted CI workflow. This is an evidence gap to record in
  each future plan, not permission to describe local tests as hosted checks or
  to add infrastructure as an unreviewed side effect.
- No Jira board, automation, ticket, credential, paid cloud job, deployment or
  package installation changed during this planning Task.

## Author's delivery-plan assessment

| Principle | Assessment |
| --- | --- |
| Intuitive | Configuration/inspection precede launch; stages have one named outcome and explicit predecessors. |
| Discoverable | Task outputs, Story bodies, readiness rules and current next work are linked from this queue. |
| Delightful experience | Discovery can progress without repetitive approval prompts; unsupported setup and access are identified before paid work. |
| Token saver | Reuses current code/API evidence and avoids speculative full implementation plans for blocked future Stories. |
| Secure | Access, source/result audiences, external-write races and runner capabilities gate dependent work; no credentials appear in artifacts. |
| Agents are equal | CLI/board operations supply shared commands for real MCP inspection/creation, with explicit authorization and structured recovery. |
| Dependable | Existing implementation, review status, live proof and future outcomes remain distinct; no unresolved preview is marked ready. |

S01 delivers the reviewed M1 configuration outcome at merged main
`005419b63460540bfbb96400c46e7274a47af723`. D1 still needs the selected
integration identity and permission/transition/race evidence. D4's design and
PR #7 standalone Story/plan and code are independently CLEAN at the recorded
SHA. This PR's D4 feedback revisions have two exact-artifact CLEAN reviews
recorded in the linked review record.
Repository permissions, enforced read-only behavior, second-user visibility
and meaningful-work authority remain unverified. S02 and hosted activation
stay gated on their respective decisions. PR #7 remains separate and unmerged.
