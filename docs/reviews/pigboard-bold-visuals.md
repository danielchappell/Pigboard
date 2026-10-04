# Bold visual follow-up — review and verification

4 October 2026. W1a follows W1 at `c2520a246b5dffda68dc7b4b479f758c6049cf11`.
The owner approved the marketing copy and requested happy, colorful, bold visuals,
a clean transparent hero and no duplicate hero wordmark. The specific new palette
and cutout are implemented for owner visual review; no new aesthetic approval,
merge or production release is claimed.

## Design review

Exact design SHA-256: `8dbe8236d25d7d67b63c571a2308cba9c3a520a2f19fc0f56a1595b355ed3f90`.
Two fresh independent Sol reviewers returned CLEAN after in-scope findings were
fixed: explicitly update browser theme metadata and current asset/website guides,
and mark prior plum guidance historical.

- Product reviewer `bold_design_product`: 5/5 artifact blocks and 10/10 relevant
  W1 sources examined, all seven principles, then a second sweep.
- Technical reviewer `bold_design_technical`: 4/4 sections, 3/3 routes and 17/17
  relevant files examined, all seven principles, then a second sweep.

Each independently assessed familiar controls and color roles (Intuitive),
readable focus and guide discovery (Discoverable), a clean happy mascot
(Delightful), shared tokens and preserved copy (Token saver), finite pinned
assets and unchanged authority (Secure), semantic HTML and noninteractive tools
(Agents are equal), and actual alpha/contrast checks with recoverable originals
(Dependable). These are design verdicts, not code or owner visual approval.

## Implementation-plan review

Exact plan SHA-256: `281c6dfac74fe2576e42342b5f610c2e260c049766615c157e1c66c323ee46f7`.
Fresh independent Sol reviewers `bold_plan_product` and `bold_plan_technical`
returned CLEAN. Each covered 17/17 planned file roles, 6/6 acceptance criteria,
5/5 technical criteria, 5/5 testing bullets, 3/3 page sources and 7/7 principles,
with a second sweep. The product reviewer also checked the PNG hash/dimensions
and yellow/coral/mint composite proof independently.

The product review identified two concrete in-scope omissions: the exact generated
asset handoff and measurable contrast criteria. The plan now records the source,
generation ID and portable hash, plus 4.5:1 ordinary text, 3:1 large text and
3:1 control/focus boundary thresholds. Both reviewers covered the final hash.
Their principle assessments independently confirmed preserved navigation/copy,
semantic accessibility, stronger visual identity, shared tokens, finite asset
integrity, noninteractive verification and separate review/CI/release evidence.

## Author implementation assessment

The scoped diff has 17 files. It implements the reviewed design without changing
marketing prose, links, route structure, application scripts or deployment.

- Intuitive: familiar page order and actions; color has a clear role and the hero has one illustration.
- Discoverable: readable navigation, selected tabs and guide state; keyboard focus is visible and the current asset is documented.
- Delightful: bold type, substantial yellow/blue/coral/mint surfaces and a transparent mascot without duplicate branding.
- Token saver: approved copy and shared theme interface remain; no additional customer or agent setup.
- Secure: the new asset has a fixed expected hash and finite serving path; no new dependency, external resource, credential or authority.
- Agents are equal: semantic wordmark/alt text and ordinary HTML remain available; all build and regression checks are noninteractive.
- Dependable: retained original artwork, unchanged atomic failure behavior, new/retired path checks and explicit preview-versus-release status.

## Local verification

- Website Node tests: 7/7 pass, including independent hashes, missing/tampered
  artwork failure, prior-output preservation, route/link metadata and no-script
  content fallback. Build-script syntax and diff whitespace pass.
- Go 1.26.6: `go test -race ./...` and `go vet ./...` pass. New cutout GET/HEAD,
  range fixture and retired v1 public-path denial pass with existing boundaries.
- Actual rebuilt server on `http://127.0.0.1:8772/`: readiness 200; new PNG GET/HEAD
  200 (`image/png`, 1,880,035 bytes); retired public mascot path 404. The server
  was stopped before build promotion and restarted with the new allowlist.
