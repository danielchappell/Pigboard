# Pig Boss release one: complete delivery plan

**Owner-approved combined 25-Story QA split.** PGB-66 owns the release; PGB-93 owns the company/health addition to PGB-69's reviewed baseline. These 25 Stories preserve the earlier 23-Story set and compose the approved standalone QA publisher and repeated-parent amendments. Jira remains the queue; this pack is its reviewable design/acceptance record.

## What this release delivers

A company installs Pigboard in its own AWS account, previews the next eligible ticket and enables deterministic admission through the existing Jira-to-Cursor path. It includes the structured writer, validators, separate worker/job/Jira skills, human-requested rework, safe scheduling state and customer operating instructions needed for that journey.

The owner approved the base scope and the Pig Boss company/health addition. The owner approved the same-scope QA split on 15 November; each Story still requires its exact-base implementation plan and committed-code gates. The original 20-Story design and plan reviews remain historical evidence in the manager-design and manager-delivery review records. The current design delta has [product](../../reviews/pigboss-design-product.md) and [technical](../../reviews/pigboss-design-technical.md) CLEAN reviews. The historical 23-Story plan has CLEAN [product](../../reviews/pigboss-plan-product.md) and [technical](../../reviews/pigboss-plan-technical.md) reviews. Native publication is checked separately against the same contracts. [Structured contracts](ticket-drafts.json) are the current review input; [publication.json](publication.json) records the native keys and readback evidence. The earlier provider probe remains PARTIAL; installed acceptance has not run.

In scope addition: [Pig Boss multi-project identity and basic health](../../architecture/pig-boss-operations.md). [Deferred work is tracked in Jira](../../product/follow-on-roadmap.md), including the 50-project capacity plan.

Out of scope: worker monitoring, duplicate Cursor launches, launch proxy/dispatcher, transcript storage, cancellation/automatic recovery, SaaS, other-cloud packages, automatic Jira/Cursor provisioning, new QA engines, PR-environment provisioning, human-unblock producer and legacy runtime reuse. The product uses one customer configuration, customer-owned secrets/state and no Scuba Pig runtime access.

## Ordered Stories

[Complete Story bodies and 110 prescribed cases](stories.md) · [53-requirement coverage and the 41 original scenarios](coverage.md). All Stories target `danielchappell/Pigboard`, `main`, one PR. Current stages and assignments are native Jira facts; this source mirror makes no fresh all-ticket status claim.

