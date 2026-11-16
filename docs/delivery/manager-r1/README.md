# Pig Boss release one: complete approved delivery catalogue

The complete approved source catalogue contains **51 Stories, 185 full human cases, zero AI cases and 123 prerequisite occurrences**. Its 129 captured native links combine the original 127 links with the two bounded PGB-169/PGB-159 links. The 50-Story/7-Task/57-row native page is a dated observation; this composition is not a new Jira inventory. The 53 product requirements and 41 original scenarios remain unchanged.

Read [all complete Story bodies](stories.md), the [machine contracts](ticket-drafts.json), [ordered allocations](plan-metadata.json), [coverage](coverage.md) and [publication evidence](publication.json). Jira owns current delivery status. A readable contract or green developer test does not establish implemented behavior or designated human acceptance. PGB-159–166 remain planned; PGB-169 adds catalogue and guard behavior only.

## Dependency order and approved allocation checkpoint — 16 November 2026

| ID / Jira Story | Complete usable outcome | Depends on | Approved checkpoint days | Forecast paths |
| --- | --- | --- | ---: | ---: |
| R1-01 / [PGB-71](https://scubapig.atlassian.net/browse/PGB-71) | Validate an editable work document | Reviewed design | 1.5 | 19 |
| R1-02 / [PGB-72](https://scubapig.atlassian.net/browse/PGB-72) | Check the complete prescribed test plan | R1-01 | 1.5 | 7 |
| R1-03 / [PGB-73](https://scubapig.atlassian.net/browse/PGB-73) | Write complete Epic and ticket YAML | R1-01, R1-02 | 1.25 | 8 |
| R1-04 / [PGB-74](https://scubapig.atlassian.net/browse/PGB-74) | Validate assignment and handoff evidence | R1-01, R1-02 | 1.75 | 18 |
| R1-21 / [PGB-99](https://scubapig.atlassian.net/browse/PGB-99) | Configure Pig Boss for multiple projects | R1-04 | 1.5 | 9 |
| R1-31 / [PGB-145](https://scubapig.atlassian.net/browse/PGB-145) | Check Jira read configuration before use | R1-21 | 1.53125–1.90625 | 20 |
| R1-38 / [PGB-152](https://scubapig.atlassian.net/browse/PGB-152) | Read native Jira observations accurately | R1-31 | 0.4375–0.75 | 8 |
| R1-40 / [PGB-154](https://scubapig.atlassian.net/browse/PGB-154) | Reject duplicate Jira comment targets | R1-31 | 0.375–0.6375 | 8 |
| R1-41 / [PGB-155](https://scubapig.atlassian.net/browse/PGB-155) | Reconcile the source inspection delivery record | R1-31 | 0.68125–1.08125 | 10 |
| R1-42 / [PGB-156](https://scubapig.atlassian.net/browse/PGB-156) | Keep Jira inspection within its original bounds | R1-31 | 0.69375–1.175 | 5 |
| R1-36 / [PGB-150](https://scubapig.atlassian.net/browse/PGB-150) | Inspect named Jira issues from source | R1-31, R1-38, R1-40, R1-41, R1-42 | 1.24375–1.7875 | 18 |
| R1-05 / [PGB-75](https://scubapig.atlassian.net/browse/PGB-75) | Hand an implemented PR to review | R1-03, R1-04 | 1.5 | 10 |
| R1-06 / [PGB-76](https://scubapig.atlassian.net/browse/PGB-76) | Review and hand off the current PR | R1-04, R1-05 | 1.25 | 8 |
| R1-07 / [PGB-77](https://scubapig.atlassian.net/browse/PGB-77) | Execute prescribed QA helper steps | R1-02, R1-04 | 1.5 | 7 |
| R1-24 / [PGB-110](https://scubapig.atlassian.net/browse/PGB-110) | Publish prepared QA evidence safely | R1-04, R1-06, R1-07, PGB-108 | 3.34375–4.5625 | 20 |
| R1-30 / [PGB-138](https://scubapig.atlassian.net/browse/PGB-138) | Prepare mixed QA inputs and two boundary controls | R1-04, R1-06, R1-07, PGB-108, R1-24 | 1.0625–1.5625 | 18 |
| R1-27 / [PGB-132](https://scubapig.atlassian.net/browse/PGB-132) | Prepare the prescribed QA inputs | R1-04, R1-06, R1-07, PGB-108, R1-24, R1-30 | 1.0625–1.59375 | 12 |
| R1-08 / [PGB-78](https://scubapig.atlassian.net/browse/PGB-78) | Execute prescribed QA and hand off complete evidence | R1-04, R1-06, R1-07, PGB-108, R1-24, R1-27 | 1.3125–1.8125 | 17 |
| R1-09 / [PGB-79](https://scubapig.atlassian.net/browse/PGB-79) | Request rework through the human’s assistant | R1-04 | 1.25 | 7 |
| R1-10 / [PGB-80](https://scubapig.atlassian.net/browse/PGB-80) | Preview ready work from a complete snapshot | R1-02, R1-04, R1-21 | 1.75 | 7 |
| R1-25 / [PGB-113](https://scubapig.atlassian.net/browse/PGB-113) | Validate repeated-parent repairs | R1-10 | 1.98 | 15 |
| R1-26 / [PGB-129](https://scubapig.atlassian.net/browse/PGB-129) | Reject conflicting completion receipts | R1-25 | 1.28 | 17 |
| R1-28 / [PGB-136](https://scubapig.atlassian.net/browse/PGB-136) | Preview own-ticket repairs | R1-26 | 1.92 | 20 |
| R1-37 / [PGB-151](https://scubapig.atlassian.net/browse/PGB-151) | Keep repair proposals current | Reviewed design | 0.55 | 5 |
| R1-39 / [PGB-153](https://scubapig.atlassian.net/browse/PGB-153) | Preserve published repairs across identical QA copies | Reviewed design | 0.65 | 5 |
| R1-35 / [PGB-149](https://scubapig.atlassian.net/browse/PGB-149) | Preview complete repairs as structured data | R1-10, R1-25, R1-26, R1-28, R1-31, R1-37, R1-39 | 1.965 | 20 |
| R1-32 / [PGB-146](https://scubapig.atlassian.net/browse/PGB-146) | Preview repairs from a source checkout | R1-10, R1-25, R1-26, R1-28, R1-35 | 0.86 | 10 |
| R1-11 / [PGB-81](https://scubapig.atlassian.net/browse/PGB-81) | Preview the complete repair order | R1-10, R1-25, R1-26, R1-28, R1-32 | 1.91 | 18 |
| PGB-169 / [PGB-169](https://scubapig.atlassian.net/browse/PGB-169) | Publish approved delivery contracts with intact evidence | PGB-81 | 0.84375–1.3125 | 11 |
| PGB-159 / [PGB-159](https://scubapig.atlassian.net/browse/PGB-159) | Check complete scheduling declarations | PGB-81, PGB-99, PGB-145, PGB-169 | 1.4375–1.875 | 9 |
| PGB-160 / [PGB-160](https://scubapig.atlassian.net/browse/PGB-160) | Validate authenticated recorded handoffs | PGB-159 | 1.4375–1.875 | 8 |
| PGB-161 / [PGB-161](https://scubapig.atlassian.net/browse/PGB-161) | Check current worker proof and truthful inability | PGB-160 | 1.3125–1.8125 | 9 |
| R1-33 / [PGB-147](https://scubapig.atlassian.net/browse/PGB-147) | Inspect named Jira issues safely | R1-31, R1-36 | 0.94375–1.28125 | 16 |
| R1-34 / [PGB-148](https://scubapig.atlassian.net/browse/PGB-148) | Inspect complete scoped Jira inventory | R1-33 | 1.34375–1.8125 | 20 |
| PGB-162 / [PGB-162](https://scubapig.atlassian.net/browse/PGB-162) | Preview scheduling and repairs from recorded proof | PGB-160, PGB-81 | 1.375–1.9375 | 15 |
| PGB-163 / [PGB-163](https://scubapig.atlassian.net/browse/PGB-163) | Read exact handoffs and reconciliation facts | PGB-160, PGB-147, PGB-148, PGB-150 | 1.375–1.875 | 14 |
| PGB-164 / [PGB-164](https://scubapig.atlassian.net/browse/PGB-164) | Complete implementation with current permitted facts | PGB-161 | 0.75–1.125 | 7 |
| PGB-165 / [PGB-165](https://scubapig.atlassian.net/browse/PGB-165) | Review current proof with recorded ancestry | PGB-161 | 0.5625–0.875 | 5 |
| PGB-166 / [PGB-166](https://scubapig.atlassian.net/browse/PGB-166) | Finish prescribed QA and authorized human rework | PGB-161 | 0.875–1.3125 | 11 |
| R1-12 / [PGB-82](https://scubapig.atlassian.net/browse/PGB-82) | Preview current Jira work with bounded reads | R1-11, R1-21, R1-31, R1-34, PGB-162, PGB-163 | 1.375–1.875 | 13 |
| R1-13 / [PGB-83](https://scubapig.atlassian.net/browse/PGB-83) | Install a disabled AWS preview | R1-12 | 1.75 | 13 |
| R1-14 / [PGB-84](https://scubapig.atlassian.net/browse/PGB-84) | Inspect durable scheduling state | R1-13 | 1.75 | 10 |
| R1-29 / [PGB-137](https://scubapig.atlassian.net/browse/PGB-137) | Retain and inspect original transition proof | R1-14 | 1.5625 | 17 |
| R1-15 / [PGB-85](https://scubapig.atlassian.net/browse/PGB-85) | Reconcile an uncertain attempt with evidence | R1-12, R1-14, R1-29 | 1.5 | 12 |
| R1-16 / [PGB-86](https://scubapig.atlassian.net/browse/PGB-86) | Upgrade and remove the AWS installation safely | R1-14, R1-15 | 1.25 | 8 |
| R1-22 / [PGB-100](https://scubapig.atlassian.net/browse/PGB-100) | Inspect Pig Boss operating health | R1-13, R1-14, R1-21 | 1.75 | 11 |
| R1-23 / [PGB-101](https://scubapig.atlassian.net/browse/PGB-101) | Install Pig Boss health alarms | R1-16, R1-22 | 1.5 | 10 |
| R1-17 / [PGB-87](https://scubapig.atlassian.net/browse/PGB-87) | Admit a ready Story or Bug safely | R1-05, R1-06, R1-08, R1-12, R1-14, R1-15, R1-16 | 1.75 | 10 |
| R1-18 / [PGB-88](https://scubapig.atlassian.net/browse/PGB-88) | Admit queued rework on its existing PR | R1-09, R1-17 | 1.25 | 5 |
| R1-19 / [PGB-89](https://scubapig.atlassian.net/browse/PGB-89) | Queue a completed dependent PR for repair | R1-18 | 1.5 | 5 |
| R1-20 / [PGB-90](https://scubapig.atlassian.net/browse/PGB-90) | Check a compatible release before enabling delivery | R1-03, R1-05, R1-06, R1-07, R1-08, R1-09, R1-19, R1-23 | 1.5 | 15 |

Approved 16 November source-row allocation checkpoint: **68.3025–78.76500 days**. This dated arithmetic precedes the PGB-169 correction/review support below. Exact decimal units at scale 100000 sum to 6830250/7876500. This arithmetic replaces the former PGB-159 allocation once and includes the new PGB-169 row once. It excludes seven captured Tasks and unmeasured shared planning, and is not a remaining-project estimate. PGB-81 retains its historical 1.91-day row; PGB-82 retains its residual **13 paths / 11–15 hours** and H05 exactly once.

At the approved 16 November allocation checkpoint, PGB-169 owned **11 paths / 6.75–10.5 human hours**, including its own planning, reviews, corrections, tests, documentation and PR preparation. Residual PGB-159 owns **9 paths / 11.5–15 human hours**. Combined: **18.25–25.5 hours**, 19 unique paths and 20 change incidences; the cursor test is counted in both PRs. These are dated approved allocations, not implementation-plan approval for the later Stories or a measured saving. Their exact-source plans remain provisional until their own gates pass.

The current PGB-169 whole-work forecast is **7.25–11.25 familiar-human hours**. Three mechanical test-expectation corrections and their affected reviews add 0.5–0.75 hours of support to the original allocation; the revised support line is 3–4.5 hours. This forecast includes the remaining checks, exact-commit reviews and PR preparation. The approved row values and aggregate above remain the historical allocation checkpoint, and are not silently rotated. Human forecasts, agent elapsed time, logged tokens and billed cost are distinct; token volume and billed cost are unknown here.

## Inspect and verify the catalogue

Use the accepted source and prepared dependencies. Do not fetch or repair dependencies inside a delivery run. The first command checks every complete native-bound contract/case, ordering and dependency before expensive installation checks:

```sh
node --test --test-name-pattern='PGB-169 current catalogue matches approved native contracts and complete rendered Stories' test/story-authoring.test.mjs
node --test --test-name-pattern='PGB-169 current catalogue coverage and forecast retain historical evidence|PGB-81 scoped current source matches every frozen native contract and complete rendered Story|PGB-81 current scoped forecast, preserved history and installed closure have independent bindings|PGB-146 historical integration receipt preserves both captures and unchanged State runtime compatibility' test/story-authoring.test.mjs test/qa-helper-contract.test.mjs
node --test --test-name-pattern='PGB-169 every current source payload byte matches its installed copy and manifest|real installed validator runs outside checkout and failed runtime variants preserve stable link|installed repair preview preserves complete checkpoint and historical contracts|repair closure and eighth semantic smoke preserve the previous stable link on failure' test/cursor-environment.test.mjs
npm test
```

A passing command must select the intended tests. Keep each command, exact revision, exit status and TAP log; the copy test retains its fixture commit and per-control outcomes through the existing opt-in evidence capture. Missing contract/case, historical tampering and missing/mismatched copied payload controls fail against unchanged expected evidence. Inspect the first concrete failure before repair; preserve successful and failed attempts separately. Local mock servers require the prepared local-loopback permission for the full suite. No provider credentials or customer targets are needed.

The publication stores one historical 43-entry byte closure: 37 payload sources, five other catalogue artifacts and the installer. Independent old hashes and a whole-capture digest bind those exact parent bytes. Those dated bytes do not stand in for current modules. Current semantic checks use actual source/copied code, and the fresh installation guard compares every independently expected payload path with the actual source, fixture, installed bytes and manifest. It records the real fixture commit. This introduces no rotating runtime hash map or future-change allowlist.

All 185 designated human cases, including PGB-169-H01/H02, remain **NOT_RUN**. Developer regressions, contributor review, hosted CI/Codex, merge, live acceptance and activation are separate. Runtime and installer behavior are unchanged; no scheduling implementation or activation is authorized by publication.

## Dated PGB-81 checkpoint and prior evidence

# Dated PGB-81 scoped delivery checkpoint

42-Story scoped source checkpoint; 50 Stories and 7 Tasks observed in the dated native capture; eight later Story mappings and Task167 publication remain Core-owned. The 42 included Stories contain 166 complete human groups, all NOT_RUN, and zero AI cases. This checkpoint reconciles settled source contracts; it is not a complete Epic inventory or a claim that the manager has shipped.

## Historical scoped order and forecast

[Complete Story bodies](stories.md) · [Requirement and scenario coverage](coverage.md) · [Frozen provenance and history](publication.json)

| ID / Jira Story | Complete usable outcome | Depends on | Estimated human days | Forecast files |
| --- | --- | --- | ---: | ---: |
| R1-01 / [PGB-71](https://scubapig.atlassian.net/browse/PGB-71) | Validate an editable work document | Reviewed design | 1.5 | 19 |
| R1-02 / [PGB-72](https://scubapig.atlassian.net/browse/PGB-72) | Check the complete prescribed test plan | R1-01 | 1.5 | 7 |
| R1-03 / [PGB-73](https://scubapig.atlassian.net/browse/PGB-73) | Write complete Epic and ticket YAML | R1-01, R1-02 | 1.25 | 8 |
| R1-04 / [PGB-74](https://scubapig.atlassian.net/browse/PGB-74) | Validate assignment and handoff evidence | R1-01, R1-02 | 1.75 | 18 |
| R1-21 / [PGB-99](https://scubapig.atlassian.net/browse/PGB-99) | Configure Pig Boss for multiple projects | R1-04 | 1.5 | 9 |
| R1-31 / [PGB-145](https://scubapig.atlassian.net/browse/PGB-145) | Check Jira read configuration before use | R1-21 | 1.53125–1.90625 | 20 |
| R1-38 / [PGB-152](https://scubapig.atlassian.net/browse/PGB-152) | Read native Jira observations accurately | R1-31 | 0.4375–0.75 | 8 |
| R1-40 / [PGB-154](https://scubapig.atlassian.net/browse/PGB-154) | Reject duplicate Jira comment targets | R1-31 | 0.375–0.6375 | 8 |
| R1-41 / [PGB-155](https://scubapig.atlassian.net/browse/PGB-155) | Reconcile the source inspection delivery record | R1-31 | 0.68125–1.08125 | 10 |
| R1-42 / [PGB-156](https://scubapig.atlassian.net/browse/PGB-156) | Keep Jira inspection within its original bounds | R1-31 | 0.69375–1.175 | 5 |
| R1-36 / [PGB-150](https://scubapig.atlassian.net/browse/PGB-150) | Inspect named Jira issues from source | R1-31, R1-38, R1-40, R1-41, R1-42 | 1.24375–1.7875 | 18 |
| R1-05 / [PGB-75](https://scubapig.atlassian.net/browse/PGB-75) | Hand an implemented PR to review | R1-03, R1-04 | 1.5 | 10 |
| R1-06 / [PGB-76](https://scubapig.atlassian.net/browse/PGB-76) | Review and hand off the current PR | R1-04, R1-05 | 1.25 | 8 |
| R1-07 / [PGB-77](https://scubapig.atlassian.net/browse/PGB-77) | Execute prescribed QA helper steps | R1-02, R1-04 | 1.5 | 7 |
| R1-24 / [PGB-110](https://scubapig.atlassian.net/browse/PGB-110) | Publish prepared QA evidence safely | R1-04, R1-06, R1-07, PGB-108 | 3.34375–4.5625 | 20 |
| R1-30 / [PGB-138](https://scubapig.atlassian.net/browse/PGB-138) | Prepare mixed QA inputs and two boundary controls | R1-04, R1-06, R1-07, PGB-108, R1-24 | 1.0625–1.5625 | 18 |
| R1-27 / [PGB-132](https://scubapig.atlassian.net/browse/PGB-132) | Prepare the prescribed QA inputs | R1-04, R1-06, R1-07, PGB-108, R1-24, R1-30 | 1.0625–1.59375 | 12 |
| R1-08 / [PGB-78](https://scubapig.atlassian.net/browse/PGB-78) | Execute prescribed QA and hand off complete evidence | R1-04, R1-06, R1-07, PGB-108, R1-24, R1-27 | 1.3125–1.8125 | 17 |
| R1-09 / [PGB-79](https://scubapig.atlassian.net/browse/PGB-79) | Request rework through the human’s assistant | R1-04 | 1.25 | 7 |
| R1-10 / [PGB-80](https://scubapig.atlassian.net/browse/PGB-80) | Preview ready work from a complete snapshot | R1-02, R1-04, R1-21 | 1.75 | 7 |
| R1-25 / [PGB-113](https://scubapig.atlassian.net/browse/PGB-113) | Validate repeated-parent repairs | R1-10 | 1.98 | 15 |
| R1-26 / [PGB-129](https://scubapig.atlassian.net/browse/PGB-129) | Reject conflicting completion receipts | R1-25 | 1.28 | 17 |
| R1-28 / [PGB-136](https://scubapig.atlassian.net/browse/PGB-136) | Preview own-ticket repairs | R1-26 | 1.92 | 20 |
| R1-37 / [PGB-151](https://scubapig.atlassian.net/browse/PGB-151) | Keep repair proposals current | Reviewed design | 0.55 | 5 |
| R1-39 / [PGB-153](https://scubapig.atlassian.net/browse/PGB-153) | Preserve published repairs across identical QA copies | Reviewed design | 0.65 | 5 |
| R1-35 / [PGB-149](https://scubapig.atlassian.net/browse/PGB-149) | Preview complete repairs as structured data | R1-10, R1-25, R1-26, R1-28, R1-31, R1-37, R1-39 | 1.965 | 20 |
| R1-32 / [PGB-146](https://scubapig.atlassian.net/browse/PGB-146) | Preview repairs from a source checkout | R1-10, R1-25, R1-26, R1-28, R1-35 | 0.86 | 10 |
| R1-11 / [PGB-81](https://scubapig.atlassian.net/browse/PGB-81) | Preview the complete repair order | R1-10, R1-25, R1-26, R1-28, R1-32 | 1.91 | 18 |
| R1-33 / [PGB-147](https://scubapig.atlassian.net/browse/PGB-147) | Inspect named Jira issues safely | R1-31, R1-36 | 0.94375–1.28125 | 16 |
| R1-34 / [PGB-148](https://scubapig.atlassian.net/browse/PGB-148) | Inspect complete scoped Jira inventory | R1-33 | 1.34375–1.8125 | 20 |
| R1-12 / [PGB-82](https://scubapig.atlassian.net/browse/PGB-82) | Preview current Jira work with bounded reads | R1-11, R1-21, R1-31, R1-34, PGB-162, PGB-163 | 1.375–1.875 | 13 |
| R1-13 / [PGB-83](https://scubapig.atlassian.net/browse/PGB-83) | Install a disabled AWS preview | R1-12 | 1.75 | 13 |
| R1-14 / [PGB-84](https://scubapig.atlassian.net/browse/PGB-84) | Inspect durable scheduling state | R1-13 | 1.75 | 10 |
| R1-29 / [PGB-137](https://scubapig.atlassian.net/browse/PGB-137) | Retain and inspect original transition proof | R1-14 | 1.5625 | 17 |
| R1-15 / [PGB-85](https://scubapig.atlassian.net/browse/PGB-85) | Reconcile an uncertain attempt with evidence | R1-12, R1-14, R1-29 | 1.5 | 12 |
| R1-16 / [PGB-86](https://scubapig.atlassian.net/browse/PGB-86) | Upgrade and remove the AWS installation safely | R1-14, R1-15 | 1.25 | 8 |
| R1-22 / [PGB-100](https://scubapig.atlassian.net/browse/PGB-100) | Inspect Pig Boss operating health | R1-13, R1-14, R1-21 | 1.75 | 11 |
| R1-23 / [PGB-101](https://scubapig.atlassian.net/browse/PGB-101) | Install Pig Boss health alarms | R1-16, R1-22 | 1.5 | 10 |
| R1-17 / [PGB-87](https://scubapig.atlassian.net/browse/PGB-87) | Admit a ready Story or Bug safely | R1-05, R1-06, R1-08, R1-12, R1-14, R1-15, R1-16 | 1.75 | 10 |
| R1-18 / [PGB-88](https://scubapig.atlassian.net/browse/PGB-88) | Admit queued rework on its existing PR | R1-09, R1-17 | 1.25 | 5 |
| R1-19 / [PGB-89](https://scubapig.atlassian.net/browse/PGB-89) | Queue a completed dependent PR for repair | R1-18 | 1.5 | 5 |
| R1-20 / [PGB-90](https://scubapig.atlassian.net/browse/PGB-90) | Check a compatible release before enabling delivery | R1-03, R1-05, R1-06, R1-07, R1-08, R1-09, R1-19, R1-23 | 1.5 | 15 |

Current scoped source-row forecast: **58.33375–64.76500 days**. Exact Decimal inputs use scale 100000 and sum to 5833375/6476500. This excludes the eight later Core Stories, their separately allocated C/foundation work, seven Tasks and unmeasured shared planning. It is not a complete Epic/Core estimate, net saving or elapsed effort. PGB-82 is its approved residual 13-path/11–15h allocation only. PGB-150 charges 9.95–14.30h runtime work once (8 owned paths plus 10 inherited catalog paths); PGB-155 charges 5.45–8.65h/10 paths and PGB-156 5.55–9.40h/5 paths.

PGB-81 delivers the complete prepared-installed repair fixture, receipt-bound export route and eighth semantic smoke before stable-link replacement. At the scoped source checkpoint, its whole forecast was **18 paths / 1.91 days / 15.28 hours**, including all incurred planning/support, authoring, checks, reviews and PR preparation. The amended PR #120 changes 19 paths against main `9dfbe436`, adding `docs/using-pigboard.md` for the current smoke-count correction. The 18-path metadata and publication forecast retain that planning checkpoint; the actual PR footprint is 19 paths. This documentation correction is charged to ordinary support within the same 15.28-hour whole forecast. Only 0.72h remains below the strict two-day boundary; a concrete increase reaching 16h requires a same-scope split. All 42 original human cases remain NOT_RUN. Local tests, retained-evidence QA, exact-commit reviews, hosted CI/Codex, Director merge, live acceptance and activation remain separate gates.

The observed deferred rows retain their raw descriptions, IDs, links and date in publication metadata. They are not translated, rendered, forecast or assessed for delivery here. External prerequisites PGB-108, PGB-162 and PGB-163 keep their native keys and do not imply completed work.


## Earlier delivery record — dated history

**Dated pre-PGB-81 partial source checkpoint.** The material below retains the preceding 31-Story/136-group history; its pending source compositions are resolved in the scoped checkpoint above.

The owned 20-path PGB-136 change is composed onto verified merged PGB-138 main `b6b863476d9f07eee2702991f336def7ff38cd36`, tree `ebbfca1688f0aa954e29913dc72ceb6e74055fe0`. It preserves every incoming PGB-132/R1-27 and PGB-138/R1-30 contract. The residual PGB-132 source candidate extends the same producer to all 51 inputs in 14 families; final review, current checks and merge remain separate. The Director’s separately dated native inventory is 30 Stories/130 cases; this source does not claim a fresh all-ticket status audit or acceptance. Earlier development/source checkpoints remain historical in [publication.json](publication.json).

## What this release delivers

A company installs Pigboard in its own AWS account, previews the next eligible ticket and enables deterministic admission through the existing Jira-to-Cursor path. It includes the structured writer, validators, separate worker/job/Jira skills, human-requested rework, safe scheduling state and customer operating instructions needed for that journey.

The owner approved the base scope and the Pig Boss company/health addition. The owner approved the same-scope QA split on 15 November; each Story still requires its exact-base implementation plan and committed-code gates. The original 20-Story design and plan reviews remain historical evidence in the manager-design and manager-delivery review records. The current design delta has [product](../../reviews/pigboss-design-product.md) and [technical](../../reviews/pigboss-design-technical.md) CLEAN reviews. The historical 23-Story plan has CLEAN [product](../../reviews/pigboss-plan-product.md) and [technical](../../reviews/pigboss-plan-technical.md) reviews. Native publication is checked separately against the same contracts. [Structured contracts](ticket-drafts.json) are the current review input; [publication.json](publication.json) records the native keys and readback evidence. The earlier provider probe remains PARTIAL; installed acceptance has not run.

In scope addition: [Pig Boss multi-project identity and basic health](../../architecture/pig-boss-operations.md). [Deferred work is tracked in Jira](../../product/follow-on-roadmap.md), including the 50-project capacity plan.

Out of scope: worker monitoring, duplicate Cursor launches, launch proxy/dispatcher, transcript storage, cancellation/automatic recovery, SaaS, other-cloud packages, automatic Jira/Cursor provisioning, new QA engines, PR-environment provisioning, human-unblock producer and legacy runtime reuse. The product uses one customer configuration, customer-owned secrets/state and no Scuba Pig runtime access.

## Dated partial source plan — before PGB-81

The following 31-Story/136-group table and its file forecasts are retained history. The current scoped table is above.

## Ordered Stories (historical)

[Complete Story bodies and 136 prescribed groups](stories.md) · [53-requirement coverage and the 41 original scenarios](coverage.md). All Stories target `danielchappell/Pigboard`, `main`, one PR. Current stages and assignments are native Jira facts; this source mirror makes no fresh all-ticket status claim.

| ID / Jira Story | Complete usable outcome | Depends on | Estimated human days | Forecast files |
| --- | --- | --- | ---: | ---: |
| R1-01 / [PGB-71](https://scubapig.atlassian.net/browse/PGB-71) | Validate an editable work document | Reviewed design | 1.5 | 19 |
| R1-02 / [PGB-72](https://scubapig.atlassian.net/browse/PGB-72) | Check the complete prescribed test plan | R1-01 | 1.5 | 7 |
| R1-03 / [PGB-73](https://scubapig.atlassian.net/browse/PGB-73) | Write complete Epic and ticket YAML | R1-01, R1-02 | 1.25 | 8 |
| R1-04 / [PGB-74](https://scubapig.atlassian.net/browse/PGB-74) | Validate assignment and handoff evidence | R1-01, R1-02 | 1.75 | 18 |
| R1-21 / [PGB-99](https://scubapig.atlassian.net/browse/PGB-99) | Configure Pig Boss for multiple projects | R1-04 | 1.5 | 9 |
| R1-31 / [PGB-145](https://scubapig.atlassian.net/browse/PGB-145) | Check Jira read configuration before use | R1-21 | 1.53125–1.90625 | 20 |
| R1-36 / [PGB-150](https://scubapig.atlassian.net/browse/PGB-150) | Inspect named Jira issues from source | R1-31 | 1.24375–1.7875 | 18 |
| R1-05 / [PGB-75](https://scubapig.atlassian.net/browse/PGB-75) | Hand an implemented PR to review | R1-03, R1-04 | 1.5 | 10 |
| R1-06 / [PGB-76](https://scubapig.atlassian.net/browse/PGB-76) | Review and hand off the current PR | R1-04, R1-05 | 1.25 | 8 |
| R1-07 / [PGB-77](https://scubapig.atlassian.net/browse/PGB-77) | Execute prescribed QA helper steps | R1-02, R1-04 | 1.5 | 7 |
| R1-24 / [PGB-110](https://scubapig.atlassian.net/browse/PGB-110) | Publish prepared QA evidence safely | R1-04, R1-06, R1-07, PGB-108 | 3.34375–4.5625 | 20 |
| R1-30 / [PGB-138](https://scubapig.atlassian.net/browse/PGB-138) | Prepare mixed QA inputs and two boundary controls | R1-04, R1-06, R1-07, PGB-108, R1-24 | 1.0625–1.5625 | 18 |
| R1-27 / [PGB-132](https://scubapig.atlassian.net/browse/PGB-132) | Complete the prescribed QA input suite | R1-04, R1-06, R1-07, PGB-108, R1-24, R1-30 | 1.0625–1.59375 | 12 |
| R1-08 / [PGB-78](https://scubapig.atlassian.net/browse/PGB-78) | Execute prescribed QA and hand off complete evidence | R1-04, R1-06, R1-07, PGB-108, R1-24, R1-27 | 1.3125–1.8125 | 17 |
| R1-09 / [PGB-79](https://scubapig.atlassian.net/browse/PGB-79) | Request rework through the human’s assistant | R1-04 | 1.25 | 7 |
| R1-10 / [PGB-80](https://scubapig.atlassian.net/browse/PGB-80) | Preview ready work from a complete snapshot | R1-02, R1-04, R1-21 | 1.75 | 7 |
| R1-25 / [PGB-113](https://scubapig.atlassian.net/browse/PGB-113) | Validate repeated-parent repairs | R1-10 | 1.98 | 15 |
| R1-26 / [PGB-129](https://scubapig.atlassian.net/browse/PGB-129) | Reject conflicting completion receipts | R1-25 | 1.28 | 17 |
| R1-28 / [PGB-136](https://scubapig.atlassian.net/browse/PGB-136) | Preview own-ticket repairs | R1-26 | 1.92 | 20 |
| R1-11 / [PGB-81](https://scubapig.atlassian.net/browse/PGB-81) | Preview the complete repair order | R1-10, R1-25, R1-26, R1-28 | 1.53 | 20 |
| R1-12 / [PGB-82](https://scubapig.atlassian.net/browse/PGB-82) | Preview current Jira work with bounded reads | R1-11, R1-21, R1-31 | 1.75 | 12 |
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

Estimates include implementation, tests, docs and PR preparation by a developer familiar with this repository. Total for this partial 31-Story source set: **48.27–51.94 human working days** (48.26625–51.93500 before rounding), with separate release-level installed acceptance; this is effort, not calendar duration or an agent-token forecast. The per-slice estimates are planning judgments grounded in the exact contracts and current files, not measured implementation times. Independent review must challenge them. All Stories retain the 20-file limit. PGB-110 alone has the fixed-scope time exception recorded below; other Stories retain the ordinary time limit. Count deletions/moves and all supporting files; if a concrete implementation plan cannot fit, revise/split and re-review the plan before code. Do not hide supporting changes.

### Why this order

R1-01/02 deliver usable author checks before the writer depends on them. R1-04 delivers a usable receipt validator shared by workers and manager. R1-05–09 update the existing delivery roles without deploying them. R1-30 first supplies one usable mixed Story packet and precise missing-count/stale-proof controls; R1-27 then completes mechanical QA input preparation for the existing helpers/publisher before R1-08 composes final dispatch; PGB-129 adds no product dependency to this path. R1-25 first corrects the existing canonical chain validator on completed R1-10; R1-26 rejects conflicting current proofs; R1-28 then adds usable own-open-PR repair selection before R1-11 delivers the complete typed/stack preview. R1-10/11 give operators a complete zero-write policy preview; R1-12 connects that preview to current Jira facts. R1-13 runs preview in the customer’s AWS account. R1-14/15 give a tested state API plus inspect/reconciliation commands; R1-16 protects upgrade/removal. Only then does R1-17 enable safe fixture admission, followed by queued repairs and dependent-stack queueing. R1-20 checks the whole pinned release before real acceptance.

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

### R1-24 — 20 forecast files, 26.75–36.5 hours

`skills/qa-jira/SKILL.md`, `config/skill-bundle.json`, `test/qa-helper-contract.test.mjs`, `test/fixtures/qa-helper-case.mjs`, `test/cursor-environment.test.mjs`, `README.md`, `ARCHITECTURE.md`, `docs/workflow.md`, `docs/install.md`, `docs/using-pigboard.md`, `docs/handoffs.md`, `config/cursor/automations.md`, `docs/delivery/manager-r1/README.md`, `docs/delivery/manager-r1/plan-metadata.json`, `docs/delivery/manager-r1/ticket-drafts.json`, `docs/delivery/manager-r1/publication.json`, `docs/delivery/manager-r1/stories.md`, `docs/delivery/manager-r1/coverage.md`, `docs/product/coverage.md`, `docs/product/README.md`.

### R1-30 — 18 forecast files, 8.5–12.5 hours

`skills/write-pr-sized-stories/SKILL.md`, `skills/write-pr-sized-stories/references/basic-workflow-ticket.md`, `skills/implementer-entrypoint/references/handoff.md`, `skills/pigboard-pr-review/references/jira-handoff.md`, `docs/authoring.md`, `test/story-authoring.test.mjs`, `test/fixtures/qa-helper-case.mjs`, `test/qa-helper-contract.test.mjs`, `docs/using-pigboard.md`, `skills/qa-api/references/structured-steps.md`, `docs/delivery/manager-r1/README.md`, `docs/delivery/manager-r1/plan-metadata.json`, `docs/delivery/manager-r1/ticket-drafts.json`, `docs/delivery/manager-r1/publication.json`, `docs/delivery/manager-r1/stories.md`, `docs/delivery/manager-r1/coverage.md`, `docs/product/coverage.md`, `docs/product/README.md`.

### R1-27 — 12 residual forecast files, 8.5–12.75 hours

`test/story-authoring.test.mjs`, `test/fixtures/qa-helper-case.mjs`, `test/qa-helper-contract.test.mjs`, `docs/using-pigboard.md`, `docs/delivery/manager-r1/README.md`, `docs/delivery/manager-r1/plan-metadata.json`, `docs/delivery/manager-r1/ticket-drafts.json`, `docs/delivery/manager-r1/publication.json`, `docs/delivery/manager-r1/stories.md`, `docs/delivery/manager-r1/coverage.md`, `docs/product/coverage.md`, `docs/product/README.md`.

The historical split allocated the earlier 12–17h familiar-human envelope once across the two complete outcomes, then added split overhead once: A 6.65–9.525h plus 1.75–2.75h, B 5.35–7.475h plus 1.25–2h. Unrounded totals are A 8.4–12.275h/B 6.6–9.475h; the historical conservative forecasts were 8.5–12.5h/6.75–9.75h. The current PGB-132 forecast below includes the bounded consumer-control correction. They include prior allocated work, repairs, tests, guides, publication, independent reviews, installation binding, ordinary corrections and PR preparation. The former 18-path/10.75–15h PGB-132 forecast is historical, superseded by this reviewed split. No supporting file is hidden. Neither Story receives a time exception.

R1-30 implements only I01-story, I02-parameters and I11-stale-environment. The residual R1-27 candidate adds the remaining 48 through that same producer, ending with 51 inputs in 14 families; its full native body and H01/H02/H03 are preserved, with only R1-30 added as prerequisite. General guides route to the selected source catalogue, so those six guide files need no second change. The split plan SHA is `54e057ca2bdc36bc0cfb9ba4663b436a834429d7d1cfe02b5811026d315bc593` with two independent CLEAN plan reviews. Those verdicts do not cover committed code. PGB-132's owner decision 10765 helper/publisher evidence exception stays historical and specific to PGB-132. PGB-138's three human cases and PGB-132's original three remain NOT_RUN. No helper experiment or accepted-gap rerun is part of this slice.

### R1-08 — 17 forecast files, 10.5–14.5 hours

`skills/qa-entrypoint/SKILL.md`, `skills/qa-entrypoint/references/execution-record.md`, `skills/qa-entrypoint/references/cursor.md`, `test/fixtures/qa-helper-case.mjs`, `test/qa-helper-contract.test.mjs`, `test/cursor-environment.test.mjs`, `test/story-authoring.test.mjs`, `README.md`, `ARCHITECTURE.md`, `docs/workflow.md`, `docs/install.md`, `docs/using-pigboard.md`, `docs/handoffs.md`, `config/cursor/automations.md`, `skills/qa-jira/SKILL.md`, `docs/delivery/manager-r1/README.md`, `docs/delivery/manager-r1/plan-metadata.json`.

### R1-09 — 7 forecast files, 1.25 days

`skills/request-rework/SKILL.md`, `skills/request-rework/references/example.md`, `config/skill-bundle.json`, `test/request-rework.test.mjs`, `test/fixtures/human-rework.json`, `docs/using-pigboard.md`, `docs/workflow.md`.

### R1-10 — 7 forecast files, 1.75 days

`lib/manager/snapshot.mjs`, `lib/manager/availability.mjs`, `lib/manager/decisions.mjs`, `scripts/manager-preview.mjs`, `test/manager-preview.test.mjs`, `test/fixtures/manager-candidates.json`, `docs/manager-preview.md`.

### R1-25 — 15 forecast files, 1.98 days

`lib/contracts/receipts.mjs`, `test/receipt-chain.test.mjs`, `test/fixtures/handoff-chains.json`, `test/cursor-environment.test.mjs`, `docs/handoffs.md`, `docs/architecture/manager-handoff-contract.md`, `docs/delivery/manager-r1/README.md`, `docs/delivery/manager-r1/plan-metadata.json`, `docs/delivery/manager-r1/ticket-drafts.json`, `docs/delivery/manager-r1/stories.md`, `docs/delivery/manager-r1/coverage.md`, `docs/delivery/manager-r1/publication.json`, `docs/product/README.md`, `docs/product/coverage.md`, `test/qa-helper-contract.test.mjs`.

### R1-28 — 20 forecast files, 1.92 days

`lib/contracts/receipts.mjs`, `lib/manager/snapshot.mjs`, `README.md`, `lib/manager/decisions.mjs`, `test/story-authoring.test.mjs`, `test/manager-preview.test.mjs`, `test/cursor-environment.test.mjs`, `test/fixtures/manager-repairs.json`, `docs/manager-preview.md`, `docs/architecture/manager-handoff-contract.md`, `ARCHITECTURE.md`, `docs/delivery/manager-r1/README.md`, `docs/delivery/manager-r1/plan-metadata.json`, `docs/delivery/manager-r1/ticket-drafts.json`, `docs/delivery/manager-r1/publication.json`, `docs/delivery/manager-r1/stories.md`, `docs/delivery/manager-r1/coverage.md`, `docs/product/README.md`, `docs/product/coverage.md`, `test/qa-helper-contract.test.mjs`.

All nine original publication paths and the integrated `test/story-authoring.test.mjs` assertions belong to this Story. The private-history regression runs intact in `test/manager-preview.test.mjs`; the public receipt test file is unchanged from merged main. No supporting Task is excluded from its footprint.

### R1-11 — 20 forecast files, 1.53 days

`lib/manager/repair-policy.mjs`, `lib/manager/availability.mjs`, `lib/manager/decisions.mjs`, `lib/manager/snapshot.mjs`, `lib/contracts/receipts.mjs`, `scripts/manager-preview.mjs`, `test/repair-policy.test.mjs`, `test/fixtures/manager-repairs.json`, `test/receipt-chain.test.mjs`, `test/manager-preview.test.mjs`, `docs/manager-preview.md`, `docs/handoffs.md`, `docs/architecture/manager-handoff-contract.md`, `config/skill-bundle.json`, `scripts/install-cursor-skills.mjs`, `test/cursor-environment.test.mjs`, `docs/install.md`, `README.md`, `ARCHITECTURE.md`, `test/fixtures/manager-candidates.json`.

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
forecast is 26.75–36.5 familiar-human hours, including integration with merged main
`6595e645bd91cec263a5ee0eaf1a3db95e7b9109` and the coherent mock actor/access correction.
The earlier 12.5–15h and 14–15.5h forecasts remain dated history; the proposed 18h
ceiling was superseded and was never approval. No replacement hourly cap applies.
Report ordinary correction work and reforecast honestly. One PR, the exact 20-file
scope, all acceptance cases, documentation and independent review/QA/CI gates remain.
This decision grants no new product scope, release, deployment or activation, and
transfers to neither PGB-78 nor another Story. PGB-80's separate historical exception
remains unchanged. That source checkpoint contained 26 Stories/116 cases.

The historical PGB-110 forecast after R2 evidence/cause correction and integration with main335
is **20.5–25.5 familiar-human hours** (upper forecast3.1875days). The former16–18.75h
forecast remains historical. The additional work completes saved-filter resume proof,
six distinct H02 outcomes with independently frozen dependency/browser facts and
coherent joined control, then reconciles the new preview payload/configuration and
seven ordered installation checks. The actual10684 fixed-scope exception remains
unchanged, without an hourly cap; one PR, exact20paths, all cases and gates remain.
These preparation/validation changes do not claim successful instruction/human acceptance.

## Historical repeated-parent amendment, 15 November 2026

PGB-113/R1-25 implements the existing chain validator only. PGB-81/R1-11 retains all four AC, two TAC and 42 cases; PGB-82 still follows PGB-81 and R1-21. Native links preserve PGB-80→PGB-81 and PGB-81→PGB-82, adding PGB-80→PGB-113→PGB-81. The historical split forecast was 15 files/1.95 days plus 19 files/1.70 days. That source checkpoint contained 26 Stories/116 cases and composes the publisher, repeated-parent and current-proof consistency amendments. Native 25/110 figures in this receipt describe the recorded 15 November 2026 PGB-110/PGB-113 amendment-publication snapshot; Jira owns subsequent queue changes. Historical publication receipts and 20/23-Story reviews remain dated evidence; no manager deployment or human acceptance is claimed.

The independently reviewed F1 preservation repair carries the selected worker's
existing proof through final authorized-resume checks and reuses only the exact
selected current QA for a truthful consumed resolution. Current PGB-113 forecast
is 15 files/1.98 familiar-human days, with 0.23 days remaining from the frozen
066f24c candidate. Prior 468-test and 100-case results remain evidence for their
original inputs and revision; repaired-candidate checks and independent reviews
are required separately. Human acceptance remains NOT_RUN.

Current PGB-110 forecast is 26.75–36.5 hours (upper forecast 4.5625 days) under the actual comment 10684 fixed-scope exception, without an hourly cap. R3 completes causal histories and clocks with 63 preserved canonical specimens, 13 new counterparts and 76/19/57 packet usage accounting, integrated with merged main. Previous forecasts remain historical; all 20 paths, one PR and original gates remain. The source checkpoint then contained 26 Stories/116 cases and 53 requirements/41 scenarios; all three amendments and PGB-81's 42 human cases remain distinct. Native 25/110 figures record the 15 November 2026 PGB-110/PGB-113 amendment-publication snapshot; Jira owns subsequent queue changes.

The prior 26.5–36 familiar-human-hour forecast remains historical. The current forecast adds only 0.25–0.5h for F2 operator wording, regression and review evidence. The 0.25–0.5h private alignment completes already-planned preparation and is not added again; no new hourly cap or approval applies.

## Historical current-proof conflict amendment, 15 November 2026

PGB-129/R1-26 follows PGB-113 and precedes PGB-81. It rejects contradictory current completion observations in the existing offline preview. PGB-81 keeps all four AC, two TAC and 42 original human cases, including complete repair ordering and history projection. The new six cases add coverage; human acceptance remains NOT_RUN.

The reviewed forecasts are 17 files/1.28 days for PGB-129 and 20 files/1.89 days for remaining PGB-81, including checks, documentation, review and PR preparation. Earlier estimates remain historical. The PGB-110-first composition then mirrored 26 Stories/116 cases in source/native records. The earlier 25/113 source snapshot remains historical; no new native readback or all-ticket status claim is made. Native links 10704 (PGB-113→PGB-129) and 10705 (PGB-129→PGB-81) were read back; old links and all original PGB-81 fields outside its appended prerequisite were preserved. Publication does not establish acceptance, deployment or activation.

## Historical QA input-preparation amendment, 15 November 2026

PGB-132/R1-27 will complete PGB-78 PREP-01: complete fixed inputs for the existing direct helpers and standalone publisher, with actual helper evidence and an independently formed assessment. It does not deliver final dispatch, execute a schedule, choose a destination or supply observed results. PGB-78 keeps all original AC/TAC, cases and other body fields; only its new PGB-132 prerequisite is appended. Native parent PGB-66 and owner-approved/pgb-manager-r1 labels remain. Blocks links 10709–10713 retain the five upstream outcomes into PGB-132; 10714 adds PGB-132→PGB-78. Existing incoming links and PGB-78→PGB-87/PGB-90 remain. PGB-132 is ranked immediately before PGB-78.

The exact provisional plan (`d5cf649c727ee3c83edc016ce7fc02ad0524c6c2f83f59d31c1c3e56cb070a5a`) received independent product and technical CLEAN reviews. Actual-base binding inspected merged PGB-110 at main `19649b701646af065b583c8c603dca648d7413ca`, tree `c1732f35c206037a8632a7337739ba272e5db9c8`; the Director then authorized native publication and this same-scope split. [PGB-132 comment 10750](https://scubapig.atlassian.net/browse/PGB-132?focusedCommentId=10750) records the review/binding limits. Initial source layering used Core's reviewed 26/116 checkpoint before PR #98 merged. The Director subsequently verified actual merge `275aebf86affcd1ac974c8e6222d66679ac1cbd7` with the exact reviewed tree `e1e16b1221473f1754661ca4a56925621c21f31d`; this distinct merge receipt grants no PGB-129 product dependency. That dated source/native mapping was 27/119; every earlier PGB-110/113/129 readback remains dated evidence in publication.json.

Whole-Story forecasts include preparation, meaningful tests, docs, acceptance support, ordinary corrections, both independent review rounds and PR work: **18 files/10.75–15 hours** for PGB-132, then **17 files/10.5–14.5 hours** for PGB-78. Their union is 29 distinct paths, with six paths counted in both PRs. Eight hours is one familiar-human day; both remain below two days and retain the 20-file rule. The old PGB-78 20-file/13–15h and combined 42.11875–43.5875-day forecasts are historical. PGB-110's fixed-scope time/evidence exceptions do not transfer.

**Final PGB-78: Provisional — not ready for delivery.** After PGB-132 actually merges, rebind its concrete implementation plan to the actual tree and independently review it before coding. The current amendment records preparation and source publication only; no original R1-08 human case, instruction acceptance, hosted CI, merge, installed release or activation is claimed complete. Missing prescribed evidence follows the bounded verification rule and a human decision; preparation does not waive it.

## Own-ticket selection split — 15 November 2026

PGB-136/R1-28 follows PGB-129 and precedes PGB-81. Its reviewed contract has 3 AC, 3 TAC and six full human cases OC01–OC06. It selects an authenticated own-ticket repair on its current open PR with the existing output fields. Full typed proposals, stack ordering and first-PR repair remain PGB-81. All original PGB-81 fields are retained except its added R1-28/ai_qa_complete prerequisite; its 4 AC, 2 TAC and 42 complete cases remain unchanged and NOT_RUN. The six new human cases are also NOT_RUN. Runtime implementation, automated checks, committed-code review and delivery evidence are separate from this publication.

The independently CLEAN R2 split/first implementation plan is SHA256 `9ee1a33ad6862b62fb3f5639b2013041916a6292c4fc29456c07f9b0b4bb5694`, with manifest `4b61a0a13355f58c35314d57afb96e59421499bdaa005f7320c268fa8eab97d1`. Its historical whole forecasts were R1-28 20 paths/1.42 days and residual PGB-81 20 paths/1.45 days, total 2.87 days. The old 2.30-day whole-81 forecast required this split. The original own-selection source checkpoint total was 46.38 days against its development base; that is historical.

At the earlier residual-forecast checkpoint, PGB-81 was **20 paths/1.47 days**: 0.55 completed plus 0.92 remaining, including actual inherited-oracle/installed assertion migration. This corrected the proposed 1.57 arithmetic error without changing scope or cases. R2 plan SHA256 `09135d9ce5a60ca856906f31b1965e49ed00ba8ba00fb24dd0b2b3e03dc1193d` has both independent CLEAN plan reviews; the Director cleared that forecast for publication. The earlier metadata sum was **47.42625 days**: incoming 46.30625 − historical 1.89 + then-current 1.47 + own-selection 1.54. That checkpoint’s lower/upper range was **44.83–47.43 days** (rounded from 44.83250–47.42625). Other Story estimates and PGB-110 exceptions remain unchanged. Historical 1.45 split and publication readbacks remain historical.

Native PGB-136/id10596, parent PGB-66, was read back against the exact reviewed contract. Blocks 10715 adds PGB-129→PGB-136 and 10716 adds PGB-136→PGB-81; all older links remain. The original reformatted PGB-81 write failed CONTENT_LIMIT_EXCEEDED. A two-line insertion preserving the original formatting was then read back successfully; that failed attempt is not success evidence. The separate stage receipt records PGB-136 In Progress (comment 10772) and PGB-81 Blocked (10773), later than the contract audit. No runtime dependency on PGB-132 is introduced. Residual PGB-81 needs an actual first-slice tree, its concrete plan review and remaining gates before delivery. Merge, release and activation remain separate.

### PGB-136 integrated publication repair

At that checkpoint, R1-28 forecast **20 paths/1.54 days**, retaining the original 1.42 plus 0.12 for the bounded integration repair, preservation audit, affected checks and review/PR preparation. Its private-history regression moves intact to the existing manager-preview suite; `test/receipt-chain.test.mjs` returns byte-for-byte to merged main, and `test/story-authoring.test.mjs` checks the current 29/128 publication and preserved historical 28/122 checkpoint. The earlier 1.42/47.30625 forecast remains historical. The reviewed repair plan is SHA256 `962f7e7071501fe41f1c065c9d953c45c35e2665a57fc00e99d46287289659e8`. R1-11 stayed at 1.47 days; combined R1-28/R1-11 effort was 3.01 days. No runtime, fixture, contract or human-acceptance requirement changes.

### PGB-136 competing-completions amendment — 15 November 2026

R1-28 now forecasts **20 paths/1.92 days**: the prior 1.54 plus 0.38 for the bounded competing-completions diagnosis, repair, three fixed regressions and independent input audit, docs, verification, reviews, QA and PR preparation. The reviewed amendment is SHA256 `4c73b70a497d6a4f6b674618965f24f594a63be8a056c44fdb9abf68c211e739`. It requires coherent logical QA completion for each represented exact assignment before own selection uses a baseline or consumption; competing completions preserve the pending wait, while identical publications remain one result. The 33 original preview objects, seven history projections, six human groups, six OC02 controls, three installed cases and all 42 PGB-81 cases remain unchanged. Human acceptance remains NOT_RUN; preparation does not establish repaired-code verification or delivery.

At that competing-completions checkpoint, the metadata total was **47.80625 days**, and the exact lower/upper range was **45.21250–47.80625 days**, rounded to **45.21–47.81**. R1-11 remained 1.47 days; combined R1-28/R1-11 effort was 3.39 days. Earlier estimates, review and validation references above remain historical. The repaired exact commit still needs its prescribed checks, independent committed-code reviews and affected QA, current hosted CI and Codex approval, then Director-owned merge verification. PGB-81 implementation waits for that repaired base and affected independent plan rebind. No new product scope, activation, deployment or human acceptance is authorized.

### PGB-81 repaired-base forecast — 15 November 2026

The current R1-11 forecast is **20 paths/1.53 days**: 0.55 completed plus a conservative 0.98 further-work envelope before reconciling the newly completed preparation. The additional 0.06 covers amended binding/plan participation (0.02), intact guard migration (0.01), three full typed successor reports (0.01), affected audit/test/docs integration (0.01), and additional review/QA handoff (0.01). It preserves the earlier allocations, including the 0.08/0.07 overhead; concurrent reviewer elapsed time is not added.

At that 15 November checkpoint, the metadata total was **47.86625 days**, with an exact lower/upper range of **45.27250–47.86625 days**, rounded to **45.27–47.87**. R1-28 remains **20 paths/1.92 days**; combined R1-28/R1-11 effort is **3.45 days**. R1-28's existing 0.04-day docs/forecast allocation covers this bounded update through three paths already in its 20-path footprint. PGB-81 feature code, cases, tests and user guides remain with PGB-81. This forecast publication does not establish implementation progress or waive any remaining plan, code review, QA, CI, Codex or merge gate. Source/native counts, contracts and NOT_RUN human acceptance remain unchanged.

## Residual PGB-132 source candidate


The existing PR100 branch retains original `29ba86017ec8ce5c27392f699a9a387cc8902260`
ancestry through normal merges. The earlier explicitly authorized temporary PGB-138
prerequisite `3b3a26f5810ca12f5b7bf8b295a49c15397aad25` remains historical;
actual merged PGB-138 main `b6b863476d9f07eee2702991f336def7ff38cd36`
has the same tree `ebbfca1688f0aa954e29913dc72ceb6e74055fe0`.
The earlier local checkpoint composed Core136
`af5e4ccdcb3232bdfb6229d3fc50c0e664da7fe6`, tree
`76c3c14455165ed0848ff52926f99f79bf564f5c`; that binding remains historical.
The current authorized local stack composes corrected, independently CLEAN Core136
`f7730e8e954d443a54f85ba084810525bcb85508`, tree
`14778d1873b9a7368d91730056984ec1cd4940b8`, including actual merged
PGB-139 main `3ca2dc009acfae0a422fa97c5c7b2adef259ce8c`.
PR100 publication waits for PR107's actual merge. This does not claim that
Core136 or the residual candidate has merged.

The complete source catalogue is I01=2, I02=6, I03=2, I04=2, I05=5, I06=4,
I07=2, I08=4, I09=3, I10=7, I11=4, I12=2, I13=4 and I14=4. It preserves
the corrected trusted-count and coherent stale-environment controls, original
join mismatch, historical observation/blocker/authorization closure and current
clock after authorization. Default publication preparation is unchanged. Installed payloads retain the
coordinated Core136 source exactly; their intentional Core136 changes are not
residual PGB-132 changes. Inputs remain NOT_READY; outputs start empty.

The original independent PGB-132 QA report remains INCOMPLETE. Owner comment
[10765](https://scubapig.atlassian.net/browse/PGB-132?focusedCommentId=10765)
accepts only its specific actual-helper/dependent-publisher evidence gap. No
helper, Bruno, model or provider acceptance was rerun here. R1-27-H01/H02/H03
and R1-30-H01/H02/H03 remain NOT_RUN. Developer source checks, installed
evidence reuse, hosted CI/Codex, merge/release and activation are distinct.
The historical residual allocation on 15 November was 6.75–9.75h. The proof/size
repair checkpoint on 16 November was 7.5–11.25h, adding 0.75–1.5h for that repair,
affected checks, docs, ordinary correction and review/PR evidence. Its aggregate
upper forecast was 48.05375 days (47.86625 + 1.5/8); those checkpoints remain history.

Current PGB-132 whole residual forecast: **8.5–12.75 hours / 1.0625–1.59375 days**.
This 16 November correction adds 1–1.5 familiar-human hours for original
child-operation history, current forecast agreement, diagnosis/plan, tests/docs,
ordinary correction and independent review/PR evidence. Prior allocations remain
counted. The residual has nine authored paths within twelve maximum paths;
unchanged publication bodies are not edited merely to fill that list.
Dated 29-Story metadata aggregate: **45.49125–48.24125 days**, derived from all Story
minimum hours and upper days (upper 48.05375 + 1.5/8). Only R1-27's forecast changes;
other Story forecasts and source ownership stay unchanged.
Both I11 partial controls remove actual environment proof and preserve current
PR/response facts. I14 now refuses the complete projected ledger before dispatch;
the separate actual-canonical publication overflow control remains unchanged.


## PGB-78 source implementation checkpoint — 15 November 2026

Historical development checkpoint for commit `980be7188f3206abe64e7b4996f5f85ac3219514`;
its two independent code reviews later reached CLEAN. The final composition below
supersedes only its pending-upstream statements.

The accepted 17-path PGB-78 composer is being implemented on the Director-authorized
PGB-132 development stack `0959bc5ec401aeb90ab6c0f5fec3f9663d8afe7a`, tree
`991e23fff8ac436e4f0bcfb92e82df2743f5d628`, after two complementary affected plan
reviews were CLEAN. This checkpoint changes no Story body, prerequisite outcome,
publication count or other owner's history. The inclusive forecast remains
10.5–14.5 familiar-human hours, including docs/tests/reviews, ordinary corrections
and PR preparation. Source at this development base is 28 Stories/122 cases and
53 requirements/41 scenarios; actual later Core/PGB-132 composition must be
inspected before final binding, without guessed counts or merge hashes.

The source instructions compose current qa-jira preflight, full raw-work inventory,
ordered exact AI units, API-owned Bruno child, actual named-output binding, finite
nonoverlapping observations, full partial ledgers and one publisher final call.
Confirmed defect, causal upstream wait, inability and discussion remain distinct.
Human-only static work preserves exact pending humans without invented runtime
proof. Resume consumes existing authority and case-specific history; unknown
writes never trigger fallback publication or helper replay. Existing 51 inputs in
14 families remain preparation, including corrected trusted parameter-count and
coherent stale-environment controls, independent DB mismatch/join and typed resume
history. No new engine/schema/helper/provider/dependency is introduced.

Implementation evidence and exact reviewed revision are recorded in the delivery
handoff. A source check or installation smoke is not actual Grok High/helper/clock
acceptance. Required actual capabilities remain unproven at this checkpoint;
PGB-132's owner evidence exception does not transfer. Designated human NOT RUN
tracking alone adds no mandatory replay or actor gate. Actual missing required
behavior still needs its own bounded disposition. Final upstream composition,
required final tests, immutable installation binding, fresh committed-code reviews,
truthful acceptance disposition, current-head CI/Codex and authorized merge/tree
verification remain outstanding. No saved wiring, activation or deployment changes.


## PGB-78 final source composition — 16 November 2026

Historical bf10/c2f source snapshot. The corrected-prerequisite section below
supersedes its source-input/forecast binding; its original test/install evidence
remains historical.

PGB-78 now composes the reviewed development implementation with actual integrated
PGB-132 `87600339ac7c739c2c6066b6161abe5f3f92f319`, tree
`544d3a9969befef2a0fc6fdf7bb96b803ed32918`. Director's ancestry binding
`c2f935f944503a938c488d309c3790cbcb66cb3a` has that identical tree and preserves
actual PGB-136 main `58230d7779e7595738ca94643c3863d02c4b1483`. Both affected
PGB-132 code reviews and both PGB-78 final integration-plan reviews were CLEAN
before this composition. Normal merge ancestry preserves the development checkpoint.

The actual incoming delta has 24 paths and seven shared PGB-78 surfaces. Their
composition retains own-ticket repair/private manager-history boundaries,
public strict-current receipt validation, installed copy/route checks, all current
source publication records and the QA composer. All incoming nonowned files,
including Core's receipt/snapshot/decision modules and PGB-139 guidance, remain
unchanged. PGB-78's residual footprint is the accepted 17 paths. The full 51-input/
14-family producer and default publication prefix are unchanged except the reviewed
composer invocation view; no input, terminal oracle or runtime is added.

At this checkpoint source remained 29 Stories/128 cases and 53 requirements/41
scenarios; PGB-81 was 1.53 days and PGB-136 was 1.92 days, with the then-current
45.27250–47.86625-day aggregate and PGB-137 still pending. These are historical
source planning facts, not all-ticket completion. PGB-78 adds no Story, case or forecast revision. Its inclusive forecast
remains 10.5–14.5 familiar-human hours.

Final source checks, immutable same-release installation binding and fresh
exact-composition code review are recorded separately in the delivery handoff.
Actual Grok High/helper/clock behavior and resulting publisher acceptance require
their own evidence or authorized bounded disposition; source/installation checks
cannot supply it and PGB-132's exception does not transfer. Hosted CI/Codex and
Director's ordered publication/merge/tree verification remain separate gates.
No activation, saved automation, deployment or native ticket change is made here.


## PGB-78 corrected prerequisite composition — 16 November 2026

Historical held952/003 checkpoint; its next source suite never started. The
child-history composition below supersedes its pending diagnosis/current estimate
binding while preserving this source and setup applicability evidence.

The composer now includes reviewed PGB-132 correction
`003160f4fa4bb4ba744ee0d5a1af9a686033e38c`, tree
`e4a833ce1b4d0038e1866112678524100f04d9dc`, through normal merge ancestry from
PGB-78 bf10. Both exact prerequisite code reviews and both affected integration-plan
reviews were CLEAN before composition. Director retains hosted checks and ordered
publication/merge authority; local source composition does not claim their result.

Five overlapping paths carry actual I11 environment-proof removal, I14's complete
pre-dispatch projected-evidence budget, emitted-input regressions and precise guide
text. The reviewed composer invocation remains intact; all other 12 authored paths
and all incoming nonowned files remain unchanged. Existing default publication
inputs, I06/I13 history, original native bodies and all 51 IDs/14 families survive.
No result/assessment oracle, new engine, installed change or dependency is added.

At this checkpoint the aggregate forecast was 45.36625–48.05375 familiar-human
days, reflecting only
PGB-132's revised 7.5–11.25-hour residual forecast. PGB-78 remains 17 paths and
10.5–14.5 hours; 29 Stories/128 cases, 53 requirements/41 scenarios and pending
PGB-137 are unchanged. The earlier aggregate above is historical.

Final composed-source checks and a new applicability binding must establish the
actual producer/input/index hashes and identity of all 81 existing installed
payload files. The original bf10 installation receipt and its 22-entrypoint,
81-file, seven-smoke results retain their original identity; unchanged bytes permit
evidence reuse without a new installation or repeated setup. Source checks and
that applicability binding supply no actual Grok/helper/clock/publisher acceptance
or transferred PGB-132 exception. Fresh final code review, current-head CI/Codex,
actual acceptance disposition and ordered authorized publication/merge remain
separate. No activation, deployment or native ticket write is made here.


## PGB-78 child-history composition — 16 November 2026

The composer now includes reviewed PGB-132 candidate
`ac22d02365ad970d1ce627fb52f96501d161a2a6`, tree
`335d4ae8be3a6ab6752053212136e493f31fbcb0`, through normal merge ancestry from
held952. Both exact prerequisite code reviews and both affected integration-plan
reviews were CLEAN before this composition. Publication and merge remain ordered
under Director authority; local consumption does not claim hosted or merge results.

I02-child now supplies original submitted/unknown child-operation history before
the actual78 composer introduction. The generic composer suffix is unchanged;
other 50 invocation views, earlier I11/I14 corrections and all original bodies/
case IDs remain. This is supplied/mock past input, not a helper result or proof
of zero calls. At that dated checkpoint the source remained 29 Stories/128 cases and 53 requirements/41
scenarios, with PGB-137 pending. That dated metadata aggregate was
45.49125–48.24125 days. PGB-78 retains 17 authored paths and10.5–14.5 hours.

Final producer/input/index hashes, one composed-source suite, unchanged81-file
installed applicability and fresh committed-code reviews are separate evidence.
The original bf10 installation retains its source identity; exact byte/config/
dependency equality permits reuse of22/81/7 setup results, without reinstalling
or repeating smokes. Actual Grok/helper/clock/publisher behavior or authorized
disposition remains separate; no132 exception transfers and no activation follows.

## Read-configuration increment — 16 November 2026

PGB-145/R1-31 follows only PGB-99/R1-21 and adds a prerequisite to final PGB-82/R1-12 after its existing PGB-81/PGB-99 prerequisites. The complete source/copied local checker and safe change preview own exactly 20 paths and 12.25–15.25 familiar-human hours, including tests, docs, ordinary fixes, reviews and PR preparation. Its two independent exact-e54 plan reviews are CLEAN; implementation evidence and fresh committed-code review are separate. Human acceptance is NOT_RUN (0/4); local checks are not release readiness.

The dated e54 source was partial29/128. This A-only composition is partial30/132 against the dated PGB-145 native publication snapshot31/134; PGB-137/R1-29 source composition remains pending. R1-32 is separate parallel work and is not composed or counted here. The prior checkpoint/native30/130 is retained in publication history.

This increment adds no Jira reads, resolver, provider proof, policy or PGB-144 decision. All original PGB-82 5 AC, 3 TAC and 4 human cases are preserved. Subsequent acquisition, receipt and integrated preview work remains **Provisional — not ready for delivery** outside this PR. Final PGB-82 retains supported initial defaults and measured source/copied small-domain acceptance. Current stage, exact revisions, local checks, independent reviews, human outcomes, hosted CI, merge and activation are distinct gates; Jira remains the one active queue.

## PGB-150 source inspection catalog — 16 November 2026

The current partial source composition adds the complete [R1-36 Story](stories.md), original five acceptance criteria, four technical constraints and four human groups to the State checkpoint. The source inspection API and fixture packet include the reviewed PGB-156 repair at merged runtime commit `fd5b04eaa2cd7265f4528a8be37beb75ff463254` (tree `879a3382edafc52989446a67d93508a16e44bec5`); this catalog child owns ten publication and guard paths. The final parent comparison covers eighteen paths: eight runtime and ten catalog. It retains every State repair-preview amendment and the three PGB-150 source/repair amendments as complete dated objects. PGB-155/R1-41 is a native-only child with one NOT_RUN human group; its own source entry remains pending.

The source-only R1-36 forecast is **9.95–14.30 hours** (1.24375–1.7875 days). The partial source set is **48.26625–51.93500 days**. Including the PGB-155 catalog child once gives **48.94750–53.01625 days**; including PGB-152 and PGB-154 once gives **49.76000–54.40375 days**; including the native-only PGB-156 repair once gives **50.45375–55.57875 days**. PGB-155 is estimated at 5.45–8.65 hours; PGB-156 at 5.55–9.40 hours, including review and support. These are scoped source-stream forecasts, not an exhaustive native Epic estimate. Prior 9.70–13.85-hour and 48.23500–51.87875-day values, as well as older 11.25–15.70-hour and 48.42875–52.11000-day values, remain dated history.

Verified native PGB-155 ID 10615 has PGB-145→PGB-155 link 10752 and PGB-155→PGB-150 link 10753. The native-only PGB-156/R1-42 repair has ID 10616, PGB-145→PGB-156 link 10754 and PGB-156→PGB-150 link 10755; its one five-path outcome fixes the four validated invocation boundaries. Existing PGB-145/PGB-152/PGB-154→PGB-150, PGB-150→PGB-147 and PGB-148→PGB-82 links remain. PGB-150 keeps its original 5 AC, 4 TAC and 4 human groups; PGB-147 keeps its original source/copied contract and later installed CLI/copy responsibility. PGB-137/146/147/148/149/151/152/153/154/155/156 source entries remain uncomposed. Dated native31/134 and34/144 snapshots, State30/132 and PGB-149 recorded comparison are historical, not a fresh native inventory. PGB-82 original criteria/cases and PGB-110 specific exception are unchanged.

PGB-150 human acceptance remains NOT_RUN (0/4), PGB-152 NOT_RUN (0/2), PGB-154 NOT_RUN (0/1), PGB-155 NOT_RUN (0/1), and PGB-156 NOT_RUN (0/4). Local guard checks, independent committed-code reviews, current hosted CI/Codex, actual main integration and activation are distinct gates. The [source guide](../../manager-preview.md) covers normal use, partial results and source-damage recovery; the [publication record](publication.json) binds each historical receipt and the current reconciliation.
