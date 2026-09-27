# Development Story previews

These follow the [architecture](../architecture-plan.md); an earlier revision
was independently reviewed, and the current editorial Story-reference update
requires exact-revision review.
S01 and S03 were independently reviewed and merged. **All other Stories remain
Provisional — not ready for delivery.** Unknown interfaces,
permissions and estimates must be resolved through the [decision Tasks](../tasks/architecture-decisions.md).
The [active delivery plan](../delivery-plan.md) owns dependencies, readiness,
size checks and execution order. Each Story must ultimately fit one PR, at most
20 total files and less than two human working days including tests and docs.
If it cannot, split it before promoting it; this catalog is not authorization to
implement a large item under a small label.

No story below invents a live URL, command, permission or exact endpoint before
its contract is chosen. Replace provisional QA setup with concrete reproducible
steps during grooming/readiness. API tool checks use the selected command/client;
Postman is not required for these previews.

## S01 — Validate a saved workflow configuration

The authoritative [groomed Story](validate-workflow-profile.md) and
[implementation plan](../plans/validate-workflow-profile.md) replace this preview.
The [delivery queue](../delivery-plan.md) and [review record](../development-review.md)
own its readiness. D2 resolves its offline configuration contract; live Jira and
provider checks remain prerequisites of later Stories.

## S02a — Choose a Jira project and board

**Provisional — not ready for delivery.** The combined first-host, authority,
store, Jira metadata and pair-selection preview is estimated at 22–26 changed
files. Split complete prerequisite technical outcomes before implementation,
then review this Story's exact plan.

Problem to solve

An administrator cannot safely choose which Jira project and board Pigboard may use. The service credential may see more of the site than the team intends.

Acceptance Criteria

- A verified connection administrator can discover named projects inside the owner's approved site/project scope and their associated boards, choose one pair and correct a wrong selection without knowing native IDs or filters.
- An authorized agent gets structured choices and stable IDs without an interactive prompt. A caller without connection-administrator authority cannot list or change the selection.
- The selected pair is validated and recorded for later inspection; a missing, invalid or unavailable pair gives an actionable reason.

Technical Acceptance Criteria

- Verify the caller's connection-administrator scope independently of the Jira credential and workflow profile. Only the team owner may approve or widen the site/project candidate scope; an agent with connection-admin rights cannot.
- Verify the approved project ID, board association and Task/To Do filter and column visibility before saving. Reject an unrelated board or a scope change during listing, and never silently choose another.
- Keep credentials in the service secret boundary and the selected pair in its configuration boundary. A profile or ticket cannot widen either.
- Save the pair with a version under the D3 live-root connection authority. Pin the original root endpoint separately from the secret and reject a different effective target before reading or saving a pair, including startup, reconnect and secret change. Reject correction during active or uncertain effects. Keep trusted attempts inspectable under their saved launch pair/version and imported runs under their registration-time access association; neither old record authorizes an effect after correction. Later effects must check the current version.

Testing Strategy

- Manual QA: As a permitted administrator or agent, list current approved choices, save the PIG/board 2 pair and see its names, IDs and version. Correct it to a safe second PIG board, then return to board 2; a denied caller sees no choices. A controlled metadata fixture also covers invalid-pair and filter mismatch behavior.
- Access and setup: D1 must prove Scubapig integration-identity metadata and supply a safe second PIG board for live correction. D3 must provide the reviewed first-host secret/auth/store boundary, an owner-approved PIG scope, a connection administrator, a scoped agent and a denied caller. Do not change an unrelated project merely to create a fixture.
- Automated regression: Cover owner-only scope approval, selection, versioned correction, active/uncertain-work denial, filter/column mismatch, concurrent scope reduction or grant revocation during listing, and child-target refusal before selection reads or writes through the human and agent entry points.

## S02b — Explain one Jira ticket’s eligibility

Problem to solve

A teammate cannot tell why a Jira ticket would be picked up or skipped. Guessing causes repeated status moves and unnecessary agent runs.

Acceptance Criteria

- Inspection names the selected project's ticket, configured role and repository, or the decisive reason it is unavailable.
- A wrong-project or wrong-board ticket, missing opt-in, blocked dependency or unreadable state produces no launch or board write.
- Humans get a concise explanation and agents get the same facts in a structured result, including unknown or incomplete evidence.
- A caller without current inspection access receives no ticket status, labels, dependency or access facts, even when the Jira credential can read the ticket.
- An allowed caller whose issue audience cannot be proved sees only a generic unavailable result, with no ticket facts or launch.

Technical Acceptance Criteria

