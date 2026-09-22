# Run a Cursor cloud job

Ski Stack can prepare, start, and retrieve a single Cursor cloud job through
the CLI or JavaScript library. This first runner supports plan mode and one
optional GitHub repository. It does not connect the job to a Kanban ticket or
run the existing GitHub/Codex daemon in the cloud.

Use Node.js 20+ and a Cursor API key supplied as `CURSOR_API_KEY` by your shell
or secret manager. Do not put the key in the prompt, request file, CLI arguments,
or source control. Model usage is billed by Cursor under the account's rules.
The `start` examples below launch a billable agent; use them only with an
authorized account and bounded task. The company-account pilot permits only
trivial checks, and the existing marker-only probe does not validate this
implementation.

To verify the CLI without launching a cloud agent, run the offline help and
prepare commands in the [implementation plan](plans/cursor-cloud-job.md), then
run `node --test test/cursor-cloud-cli.test.js test/cursor-cloud.test.js` for
mocked `start` and `get` behavior.

## First run

Discover the current model IDs and their parameters:

```bash
npm run --silent cursor -- models
npm run --silent cursor -- models --model gpt-5.6-sol
```

Put a short question in `question.txt`. For a trivial connectivity check use
`Reply exactly SKI_STACK_CURSOR_PROBE_OK. Do not use tools or do other work.`

Prepare a request **once** and save it outside the repository:

```bash
npm run --silent cursor -- prepare \
  --prompt-file question.txt \
  --model gpt-5.6-sol \
  --param reasoning=none \
  --name "Ski Stack test" > /tmp/ski-cursor-request.json
```

Preparation is offline. It generates the `bc-<uuid>` agent ID before any model
work starts. Treat that saved request as immutable. Preparing again generates
a new ID and means a deliberate new job. Changing the prompt while retaining
an old ID does not replace the original job; duplicate recovery returns existing
work and cannot prove that it matches an edited request.

For repository work, add both `--repo https://github.com/OWNER/REPO` and
`--ref COMMIT_OR_BRANCH` when preparing. Cursor needs its own access to that
repository. A commit pins the exact revision; a branch can move before launch.
Repository access has not been verified by the current no-repository probe.
Cursor can write or push a branch under the connected account's permissions.
Plan mode and `autoCreatePR: false` do not enforce read-only source access.
Use only a repository and task whose possible source writes are authorized.

Start the saved request:

```bash
npm run --silent cursor -- start --request /tmp/ski-cursor-request.json
```

The returned JSON includes `agentId`, `runId`, `url`, `status`, `terminal`,
`result`, and `disposition`. Save the IDs. Initial status may be `CREATING` or
`RUNNING`; there is no automatic wait loop or follow-up prompt.

Retrieve the exact run from any process or machine with authorized API access:

```bash
npm run --silent cursor -- get --agent-id bc-YOUR_UUID --run-id run-YOUR_UUID
```

`get` never starts a model. Poll at a reasonable interval while the run is
active. If you only have the saved agent ID, omit `--run-id`: Ski Stack reads
the agent's run list and accepts exactly one run. If someone added a follow-up
in Cursor, it asks for the original run ID instead of silently reading a
different answer. The returned URL opens the same agent in Cursor for inspection.

## Timeout and duplicate recovery

A launch timeout does not prove failure. The live probe's create request timed
out while Cursor accepted and completed the job.

`start` sends one create request. On a transport/server failure, unreadable
success response, or `409 agent_id_conflict`, it attempts read-only recovery
under the same agent ID. A recovered result has `disposition: "recovered"`.
It never automatically retries a POST or chooses a replacement ID.

If reads cannot resolve the launch, the error includes `agentId`,
`recoveryRequired: true`, and `recoveryCode`. Use `get` with that ID; a run may
not be readable immediately. If `get` reports `ambiguous_run`, use the original
`runId` from a saved receipt if you have one. Otherwise inspect the agent in
Cursor with an authorized account and ask the run owner to establish the
original run ID. If it cannot be established, leave the launch unresolved;
never select a follow-up run by position or create a replacement job. If you
deliberately retry creation after investigating, use the same unchanged saved
request and ID. Do not rerun `prepare` as a retry.

Status is run-level, not agent-level:

| Status | Meaning |
| --- | --- |
| `CREATING`, `RUNNING` | Work is active; `terminal` is false. |
| `FINISHED` | The turn ended; inspect `result` and validate the answer. |
| `ERROR`, `CANCELLED`, `EXPIRED` | The turn ended unsuccessfully; the CLI returns exit code 1 with the result JSON. |

Command errors are JSON on stderr with exit code 1. Successful
`prepare`/`start`/`get`/`models` commands return JSON on stdout with exit code
0, including pending runs; help is plain text. A provider's finished
turn is not human acceptance or permission to advance a ticket. Plan mode and
`autoCreatePR: false` are not enforced read-only repository permissions.

## Library use

```js
import { CursorCloudRunner, prepareCursorRequest } from "ski-stack";

const runner = new CursorCloudRunner({ apiKey: process.env.CURSOR_API_KEY });
const request = prepareCursorRequest({
  prompt: "Reply exactly OK without using tools.",
  model: { id: "gpt-5.6-sol", params: [{ id: "reasoning", value: "none" }] }
});
// Persist request in the caller's durable store before this call.
const receipt = await runner.start(request);
// Persist receipt.runId, then retrieve it later without launching again.
const result = await runner.get({ agentId: receipt.agentId, runId: receipt.runId });
```

In a repository checkout, import from `./src/index.js`. The default HTTP timeout
is 30 seconds; the constructor accepts `timeoutMs` from 1 to 120000. No secrets
are sent to the cloud agent's environment. No local state directory, service,
queue, or recurring automation is provisioned by these commands.

## Evidence and remaining work

[Live API evidence](pilots/cursor-api-probe-result.json) records one trivial
no-repository run, timeout recovery, duplicate rejection, and the final marker.
The production runner's regression tests use mocked API responses, including
ambiguous multi-run recovery. We have not run another paid agent to test this
implementation. Billing counters were zero on two reads and are not final cost
evidence.

Jira routing/publication, hosted ownership and storage, repository/teammate
access, cancellation, additional modes, and production credential provisioning
remain later slices. The contributor Story-size rules guide our development;
they do not constrain customers' prompts or workflows.
