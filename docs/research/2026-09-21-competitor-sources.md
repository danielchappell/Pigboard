# Competitor research source ledger

Accessed 21 September 2026. Supports the [comparison report](2026-09-21-competitor-build-versus-buy.md).
Source IDs identify documents, not certainty scores. Documentation establishes
the vendor's described contract; it does not prove this account's entitlement or
successful execution. Dates below are stated publication/modification dates,
not assumed general-availability dates. Recheck contracts before implementation.

## Cursor

| ID | Primary source | What it supports / boundary |
| --- | --- | --- |
| C1 | [Jira integration](https://cursor.com/docs/integrations/jira) | Marketplace setup, eligible plans, admins, execution identities, repository selection, assign/mention and ticket feedback. Native integration differs from generic Automation tools. |
| C2 | [Automations](https://cursor.com/docs/cloud-agent/automations) | Triggers, authenticated inbound webhook, tools, environments, sharing, identity and billing. Does not establish a public provisioning or webhook-response contract. |
| C3 | [Subagents](https://cursor.com/docs/subagents) | Markdown roles, separate contexts, model configuration and cloud behavior. Account/model availability can affect actual execution. |
| C4 | [Plugins](https://cursor.com/docs/plugins) | Reusable agent assets and private marketplaces. Installing assets does not authorize external services. |
| C5 | [Cloud setup](https://cursor.com/docs/cloud-agent/setup) | Repository environments, builds and setup responsibilities. |
| C6 | [Hooks](https://cursor.com/docs/hooks) | Supported cloud hooks and exclusions. Not a universal enforcement boundary. |
| C7 | [Cloud Agents API endpoints](https://cursor.com/docs/cloud-agent/api/endpoints) | Beta v1 agent/run lifecycle, creation identity, conflicts, polling/SSE and environment constraints; v1 completion webhooks forthcoming. |
| C8 | [Cloud Agent capabilities](https://cursor.com/docs/cloud-agent/capabilities) | In-agent Cloud MCP inspection with role-dependent visibility. Different from an external management API. |
| C9 | [API webhooks](https://cursor.com/docs/cloud-agent/api/webhooks) | Legacy v0 completion/error callbacks. Do not apply to v1 or Automation inbound POSTs. |
| C10 | [Vendor forum reply](https://forum.cursor.com/t/automations-as-code-or-api/162376/15) | August 13 dated reply about external listing/history export. Current in-agent diagnostics mean it is not a blanket present-day absence claim. |
| C11 | [API index](https://cursor.com/docs/api) | Public API surface checked for Automation management. Not finding a contract here is unresolved, not proof none exists. |
| C12 | [User report of Jira-driven lifecycle](https://forum.cursor.com/t/automations-api/166898) | August 14 self-report of about 15 Automations and difficulty building an external view. Anecdotal; neither vendor contract nor market validation. |
| C13 | [Models and pricing](https://cursor.com/docs/models-and-pricing) | Usage/plan context. No account-specific or per-feature price measured. |
| C14 | [Service accounts](https://cursor.com/docs/account/enterprise/service-accounts) | Enterprise entitlement for general API service-account keys; distinguish built-in integration service identities. |
| C15 | [PR Routing & Approval](https://cursor.com/docs/approval-agents) | Repository policy files, reviewer signals and risk-based approvals; GitHub/Origin only. The vendor distinguishes this from a full code review. |

## Atlassian

| ID | Primary source | What it supports / boundary |
| --- | --- | --- |
| A1 | [Governed agent loops announcement](https://www.atlassian.com/blog/jira/governed-agent-loops) | September 10: loops, Standards and AI Review private early access; Code Context open beta; Context Controls/Usage Dashboard upcoming. Not a tested complete contract. |
| A2 | [Agentic engineering template](https://support.atlassian.com/jira-software-cloud/docs/use-the-agentic-engineering-template-to-integrate-coding-agents-in-your-workflow/) | Packaged workflow, example work and onboarding; Rovo prerequisite. Existing-project reuse needs evaluation. |
| A3 | [Create work items with Rovo](https://support.atlassian.com/jira-software-cloud/docs/create-work-items-with-rovo/) | Ideation, proposed items, splitting and criteria. Rollout/permissions and supported fields matter. |
| A4 | [Use Rovo agent action guidance](https://support.atlassian.com/cloud-automation/docs/tips-to-configure-the-action-use-rovo-agent/) | May 29 modified guidance describes read-only response/publish pattern and user identity; compare A5 before asserting a universal limitation. |
| A5 | [Studio safety](https://support.atlassian.com/studio/docs/best-practices-to-automate-agents-safely/) and [agent accounts](https://support.atlassian.com/studio/docs/understand-rovo-agent-accounts/) | September 14 modified guidance describes agent identities and autonomous writes with optional read-only restriction. Surface/rollout differences with A4 unresolved. |
| A6 | [Coding Agent in Automation](https://support.atlassian.com/jira-software-cloud/docs/work-with-jira-coding-agent-in-automations/) | Connection-owner execution, configuration, job identity, PR outcome and lack of Teamwork Graph/Confluence context in this mode. |
| A7 | [Third-party agents in Automation](https://support.atlassian.com/jira-software-cloud/docs/use-third-party-coding-agents-in-jira-automation/) | Beta Cursor/Claude/Copilot invocation; installation and event-trigger restrictions; no schedule on this path. |
| A8 | [Enable reviews](https://support.atlassian.com/rovo/docs/enable-code-reviews/) and [repository activation](https://support.atlassian.com/rovo/docs/activate-code-reviews-in-your-repository/) | Rovo Dev review, Standard-specific options, triggers, billing attribution and coverage limits. Different from A1's private-access AI Review. |
| A9 | [Acceptance criteria in review](https://support.atlassian.com/rovo/docs/check-acceptance-criteria-in-a-code-review/) | Jira linkage and classifications; empty description skips extraction. |
| A10 | [Workflow approvals](https://support.atlassian.com/jira-software-cloud/docs/set-up-approval-steps/) | Company-managed workflow configuration and human decisions. Not independent agent review completeness. |
| A11 | [Agent sessions](https://support.atlassian.com/jira-software-cloud/docs/view-and-manage-agent-sessions-in-jira/) | Needs input / Working / Finished attention view and item-level continuation. |
| A12 | [Agents dashboard](https://support.atlassian.com/jira-software-cloud/docs/use-the-agents-dashboard/) | Paid Jira availability and metrics; do not conflate with A1's forthcoming Usage Dashboard without verification. |
| A13 | [Generate code from a Jira item](https://support.atlassian.com/jira-software-cloud/docs/generate-code-from-a-work-item-in-jira/) | Initiator-only sandbox, seven inactive-day access expiry, one repo and no third-party MCP for this Coding Agent. Retained PR is separate. |
| A14 | [Retry failed rules](https://support.atlassian.com/cloud-automation/docs/retry-failed-rules-in-atlassian-automation/) | Qualifying transient errors resume at failed step for up to seven days. Not cross-provider exactly-once. |
| A15 | [Code Context setup](https://support.atlassian.com/rovo/docs/set-up-code-context-for-your-site/) | Optional beta, admin opt-in, indexing and regional/compliance boundaries. Not required for every coding route. |
| A16 | [Recommended AI templates](https://support.atlassian.com/jira-software-cloud/docs/set-up-ai-automations-using-recommended-templates/) | Setup wizard/template experience; rollout and permissions matter. |
| A17 | [Import/export rules](https://support.atlassian.com/cloud-automation/docs/import-and-export-jira-automation-rules/) | Global-admin JSON portability, mapping work, disabled imports and name-copy behavior. |
| A18 | [Transfer ownership](https://support.atlassian.com/cloud-automation/docs/transfer-jira-automation-rules-from-one-user-to-another/) | Connections have separate owners; manual update and running-flow failures are possible. |
| A19 | [Forge Rovo agents](https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-agent/) | Manifest-defined agents, prompt resources and actions; packaging, not a complete process. |
| A20 | [Remote agent connectors](https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-agent-connector/) | Preview A2A connection into native assignment/mentions/chat. Recheck before selecting a production dependency. |
| A21 | [Automation usage](https://support.atlassian.com/cloud-automation/docs/how-is-my-usage-calculated/) | Org-pooled steps, separate agentic metering and announced December 3 excess billing. Account allowance unverified. |
| A22 | [Rovo limits](https://support.atlassian.com/rovo/docs/rovo-usage-limits/) | Separate org-pooled credits, variable advanced-agent usage and announced excess billing. |
| A23 | [Rovo Dev Standard billing](https://support.atlassian.com/subscriptions-and-billing/docs/how-billing-works-for-rovo-dev-standard/) | Separate subscription/credits and excess-usage controls. |
| A24 | [Custom review instructions](https://support.atlassian.com/rovo/docs/set-custom-instructions-for-code-reviews/) | `.rovodev/.review-agent.md` and review customization. |
| A25 | [Session configuration](https://support.atlassian.com/jira-software-cloud/docs/configure-a-jira-coding-agent-session/), [repositories](https://support.atlassian.com/jira-software-cloud/docs/supported-repositories-for-jira-coding-agent/) and [org setup](https://support.atlassian.com/jira-software-cloud/docs/set-up-jira-coding-agent-in-your-organization/) | This specific Coding Agent's eligibility, environment and compliance limits. Do not apply to third-party Cursor execution. |
| A26 | [Advanced Automation](https://support.atlassian.com/cloud-automation/docs/advanced-automation-components/) | Premium/Enterprise branches, delays and bounded loops. A lifecycle does not automatically require a separate engine. |

## Integration and packaging contracts

| ID | Primary source | What it supports / boundary |
| --- | --- | --- |
| F1 | [Forge Remote](https://developer.atlassian.com/platform/forge/remote/) | Owned remote, installation context, optional tokens and shared responsibilities. |
| F2 | [Remote essentials](https://developer.atlassian.com/platform/forge/remote/essentials/) | Invocation verification; event/schedule timeout/retries differ from UI calls. Long model work needs asynchronous handling. |
| F3 | [Forge events](https://developer.atlassian.com/platform/forge/events/) | Manifest subscriptions and function/remote delivery. |
| F4 | [Jira webhooks](https://developer.atlassian.com/cloud/jira/software/webhooks/) | Dynamic OAuth refresh limits and general webhook retries/identity. Not Automation Send web request's contract. |

## Method and limits

Research used official documentation/announcements, a dated vendor forum reply,
one labeled user report, and bounded observation of the signed-in interfaces.
Firecrawl searches/full-page extracts and cached same-day extracts supplied initial
evidence; a shared rate limit required subsequent official-page inspection through
the web tool. Search failures were not evidence of missing capabilities.

The parent authored the synthesis; separate researchers examined Cursor and
Atlassian. Independent review is recorded in [development review](../development-review.md).
No customer interviews, complete live journey, multi-user recovery test,
tenant-wide entitlement audit or comparative cost measurement was performed.
The inactive Cursor draft side effect is disclosed in the report. This ledger
contains no credentials or private chat transcripts.

Unresolved points include external Automation provisioning/run contracts, Rovo
identity/action differences between docs, actual access to announced features,
review coverage/revision binding, cross-user continuation and measured operational
effort. The report's eight experiments avoid treating undocumented behavior as
absent or treating a missing feature as proof of a commercially valuable market.