- Use S02a's current saved project-board pair/version and the core deterministic eligibility policy; a profile cannot widen that scope. Check the version before a rich issue read; if it changes later, discard the result and return stale without a launch.
- Before any Jira issue lookup, verify current team and connection scope plus a human viewer/operator grant or separate scoped-agent inspect grant. A connection administrator without a viewer/operator grant cannot inspect by default.
- Read only D1's proven minimal native fields to check project, board membership and issue-level audience. If status or labels are needed solely for board filtering, keep them internal to that check. Suppress all minimal fields from output, logs and diagnostics until audience proof passes. Deny body and dependency-detail reads when scope or audience is unknown or denied; return only facts within the caller's audience.
- Resolve blocker project IDs before blocker status reads and discard embedded out-of-scope linked-issue fields.
- Incomplete links, hidden blockers and unknown canceled/completed mappings fail closed instead of implying eligibility.

Testing Strategy

- Manual QA: As a permitted human viewer and scoped agent, inspect D1's designated nonsensitive PIG issue through the selected pair and see the eligible, unavailable or unknown reason. A same-pair caller without an inspect grant sees no ticket facts; a permitted caller denied the issue audience sees only unavailable. No work starts and Jira is unchanged.
- Access and setup: Use D1's verified read-only service identity, selected pair, designated issue and minimal audience fields, plus D3's permitted human/agent inspect grants and denied same-pair caller. Exercise denied issue audience, missing opt-in, blocked dependency and wrong-project/board cases with named fixtures unless D1 separately establishes suitable test issues and human edit authority. This Story does not send Jira content to Cursor.
- Automated regression: Cover Jira normalization, dependency completeness, pre-lookup caller denial, minimal audience lookup, suppressed fields, scope denial and human/agent inspection output through the public command.

## S03 — Start and retrieve one manual Cursor cloud job

Problem to solve

Ski Stack needs a repeatable manual Cursor operation before hosted launch or automatic scheduling. A lost create response must not lead callers to buy a duplicate run.

Acceptance Criteria

- A caller prepares a stable identity, starts one supported job and retrieves its exact status/result from a fresh process.
- Ambiguous launch or duplicate create recovers the same job or reports unresolved identity without another launch.

Technical Acceptance Criteria

- Keep the standalone command inside D4’s manual boundary; it does not grant hosted launch authority or claim the D2 application facade.
- The standalone command in merged PR #7 is the delivered S03 scope; repository-backed live acceptance remains open under D4L.

Testing Strategy

- Manual QA: Run the documented command sequence with recorded provider fixtures and confirm stable agent/run IDs and honest status.
- Access and setup: Use local mocked responses and existing marker-only live evidence; company Cursor remains restricted to trivial checks.
- Automated regression: Cover launch/recovery/status behavior and command output without paid model work.

## S04 — Inspect a saved run from another process

Problem to solve

Provider IDs and the last recorded inspection status must survive the process
that obtained them. Authorized teammates need a shared record rather than a
local terminal transcript. Result content is handled by S26.

Acceptance Criteria

- An authorized caller registers an existing run only after its original audience and permission to share it are proven. An authorized teammate can then inspect its identity and last observed status from a fresh process.
- Inspection says when status was observed and whether result content is missing or unverified. Revoked sharing hides even a previously saved run ID, status and link.
- A caller outside the configured scope cannot read the run, and a mismatched request cannot replace its identity.
- If the Free database is asleep, inspection reports a bounded wait. If its quota is exhausted or it remains unavailable, inspection reports that state without claiming a fresh observation.

Technical Acceptance Criteria

- Store the record in the selected Pigboard Neon project under D2/D3's scoped contract. Reuse S02a's original-root pin and deny reads or writes through another target.
- Registration needs an operator or scoped-agent register grant. It also needs trusted evidence tying the exact provider agent/run IDs to their original audience and a current source-to-target sharing grant.
- Verify a human approver's rights to that exact run and its content. An agent needs a preapproved grant for the exact run and target.
- Account, repository and selected-pair matches cannot replace run-specific proof. Unknown origin denies registration and provider status/result reads without exposing metadata.
- Each inspection rechecks the target viewer/operator or agent grant and the source-to-target sharing grant. Connection admins need a separate viewer/operator grant; the recovery principal has no inspection grant.
- Store and return status metadata only. Discard any co-returned result text; S26 owns result capture.
- This operation does not launch or retry provider work.
- A failed database wake or Free quota limit cannot turn a missing write into a successful registration.
- A run started from a moving branch or without a verified source commit is inspection-only; it cannot be validated or published as ticket work.

Testing Strategy

- Manual QA: Register an audience-bound fixture run and inspect it from another process as a scoped viewer. Confirm that a foreign run, missing origin record or revoked sharing grant reveals no run details.
- Access and setup: Use the selected isolated store and test identities from D3; these remain unresolved before readiness.
- Automated regression: Cover durable scoped inspection, exact-run origin and revoked disclosure across restart, result omission, root binding and store outages.

