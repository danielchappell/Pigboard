# Pilot agent plan and evidence

Implementation uses the externally reviewed plan below, SHA256
`a921b7f1195871bb786173cea3594499f22f6d24c885c2b6c94105f65d87f868`, against
baseline `533a1c9d99e2c6ba01d08c2796625a54be59fccf`. Both fresh independent Sol
round2 product and technical plan reviews were CLEAN with complete coverage,
second sweeps and separate seven-principle assessments. The round1 technical P1
(stop does not fence autostart) was repaired in that exact reviewed plan.
The narrowed design hash is
`44f8920d164d443e5e1b013887b889a111b71a4dbd07f9021f6382ed0fa268b1` with two
independent Sol CLEAN design reviews. These are historical plan/design gates,
not committed-code review, CI, release or live evidence.

## Implementation evidence — 5 October 2026

- npm ci completed on Node22.17.0; remote main readback remains approved baseline.
- First focused real TLS PostgreSQL/owner regression passed5/5; protected file/CLI
  regression passed7/7. A sandbox shmget denial was rerun through approved normal
  escalation, without weakening or skipping the fixture.
- Final focused seven-file regression passed36/36 with0skipped: authority-bootstrap,
  agent-cli, owner-bootstrap-cli, authority-self, health-server,
  private-caller-client and pigboard-production-image.
- Real independent sessions cover v1/v2/fresh upgrade, duplicate history refusal,
  latest catalog receipt, current post-lock reads under nondefault isolation,
  owner-recovery/enrollment race, concurrent fresh/same-file enrollment,
  unknown enrollment/revoke replies, complete two-bearer HTTP401, actual CLI
  JSON/text/retry/revoke and preserved ownerHTTP200. Protected-file tests cover
  durability, zero writes, fsync failure, unsafe custody/substitution and strict
  bounded outputs. Runtime authority writes remain denied.
- Full `npm test` first run passed 323/324, with zero skipped. The sole failure
  was the unchanged `code-loop-worker.test.js:1008` timer assertion: its 1ms
  heartbeat/20ms extension/5ms worker produced two completed extensions before
  release instead of one. Isolated unchanged worker suite passed 36/36; rerunning
  the unchanged full suite passed 324/324. No timeout/test/source weakening or
  shared PostgreSQL cleanup occurred. Initial failure and rechecks are preserved
  separately in the external evidence directory.
- The unchanged actual `check:pigboard-image -- --format json` passed build,
  normal startup, health and exact owned container/image cleanup. Image ID:
  `sha256:02e25d38c34c6b996e3856dd42e40ea3e7734fe980926bb7b2dbb4b4263a206b`;
  ownership UUID `03680f45-343a-4358-b7de-45a459d46460`. It proves actual packaged
  SQL003 import/startup, not live Neon grants or deployment. The historical
  five-second checker failure did not recur; no fallback or timeout change.
- Final-tree full `npm test` passed 324/324, zero failures and zero skipped.
  Final file/CLI regression passed 7/7 after the bounded successful nextAction
  wording was clarified. No packaged production source changed after the actual
  image check; only protected operator CLI success guidance, a test comment and
  documentation/evidence changed.
- `git diff --check` and local documentation-link/anchor checks passed. Author assessment is separate below; fresh independent
  exact committed-code reviews and current hosted checks remain pending. Nothing
  has been pushed, opened as a PR, merged or deployed by this implementation.
- Root separately verified live owner baseline5October using the unchanged image
  and own peer: principal31dbd3b2-2330-4235-a52d-237ea24979d1, generation1 and
  owner+connection_admin. This is not v3/new-code or agent acceptance.

## Author implementation assessment

1. Intuitive: fixed enroll/status/revoke plus plain nextAction matches connect/
   disconnect. Human text and agent JSON carry the same outcomes; normal callers
   keep the existing own /me capability.
2. Discoverable: counted help/authority/service guides explain prerequisites,
   exact flags, managed file retries and lost-file recovery; Story/queue distinguish
   available source from live acceptance and provisional Jira discovery.
3. Delightful experience: exact active intent reconciles without another file,
   event or generation. Manual private custody/peer and interrupted replacement
   remain explicit pilot costs, with no external coordination requirement.
4. Token saver: aggregate current-state inspection returns one fixed identity,
   bounded safe fields and actionable omissions rather than a roster or driver
   dump. JSON/text parity avoids extra agent probing to find hidden failure.
5. Secure: immutable preactivation0600 token under0700 custody, descriptor/parent
   checks, permanent active/inactive digest uniqueness, owner-only row-serialized
   authority changes, full revoke and SELECT-only runtime preserve boundaries.
   Fenced rollout prevents stopped-autostart assumptions; live proof remains open.
