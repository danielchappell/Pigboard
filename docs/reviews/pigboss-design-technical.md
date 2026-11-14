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
