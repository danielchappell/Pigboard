# Pigboard website

The public marketing website has Home, Method and Availability pages. It describes
the intended delivery outcome for a lead with an existing technical team and
clearly identifies today's private tools. It does
not expose the private host, offer hosted signup, or require credentials to run.

## Build and preview

Use Node 20 or later and Go 1.26.6. From the repository root:

```sh
node website/build.mjs
go -C website build -o ../dist/pigboard-site ./cmd/site
./dist/pigboard-site
```

Open <http://127.0.0.1:8772/>. Stop with Ctrl-C before rebuilding after editing
HTML, CSS, JavaScript or artwork, then start the server again. The rooted server
keeps the directory it opened at startup; a successful build replaces that
directory, so a running preview must restart to use the new output.
Use `./dist/pigboard-site -listen 127.0.0.1:8773` for another port. Keep preview
listeners on loopback. Missing or malformed generated output stops startup with
an error; rebuild before retrying. `/healthz` reports process health; `/readyz`
checks the website index and version, without touching product services.

Local builds use `local` as the revision, loopback canonical URLs and `noindex`.
A public metadata build requires both an HTTPS origin and a full Git revision:

```sh
PIGBOARD_SITE_ORIGIN=https://pigboard.example \
PIGBOARD_SITE_COMMIT=$(git rev-parse HEAD) node website/build.mjs
```

The example domain is illustrative. This builds files; it does not deploy them.
A loopback origin always remains a preview, including with a full revision.
`version.json` records the origin, revision and preview flag for verification.

## Checks

```sh
node --test website/*.test.mjs
node --check website/app.js
go -C website test -race ./...
go -C website vet ./...
```

The GitHub Actions website workflow runs these checks and tests the actual
non-root Docker image with `sh website/container-check.sh` (Docker required).
The repository's ordinary `npm test` also discovers the website Node tests;
its existing PostgreSQL integration prerequisites still apply to the full suite.
Browser checks cover desktop/mobile, every primary link, keyboard tabs, copy
feedback and readable content without JavaScript. The preview and eventual
container use the same Go executable, generated-file allowlist and rooted
filesystem handler, which rejects symlink escapes.

## Build recovery

`dist/website/` is generated and ignored. The builder validates all source and
approved artwork before writing a staged sibling directory. It replaces only
an empty output directory or one with its own build manifest. A file, symlink
or unrelated directory is refused; choose a dedicated output instead of deleting
unrelated data. Do not run concurrent builds into the same output directory.

If promotion fails, the builder restores the previous directory. If restoration
also fails, the error names the retained backup and staged output: stop the
preview, inspect those directories, move the previous complete backup back to
`dist/website/`, then retry the build. Preserve both until recovery is verified.
A warning after successful promotion means the new site is complete but an old
backup could not be removed; inspect it and remove that named backup when safe.

## Source and delivery boundary

The shared components, spacing, page patterns and Go serving approach come from
Rovito revision `32875af00a19241541296bbb10543ec29fcb7a42`: `website/`,
`internal/website`, `Dockerfile.oauth` and `deploy/fly/oauth.toml`. Internal CSS
names such as `--rv-*` retain that component interface, with semantic aliases
adapted to Pigboard's light theme. Pigboard uses sunshine yellow (`#ffe36a`),
cobalt (`#244de8`), deep blue (`#183159`), coral (`#ff8c73`), mint (`#a7e4ca`)
and warm paper (`#fffaf0`). Header/hero use yellow, benefits use a blue field
with colored panels, and the closing section uses coral. Dark links and white
text on blue actions keep the color roles readable.

The header/footer wordmark is semantic HTML in the existing rounded font family.
The hero uses `mascot-board-v2.png`: the pig and translucent board with transparent
surroundings, copied unmodified from the generated source and hash-checked.
Original approved exports remain in `assets/brand/pigboard/`; the graphite
lockup remains the social-sharing image. No opacity, tint or opaque frame is
applied to the hero. The [asset guide](../assets/brand/pigboard/README.md) records
provenance, the exact new prompt and export limits. The earlier plum theme is
historical; the [bold visual follow-up](../docs/designs/pigboard-bold-visuals.md)
records the owner's new happy, colorful, bold direction.
Tab panels are readable before JavaScript; copy controls remain hidden until
their handler is ready. Script initialization adds tab roles,
keyboard selection and hiding. Clipboard denial selects the text with feedback.

## Production deployment

The canonical address is <https://pigboard.scubapig.software>. Hosting is a
separate Fly app, `pigboard-website`, in the `pigboard` organization: `cdg`, one
shared CPU, 256 MB and one warm Machine. `Dockerfile.website` builds the same Go
server with Go 1.26.6 and Debian Bookworm, running as UID/GID 65532. Its allowlisted
build context contains only that server and generated public files. The approved
copy and artwork are unchanged. The private product app is not part of this release.