## S05 — Explicitly start one eligible Jira request

Problem to solve

Ticket eligibility and provider commands are separate. An operator needs one deliberate operation that reserves and starts the intended work without collisions.

Acceptance Criteria

- Starting an eligible test Task creates one traceable attempt and returns the provider link or an honest unresolved state.
- A repeated command or competing caller resumes the same attempt without launching another job.
- A changed ticket or lost ownership prevents stale work from being accepted.
- If the Free database cannot admit the reservation, no provider launch occurs and the caller sees the failed or uncertain state.

Technical Acceptance Criteria

- Persist immutable launch intent, including the selected project-board pair/version, before the provider call and enforce D2’s ownership/recovery rules.
- Check current authority and reserve the effect in one transaction on the pinned original root endpoint. Reject a secret or connection override pointing to an older Neon child before reads or sends; a pre-S29 revision has no recovery path.
- Use configured role/repository and keep coordinator credentials out of the prompt.
- Before storing copied source, a prepared request or a sealed credential, document that class's audience, lifetime and deletion, including restored copies.

Testing Strategy

- Manual QA: Start the same synthetic ticket twice through mocked provider calls and confirm one attempt and one accepted provider identity.
- Access and setup: Use an isolated store, authorized test ticket and mocked runner; meaningful live work needs separately established execution authority.
- Automated regression: Cover claim contention, database quota/unavailability before reservation, ambiguous launch recovery, changed-pair and stale-input rejection, and no read/send when the configured database target is a historical child.

## S26 — Observe and validate a saved provider result

Problem to solve

A provider can finish without answering the intended question. Publishing its raw final text would confuse a finished turn with accepted work.

Acceptance Criteria

- An observation command retrieves the exact recorded run within its currently authorized source audience and stores its current state without starting another job.
- A completed result is checked against the configured role’s output contract and stored with its validation and binding state.
- Questions, invalid output, provider failure and a valid-looking but unbound answer remain distinct from an answer eligible for publication.

Technical Acceptance Criteria

- Use D2/D4’s role/result and provider-state contracts. Recheck S04's source-to-connection audience authorization before reading or storing an imported result; changed or missing authority yields no provider read or result disclosure. For an authorized imported run, a claimed role or revision permits only format inspection; it does not attest the original request or authorize publication.
- Require a trusted immutable launch record binding the ticket, role/package, profile, exact provider request and recorded run. Independently bind the provider's original request and D4-source's actual checkout commit before marking output eligible for publication. A lost-create observation or duplicate-ID conflict is not that proof.
- Leave an audience-authorized run with an unbound original request or unverified checkout commit available for scoped inspection with an explicit nonpublishable state. A run with unknown source audience is not inspected.
- A stale owner or mismatched run cannot overwrite the accepted result.
- Before storing provider output, document who can read it, how long it remains and how it is deleted, including restored copies.

Testing Strategy

- Manual QA: Observe successful, question and invalid-output fixtures; inspect stored state and verify that an imported valid-looking answer stays nonpublishable while a fully bound valid answer is eligible.
- Access and setup: Use stored scoped runs, a trusted launch-record fixture and mocked provider replies; no additional paid run is required.
- Automated regression: Cover exact-run observation, changed/missing import audience, role-result validation, missing request/source binding and stale-result rejection.

## S06 — Publish one stored result to its ticket

Problem to solve

Completed work is not useful to the team if it stays only in the provider view. Publication must be recoverable without paying to repeat model work.

Acceptance Criteria

- Publishing adds progress/result evidence to the matching ticket. It transitions only with a verified full eligibility guard; otherwise it leaves a clear manual handoff.
- A lost write response is reconciled before another write, or becomes visible needs-attention.
- Human changes and audience restrictions prevent inappropriate publication or transition.
- If the Free store cannot reserve the write, no new Jira comment or transition is sent; the caller sees a blocked or uncertain result.

Technical Acceptance Criteria

- Use stored validated output, an append-only comment operation identity and D1’s verified transition/race contract. Recheck the current selected pair/version against the launch record inside the write reservation; a changed pair withholds publication.
- Commit the D2 effect reservation on the pinned root before any Jira write; a quota or database failure cannot authorize a send.
- Keep the human assignee and never use comments as run locks.
- Before storing publication evidence, document its audience, lifetime and deletion, including restored copies.

Testing Strategy

- Manual QA: Publish a synthetic stored result, interrupt one response and retry; inspect one intended comment, no rerun and manual status when no full guard exists.
- Access and setup: Use the scoped fixture Jira service first; live comment/transition acceptance requires the controlled test ticket and verified write authority.
- Automated regression: Cover partial publication recovery, no Jira write after a failed or uncertain reservation, changed-pair or stale-ticket handling, and source-audience enforcement.

