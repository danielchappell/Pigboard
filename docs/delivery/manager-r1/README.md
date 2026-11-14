# First manager release: complete delivery plan

**Independently reviewed Story set — awaiting owner approval before implementation.** PGB-66 owns the release; PGB-69 owns this grooming work. These 20 Stories replace the earlier provisional slicing worksheet. Jira remains the queue; this pack is its reviewable design/acceptance record.

## What this release delivers

A company installs Pigboard in its own AWS account, previews the next eligible ticket and enables deterministic admission through the existing Jira-to-Cursor path. It includes the structured writer, validators, separate worker/job/Jira skills, human-requested rework, safe scheduling state and customer operating instructions needed for that journey.

The owner has approved the product decisions, not implementation of this delivery set. Both independent [product](../../reviews/manager-delivery-product.md) and [technical](../../reviews/manager-delivery-technical.md) delivery-plan reviews are CLEAN for the exact draft manifests recorded there. Native-key substitution/publication is recorded in [the publication receipt](publication.json). The unchanged reviewed structured drafts are retained in [ticket-drafts.json](ticket-drafts.json); Jira owns current tickets. The design is merged at `ba9cb49def75147b37fb822a4e0166c1429c3c3d`; [product](../../reviews/manager-design-product.md) and [technical](../../reviews/manager-design-technical.md) independent reviews are CLEAN for grooming. The earlier provider probe remains PARTIAL. Installed acceptance has not run.

Out of scope: worker monitoring, duplicate Cursor launches, launch proxy/dispatcher, transcript storage, cancellation/automatic recovery, SaaS, other-cloud packages, automatic Jira/Cursor provisioning, new QA engines, PR-environment provisioning, human-unblock producer and legacy runtime reuse. The product uses one customer configuration, customer-owned secrets/state and no Scuba Pig runtime access.

## Ordered Stories

[Complete Story bodies and 88 prescribed cases](stories.md) · [50-requirement/41-scenario coverage](coverage.md). All Stories target `danielchappell/Pigboard`, `main`, one PR. All 20 are To Do with `owner-review-required`, no worker labels and no Ready to Work state.

