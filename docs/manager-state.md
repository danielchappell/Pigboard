# Inspect durable manager state

This is an **unreleased early PGB-85 checkpoint on PGB-137/PGB-84**. The DynamoDB
adapter, transition-proof persistence, evidence-only reconciliation, local fixtures and command boundary
exist in this branch. Normal
operator `init`/`inspect` commands still return `CORE_PREREQUISITE` until the actual
PGB-82/83 installation resolver and preview are integrated. Nothing here enables
delivery, creates AWS resources or establishes installed acceptance.

Pig Boss keeps four kinds of operational record in the customer's retained table:
installation, stream, attempt and member. Jira remains the source for work content
and current workflow facts. Stored records contain IDs, versions, timestamps and
bounded evidence references, without descriptions, code, raw provider bodies or
transcripts. One full stream identity is site + immutable project ID + full label.
Equal labels in different projects are independent.

## Prepare the source package

Use Node.js 20+ and the reviewed source revision. Before use, prepare both pinned
dependency trees from the checkout root:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm ci --prefix runtime/aws --ignore-scripts --no-audit --no-fund
```

Commands and delivery runs never fetch or repair dependencies. `runtime/aws` owns
the exact AWS SDK pair and lockfile; the root validator and worker bundle keep
their existing dependencies. A missing or wrong nested runtime returns `SETUP`,
including when an ancestor or global installation has an AWS SDK. The deployment
package must preserve the repository-relative source, contracts, required config,
root validator dependencies and complete prepared `runtime/aws` folder.
This checkpoint pins both `@aws-sdk/client-dynamodb` and
`@aws-sdk/lib-dynamodb` to `3.1169.0`.

The core deployment table must use string partition key `PK` and string sort key
`SK`, without indexes, TTL or streams. The adapter partitions by
`installation#<installation_id>`; sort keys use `I#`, `S#`, `M#`, `A#` plus the
deterministic record ID. These are deployment integration details, not customer
configuration. Core PGB-83 must bind this tested layout at its frozen revision.

AWS access uses the standard SDK credential chain. Do not place credential values
in the canonical configuration, generated receipt, state or command arguments.
The customer package owns resource observation, roles and generated installation
identity. This checkpoint has no alternative receipt/config parser.

## Initialize and inspect after core integration

These are the planned operator commands; help already works without the SDK:

```sh
node scripts/manager-state.mjs --help
node scripts/manager-state.mjs init --config company.yaml --installation installation.json --json
node scripts/manager-state.mjs inspect --config company.yaml --installation installation.json --kind stream --json
node scripts/manager-state.mjs inspect --config company.yaml --installation installation.json --kind attempt --limit 50
```

Use the one authored canonical configuration and the package-generated receipt.
There are no resource/domain overrides, arbitrary endpoint options, enable, force,
unlock, purge, reconciliation or retry flags. The receipt is an output binding to
observed resources, not permission to create an empty replacement authority.

Initialization requires the core resolver's verified fresh-generation, empty-table
observation, with scheduling disabled, writes off and maintenance false. The adapter
rechecks table identity and empty state, then conditionally creates the installation
record. An ordinary receipt, missing existing state or replacement table is not
sufficient. Already initialized installations return `ALREADY_INITIALIZED`; inspect
them instead. The adapter never provisions a table.

Inspection supports `installation`, `stream`, `attempt` and `member`. For one record,
add `--record-id ID`. Each page defaults to 50 records, maximum 100. When
`complete:false`, follow `next_cursor` with `--cursor CURSOR`, the same kind,
configuration and installation. Do not combine a cursor with a record ID. Pages
are read-only observations; they do not claim one coherent snapshot across pages.

Both readable and JSON output show the same state. JSON writes one result object
to stdout: `schema`, `status`, `code`, `diagnostics`, `data`. Unconfirmed results
have `data:null`. A confirmed partial inspect page has explicit continuation.
Exit 0 means confirmed, including an inspect page with more records; exit 1 means
conflict or incomplete inventory; exit 2 means invalid, unavailable, unsupported,
uncertain or setup/prerequisite failure. Diagnostics omit raw provider errors.