6. Agents are equal: fixed agent receives its own connection_admin principal and
   identical noninteractive caller route. Operator SQL/provider custody is a
   separate authority, never transferred to the recipient.
7. Dependable: exact UUID/token retry and fully-revoked no-write results prevent
   repeated issuance. Unknown SQL/inspection is not absence; local preparation,
   SQL completion, handoff, peer/removal, image/CI and release are separate states.

## Approved plan source — retained verbatim

The following is the exact external artifact reviewed before coding. Its original
stage/header describes that historical artifact. Implementation evidence above
and subsequent exact committed-code reviews determine today's delivered state.

# Connect and disconnect the fixed pilot agent

5 October 2026. **Groomed PR1 and exact implementation plan; round1 product review CLEAN, technical review NOT CLEAN for an autostart ingress-fence defect; corrected round2 awaits two fresh independent reviews. No implementation authorized by this document alone.** Sol author inspected clean `ski-stack-agent-selector`, branch `codex/pig-agent-selector-batch`, HEAD `533a1c9d99e2c6ba01d08c2796625a54be59fccf`. Reuse the narrowed design SHA256 `44f8920d164d443e5e1b013887b889a111b71a4dbd07f9021f6382ed0fa268b1` and its two independent Sol CLEAN design reports dated 5 October. Those reports are design evidence only. This external plan changes no repository code or provider state.

## Story

Connect and disconnect the fixed pilot agent

Problem to solve

The private host has an owner but no separately authorized agent. Sharing the owner bearer would give the agent the wrong authority. The operator needs a complete way to connect one agent and remove its access while preserving the owner.

Acceptance Criteria

- The protected operator enrolls `pilot-agent` with its own durable bearer file and can inspect its current authority.
- Retrying the same file reconciles the same identity without issuing another credential or changing an active grant.
- The recipient uses a distinct mapped private peer and its own bearer to inspect its agent identity and `connection_admin` grant.
- The operator revokes every active credential and grant for that exact agent, verifies next-call denial, and removes its peer.
- Owner self-inspection and the owner peer still work after the agent is disconnected.
- Lost replies, unsafe files, lost files and conflicting authority return a clear recovery step without silently replacing an identity.

Technical Acceptance Criteria

- Only the pinned protected owner connection can administer this fixed agent; runtime authority remains SELECT-only.
- Persist the UUID-named bearer file before activation; never print a token or digest or accept either in arguments.
- All owner and agent mutations use explicit READ COMMITTED, await the authority row lock, then read current decision state.
- Migration v3 preserves immutable v1/v2 sources, adds permanent digest uniqueness and agent events, and validates the latest catalog receipt.
- Refuse revoked-token reuse, human or owner revoke targets, contradictory authority and a second active agent.
- Report local preparation and SQL completion separately from recipient delivery, peer routing and peer removal.

Testing Strategy

- Manual QA: run the protected enroll/status commands, hand off the bearer privately, prove the agent's own `/me`, revoke its UUID, prove denial, remove its mapped peer, and recheck the owner.
- Access and setup: use the pinned private Pigboard host, protected owner URL, existing verified owner bearer/peer, and a distinct isolated local Linux agent runtime that can retain its own protected bearer and distinct peer; reuse the existing owner namespace proof pattern.
- Automated regression: extend the real independent-session PostgreSQL lifecycle and private HTTP regression, plus protected-file and command recovery coverage.

## Ordered delivery queue and limits

1. PR1 is this complete agent connect/disconnect outcome. D1 Jira credentials are not a dependency. Gate now: two fresh independent Sol plan reviews to CLEAN, then Sol implementation, commit, two fresh committed-code reviews, PR/checks, owner-authorized merge/deploy and live acceptance.
2. PR2 **Provisional — not ready for delivery**: owner and agent discover approved named Jira projects/boards read-only. It depends on settled D1 service identity, metadata/read/pagination facts and PR1's committed and live contract. Saved pair/correction/filter eligibility/effects remain deferred. Pin its route, provider and output contracts only after D1; do not restore pair storage into this batch.
3. Stop and regroup after two total PRs. Opened/implemented/live outcomes remain 0/2 today. Preserve PR35/user design edits and independent PR40/41 branding/site work.

PR1 has **15 exact changed repository paths**, enumerated below. External planning/reviewer artifacts are not implementation repository changes; copy this plan and compact exact review/author/test/live records into the single counted repository plan path. Do not add separate uncounted review/evidence files. Private credentials and peer ledger remain outside the repository. Binary image proof is recorded as safe image ID/check output in that counted record, not a committed image file.

