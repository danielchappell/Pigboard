# Pig Boss release one: implementation Stories

Independently reviewed 23-Story set for final owner review. The delivery plan defines dependency order; stable R1 IDs and all 88 baseline cases are preserved. There are now 104 cases. No implementation or activation is authorized by publication.

The [company/health contract](../../architecture/pig-boss-operations.md) applies to all Stories: project-scoped identity, customer-owned multi-project configuration and basic Pig Boss health. Worker monitoring stays deferred. All acceptance cases remain explicitly human-owned because the approved QA helpers do not execute these CLI/IaC/instruction checks. Developer CI and PR review still run; installed acceptance is separate.

## R1-01: Validate an editable work document

### Problem to solve

Authors cannot yet distinguish a valid draft from a ticket that meets the new structured contract. Give them a local check with precise errors before any worker starts.

### Acceptance Criteria

- **AC1.** A local command reports draft validity separately from start validity, with the field path and reason for each failure.
- **AC2.** Complete skeletons keep every declared null/list; populated examples pass shape checks while required nulls fail start checks.
- **AC3.** Ambiguous or unsafe YAML and non-JSON values fail before evaluation; the command performs no network calls or writes.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own canonical installed Epic/ticket schemas and safe extraction/parsing; move rather than maintain divergent design copies and update their references.
- **TAC1.** Own canonical installed Epic/ticket schemas and safe extraction/parsing; move rather than maintain divergent design copies and update their references.
- **TAC2.** Use standard YAML 1.2 parsing and JSON Schema 2020-12; reject duplicates, aliases, custom tags, extra documents, unknown fields/versions, non-string keys, lone surrogates and unsafe integers/nonfinite numbers.
- **TAC3.** Define and enforce byte/depth/list limits; validate Unicode and canonical JSON compatibility before hashing. Produce readable and JSON diagnostics.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-01-H01: Draft versus start

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, TAC1.
- **Prerequisites/data:** Blank and populated reviewed Epic/ticket examples; no credentials.
- **Steps:**
  1. Run the new validate-work command in draft mode on each example.
  2. Run start validation on the same files.
  3. Fill one missing requirement and repeat.
- **Expected:** Draft recognizes complete editable skeletons; start lists missing fields; populated shape passes; a successful shape check makes no live-readiness claim.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-01-H02: Reject unsafe inputs

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC3, TAC2, TAC3.
- **Prerequisites/data:** One fixture per forbidden syntax/value and at-limit/over-limit documents.
- **Steps:**
  1. Run validation for each fixture.
  2. Inspect exit status and output.
  3. Inspect directory/network-call audit.
- **Expected:** Every invalid fixture fails at its precise field without coercion, execution or network/write activity; supported boundary values pass.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

- **Automated regression:** CLI contract tests for safe extraction, draft/start distinction and bounded canonical value handling.


## R1-02: Check the complete prescribed test plan

### Problem to solve

A well-shaped ticket can still have missing acceptance coverage or an impossible QA order. Authors need these errors before marking it ready.

### Acceptance Criteria

- **AC1.** The command checks unique IDs, requirement coverage, named references, preparation consumers, prerequisite graphs and supported skill order against supplied trusted configuration.
- **AC2.** API parents invoke their one Bruno child once; bindings only read earlier declared outputs; human cases never enter AI dispatch.
- **AC3.** An explicit all-human plan passes with complete cases and reason; missing scope, expectations or skill availability cannot be deferred as preparation.
- **AC4.** Start validation rejects a plan whose complete handoff ledger cannot fit supported publication bounds; it never drops cases to make it fit.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own local semantic validation only; native Jira freshness, access and occupancy remain separate live gates.
- **TAC1.** Own local semantic validation only; native Jira freshness, access and occupancy remain separate live gates.
- **TAC2.** Enforce database parameter indices, read-only async observation schedule/deadline, evidence checkpoints, cleanup and access-owner requirements from the reviewed contract.
- **TAC3.** The installed skill allowlist and customer scope are trusted inputs, not ticket-supplied authority.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-02-H01: Mixed and human-only plans

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, TAC3.
- **Prerequisites/data:** Reviewed mixed API/DB/UI plan plus a complete non-runtime human-only plan.
- **Steps:**
  1. Validate both with the approved skill/config fixtures.
  2. Remove one requirement reference; put a human case or Bruno child in dispatch; change a helper skill.
  3. Validate each mutation.
- **Expected:** Valid plans pass; each mutation reports its field and prevents start; no execution or human PASS is emitted.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-02-H02: Preparation and ordering boundaries

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, TAC1, TAC2.
- **Prerequisites/data:** Fixtures for missing/cyclic/forward references, duplicate IDs, SQL binding, observation deadline and preparation contracts.
- **Steps:**
  1. Validate each valid fixture.
  2. Apply its paired invalid mutation and rerun.
- **Expected:** Only explicit earlier outputs and mechanical preparation slots pass; expectation/scope deferral, async mutation and invalid deadlines fail.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-02-H03: Full evidence fits

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC4.
- **Prerequisites/data:** Plans at and beyond supported ledger size with nonempty evidence requirements.
- **Steps:**
  1. Validate the boundary plans.
  2. Inspect reported omitted entries and budget errors.
- **Expected:** Supported plans retain every case; over-budget plan fails start with zero truncation.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

- **Automated regression:** Behavioral CLI tests for semantic readiness, dispatch, preparation and full-ledger publication limits.


## R1-03: Write complete Epic and ticket YAML

### Problem to solve

The existing writing skill produces prose tickets. Humans and workers need the same editable structure for workstream order, scope and prescribed tests.

### Acceptance Criteria

- **AC1.** The existing writer emits complete versioned Epic and Story/Bug skeletons with visible nulls and explicit empty lists.
- **AC2.** It preserves human-writing, provenance, the required story sections and one-repository/PR, 20-file and under-two-day boundaries; oversized work splits and discovery stays a Task.
- **AC3.** It records full numbered stream order on the Epic and complete requirements, scope, prerequisites and AI/human cases on each ticket.
- **AC4.** It identifies missing start fields without inventing inputs or changing Jira readiness. Requesting rework is a separate skill.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own writer instructions/examples and their validator integration; canonical schemas stay shared.
- **TAC1.** Own writer instructions/examples and their validator integration; canonical schemas stay shared.
- **TAC2.** Native title/type/status/parent/labels remain Jira-owned. Structured work cannot extend configured repositories or permissions.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-03-H01: Author and edit

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, TAC1.
- **Prerequisites/data:** Three prepared briefs: one Epic with two streams, one mixed-case Story and one human-only Bug; approved repository facts supplied.
- **Steps:**
  1. Use the writer with each brief and save the result.
  2. Run draft/start validation.
  3. Have a human edit one requirement value and rerun.
- **Expected:** Full structures and required sections remain readable; known complete brief passes; human edit needs no structural redesign.
- **Evidence:** saved authoring conversations, YAML, validation output and human readability notes; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-03-H02: Missing and oversized work

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC2, AC4, TAC2.
- **Prerequisites/data:** Briefs with missing repository, unsupported QA engine, scope requiring two repos, and >20-file or >=2-day work.
- **Steps:**
  1. Ask the writer to prepare each brief.
  2. Inspect proposed items and run start validation.
- **Expected:** Missing inputs stay explicit; scope splits into bounded items or discovery Task; no worker label/status change and no rework action.
- **Evidence:** saved outputs and validation diagnostics; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

- **Automated regression:** Skill contract/examples tests for full skeleton, limits, shared references and draft/start failures.


## R1-04: Validate assignment and handoff evidence

### Problem to solve

Workers and the manager need to agree on which assignment and PR revision a result belongs to. Shape checks alone cannot establish that evidence chain.

### Acceptance Criteria

- **AC1.** A local command validates typed results against supplied assignment, requirement, PR and provider receipts and returns readable/JSON errors.
- **AC2.** It rejects edited/deleted/conflicting/spoofed records and incomplete or stale implementation-review-QA chains.
- **AC3.** It accepts a full human-only completion honestly and retains partial QA/NOT_RUN evidence on repair or blocker results.
- **AC4.** It distinguishes an explicitly authorized blocked-result resumption from unauthorized replacement without producing an unblock action.

- **AC5.** Admission binds the immutable project ID; role receipts inherit it through their assignment and reject a moved issue or foreign-site receipt.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own canonical schemas, RFC8785 digests, safe ADF/HTML code-block recovery and receipt-chain semantics; supplied receipt validation is not a live provider read.
- **TAC1.** Own canonical schemas, RFC8785 digests, safe ADF/HTML code-block recovery and receipt-chain semantics; supplied receipt validation is not a live provider read.
- **TAC2.** Enforce exact IDs, server actors/edit metadata, current assignment, one final logical role slot, PR identity, 16-KiB/depth/list bounds and all repair roots.
- **TAC3.** Workers do not access DynamoDB; the pointer is a lookup aid and shared identities are not proof of exclusive worker ownership.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-04-H01: Valid chains and human-only result

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC3, TAC1.
- **Prerequisites/data:** Synthetic complete new-work, repaired-parent and all-human chains with explicit server receipts.
- **Steps:**
  1. Run the receipt validator on each chain.
  2. Compare canonical digests across ADF and HTML forms.
