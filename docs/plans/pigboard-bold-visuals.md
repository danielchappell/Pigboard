# Give Pigboard a bold, colorful website

Problem to solve

The owner likes the copy but finds the plum palette too subdued. The repeated
hero wordmark and opaque rectangular artwork distract from the message.

Acceptance Criteria

- The website uses a bold yellow, blue, coral and mint palette with readable text and controls.
- The hero shows the scuba pig and board with a clean transparent background and no repeated Pigboard wordmark.
- The header/footer brand reads clearly without a graphite image rectangle.
- Approved marketing copy, page routes, tab behavior and access statements remain unchanged.
- All three pages work at desktop and mobile widths with visible keyboard focus and no horizontal overflow.
- Current guides identify the new palette and cutout; retained older exports are labeled accurately.

Technical Acceptance Criteria

- Reuse W1's static Node build, rooted Go server and GitHub Actions without new dependencies or production changes.
- Pin the new versioned PNG in the builder and independent test expectations, preserving the original asset sources.
- Serve only the finite generated file set, with the new cutout replacing the old mascot public path.
- Keep malformed or changed artwork from replacing the previous complete build.
- Use yellow browser theme metadata and accessible semantic wordmarks and hero alt text on the existing routes.

Testing Strategy

- Manual QA: open Home, Method and Availability at 1280px and 390px and inspect colors, cutout edges, headline, actions and navigation.
- Access and setup: use Node 20 or later, Go 1.26.6 and the local preview on port 8772; no account is needed.
- UI path: operate tabs with arrows/Home/End, copy the example, follow guide links and inspect hover, focus and selected states.
- Artwork and copy: inspect PNG alpha and rendered edges, measure contrast, and compare page text and links with approved W1.
- Automated regression: extend existing asset-integrity and serving checks for the new public asset and retained boundaries; run Node, Go race/vet and hosted CI.

---

## Implementation plan

W1a follows W1 PR #40 at `c2520a246b5dffda68dc7b4b479f758c6049cf11`.
The existing Story is at its 20-file/14–15-hour boundary, so this is a separate
17-file follow-up estimated at 6–8 human hours. No change to the recovery batch.
Open the follow-up against `codex/pigboard-website` with the dependency explicit;
merge W1 first, retarget/reconcile the follow-up, verify its tested tree and
current checks, and merge only under owner authority. W2/W3 remain separate.

Reuse the reviewed bold visual design SHA-256
`8dbe8236d25d7d67b63c571a2308cba9c3a520a2f19fc0f56a1595b355ed3f90`,
CLEAN from two fresh independent Sol reviewers. The generated cutout has been
inspected on yellow, coral and mint in a local browser proof. It preserves the
pig and makes the board translucent. Original sources remain unchanged.
Built-in image generation ID: `exec-38f696bf-424d-4b86-b0ca-8b74b563dfa4`.
Session source: `/Users/josephchappell/.codex/generated_images/01a106bc-a263-7ae3-9268-8bfe1b23c2be/exec-38f696bf-424d-4b86-b0ca-8b74b563dfa4.png`.
Copy it unchanged into the versioned repository path below; the hash is the
portable verification reference, not a dependency on that local source path.

### Exact 17-file inventory

1. `assets/brand/pigboard/mascot-board-v2.png` — new unmodified generated cutout, SHA-256 `edf1a941bdd3169d61cce533b4f770da4c8ee7179217f2c7583388796680a54f`.
2. `assets/brand/pigboard/README.md` — current use, original provenance, new exact prompt and alpha limits.
3. `website/theme.css` — light semantic palette, accessible foreground/action/focus states.
4. `website/styles.css` — bright section surfaces, large bold headline, clean transparent hero and HTML wordmark styling.
5. `website/layout.html` — semantic header/footer wordmarks and yellow theme metadata; same navigation and social lockup.
6. `website/pages/index.html` — new image source and accurate alt text only; all marketing copy remains intact.
7. `website/build.mjs` — swap the mascot filename/hash in the finite artwork set; no build logic or metadata-copy change.
8. `website/website.test.mjs` — independent expected hash, new asset tamper/missing checks and light-theme/hero contract assertions.
9. `website/server/handler.go` — new asset path in the existing allowlist only.
10. `website/server/handler_test.go` — updated range fixture plus new-asset GET/HEAD and old-path denial.
11. `website/README.md` — current palette, semantic wordmark, new cutout and source-preservation guidance.
12. `docs/designs/pigboard-bold-visuals.md` — reviewed design.
13. `docs/plans/pigboard-bold-visuals.md` — this Story and concrete plan.
14. `docs/reviews/pigboard-bold-visuals.md` — author, independent review and verification evidence.
15. `docs/delivery-plan.md` — one active queue, W1a dependency and exact stage.
16. `docs/designs/pigboard-website.md` — mark the original plum visual choice historical and link the follow-up.
17. `docs/brand-rebrand.md` — current visual-direction link without rewriting historical evidence.

### Implementation and verification details

Copy the generated PNG unchanged from its recorded source. Keep 1536×1024
intrinsic dimensions and natural aspect ratio, with no CSS opacity, crop or
background rectangle on the mascot. Preserve its character and board. The
original lockup stays in Open Graph metadata; the hero now uses only v2.

Use full yellow header/hero surfaces, paper reading space and large coral/mint
accents. Keep the section order and responsive grid/stack layout. Increase hero
headline size and weight without clipping the CTA/status. Use deep blue links,
white-on-cobalt actions, and focus/selection colors measured against their actual
surfaces. Pass criteria: at least 4.5:1 for ordinary text, 3:1 for large text
(24px regular or 18.7px bold), and 3:1 for control/focus boundaries against
adjacent colors. Check actual normal, hover, active and selected surfaces.
Ensure selection text and form/status tokens also work in the light
scheme even where unused. No new motion or browser behavior.

Compare all three source-page text nodes and link targets against W1, allowing
only the requested hero alt/source and shared wordmark markup changes. Run the
seven existing Node tests with updated independent pins, plus Go race and vet.
The existing asset hash failure tests protect atomic build replacement; the
Go GET/HEAD/range and retired-path checks protect the renamed public asset.
Do not add unit tests that mirror decorative CSS values.

Stop the preview before rebuilding its site directory. Compile a new Go binary
with the revised allowlist and restart on 8772. Verify all three routes, new
artwork 200/HEAD, old public mascot path 404, metadata and readiness. Browser
checks cover 1280×800 and 390×844, original tab/keyboard/copy behavior, no-JS
source fallback, focus/hover/selection, no overflow and visible alpha. Save a
screenshot of the complete revised hero and color sections for owner review.

Commit, obtain two fresh independent Sol code reviews, fix in-scope issues and
re-review the resulting commit to CLEAN. Then push/open the stacked PR and
verify exact-head CI. Do not merge/deploy. Rollback reverts this follow-up,
rebuilds the prior asset set and restarts the prior server; original art is kept.

Author principles: Intuitive—same controls and pages with clear color roles;
Discoverable—strong readable focus/links and current asset guide; Delightful—
bold happy color and clean single hero mascot; Token saver—unchanged copy and
shared token system; Secure—finite asset path and checked bytes, no new service;
Agents are equal—semantic brand/alt text and noninteractive verification;
Dependable—real alpha/contrast/copy checks, preserved originals and separate
local/review/CI/merge/release evidence.