Familiar-developer estimate **12–15.75 human hours**, including the entire outcome: authority/v3/receipt/owner ordering 2.5–3.25; immutable file/CLI 1.5–2.25; SQL/file/CLI/concurrency regression 2.5–3.25; Story/plan/help/guides/queue 0.75–1.25; required checks and PR preparation 0.75–1; quiesced forward upgrade, handoff, distinct peer, full revoke/removal, owner and replacement proof 1.5–2.25; independent review repair 1.5–2.5. Upper sum 15.75. The margin is 0.25h; credible reviewer estimate >=16h or newly necessary work blocks implementation and requires scope reconciliation. Access waiting is not engineering effort, but a blocked acceptance is never counted complete. No new generic journal, list product, arbitrary name, CAS enrollment input, rotation, HTTP admin route or advisory-lock transition is included.

## Exact command contract

New scripts map `agent:enroll`, `agent:status`, `agent:revoke` to `scripts/manage-pigboard-agent.mjs` with the corresponding verb. Direct script invocation also supports one of those verbs. `--help` alone or after the verb exits 0 without touching files or SQL.

```
npm run --silent agent:enroll -- --owner-url-file /absolute/private/owner.url [--credential-file /absolute/managed/agent-UUID.token] [--format text|json]
npm run --silent agent:status -- --owner-url-file /absolute/private/owner.url [--credential-file /absolute/managed/agent-UUID.token | --principal-id UUID] [--format text|json]
npm run --silent agent:revoke -- --owner-url-file /absolute/private/owner.url --principal-id UUID [--format text|json]
```

Default text and JSON have identical meaning. Reject unknown/duplicate flags, missing values, extra arguments, malformed UUIDs and flags inappropriate for a verb with `invalid_usage`, exit 2 and bounded help direction. UUIDs normalize to lowercase; new identities use `randomUUID()` v4. No name, role, token, digest, generation or URL override is accepted. Status's two optional selectors are mutually exclusive. Revoke requires the exact UUID even when only one agent exists.

Enrollment without `--credential-file` generates a new principal UUID and token on the protected operator machine. This is server-side administration, not caller-controlled credential generation. The managed path is `~/.config/pigboard/agent-credentials/agent-<UUID>.token`. Enrollment with that flag safely reads an existing managed file and retries that exact intent; a missing specified file is refused, never recreated. Status accepts the same managed file for digest reconciliation or an exact UUID for lost-file recovery. A copied recipient file is for `caller:me`, not a new administration input.

No selector on status returns the sole active pilot principal, or if none is active the latest historical `agent_enrolled` principal by event generation, or absent when no agent exists. This is one bounded current-result query, not a roster/history list. Exact-UUID lookup returns that identity, including an older revoked identity. A nonexistent exact UUID is absent. A human target is refused. Conflicting multiple-active or a human using the fixed agent name yields unknown/conflict rather than a selected identity.

Every JSON result has exactly these top-level keys:

```
{
  "schemaVersion": 1,
  "command": "enroll|status|revoke",
  "status": "<outcome below>",
  "reason": null,
  "authority": null,
  "local": {"status":"not_requested", "credentialFile":null},
  "omissions": [],
  "nextAction": "<bounded operator instruction>"
}
```

`authority`, when verified, has exactly `{schemaVersion:3, generation:<safe integer>, principal:null|{id,name:"pilot-agent",kind:"agent"}, credentialActiveCount:<integer>, grantActiveRoles:<sorted strings>, credentialMatch:null|<boolean>}`. Absent uses null principal, zero credentials, empty grants. Digest match is present only as a boolean when an existing file was provided; never output a digest, credential row ID or token. `local.status` is `prepared_locally`, `read_existing`, `not_requested` or `unverified`; its path is nonnull only for a validated managed file. A new file remains `prepared_locally` even when SQL is refused/unknown. Text prints the same command/outcome/reason, verified identity/counts/grants/generation/file/match, omissions and next action; no raw error object is rendered.

Enroll status is `enrolled`, `already_active`, `refused` or `unknown`. Status command is `active`, `revoked`, `absent`, `refused` or `unknown`. Revoke is `revoked`, `already_revoked`, `absent`, `refused` or `unknown`. Exit 0 for enrolled/already_active, verified status active/revoked/absent, and revoke revoked/already_revoked; absent revoke exits 1 to avoid claiming removal of an unverified target. Other operational results exit 1. `reason` is null on successful outcomes; failures use a bounded allowlist: `schema_absent`, `migration_required`, `schema_conflict`, `owner_invalid`, `authority_conflict`, `agent_exists`, `identity_conflict`, `credential_revoked`, `generation_exhausted`, `unsafe_credential_directory`, `unsafe_credential_file`, `credential_file_missing`, `invalid_credential_file`, `outcome_unknown`, `inspection_unverified`, `agent_change_failed`, and the existing safe OwnerError reasons. No driver/provider text appears.

