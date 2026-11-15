# Validate local handoff evidence

The prepared `work-validator` contains two read-only handoff checks. **Record**
checks one complete handoff's encoding, structure and digest. **Chain** checks an
exact target against the provider observations and trusted configuration supplied
in a local JSON file. Neither check fetches evidence or proves it is fresh or
provider-authentic. A valid blocked, queued or partial result is not completion.

These local checks, composed implementer/reviewer producers and the standalone prepared QA publisher are available in this
release. The reviewer contract below binds approval/repair to actual implementation receipts. Retained QA remains a basic prose worker; its typed migration, manager
scheduling/provider adapters and human unblock automation are separate work. Installation does not activate automations or authorize a Jira/PR write.
Workers need no database access; manager mode compares a separately supplied
stored assignment and never contacts its operational store.

Choose the link for the copy you are reading; installed payloads preserve the same guide bytes.

| Contract | Source checkout | Installed work-validator/docs |
| --- | --- | --- |
| Reviewer handoff | [Source reviewer](../skills/pigboard-pr-review/references/jira-handoff.md) | [Installed reviewer](../../pigboard-pr-review/references/jira-handoff.md) |

## Prepare and run

Use Node 20+ and dependencies already prepared for this exact release. For a
source checkout, run `npm ci --ignore-scripts --no-audit --no-fund` during setup.
For installed use, preparation supplies the locked dependencies; never install or
repair packages during a delivery run. Save the record as UTF-8 text and receipt
observations as JSON in regular local files. The command accepts no stdin, URL,
glob, output file or mutation option.

```sh
# Source checkout
node scripts/validate-handoff.mjs --mode record --input /absolute/record.yaml --format yaml --json
node scripts/validate-handoff.mjs --mode record --input /absolute/comment.adf.json --format adf --json
node scripts/validate-handoff.mjs --mode record --input /absolute/comment.html --format html --json
node scripts/validate-handoff.mjs --mode chain --input /absolute/receipts.json --json

# Installed: substitute the receipt's absolute skills directory
node /opt/pigboard/skills/work-validator/scripts/validate-handoff.mjs --mode chain --input /absolute/receipts.json --json
node /opt/pigboard/skills/work-validator/scripts/validate-handoff.mjs --help
```

Omit `--json` for readable output. Chain mode accepts JSON only and has no
`--format` option. Required and explicit null fields are significant. Duplicate or
unknown command options reject. Exit 0 means the selected local check passed;
exit 1 means the record/evidence was rejected; exit 2 means usage, regular-file
input, missing/corrupt runtime or internal failure. A record-only success always
reports `completion_established: false`.

## Prepare immutable publication text

Use the same-release local helper after completing a canonical record and readable
summary. It validates the original YAML before encoding; duplicate keys, unsupported
fields and invalid raw literals are not lost through a parse/stringify conversion.

```sh
# Source
node scripts/prepare-handoff.mjs --input /absolute/record.yaml --summary /absolute/summary.txt --format html
node scripts/prepare-handoff.mjs --input /absolute/record.yaml --summary /absolute/summary.txt --format adf
# Installed: use the receipt's actual skills path
node /opt/pigboard/skills/work-validator/scripts/prepare-handoff.mjs --input /absolute/record.yaml --summary /absolute/summary.txt --format html
```

Exit 0 writes one JSON object to stdout: `schema: pigboard-handoff-publication/v1`,
`record_id`, canonical `record_digest`, `format`, and `body`. HTML body is a string
with escaped summary and exactly one supported pre/code block containing escaped
original YAML. ADF body is a doc/version 1 object with summary paragraph and one
YAML codeBlock/text node. Identical inputs produce identical output. The helper
extracts its own body through the existing parser and compares the digest. It
generates no UUID, writes no file, contacts no provider and never launches/retries.
Use `--help` for readable usage; there is no `--json` switch. Invalid input yields
sanitized JSON diagnostics on stderr and exit 1; usage/read/setup failures exit 2.
Successful stdout contains only the object; failures produce no publication object.

Inputs must be regular UTF-8 files. Record bound is 16 KiB, depth 16 and list 100;
summary bound is 2,000 UTF-8 bytes, without NUL/lone surrogates. The prepared body
must satisfy the existing 64-KiB wrapper bound; entity expansion can exceed it
before the record bound. Fail without truncating reports, nulls or findings and
without silently selecting another transport. Retain exact bytes/digest/record ID
before publication. Local preparation does not authorize a write or prove semantic
evidence/freshness. Configured Jira skills own exact receipt lookup, append once,
read-back, chain validation, final recheck and one directed transition. Unknown
effects stop without replay or a replacement record.

## Record representation

Each handoff uses the canonical [handoff schema](../contracts/handoff-v1.schema.json)
and assignments use the [pointer schema](../contracts/work-pointer-v1.schema.json).
The schema `$id` remains stable after its move from the design folder. All nine
kinds are supported: admission, implementation, review, qa, repair_request,
stack_update_request, dependency_wait, blocked and resume_authorization. Skeletons
with unresolved required values do not validate.

ADF input must be a version 1 `doc` with exactly one YAML/YML `codeBlock`, containing
only text children. Split text nodes are concatenated without trimming. HTML input
must contain exactly one `<pre><code class="language-yaml">…</code></pre>` (or
`language-yml`) pair and only text inside `code`. Escape ampersands, angle brackets
and quotes when constructing HTML; parse5 decodes entities once. Summary prose is
ignored. Rendered Markdown fences, nested markup, ambiguous blocks, malformed
entities, raw NULs, unsupported versions and truncated wrappers reject. No browser,
script, resource or network operation runs.

