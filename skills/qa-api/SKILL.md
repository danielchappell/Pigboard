---
name: qa-api
description: Execute and assess prescribed API QA cases using the exact skills and prepared requests named in the ticket. Report requirement-based evidence or a blocker without designing tests or repairing setup.
---

# Prescribed API verification

Execute the supplied acceptance cases. Reason about responses, record identity,
causality and evidence; do not choose cases, invent expectations or discover another
way to test. The implementer prepares execution artifacts and the reviewer checks
them against the ticket. A response or implementation claim is not the expectation.

## Required handoff

Before any request, require:

- Ticket/requirement reference and version; case IDs, exact skill identifiers,
  ordered steps, explicit expected status/body/behavior and required evidence.
- Reviewed PR/source revision and current ready environment/deployed revision;
  approved lower-environment URL, identity/tenant, permitted actions and test data.
- Prepared request/assertion artifacts at the reviewed revision, exact request
  selection and supplied parameter/returned-ID bindings. Each required downstream
  observation names its skill, artifact and position in the case sequence.
- Prepared access/tooling, a private evidence destination and prescribed cleanup
  (or explicit none). Any asynchronous observation has a finite supplied schedule
  and deadline; do not invent retry or polling behavior.

Missing, ambiguous, contradictory or stale required inputs mean BLOCKED before
execution. Inspect the supplied requirements/artifacts for coverage and consistency;
do not search for missing routes, schema, credentials, tests or substitute tools.
A mismatch between the prescribed test and the requirement is a blocker, not
permission to rewrite the test or weaken the requirement.

## Execute and assess

Invoke only the skills named for these cases, in the prescribed order. If
`qa-bruno` is named, it runs the prepared requests. If another approved execution
skill is explicitly named, follow that selection; do not fall back to it after a
failure. A missing selected skill blocks. Database/event observations are required
only where prescribed; missing necessary downstream evidence blocks the claim,
rather than authorizing new database/event testing.

Inspect resolved destinations, identity scope and supplied request scripts before
execution. They cannot expand permitted actions or destinations. Wrong targets,
unexpected redirects or uncertain authentication block; do not reinterpret their
responses as product evidence. Expected permission rejection is judged against the
case and can PASS. Unexpected inability to establish the prescribed identity/access
is a blocker; a demonstrated permission defect under the verified identity is FAIL.

Match meaningful assertions to the requirements, not just HTTP success. Correlate
returned identifiers, tenant and run window using supplied bindings. A 202 or job
status can prove acceptance without proving downstream completion. A preexisting
row/object cannot prove a new action. Preserve initial responses and distinguish
live execution from supplied receipts or mocks. Do not claim stronger evidence
than the observations support.

Verify that the exact selected requests and assertions ran. Zero assertions,
missing execution evidence or an unexecuted required step cannot produce PASS.
Retain actual observed mismatches; do not repair requests, assertions, fixtures,
credentials, deployments or product code.

## Results and stopping

Return every supplied case ID with its status, requirement/expectation source,
expected versus actual outcome and evidence references. Include sanitized method,
path and input, identity/tenant label, status/body assertions, timestamps/elapsed
time, correlation IDs, exact request artifact and source/deployed revisions.
Keep credentials and unnecessary personal data out of shared evidence.

- **PASS:** all prescribed steps and necessary assertions/evidence for this case
  are complete and satisfy the supplied expectations.
- **FAIL:** execution against verified prerequisites demonstrates a requirement
  mismatch. Continue only remaining independent prescribed cases; mark dependent
  cases NOT RUN when the failed behavior prevents their prerequisites. Never count
  those cases as passed. A defect-caused dependency skip alone does not turn FAIL
  into a setup blocker.
- **BLOCKED:** a prerequisite, test artifact, required evidence or scope decision
  prevents valid execution/assessment. Stop the job, retain prior defects/evidence,
  and mark all remaining cases NOT RUN. BLOCKED takes precedence over FAIL.

Do not retry failed operations, replay an uncertain write, poll after a blocker,
start recovery agents or improvise a workaround. Only already prescribed bounded
observation steps and authorized bounded cleanup are allowed; cleanup is not a
license to fix the environment. Record partial/uncertain actions and unconfirmed
cleanup, the precise human action needed and the intended resume point, then stop.

Return case results and an aggregate PASS/FAIL/BLOCKED for this assigned set, with
coverage counts and unexecuted case IDs. The QA entry point owns the whole-ticket
report and Jira transition. This skill does not approve a PR, merge, deploy or
move a ticket. New revisions or changed requirements invalidate affected evidence;
do not silently reuse results for different inputs.
Recheck the supplied requirement and source/deployed revisions before returning
success. If they changed, return BLOCKED for a fresh handoff rather than testing a
different revision or declaring stale evidence passed.