- **Expected:** Equivalent forms yield the same digest; every AI/nested step and pending human ID is retained; zero AI cases is not reported as AI test success.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-04-H02: Reject mismatched evidence

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC2, TAC2, TAC3.
- **Prerequisites/data:** Paired mutations: actor/edit/assignment/digest/PR/revision conflict, missing page, partial ledger, duplicate root and over-budget record.
- **Steps:**
  1. Validate every mutation against the original supplied receipts.
  2. Inspect error path and verdict.
- **Expected:** No invalid chain is completion; conflicts and incomplete receipts identify the exact rejected reference with no write.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-04-H03: Authorized resume consumer

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC4.
- **Prerequisites/data:** Initial blocked result, valid human authorization and resumed result; variants with wrong source, edited authorization, two leaves or successful prior result.
- **Steps:**
  1. Validate the valid chain.
  2. Validate each variant.
- **Expected:** Only the unique authorized unchanged assignment/revision chain succeeds; no tool creates a resume authorization or changes Jira.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-04-H04: Assignment project binding

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC5, TAC2.
- **Prerequisites/data:** Two native projects with the same stream label; valid admission and moved-project/foreign-site variants. Current PR checkout; prepared local simulated provider data; no live customer actions.
- **Steps:**
  1. Validate each complete receipt chain against trusted native metadata.
  2. Move the assigned issue to the other project in the fixture and repeat.
- **Expected:** Only the original site/project assignment validates; repeated labels alone confer no authority.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.


- **Automated regression:** End-to-end local receipt validation with canonical encoding, authority, repair and resume counterexamples.


## R1-21: Configure Pig Boss for multiple projects

### Problem to solve

A company needs one installation and one editable configuration for several Jira projects. Per-project workflow differences and repeated labels must not create collisions.

### Acceptance Criteria

- **AC1.** A local configuration command validates one Jira site and multiple project IDs with explicit or inherited project mappings, repositories and worker prefixes.
- **AC2.** Readable and JSON output shows resolved project scope and rejects duplicate IDs, ambiguous mappings and untrusted destinations without provider writes.
- **AC3.** Preview of a configuration change identifies added/removed project scope and retained-work checks required before enablement; fifty project entries parse without imposing a ten-project cap.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own the canonical company configuration schema, normalization and zero-write local validation command; provide local configuration-change preview without policy scheduling or live provider discovery.
- **TAC1.** Own the canonical company configuration schema, normalization and zero-write local validation command; provide local configuration-change preview without policy scheduling or live provider discovery.
- **TAC2.** Use immutable project IDs and collision-free tuple encoding of site/project/full-label. Project keys and board IDs are display/context only.
- **TAC3.** No new editable cloud binding file, secret values, global label uniqueness, automatic provisioning or multi-writer ownership service. Native metadata remains authoritative.
- **Scope:** Pig Boss company/health contract applies; customer repos are reference context only. No worker monitoring, activation or scaling implementation.

### Testing Strategy

- **QA skills:** `[]`. All cases are explicitly human-owned; developer CI and PR review remain required.
- **Access:** Current PR checkout with disposable simulated provider/tool data. No live customer actions.
- **Preparation:** Implementer supplies exact fixture paths and commands bound to the PR revision; preserve all cases and expected outcomes. Installed AWS/Jira acceptance is separate.

#### R1-21-H01: One configuration, repeated labels

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, TAC2, TAC1.
- **Prerequisites/data:** Valid two-project and fifty-project local configuration fixtures with equal labels and different workflow IDs. Current PR checkout; prepared local simulated provider data; no live customer actions.
- **Steps:**
  1. Run local validation in readable and JSON modes.
  2. Inspect resolved project maps and independent stream keys.
- **Expected:** Both valid configurations pass; project mappings remain separate; parsing fifty entries is not a runtime throughput claim.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.

#### R1-21-H02: Reject ambiguous scope

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC2, TAC3.
- **Prerequisites/data:** Duplicate project ID, missing inherited mapping, untrusted origin and secret-value fixtures. Current PR checkout; prepared local simulated provider data; no live customer actions.
- **Steps:**
  1. Validate each fixture.
  2. Inspect errors and captured output.
- **Expected:** Errors name safe field paths; no secret contents, provider calls or writes.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.

#### R1-21-H03: Configuration change preview

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC3, TAC2.
- **Prerequisites/data:** Previous and next configs that add/remove a project and rename only a key. Current PR checkout; prepared local simulated provider data; no live customer actions.
- **Steps:**
  1. Compare configurations with local preview.
  2. Inspect required retained-state/readiness checks.
- **Expected:** Output distinguishes key rename from identity removal; removal cannot authorize erasing prior state or enabling until retained work is checked.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.

- **Automated regression:** Add CLI/application and provider-adapter contract coverage for the prescribed normal, failure, identity and permission outcomes; keep local fixtures separate from installed AWS/Jira acceptance.


## R1-05: Hand an implemented PR to review

### Problem to solve

The implementer still uses the earlier prose handoff. It needs the structured assignment and a separate Jira skill without broadening its one-ticket scope.

### Acceptance Criteria

- **AC1.** Implementer accepts native Story and Bug assignments, rejects other types, reads current assignment, Epic and stream context, plans at Grok High with one independent High review, then implements at Medium.
- **AC2.** It checks the actual predecessor/merge facts, follows repo instructions, keeps one PR and records actual parent revision and all incorporated repair causes.
- **AC3.** Passing current-head CI and complete prepared artifacts precede a verified implementation record and In Review.
- **AC4.** Confirmed upstream dependency wait enters Rework Queued with unfinished checks; scope growth or missing execution prerequisites blocks. It never admits work or interrupts another ticket.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own implementer job/Jira separation and bundle entry; preserve current harness controls and minimal automation prompt.
- **TAC1.** Own implementer job/Jira separation and bundle entry; preserve current harness controls and minimal automation prompt.
- **TAC2.** Jira skill uses configured existing Atlassian tools: read pointer and exact receipts, publish/read back one record, recheck inputs, send one allowed directed transition. No automatic mutation retries.
- **TAC3.** Repair preflight requires the same still-open PR; only documented pre-first-PR dependency wait permits null PR. Changed stage or unknown mutation stops without a competing transition.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-05-H01: New and same-PR implementation

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, TAC1.
- **Prerequisites/data:** Prepared simulated tool transcripts for both native Story and Bug new work and repaired A; local disposable application fixture with repo instructions and passing/failing CI receipts.
- **Steps:**
  1. Walk each entrypoint using the supplied tools/results.
  2. Inspect plan review, base selection and preparation evidence.
  3. Allow the simulated current-head CI success and inspect publication/transition order.
- **Expected:** One independent review, required effort settings, exact PR lineage and artifacts; verified result precedes one In Review transition.
- **Evidence:** tool transcript, plan/review/CI receipts and typed result; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-05-H02: Boundary and uncertainty

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC4, TAC2, TAC3.
- **Prerequisites/data:** Scripted rejected Task/Epic types, scope growth, upstream known defect before first PR, closed repair PR, edited assignment, failed CI and lost publication/transition response.
- **Steps:**
  1. Execute each prescribed transcript.
  2. Inspect final record, tool calls and retained output.
- **Expected:** No false success, extra PR, In Progress action or retry; dependency wait is distinct from human Blocked; unavailable Jira is reported in output.
- **Evidence:** complete tool-call audit and final records; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

- **Automated regression:** Skill/handoff regression fixtures for success, dependency wait, repair identity and uncertain effects.


## R1-06: Review and hand off the current PR

### Problem to solve

The reviewer must preserve its existing review criteria while handing results to the new workflow. Directly restarting implementation would violate the stream queue.

### Acceptance Criteria

- **AC1.** Reviewer accepts native Story/Bug assignments and rejects other types; Grok High reviews the full ticket and current PR using existing pr-review criteria and pr-commenting handling.
- **AC2.** Confirmed PR approval plus verified revision-bound Jira review moves to QA; confirmed in-scope findings queue rework on the same PR.
- **AC3.** Discussion stays In Review; missing access, new scope or inability to finish blocks; unknown approval/publication/transition ends without replay.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own reviewer wrapper and separate reviewer-jira skill; do not rewrite shared review criteria or grant merge authority.
- **TAC1.** Own reviewer wrapper and separate reviewer-jira skill; do not rewrite shared review criteria or grant merge authority.
- **TAC2.** Use implementation receipt as basis, validate current assignment/requirements/source and preserve all pending finding references. No direct In Progress transition or DynamoDB access.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-06-H01: Approve current revision

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, TAC1, TAC2.
- **Prerequisites/data:** Simulated native Story and Bug open PR/current implementation and shared review output; configured reviewer identity.
- **Steps:**
  1. Run the review flow against prepared receipts.
  2. Inspect PR approval and Jira record.
  3. Inspect final transition.