- All three source pages' text nodes and link targets match the approved W1
  baseline. Only requested hero image/alt and shared wordmark markup change.
- New cutout SHA-256 `edf1a941bdd3169d61cce533b4f770da4c8ee7179217f2c7583388796680a54f`;
  1536×1024 RGBA, alpha range 0–254, about 53.58% fully transparent. Original
  three PNG hashes remain unchanged. Browser compositing shows clean edges and
  a translucent board on yellow, coral and mint. Exact prompt is in the asset guide.
- Home, Method and Availability inspected at 1280px and 390px CSS widths: no
  horizontal overflow, readable content and consistent yellow browser metadata.
  At 390×844 the hero action and development note fit within the first screen.
  Keyboard arrows/Home/End select the original tabs; copy feedback works.
  Keyboard navigation exposes the deep-blue focus ring. Temporary viewport
  overrides were reset, preserving the user's existing browser zoom.
- Measured actual rendered ordinary-text minimum: 4.551:1 (muted closing copy
  on coral). Feature text on coral 5.702:1; large paper heading on blue 6.113:1;
  white action text 6.360:1. CSS hover/active pairs are 9.359:1 and 12.433:1;
  selection 12.944:1; selected tab 10.138:1; status minimum 5.226:1. Focus/control
  outlines meet 3:1 against the light surfaces where controls occur. Hover/active
  colors were checked from their CSS values; this is not a claim of an exhaustive
  accessibility audit or pointer automation of every state.
- Local screenshots: `/private/tmp/pigboard-bold-website.jpg` (complete homepage)
  and `/private/tmp/pigboard-cutout-proof.jpg` (alpha composites). These are local
  session evidence, not required repository/build inputs.

## Committed-code review

Reviewed implementation: `8e96a48d4b4f8dd85303ed0e57a8a9e32cfddf74`, compared
with W1 baseline `c2520a246b5dffda68dc7b4b479f758c6049cf11`.
Fresh independent Sol reviewers `bold_code_product` and `bold_code_technical`
returned CLEAN. Each examined all 17/17 changed files, all 6/6 acceptance criteria,
5/5 technical criteria and 5/5 testing bullets, with a second sweep. They inspected
actual source, screenshots and original/new asset consistency. Both independently
reran Node 7/7; technical also independently reran Go 1.26.6 race and vet.
Live browser/HTTP evidence remains author evidence, not independently repeated.

Both independently assessed all seven principles: familiar page structure and
controls (Intuitive), visible states and semantic labels (Discoverable), requested
bold color and clean mascot (Delightful), unchanged concise copy/shared tokens
(Token saver), finite pinned assets without new authority (Secure), semantic HTML
and noninteractive checks for agents alongside human visuals (Agents are equal),
and recoverable artwork/builds with honest stage evidence (Dependable). No
unresolved in-scope findings remained.

Adjacent follow-up: the unused shared `.rv-button--secondary:active` style can
inherit dark text on a dark active surface. None of the three routes uses that
class; correct that state before introducing secondary buttons. This is outside
the present page outcome and was not silently added to the slice.

## Delivery state

The implementation above has two independent CLEAN committed-code reviews.
Both reviewers also returned CLEAN for evidence-document revision
`526de3c5f68b9ade060c77080a2d00eb00aa580d`: 2/2 affected documents, preserved
17/17 overall coverage, all criteria and principles, and a second sweep.

[PR #41](https://github.com/danielchappell/ski-stack/pull/41) is open against
`codex/pigboard-website` and depends on PR #40. Its description identifies the
final reviewed revision; [Checks](https://github.com/danielchappell/ski-stack/pull/41/checks)
provides hosted results for the current head. This publication bookkeeping also
receives an affected-document review; do not treat a historical verdict as
covering a later implementation change.

Owner aesthetic acceptance, merge and production release remain separate.
W2/W3 production target decisions remain unchanged. No recovery-batch work is
included. Merge W1 first, reconcile the follow-up base, verify the tested tree and
current checks, then merge only under owner authority.
