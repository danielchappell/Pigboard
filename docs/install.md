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

The installer prepares the twenty-two folders in
[config/skill-bundle.json](../config/skill-bundle.json), including their references,
scripts and lockfiles, plus the separate `work-validator` payload with canonical
Epic/ticket and trusted-context schemas, semantic/graph modules, the source skill
manifest, CLI, guides, examples and complete synthetic manager repair fixture. Its locked YAML 2.9.1/Ajv 8.20.0/ajv-formats 3.0.1
dependencies and the Bruno/PostgreSQL helper dependencies use
`npm ci --ignore-scripts --no-audit --no-fund` before agents run. This installs
execution tools, not database instances, test environments or service credentials.
The complete request-rework folder retains its sibling human-writing and same-release
work-validator helpers/help. It is human invoked, with separately prepared actor,
current QA/PR/evidence reads and direct queue rights; installing it grants none of
those permissions. Refresh the whole bundle rather than copying its SKILL.md alone.

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
| `skills` | Absolute root containing twenty-two complete skill folders and `work-validator` |
| `manifest` | Absolute manifest path with source hashes, bundle, Node and platform metadata |

Retain the receipt and verify `commit` against the approved revision. Point the
agent to `<skills>/<selected-skill>/SKILL.md`, using the actual returned path.
This command copies allowlisted sources, rejects symlinks and installs locked
helper dependencies. It does not run the additional smoke checks below, register
skills with a host or prove that host's supported execution capabilities.

## Install a verified stable path

The installer adds source-hash and dependency verification and the eight checks
below before exposing a stable `skills` symlink:

```sh
node "$PIGBOARD_SETUP/scripts/install-cursor-skills.mjs" \
  --source https://github.com/danielchappell/Pigboard.git \
  --ref "$PIGBOARD_REVISION" \
  --app "$PIGBOARD_APP" \
  --root "$HOME/.local/share/pigboard"
```

The default root is `/opt/pigboard`; the example chooses a user-writable root.
The returned JSON contains the preparation fields plus `stableSkills` and
`verification`. Inspect the expected commit, all twenty-two entrypoints,
`dependencies: "verified"`, and these eight ordered `smokeChecks` values:

1. `pg.Client`
2. `bru --version`
3. `work-validator epic draft`
4. `work-validator ticket draft`
5. `handoff-validator admission record`
6. `config-validator project scope`
7. `manager-preview nonexecuting selection`
8. `manager-preview nonexecuting repair queue`

The manager preview checks execute synthetic selection and repair queue decisions
through the copied runtime before replacing the stable skills link. They verify
zero writes and no execution authority. They do not establish provider
permissions, live freshness, human acceptance or activation. The configuration
check runs the shipped synthetic two-project example through the real installed CLI
and checks resolved mappings and independent stream keys. The admission check
validates a complete setup-only disposable record and its independently computed
canonical digest. The validator checks
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
alone. Resolve referenced paths within the prepared bundle. The writer includes full
Epic/ticket YAML templates, both authoring guides, complete worked examples and
the retained basic-worker prose guide. Its human-writing sibling and same-release
work-validator are required; copying just the writer entrypoint loses the contract.
The implementer composer loads complete `implementer-job` and `implementer-jira`
siblings and its shared handoff/Cursor/review references. The reviewer wrapper loads
complete reviewer-jira, pr-review, pr-commenting and human-writing siblings. QA
loads complete qa-entrypoint references, the selected qa-api/qa-bruno/qa-database/
qa-ui folders, qa-jira and work-validator from that same release. These prepared
capabilities do not establish an accepted delivery loop or activate saved wiring.

## Check project configuration locally

After an explicit refresh/Build, use the [release-readiness guide](release-readiness.md)
from the clean approved source checkout with the retained external skill receipt.
The checker reuses the existing verifier and eight smokes; it never fetches,
installs or replaces a stable link. Preserve the previous selected Build
on failure. Local compatibility, hosted observations, installed acceptance,
PGB-58, human review and activation remain separate.

The same prepared `work-validator` includes the canonical scope schema, pure config
modules, synthetic example and [configuration guide](configuration.md). It adds no
new dependency directory or editable cloud bindings. Use the actual receipt path:

```sh
node /absolute/receipt/skills/work-validator/scripts/check-config.mjs --input /absolute/company.yaml --json
node /absolute/receipt/skills/work-validator/scripts/check-config.mjs --input /absolute/next.yaml --previous /absolute/previous.yaml --json
```