- **Expected:** All shared criteria/comment handling retained; approval and evidence match the current revision; exactly one QA transition.
- **Evidence:** review report, PR action audit and Jira transcript; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-06-H02: Changes, discussion and failure

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC2, AC3, TAC1, TAC2.
- **Prerequisites/data:** Separate scripted rejected Task/Epic types, findings, discussion-only, scope increase, source update and unknown approval response.
- **Steps:**
  1. Run each case.
  2. Inspect PR/Jira calls and final evidence.
- **Expected:** In-scope findings produce Rework Queued, discussion no transition, inability Blocked when safe; unknown approval stops without retry or contradictory result.
- **Evidence:** tool-call audit and typed result; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

- **Automated regression:** Reviewer contract tests preserving shared criteria and all approved/repair/discussion/blocked boundaries.


## R1-07: Execute prescribed QA helper steps

### Problem to solve

Existing QA helpers need the structured case bindings and evidence shape. They must execute the prescribed work without choosing new tools or expanding the test plan.

### Acceptance Criteria

- **AC1.** API invokes its exact prepared Bruno child once and returns named observations; database binds supplied inputs to the prepared read-only PostgreSQL query.
- **AC2.** UI follows prescribed steps and captures each screenshot checkpoint at the specified surface/viewport.
- **AC3.** All helpers return revision-bound observations, evidence and inability/defect distinctions; they never move Jira or perform human cases.
- **AC4.** Missing deployment receipt, access, artifact or unsupported engine returns inability without exploratory setup or repeated mutation.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own existing helper instructions and contract fixtures, with no new testing engine or dependency installation during delivery.
- **TAC1.** Own existing helper instructions and contract fixtures, with no new testing engine or dependency installation during delivery.
- **TAC2.** Verify trusted PR environment receipt before environment-dependent work; keep current read-only SQL bounds, tenant/column scope and credential handling.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-07-H01: Execute named helpers

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, TAC1, TAC2.
- **Prerequisites/data:** Prepared disposable API request, PostgreSQL query/parameter scope and local UI fixture with screenshot checkpoints; mocked access/deployment receipts.
- **Steps:**
  1. Exercise the prescribed API parent/child once.
  2. Bind its declared observation into the SQL parameters.
  3. Follow the UI steps and retain screenshots.
- **Expected:** Exact prepared operations and prescribed evidence; no extra helper dispatch, SQL interpolation or Jira action.
- **Evidence:** request/query audit, observations and screenshots; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-07-H02: Cannot execute

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC4, TAC1, TAC2.
- **Prerequisites/data:** Missing/stale receipt, absent request file, wrong tenant, unsupported DB engine and unavailable UI capability.
- **Steps:**
  1. Present each failed prerequisite to its helper.
  2. Inspect output and tool audit.
- **Expected:** Inability is explicit with no guessed environment, installed engine, mutation retry or invented evidence.
- **Evidence:** helper outputs and zero-extra-call audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

- **Automated regression:** Contract tests for exact helper dispatch, safe bindings, evidence checkpoints and failure stops; preserve existing PostgreSQL regression suite.


## R1-08: Complete QA with an honest evidence ledger

### Problem to solve

QA needs to run the named cases in order and hand the open PR to humans. It must retain incomplete results and keep human tests visibly pending.

### Acceptance Criteria

- **AC1.** QA accepts native Story/Bug assignments and rejects other types; Grok High dispatches exactly the prescribed top-level steps in order, including declared helper calls/bindings and bounded read-only observation schedules.
- **AC2.** Every AI step has PASS/FAIL with evidence or NOT_RUN with reason/finding; pending human case IDs remain separate.
- **AC3.** All AI cases passing, or explicit human-only zero-AI work, publishes verified QA evidence then moves to Human Review.
- **AC4.** Confirmed in-scope defects or known upstream waits queue rework; inability blocks; discussion stays QA. Human cases are never auto-passed.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own QA orchestration and separate qa-jira publication; helpers retain no transition authority.
- **TAC1.** Own QA orchestration and separate qa-jira publication; helpers retain no transition authority.
- **TAC2.** Use current review/PR/requirements receipts; no observation overlap, catch-up or replay of completed mutations. Preserve full partial ledger on failure.
- **TAC3.** Human-only non-runtime PR targets need no invented deployment; environment-dependent work still requires the trusted current deployment receipt.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-08-H01: Mixed ordered execution

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, TAC1, TAC2.
- **Prerequisites/data:** Scripted native Story and Bug mixed API-child/database/UI plans with declared binding and screenshots.
- **Steps:**
  1. Execute the prepared dispatch sequence.
  2. Inspect full nested ledger and human_pending.
  3. Inspect verified publication and transition order.
- **Expected:** Each step once, correct earlier-output binding, full evidence; Human Review only after verified current-revision completion.
- **Evidence:** ordered tool audit, screenshots and typed ledger; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-08-H02: Prescribed observation and failure

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC4, TAC2.
- **Prerequisites/data:** Observation schedules for until_expected/all_observations plus overrun, defect, missing access and known upstream defect transcripts.
- **Steps:**
  1. Run each observation schedule against scripted outcomes.
  2. Inspect dispatch times, final ledger and destination.
- **Expected:** No overlap/catch-up; expected success/failure policy; overrun/inability blocks, known defect queues; unfinished work explicitly NOT_RUN.
- **Evidence:** timestamped dispatch audit and result records; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-08-H03: Human-only and stale inputs

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC2, AC3, AC4, TAC3.
- **Prerequisites/data:** Complete human-only native Bug static PR plan, rejected Task/Epic types, plus changed source/requirements and unknown publication variants.
- **Steps:**
  1. Execute zero-AI QA.
  2. Repeat with each invalid variant.
- **Expected:** Zero AI cases and exact pending human list; no human PASS, no invented environment; stale/unknown effects stop without replay.
- **Evidence:** tool audit and human handoff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

- **Automated regression:** Entrypoint contract tests for ordered complete ledgers, observation bounds, all-human handoff and failure destinations.


## R1-09: Request rework through the human’s assistant

### Problem to solve

A human who rejects an open PR needs to record actionable findings without starting a second worker. Story authoring should remain focused on specifications.

### Acceptance Criteria

- **AC1.** A human invokes request-rework with ticket, findings and explicit authorization; it verifies the current Human Review assignment and same open PR.
- **AC2.** It records findings against the current QA completion, verifies publication, rechecks facts and moves only that ticket to Rework Queued.
- **AC3.** It leaves active B alone and explains that the manager later admits A; no manual card drag is required.
- **AC4.** Discussion, new scope, missing evidence, closed PR or conflicting facts make no queue transition; already queued work is inspected without another transition.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own the separate human-invoked skill using shared validation/human-writing and existing configured human actor.
- **TAC1.** Own the separate human-invoked skill using shared validation/human-writing and existing configured human actor.
- **TAC2.** No new automatic worker, Jira UI, pointer/state write, acceptance rewrite, bug creation, multi-PR repair or unblock feature.
- **TAC3.** Unknown publication/transition is reported without retry; preserve prior findings.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-09-H01: Queue A while B finishes

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, TAC1.
- **Prerequisites/data:** A Human Review on open PR, B active in same stream, valid QA chain and authorized human findings.
- **Steps:**
  1. Invoke request-rework.
  2. Inspect recorded findings and readback.
  3. Inspect A/B status and pointer.
- **Expected:** A enters Rework Queued once; B and A pointer unchanged; no implementer starts.
- **Evidence:** assistant conversation, typed request and transition audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-09-H02: Discussion, conflict and repetition

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC4, TAC2, TAC3.
- **Prerequisites/data:** Discussion-only, scope increase, closed PR, changed source, missing receipt, already queued and lost-response variants.
- **Steps:**
  1. Run each prepared invocation.
  2. Inspect resulting calls and preserved findings.
- **Expected:** No unauthorized queue/other transition or retry; already queued findings remain intact; human receives the exact reason.
- **Evidence:** assistant output and tool audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

- **Automated regression:** Human-request contract tests for authorization, current open PR, queue-only effects and uncertain outcomes.


## R1-10: Preview ready work from a complete snapshot

### Problem to solve

An operator needs to see why a stream can or cannot start work before granting write access. The manager’s core rules must run without AWS or Jira credentials.

### Acceptance Criteria

- **AC1.** A local preview explains selection or wait per full stream using opt-in/Epic state, Ready to Work, prerequisite completion, Bugs-before-Stories and Epic-order ties.
- **AC2.** It counts all occupied/Blocked/Human Review members, applies the five-ticket return cap and allows independent numbered streams to proceed.
- **AC3.** Incomplete membership, unknown statuses, conflicting ownership or pending intent holds the appropriate scope; invalid independent ready work is reported and skipped.
- **AC4.** Required repair work is reported as waiting for the repair-policy increment; it cannot be bypassed by admitting unrelated work. Preview performs zero writes.

- **AC5.** Equal labels in different projects have independent ownership, occupancy, repair selection and five-ticket caps; conflicting Epics in one project hold that stream.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own cloud-neutral snapshot policy and readable/JSON preview command; no AWS imports or credentials.
- **TAC1.** Own cloud-neutral snapshot policy and readable/JSON preview command; no AWS imports or credentials.
- **TAC2.** Snapshot completeness, retained identities and supplied receipts are explicit inputs; offline preview does not prove live freshness or permission.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-10-H01: Candidate ordering and capacity

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, TAC1.
- **Prerequisites/data:** Complete snapshots S01–S18, S30–S40 with explicit expected result from the reviewed matrix.
- **Steps:**
  1. Run manager-preview for each named fixture.
  2. Compare selected ticket, reason and scope with the case expectation.
  3. Verify zero writes/imported provider access.
