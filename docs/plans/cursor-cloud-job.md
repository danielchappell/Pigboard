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

## Seven-principle assessment

| Principle | Plan assessment |
| --- | --- |
| Intuitive | Prepare, start, and get are explicit actions; a lookup never starts paid work. |
| Discoverable | CLI help, model discovery, a runnable example, and structured errors explain supported inputs and recovery. |
| Delightful experience | Recovery reuses the saved ID and avoids making users repeat a completed prompt. |
| Token saver | Routing and recovery use deterministic code; no model decides which API call to make. |
| Secure | Fixed HTTPS API origin, rejected redirects, no keys in request files, and sanitized errors keep credentials out of outputs. |
| Agents are equal | The exported runner and JSON CLI expose the same lifecycle without interactive prompts. |
| Dependable | Read run-level states, retain IDs after failures, reject ambiguous multi-run recovery, and never infer failure from a lost create response. |

## Review and evidence

The implementation changes 18 files including the approved contributor/product
guidance and discovery evidence. The original checkout and its uncommitted work
are preserved; implementation uses an isolated branch from main `5e48c3d`.

Validation: all 220 repository tests pass, including 22 new runner/CLI checks.
The real npm help command works without credentials. Local links, whitespace,
saved API evidence, and the changed-file count were checked. No credential is
stored in the changed files. No additional cloud run was launched. There is no
repository CI workflow in this checkout; local tests are not a hosted CI claim.

The author reviewed the implementation and found no remaining in-scope issue.
This is an author review, not an independent review verdict.

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
