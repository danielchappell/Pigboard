# Pig Boss scoped design review — product, experience and documentation

Date: 14 November 2026. Reviewer: fresh independent Sol agent, product/experience lens with security, failure, contract and test review. No repository edits or live provider actions performed.

Verdict: **CLEAN** for the exact updated uncommitted artifact below. The three initial findings were fixed and independently re-reviewed; no unresolved in-scope findings remain. This is design review, not committed-code, plan, installed acceptance or release evidence.

## Artifact and coverage

Checkout `/private/tmp/pigboard-product-requirements-20261114`, base HEAD `2f747232db156babc329053d2f5448b21b2a5b6a`.

Changed design/document/contract files examined: **14/14**: `docs/architecture/pig-boss-operations.md`, `docs/product/manager.md`, `docs/product/installation.md`, `docs/product/README.md`, `ARCHITECTURE.md`, `README.md`, and architecture contracts `manager-discovery-closure.md`, `manager-handoff-contract.md`, `manager-release-one.md`, `manager-scenarios.md`, `manager-state.md`, `manager-work-contract.md`, plus `docs/architecture/contracts/pigboard-handoff-v1.schema.json` and `docs/architecture/examples/handoffs/admission.yaml`.

Linked support contracts examined: **3/3**: `docs/product/coverage.md`, `docs/architecture/manager-stack-repair.md`, `docs/architecture/manager-work-schema.md`. Governing instructions examined: **2/2**, AGENTS.md and CONTRIBUTING.md. Thus design/support file coverage is **17/17**, plus **2/2** governing files. This does not claim re-review of the prior complete delivery plan, unchanged JSON schemas, or live Jira; the parent supplied the accepted scope decisions, and this review is confined to this design delta.

Approved-scope and design obligations walked: **16/16**:

1. Pig Boss component name and Pigboard product name; retained technical identifiers.
2. One customer AWS installation for multiple projects in one Jira site.
3. Canonical per-project mappings, repositories, defaults and validation.
4. Site + immutable project ID + full-label identity for ownership, occupancy, cap and repair/state behavior.
5. Retained identity through label/key/project move/removal, with no automatic transfer.
6. Native-metadata membership/reference checks and cross-project prerequisites.
7. One admitting installation per project, serial scans and separate worker concurrency.
8. Basic manager health separated from worker monitoring, deduplication and recovery.
9. Portable sanitized scan summary, business holds versus incomplete reads and crash absence.
10. Read-only readable/JSON health command, states, evidence and exit results.
11. Fresh evidence tied to the active revision, not historical success.
12. Canonical cadence, budgets, thresholds, retention and optional existing SNS routing.
13. Missing-completion, error/throttle and utilization alarms, low-cardinality metrics and missing-data treatment.
14. Disabled install, enable/stop/upgrade/removal, permission failures and no automatic remediation.
15. Fifty-project follow-on target, measured envelope and no first-release concurrency or unmeasured guarantee.
16. New acceptance surface and preservation of design/plan/owner/activation gates.

Second sweep completed: read the changed product requirements back into each primary-design section, then rechecked identity/state/stack contracts and lifecycle/health failure branches. The initial sweep found the table defect below. After the author updated the design, I reread the health failure/stop/revision paths, corrected product table, complete 1,304-line handoff schema and admission skeleton, and checked the new project binding against assignment/worker/state contracts. No additional in-scope finding was found in this second sweep.

## Findings and re-review dispositions

No unresolved findings.

