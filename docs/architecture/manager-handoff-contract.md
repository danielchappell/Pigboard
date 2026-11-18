# Worker handoff contract

Current scope: [Pig Boss company installation and health](pig-boss-operations.md). All stream identities below mean Jira site + immutable project ID + full label. Basic manager health is in release one; worker monitoring remains deferred.

Design for PGB-67, 14 November 2026. This specifies the first manager release;
installed skills still use the earlier prose contract. Independent review and the
[isolated test packet](manager-test-packet.md) gate adoption. No worker is activated
by this document.

## Available local validation

The source and prepared bundle include the strict record/receipt-chain validator and the two explicit recorded manager purposes;
see [operator and agent usage](../handoffs.md). It checks bounded supplied evidence,
not live freshness. This does not install the future provider adapters, role
producers, manager or human-unblock automation described below, and activates no
worker. The schema is canonical under root `contracts/`; historical skeletons
remain preparation aids.

## What is passed on

A handoff says **which assigned work was done, on which PR revision, with what
result and evidence**. It is not a worker lease, run identity or proof that only
one Cursor agent exists. Workers do not contact DynamoDB or claim ownership.

Jira retains requirements and stage. One visible, append-only Jira comment holds
each typed handoff. A small issue property, `pigboard.work-context`, points to the
current admission comment. This is generated work data, not another configuration
file. The manager writes the pointer; workers read it and publish their results.

The pointer avoids choosing the newest comment by date or reading all past work
to find an assignment. It contains only a reference, not copied requirements,
status, credentials or a second result. It is a lookup aid, never authorization.
Issue editors and apps can change properties; there is no per-role protection or
compare-and-swap guarantee in Jira properties.

Alternatives considered: comments alone require finding the current assignment
among history; embedding metadata in the transition request would reduce calls,
but its publication/trigger behavior has not been proved. First release uses
explicit, confirmed publication before transition and does not assume atomicity.

## Files and encoding

- [Handoff schema](../../contracts/handoff-v1.schema.json): JSON Schema 2020-12.
- [Pointer schema](../../contracts/work-pointer-v1.schema.json).
- [Role skeletons](examples/handoffs/): one document per comment, with nulls visible.

Each comment contains a short human summary and exactly one ADF `codeBlock` whose
text is a single YAML mapping with `schema: pigboard-handoff/v1`. REST readers walk
the ADF node. The existing MCP route supplies its documented HTML code-block
representation: use an HTML parser to recover that text, then the same safe YAML
1.2/JSON-compatible validation. Do not parse rendered fences or prose. See the
[verified transport contract](manager-worker-transport.md).
Unknown keys, duplicate keys, aliases, custom tags, multiple documents, unsupported
versions and missing required values fail validation. Apply schema format checks,
including UUID and URI checks. Skeleton nulls are preparation aids, not valid output.

The handoff YAML text is at most 16 KiB UTF-8, nesting depth at most 16; each list
has at most 100 entries. Long reports/screenshots belong at configured evidence
locations, with references in the comment. Exceeding a bound blocks publication;
never truncate case results or findings to fit. These are initial contract limits
to exercise in the probe; whole-scan limits remain PGB-68 work.

`record_id` is a fresh UUID generated before the first write. The same bytes retain
the same ID after an uncertain publication; never manufacture another ID to retry.
`operation_id` is the admission attempt UUID for worker results. For manager
admission/queue records it is that manager mutation's attempt UUID and equals
`record_id`. Neither value identifies or deduplicates Cursor runs.

A reference carries stable Jira ticket and comment IDs, record UUID and digest.
The digest is `sha256:` plus the lowercase SHA-256 of the record's parsed JSON
serialized with RFC 8785 JSON Canonicalization Scheme. `requirements_digest` uses
the same algorithm over the complete parsed ticket contract. Narrative outside the
contract is context, not extra executable requirements. Native status/labels/parent
are checked separately, so an Epic pause does not invalidate a draining worker.
Human editing of a requirement invalidates earlier matching evidence; it does not
silently rewrite it. JSON values must be representable under the canonicalization
rules. No secret or credential-bearing URL may appear in any record.

## Envelope and role outcomes

All fields in the schema are present. `assignment` is null only for an admission;
otherwise it references the assigned admission comment. The record's ticket,
requirements digest and operation must agree with that assignment, except a
manager stack request uses its own queue-operation ID while referencing B's last
assignment. `role` is a claimed role checked against server actor metadata and the
configured role mapping, not an authentication assertion.