## S07 — Automatically pick up and reconcile eligible work

Problem to solve

The first commands require an operator for each ticket. The team needs eligible work to progress through the same safe operations automatically.

Acceptance Criteria

- A bounded coordinator tick finds eligible work and progresses its stored attempt through observation and publication.
- Missed notifications and labels added after a status change are found by reconciliation.
- Restarting the worker resumes recorded work and keeps the first pilot to one active attempt.
- A quiet team lets the Free database become idle; scheduled checks do not keep its compute awake.

Technical Acceptance Criteria

- Reuse the existing application operations and core policy rather than adding a second scheduler.
- Use bounded reads/polls and the reviewed single-worker capacity contract.
- Set the coordinator's polling cadence so it does not continuously reset Neon's idle timer.

Testing Strategy

- Manual QA: Run scheduled ticks over synthetic eligible, repeated and interrupted work; inspect run records and ticket projections for one completed journey.
- Access and setup: Use local test scheduling, isolated state and mocked provider/Jira services before live activation.
- Automated regression: Cover reconciliation, restart, capacity and a quiet polling interval that permits database suspension.

## S08 — Operate the coordinator with laptops offline

Problem to solve

The selection service is hosted, but the automatic coordinator still depends on an operator’s process. The team must see and recover its work even when that computer is off.

Acceptance Criteria

- The configured hosted worker continues the established ticket workflow after the initiating client disconnects.
- An authorized teammate can inspect health/run evidence and an unauthorized viewer is denied.
- The operating guide explains coordinator restart, credential rotation and common failures on the existing host.
- Health probes permit Neon to sleep, and operations report measured compute and storage use against the Free limits.

Technical Acceptance Criteria

- Add the coordinator to D3’s previously verified host/store/access setup and existing commands; do not defer the first-host secret, TLS or rollback checks to this Story.
- Keep process health independent of a Postgres query; record active CU-hours and storage against the account's actual Free allowances.
- Keep one team and one active attempt; do not bundle a new dashboard or billing system.

Testing Strategy

- Manual QA: Start the deployed fixture journey, disconnect the client and inspect the same run from a second authorized session; then leave it quiet and check Neon suspension and quota use.
- Access and setup: Requires D3’s authorized deployment/test identities; full model acceptance remains constrained by execution authority.
- Automated regression: Cover deployment health without a database query, quota observation, authenticated inspection and coordinator restart against the selected environment.

## S29 — Quarantine one restored connection

Problem to solve

A point restore inside the Neon project can lose a record of work already sent
to Cursor or Jira. Starting work from the older copy could repeat that action.

Acceptance Criteria

- A separately authorized recovery principal writes a connection-scoped recovery record in the private control repository. It names the recovery point and possible lost-write window, then binds the exact Neon child branch before that branch is attached.
- Before enabling recovery-capable deployment, install a `normal` record for the original live root. The new revision checks that record before effects. Earlier S05/S08 revisions pin the original endpoint independently of the connection secret, reject a historical child and do not claim recovery support.
- Before attaching that child branch, a trusted infrastructure custodian suspends normal deploy access, revokes old provider credentials and proves no old Fly Machine can send. The new app starts in quarantine.
- While recovering, the service rejects new launches and publications across restart and explains the blocked state to authorized humans and agents.
- Missing recovery-point evidence keeps the connection in maintenance.

Technical Acceptance Criteria

- The runtime can read but cannot write the recovery record; the recovery principal has a separate write grant. Updates reject a changed GitHub head.
- Fence the old sender before accepting a restored branch; if it cannot be fenced, do not cut over. A Fly secret or boot-time flag alone is not a fence.
- Keep quarantine outside the restored rows. Reject a changed project, branch, recovery ID or current-authority generation, including during deploy overlap and restart.

Testing Strategy

- Manual QA: In a disposable Pigboard Neon project, record an external recovery ID, fence the old sender, create a child branch from before a simulated send and verify no send repeats. Attempt a stale-head update, missing-record attachment and overlapping deploy.
- Access and setup: Use the dedicated Pigboard Fly/Neon resources, private control repository and separate recovery and infrastructure identities; no live customer ticket is needed.
- Automated regression: Cover missing or mismatched record, stale GitHub head, control-repository outage, deploy overlap, restart-safe quarantine and unknown recovery window.

## S30 — Reconcile a restored connection's external effects

Problem to solve

A quarantined connection may be missing records of provider runs or Jira
comments that were sent after the database recovery point.

Acceptance Criteria

