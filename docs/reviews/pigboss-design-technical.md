# Pig Boss scoped design technical review

Verdict: **NOT CLEAN**. One confirmed in-scope finding. This is an independent design review, not a code, delivery-plan, installation or release review.

Artifact: `/private/tmp/pigboard-product-requirements-20261114`, working-tree delta over `2f747232db156babc329053d2f5448b21b2a5b6a`. Primary artifact `docs/architecture/pig-boss-operations.md` SHA256 `1a8994ca2dda97fb8ffbd664ddb0d7c37d2cd31b9b11a25d5f49a8b5984ce3cf`.

Reviewed against the supplied approved scope: Pig Boss name; project-scoped `(site, immutable project ID, full label)` identity; one customer AWS installation serving several projects; basic manager health; measured 50-project follow-on. Worker monitoring, launch deduplication, implementation and activation remain excluded. Read AGENTS.md and CONTRIBUTING.md before review.

## Coverage

Changed design/document surface: **12/12 files** examined. Full primary document and product documents; scoped changes and their relevant contracts in architecture/navigation:

1. docs/architecture/pig-boss-operations.md
2. docs/product/manager.md
3. docs/product/installation.md
4. docs/product/README.md
5. docs/architecture/manager-state.md
6. docs/architecture/manager-handoff-contract.md
7. docs/architecture/manager-work-contract.md
8. docs/architecture/manager-discovery-closure.md
9. docs/architecture/manager-release-one.md
10. docs/architecture/manager-scenarios.md
11. ARCHITECTURE.md
12. README.md

Supporting surfaces: manager-discovery.md read as historical discovery context; identity/reference definitions in pigboard-handoff-v1.schema.json and full pointer schema inspected. This is not a new audit of every unchanged handoff payload/schema branch.

Requirement groups: **15/15** examined: (1) name/proposed status; (2) installation/site/project ownership; (3) canonical project-specific mappings; (4) composite stream key/cap/ownership; (5) serialized scans and concurrency boundary; (6) native metadata and cross-project prerequisites; (7) retained identity and reconfiguration; (8) portable summary and privacy; (9) complete/incomplete/failed/crash semantics; (10) read-only health states/readable/JSON/exits; (11) cadence/freshness/budget configuration; (12) revision-scoped alarms/missing data/SNS; (13) install/stop/upgrade/removal/readiness; (14) measured 50-project follow-on; (15) local versus installed acceptance and owner authority. Existing M01–M14 and O01–O15 rows were read for compatibility.

Second sweep completed across **12/12 changed files and 15/15 groups**, tracing equal-label collisions, moved/removed work, inaccessible project versus isolated conflict, no-emission, fresh failures, disabled/starting/upgrade, alarm routing and scope exclusions. No additional confirmed in-scope issue.

## Finding

**P2 — Unexpectedly enabled scheduling can be reported safely disabled.** `docs/architecture/pig-boss-operations.md:77–88` defines disabled solely from canonical desired schedule and returns exit 0, while degraded only covers an actual-schedule mismatch from *enabled* intent (line 80). Lines 110–112 disable alarm actions with disabled intent. Consequently, desired disabled + actual enabled can return disabled/exit 0 and have alarm actions off while scans remain scheduled. The command exposes actual state, but its primary result still incorrectly reassures both the operator and an automated health consumer. This directly affects intentional-stop and safe lifecycle behavior, rather than adding monitoring scope.

Require desired/actual schedule mismatch in either direction to take precedence over disabled/starting/healthy and report degraded/nonzero. Reserve disabled/exit 0 for verified desired disabled + actual disabled; unreadable actual state remains unknown. Add the unexpectedly-enabled disabled-intent case to lifecycle acceptance. Diagnostic reporting need not automatically alter the schedule or change desired-state-derived alarm behavior.

Classification: confirmed, in scope. No hypothetical worker-recovery or telemetry infrastructure addition is requested.

## Seven-principle assessment

