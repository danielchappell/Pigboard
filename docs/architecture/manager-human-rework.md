# A human requests rework through their assistant

Owner decision D03, 14 November 2026. Proposed skill identifier: `request-rework`.
This is a delivery requirement, not an installed skill or another Cursor automation.

The human reviews A's open PR in Human Review and tells their assistant what needs
fixing. The skill records that request and moves A to Rework Queued. If B is active,
B continues. The manager later admits A under the normal priority/capacity rules.

## Separate responsibilities

- `write-pr-sized-stories` creates or revises the Epic/Story/Bug specification.
- `request-rework` records an explicitly authorized in-scope repair on an existing
  open PR and performs Human Review → Rework Queued.
- Both use the canonical work/handoff definitions, validation helpers and
  `human-writing`. No parent orchestration skill or large new authoring suite is
  required. The requesting human remains responsible for the finding and scope.
- The manager neither infers rejection from discussion nor performs this initial
  human-requested move. Its later parent-repair cascade remains a separate action.

## Input and bounded sequence

The human supplies the ticket and concrete findings, expected behavior and relevant
evidence. Existing trusted configuration supplies the Jira site/project/actor,
repository/tool access and the permitted directed transition. The skill uses the
human's existing assistant and prepared integrations, not a new identity or service.

1. Read the ticket's native Human Review status, structured requirements, current
   admission pointer and exact completed QA/review/implementation references.
2. Check that the supplied findings concern that ticket's scope and its still-open
   PR, and that the current PR revision matches the completed evidence. Missing
   integrations, incomplete/edited/conflicting records, changed scope/revision or
   a closed PR stop before publication with a useful explanation. Broader work
   returns to human grooming; the skill does not create a multi-PR repair or Bug.
3. Prepare the existing `repair_request` handoff: human-request role, current
   assignment and requirements digest, affected PR/revision, stable finding IDs,
   evidence and the completed QA basis. The human's explicit request authorizes
   publication and queueing; do not ask them to drag a card afterward.
4. Recheck the source status, assignment, requirement digest and PR revision before
   publication. Publish one new comment and verify its content/server metadata.
   Recheck current inputs before sending the configured directed transition once.
5. Report the request/comment reference and confirmed destination. If the result
   is uncertain, report the known publication/transition state and stop without
   replay, starting implementation or making a competing transition.

This producer uses the existing human-request actor mapping and handoff envelope;
it does not write DynamoDB, replace the admission pointer or claim exclusive run
ownership. Shared identities remain a trust limitation. Ordinary comments do not
become requests. Discussion without a request to queue stays in Human Review.

If the ticket is already queued, inspect and report the existing request rather
than sending another transition. Conflicting/additional findings require an
explicitly prepared request covering them; do not silently drop or overwrite earlier
findings. The consumer already preserves all unresolved requests. Repeated assistant
invocations are not promised exactly-once deduplication.

## Required acceptance

- A valid human request queues A with its exact current PR/assignment, while active
  B is untouched; the manager later selects A when all normal admission gates pass.
- Discussion alone makes no write; an explicit request completes without a manual
  card drag, extra automatic worker, changed requirements or model-built plan.
- Wrong stage, closed/wrong PR, changed revision/requirements, untrusted actor,
  missing access/evidence or scope growth yields no queue transition.
- Publication success followed by an uncertain transition retains its receipt and
  reports uncertainty; no repeated comment or transition is attempted automatically.
- Existing queued work is not transitioned again, prior findings stay available,
  and this skill cannot unblock, merge, implement or touch other tickets/PRs.

The implementation Story must include the skill, shared-validator integration,
bundle installation and human/agent usage examples. It is separate from the deferred
human-unblock producer and from the pipeline that supplies PR environments.
