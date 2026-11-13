# Cursor automation setup matrix

All three stage automations must stay **inactive** until explicit go-live. A saved
configuration and selected successful Build are setup evidence, not a completed
Story or authorization to invoke a webhook. Jira automation wiring comes after the
skills, model controls and prepared capabilities are ready.

| Stage | Automation | Versioned prompt | Installed entrypoint | Model |
| --- | --- | --- | --- | --- |
| In Progress | [AI-Daniel-1 Implementer](https://cursor.com/t/safeguardglobal-engineering/automations/65bdee88-dee5-11f1-ba91-f63b1661ac50) | [implementer-prompt.txt](implementer-prompt.txt) | `/opt/pigboard/skills/implementer-entrypoint/SKILL.md` | Grok 4.7 High parent; High reviewer/Medium executor definitions prepared; runtime verification pending |
| In Review | [AI-Daniel-1 PR Reviewer](https://cursor.com/t/safeguardglobal-engineering/automations/d6870b65-df37-11f1-ba91-f63b1661ac50) | [pr-review-prompt.txt](pr-review-prompt.txt) | `/opt/pigboard/skills/pigboard-pr-review/SKILL.md` | Grok 4.7 High, Fast off |
| QA | [AI-Daniel-1 QA](https://cursor.com/t/safeguardglobal-engineering/automations/5e23ff45-df81-11f1-ba91-f63b1661ac50) | [qa-prompt.txt](qa-prompt.txt) | `/opt/pigboard/skills/qa-entrypoint/SKILL.md` | Grok 4.7 High, Fast off |

All use the [Plexus/master environment](https://cursor.com/t/safeguardglobal-engineering/cloud-agents/environments/e/9cb332e1-dee7-11f1-ba91-f63b1661ac50)
and webhook triggers. Agent instructions are the prompt files verbatim. Do not add
label checks, skill fetching, authentication or environment repair to those prompts.
For review and QA, do not attach automatic PR creation or memory tools. The
implementer must follow the target repository's contribution process.

## Evidence and remaining setup

Verified 13 November: all three automations inactive, zero runs, exact skill prompts
and the same prepared environment. The implementer's previous direct-repository
selection was corrected to that environment. QA was created and saved without
enabling it. Selected successful Build
`bld-20261113-15ee43f7-bf69-40ed-8b43-c61cf657f092` installed skill pin
`b5004d81f227ff7e3bea0680ea86c5d7a78e47dd`, Rovito 0.1.295 and review-write profile.
The owner saved the five-scope token; account/Plexus read checks passed with zero
remote writes. This Build contains the structured authoring contract. It predates
the new phase definitions below. No PR-write acceptance, Jira run or delivery run
is implied. Token rights, CLI policy and complete workflow readiness are distinct.

The new bundle adds `write-pr-sized-stories` to the ten execution skills. Authoring
uses its [structured ticket contract](../../skills/write-pr-sized-stories/references/pigboard-ticket.md)
and examples. The three stage entrypoints link the same contract. Having the
writer installed does not start a grooming automation or load all skills as context.

Cursor documents [custom subagent models](https://cursor.com/docs/subagents),
including explicit model parameters and user-level definitions outside a repo.
The pinned setup installs [High plan review](agents/pigboard-plan-review.md) and
[Medium execution](agents/pigboard-execution.md) definitions in the cloud user's
`~/.cursor/agents`, outside Plexus. Identical files reuse; conflicts are preserved
for an operator. Project definitions must not shadow those names. The High parent
delegates through the [phase contract](../../skills/implementer-entrypoint/references/cursor.md).
Installation reports `actualModelVerified: false`. Build acceptance must record
the destination and both definition hashes; a separate authorized runtime test must
prove discovery, isolated reviewer, actual effort metadata and checkout continuity.
Until then, phase readiness remains pending. Never substitute a prose claim or
silently run all phases at High. No change to the one-line automation prompt.

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