- **Expected:** Exact scenario results, except required repairs explicitly remain unsupported/held in this increment; invalid unrelated work never occupies a slot.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-10-H02: Membership and safety

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC3, AC4, TAC2.
- **Prerequisites/data:** Filtered/incomplete snapshots; mismatched retained identity; unknown stage; queued required repair with otherwise ready Bug.
- **Steps:**
  1. Preview each snapshot.
  2. Inspect diagnostics and side-effect audit.
- **Expected:** Affected or shared scope holds as specified; no false free slot or repair bypass.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-10-H03: Independent project streams

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC5.
- **Prerequisites/data:** Two projects each with AI-Maria-1; A has five Human Review tickets, B has room; second active owner variant within B. Current PR checkout; prepared local simulated provider data; no live customer actions.
- **Steps:**
  1. Preview both projects.
  2. Swap the full stream states between projects and repeat.
  3. Introduce the same-project second active owner.
- **Expected:** Capacity and selection follow project identity; B can progress while A is full, and same-project ownership conflict holds B without conflating A.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.


- **Automated regression:** Executable policy scenarios for readiness, occupancy, capacity, priority, membership and pause.


## R1-11: Preview the complete repair order

### Problem to solve

The manager must finish active work and repair actual dependencies oldest first. Operators need to see the exact queue/admission decision before any live mutation.

### Acceptance Criteria

- **AC1.** Preview covers all 41 approved scenarios, selecting repair prerequisites, queued repairs, Bugs then Stories with correct capacity.
- **AC2.** It proposes queueing B only from actual stale parent lineage after A’s full repaired completion; active or Blocked B is left alone.
- **AC3.** It preserves old/new unresolved repair roots, recognizes consumed roots and never infers a cascade from order, merge or retargeting.
- **AC4.** Paused Epics suppress queue-only and admission decisions; missing lineage or unresolved repair inputs hold instead of admitting unrelated work.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own cloud-neutral repair selection only; no PR polling, run cancellation or provider writes.
- **TAC1.** Own cloud-neutral repair selection only; no PR polling, run cancellation or provider writes.
- **TAC2.** Return typed decisions for only Ready to Work→In Progress, Rework Queued→In Progress and Human Review→Rework Queued.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-11-S01: S01 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Opted-in Epic is In Progress; A is Ready to Work; stream empty; zero Human Review All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S01.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Select A for new admission Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S02: S02 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Epic has no configured opt-in label, or is not In Progress All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S02.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** No admission; active workers may finish their own permitted cycle. Without opt-in, no manager authority. For an opted-in paused Epic, suppress all manager transitions, including queue-only mutations (owner confirmed 14 November 2026) Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S03: S03 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Earlier A is in refinement; later independent B is Ready to Work All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S03.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Ignore A as candidate; select B Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S04: S04 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** A is Ready to Work but has a required null; independent B is an otherwise eligible Ready to Work Story/Bug with a complete contract All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S04.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Report A's field error; B can be selected; no agent launched to finish A's specification Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S05: S05 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** B requires A's AI-QA completion; A is unready, unfinished or lacks coherent current evidence All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S05.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** B is ineligible; do not invent completion or a different prerequisite condition Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S06: S06 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Complete prerequisite A is Human Review, Product Acceptance or Done, with matching completion evidence and no unresolved repair affecting B All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S06.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** A's prerequisite is satisfied; human merge/testing is not an extra implicit admission gate Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S07: S07 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Ready Bug B and independent ready Story A are both eligible All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S07.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Select B; Epic order breaks ties between eligible Bugs Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S08: S08 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Bug B is unready; Story A is eligible and independent All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S08.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Ignore B as candidate; select A Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S09: S09 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Understood repair A is queued; new Bug B is ready All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S09.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Repair A precedes B; a missing repair input holds the repair chain rather than opening a bypass Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S10: S10 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Ready prerequisite P is needed to execute the queued repair; it is otherwise eligible All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S10.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** P precedes the repair; unrelated new work does not replace it Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S11: S11 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** A occupies In Progress, In Review or QA All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S11.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** No second admission in that stream; changing worker type does not free it Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S12: S12 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** One stream has four Human Review tickets, no active cycle and an eligible candidate All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S12.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** One candidate can start; its return would make five Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S13: S13 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** One stream has five Human Review tickets and an eligible Story or Bug All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S13.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** No admission; Bugs obey the same cap Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S14: S14 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Rework A is queued and four other tickets are in Human Review All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S14.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** A can start if other gates pass; reserve its return as the fifth ticket Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S15: S15 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Rework A is queued and five other tickets are in Human Review All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S15.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** A waits for human work to free capacity; no repair exception to the cap Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S16: S16 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** A leaves Human Review for a configured later accepted stage All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S16.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** It no longer occupies the five-ticket Human Review count; retain facts needed for dependencies and lineage Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S17: S17 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** A is genuinely Blocked, or the stream has an unresolved manager intent All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S17.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Hold the stream; no autonomous unblock, expiry or replay Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S18: S18 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** AI-Daniel-1 is occupied; AI-Daniel-2 has an eligible ticket and no shared uncertainty All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S18.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Daniel-2 can proceed independently; full labels identify streams Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S19: S19 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** A is in Human Review and needs confirmed repair while B is already active All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S19.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** The authorized human-request automation records A in Rework Queued; B's existing cycle continues; no concurrent A implementer. B's workers have no authority to transition A Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S20: S20 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** B can finish its assigned cases without depending on the unresolved A repair All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S20.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** B can reach Human Review; then A repair is considered before new C Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S21: S21 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** A's known defect makes B's required checks impossible All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S21.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Responsible B worker records dependency wait and unfinished checks, moves B to Rework Queued; manager does not repair it or start A concurrently Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S22: S22 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** A's repair is implemented but review/AI QA is incomplete All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S22.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Do not queue completed B on implementation evidence alone Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S23: S23 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** A completes its repaired revision; B's recorded actual parent is A at an older affected revision; B is in Human Review All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S23.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Manager queues B with the repair roots and required parent completion; preserve B's old assignment pointer until admission Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S24: S24 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Same evidence as S23, but B is active All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S24.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Do not interrupt or move active B; later re-evaluate its published result and current stage Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S25: S25 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** B has already consumed the applicable repair roots at the required parent completion All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S25.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Do not queue B again Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S26: S26 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** B is next in Epic order but does not record a code dependency on A All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S26.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** No stack update merely from order or a shared stream Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S27: S27 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** A is normally merged/retargeted without a recorded repair All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S27.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** No stack update merely from the merge/retarget; humans own PR maintenance Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S28: S28 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** B must update its stack, but its PR is already merged, lineage is absent, or the fix needs more scope All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S28.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Human handling; no replacement/multi-PR job inferred. Implementer PR preflight owns the actual open-PR check Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S29: S29 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** A second parent repair arrives before B starts All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S29.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** B waits until the newer parent repair also completes implementation, review and AI QA; consume the latest verified parent revision covering every applicable repair request, preserve all causes and do not drop older findings Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S30: S30 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** One full label appears in two active opted-in Epics All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S30.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Hold that stream and show both Epics; do not choose one by timestamp/order Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S31: S31 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** A known live/queued/blocked/Human Review ticket loses its label, changes parent or disappears from the Epic list All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S31.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Continue reading its retained stable ID; hold its previous stream until a human reconciles the mismatch; do not free capacity from a filtered search Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S32: S32 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** The same known ticket is relabelled into another configured stream All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S32.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Include both old and proposed scopes in the mismatch diagnostic; do not admit it under the new label while its previous ownership is unresolved Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S33: S33 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** An unstarted independent preparation/Ready ticket is removed from the Epic plan All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S33.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** It is no longer a candidate; removal is allowed only when no required dependency refers to it Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S34: S34 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** A prerequisite is removed or cancelled All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S34.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** This does not satisfy its required outcome; dependent work stays ineligible pending revised human requirements Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S35: S35 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** A ticket enters an unmapped or ambiguous native status All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S35.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Hold the affected scope; Jira's broad To Do/In Progress/Done category cannot determine product meaning Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S36: S36 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** A required known ID is inaccessible/deleted, a page is missing, or a search is incomplete All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S36.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Hold affected scope; shared discovery uncertainty holds the scan; never count missing as finished Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S37: S37 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Human reorders eligible independent tickets before admission All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S37.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** New Epic order controls future ties; do not rewrite an existing assignment or actual parent lineage Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S38: S38 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Requirements, relevant Epic membership or completion revision changes before durable intent All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S38.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Return changed-input/no-write; use a later fresh evaluation rather than continuing an old selection Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S39: S39 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Two tickets are already active in one stream All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S39.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Report inconsistent occupancy and hold new manager mutations; do not stop either Cursor run automatically Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S40: S40 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Epic is paused after one worker cycle started All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S40.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** No new admission; that cycle may reach Human Review if it needs no correction. Also suppress manager queue-only operations (owner confirmed 14 November 2026) Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-S41: S41 policy scenario

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Relevant inputs change after durable intent or comment/pointer publication but before transition All unmentioned input facts are complete/valid and no earlier-priority work exists.
- **Steps:**
  1. Load the prepared complete snapshot for S41.
  2. Run manager-preview; inspect decision, affected scope, reason and side-effect audit.