Safe YAML 1.2 permits only JSON-compatible values. Duplicate keys, aliases,
non-string keys, unsupported tags/directives, multiple documents, invalid UTF-8,
lone surrogates, nonfinite numbers and unsafe integer literals reject. Finite
exponent/fraction literals retain the work parser's behavior (`1e20` is valid raw
requirements data). Direct JavaScript values have no literal provenance and reject
unsafe integral Numbers. JCS (RFC 8785) sorts keys recursively and preserves
arrays, nulls, text and Unicode composition; SHA-256 hashes those UTF-8 bytes with
the lowercase `sha256:` prefix. Native Jira metadata is checked separately from
the complete requirements digest. Credential-bearing repository/evidence URLs
reject at every depth even if repeated in a trusted allowlist; URLs are never
normalized or echoed by diagnostics.

A complete, synthetic admission for record mode follows. Save only the YAML inside
the fence as `record.yaml`. The zero requirements digest is placeholder data for
this record-shape example; it cannot establish assignment authority in chain mode.

```yaml
schema: pigboard-handoff/v1
record_id: 00000000-0000-4000-8000-000000000000
operation_id: 00000000-0000-4000-8000-000000000000
ticket_id: "0"
requirements_digest: sha256:0000000000000000000000000000000000000000000000000000000000000000
assignment: null
role: manager
kind: admission
from_stage: Ready to Work
to_stage: In Progress
payload:
  project_id: "0"
  stream: stream-1
  mode: new_work
  previous_assignment: null
  requests: []
  existing_pr: null
resume_authorization: null
```

## Receipt input contract

`validateReceiptChain(rawJson)` and the chain CLI use the same closed
`pigboard-receipt-input/v1` envelope. Every field listed below is required, no
extras; null alternatives remain explicit. IDs are strings (numeric Jira IDs/PR
numbers use digits); identifiers/reasons are nonblank. References have exactly
`ticket_id`, `comment_id`, `record_id` (UUID), `digest`. PRs have exactly `provider`
(`github|bitbucket`), HTTPS `repository`, numeric-string `number`, lowercase
40/64-hex `source_revision`, `target_branch`. Arrays below have at most 100
entries unless stated otherwise.

| Field | Supplied value |
| --- | --- |
| `schema` | `pigboard-receipt-input/v1` |
| `consumer` | `worker` or `manager` |
| `target` | Exact Reference being assessed; selection never means newest timestamp |
| `trusted` | `{site, projects, manager_assignments}`; site is the exact HTTPS Jira origin |
| `issues` | Native snapshots described below |
| `requirements` | `{ticket_id,digest,format,body,context_body}`; format `yaml|adf`, original body text and separate trusted start-context YAML/JSON text |
| `comment_pages` | `{site,ticket_id,start_at,total,is_last,comments}`; integers start at zero, contiguous/no overlap, consistent total, final page ends exactly at total |
| `pr_receipts` | PR fields plus `state: open|merged|closed|unknown` and `current:boolean`; one coherent observation per revision, exactly one current observation per referenced PR |
| `evidence_receipts` | `{uri,observed_digest,available,actor_id,pr,kind,details}`; digest and PR may be explicit null |
| `retained` | `{site,ticket_id,comment_id,record_id,digest,author_id,update_author_id,created,updated}` previously consumed observations to compare exactly |
| `request_resolutions` | `{request:Reference,completion:Reference}`; completion must actually consume that request through a coherent QA chain |

Each project entry contains exactly `id`, `stages`, `accepted_later_stage_ids`,
`actors`, `repositories`, `evidence_uris`, `pipeline_actors`, `configured_targets`.
`stages` maps all seven canonical stage names (Ready to Work, In Progress, In
Review, QA, Human Review, Rework Queued, Blocked) to native immutable status-ID
strings. `actors` maps manager, implementer, reviewer, qa and human_request to
explicit provider account-ID arrays. The other arrays contain exact allowed
strings. Two projects may share stream labels; immutable project ID still isolates
their work. Role account overlap is allowed and reported as a trust limitation;
unequal accounts alone cannot prove independent reasoning or exclusive execution.
`manager_assignments` contains `{ticket_id,assignment:Reference}` entries. Manager
mode requires exact current stored assignments for the target and any current
parent completion it consumes. Worker mode does not require them.

Each issue has exactly `site,id,key,project_id,stage_id,stream,pointer,
requirements_digest,required_requests,pr_history_complete,published_prs`.
`pointer` is the canonical complete work pointer. `required_requests` is the
supplied outstanding obligation set, not proof that an adapter omitted nothing.
`published_prs` is the complete own-ticket PR identity inventory (provider,
repository, number). Parent PRs belong to the referenced parent's inventory.
Complete comment discovery also checks conflicting results and typed requests.
An empty publication inventory proves no-PR history only when
`pr_history_complete` is true and all prior lineage is supplied and has no PR.

A selected null-PR repair admission still requires an empty complete current
inventory and a valid assigned pre-PR `dependency_wait`. After publication, that
unchanged admission can be historical evidence: the complete inventory must name
one first PR, proved by a fully validated implementer `implementation`,
`dependency_wait` or `blocked` result under that admission, or a later admission
reached through explicit PR-free waits and null-PR repairs. Every intermediate
assignment, request, actor, requirements digest and immutable reference must
validate. A wait or blocker proves publication only; it does not prove consumed
requests, passing checks or completed implementation. Successful implementation,
review and QA retain all their normal evidence requirements.