## Read retained work safely

Read-only inspection and complete inventory remain available while disabled, in
maintenance or when desired/applied controls differ. Their `controls_match` field
reports that mismatch. Reading does not grant admission authority. Runtime writes
require canonical and stored controls/digest to agree, scheduling and writes on,
and maintenance off. This Story supplies no command to change that fence.

`readInventory({limits})` requires explicit positive stream/member/pending-attempt,
page/request/time budgets. Record ceilings are 1,000 per kind; duration is at most
30 seconds. It uses strong reads and compares installation revision before/after
the inventory. Every transaction advances that fence. Missing, malformed, unknown,
over-budget or changed state returns no usable snapshot. Inventory includes
retained projects even after their removal from current configuration; it reads
pending references without enumerating all historical attempts.

The application must inject `projectRetainedInventory`'s retained members and
pending intents into the actual live collector **before** collecting known IDs.
Old ownership survives a native key rename, issue move or removed project.
Affected preview scope must hold; a global scope hold for a removed project is
acceptable. This actual preview integration remains pending in this checkpoint.
Preview must make no state or Jira writes.

## Conditional transitions and recovery

The base state interface has seven methods: `initialize`, `readInventory`,
`inspect`, `readAttempt`, `retainMembers`, `begin`, `finalize`. PGB-137 adds the three
internal proof methods described below. The AWS module's
factory constructs the production SDK transport; clients are injectable solely
for the prepared local fixture boundary. SDK attempts are fixed at one, requests
have abort deadlines and operations have a bounded 30-second window.

`retainMembers` preserves original site/project/full-label/Epic/ticket ownership.
The same membership record may advance its assignment reference conditionally;
there is no second current-assignment variant. `begin` atomically retains/checks
required members, creates the immutable attempt and sets the stream pending
reference. `finalize` atomically records a terminal outcome and clears only its
matching pending reference. All use exact expected revisions and one transaction;
extension fields survive targeted updates. No deletion, TTL unlock or automated
retirement is offered. Batches never split an atomic begin/finalize transaction.

Confirmed state persistence does not authorize a Jira effect or prove evidence
truth. The later apply/reconciliation owners must establish fresh positive provider
evidence and permitted transitions. Unknown outcomes retain the pending hold.
`finalize` has no disabled/maintenance bypass in this Story.

| Result | Recovery |
| --- | --- |
| `REVISION_CONFLICT` | Obtain a new complete inventory and evaluate again. |
| `PENDING_ATTEMPT` | Inspect the same attempt; do not send another transition. |
| `UNCERTAIN_WRITE` | Inspect the same installation and attempt ID. Do not create a new attempt to retry. |
| `MISSING_INSTALLATION` / `UNAVAILABLE` | Check the original retained resource binding and access. Never initialize a replacement empty table. |
| `UNSUPPORTED_VERSION` / `MALFORMED_RECORD` | Keep writes off and use the supporting release or human recovery process. |
| `CONTROL_MISMATCH` | Inspect the applied binding and canonical desired controls; use later authorized lifecycle tooling. |
| `INCOMPLETE_INVENTORY` | Keep the hold; resolve the configured budget/completeness issue before evaluation. |

Table retention on stack deletion **and replacement** belongs to PGB-83's
CloudFormation package and remains to be verified against that actual revision.
Retained records and tables continue to incur customer AWS costs. Compatible
upgrade/removal/reconciliation commands are later Stories, not hidden features
of `inspect`.

## Bounded local verification

Run developer regressions with prepared dependencies:

```sh
node --test test/manager-state-contract.test.mjs test/manager-state-cli.test.mjs test/manager-state-sdk.test.mjs
node --test test/skill-distribution.test.mjs
npm test
```

The SDK test uses dummy credentials and a localhost HTTP server only in tests.
It exercises real SDK serialization, the nested copied package and one-attempt
failure behavior. Tests require permission to listen locally. No production CLI
endpoint override exists. Tests never contact AWS/Jira or fetch packages.

The prescribed human groups are H01, H02 and H03; zero AI acceptance cases are
assigned by PGB-84. Export a prepared local packet to a **new** temporary directory:

```sh
node scripts/test-manager-state.mjs --case R1-14-H02 --output /tmp/pgb84-h02-evidence
node scripts/test-manager-state.mjs --all --output /tmp/pgb84-all-evidence
```

H02 exports the finite competing begin, four fault and matching/stale finalizer
traces. H01/H03 currently report Blocked because actual PGB-82/83 composition is
absent; the driver does not replace that preview with a fake. The final packet
must add the real canonical configuration/generated receipt and H01/H03 before/
after preview observations at integration. Every packet records exact HEAD,
dirty state, inputs, records and command audit. Final evidence requires a clean
revision. A local `confirmed_local_fixture` observation is not a human PASS.

A human reviewer runs the prepared commands, retains outputs, records their own
assessment and then removes only disposable fixtures/build output. If a prescribed
case cannot run after the bounded prepared attempt and one mechanical setup
correction, record Blocked/unknown and request human disposition. Do not rebuild
fixtures or retry endlessly. Developer checks, human acceptance, hosted CI,
installed AWS/Jira acceptance, merge and activation are separate gates.

See [the state design](architecture/manager-state.md) and
[contributor requirements](../CONTRIBUTING.md). No deployment or activation is
authorized by this guide.

## Retain and inspect original transition proof

PGB-137 adds a complete proof-persistence capability to the existing attempt v1
record. A later trusted producer can save its verified publication, prepare an
exact request commitment, and retain its original completed HTTP response.
The real sender is PGB-87 work; reconciliation is PGB-85 work. Neither has shipped
through these methods. This checkpoint sends no Jira request and does not finalize
the pending attempt.

The same `inspect --kind attempt` command now adds a readable summary:

| Summary | Retained fact |
| --- | --- |
| `none` | No named capture group exists. |
| `prepared` | The request/publication binding was persisted; no completed response is retained. Sending or its outcome cannot be inferred. |
| `response-captured` | An original completed HTTP status and observation time are retained for that prepared request. |
| `unsupported` | Named capture fields are partial, conflicting, unknown or fail their request binding. Keep the hold. |

The summary names the attempt, its unchanged outcome, request digest and original
HTTP status when available. JSON returns the same full record and exact revisions.
A retained 204, 409, 400 or other status is an HTTP fact here, with no “applied” or
“rejected” inference. Reading existing proof never grants send/resume/retry
permission. Inspection works while disabled, subject to the existing read contract.

### Trusted writer order

All three methods require the same pending attempt and exact installation, stream
and attempt revisions. They use the normal enabled writer controls. They are
internal package APIs; there is no capture/import/send CLI or editable proof file.
Trusted producer provenance comes from the reviewed bound package and state/IAM
boundary, not from a digest or an asserted caller flag.

1. `begin` persists the pending intent before publication. Its publication list
   may be empty.
2. After actual append/readback validation of the typed manager comment, call
   `retainPublication({attempt_id, expected_installation_revision,
   expected_stream_revision, expected_attempt_revision, reference, now})`.
   The reference ticket and manager record UUID must equal this attempt's ticket
   and attempt UUID. This restriction does not apply to worker receipt references.
   Duplicate/competing/replacement manager references conflict. Only a confirmed
   retention permits continuing toward pointer publication; an unknown result
   stops that producer invocation.
3. Verify the published admission pointer, or preserve the existing assignment
   pointer for queue repair, using real provider facts. Then call
   `prepareTransitionCapture({attempt_id, expected_installation_revision,
   expected_stream_revision, expected_attempt_revision, transition_id,
   producer_invocation_id, publication_observations, now})`.
   Observations contain every retained reference's server author/update-author and
   created/updated values, plus `{mode, assignment}` for the exact pointer. The
   persistence boundary checks unchanged metadata, exact reference coverage and
   operation-specific pointer binding; the producer still verifies actual bodies,
   readback and role authorization. Admission uses mode `published` and this
   operation's manager reference. Queue repair uses mode `preserved` and its
   retained member's existing assignment, without replacing it with the queue
   comment. A successful fresh preparation is the state prerequisite for one send
   in that current invocation, alongside all normal producer checks. Existing
   capture, uncertainty or any failed result cannot be used to resume or resend.
