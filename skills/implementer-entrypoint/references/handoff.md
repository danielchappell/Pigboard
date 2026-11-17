# Implementer inputs, job evidence and typed Jira handoff

## Ordinary worker release boundary

Use the explicit same-release support matrix: source repository
`docs/handoffs.md`, heading `Ordinary worker release boundary`; installed
`<receipt.skills>/work-validator/docs/handoffs.md`, the same heading in that
immutable prepared release. It supports current `new_work` only.
This skill retains its own role-specific proof and action boundaries; the matrix
grants no repair-assignment, resume, wait or inability publication authority.

Use the same declared layout for the ordinary worker proof/publication contract.
Use the pinned checker in explicit `--mode worker-current` for actual predecessor
preflight and real-leaf readback. Current own/required-parent/action proof stays
required; ancestry needs no old context or mandatory capture. Genuine retained
mismatches reject. Independently compare complete candidate semantics, record-check
before append once, and compare original canonical bytes/digest/UUID at exact
readback. Unknown append/transition holds original identity without replay. No
manager completion grant, source fallback or dependency repair.

Linked legacy assignment, resume, wait and Blocked examples are deferred. A local
label grants no authority: the owning publisher independently checks the same-release
matrix and actual evidence before candidate construction. Unsupported work retains
all findings, partial ledgers and original receipts locally with no mutation.

Read only the section required by the current phase. The composer dispatches; the
job produces code/PR/evidence; the Jira skill owns preflight and publication.
Generic “Story” in the existing plan-review prompt includes the assigned native
Story or Bug. The retained [basic prose contract](../../write-pr-sized-stories/references/basic-workflow-ticket.md)
applies only when the selected installed QA entrypoint declares it. The [structured reviewer](../../pigboard-pr-review/SKILL.md) consumes canonical implementation receipts; implementer and reviewer use the structured contract. Do not convert prose,
guess missing nulls or imply that the full mixed-version workflow is compatible.

## Input contract

Trusted invocation must supply these facts, independently of ticket content:

| Input | Required scope/evidence |
| --- | --- |
| Configuration | Canonical config/result or equivalent verified resolved scope; expected Jira site, native project and full stream label; allowed repository, PR identity/tools and evidence destinations/audience |
| Assignment | Native issue ID/display key, expected In Progress, configured current actor, current pointer and exact assignment references, prior actions and retained phase results |
| Capabilities | Actual exposed Atlassian/PR tool input/response contracts, bounded complete comment pagination, append-new HTML publication, source-specific directed transition metadata, finite CI wait/deadline |
| Runtime | Same-release prepared work/config/receipt validators, durable output, setup-verified model/Task controls, supplied access references and repository checkout; never credential values |
| Work/context | Current original YAML/ADF requirements and separately supplied trusted start context, Epic and full-stream context/order, prescribed cases/skills/expectations/preparation ownership |
| Retained history | Original plan/review, PR/source facts and all prior action receipts; repair/resume assignments are unsupported and stop before code or provider writes |

Config owns scope. Use `parseConfig(input,{expectedSite})`, its `resolved_scope`,
`resolveProject(scope,{site,project_id})`, and `inspectStreams(scope,label)` / exact
site + immutable native project ID + full label tuple. Display keys and board IDs
never select a project; equal labels in different projects are independent.
Retain receipt-specific evidence URIs, observations and execution prescriptions as
trusted invocation facts, rather than creating duplicate customer configuration.

Use the installed sibling `work-validator` (or corresponding source modules):

```text
node <receipt.skills>/work-validator/scripts/validate-work.mjs --mode start --input WORK --format yaml --context CONTEXT --json
node <receipt.skills>/work-validator/scripts/validate-handoff.mjs --mode record --input RECORD.yaml --format yaml --json
node <receipt.skills>/work-validator/scripts/validate-handoff.mjs --mode worker-current --input WORKER.json --json
```

