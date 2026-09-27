# Architecture decision Tasks

These are Tasks, not implementation Stories. The [active queue](../delivery-plan.md)
records order and readiness. Use current source and existing evidence first.
No Task authorizes unapproved access, paid infrastructure or nontrivial company
Cursor work. Resolve discoverable facts before bringing genuine product choices
to the owner.

## D0 — Test the product need

Problem to solve

The owner has chosen Pigboard's opinionated AI SDLC and authorized its foundation.
We still need evidence of which teams would adopt and pay for that maintained
method. This later commercial Task does not block the core or baseline process.

Acceptance Criteria

- Record which teams want to adopt a maintained development method and their real setup, handoff or recovery burden.
- Compare their current tools and workarounds with the native and packaged routes in the competitor report.
- Record how often the burden occurs, who bears it and what time or cost evidence supports it.
- Distinguish stated interest from buying evidence, including the budget owner, acceptable offer and any concrete pilot commitment.
- Recommend an audience, supported offer and commercial next step, including further discovery or no commercial launch when evidence is insufficient.
- Keep an internal dogfooding decision separate from a claim of customer demand.

Technical Acceptance Criteria

- Agree the evidence sample and decision criteria before collecting results; a small sample cannot establish market size.
- Use supplied or authorized research notes; contacting people needs explicit instructions and is not authorized by this Task.
- Use anonymized summaries and do not publish private customer material or grant access to company systems.
- Do not treat missing interviews, positive compliments or one forum post as proof of demand.

Testing Strategy

- Manual QA: Trace each recommendation to observed workflow burden, the strongest current alternative and buying evidence; verify that contrary evidence is included.
- Access and setup: Target participants, research notes and outreach authority remain unresolved; existing public evidence can inform the interview guide.
- Automated regression: No new tests are needed for this research-only Task; validate record links and evidence labels.

## D1 — Verify the Jira connection and workflow

Problem to solve

The Pigboard `PIG` board is understood from the human UI, but the future integration's
permissions and transition contract are unverified. We cannot safely size or
activate Jira writes from that UI evidence alone.

The [active PIG connection design](../designs/pig-jira-connection-discovery.md)
records the current board selector, candidate notification path and publication
guards. The earlier INT record is historical. Neither closes this Task's live
identity or race gates.

Acceptance Criteria

- Record the dedicated integration identity, allowed `PIG` project, Task type, `To Do` status ID and required transition fields.
- Establish read/comment/update/transition authority and record any unavailable access without guessing it.
- Define authenticated event delivery, bounded reconciliation and the human-edit race policy.
- Verify the link type, direction and blocker-state mapping that lets S02 use core dependency eligibility.
- Define how an append-only progress comment is found after a lost create response without blindly posting twice.
- Name what requires a controlled live write check before activation.

Technical Acceptance Criteria

- Begin with authorized read-only metadata and permission checks; do not test writes by making unapproved mutations.
- Keep the human assignee and source/result audience restrictions.
- Use identifier-only notification until any richer webhook's audience and payload handling are approved.
- Keep status transitions manual unless Jira enforces a guard over every advancement-critical field.
- Keep secret values out of the decision record and ticket context.

Testing Strategy

- Manual QA: Review the evidence against the existing `PIG` board and identify every verified field and remaining live check.
- Access and setup: Use the dedicated integration identity when available; its access and credential provisioning remain unresolved.
- Automated regression: Identify future adapter coverage for dependency mapping, event payloads, comment recovery and guarded transitions.

## D2 — Define durable attempts and recovery

Problem to solve

The current local dispatcher waits for one worker result, and GitHub leases are
best effort. Hosted asynchronous runs need an agreed authority and recovery
contract before board and runner work can fit together.

Acceptance Criteria

