# Give the owner working private access

**Delivery-ready Story and implementation plan; implementation in progress.** Both independent plan reviewers completed CLEAN reviews on the exact source artifact SHA256 `13ab111069ffca8599b04818600961e665355b57f595b52ca4f91ad0c080df76`. This repository copy carries execution evidence separately below. Main `f533fbe7f015dc5e69140d706d633b73b8e6a3da` was freshly verified on 1 October 2026. Clean worktree `ski-stack-private-owner-access`, branch `codex/pig-private-owner-access`; PR #35 and its local wording edit remain preserved elsewhere.

## Story

Problem to solve

The pilot has no running private host. Its production image also omits files needed at startup. The owner needs working private access before a separate agent can use the service.

Acceptance Criteria

- The owner can inspect their current identity and grants through one dedicated private Pigboard Machine.
- An unissued caller credential is denied without exposing the owner's identity.
- The same owner credential, generation and grants work after a service restart.
- Verified database access works after observed Neon sleep, or the bounded failure is reported honestly.
- First-deployment failure restores the previous no-serving state through a documented recovery procedure.

Technical Acceptance Criteria

- Reuse existing v2 owner migration, bootstrap, recovery and caller self-inspection without changing their authority contracts.
- Package the required SQL and prove the actual production image starts on one shared CPU with 256 MiB.
- Use only the pinned direct Pigboard Neon Free root and restricted runtime login on the dedicated private Fly app.
- Keep owner/provider credentials outside the Machine and normal caller; keep the runtime credential outside source and logs.
- Preserve private ingress, exact app/IP pin and a verified owner-specific network route.

Testing Strategy

- Manual QA: inspect the owner through `caller:me`, try an unissued token, restart the Machine and inspect the same owner again.
- Access and setup: use the dedicated Pigboard owner/runtime credentials and protected token file with its verified private peer.
- Observation: compare text/JSON identity, generation and grants; record root diagnostic and private Fly state separately.
- Automated regression: run existing owner/Neon/caller tests, the actual production-image startup/liveness check, and the helper's consequential cleanup/failure matrix.

## Approved scope and design reuse

The owner explicitly approved private owner access followed by separate agent access on 1 October, saying to continue without routine stops. This replaces the prior combined setup-plus-selector batch target. **At most two total PRs; regroup after the second complete live outcome.** Board selection is outside this batch. New batch PRs **0/2**; original six product outcomes implemented/live **0/0**. Plans, tests, docs and reviews consume these same owning PRs, not separate prerequisite PRs.

Reuse the frozen independently reviewed recovery architecture `0e222333e9c5b4e565dd0dd320e7e1941915cb6e2682f7235f3191396aeaf15b` and existing first-host, owner/root/TLS/private-caller contracts. This changes delivery boundaries, not component responsibility or authority. The later agent slice owns v3/shared-lock/current-grant ordering and its complete lifecycle. This owner slice uses current v2 unchanged. The earlier combined setup plan remains NOT READY and historical; neither its estimates nor CLEAN architecture substitutes for this exact plan gate.

The existing host owns only `/health` and `/v1/authority/me`. Runtime holds restricted SQL credentials; the protected operator retains owner URL and project API key; the owner caller holds only its bearer and network peer. No Jira/Cursor work, service-admin API, agent enrollment, selector, runtime authority write, dependency upgrade or new shared infrastructure is included.

## Ordered delivery queue

| Position | Complete outcome | Dependency | Stage and boundary |
|---|---|---|---|
| 1 | Working private owner access | Exact plan/code reviews, required checks, secure live handoffs | This reviewed Story, twelve paths, author estimate 8.5–13h |
| 2 | Separate one-agent enrollment/recovery/revoke and private access | PR 1's tested host/root/owner setup; exact agent plan, v3 migration and live denial proof | **Provisional — not ready for delivery**; candidate thirteen paths from corrected combined plan excluding packaging/check/Fly config; independently size after PR 1 evidence |
| Stop | Owner regroup | Both outcomes live-verified, or a real access/size decision invalidates the path | No automatic third PR or selector work |

The full agent lifecycle stays as reviewed: protected durable identity/token before activation; current schema/owner validation; exact active-request reconciliation before new-mutation generation CAS; active-first bounded listing with over-bound history recovery; full credential/grant revoke; separate network handoff/removal. Ordinary agent credentials cannot administer the human owner. Author candidate estimate for that reduced slice is 10.5–15.5h, not accepted readiness evidence. Initial independent technical review estimates 12–18h: the future Story is not promoted now and its size remains a real regroup gate after PR1 evidence.

