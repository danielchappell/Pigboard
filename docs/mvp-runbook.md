# MVP Runbook

This runbook describes the first useful GitHub Projects-backed worker loop.

## 1. Configure The Project

Make sure local GitHub auth has Projects scopes:

```bash
gh auth refresh --scopes project
```

Create a GitHub Project with the Ski Stack fields/options:

```bash
npm run setup:github-project
```

The setup command is interactive by default. It creates the Project at the
GitHub user/org level, prompts for repos to enroll, and can import the current
open issues and PRs from those repos into the Project.

By default, setup copies the bundled Ski Stack Kanban template. To force a plain
API-created Project:

```bash
npm run setup:github-project -- --no-template
```

Custom installations can override the template with `SKI_TEMPLATE_PROJECT_ID`.
If no template is used, setup prints the manual GitHub view steps: switch to
Board layout and set the column field to `Status`.

To import another repo into an existing Project later:

```bash
GITHUB_TOKEN=... \
GITHUB_OWNER=your-owner \
GITHUB_PROJECT_NUMBER=1 \
npm run import:github-repos
```

Or choose an existing GitHub Project and preview the fields Ski Stack needs:

```bash
npm run schema:github-projects
```

Required schema fields:

- `Status`
- `Worker Type` (optional override routing)
- `Priority`
- `Lease Owner`
- `Lease Expires`
- `Attempts`
- `Last Worker Run`
- `PR`
- `Epic`

Preview missing live Project fields/options:

```bash
GITHUB_TOKEN=... \
GITHUB_OWNER=your-owner \
GITHUB_PROJECT_NUMBER=1 \
npm run provision:github-project
```

Apply missing fields/options:

```bash
GITHUB_TOKEN=... \
GITHUB_OWNER=your-owner \
GITHUB_PROJECT_NUMBER=1 \
npm run provision:github-project -- --apply
```

Then validate the live Project:

```bash
GITHUB_TOKEN=... \
GITHUB_OWNER=your-owner \
GITHUB_PROJECT_NUMBER=1 \
npm run check:github-project
```

The command exits nonzero and prints the missing fields/options if the Project
is not ready.

## 2. Configure Work Items

Every runnable item needs:

- `Status`: the column that matches the worker, such as `Planning`,
  `Architecture`, `Grooming`, `Ready`, `Implementation Planning`,
  `Implementation`, `QA`, `Review`, or `Babysit`
- `Priority`: `P0` through `P3`

`Worker Type` is optional. Leave it blank for the normal Kanban flow where
Status selects the worker. Fill it only to force a specific worker type.

For issue-backed work, set prerequisites with GitHub's native **Blocked by**
relationship on the source issue. Do not create a Project dependency field.
Only completed blockers satisfy the queue engine; open, not-planned, unreadable,
missing, and cyclic blockers leave the card in its current column but make it
unavailable.

The issue or PR body should carry the task envelope:

- Objective
- Scope and non-goals
- Acceptance criteria
- Verification
- Links and context

## 3. Preview A Worker Claim

Use the non-sticky prompt-only claim command:

```bash
GITHUB_TOKEN=... \
GITHUB_OWNER=your-owner \
GITHUB_PROJECT_NUMBER=1 \
SKI_WORKER_TYPE=implementer \
npm run claim:github
```

To restrict a worker to a subset of repos on the shared Project:

```bash
GITHUB_TOKEN=... \
GITHUB_OWNER=your-owner \
GITHUB_PROJECT_NUMBER=1 \
SKI_WORKER_TYPE=implementer \
SKI_REPOSITORIES=your-owner/app,your-owner/api \
npm run claim:github
```

Leave `SKI_REPOSITORIES` unset for a worker that can claim from any repo on the
Project.

By default, the command claims the highest-ranked available item, prints the
worker prompt, then releases the lease so the item is not left stuck. Ranking is
Priority, Project position, then stable item id. This is not read-only: it still
writes lease fields, increments `Attempts`, and records `Last Worker Run`.

If no item is available, the command prints bounded reason codes. Dependency
reasons are `dependency_pending`, `dependency_canceled`, `dependency_unknown`,
and `dependency_cycle`; they do not change Project Status.

