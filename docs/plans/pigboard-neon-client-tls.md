# Make private owner access work through verified Neon TLS

## Reviewed planning snapshot — before implementation

The following planning sections describe the pre-implementation snapshot on 1 October 2026. Their earlier live rejection and source state are historical. The implementation and verification record at the end reports subsequent work.

Candidate bounded defect repair and owner live completion. Reuse frozen recovery architecture 0e222333e9c5b4e565dd0dd320e7e1941915cb6e2682f7235f3191396aeaf15b and CLEAN owner plan 13ab111069ffca8599b04818600961e665355b57f595b52ca4f91ad0c080df76, with the affected TLS evidence model corrected. Baseline main2f0e9efbc2f989c9dd8d35fbd4a310f01c4235f1 is tree-identical to reviewed968dc6ca8cf62c9e2a9df6abe3b9fe2a9de3ab48 in ski-stack-private-owner-access. No source change yet. PR35 and all user work remain preserved. One of two approved PRs is used; publishing this repair and a later separate agent PR requires an explicit batch-count change. Do useful authorized repair work without publishing an extra PR or promoting the unready agent Story.

## Evidence and bounded reuse

The project-scoped key and owner URI are valid, match exact Pigboard org/project/branch/endpoint and are saved privately. The actual Node connection authenticates pigboard_owner to pigboard with certificate-authorized, hostname-verified TLSv1.3; the proxy-to-backend pg_stat_ssl reports false/null. Existing owner-root/runtime/neon preflight incorrectly rejects this backend flag. Read-only inventory confirms pigboard_app absent, zero Pigboard tables, no fixture and no broad PUBLIC CREATE defaults. Fly still has zero Machines and only the exact private IP. No DB mutation occurred.

Neon's security overview requires client TLS and describes the authenticating proxy; PostgreSQL pg_stat_ssl describes backend connections. Correct client transport proof is required; no false claim about all provider-internal hops, certificate bypass or relaxed target check. Sources: https://github.com/neondatabase/website/blob/main/content/docs/security/security-overview.md ; https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-SSL-VIEW ; https://node-postgres.com/features/ssl ; https://nodejs.org/api/tls.html#tlssocketauthorized .

## Story

Problem to solve

The private owner host rejects a verified secure Neon connection because it checks the provider's backend TLS statistics. The owner needs working private identity and grant inspection with the reviewed security policy intact.

Acceptance Criteria

- The owner can inspect current identity and grants through the private host using verified client TLS.
- Invalid certificates, wrong hosts and missing or untrusted TLS transport fail before protected database work.
- An unissued caller is denied without another caller's identity.
- The same owner token works after host restart and observed Neon sleep/wake, or bounded uncertainty is reported honestly.

Technical Acceptance Criteria

- Keep exact root/owner/runtime/app/IP pins, mandatory certificate and hostname verification, restricted SQL role and separate protected custody.
- Verify actual Node client transport and the fixed libpq verify-full policy rather than backend SSL statistics.
- Preserve existing v2 schema/owner/caller contracts, deadlines and first-deploy no-serving recovery.
- Use one private shared-CPU/256-MiB Machine and a verified owner-specific peer/route.

Testing Strategy

- Manual QA: run protected root and owner/caller checks, verify unissued-token denial, restart and repeat with the same token, then observe Neon suspend and verify wake.
- Access and setup: dedicated pinned Pigboard Neon/Fly resources, private operator credentials and distinct owner bearer/network peer.
- Observation: safe text/JSON transport, identity/grant, omission and private Machine results.
- Automated regression: real TLS-terminating proxy with a plaintext disposable backend, invalid transport/certificate/hostname refusal, libpq policy and unchanged real owner/caller behavior.

## Exact twelve-path inventory

