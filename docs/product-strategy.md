# Ski Stack product strategy and positioning

21 September 2026. Conversation decision record and positioning hypotheses.
The owner endorsed the product direction below. Customer demand, differentiation,
pricing and marketing claims remain unvalidated. This records an evolution of the
owner's original vision; the assistant helped articulate it. It is not a shipped
feature list, a completed product design or a reviewed replacement delivery plan.

## Endorsed product direction

Ski Stack is a team-owned delivery service: give it a feature, and it returns
small, reviewed changes that satisfy an agreed product outcome, involving the
team at the decisions that matter.

The intended customer is an engineering lead with an existing application,
quality standards and developers already using coding agents. This initial
customer focus is a positioning proposal, not customer-research evidence.
The recurring burden is coordination between agent sessions: clarifying work,
checking assumptions, preserving decisions, handing over context, ensuring the
right reviews occurred, recovering failures and establishing readiness.

The proposed customer promise is less human supervision per accepted feature,
with scope, quality, cost and remaining uncertainty visible. Kanban integration,
configurable execution providers, role packages and MCP remain enabling
capabilities from the original product definition.

The owner's repeated interventions during development illustrate the problem:
review the design before grooming; keep Stories small; review the implementation
rather than treating plan review as code review; continue authorized work.
Productizing a configurable process that reliably follows those rules could
remove this burden. The contributor working agreement does not become a fixed,
mandatory workflow for every customer.

## Intended customer experience

A teammate submits: “Customers need to export their invoice history. Start with
the smallest useful version.” The existing board or a control agent can initiate
work. Neither a mandatory executive bot nor a new chat interface is required.

1. Product and engineering roles investigate the need, code and constraints.
   They expose disagreements and unresolved evidence instead of manufacturing
   consensus. Routine routing and eligibility remain deterministic code.
2. The team receives a concise decision: for example, CSV for the current
   filtered view now, with historical bulk exports as a later increment. The
   recommendation includes evidence, tradeoffs and the decision owner.
3. Reviewed design becomes dependency-ordered PR-sized Stories and reviewed
   implementation plans. Configured agents execute within scope and budget.
4. Each increment includes what changed, how to try it, requirement coverage,
   verification evidence, limitations and the actual reviewed revision.
5. Authorized teammates can inspect, steer and take over from shared state;
   they need not reconstruct another person's private conversations.

Human acceptance and merge/release authority remain explicit. Independent
review reduces risk; it cannot guarantee correctness. Objective gate conditions
are checked in software, while product judgment and subjective quality remain
judgments with evidence and accountable decision owners.

## Capabilities that could earn a product's price

- **An executable team playbook.** Versioned roles, review criteria, Story
  boundaries, required evidence and human decisions. Teams can install and
  adapt a supported process instead of wiring every handoff themselves.
- **Intent linked to implementation.** Requirements, decisions, designs,
  Stories, tests and reviews refer to the work they cover. Changed acceptance
  criteria or commits expose affected downstream work and stale approvals.
  Semantic impact analysis remains fallible: distinguish known links from
  agent inference and unresolved impact. This needs focused discovery/design.
- **Useful decisions with less interruption.** A shared view answers what
  finished and proves it, what needs a decision and the recommendation, what is
  blocked and who can help, and what changed in scope/cost. Recoverable failures
  and routine handoffs proceed within configured authority and operating limits.
- **Delivery that survives handoffs and failures.** Keep accepted work and
  recover the unfinished operation. Make ownership and uncertain external
  effects visible; do not promise universal exactly-once execution.

These are product hypotheses. They are not demonstrated competitor omissions.
Provider choice supports the customer promise; it is not sufficient differentiation.

## Proposed marketing

Candidate headline: **Delegate the feature. Stay in control of the decisions.**

Candidate supporting copy: **Ski Stack takes work from product discovery to
small, reviewed pull requests, using your team's standards, existing board and
chosen coding agents. See what is ready, what needs a decision and why.**

