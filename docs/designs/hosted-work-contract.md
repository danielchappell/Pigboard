# Hosted work and configuration contract

D2 design, 21 September 2026. This develops the independently reviewed
[architecture](../architecture-plan.md), not a replacement architecture. It also
resolves the configuration-only parts of D1/D4 needed for S01. Live Jira
permissions, runner repository access and deployment choices remain unresolved.
No hosted write Story becomes ready from this document alone.

## Existing seams and chosen approach

`src/core/availability.js` owns selection/order and its current fingerprint.
`src/runtime/claim-next-available.js` rechecks a selected claim. The queue adapter
currently owns both board actions and best-effort leases. `QueueDispatcher`
awaits a complete result, and `applyWorkerResult` applies its transitions.
These exports and the local signed-handoff chain remain compatible.

Add a hosted application layer that composes a board connection, a transactional
run store, a runner and the existing pure policy. Do not retrofit asynchronous
cloud execution into the synchronous coding worker. The provider operation,
result validation and publication are separate resumable commands, not one long
HTTP request. Physical database/hosting selection is D3; this contract requires
transactions, uniqueness and conditional updates and does not claim that the
current memory/GitHub adapters already supply them.

## Identity and authoritative records

| Record | Identity and purpose | Mutable fields |
| --- | --- | --- |
| Workflow profile | Profile ID plus content digest; captures the exact route and supported role/provider contract. | Editing produces another digest; an active attempt keeps its original version. |
| Work request | Team, connection, project, native ticket ID, stage and input digest. | Latest observed board state and diagnostics; never silently replace the submitted input. |
| Attempt | Opaque ID, request ID, explicit attempt number and immutable execution digest. | Lease, provider observations, validation and publication progress under conditional updates. |
| Effect | Attempt ID plus action kind and operation ID; exact intended external request digest. | Reserved/sent-unknown/confirmed/rejected/needs-attention and external receipt. |
| Evidence | Scoped attempt/stage, source revision and content digest. | Append-only accepted observations; retention is D3 policy. |

The execution digest binds normalized ticket content, configured role/package
version, profile digest, repository URL and resolved immutable revision, model
and supported provider options. Canonical serialization uses a versioned sorted
object representation; array order remains meaningful except declared sets
(such as dependency IDs). Digests are identifiers, not authorization or secrecy.

Uniqueness covers (team, connection, project, ticket, stage, input digest,
attempt number). A separate current-attempt slot covers (team, connection,
project, ticket, stage), so editing the ticket cannot evade an active or uncertain
run by creating another digest. New content invalidates publication of the old
result; it does not automatically authorize parallel replacement compute.

Every read/write includes verified caller scope. The service resolves connection
references and credentials; a profile cannot grant access merely by naming a team.
Neither a ticket comment nor a model reply can supply a trusted lease, actor,
approved review or accepted transition.

## Board and runner interface boundaries

These provider-neutral shapes are the D2 boundary; D1/D4 supply verified vendor
mappings before their implementation Stories. Methods receive service-resolved
connection handles, never secret values from the profile or ticket.

Board connection:

- `inspectConnection(scope, profile)` is read-only and returns resolved native
  project/type/status IDs, per-check verified/denied/unknown results and explicit
  mutation capabilities. Unresolved names are not silently treated as IDs.
- `loadWorkSnapshot(scope, binding, selection)` returns normalized items,
  native item IDs, source/input revisions, opt-in facts, dependency states,
  snapshot time and completeness/continuation information. Selection is bounded;
  unavailable dependency data is unknown and fails core eligibility closed.
  Scheduling cannot claim a complete dependency graph from a partial page.
- `publishEffect(scope, binding, effect, sendGrant)` accepts only a reserved
  application effect: operation ID, action kind, target ID, exact payload digest,
  validated payload and the verified native precondition. It returns confirmed
  with native receipt/ID, rejected-without-effect, uncertain, or unsupported.
  Unsupported preconditions stop before sending. The adapter never selects a
  role, leases work, trusts a model-selected target or retries a mutation itself.
- `reconcileEffect(scope, binding, effect)` performs bounded reads and returns a
  verified matching receipt, conflicting evidence, or unknown with its reason
  and any truncation. No negative/partial result authorizes a new mutation.