| ID / Jira Story | Complete usable outcome | Depends on | Estimated human days | Forecast files |
| --- | --- | --- | ---: | ---: |
| R1-01 / [PGB-71](https://scubapig.atlassian.net/browse/PGB-71) | Validate an editable work document | Reviewed design | 1.5 | 19 |
| R1-02 / [PGB-72](https://scubapig.atlassian.net/browse/PGB-72) | Check the complete prescribed test plan | R1-01 | 1.5 | 7 |
| R1-03 / [PGB-73](https://scubapig.atlassian.net/browse/PGB-73) | Write complete Epic and ticket YAML | R1-01, R1-02 | 1.25 | 8 |
| R1-04 / [PGB-74](https://scubapig.atlassian.net/browse/PGB-74) | Validate assignment and handoff evidence | R1-01, R1-02 | 1.75 | 18 |
| R1-21 / [PGB-99](https://scubapig.atlassian.net/browse/PGB-99) | Configure Pig Boss for multiple projects | R1-04 | 1.5 | 9 |
| R1-05 / [PGB-75](https://scubapig.atlassian.net/browse/PGB-75) | Hand an implemented PR to review | R1-03, R1-04 | 1.5 | 10 |
| R1-06 / [PGB-76](https://scubapig.atlassian.net/browse/PGB-76) | Review and hand off the current PR | R1-04, R1-05 | 1.25 | 8 |
| R1-07 / [PGB-77](https://scubapig.atlassian.net/browse/PGB-77) | Execute prescribed QA helper steps | R1-02, R1-04 | 1.5 | 7 |
| R1-24 / [PGB-110](https://scubapig.atlassian.net/browse/PGB-110) | Publish prepared QA evidence safely | R1-04, R1-06, R1-07, PGB-108 | 3.3125–4.5 | 20 |
| R1-08 / [PGB-78](https://scubapig.atlassian.net/browse/PGB-78) | Execute prescribed QA and hand off complete evidence | R1-04, R1-06, R1-07, PGB-108, R1-24 | 1.625–1.875 | 20 |
| R1-09 / [PGB-79](https://scubapig.atlassian.net/browse/PGB-79) | Request rework through the human’s assistant | R1-04 | 1.25 | 7 |
| R1-10 / [PGB-80](https://scubapig.atlassian.net/browse/PGB-80) | Preview ready work from a complete snapshot | R1-02, R1-04, R1-21 | 1.75 | 7 |
| R1-25 / [PGB-113](https://scubapig.atlassian.net/browse/PGB-113) | Validate repeated-parent repairs | R1-10 | 1.98 | 15 |
| R1-11 / [PGB-81](https://scubapig.atlassian.net/browse/PGB-81) | Preview the complete repair order | R1-10, R1-25 | 1.70 | 19 |
| R1-12 / [PGB-82](https://scubapig.atlassian.net/browse/PGB-82) | Preview current Jira work with bounded reads | R1-11, R1-21 | 1.75 | 12 |
| R1-13 / [PGB-83](https://scubapig.atlassian.net/browse/PGB-83) | Install a disabled AWS preview | R1-12 | 1.75 | 13 |
| R1-14 / [PGB-84](https://scubapig.atlassian.net/browse/PGB-84) | Inspect durable scheduling state | R1-13 | 1.75 | 10 |
| R1-15 / [PGB-85](https://scubapig.atlassian.net/browse/PGB-85) | Reconcile an uncertain attempt with evidence | R1-12, R1-14 | 1.5 | 7 |
| R1-16 / [PGB-86](https://scubapig.atlassian.net/browse/PGB-86) | Upgrade and remove the AWS installation safely | R1-14, R1-15 | 1.25 | 8 |
| R1-22 / [PGB-100](https://scubapig.atlassian.net/browse/PGB-100) | Inspect Pig Boss operating health | R1-13, R1-14, R1-21 | 1.75 | 11 |
| R1-23 / [PGB-101](https://scubapig.atlassian.net/browse/PGB-101) | Install Pig Boss health alarms | R1-16, R1-22 | 1.5 | 10 |
| R1-17 / [PGB-87](https://scubapig.atlassian.net/browse/PGB-87) | Admit a ready Story or Bug safely | R1-05, R1-06, R1-08, R1-12, R1-14, R1-15, R1-16 | 1.75 | 10 |
| R1-18 / [PGB-88](https://scubapig.atlassian.net/browse/PGB-88) | Admit queued rework on its existing PR | R1-09, R1-17 | 1.25 | 5 |
| R1-19 / [PGB-89](https://scubapig.atlassian.net/browse/PGB-89) | Queue a completed dependent PR for repair | R1-18 | 1.5 | 5 |
| R1-20 / [PGB-90](https://scubapig.atlassian.net/browse/PGB-90) | Check a compatible release before enabling delivery | R1-03, R1-05, R1-06, R1-07, R1-08, R1-09, R1-19, R1-23 | 1.5 | 15 |

Estimates include implementation, tests, docs and PR preparation by a developer familiar with this repository. Total: **40.6175–42.055 human working days**, before separate installed acceptance; this is effort, not calendar duration or an agent-token forecast. The per-slice estimates are planning judgments grounded in the exact contracts and current files, not measured implementation times. Independent review must challenge them. All Stories retain the 20-file limit. PGB-110 alone has the fixed-scope time exception recorded below; other Stories retain the ordinary time limit. Count deletions/moves and all supporting files; if a concrete implementation plan cannot fit, revise/split and re-review the plan before code. Do not hide supporting changes.

### Why this order

R1-01/02 deliver usable author checks before the writer depends on them. R1-04 delivers a usable receipt validator shared by workers and manager. R1-05–09 update the existing delivery roles without deploying them. R1-25 first corrects the existing canonical chain validator on completed R1-10; R1-11 then uses that proof for the complete repair preview. R1-10/11 give operators a complete zero-write policy preview; R1-12 connects that preview to current Jira facts. R1-13 runs preview in the customer’s AWS account. R1-14/15 give a tested state API plus inspect/reconciliation commands; R1-16 protects upgrade/removal. Only then does R1-17 enable safe fixture admission, followed by queued repairs and dependent-stack queueing. R1-20 checks the whole pinned release before real acceptance.

Intermediate releases remain usable at their declared boundary: local validation, offline/live preview, disabled AWS preview and operator state inspection. New-work apply is explicitly a fixture/development increment while rework apply is absent; required repairs hold rather than being skipped. No partial chain is enabled for customer delivery. State API contract tests are real consumers of its guarantees; the same API is then used by apply. No archived module is revived.

The dependency table is the required partial order. Independent branches may be developed in parallel only with owned files and no unreviewed cross-branch assumptions. Shared `config/skill-bundle.json`, package metadata and docs need normal integration/review. The table is a valid serial order; stable IDs are not numerical execution order. R1-21 supplies configuration before policy/live preview; R1-22/23 add operating health before release readiness.

## File and size audit

These are bounded proposed file inventories, including tests/docs. Names are implementation-planning forecasts, not permission to exceed the boundary. No invented existing module is implied. New `lib/manager`, `lib/jira`, `lib/state` and `lib/aws` folders separate portable policy/application, provider operations, state guarantees and AWS. Exact filenames may change within scope and limits. Canonical schemas move once; examples/design references point to them and are counted.

### R1-01 — 19 forecast files, 1.5 days

`package.json`, `package-lock.json`, `contracts/epic-v1.schema.json`, `contracts/ticket-v1.schema.json`, `docs/architecture/contracts/pigboard-epic-v1.schema.json`, `docs/architecture/contracts/pigboard-ticket-v1.schema.json`, `scripts/validate-work.mjs`, `lib/contracts/parse.mjs`, `lib/contracts/schema.mjs`, `test/work-syntax.test.mjs`, `test/fixtures/work-syntax.json`, `docs/authoring.md`, `config/skill-bundle.json`, `scripts/prepare-pigboard-skills.mjs`, `test/skill-distribution.test.mjs`, `docs/architecture/manager-work-schema.md`, `docs/architecture/contracts/check_work_examples.py`, `docs/architecture/manager-work-contract.md`, `docs/architecture/examples/manager-ticket.yaml`.

### R1-02 — 7 forecast files, 1.5 days

`lib/contracts/work-semantics.mjs`, `lib/contracts/case-graph.mjs`, `scripts/validate-work.mjs`, `test/work-semantics.test.mjs`, `test/case-graph.test.mjs`, `test/fixtures/work-semantics.json`, `docs/authoring.md`.

### R1-03 — 8 forecast files, 1.25 days

`skills/write-pr-sized-stories/SKILL.md`, `skills/write-pr-sized-stories/references/pigboard-ticket.md`, `skills/write-pr-sized-stories/references/pigboard-example.md`, `skills/write-pr-sized-stories/references/pigboard-epic.md`, `skills/write-pr-sized-stories/references/epic.yaml`, `skills/write-pr-sized-stories/references/ticket.yaml`, `test/story-authoring.test.mjs`, `docs/authoring.md`.

### R1-04 — 18 forecast files, 1.75 days

`contracts/handoff-v1.schema.json`, `contracts/work-pointer-v1.schema.json`, `docs/architecture/contracts/pigboard-handoff-v1.schema.json`, `docs/architecture/contracts/pigboard-work-pointer-v1.schema.json`, `lib/contracts/handoff.mjs`, `lib/contracts/canonical.mjs`, `lib/contracts/receipts.mjs`, `scripts/validate-handoff.mjs`, `test/handoff.test.mjs`, `test/receipt-chain.test.mjs`, `test/fixtures/handoff-chains.json`, `docs/handoffs.md`, `config/skill-bundle.json`, `scripts/prepare-pigboard-skills.mjs`, `test/skill-distribution.test.mjs`, `docs/architecture/manager-handoff-contract.md`, `docs/architecture/contracts/check_work_examples.py`, `docs/architecture/examples/handoffs/admission.yaml`.

### R1-21 — 9 forecast files, 1.5 days

`contracts/config-v1.schema.json`, `lib/config/parse.mjs`, `lib/config/projects.mjs`, `scripts/check-config.mjs`, `lib/config/diff.mjs`, `test/config-projects.test.mjs`, `test/fixtures/project-configs.json`, `docs/configuration.md`, `config/pigboss.example.yaml`.

### R1-05 — 10 forecast files, 1.5 days

`skills/implementer-entrypoint/SKILL.md`, `skills/implementer-entrypoint/references/cursor.md`, `skills/implementer-entrypoint/references/handoff.md`, `skills/implementer-entrypoint/references/plan-review.md`, `skills/implementer-jira/SKILL.md`, `skills/implementer-jira/references/publication.md`, `config/skill-bundle.json`, `test/implementer-contract.test.mjs`, `test/fixtures/implementer-transcripts.json`, `docs/workflow.md`.

### R1-06 — 8 forecast files, 1.25 days

`skills/pigboard-pr-review/SKILL.md`, `skills/pigboard-pr-review/references/cursor.md`, `skills/pigboard-pr-review/references/jira-handoff.md`, `skills/reviewer-jira/SKILL.md`, `config/skill-bundle.json`, `test/reviewer-contract.test.mjs`, `test/fixtures/reviewer-transcripts.json`, `docs/workflow.md`.

### R1-07 — 7 forecast files, 1.5 days

`skills/qa-api/SKILL.md`, `skills/qa-bruno/SKILL.md`, `skills/qa-database/SKILL.md`, `skills/qa-ui/SKILL.md`, `test/qa-helper-contract.test.mjs`, `test/fixtures/qa-helper-cases.json`, `docs/qa-cases.md`.

### R1-24 — 20 forecast files, 26.5–36 hours

`skills/qa-jira/SKILL.md`, `config/skill-bundle.json`, `test/qa-helper-contract.test.mjs`, `test/fixtures/qa-helper-case.mjs`, `test/cursor-environment.test.mjs`, `README.md`, `ARCHITECTURE.md`, `docs/workflow.md`, `docs/install.md`, `docs/using-pigboard.md`, `docs/handoffs.md`, `config/cursor/automations.md`, `docs/delivery/manager-r1/README.md`, `docs/delivery/manager-r1/plan-metadata.json`, `docs/delivery/manager-r1/ticket-drafts.json`, `docs/delivery/manager-r1/publication.json`, `docs/delivery/manager-r1/stories.md`, `docs/delivery/manager-r1/coverage.md`, `docs/product/coverage.md`, `docs/product/README.md`.

### R1-08 — 20 forecast files, 13–15 hours

`skills/qa-entrypoint/SKILL.md`, `skills/qa-entrypoint/references/execution-record.md`, `skills/qa-entrypoint/references/cursor.md`, `test/qa-helper-contract.test.mjs`, `test/fixtures/qa-helper-case.mjs`, `test/cursor-environment.test.mjs`, `test/story-authoring.test.mjs`, `README.md`, `ARCHITECTURE.md`, `docs/workflow.md`, `docs/install.md`, `docs/using-pigboard.md`, `docs/authoring.md`, `docs/handoffs.md`, `config/cursor/automations.md`, `skills/write-pr-sized-stories/SKILL.md`, `skills/write-pr-sized-stories/references/basic-workflow-ticket.md`, `skills/implementer-entrypoint/references/handoff.md`, `skills/pigboard-pr-review/references/jira-handoff.md`, `skills/qa-api/references/structured-steps.md`.

### R1-09 — 7 forecast files, 1.25 days

`skills/request-rework/SKILL.md`, `skills/request-rework/references/example.md`, `config/skill-bundle.json`, `test/request-rework.test.mjs`, `test/fixtures/human-rework.json`, `docs/using-pigboard.md`, `docs/workflow.md`.

### R1-10 — 7 forecast files, 1.75 days

`lib/manager/snapshot.mjs`, `lib/manager/availability.mjs`, `lib/manager/decisions.mjs`, `scripts/manager-preview.mjs`, `test/manager-preview.test.mjs`, `test/fixtures/manager-candidates.json`, `docs/manager-preview.md`.

### R1-25 — 15 forecast files, 1.98 days

`lib/contracts/receipts.mjs`, `test/receipt-chain.test.mjs`, `test/fixtures/handoff-chains.json`, `test/cursor-environment.test.mjs`, `docs/handoffs.md`, `docs/architecture/manager-handoff-contract.md`, `docs/delivery/manager-r1/README.md`, `docs/delivery/manager-r1/plan-metadata.json`, `docs/delivery/manager-r1/ticket-drafts.json`, `docs/delivery/manager-r1/stories.md`, `docs/delivery/manager-r1/coverage.md`, `docs/delivery/manager-r1/publication.json`, `docs/product/README.md`, `docs/product/coverage.md`, `test/qa-helper-contract.test.mjs`.

### R1-11 — 19 forecast files, 1.70 days

`lib/manager/repair-policy.mjs`, `lib/manager/availability.mjs`, `lib/manager/decisions.mjs`, `lib/manager/snapshot.mjs`, `lib/contracts/receipts.mjs`, `scripts/manager-preview.mjs`, `test/repair-policy.test.mjs`, `test/fixtures/manager-repairs.json`, `test/receipt-chain.test.mjs`, `test/manager-preview.test.mjs`, `docs/manager-preview.md`, `docs/handoffs.md`, `docs/architecture/manager-handoff-contract.md`, `config/skill-bundle.json`, `scripts/install-cursor-skills.mjs`, `test/cursor-environment.test.mjs`, `docs/install.md`, `README.md`, `ARCHITECTURE.md`.

### R1-12 — 12 forecast files, 1.75 days

`contracts/config-v1.schema.json`, `config/pigboss.example.yaml`, `lib/config/parse.mjs`, `lib/jira/client.mjs`, `lib/jira/inventory.mjs`, `lib/jira/receipts.mjs`, `scripts/manager-preview.mjs`, `test/jira-preview.test.mjs`, `test/jira-security.test.mjs`, `test/fixtures/jira-pages.json`, `docs/manager-preview.md`, `docs/configuration.md`.

### R1-13 — 13 forecast files, 1.75 days

`lib/aws/lambda.mjs`, `lib/aws/secrets.mjs`, `infra/aws/template.yaml`, `scripts/package-manager.mjs`, `scripts/deploy-manager.mjs`, `contracts/config-v1.schema.json`, `test/aws-package.test.mjs`, `test/aws-iam.test.mjs`, `test/fixtures/aws-config.json`, `docs/install-manager.md`, `docs/configuration.md`, `package.json`, `package-lock.json`.

### R1-14 — 10 forecast files, 1.75 days

`lib/state/contract.mjs`, `lib/aws/dynamodb.mjs`, `scripts/manager-state.mjs`, `lib/aws/lambda.mjs`, `infra/aws/template.yaml`, `test/state-conformance.test.mjs`, `test/dynamodb-state.test.mjs`, `test/fixtures/state-history.json`, `docs/manager-state.md`, `docs/install-manager.md`.

### R1-15 — 7 forecast files, 1.5 days

`lib/manager/reconcile.mjs`, `scripts/manager-state.mjs`, `lib/aws/dynamodb.mjs`, `test/reconciliation.test.mjs`, `test/fixtures/reconciliation.json`, `docs/manager-state.md`, `docs/install-manager.md`.

### R1-16 — 8 forecast files, 1.25 days

`scripts/deploy-manager.mjs`, `scripts/manager-state.mjs`, `lib/config/compatibility.mjs`, `infra/aws/template.yaml`, `test/install-lifecycle.test.mjs`, `test/fixtures/upgrade-state.json`, `docs/install-manager.md`, `docs/manager-state.md`.

### R1-22 — 11 forecast files, 1.75 days

`lib/manager/scan-summary.mjs`, `lib/manager/health.mjs`, `lib/aws/scan-telemetry.mjs`, `lib/aws/health-reader.mjs`, `lib/aws/lambda.mjs`, `scripts/pigboss-health.mjs`, `test/manager-health.test.mjs`, `test/aws-health.test.mjs`, `test/fixtures/health-results.json`, `docs/operate-pigboss.md`, `contracts/config-v1.schema.json`.

### R1-23 — 10 forecast files, 1.5 days

`infra/aws/health.yaml`, `infra/aws/template.yaml`, `lib/aws/lifecycle.mjs`, `scripts/check-manager-readiness.mjs`, `test/aws-health-package.test.mjs`, `test/aws-lifecycle.test.mjs`, `test/fixtures/health-package.json`, `docs/operate-pigboss.md`, `docs/install-manager.md`, `contracts/config-v1.schema.json`.

### R1-17 — 10 forecast files, 1.75 days

`lib/manager/apply.mjs`, `lib/jira/mutations.mjs`, `lib/aws/lambda.mjs`, `scripts/manager-apply.mjs`, `scripts/manager-state.mjs`, `test/new-admission.test.mjs`, `test/admission-failures.test.mjs`, `test/fixtures/admission-traces.json`, `docs/manager-operations.md`, `docs/install-manager.md`.

### R1-18 — 5 forecast files, 1.25 days

`lib/manager/apply.mjs`, `lib/manager/repair-admission.mjs`, `test/repair-admission.test.mjs`, `test/fixtures/repair-admissions.json`, `docs/manager-operations.md`.

### R1-19 — 5 forecast files, 1.5 days

`lib/manager/stack-queue.mjs`, `lib/manager/apply.mjs`, `test/stack-queue.test.mjs`, `test/fixtures/stack-traces.json`, `docs/manager-operations.md`.

### R1-20 — 15 forecast files, 1.5 days

`config/skill-bundle.json`, `config/cursor/automations.md`, `config/cursor/implementer-prompt.txt`, `config/cursor/pr-review-prompt.txt`, `config/cursor/qa-prompt.txt`, `config/jira/exports/AI-Daniel-1-implementer.json`, `config/jira/exports/AI-Daniel-1-pr-review.json`, `config/jira/exports/AI-Daniel-1-qa.json`, `scripts/check-manager-readiness.mjs`, `scripts/prepare-pigboard-skills.mjs`, `test/manager-readiness.test.mjs`, `test/skill-distribution.test.mjs`, `docs/install-manager.md`, `docs/workflow.md`, `docs/using-pigboard.md`.

## Release acceptance Tasks

These are operational Tasks, not extra implementation Stories or provider research. Prepare the exact commands/resource bindings from the built package. Use the previously authorized disposable Scuba Pig AWS/Jira domain, with delivery triggers off; changing scope or creating additional resources beyond that authorization requires the normal concrete review. No test here runs during grooming. If a case needs a code change, fix within its owning Story or record a separate scoped defect; do not redefine a failing expectation.

### AT-01: Accept the installed manager package — [PGB-91](https://scubapig.atlassian.net/browse/PGB-91)

Owner: human operator and QA. Depends on R1-20. Environment: customer-owned nonproduction AWS account/region and isolated PGBT fixture project, with exact allowed ticket IDs captured before execution. Customer supplies secret references directly; no secrets in reports. AI QA skills: `[]`; this is explicit human-owned AWS/Jira package acceptance. Raw-provider receipts do not substitute.

| Case | Prepared data and ordered actions | Required result and evidence |
| --- | --- | --- |
| AT-01.1 New admission | Install the reviewed package disabled; inventory authorized fixture issues; verify full identity visibility and sole installation; preview an empty stream with ready Story, then ready Bug; enable only bounded fixture apply; invoke and re-read by stable IDs. | Selected source-specific Ready to Work→In Progress, complete verified assignment before transition, confirmed attempt; a later invocation has zero repeat effects. Save package SHA, config hash, resource IDs, native receipts and redacted call/state trace. |
| AT-01.2 Repair admission | Prepare A queued on its same open PR with all required receipts, four HR then five HR; preview/apply each; include documented pre-first-PR wait. | Only eligible four-HR repair starts; same PR/causes retained; five-HR waits. Save record/pointer/state trace and no-write evidence for rejected case. |
| AT-01.3 Stack repair | Prepare A repaired complete, B HR with actual old parent lineage and C ready; apply queue, inspect old B pointer, then admit B; publish authorized fixture completion; repeat scan; add a newer parent root. | Exact queue→admit path, oldest-first, preserved/consumed causes, no duplicate queue or unrelated bypass. Active/Blocked B and paused Epic variants make no queue move. Save lineage, receipts and state trace. |
| AT-01.4 Unknown effects | Use the production adapter with a test-harness boundary that drops confirmation after each of the three actual directed edges; also suppress local finalize. Invoke again; attempt reconciliation only with positive named evidence. | Persistent pending state and zero replay for each edge; positive same-attempt reconciliation only. If a real sent request remains ambiguous it stays held. Save fault location, actual provider receipt and later zero-write trace. |
| AT-01.5 Reads and changed facts | Supply throttled/unavailable/incomplete provider responses through the bounded harness; change relevant source facts before and after intent; attempt stale finalize. | Pre-intent no-write reevaluation; post-intent hold; stale finalize cannot clear current intent. The previously unrun stale-completion check is executed here and never relabelled as a prior pass. |
| AT-01.6 Security and lifecycle | Invoke as allowed and denied identities; target unrelated project/resource; inspect log/credential handling; upgrade with pending intent; stop/drain, incompatible rollback/restore, and remove the disposable stack. | Intended permissions only; no public/vendor access or leaked content; pending state survives; unsafe rollback stays disabled; table retained and retained resources/costs reported. Save actual IAM denial evidence and lifecycle receipts. |

Each case uses a fresh prepared fixture set or its explicitly ordered chain. Preserve evidence before cleanup. Stop/drain after each fault case; do not unlock ambiguous attempts to reuse a stream. After the suite, leave writes/schedule disabled, report retained resources and remove only explicitly approved disposable resources. Record PASS/FAIL/NOT_RUN per case, including failures or throttles.

### AT-02: Accept the installed worker path (PGB-58)

Owner: human operator/developer/QA. Depends on the compatible bundle and approved bounded delivery test. Keep all production rules inactive; enable only a separately authorized test route for the named fixture. Use the actual Cursor environment/Atlassian connection/PR identity, not the local simulated transcripts. Verify installed Grok effort controls and one independent plan reviewer.

1. Refresh the pinned external bundle in Cursor Build and verify every selected skill/schema/reference and its revision before a run.
2. On authorized native Story and Bug fixtures, each with its own test PR, verify actual pointer reads, complete bounded comment lookup, exact HTML code-block publication/readback, actor/edit metadata and directed implementation→review→QA→Human Review handoffs. Retain the actual result/transition receipts separately.
3. Verify same-PR rework, request-rework authorization, prescribed QA evidence (including UI screenshots where assigned) and explicit human-only zero-AI/pending-human reporting. Never invent an automated pass or perform human tests as the QA agent.
4. Record designated developer and human QA acceptance, then leave test routes inactive. PR environment provisioning remains a separate task; a real environment-dependent case cannot run without its prepared receipt.

Evidence: Build receipt, exact installed revision, model/tool capability check, current PR/CI, actual records/metadata, screenshot/evidence links, and final inactive-state confirmation. Missing transport/capability/access is a test blocker, not grounds for another unapproved integration. Cleanup only the named disposable fixtures/PR under the test authorization; preserve the evidence.

### AT-03: Owner activation decision — [PGB-92](https://scubapig.atlassian.net/browse/PGB-92)

Present exact release SHA, both independent code reviews per Story, CI/Codex gates, AT-01 and PGB-58 outcomes, current inactive configuration, remaining limitations and cost/resource report. The owner decides whether/when to enable the pilot. A green local suite, merged PR or this Story-set approval never enables it.

## Historical baseline review and remaining approval

1. Both independent plan reviewers completed 20/20 Stories, 88/88 cases, 50/50 requirements, 41/41 scenarios, dependencies and forecasts; second sweep and separate seven-principle assessments are recorded. Both verdicts are CLEAN.
2. The confirmed Bug-eligibility omission was corrected in all three worker Stories and installed acceptance, then independently re-reviewed. Any later scope increase still requires the owner.
3. PGB-71–PGB-90 contain the complete YAML contracts with native prerequisite keys; 45 dependency links include the two operational gates. Published bodies were compared with the reviewed drafts (only native keys and harmless Markdown normalization differ). PGB-91/92 and PGB-58 retain separate installed/activation gates.
4. Present the complete fixed set for owner review. Only after approval write each concrete implementation plan and pass its independent gate before code.

## Author principles assessment

- Intuitive: outcome titles and one review pack explain what ships at each step; request-rework remains separate from writing.
- Discoverable: field errors, complete cases, explicit file bounds and one coverage map expose missing work; Jira remains the queue.
- Delightful: no repeat discovery deployment or manual configuration duplication; local acceptance prepares real rollout instead of repeatedly changing live settings.
- Token saver: deterministic validation/scheduling and bounded receipts reduce agent guesswork; the full evidence ledger is never truncated.
- Secure: customer-owned infrastructure, least permissions, trusted scope and positive-only reconciliation are covered by explicit negative cases.
- Agents are equal: structured inputs/outputs remain primary; human-only acceptance accurately covers CLI/IaC gaps without inventing an installed QA engine.
- Dependable: partial provider proof, local fixtures, installed acceptance, merge and activation remain distinct; unknown side effects stay held.
- Unified configuration: one input generates bindings; skill bundle and version checks stop incompatible partial rollouts.

## Company and health acceptance addition

The original 20 Stories and review results are preserved as historical evidence.
This delta adds R1-21 (company configuration), R1-22 (health inspection) and R1-23
(health alarms), and five targeted cases in existing Stories. R1-10 grows by 0.25
estimated day; the three additions total 4.75 days. No implementation starts here.
The new assignment project binding adds one file to R1-04's inventory (18 total).

PGB-91 additionally owns these installed-package cases; no new provider probe is authorized by grooming:

| Case | Setup and steps | Expected result and evidence |
| --- | --- | --- |
| AT-01.7 Multi-project | Operator uses two authorized disposable projects with different status mappings, same AI-Maria-1 label and an explicit cross-project prerequisite. Preview both, hold one stream at five Human Review tickets, admit eligible independent work with delivery triggers disabled; rename a display key and simulate removed/inaccessible scope using the package test harness. | Distinct stream records and mappings, correct dependency wait, no false occupancy release, isolated versus shared failure holds. Save package/config revision, IDs, decisions and redacted mutation receipts. Restore disposable fixtures after evidence retention. Actual second-project access must be authorized before this installed case; simulated fixtures do not substitute. |
| AT-01.8 Operating health | On the disposable AWS package, run an empty successful scan and a safe denied-read failure; observe health. Stop completion emissions while desired scheduling remains enabled; observe missing-completion alarm. Check capacity signals with prepared bounded fixtures, read denial, intentional stop and config-only upgrade. If a customer test SNS destination is supplied, verify receipt there. | Readable/JSON state, actual alarm transition timestamps/delays, correct current evidence revision and no secret content. Disabled differs from failed stop; telemetry denial is unknown; no SNS means explicitly no push alert. Save logs/alarms/command evidence; restore disabled scheduling and remove temporary fault injection/routing. No Cursor runs. |

AT-01.8 distinguishes local alarm simulation from installed signal delivery. The
release report publishes the workload actually tested and any operating limits;
50-project support is not a release-one acceptance claim. Health startup and alarm
delays must be observed rather than marketed as an exact detection SLA.

Configuration ownership: R1-21 creates the sole `contracts/config-v1.schema.json`, parser and `config/pigboss.example.yaml`; R1-12/13 and health Stories extend/consume those same files. There is no second manager configuration. `plan-metadata.json` holds only delivery order, sizing and forecast files; `ticket-drafts.json` owns the structured Story contracts.

PGB-110 estimate refreshed after independent review and the first simulated instruction attempt: 14–15.5 hours includes the missing H03 variants and typed supplied/mock pipeline/database/UI evidence. The owner-approved original forecast was 12.5–15 hours; that dated approval and the unchanged publisher scope remain historical. PGB-78 stays 13–15 hours.

### PGB-110 fixed-scope time exception — approved 15 November 2026

The owner approved “Allow the fixed-scope time exception” on 15 November 2026,
recorded in [PGB-110 comment 10684](https://scubapig.atlassian.net/browse/PGB-110?focusedCommentId=10684).
This exception applies only to PGB-110's ordinary less-than-two-day rule. The current
forecast is 26.5–36 familiar-human hours, including integration with merged main
`6595e645bd91cec263a5ee0eaf1a3db95e7b9109` and the coherent mock actor/access correction.
The earlier 12.5–15h and 14–15.5h forecasts remain dated history; the proposed 18h
ceiling was superseded and was never approval. No replacement hourly cap applies.
Report ordinary correction work and reforecast honestly. One PR, the exact 20-file
scope, all acceptance cases, documentation and independent review/QA/CI gates remain.
This decision grants no new product scope, release, deployment or activation, and
transfers to neither PGB-78 nor another Story. PGB-80's separate historical exception
remains unchanged. The combined current source contains 25 Stories/110 cases.

The historical PGB-110 forecast after R2 evidence/cause correction and integration with main335
is **20.5–25.5 familiar-human hours** (upper forecast3.1875days). The former16–18.75h
forecast remains historical. The additional work completes saved-filter resume proof,
six distinct H02 outcomes with independently frozen dependency/browser facts and
coherent joined control, then reconciles the new preview payload/configuration and
seven ordered installation checks. The actual10684 fixed-scope exception remains
unchanged, without an hourly cap; one PR, exact20paths, all cases and gates remain.
These preparation/validation changes do not claim successful instruction/human acceptance.

## Repeated-parent amendment, 15 November 2026

PGB-113/R1-25 implements the existing chain validator only. PGB-81/R1-11 retains all four AC, two TAC and 42 cases; PGB-82 still follows PGB-81 and R1-21. Native links preserve PGB-80→PGB-81 and PGB-81→PGB-82, adding PGB-80→PGB-113→PGB-81. The historical split forecast was 15 files/1.95 days plus 19 files/1.70 days. Combined source and native scope are 25 Stories/110 cases, including the standalone publisher amendment. Historical publication receipts and 20/23-Story reviews remain dated evidence; no manager deployment or human acceptance is claimed.

The independently reviewed F1 preservation repair carries the selected worker's
existing proof through final authorized-resume checks and reuses only the exact
selected current QA for a truthful consumed resolution. Current PGB-113 forecast
is 15 files/1.98 familiar-human days, with 0.23 days remaining from the frozen
066f24c candidate. Prior 468-test and 100-case results remain evidence for their
original inputs and revision; repaired-candidate checks and independent reviews
are required separately. Human acceptance remains NOT_RUN.

Current PGB-110 forecast is 26.5–36 hours (upper forecast 4.5 days) under the actual comment 10684 fixed-scope exception, without an hourly cap. R3 completes causal histories and clocks with 63 preserved canonical specimens, 13 new counterparts and 76/19/57 packet usage accounting, integrated with merged main. Previous forecasts remain historical; all 20 paths, one PR and original gates remain. Combined source/native scope is 25 Stories/110 cases and 53 requirements/41 scenarios; both amendments and PGB-81's 42 human cases remain distinct.
