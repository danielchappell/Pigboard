# AI-Daniel-1 implementer setup

Current configuration and rollout gaps are recorded in the
[three-stage automation matrix](automations.md). Older Build/pin observations below
are dated history; they do not override the matrix or authorize activation.

Target confirmed by owner: Bitbucket `sgwidevelopment/plexus`, base `master`.
Project: Safeguard INT; Story label `AI-Daniel-1`; trigger: entry to In Progress.

## Agent instruction

Copy [implementer-prompt.txt](implementer-prompt.txt) into Cursor. That versioned file
is the source of truth for the small invocation prompt. The Jira trigger supplies
the ticket. The ticket specifies the codebase. Work instructions live in the skill.

Routing, label/status filtering, skill fetching and environment readiness belong in
deterministic setup and Jira wiring, not in the agent prompt. Setup must expose the
chosen release at `/opt/pigboard/skills` for each isolated run before work starts;
the successful Build below verifies that path in the prepared snapshot. Preserve the
release receipt outside the prompt for reproducibility. No model-led cloning,
installation or environment repair is part of the invocation.

## Current state — 13 November 2026

**Setup only; not live.** The owner clarified that both automations must remain
inactive until explicit go-live authorization. The implementer was disabled at
10:22 Europe/Madrid; its overview showed zero runs in seven days. The earlier
activation below is historical and does not authorize reactivation after a build.
No Jira labels were added or Story dispatched by this setup.

The owner explicitly authorized making the entire existing repository public,
including its older configuration and metadata. GitHub visibility is public, and an
anonymous HTTPS download of the pinned implementer skill matches its committed hash.
No deploy key was created or installed.

[Successful Build](https://cursor.com/t/safeguardglobal-engineering/cloud-agents/builds/bld-20261113-277cc7ee-c12a-43bb-a1ea-eccdbb01f08f)
ran the saved deterministic Install Script against Plexus master (`9c7f525`) and
Pigboard `12675375bc8710f197f9ceba43f56a2d845fbd0d`. It exited 0 and the downloaded
receipt confirms `/opt/pigboard/skills`, all ten entrypoints, 23 source hashes,
locked dependencies and both `pg.Client` and `bru --version` smoke checks. The Build
finished Success, then was activated for new agents. Start Script remains empty.

The existing AI-Daniel-1 implementer automation was then enabled at the owner's
explicit request. The UI read back **Active**, Plexus/master, Grok 4.7 High, webhook
trigger and the unchanged one-sentence instruction. No Jira event or work agent was
launched. Its overview currently reports zero MCP connections. This activation does
not establish end-to-end workflow readiness: Jira rule/authentication wiring, actual
independent High/Medium phase controls and connected ticket tools still require
configuration and verification before live ticket dispatch.

## Setup, refresh and recovery

[Cursor automation](https://cursor.com/t/safeguardglobal-engineering/automations/65bdee88-dee5-11f1-ba91-f63b1661ac50)
uses the [personal Plexus environment](https://cursor.com/t/safeguardglobal-engineering/cloud-agents/environments/e/9cb332e1-dee7-11f1-ba91-f63b1661ac50).
Copy the versioned [Build command](environment-install.sh) into Install Script,
preceded by `export PIGBOARD_REVISION=REVIEWED_40_CHARACTER_COMMIT`. Keep Start Script
empty. The current pin above remains reachable after the repository cleanup; no
live environment repin is part of that cleanup.

Disable the automation before changing its environment. Publish the reviewed
revision, update the pin, run a draft Build and inspect its verification receipt
before selecting that successful Build. Reactivate only after explicit owner
go-live authorization. A failed Build can leave
the previous Build active; a snapshot's existence is not proof of fresh skills.
Resolve failure manually and rebuild, or deliberately restore a known reviewed pin.

Historical setup plans, failed-build evidence and review records remain on branch
[`codex/cursor-pigboard-skills` in the private archive](https://github.com/danielchappell/pigboard-legacy/tree/codex/cursor-pigboard-skills/docs/reviews).
The 12 November private-source fetch failed. Public-source setup superseded it;
optional deploy-key support in the command is unused. No key setup is required.

The remaining wiring is listed in the [workflow guide](../../docs/workflow.md).