- Define attempt states, immutable inputs, ownership generations and provider/result/publication checkpoints.
- Walk duplicate delivery, lost launch response, restart, stale owner, human takeover and ambiguous Jira publication from start to recovery.
- Define shared store, board and runner interfaces and the additive migration from current exports.
- Identify the smallest complete command outcomes and justify their likely file/time boundaries.
- Obtain independent product and technical design reviews with all seven principles.

Technical Acceptance Criteria

- Retain core deterministic selection and the existing GitHub/local daemon behavior.
- Distinguish transactional coordinator guarantees from external requests already in flight.
- Return needs-attention when an external effect cannot be reconciled safely.

Testing Strategy

- Manual QA: Walk the scenario table using existing source and recorded Cursor responses; each interruption must have a named owner, stored fact and next action.
- Access and setup: Current repository and saved pilot evidence are sufficient to begin; provider-specific unknowns feed D1/D4.
- Automated regression: Define the state-machine and process-restart acceptance coverage that implementation Stories must prove.

## D3 — Choose the first hosted deployment and team access

Problem to solve

The product must continue with laptops off and expose progress to teammates.
The owner selected one low-cost Fly app Machine and an isolated Pigboard Neon
Launch Postgres project with seven-day point-in-time history and no scheduled
snapshots. The [selected design](../designs/hosted-fly-neon-launch.md) is
[independently reviewed](../reviews/hosted-fly-neon-launch.md); the prior
[Fly Managed Postgres brief](../designs/hosted-deployment-options.md) is
historical for its physical topology. The Fly `pigboard` organization exists,
but no app, Neon Pigboard organization/project or recovery-control repository
has been provisioned. D3's store-and-access facts are needed before S04;
hosted load and the implemented restore drill come later with S08 and A1.

Acceptance Criteria

- **Before S04:** verify a dedicated Pigboard Neon organization/project in Frankfurt and a scoped SQL role with no Entendia reach. Use a disposable SQL fixture and two independent clients to prove persistence, transaction/uniqueness behavior, and reconnect after suspension; this is a database feasibility probe, not S04's registered-run command or role acceptance. Record the root endpoint identity for S04's separate non-secret pin, confirm a child has a different host, and prove ordinary runtime/deploy grants cannot reassign the endpoint. S04 implements and tests historical-child read denial; S05 tests send denial. Identify usable test human/agent identities and decide retention for the minimal metadata S04 stores.
- **Before S08 deployment acceptance:** verify the `pigboard` Fly organization, shared-cpu-1x/1 GB load, actual region/price, runtime and deploy principal reach, health and secret custody. Prove a second authorized teammate can inspect while the owner's laptop is off and a revoked teammate cannot.
- **Before A1 hosted acceptance, after S29-S31:** verify the separate private recovery-control repository and recovery/custodian grants, S29's initial `normal` manifest and effect-read gate, seven-day **within-project** Neon PITR with no scheduled snapshots, and the full restore path with live-root current authority, external manifest, physical/provider fence and quarantine. This is not a pre-S04 or pre-S05 implementation gate; those earlier revisions pin the original endpoint and reject a historical child but do not support restore.
- Record team authentication, integration credentials, source/result audiences, class-specific retention for copied content/evidence/sealed credentials, and the exact setup/inspection and restore evidence needed before M2 is complete. The separately approved 90-day minimal post-terminal metadata lifetime is unchanged.

Technical Acceptance Criteria

- Do not provision paid services or broaden access merely to write the plan; record cost and scope before any live proof resource is created.
- Keep one app Machine, one normal Neon compute endpoint and one team where possible; do not add an unused distributed platform. The external metadata-only recovery repository adds no always-on compute.
- Design restored-state reopening around bounded effects, current authority and access-change reconciliation, credential rebinding, and verified copy-back to the live root. S29-S31 implement and test those controls; an unknown effect window, unavailable authority journal or missing manifest must stay quarantined.
- Verify how Fly credentials, the private GitHub recovery-control manifest, live-root authority journal and recovery commands enforce the full role matrix as their dependent Stories are delivered; do not treat a machine-exec token or stale restored row as command authority.
- Limit backup claims to point restore within the existing Neon project. Project/account loss is not covered by the selected no-snapshot policy.
- Verify current provider facts from official sources before selecting them.