Earlier assignment lineage must contain no published PR. A later repair retains
the same PR through nonnull `existing_pr`; legitimate later revisions of that PR
remain possible. Missing or extra inventory identities, prior publication, orphan
results, invalid worker evidence and skipped intermediate waits fail validation.
Keep the original admission body, metadata and digest: recovery is to supply
complete coherent evidence, never edit old comments or hide a published PR.

Before the first worker result is appended, a fresh admission-only snapshot with
the newly created PR intentionally fails. Retain the actual successful pre-creation
snapshot as historical run evidence, clearly labelled historical. The producer
must separately reread current assignment, native stage/requirements, immutable
comment metadata, outstanding requests and complete inventory, plus actual PR,
revision, target and outcome-appropriate evidence immediately before publication.
Retain actual PR creation/readback proof; a wait or blocker needs no fabricated
successful CI. Validate the candidate record before append, then validate the full
chain only after real append/readback provides its exact comment reference.
Historical validation alone never authorizes publication or replaces those current
checks. These supplied-data checks do not establish live freshness.


Each comment has exactly `id,author_id,update_author_id,created,updated,format,body`.
`format` is `adf|html`; body is the original wrapper text. Dates use valid RFC 3339
`date-time` strings. Every typed comment must have identical created/updated
values and unchanged author/update-author accounts. Ordinary comments without a
code block are ignored after safe wrapper checks. A code-block candidate must
validate; it cannot be ignored because its body is inconvenient. Missing/edited
retained or referenced comments reject. Comments are unique per site/issue ID;
100/page, 100 pages, 1,000 aggregate. Other count fields are safe nonnegative
integers; flags are booleans. No ID, account, URL or revision is coerced.

Requirements must independently pass the work validator's complete `start` checks
with their supplied context. The digest covers the complete parsed ticket. Current
results match the native issue digest and pointer; historical ancestors use their
own supplied requirements snapshots and legal recorded stages. A renamed issue
key can retain identity when its start context is updated; a moved immutable
project cannot inherit its old assignment.

Evidence observations are exact approved retrievable URIs with availability,
expected content hash when declared, and the corresponding exact PR/revision.
An evidence reference with null digest does not invent a content hash. Preparation
artifacts always need matching nonnull hashes. Evidence `details` is closed and
kind-specific:

| Kind | Required details and successful interpretation |
| --- | --- |
| `plan` | `{requirements_digest,author_id}`; assigned requirements and plan-author context |
| `plan_review` | `{requirements_digest,reviewer_id,outcome}`; outcome `CLEAN|NOT_CLEAN|unknown`; success CLEAN, context differs from plan author |
| `ci` | `{status}`; `passed|failed|pending|unknown`; success passed at exact source |
| `approval` | `{state,reviewer_id}`; `approved|changes_requested|pending|unknown`; success approved and configured observed reviewer |
| `review_report` | `{criteria_complete,comments_handled}`; both booleans true for success, configured reviewer |
| `preparation` | `{preparation_id,requirements_digest,consumers}`; exact declared slot and used_by string-ID array |
| `environment` | `{target_reference,comment_id,pipeline_actor_id}`; exact configured target, deployed PR revision and allowed pipeline PR-comment actor |
| `reuse` | `{case_id,step_id,basis,source:Reference}`; case-specific nonblank basis plus exact prior step/result/evidence |
| `artifact` | `{}`; ordinary finding or verification evidence |

Report context IDs establish only the supplied plan-review independence claim;
provider `actor_id` is distinct from those contexts. Failed/unknown blocker
observations remain failed/unknown; they are not relabeled successful. Runtime QA
needs exact pipeline environment evidence. A human-only non-runtime configured
target with no required capabilities does not need an invented deployment.

## Incomplete QA results

A QA `blocked` or `dependency_wait` payload may include `findings`: 1–100
existing finding objects, each with a distinct nonblank `id`, nonblank `summary`
and at least one approved retrievable evidence reference. Omit the property when
there are no findings; do not supply an empty array or add it to another role.
Retain each earlier FAIL, its evidence and finding IDs, every remaining NOT_RUN
step with its reason, and the exact prescribed human-pending list. A
defect-dependent skip retains the defect's finding ID. On this reviewed validator,
NOT_RUN rows retain the distinct finding IDs of FAIL or NOT_RUN prerequisite rows
named by their case's `depends_on`. This carries the cause through declared
skipped prerequisites: A FAIL/F1 → B NOT_RUN/F1 → C NOT_RUN/F1. One copy of each
required ID suffices when paths join. A skipped prerequisite with no finding IDs
contributes none. Ownership, bindings, same-case membership, earlier rows and
PASS metadata create no such requirement; an independent access/evidence blocker
can retain its own reason without inheriting an unrelated failure. These findings preserve
observations; they do not queue a new repair request, prove a repair or authorize
resume. A wait still references a real typed upstream request.

A non-completing report whose steps are all NOT_RUN can report missing deployment
without an environment receipt. Supplied finding and step evidence is still
validated. Any PASS or FAIL, including a reused observation, requires nonnull
`payload.pr` naming the tested revision, matching result evidence and the trusted
pipeline PR-comment environment for that exact PR revision. Successful runtime QA
keeps the same requirement; the human-only static exception remains. Validation
of a blocker gives no permission to run tests or publish/transition anything.

A `PR` error at `payload.pr` means the executed observation lacks its tested
revision. Preserve the observations, obtain the actual tested revision and matching
proof, then prepare a new corrected receipt through canonical publication. If that
proof is unavailable, report the inability honestly; never invent a revision, erase
a PASS/FAIL or edit an already published signed receipt.