| Kind | Writer and source | Destination | Meaning |
| --- | --- | --- | --- |
| `admission` | Manager, Ready to Work or Rework Queued | In Progress | Assignment intent; actual transition success is separate |
| `implementation` | Implementer, In Progress | In Review | Plan + one independent plan review, same/new PR, current CI and prepared QA inputs |
| `review` | Reviewer, In Review | QA | Current PR approval and shared review report |
| `qa` | QA, QA | Human Review | Assigned AI cases passed; human cases separately pending |
| `repair_request` | Reviewer in In Review, QA in QA, or human-request automation in Human Review | Rework Queued | Confirmed in-scope findings on the same PR |
| `dependency_wait` | Worker in its current stage | Rework Queued | Known outstanding upstream request prevents completion |
| `blocked` | Worker in its current stage | Blocked | Human intervention required |
| `stack_update_request` | Manager, Human Review | Rework Queued | Required update of B after its recorded parent's repair completes |
| `resume_authorization` | Human-request path, Blocked | Original worker stage | Explicit permission to continue after a resolved blocker; producing the unblock automation remains separate work |

Discussion remains ordinary comments in the current stage. Do not publish an
approval-shaped record for changes requested. A reviewer/QA failing result is a
`repair_request`; an inability to finish is `blocked`. Missing lineage, unsupported
QA or scope growth cannot be converted to understood repair just to keep moving.
Human requests after a PR is merged use a separately groomed Bug, not this repair.

The job skill produces evidence. Its role-specific Jira skill validates, publishes,
transitions and ends. QA helpers return observations and never move Jira tickets.
Entry points compose these skills. Repository CONTRIBUTING/AGENTS instructions and
shared PR criteria remain separate from the Jira handoff skill.

## Semantic checks in addition to JSON Schema

A well-shaped object alone is insufficient. The validator and role skill require:

1. Every reference resolves to its named issue/comment/record, matching digest and
   allowed server actor. Resolve the exact referenced comment ID: directly through
   REST, or through bounded complete MCP pagination and exact-ID selection. Reject deleted, edited,
   conflicting or inaccessible evidence; verify the server's author and update
   metadata, not a body-supplied author. Previously consumed server metadata and
   digest remain in manager state so an edit cannot silently change a decision.
2. The pointer names this issue's configured manager admission record and matches
   the manager's stored assignment when the manager consumes evidence. Workers
   verify the manager actor, current stage and assignment content. They have no
   database access; this does not make Jira metadata tamper-proof. Shared worker
   identities remain an explicit trust limitation, not technical role isolation.
3. Worker results use the current assignment and requirements digest. There is one
   final result per role, assignment and `resume_authorization` reference (null for
   the first attempt). Identical publications are one logical result; differing
   results for that slot hold. A human-authorized resume opens a new result slot
   only as specified below. This tracks deliberate recovery, not Cursor runs or
   exclusive-worker ownership; duplicate side effects remain outside this release.
4. `admission.mode` is `new_work` only from Ready to Work, with `requests: []` and
   `existing_pr: null`. Repair admission comes from Rework Queued with nonempty
   requests and its existing PR whenever a PR has been published. Null is allowed
   only for a documented dependency wait before the first PR, with complete prior
   evidence showing none was published; it never means a known PR was forgotten.
   The previous assignment is required on repair;
   ordinary new work has none. All referenced requests remain unresolved or are
   explicitly accounted for by later verified completion, never dropped by date.
5. PR identity is provider/repository/number; source revision and target branch are
   observed facts. One record refers to only the ticket's PR. Configured allowed
   repositories/hosts govern access. A parent must be in the same repository and
   full numbered stream, with matching completion and incorporated revision.
6. Implementation evidence covers the declared plan, independent plan review,
   exact PR source and passing CI. Every declared preparation slot has the required
   retrievable, hashed artifact or resolved value in its report; requirements and
   expected test outcomes are unchanged. An existing repair never changes PR identity.
7. Review references that implementation and the same PR/source revision; approval
   and all shared review criteria/comment handling are evidenced. QA references that
   review and the same revision. Required environment evidence identifies the
   deployed revision and comes from the pipeline's PR comment, not a guessed URL.
