# Jira setup specification and rollout record

This is the reproducible setup record for the Jira/Cursor MVP, started on
13 November 2026. It records desired configuration separately from observed
installation. It is not an installer or evidence that the delivery workflow works
end to end. Keep it current as each setting is saved and verified.

Pigboard's eventual installer should provide this setup out of the box. Building
that installer is deferred; this rollout captures its inputs and acceptance checks.

## Decisions

- Jira project is the workstream anchor. Each Story names one application repository
  and base branch, within the configured environment's allowlist. One Story is one
  PR, at most 20 changed files, and less than two human working days.
- A separate AI board makes ownership clear. Humans do not drag its tickets;
  automation performs transitions. Permission enforcement and dedicated identities
  are deferred. The human owner remains accountable.
- Project, Story type, exactly one numbered employee label and status determine dispatch.
  A deterministic admission script selects only new work. It does not manage rework.
- Confirmed fixes return to In Progress on the same PR. Discussion remains in the
  current Review or QA stage. Scope expansion requires human resolution in Blocked.
- QA runs the ticket's named skills in order and its prescribed cases on the open
  PR. Passing QA moves to Human Review, where the developer and human QA review.
- Per-PR environments are separate pipeline work. The pipeline supplies PR target
  information through a PR comment. Agents do not provision environments.
- Blocked has a dedicated column. A visible **Blocked at** field preserves the
  previous stage on the card and supplies the default resume target.
