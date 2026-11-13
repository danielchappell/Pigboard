# Cursor Jira access: setup and acceptance

The existing team **Atlassian** connection is saved on the three inactive Pigboard
workers. It gives the agents tools to read the canonical ticket and, once separately
authorized, publish reports and transitions. Jira still chooses when to call each
worker's webhook. These are separate parts of the same flow.

## Repeating the setup

1. Open each worker in the [automation matrix](automations.md). Keep it inactive.
2. Add the existing team Atlassian connection under tools/MCP servers. Do not create
   another connection or put credentials in the prompt.
3. Keep the prepared Plexus environment, selected Build, model and versioned prompt.
4. Save. If Cursor offers **Save and Enable**, choose **Save** only. Reopen and check
   **Inactive**, saved connection, prompt, model and environment.
5. Use an isolated, repository-free read probe for access acceptance, rather than
   triggering an implementer/reviewer/QA delivery skill.

Cursor exposes the connection's full available tool set. This setup is not an
INT-only permission boundary. It changes neither team credentials nor Jira project
permissions. Removing a connection from one probe is different from globally
Disconnecting it; leave the three configured workers attached.

## Observed read-only check

[Run bc-a52b5825-e517-4d7f-a97a-e81d1d5a0184](https://cursor.com/t/safeguardglobal-engineering/agents/bc-a52b5825-e517-4d7f-a97a-e81d1d5a0184)
finished successfully on 13 November 2026 at 23:18 Europe/Madrid, after 1m31s.
The operator inspected actual read-tool calls as well as the final PASS report.

| Read | Observed result |
| --- | --- |
| Site | `https://safeguardworld.atlassian.net`, cloud `cf18aaf7-46fd-4b9f-849a-8d2bad340c54` |
| Project | `INT`, ID `10716`, Integrations |
| Existing issue, read only | `INT-165`, ID `660287`, In Progress, status ID `3` |
| AI board metadata | `1312`, INT AI — Automation-managed |
| Available issue transitions | Product Acceptance `2`; In Progress `31`; QA `51`; In Review `111`; Human Review `131`; Blocked `141` |

Other transitions were also returned. These IDs were observed for INT-165 only;
re-read transitions on the actual Story before using one. Availability is not
proof that a write succeeded. The probe's report recorded `writesAttempted: false`,
and the inspected calls were reads/discovery. No Jira comment, label or transition,
PR action, application code, delivery skill or credential inspection was performed.
The three workers were not each independently run; one probe accepted their shared
connection. The unchanged selected Build is recorded in the matrix.

The probe `5b14a3ea-df99-11f1-ba91-f63b1661ac50` was restored to its original
transport-only prompt, detached from Atlassian and saved inactive with no repository.
Its history now includes this read test in addition to the two earlier webhook
probes. This check sent no webhook request and created no general Cursor API key.

Operator evidence is retained locally under `outputs/jira-automation/` in the setup
workspace: `jira-read-check-pass-20261113.png`,
`jira-read-check-tool-evidence-20261113.png`, the three
`*-atlassian-inactive-20261113.png` screenshots and
`read-probe-restored-inactive-20261113.png`. These local screenshots are not shipped
as public source; the run link and this record are the shared evidence.

## Remaining acceptance and recovery

No delivery run is authorized by this check. Before a real test, resolve the
[entrypoint ownership contract gap](../../docs/jira-setup.md#unresolved-entrypoint-contract)
and designate a disposable Story/PR for explicit write and handoff acceptance.
Actual Jira payload rendering, comments/transitions, PR comment/approval rights,
same-PR rework and end-to-end handoffs remain unverified. Per-PR preview environments
and blocked-stage resumption remain their separate tasks.

If access fails, retain the error and stop; ask the operator to repair the existing
connection. Do not replace it with ad hoc tokens, widen team permissions or keep
retrying. Keep delivery workers and matching Jira rules inactive. Re-run only the
bounded read check after repair; a read PASS must not be reported as write acceptance.