**Release status:** the marketing website is live and was verified on 7 October
2026. Its initial release was `20c1d7ce086a0becf151fb1fface25400fcadb96`;
[version.json](https://pigboard.scubapig.software/version.json) identifies the
currently served revision. Follow the [delivery queue](../docs/delivery-plan.md)
and [hosting evidence](../docs/reviews/pigboard-website-hosting.md) for review,
CI and live verification. The hosted Pigboard product remains in development.

Deployment prerequisites:

- Reviewed website changes merged to `main`, with required current-head checks passing.
- GitHub environment `website-production`, restricted to `main`, containing
  `FLY_API_TOKEN` for this app only. PR validation never receives this credential.
- The dedicated Fly app, shared IPv4/IPv6 and issued hostname certificate.
- Cloudflare DNS-only CNAMEs (Auto TTL): `pigboard` to
  `6kglmnj.pigboard-website.fly.dev`, and `_acme-challenge.pigboard` to
  `pigboard.scubapig.software.6kglmnj.flydns.net`. Preserve all other records and
  zone settings. Fly may supply different values if an app is deliberately recreated.
- Repository variable `PIGBOARD_WEBSITE_DEPLOY_ENABLED=true`, enabled only after
  release approval and setup. Leave absent or false while preparing the first launch.

The Website workflow validates each push/PR. Its deploy job runs for main pushes
or a manual main dispatch only when enabled. It serializes releases, checks the
repository, event, checkout and current remote main immediately before deploying,
and uses pinned Fly CLI 0.4.99 with a verified archive checksum. A newer main
revision makes an older queued run refuse deployment; dispatch the latest main.

After setup and authorization, dispatch from the repository root:

```sh
gh workflow run website.yml --repo danielchappell/ski-stack --ref main
```

The workflow generates production metadata, remotely builds the dedicated image
and checks the public revision, three pages, artwork hashes, static resources,
security/cache headers, HEAD, 404s and health/readiness. Inspect Actions artifacts
`website-container-<run>-<attempt>` and `website-release-<run>-<attempt>`;
local equivalents live in ignored `dist/website-release/`. To verify a known
full deployed revision without deploying:

```sh
PIGBOARD_SITE_COMMIT=<full-deployed-git-sha> node website/smoke.mjs
```

Replace the angle-bracket placeholder before running. The JSON report identifies
success/failure and the exact requested revision. A build, passing CI or issued
certificate alone does not establish that the site is live.

## Failed releases and credential rotation

Before replacing a release, the job requires one existing Machine, its immutable
app-specific image digest, saved Fly configuration and a verified live revision.
It extracts the prior ancestor revision's route/artwork contract as data, then
verifies that contract before any mutation. Unsupported or incomplete snapshots
stop the release. More than one Machine also stops; reconcile only this app's
state before retrying.

A failed replacement restores the recorded image and configuration under the
same job lock, then verifies the prior revision against its own artwork hashes.
`rolled_back` means that verification passed; the requested release still fails.
`rollback_failed` retains both errors. `refused` means deployment never started.
`first_release_failed` means there was no prior release to restore: inspect the
reported new website Machine and fix forward, or stop only that Machine. Do not
delete the app, DNS records or neighboring services to resolve a website failure.

For exceptional manual recovery, set the enable variable to false, let any active
website deployment finish, and inspect/download that run's release artifact.
Use its `previous.json` image/commit and `previous.toml` with `flyctl deploy
--app pigboard-website --config <saved-previous.toml> --image <saved-immutable-image>
--ha=false`. Verify the saved commit with the saved contract, for example from the
repository root (substitute the artifact directory):

```sh
node --input-type=module -e '
import {readFileSync} from "node:fs";
import {smoke} from "./website/smoke.mjs";
const prior=JSON.parse(readFileSync("<artifact-directory>/previous.json", "utf8"));
await smoke({commit:prior.commit, contract:prior.contract,
  output:"dist/website-release/manual-recovery.json"});'
```

Keep deployment disabled until the failure is understood and the intended current
main is ready. A public-site failure must never be repaired through `rovito-oauth`
or `pigboard-pilot-jdc`.

The app-only deploy token is named `github-website-production-2026-10-05`, created
5 October 2026 with `--expiry 8760h`; rotate before 5 October 2027. Create its
replacement with `flyctl tokens create deploy --app pigboard-website --expiry
8760h --name <dated-name>` and send the captured token directly to
`gh secret set FLY_API_TOKEN --repo danielchappell/ski-stack --env website-production`
through stdin. Never paste token bytes into chat, logs, repository files or build
arguments. Validate a deployment using the replacement before revoking the old
token by its exact identity; do not revoke other app credentials. Verify secret
metadata with `gh secret list --repo danielchappell/ski-stack --env website-production`.

See the [hosting design](../docs/designs/pigboard-website-hosting.md),
[implementation plan](../docs/plans/pigboard-website-hosting.md) and
[review evidence](../docs/reviews/pigboard-website-hosting.md).

## Copy and claim boundaries

The current positioning refinement is in the
[website design](../docs/designs/pigboard-website.md#customer-promise-refinement--4-october-2026).
It supersedes the earlier process-led marketing candidate. Lead with delivery,
project visibility, informed decisions and team continuity; explain the supported
method as the mechanism. Keep examples illustrative and hosted capability
future-oriented, including in page descriptions. Do not claim battle-tested
hosted operation, quantified savings, uniqueness or guaranteed correctness
without evidence. Availability must describe actual access without an invented
signup or contact channel.