- A currently authorized operator or scoped agent can read exact provider and Jira effects through a read-only quarantine command. The recovery principal sees only effect IDs, digests and evidence state, not raw provider content.
- The recovery record shows an explicit unknown or unbounded lost window when the sources cannot enumerate every possible effect.
- Exact positive evidence records each effect against its original identity; missing or conflicting evidence is marked unresolved. An unbounded window can never be marked complete by this Story.
- The connection stays quarantined with no new send or publication after reconciliation.

Technical Acceptance Criteria

- A current connection admin binds a fresh credential for the same original provider identity before observation. The command denies viewers, operators, agents and the recovery principal; the read-only observation route denies viewers, connection-admin-only callers and the recovery principal.
- Match exact provider and Jira identities against the original database, audit and provider/Jira evidence when available; never infer that a missing restored row means no send occurred.
- Treat unavailable provider or Jira credentials as unresolved observation, not proof of no effect.

Testing Strategy

- Manual QA: Restore a Neon child-branch fixture with one post-recovery-point send. Bind a current test credential, observe its exact identity through the restricted route, then remove evidence and confirm the connection remains quarantined.
- Access and setup: Use a disposable Pigboard Neon project, synthetic external evidence and separate connection-admin, operator/agent and recovery identities.
- Automated regression: Cover credential-binding and observation role denials, read-only provider commands, exact effect matching and continued quarantine when evidence is incomplete.

## S31 — Reapply current access and reopen a restored connection

Problem to solve

The restored database may also contain old roles or credentials. Even a
reconciled run cannot be exposed until current access is restored.

Acceptance Criteria

- The recovery principal compares current membership, role, credential and connection-scope changes with the live-root authority journal, never roles from the historical child branch. Missing or damaged current authority requires fresh verification before reopening.
- A trusted infrastructure custodian copies reconciled run/effect data from the child branch back to the live root without replacing current authority. Only the recovery principal can record the verified cutover and reopen after full effect and access evidence.
- Missing or conflicting access evidence keeps the connection quarantined and denies stale inspection or commands.

Technical Acceptance Criteria

- Apply current revocations and connection scope before exposing restored results or commands; historical child-branch roles confer no recovery authority.
- Verify the copied run/effect identities and current authority generation before sending can resume. The reopened root must check authority and reserve an effect in one transaction.
- Select only a fresh recovery-ID-bound provider credential in the root. A stale child-only or restored credential cannot send.

Testing Strategy

- Manual QA: Restore a Neon child-branch fixture with one revoked user, rotated credential and lost effect. Verify denied old access, reconciled copy-back to the live root and either safe reopen or continued quarantine.
- Access and setup: Use a disposable Pigboard Neon project, current external identity evidence, private recovery-control repository and separately authorized recovery/infrastructure principals; no production ticket write is required.
- Automated regression: Cover the viewer/operator/connection-admin/scoped-agent/recovery-principal role matrix, stale-access and credential denial, root copy-back integrity, atomic root authority/effect reservation and refusal to reopen on incomplete evidence.

## S09 — Turn an idea ticket into a product brief

Problem to solve

Technical answers alone do not define the product problem. Product-focused work needs its own visible outcome before architecture begins.

Acceptance Criteria

- An eligible idea ticket yields the problem, users, desired outcome, scope and unresolved product decisions.
- The result is visible for the configured review/human handoff and does not invent acceptance of open decisions.

Technical Acceptance Criteria

- Use D5’s Planner stage and trusted handoff contract with the existing role card.
- Keep routing and allowed next stages in deterministic policy.

Testing Strategy

- Manual QA: Submit a fixture idea, inspect the brief and confirm a missing product choice is surfaced instead of silently decided.
- Access and setup: Use a lifecycle test project and mocked role output until an appropriate model environment is authorized.
- Automated regression: Cover product output validation and permitted or blocked stage handoff.

## S27 — Publish a reviewed technical-discovery handoff

Problem to solve

The pilot returns one research answer, but architecture needs trusted technical evidence with known limits. A plain result comment does not establish an accepted lifecycle handoff.

Acceptance Criteria

- The researcher output records findings, evidence, feasibility constraints and unresolved technical decisions for the current product scope.
- Independent review accepts or returns the output, and only the accepted handoff becomes architecture input.

Technical Acceptance Criteria

- Reuse the M2 researcher operation and D5’s versioned review/handoff contract.
- Keep the product brief and technical conclusion separate, linked and traceable to their actual inputs.

Testing Strategy

- Manual QA: Provide a product brief and research fixtures, reject one unsupported claim, then verify the accepted corrected handoff is available to architecture.
- Access and setup: Use isolated lifecycle examples and independent review fixtures; substantive company Cursor research remains excluded.
- Automated regression: Cover technical-evidence validation, independent review and architecture-input readiness.

## S10 — Record an independently reviewed architecture

Problem to solve

