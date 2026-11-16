# Inputs, observations and final evidence

This is PGB-78's instruction handoff, not a new persisted schema. Use the
[structured ticket contract](../../write-pr-sized-stories/references/pigboard-ticket.md)
for full raw work; [basic historical examples](../../write-pr-sized-stories/references/basic-workflow-ticket.md)
do not convert or authorize delivery. Read the selected helper's
[structured-step contract](../../qa-api/references/structured-steps.md) and the sole
[publisher contract](../../qa-jira/SKILL.md).

## Trusted inputs

| Input | Required binding |
| --- | --- |
| `scope` | Exact configured site, immutable project ID/full stream, native issue/type/stage, allowed repository/PR and role actors. No ticket-granted expansion. |
| `capabilities` | Immutable same-release skills/validator root and hashes, prepared tool/access/action/tenant boundaries, actual Grok High identifier/effort, actual clock/wait when needed, private evidence destination/audience and publisher transports. |
| `work` | Complete original raw YAML/ADF plus separately trusted start context, format and exact digest. Keep original numeric/parser provenance. |
| `assignment` | Lookup hint superseded by qa-jira's verified current assignment/resume, implementation, review and open PR references. |
| `retained_delivery` | Original bytes/UUID, known receipts, unknown effects and explicit existing resume reference. It grants no retry. |
| `known_requests` | When claiming wait: exact typed upstream references plus current-case cause and unresolved-state evidence. |

Use supplied absolute paths from any working directory. Source validation is
`node <source>/scripts/validate-work.mjs --mode start --input WORK --context FACTS --format FORMAT --json`;
installed validation is
`node <receipt.skills>/work-validator/scripts/validate-work.mjs --mode start --input WORK --context FACTS --format FORMAT --json`.
Use FORMAT `yaml` or `adf` for the original input. A prior valid local check does
not establish current Jira authority or deployment.
No dependency fetching or setup repair occurs during delivery.

qa-jira `preflight` receives scope/capabilities/work/assignment and optional retained
delivery, without a fabricated assessment. It returns `preflight_status`,
`missing_prerequisites`, verified references and current facts. Its `final` mode
receives the same trusted inputs plus the actual `prepared_assessment` and exact
known requests. No helper may publish or transition Jira.

## Ordered unit handoff

Inventory `testing_strategy.dispatch_order` and expand each parent with its owned
child once, in canonical order. Inventory explicit case dependencies and the exact
ordered human IDs separately. Precreate all AI rows as NOT_RUN with reasons.
For each top-level call pass full raw work/context and the exact assigned case/
step/caller/children, original expectations, declared preparation, actual earlier
bindings, current revisions, identity/tenant/access, installed hash and cleanup.

| Prescribed order | Invocation and retained result |
| --- | --- |
| API parent | qa-entrypoint invokes qa-api; it alone invokes its one qa-bruno child. Retain both results and the child's original request/assertion report. |
| Database | Bind only the declared parent's actual exposed child output into the named input and exact zero-based `parameter_bindings` slot. Retain original/bound parameters, query/hash, rows, rollback/close and original provenance. |
| UI | Bind only declared actual inputs; retain supplied surface/browser/device/viewport, original checkpoints and inspected images. |

An API parent exposes its child's original observation, not a second request.
Binding is value transport, not permission or a causal dependency. Preserve output
name/type/value, extraction field, source step/offset, original evidence/category,
revision, actor, tenant and time. Missing extraction, trusted parameter count,
artifact or returned output stops rather than guessing or interpolating SQL.

## Helper result to complete canonical ledger

Retain helper `testVerdict`, step results and observations unchanged as detailed
artifacts. Keep categories `live-local`, `supplied/mock` or explicitly valid reused
evidence, retaining original category/provenance. Inspect actual evidence before making canonical rows. The exact row
fields remain `id`, `skill`, `result`, `evidence`, `finding_ids`, `not_run_reason`,
`reused_from`; use the existing schema's null/array rules. Results are PASS, FAIL
or NOT_RUN. BLOCKED describes run inability and never enters `result`.

| Actual evidence | Canonical mapping |
| --- | --- |
| Fully verified expectation and required artifacts | PASS, actual accessible evidence; no missing observation hidden behind a helper label. |
| Demonstrated mismatch under verified prerequisites | FAIL with evidence and declared stable finding IDs. |
| Not started, unfinished or no valid assessment | NOT_RUN with precise reason; never claim PASS or erase an earlier verified outcome. |
| Later inability after observed PASS/FAIL | Preserve those rows, findings and all attempts; uncompleted rows remain NOT_RUN. Include concrete inability and unknown effects in detailed assessment. |
| Valid case-specific reuse | Original PASS/FAIL and evidence, exact `reused_from` source plus separately retained current validity proof. History is never relabelled current execution. |