8. QA `steps` cover the ticket's full AI step ledger, including prescribed nested
   helper calls, once and in order. Each PASS/FAIL has its required evidence. A
   NOT_RUN has its reason and, when defect-dependent, the finding ID. A NOT_RUN
   row retains the distinct finding IDs on FAIL or NOT_RUN prerequisite rows named
   by its case's `depends_on`, including through a chain of skipped prerequisites.
   Joined paths need only one copy of each ID; an empty-ID skipped prerequisite
   contributes none. Ownership, bindings, same-case membership, earlier rows and
   PASS metadata do not establish this requirement. Independent blockers retain
   their own reasons without invented causal IDs. `qa` requires
   all assigned steps PASS. Other records retain partial results and skipped steps.
   Reused evidence needs an explicit case-specific basis in its linked report.
   QA `blocked` and `dependency_wait` may retain optional `findings` using the
   existing bounded finding shape (1–100 when present); other roles cannot add
   that property. Each FAIL/defect-dependent skip resolves its finding IDs, and
   each finding retains distinct nonblank identity/summary and approved evidence.
   Omitted findings remain omitted in historical bytes and digests. Retained
   observations do not themselves queue repairs, authorize resume or prove repair.
   An all-NOT_RUN non-completing report can describe missing deployment without
   environment evidence. Any PASS/FAIL, including reused results, requires nonnull
   `payload.pr` naming the tested revision, matching result evidence and the unchanged
   trusted exact-revision pipeline environment. A `PR` error at `payload.pr` requires
   preserving the observations and obtaining the actual tested revision/proof for a
   new canonical receipt. If unavailable, report that inability; never invent a
   revision, erase PASS/FAIL or mutate an already published signed receipt. Successful
   runtime QA retains that requirement and human-only static completion its exception.
   This reporting exception grants no runtime or provider authority. New optional
   findings require the matching reviewed validator release; never strip them or
   downgrade validation. A missing-ID LEDGER error names the consumer field:
   preserve evidence and prepare a new corrected receipt with the complete ledger
   through canonical publication; never mutate an already published signed receipt
   or rewrite a FAIL to obtain acceptance. The validator neither repairs inputs
   nor grants execution/resume authority. Existing immutable installation binding
   is unchanged.
9. `human_pending` equals the ticket's human case IDs. Agents never report human
   PASS. Owner-approved on 14 November 2026: an explicitly all-human ticket is allowed only with no AI steps, complete
   human cases and a nonempty matching `no_ai_cases_reason`; QA reports zero AI
   cases, not a test pass invented from an empty suite. CI and PR review still apply.
10. A repair request identifies its finding IDs, exact affected revision and basis
    (implementation for reviewer, review for QA, last QA completion for human).
    QA requests retain the full partial report. A scope increase is Blocked.
11. A stack request references B's prior QA completion, the immediate parent's new
    QA completion, required parent revision and all root repair requests. Parent
    completion incorporates those roots; B's prior lineage actually names that
    parent and is stale. A normal merge/retarget or independent B cannot qualify.
12. Incorporation is recorded only when the required requests and parent revision
    were actually incorporated. Implementation, review and QA must form one
    coherent revision chain before the manager treats repair as complete. Jira
    must also be Human Review or a configured later accepted stage. A comment
    alone, cancelled status or uncertain transition is not completion.

Manager selection follows explicit references and its recorded assignment, never
latest timestamp. Complete bounded comment discovery for current-assignment results
and new human repair requests remains necessary; known references allow targeted
reads. Missing pages or exceeded scan budgets hold the scope. A result missing
because a worker crashed is not automatically repaired by this release.

## Publication and failure order

Manager admission:
1. Read current inputs and conditionally persist one intent for the stream revision.
2. Publish the admission comment; await its Jira ID, read it back and verify content
   and server metadata. Save the reference to that same pending intent.
3. Write the pointer, await confirmation and read it back. Recheck the source,
   membership and requirement digest. Changed facts cause a held intent, not launch.
4. Send one source-specific transition. Save confirmed success against that intent;
   otherwise retain its pending/uncertain state. The worker may start before this
   final database save: the published assignment is already complete, and a failed
   save holds later manager work rather than invalidating that worker's evidence.

