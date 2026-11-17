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
new_work assignments and emits only ordinary READY implementation records.
Reviewer accepts actual implementation receipts; only current approved PASS
publishes to QA. Failure/wait/block and repair/resume retain full local findings,
partial ledgers and original receipts with no candidate/append or transition. The QA composer consumes current structured work and canonical predecessors; it
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

The manager modules, CLI, guide and existing compatibility fixtures ship in the
prepared validator payload. Installer verification exercises ordinary selection and the complete installed repair
fixture with eight smoke checks before stable-link replacement. The
[preview guide](docs/manager-preview.md) supports source and receipt-bound installed
fixture export. Local fixture checks do not establish live delivery or activation. The complete
offline source policy orders necessary prerequisites, queued repairs, Bugs and Stories, and
proposes stack updates only along authenticated actual parent relationships.
No provider/AWS/state client, discovery, publication, intent/apply operation or
worker activation is added. Unproved repairs wait for authentic evidence.
Supplied completeness and receipts do not establish live freshness or permissions.
The complete structured API/JSON result is PGB-149/R1-35. PGB-146 completes
readable source parity with every canonical cause's ticket, comment, record and
full digest in the supplied order, including own repairs without a parent. Human
acceptance, hosted checks, merge and release remain separate.

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
after uncertainty. Inability, defects and causal waits retain the full local
assessment and stop before candidate construction or append, with no transition.
Only successful ordinary QA or explicit static zero-AI completion may publish;
humans remain pending. Repair/resume and human rework are deferred; linked legacy
classification is not mutation authority. Current proof and original-identity
no-replay rules remain publisher-owned. The manager remains a design;
this worker boundary adds no manager state access or activation authority.

The offline repair policy consumes the canonical validator's private historical
projection and independently strict current-QA proofs. Exact recorded stack
parents and ancestry segments preserve every applicable repair cause; queue-only
proposals remain distinct from new/repair admission. Historical authenticity never
grants current completion. The same-ticket current-lineage coherence guard runs
before baseline, consumption or completion-derived stack relationships: conflicting
logical QA results cannot free a stream. Exact current assignment references keep
their independent authority. See [offline preview](docs/manager-preview.md).

## Requested native Jira inspection from source or prepared validator

`lib/jira/read.mjs` exports `inspectJiraIssues` for an authorized Node caller in
the reviewed source checkout or a complete prepared installed `work-validator`.
It accepts A's canonical configuration, explicit
immutable issue IDs and exact comment targets, plus a trusted in-process secret
resolver. It reads named issues, fixed assignment pointers, visible comment pages
and supplied exact comments. It does not perform domain discovery, receipt proof,
admission or Jira writes. No manager state or AWS wrapper consumes it yet.

