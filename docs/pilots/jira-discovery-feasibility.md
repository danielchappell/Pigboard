# Jira discovery pilot: feasibility findings

Checked 21 September 2026 against the local code, the signed-in INT board, and
current official documentation, followed by one trivial browser run and one
trivial programmatic Cursor API run. The API check succeeded, including recovery
after a timed-out launch. The owner approved creating a 30-day test API key.
No Jira settings/tickets, source-control grants, or deployments were changed.

## Finding

The proposed journey is supported by documented platform capabilities. Cursor
is a reasonable first execution candidate. Programmatic launch, retrieval after
a lost response, duplicate-create rejection, and final output now have live
evidence. Repository access and the complete Jira integration remain unverified. The owner selected [Ski Stack itself](https://github.com/danielchappell/ski-stack).
GitHub metadata confirms a private repository with `main` as its default branch.
A fresh GitHub API read pins the pilot to
[`5e48c3def05fa8dc840d51ae6683113b9faa0ba2`](https://github.com/danielchappell/ski-stack/commit/5e48c3def05fa8dc840d51ae6683113b9faa0ba2).

Use a small hosted Ski Stack coordinator to retain deterministic routing and run
ownership. Jira remains the team's shared entry point. Cursor supplies execution
and run inspection. Exact hosting, durable storage, and integration credentials
remain choices for the next delivery slice, not approved infrastructure.

## Existing code we can reuse

Inspected checkout: `5e907218927a154fcf27d8d37d7f495af2fa352e`, with the existing
uncommitted product and contributor guidance preserved.

| Area | Finding and consequence |
| --- | --- |
| [Core availability](../../src/core/availability.js) and [claim coordination](../../src/runtime/claim-next-available.js) | Already centralize eligibility and selection; keep that policy in the core. |
| [Generic dispatcher](../../src/runtime/dispatcher.js) | Accepts an injected `runWorker`; it is a better extension point than copying the coding daemon. It does not itself provide a durable hosted scheduler. |
| [Researcher role](../../agents/researcher.md) | Already describes a focused evidence-based investigation. |
| [Routing](../../src/core/routing.js) and [result application](../../src/runtime/apply-result.js) | Researcher is not auto-run by the coding daemon; strict automated completion rules cover its four coding roles. A pilot researcher needs an explicit constrained lifecycle, not arbitrary model-selected transitions. |
| [Coding worker](../../src/runtime/code-loop-worker.js) | Owns local worktrees, Codex execution, and GitHub PR behavior. It is not a generic cloud runner. |
| [Daemon entry point](../../scripts/run-github-worker-daemon.mjs) | Requires local ChatGPT-authenticated Codex and GitHub configuration at startup. Hosting this script alone would not deliver the Jira/Cursor pilot. |
| [Architecture](../../ARCHITECTURE.md) | Existing GitHub leases are explicitly best effort. Their existence does not establish durable multi-process ownership for a SaaS. |

## Verified INT configuration

Read through the signed-in browser on 21 September:

- [Board 1234](https://safeguardworld.atlassian.net/jira/software/c/projects/INT/boards/1234) has Ready to Work, In Progress, QA, Product Acceptance, and Done columns.
- [Column settings](https://safeguardworld.atlassian.net/jira/software/c/projects/INT/boards/1234/settings/columns) confirm corresponding status names. Refinement, Epic Discovery, Approved for Refinement, and Backlog are mapped to the backlog.
- [Board filter](https://safeguardworld.atlassian.net/jira/software/c/projects/INT/boards/1234/settings/filter) includes Story, Task, and Bug, and a restricted assignee list plus unassigned. Keep the human assignee.
- The signed-in human can inspect these settings. That does not prove a future service identity can comment or transition a particular issue.

The pilot can propose existing statuses without changing the board. Native
status IDs, per-issue transition IDs, and service-account permissions were not
verified through the Jira REST API.

## Cursor contract that matters for this slice

The current [Cloud Agents API v1](https://cursor.com/docs/cloud-agent/api/endpoints)
is public beta. Its documented contract provides:

| Need | Documented operation or behavior |
| --- | --- |
| Start discovery | `POST /v1/agents`, with `mode: "plan"` and `autoCreatePR: false`. |
| Avoid duplicate agent creation | Supply and persist `agentId: "bc-<uuid>"`; a repeated create returns `409 agent_id_conflict`. |
| Recover after a lost response | Read `GET /v1/agents/{id}`, then retrieve its run. |
| Fetch outcome | `GET /v1/agents/{id}/runs/{runId}` returns terminal run status and final reply text. |
| Observe progress | Poll run state; SSE is also available. v1 webhooks are not yet available. |
| Pick a model | Use `GET /v1/models` and select an available ID. |

The `agentId` option cannot be combined with session `envVars`. Avoid passing
Ski Stack credentials to the execution environment. Agent-level `IDLE` is not
proof of success: use run-level status and validate the answer. A provider's
`FINISHED` means the turn ended, not that a human accepted the findings.

[Plan mode](https://cursor.com/docs/agent/plan-mode) documents exploration and a
reviewable plan before coding. It can ask clarifying questions. The experiment
must establish how those questions and the final answer appear through the API;
neither “don't edit” in a prompt nor disabling automatic PR creation proves an
enforced read-only repository boundary.

Cursor documents [Bitbucket Cloud support](https://cursor.com/docs/integrations/bitbucket),
including account and workspace setup. However, the v1 endpoint reference still
describes repository URL fields as GitHub URLs. Test the chosen provider through
the API before treating generic UI support as verified API support. Do not
assume a GitHub mirror is required or authorized.

Cursor's [cloud overview](https://cursor.com/docs/cloud-agent) documents execution
independent of a laptop and team viewing subject to each viewer's repository
access. It also describes usage-based model billing. The API returned 39 model
entries and completed one short run. The exact spend allowance, final billed
cost, and second-user access remain unverified.

## Jira adapter and trigger

Use a project-scoped notification rule to wake Ski Stack. The coordinator
reloads the ticket and applies the configured routing policy. A periodic scan
also covers missed notifications and labels added after a status move. Rules
should not contain per-role prompts, lease policy, or a second scheduler.

Atlassian documents outgoing custom requests in its
[Send web request action](https://support.atlassian.com/cloud-automation/docs/jira-automation-actions/#Send-web-request).
An exported rule can carry its shape, but hidden values are removed on export,
import, or duplication. A reusable installation must bind the destination and
secret locally. The chosen authentication mechanism still needs a concrete
integration design; a project filter alone is not receiver authentication.

Jira REST supports [comment creation and updates](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/)
and [issue transitions](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-get).
Discover transitions under the integration identity; transition IDs are not
status names. Comment creation needs Browse projects and Add comments; updating
the integration's own progress comment also needs Edit own comments. Issue
security and app access policies can further restrict access.

Keep the run ID, provider IDs, ownership, stored result, and publication progress
in durable coordinator state. A Jira comment is a visible projection, not a
lock. Do not infer distributed locking guarantees from ordinary property writes;
Atlassian also documents conditional bulk property operations, but this pass
did not establish their suitability as a run-ownership mechanism.
See [issue properties](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-properties/).

## What Cursor already supplies

Cursor's [native Jira integration](https://cursor.com/docs/integrations/jira)
can launch agents from assignments or mentions and publish progress and results.
It currently requires Teams or Enterprise plus Jira and Cursor administrator
setup. It is useful prior art, but its documented repository selection includes
content heuristics and recent activity. It does not document Ski Stack's required
status-to-role lifecycle and ownership policy.

The pilot should have one launch path. Do not also assign the same ticket to
Cursor or mention it as another launcher. Reuse provider execution and its run
UI while keeping Ski Stack's routing explicit.

## Pilot access check and trivial browser result

The owner signed in and explicitly limited this company account to trivial
tests needed for the Cursor adapter. The original codebase-discovery prompt was
not submitted and has been replaced. Substantial research, coding, and testing
stay in our local development workflow.

Observed in the signed-in UI on 21 September:

- The account shows Joseph Chappell and Team plan.
- API Keys shows an existing masked worker key with Admin scope; its secret is not revealed.
- The owner subsequently approved `ski-stack-adapter-probe`: Admin scope, expiring 21 October 2026; it was created and used without writing its secret to files or the repository.
- `CURSOR_API_KEY` and `CURSOR_API_TOKEN` are absent from this command environment, and this checkout has no `.env`; this is not proof that no credential exists elsewhere.
- The cloud composer shows Start from scratch and asks to connect source control; no repository connection was added.

One real cloud run was submitted through the browser with GPT-5.6 Sol Medium,
no repository, and no additional context:

> Reply exactly SKI_STACK_CURSOR_PROBE_OK. This is a minimal connectivity test for the Ski Stack Cursor adapter. Do not call tools, inspect files, create files, run commands, browse, or perform any other work.

The UI progressed through environment setup and returned exactly
`SKI_STACK_CURSOR_PROBE_OK`. It showed no tool activity and no longer offered
Stop. No follow-up was submitted. Token usage, billed cost, and the API's
terminal status were not retrieved.

[Completed browser probe](https://cursor.com/agents/bc-3aa63b18-368b-4a6b-95ed-652dd2c32eb2).
This confirms browser launch and visible output only; it does not verify API
authentication, duplicate-create behavior, repository access, or team visibility.

## Programmatic API result

The API test used a standalone local Node script, not the chat interface.
Its credential was passed through a temporary loopback form to process memory.
Each operation ran in a fresh client process. The runtime key was not included
in the model prompt, cloud environment, source files, or result evidence.

- `GET /v1/models` returned HTTP 200 with 39 entries.
- The selected model was `gpt-5.6-sol`, with `reasoning: none`, `fast: false`, and its supported `272k` context setting.
- `POST /v1/agents` used the [saved request](cursor-discovery-request.json), no repository, plan mode, and automatic PR creation disabled.
- The first create request exceeded the client's 30-second timeout; no HTTP response was captured.
- `GET /v1/agents/bc-a7514709-a589-40cf-af18-fe8a177f4584` recovered the accepted cloud agent and its original run ID.
- Repeating the same create request returned HTTP 409 with `agent_id_conflict`.
- A fresh client retrieved the same run as `FINISHED`, with the exact result `SKI_STACK_CURSOR_PROBE_OK` and `durationMs: 78838`.
- Agent metadata showed `env.type: cloud`, `repos: []`, `autoCreatePR: false`, and `workOnCurrentBranch: false`.
- The usage endpoint returned all-zero token and cost counters both after completion and on one later read; this is not proof of zero consumption or final billing.

[API run](https://cursor.com/agents/bc-a7514709-a589-40cf-af18-fe8a177f4584),
[recorded request and responses](cursor-api-probe-result.json).
The run ID is `run-6bb8a0ad-1822-4d9e-b1c6-653f9d15d2fb`.
No follow-up was sent and no second API agent was created.

This is useful adapter evidence: a create timeout does not mean no job exists.
Retain the intended agent ID before sending the request, recover by that ID,
and never generate a replacement ID just because the response was lost.

Repository access, another teammate's visibility, Jira transitions, production
credential provisioning, cancellation, and API tool-use transcript inspection
were not part of this check. The marker-only run must not be presented as proof
that the Jira pilot or production adapter is implemented.

## Next delivery decision

The core [trivial API check](../tasks/verify-cursor-discovery.md) is complete.
The [first implementation Story](../stories/run-cursor-cloud-job.md) delivers
a usable Ski Stack command to start or retrieve one Cursor job with explicit
inputs and a retained provider ID. The [plan](../plans/cursor-cloud-job.md)
records the command/result contract and file/time estimate. Jira and a hosted
coordinator remain outside that first slice.
The broader Jira design question stays in our local development workflow. Every subsequent Story must stay within one PR,
20 changed files, and less than two human working days including tests.

After that check, choose the smallest complete usable outcome, with its live QA
path and a justified file/time estimate. Keep the complete Jira/cloud milestone
distinct from that first PR. Do not promise the whole milestone in two days.
