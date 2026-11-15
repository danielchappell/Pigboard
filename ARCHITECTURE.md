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
human-only QA and Epic pause; the human repair-entry design is implemented by the
separate prepared request-rework skill below. Live acceptance and activation
remain separate.

## Installed today: prepared skills and Jira/Cursor wiring

| Component | Responsibility and evidence |
| --- | --- |
| Jira | Requirements, native issue metadata, workflow status and configured stage triggers; [setup record](docs/jira-setup.md) |
| Pigboard bundle | Twenty-two allowlisted authoring/execution/helper skills, references and locked QA dependencies; [manifest](config/skill-bundle.json) |
| Setup scripts | Fetch a pinned source, prepare full folders, verify a stable installation and return a receipt; [install guide](docs/install.md) |
| Cursor environment | Prepared tools, source checkout and role-specific model controls; [automation matrix](config/cursor/automations.md) |
| Implementer composer | Dispatch preflight, High plan/one review and Medium job/final handoff; [entrypoint](skills/implementer-entrypoint/SKILL.md) |
| Implementer job | Assigned code, same PR, current CI and preparation evidence; no Jira writes; [job](skills/implementer-job/SKILL.md) |
| Engineering methods | Six focused planning, investigation, design, diagnosis, verification and shared judgment methods inside existing phases; [guide](docs/engineering-skills.md). No new scheduled roles. |
| Implementer Jira skill | Native/configured eligibility, exact receipts, typed append/read-back and direct transition; no code/PR or admission writes; [Jira](skills/implementer-jira/SKILL.md) |
| Reviewer wrapper / reviewer-jira | Shared read-only pr-review job and existing comments/approval; separate exact receipt preflight/publication/direct transition, no admission state; [contract](skills/pigboard-pr-review/references/jira-handoff.md) |
| Human request-rework | Human-invoked current-QA/open-PR preflight, one verified repair comment and direct Human Review -> Rework Queued; no worker, pointer or admission writes; [skill](skills/request-rework/SKILL.md) |
| QA composer | Structured native Story/Bug inventory, ordered helpers/observations and complete partial ledger; [entrypoint](skills/qa-entrypoint/SKILL.md) |
| QA Jira publisher | Current authority/proof checks, one canonical append/readback/direct transition and bounded recovery; [qa-jira](skills/qa-jira/SKILL.md) |
| Humans and pipelines | Resolve blockers, approve scope/merge, supply PR environments and verify UAT/production outcomes |

The installed code consists of skills and setup scripts. A successful Build proves
preparation, not a complete delivery loop. The pilot's three automations are
recorded inactive; [PGB-58](https://scubapig.atlassian.net/browse/PGB-58) owns bounded
live delivery acceptance. The prepared implementer accepts native Story/Bug structured
assignments and emits canonical implementation/dependency-wait/blocked records.
Reviewer accepts native Story/Bug structured assignments and canonical implementation receipts, with approved QA or same-PR Rework Queued handoff. The QA composer consumes current structured work and canonical predecessors; it
delegates publication to qa-jira. Saved wiring, installed/live acceptance and owner
activation remain separate gates. No provider adapter or manager state engine
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
reviewer consumes canonical implementation receipts through reviewer-jira; QA
composes structured helpers and canonical publication through qa-jira.
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

## Prescribed helper boundary

The existing [four QA helpers](skills/qa-api/SKILL.md) use a
[shared structured-step contract](skills/qa-api/references/structured-steps.md):
raw validated AI case/step and trusted start facts in; revision-bound observations,
evidence, defect or inability out. API owns one named Bruno child, PostgreSQL
resolves declared output/input/parameter bindings, and UI uses the prescribed
surface/viewport/checkpoints. Engines remain locked Bruno 4.2.1, pg 8.23.1 with
the unchanged bounded reader, and prepared computer use. No controller, schema,
connector or dependency is added. Same-release complete sibling folders carry
shared references. A source-only fixed fixture supports preparation, not runtime.

The [QA composer](skills/qa-entrypoint/SKILL.md) owns full raw-work inventory,
top-level order, finite clock-bound offsets, named actual-output binding and the
complete partial ledger. API alone owns its Bruno child. Helpers execute one exact
unit; they do not schedule, publish or choose another case. The composer retains
all attempts, transitive explicit dependency finding unions, unknown effects and
case-specific reuse proof. It submits one actual assessment to qa-jira. No new
engine, schema or provider adapter is added. Source instructions and fixed cards
do not establish actual Grok High/helper/clock behavior or deployment acceptance.

## Prepared QA publication boundary

The current bundle contains 22 skills. [qa-jira](skills/qa-jira/SKILL.md) is the sole
permanent QA Jira publication/failure owner. A trusted caller supplies the complete
prepared assessment; qa-jira independently checks current authority, canonical
records/receipts, evidence, publication and one direct native transition. It never
executes domain helpers. The compatible qa-entrypoint composes preflight and one
final actual assessment; it never falls back to direct writes or replays helpers
after uncertainty. Inability retains defects, causal upstream wait/repair queues
the same PR, and static zero-AI work keeps humans pending. Current proof, unique
resume authority and no-replay rules remain publisher-owned. The manager remains a design;
this worker boundary adds no manager state access or activation authority.
