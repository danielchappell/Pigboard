# PGB-81 delivery incident review

16 November 2026. Accountable owner: the Pigboard Director.
Tracking: [PGB-168](https://scubapig.atlassian.net/browse/PGB-168).
This is contributor guidance, not a change to Pigboard's customer workflow.

## What failed

[PGB-81](https://scubapig.atlassian.net/browse/PGB-81) accumulated roughly twenty
hours of elapsed delivery time, including dependency waits. The Director kept
coordinating individual repairs and reviews without promptly giving the owner a
clear recovery decision when the combined time, cost uncertainty and remaining
work were no longer under control. Activity reports did not adequately expose
that loss of control. This was a failure of direction and escalation.

The latest stale test did **not** cause the entire delay. Earlier work included
real runtime defects, wrong expected results, late splits and parent repairs.
Repeated catalogue reconciliation and increasingly elaborate evidence collection
added further work. Required reviews caught genuine defects; the failure was
repeatedly paying those costs against unstable or incompletely checked inputs.

## What the evidence establishes

The Director assessed independent Astra research against retained plans, manager
records, source and test evidence. The chronology below summarizes those records;
it is not an exhaustive allocation of every hour or a claim that every step was
wasted. Supporting investigation records are retained with the PGB-168 work.

| Observation | Evidence and consequence |
| --- | --- |
| On 15 November, sizing repeatedly exceeded the Story limit. | Retained planning records describe prerequisite splits into PGB-113, PGB-129 and PGB-136. One revised forecast reached 2.30 human days after repair-plan reviews. These were intervention signals, not ordinary progress. |
| Earlier failures had different causes. | Retained repair plans identify lost receipt-consumption data, conflicting-proof handling, unreachable fixture inputs and incorrect expected explanations. The S41 plan explicitly withdrew an initial assumption of a runtime defect after inspecting the contract. |
| Evidence collection grew beyond ordinary outputs. | On 16 November, a proposed hook/emulation capture approach was reviewed and then rejected in favor of existing public outputs. The proposal was not implemented, but planning and rebinding consumed time. |
| Shared inputs kept changing. | Parent repairs and catalogue updates caused repeated sequencing and rebinding. Some waits protected real dependencies; safe independent work and a stable dated scope were established too late. |
| The final local suite had one narrow failure. | Its retained result is **659 passing tests and one failure**, not a green suite. A current forecast check read `hours.min` after approved metadata moved the values to `forecast_provenance`. Approved inputs and current prose already agreed. The focused repaired check later passed. |
| Four reported evidence gaps did not mean four missing artifacts. | Independent inspection found successful installer receipts and all four hash-verified manifest blobs in retained candidate maps. The preferred view used `/private/var` while the recorded map used `/var`. The missing view was a projection limitation; no runtime replay was needed to find those bytes. |
| A later document merge exposed another lookup assumption. | The State manager reported that the grouped headings added by [PR #119](https://github.com/danielchappell/Pigboard/pull/119) matched a broad lookup before individual requirement rows. The Director owns that concurrent integration. It was handled as an affected document-check correction, not a runtime failure. |

The stale forecast test could have been caught by a small changed-contract check
before the full suite. Static checks concentrated on capture and preservation,
while that cheap executable check waited. A plan restricting expensive scenario
runs must not prevent early, relevant contract checks.

## Why our existing rules were insufficient in practice

Our instructions already required small complete Stories, the smallest meaningful
check first, finite verification, evidence reuse and separation of defects from
setup or missing proof. Adding the same advice again would not correct this
incident. We failed to apply those rules consistently and lacked a concrete,
accountable intervention when local corrections accumulated.

The final candidate also carried substantial duplicated catalogue and historical
material. File count alone did not reveal that review burden. Support work,
uncertainty and repeated integration must be included in sizing; an apparent fit
near the limit is not permission to keep absorbing another repair.

The Director should have intervened when repeated repairs and new prerequisites
appeared, and certainly when reviewed work again exceeded the size limit. The
appropriate response was a bounded finish plan, a complete same-scope split, or
an explicit owner decision. Continuing to describe active agents was inadequate.

## What changes

The canonical [delivery checkpoint rule](../../AGENTS.md#delivery-checkpoints-and-escalation)
uses the existing queue and handoff. It adds no service, dashboard or recurring
approval ritual.

| Control | Accountable person | Observable result |
| --- | --- | --- |
| Name the next usable milestone, finish condition and wall-clock checkpoint. | Story manager; Director coordinates dependencies. | The existing handoff identifies what will be completed and when a missed checkpoint must be addressed. |
| Execute the cheapest affected check early and keep expensive verification finite. | Planner, implementer and plan reviewers. | A changed data contract has an executable early check; capture promises name an actual required result. |
| Classify failures and inspect retained evidence before replaying work. | Astra repair planner and QA. | Product, test, setup and evidence problems have distinct remedies; original failed and successful results survive. |
| Intervene on repeated repair, evidence trouble, size threats, repeated baseline invalidation or a missed critical milestone. | Director, or responsible agent when no Director exists. | One bounded decision is recorded before another affected cycle; the owner receives the unresolved decision promptly if completion cannot be bounded. |
| Keep a dated shared scope and identify who owns later changes. | Director and affected managers. | Status or count movement alone does not restart catalogue reconciliation. |
| Keep elapsed time, human estimates, logged tokens and actual spend separate. | Director. | Progress reports expose uncertainty rather than inventing cost or implying activity equals delivery. |

Existing independent reviews, current-revision CI, current-head Codex approval,
size limits, required-case human decisions and merge authority remain unchanged.
The RCA does not block PGB-81's narrow repair or authorize deployment/activation.

## Cost and attribution limits

There is no defensible total dollar amount or exclusive PGB-81 token bill in this
investigation. Available response logs cover only parts of the work and include
cached context and cross-stream coordination; child work and other intervals are
incomplete. Whole-Epic counters cannot be attributed to this Story. Elapsed time
is not paid labor or proof of waste. These limits do not excuse the demonstrated
failure to control the work and escalate it.

## Completion and adoption

At publication, this document records the corrective instructions, not proof of
their adoption or PGB-81 completion. The Director personally owns PGB-168 and the
following remaining checks:

- Publish the reviewed instructions through the normal PR, CI and Codex gates.
- Point the existing manager handoffs at the canonical rule and notify managers.
- Inspect the next substantive Story handoff and next repair handoff once for the
  early check, finite verification, checkpoint and intervention behavior.
- Record the results on PGB-168. Keep it open while adoption evidence is missing.

No broader retrospective audit, new monitoring product or financial investigation
is required to complete these corrections. Further work needs its own scope.
