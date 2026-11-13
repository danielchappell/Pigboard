# Cursor implementation invocation profile

Prepare and verify this profile before enabling automation. It describes required
capabilities, not claims about every Cursor version/account.

| Phase | Actual configured profile | Authority |
| --- | --- | --- |
| Plan / revise approach | Latest available configured Grok, High | Read scope/code, write the plan, deliver authorized blocker handoff |
| Independent plan review | Same configured Grok, High | One fresh independent reviewer per round; read only |
| Implement / fix / verify / publish | Same configured Grok, Medium | Accepted plan and authorized repository/Jira actions |

Pin the available Grok identifier and verify the phase binding during setup; record
phase, reviewer identity and the evidence described below in each run. Do not invent
an identifier, silently substitute a provider/effort or run every phase at one effort.
Prompt prose alone does not select a model or prove independence. Missing verified
phase support blocks implementation. PR review and QA remain separate High runs.

The trusted invocation supplies:

- Configured Jira project, exact workstream label, Story key, In Progress status
  and actual destination/transition mapping. First workstream: Safeguard INT board
  1234 with `AI-Daniel-1`; a board number is not a project or transition identifier.
- Retained plan, phase results and action receipts across continuations. Record an
  actual Cursor run link/ID when supplied; otherwise identify the execution by Story,
  stage, revision and time. Missing run/visit IDs or a lock is not a blocker. Duplicate
  prevention, cancellation and cross-run coordination are deferred; the operator
  takes care around repeated launches during the basic MVP.
- Authorized repository scope/checkout, branch/base, secure credentials and rights
  for code, push, PR, reports and Jira transitions. Scope comes from the project
  configuration plus the ticket's explicit one-repository boundary.
- Installed named QA skills, prepared development tools and reviewer-accessible
  evidence storage. Provide required target-repo tooling before a run; no improvised
  credential discovery, permission grants or shared infrastructure repair.
- A finite CI wait mechanism and deadline, current check policy/results access,
  and a durable failure result. Waiting need not consume model calls; exhausted or
  unsupported waiting blocks, with current pipeline links for human resumption.

Do not activate until repo instructions and this profile are compatible. Additional
mandatory repo gates need an explicitly configured supported path; the skill may
neither waive them nor silently expand its workflow. No second simultaneous plan
reviewer is introduced by this MVP profile. The deterministic Jira admission script
starts new work; reviewer/QA transitions route confirmed rework.

Invocation shape:

```text
Use implementer-entrypoint for the assigned <Story> currently In Progress.
Use the verified Grok High planning and isolated one-reviewer profile, then the
verified Grok Medium execution continuation. Reuse the same PR for rework.
Publish the evidence and move to In Review only after current required CI passes.
Block required scope increases or inability to complete the assignment.
```

This profile does not create Jira/Cursor automations, preview environments or Teams
alerts, and does not grant merge/deployment authority. Live setup must verify all
of those relevant capabilities separately from local skill validation.

## Verified Cursor Task binding

The current cloud harness does not register Pigboard names from user-agent files.
Use the built-in Task type and actual model argument, not a custom subagent name
or a model request embedded only in prompt prose:

| Phase | subagent_type | model | machine |
| --- | --- | --- | --- |
| Independent plan review | generalPurpose | grok-4.7-high | {"type":"same_machine"} |
| Implementation / fixes / verification / publication | generalPurpose | grok-4.7-medium | {"type":"same_machine"} |

These are non-Fast selections. The automation parent is Grok 4.7 High, Fast off.
Before dispatch require these exact model slugs and generalPurpose in the current
runtime's allowed capability list. Do not use inherit, -fast, alternate types or a
new VM. Missing availability, rejected dispatch, conflicting model metadata or
invalid setup evidence blocks without substitution. Any model/version/runner
change requires renewed setup acceptance.

The High parent owns phases 1–2, including replanning. Invoke exactly one fresh
foreground review per round, with no resume, using the existing plan-review prompt
and actual ticket/plan/source/base/instructions. Review is read-only by contract;
generalPurpose does not establish a readonly sandbox. After CLEAN, invoke Medium
execution with phases 3–5 of the shared entrypoint, actual ticket, accepted plan
and review, source/base, checkout/PR identity, previous action receipts and
prepared tools/evidence. Wait for the result. Do not repeat execution at High.

The executor verifies the trusted phase assignment and retained inputs before
editing. If the approach needs replanning, stop before those edits and return
NEEDS_HIGH_PLAN with evidence and preserved state. Parent replans at High, obtains
one fresh High review and dispatches a Medium continuation. Required new scope
always follows the human BLOCKED route. Preserve the same PR and completed-action
receipts. Parent reports the returned outcome without repeating external actions.

### Selection evidence

Setup acceptance in Cursor session
[bc-b264dab4-d964-4f66-9bd1-a87eb138a5de](https://cursor.com/t/safeguardglobal-engineering/agents/bc-b264dab4-d964-4f66-9bd1-a87eb138a5de)
on 13 November 2026 observed completed task cards for Grok 4.7 High and Medium,
with distinct fresh agent IDs and matching checkout observations. This establishes
the configured binding for the tested account/runtime, not a completed Story.

Use that operator-verified binding with the actual explicit dispatch arguments.
Record requested model/effort, Task type/machine, accepted result/agent ID and the
setup acceptance reference. The child receives the trusted parent assignment;
the parent retains the accepted receipt when it returns. Check any actual model
metadata that the harness exposes and block conflicting selections. The current
Task result does not echo model/effort: label it "per-call model telemetry not
returned" instead of inventing it or claiming the setup observation happened in
this run. A child's assertion of its own model is not evidence. Other harnesses
retain their actual-model verification requirements. Missing coverage, fresh
review context or required artifact evidence still prevents CLEAN.