- **Intuitive:** one installation and familiar health words fit ordinary operations. The disabled-state finding currently violates the everyday expectation that disabled means stopped.
- **Discoverable:** readable/JSON output, evidence timestamps, direct log/alarm links and bounded reason codes identify the next inspection for both people and agents. Actual scheduler mismatch must affect the primary result as described above.
- **Delightful experience:** one canonical setup, project-specific mappings and no per-board deployment avoid repeated setup. Console/command-only notification behavior without SNS is explicit rather than a hidden failure.
- **Token saver:** deterministic summaries, stable references and bounded dimensions avoid worker polling; work holds remain visible rather than suppressing important detail.
- **Secure:** native metadata and configured allowlists remain authority; YAML cannot grant scope. Customer-owned logs omit bodies/secrets/raw errors, and health is read-only. The misleading stop result is an operational safety gap, addressed by the finding without automatic repair.
- **Agents are equal:** structured states, exit codes, stable project IDs and explicit unknown results support noninteractive operators; human prose and evidence links expose the same facts. Exit 0 for a mismatched disabled state currently undermines that equality.
- **Dependable:** complete scans distinguish ordinary holds from failed/incomplete discovery; no completion is externally observable; old revision evidence cannot establish current health; uncertain Jira outcomes retain their holds. The finding is the remaining state-reporting gap. No exact-once launch or unmeasured scaling claim is introduced.

## Additional technical conclusions

The unchanged handoff shape is compatible with project scoping: ticket IDs resolve within the configured site to native project metadata, the full label remains the work-data field, and retained operational records preserve the original composite identity. New editable project fields in YAML would duplicate native authority and are not necessary. Final schema and adapter tests must enforce the described semantic checks; their existence is not claimed here.

Completion summary emission, missing-success alarms, sparse error-data handling, revision separation, bounded dimensions and maximum aggregation address the scoped no-emission/duplicate-log cases at design level. Startup grace and alarm ingestion/evaluation delay remain explicit installed acceptance obligations. Customer routing confirmation is not misrepresented as guaranteed delivery.

Multi-project removal/moves retain holds; cross-project prerequisites do not collapse streams; shared uncertainty stops the scan while isolated complete streams can progress. The 50-project reference workload and follow-on sequencing preserve the first-release boundary. Existing broader plan reviews remain historical; this review does not approve revised Stories or implementation.

## Updated-artifact re-review — final verdict CLEAN

The previous NOT CLEAN verdict and its original schema-preservation conclusion above are historical. The author fixed the schedule mismatch finding and added explicit immutable project binding to generated admission records. I independently inspected the updated artifact and affected contracts. **Final verdict: CLEAN for the scoped design delta below; no unresolved confirmed in-scope finding.** This verdict does not approve the revised delivery plan or implementation.

Exact updated primary SHA256: `c3561141fddb0865716779add8e440f63173bbb914e00341ac2719e9b0270e06` (`pig-boss-operations.md`). Additional reviewed changed files:

- `contracts/pigboard-handoff-v1.schema.json`: `5d99b51a806a12d4ddeb8e56699b4bce2588121806afd37015e9e9813767df4c`
- `examples/handoffs/admission.yaml`: `788dc07a489c2a4fce2d83a4eb7f342d41b264bef95cb26b4c116180f45c214c`

These paths are under `docs/architecture/`. Base HEAD remains `2f747232db156babc329053d2f5448b21b2a5b6a`.

Expanded changed-file denominator: **14/14 examined** (the preceding 12 plus the admission schema delta and complete admission skeleton). Re-ran the affected contract/state walkthrough and a second missed-finding sweep across **14/14 changed files and 15/15 requirement groups**. Schema payload identity/reference sections, the added required property, generated skeleton and project-move semantics were explicitly cross-checked. The full unchanged schema branches are outside this scoped audit.

Finding resolution: lines 77–89 now reserve disabled for observed stopped scheduling, classify either mismatch direction degraded, require mismatch precedence and return exit 1 for a failed stop; stopped/drained execution must be confirmed through the existing stop procedure. This resolves the reported failure for both human and noninteractive health consumers without adding automatic recovery.

Additional changes reviewed: the shared evidence revision binds package/code, configuration digest and enablement generation; configuration-only changes rotate it, and summaries/command/alarms use the same identity. Old evidence therefore cannot conceal a new configuration's missing scans. The manager-generated admission `project_id` is required in schema and visible in the preparation skeleton. Downstream results inherit original identity through their immutable assignment reference; worker preflight rejects a moved native project. The new field is not an author-supplied project authority or an installed compatibility claim. Retained operational records still preserve original site/project identity and hold unresolved moves/removal. No state migration engine or runtime feature implementation is introduced by these design edits.

