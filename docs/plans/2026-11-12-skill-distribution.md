# Pigboard skill distribution and first automation

Scope: deliver a portable, dependency-light setup command which fetches the approved
Pigboard skills outside an application checkout, refreshes on explicit invocation,
and returns an immutable release path. Make README the human setup guide. Preserve
older runtime code and documentation as historical material rather than deleting it.
Reuse the reviewed Jira/Cursor workflow and rollout proposal. No hosted coordinator,
preview provisioning, merge, deployment or new scheduling policy.

Implementation: a Node 20 script accepts source Git URL, ref, external cache directory
and application path. Resolve real paths and reject a cache inside any Git worktree.
Fetch in a temporary checkout with Git argument arrays (no shell interpolation),
resolve the requested ref to a commit, copy only the declared complete skill folders,
reject symlinks, hash the package and write a manifest. Install locked Bruno/Postgres
dependencies before publishing. Stage in the destination filesystem and atomically
rename a successful release; failures must return nonzero and never select stale work.
Each invocation returns an absolute immutable skill path and commit. No shared mutable
current symlink; running agents retain their selected release. Concurrent installs
use unique staging paths and tolerate an already-published identical release.
Credentials use prepared Git authentication, never prompt text or embedded URL tokens.
Do not print subprocess stderr which could disclose credentials. Keep scratch cleanup
bounded to directories created by this invocation. A failed fetch/install is a setup
blocker, not a model recovery task. Explicit release directories support rollback.

Add a fixed allowlist manifest, setup script and meaningful local Git-fixture tests
for fetch, refresh, old-release stability, missing files, symlinks, invalid refs and
application/worktree destination rejection. Test dependency installation without live
network using an injected fixture executable; production must use npm ci. README
must distinguish local work from published source and document Git/Node/npm/access,
install versus refresh, outputs, failure and manual rollback. Preserve relative skill
dependencies. The story-writing skill remains a separate upstream grooming tool; this release packages only the ten execution skills already in this repository.

First automation: inspect Cursor account and environment, get confirmed target repo,
prepare an implementer webhook automation for INT / AI-Daniel-1 with exact entry point
and High planning / independent High review / Medium execution. Verify real model
controls; no prompt-only claim. Leave disabled if prerequisites cannot be proved.
No account grants or secrets are invented. Record actual settings and any blockers.

Verification: two independent plan reviews before code; relevant tests then npm test;
commit only this work, obtain two fresh exact-commit reviews and fix in-scope issues.
Publication must not accidentally include unrelated work or private source material.
Configuration is separate from verified live runs and Jira activation.

Principles: Intuitive—one setup command and readable guide; Discoverable—explicit
inputs/results and recovery; Delightful—reuse prepared releases without manual copying;
Token saver—Git/npm setup uses no model decisions; Secure—external real paths, allowlist,
no shell expansion or secret logging; Agents are equal—machine-readable release receipt
plus human guide; Dependable—immutable releases, nonzero failures and exact version logs.