1. **F1 — P2, fixed — Failed stop reported as disabled.** The original disabled definition used desired state alone. Updated `pig-boss-operations.md` requires observed stopped scheduling; any desired/actual mismatch takes precedence over disabled/starting, and a failed stop is degraded with exit 1. The existing stop/drain procedure remains required for a safe-stop claim. Independently re-read the command, lifecycle and exit contracts: resolved.
2. **F2 — P2, fixed — Health evidence revision ambiguous after configuration-only changes.** The updated design explicitly binds summaries, metrics, command and alarms to the same evidence revision, incorporating code/package revision, effective configuration digest and enablement generation. Configuration-only changes rotate the evidence window. This prevents success for a former project scope from satisfying the new revision. Independently re-read summary/freshness/metric/upgrade behavior: resolved.
3. **F3 — P3, fixed — O13–O15 outside the requirements table.** The separating blank line was removed; the additions now continue the header-backed requirements table. Independently checked the complete table: resolved.

The additional `admission.project_id` schema field is required, bounded and present as a visible null in the draft skeleton. The primary design states that manager-authored admission binds the native immutable project ID and downstream records inherit it through their assignment; worker preflight rejects a moved project. This supplies the retained assignment context that a worker without DynamoDB access needs, while work-ticket YAML cannot choose the native project. Existing assignment/digest/actor checks continue to apply. This is a coherent contract extension, not a worker-monitoring or launch-deduplication feature.

## Seven-principle assessment

- **Intuitive:** One installation and native project identity match the company model; boards remain views. Familiar health states are helpful, but disabled now requires observed scheduler agreement and failed stop is explicit.
- **Discoverable:** Primary design, product requirements, direct evidence links and reason codes provide both entry-level guidance and exact semantics. The new requirements render in the existing table. The future operator runbook and configuration examples are explicitly delivery obligations, not falsely present functionality.
- **Delightful experience:** Adding a project changes one configuration; no per-board deployment, repeated provisioning or worker polling is introduced. Stop failure receives a degraded headline and nonzero result, avoiding hidden contradictory evidence.
- **Token saver:** Deterministic summaries, bounded reasons, stable IDs and direct log/alarm links let agents inspect health with one read-only operation. Human detail remains available. No essential failure or held work is suppressed to save output.
- **Secure:** Runtime/customer-data boundaries, sanitized logs, customer SNS ownership, no automatic remediation and no added worker credentials preserve authority. Cross-project prerequisites cannot extend configured access; uncertain scope holds. Read-only health does not gain write permission.
- **Agents are equal:** Readable and JSON interfaces share states and evidence; explicit exit results enable noninteractive operation. Shared revision binding and mismatch precedence let structured consumers use the same semantics as humans.
- **Dependable:** Retained identities, isolated versus shared holds, honest measured-capacity claims and explicit installed acceptance preserve existing safety. Freshness and failure evidence are well separated from work waiting. The corrected stop and revision definitions close the initially ambiguous operational claims.

Unified configuration is maintained: resources and outputs derive from customer intent, secrets remain references, no second monitoring database is introduced, and operator desired state is distinct from observed deployment state.

## Scope and remaining gates

The company/multi-project and health additions fit the parent-supplied owner decisions. No worker monitoring, launch deduplication, activation or implementation is approved by this review. The measured capacity follow-on is appropriately deferred.

The coverage file still describes the historical 50-requirement/20-Story plan and omits O13–O15; the product README explicitly says that earlier review is historical and the updated set requires review. Update coverage and cases during the next authorized grooming step, then obtain fresh plan review. I do not treat unfinished grooming as an additional design defect or claim the old plan covers the addition.

## SHA256 manifest of changed files reviewed