## Exact first-PR inventory: twelve paths

| Path | Required change |
|---|---|
| `Dockerfile` | Copy immutable SQL files imported by the host; keep pinned Node image, production dependency installation and unprivileged user. |
| `scripts/check-pigboard-production-image.mjs` | Actual Docker build/start/health verification using synthetic credentials and uniquely owned disposable resources. |
| `test/pigboard-production-image.test.js` | Controlled subprocess/health seam exercises consequential ownership, ambiguous run, timeout/exit and cleanup failure behavior without requiring Docker in ordinary unit checks. |
| `package.json` | Discoverable `check:pigboard-image` command; no dependency change. |
| `fly.toml` | One shared CPU/256 MiB; retain dedicated app, private ingress and one-Machine controls. |
| `docs/hosted-pigboard-first-service.md` | Current image check, ordered owner setup/private route, 256-MiB deploy, first-deploy recovery and separate evidence. |
| `docs/hosted-pigboard-authority.md` | Reconcile current owner-only v2 readiness and the approved later operator-managed agent procedure; no claim agent commands exist yet. |
| `README.md` | Image check/prerequisites and current owner access procedure, with agent/selector limits. |
| `docs/designs/s02a-first-service.md` | Dated approved pilot authority/delivery decision; mark superseded API/rotation prerequisites and older estimates as historical; keep later audience/effect gates. |
| `docs/designs/hosted-fly-neon-free.md` | Reconcile its selected first-pilot memory/authority statements with the dated approved 256-MiB owner-first decision; retain later coordinator/load/audience/effect/recovery gates. |
| `docs/delivery-plan.md` | One current two-PR queue and honest implemented/live counters; retain older evidence as historical and hold PR #35. |
| `docs/plans/pigboard-private-owner-access.md` | This Story/plan, author assessment and exact independent/code/check/live evidence, without a separate review PR. |

If another path is needed, count and recheck size before editing. The actual image check is the behavior-level regression for the omitted-SQL startup defect; existing real-session/HTTP/caller tests cover unchanged contracts. One additional test file checks the new helper's resource-deletion and failed-outcome policy through controlled subprocess/health results, not Docker internals or mirrored argument assembly.

## Image-check contract

The command accepts only `--help` and `--format text|json`; it has no caller URL, token or deployment override. Read the existing nonsecret runtime pin and use a clearly synthetic `pigboard_app` URL matching it. Pass that synthetic value only to the disposable Docker container, never a live credential. The host startup and `/health` make no database call. Check only liveness here; root and authorization remain separate real PostgreSQL/live proof.

Build the actual repository Dockerfile under a unique UUID tag/ownership label. Start the image's normal CMD as its normal unprivileged user, with one CPU/256-MiB, a unique container name and loopback-only ephemeral published port. Discover and validate that port through the exact owned container. Request `/health` with redirects refused, a short per-request deadline and a fixed 20-second startup window. Success requires HTTP 200 and exactly the expected version/live response, not a process existing. Missing Docker, build failure, timeout, early exit or unexpected health fails the check rather than skipping. Bound Docker operations; do not alter bounds merely to turn failure green.

Record image identity and stage results, not synthetic URL, driver/container raw logs or inherited environment. Capture child output internally and print safe stage/status/exit codes. Never forward a real runtime environment into the build/container. No network/credential directories are mounted. The isolated working tree contains only reviewed source and documentation; normal Docker ignore excludes credentials, local dependencies and test data.

In `finally`, inspect ownership before removing only the UUID-labelled check container and its unique image tag; never prune or manipulate unrelated Docker objects. Ambiguous `docker run` failure is reconciled by exact-name/label inspection. Report cleanup failure independently and leave overall failure even if health passed. Preserve meaningful build diagnostics through safe stages; do not expose raw logs to simplify troubleshooting.

The orchestration exposes a test-only dependency seam for bounded Docker subprocess results and health responses; CLI arguments cannot choose a Docker executable, resource identity, credential or URL. The production wrapper uses the real Docker binary and fixed bounds. The regression matrix verifies observable outcomes: (1) a foreign ownership label causes no destructive command and a failed result; (2) a lost run reply reconciles the exact owned object and cleans it without treating the run as successful; (3) startup timeout and early process exit both fail and remove only owned resources; (4) a removal failure makes the overall result failed even after successful health. Tests inspect all destructive targets, not only an expected success call. Run these tests before the actual image regression; ordinary `npm test` does not require a Docker daemon.

## Live setup and recovery

