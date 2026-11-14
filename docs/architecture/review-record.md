# Design and grooming review — 14 November 2026

The owner ratified all nine target diagrams and authorized repository publication.
Ratification is not deployment or an expansion of the first manager release.
The first-release choice is customer-owned AWS Lambda for admission; monitoring
and duplicate-run prevention are follow-on work. No archived runtime is reused.

## Independent design gate

Two fresh Sol reviewers examined the first-manager design independently.

- Product: CLEAN, 11/11 sections, 7/7 storyboard scenarios, 10/10 admission rules,
  7/7 scope boundaries, plus a second sweep.
- Technical/security: CLEAN, 11/11 sections, 10/10 rules, 7/7 scenarios,
  7/7 security/operation requirements and 3/3 discovery Tasks, plus a second sweep.

Both verdicts cover discovery/design Task grooming only. They explicitly exclude
delivery-ready implementation, deployment and activation. Contract compatibility,
repair-capacity details and safe uncertain-write handling remain required discovery.

## Independent delivery-plan gate

Two additional fresh Sol reviewers examined the design, plan and four drafted Tasks.

- Product: CLEAN, 3/3 artifacts, 4/4 Tasks, 12/12 required Task sections,
  10/10 rules, 5/5 provisional increments and 7/7 queue entries, plus a second sweep.
- Technical/security: CLEAN, 3/3 artifacts, 4/4 Tasks, 10/10 rules,
  5/5 provisional increments and 7/7 principles, plus a second sweep.

Each reviewer separately assessed all seven principles: intuitive Jira authority;
discoverable contracts and preview; useful increments without repeated setup;
deterministic token-saving scheduling; customer-owned access and explicit safety
gates; structured agent cases alongside human instructions; honest readiness and
failure evidence. None reported an unresolved in-scope finding.

