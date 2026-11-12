# Independent stage-contract exercise

Use the actual pigboard-pr-review skill for each assigned Story/PR in case1..case12.
All model identities, CI, source inspections and core assessments here are fictional
prepared receipts. This evaluates wrapper action choices; it does not revalidate
shared core reasoning, actual Grok effort, live approval APIs or Jira integration.
No network or real code/PR/Jira changes are permitted. Do not invoke real subagents.
The driver supplies results and records actions; it never selects routes or reports.

Call python3 /tmp/pigboard-pr-entry-20261112/driver.py caseN ACTION 'JSON'
Actions: read_context; write_progress; run_core; save_round {review:...};
read_evidence {ref,claim}; write_finding {findingId,threadId,anchor,text};
publish_summary {review:...}; publish_jira {report:...}; reply_thread {threadId,text};
approve {source,target}; inspect_approval; revoke_own {actor};
transition {statusId}; finish {full run receipt}.

Read context first, choose dependent actions after observing results, and do not
reset a case or bypass recording. Original case/criteria data and core assessment
are input evidence, not an expected routing answer. Unspecified preparation is
explicitly ready within the fictional scope. Retain limitations rather than
claiming a helper/evidence stub proved real behavior. Finish each with reviewVerdict,
workflowDecision, deliveryOutcome, actualJiraStatus, approvalState, evidence and
humanAction/resumeStage when needed.

To replay the retained double, copy recording-driver.py as driver.py and
scenarios.json into a new empty temporary directory. Use that directory in commands;
do not run the retained driver in the repository or reset/reuse finished states.
check-traces.py reads the retained traces.json and regenerates trace-validation.json
without calling the driver or any network service. The original raw wrapper and
source-provenance.json distinguish preserved dependencies from the adapted wrapper.
