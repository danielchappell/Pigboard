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

**Setup only; keep both automations inactive until explicit owner go-live.** The
[CLI draft Build](https://cursor.com/t/safeguardglobal-engineering/cloud-agents/builds/bld-20261113-0ce83168-5eed-4aa2-8673-d14796319431)
passed on Plexus master `1256cdb` at 10:24 Europe/Madrid. Downloaded receipts verify
all ten skills, 23 source hashes, both helpers, and Rovito 0.1.295 checksum/version/help.
The Build remains a draft; it has not replaced the selected environment snapshot.
No credentials or approval identity were configured. A separate reviewer account
is preferred; the owner's account is fallback, pending eligibility verification.

The reviewer is configured with a webhook trigger, the prepared Plexus environment,
Grok 4.7 High and the exact one-sentence prompt. Memories and automatic Open Pull
Request were removed. Keep it inactive while the prerequisites below are unresolved.
No live Jira event, review, approval, comment or ticket transition has been executed.

### Credential-free follow-up — 13 November 2026

The Cursor UI was checked again: both automations are inactive and show zero runs
in the last seven days. The reviewer retains the exact versioned prompt, webhook,
Grok 4.7 High and the prepared Plexus environment, with no attached tools/MCPs.
The environment still selects Build `bld-20261113-8acfae55-7d48-43dc-ad53-6dae484c41c6`;
the successful CLI Build above remains a draft. No new Build or agent was started.

The custom MCP form exposes Command, Arguments and Secrets fields and a JSON editor.
The selector distinguishes Team and User connections, but the inspected creation
form does not establish registration scope or targeted restart/removal controls.
No server was registered, no secret entered and no existing connection changed.
The proposed canary name was not visible in the selector; this is not an exhaustive
account-wide name-availability check.

The disposable credential-free probe passed all 11 local tests. Its verified source
SHA-256 is `c0ea42f108ac75b2cd8adbeb73a94a723ee40b90f80221c40f39979833c3c01d`.
These tests establish local behavior only. Native Cursor marker delivery,
later-turn reuse, fresh-process identity and cleanup remain unverified. The probe
was not installed in Cursor. A native test needs an explicitly owned test scope
that does not fetch or access Safeguard repositories, or separate approval for that
access. Do not run it through either delivery automation.

The owner requires explicit approval of exact targets and actions before any
Safeguard Bitbucket or Jira access, including read-only identity checks. Account
details are not authorization. Live fixture writes require separate approval.
Keep the CLI route unchanged; MCP migration remains separate work. See the
[access boundary](rovito-cli.md#configure-access-separately).

The existing environment's successful Build pins
`12675375bc8710f197f9ceba43f56a2d845fbd0d`; it already contains this entrypoint and all
shared helpers. See the [environment record](AI-Daniel-1.md). Renaming the source
repository does not change those installed bytes. New setup commands use the public
`https://github.com/danielchappell/Pigboard.git` source.

## Required configuration before activation

- The owner selected the [Rovito CLI route](rovito-cli.md) while MCP is developed
  separately. Its deterministic installer prepares the executable without account
  credentials. Switch to MCP only after full Cursor automation acceptance.
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