```
c3561141fddb0865716779add8e440f63173bbb914e00341ac2719e9b0270e06  docs/architecture/pig-boss-operations.md
c06a42067e351de808cf33d9ea07a3e0f521eac6de84d46f5f733bbb90db7c34  docs/product/manager.md
f811278447abb57df71b08aa55235f2d05a3a743c209d322a0a0fd48cfe4af56  docs/product/installation.md
aa3882b489b26830bd2f5bd1144f9999ce3a44bf162ef82edf9aec952b131cbc  docs/product/README.md
9e769723ef0a26f4fc8d1d26642113a0a9747c7c5068fb0f152495f1decb5224  ARCHITECTURE.md
4e3994af7a91c8e7995c5431ddd8284026974d1d7e052d220e06039f36a36a20  README.md
7da86eb9edf0c24ebc2be377e46a915c97ba15ba5fb93431a808104b783b932f  docs/architecture/manager-discovery-closure.md
24039aab0a3f2ac2f5c6b2dd7686eb4f62cb0279c31eedb79b78eecf43168225  docs/architecture/manager-handoff-contract.md
291a2ba19e622eae72bc8f8ae4b47a3365db813a2f2c913bb2658285b0aac1ab  docs/architecture/manager-release-one.md
4a9bf69275b5485585f140de866831e491270db468897c461b6caef91d87d669  docs/architecture/manager-scenarios.md
dfbe6003e7a50a9452a449dd409cfc5425948dfa2a24b7127f8d041dc87084b3  docs/architecture/manager-state.md
5e31481e94906c3eb46e024c23388d5355cd022dcbfebe9c584d0d762835fc5f  docs/architecture/manager-work-contract.md
5d99b51a806a12d4ddeb8e56699b4bce2588121806afd37015e9e9813767df4c  docs/architecture/contracts/pigboard-handoff-v1.schema.json
788dc07a489c2a4fce2d83a4eb7f342d41b264bef95cb26b4c116180f45c214c  docs/architecture/examples/handoffs/admission.yaml
```


---

## Final corrected-artifact design and plan review — product lens

15 November 2026. Freshly verified artifact revision `5df7e2ff4202ccc409b9b2880163aa3b010d0561`, checkout `/private/tmp/pigboard-product-requirements-20261114`.

**Final design verdict: CLEAN. Final complete delivery-plan verdict: CLEAN.** These explicit corrected-artifact verdicts carry forward the completed independent product design/plan reviews and the full committed-change review, and include the bounded health-precedence correction independently reviewed at `5df7e2f`. They do not invent a prior approval or claim that an earlier manifest covered changed bytes. Earlier manifests/verdicts remain historical; this manifest identifies the current reviewed content. No unresolved confirmed in-scope product/design/plan finding remains.

**Correction and evidence.** The Codex health-precedence finding is fixed in `docs/architecture/pig-boss-operations.md:84–109`: first-match evaluation defines unknown → schedule-mismatch degraded → intentional disabled → stale → current degraded → starting → healthy. Lines 84–85 preserve secondary reasons; lines 95–107 prevent a recent failed attempt resetting stale age and define `age > freshness`, including equality. The unknown/read-failure distinction is explicit at lines 87–89. Existing exit codes and safe-stop/drain remain at lines 111–116. The former overlapping-state descriptions now have one governing evaluation order.

The corresponding plan correction is complete at `docs/delivery/manager-r1/stories.md:1608–1619`: existing R1-22-H02 explicitly maps TAC2 and includes disabled+old success, expired success+recent failure, failed first attempt before/after expiry, mismatch+stale, unreadable telemetry+disabled intent and exact-boundary fixtures. Ordered actions and expected results match the design and structured draft. This is a correction within existing O14/R1-22 scope, not an added monitoring feature or implementation authorization.

**Coverage.** Current verification examined **7/7 artifact files** in the manifest, **4/4 files in the health correction**, **7/7 ordered health predicates**, **6/6 overlap fixture groups** and **1/1 changed case**. The earlier complete review covered **53/53 product requirements, 23/23 Stories, 104/104 cases, 41/41 original scenarios and 154/154 Story AC/TAC IDs**. This addendum reuses that examined unchanged surface rather than claiming a fresh full design/discovery restart. A new comparison confirms 23 Stories/104 cases, **88/88 original case objects unchanged**, and all 154 criteria still mapped. Only R1-22-H02 changed in the health correction; all other case objects, dependencies, forecasts and scope remain as reviewed. The two coverage documents correctly distinguish the historical 50-requirement baseline from current 53-requirement/23-Story review, and the README preserves final owner review and unrun installed acceptance.