Every enroll/status output keeps `delivery_unverified` and `peer_unverified` omissions. Revoke keeps `peer_removal_unverified`; a successful database revoke also means next call should deny, whose live proof is separately recorded. Unknown authority keeps `current_authority_unverified` and never returns a guessed generation/principal or false absence. No CLI result claims recipient setup or offboarding complete. Next actions name status with the existing file, UUID status/revoke after file loss, migration, or custody repair as appropriate. No automatic database retry occurs.

## Durable file intent and concurrency

Reuse safeDirectory/syncDirectory patterns inside authority-bootstrap; parameterize directory preparation internally while preserving owner exports and behavior. Add agent-specific exported preparation/read functions in the same module, without importing private-caller-client (its deployment config is not packaged). Use the caller reader's descriptor/identity pattern: lstat regular file and owned exact 0600 mode, O_NOFOLLOW read descriptor, fstat same dev/ino/size, bounded 48-byte canonical token-plus-newline content and final parent identity check. Managed basename must exactly match the lowercase UUID and canonical managed parent from preparation. Verify owned directory mode0700 and safe ancestors; reject symlinks/substituted parents. Existing files must have one `pb1_` token plus exactly one newline, no extra bytes. No JSON journal is stored.

Before SQL, create a new file with O_CREAT|O_EXCL|O_NOFOLLOW mode0600, check regular file/ownership/mode and link count1, loop writes with progress checks, fsync file, then directory and newly created ancestor entries. Existing retries safely read and fsync the descriptor and directories again before activation. Compare opened inode to the final path and directory identity before SQL. Any partial write, fsync or custody failure stops before SQL and leaves that file for explicit inspection; never overwrite/unlink it automatically. A corrupt file cannot be repaired into a new intent. Read-only status performs safe reading without mutation and reports read_existing.

Two fresh enrollment processes may prepare different files; the row lock allows at most one activation, and the other returns agent_exists with its unactivated file. Two retries of one valid existing intent serialize and yield one enrollment plus no-write reconciliation. A fresh-file UUID collision returns a file refusal; no silent overwrite. A missing/corrupt retry file never generates a token. If the first output is lost, inspect the private directory locally for the newly created UUID filename, then status that exact file. This is local custody recovery, not a command history feature. If the file is lost, status without a selector identifies the current agent; revoke its exact UUID before enrolling anew. Do not revoke an unrelated agent merely because an incomplete file exists.

## Authority, migration and source compatibility

Add `sql/003-pigboard-pilot-agent.sql`. It changes the named event-type check to allow owner_bootstrapped, owner_recovered, agent_enrolled and agent_revoked, and adds an unconditional unique index on `(digest_version,digest)` across active and inactive credentials. Before applying v3, under the existing migration advisory lock inspect duplicates and refuse schema_conflict without rewriting rows. SQL unique-index creation remains the final duplicate guard. Preserve SQL001/002 bytes/checksums. V3 adds no runtime grants or table and no writable runtime authority.

schemaState accepts only contiguous known receipts 1..N with each immutable source checksum and valid catalog checksum. Compare today's catalog only to the latest receipt; keep prior checksums untouched. Verify v2 runtime column-read privileges for installed versions>=2. Return migration_required for valid v1/v2 and schema_current only for v3. Fresh install applies 1,2,3 and records each catalog at its own stage. Valid v1 upgrade applies2,3; valid v2 applies3; valid v3 is already_current. Preserve generation and existing owner/credentials. Reject unknown versions, receipt gaps, changed historical source checksum, latest catalog drift and privilege drift. Receipt/current output schemaVersion now3; old operator source rejects three receipts rather than acting against v3.

Migration remains BEGIN READ COMMITTED plus its existing installation advisory lock, because absent schemas cannot row-lock a nonexistent table. Quiescence is mandatory for real upgrade. A lost migration commit reply returns existing schema_outcome_unknown; inspect receipts/catalog with the reviewed new operator before an explicit retry. Do not mark absence or undo a committed migration.

Owner change now BEGIN ISOLATION LEVEL READ COMMITTED; establish table presence sufficiently to distinguish absent/partial state, await standalone SELECT generation FROM public.pigboard_team_authority WHERE team_key='pilot' FOR UPDATE, then schemaState and current owner reads in later statements. The pre-lock presence check is not an authority decision. No generation cached from a prior inspection authorizes mutation. Preserve owner bootstrap/recovery API/CAS and token-after-commit behavior; agent setup does not silently refactor owner issuance. Ensure safe generation increment applies to owner and agent. Owner CLI help and next actions now say v3 and quiesced forward upgrade.

