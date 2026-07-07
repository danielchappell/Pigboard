# Ski Stack

Ski Stack is a flat agent-work system:

- **Skills** are reusable on demand.
- **Agents** are portable role cards, not a forced hierarchy.
- **Queues** are optional runtime backends that can drive workers from GitHub
  Projects, Jira, Linear, or another project-management tool.

The first queue adapter target is GitHub Projects. The core model is deliberately
not GitHub-specific.

## What This Replaces

Ski Stack starts from useful Scuba Stack assets but changes the center of gravity.
Scuba Stack assumed one live orchestration window, a chief-of-staff layer, a local
`.scuba/` control plane, and broad subagent fan-out. Ski Stack keeps the useful
skills and worker roles while moving coordination into internet-addressable queue
items with leases.

## Core Shape

```text
Project management tool
  -> adapter
  -> dispatcher
  -> worker role
  -> evidence written back to the work item
  -> adapter transitions the item
```

The project-management record is the handoff object. In GitHub, that means:

- Issue or PR = durable work item
- GitHub Project fields = queue state and routing
- Issue or PR comments = event/handoff log
- Project item fields = lease and worker metadata

## Repo Layout

```text
agents/                         # provider-neutral worker role cards
skills/                         # reusable skill library
src/core/                       # shared types and constants
src/runtime/                    # dispatcher and prompt assembly
src/adapters/github-projects/   # GitHub Projects adapter boundary
src/provisioners/github-projects/
docs/
```

## Worker Loop

1. A webhook or poll wakes the dispatcher.
2. The adapter lists ready work for a worker type.
3. A worker claims one item with a lease.
4. The worker executes exactly one stage.
5. It appends evidence to the work item.
6. The adapter transitions the item to the next queue state.
7. The lease is released.

If the worker cannot finish, it marks the item blocked with a concrete reason.

## Current Status

This is the first clean skeleton:

- Core queue contract and statuses
- In-memory adapter for runtime tests
- Dispatcher loop with claim/release/fail behavior
- GitHub Projects field schema, webhook parser, field mapping, and GraphQL
  list/claim/transition/comment operations
- New flat worker role cards
- Reused Scuba Stack engineering skills, minus the old mandatory orchestration
  layer

The next step is a CLI or service entrypoint that runs a real worker against the
GitHub Projects adapter.
