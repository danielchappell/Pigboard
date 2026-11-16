# Pig Boss release one: implementation Stories

Partial 31-Story source set with 136 prescribed cases after PGB-138 and PGB-136; PGB-137 source composition remains pending. Stable IDs, the original R1-08 criteria/human cases and unrelated bodies are preserved. The 20/23-Story reviews remain historical; the approved QA amendments place R1-24 then R1-30 then R1-27 immediately before R1-08. Jira owns current delivery stages. Publication does not establish installed acceptance or authorize activation.

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


## R1-31: Check Jira read configuration before use

### Problem to solve

The existing configuration checker validates project mappings but cannot check the connection and explicit limits needed for Jira reads. Operators and agents cannot safely inspect whether a proposed change to these settings needs review before live access is prepared.

### Acceptance Criteria

- **AC1.** The existing source and copied-installed checker accepts old offline configurations and distinguishes missing live settings, complete locally valid live settings and scope exceeding the live100-project ceiling without claiming readiness.
- **AC2.** It validates the complete supported credential-reference/cloud-ID connection and explicit finite read bounds; partial, unsupported or contradictory settings produce safe named-field diagnostics.
- **AC3.** Its change preview reports each connection, secret-reference and read-bound edit without old/new sensitive values, while preserving existing project, site, actor, repository and retained-state checks.
- **AC4.** Human and JSON output show the same effective bounds and pending site/cloud-binding, access, visibility, ownership and release checks; live_readiness remains not_evaluated.
- **AC5.** The checker resolves no secrets, calls no provider and writes no configuration or state; rejected content, cloud IDs and secret-reference values are absent from its new summaries, diagnostics and diff fields.
- **AC6.** The shipped source/copied guide and example explain preparation, checks, changes and recovery, with synthetic explicit budgets labelled unmeasured and final PGB-82 supported-default acceptance still required.

### Technical Acceptance Criteria

The complete contract below retains the repository, boundaries and all seven technical criteria.

### Testing Strategy

