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
| Last Worker Run | Text | Structured claim, operation binding, head snapshot, and cooldown |
| PR | Text | Linked PR URL or number |
| Epic | Text | Parent epic or track |

Dependencies are not stored in a Project field. Issue-backed work uses GitHub's
native [**Blocked by** relationship](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies)
on the source issue.

## Status Values

```text
Todo
Planning
Architecture
Grooming
Ready
Implementation Planning
Implementation
QA
Review
Babysit
Ready for Owner
Blocked
Done
Canceled
```

## Kanban View

The preferred queue view is a board named `Queue Board` with `Status` as the
column field. Moving a card into `Planning`, `Architecture`, `Grooming`,
`Ready`, `Implementation Planning`, `Implementation`, `QA`, `Review`, or
`Babysit` is the operator signal
that the corresponding worker may consider it. The core engine still filters
dependencies, repository routing, and leases before claiming. The local daemon
auto-runs `Implementation Planning`, `Implementation`, `Review`, and `Babysit`.
`Ready for Owner` is non-claimable; `QA` is legacy/manual outside this chain.

PR-backed work remains in `Babysit` while comments, reviews, and CI are being
handled. An authorized `+1` reaction on the PR description moves the card to
`Ready for Owner` without running Codex. Removing it before merge returns the
card to `Babysit`. The harness never merges; a merged implementation PR or
successfully closed source issue reconciles to `Done`.

## Trusted Handoffs

Machine-authoritative plans, branches, reviews, and babysit snapshots are
visible signed comments on the source Issue. The adapter loads comments with
bounded backward pagination, comment-ID deduplication, stable ordering, and
cursor-loop detection. It accepts only unedited HMAC-SHA256 envelopes from the
configured daemon GitHub identity. Set a dedicated `SKI_HANDOFF_SECRET` of at
least 32 bytes; never reuse or derive it from the GitHub token.

Automated stages require a real Issue. Draft Project items fail closed as
`unsupported_content_type`. Existing PR-backed Review/Babysit work is supported
only for migration compatibility.

## Issue Dependencies

Add implementation dependencies on the source GitHub issue with **Blocked by**.
The adapter queries and paginates `Issue.blockedBy`, including blockers in other
repositories, and normalizes state as follows:

| GitHub issue state | Queue dependency state |
| --- | --- |
| Open | `active` |
| Closed as completed | `completed` |
| Closed as not planned | `canceled` |
| Missing or unreadable | `unknown` |

Only `completed` satisfies a dependency. Canceled, unknown, missing, and cyclic
dependencies fail closed. The card remains in its current Status column and the
claim command reports `dependency_pending`, `dependency_canceled`,
`dependency_unknown`, or `dependency_cycle`.

Draft issues and PR-backed Project items have no dependency edges in the first
adapter slice. Reviewer-created implementation PRs include
`Closes owner/repo#N`; merging the PR closes its source issue and unlocks native
dependents.

GitHub does not expose public Project view create/update mutations. Setup copies
the bundled Ski Stack template Project by default to automate the Kanban layout.
Custom installs can override it with `SKI_TEMPLATE_PROJECT_ID` or
`--template-project-id`. Without a template, setup provisions the fields and
prints the manual board configuration steps.

## Webhook Handling

Subscribe a GitHub App or organization webhook to:

- `projects_v2_item`
- `issues`
- `issue_comment`
- `reaction`
- `pull_request`
- `pull_request_review`
- `pull_request_review_comment`
- `pull_request_review_thread`
- `check_run`
- `check_suite`
- `workflow_run`

Project webhooks should only wake the dispatcher. Issue, pull request, and
reaction events are global wakeups because dependency or lifecycle changes can
unlock another partition. Periodic reconciliation covers missed events. The
adapter reloads state from GitHub before claiming or reconciling.

## Lease Semantics

GitHub Projects does not provide an atomic compare-and-set update for project
fields. The GitHub adapter therefore uses best-effort leases:

1. Load a complete normalized queue snapshot.
2. Let the core engine select and fingerprint an available candidate.
3. Reload Project and dependency state before claiming.
4. Skip it if availability changed or a foreign lease is active.
5. Write `Lease Owner`, `Lease Expires`, `Attempts`, and `Last Worker Run`.
6. Re-evaluate availability after claiming and before final side effects.
7. Clear the lease fields on release, including stale dependency claims.

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
ski:implementation-planning
ski:implementation
ski:qa
ski:review
ski:babysit
ski:ready-for-owner
ski:blocked
```
