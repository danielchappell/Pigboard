# Pigboard: bold color and a clean hero

4 October 2026. Owner-directed follow-up to W1. The owner approves the outcome-led
copy, rejects plum and repeated hero/header wordmarks, and asks for happy,
colorful and bold. Preserve the copy, site structure, interactions and architecture.

## Direction

Use a light, sunny palette with strong contrast and deliberate color blocks:
yellow `#ffe36a` hero/header, warm paper `#fffaf0` reading surfaces, cobalt
`#244de8` actions, deep blue `#183159` text, coral `#ff8c73` and mint `#a7e4ca`
accents. Mint and coral appear as substantial feature/closing surfaces, not only
tiny highlights. Prefer a few clear color roles over equally loud competing colors.
Deep blue provides readable text; dark blue links must remain readable on every
surface. Measure body-text, action and focus contrast before committing.

The hero uses only the scuba pig with its floating board. Produce a sibling PNG
with genuine transparent surroundings, crisp antialiased edges and no broad glow.
Preserve the character, full body, split hooves, gear, pose and board. Keep the
original approved exports. The glass board may remain translucent within its
outline; do not fade the whole pig to simulate transparency. Inspect alpha and
render the result over the actual yellow background before accepting it.

The header and footer use a crisp lowercase HTML Pigboard wordmark in the
existing rounded font family, without a graphite image rectangle. The hero has
no brand text. The original graphite lockup remains the social-sharing image,
where a standalone brand composition has a purpose. Alt text describes the pig
and board; it does not describe a wordmark that is no longer in the hero.

Keep the same hero side-by-side/stacked structure, tabs, three benefits, guide
pages and footer. Make the main headline larger and heavier, with enough space
for actions and development status. Preserve all approved words, link targets,
IDs, keyboard behavior and script-free content. Use color blocks and typography,
not new marketing claims, decorative motion or another product illustration.

## Technical boundary

Reuse W1's Node builder, Go rooted file server and GitHub Actions. A new versioned
mascot replaces the old mascot in the generated asset set; retain the old source
PNG. Update the independent asset hash assertions and finite server allowlist
with the new filename. Keep the same three exported artwork files and route
count; the lockup and avatar bytes do not change. A missing or altered cutout
must fail the build while preserving previous complete output.

Prefer semantic tokens for colors and inherited section roles. The shared
`--rv-*` interface can remain for component reuse, with documented Pigboard
values. Light-theme selection, hover, focus, tab selection and guide navigation
must remain legible. Use white text on cobalt actions and deep blue links on
light surfaces; check both foreground and surrounding control contrast. Update
`layout.html` browser `theme-color` to yellow on all routes. Update the current
website README and asset guide to name the new palette and active transparent
cutout, retaining old exports as historical alternatives. Mark prior plum
website design/brand guidance superseded. No remote font, dependency, runtime feature, permission,
production app or deployment change. Static versioned artwork needs no new API.

## Delivery and verification

W1 PR #40 is already at 20 files and a 14–15-hour estimate. This additional
asset/style outcome is a separate follow-up, based on reviewed `c2520a2`; it
must not silently exceed that Story's cap. Keep one active queue, name W1 as
the dependency, and open a stacked PR only after the new code reviews are CLEAN.
Owner merge remains separate; W2/W3 production choices stay pending.

Verify all three routes at desktop and mobile; inspect the cutout over yellow,
large headline and CTA visibility, colored sections, active/hover/focus states,
keyboard tabs and copy feedback. Check no horizontal overflow, unchanged copy,
PNG alpha and expected hashes, browser theme metadata and current-use guide
consistency. Run focused Node/Go regressions and hosted CI.
Stop the rooted preview before rebuilding and restart it with the updated Go
allowlist. A rollback restores prior source/artifact references and rebuilds;
original art remains available. No customer data or account state changes.

## Author principles

- Intuitive: clear action/link roles and familiar page structure; the hero is one character illustration.
- Discoverable: strong contrast and visible focus/selection; semantic links and accessible brand names remain.
- Delightful experience: brighter owner-requested character and color, without redundant hero branding or a rectangular backdrop.
- Token saver: shared tokens and unchanged concise copy; no new interface for agents to learn.
- Secure: finite public asset route and pinned bytes; no added external resources, permissions or service access.
- Agents are equal: semantic wordmark, alt text and noninteractive build remain readable; decorative colors carry no exclusive information.
- Dependable: actual alpha/contrast/browser evidence, preserved source exports, and distinct preview/review/CI/merge/release states.
