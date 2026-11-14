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
