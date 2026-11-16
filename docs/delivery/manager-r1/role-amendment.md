# Manager and worker responsibilities — 16 November 2026

Pig Boss checks complete scheduling declarations and authenticated recorded proof.
Workers check the actual current facts and authority needed for their actions.
This is the approved target from [owner decision 10906](https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10906),
[Director decision 10909](https://scubapig.atlassian.net/browse/PGB-144?focusedCommentId=10909)
and the accepted [PGB-167 delivery decision](https://scubapig.atlassian.net/browse/PGB-167).
PGB-144 is Done for design. PGB-167 publishes documentation; it does not implement
the planned interfaces below or complete runtime acceptance.

Current source retains strict work validation, receipt/chain checking and the
existing preview. The allocated Stories deliver the new composition and snapshot
v2. Ticket text, authenticated publication and validation success grant no action
rights and never make the human Ready to Work decision. No new approval workflow,
context publisher/store or public worker-phase framework is introduced.

## Complete declarations and current actions

| Responsibility | Required check and limit |
| --- | --- |
| Author and human planner | Prepare complete scope, requirements, cases and expectations. The human decides readiness; the manager never grooms missing scope. |
| Manager before admission | Parse the full original raw work safely; validate required values, configured scope, installed supported skills, AC/TAC coverage, cases/children/dispatch graph, references, declared preparation, finite observations and complete ledger obligations. Scheduling success is not full current start or test success. |
| Implementer | Use the existing High plan → independent High review → Medium execution journey. Obtain current facts through canonical setup and permitted reads. Fill only declared mechanical slots, including artifacts that require code first. Check actual next-action rights and facts before acting; full current start, prepared coverage and current PR/CI/evidence remain required before READY. |
| Reviewer and QA | Reread current work and consume completed, retrievable hashed prepared inputs. Check applicable current PR, required-parent, evidence, capabilities and operation facts. Preserve independent review, ordered helpers/children, partial ledgers and pending human cases; do not invent missing inputs. |
| Human request-rework | Require explicit human record-and-queue authorization, current QA basis and actual same-open-PR/current-revision/evidence checks. Preserve exact findings; do not rerun QA, launch a worker or produce Blocked. |

Declared preparation can follow code only when necessary. Missing scope,
expectations, permissions or facts required for the next action cannot be deferred.
Configuration and actual permitted observations establish authority and facts;
copying ticket values into an allowlist cannot establish either. Existing
`draft`, `structure`, full `start`, handoff record and strict v1-chain primitives
keep their meanings. No synthetic context or failure-triggered fallback is valid.
The [work contract](../../architecture/manager-work-contract.md) and
[handoff contract](../../architecture/manager-handoff-contract.md) remain the strict
technical references; PGB-159/PGB-160 own their targeted composition notices.

## What recorded proof establishes

Authentication establishes that the configured publisher authored the exact
immutable record for its assignment. The manager checks current native work,
requirements digest, pointer/stored assignment, accepted stage, complete
ledger/preparation assertions and exact lineage. Changed requirements cannot use
an old successful QA as current completion. It does not repeat the old execution's
underlying operation checks or fetch current external PR/evidence observations.

Retain unique record/role/assignment slots, prior retained server metadata,
explicit predecessor/resume links, every direct/nested repair root and consumed
cause, repeated-parent segments and cutoffs, and exact parent incorporation.
Missing or conflicting required lineage holds; age and omission never resolve a
root. Genuine pre-first-PR waits require complete typed publication inventory and
no contradictory prior PR; this is not proof that no hidden external PR exists.
Older publishers assert old coverage/order/preparation and operation facts;
current-work equivalents remain checked against complete current declarations.

**Hidden pushes, PR close/merge and retargeting may escape manager detection.** A
coherent recorded chain may still queue or admit after such an unseen change.
No ordinary-merge/retarget cascade remains a scheduling rule, not live detection.
Each worker checks applicable current facts before its action; no worker promises
to detect every conceivable external change. Ordering, occupancy, five-ticket
capacity, pause, roots, parent segments and uncertainty rules are unchanged.

## Planned interfaces in existing modules

These are future contracts, not installed exports or commands to run today.
PGB-160/PGB-161 extend [the receipts module](../../../lib/contracts/receipts.mjs)
and [the existing handoff command](../../../scripts/validate-handoff.mjs).

| Planned interface | Purpose / result |
| --- | --- |
| `inspectRecordedCompletion(rawJson)` | Exact current recorded completion. Returns `{validation, bindings}` including `recorded_completion_established`, exact `validated_leaf`, `basis: authenticated_jira_handoff` and `external_freshness: not_evaluated`. Grants no execution authority. |
| `inspectRecordedHistory(rawJson)` | Authenticates the exact target and required ancestry, including a manager admission/stack request. Returns purpose-bound validity, target, records, coverage segments, bindings and diagnostics; does not require or assert QA completion. |
| `validateWorkerCurrent(rawJson)` / `worker-current` mode | Checks full actual current context, own/required-parent PR/evidence and configured action facts, using common recorded ancestry for older assignments. |
| `validateWorkerAssignment(rawJson)` / `worker-assignment` mode | Checks complete declarations, exact current assignment and authenticated ancestry with an explicitly missing execution context permitted. Supports truthful existing inability only; cannot establish execution readiness. |

The closed manager envelope is `pigboard-manager-handoff-input/v1`, with
`consumer: manager`, exact `target`, `trusted`, current `issues`, current-only
`requirements`, complete `comment_pages`, prior `retained` tuples and candidate
`request_resolutions`. Trusted inputs bind site, project IDs/stages/accepted-later
stages/actors/repositories and stored `manager_assignments`. Issues bind native
identity, project/stage/full stream, pointer, current requirements digest,
required requests and complete PR-publication inventory. Requirements retain
ticket/digest/format/raw bytes. Historical work/context bodies, `context_body`,
`pr_receipts`, `evidence_receipts` and execution evidence/pipeline/target allowlists
are excluded. Current comments cannot recreate missing prior retained tuples.
Results expose exact bindings, diagnostics, authenticated-record basis and
unchecked external freshness.

PGB-85's manager admission/stack-request target uses history validity, not
completion. Its exact target remains the original attempt publication, with
record UUID equal to original attempt UUID. Preserve manager role, operation
UUID, kind, native from/to statuses, site/project/full stream, pointer/retained
assignment, original publication digest and actual server metadata/body digest.
Separate 204/409 response capture, native-history completeness and control proof
remain mandatory; recorded validity cannot replace them.

The closed worker envelope is `pigboard-worker-handoff-input/v1`, with
`consumer: worker` and explicit purpose `worker-current` or `worker-assignment`.
Both bind current raw work, native stage/actor/assignment, actual scope and common
recorded ancestry. Current purpose requires full `current_context_body` and
applicable actual current observations/allowlists. Assignment purpose permits an
explicitly missing context only for declaration/assignment and supported inability
checks. Results identify exact target/assignment/digest, diagnostics and
purpose-specific candidate validity, always `execution_authorized:false`.

A `candidate:null` or original raw candidate plus format is an **unpublished**
item, with no invented comment ID or server metadata. Candidate validity cannot
establish published completion. Actual append/readback supplies the immutable
native target for chain validation, then final freshness/transition uses existing
record and action receipts. Unknown outcome holds the original identity without
execution, publication or transition replay. Unknown/mixed versions reject with
no manager-result or strict-v1 fallback.

Missing next-action proof stops that action. Only an authorized existing
blocked/dependency-wait shape whose kind/stage/reason/partial ledger truthfully
fits may be published. Unknown identity/authority, invalid declarations,
unauthenticated results or unsupported shapes remain local inability with Jira
unchanged. Human request-rework has no Blocked producer.

## Preview and native continuity

The single new pinned preview uses explicit `pigboard-manager-snapshot/v2`.
Old/mixed inputs reject with migration guidance; the older pinned release keeps
its historical behavior. There is no second preview evaluator or automatic
conversion. Preserve `retained_members`, `pending_intents` and `retained_complete`
shapes and original package/configuration/assignment/transition identities.
Unsupported original uncertain attempts hold; a new release cannot reinterpret
or replay them.

PGB-163's planned `readReconciliationFacts({attempt,publicationReferences,limits})`
uses validated retained selectors and one bounded reader session for exact
target/publication reads and fixed
`GET /rest/api/3/issue/{id}/changelog` pages with `startAt`/`maxResults`.
All reads share counters, deadline and byte limits. Native status-change
ID/actor/from/to/time history is separate from typed-comment ancestry. Complete
empty history differs from unavailable/incomplete/unsupported; failures never
become empty complete data. Neither history nor recorded completion proves
transition correlation or 204/409 outcome. Existing HTTPS/TLS, destination and
secret boundaries remain; no generic HTTP capability or new State storage is added.

## Delivery ownership and remaining gates

| Native work | Complete outcome / prerequisites |
| --- | --- |
| [PGB-159](https://scubapig.atlassian.net/browse/PGB-159) | Scheduling declarations and first complete machine/source catalogue and guards; after actual PGB-81 freeze and PGB-99/PGB-145 configuration prerequisites. |
| [PGB-160](https://scubapig.atlassian.net/browse/PGB-160) | Recorded completion/history; after PGB-159. |
| [PGB-161](https://scubapig.atlassian.net/browse/PGB-161) | Current worker and narrow assignment/inability checks; after PGB-160. |
| [PGB-162](https://scubapig.atlassian.net/browse/PGB-162) | One v2 offline preview and actual PGB-81 consumer migration; after PGB-160/PGB-81. Preserve the distinct 67 exported bodies, 66 installed inputs and 42 human objects. |
| [PGB-163](https://scubapig.atlassian.net/browse/PGB-163) | Exact native target/reconciliation facts under one budget; after PGB-160 and actual PGB-147/PGB-148/PGB-150 reader handoff. |
| [PGB-82](https://scubapig.atlassian.net/browse/PGB-82) | Complete bounded live preview; retains original identity/status, criteria/cases and prerequisites, plus PGB-162/PGB-163 and reviewed additions. |
| [PGB-164](https://scubapig.atlassian.net/browse/PGB-164) | Existing implementer fact preparation/composition; after PGB-161 and the coherent copied capability set. |
| [PGB-165](https://scubapig.atlassian.net/browse/PGB-165) | Existing reviewer current-proof composition; after PGB-161 and the coherent copied capability set. |
| [PGB-166](https://scubapig.atlassian.net/browse/PGB-166) | Existing QA and human request-rework composition; after PGB-161 and the coherent copied capability set. |
| [PGB-167](https://scubapig.atlassian.net/browse/PGB-167) | This five-file documentation Task; no runtime, catalogue or case-map completion. Does not wait for PGB-81. |

PGB-81 finishes naturally. Director coordinates State work and serial coverage
integration; this Task does not change its worktree or delay its freeze. PGB-159
owns later complete catalogue/guard amendments. Existing source counts, stable
case IDs, NOT_RUN results and completed work remain historical, as explained in
[coverage](../../product/coverage.md).

PGB-83 owns actual package/configuration/IAM wiring. PGB-84/PGB-137 retain
storage/publication/transition proof; PGB-85 retains its exact original manager
target, native history and controls. PGB-86's oversized lifecycle work must be
re-split against real source. PGB-87–89 retain their original effect/repair/no-replay
cases. Later host/State/apply work is **Provisional — not ready for delivery**
where source-dependent whole-slice fit remains unestablished; old forecasts are
not current estimates. Absent wiring does not delay independent ready work.

Each behavior Story owns its affected instructions/tests and exact-base plan and
committed-code reviews. PGB-90's final compatible installed-loop acceptance does
not replace these checks. Source publication, local validation, prescribed human
cases, installed/live acceptance, hosted CI, current-head Codex review, owner
merge/release and activation are separate gates. This Task claims no automated or
human runtime acceptance and leaves the recorded automation inactive.


## Adopted ordinary MVP guarantee cut — 16 November 2026

For the ordinary manager path, the current authenticated Jira handoff and complete
relevant chain may establish recorded completion without prior capture of every
historical worker comment's metadata. This supersedes this amendment's stronger
mandatory prior-capture promise for ordinary recorded proof only. Current exact
references, configured actors, native edit indicators, slots, requirements,
assignment and lineage/root checks remain. Any genuine supplied retained tuple
must match; missing prior capture alone no longer rejects. A change that passes
current authentication can go undetected without an earlier observation.

No metadata collector, new store or fabricated retained tuple is introduced.
Strict worker/current-manager proof and own admission/attempt, conditional State,
publication/readback and original transition/unknown-effect retention are unchanged.
PGB-175 owns ordinary worker compatibility; this source increment does not prove
that integration. PGB-162's two human cases remain NOT_RUN. Recorded proof does
not establish external freshness, live delivery, activation or permission to merge.
