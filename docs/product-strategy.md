# Pigboard product strategy and positioning

Product name chosen by the owner on 21 September 2026: **Pigboard**.
Pigboard is the name used throughout current documentation. Exact historical
evidence and operational compatibility identifiers retain their original names.

21 September 2026. Conversation decision record and positioning hypotheses.
The owner endorsed the product direction below. Customer demand, differentiation,
pricing and marketing claims remain unvalidated. This records an evolution of the
owner's original vision; the assistant helped articulate it. It is not a shipped
feature list, a completed product design or a reviewed replacement delivery plan.

## Endorsed product direction

Pigboard supplies an opinionated AI software development lifecycle (AI SDLC).
It chooses, enforces, operates, validates and improves a supported development
method. Give it a feature, and it coordinates small, reviewed changes against
the agreed outcome, involving people at the decisions that matter.

The owner endorsed this direction on 21 September 2026 and identified the existing
Pigboard process as a working starting point from their experience. Reuse that
process; first settle the architecture, ordered roadmap and core functionality.
Then improve the method through observed delivery outcomes. This is authority
to develop the foundation, not a claim that the hosted product has already passed
end-to-end acceptance or that reliability has been measured across customers.

The intended customer is an engineering lead with an existing application,
quality standards and developers already using coding agents. This initial
customer focus is a positioning proposal, not customer-research evidence.
The recurring burden is coordination between agent sessions: clarifying work,
checking assumptions, preserving decisions, handing over context, ensuring the
right reviews occurred, recovering failures and establishing readiness.

The proposed customer promise is a dependable development method the customer
can delegate to, with less supervision per accepted feature and visible scope,
quality, cost and uncertainty. Kanban integration, supported execution providers,
role packages and MCP enable that promise. Ease of setup matters, but does not
by itself capture the product's responsibility for the complete process.

The owner's repeated interventions during development illustrate the problem:
review the design before grooming; keep Stories small; review the implementation
rather than treating plan review as code review; continue authorized work.
The product should take responsibility for those handoffs. Customers supply
product goals, domain constraints, repository conventions, budgets and approval
authority. Pigboard maintains the supported method and its integration boundaries.
Configuration adapts the method to that context; an unrestricted workflow builder
is not the product goal. The contributor agreement remains a development rule;
customer-visible steps and fast paths must be explicitly designed and tested.

Reliability is a target to earn through evidence. A supported process must enforce
its gates, preserve completed work, expose uncertainty and make recovery clear.
It cannot promise that every feature is correct or commercially successful.

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

- **A maintained development method.** Versioned roles, review criteria, Story
  boundaries, required evidence and human decisions, with a supported path through
  them. Pigboard owns that path; customers configure their context and authority.
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
- **Measured process improvement.** After the foundation carries the existing
  method, use interventions, rework, defects and accepted outcomes to guide
  changes. Test and version changes before rollout. A general experimentation
  platform or automatic process rewriting is not part of the first foundation.

These are product hypotheses. They are not demonstrated competitor omissions.
Provider choice supports the customer promise; it is not sufficient differentiation.

## Proposed marketing

Candidate headline: **A development process you can delegate to.**

Candidate supporting copy: **Pigboard runs a disciplined AI development process,
from product discovery to small, reviewed changes. We maintain and improve the
method; your team directs the product and decides what ships.**

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
for Pigboard. Multi-step work can be requested in an automation prompt, so do
not claim it can only perform one step. Its documented shared identity and team
access weaken an earlier hypothesis that team operation is uniquely ours.
The distinction to prove is how much customer assembly and ongoing supervision
Pigboard removes across the complete accepted feature.

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

### Deeper competitive investigation

The [build-versus-buy report](research/2026-09-21-competitor-build-versus-buy.md)
compares three assembly routes, twelve lifecycle requirements and eight tests
that could change the product decision. Its [source ledger](research/2026-09-21-competitor-sources.md)
separates current documentation, announcements, account observations and a single
user anecdote. No full native or Pigboard feature journey was executed.

The research first narrowed the proposed differentiation to installing and
operating a complete delivery playbook. The owner's subsequent decision expands
the responsibility to **maintaining and improving an opinionated AI SDLC**.
Cursor already has a Jira Marketplace app, role packages and hosted automations;
Atlassian has an agentic workflow template, attention views and native review.
An agent UI, reusable prompts, webhook routing or a Jira plugin alone is therefore
insufficient evidence of differentiation. The candidate benefit is reduced setup,
maintenance and coordination per accepted feature, with comparable quality.

The owner specified **Jira adapter first; installable Jira app later**. Reuse
native capabilities where they satisfy the supported method, and compare them
when resolving a concrete integration choice. The owner has chosen to develop
Pigboard's foundation now; a complete native-versus-package experiment is not a
prerequisite to that authorized work. Customer demand and willingness to pay
remain unverified and matter for commercial rollout.

[D0 product discovery](tasks/architecture-decisions.md#d0--test-the-product-need)
remains later commercial discovery. It must separate workflow burden and buying
evidence from enthusiasm about a demo, but does not block settling or building
the core. Dogfooding gives process evidence without claiming market validation.

### Roadmap consequence

The [architecture](architecture-plan.md) and [delivery map](delivery-plan.md)
remain the foundation. Their earlier reviews establish internal design quality,
not market validation. S01's offline setup/route preview remains the selected
first increment because it supports M1 before live execution, with an already
reviewed contract and bounded implementation plan.

The order is architecture/roadmap alignment and core integration decisions,
small usable foundation slices, the existing lifecycle on that foundation, then
measured method improvements. Review the affected design/queue changes and recheck
the selected Story against current code before implementation. Preserve historical
evidence; do not extend old CLEAN verdicts to changed artifacts. The research's
inactive Cursor draft side effect remains disclosed in its report; this direction
update changes no runtime or external service.
