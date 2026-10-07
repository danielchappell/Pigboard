# Read the Pigboard product website locally

Problem to solve

Pigboard has an approved identity and product direction, but no website that a
visitor can explore. The owner wants the same experience and technical approach
as Rovito, with an honest explanation of Pigboard's present availability.

Acceptance Criteria

- Home addresses a lead with an existing technical team, explains the intended delivery outcome and retained control, and links to Method and Availability.
- Method explains the supported development journey and human decisions, clearly labeling its feature example as illustrative.
- Availability distinguishes existing private-repository tools from future hosted capability and states who can access them.
- All three pages work on desktop and mobile, with keyboard navigation and readable substantive content when JavaScript is disabled.
- The site uses the approved Pigboard PNGs unchanged, Pigboard's own palette, and Rovito's component system, section patterns and interactions.
- A maintainer can build and run the site locally, with a clear error and the previous complete output preserved when a replacement build fails.

Technical Acceptance Criteria

- Use the reviewed dependency-free Node/HTML/CSS/JavaScript build and Go 1.26.6 standard-library serving pattern.
- Serve only generated public files; leave the private host, runtime compatibility identifiers, production services and credentials unchanged.
- Require HTTPS and a full Git revision for public metadata; keep loopback builds unindexed and reject a public origin with a local revision.
- Stage and validate output before replacing an owned generated directory, with backup restoration and explicit recovery paths on failure.
- Enforce GET/HEAD, route and path boundaries, no directory listings, and Rovito's restrictive website security headers.
- Make readiness describe the website's built files only, use bounded HTTP timeouts, and shut down cleanly on termination.
- Keep the Story within the 20-file inventory below and verify its exact committed revision before opening a PR.

Testing Strategy

- Manual QA: open the local home page, follow Method and Availability, and check the longer wordmark, artwork and copy at desktop and mobile sizes.
- Access and setup: Node 20 or later and Go 1.26.6; no account, credentials or connected service is needed.
- UI path: use the sample-journey tabs with mouse and arrow/Home/End keys, test copy feedback, then confirm all content remains readable without JavaScript.
- Service QA: check routes, methods, probes and headers; confirm invalid-build startup fails and valid processes exit cleanly within the shutdown bound after SIGINT and SIGTERM.
- Automated regression: cover build replacement/recovery, origin/revision modes, routes/assets/links/metadata, static serving boundaries and readiness, then run the existing repository suite.

---

## Implementation plan

Baseline `533a1c9d99e2c6ba01d08c2796625a54be59fccf`. Reuse the independently
CLEAN [website design](../designs/pigboard-website.md), hash
`d335696e4d3bd2f9680453bf8fabd586520db2337c2b04a38835e3de5455d149`,
and pinned Rovito source `32875af00a19241541296bbb10543ec29fcb7a42`.
This is W1, one usable local website and one PR. The owner-approved palette
refinement preserves the reviewed architecture and adds only the superseded
brand-color note to the file inventory. Revised estimate after the bounded copy correction: 14–15 human hours,
including copy, tests, browser checks, documentation and review preparation.
W2 production packaging/pipeline and W3 release remain separate. The owner chose
GitHub Actions; production app and domain remain unresolved. W1 adds repository checks,
not a deployment workflow.

### Exact inventory — 20 files

1. `docs/designs/pigboard-website.md` — reviewed architecture and whole delivery path.
2. `docs/plans/pigboard-website.md` — this Story, implementation plan and estimate.
3. `docs/reviews/pigboard-website.md` — independent review and verification evidence.
4. `docs/delivery-plan.md` — merged branding evidence and website stage/dependencies.
5. `website/README.md` — source provenance, build/preview, recovery and limits.
6. `website/build.mjs` — finite route builder, validated metadata, approved asset copying and safe output promotion.
7. `website/layout.html` — shared accessible header/footer and metadata.
8. `website/pages/index.html` — outcome, intended customer, illustrative journey and working actions.
9. `website/pages/method.html` — readable method and human decisions in Rovito's guide layout.
10. `website/pages/status.html` — current private tools and unavailable public hosted access.
11. `website/theme.css` — Pigboard color tokens and shared Rovito controls, with provenance.
12. `website/styles.css` — Rovito layout with Pigboard crop/hero adjustments and responsive checks.
13. `website/app.js` — progressive tab enhancement and copy feedback using the reference behavior.
14. `website/go.mod` — isolated standard-library website module, Go 1.26.6.
15. `website/server/handler.go` — public-file handler and website-only readiness.
16. `website/server/handler_test.go` — meaningful HTTP/path/header/readiness regressions.
17. `website/cmd/site/main.go` — loopback preview/server entry, startup validation and bounded shutdown.
18. `website/website.test.mjs` — build/recovery/metadata/asset/link regressions.
19. `.github/workflows/website.yml` — Node build/tests and Go race/vet checks for this repository.
20. `docs/brand-rebrand.md` — label the original shared-color decision as superseded by the owner-approved Pigboard palette.

