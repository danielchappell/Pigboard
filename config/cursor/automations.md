# Cursor automation setup matrix

All three stage automations must stay **inactive** until explicit go-live. A saved
configuration and selected successful Build are setup evidence, not a completed
Story or authorization to invoke a webhook. Jira automation wiring comes after the
skills, model controls and prepared capabilities are ready.

| Stage | Automation | Versioned prompt | Installed entrypoint | Model |
| --- | --- | --- | --- | --- |
| In Progress | [AI-Daniel-1 Implementer](https://cursor.com/t/safeguardglobal-engineering/automations/65bdee88-dee5-11f1-ba91-f63b1661ac50) | [implementer-prompt.txt](implementer-prompt.txt) | `/opt/pigboard/skills/implementer-entrypoint/SKILL.md` | Grok 4.7 High parent; tested explicit High review / Medium execution Task controls |
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
the later model-control checks below. No PR-write acceptance, Jira run or delivery run
is implied. Token rights, CLI policy and complete workflow readiness are distinct.

The new bundle adds `write-pr-sized-stories` to the ten execution skills. Authoring
uses its [structured ticket contract](../../skills/write-pr-sized-stories/references/pigboard-ticket.md)
and examples. The three stage entrypoints link the same contract. Having the
writer installed does not start a grooming automation or load all skills as context.

The later phase Build `bld-20261113-6159d5c3-112c-41a9-997f-1c9bf6bab5f5`
successfully installed custom user-agent files, but the runtime rejected their
names. That mechanism is superseded and its installer removed. Fresh Builds use
the existing shared skill's [explicit Task binding](../../skills/implementer-entrypoint/references/cursor.md#verified-cursor-task-binding):
generalPurpose with grok-4.7-high for review and grok-4.7-medium for execution,
same_machine, foreground, fresh review contexts. The one-line prompt is unchanged.

The bounded [setup run](https://cursor.com/t/safeguardglobal-engineering/agents/bc-b264dab4-d964-4f66-9bd1-a87eb138a5de)
completed both explicit Task selections. Cursor task cards showed High and Medium;
distinct child IDs and matching checkout observations were retained. There was no
Story execution, code change or provider write. The Task response omits model/effort
telemetry: per-run records must distinguish accepted dispatch controls from the
operator's setup-observed model. Missing/invalid selectors or conflicting metadata
block. Model/version/runner changes require renewed acceptance. The corrected
source was installed by successful Build
`bld-20261113-8c16367f-906e-4d3f-9b87-22f49e242697`, selected on 13 November at
18:18 Europe/Madrid. It pins reviewed commit
`bb9ca3ab8b9a87d6b27a078cc0df40a5e94df301` from merged PR #56 and verifies eleven
entrypoints, 27 source files, locked dependencies, pg.Client and bru --version.
Rovito 0.1.295 and the permanent review-write profile were freshly installed.
The configuration-only profile receipt keeps providerAccessVerified false; the
separate authorized read-check Build above is the live access evidence. No
PR-write, Jira or real-Story acceptance is implied. All three automations remain
inactive; selecting a Build did not enable them.

Later Jira wiring owns project/label/status filtering, new-work admission, webhook
authentication, repository allowlist, event/visit identity and duplicate ownership.
Prepared connectors own ticket/PR reads, reports and direct transitions. Operator
setup owns credentials/tools and retained evidence; the pipeline owns per-PR targets.
Do not put this authority into authoring prose. Configure real IDs at that later
step; never guess them from a board column name. Teams alerts remain later wiring.

Jira setup recorded later on 13 November: the separate INT AI board is configured,
and the three matching Jira rules have scoped transition triggers, Cursor endpoints,
hidden authorization headers and compact ticket-reference payloads. They are all
disabled; all three Cursor automations remain inactive with zero runs. See the
[Jira setup record and exports](../../docs/jira-setup.md) for exact settings,
PGB-62's deferred blocked-stage work, and the runtime access/admission/duplicate
handling gates still required before an authorized test. No dispatch was performed.

## Refresh and recovery

Publish reviewed changes, update the environment's skill pin, preserve the current
CLI setup/secrets, and run a draft Build. Inspect the manifest, eleven entrypoints,
canonical reference/example and helper probes before selecting it. Keep the prior
Build on failure; do not enable an automation as part of selecting a Build. Record
new Build/UI acceptance here after observation, including any remaining limitations.
