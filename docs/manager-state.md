# Use the durable State API

PGB-84 supplies a callable Node API and the production DynamoDB adapter. A prepared
caller can inspect retained ownership, reserve an original attempt and finalize
that same attempt conditionally. This source API does not install AWS resources,
resolve customer configuration, publish to Jira or enable delivery.

PGB-83 adds the source installation package, generated resource binding and bound
operator CLI described below. This branch adds **unreleased PGB-137 original transition capture**; PGB-87
owns Jira effects. Installed AWS/Jira and human acceptance remain separate from
local API and package tests.

## Prepare dependencies and trusted inputs

Use Node.js 20+ and a reviewed source revision. Prepare dependencies before use:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm ci --prefix runtime/aws --ignore-scripts --no-audit --no-fund
```

The API never fetches or repairs dependencies. The nested runtime pins
`@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` to `3.1169.0`; missing or
mismatched nested packages produce `SETUP`, even if another copy is installed.
Direct API callers may use the standard SDK credential chain; the bound operator
CLI instead verifies and injects its explicitly selected profile. Never put credential values in the
binding, configuration, records or logs. The prepared caller must have access to
only the intended installation's table.

The trusted host supplies these inputs; they are not permission to choose another
resource or bootstrap a replacement table:

- `binding`: `pigboard-aws-installation/v1`, installation/domain IDs, HTTPS Jira
  site, configuration digest, exact package commit, region, stack ID, table name
  and ARN, and installation generation. See `bindingSchema` in
  [the contract](../lib/state/contract.mjs).
- `control`: the same configuration digest and explicit `schedule_enabled`,
  `writes_enabled` and `maintenance` booleans from canonical configuration.
- For initialization only, a verified `fresh_installation` observation from the
  trusted installation host, with matching identity/configuration/generation,
  observation time, `new_installation:true` and `table_empty:true`.

The table uses string keys `PK` and `SK`, with no indexes, TTL or streams. The
adapter uses an installation partition and `I#`, `S#`, `M#`, `A#` record prefixes.
The PGB-83 host generates and verifies this layout, retains the table on stack
deletion or replacement and refuses an empty replacement as authority. This API provisions
nothing. It rechecks the table ARN, active state and emptiness before a conditional
initialization, only while scheduling/writes are disabled and maintenance is off.
An existing installation returns `ALREADY_INITIALIZED`; inspect it instead.

## Read retained work

A caller running from the reviewed checkout can import these functions. This
complete module function takes the host's prepared inputs; invoking it performs
bounded DynamoDB reads, so call it only with authorized access:

```js
import { createDynamoState } from './lib/aws/dynamodb.mjs';
import { projectRetainedInventory } from './lib/state/contract.mjs';

export async function readRetained(binding, control) {
  const state = createDynamoState({ binding, control });
  try {
    const result = await state.readInventory({ limits: {
      streams: 1000, members: 1000, pending_attempts: 1000,
      pages: 100, requests: 2000, milliseconds: 30000
    } });
    if (result.status !== 'confirmed') return result;
    return {
      result,
      supplied: { ...projectRetainedInventory(result.data), retained_complete: true }
    };
  } finally {
    state.close();
  }
}
```

Choose budgets for the authorized scope; those above are an example within the
API's ceilings, not a promise that every installation fits them. Inventory uses
strong reads and an installation-revision fence. Only a complete, coherent result
contains usable data. Project the complete result before native collection so
old ownership and pending intents remain visible after a key rename, issue move
or project removal. Incomplete, missing or changed data must hold selection; never
replace it with empty arrays and `retained_complete:true`.

`retained_members` contains ticket/project/Epic/full-label identity and nullable
assignment references. `pending_intents` contains project/full-label/ticket and
original attempt IDs. Null assignment is not proof that a native Jira pointer is
absent. These are retained State facts, not current Jira facts, complete PR history
or prior worker-comment metadata. A confirmed State read grants no Jira authority.

