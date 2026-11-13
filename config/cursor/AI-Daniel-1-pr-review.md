# AI-Daniel-1 PR reviewer setup

[Cursor automation](https://cursor.com/t/safeguardglobal-engineering/automations/d6870b65-df37-11f1-ba91-f63b1661ac50)
uses Safeguard INT, label `AI-Daniel-1`, and entry to In Review. Jira owns that
filtering and provides the ticket and trusted visit/run identity. The configured
codebase is Plexus/master, using the existing Pigboard AI-Daniel-1 Plexus environment.

## Invocation and responsibilities

Copy [pr-review-prompt.txt](pr-review-prompt.txt) as the exact agent instruction.
The prepared entrypoint reads the shared 20 review criteria, eight report categories
and comment handling. Grok 4.7 High, Fast off, is selected. A separate review run
provides reasoning independence; eligible provider approval identity still needs
verification. The role reviews and posts evidence, then approves and moves to QA,
returns confirmed fixes to In Progress on the same PR, or records Blocked. It never
patches code, creates another PR, merges, deploys or provisions environments.

The pipeline-owned PR environment comment is defined in the
[workflow contract](../../docs/workflow.md#pr-environment-handoff--agreed-contract-pending-implementation).
Its producer and verified consumer behavior remain separate pending work. Do not
put environment discovery or setup instructions into the automation prompt.

## Observed configuration — 13 November 2026

The reviewer is configured with a webhook trigger, the prepared Plexus environment,
Grok 4.7 High and the exact one-sentence prompt. Memories and automatic Open Pull
Request were removed. Keep it inactive while the prerequisites below are unresolved.
No live Jira event, review, approval, comment or ticket transition has been executed.

The existing environment's successful Build pins
`12675375bc8710f197f9ceba43f56a2d845fbd0d`; it already contains this entrypoint and all
shared helpers. See the [environment record](AI-Daniel-1.md). Renaming the source
repository does not change those installed bytes. New setup commands use the public
`https://github.com/danielchappell/Pigboard.git` source.

## Required configuration before activation

- Prepare and verify Jira plus the selected Bitbucket capability route from the
  [review profile](../../skills/pigboard-pr-review/references/cursor.md). The picker
  exposes a shared Atlassian MCP connection, but this alone does not establish the
  required `rovito-safeguard` route, its permissions or provider capabilities.
- Verify a configured approval actor eligible for the same PR, independent review,
  own-approval revocation, complete paged comparisons/comments/CI and direct Jira
  transitions. The automation owner's name is not proof of approval eligibility.
- Wire authenticated Jira In Review dispatch, exclusive ownership and duplicate
  event handling. Configure durable review state and reviewer-accessible evidence.
- Verify the supplied ticket/PR identity, exact current green CI and trusted handoff
  without invoking a model to discover missing setup. Exercise an explicitly chosen
  test Story/PR only after these prerequisites are ready.

The webhook endpoint is available in the automation UI. Generate/store its auth
header only as part of the protected Jira rule wiring; never commit it or put it in
agent instructions. No connector or approval identity is silently substituted, and
existing legacy PRSniffer configuration is unchanged.