The queue is [PGB-66](https://scubapig.atlassian.net/browse/PGB-66), with
PGB-67 and PGB-68 blocking PGB-69. Monitoring is PGB-70. Existing PGB-63/64/65 retain
the separate reliable-dispatch investigation. These are Tasks, not ready Stories.

## Diagram and publication verification

The nine-diagram draft previously passed two independent reviews after correcting
the availability wording and a misleading completion arrow on an idle full stream.
Publication preserves those diagrams, changes their banner to ratified target, and
adds the explicit first-release distinction in the README and walkthrough guide.
The new committed publication still requires its own review and CI; the design
verdicts above do not substitute for that evidence.

## Codex GitHub setup

Live settings for repository ID 1292227151 (danielchappell/Pigboard) were changed
from personal-preference review selection to **all pull requests**, with trigger
**every push**, and the saved values were observed. The existing integration already
had repository access. Personal and other-repository settings were not changed.

GitHub main had no branch protection or ruleset when checked. Automatic review
settings do not mechanically enforce a merge gate. AGENTS.md records the owner's
required current-revision Codex bot thumbs-up before any merge. The actual bot result,
CI and reviewed head must be verified on the documentation PR before merging.

No customer delivery automation, AWS resource, runtime, credential or Jira execution
status was changed by this documentation/grooming work.


## DynamoDB and human QA discovery addition — 14 November 2026

Owner-approved changes: customer-owned DynamoDB for admission state; state ownership
and safe upgrades; current QA skills only; explicit AI cases and separate human
cases pending Human Review. Automatic stack cascading remains an open decision.

Two fresh independent Sol design reviewers inspected the five-artifact addition
against base 79548bda36794b78d99b49c388c162059298c2ff:

- `state_design_product`: CLEAN for interim publication, 5/5 artifacts and 12/12
  contract areas, with a second sweep and independent seven-principle assessment.
- `state_design_technical`: CLEAN for interim publication, 5/5 artifacts and 11/11
  contract areas, with a second sweep and independent seven-principle assessment.

Both assessed unified configuration separately and checked the existing QA skills.
They found Jira authority, conditional state ownership, honest uncertainty, safe
lifecycle boundaries, human testing ownership and scope exclusions consistent.
Neither verdict completes discovery or approves the open cascade proposal.

Publication reuses the reviewed documentation-only path: update scope/plan and README
links, preserve the ratified diagrams, add the two discovery documents and this
record, check links/whitespace, obtain fresh exact-commit review, then require CI
and current-head Codex bot approval. Six files; no runtime/tests/skills/configuration
changes. No new tests are needed for this documentation change. The complete
implementation Story set remains gated on PGB-67/PGB-68 and owner review.

Committed publication review and hosted evidence belong on the resulting PR;
these design verdicts do not substitute for them. No AWS resources or delivery
runs were created, and no automation was enabled.


## Approved stack cascade and work-contract discovery — 14 November 2026

Owner approved manager-owned Human Review -> Rework Queued for a required recorded
stack update after the parent's repair passes automated review/AI QA. Actual parent
PR/revision determines conservative revalidation; one ticket/repository/PR remains
mandatory. Active work is not interrupted. Ordinary merge/retarget is not a trigger.

Two fresh Sol reviewers inspected the ten changed/new design artifacts against
89356976870bec7bcfb7f14aa812c60d5c32af0a:

- `stack_contract_product_review`: CLEAN for interim discovery publication; 10/10
  files and 26/26 contract areas, second sweep and all seven principles separately.
- `stack_contract_technical_review`: CLEAN for interim discovery publication; 10/10
  files and 12/12 contract surfaces, second sweep and all seven principles separately.

Both also assessed unified configuration, visible null skeletons, AI/human testing,
current-skill limits and actual evidence boundaries. Neither verdict freezes the
remaining handoff/transition protocol, completes PGB-67/PGB-68, authorizes the probe
or makes the complete Story set ready. The only subsequent design-artifact change
before publication was a factual note that the owner requested parallel AWS signup;
no account creation or probe result is claimed.

Publication follows the existing reviewed documentation-only path. It changes eleven
files including this record and two YAML examples. Relative Markdown links resolve;
both YAML skeletons parse, but deliberately contain required nulls and are not ready
work items. Whitespace checks pass. No runtime/skill/configuration change or new
runtime test is warranted. Fresh exact-commit review, CI and current-head Codex bot
approval remain separate publication gates, recorded on the resulting PR.


### Publication corrections after hosted review

Codex reviewed commit 8af5bf8efbf819c1f8574cd35b0cf8cec9421d80 on PR66 and
identified two documentation gaps: the linked diagram guide still described
release one as admission-only, and the work-contract introduction implied that
a handoff skeleton already existed. Both findings are valid and in scope. The
guide now includes the approved queue transition and its permission/acceptance
obligations; the introduction explicitly limits supplied skeletons to Epic and
ticket and keeps handoff encoding open. No new handoff design is adopted here.

This correction reuses the reviewed design and documentation publication plan.
Fresh committed review and current-head hosted checks are required; the earlier
CLEAN verdicts do not cover the correction. No runtime behavior changes.


A second hosted round at 78bbbf4 found two further in-scope coverage gaps: the
walkthrough's scope banner/footer lagged its corrected guide, and P1/P4 did not
explicitly require all three manager-owned source edges. The presentation text
now includes stack queueing without altering the nine ratified diagrams. P1
requires success and wrong-source rejection for every edge; P4 requires retained
uncertainty/no replay for each. The 12-transition ceiling includes setup and must
be revised before authorization if the eventual fixture cannot fit. Account signup
is now reported as complete, with deployment acceptance still unproven. Fresh
committed review and hosted gates apply again; no live probe is authorized.


The hosted review at 395146c also found the release-level acceptance paragraph
still focused on admission, despite the research probe covering all three edges.
This is a valid in-scope gap. Release acceptance and the delivery-plan acceptance
increment now explicitly cover the installed stack queue path, permissions, durable
intent, retained uncertainty, no repeated repair and later oldest-first admission.
The scoped deployment Mermaid diagram labels both permitted manager operations.
Research proof remains distinct from installed-package acceptance. This correction
requires fresh committed review and current-head hosted approval before merge.

## Worker handoff and isolated proof definition — 14 November 2026

The owner asked to finish the worker handoff contract and prepare isolated Jira/AWS
tests while continuing discovery toward the complete implementation Story set.
This revision defines visible typed comments, a generated assignment pointer,
reference/digest rules, role outcomes and ordered publication. It adds JSON Schema
design artifacts and nine visible-null skeletons. No installed skill, runtime,
Jira configuration or Cursor automation changes.

Initial independent product and technical reviews each examined 17/17 artifacts
and found a real recovery contradiction: one final result per assignment/role
would reject a valid success after human resolution of a blocked attempt. The
correction defines a unique human-authorized resume chain, preserving the old
blocker and requiring unchanged requirements/revision. It defines the receiving
contract; implementing human-unblock automation remains separately scoped.

Two fresh Sol design reviewers returned CLEAN for the corrected 18-artifact surface:

- `handoff_design_r2_product`: 18/18 artifacts, 20/20 requirement groups and 12/12
  contract surfaces; second sweep and independent seven-principle/unified-config
  assessment. Product surface digest: `9be0600118d47eaea820c74c15c7ffdf163d14ba8fc7a7777a1c5628080fb7f3`.
- `handoff_design_r2_technical`: 18/18 artifacts, 9/9 handoff kinds, 17/17 schema
  definitions, 12/12 semantic clauses and 19/19 offline cases; second sweep and
  independent seven-principle/unified-config assessment. Reviewer's ordered-surface
  digest: `06b53b954b8fabb0f8704d6006d72bdf5633f9d094767c0c606eb7fa2b9e1860`.

Both separately assessed current workflow compatibility, mutable-property/shared-
identity limits, conditional state, non-atomic publication, all three manager
edges, the four-ticket fixture and no automatic worker recovery. The different
surface digests use different file orderings; neither is a Git commit identity.

Author validation: Draft 2020-12 schemas valid; 69/69 structural accept/reject cases
matched expectations using jsonschema 4.25.1 with format checks; all nine incomplete
skeletons parse and fail completed-output validation. PyYAML 6.0.3 was used for
syntax only; its default resolver does not prove the required YAML 1.2 behavior.
The technical reviewer independently validated both schemas and the nine null
skeleton rejections. No semantic implementation, server metadata, real transition,
AWS permission or installed-package behavior is claimed by these checks.

Publication reuses the reviewed documentation-only path. Nineteen files including
this record; no production dependency or runtime change. Fresh exact-commit review,
CI and current-head Codex thumbs-up are required before merge. These design reviews
do not close PGB-67/PGB-68, authorize live tests or make implementation Stories ready.
Actual fixture IDs, credentials, executable requests, remaining operational contracts
and provider proof still gate that owner-reviewed Story set.


### PR67 provider-proof sequence correction

Codex found a P2 contradiction in the P4 expected evidence at cf9e22f: the
same stream cannot retain three simultaneous pending intents while reconciliation
is required between operations. The corrected packet observes each pending intent,
reconciles it before the next same-stream operation, and retains the first two as
history. The last repair remains pending for P5. No request ceiling or product
behavior changed; no live execution occurred. Exact revised review follows in PR
evidence; prior CLEAN reviews cover only their named revision.

### Scenario matrix design review — 14 November 2026

Two fresh independent Sol reviewers examined both design artifacts and all 41
scenarios against six governing contracts. Both completed second sweeps and assessed
all seven principles plus unified configuration. The design verdicts for the
following pre-correction artifact hashes were CLEAN; later corrections are recorded
separately below.
Scenario file SHA-256: 3ee27aa60d62b81ab49fa4cf034a758cb74f86266e9f40002f11553b079edc26.
Discovery file SHA-256: 3e696bb510e5922619fc7697b53c36fb1218212432fecb4afac3be4376bd5fab.
An initial product P2 was fixed by separating changes before intent (zero writes)
from changes after publication (no transition, retain human hold). Initial repair
queue authority is explicit. These are design results, not runtime/provider tests;
no implementation Story is ready. Exact committed review remains a separate gate.


### Scenario pause clarification review

Codex requested that S02 and S40 label the queue-only pause behavior provisional
at the point of use. Commit 09cd6a53f23eb422d7a5e0ba0e000ac49a6a6f59 makes that
clarification. The retained product report covered 1/1 changed file, 2/2 changed
rows, 41/41 matrix cases and 4/4 affected contracts: work opt-in/configuration/pause,
release-one admission rules, stack queue/admission/pause, and handoff worker draining.
The retained technical report covered 1/1 changed file and 2/2 rows, but did not
supply an examined/total denominator for its affected-contract surface. Both
reported CLEAN with second sweeps and principle assessments; that incomplete
technical coverage record does not satisfy the repository's full review gate.
These are historical reports, not a final verdict on the corrected PR.
Historical scenario SHA-256 at 09cd6a5:
51cf7e5203db4bfab1575993f5b5d5a99e6734c7b0f7b4a9a5c03b7867dd4ef9.

### Final scenario corrections

Codex also found that S19 wrongly offered a reviewer/QA path to rework A while B
already occupies the same stream. S19 now explicitly starts with A in Human Review
and assigns that transition only to authorized human-request automation. B's workers
cannot transition A. The final complete review must cover all three changed files,
all 41 scenarios and the six named governing documents: manager-work-contract,
manager-stack-repair, manager-handoff-contract, manager-state,
manager-admission-proof and manager-release-one. Its exact commit and separate
product/technical reports are recorded on PR 69 after review, not assumed here.
The owner has not approved the queue-only pause proposal. Publication does not
approve it or establish implementation readiness.