Agent enroll/revoke use the same transaction and lock order. After the lock require current v3, exactly one active human owner with an active valid credential and active owner plus connection_admin grants, no active owner grant on an agent, and safe generation. Read relevant principal/credential/grant state after lock. Refuse mixed-human fixed-name state, multiple active agents of any name, and active agents with inconsistent credentials/grants. Valid fixed agent activity means exactly one active credential and only connection_admin; inactive historical rows remain inspectable. Check both principal UUID and digest globally, including inactive credentials.

Enroll exact principal/token already active with fixed name/kind and sole connection_admin is already_active with no writes, generation/event unchanged. Any revoked digest, existing UUID with another token/name/kind, or digest bound to another UUID is permanently refused. Otherwise require no other active agent and no existing UUID/digest, insert fixed agent principal, one credential with random credential UUID, connection_admin grant and agent_enrolled event, then update generation and commit atomically. Never add owner grant or reactivate rows.

Revoke targets exact fixed agent UUID, rejects human or any owner-grant target, and deactivates ALL active credentials and grants for that agent. For a known fixed agent with extra active credentials or grants other than owner, removal is allowed and closes all of them; do not require the enrollment active shape to cleanly remove access. Other conflicting active identities prevent administration until inspected. Fully inactive target returns already_revoked without event/generation writes. Otherwise increment generation and insert agent_revoked (previous_principal_id null), update authority and commit. No peer deletion occurs inside SQL. Unknown UUID returns absent without writes. Precommit errors roll back and return bounded failure; once COMMIT is attempted, transport errors are outcome_unknown regardless of guessed driver status. Status/retry reconciles rather than repeating issuance.

Agent status uses BEGIN REPEATABLE READ READ ONLY and schema/owner/agent reads in that snapshot, as current owner inspection does. It reports revoked only when all target credentials/grants are inactive; active requires consistent shape. Mixed state returns unknown authority_conflict. Status is inspectable for missing/invalid owner (unknown owner_invalid), not proof enrollment failed. Existing `/me`/caller:me accepts agent kind unchanged; runtime query returns fresh grants and denies the next request after full revoke. PR1 adds no public route or route changes. An already authorized pre-revoke read may finish; revocation cannot retract prior bytes.

## Exact changed-path inventory

All paths below are relative to ski-stack-agent-selector; total **15/20**, no conditional extras.

1. `sql/003-pigboard-pilot-agent.sql` — immutable v3 event check and permanent digest uniqueness.
2. `src/hosted/authority-bootstrap.js` — v3 migration/latest receipt, current post-lock owner state, bounded agent file and enroll/status/revoke functions.
3. `scripts/manage-pigboard-agent.mjs` — strict three-verb protected CLI, safe result projection/text/JSON/help and exit contract.
4. `scripts/bootstrap-pigboard-owner.mjs` — required v3/quiescence help and recovery guidance only.
5. `package.json` — three new agent scripts; no dependency/package-lock change.
6. `test/authority-bootstrap.test.js` — existing real TLS PostgreSQL fixture/session lifecycle expanded for v3, agent runtime HTTP and serialization/recovery.
7. `test/agent-cli.test.js` — managed-file custody/durability/failure and strict CLI outcomes, with injected file/connection seams scoped to tests.
8. `test/owner-bootstrap-cli.test.js` — v3 help expectation and unchanged owner command compatibility assertions.
9. `docs/hosted-pigboard-authority.md` — protected three-verb setup/reconciliation/lost-file/full-revoke guide and v3 forward migration.
10. `docs/hosted-pigboard-first-service.md` — private handoff/peer mapping, agent `/me`, exact denial/removal/owner proof and compatible image recovery.
11. `README.md` — available agent commands, narrowed batch/current historical owner evidence, capability and live-proof limits.
12. `docs/delivery-plan.md` — one current two-PR queue; historical batch stays dated; PR2 provisional and S02a partial.
13. `docs/designs/s02a-first-service.md` — scoped dated addendum supersedes roster/advisory/saved-selection expectations for this batch; historical design remains marked historical.
14. `docs/stories/pigboard-pilot-agent.md` — concise Story above in required skill format only.
15. `docs/plans/pigboard-pilot-agent.md` — this concrete plan plus compact author/review/validation/live evidence records and exact revisions.

No Dockerfile change: existing COPY src/hosted and COPY sql package the new static SQL import. No image checker/test change: current checker starts actual entrypoint that imports authority-self -> authority-bootstrap -> all three SQL sources, so missing SQL003 fails startup. Existing image tests/checker are executed, not edited. No ARCHITECTURE change is needed: runtime layer boundaries remain unchanged; source-relevant protected administration architecture is documented in the authority guide and plan. Existing authority-self/health/caller tests are exercised; no production edit required there. A newly needed path triggers inventory and size re-review before coding it.

## Implementation sequence and meaningful verification

