# Run the first private Pigboard service

This private service gives each authorized caller its own current identity and grant. It holds the restricted Pigboard Neon credential on one private Fly Machine. `GET /health` reports process liveness; `GET /v1/authority/me` reports only the caller's current principal/grants. `GET /v1/jira/choices` returns approved PIG project and associated board names for authorized owner and agent callers. The root diagnostic remains a one-shot Machine command. Owner and agent live acceptance for PR #42 is separate from this names-only change. The [current queue](delivery-plan.md#active-delivery-queue--approved-4-october-2026) is approved named Jira discovery, then regroup. No saved pair or Cursor action is delivered here; green health is not proof of Neon, Jira or a customer flow.

## Before the first deploy

Use only the dedicated Pigboard Fly organization and Pigboard Neon Free project. The named owner must create the restricted `pigboard_app` login privately and pass the [root and role preflight](hosted-neon-preflight.md) against the pinned production root. The source-controlled non-secret target is [`config/neon-pilot-root.json`](../config/neon-pilot-root.json). A child or pooler host, different port/database/role, or invalid TLS is refused. The owner login must never be used as the host runtime login.

An authorized custodian prepares a private UTF-8 file outside the repository and tickets containing one `PIGBOARD_NEON_URL=postgresql://...` line for the restricted role. Keep it mode 0600 and do not paste the URL into shell history, command arguments, a workflow profile, a ticket, chat or logs. The runtime URL may include Neon's `sslmode=require` option. Remove only `channel_binding=require` if it appears in the copied URL: this client cannot enforce that option and refuses it instead of silently downgrading. The host parses the URL into explicit client fields and still requires a verified server certificate, pinned hostname and TLS session. The Node client checks its actual encrypted, certificate-authorized socket and negotiated TLSv1.2/1.3 before identity or protected SQL. PostgreSQL backend SSL statistics describe a separate provider hop and are not client transport evidence. This does not assert provider-internal encryption. The diagnostic does not print the URL or password. The Fly deployer is a trusted custodian because Fly injects the secret into the Machine.

Local validation before deployment:

```bash
npm ci
node --test test/pigboard-production-image.test.js
npm run --silent check:pigboard-image -- --format json
npm test
fly config validate
```

The image check requires Docker and registry/package access. It builds the actual pinned Dockerfile, including its imported SQL and approved Jira manifest/module, and runs its normal unprivileged command on one CPU/256 MiB. A synthetic runtime URL satisfies the nonsecret pin; `/health` does not contact Neon or Jira. The published port is loopback-only and temporary. The command records safe build/start/health/Jira-import/unauthenticated-denial/cleanup stages and image identity in text or JSON; `--help` explains prerequisites. Exit 0 requires healthy startup and successful cleanup. Missing Docker, failed build, early exit, the separate 30-second Docker creation, 20-second service startup and 20-second owned-cleanup deadlines, unsafe ownership or failed cleanup gives exit 1. Raw subprocess logs are withheld. Inspect the named failing stage and Docker availability; never use global prune as recovery. Cleanup inspects UUID ownership and removes only exact check resource IDs. A foreign or unverified resource is left untouched and reported. Ordinary `npm test` covers cleanup failures without a Docker daemon; this actual image run is separate from database or live access proof. Results include the nonsecret UUID ownership label/value, exact container name/image tag, any ownership-verified IDs, and cleanup state (`removed`, `absent`, `retained` or `unverified`). `absent` is an observation at inspection time; a failed build/start reply remains failed and may require later reconciliation. A failed removal reports `retained` only after re-observing that exact owned ID; otherwise it remains `unverified`.

For interrupted or failed cleanup, retain that result before another check. Inspect only its `container.name` or `image.tag`, printing the ID and `dev.pigboard.image-check` label, and compare the label with `resources.ownershipValue`. For example:

```bash
docker container inspect --format '{{.Id}} {{index .Config.Labels "dev.pigboard.image-check"}}' <container-name-from-result>
docker image inspect --format '{{.Id}} {{index .Config.Labels "dev.pigboard.image-check"}}' <image-tag-from-result>
```