1. src/hosted/postgres-tls.js — shared actual pg TLSSocket check: encrypted===true, authorized===true and negotiated TLSv1.2/1.3, no backend fallback.
2. src/hosted/owner-root.js — require this after connect before identity query or SET; keep safe owner error mapping, pin and certificate policy.
3. src/hosted/neon-client.js — root/runtime actual transport checks before identity or caller SQL; unchanged safe errors/pin/timeouts.
4. src/hosted/neon-preflight.js — backend SSL removed from SQL; pure snapshot TLS unverified, runPreflight supplies verified process evidence from clean fixed verify-full/system-CA invocation only after successful parsed result. Retain ten stable check IDs and output bounds.
5. test/owner-root.test.js — proxy flagfalse succeeds only with genuine authorized socket evidence, invalid/missing/plain/untrusted socket fails before SQL, driver errors stay safe.
6. test/neon-client.test.js — real local proxy regression plus runtime/diagnostic invalid socket and actual wrong-host/untrusted certificate; own resources cleaned.
7. test/neon-preflight.test.js — process evidence separated from SQL, verify-full clean environment cannot be overridden, failed/timeout/malformed process fails, effective privilege checks retained.
8. docs/hosted-neon-preflight.md — explain actual client policy, backend/provider distinction and unchanged operator recovery.
9. docs/hosted-pigboard-first-service.md — same-Machine root meaning, client TLS boundary and verified owner live procedure/evidence.
10. docs/delivery-plan.md — one honest current bounded queue/count and exposed live defect, no automatic agent/selector continuation.
11. docs/plans/pigboard-neon-client-tls.md — this concise Story/plan with author, exact independent reviews, code/test/CI/live evidence.
12. docs/hosted-pigboard-authority.md — date the previous zero-Machine/no-live-evidence statement as historical; link current owner verification/recovery procedure without claiming future live success.

No other production entrypoint, dependency, SQL migration, packaging, configuration or owner/agent contract changes. README already links to the affected guides and promises verified TLS without relying on backend statistics, so no new command/documentation duplication is needed. The owner guide needs its separate dated state correction above because this Story includes live completion. Count any necessary additional path and independently recheck size before changing it.

## Concrete change, checks and rollout

Construct clients exactly as before with rejectUnauthorized=true and pinned servername; options.tlsCa is test-only. Require actual socket properties after successful connect and before any protected SQL, even if backend SQL would claimssl=true. Proxy ssl=false never becomes a transport fallback. Existing owner error owner_identity_mismatch remains for wrong identity; unavailable TLS uses safe owner_connection_unverified. Runtime retains tls_not_active for missing/unverified connected transport and tls_verification_failed for rejected X509 handshake. Close every refused client.

The psql child has pinned host/database/role, -w, PGSSLMODE=verify-full, PGSSLROOTCERT=system, GSS disabled and no inherited PG variables; successful zero exit under this mandatory policy is transport evidence. Do not synthesize ssl=true in the SQL snapshot. Pure evaluateSnapshot reports client TLS unverified; the owning runPreflight stage alone replaces that check with process proof. Malformed JSON/incorrect object, unsuccessful/unknown exit, timeout or excess output cannot assert TLS success. Other identity/role/membership/schema/database/fixture checks keep independent status and omission semantics. No timeout or test weakening.

Add a loopback-only test proxy in the existing neon-client test file. The existing disposable Postgres fixture's localhost trust backend permits plaintext without changing its shared source. Read only that owned fixture's generated cert/key, handle the 8-byte PostgreSQL SSLRequest, replyS, wrap actual socket with Node TLS and relay to the disposable plain backend. Verify backend pg_stat_ssl=false while actual authorized client TLS succeeds for diagnostic and runtime, and untrusted/wrong certificate host fails. Require initdb/pg_ctl/openssl; failure is not skip. Track and close all owned sockets/listener in finally before existing fixturecleanup, preserving original and cleanup errors. Do not mutate shared infrastructure or affect another test cluster.

