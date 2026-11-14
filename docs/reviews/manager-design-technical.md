# Independent technical review — combined first-manager design

14 November 2026. Lens: correctness, authority/security, state consistency, failure/recovery and verification. This is an independent review, not an author assessment, implementation approval or release gate.

## Exact verdicts

**Current six-document product consolidation: CLEAN. Current combined 16-document design: CLEAN for grooming.** No unresolved in-scope finding remains in the exact working artifact identified by the SHA-256 manifest below. The artifact includes uncommitted D03 changes on top of `8e41d93`, so its identity is the manifest, not that commit alone.

The owner's D01 (human-only QA), D02 (all manager transitions pause) and D03 (separate human-invoked `request-rework` skill) are represented consistently. The earlier deployment-receipt contradiction T1 has been corrected and independently re-reviewed. The previously open producer choice K1 is resolved by D03 and the new bounded human-rework contract.

CLEAN here closes this reviewer's design gate for grooming the complete Story set. It does not mean the complete delivery plan is reviewed, ready Stories exist, implementation is authorized, installed acceptance passed, or merge/activation is authorized. The six-document committed product artifact at `8e41d93` was also examined; its current working-tree D03 additions are included in this final verdict.

## Coverage and method

Examined **16/16 requested documents** (the original fifteen plus `manager-human-rework.md`), **50/50 requirements** (A01–A12, W01–W12, M01–M14, O01–O12), and **41/41 scenarios** (S01–S41). Examined the **4/4 selected schemas** (Epic, ticket, handoff, pointer), **13/13 selected YAML examples** (four Epic/ticket skeleton/populated examples and all nine handoff skeletons), and the local schema-check script. The synthetic `manager-probe.yaml` is a separate provider-probe input, not a production Epic/ticket example in that denominator.

Cross-checked current writer, implementer, reviewer and QA entrypoint instructions, bundle manifest, preparation script and saved automation/setup evidence to identify the actual compatibility changes. Current skills still reject Bugs or use direct rework-to-In-Progress paths; the product explicitly includes their coordinated replacement. Their existing behavior is not being misrepresented as already compatible.

Read the supplied bounded-proof report, closure contract, MCP compatibility JSON and both provider-evidence audit reports. These remain supporting evidence, not substituted for this review. No external writes, resource deployment, dependency installation or worker invocation occurred.

A second sweep revisited every document/requirement/scenario and all five acceptance bullets, five sequence steps and responsibility/authority clauses of the new human-rework contract, then specifically challenged: Human Review release versus return-capacity; paused queue-only operations; retained membership after relabelling/removal; state begin/finalize atomics; uncertain writes and reconciliation; human-only QA; publication/parser/digest boundaries; repeated repair roots; actual Cursor versus Codex/REST evidence; and current source-versus-future release claims. No additional confirmed in-scope finding emerged.

## Findings closed on the current artifact

### T1 — former P2 deployment-receipt inconsistency: RESOLVED

The previous schema guide and skeleton required a deployed-revision receipt for both environment sources before any QA. Re-read the actual correction in `manager-work-schema.md:63–71` and `examples/manager-ticket.yaml:39–42`. Environment-dependent execution still requires the pipeline's current deployment receipt. A human-only plan can name current PR artifacts under `configured_target`, with no fabricated deployment. QA reports zero AI cases and pending human cases; humans own preflight/evidence for their later environment-dependent cases. This matches W06/W08 and D01 without adding a schema variant, integration or QA engine.

Verified the actual existing ticket schema accepts a complete all-human non-runtime configured target with empty required capabilities while continuing to reject empty human cases or a missing no-AI reason. This is structural verification; no deployment or human test was performed.

### K1 — previous human repair-entry decision: RESOLVED by owner D03

Read the full new `manager-human-rework.md` and rechecked its product/closure/scenario references. `request-rework` is a separate skill invoked by a human through their existing assistant. It reads current Human Review status, assignment and complete QA/review/implementation evidence; checks unchanged scope/revision and the still-open assigned PR; produces the existing typed `human_request` repair record; verifies publication; rechecks facts; and sends one configured Human Review → Rework Queued transition. It leaves active B alone and lets the manager admit A later under ordinary priority/capacity rules.

The record uses the existing configured trusted actor mapping and handoff envelope. It does not acquire DDB access, replace the pointer, infer authority from discussion, implement fixes, unblock, create Bugs, or add a new automatic worker/service/identity. Scope growth, closed PRs, changed facts, missing access or evidence stop before queueing. Existing queued work is inspected rather than transitioned again, prior findings remain available, and unknown effects are reported without replay. Repeated invocations do not acquire an exactly-once promise.

