# Repair a stack one ticket at a time

Owner-approved rule, 14 November 2026. This is the release-one design; it is not
implemented. Technical record formats and live transition proof remain discovery.

## The rule

Repair A on A's existing PR. Then incorporate and revalidate that repair on B's
existing PR if B actually builds on A. Continue recorded descendants oldest first.
Each implementer owns one ticket, one repository and one PR. Do not use a single
Bug to edit every branch or ask an AI to classify whether the parent change is safe.

The trigger is a confirmed repair and an actual recorded stack dependency. Epic
order, routine merge or retargeting, a discussion, or an unrelated PR edit is not a
trigger. Revalidation means prior evidence covers an older stack; it is not an
assertion that B contains a new defect.

## A and B

1. B's implementer records B's PR, parent A's ticket/PR, A's incorporated revision
   and B's source revision. Review/QA evidence names the exact revisions it covers.
   If B is independent, it records no stack parent; being next in the Epic is not
   a parent relationship.
2. A gets a confirmed in-scope repair request with an identity and findings. Its
   responsible worker, or the automation handling a human's request, moves A to
   Rework Queued. If B is already active, B completes its current automated cycle
   or queues a known dependency wait. Do not interrupt B or start new C ahead of A.
3. Once the stream is free, the manager admits A to In Progress. A's implementer
   repairs its existing PR. After review and assigned AI QA succeed, A returns to
   Human Review with a repair-completion record covering its new source revision.
   Any prescribed human tests remain pending.
4. The manager compares that completed repair with B's recorded parent evidence.
   If B has not incorporated the repair and is in Human Review, the manager moves
   B to Rework Queued with A's repair identity, target revision and reason. It
   never uses that queueing action to start a second active cycle.
5. Normal admission starts B when the stream is free and A's required repair is
   complete. B incorporates A's repaired code, makes only B's in-scope adjustments,
   and runs fresh review and prescribed AI QA on B's existing PR.
6. B's new handoff records the repaired parent revision and the repair it consumed.
   That evidence prevents the same repair from queuing B again. If C actually
   builds on B, B's completed stack update propagates the same repair lineage to C.

## Role authority

| Actor | Permitted action for this rule |
| --- | --- |
| Implementer | Record actual PR lineage and incorporation; modify only its assigned PR; In Review, known dependency wait to Rework Queued, or Blocked |
| Reviewer | Record findings and exact reviewed revision; QA, Rework Queued or Blocked |
| QA entry point | Record exact tested revision and AI/human coverage separately; Human Review, Rework Queued or Blocked |
| Manager | Ready to Work/Rework Queued to In Progress; **Human Review to Rework Queued for a recorded required stack update** |
| Human-request automation | Queue the requested repair on the human's behalf; human approval/unblock remains a separate authority |

The manager does not approve a PR, merge, retarget, fix branches, mark tests passed
or clear a human blocker. Its new queue transition is a narrowly scoped exception
to the previous admission-only transition surface. Provider permissions may be
broader than these role instructions; separate worker identities remain deferred.

## Deterministic inputs and repeated repairs

Proposed record contract for PGB-67, to validate before implementation:

- Stable Jira IDs identify tickets; keys are display values. A PR reference names
  provider/repository/PR identity. A stack edge stays within one repository and
  numbered workstream; requirements in another repository are context, not a stack.
- An implementation handoff records `source_revision`, nullable `stack_parent`
  (ticket, PR, incorporated revision), and the repair IDs incorporated by this run.
- A repair request records its own stable ID, affected ticket/PR, bounded findings
  reference and the revision requiring repair. A stack-update request additionally
  names its parent completion and the repaired parent revision required.
- A completed repair requires matching implementation, review and AI-QA handoffs
  for the same ticket/PR/source revision and applicable requirement version, plus
  Jira Human Review or a later accepted stage. An In Review handoff alone cannot
  release descendants. Human cases remain separately pending.
- A propagated update retains the root repair ID and immediate parent completion.
  This distinguishes A's original repair from B's required update and allows C to
  wait for B's new verified revision without inventing a separate Bug.
- Repeated identical observations have the same work identity: ticket, root repair,
  immediate parent and parent completion. Re-reading them cannot create another
  queue request or reopen a completed update. This is scheduling-state consistency,
  not prevention of duplicate Cursor worker launches.
