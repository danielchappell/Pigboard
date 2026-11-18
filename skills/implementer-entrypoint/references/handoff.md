# Implementer inputs, job evidence and typed Jira handoff

## Ordinary worker release boundary

Use the same-release support matrix in source `docs/handoffs.md` or installed
`<receipt.skills>/work-validator/docs/handoffs.md`, under “Ordinary worker release
boundary.” Implementer execution supports current new work or non-resumed repair
of one still-open PR for own assigned requests. The matrix also selects the two
supported inability outcomes. A phase label grants no authority. The Jira
publisher independently checks the chosen proof and permission. Unsupported
assignments stay local with all findings, unfinished checks and original receipts.

The [structured reviewer](../../pigboard-pr-review/SKILL.md) consumes the
implementation record. This route uses structured requirements. The historical
[basic prose contract](../../write-pr-sized-stories/references/basic-workflow-ticket.md)
applies when the selected QA entrypoint declares it.

## Input contract

The assigned key selects the issue. Resolve everything else through the immutable
installation receipt/manifest, canonical configuration and existing capabilities:

| Source | Facts to retain |
| --- | --- |
| Setup and repository | Exact Jira site/native project/full stream, configured actor, allowed repo and evidence audience, model profiles, exposed tools/rights, pinned validators, exact checkout/branch/base and target instructions |
| Native Jira reads | Immutable issue ID/key, Story/Bug type, In Progress, original work and pointer, complete bounded comment pages and server metadata, current slot, reachable prerequisites and related changes, prior action receipts |
| Repository and evidence reads | Exact PR inventory and open PR source/target or complete precreation history, actual parent incorporation/completion, prepared artifacts, checks and retrieval facts as each becomes available |

Resolve scope with the installed `parseConfig(input,{expectedSite})`,
`resolveProject(scope,{site,project_id})` and `inspectStreams(scope,label)`.
Match the site, immutable project ID and full label. A display key or board number
cannot select a project. Reuse setup; do not obtain new credentials, read worker
State, install dependencies, or fall back to another release or strict chain.

Use the validation scripts in `<receipt.skills>/work-validator/scripts` and the
installed library and contracts beside them. Source invocations use `scripts/`:

```text
node <scripts>/validate-work.mjs --mode scheduling --input WORK --format yaml --config CONFIG --scheduling SCHEDULING --json
node <scripts>/validate-handoff.mjs --mode recorded-history --input HISTORY.json --json
node <scripts>/validate-work.mjs --mode start --input WORK --format yaml --context CONTEXT --json
node <scripts>/validate-handoff.mjs --mode worker-current --input WORKER.json --json
node <scripts>/validate-handoff.mjs --mode worker-assignment --input ASSIGNMENT.json --json
node <scripts>/validate-handoff.mjs --mode record --input RECORD.yaml --format yaml --json
```

Use `--format adf` for original ADF work. Preserve raw work and native comment
bodies, including literal provenance. For the canonical requirements fingerprint,
use the prepared work `parseWork`/ADF `extractADF` and handoff `digestValue`
on the original valid requirements. Scheduling returns no fingerprint. See the
installed validator's authoring/handoff docs for the closed input contracts.
These commands validate supplied facts. None authorizes dispatch, edits or writes.

## Preflight

1. Name the next action. Verify native type/stage/scope, actual capabilities,
   actor and tools before the affected call. Read current original work,
   `pigboard.work-context`, complete comments, actual dependency declarations
   and PR/branch inventories. Bind exact raw requirements digest, pointer and
   assignment. Use scheduling with canonical config and the actual reachable
   graph. An unreadable assignment, changed inputs, conflict or unauthorized
   action holds; keep actual observations and prior receipts.