**Native publication.** The fresh `/private/tmp/pigboss-health-readback.json` is the evidence for PGB-100; its prior snapshot is historical. I re-parsed the complete native YAML and compared it with current R1-22 after native prerequisite-key substitution only: exact match. Its raw YAML-byte hash is `fb0dd808087587f435fab43c39f0075c0227a92dd2339e6a329a79926265565f`, matching publication.json. The current whole draft-file hash also matches the receipt. The other 22 structured Story contracts are unchanged; earlier exact native-body and 54-edge audits remain applicable to them. This is captured publication fidelity, not live product acceptance.

**Second sweep complete:** **7/7 files**, **7/7 predicates**, **6/6 fixture groups**, native R1-22 equality/hash and preserved full-set boundaries were rechecked. Traced unknown versus known absence; intentional stop versus old data; failure versus stale age; failed first attempts before/after expiry; scheduler mismatch versus staleness; exact freshness equality; secondary reasons; no mutations; and the pending owner/installed-acceptance gates. No further confirmed issue found.

**Seven principles, assessed for both corrected design and plan:**

- **Intuitive:** each familiar health word now has a predictable primary result; intentional stop does not look like expired scheduling.
- **Discoverable:** the ordered table, explicit overlap fixtures, secondary reasons and direct review links expose the decision and its evidence.
- **Delightful experience:** operators need not resolve competing state definitions or repeat completed review/setup; recovery remains scoped and safe.
- **Token saver:** a single primary state is concise while secondary failures and complete acceptance instructions remain available.
- **Secure:** unreadable required evidence wins as unknown; no healthy/safe-stop assurance is inferred, and no new credentials, write path or authority is introduced.
- **Agents are equal:** readable and JSON consumers share exact precedence, boundary and exit semantics; structured cases retain explicit human ownership without invented automated passes.
- **Dependable:** failed attempts cannot refresh stale successful evidence; old revisions and uncertain outcomes remain distinct, and current versus historical review/publication evidence is explicitly identified.

Current SHA256 manifest, each verified against the file bytes at `5df7e2ff4202ccc409b9b2880163aa3b010d0561`:

```text
c0ba36250e3a82010e7510c66c62d66299812289ebb71e1b1bb3f62eea727958  docs/architecture/pig-boss-operations.md
c649cf9d308412972b1de61e50f529af18c58009fea94f1b11db3985f049b1ab  docs/delivery/manager-r1/ticket-drafts.json
9ba1c820d34fecc9ad448139a19f22bc89f745a39bd8c37f0bdc3db1dfbefc9d  docs/delivery/manager-r1/stories.md
8a71d9280604d39f61896656d25ecb62acbf1d490c280b627434ccf8f142a7ed  docs/delivery/manager-r1/publication.json
d07a75dc39c74def146621ecd2bad48828aff0728113528798b995009ada6aa4  docs/product/coverage.md
0b43de1edfd8028de21a14f001068f52cddfba3409571039ac939d1c4c7e71e3  docs/delivery/manager-r1/coverage.md
e9911eb1464caeed26dfc53d61c90ee47dab9b6752dcdcc9cb7a7d43a71a5e4b  docs/delivery/manager-r1/README.md
```

No repository edit or provider mutation was performed by this reviewer. These final design/plan CLEAN verdicts do not approve the Story set on the owner's behalf, prove implemented/runtime behavior, satisfy current-head CI/Codex review, or authorize merge, deployment, delivery activation or release. Installed AWS/worker acceptance remains separate and unrun.


---

## Startup alarm and publication correction — final product review

15 November 2026. **Design: CLEAN. Complete delivery plan: CLEAN. Committed change: PASS (CLEAN)** for exact revision `791c83ebb43a4015ceb5c192b61f89389c8015a5`, reviewed against `527fd83984459316be4a529b30898eae319e4dcb`. Independent product/experience lens with correctness, authority, failure/recovery and verification assessment. No unresolved confirmed in-scope finding.

