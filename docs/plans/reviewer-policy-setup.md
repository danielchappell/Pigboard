# Prepare the reviewer CLI policy

This bounded continuation reuses the reviewed permanent CLI architecture and
Jira/Cursor MVP workflow. The owner authorized finishing token privileges and CLI
setup; all delivery automations remain inactive. No live comments, approvals,
Jira transitions, credential creation or token reads are part of this slice.

## Current facts and design

PR 53 merged as 5e0c0e9020514f814c7779be02ade64b11ee3d7c with the exact reviewed
e81755e tree, 22 passing tests, hosted CI and two independent CLEAN code reviews.
The five-scope replacement token is prepared; owner creation/save is pending.
The existing configuration script only produces read-only profiles. Adding token
rights alone cannot make that CLI profile publish review decisions.

Pinned Rovito 0.1.295 source 6b0966f7c467c518de8b5bf6c84f33250dafb262 classifies
PR comments, approval and changes-requested as collaborative-write, and merge as
operational. Its review-write policy permits read/collaborative-write and rejects
operational. This is the CLI boundary, not a provider-token restriction: Bitbucket
write:pullrequest includes merge. Do not claim protection against arbitrary use
of the raw credential or changing CLI policy.

Extend offline setup with an explicit `--policy read-only|review-write` option.
Default remains read-only; reject any other policy before creating files. Both
config and capability report the selected value. Provider verification and full
workflow readiness remain false: configuration cannot prove remote permissions,
Jira capability, run ownership or evidence delivery. Existing mismatched profiles
are preserved and fail, including attempted policy changes in either direction.
Identical setup is reusable. No automatic migration, credential handling or network.

Keep the standard runtime path unchanged. An operator must use a fresh Build/root
or explicitly resolve an existing mismatch; the agent never upgrades its profile.
This avoids a migration mechanism and keeps credential-free setup reversible.

## Bounded implementation Story

Prepare an explicitly selected reviewer policy

Problem to solve

An operator cannot prepare the CLI for authorized PR review writes while keeping
the existing read-only setup available.

Acceptance Criteria

- Omitted policy produces read-only setup; explicit review-write produces that
  policy consistently in config, capability and receipt.
- No setup mode claims provider access or full review readiness.
- Invalid policy and existing policy mismatch fail without changing existing files.
- Documentation explains provider scope versus CLI policy and remaining live gates.

Technical Acceptance Criteria

- One PR, five files: this plan; scripts/configure-reviewer-cli.mjs;
  test/reviewer-cli.test.mjs; config/cursor/rovito-cli.md;
  skills/pigboard-pr-review/references/rovito-cli.md. Under two working days.
- Reuse all existing identity, path, permission, staging and credential protections.
- No dependencies, new runtime service, agent prompt additions or provider calls.

Testing Strategy

- Extend offline tests for explicit policy output, exact reuse, false readiness,
  invalid policies and preserved read-only/review-write mismatch. Existing isolation
  and synthetic-secret non-persistence tests continue to apply.
- Run npm test and diff checks. Two independent plan then committed-code reviews.
- Hosted CI before authorized merge; verify merged tree. Cursor Build/secret save
  and authorized read-only checks are separate acceptance steps after publication.
  A PR write test requires a nominated fixture and explicit action authorization.

## Principles and queue

Intuitive: one named opt-in matches CLI terminology. Discoverable: docs show exact
values and recovery. Delightful: default and identical rebuild remain unchanged.
Token saver: deterministic setup, no agent installation. Secure: no credentials,
no silent elevation; limits of CLI policy explicit. Agents are equal: structured
receipt and readable docs expose the same state. Dependable: local preparation,
provider access and workflow readiness remain distinct; mismatches preserve data.

Sequence: independent review of this bounded plan, implementation and tests, fresh
committed-code reviews, PR/CI/merge. In parallel the owner saves the token. Then
refresh inactive Cursor setup and complete QA configuration. Jira wiring, live
review writes, model-phase verification and delivery activation remain separate.

Plan gate: two independent Sol reviewers returned CLEAN after examining 5/5 named
files, second sweeps and independent seven-principle assessments. The technical
reviewer also verified both pinned policy sources. No findings required changes.

Author implementation assessment: all five planned files changed; 24/24 local
tests pass. Intuitive/discoverable: explicit option and two matching guides;
delightful/token saver: unchanged default and reusable deterministic setup;
secure: unsupported policies and two-way mismatch fail without replacement;
agents are equal: receipt, capability and documentation expose the same policy;
dependable: both readiness claims remain false, and no provider or activation
action was performed. Independent committed-code review and hosted CI are pending.
