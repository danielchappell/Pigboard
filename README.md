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
- `scripts/install-cursor-skills.mjs`: verified installation at a stable skill path.
- `config/cursor/environment-install.sh`: versioned Cursor Build install command.
- `config/cursor/`: first automation instructions and setup record.
- `docs/plans/2026-11-12-skill-distribution.md`: setup implementation plan.

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

For Cursor, use the saved Plexus environment's **Install Script**, not agent
instructions or a startup service. Copy the versioned
[environment install command](config/cursor/environment-install.sh), preceded by
`export PIGBOARD_REVISION=REVIEWED_40_CHARACTER_COMMIT`. The revision must already be
published in the private Pigboard repository. The command uses prepared build Git
authentication, installs the locked dependencies and verifies the source hashes,
all ten entrypoints, `pg.Client` import and `bru --version` before exposing
`/opt/pigboard/skills`. The agent prompt points directly to that existing path.

For a single repository, the install working directory must be its checkout. Set
`PIGBOARD_APP` explicitly if Cursor supplies another working directory. Node 20+,
Git, npm and permission to create `/opt/pigboard` are prerequisites. Git/npm run as
the build user; sudo is used only to create that directory if absent. The stable
link and releases are outside Plexus and belong to each isolated Build/agent VM.
The adapter refuses unmanaged destinations and preserves the prior link on failure.

Keep the automation inactive while preparing and testing its first Build. Inspect
the Build's JSON receipt for the expected commit and completed verification. Cursor
can use a default image before its first successful Build, and retains its previous
successful Build if a later one fails: a failed script is **not** an admission lock.
[Cursor documents this Build lifecycle](https://cursor.com/docs/cloud-agent/builds).

Refresh by disabling the automation, updating the pinned revision in the install
configuration, and testing the resulting Build before reactivation. Changes to the
out-of-band Pigboard repository do not by themselves guarantee a Cursor rebuild.
Ordinary runs use the prepared snapshot without fetching skills or spending model
tokens on setup. The Start Script does not install or refresh Pigboard skills.

On failure the command exits nonzero and returns no success receipt. It does not
silently select an older release. A human resolves access, missing skills or failed
dependencies, then reruns setup. For a deliberate rollback, prepare a previously
reviewed commit. Keep releases used by active runs; remove unused releases manually
when their runs have ended. The script performs no automatic cache pruning.

## First Cursor automation

Use a webhook trigger, the Plexus/master environment, and the prepared implementer
entry point. The Jira rule must select Stories in INT with exactly `AI-Daniel-1`
entering In Progress and provide the issue and event identity. Deterministic Jira wiring checks current ticket state,
repo, ownership and label before dispatch; these are not agent setup instructions. Rework resumes the same PR.

The exact Grok High/Medium controls, isolated reviewer, Jira/Bitbucket tools,
deduplication, evidence storage and finite CI wait must work before activation.
The ticket supplies acceptance cases and the exact QA skills to run. Per-PR test
environments remain separate work; QA consumes their URLs and deployed revisions.
See [setup status](config/cursor/AI-Daniel-1.md) for actual configuration and blockers.

## Validation and status

Run `node --test test/skill-distribution.test.mjs test/cursor-environment.test.mjs`
for local fetch/refresh and environment fixtures,
or `npm test` for the full repository suite. Fixture dependency installs are simulated;
they do not establish live npm access or Cursor behavior. Local preparation, remote
publication, saved automation, activation and a successful real Story are separate
milestones. [PGB-58](https://scubapig.atlassian.net/browse/PGB-58) tracks rollout.