These are future positioning drafts, not claims ready for a live marketing site.

Lead demonstrations with one completed feature journey and the human effort it
required. Show a real requirement change, a product/engineering disagreement,
a recovered failure and the final acceptance evidence. Agent counts, diagrams,
leases and webhook configuration belong in supporting technical material.

## Competitive evidence checked on 21 September 2026

### Atlassian

Atlassian's September 10 announcement describes organizational code context,
agent governance, backlog-to-PR agent loops, shared standards, AI review and
measurement of delivery impact. It explicitly includes developer and product
manager review. The announcement says agent loops, Standards and AI Review are
in private early access; other capabilities have separate rollout stages.
Source: [governed agent loops](https://www.atlassian.com/blog/jira/governed-agent-loops).

Our proposed emphasis is an opinionated, installable delivery service for teams
that want an established process with little assembly. Its distinctive experience
would include product/engineering challenge, small complete increments, changes
that invalidate specific prior evidence, and a concise shared decision view.
This emphasis is an inference about positioning, not proof that Atlassian cannot
provide it. Governance, planning, shared context and review alone are not unique.
Jira can remain the customer's board and an integration partner.

### Cursor Automations

Cursor documents scheduled and event-triggered cloud agents. Configuration
includes instructions, model, tools and zero/one/multiple repositories. Triggers
include source control, Slack, Linear and authenticated HTTP webhooks. Tools can
include PR creation/review, MCP, computer use and persistent notes across runs.
Team settings support view/edit access and, for admins, running as a shared
service account. Usage is billed as cloud-agent usage, to the creator or the team
pool according to execution identity. Exact entitlements, access and costs for
this account have not been checked in this task.
Source: [Cursor Automations](https://cursor.com/docs/cloud-agent/automations).

A conceptual setup is Jira status/label condition -> authenticated Cursor
webhook -> cloud agent with configured instructions/tools. We have not activated
or verified that complete path. Direct Grokbot event support is a separate
question; Cursor's webhook support does not establish a Grokbot endpoint.

Cursor Automations is both an alternative and a possible execution component
for Ski Stack. Multi-step work can be requested in an automation prompt, so do
not claim it can only perform one step. Its documented shared identity and team
access weaken an earlier hypothesis that team operation is uniquely ours.
The distinction to prove is how much customer assembly and ongoing supervision
Ski Stack removes across the complete accepted feature.

## Defensibility and evidence needed

A different headline is not a moat. Potential defensibility would come from
proven delivery playbooks, effective verification, dependable integrations and
product experience, plus permissioned learning from accepted/rejected outcomes.
Keep customer context private; do not assume cross-customer learning rights.
No durable competitive advantage or willingness to pay has been demonstrated.

Measure human coordination time per accepted feature, including setup and
maintenance. Also track delivery time, rework, defects, failed/duplicate runs,
cost per accepted outcome and the team's confidence in acceptance evidence.
Compare representative tasks with the team's existing tools; faster output is
not a win if quality declines or supervision merely moves elsewhere.

The proposed first compelling release handles one small feature in an existing
repository, through clarification and reviewed implementation in a few dependent
PRs, using one board and execution provider. This is a candidate product scope,
not a newly approved implementation slice or permission to use the company
Cursor account for substantial compute. Current Cursor authority remains trivial
adapter checks only.

## Consequences for the existing plan

The [architecture](architecture-plan.md) and [delivery map](delivery-plan.md)
remain useful technical work. Their earlier reviews establish internal design
quality, not market validation. S01 has a reviewed implementation plan, but that
alone does not establish it as the best next investment under this product thesis.

Before continuing implementation, reconcile the roadmap with the endorsed
outcome, compare how much the current platforms can supply, and review affected
design/plan changes through the standing lifecycle. Preserve useful work and its
historical evidence; do not silently promote these ideas to reviewed requirements
or extend old CLEAN verdicts to changed artifacts. No runtime behavior or external
service was changed while recording this strategy.