Its five required acceptance bullets cover success while another ticket is active, no writes for discussion, invalid/missing/conflicting inputs, uncertain transition after publication, and queued-work preservation/authority limits. The implementation Story must include shared validation, bundle installation and readable human/agent examples. This is a coherent complete producer contract for grooming; choosing exact helper/file boundaries is implementation planning, not a new research programme.

The human-unblock producer remains a different explicitly deferred follow-up. No part of D03 silently implements that follow-up.

## Requirement walk

The following records the actual checks, rather than merely counting names. “Consistent” means a coherent design obligation, not implemented or accepted software.

| Requirement | Technical assessment |
| --- | --- |
| A01 | Consistent: preserve existing writer provenance and one-repository/PR, file and time limits; design-only work stays a Task. |
| A02 | Consistent: current bundle includes human-writing and full sibling folders; retain/verify this capability rather than rebuild it. |
| A03 | Consistent: complete editable skeletons and strict start contracts; nulls are not execution authority. |
| A04 | Consistent: Epic order is YAML work data; native identity/status/opt-in stay Jira-owned. |
| A05 | Consistent: exact configured repository/base and separate related-repository changes. |
| A06 | Consistent after aa2b80b: case IDs and AI step IDs are stable; human steps remain ordered strings matching the actual schema. |
| A07 | Consistent: one API parent/Bruno child, top-level dispatch only; supported execution set is closed. |
| A08 | Consistent: requirement coverage can be human or AI, with no human PASS written by agents; D01 is explicit. |
| A09 | Consistent: preparation defers mechanical artifacts, never expectations/access/scope. |
| A10 | Consistent design: safe extraction, strict parsing, shape and semantic validation are distinct; future validator remains required. |
| A11 | Consistent with corrected T1 guidance: valid non-environment human-only plans do not require invented deployment prerequisites. |
| A12 | Consistent: work text cannot select new destinations, credentials, roles, repositories or transitions. |
| W01 | Consistent: configured High planning/review, Medium execution and existing verified controls; no business-skill self-install/model invention. |
| W02 | Consistent: broader Epic context does not broaden assigned PR scope. |
| W03 | Consistent: current CI, PR and prepared artifacts precede In Review; scope growth blocks. |
| W04 | Consistent: actual observed parent/target and completion references, not inferred Epic order. |
| W05 | Consistent: shared review criteria remain; approve/repair/block/discuss are distinct. Existing wrapper must change as explicitly required. |
| W06 | Consistent after T1 correction: full ledger, truthful zero-AI alternative, partial failures and pending humans, including non-runtime human-only cases. |
| W07 | Consistent: existing bounded API/Bruno/PostgreSQL/UI helpers; unsupported tools/setup block. |
| W08 | Consistent after T1 correction: receipt required for environment-dependent work, with non-runtime human targets explicitly supported. |
| W09 | Consistent: same-PR rework and dependency wait are understood queued work; no direct worker admission. |
| W10 | Consistent after D03: separate bounded human-invoked repair producer; unblock still deferred, with no false permission isolation or human approval. |
| W11 | Consistent: humans own review/tests/acceptance, UAT and production stages launch no worker. |
| W12 | Consistent: verified structured publication before one directed transition; uncertainty and shared identity limitations preserved. |
| M01 | Consistent: active opted-in Epic and full numbered identity required. |
| M02 | Consistent: full-label ownership conflict holds; independent streams remain independent. |
| M03 | Consistent: invalid unrelated ready work may be skipped; a required repair cannot be bypassed. |
| M04 | Consistent: one occupied implementation/review/QA cycle; Blocked, intent or inconsistent occupancy holds. |
| M05 | Consistent: count all Human Review members and reserve selected ticket's return; no sixth repair slot. |
| M06 | Consistent: repair prerequisite, repair, Bug, Story ordering with Epic tie-breaks. |
| M07 | Consistent: current coherent completion plus accepted native stage; cancellation/removal do not satisfy outcomes. |
| M08 | Consistent: finish existing B cycle/dependency wait, then oldest understood repair; no cancellation feature. |
| M09 | Consistent: stale actual child lineage and completed parent repair, not implementation-only evidence. |
| M10 | Consistent high-level obligation: preserve roots and immediate parent completion, consume all causes once. See repeated-repair analysis below. |
| M11 | Consistent: independent/merged/retargeted work does not fabricate a cascade; PR openness is worker preflight. |
| M12 | Consistent after D02: all manager transitions pause, including queue-only; worker drains retain separate authority. |
| M13 | Consistent: retained stable members plus complete discovery; labels/search cannot manufacture an empty stream. |
| M14 | Consistent: preview zero writes; apply fresh, bounded and three directed edges; uncertainty holds. |
| O01 | Consistent: customer AWS only, no vendor runtime access/telemetry or public admission endpoint. |
| O02 | Consistent: core policy/application, Jira adapter, state guarantees and AWS package are separated without speculative providers. |
| O03 | Consistent: one canonical config, generated bindings/receipts and secret references. |
| O04 | Consistent: current deterministic external bundle setup retained; compatible pinned Build acceptance still owed. |
| O05 | Consistent: four record kinds, separate retained history/member identity, no content/transcript store. |
| O06 | Consistent after 9929f33: manager intents precede its effects; workers have no DDB access; queue preserves pointer. |
| O07 | Consistent after 9929f33: pre-intent no-write reevaluation differs from post-intent durable human hold. |
| O08 | Consistent: disable/drain, positive evidence, conditional reconciliation; unresolved sent requests can remain held indefinitely. |
| O09 | Consistent: runtime/operator/deployer boundaries, configured TLS destinations and sanitized output; actual Jira permission limits admitted. |
| O10 | Consistent: disabled install, bounded reads/invocation, inventory review and one admitting installation are prerequisites. |
| O11 | Consistent: separate versions, preserved pending state, retained table/costs, disabled restore/rollback; no automatic retirement. |
| O12 | Consistent: compatible authoring/worker/manager rollout and installed acceptance; PGB-58 and explicit activation remain later gates. |

