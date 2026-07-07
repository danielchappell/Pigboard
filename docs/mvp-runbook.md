# MVP Runbook

This runbook describes the first useful GitHub Projects-backed worker loop.

## 1. Configure The Project

Make sure local GitHub auth has Projects scopes:

```bash
gh auth refresh --scopes project,read:project
```

Create a GitHub Project with the Ski Stack fields/options:

```bash
npm run setup:github-project
```

The setup command is interactive by default. It creates the Project at the
GitHub user/org level, prompts for repos to enroll, and can import the current
open issues and PRs from those repos into the Project.

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

Minimum required fields:

- `Status`
- `Worker Type`
- `Priority`
- `Lease Owner`
- `Lease Expires`
- `Attempts`
- `Last Worker Run`

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

- `Status`: the column that matches the worker, such as `Implementation`, `QA`,
  `Review`, or `Babysit`
- `Worker Type`: `implementer`, `qa`, `reviewer`, etc.
- `Priority`: `P0` through `P3`

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

By default, the command claims the first ready item, prints the worker prompt,
then releases the lease so the item is not left stuck. This is not read-only:
it still writes lease fields, increments `Attempts`, and records
`Last Worker Run`.

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
  "nextStatus": "QA",
  "summary": "Implemented the scoped adapter behavior.",
  "evidence": ["npm test"],
  "blocker": null
}
```

`blocked` and `needs-human` move the item to `Blocked`. `failed` uses the
adapter failure path, records a failure event, moves the item to `Blocked`, and
releases the claim.

## 4. Runtime Shape

The runtime shape is:

```text
webhook or poll
  -> adapter.listReady(workerType)
  -> adapter.claim(itemId, workerId, ttl)
  -> worker executes one stage
  -> adapter.appendEvent(...)
  -> adapter.transition(...)
  -> adapter.release(...)
```

The repository currently has the adapter, dispatcher primitives, a safe
claim/print CLI, and an apply-result CLI. The next slice is a runner that sends
the generated prompt to a real model or Codex thread automatically.

## 5. Recommended First Pool

Start small:

- one `implementer`
- one `qa`
- one `reviewer`
- one `pr-babysitter`

Do not run many implementers against the same repository until the worktree and
branch allocation policy is encoded.

## 6. Exit Conditions

A worker must end each run by doing one of:

- transition to the next status with evidence
- return the item to an earlier status with findings
- mark `Blocked` with the exact blocker
- mark `Done` only when the item itself is complete
