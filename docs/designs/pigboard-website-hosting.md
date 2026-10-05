# Publish Pigboard's approved website

5 October 2026. The owner approved the bold website, then requested completion
of CI, Fly hosting and `pigboard.scubapig.software` using Rovito's infrastructure.
Reuse W1/W1a's reviewed static Node build, Go handler and approved visual/copy
contracts. No product signup, private-host change, database or runtime rename.
The prior two-PR recovery batch is unrelated to this website continuation.

## Verified decisions and access

Rovito main remains `32875af00a19241541296bbb10543ec29fcb7a42` on 5 October.
Its live Fly config matches `deploy/fly/oauth.toml`: `cdg`, one shared CPU,
256 MB, one warm Machine, forced HTTPS, readiness every 15 seconds (3-second
timeout, 20-second grace). It uses Go 1.26.6 Bookworm, Debian slim with CA roots,
UID/GID 65532, remote Fly build, `--ha=false`, revision-tagged images and smoke.
Pigboard's GitHub platform was explicitly selected instead of Bitbucket.
Use GitHub-hosted Ubuntu for this public static site; Rovito's self-hosted ARM64
runner also builds its unrelated signed product releases, which Pigboard lacks.

Fly account access and the existing `pigboard` organization are verified. No
public website app exists there; `pigboard-pilot-jdc` is the private product and
must remain untouched. Create `pigboard-website` in that organization. If that
name is unavailable, resolve the specific conflict before configuring credentials.
The requested hostname has no existing DNS answer; authoritative nameservers
are Cloudflare. The owner signed into the Codex browser. The zone contains ten existing records,
including Rovito routing/challenge CNAMEs and mail records. A read-only UI baseline
is saved for an exact before/after comparison. No credential value is needed in chat.

GitHub environment `website-production` now exists and permits only branch
`main`. It currently contains no deploy credential. Store a dedicated Fly
app-only deploy token there, expiring after one year; record safe rotation dates
and name, never token bytes. No Rovito or private-host token is reused.
PR40/41 are independently reviewed and passing. Their merge is awaiting explicit
owner confirmation after automatic approval review rejected inferred authority.

## Components and boundaries

- Container: a dedicated `Dockerfile.website` and strict Docker ignore file copy
  only the website Go module and generated public output. Build a static Go
  executable, run as 65532 on port 8080, and exclude Node runtime, repository
  metadata, private code and credentials from the final image. Generate public
  files in `dist/website-image`, separate from the running local preview.
- Fly config: dedicated app, exact Rovito region/size/lifecycle/check settings,
  SIGTERM and 15-second shutdown. Allocate shared IPv4 and public IPv6 for the
  website only; create no volume or database. Fly terminates TLS.
- GitHub Actions: retain normal Node/PostgreSQL checks. Extend Website validation
  with smoke/guard regressions and an actual container smoke test. A deployment
  job needs that validation, runs only on pushes/manual runs of this repository's
  `main`, uses the restricted environment and app-only secret, and serializes
  releases without cancelling one in flight. PR runs never receive the token.
- Release script: verify repository/event/ref, checkout SHA and current remote
  main before deployment, and again immediately before invoking Fly. Install
  Fly CLI 0.4.99 from its official archive with fixed x86_64 checksum
  `384a14958b214b18ebda784dee101a633ceae626ac4bcccee0fc7ebb111247a4`.
  Build with canonical HTTPS origin and full revision, deploy remotely with
  `--ha=false` and `website-<sha>` image label. No arbitrary target input.
- Smoke: finite public route list and artwork hashes from the existing builder;
  verify expected revision, canonical origin, non-preview metadata, all three
  pages, static files, security/cache headers, health/readiness and denied private
  paths. Fetch with bounded timeout and reject redirects. Produce JSON success
  or failure evidence; a failed smoke must fail CI. Retry only bounded transient
  rollout readiness, not mutating deployment calls.
- DNS/TLS: obtain exact record values from `fly certs add/setup`; inspect existing
  Rovito DNS settings and preserve its pattern where applicable. Set only the
  requested Pigboard hostname and Fly ownership/challenge records. Prefer DNS-only
  direct Fly routing; no zone-wide TLS or unrelated record changes. Verify public
  DNS, certificate status, HTTP-to-HTTPS and the canonical hostname.

## Failure, recovery and release

Record the previous Machine image/config and live revision before a replacement
release. Upload the safe snapshot and smoke report as GitHub artifacts even on
failure. On deploy/smoke failure report a partial release, preserve evidence and
restore the recorded immutable image with its recorded configuration under the
same serialized release path; then smoke the previous revision. On first launch
there is no known-good release to restore: fix forward or stop the new Machine
and retain records for diagnosis, never label a failed site healthy. DNS changes
must preserve the prior exact record value (or absence) for recovery.

Do not automate destructive cleanup, token revocation or rollback to an arbitrary
user-supplied image. A documented operator rollback uses the recorded image,
config and expected commit, with owner authority. Deployment does not confer
public access to the Pigboard product. Keep existing truthful availability copy.

The guard rejects stale main before mutation; a newer merge arriving during a
running deployment may briefly leave the older revision live. Serialization then
runs the newer release. Do not claim atomic coordination with GitHub merging.
A green workflow is supplemented by live DNS/TLS and browser verification.
Capture all ten existing scubapig.software DNS records before mutation and compare
all their values, proxy flags and TTLs afterward; only the new Pigboard route and
challenge records may be added. Record website app creation separately and
compare safe Rovito/private-host Fly configuration and Machine image identities
before/after to show they were not changed. Run bounded read-only Rovito home,
version and health/readiness checks before/after; record pre-existing failures
separately. This checks the affected neighboring service, not the wider fleet.
Do not create zone-wide rules, change nameservers/TLS mode, or edit mail records.

## Ordered delivery and scope

W2 is one complete deployable website path: container, CI/deploy guards, smoke,
rollback and operator guidance, with local image proof and exact-head hosted
checks. W3 is the operational Task: app/token/DNS/TLS setup, authorized merge
and deployment, live verification and safe evidence recorded in the same queue.
W3 can prepare resources while W2 is reviewed; it cannot publish unreviewed code.
Use at most 16 files and estimate W2 at 10–14 human hours; groom only after two
independent CLEAN design reviews. Keep W1/41 stacked until their merge approval.

## Author principles

Intuitive: one public address and familiar site, with simple deployment commands.
Discoverable: canonical metadata, direct pages and a clear operator guide.
Delightful: preserve approved visuals and avoid customer setup or fake signup.
Token saver: one route/hash source, structured smoke and concise release evidence.
Secure: isolated app/token, finite image context, non-root runtime, main-only
credential boundary; no private product routes. Agents are equal: standard HTTP,
noninteractive checks and structured reports alongside readable human pages.
Dependable: exact revision checks, real container/live proof, bounded failures,
recorded recovery and distinct build/review/CI/merge/deploy states.

References: [Fly domains](https://docs.fly.io/networking/custom-domain),
[Fly scoped tokens](https://docs.fly.io/security/tokens),
[GitHub environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).
