# PR #7 retrospective technical reviews

Reviewer: `/root/pr7_cycle_technical_review`, independent Codex subagent, correctness, security, recovery, and tests lens. These are my own retrospective reviews of the artifacts; the implementation preceded the D4 review gate. They do not imply prior approval, completion of D4, or live acceptance.

Reviewed Cursor branch commit: `da2fc8ccc0cdc4cd0493c16691d286309f513c9f`. Comparison base: current `origin/main` at `005419b63460540bfbb96400c46e7274a47af723`. The local `main` ref in the Cursor worktree was older, so I used `origin/main...da2fc8c` for the PR diff. The target artifacts are `docs/stories/run-cursor-cloud-job.md` and `docs/plans/cursor-cloud-job.md` at that commit; the code verdict covers its full 12-file PR diff. No files in the Cursor branch were changed during either review.

## Retrospective implementation-plan review: CLEAN

I read both plan artifacts (2/2), every Story acceptance criterion (8/8), technical acceptance criterion (7/7), and testing-strategy item (4/4). I checked all four plan areas: scope and interfaces, size and verification, integration with current main, and review/evidence. I compared them with `ARCHITECTURE.md`, `docs/delivery-plan.md`, `docs/designs/hosted-work-contract.md`, and the D4 Task. On a second sweep, I mapped each requirement back to the proposed prepare/start/get flow, failure and recovery behavior, permissions, documentation, and validation; no requirement was missed.

The plan preserves a client-generated agent ID before the single create call, saves the resulting run ID for exact retrieval, recovers ambiguous launch responses through reads, and refuses to choose among follow-up runs. It records that recovery cannot attest to an edited request, a finished provider turn is not an accepted worker result, and plan mode does not enforce read-only repository access. The planned CLI, library, guide, mocked lifecycle tests, offline help/prepare check, full repository suite, and separate live acceptance boundary cover this standalone outcome within the 20-file and two-day Story limits. It keeps queue claims, Jira publication, hosted storage, and worker integration outside this PR.

The hosted D2 runner contract additionally requires connection scope, durable attempt/request digests, observation records, and effect ownership. Those belong to later hosted slices; this retrospective verdict approves the standalone plan's fidelity to its stated outcome, not promotion of S03 to hosted delivery readiness. The plan's 17-file pre-integration estimate is historical; the actual PR diff has 12 files.

Plan findings: **none**. No unresolved in-scope correctness, security, recovery, or testing gap was found.

## Full committed-code review: CLEAN

I independently inspected the exact committed diff against `origin/main`, all 12/12 changed files:

1. `AGENTS.md`
2. `ARCHITECTURE.md`
3. `README.md`
4. `docs/cursor-cloud.md`
5. `docs/plans/cursor-cloud-job.md`
6. `docs/stories/run-cursor-cloud-job.md`
7. `package.json`
8. `scripts/cursor-cloud.mjs`
9. `src/index.js`
10. `src/runners/cursor-cloud.js`
11. `test/cursor-cloud-cli.test.js`
12. `test/cursor-cloud.test.js`

I checked the same 8/8 Story acceptance criteria, 7/7 technical criteria, and 4/4 testing-strategy items against the committed behavior. The second sweep reconciled the changed-file list with `git diff --name-only origin/main...HEAD`, then traced offline preparation, saved request identity, one POST, conflict/timeout/unreadable-response recovery, exact and agent-only GET, six run statuses, malformed and blank final results, CLI JSON/exit behavior, credential redaction, optional repository authority, and documentation claims. I also checked that this runner remains separate from the GitHub queue and coding daemon. The [Cursor v1 reference](https://cursor.com/docs/cloud-agent/api/endpoints) documents create with an initial run, List Runs with `limit` and `nextCursor`, Get Run by exact ID, and a final result string for terminal runs. The saved marker probe did not exercise List Runs; the guide states that limitation.

The code keeps the API key in the authentication header, fixes the API origin, rejects redirects, limits request fields to the supported plan-mode shape, and avoids printing upstream error bodies. It makes no replacement create after an uncertain launch. Multiple runs require an exact run ID; an unresolved launch preserves the agent ID. A `FINISHED` run with no nonblank reply raises `invalid_response` instead of reporting usable completion. The CLI turns errors into structured stderr JSON and a nonzero exit while keeping active runs observable.

Verification at the reviewed SHA: `node --test test/cursor-cloud.test.js test/cursor-cloud-cli.test.js` passed 22/22; `npm test` passed 239/239; `git diff --check origin/main...HEAD` passed. These are local tests, not hosted CI or live acceptance. No new paid Cursor run, repository access test, or second-user visibility test was performed. The existing marker-only API probe predates this implementation and does not validate the new CLI or runner in production.

Code findings: **none**. No unresolved in-scope regression, access leak, duplicate-launch risk, or false completed-result path was found. One test-quality observation does not change the verdict: `test/cursor-cloud-cli.test.js` uses a stubbed `FINISHED` result with `null` solely to check CLI exit mapping; the real runner rejects that response, and the provider test covers its validation.

## Independent seven-principle assessment

| Principle | Plan assessment | Committed-code assessment |
| --- | --- | --- |
| Intuitive | Prepare, start, and get name the operator's steps, and the plan distinguishes an ended turn from accepted work. | Humans see status and recovery guidance; agents receive explicit status, terminal flag, and IDs without learning queue internals. |
| Discoverable | Planned help, model discovery, examples, and safe errors cover setup and recovery for a new user. | The CLI exposes `--help` and `models`; JSON error codes and saved IDs give an agent a noninteractive next step. The guide explains normal use and uncertain launches. |
| Delightful experience | Reusing the saved ID avoids asking a person to repeat a possibly completed paid task. | Timeout and conflict paths use reads to recover existing work without automatically sending another prompt. |
| Token saver | Direct provider reads and explicit JSON avoid a model deciding the recovery path. | Exact retrieval needs one GET; structured results put status and IDs together, while the guide supplies detail only when needed. |
| Secure | The plan excludes request-file credentials and unsupported tool/session inputs, and requires authorization for possible repository writes. | The key is sent only to the fixed Cursor API origin; redirects and unsupported request fields fail closed. Error output omits upstream bodies. Plan mode is honestly described as insufficient to enforce source read-only access. |
| Agents are equal | Library and JSON CLI provide explicit noninteractive inputs; the human guide provides readable commands and examples. | Both interfaces can prepare, start, and retrieve without browser prompts. Humans can inspect the returned Cursor URL; agents get stable fields and exit codes. |
| Dependable | The plan retains identities across uncertain launch, treats missing reads as unresolved, and prevents follow-up confusion. | Tests cover single POST, read-only recovery, ambiguous multiple runs, malformed responses, and all documented statuses. Missing or blank finished replies fail instead of masquerading as success. |

Both CLEAN verdicts apply only to the exact artifacts and commit above. They do not authorize merge or release, settle D4's hosted provider mapping, or establish live repository, teammate, or meaningful-work acceptance.