Testing Strategy

- Manual QA: Before S04, use a disposable Pigboard Neon project and SQL fixture with two clients to prove durable rows, competing-write uniqueness, reconnect, distinct root/child hostnames and Neon endpoint-reassignment grant denial. S04 itself tests historical-child secret denial before reads, registered-run inspection and app role/scope denials across processes; S05 tests no send on the child. During S08, test Fly load, restart and a second teammate. After S29-S31 and seven elapsed days, A1 drills child-branch restore, lost send, revoked member, expected-head conflict, old-Machine/provider fence, role denials, quarantine and reconciled copy-back.
- Access and setup: The Fly `pigboard` organization exists. Pigboard Neon organization/project, GitHub recovery-control repository, integration identity, app roles, secrets, spending observation and deployment permissions remain unverified or uncreated.
- Automated regression: Identify Fly load/health, Neon wake/reconnect, role-denial, effect reservation and restored-state recovery checks; distinguish local tests from hosted/live evidence.

## D4 — Define runner capabilities and reconcile the Cursor work

Problem to solve

A trivial Cursor API run succeeded, and PR #7 adds standalone commands. Neither
proves a generic runner contract, repository authority or shared team acceptance.

Acceptance Criteria

- Define prepare/start/recover/get capabilities and distinguish provider completion from accepted stage output.
- Map PR #7 to that contract and record reuse, changes or omissions without discarding existing work.
- Record missing repository permissions, second-user access, result visibility and meaningful-work test authority.
- Identify a feasible Codex execution path separately from package installation.
- Retrospectively review the existing Story/design/plan before scheduling fresh committed-code review.

Technical Acceptance Criteria

- Use existing marker-only evidence first and keep company Cursor checks trivial.
- Do not treat plan mode or prompt instructions as enforced read-only access.
- Do not claim cloud support for a harness just because it has installable instructions.

Testing Strategy

- Manual QA: Compare API evidence, pending implementation and provider documentation against each declared capability and unresolved boundary.
- Access and setup: Private repository grants and another authorized teammate's visibility remain unverified; no new grant is implicit.
- Automated regression: Identify common runner-contract scenarios and provider-specific ambiguity tests for later implementation.

## D4L — Verify Cursor pilot access and source identity

Problem to solve

The D4 design cannot prove this account can read the pilot repository safely,
bind a run to its actual source commit, or share results with teammates.
Those facts determine whether a hosted researcher run can be accepted.

Acceptance Criteria

- Record the exact hosted connection identity, repository grant and permission policy intended for S05, then a bounded checkout at a pinned 40-hex commit through that connection.
- Verify an enforced read-only source boundary and the actual checked-out commit using provider-visible or independently checked evidence; a model reply alone is insufficient proof.
- Record one authorized teammate's run/result access and a denied viewer path for that same connection without sharing the API key.
- Record which account and budget permit a meaningful researcher check, its observed result and cost, or mark that check unavailable. Evidence from a different account or connection is informative only; it cannot close D4-live for S05.
- Put each pass, failure and unknown with the tested connection, repository, permission policy, identity, time and safe evidence in `docs/pilots/cursor-live-gates.md`; keep secrets and ticket contents out.
- Leave D4-live open if any required check is unknown or failed. If read-only access or source binding fails, route to D4F and a provider decision before S05/A1.

Technical Acceptance Criteria

- Use only trivial compute on the company Cursor account; a meaningful run needs separate authorized account and budget.
- Do not treat plan mode, a local request digest or a model's claimed commit as enforced source access or provider attestation.
- D4-source is the verified actual-commit binding for the specific saved run; S26 depends on it before validating repository-backed output. D4-live applies only to the hosted connection, repository and permission policy actually used by S05; changing any of them reopens the relevant checks.

