# AI-Daniel-1 implementer setup

Target confirmed by owner: Bitbucket `sgwidevelopment/plexus`, base `master`.
Project: Safeguard INT; Story label `AI-Daniel-1`; trigger: entry to In Progress.

## Agent instruction

Copy [implementer-prompt.txt](implementer-prompt.txt) into Cursor. That versioned file
is the source of truth for the small invocation prompt. The Jira trigger supplies
the ticket. The ticket specifies the codebase. Work instructions live in the skill.

Routing, label/status filtering, skill fetching and environment readiness belong in
deterministic setup and Jira wiring, not in the agent prompt. Setup must expose the
chosen release at `/opt/pigboard/skills` for each isolated run before work starts;
that path is a required setup contract, not evidence it exists today. Preserve the
release receipt outside the prompt for reproducibility. No model-led cloning,
installation or environment repair is part of the invocation.

## Saved state — 12 November 2026

[Cursor automation](https://cursor.com/t/safeguardglobal-engineering/automations/65bdee88-dee5-11f1-ba91-f63b1661ac50)
was saved and visually read back as **Inactive**, with Plexus/master, a webhook
trigger, Grok 4.7 High (Fast off), Open Pull Request, and the exact minimal prompt.
Memories are removed. No run or live Jira trigger has been exercised.

## Deterministic environment setup

[Personal Plexus environment](https://cursor.com/t/safeguardglobal-engineering/cloud-agents/environments/e/9cb332e1-dee7-11f1-ba91-f63b1661ac50)
was created using Skip & Save, without agent onboarding. Its configuration is separate
from the application repository. Install the versioned
[Build command](environment-install.sh), with `PIGBOARD_REVISION` set to the reviewed,
published commit. Keep Start Script empty for Pigboard. The command verifies the
bundle and exposes `/opt/pigboard/skills` before a successful Build is snapshotted.

Local validation before the authentication delta: 207/207 repository tests, including 9/9 preparation/adapter fixtures.
A real locked dependency installation also verified ten entrypoints, 23 source
file hashes, `pg.Client` loading and Bruno 4.2.1 execution. This is local evidence,
not a successful Cursor Build. The install command was saved in Cursor, pinned to
published revision `12675375bc8710f197f9ceba43f56a2d845fbd0d` on private branch
`codex/cursor-pigboard-skills`. Draft manual Build
`bld-20261112-6e72c6e7-a274-4476-9608-1f74512a6afe` checked out Plexus `9c7f525` and
reached the command, but finished **Install failed**: it could not fetch the private
Pigboard source. No skills were installed. The automation remains inactive.

Optional dedicated read-only deploy-key support passed both independent reviews at
`4e71014415679a04a935d763f1b759fea7651b63`; all 208 repository tests passed. It is
prepared in the versioned command;
live key registration and the `PIGBOARD_DEPLOY_KEY` environment secret await explicit
access approval. After approval, publish the reviewed authentication revision, update
the saved command/pin, configure the secret and rerun a draft Build. Inspect the
verification receipt before selecting a successful Build. Never activate the failed
draft or treat its created snapshot as proof that installation succeeded.

For refresh, keep the automation inactive, update the pinned commit and inspect the
replacement Build before reactivation. A failed Build can leave the previous Build
active; do not infer fresh skills from the existence of an environment. The setup
does not automatically follow Pigboard branch changes or refresh within agent work.

Actual independent High reviewer/Medium execution controls, Jira/Bitbucket tools,
webhook authentication, serialization and retained evidence remain unfinished setup.
Those are configuration work, not instructions for an agent to investigate. Environment
readiness alone does not establish end-to-end workflow readiness.