The reader owns fixed Atlassian gateway HTTPS requests, TLS verification, input
and count/byte/time bounds, cancellation fencing, safe diagnostics and private
observations. Report serialization excludes bodies and secrets. Failed or changed
reads retain valid partial observations and mark missing information honestly.
Its immediately used `createJiraIssueAcquirer(session)` owns one normalized named
issue and its pointer, comment discovery and exact-comment cache within a read
session. The public `inspectJiraIssues` owner still validates requested IDs,
resolves the credential once and finishes the session once. This extraction adds
no key lookup, search, reference closure, new transport or Jira write authority.
The [API and fixture guide](docs/manager-preview.md#inspect-named-jira-issues)
documents prerequisites, use, limits and recovery. Its importable test-only HTTPS
packet and direct fixture CLI hash the complete explicit runtime and prepared
dependency closure and exercise disposable damage. The installed validator carries
the reader, harness, literal cases and dummy TLS material as one payload. The CLI
selects only prescribed local dummy-HTTPS cases; it adds no live Jira command or
manager admission authority.

### Supplied handoff candidate inspection

`extractHandoffCandidate(adfInput)` in the existing handoff module classifies supplied ADF only. A source-order AST pass binds aliases to prior anchors; one visited root-schema graph identifies attempted records. The existing strict parser then validates the selected original whole wrapper and canonical record. Strict receipt consumers retain their existing contract. This pure synchronous API has fixed bounds and no provider, resolver or deadline parameter. A later inventory caller owns discovery and checks its own deadline before and after inspection; synchronous parsing cannot be timer-preempted. Source and prepared-copy use and recovery are in the [guide](docs/manager-preview.md#inspect-a-supplied-handoff-comment).

## Complete ordinary Jira acquisition

`lib/jira/inventory.mjs` composes the existing Jira read session/acquirer and
PGB-172 handoff-candidate recognizer. One configured session owns fixed native
searches, identity/alias resolution, property-key/value reads, complete comments
and exact schema-owned reference closure. Search and comment pages share budgets;
resource exhaustion stops further requests. Old retained ownership and positively
observed current membership remain distinct in each project/full-label scope.

The enumerable report is safe to serialize. Non-enumerable read-only observations
preserve original bounded ADF and native metadata for trusted in-memory use.
Pointer state distinguishes validated present, enumerated absent and unknown.
A raw 404 cannot establish absence. Exact record/digest matches establish
acquisition consistency and do not grant receipt or admission authority.

State PGB-84/83 supplies confirmed `retained_members`, `pending_intents` and
`retained_complete` through its inventory projection. Core PGB-162 owns raw-fact
normalization, semantic snapshot/envelope construction, recorded parser behavior
and existing policy evaluation. PGB-175 owns ordinary worker proof compatibility.
PGB-87 owns conditional original-attempt admission/publication/transition; State
PGB-84/137 retains durable attempt and outcome evidence. PGB-83 packages the
disabled customer runtime and PGB-90 verifies the actual installed journey.
The source acquisition library does not add an installer payload, CLI, evaluator
or activation path. See the [guide](docs/manager-preview.md#complete-ordinary-jira-inventory-library).

## Ordinary recorded policy boundary

`composeOrdinarySnapshot` in the existing snapshot module converts173's supplied
private original observations and confirmed State projection into snapshot/v2;
`previewSnapshot(...,{mode:'ordinary'})` uses the same normalizer/policy with
structural scheduling and recorded validators. It performs no acquisition or
State writes. Shared/unknown incompleteness rejects composition; proved isolated
scope failures retain known membership and hold only affected scope checks.
No synthetic execution context, PR observations, earlier metadata or new store is
created. Missing earlier capture is allowed under the adopted ordinary guarantee;
provided genuine tuples still must match. Current authentication and external
freshness are separate. Required repair holds before external PR/publication logic.

Explicit mode/version/proof fields prevent legacy v1 proposals from entering the
ordinary admission caller. The existing CLI and actual prepared-copy payload use
the same route. Strict execution APIs and legacy repair fixtures remain separate.
This increment does not prove live173/State/AWS composition, worker compatibility,
human acceptance, activation or a release; their owning delivery gates remain.

## Current worker proof and recorded ancestry

`lib/contracts/receipts.mjs` keeps one evaluator with per-record effective proof. `validateWorkerCurrent` and explicit CLI mode `worker-current` accept a separate closed worker envelope, without manager State access. Full selected-current start, own PR/evidence/preparation and supplied action capabilities remain required; parent ancestry authenticates recorded semantics while parent incorporation checks current PR identity/head/target/state. Older assignments require no reconstructed contexts or mandatory prior capture; genuine supplied retained mismatches reject. The direct labelled result grants no completion or execution authority. Strict and manager recorded APIs retain their own contracts. No new publication service or candidate API exists.

See the [ordinary worker contract](docs/handoffs.md#ordinary-worker-release-boundary) for the closed envelope, exact readback and recovery.

## Conditional State API

The [State guide](docs/manager-state.md) documents the callable production API in
`lib/state/contract.mjs` and `lib/aws/dynamodb.mjs`. It retains installation, stream,
member and original-attempt identity; performs bounded coherent inventory and
conditional reservation/finalization; and keeps unknown effects held. Prepared
Node callers use the actual pinned SDK with customer credentials. State success
does not establish Jira authority or live readiness.

PGB-83 owns actual installation/configuration/resource resolution and CLI binding;
PGB-137 adds original transition capture and PGB-87 owns verified Jira effects.
The local three-group API packet preserves installed and human acceptance as
pending. No historical worker-metadata collector, recovery automation or runtime
activation is introduced. Existing state evidence and original installed checks
remain distinct; PGB-83/90 owns the retained installed release journey.

Ordinary admission orchestration lives in `lib/manager/apply.mjs`. It consumes the
complete Jira inventory collector and ordinary snapshot/policy, retains native
membership and an original State attempt, publishes/verifies the existing handoff
and pointer through `lib/jira/write.mjs`, rechecks source facts and retains the
original transition proof before sending once. State owns conditional revisions
and proof persistence; the AWS host owns prepared authority, lifetime and package
capability. Jira and State effects are not atomic: uncertainty retains the original
hold and never authorizes replay. See [ordinary admission](docs/manager-apply.md).