## Operations and results

All operations return `{schema,status,code,diagnostics,data}`. Only `confirmed`
results carry data. `conflict`, `invalid`, `unavailable`, `unsupported_version`,
and `uncertain` distinguish failures; inspect `code` and the safe diagnostic.
Missing prepared dependencies use code `SETUP` with status `unavailable`.
Diagnostics omit raw provider errors. The factory may throw an error with
`stateResult` for invalid setup/binding. `close()` releases an owned SDK client;
an explicitly injected client's lifecycle belongs to its caller.

| Operation | Input and result |
| --- | --- |
| `initialize` | Verified `fresh_installation` and ISO `now`; creates one disabled installation record or rejects. |
| `readInventory` | Explicit `limits` as above; returns installation, streams, members, pending attempts, `complete:true` and `controls_match`. |
| `inspect` | One `kind` (`installation`, `stream`, `attempt`, `member`), optional `record_id` or `cursor`, optional limit 1–100; returns a read-only page. |
| `readAttempt` | Original `attempt_id`; returns the installation, stream and attempt with a coherent revision check. |
| `retainMembers` | Expected installation revision, bounded member list and `now`; preserves original ownership and may conditionally advance assignment references. |
| `begin` | Expected installation/stream revisions, full stream identity, original attempt, required members and `now`; returns the reserved attempt and new revisions. |
| `finalize` | Expected installation/stream/attempt revisions, stream identity, original attempt ID, outcome, evidence and `now`; resolves only that matching pending attempt. |

`inspect` defaults to 50 records. Follow `next_cursor` with the same installation
and kind when `complete:false`. Do not combine cursor and record ID. Separate pages
are not one coherent inventory; use `readInventory` for scheduling inputs.

Member inputs contain site, immutable project ID, full label, Epic/ticket IDs,
assignment reference (or null) and expected revision (null only when absent).
A non-null assignment must reference the same immutable ticket ID as its member; null remains allowed.
Attempt inputs contain UUID `attempt_id`, immutable ticket/Epic IDs, issue key,
operation, exact source/target status IDs, configuration digest and bounded
`cause`/`publication` reference lists. Initial `publication` passed to `begin`
must not contain a reference matching both this attempt's `ticket_id` and its
`attempt_id` as the reference's `record_id`. Empty lists and prior references
that do not match both fields remain allowed. Retain the current manager reference
only after confirmed begin and append/readback validation, using
`retainPublication` before pointer publication. A matching initial reference
returns `invalid`/`INVALID_INPUT` with `data:null`, before any provider read or
write. Correct that never-persisted input; this does not authorize recreating an
attempt or replaying Jira after an earlier uncertain write.
Ordinary callers use `admit_ready`.
The retained schema also recognizes earlier designed operation names; this API
neither selects nor executes repair admission.

`begin` checks existing assignments without changing them, creates the original
pending attempt and reserves its stream in one conditional transaction. Every
required member must belong to that stream. Equal labels in different projects
remain independent. `finalize` takes `applied` or `not_applied` and evidence
`{references,disposition,actor_id}`; disposition must be `confirmed_applied` or
`confirmed_not_applied` respectively. The caller must establish that evidence's
meaning. This adapter does not authenticate Jira receipts or infer success from
current status. Reference fields are `ticket_id`, `comment_id`, `record_id`, `digest`.
See the [finite fixtures](../test/fixtures/manager-state.json) and
[contract tests](../test/manager-state-contract.test.mjs) for exact input examples.

## Holds and recovery

Reads remain available while disabled, in maintenance or under a different
configuration/package. `controls_match:false` exposes that mismatch. Mutations
require stored and caller configuration, package revision and controls to agree,
with schedule/writes enabled and maintenance off. The API has no enable/control
update, unlock, purge, reconciliation or retry operation.

