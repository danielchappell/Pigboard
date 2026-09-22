# Ski Stack: build-versus-buy research

21 September 2026. Product and technical discovery, not a release claim or an
approved replacement architecture. Current vendor docs, dated announcements,
one explicitly qualified user report and limited account UI observation inform
this report. No complete feature journey was executed. The
[source ledger](2026-09-21-competitor-sources.md) records evidence and uncertainties.

## Decision in brief

**There may be a product in installing and operating a complete delivery process
for an existing team. The evidence does not yet justify a general orchestration
SaaS, and a Jira plugin alone would not distinguish us.**

Cursor and Atlassian already provide much of the proposed foundation: cloud
execution, specialists, team access, Jira integration, code review, reusable
instructions, automation and progress views. Atlassian also offers a configured
agentic-engineering project template. Our comparison must include those features,
not a deliberately weak webhook-to-chat example. [C1, C2, C3, C4, A2, A8, A11]

The strongest candidate customer promise is: **choose your existing project,
repository and delivery playbook; Ski Stack checks readiness, installs the
supported process, keeps work moving and shows the decisions you need to make.**
The value to prove is lower setup, maintenance and supervision effort per accepted
feature, without more rework, defects or unexpected cost. Legitimate admin and
source-code permissions remain necessary. “Plug-and-go” should mean guided,
validated setup with little assembly, not literally no configuration.

Treat the Jira adapter as the first integration boundary, as the owner requested.
Defer Marketplace packaging. Before revising implementation priorities, compare a
supported native/package solution against the specific responsibilities we propose
to own. A reusable package or supported setup service may be the right product;
a hosted coordinator needs evidence of recurring operational problems.

## Evidence rules and comparison target

- **Documented:** an official source describes a capability or restriction.
- **Observed:** a specific UI state in this account, not a universal entitlement.
- **Inferred:** a likely integration burden or implementation approach.
- **Unresolved:** public evidence did not establish behavior; this is not absence.
- **Anecdotal:** a user's own report, not independent execution evidence.

The target is one existing Jira project, an opted-in feature, one repository,
product and engineering investigation, reviewed design, small dependent Stories,
reviewed plans, implementation, independent committed-code review and owner
acceptance. It must support changing requirements, partial failures and a second
teammate. Routing is deterministic. Human assignees remain intact. A control
agent may use MCP; it is optional. The development working agreement guides how
we build Ski Stack; customer playbooks must remain configurable.

The company Cursor account is limited to trivial adapter checks. This research
launched no agents and ran no paid model task. Opening Cursor's editor did create
one empty inactive draft; the exact observation is recorded below.

## 1. What Cursor actually offers

### Native Cursor in Jira