Runner:

- `describeCapabilities()` returns a versioned static contract with supported
  operations, source kinds, role output transport and enforced permission limits.
  A declared capability is not proof that a particular account/repository grants it.
- `prepare(input)` is pure: receive immutable attempt identity, role/prompt,
  selected model/options and optional resolved repository revision. Return a
  stable launch key, request digest and provider request. Persist this output
  before start; never call prepare again merely because a launch is uncertain.
- `start(connection, prepared)` sends once and returns accepted with provider
  identity, rejected-without-effect with a classified error, or uncertain with
  the original launch key. Adapters must not classify an ambiguous timeout or
  undocumented error as definite rejection. They do not create replacement IDs.
- `recover(connection, prepared, knownIdentity)` is read-only and returns found
  with exact identity, missing, ambiguous or unavailable. Missing is an observation,
  not permission to relaunch. Multiple runs without a recorded matching run ID
  remain ambiguous instead of selecting the newest.
- `get(connection, identity)` returns the exact provider/run IDs, native and
  normalized status, observation time, bounded raw result/evidence reference and
  omissions. Identity mismatch or an unknown status yields structured attention.
  It neither validates role success nor publishes a result.

Provider identity includes provider type, connection reference, agent/job ID and
run/turn ID where the provider has both. Errors carry a stable code, operation,
retryability for reads, effect certainty and safe diagnostic text; no secret,
raw authentication response or arbitrary upstream body is public output. Details
stay scoped by the application command and the source audience. `cancel` and
follow-up creation are not implicit capabilities of this first contract.

## Attempt state has separate dimensions

Avoid one enum that confuses provider activity with useful completion:

- Coordination: queued, owned, waiting, needs-attention, superseded, closed.
- Provider: not-started, launch-uncertain, pending, running, finished, failed,
  cancelled, expired or unknown.
- Validation: not-ready, valid, question, invalid or stale.
- Publication: not-ready, pending, partial, confirmed, uncertain or withheld.
- Acceptance: not-requested, awaiting-human, accepted or rejected.

Each change records a reason, timestamp, actor and record version. Stored provider
status retains its native value beside the normalized value. Unknown provider
states require attention, not a guessed success/failure. A finished turn may
still contain a question; a valid answer may still await ticket publication;
published findings are not automatically human-accepted work.

Only a validated result for the unchanged immutable input can enter publication.
The initial researcher result contract is answer/findings, supporting references,
recommended next step and explicit unresolved questions. An output with no usable
answer or with a decision that stops work stays question/needs-attention.
Structural validation and source/run binding are code; evidence quality and human
acceptance are separate judgments. No validator can prove a model claim true just
because its JSON fields exist. D4 must select the exact provider-to-result format
before S26 is ready; arbitrary provider prose must not advance the board.

## Transactional ownership

Every operation requires caller scope. Each mutation uses its operation-specific
conditional guard below; only progress/effect mutations that name expectedVersion
require record-version CAS. Reads need no write version. Proposed interfaces
describe responsibilities; implementation language is ordinary Node:

- `ensureAttempt(scope, immutableRequest, explicitAttemptKey)` atomically finds
  the same attempt or creates it and its current-attempt slot. A mismatch returns
  a conflict; a currently active/uncertain slot blocks a replacement.
- `acquireAttempt(scope, attemptId, workerId, duration)` conditionally grants an
  expired/free lease and increments its generation using store time.
- `renewAttempt(scope, attemptId, workerId, generation, duration)` extends only
  the current unexpired lease; it cannot resurrect a lost generation.
- `commitProgress(scope, attemptId, generation, expectedVersion, observation)`
  rejects stale ownership, incompatible transitions or a changed immutable input.
- `reserveEffect(scope, attemptId, generation, expectedVersion, effect)` commits
  one immutable send intent before any external mutation.
- `recordEffectObservation(scope, effectId, receipt)` stores authenticated evidence
  of an outstanding effect; applying it still requires the current attempt owner.
- `inspectAttempt(scope, attemptId)` gives bounded status/evidence and explicit
  omissions without exposing credentials or another scope's records.