`--format adf` accepts original ADF work; worker-current input is JSON only. See the same
payload's `docs/authoring.md` and `docs/handoffs.md` for exact local contracts.
`lib/contracts/work.mjs` exposes `validateWork`, `parseWork`/`extractADF`;
`lib/contracts/handoff.mjs` exposes `extractHandoff`/`digestValue`; receipts use
`validateWorkerCurrent`. Preserve raw finite-float provenance: never JSON-parse and
reserialize unvalidated provider work/record text before these checks. Worker input
is the closed JSON envelope above. Strict `chain` remains a separate legacy proof
contract; it is not an ordinary-worker fallback. The result exposes `validated_leaf`
and `qa_report`, not a `leaf` alias. Neither record nor worker-current fetches
providers or proves live freshness.

## Preflight

Before code or provider writes:

1. Read the actual native issue, description, native project/type/status, full labels
   and parent. Match configured Story or Bug native type IDs and In Progress in the
   exact allowed project/stream/repository. Task/Epic, wrong project/equal-label
   collision, wrong stream/repository or changed stage is NOT_RUN/INELIGIBLE with
   zero mutations. Unreadable eligibility stops in durable output; it cannot
   manufacture a Blocked transition for an unverified ticket.
2. Read exact `pigboard.work-context` with the configured property tool. Resolve its
   assignment by issue/comment/record/digest through bounded **complete** comment
   pagination. Verify server author/update-author IDs and unchanged created/updated
   metadata against configured actors. No newest-comment selection or body-role
   trust. Missing pages/deleted/edited/mismatched receipt stops. Validate the
   actual predecessor in worker-current mode and independent native project binding.
   Require current `new_work`, empty assigned requests and no resume authorization;
   repair/resume or required repair stops locally before candidate construction. No manager
   database, lock or proof of exclusive worker ownership is required.
3. Read current Epic, surrounding full-stream tickets/order and explicit prerequisites
   for context. Validate complete requirements/start plan with trusted context and
   canonical requirement digest. Own comments cannot change this fingerprint;
   native metadata still needs independent rechecking. Missing schema, question,
   expected result, capability/access or configured scope stops locally with all
   findings and partial checks; it never authorizes a blocked publication. Context never grants
   authority to implement adjacent work or interrupt another ticket.
4. Resolve actual checkout/remote/source/base, target instructions and gates. Read
   branch PRs, complete retained publication/action receipts before first creation.
   Any prior uncertain creation forbids another PR. Preserve the genuinely supplied
   complete precreation snapshot and canonical result, full assignment/predecessor
   proof, exact references/digests/server metadata and requirements through High/Medium
   continuation. After creation label these historical precreation proof; do not
   invent a `published_prs` row in the first-PR preparation snapshot. Retain actual
   creation/readback and fresh complete inventory separately. Missing eventual
   preparation cannot become READY. Repair, null-PR repair and repeated-wait
   execution are deferred; their authentic historical receipts remain unchanged.

5. Check actual predecessor PR, merge, completion and base/incorporation facts.
   Epic order alone is not lineage. Actual stack dependency needs exact parent
   ticket/PR, verified completion and incorporated revision, same site/project/full
   stream/repository. Merged predecessor uses actual configured base and actual
   merge/incorporation evidence. Unmerged predecessor follows the repository's
   authorized stacking method. Independent work has null parent. Never infer
   integration from green parent CI or retarget another ticket. Missing necessary
   lineage/access stops locally; a confirmed upstream repair preventing completion
   is local DEPENDENCY_WAIT with exact unresolved request references and full evidence.
   Stop before candidate construction or append.

Do not make a new assignment or human resume producer. An existing resume or repair
assignment is unsupported in this invocation even if its general canonical chain
is authentic. Retain original receipts and complete local evidence for human
handling; no polling, automatic resume, append or transition.

## Job contract