Testing Strategy

- Manual QA: Compare a pinned test revision with the provider's checkout evidence, inspect the same run as a second user and check the denied path.
- Access and setup: Repository grant, teammate identity and any meaningful-work account are still unresolved; do not invent them.
- Automated regression: No implementation in this Task; record the source-binding and denied-access tests required by S05/S26.

## D4F — Evaluate a hosted Codex fallback

Problem to solve

The selected Cursor path may not enforce read-only access or prove the actual
source commit for a real repository. If either gate fails, the pilot needs another runner
decision before hosted launch.

Acceptance Criteria

- If Cursor's read-only or source-binding gate fails, compare a hosted Codex path with the same researcher journey.
- Record repository access, revision binding, run recovery, team visibility and expected cost evidence.
- Recommend whether to keep Cursor for a smaller non-repository role or ask the owner to select Codex for this pilot.
- Keep S05 and A1 blocked until the owner selects a provider and the affected D4 design and delivery plan are reviewed again.

Technical Acceptance Criteria

- Use D2's runner contract and keep board eligibility unchanged.
- Do not treat installable Codex role files or a local CLI session as proof of cloud execution.
- Do not start paid or substantive company work during this decision Task.

Testing Strategy

- Manual QA: Walk the same pinned-revision researcher request through both documented paths and list unverified steps.
- Access and setup: Read-only provider documentation and saved evidence suffice to begin; live account and repository checks need separate authority.
- Automated regression: No code changes in this Task; name runner-contract tests required by the selected follow-up Story.

## D5 — Design reviewed lifecycle handoffs

Problem to solve

The first pilot covers one researcher. The existing Ski Stack method must run
through hosted product and engineering handoffs without model text granting
authority or silently advancing a ticket. Carry that baseline forward before
changing the method.

Acceptance Criteria

- Map the existing role cards, skills and review rules for idea, discovery, architecture, grooming and delivery onto supported hosted stages.
- Define each stage's input/output, independent review evidence, human decision points and allowed next actions, identifying any change from the baseline method.
- Define issue hierarchy, dependencies and partial recovery when grooming creates several Stories.
- Preserve the local signed-handoff behavior and identify the hosted trust mechanism.
- Split S09-S15, S27 and S28 further where any role outcome exceeds the Story limits.

Technical Acceptance Criteria

- Reuse role cards and core policy rather than adding a permanent executive bot.
- Keep review authority separate from the author and keep PR merge with its authorized owner.

Testing Strategy

- Manual QA: Walk one idea into two Stories and one reviewed implementation; inspect which evidence and actor permits each transition.
- Access and setup: Use sanitized examples until a lifecycle test board/repository is explicitly available.
- Automated regression: Define acceptance coverage for forged/stale handoffs, reviewer failures and partially created dependencies.

## D6 — Design portable packages for supported harnesses

Problem to solve

Roles and skills exist as source files, but repeatable teammate installation and
upgrades are not yet a supported product flow.

Acceptance Criteria

- Verify the supported configuration/install mechanisms for Cursor and Codex separately.
- Define versioned assets, declared capabilities, compatibility checks and secret references.
- Define preview/install/upgrade behavior that preserves local changes and reports conflicts.
- Separate instruction packaging from provider execution and hosted credential access.

Technical Acceptance Criteria

- Reuse documented harness mechanisms; do not invent a plugin format or install enforcement hooks by default.
- Keep S16 and S17 independently deliverable where their mechanisms differ.

Testing Strategy

- Manual QA: Trace a clean install and one upgrade with a local edit for each selected harness mechanism.
- Access and setup: Use disposable configuration directories or an explicitly authorized client profile.
- Automated regression: Define asset-version, capability, secret-exclusion and local-change preservation checks.

## D7 — Design control-agent MCP capabilities

Problem to solve

Agents need to inspect and initiate team work without UI automation. The MCP
surface must share the board's application policy and permissions.