If the label differs or inspection fails, leave it untouched and resolve Docker access/identity first. If it matches, remove only the just-verified container ID with `docker container rm --force <verified-container-id>`, then the verified image ID with `docker image rm --no-prune <verified-image-id>`. Re-inspect the exact names/IDs afterward and record the result. Do not force image removal, guess another run's UUID or use global prune. The result never supplies a real credential or raw container logs.

The service can be started locally only with the private runtime URL in its environment. `npm run --silent host:pigboard` listens on port 8080. A local `GET /health` returns `{"schemaVersion":1,"status":"live"}` without contacting Neon. `npm run --silent host:pigboard -- --diagnose-root` prints one JSON result and exits; use it only in an authorized operator environment.

## Create the private app and deploy

The app name in `fly.toml` is `pigboard-pilot-jdc`. The dedicated app and its private address were already allocated as of 1 October. Inspect `fly apps list --org pigboard`, `fly ips list --app pigboard-pilot-jdc` and `fly machine list --app pigboard-pilot-jdc` first; preserve existing resources. Create only if verified absent, after checking that name and organization are the intended Pigboard resources. From this repository checkout, create the app without a Machine, public IP, database or other auto-provisioned service:

```bash
fly launch --copy-config --name pigboard-pilot-jdc --org pigboard --region fra \
  --flycast --no-public-ips --no-deploy --no-db --no-object-storage \
  --no-redis --no-github-workflow --ha=false --auto-stop off
fly apps list --org pigboard
fly ips list --app pigboard-pilot-jdc
fly machine list --app pigboard-pilot-jdc
```

If `fly launch --no-deploy` fails during placement before creating the app, inspect `fly apps list --org pigboard` before retrying. An organization Machine-limit error can be handled only up to app creation without a Machine: use `fly apps create pigboard-pilot-jdc --org pigboard`, then `fly ips allocate-v6 --private --app pigboard-pilot-jdc --org pigboard --region fra`. Do not repeat either command if the app or private address already exists. This app-only path does not resolve the Machine limit; stop before staging the secret or deploying until Fly permits the one reviewed Machine.

Inspect the app configuration and IP list before adding any secret. It should have a private Flycast address and no public IPv4/IPv6 address. `fly launch` can update `fly.toml`; inspect any change before deployment. Stage the secret from the private file so importing it cannot start a Machine:

```bash
fly secrets import --stage --app pigboard-pilot-jdc < /absolute/private/secret-file
fly secrets list --app pigboard-pilot-jdc
fly deploy --app pigboard-pilot-jdc --no-public-ips --ha=false
fly machine list --app pigboard-pilot-jdc
fly ips list --app pigboard-pilot-jdc
fly checks list --app pigboard-pilot-jdc
```

Check that the **actual** state is exactly one shared-cpu-1x/256 MiB Machine in Frankfurt, no public IP, and a passing `/health` check. A build or green health result does not replace that inspection. Record the deployed Git revision, image digest, Machine ID, region, checks and initial Fly/Neon usage. This always-on pilot Machine costs money even while Neon Free compute sleeps; watch actual Fly billing and Neon Free usage rather than treating an estimate as a spending cap.

Run the database diagnostic inside that same Machine:

```bash
fly ssh console --app pigboard-pilot-jdc --machine <machine-id> \
  -C "node scripts/run-pigboard-host.mjs --diagnose-root"
```

The JSON has `schemaVersion`, an overall `pass`, `fail` or `unverified` status, the non-secret expected target, `checks[]` and `omissions[]`. Exit 0 means all checks passed; exit 1 means failure or incomplete proof. `root_target` failure means no connection was attempted. `unsupported_channel_binding` means remove only that URL option and retry; verified TLS remains required. A `tls_verification_failed` or `tls_not_active` result requires certificate/target repair; do not disable TLS checks. `authentication_failed` means check the private role and credential. `temporarily_unavailable` means the connection or read did not complete within the bound; its cause is unknown. Inspect Neon and Fly state, then rerun the one-shot diagnostic. Do not treat a timeout alone as proof that Neon was asleep. Normal health never opens a database connection, so it does not keep Neon awake.

## Inspect a current owner grant