Four prescribed human cases remain NOT_RUN (0/4). PREP-01 supplies exact finite commands and dummy inputs at the reviewed implementation revision. Developer regressions do not complete human acceptance or original PGB-82 acceptance.

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The existing configuration checker validates project mappings but cannot check the connection and explicit limits needed for Jira reads. Operators and agents cannot safely inspect whether a proposed change to these settings needs review before live access is prepared.",
  "prerequisites": [
    {
      "ticket": "R1-21",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The existing source and copied-installed checker accepts old offline configurations and distinguishes missing live settings, complete locally valid live settings and scope exceeding the live100-project ceiling without claiming readiness."
    },
    {
      "id": "AC2",
      "requirement": "It validates the complete supported credential-reference/cloud-ID connection and explicit finite read bounds; partial, unsupported or contradictory settings produce safe named-field diagnostics."
    },
    {
      "id": "AC3",
      "requirement": "Its change preview reports each connection, secret-reference and read-bound edit without old/new sensitive values, while preserving existing project, site, actor, repository and retained-state checks."
    },
    {
      "id": "AC4",
      "requirement": "Human and JSON output show the same effective bounds and pending site/cloud-binding, access, visibility, ownership and release checks; live_readiness remains not_evaluated."
    },
    {
      "id": "AC5",
      "requirement": "The checker resolves no secrets, calls no provider and writes no configuration or state; rejected content, cloud IDs and secret-reference values are absent from its new summaries, diagnostics and diff fields."
    },
    {
      "id": "AC6",
      "requirement": "The shipped source/copied guide and example explain preparation, checks, changes and recovery, with synthetic explicit budgets labelled unmeasured and final PGB-82 supported-default acceptance still required."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own the existing local configuration schema, parser/projection, checker/change preview, source/copied regressions and affected user/delivery documentation; one PR, at most20 changed files, less than16 familiar-human hours including normal fixes and PR preparation.",
      "out_of_scope": [
        "Plexus/customer code changes",
        "Jira/provider calls, secret resolution, AWS integration, activation or deployment",
        "Manager policy or receipt-proof changes; PGB-144 trust/producer decisions; new receipt-trust fields",
        "PGB-137 or other parallel unpublished source amendments"
      ],
      "related_repositories": []
    },
    "accepted_decisions": [
      {
        "id": "D04",
        "decision": "Pig Boss is the manager. A stream is Jira site + immutable project ID + full label; equal labels in different projects are independent. One customer installation supports multiple projects. Basic manager health is in release one; worker monitoring and scaling implementation remain follow-ons.",
        "reference": "docs/architecture/pig-boss-operations.md"
      }
    ],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Extend only pigboard-config/v1 with optional closed jira.connection and jira.read_bounds: both absent preserves offline use, otherwise both are complete; existing whole-section inheritance and pure resolved_scope stay unchanged."
      },
      {
        "id": "TAC2",
        "requirement": "Connection supports only credential_kind atlassian_scoped_service_account_token, a canonical lowercase UUID cloud_id and opaque printable-ASCII secret_reference; derive only https://api.atlassian.com/ex/jira/{cloud_id}, with no arbitrary API origin or credential-value field."
      },
      {
        "id": "TAC3",
        "requirement": "All11 read bounds are positive safe integers with the documented consumer/timer ceilings and six cross-field relations; no implicit defaults, environment overrides, tuning or zero-as-unlimited semantics are added."
      },
      {
        "id": "TAC4",
        "requirement": "Keep offline project capacity1000 within existing parser bounds; more than100 projects remains valid offline but live-incompatible; local validity and expected-site matching do not prove cloud binding, permissions or readiness."
      },
      {
        "id": "TAC5",
        "requirement": "Preserve CLI flags, schema names and exits0/1/2; add a safe live_configuration summary and separate validated in-process read-config projection, never injecting connection settings into the closed policy scope."
      },
      {
        "id": "TAC6",
        "requirement": "Connection/bounds changes cannot be reported unchanged; retain site identity holds, all existing retained-member/unresolved-attempt checks and empty state_actions, emitting only declared changed-field names for new settings."
      },
      {
        "id": "TAC7",
        "requirement": "Reuse the already allowlisted source/copied payload and prepared validator dependencies without provider access or dependency repair; preserve original PGB-82 all5 AC,3 TAC and4 human cases and every dated publication hash while adding this prerequisite through verified publication."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Exact Pigboard PR revision with Node20+ and already prepared root validator dependencies; actual copied work-validator payload in a disposable local installation; unrelated working directory; no deployed customer target or live account.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "Finite dummy local configuration packet H01-H04 with literal expected result fields, recorded hashes, commands, no-effects guard and a separate disposable damaged-runtime copy; no live credentials.",
        "initial_state": "Fresh files per variant; only the explicit previous/next pairs share inputs. Legacy two-project mappings come from the unchanged existing fixture.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "At the exact PR revision, prepare every finite variant below, its literal expected fields/exits and exact source/copied commands; include a test-owned zero-effect guard and a real copied validator dependency closure without network install or source symlinks.",
        "used_by": [
          "DATA-01",
          "R1-31-H01",
          "R1-31-H02",
          "R1-31-H03",
          "R1-31-H04"
        ],
        "preserves": [
          "All specified inputs, ordering, outcomes, evidence and cleanup; old offline fixtures and original final82 cases stay unchanged.",
          "Synthetic budgets do not become supported defaults or runtime enforcement evidence.",
          "No tests or provider calls during plan drafting; human acceptance remains NOT_RUN until a human executes this packet."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "QA skills: []. These local CLI/library contracts are outside the currently approved automated QA skill execution types. Human reviewers run the four prescribed groups; developer regressions, independent review and hosted CI remain separate.",
      "cases": [
        {
          "id": "R1-31-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC4",
            "AC6",
            "TAC1",
            "TAC4",
            "TAC5"
          ],
          "prerequisites": [
            "Exact PR revision and PREP-01/DATA-01 available; Node20+ and prepared source/copied validator dependencies; no credentials, Postman or live account required.",
            "For every listed variant run node scripts/check-config.mjs --input FILE --json and the same command without --json; use --previous BEFORE for pairs. Repeat with the actual copied work-validator/scripts/check-config.mjs from an unrelated cwd.",
            "Five fixed inputs: legacy two-project offline config; complete two-project synthetic profile; complete profile with distinct project-specific mappings/equal full labels; legacy101-project config; complete101-project config. All fit the1MiB bound."
          ],
          "steps": [
            "Run each input in both output modes through source and copied commands; add --label AI-Daniel-1 for the distinct-mapping input.",
            "Run a prepared in-process projection check without printing its connection: confirm missing settings return null; valid settings return independent copies with exact sorted project_ids and fixed derived gateway; mutating the projection leaves input unchanged; complete101-project projection throws LIVE_SCOPE_LIMIT.",
            "Compare the legacy and complete configurations' resolved_scope and stream identity fields, and inspect live status/effective bounds/pending checks."
          ],
          "expected": [
            "All five local checks exit0 with valid:true and live_readiness:not_evaluated. Legacy two-project input reports missing_settings and null effective_bounds; complete two-project inputs report complete with all11 explicit values; both101-project inputs report incompatible_scope with LIVE_SCOPE_LIMIT at /projects.",
            "Legacy101-project input also lists both required settings with null effective_bounds and remains valid offline; complete101-project operational projection is rejected, never truncated.",
            "Pure scope/mappings and full-label identities remain unchanged; equal labels in distinct immutable projects remain distinct. No reference/cloud ID is printed in the live summary; every listed future check remains pending."
          ],
          "evidence": [
            "Record tested revision, source/copied payload identity, exact commands, stdout/stderr and exit codes, literal expected-field comparison, fixture before/after hashes and zero-effect counter.",
            "Keep output canary checks and all failed/partial results; developer tests do not stand in for human acceptance."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence, then remove only disposable packet/build/damaged-copy files. Preserve the working prepared installation and all original source/configuration files; no live records or resources change."
            ]
          }
        },
        {
          "id": "R1-31-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC5",
            "TAC1",
            "TAC2",
            "TAC3",
            "TAC4"
          ],
          "prerequisites": [
            "Exact PR revision and PREP-01/DATA-01 available; Node20+ and prepared source/copied validator dependencies; no credentials, Postman or live account required.",
            "For every listed variant run node scripts/check-config.mjs --input FILE --json and the same command without --json; use --previous BEFORE for pairs. Repeat with the actual copied work-validator/scripts/check-config.mjs from an unrelated cwd.",
            "Use the complete passing profile as control. Prepare exactly: connection-only; bounds-only; each of3 connection fields absent; each of11 bound fields absent; unsupported credential kind; uppercase/invalid cloud UUID; blank/space/control-character reference; extra token field; extra api_origin field; site with userinfo/path/query/fragment (four variants); expected-site mismatch.",
            "For each of11 bounds independently prepare0,-1,1.5 and one-above-ceiling. Also prepare raw nonfinite numeric JSON. Prepare six isolated relation failures: Epics>known issues, pages>requests, response bytes>total bytes, request timeout>scan timeout, page size>known issues and page size>comments; other fields remain valid.",
            "Prepare independent positive boundary controls at each of11 ceilings with compatible companion values; keep project count2. Use dummy canaries in rejected values and secret_reference."
          ],
          "steps": [
            "Run all finite variants once with source and copied commands under the prepared no-effects guard; inspect the safe named-field result and exit status.",
            "For expected-site mismatch add --expected-site with the independently prepared different valid origin. Run the passing base control again after the negative variants.",
            "Search human/JSON/stderr outputs for the dummy reference, cloud ID in new summaries, rejected value canaries and unknown-field canaries."
          ],
          "expected": [
            "Negative variants exit1 with valid:false, null digest/resolved_scope/live_configuration, no preview and static schema-known diagnostics. Unsupported/numeric/parser failures are classified by their rejecting layer; no raw parser/Ajv text or rejected values escape.",
            "Every positive boundary control remains locally valid and exit0; it proves only accepted structure, not throughput, access or supported capacity. The unchanged passing control still succeeds.",
            "Expected-site mismatch retains destination_authority:mismatch and EXPECTED_SITE; no secret resolution, provider request, child execution or file mutation occurs."
          ],
          "evidence": [
            "Record tested revision, source/copied payload identity, exact commands, stdout/stderr and exit codes, literal expected-field comparison, fixture before/after hashes and zero-effect counter.",
            "Keep output canary checks and all failed/partial results; developer tests do not stand in for human acceptance."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence, then remove only disposable packet/build/damaged-copy files. Preserve the working prepared installation and all original source/configuration files; no live records or resources change."
            ]
          }
        },
        {
          "id": "R1-31-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "AC5",
            "TAC5",
            "TAC6",
            "TAC7"
          ],
          "prerequisites": [
            "Exact PR revision and PREP-01/DATA-01 available; Node20+ and prepared source/copied validator dependencies; no credentials, Postman or live account required.",
            "For every listed variant run node scripts/check-config.mjs --input FILE --json and the same command without --json; use --previous BEFORE for pairs. Repeat with the actual copied work-validator/scripts/check-config.mjs from an unrelated cwd.",
            "Finite previous/next pairs: unchanged profile;2 independent valid connection-field changes (cloud_id and secret_reference; credential_kind is constant and its invalid alternative is H02);11 independent bound changes with valid relations; absent-to-complete and complete-to-absent pair; effective actor change; effective repository change; unused-default change; display-only edit; project removal; site change. All pairs locally valid.",
            "Add two failure pairs: invalid previous/valid next and valid previous/invalid next. Use unique dummy secret_reference values and output canaries."
          ],
          "steps": [
            "Run each pair using --previous in both output modes through source/copied commands.",
            "For the site change also pass --expected-site matching the next site; inspect retained-member, unresolved-attempt and identity checks.",
            "Inspect changed-name arrays and pending checks, compare reference-only digest change, and search all output for new/old references; verify inputs and state_actions."
          ],
          "expected": [
            "Each connection/bound edit is review_required with only exact changed names and declared pending installation checks; add/remove blocks list all their fields. No old/new reference value is disclosed.",
            "Unchanged and unused-default-only effective settings remain unchanged; effective actors/repositories preserve existing mapping checks; display/project changes preserve their existing distinct outcomes.",
            "Site change remains identity_change_held with valid:true and exit1, even with matched_expected_site. Other valid review-required pairs exit0. No state action is emitted.",
            "Either invalid input yields exit1 with preview/digest/resolved_scope/live_configuration null; previous diagnostics alone carry /previous. No valid-next live summary leaks from a failed comparison."
          ],
          "evidence": [
            "Record tested revision, source/copied payload identity, exact commands, stdout/stderr and exit codes, literal expected-field comparison, fixture before/after hashes and zero-effect counter.",
            "Keep output canary checks and all failed/partial results; developer tests do not stand in for human acceptance."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence, then remove only disposable packet/build/damaged-copy files. Preserve the working prepared installation and all original source/configuration files; no live records or resources change."
            ]
          }
        },
        {
          "id": "R1-31-H04",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC4",
            "AC5",
            "AC6",
            "TAC2",
            "TAC5",
            "TAC7"
          ],
          "prerequisites": [
            "Exact PR revision and PREP-01/DATA-01 available; Node20+ and prepared source/copied validator dependencies; no credentials, Postman or live account required.",
            "For every listed variant run node scripts/check-config.mjs --input FILE --json and the same command without --json; use --previous BEFORE for pairs. Repeat with the actual copied work-validator/scripts/check-config.mjs from an unrelated cwd.",
            "The shipped guide/example, source and actual copied runtime, unrelated cwd, disposable damaged copy with one config module missing, and no-effects guard. Retain a working release for recovery."
          ],
          "steps": [
            "Follow the documented source/copied examples and --help/--help --json without hidden setup or credentials; inspect the synthetic-budget warning, pending access checks and exit meanings.",
            "Run complete and legacy checks, a changed-reference pair and an invalid-pair check under the no-effects guard for source and copied entrypoints; inspect attempted-effect count before/after and unchanged file hashes.",
            "Run the copied script from unrelated cwd with NODE_PATH unset; confirm modules/dependencies are physical copied files and no source symlink/fallback is used.",
            "Run the damaged copy; inspect sanitized SETUP/exit2 with null live summary and no automatic repair. Rerun the untouched working release to show recovery without repeating installation.",
            "Inspect all outputs for dummy credential/reference/rejected-content canaries and confirm docs do not claim provider access, operational readiness or supported defaults."
          ],
          "expected": [
            "Source/copied commands expose equivalent local statuses and bounds in human/JSON forms, with live_readiness:not_evaluated; every attempted network/process/file-write counter is0.",
            "The real copied payload executes from unrelated cwd using prepared copied dependencies. Damaged setup fails honestly without fallback or dependency fetch; the working release still succeeds.",
            "Help/guide provide prerequisites, exact commands, successful local result, upgrade ordering and common recovery. Synthetic values remain unmeasured, and final82 runtime/default/human acceptance remains pending."
          ],
          "evidence": [
            "Record tested revision, source/copied payload identity, exact commands, stdout/stderr and exit codes, literal expected-field comparison, fixture before/after hashes and zero-effect counter.",
            "Keep output canary checks and all failed/partial results; developer tests do not stand in for human acceptance."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence, then remove only disposable packet/build/damaged-copy files. Preserve the working prepared installation and all original source/configuration files; no live records or resources change."
            ]
          }
        }
      ]
    },
    "automated_regression": "Meaningful configuration/checker/diff and actual copied-runtime integration regressions cover the four local groups, including legacy compatibility, safe diagnostics, zero effects and immutable source-publication history; run affected suites and required npm test without provider calls."
  },
  "open_questions": []
}
```

## R1-36: Inspect named Jira issues from source

### Problem to solve

An authorized source caller cannot obtain bounded native issue and comment observations through Pigboard’s supported library. It needs useful partial results and safe failure information without running a manager or installing a copied delivery bundle.

### Acceptance Criteria

- **AC1.** A caller can inspect named immutable issue IDs, assignment pointers, all comment pages and supplied exact comment targets through the source library.
- **AC2.** Partial, denied, changed or bounded reads retain valid observations and explain missing information without claiming absence or completeness.
- **AC3.** Invalid inputs invoke no credential resolver, and all actual requests obey the fixed HTTPS destination, TLS checks and finite count/byte/time bounds.
- **AC4.** Safe reports exclude secrets and bodies, expose cancellation limits honestly, and never claim whole-domain completeness, receipt proof or admission.
- **AC5.** The documented source API and finite source fixture packet work with prepared dependencies, including source-root damage recovery and preservation evidence.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Complete source inspection API, source fixtures, guide and publication support. The installed consumer remains PGB-147.
- **TAC1.** Repository danielchappell/Pigboard, base main; own the complete source inspection API, source verification/docs and publication support in one18-path PR.
- **TAC2.** Preserve inspectJiraIssues(configInput, request, {resolveSecret}) and PGB-145’s canonical configuration; no production transport hook, live CLI, arbitrary URL, extra credential source or environment bypass.
- **TAC3.** Preserve native IDs/server metadata, endpoint-specific pagination and all literal observation, trace, status, limit, canary, private-data and cancellation assertions in the35-variant packet, eight controls and L06 private subvariant; generic404 or visibility limits never prove absence.
- **TAC4.** Keep runnable fixture CLI and installation publication outside this slice; count all attempted requests/bytes, bound private observations, cancel owned I/O, fence late resolver values, hash the complete source/input/server data and close fixture resources without scheduling or receipt proof.

### Testing Strategy

- **QA skills:** `[]`. Four prescribed groups belong to designated humans; developer tests and CI are separate.
- **Access:** Reviewed source and prepared lock-matching Node dependencies with dummy local HTTPS data. No live Jira or provider probe.
- **Fixture selectors:** R1-36-H01–H04 map to the existing R1-33-H01–H04 machine selectors; 35 variants, eight controls and L06 private projection are unchanged.

#### R1-36-H01

- **Requirements:** AC1, AC2, AC4, TAC2, TAC3.
- **Actions:** Import runFixture and fixtureCases from the explicit reviewed source root’s test/fixtures/jira-preview-harness.mjs; select the listed variants with stable fixture selector R1-33-H01, then await runFixture(v.case, v.variant, SOURCE_ROOT) for each. PREP-01 supplies the exact module example and absolute root; the source fixture has no direct-entry CLI. For each selected variant with control, await runFixture(v.case, v.variant, SOURCE_ROOT, {control:true}); for L06 also await runFixture(v.case, v.variant, SOURCE_ROOT, {privateProjection:true}). Use only the existing eight controls and one private subvariant. Compare the returned safe report, private-acquisition oracle and permitted request audit with the literal expectations; inspect counters, bytes, elapsed time, cleanup and the actual late-delivery acknowledgment where prescribed. Inspect zero-effects/cancellation and source/input/server before-and-after hashes, record the source revision, exact module invocation and returned structured results, then retain evidence and close/remove only disposable fixture resources.
- **Expected:** complete: two issues, one present pointer each, two comment pages plus one named exact target, literal IDs/metadata and requested complete/domain false. empty-comments: explicit zero-total page, present pointer. renamed-key: same ID/current key. unknown-pointer: pointer404 yields incomplete/POINTER_UNKNOWN, never null. exact-mismatch: changed exact body/metadata yields CHANGED_INPUT. Every library inspection report has inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain. Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.
- **Evidence:** Tested source PR revision, source/dependency identity, fixture hashes and exact programmatic source invocation; no installed-runtime claim. Programmatic invocation transcript, process exit code, safe returned report and independently authored literal report/private-acquisition comparison. Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes. Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- **Cleanup:** Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies. Remove only disposable fixture/build directories and damaged source-derived copies; preserve the reviewed source and retained evidence. Do not change live records or repair/fetch dependencies.


#### R1-36-H02

- **Requirements:** AC2, AC3, AC4, TAC2, TAC3, TAC4.
- **Actions:** Import runFixture and fixtureCases from the explicit reviewed source root’s test/fixtures/jira-preview-harness.mjs; select the listed variants with stable fixture selector R1-33-H02, then await runFixture(v.case, v.variant, SOURCE_ROOT) for each. PREP-01 supplies the exact module example and absolute root; the source fixture has no direct-entry CLI. For each selected variant with control, await runFixture(v.case, v.variant, SOURCE_ROOT, {control:true}); for L06 also await runFixture(v.case, v.variant, SOURCE_ROOT, {privateProjection:true}). Use only the existing eight controls and one private subvariant. Compare the returned safe report, private-acquisition oracle and permitted request audit with the literal expectations; inspect counters, bytes, elapsed time, cleanup and the actual late-delivery acknowledgment where prescribed. Inspect zero-effects/cancellation and source/input/server before-and-after hashes, record the source revision, exact module invocation and returned structured results, then retain evidence and close/remove only disposable fixture resources.
- **Expected:** missing-page, changed-total, duplicate-comment, zero-progress, issue403, issue404, rate429, header-timeout, body-timeout, resolver-reject, resolver-abort, resolver-late: each has a literal stop point/code; no retry, swallowed secret, false absence or post-return B-owned read. Late resolver case expects cancel_unconfirmed and discards the late dummy token; fixture itself acknowledges/stops its own I/O during cleanup. Every library inspection report has inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain. Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign. resolver-late delivers its dummy token once after the bounded source call returns, acknowledges settlement under active guards and drains one event-loop checkpoint; zero before/after Jira calls, aborted signal and unchanged at-return cancel_unconfirmed report. No larger deadline or timed sleep.
- **Evidence:** Tested source PR revision, source/dependency identity, fixture hashes and exact programmatic source invocation; no installed-runtime claim. Programmatic invocation transcript, process exit code, safe returned report and independently authored literal report/private-acquisition comparison. Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes. Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- **Cleanup:** Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies. Remove only disposable fixture/build directories and damaged source-derived copies; preserve the reviewed source and retained evidence. Do not change live records or repair/fetch dependencies.


#### R1-36-H03

- **Requirements:** AC3, AC4, TAC2, TAC3, TAC4.
- **Actions:** Import runFixture and fixtureCases from the explicit reviewed source root’s test/fixtures/jira-preview-harness.mjs; select the listed variants with stable fixture selector R1-33-H03, then await runFixture(v.case, v.variant, SOURCE_ROOT) for each. PREP-01 supplies the exact module example and absolute root; the source fixture has no direct-entry CLI. For each selected variant with control, await runFixture(v.case, v.variant, SOURCE_ROOT, {control:true}); for L06 also await runFixture(v.case, v.variant, SOURCE_ROOT, {privateProjection:true}). Use only the existing eight controls and one private subvariant. Compare the returned safe report, private-acquisition oracle and permitted request audit with the literal expectations; inspect counters, bytes, elapsed time, cleanup and the actual late-delivery acknowledgment where prescribed. Inspect zero-effects/cancellation and source/input/server before-and-after hashes, record the source revision, exact module invocation and returned structured results, then retain evidence and close/remove only disposable fixture resources.
- **Expected:** invalid-origin, invalid-request, out-of-scope-issue, redirect, untrusted-ca, wrong-host, error-canary, compressed-response. Invalid setup invokes no resolver; rejected scope has no follow-up body/comment reads; redirect target receives no credentials/request; TLS failures occur; reports exclude every body/token/reference/error canary. L01 known-limit: two supplied issues, max_known_issues1 then2. B1 rejects pre-resolver at1; at2 continues. L02 comment-limit: two ordinary comments, max_comments1 then2. B1 incomplete before retaining excess; at2 complete. L03 page-limit: two comment pages, max_pages1 then2. B1 stops before requesting second at1. L04 request-limit: a literal four-request single-issue script, max_requests3 then4, max_pages1. B1 stops before fourth at3; at4 completes. L05 response-byte-limit: one identity-encoded body with literal byte lengthN, capN−1 thenN. B1 aborts at excess; no raw/error disclosure. L06 total-byte-limit: preserve the reviewed literal753-byte main/754-byte positive control and650-byte private-projection bound. Main receives754wire bytes in three attempts, completes two and fails one, retains635observation bytes; control completes three and retains745bytes. Private subvariant omits the256-space prefix, receives498wire bytes, completes three requests and rejects the745-byte projection while retaining635bytes. Keep all cross-field relations and independent literal traces. L07 request-time-limit: fixture withholds headers/body past fixed request deadline; paired immediate response. B1 cancels actual socket, no later B-owned work. Deadline is not increased to force a pass. L08 scan-time-limit: resolver plus two individually timely responses exceed total deadline; paired immediate sequence. B1 total includes resolution, parsing and cleanup; result incomplete even if last parse otherwise succeeds. Each budget-hit input changes only the named budget to one below its independently known demand while preserving A’s cross-field relations; run its paired positive-at-limit control. Expected demand and call counts are literal fixture facts prepared before execution. Do not raise bounds after observing failure. Every library inspection report has inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain. Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign. comment-limit and page-limit main reports retain exact_comments_read not_requested because the phase was not reached; their existing positive controls remain complete. Do not change any request, partial observation, trace or limit to satisfy an oracle.
- **Evidence:** Tested source PR revision, source/dependency identity, fixture hashes and exact programmatic source invocation; no installed-runtime claim. Programmatic invocation transcript, process exit code, safe returned report and independently authored literal report/private-acquisition comparison. Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes. Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- **Cleanup:** Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies. Remove only disposable fixture/build directories and damaged source-derived copies; preserve the reviewed source and retained evidence. Do not change live records or repair/fetch dependencies.


#### R1-36-H04

- **Requirements:** AC4, AC5, TAC1, TAC4.
- **Actions:** Import runFixture and fixtureCases from the explicit reviewed source root’s test/fixtures/jira-preview-harness.mjs; select the listed variants with stable fixture selector R1-33-H04, then await runFixture(v.case, v.variant, SOURCE_ROOT) for each. PREP-01 supplies the exact module example and absolute root; the source fixture has no direct-entry CLI. For each selected variant with control, await runFixture(v.case, v.variant, SOURCE_ROOT, {control:true}); for L06 also await runFixture(v.case, v.variant, SOURCE_ROOT, {privateProjection:true}). Use only the existing eight controls and one private subvariant. Compare the returned safe report, private-acquisition oracle and permitted request audit with the literal expectations; inspect counters, bytes, elapsed time, cleanup and the actual late-delivery acknowledgment where prescribed. Inspect zero-effects/cancellation and source/input/server before-and-after hashes, record the source revision, exact module invocation and returned structured results, then retain evidence and close/remove only disposable fixture resources.
- **Expected:** guide-and-install (stable fixture name): the source API guide example returns the literal complete observation; no runnable CLI, human/JSON parity or installed acceptance is claimed. damaged-copy: prepare the complete source-derived payload/dependency closure in a disposable root, delete only lib/config/projects.mjs, then expect setup_failed/SETUP_MISSING with no resolver or Jira request and no source fallback/fetch/repair. Every library inspection report has inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain. Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.
- **Evidence:** Tested source PR revision, source/dependency identity, fixture hashes and exact programmatic source invocation; no installed-runtime claim. Programmatic invocation transcript, process exit code, safe returned report and independently authored literal report/private-acquisition comparison. Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes. Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- **Cleanup:** Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies. Remove only disposable fixture/build directories and damaged source-derived copies; preserve the reviewed source and retained evidence. Do not change live records or repair/fetch dependencies.

- **Automated regression:** Source reader and imported fixture checks cover the complete literal packet, security limits, preservation and missing-module recovery.

### Structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "An authorized source caller cannot obtain bounded native issue and comment observations through Pigboard’s supported library. It needs useful partial results and safe failure information without running a manager or installing a copied delivery bundle.",
  "prerequisites": [
    {
      "ticket": "R1-31",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "A caller can inspect named immutable issue IDs, assignment pointers, all comment pages and supplied exact comment targets through the source library."
    },
    {
      "id": "AC2",
      "requirement": "Partial, denied, changed or bounded reads retain valid observations and explain missing information without claiming absence or completeness."
    },
    {
      "id": "AC3",
      "requirement": "Invalid inputs invoke no credential resolver, and all actual requests obey the fixed HTTPS destination, TLS checks and finite count/byte/time bounds."
    },
    {
      "id": "AC4",
      "requirement": "Safe reports exclude secrets and bodies, expose cancellation limits honestly, and never claim whole-domain completeness, receipt proof or admission."
    },
    {
      "id": "AC5",
      "requirement": "The documented source API and finite source fixture packet work with prepared dependencies, including source-root damage recovery and preservation evidence."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own the complete source lib/jira/read.mjs API, importable fixture API, source verification, documentation and publication support in the reviewed18-path plan; the runnable fixture CLI and installed distribution remain PGB-147.",
      "out_of_scope": [
        "Plexus/customer repository changes, AWS resolver/wrapper, State adapter and operational-state writes.",
        "Receipt acceptance, policy selection/admission, external PR/evidence fetching, a new input producer or a PGB-144 proof-policy decision.",
        "Production live CLI, provider probes, deployment, activation, worker monitoring, Cursor deduplication, automatic recovery and new QA engines.",
        "Runnable fixture CLI, human/JSON CLI parity and installed named-issue inspection; PGB-147 owns that completion."
      ],
      "related_repositories": []
    },
    "accepted_decisions": [],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Repository danielchappell/Pigboard, base main; own the complete source inspection API, source verification/docs and publication support in one18-path PR."
      },
      {
        "id": "TAC2",
        "requirement": "Preserve inspectJiraIssues(configInput, request, {resolveSecret}) and PGB-145’s canonical configuration; no production transport hook, live CLI, arbitrary URL, extra credential source or environment bypass."
      },
      {
        "id": "TAC3",
        "requirement": "Preserve native IDs/server metadata, endpoint-specific pagination and all literal observation, trace, status, limit, canary, private-data and cancellation assertions in the35-variant packet, eight controls and L06 private subvariant; generic404 or visibility limits never prove absence."
      },
      {
        "id": "TAC4",
        "requirement": "Keep runnable fixture CLI and installation publication outside this slice; count all attempted requests/bytes, bound private observations, cancel owned I/O, fence late resolver values, hash the complete source/input/server data and close fixture resources without scheduling or receipt proof."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Reviewed Pigboard source checkout with prepared dependencies and disposable local HTTPS fixtures; no installed inspection claim or deployed customer target.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "Prescribed source inspection packet for the four source human groups, with the existing35 variants, eight controls and L06 private subvariant.",
        "initial_state": "Fresh per variant; only explicitly paired controls share their stated sequence. Provider responses are scripted and credentials are dummy.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "PR-bound importable source runFixture API, independently authored literal reports/acquisition and permitted traces, exact executable source API examples and prepared absolute source path for every listed variant; no expected answer comes from the production collector.",
        "used_by": [
          "DATA-01",
          "R1-36-H01",
          "R1-36-H02",
          "R1-36-H03",
          "R1-36-H04"
        ],
        "preserves": [
          "All reviewed source acceptance criteria, technical constraints,35 finite variants, eight controls, L06 private subvariant, inputs, limits, order, expected outcomes, evidence and cleanup.",
          "Verified TLS, fixed transport, secret/canary safety, all budgets and source/input/server preservation; no provider data, new cases, raised bounds or changed literal expectations.",
          "Source inspection is immediately usable through inspectJiraIssues and importable runFixture; the dedicated CLI and installed completion remain PGB-147.",
          "All original PGB-147 fiveAC/fourTAC/fourhuman groups and source/copied obligations remain on147; all original PGB-82 fiveAC/threeTAC/fourhuman groups remain on final82."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns source library and fixture API contracts, which the currently approved automated QA skills do not execute. QA skills are []; designated human reviewers run these cases. Developer regressions, CI and independent PR review remain separate.",
      "cases": [
        {
          "id": "R1-36-H01",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC4",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "PREP-01 supplies the reviewed source fixture packet DATA-01, executable importable API example, literal expected report/private observations and maximum permitted traces before execution; do not derive answers from the collector.",
            "Prepared Node22.17.0 and lock-matching source dependencies, reviewed source checkout and fresh disposable data per variant; dummy token/reference and fixed local HTTPS servers. No live Jira, AWS, Postman, UI, installed runtime or dependency fetch/repair is needed.",
            "Run exactly these named variants: complete, empty-comments, renamed-key, unknown-pointer, exact-mismatch. Each uses fresh state except its explicitly paired controls.",
            "The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports."
          ],
          "steps": [
            "Import runFixture and fixtureCases from the explicit reviewed source root’s test/fixtures/jira-preview-harness.mjs; select the listed variants with stable fixture selector R1-33-H01, then await runFixture(v.case, v.variant, SOURCE_ROOT) for each. PREP-01 supplies the exact module example and absolute root; the source fixture has no direct-entry CLI.",
            "For each selected variant with control, await runFixture(v.case, v.variant, SOURCE_ROOT, {control:true}); for L06 also await runFixture(v.case, v.variant, SOURCE_ROOT, {privateProjection:true}). Use only the existing eight controls and one private subvariant.",
            "Compare the returned safe report, private-acquisition oracle and permitted request audit with the literal expectations; inspect counters, bytes, elapsed time, cleanup and the actual late-delivery acknowledgment where prescribed.",
            "Inspect zero-effects/cancellation and source/input/server before-and-after hashes, record the source revision, exact module invocation and returned structured results, then retain evidence and close/remove only disposable fixture resources."
          ],
          "expected": [
            "complete: two issues, one present pointer each, two comment pages plus one named exact target, literal IDs/metadata and requested complete/domain false. empty-comments: explicit zero-total page, present pointer. renamed-key: same ID/current key. unknown-pointer: pointer404 yields incomplete/POINTER_UNKNOWN, never null. exact-mismatch: changed exact body/metadata yields CHANGED_INPUT.",
            "Every library inspection report has inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.",
            "Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign."
          ],
          "evidence": [
            "Tested source PR revision, source/dependency identity, fixture hashes and exact programmatic source invocation; no installed-runtime claim.",
            "Programmatic invocation transcript, process exit code, safe returned report and independently authored literal report/private-acquisition comparison.",
            "Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.",
            "Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.",
              "Remove only disposable fixture/build directories and damaged source-derived copies; preserve the reviewed source and retained evidence. Do not change live records or repair/fetch dependencies."
            ]
          }
        },
        {
          "id": "R1-36-H02",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "AC4",
            "TAC2",
            "TAC3",
            "TAC4"
          ],
          "prerequisites": [
            "PREP-01 supplies the reviewed source fixture packet DATA-01, executable importable API example, literal expected report/private observations and maximum permitted traces before execution; do not derive answers from the collector.",
            "Prepared Node22.17.0 and lock-matching source dependencies, reviewed source checkout and fresh disposable data per variant; dummy token/reference and fixed local HTTPS servers. No live Jira, AWS, Postman, UI, installed runtime or dependency fetch/repair is needed.",
            "Run exactly these named variants: missing-page, changed-total, duplicate-comment, zero-progress, issue403, issue404, rate429, header-timeout, body-timeout, resolver-reject, resolver-abort, resolver-late. Each uses fresh state except its explicitly paired controls.",
            "The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports."
          ],
          "steps": [
            "Import runFixture and fixtureCases from the explicit reviewed source root’s test/fixtures/jira-preview-harness.mjs; select the listed variants with stable fixture selector R1-33-H02, then await runFixture(v.case, v.variant, SOURCE_ROOT) for each. PREP-01 supplies the exact module example and absolute root; the source fixture has no direct-entry CLI.",
            "For each selected variant with control, await runFixture(v.case, v.variant, SOURCE_ROOT, {control:true}); for L06 also await runFixture(v.case, v.variant, SOURCE_ROOT, {privateProjection:true}). Use only the existing eight controls and one private subvariant.",
            "Compare the returned safe report, private-acquisition oracle and permitted request audit with the literal expectations; inspect counters, bytes, elapsed time, cleanup and the actual late-delivery acknowledgment where prescribed.",
            "Inspect zero-effects/cancellation and source/input/server before-and-after hashes, record the source revision, exact module invocation and returned structured results, then retain evidence and close/remove only disposable fixture resources."
          ],
          "expected": [
            "missing-page, changed-total, duplicate-comment, zero-progress, issue403, issue404, rate429, header-timeout, body-timeout, resolver-reject, resolver-abort, resolver-late: each has a literal stop point/code; no retry, swallowed secret, false absence or post-return B-owned read. Late resolver case expects cancel_unconfirmed and discards the late dummy token; fixture itself acknowledges/stops its own I/O during cleanup.",
            "Every library inspection report has inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.",
            "Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.",
            "resolver-late delivers its dummy token once after the bounded source call returns, acknowledges settlement under active guards and drains one event-loop checkpoint; zero before/after Jira calls, aborted signal and unchanged at-return cancel_unconfirmed report. No larger deadline or timed sleep."
          ],
          "evidence": [
            "Tested source PR revision, source/dependency identity, fixture hashes and exact programmatic source invocation; no installed-runtime claim.",
            "Programmatic invocation transcript, process exit code, safe returned report and independently authored literal report/private-acquisition comparison.",
            "Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.",
            "Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.",
              "Remove only disposable fixture/build directories and damaged source-derived copies; preserve the reviewed source and retained evidence. Do not change live records or repair/fetch dependencies."
            ]
          }
        },
        {
          "id": "R1-36-H03",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC3",
            "AC4",
            "TAC2",
            "TAC3",
            "TAC4"
          ],
          "prerequisites": [
            "PREP-01 supplies the reviewed source fixture packet DATA-01, executable importable API example, literal expected report/private observations and maximum permitted traces before execution; do not derive answers from the collector.",
            "Prepared Node22.17.0 and lock-matching source dependencies, reviewed source checkout and fresh disposable data per variant; dummy token/reference and fixed local HTTPS servers. No live Jira, AWS, Postman, UI, installed runtime or dependency fetch/repair is needed.",
            "Run exactly these named variants: invalid-origin, invalid-request, out-of-scope-issue, redirect, untrusted-ca, wrong-host, error-canary, compressed-response, known-limit, comment-limit, page-limit, request-limit, response-byte-limit, total-byte-limit, request-time-limit, scan-time-limit. Each uses fresh state except its explicitly paired controls.",
            "The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports."
          ],
          "steps": [
            "Import runFixture and fixtureCases from the explicit reviewed source root’s test/fixtures/jira-preview-harness.mjs; select the listed variants with stable fixture selector R1-33-H03, then await runFixture(v.case, v.variant, SOURCE_ROOT) for each. PREP-01 supplies the exact module example and absolute root; the source fixture has no direct-entry CLI.",
            "For each selected variant with control, await runFixture(v.case, v.variant, SOURCE_ROOT, {control:true}); for L06 also await runFixture(v.case, v.variant, SOURCE_ROOT, {privateProjection:true}). Use only the existing eight controls and one private subvariant.",
            "Compare the returned safe report, private-acquisition oracle and permitted request audit with the literal expectations; inspect counters, bytes, elapsed time, cleanup and the actual late-delivery acknowledgment where prescribed.",
            "Inspect zero-effects/cancellation and source/input/server before-and-after hashes, record the source revision, exact module invocation and returned structured results, then retain evidence and close/remove only disposable fixture resources."
          ],
          "expected": [
            "invalid-origin, invalid-request, out-of-scope-issue, redirect, untrusted-ca, wrong-host, error-canary, compressed-response. Invalid setup invokes no resolver; rejected scope has no follow-up body/comment reads; redirect target receives no credentials/request; TLS failures occur; reports exclude every body/token/reference/error canary.",
            "L01 known-limit: two supplied issues, max_known_issues1 then2. B1 rejects pre-resolver at1; at2 continues.",
            "L02 comment-limit: two ordinary comments, max_comments1 then2. B1 incomplete before retaining excess; at2 complete.",
            "L03 page-limit: two comment pages, max_pages1 then2. B1 stops before requesting second at1.",
            "L04 request-limit: a literal four-request single-issue script, max_requests3 then4, max_pages1. B1 stops before fourth at3; at4 completes.",
            "L05 response-byte-limit: one identity-encoded body with literal byte lengthN, capN−1 thenN. B1 aborts at excess; no raw/error disclosure.",
            "L06 total-byte-limit: preserve the reviewed literal753-byte main/754-byte positive control and650-byte private-projection bound. Main receives754wire bytes in three attempts, completes two and fails one, retains635observation bytes; control completes three and retains745bytes. Private subvariant omits the256-space prefix, receives498wire bytes, completes three requests and rejects the745-byte projection while retaining635bytes. Keep all cross-field relations and independent literal traces.",
            "L07 request-time-limit: fixture withholds headers/body past fixed request deadline; paired immediate response. B1 cancels actual socket, no later B-owned work. Deadline is not increased to force a pass.",
            "L08 scan-time-limit: resolver plus two individually timely responses exceed total deadline; paired immediate sequence. B1 total includes resolution, parsing and cleanup; result incomplete even if last parse otherwise succeeds.",
            "Each budget-hit input changes only the named budget to one below its independently known demand while preserving A’s cross-field relations; run its paired positive-at-limit control. Expected demand and call counts are literal fixture facts prepared before execution. Do not raise bounds after observing failure.",
            "Every library inspection report has inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.",
            "Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.",
            "comment-limit and page-limit main reports retain exact_comments_read not_requested because the phase was not reached; their existing positive controls remain complete. Do not change any request, partial observation, trace or limit to satisfy an oracle."
          ],
          "evidence": [
            "Tested source PR revision, source/dependency identity, fixture hashes and exact programmatic source invocation; no installed-runtime claim.",
            "Programmatic invocation transcript, process exit code, safe returned report and independently authored literal report/private-acquisition comparison.",
            "Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.",
            "Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.",
              "Remove only disposable fixture/build directories and damaged source-derived copies; preserve the reviewed source and retained evidence. Do not change live records or repair/fetch dependencies."
            ]
          }
        },
        {
          "id": "R1-36-H04",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC4",
            "AC5",
            "TAC1",
            "TAC4"
          ],
          "prerequisites": [
            "PREP-01 supplies the reviewed source fixture packet DATA-01, executable importable API example, literal expected report/private observations and maximum permitted traces before execution; do not derive answers from the collector.",
            "Prepared Node22.17.0 and lock-matching source dependencies, reviewed source checkout and fresh disposable data per variant; dummy token/reference and fixed local HTTPS servers. No live Jira, AWS, Postman, UI, installed runtime or dependency fetch/repair is needed.",
            "Run exactly these named variants: guide-and-install, damaged-copy. Each uses fresh state except its explicitly paired controls.",
            "The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports."
          ],
          "steps": [
            "Import runFixture and fixtureCases from the explicit reviewed source root’s test/fixtures/jira-preview-harness.mjs; select the listed variants with stable fixture selector R1-33-H04, then await runFixture(v.case, v.variant, SOURCE_ROOT) for each. PREP-01 supplies the exact module example and absolute root; the source fixture has no direct-entry CLI.",
            "For each selected variant with control, await runFixture(v.case, v.variant, SOURCE_ROOT, {control:true}); for L06 also await runFixture(v.case, v.variant, SOURCE_ROOT, {privateProjection:true}). Use only the existing eight controls and one private subvariant.",
            "Compare the returned safe report, private-acquisition oracle and permitted request audit with the literal expectations; inspect counters, bytes, elapsed time, cleanup and the actual late-delivery acknowledgment where prescribed.",
            "Inspect zero-effects/cancellation and source/input/server before-and-after hashes, record the source revision, exact module invocation and returned structured results, then retain evidence and close/remove only disposable fixture resources."
          ],
          "expected": [
            "guide-and-install (stable fixture name): the source API guide example returns the literal complete observation; no runnable CLI, human/JSON parity or installed acceptance is claimed. damaged-copy: prepare the complete source-derived payload/dependency closure in a disposable root, delete only lib/config/projects.mjs, then expect setup_failed/SETUP_MISSING with no resolver or Jira request and no source fallback/fetch/repair.",
            "Every library inspection report has inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.",
            "Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign."
          ],
          "evidence": [
            "Tested source PR revision, source/dependency identity, fixture hashes and exact programmatic source invocation; no installed-runtime claim.",
            "Programmatic invocation transcript, process exit code, safe returned report and independently authored literal report/private-acquisition comparison.",
            "Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.",
            "Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.",
              "Remove only disposable fixture/build directories and damaged source-derived copies; preserve the reviewed source and retained evidence. Do not change live records or repair/fetch dependencies."
            ]
          }
        }
      ]
    },
    "automated_regression": "Complete source library/real HTTPS fixture regressions across35 existing variants, eight controls and L06 private subvariant; source-only API guide/closure preservation and both publication-history guards. Installed distribution and runnable CLI verification remain147."
  },
  "open_questions": []
}
```

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


