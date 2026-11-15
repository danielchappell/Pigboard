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
| Pigboard bundle | Thirteen allowlisted authoring/execution/helper skills, references and locked QA dependencies; [manifest](config/skill-bundle.json) |
| Setup scripts | Fetch a pinned source, prepare full folders, verify a stable installation and return a receipt; [install guide](docs/install.md) |
| Cursor environment | Prepared tools, source checkout and role-specific model controls; [automation matrix](config/cursor/automations.md) |
| Implementer composer | Dispatch preflight, High plan/one review and Medium job/final handoff; [entrypoint](skills/implementer-entrypoint/SKILL.md) |
| Implementer job | Assigned code, same PR, current CI and preparation evidence; no Jira writes; [job](skills/implementer-job/SKILL.md) |
| Implementer Jira skill | Native/configured eligibility, exact receipts, typed append/read-back and direct transition; no code/PR or admission writes; [Jira](skills/implementer-jira/SKILL.md) |
| Retained reviewer/QA entrypoints | Existing basic prose review and prescribed QA, pending coordinated migration; [workflow](docs/workflow.md) |
| Humans and pipelines | Resolve blockers, approve scope/merge, supply PR environments and verify UAT/production outcomes |

The installed code consists of skills and setup scripts. A successful Build proves
preparation, not a complete delivery loop. The pilot's three automations are
recorded inactive; [PGB-58](https://scubapig.atlassian.net/browse/PGB-58) owns bounded
live delivery acceptance. The prepared implementer accepts native Story/Bug structured
assignments and emits canonical implementation/dependency-wait/blocked records.
Reviewer/QA retain basic Story/prose behavior and direct In Progress rework; they
do not consume the new record. This mixed bundle stays inactive until coordinated
worker/manager release and acceptance. No provider adapter or manager state engine
is added; existing configured Atlassian tools remain the transport.

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

The canonical schemas and full writer YAML templates support authoring and local
validation now; they do not supply live readiness or compatible worker execution.
The bounded `probes/` fixtures, including AWS discovery infrastructure,
are acceptance research tools, not the manager implementation. Preserve them as
evidence. The `write-pr-sized-stories` skill now authors structured YAML while
retaining `human-writing` and the generic Task route. It uses the shared validator
from the same prepared release; no private schema or runtime is added. See
[authoring](docs/authoring.md). The implementer now consumes versioned assignments;
reviewer/QA retain their basic prose contract until later coordinated migration.
Installation does not activate them or convert old tickets. The pure local
`prepare-handoff.mjs` helper validates and encodes records in the existing validator
payload; it has no provider/model calls, mutation/retry or launch logic.


## Local canonical project configuration

The [configuration guide](docs/configuration.md) and closed
[scope schema](contracts/config-v1.schema.json) define the currently implemented
local scope checker. One authored document resolves explicit project/default
sections; exact site/project/full-label tuple identities are independent of keys
and boards. Pure modules in `lib/config/` validate, normalize and preview changes;
`scripts/check-config.mjs` is copied into the existing prepared `work-validator`.
The preview reports pending retained-work/readiness checks and no state actions.
It does not discover native mappings or access providers. Optional expected-site
binding proves only an exact site match. Deployment, scheduling, health, secrets
and enablement remain with their later owners in the same canonical configuration.

## Offline manager policy preview

The [local preview](docs/manager-preview.md) implements the first pure policy
increment in `lib/manager/`: closed supplied snapshot parsing/binding, complete
member availability and deterministic candidate decisions. It reuses canonical
configuration, raw work start validation and current receipt-chain validation.
Optional preparation/cancelled native mappings live only in canonical configuration
with explicit inheritance and backward-compatible empty resolution.

The same four source modules/CLI, guide and executable fixtures ship in the existing
prepared validator payload. Installer verification exercises a real nonexecuting
selection before stable-link replacement. No provider/AWS/state client, discovery,
intent/apply operation or worker activation is added. Full repair ordering and live
bounded Jira discovery remain later increments; a known unresolved repair waits
explicitly. Supplied completeness/receipts do not establish live freshness or
permissions. Human acceptance, hosted checks, merge and release remain separate.
