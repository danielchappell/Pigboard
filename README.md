# Pigboard

**Pig Boss** is Pigboard's planned customer-hosted manager: one AWS installation for multiple Jira projects, project-scoped workstreams and basic operating health. See the [current design](docs/architecture/pig-boss-operations.md) and [MVP delivery set](docs/delivery/manager-r1/README.md). This behavior is not shipped yet.

Pigboard helps agents deliver scoped Jira work through implementation, independent
PR review and prescribed QA. Jira holds requirements and progress; Cursor runs the
prepared skills; humans review and approve what ships.

## Our product promises

These seven promises guide how we build Pigboard and other Scuba Pig products.
They describe the standard we work toward. See [What is available](#what-is-available)
for what Pigboard supports today.

1. **Write plainly.** Use clear language in tickets, skills, reports, documentation
   and instructions. Preserve exact requirements and explain uncertainty.
2. **Configure once.** Use one authoritative customer configuration to drive
   downstream setup, without asking people to copy settings between systems.
3. **Make the whole experience exceptional.** Aim for Apple-level ease in
   installation, everyday use, updates, troubleshooting and removal. Make the
   product intuitive and discoverable, handle complexity, and guide unavoidable
   manual steps.
4. **Respect time, attention and money.** Avoid wasted tokens, repeated setup and
   endless attempts to prove a result. Preserve completed work and useful evidence.
5. **Protect customers and their control.** Secure credentials, permissions and
   actions. Keep runtime data and secrets under customer control, with no Scuba Pig
   access by default.
6. **Make human review useful.** AI should check every applicable criterion and
   provide a clear summary, a map from changed behavior to files, and evidence.
   Humans choose informed spot-checks and retain acceptance and merge authority.
7. **Build focused skills and measure their value.** Learn from community
   approaches and give each skill a coherent purpose. Compare concrete measured
   results against agents without those skills and relevant alternatives.

## Start here

| What you want to do | Guide |
| --- | --- |
| Use Pigboard as an agent | [Choose a skill and supply its inputs](docs/using-pigboard.md) |
| Install or update the shared skills | [Installation, verification and recovery](docs/install.md) |
| Contribute to Pigboard | [Agent entry point](AGENTS.md) and [contributor agreement](CONTRIBUTING.md) |
| Understand the product and next work | [Architecture and current Jira scope](ARCHITECTURE.md) |
| Preview ready work and repairs from complete local facts | [Offline manager preview, examples and recovery](docs/manager-preview.md) |
| Inspect requested Jira issues from a reviewed source or prepared installed validator | [Named-issue library and finite HTTPS packet](docs/manager-preview.md#inspect-named-jira-issues) |
| Use the conditional State API or bound init/inspect CLI | [State API, prerequisites and recovery](docs/manager-state.md) |
| Package the disabled customer-owned preview runtime | [AWS package, installation, preview and stop](docs/manager-installation.md) |
| Validate or preview multi-project configuration | [Local scope checker and configuration guide](docs/configuration.md) |
| Configure the existing delivery workflow | [Workflow contract](docs/workflow.md), [Jira setup](docs/jira-setup.md) and [Cursor matrix](config/cursor/automations.md) |

The [product specification consolidation](https://github.com/danielchappell/Pigboard/pull/73)
provides the readable requirements for the proposed release. In checkouts that
contain it, start with `docs/product/README.md`, then follow its technical-contract
and coverage links. Specification review does not establish shipped behavior or
complete implementation Story coverage.

## What is available

The source State API and DynamoDB adapter are callable by prepared Node callers.
Source also provides the disabled customer-owned AWS preview package, generated
binding and operator init/inspect/configure/stop commands. See the
[installation guide](docs/manager-installation.md) and [State guide](docs/manager-state.md).
Local simulations do not establish installed acceptance, live IAM or activation;
this package has no admission sender.

| Capability | State |
| --- | --- |
| Twenty-two shared skills: engineering methods, authoring, composed delivery, review, human rework, writing and QA | In the repository and installation allowlist |
| Pinned skill preparation, verified stable installation and helper dependencies | Implemented; local installer tests available |
| Jira-to-Cursor implementation, PR review and QA setup | Configured for the pilot; recorded inactive, with bounded live delivery acceptance still pending in [PGB-58](https://scubapig.atlassian.net/browse/PGB-58) |
| Offline manager policy preview of supplied complete snapshots | Complete source and prepared-installed fixture preview of ordinary work, repair prerequisites and recorded-parent stack updates, with every readable cause identity in order. Installation verifies repair semantics with an eighth check before replacing the stable link. Local fixture evidence does not establish live discovery, delivery or activation; preview has no writes or execution authority. |
| Requested Jira issue/pointer/comment inspection | Bounded library in source and the complete prepared installed validator, with a caller-supplied secret resolver. The local dummy-HTTPS packet has an importable API and test-only fixture CLI; neither is a live Jira command. No domain discovery, receipt proof or admission. [Limits and recovery](docs/manager-preview.md#inspect-named-jira-issues) |
| Local multi-project configuration validation and change preview | Implemented in source and prepared validator; no provider writes or live readiness |
| Customer-owned Lambda preview with retained DynamoDB State | Source package/template and bound operator tools; initially disabled and write-free. Human/installed acceptance and live permission verification remain separate; no sender or activation. [Guide](docs/manager-installation.md) |
| Structured prescribed API/Bruno, PostgreSQL and UI helpers | Bounded helper capability; composed by qa-entrypoint with ordered actual observations and a complete partial ledger |
| Structured Story/Bug implementer with separate job/Jira skills and typed handoff | Prepared capability; structured reviewer and QA receipt handoffs are available; full-loop acceptance remains pending |
| Structured Story/Bug QA composer and standalone qa-jira publisher | Source instruction capability; actual Grok High/helper/clock acceptance and compatible installed/live release remain separate |
| Human-invoked request-rework | Prepared separate skill; requires an existing compatible current QA chain, configured actor and explicit human authorization; no activation |
| Manager-driven admission, repair orchestration and compatible review/QA handoffs | Later coordinated release work |

The current pilot uses Safeguard INT, numbered `AI-Daniel-<digits>` workstreams and
Plexus on `master`; its boards currently isolate `AI-Daniel-1`. These are that
installation's settings, not values to copy into a new customer's setup. Each
assigned Story or Bug names one repository allowed by its prepared environment.

## How the installed workflow moves

| Jira stage | Owner and result |
| --- | --- |
| In Progress | Implementer plans with High, obtains one independent High plan review, implements with Medium, opens or updates one PR, verifies current CI/artifacts, then publishes/read-backs a typed record before In Review. Known dependency wait goes to Rework Queued; human blockers to Blocked. |
| In Review | Independent High reviewer checks ticket and PR; verified approval moves it to QA. |
| QA | High QA agent runs the ticket's named skills and prescribed cases, retaining evidence; success moves the open PR to Human Review. |
| Human Review | Responsible developer and human QA reviewer assess the PR before human merge; explicitly authorized in-scope findings can use request-rework to record and queue the same open PR. |
| Product Acceptance | Human acceptance after deployment to UAT. |
| Done | Verified production deployment. |

The [structured reviewer](skills/pigboard-pr-review/SKILL.md) consumes the implementation record and queues all confirmed repairs on the same PR through [reviewer-jira](skills/reviewer-jira/SKILL.md); verified current approval permits QA. The [QA composer](skills/qa-entrypoint/SKILL.md) retains prescribed helper results and delegates canonical handoff to [qa-jira](skills/qa-jira/SKILL.md); confirmed defects and causal upstream waits queue on the same PR. Saved wiring and live acceptance still require their separate gates before activation. Missing access,
incomplete instructions or required scope expansion blocks the ticket for a human.
Discussion stays in Review or QA. [request-rework](skills/request-rework/SKILL.md)
verifies current completed QA, records human findings and queues only that ticket.
Active work continues; later manager admission remains separate. Workers do not
select new work, merge, deploy or
retry blocked work. The planned manager changes admission and repair routing only
when its coordinated release is implemented and accepted. See the
[installed workflow](docs/workflow.md) for current contracts.

## What is in this repository

- `skills/`: complete skill folders, references and prepared QA helpers.
- `config/skill-bundle.json`: the installation allowlist.
- `scripts/`: deterministic skill preparation, installation and reviewer CLI setup.
- `config/cursor/` and `config/jira/`: prompts, setup records and rule exports.
- `test/`: installation, refresh, failure and bootstrap checks.
- `docs/architecture/`: current target designs and discovery evidence.

## Fetch the skills outside the application repository

Follow [the installation guide](docs/install.md). It covers obtaining a pinned
checkout, prerequisites, bundle preparation, verified Cursor installation and
success receipts. Shared skills stay outside the target application's checkout.
The root package is private; distribution uses these Git-based scripts.

## Refresh and recovery

Follow [refresh, rollback and removal](docs/install.md#refresh-rollback-and-removal).
An agent consumes its prepared snapshot. Operators change the source pin and
verify the Build before an authorized activation. A failed Build can leave an
older snapshot selected.

## Author an Epic, Story or Bug

Use [write-pr-sized-stories](skills/write-pr-sized-stories/SKILL.md), its
[versioned ticket guide](skills/write-pr-sized-stories/references/pigboard-ticket.md)
and [examples](skills/write-pr-sized-stories/references/pigboard-example.md).
The writer emits full editable YAML with plain prose, separate AI/human cases
and explicit unresolved inputs. See [authoring and local validation](docs/authoring.md)
for the Epic route, templates, trusted facts and actual checks. Generic research
and design remain Tasks. The [implementer composer](skills/implementer-entrypoint/SKILL.md)
accepts current structured Story/Bug assignments and separates job evidence from
verified Jira publication. The reviewer and QA composer consume canonical current receipts.
Compatible saved wiring, full-loop acceptance, manager admission and activation
remain separate work; old prose tickets are not automatically converted.

## Cursor automations

Use the versioned prompts and prepared capabilities described in
[installation](docs/install.md#cursor-environment-setup) and
[agent usage](docs/using-pigboard.md). The
[automation matrix](config/cursor/automations.md) owns the pilot's selected pins,
Build evidence, inactive states and remaining acceptance work.

## Validation and status

Contributors run `npm ci --ignore-scripts --no-audit --no-fund` then `npm test`.
Fixture checks do not prove live npm, Cursor, Jira or Bitbucket behavior.
Prepared skills, a successful Build, published code, enabled automation and a
completed real Story are separate outcomes. Jira owns current progress; setup
records retain dated evidence.

## Target architecture and first manager release

The owner ratified the target diagrams on 14 November 2026. They show the eventual
product; the [architecture map](ARCHITECTURE.md) separates installed behavior,
first-manager scope and follow-on capabilities.

[First manager scope](docs/architecture/manager-release-one.md) ·
[State and upgrades](docs/architecture/manager-state.md) ·
[Stack repair](docs/architecture/manager-stack-repair.md) ·
[Discovery progress](docs/architecture/manager-discovery.md) ·
[Ordered Jira work](docs/architecture/manager-release-one-plan.md) ·
[Architecture guide](docs/architecture/target/review-guide.md) ·
[Downloadable walkthrough](docs/architecture/target/index.html)

The first manager is planned for customer-owned AWS Lambda and DynamoDB. Existing
Jira rules continue to launch Cursor. Scuba Pig receives no customer runtime data
or credentials. Monitoring and duplicate-launch prevention are later work.

![One delivery loop — target architecture](docs/architecture/target/01-system.svg)

<details>
<summary>Inside the manager</summary>

![Inside the manager](docs/architecture/target/02-manager.svg)

</details>

<details>
<summary>Admission rules</summary>

![Admission rules](docs/architecture/target/03-admission.svg)

</details>

<details>
<summary>Worker handoffs</summary>

![Worker handoffs](docs/architecture/target/04-handoffs.svg)

</details>

<details>
<summary>Separate skills</summary>

![Separate skills](docs/architecture/target/05-skills.svg)

</details>

<details>
<summary>Workstreams and capacity</summary>

![Workstreams and capacity](docs/architecture/target/06-workstreams.svg)

</details>

<details>
<summary>Stack repairs</summary>

![Stack repairs](docs/architecture/target/07-rework.svg)

</details>

<details>
<summary>Pausing an Epic</summary>

![Pausing an Epic](docs/architecture/target/08-pause.svg)

</details>

<details>
<summary>Future worker visibility</summary>

![Future worker visibility](docs/architecture/target/09-observation.svg)

</details>

## License

Pigboard is licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE)
for retained copyright notices. Third-party dependencies retain their own licenses.

The [engineering skills guide](docs/engineering-skills.md) explains the focused planner,
codebase investigation, design, diagnosis and author-verification methods. Their
comparative effectiveness has not yet been measured.

The [structured helper guide](docs/using-pigboard.md#prescribed-structured-qa-helpers)
explains exact inputs, preparation and recovery. API owns one Bruno child;
PostgreSQL uses parameterized two-hop bindings; UI retains prescribed screenshots.
Missing prerequisites return inability, demonstrated mismatches return defects.
Helpers do not move Jira or run human cases. The [QA composer](skills/qa-entrypoint/SKILL.md)
now supplies their structured inputs, inspects actual outputs and retains every
partial row. Its source presence does not prove actual model/helper/clock behavior
or activate delivery.

## Publish an already prepared QA assessment

The standalone [qa-jira skill](skills/qa-jira/SKILL.md) checks current native QA
Story/Bug authority, validates the complete supplied ledger and publishes one
verified handoff. Prepare current assignment/review/open-PR/CI evidence, accessible
artifacts, same-release validators and configured Jira actor/append/read/direct
transition access first. [Direct use and recovery](docs/using-pigboard.md#publish-prepared-qa-evidence)
cover preflight and final modes. It runs no QA helpers. The compatible qa-entrypoint
composes ordered execution with one final publisher call. Install all siblings from
one reviewed release; actual Grok High, bounded clock and qualified helper execution
need their own evidence. Installed/live release acceptance and automation activation
remain separate gates.

Inspect an ordinary supplied comment from source or a complete prepared copy with the pure [handoff candidate API](docs/manager-preview.md#inspect-a-supplied-handoff-comment). It distinguishes ordinary content, one canonical candidate and malformed attempts without provider calls, writes or receipt authority.

### Complete ordinary Jira facts from source

The source library `lib/jira/inventory.mjs` collects complete bounded native Jira
membership, occupancy, original descriptions/comments and required exact typed
references. Supply confirmed retained inventory and the prepared canonical read
configuration/resolver. Safe reports distinguish complete, isolated holds and
shared holds; private observations remain in memory. Confirmed pointer absence
requires a successful property-key enumeration; a 404 remains unknown.
See the [inventory guide](docs/manager-preview.md#complete-ordinary-jira-inventory-library)
for prerequisites, use and recovery. Core PGB-162 owns semantic normalization and
selection; the [AWS preview package](docs/manager-installation.md) composes these source APIs. Installed acceptance remains separate.
This library neither authenticates receipts nor performs admission or activation.

The [ordinary recorded preview](docs/manager-preview.md#ordinary-recorded-policy)
uses explicit `--mode ordinary` and snapshot/v2 in source and the prepared validator.
It selects ordinary work from supplied complete facts, holds required repair and
reports hidden external PR changes as outside its proof. Existing v1 fixture repair
preview remains available without the mode flag. Neither route writes or activates
delivery. The source AWS wrapper composes173/State/ordinary policy; designated human and installed acceptance remain separate.