- **Expected:** Send no transition; preserve the intent and already-published evidence as a human hold. A fresh scan cannot clear it or replay publication Preview expresses the decision only and performs zero writes.
- **Evidence:** snapshot, JSON/readable preview output and zero-write audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-11-H02: Repeated root and descendant trace

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC2, AC3, AC4.
- **Prerequisites/data:** A a1→a2 repair, B old completion, C actual child; second A root arrives while B queued; independent D.
- **Steps:**
  1. Preview before A completes.
  2. Preview after first and second repaired completions.
  3. Supply B completion consuming all causes and preview again.
- **Expected:** No early queue, pointer mutation or duplicated cause; latest coherent parent/all roots required; consumed update not requeued; only actual descendants qualify.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

- **Automated regression:** Full scenario matrix and repeated-root/descendant policy traces with no provider side effects.


## R1-12: Preview current Jira work with bounded reads

### Problem to solve

Offline decisions are useful only if the operator can compare them with complete current Jira facts. Filtered searches must not make occupied work disappear.

### Acceptance Criteria

- **AC1.** One canonical configuration supplies site/projects, repositories, native mappings, actors, labels, bounds and secret references; work text cannot override it.
- **AC2.** The live read-only preview gathers complete bounded pages, unions current membership/dependencies/lineage with supplied retained IDs and fresh-reads each known issue.
- **AC3.** Missing pages, denied/deleted IDs, changed membership or exhausted budgets yield precise incomplete/hold results rather than empty availability.
- **AC4.** It resolves typed receipts through the supported provider representation and shows selections without writing Jira or operational state.

- **AC5.** Live preview resolves each project mapping and allowed cross-project prerequisites; project identity uses immutable IDs and incomplete shared inventory never yields free capacity.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own Jira read adapter/config validation; retained IDs are supplied through the state interface when installed, not an editable second customer configuration.
- **TAC1.** Own Jira read adapter/config validation; retained IDs are supplied through the state interface when installed, not an editable second customer configuration.
- **TAC2.** Use configured HTTPS origins, verified TLS, bounded time/requests and no credential-bearing redirects; logs/diagnostics exclude secrets and ticket contents.
- **TAC3.** Initial operator verification of complete service-account visibility is a prerequisite; searches cannot prove unseen issues do not exist.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-12-H01: Complete live-style preview

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC4, TAC1, TAC3.
- **Prerequisites/data:** Recorded authorized Jira REST fixture pages and known IDs, including Human Review/Blocked work omitted by a ready-only search; token is a dummy test value.
- **Steps:**
  1. Run against the scripted HTTP fixture server with canonical test config.
  2. Inspect exact known-ID/comment reads and decision.
- **Expected:** Complete pages and fresh known IDs used; full occupancy retained; zero write calls and matching offline decision.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-12-H02: Incomplete and edited inventory

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC2, AC3, TAC3.
- **Prerequisites/data:** Missing page, 403/404, rate limit, response timeout, relabelled known ticket and exceeded request/time/count fixtures.
- **Steps:**
  1. Run each fixture through preview.
  2. Inspect scope/diagnostic and call count.
- **Expected:** No fabricated free stream, no retries beyond the explicit read budget, no writes; shared unknown holds entire scan.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-12-H03: Destination and secret boundaries

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, TAC2.
- **Prerequisites/data:** Unauthorized project/repository, credential URL, redirected request and deliberately secret-bearing provider error.
- **Steps:**
  1. Validate config and run each blocked transport fixture.
  2. Search output for the dummy secret and customer body.
- **Expected:** Invalid destination denied before credential send; no sensitive values in output.
- **Evidence:** redacted transport audit and output inspection; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-12-H04: Mixed projects and discovery failures

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC5.
- **Prerequisites/data:** Two project IDs with different status/type mappings, equal labels, a cross-project prerequisite, renamed key, denied-project and isolated-stream-conflict variants. Current PR checkout; prepared local simulated provider data; no live customer actions.
- **Steps:**
  1. Preview all variants through the simulated Jira adapter.
  2. Compare mapped stages, dependency results, native IDs and mutation trace.
- **Expected:** Correct mapping and prerequisite checks across projects; key rename preserves identity; known isolated conflict holds only affected scope; denied project with unknown shared impact holds all writes; no preview mutations.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.


- **Automated regression:** HTTP-fixture integration tests for complete inventory, fresh reads, request budgets and credential boundaries.


## R1-13: Install a disabled AWS preview

### Problem to solve

A company needs to run the preview in its own AWS account without giving Scuba Pig access. Installation should derive resources from one configuration.

### Acceptance Criteria

- **AC1.** A packaged customer-owned Lambda runs the same preview with the canonical configuration and customer secret reference; installation starts disabled and write-free.
- **AC2.** Generated outputs identify the function, schedule, log group and state binding without asking the operator to duplicate configuration.
- **AC3.** The package has no public endpoint, vendor trust, telemetry or runtime source download; operator invocation and scheduler/runtime/deployer roles are distinct.
- **AC4.** The guide provides install, preview and stop steps with bounded invocation/read/log retention settings and explains real Jira permission limits.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own AWS wrapper/IaC/package scripts; keep policy/Jira/core state interfaces free of AWS imports.
- **TAC1.** Own AWS wrapper/IaC/package scripts; keep policy/Jira/core state interfaces free of AWS imports.
- **TAC2.** Create one reserved-concurrency-one function and disabled schedule; disable event/function mutation replay settings and validate effective configuration before apply can be supported.
- **TAC3.** Runtime IAM names only this installation’s configured secret, log group and state resource; scheduler may invoke only its function. No resource deployment occurs as part of editing this Story.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-13-H01: Package and local invocation

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, TAC1.
- **Prerequisites/data:** Disposable build directory; canonical fixture config and simulated AWS/Jira adapters, no account credentials.
- **Steps:**
  1. Package the pinned source.
  2. Invoke the wrapper in preview with fixture adapters.
  3. Inspect generated outputs and compare the policy result.
- **Expected:** Same preview result, no writes, no moving-source fetch, one derived configuration.
- **Evidence:** package manifest, generated outputs and invocation audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-13-H02: Installation and permission contract

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC3, AC4, TAC2, TAC3.
- **Prerequisites/data:** Generated infrastructure template and allow/deny policy fixtures.
- **Steps:**
  1. Inspect schedule/function retries, concurrency, retention and disabled defaults.
  2. Run positive/negative permission checks for intended and unrelated resources.
  3. Follow the documented preview/stop journey in the fixture harness.
- **Expected:** Disabled default, no public/vendor access, bounded settings, intended calls allowed and unrelated ones denied; live IAM remains installed acceptance.
- **Evidence:** template/policy checks and operator walkthrough notes; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

- **Automated regression:** Package/wrapper tests, synthesized IAM allow/deny checks and disabled scheduling configuration checks.


## R1-14: Inspect durable scheduling state

### Problem to solve

Operators need to see retained stream ownership and attempts without storing ticket content. The manager needs conditional state operations that survive failed or overlapping writes.

### Acceptance Criteria

- **AC1.** The customer can initialize a disabled installation, inspect its four record kinds and see pending attempts/retained membership with sanitized diagnostics.
- **AC2.** The state adapter passes an executable contract suite for atomic begin/finalize, revision conflicts, unknown writes and retained history.
- **AC3.** A stale caller cannot clear another pending attempt; required member identities persist before a consumer may perform a Jira side effect.
- **AC4.** Read-only preview can consume retained IDs without changing state; no TTL unlock, automatic history/member retirement or replacement empty table is offered.

- **AC5.** Saved stream, member and attempt identities include site and immutable project ID; project moves/removal retain old occupancy and unresolved intent.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own cloud-neutral state interface, DynamoDB adapter and operator inspect/init command; use installation, stream, attempt and member records only.
- **TAC1.** Own cloud-neutral state interface, DynamoDB adapter and operator inspect/init command; use installation, stream, attempt and member records only.
- **TAC2.** Atomic begin creates attempt plus pending stream reference; atomic finalize records that outcome and clears only its matching reference. Read coupled safety facts consistently.
- **TAC3.** Store IDs, versions and evidence references/metadata, not code, descriptions, full provider bodies or transcripts. Retain table on replacement/deletion.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-14-H01: Initialize and inspect

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC4, TAC1, TAC3.
- **Prerequisites/data:** Disposable state emulator fixture and canonical installation identity; known member labels later change.
- **Steps:**
  1. Initialize while disabled.
  2. Record fixture history through the adapter contract driver.
  3. Inspect state and run a preview using retained IDs.
