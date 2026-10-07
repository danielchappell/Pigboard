# Pigboard website hosting evidence

This record covers the 15-file W2 Story and the separate W3 release Task. The
approved copy and bold appearance are unchanged; the marketing website is live.

## Verified launch — 7 October 2026

The owner explicitly approved merging PR40, PR41 and PR43 and launching. They
merged in order as `24abc79b2afef8e1f09bbc2512f6b3ba9549b7cd`,
`fe1e476e713d923c0037ce0ededab47fea4909bf` and
`20c1d7ce086a0becf151fb1fface25400fcadb96`. The reviewed website tree survived
unchanged; unrelated main private-agent work was preserved.

- Main full-repository CI [37682903882](https://github.com/danielchappell/ski-stack/actions/runs/37682903882)
  and website/container CI [37682903970](https://github.com/danielchappell/ski-stack/actions/runs/37682903970)
  passed for `20c1d7ce086a0becf151fb1fface25400fcadb96` before enabling deployment.
- Production [run 37684086251](https://github.com/danielchappell/ski-stack/actions/runs/37684086251)
  succeeded for that exact revision. Its release artifact reports `deployed`,
  `previous: null`; hosted live smoke passed all 18 HTTP checks. An independent
  local invocation against the public hostname also passed all 18 checks.
- [Canonical website](https://pigboard.scubapig.software/) serves Home, Method and
  Availability with production metadata. [Version metadata](https://pigboard.scubapig.software/version.json)
  reports the currently served commit and origin with `preview: false`.
  HTTP redirects 301 to HTTPS; Fly reports the certificate issued/verified/active.
- One started website Machine `871476a60e4518`, `cdg`, shared 1 CPU/256 MB,
  passing readiness, image `website-20c1d7ce086a0becf151fb1fface25400fcadb96`,
  immutable digest `sha256:31a70c5f71705948e5ae2abb13f657bc09713157caaa25df01a5b99d573a4aa3`.
  The deployment used pinned Fly CLI 0.4.99. Local login's automatic CLI update
  to 0.4.113 did not change the workflow pin or production neighbors.
- Live desktop and 390px mobile QA retained the approved palette/transparent pig.
  All three pages were inspected, primary navigation and keyboard journey-tab
  selection worked, and Home/Method/Availability had no horizontal overflow.
  Local screenshots: `/private/tmp/pigboard-live-desktop-20261007.jpg`,
  `pigboard-live-mobile-20261007.jpg`, `pigboard-live-method-mobile-20261007.jpg`.
- Fresh before/after comparisons preserved all 12 DNS rows, including the ten
  pre-existing records and two Pigboard additions. Both `rovito-oauth` and
  `pigboard-pilot-jdc` configurations and Machine images matched. Rovito home,
  version, health and readiness matched the fresh pre-launch HTTP baseline.
  This proves these specific surfaces; it is not private-product live acceptance.
  Local comparison files are `/private/tmp/pigboard-dns-{before,after}-launch-20261007.json`,
  `pigboard-neighbors-{before,after}-launch-20261007.json` and
  `pigboard-rovito-{before,after}-launch-20261007.json`.

The W3 implementation and operational acceptance are complete. This three-file
release-documentation follow-up reuses the reviewed design/plan and changes no
website assets, serving code, workflow, deployment configuration or private
runtime. It updates the operator guide, this evidence and the website queue;
independent committed-documentation review and publication are its remaining gates.
No new runtime tests are needed for this documentation-only delta. The initial
release above remains historical evidence when later main commits are deployed.

Author principles for the documentation follow-up: Intuitive—status identifies
the public address and current version; Discoverable—portable CI links and local
comparison paths make evidence findable; Delightful—removes obsolete setup status
without changing visitor experience; Token saver—consolidated exact revisions
avoid reconstruction; Secure—no credential or permission changes and no token
bytes recorded; Agents are equal—revision/evidence links support agents while
plain instructions support humans; Dependable—initial release, current version,
local/hosted/live checks and private-product limitations remain distinct.

## Historical setup context — 5 October 2026

At the initial snapshot, W1/PR40 and W1a/PR41 were unmerged prerequisites.
Automatic approval review had rejected inferring that earlier branding-PR merge
authority covered these website PRs. No deployment had occurred then; the owner's
7 October confirmation and verified launch above supersede that setup state.

## Independent design and plan gates

Two fresh independent Sol reviewers examined each artifact, with complementary
product/documentation and technical/security/failure/test lenses. Both performed
a second sweep and independently assessed all seven principles.

- Design SHA-256 `73d6176692769a364a44d7aa04b6834b887c4cbc044c0958172fbdad9cdd934d`:
  product CLEAN, 6/6 sections, 10/10 requirement groups, 10/10 supporting surfaces;
  technical CLEAN, 6/6 sections, 11/11 contracts, 12/12 local sources, 3/3 official
  references. An initial P2 required measured neighboring-production preservation;
  the revised artifact adds complete DNS and Fly config/image baselines plus
  Rovito HTTP checks. That finding is resolved in the reviewed hash.
- Plan SHA-256 `4a1256ecc13bfe5c803ff609fa3202ef4f4f0a83facb70fadcaca23248b906c6`:
  product and technical CLEAN, each covering 15/15 file responsibilities, 6/6 AC,
  6/6 TAC and 4/4 testing sections; technical also enumerated 9/9 contracts.
  An initial P2 identified old/new artwork mismatch during rollback. The revised
  contract parses the prior ancestor builder as data, preflights its own contract
  and retains that contract for rollback. This is covered by regression testing.

Implementation refinement: generated release reports use ignored
`dist/website-release/` instead of the plan's root `website-release/`. No contract,
scope or file-count expansion; operator guidance and CI uploads use the final path.
The reviewed design/plan remain historical setup snapshots; current resource
state is recorded below, rather than rewriting their reviewed hashes.

## Author implementation assessment

- Intuitive: one canonical hostname and ordinary main-branch release workflow.
- Discoverable: README explains prerequisites, JSON evidence, refusal and recovery.
- Delightful: approved content/visuals and account-free visitor experience remain.
- Token saver: shared finite route/hash contracts and compact structured reports
  avoid repeated context reconstruction without hiding failure.
- Secure: dedicated app/token/environment, current-main guard, non-root finite
  image and exact new DNS records; no neighboring service mutations.
- Agents are equal: noninteractive release/check commands and JSON evidence support
  agents, while the same commands and guide serve human operators.
- Dependable: real container checks, historical-contract rollback and explicit
  first-release/refused/rolled-back/rollback-failed states preserve outcome truth.

This author assessment is not an independent committed-code review.

## Local verification

- Website Node suite: 21/21 pass (existing build checks plus release guards,
  old/new-contract rollback and HTTP fixture failure scenarios).
- Actual Docker image built and ran as 65532:65532; all 18 HTTP smoke checks passed
  with production metadata for inherited base `ec71a7db237eacd137d752c50fb3adfbf5ebf939`.
  This proves the candidate working-tree image, not a hosted release.
- Fly config validation, Go 1.26.6 race tests/vet, shell syntax and diff whitespace
  passed. The sandbox denied loopback sockets on a repeat Node run; the identical
  suite passed with local socket access. Exact committed-code review and hosted
  CI remain pending and must be recorded independently. The code gate below now
  records the completed independent review separately.

## Independent committed-code gate

Two fresh independent Sol reviewers returned CLEAN for implementation commit
`00113de931156b52829caf172175c0d2c870e2a3`, against base
`ec71a7db237eacd137d752c50fb3adfbf5ebf939`. Product/experience/documentation and
technical/security/failure/test lenses each inspected 15/15 changed files,
6/6 acceptance criteria, 6/6 technical criteria, 4/4 testing sections, the
implementation contracts and a second sweep. Neither found an unresolved
in-scope issue. Each independently passed all 21 Node tests with loopback access
and checked shell syntax and diff whitespace. Both assessed all seven principles;
the product reviewer also independently inspected DNS/neighbor baseline files.

Their principle conclusions: one canonical visitor address and familiar release
path are intuitive; prerequisites and actionable errors make operation
discoverable; approved visuals and no visitor setup preserve experience; shared
finite contracts and structured reports save context; isolated app/environment,
non-root image and guarded main deployment protect boundaries; noninteractive
commands and readable guides serve agents and humans; exact revision checks and
honest recovery states are dependable. Live/browser release acceptance remains
pending. The final evidence-only documentation update requires reviewer recheck;
this verdict does not silently cover later code changes.

## Infrastructure and production preservation — 5 October setup snapshot

- New `pigboard-website` app in existing `pigboard` organization; shared IPv4
  `66.241.125.12`, IPv6 `2a09:8280:1::1a7:f33a:0`. No Machine deployed.
- Cloudflare DNS-only Auto-TTL CNAMEs: `pigboard` to
  `6kglmnj.pigboard-website.fly.dev`; `_acme-challenge.pigboard` to
  `pigboard.scubapig.software.6kglmnj.flydns.net`. Both public DNS answers verified.
- All ten pre-existing DNS rows remain byte-for-byte equal in the UI comparison;
  exactly two rows added. No zone-wide settings changed. Local evidence:
  `/private/tmp/pigboard-dns-before.json`, `pigboard-dns-after.json` and
  `pigboard-dns-complete.jpg`.
- Fly reports certificate issued/verified/active for the canonical hostname.
- GitHub environment `website-production` allows only main. App-only token
  `github-website-production-2026-10-05` installed through stdin with 8760-hour
  expiry; only safe secret metadata inspected. Deployment enable variable absent.
- Neighbor baseline `/private/tmp/pigboard-neighbors-before.json` records
  `rovito-oauth` and `pigboard-pilot-jdc` config/Machine images and successful
  Rovito home/version/health/readiness responses. Compare after launch. Baseline
  is local operational evidence, not a portable repository artifact. The post-DNS
  comparison in `pigboard-neighbors-after-dns.json` confirms both configurations
  and Machine images unchanged, and all four Rovito HTTP responses match.

At the 5 October snapshot, final documentation recheck, PR/current-head CI,
authorized merges, first deployment, browser acceptance and production comparison
remained. Those gates are now evidenced in the 7 October launch record above.
Issued TLS and configured DNS alone never established live acceptance.
