# MVP Runbook

This runbook describes the first useful GitHub Projects-backed worker loop.

## 1. Configure The Project

Create or choose an organization-level GitHub Project. Add the fields from:

```bash
npm run schema:github-projects
```

Minimum required fields:

- `Status`
- `Worker Type`
- `Priority`
- `Lease Owner`
- `Lease Expires`
- `Attempts`
- `Last Worker Run`

## 2. Configure Work Items

Every runnable item needs:

- `Status`: the column that matches the worker, such as `Implementation`, `QA`,
  `Review`, or `Babysit`
- `Worker Type`: `implementer`, `qa`, `reviewer`, etc.
- `Priority`: `P0` through `P3`

The issue or PR body should carry the task envelope:

- Objective
- Scope and non-goals
- Acceptance criteria
- Verification
- Links and context

## 3. Run A Worker

The runtime shape is:

```text
webhook or poll
  -> adapter.listReady(workerType)
  -> adapter.claim(itemId, workerId, ttl)
  -> worker executes one stage
  -> adapter.appendEvent(...)
  -> adapter.transition(...)
  -> adapter.release(...)
```

The repository currently has the adapter and dispatcher primitives. The next
slice is a CLI entrypoint that wires those primitives to a real model runner.

## 4. Recommended First Pool

Start small:

- one `implementer`
- one `qa`
- one `reviewer`
- one `pr-babysitter`

Do not run many implementers against the same repository until the worktree and
branch allocation policy is encoded.

## 5. Exit Conditions

A worker must end each run by doing one of:

- transition to the next status with evidence
- return the item to an earlier status with findings
- mark `Blocked` with the exact blocker
- mark `Done` only when the item itself is complete

