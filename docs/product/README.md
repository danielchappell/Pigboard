# Pigboard product requirements

Reviewed product baseline, 14 November 2026. These specifications consolidate the owner's
decisions for the first manager release and its required skill changes. They do
not announce shipped behavior, authorize implementation, or enable delivery.

## What this release delivers

A team prepares an Epic and small, testable tickets in Jira. Pigboard's manager
starts eligible work in order. Cursor workers implement, review and test each PR.
Humans receive the PR, evidence and their own testing instructions in Human Review.
The manager runs in the customer's AWS account; Scuba Pig receives no runtime data.

The release includes the authoring and worker changes needed for this journey.
Shipping a scheduler against incompatible ticket or handoff instructions would
not deliver the product.

| Specification | What it decides |
| --- | --- |
| [Authoring](authoring.md) | Epic/ticket structure, readiness, skill ownership and test cases |
| [Delivery](delivery.md) | Worker responsibilities, PR evidence, rework and human boundaries |
| [Manager](manager.md) | Eligibility, ordering, capacity, dependencies and stack repairs |
| [Installation and state](installation.md) | Customer deployment, configuration, safety and upgrades |
| [Coverage](coverage.md) | Requirement-to-design-to-Story-to-test accountability |

These documents own the readable product requirements for the proposed release.
The linked architecture documents own technical contracts, not extra product scope.
Jira PGB owns the delivery queue, dependencies and current work status. Discrepancies are findings to reconcile, not authority to silently override either source. Later owner decisions must update the affected
requirement and coverage row together.

## Current, required and later

Verified source baseline: Pigboard main
`fd725b7b1eac6ead32fe61fffe811bcc3dfecfaf`.

- Present: reusable worker/QA/review skills, external skill setup scripts, and the
  source-controlled `write-pr-sized-stories` and `human-writing` skills.
- Required for this release: structured authoring and validation, separate role
  handoffs, compatible Story/Bug routing, manager preview/admission/stack queueing,
  and customer-owned AWS installation with DynamoDB state.
- Not yet proved: an installed compatible release completing its acceptance journey.
  Published schemas, diagrams and isolated provider tests are not that proof.
- Later: worker monitoring, duplicate Cursor launch prevention, launch proxy,
  cancellation/automatic recovery, transcript collection, SaaS, other cloud packages,
  automatic Jira/Cursor provisioning, additional QA engines, Teams alerts, and
  per-PR environment creation. Existing supplied environments remain a prerequisite
  for environment-dependent cases.

Human unblock automation and a blocked-stage field/card remain the separately
tracked follow-up. This release consumes explicit human authorization when supplied;
it does not pretend the missing producer exists. Without it, work remains Blocked.

## Review and implementation boundary

PGB-66 is the manager Epic; PGB-67/68 close discovery; PGB-69 owns the complete
delivery plan. PGB-58's basic delivery acceptance is required before activation,
not before fixture-based implementation can begin.

Every agreed requirement needs a Story and an observable test, or an explicit
existing-capability/operational-Task disposition. Every proposed Story must trace
back to a requirement. Unmapped work cannot enter the frozen MVP unnoticed.
The owner reviews the complete, independently reviewed Story set, dependencies,
sizing and tests before implementation. Each Story is one PR, at most 20 changed
files and less than two human working days, including tests and documentation.

## Decisions confirmed during this review

On 14 November 2026 the owner confirmed:

- **D01:** allow explicitly human-only test plans. CI and PR review still apply;
  QA reports zero AI cases and pending human cases, then moves to Human Review.
- **D02:** pausing an Epic pauses every manager transition, including queue-only
  stack updates. Existing workers may complete their permitted handoffs.

- **D03:** keep story writing and requesting rework as separate skills. A human
  invokes `request-rework` through their assistant; it records findings and moves
  the open-PR ticket to Rework Queued. Manager admission happens later.

The detailed design and delivery plan must retain these decisions.

## Source and review record

The owner conversation establishes the product decisions. Repository contracts
provide their detailed expression: [release boundary](../architecture/manager-release-one.md),
[work contract](../architecture/manager-work-contract.md), [41 scenarios](../architecture/manager-scenarios.md),
[stack rule](../architecture/manager-stack-repair.md), [handoffs](../architecture/manager-handoff-contract.md),
[state](../architecture/manager-state.md), and [schema guide](../architecture/manager-work-schema.md).
The existing [workflow](../workflow.md) describes the earlier basic bundle, including
direct rework to In Progress; that behavior must change for this release.

