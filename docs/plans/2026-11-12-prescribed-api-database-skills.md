# Prescribed API and database QA skills

## Scope and source

Adapt the existing API/database skills to the accepted Jira and Cursor workflow.
Reuse the decisions in `2026-11-12-cursor-automation-mvp.md`: the ticket supplies
all cases and named skills, implementation prepares executable artifacts, review
checks expectations independently, and QA executes and judges evidence. No test
design, environment repair, alternative-tool discovery or speculative retries.

Source checked on 12 November 2026: `danielchappell/ai-working-kit`, default branch
commit `5bef5cf140bd5ea92e6600f0ff2a0be726e4c7ac`. Import current `qa-api`,
`qa-bruno` and `qa-database` instructions, Bruno's locked package, and the standalone
PostgreSQL reader and locked package. Validate with the source reader tests in an
isolated temporary copy so ordinary Pigboard tests do not acquire a pg dependency.
Keep imported executable resources byte-identical to source. Do not import the optional AWS credential/tunnel composer:
this MVP receives ready access, and its AWS sibling skills are not installed.
The standalone reader is an existing supported source path, not a replacement tool.

Maintain portable adapted copies in this repository's `skills/` and install those
same three folders locally after validation. No upstream push, PR, merge, hosted
automation or live target execution is part of this skill-authoring request.
The frontend computer-use skill and preview provisioning remain separate tasks.

## Changes and contracts

- `qa-api` validates the prescribed API case inputs, interprets actual response
  and required downstream evidence, and invokes only the execution skills named
  in the handoff. No deriving extra cases, substituting tooling or changing tests.
- `qa-bruno` executes reviewed requests/assertions with the pinned safe CLI.
  Preparation installs dependencies before QA; missing dependencies block QA.
  Inspect supplied scripts/targets for permitted actions; a mismatch blocks rather
  than authoring a correction. Preserve ordered dependencies, actual assertion
  counts, secret redaction and exact artifacts. No implicit collection-wide run.
- `qa-database` executes supplied bounded parameterized read-only observations
  through the named engine/tool, compares with explicit expectations and returns
  evidence. Preserve identity/TLS/read-only checks, limits, baseline causality and
  cleanup. Do not discover schema, write queries, narrow truncated queries, create
  fixtures, start tunnels or repair credentials during QA.
- Each skill accepts case IDs and requirement references, exact named skills and
  executable artifacts at the reviewed revision, expected values, target revision,
  prepared identity/data, allowed actions, evidence destination, order and cleanup.
  Bind returned IDs only as prescribed. Missing/ambiguous required inputs block.
- Return per-case PASS/FAIL/BLOCKED/NOT RUN, expected/actual, source and deployed
  revisions, sanitized evidence and remaining work. BLOCKED takes precedence over
  observed defects; preserve both. A product assertion failure can allow remaining
  independent prescribed cases; dependent cases remain NOT RUN when their required
  state is absent. No case invention or execution after a prerequisite blocker.
- Expected permission denial may pass. A zero-assertion run, missing observation,
  stale environment, truncated evidence needed for completeness, unexpected access
  failure, or unconfirmed cleanup cannot pass. Tool INCOMPLETE maps to BLOCKED.
- Reason about evidence and causality within the cases. Predeclared finite
  observation intervals for asynchronous requirements are allowed; ad hoc retries
  or recovery are not. Never replay an uncertain write. Perform only already
  authorized bounded cleanup, record uncertainty and stop for a human.
- Helpers return results; the QA entry point owns publishing and Jira transitions.
  Helpers cannot approve a whole Story, merge a PR or move a ticket themselves.

## Validation and delivery

Review this bounded plan against the source and accepted contract before edits.
Validate all three skill formats, relative references and exact source-resource
hashes. Run existing PostgreSQL helper tests using its pinned local dependency;
run the existing repository checks because new skill packages are being added.
Exercise a small local-only Bruno fixture with prepared passing/failing requests
and a missing-prerequisite scenario. No credentials or external API/database.
An independent behavioral pass must examine valid API/db execution, permission
denial, defect plus blocker, zero assertions, truncation, stale revision, missing
artifact and uncertain writes. Assess instructions, not just matching their text.
Record artifact hashes, actual results and limitations separately from reviews.
Install only the reviewed copies; update the active workflow/queue with exact state.

## Seven principles

- Intuitive: case status and next human action are readable without tool internals.
- Discoverable: skill descriptions and explicit required inputs show what to supply.
- Delightful: prepared artifacts avoid repeating setup and discovery on every run.
- Token saver: fixed cases, no recovery loops, bounded evidence evaluation.
- Secure: preserve scoped targets, read-only identity, TLS and sanitized evidence;
  instructions complement existing helper checks rather than replacing them.
- Agents are equal: portable explicit inputs/results also readable by humans;
  Cursor model selection remains outside these reusable skills.
- Dependable: no unsupported pass, stale evidence or hidden unexecuted cases;
  blocked recovery stays human-owned and helpers do not claim stage transitions.
