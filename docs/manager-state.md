# Inspect durable manager state

This is an **unreleased PGB-84 implementation checkpoint**. The DynamoDB adapter,
local conformance fixtures and command boundary exist in this branch. Normal
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

The cloud-neutral state interface has seven methods: `initialize`, `readInventory`,
`inspect`, `readAttempt`, `retainMembers`, `begin`, `finalize`. The AWS module's
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