First complete the [protected owner migration and bootstrap](hosted-pigboard-authority.md) on the dedicated production root. Confirm `owner:inspect` reports `schema_current` at version 3 and the current owner generation. The `pigboard_app` runtime login has column-limited reads, not owner or write permission. Keep the owner database URL outside the Machine. Use the private Fly network or an authenticated local tunnel; never add public ingress for this route.

The protected client sends `GET /v1/authority/me` with one bearer header. It reads the current owner's credential from the file created by bootstrap; the database owner URL stays outside the client and host. Before using a **live** bearer, the custodian must confirm `fly ips list --app pigboard-pilot-jdc` shows only the reviewed private IPv6 in [`config/pigboard-private-service.json`](../config/pigboard-private-service.json), `fly machine list --app pigboard-pilot-jdc` shows the reviewed Machine, and `fly wireguard list pigboard` shows a separate network-only owner peer mapped to the owner's principal ID in the private peer ledger. The owner must confirm their workstation's route to that IPv6 uses that peer. The custodian hands the owner bearer into the owner's protected local credential store through a private channel, not a ticket or command line. A matching IPv6 pin alone does not prove the peer or route. The pre-deployment observation on 1 October 2026 was a private IP and **zero Machines**, with live inspection unaccepted. That dated observation is not current-state proof: inspect the resources and complete the procedure below. The [TLS repair plan](plans/pigboard-neon-client-tls.md) records the affected change and separates local, hosted and live evidence.

From the owner's private workstation, with the peer active and the protected owner token file already present, run:

```bash
npm run --silent caller:me -- --token-file /absolute/private/owner-generation-N.token
npm run --silent caller:me -- --token-file /absolute/private/owner-generation-N.token --format json
```

The path is a filename, **not the token**. The command accepts one `pb1_` token plus at most one final newline from a regular nonsymlink mode-0600 file in a user-owned mode-0700 directory. It sends only to the source-controlled `pigboard-pilot-jdc.flycast`/private IPv6 pin, does not follow redirects, and has one 45-second total deadline including Neon Free wake, root validation and grant read. It never prints the bearer. The default text result says verified and shows only the caller's principal, generation and grants; JSON has the same validated fields for a noninteractive agent. The fixed pilot agent uses its **own** token and distinct peer after the protected lifecycle and live proof below; general named human/agent invitations remain deferred. General human invitations remain deferred. The pilot agent peer is mapped privately to its exact immutable agent UUID; preserve the separate owner mapping. No recipient has the owner bearer or an admin action through this command.

A 200 JSON response from the service contains `schemaVersion`, `status: "ok"`, team, generation, the caller's own principal ID/name/kind and `grants`. A valid 401 is `denied`: the credential is not current, and the response reveals no owner identity. To test that live path without disrupting the owner, use a separately protected, correctly shaped but **unissued** test token; a malformed token file instead fails locally before any request. A valid 503 is `unavailable`: root, TLS, schema/grant proof or the database read was not verified, so inspect the private host and Neon and retry later. A transport timeout, changed pin, unsafe file, unexpected HTTP status, malformed response or failed route is `unverified` with `current_grant` omitted; it does **not** prove revocation. The command never echoes raw response text or follows a redirect. Consult [owner inspection and recovery](hosted-pigboard-authority.md#interrupted-setup-and-recovery) for a lost or replaced owner credential; do not repeat a mutation because a read was uncertain. The server sets `Cache-Control: no-store`.

After a Machine restart, inspect again with the same current credential and confirm the generation and grants. On an **authorized disposable owner setup**, recover at the inspected generation, then confirm the old credential gets 401 and the replacement gets 200. Do not rotate a live owner's sole credential just for QA. A failed or unrun private inspection leaves live acceptance open even if local PostgreSQL and HTTP tests pass. `/health` remains independent of Neon and reveals no owner state.

## Discover approved Jira names

After the owner and fixed pilot agent have their **own** current `connection_admin` grants and mapped private WireGuard peers, each can run:

```bash
npm run --silent jira:choices -- --token-file /absolute/private/caller.token
npm run --silent jira:choices -- --token-file /absolute/private/caller.token --format json
```

