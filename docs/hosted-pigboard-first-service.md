# Run the first private Pigboard service

This service is an operator-only first host for the future project-and-board selector. It holds the restricted Pigboard Neon credential on one private Fly Machine. It exposes `GET /health` and, after authority migration version 2, `GET /v1/authority/me` on Fly's private network. The latter returns only the authenticated caller's current principal and grants. The root diagnostic is a one-shot command inside the Machine, not an HTTP route. There is no Jira credential, saved project-board pair or Cursor action in this slice. A green health check means the process is live; it does not mean Neon, Jira or a customer flow is ready.

## Before the first deploy

Use only the dedicated Pigboard Fly organization and Pigboard Neon Free project. The named owner must create the restricted `pigboard_app` login privately and pass the [root and role preflight](hosted-neon-preflight.md) against the pinned production root. The source-controlled non-secret target is [`config/neon-pilot-root.json`](../config/neon-pilot-root.json). A child or pooler host, different port/database/role, or invalid TLS is refused. The owner login must never be used as the host runtime login.

An authorized custodian prepares a private UTF-8 file outside the repository and tickets containing one `PIGBOARD_NEON_URL=postgresql://...` line for the restricted role. Keep it mode 0600 and do not paste the URL into shell history, command arguments, a workflow profile, a ticket, chat or logs. The runtime URL may include Neon's `sslmode=require` option. Remove only `channel_binding=require` if it appears in the copied URL: this client cannot enforce that option and refuses it instead of silently downgrading. The host parses the URL into explicit client fields and still requires a verified server certificate, pinned hostname and TLS session. The diagnostic does not print the URL or password. The Fly deployer is a trusted custodian because Fly injects the secret into the Machine.

Local validation before deployment:

```bash
npm ci
npm test
fly config validate
```

The service can be started locally only with the private runtime URL in its environment. `npm run --silent host:pigboard` listens on port 8080. A local `GET /health` returns `{"schemaVersion":1,"status":"live"}` without contacting Neon. `npm run --silent host:pigboard -- --diagnose-root` prints one JSON result and exits; use it only in an authorized operator environment.

## Create the private app and deploy

The app name in `fly.toml` is `pigboard-pilot-jdc`. Before creating it, check that name and the organization are still the intended Pigboard resources. From this repository checkout, create the app without a Machine, public IP, database or other auto-provisioned service:

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

Check that the **actual** state is exactly one shared-cpu-1x/1 GB Machine in Frankfurt, no public IP, and a passing `/health` check. A build or green health result does not replace that inspection. Record the deployed Git revision, image digest, Machine ID, region, checks and initial Fly/Neon usage. This always-on pilot Machine costs money even while Neon Free compute sleeps; watch actual Fly billing and Neon Free usage rather than treating an estimate as a spending cap.

Run the database diagnostic inside that same Machine:

```bash
fly ssh console --app pigboard-pilot-jdc --machine <machine-id> \
  -C "node scripts/run-pigboard-host.mjs --diagnose-root"
```

The JSON has `schemaVersion`, an overall `pass`, `fail` or `unverified` status, the non-secret expected target, `checks[]` and `omissions[]`. Exit 0 means all checks passed; exit 1 means failure or incomplete proof. `root_target` failure means no connection was attempted. `unsupported_channel_binding` means remove only that URL option and retry; verified TLS remains required. A `tls_verification_failed` or `tls_not_active` result requires certificate/target repair; do not disable TLS checks. `authentication_failed` means check the private role and credential. `temporarily_unavailable` means the connection or read did not complete within the bound; its cause is unknown. Inspect Neon and Fly state, then rerun the one-shot diagnostic. Do not treat a timeout alone as proof that Neon was asleep. Normal health never opens a database connection, so it does not keep Neon awake.

## Inspect a current owner grant

First complete the [protected owner migration and bootstrap](hosted-pigboard-authority.md) on the dedicated production root. Confirm `owner:inspect` reports `schema_current` at version 2 and the current owner generation. The `pigboard_app` runtime login has column-limited reads, not owner or write permission. Keep the owner database URL outside the Machine. Use the private Fly network or an authenticated local tunnel; never add public ingress for this route.

