# GitHub Projects Adapter

GitHub Projects is the first queue backend for Ski Stack.

GitHub Projects are owned by a user or organization, not by a single repo. A
single Project can hold issues and PRs from multiple repos. Ski Stack treats the
Project as the shared queue and uses each item's linked `owner/repo` as worker
partitioning metadata.

## Project Fields

Provision this field set:

| Field | Type | Purpose |
| --- | --- | --- |
| Status | Single select | Queue state |
| Worker Type | Single select | Optional override routing |
| Priority | Single select | Dispatch ordering |
| Lease Owner | Text | Current worker id |
| Lease Expires | Text | Lease timeout as an ISO timestamp |
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

## Kanban View

The preferred queue view is a board named `Queue Board` with `Status` as the
column field. Moving a card into `Implementation`, `QA`, `Review`, or `Babysit`
is the operator signal that the corresponding worker may claim it.

GitHub does not expose public Project view create/update mutations. To fully
automate the Kanban layout, copy from a preconfigured Ski Stack template Project
with `SKI_TEMPLATE_PROJECT_ID` or `--template-project-id`. Without a template,
setup provisions the fields and prints the manual board configuration steps.

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

## Lease Semantics

GitHub Projects does not provide an atomic compare-and-set update for project
fields. The GitHub adapter therefore uses best-effort leases:

1. Reload the Project item.
2. Skip it if `Lease Expires` is still in the future.
3. Write `Lease Owner`, `Lease Expires`, `Attempts`, and `Last Worker Run`.
4. Run the worker.
5. Clear the lease fields on release.

This is acceptable for an MVP and for small worker pools. For hard concurrency,
use a transactional queue adapter and treat GitHub Projects as the human-facing
mirror.

## Repository Partitioning

Use `SKI_REPOSITORIES` to restrict a worker to one or more repos in the shared
Project:

```bash
SKI_REPOSITORIES=owner/app,owner/api
```

Leave `SKI_REPOSITORIES` unset when a worker can claim from any repo in the
Project. Do not mirror repo identity into labels unless a downstream integration
needs it; the linked issue or PR already carries the repository.

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