4. After the original request has one completed response, call
   `recordTransitionResponse({attempt_id, expected_installation_revision,
   expected_stream_revision, expected_attempt_revision, request_digest,
   http_status, observed_at, provider_request_id})` once. A lost/partial transport
   response must not call it. The status must be 100–599; absent or unsupported
   provider request IDs are stored as null. Duplicate/conflicting responses fail
   without replacing original proof. This method never changes the pending outcome.

Each operation uses one transaction: update installation and attempt, condition-check
the matching pending stream without advancing its revision. Success returns
`data:{installation,stream,attempt}` with resulting records; use those exact
revisions in the next call. Other statuses return `data:null`. Existing extension
fields are merged and protected by the observed attempt revision. No auto-retry
or publication append is performed by these state methods.

### Capture and digest contract

The ten scalar extension keys are `pb_capture_version` (1),
`pb_capture_transition_id`, `pb_capture_request_digest`,
`pb_capture_publication_digest`, `pb_capture_package_revision`,
`pb_capture_invocation_id`, `pb_capture_prepared_at`, `pb_capture_status`,
`pb_capture_received_at`, `pb_capture_provider_request_id`. Package revision comes
from the validated binding; configuration digest stays in the immutable attempt.
Status/time are both null or both populated. Prepared-only provider request ID is
null. Times use bounded UTC-Z syntax. Up to six unrelated extension keys survive;
insufficient space fails before preparation. Existing 16-key, 32 KiB marshalled
record and 1 MiB transaction limits remain unchanged. No raw bodies, nested JSON,
new store, schema version or field retirement is introduced.

`transitionPublication` in `lib/state/contract.mjs` exports the reusable exact
tuple and JCS/SHA256 digest. Each reference tuple is
`[ticket_id,comment_id,record_id,digest]`. The commitment object is
`{comments:[[referenceTuple,author_id,update_author_id,created,updated],...],
pointer:[mode,referenceTuple]}`. Comments sort lexically by the JCS reference tuple;
duplicates or incomplete retained coverage fail. Reference object key ordering
and observation array ordering do not change the commitment.

`transitionRequestDigest` commits to version 1, method `POST`, route
`issue_transitions`, transition ID, exactly `{transition:{id}}`, publication digest,
and immutable identity: schema_version, installation_id, domain_id, record_id,
site, project_id, label, attempt_id, ticket_id, epic_id, issue_key, operation,
source_status_id, target_status_id, configuration_digest, created_at and cause.
Mutable revisions/outcome/response metadata are excluded. The UUID correlates
one request; it is not provider idempotency. Later consumers must reuse these
helpers and validate fresh real observations, rather than treating a digest as
proof of remote origin.

### Finite local proof packet

With the already prepared dependencies, the affected regression command is:

```sh
node --test test/manager-state-contract.test.mjs test/manager-state-cli.test.mjs
```

Export exactly the prescribed local groups to a new disposable directory:

```sh
node scripts/test-transition-proof.mjs --case R1-29-H01 --output /tmp/pgb137-h01-evidence
node scripts/test-transition-proof.mjs --case R1-29-H02 --output /tmp/pgb137-h02-evidence
node scripts/test-transition-proof.mjs --all --output /tmp/pgb137-all-evidence
```

H01 uses two fresh pending fixtures with original 204 and 409 responses; it
inspects prepared-only and restarted response state through the real command
boundary. H02 uses exactly nine fresh variants: stale revision, changed retained
reference, duplicate preparation, duplicate response, disabled controls, extension
capacity, record size, and persistence failure before/after write. The input set
is [the bounded synthetic fixture](../test/fixtures/transition-proof.json).
All providers and readback observations are simulated; no customer target,
credentials, provider URL or imported proof can be supplied to the driver.

The packet records exact Git revision/dirty flag, inputs, before/after records,
command output and provider-call audit with zero live AWS/Jira/worker calls. A
`confirmed_local_fixture` developer observation is separate from human acceptance.
Current packets explicitly retain `actual_core_integration:blocked` and
`human_acceptance:pending`, and exit 1: actual PGB-83/84 generated binding/resolver
composition is unavailable. Normal standalone inspect still reports
`CORE_PREREQUISITE`. There is no replacement resolver or human PASS.