Existing `pigboard-handoff/v1` records without findings keep their original bytes
and digests. The optional extension requires the matching reviewed validator
release. If an older installation rejects `findings`, install the approved matching
release and validate the original input again. Never strip findings, change a FAIL
or retry against an older validator to obtain acceptance. Keep the immutable
release/manifest binding; publication of this change does not activate delivery.

If validation reports missing prerequisite finding IDs at a consumer's
`finding_ids` field, preserve the original evidence and prepare a new corrected
receipt with those IDs and the complete original ledger. Use the existing
canonical publication process. Never mutate an already published signed receipt,
strip a finding, rewrite a FAIL to PASS/NOT_RUN or downgrade validation to force
acceptance. Validation reports the error; it never repairs inputs or authorizes
execution or resume.

For a source checkout with its locked dependencies already prepared, generate
fixed synthetic examples in a **new, absolute directory** whose parent exists:

```sh
node --input-type=module -e 'import {preparePartialFixtures} from "./test/fixtures/qa-partial-results.mjs"; await preparePartialFixtures(process.argv[1]);' /absolute/private/partial-qa
node scripts/validate-handoff.mjs --mode chain --input /absolute/private/partial-qa/blocked-no-environment.json --json
node scripts/validate-handoff.mjs --mode chain --input /absolute/private/partial-qa/blocked-retained-fail.json --json
node scripts/validate-handoff.mjs --mode chain --input /absolute/private/partial-qa/wait-retained-fail.json --json
node scripts/validate-handoff.mjs --mode record --format yaml --input /absolute/private/partial-qa/blocked-retained-fail.yaml --json
```

The three chains are valid with `completion_established:false`. Inspect `qa_report`
for the full ledger and pending human cases; record-mode success checks shape only.
The directory also includes old-record controls, negative inputs, corresponding
YAML records and `sha256.json`. The preparation module is source-only and refuses
to overwrite an existing directory. From outside the checkout, use the exact
installed `work-validator/scripts/validate-handoff.mjs` on the same files; compare
outputs, exit codes, input hashes and the release manifest. Retain the evidence,
then remove only the owned example directory. These are local supplied-receipt
checks, not real helper execution, provider acceptance or proof of live freshness.

## Outcomes and recovery

Both modes return `schema: pigboard-handoff-validation/v1`, `mode`, `valid`,
`validation_scope` (`record|supplied_receipts`), `live_freshness: not_evaluated`,
`record_digest`, `target`, `outcome`, `completion_established`, `ai_steps`,
`human_pending` and `diagnostics`. Unavailable fields are null. Chain results add
`validated_leaf`, complete `qa_report`, and applicable `no_ai_cases_reason`.
Zero AI steps is zero with the exact prescribed reason and human cases pending.
No human PASS or artificial AI success is produced. A valid QA publication still
at QA is not completion; only Human Review/configured accepted stage plus the
coherent current chain establishes it. Accepted QA permits an open or merged PR;
closed-unmerged/unknown PRs do not establish completion. Blockers can honestly
retain closed/unknown PR state without advancing.

Diagnostics have stable `code`, JSON-pointer `path`, recovery `message`, and when
available an exact `reference` (ticket/comment/record IDs), block, line and column.
They are deterministically sorted. Undeclared mapping keys are input data; their
diagnostics identify the nearest safe declared enclosing field rather than echoing
the key. Known contract fields and bounded list indexes retain their exact paths.
PARSE/STRUCTURE/FORMAT/LIMIT and parser-specific
codes identify input shape; REFERENCE/METADATA/ACTOR/ASSIGNMENT/REQUIREMENTS/PROJECT,
SLOT_CONFLICT/PR/EVIDENCE/LEDGER/REPAIR/RESUME/INCOMPLETE_READ identify missing or
conflicting facts. USAGE/INPUT/SETUP/INTERNAL are command/setup failures. Messages
never echo record bodies, credential URLs or evidence URLs.

Supply corrected observations/context and rerun the same local command. Preserve
rejected inputs and exact diagnostics. Obtain missing pages, reports or PR history
from their source; a validator cannot manufacture them. Edited, deleted or
conflicting publications require source-owner handling. Missing prerequisites or
unknown write outcomes remain incomplete; no retry/transition/unblock instruction
is generated. A blocked attempt is terminal. Only a unique configured human
request authorization for that exact blocker opens a same-assignment, unchanged
requirements/operation/PR/source worker slot. A second blocker needs another
explicit authorization. The old blocker stays historical and the pointer stays
unchanged. Scope or code changes need normal reviewed rework, not a resume bypass.

Repair preserves the ticket's existing PR identity and every unresolved root
request. Its immutable admission captures the observed PR head at admission; later
implementation, review and QA may advance that same PR. Each own-ticket PR must
match its assignment's exact requirements repository, even when the project
allows other repositories. A recorded stacked target or owner retarget may differ
from the intended base branch. No-PR repair is limited to complete documented dependency-wait history
before publication. Implementation/review/QA must agree on one revision. Stack
updates use the child's recorded immediate parent, its stale incorporated revision,
the parent's new current accepted coherent QA and all incorporated repair roots.
An independent child or ordinary retarget does not qualify. A selected queue
request must still match the child's current observed PR source and target; a
historical request consumed by later repaired QA keeps its recorded child head.
This queue check does not establish that the PR is open: later admission owns that
separate check. Queue records preserve the old pointer; only later admission
changes it. Identical record republication
is one logical result with every server comment independently valid; distinct final
records in one role/assignment/resume slot hold rather than picking the newest.

## Bounds and complete synthetic chain

