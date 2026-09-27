# D1 Jira connection discovery: Pigboard pilot

27 September 2026. This is the active Jira target design for
`scubapig.atlassian.net` project `PIG`, board `2`. The earlier
[INT record](jira-connection-discovery.md) is historical. Its general safety
contract remains useful, but its site, IDs, workflow, permissions and CLEAN
review do not transfer to Pigboard. No service connection or Jira write path
has been verified by this document.

## Outcome and observed boundary

One authorized teammate can later opt a Task into the existing `To Do` column
by adding `ai-enabled`. S02a will save an administrator-selected project and
board; S02b will explain eligibility without starting work.
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

The Scubapig organization now has a dedicated `Pigboard Jira Integration`
service account. Atlassian shows only Jira User app access and automatically
added its default `jira-users-scubapig` group, which grants that same Jira User
access. No API credential or identity-scoped request has been verified.
Keep future credentials in a service secret store, outside profiles, tickets,
prompts, events and review records. The human browser login does not prove
the service account's effective issue permissions. D1 must verify credential
custodian, project/type/status IDs and the contextual read grants needed by
each Story before that Story is delivery-ready. Record contextual comment,
edit and transition grants for S06; unknown or denied write grants do not
block read-only S02a or S02b. Report denied and unknown separately.

The owner has authorized use of this empty Scubapig account and prioritizes
customer-selected project and board scope in the adapter. A Jira credential
may still see other Open projects on the same site. Do not claim that token
scopes or the adapter's allowlist remove that vendor-level access. Keep the
credential in the service, grant only the Jira operations required by the
selected connection, and enforce the narrower application scope on every
command and future event. Do not change unrelated projects merely to make
the first pilot identity appear PIG-only.

The [first-service D3 path](s02a-first-service.md) narrows choices to the
intersection of the integration identity's readable projects and a versioned,
owner-approved site/project scope on the live root. The owner-only scope
command uses named project choices; an agent with connection-admin access
cannot widen it. The pilot begins with Scubapig project `PIG` (`10001`), not
an implicit grant to every project visible to the Jira credential. Filter a
buffered choice list against the *current* approved scope immediately before
disclosure, so a concurrent scope reduction does not return stale names. The
owner can approve another readable project without a code deploy; S02a still
selects only one project-board pair for one connection.

Only a verified connection administrator for the owning team and site may
list project and board choices, select a pair, or reselect it. Apply this
caller check equally to human and agent commands, before exposing choices.
The Jira credential's visibility and a workflow profile do not grant this
administration authority. A denied caller gets no project list and cannot
change the pair. The administrator selects one explicit project-and-board pair
for each logical connection. The setup flow lists approved projects readable
by the integration identity, then shows associated boards by name, with native IDs
as disambiguators. A human can choose from those lists; an agent can obtain
the same structured choices and select one by stable IDs without an interactive
prompt. Neither path requires knowing a Jira filter or guessing an ID. For the
pilot the pair is project `PIG` (`10001`) and board `2`. Before saving, resolve
the IDs and verify that the board includes the selected project and that its
filter and columns can show the configured Task/To Do candidates. Show the
chosen names and IDs for review. Distinguish no credential access, no boards,
an invalid project-board relationship, a filter/column mismatch and unavailable
metadata with an actionable correction; never silently choose another board.
Use a safe second PIG board to prove live correction before calling that S02a
behavior accepted. A controlled metadata fixture remains useful for regression
but does not itself establish operator correction. Do not change an unrelated
project or activate automatic work merely to create the fixture.
The selected pair has a durable version under the live-root connection record.
An administrator can correct it with an expected-version update after the same
validation. Reject correction while the connection has an active attempt or
an uncertain Cursor/Jira effect; first reconcile that work under its original
pair. Trusted attempts keep their immutable launch pair/version. An imported
S04 run keeps only the pair/version selected at registration as an access
association; that does not prove its original launch scope or source. Both
remain inspectable with their existing read grants, but correction cannot
make an imported run publishable or authorize a new launch or publication to
an old ticket. S02b
inspection reports a changed pair as stale and rechecks the current version.
S05 and S06 must compare the current pair/version with the attempt's saved
pair/version inside their effect reservation; a mismatch sends nothing and
requires an explicit new inspection or human handoff. The workflow profile's `connectionRef` and project key
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