- The owner subsequently deferred that field and its dependent resume setup to
  [PGB-62](https://scubapig.atlassian.net/browse/PGB-62). The Blocked column remains
  in this rollout; saved-stage display and resumption are not current capabilities.
- Blocking stops agent work; no repeated speculative repair. A human resolves the
  blocker and requests resumption; automation performs the transition on the same
  PR. Missing/invalid resume targets leave the issue Blocked. A human-directed code
  fix resumes In Progress. Exact human action and override controls remain pending.
- Teams alerts are later wiring. MCP migration is deferred; retain the CLI route.
- All new Jira and Cursor delivery rules stay inactive until authorized testing.

## Reusable configuration inputs

Record these for each installation; do not hard-code this customer's IDs into the
future installer:

| Input | Purpose |
| --- | --- |
| Jira site, project key/ID, main board and original filter/sub-filter | Scope and reversible board isolation |
| Employee label family, exact numbered workstream and accountable owner | Worker routing and sequential admission |
| AI board name, location, filter and sharing | Dedicated delivery view |
| Workflow status IDs and categories; column mappings | Use actual statuses, not display-name guesses |
| Blocked-at field ID, type, context and card placement | Visible saved stage and deterministic resumption |
| Human resume action and authorized callers | Human intervention without manual dragging |
| Cursor environment, repository/base allowlist, skill revision and Build | Prepared execution environment |
| Three automation IDs, webhook endpoints and secret references | Stage-specific dispatch |
| Rule IDs, triggers, guards, actor, payload and disabled state | Reproducible rules and auditability |
| Optional execution metadata and duplicate/cancellation policy | Actual run links when available; automatic coordination deferred after MVP |
| Provider identity, scope names and secret destinations | Credentials remain outside version control |

Never store tokens, webhook API keys or private credential-bearing URLs here.
Keep neutral templates separate from installation IDs. A future installer must
discover/reuse existing resources, detect incompatible settings, preserve original
values, report partial completion, and avoid enabling rules as a side effect.

Cursor's [automation documentation](https://cursor.com/docs/cloud-agent/automations)
also describes a Terraform `cursor_platform_workflow` resource. Evaluate the
official provider when the installer task begins; this record does not assume it
covers all required Jira, credential or environment setup. No Terraform or other
provisioner is being built in this task.

## Safeguard INT installation: observed settings

| Resource | Saved configuration / evidence |
| --- | --- |
| Site/project | `safeguardworld.atlassian.net`, `INT`, project ID `10716` |
| Workstream | `AI-Daniel-1` |
| Main board | `1234`, Integrations (Glue Crew!) Kanban |
| Shared main filter | `12440`, Glue Crew Integrations; unchanged |
| Original main sub-filter | `fixVersion in unreleasedVersions() OR fixVersion is EMPTY` |
| Saved main sub-filter | `(fixVersion in unreleasedVersions() OR fixVersion is EMPTY) AND (labels IS EMPTY OR labels NOT IN ("AI-Daniel-1"))` |
| AI board | `1312`, INT AI — Automation-managed, in INT |
| AI board-bound filter | `12563`, Filter for INT AI — Automation-managed |
| AI filter JQL | `project = "INT" AND labels = "AI-Daniel-1" ORDER BY Rank ASC` |
| Additional saved filter | `12562`, INT AI — AI-Daniel-1; identical JQL, not the board-bound filter |
| Current matching issues | Zero when filters were saved; no tickets labeled or transitioned |
| Human Review | Added to simplified INT workflow, In Progress category |
| Blocked | Existing status added to INT workflow; no new duplicate status |

The main board sub-filter, not its shared saved filter, was changed. This isolates
the board view without changing other consumers of the shared filter. It does not
hide issues from project searches or enforce permissions. Workflow status additions
affect the INT workflow; column mappings belong to the AI board.

The saved-filter picker did not reliably find the newly created filter. Board
creation generated filter 12563, which was then edited to the exact label query.
Do not assume filter 12562 is bound to the board. Both are retained.

## Column and field checklist

Desired delivery columns are Ready to Work, In Progress, In Review, QA,
Human Review, Product Acceptance, Blocked and Done. Keep Done as the final column.
Earlier grooming statuses should not appear as ready delivery work.

Column mappings were saved and verified on 13 November. The owner explicitly
approved rebuilding the empty AI board after drag/drop failed to save mappings.
Removing a board column left its statuses intact; recreating a column with the
existing status name automatically mapped that status. This was the successful
UI method; it is not a required implementation for the future installer.

| Column order | Mapped statuses |
| --- | --- |
| 1. Ready to Work | Ready to Work |
| 2. In Progress | In Progress |
| 3. In Review | In Review |
| 4. QA | QA |
| 5. Human Review | Human Review |
| 6. Product Acceptance | Product Acceptance |
| 7. Blocked | Blocked |
| 8. Done | Done, Declined (retained existing mapping) |

Unmapped: Approved for Refinement, Awaiting Customer Feedback, Backlog,
Epic Discovery and Refinement. These statuses remain available elsewhere in INT.
No work items or statuses were deleted. Done retains the existing Declined mapping;
this does not change the delivery contract that successful Done means production
deployment. No new automation moves a delivery Story to Declined.

The Blocked-at custom field, field context and card layout are **deferred to PGB-62**.
The card-field search returned no existing Blocked field. The signed-in account's
Settings menu explicitly reports no access to Jira settings or Atlassian admin.
An admin must create a single-select **Blocked at** field, scoped to INT Stories,
with Ready to Work, In Progress, In Review, QA, Human Review and Product Acceptance
options. Field creation is an access dependency, not a reason to activate anything.
Use a real Jira field visible on board cards, rather than an invisible issue
property as the sole resume record. Capture its exact ID/type/context here after
creation. A reason can remain in the detailed blocker report; no reason field has
been created or promised as part of this card change.

## Automation inventory: saved and deferred

| Rule | Trigger and behavior | State |
| --- | --- | --- |
| Implementer dispatch | Eligible Story enters In Progress; send ticket/event to implementer webhook | Disabled rule `01a1d625-da52-7941-aa56-23ee14f08d02`; URL, hidden header and compact JSON body saved; untested |
| Reviewer dispatch | Eligible Story enters In Review; send ticket/current PR context to reviewer webhook | Disabled rule `01a1d627-62c6-7979-8b8a-161671203972`; URL, hidden header and compact JSON body saved; untested |
| QA dispatch | Eligible Story enters QA; send ticket/current PR context to QA webhook | Disabled rule `01a1d628-6c13-79d1-ae52-dcd8bdbf56de`; URL, hidden header and compact JSON body saved; untested |
| Capture blocked stage | Eligible Story enters Blocked; save previous status in Blocked at without destroying an existing valid target on duplicate processing | Deferred to PGB-62; not created |
| Human resume | Explicit human request while Blocked; validate saved stage and transition to it, retaining current PR | Deferred to PGB-62; not created |

On 13 November at 23:26 Europe/Madrid, all three saved rules were updated to
share one worker per stage across Daniel's numbered streams. Their names now use
**AI-Daniel**, while their IDs and webhook destinations are unchanged. All remain
**DISABLED**. The Automation for Jira actor and `canOtherRuleTrigger: true` remain
unchanged. Chaining has not been live-tested.

Each Work item transitioned trigger has the exact destination stage and two guards:

1. JQL: `project = "INT" AND issuetype = Story AND status = "<stage>"`.
2. Smart-value comparison: `,{{issue.labels.join(",")}},` **exactly matches regular
   expression**:

```text
^(?:,(?!AI-Daniel-[0-9]+,)[^,]+)*,AI-Daniel-[0-9]+(?:,(?!AI-Daniel-[0-9]+,)[^,]+)*,$
```

The guard accepts exactly one full, case-sensitive `AI-Daniel-<digits>` label,
with unrelated labels allowed. Missing or multiple Daniel stream labels are rejected.
JQL labels do not support this wildcard family match. The first action creates a
variable named `pigboardWorkstream`, with this smart value:

```text
{{issue.labels.join(",").match("(?:^|,)(AI-Daniel-[0-9]+)(?=,|$)")}}
```

The second action sends the authenticated POST. Keeping extraction in a separate
variable avoids embedding quoted regex syntax inside JSON. Thirteen local regex
boundary cases passed, including streams 1/2/3, unrelated labels, malformed values
and ambiguous multiple streams. Actual Jira smart-value rendering remains untested.

The boards still isolate **AI-Daniel-1 only**. Before using another numbered stream,
update both AI-board inclusion and main-board exclusion; family routing alone does
not isolate those tickets. No admission code or duplicate lock has been added.
Native webhooks are not evidence of exclusive workstream ownership.

### Webhook settings

The three endpoint URLs were read from the saved Cursor automation editors:

| Stage | Endpoint |
| --- | --- |
| In Progress | `https://api2.cursor.sh/automations/webhook/65bdee88-dee5-11f1-ba91-f63b1661ac50` |
| In Review | `https://api2.cursor.sh/automations/webhook/d6870b65-df37-11f1-ba91-f63b1661ac50` |
| QA | `https://api2.cursor.sh/automations/webhook/5e23ff45-df81-11f1-ba91-f63b1661ac50` |

The owner approved generating the three webhook credentials and storing them only
as hidden headers in the matching Jira rules. Cursor's **Generate auth header**
changes to **Copy auth header**. The copied text includes `Authorization: Bearer`;
the Jira header name is `Authorization`, and its hidden value starts with `Bearer`
(do not paste the `Authorization:` prefix into the value). Keep **Secure header**
checked. Do not save the token in the browser password manager or source control.
All three saved rules have their own matching hidden header and
`Content-Type: application/json`. Credential values are omitted. Browser
password-save prompts were dismissed. No webhook request was sent.

QA's saved Custom data body is:

```json
{
  "schema": "pigboard.jira-dispatch.v1",
  "stage": "QA",
  "workstream": "{{pigboardWorkstream}}",
  "jira": {
    "baseUrl": "https://safeguardworld.atlassian.net",
    "projectKey": "INT",
    "issueKey": "{{issue.key}}",
    "issueId": "{{issue.id}}",
    "issueUrl": "https://safeguardworld.atlassian.net/browse/{{issue.key}}",
    "updated": "{{issue.updated}}"
  }
}
```

This compact reference directs the agent to the canonical ticket rather than
copying all Jira fields into its context. The agent still needs prepared Jira read,
comment and transition capabilities. This body does **not** provide a verified
unique transition/visit ID, an ownership claim or duplicate suppression. Those
are not prerequisites of the corrected basic MVP skills. The skill verifies the
ticket repository against its configured environment. See the scope correction
below. The payload schema is Pigboard's draft
convention, not a Cursor API schema. Its delivery to the runner is untested.
Do not derive dispatch authority from arbitrary ticket prose or copied JSON alone.

The other two saved bodies use the same shape with their exact stage.
**Delay execution until response** is currently unchecked;
there are no subsequent actions. Response/failure handling remains to be accepted.
No **Validate web request** or **Test** action has been run: those may dispatch.

### Saved exports

The following are original Jira JSON exports downloaded after configuration,
not generic import templates or a working installer:

- [Implementer](../config/jira/exports/AI-Daniel-1-implementer.json)
- [PR reviewer](../config/jira/exports/AI-Daniel-1-pr-review.json)
- [QA](../config/jira/exports/AI-Daniel-1-qa.json)

All three export `state: DISABLED`, `canOtherRuleTrigger: true`, INT-only scope,
name-based target statuses, JQL and regex guards, the extraction variable, POST
destinations and JSON bodies.
The actor account ID is `557058:f58131cb-b67d-43c7-b30d-6b58d40bd077` (Automation
for Jira); the owner is Joseph Chappell. Editing is owner-only, reading is
unrestricted within Jira's applicable access rules, and failure notification is
`FIRSTERROR`. Existing project permissions and identities were not changed.

Jira exports omit hidden authorization values: the saved files contain an empty
Authorization value with `headerSecure: true`. This does not mean the live rule's
credential was removed. Importing elsewhere will require new destination-specific
credentials and replacement of site, project, account and resource IDs. Never
import these as a general customer configuration without that reconciliation.
Keep imported rules disabled. Do not expect an export to restore secrets.

Local inspection parsed all three exports and checked disabled state, chaining,
stage/JQL/endpoint alignment, guard/operator, action order, variable and payload
workstream, matching payload stage, JSON validity, and absence
of the hidden authorization values. These are static checks, not dispatch tests.
Final UI inspection showed all three Jira rules disabled and all three Cursor
automations inactive with zero runs. No Story labels or transitions were changed.

Human Review approval, UAT acceptance and production-deployment event wiring are
not configured. Human review does not grant an AI agent permission to merge.
New-work admission logic remains separate. No auto-admission or deployment trigger
is invented here.

Four pre-existing INT rules were observed enabled and left unchanged: Support Task
title from Client ID (`01a17dd0-d45a-7497-8012-8279e4247bf9`), close parent when all
children complete (`01a0fcca-8b28-70ec-9017-39b81afee0df`), assign on transition
(`01a0fcca-8d6d-7e9b-a3f0-7b56f7acff42`), and close children when parent completes
(`01a0fcca-8f67-774f-82e6-2ec1465155cb`). Their precise conditions have not been
reviewed. Check interactions before testing; “all inactive” refers to new Pigboard
rules, not a mandate to disable unrelated project automations.

## Cursor configuration

The [automation matrix](../config/cursor/automations.md) records all three existing
inactive automations, their IDs, minimal prompts, model bindings, environment and
successful Build evidence. The [CLI setup](../config/cursor/rovito-cli.md) records
provider capabilities. These remain the authoritative Cursor records; avoid
duplicating changing version pins here. The approved team Atlassian connection is
now saved on all three workers. One
isolated Cursor read check passed; see [Jira access](../config/cursor/jira-access.md).
Actual delivery writes and webhook payload acceptance remain untested.

## Verification and rollback record

The new delivery rules remain disabled and their Cursor workers inactive. No
Story labels or transitions were changed. A separate, manually started read-only
Cursor probe verified INT access; it did not invoke a delivery skill or webhook.
Later authorized acceptance must verify the saved guards and payload rendering,
board isolation, same-PR rework, permitted Jira/PR writes and authenticated stage
handoffs. Blocked-stage display and resume belong to PGB-62, not this MVP check.

Restore the original main sub-filter to reverse board isolation. Changing board
filters/mappings does not itself reverse workflow or ticket changes. Preserve the
original mappings and resource IDs before further edits; remove only setup-owned
resources after checking dependencies. Do not delete shared statuses or fields as
an automatic rollback. For Cursor recovery follow the matrix's pinned-Build procedure.

## Next work

The original webhook MVP remains the current scope in
[PGB-58](https://scubapig.atlassian.net/browse/PGB-58). Shared databases and an API
dispatcher are outside it. The [bounded webhook test](cursor-webhook-test.md)
confirmed that two identical requests create separate runs and recorded manual
stopping. It did not test API launch/cancellation or prove duplicate prevention.

### Basic MVP scope correction

The owner explicitly removed exclusive-run ownership, serialization, deduplication
and required run/visit identity from the skill contract. Those prerequisites were
an authoring error, not a missing feature to build before this MVP. The corrected
source skills execute an eligible assigned Story without proving a lock. Actual
Cursor run links/IDs are optional report metadata; otherwise use Story, stage,
revision and execution time. Do not invent IDs or treat comments as locks.

The owner will take care around repeated launches while the basic workflow is
evaluated. Automatic duplicate prevention and cancellation remain post-MVP. Skills
still verify configured scope, current stage, repository/PR and requirements/revision
freshness; retain action receipts; and stop on blockers or uncertain writes. These
cooperative checks do not enforce cross-run exclusion. Publish and accept the
corrected central bundle in a Cursor Build before testing delivery; the selected
Build record in the automation matrix is the authority for installed bytes.

### Current and deferred work

1. Prepare an explicitly authorized disposable Story/PR fixture for Jira/PR write
   acceptance and end-to-end stage handoffs. Inspect interactions with the four
   existing project rules and verify
   actual Jira rendering. No existing production Story is a write fixture.
2. PGB-61's frontend skill-authoring task is Done. Its live Cursor/PR acceptance is
   still part of rollout; it does not deliver the preview pipeline in PGB-60.
3. New-work admission, per-PR environments (PGB-60), and blocked-stage display/resume
   (PGB-62) remain separate work. Teams alerts remain later wiring.
4. After the MVP, follow the native dependency chain
   [PGB-63](https://scubapig.atlassian.net/browse/PGB-63) (bounded API facts) →
   [PGB-64](https://scubapig.atlassian.net/browse/PGB-64) (reviewed scope/design) →
   [PGB-65](https://scubapig.atlassian.net/browse/PGB-65) (grooming). They are Tasks,
   not implementation authorization. No general Cursor API key was created and no
   API launch/cancel test was started.

This checklist is the setup record, not a replacement for the PGB delivery queue.