Record YAML: 16,384 UTF-8 bytes, 16 containers deep (root counts one), 100/list.
ADF/HTML wrapper: 65,536 UTF-8 bytes, 32 deep, 1,000 nodes and 100 children/node.
Chain: 8 MiB raw JSON, 40 deep, 1,000/outer array before schema's tighter 100-entry
limits. Requirements keep the work validator's own bounds. A byte limit can be
reached before a count limit. Exceeded budgets reject; evidence and ledgers are
never truncated. These are local supplied-input limits, not a measured AWS or
whole-installation scan capacity.

The complete example below is synthetic, passes chain mode, has zero AI cases and
one pending human case, and is not authority to execute or publish. Save only the
JSON inside the fence as `receipts.json`; use the source or installed chain command
above. Its fictional accounts, IDs, requirements and observations must never be
substituted for actual provider receipts. The example demonstrates valid shape
and supplied-evidence coherence, not real approval, human execution or freshness.

```json
{
  "schema": "pigboard-receipt-input/v1",
  "consumer": "worker",
  "target": {
    "ticket_id": "1000",
    "comment_id": "2004",
    "record_id": "00000000-0000-4000-8000-000000000004",
    "digest": "sha256:1a54a834994788f6a4c11e4b56284c795de99977669a129dce6cc14e0d05cb26"
  },
  "trusted": {
    "site": "https://jira.example.invalid",
    "projects": [
      {
        "id": "100",
        "stages": {
          "Ready to Work": "1",
          "In Progress": "2",
          "In Review": "3",
          "QA": "4",
          "Human Review": "5",
          "Rework Queued": "6",
          "Blocked": "7"
        },
        "accepted_later_stage_ids": [
          "8"
        ],
        "actors": {
          "manager": [
            "manager"
          ],
          "implementer": [
            "implementer"
          ],
          "reviewer": [
            "reviewer"
          ],
          "qa": [
            "qa"
          ],
          "human_request": [
            "human"
          ]
        },
        "repositories": [
          "https://example.invalid/example/application"
        ],
        "evidence_uris": [
          "https://evidence.example.invalid/1000-001-1-plan",
          "https://evidence.example.invalid/1000-001-1-plan-review",
          "https://evidence.example.invalid/1000-001-1-ci",
          "https://evidence.example.invalid/1000-001-1-verification",
          "https://evidence.example.invalid/1000-001-1-approval",
          "https://evidence.example.invalid/1000-001-1-report"
        ],
        "pipeline_actors": [
          "pipeline"
        ],
        "configured_targets": [
          "local-review"
        ]
      }
    ],
    "manager_assignments": []
  },
  "issues": [
    {
      "site": "https://jira.example.invalid",
      "id": "1000",
      "key": "EX-1",
      "project_id": "100",
      "stage_id": "5",
      "stream": "stream-1",
      "pointer": {
        "schema": "pigboard-work-pointer/v1",
        "assignment": {
          "ticket_id": "1000",
          "comment_id": "2001",
          "record_id": "00000000-0000-4000-8000-000000000001",
          "digest": "sha256:6aa75635bcfcf298e4f43d67d72f2db0b3ecd496710621fe3101950d25c9f3fe"
        }
      },
      "requirements_digest": "sha256:9f2583c20c0fabb4c1b2725409d83263f0401582489ae6d494591c6d6f056892",
      "required_requests": [],
      "pr_history_complete": true,
      "published_prs": [
        {
          "provider": "github",
          "repository": "https://example.invalid/example/application",
          "number": "10"
        }
      ]
    }
  ],
  "requirements": [
    {
      "ticket_id": "1000",
      "digest": "sha256:9f2583c20c0fabb4c1b2725409d83263f0401582489ae6d494591c6d6f056892",
      "format": "yaml",
      "body": "{\"schema\":\"pigboard-ticket/v1\",\"problem_to_solve\":\"A reader cannot find a saved filter without scanning the whole list.\",\"prerequisites\":[],\"acceptance_criteria\":[{\"id\":\"AC-01\",\"requirement\":\"A reader can find a saved filter by its name.\"}],\"technical_acceptance_criteria\":{\"repository\":{\"url\":\"https://example.invalid/example/application\",\"base_branch\":\"main\",\"change_boundary\":\"Existing saved-filter search and its tests.\",\"out_of_scope\":[\"Changing ownership or cross-tenant access.\"],\"related_repositories\":[]},\"accepted_decisions\":[],\"constraints\":[{\"id\":\"TAC-01\",\"requirement\":\"Search and observations remain within the reader tenant.\"}]},\"testing_strategy\":{\"testing_types\":[],\"environment\":{\"source\":\"configured_target\",\"target_reference\":\"local-review\",\"required_capabilities\":[]},\"actors\":[],\"fixtures\":[],\"preparation\":[],\"dispatch_order\":[],\"cases\":[],\"human_review\":{\"no_ai_cases_reason\":\"Human review of local contract behavior.\",\"cases\":[{\"id\":\"HQA-01\",\"execution\":\"human\",\"owner_role\":\"Product reviewer\",\"requirements\":[\"AC-01\",\"TAC-01\"],\"prerequisites\":[\"AI evidence is available for the same PR revision.\"],\"steps\":[\"Review the search label and empty-state wording with product expectations.\"],\"expected\":[\"The wording is understandable to a new report user.\"],\"evidence\":[\"Human review comment with the PR revision and outcome.\"],\"cleanup\":{\"mode\":\"none\",\"reason\":\"All observations are read-only against a prepared fixture.\",\"owner\":null,\"steps\":null}}]},\"automated_regression\":\"Run the prescribed local regression suite.\"},\"open_questions\":[]}",
      "context_body": "{\"schema\":\"pigboard-work-validation-context/v1\",\"subject_key\":\"EX-1\",\"repositories\":[{\"url\":\"https://example.invalid/example/application\",\"base_branches\":[\"main\"]}],\"allowed_skills\":[],\"configured_targets\":[\"local-review\"],\"references\":[],\"prerequisite_graph\":[{\"ticket\":\"EX-1\",\"prerequisites\":[]}],\"related_changes\":[],\"operations\":[]}"
    }
  ],
  "comment_pages": [
    {
      "site": "https://jira.example.invalid",
      "ticket_id": "1000",
      "start_at": 0,
      "total": 4,
      "is_last": true,
      "comments": [
        {
          "id": "2001",
          "author_id": "manager",
          "update_author_id": "manager",
          "created": "2026-11-15T10:00:00Z",
          "updated": "2026-11-15T10:00:00Z",
          "format": "adf",
          "body": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"{\\\"schema\\\":\\\"pigboard-handoff/v1\\\",\\\"record_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"operation_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"ticket_id\\\":\\\"1000\\\",\\\"requirements_digest\\\":\\\"sha256:9f2583c20c0fabb4c1b2725409d83263f0401582489ae6d494591c6d6f056892\\\",\\\"assignment\\\":null,\\\"role\\\":\\\"manager\\\",\\\"kind\\\":\\\"admission\\\",\\\"from_stage\\\":\\\"Ready to Work\\\",\\\"to_stage\\\":\\\"In Progress\\\",\\\"payload\\\":{\\\"project_id\\\":\\\"100\\\",\\\"stream\\\":\\\"stream-1\\\",\\\"mode\\\":\\\"new_work\\\",\\\"previous_assignment\\\":null,\\\"requests\\\":[],\\\"existing_pr\\\":null},\\\"resume_authorization\\\":null}\"}]}]}"
        },
        {
          "id": "2002",
          "author_id": "implementer",
          "update_author_id": "implementer",
          "created": "2026-11-15T10:00:00Z",
          "updated": "2026-11-15T10:00:00Z",
          "format": "adf",
          "body": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"{\\\"schema\\\":\\\"pigboard-handoff/v1\\\",\\\"record_id\\\":\\\"00000000-0000-4000-8000-000000000002\\\",\\\"operation_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"ticket_id\\\":\\\"1000\\\",\\\"requirements_digest\\\":\\\"sha256:9f2583c20c0fabb4c1b2725409d83263f0401582489ae6d494591c6d6f056892\\\",\\\"assignment\\\":{\\\"ticket_id\\\":\\\"1000\\\",\\\"comment_id\\\":\\\"2001\\\",\\\"record_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"digest\\\":\\\"sha256:6aa75635bcfcf298e4f43d67d72f2db0b3ecd496710621fe3101950d25c9f3fe\\\"},\\\"role\\\":\\\"implementer\\\",\\\"kind\\\":\\\"implementation\\\",\\\"from_stage\\\":\\\"In Progress\\\",\\\"to_stage\\\":\\\"In Review\\\",\\\"payload\\\":{\\\"pr\\\":{\\\"provider\\\":\\\"github\\\",\\\"repository\\\":\\\"https://example.invalid/example/application\\\",\\\"number\\\":\\\"10\\\",\\\"source_revision\\\":\\\"1111111111111111111111111111111111111111\\\",\\\"target_branch\\\":\\\"main\\\"},\\\"stack_parent\\\":null,\\\"consumed_requests\\\":[],\\\"plan\\\":{\\\"label\\\":\\\"1000-001-1-plan\\\",\\\"uri\\\":\\\"https://evidence.example.invalid/1000-001-1-plan\\\",\\\"digest\\\":null},\\\"plan_review\\\":{\\\"label\\\":\\\"1000-001-1-plan-review\\\",\\\"uri\\\":\\\"https://evidence.example.invalid/1000-001-1-plan-review\\\",\\\"digest\\\":null},\\\"ci\\\":{\\\"label\\\":\\\"1000-001-1-ci\\\",\\\"uri\\\":\\\"https://evidence.example.invalid/1000-001-1-ci\\\",\\\"digest\\\":null},\\\"verification\\\":[{\\\"label\\\":\\\"1000-001-1-verification\\\",\\\"uri\\\":\\\"https://evidence.example.invalid/1000-001-1-verification\\\",\\\"digest\\\":null}],\\\"prepared_inputs\\\":[]},\\\"resume_authorization\\\":null}\"}]}]}"
        },
        {
          "id": "2003",
          "author_id": "reviewer",
          "update_author_id": "reviewer",
          "created": "2026-11-15T10:00:00Z",
          "updated": "2026-11-15T10:00:00Z",
          "format": "adf",
          "body": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"{\\\"schema\\\":\\\"pigboard-handoff/v1\\\",\\\"record_id\\\":\\\"00000000-0000-4000-8000-000000000003\\\",\\\"operation_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"ticket_id\\\":\\\"1000\\\",\\\"requirements_digest\\\":\\\"sha256:9f2583c20c0fabb4c1b2725409d83263f0401582489ae6d494591c6d6f056892\\\",\\\"assignment\\\":{\\\"ticket_id\\\":\\\"1000\\\",\\\"comment_id\\\":\\\"2001\\\",\\\"record_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"digest\\\":\\\"sha256:6aa75635bcfcf298e4f43d67d72f2db0b3ecd496710621fe3101950d25c9f3fe\\\"},\\\"role\\\":\\\"reviewer\\\",\\\"kind\\\":\\\"review\\\",\\\"from_stage\\\":\\\"In Review\\\",\\\"to_stage\\\":\\\"QA\\\",\\\"payload\\\":{\\\"implementation\\\":{\\\"ticket_id\\\":\\\"1000\\\",\\\"comment_id\\\":\\\"2002\\\",\\\"record_id\\\":\\\"00000000-0000-4000-8000-000000000002\\\",\\\"digest\\\":\\\"sha256:21249fadcd1781632aaabc77f8ffe3b5c2f4a946d2b4b45a33720c04fe608266\\\"},\\\"pr\\\":{\\\"provider\\\":\\\"github\\\",\\\"repository\\\":\\\"https://example.invalid/example/application\\\",\\\"number\\\":\\\"10\\\",\\\"source_revision\\\":\\\"1111111111111111111111111111111111111111\\\",\\\"target_branch\\\":\\\"main\\\"},\\\"approval\\\":{\\\"label\\\":\\\"1000-001-1-approval\\\",\\\"uri\\\":\\\"https://evidence.example.invalid/1000-001-1-approval\\\",\\\"digest\\\":null},\\\"report\\\":{\\\"label\\\":\\\"1000-001-1-report\\\",\\\"uri\\\":\\\"https://evidence.example.invalid/1000-001-1-report\\\",\\\"digest\\\":null}},\\\"resume_authorization\\\":null}\"}]}]}"
        },
        {
          "id": "2004",
          "author_id": "qa",
          "update_author_id": "qa",
          "created": "2026-11-15T10:00:00Z",
          "updated": "2026-11-15T10:00:00Z",
          "format": "adf",
          "body": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"{\\\"schema\\\":\\\"pigboard-handoff/v1\\\",\\\"record_id\\\":\\\"00000000-0000-4000-8000-000000000004\\\",\\\"operation_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"ticket_id\\\":\\\"1000\\\",\\\"requirements_digest\\\":\\\"sha256:9f2583c20c0fabb4c1b2725409d83263f0401582489ae6d494591c6d6f056892\\\",\\\"assignment\\\":{\\\"ticket_id\\\":\\\"1000\\\",\\\"comment_id\\\":\\\"2001\\\",\\\"record_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"digest\\\":\\\"sha256:6aa75635bcfcf298e4f43d67d72f2db0b3ecd496710621fe3101950d25c9f3fe\\\"},\\\"role\\\":\\\"qa\\\",\\\"kind\\\":\\\"qa\\\",\\\"from_stage\\\":\\\"QA\\\",\\\"to_stage\\\":\\\"Human Review\\\",\\\"payload\\\":{\\\"review\\\":{\\\"ticket_id\\\":\\\"1000\\\",\\\"comment_id\\\":\\\"2003\\\",\\\"record_id\\\":\\\"00000000-0000-4000-8000-000000000003\\\",\\\"digest\\\":\\\"sha256:f307a68214b9c956600f76451a94cc02a37ac828650614a8833137454ba9d948\\\"},\\\"pr\\\":{\\\"provider\\\":\\\"github\\\",\\\"repository\\\":\\\"https://example.invalid/example/application\\\",\\\"number\\\":\\\"10\\\",\\\"source_revision\\\":\\\"1111111111111111111111111111111111111111\\\",\\\"target_branch\\\":\\\"main\\\"},\\\"report\\\":{\\\"steps\\\":[],\\\"human_pending\\\":[\\\"HQA-01\\\"],\\\"no_ai_cases_reason\\\":\\\"Human review of local contract behavior.\\\"}},\\\"resume_authorization\\\":null}\"}]}]}"
        }
      ]
    }
  ],
  "pr_receipts": [
    {
      "provider": "github",
      "repository": "https://example.invalid/example/application",
      "number": "10",
      "source_revision": "1111111111111111111111111111111111111111",
      "target_branch": "main",
      "state": "open",
      "current": true
    }
  ],
  "evidence_receipts": [
    {
      "uri": "https://evidence.example.invalid/1000-001-1-plan",
      "observed_digest": null,
      "available": true,
      "actor_id": "observer",
      "pr": {
        "provider": "github",
        "repository": "https://example.invalid/example/application",
        "number": "10",
        "source_revision": "1111111111111111111111111111111111111111",
        "target_branch": "main"
      },
      "kind": "plan",
      "details": {
        "requirements_digest": "sha256:9f2583c20c0fabb4c1b2725409d83263f0401582489ae6d494591c6d6f056892",
        "author_id": "plan-author"
      }
    },
    {
      "uri": "https://evidence.example.invalid/1000-001-1-plan-review",
      "observed_digest": null,
      "available": true,
      "actor_id": "observer",
      "pr": {
        "provider": "github",
        "repository": "https://example.invalid/example/application",
        "number": "10",
        "source_revision": "1111111111111111111111111111111111111111",
        "target_branch": "main"
      },
      "kind": "plan_review",
      "details": {
        "requirements_digest": "sha256:9f2583c20c0fabb4c1b2725409d83263f0401582489ae6d494591c6d6f056892",
        "reviewer_id": "independent-reviewer",
        "outcome": "CLEAN"
      }
    },
    {
      "uri": "https://evidence.example.invalid/1000-001-1-ci",
      "observed_digest": null,
      "available": true,
      "actor_id": "observer",
      "pr": {
        "provider": "github",
        "repository": "https://example.invalid/example/application",
        "number": "10",
        "source_revision": "1111111111111111111111111111111111111111",
        "target_branch": "main"
      },
      "kind": "ci",
      "details": {
        "status": "passed"
      }
    },
    {
      "uri": "https://evidence.example.invalid/1000-001-1-verification",
      "observed_digest": null,
      "available": true,
      "actor_id": "observer",
      "pr": {
        "provider": "github",
        "repository": "https://example.invalid/example/application",
        "number": "10",
        "source_revision": "1111111111111111111111111111111111111111",
        "target_branch": "main"
      },
      "kind": "artifact",
      "details": {}
    },
    {
      "uri": "https://evidence.example.invalid/1000-001-1-approval",
      "observed_digest": null,
      "available": true,
      "actor_id": "reviewer",
      "pr": {
        "provider": "github",
        "repository": "https://example.invalid/example/application",
        "number": "10",
        "source_revision": "1111111111111111111111111111111111111111",
        "target_branch": "main"
      },
      "kind": "approval",
      "details": {
        "state": "approved",
        "reviewer_id": "reviewer"
      }
    },
    {
      "uri": "https://evidence.example.invalid/1000-001-1-report",
      "observed_digest": null,
      "available": true,
      "actor_id": "reviewer",
      "pr": {
        "provider": "github",
        "repository": "https://example.invalid/example/application",
        "number": "10",
        "source_revision": "1111111111111111111111111111111111111111",
        "target_branch": "main"
      },
      "kind": "review_report",
      "details": {
        "criteria_complete": true,
        "comments_handled": true
      }
    }
  ],
  "retained": [],
  "request_resolutions": []
}
```

