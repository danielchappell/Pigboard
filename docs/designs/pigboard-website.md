# Pigboard marketing website

4 October 2026. Website continuation authorized after the branding PRs. The
owner requires Rovito's exact website architecture and deployment infrastructure,
as well as its style. The three Pigboard logos are approved.

## Outcome and visitor journey

Give a product or engineering lead with an existing technical team a clear
customer promise: delegate delivery while retaining project-level control. The
owner selected this audience and asked for outcomes, observability, control and
dependability to lead the copy. Explain the supported AI software development
lifecycle as the mechanism behind those benefits.

The site must distinguish this intended product from current private tools.
It must not claim proven market fit, measured savings, autonomous correctness,
public hosted access or battle-tested hosted operation. The visitor reads the
home page, explores the delivery journey, then checks current availability.
Primary action: “See the delivery journey”; secondary action: “What's available”.
All destinations work without repository access. The private GitHub repository
is not a public onboarding CTA. Do not invent a waitlist, contact address,
pricing, downloads or account flow.
Agents can read the same ordinary HTML, follow links and inspect version metadata;
there is no separate marketing API or mandatory JavaScript navigation.

Pages: `/` introduces the outcome and audience; `/method.html` explains how the intended journey helps the team direct,
inspect and accept work, supported by discovery, verification and review;
`/status.html` separates implemented repository tools from hosted product goals.
A sample feature journey is explicitly illustrative, with no claim it ran.
The current-status page states that hosted access is not publicly available,
current tools require authorized access to the private repository, and this
public website is informational.

## Verified reference and existing state

Rovito remote main was verified on 4 October as
`32875af00a19241541296bbb10543ec29fcb7a42`; its live home page was inspected in
the browser. Source paths: `website/build.mjs`, `layout.html`, `theme.css`,
`styles.css`, `app.js`, `pages/`, `internal/website/handler.go`,
`website/preview/main.go`, `Dockerfile.oauth`, its Docker ignore file,
`deploy/fly/oauth.toml`, `scripts/deploy-website.sh`, and `bitbucket-pipelines.yml`.
Reference exports are available at `/private/tmp/rovito-website-reference` for
this session; durable provenance is the repository and commit above.

Pigboard branding PRs #38 and #39 were owner-authorized and merged as
`6020e170ae2802e19c0c8990eb90abe14904b019` and
`533a1c9d99e2c6ba01d08c2796625a54be59fccf`. Each resulting file tree exactly
matched its reviewed head. Website work starts from the latter main commit.
The private Node/PostgreSQL host uses the existing root Dockerfile and Fly app
`pigboard-pilot-jdc`; it is separate from this public marketing-site work.

## Architecture parity

| Layer | Rovito reference | Pigboard application |
| --- | --- | --- |
| Authoring and build | Plain HTML pages, shared layout, CSS and small vanilla JS; dependency-free Node build | Same source/build pattern under `website/`, using the approved assets already in the repository |
| Design | Graphite theme, teal links, coral buttons, Avenir/system fonts; large character/wordmark hero; tabs, feature columns, guide sidebar, shared header/footer | Reuse components, layout and JS behavior with Pigboard's own plum/ivory/rose/amber palette; adapt copy and artwork crop coordinates |
| Serving | Go `net/http` handler serves built files; GET/HEAD, strict local CSP, cache headers, no directory listings, direct page routes | Same Go handler pattern in a standalone website module; one server for local preview and the website container |
| Container | Go 1.26.6 Bookworm build, static binary, Debian Bookworm slim, CA roots, UID/GID 65532, port 8080; allowlisted build context | Same stages/runtime and allowlist; only public site files and the website binary enter the image |
| Fly | `cdg`, one shared CPU, 256 MB, one warm Machine, HTTPS, readiness check, remote image build, `--ha=false` | Same sizing, region, lifecycle, TLS, checks and deploy pattern for a Pigboard website target |
| Delivery | Bitbucket main-only Production pipeline, ARM64 self-hosted `rovito.ci` runner, secured app-scoped Fly token, pinned Fly CLI, exact-main check, serialized deploy and smoke report | Same deployment controls in GitHub Actions, as explicitly selected by the owner |
| Verification and rollback | Exact `/version.json` revision, route/artwork/header/health smoke tests; revision-tagged image rollback and repeat verification | Same site-focused evidence and rollback; no inference of live success from a local build |

