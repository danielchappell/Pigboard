# Implementer entry-point skill — authoring and evidence

## Delivered scope

The new portable `skills/implementer-entrypoint/` separates shared workflow behavior
from the Cursor model/effort profile. Its reviewer prompt and handoff reference
support High planning, one independent High plan reviewer, Medium implementation,
same-PR rework, current green CI and a verified In Review handoff. Required scope
increases and inability to complete the work stop for human intervention.

The source kit main was verified at `5bef5cf140bd5ea92e6600f0ff2a0be726e4c7ac`;
its current tree contains no implementer entry point. This is a new skill using
the accepted Jira/Cursor workflow and existing QA contracts. Legacy role cards
and queue runtime remain unchanged. No automatic model switch, concurrency lock,
Jira connector, CI waiter, preview environment or live automation is implemented
by these instructions.

## Independent plan review

Two fresh independent Sol High reviewers returned CLEAN for plan SHA256
`7ef1a3bcf63a2125d1ff3ef417fe01f62c2a5dfb414a025aebd810e7dc429318`.
The product reviewer covered 18/18 requirement groups and 6/6 governing artifacts;
the technical reviewer covered 21/21 requirement groups, 8/8 numbered phase
contracts and 7/7 relevant artifacts. Both performed a second sweep and individually
assessed all seven principles. No in-scope findings remained. These two authoring
reviewers do not add a second reviewer to the delivered runtime profile.

## Author assessment

- Intuitive: the In Progress owner produces a ready PR and ends its turn at In Review.
- Discoverable: explicit inputs, plan-review fields and QA artifacts explain readiness
  for the agent and for humans without the original conversation.
- Delightful experience: rework preserves the PR and can reuse applicable plans/evidence.
- Token saver: one runtime reviewer, Medium execution, finite CI waiting and stopped
  blockers avoid repeat investigation and idle model work.
- Secure: trusted assignment/repo authority, current ownership checks and human scope
  decisions constrain actions; ticket text and reviewer suggestions cannot grant rights.
- Agents are equal: explicit phase and handoff records support automation, while readable
  reports and evidence give developers and QA the same usable results.
- Dependable: revision-specific evidence, mutation reconciliation and separate readiness/
  delivery outcomes preserve partial and unknown results rather than claiming success.

## Validation and limitations

Independent instruction exercise, exact committed-artifact review and installation
results are recorded below after completion. Live Cursor model/effort switching,
reviewer isolation, actual Grok use, authenticated hooks, serialization, repository
permissions, CI inspection/waiting and Jira transitions remain unverified. Local
mock results cannot establish those capabilities. No production code changed, so
unrelated application tests are not counted as verification of this skill.

## Independent forward exercise

A fresh independent Sol High evaluator used the actual skill with the isolated
recording connector/phase double in `evidence/2026-11-12-implementer/`. It chose
plans, actions, finding dispositions and reports from fictional input snapshots.
The double returned configured results and retained 234 calls across 11 runs;
it did not decide routing. 126 requirement-based trace assertions passed.

| Cases | Observed result |
| --- | --- |
| 1 | High planning, one independent CLEAN review, Medium implementation, current green CI, PR/report access, verified In Review |
| 2 | Unresolved reviewer claim of required extra-repository scope; Blocked before code, no scope expansion |
| 3 | Re-review nominally CLEAN but repeats reviewer identity; Blocked before code; not valid fresh-review evidence |
| 4 | Confirmed fix reuses applicable plan and existing PR44; current green CI before In Review |
| 5 | Current required CI remains pending after one finite wait; historical green ignored; Blocked |
| 6, 10 | Missing independent reviewer capability or case expectation blocks before code |
| 7 | PR creation response lost; one resolving read finds the created PR, no duplicate; In Review |
| 8 | Tests/PR ready, transition response uncertain and one read fails; delivery BLOCKED, status unknown, no competing mutation |
| 9 | Demonstrated in-scope CI defect corrected at Medium on same PR; h2 evidence replaces h1 before In Review |
| 11 | Plan clarified after in-scope review feedback; distinct reviewer in second round returns exact-plan CLEAN; implementation/handoff complete |

The evaluator's unedited report retains limits and imperfections. In case3 it
switched to the execution phase before noticing repeated reviewer identity, but
stopped before code; this is not evidence of a successful review gate. Case2's
extra-repository claim was not independently proved by source excerpts: inability
to resolve it blocked, rather than a reviewer granting new scope. Cases3/11 clarify
explicit direct-handler regression coverage without accepting the fixture's
unsupported claim that the original plan had no shared validation.

During authoring, existing-PR identity checks and High-phase blocker publication
authority were made explicit. The observed blocker-report ambiguity was clarified:
ready handoffs require verified PR access to the report; Blocked handoffs require
the human recovery record on the Story or durable run output, with the existing PR
link and access limitations. This preserves the observed case5 stop; it does not
require publication recovery after a blocker. Fourteen additional raw boundary
scenarios are retained for independent exact-artifact review, not claimed as
executed connector tests.

The driver abstracts implementation/commit/push, reviewer execution, phase control
and evidence accessibility. It does not compile code, use Grok, inspect real CI
or prove real PR/Jira behavior. `read_evidence` reports fixture accessibility;
it is not actual screenshot or source verification. The local skill validator,
relative links and whitespace checks pass. Repository runtime tests were not rerun
for these instruction-only assets. Installation and committed-artifact reviews
remain separately recorded below.
