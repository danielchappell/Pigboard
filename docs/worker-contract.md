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
  "details": {}
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
- Current auto-run transitions are constrained:
  `implementation-planner` completes to `Implementation`, `implementer`
  completes to `Review`, `reviewer` returns findings to `Implementation` or
  advances clean work to `Babysit`, and `pr-babysitter` stays in `Babysit` or
  hands authorized approval to `Ready for Owner`.
- Automated workers never merge. The lifecycle reconciler owns approval,
  closure, and merged-PR state; the owner takes over at `Ready for Owner`.
- If the work should be split, transition to Grooming or create sub-items through
  the adapter.

## Signed Stage Handoffs

Automated stages persist a versioned `StageHandoff` in a visible issue comment.
The canonical JSON envelope is signed with HMAC-SHA256 using a dedicated
`SKI_HANDOFF_SECRET` of at least 32 bytes. It binds repository, issue, Project
item, stage, input fingerprint, deterministic operation ID, payload hash, and
creation time. Only exact comments authored by the configured daemon identity
are accepted. Edited, deleted, malformed, oversized, unsigned, or mismatched
required handoffs fail closed.

Required payloads:

- `implementation_plan`: repository, base ref/SHA, Markdown plan, acceptance
  criteria, tests, risks, and all adversarial review rounds.
- `implementation`: deterministic branch, base/head SHA, tests, and acceptance
  evidence.
- `review`: `clean` or `changes_requested`, structured findings, and file refs.
- `babysit`: PR/head snapshot, actions, changed-file count, and next eligible
  time.

Issue bodies and ordinary comments are untrusted work context. They never
replace a required signed plan, branch, review, or babysit record.
