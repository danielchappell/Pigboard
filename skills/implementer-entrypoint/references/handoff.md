# Implementer inputs, job evidence and typed Jira handoff

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
| Repair/resume | Previous assignment and plan/review, exact still-open PR/source branch and prior heads, every assigned repair/root reference and required incorporation revision; explicit trusted human resume authorization only if it exists |

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
node <receipt.skills>/work-validator/scripts/validate-handoff.mjs --mode chain --input RECEIPTS.json --json
```

`--format adf` accepts original ADF work; chain input is JSON only. See the same
payload's `docs/authoring.md` and `docs/handoffs.md` for exact local contracts.
`lib/contracts/work.mjs` exposes `validateWork`, `parseWork`/`extractADF`;
`lib/contracts/handoff.mjs` exposes `extractHandoff`/`digestValue`; receipts use
`validateReceiptChain`. Preserve raw finite-float provenance: never JSON-parse and
reserialize unvalidated provider work/record text before these checks. Chain input
uses the existing `pigboard-receipt-input/v1` envelope with actual normalized
observations: `trusted`, `issues`, `requirements`, `comment_pages`, `pr_receipts`,
`evidence_receipts`, `retained`, `request_resolutions` and exact `target`. Do not add
undeclared native type or runtime fields to that envelope. Check those separately.
The chain result exposes `validated_leaf` and `qa_report`, not a `leaf` alias.
Neither record nor chain validation fetches providers or proves live freshness.

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
   trust. Missing pages/deleted/edited/mismatched receipt stops. Validate the exact
   assignment/predecessor chain and independent native project binding. No manager
   database, lock or proof of exclusive worker ownership is required.
3. Read current Epic, surrounding full-stream tickets/order and explicit prerequisites
   for context. Validate complete requirements/start plan with trusted context and
   canonical requirement digest. Own comments cannot change this fingerprint;
   native metadata still needs independent rechecking. Missing schema, question,
   expected result, capability/access or configured scope is a blocker only if a
   truthful result can bind the verified current assignment. Context never grants
   authority to implement adjacent work or interrupt another ticket.
4. Resolve actual checkout/remote/source/base, target instructions and gates. Read
   branch PRs, complete retained publication/action receipts before first creation.
   Any prior uncertain creation forbids another PR. Repair requires exact same
   repository/PR/source branch, still open, prior assignment/accepted plan and all
   assigned repair/root references. Missing/closed/merged repair PR blocks with no
   replacement. Null PR repair is allowed **only** for documented pre-first-PR
   dependency wait: complete supplied publication inventory, no PR anywhere in prior
   lineage, matching previous assignment and unresolved request references. Unknown
   history or a generally missing PR is not proof of this special case. Retain the
   genuinely supplied complete precreation snapshot and successful canonical result,
   full assignment/predecessor chain, exact references/digests/server metadata and
   requirements through High/Medium continuation. Repeated no-PR waits retain their
   full real prefix. After creation this is historical precreation proof, never a
   fresh assertion that the inventory is empty; retain actual PR creation/readback.
5. Check actual predecessor PR, merge, completion and base/incorporation facts.
   Epic order alone is not lineage. Actual stack dependency needs exact parent
   ticket/PR, verified completion and incorporated revision, same site/project/full
   stream/repository. Merged predecessor uses actual configured base and actual
   merge/incorporation evidence. Unmerged predecessor follows the repository's
   authorized stacking method. Independent work has null parent. Never infer
   integration from green parent CI or retarget another ticket. Missing necessary
   lineage/access blocks; a confirmed upstream repair preventing completion is
   DEPENDENCY_WAIT with exact unresolved request references.

Do not make a new assignment or human resume producer. A Blocked result stays
terminal unless an already supplied unique explicit trusted human authorization
validly references it, returns it to the original worker stage and preserves
requirements/PR/source/assignment under the canonical chain contract. Consume that
reference and retain completed actions. Without it, no polling or automatic resume.

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
On repair incorporate every assigned cause and required actual parent revision;
retain evidence of every incorporated root; READY consumes only the exact assigned
references under [record mapping](#record-mapping). Preserve unrelated work, one PR
and source identity. Publish/update ready non-draft PR using authorized repository
method after its gates. No self-approval, merge, deploy or human acceptance claims.

Run actual required local checks and separately verify hosted CI's required tests
executed and passed at the current actual PR head/target or relevant tested merge
revision, with no conflicts. A green summary/exit code is insufficient. Missing,
stale, skipped, cancelled, pending or failed checks do not pass. Wait only through
the supplied finite mechanism; demonstrated in-scope code defects may be fixed at
Medium and new revision checks run. Changed approach returns to High; unavailable
checks/access, unknown cause or unrelated infrastructure needs Blocked. Never
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

| Job outcome | Canonical candidate |
| --- | --- |
| READY | `kind: implementation`, role implementer, In Progress -> In Review; assignment/operation/requirements, exact `pr`, `stack_parent`, `consumed_requests`, plan, independent plan_review, passing ci, verification and every prepared_inputs artifact |
| DEPENDENCY_WAIT | `kind: dependency_wait`, role implementer, In Progress -> Rework Queued; exact unresolved `requests`, PR or proved pre-first-PR null, precise reason and linked run evidence |
| BLOCKED | `kind: blocked`, role implementer, In Progress -> Blocked; supported reason enum, detail, human_action, known PR/basis/evidence, partial run report and intended resume stage |

Use the assignment's `operation_id`; generate one fresh record UUID once before
first publication and retain it with exact prepared bytes/digest. Never generate a
new run ID as operation ID. All incorporated roots and `stack_parent` follow the
existing contract, not Epic-order guesses. For unfinished local/CI/prescribed checks,
record each as NOT_RUN with reason in the linked report. Implementer `qa_report`
is null; do not invent QA observations. Any actual retained report must satisfy
the existing role-specific contract; shape-valid supplied facts are not authority.

For READY, `payload.consumed_requests` contains every reference in the validated
admission's `payload.requests` exactly once and no others. Compare all four fields:
`ticket_id`, `comment_id`, `record_id`, `digest`; detect missing, duplicate, extra or
different-digest references. Construct in admission order for determinism; canonical
semantics are set membership. Ordinary `requests: []` produces `consumed_requests: []`.
If assigned stack request U1 has root R1, consume U1 only, while verifying/reporting
all R1 incorporation and required parent completion/revision through lineage,
`stack_parent` and linked evidence. If assigned a `dependency_wait`, consume that
exact wait reference, never its nested requests instead of or alongside it. Directly
assigned repair requests remain direct entries. Never discard causes or evidence
to satisfy equality. Partial wait/block records keep their own references/reports,
no `consumed_requests` field and no claimed incorporation or passing CI.

Before append, both job preparation and Jira publication compare this exact READY
set against validated assignment references, separately from record/formatter shape
success. A mechanical mapping error in an unpublished candidate may be regenerated
from verified references and all gates rechecked; missing/uncertain assignment or
incorporation facts stop readiness. After any append attempt there is no corrected
replacement append or retry, including after chain rejection.

Unpublished candidate: record-mode validation only, then compare actual evidence
facts/references against reads. Do not fabricate a comment ID/server metadata to
pass chain validation before publication. Semantic proof still matters even where
the record validator only checks shape. Existing assignment/predecessor receipts
must pass their appropriate phase checks. In the first-PR-after-null-repair interval,
use retained actual historical precreation proof plus the independently fresh checks
below; a fresh admission-only chain with the new PR honestly in inventory must not
be expected to pass. Conflicting existing results for the same
slot hold work; a confirmed identical result is a retained publication receipt,
not a reason to append again. Complete bounded reads are required to know this.

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
   For first PR after proved null-PR repair, label retained proof **historical
   precreation proof**. It may be revalidated unchanged, never called current.
   Independently reread exact current pointer, native site/project/type/full stream/
   status, requirements and assignment operation; exact assignment/predecessor bytes,
   digests and server author/update metadata must match retained proof. Read complete
   fresh publication inventory, all result slots and requests, actual PR creation/
   readback and current own PR identity/source/target. The sole PR created by this
   assignment must honestly appear. Additional/unaccounted PRs, uncertain creation,
   edited/missing proof or new unresolved obligations stop. Verify fresh CI,
   verification/preparation and parent/root lineage appropriate to the actual kind:
   READY requires passing checks/incorporation; wait/block retains unfinished checks.
   Recheck directed access/transition gates and exact READY reference equality.
   Historical PASS cannot substitute for these reads. Missing genuine precreation
   snapshot/result after creation means local unavailable/incomplete handoff with
   **no append or transition**: never reconstruct history, hide the PR, fabricate
   prospective comment metadata or append a speculative blocker as fallback.
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
   parsed record ID/digest and unchanged canonical content. Append actual provider
   observations to the supplied receipt envelope and chain-check this real target
   with complete current inventory. Only this actual post-append receipt can
   discharge historical null admissions under the canonical contract; it never
   retroactively proves missing preflight or authorizes the earlier append.
   Retain `validated_leaf`/`qa_report` and diagnostics. Never synthesize a success.
4. After read-back and immediately before transition, reread native source stage,
   current pointer/assignment, requirements, PR/head/target and CI. Then send **one**
   direct In Progress -> In Review, Rework Queued or Blocked edge matching the
   verified outcome. Retain response and reread native status. Do not put the comment
   on the transition request, walk intermediate columns, send In Progress, change
   labels/assignee/pointer, or act on another ticket.
5. Return exact outcomes, visible record reference, confirmed receipts and observed
   destination or unknown. Verify report/PR evidence accessibility. Publication does
   not mean transition, review, QA, merged code or a compatible active full loop.

Changed stage stops without overwrite or competing transition. Changed assignment,
requirements or revision still in source prevents success handoff: keep historical
evidence and report human handling. Do not manufacture a blocker that cannot bind
the current canonical assignment. Before any attempted final write, a truthful
valid blocked candidate may use its normal single handoff; otherwise durable output
retains the unresolved prerequisite without a claim that Jira advanced.

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
reviewed/QA-passed/merged. COMPLETED means intended handoff verified, including a
verified dependency-wait or blocked handoff; it does not mean code success. Preserve
READY if only delivery fails. NOT_RUN stops rejected eligibility before work.
NEEDS_HIGH_PLAN is a phase control return with preserved state, not a new canonical
record kind or permission to execute the changed approach. A human-authorized
delivery-only resume first checks retained receipts/current gates and never repeats
code, PR creation or confirmed mutations just to recreate output.

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