## R1-24: Publish prepared QA evidence safely

### Problem to solve

An authorized QA caller has no separate skill for delivering a complete prepared assessment to Jira. Evidence and pending human tests need a verified handoff even when execution cannot finish.

Prerequisites: R1-04, R1-06, R1-07, PGB-108; required outcome ai_qa_complete.

### Acceptance Criteria

- **AC1.** An authorized caller can use qa-jira directly to check a configured native Story/Bug in QA and publish its complete prepared assessment for the current assignment, review and open PR; other native types are rejected before writes.
- **AC2.** Complete passing AI evidence or explicit human-only work moves to Human Review only after verified publication; human cases remain pending.
- **AC3.** A confirmed in-scope defect or known upstream request queues rework; inability blocks; discussion stays QA without a terminal record.
- **AC4.** Full partial results, findings and pending human IDs survive failure; unknown writes stop without replay, replacement records or competing transitions.
- **AC5.** Installed guidance explains direct invocation, prerequisites, evidence ownership, success and recovery, and makes clear that prescribed dispatch remains a separate pending Story.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own the qa-jira read-only eligibility and canonical publication/transition skill, its installation, tests and guides, and the approved same-scope 24-Story delivery mapping; execute no tests or manager actions.
- **TAC1.** qa-jira is the sole permanent publication/failure contract; use existing canonical records, validators, formatter and direct configured edges, with no new engine, schema, provider adapter or helper transition authority.
- **TAC2.** Verify current configured scope, actors, assignment/review/PR/requirements receipts and complete evidence before publication; append once, verify exact readback and freshness, transition once and verify status; retain full partial results and never replay completed mutations.
- **TAC3.** Human-only static work needs no invented deployment; successful runtime completion or any PASS/FAIL claim requires current trusted environment proof, while a complete all-NOT_RUN non-completing report may describe missing deployment under the corrected shared contract.