Existing approved assets are read from `assets/brand/pigboard/`; do not duplicate
or alter them. Generated output is `dist/website/`, already ignored. No package
manifest/dependency change or new tracking service is required. If another file
becomes necessary, recheck the inventory and size before editing it.

### Build and serving contracts

The builder exports a testable build function and a noninteractive CLI. The CLI
uses the reviewed origin/commit environment variables and fixed default output.
Tests use isolated temporary source/output fixtures. Resolve all placeholders,
read the finite source files and verify the approved asset hashes before output
promotion. Unknown placeholders, malformed inputs or missing assets fail.

Prepare every page, CSS/JS file, three PNGs, robots, sitemap, version JSON and an
ownership manifest in a temporary sibling directory. Only an empty directory or
one carrying the expected Pigboard build manifest may be replaced; reject a
symlink output or unrelated nonempty directory. Rename an existing complete
output to an owned backup, promote the staged directory, then remove the backup.
Restore the backup on a promotion error; retain and report recovery paths if
that restoration fails. Remove only owned staging data on ordinary failure.
A cleanup failure after successful promotion reports that the new site exists
and the retained backup needs attention. No concurrent build into one output
is promised; the production pipeline will serialize publication.

HTML starts with all journey panels visible and tab controls hidden. JavaScript
validates the panel targets, then activates tab roles, selection/focus behavior
and inactive-panel hiding. Copy uses the clipboard when available and selects
the text with readable feedback otherwise. All main page navigation uses links.

Adapt the reference Go filesystem handler without OAuth/download dispatch.
Use direct index/page routes, no listing, strict path checks and the reference
security-header values. `/healthz` and `/readyz` return small no-store JSON;
readiness validates the generated index and version metadata, not any private
service. The executable defaults to `127.0.0.1:8772`, accepts explicit site and
listen flags, refuses a missing/invalid build at startup and handles SIGINT or
SIGTERM with a bounded graceful shutdown. The deployment container will reuse
this binary and handler; no separate preview-only server is introduced.

### Verification order and recovery

1. Run focused Node site tests, JavaScript syntax check, build and Go handler
   tests/race/vet before browser verification.
2. Start the actual Go executable; inspect desktop and mobile in the browser,
   follow every primary link and test tabs, copy, focus and no-JS content. Check
   actual response headers, status codes and website-only probes. Launch the
   executable against missing and malformed build fixtures and confirm nonzero
   startup failure; launch a valid build, send SIGINT and SIGTERM in separate
   runs, and confirm clean exit within its configured shutdown deadline. Record
   these actual-process results alongside the browser evidence.
3. Run `npm ci` and `npm test` in the established disposable Linux Node/PostgreSQL
   environment, preserving its required database/TLS checks. No private-host
   image rebuild is needed because that image and its inputs are unchanged.
4. Record author assessment, commit, then obtain two fresh independent exact-
   commit reviews. Resolve in-scope findings, open a PR, and verify its latest
   hosted checks. Preserve owner merge/release authority for new website work.

The preview guide must tell a new maintainer how to rebuild, choose a port,
stop the server, recover a retained output backup and identify unverified
production work. Reverting W1 removes the local website and its CI only;
there is no database, remote account, DNS or live rollback to perform.

### Author seven-principle assessment