This consolidation has independent CLEAN product and technical design reviews in [the review records](../reviews/manager-design-product.md). The original 20-Story delivery set had two independent CLEAN plan reviews; those reviews remain historical. The [current delivery set](../delivery/manager-r1/README.md) composes the owner-approved amendments at a partial 30-Story/132-case source checkpoint after PGB-145; PGB-137/R1-29 source composition remains pending. This does not authorize implementation, further provider probes or activation.

## Approved company-scope addition

See [the Pigboard crew](branding.md) for the approved names and roles: Pig Boss,
Hardhat Ham, Inspector Pork and Snout Scout.

The manager is named Pig Boss. One customer AWS installation manages several projects in one Jira site. Stream identity includes the immutable project ID. O13–O15 add multi-project acceptance and basic manager health. The [scope design](../architecture/pig-boss-operations.md) supersedes any label-global or all-monitoring-deferred wording above. The earlier 20-Story review remains historical; the historical 23-Story set has independent CLEAN delta reviews. The owner approved the same-scope 24-Story QA split on 15 November: R1-24/PGB-110 publishes prepared evidence immediately before R1-08/PGB-78 integrates the dispatcher. Each Story retains its exact-base plan, code and delivery gates; Jira owns current progress. Publication does not mean manager/release behavior has shipped. Fifty-project capacity is a follow-on target, not a ten-project limit.

## Earlier delivery amendments — historical checkpoints

The [delivery plan](../delivery/manager-r1/README.md) places PGB-113/R1-25 before PGB-81/R1-11. The existing chain validator gains repeated-parent evidence checks; the complete offline repair preview remains PGB-81 with all 42 cases. That source checkpoint contained 26 Stories/116 cases and composes the publisher, repeated-parent and current-proof consistency amendments. Native 25/110 figures in this receipt describe the recorded 15 November 2026 PGB-110/PGB-113 amendment-publication snapshot; Jira owns subsequent queue changes. Dated 20/23-Story reviews and receipts remain historical. Publication does not establish acceptance or ship the planned manager.

The preceding source checkpoint composed the approved amendments: 26 Stories/116 cases, including R1-24/PGB-110 before R1-08 and R1-25/PGB-113 then R1-26/PGB-129 before R1-11. The original 23/104 publication and each earlier amendment remain dated history. Current publication is not human acceptance, compatible live delivery or activation.

PGB-129/R1-26 precedes PGB-81 to reject contradictory current completion observations in the offline preview. It preserves current retained-empty compatibility; complete repair scheduling/history remain PGB-81. The PGB-110-first source composition was 26 Stories/116 cases, retaining separately dated native publication evidence. All original PGB-81 criteria and 42 human cases remain. The six new human cases are NOT_RUN; this amendment does not claim a shipped manager or activation.

## QA input-preparation amendment, 15 November 2026

The preceding native/source amendment snapshot was **27 Stories/119 cases** after PGB-132/R1-27. It will supply the prescribed QA inputs for the existing helpers and standalone publisher immediately before PGB-78/R1-08. Every original PGB-78 criterion and case remains; only its new preparation prerequisite is appended. The 53 requirements and 41 scenarios are unchanged. Earlier 26/116 and native readback statements above describe the preceding source checkpoint.

This source composition uses verified PR #98 merge `275aebf86affcd1ac974c8e6222d66679ac1cbd7`, whose tree `e1e16b1221473f1754661ca4a56925621c21f31d` exactly equals Core's independently CLEAN and pushed commit `261a3856c9710a62be3c2c8ac4424778cb1ca0a0`. Initial source layering before that merge remains historical evidence. PGB-129 is not a QA preparation dependency. The [delivery plan](../delivery/manager-r1/README.md) retains the historical 18-file/10.75–15h preparation and 17-file/10.5–14.5h final-dispatch forecasts. Final PGB-78 remains **Provisional — not ready for delivery** until PGB-132 actually merges and its concrete plan is rebound/reviewed. No new acceptance, installed dispatch or activation is claimed.

## Three-input preparation controls, 15 November 2026

The preceding PGB-138 source checkpoint composed **28 Stories/122 human cases** from development base main `275aebf86affcd1ac974c8e6222d66679ac1cbd7`: pending PGB-132 is preserved and actual PGB-138/R1-30 is added before it. PGB-138 supplies the source-only I01-story, I02-parameters and I11-stale-environment command, complete input handoff and read-only inspection guidance. The residual PGB-132 source candidate extends the same producer to all 51 inputs in 14 families; source preparation does not complete its human/helper acceptance or PGB-78. The [delivery plan](../delivery/manager-r1/README.md) records the historical 15 November split allocation: 18 paths/8.5–12.5h for PGB-138 and 12 paths/6.75–9.75h for residual PGB-132. The earlier proof/size repair checkpoint on 16 November was 7.5–11.25h for that residual; both earlier estimates remain history. All original 53 requirements/41 scenarios and existing cases remain.