### Testing Strategy

- **QA skills:** `[]`; human developer and QA reviewer own every case. No human case is completed by CI or a simulated instruction exercise.
- **Preparation:** {"id":"PREP-01","owner":"implementer","supplies":"Executable local fixtures and exact commands for all human cases below, bound to the PR revision.","used_by":["DATA-01","R1-24-H01","R1-24-H02","R1-24-H03"],"preserves":["All case inputs, order, expected outcomes, evidence and cleanup. No live provider data or changed test expectations."]}

#### R1-24-H01: Follow the installed direct-invocation guide and call preflight, then final, for each native type.

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC5, TAC1, TAC2.
- **Prerequisites/data:** Prepared native Story and Bug assessments with a complete mixed API-child/database/UI ledger, declared observed-value binding, inspectable supplied/mock screenshots, exact human IDs and current valid receipt chains. Same-release installed qa-jira and private disposable fixtures with simulated provider cards and dummy credentials.
- **Steps:**
  1. Follow the installed direct-invocation guide and call preflight, then final, for each native type.
  2. Inspect the full ledger, evidence retrieval, human_pending and ordered tool audit.
  3. Check predecessor validation, append, exact comment readback/chain, freshness, direct transition and independent native-status verification.
  4. Inspect the approved 24-Story mapping, new R1-24 before unchanged R1-08, preserved downstream dependencies and current-versus-historical review statements.
- **Expected:** Every prescribed nested row and pending human ID is retained; only verified current-revision completion reaches Human Review. The caller can use the publisher without a dispatcher; the guide states dispatch remains pending and installation grants no authority or activation. The delivery records retain all existing R1 IDs, 53 product requirements and 41 scenarios; the original three R1-08 human cases remain, and R1-24 adds three publication cases without claiming acceptance.
- **Evidence:** Input/output hashes, exact installed path/revision/command, ordered tool audit, inspected screenshots, typed ledger, receipt chain and delivery-mapping diff.
- **Cleanup:** Human QA reviewer retains evidence then removes disposable local fixtures/build output; do not change live records/resources.

#### R1-24-H02: Call final on each fresh assessment without running helpers.

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC3, AC4, TAC1, TAC2.
- **Prerequisites/data:** Separate coherent prepared defect, known-upstream-wait, inability, earlier-FAIL-plus-later-inability, earlier-FAIL-plus-wait and discussion assessments; upstream requests include their exact typed lineage.
- **Steps:**
  1. Call final on each fresh assessment without running helpers.
  2. Inspect final/partial ledger, findings, unfinished NOT_RUN reasons, exact upstream references and publication/transition audit.
- **Expected:** Confirmed defect and known outstanding wait select Rework Queued; inability selects Blocked while retaining earlier findings and evidence; discussion has no terminal write and stays QA. A rumor cannot become a dependency request, omissions or unresolved finding IDs reject, and human cases never become PASS.
- **Evidence:** Exact prepared and produced records, full receipt chain, selected destination, verified/unknown status, tested revision and exact command.
- **Cleanup:** Human QA reviewer retains evidence then removes disposable local fixtures/build output; do not change live records/resources.

#### R1-24-H03: Call preflight/final for the zero-AI Bug, then each separate invalid or failure variant.

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, AC4, TAC2, TAC3.
- **Prerequisites/data:** Static human-only native Bug with empty AI graph/types, two pending human IDs and a nonempty no-AI reason. Separate Task/Epic, changed source/requirements/stage, missing/stale deployment, untrusted approval, missing receipt page, oversized ledger, definite append failure, unknown append/readback, unknown transition and explicitly authorized resume variants with a known completed mutation.
- **Steps:**
  1. Call preflight/final for the zero-AI Bug, then each separate invalid or failure variant.
  2. For missing deployment, compare a complete all-NOT_RUN blocker with a report claiming PASS/FAIL.
  3. Inspect call audit, retained evidence, receipt resolution, current/unknown status and any resume action.
- **Expected:** Valid static work invokes no helper or environment request, keeps the exact pending human list and reaches Human Review only after verified publication. Invalid native types stop before writes; complete all-NOT_RUN inability may publish a valid blocker, while execution claims without required proof reject. Stale/unknown effects stop without mutation replay, fallback terminal writes or overwriting a changed stage; at most one resolving read follows each uncertain action, and only conclusive success permits the next distinct step. Resume consumes existing explicit valid human authorization and retained case-specific evidence; it never creates authorization, repeats a completed mutation or auto-passes humans.
- **Evidence:** Input/output hashes, ordered tool audit, human handoff, retained evidence/receipt reads, tested revision and exact command.
- **Cleanup:** Human QA reviewer retains evidence then removes disposable local fixtures/build output; do not change live records/resources.

- **Automated regression:** Canonical accepted/rejected publication records, full partial ledgers, human-only handoff, uncertain-write handling and source/installed skill-validator-formatter parity; no prose-only claim of runtime behavior.

## R1-30: Prepare mixed QA inputs and two boundary controls

### Problem to solve

Developers and QA reviewers need a complete mixed QA input handoff and honest missing-parameter and stale-deployment controls before the larger preparation suite is available. Existing fixed controls do not yet isolate those two required-input boundaries.

### Acceptance Criteria

- **AC1.** A developer can create and inspect a fresh private mixed Story input packet with the selected request, extraction mapping, SQL parameters, UI checkpoints and exact consumer bindings.
- **AC2.** The separate missing reviewed parameter-count and stale-deployment controls expose those precise boundaries without contradictory proof, guessed inputs or changed work expectations.
- **AC3.** Preparation preserves existing publication fixtures, creates empty execution outputs and explains input inspection, authority requirements and safe cleanup without claiming helper execution or live readiness.

### Technical Acceptance Criteria

- **TAC1.** Reuse existing raw-work/context, receipt validators, fixture module and helper/publisher contracts without a new schema, engine, provider adapter or installed skill.
- **TAC2.** Keep supplied/mock facts and operator guidance separate from actual output and authority; preserve current-review and artifact/actor/tenant/PR bindings and withhold any expected terminal result.
- **TAC3.** Use a fresh private absolute folder, exclusive writes and artifact hashes; keep default publication preparation unchanged and never overwrite retained evidence.

### Testing Strategy