Workers read the pointer, assignment and relevant predecessor results at entry.
Before handoff they recheck current assignment, stage, requirements and PR revision.
A changed stage stops without overwriting it; a changed input still in their stage
requires human handling. Publish their single final record, verify its receipt and
read-back, then request the configured direct transition once. A confirmed result
and transition receipt remain separate. A failed/uncertain comment, pointer, PR
approval or transition ends the turn without replay or a competing transition.
If access itself prevents a Jira blocker, retain the result in the existing run
output; do not claim a Jira alert or stage change occurred.

Manager queueing B follows the same durable-intent rule but publishes a stack
request and **does not replace B's admission pointer**. After confirmed publication,
recheck B's current completion/parent facts and send Human Review -> Rework Queued
once. On later admission, publish a new B assignment referencing that request and
then update the pointer. Its implementation owns only B's PR and preflights that
it is still open. The manager does not add a Bitbucket/GitHub polling adapter.

Any unknown mutation outcome retains the stream hold for a human. No automatic
expiry, blind lock deletion or invocation retry may replay it. Reconciliation
checks the retained operation, actual Jira state/history and published references;
a new admission requires a deliberate reconciled state revision. The pointer is
not deleted or guessed back to an older value.

### Explicit human resumption

A blocked result is terminal for that attempt. The same assignment can continue
only after a configured human-request actor publishes `resume_authorization`
referencing that exact blocked result and then returns Jira from Blocked to the
blocked record's original worker stage. Its requirement digest, PR identity/source
and assignment must be unchanged. The worker cannot create or infer this authority.
Implementing the human-unblock automation remains separately scoped work; this
defines the input its consumer must accept, not a new automatic recovery service.

The resumed result carries the authorization's reference in `resume_authorization`.
Its old blocked result stays historical; it does not conflict with the new slot.
A later blocker needs another explicit authorization referencing the new blocked
result. Reject two different authorizations for the same blocker, a cycle, a resume
of a successful result, unauthorized authors, wrong destination, edited references
or changed requirements/revision. Conflicting non-blocked outcomes cannot be
superseded through this path. Never choose a leaf by timestamp.

Validation follows the unique chain from the assignment's initial result through
blocked result -> human authorization -> resumed result. Exactly one current leaf
may count. The resumed worker retains completed-case evidence only under the
existing case-specific reuse rule; it cannot replay known completed mutations or
drop failed cases to repair its report. Changed code/scope/requirements instead
needs a new reviewed assignment through the normal queued-rework path. If no
usable human-request path exists, the item stays Blocked and the gap is reported;
no worker invents a bypass. The assignment pointer remains unchanged on resumption.

## Worked repair and contract checks

A's initial assignment is O1; B's is O2 and records A's completion at revision a1.
A's human repair request R1 references O1's QA result. The manager admits A as O3
with R1. A produces implementation I3, approval V3 and QA Q3 at a2, consuming R1.
After A reaches Human Review, the manager publishes queue request U1 on B, naming
R1, Q3/a2 and B's old QA result. B's pointer still names O2 while it is queued.
Admission O4 names U1 and switches B's pointer before starting B. B's I4 records
parent Q3/a2 and U1; its V4/Q4 complete the chain. U1's root R1 is thereby consumed
for B. A repeated scan cannot queue B again. A newer root request is separate work.

Required local contract cases: valid chain; missing field; unknown/duplicate key;
unknown schema; wrong assignment; changed requirement digest; edited reference;
spoofed role; conflicting same-slot record; stale source revision; unrelated parent;
partial AI ledger; human result claimed by AI; explicit all-human handoff; repeated
root already consumed; unknown publication result; queued B preserving O2; resuming a dependency wait
before the first PR; and explicit human-authorized blocked QA resumption versus
unauthorized/conflicting result replacement.
The live packet tests provider transport/metadata and all three transitions. Neither
JSON Schema validation nor the probe substitutes for installed-package acceptance.

## Compatibility and review boundary

Implement schema validation, authoring inputs, role-specific Jira skills, Story/Bug
filters and environment bundle as coordinated delivery slices. Existing unstructured
records are not guessed into this contract. Start rollout with writes/automations
off, prepare explicit assignments for any supported migration, and verify Build
and a bounded delivery case before activation. Existing one-reviewer customer
planning and Grok effort settings do not change.

Author assessment: intuitive—one visible result per role; discoverable—complete
skeletons and field-level errors; delightful—no manual copying of assignment data;
token saver—direct assignment/reference lookup; secure—trusted configuration and
server metadata, with shared-identity limits explicit; agents are equal—structured
results plus readable summaries; dependable—published is not transitioned or
completed; unified configuration—one generated pointer, no competing setup values.