Final completion requires the actual package composition and the Story's nine
release-source publication paths at their serialized handoff. Re-run the two
prescribed groups on that exact integrated tree, obtain human assessment and
retain evidence before deleting only disposable output. Do not repeat missing-core
proof or create live probes. Local checks, independent review, hosted CI,
installed acceptance, merge and activation remain separate gates.

## Reconcile a positively proved outcome

PGB-85 adds the evidence-only consumer and conditional state operation. Actual
PGB-82 history/receipt transport and PGB-83 installed binding/runtime projection
are still unavailable in this checkpoint. Normal use returns `CORE_PREREQUISITE`;
the private local fixture ports are not production substitutes. The original two
human groups and complete PGB-137 prerequisite remain pending actual composition.

After that integration, the operator journey is inspect, then submit one named
reconciliation request:

```sh
node scripts/manager-state.mjs inspect --config company.yaml --installation installation.json --kind attempt --record-id attempt:UUID --json
node scripts/manager-state.mjs reconcile --config company.yaml --installation installation.json --request request.json --json
```

Use a local regular file containing a closed JSON object, maximum 16 KiB:

```json
{
  "schema": "pigboard-reconciliation-request/v1",
  "attempt_id": "00000000-0000-4000-8000-000000000001",
  "disposition": "confirmed_applied",
  "expected_installation_revision": 5,
  "expected_stream_revision": 0,
  "expected_attempt_revision": 3
}
```

Use exact observed revisions for that installation/stream/attempt. The second
supported disposition is `confirmed_not_applied`. Duplicate, unknown, unsafe or
non-JSON fields are invalid before provider work. There is no receipt body,
operator identity, `drained`, force, endpoint, credential or provider-module field.
The configuration and generated receipt remain the only installation binding.
`--help` performs no provider calls.

### Positive proof and required observations

An original completed 204 for the exact retained transition-only request supports
`confirmed_applied`. An original completed 409 supports `confirmed_not_applied`
under the documented conflicting-update response contract. The 409 support is
documented, not historical live-observed acceptance. Both also require:

- matching original request/capture and exact immutable identity from PGB-137;
- fresh complete retained publication, actual server metadata and exact current
  assignment pointer, validated with the existing handoff/receipt-chain validators
  and canonical configured roles, stages and repositories;
- a complete requested native-history component within the bounded reader budget;
- a current designated installed operator and matching disabled/drained context.

History must explicitly say complete. Missing/unavailable history returns
`HISTORY_UNAVAILABLE`; incomplete pages/read returns `HISTORY_INCOMPLETE`.
Both hold even with a valid original 204/409 and otherwise valid observations.
A successful complete empty history list is different from an unread component.
History entries, ordering, timestamps, current status and elapsed time never
independently prove rejection or correlate an attempt. A 400, other status, lost
response, changed pointer or conflicting publication remains held.

Admission compares its published manager assignment. Queue repair reads the actual
retained member assignment through state, validates original ownership and fences
that read against installation/attempt/stream changes. It preserves the existing
assignment rather than treating the queue comment as a new admission pointer.
The original capture configuration and later stopped configuration have different
roles; stopping need not retain the original enabled configuration digest.

### Operator and stop boundary

The actual PGB-83 composition must obtain authenticated identity, designated role,
resource generation, deployed controls/code and complete Scheduler→Lambda delivery
bounds. STS identity alone is not permission: the principal must match the installed
operator role, and AWS must permit the conditional state transaction. Runtime
credentials are not an operator fallback.

Actor identity is reversible `aws:` plus unpadded base64url of UTF-8 JCS
`[account_id,user_id]`, with the exact native tuple at most 186 bytes. Unsupported
identity returns `OPERATOR_ID_UNSUPPORTED`; it is never hashed or truncated.