1. Copy approved Story/plan to counted paths; implement SQL003 and receipt transitions, then owner lock ordering before the agent mutators. Run the focused real authority fixture first, preserving the existing owner/race/privilege/catalog/HTTP assertions while updating expected current version3.
2. Add bounded file preparation/retry and the three-verb CLI. Extend protected-file and CLI tests; keep all output secret-free. Implement JSON/text semantics from this plan, not a flexible generalized admin framework.
3. Update all counted guides/queue/design addendum/help; follow examples from a clean recipient setup. Mark historical owner evidence dated and pending new deployment/agent proof honestly. Consolidate reviews rather than adding review paths.
4. `npm ci`, then `node --test test/authority-bootstrap.test.js test/agent-cli.test.js test/owner-bootstrap-cli.test.js test/authority-self.test.js test/health-server.test.js test/private-caller-client.test.js test/pigboard-production-image.test.js`. Run `npm test`, `git diff --check`, and `npm run --silent check:pigboard-image -- --format json`. Root verified Docker daemon available under the approved docker escalation; do not treat sandbox socket denial as daemon absence. If the unchanged normal checker fails again at its known five-second Docker command bound, preserve that failure. Obtain fresh owned-artifact startup proof for this exact revision using a separately reviewed operational procedure: build/tag with a fresh ownership UUID, record image ID, run its unchanged unprivileged CMD on1CPU/256MiB with synthetic runtime URL and loopback-only port, inspect exact labelled container/image IDs, verify health and static SQL003 import startup, then remove only those IDs after ownership checks. Record exact commands/results and the remaining normal-checker failure separately; do not increase its timeout, edit its source, reuse earlier proof or call fallback proof a normal-checker pass. This operational procedure must receive two independent Sol reviews before execution; consolidate evidence in the counted plan path. Local TLS tests require initdb/pg_ctl/openssl and fail rather than skip; use existing repository setup/CI tools.
5. Record an author seven-principle assessment, exact diff and checks; commit; obtain two fresh independent Sol committed-code reviews with every changed-file denominator plus requirements/contracts and second sweep. Fix confirmed in-scope findings, commit and repeat relevant tests/review. Open PR only after both exact committed reviews CLEAN; attach PR, finish exact-head required node-and-postgres hosted checks. Owner controls merge/release.
6. Carry out authorized quiesced deployment/live procedure below; record tested deployed revision and proofs separately. Only the complete outcome advances queue live count. If acceptance is blocked, retain the exact incomplete gate and continue independent D1 useful work under root's authorization.

Regression surface: fresh/v1/v2 migrations and immutable historical checksums; latest-only catalog comparison; duplicate historical digest refusal; old v2 operator rejects v3; catalog/privilege drift; unknown migration reply reconciles; explicit transaction isolation even when sessions default REPEATABLE READ; awaited row lock and post-lock generation/owner/schema reads; concurrent new agents, same-file retry, owner recovery versus enroll/revoke and revoke versus reenroll; exact no-write reconciliation and full revoke idempotence; permanently revoked digest refusal; UUID/token conflicts, fixed-name human/multiple-active fail-closed; human/owner revoke denial; all-credential/grant removal; generation exhaustion; lost commit reply status and file retry; agent HTTP200/grants then401 while owner remains200; runtime DML/event-read denial. Add scenarios into the existing real independent-session fixture, including a valid v2 database seeded before v3, instead of a second PostgreSQL infrastructure harness.

File/CLI regression surface: preactivation durable write and ancestor/fsync ordering, short/zero write and fsync failure prevent any SQL, O_EXCL collision, retry exact token/UUID, malformed/missing/partial files, wrong basename/parent/mode/owner/symlink, parent/file substitution, strict parse/exit/text-JSON parity, bounded status queries, unknown versus absent and token/digest omission even on raw driver errors. Existing owner tests remain meaningful. No tests merely mirror an internal implementation choice.

## Quiesced rollout, live acceptance and forward recovery

Current evidence: root's read-only Fly readback 5 October found one started fra Machine `48e73d9b033178`, shared1CPU256MiB, image `sha256:46ff3302f800e91eee8f097d9b6c3f62203766ced770ebc24bba3886f36d6fcd`, reported health passing. This is not fresh owner/agent acceptance or public-IP proof. Preserve resources. Owner live proof recorded4October is historical; rerun required owner check before this change. No Jira credential is required.

