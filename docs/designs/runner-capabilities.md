# D4 runner capability decision

22 September 2026. Discovery and design for the first hosted researcher run.
This applies the reviewed [hosted work contract](hosted-work-contract.md) to
Cursor Cloud Agents and examines the existing [PR #7](https://github.com/danielchappell/ski-stack/pull/7).
It does not activate a provider, grant repository access, or approve that PR.
The first runner remains Cursor because the owner has authorized only trivial
checks on the company account and an existing implementation and marker-only
probe provide a narrow starting point. Codex is a separate candidate, not a
silent substitute for the chosen pilot.

## Evidence and limits

| Evidence | What it establishes | What it does not establish |
| --- | --- | --- |
| Saved [marker-only probe](../pilots/cursor-api-probe-result.json), 21 September | User-key authentication, model listing, client agent ID, a successful no-repository run, duplicate-ID conflict, and exact run retrieval on this account. | Repository access, teammate visibility, useful researcher output, cost at working scale, or safe source-write authority. |
| [Cursor v1 endpoints](https://cursor.com/docs/cloud-agent/api/endpoints), checked 22 September | `POST /agents` creates an agent and initial run; a supplied `bc-<uuid>` can return `409 agent_id_conflict`; `GET /agents/{id}/runs/{runId}` returns run status and terminal final-reply text. A follow-up creates another run and an active agent can reject it as busy. | Server-side matching of a repeated request body or exactly-once execution after an unknown network outcome. |
| [Cursor Cloud Agents](https://cursor.com/docs/cloud-agent), checked 22 September | Repository use needs an admin-connected source-control integration; agents clone and can push a separate branch. Cursor manages cloud VMs; run diagnostics are available through Cursor Cloud MCP. | That this team's connection has the required repository grant, or that plan mode prevents writes. |
| PR #7 at `3df1eab7f931284ca4204edb2d67ac8ccf98fba5`, 18 changed files | A standalone Node runner and CLI prepare, start once, recover with reads, retrieve a named run, validate response shapes, and redact the supplied key. Its author reports 220 local tests. | D2's hosted application contract, independent CLEAN review, hosted CI, or a repository-backed live test. The PR currently conflicts with main. |
| [OpenAI Agents API](https://developers.openai.com/api/docs/guides/agents-api/overview) and [hosted sandbox](https://developers.openai.com/api/docs/guides/agents-api/environments/openai-hosted), checked 22 September | A managed Codex harness can start durable sessions in an OpenAI-hosted environment and stream or receive events. The documentation shows Astra as a model example and separate API/container billing. | An approved account, repository checkout/write workflow, cost allowance, or the same ID and recovery semantics as Cursor. |

The Cursor documentation and saved probe are different evidence levels. API
documentation can change; the single probe confirms only its recorded requests.
Do not turn a missing or incomplete read into permission for a second create.

## Chosen first-run behavior

The hosted application owns the attempt, immutable input digest, launch effect,
credential reference, scope, and authorization. The Cursor adapter only maps the
[D2 runner operations](hosted-work-contract.md#board-and-runner-interface-boundaries):

| D2 operation | Cursor mapping and required outcome |
| --- | --- |
| `describeCapabilities` | Static versioned declaration: create one initial run with client agent ID; read an agent and exact run; read-only recovery from the saved agent ID; final-reply text transport. No claim of enforced read-only mode, cancel, automatic follow-up, or repository permission. Account-specific access is a separate inspection result. |
| `prepare` | Pure over saved attempt ID, immutable launch UUID, role/package version, profile digest, prompt, selected model, optional HTTPS repository and resolved 40-hex commit. Produce the exact provider body and canonical request digest. Persist the launch UUID with the attempt before preparation; never generate it while retrying. The standalone CLI may keep its random-ID prepare interface for existing users, but the hosted path must take this saved ID. |
| `start` | Use the saved request and one `POST /v1/agents` send grant. `autoCreatePR:false` and `workOnCurrentBranch:false` are explicit. `mode:plan` may guide the agent but gives no permission guarantee. Persist both agent and initial run IDs from a valid response. A conflict, timeout, broken response, or uncertain upstream error leads to observation, not another create. |
| `recover` | Read only by the original agent ID, then resolve exactly one matching initial run or return `missing`, `ambiguous`, or `unavailable` with a reason. Store the first discovered run ID. A later `latestRunId` or a newer follow-up is never substituted for the recorded run. A missing read is an observation, not proof that the create failed. |
| `get` | Read the recorded agent/run pair, validate both IDs and known native state, add observation time, mapped status, bounded result and explicit omission/truncation facts. Unknown status, identity mismatch, or oversized/unreadable result becomes attention. `FINISHED` means provider termination, not accepted researcher work. |

The service checks its saved request digest before any send or recovery. Cursor's
duplicate-ID conflict does not prove that the first request had the same prompt,
model, repository or commit. Recovering an existing agent after a local request
change must return a conflict; it must never relabel that agent as the new work.
The provider cannot grant the current-attempt slot or authorize publication.

For the first researcher role, use a single final reply containing only a JSON
object with `schemaVersion:1`, nonempty `answer`, arrays of `findings` and
`references`, `recommendedNextStep`, and `unresolvedQuestions`. Each finding has
nonempty `text` and `referenceIds`; each reference has an `id`, `url` or explicit
`source`, and a short `description`. Define exact length/count limits in S26's
reviewed implementation plan before a live run. The adapter preserves the bounded
raw final reply with the exact run identity; S26 parses and validates this shape,
checks binding to the stored input, and records `valid`, `question`, `invalid`,
or `stale`. Non-JSON, truncated, missing, or unsupported-version replies never
advance the ticket. A syntactically valid reference is not proof the source is
accurate; the human still accepts the findings.

## PR #7 reuse and retrospective assessment

PR #7's [Story](https://github.com/danielchappell/ski-stack/blob/3df1eab7f931284ca4204edb2d67ac8ccf98fba5/docs/stories/run-cursor-cloud-job.md)
and [plan](https://github.com/danielchappell/ski-stack/blob/3df1eab7f931284ca4204edb2d67ac8ccf98fba5/docs/plans/cursor-cloud-job.md)
describe a usable manual `prepare`/`start`/`get` command. That was an honest,
bounded standalone outcome. It preceded D2 and cannot count as a reviewed plan
for the later hosted S05 integration. The plan's no-scheduler/no-Jira boundary still
fits. Its wording that callers treat a saved request as immutable is not an
enforced match after `409`; D2 requires the application to persist and compare
the digest. This is a retrospective gap, not a claim that the existing CLI is
broken for its documented manual use.

Decision: use PR #7 as S03's independent, usable manual Cursor job outcome. It
has no hosted authority. Reuse request validation,
fixed API origin, key redaction, one-send behavior, exact-run retrieval, status
checks, and mocked API fixtures. PR #7 needs a retrospective independent
Story/plan review against its standalone outcome, conflict resolution against
current main, required tests and fresh independent reviews of the resulting
committed diff before it can be considered ready. Preserve its branch and work
within its 18-file scope; split if conflict work makes it exceed 20 changed
files or two human days. This order provides an operator-visible, recoverable
provider command first. S04 can then save and inspect an existing run under
shared scope without starting one. S05 is the first hosted launch: it must
atomically reserve the current attempt and send intent before using a D2
prepare/start/recover/get facade over the PR #7 code. That facade adds stable
hosted preparation, scoped connection handling, observation fields and digest
binding. Size S05 from real files after D1/D3 and split it into complete usable
outcomes if it cannot fit one PR; never move a live send ahead of its store.
Historical author tests and this design review do not approve PR #7 code.

## Repository, team, and authority gates

| Gate | Current state | Evidence needed before live use |
| --- | --- | --- |
| Repository read and pinned revision | Unverified on this account. The standalone CLI accepts a nonempty ref; the hosted profile requires an immutable 40-hex commit. | Admin confirms the intended GitHub connection and permitted repository. One trivial, authorized repository-backed read at a pinned commit verifies checkout; no substantive company compute. |
| Source writes and PR creation | Cursor can push branches according to docs. Researcher code writes are outside this first role's authority; plan mode alone does not enforce them away. | Verify an enforced source-write restriction before calling a repository-backed researcher read-only. A disposable repository plus effect inspection only bounds a trial's risk and detects observed writes; it cannot prove or enforce read-only operation. Keep auto PR disabled. |
| Second-user visibility | Cursor's agent URL and team UI exist, but the saved probe used a personal key. | A second authorized non-admin confirms run/status/result access without sharing the API key; record denied paths and audience scope. |
| Meaningful researcher task | Not authorized on the company account. The marker reply is insufficient. | An appropriate account and budget authorize a bounded repository-backed task, result-shape check and cost record. |
| Provider completion to stage success | No validated researcher result has been observed. | S26 parser, binding tests and human acceptance distinguish provider `FINISHED` from useful output. |

If enforced read-only access is unavailable for Cursor, the first researcher
trial must use a disposable repository or a non-repository information task;
neither qualifies as an accepted read-only run against a real source repository.
Do not describe plan mode as an access control. A useful repository-based pilot
cannot be accepted under an unverified repository grant or source audience.

Codex execution has a feasible API candidate: OpenAI's managed Agents API with
hosted sandboxes and explicit model selection. This is distinct from installing
Codex roles/skills and from running the local CLI on one computer. Evaluate its
repository provisioning, state/identity recovery, team access and costs in a
later Codex-specific runner Task before claiming interchangeable providers.
The first Cursor path should keep D2's provider-neutral contract so this option
does not require a new board or claim policy.

## Recovery checks by slice

PR #7's retrospective plan and code review must cover the manual saved-request
flow, a lost create reply, `409` conflict, missing/ambiguous run reads, exact
run retrieval after follow-up, identity mismatch, unknown status, safe errors,
and no repository credentials in payloads. S04 must prove shared process-restart
inspection of a manually registered run. S05's reviewed plan must prove stored
preparation and digest binding, one reserved send across crashes and contention,
and read-only recovery after uncertainty. The hosted route must reject a mutable
branch ref. S26 must
test JSON shape/version, size limits, invalid references, provider terminal
failure, a finished question, changed ticket/profile input, and no publication
from malformed or stale output. Local mocked tests are necessary but do not
replace the account/repository/team evidence above.

## Author assessment against seven principles

| Principle | Assessment |
| --- | --- |
| Intuitive | The operator sees one saved job with a stable provider link and clear states; the standalone command remains usable while the hosted path gains a distinct contract. |
| Discoverable | A capability response and access-check result explain supported operations and unverified repository permissions to both human and agent callers. |
| Delightful experience | Read-only recovery uses the original ID after a lost reply, so users are not asked to repeat finished work. |
| Token saver | Code chooses the recorded run and validates JSON; no model decides whether an API retry is safe. Raw output is bounded with stated omissions. |
| Secure | The service owns scope and credentials; a saved digest blocks payload substitution, and plan mode is not mistaken for write control. |
| Agents are equal | The same typed prepare/start/recover/get states are usable from commands and future MCP without UI clicks. Human diagnostics remain readable. |
| Dependable | Unknown launch/result outcomes stay visible and stop advancement; terminal provider status never implies validated findings or human acceptance. |

The [review record](../reviews/runner-capabilities.md) identifies the exact
artifact and independent verdicts. No S03/S26 Story is promoted by the author's
assessment alone.