Final seven-principle assessment: intuitive—disabled now matches stopped operation; discoverable—primary state and supporting evidence agree; delightful—one configuration and clear stop diagnosis avoid repeated setup or misleading success; token saver—summary and revision reuse remain bounded without suppressing failure; secure—read-only inspection and native identity authority remain intact, with explicit original-project checks; agents are equal—JSON/exit semantics convey the same mismatch as the human output; dependable—retained identity, revision-scoped freshness, no-emission alarms and stop/upgrade semantics preserve honest states. Each updated area is covered by the stated local and installed acceptance obligations; none is claimed tested in a deployed package here.


---

## Final design and delivery-plan correction addendum — 15 November 2026

**Final technical design verdict: CLEAN. Final technical delivery-plan verdict: CLEAN.** These verdicts cover the final artifacts at `5df7e2ff4202ccc409b9b2880163aa3b010d0561`, including the health-precedence correction. They record the design and plan conclusions of this reviewer's already completed bounded review, now with the current manifest; they do not invent a prior approval or substitute for the other independent reviewer or final owner review. Earlier manifests and verdicts remain historical evidence.

Reused evidence: this independent reviewer examined **26/26 changed files, 53/53 product requirements, 23/23 Stories, 104/104 cases, 41/41 scenarios and 54/54 native links** at `6f6c6e3`, then reviewed the exact two-file coverage correction at `4ded278` and the exact four-file health correction at `5df7e2f`. Full detail is retained in `/private/tmp/pigboss-commit-technical.md`. This addendum carries that unchanged coverage and explicitly finalizes the affected design/plan artifact identity; it is not a claim that a second full review was run today.

The health-precedence finding is fixed at `docs/architecture/pig-boss-operations.md:84–109`: explicit first-match evaluation is unknown, scheduler mismatch/degraded, intentional disabled, stale, current failure/capacity/alarm/degraded, starting, healthy. Secondary reasons stay visible. Lines 95–107 establish that recent failure cannot reset freshness and only `age > freshness` expires the window; equality remains within it. This resolves disabled-plus-old-data, expired-success-plus-recent-failure and failed-first-scan overlaps without changing read-only authority or safe-stop/drain requirements.

The matching plan correction is `docs/delivery/manager-r1/stories.md:1608–1619` and structured R1-22-H02: overlap fixtures, exact-boundary expectations and TAC2 coverage agree with the design. The case count remains 104, all 88 baseline cases remain unchanged, and only this new-scope case changes. The other 22 Story contracts, dependencies, estimates and scope remain unchanged. PGB-100's new `/private/tmp/pigboss-health-readback.json` exactly matches the corrected contract after native prerequisite substitution; its prior snapshot is historical. Parent/status/owner-review/no-worker-label boundaries remain preserved.

**Current verification and second sweep:** **7/7 manifest files** checked against their exact committed bytes; **4/4 health-fix files** and all **7/7 decision branches** rechecked for affected consistency; **23/23** schema/format checks pass, **104/104** unique cases remain, and the new native health contract matches. Coverage guides and delivery README consistently distinguish historical 50-requirement reviews from current 53-requirement/23-Story reviews and pending owner/installed gates; their local links resolve. The earlier second sweep covered all four changed files, overlap/boundary/exits/secondary reasons and the native receipt. Today's final manifest/consistency sweep found no new finding or omitted affected surface.

Seven principles, assessed for both the final design and its corrected plan:

- **Intuitive:** intentional stop, startup, current failure and expired success now produce predictable primary states.
- **Discoverable:** the ordered table, overlap examples, complete acceptance case and linked review records explain the result to humans and agents.
- **Delightful experience:** consistent diagnoses avoid repeated investigation or unnecessary repeat reviews; one customer configuration remains the operating model.
- **Token saver:** one primary state retains all material secondary reasons and exact evidence references rather than dropping failure detail.
- **Secure:** failed or invalid reads cannot produce misleading success; health remains read-only and grants no recovery, retry or activation authority.
- **Agents are equal:** CLI, JSON and human guidance share the same order, exit semantics and exact freshness boundary; prescribed cases retain explicit human ownership.
- **Dependable:** recent failure cannot erase stale success; known absence differs from unreadable evidence; uncertain work remains held and pending owner/installed gates stay visible.

Current SHA256 manifest, superseding earlier hashes only for these final artifacts:

