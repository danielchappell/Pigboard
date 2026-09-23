# D1 Jira connection discovery: INT pilot

22 September 2026. This is read-only discovery, not an installed Jira connection
or approval to mutate INT. It refines the [hosted work contract](hosted-work-contract.md).
D1 remains open until the service identity and safe transition behavior are verified.

## Observed state and evidence limit

| Question | Observed through the signed-in human UI | Still unverified |
| --- | --- | --- |
| Project | Integrations, key `INT`, Jira Software project; default assignee Unassigned. [Board 1234](../pilots/jira-discovery-feasibility.md#verified-int-configuration) has Ready to Work, In Progress, QA, Product Acceptance and Done columns. | Native project, issue-type and status IDs under a service connection. |
| Work types | The board filter includes Story, Task and Bug and restricts assignees. One Software Simplified Workflow covers Story, Bug, Epic, Task and Sub-task. | Exact allowed assignee IDs, effective board membership, issue security and source audience for a service identity. |
| Permissions | The Default software scheme grants Browse Projects, Edit Issues, Transition Issues, Add Comments and Edit Own Comments to application access (any logged-in user) and an app role. | Actual service identity, scopes and contextual issue permissions. A scheme entry is not proof of these. |
| Workflow | The diagram shows global-looking transitions into ten statuses, with rules on most entries. | Per-issue available transition IDs, fields, rule effects and atomic expected-source behavior. The text view's “no transitions out” wording does not settle this. |
| REST access | The browser blocked a direct attempt to open `/rest/api/3/project/INT/statuses`. | No authenticated REST metadata or permission result was obtained; IDs cannot be inferred from names. |

The human [permissions](https://safeguardworld.atlassian.net/plugins/servlet/project-config/INT/permissions)
and [workflow](https://safeguardworld.atlassian.net/plugins/servlet/project-config/INT/workflows)
pages were inspected read-only. No Jira rule, ticket, credential, permission or
workflow was changed. The earlier [pilot evidence](../pilots/jira-discovery-feasibility.md)
is not service-account evidence.

## One-project connection contract

The reviewed S01 profile selects `INT`, `Task`, `Ready to Work` and the
`ai-enabled` label by display name. S02 must resolve native IDs under the
**selected service identity** and reject missing or ambiguous mappings. The
profile is a selector, not a grant. Bind one team to INT, an allowed issue-type
set and the intended board filter, including its restricted assignee set.
Preserve human assignees; assignment to a bot is not opt-in. If current board
membership or the allowed assignee cannot be established under the service
identity, eligibility is unknown and no launch is allowed. The owner must also
approve which issue contents may be sent to the runner; visibility to the
service identity alone is not approval to disclose them to Cursor.

Read-only preflight for an approved integration identity:

1. Read project/type/status metadata, board filter and one explicitly selected,
   non-sensitive pilot issue. Check project, type, status, label, assignee,
   board membership, visibility, issue security and approved source audience
   under that identity.
2. Query contextual Browse Projects, Edit Issues, Transition Issues, Add Comments
   and Edit Own Comments grants; report verified, denied and unknown separately.
   A positive permission result is necessary but does not prove mutation success.
   [Contextual permission API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-permissions/).
3. Fetch currently available transitions and any required fields for that issue
   under the same identity. Record IDs only for its current source status.
   Other stages remain unknown until a representative issue in each status or
   an authorized controlled check is available. Do not treat a display status
   as a transition.
   [Issue transition API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-get).
4. Check comment read/create/own-edit and visibility for the intended audience.
   A restricted comment or issue may be invisible to a project browser.
   [Comment API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/).
5. Read the site's issue-link types and the pilot issue's complete `issuelinks`.
   Record the type ID and direction that mean this issue **is blocked by**
   another issue. Do not infer that relationship from a display label alone.
   [Issue-link model](https://developer.atlassian.com/cloud/jira/platform/issue-linking-model/).

No dedicated identity, credential, permission scope or selected pilot issue is
established yet. Store future credentials in a service secret store, never in
the profile, ticket, prompt, event body or review artifact. The owner must select
the integration identity and permitted source/result audience before provisioning.

## Dependency mapping for S02

Jira link types are configurable. Resolve their native IDs under the selected
identity and record which type/end pairs mean the candidate is blocked. For the
usual `Blocks` type, an `inwardIssue` on the candidate is its blocker; verify
that mapping on this site before use. An unrelated outward `blocks` link is not
a blocker. Map each blocker to core `kind: "blockedBy"`, its native issue ID and
one of `active`, `completed`, `canceled` or `unknown`. The selected workflow must
name terminal-success and canceled status/resolution IDs. Only verified success
is `completed`; active work is `active`; canceled work stays `canceled`; missing
or ambiguous status/resolution is `unknown`. Core eligibility blocks on every
state except `completed`.

Read each blocker under the same integration identity, including links to
another project. A hidden, missing or disallowed cross-project blocker is
`unknown`, not absent. Treat incomplete link catalogs, missing `issuelinks`,
truncated/paginated results without all pages, duplicate/conflicting links and
unreadable blocker status as incomplete dependency evidence; S02 returns
unavailable and S05 cannot send. D1 must verify the site's link type,
direction, full-read behavior and status mapping before S02 is ready.

## Notification and reconciliation

For this one-project pilot, a project-scoped Jira automation rule is a
low-setup *candidate*: an issue create/update or status/label change sends a
ticket identifier and event metadata only. The receiver authenticates a
connection-scoped hidden-header secret before enqueueing. No role, lease,
transition, prompt or duplicate policy belongs in the rule. Rule editors must
be restricted because they can redirect requests; hidden values must be rebound
after duplication/export/import. Atlassian documents these
[web-request limitations](https://support.atlassian.com/cloud-automation/docs/jira-automation-actions/#Send-web-request).
No rule is selected or installed until ownership, outbound allowlist and secret
custody are checked.

A signed Jira admin webhook is deferred. A filter of `project = INT` alone can
deliver issue content from tickets outside the board or service identity's
approved audience before the receiver can re-read and reject them. It cannot be
selected until minimal-payload behavior or an audience-equivalent event filter
is verified, and payload receipt, logging, retention and handler authority are
explicitly approved. Atlassian documents
[webhook payloads and registration](https://developer.atlassian.com/cloud/jira/software/webhooks/).
The identifier-only project Automation candidate remains the pilot path.

The chosen delivery is only a wake-up hint. The service re-reads the named issue
under its identity, confirms project/type/status/label, allowed assignee and
board membership, revision, dependencies, issue-level security and approved
source audience, and runs existing core eligibility. Unknown or disallowed
visibility/audience fails closed before provider preparation or send. Reject a
different connection/project before queue admission. Duplicate or missing
events converge on the durable
current-attempt slot, never on AI routing. A bounded periodic INT scan recovers
missed notifications and later label changes. It must report incomplete pages;
an incomplete read is not a complete queue. S07/D3 will set cadence and limits.
S05 rechecks the selected issue, source revision and approved audience immediately
before sending the immutable request. A later human restriction cannot revoke
content already sent to a provider; that residual race and the selected source
audience require explicit owner acceptance before live launch.

## Human edits and publication

Keep the attempt's immutable input/profile/source digest. Before publication,
re-read stage-relevant fields, opt-in, status and audience. If a human changes
these, withhold publication/advancement and explain stale input while continuing
to observe the existing provider run. Integration comments must not create a
new attempt. A read immediately before a write is **not** an atomic
no-overwrite guarantee.

Use append-only integration progress comments. Do not edit an existing comment:
Jira comment update has no verified condition that protects a later human edit.
Reserve each comment effect with a unique operation marker, intended body digest
and audience before POST; include a non-secret marker in the comment and persist
the returned comment ID. After an uncertain create, use bounded paginated reads
to match marker, author and content. One exact match confirms. Zero matches,
incomplete visibility, multiple matches or modified content remain uncertain
and need operator attention; never auto-post again after a timeout or lease
expiry. Jira documents [paginated reads and comment properties on creation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/);
property retrieval and audience behavior still need a controlled check.

Automatic status transition is **blocked** until D1 proves a server-enforced
condition over every advancement-critical fact: source status, opt-in label,
allowed assignee, approved audience/security and issue revision. If Jira cannot
enforce that whole condition for the selected identity/workflow, S06 leaves the
ticket for manual human transition after publishing the comment. The observed
global-looking transitions make a stale read especially risky: a human may
change eligibility while leaving the issue in the same status.
`GET transitions` shows availability when read, not a conditional write on the
same issue revision. S06 must fail closed when the adapter cannot advertise
the required precondition; it must not silently transition unconditionally.
An authorized controlled check needs a disposable or designated INT issue and
before/after history evidence. No live write check has been run.

## Gates and future verification

| Gate | Needed evidence | Dependent work |
| --- | --- | --- |
| Integration identity and audience | Owner-selected account/app identity, credential custodian, allowed INT types and source/result visibility. | S02 preflight and all Jira writes. |
| Notification installation | Automation rule editor/allowlist and secret custody; identifier-only authenticated delivery and duplicate check. Rich admin webhooks remain deferred. | S07 automatic wake-up; S02 can use an explicit issue ID. |
| Native workflow/permissions | Identity-scoped metadata, contextual permissions, issue links/blocker states and transitions/fields. | S02 eligibility and S05 launch preflight. |
| Transition race | Server-enforced guard over status, opt-in, assignee, audience/security and revision; otherwise manual transition. | S06 automatic status advancement and A1 acceptance. |
| Ambiguous comment | Authorized small write, audience/readback and lost-response recovery check. | S06 comment publication. |

Future tests cover ambiguous names, wrong project, board-filter/assignee
exclusion, active/canceled/unknown/cross-project blockers, wrong link direction,
denied or unknown source audience, denied/partial reads, label
removal, unchanged assignee, duplicate events, incomplete pages, human edits,
uncertain append-only comment create and refused automatic transition without
the full guard. These are
obligations, not tests performed by this Task.

## Author's seven-principle assessment

| Principle | Assessment |
| --- | --- |
| Intuitive | Status and label stay the visible controls; preflight explains unresolved native mappings. |
| Discoverable | Setup names missing grants; agent results distinguish verified, denied and unknown. |
| Delightful experience | A small notification wakes the service without repeated bot setup on each ticket. |
| Token saver | Event IDs trigger bounded reads and eligibility reports decisive facts before history. |
| Secure | One-project binding, identifier-only authenticated ingress, complete dependency reads and audience restrictions gate effects. Rich webhooks are deferred. |
| Agents are equal | Noninteractive inspection exposes the same eligibility and recovery facts as the human view. |
| Dependable | Missed events reconcile, ambiguous append-only comments are not replayed, and unsafe transitions remain manual. |