2. Use `worker-current` with full context when available for ordinary
   predecessor proof. If a declared code-dependent input is still future,
   perform the following read-only preparation for the named plan or edit:

   - Target the exact admission with `recorded-history` and real raw pages,
     native facts and original requirements. Supply genuine retained tuples.
     Its manager-shaped envelope accepts `manager_assignments: []` when no
     State rows were supplied. Keep the pointer as native Jira evidence.
     Match the returned issue/comment/UUID/digest, operation, manager author,
     unchanged metadata, requirements, project/full stream and stage.
     Recorded history proves ancestry only, with external freshness unevaluated.
   - Inspect the complete live role slot for the assignment, including any
     competing or resumed record. Require initial new work or supported
     same-open-PR repair with current admitted source/target and no resume.
     Retain confirmed/unknown actions without replay. Compare current native
     discovery and required requests with authenticated direct references.
     Preserve each exact direct request, its lineage and all outstanding
     returned roots, including older admissions. Prior implementation alone
     leaves causes outstanding.
   - For ordinary success, qualifying automatic resolution uses coherent
     proper-ancestor QA. For an explicit request/completion pair, require coherent
     same-ticket QA that consumes the exact request or its root closure with
     verified evidence. Contradictory pairs hold. Sibling QA alone cannot resolve
     roots. For an inability wait, use the narrower subject/current-stage
     incorporation and resolution rules of `worker-assignment`. Do not
     transfer credit between purposes.
   - For an incorporated parent, verify actual native Human Review or accepted
     later stage, current pointer and raw requirements, exact coherent parent QA,
     current acceptable PR/identity/source/target, evidence and same stream/repo.
     Verify the actual incorporated revision. For merged parents compare the
     recorded revision with actual base and incorporation evidence. Independent
     work has a null parent. Missing, stale or ambiguous observations hold.
   - Verify the specific action independently. High investigation is read-only.
     Verify the High plan/review profiles and actual dispatch controls. Before
     Medium verify the exact accepted plan hash, unchanged current assignment,
     checkout and write authority. PR and Jira writes each need their own current
     proof. Carry observations and receipts into the continuation. This sequence
     produces no `worker-current` success and cannot replace it at READY.

