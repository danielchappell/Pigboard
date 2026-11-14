# Work and handoff contracts for the first manager

14 November 2026. Concrete discovery draft for PGB-67. The Epic and ticket
examples are complete editable skeletons, not ready tickets or installed schemas. Contract review and the bounded
Jira round-trip proof are required before implementation Stories become ready.

## Three documents, three owners

| Contract | Owner | Purpose |
| --- | --- | --- |
| `pigboard-epic/v1` | Human planning, assisted by writing skill | Goal, accepted scope, full numbered streams and ordered ticket keys |
| `pigboard-ticket/v1` | Human grooming, assisted by writing skill | One PR's scope, prerequisites, repository, AI and human cases |
| `pigboard-handoff/v1` | Responsible worker or authorized human-request automation; manager for its queue reason | Observed revisions, role results, repair requests and evidence |

Names above are proposed for this release. The installed prose contract is not
silently accepted as these schemas. The version is independent of state-record and
deployment-configuration versions. The [examples](examples/) contain the Epic and
ticket skeletons. The [schema draft](manager-work-schema.md) specifies exact start
structure, populated examples and the separate semantic validation gates. The [handoff contract](manager-handoff-contract.md) now defines the exact encoding,
assignment binding and publication order, with separate role skeletons and design
schemas. It still requires independent review and provider round-trip proof;
workers and validators must not treat design publication as installed behavior.

Native Jira owns issue identity, type, status, parent, assignee and labels. The
Epic's list orders its members; it does not duplicate those native fields. The
ticket's intended base branch remains distinct from the actual PR target selected
by the implementer. Actual stack lineage belongs in the handoff, not a guessed
branch name written during grooming.

Configuration owns the exact Epic opt-in label (proposed default `Pigboard`), allowed
projects, worker prefixes, native status/type IDs, supported versions, trusted
handoff actor IDs and input limits. All full numbered labels remain independent
stream identifiers. No ticket or handoff can grant access to a repository, host,
secret, arbitrary transition or skill outside the configured scope.

## Extraction and validation

Use Jira's structured code-block nodes and a standard safe YAML parser. Exactly
one Epic/ticket schema block is allowed in the description. Handoffs use their own
explicit discriminator. Ordinary narrative and other code examples are context,
not scheduling instructions. No regex/LLM extraction or execution of YAML values.

Reject duplicate mapping keys, aliases, custom tags, multiple YAML documents,
unsupported schema versions, unknown fields and excessive depth/size. Error output
names the ticket and field path without dumping its content or secrets. Draft
validation reports missing values; start validation rejects unresolved required
values. Optional fields stay visible as null; explicitly empty lists mean none.
Final numeric parser/request limits must fit the tested installation budget.

Cross-reference checks are part of the contract, not AI interpretation:

- Each ticket appears once in an Epic stream list and matches its native parent
  and full label. All list keys resolve to accessible stable IDs within scope.
- A stream belongs to one active opted-in Epic. A second active owner is invalid;
  existing work from other Epics still counts toward occupancy and Human Review.
- All prerequisite keys resolve, are not self-references and form no cycle.
- Requirement, case, step, actor, fixture and preparation IDs are unique in their
  namespace; references resolve. Each case covers stated AC/TAC requirements.
- AI dispatch includes every top-level AI step exactly once, in valid dependency
  order. A child `qa-bruno` step belongs to its `qa-api` parent and is not dispatched
  a second time. Human case IDs can never occur in AI dispatch or output bindings.
- Named skills are the installed approved set. Required test expectations, action
  scope and evidence must exist before start; implementation may fill only declared
  mechanical preparation slots without changing expectations or scope.

## What must be ready before starting

An ordinary candidate must be a Story or Bug in Ready to Work, have a current
active opted-in parent Epic, and meet the complete ticket contract. Rework Queued
also needs an understood repair request and all required parent repair evidence.

Required: problem; nonempty acceptance criteria; one repository and bounded change
scope; intended base branch; explicit prerequisites (possibly empty); complete
testing strategy; exact skills/ordered steps for AI cases; complete instructions
and owner role for human cases; no unresolved open questions. Context may name
other repositories, but needed changes there belong in separate tickets.

Optional references and inapplicable skill-specific sections may be null. A
preparation slot may defer a URL, request selector or fixture artifact only when
the operation, permitted identity/scope, expected outcome and responsible preparer
are already specified. It cannot defer acceptance criteria, test design, missing
credentials/authority, an unavailable skill or a scope decision.

