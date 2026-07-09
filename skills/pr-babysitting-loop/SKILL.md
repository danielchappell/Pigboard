---
name: pr-babysitting-loop
description: Loop for keeping a pull request moving through review, CI, deterministic merge, and QA handoff. Use for PR queue items, CI failures, review comments, merge conflicts, and late feedback.
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
- When the PR has a clean CI run, is mergeable, and has a current-head review
  approval or PR-description thumbs-up reaction, request
  `mergeWhenApprovedAndClean: true` with `nextStatus: "QA"`. The harness must
  re-check live PR state and merge with an exact head-SHA guard before moving
  the item to QA.

## Stop Conditions

- PR merged by the harness: transition to `QA`.
- Approved or PR-description thumbs-up, clean CI, and mergeable but not merged:
  request the deterministic merge gate.
- Real blocker: transition to `Blocked` with the blocker.
- Superseded/closed: transition to `Canceled` or the configured terminal state.

Never treat silence as success. Absence of a new notification means only that
the next check has not found anything yet.