Product and technical findings need a shared design before Stories are created. A model’s own confidence is not independent design review.

Acceptance Criteria

- The architecture result records boundaries, alternatives, recovery, verification and the development path.
- The next grooming stage becomes eligible only after the required independent reviews are complete and CLEAN.

Technical Acceptance Criteria

- Use D5’s Architect/reviewer identities and stage evidence contract.
- Preserve explicit unresolved decisions and all seven independent principle assessments.

Testing Strategy

- Manual QA: Run the design fixture with one reviewer finding, verify grooming stays unavailable, then supply valid resolved review evidence.
- Access and setup: Use independent review fixtures and an isolated lifecycle board; no expensive provider runs are needed.
- Automated regression: Cover independent-review authority and architecture-to-grooming readiness.

## S11 — Groom a design into linked small Stories

Problem to solve

A reviewed architecture can still become oversized or unordered work. The team needs small complete Stories with explicit dependencies.

Acceptance Criteria

- Grooming creates the approved PR-sized Story decomposition and links genuine dependencies.
- Partial creation can be resumed without duplicating Stories or claiming the decomposition is complete early.

Technical Acceptance Criteria

- Use write-pr-sized-stories and D5’s creation/hierarchy/recovery contract.
- Each created ready Story must satisfy the one-PR, twenty-file and less-than-two-day limits; unresolved work stays Tasks or provisional.

Testing Strategy

- Manual QA: Groom a fixture design into two Stories, interrupt one create and verify resumed output has the intended items and dependency only once.
- Access and setup: Use an isolated test project with verified issue-create permission or the matching mock.
- Automated regression: Cover partial grooming recovery, dependency integrity and readiness validation.

## S12 — Produce a reviewed plan for one Story

Problem to solve

A small Story still needs a concrete implementation plan. Coding before checking that plan risks drift from the design and quality standards.

Acceptance Criteria

- The plan names affected code/contracts, tests, docs, failure paths and rollout for one Story.
- Implementation remains unavailable until two distinct independent reviews finish CLEAN.

Technical Acceptance Criteria

- Reuse the existing implementation-planner protocol and D5’s hosted handoff mapping.
- Reviewer failure is an incomplete gate, not a clean plan.

Testing Strategy

- Manual QA: Plan a fixture Story, fail one reviewer and confirm the stage stays pending before replaying valid review evidence.
- Access and setup: Use the existing planner test fixtures and selected lifecycle contract.
- Automated regression: Cover plan evidence, review independence and implementation eligibility.

## S13 — Implement one reviewed Story through a runner

Problem to solve

Reviewed plans need to become committed changes through the chosen execution environment. The team must retain the exact plan and commit being evaluated.

Acceptance Criteria

- A configured capable runner implements one ready Story and records the commit, tests, docs and remaining limitations.
- Unsupported source-write capability or missing authority blocks execution with a clear reason.

Technical Acceptance Criteria

- Use D4/D5’s isolated execution and repository-write contract.
- Do not claim a cloud feature from local package support or bypass the twenty-file size gate.

Testing Strategy

- Manual QA: Run a tiny fixture Story through the supported test runner and inspect its commit and evidence against the input plan.
- Access and setup: Requires an authorized disposable repository and suitable compute; nontrivial company Cursor implementation is excluded.
- Automated regression: Cover plan-to-commit evidence and unsupported or denied runner execution.

## S14 — Independently review committed work

Problem to solve

Committed implementation needs independent scrutiny. An author’s checks must not be mistaken for a completed code review.

Acceptance Criteria

- Independent reviewers inspect the exact commit and return findings, coverage and seven-principle assessments.
- Confirmed findings return to implementation; only CLEAN reviewed work is eligible for the separate S28 publication operation.

Technical Acceptance Criteria

- Use fresh reviewer identities and D5’s trusted review evidence.
- Changed commits invalidate affected old review evidence.

Testing Strategy

- Manual QA: Present a fixture implementation and finding, confirm publication stays unavailable, then verify the corrected commit has its own CLEAN review evidence.
- Access and setup: Use a disposable repository and mocked review/provider results for development.
- Automated regression: Cover review identity, exact-commit matching and pre-publication gates.

## S28 — Publish one PR for the reviewed commit

Problem to solve

A CLEAN committed review still needs a visible pull request. A lost create response must not produce duplicate PRs or publish unreviewed changes.

Acceptance Criteria

- The Review stage publishes one non-draft PR for the exact independently reviewed commit and records its link on the work item.
- An ambiguous create is reconciled to the matching PR or shown as needs-attention before another write.
- Changed source invalidates publication eligibility until the affected review gate is complete.

Technical Acceptance Criteria

- Use D5’s source-control publication contract and keep PR creation with the Review stage.
- Preserve owner merge authority and store the publication identity/checkpoint.

