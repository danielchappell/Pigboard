# Prescribed API/database QA adaptation

## Delivered artifact and provenance

Prepared three portable skills under `skills/qa-api`, `skills/qa-bruno` and
`skills/qa-database`. Their contract executes prescribed cases and exact skills,
permits evidence reasoning, and blocks missing prerequisites without recovery work.
QA entry-point reporting/transitions remain separate. Frontend skill work is
[PGB-61](https://scubapig.atlassian.net/browse/PGB-61); previews remain PGB-60.

Source: `danielchappell/ai-working-kit` default branch, checked 12 November 2026,
commit `5bef5cf140bd5ea92e6600f0ff2a0be726e4c7ac`. Source instruction blobs:

- qa-api: `e257422989ccd6a05de23dc08b7619e50da55e31`
- qa-bruno: `70f94b95cc7fd86c20f3ce569050b448b14d28ee`
- qa-database: `ae6c9c428db02df0ab12edbb975087e9a268e308`

Changed instructions only. Both packages/locks and PostgreSQL reader are byte-identical
to source. Source helper tests were hash-verified and run in an isolated temporary
copy, not distributed: ordinary Pigboard tests must not require pg installation.
The preserved database package's developer `test` script refers to those upstream
tests and is not a supported command in the distributed runtime-only copy.
The optional AWS access/tunnel composer and its sibling skills are deliberately
excluded. This uses the source's standalone supplied-access reader path.

The instruction changes add explicit inputs/results, exact case selection,
requirement-bound expectations, ordered dependencies, current revision checks,
defect versus prerequisite classification, blocker precedence and human recovery.
They remove discovery, missing-test authoring, automatic dependency/access repair,
tool substitution and exploratory regression additions. They preserve safe Bruno
execution, read-only database identity/TLS, bounded queries and sanitized evidence.

## Plan review

Two fresh independent Sol High reviewers returned CLEAN for plan SHA256
`ef42900466545b74a6b26fe73e944b11708b0fe98e28463979ba2c1b7040b6f0`.
Product reviewer covered 4/4 sections, 8/8 contract bullets, 12/12 workflow constraints,
3/3 source skills and relevant resources. Technical reviewer covered 4/4 sections,
3/3 source skills, 6/6 resource contracts and 8/8 workflow surfaces. Both performed
a second sweep and independently assessed all seven principles. Neither verdict
establishes implementation or live acceptance.

## Executed validation

- All three skill-format validators passed.
- Pigboard `npm test`: 198 passed, zero failures.
- Unchanged upstream PostgreSQL reader suite: 12 passed, zero failures. This covers
  scoped connection/TLS, privileged-role refusal, read-only execution, cleanup
  failures, visible row limits, process deadlines and copied-module resolution.
  It uses mock clients/fictional targets, not live PostgreSQL.
- Locked Bruno 4.2.1 local HTTP fixture: prepared test-script requests produced
  2/2 passing checks, a deliberate state mismatch (1/2 passing), and expected HTTP
  403 (1/1 passing). A no-check request exited zero, demonstrating why zero checks
  must block. A missing request exited 5 without an HTTP request. Exactly four
  local requests were observed in that fixture round.
- An earlier assertion-only fixture exposed a QuickJS initialization error in
  the locked CLI. The raw output mixed that engine error with assertion results.
  This remains a runtime limitation: the skill now explicitly classifies engine
  failure as BLOCKED even if the report says PASS/FAIL. The working test-script
  fixture is separate preparation evidence, not a workaround QA may invent.

Exact skill/resource hashes, fixture definitions/results and the original engine
failure are retained in `2026-11-12-prescribed-qa-evidence.json`. Temporary execution
workspace: `/tmp/pigboard-qa-adaptation-20261112`; source reader tests run there with
its locked pg 8.23.1. Dependencies were installed during author validation, not by
a QA run. Network/loopback permission restrictions were resolved for local validation;
they are not product failures.

## Author assessment and limits

Intuitive: explicit results identify what happened and who must resume. Discoverable:
each skill lists required inputs and its preparation command. Delightful: no repeated
setup or open-ended recovery. Token saver: named cases/tools and bounded execution.
Secure: preserved scope, identity, TLS and evidence restrictions; no new permissions.
Agents are equal: portable contracts work without a hosted coordinator and remain
human-readable. Dependable: no pass from tool success alone, stale evidence, skipped
cases or uncertain cleanup. Human and agent responsibilities remain explicit.

This validates local instructions and helper behavior, not Cursor execution, live
credentials, a preview environment, Jira transition automation or human-review
acceptance. Source repository publication and package/runtime upgrades are outside
this adaptation. A fresh independent review of the committed artifacts follows;
its verdict will be recorded separately. Local skill installation follows that gate.
