# Pig Boss release one: implementation Stories

Complete approved source catalogue: 51 Stories, 185 full human cases and zero AI cases, in dependency order. The original frozen observation remains 50 Stories and7 Tasks; only PGB-169 and the bounded PGB-159 amendment are later readbacks. Publication is not implementation, human acceptance, merge or activation. See [delivery and checks](README.md) and [provenance](publication.json).

## R1-01: Validate an editable work document

[PGB-71](https://scubapig.atlassian.net/browse/PGB-71)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Authors cannot yet distinguish a valid draft from a ticket that meets the new structured contract. Give them a local check with precise errors before any worker starts.",
  "prerequisites": [],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "A local command reports draft validity separately from start validity, with the field path and reason for each failure."
    },
    {
      "id": "AC2",
      "requirement": "Complete skeletons keep every declared null/list; populated examples pass shape checks while required nulls fail start checks."
    },
    {
      "id": "AC3",
      "requirement": "Ambiguous or unsafe YAML and non-JSON values fail before evaluation; the command performs no network calls or writes."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own canonical installed Epic/ticket schemas and safe extraction/parsing; move rather than maintain divergent design copies and update their references.",
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
        "requirement": "Own canonical installed Epic/ticket schemas and safe extraction/parsing; move rather than maintain divergent design copies and update their references."
      },
      {
        "id": "TAC2",
        "requirement": "Use standard YAML 1.2 parsing and JSON Schema 2020-12; reject duplicates, aliases, custom tags, extra documents, unknown fields/versions, non-string keys, lone surrogates and unsafe integers/nonfinite numbers."
      },
      {
        "id": "TAC3",
        "requirement": "Define and enforce byte/depth/list limits; validate Unicode and canonical JSON compatibility before hashing. Produce readable and JSON diagnostics."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-01-H01",
          "R1-01-H02"
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
          "id": "R1-01-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1"
          ],
          "prerequisites": [
            "Blank and populated reviewed Epic/ticket examples; no credentials."
          ],
          "steps": [
            "Run the new validate-work command in draft mode on each example.",
            "Run start validation on the same files.",
            "Fill one missing requirement and repeat."
          ],
          "expected": [
            "Draft recognizes complete editable skeletons; start lists missing fields; populated shape passes; a successful shape check makes no live-readiness claim."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-01-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "One fixture per forbidden syntax/value and at-limit/over-limit documents."
          ],
          "steps": [
            "Run validation for each fixture.",
            "Inspect exit status and output.",
            "Inspect directory/network-call audit."
          ],
          "expected": [
            "Every invalid fixture fails at its precise field without coercion, execution or network/write activity; supported boundary values pass."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "CLI contract tests for safe extraction, draft/start distinction and bounded canonical value handling."
  },
  "open_questions": []
}
```

## R1-02: Check the complete prescribed test plan

[PGB-72](https://scubapig.atlassian.net/browse/PGB-72)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "A well-shaped ticket can still have missing acceptance coverage or an impossible QA order. Authors need these errors before marking it ready.",
  "prerequisites": [
    {
      "ticket": "R1-01",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The command checks unique IDs, requirement coverage, named references, preparation consumers, prerequisite graphs and supported skill order against supplied trusted configuration."
    },
    {
      "id": "AC2",
      "requirement": "API parents invoke their one Bruno child once; bindings only read earlier declared outputs; human cases never enter AI dispatch."
    },
    {
      "id": "AC3",
      "requirement": "An explicit all-human plan passes with complete cases and reason; missing scope, expectations or skill availability cannot be deferred as preparation."
    },
    {
      "id": "AC4",
      "requirement": "Start validation rejects a plan whose complete handoff ledger cannot fit supported publication bounds; it never drops cases to make it fit."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own local semantic validation only; native Jira freshness, access and occupancy remain separate live gates.",
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
        "requirement": "Own local semantic validation only; native Jira freshness, access and occupancy remain separate live gates."
      },
      {
        "id": "TAC2",
        "requirement": "Enforce database parameter indices, read-only async observation schedule/deadline, evidence checkpoints, cleanup and access-owner requirements from the reviewed contract."
      },
      {
        "id": "TAC3",
        "requirement": "The installed skill allowlist and customer scope are trusted inputs, not ticket-supplied authority."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-02-H01",
          "R1-02-H02",
          "R1-02-H03"
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
          "id": "R1-02-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC3"
          ],
          "prerequisites": [
            "Reviewed mixed API/DB/UI plan plus a complete non-runtime human-only plan."
          ],
          "steps": [
            "Validate both with the approved skill/config fixtures.",
            "Remove one requirement reference; put a human case or Bruno child in dispatch; change a helper skill.",
            "Validate each mutation."
          ],
          "expected": [
            "Valid plans pass; each mutation reports its field and prevents start; no execution or human PASS is emitted."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-02-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Fixtures for missing/cyclic/forward references, duplicate IDs, SQL binding, observation deadline and preparation contracts."
          ],
          "steps": [
            "Validate each valid fixture.",
            "Apply its paired invalid mutation and rerun."
          ],
          "expected": [
            "Only explicit earlier outputs and mechanical preparation slots pass; expectation/scope deferral, async mutation and invalid deadlines fail."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-02-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC4"
          ],
          "prerequisites": [
            "Plans at and beyond supported ledger size with nonempty evidence requirements."
          ],
          "steps": [
            "Validate the boundary plans.",
            "Inspect reported omitted entries and budget errors."
          ],
          "expected": [
            "Supported plans retain every case; over-budget plan fails start with zero truncation."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Behavioral CLI tests for semantic readiness, dispatch, preparation and full-ledger publication limits."
  },
  "open_questions": []
}
```

## R1-03: Write complete Epic and ticket YAML

[PGB-73](https://scubapig.atlassian.net/browse/PGB-73)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The existing writing skill produces prose tickets. Humans and workers need the same editable structure for workstream order, scope and prescribed tests.",
  "prerequisites": [
    {
      "ticket": "R1-01",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-02",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The existing writer emits complete versioned Epic and Story/Bug skeletons with visible nulls and explicit empty lists."
    },
    {
      "id": "AC2",
      "requirement": "It preserves human-writing, provenance, the required story sections and one-repository/PR, 20-file and under-two-day boundaries; oversized work splits and discovery stays a Task."
    },
    {
      "id": "AC3",
      "requirement": "It records full numbered stream order on the Epic and complete requirements, scope, prerequisites and AI/human cases on each ticket."
    },
    {
      "id": "AC4",
      "requirement": "It identifies missing start fields without inventing inputs or changing Jira readiness. Requesting rework is a separate skill."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own writer instructions/examples and their validator integration; canonical schemas stay shared.",
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
        "requirement": "Own writer instructions/examples and their validator integration; canonical schemas stay shared."
      },
      {
        "id": "TAC2",
        "requirement": "Native title/type/status/parent/labels remain Jira-owned. Structured work cannot extend configured repositories or permissions."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-03-H01",
          "R1-03-H02"
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
          "id": "R1-03-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC1"
          ],
          "prerequisites": [
            "Three prepared briefs: one Epic with two streams, one mixed-case Story and one human-only Bug; approved repository facts supplied."
          ],
          "steps": [
            "Use the writer with each brief and save the result.",
            "Run draft/start validation.",
            "Have a human edit one requirement value and rerun."
          ],
          "expected": [
            "Full structures and required sections remain readable; known complete brief passes; human edit needs no structural redesign."
          ],
          "evidence": [
            "saved authoring conversations, YAML, validation output and human readability notes; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-03-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC4",
            "TAC2"
          ],
          "prerequisites": [
            "Briefs with missing repository, unsupported QA engine, scope requiring two repos, and >20-file or >=2-day work."
          ],
          "steps": [
            "Ask the writer to prepare each brief.",
            "Inspect proposed items and run start validation."
          ],
          "expected": [
            "Missing inputs stay explicit; scope splits into bounded items or discovery Task; no worker label/status change and no rework action."
          ],
          "evidence": [
            "saved outputs and validation diagnostics; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Skill contract/examples tests for full skeleton, limits, shared references and draft/start failures."
  },
  "open_questions": []
}
```

## R1-04: Validate assignment and handoff evidence

[PGB-74](https://scubapig.atlassian.net/browse/PGB-74)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Workers and the manager need to agree on which assignment and PR revision a result belongs to. Shape checks alone cannot establish that evidence chain.",
  "prerequisites": [
    {
      "ticket": "R1-01",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-02",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "A local command validates typed results against supplied assignment, requirement, PR and provider receipts and returns readable/JSON errors."
    },
    {
      "id": "AC2",
      "requirement": "It rejects edited/deleted/conflicting/spoofed records and incomplete or stale implementation-review-QA chains."
    },
    {
      "id": "AC3",
      "requirement": "It accepts a full human-only completion honestly and retains partial QA/NOT_RUN evidence on repair or blocker results."
    },
    {
      "id": "AC4",
      "requirement": "It distinguishes an explicitly authorized blocked-result resumption from unauthorized replacement without producing an unblock action."
    },
    {
      "id": "AC5",
      "requirement": "Admission binds the immutable project ID; role receipts inherit it through their assignment and reject a moved issue or foreign-site receipt."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own canonical schemas, RFC8785 digests, safe ADF/HTML code-block recovery and receipt-chain semantics; supplied receipt validation is not a live provider read.",
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
        "requirement": "Own canonical schemas, RFC8785 digests, safe ADF/HTML code-block recovery and receipt-chain semantics; supplied receipt validation is not a live provider read."
      },
      {
        "id": "TAC2",
        "requirement": "Enforce exact IDs, server actors/edit metadata, current assignment, one final logical role slot, PR identity, 16-KiB/depth/list bounds and all repair roots."
      },
      {
        "id": "TAC3",
        "requirement": "Workers do not access DynamoDB; the pointer is a lookup aid and shared identities are not proof of exclusive worker ownership."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-04-H01",
          "R1-04-H02",
          "R1-04-H03",
          "R1-04-H04"
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
          "id": "R1-04-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC3",
            "TAC1"
          ],
          "prerequisites": [
            "Synthetic complete new-work, repaired-parent and all-human chains with explicit server receipts."
          ],
          "steps": [
            "Run the receipt validator on each chain.",
            "Compare canonical digests across ADF and HTML forms."
          ],
          "expected": [
            "Equivalent forms yield the same digest; every AI/nested step and pending human ID is retained; zero AI cases is not reported as AI test success."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-04-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Paired mutations: actor/edit/assignment/digest/PR/revision conflict, missing page, partial ledger, duplicate root and over-budget record."
          ],
          "steps": [
            "Validate every mutation against the original supplied receipts.",
            "Inspect error path and verdict."
          ],
          "expected": [
            "No invalid chain is completion; conflicts and incomplete receipts identify the exact rejected reference with no write."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-04-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC4"
          ],
          "prerequisites": [
            "Initial blocked result, valid human authorization and resumed result; variants with wrong source, edited authorization, two leaves or successful prior result."
          ],
          "steps": [
            "Validate the valid chain.",
            "Validate each variant."
          ],
          "expected": [
            "Only the unique authorized unchanged assignment/revision chain succeeds; no tool creates a resume authorization or changes Jira."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-04-H04",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC5",
            "TAC2"
          ],
          "prerequisites": [
            "Two native projects with the same stream label; valid admission and moved-project/foreign-site variants.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions."
          ],
          "steps": [
            "Validate each complete receipt chain against trusted native metadata.",
            "Move the assigned issue to the other project in the fixture and repeat."
          ],
          "expected": [
            "Only the original site/project assignment validates; repeated labels alone confer no authority."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        }
      ]
    },
    "automated_regression": "End-to-end local receipt validation with canonical encoding, authority, repair and resume counterexamples."
  },
  "open_questions": []
}
```

## R1-21: Configure Pig Boss for multiple projects

[PGB-99](https://scubapig.atlassian.net/browse/PGB-99)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "A company needs one installation and one editable configuration for several Jira projects. Per-project workflow differences and repeated labels must not create collisions.",
  "prerequisites": [
    {
      "ticket": "R1-04",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "A local configuration command validates one Jira site and multiple project IDs with explicit or inherited project mappings, repositories and worker prefixes."
    },
    {
      "id": "AC2",
      "requirement": "Readable and JSON output shows resolved project scope and rejects duplicate IDs, ambiguous mappings and untrusted destinations without provider writes."
    },
    {
      "id": "AC3",
      "requirement": "Preview of a configuration change identifies added/removed project scope and retained-work checks required before enablement; fifty project entries parse without imposing a ten-project cap."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own the canonical company configuration schema, normalization and zero-write local validation command; provide local configuration-change preview without policy scheduling or live provider discovery.",
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
        "requirement": "Own the canonical company configuration schema, normalization and zero-write local validation command; provide local configuration-change preview without policy scheduling or live provider discovery."
      },
      {
        "id": "TAC2",
        "requirement": "Use immutable project IDs and collision-free tuple encoding of site/project/full-label. Project keys and board IDs are display/context only."
      },
      {
        "id": "TAC3",
        "requirement": "No new editable cloud binding file, secret values, global label uniqueness, automatic provisioning or multi-writer ownership service. Native metadata remains authoritative."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-21-H01",
          "R1-21-H02",
          "R1-21-H03"
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
          "id": "R1-21-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC2",
            "TAC1"
          ],
          "prerequisites": [
            "Valid two-project and fifty-project local configuration fixtures with equal labels and different workflow IDs.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions."
          ],
          "steps": [
            "Run local validation in readable and JSON modes.",
            "Inspect resolved project maps and independent stream keys."
          ],
          "expected": [
            "Both valid configurations pass; project mappings remain separate; parsing fifty entries is not a runtime throughput claim."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        },
        {
          "id": "R1-21-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "TAC3"
          ],
          "prerequisites": [
            "Duplicate project ID, missing inherited mapping, untrusted origin and secret-value fixtures.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions."
          ],
          "steps": [
            "Validate each fixture.",
            "Inspect errors and captured output."
          ],
          "expected": [
            "Errors name safe field paths; no secret contents, provider calls or writes."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        },
        {
          "id": "R1-21-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "TAC2"
          ],
          "prerequisites": [
            "Previous and next configs that add/remove a project and rename only a key.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions."
          ],
          "steps": [
            "Compare configurations with local preview.",
            "Inspect required retained-state/readiness checks."
          ],
          "expected": [
            "Output distinguishes key rename from identity removal; removal cannot authorize erasing prior state or enabling until retained work is checked."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        }
      ]
    },
    "automated_regression": "Add CLI/application and provider-adapter contract coverage for the prescribed normal, failure, identity and permission outcomes; keep local fixtures separate from installed AWS/Jira acceptance."
  },
  "open_questions": []
}
```

## R1-31: Check Jira read configuration before use

[PGB-145](https://scubapig.atlassian.net/browse/PGB-145)

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

## R1-38: Read native Jira observations accurately

[PGB-152](https://scubapig.atlassian.net/browse/PGB-152)

### Problem to solve

A caller inspecting a visible issue currently loses its pointer and comments when its description is empty. The same caller can receive a false changed-input failure when Jira returns an unchanged comment with a different JSON member order. Both failures prevent a truthful bounded inspection.

### Acceptance Criteria

- **AC1.** A named issue with an explicit null description retains that absence and completes its requested pointer, comment-page and exact-comment reads when those responses are otherwise valid. A missing description remains a response-shape failure.
- **AC2.** An exact comment with the same JSON body value and server metadata completes even when root or nested object members arrive in a different order. A changed content-array order or existing metadata mismatch remains CHANGED_INPUT; an unmatched exact value is not retained as accepted.
- **AC3.** The safe report, private observation boundary, limits, partial-result behavior and cleanup remain intact. The source guide explains empty descriptions and semantic comment comparison without claiming valid work, complete domain inventory or installed delivery.

### Technical Acceptance Criteria

- **TAC1.** Repository danielchappell/Pigboard; this native child targets the pinned PGB-150 source feature branch at 95c711999b90b20842dfd172f7966f73c8cfde34 and owns exactly the eight reviewed paths. PGB-145 is its sole native ai_qa_complete prerequisite; PGB-150 receives this child as its own prerequisite.
- **TAC2.** Preserve inspectJiraIssues(configInput,{issue_ids,comment_targets},{resolveSecret}), the existing string/null consumer shape, raw/private byte meanings, validation, credentials, TLS, scope restrictions and no-effect controls. Correct only the demonstrated issue-description normalization and exact-comment comparison sites.
- **TAC3.** Keep the existing 35-variant packet, eight controls and private-projection case unchanged. Add only the four prescribed finite regression subcases through the existing importable test fixture API with independent literal observations, counters, cleanup and source/input/runtime preservation. Document current effort and native-only repair history without claiming complete source/native inventory.

### Testing Strategy

Human acceptance remains NOT_RUN. AI cases: zero.

#### R1-38-H01

- R1-38-H01
- human
- designated human reviewer
- AC1
- AC3
- TAC1
- TAC2
- TAC3
- PREP-01 supplies reviewed source import commands and independent literal oracles for null-description and missing-description; use fresh dummy data and prepared dependencies.
- No live Jira, provider, Postman, UI, installed runtime or dependency fetch is required.
- From the reviewed source checkout, run the null-description subcase through the importable fixture API. Compare the retained issue body:null, four-read issue→pointer→page→exact trace, complete phases, safe JSON, counters, zero effects and cleanup.
- Run the missing-description control on fresh data. Compare the one-read RESPONSE_INVALID stop, no retained issue and all later phases not_requested.
- Inspect source/input/runtime before-after hashes and record the exact revision, command, outputs and cleanup.
- null-description completes four GETs with attempts/completed/failed 4/4/0, wire lengths 146+265+258+206=875 and private serialized bytes 1109. The issue body is literal null, not an empty document; pointer, page and exact observations complete.
- missing-description fails after one issue GET with RESPONSE_INVALID, 127 received bytes, zero retained observation bytes and no pointer/page/exact request. Both have resolver_calls=1, effects=0, cleanup_complete and unchanged hashes.
- Safe JSON omits private bodies, retains inspection_scope requested_issues/domain_complete false/admission and receipt_proof not_evaluated. Null inventory is not valid startable work.
- Tested child PR revision, pinned parent revision, exact import command, fixture and prepared dependency identity.
- Safe report, private acquisition comparison, permitted GET trace, wire and private byte counters, resolver/effects audit, before/after hashes and cleanup result.
- Any failed or unverified step with its actual stop point; local observations do not establish live provider, installed-runtime or activation acceptance.
- prescribed
- designated human reviewer
- Retain the PR revision, exact source invocation and literal comparison evidence. Close local fixture servers, sockets and timers; verify cleanup_complete and unchanged source/input/runtime hashes.
- Remove only disposable source-derived fixtures. Preserve the reviewed source, first failure evidence and all retained results. No live Jira or operational-state changes.

#### R1-38-H02

- R1-38-H02
- human
- designated human reviewer
- AC2
- AC3
- TAC2
- TAC3
- PREP-01 supplies reviewed source import commands and independent literal oracles for adf-nested-order and adf-array-change; use fresh dummy data and prepared dependencies.
- Retain original endpoint-specific ADF strings in private observations; do not rewrite the packet or derive expected values from the reader.
- Run adf-nested-order through the importable fixture API. Compare root, paragraph and text object member reordering with the same JSON value and metadata, distinct retained endpoint strings, four-read trace, safe/private reports, counters and cleanup.
- Run adf-array-change on fresh data. Compare the B-then-A content array with the A-then-B page value and confirm CHANGED_INPUT with no accepted exact comment.
- Inspect the unchanged existing exact-mismatch timestamp-sensitive case, zero effects and source/input/runtime preservation; record revision, commands, outputs and cleanup.
- adf-nested-order completes with 4/4/0 GETs, wire lengths 181+265+344+292=1082 and private serialized bytes 1370; same JSON value and metadata complete despite object-member order. Both original body strings remain distinct and retained.
- adf-array-change is incomplete/CHANGED_INPUT after 4/4/0 GETs and the same 1082 wire bytes; private serialized bytes are 1048. Earlier issue/pointer/page acquisition remains; exact_comments is empty. Changed array order and real metadata mismatch remain failures.
- Both have resolver_calls=1, effects=0, cleanup_complete and unchanged hashes. Safe JSON omits private data and does not claim whole-domain inventory, proof or admission.
- Tested child PR revision, pinned parent revision, exact import command, fixture and prepared dependency identity.
- Safe report, private acquisition comparison, permitted GET trace, wire and private byte counters, resolver/effects audit, before/after hashes and cleanup result.
- Any failed or unverified step with its actual stop point; local observations do not establish live provider, installed-runtime or activation acceptance.
- prescribed
- designated human reviewer
- Retain the PR revision, exact source invocation and literal comparison evidence. Close local fixture servers, sockets and timers; verify cleanup_complete and unchanged source/input/runtime hashes.
- Remove only disposable source-derived fixtures. Preserve the reviewed source, first failure evidence and all retained results. No live Jira or operational-state changes.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "A caller inspecting a visible issue currently loses its pointer and comments when its description is empty. The same caller can receive a false changed-input failure when Jira returns an unchanged comment with a different JSON member order. Both failures prevent a truthful bounded inspection.",
  "prerequisites": [
    {
      "ticket": "R1-31",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "A named issue with an explicit null description retains that absence and completes its requested pointer, comment-page and exact-comment reads when those responses are otherwise valid. A missing description remains a response-shape failure."
    },
    {
      "id": "AC2",
      "requirement": "An exact comment with the same JSON body value and server metadata completes even when root or nested object members arrive in a different order. A changed content-array order or existing metadata mismatch remains CHANGED_INPUT; an unmatched exact value is not retained as accepted."
    },
    {
      "id": "AC3",
      "requirement": "The safe report, private observation boundary, limits, partial-result behavior and cleanup remain intact. The source guide explains empty descriptions and semantic comment comparison without claiming valid work, complete domain inventory or installed delivery."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "codex/pgb150-source-inspection",
      "change_boundary": "One eight-path child PR corrects explicit null issue descriptions and semantic exact-comment comparison in the pinned PGB-150 source feature. It adds four finite source regressions, guide and native-only publication support; no source Story is composed.",
      "out_of_scope": [
        "No customer repository, installed bundle, manager state, policy, admission, proof, provider probe, activation or new transport/credential path.",
        "No fixture packet JSON/TLS/harness rewrite, source contract-count change or production parser format change."
      ],
      "related_repositories": []
    },
    "accepted_decisions": [],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Repository danielchappell/Pigboard; this native child targets the pinned PGB-150 source feature branch at 95c711999b90b20842dfd172f7966f73c8cfde34 and owns exactly the eight reviewed paths. PGB-145 is its sole native ai_qa_complete prerequisite; PGB-150 receives this child as its own prerequisite."
      },
      {
        "id": "TAC2",
        "requirement": "Preserve inspectJiraIssues(configInput,{issue_ids,comment_targets},{resolveSecret}), the existing string/null consumer shape, raw/private byte meanings, validation, credentials, TLS, scope restrictions and no-effect controls. Correct only the demonstrated issue-description normalization and exact-comment comparison sites."
      },
      {
        "id": "TAC3",
        "requirement": "Keep the existing 35-variant packet, eight controls and private-projection case unchanged. Add only the four prescribed finite regression subcases through the existing importable test fixture API with independent literal observations, counters, cleanup and source/input/runtime preservation. Document current effort and native-only repair history without claiming complete source/native inventory."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Pinned Pigboard PGB-150 source branch at 95c711999b90b20842dfd172f7966f73c8cfde34 with prepared Node dependencies and disposable local HTTPS fixtures; no live Jira or installed runtime.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "Four literal source regression subcases: null-description, missing-description, adf-nested-order and adf-array-change. The original 35 variants, eight controls and private projection remain unchanged.",
        "initial_state": "Fresh dummy local HTTPS server and source-derived fixture per subcase. Only the named response field/body member order changes from the guide-and-install input.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Reviewed PR-bound exact source import commands and four independently authored literal expected safe/private reports, GET traces, wire/private byte counts and preservation hashes from the sealed regression design; no oracle is derived from production output.",
        "used_by": [
          "DATA-01",
          "R1-38-H01",
          "R1-38-H02"
        ],
        "preserves": [
          "Pinned PGB-150 source API, existing 35-variant/eight-control/private-projection packet, fixed HTTPS/TLS, dummy secret resolver, count/byte/time limits and no-effect controls.",
          "Four named subcases and their exact literal values; no new provider run, raised bound, test-only production hook, changed fixture packet JSON/TLS/harness or inferred acceptance."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "The currently approved automated QA skills do not execute this source library and local HTTPS fixture contract. QA skills are []; two designated human groups remain NOT_RUN until separately executed or dispositioned. Developer tests, independent QA, CI and code review are separate.",
      "cases": [
        {
          "id": "R1-38-H01",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC1",
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "PREP-01 supplies reviewed source import commands and independent literal oracles for null-description and missing-description; use fresh dummy data and prepared dependencies.",
            "No live Jira, provider, Postman, UI, installed runtime or dependency fetch is required."
          ],
          "steps": [
            "From the reviewed source checkout, run the null-description subcase through the importable fixture API. Compare the retained issue body:null, four-read issue→pointer→page→exact trace, complete phases, safe JSON, counters, zero effects and cleanup.",
            "Run the missing-description control on fresh data. Compare the one-read RESPONSE_INVALID stop, no retained issue and all later phases not_requested.",
            "Inspect source/input/runtime before-after hashes and record the exact revision, command, outputs and cleanup."
          ],
          "expected": [
            "null-description completes four GETs with attempts/completed/failed 4/4/0, wire lengths 146+265+258+206=875 and private serialized bytes 1109. The issue body is literal null, not an empty document; pointer, page and exact observations complete.",
            "missing-description fails after one issue GET with RESPONSE_INVALID, 127 received bytes, zero retained observation bytes and no pointer/page/exact request. Both have resolver_calls=1, effects=0, cleanup_complete and unchanged hashes.",
            "Safe JSON omits private bodies, retains inspection_scope requested_issues/domain_complete false/admission and receipt_proof not_evaluated. Null inventory is not valid startable work."
          ],
          "evidence": [
            "Tested child PR revision, pinned parent revision, exact import command, fixture and prepared dependency identity.",
            "Safe report, private acquisition comparison, permitted GET trace, wire and private byte counters, resolver/effects audit, before/after hashes and cleanup result.",
            "Any failed or unverified step with its actual stop point; local observations do not establish live provider, installed-runtime or activation acceptance."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain the PR revision, exact source invocation and literal comparison evidence. Close local fixture servers, sockets and timers; verify cleanup_complete and unchanged source/input/runtime hashes.",
              "Remove only disposable source-derived fixtures. Preserve the reviewed source, first failure evidence and all retained results. No live Jira or operational-state changes."
            ]
          }
        },
        {
          "id": "R1-38-H02",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "PREP-01 supplies reviewed source import commands and independent literal oracles for adf-nested-order and adf-array-change; use fresh dummy data and prepared dependencies.",
            "Retain original endpoint-specific ADF strings in private observations; do not rewrite the packet or derive expected values from the reader."
          ],
          "steps": [
            "Run adf-nested-order through the importable fixture API. Compare root, paragraph and text object member reordering with the same JSON value and metadata, distinct retained endpoint strings, four-read trace, safe/private reports, counters and cleanup.",
            "Run adf-array-change on fresh data. Compare the B-then-A content array with the A-then-B page value and confirm CHANGED_INPUT with no accepted exact comment.",
            "Inspect the unchanged existing exact-mismatch timestamp-sensitive case, zero effects and source/input/runtime preservation; record revision, commands, outputs and cleanup."
          ],
          "expected": [
            "adf-nested-order completes with 4/4/0 GETs, wire lengths 181+265+344+292=1082 and private serialized bytes 1370; same JSON value and metadata complete despite object-member order. Both original body strings remain distinct and retained.",
            "adf-array-change is incomplete/CHANGED_INPUT after 4/4/0 GETs and the same 1082 wire bytes; private serialized bytes are 1048. Earlier issue/pointer/page acquisition remains; exact_comments is empty. Changed array order and real metadata mismatch remain failures.",
            "Both have resolver_calls=1, effects=0, cleanup_complete and unchanged hashes. Safe JSON omits private data and does not claim whole-domain inventory, proof or admission."
          ],
          "evidence": [
            "Tested child PR revision, pinned parent revision, exact import command, fixture and prepared dependency identity.",
            "Safe report, private acquisition comparison, permitted GET trace, wire and private byte counters, resolver/effects audit, before/after hashes and cleanup result.",
            "Any failed or unverified step with its actual stop point; local observations do not establish live provider, installed-runtime or activation acceptance."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain the PR revision, exact source invocation and literal comparison evidence. Close local fixture servers, sockets and timers; verify cleanup_complete and unchanged source/input/runtime hashes.",
              "Remove only disposable source-derived fixtures. Preserve the reviewed source, first failure evidence and all retained results. No live Jira or operational-state changes."
            ]
          }
        }
      ]
    },
    "automated_regression": "Four finite source regressions with literal private/report/trace/counter oracles; preserve the original 35 variants, eight controls and L06 private projection. Run the bounded affected source selection and both publication guards. Hosted CI, independent QA and designated human acceptance remain separate."
  },
  "open_questions": []
}
```

## R1-40: Reject duplicate Jira comment targets

[PGB-154](https://scubapig.atlassian.net/browse/PGB-154)

### Problem to solve

A source caller can request one exact Jira comment twice by reversing the two target fields. The invalid request currently resolves credentials and performs duplicate reads instead of stopping before provider access.

### Acceptance Criteria

- **AC1.** Duplicate ticket/comment ID pairs are invalid regardless of object-member order: report invalid/INPUT_INVALID before resolver invocation, Jira requests or private observation, without mutating the input.
- **AC2.** One unique target with reversed member order completes the same bounded native inspection as before. Existing shape, membership, security, limits, private output and the PGB-152 null/ADF corrections remain intact.
- **AC3.** The source guide states that target identity is the ticket/comment pair. Native-only delivery records distinguish implemented behavior, dated publication facts and separate verification, human acceptance and integration evidence.

### Technical Acceptance Criteria

- **TAC1.** Repository danielchappell/Pigboard; one eight-path child PR targets the pinned PGB-150 feature branch at 1524127c6d9ffbad8481cf7ce86bcc19cb712f52. PGB-145 is its sole native ai_qa_complete prerequisite; PGB-150 adds this child as a prerequisite without losing PGB-145 or PGB-152.
- **TAC2.** Preserve inspectJiraIssues and validation order. Compare the two already validated string IDs as one fixed ordered pair; do not deduplicate, coerce, sort caller keys, change membership, resolve a secret for invalid input or add a transport capability.
- **TAC3.** Preserve all 35 original fixture variants, eight controls, private projection and four PGB-152 regression subcases. Add only the two finite source subcases through the existing fixture API with independent literal reports, traces, counters, cleanup and preservation checks.

### Testing Strategy

Human acceptance remains NOT_RUN. AI cases: zero.

#### R1-40-H01

- R1-40-H01
- human
- designated human reviewer
- AC1
- AC2
- AC3
- TAC1
- TAC2
- TAC3
- PREP-01 supplies the exact reviewed source command, dummy HTTPS fixtures and independent literal oracles. Use fresh data and prepared dependencies.
- No live Jira, provider, Postman, UI, installed runtime or dependency fetch is required.
- Run duplicate-target-member-order with two targets for ticket_id 1000/comment_id 2001 in reversed member order. Compare invalid/INPUT_INVALID before the resolver, all-zero counters, no private rows or GETs, and unchanged input/runtime hashes.
- Run unique-target-member-order on fresh data with one reversed-order target and the original four replies. Compare the complete guide-and-install acquisition, ordered four-GET trace, literal safe/private reports, byte counts and cleanup.
- Record exact revision, command, report, traces, counters, resolver/effects audit, before/after hashes and human result.
- Duplicate pair: invalid with exactly one INPUT_INVALID diagnostic at null operation/issue/scope; issue/scope/private arrays empty, limits null, all request/byte/elapsed counters zero, resolver_calls 0, server and client traces empty, effects 0, cleanup_complete, Jira not_started and resolver settled. No secret access, fallback or mutation.
- Unique reversed pair: complete with no diagnostics; 4/4/0 GETs in issue→pointer→page→exact order; wire bytes 181+265+258+206=910, private serialized bytes 1154, resolver_calls 1, effects 0, cleanup_complete and unchanged input/runtime hashes. The original literal guide acquisition is retained.
- Safe JSON omits private observations; no whole-domain discovery, receipt proof, admission, human acceptance or activation is inferred from fixture completion.
- Exact reviewed child revision and source import command, fixture and dependency identity.
- Safe report, private acquisition comparison, resolver and effects audit, GET trace, byte counters, before/after input/runtime hashes and cleanup result.
- Retain any failed/unverified step with its actual stop point; local source observation does not establish human, live-provider or installed acceptance.
- prescribed
- designated human reviewer
- Retain evidence and close disposable HTTPS fixture servers, sockets and timers; verify cleanup_complete and unchanged input/runtime hashes.
- Remove only disposable fixture data. Preserve the reviewed source, original failure record and retained reports. Make no live Jira or operational-state changes.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "A source caller can request one exact Jira comment twice by reversing the two target fields. The invalid request currently resolves credentials and performs duplicate reads instead of stopping before provider access.",
  "prerequisites": [
    {
      "ticket": "R1-31",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "Duplicate ticket/comment ID pairs are invalid regardless of object-member order: report invalid/INPUT_INVALID before resolver invocation, Jira requests or private observation, without mutating the input."
    },
    {
      "id": "AC2",
      "requirement": "One unique target with reversed member order completes the same bounded native inspection as before. Existing shape, membership, security, limits, private output and the PGB-152 null/ADF corrections remain intact."
    },
    {
      "id": "AC3",
      "requirement": "The source guide states that target identity is the ticket/comment pair. Native-only delivery records distinguish implemented behavior, dated publication facts and separate verification, human acceptance and integration evidence."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "codex/pgb150-source-inspection",
      "change_boundary": "One eight-path native-only child PR fixes exact-comment target uniqueness in the pinned PGB-150 feature; source Story counts stay unchanged.",
      "out_of_scope": [
        "No customer repository, installed runtime, manager state, proof, policy, admission, live provider, deployment or activation change.",
        "No generic parser, canonicalizer, new dependency, transport, credential path, fixture packet rewrite or limit change."
      ],
      "related_repositories": []
    },
    "accepted_decisions": [],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Repository danielchappell/Pigboard; one eight-path child PR targets the pinned PGB-150 feature branch at 1524127c6d9ffbad8481cf7ce86bcc19cb712f52. PGB-145 is its sole native ai_qa_complete prerequisite; PGB-150 adds this child as a prerequisite without losing PGB-145 or PGB-152."
      },
      {
        "id": "TAC2",
        "requirement": "Preserve inspectJiraIssues and validation order. Compare the two already validated string IDs as one fixed ordered pair; do not deduplicate, coerce, sort caller keys, change membership, resolve a secret for invalid input or add a transport capability."
      },
      {
        "id": "TAC3",
        "requirement": "Preserve all 35 original fixture variants, eight controls, private projection and four PGB-152 regression subcases. Add only the two finite source subcases through the existing fixture API with independent literal reports, traces, counters, cleanup and preservation checks."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Pinned PGB-150 feature branch at 1524127c6d9ffbad8481cf7ce86bcc19cb712f52 with prepared Node dependencies and disposable local HTTPS fixtures; no live Jira or installed runtime.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "Two source-derived guide-and-install subcases: duplicate-target-member-order and unique-target-member-order. The original fixture packet and PGB-152 cases remain unchanged.",
        "initial_state": "Fresh dummy local HTTPS server per subcase. The negative adds a reordered duplicate target and one unused exact reply; the positive reverses the sole target member order while retaining the four original replies.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Reviewed source import commands, prepared absolute root and independently authored literal safe/private oracles, request traces, counters, preservation hashes and cleanup checks for the two named subcases.",
        "used_by": [
          "DATA-01",
          "R1-40-H01"
        ],
        "preserves": [
          "The original 35-variant packet, eight controls, private projection and four PGB-152 source regression subcases.",
          "Fixed HTTPS/TLS, dummy trusted resolver, existing finite bounds, no-effect controls and original guide acquisition. No provider run or oracle generated from production output."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "No approved automated QA skill executes this source library/local HTTPS fixture. qa_skills are []; the one designated human group remains NOT_RUN until separately observed or dispositioned. Developer tests, independent QA, CI and code review are separate.",
      "cases": [
        {
          "id": "R1-40-H01",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "PREP-01 supplies the exact reviewed source command, dummy HTTPS fixtures and independent literal oracles. Use fresh data and prepared dependencies.",
            "No live Jira, provider, Postman, UI, installed runtime or dependency fetch is required."
          ],
          "steps": [
            "Run duplicate-target-member-order with two targets for ticket_id 1000/comment_id 2001 in reversed member order. Compare invalid/INPUT_INVALID before the resolver, all-zero counters, no private rows or GETs, and unchanged input/runtime hashes.",
            "Run unique-target-member-order on fresh data with one reversed-order target and the original four replies. Compare the complete guide-and-install acquisition, ordered four-GET trace, literal safe/private reports, byte counts and cleanup.",
            "Record exact revision, command, report, traces, counters, resolver/effects audit, before/after hashes and human result."
          ],
          "expected": [
            "Duplicate pair: invalid with exactly one INPUT_INVALID diagnostic at null operation/issue/scope; issue/scope/private arrays empty, limits null, all request/byte/elapsed counters zero, resolver_calls 0, server and client traces empty, effects 0, cleanup_complete, Jira not_started and resolver settled. No secret access, fallback or mutation.",
            "Unique reversed pair: complete with no diagnostics; 4/4/0 GETs in issue→pointer→page→exact order; wire bytes 181+265+258+206=910, private serialized bytes 1154, resolver_calls 1, effects 0, cleanup_complete and unchanged input/runtime hashes. The original literal guide acquisition is retained.",
            "Safe JSON omits private observations; no whole-domain discovery, receipt proof, admission, human acceptance or activation is inferred from fixture completion."
          ],
          "evidence": [
            "Exact reviewed child revision and source import command, fixture and dependency identity.",
            "Safe report, private acquisition comparison, resolver and effects audit, GET trace, byte counters, before/after input/runtime hashes and cleanup result.",
            "Retain any failed/unverified step with its actual stop point; local source observation does not establish human, live-provider or installed acceptance."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain evidence and close disposable HTTPS fixture servers, sockets and timers; verify cleanup_complete and unchanged input/runtime hashes.",
              "Remove only disposable fixture data. Preserve the reviewed source, original failure record and retained reports. Make no live Jira or operational-state changes."
            ]
          }
        }
      ]
    },
    "automated_regression": "Two finite source subcases with literal zero-call rejection and four-call positive-control oracles; retain the original packet and PGB-152 regressions, then run the bounded affected source selection and both publication guards. Hosted CI and human acceptance remain separate."
  },
  "open_questions": []
}
```

## R1-41: Reconcile the source inspection delivery record

[PGB-155](https://scubapig.atlassian.net/browse/PGB-155)

### Problem to solve

The implemented source inspection API and the offline repair preview have separate reviewed delivery records. A contributor needs one truthful source catalog that preserves both histories and shows the remaining source and native differences.

### Acceptance Criteria

- **AC1.** The catalog includes the implemented R1-36 contract and its four source human groups, with 31 source Stories/136 groups and an explicit partial-inventory limitation.
- **AC2.** A reviewer can recover both complete prior publication records and all native contracts, links, source/runtime fingerprints and dated observations without treating historical counts as current.
- **AC3.** Current ownership, forecasts, dependencies and evidence distinguish source inspection, catalog completion, installed PGB-147 work and final PGB-82 acceptance; no pending or accepted human observation is reported PASS.

### Technical Acceptance Criteria

- **TAC1.** Repository danielchappell/Pigboard; one ten-path PR stacked on the exact reviewed runtime candidate. Its actual revision/tree and State/main ancestry must be bound in implementation evidence before catalog coding; publication does not bind that future candidate.
- **TAC2.** Preserve PGB-150 original 5 AC/4 TAC/4 human groups and 35 variants/eight controls/private projection; retain PGB-152/PGB-154 repairs and all State runtime/history records. Native PGB-145 is the catalog child’s only ai_qa_complete prerequisite; PGB-150 gains this child as an additional prerequisite.
- **TAC3.** Both whole predecessor publications and all nine complete amendment objects must reconstruct exactly. Existing actual 25-file State runtime-byte checks remain live; missing, changed, extra or reordered history fails instead of being stripped.

### Testing Strategy

Human acceptance remains NOT_RUN. AI cases: zero.

#### R1-41-H01

- R1-41-H01
- human
- designated human reviewer
- AC1
- AC2
- AC3
- TAC1
- TAC2
- TAC3
- PREP-01 supplies the exact reviewed runtime/catalog revisions, prepared dependencies, complete native receipt and both predecessor publications.
- No credentials, live Jira, provider, Postman, UI or runtime fixture campaign is needed.
- Inspect the 31/136 source table, R1-36 contract, four human groups, 53 requirement rows and 41 original scenarios. Compare the exact PGB-150 native body before and after the catalog child prerequisite.
- Inspect the nine complete amendment hashes, both whole predecessor reconstructions, current State/main ancestry, 8/10/18 file ownership and actual 25-file runtime-byte comparison.
- Inspect the passing delivery guard transcript and compare current forecasts, pending source/native differences, human NOT_RUN and CI/merge/activation statements with the exact handoff evidence. Retain revision and comparison evidence.
- Every source entry and mapping agrees; current 31 Stories/136 groups is explicitly partial. The original PGB-150 5 AC/4 TAC/4 human groups and existing prerequisites remain unchanged except the actual catalog child prerequisite and concise ownership note.
- Both complete predecessor publications reconstruct exactly; all nine amendment objects and the actual 25-file runtime closure match their pinned hashes. Missing, changed, extra or reordered history fails.
- Source runtime and catalog allocations are separate, installed PGB-147 and final PGB-82 acceptance remain pending, and no pending/accepted human observation is labelled PASS. Any missing evidence remains unverified or NOT_RUN.
- Exact reviewed runtime and catalog revisions/trees, current native receipt, before/after parent body hashes and bound child key/link.
- 31/136/53/41 mapping, all nine object hashes, both predecessor hashes, 25-file runtime comparison and guard transcript.
- Current forecasts, pending dependency/status notes and any failed or unverified check with its stop point.
- prescribed
- designated human reviewer
- Retain the comparison evidence and reviewed revisions; remove only disposable evidence copies.
- Make no live Jira, provider, state, installation or activation change.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The implemented source inspection API and the offline repair preview have separate reviewed delivery records. A contributor needs one truthful source catalog that preserves both histories and shows the remaining source and native differences.",
  "prerequisites": [
    {
      "ticket": "R1-31",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The catalog includes the implemented R1-36 contract and its four source human groups, with 31 source Stories/136 groups and an explicit partial-inventory limitation."
    },
    {
      "id": "AC2",
      "requirement": "A reviewer can recover both complete prior publication records and all native contracts, links, source/runtime fingerprints and dated observations without treating historical counts as current."
    },
    {
      "id": "AC3",
      "requirement": "Current ownership, forecasts, dependencies and evidence distinguish source inspection, catalog completion, installed PGB-147 work and final PGB-82 acceptance; no pending or accepted human observation is reported PASS."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "codex/pgb150-source-inspection",
      "change_boundary": "One ten-path catalog PR stacked on the exact reviewed source runtime candidate; compose the source delivery record and exact history guards only.",
      "out_of_scope": [
        "No reader, fixture, source guide, installed Jira payload, provider probe, admission, policy, proof, AWS, customer repository or PGB-144 decision change.",
        "No native inventory claim, new QA engine, generic history stripping, test oracle relaxation or merge/activation authority."
      ],
      "related_repositories": []
    },
    "accepted_decisions": [],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Repository danielchappell/Pigboard; one ten-path PR stacked on the exact reviewed runtime candidate. Its actual revision/tree and State/main ancestry must be bound in implementation evidence before catalog coding; publication does not bind that future candidate."
      },
      {
        "id": "TAC2",
        "requirement": "Preserve PGB-150 original 5 AC/4 TAC/4 human groups and 35 variants/eight controls/private projection; retain PGB-152/PGB-154 repairs and all State runtime/history records. Native PGB-145 is the catalog child’s only ai_qa_complete prerequisite; PGB-150 gains this child as an additional prerequisite."
      },
      {
        "id": "TAC3",
        "requirement": "Both whole predecessor publications and all nine complete amendment objects must reconstruct exactly. Existing actual 25-file State runtime-byte checks remain live; missing, changed, extra or reordered history fails instead of being stripped."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Exact reviewed source runtime candidate to be bound before implementation; actual State/main a17841ee3e9e1a08a0ad3c322ae98fbff1cb41a9 and PGB-150 parent 7a06f7b25bbf79315f0a1e0763f1863d4b1f57f4 are planning context only, not the catalog implementation base.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "Read-only source catalog, current native child/parent receipt, both predecessor publication records, exact guard transcript and actual State runtime-byte comparison.",
        "initial_state": "Use the reviewed runtime plus catalog checkout with prepared dependencies and saved read-only evidence. Do not access live Jira, change native records or synthesize a current native inventory.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "PR-bound exact runtime/catalog revisions and trees, State/main ancestry, nine amendment object hashes, two whole predecessor hashes, current native receipt, finite guard command/result and 25-file runtime comparison.",
        "used_by": [
          "DATA-01",
          "R1-41-H01"
        ],
        "preserves": [
          "The original PGB-150 contract, four human groups and 35 variants/eight controls/private projection.",
          "All PGB-152/PGB-154 and State history, links and dated counts; no new runtime test campaign or current native inventory inferred."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "No approved automated QA skill executes this source-catalog comparison; qa_skills are []. One designated human group remains NOT_RUN until separately observed or dispositioned. Guard tests and independent code QA are separate evidence.",
      "cases": [
        {
          "id": "R1-41-H01",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "PREP-01 supplies the exact reviewed runtime/catalog revisions, prepared dependencies, complete native receipt and both predecessor publications.",
            "No credentials, live Jira, provider, Postman, UI or runtime fixture campaign is needed."
          ],
          "steps": [
            "Inspect the 31/136 source table, R1-36 contract, four human groups, 53 requirement rows and 41 original scenarios. Compare the exact PGB-150 native body before and after the catalog child prerequisite.",
            "Inspect the nine complete amendment hashes, both whole predecessor reconstructions, current State/main ancestry, 8/10/18 file ownership and actual 25-file runtime-byte comparison.",
            "Inspect the passing delivery guard transcript and compare current forecasts, pending source/native differences, human NOT_RUN and CI/merge/activation statements with the exact handoff evidence. Retain revision and comparison evidence."
          ],
          "expected": [
            "Every source entry and mapping agrees; current 31 Stories/136 groups is explicitly partial. The original PGB-150 5 AC/4 TAC/4 human groups and existing prerequisites remain unchanged except the actual catalog child prerequisite and concise ownership note.",
            "Both complete predecessor publications reconstruct exactly; all nine amendment objects and the actual 25-file runtime closure match their pinned hashes. Missing, changed, extra or reordered history fails.",
            "Source runtime and catalog allocations are separate, installed PGB-147 and final PGB-82 acceptance remain pending, and no pending/accepted human observation is labelled PASS. Any missing evidence remains unverified or NOT_RUN."
          ],
          "evidence": [
            "Exact reviewed runtime and catalog revisions/trees, current native receipt, before/after parent body hashes and bound child key/link.",
            "31/136/53/41 mapping, all nine object hashes, both predecessor hashes, 25-file runtime comparison and guard transcript.",
            "Current forecasts, pending dependency/status notes and any failed or unverified check with its stop point."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain the comparison evidence and reviewed revisions; remove only disposable evidence copies.",
              "Make no live Jira, provider, state, installation or activation change."
            ]
          }
        }
      ]
    },
    "automated_regression": "The two existing delivery-contract guard files assert exact current composition, both predecessor restorations, all nine amendment objects and the actual State runtime closure; run only their affected selection after implementation. Independent QA and hosted checks remain separate."
  },
  "open_questions": []
}
```

## R1-42: Keep Jira inspection within its original bounds

[PGB-156](https://scubapig.atlassian.net/browse/PGB-156)

### Problem to solve

A source inspection can follow caller changes made after validation or continue to another issue after an exact-read limit. Provider body and certificate failures can also send the caller toward the wrong recovery action.

### Acceptance Criteria

- **AC1.** The invocation reads only the issue IDs and exact comment pairs validated at entry, despite later caller mutations, without invoking later replacement accessors.
- **AC2.** A limit reached during an exact-comment read stops the entire issue scan, retains earlier valid observations and makes no request for a later issue.
- **AC3.** Oversized provider ADF reports RESPONSE_INVALID and failed certificate validation reports TLS_FAILED; invalid caller input and non-certificate connection failures keep their distinct diagnostics without leaking private data.

### Technical Acceptance Criteria

- **TAC1.** Repository danielchappell/Pigboard; change only the five reviewed runtime paths and bind the exact current parent revision/tree before implementation. Preserve every original PGB-150 criterion and its four human groups.
- **TAC2.** Keep inspectJiraIssues(configInput, request, {resolveSecret}), canonical PGB-145 configuration, verified fixed-destination HTTPS, all budgets, safe/private observations and owned-I/O cancellation; caller objects remain caller-owned.
- **TAC3.** Preserve the original35 variants/eight controls/L06 private subvariant and all PGB-152/PGB-154 regressions. Add only the nine prescribed boundary subcases with independently fixed traces, counts, bytes and cleanup evidence; no expected result is derived from the production collector.

### Testing Strategy

Human acceptance remains NOT_RUN. AI cases: zero.

#### R1-42-H01

- R1-42-H01
- human
- designated human reviewer
- AC1
- TAC1
- TAC2
- TAC3
- PREP-01 supplies the exact reviewed five-path runtime, prepared dependencies, fixed dummy HTTPS/TLS data and independently authored literal traces/counters/private comparisons before execution.
- No Jira/provider, credentials, Postman, UI, dependency fetch/repair, signing or clock change is permitted during execution. The source test harness retains verified TLS and fixed-origin/method auditing before loopback routing.
- Run exactly mutate-values and replace-accessors, once each. Resolver gates make the caller mutation occur after validation without sleeps.
- From the exact source root run node --test --test-name-pattern='R1-42-H01' test/jira-read.test.mjs, using the reviewed prepared dependencies. PREP-01 supplies the bound command and safe diagnostics. Compare every prescribed actual trace/counter/private-comparison result with its independently fixed literal.
- Inspect fixture/config/server/source/dependency preservation and cleanup; keep intentional caller mutation separate from immutable fixture hashes. Retain any failure or missing evidence without retries or alternative cases.
- Both retain original issue1000 and exact target2001: four original GETs, complete, no diagnostics, four completed/zero failed,910 received/1154 private bytes and one resolver call.
- mutate-values changes caller issue and target values only; replace-accessors installs throwing array-property getters. Getter calls stay zero, inspection resolves normally, fixture data/source stay unchanged and cleanup completes.
- Safe reports exclude bodies, tokens and raw provider/TLS errors; domain_complete is false and admission/receipt_proof remain not_evaluated. Close owned resources and preserve original successful evidence.
- Exact source revision/tree, prepared dependency identity, input/script/TLS hashes and command/TAP transcript.
- Actual safe report, permitted request/server trace, counts/bytes, private-comparison hash, mutation/getter observations and before/after preservation.
- Cleanup and every unverified outcome; developer PASS does not become human acceptance or authorize merge/activation.
- prescribed
- designated human reviewer
- Retain evidence; close local servers/sockets/timers and remove only disposable fixture data.
- Do not mutate source, fetch/repair dependencies, contact providers or repeat a failed case without its bounded disposition.

#### R1-42-H02

- R1-42-H02
- human
- designated human reviewer
- AC2
- TAC1
- TAC2
- TAC3
- PREP-01 supplies the exact reviewed five-path runtime, prepared dependencies, fixed dummy HTTPS/TLS data and independently authored literal traces/counters/private comparisons before execution.
- No Jira/provider, credentials, Postman, UI, dependency fetch/repair, signing or clock change is permitted during execution. The source test harness retains verified TLS and fixed-origin/method auditing before loopback routing.
- Run exactly exact-wire-stop, exact-private-stop and exact-two-issue-control, once each. Use the fixed first issue1000/target2001 and remaining issue1001 script.
- From the exact source root run node --test --test-name-pattern='R1-42-H02' test/jira-read.test.mjs, using the reviewed prepared dependencies. PREP-01 supplies the bound command and safe diagnostics. Compare every prescribed actual trace/counter/private-comparison result with its independently fixed literal.
- Inspect fixture/config/server/source/dependency preservation and cleanup; keep intentional caller mutation separate from immutable fixture hashes. Retain any failure or missing evidence without retries or alternative cases.
- Wire: per-response1000/total1500, exact response806 bytes including600 spaces, cumulative1510; stop after4 attempts/3 completed/1 failed, retain940 private bytes, with no issue1001 GET.
- Private: omit the600 spaces and set total1153; stop after4 completed requests,910 received/940 retained private bytes when the proposed1154-byte private projection fails.
- Control: same padded exact response and complete second issue pointer/empty page; total2008 permits7 completed requests,2008 received/1818 private bytes, two issues and complete status.
- Safe reports exclude bodies, tokens and raw provider/TLS errors; domain_complete is false and admission/receipt_proof remain not_evaluated. Close owned resources and preserve original successful evidence.
- Exact source revision/tree, prepared dependency identity, input/script/TLS hashes and command/TAP transcript.
- Actual safe report, permitted request/server trace, counts/bytes, private-comparison hash, mutation/getter observations and before/after preservation.
- Cleanup and every unverified outcome; developer PASS does not become human acceptance or authorize merge/activation.
- prescribed
- designated human reviewer
- Retain evidence; close local servers/sockets/timers and remove only disposable fixture data.
- Do not mutate source, fetch/repair dependencies, contact providers or repeat a failed case without its bounded disposition.

#### R1-42-H03

- R1-42-H03
- human
- designated human reviewer
- AC3
- TAC1
- TAC2
- TAC3
- PREP-01 supplies the exact reviewed five-path runtime, prepared dependencies, fixed dummy HTTPS/TLS data and independently authored literal traces/counters/private comparisons before execution.
- No Jira/provider, credentials, Postman, UI, dependency fetch/repair, signing or clock change is permitted during execution. The source test harness retains verified TLS and fixed-origin/method auditing before loopback routing.
- Run exactly provider-adf-over and provider-adf-at, once each, using262145/262144-byte ADF documents and unchanged response300000/total400000 limits. No exact target is requested.
- From the exact source root run node --test --test-name-pattern='R1-42-H03' test/jira-read.test.mjs, using the reviewed prepared dependencies. PREP-01 supplies the bound command and safe diagnostics. Compare every prescribed actual trace/counter/private-comparison result with its independently fixed literal.
- Inspect fixture/config/server/source/dependency preservation and cleanup; keep intentional caller mutation separate from immutable fixture hashes. Retain any failure or missing evidence without retries or alternative cases.
- Over: one completed GET,262287 wire bytes, zero private bytes/known issues, incomplete/RESPONSE_INVALID at issue; never INPUT_INVALID and no pointer/comment follow-up.
- At: three completed GETs (issue/pointer/comment page),262809 wire/263059 private bytes, one known issue/comment page/comment and complete status.
- Safe reports exclude bodies, tokens and raw provider/TLS errors; domain_complete is false and admission/receipt_proof remain not_evaluated. Close owned resources and preserve original successful evidence.
- Exact source revision/tree, prepared dependency identity, input/script/TLS hashes and command/TAP transcript.
- Actual safe report, permitted request/server trace, counts/bytes, private-comparison hash, mutation/getter observations and before/after preservation.
- Cleanup and every unverified outcome; developer PASS does not become human acceptance or authorize merge/activation.
- prescribed
- designated human reviewer
- Retain evidence; close local servers/sockets/timers and remove only disposable fixture data.
- Do not mutate source, fetch/repair dependencies, contact providers or repeat a failed case without its bounded disposition.

#### R1-42-H04

- R1-42-H04
- human
- designated human reviewer
- AC3
- TAC1
- TAC2
- TAC3
- PREP-01 supplies the exact reviewed five-path runtime, prepared dependencies, fixed dummy HTTPS/TLS data and independently authored literal traces/counters/private comparisons before execution.
- No Jira/provider, credentials, Postman, UI, dependency fetch/repair, signing or clock change is permitted during execution. The source test harness retains verified TLS and fixed-origin/method auditing before loopback routing.
- Run exactly future-certificate and connection-reset-control, once each. Use prepared fixed future leaf validity and a valid trust anchor; keep hostname checks enabled. The reset occurs before certificate authorization.
- From the exact source root run node --test --test-name-pattern='R1-42-H04' test/jira-read.test.mjs, using the reviewed prepared dependencies. PREP-01 supplies the bound command and safe diagnostics. Compare every prescribed actual trace/counter/private-comparison result with its independently fixed literal.
- Inspect fixture/config/server/source/dependency preservation and cleanup; keep intentional caller mutation separate from immutable fixture hashes. Retain any failure or missing evidence without retries or alternative cases.
- Future: incomplete/TLS_FAILED; one attempted/failed request, zero completed requests, HTTP server requests, wire/private bytes and known issues. Inspect the actual certificate authorization failure without echoing it in the public report.
- Reset: incomplete/READ_DENIED_OR_MISSING, one attempted/failed request, zero completed/HTTP requests/wire/private bytes; an unverified socket alone must not become TLS_FAILED.
- Safe reports exclude bodies, tokens and raw provider/TLS errors; domain_complete is false and admission/receipt_proof remain not_evaluated. Close owned resources and preserve original successful evidence.
- Exact source revision/tree, prepared dependency identity, input/script/TLS hashes and command/TAP transcript.
- Actual safe report, permitted request/server trace, counts/bytes, private-comparison hash, mutation/getter observations and before/after preservation.
- Cleanup and every unverified outcome; developer PASS does not become human acceptance or authorize merge/activation.
- prescribed
- designated human reviewer
- Retain evidence; close local servers/sockets/timers and remove only disposable fixture data.
- Do not mutate source, fetch/repair dependencies, contact providers or repeat a failed case without its bounded disposition.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "A source inspection can follow caller changes made after validation or continue to another issue after an exact-read limit. Provider body and certificate failures can also send the caller toward the wrong recovery action.",
  "prerequisites": [
    {
      "ticket": "R1-31",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The invocation reads only the issue IDs and exact comment pairs validated at entry, despite later caller mutations, without invoking later replacement accessors."
    },
    {
      "id": "AC2",
      "requirement": "A limit reached during an exact-comment read stops the entire issue scan, retains earlier valid observations and makes no request for a later issue."
    },
    {
      "id": "AC3",
      "requirement": "Oversized provider ADF reports RESPONSE_INVALID and failed certificate validation reports TLS_FAILED; invalid caller input and non-certificate connection failures keep their distinct diagnostics without leaking private data."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "codex/pgb150-source-inspection",
      "change_boundary": "One five-path runtime repair PR stacked on actual PGB-150 runtime23bb352b4d9f945f65e34d3d15d28dced51d9b80: existing reader, Jira test, fixture harness/TLS data and source guide. Native publication and PR receipts remain external; PGB-155 owns the final catalog ledger.",
      "out_of_scope": [
        "No provider probe, new API, live CLI, arbitrary destination, resolver/transport override, receipt proof, admission, AWS, installed PGB-147/PGB-148 delivery or PGB-144 decision.",
        "No new source Story entry or top-level publication amendment, generic parser redesign, fixture campaign, relaxed TLS/budget/oracle or merge/activation authority."
      ],
      "related_repositories": []
    },
    "accepted_decisions": [],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Repository danielchappell/Pigboard; change only the five reviewed runtime paths and bind the exact current parent revision/tree before implementation. Preserve every original PGB-150 criterion and its four human groups."
      },
      {
        "id": "TAC2",
        "requirement": "Keep inspectJiraIssues(configInput, request, {resolveSecret}), canonical PGB-145 configuration, verified fixed-destination HTTPS, all budgets, safe/private observations and owned-I/O cancellation; caller objects remain caller-owned."
      },
      {
        "id": "TAC3",
        "requirement": "Preserve the original35 variants/eight controls/L06 private subvariant and all PGB-152/PGB-154 regressions. Add only the nine prescribed boundary subcases with independently fixed traces, counts, bytes and cleanup evidence; no expected result is derived from the production collector."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Exact reviewed source runtime based on23bb352, prepared Node/dependencies and disposable local HTTPS fixtures; no live or installed target.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "Four source boundary groups containing nine finite subcases and the unchanged existing controls.",
        "initial_state": "Fresh local state per subcase, fixed dummy data/certificates, independently authored literal expectations and prepared source/dependencies; no product execution used to derive expected results.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "PR-bound exact source/dependency hashes, nine literal subcases, named source test commands and safe TAP diagnostics containing actual report/trace/counters, private-comparison hash, mutation/getter counts and cleanup. Preserve the original first-failure diagnostic packet and separate F2 setup correction.",
        "used_by": [
          "DATA-01",
          "R1-42-H01",
          "R1-42-H02",
          "R1-42-H03",
          "R1-42-H04"
        ],
        "preserves": [
          "Original1505AC/4TAC/4groups,35 variants/eight controls/L06 private subvariant and all152/154 fixes; no source catalog or native inventory claim.",
          "Fixed destination/TLS, all budgets, caller ownership, safe/private boundary and source/input/server/dependency preservation; report uncertainty honestly."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "No approved automated QA skill executes these source-library observations; qa_skills are []. Four designated human groups remain NOT_RUN until separately observed or dispositioned. Developer regressions and independent code QA are separate evidence.",
      "cases": [
        {
          "id": "R1-42-H01",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "PREP-01 supplies the exact reviewed five-path runtime, prepared dependencies, fixed dummy HTTPS/TLS data and independently authored literal traces/counters/private comparisons before execution.",
            "No Jira/provider, credentials, Postman, UI, dependency fetch/repair, signing or clock change is permitted during execution. The source test harness retains verified TLS and fixed-origin/method auditing before loopback routing."
          ],
          "steps": [
            "Run exactly mutate-values and replace-accessors, once each. Resolver gates make the caller mutation occur after validation without sleeps.",
            "From the exact source root run node --test --test-name-pattern='R1-42-H01' test/jira-read.test.mjs, using the reviewed prepared dependencies. PREP-01 supplies the bound command and safe diagnostics. Compare every prescribed actual trace/counter/private-comparison result with its independently fixed literal.",
            "Inspect fixture/config/server/source/dependency preservation and cleanup; keep intentional caller mutation separate from immutable fixture hashes. Retain any failure or missing evidence without retries or alternative cases."
          ],
          "expected": [
            "Both retain original issue1000 and exact target2001: four original GETs, complete, no diagnostics, four completed/zero failed,910 received/1154 private bytes and one resolver call.",
            "mutate-values changes caller issue and target values only; replace-accessors installs throwing array-property getters. Getter calls stay zero, inspection resolves normally, fixture data/source stay unchanged and cleanup completes.",
            "Safe reports exclude bodies, tokens and raw provider/TLS errors; domain_complete is false and admission/receipt_proof remain not_evaluated. Close owned resources and preserve original successful evidence."
          ],
          "evidence": [
            "Exact source revision/tree, prepared dependency identity, input/script/TLS hashes and command/TAP transcript.",
            "Actual safe report, permitted request/server trace, counts/bytes, private-comparison hash, mutation/getter observations and before/after preservation.",
            "Cleanup and every unverified outcome; developer PASS does not become human acceptance or authorize merge/activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain evidence; close local servers/sockets/timers and remove only disposable fixture data.",
              "Do not mutate source, fetch/repair dependencies, contact providers or repeat a failed case without its bounded disposition."
            ]
          }
        },
        {
          "id": "R1-42-H02",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC2",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "PREP-01 supplies the exact reviewed five-path runtime, prepared dependencies, fixed dummy HTTPS/TLS data and independently authored literal traces/counters/private comparisons before execution.",
            "No Jira/provider, credentials, Postman, UI, dependency fetch/repair, signing or clock change is permitted during execution. The source test harness retains verified TLS and fixed-origin/method auditing before loopback routing."
          ],
          "steps": [
            "Run exactly exact-wire-stop, exact-private-stop and exact-two-issue-control, once each. Use the fixed first issue1000/target2001 and remaining issue1001 script.",
            "From the exact source root run node --test --test-name-pattern='R1-42-H02' test/jira-read.test.mjs, using the reviewed prepared dependencies. PREP-01 supplies the bound command and safe diagnostics. Compare every prescribed actual trace/counter/private-comparison result with its independently fixed literal.",
            "Inspect fixture/config/server/source/dependency preservation and cleanup; keep intentional caller mutation separate from immutable fixture hashes. Retain any failure or missing evidence without retries or alternative cases."
          ],
          "expected": [
            "Wire: per-response1000/total1500, exact response806 bytes including600 spaces, cumulative1510; stop after4 attempts/3 completed/1 failed, retain940 private bytes, with no issue1001 GET.",
            "Private: omit the600 spaces and set total1153; stop after4 completed requests,910 received/940 retained private bytes when the proposed1154-byte private projection fails.",
            "Control: same padded exact response and complete second issue pointer/empty page; total2008 permits7 completed requests,2008 received/1818 private bytes, two issues and complete status.",
            "Safe reports exclude bodies, tokens and raw provider/TLS errors; domain_complete is false and admission/receipt_proof remain not_evaluated. Close owned resources and preserve original successful evidence."
          ],
          "evidence": [
            "Exact source revision/tree, prepared dependency identity, input/script/TLS hashes and command/TAP transcript.",
            "Actual safe report, permitted request/server trace, counts/bytes, private-comparison hash, mutation/getter observations and before/after preservation.",
            "Cleanup and every unverified outcome; developer PASS does not become human acceptance or authorize merge/activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain evidence; close local servers/sockets/timers and remove only disposable fixture data.",
              "Do not mutate source, fetch/repair dependencies, contact providers or repeat a failed case without its bounded disposition."
            ]
          }
        },
        {
          "id": "R1-42-H03",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "PREP-01 supplies the exact reviewed five-path runtime, prepared dependencies, fixed dummy HTTPS/TLS data and independently authored literal traces/counters/private comparisons before execution.",
            "No Jira/provider, credentials, Postman, UI, dependency fetch/repair, signing or clock change is permitted during execution. The source test harness retains verified TLS and fixed-origin/method auditing before loopback routing."
          ],
          "steps": [
            "Run exactly provider-adf-over and provider-adf-at, once each, using262145/262144-byte ADF documents and unchanged response300000/total400000 limits. No exact target is requested.",
            "From the exact source root run node --test --test-name-pattern='R1-42-H03' test/jira-read.test.mjs, using the reviewed prepared dependencies. PREP-01 supplies the bound command and safe diagnostics. Compare every prescribed actual trace/counter/private-comparison result with its independently fixed literal.",
            "Inspect fixture/config/server/source/dependency preservation and cleanup; keep intentional caller mutation separate from immutable fixture hashes. Retain any failure or missing evidence without retries or alternative cases."
          ],
          "expected": [
            "Over: one completed GET,262287 wire bytes, zero private bytes/known issues, incomplete/RESPONSE_INVALID at issue; never INPUT_INVALID and no pointer/comment follow-up.",
            "At: three completed GETs (issue/pointer/comment page),262809 wire/263059 private bytes, one known issue/comment page/comment and complete status.",
            "Safe reports exclude bodies, tokens and raw provider/TLS errors; domain_complete is false and admission/receipt_proof remain not_evaluated. Close owned resources and preserve original successful evidence."
          ],
          "evidence": [
            "Exact source revision/tree, prepared dependency identity, input/script/TLS hashes and command/TAP transcript.",
            "Actual safe report, permitted request/server trace, counts/bytes, private-comparison hash, mutation/getter observations and before/after preservation.",
            "Cleanup and every unverified outcome; developer PASS does not become human acceptance or authorize merge/activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain evidence; close local servers/sockets/timers and remove only disposable fixture data.",
              "Do not mutate source, fetch/repair dependencies, contact providers or repeat a failed case without its bounded disposition."
            ]
          }
        },
        {
          "id": "R1-42-H04",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "PREP-01 supplies the exact reviewed five-path runtime, prepared dependencies, fixed dummy HTTPS/TLS data and independently authored literal traces/counters/private comparisons before execution.",
            "No Jira/provider, credentials, Postman, UI, dependency fetch/repair, signing or clock change is permitted during execution. The source test harness retains verified TLS and fixed-origin/method auditing before loopback routing."
          ],
          "steps": [
            "Run exactly future-certificate and connection-reset-control, once each. Use prepared fixed future leaf validity and a valid trust anchor; keep hostname checks enabled. The reset occurs before certificate authorization.",
            "From the exact source root run node --test --test-name-pattern='R1-42-H04' test/jira-read.test.mjs, using the reviewed prepared dependencies. PREP-01 supplies the bound command and safe diagnostics. Compare every prescribed actual trace/counter/private-comparison result with its independently fixed literal.",
            "Inspect fixture/config/server/source/dependency preservation and cleanup; keep intentional caller mutation separate from immutable fixture hashes. Retain any failure or missing evidence without retries or alternative cases."
          ],
          "expected": [
            "Future: incomplete/TLS_FAILED; one attempted/failed request, zero completed requests, HTTP server requests, wire/private bytes and known issues. Inspect the actual certificate authorization failure without echoing it in the public report.",
            "Reset: incomplete/READ_DENIED_OR_MISSING, one attempted/failed request, zero completed/HTTP requests/wire/private bytes; an unverified socket alone must not become TLS_FAILED.",
            "Safe reports exclude bodies, tokens and raw provider/TLS errors; domain_complete is false and admission/receipt_proof remain not_evaluated. Close owned resources and preserve original successful evidence."
          ],
          "evidence": [
            "Exact source revision/tree, prepared dependency identity, input/script/TLS hashes and command/TAP transcript.",
            "Actual safe report, permitted request/server trace, counts/bytes, private-comparison hash, mutation/getter observations and before/after preservation.",
            "Cleanup and every unverified outcome; developer PASS does not become human acceptance or authorize merge/activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain evidence; close local servers/sockets/timers and remove only disposable fixture data.",
              "Do not mutate source, fetch/repair dependencies, contact providers or repeat a failed case without its bounded disposition."
            ]
          }
        }
      ]
    },
    "automated_regression": "Nine finite source boundary subcases plus the prescribed affected existing selection; all original oracles remain unchanged. Prepared fixed future TLS data is not generated during execution."
  },
  "open_questions": []
}
```

## R1-36: Inspect named Jira issues from source

[PGB-150](https://scubapig.atlassian.net/browse/PGB-150)

### Problem to solve

An authorized source caller cannot obtain bounded native issue and comment observations through Pigboard’s supported library. It needs useful partial results and safe failure information without running a manager or installing a copied delivery bundle.

### Acceptance Criteria

- **AC1.** A caller can inspect named immutable issue IDs, assignment pointers, all comment pages and supplied exact comment targets through the source library.
- **AC2.** Partial, denied, changed or bounded reads retain valid observations and explain missing information without claiming absence or completeness.
- **AC3.** Invalid inputs invoke no credential resolver, and all actual requests obey the fixed HTTPS destination, TLS checks and finite count/byte/time bounds.
- **AC4.** Safe reports exclude secrets and bodies, expose cancellation limits honestly, and never claim whole-domain completeness, receipt proof or admission.
- **AC5.** The documented source API and finite source fixture packet work with prepared dependencies, including source-root damage recovery and preservation evidence.

### Technical Acceptance Criteria

- **TAC1.** Repository danielchappell/Pigboard, base main; own the complete source inspection API, source verification/docs and publication support in one18-path PR.
- **TAC2.** Preserve inspectJiraIssues(configInput, request, {resolveSecret}) and PGB-145’s canonical configuration; no production transport hook, live CLI, arbitrary URL, extra credential source or environment bypass.
- **TAC3.** Preserve native IDs/server metadata, endpoint-specific pagination and all literal observation, trace, status, limit, canary, private-data and cancellation assertions in the35-variant packet, eight controls and L06 private subvariant; generic404 or visibility limits never prove absence.
- **TAC4.** Keep runnable fixture CLI and installation publication outside this slice; count all attempted requests/bytes, bound private observations, cancel owned I/O, fence late resolver values, hash the complete source/input/server data and close fixture resources without scheduling or receipt proof.

### Testing Strategy

Human acceptance remains NOT_RUN. AI cases: zero.

#### R1-36-H01

- R1-36-H01
- human
- designated human reviewer
- AC1
- AC2
- AC4
- TAC2
- TAC3
- PREP-01 supplies the reviewed source fixture packet DATA-01, executable importable API example, literal expected report/private observations and maximum permitted traces before execution; do not derive answers from the collector.
- Prepared Node22.17.0 and lock-matching source dependencies, reviewed source checkout and fresh disposable data per variant; dummy token/reference and fixed local HTTPS servers. No live Jira, AWS, Postman, UI, installed runtime or dependency fetch/repair is needed.
- Run exactly these named variants: complete, empty-comments, renamed-key, unknown-pointer, exact-mismatch. Each uses fresh state except its explicitly paired controls.
- The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports.
- Import runFixture and fixtureCases from the explicit reviewed source root’s test/fixtures/jira-preview-harness.mjs; select the listed variants with stable fixture selector R1-33-H01, then await runFixture(v.case, v.variant, SOURCE_ROOT) for each. PREP-01 supplies the exact module example and absolute root; the source fixture has no direct-entry CLI.
- For each selected variant with control, await runFixture(v.case, v.variant, SOURCE_ROOT, {control:true}); for L06 also await runFixture(v.case, v.variant, SOURCE_ROOT, {privateProjection:true}). Use only the existing eight controls and one private subvariant.
- Compare the returned safe report, private-acquisition oracle and permitted request audit with the literal expectations; inspect counters, bytes, elapsed time, cleanup and the actual late-delivery acknowledgment where prescribed.
- Inspect zero-effects/cancellation and source/input/server before-and-after hashes, record the source revision, exact module invocation and returned structured results, then retain evidence and close/remove only disposable fixture resources.
- complete: two issues, one present pointer each, two comment pages plus one named exact target, literal IDs/metadata and requested complete/domain false. empty-comments: explicit zero-total page, present pointer. renamed-key: same ID/current key. unknown-pointer: pointer404 yields incomplete/POINTER_UNKNOWN, never null. exact-mismatch: changed exact body/metadata yields CHANGED_INPUT.
- Every library inspection report has inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.
- Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.
- Tested source PR revision, source/dependency identity, fixture hashes and exact programmatic source invocation; no installed-runtime claim.
- Programmatic invocation transcript, process exit code, safe returned report and independently authored literal report/private-acquisition comparison.
- Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.
- Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- prescribed
- designated human reviewer
- Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.
- Remove only disposable fixture/build directories and damaged source-derived copies; preserve the reviewed source and retained evidence. Do not change live records or repair/fetch dependencies.

#### R1-36-H02

- R1-36-H02
- human
- designated human reviewer
- AC2
- AC3
- AC4
- TAC2
- TAC3
- TAC4
- PREP-01 supplies the reviewed source fixture packet DATA-01, executable importable API example, literal expected report/private observations and maximum permitted traces before execution; do not derive answers from the collector.
- Prepared Node22.17.0 and lock-matching source dependencies, reviewed source checkout and fresh disposable data per variant; dummy token/reference and fixed local HTTPS servers. No live Jira, AWS, Postman, UI, installed runtime or dependency fetch/repair is needed.
- Run exactly these named variants: missing-page, changed-total, duplicate-comment, zero-progress, issue403, issue404, rate429, header-timeout, body-timeout, resolver-reject, resolver-abort, resolver-late. Each uses fresh state except its explicitly paired controls.
- The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports.
- Import runFixture and fixtureCases from the explicit reviewed source root’s test/fixtures/jira-preview-harness.mjs; select the listed variants with stable fixture selector R1-33-H02, then await runFixture(v.case, v.variant, SOURCE_ROOT) for each. PREP-01 supplies the exact module example and absolute root; the source fixture has no direct-entry CLI.
- For each selected variant with control, await runFixture(v.case, v.variant, SOURCE_ROOT, {control:true}); for L06 also await runFixture(v.case, v.variant, SOURCE_ROOT, {privateProjection:true}). Use only the existing eight controls and one private subvariant.
- Compare the returned safe report, private-acquisition oracle and permitted request audit with the literal expectations; inspect counters, bytes, elapsed time, cleanup and the actual late-delivery acknowledgment where prescribed.
- Inspect zero-effects/cancellation and source/input/server before-and-after hashes, record the source revision, exact module invocation and returned structured results, then retain evidence and close/remove only disposable fixture resources.
- missing-page, changed-total, duplicate-comment, zero-progress, issue403, issue404, rate429, header-timeout, body-timeout, resolver-reject, resolver-abort, resolver-late: each has a literal stop point/code; no retry, swallowed secret, false absence or post-return B-owned read. Late resolver case expects cancel_unconfirmed and discards the late dummy token; fixture itself acknowledges/stops its own I/O during cleanup.
- Every library inspection report has inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.
- Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.
- resolver-late delivers its dummy token once after the bounded source call returns, acknowledges settlement under active guards and drains one event-loop checkpoint; zero before/after Jira calls, aborted signal and unchanged at-return cancel_unconfirmed report. No larger deadline or timed sleep.
- Tested source PR revision, source/dependency identity, fixture hashes and exact programmatic source invocation; no installed-runtime claim.
- Programmatic invocation transcript, process exit code, safe returned report and independently authored literal report/private-acquisition comparison.
- Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.
- Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- prescribed
- designated human reviewer
- Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.
- Remove only disposable fixture/build directories and damaged source-derived copies; preserve the reviewed source and retained evidence. Do not change live records or repair/fetch dependencies.

#### R1-36-H03

- R1-36-H03
- human
- designated human reviewer
- AC3
- AC4
- TAC2
- TAC3
- TAC4
- PREP-01 supplies the reviewed source fixture packet DATA-01, executable importable API example, literal expected report/private observations and maximum permitted traces before execution; do not derive answers from the collector.
- Prepared Node22.17.0 and lock-matching source dependencies, reviewed source checkout and fresh disposable data per variant; dummy token/reference and fixed local HTTPS servers. No live Jira, AWS, Postman, UI, installed runtime or dependency fetch/repair is needed.
- Run exactly these named variants: invalid-origin, invalid-request, out-of-scope-issue, redirect, untrusted-ca, wrong-host, error-canary, compressed-response, known-limit, comment-limit, page-limit, request-limit, response-byte-limit, total-byte-limit, request-time-limit, scan-time-limit. Each uses fresh state except its explicitly paired controls.
- The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports.
- Import runFixture and fixtureCases from the explicit reviewed source root’s test/fixtures/jira-preview-harness.mjs; select the listed variants with stable fixture selector R1-33-H03, then await runFixture(v.case, v.variant, SOURCE_ROOT) for each. PREP-01 supplies the exact module example and absolute root; the source fixture has no direct-entry CLI.
- For each selected variant with control, await runFixture(v.case, v.variant, SOURCE_ROOT, {control:true}); for L06 also await runFixture(v.case, v.variant, SOURCE_ROOT, {privateProjection:true}). Use only the existing eight controls and one private subvariant.
- Compare the returned safe report, private-acquisition oracle and permitted request audit with the literal expectations; inspect counters, bytes, elapsed time, cleanup and the actual late-delivery acknowledgment where prescribed.
- Inspect zero-effects/cancellation and source/input/server before-and-after hashes, record the source revision, exact module invocation and returned structured results, then retain evidence and close/remove only disposable fixture resources.
- invalid-origin, invalid-request, out-of-scope-issue, redirect, untrusted-ca, wrong-host, error-canary, compressed-response. Invalid setup invokes no resolver; rejected scope has no follow-up body/comment reads; redirect target receives no credentials/request; TLS failures occur; reports exclude every body/token/reference/error canary.
- L01 known-limit: two supplied issues, max_known_issues1 then2. B1 rejects pre-resolver at1; at2 continues.
- L02 comment-limit: two ordinary comments, max_comments1 then2. B1 incomplete before retaining excess; at2 complete.
- L03 page-limit: two comment pages, max_pages1 then2. B1 stops before requesting second at1.
- L04 request-limit: a literal four-request single-issue script, max_requests3 then4, max_pages1. B1 stops before fourth at3; at4 completes.
- L05 response-byte-limit: one identity-encoded body with literal byte lengthN, capN−1 thenN. B1 aborts at excess; no raw/error disclosure.
- L06 total-byte-limit: preserve the reviewed literal753-byte main/754-byte positive control and650-byte private-projection bound. Main receives754wire bytes in three attempts, completes two and fails one, retains635observation bytes; control completes three and retains745bytes. Private subvariant omits the256-space prefix, receives498wire bytes, completes three requests and rejects the745-byte projection while retaining635bytes. Keep all cross-field relations and independent literal traces.
- L07 request-time-limit: fixture withholds headers/body past fixed request deadline; paired immediate response. B1 cancels actual socket, no later B-owned work. Deadline is not increased to force a pass.
- L08 scan-time-limit: resolver plus two individually timely responses exceed total deadline; paired immediate sequence. B1 total includes resolution, parsing and cleanup; result incomplete even if last parse otherwise succeeds.
- Each budget-hit input changes only the named budget to one below its independently known demand while preserving A’s cross-field relations; run its paired positive-at-limit control. Expected demand and call counts are literal fixture facts prepared before execution. Do not raise bounds after observing failure.
- Every library inspection report has inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.
- Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.
- comment-limit and page-limit main reports retain exact_comments_read not_requested because the phase was not reached; their existing positive controls remain complete. Do not change any request, partial observation, trace or limit to satisfy an oracle.
- Tested source PR revision, source/dependency identity, fixture hashes and exact programmatic source invocation; no installed-runtime claim.
- Programmatic invocation transcript, process exit code, safe returned report and independently authored literal report/private-acquisition comparison.
- Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.
- Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- prescribed
- designated human reviewer
- Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.
- Remove only disposable fixture/build directories and damaged source-derived copies; preserve the reviewed source and retained evidence. Do not change live records or repair/fetch dependencies.

#### R1-36-H04

- R1-36-H04
- human
- designated human reviewer
- AC4
- AC5
- TAC1
- TAC4
- PREP-01 supplies the reviewed source fixture packet DATA-01, executable importable API example, literal expected report/private observations and maximum permitted traces before execution; do not derive answers from the collector.
- Prepared Node22.17.0 and lock-matching source dependencies, reviewed source checkout and fresh disposable data per variant; dummy token/reference and fixed local HTTPS servers. No live Jira, AWS, Postman, UI, installed runtime or dependency fetch/repair is needed.
- Run exactly these named variants: guide-and-install, damaged-copy. Each uses fresh state except its explicitly paired controls.
- The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports.
- Import runFixture and fixtureCases from the explicit reviewed source root’s test/fixtures/jira-preview-harness.mjs; select the listed variants with stable fixture selector R1-33-H04, then await runFixture(v.case, v.variant, SOURCE_ROOT) for each. PREP-01 supplies the exact module example and absolute root; the source fixture has no direct-entry CLI.
- For each selected variant with control, await runFixture(v.case, v.variant, SOURCE_ROOT, {control:true}); for L06 also await runFixture(v.case, v.variant, SOURCE_ROOT, {privateProjection:true}). Use only the existing eight controls and one private subvariant.
- Compare the returned safe report, private-acquisition oracle and permitted request audit with the literal expectations; inspect counters, bytes, elapsed time, cleanup and the actual late-delivery acknowledgment where prescribed.
- Inspect zero-effects/cancellation and source/input/server before-and-after hashes, record the source revision, exact module invocation and returned structured results, then retain evidence and close/remove only disposable fixture resources.
- guide-and-install (stable fixture name): the source API guide example returns the literal complete observation; no runnable CLI, human/JSON parity or installed acceptance is claimed. damaged-copy: prepare the complete source-derived payload/dependency closure in a disposable root, delete only lib/config/projects.mjs, then expect setup_failed/SETUP_MISSING with no resolver or Jira request and no source fallback/fetch/repair.
- Every library inspection report has inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.
- Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.
- Tested source PR revision, source/dependency identity, fixture hashes and exact programmatic source invocation; no installed-runtime claim.
- Programmatic invocation transcript, process exit code, safe returned report and independently authored literal report/private-acquisition comparison.
- Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.
- Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- prescribed
- designated human reviewer
- Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.
- Remove only disposable fixture/build directories and damaged source-derived copies; preserve the reviewed source and retained evidence. Do not change live records or repair/fetch dependencies.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "An authorized source caller cannot obtain bounded native issue and comment observations through Pigboard’s supported library. It needs useful partial results and safe failure information without running a manager or installing a copied delivery bundle.",
  "prerequisites": [
    {
      "ticket": "R1-31",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-38",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-40",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-41",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-42",
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

[PGB-75](https://scubapig.atlassian.net/browse/PGB-75)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The implementer still uses the earlier prose handoff. It needs the structured assignment and a separate Jira skill without broadening its one-ticket scope.",
  "prerequisites": [
    {
      "ticket": "R1-03",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-04",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "Implementer accepts native Story and Bug assignments, rejects other types, reads current assignment, Epic and stream context, plans at Grok High with one independent High review, then implements at Medium."
    },
    {
      "id": "AC2",
      "requirement": "It checks the actual predecessor/merge facts, follows repo instructions, keeps one PR and records actual parent revision and all incorporated repair causes."
    },
    {
      "id": "AC3",
      "requirement": "Passing current-head CI and complete prepared artifacts precede a verified implementation record and In Review."
    },
    {
      "id": "AC4",
      "requirement": "Confirmed upstream dependency wait enters Rework Queued with unfinished checks; scope growth or missing execution prerequisites blocks. It never admits work or interrupts another ticket."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own implementer job/Jira separation and bundle entry; preserve current harness controls and minimal automation prompt.",
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
        "requirement": "Own implementer job/Jira separation and bundle entry; preserve current harness controls and minimal automation prompt."
      },
      {
        "id": "TAC2",
        "requirement": "Jira skill uses configured existing Atlassian tools: read pointer and exact receipts, publish/read back one record, recheck inputs, send one allowed directed transition. No automatic mutation retries."
      },
      {
        "id": "TAC3",
        "requirement": "Repair preflight requires the same still-open PR; only documented pre-first-PR dependency wait permits null PR. Changed stage or unknown mutation stops without a competing transition."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-05-H01",
          "R1-05-H02"
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
          "id": "R1-05-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC1"
          ],
          "prerequisites": [
            "Prepared simulated tool transcripts for both native Story and Bug new work and repaired A; local disposable application fixture with repo instructions and passing/failing CI receipts."
          ],
          "steps": [
            "Walk each entrypoint using the supplied tools/results.",
            "Inspect plan review, base selection and preparation evidence.",
            "Allow the simulated current-head CI success and inspect publication/transition order."
          ],
          "expected": [
            "One independent review, required effort settings, exact PR lineage and artifacts; verified result precedes one In Review transition."
          ],
          "evidence": [
            "tool transcript, plan/review/CI receipts and typed result; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-05-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC4",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Scripted rejected Task/Epic types, scope growth, upstream known defect before first PR, closed repair PR, edited assignment, failed CI and lost publication/transition response."
          ],
          "steps": [
            "Execute each prescribed transcript.",
            "Inspect final record, tool calls and retained output."
          ],
          "expected": [
            "No false success, extra PR, In Progress action or retry; dependency wait is distinct from human Blocked; unavailable Jira is reported in output."
          ],
          "evidence": [
            "complete tool-call audit and final records; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Skill/handoff regression fixtures for success, dependency wait, repair identity and uncertain effects."
  },
  "open_questions": []
}
```

## R1-06: Review and hand off the current PR

[PGB-76](https://scubapig.atlassian.net/browse/PGB-76)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The reviewer must preserve its existing review criteria while handing results to the new workflow. Directly restarting implementation would violate the stream queue.",
  "prerequisites": [
    {
      "ticket": "R1-04",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-05",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "Reviewer accepts native Story/Bug assignments and rejects other types; Grok High reviews the full ticket and current PR using existing pr-review criteria and pr-commenting handling."
    },
    {
      "id": "AC2",
      "requirement": "Confirmed PR approval plus verified revision-bound Jira review moves to QA; confirmed in-scope findings queue rework on the same PR."
    },
    {
      "id": "AC3",
      "requirement": "Discussion stays In Review; missing access, new scope or inability to finish blocks; unknown approval/publication/transition ends without replay."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own reviewer wrapper and separate reviewer-jira skill; do not rewrite shared review criteria or grant merge authority.",
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
        "requirement": "Own reviewer wrapper and separate reviewer-jira skill; do not rewrite shared review criteria or grant merge authority."
      },
      {
        "id": "TAC2",
        "requirement": "Use implementation receipt as basis, validate current assignment/requirements/source and preserve all pending finding references. No direct In Progress transition or DynamoDB access."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-06-H01",
          "R1-06-H02"
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
          "id": "R1-06-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Simulated native Story and Bug open PR/current implementation and shared review output; configured reviewer identity."
          ],
          "steps": [
            "Run the review flow against prepared receipts.",
            "Inspect PR approval and Jira record.",
            "Inspect final transition."
          ],
          "expected": [
            "All shared criteria/comment handling retained; approval and evidence match the current revision; exactly one QA transition."
          ],
          "evidence": [
            "review report, PR action audit and Jira transcript; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-06-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Separate scripted rejected Task/Epic types, findings, discussion-only, scope increase, source update and unknown approval response."
          ],
          "steps": [
            "Run each case.",
            "Inspect PR/Jira calls and final evidence."
          ],
          "expected": [
            "In-scope findings produce Rework Queued, discussion no transition, inability Blocked when safe; unknown approval stops without retry or contradictory result."
          ],
          "evidence": [
            "tool-call audit and typed result; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Reviewer contract tests preserving shared criteria and all approved/repair/discussion/blocked boundaries."
  },
  "open_questions": []
}
```

## R1-07: Execute prescribed QA helper steps

[PGB-77](https://scubapig.atlassian.net/browse/PGB-77)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Existing QA helpers need the structured case bindings and evidence shape. They must execute the prescribed work without choosing new tools or expanding the test plan.",
  "prerequisites": [
    {
      "ticket": "R1-02",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-04",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "API invokes its exact prepared Bruno child once and returns named observations; database binds supplied inputs to the prepared read-only PostgreSQL query."
    },
    {
      "id": "AC2",
      "requirement": "UI follows prescribed steps and captures each screenshot checkpoint at the specified surface/viewport."
    },
    {
      "id": "AC3",
      "requirement": "All helpers return revision-bound observations, evidence and inability/defect distinctions; they never move Jira or perform human cases."
    },
    {
      "id": "AC4",
      "requirement": "Missing deployment receipt, access, artifact or unsupported engine returns inability without exploratory setup or repeated mutation."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own existing helper instructions and contract fixtures, with no new testing engine or dependency installation during delivery.",
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
        "requirement": "Own existing helper instructions and contract fixtures, with no new testing engine or dependency installation during delivery."
      },
      {
        "id": "TAC2",
        "requirement": "Verify trusted PR environment receipt before environment-dependent work; keep current read-only SQL bounds, tenant/column scope and credential handling."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-07-H01",
          "R1-07-H02"
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
          "id": "R1-07-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Prepared disposable API request, PostgreSQL query/parameter scope and local UI fixture with screenshot checkpoints; mocked access/deployment receipts."
          ],
          "steps": [
            "Exercise the prescribed API parent/child once.",
            "Bind its declared observation into the SQL parameters.",
            "Follow the UI steps and retain screenshots."
          ],
          "expected": [
            "Exact prepared operations and prescribed evidence; no extra helper dispatch, SQL interpolation or Jira action."
          ],
          "evidence": [
            "request/query audit, observations and screenshots; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-07-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC4",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Missing/stale receipt, absent request file, wrong tenant, unsupported DB engine and unavailable UI capability."
          ],
          "steps": [
            "Present each failed prerequisite to its helper.",
            "Inspect output and tool audit."
          ],
          "expected": [
            "Inability is explicit with no guessed environment, installed engine, mutation retry or invented evidence."
          ],
          "evidence": [
            "helper outputs and zero-extra-call audit; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Contract tests for exact helper dispatch, safe bindings, evidence checkpoints and failure stops; preserve existing PostgreSQL regression suite."
  },
  "open_questions": []
}
```

## R1-24: Publish prepared QA evidence safely

[PGB-110](https://scubapig.atlassian.net/browse/PGB-110)

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

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "An authorized QA caller has no separate skill for delivering a complete prepared assessment to Jira. Evidence and pending human tests need a verified handoff even when execution cannot finish.",
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
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "An authorized caller can use qa-jira directly to check a configured native Story/Bug in QA and publish its complete prepared assessment for the current assignment, review and open PR; other native types are rejected before writes."
    },
    {
      "id": "AC2",
      "requirement": "Complete passing AI evidence or explicit human-only work moves to Human Review only after verified publication; human cases remain pending."
    },
    {
      "id": "AC3",
      "requirement": "A confirmed in-scope defect or known upstream request queues rework; inability blocks; discussion stays QA without a terminal record."
    },
    {
      "id": "AC4",
      "requirement": "Full partial results, findings and pending human IDs survive failure; unknown writes stop without replay, replacement records or competing transitions."
    },
    {
      "id": "AC5",
      "requirement": "Installed guidance explains direct invocation, prerequisites, evidence ownership, success and recovery, and makes clear that prescribed dispatch remains a separate pending Story."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own the qa-jira read-only eligibility and canonical publication/transition skill, its installation, tests and guides, and the approved same-scope 24-Story delivery mapping; execute no tests or manager actions.",
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
        "requirement": "qa-jira is the sole permanent publication/failure contract; use existing canonical records, validators, formatter and direct configured edges, with no new engine, schema, provider adapter or helper transition authority."
      },
      {
        "id": "TAC2",
        "requirement": "Verify current configured scope, actors, assignment/review/PR/requirements receipts and complete evidence before publication; append once, verify exact readback and freshness, transition once and verify status; retain full partial results and never replay completed mutations."
      },
      {
        "id": "TAC3",
        "requirement": "Human-only static work needs no invented deployment; successful runtime completion or any PASS/FAIL claim requires current trusted environment proof, while a complete all-NOT_RUN non-completing report may describe missing deployment under the corrected shared contract."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-24-H01",
          "R1-24-H02",
          "R1-24-H03"
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
          "id": "R1-24-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC5",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Prepared native Story and Bug assessments with a complete mixed API-child/database/UI ledger, declared observed-value binding, inspectable supplied/mock screenshots, exact human IDs and current valid receipt chains.",
            "Same-release installed qa-jira and private disposable fixtures with simulated provider cards and dummy credentials."
          ],
          "steps": [
            "Follow the installed direct-invocation guide and call preflight, then final, for each native type.",
            "Inspect the full ledger, evidence retrieval, human_pending and ordered tool audit.",
            "Check predecessor validation, append, exact comment readback/chain, freshness, direct transition and independent native-status verification.",
            "Inspect the approved 24-Story mapping, new R1-24 before unchanged R1-08, preserved downstream dependencies and current-versus-historical review statements."
          ],
          "expected": [
            "Every prescribed nested row and pending human ID is retained; only verified current-revision completion reaches Human Review.",
            "The caller can use the publisher without a dispatcher; the guide states dispatch remains pending and installation grants no authority or activation.",
            "The delivery records retain all existing R1 IDs, 53 product requirements and 41 scenarios; the original three R1-08 human cases remain, and R1-24 adds three publication cases without claiming acceptance."
          ],
          "evidence": [
            "Input/output hashes, exact installed path/revision/command, ordered tool audit, inspected screenshots, typed ledger, receipt chain and delivery-mapping diff."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-24-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "AC4",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Separate coherent prepared defect, known-upstream-wait, inability, earlier-FAIL-plus-later-inability, earlier-FAIL-plus-wait and discussion assessments; upstream requests include their exact typed lineage."
          ],
          "steps": [
            "Call final on each fresh assessment without running helpers.",
            "Inspect final/partial ledger, findings, unfinished NOT_RUN reasons, exact upstream references and publication/transition audit."
          ],
          "expected": [
            "Confirmed defect and known outstanding wait select Rework Queued; inability selects Blocked while retaining earlier findings and evidence; discussion has no terminal write and stays QA.",
            "A rumor cannot become a dependency request, omissions or unresolved finding IDs reject, and human cases never become PASS."
          ],
          "evidence": [
            "Exact prepared and produced records, full receipt chain, selected destination, verified/unknown status, tested revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-24-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "AC4",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Static human-only native Bug with empty AI graph/types, two pending human IDs and a nonempty no-AI reason.",
            "Separate Task/Epic, changed source/requirements/stage, missing/stale deployment, untrusted approval, missing receipt page, oversized ledger, definite append failure, unknown append/readback, unknown transition and explicitly authorized resume variants with a known completed mutation."
          ],
          "steps": [
            "Call preflight/final for the zero-AI Bug, then each separate invalid or failure variant.",
            "For missing deployment, compare a complete all-NOT_RUN blocker with a report claiming PASS/FAIL.",
            "Inspect call audit, retained evidence, receipt resolution, current/unknown status and any resume action."
          ],
          "expected": [
            "Valid static work invokes no helper or environment request, keeps the exact pending human list and reaches Human Review only after verified publication.",
            "Invalid native types stop before writes; complete all-NOT_RUN inability may publish a valid blocker, while execution claims without required proof reject.",
            "Stale/unknown effects stop without mutation replay, fallback terminal writes or overwriting a changed stage; at most one resolving read follows each uncertain action, and only conclusive success permits the next distinct step.",
            "Resume consumes existing explicit valid human authorization and retained case-specific evidence; it never creates authorization, repeats a completed mutation or auto-passes humans."
          ],
          "evidence": [
            "Input/output hashes, ordered tool audit, human handoff, retained evidence/receipt reads, tested revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Canonical accepted/rejected publication records, full partial ledgers, human-only handoff, uncertain-write handling and source/installed skill-validator-formatter parity; no prose-only claim of runtime behavior."
  },
  "open_questions": []
}
```

## R1-30: Prepare mixed QA inputs and two boundary controls

[PGB-138](https://scubapig.atlassian.net/browse/PGB-138)

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

[PGB-132](https://scubapig.atlassian.net/browse/PGB-132)

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

[PGB-78](https://scubapig.atlassian.net/browse/PGB-78)

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

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "QA needs to run the named cases in order and hand the open PR to humans. It must retain incomplete results and keep human tests visibly pending.",
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
      "ticket": "R1-27",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "QA accepts native Story/Bug assignments and rejects other types; Grok High dispatches exactly the prescribed top-level steps in order, including declared helper calls/bindings and bounded read-only observation schedules."
    },
    {
      "id": "AC2",
      "requirement": "Every AI step has PASS/FAIL with evidence or NOT_RUN with reason/finding; pending human case IDs remain separate."
    },
    {
      "id": "AC3",
      "requirement": "All AI cases passing, or explicit human-only zero-AI work, publishes verified QA evidence then moves to Human Review."
    },
    {
      "id": "AC4",
      "requirement": "Confirmed in-scope defects or known upstream waits queue rework; inability blocks; discussion stays QA. Human cases are never auto-passed."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own QA orchestration and compose the separately delivered qa-jira publisher; helpers retain no transition authority.",
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
        "requirement": "Own QA orchestration and separate qa-jira publication; helpers retain no transition authority."
      },
      {
        "id": "TAC2",
        "requirement": "Use current review/PR/requirements receipts; no observation overlap, catch-up or replay of completed mutations. Preserve full partial ledger on failure."
      },
      {
        "id": "TAC3",
        "requirement": "Human-only non-runtime PR targets need no invented deployment; environment-dependent work still requires the trusted current deployment receipt."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-08-H01",
          "R1-08-H02",
          "R1-08-H03"
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
          "id": "R1-08-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Scripted native Story and Bug mixed API-child/database/UI plans with declared binding and screenshots."
          ],
          "steps": [
            "Execute the prepared dispatch sequence.",
            "Inspect full nested ledger and human_pending.",
            "Inspect verified publication and transition order."
          ],
          "expected": [
            "Each step once, correct earlier-output binding, full evidence; Human Review only after verified current-revision completion."
          ],
          "evidence": [
            "ordered tool audit, screenshots and typed ledger; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-08-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC4",
            "TAC2"
          ],
          "prerequisites": [
            "Observation schedules for until_expected/all_observations plus overrun, defect, missing access and known upstream defect transcripts."
          ],
          "steps": [
            "Run each observation schedule against scripted outcomes.",
            "Inspect dispatch times, final ledger and destination."
          ],
          "expected": [
            "No overlap/catch-up; expected success/failure policy; overrun/inability blocks, known defect queues; unfinished work explicitly NOT_RUN."
          ],
          "evidence": [
            "timestamped dispatch audit and result records; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-08-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "AC4",
            "TAC3"
          ],
          "prerequisites": [
            "Complete human-only native Bug static PR plan, rejected Task/Epic types, plus changed source/requirements and unknown publication variants."
          ],
          "steps": [
            "Execute zero-AI QA.",
            "Repeat with each invalid variant."
          ],
          "expected": [
            "Zero AI cases and exact pending human list; no human PASS, no invented environment; stale/unknown effects stop without replay."
          ],
          "evidence": [
            "tool audit and human handoff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Entrypoint contract tests for ordered complete ledgers, observation bounds, all-human handoff and failure destinations."
  },
  "open_questions": []
}
```

## R1-09: Request rework through the human’s assistant

[PGB-79](https://scubapig.atlassian.net/browse/PGB-79)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "A human who rejects an open PR needs to record actionable findings without starting a second worker. Story authoring should remain focused on specifications.",
  "prerequisites": [
    {
      "ticket": "R1-04",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "A human invokes request-rework with ticket, findings and explicit authorization; it verifies the current Human Review assignment and same open PR."
    },
    {
      "id": "AC2",
      "requirement": "It records findings against the current QA completion, verifies publication, rechecks facts and moves only that ticket to Rework Queued."
    },
    {
      "id": "AC3",
      "requirement": "It leaves active B alone and explains that the manager later admits A; no manual card drag is required."
    },
    {
      "id": "AC4",
      "requirement": "Discussion, new scope, missing evidence, closed PR or conflicting facts make no queue transition; already queued work is inspected without another transition."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own the separate human-invoked skill using shared validation/human-writing and existing configured human actor.",
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
        "requirement": "Own the separate human-invoked skill using shared validation/human-writing and existing configured human actor."
      },
      {
        "id": "TAC2",
        "requirement": "No new automatic worker, Jira UI, pointer/state write, acceptance rewrite, bug creation, multi-PR repair or unblock feature."
      },
      {
        "id": "TAC3",
        "requirement": "Unknown publication/transition is reported without retry; preserve prior findings."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-09-H01",
          "R1-09-H02"
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
          "id": "R1-09-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC1"
          ],
          "prerequisites": [
            "A Human Review on open PR, B active in same stream, valid QA chain and authorized human findings."
          ],
          "steps": [
            "Invoke request-rework.",
            "Inspect recorded findings and readback.",
            "Inspect A/B status and pointer."
          ],
          "expected": [
            "A enters Rework Queued once; B and A pointer unchanged; no implementer starts."
          ],
          "evidence": [
            "assistant conversation, typed request and transition audit; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-09-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC4",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Discussion-only, scope increase, closed PR, changed source, missing receipt, already queued and lost-response variants."
          ],
          "steps": [
            "Run each prepared invocation.",
            "Inspect resulting calls and preserved findings."
          ],
          "expected": [
            "No unauthorized queue/other transition or retry; already queued findings remain intact; human receives the exact reason."
          ],
          "evidence": [
            "assistant output and tool audit; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Human-request contract tests for authorization, current open PR, queue-only effects and uncertain outcomes."
  },
  "open_questions": []
}
```

## R1-10: Preview ready work from a complete snapshot

[PGB-80](https://scubapig.atlassian.net/browse/PGB-80)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "An operator needs to see why a stream can or cannot start work before granting write access. The manager’s core rules must run without AWS or Jira credentials.",
  "prerequisites": [
    {
      "ticket": "R1-02",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-04",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-21",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "A local preview explains selection or wait per full stream using opt-in/Epic state, Ready to Work, prerequisite completion, Bugs-before-Stories and Epic-order ties."
    },
    {
      "id": "AC2",
      "requirement": "It counts all occupied/Blocked/Human Review members, applies the five-ticket return cap and allows independent numbered streams to proceed."
    },
    {
      "id": "AC3",
      "requirement": "Incomplete membership, unknown statuses, conflicting ownership or pending intent holds the appropriate scope; invalid independent ready work is reported and skipped."
    },
    {
      "id": "AC4",
      "requirement": "Required repair work is reported as waiting for the repair-policy increment; it cannot be bypassed by admitting unrelated work. Preview performs zero writes."
    },
    {
      "id": "AC5",
      "requirement": "Equal labels in different projects have independent ownership, occupancy, repair selection and five-ticket caps; conflicting Epics in one project hold that stream."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own cloud-neutral snapshot policy and readable/JSON preview command; no AWS imports or credentials.",
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
        "requirement": "Own cloud-neutral snapshot policy and readable/JSON preview command; no AWS imports or credentials."
      },
      {
        "id": "TAC2",
        "requirement": "Snapshot completeness, retained identities and supplied receipts are explicit inputs; offline preview does not prove live freshness or permission."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-10-H01",
          "R1-10-H02",
          "R1-10-H03"
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
          "id": "R1-10-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1"
          ],
          "prerequisites": [
            "Complete snapshots S01–S18, S30–S40 with explicit expected result from the reviewed matrix."
          ],
          "steps": [
            "Run manager-preview for each named fixture.",
            "Compare selected ticket, reason and scope with the case expectation.",
            "Verify zero writes/imported provider access."
          ],
          "expected": [
            "Exact scenario results, except required repairs explicitly remain unsupported/held in this increment; invalid unrelated work never occupies a slot."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-10-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "AC4",
            "TAC2"
          ],
          "prerequisites": [
            "Filtered/incomplete snapshots; mismatched retained identity; unknown stage; queued required repair with otherwise ready Bug."
          ],
          "steps": [
            "Preview each snapshot.",
            "Inspect diagnostics and side-effect audit."
          ],
          "expected": [
            "Affected or shared scope holds as specified; no false free slot or repair bypass."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-10-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC5"
          ],
          "prerequisites": [
            "Two projects each with AI-Maria-1; A has five Human Review tickets, B has room; second active owner variant within B.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions."
          ],
          "steps": [
            "Preview both projects.",
            "Swap the full stream states between projects and repeat.",
            "Introduce the same-project second active owner."
          ],
          "expected": [
            "Capacity and selection follow project identity; B can progress while A is full, and same-project ownership conflict holds B without conflating A."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        }
      ]
    },
    "automated_regression": "Executable policy scenarios for readiness, occupancy, capacity, priority, membership and pause."
  },
  "open_questions": []
}
```

## R1-25: Validate repeated-parent repairs

[PGB-113](https://scubapig.atlassian.net/browse/PGB-113)

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

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The existing local chain validator rejects a legitimate repaired child that consumes older and newer updates from its actual parent. Workers and operators cannot validate the complete repair even when every required cause is present.",
  "prerequisites": [
    {
      "ticket": "R1-10",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The existing source and installed chain command validates current B2 implementation/review/QA consuming exact U1+U2 at verified A3, retaining R1 and R2 without duplicate leaf consumption."
    },
    {
      "id": "AC2",
      "requirement": "Historical U1/A2 remains valid nested evidence; selecting stale U1/A2 as current still fails its current-pointer/stage/PR checks."
    },
    {
      "id": "AC3",
      "requirement": "Divergent parent history, missing causes, invalid immutable metadata, duplicate direct requests and cycles reject without changing supplied data or authorizing execution."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own existing canonical receipt repeated-parent validation, source/installed tests and guides, plus the approved same-scope delivery-record amendment for this validator and PGB-81; no related repository changes.",
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
        "requirement": "Preserve public chain inputs/results and strict current completion, role/metadata/PR/no-publication/resume rules with zero provider effects; add no public permissive option, manager history export or preview policy."
      },
      {
        "id": "TAC2",
        "requirement": "Prove same-parent successors through actual repair-admission previous_assignment ancestry with preserved parent/PR/project/full-stream/repository identity; retain each direct request once and exact effective repair roots without weakening inherited QA execution proof."
      },
      {
        "id": "TAC3",
        "requirement": "Reuse the exact immutable 28-record chronology and complete current-phase synthetic envelopes; change only selected target and B outer stage, retain source/variant hashes and never derive expected outcomes from production validation."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Current Pigboard PR checkout, actual same-release installed chain command and prepared disposable local synthetic fixtures; no deployed customer target.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "Frozen 28-record repeated-parent H02 chronology, nine checkpoints and separate phase-bound C01 controls with fixed independent expectations; C02/C03 use fresh copies.",
        "initial_state": "No live provider data or credentials; frozen originals and all 119 prepared files remain unchanged; only disposable variants are edited.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
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
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns CLI/IaC or instruction contracts, which the currently approved automated QA skills do not execute. Human reviewers run these cases; developer CI and PR review remain required.",
      "cases": [
        {
          "id": "R1-25-C01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Prepared DATA-01, source checkout and actual same-release installed validate-handoff command; dummy data only, no credentials, network or deployed target.",
            "Frozen checkpoints/08-b2-full-qa/receipts/b2_qa.json with all 28 immutable records, complete 14/10/4-comment pages and all 28 retained metadata entries.",
            "Three separately named and hashed synthetic current-observation envelopes: c01-b2-implementation-in-review.json selects original 81026 with B/1001 stage 3; c01-b2-review-in-qa.json selects original 81027 with B stage 4; c01-b2-qa-in-human-review.json selects original 81028 with B stage 5.",
            "Apart from exact target selection and issues[id=1001].stage_id, each variant preserves the whole source envelope: B pointer/assignment 81025, U1+U2, PR11 open at revision 5555555555555555555555555555555555555555 targeting parent; A Human Review, assignment81020/completion81023, PR10 at revision3333333333333333333333333333333333333333; unchanged requirements/context, bodies/digests, metadata, pages, PR inventory and other issues."
          ],
          "steps": [
            "Check each variant against the frozen source and assert only the two allowed outer-field differences; record separate SHA256 values for source and each serialized variant.",
            "Run each variant through node scripts/validate-handoff.mjs --mode chain --input FILE in readable mode and again with --json; repeat with the actual installed validate-handoff script from an unrelated working directory.",
            "Check chain validity, complete U1+U2 consumption, R1+R2 root accounting, completion_established and zero writes; compare fixed expected outcomes below, never generated expectations.",
            "On separate unchanged completed-envelope copies select original implementation81026 and review81027 without rewinding B stage5; repeat source/installed commands and inspect /target/stage_id rejection.",
            "Recheck all source/variant hashes after execution and retain evidence before cleanup."
          ],
          "expected": [
            "All three phase-bound chains are valid with exact U1+U2 at proven A3; common R1 is covered once, R2 remains covered and no cause is dropped.",
            "Only QA81028 establishes completion; phase-valid implementation81026 and review81027 do not.",
            "The unchanged completed checkpoint rejects implementation/review selected as current at /target/stage_id; its QA target remains valid.",
            "Inputs and frozen history remain byte-identical; no provider/state writes or execution authorization occur; synthetic observations do not claim earlier real chronology."
          ],
          "evidence": [
            "Exact source and installed commands, selected target, tested commit, exit/result/diagnostics, zero-write audit and source/variant SHA256 before and after execution."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain commands, output, tested revision and before/after input hashes; remove only disposable variants and installed test output, never the frozen chronology or live records."
            ]
          }
        },
        {
          "id": "R1-25-C02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "C01 phase-bound controls, immutable A2/U1 references and later current outer observations from DATA-01; each control starts from a fresh copy.",
            "No receipt is resealed and no source body, digest, metadata, pointer, current PR or native observation is changed to make a stale target pass."
          ],
          "steps": [
            "Select authentic old A2 completion and U1 stack publication separately as current targets under their unchanged later observations.",
            "Run each through source and actual installed chain commands in readable and JSON modes; retain exact current-pointer/stage/PR diagnostics and hashes.",
            "Repeat all valid C01 phase-bound controls with those same immutable A2/U1 records nested in history; retain C01 completed-stage negative controls.",
            "Compare fixed expectations, check no writes and verify input hashes after each run."
          ],
          "expected": [
            "Stale A2/U1 selected as current rejects under the existing applicable pointer/stage/PR checks.",
            "The same authentic records are accepted only within proven ancestry of the valid current B2 controls; strict selected-target checks are never bypassed.",
            "Only valid current QA establishes completion; no input change or provider/state effect occurs."
          ],
          "evidence": [
            "Exact source and installed commands, selected target, tested commit, exit/result/diagnostics, zero-write audit and source/variant SHA256 before and after execution."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain commands, output, tested revision and before/after input hashes; remove only disposable variants and installed test output, never the frozen chronology or live records."
            ]
          }
        },
        {
          "id": "R1-25-C03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Fresh independent copies of C01 valid phase-bound controls and their fixed root/request expectations; keep one unchanged shared-leaf positive control.",
            "Separate invalid variants omit or alter retained metadata, change a parent or PR, remove predecessor proof, diverge ancestry, omit root/cause coverage, duplicate a direct request, or introduce a recursion cycle; record each exact mutation and input hash."
          ],
          "steps": [
            "Run each independent negative and the unchanged shared-leaf positive through source and actual installed chain commands, readable then JSON.",
            "Inspect validity, completion, diagnostics, full cause/root coverage and zero-write audit for each result.",
            "Verify source and input hashes after every run and retain mutation/output evidence before cleanup."
          ],
          "expected": [
            "Every missing/forged metadata, switched parent/PR, missing/divergent ancestry, omitted cause/root, duplicate direct request or cycle variant rejects without completion or writes.",
            "Two distinct valid paths to common R1 alone remain valid; all assigned direct U1+U2 requests are consumed once and R1+R2 coverage remains exact.",
            "Later timestamps or hashes alone never prove ancestry, and no failure edits supplied data or authorizes execution."
          ],
          "evidence": [
            "Exact source and installed commands, selected target, tested commit, exit/result/diagnostics, zero-write audit and source/variant SHA256 before and after execution."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain commands, output, tested revision and before/after input hashes; remove only disposable variants and installed test output, never the frozen chronology or live records."
            ]
          }
        }
      ]
    },
    "automated_regression": "Canonical repeated-parent ancestry and exact cause/root coverage with current-target isolation, inherited receipt authority and actual installed-runtime parity; preserve full receipt/installed suites and verify approved delivery metadata preservation."
  },
  "open_questions": []
}
```

## R1-26: Reject conflicting completion receipts

[PGB-129](https://scubapig.atlassian.net/browse/PGB-129)

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

[PGB-136](https://scubapig.atlassian.net/browse/PGB-136)

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

## R1-37: Keep repair proposals current

[PGB-151](https://scubapig.atlassian.net/browse/PGB-151)

### Problem to solve

The preview can return an old PR revision after observing a newer one. Consumers then receive a proposal that the receipt contract cannot accept.

### Acceptance Criteria

- **AC1.** Eligible repair admission uses the current observed PR source and target while preserving its existing identity, requests and parent requirements.
- **AC2.** A new stack publication is withheld when its recorded child completion differs from current PR source or target, with an actionable explanation and no replacement QA claim.
- **AC3.** Already-published valid requests remain usable history, unaffected cases keep their fixed results, and previews retain zero writes and false execution authority.

### Technical Acceptance Criteria

- **TAC1.** Use one repair PR based on prepared PGB-149 candidate 90c92fbcf9c8122bf03bcb5a9ee2f756e72dd379, tree 62b8e8b4754e504a7ca75a7d7cb983b8d19f3ffe, targeting codex/pgb149-machine-preview; integrate it there before any parent main merge.
- **TAC2.** Stay within the five named paths; preserve receipt validators, original fixtures/oracles, current/history authority, original PGB-149/PGB-146/PGB-81 requirements and human objects, and the guide exporter; retain zero writes and false execution authority.
- **TAC3.** This repair blocks PGB-149 without a reverse completion prerequisite; retain its original five prerequisites, amend its matching TAC, preserve historical publication captures, and append exact native/readback/Blocks/branch/plan/current-runtime bindings as a dated partial amendment. Full source/native reconciliation remains PGB-81.

### Testing Strategy

Human acceptance remains NOT_RUN. AI cases: zero.

#### R1-37-D1

- R1-37-D1
- human
- developer and human QA reviewer
- AC1
- AC3
- TAC2
- Use PREP-01 and DATA-01 at the exact reviewed repair revision based on prepared source 90c92fbcf9c8122bf03bcb5a9ee2f756e72dd379. All input/config/options/complete expectation paths and exact commands must be supplied before execution.
- Use prepared Node dependencies and synthetic local fixtures only. No account, credentials, UI, HTTP/Postman or live target is required.
- QA skills: []. Authorized direct developer checks are separate evidence; this designated human route remains NOT_RUN until a human performs it.
- From PREP-01 select OC01-selection with its complete current oracle and unchanged options.
- Run the unchanged control through the source API; then run the independently prepared source-only and source-plus-target PR10 variants once each.
- Compare each complete report to its fixed expectation and inspect the exact five-field existing_pr, retained assignment/requests/roots/parent requirements and authority.
- Control equals its complete frozen report: select/admit_repair for1000 with no new publication.
- Both variants retain the same admission and full report except the independently derived input digest and current five-field existing_pr; source is9999999999999999999999999999999999999999, and only source-plus-target uses repair-current-target.
- Assignment, requests, roots and parent requirements remain exact; writes stay0 and execution_authorized staysfalse.
- Retain exact source revision, commands/options, input and fixed-expectation hashes, complete outputs and exits.
- Retain before/after input inventories and evidence that original fixtures, receipt comments, references and evidence remain unchanged; verify zero product writes and false execution authority.
- prescribed
- human QA reviewer
- Retain evidence before cleanup, then remove only worker-owned synthetic exports and runtime copies; preserve original fixtures and historical evidence.

#### R1-37-D2

- R1-37-D2
- human
- developer and human QA reviewer
- AC2
- AC3
- TAC2
- Use PREP-01 and DATA-01 at the exact reviewed repair revision based on prepared source 90c92fbcf9c8122bf03bcb5a9ee2f756e72dd379. All input/config/options/complete expectation paths and exact commands must be supplied before execution.
- Use prepared Node dependencies and synthetic local fixtures only. No account, credentials, UI, HTTP/Postman or live target is required.
- QA skills: []. Authorized direct developer checks are separate evidence; this designated human route remains NOT_RUN until a human performs it.
- From PREP-01 select H02-02-a2-full-qa-before-u1 with its unchanged control, fixed reports and options.
- Run the control through the source API; then run its independently prepared PR11 source-only and source-plus-target variants once each.
- Compare complete reports and inspect the variant issue-scoped reason, repair_order, eligibility and null proposal.
- Control equals its complete frozen report: queue/queue_stack_update for1001 with required publication.
- Only the two variants wait with null proposal, actionable issue-scoped PR_HUMAN_HANDLING requiring coherent child-completion evidence, and a human_hold repair-order entry; no stale/invented payload or unrelated bypass is returned.
- Historical child QA, comments, references and causes remain exact; writes stay0 and execution authority staysfalse.
- Retain exact source revision, commands/options, input and fixed-expectation hashes, complete outputs and exits.
- Retain before/after input inventories and evidence that original fixtures, receipt comments, references and evidence remain unchanged; verify zero product writes and false execution authority.
- prescribed
- human QA reviewer
- Retain evidence before cleanup, then remove only worker-owned synthetic exports and runtime copies; preserve original fixtures and historical evidence.

#### R1-37-D3

- R1-37-D3
- human
- developer and human QA reviewer
- AC2
- AC3
- TAC2
- Use PREP-01 and DATA-01 at the exact reviewed repair revision based on prepared source 90c92fbcf9c8122bf03bcb5a9ee2f756e72dd379. All input/config/options/complete expectation paths and exact commands must be supplied before execution.
- Use prepared Node dependencies and synthetic local fixtures only. No account, credentials, UI, HTTP/Postman or live target is required.
- QA skills: []. Authorized direct developer checks are separate evidence; this designated human route remains NOT_RUN until a human performs it.
- From PREP-01 select H02-06-a3-full-qa-u2-unpublished with its unchanged control, fixed reports and options.
- Run the control through the source API; then run its independently prepared PR11 source-only and source-plus-target variants once each.
- Compare complete reports and inspect current parent proof, historical child evidence, variant reason and human_hold entry.
- Control equals its complete frozen report: select/admit_repair for1001 with required publication.
- Only the two variants wait with null proposal, actionable issue-scoped PR_HUMAN_HANDLING and a human_hold entry because new publication would bind stale child QA; no unrelated admission bypass occurs.
- Current parent proof and historical child evidence remain exact; no QA rewrite occurs, writes stay0 and execution authority staysfalse.
- Retain exact source revision, commands/options, input and fixed-expectation hashes, complete outputs and exits.
- Retain before/after input inventories and evidence that original fixtures, receipt comments, references and evidence remain unchanged; verify zero product writes and false execution authority.
- prescribed
- human QA reviewer
- Retain evidence before cleanup, then remove only worker-owned synthetic exports and runtime copies; preserve original fixtures and historical evidence.

#### R1-37-D4

- R1-37-D4
- human
- developer and human QA reviewer
- AC1
- AC3
- TAC2
- Use PREP-01 and DATA-01 at the exact reviewed repair revision based on prepared source 90c92fbcf9c8122bf03bcb5a9ee2f756e72dd379. All input/config/options/complete expectation paths and exact commands must be supplied before execution.
- Use prepared Node dependencies and synthetic local fixtures only. No account, credentials, UI, HTTP/Postman or live target is required.
- QA skills: []. Authorized direct developer checks are separate evidence; this designated human route remains NOT_RUN until a human performs it.
- From PREP-01 select H02-07-u2-published-b-not-admitted with its unchanged control, fixed reports and options.
- Run the control through the source API; then run its independently prepared PR11 source-only and source-plus-target variants once each.
- Compare complete reports and inspect the exact current five-field admission PR and retained published request/root/parent references.
- Control equals its complete frozen report: select/admit_repair for1001 with no new publication.
- Both variants retain that admission and full report except the independently derived input digest and current five-field existing_pr; exact published requests, roots and parent references remain unchanged.
- There is no new stack payload or invented hold; writes stay0 and execution_authorized staysfalse.
- Retain exact source revision, commands/options, input and fixed-expectation hashes, complete outputs and exits.
- Retain before/after input inventories and evidence that original fixtures, receipt comments, references and evidence remain unchanged; verify zero product writes and false execution authority.
- prescribed
- human QA reviewer
- Retain evidence before cleanup, then remove only worker-owned synthetic exports and runtime copies; preserve original fixtures and historical evidence.

#### R1-37-D5

- R1-37-D5
- human
- developer and human QA reviewer
- AC1
- AC2
- AC3
- TAC1
- TAC2
- TAC3
- Use PREP-01 and DATA-01 at the exact reviewed repair revision based on prepared source 90c92fbcf9c8122bf03bcb5a9ee2f756e72dd379. All input/config/options/complete expectation paths and exact commands must be supplied before execution.
- Use prepared Node dependencies and synthetic local fixtures only. No account, credentials, UI, HTTP/Postman or live target is required.
- QA skills: []. Authorized direct developer checks are separate evidence; this designated human route remains NOT_RUN until a human performs it.
- After D1–D4, use only the already-prepared D1 and D2 source-plus-target inputs and options; do not derive another scenario.
- From the unrelated cwd run each input once through copied-runtime JSON with the complete prepared closure; compare the complete JSON value to its already-fixed D1/D2 expected report and check its prescribed exit.
- Inspect exact source/branch/plan/native/readback/Blocks bindings and affected publication-guard evidence, complete closure/runtime/dependency manifests, and before/after inventories.
- The two copied JSON values equal their fixed full source expectations: D1 admits1000 using current source and repair-current-target without new publication; D2 waits with null proposal and actionable child-QA handling.
- Prepared dependency/package-lock equality and complete runtime closure hold; exactly lib/manager/repair-policy.mjs differs from the90c92 runtime map.
- Historical captures/maps remain fixed history; the new partial amendment binds every current allowlisted artifact, fixture/aggregate hashes, revised149 prerequisite/TAC and actual repair→149 Blocks link. Source inventory stays30 Stories/132 cases; full reconciliation remains81.
- The repair PR targets codex/pgb149-machine-preview from prepared90c92, within five paths; neither repair nor149 is Done before main integration. No product scenario or authority is added.
- Retain exact source revision, commands/options, input and fixed-expectation hashes, complete outputs and exits.
- Retain before/after input inventories and evidence that original fixtures, receipt comments, references and evidence remain unchanged; verify zero product writes and false execution authority.
- Retain complete copied-runtime and dependency/package-lock manifests, unrelated cwd, current/historical publication guard results and exact native/branch/readback/Blocks bindings.
- prescribed
- human QA reviewer
- Retain evidence before cleanup, then remove only worker-owned synthetic exports and runtime copies; preserve original fixtures and historical evidence.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The preview can return an old PR revision after observing a newer one. Consumers then receive a proposal that the receipt contract cannot accept.",
  "prerequisites": [],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "Eligible repair admission uses the current observed PR source and target while preserving its existing identity, requests and parent requirements."
    },
    {
      "id": "AC2",
      "requirement": "A new stack publication is withheld when its recorded child completion differs from current PR source or target, with an actionable explanation and no replacement QA claim."
    },
    {
      "id": "AC3",
      "requirement": "Already-published valid requests remain usable history, unaffected cases keep their fixed results, and previews retain zero writes and false execution authority."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "codex/pgb149-machine-preview",
      "change_boundary": "Change only these five existing paths: lib/manager/repair-policy.mjs, test/repair-policy.test.mjs, docs/manager-preview.md, docs/delivery/manager-r1/publication.json, test/qa-helper-contract.test.mjs. Deliver current PR admission references, safe new stack publication, regression coverage, guide recovery and a dated partial publication amendment.",
      "out_of_scope": [
        "Receipt-validator or schema changes; original fixture/input/oracle changes; renderer or snapshot-normalization changes.",
        "Provider operations, dependency installation, deployment or activation; other repositories or paths.",
        "Changes to original PGB-149/PGB-146/PGB-81 criteria or human cases, except the explicitly authorized added repair prerequisite and matching PGB-149 TAC amendment."
      ],
      "related_repositories": []
    },
    "accepted_decisions": [],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Use one repair PR based on prepared PGB-149 candidate 90c92fbcf9c8122bf03bcb5a9ee2f756e72dd379, tree 62b8e8b4754e504a7ca75a7d7cb983b8d19f3ffe, targeting codex/pgb149-machine-preview; integrate it there before any parent main merge."
      },
      {
        "id": "TAC2",
        "requirement": "Stay within the five named paths; preserve receipt validators, original fixtures/oracles, current/history authority, original PGB-149/PGB-146/PGB-81 requirements and human objects, and the guide exporter; retain zero writes and false execution authority."
      },
      {
        "id": "TAC3",
        "requirement": "This repair blocks PGB-149 without a reverse completion prerequisite; retain its original five prerequisites, amend its matching TAC, preserve historical publication captures, and append exact native/readback/Blocks/branch/plan/current-runtime bindings as a dated partial amendment. Full source/native reconciliation remains PGB-81."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Exact reviewed repair source revision based on prepared 90c92fbcf9c8122bf03bcb5a9ee2f756e72dd379; unchanged synthetic manager-repairs.json, prepared Node dependencies and complete copied runtime from an unrelated cwd. No deployed target.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "The four fixed cases OC01-selection, H02-02-a2-full-qa-before-u1, H02-06-a3-full-qa-u2-unpublished, H02-07-u2-published-b-not-admitted, each unchanged control and its independent source-only/source-plus-target copies; full fixed expectations and complete prepared copied-runtime closure.",
        "initial_state": "PREP-01 records absolute config/input/options/expectation paths, exact source API and copied JSON commands, input/runtime/dependency hashes and complete fixed expectations before execution. Original cases and receipts remain untouched.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Supply the exact reviewed source revision, prepared Node dependencies, unchanged test/fixtures/manager-repairs.json and complete copied runtime/unrelated cwd. For OC01-selection join inherited_own_preview.original.cases inputs/config/options to inherited_own_preview.cases full current expected by exact ID; use named cases records/full expected for H02-02-a2-full-qa-before-u1, H02-06-a3-full-qa-u2-unpublished and H02-07-u2-published-b-not-admitted. Prepare each control plus two separate fresh copies. For D1 change PR10; for D2–D4 change PR11. In every repair_receipts/completion_receipts envelope containing that provider/repository/number, require exactly one matching current observation, retain it with only current:false, and append its clone with current:true and source_revision:9999999999999999999999999999999999999999. Source-only keeps the target; source-plus-target sets only the appended target_branch to repair-current-target. Apply each variant independently to the control, consistently across envelopes; preserve original comments/evidence/references/config and all other observations. Use original options, retaining expectedSite and all supplied keys; if expectedSnapshotDigest exists, bind it independently to the variant digest, and do not add an absent guard. Forward API options and existing CLI flag mappings. Independently calculate the output snapshot digest and freeze complete expected reports from the existing full oracles plus specified contract outcomes, including exact reason text, repair_order, eligibility and unchanged fields, before execution; never capture runtime output as an oracle. Record absolute paths, exact commands/options, prescribed exits and manifests. Prepare existing publication guard commands and historical/current binding evidence for D5 inspection; no additional product scenario.",
        "used_by": [
          "DATA-01",
          "R1-37-D1",
          "R1-37-D2",
          "R1-37-D3",
          "R1-37-D4",
          "R1-37-D5"
        ],
        "preserves": [
          "Original fixture inputs/full expected results, receipt bodies/references/evidence and guide exporter remain unchanged; never rewrite QA or fabricate same-revision target conflicts.",
          "Every admission PR reference contains exactly provider, repository, number, source_revision and target_branch; no state/current observation fields.",
          "D1–D4 total 12 API evaluations once; D5 adds only 2 copied-runtime JSON evaluations once. No diagnostic or broad scenario campaign, dependency fetch or repair.",
          "Original PGB-149 two, PGB-146 two and PGB-81 forty-two human objects remain untouched; all new designated human routes remain NOT_RUN until a human performs them.",
          "Direct developer checks, human acceptance, independent reviews, local checks, hosted CI, merge and release evidence remain separately attributed."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "QA skills: []. Approved QA skills do not execute this local CLI/internal API contract. Authorized direct developer checks produce separate evidence; the five designated human routes remain NOT_RUN until performed by a human.",
      "cases": [
        {
          "id": "R1-37-D1",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC3",
            "TAC2"
          ],
          "prerequisites": [
            "Use PREP-01 and DATA-01 at the exact reviewed repair revision based on prepared source 90c92fbcf9c8122bf03bcb5a9ee2f756e72dd379. All input/config/options/complete expectation paths and exact commands must be supplied before execution.",
            "Use prepared Node dependencies and synthetic local fixtures only. No account, credentials, UI, HTTP/Postman or live target is required.",
            "QA skills: []. Authorized direct developer checks are separate evidence; this designated human route remains NOT_RUN until a human performs it."
          ],
          "steps": [
            "From PREP-01 select OC01-selection with its complete current oracle and unchanged options.",
            "Run the unchanged control through the source API; then run the independently prepared source-only and source-plus-target PR10 variants once each.",
            "Compare each complete report to its fixed expectation and inspect the exact five-field existing_pr, retained assignment/requests/roots/parent requirements and authority."
          ],
          "expected": [
            "Control equals its complete frozen report: select/admit_repair for1000 with no new publication.",
            "Both variants retain the same admission and full report except the independently derived input digest and current five-field existing_pr; source is9999999999999999999999999999999999999999, and only source-plus-target uses repair-current-target.",
            "Assignment, requests, roots and parent requirements remain exact; writes stay0 and execution_authorized staysfalse."
          ],
          "evidence": [
            "Retain exact source revision, commands/options, input and fixed-expectation hashes, complete outputs and exits.",
            "Retain before/after input inventories and evidence that original fixtures, receipt comments, references and evidence remain unchanged; verify zero product writes and false execution authority."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence before cleanup, then remove only worker-owned synthetic exports and runtime copies; preserve original fixtures and historical evidence."
            ]
          }
        },
        {
          "id": "R1-37-D2",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "TAC2"
          ],
          "prerequisites": [
            "Use PREP-01 and DATA-01 at the exact reviewed repair revision based on prepared source 90c92fbcf9c8122bf03bcb5a9ee2f756e72dd379. All input/config/options/complete expectation paths and exact commands must be supplied before execution.",
            "Use prepared Node dependencies and synthetic local fixtures only. No account, credentials, UI, HTTP/Postman or live target is required.",
            "QA skills: []. Authorized direct developer checks are separate evidence; this designated human route remains NOT_RUN until a human performs it."
          ],
          "steps": [
            "From PREP-01 select H02-02-a2-full-qa-before-u1 with its unchanged control, fixed reports and options.",
            "Run the control through the source API; then run its independently prepared PR11 source-only and source-plus-target variants once each.",
            "Compare complete reports and inspect the variant issue-scoped reason, repair_order, eligibility and null proposal."
          ],
          "expected": [
            "Control equals its complete frozen report: queue/queue_stack_update for1001 with required publication.",
            "Only the two variants wait with null proposal, actionable issue-scoped PR_HUMAN_HANDLING requiring coherent child-completion evidence, and a human_hold repair-order entry; no stale/invented payload or unrelated bypass is returned.",
            "Historical child QA, comments, references and causes remain exact; writes stay0 and execution authority staysfalse."
          ],
          "evidence": [
            "Retain exact source revision, commands/options, input and fixed-expectation hashes, complete outputs and exits.",
            "Retain before/after input inventories and evidence that original fixtures, receipt comments, references and evidence remain unchanged; verify zero product writes and false execution authority."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence before cleanup, then remove only worker-owned synthetic exports and runtime copies; preserve original fixtures and historical evidence."
            ]
          }
        },
        {
          "id": "R1-37-D3",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "TAC2"
          ],
          "prerequisites": [
            "Use PREP-01 and DATA-01 at the exact reviewed repair revision based on prepared source 90c92fbcf9c8122bf03bcb5a9ee2f756e72dd379. All input/config/options/complete expectation paths and exact commands must be supplied before execution.",
            "Use prepared Node dependencies and synthetic local fixtures only. No account, credentials, UI, HTTP/Postman or live target is required.",
            "QA skills: []. Authorized direct developer checks are separate evidence; this designated human route remains NOT_RUN until a human performs it."
          ],
          "steps": [
            "From PREP-01 select H02-06-a3-full-qa-u2-unpublished with its unchanged control, fixed reports and options.",
            "Run the control through the source API; then run its independently prepared PR11 source-only and source-plus-target variants once each.",
            "Compare complete reports and inspect current parent proof, historical child evidence, variant reason and human_hold entry."
          ],
          "expected": [
            "Control equals its complete frozen report: select/admit_repair for1001 with required publication.",
            "Only the two variants wait with null proposal, actionable issue-scoped PR_HUMAN_HANDLING and a human_hold entry because new publication would bind stale child QA; no unrelated admission bypass occurs.",
            "Current parent proof and historical child evidence remain exact; no QA rewrite occurs, writes stay0 and execution authority staysfalse."
          ],
          "evidence": [
            "Retain exact source revision, commands/options, input and fixed-expectation hashes, complete outputs and exits.",
            "Retain before/after input inventories and evidence that original fixtures, receipt comments, references and evidence remain unchanged; verify zero product writes and false execution authority."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence before cleanup, then remove only worker-owned synthetic exports and runtime copies; preserve original fixtures and historical evidence."
            ]
          }
        },
        {
          "id": "R1-37-D4",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC3",
            "TAC2"
          ],
          "prerequisites": [
            "Use PREP-01 and DATA-01 at the exact reviewed repair revision based on prepared source 90c92fbcf9c8122bf03bcb5a9ee2f756e72dd379. All input/config/options/complete expectation paths and exact commands must be supplied before execution.",
            "Use prepared Node dependencies and synthetic local fixtures only. No account, credentials, UI, HTTP/Postman or live target is required.",
            "QA skills: []. Authorized direct developer checks are separate evidence; this designated human route remains NOT_RUN until a human performs it."
          ],
          "steps": [
            "From PREP-01 select H02-07-u2-published-b-not-admitted with its unchanged control, fixed reports and options.",
            "Run the control through the source API; then run its independently prepared PR11 source-only and source-plus-target variants once each.",
            "Compare complete reports and inspect the exact current five-field admission PR and retained published request/root/parent references."
          ],
          "expected": [
            "Control equals its complete frozen report: select/admit_repair for1001 with no new publication.",
            "Both variants retain that admission and full report except the independently derived input digest and current five-field existing_pr; exact published requests, roots and parent references remain unchanged.",
            "There is no new stack payload or invented hold; writes stay0 and execution_authorized staysfalse."
          ],
          "evidence": [
            "Retain exact source revision, commands/options, input and fixed-expectation hashes, complete outputs and exits.",
            "Retain before/after input inventories and evidence that original fixtures, receipt comments, references and evidence remain unchanged; verify zero product writes and false execution authority."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence before cleanup, then remove only worker-owned synthetic exports and runtime copies; preserve original fixtures and historical evidence."
            ]
          }
        },
        {
          "id": "R1-37-D5",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Use PREP-01 and DATA-01 at the exact reviewed repair revision based on prepared source 90c92fbcf9c8122bf03bcb5a9ee2f756e72dd379. All input/config/options/complete expectation paths and exact commands must be supplied before execution.",
            "Use prepared Node dependencies and synthetic local fixtures only. No account, credentials, UI, HTTP/Postman or live target is required.",
            "QA skills: []. Authorized direct developer checks are separate evidence; this designated human route remains NOT_RUN until a human performs it."
          ],
          "steps": [
            "After D1–D4, use only the already-prepared D1 and D2 source-plus-target inputs and options; do not derive another scenario.",
            "From the unrelated cwd run each input once through copied-runtime JSON with the complete prepared closure; compare the complete JSON value to its already-fixed D1/D2 expected report and check its prescribed exit.",
            "Inspect exact source/branch/plan/native/readback/Blocks bindings and affected publication-guard evidence, complete closure/runtime/dependency manifests, and before/after inventories."
          ],
          "expected": [
            "The two copied JSON values equal their fixed full source expectations: D1 admits1000 using current source and repair-current-target without new publication; D2 waits with null proposal and actionable child-QA handling.",
            "Prepared dependency/package-lock equality and complete runtime closure hold; exactly lib/manager/repair-policy.mjs differs from the90c92 runtime map.",
            "Historical captures/maps remain fixed history; the new partial amendment binds every current allowlisted artifact, fixture/aggregate hashes, revised149 prerequisite/TAC and actual repair→149 Blocks link. Source inventory stays30 Stories/132 cases; full reconciliation remains81.",
            "The repair PR targets codex/pgb149-machine-preview from prepared90c92, within five paths; neither repair nor149 is Done before main integration. No product scenario or authority is added."
          ],
          "evidence": [
            "Retain exact source revision, commands/options, input and fixed-expectation hashes, complete outputs and exits.",
            "Retain before/after input inventories and evidence that original fixtures, receipt comments, references and evidence remain unchanged; verify zero product writes and false execution authority.",
            "Retain complete copied-runtime and dependency/package-lock manifests, unrelated cwd, current/historical publication guard results and exact native/branch/readback/Blocks bindings."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence before cleanup, then remove only worker-owned synthetic exports and runtime copies; preserve original fixtures and historical evidence."
            ]
          }
        }
      ]
    },
    "automated_regression": "Retain the bounded current-admission/child-completion-publication table, unchanged full-case controls and historical/current publication binding guards."
  },
  "open_questions": []
}
```

## R1-39: Preserve published repairs across identical QA copies

[PGB-153](https://scubapig.atlassian.net/browse/PGB-153)

### Problem to solve

Two authenticated publications of the same QA result can make preview treat an existing stack request as missing. An operator receives an unnecessary publication payload depending on input order.

### Acceptance Criteria

- **AC1.** Equivalent authenticated QA copies and their envelope order do not duplicate or lose an existing required stack request; output uses stable authenticated exact references.
- **AC2.** Strict current-parent authority and exact incorporated cutoff remain required, and a genuinely missing publication or conflicting logical QA result retains its existing outcome.
- **AC3.** The full reports preserve unchanged assignments, exact requests/roots, PGB-151 PR-reference safeguards, zero writes and false execution authority.

### Technical Acceptance Criteria

- **TAC1.** Base one five-path PR on prepared PGB-149 source9305f5cd2beea8bba84121b076efc8210a625459, treecd94c4be3e9b1ef5527307214d890701eba1f39c, targeting codex/pgb149-machine-preview. This repair blocks149 with an added AI-QA prerequisite and matching TAC amendment while preserving its original five plus151 and all links/human objects; no reverse149 completion prerequisite. Preserve full historical receipts and append actual source/native/readback/plan/dependency/current-runtime bindings; integrate before parent main merge, with neither Story Done before main.
- **TAC2.** Resolve both exact references through authenticated completed-QA rows before comparing ticket/record/digest. Apply equivalence only to existing stack-request child/parent QA and coverage fallback parent endpoint; keep exact current-parent proof, incorporated cutoff, assignment/request/root lookup, consumption and ranking. Choose the current-assignment child QA deterministically by existing exact-reference key order. Preserve151 safeguards, original validators/schemas/fixtures and zero authority; add no provider operation, activation or general reference normalization.

### Testing Strategy

Human acceptance remains NOT_RUN. AI cases: zero.

#### R1-39-H01

- R1-39-H01
- human
- developer and human QA reviewer
- AC1
- AC2
- AC3
- TAC1
- TAC2
- PREP-01/DATA-01 supplies the reviewed revision, all nine complete frozen cases/expectations and exact API commands/options/hashes. Follow each named control and variant outcome separately.
- Prepared synthetic fixtures and Node dependencies only; no account, credentials, UI, HTTP/Postman or live target.
- Verify PREP-01 source/input/expectation bindings and immutable originals before execution.
- Run C1–C9 once each in order through the source API with the exact original/prepared options. The authorized author run totals nine API evaluations; human execution is recorded separately.
- Compare each complete report to its independently frozen expectation; inspect deterministic exact child QA, strict current parent and exact cutoff, original requests/roots, publication status, conflict controls and zero authority.
- Retain full results, exits and immutable before/after input evidence; stop on a failure without retries.
- C1 is the complete published H02-07 control. C2/C3 equal its entire report except their input-derived digest: child81008, select1001, no publication payload/warning, exact original requests/roots/current parent and selection/eligibility.
- C4 is the complete missing-U2 H02-06 control. C5/C6 equal its entire report except their input-derived digest, retaining required publication and exact deterministic81008 payload; no missing request is waived.
- C7 equals complete C1 except its digest and authenticated required_parent.completion.comment_id99023. Strict current parent QA remains valid, exact incorporated cutoff/old references stay intact, and no new payload or hold appears.
- C8/C9 retain their complete conflicting-QA control reports, including wait/null proposal, REPAIR_PROOF_INVALID /issues/2 and1001 human_hold; distinct logical QA is not coalesced.
- Every case preserves original assignments/requests/roots and151 PR safeguards, writes0 and execution_authorized:false; no human case becomes PASS from developer execution.
- Retain tested revision, exact commands/options, all nine full outputs/exits, fixed input/expectation hashes, runtime/Node/dependency manifests and before/after immutable inventories.
- Retain original failures and all independent expectation/construction provenance; never use output as an oracle.
- prescribed
- human QA reviewer
- After evidence capture remove only worker-owned disposable exports/copies; preserve frozen source, historical failures and original fixtures.

#### R1-39-H02

- R1-39-H02
- human
- developer and human QA reviewer
- AC1
- AC2
- AC3
- TAC1
- TAC2
- Complete PREP-01/DATA-01 with the same already-frozen C2/C7 inputs/options/full expectations and prepared copied runtime; use the unrelated cwd.
- Use prepared dependencies only; no account, credentials, UI, HTTP/Postman or live target. Human status remains NOT_RUN until a human performs this route.
- From the unrelated cwd run only C2 and C7 once each through copied-runtime JSON with PREP-01 exact config/input paths and existing option-to-flag mapping; no new derivation or scenario.
- Compare each complete JSON value to its already-fixed source expectation; require exit0 and retain stdout/stderr/exits.
- Inspect complete runtime/Node/dependency/package-lock closure and input inventories before/after, plus source/native/plan/dependency and historical/current publication-guard bindings.
- C2 copied JSON equals the complete fixed published-request variant: deterministic child81008, select1001 and no new payload/publication warning.
- C7 copied JSON equals its complete fixed strict-current parent-alias report: authenticated parent99023, original cutoff/requests/roots, select1001 and no new payload or hold.
- Exactly two copied evaluations complete the eleven-product-call author budget; prepared dependency bytes and inputs remain unchanged, only policy differs from9305 runtime, all prior captures/maps remain history, and writes0/false authority remain.
- New native amendment preserves149 original five+151 prerequisites and links plus its single repair blocker, with no reverse dependency or premature Done; source inventory and full81/State ownership remain distinct.
- Retain tested source/runtime revision, exact commands/options, complete JSON stdout/stderr/exits, fixed input/expected hashes and full runtime/Node/dependency/package-lock manifests.
- Retain before/after input/runtime inventories and native/readback/link/plan/current-versus-historical binding evidence; human execution remains separately attributed.
- prescribed
- human QA reviewer
- After evidence capture remove only worker-owned exports and runtime copies; retain original prepared runtime, historical evidence and frozen source.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Two authenticated publications of the same QA result can make preview treat an existing stack request as missing. An operator receives an unnecessary publication payload depending on input order.",
  "prerequisites": [],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "Equivalent authenticated QA copies and their envelope order do not duplicate or lose an existing required stack request; output uses stable authenticated exact references."
    },
    {
      "id": "AC2",
      "requirement": "Strict current-parent authority and exact incorporated cutoff remain required, and a genuinely missing publication or conflicting logical QA result retains its existing outcome."
    },
    {
      "id": "AC3",
      "requirement": "The full reports preserve unchanged assignments, exact requests/roots, PGB-151 PR-reference safeguards, zero writes and false execution authority."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "codex/pgb149-machine-preview",
      "change_boundary": "One repair PR changes only these five existing paths: lib/manager/repair-policy.mjs, test/repair-policy.test.mjs, docs/manager-preview.md, docs/delivery/manager-r1/publication.json, test/qa-helper-contract.test.mjs. Preserve authenticated QA-copy identity across existing/missing stack publication and strict-current parent alias handling, with tests, guide, partial receipt and guards.",
      "out_of_scope": [
        "Schema, receipt-validator, original fixture/oracle, renderer, installer, helper-module or State-owned branch changes; general reference normalization or new ordering policy.",
        "Provider operations, dependency installation/repair, deployment, activation, new151 scope or full81 source/native reconciliation."
      ],
      "related_repositories": []
    },
    "accepted_decisions": [],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Base one five-path PR on prepared PGB-149 source9305f5cd2beea8bba84121b076efc8210a625459, treecd94c4be3e9b1ef5527307214d890701eba1f39c, targeting codex/pgb149-machine-preview. This repair blocks149 with an added AI-QA prerequisite and matching TAC amendment while preserving its original five plus151 and all links/human objects; no reverse149 completion prerequisite. Preserve full historical receipts and append actual source/native/readback/plan/dependency/current-runtime bindings; integrate before parent main merge, with neither Story Done before main."
      },
      {
        "id": "TAC2",
        "requirement": "Resolve both exact references through authenticated completed-QA rows before comparing ticket/record/digest. Apply equivalence only to existing stack-request child/parent QA and coverage fallback parent endpoint; keep exact current-parent proof, incorporated cutoff, assignment/request/root lookup, consumption and ranking. Choose the current-assignment child QA deterministically by existing exact-reference key order. Preserve151 safeguards, original validators/schemas/fixtures and zero authority; add no provider operation, activation or general reference normalization."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Exact reviewed repair revision based on prepared source9305f5cd2beea8bba84121b076efc8210a625459; unchanged synthetic manager-repairs.json and prepared complete runtime/Node dependencies. Copied checks use an unrelated cwd; no live target.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "C1–C9 full inputs and independent fixed reports for H02-07-u2-published-b-not-admitted, H02-06-a3-full-qa-u2-unpublished, OC05-competing-completions-no-parent-first and OC05-competing-completions-stack-parent-first, plus prescribed QA-copy/parent-alias variants and complete copied runtime.",
        "initial_state": "PREP-01 supplies all exact independent copies, recipes, options, complete expectations, command paths and hashes before execution; original source/evidence remains unchanged.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Use the exact reviewed repair revision based on prepared PGB-149 source9305f5cd2beea8bba84121b076efc8210a625459, treecd94c4be3e9b1ef5527307214d890701eba1f39c, prepared Node dependencies and unchanged test/fixtures/manager-repairs.json (SHA25626280bc8c5095b32fe1bd8279a060f7b6fdafec1b3fc442569c4916d1c1665a7). Supply a complete worker-owned copy of the existing prepared runtime and an unrelated cwd; preserve the original copy and evidence. No account, credential, UI, HTTP/Postman or live target is needed.\n\nControl provenance: C1 uses the exact cases record H02-07-u2-published-b-not-admitted and its full expected report; C4 uses H02-06-a3-full-qa-u2-unpublished and its full expected report. For C8 OC05-competing-completions-no-parent-first and C9 OC05-competing-completions-stack-parent-first, take inputs/config/options from inherited_own_preview.original.cases and join each exact ID to its full current report in inherited_own_preview.cases. Never substitute an older inherited expected report. Every case starts as a fresh independent copy of its named control.\n\nChild-copy recipe for C2/C3 and C5/C6: from that case's snapshot.repair_receipts find exactly one parsed envelope whose target.ticket_id is1001 and target.comment_id is81008. Clone that entire envelope. In its ticket1001 comment_pages page require start_at0, total equal to comments.length and the original complete-page metadata; find comment.id81008 and its exact retained tuple. Require99008 absent. Append an exact copy of that comment with only id changed to99008; increment only that page's total by1. Append an exact copy of the retained tuple with only comment_id changed to99008. Change only the cloned envelope's target.comment_id to99008, keeping target.ticket_id/record_id/digest exact. Keep the original envelope, original81008 comment/tuple and every original request/reference/body. JSON-encode the clone with existing field order. Require no existing completion_receipts target for ticket1001 before adding this envelope. B stays Rework Queued, so the clone supplies history and grants no strict current completion.\n\nC1: unchanged H02-07 control. Expected: its complete fixed report, select/admit_repair1001, deterministic child_completion81008, publication_required:false, required_stack_updates:[], original request/root/current-parent references and selection/eligibility, zero writes and false authority.\n\nC2: apply the child-copy recipe independently to C1, placing only the new99008 envelope first in completion_receipts and preserving the original array's relative order. C3: apply the same recipe independently to C1, placing that same new envelope last. C2/C3 expected: each entire C1 report except its independently calculated snapshot_digest; retain child81008, original published requests/roots/current parent, no new payload or publication warning, same selection/eligibility, zero writes and false authority. Array order cannot create another publication.\n\nC4: unchanged H02-06 control. Expected: its complete fixed report, select/admit_repair1001, publication_required:true and its exact81008 child payload for genuinely missing U2. C5/C6: apply the same child-copy recipe independently to C4, putting the new99008 envelope first/last respectively in completion_receipts; preserve every original item/order otherwise. Each expected report equals the entire C4 report except its independently calculated snapshot_digest, including the exact deterministic81008 payload, required publication, original requests/roots/current parent, selection/eligibility, zero writes and false authority. Identical QA neither invents publication nor waives missing U2.\n\nC7: start independently from C1. In completion_receipts find exactly one existing current-parent envelope with target.ticket_id1000 and target.comment_id81023. In that envelope's ticket1000 page require start_at0, total equal to comments.length and original complete-page metadata; locate original81023 comment and exact retained tuple, and require99023 absent. Append the exact same-body/server-metadata comment with only id99023, append the exact retained tuple with only comment_id99023, increment only that page's total by1, and change only this envelope's target.comment_id from81023 to99023. Keep target ticket/record/digest, all old comments/tuples/requests, every other envelope, exact child incorporated cutoff, requirements, native stages/current assignment and PR observations unchanged; JSON-encode in existing field order. Expected: the entire C1 report except independently calculated snapshot_digest and proposal.required_parent.completion.comment_id99023; its ticket1000, record81000000-0000-4000-8000-000000000023 and digestsha256:4d4cd1f5c92e0548fc245014c1bd97fce659e3208a523c5e33ef0bff6087783d remain exact. Parent remains strict current accepted QA of the same logical result. Select1001, deterministic child81008, no new payload/publication warning/hold; retain exact old requests/roots/cutoff, zero writes and false authority. If static preparation cannot establish this contract, stop for Astra; do not try product calls to discover an expectation.\n\nC8/C9: leave the two named inherited OC05 controls unchanged. Each equals its entire current frozen report: valid:true, status:complete, scope_diagnostics:[], wait with null selection/proposal and issue-scoped REPAIR_PROOF_INVALID at /issues/2, human_hold for1001 and no unrelated admission. Different logical QA bodies remain conflicting in both envelope orders; do not coalesce them. Keep all original flags/reasons/repair_order and zero writes/false authority.\n\nFor C1–C9 preserve each original options object, including expectedSite and all supplied keys. If expectedSnapshotDigest already exists, bind it independently to the variant's digest; never add an absent guard. Independently calculate snapshot_digest as SHA256 of RFC8785 canonical JSON {configuration_digest,snapshot}, using the unchanged control's configuration_digest. Before any repaired execution, freeze every complete input/config/options/expected report, exact reference/reason/repair_order/eligibility fields, paths and hashes. Derive variants only from the independent full control reports and specified contract deltas; never use original failure or repaired runtime output as an oracle.\n\nSupply exact commands using the reviewed source lib/manager/decisions.mjs previewSnapshot(JSON.stringify(config),JSON.stringify(snapshot),options) once for each C1–C9 in order. For copied C2 and C7 only, use prepared Node to invoke the copied scripts/manager-preview.mjs --config <absolute-config-path> --input <absolute-snapshot-path> --json from the unrelated cwd. Map only supplied expectedSite to --expected-site and expectedSnapshotDigest to --expected-snapshot-digest. Use the same fixed inputs/options/full expected values; expected exit is0 for each complete report. Retain stdout/stderr/exits, Node/runtime/dependency/package-lock manifests, input/expectation hashes and before/after inventories. Refresh only reviewed policy bytes in the worker-owned complete runtime copy; do not install, fetch or repair dependencies. Nine API plus two copied calls are the entire author product-evaluation budget; no additional diagnostic, matrix, installer, smoke or151 replay.\n\nRetain exact source/base/branch/plan/native/readback/dependency bindings and affected historical/current publication-guard evidence. Preserve all historical receipt objects/maps and bind all current allowlisted artifacts/aggregate/unchanged fixture in the new partial amendment; only policy differs from9305 runtime. Keep original151 regression and guide67-case exporter,151 recovery, State146 Cause guidance when integrated, and all original149/151/146/81 human objects. Source inventory stays30 Stories/132 cases; this is a partial native amendment and full reconciliation remains81. Preserve independent review, hosted full npm, current Codex approval, child/parent merge gates and State-owned integration separately. Nothing is Done before combined main integration.",
        "used_by": [
          "DATA-01",
          "R1-39-H01",
          "R1-39-H02"
        ],
        "preserves": [
          "All original fixture inputs/full oracles, exact QA/assignment/request/root records, native human objects, historical failures/receipts/runtime maps and151 successful evidence retain their original revisions.",
          "New human routes H01/H02 remain NOT_RUN until human execution. Authorized direct developer checks are separate from human acceptance and independent QA; QA skills/types/cases/dispatch remain empty.",
          "Freeze complete values before repaired execution; nine source API and two copied JSON evaluations once, no retries or extra scenario campaign. Failure stops affected verification; preserve evidence and return a changed causal strategy to Astra.",
          "Cleanup removes only worker-owned disposable exports/copies after evidence capture; never change frozen source, live records or historical evidence."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "QA skills: []. Approved QA skills do not execute this internal API/CLI contract. Authorized direct developer evidence is separate from designated human execution; H01/H02 remain NOT_RUN until a human performs them.",
      "cases": [
        {
          "id": "R1-39-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "PREP-01/DATA-01 supplies the reviewed revision, all nine complete frozen cases/expectations and exact API commands/options/hashes. Follow each named control and variant outcome separately.",
            "Prepared synthetic fixtures and Node dependencies only; no account, credentials, UI, HTTP/Postman or live target."
          ],
          "steps": [
            "Verify PREP-01 source/input/expectation bindings and immutable originals before execution.",
            "Run C1–C9 once each in order through the source API with the exact original/prepared options. The authorized author run totals nine API evaluations; human execution is recorded separately.",
            "Compare each complete report to its independently frozen expectation; inspect deterministic exact child QA, strict current parent and exact cutoff, original requests/roots, publication status, conflict controls and zero authority.",
            "Retain full results, exits and immutable before/after input evidence; stop on a failure without retries."
          ],
          "expected": [
            "C1 is the complete published H02-07 control. C2/C3 equal its entire report except their input-derived digest: child81008, select1001, no publication payload/warning, exact original requests/roots/current parent and selection/eligibility.",
            "C4 is the complete missing-U2 H02-06 control. C5/C6 equal its entire report except their input-derived digest, retaining required publication and exact deterministic81008 payload; no missing request is waived.",
            "C7 equals complete C1 except its digest and authenticated required_parent.completion.comment_id99023. Strict current parent QA remains valid, exact incorporated cutoff/old references stay intact, and no new payload or hold appears.",
            "C8/C9 retain their complete conflicting-QA control reports, including wait/null proposal, REPAIR_PROOF_INVALID /issues/2 and1001 human_hold; distinct logical QA is not coalesced.",
            "Every case preserves original assignments/requests/roots and151 PR safeguards, writes0 and execution_authorized:false; no human case becomes PASS from developer execution."
          ],
          "evidence": [
            "Retain tested revision, exact commands/options, all nine full outputs/exits, fixed input/expectation hashes, runtime/Node/dependency manifests and before/after immutable inventories.",
            "Retain original failures and all independent expectation/construction provenance; never use output as an oracle."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "After evidence capture remove only worker-owned disposable exports/copies; preserve frozen source, historical failures and original fixtures."
            ]
          }
        },
        {
          "id": "R1-39-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Complete PREP-01/DATA-01 with the same already-frozen C2/C7 inputs/options/full expectations and prepared copied runtime; use the unrelated cwd.",
            "Use prepared dependencies only; no account, credentials, UI, HTTP/Postman or live target. Human status remains NOT_RUN until a human performs this route."
          ],
          "steps": [
            "From the unrelated cwd run only C2 and C7 once each through copied-runtime JSON with PREP-01 exact config/input paths and existing option-to-flag mapping; no new derivation or scenario.",
            "Compare each complete JSON value to its already-fixed source expectation; require exit0 and retain stdout/stderr/exits.",
            "Inspect complete runtime/Node/dependency/package-lock closure and input inventories before/after, plus source/native/plan/dependency and historical/current publication-guard bindings."
          ],
          "expected": [
            "C2 copied JSON equals the complete fixed published-request variant: deterministic child81008, select1001 and no new payload/publication warning.",
            "C7 copied JSON equals its complete fixed strict-current parent-alias report: authenticated parent99023, original cutoff/requests/roots, select1001 and no new payload or hold.",
            "Exactly two copied evaluations complete the eleven-product-call author budget; prepared dependency bytes and inputs remain unchanged, only policy differs from9305 runtime, all prior captures/maps remain history, and writes0/false authority remain.",
            "New native amendment preserves149 original five+151 prerequisites and links plus its single repair blocker, with no reverse dependency or premature Done; source inventory and full81/State ownership remain distinct."
          ],
          "evidence": [
            "Retain tested source/runtime revision, exact commands/options, complete JSON stdout/stderr/exits, fixed input/expected hashes and full runtime/Node/dependency/package-lock manifests.",
            "Retain before/after input/runtime inventories and native/readback/link/plan/current-versus-historical binding evidence; human execution remains separately attributed."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "After evidence capture remove only worker-owned exports and runtime copies; retain original prepared runtime, historical evidence and frozen source."
            ]
          }
        }
      ]
    },
    "automated_regression": "Add the bounded published/missing-publication QA-copy permutations, strict-current parent alias and existing conflicting-completion controls; preserve full historical/current receipt guards and151 tests."
  },
  "open_questions": []
}
```

## R1-35: Preview complete repairs as structured data

[PGB-149](https://scubapig.atlassian.net/browse/PGB-149)

### Problem to solve

Agents and tools need the full repair decision before any live action. They must see the actual parent, every unresolved cause and any required publication without inferring authority from readable summaries.

### Acceptance Criteria

- **AC1.** The source API and JSON CLI return the complete approved reports for the existing repair fixtures, including actual dependency order, capacity, pause and current-parent requirements.
- **AC2.** Structured proposals identify target, exact canonical causes, parent revision and required publication, with false execution authority and zero writes.
- **AC3.** The guide makes source API/JSON use and recovery usable; existing copied-runtime compatibility is retained and readable cause parity is explicitly assigned to PGB-146.

### Technical Acceptance Criteria

- **TAC1.** Repository: danielchappell/Pigboard, main; own the listed20-path cloud-neutral source/JSON outcome and its required compatibility, docs and partial receipt.
- **TAC2.** Preserve all existing raw inputs/independent full expectations, the three typed edges and strict current/history boundaries; add no provider operation, worker monitoring, cancellation or activation.
- **TAC3.** Compose verified merged145 without changing its contracts; preserve all original146 and81 criteria/human objects and name PGB-81 as full publication/installed-kit owner. Preserve native prerequisites PGB-80, PGB-113, PGB-129, PGB-136 and PGB-145, each requiring ai_qa_complete; additionally require PGB-151 ai_qa_complete for the current-PR repair. Publish/read back the original five incoming Blocks links, the repair→PGB-149 Blocks link and R1-35→146 as specified in the delivery plan. Additionally require PGB-153 ai_qa_complete for the identical-QA publication repair; publish/read back its repair→PGB-149 Blocks link while preserving all existing dependencies.

### Testing Strategy

Human acceptance remains NOT_RUN. AI cases: zero.

#### R1-35-H01

- R1-35-H01
- human
- developer and human QA reviewer
- AC1
- AC2
- TAC1
- TAC2
- Exact approved source revision, PREP-01/DATA-01, prepared Node dependencies and unchanged exported fixtures are available. No account, credentials, UI, HTTP/Postman or live target is required.
- Export the fixed H02-06-a3-full-qa-u2-unpublished, OC01-selection and S06-second-configured-accepted-stage inputs and options using the source guide.
- Run the existing source API full comparison for H02-06 and the source JSON CLI full comparisons for H02-06, OC01 and S06.
- Complete reports match their independent fixed expectations, including correct targets, exact canonical causes, actual dependency order, current parent revision and required publication.
- Every result retains false execution authority and zero product writes.
- Retain exact commands/options, complete reports, tested revision, input/runtime hashes and before/after input inventories.
- prescribed
- human QA reviewer
- Retain evidence, then remove only the worker-owned disposable exports and runtime copy.

#### R1-35-H02

- R1-35-H02
- human
- developer and human QA reviewer
- AC3
- TAC1
- TAC2
- TAC3
- Use the same exact approved revision and PREP-01/DATA-01 with a complete worker-owned copied runtime, prepared dependency bytes and unrelated cwd; retain existing seven-smoke evidence with its original revision attribution. No credentials or live target are required.
- Run the existing copied-runtime JSON CLI full comparisons for H02-06-a3-full-qa-u2-unpublished and OC01-selection from the unrelated cwd.
- Inspect the complete closure manifests, attributable existing seven-smoke evidence, source guide and dated/current receipt guard outputs.
- Complete copied-runtime reports match the independent fixed expectations with zero effects.
- Current source30 Stories/132 cases is preserved; the earlier native32/136 snapshot and the five differences against the hash-bound recorded comparison set remain explicitly dated, not an exhaustive current native inventory.
- The guide and partial receipt keep readable cause parity pending PGB-146 and name PGB-81 as the full publication/installed-kit owner.
- Later PGB-82→PGB-148 and native PGB-147/PGB-148 source omissions remain deferred to PGB-81 full reconciliation.
- Retain complete manifests, commands/options, reports, source/runtime/input hashes, before/after inventories, guard output and original attribution for reused smoke evidence.
- prescribed
- human QA reviewer
- Retain evidence, then remove only the worker-owned disposable exports and runtime copy.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Agents and tools need the full repair decision before any live action. They must see the actual parent, every unresolved cause and any required publication without inferring authority from readable summaries.",
  "prerequisites": [
    {
      "ticket": "R1-10",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-25",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-26",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-28",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-31",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-37",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-39",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The source API and JSON CLI return the complete approved reports for the existing repair fixtures, including actual dependency order, capacity, pause and current-parent requirements."
    },
    {
      "id": "AC2",
      "requirement": "Structured proposals identify target, exact canonical causes, parent revision and required publication, with false execution authority and zero writes."
    },
    {
      "id": "AC3",
      "requirement": "The guide makes source API/JSON use and recovery usable; existing copied-runtime compatibility is retained and readable cause parity is explicitly assigned to PGB-146."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own the complete cloud-neutral source API/JSON repair preview, required copied-runtime compatibility, guides and dated partial publication receipt within the20 reviewed R1-35 paths.",
      "out_of_scope": [
        "Customer repository changes, provider operations, worker monitoring, run cancellation, deployment or activation.",
        "Readable cause parity remains PGB-146; the full installed repair fixture kit, eighth semantic smoke and complete source/native publication reconciliation remain PGB-81.",
        "Changes outside the20 reviewed R1-35 paths or to unrelated configuration/source/native contracts."
      ],
      "related_repositories": []
    },
    "accepted_decisions": [],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Repository: danielchappell/Pigboard, main; own the listed20-path cloud-neutral source/JSON outcome and its required compatibility, docs and partial receipt."
      },
      {
        "id": "TAC2",
        "requirement": "Preserve all existing raw inputs/independent full expectations, the three typed edges and strict current/history boundaries; add no provider operation, worker monitoring, cancellation or activation."
      },
      {
        "id": "TAC3",
        "requirement": "Compose verified merged145 without changing its contracts; preserve all original146 and81 criteria/human objects and name PGB-81 as full publication/installed-kit owner. Preserve native prerequisites PGB-80, PGB-113, PGB-129, PGB-136 and PGB-145, each requiring ai_qa_complete; additionally require PGB-151 ai_qa_complete for the current-PR repair. Publish/read back the original five incoming Blocks links, the repair→PGB-149 Blocks link and R1-35→146 as specified in the delivery plan. Additionally require PGB-153 ai_qa_complete for the identical-QA publication repair; publish/read back its repair→PGB-149 Blocks link while preserving all existing dependencies."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Exact approved Pigboard PR source revision composed with verified merged PGB-145, already prepared Node dependencies and unchanged complete local fixtures; copied-runtime checks use one complete prepared closure from an unrelated cwd. No deployed target or live account.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "Existing H02-06-a3-full-qa-u2-unpublished, OC01-selection and S06-second-configured-accepted-stage inputs/options and independent full expected reports; complete copied-runtime closure and retained seven-smoke evidence.",
        "initial_state": "Fresh read-only exported inputs per case and a worker-owned allowlisted runtime copy with prepared dependency bytes; preserve frozen expectations and historical evidence.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "At the exact PR revision, prepare source-guide exports for DATA-01, independent complete expected reports, exact API/JSON/copied-runtime commands and options, Node/dependency hashes, before/after manifests and zero-effects evidence; supply dated/current receipt guard commands and attributable existing seven-smoke evidence.",
        "used_by": [
          "DATA-01",
          "R1-35-H01",
          "R1-35-H02"
        ],
        "preserves": [
          "All existing raw inputs, full expected outcomes and required compatibility coverage; no new scenario or dependency installation.",
          "All original PGB-146 criteria, testing strategy and two human routes and all original PGB-81 criteria and42 human cases remain unchanged.",
          "Readable cause parity remains pending PGB-146; the full installed kit and final publication reconciliation remain PGB-81.",
          "Human routes remain NOT_RUN until a human performs them; developer checks, independent review and CI are separate."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "QA skills: []. Approved QA skills do not execute this CLI/internal API contract; use authorized requirement-based direct developer checks and retain designated human review separately.",
      "cases": [
        {
          "id": "R1-35-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Exact approved source revision, PREP-01/DATA-01, prepared Node dependencies and unchanged exported fixtures are available. No account, credentials, UI, HTTP/Postman or live target is required."
          ],
          "steps": [
            "Export the fixed H02-06-a3-full-qa-u2-unpublished, OC01-selection and S06-second-configured-accepted-stage inputs and options using the source guide.",
            "Run the existing source API full comparison for H02-06 and the source JSON CLI full comparisons for H02-06, OC01 and S06."
          ],
          "expected": [
            "Complete reports match their independent fixed expectations, including correct targets, exact canonical causes, actual dependency order, current parent revision and required publication.",
            "Every result retains false execution authority and zero product writes."
          ],
          "evidence": [
            "Retain exact commands/options, complete reports, tested revision, input/runtime hashes and before/after input inventories."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence, then remove only the worker-owned disposable exports and runtime copy."
            ]
          }
        },
        {
          "id": "R1-35-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Use the same exact approved revision and PREP-01/DATA-01 with a complete worker-owned copied runtime, prepared dependency bytes and unrelated cwd; retain existing seven-smoke evidence with its original revision attribution. No credentials or live target are required."
          ],
          "steps": [
            "Run the existing copied-runtime JSON CLI full comparisons for H02-06-a3-full-qa-u2-unpublished and OC01-selection from the unrelated cwd.",
            "Inspect the complete closure manifests, attributable existing seven-smoke evidence, source guide and dated/current receipt guard outputs."
          ],
          "expected": [
            "Complete copied-runtime reports match the independent fixed expectations with zero effects.",
            "Current source30 Stories/132 cases is preserved; the earlier native32/136 snapshot and the five differences against the hash-bound recorded comparison set remain explicitly dated, not an exhaustive current native inventory.",
            "The guide and partial receipt keep readable cause parity pending PGB-146 and name PGB-81 as the full publication/installed-kit owner.",
            "Later PGB-82→PGB-148 and native PGB-147/PGB-148 source omissions remain deferred to PGB-81 full reconciliation."
          ],
          "evidence": [
            "Retain complete manifests, commands/options, reports, source/runtime/input hashes, before/after inventories, guard output and original attribution for reused smoke evidence."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence, then remove only the worker-owned disposable exports and runtime copy."
            ]
          }
        }
      ]
    },
    "automated_regression": "Retain existing complete policy/API/JSON, strict-history/current, no-effects, fixture-preservation and installed-compatibility coverage; add only actual integration/publication binding guards."
  },
  "open_questions": []
}
```

## R1-32: Preview repairs from a source checkout

[PGB-146](https://scubapig.atlassian.net/browse/PGB-146)

### Problem to solve

Operators and agents need to inspect the complete repair decision before any live action. The source preview must explain actual parent dependencies, preserve every unresolved cause and distinguish queueing from admission.

### Acceptance Criteria

- **AC1.** The source API and CLI return the approved complete repair decisions for the existing PGB-81 fixtures, including priority, capacity, pause and current-parent requirements.
- **AC2.** Structured and readable results name the same target, actual dependency order, parent revision, causes and required publication, with no execution authority or writes.
- **AC3.** The source guide is sufficient to prepare inputs, run the preview and resolve common waits; existing installed behavior retains a working closure and regression coverage.

### Technical Acceptance Criteria

- **TAC1.** Repository: danielchappell/Pigboard, default main; change only cloud-neutral source preview, its required compatibility, tests and listed documentation/publication receipt.
- **TAC2.** Keep the three existing typed proposal edges and strict current-versus-history authority; add no provider calls, worker monitoring, cancellation, publication or activation.
- **TAC3.** Preserve all original PGB-81 human cases; the dated partial publication receipt names PGB-81 as the full reconciliation owner.

### Testing Strategy

Human acceptance remains NOT_RUN. AI cases: zero.

#### R1-32-H01

- R1-32-H01
- human
- developer and human QA reviewer
- AC1
- AC2
- AC3
- TAC1
- TAC2
- Approved source revision, PREP-01/DATA-01, prepared Node dependencies and existing complete fixtures are available. No credentials, live account, UI or Postman are required.
- Export the fixed inputs using the source guide.
- Run the existing source/API/CLI matrix tests and inspect JSON/readable outputs for the seven corrected cases plus the unchanged H02-06-a3-full-qa-u2-unpublished contrast.
- Full reports match their independent fixed expectations, including S06 selecting1100, A/B/C dependency order, the retained queue-capacity explanation and active/Blocked suppression.
- Structured and readable results retain the same targets, parent revisions, causes and required publication, with zero writes and false execution authority.
- Retain exact commands, complete outputs, input/runtime hashes and the tested source revision.
- prescribed
- human QA reviewer
- Retain evidence, then remove only the worker-owned disposable export directory.

#### R1-32-H02

- R1-32-H02
- human
- developer and human QA reviewer
- AC2
- AC3
- TAC1
- TAC2
- TAC3
- Use the same approved revision and prepared fixtures as R1-32-H01, including the complete runtime closure for existing installed compatibility tests. No provider credentials or live target are required.
- Run the existing source no-effects/history/current-boundary tests and complete npm test, including existing installed regressions with the complete runtime closure.
- Check that the dated partial publication receipt names PGB-81 as the full reconciliation owner and preserves its original42 human objects.
- No product writes or provider calls occur, and historical evidence never grants strict current-proof authority.
- Prior installation behavior remains compatible and reports its existing seven smokechecks honestly.
- The dated partial receipt assigns full publication reconciliation to PGB-81 while preserving all original42 PGB-81 human cases.
- Retain complete test output, exact revision, input/runtime hashes and temporary-directory inventories.
- prescribed
- human QA reviewer
- Remove only the worker-owned disposable fixtures after evidence capture.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Operators and agents need to inspect the complete repair decision before any live action. The source preview must explain actual parent dependencies, preserve every unresolved cause and distinguish queueing from admission.",
  "prerequisites": [
    {
      "ticket": "R1-10",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-25",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-26",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-28",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-35",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The source API and CLI return the approved complete repair decisions for the existing PGB-81 fixtures, including priority, capacity, pause and current-parent requirements."
    },
    {
      "id": "AC2",
      "requirement": "Structured and readable results name the same target, actual dependency order, parent revision, causes and required publication, with no execution authority or writes."
    },
    {
      "id": "AC3",
      "requirement": "The source guide is sufficient to prepare inputs, run the preview and resolve common waits; existing installed behavior retains a working closure and regression coverage."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own the complete cloud-neutral source repair preview, its required installed compatibility, source tests, guides and explicitly dated partial delivery-publication receipt.",
      "out_of_scope": [
        "Customer repository changes, provider writes, worker monitoring, run cancellation, deployment or activation.",
        "The full installed repair fixture kit, eighth semantic smoke and complete source/native publication reconciliation remain PGB-81 outcomes.",
        "Changes outside the20 reviewed R1-32 paths or to unrelated State A/source/native contracts."
      ],
      "related_repositories": []
    },
    "accepted_decisions": [],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Repository: danielchappell/Pigboard, default main; change only cloud-neutral source preview, its required compatibility, tests and listed documentation/publication receipt."
      },
      {
        "id": "TAC2",
        "requirement": "Keep the three existing typed proposal edges and strict current-versus-history authority; add no provider calls, worker monitoring, cancellation, publication or activation."
      },
      {
        "id": "TAC3",
        "requirement": "Preserve all original PGB-81 human cases; the dated partial publication receipt names PGB-81 as the full reconciliation owner."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Exact approved Pigboard PR source revision with already prepared Node dependencies and existing complete local fixtures; existing installed compatibility tests use the complete copied runtime from an unrelated cwd. No deployed customer target or live account.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "The existing PGB-81 source fixture matrix, seven corrected cases, unchanged H02-06 contrast and required installed compatibility fixtures; no new product scenario.",
        "initial_state": "Fresh read-only local files per case; frozen snapshots retain their existing independent facts and expected reports.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "At the exact PR revision, prepare the source-guide exports, existing complete fixtures, independent full expected reports, exact source/API/CLI and compatibility commands, prepared dependency/runtime hashes and zero-effects/input-inventory evidence.",
        "used_by": [
          "DATA-01",
          "R1-32-H01",
          "R1-32-H02"
        ],
        "preserves": [
          "All existing fixture inputs, expected outcomes and required source/installed compatibility coverage; no new scenario.",
          "All original PGB-81 AC1–AC4, TAC1–TAC2 and42 human cases remain unchanged.",
          "Human routes remain NOT_RUN until a human performs them; developer regression, independent review and CI are separate."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "QA skills: []. Approved QA skills do not execute this CLI/internal API contract; use the authorized requirement-based direct checks and retain designated human review separately.",
      "cases": [
        {
          "id": "R1-32-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Approved source revision, PREP-01/DATA-01, prepared Node dependencies and existing complete fixtures are available. No credentials, live account, UI or Postman are required."
          ],
          "steps": [
            "Export the fixed inputs using the source guide.",
            "Run the existing source/API/CLI matrix tests and inspect JSON/readable outputs for the seven corrected cases plus the unchanged H02-06-a3-full-qa-u2-unpublished contrast."
          ],
          "expected": [
            "Full reports match their independent fixed expectations, including S06 selecting1100, A/B/C dependency order, the retained queue-capacity explanation and active/Blocked suppression.",
            "Structured and readable results retain the same targets, parent revisions, causes and required publication, with zero writes and false execution authority."
          ],
          "evidence": [
            "Retain exact commands, complete outputs, input/runtime hashes and the tested source revision."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence, then remove only the worker-owned disposable export directory."
            ]
          }
        },
        {
          "id": "R1-32-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Use the same approved revision and prepared fixtures as R1-32-H01, including the complete runtime closure for existing installed compatibility tests. No provider credentials or live target are required."
          ],
          "steps": [
            "Run the existing source no-effects/history/current-boundary tests and complete npm test, including existing installed regressions with the complete runtime closure.",
            "Check that the dated partial publication receipt names PGB-81 as the full reconciliation owner and preserves its original42 human objects."
          ],
          "expected": [
            "No product writes or provider calls occur, and historical evidence never grants strict current-proof authority.",
            "Prior installation behavior remains compatible and reports its existing seven smokechecks honestly.",
            "The dated partial receipt assigns full publication reconciliation to PGB-81 while preserving all original42 PGB-81 human cases."
          ],
          "evidence": [
            "Retain complete test output, exact revision, input/runtime hashes and temporary-directory inventories."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Remove only the worker-owned disposable fixtures after evidence capture."
            ]
          }
        }
      ]
    },
    "automated_regression": "Update the existing complete source/API/CLI matrices, exact fixture-preservation assertions, current/history authority checks and required installed compatibility tests; run the prescribed complete repository checks."
  },
  "open_questions": []
}
```

## R1-11: Preview the complete repair order

[PGB-81](https://scubapig.atlassian.net/browse/PGB-81)

### Problem to solve

The manager must finish active work and repair actual dependencies oldest first. Operators need to see the exact queue/admission decision before any live mutation.

### Acceptance Criteria

- **AC1.** Preview covers all 41 approved scenarios, selecting repair prerequisites, queued repairs, Bugs then Stories with correct capacity.
- **AC2.** It proposes queueing B only from actual stale parent lineage after A’s full repaired completion; active or Blocked B is left alone.
- **AC3.** It preserves old/new unresolved repair roots, recognizes consumed roots and never infers a cascade from order, merge or retargeting.
- **AC4.** Paused Epics suppress queue-only and admission decisions; missing lineage or unresolved repair inputs hold instead of admitting unrelated work.

### Technical Acceptance Criteria

- **TAC1.** Own cloud-neutral repair selection only; no PR polling, run cancellation or provider writes.
- **TAC2.** Return typed decisions for only Ready to Work→In Progress, Rework Queued→In Progress and Human Review→Rework Queued.

### Testing Strategy

Human acceptance remains NOT_RUN. AI cases: zero.

#### R1-11-S01

- R1-11-S01
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Opted-in Epic is In Progress; A is Ready to Work; stream empty; zero Human Review
- Preview DATA-01 S01; check decision, reason and zero writes.
- Select A for new admission
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S02

- R1-11-S02
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Epic has no configured opt-in label, or is not In Progress
- Preview DATA-01 S02; check decision, reason and zero writes.
- No admission; active workers may finish their own permitted cycle. Without opt-in, no manager authority. For an opted-in paused Epic, suppress all manager transitions, including queue-only mutations (owner confirmed 14 November 2026)
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S03

- R1-11-S03
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Earlier A is in refinement; later independent B is Ready to Work
- Preview DATA-01 S03; check decision, reason and zero writes.
- Ignore A as candidate; select B
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S04

- R1-11-S04
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- A is Ready to Work but has a required null; independent B is an otherwise eligible Ready to Work Story/Bug with a complete contract
- Preview DATA-01 S04; check decision, reason and zero writes.
- Report A's field error; B can be selected; no agent launched to finish A's specification
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S05

- R1-11-S05
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- B requires A's AI-QA completion; A is unready, unfinished or lacks coherent current evidence
- Preview DATA-01 S05; check decision, reason and zero writes.
- B is ineligible; do not invent completion or a different prerequisite condition
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S06

- R1-11-S06
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Complete prerequisite A is Human Review, Product Acceptance or Done, with matching completion evidence and no unresolved repair affecting B
- Preview DATA-01 S06; check decision, reason and zero writes.
- A's prerequisite is satisfied; human merge/testing is not an extra implicit admission gate
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S07

- R1-11-S07
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Ready Bug B and independent ready Story A are both eligible
- Preview DATA-01 S07; check decision, reason and zero writes.
- Select B; Epic order breaks ties between eligible Bugs
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S08

- R1-11-S08
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Bug B is unready; Story A is eligible and independent
- Preview DATA-01 S08; check decision, reason and zero writes.
- Ignore B as candidate; select A
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S09

- R1-11-S09
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Understood repair A is queued; new Bug B is ready
- Preview DATA-01 S09; check decision, reason and zero writes.
- Repair A precedes B; a missing repair input holds the repair chain rather than opening a bypass
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S10

- R1-11-S10
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Ready prerequisite P is needed to execute the queued repair; it is otherwise eligible
- Preview DATA-01 S10; check decision, reason and zero writes.
- P precedes the repair; unrelated new work does not replace it
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S11

- R1-11-S11
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- A occupies In Progress, In Review or QA
- Preview DATA-01 S11; check decision, reason and zero writes.
- No second admission in that stream; changing worker type does not free it
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S12

- R1-11-S12
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- One stream has four Human Review tickets, no active cycle and an eligible candidate
- Preview DATA-01 S12; check decision, reason and zero writes.
- One candidate can start; its return would make five
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S13

- R1-11-S13
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- One stream has five Human Review tickets and an eligible Story or Bug
- Preview DATA-01 S13; check decision, reason and zero writes.
- No admission; Bugs obey the same cap
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S14

- R1-11-S14
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Rework A is queued and four other tickets are in Human Review
- Preview DATA-01 S14; check decision, reason and zero writes.
- A can start if other gates pass; reserve its return as the fifth ticket
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S15

- R1-11-S15
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Rework A is queued and five other tickets are in Human Review
- Preview DATA-01 S15; check decision, reason and zero writes.
- A waits for human work to free capacity; no repair exception to the cap
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S16

- R1-11-S16
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- A leaves Human Review for a configured later accepted stage
- Preview DATA-01 S16; check decision, reason and zero writes.
- It no longer occupies the five-ticket Human Review count; retain facts needed for dependencies and lineage
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S17

- R1-11-S17
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- A is genuinely Blocked, or the stream has an unresolved manager intent
- Preview DATA-01 S17; check decision, reason and zero writes.
- Hold the stream; no autonomous unblock, expiry or replay
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S18

- R1-11-S18
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- AI-Daniel-1 is occupied; AI-Daniel-2 has an eligible ticket and no shared uncertainty
- Preview DATA-01 S18; check decision, reason and zero writes.
- Daniel-2 can proceed independently; full labels identify streams
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S19

- R1-11-S19
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- A is in Human Review and needs confirmed repair while B is already active
- Preview DATA-01 S19; check decision, reason and zero writes.
- The authorized human-request automation records A in Rework Queued; B's existing cycle continues; no concurrent A implementer. B's workers have no authority to transition A
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S20

- R1-11-S20
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- B can finish its assigned cases without depending on the unresolved A repair
- Preview DATA-01 S20; check decision, reason and zero writes.
- B can reach Human Review; then A repair is considered before new C
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S21

- R1-11-S21
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- A's known defect makes B's required checks impossible
- Preview DATA-01 S21; check decision, reason and zero writes.
- Responsible B worker records dependency wait and unfinished checks, moves B to Rework Queued; manager does not repair it or start A concurrently
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S22

- R1-11-S22
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- A's repair is implemented but review/AI QA is incomplete
- Preview DATA-01 S22; check decision, reason and zero writes.
- Do not queue completed B on implementation evidence alone
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S23

- R1-11-S23
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- A completes its repaired revision; B's recorded actual parent is A at an older affected revision; B is in Human Review
- Preview DATA-01 S23; check decision, reason and zero writes.
- Manager queues B with the repair roots and required parent completion; preserve B's old assignment pointer until admission
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S24

- R1-11-S24
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Same evidence as S23, but B is active
- Preview DATA-01 S24; check decision, reason and zero writes.
- Do not interrupt or move active B; later re-evaluate its published result and current stage
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S25

- R1-11-S25
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- B has already consumed the applicable repair roots at the required parent completion
- Preview DATA-01 S25; check decision, reason and zero writes.
- Do not queue B again
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S26

- R1-11-S26
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- B is next in Epic order but does not record a code dependency on A
- Preview DATA-01 S26; check decision, reason and zero writes.
- No stack update merely from order or a shared stream
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S27

- R1-11-S27
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- A is normally merged/retargeted without a recorded repair
- Preview DATA-01 S27; check decision, reason and zero writes.
- No stack update merely from the merge/retarget; humans own PR maintenance
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S28

- R1-11-S28
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- B must update its stack, but its PR is already merged, lineage is absent, or the fix needs more scope
- Preview DATA-01 S28; check decision, reason and zero writes.
- Human handling; no replacement/multi-PR job inferred. Implementer PR preflight owns the actual open-PR check
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S29

- R1-11-S29
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- A second parent repair arrives before B starts
- Preview DATA-01 S29; check decision, reason and zero writes.
- B waits until the newer parent repair also completes implementation, review and AI QA; consume the latest verified parent revision covering every applicable repair request, preserve all causes and do not drop older findings
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S30

- R1-11-S30
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- One full label appears in two active opted-in Epics
- Preview DATA-01 S30; check decision, reason and zero writes.
- Hold that stream and show both Epics; do not choose one by timestamp/order
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S31

- R1-11-S31
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- A known live/queued/blocked/Human Review ticket loses its label, changes parent or disappears from the Epic list
- Preview DATA-01 S31; check decision, reason and zero writes.
- Continue reading its retained stable ID; hold its previous stream until a human reconciles the mismatch; do not free capacity from a filtered search
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S32

- R1-11-S32
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- The same known ticket is relabelled into another configured stream
- Preview DATA-01 S32; check decision, reason and zero writes.
- Include both old and proposed scopes in the mismatch diagnostic; do not admit it under the new label while its previous ownership is unresolved
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S33

- R1-11-S33
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- An unstarted independent preparation/Ready ticket is removed from the Epic plan
- Preview DATA-01 S33; check decision, reason and zero writes.
- It is no longer a candidate; removal is allowed only when no required dependency refers to it
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S34

- R1-11-S34
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- A prerequisite is removed or cancelled
- Preview DATA-01 S34; check decision, reason and zero writes.
- This does not satisfy its required outcome; dependent work stays ineligible pending revised human requirements
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S35

- R1-11-S35
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- A ticket enters an unmapped or ambiguous native status
- Preview DATA-01 S35; check decision, reason and zero writes.
- Hold the affected scope; Jira's broad To Do/In Progress/Done category cannot determine product meaning
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S36

- R1-11-S36
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- A required known ID is inaccessible/deleted, a page is missing, or a search is incomplete
- Preview DATA-01 S36; check decision, reason and zero writes.
- Hold affected scope; shared discovery uncertainty holds the scan; never count missing as finished
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S37

- R1-11-S37
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Human reorders eligible independent tickets before admission
- Preview DATA-01 S37; check decision, reason and zero writes.
- New Epic order controls future ties; do not rewrite an existing assignment or actual parent lineage
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S38

- R1-11-S38
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Requirements, relevant Epic membership or completion revision changes before durable intent
- Preview DATA-01 S38; check decision, reason and zero writes.
- Return changed-input/no-write; use a later fresh evaluation rather than continuing an old selection
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S39

- R1-11-S39
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Two tickets are already active in one stream
- Preview DATA-01 S39; check decision, reason and zero writes.
- Report inconsistent occupancy and hold new manager mutations; do not stop either Cursor run automatically
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S40

- R1-11-S40
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Epic is paused after one worker cycle started
- Preview DATA-01 S40; check decision, reason and zero writes.
- No new admission; that cycle may reach Human Review if it needs no correction. Also suppress manager queue-only operations (owner confirmed 14 November 2026)
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-S41

- R1-11-S41
- human
- human QA reviewer
- AC1
- TAC1
- TAC2
- Relevant inputs change after durable intent or comment/pointer publication but before transition
- Preview DATA-01 S41; check decision, reason and zero writes.
- Send no transition; preserve the intent and already-published evidence as a human hold. A fresh scan cannot clear it or replay publication
- Preview output, zero-write audit and tested PR revision.
- none
- Read-only local snapshot; retain output.

#### R1-11-H02

- R1-11-H02
- human
- developer and human QA reviewer
- AC2
- AC3
- AC4
- A a1→a2 repair, B old completion, C actual child; second A root arrives while B queued; independent D.
- Preview before A completes.
- Preview after first and second repaired completions.
- Supply B completion consuming all causes and preview again.
- No early queue, pointer mutation or duplicated cause; latest coherent parent/all roots required; consumed update not requeued; only actual descendants qualify.
- command/output transcript and fixture before/after diff; tested PR revision and exact command.
- prescribed
- human QA reviewer
- Retain evidence then remove disposable local fixtures/build output; do not change live records/resources.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The manager must finish active work and repair actual dependencies oldest first. Operators need to see the exact queue/admission decision before any live mutation.",
  "prerequisites": [
    {
      "ticket": "R1-10",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-25",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-26",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-28",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-32",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "Preview covers all 41 approved scenarios, selecting repair prerequisites, queued repairs, Bugs then Stories with correct capacity."
    },
    {
      "id": "AC2",
      "requirement": "It proposes queueing B only from actual stale parent lineage after A’s full repaired completion; active or Blocked B is left alone."
    },
    {
      "id": "AC3",
      "requirement": "It preserves old/new unresolved repair roots, recognizes consumed roots and never infers a cascade from order, merge or retargeting."
    },
    {
      "id": "AC4",
      "requirement": "Paused Epics suppress queue-only and admission decisions; missing lineage or unresolved repair inputs hold instead of admitting unrelated work."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own cloud-neutral repair selection only; no PR polling, run cancellation or provider writes.",
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
        "requirement": "Own cloud-neutral repair selection only; no PR polling, run cancellation or provider writes."
      },
      {
        "id": "TAC2",
        "requirement": "Return typed decisions for only Ready to Work→In Progress, Rework Queued→In Progress and Human Review→Rework Queued."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-11-S01",
          "R1-11-S02",
          "R1-11-S03",
          "R1-11-S04",
          "R1-11-S05",
          "R1-11-S06",
          "R1-11-S07",
          "R1-11-S08",
          "R1-11-S09",
          "R1-11-S10",
          "R1-11-S11",
          "R1-11-S12",
          "R1-11-S13",
          "R1-11-S14",
          "R1-11-S15",
          "R1-11-S16",
          "R1-11-S17",
          "R1-11-S18",
          "R1-11-S19",
          "R1-11-S20",
          "R1-11-S21",
          "R1-11-S22",
          "R1-11-S23",
          "R1-11-S24",
          "R1-11-S25",
          "R1-11-S26",
          "R1-11-S27",
          "R1-11-S28",
          "R1-11-S29",
          "R1-11-S30",
          "R1-11-S31",
          "R1-11-S32",
          "R1-11-S33",
          "R1-11-S34",
          "R1-11-S35",
          "R1-11-S36",
          "R1-11-S37",
          "R1-11-S38",
          "R1-11-S39",
          "R1-11-S40",
          "R1-11-S41",
          "R1-11-H02"
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
          "id": "R1-11-S01",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Opted-in Epic is In Progress; A is Ready to Work; stream empty; zero Human Review"
          ],
          "steps": [
            "Preview DATA-01 S01; check decision, reason and zero writes."
          ],
          "expected": [
            "Select A for new admission"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S02",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Epic has no configured opt-in label, or is not In Progress"
          ],
          "steps": [
            "Preview DATA-01 S02; check decision, reason and zero writes."
          ],
          "expected": [
            "No admission; active workers may finish their own permitted cycle. Without opt-in, no manager authority. For an opted-in paused Epic, suppress all manager transitions, including queue-only mutations (owner confirmed 14 November 2026)"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S03",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Earlier A is in refinement; later independent B is Ready to Work"
          ],
          "steps": [
            "Preview DATA-01 S03; check decision, reason and zero writes."
          ],
          "expected": [
            "Ignore A as candidate; select B"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S04",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "A is Ready to Work but has a required null; independent B is an otherwise eligible Ready to Work Story/Bug with a complete contract"
          ],
          "steps": [
            "Preview DATA-01 S04; check decision, reason and zero writes."
          ],
          "expected": [
            "Report A's field error; B can be selected; no agent launched to finish A's specification"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S05",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "B requires A's AI-QA completion; A is unready, unfinished or lacks coherent current evidence"
          ],
          "steps": [
            "Preview DATA-01 S05; check decision, reason and zero writes."
          ],
          "expected": [
            "B is ineligible; do not invent completion or a different prerequisite condition"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S06",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Complete prerequisite A is Human Review, Product Acceptance or Done, with matching completion evidence and no unresolved repair affecting B"
          ],
          "steps": [
            "Preview DATA-01 S06; check decision, reason and zero writes."
          ],
          "expected": [
            "A's prerequisite is satisfied; human merge/testing is not an extra implicit admission gate"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S07",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Ready Bug B and independent ready Story A are both eligible"
          ],
          "steps": [
            "Preview DATA-01 S07; check decision, reason and zero writes."
          ],
          "expected": [
            "Select B; Epic order breaks ties between eligible Bugs"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S08",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Bug B is unready; Story A is eligible and independent"
          ],
          "steps": [
            "Preview DATA-01 S08; check decision, reason and zero writes."
          ],
          "expected": [
            "Ignore B as candidate; select A"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S09",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Understood repair A is queued; new Bug B is ready"
          ],
          "steps": [
            "Preview DATA-01 S09; check decision, reason and zero writes."
          ],
          "expected": [
            "Repair A precedes B; a missing repair input holds the repair chain rather than opening a bypass"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S10",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Ready prerequisite P is needed to execute the queued repair; it is otherwise eligible"
          ],
          "steps": [
            "Preview DATA-01 S10; check decision, reason and zero writes."
          ],
          "expected": [
            "P precedes the repair; unrelated new work does not replace it"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S11",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "A occupies In Progress, In Review or QA"
          ],
          "steps": [
            "Preview DATA-01 S11; check decision, reason and zero writes."
          ],
          "expected": [
            "No second admission in that stream; changing worker type does not free it"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S12",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "One stream has four Human Review tickets, no active cycle and an eligible candidate"
          ],
          "steps": [
            "Preview DATA-01 S12; check decision, reason and zero writes."
          ],
          "expected": [
            "One candidate can start; its return would make five"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S13",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "One stream has five Human Review tickets and an eligible Story or Bug"
          ],
          "steps": [
            "Preview DATA-01 S13; check decision, reason and zero writes."
          ],
          "expected": [
            "No admission; Bugs obey the same cap"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S14",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Rework A is queued and four other tickets are in Human Review"
          ],
          "steps": [
            "Preview DATA-01 S14; check decision, reason and zero writes."
          ],
          "expected": [
            "A can start if other gates pass; reserve its return as the fifth ticket"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S15",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Rework A is queued and five other tickets are in Human Review"
          ],
          "steps": [
            "Preview DATA-01 S15; check decision, reason and zero writes."
          ],
          "expected": [
            "A waits for human work to free capacity; no repair exception to the cap"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S16",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "A leaves Human Review for a configured later accepted stage"
          ],
          "steps": [
            "Preview DATA-01 S16; check decision, reason and zero writes."
          ],
          "expected": [
            "It no longer occupies the five-ticket Human Review count; retain facts needed for dependencies and lineage"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S17",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "A is genuinely Blocked, or the stream has an unresolved manager intent"
          ],
          "steps": [
            "Preview DATA-01 S17; check decision, reason and zero writes."
          ],
          "expected": [
            "Hold the stream; no autonomous unblock, expiry or replay"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S18",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "AI-Daniel-1 is occupied; AI-Daniel-2 has an eligible ticket and no shared uncertainty"
          ],
          "steps": [
            "Preview DATA-01 S18; check decision, reason and zero writes."
          ],
          "expected": [
            "Daniel-2 can proceed independently; full labels identify streams"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S19",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "A is in Human Review and needs confirmed repair while B is already active"
          ],
          "steps": [
            "Preview DATA-01 S19; check decision, reason and zero writes."
          ],
          "expected": [
            "The authorized human-request automation records A in Rework Queued; B's existing cycle continues; no concurrent A implementer. B's workers have no authority to transition A"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S20",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "B can finish its assigned cases without depending on the unresolved A repair"
          ],
          "steps": [
            "Preview DATA-01 S20; check decision, reason and zero writes."
          ],
          "expected": [
            "B can reach Human Review; then A repair is considered before new C"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S21",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "A's known defect makes B's required checks impossible"
          ],
          "steps": [
            "Preview DATA-01 S21; check decision, reason and zero writes."
          ],
          "expected": [
            "Responsible B worker records dependency wait and unfinished checks, moves B to Rework Queued; manager does not repair it or start A concurrently"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S22",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "A's repair is implemented but review/AI QA is incomplete"
          ],
          "steps": [
            "Preview DATA-01 S22; check decision, reason and zero writes."
          ],
          "expected": [
            "Do not queue completed B on implementation evidence alone"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S23",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "A completes its repaired revision; B's recorded actual parent is A at an older affected revision; B is in Human Review"
          ],
          "steps": [
            "Preview DATA-01 S23; check decision, reason and zero writes."
          ],
          "expected": [
            "Manager queues B with the repair roots and required parent completion; preserve B's old assignment pointer until admission"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S24",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Same evidence as S23, but B is active"
          ],
          "steps": [
            "Preview DATA-01 S24; check decision, reason and zero writes."
          ],
          "expected": [
            "Do not interrupt or move active B; later re-evaluate its published result and current stage"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S25",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "B has already consumed the applicable repair roots at the required parent completion"
          ],
          "steps": [
            "Preview DATA-01 S25; check decision, reason and zero writes."
          ],
          "expected": [
            "Do not queue B again"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S26",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "B is next in Epic order but does not record a code dependency on A"
          ],
          "steps": [
            "Preview DATA-01 S26; check decision, reason and zero writes."
          ],
          "expected": [
            "No stack update merely from order or a shared stream"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S27",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "A is normally merged/retargeted without a recorded repair"
          ],
          "steps": [
            "Preview DATA-01 S27; check decision, reason and zero writes."
          ],
          "expected": [
            "No stack update merely from the merge/retarget; humans own PR maintenance"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S28",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "B must update its stack, but its PR is already merged, lineage is absent, or the fix needs more scope"
          ],
          "steps": [
            "Preview DATA-01 S28; check decision, reason and zero writes."
          ],
          "expected": [
            "Human handling; no replacement/multi-PR job inferred. Implementer PR preflight owns the actual open-PR check"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S29",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "A second parent repair arrives before B starts"
          ],
          "steps": [
            "Preview DATA-01 S29; check decision, reason and zero writes."
          ],
          "expected": [
            "B waits until the newer parent repair also completes implementation, review and AI QA; consume the latest verified parent revision covering every applicable repair request, preserve all causes and do not drop older findings"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S30",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "One full label appears in two active opted-in Epics"
          ],
          "steps": [
            "Preview DATA-01 S30; check decision, reason and zero writes."
          ],
          "expected": [
            "Hold that stream and show both Epics; do not choose one by timestamp/order"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S31",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "A known live/queued/blocked/Human Review ticket loses its label, changes parent or disappears from the Epic list"
          ],
          "steps": [
            "Preview DATA-01 S31; check decision, reason and zero writes."
          ],
          "expected": [
            "Continue reading its retained stable ID; hold its previous stream until a human reconciles the mismatch; do not free capacity from a filtered search"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S32",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "The same known ticket is relabelled into another configured stream"
          ],
          "steps": [
            "Preview DATA-01 S32; check decision, reason and zero writes."
          ],
          "expected": [
            "Include both old and proposed scopes in the mismatch diagnostic; do not admit it under the new label while its previous ownership is unresolved"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S33",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "An unstarted independent preparation/Ready ticket is removed from the Epic plan"
          ],
          "steps": [
            "Preview DATA-01 S33; check decision, reason and zero writes."
          ],
          "expected": [
            "It is no longer a candidate; removal is allowed only when no required dependency refers to it"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S34",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "A prerequisite is removed or cancelled"
          ],
          "steps": [
            "Preview DATA-01 S34; check decision, reason and zero writes."
          ],
          "expected": [
            "This does not satisfy its required outcome; dependent work stays ineligible pending revised human requirements"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S35",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "A ticket enters an unmapped or ambiguous native status"
          ],
          "steps": [
            "Preview DATA-01 S35; check decision, reason and zero writes."
          ],
          "expected": [
            "Hold the affected scope; Jira's broad To Do/In Progress/Done category cannot determine product meaning"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S36",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "A required known ID is inaccessible/deleted, a page is missing, or a search is incomplete"
          ],
          "steps": [
            "Preview DATA-01 S36; check decision, reason and zero writes."
          ],
          "expected": [
            "Hold affected scope; shared discovery uncertainty holds the scan; never count missing as finished"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S37",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Human reorders eligible independent tickets before admission"
          ],
          "steps": [
            "Preview DATA-01 S37; check decision, reason and zero writes."
          ],
          "expected": [
            "New Epic order controls future ties; do not rewrite an existing assignment or actual parent lineage"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S38",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Requirements, relevant Epic membership or completion revision changes before durable intent"
          ],
          "steps": [
            "Preview DATA-01 S38; check decision, reason and zero writes."
          ],
          "expected": [
            "Return changed-input/no-write; use a later fresh evaluation rather than continuing an old selection"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S39",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Two tickets are already active in one stream"
          ],
          "steps": [
            "Preview DATA-01 S39; check decision, reason and zero writes."
          ],
          "expected": [
            "Report inconsistent occupancy and hold new manager mutations; do not stop either Cursor run automatically"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S40",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Epic is paused after one worker cycle started"
          ],
          "steps": [
            "Preview DATA-01 S40; check decision, reason and zero writes."
          ],
          "expected": [
            "No new admission; that cycle may reach Human Review if it needs no correction. Also suppress manager queue-only operations (owner confirmed 14 November 2026)"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-S41",
          "execution": "human",
          "owner_role": "human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Relevant inputs change after durable intent or comment/pointer publication but before transition"
          ],
          "steps": [
            "Preview DATA-01 S41; check decision, reason and zero writes."
          ],
          "expected": [
            "Send no transition; preserve the intent and already-published evidence as a human hold. A fresh scan cannot clear it or replay publication"
          ],
          "evidence": [
            "Preview output, zero-write audit and tested PR revision."
          ],
          "cleanup": {
            "mode": "none",
            "reason": "Read-only local snapshot; retain output.",
            "owner": null,
            "steps": null
          }
        },
        {
          "id": "R1-11-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "AC4"
          ],
          "prerequisites": [
            "A a1→a2 repair, B old completion, C actual child; second A root arrives while B queued; independent D."
          ],
          "steps": [
            "Preview before A completes.",
            "Preview after first and second repaired completions.",
            "Supply B completion consuming all causes and preview again."
          ],
          "expected": [
            "No early queue, pointer mutation or duplicated cause; latest coherent parent/all roots required; consumed update not requeued; only actual descendants qualify."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Full scenario matrix and repeated-root/descendant policy traces with no provider side effects."
  },
  "open_questions": []
}
```

## PGB-169: Publish approved delivery contracts with intact evidence

[PGB-169](https://scubapig.atlassian.net/browse/PGB-169)

### Problem to solve

The source catalogue omits approved Core and caller work. Its checks also compare today's files to historical runtime hashes, which mixes preservation of evidence with validation of current behavior.

### Acceptance Criteria

- **AC1.** Humans and agents can read every approved contract, complete case and dependency under its real Jira key in the source catalogue, including this Story and the approved PGB-159 amendment.
- **AC2.** Original captures, contract versions and evidence remain unchanged and clearly dated; current checks validate the current catalogue and actual copied runtime without treating planned behavior as implemented.
- **AC3.** The readable catalogue, machine data, coverage and whole-work forecasts agree, including the catalogue supplied to PGB-159 and its remaining scheduling work.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Publish the complete approved catalogue, guides and historical/current/source-copy guard checks in the eleven paths recorded in the reviewed delivery plan.
- **TAC1.** Repository danielchappell/Pigboard, base main; change only the catalogue, guides and existing guard/copy tests listed in the reviewed delivery plan, with no runtime or installer behavior change.
- **TAC2.** Preserve all immutable PGB-81 and predecessor captures and independent hashes, using exact retained original bytes where needed; use the frozen native page plus bounded actual new-Story and changed PGB-159 readbacks, with no new inventory campaign.
- **TAC3.** Current validation must independently match approved native contracts and expected semantics and compare every actual source payload byte with its installed copy and manifest; do not introduce a rotating publication hash map, future-change allowlist or skipped check.

### Testing Strategy

All cases below are designated human acceptance and remain NOT_RUN. Developer regressions and contributor evidence are separate. The complete structured contract includes every prerequisite, preparation, case input, step, expected outcome, evidence and cleanup field.

#### PGB-169-H01

{
  "id": "PGB-169-H01",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC1",
    "AC3",
    "TAC1"
  ],
  "prerequisites": [
    "Accepted exact PGB-81 source, complete approved new/changed native readbacks and the prepared isolated current catalogue."
  ],
  "steps": [
    "Inspect both rendered and machine contracts, all complete case objects, dependency order, coverage and forecast arithmetic.",
    "Run the prepared catalogue checks."
  ],
  "expected": [
    "The same complete real-key set is represented, including this Story and the approved PGB-159 amendment.",
    "No duplicate PGB-82 H05, dropped prior case or invented current inventory; readable, machine, coverage and forecast views agree."
  ],
  "evidence": [
    "Exact revision, native readback IDs, prepared commands, sanitized output and observed counts; distinguish inspection from execution and designated human acceptance from contributor evidence."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

#### PGB-169-H02

{
  "id": "PGB-169-H02",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC2",
    "TAC2",
    "TAC3"
  ],
  "prerequisites": [
    "The same prepared source, existing dependencies and disposable copied installation; approved local loopback permission where existing tests require it."
  ],
  "steps": [
    "Run the historical/current guard checks and strict copied controls.",
    "Exercise bounded fixture mutations for historical bytes, a missing current contract or case, and a missing or mismatched copied payload."
  ],
  "expected": [
    "Each defect fails its relevant check while unchanged legitimate current data passes.",
    "Original captures and independent hashes remain exact; current semantics and every actual source/copied payload/manifest entry agree; planned scheduling stays unimplemented."
  ],
  "evidence": [
    "Exact revision, fixture identity, commands and per-control outcomes; retain sanitized evidence before cleanup."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The source catalogue omits approved Core and caller work. Its checks also compare today's files to historical runtime hashes, which mixes preservation of evidence with validation of current behavior.",
  "prerequisites": [
    {
      "ticket": "PGB-81",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "Humans and agents can read every approved contract, complete case and dependency under its real Jira key in the source catalogue, including this Story and the approved PGB-159 amendment."
    },
    {
      "id": "AC2",
      "requirement": "Original captures, contract versions and evidence remain unchanged and clearly dated; current checks validate the current catalogue and actual copied runtime without treating planned behavior as implemented."
    },
    {
      "id": "AC3",
      "requirement": "The readable catalogue, machine data, coverage and whole-work forecasts agree, including the catalogue supplied to PGB-159 and its remaining scheduling work."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Publish the complete approved catalogue, guides and historical/current/source-copy guard checks in the eleven paths recorded in the reviewed delivery plan.",
      "out_of_scope": [
        "Runtime or installer behavior changes",
        "Customer repository changes, deployment or automation activation",
        "New inventory campaign, rotating publication runtime map or future-change allowlist"
      ],
      "related_repositories": []
    },
    "accepted_decisions": [
      {
        "id": "D-ROLE",
        "decision": "Owner10906 assigns Pig Boss complete deterministic scheduling and recorded-proof checks; workers retain current applicable execution proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10906"
      },
      {
        "id": "D-SPLIT",
        "decision": "The Director authorized the same-scope catalogue/guard Story followed by residual PGB-159 after two independent delivery reviews; each slice retains its complete supporting work and normal delivery gates.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-169?focusedCommentId=10942"
      }
    ],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Repository danielchappell/Pigboard, base main; change only the catalogue, guides and existing guard/copy tests listed in the reviewed delivery plan, with no runtime or installer behavior change."
      },
      {
        "id": "TAC2",
        "requirement": "Preserve all immutable PGB-81 and predecessor captures and independent hashes, using exact retained original bytes where needed; use the frozen native page plus bounded actual new-Story and changed PGB-159 readbacks, with no new inventory campaign."
      },
      {
        "id": "TAC3",
        "requirement": "Current validation must independently match approved native contracts and expected semantics and compare every actual source payload byte with its installed copy and manifest; do not introduce a rotating publication hash map, future-change allowlist or skipped check."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Accepted exact Pigboard source and prepared disposable local catalogue/copied-installation fixtures; no customer target or provider access.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "The accepted PGB-81 source, complete approved new/changed native readbacks and isolated catalogue/copy fixtures, with bounded historical-byte, missing-current-data and copied-payload mutations.",
        "initial_state": "Unchanged runtime and fresh disposable copies per control; all unrelated facts remain valid.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Exact catalogue/guard/copy commands, independent expected contract/case/dependency/forecast values and bounded mutation fixtures for the prescribed cases, bound to the reviewed revision.",
        "used_by": [
          "DATA-01",
          "PGB-169-H01",
          "PGB-169-H02"
        ],
        "preserves": [
          "All prescribed inputs, ordering, expectations, evidence and cleanup; no invented authority, capability or live result."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Approved API, database and UI helpers do not execute source catalogue and local installation contracts; designated human acceptance remains separate from developer regressions and contributor QA.",
      "cases": [
        {
          "id": "PGB-169-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC3",
            "TAC1"
          ],
          "prerequisites": [
            "Accepted exact PGB-81 source, complete approved new/changed native readbacks and the prepared isolated current catalogue."
          ],
          "steps": [
            "Inspect both rendered and machine contracts, all complete case objects, dependency order, coverage and forecast arithmetic.",
            "Run the prepared catalogue checks."
          ],
          "expected": [
            "The same complete real-key set is represented, including this Story and the approved PGB-159 amendment.",
            "No duplicate PGB-82 H05, dropped prior case or invented current inventory; readable, machine, coverage and forecast views agree."
          ],
          "evidence": [
            "Exact revision, native readback IDs, prepared commands, sanitized output and observed counts; distinguish inspection from execution and designated human acceptance from contributor evidence."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        },
        {
          "id": "PGB-169-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "The same prepared source, existing dependencies and disposable copied installation; approved local loopback permission where existing tests require it."
          ],
          "steps": [
            "Run the historical/current guard checks and strict copied controls.",
            "Exercise bounded fixture mutations for historical bytes, a missing current contract or case, and a missing or mismatched copied payload."
          ],
          "expected": [
            "Each defect fails its relevant check while unchanged legitimate current data passes.",
            "Original captures and independent hashes remain exact; current semantics and every actual source/copied payload/manifest entry agree; planned scheduling stays unimplemented."
          ],
          "evidence": [
            "Exact revision, fixture identity, commands and per-control outcomes; retain sanitized evidence before cleanup."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        }
      ]
    },
    "automated_regression": "Extend existing authoring, QA-helper and cursor installation checks for complete current contracts, immutable history and full source/copy equality, retaining existing strict semantics and required repository checks. Use prepared dependencies only; no fetch, provider credentials, customer target or activation."
  },
  "open_questions": []
}
```

## PGB-159: Check complete scheduling declarations

[PGB-159](https://scubapig.atlassian.net/browse/PGB-159)

### Problem to solve

Pig Boss needs to check whether a human-ready ticket is structurally complete without demanding execution facts that can only exist during implementation. The current full-start check couples those two decisions.

### Acceptance Criteria

- **AC1.** The existing source and installed work checker accepts complete scheduling declarations against canonical scope and installed supported skills without requiring future execution facts.
- **AC2.** It rejects incomplete coverage, invalid dispatch or references, unsupported skills, unsafe scope and inconsistent preparation declarations with actionable field diagnostics.
- **AC3.** The current catalogue contains every approved new Core and caller contract and the amended PGB-82 contract under real keys; historical completion and evidence stay historical.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Check complete scheduling declarations through the existing consumers and exact path forecast in the delivery plan.
- **TAC1.** Keep strict draft, structure and full start meanings; reuse complete semantic checks for coverage, children, binding order, graphs, bounded observations, ledgers and preparation consumers.
- **TAC2.** Add the scheduling purpose to the existing checker and copied capability set; work text grants no authority and a scheduling result grants no execution readiness or human Ready to Work decision.
- **TAC3.** Consume and verify the catalogue delivered by prerequisite PGB-169; retain its historical-byte and current-semantic/source-copy checks, and count any necessary supporting edits in this Story's actual scope.

### Testing Strategy

All cases below are designated human acceptance and remain NOT_RUN. Developer regressions and contributor evidence are separate. The complete structured contract includes every prerequisite, preparation, case input, step, expected outcome, evidence and cleanup field.

#### PGB-159-H01

{
  "id": "PGB-159-H01",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC1",
    "TAC1",
    "TAC2"
  ],
  "prerequisites": [
    "Complete mixed and all-human tickets; a declared code-dependent preparation slot not yet filled; canonical scope and supported skills."
  ],
  "steps": [
    "Run the prepared source and installed checker commands for scheduling and strict start.",
    "Compare structured and readable results for both plans."
  ],
  "expected": [
    "Scheduling accepts both complete declarations without invented context; strict start still requires its full applicable context.",
    "Outputs identify the checked purpose and do not assert execution permission or make the human readiness decision."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

#### PGB-159-H02

{
  "id": "PGB-159-H02",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC2",
    "AC3",
    "TAC1",
    "TAC2",
    "TAC3"
  ],
  "prerequisites": [
    "Separate controls for missing AC/TAC coverage, duplicate dispatch, wrong API child, forward binding, unknown preparation consumer, unauthorized repository, unsupported skill, dependency cycle, missing SQL input, invalid observation schedule and exceeded ledger bound; approved real key mapping."
  ],
  "steps": [
    "Run each isolated declaration control through source and copied scheduling checks.",
    "Inspect the complete catalogue and run its prescribed preservation/current-runtime checks."
  ],
  "expected": [
    "Every control fails at its relevant field without dropping full test-plan semantics.",
    "All eight approved new Story keys and revised PGB-82 dependencies/contracts are represented; immutable captures retain their original content while current semantic and copy checks cover the changed route."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Pig Boss needs to check whether a human-ready ticket is structurally complete without demanding execution facts that can only exist during implementation. The current full-start check couples those two decisions.",
  "prerequisites": [
    {
      "ticket": "PGB-81",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "PGB-99",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "PGB-145",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "PGB-169",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The existing source and installed work checker accepts complete scheduling declarations against canonical scope and installed supported skills without requiring future execution facts."
    },
    {
      "id": "AC2",
      "requirement": "It rejects incomplete coverage, invalid dispatch or references, unsupported skills, unsafe scope and inconsistent preparation declarations with actionable field diagnostics."
    },
    {
      "id": "AC3",
      "requirement": "The current catalogue contains every approved new Core and caller contract and the amended PGB-82 contract under real keys; historical completion and evidence stay historical."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Check complete scheduling declarations through the existing consumers and exact path forecast in the delivery plan.",
      "out_of_scope": [
        "Customer repository changes, activation or deployment",
        "Context service, public phase framework, parallel preview generation or new permission source"
      ],
      "related_repositories": []
    },
    "accepted_decisions": [
      {
        "id": "D-ROLE",
        "decision": "Owner10906 assigns Pig Boss complete deterministic scheduling and recorded-proof checks; workers retain current applicable execution proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10906"
      },
      {
        "id": "D-PREP",
        "decision": "Director10909 permits in-stage current fact preparation from existing authority; only the implementer fills declared mechanical slots and every action requires its applicable proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10909"
      }
    ],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Keep strict draft, structure and full start meanings; reuse complete semantic checks for coverage, children, binding order, graphs, bounded observations, ledgers and preparation consumers."
      },
      {
        "id": "TAC2",
        "requirement": "Add the scheduling purpose to the existing checker and copied capability set; work text grants no authority and a scheduling result grants no execution readiness or human Ready to Work decision."
      },
      {
        "id": "TAC3",
        "requirement": "Consume and verify the catalogue delivered by prerequisite PGB-169; retain its historical-byte and current-semantic/source-copy checks, and count any necessary supporting edits in this Story's actual scope."
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
        "description": "Finite isolated fixtures for every control stated in this ticket; all other facts are valid and no earlier-priority work exists.",
        "initial_state": "Fresh per control unless an ordered sequence is explicit; provider/model/helper outputs are simulated and credentials dummy.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Executable fixtures and exact source/copied commands or instruction invocations for the prescribed cases, bound to the reviewed PR revision.",
        "used_by": [
          "DATA-01",
          "PGB-159-H01",
          "PGB-159-H02"
        ],
        "preserves": [
          "All prescribed inputs, ordering, expectations, evidence and cleanup; no invented authority, capability or live result."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns CLI and instruction contracts that the approved API/database/UI helpers do not execute; designated human reviewers run these cases. Developer regression and contributor QA evidence are separate.",
      "cases": [
        {
          "id": "PGB-159-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Complete mixed and all-human tickets; a declared code-dependent preparation slot not yet filled; canonical scope and supported skills."
          ],
          "steps": [
            "Run the prepared source and installed checker commands for scheduling and strict start.",
            "Compare structured and readable results for both plans."
          ],
          "expected": [
            "Scheduling accepts both complete declarations without invented context; strict start still requires its full applicable context.",
            "Outputs identify the checked purpose and do not assert execution permission or make the human readiness decision."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        },
        {
          "id": "PGB-159-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Separate controls for missing AC/TAC coverage, duplicate dispatch, wrong API child, forward binding, unknown preparation consumer, unauthorized repository, unsupported skill, dependency cycle, missing SQL input, invalid observation schedule and exceeded ledger bound; approved real key mapping."
          ],
          "steps": [
            "Run each isolated declaration control through source and copied scheduling checks.",
            "Inspect the complete catalogue and run its prescribed preservation/current-runtime checks."
          ],
          "expected": [
            "Every control fails at its relevant field without dropping full test-plan semantics.",
            "All eight approved new Story keys and revised PGB-82 dependencies/contracts are represented; immutable captures retain their original content while current semantic and copy checks cover the changed route."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        }
      ]
    },
    "automated_regression": "Update affected source/copied integration or instruction-contract regressions for these prescribed outcomes, retain strict primitive/security regressions and run required repository checks."
  },
  "open_questions": []
}
```

## PGB-160: Validate authenticated recorded handoffs

[PGB-160](https://scubapig.atlassian.net/browse/PGB-160)

### Problem to solve

Manager history currently depends on old execution bodies and external observations that it no longer owns. Its existing checker needs to distinguish exact historical authentication from proof that current work has recorded completion.

### Acceptance Criteria

- **AC1.** The existing handoff checker authenticates an exact historical target and required ancestry, including manager admission and stack-update requests, without requiring a completed QA leaf.
- **AC2.** Its separate completion purpose establishes recorded completion only for the exact current requirements, assignment and complete leaf; changed or incomplete proof cannot pass.
- **AC3.** Both results state that external freshness was not evaluated and grant no execution authority; no old work/context reconstruction is required.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Validate authenticated recorded handoffs through the existing consumers and exact path forecast in the delivery plan.
- **TAC1.** Implement the planned inspectRecordedHistory and inspectRecordedCompletion contracts in the existing receipts module and command, preserving strict public v1 record/chain behavior.
- **TAC2.** Retain authenticated actor/server metadata and original bytes, unique UUID/slot rules, current raw work/digest, assignments, all repair roots, parent segments/cutoffs, retained tuples and genuine pre-first-PR inventory.
- **TAC3.** Use the closed manager envelope and canonical native authority specified in docs/delivery/manager-r1/role-amendment.md; remove historical bodies/context and external PR/evidence inputs without manufacturing observations or replacing missing retained proof with current comments.

### Testing Strategy

All cases below are designated human acceptance and remain NOT_RUN. Developer regressions and contributor evidence are separate. The complete structured contract includes every prerequisite, preparation, case input, step, expected outcome, evidence and cleanup field.

#### PGB-160-H01

{
  "id": "PGB-160-H01",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC1",
    "AC3",
    "TAC1",
    "TAC2",
    "TAC3"
  ],
  "prerequisites": [
    "Exact current QA completion, manager admission and stack-update targets with authenticated pages/retained tuples; ordinary, repeated-parent/root and genuine pre-first-PR histories."
  ],
  "steps": [
    "Invoke history for each exact target and completion for the current completed leaf, without old work/context or external observations.",
    "Change only hidden external PR head/target/open state; compare results and strict-v1 behavior on the reduced envelope."
  ],
  "expected": [
    "History validates the exact manager targets without claiming QA completion; completion proves only the valid current completed leaf.",
    "Recorded results do not change merely because unseen external facts changed; external freshness remains unchecked and strict v1 does not accept the reduced input as its old full proof."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

#### PGB-160-H02

{
  "id": "PGB-160-H02",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC2",
    "TAC2",
    "TAC3"
  ],
  "prerequisites": [
    "Isolated edited server metadata/body, conflicting UUID, changed current requirement, wrong assignment, missing ancestor/root, conflicting QA slot, omitted first-PR inventory and missing parent-cutoff controls."
  ],
  "steps": [
    "Run each control for its relevant target/purpose using source and copied command.",
    "Inspect target, binding and diagnostic fields."
  ],
  "expected": [
    "Every missing, conflicting or mismatched proof fails its relevant purpose; no historical body or retained tuple is synthesized and no result establishes completion from an unpublished or wrong target."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Manager history currently depends on old execution bodies and external observations that it no longer owns. Its existing checker needs to distinguish exact historical authentication from proof that current work has recorded completion.",
  "prerequisites": [
    {
      "ticket": "PGB-159",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The existing handoff checker authenticates an exact historical target and required ancestry, including manager admission and stack-update requests, without requiring a completed QA leaf."
    },
    {
      "id": "AC2",
      "requirement": "Its separate completion purpose establishes recorded completion only for the exact current requirements, assignment and complete leaf; changed or incomplete proof cannot pass."
    },
    {
      "id": "AC3",
      "requirement": "Both results state that external freshness was not evaluated and grant no execution authority; no old work/context reconstruction is required."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Validate authenticated recorded handoffs through the existing consumers and exact path forecast in the delivery plan.",
      "out_of_scope": [
        "Customer repository changes, activation or deployment",
        "Context service, public phase framework, parallel preview generation or new permission source"
      ],
      "related_repositories": []
    },
    "accepted_decisions": [
      {
        "id": "D-ROLE",
        "decision": "Owner10906 assigns Pig Boss complete deterministic scheduling and recorded-proof checks; workers retain current applicable execution proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10906"
      },
      {
        "id": "D-PREP",
        "decision": "Director10909 permits in-stage current fact preparation from existing authority; only the implementer fills declared mechanical slots and every action requires its applicable proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10909"
      }
    ],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Implement the planned inspectRecordedHistory and inspectRecordedCompletion contracts in the existing receipts module and command, preserving strict public v1 record/chain behavior."
      },
      {
        "id": "TAC2",
        "requirement": "Retain authenticated actor/server metadata and original bytes, unique UUID/slot rules, current raw work/digest, assignments, all repair roots, parent segments/cutoffs, retained tuples and genuine pre-first-PR inventory."
      },
      {
        "id": "TAC3",
        "requirement": "Use the closed manager envelope and canonical native authority specified in docs/delivery/manager-r1/role-amendment.md; remove historical bodies/context and external PR/evidence inputs without manufacturing observations or replacing missing retained proof with current comments."
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
        "description": "Finite isolated fixtures for every control stated in this ticket; all other facts are valid and no earlier-priority work exists.",
        "initial_state": "Fresh per control unless an ordered sequence is explicit; provider/model/helper outputs are simulated and credentials dummy.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Executable fixtures and exact source/copied commands or instruction invocations for the prescribed cases, bound to the reviewed PR revision.",
        "used_by": [
          "DATA-01",
          "PGB-160-H01",
          "PGB-160-H02"
        ],
        "preserves": [
          "All prescribed inputs, ordering, expectations, evidence and cleanup; no invented authority, capability or live result."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns CLI and instruction contracts that the approved API/database/UI helpers do not execute; designated human reviewers run these cases. Developer regression and contributor QA evidence are separate.",
      "cases": [
        {
          "id": "PGB-160-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Exact current QA completion, manager admission and stack-update targets with authenticated pages/retained tuples; ordinary, repeated-parent/root and genuine pre-first-PR histories."
          ],
          "steps": [
            "Invoke history for each exact target and completion for the current completed leaf, without old work/context or external observations.",
            "Change only hidden external PR head/target/open state; compare results and strict-v1 behavior on the reduced envelope."
          ],
          "expected": [
            "History validates the exact manager targets without claiming QA completion; completion proves only the valid current completed leaf.",
            "Recorded results do not change merely because unseen external facts changed; external freshness remains unchecked and strict v1 does not accept the reduced input as its old full proof."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        },
        {
          "id": "PGB-160-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Isolated edited server metadata/body, conflicting UUID, changed current requirement, wrong assignment, missing ancestor/root, conflicting QA slot, omitted first-PR inventory and missing parent-cutoff controls."
          ],
          "steps": [
            "Run each control for its relevant target/purpose using source and copied command.",
            "Inspect target, binding and diagnostic fields."
          ],
          "expected": [
            "Every missing, conflicting or mismatched proof fails its relevant purpose; no historical body or retained tuple is synthesized and no result establishes completion from an unpublished or wrong target."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        }
      ]
    },
    "automated_regression": "Update affected source/copied integration or instruction-contract regressions for these prescribed outcomes, retain strict primitive/security regressions and run required repository checks."
  },
  "open_questions": []
}
```

## PGB-161: Check current worker proof and truthful inability

[PGB-161](https://scubapig.atlassian.net/browse/PGB-161)

### Problem to solve

Workers need current execution proof while consuming older authenticated handoffs. They also need to report inability before code-dependent QA facts exist without treating that report as permission to act.

### Acceptance Criteria

- **AC1.** The existing checker validates full current work, applicable current PR/evidence and configured authority with recorded ancestry for READY, review, QA and human request-rework consumers.
- **AC2.** A separate narrow assignment check validates complete declarations, exact stage/actor/assignment and supported existing inability candidates without asserting execution readiness; unsupported or unverified candidates stay local.
- **AC3.** Unpublished candidates and real native readback remain distinct, and unknown publication never becomes success or permission to replay.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Check current worker proof and truthful inability through the existing consumers and exact path forecast in the delivery plan.
- **TAC1.** Implement validateWorkerCurrent and validateWorkerAssignment with worker-current and worker-assignment modes in the existing module/command and one copied capability set, using the planned closed pigboard-worker-handoff-input/v1 envelope.
- **TAC2.** Preserve strict full current start and own/required-parent action proof; facts come from canonical setup and permitted observations, never authority inferred from ticket or historical success; return execution_authorized:false.
- **TAC3.** Validate candidate bytes, UUID, coverage and assignment before append; only real immutable server readback can establish published history. Unknown/mixed versions reject without strict-v1 or manager-result fallback.

### Testing Strategy

All cases below are designated human acceptance and remain NOT_RUN. Developer regressions and contributor evidence are separate. The complete structured contract includes every prerequisite, preparation, case input, step, expected outcome, evidence and cleanup field.

#### PGB-161-H01

{
  "id": "PGB-161-H01",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC1",
    "TAC1",
    "TAC2"
  ],
  "prerequisites": [
    "Full current READY, review, QA and authorized human-rework inputs; authenticated old ancestry without old context; actual own/required-parent PR, evidence and configured rights."
  ],
  "steps": [
    "Run each current purpose in source and copied checker.",
    "Repeat with changed PR identity/head/target, unsafe operation, missing prepared input, missing authority and mixed-version controls."
  ],
  "expected": [
    "Valid current inputs pass only their explicit proof purpose without granting execution permission.",
    "Each current-proof failure rejects before its dependent action; prior recorded success cannot cure it and current human rework retains current QA/same-open-PR proof."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

#### PGB-161-H02

{
  "id": "PGB-161-H02",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC2",
    "AC3",
    "TAC1",
    "TAC2",
    "TAC3"
  ],
  "prerequisites": [
    "Valid assignment with a declared future artifact unavailable; supported blocked/dependency-wait candidates and unknown assignment/publisher or unsupported-kind controls."
  ],
  "steps": [
    "Validate assignment and unpublished candidate without fabricated native metadata.",
    "Validate real readback, then changed bytes/UUID and unknown-publication variants."
  ],
  "expected": [
    "Only an authorized supported inability shape validates; unknown assignment/rights or unsupported shapes remain local.",
    "Assignment success cannot replace full current readiness. Real readback binds the original candidate; changed/uncertain publication fails or holds without replay, fake IDs or completion."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Workers need current execution proof while consuming older authenticated handoffs. They also need to report inability before code-dependent QA facts exist without treating that report as permission to act.",
  "prerequisites": [
    {
      "ticket": "PGB-160",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The existing checker validates full current work, applicable current PR/evidence and configured authority with recorded ancestry for READY, review, QA and human request-rework consumers."
    },
    {
      "id": "AC2",
      "requirement": "A separate narrow assignment check validates complete declarations, exact stage/actor/assignment and supported existing inability candidates without asserting execution readiness; unsupported or unverified candidates stay local."
    },
    {
      "id": "AC3",
      "requirement": "Unpublished candidates and real native readback remain distinct, and unknown publication never becomes success or permission to replay."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Check current worker proof and truthful inability through the existing consumers and exact path forecast in the delivery plan.",
      "out_of_scope": [
        "Customer repository changes, activation or deployment",
        "Context service, public phase framework, parallel preview generation or new permission source"
      ],
      "related_repositories": []
    },
    "accepted_decisions": [
      {
        "id": "D-ROLE",
        "decision": "Owner10906 assigns Pig Boss complete deterministic scheduling and recorded-proof checks; workers retain current applicable execution proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10906"
      },
      {
        "id": "D-PREP",
        "decision": "Director10909 permits in-stage current fact preparation from existing authority; only the implementer fills declared mechanical slots and every action requires its applicable proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10909"
      }
    ],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Implement validateWorkerCurrent and validateWorkerAssignment with worker-current and worker-assignment modes in the existing module/command and one copied capability set, using the planned closed pigboard-worker-handoff-input/v1 envelope."
      },
      {
        "id": "TAC2",
        "requirement": "Preserve strict full current start and own/required-parent action proof; facts come from canonical setup and permitted observations, never authority inferred from ticket or historical success; return execution_authorized:false."
      },
      {
        "id": "TAC3",
        "requirement": "Validate candidate bytes, UUID, coverage and assignment before append; only real immutable server readback can establish published history. Unknown/mixed versions reject without strict-v1 or manager-result fallback."
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
        "description": "Finite isolated fixtures for every control stated in this ticket; all other facts are valid and no earlier-priority work exists.",
        "initial_state": "Fresh per control unless an ordered sequence is explicit; provider/model/helper outputs are simulated and credentials dummy.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Executable fixtures and exact source/copied commands or instruction invocations for the prescribed cases, bound to the reviewed PR revision.",
        "used_by": [
          "DATA-01",
          "PGB-161-H01",
          "PGB-161-H02"
        ],
        "preserves": [
          "All prescribed inputs, ordering, expectations, evidence and cleanup; no invented authority, capability or live result."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns CLI and instruction contracts that the approved API/database/UI helpers do not execute; designated human reviewers run these cases. Developer regression and contributor QA evidence are separate.",
      "cases": [
        {
          "id": "PGB-161-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Full current READY, review, QA and authorized human-rework inputs; authenticated old ancestry without old context; actual own/required-parent PR, evidence and configured rights."
          ],
          "steps": [
            "Run each current purpose in source and copied checker.",
            "Repeat with changed PR identity/head/target, unsafe operation, missing prepared input, missing authority and mixed-version controls."
          ],
          "expected": [
            "Valid current inputs pass only their explicit proof purpose without granting execution permission.",
            "Each current-proof failure rejects before its dependent action; prior recorded success cannot cure it and current human rework retains current QA/same-open-PR proof."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        },
        {
          "id": "PGB-161-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Valid assignment with a declared future artifact unavailable; supported blocked/dependency-wait candidates and unknown assignment/publisher or unsupported-kind controls."
          ],
          "steps": [
            "Validate assignment and unpublished candidate without fabricated native metadata.",
            "Validate real readback, then changed bytes/UUID and unknown-publication variants."
          ],
          "expected": [
            "Only an authorized supported inability shape validates; unknown assignment/rights or unsupported shapes remain local.",
            "Assignment success cannot replace full current readiness. Real readback binds the original candidate; changed/uncertain publication fails or holds without replay, fake IDs or completion."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        }
      ]
    },
    "automated_regression": "Update affected source/copied integration or instruction-contract regressions for these prescribed outcomes, retain strict primitive/security regressions and run required repository checks."
  },
  "open_questions": []
}
```

## R1-33: Inspect named Jira issues safely

[PGB-147](https://scubapig.atlassian.net/browse/PGB-147)

### Problem to solve

An authorized caller cannot inspect the native issues and comments needed to diagnose a manager input. It needs current observations and explicit incomplete results without first running a scheduler or discovering a whole project.

### Acceptance Criteria

- **AC1.** A documented source/copied library call inspects the supplied immutable issue IDs, their fixed assignment properties, complete comment pages and named exact comments.
- **AC2.** Results identify complete, unavailable and changed observations, retain successful observations, and distinguish an unknown pointer from a confirmed value.
- **AC3.** Invalid inputs fail before credential resolution; requests use the fixed HTTPS gateway, verified TLS, no redirects or retries, and finite count/byte/time limits.
- **AC4.** Safe human/JSON harness reports show requested completeness, counters and recovery without credentials or raw bodies; every result says domain discovery and admission are not evaluated.
- **AC5.** The same prescribed inspection works through actual copied dependencies from an unrelated directory, with honest setup failure and no source fallback.

### Technical Acceptance Criteria

- **TAC1.** Repository `danielchappell/Pigboard`, base `main`, one PR; own the fixed native read/inspection library, test harness, distribution and its docs/metadata only.
- **TAC2.** Consume PGB-145's canonical validated connection/bounds and trusted programmatic resolver; expose no arbitrary URL, JQL, method, transport module, credential CLI flag, environment override or insecure mode.
- **TAC3.** Preserve native IDs/server metadata and endpoint-specific comment pagination; generic 404, missing pages and visibility limits cannot prove absence.
- **TAC4.** Count all attempted requests and bytes, bound private observations as well as public reports, cancel owned I/O and fence late resolver results; return no scheduling or semantic receipt proof.

### Testing Strategy

Human acceptance remains NOT_RUN. AI cases: zero.

#### R1-33-H01

- R1-33-H01
- human
- designated human reviewer
- AC1
- AC2
- AC4
- TAC3
- PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.
- Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.
- Run exactly these named variants: complete, empty-comments, renamed-key, unknown-pointer, exact-mismatch. Each uses fresh state except its explicitly paired controls.
- The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports.
- For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-33-H01 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.
- Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.
- Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.
- Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON.
- complete: two issues, one present pointer each, two comment pages plus one named exact target, literal IDs/metadata and requested complete/domain false. empty-comments: explicit zero-total page, present pointer. renamed-key: same ID/current key. unknown-pointer: pointer404 yields incomplete/POINTER_UNKNOWN, never null. exact-mismatch: changed exact body/metadata yields CHANGED_INPUT.
- Every result reports inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.
- Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.
- Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.
- Command/output transcripts, exit codes, safe reports and literal expected-report comparison.
- Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.
- Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- prescribed
- designated human reviewer
- Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.
- Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources.

#### R1-33-H02

- R1-33-H02
- human
- designated human reviewer
- AC2
- AC3
- AC4
- TAC3
- TAC4
- PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.
- Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.
- Run exactly these named variants: missing-page, changed-total, duplicate-comment, zero-progress, issue403, issue404, rate429, header-timeout, body-timeout, resolver-reject, resolver-abort, resolver-late. Each uses fresh state except its explicitly paired controls.
- The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports.
- For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-33-H02 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.
- Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.
- Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.
- Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON.
- missing-page, changed-total, duplicate-comment, zero-progress, issue403, issue404, rate429, header-timeout, body-timeout, resolver-reject, resolver-abort, resolver-late: each has a literal stop point/code; no retry, swallowed secret, false absence or post-return B-owned read. Late resolver case expects cancel_unconfirmed and discards the late dummy token; fixture itself acknowledges/stops its own I/O during cleanup.
- Every result reports inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.
- Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.
- Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.
- Command/output transcripts, exit codes, safe reports and literal expected-report comparison.
- Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.
- Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- prescribed
- designated human reviewer
- Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.
- Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources.

#### R1-33-H03

- R1-33-H03
- human
- designated human reviewer
- AC3
- AC4
- TAC2
- TAC4
- PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.
- Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.
- Run exactly these named variants: invalid-origin, invalid-request, out-of-scope-issue, redirect, untrusted-ca, wrong-host, error-canary, compressed-response, known-limit, comment-limit, page-limit, request-limit, response-byte-limit, total-byte-limit, request-time-limit, scan-time-limit. Each uses fresh state except its explicitly paired controls.
- The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports.
- For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-33-H03 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.
- Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.
- Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.
- Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON.
- invalid-origin, invalid-request, out-of-scope-issue, redirect, untrusted-ca, wrong-host, error-canary, compressed-response. Invalid setup invokes no resolver; rejected scope has no follow-up body/comment reads; redirect target receives no credentials/request; TLS failures occur; reports exclude every body/token/reference/error canary.
- L01 known-limit: two supplied issues, max_known_issues1 then2. B1 rejects pre-resolver at1; at2 continues.
- L02 comment-limit: two ordinary comments, max_comments1 then2. B1 incomplete before retaining excess; at2 complete.
- L03 page-limit: two comment pages, max_pages1 then2. B1 stops before requesting second at1.
- L04 request-limit: a literal four-request single-issue script, max_requests3 then4, max_pages1. B1 stops before fourth at3; at4 completes.
- L05 response-byte-limit: one identity-encoded body with literal byte lengthN, capN−1 thenN. B1 aborts at excess; no raw/error disclosure.
- L06 total-byte-limit: two responses with literal lengths summingN, per-response cap≤N−1, totalN−1 thenN. B1 counts both and stops at aggregate excess; private observation serialization has a separate deterministic oversized-projection subvariant within this case.
- L07 request-time-limit: fixture withholds headers/body past fixed request deadline; paired immediate response. B1 cancels actual socket, no later B-owned work. Deadline is not increased to force a pass.
- L08 scan-time-limit: resolver plus two individually timely responses exceed total deadline; paired immediate sequence. B1 total includes resolution, parsing and cleanup; result incomplete even if last parse otherwise succeeds.
- Each budget-hit input changes only the named budget to one below its independently known demand while preserving A’s cross-field relations; run its paired positive-at-limit control. Expected demand and call counts are literal fixture facts prepared before execution. Do not raise bounds after observing failure.
- Every result reports inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.
- Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.
- Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.
- Command/output transcripts, exit codes, safe reports and literal expected-report comparison.
- Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.
- Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- prescribed
- designated human reviewer
- Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.
- Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources.

#### R1-33-H04

- R1-33-H04
- human
- designated human reviewer
- AC4
- AC5
- TAC1
- TAC2
- PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.
- Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.
- Run exactly these named variants: guide-and-install, damaged-copy. Each uses fresh state except its explicitly paired controls.
- The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports.
- For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-33-H04 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.
- Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.
- Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.
- Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON.
- guide-and-install: source/copied documented examples and human/JSON parity, actual copied module/dependency hashes, unrelated cwd. damaged-copy: remove one required module only in a disposable copy; expect safe setup failure, no source fallback/fetch/repair. Other cases already run both routes; this group verifies installation/recovery rather than adding a third matrix.
- Every result reports inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.
- Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.
- Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.
- Command/output transcripts, exit codes, safe reports and literal expected-report comparison.
- Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.
- Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- prescribed
- designated human reviewer
- Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.
- Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "An authorized caller cannot inspect the native issues and comments needed to diagnose a manager input. It needs current observations and explicit incomplete results without first running a scheduler or discovering a whole project.",
  "prerequisites": [
    {
      "ticket": "R1-31",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-36",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "A documented source/copied library call inspects the supplied immutable issue IDs, their fixed assignment properties, complete comment pages and named exact comments."
    },
    {
      "id": "AC2",
      "requirement": "Results identify complete, unavailable and changed observations, retain successful observations, and distinguish an unknown pointer from a confirmed value."
    },
    {
      "id": "AC3",
      "requirement": "Invalid inputs fail before credential resolution; requests use the fixed HTTPS gateway, verified TLS, no redirects or retries, and finite count/byte/time limits."
    },
    {
      "id": "AC4",
      "requirement": "Safe human/JSON harness reports show requested completeness, counters and recovery without credentials or raw bodies; every result says domain discovery and admission are not evaluated."
    },
    {
      "id": "AC5",
      "requirement": "The same prescribed inspection works through actual copied dependencies from an unrelated directory, with honest setup failure and no source fallback."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own fixed read-only native issue inspection, its source/copied library and fixture harness, distribution, tests, documentation and publication metadata.",
      "out_of_scope": [
        "Plexus/customer repository changes, AWS resolver/wrapper, State adapter and operational-state writes.",
        "Receipt acceptance, policy selection/admission, external PR/evidence fetching, a new input producer or a PGB-144 proof-policy decision.",
        "Production live CLI, provider probes, deployment, activation, worker monitoring, Cursor deduplication, automatic recovery and new QA engines."
      ],
      "related_repositories": []
    },
    "accepted_decisions": [],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Repository `danielchappell/Pigboard`, base `main`, one PR; own the fixed native read/inspection library, test harness, distribution and its docs/metadata only."
      },
      {
        "id": "TAC2",
        "requirement": "Consume PGB-145's canonical validated connection/bounds and trusted programmatic resolver; expose no arbitrary URL, JQL, method, transport module, credential CLI flag, environment override or insecure mode."
      },
      {
        "id": "TAC3",
        "requirement": "Preserve native IDs/server metadata and endpoint-specific comment pagination; generic 404, missing pages and visibility limits cannot prove absence."
      },
      {
        "id": "TAC4",
        "requirement": "Count all attempted requests and bytes, bound private observations as well as public reports, cancel owned I/O and fence late resolver results; return no scheduling or semantic receipt proof."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Current Pigboard PR checkout, actual prepared copied runtime and disposable local HTTPS fixtures; no deployed customer target.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "Prescribed isolated B1 fixture set for the four human groups below, including only their listed finite variants and controls.",
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
        "supplies": "PR-bound executable local HTTPS fixture scripts, literal reports and permitted request traces, exact source/copied commands and prepared absolute paths for every listed variant; all expected answers are authored independently of the production collector.",
        "used_by": [
          "DATA-01",
          "R1-33-H01",
          "R1-33-H02",
          "R1-33-H03",
          "R1-33-H04"
        ],
        "preserves": [
          "All acceptance criteria, technical constraints, case inputs, finite variants and limits, paired controls, order, expected outcomes, evidence and cleanup.",
          "Existing source/copied distinction, verified TLS and no-effects boundaries; no live provider data, changed expectations, new cases or raised budgets.",
          "All original PGB-82 acceptance remains on final82: five AC, three TAC and four human groups, including full integrated preview and offline-equivalent policy results."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns CLI/library contracts, which the currently approved automated QA skills do not execute. QA skills are []; human reviewers run the prescribed cases. Developer regressions, CI and independent PR review remain required and do not count as human acceptance.",
      "cases": [
        {
          "id": "R1-33-H01",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC4",
            "TAC3"
          ],
          "prerequisites": [
            "PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.",
            "Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.",
            "Run exactly these named variants: complete, empty-comments, renamed-key, unknown-pointer, exact-mismatch. Each uses fresh state except its explicitly paired controls.",
            "The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports."
          ],
          "steps": [
            "For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-33-H01 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.",
            "Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.",
            "Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.",
            "Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON."
          ],
          "expected": [
            "complete: two issues, one present pointer each, two comment pages plus one named exact target, literal IDs/metadata and requested complete/domain false. empty-comments: explicit zero-total page, present pointer. renamed-key: same ID/current key. unknown-pointer: pointer404 yields incomplete/POINTER_UNKNOWN, never null. exact-mismatch: changed exact body/metadata yields CHANGED_INPUT.",
            "Every result reports inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.",
            "Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign."
          ],
          "evidence": [
            "Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.",
            "Command/output transcripts, exit codes, safe reports and literal expected-report comparison.",
            "Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.",
            "Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.",
              "Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-33-H02",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "AC4",
            "TAC3",
            "TAC4"
          ],
          "prerequisites": [
            "PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.",
            "Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.",
            "Run exactly these named variants: missing-page, changed-total, duplicate-comment, zero-progress, issue403, issue404, rate429, header-timeout, body-timeout, resolver-reject, resolver-abort, resolver-late. Each uses fresh state except its explicitly paired controls.",
            "The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports."
          ],
          "steps": [
            "For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-33-H02 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.",
            "Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.",
            "Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.",
            "Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON."
          ],
          "expected": [
            "missing-page, changed-total, duplicate-comment, zero-progress, issue403, issue404, rate429, header-timeout, body-timeout, resolver-reject, resolver-abort, resolver-late: each has a literal stop point/code; no retry, swallowed secret, false absence or post-return B-owned read. Late resolver case expects cancel_unconfirmed and discards the late dummy token; fixture itself acknowledges/stops its own I/O during cleanup.",
            "Every result reports inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.",
            "Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign."
          ],
          "evidence": [
            "Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.",
            "Command/output transcripts, exit codes, safe reports and literal expected-report comparison.",
            "Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.",
            "Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.",
              "Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-33-H03",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC3",
            "AC4",
            "TAC2",
            "TAC4"
          ],
          "prerequisites": [
            "PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.",
            "Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.",
            "Run exactly these named variants: invalid-origin, invalid-request, out-of-scope-issue, redirect, untrusted-ca, wrong-host, error-canary, compressed-response, known-limit, comment-limit, page-limit, request-limit, response-byte-limit, total-byte-limit, request-time-limit, scan-time-limit. Each uses fresh state except its explicitly paired controls.",
            "The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports."
          ],
          "steps": [
            "For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-33-H03 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.",
            "Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.",
            "Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.",
            "Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON."
          ],
          "expected": [
            "invalid-origin, invalid-request, out-of-scope-issue, redirect, untrusted-ca, wrong-host, error-canary, compressed-response. Invalid setup invokes no resolver; rejected scope has no follow-up body/comment reads; redirect target receives no credentials/request; TLS failures occur; reports exclude every body/token/reference/error canary.",
            "L01 known-limit: two supplied issues, max_known_issues1 then2. B1 rejects pre-resolver at1; at2 continues.",
            "L02 comment-limit: two ordinary comments, max_comments1 then2. B1 incomplete before retaining excess; at2 complete.",
            "L03 page-limit: two comment pages, max_pages1 then2. B1 stops before requesting second at1.",
            "L04 request-limit: a literal four-request single-issue script, max_requests3 then4, max_pages1. B1 stops before fourth at3; at4 completes.",
            "L05 response-byte-limit: one identity-encoded body with literal byte lengthN, capN−1 thenN. B1 aborts at excess; no raw/error disclosure.",
            "L06 total-byte-limit: two responses with literal lengths summingN, per-response cap≤N−1, totalN−1 thenN. B1 counts both and stops at aggregate excess; private observation serialization has a separate deterministic oversized-projection subvariant within this case.",
            "L07 request-time-limit: fixture withholds headers/body past fixed request deadline; paired immediate response. B1 cancels actual socket, no later B-owned work. Deadline is not increased to force a pass.",
            "L08 scan-time-limit: resolver plus two individually timely responses exceed total deadline; paired immediate sequence. B1 total includes resolution, parsing and cleanup; result incomplete even if last parse otherwise succeeds.",
            "Each budget-hit input changes only the named budget to one below its independently known demand while preserving A’s cross-field relations; run its paired positive-at-limit control. Expected demand and call counts are literal fixture facts prepared before execution. Do not raise bounds after observing failure.",
            "Every result reports inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.",
            "Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign."
          ],
          "evidence": [
            "Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.",
            "Command/output transcripts, exit codes, safe reports and literal expected-report comparison.",
            "Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.",
            "Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.",
              "Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-33-H04",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC4",
            "AC5",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.",
            "Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.",
            "Run exactly these named variants: guide-and-install, damaged-copy. Each uses fresh state except its explicitly paired controls.",
            "The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports."
          ],
          "steps": [
            "For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-33-H04 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.",
            "Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.",
            "Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.",
            "Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON."
          ],
          "expected": [
            "guide-and-install: source/copied documented examples and human/JSON parity, actual copied module/dependency hashes, unrelated cwd. damaged-copy: remove one required module only in a disposable copy; expect safe setup failure, no source fallback/fetch/repair. Other cases already run both routes; this group verifies installation/recovery rather than adding a third matrix.",
            "Every result reports inspection_scope requested_issues, domain_complete false, admission not_evaluated and receipt_proof not_evaluated; requested completeness never certifies the whole domain.",
            "Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign."
          ],
          "evidence": [
            "Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.",
            "Command/output transcripts, exit codes, safe reports and literal expected-report comparison.",
            "Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.",
            "Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.",
              "Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Real HTTPS transport cancellation, TLS and sanitization plus direct native inspection integration, actual copied payload isolation and source/publication guards."
  },
  "open_questions": []
}
```

## R1-34: Inspect complete scoped Jira inventory

[PGB-148](https://scubapig.atlassian.net/browse/PGB-148)

### Problem to solve

Named-issue inspection cannot find occupied work omitted from a caller's list. A manager caller needs the union of opt-in work, native membership, retained work and typed references, with honest limits and ownership changes.

### Acceptance Criteria

- **AC1.** A source/copied library call returns complete or explicitly incomplete native inventory for the configured domain, with retained-source completeness reported separately.
- **AC2.** Discovery covers all-status opt-in seeds, native children and exact full-label occupancy, then fresh-reads the union of declared, retained, prerequisite and typed-reference identities to a bounded fixed point.
- **AC3.** Missing/drifting/denied reads and exhausted limits retain known observations and old/current ownership; failures identify a proven isolated scope or shared uncertainty.
- **AC4.** Immutable project/issue IDs preserve equal-label separation, renamed keys and cross-project references; collecting a prerequisite never marks it satisfied.
- **AC5.** The documented source/copied harness demonstrates complete, failure and unrelated-history cases without writes, receipt acceptance, state mutation or admission claims.

### Technical Acceptance Criteria

- **TAC1.** Repository `danielchappell/Pigboard`, base `main`, one PR; own scoped inventory and reference acquisition using B1's fixed reader, with complete docs/distribution/publication tests.
- **TAC2.** Use the same single canonical config and invocation accounting. The supplied object has exactly retained_members, pending_intents and explicit retained_complete. Retained members carry ticket_id, project_id, epic_id, label and assignment (null or ticket_id/comment_id/record_id/digest); pending intents carry project_id, label, ticket_id and attempt_id. Validate existing bounded field shapes, unique records and configured site/project bindings. Missing or false retained completeness never becomes empty complete state or new setup authority.
- **TAC3.** Search only fixed enhanced-JQL families; follow actual search tokens and comment offsets separately, preserve former ownership and never crawl unrelated project history.
- **TAC4.** Existing work/handoff parsers identify candidate references only; completeness does not establish visibility, current receipt proof, trusted context, capacity or policy success.

### Testing Strategy

Human acceptance remains NOT_RUN. AI cases: zero.

#### R1-34-H01

- R1-34-H01
- human
- designated human reviewer
- AC1
- AC2
- AC5
- TAC2
- TAC3
- PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.
- Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.
- Run exactly these named variants: complete-domain, unrelated-history, retained-incomplete. Each uses fresh state except its explicitly paired controls.
- The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports.
- For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-34-H01 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.
- Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.
- Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.
- Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON.
- complete-domain: opted-in and paused Epic, undeclared child, Human Review/Blocked occupancy outside the Epic, retained member, declared prerequisite and typed target closure; literal complete ID/provenance set with present pointers. unrelated-history: add exactly 65 unrelated historical issues with 512 total comments to the server script; queries/reads and result stay identical, no unrelated ID/comment access. retained-incomplete: same data with explicit false retained_complete yields shared incomplete.
- Native completeness and retained completeness remain separate; no result grants admission, prerequisite success or receipt proof.
- Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.
- Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.
- Command/output transcripts, exit codes, safe reports and literal expected-report comparison.
- Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.
- Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- prescribed
- designated human reviewer
- Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.
- Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources.

#### R1-34-H02

- R1-34-H02
- human
- designated human reviewer
- AC2
- AC3
- TAC2
- TAC3
- TAC4
- PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.
- Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.
- Run exactly these named variants: seed-page-missing, child-page-missing, label-page-missing, token-repeat, token-missing, search-duplicate, fresh-membership-change, malformed-seed, malformed-record, reference-missing, reference-digest-change, reference-cycle, epic-limit, stream-limit, page-size, closure-target-limit. Each uses fresh state except its explicitly paired controls.
- The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports.
- For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-34-H02 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.
- Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.
- Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.
- Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON.
- seed-page-missing, child-page-missing, label-page-missing, token-repeat, token-missing, search-duplicate, fresh-membership-change, malformed-seed, malformed-record, reference-missing, reference-digest-change, reference-cycle. Every missing/drifting/invalid item has the literal isolated/shared scope; cycle terminates but grants no receipt proof.
- L09 epic-limit: two relevant Epics, max_epics1 then2. B2 incomplete at second unique Epic; no silent omission.
- L10 stream-limit: two full-label tuples, max_streams1 then2. B2 incomplete at second tuple; equal labels in two projects count twice.
- L11 page-size: page_size1 then2 with provider returning smaller pages and explicit continuation. B2 respects requested size and completes by metadata, not short-page heuristic; counts differ by literal oracle.
- L12 closure-target-limit: two unique typed comment targets, max_comments1 then2, with all A cross-field relations valid. B2 stops before enqueuing the second target at1; at2 collects both only if the complete comment inventory also fits. All reference/provenance bytes count toward L06; no new edge-limit setting is added.
- Each budget-hit input changes only the named budget to one below its independently known demand while preserving A’s cross-field relations; run its paired positive-at-limit control. Expected demand and call counts are literal fixture facts prepared before execution. Do not raise bounds after observing failure.
- Native completeness and retained completeness remain separate; no result grants admission, prerequisite success or receipt proof.
- Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.
- Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.
- Command/output transcripts, exit codes, safe reports and literal expected-report comparison.
- Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.
- Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- prescribed
- designated human reviewer
- Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.
- Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources.

#### R1-34-H03

- R1-34-H03
- human
- designated human reviewer
- AC3
- AC4
- AC5
- TAC2
- TAC4
- PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.
- Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.
- Run exactly these named variants: two-projects, cross-project-prerequisite, renamed-alias, old-ownership, denied-project, isolated-conflict, out-of-scope-reference. Each uses fresh state except its explicitly paired controls.
- The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports.
- For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-34-H03 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.
- Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.
- Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.
- Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON.
- two-projects: different mappings/equal labels remain separate. cross-project-prerequisite: allowed reference collected, not satisfied. renamed-alias: key resolves same ID once. old-ownership: retained member removes parent/label or moves projects; retain old/current affected scopes. denied-project: unknown reach yields shared incomplete. isolated-conflict: established stream conflict preserves unaffected observations without selection. out-of-scope-reference: bounded identity resolution only, no downstream reads.
- Native completeness and retained completeness remain separate; no result grants admission, prerequisite success or receipt proof.
- Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.
- Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.
- Command/output transcripts, exit codes, safe reports and literal expected-report comparison.
- Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.
- Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- prescribed
- designated human reviewer
- Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.
- Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources.

#### R1-34-H04

- R1-34-H04
- human
- designated human reviewer
- AC1
- AC5
- TAC1
- TAC4
- PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.
- Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.
- Run exactly these named variants: guide-and-install, missing-retained-input, no-effects. Each uses fresh state except its explicitly paired controls.
- The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports.
- For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-34-H04 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.
- Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.
- Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.
- Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON.
- guide-and-install: actual copied inventory API and guide, no import of policy/snapshot/AWS/provider-proof modules. missing-retained-input: input failure before resolver. no-effects: deny/audit filesystem writes, child processes and all nonallowlisted requests, compare source/input/server state hashes. Reports expose limits/partial observations and no admitted/eligible/completed claim.
- Native completeness and retained completeness remain separate; no result grants admission, prerequisite success or receipt proof.
- Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign.
- Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.
- Command/output transcripts, exit codes, safe reports and literal expected-report comparison.
- Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.
- Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation.
- prescribed
- designated human reviewer
- Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.
- Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Named-issue inspection cannot find occupied work omitted from a caller's list. A manager caller needs the union of opt-in work, native membership, retained work and typed references, with honest limits and ownership changes.",
  "prerequisites": [
    {
      "ticket": "R1-33",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "A source/copied library call returns complete or explicitly incomplete native inventory for the configured domain, with retained-source completeness reported separately."
    },
    {
      "id": "AC2",
      "requirement": "Discovery covers all-status opt-in seeds, native children and exact full-label occupancy, then fresh-reads the union of declared, retained, prerequisite and typed-reference identities to a bounded fixed point."
    },
    {
      "id": "AC3",
      "requirement": "Missing/drifting/denied reads and exhausted limits retain known observations and old/current ownership; failures identify a proven isolated scope or shared uncertainty."
    },
    {
      "id": "AC4",
      "requirement": "Immutable project/issue IDs preserve equal-label separation, renamed keys and cross-project references; collecting a prerequisite never marks it satisfied."
    },
    {
      "id": "AC5",
      "requirement": "The documented source/copied harness demonstrates complete, failure and unrelated-history cases without writes, receipt acceptance, state mutation or admission claims."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own complete scoped native inventory and reference collection using B1’s reader, with source/copied harness, distribution, tests, documentation and publication metadata.",
      "out_of_scope": [
        "Plexus/customer repository changes, AWS resolver/wrapper, State adapter and operational-state writes.",
        "Receipt acceptance, policy selection/admission, external PR/evidence fetching, a new input producer or a PGB-144 proof-policy decision.",
        "Production live CLI, provider probes, deployment, activation, worker monitoring, Cursor deduplication, automatic recovery and new QA engines."
      ],
      "related_repositories": []
    },
    "accepted_decisions": [],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Repository `danielchappell/Pigboard`, base `main`, one PR; own scoped inventory and reference acquisition using B1's fixed reader, with complete docs/distribution/publication tests."
      },
      {
        "id": "TAC2",
        "requirement": "Use the same single canonical config and invocation accounting. The supplied object has exactly retained_members, pending_intents and explicit retained_complete. Retained members carry ticket_id, project_id, epic_id, label and assignment (null or ticket_id/comment_id/record_id/digest); pending intents carry project_id, label, ticket_id and attempt_id. Validate existing bounded field shapes, unique records and configured site/project bindings. Missing or false retained completeness never becomes empty complete state or new setup authority."
      },
      {
        "id": "TAC3",
        "requirement": "Search only fixed enhanced-JQL families; follow actual search tokens and comment offsets separately, preserve former ownership and never crawl unrelated project history."
      },
      {
        "id": "TAC4",
        "requirement": "Existing work/handoff parsers identify candidate references only; completeness does not establish visibility, current receipt proof, trusted context, capacity or policy success."
      }
    ]
  },
  "testing_strategy": {
    "testing_types": [],
    "environment": {
      "source": "configured_target",
      "target_reference": "Current Pigboard PR checkout, actual prepared copied runtime and disposable local HTTPS fixtures; no deployed customer target.",
      "required_capabilities": []
    },
    "actors": [],
    "fixtures": [
      {
        "id": "DATA-01",
        "description": "Prescribed isolated B2 fixture set for the four human groups below, including only their listed finite variants and controls.",
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
        "supplies": "PR-bound executable local HTTPS fixture scripts, literal reports and permitted request traces, exact source/copied commands and prepared absolute paths for every listed variant; all expected answers are authored independently of the production collector.",
        "used_by": [
          "DATA-01",
          "R1-34-H01",
          "R1-34-H02",
          "R1-34-H03",
          "R1-34-H04"
        ],
        "preserves": [
          "All acceptance criteria, technical constraints, case inputs, finite variants and limits, paired controls, order, expected outcomes, evidence and cleanup.",
          "Existing source/copied distinction, verified TLS and no-effects boundaries; no live provider data, changed expectations, new cases or raised budgets.",
          "All original PGB-82 acceptance remains on final82: five AC, three TAC and four human groups, including full integrated preview and offline-equivalent policy results."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns CLI/library contracts, which the currently approved automated QA skills do not execute. QA skills are []; human reviewers run the prescribed cases. Developer regressions, CI and independent PR review remain required and do not count as human acceptance.",
      "cases": [
        {
          "id": "R1-34-H01",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC5",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.",
            "Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.",
            "Run exactly these named variants: complete-domain, unrelated-history, retained-incomplete. Each uses fresh state except its explicitly paired controls.",
            "The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports."
          ],
          "steps": [
            "For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-34-H01 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.",
            "Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.",
            "Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.",
            "Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON."
          ],
          "expected": [
            "complete-domain: opted-in and paused Epic, undeclared child, Human Review/Blocked occupancy outside the Epic, retained member, declared prerequisite and typed target closure; literal complete ID/provenance set with present pointers. unrelated-history: add exactly 65 unrelated historical issues with 512 total comments to the server script; queries/reads and result stay identical, no unrelated ID/comment access. retained-incomplete: same data with explicit false retained_complete yields shared incomplete.",
            "Native completeness and retained completeness remain separate; no result grants admission, prerequisite success or receipt proof.",
            "Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign."
          ],
          "evidence": [
            "Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.",
            "Command/output transcripts, exit codes, safe reports and literal expected-report comparison.",
            "Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.",
            "Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.",
              "Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-34-H02",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "TAC2",
            "TAC3",
            "TAC4"
          ],
          "prerequisites": [
            "PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.",
            "Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.",
            "Run exactly these named variants: seed-page-missing, child-page-missing, label-page-missing, token-repeat, token-missing, search-duplicate, fresh-membership-change, malformed-seed, malformed-record, reference-missing, reference-digest-change, reference-cycle, epic-limit, stream-limit, page-size, closure-target-limit. Each uses fresh state except its explicitly paired controls.",
            "The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports."
          ],
          "steps": [
            "For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-34-H02 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.",
            "Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.",
            "Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.",
            "Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON."
          ],
          "expected": [
            "seed-page-missing, child-page-missing, label-page-missing, token-repeat, token-missing, search-duplicate, fresh-membership-change, malformed-seed, malformed-record, reference-missing, reference-digest-change, reference-cycle. Every missing/drifting/invalid item has the literal isolated/shared scope; cycle terminates but grants no receipt proof.",
            "L09 epic-limit: two relevant Epics, max_epics1 then2. B2 incomplete at second unique Epic; no silent omission.",
            "L10 stream-limit: two full-label tuples, max_streams1 then2. B2 incomplete at second tuple; equal labels in two projects count twice.",
            "L11 page-size: page_size1 then2 with provider returning smaller pages and explicit continuation. B2 respects requested size and completes by metadata, not short-page heuristic; counts differ by literal oracle.",
            "L12 closure-target-limit: two unique typed comment targets, max_comments1 then2, with all A cross-field relations valid. B2 stops before enqueuing the second target at1; at2 collects both only if the complete comment inventory also fits. All reference/provenance bytes count toward L06; no new edge-limit setting is added.",
            "Each budget-hit input changes only the named budget to one below its independently known demand while preserving A’s cross-field relations; run its paired positive-at-limit control. Expected demand and call counts are literal fixture facts prepared before execution. Do not raise bounds after observing failure.",
            "Native completeness and retained completeness remain separate; no result grants admission, prerequisite success or receipt proof.",
            "Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign."
          ],
          "evidence": [
            "Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.",
            "Command/output transcripts, exit codes, safe reports and literal expected-report comparison.",
            "Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.",
            "Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.",
              "Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-34-H03",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC3",
            "AC4",
            "AC5",
            "TAC2",
            "TAC4"
          ],
          "prerequisites": [
            "PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.",
            "Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.",
            "Run exactly these named variants: two-projects, cross-project-prerequisite, renamed-alias, old-ownership, denied-project, isolated-conflict, out-of-scope-reference. Each uses fresh state except its explicitly paired controls.",
            "The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports."
          ],
          "steps": [
            "For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-34-H03 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.",
            "Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.",
            "Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.",
            "Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON."
          ],
          "expected": [
            "two-projects: different mappings/equal labels remain separate. cross-project-prerequisite: allowed reference collected, not satisfied. renamed-alias: key resolves same ID once. old-ownership: retained member removes parent/label or moves projects; retain old/current affected scopes. denied-project: unknown reach yields shared incomplete. isolated-conflict: established stream conflict preserves unaffected observations without selection. out-of-scope-reference: bounded identity resolution only, no downstream reads.",
            "Native completeness and retained completeness remain separate; no result grants admission, prerequisite success or receipt proof.",
            "Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign."
          ],
          "evidence": [
            "Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.",
            "Command/output transcripts, exit codes, safe reports and literal expected-report comparison.",
            "Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.",
            "Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.",
              "Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-34-H04",
          "execution": "human",
          "owner_role": "designated human reviewer",
          "requirements": [
            "AC1",
            "AC5",
            "TAC1",
            "TAC4"
          ],
          "prerequisites": [
            "PREP-01 supplies the PR-bound local fixture packet DATA-01, exact commands, literal expected reports and maximum permitted call traces before execution; do not generate expected answers from the production collector.",
            "Prepared Node and root validator dependencies, source checkout and actual copied runtime; fresh disposable data per variant, dummy token/reference and fixed local HTTPS fixture servers. No live Jira account, AWS, Postman or UI is needed.",
            "Run exactly these named variants: guide-and-install, missing-retained-input, no-effects. Each uses fresh state except its explicitly paired controls.",
            "The test-only harness audits the original fixed HTTPS origin/path/method before routing to loopback HTTPS with explicit test CA and hostname; certificate and hostname checks stay enabled. Production has no test origin, CA, transport, insecure mode or fixture imports."
          ],
          "steps": [
            "For each listed variant, run the prepared source command using node test/fixtures/jira-preview-harness.mjs --case R1-34-H04 --variant NAME --runtime SOURCE_ROOT --json; PREP-01 supplies each exact variant name and absolute prepared root.",
            "Compare the report and permitted request audit with the literal expectations below; inspect actual counters, bytes, elapsed time and cleanup.",
            "Repeat the same variant through the actual copied runtime from an unrelated working directory, using the copied harness and --runtime COPIED_ROOT; PREP-01 supplies the exact copied command and absolute root.",
            "Inspect no-effects and cancellation evidence and compare source/input/server before-and-after hashes. Where the guide-and-install variant prescribes readable output, also run its human form without --json and compare its meaning with JSON."
          ],
          "expected": [
            "guide-and-install: actual copied inventory API and guide, no import of policy/snapshot/AWS/provider-proof modules. missing-retained-input: input failure before resolver. no-effects: deny/audit filesystem writes, child processes and all nonallowlisted requests, compare source/input/server state hashes. Reports expose limits/partial observations and no admitted/eligible/completed claim.",
            "Native completeness and retained completeness remain separate; no result grants admission, prerequisite success or receipt proof.",
            "Library collection makes no Jira or operational-state writes. Keep successful observations and explicit failures; do not turn missing evidence into a pass or start an alternate fixture campaign."
          ],
          "evidence": [
            "Tested PR revision, source/copied runtime identity, fixture hashes and exact source/copied commands.",
            "Command/output transcripts, exit codes, safe reports and literal expected-report comparison.",
            "Permitted request trace, actual request/count/byte/time measurements, no-effects/cancellation observations and before/after hashes.",
            "Cleanup result and any remaining unverified outcome; these local fixture observations do not prove live Jira, AWS, supported production capacity or activation."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "designated human reviewer",
            "steps": [
              "Retain the evidence packet and close the prescribed local fixture servers, sockets and timers; the resolver-late fixture stops and acknowledges its own I/O where that variant applies.",
              "Remove only disposable fixture/build directories and damaged copies; preserve the usable prepared release, source and retained evidence. Do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Scoped search, retained/reference closure, failure scope and copied inventory integration, preserving B1 reader accounting and both source/publication guard suites."
  },
  "open_questions": []
}
```

## PGB-162: Preview scheduling and repairs from recorded proof

[PGB-162](https://scubapig.atlassian.net/browse/PGB-162)

### Problem to solve

The existing offline preview still expects manager execution contexts and external PR observations. Operators need one explicit preview format that preserves scheduling and repair rules while showing the weaker recorded-proof guarantee.

### Acceptance Criteria

- **AC1.** The existing source and installed preview select ordinary, own-repair and parent-stack work from complete scheduling declarations and authenticated recorded proof.
- **AC2.** Ordering, scope, capacity, pause, repair roots, parent incorporation, pre-first-PR waits and retained uncertainty remain enforced; hidden external changes are explicitly outside the result.
- **AC3.** The new pinned release accepts snapshot v2 and rejects old/mixed inputs with migration guidance; the older pinned release keeps its historical behavior.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Preview scheduling and repairs from recorded proof through the existing consumers and exact path forecast in the delivery plan.
- **TAC1.** Adapt snapshot composition and repair-policy guards to recorded PR identity/assertions; never fabricate current PR availability, state, source or target observations.
- **TAC2.** Preserve retained_members, pending_intents and retained_complete shapes and original attempt package/configuration/assignment/transition identity; incompatible or unknown old uncertainty holds.
- **TAC3.** Migrate the actual PGB-81 fixture/export/installed-smoke consumers and readable/JSON help once, preserving the distinct 67 exported bodies, 66 installed inputs and 42 human objects; retain strict primitive APIs without a second preview evaluator.

### Testing Strategy

All cases below are designated human acceptance and remain NOT_RUN. Developer regressions and contributor evidence are separate. The complete structured contract includes every prerequisite, preparation, case input, step, expected outcome, evidence and cleanup field.

#### PGB-162-H01

{
  "id": "PGB-162-H01",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC1",
    "AC3",
    "TAC1",
    "TAC3"
  ],
  "prerequisites": [
    "Existing ordinary, own-repair, repeated-parent, unfinished-child and first-PR fixture families; actual PGB-81 export/installed-smoke inputs migrated to explicit v2."
  ],
  "steps": [
    "Run each prepared source and installed preview and compare its prescribed selection, roots and recorded identity.",
    "Run the existing exporter/eighth smoke, including its semantic-failure/previous-link checks, and inspect the migrated readable/JSON guidance."
  ],
  "expected": [
    "Expected scheduling and repair selections are unchanged apart from the approved recorded-freshness interpretation.",
    "Actual incoming consumers use v2 coherently; export/body/installed/human counts remain distinct and no additional workflow generation is introduced."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

#### PGB-162-H02

{
  "id": "PGB-162-H02",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC2",
    "AC3",
    "TAC1",
    "TAC2"
  ],
  "prerequisites": [
    "Occupied stream, fifth Human Review, pause, cycle, Epic conflict, changed current requirements, missing root and old/mixed-version controls; retained incompatible uncertain attempt; hidden external PR change only."
  ],
  "steps": [
    "Run each isolated control through the preview.",
    "Inspect holds/rejections, exact retained identity and the unchanged-record hidden-change result."
  ],
  "expected": [
    "Policy controls still hold the required scope; unknown old uncertainty is never reinterpreted or replayed.",
    "Old/mixed input rejects precisely; hidden external change alone is not detected or described as live-safe, and readable/JSON output states that limitation."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The existing offline preview still expects manager execution contexts and external PR observations. Operators need one explicit preview format that preserves scheduling and repair rules while showing the weaker recorded-proof guarantee.",
  "prerequisites": [
    {
      "ticket": "PGB-160",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "PGB-81",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The existing source and installed preview select ordinary, own-repair and parent-stack work from complete scheduling declarations and authenticated recorded proof."
    },
    {
      "id": "AC2",
      "requirement": "Ordering, scope, capacity, pause, repair roots, parent incorporation, pre-first-PR waits and retained uncertainty remain enforced; hidden external changes are explicitly outside the result."
    },
    {
      "id": "AC3",
      "requirement": "The new pinned release accepts snapshot v2 and rejects old/mixed inputs with migration guidance; the older pinned release keeps its historical behavior."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Preview scheduling and repairs from recorded proof through the existing consumers and exact path forecast in the delivery plan.",
      "out_of_scope": [
        "Customer repository changes, activation or deployment",
        "Context service, public phase framework, parallel preview generation or new permission source"
      ],
      "related_repositories": []
    },
    "accepted_decisions": [
      {
        "id": "D-ROLE",
        "decision": "Owner10906 assigns Pig Boss complete deterministic scheduling and recorded-proof checks; workers retain current applicable execution proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10906"
      },
      {
        "id": "D-PREP",
        "decision": "Director10909 permits in-stage current fact preparation from existing authority; only the implementer fills declared mechanical slots and every action requires its applicable proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10909"
      }
    ],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Adapt snapshot composition and repair-policy guards to recorded PR identity/assertions; never fabricate current PR availability, state, source or target observations."
      },
      {
        "id": "TAC2",
        "requirement": "Preserve retained_members, pending_intents and retained_complete shapes and original attempt package/configuration/assignment/transition identity; incompatible or unknown old uncertainty holds."
      },
      {
        "id": "TAC3",
        "requirement": "Migrate the actual PGB-81 fixture/export/installed-smoke consumers and readable/JSON help once, preserving the distinct 67 exported bodies, 66 installed inputs and 42 human objects; retain strict primitive APIs without a second preview evaluator."
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
        "description": "Finite isolated fixtures for every control stated in this ticket; all other facts are valid and no earlier-priority work exists.",
        "initial_state": "Fresh per control unless an ordered sequence is explicit; provider/model/helper outputs are simulated and credentials dummy.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Executable fixtures and exact source/copied commands or instruction invocations for the prescribed cases, bound to the reviewed PR revision.",
        "used_by": [
          "DATA-01",
          "PGB-162-H01",
          "PGB-162-H02"
        ],
        "preserves": [
          "All prescribed inputs, ordering, expectations, evidence and cleanup; no invented authority, capability or live result."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns CLI and instruction contracts that the approved API/database/UI helpers do not execute; designated human reviewers run these cases. Developer regression and contributor QA evidence are separate.",
      "cases": [
        {
          "id": "PGB-162-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC3",
            "TAC1",
            "TAC3"
          ],
          "prerequisites": [
            "Existing ordinary, own-repair, repeated-parent, unfinished-child and first-PR fixture families; actual PGB-81 export/installed-smoke inputs migrated to explicit v2."
          ],
          "steps": [
            "Run each prepared source and installed preview and compare its prescribed selection, roots and recorded identity.",
            "Run the existing exporter/eighth smoke, including its semantic-failure/previous-link checks, and inspect the migrated readable/JSON guidance."
          ],
          "expected": [
            "Expected scheduling and repair selections are unchanged apart from the approved recorded-freshness interpretation.",
            "Actual incoming consumers use v2 coherently; export/body/installed/human counts remain distinct and no additional workflow generation is introduced."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        },
        {
          "id": "PGB-162-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Occupied stream, fifth Human Review, pause, cycle, Epic conflict, changed current requirements, missing root and old/mixed-version controls; retained incompatible uncertain attempt; hidden external PR change only."
          ],
          "steps": [
            "Run each isolated control through the preview.",
            "Inspect holds/rejections, exact retained identity and the unchanged-record hidden-change result."
          ],
          "expected": [
            "Policy controls still hold the required scope; unknown old uncertainty is never reinterpreted or replayed.",
            "Old/mixed input rejects precisely; hidden external change alone is not detected or described as live-safe, and readable/JSON output states that limitation."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        }
      ]
    },
    "automated_regression": "Update affected source/copied integration or instruction-contract regressions for these prescribed outcomes, retain strict primitive/security regressions and run required repository checks."
  },
  "open_questions": []
}
```

## PGB-163: Read exact handoffs and reconciliation facts

[PGB-163](https://scubapig.atlassian.net/browse/PGB-163)

### Problem to solve

Existing native consumers need complete authenticated target facts, and reconciliation also needs real native transition history. The current bounded reader has comments but no native changelog operation.

### Acceptance Criteria

- **AC1.** The source and installed native receipt route produce exact recorded proof for the requested target using configured authority and complete native closure.
- **AC2.** For an original retained attempt, the same bounded session produces complete publication observations and separate native status-change history, including a truthful complete-empty result.
- **AC3.** Missing, denied, incomplete, unsupported or exhausted observations return precise unavailable/incomplete/unsupported outcomes; acquisition writes no provider or operational state.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Read exact handoffs and reconciliation facts through the existing consumers and exact path forecast in the delivery plan.
- **TAC1.** Compose the actual handed-off reader session and planned readReconciliationFacts({attempt,publicationReferences,limits}); consume validated retained selectors and preserve original package/configuration/assignment/attempt identity.
- **TAC2.** Add only fixed GET /rest/api/3/issue/{id}/changelog with startAt/maxResults and native ID/actor/from/to/time projection, sharing counters/deadline/byte limits with issue/comment/publication reads; no generic GET, response-URL following or fresh-budget reader.
- **TAC3.** Preserve HTTPS/TLS, destination and secret boundaries, prior retained metadata and exact manager-target bindings; comments cannot substitute for native history, and history alone proves neither 204/409 outcome nor operation correlation.

### Testing Strategy

All cases below are designated human acceptance and remain NOT_RUN. Developer regressions and contributor evidence are separate. The complete structured contract includes every prerequisite, preparation, case input, step, expected outcome, evidence and cleanup field.

#### PGB-163-H01

{
  "id": "PGB-163-H01",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC1",
    "AC2",
    "TAC1",
    "TAC2",
    "TAC3"
  ],
  "prerequisites": [
    "Prepared bounded REST fixtures for a current QA target and original manager admission/stack-update targets, with exact comments, retained tuples, publication references and native changelog pages; separate complete-empty history variant."
  ],
  "steps": [
    "Run exact native receipt and original-attempt reconciliation acquisition through source and copied consumers.",
    "Inspect exact selectors, shared request/byte/time accounting, proof bindings, native-history projection and mutation audit."
  ],
  "expected": [
    "All requested pages/proofs bind to the original target and attempt; actual history ID/actor/from/to/time is separate from typed-record ancestry.",
    "Complete empty history remains complete empty, not transition proof; the producer does not assert 204/409 or finalize an attempt and performs zero mutations."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

#### PGB-163-H02

{
  "id": "PGB-163-H02",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC3",
    "TAC1",
    "TAC2",
    "TAC3"
  ],
  "prerequisites": [
    "Missing page, 403/404, exhausted shared budget, timeout, foreign/redirect destination, secret-bearing error, wrong UUID/assignment, edited metadata, absent prior retained tuple and unsupported changelog-shape controls."
  ],
  "steps": [
    "Run each isolated acquisition control under the same configured session limit.",
    "Inspect bounded calls, provenance/status and sanitized diagnostics."
  ],
  "expected": [
    "No failure becomes empty complete data or fabricated identity; exact unsupported/incomplete reasons remain visible.",
    "No second budget, arbitrary destination, credential leak, write or automatic replay escapes the configured boundary."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Existing native consumers need complete authenticated target facts, and reconciliation also needs real native transition history. The current bounded reader has comments but no native changelog operation.",
  "prerequisites": [
    {
      "ticket": "PGB-160",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "PGB-147",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "PGB-148",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "PGB-150",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The source and installed native receipt route produce exact recorded proof for the requested target using configured authority and complete native closure."
    },
    {
      "id": "AC2",
      "requirement": "For an original retained attempt, the same bounded session produces complete publication observations and separate native status-change history, including a truthful complete-empty result."
    },
    {
      "id": "AC3",
      "requirement": "Missing, denied, incomplete, unsupported or exhausted observations return precise unavailable/incomplete/unsupported outcomes; acquisition writes no provider or operational state."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Read exact handoffs and reconciliation facts through the existing consumers and exact path forecast in the delivery plan.",
      "out_of_scope": [
        "Customer repository changes, activation or deployment",
        "Context service, public phase framework, parallel preview generation or new permission source"
      ],
      "related_repositories": []
    },
    "accepted_decisions": [
      {
        "id": "D-ROLE",
        "decision": "Owner10906 assigns Pig Boss complete deterministic scheduling and recorded-proof checks; workers retain current applicable execution proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10906"
      },
      {
        "id": "D-PREP",
        "decision": "Director10909 permits in-stage current fact preparation from existing authority; only the implementer fills declared mechanical slots and every action requires its applicable proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10909"
      }
    ],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Compose the actual handed-off reader session and planned readReconciliationFacts({attempt,publicationReferences,limits}); consume validated retained selectors and preserve original package/configuration/assignment/attempt identity."
      },
      {
        "id": "TAC2",
        "requirement": "Add only fixed GET /rest/api/3/issue/{id}/changelog with startAt/maxResults and native ID/actor/from/to/time projection, sharing counters/deadline/byte limits with issue/comment/publication reads; no generic GET, response-URL following or fresh-budget reader."
      },
      {
        "id": "TAC3",
        "requirement": "Preserve HTTPS/TLS, destination and secret boundaries, prior retained metadata and exact manager-target bindings; comments cannot substitute for native history, and history alone proves neither 204/409 outcome nor operation correlation."
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
        "description": "Finite isolated fixtures for every control stated in this ticket; all other facts are valid and no earlier-priority work exists.",
        "initial_state": "Fresh per control unless an ordered sequence is explicit; provider/model/helper outputs are simulated and credentials dummy.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Executable fixtures and exact source/copied commands or instruction invocations for the prescribed cases, bound to the reviewed PR revision.",
        "used_by": [
          "DATA-01",
          "PGB-163-H01",
          "PGB-163-H02"
        ],
        "preserves": [
          "All prescribed inputs, ordering, expectations, evidence and cleanup; no invented authority, capability or live result."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns CLI and instruction contracts that the approved API/database/UI helpers do not execute; designated human reviewers run these cases. Developer regression and contributor QA evidence are separate.",
      "cases": [
        {
          "id": "PGB-163-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Prepared bounded REST fixtures for a current QA target and original manager admission/stack-update targets, with exact comments, retained tuples, publication references and native changelog pages; separate complete-empty history variant."
          ],
          "steps": [
            "Run exact native receipt and original-attempt reconciliation acquisition through source and copied consumers.",
            "Inspect exact selectors, shared request/byte/time accounting, proof bindings, native-history projection and mutation audit."
          ],
          "expected": [
            "All requested pages/proofs bind to the original target and attempt; actual history ID/actor/from/to/time is separate from typed-record ancestry.",
            "Complete empty history remains complete empty, not transition proof; the producer does not assert 204/409 or finalize an attempt and performs zero mutations."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        },
        {
          "id": "PGB-163-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Missing page, 403/404, exhausted shared budget, timeout, foreign/redirect destination, secret-bearing error, wrong UUID/assignment, edited metadata, absent prior retained tuple and unsupported changelog-shape controls."
          ],
          "steps": [
            "Run each isolated acquisition control under the same configured session limit.",
            "Inspect bounded calls, provenance/status and sanitized diagnostics."
          ],
          "expected": [
            "No failure becomes empty complete data or fabricated identity; exact unsupported/incomplete reasons remain visible.",
            "No second budget, arbitrary destination, credential leak, write or automatic replay escapes the configured boundary."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        }
      ]
    },
    "automated_regression": "Update affected source/copied integration or instruction-contract regressions for these prescribed outcomes, retain strict primitive/security regressions and run required repository checks."
  },
  "open_questions": []
}
```

## PGB-164: Complete implementation with current permitted facts

[PGB-164](https://scubapig.atlassian.net/browse/PGB-164)

### Problem to solve

The implementer currently expects a full supplied context before work that may create the declared QA artifacts. Its existing journey needs to prepare permitted current facts at the correct time while preserving strict final readiness.

### Acceptance Criteria

- **AC1.** The existing key-and-skill journey retains High planning, independent review and Medium execution while deriving current facts from already-authorized setup and permitted observations.
- **AC2.** The implementer fills only declared mechanical preparation slots, including artifacts that depend on code, and proves full current start/prepared coverage/PR/CI before READY publication.
- **AC3.** Missing next-action authority or required facts stops that action; a supported authenticated inability can be published once, otherwise inability stays local, and uncertain effects never replay.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Complete implementation with current permitted facts through the existing consumers and exact path forecast in the delivery plan.
- **TAC1.** Use PGB-161 worker-assignment/current and PGB-160 recorded ancestry through the handed-off copied capability set; a declaration or recorded history result is not execution authority.
- **TAC2.** Preserve one assigned ticket/PR, exact repair roots and current parent incorporation; do not add a public phase framework, external per-ticket setup chore, dependency installation or new permission source.
- **TAC3.** Keep candidate validation, original UUID/bytes, real readback, final history/freshness and transition as separate checks; no full READY or successful publication claim before its required proof.

### Testing Strategy

All cases below are designated human acceptance and remain NOT_RUN. Developer regressions and contributor evidence are separate. The complete structured contract includes every prerequisite, preparation, case input, step, expected outcome, evidence and cleanup field.

#### PGB-164-H01

{
  "id": "PGB-164-H01",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC1",
    "AC2",
    "TAC1",
    "TAC2"
  ],
  "prerequisites": [
    "Prepared existing implementer instruction harness with current canonical rights, a declared code-dependent QA artifact, repair roots and a current required-parent PR; all provider/model responses labelled simulated."
  ],
  "steps": [
    "Drive the existing High plan, independent review and Medium execution route.",
    "Fill only the declared mechanical artifact after its code exists; validate full current proof and the READY candidate/readback."
  ],
  "expected": [
    "The route preserves role order and current action checks without demanding nonexistent future facts before code.",
    "READY requires the complete prepared plan, current PR/CI and repair/parent proof; a simulated instruction trace is not live model/provider acceptance."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

#### PGB-164-H02

{
  "id": "PGB-164-H02",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC3",
    "TAC1",
    "TAC2",
    "TAC3"
  ],
  "prerequisites": [
    "Isolated missing authority, unsafe operation, missing final artifact, changed assignment and unknown publisher controls; uncertain PR creation, publication and transition results."
  ],
  "steps": [
    "Drive each control to its first affected boundary.",
    "Inspect the action/publication ledger and any supported blocked candidate/readback."
  ],
  "expected": [
    "No dependent code/provider/helper action occurs without applicable proof; known authorized supported inability may publish once, while unverified assignment/rights stays local.",
    "Uncertain effects retain original identity and stop without execution/publication replay or fabricated READY."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The implementer currently expects a full supplied context before work that may create the declared QA artifacts. Its existing journey needs to prepare permitted current facts at the correct time while preserving strict final readiness.",
  "prerequisites": [
    {
      "ticket": "PGB-161",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The existing key-and-skill journey retains High planning, independent review and Medium execution while deriving current facts from already-authorized setup and permitted observations."
    },
    {
      "id": "AC2",
      "requirement": "The implementer fills only declared mechanical preparation slots, including artifacts that depend on code, and proves full current start/prepared coverage/PR/CI before READY publication."
    },
    {
      "id": "AC3",
      "requirement": "Missing next-action authority or required facts stops that action; a supported authenticated inability can be published once, otherwise inability stays local, and uncertain effects never replay."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Complete implementation with current permitted facts through the existing consumers and exact path forecast in the delivery plan.",
      "out_of_scope": [
        "Customer repository changes, activation or deployment",
        "Context service, public phase framework, parallel preview generation or new permission source"
      ],
      "related_repositories": []
    },
    "accepted_decisions": [
      {
        "id": "D-ROLE",
        "decision": "Owner10906 assigns Pig Boss complete deterministic scheduling and recorded-proof checks; workers retain current applicable execution proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10906"
      },
      {
        "id": "D-PREP",
        "decision": "Director10909 permits in-stage current fact preparation from existing authority; only the implementer fills declared mechanical slots and every action requires its applicable proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10909"
      }
    ],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Use PGB-161 worker-assignment/current and PGB-160 recorded ancestry through the handed-off copied capability set; a declaration or recorded history result is not execution authority."
      },
      {
        "id": "TAC2",
        "requirement": "Preserve one assigned ticket/PR, exact repair roots and current parent incorporation; do not add a public phase framework, external per-ticket setup chore, dependency installation or new permission source."
      },
      {
        "id": "TAC3",
        "requirement": "Keep candidate validation, original UUID/bytes, real readback, final history/freshness and transition as separate checks; no full READY or successful publication claim before its required proof."
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
        "description": "Finite isolated fixtures for every control stated in this ticket; all other facts are valid and no earlier-priority work exists.",
        "initial_state": "Fresh per control unless an ordered sequence is explicit; provider/model/helper outputs are simulated and credentials dummy.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Executable fixtures and exact source/copied commands or instruction invocations for the prescribed cases, bound to the reviewed PR revision.",
        "used_by": [
          "DATA-01",
          "PGB-164-H01",
          "PGB-164-H02"
        ],
        "preserves": [
          "All prescribed inputs, ordering, expectations, evidence and cleanup; no invented authority, capability or live result."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns CLI and instruction contracts that the approved API/database/UI helpers do not execute; designated human reviewers run these cases. Developer regression and contributor QA evidence are separate.",
      "cases": [
        {
          "id": "PGB-164-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Prepared existing implementer instruction harness with current canonical rights, a declared code-dependent QA artifact, repair roots and a current required-parent PR; all provider/model responses labelled simulated."
          ],
          "steps": [
            "Drive the existing High plan, independent review and Medium execution route.",
            "Fill only the declared mechanical artifact after its code exists; validate full current proof and the READY candidate/readback."
          ],
          "expected": [
            "The route preserves role order and current action checks without demanding nonexistent future facts before code.",
            "READY requires the complete prepared plan, current PR/CI and repair/parent proof; a simulated instruction trace is not live model/provider acceptance."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        },
        {
          "id": "PGB-164-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Isolated missing authority, unsafe operation, missing final artifact, changed assignment and unknown publisher controls; uncertain PR creation, publication and transition results."
          ],
          "steps": [
            "Drive each control to its first affected boundary.",
            "Inspect the action/publication ledger and any supported blocked candidate/readback."
          ],
          "expected": [
            "No dependent code/provider/helper action occurs without applicable proof; known authorized supported inability may publish once, while unverified assignment/rights stays local.",
            "Uncertain effects retain original identity and stop without execution/publication replay or fabricated READY."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        }
      ]
    },
    "automated_regression": "Update affected source/copied integration or instruction-contract regressions for these prescribed outcomes, retain strict primitive/security regressions and run required repository checks."
  },
  "open_questions": []
}
```

## PGB-165: Review current proof with recorded ancestry

[PGB-165](https://scubapig.atlassian.net/browse/PGB-165)

### Problem to solve

The reviewer needs old authenticated history without reconstructing previous workers’ contexts. Its current PR, independence and prepared-input checks must still govern the actual review and publication.

### Acceptance Criteria

- **AC1.** The existing reviewer assembles permitted current work/PR/evidence facts and runs the shared read-only review job once for the current snapshot using recorded ancestry.
- **AC2.** It preserves independence, complete C01–C20/category coverage and clean/finding outcomes while checking actual open PR, approvals/revocations, CI and completed prepared QA inputs.
- **AC3.** Missing current proof stops review/publication at the applicable boundary; supported inability remains truthful and unknown publication cannot replay or become success.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Review current proof with recorded ancestry through the existing consumers and exact path forecast in the delivery plan.
- **TAC1.** Use the planned current/assignment checker and recorded ancestry at existing preflight, freshness, candidate and final boundaries; keep the shared review job rather than cloning it.
- **TAC2.** Canonical configuration and actual permitted observations supply facts and rights; the reviewer consumes prepared inputs and never invents tests, queries, expectations or missing artifacts.
- **TAC3.** Preserve one authorized canonical publication with original bytes/UUID and real readback; no silent capability/route fallback or inference of a product defect from missing evidence.

### Testing Strategy

All cases below are designated human acceptance and remain NOT_RUN. Developer regressions and contributor evidence are separate. The complete structured contract includes every prerequisite, preparation, case input, step, expected outcome, evidence and cleanup field.

#### PGB-165-H01

{
  "id": "PGB-165-H01",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC1",
    "AC2",
    "TAC1",
    "TAC2"
  ],
  "prerequisites": [
    "Prepared source/copied reviewer instruction harness with a current open PR, independent reviewer, current CI/approvals, completed prepared inputs and authenticated old ancestry; clean and finding variants."
  ],
  "steps": [
    "Invoke the existing review route for each snapshot.",
    "Inspect current-proof checks, the one job invocation, all review categories and candidate/readback."
  ],
  "expected": [
    "Each snapshot receives one independent complete review with its prescribed clean/finding result.",
    "Old contexts are not reconstructed; current PR/CI/independence/prepared-input proof remains mandatory and no deployment is invented for a static review."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

#### PGB-165-H02

{
  "id": "PGB-165-H02",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC3",
    "TAC1",
    "TAC2",
    "TAC3"
  ],
  "prerequisites": [
    "Missing artifact, stale/changed PR/CI/approval, absent independence, unauthorized capability and uncertain-publication controls."
  ],
  "steps": [
    "Drive each isolated control to its affected boundary.",
    "Inspect supported inability or local result and the publication/action ledger."
  ],
  "expected": [
    "The affected action stops with truthful evidence; missing facts do not become a fabricated product defect or invented QA artifact.",
    "Only a supported authorized inability can publish; uncertain append/transition retains identity without replay, job duplication or alternate-route fallback."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The reviewer needs old authenticated history without reconstructing previous workers’ contexts. Its current PR, independence and prepared-input checks must still govern the actual review and publication.",
  "prerequisites": [
    {
      "ticket": "PGB-161",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The existing reviewer assembles permitted current work/PR/evidence facts and runs the shared read-only review job once for the current snapshot using recorded ancestry."
    },
    {
      "id": "AC2",
      "requirement": "It preserves independence, complete C01–C20/category coverage and clean/finding outcomes while checking actual open PR, approvals/revocations, CI and completed prepared QA inputs."
    },
    {
      "id": "AC3",
      "requirement": "Missing current proof stops review/publication at the applicable boundary; supported inability remains truthful and unknown publication cannot replay or become success."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Review current proof with recorded ancestry through the existing consumers and exact path forecast in the delivery plan.",
      "out_of_scope": [
        "Customer repository changes, activation or deployment",
        "Context service, public phase framework, parallel preview generation or new permission source"
      ],
      "related_repositories": []
    },
    "accepted_decisions": [
      {
        "id": "D-ROLE",
        "decision": "Owner10906 assigns Pig Boss complete deterministic scheduling and recorded-proof checks; workers retain current applicable execution proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10906"
      },
      {
        "id": "D-PREP",
        "decision": "Director10909 permits in-stage current fact preparation from existing authority; only the implementer fills declared mechanical slots and every action requires its applicable proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10909"
      }
    ],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Use the planned current/assignment checker and recorded ancestry at existing preflight, freshness, candidate and final boundaries; keep the shared review job rather than cloning it."
      },
      {
        "id": "TAC2",
        "requirement": "Canonical configuration and actual permitted observations supply facts and rights; the reviewer consumes prepared inputs and never invents tests, queries, expectations or missing artifacts."
      },
      {
        "id": "TAC3",
        "requirement": "Preserve one authorized canonical publication with original bytes/UUID and real readback; no silent capability/route fallback or inference of a product defect from missing evidence."
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
        "description": "Finite isolated fixtures for every control stated in this ticket; all other facts are valid and no earlier-priority work exists.",
        "initial_state": "Fresh per control unless an ordered sequence is explicit; provider/model/helper outputs are simulated and credentials dummy.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Executable fixtures and exact source/copied commands or instruction invocations for the prescribed cases, bound to the reviewed PR revision.",
        "used_by": [
          "DATA-01",
          "PGB-165-H01",
          "PGB-165-H02"
        ],
        "preserves": [
          "All prescribed inputs, ordering, expectations, evidence and cleanup; no invented authority, capability or live result."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns CLI and instruction contracts that the approved API/database/UI helpers do not execute; designated human reviewers run these cases. Developer regression and contributor QA evidence are separate.",
      "cases": [
        {
          "id": "PGB-165-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Prepared source/copied reviewer instruction harness with a current open PR, independent reviewer, current CI/approvals, completed prepared inputs and authenticated old ancestry; clean and finding variants."
          ],
          "steps": [
            "Invoke the existing review route for each snapshot.",
            "Inspect current-proof checks, the one job invocation, all review categories and candidate/readback."
          ],
          "expected": [
            "Each snapshot receives one independent complete review with its prescribed clean/finding result.",
            "Old contexts are not reconstructed; current PR/CI/independence/prepared-input proof remains mandatory and no deployment is invented for a static review."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        },
        {
          "id": "PGB-165-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Missing artifact, stale/changed PR/CI/approval, absent independence, unauthorized capability and uncertain-publication controls."
          ],
          "steps": [
            "Drive each isolated control to its affected boundary.",
            "Inspect supported inability or local result and the publication/action ledger."
          ],
          "expected": [
            "The affected action stops with truthful evidence; missing facts do not become a fabricated product defect or invented QA artifact.",
            "Only a supported authorized inability can publish; uncertain append/transition retains identity without replay, job duplication or alternate-route fallback."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        }
      ]
    },
    "automated_regression": "Update affected source/copied integration or instruction-contract regressions for these prescribed outcomes, retain strict primitive/security regressions and run required repository checks."
  },
  "open_questions": []
}
```

## PGB-166: Finish prescribed QA and authorized human rework

[PGB-166](https://scubapig.atlassian.net/browse/PGB-166)

### Problem to solve

QA and human request-rework consume historical handoffs but need current execution and PR proof. They must share the new current/history composition without recreating old QA context or repeating completed tests.

### Acceptance Criteria

- **AC1.** The existing QA route assembles current facts from canonical setup and completed prepared inputs, then preserves full case inventory, ordered helpers/children, expectations and final current proof.
- **AC2.** Partial, failed, not-run and human-pending results remain truthful; missing authority/prepared inputs or uncertain effects stop the affected action without helper/publication replay.
- **AC3.** Explicit human request-rework uses the current QA result and same open PR/current revision/evidence to retain all findings and queue once; discussion or missing authorization performs no write.

### Technical Acceptance Criteria

- **Repository:** https://github.com/danielchappell/Pigboard; base `main`.
- **Change boundary:** Finish prescribed QA and authorized human rework through the existing consumers and exact path forecast in the delivery plan.
- **TAC1.** Use PGB-161 current/assignment and PGB-160 ancestry at existing input, candidate, readback and final boundaries; human rework retains full current work/QA proof without reconstructing old execution contexts.
- **TAC2.** Invoke only the ticket’s approved installed qa-api, qa-bruno, qa-database and qa-ui contracts in their exact order; reviewer/QA consume prepared artifacts and never install, discover an environment, invent queries or change expectations.
- **TAC3.** Preserve original UUID/bytes, complete partial ledger and no replay; request-rework does not rerun QA, launch a worker, change the pointer, produce Blocked, mutate a child or access manager controls.

### Testing Strategy

All cases below are designated human acceptance and remain NOT_RUN. Developer regressions and contributor evidence are separate. The complete structured contract includes every prerequisite, preparation, case input, step, expected outcome, evidence and cleanup field.

#### PGB-166-H01

{
  "id": "PGB-166-H01",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC1",
    "AC2",
    "TAC1",
    "TAC2"
  ],
  "prerequisites": [
    "Prepared instruction/fixture harness for mixed qa-api→qa-bruno, database and UI dispatch, plus an all-human plan; current allowed artifacts/operations and old authenticated ancestry without old execution context."
  ],
  "steps": [
    "Drive the prescribed ordered cases through the existing QA route, including one observed FAIL and remaining human work.",
    "Inspect parent/child calls, complete ledger and final candidate/current proof."
  ],
  "expected": [
    "Every top-level step and API child executes only as prescribed; original expectations and finite schedules remain intact.",
    "FAIL, NOT_RUN and human_pending remain distinct and complete; all-human work is not dispatched or marked passed, and simulated helper responses are not live acceptance."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

#### PGB-166-H02

{
  "id": "PGB-166-H02",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC2",
    "TAC1",
    "TAC2",
    "TAC3"
  ],
  "prerequisites": [
    "Missing artifact/access/required environment, unsafe operation, changed work, expired prescribed deadline and unknown helper/publication outcome controls."
  ],
  "steps": [
    "Drive each control to the applicable action boundary.",
    "Inspect partial ledger, supported inability or local result and append/readback trace."
  ],
  "expected": [
    "No invented artifact, permission, query, environment or success repairs the gap; completed results remain preserved and remaining work is truthful.",
    "Unknown outcomes retain identity and stop without helper or publication replay; incomplete evidence is not automatically a product defect."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

#### PGB-166-H03

{
  "id": "PGB-166-H03",
  "execution": "human",
  "owner_role": "developer and human QA reviewer",
  "requirements": [
    "AC3",
    "TAC1",
    "TAC3"
  ],
  "prerequisites": [
    "Current QA result, same open PR/current revision/evidence and explicit human record-and-queue authorization; separate discussion-only, no-authorization, closed/changed PR, conflicting QA, already-queued and unknown-publication controls."
  ],
  "steps": [
    "Invoke existing request-rework for the authorized positive case and each isolated control.",
    "Inspect retained findings, exact candidate/readback and all attempted mutations."
  ],
  "expected": [
    "Only the eligible authorized case records all findings and queues once on the same open PR; controls refuse or hold truthfully.",
    "No QA rerun, worker launch, Blocked record, pointer/child change, manager action or uncertain-write replay occurs."
  ],
  "evidence": [
    "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
  ],
  "cleanup": {
    "mode": "prescribed",
    "reason": null,
    "owner": "human QA reviewer",
    "steps": [
      "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
    ]
  }
}

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "QA and human request-rework consume historical handoffs but need current execution and PR proof. They must share the new current/history composition without recreating old QA context or repeating completed tests.",
  "prerequisites": [
    {
      "ticket": "PGB-161",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The existing QA route assembles current facts from canonical setup and completed prepared inputs, then preserves full case inventory, ordered helpers/children, expectations and final current proof."
    },
    {
      "id": "AC2",
      "requirement": "Partial, failed, not-run and human-pending results remain truthful; missing authority/prepared inputs or uncertain effects stop the affected action without helper/publication replay."
    },
    {
      "id": "AC3",
      "requirement": "Explicit human request-rework uses the current QA result and same open PR/current revision/evidence to retain all findings and queue once; discussion or missing authorization performs no write."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Finish prescribed QA and authorized human rework through the existing consumers and exact path forecast in the delivery plan.",
      "out_of_scope": [
        "Customer repository changes, activation or deployment",
        "Context service, public phase framework, parallel preview generation or new permission source"
      ],
      "related_repositories": []
    },
    "accepted_decisions": [
      {
        "id": "D-ROLE",
        "decision": "Owner10906 assigns Pig Boss complete deterministic scheduling and recorded-proof checks; workers retain current applicable execution proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10906"
      },
      {
        "id": "D-PREP",
        "decision": "Director10909 permits in-stage current fact preparation from existing authority; only the implementer fills declared mechanical slots and every action requires its applicable proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10909"
      }
    ],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Use PGB-161 current/assignment and PGB-160 ancestry at existing input, candidate, readback and final boundaries; human rework retains full current work/QA proof without reconstructing old execution contexts."
      },
      {
        "id": "TAC2",
        "requirement": "Invoke only the ticket’s approved installed qa-api, qa-bruno, qa-database and qa-ui contracts in their exact order; reviewer/QA consume prepared artifacts and never install, discover an environment, invent queries or change expectations."
      },
      {
        "id": "TAC3",
        "requirement": "Preserve original UUID/bytes, complete partial ledger and no replay; request-rework does not rerun QA, launch a worker, change the pointer, produce Blocked, mutate a child or access manager controls."
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
        "description": "Finite isolated fixtures for every control stated in this ticket; all other facts are valid and no earlier-priority work exists.",
        "initial_state": "Fresh per control unless an ordered sequence is explicit; provider/model/helper outputs are simulated and credentials dummy.",
        "reference": null,
        "preparation_id": "PREP-01",
        "owner": "implementer"
      }
    ],
    "preparation": [
      {
        "id": "PREP-01",
        "owner": "implementer",
        "supplies": "Executable fixtures and exact source/copied commands or instruction invocations for the prescribed cases, bound to the reviewed PR revision.",
        "used_by": [
          "DATA-01",
          "PGB-166-H01",
          "PGB-166-H02",
          "PGB-166-H03"
        ],
        "preserves": [
          "All prescribed inputs, ordering, expectations, evidence and cleanup; no invented authority, capability or live result."
        ]
      }
    ],
    "dispatch_order": [],
    "cases": [],
    "human_review": {
      "no_ai_cases_reason": "Acceptance concerns CLI and instruction contracts that the approved API/database/UI helpers do not execute; designated human reviewers run these cases. Developer regression and contributor QA evidence are separate.",
      "cases": [
        {
          "id": "PGB-166-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Prepared instruction/fixture harness for mixed qa-api→qa-bruno, database and UI dispatch, plus an all-human plan; current allowed artifacts/operations and old authenticated ancestry without old execution context."
          ],
          "steps": [
            "Drive the prescribed ordered cases through the existing QA route, including one observed FAIL and remaining human work.",
            "Inspect parent/child calls, complete ledger and final candidate/current proof."
          ],
          "expected": [
            "Every top-level step and API child executes only as prescribed; original expectations and finite schedules remain intact.",
            "FAIL, NOT_RUN and human_pending remain distinct and complete; all-human work is not dispatched or marked passed, and simulated helper responses are not live acceptance."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        },
        {
          "id": "PGB-166-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Missing artifact/access/required environment, unsafe operation, changed work, expired prescribed deadline and unknown helper/publication outcome controls."
          ],
          "steps": [
            "Drive each control to the applicable action boundary.",
            "Inspect partial ledger, supported inability or local result and append/readback trace."
          ],
          "expected": [
            "No invented artifact, permission, query, environment or success repairs the gap; completed results remain preserved and remaining work is truthful.",
            "Unknown outcomes retain identity and stop without helper or publication replay; incomplete evidence is not automatically a product defect."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        },
        {
          "id": "PGB-166-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "TAC1",
            "TAC3"
          ],
          "prerequisites": [
            "Current QA result, same open PR/current revision/evidence and explicit human record-and-queue authorization; separate discussion-only, no-authorization, closed/changed PR, conflicting QA, already-queued and unknown-publication controls."
          ],
          "steps": [
            "Invoke existing request-rework for the authorized positive case and each isolated control.",
            "Inspect retained findings, exact candidate/readback and all attempted mutations."
          ],
          "expected": [
            "Only the eligible authorized case records all findings and queues once on the same open PR; controls refuse or hold truthfully.",
            "No QA rerun, worker launch, Blocked record, pointer/child change, manager action or uncertain-write replay occurs."
          ],
          "evidence": [
            "Tested revision/pin, exact prepared commands or invocation, sanitized ordered action/result audit and observed outcome for each named control; label simulated and actual evidence separately."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        }
      ]
    },
    "automated_regression": "Update affected source/copied integration or instruction-contract regressions for these prescribed outcomes, retain strict primitive/security regressions and run required repository checks."
  },
  "open_questions": []
}
```

## R1-12: Preview current Jira work with bounded reads

[PGB-82](https://scubapig.atlassian.net/browse/PGB-82)

### Problem to solve

Offline decisions are useful only if the operator can compare them with complete current Jira facts. Filtered searches must not make occupied work disappear.

### Acceptance Criteria

- **AC1.** One canonical configuration supplies site/projects, repositories, native mappings, actors, labels, bounds and secret references; work text cannot override it.
- **AC2.** The live read-only preview gathers complete bounded pages, unions current membership/dependencies/lineage with supplied retained IDs and fresh-reads each known issue.
- **AC3.** Missing pages, denied/deleted IDs, changed membership or exhausted budgets yield precise incomplete/hold results rather than empty availability.
- **AC4.** It resolves typed receipts through the supported provider representation and shows selections without writing Jira or operational state.
- **AC5.** Live preview resolves each project mapping and allowed cross-project prerequisites; project identity uses immutable IDs and incomplete shared inventory never yields free capacity.
- **AC-ROLE1.** The live preview composes complete scheduling declarations and recorded proof against exact current native/configured/retained identity, explicitly reporting that worker execution and external PR freshness were not checked.

### Technical Acceptance Criteria

- **TAC1.** Own Jira read adapter/config validation; retained IDs are supplied through the state interface when installed, not an editable second customer configuration.
- **TAC2.** Use configured HTTPS origins, verified TLS, bounded time/requests and no credential-bearing redirects; logs/diagnostics exclude secrets and ticket contents.
- **TAC3.** Initial operator verification of complete service-account visibility is a prerequisite; searches cannot prove unseen issues do not exist.
- **TAC-ROLE1.** Use the selected supported package/configuration and snapshot v2 profile without manager execution-context or external PR/evidence prerequisites; retain complete native lineage, retained identity and uncertainty guards.
- **TAC-ROLE2.** Publish supported initial defaults from the prescribed finite source/copied fixture evidence, including count/byte/time bounds and limits; do not claim every parser maximum or a live customer environment is supported.

### Testing Strategy

Human acceptance remains NOT_RUN. AI cases: zero.

#### R1-12-H01

- R1-12-H01
- human
- developer and human QA reviewer
- AC1
- AC2
- AC4
- TAC1
- TAC3
- Recorded authorized Jira REST fixture pages and known IDs, including Human Review/Blocked work omitted by a ready-only search; token is a dummy test value.
- Run against the scripted HTTP fixture server with canonical test config.
- Inspect exact known-ID/comment reads and decision.
- Complete pages and fresh known IDs used; full occupancy retained; zero write calls and matching offline decision.
- command/output transcript and fixture before/after diff; tested PR revision and exact command.
- prescribed
- human QA reviewer
- Retain evidence then remove disposable local fixtures/build output; do not change live records/resources.

#### R1-12-H02

- R1-12-H02
- human
- developer and human QA reviewer
- AC2
- AC3
- TAC3
- Missing page, 403/404, rate limit, response timeout, relabelled known ticket and exceeded request/time/count fixtures.
- Run each fixture through preview.
- Inspect scope/diagnostic and call count.
- No fabricated free stream, no retries beyond the explicit read budget, no writes; shared unknown holds entire scan.
- command/output transcript and fixture before/after diff; tested PR revision and exact command.
- prescribed
- human QA reviewer
- Retain evidence then remove disposable local fixtures/build output; do not change live records/resources.

#### R1-12-H03

- R1-12-H03
- human
- developer and human QA reviewer
- AC1
- TAC2
- Unauthorized project/repository, credential URL, redirected request and deliberately secret-bearing provider error.
- Validate config and run each blocked transport fixture.
- Search output for the dummy secret and customer body.
- Invalid destination denied before credential send; no sensitive values in output.
- redacted transport audit and output inspection; tested PR revision and exact command.
- prescribed
- human QA reviewer
- Retain evidence then remove disposable local fixtures/build output; do not change live records/resources.

#### R1-12-H04

- R1-12-H04
- human
- developer and human QA reviewer
- AC5
- Two project IDs with different status/type mappings, equal labels, a cross-project prerequisite, renamed key, denied-project and isolated-stream-conflict variants.
- Current PR checkout; prepared local simulated provider data; no live customer actions.
- Preview all variants through the simulated Jira adapter.
- Compare mapped stages, dependency results, native IDs and mutation trace.
- Correct mapping and prerequisite checks across projects; key rename preserves identity; known isolated conflict holds only affected scope; denied project with unknown shared impact holds all writes; no preview mutations.
- Tested PR revision, exact prepared commands/fixtures and sanitized outputs.
- prescribed
- human QA reviewer
- Retain evidence then remove disposable fixture/build output; no live changes.

#### R1-12-H05

- R1-12-H05
- human
- developer and human QA reviewer
- AC-ROLE1
- TAC-ROLE1
- TAC-ROLE2
- Original H01–H04 fixture packet plus complete mixed/all-human scheduling and recorded repair inputs from PGB-163 without manager execution context or external PR observations.
- Independent PGB-162 expected decisions; isolated current-requirement/root/mixed-profile failures and hidden external-change-only control.
- Run the source and installed live preview and compare with the prescribed offline decisions.
- Run each role control and the candidate initial-default profile against this same finite packet; inspect count/byte/time limits and evidence.
- Valid complete inputs match offline selections without writes; changed relevant proof holds and mixed profiles reject. Hidden external changes are not claimed detected or execution-ready.
- Supported initial defaults name the verified finite envelope and bounds; the result claims neither support for every parser maximum nor untested live customer acceptance.
- Exact tested revision/pin, prepared commands, sanitized source/copied/offline comparison and bounded count/byte/time results; separate simulated from actual evidence.
- prescribed
- human QA reviewer
- Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Offline decisions are useful only if the operator can compare them with complete current Jira facts. Filtered searches must not make occupied work disappear.",
  "prerequisites": [
    {
      "ticket": "R1-11",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-21",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-31",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-34",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "PGB-162",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "PGB-163",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "One canonical configuration supplies site/projects, repositories, native mappings, actors, labels, bounds and secret references; work text cannot override it."
    },
    {
      "id": "AC2",
      "requirement": "The live read-only preview gathers complete bounded pages, unions current membership/dependencies/lineage with supplied retained IDs and fresh-reads each known issue."
    },
    {
      "id": "AC3",
      "requirement": "Missing pages, denied/deleted IDs, changed membership or exhausted budgets yield precise incomplete/hold results rather than empty availability."
    },
    {
      "id": "AC4",
      "requirement": "It resolves typed receipts through the supported provider representation and shows selections without writing Jira or operational state."
    },
    {
      "id": "AC5",
      "requirement": "Live preview resolves each project mapping and allowed cross-project prerequisites; project identity uses immutable IDs and incomplete shared inventory never yields free capacity."
    },
    {
      "id": "AC-ROLE1",
      "requirement": "The live preview composes complete scheduling declarations and recorded proof against exact current native/configured/retained identity, explicitly reporting that worker execution and external PR freshness were not checked."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own Jira read adapter/config validation; retained IDs are supplied through the state interface when installed, not an editable second customer configuration.",
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
      },
      {
        "id": "D-ROLE",
        "decision": "Owner10906 assigns Pig Boss complete deterministic scheduling and recorded-proof checks; workers retain current applicable execution proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10906"
      },
      {
        "id": "D-PREP",
        "decision": "Director10909 permits in-stage current fact preparation from existing authority; only the implementer fills declared mechanical slots and every action requires its applicable proof.",
        "reference": "https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10909"
      }
    ],
    "constraints": [
      {
        "id": "TAC1",
        "requirement": "Own Jira read adapter/config validation; retained IDs are supplied through the state interface when installed, not an editable second customer configuration."
      },
      {
        "id": "TAC2",
        "requirement": "Use configured HTTPS origins, verified TLS, bounded time/requests and no credential-bearing redirects; logs/diagnostics exclude secrets and ticket contents."
      },
      {
        "id": "TAC3",
        "requirement": "Initial operator verification of complete service-account visibility is a prerequisite; searches cannot prove unseen issues do not exist."
      },
      {
        "id": "TAC-ROLE1",
        "requirement": "Use the selected supported package/configuration and snapshot v2 profile without manager execution-context or external PR/evidence prerequisites; retain complete native lineage, retained identity and uncertainty guards."
      },
      {
        "id": "TAC-ROLE2",
        "requirement": "Publish supported initial defaults from the prescribed finite source/copied fixture evidence, including count/byte/time bounds and limits; do not claim every parser maximum or a live customer environment is supported."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-12-H01",
          "R1-12-H02",
          "R1-12-H03",
          "R1-12-H04",
          "R1-12-H05"
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
          "id": "R1-12-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC4",
            "TAC1",
            "TAC3"
          ],
          "prerequisites": [
            "Recorded authorized Jira REST fixture pages and known IDs, including Human Review/Blocked work omitted by a ready-only search; token is a dummy test value."
          ],
          "steps": [
            "Run against the scripted HTTP fixture server with canonical test config.",
            "Inspect exact known-ID/comment reads and decision."
          ],
          "expected": [
            "Complete pages and fresh known IDs used; full occupancy retained; zero write calls and matching offline decision."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-12-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "TAC3"
          ],
          "prerequisites": [
            "Missing page, 403/404, rate limit, response timeout, relabelled known ticket and exceeded request/time/count fixtures."
          ],
          "steps": [
            "Run each fixture through preview.",
            "Inspect scope/diagnostic and call count."
          ],
          "expected": [
            "No fabricated free stream, no retries beyond the explicit read budget, no writes; shared unknown holds entire scan."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-12-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "TAC2"
          ],
          "prerequisites": [
            "Unauthorized project/repository, credential URL, redirected request and deliberately secret-bearing provider error."
          ],
          "steps": [
            "Validate config and run each blocked transport fixture.",
            "Search output for the dummy secret and customer body."
          ],
          "expected": [
            "Invalid destination denied before credential send; no sensitive values in output."
          ],
          "evidence": [
            "redacted transport audit and output inspection; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-12-H04",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC5"
          ],
          "prerequisites": [
            "Two project IDs with different status/type mappings, equal labels, a cross-project prerequisite, renamed key, denied-project and isolated-stream-conflict variants.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions."
          ],
          "steps": [
            "Preview all variants through the simulated Jira adapter.",
            "Compare mapped stages, dependency results, native IDs and mutation trace."
          ],
          "expected": [
            "Correct mapping and prerequisite checks across projects; key rename preserves identity; known isolated conflict holds only affected scope; denied project with unknown shared impact holds all writes; no preview mutations."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        },
        {
          "id": "R1-12-H05",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC-ROLE1",
            "TAC-ROLE1",
            "TAC-ROLE2"
          ],
          "prerequisites": [
            "Original H01–H04 fixture packet plus complete mixed/all-human scheduling and recorded repair inputs from PGB-163 without manager execution context or external PR observations.",
            "Independent PGB-162 expected decisions; isolated current-requirement/root/mixed-profile failures and hidden external-change-only control."
          ],
          "steps": [
            "Run the source and installed live preview and compare with the prescribed offline decisions.",
            "Run each role control and the candidate initial-default profile against this same finite packet; inspect count/byte/time limits and evidence."
          ],
          "expected": [
            "Valid complete inputs match offline selections without writes; changed relevant proof holds and mixed profiles reject. Hidden external changes are not claimed detected or execution-ready.",
            "Supported initial defaults name the verified finite envelope and bounds; the result claims neither support for every parser maximum nor untested live customer acceptance."
          ],
          "evidence": [
            "Exact tested revision/pin, prepared commands, sanitized source/copied/offline comparison and bounded count/byte/time results; separate simulated from actual evidence."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain sanitized evidence, then remove only disposable local fixtures/build output; do not alter live records or shared setup."
            ]
          }
        }
      ]
    },
    "automated_regression": "HTTP-fixture integration tests for complete inventory, fresh reads, request budgets and credential boundaries."
  },
  "open_questions": []
}
```

## R1-13: Install a disabled AWS preview

[PGB-83](https://scubapig.atlassian.net/browse/PGB-83)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "A company needs to run the preview in its own AWS account without giving Scuba Pig access. Installation should derive resources from one configuration.",
  "prerequisites": [
    {
      "ticket": "R1-12",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "A packaged customer-owned Lambda runs the same preview with the canonical configuration and customer secret reference; installation starts disabled and write-free."
    },
    {
      "id": "AC2",
      "requirement": "Generated outputs identify the function, schedule, log group and state binding without asking the operator to duplicate configuration."
    },
    {
      "id": "AC3",
      "requirement": "The package has no public endpoint, vendor trust, telemetry or runtime source download; operator invocation and scheduler/runtime/deployer roles are distinct."
    },
    {
      "id": "AC4",
      "requirement": "The guide provides install, preview and stop steps with bounded invocation/read/log retention settings and explains real Jira permission limits."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own AWS wrapper/IaC/package scripts; keep policy/Jira/core state interfaces free of AWS imports.",
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
        "requirement": "Own AWS wrapper/IaC/package scripts; keep policy/Jira/core state interfaces free of AWS imports."
      },
      {
        "id": "TAC2",
        "requirement": "Create one reserved-concurrency-one function and disabled schedule; disable event/function mutation replay settings and validate effective configuration before apply can be supported."
      },
      {
        "id": "TAC3",
        "requirement": "Runtime IAM names only this installation’s configured secret, log group and state resource; scheduler may invoke only its function. No resource deployment occurs as part of editing this Story."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-13-H01",
          "R1-13-H02"
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
          "id": "R1-13-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1"
          ],
          "prerequisites": [
            "Disposable build directory; canonical fixture config and simulated AWS/Jira adapters, no account credentials."
          ],
          "steps": [
            "Package the pinned source.",
            "Invoke the wrapper in preview with fixture adapters.",
            "Inspect generated outputs and compare the policy result."
          ],
          "expected": [
            "Same preview result, no writes, no moving-source fetch, one derived configuration."
          ],
          "evidence": [
            "package manifest, generated outputs and invocation audit; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-13-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "AC4",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Generated infrastructure template and allow/deny policy fixtures."
          ],
          "steps": [
            "Inspect schedule/function retries, concurrency, retention and disabled defaults.",
            "Run positive/negative permission checks for intended and unrelated resources.",
            "Follow the documented preview/stop journey in the fixture harness."
          ],
          "expected": [
            "Disabled default, no public/vendor access, bounded settings, intended calls allowed and unrelated ones denied; live IAM remains installed acceptance."
          ],
          "evidence": [
            "template/policy checks and operator walkthrough notes; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Package/wrapper tests, synthesized IAM allow/deny checks and disabled scheduling configuration checks."
  },
  "open_questions": []
}
```

## R1-14: Inspect durable scheduling state

[PGB-84](https://scubapig.atlassian.net/browse/PGB-84)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Operators need to see retained stream ownership and attempts without storing ticket content. The manager needs conditional state operations that survive failed or overlapping writes.",
  "prerequisites": [
    {
      "ticket": "R1-13",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The customer can initialize a disabled installation, inspect its four record kinds and see pending attempts/retained membership with sanitized diagnostics."
    },
    {
      "id": "AC2",
      "requirement": "The state adapter passes an executable contract suite for atomic begin/finalize, revision conflicts, unknown writes and retained history."
    },
    {
      "id": "AC3",
      "requirement": "A stale caller cannot clear another pending attempt; required member identities persist before a consumer may perform a Jira side effect."
    },
    {
      "id": "AC4",
      "requirement": "Read-only preview can consume retained IDs without changing state; no TTL unlock, automatic history/member retirement or replacement empty table is offered."
    },
    {
      "id": "AC5",
      "requirement": "Saved stream, member and attempt identities include site and immutable project ID; project moves/removal retain old occupancy and unresolved intent."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own cloud-neutral state interface, DynamoDB adapter and operator inspect/init command; use installation, stream, attempt and member records only.",
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
        "requirement": "Own cloud-neutral state interface, DynamoDB adapter and operator inspect/init command; use installation, stream, attempt and member records only."
      },
      {
        "id": "TAC2",
        "requirement": "Atomic begin creates attempt plus pending stream reference; atomic finalize records that outcome and clears only its matching reference. Read coupled safety facts consistently."
      },
      {
        "id": "TAC3",
        "requirement": "Store IDs, versions and evidence references/metadata, not code, descriptions, full provider bodies or transcripts. Retain table on replacement/deletion."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-14-H01",
          "R1-14-H02",
          "R1-14-H03"
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
          "id": "R1-14-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC4",
            "TAC1",
            "TAC3"
          ],
          "prerequisites": [
            "Disposable state emulator fixture and canonical installation identity; known member labels later change."
          ],
          "steps": [
            "Initialize while disabled.",
            "Record fixture history through the adapter contract driver.",
            "Inspect state and run a preview using retained IDs."
          ],
          "expected": [
            "Four kinds readable, old member identity retained, preview makes no writes, no ticket contents stored."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-14-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "TAC2"
          ],
          "prerequisites": [
            "Two competing expected revisions, injected transaction timeout/partial failure and stale finalizer."
          ],
          "steps": [
            "Run both begin attempts.",
            "Inject each fault before/after provider persistence.",
            "Finalize from matching and stale callers; inspect all items."
          ],
          "expected": [
            "At most one conditional winner; no partially committed coupled transaction; unknown persistence grants no Jira authority; stale finalizer cannot clear current pending reference."
          ],
          "evidence": [
            "state before/after, structured adapter outcomes and transaction-call audit; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-14-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC5"
          ],
          "prerequisites": [
            "Same label in two projects, pending attempt in A, key rename, issue move and project-removal snapshots.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions."
          ],
          "steps": [
            "Inspect both streams.",
            "Apply the metadata/configuration changes to fixture observations and inspect again.",
            "Attempt a stale cross-project completion using the state contract harness."
          ],
          "expected": [
            "Records never collide; rename preserves IDs; move/removal does not free old capacity or erase intent; stale completion is rejected and affected scope remains held."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        }
      ]
    },
    "automated_regression": "Executable state-adapter conformance suite with atomicity, stale caller, uncertain persistence and retention cases."
  },
  "open_questions": []
}
```

## R1-29: Retain and inspect original transition proof

[PGB-137](https://scubapig.atlassian.net/browse/PGB-137)

### Problem to solve

An uncertain Jira transition cannot be settled safely from its current status or history alone. The manager needs to retain the exact request and its original response so an operator can inspect what is known without repeating the request.

### Acceptance Criteria

- **AC1.** A trusted writer can retain a verified publication reference and prepare one transition capture for the matching pending attempt; inspection shows its identity, request commitment and whether a response was received.
- **AC2.** A trusted writer can save the original completed response once, and inspection after restart preserves it without changing the pending outcome or calling Jira.
- **AC3.** Stale revisions, changed references, duplicate capture or response, disabled writer controls and exceeded record limits cannot overwrite proof or grant permission to send again; uncertain persistence remains explicit.

### Technical Acceptance Criteria

- **TAC1.** Use the existing four-record v1 store, ten agreed scalar capture keys and conditional installation, stream and attempt revisions; preserve unrelated fields within the existing 16-key and 32 KiB limits.
- **TAC2.** Retain verified publication before pointer publication, then prepare capture before sending; bind the exact transition request and publication observations to the immutable attempt identity, and save only its original response.
- **TAC3.** Do not add a store, raw request or response bodies, imported operator proof, a send/retry command, or a finalization bypass; missing or unsupported proof stays distinguishable from rejection.

### Testing Strategy

Human acceptance remains NOT_RUN. AI cases: zero.

#### R1-29-H01

- human
- developer and human QA reviewer
- Command/output transcript, exact tested PR revision, fixture before/after state and provider call audit.
- prescribed
- human QA reviewer
- Retain evidence then remove disposable local fixtures/build output; do not change live records/resources.
- R1-29-H01
- AC1
- AC2
- TAC1
- TAC2
- Two fresh pending-attempt fixtures with verified publication observations, dummy credentials and simulated providers; final inspection uses the actual PGB-83/84 composition.
- Implementer supplies exact local driver commands and fixture inputs bound to the PR revision.
- Retain the verified publication reference and prepare capture.
- Inspect prepared-only state, then record the original 204 response in one fixture and 409 in the other.
- Restart and inspect readable and JSON output.
- Matching proof is retained once; the same attempt and outcome remain pending; unrelated fields are preserved.
- Zero Jira mutations or worker calls; prepared-only and completed-response states are distinguishable.

#### R1-29-H02

- human
- developer and human QA reviewer
- Command/output transcript, exact tested PR revision, fixture before/after state and provider call audit.
- prescribed
- human QA reviewer
- Retain evidence then remove disposable local fixtures/build output; do not change live records/resources.
- R1-29-H02
- AC3
- TAC1
- TAC2
- TAC3
- Fresh fixture per variant: stale revision, changed retained reference, duplicate preparation, duplicate response, disabled writer controls, exceeded extension capacity, exceeded record-size limit, and persistence failure before or after a write.
- Run each prescribed operation once.
- Restart and inspect the same attempt and provider audit.
- Conflicts or bounded failures cannot overwrite proof.
- Uncertain writes may be absent or durably present; neither result authorizes resending or finalizes the pending attempt.
- No live records, Jira mutations or worker calls.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "An uncertain Jira transition cannot be settled safely from its current status or history alone. The manager needs to retain the exact request and its original response so an operator can inspect what is known without repeating the request.",
  "prerequisites": [
    {
      "ticket": "R1-14",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "A trusted writer can retain a verified publication reference and prepare one transition capture for the matching pending attempt; inspection shows its identity, request commitment and whether a response was received."
    },
    {
      "id": "AC2",
      "requirement": "A trusted writer can save the original completed response once, and inspection after restart preserves it without changing the pending outcome or calling Jira."
    },
    {
      "id": "AC3",
      "requirement": "Stale revisions, changed references, duplicate capture or response, disabled writer controls and exceeded record limits cannot overwrite proof or grant permission to send again; uncertain persistence remains explicit."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own original transition-proof persistence and inspection in the production state adapter, bounded attempt contract, local conformance driver and guide; PGB-85 owns reconciliation and PGB-87 owns the future Jira sender.",
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
        "requirement": "Use the existing four-record v1 store, ten agreed scalar capture keys and conditional installation, stream and attempt revisions; preserve unrelated fields within the existing 16-key and 32 KiB limits."
      },
      {
        "id": "TAC2",
        "requirement": "Retain verified publication before pointer publication, then prepare capture before sending; bind the exact transition request and publication observations to the immutable attempt identity, and save only its original response."
      },
      {
        "id": "TAC3",
        "requirement": "Do not add a store, raw request or response bodies, imported operator proof, a send/retry command, or a finalization bypass; missing or unsupported proof stays distinguishable from rejection."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-29-H01",
          "R1-29-H02"
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
          "evidence": [
            "Command/output transcript, exact tested PR revision, fixture before/after state and provider call audit."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          },
          "id": "R1-29-H01",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Two fresh pending-attempt fixtures with verified publication observations, dummy credentials and simulated providers; final inspection uses the actual PGB-83/84 composition.",
            "Implementer supplies exact local driver commands and fixture inputs bound to the PR revision."
          ],
          "steps": [
            "Retain the verified publication reference and prepare capture.",
            "Inspect prepared-only state, then record the original 204 response in one fixture and 409 in the other.",
            "Restart and inspect readable and JSON output."
          ],
          "expected": [
            "Matching proof is retained once; the same attempt and outcome remain pending; unrelated fields are preserved.",
            "Zero Jira mutations or worker calls; prepared-only and completed-response states are distinguishable."
          ]
        },
        {
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "evidence": [
            "Command/output transcript, exact tested PR revision, fixture before/after state and provider call audit."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          },
          "id": "R1-29-H02",
          "requirements": [
            "AC3",
            "TAC1",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Fresh fixture per variant: stale revision, changed retained reference, duplicate preparation, duplicate response, disabled writer controls, exceeded extension capacity, exceeded record-size limit, and persistence failure before or after a write."
          ],
          "steps": [
            "Run each prescribed operation once.",
            "Restart and inspect the same attempt and provider audit."
          ],
          "expected": [
            "Conflicts or bounded failures cannot overwrite proof.",
            "Uncertain writes may be absent or durably present; neither result authorizes resending or finalizes the pending attempt.",
            "No live records, Jira mutations or worker calls."
          ]
        }
      ]
    },
    "automated_regression": "Production-adapter and command tests for exact request/publication binding, one-time persistence, revision fences, record limits and inspect-after-uncertainty behavior."
  },
  "open_questions": []
}
```

## R1-15: Reconcile an uncertain attempt with evidence

[PGB-85](https://scubapig.atlassian.net/browse/PGB-85)

### Problem to solve

An uncertain Jira effect must not be replayed automatically. Operators need a supported way to inspect and settle only outcomes they can positively prove.

### Acceptance Criteria

- **AC1.** While admission is disabled and invocations drained, an operator can inspect the exact attempt and submit positive evidence for applied or proved-rejected outcome.
- **AC2.** A matching evidence chain conditionally finalizes that attempt without any Jira transition, pointer rollback or worker launch.
- **AC3.** Elapsed time, current status, absent history, conflicting evidence or an enabled/non-drained installation cannot clear a hold. Unknown stays held, including across restart.

### Technical Acceptance Criteria

- **TAC1.** Own evidence-only reconciliation command and policy; reuse exact receipts and state contract.
- **TAC2.** Require the supported disposition/evidence schema, observed state revision and operator identity; no force-success, general unlock, automatic retry or membership-transfer command.
- **TAC3.** Document that draining cannot cancel an already-sent provider request and some ambiguous attempts cannot safely resume in this release.

### Testing Strategy

Human acceptance remains NOT_RUN. AI cases: zero.

#### R1-15-H01

- R1-15-H01
- human
- developer and human QA reviewer
- AC1
- AC2
- TAC1
- TAC2
- Disabled/drained fixture with confirmed-applied chain and separate proved-rejected provider receipt.
- Inspect the named attempt.
- Submit its matching evidence and expected revision.
- Inspect final state and provider call audit.
- Only the named attempt finalized; history retained; zero Jira mutations or worker calls.
- command/output transcript and fixture before/after diff; tested PR revision and exact command.
- prescribed
- human QA reviewer
- Retain evidence then remove disposable local fixtures/build output; do not change live records/resources.

#### R1-15-H02

- R1-15-H02
- human
- developer and human QA reviewer
- AC3
- TAC2
- TAC3
- Variants with enabled runtime, in-flight invocation, unknown/lost response, absent history, stale revision, wrong actor or changed pointer.
- Attempt reconciliation for each variant.
- Restart/reinspect the state.
- Every unsupported/conflicting case remains held with an actionable reason; no timer-based or blind unlock.
- command/output transcript and fixture before/after diff; tested PR revision and exact command.
- prescribed
- human QA reviewer
- Retain evidence then remove disposable local fixtures/build output; do not change live records/resources.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "An uncertain Jira effect must not be replayed automatically. Operators need a supported way to inspect and settle only outcomes they can positively prove.",
  "prerequisites": [
    {
      "ticket": "R1-12",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-14",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-29",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "While admission is disabled and invocations drained, an operator can inspect the exact attempt and submit positive evidence for applied or proved-rejected outcome."
    },
    {
      "id": "AC2",
      "requirement": "A matching evidence chain conditionally finalizes that attempt without any Jira transition, pointer rollback or worker launch."
    },
    {
      "id": "AC3",
      "requirement": "Elapsed time, current status, absent history, conflicting evidence or an enabled/non-drained installation cannot clear a hold. Unknown stays held, including across restart."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own evidence-only reconciliation command and policy; reuse exact receipts and state contract.",
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
        "requirement": "Own evidence-only reconciliation command and policy; reuse exact receipts and state contract."
      },
      {
        "id": "TAC2",
        "requirement": "Require the supported disposition/evidence schema, observed state revision and operator identity; no force-success, general unlock, automatic retry or membership-transfer command."
      },
      {
        "id": "TAC3",
        "requirement": "Document that draining cannot cancel an already-sent provider request and some ambiguous attempts cannot safely resume in this release."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-15-H01",
          "R1-15-H02"
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
          "id": "R1-15-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Disabled/drained fixture with confirmed-applied chain and separate proved-rejected provider receipt."
          ],
          "steps": [
            "Inspect the named attempt.",
            "Submit its matching evidence and expected revision.",
            "Inspect final state and provider call audit."
          ],
          "expected": [
            "Only the named attempt finalized; history retained; zero Jira mutations or worker calls."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-15-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Variants with enabled runtime, in-flight invocation, unknown/lost response, absent history, stale revision, wrong actor or changed pointer."
          ],
          "steps": [
            "Attempt reconciliation for each variant.",
            "Restart/reinspect the state."
          ],
          "expected": [
            "Every unsupported/conflicting case remains held with an actionable reason; no timer-based or blind unlock."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Operator command tests proving positive-only conditional reconciliation and persistence of unknown outcomes."
  },
  "open_questions": []
}
```

## R1-16: Upgrade and remove the AWS installation safely

[PGB-86](https://scubapig.atlassian.net/browse/PGB-86)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "A customer must be able to upgrade, stop or remove Pigboard without losing unresolved work. Restored or incompatible state cannot silently regain write authority.",
  "prerequisites": [
    {
      "ticket": "R1-14",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-15",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "A compatible pinned upgrade preserves canonical configuration, retained members/history and pending attempts."
    },
    {
      "id": "AC2",
      "requirement": "Rollback, restore or incompatible versions keep writes disabled until compatibility/reconciliation checks succeed; unsupported state is not silently migrated."
    },
    {
      "id": "AC3",
      "requirement": "Stop disables scheduling and prevents new writes while documenting bounded drain; removal retains the table and reports retained secrets/logs/resources and costs."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own lifecycle checks and existing package/operator commands; version configuration, work and state separately.",
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
        "requirement": "Own lifecycle checks and existing package/operator commands; version configuration, work and state separately."
      },
      {
        "id": "TAC2",
        "requirement": "No migration engine, data export/retirement, automatic permission change or Cursor cancellation. Preserve unresolved work across generated resource updates."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-16-H01",
          "R1-16-H02"
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
          "id": "R1-16-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1"
          ],
          "prerequisites": [
            "Installed-package fixture with pending attempt and retained member; compatible and incompatible pinned versions."
          ],
          "steps": [
            "Run upgrade preview and apply in the deployment harness.",
            "Attempt incompatible rollback and restored-state enable.",
            "Inspect preserved items/config and write settings."
          ],
          "expected": [
            "Compatible change preserves state; unsafe version/restore cannot write and explains required reconciliation."
          ],
          "evidence": [
            "deployment diff, state snapshots and command output; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-16-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "TAC2"
          ],
          "prerequisites": [
            "Enabled scheduler fixture plus bounded active invocation and retained resources."
          ],
          "steps": [
            "Run stop and inspect drain status.",
            "Preview then execute removal in the deployment harness.",
            "Inspect retained resources/output."
          ],
          "expected": [
            "No new writes/schedule; no claim to cancel sent requests or Cursor; table retained and remaining resources/costs disclosed."
          ],
          "evidence": [
            "lifecycle audit and removal report; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Deployment lifecycle tests for disabled rollback/restore, state preservation, drain and retained-resource removal."
  },
  "open_questions": []
}
```

## R1-22: Inspect Pig Boss operating health

[PGB-100](https://scubapig.atlassian.net/browse/PGB-100)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Operators cannot tell whether Pig Boss has finished its scans or is nearing its limits. A workstream waiting for a human must not look like a broken manager.",
  "prerequisites": [
    {
      "ticket": "R1-13",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-14",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-21",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The scan wrapper emits sanitized versioned summaries and embedded metrics for complete, incomplete and failed scans, including budget use and separate work holds."
    },
    {
      "id": "AC2",
      "requirement": "A read-only command provides readable and JSON disabled/starting/healthy/degraded/stale/unknown results, evidence timestamps and AWS links with the documented exit codes."
    },
    {
      "id": "AC3",
      "requirement": "Evidence belongs to the current code/configuration/enablement revision; missing telemetry and failed reads never become healthy, and desired/actual mismatch is degraded."
    },
    {
      "id": "AC4",
      "requirement": "Output explains capacity warnings and safe next steps without starting a scan, modifying Jira/state or claiming worker health."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own portable scan-summary and health evaluation, AWS logging/metrics adapter and read-only inspection CLI using the existing customer log group.",
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
        "requirement": "Own portable scan-summary and health evaluation, AWS logging/metrics adapter and read-only inspection CLI using the existing customer log group."
      },
      {
        "id": "TAC2",
        "requirement": "Follow docs/architecture/pig-boss-operations.md for fields, state precedence, freshness, fixed metric dimensions and maximum-based signal interpretation; no second state store."
      },
      {
        "id": "TAC3",
        "requirement": "Read-only operator permissions cover only needed configuration, logs, metrics and alarm observations; log no bodies/secrets/raw errors. Runtime uses its existing log-write scope."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-22-H01",
          "R1-22-H02",
          "R1-22-H03",
          "R1-22-H04"
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
          "id": "R1-22-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC4",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Complete empty scan, five-ticket wait, retained-uncertainty hold and 80-percent budget fixture.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions."
          ],
          "steps": [
            "Run scans in the local wrapper harness.",
            "Run health command on recorded observations.",
            "Inspect every required scan-summary field, fixed metric dimensions and duplicate completion points; verify maximum-based signal interpretation."
          ],
          "expected": [
            "Empty/business-held scans remain complete with holds shown; capacity warning is degraded; no worker health or second scan is inferred.",
            "All versioned summary fields and budget bounds are present; no ticket/stream metric dimension; duplicate points never inflate exact run counts."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        },
        {
          "id": "R1-22-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "TAC2"
          ],
          "prerequisites": [
            "Old success, recent failed scan, missing completion after crash, denied telemetry read and no first completion fixtures.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions.",
            "Overlap fixtures: desired/observed disabled plus old success; expired success plus recent failure; failed first scan before/after expiry; schedule mismatch plus stale data; unreadable telemetry plus disabled intent; exact freshness boundary."
          ],
          "steps": [
            "Evaluate before and after freshness deadline with a controlled clock.",
            "Inspect JSON states and exit codes.",
            "Evaluate every overlapping-condition fixture using the ordered health decision table, including exactly at and just beyond the freshness boundary."
          ],
          "expected": [
            "Stale/failed/unknown/starting are distinct; missing or unreadable evidence is never healthy; command makes zero mutation calls.",
            "First matching state follows unknown, schedule mismatch, intentional disabled, stale, current degraded, starting, healthy. Disabled plus old data stays disabled; expired success plus new failure is stale with failure retained as a secondary reason; a failed first scan is degraded before expiry and stale afterward; missing reads win as unknown. Age equal to freshness is within the window."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        },
        {
          "id": "R1-22-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "TAC2"
          ],
          "prerequisites": [
            "Desired/actual enabled and disabled combinations; old-code/config completion; new enablement generation.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions."
          ],
          "steps": [
            "Evaluate all combinations and current/old revisions.",
            "Inspect state precedence and evidence source."
          ],
          "expected": [
            "Disabled requires observed stopped schedule; either mismatch degrades; unknown observation remains unknown; old revisions cannot satisfy current health."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        },
        {
          "id": "R1-22-H04",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC4",
            "TAC3"
          ],
          "prerequisites": [
            "Allowed/denied health-reader identities and provider errors containing dummy secrets.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions."
          ],
          "steps": [
            "Run readable and JSON inspection with each identity.",
            "Inspect captured outputs, log events and action trace."
          ],
          "expected": [
            "Only scoped observations succeed; denial reports unknown; secrets/bodies are absent; no Jira/state mutation or scan launch occurs."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        }
      ]
    },
    "automated_regression": "Add CLI/application and provider-adapter contract coverage for the prescribed normal, failure, identity and permission outcomes; keep local fixtures separate from installed AWS/Jira acceptance."
  },
  "open_questions": []
}
```

## R1-23: Install Pig Boss health alarms

[PGB-101](https://scubapig.atlassian.net/browse/PGB-101)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "A stopped or failing manager cannot report its own absence. Customers need basic AWS alarms and a clear guide for operating the installation.",
  "prerequisites": [
    {
      "ticket": "R1-16",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-22",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The AWS package creates missing-completion, Lambda error/throttle and budget-utilization alarms with generated links and optional customer SNS notification routing."
    },
    {
      "id": "AC2",
      "requirement": "Installation starts disabled; enable, intentional stop and upgrade keep alarm actions and evidence revision aligned with canonical intent; an unexpected scheduler stop stays detectable."
    },
    {
      "id": "AC3",
      "requirement": "Readiness checks required health resources, operator permissions and configuration; the guide explains all health states, notification confirmation, capacity limits and safe recovery."
    },
    {
      "id": "AC4",
      "requirement": "Removal reports retained resources and costs; no alarm retries work, clears uncertain state, changes concurrency or monitors Cursor."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own health IaC, lifecycle integration and operator/readiness documentation; reuse the existing AWS package and R1-22 metrics/command.",
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
        "requirement": "Own health IaC, lifecycle integration and operator/readiness documentation; reuse the existing AWS package and R1-22 metrics/command."
      },
      {
        "id": "TAC2",
        "requirement": "Use the current evidence revision, missing successful completion as breaching and absent sparse errors as non-breaching. Document provider ingestion/evaluation delays; use existing customer SNS routing when configured."
      },
      {
        "id": "TAC3",
        "requirement": "Keep fixed low-cardinality dimensions, finite retention and bounded IAM; customer controls access and optional subscriptions. No dashboard, Teams integration or extra database."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-23-H01",
          "R1-23-H02",
          "R1-23-H03",
          "R1-23-H04"
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
          "id": "R1-23-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "TAC2",
            "TAC1"
          ],
          "prerequisites": [
            "Synthesized stack and simulated normal/error/throttle/utilization/missing metric histories.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions."
          ],
          "steps": [
            "Inspect alarm dimensions, thresholds, missing-data handling and generated links.",
            "Evaluate signal fixtures including duplicate completion points."
          ],
          "expected": [
            "Missing completion is detectable externally; error and utilization alarms match configured intent; duplicate metrics cannot inflate exact run claims; no automated recovery action."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        },
        {
          "id": "R1-23-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC4",
            "TAC2"
          ],
          "prerequisites": [
            "Disabled install, enable, intentional stop, unexpected scheduler stop, configuration-only upgrade and removal fixtures.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions.",
            "Controlled-clock histories with no completion at enable, config-only revision rotation, just before/at/after freshness expiry, and an installation that never starts."
          ],
          "steps": [
            "Run lifecycle harness for each transition.",
            "Inspect action state, evidence revision and retained-resource report.",
            "Evaluate startup and rotated-revision alarm histories through the full freshness window and beyond, without running a scan or a follow-up timer."
          ],
          "expected": [
            "Intentional stop disables actions and reports stopped; unexpected stop does not silence alarms; config changes rotate revision; removal retains scheduling state as promised.",
            "No missing-completion alarm before the current enablement freshness window expires; continued absence eventually alarms without worker help. Pre-enable metric-math grace never counts as a real scan. Failures/retries cannot reset grace, old revisions cannot satisfy it, and real error alarms remain effective during startup."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        },
        {
          "id": "R1-23-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC3",
            "TAC3"
          ],
          "prerequisites": [
            "No SNS topic, permitted topic and denied/misconfigured topic fixtures; least-permission policy snapshots.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions."
          ],
          "steps": [
            "Run package/readiness checks and inspect guide.",
            "Inspect action destinations and denied-access output."
          ],
          "expected": [
            "No topic clearly means console/command-only; configured routing requires operator confirmation; failures are actionable; no vendor access or broad runtime health privileges."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        },
        {
          "id": "R1-23-H04",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "AC4"
          ],
          "prerequisites": [
            "Fresh operator with generated outputs and unhealthy fixture observations.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions."
          ],
          "steps": [
            "Follow documented inspect, stop, diagnose and restore-readiness steps.",
            "Attempt an undocumented concurrency increase or uncertain-write replay in the guidance check."
          ],
          "expected": [
            "Guide identifies evidence and safe resolution; advises no overlapping manager or blind replay; capacity numbers are measured claims only. Installed notification delivery remains a separate acceptance gate."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        }
      ]
    },
    "automated_regression": "Add CLI/application and provider-adapter contract coverage for the prescribed normal, failure, identity and permission outcomes; keep local fixtures separate from installed AWS/Jira acceptance."
  },
  "open_questions": []
}
```

## R1-17: Admit a ready Story or Bug safely

[PGB-87](https://scubapig.atlassian.net/browse/PGB-87)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "After preview and installation, the manager must advance the selected ticket through Jira without losing track of uncertain effects. Existing Jira rules then own worker launch.",
  "prerequisites": [
    {
      "ticket": "R1-05",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-06",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-08",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-12",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-14",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-15",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-16",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "Apply fresh-reads the full eligible scope, retains member identity and atomically begins one new-work intent before publishing anything."
    },
    {
      "id": "AC2",
      "requirement": "It verifies the admission comment and pointer, rechecks source facts, sends one configured Ready to Work→In Progress transition and conditionally confirms the same attempt."
    },
    {
      "id": "AC3",
      "requirement": "Failed checks or unconfirmed member/intent persistence permit no Jira side effects; changed/uncertain effects after intent retain the hold across invocations with zero replay."
    },
    {
      "id": "AC4",
      "requirement": "Required rework/stack updates remain held until their apply increments ship; no new Story/Bug bypasses them. Preview remains write-free."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own cloud-neutral apply sequence and Jira mutation adapter using existing state/validation; no Cursor launch API or deduplication promise.",
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
        "requirement": "Own cloud-neutral apply sequence and Jira mutation adapter using existing state/validation; no Cursor launch API or deduplication promise."
      },
      {
        "id": "TAC2",
        "requirement": "Disable automatic retries per mutation; fail closed on missing global source-edge mapping, unknown outcome, rate limit, changed inputs or budget exhaustion."
      },
      {
        "id": "TAC3",
        "requirement": "Activation requires validated full account visibility, one admitting installation, reviewed inventory and explicit apply enable; initial install stays off."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-17-H01",
          "R1-17-H02",
          "R1-17-H03"
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
          "id": "R1-17-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1",
            "TAC3"
          ],
          "prerequisites": [
            "Complete fixture domain, empty stream, ready Story/Bug, disabled delivery triggers; simulated Jira/DDB."
          ],
          "steps": [
            "Preview selection.",
            "Enable only fixture apply and invoke once.",
            "Inspect state/comment/pointer/readback/source recheck/transition order.",
            "Invoke again with the ticket active."
          ],
          "expected": [
            "Exactly one directed admission, complete assignment visible before transition; next invocation sees occupied stream and sends no transition."
          ],
          "evidence": [
            "ordered state/Jira call audit and final receipts; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-17-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "TAC2"
          ],
          "prerequisites": [
            "Inject failure/lost response before and after member/intent/comment/pointer/source-check/transition/finalize operations."
          ],
          "steps": [
            "Run each fault trace.",
            "Invoke a fresh scan after it.",
            "Inspect persistent state and mutation count."
          ],
          "expected": [
            "Pre-intent read failure reevaluates without hold; persisted/possibly persisted intent prevents new effects; no duplicate publication/transition or false success."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-17-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC4",
            "TAC2",
            "TAC3"
          ],
          "prerequisites": [
            "Queued repair, five HR, paused Epic, incomplete shared discovery, global-only transition and unauthorized scope variants."
          ],
          "steps": [
            "Invoke apply for each fixture.",
            "Inspect decision and provider mutation audit."
          ],
          "expected": [
            "No admission under any failed gate; precise reason and no worker API calls."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Full apply-sequence integration tests with fault injection at each boundary and later-invocation no-replay assertions."
  },
  "open_questions": []
}
```

## R1-18: Admit queued rework on its existing PR

[PGB-88](https://scubapig.atlassian.net/browse/PGB-88)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "Queued work needs another implementation cycle without racing active work or losing repair findings. The manager must reuse its PR and all unresolved causes.",
  "prerequisites": [
    {
      "ticket": "R1-09",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-17",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "When the stream/capacity/prerequisites permit, apply admits the oldest understood queued repair before unrelated Bugs/Stories through Rework Queued→In Progress."
    },
    {
      "id": "AC2",
      "requirement": "The new assignment retains previous assignment, existing PR and every unresolved finding/root; a documented pre-first-PR wait is the only null-PR exception."
    },
    {
      "id": "AC3",
      "requirement": "A newer parent repair must complete before B consumes its latest revision/all causes; active work and paused/Blocked streams remain untouched."
    },
    {
      "id": "AC4",
      "requirement": "Missing repair evidence or uncertain effects hold without bypass or replay."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own repair-admission specialization of the existing safe apply path; reuse the same state/publication protocol and source-specific transitions.",
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
        "requirement": "Own repair-admission specialization of the existing safe apply path; reuse the same state/publication protocol and source-specific transitions."
      },
      {
        "id": "TAC2",
        "requirement": "PR openness remains implementer preflight; manager adds no PR integration, pointer guessing or multi-PR repair."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-18-H01",
          "R1-18-H02",
          "R1-18-H03"
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
          "id": "R1-18-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1"
          ],
          "prerequisites": [
            "A queued repair with four HR, no active work and coherent previous assignment/PR/findings; Bug C ready."
          ],
          "steps": [
            "Preview and apply.",
            "Inspect new admission record and pointer.",
            "Repeat with five HR and active B."
          ],
          "expected": [
            "A wins only with room; same PR/all causes retained; full/active variants make no transition."
          ],
          "evidence": [
            "assignment receipts and ordered call audit; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-18-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC3",
            "TAC2"
          ],
          "prerequisites": [
            "B queued with old+new parent roots; separate documented pre-first-PR wait fixture."
          ],
          "steps": [
            "Try B before latest parent completion.",
            "Supply coherent latest completion and apply.",
            "Apply valid null-PR wait and invalid forgotten-PR variant."
          ],
          "expected": [
            "B waits then receives all causes/latest parent; only genuine documented first-PR wait accepts null."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-18-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC4",
            "TAC1"
          ],
          "prerequisites": [
            "Fault variants at each publication/transition/finalize boundary."
          ],
          "steps": [
            "Apply each fault and invoke a fresh scan.",
            "Inspect pending attempt and side effects."
          ],
          "expected": [
            "Same durable holds/no replay as new admission; no unrelated bypass."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Repair apply tests for priority, exact existing PR/causes, capacity, parent completion and every failure boundary."
  },
  "open_questions": []
}
```

## R1-19: Queue a completed dependent PR for repair

[PGB-89](https://scubapig.atlassian.net/browse/PGB-89)

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


### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "When A’s repair completes, a stale dependent B in Human Review needs updating. The manager must queue that specific PR without restarting unrelated or active work.",
  "prerequisites": [
    {
      "ticket": "R1-18",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "A coherent repaired parent completion plus B’s actual stale lineage permits one Human Review→Rework Queued transition with the recorded cause."
    },
    {
      "id": "AC2",
      "requirement": "Queueing preserves B’s old assignment pointer; later admission replaces it through the normal admission path."
    },
    {
      "id": "AC3",
      "requirement": "Consumed roots, independent B, routine merges/retargeting, active/Blocked B and paused Epics do not cause queue transitions."
    },
    {
      "id": "AC4",
      "requirement": "A→B→C and a second A repair preserve every unresolved cause, require the latest coherent immediate parent and do not repeatedly queue already-consumed updates."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own queue-only specialization of the same durable intent/publication protocol; no direct In Progress or worker calls.",
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
        "requirement": "Own queue-only specialization of the same durable intent/publication protocol; no direct In Progress or worker calls."
      },
      {
        "id": "TAC2",
        "requirement": "On changed facts/unknown effects retain pending intent; no repeat publication or transition. Already queued B gets later repair causes through the defined admission references, not a second queue transition."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-19-H01",
          "R1-19-H02",
          "R1-19-H03"
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
          "id": "R1-19-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "TAC1"
          ],
          "prerequisites": [
            "A completes a1→a2 repair; B HR records A at a1; C ready."
          ],
          "steps": [
            "Apply queue-only decision.",
            "Inspect B pointer and cause.",
            "Run later repair admission and inspect new assignment."
          ],
          "expected": [
            "One queue transition with old pointer preserved; later B admission consumes the recorded update before C."
          ],
          "evidence": [
            "state/transition/pointer trace; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-19-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "AC4",
            "TAC2"
          ],
          "prerequisites": [
            "A→B→C chain plus independent D; A gets second repair while B queued."
          ],
          "steps": [
            "Run queue/admit/complete fixtures through both repair rounds.",
            "Repeat scans after each consumed completion."
          ],
          "expected": [
            "Oldest-first actual descendants only; all roots retained; no duplicate B queue or lost own findings."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-19-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC3",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Paused Epic, active/Blocked B, implementation-only A, changed lineage and lost publication/transition response."
          ],
          "steps": [
            "Apply each variant then invoke again.",
            "Inspect mutations, pointer and pending intent."
          ],
          "expected": [
            "No early/unauthorized queue; uncertain sent effects remain held with zero replay and pointer unchanged."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        }
      ]
    },
    "automated_regression": "Stack integration traces for queue/admit/complete, repeated roots, exact lineage and failure holds."
  },
  "open_questions": []
}
```

## R1-20: Check a compatible release before enabling delivery

[PGB-90](https://scubapig.atlassian.net/browse/PGB-90)

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

PGB-129/R1-26 is composed after PGB-113 and before PGB-81, with its unchanged six human cases. At that dated PGB-129 checkpoint, source was 26 Stories/116 cases; all original PGB-81 criteria and 42 full cases remain. Publication does not execute human acceptance or activate delivery.

### Complete structured contract

```json
{
  "schema": "pigboard-ticket/v1",
  "problem_to_solve": "The new manager cannot safely mix old prose workers with structured handoffs. Operators need one readiness report for the complete pinned installation.",
  "prerequisites": [
    {
      "ticket": "R1-03",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-05",
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
      "ticket": "R1-08",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-09",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-19",
      "required_outcome": "ai_qa_complete"
    },
    {
      "ticket": "R1-23",
      "required_outcome": "ai_qa_complete"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC1",
      "requirement": "The release installs complete compatible writer, validators, job skills, role Jira skills, request-rework and existing human-writing outside application repositories."
    },
    {
      "id": "AC2",
      "requirement": "A deterministic readiness report checks pinned bundle/contract/config versions, required capabilities and Story/Bug status-routing configuration while all triggers remain inactive."
    },
    {
      "id": "AC3",
      "requirement": "The guide walks Build refresh, installed-content verification, exact worker model effort and the three independent automation entrypoints with minimal prompts."
    },
    {
      "id": "AC4",
      "requirement": "Human Review presents both designated reviewers with automated evidence and pending human cases; UAT/production and human unblock remain outside automatic delivery."
    },
    {
      "id": "AC5",
      "requirement": "Readiness distinguishes local configuration checks, installed-package acceptance, PGB-58 delivery acceptance and explicit activation; none silently enables anything."
    },
    {
      "id": "AC6",
      "requirement": "Readiness verifies multi-project mappings and installed health resources/revision before enablement; displays Pig Boss consistently and links the operating guide."
    }
  ],
  "technical_acceptance_criteria": {
    "repository": {
      "url": "https://github.com/danielchappell/Pigboard",
      "base_branch": "main",
      "change_boundary": "Own compatibility checks and saved inactive setup artifacts; no automatic Jira/Cursor provisioner or live provider mutation from the checker.",
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
        "requirement": "Own compatibility checks and saved inactive setup artifacts; no automatic Jira/Cursor provisioner or live provider mutation from the checker."
      },
      {
        "id": "TAC2",
        "requirement": "Match AI-Daniel numeric streams to the same worker-type routes while preserving full labels for manager ownership; no duplicate skill copies inside Plexus."
      },
      {
        "id": "TAC3",
        "requirement": "Use one canonical config and generated bindings; inspect actual installed/hosted receipts where supplied and label missing receipts unverified rather than guessing readiness."
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
        "description": "Prescribed isolated fixture set for all cases below; each case states its input and expected outcome. All unmentioned snapshot facts are complete/valid and no earlier-priority work exists.",
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
        "supplies": "Executable local fixtures and exact commands for all human cases below, bound to the PR revision.",
        "used_by": [
          "DATA-01",
          "R1-20-H01",
          "R1-20-H02",
          "R1-20-H03",
          "R1-20-H04"
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
          "id": "R1-20-H01",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC1",
            "AC2",
            "AC3",
            "TAC1",
            "TAC2"
          ],
          "prerequisites": [
            "Disposable external skill install from the reviewed build; inactive saved Jira/Cursor fixture configuration."
          ],
          "steps": [
            "Fetch/prepare/refresh through the existing setup scripts.",
            "Run readiness check and inspect all required skills/references/contracts.",
            "Inspect app fixture repository diff."
          ],
          "expected": [
            "Complete compatible bundle and minimal prompts, full stream routing, inactive flags, no application-repository copies."
          ],
          "evidence": [
            "installer/readiness receipts and app diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-20-H02",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC2",
            "AC5",
            "TAC1",
            "TAC3"
          ],
          "prerequisites": [
            "Old worker contract, missing helper, mismatched model/capability, active-rule flag and missing installed acceptance receipts."
          ],
          "steps": [
            "Run checker for each variant.",
            "Inspect diagnostics and side effects."
          ],
          "expected": [
            "Each mismatch or missing receipt reported; no live setting changes or implicit activation."
          ],
          "evidence": [
            "command/output transcript and fixture before/after diff; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-20-H03",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC4",
            "AC5"
          ],
          "prerequisites": [
            "Representative complete automated evidence plus pending human cases and designated developer/QA reviewers."
          ],
          "steps": [
            "Follow guide from Human Review to recorded human review/testing.",
            "Inspect UAT/Done and unblock instructions."
          ],
          "expected": [
            "Human responsibilities are explicit; no worker claims human PASS or moves acceptance/deployment stages."
          ],
          "evidence": [
            "walkthrough notes and saved readiness output; tested PR revision and exact command."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable local fixtures/build output; do not change live records/resources."
            ]
          }
        },
        {
          "id": "R1-20-H04",
          "execution": "human",
          "owner_role": "developer and human QA reviewer",
          "requirements": [
            "AC6"
          ],
          "prerequisites": [
            "Pinned compatible release with two-project config, missing health resource and old evidence-revision variants.",
            "Current PR checkout; prepared local simulated provider data; no live customer actions."
          ],
          "steps": [
            "Run readiness in each variant.",
            "Inspect output and compare Jira/operational-state traces."
          ],
          "expected": [
            "Only complete compatible mapping/resources pass; mismatch is actionable; no scan, activation or delivery mutation occurs."
          ],
          "evidence": [
            "Tested PR revision, exact prepared commands/fixtures and sanitized outputs."
          ],
          "cleanup": {
            "mode": "prescribed",
            "reason": null,
            "owner": "human QA reviewer",
            "steps": [
              "Retain evidence then remove disposable fixture/build output; no live changes."
            ]
          }
        }
      ]
    },
    "automated_regression": "Bundle/config compatibility checks and installer regression tests proving inactive rollout and truthful readiness reporting."
  },
  "open_questions": []
}
```