Preparation and read-only inspection only. All three human cases remain NOT_RUN. The complete steps, prerequisites, evidence and cleanup follow in the structured contract.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Developers and QA reviewers need a complete mixed QA input handoff and honest missing-parameter and stale-deployment controls before the larger preparation suite is available. Existing fixed controls do not yet isolate those two required-input boundaries.",
  "prerequisites": [
    {
      "ticket": "R1-04",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-06",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-07",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "PGB-108",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-24",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "A developer can create and inspect a fresh private mixed Story input packet with the selected request, extraction mapping, SQL parameters, UI checkpoints and exact consumer bindings."
    },
    {
      "id": "AC2",
      "requirement": "The separate missing reviewed parameter-count and stale-deployment controls expose those precise boundaries without contradictory proof, guessed inputs or changed work expectations."
    },
    {
      "id": "AC3",
      "requirement": "Preparation preserves existing publication fixtures, creates empty execution outputs and explains input inspection, authority requirements and safe cleanup without claiming helper execution or live readiness."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Deliver the existing source-only prepareQaFixture dispatch-inputs command with I01-story, I02-parameters and I11-stale-environment, their regression coverage, current producer/reviewer guidance and publication metadata in one PR.",
      "out_of_scope": [
        "Plexus/customer code changes",
        "Archived runtime reuse",
        "Activation, worker monitoring, Cursor deduplication, automatic recovery and new QA engines"
      ],
      "related_repositories": []
    },
    "accepted_decisions": [
      {
        "id": "D03",
        "decision": "Story writing and human-invoked request-rework are separate skills.",
        "reference": "docs/architecture/manager-human-rework.md"
      },
      {
        "id": "D04",
        "decision": "Pig Boss is the manager. A stream is Jira site + immutable project ID + full label; equal labels in different projects are independent. One customer installation supports multiple projects. Basic manager health is in release one; worker monitoring and scaling implementation remain follow-ons.",
        "reference": "docs/architecture/pig-boss-operations.md"
      }
    ],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Reuse existing raw-work/context, receipt validators, fixture module and helper/publisher contracts without a new schema, engine, provider adapter or installed skill."
      },
      {
        "id": "TAC2",
        "requirement": "Keep supplied/mock facts and operator guidance separate from actual output and authority; preserve current-review and artifact/actor/tenant/PR bindings and withhold any expected terminal result."
      },
      {
        "id": "TAC3",
        "requirement": "Use a fresh private absolute folder, exclusive writes and artifact hashes; keep default publication preparation unchanged and never overwrite retained evidence."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Current Pigboard PR checkout and prepared disposable local fixtures; no deployed customer target.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "The three fixed supplied/mock inputs I01-story, I02-parameters and I11-stale-environment, produced in a fresh private folder.",
        "initial_state": "Fresh per case; only explicitly sequenced actions share state. Providers/tool receipts are simulated, credentials dummy.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "The exact source-only preparation command, three complete fixed input packets and existing read-only validation/inspection commands for R1-30-H01 through R1-30-H03, bound to the reviewed source revision.",
        "used_by": [
          "DATA-01",
          "R1-30-H01",
          "R1-30-H02",
          "R1-30-H03"
        ],
        "preserves": [
          "All case inputs, order, expected outcomes, evidence and cleanup. No live provider data or changed test expectations."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns CLI/IaC or instruction contracts, which the currently approved automated QA skills do not execute. Human reviewers run these cases; developer CI and PR review remain required.",
      "cases": [
        {
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain commands, input hashes and inspection evidence first; remove only the owned disposable preparation root. No live resources are created."
            ]
          },
          "id": "R1-30-H01",
          "requirements": [
            "AC1",
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Reviewed same-release source checkout with its already prepared validator dependencies; a fresh absolute private output path; dummy supplied/mock data only."
          ],
          "steps": [
            "Run the delivered source-only preparation command and record source revision, module hash and emitted input hashes.",
            "Inspect I01-story raw work, separate context, current-review predecessors, child ownership, request/assertions, extraction pointer, SQL layout and three UI image/checkpoint bindings.",
            "Verify the existing raw-work and predecessor checks, empty output directory and NOT_READY authority/capability notice; repeat the command only against the same occupied path to verify refusal without overwriting files."
          ],
          "expected": [
            "Exactly the three declared variants are listed, with complete retrievable inputs and matching hashes.",
            "The baseline has valid declared work/context and coherent current proof; extraction values remain unbound until actual helper evidence exists.",
            "No helper, timer, provider or publisher is run; no assessment, verdict or current terminal is supplied, and original files survive the occupied-path refusal."
          ],
          "evidence": [
            "Exact source command, revision and hashes, validator output, artifact/consumer inspection and before/after occupied-path file hashes."
          ]
        },
        {
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain commands, input hashes and inspection evidence first; remove only the owned disposable preparation root. No live resources are created."
            ]
          },
          "id": "R1-30-H02",
          "requirements": [
            "AC2",
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Fresh generated I01-story and I02-parameters inputs from the reviewed source and existing read-only work/receipt validators."
          ],
          "steps": [
            "Compare raw work, query, parameter array and bindings with the baseline.",
            "Inspect the matching DB operation in facts.yaml and predecessor requirement context, then run existing read-only start/predecessor validation.",
            "Retain the diagnostic and inspect that no supplied expected value repairs the missing trusted count or populates output."
          ],
          "expected": [
            "The named negative keeps original work expectations and differs at the required reviewed DB parameter_count, which is null in both trusted-context copies.",
            "Start validation rejects with DATABASE_PARAMETERS at the DB parameter boundary; predecessor validation exposes the same missing-count cause.",
            "The baseline remains valid and the optional null parameter sidecar is not claimed as the rejection cause."
          ],
          "evidence": [
            "Raw positive/negative inputs, context comparison, exact parser/receipt diagnostics and empty output listing."
          ]
        },
        {
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain commands, input hashes and inspection evidence first; remove only the owned disposable preparation root. No live resources are created."
            ]
          },
          "id": "R1-30-H03",
          "requirements": [
            "AC2",
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Fresh generated I01-story and I11-stale-environment inputs; current review/PR facts and original mock pipeline comments are available."
          ],
          "steps": [
            "Match each environment receipt to its original pipeline comment by URI, comment ID, repository and PR number.",
            "Parse the original comment body and compare source/deployed revision with normalized proof and current review/PR.",
            "Compare the baseline and inspect preserved actor, target, readiness, original publication input bytes and empty output."
          ],
          "expected": [
            "Stale receipt and original comment source/deployed revision agree with each other and differ from current reviewed PR; no current pipeline body contradicts that stale claim.",
            "The baseline remains current, all other proof identities stay consistent, and the negative is visibly unsuitable as current deployment proof.",
            "Inspection does not assert a helper/publisher runtime result, human acceptance of PGB-132 or live deployment readiness."
          ],
          "evidence": [
            "Receipt/original-comment/current-PR comparison, positive-control comparison, preservation hashes and input/output listings."
          ]
        }
      ]
    },
    "automated_regression": "Use the existing emitted-input tests and raw-work/receipt validators to check the mixed handoff, exact missing trusted count, coherent stale proof, artifact hashes and preserved empty outputs/default publication fixtures."
  },
  "open_questions": []
}
```

## R1-27: Prepare the prescribed QA inputs

### Problem to solve

The prescribed PGB-78 QA cases need complete inputs that the existing helpers and publisher can consume without reconstructing missing facts. Current helper preparation needs manual completion, while publisher preparation starts with finished assessments.

Prerequisites: R1-04, R1-06, R1-07, PGB-108, R1-24; required outcome ai_qa_complete.

### Acceptance Criteria

- **AC1.** A developer or human QA reviewer can prepare the declared mixed Story and Bug inputs, inspect every artifact and invoke the existing helpers with their exact declared inputs before PGB-78 is implemented.
- **AC2.** Preparation preserves requirements, case order, child ownership, declared bindings, human cases and negative controls; it supplies no observed result, completed ledger or chosen destination.
- **AC3.** Incomplete identity, artifact, extraction, operation or timing facts remain visible before execution; existing static, partial and retained-evidence inputs keep their correct proof boundaries.
- **AC4.** The existing producer and reviewer guidance explains how to prepare and inspect these inputs, retain actual helper evidence and pass an independently formed assessment to qa-jira, while full dispatch remains pending PGB-78.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Complete PGB-78 PREP-01 mechanical input preparation in the existing source-only QA fixture module, its tests and producer/consumer guidance; keep existing helper, raw-work, prepared_inputs and qa-jira contracts.
- **TAC1.** Reuse the existing same-release parsers, receipt validators, fixture exporters and installed helper/publisher interfaces without adding a schema, runtime dispatcher, QA engine or provider adapter.
- **TAC2.** Keep supplied/mock input facts separate from actual observed outputs and private expectations; preserve existing publication fixtures and leave the new output directory empty.
- **TAC3.** Bind raw work, trusted context, artifact hashes, actor, tenant, allowed actions and current PR/environment proof independently; no missing proof may be replaced by an expected value or ticket assertion.

### Testing Strategy

- **QA skills:** `[]`; human developer and QA reviewer own every case. No human case is completed by CI or a simulated instruction exercise.
- **Preparation:** {"id":"PREP-01","owner":"implementer","supplies":"Executable source-only preparation and exact commands for R1-27-H01 through R1-27-H03, bound to the reviewed PR revision and existing helper/publisher interfaces.","used_by":["DATA-01","R1-27-H01","R1-27-H02","R1-27-H03"],"preserves":["All case inputs, order, expected outcomes, evidence and cleanup. No live provider data or changed test expectations."]}

#### R1-27-H01: Prepare a fresh private input folder with the exact command supplied by PREP-01 and record source, installed and input hashes.

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC4, TAC1, TAC2, TAC3.
- **Prerequisites/data:** Prepared same-release checkout and installed helper/publisher roots; fixed native Story and Bug mixed API-child, PostgreSQL and UI inputs; dummy access and explicitly supplied/mock provider facts.
- **Steps:**
  1. Prepare a fresh private input folder with the exact command supplied by PREP-01 and record source, installed and input hashes.
  2. Inspect raw work/context, declared preparation consumers, selected request/assertions, query/parameter layout, UI route/checkpoints, extraction mapping and separate access/deployment facts.
  3. Invoke each existing helper through its declared caller with actual earlier outputs; preserve returned parent/child results, query facts and screenshots.
  4. Form an assessment from those actual results and invoke qa-jira with the fixed supplied/mock read/write cards; inspect readback and transition evidence.
- **Expected:** Every required input is present and retains its declared type and consumer; an output is bound only after its real helper observation. The preparer produces no assessment or verdict; existing helpers and publisher can consume the handoff without a new dispatcher or reconstructed fact. Mock evidence stays labelled mock; human cases remain pending and no live mutation occurs.
- **Evidence:** Exact commands, source/installed/input hashes, preparation artifacts, original helper results, screenshots, independently formed assessment and ordered simulated tool audit.
- **Cleanup:** Retain inputs, actual output and evidence first; remove only the owned disposable preparation folder without changing live records or resources.

#### R1-27-H02: Inspect each positive input with the same delivered contract and validator.

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC2, AC3, TAC1, TAC2, TAC3.
- **Prerequisites/data:** Fresh positive controls and independent missing extraction, query, UI checkpoint, identity/tenant, operation-bound and explicit dependency-cause variants; finite observation inputs for both completion policies.
- **Steps:**
  1. Inspect each positive input with the same delivered contract and validator.
  2. Inspect each named negative in a fresh folder and attempt only its existing read-only preflight or input validation.
  3. Compare unchanged expected outcomes and case/step IDs with the original controls; inspect that no expected result or completed output was substituted.
- **Expected:** Positive preparation identifies every fact needed by the existing consumer. Each negative stays incomplete or is rejected at the matching existing boundary; none becomes ready through a guessed value, inferred permission or rewritten requirement. Finite observation offsets and whole-unit bounds are supplied as inputs; the preparer executes no schedule or mutation.
- **Evidence:** Raw original and negative inputs, parser diagnostics, completeness observations, exact missing-field/cause references and empty generated output directories.
- **Cleanup:** Retain inputs, actual output and evidence first; remove only the owned disposable preparation folder without changing live records or resources.

#### R1-27-H03: Prepare each independent control and inspect raw requirements and predecessor versus current-result separation.

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC2, AC3, AC4, TAC2, TAC3.
- **Prerequisites/data:** Static human-only Bug, all-NOT_RUN missing-environment partial, earlier FAIL then inability, pure upstream wait, retained FAIL plus wait, and valid/invalid retained-evidence input controls from the existing publisher families.
- **Steps:**
  1. Prepare each independent control and inspect raw requirements and predecessor versus current-result separation.
  2. Inspect the static pending-human list and the exact proof required by each partial or reused claim.
  3. Follow the documented existing helper/publisher input handoff and recovery guidance; compare the original publication suite before and after preparation.
- **Expected:** Static human-only work requires no invented environment; any supplied PASS/FAIL or reused claim retains its actual nonnull tested PR and trusted current-revision environment proof. Pure wait and retained-FAIL wait remain distinct and carry a current-case cause; later inability preserves earlier findings. Original publication inputs remain unchanged, new execution outputs remain empty, and neither preparation nor documentation claims human acceptance or activation.
- **Evidence:** Commands and hashes, original versus emitted input comparison, proof/cause observations, exact pending humans, recovery notes and original publication-fixture preservation check.
- **Cleanup:** Retain inputs, actual output and evidence first; remove only the owned disposable preparation folder without changing live records or resources.

- **Automated regression:** Use the existing raw work and receipt validators plus independent artifact checks to verify complete helper/publisher input preparation, consumer bindings, preserved negative inputs and empty execution outputs.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The prescribed PGB-78 QA cases need complete inputs that the existing helpers and publisher can consume without reconstructing missing facts. Current helper preparation needs manual completion, while publisher preparation starts with finished assessments.",
  "prerequisites": [
    {
      "ticket": "R1-04",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-06",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-07",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "PGB-108",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-24",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-30",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "A developer or human QA reviewer can prepare the declared mixed Story and Bug inputs, inspect every artifact and invoke the existing helpers with their exact declared inputs before PGB-78 is implemented."
    },
    {
      "id": "AC2",
      "requirement": "Preparation preserves requirements, case order, child ownership, declared bindings, human cases and negative controls; it supplies no observed result, completed ledger or chosen destination."
    },
    {
      "id": "AC3",
      "requirement": "Incomplete identity, artifact, extraction, operation or timing facts remain visible before execution; existing static, partial and retained-evidence inputs keep their correct proof boundaries."
    },
    {
      "id": "AC4",
      "requirement": "The existing producer and reviewer guidance explains how to prepare and inspect these inputs, retain actual helper evidence and pass an independently formed assessment to qa-jira, while full dispatch remains pending PGB-78."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Complete PGB-78 PREP-01 mechanical input preparation in the existing source-only QA fixture module, its tests and producer/consumer guidance; keep existing helper, raw-work, prepared_inputs and qa-jira contracts.",
      "out_of_scope": [
        "Plexus/customer code changes",
        "Archived runtime reuse",
        "Activation, worker monitoring, Cursor deduplication, automatic recovery and new QA engines"
      ],
      "related_repositories": []
    },
    "accepted_decisions": [
      {
        "id": "D03",
        "decision": "Story writing and human-invoked request-rework are separate skills.",
        "reference": "docs/architecture/manager-human-rework.md"
      },
      {
        "id": "D04",
        "decision": "Pig Boss is the manager. A stream is Jira site + immutable project ID + full label; equal labels in different projects are independent. One customer installation supports multiple projects. Basic manager health is in release one; worker monitoring and scaling implementation remain follow-ons.",
        "reference": "docs/architecture/pig-boss-operations.md"
      }
    ],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Reuse the existing same-release parsers, receipt validators, fixture exporters and installed helper/publisher interfaces without adding a schema, runtime dispatcher, QA engine or provider adapter."
      },
      {
        "id": "TAC2",
        "requirement": "Keep supplied/mock input facts separate from actual observed outputs and private expectations; preserve existing publication fixtures and leave the new output directory empty."
      },
      {
        "id": "TAC3",
        "requirement": "Bind raw work, trusted context, artifact hashes, actor, tenant, allowed actions and current PR/environment proof independently; no missing proof may be replaced by an expected value or ticket assertion."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Current Pigboard PR checkout and prepared disposable local fixtures; no deployed customer target.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "Fixed supplied/mock inputs for the three preparation acceptance cases; independent variants use fresh private folders.",
        "initial_state": "Fresh per case; only explicitly sequenced actions share state. Providers/tool receipts are simulated, credentials dummy.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Executable source-only preparation and exact commands for R1-27-H01 through R1-27-H03, bound to the reviewed PR revision and existing helper/publisher interfaces.",
        "used_by": [
          "DATA-01",
          "R1-27-H01",
          "R1-27-H02",
          "R1-27-H03"
        ],
        "preserves": [
          "All case inputs, order, expected outcomes, evidence and cleanup. No live provider data or changed test expectations."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns CLI/IaC or instruction contracts, which the currently approved automated QA skills do not execute. Human reviewers run these cases; developer CI and PR review remain required.",
      "cases": [
        {
          "id": "R1-27-H01",
          "requirements": [
            "AC1",
            "AC2",
            "AC4",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Prepared same-release checkout and installed helper/publisher roots; fixed native Story and Bug mixed API-child, PostgreSQL and UI inputs; dummy access and explicitly supplied/mock provider facts."
          ],
          "steps": [
            "Prepare a fresh private input folder with the exact command supplied by PREP-01 and record source, installed and input hashes.",
            "Inspect raw work/context, declared preparation consumers, selected request/assertions, query/parameter layout, UI route/checkpoints, extraction mapping and separate access/deployment facts.",
            "Invoke each existing helper through its declared caller with actual earlier outputs; preserve returned parent/child results, query facts and screenshots.",
            "Form an assessment from those actual results and invoke qa-jira with the fixed supplied/mock read/write cards; inspect readback and transition evidence."
          ],
          "expected": [
            "Every required input is present and retains its declared type and consumer; an output is bound only after its real helper observation.",
            "The preparer produces no assessment or verdict; existing helpers and publisher can consume the handoff without a new dispatcher or reconstructed fact.",
            "Mock evidence stays labelled mock; human cases remain pending and no live mutation occurs."
          ],
          "evidence": [
            "Exact commands, source/installed/input hashes, preparation artifacts, original helper results, screenshots, independently formed assessment and ordered simulated tool audit."
          ],
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain inputs, actual output and evidence first; remove only the owned disposable preparation folder without changing live records or resources."
            ]
          }
        },
        {
          "id": "R1-27-H02",
          "requirements": [
            "AC2",
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Fresh positive controls and independent missing extraction, query, UI checkpoint, identity/tenant, operation-bound and explicit dependency-cause variants; finite observation inputs for both completion policies."
          ],
          "steps": [
            "Inspect each positive input with the same delivered contract and validator.",
            "Inspect each named negative in a fresh folder and attempt only its existing read-only preflight or input validation.",
            "Compare unchanged expected outcomes and case/step IDs with the original controls; inspect that no expected result or completed output was substituted."
          ],
          "expected": [
            "Positive preparation identifies every fact needed by the existing consumer.",
            "Each negative stays incomplete or is rejected at the matching existing boundary; none becomes ready through a guessed value, inferred permission or rewritten requirement.",
            "Finite observation offsets and whole-unit bounds are supplied as inputs; the preparer executes no schedule or mutation."
          ],
          "evidence": [
            "Raw original and negative inputs, parser diagnostics, completeness observations, exact missing-field/cause references and empty generated output directories."
          ],
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain inputs, actual output and evidence first; remove only the owned disposable preparation folder without changing live records or resources."
            ]
          }
        },
        {
          "id": "R1-27-H03",
          "requirements": [
            "AC2",
            "AC3",
            "AC4",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Static human-only Bug, all-NOT_RUN missing-environment partial, earlier FAIL then inability, pure upstream wait, retained FAIL plus wait, and valid/invalid retained-evidence input controls from the existing publisher families."
          ],
          "steps": [
            "Prepare each independent control and inspect raw requirements and predecessor versus current-result separation.",
            "Inspect the static pending-human list and the exact proof required by each partial or reused claim.",
            "Follow the documented existing helper/publisher input handoff and recovery guidance; compare the original publication suite before and after preparation."
          ],
          "expected": [
            "Static human-only work requires no invented environment; any supplied PASS/FAIL or reused claim retains its actual nonnull tested PR and trusted current-revision environment proof.",
            "Pure wait and retained-FAIL wait remain distinct and carry a current-case cause; later inability preserves earlier findings.",
            "Original publication inputs remain unchanged, new execution outputs remain empty, and neither preparation nor documentation claims human acceptance or activation."
          ],
          "evidence": [
            "Commands and hashes, original versus emitted input comparison, proof/cause observations, exact pending humans, recovery notes and original publication-fixture preservation check."
          ],
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain inputs, actual output and evidence first; remove only the owned disposable preparation folder without changing live records or resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Use the existing raw work and receipt validators plus independent artifact checks to verify complete helper/publisher input preparation, consumer bindings, preserved negative inputs and empty execution outputs."
  },
  "open_questions": []
}
```