- If A receives a newer repair before B starts, B waits for that repair and consumes
  the latest verified parent revision covering all applicable repair requests. Do
  not discard older unresolved findings merely because there is a newer request.
- If B is already active when an upstream repair is requested, retain the request
  and let B finish. Re-evaluate after its cycle; never overwrite an active worker's
  handoff or queue it out from under that worker.

Transport, writer identity checks, record selection and publication atomicity still
need to be frozen. Ordinary conversational comments must not become executable
instructions. Stable repair IDs alone do not authenticate a record or prove that
its referenced review actually occurred. The manager must reject conflicting or
incomplete evidence rather than infer completion from prose or timestamps.

## Scheduling and capacity

Queueing is not admission. Moving B from Human Review to Rework Queued creates
understood waiting work and reduces the human queue by one; it launches nothing.
The repair/update chain has priority over unrelated new Stories or Bugs.

At admission, count all Human Review tickets for the full numbered stream across
the configured domain, including Bugs and tickets with human cases still pending.
The selected ticket must be able to return without exceeding five: current Human
Review count plus one must be at most five. This applies to queued repairs too;
do not invent a sixth-slot exception. An already-queued B must not be counted twice.
Existing active work is never interrupted to repair a capacity violation; report
the inconsistent state and stop further admission for human correction.

Epic pause stops admission, including rework. Proposed release-one application:
apply the same active-Epic check to queue-only transitions, and re-evaluate pending
stack updates on resume. An existing worker may still complete its permitted
handoff. No manager action starts work while the Epic is paused.

## Boundary cases to verify

| Case | Required result |
| --- | --- |
| A repair incomplete or failed | B waits; no new unrelated work bypasses the pending repair chain |
| B independent, despite following A in Epic order | Do not queue B |
| B already verified with the required parent repair | Do not queue B again |
| B already Rework Queued | Preserve its own findings; include required parent update without another status transition |
| B active | Do not interrupt; retain the required update and reconsider after its cycle |
| B Blocked | Preserve the human blocker; do not turn it into automatically executable rework |
| B in Human Review with stale parent evidence | Manager queues the required update; current evidence is not claimed to cover the new stack |
| A repaired twice before B starts | B consumes the latest completed parent repair covering both requests |
| A then B then C form an actual stack | Complete A, then update/reverify B, then C, before new work |
| Unclear/missing lineage, conflicting revisions or new scope | Stop for a human; do not guess or broaden the PR |
| PR already merged or closed | Stop for a human to scope a Bug/decision; do not reopen or modify it automatically |
| Routine merge/retarget with no confirmed repair | No repair cascade solely because of that event |

Proposed release-one boundary: the manager queues from current Jira stage and
recorded lineage. Queueing is a scheduling action, not proof the PR remains open.
The implementer must verify the actual PR is still open, has the expected identity
and allows the scoped update before changing a branch. If a human merged/closed it
since the handoff, the worker stops and records Blocked for human handling. A
current receipt declaring it closed already prevents admission. This preserves the
Jira-only manager integration; no new PR-provider adapter or monitoring is added.
The tradeoff is a bounded preflight run when provider state changed before Jira did.
This boundary is subject to the combined design review, not a claim of live proof.

## Author assessment

- Intuitive: each ticket retains its own PR and follows the familiar review cycle.
- Discoverable: the queue reason names the parent repair and required revision.
- Delightful: active paid work finishes; humans need not manually chase an understood
  open stack, subject to the remaining evidence contract.
- Token saver: compare recorded lineage; no AI impact-analysis job or multi-PR agent.
- Secure: broader context grants no broader repository/PR authority; ambiguous proof
  waits for a human and cannot authorize arbitrary transitions.
- Agents are equal: explicit repair inputs replace reliance on another agent's chat;
  humans retain visible findings, evidence and prescribed testing ownership.
- Dependable: repeated repair identity, exact revision evidence, capacity and active
  work rules are explicit; missing transport/live proof still blocks readiness.
- Unified configuration: routing/permissions remain configured centrally; lineage
  and repair evidence are per-ticket work data, not another setup surface.