Read-only evidence: dedicated Fly app has zero Machines, one private Flycast address and the Pigboard organization's named peer. Its owner mapping/active route remain unaccepted. The dedicated Neon project/production branch match the pins. No private owner URL, project-scoped Neon key, runtime passfile or owner token is currently under the known Pigboard custody directory. Use the same reviewed protected-file interfaces; do not invent credentials or bypass prior computer-use approval rejections through another tool.

Prepare exact operations before requesting the narrow missing credential handoff. Credential entry/creation through a browser follows its action-time confirmation/user-handoff rules. Continue independent implementation/review/check work while that handoff is pending. Do not enter a new credential, paste a secret into chat, read browser secret output into logs, use a global account key, or change Safeguard.

1. Verify dedicated Neon Free project/production endpoint and obtain protected owner URL/project-scoped key outside source. Use the merged `owner:runtime-login` command to create/file-sync/verify only the fixed restricted `pigboard_app`; reconcile any uncertain result before retry. Do not create a Neon Console role with inherited superuser membership.
2. As owner, run the existing disposable runtime-role fixture once, then the pinned `neon:preflight`; record identity/TLS/effective privileges and clean up only that fixture. Verify absence afterward. Use libpq 17+ and a protected passfile; no password arguments/environment dumps.
3. Migrate v2 and inspect; bootstrap the named human only if verified absent. Use existing protected owner token delivery. If owner exists, preserve it. Lost commit/file delivery follows the current inspect/guarded recovery contract, never a blind bootstrap retry.
4. Confirm exact app, Pigboard organization, private address and zero Machines before staging only the restricted runtime URL as a Fly secret. Never stage owner URL or Neon key. Deploy the reviewed image with no public IP and HA disabled; inspect actual one-CPU/256-MiB single Machine/region/image/checks.
5. Verify same-Machine pinned root/TLS/runtime identity and read-only authority. Map the existing dedicated peer to the named owner's principal only after verification; establish its private route and run the source-pinned `caller:me` with the owner bearer. Keep private peer config/token out of source/chat/logs. A matching IP alone is not accepted route proof.
6. Send one correctly shaped protected unissued token and verify valid denial without owner identity. Compare owner identity/generation/grants before and after restart. Observe actual Neon compute suspension and record bounded wake/root and caller proof afterward; do not infer sleep from timeout.
7. Record exact commit/image/Machine/peer mapping and all acceptance results separately. Recheck one Machine and no public IP. No sole-owner credential rotation just for QA; unchanged recovery already has real-session regression, and unrun live recovery remains labelled.

There is no prior serving image. If first deployment fails, stop/destroy only the newly created dedicated Pigboard Machine to restore no-serving state; retain verified schema and protected credentials. Record remaining staged secret/private address, not a claim they were removed. If image replacement is later needed, record the prior image and verify the resulting tree/root/grants; do not reverse migrations or reuse an incompatible operator. No new database rollback machinery is added.

## Validation and execution

The unchanged authority-bootstrap and Neon-client baseline passed **8/8** in disposable Linux against exact main; no fixture/timeout change. Reuse that isolated Node/PostgreSQL environment for required `npm test` because the Mac fixture encountered shared-memory exhaustion. Fresh checkout `npm ci` passed. No host shared-memory cleanup or repeated failing initialization.

After implementation, run the helper failure/cleanup matrix, then the actual image check for the narrow startup regression, then required `npm test`, `fly config validate` and documentation/example/link checks. Commit the exact file tree and get two fresh complementary independent Sol code reviews with complete denominators, second sweeps and separate seven assessments. Fix real in-scope findings and re-review changed code before PR. Publish/attach the first PR, require current-head hosted Node/PostgreSQL checks and inspect feedback, then merge under existing authorization and verify the resulting tree. Live steps use that reviewed revision; test/CI/merge are distinct from operational completion. No duplicate check merely because a merge preserves the tested tree.

Advance to the detailed agent Story after the owner-access outcome has its required live proof. A pending credential or route is not a completed owner outcome. Continue independent useful work but do not promote a dependent effect or open a third PR.

## Author size and seven principles

Estimate for a developer familiar with the existing code: packaging/image check and consequential failure matrix 2–3.5h; coherent guides/design/queue 2–2.5h; existing checks/PR 1–1.5h; protected live setup/root/peer/wake/restart proof 2.5–4h; in-scope review repairs up to 1.5h: **8.5–13h**, twelve paths. External wait time is separate from engineering effort and remains an open completion gate. Initial independent reviewers estimated 10–14.5h and 10–15h including these bounded repairs; revised exact-artifact verdicts remain required.

