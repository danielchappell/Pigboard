# Pigboard website hosting evidence

5 October 2026. This record covers the 15-file W2 Story and separate W3 release
Task. The approved copy and bold appearance are unchanged. W1/PR40 and W1a/PR41
are prerequisites; their current merge confirmation remains pending. Automatic
approval review rejected inferring that earlier branding-PR merge authority
covered these website PRs. Nothing has been deployed.

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
  CI remain pending and must be recorded independently.

## Infrastructure and production preservation

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

Remaining: fresh exact-commit code reviews, PR/current-head CI, authorized merges,
first main deployment, canonical HTTP/browser acceptance and final neighboring
production comparison. Issued TLS and configured DNS alone do not mean live.
