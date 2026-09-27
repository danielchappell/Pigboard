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

Use a dedicated noninteractive integration identity for the Scubapig site.
Keep its credentials in a service secret store, outside profiles, tickets,
prompts, events and review records. The human browser login proves neither
that identity nor its scopes. D1 must verify the identity, credential
custodian, project/type/status IDs and contextual read/comment/edit/transition
grants before S02 is delivery-ready. Report denied and unknown separately.

The owner has authorized use of this empty Scubapig account and prioritizes
customer-selected project and board scope in the adapter. A Jira credential
may still see other Open projects on the same site. Do not claim that token
scopes or the adapter's allowlist remove that vendor-level access. Keep the
credential in the service, grant only the Jira operations required by the
selected connection, and enforce the narrower application scope on every
command and future event. Do not change unrelated projects merely to make
the first pilot identity appear PIG-only.

Only a verified connection administrator for the owning team and site may
list project and board choices, select a pair, or reselect it. Apply this
caller check equally to human and agent commands, before exposing choices.
The Jira credential's visibility and a workflow profile do not grant this
administration authority. A denied caller gets no project list and cannot
change the pair. The administrator selects one explicit project-and-board pair
for each logical connection. The setup flow lists projects visible to the
integration identity, then shows associated boards by name, with native IDs
as disambiguators. A human can choose from those lists; an agent can obtain
the same structured choices and select one by stable IDs without an interactive
prompt. Neither path requires knowing a Jira filter or guessing an ID. For the
pilot the pair is project `PIG` (`10001`) and board `2`. Before saving, resolve
the IDs and verify that the board includes the selected project and that its
filter and columns can show the configured Task/To Do candidates. Show the
chosen names and IDs for review. Distinguish no credential access, no boards,
an invalid project-board relationship, a filter/column mismatch and unavailable
metadata with an actionable correction; never silently choose another board.
The authorized administrator can reselect the pair, with the same validation,
before inspecting more work. The workflow profile's `connectionRef` and project key
must match that pair; the profile cannot add an allowed project or board. A
wrong or missing pair fails before a rich issue read or any effect. Check
project identity and board membership with the minimum metadata needed for
that decision. An issue from another project, even if visible to the Jira
credential or included on a selected board, is unavailable. A blocker outside
the selected project scope is `unknown` and blocks eligibility; the adapter
does not fetch its body.
The same pair check will guard later launch, publication and notifications.
Customers can select more pairs through additional logical connections using
the same site identity. Before enabling overlapping boards that may contain
the same issue, the attempt policy must prevent duplicate work across those
connections. Multi-pair operation is not part of the first pilot.

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

1. With the integration identity, read the selected project/type/status
   metadata, board configuration/filter and one designated nonsensitive test
   issue. Record native IDs, board membership and effective visibility for
   that same identity. Test whether a board-scoped, minimal-field read can
   prove membership without retrieving the issue body. Reject an unverified
   project-board pair or membership result.
2. Query contextual Browse Projects, Edit Issues, Transition Issues, Add
   Comments and Edit Own Comments grants. A positive permission result is only
   a precondition to a later controlled write check.
3. Read all issue links and site link types. Verify which type and direction
   mean the candidate **is blocked by** another issue. Verify full pagination.
   Extract only each linked issue's native ID from the link response and discard
   any embedded linked-issue fields before normalization, logging, diagnostics
   or human/agent output. Resolve the target's project native ID with a
   minimal-field lookup before reading blocker status or body; an issue-key
   prefix is insufficient because issues and projects can be renamed or moved.
   Read an in-scope blocker under the same identity only after that check.
   Hidden, missing, unresolved-project and cross-project blockers stay
   `unknown`, never absent. Do not propagate out-of-scope issue content even
   if Jira included it in a link response. Verify the live response shape and
   the minimal project-ID lookup under the integration identity.
4. Record native statuses/resolutions that mean completed and canceled. Map
   active, canceled and unknown blockers to core eligibility as blocking; only
   verified completed blockers clear the dependency.
5. Read the selected issue's available transitions and required fields. This
   shows availability now, not an atomic guard on a later transition. Record
   which facts still need a controlled live check.

S02 may inspect an explicit issue ID without a webhook. Its result should show
the decisive status, label, dependency and access facts, plus unknown or denied
evidence. A complete read is required before it can say “eligible.”

Before S05 sends a provider request, re-read the selected issue's status,
opt-in, assignee, dependencies, source revision and approved source audience.
Withhold the send if any changed or cannot be read completely. This check is
not atomic with provider receipt: a human can restrict a ticket immediately
after the read, and content already sent cannot be recalled. The owner must
accept that residual window for a named, nonsensitive pilot issue and audience
before any live provider submission. D1 does not make that choice on its behalf.

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

`In Review` is the human handoff status for a completed discovery result.
Automatic status movement remains blocked until Jira proves a server-enforced
guard over source status, label, assignee, audience/security and revision.
Otherwise S06 publishes the result and leaves the move to In Review to a human.
Neither a prior read nor `GET transitions` is a conditional write. Controlled
write, comment recovery and transition checks need a designated disposable
Pigboard issue and recorded before/after history. No such check has run.

## Readiness and verification

D1 remains open. S02 needs the service identity, selected project-board pair,
and all read-only ID, filter, dependency and audience facts above. S05
additionally needs an approved source
audience, acceptance of the pre-send residual race for a designated issue and
D2/D3/D4 live gates. S06 needs controlled comment behavior; S07
needs notification and reconciliation proof. A browser session or historical
INT result cannot close any of them. No Jira content is sent to a provider as
part of D1.

Future adapter tests should cover project/board discovery, rejected and
corrected selections, denial of project choices and changes to a caller without
connection-administrator scope, wrong project/board/type/status/label,
ambiguous native names, incomplete links/pages, hidden or canceled blockers,
wrong link direction, out-of-scope blockers and non-propagation of embedded
linked-issue fields, denied source audience, human
edits, uncertain comments and refusal
to auto-transition without the full guard. These tests are obligations for
their Stories, not evidence that implementation exists.

## Author's seven-principle assessment

| Principle | Assessment |
| --- | --- |
| Intuitive | Setup offers named project and board choices; an existing status plus a visible opt-in label are the teammate controls. The tradeoff is that To Do alone does not mean ready. |
| Discoverable | Human choices and structured agent choices expose available pairs; S02 names the decisive eligibility or access fact, and selection or mapping failures give a correction. |
| Delightful experience | One validated pair is saved rather than repeatedly asking for IDs or ticket setup; a teammate applies one label to opt in. |
| Token saver | Setup and inspection lead with relevant choices or decisive facts and expose missing evidence without dumping tickets or Jira filters. |
| Secure | Verified connection-administrator scope guards choice listing and changes; a service-held identity, explicit project-board allowlist, audience checks and complete in-scope dependency reads gate effects. The credential may have broader vendor-level visibility on an Open Jira site, which remains a documented tradeoff. |
| Agents are equal | Authorized agents get structured list/select operations and noninteractive inspection with the same scope checks and recovery facts as humans; neither can infer administration from a profile. |
| Dependable | Missed events reconcile, uncertain comments do not replay, and unsafe status changes stay manual. |