- **Expected:** Four kinds readable, old member identity retained, preview makes no writes, no ticket contents stored.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-14-H02: Atomic conflicts and unknown writes

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC2, AC3, TAC2.
- **Prerequisites/data:** Two competing expected revisions, injected transaction timeout/partial failure and stale finalizer.
- **Steps:**
  1. Run both begin attempts.
  2. Inject each fault before/after provider persistence.
  3. Finalize from matching and stale callers; inspect all items.
- **Expected:** At most one conditional winner; no partially committed coupled transaction; unknown persistence grants no Jira authority; stale finalizer cannot clear current pending reference.
- **Evidence:** state before/after, structured adapter outcomes and transaction-call audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-14-H03: Retained project identity

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC5.
- **Prerequisites/data:** Same label in two projects, pending attempt in A, key rename, issue move and project-removal snapshots. Current PR checkout; prepared local simulated provider data; no live customer actions.
- **Steps:**
  1. Inspect both streams.
  2. Apply the metadata/configuration changes to fixture observations and inspect again.
  3. Attempt a stale cross-project completion using the state contract harness.
- **Expected:** Records never collide; rename preserves IDs; move/removal does not free old capacity or erase intent; stale completion is rejected and affected scope remains held.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.


- **Automated regression:** Executable state-adapter conformance suite with atomicity, stale caller, uncertain persistence and retention cases.


## R1-15: Reconcile an uncertain attempt with evidence

### Problem to solve

An uncertain Jira effect must not be replayed automatically. Operators need a supported way to inspect and settle only outcomes they can positively prove.

### Acceptance Criteria

- **AC1.** While admission is disabled and invocations drained, an operator can inspect the exact attempt and submit positive evidence for applied or proved-rejected outcome.
- **AC2.** A matching evidence chain conditionally finalizes that attempt without any Jira transition, pointer rollback or worker launch.
- **AC3.** Elapsed time, current status, absent history, conflicting evidence or an enabled/non-drained installation cannot clear a hold. Unknown stays held, including across restart.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own evidence-only reconciliation command and policy; reuse exact receipts and state contract.
- **TAC1.** Own evidence-only reconciliation command and policy; reuse exact receipts and state contract.
- **TAC2.** Require the supported disposition/evidence schema, observed state revision and operator identity; no force-success, general unlock, automatic retry or membership-transfer command.
- **TAC3.** Document that draining cannot cancel an already-sent provider request and some ambiguous attempts cannot safely resume in this release.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-15-H01: Positive reconciliation

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, TAC1, TAC2.
- **Prerequisites/data:** Disabled/drained fixture with confirmed-applied chain and separate proved-rejected provider receipt.
- **Steps:**
  1. Inspect the named attempt.
  2. Submit its matching evidence and expected revision.
  3. Inspect final state and provider call audit.
- **Expected:** Only the named attempt finalized; history retained; zero Jira mutations or worker calls.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-15-H02: Unknown or unsafe reconciliation

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC3, TAC2, TAC3.
- **Prerequisites/data:** Variants with enabled runtime, in-flight invocation, unknown/lost response, absent history, stale revision, wrong actor or changed pointer.
- **Steps:**
  1. Attempt reconciliation for each variant.
  2. Restart/reinspect the state.
- **Expected:** Every unsupported/conflicting case remains held with an actionable reason; no timer-based or blind unlock.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

- **Automated regression:** Operator command tests proving positive-only conditional reconciliation and persistence of unknown outcomes.


## R1-16: Upgrade and remove the AWS installation safely

### Problem to solve

A customer must be able to upgrade, stop or remove Pigboard without losing unresolved work. Restored or incompatible state cannot silently regain write authority.

### Acceptance Criteria

- **AC1.** A compatible pinned upgrade preserves canonical configuration, retained members/history and pending attempts.
- **AC2.** Rollback, restore or incompatible versions keep writes disabled until compatibility/reconciliation checks succeed; unsupported state is not silently migrated.
- **AC3.** Stop disables scheduling and prevents new writes while documenting bounded drain; removal retains the table and reports retained secrets/logs/resources and costs.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own lifecycle checks and existing package/operator commands; version configuration, work and state separately.
- **TAC1.** Own lifecycle checks and existing package/operator commands; version configuration, work and state separately.
- **TAC2.** No migration engine, data export/retirement, automatic permission change or Cursor cancellation. Preserve unresolved work across generated resource updates.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-16-H01: Upgrade and rollback

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, TAC1.
- **Prerequisites/data:** Installed-package fixture with pending attempt and retained member; compatible and incompatible pinned versions.
- **Steps:**
  1. Run upgrade preview and apply in the deployment harness.
  2. Attempt incompatible rollback and restored-state enable.
  3. Inspect preserved items/config and write settings.
- **Expected:** Compatible change preserves state; unsafe version/restore cannot write and explains required reconciliation.
- **Evidence:** deployment diff, state snapshots and command output; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-16-H02: Stop and remove

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC3, TAC2.
- **Prerequisites/data:** Enabled scheduler fixture plus bounded active invocation and retained resources.
- **Steps:**
  1. Run stop and inspect drain status.
  2. Preview then execute removal in the deployment harness.
  3. Inspect retained resources/output.
- **Expected:** No new writes/schedule; no claim to cancel sent requests or Cursor; table retained and remaining resources/costs disclosed.
- **Evidence:** lifecycle audit and removal report; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

- **Automated regression:** Deployment lifecycle tests for disabled rollback/restore, state preservation, drain and retained-resource removal.


## R1-22: Inspect Pig Boss operating health

### Problem to solve

Operators cannot tell whether Pig Boss has finished its scans or is nearing its limits. A workstream waiting for a human must not look like a broken manager.

### Acceptance Criteria

- **AC1.** The scan wrapper emits sanitized versioned summaries and embedded metrics for complete, incomplete and failed scans, including budget use and separate work holds.
- **AC2.** A read-only command provides readable and JSON disabled/starting/healthy/degraded/stale/unknown results, evidence timestamps and AWS links with the documented exit codes.
- **AC3.** Evidence belongs to the current code/configuration/enablement revision; missing telemetry and failed reads never become healthy, and desired/actual mismatch is degraded.
- **AC4.** Output explains capacity warnings and safe next steps without starting a scan, modifying Jira/state or claiming worker health.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own portable scan-summary and health evaluation, AWS logging/metrics adapter and read-only inspection CLI using the existing customer log group.
- **TAC1.** Own portable scan-summary and health evaluation, AWS logging/metrics adapter and read-only inspection CLI using the existing customer log group.
- **TAC2.** Follow docs/architecture/pig-boss-operations.md for fields, state precedence, freshness, fixed metric dimensions and maximum-based signal interpretation; no second state store.
- **TAC3.** Read-only operator permissions cover only needed configuration, logs, metrics and alarm observations; log no bodies/secrets/raw errors. Runtime uses its existing log-write scope.
- **Scope:** Pig Boss company/health contract applies; customer repos are reference context only. No worker monitoring, activation or scaling implementation.

### Testing Strategy

- **QA skills:** `[]`. All cases are explicitly human-owned; developer CI and PR review remain required.
- **Access:** Current PR checkout with disposable simulated provider/tool data. No live customer actions.
- **Preparation:** Implementer supplies exact fixture paths and commands bound to the PR revision; preserve all cases and expected outcomes. Installed AWS/Jira acceptance is separate.

#### R1-22-H01: Healthy waits and capacity

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC4, TAC1, TAC2.
- **Prerequisites/data:** Complete empty scan, five-ticket wait, retained-uncertainty hold and 80-percent budget fixture. Current PR checkout; prepared local simulated provider data; no live customer actions.
- **Steps:**
  1. Run scans in the local wrapper harness.
  2. Run health command on recorded observations.
  3. Inspect every required scan-summary field, fixed metric dimensions and duplicate completion points; verify maximum-based signal interpretation.
- **Expected:** Empty/business-held scans remain complete with holds shown; capacity warning is degraded; no worker health or second scan is inferred. All versioned summary fields and budget bounds are present; no ticket/stream metric dimension; duplicate points never inflate exact run counts.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.

#### R1-22-H02: Stale and unavailable evidence

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC2, AC3, TAC2.
- **Prerequisites/data:** Old success, recent failed scan, missing completion after crash, denied telemetry read and no first completion fixtures. Current PR checkout; prepared local simulated provider data; no live customer actions. Overlap fixtures: desired/observed disabled plus old success; expired success plus recent failure; failed first scan before/after expiry; schedule mismatch plus stale data; unreadable telemetry plus disabled intent; exact freshness boundary.
- **Steps:**
  1. Evaluate before and after freshness deadline with a controlled clock.
  2. Inspect JSON states and exit codes.
  3. Evaluate every overlapping-condition fixture using the ordered health decision table, including exactly at and just beyond the freshness boundary.
- **Expected:** Stale/failed/unknown/starting are distinct; missing or unreadable evidence is never healthy; command makes zero mutation calls. First matching state follows unknown, schedule mismatch, intentional disabled, stale, current degraded, starting, healthy. Disabled plus old data stays disabled; expired success plus new failure is stale with failure retained as a secondary reason; a failed first scan is degraded before expiry and stale afterward; missing reads win as unknown. Age equal to freshness is within the window.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.

