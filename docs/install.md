# Install and maintain Pigboard skills

This guide is for a person or agent preparing a target environment. Installation
is separate from executing a delivery ticket. Read [agent usage](using-pigboard.md)
for selecting and invoking skills. Changing Pigboard itself follows
[CONTRIBUTING.md](../CONTRIBUTING.md).

## Prerequisites and inputs

Supply a reviewed, published Pigboard commit, the existing target application
checkout and a writable installation location outside every Git checkout. The
installation directory and application must not contain each other. Node.js 20+,
Git, npm and access to the Git source and npm registry are required. Public
Pigboard HTTPS needs no GitHub credential. For a private fork, prepare Git access
outside commands and prompts; never embed credentials in a URL.

The installer prepares the eleven folders in
[config/skill-bundle.json](../config/skill-bundle.json), including their references,
scripts and lockfiles, plus the separate `work-validator` payload with canonical
Epic/ticket and trusted-context schemas, semantic/graph modules, the source skill
manifest, CLI, guide and examples. Its locked YAML 2.9.1/Ajv 8.20.0/ajv-formats 3.0.1
dependencies and the Bruno/PostgreSQL helper dependencies use
`npm ci --ignore-scripts --no-audit --no-fund` before agents run. This installs
execution tools, not database instances, test environments or service credentials.

A successful skill installation does not establish Jira/Bitbucket access, Cursor
model controls, computer use, preview readiness or permission to execute a ticket.
Prepare those capabilities for the selected role separately. Copy neither this
repository's AGENTS.md nor its contributor policy into the target application.

## Obtain a pinned setup checkout

Choose the actual reviewed 40-character commit and paths before running this
example. The placeholder values below must be replaced. The setup checkout is
separate from both the application and the release cache.

```sh
PIGBOARD_REVISION=REVIEWED_40_CHARACTER_COMMIT
PIGBOARD_SETUP="$HOME/pigboard-setup"
PIGBOARD_APP=/absolute/path/to/application

git clone https://github.com/danielchappell/Pigboard.git "$PIGBOARD_SETUP"
git -C "$PIGBOARD_SETUP" checkout --detach "$PIGBOARD_REVISION"
git -C "$PIGBOARD_SETUP" rev-parse HEAD
```

Verify that the printed revision matches the approved commit. For an existing
setup checkout, inspect its status and preserve changes before fetching and
selecting a new revision. Use scripts and the manifest from the same approved
revision you request for the bundle. A local unpushed commit is not a remote release.
Root `npm ci --ignore-scripts --no-audit --no-fund` prepares source-checkout
validation dependencies; it is not skill installation. Prepare/install commands
use standard Node APIs and separately prepare their bundle, so installation-only
operators need no additional root install step. There is no published `npm install pigboard` distribution here.

## Prepare a release for explicit file loading

For an agent that can read skill files and has the required tools, prepare the
bundle without changing the application's files:

```sh
node "$PIGBOARD_SETUP/scripts/prepare-pigboard-skills.mjs" \
  --source https://github.com/danielchappell/Pigboard.git \
  --ref "$PIGBOARD_REVISION" \
  --cache "$HOME/.local/share/pigboard-releases" \
  --app "$PIGBOARD_APP"
```

Success prints one JSON object:

| Field | Meaning |
| --- | --- |
| `commit` | Exact fetched source revision |
| `release` | Absolute directory for this invocation's prepared release |
| `skills` | Absolute root containing eleven complete skill folders and `work-validator` |
| `manifest` | Absolute manifest path with source hashes, bundle, Node and platform metadata |

Retain the receipt and verify `commit` against the approved revision. Point the
agent to `<skills>/<selected-skill>/SKILL.md`, using the actual returned path.
This command copies allowlisted sources, rejects symlinks and installs locked
helper dependencies. It does not run the additional smoke checks below, register
skills with a host or prove that host's supported execution capabilities.

## Install a verified stable path

The installer adds source-hash and dependency verification, loads `pg.Client`,
runs the locked `bru --version` and both validator skeleton draft checks, then exposes a stable `skills` symlink:

```sh
node "$PIGBOARD_SETUP/scripts/install-cursor-skills.mjs" \
  --source https://github.com/danielchappell/Pigboard.git \
  --ref "$PIGBOARD_REVISION" \
  --app "$PIGBOARD_APP" \
  --root "$HOME/.local/share/pigboard"
```

The default root is `/opt/pigboard`; the example chooses a user-writable root.
The returned JSON contains the preparation fields plus `stableSkills` and
`verification`. Inspect the expected commit, all eleven entrypoints,
`dependencies: "verified"`, and four smoke checks: `pg.Client`, `bru --version`,
`work-validator epic draft` and `work-validator ticket draft`. The validator checks
load the real parser, semantic modules and schemas, require draft-valid skeletons
and require structural-start false. These unchanged draft smoke checks do not run
local start semantics, contact providers or establish live readiness.
Use the versioned `skills` path for a run that may overlap a refresh; it binds
subsequent sibling-reference reads to that release. `stableSkills` is a mutable
entry path for new runs. Do not replace its link while any run still reads through
it. A manifest proves source matching, not provider access.

This script installs files; it does not configure a Cursor account. It rejects an
unmanaged destination and preserves the previous stable link on failed preparation
or verification. Keep full sibling folders intact rather than copying a SKILL.md
alone. Resolve referenced paths within the prepared bundle.

## Check work locally

The preparation receipt's `skills` path also contains the validator. Substitute
that actual path and your absolute input file; the stable example uses the default
root (use `stableSkills` for another root):

