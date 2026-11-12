# Pigboard

Pigboard is a shared set of skills and setup scripts for delivering Jira Stories
with Cursor agents. Jira holds the requirements and progress. Cursor runs the work.
The human owner remains accountable and approves what ships.

Start with Safeguard INT, label `AI-Daniel-1`, and Plexus on `master`. Each ticket
names its target repository; that target must match an allowed repository in the
configured Cursor environment. More repositories can be added later.

## How work moves

| Jira stage | Owner and result |
| --- | --- |
| In Progress | Implementer plans with Grok High, gets one independent High plan review, implements with Medium, opens the PR and verifies current CI before moving to In Review. |
| In Review | Independent High reviewer checks the ticket and PR; approval moves it to QA. |
| QA | High QA agent runs the ticket's named skills and cases and retains evidence. Success moves the open PR to Human Review. |
| Human Review | The human developer and human QA reviewer assess the PR before human merge. |
| Product Acceptance | Human acceptance after deployment to UAT. |
| Done | Verified production deployment. |

Confirmed fixes return to In Progress on the same PR. Missing access, incomplete
instructions or required scope expansion blocks the ticket for a human. Discussion
stays in Review or QA. Agents do not select new work, merge, deploy or keep retrying
blocked work. The separate Jira admission script selects new work for the stream.

## What is in this repository

- `skills/`: reusable instructions, references and prepared QA helpers.
- `config/skill-bundle.json`: the ten execution skills included in this release.
- `scripts/prepare-pigboard-skills.mjs`: deterministic fetch and refresh.
- `config/cursor/`: first automation instructions and setup record.
- `docs/plans/2026-11-12-cursor-automation-mvp.md`: detailed agreed contract.

The older queue runtime remains preserved under `src/` and its existing commands.
It is not required for this workflow. Its [historical guide](docs/legacy-runtime-readme.md)
explains that earlier system. Further platform development is deferred.

## Fetch the skills outside the application repository

The setup machine needs Node.js 20+, Git, npm, network access to the approved Git
source and npm registry, and prepared Git authentication. Use a reviewed Pigboard
checkout for the setup command. The selected remote ref must contain the skills;
local commits are not automatically available in Cursor.

Example (replace paths and the approved release ref with your setup values):

```sh
node /opt/pigboard-setup/scripts/prepare-pigboard-skills.mjs \
  --source git@github.com:danielchappell/ski-stack.git \
  --ref APPROVED_RELEASE_REF \
  --cache /opt/pigboard-releases \
  --app /workspace/plexus
```

The cache must be outside the application and every Git checkout. Git access uses
existing credentials; never put passwords or tokens in the source URL or prompt.
The command fetches the requested ref, copies the complete allowlisted skill folders,
rejects symlinks and installs the locked Bruno/Postgres dependencies with `npm ci`.
Dependency lifecycle scripts are disabled. No application files are modified.

Success prints one JSON receipt with `commit`, `release`, `skills` and `manifest`
absolute paths. Retain that receipt for the run. The automation reads its entry point
from the returned `skills` path, for example `implementer-entrypoint/SKILL.md`.
Sibling references continue to work. The manifest records source file hashes and the
runtime platform. Dependency installation is part of successful preparation.

## Refresh and recovery

Run the same command to refresh. A moving branch resolves to its fetched commit;
use a commit or protected release ref when you need a specific reviewed version.
Each invocation creates a separate release directory, even for an unchanged commit.
This avoids sharing mutable dependency installations between active agents. It costs
Git/npm setup time but no model-led setup decisions. Existing runs keep their paths.

Configure Cursor's environment preparation to run the command. To check for updates
on every run, invoke it from a deterministic startup wrapper and pass the new receipt
to that run. **This repository does not yet supply a verified Cursor startup adapter.**
Do not assume exported shell variables survive Cursor Builds or that an asynchronous
startup failure prevents model execution. Verify the receipt handoff and stop behavior
in the configured environment before enabling Jira triggers.

On failure the command exits nonzero and returns no success receipt. It does not
silently select an older release. A human resolves access, missing skills or failed
dependencies, then reruns setup. For a deliberate rollback, prepare a previously
reviewed commit. Keep releases used by active runs; remove unused releases manually
when their runs have ended. The script performs no automatic cache pruning.

## First Cursor automation

Use a webhook trigger, the Plexus/master environment, and the prepared implementer
entry point. The Jira rule must select Stories in INT with exactly `AI-Daniel-1`
entering In Progress and provide the issue and event identity. Current ticket state,
repo, ownership and label must be checked again before work. Rework resumes the same PR.

The exact Grok High/Medium controls, isolated reviewer, Jira/Bitbucket tools,
deduplication, evidence storage and finite CI wait must work before activation.
The ticket supplies acceptance cases and the exact QA skills to run. Per-PR test
environments remain separate work; QA consumes their URLs and deployed revisions.
See [setup status](config/cursor/AI-Daniel-1.md) for actual configuration and blockers.

## Validation and status

Run `node --test test/skill-distribution.test.mjs` for local fetch/refresh fixtures,
or `npm test` for the full repository suite. Fixture dependency installs are simulated;
they do not establish live npm access or Cursor behavior. Local preparation, remote
publication, saved automation, activation and a successful real Story are separate
milestones. [PGB-58](https://scubapig.atlassian.net/browse/PGB-58) tracks rollout.