| ID / Jira Story | Complete usable outcome | Depends on | Estimated human days | Forecast files |
| --- | --- | --- | ---: | ---: |
| R1-01 / [PGB-71](https://scubapig.atlassian.net/browse/PGB-71) | Validate an editable work document | Reviewed design | 1.5 | 19 |
| R1-02 / [PGB-72](https://scubapig.atlassian.net/browse/PGB-72) | Check the complete prescribed test plan | R1-01 / [PGB-71](https://scubapig.atlassian.net/browse/PGB-71) | 1.5 | 7 |
| R1-03 / [PGB-73](https://scubapig.atlassian.net/browse/PGB-73) | Write complete Epic and ticket YAML | R1-01, R1-02 | 1.25 | 8 |
| R1-04 / [PGB-74](https://scubapig.atlassian.net/browse/PGB-74) | Validate assignment and handoff evidence | R1-01, R1-02 | 1.75 | 17 |
| R1-05 / [PGB-75](https://scubapig.atlassian.net/browse/PGB-75) | Hand an implemented PR to review | R1-03, R1-04 | 1.5 | 10 |
| R1-06 / [PGB-76](https://scubapig.atlassian.net/browse/PGB-76) | Review and hand off the current PR | R1-04, R1-05 | 1.25 | 8 |
| R1-07 / [PGB-77](https://scubapig.atlassian.net/browse/PGB-77) | Execute prescribed QA helper steps | R1-02, R1-04 | 1.5 | 7 |
| R1-08 / [PGB-78](https://scubapig.atlassian.net/browse/PGB-78) | Complete QA with an honest evidence ledger | R1-04, R1-06, R1-07 | 1.75 | 10 |
| R1-09 / [PGB-79](https://scubapig.atlassian.net/browse/PGB-79) | Request rework through the human’s assistant | R1-04 / [PGB-74](https://scubapig.atlassian.net/browse/PGB-74) | 1.25 | 7 |
| R1-10 / [PGB-80](https://scubapig.atlassian.net/browse/PGB-80) | Preview ready work from a complete snapshot | R1-02, R1-04 | 1.5 | 7 |
| R1-11 / [PGB-81](https://scubapig.atlassian.net/browse/PGB-81) | Preview the complete repair order | R1-10 / [PGB-80](https://scubapig.atlassian.net/browse/PGB-80) | 1.5 | 7 |
| R1-12 / [PGB-82](https://scubapig.atlassian.net/browse/PGB-82) | Preview current Jira work with bounded reads | R1-11 / [PGB-81](https://scubapig.atlassian.net/browse/PGB-81) | 1.75 | 12 |
| R1-13 / [PGB-83](https://scubapig.atlassian.net/browse/PGB-83) | Install a disabled AWS preview | R1-12 / [PGB-82](https://scubapig.atlassian.net/browse/PGB-82) | 1.75 | 13 |
| R1-14 / [PGB-84](https://scubapig.atlassian.net/browse/PGB-84) | Inspect durable scheduling state | R1-13 / [PGB-83](https://scubapig.atlassian.net/browse/PGB-83) | 1.75 | 10 |
| R1-15 / [PGB-85](https://scubapig.atlassian.net/browse/PGB-85) | Reconcile an uncertain attempt with evidence | R1-12, R1-14 | 1.5 | 7 |
| R1-16 / [PGB-86](https://scubapig.atlassian.net/browse/PGB-86) | Upgrade and remove the AWS installation safely | R1-14, R1-15 | 1.25 | 8 |
| R1-17 / [PGB-87](https://scubapig.atlassian.net/browse/PGB-87) | Admit a ready Story or Bug safely | R1-05, R1-06, R1-08, R1-12, R1-14, R1-15, R1-16 | 1.75 | 10 |
| R1-18 / [PGB-88](https://scubapig.atlassian.net/browse/PGB-88) | Admit queued rework on its existing PR | R1-09, R1-17 | 1.25 | 5 |
| R1-19 / [PGB-89](https://scubapig.atlassian.net/browse/PGB-89) | Queue a completed dependent PR for repair | R1-18 / [PGB-88](https://scubapig.atlassian.net/browse/PGB-88) | 1.5 | 5 |
| R1-20 / [PGB-90](https://scubapig.atlassian.net/browse/PGB-90) | Check a compatible release before enabling delivery | R1-03, R1-05, R1-06, R1-07, R1-08, R1-09, R1-19 | 1.5 | 15 |

Estimates include implementation, tests, docs and PR preparation by a developer familiar with this repository. Total: **30.25 human working days**, before separate installed acceptance; this is effort, not calendar duration or an agent-token forecast. The per-slice estimates are planning judgments grounded in the exact contracts and current files, not measured implementation times. Independent review must challenge them. No Story reaches two days or 20 files in this forecast. Count deletions/moves and all supporting files; if a concrete implementation plan cannot fit, revise/split and re-review the plan before code. Do not hide supporting changes.

### Why this order

R1-01/02 deliver usable author checks before the writer depends on them. R1-04 delivers a usable receipt validator shared by workers and manager. R1-05–09 update the existing delivery roles without deploying them. R1-10/11 give operators a complete zero-write policy preview; R1-12 connects that preview to current Jira facts. R1-13 runs preview in the customer’s AWS account. R1-14/15 give a tested state API plus inspect/reconciliation commands; R1-16 protects upgrade/removal. Only then does R1-17 enable safe fixture admission, followed by queued repairs and dependent-stack queueing. R1-20 checks the whole pinned release before real acceptance.

Intermediate releases remain usable at their declared boundary: local validation, offline/live preview, disabled AWS preview and operator state inspection. New-work apply is explicitly a fixture/development increment while rework apply is absent; required repairs hold rather than being skipped. No partial chain is enabled for customer delivery. State API contract tests are real consumers of its guarantees; the same API is then used by apply. No archived module is revived.

The dependency table is the required partial order. Independent branches may be developed in parallel only with owned files and no unreviewed cross-branch assumptions. Shared `config/skill-bundle.json`, package metadata and docs need normal integration/review. The chronological numeric list is a valid serial order; it is not an extra runtime queue policy.

## File and size audit

These are bounded proposed file inventories, including tests/docs. Names are implementation-planning forecasts, not permission to exceed the boundary. No invented existing module is implied. New `lib/manager`, `lib/jira`, `lib/state` and `lib/aws` folders separate portable policy/application, provider operations, state guarantees and AWS. Exact filenames may change within scope and limits. Canonical schemas move once; examples/design references point to them and are counted.

### R1-01 — 19 forecast files, 1.5 days

`package.json`, `package-lock.json`, `contracts/epic-v1.schema.json`, `contracts/ticket-v1.schema.json`, `docs/architecture/contracts/pigboard-epic-v1.schema.json` (removed after move), `docs/architecture/contracts/pigboard-ticket-v1.schema.json` (removed after move), `scripts/validate-work.mjs`, `lib/contracts/parse.mjs`, `lib/contracts/schema.mjs`, `test/work-syntax.test.mjs`, `test/fixtures/work-syntax.json`, `docs/authoring.md`, `config/skill-bundle.json`, `scripts/prepare-pigboard-skills.mjs`, `test/skill-distribution.test.mjs`, `docs/architecture/manager-work-schema.md`, `docs/architecture/contracts/check_work_examples.py`, `docs/architecture/manager-work-contract.md`, `docs/architecture/examples/manager-ticket.yaml`.

### R1-02 — 7 forecast files, 1.5 days

`lib/contracts/work-semantics.mjs`, `lib/contracts/case-graph.mjs`, `scripts/validate-work.mjs`, `test/work-semantics.test.mjs`, `test/case-graph.test.mjs`, `test/fixtures/work-semantics.json`, `docs/authoring.md`.

### R1-03 — 8 forecast files, 1.25 days

`skills/write-pr-sized-stories/SKILL.md`, `skills/write-pr-sized-stories/references/pigboard-ticket.md`, `skills/write-pr-sized-stories/references/pigboard-example.md`, `skills/write-pr-sized-stories/references/pigboard-epic.md`, `skills/write-pr-sized-stories/references/epic.yaml`, `skills/write-pr-sized-stories/references/ticket.yaml`, `test/story-authoring.test.mjs`, `docs/authoring.md`.

### R1-04 — 17 forecast files, 1.75 days

`contracts/handoff-v1.schema.json`, `contracts/work-pointer-v1.schema.json`, `docs/architecture/contracts/pigboard-handoff-v1.schema.json` (removed after move), `docs/architecture/contracts/pigboard-work-pointer-v1.schema.json` (removed after move), `lib/contracts/handoff.mjs`, `lib/contracts/canonical.mjs`, `lib/contracts/receipts.mjs`, `scripts/validate-handoff.mjs`, `test/handoff.test.mjs`, `test/receipt-chain.test.mjs`, `test/fixtures/handoff-chains.json`, `docs/handoffs.md`, `config/skill-bundle.json`, `scripts/prepare-pigboard-skills.mjs`, `test/skill-distribution.test.mjs`, `docs/architecture/manager-handoff-contract.md`, `docs/architecture/contracts/check_work_examples.py`.

### R1-05 — 10 forecast files, 1.5 days

`skills/implementer-entrypoint/SKILL.md`, `skills/implementer-entrypoint/references/cursor.md`, `skills/implementer-entrypoint/references/handoff.md`, `skills/implementer-entrypoint/references/plan-review.md`, `skills/implementer-jira/SKILL.md`, `skills/implementer-jira/references/publication.md`, `config/skill-bundle.json`, `test/implementer-contract.test.mjs`, `test/fixtures/implementer-transcripts.json`, `docs/workflow.md`.

### R1-06 — 8 forecast files, 1.25 days

`skills/pigboard-pr-review/SKILL.md`, `skills/pigboard-pr-review/references/cursor.md`, `skills/pigboard-pr-review/references/jira-handoff.md`, `skills/reviewer-jira/SKILL.md`, `config/skill-bundle.json`, `test/reviewer-contract.test.mjs`, `test/fixtures/reviewer-transcripts.json`, `docs/workflow.md`.

### R1-07 — 7 forecast files, 1.5 days

`skills/qa-api/SKILL.md`, `skills/qa-bruno/SKILL.md`, `skills/qa-database/SKILL.md`, `skills/qa-ui/SKILL.md`, `test/qa-helper-contract.test.mjs`, `test/fixtures/qa-helper-cases.json`, `docs/qa-cases.md`.

### R1-08 — 10 forecast files, 1.75 days

`skills/qa-entrypoint/SKILL.md`, `skills/qa-entrypoint/references/execution-record.md`, `skills/qa-entrypoint/references/cursor.md`, `skills/qa-jira/SKILL.md`, `config/skill-bundle.json`, `test/qa-entrypoint-contract.test.mjs`, `test/qa-observation.test.mjs`, `test/fixtures/qa-transcripts.json`, `docs/qa-cases.md`, `docs/workflow.md`.

### R1-09 — 7 forecast files, 1.25 days

`skills/request-rework/SKILL.md`, `skills/request-rework/references/example.md`, `config/skill-bundle.json`, `test/request-rework.test.mjs`, `test/fixtures/human-rework.json`, `docs/using-pigboard.md`, `docs/workflow.md`.

### R1-10 — 7 forecast files, 1.5 days

`lib/manager/snapshot.mjs`, `lib/manager/availability.mjs`, `lib/manager/decisions.mjs`, `scripts/manager-preview.mjs`, `test/manager-preview.test.mjs`, `test/fixtures/manager-candidates.json`, `docs/manager-preview.md`.

### R1-11 — 7 forecast files, 1.5 days

`lib/manager/repair-policy.mjs`, `lib/manager/availability.mjs`, `lib/manager/decisions.mjs`, `scripts/manager-preview.mjs`, `test/repair-policy.test.mjs`, `test/fixtures/manager-repairs.json`, `docs/manager-preview.md`.

### R1-12 — 12 forecast files, 1.75 days

`config/manager.schema.json`, `config/manager.example.yaml`, `lib/config/manager.mjs`, `lib/jira/client.mjs`, `lib/jira/inventory.mjs`, `lib/jira/receipts.mjs`, `scripts/manager-preview.mjs`, `test/jira-preview.test.mjs`, `test/jira-security.test.mjs`, `test/fixtures/jira-pages.json`, `docs/manager-preview.md`, `docs/manager-configuration.md`.

### R1-13 — 13 forecast files, 1.75 days

`lib/aws/lambda.mjs`, `lib/aws/secrets.mjs`, `infra/aws/template.yaml`, `scripts/package-manager.mjs`, `scripts/deploy-manager.mjs`, `config/manager.schema.json`, `test/aws-package.test.mjs`, `test/aws-iam.test.mjs`, `test/fixtures/aws-config.json`, `docs/install-manager.md`, `docs/manager-configuration.md`, `package.json`, `package-lock.json`.

### R1-14 — 10 forecast files, 1.75 days

`lib/state/contract.mjs`, `lib/aws/dynamodb.mjs`, `scripts/manager-state.mjs`, `lib/aws/lambda.mjs`, `infra/aws/template.yaml`, `test/state-conformance.test.mjs`, `test/dynamodb-state.test.mjs`, `test/fixtures/state-history.json`, `docs/manager-state.md`, `docs/install-manager.md`.

### R1-15 — 7 forecast files, 1.5 days

`lib/manager/reconcile.mjs`, `scripts/manager-state.mjs`, `lib/aws/dynamodb.mjs`, `test/reconciliation.test.mjs`, `test/fixtures/reconciliation.json`, `docs/manager-state.md`, `docs/install-manager.md`.

### R1-16 — 8 forecast files, 1.25 days

`scripts/deploy-manager.mjs`, `scripts/manager-state.mjs`, `lib/config/compatibility.mjs`, `infra/aws/template.yaml`, `test/install-lifecycle.test.mjs`, `test/fixtures/upgrade-state.json`, `docs/install-manager.md`, `docs/manager-state.md`.

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

## Completed review and remaining approval

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
