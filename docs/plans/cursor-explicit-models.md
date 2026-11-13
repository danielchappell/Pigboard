# Use the verified Cursor Task controls

This correction supersedes the invocation mechanism in cursor-model-phases.md,
while preserving High planning, one independent High reviewer and Medium execution.
The environment/skill architecture and minimal automation prompt are unchanged.

## Observed platform contract

Build bld-20261113-6159d5c3-112c-41a9-997f-1c9bf6bab5f5 installed the proposed
user agents, but Cursor session
[bc-b264dab4-d964-4f66-9bd1-a87eb138a5de](https://cursor.com/t/safeguardglobal-engineering/agents/bc-b264dab4-d964-4f66-9bd1-a87eb138a5de)
rejected both custom names as invalid subagent_type before child tasks started.
Files existing in the VM did not register them in the cloud Task harness.

A no-tool capability inspection exposed the allowed generalPurpose type and model
patterns grok-4.7-{low,medium,high,xhigh}{,-fast}. A second bounded setup check made
one fresh generalPurpose call with model grok-4.7-high and one with
grok-4.7-medium, both machine={type:same_machine}, no resume. Both completed;
Cursor task cards displayed Grok 4.7 High and Grok 4.7 Medium. Agent IDs:
bc-05160f9f-10aa-5201-8ca5-2c1e9ccee8ba and
bc-58be365c-a8a4-5880-918c-f5ffa632a487. Child observations matched the parent
/agent/repos/plexus revision 6034e4b04807b9d8963b5309e27377c8be52712c.
There was no authorized Story and delivery remained BLOCKED. No provider calls,
file changes, PR actions or Jira transitions were requested/performed by the check.

The Task response returns IDs but does not echo model/effort. Therefore distinguish
operator-observed task-card model evidence from the agent-visible dispatch receipt.
Cursor's documented task card is the model observation surface. Do not claim the
response contains a model, Fast flag, or fresh-context attestation. Distinct new IDs,
no resume, the documented fresh Task behavior and same_machine calls establish
fresh tasks; matching local checkout observations establish continuity for this test.

## Bounded correction

Use built-in generalPurpose with the exact tested explicit model slug for each
phase. High parent supplies existing plan-review instructions for one fresh review,
then phases 3–5 of implementer-entrypoint to the Medium executor. A model name in
prompt prose never selects it: the actual Task model argument must be set. Model
availability must include the exact selected slug; rejection/unknown availability
blocks with no fallback/retry. Parent waits for each foreground result.

Runtime verification uses the setup-verified binding plus actual explicit dispatch
arguments and the accepted task result/ID. Record requested selection and observed
model separately; when model metadata is not echoed, label that fact and reference
the setup acceptance evidence. Do not ask the child to invent introspection that
this platform does not expose. Before editing, executor requires the trusted parent
phase assignment using the verified binding and complete accepted plan/inputs.
If the runtime exposes conflicting model metadata, or binding validity cannot be
established, block. Any model/version/runner change needs renewed setup acceptance.
This establishes configured model selection, not a claim of per-call telemetry.
Align plan-review.md and handoff.md with this explicit Cursor evidence route;
other harnesses retain their existing model-verification requirements. Missing
coverage, independence, scope or actual artifact evidence still blocks CLEAN.

Remove the unused custom definition installer, definitions and tests. Revert only
their bootstrap call/mock; existing skill preparation remains. Role instructions
stay in the shared installed skill and its Cursor reference. Fresh Builds avoid
obsolete VM files; no deletion of user's global definitions or app changes.

## Implementation Story

Use explicit model controls for Cursor implementation phases

Problem to solve

Installed custom names cannot be invoked in this cloud harness. The verified
built-in Task controls can run the intended High/Medium model selections.

Acceptance Criteria

- Parent invokes one fresh High review and Medium execution through explicit
  generalPurpose/model/same_machine controls, preserving the same PR and plan.
- Missing/rejected model selection blocks; no silent inherit/fallback or extra
  reviewers. Replanning remains High. Core review remains read-only by contract;
  do not claim a readonly sandbox flag for generalPurpose.
- Evidence distinguishes setup task-card observations, per-run requested controls,
  accepted task IDs and absent telemetry; no invented actual-model claims.
- Deterministic setup still installs the versioned skill outside the app and all
  delivery automations remain inactive. Remove the ineffective custom-name setup.

Technical Acceptance Criteria

- Twelve files: this plan; delete config/cursor/agents/{pigboard-plan-review,
  pigboard-execution}.md, scripts/install-cursor-agents.mjs and
  test/cursor-agents.test.mjs; update config/cursor/environment-install.sh,
  test/cursor-bootstrap.test.mjs, skills/implementer-entrypoint/SKILL.md,
  its references/cursor.md, references/plan-review.md and references/handoff.md,
  and config/cursor/automations.md.
- Under two working days, one PR; no dependencies, API key, new service, wider
  provider access, new prompt text or model substitution.

Testing Strategy

- Preserve bounded runtime evidence above; it proves model selector behavior, not
  a completed Story. Inspect final instruction consistency and changed bootstrap
  behavior; run existing full setup tests and skill validation/diff checks.
- Two independent plan and code reviews, hosted CI, authorized merge and tree
  verification. Refresh the environment from reviewed source, inspect successful
  Build and retained role references, and verify all three switches remain off.
- Jira wiring and PR-write acceptance are separate later gates. This correction
  adds no authority to run delivery or perform provider writes.

Principles: intuitive familiar phases; discoverable exact Task fields and one
shared skill; delightful removal of unusable setup; token saver bounded calls and
Medium execution; secure unchanged authority and honest readonly limitations;
agents equal available noninteractive controls rather than impossible telemetry;
dependable explicit evidence provenance, no fallback, retained failure history.

Plan gate: two independent Sol reviewers returned CLEAN for updated plan SHA-256
1c50db74f171a1ef0494d463fc4957d1ddb0ef51ee4c8aacf9bfb9c6bc929ece. Both required
including shared review/handoff evidence contracts; that in-scope gap was fixed
before implementation. Coverage 12/12 files, second sweeps and seven principles.

Author assessment: twelve planned files changed; the failed custom-name route is
removed, while phase contracts use the two tested explicit selectors and distinguish
setup observations from absent per-call telemetry. All seven principles above remain
met: familiar phases and exact controls, reduced setup and Medium execution cost,
unchanged authority, usable noninteractive receipts and honest outcome evidence.
Existing setup tests pass 24/24; four tests for the removed installer were removed
with that implementation. Independent code review and refreshed Build remain pending.
