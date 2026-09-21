# Ski Stack product definition

Agreed product direction, 20 September 2026. This defines the product to design;
it is not a claim that the SaaS, Jira adapter, or MCP are shipped.
The queue implementation is the GitHub Projects/local Codex MVP. A standalone
[Cursor cloud runner](cursor-cloud.md) now supports explicit plan-mode jobs.

## What Ski Stack is

Ski Stack is a SaaS platform that connects agent teams to Kanban boards so that
work can be coordinated reliably as concurrency and team use grow.

The user's defining requirements are:

- Users can work directly on a Kanban board and make tickets eligible for agents.
- Agents, through Ski Stack, move tickets, document their work, and comment on
  tickets so that the board remains a shared record of progress and results.
- The execution harness or agent platform is configurable. Ski Stack provides
  installable packages for Cursor and Codex.
- Ski Stack provides an MCP interface through which a control agent can inspect
  and interact with the team, create Jira tickets, and support ideation that
  starts the pipeline.

A control agent is an optional conversational entry point. A user moving a card
and an agent submitting work enter the same workflow. Status-to-role routing,
claims, and eligibility are deterministic policy; they do not require an AI
manager. Roles and skills remain independently reusable, as in the current MVP.

The first intended board scope is Jira project INT with the ai-enabled opt-in
label. The core model remains independent of Jira and any execution provider.
Cursor and Codex are intended integration targets; neither is a required product
architecture dependency. The earlier Grok package was an experiment, not a
prerequisite for this product.

## Defining principles

The seven principles and mandatory review procedure in [AGENTS.md](../AGENTS.md)
are authoritative. They come from Rovito; the applications below explain what
they mean for Ski Stack design and are not a separate implementation backlog.

| Principle | Implication for Ski Stack | A question every design should answer |
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
- Ski Stack owns deterministic coordination and the accepted record of a run.
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

## First pilot

The user approved starting with one Jira-to-agent-to-Jira discovery journey.
The [pilot design](pilots/jira-discovery.md) describes the proposed experience,
and the [feasibility findings](pilots/jira-discovery-feasibility.md) separate
verified capabilities from the remaining live checks. This is one team, one
repository, one role, one execution provider, and one active job. The
[provider verification Task](tasks/verify-cursor-discovery.md) produced live API
evidence. The first implementation is the [standalone Cursor job Story](stories/run-cursor-cloud-job.md);
the complete Jira journey remains a later milestone.

## Decisions still to design

These remain open, rather than implicitly approved architecture:

- The first complete board-to-agent-to-board vertical slice and its acceptance
  criteria; the current GitHub MVP rollout is distinct from the Jira/cloud path.
- Production execution credentials and environment lifecycle beyond the initial
  standalone Cursor runner.
- Where shared progress is viewed and what the initial Ski Stack UI must expose
  alongside the Kanban board and runner interfaces.
- The initial concurrency target, durable claim mechanism, and recovery contract.
- Team/workspace membership, connection ownership, and access boundaries.
- Package installation, configuration, compatibility, and upgrade behavior.
- MCP capabilities for ideation, ticket creation, inspection, interruption,
  retry, and completion, including how each reports partial outcomes.
- Hosting, storage, commercial packaging, and support commitments.

Resolve only what the next runnable slice needs. Keep the seven principles as
acceptance criteria throughout discovery, architecture, story definition,
implementation, documentation, and release review.