The protected client sends `GET /v1/authority/me` with one bearer header. It reads the current owner's credential from the file created by bootstrap; the database owner URL stays outside the client and host. Before using a **live** bearer, the custodian must confirm `fly ips list --app pigboard-pilot-jdc` shows only the reviewed private IPv6 in [`config/pigboard-private-service.json`](../config/pigboard-private-service.json), `fly machine list --app pigboard-pilot-jdc` shows the reviewed Machine, and `fly wireguard list pigboard` shows a separate network-only owner peer mapped to the owner's principal ID in the private peer ledger. The owner must confirm their workstation's route to that IPv6 uses that peer. The custodian hands the owner bearer into the owner's protected local credential store through a private channel, not a ticket or command line. A matching IPv6 pin alone does not prove the peer or route. The current app has a private IP but **no Machine**; live inspection is not yet accepted.

From the owner's private workstation, with the peer active and the protected owner token file already present, run:

```bash
npm run --silent caller:me -- --token-file /absolute/private/owner-generation-N.token
npm run --silent caller:me -- --token-file /absolute/private/owner-generation-N.token --format json
```

The path is a filename, **not the token**. The command accepts one `pb1_` token plus at most one final newline from a regular nonsymlink mode-0600 file in a user-owned mode-0700 directory. It sends only to the source-controlled `pigboard-pilot-jdc.flycast`/private IPv6 pin, does not follow redirects, and has one 45-second total deadline including Neon Free wake, root validation and grant read. It never prints the bearer. The default text result says verified and shows only the caller's principal, generation and grants; JSON has the same validated fields for a noninteractive agent. A named human or agent recipient can use their **own** token and private peer only after later D3e issuance. Recipient peers are mapped by stable recipient key, unlike the owner's principal-ID peer. No recipient has the owner bearer or an admin action through this command.

A 200 JSON response from the service contains `schemaVersion`, `status: "ok"`, team, generation, the caller's own principal ID/name/kind and `grants`. A valid 401 is `denied`: the credential is not current, and the response reveals no owner identity. To test that live path without disrupting the owner, use a separately protected, correctly shaped but **unissued** test token; a malformed token file instead fails locally before any request. A valid 503 is `unavailable`: root, TLS, schema/grant proof or the database read was not verified, so inspect the private host and Neon and retry later. A transport timeout, changed pin, unsafe file, unexpected HTTP status, malformed response or failed route is `unverified` with `current_grant` omitted; it does **not** prove revocation. The command never echoes raw response text or follows a redirect. Consult [owner inspection and recovery](hosted-pigboard-authority.md#interrupted-setup-and-recovery) for a lost or replaced owner credential; do not repeat a mutation because a read was uncertain. The server sets `Cache-Control: no-store`.

After a Machine restart, inspect again with the same current credential and confirm the generation and grants. On an **authorized disposable owner setup**, recover at the inspected generation, then confirm the old credential gets 401 and the replacement gets 200. Do not rotate a live owner's sole credential just for QA. A failed or unrun private inspection leaves live acceptance open even if local PostgreSQL and HTTP tests pass. `/health` remains independent of Neon and reveals no owner state.

## Check wake, restart and rollback

For the live wake check, leave that Fly Machine running and observe the pinned Neon production compute marked **SUSPENDED** in the Pigboard console. Run the same Machine's diagnostic again and record whether a fresh verified connection passes after wake, or which bounded check remains unverified. Check liveness separately with `fly checks list --app pigboard-pilot-jdc`. Then restart that Machine and repeat both checks:

```bash
fly machine restart <machine-id> --app pigboard-pilot-jdc
```

For a disposable code-image rollback, record the prior image reference from `fly releases --image --app pigboard-pilot-jdc`, deploy the test revision, then redeploy the prior image with `fly deploy --image <prior-image> --app pigboard-pilot-jdc --no-public-ips --ha=false`. Confirm the resulting image and exactly one Machine, then repeat health and root diagnostic. Keep the current secret and pin; do not run a reverse migration. This slice makes no database write and cannot prove that a saved pair survives rollback. S02a owns that later test. A failed or incomplete live check remains an open gate, even when local tests pass.