## Scenario walk

**41/41 examined, then rechecked.** Each named case was compared to the detailed contract, not assumed passed because it has a row.

- S01/S02: active opt-in gate and paused/non-opted-in no-authority behavior.
- S03/S04: ignored preparation/invalid unrelated candidates versus actionable field errors.
- S05/S06: prerequisite incompletion/current accepted completion, including cancellation distinctions.
- S07/S08/S09/S10: eligible Bug ordering, unready Bug bypass, required-repair priority and prerequisite-first behavior.
- S11: one automated slot across worker types.
- S12/S13/S14/S15/S16: four/five capacity boundaries, repair return capacity and accepted-stage release.
- S17/S18: blocked/uncertain hold and independent numbered-stream progress.
- S19/S20/S21: human repair producer supplied by D03; active B completes or publishes typed dependency wait with NOT RUN checks.
- S22/S23/S24/S25: repair completion threshold, exact stale child, active-child noninterruption and consumed-root suppression.
- S26/S27/S28/S29: no guessed order/merge cascade, preflight-owned actual PR facts, newest applicable repaired parent without dropped roots.
- S30/S31/S32: conflicting ownership and retained old/proposed identity after edits.
- S33/S34/S35/S36: independent unstarted removal versus prerequisite cancellation, unknown status, inaccessible or incomplete data.
- S37/S38/S39/S40/S41: fresh tie-breaks, pre-intent no-write, inconsistent active occupancy, D02 pause and post-intent held publication.

No truth-table case is reported as executed runtime acceptance. The truth table does not yet provide delivery-ready Story/case links; coverage.md truthfully requires those during grooming.

## Boundaries and counterexamples challenged

- Atomic begin must create attempt and set pending stream together; finalize must update the same attempt and clear only the matching pending reference. The closure supplies the missing atomic guarantee while retaining the cloud-neutral interface. A stale process cannot clear newer state through a general save.
- A failed/timed-out intent write is not permission to publish. Known member identity persists before Jira effects. Incomplete reads never mean empty work. This is distinct from nonpersistent no-write reevaluation before an intent.
- Disabling/draining the client does not cancel a sent Jira request. The supported confirmed-not-applied disposition needs positive rejection/durable evidence; absent history, elapsed time and current status cannot unlock. This accepts a real release-one recovery limitation rather than proposing a new service.
- Repeated parent repair while B is already queued is not proved unrepresentable: the existing request-reference array can retain U1 and a newer root R2, while B's later implementation records the current immediate parent completion and all consumed requests. I did not turn the absence of a dedicated extra field into a finding. The implementation plan must explicitly show this S29 trace without a second queue transition, pointer replacement or lost causes.
- Full-ledger compatibility with the handoff's 16-KiB/100-entry bounds needs meaningful start/publication-budget acceptance. The guide already treats numeric limits as initial/measured and explicitly forbids truncation; this is an implementation verification obligation, not grounds to invent another evidence service or enlarge scope. Cases exceeding supported representability must not silently start and later lose ledger rows.
- Read compatibility through Codex MCP, tool-contract inspection and raw REST fixtures support the chosen representation. They do not establish actual Cursor publication/site permissions. That remains installed acceptance, with no new worker integration assumed.
- Runtime IAM is not certified by the isolated observer role. The final customer package's least-privilege, lifecycle and crash/race tests remain real implementation obligations.