Acceptance Criteria

- Define inspect and create-ticket tools with clear schemas, permissions and bounded results.
- Define retry and interruption separately, including unsupported/provider-uncertain outcomes.
- Define duplicate-request recovery, human approval boundaries and source/result audience checks.
- Split any write capability that cannot fit one small PR.

Technical Acceptance Criteria

- Reuse application commands; MCP does not implement a second scheduler or bypass claims.
- A retry never implies cancellation of an existing provider job.

Testing Strategy

- Manual QA: Have an authorized control agent inspect a run and prepare an ideation ticket; show the denied path for an unauthorized caller.
- Access and setup: Select the MCP transport/authentication and disposable test project before implementation.
- Automated regression: Define tool-contract, authorization, omission/pagination and duplicate-write recovery coverage.

## D8 — Design concurrency and a second team

Problem to solve

One successful hosted team does not prove safe multi-worker or multi-team SaaS
operation. Access, capacity and recovery need explicit bounds before expansion.

Acceptance Criteria

- Define concurrency limits and prove how two workers contend without accepting stale results.
- Define team membership, connection ownership and cross-team read/write/secret/result isolation.
- Define launch accounting, recovery procedures and a measured capacity target.
- Identify missing operator visibility before adding a custom team interface.
- Split S22-S25 using actual interfaces and credible file/time estimates.

Technical Acceptance Criteria

- Keep basic authentication and audience protection in M2; this Task governs expansion, not retroactive first-team security.
- Do not add self-service billing or a new orchestration platform without a separate product decision.

Testing Strategy

- Manual QA: Walk two-team denied access, two-worker contention, exhausted launch capacity and restore/reconciliation scenarios.
- Access and setup: Use isolated test tenants and synthetic tasks; substantial provider compute is not authorized by this plan.
- Automated regression: Define cross-team denial, concurrency/fencing, limit enforcement and recovery acceptance coverage.

## A1 — Accept the hosted Jira discovery journey

Problem to solve

Individual commands and mocked checks do not establish a working shared service.
The first hosted milestone needs a named acceptance result before later work can
rely on it.

Acceptance Criteria

- Record the deployed revision and completed S01-S08/S26/S29-S31 outcomes with their independent reviews and required checks.
- Demonstrate setup, eligible Jira input, one provider attempt, validated findings, ticket publication and human acceptance using the configured environment.
- Show second-user visibility and continued coordination with the submitting client offline.
- Record duplicate delivery, restart, provider uncertainty, invalid output, interrupted publication and human takeover results.
- Drill Neon Launch point restore to an isolated branch **within the existing project** with a lost effect and access change; verify external manifest, live-root current authority, physical/provider fence, reconciliation and safe copy-back. Continue quarantine when evidence is missing or the lost window is unbounded; do not claim recovery from project/account loss.
- Check allowed and denied viewer, operator, connection administrator, scoped agent and recovery-principal commands.
- Mark M2 complete only when all required evidence and the owner’s product acceptance are recorded; otherwise list exactly what remains.

Technical Acceptance Criteria

- D1-D3 and D4-design/D4-live must resolve identity, state, access and provider contracts before acceptance activation. If Cursor fails read-only or source binding, D4F and an owner provider choice must also be complete.
- Separate local/mock evidence, live integration checks and owner acceptance; a marker-only probe cannot prove useful repository discovery.
- Use only authorized test tickets, accounts and execution environments; substantial company Cursor work remains excluded.

Testing Strategy

- Manual QA: Follow the configured setup and full ticket journey, inspect it as a second authorized user, then drill restore and role-denial scenarios.
- Access and setup: Concrete test identities, repository, deployed URL and meaningful-work authority come from D1/D3/D4; missing access leaves this Task incomplete.
- Automated regression: Confirm the existing end-to-end recovery and isolation checks at the accepted revision; record any newly discovered behavior defect as a scoped Story.