#### R1-22-H03: Disable, mismatch and revision

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC2, AC3, TAC2.
- **Prerequisites/data:** Desired/actual enabled and disabled combinations; old-code/config completion; new enablement generation. Current PR checkout; prepared local simulated provider data; no live customer actions.
- **Steps:**
  1. Evaluate all combinations and current/old revisions.
  2. Inspect state precedence and evidence source.
- **Expected:** Disabled requires observed stopped schedule; either mismatch degrades; unknown observation remains unknown; old revisions cannot satisfy current health.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.

#### R1-22-H04: Permissions and safe output

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC4, TAC3.
- **Prerequisites/data:** Allowed/denied health-reader identities and provider errors containing dummy secrets. Current PR checkout; prepared local simulated provider data; no live customer actions.
- **Steps:**
  1. Run readable and JSON inspection with each identity.
  2. Inspect captured outputs, log events and action trace.
- **Expected:** Only scoped observations succeed; denial reports unknown; secrets/bodies are absent; no Jira/state mutation or scan launch occurs.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.

- **Automated regression:** Add CLI/application and provider-adapter contract coverage for the prescribed normal, failure, identity and permission outcomes; keep local fixtures separate from installed AWS/Jira acceptance.


## R1-23: Install Pig Boss health alarms

### Problem to solve

A stopped or failing manager cannot report its own absence. Customers need basic AWS alarms and a clear guide for operating the installation.

### Acceptance Criteria

- **AC1.** The AWS package creates missing-completion, Lambda error/throttle and budget-utilization alarms with generated links and optional customer SNS notification routing.
- **AC2.** Installation starts disabled; enable, intentional stop and upgrade keep alarm actions and evidence revision aligned with canonical intent; an unexpected scheduler stop stays detectable.
- **AC3.** Readiness checks required health resources, operator permissions and configuration; the guide explains all health states, notification confirmation, capacity limits and safe recovery.
- **AC4.** Removal reports retained resources and costs; no alarm retries work, clears uncertain state, changes concurrency or monitors Cursor.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own health IaC, lifecycle integration and operator/readiness documentation; reuse the existing AWS package and R1-22 metrics/command.
- **TAC1.** Own health IaC, lifecycle integration and operator/readiness documentation; reuse the existing AWS package and R1-22 metrics/command.
- **TAC2.** Use the current evidence revision, missing successful completion as breaching and absent sparse errors as non-breaching. Document provider ingestion/evaluation delays; use existing customer SNS routing when configured.
- **TAC3.** Keep fixed low-cardinality dimensions, finite retention and bounded IAM; customer controls access and optional subscriptions. No dashboard, Teams integration or extra database.
- **Scope:** Pig Boss company/health contract applies; customer repos are reference context only. No worker monitoring, activation or scaling implementation.

### Testing Strategy

- **QA skills:** `[]`. All cases are explicitly human-owned; developer CI and PR review remain required.
- **Access:** Current PR checkout with disposable simulated provider/tool data. No live customer actions.
- **Preparation:** Implementer supplies exact fixture paths and commands bound to the PR revision; preserve all cases and expected outcomes. Installed AWS/Jira acceptance is separate.

#### R1-23-H01: Alarm signals

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC1, TAC2, TAC1.
- **Prerequisites/data:** Synthesized stack and simulated normal/error/throttle/utilization/missing metric histories. Current PR checkout; prepared local simulated provider data; no live customer actions.
- **Steps:**
  1. Inspect alarm dimensions, thresholds, missing-data handling and generated links.
  2. Evaluate signal fixtures including duplicate completion points.
- **Expected:** Missing completion is detectable externally; error and utilization alarms match configured intent; duplicate metrics cannot inflate exact run claims; no automated recovery action.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.

#### R1-23-H02: Lifecycle and scope

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC2, AC4.
- **Prerequisites/data:** Disabled install, enable, intentional stop, unexpected scheduler stop, configuration-only upgrade and removal fixtures. Current PR checkout; prepared local simulated provider data; no live customer actions.
- **Steps:**
  1. Run lifecycle harness for each transition.
  2. Inspect action state, evidence revision and retained-resource report.
- **Expected:** Intentional stop disables actions and reports stopped; unexpected stop does not silence alarms; config changes rotate revision; removal retains scheduling state as promised.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.

#### R1-23-H03: Routing and permissions

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC3, TAC3.
- **Prerequisites/data:** No SNS topic, permitted topic and denied/misconfigured topic fixtures; least-permission policy snapshots. Current PR checkout; prepared local simulated provider data; no live customer actions.
- **Steps:**
  1. Run package/readiness checks and inspect guide.
  2. Inspect action destinations and denied-access output.
- **Expected:** No topic clearly means console/command-only; configured routing requires operator confirmation; failures are actionable; no vendor access or broad runtime health privileges.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.

#### R1-23-H04: New operator walkthrough

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC3, AC4.
- **Prerequisites/data:** Fresh operator with generated outputs and unhealthy fixture observations. Current PR checkout; prepared local simulated provider data; no live customer actions.
- **Steps:**
  1. Follow documented inspect, stop, diagnose and restore-readiness steps.
  2. Attempt an undocumented concurrency increase or uncertain-write replay in the guidance check.
- **Expected:** Guide identifies evidence and safe resolution; advises no overlapping manager or blind replay; capacity numbers are measured claims only. Installed notification delivery remains a separate acceptance gate.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.

- **Automated regression:** Add CLI/application and provider-adapter contract coverage for the prescribed normal, failure, identity and permission outcomes; keep local fixtures separate from installed AWS/Jira acceptance.


## R1-17: Admit a ready Story or Bug safely

### Problem to solve

After preview and installation, the manager must advance the selected ticket through Jira without losing track of uncertain effects. Existing Jira rules then own worker launch.

### Acceptance Criteria

- **AC1.** Apply fresh-reads the full eligible scope, retains member identity and atomically begins one new-work intent before publishing anything.
- **AC2.** It verifies the admission comment and pointer, rechecks source facts, sends one configured Ready to Work→In Progress transition and conditionally confirms the same attempt.
- **AC3.** Failed checks or unconfirmed member/intent persistence permit no Jira side effects; changed/uncertain effects after intent retain the hold across invocations with zero replay.
- **AC4.** Required rework/stack updates remain held until their apply increments ship; no new Story/Bug bypasses them. Preview remains write-free.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own cloud-neutral apply sequence and Jira mutation adapter using existing state/validation; no Cursor launch API or deduplication promise.
- **TAC1.** Own cloud-neutral apply sequence and Jira mutation adapter using existing state/validation; no Cursor launch API or deduplication promise.
- **TAC2.** Disable automatic retries per mutation; fail closed on missing global source-edge mapping, unknown outcome, rate limit, changed inputs or budget exhaustion.
- **TAC3.** Activation requires validated full account visibility, one admitting installation, reviewed inventory and explicit apply enable; initial install stays off.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-17-H01: One confirmed admission

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, TAC1, TAC3.
- **Prerequisites/data:** Complete fixture domain, empty stream, ready Story/Bug, disabled delivery triggers; simulated Jira/DDB.
- **Steps:**
  1. Preview selection.
  2. Enable only fixture apply and invoke once.
  3. Inspect state/comment/pointer/readback/source recheck/transition order.
  4. Invoke again with the ticket active.
- **Expected:** Exactly one directed admission, complete assignment visible before transition; next invocation sees occupied stream and sends no transition.
- **Evidence:** ordered state/Jira call audit and final receipts; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-17-H02: Fault at every boundary

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC3, TAC2.
- **Prerequisites/data:** Inject failure/lost response before and after member/intent/comment/pointer/source-check/transition/finalize operations.
- **Steps:**
  1. Run each fault trace.
  2. Invoke a fresh scan after it.
  3. Inspect persistent state and mutation count.
- **Expected:** Pre-intent read failure reevaluates without hold; persisted/possibly persisted intent prevents new effects; no duplicate publication/transition or false success.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-17-H03: No unsafe bypass

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC4, TAC2, TAC3.
- **Prerequisites/data:** Queued repair, five HR, paused Epic, incomplete shared discovery, global-only transition and unauthorized scope variants.
- **Steps:**
  1. Invoke apply for each fixture.
  2. Inspect decision and provider mutation audit.
- **Expected:** No admission under any failed gate; precise reason and no worker API calls.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

- **Automated regression:** Full apply-sequence integration tests with fault injection at each boundary and later-invocation no-replay assertions.


## R1-18: Admit queued rework on its existing PR

### Problem to solve

Queued work needs another implementation cycle without racing active work or losing repair findings. The manager must reuse its PR and all unresolved causes.

### Acceptance Criteria