3. A prospective supported inability uses `worker-assignment` with explicit
   intent, `publication: none` and the actual Blocked or Rework Queued edge.
   The same native and next-action checks still apply. Permission to deliver
   success can exist independently of permission to deliver either inability.
   A rejected proof holds the chosen action. Do not try a fallback intent.

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
Ordinary READY requires the complete assigned request set under
[record mapping](#record-mapping): empty for new_work, every exact assigned request
once for a supported repair. Preserve all unresolved ancestor findings; a prior
implementation alone does not resolve them. Only coherent verified QA consumption
resolves causes. Preserve unrelated work, one PR
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

Use the existing `pigboard-handoff/v1` schema, all canonical fields and explicit
nulls. Use the admission's `operation_id`. Allocate a candidate UUID once before
append and retain it with the original raw bytes and canonical digest.

| Retained outcome and proof | Candidate and direct edge from In Progress |
| --- | --- |
| READY | `kind: implementation` to In Review. Match exact assignment, operation, requirements, current PR and parent, verified plan/review, passing current CI, verification and every declared preparation. Consume each direct admission request exactly once, with no flattened roots. New work consumes none. |
| Verified missing prepared input | `kind: blocked` to Blocked with `reason: missing_input`, null basis and an available direct edge. Use the declared `missing_step_id` in detail as a distinct token, and give an actionable human step. Bind the actual current PR or complete first-PR history. |
| Verified dependency wait | `kind: dependency_wait` to Rework Queued with an available direct edge, exact outstanding request references and the reason work must wait. Require subject-eligible roots unincorporated at the actual stage. |
| Missing rights, unsafe operation, stale assignment, failed/unknown checks, unclassified absence, unsupported or uncertain actions | Local only. Preserve complete findings, NOT_RUN with reason for unfinished checks and original receipts. |

Worker-assignment classifies only supported inability from supplied evidence.
Unsupported blockage has no candidate. Use null `qa_report` for implementer
inability. Preserve every cause, compare direct refs by ticket/comment/UUID/digest,
and check complete current PR history, actual eligibility and source slot.

## Publication protocol

**Retain the actual predecessor for READY.** Once strict start inputs exist and
before the first PR write, run `worker-current` on the actual current admission.
For a first PR retain complete genuine precreation inventory with no published
subject PR. For repair, first create the declared local artifact, then validate
the full start context and the still-current admitted PR source/target before
updating it. Do not require post-push CI or deployment at this checkpoint.
Retain exact original packet/result, pointer, requests, actor/edge and server
metadata. After the authorized PR create/update, read back the actual PR. Keep
the pre-write packet historical, and use exactly one current receipt for the
new head. Never represent the old admitted head as current after updating it.
A missing pre-write proof holds READY.

**Check the intended current outcome.** Reread native scope, exact assignment,
raw work and complete current result slot, applicable PR/parent/evidence and
permission for the actual source-specific edge. For READY run strict start again
on the full current context with retrieval, precise prescribed operations and
current prepared receipts. Match the independently observed current PR/source/
target, passing CI, plan/review/verification, parent and direct request set to
the complete candidate semantics. Check the unpublished original in record mode.
For inability use the same original work and fresh observations, and run
`worker-assignment` with `publication: unpublished` and the original candidate.
Never assign native metadata to an unpublished record. A conflicting slot holds.
Retain an already confirmed identical record as the original receipt.

**Prepare and append.** Use the actual configured property read, complete
paginated comment reads, append-new HTML, native issue reads, transition listing
and direct transition. Inspect the actual exposed contracts. The known tool
names are `getJiraEntityProperty`, `listJiraIssueComments`,
`addOrEditJiraIssueComment`, `listJiraIssueTransitions`, `transitionJiraIssue`.
Use comment append only. The formatter returns a body with the exact candidate:

```text
node <receipt.skills>/work-validator/scripts/prepare-handoff.mjs --input RECORD.yaml --summary SUMMARY.txt --format html
```

Source uses `node scripts/prepare-handoff.mjs` with the same arguments. Keep
the formatter body, UUID and digest before the single append. Verify native
readback with actual immutable comment ID, configured author and edit metadata.
Compare original canonical bytes/digest/UUID against the independently retained
candidate. For READY run `worker-current` on the real leaf at the new current
head with the admission as ancestry. For inability use `worker-assignment`
with `publication: readback` and the same original candidate.

**Transition and confirm.** Recheck current native source stage, pointer,
requirements, complete slot, applicable PR/parent/evidence and direct permission
again. Use the single direct edge for the verified outcome. Do not attach the
comment to the transition or mutate another field. Reread native destination.
Comment publication and transition are separate confirmed effects.

Changed assignment, requirements, source, revision or rights holds the affected
action. There is no fallback blocker. Unknown PR, append or transition permits
at most one resolving read with original identity. A confirmed result and
still-valid authority allow the next distinct step. Never replay a failed or
uncertain action, append a replacement or start another ticket. Retain original
candidate and full local work so a human can resolve the actual uncertainty.

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
- Historical precreation or pre-update snapshot/result and exact metadata/digests,
  plus actual PR creation/update readback and fresh final authority, inventory
  and outcomes.
- `consumed_requests`, `stack_parent`, `unfinished_checks` with NOT_RUN reasons;
  `candidate_record` or null, exact prepared bytes/digest and confirmed/uncertain
  action receipts; observed `jira_status` or unknown and `recovery_reason`/human
  action/intended resume stage.

READY means implementation/PR/evidence ready at the recorded revision, never
reviewed/QA-passed/merged. COMPLETED means the eligible outcome was read back and its direct destination
was confirmed. Local wait/block has no Jira delivery. Preserve
READY if only delivery fails. NOT_RUN stops rejected eligibility before work.
NEEDS_HIGH_PLAN is a phase control return with preserved state, not a new canonical
record kind or permission to execute the changed approach. A human-authorized
resume is deferred here: preserve receipts/current observations and stop without
candidate, append or transition. Never repeat code, PR creation or mutations to recreate output.

## Prepared inputs recipe

Once the necessary code or fixture exists, fill only each declared mechanical
slot. Keep its exact `id`, owner and `used_by` order, cases, expectations and
cleanup. Verify the actual operation with the approved capability, read-only
status, safe target, duration and exact parameter bindings as applicable.
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
