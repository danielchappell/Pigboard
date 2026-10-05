# Publish the Pigboard website reliably

Problem to solve

The approved website is only a local preview. Visitors need its public address,
and maintainers need a repeatable release that cannot change neighboring services.

Acceptance Criteria

- Visitors can read the approved three pages and artwork at the canonical HTTPS hostname.
- Only this repository's current main revision can deploy through the website production environment.
- CI proves the actual non-root website image serves the correct revision before deployment.
- A release verifies public content, metadata, headers and health and records structured evidence.
- A failed replacement restores the recorded prior image/config and verifies it; a failed first launch is reported without pretending rollback occurred.
- Existing DNS records, Rovito and the private Pigboard host remain unchanged, with before/after evidence.

Technical Acceptance Criteria

- Reuse the reviewed static build and Go server, with no new package dependency or product-service code.
- Match Rovito's Go/Debian/Fly region, machine size, lifecycle, HTTPS, readiness and pinned Fly CLI.
- Use a dedicated pigboard-website app in the pigboard organization and an app-only deploy token in the main-only GitHub environment.
- Keep the Docker context finite, runtime non-root and all credentials out of image files and reports.
- Serialize deployment, reject stale/foreign/PR contexts before mutation, and retain exact immutable rollback evidence.
- Change only the new Pigboard DNS route/challenge records, preserving all ten existing records and zone settings.

Testing Strategy

- Manual QA: open the canonical Home, Method and Availability pages on desktop and mobile and compare the approved appearance.
- Access and setup: GitHub deployment access, dedicated Fly app and authenticated Cloudflare session; site visitors need no account.
- Operations: inspect Actions reports, exact version, TLS/DNS and neighboring-service before/after comparisons.
- Automated regression: exercise release refusal and recovery with fake commands, smoke failure with local HTTP fixtures, and real container serving in local/hosted CI.

---

## Scope and dependencies

Reuse design SHA `73d6176692769a364a44d7aa04b6834b887c4cbc044c0958172fbdad9cdd934d`,
CLEAN from two fresh Sol reviewers. W2 is a 15-file, 10–14-human-hour Story.
W3 is the operational release Task using that implementation. Existing approved
PR40/41 remain prerequisites; their merge question is pending. Preserve any newer
main changes (including the unrelated private-agent work) when reconciling bases.

Exact file inventory:

1. `Dockerfile.website` — static Go build and Debian non-root runtime, public output only.
2. `Dockerfile.website.dockerignore` — allowlisted Go source/module and generated image-site files.
3. `deploy/fly/website.toml` — fixed app, cdg, shared 1 CPU/256 MB, one warm Machine and readiness.
4. `.github/workflows/website.yml` — validation, actual image smoke, main-only serialized deployment and always-uploaded evidence.
5. `scripts/install-website-fly.sh` — official pinned x86_64 CLI download/checksum/install for GitHub Ubuntu.
6. `website/deploy.mjs` — guarded release, previous-image/config snapshot, smoke, safe replacement rollback and failure report.
7. `website/deploy.test.mjs` — meaningful guard/failure/recovery scenarios with injected command/HTTP boundaries.
8. `website/smoke.mjs` — bounded HTTP verification using existing routes/artwork; JSON evidence on success and failure.
9. `website/smoke.test.mjs` — local response fixtures for revision/origin/asset/header/probe/private-path failures.
10. `website/container-check.sh` — build real image, launch loopback test container, smoke, cleanup only its own container.
11. `website/README.md` — build/release/operator recovery, prerequisites and credential rotation.
12. `docs/designs/pigboard-website-hosting.md` — reviewed architecture and production boundaries.
13. `docs/plans/pigboard-website-hosting.md` — this Story and implementation plan.
14. `docs/reviews/pigboard-website-hosting.md` — exact independent reviews, local/CI/live evidence and limitations.
15. `docs/delivery-plan.md` — approved visuals, W1/W1a merge state, W2/W3 progress and release evidence.

## Implementation contracts

Build public files in ignored `dist/website-image`, with canonical
`https://pigboard.scubapig.software` and a full commit. Container copies only that
output and the static binary; entrypoint supplies `-listen :8080 -site /site`.
The ignore file admits exact module/server/entrypoint files, avoiding tests and
private repository data. Local preview on 8772 remains untouched.

Workflow validation runs existing website Node/Go tests plus new smoke/deploy
tests and the real container check. No deploy secret in validation or PR jobs.
The deployment job needs validation, requires repository `danielchappell/ski-stack`,
ref `refs/heads/main`, event push or workflow_dispatch, and repository variable
`PIGBOARD_WEBSITE_DEPLOY_ENABLED=true`. Default absent/false permits setup without
publishing. Job uses `website-production`, permissions contents:read, concurrency
`pigboard-website-production` and cancel-in-progress:false. Full Node/PostgreSQL
CI remains unchanged. Initial release requires all current-head checks green.

