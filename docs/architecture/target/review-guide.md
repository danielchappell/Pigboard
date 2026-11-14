# Ratified target architecture

The owner ratified all nine diagrams on 14 November 2026. They describe the intended
product, not currently deployed capabilities. Open `index.html` locally for the
navigable walkthrough or use the standalone SVG files on GitHub. Print the local
walkthrough to produce the nine-page PDF. Presenter notes remain available.

## First usable manager release

[Release scope](../manager-release-one.md) and [Jira plan](../manager-release-one-plan.md)
limit release one to admission in customer-owned AWS Lambda. Existing Jira rules
still launch Cursor directly. The combined manager shown in diagrams 1, 2 and 9
is the later destination; dispatch ownership, persistent run records, duplicate
prevention and worker monitoring are not in release one.

The customer owns deployment, credentials and operational data. Scuba Pig has no
runtime access or telemetry. AWS is the first supported deployment target; no
shared SaaS or other-cloud package is included. No archived implementation is reused.

## Walkthrough

1. One delivery loop — systems and their responsibilities.
2. Inside the manager — eventual admission, dispatch and observation modules.
3. Admit only the next eligible ticket — readiness, priority and capacity.
4. Workers own evidence and handoffs — permitted stage outcomes.
5. Small skills, composed for each role — entry point, job and Jira responsibilities.
6. Independent streams, shared worker types — numbered labels and five-ticket cap.
7. Repair the stack without interrupting work — finish B, repair A, then update B.
8. Pause admission, finish the active cycle — pausing does not cancel workers.
9. Observe execution; humans decide recovery — future visibility without automatic recovery.

## Decisions still needed before implementation

PGB-67 resolves exact YAML/dependency/repair contracts and unusual repair-capacity
states. PGB-68 verifies scheduling, Jira reads/transitions, permission boundaries
and uncertain-write handling. PGB-69 then creates reviewed implementation Stories.
The diagrams ratify direction, not unresolved technical mechanisms or live claims.

Human merge/retarget, UAT and production acceptance remain outside agent automation.
No transcript archive, automatic restart, general AI supervisor or SaaS is approved.