The argument is a path to that caller's owned mode-0600 bearer file under an owned mode-0700 directory, never the token. The command only contacts the reviewed private Flycast target and sends no Jira credential. Text shows PIG — Pigboard (`10001`) and each returned board name, native ID and type. The initial observed boards were `KAN board (2, simple)` and `Pigboard Selection QA (35, kanban)`; live Jira names can change. Agent JSON contains the same complete choices, `schemaVersion:1`, `status:"complete"`, `site`, `projects`, `omissions` and `nextAction`. This list is read-only. **It does not save a project/board pair, check a board's filter or columns, or authorize issue access or a run.** A board returned for PIG may still be ineligible for a later workflow.

The private API is `GET /v1/jira/choices` with exactly one bearer and no query or body. It checks current `connection_admin` before Jira OAuth and again immediately before releasing buffered names. A revoked or ungranted caller receives 401 `denied` without names. A private authority or Jira access problem is 503 `unavailable`; incomplete/changed identity or paged metadata is 502 `uncertain`. A stalled host lookup closes its HTTP response at the 90-second server deadline without releasing buffered names. An unsafe file, transport failure, 95-second client deadline or changed response is local `unverified`. These failures omit choices; they do not mean there are zero boards. Use `caller:me` or protected owner inspection for a grant denial. For unavailable/uncertain, the owner checks the private host, managed secrets and safe `jira:metadata` diagnostic, then retries the read. Do not repeat any mutation to recover from a discovery failure. An empty board list is meaningful only with `complete`.

The nonsecret immutable [`approved Jira manifest`](../config/pigboard-approved-jira.json) pins Scubapig and project PIG (`10001`). The host's dedicated OAuth client ID and secret live in Fly encrypted app secrets `PIGBOARD_JIRA_CLIENT_ID` and `PIGBOARD_JIRA_CLIENT_SECRET`; the owner feeds protected local files to `fly secrets import --stage --app pigboard-pilot-jdc` through stdin. Never place values in shell arguments, logs, source, a ticket or `Machine.config.env`. A missing or invalid Jira secret makes discovery unavailable while `/health` and `/v1/authority/me` continue to work. The production image check verifies the manifest/module import and unauthenticated route denial with synthetic values; it does not prove live Jira access. The operator keeps the existing single-Machine [persistent no-services/skipped-registration fence](#upgrade-v3-with-private-ingress-fenced) for any scoped manifest reduction, secret rotation or image rollout. If using a local build-only push, include `--local-only --push` so Fly does not start a remote builder. Root-owned live acceptance checks owner and agent over their separately mapped peers and records the exact deployed image/Machine; their existing source mounts predate this command, so use exact reviewed client bytes in a temporary path rather than re-enrolling or changing peer mapping.

## Check wake, restart and rollback

For the live wake check, leave that Fly Machine running and observe the pinned Neon production compute marked **SUSPENDED** in the Pigboard console. Run the same Machine's diagnostic again and record whether a fresh verified connection passes after wake, or which bounded check remains unverified. Check liveness separately with `fly checks list --app pigboard-pilot-jdc`. Repeat owner inspection with the unchanged bearer after observed wake, recording identity/generation/grants or the bounded unavailable/unverified result. Then restart that Machine and repeat the diagnostic, health and same-bearer owner inspection:

```bash
fly machine restart <machine-id> --app pigboard-pilot-jdc
```

For the first deployment there is no prior serving image. If it fails, inspect the exact newly created dedicated Pigboard Machine ID, then stop/destroy only that Machine to restore the recorded zero-Machine/no-serving state. Verify the list is empty. Retain verified schema and protected credentials; record any staged runtime secret and private address that remain. This is not a database rollback. Never destroy an unrelated Machine or reverse migrations.

After v3, recovery must use a reviewed v3-compatible image and the fenced procedure below; never run an old operator or reverse migration. For a later compatible disposable code-image rollback, record the prior image reference from `fly releases --image --app pigboard-pilot-jdc`, deploy the test revision, then redeploy the prior image with `fly deploy --image <prior-image> --app pigboard-pilot-jdc --no-public-ips --ha=false`. Confirm the resulting image and exactly one Machine, then repeat health and root diagnostic. Keep the current secret and pin; do not run a reverse migration. The running inspection host makes no database write; protected owner setup does write authority. This owner-access slice and cannot prove that a saved pair survives rollback. S02a owns that later test. A failed or incomplete live check remains an open gate, even when local tests pass.


