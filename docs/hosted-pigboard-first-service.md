# Run the first private Pigboard service

This service is an operator-only first host for the future project-and-board selector. It holds the restricted Pigboard Neon credential on one private Fly Machine. It exposes only `GET /health` on Fly's private network. The root diagnostic is a one-shot command inside the Machine, not an HTTP route. There is no Jira credential, caller grant, saved project-board pair or Cursor action in this slice. A green health check means the process is live; it does not mean Neon, Jira or a customer flow is ready.

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

## Check wake, restart and rollback

For the live wake check, leave that Fly Machine running and observe the pinned Neon production compute marked **SUSPENDED** in the Pigboard console. Run the same Machine's diagnostic again and record whether a fresh verified connection passes after wake, or which bounded check remains unverified. Check liveness separately with `fly checks list --app pigboard-pilot-jdc`. Then restart that Machine and repeat both checks:

```bash
fly machine restart <machine-id> --app pigboard-pilot-jdc
```

For a disposable code-image rollback, record the prior image reference from `fly releases --image --app pigboard-pilot-jdc`, deploy the test revision, then redeploy the prior image with `fly deploy --image <prior-image> --app pigboard-pilot-jdc --no-public-ips --ha=false`. Confirm the resulting image and exactly one Machine, then repeat health and root diagnostic. Keep the current secret and pin; do not run a reverse migration. This slice makes no database write and cannot prove that a saved pair survives rollback. S02a owns that later test. A failed or incomplete live check remains an open gate, even when local tests pass.
