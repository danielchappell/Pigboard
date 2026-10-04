# Pigboard development plan

## Pigboard rebrand — requested 4 October 2026

The owner requested a consistent Pigboard identity using the existing product
and market-positioning decisions, the established scuba pig with a floating
virtual Kanban board, and ultimately Rovito's marketing-site style, design,
hosting and architecture. [Brand direction](brand-rebrand.md) maps that outcome;
[rebrand evidence](reviews/pigboard-rebrand.md) records exact reviews and checks.

This new rebrand work lives in the same queue. The recovery batch below retains
its scope, two-total-PR cap, unresolved decisions and owner authority. Branding
work does not advance its outcomes or authorize another recovery PR.

| Order | Outcome | Stage and dependency | Size including docs/review |
| --- | --- | --- | --- |
| B1a | Introduce the Pigboard product identity and mascot series | Logos approved; [PR #38](https://github.com/danielchappell/ski-stack/pull/38) merged as `6020e17`; reviewed tree preserved | Documentation/design Task; 14 files, about 6 human hours |
| B1b | Complete naming in technical guides and historical narrative | [PR #39](https://github.com/danielchappell/ski-stack/pull/39) merged as `533a1c9`; reviewed tree preserved | Documentation Task; 12 existing files plus queue/review updates, 14 maximum; about 3 human hours |
| B3 | Resolve runtime identity compatibility | Discovery pending; new writes and old signed history need an explicit migration contract | Task; scope before sizing dependent Stories |
| B4 / W1 | Build the Rovito-based website path with Pigboard identity | Approved outcome-led copy at `c2520a2`, two current-head Sol code reviews CLEAN and four hosted checks passing. [PR #40](https://github.com/danielchappell/ski-stack/pull/40) remains open. Its plum visual treatment is superseded by the requested W1a follow-up; owner merge remains separate | One 20-file Story, 14–15 human hours; [evidence](reviews/pigboard-website.md) |
| W1a | Give Pigboard bold color and a clean transparent hero | Depends on W1/PR #40. [Design](designs/pigboard-bold-visuals.md) and [plan](plans/pigboard-bold-visuals.md) CLEAN from two fresh Sol reviewers per gate. Implementation `8e96a48` reviewed CLEAN by two fresh Sol reviewers; local visual/Node/Go checks pass. Final documentation revision `526de3c` also reviewed CLEAN by both reviewers. [PR #41](https://github.com/danielchappell/ski-stack/pull/41) is open against PR #40; current-head hosted results are on [Checks](https://github.com/danielchappell/ski-stack/pull/41/checks). New appearance awaits owner visual review; no merge/deployment | 17 files, 6–8 human hours; [evidence](reviews/pigboard-bold-visuals.md) |
| W2 / W3 | Match website deployment infrastructure, then release | Provisional — not ready for delivery; GitHub Actions selected by owner; dedicated app in existing Pigboard organization and `pigboard.scubapig.software` awaiting owner target decision | Same Rovito Go/Docker/Fly pattern; scoped implementation and live verification after decisions |
| Release | Publish and verify | Target/domain and owner release authority required | Exact-revision checks, route/health checks and rollback |

### B1a — Introduce the Pigboard product identity and mascot series

Problem to solve

The project is still introduced under its former name and as a collection of
worker roles. Readers need the Pigboard purpose, intended audience and visual
identity alongside an accurate account of the available implementation.

Acceptance Criteria

- Entry-point and product documents consistently use Pigboard.
- The README states the product outcome and intended audience before current setup options.
- Existing capability guides and live-acceptance limits remain accurate.
- Three matching logo candidates show the established scuba pig with a floating virtual Kanban board in Rovito's style.
- Assets, usage notes and product/design sources are discoverable from the README.
- The active recovery queue and historical review authority are preserved.

Technical Acceptance Criteria

- Change only the 14-file inventory below, preserving existing decisions and operational identifiers.
- Use the real repository remote with an explicit `pigboard` clone destination.
- Preserve the original pig identity, cloven hooves, scuba gear and Rovito palette.
- Keep source PNGs in the repository and record their provenance and export limitations.
- Keep candidate artwork, implemented behavior, intended product and production release distinct.

Testing Strategy

- Manual QA: follow the README product/setup/asset links and view each logo at full and reduced sizes.
- Access and setup: local repository and image assets; no account, live Project mutation or cloud execution required.
- Automated regression: check relative links, remaining old names, image dimensions/alpha and diff whitespace; no new runtime tests for documentation/assets.

B1a inventory: `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, `docs/product.md`,
`docs/product-strategy.md`, `docs/architecture-plan.md`, `docs/delivery-plan.md`,
`docs/development-workflow.md`, `docs/brand-rebrand.md`,
`docs/reviews/pigboard-rebrand.md`, and the four files under
`assets/brand/pigboard/` (`README.md` and three candidate PNGs).

### B1b — Complete naming in technical guides and historical narrative

Problem to solve

Technical guides, worker instructions and earlier delivery narratives still use
the former product name. People and agents need consistent naming while exact
historical evidence and working commands remain trustworthy.

Acceptance Criteria

- Technical-guide prose and worker instructions use Pigboard.
- Historical narrative uses the current product name without changing verdicts or outcomes.
- Exact captured prompts, JSON responses, credential names, URLs and hashes remain intact.
- A remaining-name audit identifies every intentional historical or compatibility exception.

Technical Acceptance Criteria

- Change the 12 existing Markdown files below plus queue/review bookkeeping, at most 14 files.
- Preserve runtime code, signed handoff bodies, state directories and configuration identifiers.
- Label historical review hashes as belonging to their original artifacts.
- Preserve newer Cursor and hosted capability documentation from current main.

Testing Strategy

- Manual QA: follow the technical guides and inspect the worker handoff example for the current name and usable commands.
- Access and setup: local Markdown and implementation source only.
- Automated regression: check relative links, exact evidence preservation, remaining names and diff whitespace; no new runtime tests.

B1b inventory: `docs/mvp-runbook.md`, `docs/migration-from-scuba-stack.md`,
`docs/github-projects.md`, `docs/cursor-cloud.md`, `docs/development-review.md`,
`docs/research/2026-09-21-competitor-build-versus-buy.md`,
`docs/tasks/architecture-decisions.md`, `docs/pilots/jira-discovery.md`,
`docs/pilots/jira-discovery-feasibility.md`, `docs/stories/development-roadmap.md`,
`docs/stories/run-cursor-cloud-job.md`, `skills/project-queue-worker/SKILL.md`,
plus `docs/delivery-plan.md` and `docs/reviews/pigboard-rebrand.md` if updated.

For both Tasks, use literal display-name replacement except for the README's
outcome-first introduction, clarified historical naming notes, exact-quote
exception and the Scuba Stack migration clarification. Validate against the
current-main baseline and keep each planned change independently reviewable.
Rollback reverts only the relevant rebrand commit. No state migration or live
release occurs. The older dirty checkout remains untouched by these Tasks.

Author assessment: **Intuitive**—one name and outcome-first entry; **Discoverable**—
working human guides, agent instructions and artwork links; **Delightful**—retain
working setup and the accepted visual family; **Token saver**—one queue and clear
sources; **Secure**—preserve signed history, credentials and production authority;
**Agents are equal**—update role guidance with human copy; **Dependable**—retain
current-main capability limits, exact evidence and honest candidate/release state.


## Active delivery queue — approved 1 October 2026

The owner approved restarting with **two total PRs: complete private human owner access, then complete separate one-agent access; stop for regroup**. All code, tests, documentation, plans, reviews and prerequisites count inside those two PRs. No automatic third PR. Preserve PR #35 unmerged and its local user change. S02a/S02b/S04/S26/S05/S06 are later product goals, outside this recovery batch; none of those six is implemented or live-verified by the first-host foundations.

| Order | Usable outcome | Dependency and current stage |
| --- | --- | --- |
| 1 | Private owner identity/grant inspection, unissued denial, unchanged credential after restart and observed store wake | [Owner plan](plans/pigboard-private-owner-access.md): PR #36 merged as `2f0e9efbc2f989c9dd8d35fbd4a310f01c4235f1`; its tested/reviewed tree survived. Local 313/313, two exact-commit Sol reviews and two current-head CI jobs passed. Live verification then exposed the proxy/backend TLS evidence defect; actual project-scoped key and protected owner URL work. No DB mutation or Machine deployment followed that rejection. [Narrow TLS repair plan](plans/pigboard-neon-client-tls.md) has two fresh affected design/plan CLEAN reviews on hash `3f23bd03f5be0ff6a344e2ae1af2f8af4015256427ecde7ba2781091c7bce9bc`, twelve paths and independent estimates 8–13h and 8–12h. TLS repair PR #37 is open at initial reviewed commit `c8434d552fe4176e121c27e1d1f4d220872e9d0d`: 316/316 isolated Linux tests, actual production-image check, two exact-commit Sol code reviews and two current-head CI jobs passed. Two valid P2 findings are being repaired together: retain completed TLS evidence after failed identity SQL and align entry guides with the used cap. Fresh final-commit reviews/checks, merge and live owner acceptance remain required. |
| 2 | One agent's separate private access, durable enrollment/reconciliation/list/recovery and full grant/peer revoke | **Provisional — not ready for delivery.** Depends on owner live evidence. Combining agent access with the TLS repair was independently NOT CLEAN at 12–20h/14–21h. Re-groom/review the distinct complete lifecycle after owner acceptance; never substitute owner-token sharing. |
| Stop | Owner regroup | The hard two-total-PR cap remains. A third PR for the separate agent requires an explicit owner count change. While that choice is pending, complete the authorized repair and owner live acceptance within PR #37. No selector or new batch is authorized. |

**Current counters:** recovery batch PRs used **2/2** (PR #36 merged; PR #37 open); recovery outcomes live **0/2**; original six product outcomes implemented/live **0/0**. A requested batch-count choice remains unresolved. Local tests, merged source and live verification are separate evidence. The 1 October pre-deployment snapshot was zero Fly Machines, only the pinned private IPv6, no runtime login and no Pigboard tables; repeat those checks before any mutation. Use one shared CPU/256 MiB and the dedicated Neon Free root for this first host; later S08's 1-GB coordinator estimate still needs load proof. The protected operator retains owner/provider credentials; normal callers receive only their own bearer and peer. No Safeguard, Jira or Cursor operation belongs to this slice.

## Historical roadmap and evidence — 28 September 2026

The following dated roadmap retains product direction, dependencies and historical evidence. Its first-pilot administration API, uninterrupted rotation and automatically expandable prerequisite sequence are superseded by the active queue above and the [dated first-service decision](designs/s02a-first-service.md#approved-pilot-decision--1-october-2026). Its later audience, effect, coordinator and recovery gates remain; later Story previews are not delivery-ready approvals.


Recorded 28 September 2026. This is the historical roadmap behind the active queue above. It follows the
[architecture direction](architecture-plan.md) and [working process](development-workflow.md).
Earlier architecture and delivery-plan reviews were CLEAN for their recorded
versions. Their [review record](development-review.md) identifies those
historical verdicts and exact hashes. This revision clarifies the current
delivery goal, S02b caller-audience readiness, S05 send-time reproof, the
already merged D3 first-host baseline and S29 normal-manifest synchronization.
The [focused design review](reviews/pig-jira-send-audience-followup-2026-09-28.md)
covers the earlier S05 correction only. This D3/queue revision has its own
design and delivery-plan review gate; exact committed-code review, PR checks
and live acceptance remain separate. Historical verdicts do not approve
changed code or documents. This plan does not claim unresolved discovery is finished.

## Historical goal and next work — 28 September 2026

Deliver the six authorized Pigboard outcomes in order: S02a project and board
selection, S02b read-only ticket eligibility, S04 shared run inspection, S26
result validation, S05 explicit launch, and S06 safe Jira publication. Take the
smallest dependency-ready Story through plan review, code, independent
committed-code review, PR checks and authorized merge. Independent Tasks and
explicitly permitted stacked slices may advance while another PR awaits merge;
dependent effects still wait for their actual prerequisites and the tested tree
must survive each merge. Resolve D1, D3 and D4 facts when their dependent Story
needs them; an open live credential or acceptance check does not stop
independent design, code review or another ready slice. Choose routine
implementation details from the reviewed design. Ask the owner only for a real
access limit or product decision that the existing authorization does not
settle. Keep live acceptance separate from merged code.

The pilot-specific [D1 Jira metadata diagnostic](stories/pig-jira-metadata-preflight.md)
merged in PR #31 at reviewed head `c6123f0`, with both hosted PostgreSQL jobs
passing and an identical merge tree. Its [design](designs/pig-jira-metadata-preflight.md),
[plan](plans/pig-jira-metadata-preflight.md), Story and exact committed code
have their own recorded independent reviews; the amended plan received a
separate retrospective review after PR feedback. The command makes the
dedicated-service metadata check repeatable, but has not finished D1 or
accepted S02a. The live service credential, effective metadata permissions,
safe correction fixture, issue and caller-audience evidence remain open.
The next delivery-ready implementation Story is selected only after its
dependency and under-two-day gates are met; D3e1, D3e2, D3r and D3f remain
provisional prerequisites, not permission to start an oversized partial PR.

## Owner decision and delivery sequence

Pigboard's [product direction](product-strategy.md) is an opinionated AI SDLC
that we maintain and improve. The owner identifies the existing Pigboard process
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
originally estimated 22–26 files for a combined first host, authentication,
store and pair selector. D3a–D3e0 have since merged those first host, root,
owner and caller-inspection foundations. Remaining D3e1/D3e2/D3r/D3f authority
and scope work must be delivered or sized as complete prerequisites before the
pair selector; the current S02a-only first-pass inventory is 14–18 files and
still needs a reviewed under-two-day plan. That old expansion statement is withdrawn: an approved batch cap includes every prerequisite; inability to fit triggers regroup. Each slice
still needs its own resolved prerequisites, reviewed implementation plan,
exact committed-code review and current-head checks; the stack order does not
turn a blocked Story into a ready one.
The owner-only [bootstrap Story](stories/pigboard-owner-bootstrap.md) is the first
complete shared-authority prerequisite. PR #24 merged at reviewed head `a6fd879`
with 264 merge-tree tests and two hosted PostgreSQL checks passing; live Neon owner
setup is unverified. The [private self-inspection route Story](stories/pigboard-owner-service-inspection.md)
merged as PR #25 at reviewed head `0ce0b2a`, with 271 merge-tree tests and two
hosted checks passing. PR #26 merged the [protected caller-inspection Story](stories/pigboard-private-caller-inspection.md),
which gives the bootstrapped human owner a safe workstation command for that route.
Its Story, plan and committed code had independent CLEAN reviews at their exact
artifacts. Later human and agent recipients use it only after separate issuance.
Neither Story selects a Jira pair. No live Neon owner, restricted runtime
credential, Fly Machine, peer route or service grant request has been accepted.
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
claiming an estimate before discovery. **All later roadmap Stories except S01 and S03 remain
Provisional — not ready for delivery.** The new owner-access Story is separately ready at its exact plan gate above. S01 and S03 are independently reviewed and merged;
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
| Reviewed decision; live gates open | D2: Define durable attempts and recovery | The [contract](designs/hosted-work-contract.md) separates format validity from original-request, trusted-launch and actual-checkout binding. PR #23 merged at reviewed head `84b575a`; two independent exact-head Sol reviews of its six-file documentation correction were CLEAN after GitHub feedback. | Defines logical ownership/interfaces/recovery and resolves S01 configuration-only inputs; physical/live guarantees remain D1/D3/D4 gates. |
| D1 audience follow-up independently reviewed; live gates open | D1: Verify Jira identity and workflow | [Active Pigboard design](designs/pig-jira-connection-discovery.md) selects `PIG` Task + To Do + `ai-enabled` through an explicit project-board pair. PR #19 reviewed an earlier PIG revision; PR #28's audience and pair-scope revision has its own [historical CLEAN review](reviews/pig-jira-caller-audience-design-2026-09-28.md). The subsequent S05/readiness correction has its own [independent design review](reviews/pig-jira-send-audience-followup-2026-09-28.md). The [INT record](designs/jira-connection-discovery.md) is historical. A Scubapig Jira User service account exists, but its credential, effective permissions, native IDs, blocker mapping, per-issue authority and transition guard remain open. Service-identity issue access does not prove a Pigboard caller's audience. | Complete identity-scoped preflight and controlled checks before Jira write Stories. S02a needs project/board metadata; S02b also needs the [D1 caller-audience Task](tasks/pig-jira-caller-audience.md) to choose and prove a rule for humans and agents before rich issue reads. |
| Revised design reviewed; live gates open | D4: Define and verify runner capabilities | The [runner design](designs/runner-capabilities.md) and [review record](reviews/runner-capabilities.md) cover the imported-run format/source correction and PR #7's separate standalone code. | Treat PR #7 as manual S03; S04 inspects an existing run; S05 cannot send until the live gates are met. |
| Authorized live checks pending | [D4L: Verify Cursor pilot access and source identity](tasks/architecture-decisions.md#d4l--verify-cursor-pilot-access-and-source-identity) | No import source-audience, repository, actual-commit, enforced read-only, teammate or meaningful-work proof yet | Record each pass/failure/unknown in the named evidence artifact. No company-account substantive compute. |
| Contingent on failed Cursor read-only or source binding | [D4F: Evaluate a hosted Codex fallback](tasks/architecture-decisions.md#d4f--evaluate-a-hosted-codex-fallback) | No provider switch has been chosen | If Cursor cannot meet both real-repository gates, evaluate Codex and obtain an explicit revised provider decision before S05/A1. |
| Revised Neon Free design; exact-revision review and staged live gates apply | D3: Choose deployment and team access | [Selected one-team design](designs/hosted-fly-neon-free.md) and the [earlier revision’s review record](reviews/hosted-fly-neon-free.md). The [Neon Launch design/review](designs/hosted-fly-neon-launch.md) and prior [Fly MPG brief](designs/hosted-deployment-options.md) are historical for their exact artifacts. | The [first-service Task](designs/s02a-first-service.md) now starts from merged D3a–D3e0 root, private-host, owner and caller-inspection code plus an allocated private Fly app with no Machine. Its remaining path requires live scoped-role/root and host proof, separate human/agent grants, atomic rotation, owner-approved project scope and a versioned pair. Re-groom D3e1 and the remaining S02a-only inventory before implementation. Deploy and verify the first Machine, secret-safe restart/rollback, sleep-safe liveness and bounded store failure; S02a then rejects a child target before any pair read or save. Before S02b, prove current-team human viewer and scoped agent inspect grants before lookup, a denied same-pair caller, D1's minimal service metadata lookup and the completed, live-proven caller-audience rule for the selected issue and every in-project blocker before richer reads. Before S04, prove root/child endpoint identity and ordinary grant boundaries, a disposable two-client SQL feasibility probe, actual Free limits and test identities. S04 reuses the pin for registered-run inspection and tests child-read denial on that path; S05 proves no child-target send. S08 adds coordinator load/second-teammate and quota checks to that first host. S29-S31 build recovery; A1 proves the measured within-project Free restore window and full interlock. |

These are Tasks, not promises of two-day implementation. The read-only PIG
metadata diagnostic from PR #31 is merged at reviewed head
`c6123f0` with both hosted PostgreSQL jobs passing. It can collect D1 evidence
once a dedicated Scubapig service credential exists; it has not proved live
service identity, pair validity, issue audience or Jira write authority.
**D3-design** means the
selected Fly + Neon Free architecture has two CLEAN independent design
reviews of the exact revision being implemented. The linked historical record
alone does not establish that gate for a changed file. **D3-early authority/store** gates S02a's first saved-pair use of the shared store: the merged owner bootstrap and root pin must be live-proven, and scoped human/agent grants, owner-approved project set, restricted SQL role and versioned pair record must be delivered and verified. D3a–D3e0 are merged but do not prove live authority; the remaining complete prerequisites are separately sized before S02a. S02a implements and tests effective-target rejection on startup, reconnect and before selection reads or writes, including a changed secret pointing to a child. S02b additionally needs verified viewer/agent inspect grants before any issue lookup, a denied-caller check, D1's minimal service metadata lookup and the completed [caller-audience Task](tasks/pig-jira-caller-audience.md) with live proof for the selected issue and each in-project blocker before richer reads or output. A service-account read is not that proof. **D3-store/access** is the narrower pre-S04 live
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
| [D3a](stories/neon-root-preflight.md) | Check the pinned Neon root and restricted runtime role | Reviewed D3 first-service design and local credential-custody contract; exact Story/plan and committed-code independent reviews CLEAN | PR #21 merged at reviewed head `9b493b8` into `main` as `9cdb6ab`; the exact merge tree passed 247 local tests. Actual scoped login, private handoff and TLS/grant proof remain open. No Fly or S02a claim. |
| D3b | Run the first private Pigboard host and prove its root diagnostic | D3a reviewed root pin and role contract; D3b Task design and implementation plan independently reviewed CLEAN; live D3a scoped-login preflight before deployment acceptance | PR #22 merged at head `40c0130` into `main` as `98d45f8`; the exact merge tree passed 256 local tests. Private Flycast liveness stays independent of Neon; pinned TLS proof after idle wake, restart and rollback remains a live gate. No Jira/caller route or database write. |
| [D3c](stories/pigboard-owner-bootstrap.md) | Bootstrap and inspect one named owner | D3b private host and reviewed authority plan; live protected owner URL for acceptance | PR #24 merged at reviewed head `a6fd879` into `main` as `d6f32ce`; the exact merge tree passed 264 local tests and both current-head hosted PostgreSQL jobs passed. Versioned owner migration, guarded recovery and private credential file exist in code. Live migration, owner setup and runtime grants remain unverified. |
| [D3d](stories/pigboard-owner-service-inspection.md) | Inspect the caller's current grant through the private host | D3c protected owner setup, v2 runtime column-read migration and restricted pinned runtime URL | PR #25 merged at reviewed head `0ce0b2a` into `main` as `dfba9ba`; the exact merge tree passed 271 local tests and both hosted PostgreSQL jobs passed. A private bearer route returns only the caller's current principal and grants; old credentials deny after recovery. Live Neon/Fly/peer acceptance remains open. |
| [D3e0](stories/pigboard-private-caller-inspection.md) | Inspect my current grant safely from a private workstation | D3d `/v1/authority/me`, owner bearer file, owner-specific private peer for live use | PR #26 merged a fixed-private-route `caller:me` command with text/JSON, protected file and explicit denied/unavailable/unverified results. Its implementation was independently reviewed; live Fly/Neon/peer acceptance remains open. Later recipients still need D3e1 issuance and their own peer/bearer. |
| D3 TLS test fixture | Share one disposable localhost TLS Postgres setup across the owner and Neon reconnect tests | Current merged owner and root-pin tests; independently CLEAN fixture design and implementation plan | Technical prerequisite in progress. Both tests use the shared fixture immediately, retaining distinct assertions, required-tool failure versus explicit skip, same-port reconnect and verified cleanup. Four repository files and seven human hours are planned. It creates no caller grants, does not make D3e1 ready, and proves no live Neon/Fly state. |
| D3e1 | Issue, inspect and revoke separate human/agent caller grants through the private owner service | D3e0, owner/custodian peer handoff, v3 minimum runtime DML | **Provisional — not ready for delivery.** The reviewed design preserves current-human-owner authority and requires issue, request/recipient status and all-credential revoke together. Two independent reviewers estimated the complete API at 18–22 hours, above the Story limit. A complete smaller predecessor or newly reviewed design is required before coding. |
| D3e2 | Administer caller grants with a protected owner CLI | D3e1 complete private API | **Provisional — not ready for delivery.** Package issue/status/revoke with durable request ID and one-time recipient file custody, then live-verify before claiming easy owner administration. D3r atomic rotation and D3f owner-approved project scope remain separate mandatory prerequisites before S02a. |
| [D3r design](designs/pigboard-atomic-caller-rotation.md) | Specify atomic replacement for one named caller bearer | D3e1 private owner API, recipient custody and private peer proof | The [independently CLEAN design Task](reviews/pigboard-atomic-caller-rotation-2026-09-28.md) specifies pending activation, two-bearer recipient proof and one root-locked cutover. It delivers no rotation. |
| D3r delivery | Replace one named caller bearer without an authority gap | D3e1 private owner API, D3e2 protected owner CLI, reviewed D3r design, live recipient peer/custody proof | **Provisional — not ready for delivery.** Inventory pending-state SQL/grants, owner and recipient commands, concurrency, lost-reply recovery, tests and docs; split before coding if a complete outcome exceeds 20 files or two human working days. S02a waits for this delivered behavior, not just the design Task. |
| D3f | Let the current human owner approve and inspect a named Jira project scope | D3e1/D3e2 current-owner administration, D1 service-identity project names/native IDs, live root and private peer | **Provisional — not ready for delivery.** The earlier raw-ID scope-first candidate was independently NOT CLEAN because it did not meet the reviewed named-choice journey or prove an under-two-day implementation. Re-inventory a complete add/list/remove outcome with versioned root authority, ambiguous-write recovery, tests and docs after D1; S02a cannot list or select outside this scope. |
| S02a | Choose and correct one Jira project-and-board pair | S01, D1 service-identity project/board/filter/column metadata and safe correction fixture, live D3 root/host/caller acceptance, D3e1/D3e2/D3r/D3f authority and scope prerequisites | A verified human or agent connection administrator chooses named projects inside current owner-approved site/project scope, then an associated board; save revalidates Task/To Do visibility and records a versioned pair. The already merged private-host code provides the service boundary; before live S02a use, the deployed first service must hold SQL/Jira secrets, pin the original root separately, and reject a child target before reads or writes. Correction refuses active/uncertain effects; old records stay inspectable. No issue inspection or Jira write. The S02a-only first-pass inventory is 14–18 files after prerequisites; it is **Provisional — not ready for delivery** until the exact file/time plan and live gates are reviewed. |
| D3g | Let a named human viewer and scoped agent inspect their own current connection grant | D3e1/D3e2 safe issuance and revocation, S02a saved connection scope, current-root grant model | **Provisional — not ready for delivery.** Extend the versioned SQL grant constraint and owner issuance/status path to human viewer and connection-scoped agent inspect roles, then prove `/me` and a denied same-connection caller after revoke. Inventory migration, route/client reuse, real SQL tests and human/agent docs; split before coding if the complete behavior exceeds 20 files or two human working days. This grants no Jira issue audience by itself. |
| S02b | Explain whether one Jira ticket is eligible without starting it | S02a, D3g current-team human viewer/scoped agent inspect grants and denied-caller proof, D1 issue/link/minimal-field facts and [caller-audience Task](tasks/pig-jira-caller-audience.md) | Jira reads/normalization and existing core policy, one inspection command limited to S02a's selected project-board pair and the caller's proven source audience. Check app caller authority before any issue lookup; a service-account read or app grant alone does not prove caller audience. Keep minimal issue fields internal until the caller-specific rule, project and board checks pass. Apply the same rule to each in-project linked blocker before its status or body is read or its facts are shown; an unproved blocker is unknown and blocks eligibility. Denied callers and denied/unknown selected-issue audiences get generic unavailable without ticket facts. Recheck file/time size after D1/D3. |
| S03 | Start and retrieve one manual Cursor cloud job with stable identity | D4-design; PR #7 retrospective Story/plan and committed-code reviews CLEAN | Existing standalone CLI and library, kept separate from hosted launch authority; no repository-backed acceptance claimed. |
| S04 | Register and inspect an existing provider run across processes | S02a, D3g delivered and verified human-viewer/scoped-agent inspection grants, S03, D2, D3-store/access, D4-design, D4L run-specific import audience proof | Reuse S02a's live-root authority boundary with selected isolated Neon Postgres, independently pinned original-root endpoint and current Pigboard-scoped access; persist immutable run identity, trusted original-audience evidence, current source-to-connection disclosure grant, registration-time selected pair/version and last status/time with explicit result omissions. Pair/version or account/repository match does not prove a run's original audience. Recheck source disclosure and the D3g target viewer/agent grant on each shared read, hiding saved ID/status/link on revocation; deny provider reads and registration without run-specific proof. S04 adds its separate run-registration grant; D3g's inspection grant does not authorize registration. Discard co-returned result text. Mutable or unattested revisions remain inspection-only after audience proof. S26 owns result observation and validation. Recheck 20-file/<2-day size after D3 store/access and D4L import proofs. |
| S26 | Observe and validate a saved provider result | S04, D2, D4-design, policy for any stored provider result; D4-source and trusted original-request binding gate validated ticket work and publication eligibility | One observation/validation command stores bounded output, format outcome and binding state. Read an imported result only after S04's current source-audience authorization is rechecked; it can be format-checked within that audience without D4-source but stays nonpublishable. Publication eligibility additionally requires S05's trusted immutable launch record, independent original-request binding and proof of the actual checkout commit. |
| S05 | Explicitly start one eligible Jira request once | S02b, S03, S04, D1, D2, D3-store/access, D4-design, D4-live, policies for any stored source/request/credential | At send time, re-prove the initiating caller's current app grant and the selected issue's caller-specific audience before a rich read or effect reservation, and each blocker's audience before using its status; stale S02b or approved Cursor disclosure alone is insufficient. Then perform the atomic root authority check and attempt/send reservation plus D2 provider facade and one operator-invoked launch/reconcile command. The original root endpoint is pinned separately from the connection secret; changing that secret to a historical child denies reads and sends. Recheck size after discovery; full disaster-recovery implementation remains a later gate. |
| S06 | Publish one stored result back to its Jira ticket safely | S05, S26, D1, D2, policy for stored publication evidence | Publish only a format-valid result with proven trusted launch, original request and actual checkout commit for unchanged ticket input; an unbound import stays nonpublishable. Append-only progress/result comments and recoverable publication; automatic transition only if Jira enforces the full eligibility guard, otherwise manual handoff. |
| S07 | Pick up eligible tickets and reconcile existing attempts automatically | S05, S26, S06 | Bounded scheduled coordinator tick, one active attempt, stored polling/progress; no new queue policy. |
| S08 | Run the automatic coordinator on the existing Fly service | S07, D3-design, D3-store/access, earlier hosted selection path | Add the scheduled coordinator to the first-hosted service, then prove shared-cpu-1x/1 GB load, second-user operation, quota observation and sleep-safe coordinator health. Earlier hosted selection owns its own secret/TLS/restart/rollback proof. |
| S29 | Quarantine one restored connection | S08, D3-design | Install the initial `normal` manifest, its post-commit authority-generation reconciliation path and the effect-read gate in a recovery-capable revision. The separate recovery principal syncs ordinary root authority changes with expected-head updates; a pending/mismatched/unavailable manifest closes effects without replaying the committed change. It records expected-head cutover state, while the custodian proves exclusive deploy/provider fence and zero old Machines before attaching a Neon child branch in quarantine. Provisional — re-groom to the 20-file/<2-day limit after focused control-repository feasibility checks. |
| S30 | Reconcile one restored connection's external effects | S29, D1, D3-design, D4-design | Current-authority operator observes exact Jira/Cursor effects through a read-only quarantine route; record known effects and unknown or unbounded windows, never completion without enumeration evidence. Provisional — re-groom after focused credential/observation checks. |
| S31 | Reapply current access and reopen a restored connection | S30, D3-design | Use the live-root authority journal, rebind current provider credentials, reconcile and copy child data back into the root. Publish a guarded expected-head `reopen` readiness record while sends stay closed, then recheck root generation/digest, credential binding and physical/provider fence before a separate recovery-principal expected-head transition to the next `normal` epoch. Only a matching `normal` read resumes effect admission; ordinary deploy authority returns last. Test concurrent authority change, stale head and lost reply. Provisional — likely needs splitting after feasibility checks and a size inventory. |

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
| S16 | Install one versioned Pigboard role/skill package for Cursor | M4; D6, supported Cursor installation mechanism and M1 configuration contract. |
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
- Current main has a hosted `node-and-postgres` test workflow in
  `.github/workflows/test.yml`, and PR #31's two jobs passed at its final
  head. Those hosted tests do not establish live Neon role, Fly Machine,
  private-peer or Jira service-identity acceptance; each future Story must
  record exact-head CI and its separate live gates.
- The Scubapig Pigboard project key changed from KAN to PIG on 26 September;
  no ticket, workflow, permission, credential, automation rule or membership was
  changed. No provider work was launched.

## Author's delivery-plan assessment

| Principle | Assessment |
| --- | --- |
| Intuitive | An administrator chooses a named project within owner-approved scope, then a board in S02a; a teammate inspects a ticket in S02b before launch. Correction names active or uncertain work that must be reconciled. PIG Task + To Do + `ai-enabled` stays the visible opt-in route. Owner bootstrap adds pilot setup; the D3 store is not a teammate step. |
| Discoverable | Task outputs, separate setup/inspection Story bodies, readiness rules and the six-outcome order are linked from this queue. The historical combined S02a estimate is superseded by the current 14–18-file S02a-only preview; its authority, scope and D3g viewer/agent-inspection prerequisites remain provisional. Human and agent setup guides must explain owner approval, credentials and current grants. |
| Delightful experience | One hosted secret holder and saved S02a pair avoid distributing powerful secrets or asking for Jira IDs on each inspection. The Free store can sleep, so first wake delay is reported honestly; Fly health must not keep it active. Owner approval is deliberate extra setup for broader project scope. |
| Token saver | Reuses current code/API evidence and avoids speculative full implementation plans for blocked later Stories. Agent responses must include uncertainty and omissions, not just short success text. |
| Secure | The owner alone approves site/project scope and issues grants; a current connection administrator may select only inside that scope. S02b checks current viewer/agent inspect grants before issue lookup, then proves that caller's issue audience before richer reads or output; service visibility and app grants alone do not suffice. Pair correction and later effect reservations use the live-root authority order and saved version. A stolen runtime SQL password can alter granted tables, so first-host custody matters. S04 additionally requires run-specific origin and current source-to-target disclosure; D1 caller-audience proof and send-time recheck, D4 source/read-only and later D3 recovery fences remain unproven live. |
| Agents are equal | Authorized human and agent callers both have scoped S02a selection and S02b inspection, with a distinct agent inspect grant and noninteractive structured choices/results. The caller-audience rule must cover agents without inventing Jira user identities. The recovery preview includes a noninteractive CLI observation route with the same role and connection checks; no browser-only handoff is required. |
| Dependable | S01/S03 merged scope, historical reviews, selected Free design and open live gates remain distinct. The merged first-host code still needs live restart/rollback and bounded store-wake proof; S02a must not silently repeat an ambiguous pair save. S02a's saved pair does not prove S02b issue-read authority; unknown caller audience is unavailable and a changed pair makes an old inspection stale. S04 explicitly depends on S02a's saved pair. S26 reports format-valid but unbound results as nonpublishable. Free quota exhaustion closes new effects; S29-S31 remain provisional: `reopen` keeps sends closed until a guarded next `normal` manifest matches the live root, and restore remains limited to measured within-project history. |

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