Lease expiry allows observation/reconciliation takeover. It does not grant a new
launch, release the current-attempt slot, or erase an outstanding external effect.
Close that slot only when the prior provider attempt is known terminal and all
outstanding effects are confirmed, rejected without effect, or explicitly
resolved through an authorized recovery decision. Cancellation is unsupported
unless the runner capability and its verification contract exist.

A first-team capacity slot is reserved in the same transaction as the launch
intent. Launch uncertainty consumes capacity until reconciled. Admission does
not use a count-then-insert race. Multi-team quota/accounting expansion stays D8.

## External effects and uncertainty

A lease generation fences database commits, not an HTTP request already in
flight. Reserving an effect creates one send grant. The coordinator must not
hand the same unconfirmed mutation to a replacement worker for blind replay.
A paused old sender may still send its grant: current ownership guards acceptance
of its response, but cannot undo that upstream effect.

For Cursor, preserve the prepared client agent ID, exact request digest and then
exact run ID. On lost response or conflict, recover that identity read-only.
A negative/temporarily missing read is not proof that create failed. Do not
invent a replacement agent ID; multiple provider runs require exact recorded run
selection and attention if identity cannot be established. The marker-only API
probe supports this recovery shape but not every future runner.

For Jira comment creation, reserve a stable operation marker and intended body
before posting. Persist the returned comment ID. After an ambiguous response,
read and match the integration's own operation marker and content digest. A
positive unique match can confirm publication. Zero matches, incomplete reads,
multiple matches or edited content cannot prove absence; keep uncertain and do
not blindly post again. No automatic resend is authorized solely by lease expiry
or timeout. An explicit recovery decision must account for the old sender and
upstream outcome before any new mutation; otherwise it remains needs-attention.

Idempotent-looking comment updates can still overwrite a later human edit.
Transition/comment-update writes therefore require D1's verified precondition
and race policy. A fresh read is insufficient for an atomic no-overwrite claim.
The board interface advertises verified mutation capabilities, and activation
fails when the requested policy cannot be met. Do not silently downgrade to
unconditional writes. The existing pilot's auto-transition experience remains a
requirement to resolve in D1, not a guarantee supplied by this abstract contract.

## Resumable application operations

| Operation | Before external action | Durable outcome / recovery |
| --- | --- | --- |
| Inspect | Resolve profile, authorized board snapshot and all blocking dependency facts. | Explain eligible/unavailable and unresolved setup; no claim or mutation. |
| Submit | Recheck snapshot/input, transactionally acquire the current-attempt/capacity slot and save exact provider request. | Return attempt identity before/with provider identity; uncertain launch resumes original identity. |
| Observe | Own the attempt and load the exact recorded provider identity. | Store native/normalized state, result digest and timestamp; bound reads and polling delay. |
| Validate | Check terminal provider state, exact input/role contract and current source eligibility. | Store valid/question/invalid/stale and reasons; no external write. |
| Publish | Require valid nonstale output, current scope/audience and allowed board mutation contract; reserve effect. | Store each comment/transition checkpoint; resume only missing proven-safe effects. |
| Retry | Verify authorized explicit request, terminal/resolved old attempt and current eligibility. | New linked attempt and immutable input; repeated retry request finds the same new attempt. |

The hosted adapter normalizes eligible Jira work to existing core stages for
selection (researcher uses internal Ready). The profile records native status
mapping separately. An expanded hosted input fingerprint includes opt-in,
profile/role version, team/project/repository boundary, dependencies and content
revision. Retain the legacy fingerprint/export semantics for existing callers;
add the hosted fingerprint rather than silently changing signed MVP handoffs.

An already-launched attempt is observed even when the board changes or the opt-in
is removed. Those changes prevent publishing/advancing it; they do not hide an
external job or pretend it was cancelled. Reconciliation compares the inputs
relevant to this stage, not incidental comment timestamps or the coordinator's
own progress comment, which must not trigger another attempt.

## Failure walkthrough and verification obligations