Known preparation-stage tickets are not candidates and may contain blank skeletons.
They do not hold up independent ready work. A malformed ready candidate is excluded
with an actionable reason, not launched to repair its ticket. A known outstanding
repair cannot be bypassed by unrelated new work merely because its inputs are bad.
Unknown native state or incomplete domain evidence holds the affected scope.

## Prerequisites, ordering and capacity

Proposed release-one prerequisite shape is an ordered list of ticket keys requiring
completion of automated review and assigned AI QA. A qualifying prerequisite is in
Human Review or a later accepted stage, has matching current completion evidence,
and has no unresolved repair affecting the dependent. Human testing and merge are
not implicit prerequisites. Explicit external/production dependencies require a
human readiness decision; do not invent unsupported condition expressions.

Within eligible work, finish prerequisites needed by the queued repair chain, then
queued repairs/stack updates, then Bugs, then Stories. Epic order breaks ties within
a class. A not-ready unrelated Bug does not block a ready Story. A missing actual
prerequisite does. Actual branch stacking is separately recorded by the implementer.

One numbered stream has at most one active implementation/review/QA cycle. A genuine
Blocked ticket or unresolved manager mutation holds it. Five Human Review tickets
is the cap, including Bugs and pending human cases. Admission requires the current
Human Review count plus the returning selected ticket to be at most five. Queueing
an existing Human Review child removes that child from the count but launches
nothing. Do not discard queued repair priority to use that newly free slot for C.

## Worker handoffs

The [worker handoff contract](manager-handoff-contract.md) owns the exact schema,
role outcomes, semantic validation, assignment pointer, reference/digest rules and
publication/failure sequence. Use its role skeletons; do not maintain a competing
copy here. The handoff comments hold observed results, while one generated issue
property points to the assigned admission. The pointer is not configuration,
authentication or a worker lease.

The manager's conditional intent precedes publication. Confirmed comment/pointer
publication precedes the single source-specific transition. Unknown outcomes retain
a human hold; there is no automatic replay or exclusive-worker proof. A queue
request preserves B's completed assignment until its later admission. Provider
round-trip and installed-package acceptance remain separate unfinished gates.

## Editing, removal and rollout

- Reordering ready independent tickets changes their future tie-break order; it
  does not interrupt an active cycle or rewrite actual branch lineage.
- Do not drop known active, queued, blocked or Human Review work from capacity
  merely because a label, Epic list or parent changed. Retained stable IDs expose
  the mismatch; hold the stream until a human reconciles it.
- Removing an unstarted item is allowed only when no required dependency points to
  it. Removing a prerequisite is not evidence that its outcome was achieved.
- A cancellation/declined outcome is not successful completion. The final native
  status mapping must distinguish accepted completion from cancellation; unknown
  statuses are not inferred from Jira's broad status category.
- Epic pause prevents new manager admission and proposed queue-only mutations.
  Existing workers may finish their permitted handoffs. Resume re-evaluates facts.
- Cut over with manager writes and delivery automations disabled. Publish authoring
  examples, role handoff skills, Story/Bug filters and environment bundle together;
  validate prepared tickets and handoff round trips before enabling any part.
- Keep existing native statuses where available. Missing required directed edges or
  Rework Queued mapping are explicit setup prerequisites, not new guesses by workers.

No automatic human-unblock feature, Jira workflow provisioner, new database QA skill
or old-runtime compatibility layer is added. Those remain separately scoped work.

## Author assessment

- Intuitive: familiar Jira ownership and complete editable skeletons; branch facts
  are recorded by the worker that knows them.
- Discoverable: field-level errors and explicit AI/human case ownership show what
  must be prepared; draft and start validation have different purposes.
- Delightful: unready independent work does not stop the stream; no hidden manual
  configuration copy or agent-led ticket grooming is required.
- Token saver: normal parsing, validation and ordered cases replace inference and
  unbounded history exploration; safe limits still need measured proof.
- Secure: configured scope and server actor metadata constrain typed records;
  shared worker identity and publication races are not concealed.
- Agents are equal: exact execution/handoff inputs coexist with readable human cases
  and visible evidence; neither interface can fabricate the other's completion.
- Dependable: record references and revision coherence prevent stale passing claims;
  defined binding/publication behavior still requires provider proof before readiness.
- Unified configuration: infrastructure authority has one owner; ticket work data
  and generated evidence are distinct from setup configuration.
