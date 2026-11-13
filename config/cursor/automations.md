# Cursor automation setup matrix

All three stage automations must stay **inactive** until explicit go-live. A saved
configuration and selected successful Build are setup evidence, not a completed
Story or authorization to invoke a webhook. Jira automation wiring comes after the
skills, model controls and prepared capabilities are ready.

| Stage | Automation | Versioned prompt | Installed entrypoint | Model |
| --- | --- | --- | --- | --- |
| In Progress | [AI-Daniel-1 Implementer](https://cursor.com/t/safeguardglobal-engineering/automations/65bdee88-dee5-11f1-ba91-f63b1661ac50) | [implementer-prompt.txt](implementer-prompt.txt) | `/opt/pigboard/skills/implementer-entrypoint/SKILL.md` | Grok 4.7 High parent; one independent High plan review; Medium execution needs verified phase controls |
| In Review | [AI-Daniel-1 PR Reviewer](https://cursor.com/t/safeguardglobal-engineering/automations/d6870b65-df37-11f1-ba91-f63b1661ac50) | [pr-review-prompt.txt](pr-review-prompt.txt) | `/opt/pigboard/skills/pigboard-pr-review/SKILL.md` | Grok 4.7 High, Fast off |
| QA | AI-Daniel-1 QA — creation pending | [qa-prompt.txt](qa-prompt.txt) | `/opt/pigboard/skills/qa-entrypoint/SKILL.md` | Grok 4.7 High, Fast off |

All use the [Plexus/master environment](https://cursor.com/t/safeguardglobal-engineering/cloud-agents/environments/e/9cb332e1-dee7-11f1-ba91-f63b1661ac50)
and webhook triggers. Agent instructions are the prompt files verbatim. Do not add
label checks, skill fetching, authentication or environment repair to those prompts.
For review and QA, do not attach automatic PR creation or memory tools. The
implementer must follow the target repository's contribution process.

## Evidence and remaining setup

Last verified before this update: implementer/reviewer inactive; selected Build
`bld-20261113-acf94235-6161-4a9c-b60a-f5fcd89b0a16`, skills pin
`525614aa6c5edd0248a6098e306c777bba2c394f`, Rovito 0.1.295, persistent read-only profile.
Account/Plexus read checks passed. That Build does not contain the new authoring
contract yet. The token upgrade is awaiting owner creation/save; token scopes and
local CLI write policy are separate capabilities. No review or Jira run is implied.

The new bundle adds `write-pr-sized-stories` to the ten execution skills. Authoring
uses its [structured ticket contract](../../skills/write-pr-sized-stories/references/pigboard-ticket.md)
and examples. The three stage entrypoints link the same contract. Having the
writer installed does not start a grooming automation or load all skills as context.

Cursor documents [custom subagent models](https://cursor.com/docs/subagents),
including explicit model parameters and user-level definitions outside a repo.
This establishes a possible configuration path, not proof of this account's phase
switch/High propagation. Actual Grok IDs/parameters, independent plan review and
Medium execution must be verified before implementation runs. Do not replace this
with a prose claim or silently run all phases at High.

Later Jira wiring owns project/label/status filtering, new-work admission, webhook
authentication, repository allowlist, event/visit identity and duplicate ownership.
Prepared connectors own ticket/PR reads, reports and direct transitions. Operator
setup owns credentials/tools and retained evidence; the pipeline owns per-PR targets.
Do not put this authority into authoring prose. Configure real IDs at that later
step; never guess them from a board column name. Teams alerts remain later wiring.

## Refresh and recovery

Publish reviewed changes, update the environment's skill pin, preserve the current
CLI setup/secrets, and run a draft Build. Inspect the manifest, eleven entrypoints,
canonical reference/example and helper probes before selecting it. Keep the prior
Build on failure; do not enable an automation as part of selecting a Build. Record
new Build/UI acceptance here after observation, including any remaining limitations.