## Verification actually performed

Reused the already prepared validation environment; installed nothing. The system Python lacked jsonschema, so that initial attempt did not execute checks. The prepared environment then ran the existing check successfully: **72/72 JSON-compatibility/structural/limitation cases**. Independently validated **4/4 schema documents**, the expected structural validity/invalidity of **13/13 examples**, and schema validity of **8/8 read-only MCP fixture records**. Saved machine-readable results at `/private/tmp/pigboard-combined-design-technical-checks.json`.

After the D01/D03 correction, seven additional targeted structural cases also passed: valid human request, rejected Blocked source, rejected manager-origin request, rejected admission target, valid human-only non-runtime target, rejected missing human cases and rejected missing reason. These used synthetic fixture records and invented digest text strictly to test data shape, not to fabricate authority/evidence.

These checks do not implement safe production extraction/semantic validation, authenticate synthetic approvals, execute scenarios or prove installed delivery. No live probe was rerun. Supplied provider evidence stays PARTIAL: F4 queue confirmation readback was throttled; F4 repair and stale completion were NOT RUN. The corrected closure now states this explicitly. Those cases and throttled-read stop behavior must be mapped into implementation acceptance, not retrospectively relabelled passed.

## Independent seven-principle assessment

1. **Intuitive:** one Jira-owned workflow, one stream slot and one PR per ticket are coherent. Corrected T1 guidance permits a non-runtime human-only plan without an irrelevant deployment. D03 lets a human tell their assistant what needs fixing without dragging a card.
2. **Discoverable:** fixed skeletons, field errors, typed causes and explicit coverage expose missing work. D03 now names the real producer and explains its success, invalid-input and uncertain-effect outcomes. Exact source/evidence links remain necessary in the groomed queue.
3. **Delightful:** preserve installed skills, finish active work and avoid repeated provider experiments. Permanent holds for genuine uncertainty are an honest tradeoff; ordinary pre-intent read failure may reevaluate without operator ceremony.
4. **Token saver:** deterministic selection, bounded reads and exact references avoid agent scheduling/history inference. Budget failures remain explicit; compressing output cannot discard full QA evidence.
5. **Secure:** configuration owns destinations/actions and secrets, server metadata constrains typed records, and customer AWS has no vendor trust. Jira shared identities/property mutability remain admitted limitations. This review adds no monitoring, exclusivity or permission-enforcement feature.
6. **Agents are equal:** structured input/result contracts and noninteractive policy coexist with readable cases/operator journeys. Humans alone execute human tests and authorize repairs/unblock; D03 supplies the approved repair-entry design and keeps implementation separate from delivery.
7. **Dependable:** atomic operational state, retained membership, revision-bound evidence, no replay and explicit recovery limits support honest outcomes. Partial provider proof, current source, future compatibility, installed acceptance, activation and owner authority remain separate claims.

## Review completion boundary

T1 and K1 are closed for this artifact. Groom the whole scope using the required Story-writing method and map each requirement/scenario, including D03, to a bounded Story or explicit existing-capability/operational-Task disposition. Independently review that complete plan and present it to the owner before implementation. This report does not create ready Stories, authorize implementation, merge, deployment or activation.

## Exact artifact manifest

SHA-256 of the actual reviewed bytes. Combined digest framing is `relative path + NUL + file bytes + NUL` in the order listed below.