Validation/preview never changes either input or provider state. Installed smoke
checks prove local parsing/mappings only; native Jira access, retained work,
readiness, manager deployment and activation remain separate gates. Failed config
module/schema verification preserves the previous stable link.

## Check work locally

The preparation receipt's `skills` path also contains the validator. Substitute
that actual versioned path when refresh can overlap a run, and your absolute
input file; the stable example uses the default
root (use `stableSkills` for another root):

```sh
node /absolute/receipt/skills/work-validator/scripts/validate-work.mjs --mode draft --input /absolute/work.yaml --json
node /opt/pigboard/skills/work-validator/scripts/validate-work.mjs --mode start --input /absolute/work.yaml --context /absolute/facts.yaml --json
```

`draft` checks editable structure; `structure` checks complete structure without
context. `start` additionally requires the separate approved local YAML/JSON facts
snapshot shown above. Prepare it outside the ticket using the complete context
examples linked from [authoring](authoring.md); every field is required. Keep operation facts
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
This includes ordinary selection and the eighth repair queue semantic check.
Keep the previous receipt and versioned skills path. A failed verification can
leave a candidate release under `releases`; retain its manifest and files while
resolving the named failure. An early preparation failure may leave no candidate
release. Internal staging and smoke temporary files are removed by the scripts;
the public failure is not a raw transcript of those internal checks.
Agents executing a ticket report missing preparation instead of installing packages
or finding replacement tools. Reconcile uncertain external actions before retrying.

For removal, first stop new invocations and account for existing runs and retained
evidence. Remove the Pigboard Build step and prompt references from the affected
configuration, then remove only the confirmed installation root/releases after no
run uses them. Cache pruning/removal is operator work; no uninstall command or
automatic pruning is implemented. Retain evidence required by the team. Removing
skills (including the validator payload in the same release/root) does not remove Jira rules, revoke provider credentials or cancel agents;
handle those explicitly within the authorized setup scope.


## Local handoff validation

The same `work-validator` payload now includes the canonical handoff/pointer
schemas, receipt-chain runtime and [handoff guide](handoffs.md). Prepared releases
pin canonicalize 4.0.0 and parse5 8.0.0 alongside Ajv 8.20.0, ajv-formats 3.0.1 and
YAML 2.9.1. Node 20+ support is unchanged. No packages are fetched during validation.

```sh
node /opt/pigboard/skills/work-validator/scripts/validate-handoff.mjs --mode record --input /absolute/record.yaml --format yaml --json
node /opt/pigboard/skills/work-validator/scripts/validate-handoff.mjs --mode chain --input /absolute/receipts.json --json
```

The installed guide lives at `<receipt.skills>/work-validator/docs/handoffs.md`.
Source use runs the same commands with `scripts/validate-handoff.mjs` after root
setup. Record mode checks shape/digest; chain mode checks bounded supplied provider
observations. Both report live freshness as not evaluated. A valid partial/blocked
record is not completion. Missing/corrupt parser, canonicalizer, schema or script
fails preparation/verification and keeps the previous stable skills binding.
Validation/preparation writes nothing. The composed implementer is a configured
producer of typed results, but installation activates no automation, manager or
human-unblock path; ordinary reviewer delivery uses [reviewer-jira](../skills/reviewer-jira/SKILL.md) for actual predecessor worker-current preflight and one approved-PASS append/read-back/recheck/direct QA handoff. Unsupported failure/wait/block, repair/resume and human rework stop before candidate construction or append, retaining complete local findings/partial ledgers and original receipts with no transition. Separate strict-chain/legacy examples do not grant a fallback. Prepare actual configured independent actor approval/own-revocation controls, exact receipt reads and direct transition rights before use. QA source composition is available; compatible saved wiring and live acceptance
remain separate. See the guide for the complete closed
envelope, synthetic examples, exit meanings, budgets and recovery.


## Prepare a typed implementer comment

The same-release validator payload includes `scripts/prepare-handoff.mjs`. It
validates original complete YAML, escapes the summary and builds supported HTML
(or ADF), then checks extraction/digest equality before returning one JSON object:

```sh
node /opt/pigboard/skills/work-validator/scripts/prepare-handoff.mjs --input /absolute/record.yaml --summary /absolute/summary.txt --format html
```