## R1-08: Execute prescribed QA and hand off complete evidence

### Problem to solve

QA needs to run the named cases in order and hand the open PR to humans. It must retain incomplete results and keep human tests visibly pending.

Prerequisites: R1-04, R1-06, R1-07, PGB-108, R1-24, R1-27; required outcome ai_qa_complete.

### Acceptance Criteria

- **AC1.** QA accepts native Story/Bug assignments and rejects other types; Grok High dispatches exactly the prescribed top-level steps in order, including declared helper calls/bindings and bounded read-only observation schedules.
- **AC2.** Every AI step has PASS/FAIL with evidence or NOT_RUN with reason/finding; pending human case IDs remain separate.
- **AC3.** All AI cases passing, or explicit human-only zero-AI work, publishes verified QA evidence then moves to Human Review.
- **AC4.** Confirmed in-scope defects or known upstream waits queue rework; inability blocks; discussion stays QA. Human cases are never auto-passed.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own QA orchestration and compose the separately delivered qa-jira publisher; helpers retain no transition authority.
- **TAC1.** Own QA orchestration and separate qa-jira publication; helpers retain no transition authority.
- **TAC2.** Use current review/PR/requirements receipts; no observation overlap, catch-up or replay of completed mutations. Preserve full partial ledger on failure.
- **TAC3.** Human-only non-runtime PR targets need no invented deployment; environment-dependent work still requires the trusted current deployment receipt.

### Testing Strategy

- **QA skills:** `[]`; human developer and QA reviewer own every case. No human case is completed by CI or a simulated instruction exercise.
- **Preparation:** {"id":"PREP-01","owner":"implementer","supplies":"Executable local fixtures and exact commands for all human cases below, bound to the PR revision.","used_by":["DATA-01","R1-08-H01","R1-08-H02","R1-08-H03"],"preserves":["All case inputs, order, expected outcomes, evidence and cleanup. No live provider data or changed test expectations."]}

#### R1-08-H01: Execute the prepared dispatch sequence.

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC3, TAC1, TAC2.
- **Prerequisites/data:** Scripted native Story and Bug mixed API-child/database/UI plans with declared binding and screenshots.
- **Steps:**
  1. Execute the prepared dispatch sequence.
  2. Inspect full nested ledger and human_pending.
  3. Inspect verified publication and transition order.
- **Expected:** Each step once, correct earlier-output binding, full evidence; Human Review only after verified current-revision completion.
- **Evidence:** ordered tool audit, screenshots and typed ledger; tested PR revision and exact command.
- **Cleanup:** Human QA reviewer retains evidence then removes disposable local fixtures/build output; do not change live records/resources.

#### R1-08-H02: Run each observation schedule against scripted outcomes.

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC1, AC2, AC4, TAC2.
- **Prerequisites/data:** Observation schedules for until_expected/all_observations plus overrun, defect, missing access and known upstream defect transcripts.
- **Steps:**
  1. Run each observation schedule against scripted outcomes.
  2. Inspect dispatch times, final ledger and destination.
- **Expected:** No overlap/catch-up; expected success/failure policy; overrun/inability blocks, known defect queues; unfinished work explicitly NOT_RUN.
- **Evidence:** timestamped dispatch audit and result records; tested PR revision and exact command.
- **Cleanup:** Human QA reviewer retains evidence then removes disposable local fixtures/build output; do not change live records/resources.

#### R1-08-H03: Execute zero-AI QA.

- **Owner/skills:** developer and human QA reviewer; AI skills `[]`.
- **Requirements:** AC2, AC3, AC4, TAC3.
- **Prerequisites/data:** Complete human-only native Bug static PR plan, rejected Task/Epic types, plus changed source/requirements and unknown publication variants.
- **Steps:**
  1. Execute zero-AI QA.
  2. Repeat with each invalid variant.
- **Expected:** Zero AI cases and exact pending human list; no human PASS, no invented environment; stale/unknown effects stop without replay.
- **Evidence:** tool audit and human handoff; tested PR revision and exact command.
- **Cleanup:** Human QA reviewer retains evidence then removes disposable local fixtures/build output; do not change live records/resources.

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


## R1-25: Validate repeated-parent repairs

### Problem to solve

The existing local chain validator rejects a legitimate repaired child that consumes older and newer updates from its actual parent. Workers and operators cannot validate the complete repair even when every required cause is present.

### Acceptance Criteria

- **AC1.** The existing source and installed chain command validates current B2 implementation/review/QA consuming exact U1+U2 at verified A3, retaining R1 and R2 without duplicate leaf consumption.
- **AC2.** Historical U1/A2 remains valid nested evidence; selecting stale U1/A2 as current still fails its current-pointer/stage/PR checks.
- **AC3.** Divergent parent history, missing causes, invalid immutable metadata, duplicate direct requests and cycles reject without changing supplied data or authorizing execution.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Own existing canonical receipt repeated-parent validation, source/installed tests and guides, plus the approved same-scope delivery-record amendment for this validator and PGB-81; no related repository changes.
- **Out of scope:** Plexus/customer code changes; Archived runtime reuse; Activation, worker monitoring, Cursor deduplication, automatic recovery and new QA engines.
- **Related repositories:** none.
- **D03:** Story writing and human-invoked request-rework are separate skills. (docs/architecture/manager-human-rework.md)
- **D04:** Pig Boss is the manager. A stream is Jira site + immutable project ID + full label; equal labels in different projects are independent. One customer installation supports multiple projects. Basic manager health is in release one; worker monitoring and scaling implementation remain follow-ons. (docs/architecture/pig-boss-operations.md)
- **TAC1.** Preserve public chain inputs/results and strict current completion, role/metadata/PR/no-publication/resume rules with zero provider effects; add no public permissive option, manager history export or preview policy.
- **TAC2.** Prove same-parent successors through actual repair-admission previous_assignment ancestry with preserved parent/PR/project/full-stream/repository identity; retain each direct request once and exact effective repair roots without weakening inherited QA execution proof.
- **TAC3.** Reuse the exact immutable 28-record chronology and complete current-phase synthetic envelopes; change only selected target and B outer stage, retain source/variant hashes and never derive expected outcomes from production validation.

### Testing Strategy

- **Prerequisite:** R1-10/PGB-80, ai_qa_complete.
- **QA skills:** `[]`; developer regressions support the three human-owned cases below. Human acceptance remains NOT_RUN.

**testing_types:**

```json
[]
```

**environment:**

```json
{
  "source": "configured_target",
  "target_reference": "Current Pigboard PR checkout, actual same-release installed chain command and prepared disposable local synthetic fixtures; no deployed customer target.",
  "required_capabilities": []
}
```

**actors:**

```json
[]
```

**fixtures:**

```json
[
  {
    "id": "DATA-01",
    "description": "Frozen 28-record repeated-parent H02 chronology, nine checkpoints and separate phase-bound C01 controls with fixed independent expectations; C02/C03 use fresh copies.",
    "initial_state": "No live provider data or credentials; frozen originals and all 119 prepared files remain unchanged; only disposable variants are edited.",
    "reference": null,
    "preparation_id": "PREP-01",
    "owner": "implementer"
  }
]
```

**preparation:**

```json
[
  {
    "id": "PREP-01",
    "owner": "implementer",
    "supplies": "Executable local fixtures and exact source/installed commands bound to the PR revision; separately hash and diff all C01 phase variants, retain completed-stage negatives and isolate the repeated-parent RED failure on the final corrected PGB-80 base.",
    "used_by": [
      "DATA-01",
      "R1-25-C01",
      "R1-25-C02",
      "R1-25-C03"
    ],
    "preserves": [
      "All original receipt bytes, references/digests, authors/times, complete pages, retained metadata, requirements, pointers, PR facts and request resolutions.",
      "Fixed C01 validity/completion and C02/C03 rejection outcomes; no invented receipt, edited oracle, credentials or provider effects."
    ]
  }
]
```

**dispatch_order:**

```json
[]
```

**cases:**

```json
[]
```

#### R1-25-C01

- **Execution/owner:** human; developer and human QA reviewer.
- **Requirements:** AC1, TAC1, TAC2, TAC3.

**Prerequisites:**

- Prepared DATA-01, source checkout and actual same-release installed validate-handoff command; dummy data only, no credentials, network or deployed target.
- Frozen checkpoints/08-b2-full-qa/receipts/b2_qa.json with all 28 immutable records, complete 14/10/4-comment pages and all 28 retained metadata entries.
- Three separately named and hashed synthetic current-observation envelopes: c01-b2-implementation-in-review.json selects original 81026 with B/1001 stage 3; c01-b2-review-in-qa.json selects original 81027 with B stage 4; c01-b2-qa-in-human-review.json selects original 81028 with B stage 5.
- Apart from exact target selection and issues[id=1001].stage_id, each variant preserves the whole source envelope: B pointer/assignment 81025, U1+U2, PR11 open at revision 5555555555555555555555555555555555555555 targeting parent; A Human Review, assignment81020/completion81023, PR10 at revision3333333333333333333333333333333333333333; unchanged requirements/context, bodies/digests, metadata, pages, PR inventory and other issues.

**Steps:**

1. Check each variant against the frozen source and assert only the two allowed outer-field differences; record separate SHA256 values for source and each serialized variant.
2. Run each variant through node scripts/validate-handoff.mjs --mode chain --input FILE in readable mode and again with --json; repeat with the actual installed validate-handoff script from an unrelated working directory.
3. Check chain validity, complete U1+U2 consumption, R1+R2 root accounting, completion_established and zero writes; compare fixed expected outcomes below, never generated expectations.
4. On separate unchanged completed-envelope copies select original implementation81026 and review81027 without rewinding B stage5; repeat source/installed commands and inspect /target/stage_id rejection.
5. Recheck all source/variant hashes after execution and retain evidence before cleanup.

