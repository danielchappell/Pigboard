# D1 Jira connection discovery: Pigboard pilot

26 September 2026. This is the active Jira target design for
`scubapig.atlassian.net` project `PIG`, board `2`. The earlier
[INT record](jira-connection-discovery.md) is historical. Its general safety
contract remains useful, but its site, IDs, workflow, permissions and CLEAN
review do not transfer to Pigboard. No service connection or Jira write path
has been verified by this document.

## Outcome and observed boundary

One authorized teammate can later opt a Task into the existing `To Do` column
by adding `ai-enabled`. S02 will explain eligibility without starting work.
S05 and later Stories add durable launch and publication after their separate
gates. The label is the explicit opt-in; a Task in To Do without it is ineligible.
Keep the human assignee. Use one project, one approved team and one configured
repository for the first hosted journey.

The signed-in human UI shows Pigboard as a team-managed software project. Its
project key was changed from `KAN` to `PIG` and the board and issue keys now
show `PIG`. The board has Idea, To Do, In Progress, In Review and Done columns.
UI links identify project `10001`, board `2` and Task type `10009`.
The `PIG-2` sample Task is unassigned, in To Do, with no visible label or
description. It was inspected, not selected as an integration test ticket.
Project access displays “Open access,” but the actual audience and service
permissions are unknown. The browser blocked a direct REST metadata navigation;
that is not evidence of denied Jira API access. A more detailed observation
record is kept in this workspace outside the repository.

## Connection and authority

Use a dedicated noninteractive integration identity with bounded access to
Pigboard. Keep its credentials in a service secret store, outside profiles,
tickets, prompts, events and review records. The human browser login proves
neither that identity nor its scopes. D1 must verify the identity, credential
custodian, project/type/status IDs and contextual read/comment/edit/transition
grants before S02 is delivery-ready. Do not widen project access to make a
preflight pass. Report denied and unknown separately.

Use the selector `PIG` + `Task` + `To Do` + `ai-enabled` in the versioned workflow
profile. The profile selects work; it does not grant permission. Resolve each
display name to one native ID under the selected identity. A missing or
ambiguous mapping blocks inspection. Check the actual board filter, allowed
assignees, issue-level restrictions and complete read of the selected ticket.
An unreadable or out-of-audience ticket is unavailable, not eligible. The
source/result audience and permission to send ticket content to Cursor remain
separate from Jira read permission. The owner has not authorized any specific
ticket content for provider submission.

## Read-only D1 preflight

1. With the integration identity, read project/type/status metadata, board
   filter and one designated nonsensitive test issue. Record IDs and effective
   visibility for that same identity.
2. Query contextual Browse Projects, Edit Issues, Transition Issues, Add
   Comments and Edit Own Comments grants. A positive permission result is only
   a precondition to a later controlled write check.
3. Read all issue links and site link types. Verify which type and direction
   mean the candidate **is blocked by** another issue. Verify full pagination
   and read each blocker under the same identity. Hidden, missing and cross-
   project blockers with no authorized read stay `unknown`, never absent.
4. Record native statuses/resolutions that mean completed and canceled. Map
   active, canceled and unknown blockers to core eligibility as blocking; only
   verified completed blockers clear the dependency.
5. Read the selected issue's available transitions and required fields. This
   shows availability now, not an atomic guard on a later transition. Record
   which facts still need a controlled live check.

S02 may inspect an explicit issue ID without a webhook. Its result should show
the decisive status, label, dependency and access facts, plus unknown or denied
evidence. A complete read is required before it can say “eligible.”

## Later event, publication and recovery contract

Keep the prior [INT design's](jira-connection-discovery.md#notification-and-reconciliation)
identifier-only project Automation candidate as a design pattern, not a
configured Pigboard rule. Before S07 installs any notification, verify rule
editors, outbound destination, secret custody and actual payload. Authenticate
the receiver; re-read under the integration identity; reject another project
or connection. Bounded scans recover missed events, and incomplete pages are
reported as incomplete. Rich issue-content webhooks are deferred.

Keep progress/result comments append-only with a nonsecret operation marker.
After an uncertain POST, find the marker, author, body and audience through
bounded complete reads. A missing, partial or conflicting read requires human
attention and must not cause an automatic repeat. Re-read eligibility and
audience before publication; if a human changed them, withhold the write and
explain the stale input while observing the existing provider run.

Automatic status movement remains blocked until Jira proves a server-enforced
guard over source status, label, assignee, audience/security and revision.
Otherwise S06 publishes the result and leaves the transition to a human.
Neither a prior read nor `GET transitions` is a conditional write. Controlled
write, comment recovery and transition checks need a designated disposable
Pigboard issue and recorded before/after history. No such check has run.

## Readiness and verification

D1 remains open. S02 needs the service identity and all read-only ID, filter,
dependency and audience facts above. S05 additionally needs an approved source
audience and D2/D3/D4 live gates. S06 needs controlled comment behavior; S07
needs notification and reconciliation proof. A browser session or historical
INT result cannot close any of them. No Jira content is sent to a provider as
part of D1.

Future adapter tests should cover wrong project/type/status/label, ambiguous
native names, incomplete links/pages, hidden or canceled blockers, wrong link
direction, denied source audience, human edits, uncertain comments and refusal
to auto-transition without the full guard. These tests are obligations for
their Stories, not evidence that implementation exists.

## Author's seven-principle assessment

| Principle | Assessment |
| --- | --- |
| Intuitive | An existing status plus a visible opt-in label are the teammate controls. The tradeoff is that To Do alone does not mean ready. |
| Discoverable | S02 must name the decisive eligibility or access fact for humans and agents; native mapping failures must be actionable. |
| Delightful experience | No new workflow column or repeated ticket setup is needed; a teammate applies one label to opt in. |
| Token saver | Inspection leads with decisive facts and exposes missing evidence without dumping the full ticket. |
| Secure | A bounded identity, audience checks and complete dependency reads gate effects; any unknown fails closed. |
| Agents are equal | The noninteractive inspection result carries the same eligibility and recovery facts as human guidance. |
| Dependable | Missed events reconcile, uncertain comments do not replay, and unsafe status changes stay manual. |