Sources: [Jira comments](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/),
[issue properties](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-properties/),
[property limitations](https://developer.atlassian.com/cloud/jira/platform/jira-entity-properties/),
[JSON canonicalization](https://www.rfc-editor.org/rfc/rfc8785).

### Repeated-parent incorporation in the existing chain validator

A current implementation, review or QA may consume distinct stack updates U1/A2
and U2/A3 while incorporating A3 once. A3 must equal or explicitly succeed each
requested parent completion through `admission.payload.previous_assignment`.
Every contributing admission/completion retains this ticket's PR identity and
configured site/project/full stream/repository. Exact old PR observations,
requirements, actors, QA ledger, execution evidence and permitted resume lineage
remain mandatory. A date or current pointer alone supplies no ancestry.

Each stack update's roots equal the completed repair causes between the parent's
completion actually incorporated by the child's prior implementation and that
update's requested parent completion. For B1 at A1, A2 consuming R1 and A3 consuming
R2, U1 requires R1 and U2 requires R1+R2. A B already at A2 requires only R2 for the
next update. An arbitrary resolution pair cannot erase an unincorporated cause.
Direct request lists remain exact and duplicate-free; convergent root paths may
share one leaf without being a cycle.

Only nested authenticated history receives this allowance. Every record relied on
by it needs a matching exact retained server metadata tuple. The selected worker's
actual incorporated successor is validated as current accepted completion; selecting
old A2/U1 directly remains strict. A selected admission/queue publication receives
no permission from a possible future implementation found in complete discovery.
Only strict current accepted QA establishes completion. No schema, public option or role authority changes. The private manager history
route below grants no current completion.

Per-call completed structural root closures are private immutable data, separate
from active traversal and purpose/anchor-bound authority proofs. A completed closure
stores repair leaf identities only. It cannot prove current authority, retention,
coverage or obligation discharge. It survives failed semantic speculation, while
failed authority/null-PR proofs roll back. Successful closure expansion unions at
most O(E×L) leaf entries and stores O(V×L), for supplied distinct nodes V, edges E
and leaves L. This bound covers successful structural closures; the whole validator
and retries of unfinished failing prefixes have additional bounded semantic work.
Active frames unwind on failure; partial closures and exceptions are never cached.

## Internal current observations for offline preview

The canonical receipt evaluator owns parsing and strict validation. Its internal
`inspectManagerCompletion(raw)` returns exactly `{validation,bindings}` from the
same validated parse. `validation` is the unchanged public strict-current chain
result; invalid input returns empty bindings. Public `validateReceiptChain(raw)`
keeps its existing full result, check order and retained-empty compatibility.
There is no caller-authored trusted summary or public historical mode.

Bindings contain only kind, identity key and canonical digest. The seven identity
families are exact server comment (site/ticket/comment with reference, metadata
and body), record UUID (site/UUID with ticket/digest), requirements
(site/ticket/requirements digest with canonical work/context), current native and
manager assignment facts (site/ticket), PR revision
(provider/repository/number/source revision), current PR identity
(provider/repository/number), and evidence URI. Each validated requirements entry
is preserved before lookup-map replacement. Raw comment bytes remain immutable
observations; JSON envelope whitespace and key order do not change them.

The existing snapshot normalizer immediately consumes this private result after
its configured/native binding. It groups every successful bound observation
before accepting any proof. A group with more than one digest invalidates every
contributing envelope, including X/Y/X and X/Y/Y in any order. Existing membership
establishes affected scopes; a trustworthy conflict with no known scope holds
shared evaluation. Safe `REPAIR_PROOF_INVALID` diagnostics name only the supplied
completion index. Independent coherent scopes continue. Invalid or unbound input
never supplies trusted observations; the exact current-QA and repair-accounting
gates still own completion authority. Existing receipt and snapshot limits bound
the call-local index. No provider action or execution authority is added.

## Private own-repair history

`inspectManagerHistory(raw)` uses the same private canonical evaluator with an
explicit historical purpose and requires the manager consumer. Exact retained
metadata and authenticated target closure remain mandatory. It returns only
`valid`, `validation_scope`, `live_freshness`, `completion_established:false`,
`execution_authorized:false`, `target`, `records`, `coverage_segments`, `bindings`
and `diagnostics`. Invalid results export empty rows, segments and bindings.
Each segment is `{parent_completion,cutoff_completion,roots}` authenticated within
one envelope from an actual child incorporation and completed same-parent
descendant lineage. Roots describe consumption between those exact completions;
cumulative root subtraction and joining unrelated envelopes supply no proof.

Each accepted row retains its exact reference, ticket, assignment, assigned
requirements digest, own PR, actual requested refs and authenticated assignment
lineage. Review and QA inherit their validated implementation's direct consumed
requests, roots and actual stack parent. Their own identity and PR stay their own.
The row's completed flag means authentic historical QA, never current authority.

Own selection uses only completed same-ticket direct consumption on the lineage
ending at the native current assignment. Retained request inventory stays intact;
only exact consumed direct refs are excluded from the next own repair. Another
ticket, future assignment, implementation/review-only witness or shared root does
not discharge a request. Actual stack parents and strict current covering parent
QA determine stack repair. The next own admission excludes only proven completed
direct requests; descendants still retain every root after their actual cutoff.

Before using either a current baseline or historical consumption, own selection
requires one coherent logical QA completion for each represented exact assignment
in that current same-ticket lineage. Logical identity is ticket ID, record UUID
and digest; identical publications with different comment IDs are one result.
Distinct assignments remain separate. Competing completions preserve the existing
`REPAIR_PROOF_INVALID` wait independently of envelope order. Per-envelope private history
validity grants neither aggregated coherence nor current completion. Humans
reconcile the supplied history through its owner and supply one coherent
observation, preserving retained causes; agents receive the existing structured
wait and unchanged authority fields.

Current and history routes use one same-evaluation seven-family fingerprint
collector. It preserves stringified tuple keys, one canonical UUID observation,
all requirement-context observations, and exact current values containing
`issue` and `manager_assignment`. Snapshot completes every conflict group before
accepting either history rows or strict current proofs. A current-valid envelope
with empty retention still contributes current fingerprints if history fails; a
valid history route cannot enter the current prerequisite-proof map. No public
result, CLI flag or caller-controlled purpose changes this boundary.

Missing stack publications are represented only as existing-schema payload inputs
in the nonexecuting proposal. They contain no invented reference, UUID, operation,
actor or timestamp. Queueing preserves the old assignment; only the authorized
writer may publish and execute the later handoff. A private history projection
never satisfies a current prerequisite or covering-parent requirement.

The complete offline source API/JSON preview and its private history consumer are
delivered by PGB-149/R1-35. Readable output does not yet identify every retained
cause; use `--json` for the complete result until PGB-146 finishes readable parity. Existing installed runtime compatibility remains supported with
its required policy closure. The full installed repair fixture kit and semantic
repair smoke remain PGB-81; neither preview grants live publication authority.


## Implemented recorded manager purposes — PGB-160

The approved role amendment's `inspectRecordedHistory` and
`inspectRecordedCompletion` are implemented in the existing receipts module and
`validate-handoff.mjs`. Strict record/chain v1 and the old manager inspectors keep
their existing inputs, results and guarantees. Worker-current/assignment purposes,
v2 preview and later caller migrations remain separate work; consumers do not
fall back to recorded validation after a strict failure.

The closed `pigboard-manager-handoff-input/v1` envelope contains only
`schema`, `consumer: manager`, exact `target`, `trusted`, `issues`, current-only
`requirements`, `comment_pages`, `retained` and `request_resolutions`.
Trusted projects contain only `id`, `stages`, `accepted_later_stage_ids`, `actors`
and `repositories`; trusted root also contains `site` and `manager_assignments`.
Reference, page and retained shapes remain those of the strict receipt contract.
Only recorded manager issue rows may carry an explicit null `pointer` for a
read-only Ready to Work declaration. Strict and worker inputs still require a
pointer. Requirements rows contain only `ticket_id`, `digest`, `format: yaml|adf`
and original `body`. The exported `managerHandoffInputSchema` composes those
existing definitions without altering the strict schema. Whole input is JSON
only, at most 8 MiB, depth40/list1000; individual handoff bounds remain unchanged.

History may receive an empty current requirements array. Supplied bodies still use safe original-raw
structure validation, exact current canonical digest/native identity and unique
current ticket/key mapping. Completion additionally reuses PGB-159's complete
pure scheduling semantics against current work, a graph derived from every
reachable supplied current declaration, configured project repositories and the
installed supported skill set. Related-change rows project declarations; they do
not establish external change completeness or current action authority. Missing
reachable bodies/keys hold rather than becoming fabricated empty graph leaves.
No canonical full config or execution context is invented for that call.

An envelope with a read-only declaration must supply the configured site and
project, the native Ready to Work stage and a single original current ticket
requirements row bound by key, issue ID, format and canonical digest. Request
and PR inventories must be empty, PR history complete, and original comment pages
complete and contiguous. Ordinary comments are allowed. The declaration cannot
carry a manager assignment, typed publication or retained publication. It cannot
be a target, resolve a record reference or participate in a request resolution.
These restrictions apply before publication registration. Across envelopes,
overlap checks compare fingerprints of shared native facts and comment identities.
Page completeness is checked within each envelope.

When the envelope includes a read-only declaration, both recorded purposes start
at the exact validated target and follow only its successfully validated explicit
record references to identify assigned tickets.
The scheduling validator uses those tickets' current native declarations and
digests and checks every prerequisite branch, including missing siblings and cycles.
Each supplied read-only declaration must appear on that graph. Additional history,
resolutions and same-ticket records cannot independently make a declaration
reachable. The ordinary snapshot normalizer separately binds each declaration to
v2's native issue, work body, request and retained membership facts before it
uses authenticated results in scheduling. A declaration establishes no handoff
or completion and grants no execution authority.

The shared engine preserves contiguous complete pages, immutable raw/server
metadata, UUID/slot/resume coherence, exact assignment/predecessor/operation,
publication inventory, own/parent PR identities, all roots, exact segment cutoffs
and incorporated revisions, genuine pre-first-PR proof and request resolutions.
Historical authentication applies to older assignment **or** digest, even an old
assignment with the same digest. Historical records require the original retained
closure. Current completion checks current pointer, stored assignment, raw digest,
accepted native QA stage, complete declaration/ledger/preparation assertions and
outstanding obligations. It cannot infer unseen PR/evidence freshness.

Current QA compares every expanded step ID/skill/order, pending human case,
human-only reason, PASS/evidence counts and declared preparation slots/hashes.
Historical QA checks intrinsic ledger consistency while treating unavailable old
coverage/operation definitions as publisher assertions. Embedded evidence/reuse
claims are not external observations. No evidence receipt, pipeline actor,
retrieval, approval state, CI success or current external PR is fabricated.

Both new results use `pigboard-recorded-handoff-validation/v1`, explicit
`mode`/`purpose`, `validation_scope: authenticated_recorded_handoffs`,
`basis: authenticated_jira_handoff`, `external_freshness: not_evaluated` and
`execution_authorized: false`. History returns a direct validity/target/records/
coverage-segments/bindings object and never establishes recorded completion.
Completion returns exactly `{validation, bindings}` with the exact current QA
leaf/ledger and `recorded_completion_established`. Invalid results export no
bindings and invalid completion has a null leaf. Bindings are sorted exact
recorded/native facts only; raw current requirements include format/body/work,
with no context, PR or evidence observation bindings. Common facts have common
identity/digests across the two purposes. Supplied facts are not cryptographic
proof of live provider origin, and role accounts may overlap.

The CLI adds `recorded-history` and `recorded-completion`, with regular absolute
input files and no `--format`. JSON matches the API's direct/wrapped result;
readable output names purpose, exact target, validity/recorded completion,
unchecked freshness and binding count. Exit0 succeeds only for the selected
purpose,1 rejects proof and2 is usage/read/setup/internal failure; usage precedes
file reads. The [operator guide](../handoffs.md#recorded-manager-input-and-results)
contains a complete fixture preparation/source/copied example. The handoff-chain
fixture and this architecture guide are source-only; copied execution receives
external absolute prepared JSON files. No bundle extension is required.

Developer verification uses exactly30 named rows/31 ordered states/46 purpose
invocations plus the explicitly named B04 command/sanitization controls and strict
external companions. N15–N17 are coherent authenticated current ledger,
preparation and dispatch failures with independent expected boundary paths, not
unrelated digest failures. Original strict fixtures, complete public results,
paired history oracles and fixed module-entry budgets remain preserved.
Designated human H01/H02 remain NOT_RUN; local checks do not establish hosted CI,
merge, compatible caller adoption or activation.
