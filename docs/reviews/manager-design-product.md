# Independent product and design-fidelity review

Verdict: **CLEAN for the settled combined design and ready to proceed to grooming**, for the exact file tree hashed below. No unresolved in-scope product/design findings remain in this review. This is not a delivery-plan review, implementation approval, merge approval, installed acceptance or activation authority.

Reviewed checkout: `/private/tmp/pigboard-product-requirements-20261114`; observed HEAD `8e41d93fa8b41d65be2a13e1b2d6c1244a4462d1`, **including uncommitted/untracked design and D03 changes**. The file hashes, rather than HEAD alone, bind the verdict. No source edits, runtime implementation, live provider tests or automation activation were performed.

**Separate six-product-document surface verdict: CLEAN** for the current working-tree versions of README, authoring, coverage, delivery, installation and manager. They correctly consolidate the 50 requirements, approved D01/D02/D03, retained versus required capabilities, and the still-pending complete Story/case mappings. The earlier product-only verdict at committed `8e41d93` remains historical; the current hashes also include the later uncommitted D03 updates. A later documentation commit with the identical file tree may retain this file-bound review evidence.

## Coverage and method

Primary coverage: **16/16 documents** (six product specifications and ten architecture contracts, including the new human-rework contract), **50/50 requirements**, **41/41 manager scenarios**. Supplemental coverage: **4/4 selected schemas** and **13/13 selected examples** (four Epic/ticket skeletons/populated examples plus nine handoff skeletons). All primary files and requirements were examined in the original full sweep; this round reread changed contracts and checked them against the unchanged reviewed contract/schema/source surfaces. D03's complete input, preflight, publication, directed queue, failure and boundary sections and **5/5 additional human-rework acceptance bullets** were examined.

The review independently traced requirements through work/handoff/state/stack representations and inspected current bundle/writer/worker workflow clauses to separate retained functionality from the required compatibility changes. Evidence interpretation was compared with the retained bounded proof and its explicit PARTIAL/NOT RUN account. Read-only Codex MCP compatibility is provider conversion/read evidence; it is not an actual Cursor write or complete delivery run.

**Second sweep complete: 16/16 documents, 50/50 requirement IDs, 41/41 scenarios and 5/5 human-rework acceptance bullets.** It checked D01/D02/D03, requirements-to-contract consistency, all formerly stale readiness/proof statements, target/deployment evidence applicability, native status authority, human/agent differences, installation-versus-activation boundaries and the new request-rework journey. No missed issue emerged. No new dependency setup or test run was necessary for these documentation changes; no execution acceptance is claimed.

### Requirements examined

| Requirements | Examined/total | Independent assessment |
| --- | --- | --- |
| A01, A02 | 2/2 | Existing writer provenance, size limits and sibling human-writing bundle dependency retained; proposed release must evolve this source rather than replace it silently. |
| A03, A04, A05 | 3/3 | Full draft skeletons, Epic order and native authority, repository/base and cross-repository boundaries represented. |
| A06, A07, A08 | 3/3 | Complete AI execution graph/helper ownership, human separation and D01 represented; A06 now distinguishes stable AI step IDs from ordered readable human steps; the schema matches that distinction. |
| A09, A10, A11, A12 | 4/4 | Mechanical preparation versus authority, safe parsing/semantic gates, editable draft versus start, and work-data trust boundary explicit. |
| W01, W02, W03, W04 | 4/4 | Model effort stays in harness; bounded one-PR implementation and actual parent/base evidence retained; existing source is correctly called incompatible until changed. |
| W05, W06, W07, W08 | 4/4 | Exact-current review and prescribed QA, partial ledgers and helper ownership, pipeline target provenance and static-review exception defined. Human-only outcome remains zero AI, with CI/review intact. |
| W09, W10, W11, W12 | 4/4 | Queued understood repair, human authority/acceptance and publication ordering preserved. D03 now supplies the separate human-invoked repair producer; deferred unblock producer remains correctly separate. |
| M01, M02, M03, M04, M05 | 5/5 | Opt-in/active Epic, full stream identity, independent readiness, occupied-stage holds and five-ticket return capacity consistent. |
| M06, M07, M08, M09, M10, M11 | 6/6 | Repair/prerequisite ordering, exact completion evidence, draining active work, actual lineage and one-PR propagation are consistent; no merged-PR polling promise added. |
| M12, M13, M14 | 3/3 | D02 suppresses queue-only actions too; retained identity and incomplete inventory hold; preview has zero writes, apply rechecks inputs. |
| O01, O02, O03, O04 | 4/4 | Customer-only AWS deployment, neutral policy boundary, canonical configuration and pinned external bundle are coherent. |
| O05, O06, O07, O08 | 4/4 | Four state records, atomic attempt/stream intent, verified publication, persistent uncertainty and evidence-only reconciliation are coherent. Evidence-only recovery and the distinction between pre-intent read failure and post-intent uncertainty are explicit. |
| O09, O10, O11, O12 | 4/4 | Restricted configured authority, disabled inventory/install, retained-state lifecycle, coordinated acceptance and explicit activation gates preserved. |
| **Total** | **50/50** | No unapproved runtime capability or new speculative integration is requested by this review. |

