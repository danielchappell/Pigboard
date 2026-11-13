# AI-Daniel-1 QA setup

Use the exact [QA prompt](qa-prompt.txt). The agent reads `qa-entrypoint`, which
invokes only the ticket's prescribed skills and cases in order. Skill installation,
label/status routing and environment provisioning stay outside the prompt.

Configuration target: Safeguard INT, workstream `AI-Daniel-1`, entry to QA; webhook;
Plexus/master with the existing prepared Pigboard environment; Grok 4.7 High, Fast
off. Keep inactive. The [automation matrix](automations.md) records actual saved
state and distinguishes pending capabilities from configured settings.

QA runs on the existing open PR. It retains screenshots/request/query evidence and
records outcomes on the ticket. PASS moves to Human Review; confirmed in-scope
implementation defects return to In Progress on the same PR; missing prerequisites,
evidence or required scope decisions stop Blocked for a human. Discussion stays in
QA. No patches, approvals, new PRs, merges, deployments or environment repair.

Required before a live QA run: complete structured ticket; reviewed execution
artifacts; exact current source/target and approval/CI; matching ready pipeline PR
environment comment; named installed tools and prepared access; retained evidence;
direct Jira reporting/transitions. No exclusive-run proof, lock or run/visit ID
is required. Duplicate prevention is deferred; the owner takes care around
repeated launches. Jira wiring,
preview provisioning and the MCP route remain separate setup work. Missing inputs
must not trigger discovery or retries. Human Review and later stages have no agent.