First run focused TLS/owner/preflight regressions in the already verified disposable Linux Node/Postgres environment; then required npmtest, actual production-image check and relative docs/whitespace checks. Commit and obtain two fresh independent exact-commit Sol reviews, full coverage/second sweep/separate principles. Repairs and new code require exact fresh verdicts. Open/attach only under resolved batch authority; require current-head CI, fresh feedback and merge-tree equivalence. No branch/user change deletion.

Live execution reuses owner plan steps: fresh endpoint mapping/pin; actual owner identity; restricted runtime CLI only after absence checks; owned disposable fixture/preflight/drop/absence; v2 migration/inspect/bootstrap only if owner absent; stage only restricted runtime secret; local-build one private Machine; same-Machine root; verify exact owner peer/local route before owner bearer; unissued401; same-bearer restart; actual observed suspension then boundedwake. The earlier read-only absence inventory is not permission to assume absence later. A lost mutation response must inspect before explicit retry. First deploy failure removes only exact newly created app Machine, preserving/recording DB schema and protected credentials/staged secret/private IP. No sole-owner rotation for QA. Agent remains provisional and untouched.

## Estimate and principles

Author estimate: transport logic1–1.5h, meaningful realproxy/negative/regression coverage1.5–2.5h, coherent guides/plan0.5–1h, required checks/reviews/PR1–1.5h, existing owner live procedure2–3h, bounded repairs0.5–1h: **7–10.5h**, twelve paths. External provider waits separate from engineering effort and never close acceptance. Independent estimate and exact plan CLEAN required before coding.

Intuitive — owner uses existing command, no provider internals required. Discoverable — human guidance and agent structured checks explain transport proof and actual failure/recovery. Delightful — secure connection stops being falsely rejected; retained setup avoids repeating credential work. Token saver — compact relevant checks expose omissions and no raw logs. Secure — enforce certificate/hostname plus actual encrypted transport; separate custody, private peers and SQL limits unchanged. Agents equal — same noninteractive diagnostic/caller contracts with safe JSON; separate agent issuance remains later. Dependable — distinguish actual client TLS from provider backend, preserve deadlines/unknown outcomes, verify live restart/sleep separately.

Request fresh independent product/docs and technical/security affected design AND implementation-plan reviews. Enumerate requirements/contracts/files examined/total, second sweep, concrete findings/severity, separate seven principles and exact hash verdict, honest size. No source or provider mutation in review. The remaining two-PR count choice is owner authority, not a reviewer gate or inferred permission.

## Review and verification record

Affected design and implementation plan independently CLEAN for the exact
external artifact hash `3f23bd03f5be0ff6a344e2ae1af2f8af4015256427ecde7ba2781091c7bce9bc`.
The product/docs reviewer examined 39/39 requirement groups, 12/12 paths and
20/20 supporting source surfaces, did a complete second sweep and independently
assessed all seven principles; estimate 8–13h. The technical/security reviewer
examined 8/8 AC/TAC, 4/4 testing groups, 8/8 implementation contracts, 8/8 rollout
contracts and 12/12 paths, did a second sweep and independently assessed all
seven principles; estimate 8–12h. The prior missing owner-guide historical-state
correction was fixed in this plan. No unresolved in-scope planning finding remains.

This committed copy records that reviewed implementation scope. The external
artifact is the exact reviewed plan, not a code verdict. Implementation validation on 1 October 2026: the focused real-proxy regression
passed after its owned socket-close race was fixed. The isolated Linux full
`npm test` passed **316/316**, zero skips. The actual production image check
passed build, start, health and both ownership-checked cleanup stages at one
CPU/256 MiB; image `sha256:c29537a4417ed3dd6431770004c8add4f844d9d38c0dcf5a1bcfde54dd000e39`.
All 70 relative documentation links resolved and `git diff --check` passed.
Fresh exact-commit code reviews, PR/head CI, merge-tree verification and live
owner acceptance remain separately recorded gates. The agent Story remains provisional, and the
hard batch count has not changed. No provider mutation is implied by this file.
