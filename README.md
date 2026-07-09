# Ski Stack

Ski Stack gives you a flat set of reusable AI worker roles and skills, plus an
optional queue runtime that can drive those workers from a project-management
board.

The skills and agents stay usable manually. The setup/runtime layer is separate:
it can create a GitHub Project, provision the fields Ski Stack needs, claim work,
print a worker prompt, and apply the worker result back to the board.

## Agents

The default worker roles are in `agents/`:

| Agent | Use it for |
| --- | --- |
| `planner` | Turn rough intent into a scoped work item. |
| `architect` | Decide the technical approach before coding. |
| `groomer` | Split large work into small, verifiable items. |
| `implementer` | Build one scoped item against acceptance criteria. |
| `qa` | Verify behavior with tests, app/API checks, or evidence. |
| `reviewer` | Review diffs/plans for bugs, gaps, and drift. |
| `pr-babysitter` | Keep one PR moving through feedback, CI, harness merge, and QA handoff. |
| `researcher` | Answer a focused unknown that blocks progress. |

The reusable skills live in `skills/`. They are not tied to the queue runtime;
use them directly whenever they help.

## Quick Setup

Requirements:

- Node.js 20+
- GitHub CLI authenticated with `gh auth login`, or a `GITHUB_TOKEN`/`GH_TOKEN`
  with Project and repo access

For local `gh` auth, grant GitHub Projects scopes once:

```bash
gh auth refresh --scopes project
```

Clone and test:

```bash
git clone git@github.com:danielchappell/ski-stack.git
cd ski-stack
npm test
```

## Development Map

Ski Stack is intentionally small and dependency-light. For most local work,
start with:

```bash
npm test
```

Key areas:

- `agents/` and `skills/` are reusable instruction assets.
- `src/core/` owns statuses, worker types, claim ids, and adapter contracts.
- `src/runtime/` owns dispatch, prompt assembly, and worker-result application.
- `src/adapters/github-projects/` contains GitHub Projects queue behavior.
- `src/provisioners/github-projects/` contains Project setup, validation, and
  field provisioning.
- `scripts/` exposes the CLI workflows described below.

Live GitHub commands use the current token and Project env. Claim commands are
not read-only: they can write lease fields, increment attempts, and update the
last worker run. Use mocked tests for adapter behavior unless you are
intentionally validating a real Project.

## Create A GitHub Project

Create a GitHub Project and provision the Ski Stack fields/options:

```bash
npm run setup:github-project
```

By default, this runs interactively. It uses the authenticated GitHub user from
`gh auth token`, asks for the Project title, and prompts for repositories to
enroll. If you run it from a cloned GitHub repo, it offers `remote.origin.url` as
the first repo.

By default, setup copies the bundled Ski Stack Kanban template so the Project has
`Queue Board` and `All Items` views. To force a plain API-created Project:

```bash
npm run setup:github-project -- --no-template
```

Custom installations can override the template with `SKI_TEMPLATE_PROJECT_ID` or
`--template-project-id`. Without a template, setup still creates/provisions the
manual GitHub view steps: switch to Board layout and use `Status` as the column
field.

GitHub Projects are user/org-level boards. One Project can contain issues and
PRs from many repos, and workers can later filter by repo.

For repeatable setup, the same command still accepts env/flags:

```bash
GITHUB_OWNER=your-org \
GITHUB_OWNER_TYPE=organization \
npm run setup:github-project -- --title "Delivery Queue" --repo your-org/app --repo your-org/api
```

The command prints:

- Project URL
- Project number
- `GITHUB_OWNER`
- `GITHUB_PROJECT_NUMBER`
- `SKI_REPOSITORIES`, when repos were selected

Use those values for the worker commands.

Add or import more repos into an existing Project later:

```bash
GITHUB_OWNER=your-org \
GITHUB_PROJECT_NUMBER=1 \
npm run import:github-repos
```

## Check Or Repair A Project

Preview the required schema:

```bash
npm run schema:github-projects
```

Validate an existing Project:

```bash
GITHUB_OWNER=your-org \
GITHUB_PROJECT_NUMBER=1 \
npm run check:github-project
```

Provision missing fields/options on an existing Project:

```bash
GITHUB_OWNER=your-org \
GITHUB_PROJECT_NUMBER=1 \
npm run provision:github-project -- --apply
```

## Manual Worker Loop