Release guard compares checked-out commit, GITHUB_SHA and remote main (full
40-hex), checks event/repository/ref and requires FLY_API_TOKEN without printing
it. It repeats current-main checking immediately before Fly mutation. The fixed
config/target cannot be overridden by ordinary inputs. CLI installation pins
0.4.99 and the reviewed official checksum; no unverified install script.

Before mutation, list Machines for the dedicated app. Zero Machines means first
launch. One Machine requires an image_ref with registry.fly.io/pigboard-website
and sha256 digest, matching live version commit, and a saved `fly config show
--toml` configuration. More than one Machine or incomplete prior evidence stops
before mutation. Retain only that public app config and safe image/revision
metadata in `website-release/`; never raw CLI token or private-app configuration.
Public app has no environment secrets. Save prior config before trying deploy.
Recover the prior route/artwork expectations from that commit's tracked builder
using `git show` (checkout fetch-depth:0), without evaluating its code. Require
that revision to be an ancestor of current main and strictly parse the finite
exported route/artwork tables; reject unsupported source shape before mutation.
Save those expectations in the prior snapshot and pass them to rollback smoke.
Validate the prior live site against its own contract before replacing it. This
allows a valid old asset name/hash to differ from the new release's artwork.

Run Fly remote build using fixed config, --ha=false and website-<commit> image
label. Smoke public origin with up to six attempts spaced five seconds; each
request has a ten-second timeout, redirect:error and cache:no-store. A complete
smoke checks version commit/origin/preview, three pages and canonical URLs,
CSS/JS, all three expected artwork hashes, CSP/nosniff/referrer/cache policies,
health/readiness and 404 on representative private/hidden paths; HEAD must also
work. HTTP fixture origin may differ from expected canonical origin for the
local container check. Retries never repeat the deploy mutation itself.

On deployment/smoke failure, preserve original failure. With a prior snapshot,
deploy its immutable digest using its saved TOML under the same job lock, then
smoke its previous commit. Report `rolled_back` only after verification; otherwise
report `rollback_failed`, preserving both errors. Always fail the release job
when the requested release fails, even when recovery succeeds. With no prior
snapshot report `first_release_failed`, retain newly created Machine details and
operator instructions to fix forward or stop only that new website Machine;
never touch neighboring services or delete the app/DNS automatically. Operator
recovery follows the recorded immutable snapshot and verifies the old revision;
disable new deploy dispatches while doing an exceptional manual recovery.

Tests inject command/network boundaries into the orchestrator and assert no
mutation for wrong/PR/stale contexts, no mutation with an incomplete snapshot,
correct immutable/config rollback, honest rollback failure, first-launch failure
and success, including differing old/new artwork contracts. Smoke tests use local servers and check actual responses, not CSS
constants. Container script builds generated output, tests non-root identity,
serves loopback on an allocated local port, runs smoke with production metadata
and removes only its own labeled container after exit. CI repeats this on Linux.

## Operational rollout and verification

After plan review: create only the new Fly app in pigboard, shared IPv4 and IPv6,
request its certificate, and use the returned unique CNAME and _acme-challenge
records. Rovito's current pattern is two DNS-only CNAMEs with Auto TTL; use that
same pattern. The ten-record UI baseline is already saved. Compare it after
adding the two Pigboard records; no edit to existing records, TLS mode or rules.

Create an app-only deploy token with one-year expiry and send it directly through
stdin to `gh secret set FLY_API_TOKEN --env website-production`; never persist or
print it. Verify safe secret metadata and environment main-only policy. The
exact CLI name/expiry belongs in the operator guide; rotate before expiry by
setting a replacement and validating a deployment before revoking the old token.

Commit implementation, obtain two fresh independent Sol code reviews to CLEAN,
open PR and verify current-head CI. Complete prerequisite merges only under
explicit owner confirmation. Request hosting-PR merge approval once concrete and
reviewable if existing authority remains insufficient. Enable deployment only
when DNS, credentials and merges are ready, then dispatch main. Verify the
released full SHA, artifact report, certificate, DNS, redirects, all routes and
browser appearance. Compare existing DNS and neighboring Fly config/image
baselines; rerun Rovito home/version/health/readiness. Report each stage separately.

Author principles: Intuitive—one hostname and routine release path;
Discoverable—operator prerequisites/recovery and readable metadata;
Delightful—approved website intact without visitor setup; Token saver—shared
route/hash contracts and structured evidence; Secure—dedicated resources,
main-only app token, no neighboring mutations; Agents are equal—noninteractive
checks and JSON plus human guides; Dependable—exact revision, real image proof,
failure/rollback distinction and measured production non-regression.
