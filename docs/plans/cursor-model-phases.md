# Configure Cursor implementation phases

Reuse the agreed MVP: High planning, exactly one fresh High plan reviewer per
round, then Medium implementation on the same checkout/PR. The remaining setup
gap is actual model configuration: the saved automation selects only its parent.
No Jira wiring, live ticket work, additional review agent or orchestration service.

## Evidence and chosen design

Cursor's current [subagent documentation](https://cursor.com/docs/subagents) supports
Cloud Agents, user definitions in `~/.cursor/agents`, explicit model IDs and bracket
parameters, fresh contexts and shared checkout. Its [Grok 4.7 page](https://cursor.com/docs/models/grok-4-7)
identifies `grok-4.7` and High/Medium effort. The signed-in account's picker shows
Grok 4.7, High and Fast off. Documentation warns of model fallback; file installation
does not prove the selected model actually ran.

Install two narrowly named user subagents outside Plexus, from the pinned Pigboard
checkout during environment setup: `pigboard-plan-review` with
`grok-4.7[effort=high,fast=false]`, readonly true; `pigboard-execution` with
`grok-4.7[effort=medium,fast=false]`. Parent remains High and owns planning. It invokes
one fresh reviewer using the existing plan-review contract, resolves in-scope
findings, then delegates execution phases 3–5 to the Medium agent with accepted
plan, ticket, revisions, ownership and prior receipts. Executor returns approach
changes to the parent before edits; it cannot replan at Medium or self-review.
Blockers and existing safety/CI/reporting rules remain in the shared entrypoint.

The two definitions point at installed versioned skill content; they do not repeat
the workflow. Minimal automation prompt stays unchanged. Setup verifies complete
definitions are installed, but returns actualModelVerified=false. Before real
ticket delivery, an authorized bounded model-control run must prove discovery,
fresh review context, High/Medium task metadata and checkout continuity. No fixture
run is performed as part of offline setup. Missing model metadata/fallback blocks
delivery; do not substitute self-reported effort or assume installation proves it.

Installer accepts app path and user-agent directory (default current user's
`~/.cursor/agents`). It rejects symlinks/noncanonical paths, application/Git-contained
destinations, conflicting project-level definitions with the same names in Cursor,
Claude or Codex directories, and differing existing owned-name files. Preserve
unrelated files; identical files reuse. Prevalidate both definitions/destinations
before writes; atomically publish each complete file, report failure honestly.
No whole-directory replacement or automatic migration. Fresh Cursor Builds are the
normal refresh path; mismatches require an operator. Standard Node only, no network
or credentials in the installer. Failed Build keeps the previous selected snapshot.

## Bounded implementation Story

Install Cursor agents for the agreed implementation phases

Problem to solve

The implementer has a High parent setting but lacks installed definitions selecting
the independent High reviewer and Medium executor.

Acceptance Criteria

- Setup installs the exact two definitions outside the app and preserves unrelated
  content; repeated identical preparation succeeds.
- The execution contract routes planning/replanning to High, one fresh review to
  High and accepted implementation to Medium, retaining the same PR/checkout.
- Conflicts or unsafe destinations fail without replacing existing definitions.
- Setup never claims runtime model verification or enables an automation.

Technical Acceptance Criteria

- Nine files: this plan; config/cursor/agents/pigboard-plan-review.md and
  pigboard-execution.md; scripts/install-cursor-agents.mjs;
  test/cursor-agents.test.mjs; config/cursor/environment-install.sh;
  test/cursor-bootstrap.test.mjs;
  skills/implementer-entrypoint/references/cursor.md; config/cursor/automations.md.
- Under two working days, one PR; no dependencies, service, extra prompt text,
  provider access, credentials or automatic policy changes.
- Matrix records observed QA creation, all three inactive bindings and passing
  Build bld-20261113-15ee43f7-bf69-40ed-8b43-c61cf657f092, keeping phase acceptance
  pending and keeping per-PR environments/Jira wiring separate.

Testing Strategy

- Offline tests exercise installation/reuse, exact model definitions, preserved
  unrelated files, same-name conflicts, project shadowing, app/Git/symlink paths
  and no credential persistence. Bootstrap fixture confirms setup invocation.
- Run npm test, diff checks, independent plan and committed-code reviews, hosted
  CI and authorized merge with tree verification. Update pinned Cursor setup and
  inspect a successful draft Build before selecting it; keep all automations off.
- Model execution test is a separate final acceptance gate requiring an authorized
  bounded fixture; it must not publish PRs/comments/approvals or touch Jira.

Principles: Intuitive—phase roles match agreed behavior; Discoverable—two clear
definitions and a single contract; Delightful—no manual copying into app repos;
Token saver—High only for plan/review, Medium for implementation; Secure—readonly
review, unchanged authority, no credentials/setup in prompts; Agents are equal—
explicit structured handoff and human-readable setup; Dependable—installed versus
actually verified model controls remain distinct, conflicts fail without repair.

Queue: review this bounded plan, implement/test/review/publish, build and inspect
the inactive setup, then obtain the missing model-execution evidence. Token scope
selection and read-only account/repository checks passed; PR-write acceptance and
Jira transition wiring remain separate. No delivery activation is authorized.

Plan review: both independent Sol reviewers returned CLEAN for SHA-256
216ccaa131bb6f80b343d4ff6e88e3388eb81c10e90a53213f6a42757c70f2bf, with full
coverage, second sweeps and seven-principle assessments. Implementation follows
that bounded design; actual runtime acceptance is still pending.

Author assessment: the nine-file implementation follows the reviewed phase split
and leaves prompts untouched. Intuitive/discoverable: named roles and linked
contract; delightful/token saver: installed once outside the app, Medium execution;
secure: readonly review, conflict/path checks and no credential operations;
agents are equal: readable definitions and structured receipts; dependable: exact
reuse, complete-file publication and explicit unverified runtime metadata. Local
tests pass 28/28, including bootstrap invocation and existing setup regressions.
Independent committed-code review, CI and refreshed Build are pending.