The installation retains twelve scalar stop fields: `pb_stop_version`,
`pb_stop_id`, `pb_stop_actor`, `pb_stop_config_digest`,
`pb_stop_package_revision`, `pb_stop_resource_digest`, `pb_stop_bounds_digest`,
`pb_stop_fence_revision`, `pb_stop_started_at`, `pb_stop_window_ms`,
`pb_stop_completed_at`, `pb_stop_elapsed_ms`. Existing 16-key/32 KiB bounds remain;
up to four unrelated fields survive. PGB-86 owns real disable, monotonic wait and
fresh completion; this Story adds no stop producer or command.

Both admission gates must be disabled, maintenance true and the actual schedule
disabled. Matching completed stop elapsed must cover the safe sum of actual
complete delivery bound, invocation timeout and enforced request timeout. Unknown
routes or unjustified bounds yield `BOUNDS_UNSUPPORTED`, not an assumed zero.
Package/config/resource/bounds generation changes invalidate the matching stop.
Ordinary reconciliation revision increments alone do not invalidate its stop ID.
This client-send drain cannot cancel an already-sent Jira request or replace
the original completed response proof.

The early `projectBoundRuntime` port is a private fixture composition capability,
with no production default, passthrough, local derivation or public input. It maps
only the prepared synthetic resource/bounds generation to its fixed commitments.
The actual PGB-83 shared projection and complete route derivation remain final
integration gates. Missing real capabilities remain `CORE_PREREQUISITE`.

### Result and recovery

The application reads once, obtains required fresh observations, assesses once and
conditionally persists once. It never calls a Jira mutation, pointer rollback or
worker launch. Only confirmed persistence returns the final installation/stream/
attempt records. The purpose-specific `reconcileAttempt` checks current disabled
controls, complete stop ID, original capture/disposition and all expected revisions
in one transaction. It clears only the same pending reference, retains all capture
and publication history, records disposition/operator/time, and leaves delivery
disabled and maintenance-held. Ordinary enabled `finalize` stays unchanged.

Readable and JSON commands expose the same result. Confirmed finalization exits 0;
held/conflict exits 1; invalid/unavailable/unsupported/uncertain/setup exits 2.
Unknown persistence returns `uncertain` with no success data. Inspect the same
attempt: it may still be pending or already finalized. Do not replay the Jira
request, create a new attempt, or infer failure merely from the lost response.
`REVISION_CONFLICT` requires fresh inspection before any later deliberate action.
Never erase state or relax a predicate to close an evidence gap.

### Finite developer packet and remaining human cases

The existing original PGB-84 driver commands and `--all` keep their three R1-14
groups. Run the two PGB-85 groups explicitly into new disposable directories:

```sh
node scripts/test-manager-state.mjs --case R1-15-H01 --output /tmp/pgb85-h01-evidence
node scripts/test-manager-state.mjs --case R1-15-H02 --output /tmp/pgb85-h02-evidence
```

H01 has exactly two fresh fixtures: matching original 204/applied and
409/not-applied. H02 has exactly seven: enabled runtime, in-flight invocation,
unknown/lost response, absent history, stale revision, wrong actor, changed pointer.
For absent history, valid capture and every other valid fact remain intact while
the required history observation becomes unavailable. Final acceptance must run
that variant through the actual PGB-82 fixture transport; the early callback is
explicitly a simulated normalization port.

Current packets record exact revision/dirty marker, synthetic inputs, before/after
state, command results, provider audit and zero live Jira/worker/AWS effects. They
report developer observations, actual integration Blocked and human acceptance
pending; exit 1 is intentional for this incomplete composition. No human PASS is
inferred from developer checks. Retain evidence before removing only disposable
output. Do not repeat missing-core probes or rebuild fixtures indefinitely.

Affected checks:

```sh
node --test test/reconciliation.test.mjs test/manager-state-cli.test.mjs test/manager-state-contract.test.mjs
```

Full delivery still needs actual PGB-82/83/84/PGB-137 composition, the two reserved
core install/template paths and installed operator IAM validation, the original
human groups/disposition, exact committed-code reviews, current required checks,
hosted CI/current-head bot and authorized merge/release. Delivery automations stay
inactive. No new comparative evaluation or skill work is part of this slice.