The website build does not need Rovito's OAuth provider, private database,
release archives, notarization or update-feed features. Those are Rovito product
services, not dependencies of its website architecture. Pigboard's public site
must not expose its private host, grants, credentials or diagnostics.

## Ownership and interfaces

`website/build.mjs` owns the finite route list, page metadata, layout substitution,
asset copying and generated files. Output goes to ignored `dist/website/`;
source is never generated into tracked documentation. Copy only the approved
PNG assets and named CSS/JS files. Builds must reject unknown placeholders and
invalid origin/revision inputs before writing output. Build into a temporary sibling directory and validate the complete route/asset
set there before promotion. Replace only a generated destination identified by
the website's own manifest; refuse an unrelated nonempty directory. Retain the
previous complete directory as a backup until promotion succeeds, restore it
on promotion failure, and clean only owned temporary output. If restoration
fails, preserve and report both recovery paths. A fresh build removes old routes
through whole-directory replacement. An interrupted promotion may temporarily
make readiness fail; a retained backup allows recovery. Concurrent builds into
the same output are unsupported; CI serializes production publication.

Build inputs: `PIGBOARD_SITE_ORIGIN` (an HTTPS origin for a production build;
HTTP is allowed only for a loopback preview) and `PIGBOARD_SITE_COMMIT` (a full
40-hex Git revision, or `local` only with a loopback preview). A public HTTPS
origin requires a full revision; reject public origin plus `local` and all
non-loopback HTTP origins. Loopback origins remain previews even when supplied
with a full revision. Local defaults are
`http://127.0.0.1:8772` and `local`. Preview pages and robots disallow indexing.
Production metadata, sitemap and social-image URLs use the supplied origin.
No domain is published or selected by the local default.

The Go module contains a filesystem-backed website handler and small executable.
Only the generated public directory is served. Reuse the reference's path
validation, hidden-path and directory denial, content types, GET/HEAD behavior,
CSP, referrer policy and content-type protection. Health/readiness are simple
site-service probes with no database or private-host requests. Readiness fails
if the generated index or version metadata is missing; it does not claim
anything about Pigboard's hosted product. The executable uses bounded HTTP
timeouts and graceful SIGTERM shutdown, and binds to loopback by default.
Container deployment supplies `:8080` and its built-site path explicitly.

The canonical URL and commit metadata describe the built artifact. Smoke tests
must compare the expected commit and approved artwork hashes, visit every
public route, check security/cache headers, and write a machine-readable report.
No secrets appear in files, image layers, command output or the report.

## Experience and visual fidelity

Owner refinement on 2026-10-04: retain the approved structure and logo but give
Pigboard its own color scheme. Use plum `#2d2233`, ivory `#fff5e9`, rose `#eeb7cf`
and amber `#f1c777`, with related plum surfaces. Rose carries links and active
navigation; amber carries primary actions and keyboard focus. The existing
opaque artwork sits in neutral graphite frames without tinting or regeneration.
This supersedes the original shared-color choice, preserving the reviewed
component structure and Node/Go/GitHub Actions/Fly architecture.

Keep Rovito's section rhythm, navigation, typography, buttons, responsive
breakpoints and guide layout. The approved Pigboard lockup replaces its terrier
hero; header/footer crops show the approved Pigboard wordmark. Crop and positioning
are CSS, leaving approved PNG bytes unchanged. Check the longer wordmark and
floating board at desktop and mobile sizes; the approved raster background is
not assumed to be a perfectly uniform CSS color.

