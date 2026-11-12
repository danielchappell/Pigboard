# Cursor environment installation review record

Scope: deterministic pre-agent Pigboard skill installation outside Plexus. Reuses the
reviewed external preparer and minimal invocation. Plan: ../plans/2026-11-12-cursor-environment-install.md.

## Plan gate

Plan SHA-256: 9ec5e24d22671516b87e696ae7b2d02c8b6f3ebf9a9797bdc499f514b10470c0.
Two independent fresh Sol High reviewers returned CLEAN:
- env_plan_product: 6/6 files, 12/12 requirements, 6/6 contracts; second sweep.
- env_plan_technical: 4/4 assigned files, 6/6 preparation tests, 10/10 entrypoints,
  2/2 dependency declarations, 14/14 contract areas; second sweep.
Each independently assessed all seven principles.

## Committed-code gate

Initial commit 133505b: technical reviewer CLEAN, product reviewer NOT CLEAN.
Confirmed P2: containment appended '/' to filesystem root, failing to recognize
that '--root /' encloses the application. Fixed the same helper in both installer
and preparer using path.relative; added public-function regression assertions.

Final code: 12675375bc8710f197f9ceba43f56a2d845fbd0d, baseline
65299c319b449e310d854cf6d8710d3f2e4316b2. Two independent reviewers returned CLEAN:
- env_code_product: 8/8 files, 8/8 requirements, 9/9 contracts, full second sweep;
  independently reran 9/9 focused tests and examined all four fix files.
- env_code_technical: 8/8 files, 8/8 requirements, 6/6 contracts, full second sweep;
  independently reran 207/207 repository tests, shell syntax and diff checks.
No unresolved in-scope findings. Reviewers independently assessed all seven:
intuitive stable path; discoverable prerequisites/recovery; no repeated setup;
deterministic token savings; corrected filesystem and credential boundaries;
machine receipts plus human guide; atomic publication and honest readiness state.

Author validation: 207/207 tests, 9/9 focused cases, shell syntax and diff checks.
Actual npm ci installed the locked dependencies under a temporary external directory;
verifyRelease checked 10 entrypoints, 23 source hashes, pg.Client and Bruno 4.2.1.
Both code reviewers independently rechecked that retained real installation.
The skill source was 65299c3; subsequent code commits do not change the skill bundle.

## Publication and cloud test

Published code revision 1267537 to private GitHub repository danielchappell/ski-stack,
branch codex/cursor-pigboard-skills. No merge or release was performed.
Saved personal Cursor environment 9cb332e1-dee7-11f1-ba91-f63b1661ac50, Plexus,
with the versioned install command pinned to that revision. No agent onboarding.
Start Script remains empty; automation 65bdee88-dee5-11f1-ba91-f63b1661ac50 inactive.
Draft manual Build bld-20261112-6e72c6e7-a274-4476-9608-1f74512a6afe started.
Cloud outcome: Install failed. Plexus checkout 9c7f525 succeeded; the versioned
installer could not fetch the private Pigboard source and exited 1. The revision
was confirmed published with git ls-remote. Cursor created a snapshot but marked
it Install failed; this is not a usable or verified skill environment. Screenshot:
outputs/cursor-environment/build-install-failed.png. No activation occurred.

## Authentication follow-up

Optional dedicated read-only deploy-key support, agreed scope: same private repository,
no write access, environment secret, temporary restricted file, pinned official GitHub
host key, strict SSH over 443, no raw secret inherited by child processes, exit cleanup.
Two independent Sol plan reviewers returned CLEAN for the task-message delta before
implementation: product 10/10 requirements and 4/4 contracts; technical 12/12 requirements
and 3/3 contracts, then accepted fixed-source URL simplification. Both second-swept and
independently assessed all seven principles.

Exact code 4e71014415679a04a935d763f1b759fea7651b63 vs 1267537: both independent Sol
code reviewers CLEAN. Product 5/5 files, 8/8 requirements, 8/8 contracts; technical
5/5 files, 8/8 requirements, 7/7 contracts. Both second-swept, assessed all principles,
verified official GitHub host-key evidence and checked unchanged preparation consumers.
Product independently ran 10/10 focused tests; technical independently ran 208/208 full
tests. Shell syntax and diff checks passed. No unresolved in-scope findings.

The actual key registration and Cursor secret remain pending explicit access approval.
No key has been generated or granted. A successful authenticated cloud Build and its
verification receipt remain required. Local CLEAN and tests are not cloud success,
automation activation or end-to-end Jira acceptance.