## Prepared QA producer

[Source qa-jira](../skills/qa-jira/SKILL.md) and
[installed qa-jira](../../qa-jira/SKILL.md) refer to the source and installed layouts
respectively; use the link for your layout only. This is the sole permanent QA
publication/failure protocol. It consumes the incomplete-QA findings, declared
prerequisite cause propagation, nonnull actual tested PR and claim-sensitive
recursive environment/reuse rules above without changing their schema. A complete
all-NOT_RUN inability may retain missing proof; executed claims cannot evade proof
by selecting a null-PR blocker. Publication once attempted is immutable history;
correction guidance never authorizes replacement append/replay. The retained
dispatcher integration is PGB-78. See the source direct-use guide for preparation;
installed callers follow the complete skill and these copied canonical contracts.

## Repeated-parent repairs

The existing chain command accepts a current child repair that consumes two distinct
updates from the same parent. If U1 requires A2 and U2 requires its successor A3,
the child can incorporate A3 once. Admission and implementation must each name
U1 and U2 exactly once. Their shared repair R1 counts once in the effective leaf
set; R2 must also remain covered. Repeating U1 cannot substitute for U2.

Successor proof follows actual `previous_assignment` admission references, with
the same parent ticket and PR, configured site/project/full stream and repository.
A later date, revision string or unrelated prerequisite cannot prove succession.
For each update, required roots are the completed repairs after the parent
completion actually incorporated by the child's prior implementation, through
the requested parent completion. If the child already incorporated R1, that root
is outside the next update's required segment.

