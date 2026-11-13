# Cursor webhook and stop test

Observed 13 November 2026, Europe/Madrid. Exactly two synthetic HTTP requests were
sent to one isolated automation. No Jira rule or delivery automation was enabled.
No database was created or added to the MVP.

## Current workstream decision

There is one Cursor automation per worker type: implementer, reviewer and QA.
Daniel's worker routing matches the `AI-Daniel-` family; the full label, such as
`AI-Daniel-1`, identifies a separate sequential stream. The number does not select
a different Cursor automation. Retain the full label for correlation.

The future deterministic admission script selects new work without AI. One ticket
holds its stream until Human Review. Other streams may run independently after a
human verifies their work will not conflict. The script does not schedule rework.
No new-work scheduler was built or activated during this test. Existing Jira rules
and board filters still use exact `AI-Daniel-1`; family matching remains to be wired.

## Test configuration

Automation `5b14a3ea-df99-11f1-ba91-f63b1661ac50`, named
**Pigboard · bounded webhook probe · 2026-11-13**. No repository or connected tools;
Memories removed. Default model Grok 4.7 High Fast was used only for this probe.
The delivery models, skill prompts and environment were not changed.

The instruction allowed only reporting synthetic payload values and any explicitly
available IDs, then one local `sleep 90` and a final `PROBE_FINISHED`. It forbade
repository/provider/secret access, edits, publication, subagents and retries.
Both transcripts reported the event/workstream correctly and IDs as unavailable.
Each was visibly running its single sleep command when stopped.

The owner separately approved the temporary webhook key and exactly two requests.
The key passed through a local password field to an in-memory test helper; it was
not printed or saved. The helper imposed a two-attempt limit, no retries, a finite
HTTP timeout and a fixed destination. It cleared its key after the second request
and was stopped afterward. Clipboard contents were replaced with the public probe
endpoint. No password-manager save was requested. The probe remains saved inactive;
disabling it is not a claim that its generated key was revoked.

## Response and duplicate results

Both requests used identical JSON and Content-Type, with no Idempotency-Key header:

```json
{"schema":"pigboard.transport-probe.v1","eventId":"pb-20261113-duplicate-01","workstream":"AI-Daniel-1","testOnly":true}
```

| Attempt | Sent / response, Madrid | HTTP | Returned backgroundComposerId |
| --- | --- | --- | --- |
| 1 | 20:38:56.658 / 20:38:58.020 | 200 | `bc-0e99bd95-31a8-43e3-a66e-968b0a4e8166` |
| 2 | 20:39:14.949 / 20:39:28.736 | 200 | `bc-500fe9f4-b3b1-44ce-b20b-d515c04e6465` |

Response shape:

```json
{"success":true,"backgroundComposerId":"bc-..."}
```

The response contains an agent identifier, not a distinct API run ID. It has no
Location header; each request had a different x-request-id. The
[raw nonsecret receipts](../config/cursor/webhook-probe-20261113.json) retain exact
bodies, request IDs and UTC timestamps.

The two responses led to two distinct agents, each displaying the same event ID.
Thus identical payloads/event IDs did not suppress repeated execution in this
test. This does not test an undocumented idempotency header, simultaneous delivery,
network failure or Jira's retry behavior. No exactly-once claim is supported.

## Stopping work

Opened each returned agent and clicked **Stop generation** while its sleep was
running. The active Stop control disappeared and the composer returned to **Send
follow-up**. Neither transcript produced the final `PROBE_FINISHED`. The automation
history displayed exactly two terminal **Failed** entries, with no running entry.
Do not relabel that observed UI result as an API `CANCELLED` receipt. This verifies
the manual stop path, not termination of arbitrary background processes or children.
The probe had no children or provider writes to reconcile.

For deterministic cancellation, Cursor's [API documentation](https://cursor.com/docs/cloud-agent/api/endpoints#cancel-a-run)
describes `POST /v1/agents/{id}/runs/{runId}/cancel`. It requires API authentication
and both identifiers. Its documented result is terminal CANCELLED; subsequent work
requires a new run. The documented Get Agent/List Runs APIs can supply run identity.
API visibility/credentials for these automation-created agents and the cancel API
were **not tested**. The automation webhook key was used only for the two approved
trigger requests. No new general Cursor API key was created.

A future stop action must retain the returned agent ID, resolve the actual run,
request cancellation and read back terminal state before restarting. Sending a
new request to the existing automation webhook starts another agent; it is not a
stop command. Stopping does not undo completed provider writes. Do not retry an
uncertain launch or resume while an old run may still be working.

## State and remaining work

The probe is inactive. Implementer, reviewer and QA were each rechecked inactive
with zero runs after the test. Jira rules were not edited or invoked. No Jira/
Bitbucket access or real ticket delivery was exercised. Screenshots of the stopped
agents and inactive two-run history are retained in the operator evidence folder.

Keep a database outside this MVP. Before delivery acceptance: finish runtime Jira
access, retain launch IDs, decide the minimal duplicate-response procedure and
verify API cancellation if automated stopping is required. A status check reduces
stale work but cannot prevent two simultaneous copies from both starting. Do not
claim guaranteed duplicate exclusion from comments or run markers alone.
