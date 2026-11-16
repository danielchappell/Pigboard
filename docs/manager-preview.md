# Preview ready work and repairs locally

The offline manager preview answers which ticket could start in each exact Jira
site, immutable project ID and full numbered label. It is available in source and
the prepared `work-validator` bundle. It makes no provider calls, reads no
credentials and performs no writes, transitions, worker launches or activation.
A selection is a proposal with **no execution authority**. Live freshness and
permissions are not evaluated. Complete supplied facts are an assertion by the
caller, not proof that hidden Jira issues or inaccessible pages do not exist.

Repair ordering uses authenticated lineage and current QA. An unproved repair
waits with `LINEAGE_REQUIRED`; unrelated ready work cannot bypass it. A
current, exactly bound canonical QA envelope may account for a member's retained
request obligations. Keep those request lists and historical references intact;
preview does not clear or rewrite them. Human acceptance is separate from these
synthetic fixtures and local regression results.

## Prerequisites and commands

Use Node 20+ and a normally prepared approved revision. For a source checkout,
prepare dependencies once with `npm ci --ignore-scripts --no-audit --no-fund`.
For installed use, follow the [installation guide](https://github.com/danielchappell/Pigboard/blob/6be2ae10ebefcfaf64bf051a3d461f6db407a1be/docs/install.md); the release receipt
identifies the stable skills location. Preview never fetches or repairs modules.
Use the single [canonical configuration](configuration.md), its explicit native
mappings and separate complete snapshot observations described below.

```sh
node scripts/manager-preview.mjs --help
node scripts/manager-preview.mjs --config /tmp/config.json --input /tmp/snapshot.json
npm run manager-preview -- --config /tmp/config.json --input /tmp/snapshot.json --json
node /opt/pigboard/skills/work-validator/scripts/manager-preview.mjs --config /tmp/config.json --input /tmp/snapshot.json --json
```

Substitute the actual receipt's skills path for `/opt/pigboard/skills`. Any command
can run from an unrelated working directory when its script/input paths are
absolute. Flags occur once. Optional `--expected-site https://jira.example.invalid`
binds the supplied site to an independently expected origin. Optional
`--expected-snapshot-digest sha256:...` holds the whole scan if a previous actual
preview's digest differs. The digest covers both the authored configuration digest
and the entire original parsed snapshot. It is SHA256 of RFC8785 canonical JSON
`{configuration_digest,snapshot}`, UTF-8 without a trailing newline. It is an
offline changed-input guard, not a fresh provider read, lock or durable intent.

Inputs must be local regular files. There is no stdin, URL, output-file or repair
option. Use `./--name` or an absolute path for a filename resembling a flag. Help
works without installed dependencies. Exit 0 means a complete evaluated selection
or wait; exit 1 means invalid, held, partial or changed input; exit 2 means usage,
file-read, setup or internal failure. Ordinary repair/capacity/paused waits are
explicit evaluated results. JSON stdout is exactly one result. Human output begins
with the local-only limitation and gives each scope, decision, counts, selection,
then relevant recovery reasons and candidate errors.

## Supplied snapshot contract

Outer input is one JSON object, `schema: pigboard-manager-snapshot/v1`. Every field
below is required. Unknown fields, duplicate keys/identities and unsafe scalars
reject the input with no selections. Nested declared objects are closed too.
IDs are quoted decimal strings; keys/labels/attempt identifiers are nonblank
strings at most 255 Unicode characters. Labels match a configured worker prefix
followed by digits, preserving the full suffix and leading zeros. Display keys and
board IDs never replace immutable project identity. Native types/stages come
only from canonical configuration, never Jira names/categories or snapshot maps.

| Field | Complete supplied value |
| --- | --- |
| `site` | Exact configured HTTPS Jira origin. |
| `discovery_complete`, `retained_complete` | Explicit booleans asserting full configured discovery and retained ownership/intent inventory. False holds the whole scan; a failed read cannot become empty-and-true. |
| `projects` | Exactly one `{project_id,complete}` per configured immutable project; false holds that project. Extra/missing/duplicate identities reject scope. |
| `issues` | Native facts `{id,key,project_id,type_id,status_id,parent_id,labels,format,body,context_body,pointer,required_requests}`. `parent_id` is ID/null; labels unique; format `yaml`/`adf`; body/context are original raw strings/null; pointer is canonical work pointer/null; request references have exact ticket/comment/record/digest fields. Null or malformed preparation work is inventory, never permission to start. |
| `retained_members` | `{ticket_id,project_id,epic_id,label,assignment}` preserving original ownership and exact stored assignment reference/null. Never omit known active/queued/Blocked/Human Review members. Conflicting rows hold all affected scopes; identical rows reject. |
| `stream_checks` | Exactly one `{project_id,label,known_ids_complete,repair_inventory_complete}` for every scope in the union of Epic plans, relevant native labels, retained members, pending intents and repairs. Missing/false checks hold; there is no implicit true. |
| `pending_intents` | Every unresolved `{project_id,label,ticket_id,attempt_id}`. Presence holds the claimed scope and every known member scope for that ticket. No clearing, expiry or inferred outcome exists here. |
| `required_repairs` | `{project_id,label,ticket_id,reason,references}`, reason `required_request`/`required_stack_update`; nonempty canonical references. Every side-list reference must also occur exactly in that member's native `required_requests`. Accounted-for obligations stay recorded; list presence alone is not an eternal hold. |
| `completion_receipts` | Original JSON text strings of complete `pigboard-receipt-input/v1` envelopes, `consumer: manager`, targeted to each relevant member whose current QA is needed. Duplicate target tickets reject. These are supplied envelopes, never file paths/URLs to fetch. |

See the [canonical handoff guide](handoffs.md), [work pointer schema](../contracts/work-pointer-v1.schema.json)
and [runnable synthetic snapshots](../test/fixtures/manager-candidates.json).
Each raw work/context pair must pass the existing start validator. Context subject
keys match native keys, repositories belong to configured repositories, and graph
edges match the actual supplied prerequisite requirements. Original raw YAML/ADF
validation preserves allowed finite floating literals. No parsed-value shortcut
replaces the canonical start validator.

Only active opted-in Epics compete for ownership. A paused opted-in Epic waits;
unknown native stages hold. The manager unions all ordered, native and retained
members before counting. Active, queued, Blocked or Human Review members outside
current valid membership hold rather than disappear through a Ready-only filter.
Relabel/parent/project mismatches retain old and proposed scopes. An independent
unstarted preparation/Ready member may be removed when no retained assignment,
pending intent, repair/native-request obligation or incoming prerequisite requires
it. Removal/cancellation is never completion.

Known obligations remain attached to their ticket. A pending attempt holds both
its claimed scope and every established member scope, even if its supplied project
or label disagrees with native facts. A repair row whose claimed scope contradicts
established membership holds those scopes with `MEMBERSHIP_MISMATCH` at
`/required_repairs/<index>`. Correctly scoped unproved repairs still wait; exact
native request binding and strict current proof are required before reporting
`REPAIR_ACCOUNTED_FOR`. Missing obligation diagnostics retain both the native
request location and any relevant `/required_repairs/<index>` declaration.
Assigned native-bound proof gaps keep their native location. Unrelated complete
streams can continue.

An unlisted preparation/Ready/cancelled ticket is not safely removable while it
has a pending intent, advertised repair or native request obligation, even before
a pointer is published. Retain those rows and reconcile native, retained and
claimed identity through the owner. Obtain complete exact native requests/current
proof before treating repair as accounted. Do not migrate, expire, delete or
replay the attempt, rewrite published evidence, or infer completion from an empty
list. Preview performs none of those actions.

A ticket still declared in an Epic's stream order must have that Epic as its
native parent. For example, declared ticket `1001` with a null or different parent
holds the declaring stream at `/issues/<index>/parent_id`, even when it is Ready,
in preparation or cancelled. This also applies to paused or non-opted declarations;
another correct declaration cannot waive a contradictory one. Reconcile the actual
parent and order with the human owner. Genuinely removed independent unstarted
work may remain removed under the rule above. Malformed unrelated Ready work with
coherent native membership is instead reported and skipped while valid candidates
can proceed. Do not edit supplied facts or drop active work to obtain a selection.

A current label alone cannot prove that an unlisted native child's former stream
is free. For example, an active child removed from its parent's only stream order
and relabeled from `stream-1` to `stream-2` still counts in the known parent stream;
both affected scopes hold. If that parent declares both streams and neither order
nor a coherent retained owner locates the child, both parent streams hold with
`MEMBERSHIP_MISMATCH` at the child's issue path. Occupancy remains in its observed
stream; preview does not invent a former stream or copy the count into siblings.
A listed child or coherent retained owner resolves which parent stream it belongs
to; independent, safely removable unstarted work does not create this ambiguity.
Reconcile the actual order, native identity and retained facts with the owner;
never remove active work or rewrite retained rows just to obtain a selection.

Completion requires native Human Review or configured accepted-later status and
canonical receipt validation with current AI-QA completion established. The
receipt's trusted site/maps/actors/repositories, issue identity/stage/stream,
requirements digest/raw body/context, current pointer and required requests match
the outer facts. Retained assignment references match each receipt's manager
assignments. Current metadata, complete comment pages, immutable records, PR
revisions, evidence and all repair roots remain the existing validator's job.
Receipt-only evidence permissions are supplied trusted observations; tickets do
not grant access. A nested completion for another member is not a substitute for
that member's targeted current envelope. No human merge gate is added.

For dependent admission, every advertised repair reference for its prerequisite
must occur exactly in that prerequisite's native requests, and strict current
completion must still succeed. Qualification follows the ticket ID across all
advertised rows and claimed scopes; one covered row cannot waive an uncovered one.
A canonical receipt may remain valid for the original native facts while a newly
advertised, unrepresented repair keeps the dependent waiting with
`PREREQUISITE_UNSATISFIED`. Reconcile complete authoritative native requests and
current completion through the owner; do not edit published receipts or remove
advertised rows to obtain selection. Independent eligible work can continue.

Missing native facts keep their affected-scope hold and unknown counts. A missing
side-list ticket's `MISSING_KNOWN_ID` path identifies its actual original row:
`/retained_members/<index>`, `/pending_intents/<index>` or
`/required_repairs/<index>`. Use that location to obtain the missing facts while
preserving the row; the corrected path does not make an incomplete snapshot safe.

## Policy and result

Every known In Progress, In Review or QA Story/Bug occupies the stream. Multiple
active issues hold without interrupting either cycle. Blocked work and unresolved
intents hold. Human Review counts include Bugs and pending human checks; a new
return must keep the count at or below five. Accepted-later statuses free the Human
Review count while preserving lineage. Counts remain available when supplied
native facts establish them, including ownership holds; missing/incomplete or
unmapped classification reports unknown, never zero.

Only valid current Epic-ordered native Ready to Work Stories/Bugs are candidates.
Invalid independent candidates report errors and can be skipped. Every
prerequisite needs exactly bound current canonical QA. Eligible Bugs precede
Stories; Epic order breaks ties. Full labels and project IDs isolate capacity and
ownership even when two projects use the same label or native status IDs.

The fixed `pigboard-manager-preview/v1` result contains `valid`, `status`,
`validation_scope: supplied_snapshot`, `live_freshness: not_evaluated`,
`permission: not_evaluated`, `destination_authority`, `execution_authorized: false`,
`writes: 0`, `configuration_digest`, `snapshot_digest`, `scope_diagnostics` and
`streams`. Status is `invalid`, `held`, `partial` (independent selections or queues coexist
with holds) or `complete` (including ordinary waits). Invalid input has null
digests and no streams. Diagnostics contain stable code/path/scope/message; raw
bodies, unknown keys, secrets and file paths are never echoed.

Each stream contains exact `scope`, `epic_id`, `decision: select|queue|wait|hold`,
`selected_ticket_id`, `selected_key`, `occupied_ids`, `blocked_ids`,
`human_review_ids`, `counts_complete`, `return_count`, `reasons`, `candidates`, `proposal` and `repair_order`.
When several active opted-in Epics claim one stream, it holds with `epic_id: null`
and an empty `candidates` list. There is no chosen owner. Each claimant has its own
`OWNERSHIP_CONFLICT` reason and scoped diagnostic identifying its native Epic ID
and `/issues/<index>/id` in the supplied snapshot. Readable output shows the same
IDs and paths. Only validated native IDs enter these generated messages. Reconcile
the competing Epic ownership with the human owner; do not remove active work or
assume the first Epic in the input has authority. Other streams retain their own
ownership, counts and decisions.

Selection fields name the target on `select` or `queue` and are otherwise null; return count is known Human Review
count+1 or null when unknown. Candidates contain native ticket ID/key, `kind`,
`eligible` and reasons. Streams and diagnostics have deterministic ordering; no
clock/timestamp enters the decision. The pure API is
`previewSnapshot(configRaw,snapshotRaw,{expectedSite?,expectedSnapshotDigest?})`
from `lib/manager/decisions.mjs`, accepting raw UTF-8 strings/bytes only.

## Limits and recovery

Outer snapshot: 16MiB UTF-8, depth48, arrays1000, projects100, Epics100,
issues1000, streams/retained members/intents/repairs1000 each, receipts100.
Work/context retain 65,536-byte bounds; ADF body 262,144 bytes; embedded receipt
8MiB and its existing depth/list restrictions. All embedded material together
must fit the outer bound. Configuration retains 1MiB and supports 1000 projects,
but this preview returns `LIMIT` above100 rather than sampling. These are local
fixture bounds, not AWS, production throughput or whole-install capacity claims.

| Reason | Recovery |
| --- | --- |
| `STRUCTURE`, `SCOPE`, `LIMIT` | Correct the declared shape, configured identity or local input size; no partial selection exists. |
| `INCOMPLETE_SNAPSHOT`, `INCOMPLETE_PROJECT`, `INCOMPLETE_STREAM`, `MISSING_KNOWN_ID` | Obtain complete authorized facts and checks; preserve retained IDs and failed-read uncertainty. |
| `MEMBERSHIP_MISMATCH`, `OWNERSHIP_CONFLICT`, `UNKNOWN_STATUS` | Reconcile original/current ownership or explicit canonical mapping with its human owner; retain both affected scopes. |
| `PENDING_INTENT`, `BLOCKED`, `INCONSISTENT_OCCUPANCY` | Use owner handling; preview cannot unblock, clear, expire or stop workers. |
| `NO_OPT_IN`, `EPIC_PAUSED`, `OCCUPIED`, `HUMAN_REVIEW_CAP` | Wait for authorized native workflow changes; existing cycles continue. |
| `INVALID_WORK`, `NO_READY_CANDIDATE`, `PREREQUISITE_UNSATISFIED` | Correct reviewed requirements/context or supply coherent current completion; cancellation alone cannot satisfy prerequisites. |
| `LINEAGE_REQUIRED`, `REPAIR_PROOF_INVALID` | Preserve all causes; obtain authentic missing receipts or reconcile supplied evidence through its owner. Historical proof never replaces current parent QA. |
| `PARENT_REPAIR_PENDING`, `STACK_REQUEST_PUBLICATION_REQUIRED` | Wait for current full parent QA or obtain the missing publication through its authorized writer. Never guess references or replay an uncertain publication. |
| `PR_HUMAN_HANDLING` | Ask the owner to resolve the terminal PR or scoped-fix limitation; preview cannot create a replacement PR. |
| `REPAIR_ACCOUNTED_FOR` | Informational canonical proof only; requests, assignments and state remain unchanged. |
| `CHANGED_INPUT` | Review a new actual preview; never repeat an old proposal automatically. |
| `SETUP`, `INPUT` | Prepare the approved runtime outside preview or supply readable regular files; failed installation preserves the previous stable release. |

## Reproduce the three prescribed human cases

These commands prepare disposable fixture files; the preview command itself
writes nothing. They are aids for a human to execute and inspect, not recorded
human acceptance. First, from the source checkout (or set `bundle` to the actual
installed `work-validator` directory), export any named fixture:

```sh
bundle="$PWD"
export PGB_PREVIEW_FIXTURE_DIR="$(mktemp -d /tmp/pigboard-preview.XXXXXX)"
node --input-type=module - "$bundle/test/fixtures/manager-candidates.json" "$PGB_PREVIEW_FIXTURE_DIR" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const [file,destination]=process.argv.slice(2);
for(const c of JSON.parse(fs.readFileSync(file)).cases){
 const dir=path.join(destination,c.id);fs.mkdirSync(dir);
 fs.writeFileSync(path.join(dir,'config.json'),JSON.stringify(c.config));
 fs.writeFileSync(path.join(dir,'snapshot.json'),JSON.stringify(c.snapshot));
 fs.writeFileSync(path.join(dir,'expected.json'),JSON.stringify(c.expected));
}
NODE
```

**R1-10-H01:** run all29 named scenarios S01–18/S30–40. Inspect exact scope,
selection, reason and return count against each `expected.json`. S09/S10/S14/S15
wait for authenticated repair history. S38 intentionally holds with a different digest.

```sh
for id in S{01..18} S{30..40}; do
  extra=(); [ "$id" != S38 ] || extra=(--expected-snapshot-digest "sha256:$(printf '%064d' 0)")
  node "$bundle/scripts/manager-preview.mjs" --config "$PGB_PREVIEW_FIXTURE_DIR/$id/config.json" --input "$PGB_PREVIEW_FIXTURE_DIR/$id/snapshot.json" "${extra[@]}" --json
  cat "$PGB_PREVIEW_FIXTURE_DIR/$id/expected.json"
done
```

The loop uses bash/zsh array syntax. It deliberately continues after expected
exit1 holds. Rerun any selected/held case without `--json` to inspect readable
output. Also inspect `repair-prerequisite-complete`,
`repair-independent-complete`, and `stack-independent-complete` to verify
post-repair selection with request lists retained.

**R1-10-H02:** inspect filtered missing known-ID, retained mismatch, unknown status,
and queued repair plus otherwise Ready work. Verify no selection and unknown
counts only where inventory/classification is actually unknown.

```sh
for id in S36 S31 S32 S35 S09; do
  node "$bundle/scripts/manager-preview.mjs" --config "$PGB_PREVIEW_FIXTURE_DIR/$id/config.json" --input "$PGB_PREVIEW_FIXTURE_DIR/$id/snapshot.json"
  cat "$PGB_PREVIEW_FIXTURE_DIR/$id/expected.json"
done
```

**R1-10-H03:** identical labels in two projects: A full/B room, then swap, then
second active owner only in B. Confirm capacity/ownership never transfers between
projects; inspect the complete expected scope set.

```sh
for id in H03-A-full H03-B-full H03-B-conflict; do
  node "$bundle/scripts/manager-preview.mjs" --config "$PGB_PREVIEW_FIXTURE_DIR/$id/config.json" --input "$PGB_PREVIEW_FIXTURE_DIR/$id/snapshot.json" --json
  cat "$PGB_PREVIEW_FIXTURE_DIR/$id/expected.json"
done
```

Record before/after input hashes and directory inventory to confirm zero writes.
Do not count fixture export/setup writes as preview writes. Source and installed
regressions execute these same literal fixtures with actual copied dependencies;
they establish local supplied-snapshot behavior, not live Jira observations or
human acceptance. Cleanup only your disposable fixture directory after inspection.

## Conflicting completion observations

Individually valid completion envelopes can disagree about one supplied comment,
requirements context, current assignment, PR revision or evidence observation.
Preview compares their canonical observations before accepting completion proofs.
A contradiction holds every established affected scope with `REPAIR_PROOF_INVALID`
at `/completion_receipts/<index>`. If another scope has coherent evidence, it can
still receive a selection and the overall result is `partial`.

For example, two current QA envelopes can observe the same PR revision as open
and merged. Run the source command above, or the actual installed script with the
same inputs. Both report the conflict without exposing its raw body or URI.
Neither observation wins by list order, including when a third receipt repeats
either value. The scope's owner must refresh and reconcile the supplied facts,
then preview the new snapshot. Preview cannot authorize a replay or repair.

A valid current completion still works with an empty retained-history list.
Malformed or unbound receipts grant no completion authority and keep their
existing handling. The same canonical observation index also checks authenticated
historical envelopes before accepting repair facts; history alone grants no current
completion.

## Offline repair proposals

PGB-149/R1-35 supplies the complete source API and JSON CLI result. PGB-146
completes readable parity: each proposal names every canonical cause in the same
order as `proposal.roots`, including own-ticket repairs without a parent. The full
repair fixture ships in the prepared installation; its eighth semantic check runs
before stable-link replacement. Source publication and designated human acceptance
remain separate.

Each `Cause:` line gives the immutable native ticket ID, comment ID, record UUID
and full SHA256 digest. Together these four fields identify the exact retained
reference; the ticket ID is not a display key. Empty roots or a null proposal add
no Cause lines. These identities grant no execution or publication authority.

The preview accepts optional `repair_receipts`, an array of existing raw
`pigboard-receipt-input/v1` JSON strings. It shares the 100-envelope limit with
`completion_receipts`. Supply complete current outer native/configuration facts
and exact retained server metadata for each historical closure. Historicity never
establishes current completion: only a separately valid, exactly bound current QA
envelope satisfies a prerequisite or covering parent.

Each stream returns `proposal` (or null) and `repair_order`. The three possible
proposal kinds are `admit_new` (Ready to Work → In Progress), `admit_repair`
(Rework Queued → In Progress), and `queue_stack_update` (Human Review → Rework
Queued). All retain `execution_authorized:false`. Queueing does not admit work,
change an assignment pointer or launch a worker. One coherent unrelated active
member or five Human Review observations may still permit a queue-only proposal;
the admission-capacity explanation may remain visible without blocking that queue.
Blocked work, pause, pending intents and incomplete/contradictory scope suppress it.

Proposals preserve `existing_assignment`, observed `existing_pr`, actual direct
`request_refs`, deduplicated immutable `roots`, `required_parent` and
`child_completion`. `required_stack_updates` contains existing-schema payload
inputs for missing publications. `publication_required:true` means the authorized
writer must publish that payload before execution; it supplies no prospective
UUID, actor, timestamp, operation or reference. The proposal does not publish it.
Observed Human Review IDs/counts remain unchanged; a queue edge projects one fewer
Human Review ticket without granting admission capacity to another proposal.

Each represented assignment in a ticket's authenticated current lineage must have
one coherent logical QA result (ticket ID, record UUID and digest). Identical
publications with different comment IDs are one logical result; current assignment
and authority binding still use exact references. Competing completions yield
`REPAIR_PROOF_INVALID` and cannot be chosen by envelope order. Reconcile the
observations through their owner while preserving retained causes.

Identical authenticated copies of a QA result do not require another stack-update
publication. Preview uses a stable authenticated child completion and preserves
the exact published request references and bodies. Current-parent authority still
uses its exact current QA proof; an equivalent historical parent endpoint may
establish coverage only for the child's exact recorded incorporated cutoff. A
genuinely missing request still requires publication, and different logical QA
results still conflict.

Retained native requests remain evidence. The next own admission includes only
direct requests not consumed by completed same-ticket history on the exact current
assignment lineage. Implementation or review alone cannot account for a request.
Descendants still require every root consumed after their actual incorporated
parent cutoff, even when the latest parent directly consumed only a newer cause.

Ordinary Ready to Work candidate flags describe local readiness. A queued repair
is eligible for admission only when the stream's existing safety, occupancy and
capacity gates also permit it. A `ready` repair-order explanation can remain visible
while that queued candidate waits for a gate to clear; it does not authorize action.
Priority still chooses among eligible work. Neither eligibility nor a proposal
grants execution authority. A queued B can be eligible while its nonexecuting
proposal still requires a missing stack publication. A Human Review child selected
for a queue-only edge (B at checkpoint02 or C at08) remains ineligible for admission.
Required publication, current proof and availability keep their separate meanings.
An already queued repair still reports required publication while a gate prevents
its proposal; the warning does not permit publication or bypass that gate.

Necessary ready prerequisites precede required repairs, followed by eligible Bugs
and Stories. Actual recorded immediate-parent lineage determines stack repair;
Repair-order explanations use that authenticated dependency depth; only unrelated
ties use Epic order. Shared labels and ordinary prerequisites do not create
code-parent edges. Old findings remain applicable until verified incorporation at the actual
child cutoff. A newer parent's direct request list cannot erase older causes that
the child has not incorporated.

Repair admission uses the current observed PR's source revision and target branch.
Older completion and request PR references remain authentic history; observing a
new revision does not prove QA for that revision. Admission references contain only
the five PR fields, without observation-only state or current flags.

A new stack-update payload must match both its immutable child QA completion and
the current observed child PR. If the source or target has changed, preview waits
with no proposal and a `human_hold` repair-order entry. `PR_HUMAN_HANDLING` asks
the child-QA owner for coherent completion evidence for the current source and
target. Retain existing causes and history; do not edit old QA or substitute the
new observation as QA proof. A valid already-published request remains history:
when no new payload is needed, an otherwise eligible repair can still be admitted
with the current PR reference.

`LINEAGE_REQUIRED` means supply authenticated repair history;
`REPAIR_PROOF_INVALID` means replace incoherent/unbound supplied evidence.
An authenticated unfinished child dependency wait leaves that child queued while
its proven upstream repair can progress. This does not imply successful child QA
or grant permission to admit the child.

`PARENT_REPAIR_PENDING` waits for current full parent QA, and
`STACK_REQUEST_PUBLICATION_REQUIRED` reports the missing publication payload.
Known merged/closed child PRs require human handling. These are local supplied
observations; live PR preflight, freshness, permissions, actual writes and worker
execution belong to later integrations.

The exported legacy `manager-candidates.json` includes 66 preserved inputs. Its
five incomplete repair seeds now wait for authentic lineage, rather than future
implementation. Their revised `expected.json` values are exported directly.
Complete synthetic native repair scenarios and all nine H02 checkpoints live in
`manager-repairs.json`; all 42 designated human cases remain NOT_RUN.

### Reproduce a repair queue and admission

The source fixture contains complete synthetic receipt envelopes and fixed reports
for the checkpoints, scenarios and normalization cases, plus `OC01-selection`.
The export prepares all three PGB-149 cases: `H02-06-a3-full-qa-u2-unpublished`,
`OC01-selection` and `S06-second-configured-accepted-stage`. OC01 keeps its original
inputs and options with its current full expected report. Export works from the source
checkout or the prepared installation. For the installed route, set `bundle` to the
`skills/work-validator` directory under the actual installation receipt’s release
path. The fixture supplies 67 export filesets, including OC01; the comparison loop
contains 66 inputs. Export writes only disposable files; preview writes nothing:

```sh
bundle="$PWD" # Source checkout, or the actual receipt release + /skills/work-validator.
export PGB_REPAIR_FIXTURE_DIR="$(mktemp -d /tmp/pigboard-repairs.XXXXXX)"
node --input-type=module - "$bundle/test/fixtures/manager-repairs.json" "$PGB_REPAIR_FIXTURE_DIR" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const [file,destination]=process.argv.slice(2);
const fixture=JSON.parse(fs.readFileSync(file));
const ownId='OC01-selection';
const ownInputs=fixture.inherited_own_preview.original.cases.filter(c=>c.id===ownId);
const ownReports=fixture.inherited_own_preview.cases.filter(c=>c.id===ownId);
if(ownInputs.length!==1||ownReports.length!==1||!ownReports[0].expected)
 throw new Error(`Missing or ambiguous preserved input/current expected report for ${ownId}`);
const [ownInput]=ownInputs,[ownCurrent]=ownReports;
const cases=[...fixture.cases,...fixture.scenarios,...fixture.normalization.cases,
 {...ownInput,expected:ownCurrent.expected}];
for(const c of cases){
 const dir=path.join(destination,c.id);
 fs.mkdirSync(dir);
 for(const [name,value]of Object.entries({config:c.config,snapshot:c.snapshot,options:c.options??{},expected:c.expected}))
  fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(value));
}
NODE
# Pick any exported checkpoint/scenario/normalization ID or OC01; options retain drift/site guards.
id="S06-second-configured-accepted-stage"
node --input-type=module - "$bundle" "$PGB_REPAIR_FIXTURE_DIR/$id" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const [root,dir]=process.argv.slice(2),options=JSON.parse(fs.readFileSync(path.join(dir,'options.json'))),expected=JSON.parse(fs.readFileSync(path.join(dir,'expected.json')));
const args=[path.join(root,'scripts/manager-preview.mjs'),'--config',path.join(dir,'config.json'),'--input',path.join(dir,'snapshot.json')];
for(const [key,flag]of [['expectedSite','--expected-site'],['expectedSnapshotDigest','--expected-snapshot-digest']])if(Object.hasOwn(options,key))args.push(flag,options[key]);
for(const json of [true,false]){const p=spawnSync(process.execPath,[...args,...(json?['--json']:[])],{encoding:'utf8'});process.stdout.write(p.stdout);process.stderr.write(p.stderr);assert.equal(p.status,expected.status==='complete'?0:1);if(json)assert.deepEqual(JSON.parse(p.stdout),expected);}
NODE
```

If export reports a missing or ambiguous OC01 record, stop and retain the error
and disposable directory. Do not substitute a historical expected report. Resolve
the source mismatch before retrying with a fresh `mktemp` directory. Retain any
partial export on other errors; do not overwrite an existing case directory.

At checkpoint 02, B's old assignment remains intact. Its `queue_stack_update`
proposal names A's actual repaired completion and R1, with missing publication
payload inputs and `publication_required:true`. At checkpoint 07, B is already
queued and both U1 and U2 exist. Its `admit_repair` proposal retains both request
references, R1 and R2, and A's actual A3 completion; `publication_required:false`
does not grant execution authority. C still waits for B's own repaired QA.

Compare each complete JSON result with the exported `expected.json`, record input
hashes and inspect the readable explanation. Keep the native case instructions in
`native_cases` for the prescribed human acceptance; these local examples do not
mark any human case passed. Missing lineage requires authentic retained receipts;
a missing publication requires its authorized writer. Replacing a snapshot or
getting a successful preview does not authorize a transition or replay.

For direct source API use, read the same exported files and options:

```js
import fs from 'node:fs';
import {previewSnapshot} from './lib/manager/decisions.mjs';
const result=previewSnapshot(fs.readFileSync(configFile,'utf8'),fs.readFileSync(snapshotFile,'utf8'),JSON.parse(fs.readFileSync(optionsFile,'utf8')));
```

`configFile`, `snapshotFile` and `optionsFile` are the absolute exported paths.
The API returns the same complete structured value as JSON CLI output. Preserve
input hashes and full fixed comparisons; successful local checks do not mark any
of the original42 human cases, or R1-32's and R1-35's two human routes each, as passed.

## Inspect named Jira issues

The source checkout provides **requested-issue inspection** through an importable
library. A prepared installed `work-validator` copy is a later delivery.
This is a read-only library, separate from offline selection above. It reads the
supplied immutable issue IDs, assignment pointers, all visible comment pages and
named exact comments. It does not discover a domain, evaluate admission or prove
receipts. There is no production live CLI. Node 20+, a reviewed source checkout
with its existing prepared dependencies, the canonical configuration's Jira
connection and all eleven explicit read bounds are required. Site/cloud binding,
credential access and visibility are operator
prerequisites; a successful call cannot certify invisible work absent.

```js
import { inspectJiraIssues } from './lib/jira/read.mjs';
// configText is UTF-8 authored configuration; resolveSecret is a trusted,
// already prepared in-process capability, never loaded from a ticket or URL.
const result = await inspectJiraIssues(configText, {
  issue_ids: ['1000'],
  comment_targets: [{ ticket_id: '1000', comment_id: '2001' }]
}, { resolveSecret });
console.log(JSON.stringify(result.report));
```

Resolve once using `resolveSecret(reference, signal)`, returning a nonempty token
of at most 16 KiB without control characters. The callback owns its I/O and must
stop it and settle on abort. The library fences late results and starts no Jira
work after its total deadline. `cleanup.resolver: cancel_unconfirmed` means the
caller must confirm its own cleanup before another attempt; JavaScript callbacks
cannot be forcibly stopped. Callback errors and credential/reference values never
appear in reports. B-owned streams and timers are closed before return.

The request has exactly `issue_ids` and `comment_targets`, with decimal-string IDs
of 1–255 characters, unique entries and targets belonging to supplied issues.
Comment targets are unique by the pair of `ticket_id` and `comment_id`; member
order does not change that identity. Duplicate pairs fail before credential
resolution or requests.
Empty issue lists, accessors, extra keys, non-JSON values and requests over
1 MiB/depth16/list1000 fail before credential resolution. The canonical configured
known-issue/comment bounds apply too. An issue outside configured project IDs has
no pointer/comment follow-up. Only fixed gateway HTTPS GETs are used; certificate
and hostname verification remain enabled. There are no redirects, retries,
caller-selected URLs, JQL, transport modules or environment credential overrides.
Validated issue IDs and exact target pairs are copied before credential resolution.
Changing the caller's arrays or pairs while the resolver is pending cannot change
the work selected for that invocation; make a new invocation for new identities.

`result.report` contains schema, status, requested scope, safe issue ID/project/key
rows and read states, diagnostics, all eleven limits, counters and cleanup.
`domain_complete` is always false, `retained_complete` null, and `admission` and
`receipt_proof` are `not_evaluated`. `visibility` remains
`operator_prerequisite`. `scopes` is empty. Complete requested reads do not mean
complete inventory or scheduler readiness. Status is `complete`, `incomplete`,
`invalid` or `setup_failed`; successful observations survive another read's
failure. The test-only source packet below emits the same safe report as JSON.

Read states describe processing phases. `not_requested` means the phase was not
reached, or no exact targets were supplied; an earlier failure or limit can leave
this state even when the caller supplied a target. `incomplete` means the phase
was reached but its required observations were not completed; it does not imply
that an HTTP request was sent. `complete` means that phase’s required observations
were completed. Use the overall status, diagnostics and request counters alongside
these states.

A non-enumerable, read-only `result.observations` property exposes private
in-memory acquisition to a trusted caller: `issues`, `comment_pages`,
`exact_comments`, `references` and `provenance`. Serializing the whole result emits
only the safe report. Issue rows retain current immutable identity, native status,
type, parent, labels, ADF description and pointer state. An explicit empty Jira
description is retained as `body: null`; a missing or malformed description is a
response error. Null is an inventory observation, not valid work to start. Pages/exact comments keep
server author/update-author/time metadata and bounded ADF strings. References are
empty in this slice and provenance is `requested`. These are observations, not
trusted work context or accepted receipt envelopes. Do not log private bodies.

A present pointer must match the existing pointer schema. **Pointer404 remains
unknown**, even after an accessible issue read: it never establishes absence.
Comments require contiguous offsets, stable totals, unique IDs and explicit final
counts; empty lists need a complete zero-total page. Exact targets must occur in
that enumeration and match server metadata and ADF content. JSON object member
order does not change an ADF value; content-array order and all metadata still
matter. Each endpoint's original bounded ADF string remains in private
observations. Changed input is retained as a failure; the library does not choose
a newer version or restart the scan.

Counters cover attempted/completed/failed requests, comment/search pages, relevant
identities, comments, every received byte, private serialized observations and
elapsed milliseconds. Discovery counters remain zero. Pages share `max_pages`;
ordinary comments count toward `max_comments`. Per-response bytes and cumulative
received bytes include errors and discarded replies. Private normalized
observations independently fit `max_total_response_bytes`; this is a serialized
bound, not an exact heap measurement. Request deadlines include headers and body;
the total deadline also includes resolution and parsing. Time checks surround
bounded synchronous parsing; timers cannot preempt JavaScript mid-parse.
Non-identity compression is rejected. Nothing is silently truncated.
When an exact target reaches a request, time, wire or private retention limit,
the scan stops across all requested issues. Earlier observations remain available,
the current issue is incomplete and no later issue is fetched.

Fixed diagnostics tell the caller what to inspect next:

| Code | Recovery |
| --- | --- |
| `CONFIG_INVALID`, `INPUT_INVALID` | Correct the authored configuration or closed caller request before retrying. |
| `SETUP_MISSING`, `SECRET_UNAVAILABLE` | Restore the approved complete source checkout or prepared resolver; do not fetch/repair inside a run. |
| `RESOLVER_CANCEL_UNCONFIRMED` | Confirm caller-owned resolver cleanup before a new invocation. |
| `SCOPE_UNKNOWN`, `READ_DENIED_OR_MISSING`, `POINTER_UNKNOWN` | Confirm project scope and visibility; do not infer absence. |
| `PAGE_INCOMPLETE`, `CHANGED_INPUT`, `RESPONSE_INVALID` | Investigate the incomplete, changed or oversized provider data outside the safe report. A provider ADF error is not a caller input error. |
| `RATE_LIMITED`, `LIMIT_REACHED` | Retain partial results; review the named bound and required scope before an operator-approved later attempt. No automatic retry. |
| `TLS_FAILED`, `REDIRECT_REJECTED` | Check prepared trust, hostname, certificate validity and local clock or the fixed destination; do not disable TLS or follow the redirect. |

### Finite human acceptance packet

The source fixture harness is a **test-only local HTTPS packet**, using public
dummy TLS material and a dummy token. It audits the production gateway/path/method
before redirecting the test process to its loopback HTTPS server; certificate and
hostname checks stay enabled. It adds no production endpoint or insecure option.
Use the exact reviewed source revision and its prepared existing dependencies.
The four PGB-150 human groups `R1-36-H01` through `R1-36-H04` select the existing
machine packet groups `R1-33-H01` through `R1-33-H04`, respectively. The selector
IDs and literal fixture data remain stable for the later installed-runtime Story.
From any directory, set `SOURCE` to the absolute reviewed checkout path, choose
one group, and import the fixture API:

```sh
SOURCE=/absolute/reviewed-source
GROUP=R1-33-H01
env -u NODE_PATH node --input-type=module - "$SOURCE" "$GROUP" <<'NODE'
import {pathToFileURL} from 'node:url';
const root=process.argv[2],group=process.argv[3];
const {runFixture,fixtureCases}=await import(pathToFileURL(root+'/test/fixtures/jira-preview-harness.mjs'));
for(const v of fixtureCases.variants.filter(v=>v.case===group)){
  const runs=[await runFixture(v.case,v.variant,root)];
  if(v.control)runs.push(await runFixture(v.case,v.variant,root,{control:true}));
  if(v.private_projection)runs.push(await runFixture(v.case,v.variant,root,{privateProjection:true}));
  console.log(JSON.stringify({case:v.case,variant:v.variant,runs}));
}
NODE
```

Use only the literal case/variant pairs in `test/fixtures/jira-preview-cases.json`: H01 has5,
H02 has12, H03 has16, H04 has2, totaling35. Each entry carries exact request,
config, scripted bodies, allowed request paths, expected status/code/request
count and any paired positive-at-limit control. The example runs those controls
and L06's private-projection subvariant too. It never derives an expected answer
from the collector. H04's existing `guide-and-install` variant proves the source
API here; its name does not prove an installed runtime. Its `damaged-copy` variant
uses a complete disposable copy derived from the source, removes only
`lib/config/projects.mjs`, and expects `SETUP_MISSING` with zero resolver/Jira
requests. The fixture preserves hashes of actual source files, prepared
dependencies, effective inputs, case data and dummy TLS material. For real source
damage, restore the approved checkout and prepared dependencies outside a run,
then verify the source before another attempt. The installed copy, direct fixture
CLI and human/JSON parity are PGB-147 outcomes.

The designated human executes source imports for every listed
variant, compares literal oracles and audits, inspects zero-effect/cancellation
observations and records revision, fixture hashes, commands, exit codes, reports,
request traces, counts/bytes/time and cleanup. Preserve the packet and remove only
disposable fixtures. The harness leaves authored fixture files unchanged. Developer
tests and fixture oracle matches are separate evidence; human acceptance remains
NOT_RUN until that human review is recorded. These fixtures prove no live tenant,
AWS deployment, activation or whole-PGB-82 policy acceptance.

### PGB-156 source evidence groups

PGB-156/R1-42 adds four checked-in `node:test` groups. They are separate from
the R1-33 JSON packet and its importable `runFixture` example above. From the
exact reviewed source root with its prepared dependencies, run the group needed
for the designated human check:

```sh
SOURCE=/absolute/reviewed-source
cd "$SOURCE"
env -u NODE_PATH node --test --test-reporter=tap --test-name-pattern='R1-42-H01' test/jira-read.test.mjs
env -u NODE_PATH node --test --test-reporter=tap --test-name-pattern='R1-42-H02' test/jira-read.test.mjs
env -u NODE_PATH node --test --test-reporter=tap --test-name-pattern='R1-42-H03' test/jira-read.test.mjs
env -u NODE_PATH node --test --test-reporter=tap --test-name-pattern='R1-42-H04' test/jira-read.test.mjs
```

H01 has two request-snapshot subcases, H02 three exact-limit subcases, H03 two
provider-ADF subcases and H04 two TLS subcases. Each successful case prints one
`PGB156_OBSERVATION` JSON diagnostic after fixture cleanup and restoration. It
contains the safe report, actual dummy request/server traces and counters,
input and fixture hashes, a hash-only actual/expected private comparison,
runtime/dependency preservation summary, effects and cleanup. H04 also reports
whether the socket and request error were observed, whether a secure connection
completed, and whether certificate authorization failed; it never prints the
raw TLS reason. Compare these actual fields with the literal case expectations
and retain the command, reviewed revision, TAP, exit code and safe diagnostics.
The full runtime/dependency file binding belongs in the external PREP receipt.
If a case fails or its diagnostic is missing, record that gap; a green parent
summary alone is not the human observation receipt. Do not retry, fetch
dependencies or infer live Jira, installed-runtime or human acceptance from this
source-only packet.
