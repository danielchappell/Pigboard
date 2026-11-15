# Engineering skill trials

This is the planned comparison of the engineering suite. The evidence framework
and small parser control are implemented; the three realistic fixture repositories
below, target-model dispatch and final private instances still need trial
preparation. No comparative model results are claimed.

The owner reviews the finished skills before trials. The synthetic control proves
collection/comparison behavior, not these sixteen agent scenarios.

## Match the conditions

- **A:** Pigboard main `5050b95046edd2efd7105fa34dbc175c0157c5e2`.
- **B:** A with Pigboard's engineering suite and its job/review changes, pinned
  to the candidate commit and prepared bundle hash.
- **C:** A with the unmodified core [Ponytail skill](https://github.com/DietrichGebert/ponytail/blob/96608e078b2d5ea607c5c3b8b5a54d1c1fba6846/skills/ponytail/SKILL.md)
  loaded for planning and execution; no Ponytail reviewer or extra rights.

Keep requirements, source, profile, tools, delivery contract, independent plan-review
policy and limits identical. B's added engineering reference in review is part of
its treatment. This compares systems within Pigboard, not standalone Ponytail or
an isolated model. Identify provider simulations and exercise local product behavior
for real; do not simulate a successful feature.

Use matched A-v-B and A-v-C [campaigns](skill-evaluation.md). Reuse A's actual run
IDs/receipts and deduplicate them in the combined report. Counts below describe
actual executions. A changed baseline or skill requires a new frozen batch.

## Prepare the fixtures

| Fixture | Established code and observable behavior |
| --- | --- |
| F1: TypeScript service | Tenant-scoped invoice queries, pagination, operation store, fake payment provider, audit/effect recorder and API tests |
| F2: Python CLI/library | Shared parser, two consumers, config/state, atomic outputs, historical commits and command-line tests |
| F3: React plus local service | Form/loading/error components, two entrypoints, persisted state, keyboard behavior and browser tests |

Pin runtimes/dependencies, fresh data, ports and source commits. Supply bounded
start/test/cleanup recipes. Separate the public packet from private assertions and
graders. For each case, prove a broken variant fails and a reference correction
or correct stop passes. Those controls test the fixture, not model effectiveness.
Keep final instances/seeds unseen by skill authors after B is frozen; these are
known case classes, not a claim of unseen research problems.

Use the intended Opus configuration only after verifying its actual model ID,
effort controls and dispatch receipts. Do not invent a slug or silently replace
the current customer Grok profile. Without verified profile, isolation and finite
wall/token limits, model trials remain incomplete; fixture work can continue.

## Case catalogue

| ID / split | Task and deciding evidence |
| --- | --- |
| S01 development / F1 | Export invoices through a suitable shared tenant-query/pagination path outside the obvious folder; prove isolation and multiple pages. |
| S02 development / F2 | Extend the shared parser with a delimiter option; preserve default/quoted behavior for CLI and library callers. |
| S03 development / F1 | Reject a similarly named admin helper that bypasses tenant filtering; the safe extension resists cross-tenant requests. |
| S04 development / F3 | Use current form primitives rather than a deprecated nearby screen; exercise loading, error/success and keyboard/focus behavior. |
| S05 development / F2 | Resolve an ordinary helper/loop detail omitted from the plan locally; finish without needless replanning or an owner question. |
| S06 development / F1 | Discover a supplied reviewed plan's false payment-retry assumption; obtain revised review before changing approach and prevent duplicate charges. |
| S07 development / F1 | Conflicting refund/credit requirements need a precise owner decision; correct BLOCKED is success. |
| S08 development / F2 | Diagnose duplicate output caused by persisted replay state; fix the cause while preserving legitimate repeated rows. |
| S09 development / F1 | Detect a green command that discovers no relevant tests; run the correct existing cases and retain discovery/results. |
| S10 development / F2 | Make a narrow format correction covered by an existing output test; final-only checking is acceptable and redundant tests earn no credit. |
| S11 confirmation / F1 | Preserve ownership/effects under concurrent submission, replay and partial provider failure; judge actual state and effect records. |
| S12 confirmation / F3 | Verify real preference persistence through two entrypoints; detect a mutation that breaks persistence but keeps a mock setter green. |
| S13 confirmation / F2 | Resume a multi-batch conversion after failure without losing or repeating prior work; judge checkpoints by recovery value and final output. |
| S14 confirmation / F1 | Return DEPENDENCY_WAIT for an assigned upstream repair with exact requests; no unauthorized repair or false READY. |
| S15 confirmation / F2 | In separately reported subcases, invalidate evidence after a conflict edit and handle an uncertain PR-create response without another create. |
| S16 confirmation / F3 | Resume an interrupted browser check on the correct build, retain screenshots and side-effect proof, then clean only owned temporary state. |

Each packet specifies the expected terminal class and observable assertions.
Preserve both S15 subcases; one cannot substitute for the other. Accept alternative
valid designs. Require a particular helper only when its identity is itself a
compatibility contract. Author verification, independent plan review and post-run
grading remain different responsibilities.

## Proposed trial sequence

1. Six smoke runs: S01 and S10 once per arm; exclude them from comparisons.
2. Ninety development runs: S01–S10, three repetitions per arm. Keep tuning batches
   separate and randomize arm order within each case/repetition.
3. Fifty-four confirmation runs: S11–S16, three repetitions per arm after B is
   frozen. A fix after inspecting results needs fresh private confirmation instances.

Total: 150 actual runs. Proposed per-run limits are 30 minutes and 60,000 tokens
across all model roles: at most 75 aggregate run-hours and 9 million tokens. These
are bounds, not cost estimates or permission to incur a bill. Confirm current
pricing and an execution spend ceiling before paid trials. Retain failed attempts
and separately classify verified infrastructure faults.

Freeze success floors, must-pass assertions and rubrics before execution. Proposed
confirmation floors: each case succeeds in at least two of three repetitions;
S11, S14 and both S15 critical assertions pass all three. Every hard integrity
failure blocks qualification. Completed changes need actual final author checks.
Keep reuse/design, compatibility, recovery, verification usefulness and
maintainability/documentation scores separate, with evidence and applicability.

Inspect paired results and effort alongside those floors. Adoption needs a concrete
benefit without unexplained loss or disproportionate effort. Three codebases and
few repetitions cannot establish universal superiority. Successful trials lead to
separately authorized bounded real-repository acceptance, never automatic activation.
