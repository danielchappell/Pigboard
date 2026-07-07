---
name: pr-babysitting-loop
description: Loop for keeping a pull request moving until merged, approved and clean, superseded, or blocked. Use for PR queue items, CI failures, review comments, merge conflicts, and late feedback.
---

# PR Babysitting Loop

Every run starts from live PR state.

## Check

- Current head SHA
- CI/check status
- Mergeability
- Review decision
- Unresolved review threads
- New comments since last run
- Whether the PR was merged, closed, or superseded

## Act

- Fix scoped CI failures.
- Address review feedback that is inside the item scope.
- Re-run or wait on checks when that is the only remaining action.
- Comment with evidence when a finding is stale, invalid, or deferred.

## Stop Conditions

- PR merged: transition to `Done`.
- Approved and clean but not merged: report the exact remaining merge action.
- Real blocker: transition to `Blocked` with the blocker.
- Superseded/closed: transition to `Canceled` or the configured terminal state.

Never treat silence as success. Absence of a new notification means only that
the next check has not found anything yet.

