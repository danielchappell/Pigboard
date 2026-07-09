# Worker Contract

Every worker receives a work item envelope and returns a stage result.

## Input Envelope

```json
{
  "id": "tool-specific-id",
  "title": "Human-readable work title",
  "status": "Ready",
  "workerType": "implementer",
  "priority": "P1",
  "body": "Issue or ticket body",
  "links": [],
  "fields": {},
  "claim": {
    "id": "claim-id",
    "owner": "worker-id",
    "expiresAt": "2026-07-07T16:30:00Z"
  }
}
```

## Required Output

```json
{
  "outcome": "completed",
  "nextStatus": "QA",
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
- Write evidence back to the work item.
- Do not silently expand scope.
- If the item is under-specified, block it with the exact missing decision.
- `pr-babysitter` may set `mergeWhenApprovedAndClean: true` only when asking the
  harness to merge a clean-CI, mergeable PR with either current-head review
  approval or a PR-description thumbs-up reaction before moving it to `QA`.
- If the work should be split, transition to Grooming or create sub-items through
  the adapter.