1. Intuitive: the owner uses existing familiar inspection; infrastructure setup is explicitly a pilot operator responsibility.
2. Discoverable: the named image-check/help command and ordered guides distinguish liveness, authenticated access and recovery; human text and agent JSON are supported.
3. Delightful experience: reuse existing commands and credentials, retain setup across restart, and avoid repeated mutation after an uncertain result.
4. Token saver: safe compact stage results expose exact image/status/omissions; the queue shows one bounded next outcome rather than broad provider dumps.
5. Secure: verified root/TLS, restricted runtime login, protected separate owner bearer and pinned private route remain; UUID-owned Docker cleanup and synthetic credentials isolate tests.
6. Agents are equal: the same existing noninteractive inspection/check interfaces expose structured results; separate agent identity is the explicitly approved next slice, never a shared owner token workaround.
7. Dependable: image startup is actually tested, live grants/restart/wake are separate checks, first deployment has a no-serving recovery, and incomplete stages remain visible.

## Review gate

Initial two independent Sol reviews of SHA256 `85829fc325e76cd2ecd311322814b71f3ec369bcc86b6ef5fe371e5f9e9ceb41` were NOT CLEAN. Both identified the omitted selected-hosting design; technical review additionally required the cleanup/failure matrix. These are real in-scope findings addressed above, with twelve counted paths. Revised exact-artifact review is complete: both independent reviewers CLEAN on SHA256 `13ab111069ffca8599b04818600961e665355b57f595b52ca4f91ad0c080df76`, as recorded below. Require requirement/path/contract denominators, complete second sweep and each reviewer's seven assessments. No code changes before both verdicts are CLEAN and the first Story is independently under the strict limits.


## Exact independent plan evidence — 1 October

Initial SHA256 `85829fc325e76cd2ecd311322814b71f3ec369bcc86b6ef5fe371e5f9e9ceb41`: both independent Sol reviewers NOT CLEAN. The selected hosting document was missing; the technical reviewer also required explicit consequential cleanup/failure verification. Both were real in-scope findings, repaired with twelve total paths, without changing authority or adding a PR. Final reviewed SHA256 `13ab111069ffca8599b04818600961e665355b57f595b52ca4f91ad0c080df76`: both CLEAN, second sweeps complete and no unresolved in-scope findings.

Product reviewer examined 25/25 requirement groups, 11/11 contracts, 12/12 planned paths and 49/49 scoped baseline surfaces, freshly rechecking the revised plan and eight affected existing surfaces. Independent estimate 11–15h. Technical reviewer examined 14/14 requirements, 12/12 contracts, 12/12 planned paths and 39/39 supporting files, freshly rechecking affected imports/liveness/config/docs/test contracts. Independent estimate 10–15h. Technical coverage corrected its initial mistaken six Technical Acceptance Criteria to the actual five. Both inspected source independently; neither executed tests, touched accounts or claimed live proof.

Their separate assessments (each assessed all seven):

| Principle | Independent product assessment | Independent technical assessment |
| --- | --- | --- |
| Intuitive | Familiar protected self-inspection, explicit operator setup. | Existing identity/grants and one consistent current hosting procedure. |
| Discoverable | Ordered setup/recovery, text/JSON and hosting reconciliation support both callers. | Explicit files, statuses, omissions and stable commands explain normal use/recovery. |
| Delightful experience | Preserve credentials on restart; reconcile uncertain mutations; private handoffs remain visible. | Reuse setup and reconcile before retry, avoiding repeated credential work. |
| Token saver | Compact safe stages and identity/grants expose relevant evidence and omissions. | Bounded queue and stage results avoid provider/log dumps without concealing gaps. |
| Secure | Separate custody, root/TLS/private route and read-only runtime; test destructive cleanup boundaries. | Same custody/authority boundary; new matrix explicitly proves refusal to remove foreign objects. |
| Agents are equal | Noninteractive structured interfaces; next agent receives separate identity, never the owner bearer. | Agent lifecycle remains PR2 and has its own credentials; inspection/check work noninteractively. |
| Dependable | Real image and failure policy separately tested; no-serving recovery and distinct evidence remain honest. | Cleanup failure fails; local/CI/merge/live and retained resources remain separately recorded. |

PR2 remains provisional; its independent 12–18h range is unresolved and cannot be overridden by PR1 CLEAN. Exact committed-code reviews, current-head CI, merge and live owner proof remain open. No live result is claimed by this plan record.


## Author implementation assessment and validation

The twelve-path implementation packages the existing SQL import closure, selects the approved 256-MiB first Machine, adds an actual-image liveness command and consequential failure-policy tests, and reconciles guides/selected design/current queue. No runtime authority, migration, caller, dependency or provider contract changed. The historical PR35 checkout and its user edit remain untouched.

