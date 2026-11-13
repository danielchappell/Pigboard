# Cursor QA invocation profile

Configure this before enabling the automation. These are setup requirements, not
verified capabilities of every Cursor account or version.

- Trigger: the opted-in Story enters QA in the configured Jira project/workstream.
  The current first workstream is Safeguard INT board 1234, label `AI-Daniel-1`.
  Resolve actual status/transition IDs during setup; board column text is not an ID.
- Model: the configured latest available Grok at **High** effort throughout QA.
  Pin the actual available model identifier in the automation and record actual
  model/effort in the run. Do not invent an identifier, silently lower effort or
  switch provider. If the harness cannot supply this profile, stop before test
  execution with a configuration blocker through the supported run result.
- Entry: invoke `qa-entrypoint` with the assigned ticket key, configured
  project/repository scope, publishing authority,
  status mapping, prepared preview/access and evidence destination.
- Dependencies: provide only the named approved QA skills and their prepared tools.
  This MVP supports qa-api, qa-bruno, qa-database and qa-ui; a ticket selecting another
  skill needs an explicitly configured approved capability, never model substitution.
- Connectors must read the ticket/PR/revisions, retain reviewer-accessible evidence,
  publish authorized reports/links, inspect available transitions and verify status
  changes. Retain execution evidence and action receipts. An actual Cursor run
  link/ID is optional; otherwise use Story, stage, revision and time. Missing
  run/visit metadata or a lock is not a blocker. Duplicate prevention, cancellation
  and cross-run coordination are deferred; the operator takes care around repeated
  launches during the basic MVP. No hosted Pigboard service is required.

Invocation example (replace setup values with verified configuration):

```text
Use qa-entrypoint for the assigned <ticket-key> currently in QA.
Read the current ticket and PR. Use only its prescribed case/skill order.
Publish the evidence within the supplied authority and transition once according
to the verdict. Preserve the same PR. End on completion or any human-owned blocker.
```

Helper execution stays in this QA run; this profile does not request subagents.
Never merge, deploy, send Teams alerts or admit the next Story. Preview provisioning
and live Cursor/Jira acceptance remain separate setup work.
