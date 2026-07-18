---
name: pr-babysitting-loop
description: One bounded daemon cycle for keeping a pull request moving through review and CI until owner handoff.
---

# PR Babysitting Loop

The queue runtime supplies fresh PR state and repeats this bounded cycle. Never
sleep, fetch network state, request review, open a replacement PR, or merge from
inside the Codex worker.

## Check

- Current and claimed head SHA
- Current-head CI and check state
- Mergeability and draft state
- Current-head reviews and unresolved, non-outdated threads
- New top-level comments
- PR-description reactions from configured owner approvers
- Whether the PR was merged, closed, or superseded

## Act

1. Classify every feedback item as valid, stale/invalid, or needs owner.
2. Batch all valid, in-scope work into at most one commit.
3. Run the narrowest meaningful verification and the configured repository checks.
4. Push only to the existing branch with the claimed head as the expected value.
5. Report actions and classifications. Do not create an empty commit.

## Outcomes

- Fix pushed or no current work: stay in `Babysit`.
- Authorized PR-description thumbs-up: the harness moves to `Ready for Owner`.
- Owner merge or successful source-issue closure: the reconciler moves to `Done`.
- Human decision, permission failure, conflict, or repeated infrastructure failure:
  move to `Blocked` with the exact next step.

Silence is not success. The runtime schedules the next fresh cycle after five
minutes, or ten minutes when the cycle commit changed at least 15 files.
