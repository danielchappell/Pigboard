# Preview ready work locally

The offline manager preview answers which ticket could start in each exact Jira
site, immutable project ID and full numbered label. It is available in source and
the prepared `work-validator` bundle. It makes no provider calls, reads no
credentials and performs no writes, transitions, worker launches or activation.
A selection is a proposal with **no execution authority**. Live freshness and
permissions are not evaluated. Complete supplied facts are an assertion by the
caller, not proof that hidden Jira issues or inaccessible pages do not exist.

Full repair ordering is later PGB-81 work. An outstanding queued or unproved repair
explicitly waits with `REPAIR_POLICY_PENDING`; a ready Bug cannot bypass it. A
current, exactly bound canonical QA envelope may account for a member's retained
request obligations. Keep those request lists and historical references intact;
preview does not clear or rewrite them. Human acceptance is separate from these
synthetic fixtures and local regression results.

## Prerequisites and commands

Use Node 20+ and a normally prepared approved revision. For a source checkout,
prepare dependencies once with `npm ci --ignore-scripts --no-audit --no-fund`.
For installed use, follow the [installation guide](https://github.com/danielchappell/Pigboard/blob/9f03c1561b0e32de05cd296b24e50885f4abbe91/docs/install.md); the release receipt
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
| `pending_intents` | Every unresolved `{project_id,label,ticket_id,attempt_id}`. Presence holds that scope. No clearing, expiry or inferred outcome exists here. |
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
unstarted preparation/Ready member may be removed when no retained assignment or
incoming prerequisite requires it. Removal/cancellation is never completion.

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
`streams`. Status is `invalid`, `held`, `partial` (independent selections coexist
with holds) or `complete` (including ordinary waits). Invalid input has null
digests and no streams. Diagnostics contain stable code/path/scope/message; raw
bodies, unknown keys, secrets and file paths are never echoed.

Each stream contains exact `scope`, `epic_id`, `decision: select|wait|hold`,
`selected_ticket_id`, `selected_key`, `occupied_ids`, `blocked_ids`,
`human_review_ids`, `counts_complete`, `return_count`, `reasons` and `candidates`.
Selection fields are null except on `select`; return count is known Human Review
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
| `REPAIR_POLICY_PENDING` | Preserve all requests; obtain exact current member QA if already completed, otherwise wait for PGB-81 repair ordering. |
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
explicitly wait for PGB-81. S38 intentionally holds with a different digest.

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
