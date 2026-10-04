# Pigboard product definition

Product name chosen by the owner on 21 September 2026: **Pigboard**.
Pigboard is the name used throughout current documentation. Exact historical
evidence and operational compatibility identifiers retain their original names.

Agreed product direction, 20 September 2026. This defines the product to design;
it is not a claim that the SaaS, Jira adapter, MCP, or hosted cloud coordination
are shipped.
The existing implementation is the GitHub Projects/local Codex MVP plus the
standalone Cursor command. Hosted Jira/cloud operation is not shipped.

## Current decision — an opinionated AI SDLC

On 21 September 2026 the owner chose Pigboard as a maintained development method:
we choose, enforce, operate, validate and improve the supported AI SDLC.
The existing Pigboard process is the starting method, reported by the owner to
work in their use. First settle the architecture, delivery roadmap and core
functionality, then carry that method onto the hosted foundation and improve it
from observed outcomes. Hosted acceptance and broader reliability remain to prove.

Customers provide product context, constraints and authority; Pigboard supplies
the supported method. Existing adapters, packages and MCP enable that experience.
This supersedes configurability as the main customer promise. Market research
informs commercial rollout without blocking the authorized foundation work.

## Product direction update — 21 September 2026

The owner has endorsed a sharper customer outcome: a team-owned delivery service
that takes a feature through product/engineering discovery to small, reviewed
changes, with humans involved at meaningful decisions. The
[product strategy and positioning record](product-strategy.md) captures that
outcome, candidate messaging, competitive evidence and unvalidated hypotheses.
The integration requirements below remain enabling capabilities. This addendum
is a conversation record; earlier design reviews do not cover it.

## What Pigboard is

Pigboard is an opinionated AI SDLC product, delivered through a hosted service
connecting agents and Kanban boards. Its architecture supports dependable team
operation and a development method that we can test and improve over time.

The user's defining requirements are:

- Users can work directly on a Kanban board and make tickets eligible for agents.
- Agents, through Pigboard, move tickets, document their work, and comment on
  tickets so that the board remains a shared record of progress and results.
- The execution harness or agent platform is configurable. Pigboard provides
  installable packages for Cursor and Codex.
- Pigboard provides an MCP interface through which a control agent can inspect
  and interact with the team, create Jira tickets, and support ideation that
  starts the pipeline.

A control agent is an optional conversational entry point. A user moving a card
and an agent submitting work enter the same workflow. Status-to-role routing,
claims, and eligibility are deterministic policy; they do not require an AI
manager. Roles and skills remain independently reusable, as in the current MVP.

The first intended board scope is the Scubapig Jira Pigboard project `PIG`, with
Task + To Do + the `ai-enabled` opt-in label. The earlier INT pilot was discovery
evidence, not the active site. The core model remains independent of Jira and
any execution provider.
Each Jira connection must let a verified connection administrator for its
owning team and site choose a project and associated board from named options.
An authorized agent has the same structured selection, while a caller without
that administration scope cannot list choices or change the pair. A Jira
credential, profile or ticket cannot grant or widen that authority. The first
pilot selects the `PIG` project and board pair; customers can later configure
more pairs as separate logical connections. Jira credentials may have wider site access,
so Pigboard must enforce its own selected scope on reads and effects.

Cursor and Codex are intended integration targets; neither is a required product
architecture dependency. The earlier Grok package was an experiment, not a
prerequisite for this product.

## Defining principles

The seven principles and mandatory review procedure in [AGENTS.md](../AGENTS.md)
are authoritative. They come from Rovito; the applications below explain what
they mean for Pigboard design and are not a separate implementation backlog.