```text
c0ba36250e3a82010e7510c66c62d66299812289ebb71e1b1bb3f62eea727958  docs/architecture/pig-boss-operations.md
c649cf9d308412972b1de61e50f529af18c58009fea94f1b11db3985f049b1ab  docs/delivery/manager-r1/ticket-drafts.json
9ba1c820d34fecc9ad448139a19f22bc89f745a39bd8c37f0bdc3db1dfbefc9d  docs/delivery/manager-r1/stories.md
8a71d9280604d39f61896656d25ecb62acbf1d490c280b627434ccf8f142a7ed  docs/delivery/manager-r1/publication.json
d07a75dc39c74def146621ecd2bad48828aff0728113528798b995009ada6aa4  docs/product/coverage.md
0b43de1edfd8028de21a14f001068f52cddfba3409571039ac939d1c4c7e71e3  docs/delivery/manager-r1/coverage.md
e9911eb1464caeed26dfc53d61c90ee47dab9b6752dcdcc9cb7a7d43a71a5e4b  docs/delivery/manager-r1/README.md
```

No unresolved confirmed in-scope finding remains for these exact design/plan artifacts. No runtime implementation, installed AWS/Jira health acceptance, current delivery configuration, CI/Codex merge gate, owner approval, merge/release or activation is established by these verdicts.


---

## Startup alarm and current-design binding correction — technical review

15 November 2026. **Final technical design verdict: CLEAN. Final technical delivery-plan verdict: CLEAN. Committed-change verdict: PASS (CLEAN)** for `791c83ebb43a4015ceb5c192b61f89389c8015a5` against `527fd83984459316be4a529b30898eae319e4dcb`. No confirmed unresolved in-scope finding. These are bounded corrections within PGB-93's proposed manager health/review-evidence scope, with no runtime implementation or activation.

**Coverage:** **4/4 changed files**, the entire affected alarm/lifecycle design section, **1/1 changed case** (R1-23-H02), **3/3 current design-content bindings** and **7/7 final manifest files** examined. Earlier complete coverage of 26/26 files, 53/53 requirements, 23/23 Stories, 104/104 cases, 41/41 original scenarios and 54/54 dependency links is carried from this reviewer's recorded exact-revision reviews for unchanged content. This review does not claim another full discovery/review restart or invent prior approval.

**Design correction.** `docs/architecture/pig-boss-operations.md:137–157` prevents immediate missing-completion alarms on enablement or a new revision. The alarm uses scan cadence periods, `ceil(freshness / cadence)` consecutive breaches, and an expression that returns a non-breaching alarm input through the revision's fixed startup deadline before checking actual completion presence. The mask is not published as a real completion and cannot satisfy the health command. Explicit activation occurs after resources are ready; failures, normal scans and retries cannot extend the deadline. After startup, continued absence is detected externally even if the manager never ran, without a later worker/timer enabling detection. Real error/throttle alarms remain effective.

The reference composition is consistent with AWS's documented time-series `TIME_SERIES`, `EPOCH`, `IF` and `FILL` behavior. The documented FILL caveat for delayed newest data does not establish a defect in the prescribed consecutive-period rule; actual timing and ingestion remain installed acceptance obligations. [AWS metric math](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html)

The conservative rule can require a further freshness window after initial grace if no first scan occurs; the design explicitly discloses that tradeoff, plus alignment/evaluation/ingestion delay, and claims no exact detection SLA. I checked a local deterministic no-emission example with cadence 300 seconds/freshness 900: no alarm through the deadline, three post-grace zero periods then alarm. This is arithmetic confirmation of the intended rule, not CloudWatch execution or provider acceptance.

**Plan correction.** Existing R1-23-H02 at `docs/delivery/manager-r1/stories.md:1688–1699` now maps TAC2 and prescribes enable/config-only rotation, before/at/after expiry, never-started installation, no worker/timer assistance, no fake completion, non-resetting grace and effective real error alarms. Readable and structured cases agree. Only R1-23-H02 changes relative to the prior contract; the other 22 Story contracts are unchanged. All 104 cases remain, all 88 baseline case objects remain exact and all 154 AC/TAC identifiers retain coverage. Scope, dependencies and forecasts are unchanged.

**Publication correction.** `publication.json` now labels `ba9cb49...` as `baseline_design_commit`, and separately binds the current operations/product-manager/product-installation artifacts by their actual SHA256 values. All **3/3 hashes match**. The reviewed draft-file hash also matches. Thus the receipt no longer represents the historical baseline commit as the current reviewed design.

I independently checked all **23/23 current native YAML contracts and their raw YAML-byte hashes**: PGB-100 uses `/private/tmp/pigboss-health-readback.json`, PGB-101 uses `/private/tmp/pigboss-alarm-readback.json`, and the other 21 use their unchanged captured readbacks. Complete native objects equal current drafts after prerequisite-key substitution only. All retain PGB-66 parent, To Do status, owner-review-required and no AI worker labels. These are checked captured publication records, not fresh live execution or current installed configuration.

