# GitHub Projects Adapter

GitHub Projects is the first queue backend for Ski Stack.

## Project Fields

Provision this field set:

| Field | Type | Purpose |
| --- | --- | --- |
| Status | Single select | Queue state |
| Worker Type | Single select | Which worker should claim it |
| Priority | Single select | Dispatch ordering |
| Lease Owner | Text | Current worker id |
| Lease Expires | Date | Lease timeout |
| Attempts | Number | Claim/run count |
| Last Worker Run | Text | Last runtime run id |
| PR | Text | Linked PR URL or number |
| Epic | Text | Parent epic or track |

## Status Values

```text
Inbox
Planning
Architecture
Grooming
Ready
Implementation
QA
Review
Babysit
Blocked
Done
Canceled
```

## Webhook Handling

Subscribe a GitHub App or organization webhook to:

- `projects_v2_item`
- `issues`
- `issue_comment`
- `pull_request`
- `pull_request_review`
- `pull_request_review_comment`
- `pull_request_review_thread`
- `check_run`
- `check_suite`
- `workflow_run`

Project webhooks should only wake the dispatcher. The adapter must reload state
from GitHub before claiming.

## Labels

Labels are optional mirrors. Prefer Project fields as the source of truth.

Useful mirrors:

```text
ski:planning
ski:architecture
ski:grooming
ski:implementation
ski:qa
ski:review
ski:babysit
ski:blocked
```