- **AC1.** When the stream/capacity/prerequisites permit, apply admits the oldest understood queued repair before unrelated Bugs/Stories through Rework Queued→In Progress.
- **AC2.** The new assignment retains previous assignment, existing PR and every unresolved finding/root; a documented pre-first-PR wait is the only null-PR exception.
- **AC3.** A newer parent repair must complete before B consumes its latest revision/all causes; active work and paused/Blocked streams remain untouched.
- **AC4.** Missing repair evidence or uncertain effects hold without bypass or replay.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own repair-admission specialization of the existing safe apply path; reuse the same state/publication protocol and source-specific transitions.
- **TAC1.** Own repair-admission specialization of the existing safe apply path; reuse the same state/publication protocol and source-specific transitions.
- **TAC2.** PR openness remains implementer preflight; manager adds no PR integration, pointer guessing or multi-PR repair.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-18-H01: Repair with capacity

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, TAC1.
- **Prerequisites/data:** A queued repair with four HR, no active work and coherent previous assignment/PR/findings; Bug C ready.
- **Steps:**
  1. Preview and apply.
  2. Inspect new admission record and pointer.
  3. Repeat with five HR and active B.
- **Expected:** A wins only with room; same PR/all causes retained; full/active variants make no transition.
- **Evidence:** assignment receipts and ordered call audit; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-18-H02: Parent update and pre-PR wait

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC2, AC3, TAC2.
- **Prerequisites/data:** B queued with old+new parent roots; separate documented pre-first-PR wait fixture.
- **Steps:**
  1. Try B before latest parent completion.
  2. Supply coherent latest completion and apply.
  3. Apply valid null-PR wait and invalid forgotten-PR variant.
- **Expected:** B waits then receives all causes/latest parent; only genuine documented first-PR wait accepts null.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-18-H03: Uncertain repair admission

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC4, TAC1.
- **Prerequisites/data:** Fault variants at each publication/transition/finalize boundary.
- **Steps:**
  1. Apply each fault and invoke a fresh scan.
  2. Inspect pending attempt and side effects.
- **Expected:** Same durable holds/no replay as new admission; no unrelated bypass.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

- **Automated regression:** Repair apply tests for priority, exact existing PR/causes, capacity, parent completion and every failure boundary.


## R1-19: Queue a completed dependent PR for repair

### Problem to solve

When A’s repair completes, a stale dependent B in Human Review needs updating. The manager must queue that specific PR without restarting unrelated or active work.

### Acceptance Criteria

- **AC1.** A coherent repaired parent completion plus B’s actual stale lineage permits one Human Review→Rework Queued transition with the recorded cause.
- **AC2.** Queueing preserves B’s old assignment pointer; later admission replaces it through the normal admission path.
- **AC3.** Consumed roots, independent B, routine merges/retargeting, active/Blocked B and paused Epics do not cause queue transitions.
- **AC4.** A→B→C and a second A repair preserve every unresolved cause, require the latest coherent immediate parent and do not repeatedly queue already-consumed updates.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own queue-only specialization of the same durable intent/publication protocol; no direct In Progress or worker calls.
- **TAC1.** Own queue-only specialization of the same durable intent/publication protocol; no direct In Progress or worker calls.
- **TAC2.** On changed facts/unknown effects retain pending intent; no repeat publication or transition. Already queued B gets later repair causes through the defined admission references, not a second queue transition.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-19-H01: Queue then admit B

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, TAC1.
- **Prerequisites/data:** A completes a1→a2 repair; B HR records A at a1; C ready.
- **Steps:**
  1. Apply queue-only decision.
  2. Inspect B pointer and cause.
  3. Run later repair admission and inspect new assignment.
- **Expected:** One queue transition with old pointer preserved; later B admission consumes the recorded update before C.
- **Evidence:** state/transition/pointer trace; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-19-H02: Repeated and newer roots

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC3, AC4, TAC2.
- **Prerequisites/data:** A→B→C chain plus independent D; A gets second repair while B queued.
- **Steps:**
  1. Run queue/admit/complete fixtures through both repair rounds.
  2. Repeat scans after each consumed completion.
- **Expected:** Oldest-first actual descendants only; all roots retained; no duplicate B queue or lost own findings.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-19-H03: Pause, active child and failures

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC3, TAC1, TAC2.
- **Prerequisites/data:** Paused Epic, active/Blocked B, implementation-only A, changed lineage and lost publication/transition response.
- **Steps:**
  1. Apply each variant then invoke again.
  2. Inspect mutations, pointer and pending intent.
- **Expected:** No early/unauthorized queue; uncertain sent effects remain held with zero replay and pointer unchanged.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

- **Automated regression:** Stack integration traces for queue/admit/complete, repeated roots, exact lineage and failure holds.


## R1-20: Check a compatible release before enabling delivery

### Problem to solve

The new manager cannot safely mix old prose workers with structured handoffs. Operators need one readiness report for the complete pinned installation.

### Acceptance Criteria

- **AC1.** The release installs complete compatible writer, validators, job skills, role Jira skills, request-rework and existing human-writing outside application repositories.
- **AC2.** A deterministic readiness report checks pinned bundle/contract/config versions, required capabilities and Story/Bug status-routing configuration while all triggers remain inactive.
- **AC3.** The guide walks Build refresh, installed-content verification, exact worker model effort and the three independent automation entrypoints with minimal prompts.
- **AC4.** Human Review presents both designated reviewers with automated evidence and pending human cases; UAT/production and human unblock remain outside automatic delivery.
- **AC5.** Readiness distinguishes local configuration checks, installed-package acceptance, PGB-58 delivery acceptance and explicit activation; none silently enables anything.

- **AC6.** Readiness verifies multi-project mappings and installed health resources/revision before enablement; displays Pig Boss consistently and links the operating guide.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own compatibility checks and saved inactive setup artifacts; no automatic Jira/Cursor provisioner or live provider mutation from the checker.
- **TAC1.** Own compatibility checks and saved inactive setup artifacts; no automatic Jira/Cursor provisioner or live provider mutation from the checker.
- **TAC2.** Match AI-Daniel numeric streams to the same worker-type routes while preserving full labels for manager ownership; no duplicate skill copies inside Plexus.
- **TAC3.** Use one canonical config and generated bindings; inspect actual installed/hosted receipts where supplied and label missing receipts unverified rather than guessing readiness.
- **Related repositories:** Customer applications are reference/test context only; no Plexus or archived-platform changes.

### Testing Strategy

- **QA skills:** `[]`. Every case below is explicitly human-owned. QA reports zero AI cases and pending human cases; CI and PR review still run.
- **Actor/access:** Human developer and QA reviewer use the PR checkout and prepared disposable fixtures, with dummy credentials and simulated provider/tool receipts. No customer account or delivery automation is used for these local checks.
- **Preparation:** Implementer supplies exact commands and fixture paths as mechanical preparation, bound to the PR revision. It must preserve all inputs/expected outcomes below. The command names and paths in the plan are new interfaces to deliver, not commands claimed to exist today.
- **Execution:** Use fresh isolated data per case; preserve ordered actions within a case. Local tool transcripts test contract handling, not real Cursor publication or an actual PR approval. Installed provider/worker checks remain separate release acceptance.

#### R1-20-H01: Complete pinned bundle

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, TAC1, TAC2.
- **Prerequisites/data:** Disposable external skill install from the reviewed build; inactive saved Jira/Cursor fixture configuration.
- **Steps:**
  1. Fetch/prepare/refresh through the existing setup scripts.
  2. Run readiness check and inspect all required skills/references/contracts.
  3. Inspect app fixture repository diff.
- **Expected:** Complete compatible bundle and minimal prompts, full stream routing, inactive flags, no application-repository copies.
- **Evidence:** installer/readiness receipts and app diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-20-H02: Mismatched or missing setup

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC2, AC5, TAC1, TAC3.
- **Prerequisites/data:** Old worker contract, missing helper, mismatched model/capability, active-rule flag and missing installed acceptance receipts.
- **Steps:**
  1. Run checker for each variant.
  2. Inspect diagnostics and side effects.
- **Expected:** Each mismatch or missing receipt reported; no live setting changes or implicit activation.
- **Evidence:** command/output transcript and fixture before/after diff; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-20-H03: Human handoff walkthrough

- **Owner/skills:** Human developer and QA reviewer; AI skills `[]`.
- **Requirements:** AC4, AC5.
- **Prerequisites/data:** Representative complete automated evidence plus pending human cases and designated developer/QA reviewers.
- **Steps:**
  1. Follow guide from Human Review to recorded human review/testing.
  2. Inspect UAT/Done and unblock instructions.
- **Expected:** Human responsibilities are explicit; no worker claims human PASS or moves acceptance/deployment stages.
- **Evidence:** walkthrough notes and saved readiness output; include tested PR revision.
- **Cleanup:** Remove disposable local fixture/build output after retaining evidence. No live records/resources are changed.

#### R1-20-H04: Company and health readiness

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC6.
- **Prerequisites/data:** Pinned compatible release with two-project config, missing health resource and old evidence-revision variants. Current PR checkout; prepared local simulated provider data; no live customer actions.
- **Steps:**
  1. Run readiness in each variant.
  2. Inspect output and compare Jira/operational-state traces.
- **Expected:** Only complete compatible mapping/resources pass; mismatch is actionable; no scan, activation or delivery mutation occurs.
- **Evidence:** Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- **Cleanup:** Retain evidence then remove disposable fixture/build output; no live changes.


- **Automated regression:** Bundle/config compatibility checks and installer regression tests proving inactive rollout and truthful readiness reporting.
