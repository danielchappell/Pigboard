# Use the durable State API

PGB-84 supplies a callable Node API and the production DynamoDB adapter. A prepared
caller can inspect retained ownership, reserve an original attempt and finalize
that same attempt conditionally. This source API does not install AWS resources,
resolve customer configuration, publish to Jira or enable delivery.

PGB-83 owns the actual installation, generated resource binding and operator CLI.
Those commands are not part of this API release. PGB-137 owns original transition
capture; PGB-87 owns Jira effects. Installed AWS/Jira and human acceptance remain
separate from local API tests.

## Prepare dependencies and trusted inputs

Use Node.js 20+ and a reviewed source revision. Prepare dependencies before use:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm ci --prefix runtime/aws --ignore-scripts --no-audit --no-fund
```

The API never fetches or repairs dependencies. The nested runtime pins
`@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` to `3.1169.0`; missing or
mismatched nested packages produce `SETUP`, even if another copy is installed.
AWS uses the standard SDK credential chain. Never put credential values in the
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
PGB-83 must generate and verify this layout, retain the table on stack deletion or
replacement and refuse an empty replacement as authority. This API provisions
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
Attempt inputs contain UUID `attempt_id`, immutable ticket/Epic IDs, issue key,
operation, exact source/target status IDs, configuration digest and bounded
`cause`/`publication` reference lists. Ordinary callers use `admit_ready`.
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