Round1 finding is accepted as a real in-scope P1: stopped state cannot maintain closed Flycast ingress with autostart enabled. Installed CLI help confirms `machine cordon`, `uncordon`, `status --display-config`, `update --skip-start --machine-config`, and `deploy --build-only --push --image-label`. Official [autostart documentation](https://fly.io/docs/reference/fly-proxy-autostop-autostart/) confirms private Flycast also starts stopped Machines. [Cordon documentation](https://fly.io/docs/flyctl/machine-cordon/) confirms services are deactivated. The [Machines API contract](https://docs.fly.io/machines/api/machines-resource) defines complete config updates, current_version, skip_launch and skip_service_registration. Use that explicit API contract for fenced updates; do not guess CLI config merging or assume ordinary fly deploy retains cordon. These are research facts, not performed provider changes.

Before mutation record actual image/Machine/private-IP list, schema receipt/catalog and owner UUID/generation/grants through protected owner inspection and caller:me; run existing root/TLS diagnostic. Save the complete actual Machine config and original services array to owned0600 files under owned0700 operator custody, excluding those private files from repository/evidence. No raw env/credential/config output is logged. Serialize all release/operator processes and disallow concurrent ordinary deployment throughout this procedure. The persistent fence is an empty Machine services array plus explicit skipped proxy registration on each update; cordon establishes the initial routing fence before config update, stop drains the runtime, and no-service config prevents autostart after that stop.

1. `fly machine cordon 48e73d9b033178 --app pigboard-pilot-jdc`; inspect complete current Machine and application inventory. Probe the pinned private Flycast route from the preserved owner namespace: it must not return application HTTP200 or current grant. Cordon is only accepted after this negative route proof. Then `fly machine stop 48e73d9b033178 --app pigboard-pilot-jdc` and verify stopped. No migration begins yet.
2. Through an operator HTTPS request with Fly bearer loaded in memory from existing authorized custody, POST `https://api.machines.dev/v1/apps/pigboard-pilot-jdc/machines/48e73d9b033178` with `{config:<complete saved current config with services:[]>,current_version:<fresh instance_id>,skip_launch:true,skip_service_registration:true}`. Preserve all other config, image, resources, secret custody and metadata. No bearer in args/logs, no API helper committed. Inspect GET of exact Machine and app inventory: exactly the existing Machine, services absent/empty, stopped, original image; repeat negative Flycast probe and verify it remains stopped afterward. A failed or ambiguous response must be reconciled by GET before proceeding. CLI reply alone is insufficient.
3. Stop old operator commands and verify no active authority transaction in scoped pg_stat_activity under owner custody. Keep that separate from runtime fence. Only now run reviewed new owner:migrate and owner:inspect; verify v3 receipts/catalog and unchanged owner/generation/grants. No automatic mutation retry on unknown outcome.
4. Build/push the exact reviewed image without touching Machines using `fly deploy --app pigboard-pilot-jdc --build-only --push --image-label <reviewed-commit>`; record registry immutable digest. No normal fly deploy is permitted while fenced. GET fresh Machine config/version and update via the same POST above, retaining services:[], skip_launch:true and skip_service_registration:true and changing only config.image to the immutable reviewed image reference. Inspect image digest, stopped state, no services and exactly one Machine; repeat negative Flycast probe. Every update carries the fence, including compatible-image recovery.
5. Start the fenced compatible Machine explicitly with `fly machine start 48e73d9b033178 --app pigboard-pilot-jdc`. Inspect its image and services still empty; Flycast must remain inaccessible. Run health on Machine loopback8080 and root/TLS diagnostic through authorized Fly SSH/exec, and protected v3 owner SQL inspection. Verify private-only app addresses. Service health checks removed with services are not claimed passing while fenced; loopback/runtime checks provide pre-reopen proof.
6. To prepare deliberate reopen, GET current compatible config/version, restore only the exact saved original services array, and POST full config with skip_service_registration:true (and skip_launch:false), keeping the new immutable image. Wait for started, inspect exact compatible image and restored service config, loopback health/root and owner SQL; Flycast still must not expose application grants. Then and only then `fly machine uncordon 48e73d9b033178 --app pigboard-pilot-jdc`. Verify service health and preserved owner caller:me from its namespace. Record this as the deliberate reopen, not inferred deployment success. Enrollment stays closed until owner200 and required root/TLS/identity checks pass.

If cordon/fenced update cannot be verified, do not migrate. If an update/build/image/migration reply is ambiguous, keep the verified no-services configuration and skipped registration; GET current image/config/state and receipts, then continue only from verified state. After v3 never roll back to v2 operator/source, reverse migration, edit receipts or delete history. A compatible-image retry uses the same fenced payload. An unexpected changed/recreated Machine or extra Machine is a failed invariant: do not automatically recreate, choose another ID or reopen; inspect all app Machines, cordon any in-scope unexpectedly registered runtime, drain and establish services:[] before resuming reviewed recovery. The approved normal path updates the exact existing Machine and creates none, so normal deployment cannot bypass the fence. A genuine replacement requires an explicit stopped/no-services/skipped-registration creation reviewed for that exact failure, with no old runtime left registered. No assumption that an old cordon follows a new ID is allowed. If attempted deliberate reopen is ambiguous, inspect and probe: proven owner200 is reopened; otherwise re-cordon and restore verified no-services config before further recovery. Preserve owner peer, app address and secret custody throughout.

This replaces the original stop-plus-standard-deploy runbook within the same counted guide/plan files and operational estimate. Local recipient reuse removes external coordination; supported full-config updates reuse current Machine custody. The estimate remains12–15.75h (fenced upgrade/peer/replacement1.5–2.25h includes readback/probes and controlled updates, checks/PR0.75–1h includes fresh image proof). If actual needed recovery or independent sizing reaches16h, stop and reconcile scope; do not hide that work in waiting or an extra PR.

Enroll new UUID and record safe result. Create the distinct peer using the installed Fly CLI contract `fly wireguard create pigboard fra pilot-agent-<UUID> /absolute/private/pilot-agent-<UUID>.conf`; private parent0700, peer file0600 and no raw console/config logs. Inspect `fly wireguard list pigboard`, privately map exact UUID to exact peer name and recipient, preserve the owner entry. Use a new isolated Linux namespace/runtime on the owner workstation following the existing accepted owner proof pattern. Keep a distinct agent namespace, WireGuard interface/peer and recipient-owned0700 directory with0600 bearer/config; copy locally through protected custody without external messaging or another person. Run caller as the ordinary recipient UID501:20 rather than root, record independent saved custody, and prove its route to the pinned private IPv6 uses its own peer, then runs `caller:me --token-file /absolute/private/agent-UUID.token --format json`. Record principal UUID, kind agent, only connection_admin, generation; token/config never appears in evidence. A local SQL enrollment cannot substitute for this proof.

Revoke exact UUID and verify status revoked, all active counts zero, next recipient caller:me valid401 denied (503/unverified is not proof). Then `fly wireguard remove pigboard pilot-agent-<UUID>`; inspect peer inventory and prove recipient route unavailable with that removed peer, preserving owner peer and successful owner caller:me. Record removal by exact mapped name, not a guessed similar peer. The complete disconnect requires both authority denial and peer removal. Restart current Machine, check actual image/root/health and owner remains valid; earlier image startup proof is separate from this live check.

For PR2 continuity after proved disconnect, enroll a NEW UUID/token and NEW mapped peer, repeat recipient custody/route/agent /me and owner preservation. Record both distinct identities/events; never reactivate the revoked token/UUID. This replacement proof is included in the estimate. If recipient custody/peer acceptance cannot be performed in the authorized environment, report incomplete live gate; do not use owner-token sharing. Native Mac routing and runtime-login prehash remain adjacent; only demonstrated blocking of these required steps warrants scope discussion.

## Author assessment of all seven principles

1. Intuitive: three verbs describe the fixed pilot connect/disconnect. Humans read current state and next steps; agents use explicit UUID/file inputs without interactive prompts. UUID retry is protected administration, not normal caller setup.
2. Discoverable: counted help and guides give exact commands, outputs, prerequisites and safe lost-file recovery. The recipient discovers its own grant through the existing caller route. PR2 metadata and saved selection are not advertised as available.
3. Delightful experience: exact-file retries preserve work after lost replies. Manual confidential bearer/peer handoff and interrupted replacement are visible pilot costs; outputs do not repeatedly ask for already supplied authority.
4. Token saver: bounded one-identity status and identical text/JSON meanings avoid history dumps and ambiguous short responses. Omissions and actionable next steps reduce blind extra calls without concealing failure.
5. Secure: distinct bearer/peer, preactivation protected custody, permanent digest uniqueness, row-serialized complete revoke and unchanged runtime SELECT-only boundary prevent agent-owner confusion. Human custody differs from recipient capability by design.
6. Agents are equal: recipient uses its own principal and current connection_admin grant through the same noninteractive /me interface. Operator setup does not grant recipient SQL/provider administration; humans and agents share the allowed caller capability.
7. Dependable: local file and SQL outcomes stay separate from live delivery/peer/removal. Unknown replies reconcile immutable intent; revoked credentials stay revoked; forward migration recovery and owner proof preserve honest completed/partial state.

## Review request surface

Review exact artifact/hash and source HEAD, the Story, all 15 path responsibilities and the 7 implementation/verification/rollout sections above against the narrowed design's 24 requirements. Inspect actual source, tests, Docker import chain, command and file contracts before accepting this author assessment. Enumerate examined/total requirements, contracts and paths, complete a second sweep, give evidenced findings and your own seven-principle assessment with human/agent differences. Independently challenge the 15.75h upper estimate and 15-file inventory. Verdict CLEAN or NOT CLEAN applies only to this exact plan; no code, merge, credential creation or release authority follows from it.
