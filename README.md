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
| `pr-babysitter` | Keep a PR moving through CI, comments, and review. |
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

## Create A GitHub Project

Create a GitHub Project and provision the Ski Stack fields/options:

```bash
npm run setup:github-project
```

By default, this runs interactively. It uses the authenticated GitHub user from
`gh auth token`, asks for the Project title, and prompts for repositories to
enroll. If you run it from a cloned GitHub repo, it offers `remote.origin.url` as
the first repo.

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

- `Status`: one of `Planning`, `Architecture`, `Grooming`, `Implementation`,
  `QA`, `Review`, or `Babysit`
- `Worker Type`: `planner`, `architect`, `groomer`, `implementer`, `qa`,
  `reviewer`, `pr-babysitter`, or `researcher`
- `Priority`: `P0`, `P1`, `P2`, or `P3`

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

## Runtime Shape

```text
GitHub Project
  -> adapter lists ready items
  -> worker claims one item with a lease
  -> role card + issue body become the worker prompt
  -> worker result is appended as evidence
  -> Project status advances or blocks
```

GitHub Projects is the first integration. The adapter boundary is intentionally
separate so Jira, Linear, or a transactional queue can be added later without
changing the skills or agent role cards.