An older A2/U1 can be authentic nested evidence while failing as a current target.
The new historical allowance requires exact retained server metadata for its whole
proof closure and a validated current accepted successor incorporated by the
selected implementation/review/QA. It cannot authorize a selected admission or
stack publication. Selected targets still require current assignment, requirements,
PR and native stage; only current accepted QA establishes completion. Implementation
at In Review and review at QA validate without establishing completion. Selecting
those earlier results from the unchanged Human Review snapshot fails the stage check.

For a reproducible local example, use the source fixture from this exact revision.
It contains dummy, synthetic observations copied from the immutable 28-record H02
checkpoint. Fixture files are source test data; they are not installed runtime files.
With Node 20+ and the exact source/installed dependencies already prepared, extract
one named input to a disposable absolute path:

```sh
# Run from the source checkout; choose an existing writable absolute directory.
node --input-type=module - "$PWD" /absolute/repeated-qa.json <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const [source, output] = process.argv.slice(2);
const fixtures = JSON.parse(readFileSync(path.join(source, 'test/fixtures/handoff-chains.json')));
const input = fixtures.repeated_parent.inputs['c01-b2-qa-in-human-review'];
writeFileSync(output, JSON.stringify(input), { flag: 'wx' });
JS
node scripts/validate-handoff.mjs --mode chain --input /absolute/repeated-qa.json --json
# From any unrelated working directory, use the same-release installed runtime:
node /opt/pigboard/skills/work-validator/scripts/validate-handoff.mjs --mode chain --input /absolute/repeated-qa.json --json
```