SDK attempts are fixed at one; requests and operations have deadlines. The
existing limits are 32 KiB per record, 1 MiB/100 actions per transaction and 1000 records
per inventory kind. Oversized atomic operations are rejected, never split.
Records contain IDs, versions and bounded evidence references, not ticket bodies,
code or transcripts. Unknown schema/version, missing installation, ownership
conflict, exhausted bounds and changed revisions cannot become scheduling success.

After `UNCERTAIN_WRITE`, inspect the same installation and attempt ID. Persistence
may have happened even without a response. Do not repeat a Jira effect or use a
new attempt ID to bypass the hold. A stale finalizer cannot clear a newer pending
attempt. If a conflict requires later evaluation, obtain fresh complete facts;
this is not authorization to replay an uncertain action. Keep uncertainty held
until an authorized recovery path establishes its outcome. PGB-85 recovery
automation is deferred; raw state deletion is not a substitute.

## Check the API locally

Use the existing disposable packet; it cannot accept live resources or credentials:

```sh
node --test test/manager-state-contract.test.mjs test/manager-state-sdk.test.mjs
node scripts/test-manager-state.mjs --all --output /tmp/pigboard-state-api-evidence
```

The output directory must not already exist. H01 checks disabled initialization,
four record kinds and complete read-only projection. H02 checks competing callers,
before/after persistence faults and stale finalization. H03 checks independent
project ownership and preserved state under changed native-observation fixtures.
The packet records exact revision/dirty state, inputs, outcomes, stored records and
provider calls. Exit 0 means these local API assertions passed, not human or installed
acceptance. Every case keeps those outcomes pending. Retain evidence before removing
the disposable output. Do not overwrite older failed or blocked evidence.

PGB-83 retains the original H01 installation/CLI/live-preview and H03 actual
native-change-to-policy checks inside its existing installation cases. The source
packet deliberately does not claim to run that collector, Lambda or real DynamoDB.
Actual SDK serialization/copy/no-retry tests complement the simulated transaction
provider; installed AWS behavior remains separately verified under PGB-83/90.

## Bound customer CLI

The [installation guide](manager-installation.md) supplies package, bind and fresh
initialization prerequisites. The actual resolver verifies the selected operator's
canonical AWS role and the original generated resources on each command. Prepare
locked dependencies first; no command fetches source or packages.

```sh
node scripts/manager-state.mjs init --config /absolute/customer.json --installation /absolute/installation.json --operator-profile customer-operator --json
node scripts/manager-state.mjs inspect --config /absolute/customer.json --installation /absolute/installation.json --operator-profile customer-operator --kind member --limit 50 --json
```

Use `installation`, `stream`, `attempt` or `member` for `--kind`. Omit `--json` for
readable output. Use `--record-id ID` for one retained record or `--cursor CURSOR`
for the next page with the same installation and kind; these selectors cannot be
combined. Inspection remains read-only when canonical/applied controls differ.
Exit zero confirms the observation, one reports conflict/incomplete inventory,
and two reports invalid, unavailable or uncertain results. No resource, credential,
freshness, force, purge or unlock override exists.

Initialize only the original fresh disabled stack. Missing original creation
proof, an updated stack, an empty replacement or uncertain prior initialization
requires diagnosis and inspection of the same retained resources. Never generate
another installation to bypass it. Actual init/inspect use the explicitly verified
operator's injected State client, which the command closes even after failure;
ambient credentials cannot replace it. Operator IAM includes exact-table fresh
emptiness Scan and transactional Put/Update privileges for initialization/control
fencing. Those are real operator privileges, not runtime admission authority.
The preview runtime receives only exact-table reads and never Scan or mutations.


For a partial configure that changed the host package, use the **original** receipt
and explicit recovery inspection, keeping the desired canonical configuration:

```sh
node scripts/manager-state.mjs inspect --config /absolute/customer.json --installation /absolute/installation.json --operator-profile customer-operator --kind installation --recovery --json
```