Use the receipt's actual skills path. Source use is `node scripts/prepare-handoff.mjs`
with the same arguments. No provider calls or file writes occur. The unchanged
standard installation smoke does not execute this helper or prove agent behavior;
installed regression checks execute the helper and chain validation from an
unrelated working directory. Missing/changed helper or sibling files fail existing
manifest verification, preserving the previous binding. See [handoffs](handoffs.md)
for bounds, diagnostics, local examples and safe publication responsibilities.

## Installed offline manager preview

The prepared `work-validator` now includes the [offline manager preview](manager-preview.md),
its pure policy modules and complete runnable synthetic fixtures. From any working
directory use Node20+ and the actual receipt's skills location:

```sh
node /opt/pigboard/skills/work-validator/scripts/manager-preview.mjs --help
node /opt/pigboard/skills/work-validator/scripts/manager-preview.mjs --config /tmp/config.json --input /tmp/snapshot.json --json
```

Normal preparation installs the locked validator dependencies; installation verifies
an actual nonexecuting selection with the copied runtime before replacing the
stable skills link. Missing/corrupt modules or wrong smoke output leave the previous
stable release selected. Run normal preparation again at the approved pin outside
a delivery command; preview never repairs/fetches dependencies. Root source use
requires the normal contributor dependency preparation. The preview guide provides
snapshot fields, bounds, complete human-case commands, structured/readable output
and recovery. This local proposal performs zero provider/state writes and provides
no activation, live freshness, permission or human acceptance evidence.

