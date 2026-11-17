# AI-Daniel-1 QA setup

Use the exact [QA prompt](qa-prompt.txt). The agent reads `qa-entrypoint`, which
invokes only the ticket's prescribed skills and cases in order. Skill installation,
label/status routing and environment provisioning stay outside the prompt.

Configuration target: Safeguard INT, workstream `AI-Daniel-1`, entry to QA; webhook;
Plexus/master with the existing prepared Pigboard environment; Grok 4.7 High, Fast
off. Keep inactive. The [automation matrix](automations.md) records actual saved
state and distinguishes pending capabilities from configured settings.

QA runs on the existing open PR and retains screenshots/request/query evidence.
Successful supported ordinary `new_work` QA moves to Human Review with the exact
pending human cases; static zero-AI QA keeps its no-AI reason. Complete confirmed
in-scope defects, with the full valid partial ledger and required current proof,
publish one QA `repair_request` on the same open PR and verify the direct
QA → Rework Queued transition. Independent inability, missing proof or required
scope decisions retain every finding, row and receipt locally without Blocked
publication. Discussion stays QA without publication. Only the manager later
admits repair; no direct-In-Progress fallback. No patches, approvals, new PRs,
merges, deployments or environment repair.

Required before a live QA run: complete structured ticket; reviewed execution
artifacts; exact current source/target and approval/CI; matching ready pipeline PR
environment comment; named installed tools and prepared access; retained evidence;
direct Jira reporting/transitions. No exclusive-run proof, lock or run/visit ID
is required. Duplicate prevention is deferred; the owner takes care around
repeated launches. Jira wiring,
preview provisioning and the MCP route remain separate setup work. Missing inputs
must not trigger discovery or retries. Human Review and later stages have no agent.