Put an issue or PR into the Project with:

- `Status`: one of `Planning`, `Architecture`, `Grooming`, `Ready`,
  `Implementation`, `QA`, `Review`, or `Babysit`
- `Priority`: `P0`, `P1`, `P2`, or `P3`

Moving a card into a worker column makes it claimable. `Worker Type` is optional
override routing when a card in a shared status should be claimed by only one
worker type.

Claim the next item for a worker and print the prompt:

```bash
GITHUB_OWNER=your-org \
GITHUB_PROJECT_NUMBER=1 \
SKI_WORKER_TYPE=implementer \
npm run claim:github -- --hold
```

Limit a worker to one or more repos in the shared Project:

```bash
GITHUB_OWNER=your-org \
GITHUB_PROJECT_NUMBER=1 \
SKI_WORKER_TYPE=qa \
SKI_REPOSITORIES=your-org/app,your-org/api \
npm run claim:github -- --hold
```

Leave `SKI_REPOSITORIES` unset for a worker that can pull from any repo in the
Project.

After a human or external model completes the prompt, apply the JSON result:

```bash
cat result.json | \
GITHUB_OWNER=your-org \
GITHUB_PROJECT_NUMBER=1 \
npm run apply:github -- 'ski.<claim-payload>'
```

Release a held claim without applying a result:

```bash
GITHUB_OWNER=your-org \
GITHUB_PROJECT_NUMBER=1 \
npm run release:github -- 'ski.<claim-payload>'
```

## Local Worker Daemon

The local daemon currently auto-runs only the code loop workers:

- `implementer` claims `Implementation` and advances completed diffs to
  `Review`.
- `reviewer` claims `Review` and advances clean PRs to `Babysit`, or routes
  findings back to `Implementation`.
- `pr-babysitter` claims `Babysit`, addresses PR comments/CI feedback on the
  same PR, stays in `Babysit` after pushing fixes, and asks the harness to
  merge clean-CI, explicitly approved PRs before moving them to `QA`.

`planner`, `architect`, `groomer`, `qa`, and `researcher` stay manual until
they have explicit worker implementations.

The daemon uses local ChatGPT-authenticated Codex, not API-key billing. Startup
runs `codex login status` and fails if local ChatGPT auth cannot be verified.
It also runs a Codex isolation smoke check before accepting work.

Create a worker config:

```bash
cp ski.workers.example.json ski.workers.json
```

Edit `ski.workers.json` so each repo entry has the local checkout path and the
commands that are safe to run before/after Codex. Repo commands are run with a
scrubbed environment and network denied.

Start the daemon:

```bash
GITHUB_TOKEN=... \
GITHUB_OWNER=your-user-or-org \
GITHUB_PROJECT_NUMBER=1 \
GITHUB_WEBHOOK_SECRET=change-me \
SKI_WORKER_CONFIG=./ski.workers.json \
npm run daemon:github
```

By default the daemon listens locally at:

```text
http://127.0.0.1:8787/webhooks/github
```

For real GitHub webhooks, expose that endpoint through your tunnel and register
the public tunnel URL in GitHub with the same `GITHUB_WEBHOOK_SECRET`. If you
are only testing locally without GitHub, `-- --insecure-local-webhook` is
allowed on loopback only.

Each worker slot can restrict the repos it claims with `repository` or
`repositories`. Leave the allow-list empty only for a worker that can pull from
any enrolled repo in the shared Project.

Full Codex streams stay local under `SKI_RUN_LOG_DIR` or
`~/.ski-stack/runs`. GitHub only receives concise sanitized status/evidence.

Retrieve local logs:

```bash
npm run logs:github -- --issue "Build webhook worker" --latest
npm run logs:github -- --pr 42 --worker reviewer
npm run logs:github -- --status Review --tail 60
npm run logs:github -- --run run-id --json
```

## Runtime Shape

```text
GitHub Project
  -> GitHub webhook wakes the local daemon
  -> adapter lists ready items by Status and repo partition
  -> worker claims one item with a structured lease envelope
  -> daemon prepares an isolated worktree
  -> Codex runs locally and writes a structured result
  -> daemon verifies the claim before every GitHub mutation
  -> Project status advances or blocks with sanitized evidence
```

GitHub Projects is the first integration. The adapter boundary is intentionally
separate so Jira, Linear, or a transactional queue can be added later without
changing the skills or agent role cards.
