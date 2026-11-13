# Runtime access and dispatch guard

**Superseded proposal:** the owner excluded a shared database from the MVP after
this discovery review. Do not implement the PostgreSQL ledger below or make it an
MVP activation prerequisite. The current workstream decision and bounded live
webhook/stop results are in [the test record](../cursor-webhook-test.md). The earlier
review applies only to the historical proposal's recorded hash.

Status: discovery/design in progress, 13 November 2026. Not implemented or ready
for activation. PGB-58 remains the rollout queue. All three Jira rules and Cursor
automations stay inactive. No Story or PR writes are authorized by this design.

## Reused decisions and observed gaps

Reuse the existing stage skills, exact INT/Story/AI-Daniel-1 triggers, Plexus/master,
minimal prompts, same-PR rework and human-owned blockers. Environment setup installs
tools and skills before execution. Do not restore the archived hosted platform.
New-work selection remains the owner's separate deterministic admission script;
this guard admits an already-dispatched ticket to the correct repository and stage.

Observed in Cursor: the implementer is inactive, has zero runs and no connected
MCP. Its tool picker offers an existing team Atlassian connection. Attaching it
requires permission because Cursor exposes all tools on a connected MCP. The
pinned Rovito CLI provides Bitbucket, not Jira. A browser session or Codex connector
does not establish agent access. Operator approval and actual Cursor read checks
are pending. If the existing connection fails, stop; do not discover another login.

The current payload has no transition identity or atomic ownership. Cursor's
[automation documentation](https://cursor.com/docs/cloud-agent/automations) documents
webhook dispatch and memories, but establishes no per-workstream mutual exclusion
or exactly-once guarantee. Memories are not a lock. Jira property reads followed by
writes also do not establish atomic claims. Prompt checks cannot close this gap.

## Proposed boundary

Use versioned scripts and a small shared run ledger, with no Pigboard web service.
PostgreSQL is a candidate because transactional constraints can admit one owner.
No database is selected or authorized yet; do not use legacy infrastructure or
create an account/database without resolving this prerequisite. Connection secrets
belong in Cursor runtime secrets, never the Build, repository, ticket or prompt.

Before implementation, verify how a deterministic guard receives the actual
Cursor run ID and webhook payload before skill execution. If there is no supported
pre-agent hook, a skill may call the prepared guard first, but that consumes startup
tokens and is not equivalent to preventing duplicate launches. Do not claim a
Start Script sees payload/run identity without an actual supported contract/test.
Cursor's [hooks documentation](https://cursor.com/docs/hooks#cloud-agent-support)
explicitly excludes sessionStart from Cloud Agents. It supports preToolUse only
once a writable environment exists; HTTP MCP hooks can deny a call but do not
receive ordinary tool results. Do not assume local user hooks or repository-free
hook installation are supported in this cloud setup. Verify the actual route.

Write-path feasibility is also unresolved: inspect whether the configured Jira
and Bitbucket calls can pass through a prepared guard for ownership/freshness and
intent/receipt recording. Broad directly callable MCP/CLI tools do not enforce
this automatically. If the supported route depends on the skill calling a guard,
label it a cooperative workflow contract, not enforced per-write protection.
Resolve that tradeoff before grooming; do not silently add a proxy or service.

1. Jira dispatch supplies immutable issue ID, exact destination status ID and the
   status-transition changelog ID. Verify the actual smart value/API in a bounded
   test; issue.updated and a newly generated UUID are not stage-visit identities.
2. Read canonical issue and complete required history through the prepared Jira
   capability. Verify project, type, label, current stage and current stage visit.
   A delayed old event must fail even if the ticket has returned to the same stage.
3. Extract exactly one Repository and Base branch from the accepted ticket contract.
   Reject missing/ambiguous values and any target outside the operator allowlist.
   Compare with the actual supplied checkout's origin/base. Do not clone another
   repository or treat ticket content as permission to expand the allowlist.
4. Atomically acquire both the stage-visit claim and employee-stream ownership.
   The ledger rejects a completed duplicate and a competing active owner. Rework
   uses a new visit, retains the same PR and competes for the same stream lock.
5. Return a structured receipt with run, visit, repository and permitted stage.
   Each external write must check current ownership and live ticket/PR freshness.
   A local receipt alone is not a permanent grant.
6. Record action intent before a write and its provider receipt afterward. Unknown
   outcomes stop for human reconciliation; never retry an uncertain PR/comment/
   approval/transition automatically. Ledger evidence does not invent exactly-once
   semantics for providers without idempotency or conditional writes.
7. After the final handoff, record completion and release stream ownership in one
   transaction. A newly triggered stage can retry acquiring ownership only through
   a bounded deterministic mechanism, not a model loop. Choose and test that
   mechanism before activation so an early event cannot be silently lost.

Do not expire or automatically steal claims. A crashed/uncertain run keeps its
claim until a human confirms the old Cursor run and its children have stopped,
reconciles provider writes and explicitly authorizes recovery. New work must not
bypass unresolved rework. A database failure stops work. Revocation cannot cancel
an in-flight provider request, so recovery must never overlap an old process.

Jira reports and links remain human-facing evidence. Large screenshots stay in
the approved evidence destination; do not silently add them or credentials to the
run database. Retain only IDs, state, input fingerprints and action receipts there.

## Verification before testing delivery

Verify connection identity, INT project metadata, read access and available
transitions in Cursor without invoking a delivery automation. Read-only checks
cannot prove comment/transition rights: use a later explicitly authorized fixture.

Guard acceptance must cover two simultaneous claims, replay after completion,
old event after re-entry, another ticket/rework in the same stream, wrong repo/base,
lost database connection, crash before/after a provider write, unknown handoff,
early next-stage dispatch and human-only recovery. Use a real disposable PostgreSQL
instance for transaction/concurrency checks if that route is chosen. Mock-only
tests cannot establish those properties. Live Jira/Cursor acceptance is separate.

## Delivery order and unresolved inputs

1. Resolve permission for the existing Atlassian connection and run read-only access
   acceptance; alternatively prepare a dedicated token after human credential entry.
2. Resolve shared-storage availability, supported guard invocation/run identity and
   the achievable write-enforcement contract.
3. Review the completed design, then groom bounded implementation Stories and
   review their concrete plans before coding. Keep each below 20 files/two days.
4. Implement guard, tests, skill references and installation together; review exact
   commits, merge and verify a pinned Cursor Build before authorized fixture tests.
5. Update Jira payloads and inactive configuration exports only against the tested
   dispatch contract. Verify all automations remain inactive at handoff.

Author principle assessment: intuitive — operators see ticket/run outcomes rather
than database mechanics; discoverable — receipts state why work was refused and
who can recover; delightful — reuse the prepared connection and stop uncertainty;
token saver — deterministic checks, no model retry loop; secure — operator scope
and secure credentials, with broad MCP access disclosed; agents are equal — scripts
return structured outcomes and people get Jira evidence; dependable — persisted
claims and explicit uncertain states, without overstating provider atomicity.
