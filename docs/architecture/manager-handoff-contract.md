# Worker handoff contract

Design for PGB-67, 14 November 2026. This specifies the first manager release;
installed skills still use the earlier prose contract. Independent review and the
[isolated test packet](manager-test-packet.md) gate adoption. No worker is activated
by this document.

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

- [Handoff schema](contracts/pigboard-handoff-v1.schema.json): JSON Schema 2020-12.
- [Pointer schema](contracts/pigboard-work-pointer-v1.schema.json).
- [Role skeletons](examples/handoffs/): one document per comment, with nulls visible.

Each comment contains a short human summary and exactly one ADF `codeBlock` whose
text is a single YAML mapping with `schema: pigboard-handoff/v1`. Walk the ADF node,
parse safe YAML 1.2 using JSON-compatible scalars, and validate the schema; do not parse rendered fences or prose.
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
   allowed server actor. Fetch referenced comments by ID. Reject deleted, edited,
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
   NOT_RUN has its reason and, when defect-dependent, the finding ID. `qa` requires
   all assigned steps PASS. Other records retain partial results and skipped steps.
   Reused evidence needs an explicit case-specific basis in its linked report.
9. `human_pending` equals the ticket's human case IDs. Agents never report human
   PASS. An explicitly all-human ticket is allowed only with no AI steps, complete
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