Reuse accessible tab behavior with arrow/Home/End keys, visible focus, skip link,
copy feedback and reduced-motion support. Present sample journey tabs as an
illustration, not a live product interface. Page links and substantive content
remain readable with JavaScript disabled: render every illustrative panel visible
in HTML, hide the tab controls until JavaScript initializes, then add tab roles
and hide inactive panels. This is a bounded progressive-enhancement correction
to the reference tab script, preserving its styled and keyboard-operated result. Do not import Rovito download or
installation claims into Pigboard copy. Keep meaningful headings unnumbered.

## Failure, recovery and deployment decisions

A bad build input or missing source asset fails without producing a new complete
site. The local server reports a missing build clearly; unknown/hidden/traversal
paths return 404 and unsupported methods return 405. Copy failure selects text
and explains the normal keyboard copy action. Static serving has no account or
board writes to repeat.

Rovito's source/deployment repository is Bitbucket; Pigboard's is GitHub. The
owner explicitly selected GitHub and GitHub Actions on 2026-10-04. Keep the same
Go/Docker/Fly deployment controls in GitHub Actions, with no Bitbucket mirror.
A dedicated public website app and `pigboard.scubapig.software` are proposed;
app ownership, domain and Production credential configuration require concrete
verification before deployment. Never reuse Rovito's app token or make its
OAuth app or Pigboard's private host the website target by default.

Before a live release, verify the exact target, public route scope, secured
app-only token, reviewed commit, current-main guard and runner access. Record
existing target image/configuration before replacing them. Tag the new image
by commit; if smoke fails, report partial release and use the recorded image
and configuration for rollback, then rerun smoke against that prior revision.
An app creation, DNS change or deployment is not part of a local preview.

## Ordered delivery path

1. W1: deliver the complete three-page local marketing site using Rovito's static
   build and Go serving pattern; review truthful copy and visual/keyboard behavior.
   Include CI for the new builder/server and a usable preview guide. This is
   independent of the production app/domain choice.
2. W2: using the selected GitHub Actions platform, package that working
   site in the matching Docker/Fly configuration and protected deployment flow.
   Include exact-revision smoke tests, local image proof and rollback instructions.
3. W3: configure the verified production target and release under owner authority;
   retain deployment evidence and verify the released revision and routes.

Groom W1 only after independent design review. W2/W3 remain provisional until
the consequential deployment choices are resolved. Keep the existing recovery
batch and its two-PR cap unchanged; these are separately requested website Tasks
and Stories in the same active queue. Runtime renaming is independent and remains
in B3; website work does not migrate signed history or package identifiers.

## Seven-principle author assessment

| Principle | Assessment |
| --- | --- |
| Intuitive | Outcome-first home, familiar navigation and three clearly named pages; current availability answers the visitor's next question. |
| Discoverable | Public readable pages and metadata explain the method without a private-repository link as the only next step. |
| Delightful experience | Reuse the approved art and actual Rovito layout; no invented sign-up or repeated setup. |
| Token saver | One route inventory and one shared layout; human and agent visitors read the same concise status and method. |
| Secure | Public files only, restrictive headers, isolated app/token, no private host/database/board path; production choices remain explicit. |
| Agents are equal | Semantic HTML, direct URLs, exact version metadata and noninteractive build/server/smoke interfaces. |
| Dependable | Claims, preview, reviewed code, CI, owner approval and deployed revision stay distinct; failed build/deploy and rollback have observable outcomes. |

## Customer promise refinement — 4 October 2026

This supersedes the website's initial process-led wording and the candidate
marketing language in `docs/product-strategy.md`; it does not change the product
architecture or claim its goals have shipped. The owner approved the palette
first, then requested this refinement and selected a lead with an existing
technical team as the first audience.

### Evidence and judgment

The product definition and strategy already establish an opinionated AI SDLC,
team ownership, meaningful human decisions, visible evidence and dependable
recovery as the direction. The September 21 build-versus-buy research found
substantial overlap in agent orchestration, review and progress visibility. It
is historical research, not a fresh competitor comparison. Do not claim these
capabilities are unique or disparage alternatives. The value still to prove is
less coordination per accepted feature, with quality and cost kept visible.