For every NOT_RUN row collect the union of finding IDs from its case's explicit
FAIL/NOT_RUN `depends_on` prerequisites, transitively through skipped chains and
joined paths. Independent inability has no invented causal IDs. Ownership,
bindings, nesting or unrelated findings add none. Every referenced finding has a
nonblank ID/summary, expected/observed behavior and approved accessible evidence.

Keep one aggregate row per expanded step and all per-attempt observations:
actual origin/offset/start/end/elapsed, whole-unit and child bounds, deadline,
original helper result, observations and category. `until_expected` stops at the
first verified match or fails at the completed last prescribed observation;
pending is local only. If inability prevents reaching that point, retain pending
attempts and aggregate NOT_RUN. `all_observations` retains mismatches even if later observations match.
An unfinished all-observations schedule retains aggregate FAIL for a demonstrated
mismatch; otherwise it is NOT_RUN, with all actual attempts preserved. Attempt
PASS alone cannot complete the aggregate.
Missed offsets, overrun or insufficient remaining budget stops without catch-up,
overlap or origin reset. A complete failed observation is not an inability; a lost
receipt or unverified observation is. Database keeps its 20-second outer bound.

`qa_report` retains its existing complete `steps`, exact `human_pending` and
`no_ai_cases_reason`. Keep findings beside it in `prepared_assessment`, never as
an invented report key. Detailed artifacts retain requirement/case mapping,
examined/total coverage, PASS/FAIL/NOT_RUN counts, attempt/omission IDs, audience/
retrieval, cleanup and limitations. Canonical record bounds remain 16 KiB, depth16,
list100; the complete actual candidate is checked again by qa-jira. Oversize means
retain the full local report and inability, never truncate or split publication.

## Partial and resume examples

These are mappings, not saved results or executable fixtures:

- API parent and child verified PASS; database capability then unavailable: retain
  both PASS rows and original artifacts, database/UI NOT_RUN with the actual
  inability. No invented finding IDs. Current tested PR/environment proof is still
  required for those executed claims; null proof keeps observations local.
- Case A demonstrates finding F1, case B explicitly depends on A and case C on B:
  B and C are NOT_RUN with F1. A downstream join depending on another failed case
  with F2 retains both F1 and F2. An independent prescribed case can still run
  until an inability stops dispatch.
- An exact unresolved upstream request prevents this case, after another defect:
  retain the FAIL/findings and the full partial report; provide typed request and
  causal observation. qa-jira determines dependency_wait only if no higher-priority
  inability remains. Discussion alone creates no terminal handoff.
- Valid resume: inspect the unique historical blocker/authorization and exact
  parent/child artifacts; independently verify case-specific reuse now. Keep their
  source category/references; use current clock after authorization for remaining
  allowed work. Stale/cross-tenant or untrusted approval stops; never replay a
  completed mutation or infer authorization from a case name.
- Static human-only native Bug: `steps: []`, exact ordered pending humans and
  nonblank no-AI reason. No runtime helper or deployment is invented, no human PASS
  is claimed. Human Review still requires verified publication and transition.

## Final result and recovery

`prepared_assessment` contains actual `qa_report`, all `findings`, detailed
observations/artifacts, `coverage`, `cleanup`, `reuse_basis`, proposed outcome and
reason. No terminal oracle or expected-as-observed values may fill it. Submit one
qa-jira final call. It independently rechecks current scope/requirements/assignment/
PR/review/CI/proof, chooses the kind/destination and owns candidate/UUID, validation,
append/readback, direct transition and at most one resolving read per uncertain
action. No replacement final call, direct fallback write or helper replay.

Return the publisher's exact snake_case `test_verdict`, `human_only`, `qa_report`,
`findings`, `human_pending`, `intended_destination`, `candidate_record`,
`published_reference`, publication/readback/transition receipts,
`actual_jira_status`, `delivery_outcome`, `recovery` and verified reference/revision
facts. Helper camelCase stays in original artifacts; local fields are not canonical
record keys. `delivery_outcome` is NOT_ATTEMPTED, COMPLETED, INELIGIBLE, UNAVAILABLE
or UNCERTAIN as qa-jira defines it. COMPLETED means the intended status is verified,
including Blocked, not that tests/humans passed.

Retain original candidate bytes, confirmed effects, unresolved effects, actual or
unknown status, precise human action and what must not be replayed. A saved report
or Jira status alone proves neither execution nor completed delivery. A current
result cannot be fabricated from historical evidence or an installation smoke.