### Scenarios examined

- **S01–S10: 10/10** — opt-in, active Epic, readiness, prerequisite completion and class/tie ordering checked against M01–M07 and the work contract.
- **S11–S18: 8/8** — occupied stages, full-stream cap, rework return slot, Blocked/intent hold and independent streams checked.
- **S19–S29: 11/11** — human repair entry (approved D03), active worker completion/dependency wait, revision-bound queueing, consumed roots, independence, merge boundary and repeated repairs checked against stack/handoff fields.
- **S30–S41: 12/12** — ownership conflicts, retained identity/edit/removal, accepted versus cancelled state, incomplete reads, order changes, two-actives hold, D02 and pre/post-intent changes checked.
- **Total: 41/41.** These are reviewed expected behaviors, not passing executed cases.

## Findings resolved and current D03 assessment

- **F1 resolved:** closure §3 now explicitly says the planned stale-completion check did not run after throttling; it matches §4 and retained P5 NOT RUN evidence. The bounded proof remains PARTIAL.
- **F2 resolved:** scenario/state/coverage clauses and all residual release/work/stack clauses now distinguish settled discovery choices and partial provider observations from required implementation/installed acceptance. The safety/readiness account no longer requires repeating accepted discovery to groom. Missing production tests and actual Cursor writes remain required before activation, not waived.
- **F3 resolved:** A06 distinguishes stable AI step IDs from ordered readable human instructions, matching the accepted schema. No unnecessary human execution engine or extra step-ID machinery was introduced.
- **O06/O07 precision retained:** only manager side effects require manager-state intents; workers have no DynamoDB access. Pre-intent failures yield no writes and allow later fresh evaluation. Post-intent uncertainty retains the durable human hold.
- **Environment applicability corrected:** the guide and ticket skeleton require revision-bound pipeline deployment receipts for environment-dependent work. Human-only static review may use approved PR artifacts as a configured target. Zero-AI QA leaves human cases pending and does not pretend to run their environment preflight. Human owners check required environment evidence before those cases run.
- **K1 resolved by owner D03:** the new separate human-invoked `request-rework` skill records bounded findings in the existing typed repair envelope and performs Human Review → Rework Queued. It checks current assignment, unchanged requirements/revision, exact completed QA chain, open PR and configured actor/scope; verifies publication before one directed queue transition; and reports partial/uncertain results without replay. Existing active B is untouched. It neither updates the pointer/DynamoDB nor admits work, creates Bugs, changes requirements, unblocks or implements. Bundle/shared-validator/human-writing integration and usage examples are explicitly implementation obligations. Story writing remains separate.

No new runtime feature, integration, discovery experiment or out-of-scope follow-up is requested by this review.

## Seven-principle assessment