These verdicts reuse the completed full product design/plan and committed-change reviews, including the independently reviewed coverage and health-precedence corrections. This bounded review assesses both new Codex findings and every affected artifact; it does not pretend the previous manifests covered changed bytes. Earlier manifests remain historical. No scope expansion or runtime implementation occurs.

| Review criterion | Result | Evidence |
| --- | --- | --- |
| Jira requirements | PASS | Both corrections support PGB-93's reconciled basic-health design; R1-23/PGB-101 retains the same alarm-lifecycle outcome. |
| Scope and design | PASS | Four files change: operating design, readable Stories, structured drafts and publication receipt. Existing health/alarm scope, 23 Stories and 104 cases remain. |
| Security and review integrity | PASS | Startup masking is alarm input only, never fabricated completion; normal failures/retries cannot renew grace. Old design_commit is explicitly historical, with current content-addressed design bindings. |
| Compatibility and regressions | PASS | Only R1-23-H02 changes in the structured plan. All 88 baseline cases and other 103 current cases are unchanged; dependencies and forecasts remain as reviewed. |
| Reliability and operations | PASS | Missing-completion grace has a fixed revision-bound deadline and eventual external detection without a worker/timer. Real error/throttle alarms remain active; conservative extra notification delay is explicitly documented. |
| Tests and verification | PASS | H02 covers enable/revision startup, freshness boundaries, never-started runtime and no fabricated completion. All 154 criteria remain mapped; 23 native YAML trees/hashes and current receipt bindings independently match. |
| Repository fit and maintainability | PASS | Reuses metric math and existing R1-23 lifecycle acceptance; no extra worker, operational store or duplicated configuration. |
| Documentation and usability | PASS | Human/agent health remains truthful during alarm grace; the delay tradeoff and installed-acceptance limitation are visible. Current design identity can be verified from the receipt. |

**Startup finding resolved.** `docs/architecture/pig-boss-operations.md:137–157` now specifies cadence periods and `ceil(freshness / cadence)` consecutive breaches, with a fixed startup-deadline mask. The time-series expression produces a non-breaching alarm input through enablement+freshness, then evaluates actual current-revision presence with absence filled as zero. This prevents the new revision's missing history from immediately alarming, while an installation that never runs eventually alarms without another worker enabling detection. Explicit activation/upgrade binds the timestamp after resources are ready; scans, failures and retries cannot extend it. Real error/throttle alarms are not masked. No value is published as synthetic scan completion or used to satisfy the health command.

The design deliberately permits roughly another freshness window after grace before first-absence notification, plus period alignment/evaluation/ingestion delay. This is an explicit operating tradeoff awaiting the existing final owner review, not an exact alert SLA. The CLI's existing freshness result remains independent. The metric-math composition is consistent with documented non-sparse TIME_SERIES/EPOCH, IF branching and FILL semantics; this verifies the design basis, not deployed behavior. [AWS CloudWatch metric math](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html). Installed acceptance still measures actual alarm and notification timing.

**Plan correction resolved.** `docs/delivery/manager-r1/stories.md:1688–1699` and structured R1-23-H02 add TAC2 mapping, controlled-clock startup/revision/boundary/never-start histories, evaluation without a scan/timer, and explicit expected no-false-alert/eventual-detection behavior. Markdown and structured inputs/actions/results agree. The original lifecycle/retained-resource expectations remain. The previously reviewed health precedence and R1-22-H02 are unchanged.

**Publication-identity finding resolved.** publication.json removes the misleading current design_commit and retains its value as baseline_design_commit. Its three reviewed_design_artifacts hashes match the current operating design and unchanged manager/installation product requirements. The whole draft-file hash matches current bytes. The final seven-file manifest below identifies the complete affected review artifact.