Focused helper tests pass 8/8 with no skips, covering foreign image/container retention, lost run reply, startup deadline, early exit, cleanup failure, failed build and CLI omissions. The actual repository Dockerfile starts its normal command under one CPU/256 MiB and passes exact `/health`; build/start/health and both owned cleanup stages pass. Latest image ID `sha256:a64376a41eafb60393682d33a11ee3e9239189a67b0920c4b6ea15fe345948d5` is ephemeral and removed, not a deployed release. `fly config validate` passes; all 91 relative file-link targets across seven changed Markdown files exist; `git diff --check` passes. The first full disposable Linux check completed with 310 passed and one failure in the unchanged worker timing test (`worker drains pending claim extensions before release`): two 20-ms extensions occurred before release instead of the assertion's single extension. Its test and runtime source are byte-identical to main; isolated baseline and current-image checks both pass. The 1-ms heartbeat/5-ms runner plus asynchronous filesystem work can take longer than an extension under concurrent load. No assertion, timeout, fixture, concurrency or repository infrastructure was changed. The normal required `npm test` confirmation passed 311/311, zero failures/skips in 24.45s with no concurrent Docker build; the initial failure remains recorded, not erased. After the bounded review repair below, focused helper checks pass 10/10; required current-head hosted CI remains pending. The macOS fixture failure is not bypassed or weakened. Code review, CI, merge and live gates remain open.

1. Intuitive: the normal owner still uses `caller:me` and readable identity/grants. Image checks are explicitly an operator task with a familiar npm command.
2. Discoverable: help states Docker/network prerequisites, text/JSON modes and omissions; current guides reconcile approved first-host sizing and recovery. Agents receive safe structured stages.
3. Delightful experience: preserve owner credentials and existing infrastructure, reconcile uncertainty before retry, and clean up only temporary check resources. The mandatory private credential handoff remains a setup cost, not a routine plan approval.
4. Token saver: image ID and decisive safe stages avoid raw Docker/secret dumps; live omissions and the two-PR queue expose what remains rather than implying success.
5. Secure: production remains unprivileged with existing pinned root and read-only authority; synthetic check credentials and loopback ingress isolate the local check. Tests establish refusal to remove foreign resources; operator/caller/runtime secrets remain separate.
6. Agents are equal: the check and existing caller support noninteractive JSON with explicit file inputs. The separate agent remains the next provisional complete outcome, never an owner-token shortcut.
7. Dependable: omitted SQL is covered by actual production startup; ambiguous start, timeout/exit and failed cleanup retain a failed status. Local/CI/merge/live and first-deploy no-serving restoration remain separate evidence.


## Initial independent committed-code round and bounded repair

Both fresh independent Sol code reviewers returned NOT CLEAN for `5593485a9ff4a27c2962c148ae6d572dfc7ab0fa`: one duplicated P2 root cause, essential failed-cleanup resource identity missing from both text/JSON and recovery guidance. Product coverage: 24/24 requirement groups, 11/11 contracts, 12/12 files and 25/25 supporting surfaces. Technical coverage: 14/14 requirement groups, 12/12 contracts, 12/12 files and 24/24 supporting surfaces. Both independently ran helper 8/8, verified artifact hashes/diff and inspected full-suite311/311 plus actual-image evidence; both completed a full second sweep. Neither claimed independent Docker/provider/live execution.

Each independently assessed all seven: product found intuitive/discoverable/delightful/token-saving/agent recovery incomplete without exact safe identities; security still preserved ownership deletion and separate custody; dependability kept failure honest but lacked recovery targets. Technical found familiar npm/owner interfaces and reused setup; discovery/token efficiency needed decisive nonsecret identities; secure loopback/synthetic/label/ID boundaries, agent parity and honest uncertainty remained, while dependable cleanup recovery had that concrete gap. These are historical NOT CLEAN assessments, not author approval.

Classified the finding as real in scope and repaired the result schema/renderer plus guide and regression: keep safe run UUID/name/tag, verified exact IDs and `removed`/`absent`/`retained`/`unverified` outcomes. Re-observe a failed removal before calling an object retained; a lost reply alone is uncertain. Text/JSON now support narrow label recheck and exact-ID recovery, never foreign deletion or raw logs/secrets. Two added tests verify uncertain inventory and actionable failed results; existing foreign-object/failure tests remain. Twelve paths unchanged. Author reassessment of all seven above now includes this concrete recovery repair. Fresh reviews of the exact repaired commit remain required; the prior verdict does not cover it. Full live owner outcome remains pending protected credentials and deployment/access proof.
