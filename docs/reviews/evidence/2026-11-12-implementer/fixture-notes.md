# Isolated instruction exercise

All identities, repositories, revisions, Grok profiles and connector results here
are fictional. The driver supplies receipts for chosen actions and records them;
it does not choose the plan, action order, verdict, destination or final report.
No network or real repository/Jira mutations occur. `implement` abstracts a scoped
commit, push, local checks and prepared QA artifacts, not real code execution.
`review_plan` abstracts an isolated High reviewer response; set_phase is simulated,
not proof that Cursor or Grok support this handoff. Evidence reads represent a
prepared accessible fixture artifact, not screenshots/actual hosted CI.

Call: python3 /tmp/pigboard-implementer-entrypoint-20261112/driver.py caseN ACTION 'JSON'
Actions: read_context, set_phase {phase: plan|execute}, record_plan {plan: ...},
review_plan, implement {acceptedPlan: ..., fixes: ...}, publish_pr,
inspect_pr, wait_ci, read_evidence {ref,claim}, publish_report {report:...},
ensure_pr_link {report}, transition {statusId}, finish {full final result}.
The evaluator should use the actual skill against each scenario, choose actions,
inspect receipts and preserve all observations. No live subagents or connectors
should be invoked inside this exercise. File state is local to each case; do not
reset it or bypass the driver. Fresh scenario reads supply the complete fixture
context. Unspecified fields use the documented fixture preparation guarantees.

The retained driver is named recording-driver.py. To replay, copy it as driver.py
and scenarios.json into a new empty temporary directory and use that absolute
path in calls. Do not run the retained driver directly in the repository or reuse
finished state files. The retained traces are historical evidence, not replay input.
check-traces.py reads traces.json and regenerates only trace-validation.json;
it does not invoke the driver or any connector.
