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

Environment installation, the stable per-run skill path, actual independent High
reviewer/Medium execution controls, Jira/Bitbucket tools, webhook authentication,
serialization and retained evidence remain unfinished setup. Those are configuration
work, not instructions for an agent to investigate. Local scripts and their reviewed
skill release still require remote publication before cloud setup can fetch them.
