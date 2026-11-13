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
- Project, Story type, exact employee/bot label and status determine dispatch.
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
| Exact workstream label and accountable owner | Dispatch eligibility |
| AI board name, location, filter and sharing | Dedicated delivery view |
| Workflow status IDs and categories; column mappings | Use actual statuses, not display-name guesses |
| Blocked-at field ID, type, context and card placement | Visible saved stage and deterministic resumption |
| Human resume action and authorized callers | Human intervention without manual dragging |
| Cursor environment, repository/base allowlist, skill revision and Build | Prepared execution environment |
| Three automation IDs, webhook endpoints and secret references | Stage-specific dispatch |
| Rule IDs, triggers, guards, actor, payload and disabled state | Reproducible rules and auditability |
| Event/visit identity and ownership controls | Duplicate handling; acceptance required before activation |
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

## Automation inventory: required, not yet created

| Rule | Trigger and behavior | State |
| --- | --- | --- |
| Implementer dispatch | Eligible Story enters In Progress; send ticket/event to implementer webhook | Disabled draft `01a1d625-da52-7941-aa56-23ee14f08d02`; URL saved, credential generated but not yet stored in Jira; payload pending |
| Reviewer dispatch | Eligible Story enters In Review; send ticket/current PR context to reviewer webhook | Disabled draft `01a1d627-62c6-7979-8b8a-161671203972`; URL/header/payload pending |
| QA dispatch | Eligible Story enters QA; send ticket/current PR context to QA webhook | Disabled rule `01a1d628-6c13-79d1-ae52-dcd8bdbf56de`; URL, hidden header and compact JSON body saved; untested |
| Capture blocked stage | Eligible Story enters Blocked; save previous status in Blocked at without destroying an existing valid target on duplicate processing | Deferred to PGB-62; not created |
| Human resume | Explicit human request while Blocked; validate saved stage and transition to it, retaining current PR | Deferred to PGB-62; not created |

Each rule must scope to INT, Story, exact AI-Daniel-1 label. Capture the actual
rule actor, allow-other-rules setting, status IDs, payload/auth mechanism and rule
ID when saved. Check rule-chaining behavior deliberately: a resume transition must
reach the stage dispatcher, but duplicate events must not start competing workers.
Do not claim native automation provides atomic workstream ownership without evidence.

All three rules have a Work item transitioned trigger with the exact To status,
and a trigger JQL condition of `project = "INT" AND issuetype = Story AND labels =
"AI-Daniel-1" AND status = "<stage>"`. They contain a Send web request action (POST).
Jira's **Save without enabling** saved them with **Disabled** visible. They have
not been exercised and are not accepted working dispatchers.
The success-page URL includes `__RULE_TURNED_ON` even when the visible toggle is
Disabled; do not infer activation from that URL suffix.

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
QA's saved rule has that hidden header and `Content-Type: application/json`.
The implementer credential was generated but has not yet been stored in Jira.
The reviewer credential has not yet been generated. Credential values are omitted.

QA's saved Custom data body is:

```json
{
  "schema": "pigboard.jira-dispatch.v1",
  "stage": "QA",
  "workstream": "AI-Daniel-1",
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
unique transition/visit ID, an ownership claim, repository admission or duplicate
suppression. Those remain activation gates. The payload schema is Pigboard's draft
convention, not a Cursor API schema. Its delivery to the runner is untested.
Do not derive dispatch authority from arbitrary ticket prose or copied JSON alone.

The other stage bodies should use the same shape with their exact stage; they have
not been saved yet. **Delay execution until response** is currently unchecked;
there are no subsequent actions. Response/failure handling remains to be accepted.
No **Validate web request** or **Test** action has been run: those may dispatch.

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
duplicating changing version pins here. Runtime Jira capability wiring and actual
webhook authentication/payload acceptance are still pending.

## Verification and rollback record

No rule activation, webhook dispatch or Story transition is authorized in this
configuration task. Verification now consists of saved settings and disabled-state
inspection. Later bounded acceptance must verify: label isolation (including
unlabeled main-board issues), every status/column mapping, blocked-stage display,
human resume and invalid-target handling, same-PR rework, duplicate handling, and
each authenticated stage handoff. Record actual outcome separately from intent.

Restore the original main sub-filter to reverse board isolation. Changing board
filters/mappings does not itself reverse workflow or ticket changes. Preserve the
original mappings and resource IDs before further edits; remove only setup-owned
resources after checking dependencies. Do not delete shared statuses or fields as
an automatic rollback. For Cursor recovery follow the matrix's pinned-Build procedure.

## Next work

1. Complete the three disabled stage drafts' webhook and runtime Jira access wiring.
2. Review the captured configuration and keep explicit remaining acceptance gates.
3. PGB-62 later supplies the Blocked at field, card display and human resume rules.

This checklist is the setup record, not a replacement for the PGB delivery queue.