**Expected:**

- All three phase-bound chains are valid with exact U1+U2 at proven A3; common R1 is covered once, R2 remains covered and no cause is dropped.
- Only QA81028 establishes completion; phase-valid implementation81026 and review81027 do not.
- The unchanged completed checkpoint rejects implementation/review selected as current at /target/stage_id; its QA target remains valid.
- Inputs and frozen history remain byte-identical; no provider/state writes or execution authorization occur; synthetic observations do not claim earlier real chronology.

**Evidence:**

- Exact source and installed commands, selected target, tested commit, exit/result/diagnostics, zero-write audit and source/variant SHA256 before and after execution.

**Cleanup:**

```json
{
  "mode": "prescribed",
  "reason": null,
  "owner": "human QA reviewer",
  "steps": [
    "Retain commands, output, tested revision and before/after input hashes; remove only disposable variants and installed test output, never the frozen chronology or live records."
  ]
}
```

#### R1-25-C02

- **Execution/owner:** human; developer and human QA reviewer.
- **Requirements:** AC2, TAC1, TAC2, TAC3.

**Prerequisites:**

- C01 phase-bound controls, immutable A2/U1 references and later current outer observations from DATA-01; each control starts from a fresh copy.
- No receipt is resealed and no source body, digest, metadata, pointer, current PR or native observation is changed to make a stale target pass.

**Steps:**

1. Select authentic old A2 completion and U1 stack publication separately as current targets under their unchanged later observations.
2. Run each through source and actual installed chain commands in readable and JSON modes; retain exact current-pointer/stage/PR diagnostics and hashes.
3. Repeat all valid C01 phase-bound controls with those same immutable A2/U1 records nested in history; retain C01 completed-stage negative controls.
4. Compare fixed expectations, check no writes and verify input hashes after each run.

**Expected:**

- Stale A2/U1 selected as current rejects under the existing applicable pointer/stage/PR checks.
- The same authentic records are accepted only within proven ancestry of the valid current B2 controls; strict selected-target checks are never bypassed.
- Only valid current QA establishes completion; no input change or provider/state effect occurs.

**Evidence:**

- Exact source and installed commands, selected target, tested commit, exit/result/diagnostics, zero-write audit and source/variant SHA256 before and after execution.

**Cleanup:**

```json
{
  "mode": "prescribed",
  "reason": null,
  "owner": "human QA reviewer",
  "steps": [
    "Retain commands, output, tested revision and before/after input hashes; remove only disposable variants and installed test output, never the frozen chronology or live records."
  ]
}
```

#### R1-25-C03

- **Execution/owner:** human; developer and human QA reviewer.
- **Requirements:** AC3, TAC1, TAC2, TAC3.

**Prerequisites:**

- Fresh independent copies of C01 valid phase-bound controls and their fixed root/request expectations; keep one unchanged shared-leaf positive control.
- Separate invalid variants omit or alter retained metadata, change a parent or PR, remove predecessor proof, diverge ancestry, omit root/cause coverage, duplicate a direct request, or introduce a recursion cycle; record each exact mutation and input hash.

**Steps:**

1. Run each independent negative and the unchanged shared-leaf positive through source and actual installed chain commands, readable then JSON.
2. Inspect validity, completion, diagnostics, full cause/root coverage and zero-write audit for each result.
3. Verify source and input hashes after every run and retain mutation/output evidence before cleanup.

**Expected:**

- Every missing/forged metadata, switched parent/PR, missing/divergent ancestry, omitted cause/root, duplicate direct request or cycle variant rejects without completion or writes.
- Two distinct valid paths to common R1 alone remain valid; all assigned direct U1+U2 requests are consumed once and R1+R2 coverage remains exact.
- Later timestamps or hashes alone never prove ancestry, and no failure edits supplied data or authorizes execution.

**Evidence:**

- Exact source and installed commands, selected target, tested commit, exit/result/diagnostics, zero-write audit and source/variant SHA256 before and after execution.

**Cleanup:**

```json
{
  "mode": "prescribed",
  "reason": null,
  "owner": "human QA reviewer",
  "steps": [
    "Retain commands, output, tested revision and before/after input hashes; remove only disposable variants and installed test output, never the frozen chronology or live records."
  ]
}
```

**Human review:**

```json
{
  "no_ai_cases_reason": "Acceptance concerns CLI/IaC or instruction contracts, which the currently approved automated QA skills do not execute. Human reviewers run these cases; developer CI and PR review remain required."
}
```

- **Automated regression:** Canonical repeated-parent ancestry and exact cause/root coverage with current-target isolation, inherited receipt authority and actual installed-runtime parity; preserve full receipt/installed suites and verify approved delivery metadata preservation.

- **Open questions:** `[]`.

## R1-26: Reject conflicting completion receipts