**Coverage and publication.** Examined **4/4 changed files**, **2/2 correction obligations**, **1/1 changed acceptance case**, **3/3 current design-artifact bindings**, and **7/7 final manifest files**. Earlier full coverage remains applicable to the unchanged surface: **53/53 product requirements, 23/23 Stories, 104/104 cases, 41/41 scenarios and 154/154 Story AC/TAC IDs**. A fresh comparison confirms **88/88 baseline case objects unchanged** and all 154 criteria still mapped.

Independently recomposed native readback from `/private/tmp/pigboss-health-readback.json` for PGB-100, `/private/tmp/pigboss-alarm-readback.json` for PGB-101 and the earlier captured readback for the other 21 unchanged Stories. **23/23 complete YAML trees match** current drafts after native prerequisite substitution only, and **23/23 exact YAML-byte hashes match** publication.json. PGB-101's corrected body hash is `c23004365602128a66db5ce08e2bab0416bccc9cc2fcc798f8ea9b6f1c8eb5dc`. Every captured Story preserves parent PGB-66, To Do, owner-review-required and no AI worker label. No new dependency edge is introduced; earlier 54-edge evidence remains applicable. This is captured publication fidelity, not a claim of separately retrieved current live execution state.

**Second sweep completed:** **4/4 changed files, 7/7 final artifact files, 2/2 findings and 23/23 recomposed publications**. Rechecked startup/revision grace before/at/after expiry, period-count rounding, never-run detection without a timer, no synthetic completion, failures unable to renew grace, unmasked real errors, current versus baseline design references, both revised native contracts, unchanged case/requirement coverage, and pending owner/installed/activation gates. No additional confirmed issue.

Seven-principle assessment for the corrected design, plan and committed artifact:

- **Intuitive:** startup no longer raises a missing-scan alert before its stated grace; healthy execution and alarm masking remain separate.
- **Discoverable:** fixed deadline, missing-data rule, lifecycle case and current design hashes expose exactly what was reviewed and what the operator should expect.
- **Delightful experience:** avoids normal-startup/revision false alerts without requiring another manual enable step or background worker.
- **Token saver:** one deterministic alarm expression and existing case cover the lifecycle; complete failure/delay evidence remains explicit.
- **Secure:** no invented completion, write retry, recovery authority or extra credential-bearing service is introduced; activation stays under existing authority.
- **Agents are equal:** structured case/receipt and readable design expose the same grace, actual evidence and delay tradeoff; no agent can mistake alarm grace for successful execution.
- **Dependable:** never-started runtime is externally detectable, normal failures cannot extend grace, prior artifact identity is labeled historical, and exact current hashes/native bodies are verified.

Current SHA256 manifest at `791c83ebb43a4015ceb5c192b61f89389c8015a5`:

```text
a1442dbd4c04669e4564e0d170bf05cc9b12e2c00ea76efafc6d740a3aa9aa03  docs/architecture/pig-boss-operations.md
df8b5234321d831af2acc825e4eb6490ab1252af3fbb8ea0baa614dcde51bec3  docs/delivery/manager-r1/ticket-drafts.json
0bd5ed587eda4be9213c8209fa640e830b6b557b6836948ff3fa574d32466638  docs/delivery/manager-r1/stories.md
daec13a88c6463d94ebb1f6eb1d0c2e832948461481080ab723946a11030d038  docs/delivery/manager-r1/publication.json
d07a75dc39c74def146621ecd2bad48828aff0728113528798b995009ada6aa4  docs/product/coverage.md
0b43de1edfd8028de21a14f001068f52cddfba3409571039ac939d1c4c7e71e3  docs/delivery/manager-r1/coverage.md
e9911eb1464caeed26dfc53d61c90ee47dab9b6752dcdcc9cb7a7d43a71a5e4b  docs/delivery/manager-r1/README.md
```

No repository edits or provider mutations were performed by this reviewer. These exact-artifact CLEAN verdicts do not provide final owner approval, runtime implementation, installed AWS/worker acceptance, current-head hosted CI/Codex, merge, deployment, release or activation authority.