This is already a Marketplace installation, not something the customer must write.
Cursor documents Teams/Enterprise, Jira Commercial Cloud with Rovo, and both Jira
and Cursor administrative setup. The connection can use a service identity or
individual account linking. Users assign work or mention `@Cursor`; mentions
allow us to preserve the human assignee. Progress and the PR return to the ticket.
Repository/branch/model selection can be explicit or use configured inference.
[C1](https://cursor.com/docs/integrations/jira)

A practical setup route is: obtain the relevant admin approvals; install/connect
the app; authorize source control and repositories; choose execution identity and
billing; configure routing; prepare the repository environment; then validate one
small task and its returned progress. Having an app available does not mean this
account already has these permissions or installations. [C1, C5]

### Cursor Automations

An Automation stores a trigger, instructions, tools, model and environment. It
runs a Cloud Agent on a schedule or event. An authenticated inbound webhook lets
Jira send a status/label event. Generic Automations do not automatically inherit
the native Jira app's posting permissions: the job still needs an authenticated
Jira tool or API path. Multiple triggers are alternatives, not a dependency graph.
[C2](https://cursor.com/docs/cloud-agent/automations)

The same system already supports team viewing/editing and admin-selected service
accounts, persistent notes, MCP tools and PR operations. Accordingly, shared
execution, memory and basic observability are not uniquely ours. Changing the
execution identity requires webhook-key regeneration and reconfiguring personal
integrations. Treat those as deployment steps, not merely changing a label. [C2]

Cloud agents support custom specialist subagents and reusable repository/plugin
instructions. Separate contexts and role/model configuration can express product,
architect and review roles. Hooks can enforce objective conditions, but cloud
hooks have documented gaps, including early read-only turns and unavailable
MCP-specific/session hooks. Model selection is subject to account/admin support;
configured reviewer models require execution evidence. [C3, C4, C6]

Cursor also provides PR Routing & Approval with repository policy files and
signals from its review tools. It can wait for those checks before approval;
it is explicitly not a substitute for full code review. This further weakens a
generic claim that Ski Stack uniquely turns standards into review gates. [C15]

### Three programmatic surfaces that must not be confused

| Surface | Established capability | Boundary to investigate |
| --- | --- | --- |
| Automation definitions/webhooks | UI, templates and `/automate`; authenticated inbound POST | No supported public definition create/update/export API was established; payload-to-run identity, deduplication and timeout recovery need a supported contract or test. |
| Cloud Agents API v1 | Public-beta agents/runs; caller agent ID; duplicate-create conflict; polling and resumable SSE | Caller agent ID conflicts with session env vars; v1 completion webhooks are forthcoming; legacy v0 callbacks are a different contract. |
| In-agent Cloud MCP | Run/transcript details, agent listing and automation metadata | Available inside Cloud Agent runs; non-admin access is to own runs; it is not evidence of an external automation-management API. |

Sources: [C2](https://cursor.com/docs/cloud-agent/automations),
[C7](https://cursor.com/docs/cloud-agent/api/endpoints),
[C8](https://cursor.com/docs/cloud-agent/capabilities),
[C9](https://cursor.com/docs/cloud-agent/api/webhooks).

A dated August 13 Cursor forum response says external automation listing/history
export was unavailable. Current in-agent diagnostics make a blanket “no API or
observability” claim inaccurate. This is a fast-moving boundary to verify before
choosing Automations as the managed service's backend. [C10, C11]

## 2. How Atlassian is meant to be used

There are several distinct products and surfaces, not one interchangeable “Rovo.”

| Surface | Intended use | Availability/evidence boundary |
| --- | --- | --- |
| Rovo/Studio agents and Automation | Non-coding specialist work, configured sources/tools and event-driven actions | Current docs describe both user and agent identities; older automation guidance conflicts with newer Studio guidance. |
| Jira Coding Agent | Hosted implementation from a Jira item or automation | Public setup/session docs with specific account/repository restrictions; distinct from Rovo Dev CLI/review. |
| Third-party coding agents in Jira Automation | Invoke installed Cursor/Claude/Copilot integrations from item/field events | Documented beta; schedules unsupported on this action path. |
| Rovo Dev PR review | Review code and Jira acceptance criteria using repository instructions | Existing documented service; some checks require Rovo Dev Standard. |
| September Agent loops + Standards + AI Review | Select backlog work, execute/test, return PRs under organizational standards | September 10 announcement says private early access. Do not equate with the existing review product or assume tenant access. |
| Code Context | Repository intelligence within Atlassian context | Open beta/rollout, optional to a basic coding integration; additional setup/data boundaries. |

Sources: [A1, A4, A5, A6, A7, A8, A15, A25] in the source ledger.

A customer can start with its existing project or the **Agentic engineering**
space template, which already supplies workflow, example data and onboarding
tasks. Recommended automation templates also have a setup wizard. Rovo can turn
an idea into proposed work items, split them and add acceptance criteria. This
weakens a simple claim that we uniquely package agents or ideation into Jira.
[A2](https://support.atlassian.com/jira-software-cloud/docs/use-the-agentic-engineering-template-to-integrate-coding-agents-in-your-workflow/),
[A3](https://support.atlassian.com/jira-software-cloud/docs/create-work-items-with-rovo/), [A16]

The team then configures permitted agents and sources, statuses and approval
points, source-control connections, coding environments and review policy. Rovo
role agents can handle product/design work; native or external coding actions
handle implementation; Jira approvals and repository protections govern human
release decisions. This is a plausible assembly of our process, not proof that
the entire process is preconfigured or has been tested. [A4-A10]

Premium/Enterprise Automation also includes parallel branches, delays and bounded
loops. Evaluate those before assuming every handoff or review loop requires a
separate engine. [A26]

Atlassian already provides an attention view grouped by Needs input, Working and
Finished. Rovo Dev can match PRs against Jira criteria, apply
`.rovodev/.review-agent.md`, and review new commits. A dashboard, file-based
standards, or “checks intent against code” is therefore insufficient positioning.
[A8-A12, A24]

## 3. How we would build the desired experience with their tools

These are implementation recipes for evaluation. No route below is live-verified,
a complete architecture approval, or authorization to change company systems.

### Route A — Native Jira/Atlassian with Cursor as the coding agent

1. Choose the existing project's opt-in marker, workflow stages, artifact
   locations and human approval points. Avoid migrating the team just to use a
   template; inspect what can be reused in place.
2. Enable the eligible AI features and connect the chosen native/third-party
   coding agent with the required admin and source-control permissions.
3. Configure product/research/design agents and prompts. Use explicit artifact
   references and review output conventions rather than depending on chat memory.
4. Use Jira Automation conditions to select the next stage. Configure agent
   actions for discovery/review and coding; use the documented third-party
   action where available, or an authenticated external webhook where appropriate.
5. Configure Story creation, dependency links and approvals. Use repository
   checks for objective PR/revision constraints and protected merge.
6. Enable the chosen review product, custom standards and acceptance checks.
   Test that its actual coverage satisfies the team's independent-review policy.
7. Record run/artifact identifiers and exception handling. Verify a second
   person's real ability to inspect and continue work, not only see its ticket.

This minimizes custom infrastructure and uses Jira's native experience. The
integration burden is the identity/context boundaries and the configuration of
the whole process. The new private-access loop is another candidate, but its
full contracts and this tenant's access are unresolved. [C1, A2-A13]

### Route B — Jira rules plus Cursor Automations and a process package

1. Prepare a working Cloud Agent environment and a versioned package of role
   instructions, skills, output formats and appropriate objective checks.
2. Create the needed stage automations with explicit repository, tools, model,
   identity and permissions. Prefer a small supported setup before a large graph.
3. Map Jira project/status/opt-in conditions to authenticated webhook endpoints.
   A stage result publishes its artifact and a deliberate next-state update.
4. Give jobs a scoped Jira read/write path, and capture ticket, input revision,
   agent/run identity and resulting artifact/review revision in a shared record.
5. Retain source-control protections; use separate reviewer contexts and validate
   the required evidence. A model saying “CLEAN” cannot alone authorize a stage.
6. Use native views where adequate; document how an operator resolves unknown
   launch outcomes, interrupted runs, stale results or failed Jira publication.

This could already be a good product as a supported package. Its recurring work
includes installing/upgrading several configurations, mapping environment and
identity, and correlating runs. Lack of a public automation-definition API may
make reproducible provisioning harder, but `/automate`, templates and private
packages must be evaluated before declaring it impossible. [C2-C11]

One August forum participant reports a roughly 15-node Jira-label-triggered
idea-to-deployment graph and difficulty building an external operator view.
That is unusually relevant qualitative evidence, but it is one self-report,
not a verified product limitation, market size or willingness to pay. [C12]

### Route C — Thin Ski Stack Jira adapter and managed coordination

Use Jira for shared work/decisions, established Cloud Agents for execution, and
only the measured missing lifecycle responsibilities in Ski Stack. The adapter
normalizes project/status/label/dependency facts and performs permitted ticket
updates; the deterministic policy remains in core. Inputs can initially arrive
through one scoped automation/webhook or a reconciliation scan. The concrete
choice depends on available access and a reviewed contract, not on saving a few
Jira steps.

A direct provider API offers an explicit run contract for a coordinator. Cursor
v1 is a candidate with stable creation identity and polling; its beta/version,
identity and session-environment constraints still need to fit the customer.
Automations may be a better execution component if their external correlation
and provisioning contracts are sufficient. Neither has been selected here. [C7]

Candidate service responsibilities are installation/readiness diagnostics,
versioned process configuration, evidence tied to exact inputs, progress across
dependent Stories and recovery of unfinished effects. Existing platform retries,
permissions, code execution and review tools should be reused. A second queue,
transcript store or dashboard must earn its complexity through the comparison.

This route has the greatest operating burden for us: storage, tenancy,
credentials, upgrades, access checks, support and failure recovery. It only wins
if it removes more burden from customers than it introduces. An integration-kit
or setup service is a legitimate outcome if the custom runtime is unnecessary.

## 4. Requirement-by-requirement comparison

“Assembly” below means existing ingredients need configuration or glue; it does
not mean the competitor lacks the capability. “Unresolved” needs verification.

| ID / intended outcome | Cursor-based route | Atlassian-based route | What remains to prove for Ski Stack |
| --- | --- | --- | --- |
| R1 Deterministic opt-in/status routing; human assignee | Jira conditions/webhooks; native mentions preserve assignee | Conditions and native/third-party actions | Correct mapping, permission checks and duplicate-event behavior in the actual project. |
| R2 Product and engineering specialists | Custom subagents/packages | Rovo/Studio role agents | Useful challenge and complete context; roles alone are already available. |
| R3 Reviewed design before grooming | Prompts, separate contexts, checks | Staged agents/conditions/approvals | Required independent evidence covers the current artifact. |
| R4 Small dependent Stories | Skills and Jira tools | Work-item creation/splitting/links | Usable sizing and correct dependencies, not merely more tickets. |
| R5 Reviewed implementation plan | Specialist/check configuration | Specialist/check configuration | No launch when required plan evidence is missing or stale. |
| R6 Review actual committed code | Subagents, hooks, PR review/policies | Rovo Dev, AC checks, every-commit review | Our coverage/reviewer requirements and exact-commit readiness. |
| R7 Requirement-change handling | Change events and process logic | Change events and process logic | Affected design/plan/review invalidation and understandable human decisions. |
| R8 Laptop-off and team takeover | Hosted runs/team automations; cross-user details depend on role | Hosted sessions visible; initiating-user-only sandbox restriction | Authorized continuation without original person's private session. |
| R9 Recovery without repeating completed work | Durable API runs; Automation response contract unresolved | Step-level retries already present | Ambiguous external effects and publication-only recovery across systems. |
| R10 Installable/upgradable process | Plugins/marketplace, environment files, templates | Agentic template, JSON flows, Forge agents | Measurably easier installation in an existing project, drift-safe upgrades. |
| R11 Shared decisions and agent control | Team UI; in-agent Cloud MCP | Session attention view and dashboards | Complete feature/artifact view with useful explanations; a new dashboard alone is weak. |
| R12 Scope, permissions and operating cost | Identity/tools/billing controls | Org/agent/SCM/flow controls and separate meters | Least necessary access, predictable responsibility, measured cost and limits. |

Evidence: Cursor [C1-C11, C15]; Atlassian [A2-A15, A17-A20, A24-A26]. These comparisons describe
building blocks, not a measured winner. No claim of guaranteed quality or
universal exactly-once execution is warranted.

## 5. Real limitations and integration messiness

| Finding | Evidence class | Practical consequence |
| --- | --- | --- |
| Cursor Jira install needs both Jira and Cursor admins, eligible plans and repository authorization | Documented C1 | A plugin can guide and validate this; it cannot remove legitimate admin consent. |
| Cursor generic automation jobs need their own Jira-capable tool/identity | Inferred from C1/C2 separation | Installing the native Jira app is not proof every unrelated job can post or transition arbitrary tickets. |
| Public Automation provisioning/run-correlation contract was not established | Unresolved; dated vendor statement C10 | Verify before promising unattended install/upgrade or external run management. |
| Current Cloud MCP already exposes run/automation information | Documented C8 | Do not present “no observability” as the gap; access and external consumption matter. |
| Cursor hooks have cloud gaps; model selection can fall back | Documented C3/C6 | Verify required enforcement/reviewer identity at runtime; configuration alone is not evidence. |
| Jira Coding Agent in Automation excludes Teamwork Graph/Confluence context | Documented A6 | Pass required design context explicitly through a supported path; interactive capability is not proof of automation access. |
| Jira Coding Agent sandbox is initiator-only and expires after seven inactive days | Documented A13 | Shared ticket visibility is not shared live-session takeover; retained PRs are a separate output. |
| Rovo Dev skips certain files and may skip very large diffs; AC extraction skips an empty description | Documented A8/A9 | Coverage must be inspected; no comments is not evidence that every requirement/file passed review. |
| Jira flow export/import needs global admin and instance mapping; connections are separate from flow ownership | Documented A17/A18 | A reusable JSON file is useful but not a complete portable installation. |
| Jira can retry temporary failures from the failed step for seven days | Documented A14 | Reuse this; separately test externally accepted work whose acknowledgement was lost. |
| Newer Rovo identity/write-tool docs differ from older read-only automation guidance | Conflicting docs A4/A5 | Verify target surface and rollout; do not claim universal text-only or personal-user limitations. |
| Native agent templates, attention views and setup wizards already exist | Documented A2/A11/A16 | A credible setup advantage must be demonstrated against these, not against manual setup from scratch. |

The number of configuration screens is not a measure of customer pain. Measure
who must intervene, how long setup/recovery takes, how often it recurs and whether
native defaults already make it acceptable. Early-access availability is a current
constraint, not a durable moat.

## 6. Later Jira app: what it could simplify

The owner's order remains Jira adapter first, installable app later. Forge can
subscribe to Jira events, present project configuration/status and connect to a
remote service with installation context and signed invocation tokens. That could
remove copied webhook URLs and per-role rule setup while reusing the adapter.
Forge Rovo agents also support manifest/prompt resources; remote agent connectors
are Preview. [F1-F3, A19/A20]

A plausible later onboarding experience is select project/repo/playbook; authorize
connections; preview status/field mappings and permissions; run a bounded readiness
check; then enable work explicitly. This is a proposed experience, not an approved
architecture or promise that every provider exposes the necessary provisioning API.

A Forge package does not eliminate provider authentication, repo environment setup,
workflow-specific fields, source-control protections, customer data decisions or
our support burden. Forge Remote event requests have a short timeout and retries;
long agent work needs asynchronous handling. Dynamic Jira OAuth webhooks have
separate expiration/refresh constraints. Keep these distinct from ordinary
Automation Send web request behavior. [F2-F4]

## 7. Cost and operational ownership

There are separate meters: Jira deterministic automation steps, Rovo agent credits,
Rovo Dev review credits, external provider usage, and any Ski Stack hosting/support.
Current Atlassian documentation pools automation steps at organization level and
announces extra-step billing from December 3, 2026 at $0.50/1,000 excess steps.
An illustrative 10,000 excess steps is $5 under that announced rate. It is not this
account's bill or proof all agent steps cost that amount. Agentic components meter
Rovo credits separately. [A21-A23]

Cursor Automations consume cloud/model usage, charged to personal or team execution
identity. General service-account API keys have a separately documented Enterprise
entitlement; do not infer that an integration's built-in service identity gives a
Teams customer an equivalent API key for Ski Stack. [C2, C13, C14]

The useful comparison is total setup and maintenance time plus agent/review/retry
usage per accepted feature. Baseline subscriptions, included allowances, optional
add-ons and marginal costs should be separated. No per-feature price or saving is
claimed without workload measurements and actual tenant entitlements.

## 8. What this means for the product

**We should revise the differentiation hypothesis, not discard the owner's desired
experience.** Installing a complete, maintainable process for an existing team is
more credible than selling a generic agent control plane. Candidate value:

- Guided readiness: explain missing permissions, context, environment or workflow
  mappings before work starts, with a named action/owner for each blocker.
- Process consistency: apply the selected playbook across product, design and
  engineering work without repeatedly reminding individual agents of the rules.
- Evidence continuity: link intent, decisions, dependent Stories and current code
  to their review/acceptance evidence, exposing what becomes stale after a change.
- Operational continuity: recover and hand work over without requiring the original
  coordinator to reconstruct the process from private conversations.

Each is a hypothesis about a complete experience, not a claim that no competitor
has an equivalent feature. Configure a native/package baseline seriously. If it
performs similarly, ship the package or setup offering. If repeated maintenance
and recovery require a durable service, build that service around measured gaps.
If teams neither struggle nor pay to remove the struggle, do not build a broad SaaS.

The initial market is proposed: teams with an existing application and board,
already using agents, whose lead spends material time coordinating several stages.
No customer interviews or willingness-to-pay evidence were gathered in this task.
The lone forum account supplies a useful lead for research, not market validation.

## 9. Next evidence that should change the decision

Use the same small feature and acceptance criteria across the strongest available
native route and a packaged route. Start with read-only capability checks and local
fixtures. A meaningful live feature comparison needs an appropriate authorized
account/budget, not expanded use of the company Cursor test allowance.

| Experiment | Observable result | Consequence |
| --- | --- | --- |
| Install into an existing project | Record admin touches, setup time, mappings and successful readiness check; preserve human assignees | If native setup is already simple, packaging alone is a weak product. |
| Run two dependent increments | Record product decisions, all handoffs, reviewed revisions, intervention minutes and accepted behavior | Establish whether a playbook removes supervision beyond good prompts. |
| Change one acceptance criterion mid-flight | Identify which artifacts become stale, what pauses and what can continue | Tests the evidence-continuity hypothesis. |
| Add a commit after review | Demonstrate appropriate fresh review of changed code and no inherited old verdict | Compare with native every-commit review/required checks fairly. |
| Replay a trigger / lose an acknowledgement | Use deterministic fixtures first; distinguish unknown from failed; no accidental second paid job | Establish the actual recovery contract without costly live stress. |
| Fail Jira publication after a completed job | Publish retained result without rerunning completed agent work | Determines whether a small helper or durable service is needed. |
| Hand over to a second non-admin | They can inspect evidence and continue permitted work; missing access is explicit | Distinguishes team-visible metadata from practical takeover. |
| Upgrade the playbook or move to a second project | Detect local edits and changed mappings; do not silently widen authority | Tests whether reproducible maintenance is valuable. |

Measure human coordination time separately from review/decision time we deliberately
retain. Include setup amortization, defect/rework checks, delivery time and marginal
compute. Agree success/failure thresholds before the live comparison; do not choose
a winning metric afterward. Interview actual target teams about the observed burden
and willingness to pay before investing in multi-team billing or a Marketplace launch.

The active queue includes [D0: Test the product need](../tasks/architecture-decisions.md#d0--test-the-product-need)
to carry the customer-burden and buying-evidence decision. Participants and outreach
authority remain unresolved; preparing the guide and using authorized existing
evidence can proceed. Missing interviews cannot be replaced by a technical demo.
An internal dogfooding decision is distinct from a commercial product decision.

The reviewed S01 plan remains valid evidence of technical preparation, not proof it
is the next commercial priority. This research feeds D0/D1/D3/D4 and roadmap
reconciliation. No implementation Story is promoted by this report.

## 10. Account observation and research limits

In Cursor's current team UI we observed Mine/Team, All Runs, templates and sharing
options. Shared service-account execution was disabled for this user; personal
execution was selected. That is account-specific evidence. No permissions changed.

Opening New Automation automatically persisted an empty Untitled **inactive**
draft before Save. It has no trigger, repository or instructions. We never pressed
Test or enabled it. The draft remains inactive at
https://cursor.com/automations/2d47bc3e-b5f7-11f1-bb68-864e54d14197 . This is an
unintended configuration side effect, so the investigation was not entirely
read-only. No agent job was launched and no compute test ran.

INT's existing Jira automation page links to Rovo Studio, which was reachable and
showed automation/agent/template navigation. No Jira flow, ticket or connection
changed. We did not enter a Create flow path. The usage page's displayed timestamp
was from September 20, so it was not used as proof of current allowance. We did not
verify private-access loop availability, installation authority, organization-wide
billing, second-user access, or end-to-end reliability.

## Author assessment against the seven principles

| Principle | Assessment for this investigation |
| --- | --- |
| Intuitive | Distinguishes native Jira integration, Automations, provider API, Rovo agents and Coding Agent; recipes follow the user's journey. |
| Discoverable | Sources, availability, constraints and unanswered tests are linked; humans and agents can trace each comparison requirement. |
| Delightful experience | Targets reduced supervision and usable recovery; admits that native templates may already suffice. |
| Token saver | Deterministic routing stays code; compute is evaluated across whole outcomes, not single calls or superficial output length. |
| Secure | Scope/admin/identity constraints are explicit; no new access was granted; the unexpected inactive draft is disclosed. |
| Agents are equal | Evaluates supported programmatic configuration, inspection and recovery separately from human UI visibility. |
| Dependable | Separates documentation, UI observations, inference, anecdote and live proof; preserves uncertainty and historical reviews. |

Independent review evidence will be recorded in `docs/development-review.md`.
Reviews assess this research and recommendation, not the unexecuted native journey
or a new architecture. Re-check vendor details before implementation.