Testing Strategy

- Manual QA: Publish a reviewed fixture commit, interrupt the response and retry; verify one matching non-draft PR and a preserved work-item link.
- Access and setup: Requires an authorized disposable source-control repository or a matching mocked adapter for development.
- Automated regression: Cover reviewed-commit binding, duplicate-create recovery and ticket-link publication.

## S15 — Report PR readiness to the owner

Problem to solve

An opened PR can still have feedback or failed checks. The team needs a truthful handoff that shows what remains before an authorized merge.

Acceptance Criteria

- The worker records current PR feedback/checks and returns concrete in-scope corrections to the proper stage.
- Ready for Owner means the required current checks/reviews passed and remaining limitations are visible.

Technical Acceptance Criteria

- Reuse the bounded babysitting role and source-control adapter contract.
- Do not merge or treat missing CI as a passing hosted check.

Testing Strategy

- Manual QA: Supply failing then passing check fixtures and verify the ticket’s readiness and linked evidence follow the exact PR revision.
- Access and setup: Use the selected source-control test project and current-check fixtures.
- Automated regression: Cover stale checks, unresolved feedback and owner handoff without merge.

## S16 — Install a Ski Stack package for Cursor

Problem to solve

Teammates should not recreate each role and skill by clicking through a UI. Cursor needs a repeatable supported installation path.

Acceptance Criteria

- A teammate installs one selected version and can discover and invoke its supported Ski Stack roles/skills.
- Missing capabilities or incompatible configuration produce a clear non-destructive diagnostic.

Technical Acceptance Criteria

- Use D6’s verified Cursor mechanism and versioned package contract.
- Keep credentials outside the package and keep execution permissions explicit.

Testing Strategy

- Manual QA: Install into the selected disposable profile, inspect available assets and invoke one trivial supported entry point.
- Access and setup: Requires the verified Cursor installation surface; do not change the work account’s compute allowance.
- Automated regression: Cover installed asset/version identity and unsupported capability diagnostics.

## S17 — Install a Ski Stack package for Codex

Problem to solve

Codex teammates need the same repeatable role/skill setup. Manual copies leave teams with unknown versions and inconsistent guidance.

Acceptance Criteria

- A teammate installs one selected package version and can discover and invoke the supported assets in Codex.
- Unsupported capabilities are reported without implying that installation provides a cloud execution service.

Technical Acceptance Criteria

- Use D6’s documented Codex mechanism and shared package contract.
- Keep host-specific configuration and secret references separate from portable assets.

Testing Strategy

- Manual QA: Install in a disposable Codex configuration and verify loaded asset names/version with a trivial invocation.
- Access and setup: Requires the verified Codex installation surface and isolated test configuration.
- Automated regression: Cover installed asset identity, portability and capability reporting.

## S18 — Upgrade an installed package without losing edits

Problem to solve

Teams need maintained packages without overwriting their local choices. An upgrade must make changes and conflicts understandable.

Acceptance Criteria

- A teammate previews one supported version upgrade and sees changed assets and local conflicts.
- Applying the supported upgrade preserves local configuration or stops with the exact conflict and recovery path.

Technical Acceptance Criteria

- Use D6’s compatibility and local-change rules for one chosen harness per Story.
- Split separate harness upgrade implementations when needed to preserve PR size.

Testing Strategy

- Manual QA: Install a fixture version, make a local edit, preview/apply the next version and inspect the preserved value or reported conflict.
- Access and setup: Use disposable package/configuration directories for the selected harness.
- Automated regression: Cover version compatibility and non-destructive local-change handling.

## S19 — Inspect team work through MCP

Problem to solve

A control agent cannot yet inspect Ski Stack through a supported tool contract. UI workarounds waste context and obscure authorization.

Acceptance Criteria

- An authorized agent discovers capabilities and retrieves bounded ticket/run status and actionable next states.
- Omitted detail is identified and unauthorized project or team data is withheld.

Technical Acceptance Criteria

- Use D7’s MCP transport/authentication and the shared inspection commands.
- Return structured results without interactive prompts.

Testing Strategy

- Manual QA: Use the chosen MCP client to inspect a known fixture run, request its detail and verify the denied caller response.
- Access and setup: Requires the selected isolated MCP connection and scoped test identities.
- Automated regression: Cover inspection tool schemas, bounded output and authorization.

## S20 — Create an ideation ticket through MCP

Problem to solve

A conversation with a control agent should be able to begin the team’s workflow. The created idea must enter the same board policy as a human-created ticket.

Acceptance Criteria

- An authorized agent creates one scoped idea ticket and receives its link and initial stage.
- Repeating an ambiguous request recovers the created ticket or reports uncertainty without blindly duplicating it.