| Principle | Assessment |
| --- | --- |
| Intuitive | Visitors get Home, Method and Availability; maintainers get one build and one Go preview path. |
| Discoverable | Useful public links, explicit private access limits, semantic pages and actionable build/server errors. |
| Delightful experience | Approved art and Rovito layout; keyboard and no-JS paths preserve the journey. |
| Token saver | Shared layout/route inventory and concise availability avoid duplicated human/agent explanations. |
| Secure | Approved public files only, validated inputs/paths/CSP and no private-host or production changes. |
| Agents are equal | Direct HTML/version routes and noninteractive build/test/server commands provide the same facts as visual browsing. |
| Dependable | Build backup/recovery, truthful readiness and exact-commit evidence keep local, CI and live results distinct. |

Current independent verdicts and exact revisions belong in the companion
[review record](../reviews/pigboard-website.md), not in mutable claims here.

## Outcome-led copy correction

The owner requested this after approving the palette. Reuse the W1 architecture,
page structure, palette, art and behavior. Two fresh independent Sol reviewers
returned CLEAN on the refined website design, SHA-256
`6a1e8c88c69bdf79f56d58f56dca48ed3a2a9473119d52f86b738e5642dae1ed`.
Their product concerns about overbroad verification language and lack of an
in-flight steering example are resolved in that artifact. No new product
capability or delivery milestone is being implemented.

### Changes and boundaries

This correction touches nine files already inside the 20-file W1 inventory:

- `website/pages/index.html`: outcome-led hero for technical teams, three
  customer benefits and an illustrative direction/steering/acceptance journey.
  Keep all IDs, anchors, tab/panel bindings and progressive controls intact.
- `website/pages/method.html`: explain the intended lead/team experience,
  concrete PDF-versus-CSV steering, inspectable evidence and recovery. Preserve
  the three existing anchors and human release authority.
- `website/pages/status.html`: concise current availability and private-tool
  access, clear future hosted direction; remove internal market-validation and
  provisioning detail from the customer page. Preserve its three anchors.
- `website/build.mjs`: update only the three title/description entries; qualify
  future capability in descriptions independently of page body text.
- `website/README.md`: explain the audience, claim boundaries and content source.
- `docs/designs/pigboard-website.md`: record the reviewed positioning refinement.
- `docs/plans/pigboard-website.md`: this scoped correction and updated estimate.
- `docs/reviews/pigboard-website.md`: separate design, plan, code and validation.
- `docs/delivery-plan.md`: exact stage and the remaining deployment decisions.

Do not edit CSS, scripts, assets, serving/build logic, integrations or deployment
for this correction. No new dependencies, form, account flow, contact channel or
public-access promise. The whole W1 remains one usable three-page website,
20 files and 14–15 human hours, below two working days.

### Copy acceptance and verification

Retain the six Story acceptance criteria and seven technical criteria above.
The first screen must name AI software delivery, the team context, the delivery
outcome, retained control and in-development status. Benefits must illustrate
project visibility, meaningful decisions and team continuity. Include an
in-flight requirement change with scope/verification impact and a priority
decision. Label the example illustrative, and do not invent a successful run.
Method and Availability remain useful public destinations. No unmeasured time
savings, uniqueness, correctness guarantee or battle-tested hosted claim.

Run the existing seven Node website regressions, syntax and diff checks. They
cover generated routes, metadata, link/anchor validity and unchanged approved
artwork. Do not add tests that pin marketing phrases. Stop the local preview
before rebuilding; restart its rooted Go server afterward. Read each generated
page and its metadata, compare the copy to source evidence, then check desktop
and mobile wrapping, navigation and the changed tab labels with keyboard and
copy feedback. Read the source fallback to confirm all panels still render
without JavaScript. If browser access remains unavailable, state the incomplete
visual check rather than claiming success.

Commit before two fresh independent Sol code reviews; fix in-scope findings and
review the updated committed diff. Push the existing PR, update its description
and verify current-head GitHub Actions. CSS and runtime tests from the palette
remain applicable to unchanged code; hosted CI runs the full suite. Production
setup/release and owner merge stay separate. A copy rollback restores the prior
committed page/metadata set, rebuilds and restarts the preview; it has no account
or persisted customer effects.

Author principles: Intuitive—customer outcomes and concrete decisions lead;
Discoverable—journey, evidence and availability remain linked; Delightful—clear
copy without internal implementation jargon or invented signup; Token saver—
concise page roles with detail optional; Secure—no access or authority change;
Agents are equal—same semantic copy and independently qualified metadata;
Dependable—illustrative/future/current claims and review/CI/release remain distinct.