For scoped Jira collection, append `/work-validator` to the absolute versioned
`skills` path in the preparation receipt. The [inventory guide](manager-preview.md#complete-ordinary-jira-inventory-library)
shows how to import the library and run the synthetic HTTPS fixtures from that
root, including recovery for missing copied material.

## Verify the structured QA helper closure

Install/refresh the entire pinned, reviewed published bundle, not four loose
`SKILL.md` files. All four helpers depend on
`qa-api/references/structured-steps.md`, same-release authoring/handoff siblings
and the prepared validator. The current twenty-two-skill allowlist ships
these helper folders. The separate qa-jira addition supplies publication only, with no new engine. Use the receipt's immutable
versioned `skills` path for a run, rather than following a later stable-link refresh.
Prepare locked Bruno 4.2.1 and pg 8.23.1 through normal installation **before** QA.
Missing runtime/reference/hash or a failed check blocks the run; preserve the last
verified installation and refresh from the approved published revision during
operator setup. Never repair/fetch dependencies within delivery.

Check all four installed entrypoints and the common reference against the pinned
manifest; run existing install verification/smoke checks. Those checks establish
installation only. [Bounded helper use](using-pigboard.md#prescribed-structured-qa-helpers)
also needs complete work/trusted context, ready original PR deployment proof,
restricted access, prepared artifacts, actual outputs and retrievable evidence.
The QA entrypoint now composes full structured Story/Bug work, ordered helpers
and one actual qa-jira final assessment. Prepare actual Grok High, allowed helper
execution, identity/tenant/access, private evidence retrieval and bounded clock/
wait capabilities when prescribed. A model string or fixed clock card proves none
of those capabilities. Static zero-AI work requires no runtime helper/deployment.
PGB-90 owns saved automation compatibility;
PGB-58 owns full-loop acceptance and activation remains a separate owner decision.
Keep saved wiring inactive until its separate gates pass. Do not treat local fixture or installation
success as hosted/customer delivery acceptance.

## Prepared QA publisher setup

The 22-skill bundle includes the full qa-jira folder and its same-release
work-validator dependency. Source entrypoint: [qa-jira](../skills/qa-jira/SKILL.md);
installed entrypoint: `<receipt.skills>/qa-jira/SKILL.md`. Prepare the configured
QA actor, native/PR/evidence reads, canonical append transport, exact comment read,
direct QA transitions and status read, plus a private evidence destination and
intended audience. No credentials or setup repair belong inside a delivery run.

Verify the receipt commit, manifest hashes and copied publisher/validator/formatter
bytes. From outside the source checkout, use the returned immutable validator root
to run raw start, record, chain and HTML/ADF formatter checks on the prepared inputs.
Local tests copy real locked validator dependencies and simulate unrelated helper
installation; they establish parity/recovery, not default installation, provider
execution or live acceptance. The source fixture is never shipped. Keep dated
installation receipts at their original scope. Changed entrypoint/reference/
publisher bytes require a new immutable source/manifest/payload hash binding,
complete sibling/link closure and installation smokes. Freeze `receipt.skills`
for each run; refresh only outside delivery, preserving the previous verified
release and retained evidence. Never repair dependencies or switch a running QA
to a new stable link. PGB-90/PGB-58 compatible installed/live acceptance and
owner activation remain separate gates.

The eighth smoke evaluates an authentic synthetic stale-child queue through the
actual copied offline preview. It checks the queue-only edge, exact covering
parent/cause, missing-publication payload and false execution authority with zero
writes. Like the other smokes, this is local supplied-data capability, not live
Jira/Cursor acceptance, deployment or automation activation. A missing/corrupt
repair module, fixture or semantic result blocks installation before replacing
the prior stable skills link. Preparation remains separate from delivery runs.


### Ordinary recorded preview in a prepared validator

The same prepared `work-validator` carries the source ordinary API and CLI. Use
`node <receipt.skills>/work-validator/scripts/manager-preview.mjs --mode ordinary
--config /absolute/config.json --input /absolute/snapshot-v2.json --json` (one line).
The explicit ordinary route requires snapshot/v2; omitted mode retains the legacy
snapshot/v1 repair fixture route used by existing installer smoke checks. No new
installation setting, export command or provider access is needed. Follow the
[ordinary contract and recovery](manager-preview.md#ordinary-recorded-policy).
Installer payload/dependency verification, semantic checks, candidate evidence and
previous stable-link protection remain required. A copied fixture check proves
local compatibility, not complete173/State/AWS integration or human acceptance.

## Ordinary worker checker

The prepared work-validator includes `--mode worker-current` and `validateWorkerCurrent`. Use the same pinned installed runtime for all three ordinary roles. Preparation and installation checks verify current copied files and dependencies; they do not prove provider publication or authorize activation. Missing or damaged runtime is a setup failure; do not fetch dependencies or fall back to source during delivery.

See the [ordinary worker contract](handoffs.md#ordinary-worker-release-boundary) for the closed envelope, exact readback and recovery.

The same prepared runtime includes `--mode worker-assignment` and
`validateWorkerAssignment(input)`. Check availability on the reviewed pin using
`--help --json`. Its `worker_capabilities` lists both worker purposes and their
input and result schemas. The assignment checker uses the existing prepared
dependencies and installation receipt. [Worker assignment and inability](handoffs.md#worker-assignment-and-inability).

Use a reviewed source checkout and its prepared installation for this local
example. Set the two absolute paths from the checkout and the installation
receipt's physical `skills` path. Run from an unrelated directory.

```sh
PGB161_SOURCE=/absolute/path/to/pinned/pigboard
PGB161_SKILLS=/absolute/path/to/prepared/release/skills
PGB161_SAMPLE=$(mktemp -d)
cd "$PGB161_SAMPLE"

node -e 'const p=JSON.parse(require("node:fs").readFileSync(process.argv[1]));process.stdout.write(JSON.stringify(p.worker_assignment_h02.inputs["B-first-native-readback"]));' \
  "$PGB161_SOURCE/test/fixtures/handoff-chains.json" > assignment.json
node "$PGB161_SOURCE/scripts/validate-handoff.mjs" --mode worker-assignment --input "$PWD/assignment.json" --json
node "$PGB161_SKILLS/work-validator/scripts/validate-handoff.mjs" --help --json
node "$PGB161_SKILLS/work-validator/scripts/validate-handoff.mjs" --mode worker-assignment --input "$PWD/assignment.json" --json
```

Both checks accept the same supplied fixture with
`publication: readback`, native comment ID `6101` and
`execution_authorized: false`. To inspect the contrast, extract
`B-pre-PR-unpublished` in the same way. It reports the same candidate identity
and a null published reference. These fixtures use simulated observations.
Designated human acceptance and actual provider actions require separate evidence.

From the pinned source checkout, the following commands run the frozen
PGB-161-H02 packet through the source and a disposable prepared copy. Keep the
sanitized outputs and pins you need for review. The tests clean up their
disposable local build and input files.

```sh
node --test --test-name-pattern='PGB-161' test/receipt-chain.test.mjs
node --test --test-name-pattern='PGB-161 H02 copied' test/cursor-environment.test.mjs
```