`--recovery` works only with `inspect`; initialization rejects it before access.
The same four kinds, record selector, limit and cursor rules apply. Normal inspect
and health retain strict package validation and never fall back automatically.
Recovery still verifies the selected account/role, original stack/table/function/
schedule/roles, installation/domain/site and generation, and validates the retained
installation record. Missing, replaced or mismatched original identity is refused.
It never initializes an empty replacement.

The explicit `recovery` field in readable and JSON output warns
`package_verified: false`. Original receipt identity, authored desired controls,
mutable host observations and actual applied State identity are separately labelled;
null observations are unavailable, not verified defaults. The original receipt is
unchanged. A transient caller binding uses the validated desired configuration
digest solely to read State; it does not accept an observed package or persist a
new binding. Retained records and controls disagreement remain visible unchanged.
Exit zero confirms only the reported read, never package/runtime safety or health.
The flag grants no enable, apply, replay, rollback, clear or new-record authority.
Use the existing [stop command](manager-installation.md#deliberate-scheduling-and-stop)
to disable the verified original resources; preserve partial results and build
outputs for an authorized decision if strict current package binding remains
unresolved. Do not repeat configure or reconstruct a receipt to hide uncertainty.

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

1. `begin` persists the pending intent before publication. Start without the new
   manager reference: no initial entry may match both this attempt's `ticket_id`
   and its `attempt_id` as `record_id`. Empty lists and other prior references
   remain allowed under that condition. Append/readback and confirmed retention
   happen after begin, as follows.
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

With the already prepared dependencies, check the affected APIs and command:

```sh
node --test test/manager-state-contract.test.mjs test/manager-state-cli.test.mjs test/manager-state-sdk.test.mjs
```

Run the two prescribed groups once into a new disposable directory:

```sh
node scripts/test-transition-proof.mjs --all --output /tmp/pgb137-all-evidence
```

To run only an assigned group, replace `--all` with
`--case R1-29-H01` or `--case R1-29-H02` and use a new output directory. H01 uses
two fresh fixtures for original 204 and 409 responses. H02 uses nine fresh variants:
stale revision, changed retained reference, duplicate preparation, duplicate response,
disabled writer controls, extension capacity, record size, and persistence failure
before or after write. Inputs are the [bounded fixture](../test/fixtures/transition-proof.json).
No endpoint, credential, arbitrary proof file or customer target override exists.

The driver calls the actual PGB-83 `preparedCloud` fixture, bind/resolve functions
and `runStateCommand` with generated canonical configuration and installation
receipt paths and the selected `operator` profile. Simulated SDK providers sit
beneath the real resolver. Initial `init` runs while disabled. Only synthetic
stored State controls are then enabled to represent the trusted writer prerequisite;
canonical configuration and cloud function remain preview with writes disabled.
The production adapter prepares the pending attempt using that generated binding.
Subsequent readable and JSON inspection therefore reports `controls_match:false`
while the writer fixture is enabled. That mismatch is readable, never forged into
activation or writer permission. The disabled-controls variant restores matching
disabled values. Every inspection is read-only and disposes its selected-profile
clients. No fixture resolver substitutes an invented binding.

Evidence includes exact Git revision/dirty state, canonical inputs, generated
binding/receipt, independently assembled exact request/publication commitments,
before/after records, readable/JSON output, provider audit and zero live AWS/Jira/
worker calls. Each completed variant is retained separately before the group summary.
Exit 0 means the local assertions passed, with
`actual_core_integration:confirmed_local_simulated_providers` and
`developer_observation:confirmed_local_fixture`; `human_acceptance:pending`
remains explicit. A restart here creates fresh command clients over the same
retained simulated provider, not a real process-durable DynamoDB restart.
Exit 2 means invalid preparation or an assertion failed: preserve partial output
and diagnose that one failure before any bounded correction. Missing prepared
packages are prerequisites, never skipped acceptance or an invitation to install
dependencies during execution. Retain evidence before removing only disposable
output. Local checks, designated human assessment, installed/live acceptance,
independent review, hosted CI, merge and activation remain separate.