## Upgrade v3 with private ingress fenced

Current source supports v3 and the fixed agent; source availability alone does not prove deployed acceptance. The [approved implementation plan](plans/pigboard-pilot-agent.md#quiesced-rollout-live-acceptance-and-forward-recovery) pins the exact full-config API payloads, recovery and proofs. The live Machine readback5 October found `48e73d9b033178` in fra, shared 1 CPU/256 MiB, health reported passing; preserve it and recheck rather than create infrastructure. Owner caller200 was separately read back5 October; that is baseline proof, not new-code acceptance.

The app's autostart setting applies to private Flycast. **Stopping is not an ingress fence.** Before migrating, retain the complete current Machine config/services in private operator custody; close operator/deployment activity, cordon the exact Machine, prove Flycast cannot return application data, stop and inspect it. Use the Machines API to update the complete exact config with services:[], skip_launch:true, skip_service_registration:true and fresh current_version. Verify the stopped no-services state across a negative Flycast request, then separately verify old operators and owner transactions quiesced.

Apply the protected v3 migration and inspect receipts/catalog and unchanged owner. Build/push the reviewed image with `fly deploy --app pigboard-pilot-jdc --build-only --push --image-label <reviewed-commit>`; ordinary deployment is forbidden while fenced. Update only that exact existing Machine through the approved API payload, retaining empty services and skipped registration. Inspect image digest/config/inventory before any explicit start. Start behind the fence; verify Machine loopback health, root/TLS and protected owner SQL. Reopening is deliberate: restore only the saved service array while still skipping registration, verify compatible image/root/health, then `fly machine uncordon 48e73d9b033178 --app pigboard-pilot-jdc` and prove private owner 200.

Ambiguous replies are inspected before retries. Keep verified no-services/skipped-registration settings through compatible-image recovery. Unexpected extra/recreated Machines fail the invariant and require fenced recovery for their actual IDs; never assume an old cordon follows a new Machine. Never reverse migration or deploy an old v2 operator. A failed reopen requires readback/probes and re-fencing before further changes. See the complete plan for exact payloads and supported official Fly references.

## Prove and remove the pilot agent

Use an isolated local Linux recipient runtime following the accepted owner namespace pattern. Give it independent custody, network namespace, WireGuard interface and peer; run the normal caller as UID501:20. Keep bearer/config files in recipient-owned mode 0700 directories with mode 0600 regular files. This is local authorized custody, with no external messaging or need for another person.

After protected `agent:enroll`, create `pilot-agent-<UUID>` with `fly wireguard create pigboard fra pilot-agent-<UUID> /absolute/private/pilot-agent-<UUID>.conf`. Inspect `fly wireguard list pigboard`, map exact UUID/peer/recipient privately and preserve the owner peer. Transfer the returned managed bearer and peer config locally through protected custody, never terminal output, args or logs. Record saved custody and prove the route to the pinned Flycast private IPv6 uses this **distinct** peer. Then run from that recipient:

```
npm run --silent caller:me -- --token-file /absolute/private/agent-UUID.token --format json
```

Require valid200, the enrolled UUID, kind agent and only connection_admin. Database enrollment/path output is not recipient proof. Keep generation/UUID/peer name and safe results in evidence; never token/config/owner URL. If custody or routing fails, leave setup unverified and recover using protected status rather than sharing the owner bearer.

Revoke the exact UUID with agent:revoke; status must show revoked and zero active credentials/grants. The next recipient caller request must be a valid 401 denied, not 503 or unverified. Remove that mapped peer with `fly wireguard remove pigboard pilot-agent-<UUID>`, inspect inventory and prove the recipient route is no longer available via that peer. Check owner 200 and unchanged owner peer separately. Only then is disconnect complete. Restart the compatible Machine and recheck image/root/health/owner. For PR2 continuity, enroll a **new** UUID/token/peer and repeat custody/route/agent 200; never reactivate the revoked token. The approved names-only Jira route still needs its own committed-code review, PR checks, deployed image and owner/agent live acceptance; no saved pair exists.
