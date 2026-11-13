# Structured Stories and inactive Cursor automations

Owner outcome: finish the three inactive Cursor automation configurations and their
versioned skill pointers; make the Story-writing skill produce structured readable
Jira text containing all execution requirements. Jira automation wiring follows.
Token setup is in progress separately and requires the owner's email verification
and final credential creation/save. No delivery automation activation is authorized.

Reuse the accepted MVP stage ownership, one-repo/one-PR/<2 days/20 files boundary,
High planning + one independent High review + Medium implementation, High PR review
and High QA, same-PR rework, human-owned blockers and Human Review after QA. No new
hosted coordinator, ticket parser, Jira custom-field provisioning, preview builder
or MCP migration. Existing authoring uses four human-readable body sections.

Source: checked ai-working-kit main on 13 November 2026, commit
5bef5cf140bd5ea92e6600f0ff2a0be726e4c7ac, Story skill blob
560be8a00c977eb90e13d05e022855eff4175b0e. The latest upstream is older than the
installed Pigboard-specific amendments. Preserve the owner's accepted stricter size,
repo ownership and complete prescribed QA case changes while importing the latest
source as the baseline. Pigboard will own this adaptation; do not change upstream.

## Contract and ownership

Keep title and Problem to solve / Acceptance Criteria / Technical Acceptance
Criteria / Testing Strategy. Use stable labels and requirement/case/step IDs;
readable tables and keyed lists are the structure, not a new JSON-only ticket.

- Jira-native project, issue type, epic, assignee and workstream label are canonical
  metadata. Do not duplicate them as a second authority in prose. Missing/ambiguous
  supplied values remain unresolved; the writer does not guess real accounts/IDs.
- Story body owns repository URL, explicit base branch, allowed changes/exclusions,
  related-repo boundaries, accepted decision references, AC/TAC IDs, complete QA
  case intentions, ordered named skill steps, actors/data/access requirements,
  expected results, dependencies, bindings, evidence and bounded cleanup/waits.
- Separate ready-for-implementation intent from ready-for-QA execution detail.
  Implementation may fill only specifically declared mechanical preparation slots
  (request/assertion artifacts, scoped SQL, UI routes/data bindings) and report exact
  revisions. It may not invent expectations, skills or scope. Missing product or
  access decisions prevent readiness. Downstream review checks prepared details.
- Requirements remain in the body. Stage outputs use linked, versioned comments
  under existing handoff contracts, with the same PR/branch and reviewed execution
  artifacts. All cases/expectations stay on the ticket; repository artifacts are
  executable support, never a replacement for the case list.
- Pipeline PR comment supplies ready environment URL/deployed revision. Trusted
  harness supplies run/visit/ownership, credentials, available tools, transition IDs,
  evidence destination, and model/CI limits. Do not force these into authoring prose,
  claim a ticket grants authority, or invent pipeline data before it exists.

## Delivery slice

One PR, under 20 changed files and two days: import/adapt write-pr-sized-stories with
one canonical structured-ticket reference and one complete synthetic example; link
it from implementer/reviewer/QA inputs; add authoring skill to verified external
bundle (11 skills, no new dependencies); add QA minimal prompt/setup record and a
single three-automation setup matrix; correct stale enabled/old-pin status claims.
Keep prompts as one sentence naming the installed entrypoint and provided ticket.
Existing shared PR criteria, comment handling and QA behavior remain unchanged.

Verify the current automation UI, configure missing QA with Grok High, Plexus/master,
webhook and qa-entrypoint; remove unwanted PR-creation/memory tools for QA/review;
keep all three inactive. Do not generate webhook secrets, attach Jira or dispatch a
run. Verify actual High/Medium/subagent controls if available; record an honest
platform limitation rather than pretending prompt text configures model effort.
Publish/review/merge source, refresh the environment skill pin with the existing
CLI setup intact, test Build and select only a passing snapshot. Do not upgrade
credential permissions through this slice or enable automations.

## Verification and rollback

Two independent design/plan reviews before edits, then fresh committed-artifact
reviews. Use independent scenario checks: complete UI and API+DB cases; wrapper
child ownership prevents duplicate qa-bruno execution; missing expectation blocks;
mechanical preparation stays implementer-owned; cross-repo scope splits; secrets
and PR environment are not copied into descriptions; missing skill/tool blocks.
Run bundle tests and skill validation. Cursor UI and successful Build receipts are
separate from mocked/scenario validation and from live Story delivery. No live
Story test or Jira writes in this slice. Preserve previous Build and account setup;
failed Build keeps old selection and stops for a human.

Principles: Intuitive—four familiar sections and one filled example; Discoverable—
canonical field labels and exact skill pointers; Delightful—no repeated setup or
mandatory irrelevant fields; Token saver—named ordered skills and explicit outputs;
Secure—no secrets/authority in ticket text, inactive automations; Agents are equal—
structured readable text serves humans and agents; Dependable—separate stage
readiness, complete case dispositions and honest unverified platform constraints.

## Active queue

1. Reviewer token: waiting for owner email verification, then prepare five scopes
   and hand off final creation/save. Existing token/profile stays read-only.
2. Structured contract and inactive automation setup: design/plan review pending.
3. Publish, independent review, CI, merge and Cursor Build/UI verification.
4. Jira automation wiring: explicitly deferred until above is ready.

Planned file inventory (16 total): this plan; `skills/write-pr-sized-stories/SKILL.md`;
its `references/pigboard-ticket.md` and `references/pigboard-example.md`;
`config/skill-bundle.json`; `test/cursor-environment.test.mjs` (10 -> 11 entrypoints,
assert installed writer/reference exists); `config/cursor/qa-prompt.txt`;
`config/cursor/AI-Daniel-1-qa.md`; `config/cursor/automations.md`;
`skills/implementer-entrypoint/references/handoff.md`;
`skills/qa-entrypoint/references/execution-record.md`;
`skills/pigboard-pr-review/SKILL.md`; `README.md`; `docs/workflow.md`;
`config/cursor/AI-Daniel-1.md`; `config/cursor/AI-Daniel-1-pr-review.md`.

Requirement-to-verification mapping: ticket field/source ownership and readiness ->
independent UI/API+DB/missing-input/cross-repo scenarios; nested skill ordering ->
API wrapper child ledger scenario; versioned references/authoring bundle -> skill
validation, install test asserting writer and canonical reference, real Build;
minimal prompts/three inactive model/environment selections -> observed Cursor UI;
source/pin provenance and no activation -> setup matrix plus Build receipts and
final inactive switch readbacks. Account-specific unavailable phase controls remain
an explicit unresolved setup gate; do not equate a saved automation with delivery
readiness. Any discovered need to exceed 20 files splits before implementation.

Design/plan gate: two independent Sol reviewers returned CLEAN on the updated plan,
covering 16/16 planned files and the requirement/verification mapping with second
sweeps and independent seven-principle assessments. The one concrete plan finding
(missing explicit file/verification inventory) was fixed before implementation.

Author implementation assessment: the bundle now includes the structured writer,
canonical reference and separate UI/API+DB synthetic examples. Three entrypoints
link the shared contract; prompts remain minimal. Intuitive/discoverable: familiar
sections and exact labels; delightful/token saver: mechanical preparation slots
avoid authoring irrelevant future deployment data while preserving expectations;
secure: no credentials or run authority are derived from prose; agents are equal:
steps and readable evidence fields serve both audiences; dependable: phase readiness
and setup/live evidence remain separate. npm test passed 22/22, including installed
writer/reference/example byte equality. Both changed skill validators passed.
Independent scenario/committed-artifact review and live Cursor setup remain pending.