Current PGB-132 whole residual forecast: **8.5–12.75 hours / 1.0625–1.59375 days**. The 16 November child-operation-history/forecast correction adds 1–1.5h to the prior 7.5–11.25h, including diagnosis, tests/docs, ordinary correction, independent review and PR evidence. Nine authored paths remain within twelve forecast paths; see the [current delivery plan](../delivery/manager-r1/README.md) and its metadata. Source input checks do not establish helper refusal, human acceptance or activation.

The Director separately verified native Epic inventory at 30 Stories/130 cases on 15 November, 13 Done/merged and 17 remaining. PGB-136/137 were native-only at that source checkpoint. Source publication, local checks, human acceptance, installed acceptance, CI, merge and activation are distinct. R1-30's three human cases and R1-27's original cases remain NOT_RUN; owner decision 10765 accepts only PGB-132's historical helper/publisher evidence gap, with no transfer or rerun.

## Own-ticket selection split — 15 November 2026

The [delivery set](../delivery/manager-r1/README.md) composes **29 Stories/128 cases** after PGB-138/R1-30 and PGB-136/R1-28. PGB-137/R1-29 remains a separate pending source amendment against the Director’s dated 30-Story/130-case native inventory. All 53 requirements and 41 original scenarios remain.

PGB-136 adds bounded own-ticket selection in the existing offline preview before PGB-81 completes typed/stack repair ordering. All 42 original PGB-81 cases and all six new human cases remain NOT_RUN. Its owned 20-path source change is composed onto verified merged PGB-138 main `b6b863476d9f07eee2702991f336def7ff38cd36`, tree `ebbfca1688f0aa954e29913dc72ceb6e74055fe0`. The earlier `29ba86017ec8ce5c27392f699a9a387cc8902260` development composition remains historical. Source publication, local checks, independent review, hosted CI, merge, human acceptance and activation remain distinct.

## Local Jira read-configuration increment — 16 November 2026

The current partial source checkpoint is **30 Stories/132 cases** after PGB-145/R1-31, based on merged e54. The dated PGB-145 native publication snapshot is separately **31 Stories/134 cases**; PGB-137/R1-29 source composition remains pending. Earlier29/128 and native30/130 figures remain dated history. The local checker gains optional complete connection/reference and explicit budget checks plus safe change previews. This does not read Jira or prove credentials, visibility, supported live capacity or readiness. Four new human cases remain NOT_RUN; every original PGB-82 criterion and case remains. Final live-read defaults, measured acceptance, independent code review, hosted checks and owner merge/release gates remain separate.

## Source machine repair preview — 16 November 2026

PGB-149/R1-35 supplies the complete offline source API/JSON repair preview and its
required copied-runtime compatibility. The source guide exports all fixed inputs,
options and complete independent reports. Readable output is available but does
not yet name every retained cause; use `--json` for the complete result until
PGB-146 finishes readable parity. The full installed fixture kit, eighth semantic
smoke and complete source/native publication reconciliation remain PGB-81.

The current partial source inventory remains **30 Stories/132 cases**, including
actual merged PGB-145. The preceding PGB-146 capture retains its earlier source
29/128 and dated native32/136 unchanged, including its historical unmatched six
and pre-integration runtime map. Those dated observations are not current counts.

The new partial receipt compares a hash-bound recorded set: that native32/136
readback, overlaid only with the new PGB-146 body and PGB-149 body from this
publication. Five differences against that recorded set are PGB-81, PGB-85,
PGB-137, PGB-146 and PGB-149. This is not an exhaustive current native inventory.
The later dated34/144 snapshot also records PGB-82's PGB-148 prerequisite and
native PGB-147/PGB-148, whose source composition remains deferred to PGB-81.
No later source or live-read behavior is imported by this receipt.

PGB-149 requires PGB-80, PGB-113, PGB-129, PGB-136 and PGB-145, each at
`ai_qa_complete`; its real native key is added before PGB-146. All original
PGB-146 criteria/testing and its two human routes, and all original PGB-81
criteria/testing and42 human cases, remain intact and NOT_RUN. R1-35's two human
routes are also NOT_RUN. Local developer evidence, independent review, hosted
checks, merge, human acceptance and activation retain their separate gates.
