# Historical Pigboard runtime guide

Retained for reference. Current setup is in [README](../README.md).

> **Project management moved to Jira on 23 October 2026.** [Pigboard Product backlog](https://scubapig.atlassian.net/jira/software/projects/PGB/boards/70) owns current scope, priority, dependencies, status and next work. [PGB-50](https://scubapig.atlassian.net/browse/PGB-50) holds the source reconciliation and handover record. Queue/status statements below are dated historical snapshots; technical design and engineering rules still apply unless a linked newer decision supersedes them. Update Jira when work changes.

# Pigboard

## Current direction — 12 November 2026

Pigboard is now the Jira-and-Cursor delivery workflow: prepared Stories, shared
skills, Jira routing and Cursor Automations through implementation, review, QA and
Human Review. The immediate objective is to make that workflow work for
`AI-Daniel-1` on Safeguard INT. See the agreed workflow (historical reference: `plans/2026-11-12-cursor-automation-mvp.md`)
and rollout proposal (historical reference: `plans/2026-11-12-cursor-automation-rollout.md`).

This is the current Pigboard product, not a separate workflow product under an
older platform. The previous queue/runtime implementation and hosted-service plans
below are preserved as historical work. Their development is deferred; add pieces
back only when the working product demonstrates a need. No repository has been
renamed, replaced or deleted. Physical repository organization remains a separate
choice and must not delay the first working integration.

The skills are locally prepared. Jira/Cursor configuration and live acceptance are
still outstanding. [PGB-58](https://scubapig.atlassian.net/browse/PGB-58) owns next work.

## Earlier product and runtime documentation

Pigboard is an opinionated AI development process: give it a feature, work
through discovery and small, reviewed changes, and keep your team in control of
product decisions and what ships. We maintain and improve the supported method.

We are building for engineering leads with an existing application, quality
standards and developers already using coding agents. The aim is to reduce the
coordination between sessions: preserving decisions, handing over context,
getting the right reviews and understanding what is ready.

This repository currently provides reusable worker roles and skills plus a
GitHub Projects/local Codex queue runtime. The hosted team service, Jira, cloud
runners and MCP are product direction, not capabilities shipped by this checkout.
See the product definition (historical reference: `product.md`), strategy and intended market (historical reference: `product-strategy.md`),
and brand direction (historical reference: `brand-rebrand.md`). The logo candidates (historical reference: `../assets/brand/pigboard/README.md`)
use our scuba pig with a floating Kanban board in the Rovito visual family.

The skills and agents stay usable manually. The setup/runtime layer is separate:
it can create a GitHub Project, provision the fields Pigboard needs, claim work,
print a worker prompt, and apply the worker result back to the board.

## Agents

The default worker roles are in `agents/`:

| Agent | Use it for |
| --- | --- |
| `planner` | Turn rough intent into a scoped work item. |
| `architect` | Decide the technical approach before coding. |
| `groomer` | Split large work into small, verifiable items. |
| `implementation-planner` | Produce and adversarially review the concrete plan for one story. |
| `implementer` | Build one scoped item against acceptance criteria. |
| `qa` | Verify behavior with tests, app/API checks, or evidence. |
| `reviewer` | Review diffs/plans for bugs, gaps, and drift. |
| `pr-babysitter` | Run one bounded PR feedback/check cycle without merging. |
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

Clone and test (the repository URL retains its existing identifier):

```bash
git clone git@github.com:danielchappell/ski-stack.git pigboard
cd pigboard
npm test
```

## Product direction

The product definition (historical reference: `product.md`) describes the agreed SaaS direction,
Rovito-derived principles, and unresolved design decisions. The runtime below
describes the current GitHub Projects/local Codex implementation.

## Development Map

Follow the development workflow (historical reference: `development-workflow.md`) and
architecture plan (historical reference: `architecture-plan.md`) before choosing implementation
work. These describe how we develop Pigboard; they are not customer runtime
requirements.

Pigboard is intentionally small and dependency-light. For most local work,
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

Create a GitHub Project and provision the Pigboard fields/options:

```bash
npm run setup:github-project
```

By default, this runs interactively. It uses the authenticated GitHub user from
`gh auth token`, asks for the Project title, and prompts for repositories to
enroll. If you run it from a cloned GitHub repo, it offers `remote.origin.url` as
the first repo.

By default, setup copies the bundled Pigboard Kanban template so the Project has
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
  `Implementation Planning`, `Implementation`, `QA`, `Review`, or `Babysit`
- `Priority`: `P0`, `P1`, `P2`, or `P3`

Moving a card into a worker column makes it eligible. `Worker Type` is optional
override routing when a card in a shared status should be claimed by only one
worker type. The queue engine also requires every dependency to be completed.

For issue-backed work, author dependencies with GitHub's native **Blocked by**
relationship on the source issue. Open, not-planned, unreadable, missing, or
cyclic blockers make the item unavailable without moving its Project card.
Draft issues and PR-backed cards do not expose dependency edges in the current
adapter. No custom Project dependency field is required.

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
Project. Candidates are ordered by Priority, Project position, then stable item
id. When nothing is available, the claim command prints bounded reason codes for
the items it skipped.

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

The local daemon runs this delivery chain:

- `implementation-planner` claims `Implementation Planning`, runs Codex in a
  read-only detached worktree, verifies at least two completed adversarial
  review subagents and a clean final round, then advances to `Implementation`.
- `implementer` claims `Implementation` and advances completed diffs to
  `Review` on a deterministic `ski/issue-N` branch. It does not create a PR.
- `reviewer` claims `Review` read-only, routes findings back to `Implementation`,
  or creates/recovers a non-draft PR and advances clean work to `Babysit`.
- `pr-babysitter` claims `Babysit`, addresses PR comments/CI feedback on the
  same PR, and stays in `Babysit` after waiting or pushing one scoped fix.
- The lifecycle reconciler moves an authorized PR-description `+1` to
  `Ready for Owner`; only the owner merges. Approval removal returns to
  `Babysit`, while merge or successful source-issue closure moves to `Done`.

`architect` and `groomer` stay manual in this slice. Their role cards emit
standardized handoffs, and Grooming puts implementation stories into
`Implementation Planning`. `QA` remains available only for legacy/manual use.

The daemon uses local ChatGPT-authenticated Codex, not API-key billing. Startup
runs `codex login status` and fails if local ChatGPT auth cannot be verified.
It also runs a Codex isolation smoke check before accepting work.

Create a worker config:

```bash
cp ski.workers.example.json ski.workers.json
```

Edit `ski.workers.json` so each repo entry has the local checkout path and the
commands that are safe to run before/after Codex. Every runnable worker slot
must also set `model`; the daemon passes it directly to `codex exec --model` and
refuses to start if it is missing or blank. `type` controls queue routing while
`model` controls the model that performs that role. Set optional
`reasoningEffort` to `none`, `low`, `medium`, `high`, or `xhigh` to pass Codex's
`model_reasoning_effort` configuration override. Repo commands are run with a
scrubbed environment and network denied.

Each slot may set its own `rolePath`. The repository-wide `workerRole` override
is retained only as a deprecated fallback. The example config uses
`gpt-5.6-sol` for planning/review and `gpt-5.6-terra` for implementation and
babysitting, all with `xhigh` reasoning.

Start the daemon:

```bash
GITHUB_TOKEN=... \
GITHUB_OWNER=your-user-or-org \
GITHUB_PROJECT_NUMBER=1 \
GITHUB_WEBHOOK_SECRET=change-me \
SKI_HANDOFF_SECRET=$(openssl rand -hex 32) \
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
Machine-authoritative stage handoffs are visible signed issue comments. They
require `SKI_HANDOFF_SECRET` of at least 32 bytes and are accepted only from the
configured daemon GitHub login. Ordinary issue bodies/comments remain untrusted
prompt context.

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
  -> adapter loads a normalized queue snapshot and native dependencies
  -> core engine orders available work by Priority and Project position
  -> coordinator claims one candidate with a structured lease envelope
  -> daemon loads and verifies signed stage handoffs
  -> daemon prepares an isolated stage-specific worktree
  -> Codex runs locally and writes a structured result
  -> daemon revalidates dependency availability before final side effects
  -> Project status advances or blocks with sanitized evidence
```

Reviewer-created implementation PRs include a harness-owned
`Closes owner/repo#N` line. Merging the PR closes the source issue and can unlock
native dependents. Issue webhooks wake every worker partition; periodic
reconciliation covers missed events.

GitHub Projects is the first integration. The adapter boundary is intentionally
separate so Jira, Linear, or a transactional queue can be added later without
changing the skills or agent role cards.