| Principle | Implication for Pigboard | A question every design should answer |
| --- | --- | --- |
| Intuitive | The normal journey uses familiar tickets, roles, stages, and results. Defaults and status behavior are understandable without learning worker internals. | Can a user predict what happens when a ticket becomes eligible, and where its result will appear? |
| Discoverable | Humans can discover setup, roles, capabilities, and recovery. MCP tools expose clear inputs, current capabilities, structured results, and actionable errors. | Can a new teammate or agent find the supported next action without this conversation? |
| Delightful experience | Setup is reusable; ordinary work avoids repeated questions, duplicate configuration, and confusing handoffs. Shared visibility should reduce time spent searching across tools. | Does this remove a recurring burden for the team, including when something fails? |
| Token saver | Deterministic routing and claims use code. Agents receive relevant task context first, with detail and logs available on demand and omissions explicit. | Does the complete task require fewer unnecessary model calls and less irrelevant context, without hiding evidence? |
| Secure | Team and project access, credentials, delegated capabilities, and consequential actions have understandable boundaries. Ticket text is task data, not authorization to override policy. | Can the intended human or agent complete normal authorized work while being prevented from acting outside its scope? |
| Agents are equal | MCP is a primary product interface for completing supported workflows, not just reading a dashboard. Humans receive readable guidance; agents receive explicit contracts, noninteractive execution, and usable recovery. | Can an authorized control agent finish the workflow through available tools without UI workarounds? |
| Dependable | Runs have honest states and traceable evidence. Duplicate delivery, lost workers, stale results, partial writes, and retries have defined behavior. Board and run discrepancies are exposed and reconciled. | After an interruption, can the team tell what happened and continue without accidentally repeating completed work? |

Do not save tokens by hiding essential information, create delight by concealing
failure, or use security as a blanket justification for avoidable friction.
Agent parity does not require identical human and MCP screens or commands, and
noninteractive execution does not remove necessary human authorization.

## Product boundaries to preserve

- The board remains a direct way to submit, prioritize, inspect, and progress
  work; using a control agent is not mandatory.
- Pigboard owns deterministic coordination and the accepted record of a run.
  Board adapters translate board-specific data and actions. Execution adapters
  integrate with the configured harness. Do not duplicate core scheduling policy
  in each adapter or distribute it across per-role automation rules.
- Installable packages carry versioned roles, skills, and declared capabilities.
  Prompts alone do not enforce claims, isolation, permissions, or safe recovery.
- A shared team experience must make ticket ownership, current work, blockers,
  results, and links to execution evidence understandable to authorized members.
  A separate copy of an agent roster is not proof of shared team operation.
- Existing stage and owner-merge boundaries remain in force until a scoped design
  explicitly changes them. Product aspirations do not authorize deployment,
  credentials, live board changes, or implementation of every future component.

## Design and review procedure

Every product design and implementation plan must describe the normal human
journey, the corresponding agent journey where relevant, success evidence, and
recovery from the failures within that slice's scope.

Assess all seven principles separately in every plan, adversarial plan review,
and adversarial PR review. The author assesses during planning and before the
PR; each independent reviewer assesses independently. For each principle state
how it is met, a concrete gap or tradeoff, or why the slice does not affect it.
A list of names or the author's assessment alone is not an independent review.

Use a brief record such as:

| Principle | Meets / gap / unaffected | Evidence or design decision |
| --- | --- | --- |
| Intuitive | | |
| Discoverable | | |
| Delightful experience | | |
| Token saver | | |
| Secure | | |
| Agents are equal | | |
| Dependable | | |

A CLEAN review requires the assessment and no unresolved in-scope gaps. A design
review is not proof of a working implementation. Changes that expand agreed
scope must be proposed separately; the principles are not a license to expand
work or require speculative infrastructure.

## Architecture and delivery process

The [architecture plan](architecture-plan.md) maps the complete product direction,
current implementation, component ownership, candidate milestones and unresolved
Tasks. Follow [our development workflow](development-workflow.md): independently
review that architecture, then groom its dependency-ordered slices. The active
[delivery plan](delivery-plan.md) records readiness and the next work.

## Existing pilot evidence

The user approved exploring one Jira-to-agent-to-Jira discovery journey. The
[pilot record](pilots/jira-discovery.md) and [feasibility findings](pilots/jira-discovery-feasibility.md)
remain historical evidence. The active [PIG D1 design](designs/pig-jira-connection-discovery.md)
governs the current pilot. The standalone Cursor command from PR #7 is merged,
but repository-backed provider and Jira/cloud acceptance remain open. The
[delivery plan](delivery-plan.md) records the next gates and slices.

Open decisions include hosted state/recovery, Jira identity/permissions, team
access, runner contracts, package lifecycle, MCP authority and operating limits.
Resolve them through scoped Tasks before declaring dependent Stories ready; keep
later architecture at the level needed to preserve the product direction.
