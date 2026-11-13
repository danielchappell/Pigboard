# Cursor implementation invocation profile

Prepare and verify this profile before enabling automation. It describes required
capabilities, not claims about every Cursor version/account.

| Phase | Actual configured profile | Authority |
| --- | --- | --- |
| Plan / revise approach | Latest available configured Grok, High | Read scope/code, write the plan, deliver authorized blocker handoff |
| Independent plan review | Same configured Grok, High | One fresh independent reviewer per round; read only |
| Implement / fix / verify / publish | Same configured Grok, Medium | Accepted plan and authorized repository/Jira actions |

Pin the actual available Grok identifier during setup; record actual model, effort,
phase and reviewer identity in each run. Do not invent an identifier, silently
substitute a provider/effort or run all phases at one effort. Prompt text alone does
not change settings or prove independent execution. The harness must support and
verify the phase switch and isolated reviewer. Missing support is a configuration
blocker before implementation. Subsequent PR review and QA are separate High runs.

The trusted invocation supplies:

- Configured Jira project, exact workstream label, Story key, In Progress status
  and actual destination/transition mapping. First workstream: Safeguard INT board
  1234 with `AI-Daniel-1`; a board number is not a project or transition identifier.
- Visit/event and run IDs, exclusive ownership, deduplication and durable records
  across phase continuations. Rework ownership must serialize with other work in
  the employee's stream. These are harness guarantees, not a skill-built scheduler.
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
Use implementer-entrypoint for <Story>, In Progress visit <visit-id>, run <run-id>.
Use the verified Grok High planning and isolated one-reviewer profile, then the
verified Grok Medium execution continuation. Reuse the same PR for rework.
Publish the evidence and move to In Review only after current required CI passes.
Block required scope increases or inability to complete the assignment.
```

This profile does not create Jira/Cursor automations, preview environments or Teams
alerts, and does not grant merge/deployment authority. Live setup must verify all
of those relevant capabilities separately from local skill validation.