| Scenario | Stored fact and next action | Required evidence before activation |
| --- | --- | --- |
| Duplicate event or two submitters | Unique current-attempt slot returns one attempt; only its reserved launch has a send grant. | Concurrent real-store test, one provider-create observation. |
| Crash before reserving launch | No committed effect means a new owner may reserve it. | Restart at that boundary without duplicate intent. |
| Crash after reservation/before or after send | Same effect stays uncertain; takeover observes, never assumes unsent. | Crash on both sides of send/receipt persistence; no replacement launch. |
| Old worker resumes after lease loss | Old progress commit fails; its external send may still exist and is reconciled. | Paused-worker test proves no second send grant and no stale accepted state. |
| Provider finished with a question/invalid output | Store terminal state and question/invalid result; no success transition. | Role-output fixtures plus operator-visible reason. |
| Human edits task/removes opt-in | Record stale input and withheld publication; continue observing the original provider. | Human-change interleavings and no status overwrite under D1's chosen policy. |
| Comment posted but response lost | Unique matching operation confirms it; unknown/ambiguous read remains attention. | Mock interruptions plus authorized Jira behavior evidence in D1/A1. |
| Comment confirmed, transition failed | Comment checkpoint stays confirmed; reconcile only the transition. | Publication replay never invokes provider work or creates another comment. |
| Store unavailable | Stop new mutations because ownership/intent cannot be committed. | Fault test; bounded diagnostic and later reconciliation. |
| Credentials revoked | Keep stored work and deny new unauthorized effects; surface setup action. | Denial/recovery evidence without secret values or credential fallback. |

These are implementation/acceptance obligations, not tests performed by this Task.
D3 must prove the chosen store implements transactions, CAS/uniqueness and restore
behavior. D1 must establish board mutation safety. Neither is replaced by a
mock-only green test or by a suggested database product.

## Configuration-only contract for the first usable Story

S01 is the first milestone's saved-profile validator and route preview. It is
useful without credentials: teammates can share a configuration file and see the
same supported route before enabling live work. Its output explicitly says that
connection access, native status resolution and model availability are unchecked.
It does not claim a ticket is eligible, ready to execute, or authorized.

Use a versioned JSON document, with exactly these supported fields for the pilot:

```json
{
  "version": 1,
  "id": "int-discovery",
  "teamRef": "example-team",
  "board": {
    "type": "jira",
    "connectionRef": "jira-int",
    "projectKey": "INT",
    "issueType": "Task",
    "readyStatus": "Ready to Work",
    "optInLabel": "ai-enabled"
  },
  "worker": {
    "stage": "technical-discovery",
    "role": "researcher"
  },
  "repository": {
    "url": "https://github.com/danielchappell/ski-stack",
    "revision": "5e48c3def05fa8dc840d51ae6683113b9faa0ba2"
  },
  "runner": {
    "type": "cursor",
    "connectionRef": "cursor-team",
    "model": "gpt-5.6-sol"
  }
}
```

The repository/revision and INT display names come from recorded pilot evidence;
team/connection references above are illustrative, not provisioned connections.
D1's future live preflight resolves names unambiguously to IDs under the connection
identity and binds those IDs to the active profile. Ambiguous names, missing IDs
or denied access block live execution. S01 never resolves them or reads secrets.

S01 validation rules:

- Require a plain JSON object of at most 64 KiB with all shown fields and no
  additional fields at any level; reject unsupported versions. Use standard JSON
  parsing consistently, and validate/digest only the parsed object, never a second
  interpretation of raw text.
- ID, teamRef and connectionRef are 1-64 ASCII letters/digits/dot/underscore/hyphen,
  starting with a letter/digit. They are opaque references, never file paths,
  environment lookups, endpoints or grants of permission.
- Require exact pilot type/role/stage values jira/cursor/researcher/technical-discovery.
  Other combinations return unsupported configuration without starting anything.
- Project, issue type, ready status, opt-in label and model are nonempty strings
  with no leading/trailing whitespace or control characters, at most 128 characters.
  Native provider validity remains unchecked. Do not silently normalize values.
- Require one credential-free HTTPS github.com owner/repository URL with no query,
  fragment or trailing path, and a 40-character hexadecimal source revision.
  Pin execution to immutable source; a branch name is not this contract.
- There is no prompt, credential value, API host, tool list, environment map,
  transition target, auto-PR option or dynamic role override in this profile.
  Such fields are rejected rather than forwarded to a provider.