1. **Intuitive:** Jira remains the work surface, familiar stages retain their meaning and each ticket keeps its own PR. D03 completes the human repair entry through an explicit assistant request; the human does not need to understand manager state or drag a card after requesting repair. Queueing and later admission remain distinct.
2. **Discoverable:** Full skeletons, field-level validation, preview reasons and exact assignment/evidence references give agents actionable inputs and humans readable context. The new contract states what a human supplies, what the skill checks, what success looks like, and why a request may stop. Final command examples and setup guidance are explicitly owed by its implementation slice.
3. **Delightful experience:** Active work completes without interruption; independent ready work can proceed; one external bundle avoids repeated setup. An authorized human request completes publication and queueing without an extra permission loop or new automatic worker. Real ambiguous outcomes still require attention, a disclosed release-one tradeoff rather than a reason to add a recovery product.
4. **Token saver:** Deterministic scheduling, the current-assignment pointer, bounded exact-comment lookup and structured repair inputs avoid model polling or inference from discussion. Humans receive concise evidence/reasons. Bounded MCP pagination remains a documented cost and exceeded budgets stop truthfully rather than dropping information.
5. **Secure:** Trusted configuration owns sites, repositories, identities and transitions; ticket text remains work data. Server metadata, digests and exact revisions constrain accepted evidence. Customer IAM/state/data stay in the customer account. D03 requires an explicit human request, makes no database or pointer writes, cannot grant scope and preserves the known shared-identity limitation without claiming technical role isolation or exactly-once behavior.
6. **Agents are equal:** Workers and the human's assistant receive versioned inputs, exact scope, role-specific results and useful failure semantics. Humans receive readable requirements, their own pending cases and repair-request output. AI does not complete human judgment; human-only plans remain valid without invented AI passes or deployment proof for static work.
7. **Dependable:** Atomic attempt/stream state retains uncertainty, stable member identity protects occupancy, coherent revision chains and consumed repair roots prevent false completion/repeated stack queueing. D03 preserves receipts across partial failure and never claims an uncertain transition succeeded. Provider probes, actual Cursor operations, implementation acceptance, hosted checks, owner review and activation remain separate claims.

The complete dependency-ordered, sized Story/operational-Task set, bidirectional requirement/case coverage, independent delivery-plan review and owner review are still required before implementation. The design is ready to be groomed into that set. All delivery automation remains inactive; the deferred human-unblock producer remains a separately scoped follow-up and is not silently included in D03.

## Exact primary artifact manifest (SHA-256)

```
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
```

## Supplemental contract/example manifest (SHA-256)

```
05dca3f290f84452b8b3763e450e6aff5977c21fc6e10b268541a4c83270c8f8  docs/architecture/contracts/pigboard-epic-v1.schema.json
9a96524b9cc2f142ddfcb822cdfc616a07951abcaefb164f0e08cbc47832f2a2  docs/architecture/contracts/pigboard-handoff-v1.schema.json
aa494c61e34bf88021ed77682fba61293ec3b50858b4e3b13f6295f56109998e  docs/architecture/contracts/pigboard-ticket-v1.schema.json
5aa7249149d59856752dcf1630c5e55775c1beba5fe11f14e5d0bf34c255e015  docs/architecture/contracts/pigboard-work-pointer-v1.schema.json
015d8a1f97ef24a8eb78d8832256ba3d711f15675cacc005f40a8a315eccd62c  docs/architecture/examples/manager-epic-populated.yaml
67684c400a6ebf50b2bb3b2db509d7b3c989dd2a89a713d56b3d91c088635338  docs/architecture/examples/manager-ticket-populated.yaml
47da131cf06ddb68d042ec09113ab0132125a4454c46c7e72062219d3bbc4936  docs/architecture/examples/manager-epic.yaml
ce9a6532bee4a6a561957d62a0198de61e7da0342ef8128853cc11dba3200ff0  docs/architecture/examples/manager-ticket.yaml
3e0d32f69cc46aeb0933d0dd982a21240798bd97374faa1a98eb0fe799209bb6  docs/architecture/examples/handoffs/admission.yaml
6eef7350017595164ed63bc599b8324678bfec537bc9a5b61f30b7ab51772d9f  docs/architecture/examples/handoffs/blocked.yaml
15bddf5cfb1e3ed4ea21ffe251f51f5ff9d6b7bcb948c976cd4b426efd44e37d  docs/architecture/examples/handoffs/dependency_wait.yaml
1faa5795c2c60f37f7471d519b56502dfc4217de6dc36f75be3620f5759356d7  docs/architecture/examples/handoffs/implementation.yaml
5e4858472c8239f35623b18bdab6169774eebbdb6200dc1bcc70945b5583ff87  docs/architecture/examples/handoffs/qa.yaml
c18127ca33872cf3a648590ff73a2758e96dd903456aa673cadac1ff1aaf0b6f  docs/architecture/examples/handoffs/repair_request.yaml
f93dfffff03a3ba2cd6175fbbc2d1151eca2c8212d70b598d0ee71842960bc06  docs/architecture/examples/handoffs/resume_authorization.yaml
2fd13d80182595d9e604ef4d38b1ef3c1cce951fe93ebef8b72c1baae0899520  docs/architecture/examples/handoffs/review.yaml
6edc37d7ea6c7c6c8ea855c6096e38fadade127d6f05f346fb49e44c4191ad31  docs/architecture/examples/handoffs/stack_update_request.yaml
```