Before any Jira issue lookup, the application verifies the caller's current
team and selected-connection scope plus a human viewer/operator grant or a
separate scoped noninteractive agent inspect grant. A connection administrator
without a viewer/operator grant cannot inspect by default. The Jira credential
and selected pair do not grant inspection to a Pigboard caller. An authorized
caller may then read only the minimal native fields D1 proves necessary to
establish the issue's project, board membership and issue-level audience. D1
must name any status or label field needed solely to evaluate board membership;
it remains internal during this check. Keep all minimal fields out of public
output, logs and diagnostics until the check passes.
If that minimal lookup cannot prove the caller may see the issue, return a
generic unavailable result without a body, status, label or dependency read.
Only after project, board and source audience are verified may S02b read and
return richer ticket facts within that audience. A service-visible issue alone
is insufficient.

## Read-only D1 preflight

1. With the integration identity, read the selected project/type/status
   metadata, board configuration/filter and one designated nonsensitive test
   issue. Record native IDs, board membership and effective visibility for
   that same identity. Test whether a board-scoped, minimal-field read can
   prove membership and issue-level audience without retrieving the issue
   body or dependency details. Record the minimal fields, including any status
   or label needed solely for board filtering, and whether they suffice under
   the service identity. Reject an unverified project-board
   pair, membership or audience result.
   This read-only preflight does not promise a second live pair, a mutable
   opted-in issue or a wrong-board issue. Name controlled metadata and issue
   fixtures for S02a correction and S02b denial checks before either Story is
   ready, unless separately authorized live test data and human edit authority
   are established.
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

S02b may inspect an explicit issue ID without a webhook. Its result should show
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

D1 remains open. S02a needs a usable service credential, identity-scoped
project/board/filter/column metadata and a safe second PIG board available for
its later live correction check. D3 has selected the early Fly-held secret,
named human/agent grant and live-root pair/version path, but its SQL, TLS,
identity and host gates need proof. The combined S02a preview exceeds 20 files;
groom a complete prerequisite technical outcome and independently review each
resulting Story plan before coding. S02a then proves live save and correction.
S02b additionally needs S02a's saved pair and the read-only issue, filter,
dependency and audience facts above. S05
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
| Intuitive | Setup offers named projects inside the owner's approved scope and then associated boards; correction names active or uncertain work that must be reconciled first. The owner-only scope step adds pilot setup, while teammates keep the visible opt-in label. To Do alone does not mean ready. |
| Discoverable | S02a gives humans guided choices and agents structured choices with stable IDs; filter/column mismatch names the reason a board cannot show Task/To Do. S02b names the decisive eligibility or access fact. A safe second live PIG board is still needed to prove correction. |
| Delightful experience | One validated pair is saved rather than repeatedly asking for IDs; an owner can approve another project without a deploy, and a teammate applies one label to opt in. The owner approval is deliberate extra setup for broader scope. |
| Token saver | Setup and inspection lead with currently approved choices or decisive facts and expose omissions without dumping tickets or Jira filters. A buffered list is filtered again against current scope before disclosure, avoiding corrective calls after stale choices. |
| Secure | Current owner-approved site/project scope and connection-administrator grant guard choices and changes; a service-held Jira identity, versioned pair, audience checks and complete in-scope dependency reads gate effects. The credential may still see more in an Open Jira site, so the app boundary and secret custody require live proof. |
| Agents are equal | A named noninteractive agent can list and select an approved pair with the same scope and recovery facts as a human administrator; it cannot widen the owner's approved projects or infer grants from a profile. |
| Dependable | A saved S02a pair does not imply S02b issue-read authority. Correction preserves old inspection records, rejects active/uncertain effects and makes stale inspection explicit; live correction proof is pending. Missed events reconcile, uncertain comments do not replay, and unsafe status changes stay manual. |