- A valid result contains schema version, profile ID, canonical content digest,
  a structured route object and explicit unchecked live prerequisites.
  An invalid result contains stable error codes and schema field paths, not raw
  invalid values/file content or arbitrary property names supplied by the user.

The stable valid result is `{schemaVersion: 1, ok: true, profileId, digest,
route, liveReady: false, unchecked}`. `route` contains teamRef, board type and
connectionRef, projectKey, issueType, readyStatus, optInLabel, stage, role,
repository URL/revision and runner type/connectionRef/model. `unchecked` is an
array of `{code, status: "not_checked"}` for `connection_access`,
`native_workflow_resolution`, `repository_access`, `model_availability` and
`execution_authorization`. Optional human display text is derived from these
same fields. A CLI text formatter cannot replace the structured library/JSON
result. Invalid output has `ok: false`, `liveReady: false`, a stable top-level
code and `{path, code, message}` errors, without a route/digest success claim.

The validator is deterministic and performs no network, credential lookup, shell
execution, file mutation or automatic issue/run creation. Reading the explicit
input file/stdin is its only I/O besides output. S02 later provides live eligibility
inspection; this separation is visible in help and result fields, not a hidden
reduction of the milestone's outcome.

For reuse, export validate/preview functions accepting parsed data; the CLI uses
standard JSON parsing. Keep size/shape limits in both entry paths where relevant. Do not add a package dependency just for schema validation
unless it demonstrably removes complexity within the reviewed plan.

## Complete increments and preliminary sizing

S01 is one complete offline configuration/route-preview command, not a database
foundation. A repository-grounded inventory is one pure profile module, one CLI,
package script, root exports, one example, one guide, README link and two test
files: nine implementation files. Allow up to three supporting Story/plan/queue
updates if needed in that PR, for a conservative twelve-file total. The existing
Node ESM scripts, standard test runner and canonical serializer are reusable.
Estimated familiar-developer work: validation/preview and CLI 5 hours; meaningful
library/process tests 3 hours; guide/example/QA 2 hours; review/PR fixes 2 hours.
That is about 12 hours, below two working days, subject to the S01 plan gate.
No parser framework, network client, database or provider launch is included.

The later command outcomes remain separate: S04 inspects a saved run across
processes; S05 submits one ticket; S26 observes/validates; S06 publishes stored
work; S07 schedules these operations; S08 deploys the selected service. Combining
store/auth setup, launch, polling and Jira recovery into one Story would cross
several boundaries and is not accepted as a two-day slice. Their precise file/day
estimates remain blocked on D1/D3/D4 choices; D2 does not invent them. Revisit and
split these provisional Stories after the corresponding interfaces are proven.

## Scoped decisions and remaining gates

D2 defines the state/authority/interfaces and failure obligations. Its outcome is
reviewable without choosing a database or running a cloud job. The exact researcher
output decoder remains a D4 prerequisite for S26; race-safe board mutations remain
D1 prerequisites for S06. D3 selects/validates the deployment/store/access system.

The configuration-only portions of D1 and D4 are resolved here: connection and
native names remain opaque/unchecked; the declared first provider/role pair is
Cursor/researcher, matching existing evidence; no provider capability or live
permission is inferred from a valid profile. This is sufficient for S01 after
independent review, not for S02 or hosted activation. D1/D3/D4 remain open in the
queue, and no access or expensive compute is implied by these decisions.

## Author's seven-principle assessment

| Principle | Assessment |
| --- | --- |
| Intuitive | Profile preview explains the intended route; execution states separate provider finish, valid work, publication and acceptance. |
| Discoverable | Each command has an observable result, unmet prerequisite and recovery path; live checks are named rather than implied. |
| Delightful experience | Repeated delivery resumes existing work and publication; uncertain effects stay visible without asking to recreate credentials or work. |
| Token saver | Deterministic configuration, state transitions and recovery use code; model context excludes internal coordination and credentials. |
| Secure | Scoped records, immutable inputs, send grants and denied mutations protect authority; opaque config references grant nothing. |
| Agents are equal | JSON inspection/commands expose the same facts humans see, without interactive credential prompts or guessed permissions. |
| Dependable | Lease fencing is limited honestly; uncertain external effects remain uncertain; no automatic re-launch or model rerun repairs publication. |
