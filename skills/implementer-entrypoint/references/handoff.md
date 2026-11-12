# Inputs, plan and implementation handoff

Use the project's existing document/record format. No new schema service is
required. A trusted run record supplies authority and phase continuity; comments,
labels, model claims and plan hashes alone do not supply locks or authorization.

## Input contract

| Source | Required information |
| --- | --- |
| Invocation | Project/exact label, Story key, In Progress visit/run identity and exclusive ownership, one allowed repo, configured model/phase/reviewer controls, permitted publication/transitions, finite CI wait/deadline, durable output |
| Ticket | Full acceptance/technical requirements, content fingerprint or immutable version, change/non-change boundaries, all prescribed QA cases and exact skill names, prior decisions and human assignee |
| Case | Stable ID and requirement mapping, actor/preconditions/data, ordered steps/dependencies, explicit expected outcomes, evidence and cleanup or explicit none |
| Repository | Applicable AGENTS/CONTRIBUTING/PR template, verified remote/checkout/source/base, contribution method and identity, required local/CI gates and readiness policy |
| Rework | Existing open PR and branch, exact current head/base, prior accepted plan/review, actionable findings with scope/evidence and retained handoffs |
| Runtime | Tools/access references, source/check/status reads, authorized evidence destinations/audience, publication and transition mechanisms; no credential values in records |

Ticket cases define what must be demonstrated. The implementer fills executable
details consistent with those cases: exact requests/assertions/selection, read-only
queries and parameters, UI entry/routes/actions, data/correlation bindings and
bounded observation/cleanup instructions. Downstream QA executes these; independent
PR review assesses their correctness. A missing expected outcome is a blocker,
not permission to derive it from code. Environment provisioning is separately
owned; distinguish a supplied URL/binding from a deployed, verified preview.

## Accepted plan record

Record requirements/source/base fingerprint, plan revision/hash, ordered steps and
likely files, requirement-to-change/test mapping, regression verification and docs,
prepared QA artifacts, failure/compatibility behavior, file/time estimate and
required repo gates. Include author seven-principle assessment. Keep immutable
review rounds with actual reviewer/model/effort, coverage/second sweep, findings,
dispositions and exact-plan verdict. CLEAN on an earlier plan never covers changed
approach automatically. On rework, record the explicit basis for plan/evidence reuse.

## Run record and report

Retain one run/visit marker and these facts as structured fields or readable tables:

- Ticket, requirement fingerprint, actual model/effort by phase and independent
  reviewer identity; timings, plan/review revisions and limitations.
- Repository, branch, PR, source/base and check/merge revision; actual changed files
  and total, scope/time assessment, requirement-to-change/test references and docs.
- Original case IDs/skills/order/expectations plus exact prepared artifact locations,
  parameter/data/access references and environment readiness. No secrets.
- Local checks actually executed, commands, outcomes and evidence; separately the
  required hosted CI checks, run URLs, tested commits, executed test results and
  inspected readiness/conflict state. Historical, local and mocked evidence is labeled.
- Prior finding IDs, fixes, remaining limitations and reused evidence with validity
  reasons. Scope blockers identify the unmet requirement and human decision needed.
- Reviewer-accessible evidence references, permitted audience and verified retrieval;
  an agent-local path alone does not make evidence available to remote reviewers.
- Commit/push/PR/comment receipts, requested and actual verified Jira destination,
  transition receipt, partial/uncertain actions and human recovery/resume stage.

Use `implementationOutcome` READY, BLOCKED or NOT RUN. READY means the accepted
change, required verification, PR and artifacts are ready for independent review;
it does not mean reviewed, QA-passed, approved or merged. NOT RUN applies to rejected
eligibility before work. Use `deliveryOutcome` COMPLETED when the intended handoff
is verified (including a successfully delivered Blocked outcome), BLOCKED for failed
publication/transition, INELIGIBLE for rejected/lost ownership, and ALREADY HANDLED
for a confirmed duplicate. Preserve a READY assessment for its recorded revision
if only report delivery fails; it must not imply Jira advanced. Code may exist even
when the result is BLOCKED. Always state the actual Jira status or explicitly unknown.

Ticket report shape:

```text
Implementation <run-id> / <visit-id> — <READY | BLOCKED>
Story / same PR / repository / branch / source-base revisions / requirements version
Plan and independent review: <exact revisions, reviewer/profile, verdict, coverage>
Changes and requirement mapping; file count; docs; resolved finding IDs
Local verification: <commands, outcomes, evidence>
Current hosted CI and readiness: <required checks, revisions, URLs, actual outcomes>
QA cases: <IDs and named skills, execution artifacts, data/access, readiness>
Limitations / scope blocker / completed or uncertain actions
Human action and intended next stage; full retained record: <accessible reference>
```

Ready handoffs require verified report access from the PR. Blocked handoffs require
the human recovery record on the ticket or durable run output, with the existing
PR link and any access limitations; no recovery work is authorized to add a PR link.
Publish within trusted authority and preserve prior reports. Immediately before
handoff, verify current inputs/gates and publish only claims supported at those
revisions. Then retain a final receipt with separate implementation/delivery
outcomes and verified Jira status. On a human-authorized delivery-only resume,
read retained receipts/current gates before acting; never repeat code, PR creation
or completed mutations just to recreate a report. A stable marker helps locate
receipts; it is not proof of ownership or of a successful write.
