# Architecture

Ski Stack separates reusable agent capability from queue-driven automation.

## Principles

1. **Flat by default.** A user or worker may invoke any skill directly. No skill
   assumes a permanent chief-of-staff, manager, or swarm unless explicitly asked.
2. **The work item is the handoff object.** State lives in the internet-hosted
   project-management record, not a chat transcript or local-only folder.
3. **Adapters isolate vendors.** GitHub Projects, Jira, Linear, and future tools
   implement the same queue contract.
4. **Workers do one stage.** A worker claims one item, performs one role, writes
   evidence, and transitions or blocks the item.
5. **Leases prevent duplicate work.** Webhooks wake the system; atomic claims
   decide who actually owns the work.

## Layers

```text
skills/ and agents/
  reusable instruction assets

src/core/
  shared statuses, worker types, adapter contract docs

src/runtime/
  dispatcher, worker prompt assembly, lease handling

src/adapters/<tool>/
  vendor-specific queue implementation

src/provisioners/<tool>/
  setup for fields, labels, templates, webhooks, and repo guidance
```

## Adapter Contract

Every queue backend must support:

- `listReady(workerType)`
- `claim(itemId, workerId, leaseSeconds)`
- `heartbeat(claimId)`
- `appendEvent(itemId, event)`
- `transition(itemId, status)`
- `release(claimId)`
- `fail(claimId, reason)`

The runtime never reaches around this boundary into GitHub, Jira, or Linear.

## GitHub Projects Strategy

GitHub Projects is the first adapter because it gives a web UI, Issues, PRs,
comments, fields, hierarchy, and API access in one place.

GitHub Projects webhooks exist for organization-level Projects v2 items, but
GitHub currently marks Projects webhooks as public preview. Treat them as a wake
signal, not the source of truth. On every event, reload the item via GraphQL
before deciding whether to run a worker.

## Worker Roles

The initial worker pool:

- `planner`
- `architect`
- `groomer`
- `implementer`
- `qa`
- `reviewer`
- `pr-babysitter`
- `researcher`

These are role cards. A runtime can map them to Codex, Claude, another agent
runner, or a human.