```text
46edc7ac886316f4bb2373f9c4aa799ebe7497beb0837a4c879aba55316ed658  docs/product/README.md
159e960dca4732acf905f223195220e445bb9c465d41c12c73d7a58aa5648154  docs/product/authoring.md
dce0410db1d8e7861c311a09ef0273133fcc9017be3ababfadb0ae6acc3846d5  docs/product/coverage.md
7b11573b3ad658739e4fe99c94ddcac3dd62f719d7afe195889bcad413b43310  docs/product/delivery.md
123f8f0f85032e1b1a5c64dd5cfe2ea417870f403b18e58b6c5f1aaeb3faeb18  docs/product/installation.md
1edbc7d323e444fba6febf1782cd0d0e2112afa3584a6bfb107b312e47fc6923  docs/product/manager.md
02a98a65ef62ebfea7cbf629d08bacbf8a05ad09edb52047511bcdb179659448  docs/architecture/manager-release-one.md
405a168b74357ee97fae67ecf1019090c615bb84f1b8c238db6efaa78ec32ee0  docs/architecture/manager-work-contract.md
04d68a876bebf2fb4de82433b35f1a20b4efd61bc82b641bfe5992d6f84c2459  docs/architecture/manager-work-schema.md
c079b8db7a777864c0cda05a78888f8ef975abca9ff4dbfb2419c9099c67f0ba  docs/architecture/manager-handoff-contract.md
15d77bdc309e856818d4d9e05120f956567bf114201a8540f4a1cd004a6a471d  docs/architecture/manager-stack-repair.md
1862403ef66df08cb4099e1502ed10e82c0a5e561c68c3252025144b57700b19  docs/architecture/manager-state.md
9fa243b581fc7e0b9e5e88792132e85e44839ade8d1d0814cefe427dc05e3c97  docs/architecture/manager-scenarios.md
3d791a0169ecbccbe4304c3de600908c77485c5a94c046327b247b0755295303  docs/architecture/manager-discovery-closure.md
c7d3d3ccf47cd218da36d8fc3cc2d736dca7b635a75e9822b3ad4fec253ed960  docs/architecture/manager-worker-transport.md
a4240e6cf24a26ebecd8af3e9a71aa7745ef456fb4ed4f36c681da50626773ad  docs/architecture/manager-human-rework.md
05dca3f290f84452b8b3763e450e6aff5977c21fc6e10b268541a4c83270c8f8  docs/architecture/contracts/pigboard-epic-v1.schema.json
9a96524b9cc2f142ddfcb822cdfc616a07951abcaefb164f0e08cbc47832f2a2  docs/architecture/contracts/pigboard-handoff-v1.schema.json
aa494c61e34bf88021ed77682fba61293ec3b50858b4e3b13f6295f56109998e  docs/architecture/contracts/pigboard-ticket-v1.schema.json
5aa7249149d59856752dcf1630c5e55775c1beba5fe11f14e5d0bf34c255e015  docs/architecture/contracts/pigboard-work-pointer-v1.schema.json
3e0d32f69cc46aeb0933d0dd982a21240798bd97374faa1a98eb0fe799209bb6  docs/architecture/examples/handoffs/admission.yaml
6eef7350017595164ed63bc599b8324678bfec537bc9a5b61f30b7ab51772d9f  docs/architecture/examples/handoffs/blocked.yaml
15bddf5cfb1e3ed4ea21ffe251f51f5ff9d6b7bcb948c976cd4b426efd44e37d  docs/architecture/examples/handoffs/dependency_wait.yaml
1faa5795c2c60f37f7471d519b56502dfc4217de6dc36f75be3620f5759356d7  docs/architecture/examples/handoffs/implementation.yaml
5e4858472c8239f35623b18bdab6169774eebbdb6200dc1bcc70945b5583ff87  docs/architecture/examples/handoffs/qa.yaml
c18127ca33872cf3a648590ff73a2758e96dd903456aa673cadac1ff1aaf0b6f  docs/architecture/examples/handoffs/repair_request.yaml
f93dfffff03a3ba2cd6175fbbc2d1151eca2c8212d70b598d0ee71842960bc06  docs/architecture/examples/handoffs/resume_authorization.yaml
2fd13d80182595d9e604ef4d38b1ef3c1cce951fe93ebef8b72c1baae0899520  docs/architecture/examples/handoffs/review.yaml
6edc37d7ea6c7c6c8ea855c6096e38fadade127d6f05f346fb49e44c4191ad31  docs/architecture/examples/handoffs/stack_update_request.yaml
47da131cf06ddb68d042ec09113ab0132125a4454c46c7e72062219d3bbc4936  docs/architecture/examples/manager-epic.yaml
015d8a1f97ef24a8eb78d8832256ba3d711f15675cacc005f40a8a315eccd62c  docs/architecture/examples/manager-epic-populated.yaml
ce9a6532bee4a6a561957d62a0198de61e7da0342ef8128853cc11dba3200ff0  docs/architecture/examples/manager-ticket.yaml
67684c400a6ebf50b2bb3b2db509d7b3c989dd2a89a713d56b3d91c088635338  docs/architecture/examples/manager-ticket-populated.yaml
```

product-6: `c5368b5d454f69eb06e1b15d069367d000252e2dbed31daaadb565be90531982`

combined-16: `3681e415453d45c7636c136c90e259963b06ba1a262b96b3f46a2f282854e8f6`

