# Recording connector fixture boundaries

These six invocations are fictional, isolated skill evaluations. The recording
connector has no network access and cannot touch Jira, a PR or a real application.
`read_context` combines current ticket, PR, preview, ownership and transition
reads. `call_skill` returns scripted helper observations; it does not run Bruno,
PostgreSQL or a browser. `read_evidence` returns scripted artifact receipts.

For this fixture, every `reviewed://` reference denotes an already reviewed,
prepared, permitted synthetic execution artifact at `head-a`, with the case's
stated expected result, actor, data and scope. These are fixture preconditions,
not real executable files or proof of helper access. Runtime helpers and screenshot
retention have separate local validation records. `fixture://` references are
simulated reviewer-accessible evidence and reports, never real remote URLs.

The evaluator owns dispatch, interpretation, report content and choice of target
status. The double records these decisions and replies; it does not calculate the
QA verdict or select the next step. Mutable state lives only under
`/tmp/pigboard-qa-entrypoint-20261112/`. Traces are retained here after execution.
Changing simulated status is not a live Jira transition.

Driver operations:

- `read_context`: fresh input and current simulated state.
- `call_skill {stepId, skill}`: execute the assigned top-level helper abstraction.
- `read_evidence {ref}`: retrieve a scripted evidence receipt.
- `publish_ticket {report fields}`: record the proposed report or return a write failure.
- `ensure_pr_link {report}`: record a simulated PR access receipt.
- `transition {statusId}`: attempt the selected simulated transition; may return an uncertain result.
- `finish {final result}`: retain the evaluator's verdict, delivery state and limitations.

The local evaluator has no authority to call real connectors for these fixtures.
No fresh Jira statuses, Cursor behavior, concurrency enforcement, credentials,
preview readiness or reviewer access are proven by this exercise.
