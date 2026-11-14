# Pigboard architecture

**Pig Boss** is Pigboard's planned customer-hosted manager: one AWS installation for multiple Jira projects, project-scoped workstreams and basic operating health. See the [current design](docs/architecture/pig-boss-operations.md) and [MVP delivery set](docs/delivery/manager-r1/README.md). This behavior is not shipped yet.

Current direction is defined by the November 12–14, 2026 decisions in
[Jira PGB](https://scubapig.atlassian.net/jira/software/projects/PGB/boards/70).
This map separates the installed skills product from the planned manager.
Use [README.md](README.md) for onboarding and
[CONTRIBUTING.md](CONTRIBUTING.md) before changing Pigboard.

Read `docs/product/README.md` when present for the proposed release's readable
requirements and coverage map. Its
[consolidation PR](https://github.com/danielchappell/Pigboard/pull/73) is the reviewable
source for checkouts predating that merge. Product requirements define scope;
architecture documents express technical contracts. Neither replaces the installed
skill contract or proves implementation. Use the current product decisions for
human-only QA and Epic pause; the human repair-entry interface remains under
separate discussion and is not defined by this cleanup.

## Installed today: prepared skills and Jira/Cursor wiring

| Component | Responsibility and evidence |
| --- | --- |
| Jira | Requirements, native issue metadata, workflow status and configured stage triggers; [setup record](docs/jira-setup.md) |
| Pigboard bundle | Eleven allowlisted authoring/execution/helper skills, references and locked QA dependencies; [manifest](config/skill-bundle.json) |
| Setup scripts | Fetch a pinned source, prepare full folders, verify a stable installation and return a receipt; [install guide](docs/install.md) |
| Cursor environment | Prepared tools, source checkout and role-specific model controls; [automation matrix](config/cursor/automations.md) |
| Stage entrypoints | Implement, independently review or execute prescribed QA; publish evidence and permitted handoffs; [workflow](docs/workflow.md) |
| Humans and pipelines | Resolve blockers, approve scope/merge, supply PR environments and verify UAT/production outcomes |

The installed code consists of skills and setup scripts. A successful Build proves
preparation, not a complete delivery loop. The pilot's three automations are
recorded inactive; [PGB-58](https://scubapig.atlassian.net/browse/PGB-58) owns bounded
live delivery acceptance. The installed workflow returns confirmed fixes directly
to In Progress. Its entrypoints handle Stories; future repair/Bug contracts do not
silently override them.

## First manager: approved direction, still in discovery

[PGB-66](https://scubapig.atlassian.net/browse/PGB-66) owns the first manager release.
A customer deploys it into their own AWS account. It evaluates Jira readiness and
ordering, then performs permitted queue/admission transitions. Existing Jira rules
continue to launch Cursor; workers own implementation, review, QA and evidence.
Scuba Pig receives no runtime access, customer credentials or telemetry.

The approved boundary is:

- Cloud-independent decision logic and application orchestration, runnable locally
  without AWS credentials. AWS event/types/resource names do not enter its rules.
- Jira integration for work data and permitted transitions.
- A cloud-independent operational-state contract implemented by customer-owned
  DynamoDB for admission attempts, unresolved outcomes and human reconciliation.
- A thin Lambda invocation wrapper and a separate AWS infrastructure package.
- One coherent customer-authored configuration. Secrets stay in the customer's
  secret store; generated resource references/receipts are outputs. Automatic
  Jira/Cursor provisioning is a direction, not an implemented installer.

This is the scoped separation needed for the selected Jira/AWS release, not a
roadmap to build interchangeable platforms. Other-cloud packages, shared SaaS,
worker monitoring, duplicate-Cursor-launch prevention and a dispatch proxy are
outside release one. Target diagrams may show future components; use the release
scope to decide what to build.

Jira remains authority for requirements, Epic plans and workflow status. DynamoDB
stores Pigboard operational state; it does not copy that authority. An uncertain
Jira write holds the affected stream for human reconciliation. A database write
and Jira transition are not one transaction or an exactly-once launch guarantee.

Release one includes one automated cycle per full numbered workstream, the
five-ticket Human Review cap including Bugs, Epic pause behavior, queued repairs
and recorded-parent stack updates. Each repair retains its own ticket and PR.
The [scope](docs/architecture/manager-release-one.md),
[state contract](docs/architecture/manager-state.md) and
[stack contract](docs/architecture/manager-stack-repair.md) contain the exact rules.
Do not implement them from this summary alone.

## Current work and release gates

| Jira work | Required result |
| --- | --- |
| [PGB-67](https://scubapig.atlassian.net/browse/PGB-67) | Freeze work/repair contracts and scenario truth table, including AI/human testing ownership. |
| [PGB-68](https://scubapig.atlassian.net/browse/PGB-68) | Prove safe admission/state lifecycle, Jira transitions and ergonomic customer-owned AWS installation. |
| [PGB-69](https://scubapig.atlassian.net/browse/PGB-69) | After discovery and independent design review, present the complete fixed implementation Story set, coverage, dependencies, estimates and tests for owner review. |
| [PGB-58](https://scubapig.atlassian.net/browse/PGB-58) | Accept the existing delivery loop before real manager-driven activation. |

The [discovery record](docs/architecture/manager-discovery.md),
[work contract](docs/architecture/manager-work-contract.md),
[admission proof](docs/architecture/manager-admission-proof.md),
[handoff contract](docs/architecture/manager-handoff-contract.md),
[work schemas and examples](docs/architecture/manager-work-schema.md),
[scenario coverage](docs/architecture/manager-scenarios.md),
[bounded test packet](docs/architecture/manager-test-packet.md) and
[delivery plan](docs/architecture/manager-release-one-plan.md) distinguish approved
choices from unresolved proposals and missing evidence. No implementation Story
is ready merely because a diagram or discovery review exists. Owner review of the
complete Story set precedes implementation; activation is a separate gate.

The [target walkthrough](docs/architecture/target/review-guide.md) explains the
ratified diagrams. It is design context, not an installation or execution contract.

The JSON schemas and YAML examples under `docs/architecture/` are proposed work
contracts. The bounded `probes/` fixtures, including AWS discovery infrastructure,
are acceptance research tools, not the manager implementation. Preserve them as
evidence. Migrating the existing `write-pr-sized-stories` skill to the structured
YAML contract, retaining `human-writing`, is planned authoring work owned by that
coordinated release; the current skill must remain usable until then.
