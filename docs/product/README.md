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

This consolidation has independent CLEAN product and technical design reviews in [the review records](../reviews/manager-design-product.md). The [complete 20-Story delivery set](../delivery/manager-r1/README.md) also has two independent CLEAN plan reviews and awaits owner approval. This does not authorize implementation, further provider probes or activation.