Both commands return valid QA with `completion_established:true` and pending human
case HQA-01. Drop `--json` for readable output. The separately named
`c01-b2-implementation-in-review` and `c01-b2-review-in-qa` inputs validate with
completion false. Their only changes from the complete QA envelope are selected
target and B's outer native stage. Synthetic observations do not claim that the
later complete chronology was available at an earlier real time. Local validation
and installed parity do not establish live freshness, human acceptance, manager
deployment or permission to execute a delivery stage.

If validation reports missing retained metadata or a predecessor, obtain the actual
unchanged server metadata and complete referenced evidence. For unrelated ancestry
or missing/extra causes, prepare a separately identified correct receipt through
the existing publication authority. Preserve published history. If an old target
is selected, choose the actual current result with matching observations. Rewriting
an old comment or changing its stage/PR facts to force success cannot repair proof.
No validation run fetches, installs dependencies or writes to a provider.

A configured human can explicitly authorize continuation of a blocked repair on
the same assignment and exact PR revision. Validation follows the unique authorized
current leaf and preserves its complete QA report and pending human cases. An
explicit resolution may cite that same validated current QA only when it actually
consumes the request. An older or unrelated completion cannot waive a cause. If
authorization or consumption proof is missing, supply the authentic matching
evidence; preserve published history rather than rewriting a blocker or result.
