# D4 runner capability decision

22 September 2026. Discovery and design for the first hosted researcher run.
This applies the [hosted work contract](hosted-work-contract.md) to
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
| [Cursor v1 endpoints](https://cursor.com/docs/cloud-agent/api/endpoints), rechecked 27 September | `POST /agents` creates an agent and initial run; a supplied `bc-<uuid>` can return `409 agent_id_conflict`; agent, run-list and exact-run reads are documented. The agent response includes repository URLs, while the run response can include result text. A follow-up creates another run and an active agent can reject it as busy. | The documented responses do not attest the original run's owner/audience, prompt/model/revision, or a repeated request-body match; nor do they establish exactly-once execution after an unknown network outcome. The saved marker probe did not exercise the run-list endpoint. |
| [Cursor Cloud Agents](https://cursor.com/docs/cloud-agent), checked 22 September | Repository use needs an admin-connected source-control integration; agents clone and can push a separate branch. Cursor manages cloud VMs; run diagnostics are available through Cursor Cloud MCP. | That this team's connection has the required repository grant, or that plan mode prevents writes. |
| [PR #7](https://github.com/danielchappell/ski-stack/pull/7) at `da2fc8ccc0cdc4cd0493c16691d286309f513c9f`, 12 files against current main | A standalone Node runner and CLI prepare, start once, observe existing work with reads, retrieve a named run, validate response shapes, and redact the supplied key. Two fresh full-PR reviews are CLEAN; 239 local tests pass. | D2's hosted application contract, hosted CI, provider-attested request binding, or a repository-backed live test. [Review evidence](../reviews/runner-capabilities.md#pr-7-retrospective-and-committed-code-evidence) is separate from this D4 design review. |
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
| `recover` | Read only by the original agent ID. If a successful create receipt stored the initial run ID, retrieve that exact run. After a lost create response or `409`, an agent/run read is only an observation: the provider does not attest that its prompt, model, repository and revision match the saved request. Return `unverified`/needs-attention, not a bound attempt, unless a later verified provider contract supplies that binding. A later `latestRunId` or follow-up is never substituted for a recorded run. A missing read does not prove the create failed. |
| `get` | Read the recorded agent/run pair, validate both IDs and known native state, add observation time, mapped status, bounded result and explicit omission/truncation facts. Unknown status, identity mismatch, or oversized/unreadable result becomes attention. `FINISHED` means provider termination, not accepted researcher work. |

The service checks its saved request digest before any send or recovery. That
local comparison catches a changed local request, but cannot bind an observed
remote agent to the original payload. A duplicate-ID conflict may refer to an
older, unrelated agent. A timeout can also leave an observed agent whose input
cannot be verified. Preserve its IDs for investigation, stop automatic launch
and publication. Treat it as this attempt only after provider-visible binding
or a recorded human investigation with independent evidence of the original
request and actual source revision. No retry may create a replacement
job merely because the read is missing. The provider cannot grant the
current-attempt slot or authorize publication.

For the first researcher role, use a single final reply containing only a JSON
object with `schemaVersion:1`, nonempty `answer`, arrays of `findings` and
`references`, `recommendedNextStep`, and `unresolvedQuestions`. Each finding has
nonempty `text` and `referenceIds`; each reference has an `id`, `url` or explicit
`source`, and a short `description`. Define exact length/count limits in S26's
reviewed implementation plan before a live run. The adapter preserves the bounded
raw final reply with the exact run identity; S26 parses and validates this shape,
checks binding to the stored input, and records `valid`, `question`, `invalid`,
or `stale` for the output contract, separately from request/source binding and
publication eligibility. A format-valid but unbound reply is nonpublishable.
Non-JSON, truncated, missing, or unsupported-version replies never
advance the ticket. A syntactically valid reference is not proof the source is
accurate; the human still accepts the findings.

## PR #7 reuse and retrospective assessment

PR #7's [Story](https://github.com/danielchappell/ski-stack/blob/da2fc8ccc0cdc4cd0493c16691d286309f513c9f/docs/stories/run-cursor-cloud-job.md)
and [plan](https://github.com/danielchappell/ski-stack/blob/da2fc8ccc0cdc4cd0493c16691d286309f513c9f/docs/plans/cursor-cloud-job.md)
describe a usable manual `prepare`/`start`/`get` command. That was an honest,
bounded standalone outcome. It preceded D2 and cannot count as a reviewed plan
for the later hosted S05 integration. The plan's no-scheduler/no-Jira boundary still
fits. Its wording that callers treat a saved request as immutable is not an
enforced match after `409`; D2 requires the application to persist and compare
the digest. This is a retrospective gap, not a claim that the existing CLI is
broken for its documented manual use. Its `disposition: "recovered"` describes
an observed run under the saved ID, not provider attestation of request content;
the hosted facade must not treat that disposition alone as a bound attempt.

Decision: use PR #7 as S03's independent, usable manual Cursor job outcome. It
has no hosted authority. Reuse request validation,
fixed API origin, key redaction, one-send behavior, exact-run retrieval, status
checks, and mocked API fixtures. PR #7 required a retrospective independent
Story/plan review against its standalone outcome, integration with current
main, required tests and fresh independent reviews of the resulting committed
diff. Those retrospective and committed-code gates are now CLEAN for `da2fc8c`,
with the exact evidence below;
future code changes need fresh review. Preserve its branch and work within the
20-file limit; split if later work makes it exceed 20 changed files or two
human days. This order provides an operator-visible, recoverable
provider command first. S04 can then save and inspect an existing run under
shared scope without starting one. S05 is the first hosted launch: it must
atomically reserve the current attempt and send intent before using a D2
prepare/start/recover/get facade over the PR #7 code. That facade adds stable
hosted preparation, scoped connection handling, observation fields, local digest
comparison and the separate remote-binding gate. Size S05 from real files after D1/D3 and split it into complete usable
outcomes if it cannot fit one PR; never move a live send ahead of its store.
The [separate committed-code reviews](../reviews/runner-capabilities.md#pr-7-retrospective-and-committed-code-evidence),
not historical author tests or this design review, support PR #7's code gate.

S04 may import a standalone run launched from a branch for inspection only
after binding that **exact agent/run ID** to its original source audience and
authorizing disclosure to the selected connection. A pair/version, provider
API key, account/repository match or registrar's general source role is not
run-specific proof. Authenticate the registrar's current source and target
grants before a minimal provider metadata lookup. A trusted run-specific
origin record must then establish the original audience and owner: either
provider-attested evidence or a contemporaneous launch receipt issued by a
trusted source command. A source-authorized human may approve transfer only
after their authority for this exact run and its original content is
independently verified; an agent needs a preapproved grant bound to the same
run-specific record and target audience. An entered ID, later model claim or
self-attestation cannot create that record. Store its identity and evidence
reference, not raw prompt or result.

Before **each** S04 provider status read or shared inspection, recheck the
current source-to-target authorization and target viewer/agent grant. A revoked
source grant or disclosure blocks even previously saved status, ID and link;
discard any result field returned alongside provider status. S26 performs its
own audience recheck before result capture. If run-specific origin or current
disclosure cannot be proved, do not read status/result, create or show a shared
registration, or return provider metadata; report a scoped unverified-import
error. D4L must prove this path before S04 is ready. If the provider and
trusted source commands cannot supply run-specific proof, re-groom S04 into a
complete trusted-source outcome before implementation.
An authorized import from a moving ref remains inspection-only: S26 may check
its output format within the established audience and record a format-valid but
unbound result. It cannot mark the result validated ticket work or eligible for
publication, and S06 cannot publish it from a claimed role or revision. The
[D4L Task](../tasks/architecture-decisions.md#d4l--verify-cursor-pilot-access-and-source-identity)
must record provider-visible or independently checked evidence binding the actual
checkout to a 40-hex revision. That **D4-source** gate does not prove the
original prompt, role, profile or provider request. Publication additionally
requires a trusted immutable launch record and independent evidence binding
that original request to the exact run. S05 creates that record for hosted
launches; an imported run cannot gain the same authority merely by registering
its IDs. A model's claimed commit or a guess from the branch's later
tip is insufficient. D4-live additionally requires the repository grant,
enforced read-only behavior, teammate access and meaningful-work authority.

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
The contingency for failed read-only or actual-commit binding is
[D4F](../tasks/architecture-decisions.md#d4f--evaluate-a-hosted-codex-fallback):
evaluate a hosted Codex path, then obtain an explicit provider choice and revise
the D4/S05/A1 contracts before a repository-backed pilot. Cursor remains the
selected runner until that decision; the fallback Task alone does not switch it.

Codex execution has a feasible API candidate: OpenAI's managed Agents API with
hosted sandboxes and explicit model selection. This is distinct from installing
Codex roles/skills and from running the local CLI on one computer. Evaluate its
repository provisioning, state/identity recovery, team access and costs in a
contingent D4F Task before claiming interchangeable providers.
The first Cursor path should keep D2's provider-neutral contract so this option
does not require a new board or claim policy.

## Recovery checks by slice

PR #7's retrospective plan and code reviews covered the manual saved-request
flow, a lost create reply, `409` conflict, missing/ambiguous run reads, exact
run retrieval after follow-up, identity mismatch, unknown status, safe errors,
and no repository credentials in payloads. S04 must prove shared process-restart
inspection of a manually registered run with proven source-to-target audience.
It must deny a foreign run, a registrar without exact-run source rights, a
same-pair viewer without a grant and a revoked disclosure after restart,
without reading or disclosing provider status/results. Mutable/unattested
revisions remain inspection-only after
that audience check. S05's reviewed plan must prove stored preparation, one reserved
send across crashes and contention, and needs-attention after an unbound remote
observation. A local digest alone is not provider binding. The hosted route must
reject a mutable branch ref. S26 must
test JSON shape/version, size limits, invalid references, provider terminal
failure, a finished question, changed ticket/profile input, and no publication
from malformed or stale output. Local mocked tests are necessary but do not
replace the account/repository/team evidence above.

## Author assessment against seven principles

| Principle | Assessment |
| --- | --- |
| Intuitive | The operator sees one saved job with a stable provider link and clear states; the standalone command remains usable while the hosted path gains a distinct contract. |
| Discoverable | A capability response and access-check result explain supported operations and unverified repository permissions to both human and agent callers. |
| Delightful experience | Read-only observation uses the original ID after a lost reply without repeating paid work; uncertain binding needs human resolution. |
| Token saver | Code chooses the recorded run and validates JSON; no model decides whether an API retry is safe. Raw output is bounded with stated omissions. |
| Secure | The service owns scope and credentials; trusted exact-run origin and current source-to-target authorization are checked before registration and every status/result read, so a known foreign ID or later revocation cannot expose even saved metadata. A saved digest blocks local payload substitution, but an unbound remote observation cannot authorize publication. Plan mode is not mistaken for write control. |
| Agents are equal | The same typed prepare/start/recover/get states are usable from commands and future MCP without UI clicks. A scoped agent import needs a preapproved exact-run transfer grant; a human may authorize only after independent verification of their rights to that run's content. Diagnostics stay readable without exposing foreign metadata. |
| Dependable | Unknown exact-run origin or revoked disclosure fails before shared inspection, and unknown launch/result outcomes stay visible without advancing; terminal provider status never implies validated findings or human acceptance. If import evidence is unavailable, S04 is re-groomed rather than declaring partial plumbing complete. |

The [review record](../reviews/runner-capabilities.md) distinguishes the
imported-run provenance and format-gate design reviews from earlier D4 rounds.
Neither design review proves the live D4L gates or promotes a hosted Story.
