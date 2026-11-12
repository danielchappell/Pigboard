# Deterministic Cursor environment installation

Reuse the reviewed external skill distribution and agreed Jira workflow. This delta
finishes the environment boundary: the agent receives an existing skill path, never
an instruction to clone, install, route or troubleshoot setup. Preserve app files,
existing unrelated changes, and the minimal invocation prompt.

## Design and implementation

Cursor's saved personal Plexus environment has an Install Script, executed to
completion during a Build. Use it to bootstrap a pinned Pigboard setup revision into
a temporary directory outside Plexus, then run a new Node install adapter. Bootstrap
uses prepared Git authentication, argument-safe shell variables, noninteractive Git,
cleanup of only its temporary checkout, and no secret-bearing URL or verbose logs.
Keep the complete install command in config/cursor/environment-install.sh. The only
cloud configuration is that versioned command plus an explicit reviewed commit.
Do not use agent onboarding or startup services to install skills.

The adapter accepts source/ref/app/root, with root default /opt/pigboard. Preparation
uses the existing prepare() implementation and root/releases. Before any mutation,
reject a root inside or enclosing the app, inside any Git checkout, or a root that
is itself a symlink. Reject a pre-existing root/skills unless it is a managed symlink
into root/releases. Never replace arbitrary directories. Prepare a fresh release,
validate all ten entry files and manifest hashes and the two installed dependency
packages, then atomically rename a unique temporary symlink to root/skills. Record
commit/release/manifest as JSON in Build logs. A failure returns nonzero, leaves the
previous binding intact, and does not print success. Unique immutable releases remain
safe across concurrent preparation. The stable link is local to a Build/isolated VM,
not a shared disk between running agents. No automatic deletion of older releases.

The shell creates /opt/pigboard with the current build user's ownership using sudo
only for that directory when needed. Git/npm run as the build user with its prepared
authentication. No token is copied from this workstation. A missing credential is a
human setup blocker. The private source is github.com/danielchappell/ski-stack; first
publish the reviewed commits to its existing branch, without merge or release.

## Failure, refresh and rollout

Cursor retains its previous successful Build if a replacement fails and may use a
default image before a first successful Build. Therefore keep the automation inactive
until a successful cloud Build contains the expected skill revision. This script's
nonzero exit is not an agent-admission lock. Pin the first tested revision; refresh by
changing the configured revision and triggering/testing a new Build while automation
is inactive. Do not promise that an out-of-band Pigboard commit triggers a rebuild.
No per-run network fetch or model-driven preflight. Jira routing remains separate.

Configure and inspect the cloud Build logs; verify exact commit, entrypoints, source
hashes and actual dependency imports before declaring environment readiness. If
private Git access fails, save the configuration and request only that missing access.
Actual model phase controls, tools and Jira trigger wiring remain separate activation
prerequisites; a successful environment Build alone does not enable the automation.

## Verification and documentation

Add focused fixtures for successful stable binding, refresh preserving old release
and app, dependency/hash failure leaving old binding intact, root/path rejection and
unmanaged existing destination rejection. Exercise real locked npm installation on
the reviewed bundle, then npm test. Review this delta with two independent Sol agents,
commit and obtain two fresh exact-commit reviews before publication. Update README
and the automation setup record with commands, refresh/recovery and observed cloud
state. Keep local tests, cloud Build success and full automation acceptance distinct.

## Seven principles

- Intuitive: one existing skill path and a short prompt; setup is a separate command.
- Discoverable: README gives prerequisites, exact install command and failure recovery.
- Delightful: no recurring manual copies or setup conversations with the worker.
- Token saver: Git, npm and verification run deterministically before agent work.
- Secure: private source stays private, prepared auth, scoped paths and no secret logs.
- Agents are equal: stable machine-readable path/receipt and human-readable Build logs.
- Dependable: only a fully verified release changes the binding; failed Builds do not
  imply readiness, and activation remains off until all required evidence exists.

## Access delta after the cloud trial

The first draft Build reached the install script but could not fetch the private
Pigboard repository. The pinned commit was independently verified as published.
Add optional PIGBOARD_DEPLOY_KEY environment-secret support. Capture it into a
non-exported shell variable and unset the raw environment variable before any child
process. Write the key with mode 0600 in the existing owned temporary directory;
unset the captured variable afterward. Pin GitHub's official Ed25519 host key for
[ssh.github.com]:443, with strict host checking, BatchMode, IdentitiesOnly and no SSH
agent identity. When present, select only the fixed SSH URL of the same Pigboard
repository and pass it to bootstrap and prepare. No global Git config edits. Trap
cleanup removes the temporary key on success/failure. Fixtures verify configuration,
no secret inheritance, mode and cleanup. Live repository key registration and secret
installation require the pending explicit access approval. This delta passed two
independent Sol plan reviews before implementation; it does not authorize activation.