The owner reports successful use of the starting development method. That is
not proof of battle-tested hosted delivery for customer teams. Keep that phrase
as an internal product standard until repeated accepted outcomes, changes of
requirements, failures/recovery and teammate handoffs establish it. There is
no measured ROI or validated willingness to pay to advertise.

The problem is not a missing list of features. The old page led with maintaining
our method, small changes and review mechanics. A lead buys progress they can
trust and direct. Reframe the same agreed direction around that outcome.

### Message hierarchy and alternatives

- Lead: **Delegate delivery. Stay in control.**
- Category: **AI software delivery for technical teams.**
- Supporting promise: **We're building Pigboard to carry your team's work from idea to delivery.
  Set priorities, see what is ready and what needs attention, and make release
  decisions with evidence you can inspect.**
- Three benefits: **Know where delivery stands; Make the decisions that matter;
  Keep the whole team moving.** Support each with a concrete customer situation.
- Explain why the complete lifecycle matters: one supported approach carrying
  context, decisions and evidence from an idea to acceptance, including when
  requirements change or work is interrupted. Do not promise zero supervision.

“Robust, observable AI SDLC” names a category and qualities but does not explain
the customer's gain. “Manage the project, not every agent” names the burden but
undersells the delivered outcome. “Ship faster” would imply unmeasured results.
Use the chosen promise, supported by tangible examples and clear development
status, without a speed multiplier or unique-capability claim.

### Page roles and proof

Home keeps the approved section structure and art. Its opening names the
customer outcome and in-development status. The three-panel invoice-export
example shows direction, an in-flight request for PDF export while CSV is
already underway, and acceptance evidence. The lead sees the scope/verification
impact, chooses to finish CSV first and keeps PDF queued. This makes steering
work visible rather than reducing control to approval at the beginning and end.
It is labeled illustrative beside the example; it is not a fabricated run.
Benefits explain visibility, decision authority and continuity for the whole
team. Detailed PR sizing and our process-maintenance work do not lead the page.

Method translates the lifecycle into the lead's experience: agree a useful
outcome, understand a recommendation before deciding, inspect progress and
evidence, and recover interrupted work. Make the intended/future status clear
at the top. Reviews and checks support confidence; they never imply guaranteed
correctness or automatic release authority. Existing authority boundaries stay.

Availability answers whether someone can use it now. Public hosted access is
not open. Existing experimental tools require authorized private-repository
access; summarize them without a catalogue of internal provisioning details.
Remove internal market-validation commentary from customer-facing copy; keep
it here and in the product strategy. No signup is invented to fill a CTA slot.

Metadata must make the same qualified promise when seen apart from the page.
Agents and search previews must not receive a stronger availability claim than
human readers. Architecture, colors, assets, routes, interactions and provider
contracts remain unchanged. This is a bounded correction within W1.

### Observable success and author principles

A lead should be able to identify the audience, intended outcome, retained
authority and present availability from the first screen and linked pages.
Every benefit should point to a customer situation; no claim of performance,
uniqueness or hosted reliability lacks evidence. A demo must later prove one
accepted feature with changed requirements, a recovered failure and a teammate
handoff. Measure coordination effort, rework/defects and cost per accepted
feature, rather than agent activity or PR count. These measures are not results.

Intuitive: plain outcomes and familiar decisions. Discoverable: the lead finds
journey, evidence and access status through working public links. Delightful:
less internal jargon and no fake signup. Token saver: concise shared copy,
optional method detail and no repeated capability disclaimers. Secure: retained
authority is clear; no new permissions or public access. Agents are equal:
semantic pages and metadata carry the same claim boundaries. Dependable: future
intent, illustrative example and current tools are visibly distinguished;
reliability remains a standard to prove.

Independent review of this refinement precedes the copy implementation plan.
