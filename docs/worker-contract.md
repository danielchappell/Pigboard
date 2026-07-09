# Worker Contract

Every worker receives a work item envelope and returns a stage result.

## Input Envelope

```json
{
  "id": "tool-specific-id",
  "title": "Human-readable work title",
  "status": "Implementation",
  "workerType": "implementer",
  "priority": "P1",
  "sourceOrder": 14,
  "dependencies": [
    {
      "kind": "blockedBy",
      "targetId": "tool-specific-blocker-id",
      "title": "Prerequisite work",
      "url": "https://example.test/issues/12",
      "state": "completed"
    }
  ],
  "body": "Issue or ticket body",
  "links": [],
  "fields": {},
  "claim": {
    "id": "claim-id",
    "owner": "worker-id",
    "expiresAt": "2026-07-07T16:30:00Z",
    "availabilityFingerprint": "64-character-sha256-hex"
  }
}
```

## Required Output

```json
{
  "outcome": "completed",
  "nextStatus": "Review",
  "summary": "What changed or what was decided.",
  "evidence": ["test output, PR link, docs link, screenshot link"],
  "blocker": null,
  "mergeWhenApprovedAndClean": false
}
```

Outcomes:

- `completed`
- `blocked`
- `no-op`
- `needs-human`
- `failed`

## Rules

- Do one stage only.
- Workers receive only items the core engine found available. Dependency states
  are `active`, `completed`, `canceled`, or `unknown`; only `completed` satisfies
  a dependency.
- Priority controls dispatch first, followed by platform `sourceOrder` and
  stable item id.
- If routing or dependency state changes during a run, release the stale claim
  without changing Status or reporting the item as `Blocked`.
- Write evidence back to the work item.
- Do not silently expand scope.
- If the item is under-specified, block it with the exact missing decision.
- Current auto-run transitions are constrained: `implementer` completes to
  `Review`, `reviewer` completes to `Babysit`, and `pr-babysitter` either stays
  in `Babysit` or moves to `QA` with `mergeWhenApprovedAndClean: true`.
- `pr-babysitter` may set `mergeWhenApprovedAndClean: true` only when asking the
  harness to merge a clean-CI, mergeable PR with either current-head review
  approval or a PR-description thumbs-up reaction before moving it to `QA`.
- If the work should be split, transition to Grooming or create sub-items through
  the adapter.