Prerequisite: R1-25/PGB-113, ai_qa_complete. All six human cases remain NOT_RUN.

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The offline preview can combine individually valid completion receipts that disagree about the same supplied facts. This can make a prerequisite appear satisfied despite conflicting evidence. Humans and agents need a clear hold before using that preview.",
  "prerequisites": [
    {
      "ticket": "R1-25",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "Consistent complete snapshots keep their existing preview result, including valid current completion receipts with no retained historical records."
    },
    {
      "id": "AC2",
      "requirement": "Conflicting authenticated observations in current completion receipts hold every affected scope before any conflicting proof can satisfy a prerequisite, regardless of receipt order or a third receipt repeating either value."
    },
    {
      "id": "AC3",
      "requirement": "The source and installed preview explain the conflict with a bounded safe diagnostic, preserve independent coherent scopes, and perform zero writes or authorized execution."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own canonical current receipt observation fingerprints and whole-snapshot completion-proof conflict rejection in the existing offline preview, with source/installed tests, guides and the approved delivery-record amendment.",
      "out_of_scope": [
        "Customer repository changes",
        "Provider writes, deployment, activation and evaluation execution",
        "Historical receipt projection and complete repair scheduling, which remain in PGB-81"
      ],
      "related_repositories": []
    },
    "accepted_decisions": [
      {
        "id": "D03",
        "decision": "Story writing and human-invoked request-rework are separate skills.",
        "reference": "docs/architecture/manager-human-rework.md"
      },
      {
        "id": "D04",
        "decision": "Pig Boss is the manager. A stream is Jira site + immutable project ID + full label; equal labels in different projects are independent. One customer installation supports multiple projects. Basic manager health is in release one; worker monitoring and scaling implementation remain follow-ons.",
        "reference": "docs/architecture/pig-boss-operations.md"
      }
    ],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Deliver one usable current-preview conflict rejection increment in this repository; introduce no provider effects, deployment or evaluation execution."
      },
      {
        "id": "TAC2",
        "requirement": "Reuse canonical parsing and validation; preserve public chain inputs/results, strict current authority, existing retention compatibility, receipt/snapshot bounds and PGB-113 resume/resolution/root protections."
      },
      {
        "id": "TAC3",
        "requirement": "Compare every common-parser observation identity family before accepting proofs; invalid or unbound receipts grant no authority, and no member of a contradictory group may be accepted by receipt order."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Current Pigboard PR checkout and actual same-release installed preview/validator bundle with prepared disposable local fixtures; no deployed customer target.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "Six frozen current-proof case groups PC01-PC06 with authentic complete envelopes, exact config/snapshot/options and literal expected full outputs; includes unchanged retained-empty compatibility seeds and independently audited two/three-envelope conflict permutations.",
        "initial_state": "Dummy local data only; no live records, provider credentials or network access; original fixtures and all failed/preparation evidence remain preserved.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Freeze test/fixtures/manager-proof-conflicts.json and exact source/installed invocation paths before product execution; independently audit complete identities, operations, metadata, bounds, current binding, intended rejection gates and literal output/digest expectations. Source invocation is node scripts/manager-preview.mjs --config CONFIG --input SNAPSHOT --json, repeated without --json; installed invocation uses the actual prepared copied script path from unrelated cwd. Prepare dependencies before the run.",
        "used_by": [
          "DATA-01",
          "R1-26-PC01",
          "R1-26-PC02",
          "R1-26-PC03",
          "R1-26-PC04",
          "R1-26-PC05",
          "R1-26-PC06"
        ],
        "preserves": [
          "All original 66 manager-candidate inputs/oracles and exact public strict-current compatibility, including retained-empty envelopes.",
          "All required identity/role/requirements/PR/evidence and current/retention boundaries; no output-derived expectation or invented reference.",
          "All original PGB-81 four acceptance criteria, two technical constraints and 42 full human case objects; no case is transferred or marked complete."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns local CLI and installed contract behavior, which the currently approved automated QA skills do not execute. Human reviewers run these cases; developer CI, independent input auditing and PR review remain required and do not replace human acceptance.",
      "cases": [
        {
          "id": "R1-26-PC01",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC2"
          ],
          "prerequisites": [
            "Frozen DATA-01 consistent current completion snapshots, including the five unchanged retained-empty fixtures and two distinct QA targets with matching shared observations."
          ],
          "steps": [
            "Run each source JSON/readable preview with the prepared literal config and snapshot, then reverse the two-receipt order.",
            "Compare complete results with frozen expectations and inspect input hashes and zero-effect evidence."
          ],
          "expected": [
            "Existing normal eligibility and full preview result are preserved; no conflict diagnostic occurs.",
            "Receipt order does not change authority or selected work; zero writes and execution_authorized false remain."
          ],
          "evidence": [
            "Exact source and installed commands where applicable, tested PR/bundle revisions and hashes, complete stdout/stderr/exit results, input hashes and zero-effect audit; keep all permutation and intended-gate records."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshots; retain the frozen inputs and output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-26-PC02",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC2",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "DATA-01 has two distinct canonical-valid, snapshot-bound current QA targets whose envelopes differ only in one shared accepted PR observation; use complete authentic chains, no duplicate target."
          ],
          "steps": [
            "Verify individual-input provenance and fixed expected pair reports before execution.",
            "Run the pair in both orders through source preview and compare complete output and raw input hashes."
          ],
          "expected": [
            "Both established participant scopes are held with REPAIR_PROOF_INVALID at the actual /completion_receipts/<index> locations; neither can select a target or contribute a conflicting proof.",
            "Observed counts and all zero-effect fields remain unchanged."
          ],
          "evidence": [
            "Exact source and installed commands where applicable, tested PR/bundle revisions and hashes, complete stdout/stderr/exit results, input hashes and zero-effect audit; keep all permutation and intended-gate records."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshots; retain the frozen inputs and output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-26-PC03",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC2",
            "TAC3"
          ],
          "prerequisites": [
            "DATA-01 has three distinct valid current QA targets in three established scopes sharing one observation key with values X,Y,X; a second fixed variant uses X,Y,Y; a fourth coherent scope has an independently expected selection."
          ],
          "steps": [
            "Run all six envelope permutations of each fixed variant using its literal full expected report.",
            "Check every participant scope, the independent scope, diagnostic indexes, counts and input hashes."
          ],
          "expected": [
            "All three conflict participant scopes are held, including the last entry repeating either earlier value; no conflicting proof can satisfy a prerequisite.",
            "The fourth scope keeps its predeclared selection and the result is partial; only independently frozen input-index/digest differences are permitted across permutations."
          ],
          "evidence": [
            "Exact source and installed commands where applicable, tested PR/bundle revisions and hashes, complete stdout/stderr/exit results, input hashes and zero-effect audit; keep all permutation and intended-gate records."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshots; retain the frozen inputs and output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-26-PC04",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC2",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "DATA-01 contains independently audited comment/UUID, requirements-context, current-fact and evidence-observation variants, plus exact-overlap controls; preparation identifies each intended reachable or earlier rejection gate."
          ],
          "steps": [
            "Run each full frozen variant and matching control through source preview.",
            "Inspect fixed diagnostics and scope outcomes; compare with its intended-gate preparation record and unchanged input hashes."
          ],
          "expected": [
            "Authenticated contradictory same-key observations hold every affected scope; exact matching overlap remains usable.",
            "Already-invalid or unbound envelopes are rejected by their existing gate and grant no proof; do not weaken a gate or label those controls as evidence of a cross-envelope semantic conflict."
          ],
          "evidence": [
            "Exact source and installed commands where applicable, tested PR/bundle revisions and hashes, complete stdout/stderr/exit results, input hashes and zero-effect audit; keep all permutation and intended-gate records."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshots; retain the frozen inputs and output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-26-PC05",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "DATA-01 has a coherent independent stream beside a conflicting pair, plus separate malformed and unbound completion receipt controls and exact existing-behavior expectations."
          ],
          "steps": [
            "Run each frozen source preview and compare full results, bounded diagnostic locations and observed counts.",
            "Check that no raw body/evidence or credential-like fixture marker appears in diagnostics and no inputs changed."
          ],
          "expected": [
            "Established conflict scopes hold while the independent stream keeps its expected selection; status is partial.",
            "If an authenticated conflict cannot be assigned to trustworthy scopes, use a shared hold. Malformed or unbound receipt controls retain their existing handling and never grant completion; they do not become trusted conflict observations.",
            "Writes remain zero and execution_authorized remains false."
          ],
          "evidence": [
            "Exact source and installed commands where applicable, tested PR/bundle revisions and hashes, complete stdout/stderr/exit results, input hashes and zero-effect audit; keep all permutation and intended-gate records."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshots; retain the frozen inputs and output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-26-PC06",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Prepared actual same-release installed preview/validator bundle and DATA-01 consistent, conflicting-pair and X,Y,X snapshots; disposable unrelated working directory; no provider credentials."
          ],
          "steps": [
            "Run the actual copied installed preview command with the frozen config/input in JSON and readable forms from the unrelated directory.",
            "Compare complete structured results with the fixed source-equivalent expectations; inspect readable conflict/recovery text.",
            "Record source/bundle hashes, stdout/stderr/exits and before/after input/directory state; preserve evidence before cleanup."
          ],
          "expected": [
            "Installed behavior matches source expectations, with exact frozen conflict diagnostics, current validation compatibility and unchanged inputs.",
            "No provider access, state write or execution authorization occurs."
          ],
          "evidence": [
            "Exact source and installed commands where applicable, tested PR/bundle revisions and hashes, complete stdout/stderr/exit results, input hashes and zero-effect audit; keep all permutation and intended-gate records."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Preserve evidence, then remove only disposable installed harness output and temporary files; never remove frozen originals or change live resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Current-chain output compatibility, all seven observation identity families, complete-group order independence, scope isolation, bounded inputs and actual copied-module CLI behavior through existing receipt, manager and installer harnesses."
  },
  "open_questions": []
}
```

## R1-28: Preview own-ticket repairs

Prerequisite: R1-26/PGB-129, ai_qa_complete. All six human cases remain NOT_RUN. This contract proposes the bounded own-ticket selection increment; full typed/stack repair preview and all 42 original cases remain R1-11/PGB-81.

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The local preview waits whenever a ticket has an outstanding repair. Humans and agents need to see when a queued repair on its existing open PR can safely take the next free work slot, before full stack repair ordering is available.",
  "prerequisites": [
    {
      "ticket": "R1-26",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The existing source and installed preview selects a ready own-ticket repair on its existing open PR before unrelated new work, using authenticated requests and completed history from that ticket."
    },
    {
      "id": "AC2",
      "requirement": "Only unresolved direct requests make a repair eligible; a necessary ready prerequisite takes priority, and occupancy, pause, Blocked work, ownership, intent and the five-item Human Review limit still prevent unsafe selection."
    },
    {
      "id": "AC3",
      "requirement": "Missing or conflicting evidence and repairs needing stack coordination or a first PR remain a visible safe wait or hold; ordinary current-proof behavior and the existing preview output shape remain compatible."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own usable own-ticket repair selection in the existing offline preview, its private authenticated history consumer, source and installed checks, guides and the additive delivery publication; one PR in this repository.",
      "out_of_scope": [
        "Customer repository changes, provider writes, deployment, activation and live execution",
        "New public inspection commands or output fields",
        "Stack repair propagation, queue-only proposals, first-PR repairs and complete typed proposals, which remain in PGB-81"
      ],
      "related_repositories": []
    },
    "accepted_decisions": [
      {
        "id": "D03",
        "decision": "Story writing and human-invoked request-rework are separate skills.",
        "reference": "docs/architecture/manager-human-rework.md"
      },
      {
        "id": "D04",
        "decision": "Pig Boss is the manager. A stream is Jira site + immutable project ID + full label; equal labels in different projects are independent. One customer installation supports multiple projects. Basic manager health is in release one; worker monitoring and scaling implementation remain follow-ons.",
        "reference": "docs/architecture/pig-boss-operations.md"
      }
    ],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Reuse canonical receipt validation and bounded authenticated history; keep strict current completion as the only prerequisite proof and preserve PGB-113 and PGB-129 authority, conflict and resource protections."
      },
      {
        "id": "TAC2",
        "requirement": "Preserve all original PGB-81 acceptance criteria and 42 full cases; this prerequisite does not complete or weaken that Story."
      },
      {
        "id": "TAC3",
        "requirement": "Keep existing preview JSON fields, readable invocation, installed capability and zero effects; expose no execution authority, new provider client or public inspection interface."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Current Pigboard PR checkout and actual same-release installed preview/validator bundle with prepared disposable local fixtures; no deployed customer target.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "Six bounded own-repair selection groups OC01–OC06, derived from the existing PGB-81 case families and immutable authentic receipt chronology, with exact source/installed inputs and full existing-shape expected reports.",
        "initial_state": "Dummy local data only; no live records, provider credentials or network access; original fixtures and all failed/preparation evidence remain preserved.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Freeze the six OC groups in test/fixtures/manager-repairs.json before calls. Derive exact inputs and full expected reports from the preserved chronology and required outcomes, not product output. Independently audit references, operations, current outer binding, target reachability, own request ownership, completed same-ticket assignment lineage, open existing PR, no stack parent, counts and intended gates. Use node scripts/manager-preview.mjs --config CONFIG --input SNAPSHOT --json and the same command without --json; use the actual prepared copied script from unrelated cwd. Prepare dependencies outside the run. OC02 is a finite six-input group: V01 remaining-R2, V02 no remaining cause, V03 implementation-only, V04 review-only, V05 foreign-ticket and V06 unrelated-lineage. Freeze exact provenance and full reports for all six; audit and execute each named variant, with no product-output-derived oracle.",
        "used_by": [
          "DATA-01",
          "R1-28-OC01",
          "R1-28-OC02",
          "R1-28-OC03",
          "R1-28-OC04",
          "R1-28-OC05",
          "R1-28-OC06"
        ],
        "preserves": [
          "All immutable original PGB-81 raw inputs, 42 complete case objects, full H02 expectations and existing partial results.",
          "All 66 inherited candidate inputs and expectations, all PGB-129 preview/public-chain/binding fixtures and strict-current compatibility.",
          "Historical evidence remains tied to its tested bytes; no source-installed equality substitutes for an independent full expected report."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns local CLI and installed contract behavior, which the currently approved automated QA skills do not execute. Human reviewers run these cases; developer CI, independent input auditing and PR review remain required and do not replace human acceptance.",
      "cases": [
        {
          "id": "R1-28-OC01",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1"
          ],
          "prerequisites": [
            "An authentic Rework Queued ticket with an authorized own repair_request, its completed current-assignment history and one current open existing PR, beside an unrelated eligible Bug; derive the own-only projection from the immutable A chronology and the S09 positive requirement."
          ],
          "steps": [
            "Run the source JSON and readable preview with the fixed input.",
            "Compare the full report and selected ID/key with the independent expected result; identify that queued ticket and its existing PR in the supplied snapshot."
          ],
          "expected": [
            "The own repair is selected ahead of unrelated new work, without changing its observed assignment, stage, PR or request inventory.",
            "The report retains the existing field set, zero writes and false execution authority; selection is an offline recommendation, not an admission or payload."
          ],
          "evidence": [
            "Exact PR and installed bundle revisions/hashes, commands, complete stdout/stderr/exits, full fixed expectations and input hashes; retain original failures and safe-hold evidence."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshots; retain frozen data and reports. Remove only separately identified disposable installation output after preserving evidence.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-28-OC02",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1"
          ],
          "prerequisites": [
            "DATA-01 contains six separately named frozen OC02 variants, each with coherent native current facts, authorized own requests, a completed current-assignment baseline, current open existing PR, no actual stack parent, complete target closure and all other selection guards valid.",
            "OC02-V01: completed same-ticket A2 consumes exact R1 and the queued lineage retains R1 plus new authorized R2; OC02-V02: the same accounting with only already-consumed R1 required.",
            "OC02-V03: still-unresolved own R1 plus an authentic implementation-only consumption witness, with no completed QA for that witness on the actual current lineage; OC02-V04 uses the corresponding review-only witness.",
            "OC02-V05: still-unresolved own R1 plus authentic foreign-ticket completed evidence sharing the cause through its own request/root lineage; OC02-V06 uses same-ticket completed consumption on a future/divergent assignment outside the current pointer lineage.",
            "PREP-01 independently freezes all six full expected reports and exact raw reference/assignment/PR provenance before calls; a canonical-invalid or unreachable extra witness is not a substitute for these accounting controls."
          ],
          "steps": [
            "Run source JSON and readable preview for OC02-V01, then OC02-V02, using their exact frozen inputs and compare each entire report and input hashes.",
            "Run OC02-V03, OC02-V04, OC02-V05 and OC02-V06 once each in that order; compare every complete report to its independently frozen expectation.",
            "For each variant retain the exact command, output and witness/current-lineage provenance; confirm observed request inventory, pointer, PR and counts remain unchanged."
          ],
          "expected": [
            "V01 selects A for its remaining own repair while retaining R1/R2 evidence; V02 keeps the pending wait with no selection and never invents an empty repair.",
            "V03 and V04 keep R1 actionable and select A because an implementation/review witness without completed current-lineage QA cannot discharge it.",
            "V05 and V06 keep R1 actionable and select A because foreign-ticket cause/root overlap and same-ticket completion outside the current lineage cannot discharge the exact own request.",
            "All six reports preserve the existing output shape, observed data, zero writes and false execution authority; a setup failure or earlier canonical rejection is recorded as such, not as a passed accounting control."
          ],
          "evidence": [
            "Exact PR and installed bundle revisions/hashes, commands, complete stdout/stderr/exits, full fixed expectations and input hashes; retain original failures and safe-hold evidence."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshots; retain frozen data and reports. Remove only separately identified disposable installation output after preserving evidence.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-28-OC03",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1"
          ],
          "prerequisites": [
            "The existing S10 required-ready-prerequisite family adapted to an authenticated own-ticket repair; include its unready and recursive prerequisite controls with complete native facts."
          ],
          "steps": [
            "Run each frozen source preview and compare the full report and candidate reasons."
          ],
          "expected": [
            "The actual necessary ready prerequisite precedes the own repair and unrelated Bug; an unready or unresolved prerequisite cannot be bypassed.",
            "Only strict current completion satisfies ai_qa_complete; historical completed rows alone never satisfy it."
          ],
          "evidence": [
            "Exact PR and installed bundle revisions/hashes, commands, complete stdout/stderr/exits, full fixed expectations and input hashes; retain original failures and safe-hold evidence."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshots; retain frozen data and reports. Remove only separately identified disposable installation output after preserving evidence.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-28-OC04",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC2",
            "TAC1",
            "TAC3"
          ],
          "prerequisites": [
            "Prescribed own-repair controls for S02, S11, S14, S15, S17, S30, S39 and S40: active occupancy, pause, Blocked member, unresolved intent/ownership, four versus five Human Review observations, and two active members."
          ],
          "steps": [
            "Run each fixed control through the source preview.",
            "Compare full outcomes, observed counts and original input hashes."
          ],
          "expected": [
            "A free opted-in stream with four Human Review items may select the valid repair; five prevents selection.",
            "Every existing occupancy, pause, Blocked, intent and ownership guard retains its hold or wait; no queue or mutation is emitted."
          ],
          "evidence": [
            "Exact PR and installed bundle revisions/hashes, commands, complete stdout/stderr/exits, full fixed expectations and input hashes; retain original failures and safe-hold evidence."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshots; retain frozen data and reports. Remove only separately identified disposable installation output after preserving evidence.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-28-OC05",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC3",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Prescribed missing/invalid/conflicting history controls plus stack_update_request, non-null actual stack parent and null/closed/merged/unknown existing PR boundaries from S09 and S23–S28; complete other facts independently."
          ],
          "steps": [
            "Run the bounded frozen controls and ordinary current-proof compatibility control.",
            "Inspect exact wait/hold reasons and confirm no alternative ordinary ticket bypasses unresolved repair."
          ],
          "expected": [
            "Unproven or out-of-increment repair remains held or waiting with existing REPAIR_POLICY_PENDING or applicable proof/scope diagnostic.",
            "No stack coordination, new PR, changed pointer, historical completion promotion or invented request is produced; ordinary compatible current proof still works."
          ],
          "evidence": [
            "Exact PR and installed bundle revisions/hashes, commands, complete stdout/stderr/exits, full fixed expectations and input hashes; retain original failures and safe-hold evidence."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshots; retain frozen data and reports. Remove only separately identified disposable installation output after preserving evidence.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-28-OC06",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC3"
          ],
          "prerequisites": [
            "Prepared actual same-release installed preview and OC01 selection, OC04 cap and OC05 stack-wait inputs; disposable unrelated cwd, no provider credentials."
          ],
          "steps": [
            "Run the actual copied installed script in JSON and readable forms using the frozen external config/input files.",
            "Compare entire JSON results to fixed expectations and check readable selected ticket, scope, counts, reasons and no-effect statement.",
            "Follow the guide to identify a selected queued repair and its existing PR from the supplied facts; retain evidence before cleanup."
          ],
          "expected": [
            "Installed behavior matches the independent source expectations without requiring a new CLI flag, module path or unbuilt typed proposal.",
            "No provider access, credentials, writes or execution authority occur; unsupported stack repair remains explicitly deferred."
          ],
          "evidence": [
            "Exact PR and installed bundle revisions/hashes, commands, complete stdout/stderr/exits, full fixed expectations and input hashes; retain original failures and safe-hold evidence."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshots; retain frozen data and reports. Remove only separately identified disposable installation output after preserving evidence.",
            "owner": null,
            "steps": null
          }
        }
      ]
    },
    "automated_regression": "Existing-shape own repair selection and priority, exact same-ticket completed consumption, current/history authority separation, existing safety gates and actual copied installed CLI compatibility."
  },
  "open_questions": []
}
```

## R1-11: Preview the complete repair order

Prerequisites: R1-10/PGB-80, R1-25/PGB-113, R1-26/PGB-129 and R1-28/PGB-136, each ai_qa_complete. All original criteria and 42 complete cases below are preserved and remain NOT_RUN.

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

PGB-145/R1-31 is appended after the existing R1-11/R1-21 prerequisites. All original criteria, preparation and four human cases below remain unchanged.

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
- **Requirements:** AC2, AC4, TAC2.
- **Prerequisites/data:** Disabled install, enable, intentional stop, unexpected scheduler stop, configuration-only upgrade and removal fixtures. Current PR checkout; prepared local simulated provider data; no live customer actions. Controlled-clock histories with no completion at enable, config-only revision rotation, just before/at/after freshness expiry, and an installation that never starts.
- **Steps:**
  1. Run lifecycle harness for each transition.
  2. Inspect action state, evidence revision and retained-resource report.
  3. Evaluate startup and rotated-revision alarm histories through the full freshness window and beyond, without running a scan or a follow-up timer.
- **Expected:** Intentional stop disables actions and reports stopped; unexpected stop does not silence alarms; config changes rotate revision; removal retains scheduling state as promised. No missing-completion alarm before the current enablement freshness window expires; continued absence eventually alarms without worker help. Pre-enable metric-math grace never counts as a real scan. Failures/retries cannot reset grace, old revisions cannot satisfy it, and real error alarms remain effective during startup.
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

PGB-129/R1-26 is composed after PGB-113 and before PGB-81, with its unchanged six human cases. Current source is 26 Stories/116 cases; all original PGB-81 criteria and 42 full cases remain. Publication does not execute human acceptance or activate delivery.