Technical Acceptance Criteria

- Use D7’s create authority/idempotency contract and D1’s verified ticket-create behavior.
- Do not grant extra execution or transition authority through ticket content.

Testing Strategy

- Manual QA: Create a fixture idea through the MCP client and retry after an interrupted response; inspect the board for the intended single ticket.
- Access and setup: Requires a scoped disposable project and verified create permission for live acceptance.
- Automated regression: Cover create-tool authorization and duplicate-request recovery.

## S21 — Request a deliberate retry of a finished attempt

Problem to solve

Operators and control agents need an explicit way to try eligible work again. Replaying an event must not be confused with authorizing new compute.

Acceptance Criteria

- An authorized retry creates a new attempt linked to the completed or failed original with clear reason and status.
- An active or uncertain provider attempt is not silently replaced or treated as cancelled.

Technical Acceptance Criteria

- Use D7’s retry capability and the same application authorization from human and MCP entry points.
- Enforce configured launch limits and current ticket eligibility.

Testing Strategy

- Manual QA: Retry a terminal fixture attempt and inspect both linked records; attempt the same action on an unresolved run and confirm the blocked reason.
- Access and setup: Use isolated run state and mocked provider behavior until suitable live authority exists.
- Automated regression: Cover explicit retry identity, authority and active/uncertain-run protection.

## S22 — Run two jobs without ownership collisions

Problem to solve

The first pilot permits one active job. Scaling requires evidence that concurrent workers retain correct ownership and recovery.

Acceptance Criteria

- Two eligible jobs can run within the configured capacity without accepting a stale worker’s result.
- Competing workers for the same attempt converge on the recorded owner and provider identity.

Technical Acceptance Criteria

- Use D8’s measured concurrency target and transactional fencing contract.
- Do not increase company-account compute or shared infrastructure limits implicitly.

Testing Strategy

- Manual QA: Run two worker processes with synthetic jobs, expire one owner and inspect accepted results and launch records.
- Access and setup: Use isolated durable state and mocked providers before any authorized capacity experiment.
- Automated regression: Cover multi-process contention, capacity bounds and stale-writer rejection.

## S23 — Operate an isolated second team

Problem to solve

A single-team deployment cannot demonstrate SaaS isolation. A second team must use the same supported workflow without seeing the first team’s data or secrets.

Acceptance Criteria

- An authorized administrator provisions a second configured team through the chosen supported setup path.
- Each team can inspect and run its own fixture work while cross-team reads, writes and connection use are denied.

Technical Acceptance Criteria

- Use D8’s membership and connection-ownership design.
- Split membership/setup and any new interface into separate complete Stories if the established commands cannot keep this within the size limits.

Testing Strategy

- Manual QA: Configure two fixture teams, complete the supported operation in each and attempt cross-team inspection and execution.
- Access and setup: Requires isolated team identities/connections from the reviewed D8 plan, not production credentials.
- Automated regression: Cover tenant boundaries across commands, stored results and credential selection.

## S24 — Explain and enforce a team’s launch limit

Problem to solve

Teams need predictable bounds on automatic work. A limit that only hides a button does not prevent agent or concurrent-worker launches.

Acceptance Criteria

- New attempts obey the configured team launch limit and waiting work shows the specific reason.
- Existing accepted work remains observable and recoverable when no new launches are allowed.

Technical Acceptance Criteria

- Use D8’s durable accounting and capacity rules at the shared launch boundary.
- MCP, operator commands and scheduled work follow the same policy.

Testing Strategy

- Manual QA: Reach a fixture team’s limit, try each launch entry point and inspect the waiting reason plus recovery of existing work.
- Access and setup: Use synthetic usage records and mocked provider calls; no spending experiment is required.
- Automated regression: Cover consistent launch enforcement and continued reconciliation at capacity.

## S25 — Keep two teams isolated during a restore

Problem to solve

The one-team recovery path does not prove that restoring shared state keeps a
second team's work and access isolated.

Acceptance Criteria

- The operator can restore one team's connection without reopening another team's uncertain work.
- Each team's member and agent sees only its own recovery state and permitted results.
- Missing cross-team evidence keeps affected connections quarantined rather than launching new work.

Technical Acceptance Criteria

- Extend S29-S31's one-team recovery contract without weakening its effect or authority checks.
- Use D8’s multi-team isolation contract and existing provider/publication identities.
- Do not claim recovery beyond the tested retention and backup boundary.

Testing Strategy

- Manual QA: Restore an isolated two-team fixture with one interrupted job; inspect each team's evidence and denied cross-team access.
- Access and setup: Use a disposable restore target and synthetic provider/Jira evidence; never overwrite live state for QA.
- Automated regression: Cover cross-team isolation and no duplicate external effect after restore.