**Verification and second sweep:** all **23/23 schema/format checks** pass; **104/104** unique cases, **88/88** original cases and **154/154** criterion mappings are preserved. Rechecked **4/4 fix files**, fixed-deadline/revision ownership, grace versus real completion, never-run detection, current error alarms, documented delay, native receipt and current design hashes. Final manifest/link checks and `git diff --check` pass. No new finding or omitted affected surface. The initial diagnostic normalized old YAML before hashing; I corrected it to check the actual stored YAML bytes, and all 23 receipt hashes match. This diagnostic adjustment was not a product defect.

| Merge criterion | Result | Correction evidence |
| --- | --- | --- |
| Jira requirements | PASS | Startup/revision behavior and truthful review bindings complete the existing PGB-93 health/evidence scope; owner review stays pending. |
| Scope and design | PASS | Uses customer CloudWatch alarm evaluation and the existing health contract, without a timer service, synthetic completion or runtime build. |
| Security and review integrity | PASS | Grace grants no write/recovery authority; historical design identity is explicit and current content bindings are verified. |
| Compatibility and regressions | PASS | Only one new-scope case changes; 88 baseline cases and all other 22 Story contracts remain exact. |
| Reliability and operations | PASS | Startup grace cannot be extended by failure; a never-running manager is still detected externally; the conservative extra delay is explicit. |
| Tests and verification | PASS | Controlled-clock expectations are complete; schema/native/hash/preservation/link checks pass, with installed AWS timing still unrun. |
| Repository fit and maintainability | PASS | Extends the existing canonical package/health contract and case; no extra database, scheduler worker or competing configuration is added. |
| Documentation and usability | PASS | Startup behavior, delay and evidence identity are readable and structured; humans and agents receive the same limits. |

Seven principles, assessed for corrected design and plan:

- **Intuitive:** intentional enablement/revision startup avoids a premature missing-scan alert while true errors remain visible.
- **Discoverable:** fixed deadline, consecutive periods, eventual detection and acceptance instructions explain how and when evidence is evaluated.
- **Delightful experience:** startup noise is reduced without a manual follow-up action or another service to operate.
- **Token saver:** deterministic AWS evaluation and content-addressed review evidence avoid polling and rediscovery; the detection-delay tradeoff remains explicit.
- **Secure:** the mask cannot fabricate a completion, reset on failures or gain consequential authority; customer-owned routing and read-only health boundaries remain.
- **Agents are equal:** readable and structured cases preserve the same startup/revision rules and precise evidence hashes; human-owned acceptance is not invented as an automated pass.
- **Dependable:** absence remains externally detectable when Pig Boss never executes, old revisions cannot satisfy current evidence, and historical/current review identities and pending installed/owner gates remain distinct.

Final current-artifact SHA256 manifest, superseding prior hashes only for these artifacts at `791c83ebb43a4015ceb5c192b61f89389c8015a5`:

```text
a1442dbd4c04669e4564e0d170bf05cc9b12e2c00ea76efafc6d740a3aa9aa03  docs/architecture/pig-boss-operations.md
df8b5234321d831af2acc825e4eb6490ab1252af3fbb8ea0baa614dcde51bec3  docs/delivery/manager-r1/ticket-drafts.json
0bd5ed587eda4be9213c8209fa640e830b6b557b6836948ff3fa574d32466638  docs/delivery/manager-r1/stories.md
daec13a88c6463d94ebb1f6eb1d0c2e832948461481080ab723946a11030d038  docs/delivery/manager-r1/publication.json
d07a75dc39c74def146621ecd2bad48828aff0728113528798b995009ada6aa4  docs/product/coverage.md
0b43de1edfd8028de21a14f001068f52cddfba3409571039ac939d1c4c7e71e3  docs/delivery/manager-r1/coverage.md
e9911eb1464caeed26dfc53d61c90ee47dab9b6752dcdcc9cb7a7d43a71a5e4b  docs/delivery/manager-r1/README.md
```

No repository edit or provider mutation was performed by this reviewer. These verdicts do not establish runtime implementation, installed alarm/worker acceptance, current-head CI/Codex approval, owner approval, merge/release or activation. Earlier evidence and manifests remain historical rather than being rewritten.