The High plan records exact source/base/requirements fingerprint, plan hash,
ordered edits/interfaces, requirement-to-change/test and every prescribed-case
mapping, docs, preparation artifacts, failure/recovery, repo gates, file/time
estimate and an individual assessment of the target repository's accepted
principles in its required categories. Follow the shared
[one-reviewer prompt](plan-review.md) and [verified Cursor profile](cursor.md),
including fresh read-only context, coverage denominator/second sweep, same model
controls and honest absent per-call telemetry. Pigboard's two-reviewer contributor
gates are distinct from the customer's one-reviewer plan gate. Target repository
rules still apply; a mandatory unsupported conflict blocks, never waives a gate.
A changed approach needs revised High planning/review before edits; new scope,
another repository, >20 total files or >=2 human days is a human blocker.

After exact-plan CLEAN, Medium retains assignment/requirements, accepted plan/review,
checkout/PR and action receipts. Implement only that plan/confirmed in-scope fixes.
Ordinary READY requires the empty assigned request set under
[record mapping](#record-mapping). Preserve authenticated historical roots without
claiming to execute a repair. Preserve unrelated work, one PR
and source identity. Publish/update ready non-draft PR using authorized repository
method after its gates. No self-approval, merge, deploy or human acceptance claims.

Run actual required local checks and separately verify hosted CI's required tests
executed and passed at the current actual PR head/target or relevant tested merge
revision, with no conflicts. A green summary/exit code is insufficient. Missing,
stale, skipped, cancelled, pending or failed checks do not pass. Wait only through
the supplied finite mechanism; demonstrated in-scope code defects may be fixed at
Medium and new revision checks run. Changed approach returns to High; unavailable
checks/access, unknown cause or unrelated infrastructure stops locally as BLOCKED. Never
weaken tests, inflate timeouts or fetch/repair dependencies to force success.
Unexpected external revision/requirements changes stop for human handling rather
than chasing the changed input.

Prepare only ticket-declared mechanical QA artifacts/values, with exact case and
preparation IDs, owner/consumers, hashes and retrievable references. Preserve case
expectations, requirement mapping, order and scope. Read only named helpers'
preparation contracts. No environment/credential discovery or replacement engine.
Consume actual deployment evidence for environment-dependent work; static work
cannot invent a preview prerequisite. Report human cases pending; no independent
QA or human PASS is inferred from regression tests. An agent-local artifact path
alone does not make evidence accessible to a remote reviewer.

## Record mapping

Use the existing complete `pigboard-handoff/v1` schema and same-release canonical
examples in `work-validator/docs/handoffs.md`. No schema copy or run keys injected
into records. Keep **every** canonical field including explicit nulls.

| Job outcome | Ordinary routing |
| --- | --- |
| READY | `kind: implementation`, role implementer, In Progress -> In Review; assignment/operation/requirements, exact `pr`, `stack_parent`, empty `consumed_requests`, plan, independent plan_review, passing ci, verification and every prepared_inputs artifact |
| DEPENDENCY_WAIT, BLOCKED, NOT_RUN, repair/resume | Local only: stop before candidate construction or append; no Jira transition. Retain complete findings, unfinished checks, linked reports and original receipts. |

Use the assignment's `operation_id`; generate one fresh record UUID once before
first publication and retain it with exact prepared bytes/digest. Never generate a
new run ID as operation ID. Required parent incorporation follows actual lineage,
not Epic-order guesses. For unfinished local/CI/prescribed checks, retain each as
NOT_RUN with reason in the full local report. Implementer `qa_report` is null;
do not invent QA observations or truncate evidence to obtain READY.

For ordinary READY the validated admission's `payload.requests` must be empty and
`payload.consumed_requests` must be `[]`. Both job and publisher independently compare
all assignment references (`ticket_id`, `comment_id`, `record_id`, `digest`) before
candidate construction; nonempty repair/wait causes hold without mutation. Preserve
the causes and historical incorporation evidence rather than dropping them to fit.

Independently compare the complete candidate semantics with current prepared facts:
assignment/operation/requirements, own PR/source/target, required parent revision,
plan/review, CI, verification, preparation and intended In Progress -> In Review edge.
Validate the original unpublished candidate in record mode; shape/formatter success
is insufficient. Actual predecessors must pass worker-current mode with complete
current start, own/required-parent/action proof. Never fabricate comment IDs or
server metadata to validate an unpublished candidate as a leaf. A mechanical mapping
error may be corrected before the first append only, then all gates are rechecked.
Conflicting existing slot results hold; an identical confirmed result is an original
receipt to retain, never a reason to append again. After any append attempt there
is no corrected replacement append or replay.

## Publication protocol

Use configured existing Atlassian tool contracts: property read, complete paginated
comments, append-new HTML comment, native issue reads, source-specific transition
listing and direct transition. The discovered names are `getJiraEntityProperty`,
`listJiraIssueComments`, `addOrEditJiraIssueComment`, `listJiraIssueTransitions` and
`transitionJiraIssue`; inspect the currently exposed inputs/responses, never invent
arguments. `addOrEdit` is allowed only in append-new mode, never old-result editing.
REST ADF receipts remain readable, not permission to create a REST client or fetch
credentials. Summaries and linked reports stay outside the canonical block.

1. Before consequential publication reread native eligibility, exact pointer/current
   assignment, requirements, PR/source/target and check facts. Verify configured
   actor/destinations and the **source-specific** available edge to the outcome's
   exact destination. A global transition ID or unknown edge cannot authorize a
   write. Inspect complete existing slot results; stop conflicts or retain an
   already confirmed identical receipt. Validate predecessor receipts and candidate
   as described above. Missing semantic proof prevents publication.
   For the ordinary first PR, retain genuine historical precreation proof unchanged.
   Reread exact current pointer, native site/project/type/full stream/status,
   requirements/assignment operation and complete current result/PR inventory.
   Exact predecessor bytes/digests/server metadata must match; actual PR creation
   and readback, own PR/source/target, passing CI, verification/preparation and
   required parent incorporation remain current. Recheck the direct edge and
   empty READY request set. Historical PASS cannot substitute for these reads.
   Missing genuine preparation or proof means local incomplete/unavailable output
   with no append or transition; never reconstruct history or append a blocker.

2. Prepare immutable supported HTML with the same-release deterministic helper:

   ```text
   node <receipt.skills>/work-validator/scripts/prepare-handoff.mjs --input RECORD.yaml --summary SUMMARY.txt --format html
   ```

   Source uses `node scripts/prepare-handoff.mjs` with the same arguments. It returns
   `{schema:'pigboard-handoff-publication/v1',record_id,record_digest,format,body}`.
   HTML contains escaped summary and exactly one supported YAML pre/code block;
   ADF is available for local/REST receipt checks via `--format adf`. Do not have an
   agent convert text or regex-parse HTML. Invalid/bounded transport fails without
   truncation. Retain exact returned body/UUID/digest before the first append.
3. Publish **once**, retain exact returned issue/comment identity. Read back that
   exact receipt through complete bounded pagination; verify author/update metadata,
   original canonical record bytes/digest/UUID against the independently retained
   candidate, plus actual server metadata. Transport wrappers may differ. Use
   actual observations and complete current inventory to validate this real leaf
   in worker-current mode; no synthetic prospective receipt or chain fallback.
   Retain `validated_leaf`/`qa_report` and diagnostics. Never synthesize a success.
4. After read-back and immediately before transition, reread native source stage,
   current pointer/assignment, requirements, PR/head/target and CI. Then send **one**
   direct In Progress -> In Review edge for verified ordinary READY. Retain response and reread native status. Do not put the comment
   on the transition request, walk intermediate columns, send In Progress, change
   labels/assignee/pointer, or act on another ticket.
5. Return exact outcomes, visible record reference, confirmed receipts and observed
   destination or unknown. Verify report/PR evidence accessibility. Publication does
   not mean transition, review, QA, merged code or a compatible active full loop.

Changed stage stops without overwrite or competing transition. Changed assignment,
requirements or revision still in source prevents success handoff: keep historical
evidence and report human handling. Do not manufacture a blocker that cannot bind
the current canonical assignment. Any inability, failed check, wait or repair/resume
stops before candidate construction or append, retaining full local output and
original receipts without a claim that Jira advanced. No fallback blocked record.

Failed/uncertain comment, read-back, pointer input, PR approval or transition ends
the turn without automatic retry, replacement publication or competing transition.
The existing **at most one resolving read** of relevant actual state may establish
a lost response. Only confirmed success and still-valid authority permit the next
distinct step. Explicit failure or unresolved read never authorizes replay. Retain
the same prepared bytes/ID after uncertainty; retention is not retry permission.
Preserve successful earlier actions. Missing Jira/access means durable output, not
an invented alert/status. Never poll blockers, spawn recovery agents or start the
next ticket. UUIDs, completion receipts and assignments are not run deduplication
or exclusive worker ownership.

## Durable result

Retain this phase result in the supplied durable output, separate from canonical
handoff schema. Use readable tables or structured fields without inventing a new
executable work schema:

- `implementationOutcome`: READY, DEPENDENCY_WAIT, BLOCKED or NOT_RUN.
- `deliveryOutcome`: NOT_ATTEMPTED, COMPLETED, UNAVAILABLE, UNCERTAIN or INELIGIBLE.
- `ticket_id`, exact `assignment`, `requirements_digest`; repository/branch/exact
  PR and source/base/test revisions or null; changed-file count and scope assessment.
- Accepted plan/review/model receipts; requested type/model/machine, accepted Task
  IDs/setup acceptance, actual returned metadata or “per-call model telemetry not
  returned.” Setup observation is not per-run telemetry; no child self-attestation.
- `prepared_inputs`/verification references, case IDs/expectations/order, commands,
  actual local results and separately current CI; human pending work and limitations.
- Historical precreation snapshot/result and full chain/metadata/digests when
  applicable, labelled historical, plus actual PR creation/readback and separately
  fresh final authority/inventory/outcome reads; never replace one with the other.
- `consumed_requests`, `stack_parent`, `unfinished_checks` with NOT_RUN reasons;
  `candidate_record` or null, exact prepared bytes/digest and confirmed/uncertain
  action receipts; observed `jira_status` or unknown and `recovery_reason`/human
  action/intended resume stage.

READY means implementation/PR/evidence ready at the recorded revision, never
reviewed/QA-passed/merged. COMPLETED means ordinary READY publication and direct In Review delivery are
verified; local wait/block is not Jira delivery. Preserve
READY if only delivery fails. NOT_RUN stops rejected eligibility before work.
NEEDS_HIGH_PLAN is a phase control return with preserved state, not a new canonical
record kind or permission to execute the changed approach. A human-authorized
resume is deferred here: preserve receipts/current observations and stop without
candidate, append or transition. Never repeat code, PR creation or mutations to recreate output.

## Prepared inputs recipe

For each declared preparation slot, retain its exact `id` and `used_by` order.
Publish one existing `prepared_inputs` entry with artifacts shaped as
`{label, uri, digest}`. Each artifact's observed `preparation` receipt must bind
the same PR and requirements, `details.preparation_id` and exact
`details.consumers`; `digest` is the SHA256 of the retrievable artifact bytes.
Check retrieval from the reviewer's intended environment and audience. A private
local path alone is insufficient for remote QA.

Include the selected request and assertions, full query and parameter positions,
UI route/browser/viewport/checkpoints, and declared child-response extraction
pointer with parent exposure and downstream consumers. Leave output values
unbound until actual helper evidence exists. Supply identity/tenant/access and
current PR/deployment proof independently; a request's expected value is no proof.
Record actual source commit and immutable installed skills/manifest/payload hashes
alongside input hashes. Missing facts stop the affected handoff with the exact
slot, consumer and owner needed to recover; preserve inputs and completed results
instead of changing expectations or replaying actions.

For source-only PREP-01 fixture exercises, follow the source checkout's
`docs/using-pigboard.md#prepare-prescribed-qa-inputs` guide. It is not installed.
The new output is empty and designated human cases remain pending.
