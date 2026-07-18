# Architecture

Ski Stack separates reusable agent capability from queue-driven automation.

## Principles

1. **Flat by default.** A user or worker may invoke any skill directly. No skill
   assumes a permanent chief-of-staff, manager, or swarm unless explicitly asked.
2. **The work item is the handoff object.** State lives in the internet-hosted
   project-management record, not a chat transcript or local-only folder.
3. **Adapters isolate vendors.** GitHub Projects, Jira, Linear, and future tools
   implement the same queue contract.
4. **Workers do one stage.** A worker claims one item, performs one role, writes
   evidence, and transitions or blocks the item.
5. **Leases prevent duplicate work.** Webhooks wake the system; atomic claims
   decide who actually owns the work.
6. **The core engine owns dispatch policy.** Adapters normalize platform state;
   the core decides which work is available and how candidates are ordered.

## Layers

```text
skills/ and agents/
  reusable instruction assets

src/core/
  shared statuses, normalized queue snapshots, availability engine,
  worker types, adapter contract docs

src/runtime/
  claim coordinator, dispatcher, worker prompt assembly, worker slots,
  code-loop execution, worktree handling, lease guarding, local run logs

src/adapters/<tool>/
  vendor-specific queue implementation

src/provisioners/<tool>/
  setup for fields, labels, templates, webhooks, and repo guidance
```

## Adapter Contract

Every queue backend must support:

- `loadQueueSnapshot()`
- `claimCandidate({ itemId, workerType, workerId, leaseSeconds, expectedAvailabilityFingerprint, context })`
- `verifyClaim(claimId, options)`
- `extendClaim(claimId, leaseSeconds)`
- `appendEvent(itemId, event)`
- `appendEventForClaim(claimId, event, options)`
- `loadStageHandoffsForClaim(claimId, options)`
- `appendStageHandoffForClaim(claimId, handoff, options)`
- `transition(itemId, status)`
- `transitionForClaim(claimId, status, options)`
- `setFieldForClaim(claimId, fieldName, value, options)`
- `clearWorkerTypeForClaim(claimId, options)`
- `releaseClaim(claimId, options)`
- `failClaim(claimId, reason, options)`

`listReady(workerType)` and `claimReadyForWorker(...)` remain compatibility
wrappers and must delegate selection to the shared availability engine. The
legacy `claim`, `heartbeat`, `release`, and `fail` names remain as shims where
useful. The runtime never reaches around this boundary into GitHub, Jira, or
Linear.

## Queue Availability

A normalized `WorkItem` carries platform `sourceOrder` and dependency records
with `kind`, `targetId`, `title`, `url`, and `state`. Dependency state is one of
`active`, `completed`, `canceled`, or `unknown`.

The pure core engine evaluates a complete `QueueSnapshot`. An item is available
only when its Status/Worker Type and repository match the worker, it has no
active foreign lease, every dependency is `completed`, and it is not in a
dependency cycle. Pending, canceled, unknown, missing, and cyclic dependencies
fail closed without changing the item's visible Status.

Available work is ordered by `P0` through `P3`, then platform `sourceOrder`, then
stable item id. Claims carry an availability fingerprint over routing,
dependency state, and `availableAfter`. Priority and source order are
intentionally excluded so reordering does not invalidate active work.

`claimNextAvailable()` coordinates selection and claim-time revalidation for
both dispatch paths. Adapters reload platform state before writing a claim, and
workers re-evaluate availability before final side effects. Stale claims are
released; dependency changes never auto-transition a card to `Blocked`.

Automated planning and implementation require a real source Issue. Draft items
fail closed as `unsupported_content_type`; PR-backed Review/Babysit items remain
supported for migration compatibility.

## Delivery Lifecycle

```text
Implementation Planning -> Implementation -> Review -> Babysit -> Ready for Owner
```

`Ready for Owner` is non-claimable. `QA` remains a legacy/manual status outside
the automated chain. Successful issue completion or merged implementation PRs
reconcile to `Done` from any nonterminal stage; not-planned issue closure
reconciles to `Canceled`.

Stage outputs use a versioned `StageHandoff`. GitHub persists handoffs as visible
issue comments containing canonical JSON signed with HMAC-SHA256. The signature
binds repository, issue, Project item, stage, input fingerprint, operation ID,
payload hash, and creation time. The daemon accepts only exact, unedited comments
from its configured GitHub identity and requires an independent 32-byte
`SKI_HANDOFF_SECRET`. The memory adapter mirrors behavior for tests only.

The deterministic operation ID is the durable completion record. Reconciliation
can resume missing Project, PR, branch, or lease mutations without treating
ordinary issue text as machine-authoritative state or rerunning completed model
work.

## GitHub Projects Strategy

GitHub Projects is the first adapter because it gives a web UI, Issues, PRs,
comments, fields, hierarchy, and API access in one place.

Issue dependencies use GitHub's native `Issue.blockedBy` relationship, including
cross-repository blockers. Open blockers normalize to `active`, completed
closures to `completed`, not-planned closures to `canceled`, and unreadable
states to `unknown`. Draft issues and PR-backed Project items have no dependency
edges in the first implementation. No dependency Project field is provisioned.

GitHub Projects webhooks exist for organization-level Projects v2 items, but
GitHub currently marks Projects webhooks as public preview. Treat them as a wake
signal, not the source of truth. Project events wake the queue, and issue events
wake every worker partition because a blocker can unlock work in another repo.
Periodic reconciliation remains the backup. On every event, reload state via
GraphQL before deciding whether to run a worker.

GitHub Projects field writes are not transactional. The adapter implements a
best-effort lease by reading item state, writing lease fields, and storing a
structured claim envelope in `Last Worker Run`. Workers re-verify that envelope
and its availability fingerprint before final GitHub side effects, and extend
the lease while a run is active. That is
enough for the MVP and low-collision worker pools. For strict multi-worker
concurrency, put a transactional queue adapter, such as Postgres, behind the
same contract and mirror status back into GitHub Projects for humans.

## Worker Roles

The initial worker pool:

- `planner`
- `architect`
- `groomer`
- `implementation-planner`
- `implementer`
- `qa`
- `reviewer`
- `pr-babysitter`
- `researcher`

These are role cards. A runtime can map them to Codex, Claude, another agent
runner, or a human.

The local daemon auto-runs `implementation-planner`, `implementer`, `reviewer`,
and `pr-babysitter`. Planning and review are read-only. Implementation owns the
deterministic branch and every pre-PR correction; Review owns non-draft PR
creation; Babysit owns one bounded feedback cycle but never merges. Architect,
Groomer, QA, and the remaining roles are manual in this slice.