```sh
node /absolute/receipt/skills/work-validator/scripts/validate-work.mjs --mode draft --input /absolute/work.yaml --json
node /opt/pigboard/skills/work-validator/scripts/validate-work.mjs --mode start --input /absolute/work.yaml --context /absolute/facts.yaml --json
```

`draft` checks editable structure; `structure` checks complete structure without
context. `start` additionally requires the separate approved local YAML/JSON facts
snapshot shown above. Prepare it outside the ticket using the complete context
example in [authoring](authoring.md); every field is required. Keep operation facts
bound to the full current step prescriptions. Installation supplies the parser and
schemas, not those caller facts or permission to execute tests.

See [authoring](authoring.md) for modes, limits, diagnostics and recovery. Keep the
whole payload with its release; refresh/removal applies to it with the skills.
Preparation installs dependencies but does not perform installation-only smoke
checks. A successful explicit start check proves only the checked local semantics and
ledger projection. Neither installation nor local validation authorizes delivery,
proves live readiness or checks actual final evidence publication.

## Cursor environment setup

For Cursor delivery, use the saved environment's **Install Script** to prepare the
snapshot before agents start. Use the versioned
[environment-install.sh](../config/cursor/environment-install.sh), preceded by:

```sh
export PIGBOARD_REVISION=REVIEWED_40_CHARACTER_COMMIT
```

Replace the placeholder with a reviewed published revision. The install working
directory must be the target checkout; set `PIGBOARD_APP` to its absolute path if
Cursor starts elsewhere. The command requires Node 20+, Git, npm and permission
to create `/opt/pigboard`. Git/npm run as the build user; passwordless sudo is used
only to create that directory if absent. Public-source installation needs no
deploy key. Keep the Start Script free of Pigboard installation or refresh work.

The Build command uses the pinned scripts and verifies the bundle before exposing
`/opt/pigboard/skills`. Review the successful Build receipt and actual selected
snapshot. A failed Build can leave the previous successful snapshot selected;
"Active Build" does not mean a delivery automation is enabled.

Before authorizing delivery, prepare and check:

- The allowed repository/base branch, trusted Jira project and full numbered stream
  label, stage-specific webhook routing and service access.
- The role's exact model and effort controls, including isolated High plan review
  and Medium implementation. Use the entrypoint's Cursor reference, not guessed
  model selectors. The [setup matrix](../config/cursor/automations.md) records the
  tested bindings and their evidence limits.
- Jira tools and the approved PR tool route. The current pilot's
  [Rovito CLI installation/profile](../config/cursor/rovito-cli.md) and
  [Jira access record](../config/cursor/jira-access.md) are separate setup steps;
  installing Pigboard does not grant their permissions.
- Required CI, prescribed QA artifacts, test access/data, browser/computer-use
  capabilities where named, evidence storage and a ready preview where required.

Use the versioned [implementer](../config/cursor/implementer-prompt.txt),
[reviewer](../config/cursor/pr-review-prompt.txt) and
[QA](../config/cursor/qa-prompt.txt) prompts. The trusted trigger supplies the ticket;
the worker reads its current state. Preparation belongs in the Build, not in these
prompts. [Jira setup](jira-setup.md) and the role-specific setup records contain
pilot IDs and exports; configure actual authorized values for another installation.
There is not yet a general Jira/Cursor provisioning command.

Keep stage automations inactive through setup. Complete the bounded acceptance
and explicit go-live decision recorded in PGB-58 before enabling delivery. The
installed MVP has no automatic duplicate-run prevention; operators own repeated
launch handling. A current-ticket read is not a lock. Per-PR environment production
and manager deployment remain separate work.

## Refresh, rollback and removal

1. Keep the affected automation inactive while changing its environment. Before
   rerunning the installer on a shared root, wait for every run using its stable
   `skills` link (including sibling references through that link) to finish. Merely
   retaining its old release directory is insufficient: replacement changes where
   later reads resolve. Disabling a trigger does not stop an active run.
2. Prepare a reviewed published revision with the same command, using setup scripts
   from that revision. Each invocation creates a distinct release, even for the
   same source commit. Runs explicitly bound to the receipt's versioned `skills`
   path can keep that release. Cursor's isolated run snapshots are separate from
   refreshing a shared local installation root.
3. Inspect the manifest and verification receipt. For Cursor, save the new pin and
   inspect the resulting Build; trigger another Build only if needed. Changes in
   the Pigboard repository alone do not prove a new snapshot was selected.
4. Retain the prior release/Build until its runs have ended. Resume delivery only
   under the applicable activation authorization.

For rollback, prepare a previously reviewed revision and verify/select its Build
or stable path. Rollback changes future skill use; it does not undo application
code, PRs or Jira actions. The scripts never silently fall back to an older release.

On failure, the command exits nonzero with a blocked message and no success receipt.
Resolve the named source, dependency, path or access issue during setup, then rerun.
Missing/corrupt validator sources, lockfiles, wrong dependency versions or runtime
smoke failures also block installation and preserve the previous stable binding.
Agents executing a ticket report missing preparation instead of installing packages
or finding replacement tools. Reconcile uncertain external actions before retrying.

For removal, first stop new invocations and account for existing runs and retained
evidence. Remove the Pigboard Build step and prompt references from the affected
configuration, then remove only the confirmed installation root/releases after no
run uses them. Cache pruning/removal is operator work; no uninstall command or
automatic pruning is implemented. Retain evidence required by the team. Removing
skills (including the validator payload in the same release/root) does not remove Jira rules, revoke provider credentials or cancel agents;
handle those explicitly within the authorized setup scope.
