# Cursor cloud job: first delivery slice

## Decision and scope

Implement the [Story](../stories/run-cursor-cloud-job.md) as a standalone provider
runner and a usable CLI. The [live probe](../pilots/cursor-api-probe-result.json)
establishes authentication, stable agent IDs, lost-response recovery, duplicate
rejection, and final-result retrieval. Current repository code keeps queue
selection in `src/core/availability.js`; the GitHub coding worker also owns
local worktrees and Codex execution. Neither needs changing for this slice.

The caller saves a prepared request before `start`. Its agent ID is the durable
provider lookup key. `start` sends at most one create request; ambiguous errors
and the documented duplicate conflict lead to reads only. Save the returned run
ID for exact retrieval. Without a run ID, retrieval accepts only an agent with
one run, so an external follow-up cannot silently replace the original result.
The manual caller must keep the saved request unchanged. Recovery by agent ID
cannot prove that an edited prompt, model, repository, or ref matches the
original provider request. A recovered run is the work already associated with
that ID, never an attestation of the current file's contents. Content-digest
binding belongs to the later hosted application slice.

The library and CLI use explicit inputs and JSON outputs. They do not create a
local scheduler or work-item authority. No Jira transitions, hosted coordinator,
claim integration, follow-up conversations, cancellation, or new deployment is
included. A provider's finished turn is not a validated worker result or human
acceptance. Repository access is optional and remains live-unverified.

## Size and validation

Estimate: one to one-and-a-half human working days including tests, review, and
PR preparation. The scope is two implementation files, two test files, exports,
one package command, usage/story/plan docs, and the eight existing approved
guidance/discovery files: 17 changed files before any architecture clarification.
The hard limit remains 20. No external service or new dependency is needed.

Use Node's test runner with injected provider responses, including the observed
create timeout and `409 agent_id_conflict`. Verify the real command entry point
and a fresh client reading the same stored run. Run the full existing suite once
the focused checks pass. Use only the completed trivial cloud probe as live
evidence; do not run substantive work on the company Cursor account.

Offline manual verification uses only help and prepare; neither calls Cursor:

```bash
npm run --silent cursor -- --help
printf 'Reply exactly SKI_STACK_CURSOR_PROBE_OK.\n' > /tmp/ski-cursor-qa-prompt.txt
npm run --silent cursor -- prepare --prompt-file /tmp/ski-cursor-qa-prompt.txt --model gpt-5.6-sol --name 'Offline QA' > /tmp/ski-cursor-qa-request.json
```

Inspect the request's stable `agentId`. Verify the `start`/`get` command flow
with `node --test test/cursor-cloud-cli.test.js test/cursor-cloud.test.js`:
those tests inject mocked provider responses and do not launch a cloud agent.
A new live `start`/`get` acceptance pass is separate and requires an authorized
account, bounded task, repository grant if used, and cost allowance; record
provider IDs and result when that authority exists. The saved marker-only probe
does not count as a live acceptance test of this implementation.

For optional repository work, plan mode and disabled automatic PR creation do
not enforce read-only source access. Cursor may write or push a branch under
the connected account's permissions. The manual operator must authorize the
specific repository and task before launch; the current no-repository probe
does not verify that access.

## Seven-principle assessment

| Principle | Plan assessment |
| --- | --- |
| Intuitive | Prepare, start, and get are explicit actions; a lookup never starts paid work. |
| Discoverable | CLI help, model discovery, a runnable example, and structured errors explain supported inputs and recovery. |
| Delightful experience | Recovery reuses the saved ID and avoids making users repeat a completed prompt. |
| Token saver | Routing and recovery use deterministic code; no model decides which API call to make. |
| Secure | Fixed HTTPS API origin, rejected redirects, no keys in request files, and sanitized errors keep credentials out of outputs. Repository write authority is an operator gate before optional repo-backed work; plan mode is not that gate. |
| Agents are equal | The exported runner and JSON CLI expose the same lifecycle without interactive prompts. |
| Dependable | Read run-level states, retain IDs after failures, reject ambiguous multi-run recovery, and never infer failure from a lost create response. |

## Retrospective integration plan for current main

PR #7 was written from `5e48c3def05fa8dc840d51ae6683113b9faa0ba2`;
current main includes the reviewed workflow-profile slice at
`005419b63460540bfbb96400c46e7274a47af723`. Merge current main into this
branch without rewriting its commits. Retain main's product definition,
development rules, Jira discovery records, and offline profile feature. Combine
the README's profile and Cursor instructions, both package commands, and both
public exports. Retain the new runner, CLI, tests, guide, Story, and this plan.
The standalone Cursor command stays separate from hosted ownership/Jira work.

Check the resulting diff against the actual PR base: all code, tests, docs and
conflict-resolution changes together must stay at most 20 files and under two
human working days. Run offline help/prepare, the 22 focused mocked checks,
then the full repository suite; check links, whitespace and the final diff.
The repository has no hosted CI workflow, and these checks do not replace an
authorized repository-backed or second-user live test. After committing the
merge result, obtain two fresh independent reviews of that exact committed
code, including every changed file and the seven principles. Fix and re-review
real in-scope findings before updating PR #7.

## Review and evidence

At the original PR tip `3df1eab7f931284ca4204edb2d67ac8ccf98fba5`, the
diff against former main `5e48c3def05fa8dc840d51ae6683113b9faa0ba2`
changed 18 files and the author reported 220 passing tests, including 22
runner/CLI checks. These are historical pre-merge figures.

After integrating current main, merge commit
`6ebf7d65168543cbce8b3fe666f2985559a0a13f` changes 12 files against
`005419b63460540bfbb96400c46e7274a47af723`. At that commit, 22 focused
and 239 full repository tests pass; the offline Cursor help/prepare commands
and the retained workflow-profile preview work. Six changed documents have no
missing relative links, and whitespace checks pass. The original checkout and
its uncommitted work remain untouched. No credential was committed, no new
cloud run was launched, and no hosted CI workflow exists in this repository.
Local tests and the marker-only probe are distinct from live acceptance.

The original author reviewed the earlier implementation and found no remaining
in-scope issue. That historical author assessment does not substitute for fresh
independent review of the final committed code.

| Principle | Implementation review |
| --- | --- |
| Intuitive | The tested prepare/start/get flow preserves the saved request and returns the same provider IDs to a fresh client. |
| Discoverable | The npm entry point exposes help, model lookup/filtering, and structured errors with IDs and recovery instructions. |
| Delightful experience | Timeout and conflict tests recover existing work without requesting another prompt or creating another agent. |
| Token saver | Recovery uses bounded HTTP reads, and exact retrieval needs one request; all regression testing is local. |
| Secure | Tests reject extra tools/session credentials, inherited request fields, and embedded repository credentials; reflected API keys and provider error text do not leak. |
| Agents are equal | Library and CLI use explicit inputs and JSON results without browser or terminal prompts; CLI error and exit behavior is tested. |
| Dependable | Tests cover all six run states, malformed responses, unresolved launch identity, duplicate conflicts, and external follow-up ambiguity. |

Remaining boundaries are unchanged: repository access and shared visibility are
not live-verified, plan mode is not an enforced read-only permission, callers
must retain immutable request/run identities, and Jira/hosted coordination are
later slices. The completed marker-only probe is provider-contract evidence;
the new implementation was verified with mocked responses, not another paid run.
