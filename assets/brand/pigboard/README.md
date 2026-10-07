# Pigboard logos

4 October 2026. The owner approved this three-logo series after visual review.
It uses the established Scubapig mascot and Rovito visual family. The export and
small-icon limitations below still apply when preparing production assets.

## The series

| Asset | Use | Source |
| --- | --- | --- |
| [Original pig and board](mascot-board-v1.png) | Retained original export with dark board; superseded for the website hero | 1536 × 1024 PNG, RGBA with transparent pixels |
| [Graphite wordmark](lockup-graphite-v1.png) | Wide brand composition and marketing reference | 1536 × 1024 PNG, graphite background |
| [Compact avatar](avatar-graphite-v1.png) | Profile/brand avatar at medium sizes | 1254 × 1254 PNG, graphite background |

![Pigboard wordmark](lockup-graphite-v1.png)

## Current website hero

The owner's later feedback requested happy, colorful, bold styling, one header
wordmark and a clean transparent hero. The website now uses
[mascot-board-v2.png](mascot-board-v2.png), a new 1536 × 1024 RGBA cutout of the
same pig and board. The original three exports remain unchanged. The revised
website and cutout are presented for owner visual review; the earlier series'
approval does not imply acceptance of this new site direction.

V2 has transparent surroundings and a translucent board, without a broad visible
glow on the yellow, coral and mint browser proof. Alpha spans 0–254; 53.58% of
pixels are fully transparent. The pig is nearly opaque and the glass board is
intentionally translucent. Inspect the actual composited result at its intended
size instead of treating nonzero hidden RGB values as a visible background.
Do not add CSS opacity, an opaque frame, a color tint or a crop to the hero.
The website header/footer use semantic text in the rounded font family. The
original graphite lockup remains the standalone social-sharing composition.

V2 SHA-256: `edf1a941bdd3169d61cce533b4f770da4c8ee7179217f2c7583388796680a54f`.

## Identity and use

Keep the same pink pig, triangular ears, teal mask, black BCD, yellow tank,
regulator and split front hooves across applications. The floating panel is an
illustrative Kanban board. It does not depict an available Pigboard dashboard.
Prose uses **Pigboard**; the wordmark uses **pigboard** with Rovito's rounded white
letters and a coral dot above the i.

Use the retained graphite composition where a standalone dark composition is
appropriate. The original v1 mascot includes soft colored edge glow and should be checked
against its final background. Its alpha ranges from 0 to 254; it is not a
pixel-perfect opaque cutout. The graphite images are generated raster scenes,
so their backgrounds should not be assumed to be a perfectly uniform CSS color.
Do not tile them or use a small crop as a flat page background.

The compact avatar preserves more detail than a favicon can show. Use it at
128 px or larger until a small-icon derivative is checked. Keep text and core
navigation as accessible HTML; do not rely on the image wordmark as the only
accessible product name. Suggested mascot alt text: “Scuba pig moving a card
on a floating Kanban board.” Use empty alt text when adjacent copy already
provides the same information and the artwork is decorative.

## References and generation prompts

Generated with the built-in imagegen tool on 4 October 2026. Source PNGs are
copied without alteration. The character reference was the foreground pig in
the owner's 19 June Scubapig group artwork, original file
`ig_0b3ae0e071c4dab0016a37e6460784819193952e1855c73fa3.png`.
The style reference was Rovito's `website/assets/rovito-lockup-graphite.png`
at commit `32875af00a19241541296bbb10543ec29fcb7a42`.

Prompt specifications used:

- **Mascot:** preserve only the foreground pig's identity, match Rovito's soft
  rounded 3D clay/plastic style and professional equipment, float in three-quarter
  view beside a translucent three-column Kanban board with white/teal/coral cards;
  one cloven hoof moves a card; no words; request true transparency and padding.
- **Wordmark:** use the generated mascot as the character reference and Rovito
  as the composition reference; pig left, smaller floating board above the
  middle, exact lowercase `pigboard` in rounded white 3D letters on the right,
  coral i-dot; graphite background; clear space below the wordmark.
- **Avatar:** use the same mascot reference; upper-chest crop, same pig face,
  mask/regulator/BCD/tank, one cloven hoof and a small three-column board with
  three cards; graphite background; no text; square format.

Original generated IDs, in order: `exec-7cf8bf26-b7b3-4ed7-953f-1384c0f006d4`,
`exec-643b3337-b783-4608-9e4d-82d4dcdbaedd`, and
`exec-05116adf-79cd-4bbc-820d-9ec6d0d7b3e1`.

## Author inspection

Inspected all three full-size outputs: the same pig identity, teal/black/yellow
gear, coherent equipment, visible split hooves and recognizable board are
present; the wordmark spells `pigboard`. The head/board hierarchy remains clear
at avatar size, but task-card details are intentionally decorative. No image
claims the hosted product is available. Alpha/dimensions were inspected from
the saved files; the export limitations above remain for final production work.

Principles: **Intuitive**—familiar pig/board subject; **Discoverable**—clear file
purposes and alt-text guidance; **Delightful experience**—consistent character
family; **Token saver**—one asset guide with provenance; **Secure**—no credentials
or external account changes; **Agents are equal**—stable file names and explicit
usage/status; **Dependable**—owner approval, original bytes and export limitations are named.

## Transparent cutout edit prompt

Generated with the built-in imagegen tool on 4 October 2026, using
`mascot-board-v1.png` as the edit target and `transparent_background: true`.
Generation ID: `exec-38f696bf-424d-4b86-b0ca-8b74b563dfa4`. The resulting PNG was
copied into the repository unchanged. Exact prompt:

> Edit target: the provided Pigboard mascot PNG. Make a precise production-ready transparent cutout for a bright yellow website. Preserve the same friendly peach-pink scuba pig, proportions, expression, triangular ears, glossy eyes, teal mask and flippers, black professional BCD and regulator, coherent hoses, yellow tank, split cloven hooves, pose and existing soft rounded 3D clay/plastic rendering. Preserve the floating three-column virtual Kanban board and colored cards, the interaction of the right hoof moving the coral card, and the bubbles. Keep the existing landscape composition and full body, with a little clear space around the whole silhouette. CHANGE ONLY the background and edge treatment: remove ALL broad colored glow, haze, smoky lighting, black or gray background, drop-shadow ground, rectangular panels and backdrop. Outside the pig, bubbles and board should be truly transparent alpha=0, not a painted checkerboard. Pig and equipment should remain opaque and naturally shaded; the board may remain translucent glass within its clean outer edge. Clean antialiasing on silhouette, no halo. No text, no wordmark, no new objects. It must sit cleanly on yellow, coral, mint or cream UI backgrounds.