To keep the lease for a manual or external worker run:

```bash
GITHUB_TOKEN=... \
GITHUB_OWNER=your-owner \
GITHUB_PROJECT_NUMBER=1 \
SKI_WORKER_TYPE=implementer \
npm run claim:github -- --hold
```

This command does not yet call a model. It proves the adapter can locate work,
write lease fields, load the right role card, and assemble the handoff prompt.

If you keep a lease, release it later with the printed claim id:

```bash
GITHUB_TOKEN=... \
GITHUB_OWNER=your-owner \
GITHUB_PROJECT_NUMBER=1 \
npm run release:github -- 'ski.<claim-payload>'
```

After an external worker or human completes the prompt, apply its result with:

```bash
cat result.json | \
GITHUB_TOKEN=... \
GITHUB_OWNER=your-owner \
GITHUB_PROJECT_NUMBER=1 \
npm run apply:github -- 'ski.<claim-payload>'
```

Result JSON shape:

```json
{
  "outcome": "completed",
  "nextStatus": "Review",
  "summary": "Implemented the scoped change.",
  "evidence": ["npm test"],
  "blocker": null,
  "details": {}
}
```

`blocked` and `needs-human` move the item to `Blocked`. `failed` uses the
adapter failure path, records a failure event, moves the item to `Blocked`, and
releases the claim.

No automated worker may merge. Reviewer creates or recovers the non-draft PR;
Babysit performs one bounded feedback/check cycle; an authorized PR-description
`+1` moves the card to `Ready for Owner` for a human merge.

## 4. Runtime Shape

The manual claim/apply loop is:

```text
operator claim
  -> adapter.loadQueueSnapshot()
  -> core availability engine selects a candidate
  -> adapter.claimCandidate(...) reloads and claims it
  -> human or external worker executes one stage
  -> adapter.appendEvent(...)
  -> adapter.transition(...)
  -> adapter.release(...)
```

The daemonized code-loop runtime is:

```text
GitHub webhook or reconcile timer
  -> scheduler marks matching worker slots dirty
  -> adapter loads platform state and native dependencies
  -> claimNextAvailable() selects and claims through the core engine
  -> daemon validates signed stage handoffs
  -> daemon prepares an isolated stage-specific worktree
  -> Codex runs locally and writes a structured result
  -> worker revalidates availability before final side effects
  -> Project status advances, waits, or blocks with sanitized evidence
```

Issue events wake every worker partition because a cross-repository blocker can
unlock another queue. Periodic reconciliation remains the backup. Reviewer-
created implementation PRs carry `Closes owner/repo#N`, so merging them
completes the source issue used by native dependencies.

The daemon auto-runs `implementation-planner`, `implementer`, `reviewer`, and
`pr-babysitter`. `architect` and `groomer` remain manual in this slice, and `qa`
is a legacy/manual status outside the delivery chain.

## 5. Recommended First Pool

Start small:

- one `implementation-planner`
- one `implementer`
- one `reviewer`
- one `pr-babysitter`

Do not run many implementers against the same repository until the branch and
Project contention risks are intentional for that repo.

## 6. Exit Conditions

A worker must end each run by doing one of:

- transition to the next status with evidence
- return the item to an earlier status with findings
- mark `Blocked` with the exact blocker
- mark `Done` only when the item itself is complete

## 7. Daemon Security And Rollout

Set a dedicated handoff key and configure authorized owner logins before
starting the daemon:

```bash
export SKI_HANDOFF_SECRET=$(openssl rand -hex 32)
```

Each worker slot in `ski.workers.json` has independent `model`,
`reasoningEffort`, and optional `rolePath`. The example uses `gpt-5.6-sol` for
planning/review and `gpt-5.6-terra` for implementation/babysitting, all at
`xhigh`.

For an existing Project, provision the new Status and Worker Type options first,
then preview migration:

```bash
npm run migrate:delivery-lifecycle
```

The migration preserves active leases and recoverable plan/branch/PR evidence.
After reviewing the JSON plan, apply it explicitly:

```bash
npm run migrate:delivery-lifecycle -- --apply
```
