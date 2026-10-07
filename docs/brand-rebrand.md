# Pigboard identity and website direction

4 October 2026. Owner-requested rebrand. This document maps the whole outcome;
the active queue remains [delivery-plan.md](delivery-plan.md). Current review
status is in [rebrand evidence](reviews/pigboard-rebrand.md). Earlier product
reviews do not cover this document.

## Outcome and retained decisions

Make Pigboard the consistent product name across documentation, generated human
and agent output, visual identity, and the marketing website. Preserve the
existing product decisions and completed work while making the intended product
understandable without this conversation.

The [product definition](product.md), [strategy](product-strategy.md), and
[architecture](architecture-plan.md) remain the sources for product scope.
Pigboard supplies an opinionated AI software development lifecycle: a team gives
it a feature, it coordinates discovery and small reviewed changes, and people
make meaningful product and shipping decisions. We maintain and improve the
supported method. Boards, execution providers, packages and MCP enable it.

The initial audience is engineering leads with an existing application,
established quality standards and developers already using coding agents.
Their recurring problem is coordination across sessions: context, decisions,
handoffs, reviews, failures and readiness. This is the recorded target-customer
hypothesis. Customer demand, willingness to pay, differentiation and market fit
have not been established by the records recovered for this rebrand.

Source baseline: current remote main `ab258f6dcf4678ef0e4df85b8f029e3766a32301`,
verified on 4 October 2026. It contains the GitHub Projects/local Codex MVP,
standalone Cursor command, offline profile preview, Jira metadata diagnostic and
first-host/owner foundations. These do not establish full hosted Jira delivery
or live acceptance. Preserve every current guide and the existing recovery
queue, including its two-PR cap and outstanding decisions. This rebrand is new
owner-requested work, not permission to resume or expand that recovery batch.

## Positioning and copy

- Product name: **Pigboard**. Use this capitalization in prose and headings.
- Wordmark: **pigboard**, lowercase, matching Rovito's rounded white lettering.
- Category: an opinionated AI development process.
- Candidate headline: **A development process you can delegate to.**
- Candidate supporting copy: **From product discovery to small, reviewed changes.
  Your team directs the product and decides what ships.**
- Supporting idea: **Delegate the feature. Stay in control of the decisions.**

Lead with the customer outcome and the coordination burden. Explain the intended
journey with familiar terms and concrete evidence. Avoid unsupported promises
of autonomous correctness, measured time savings, proven market fit, universal
provider support or a commercially available hosted service. Current-use guides
describe what works in the MVP; product-direction pages describe the destination.
No pricing, testimonials, customer logos or invented sign-up flow are needed.

## Documentation and naming rules

Replace the former display name throughout current repository prose, including
role/skill instructions, product and architecture documents, research narrative,
roadmap wording and human guides. Refresh the README introduction to explain
Pigboard's purpose first and clearly identify the implementation available here.
Keep all accepted principles, scope, requirements and authority boundaries.

Do not falsify captured evidence. Exact historical tool responses, signed
comments, issued credential names, hashes, quoted probe prompts, archived
transfer packages and published release records retain their original bytes.
Label those as historical identifiers where readers need the explanation.
Historical CLEAN verdicts still apply only to their recorded hashes/revisions.

Actual GitHub repository URLs retain `danielchappell/ski-stack` until a repository
rename is performed and redirects/integrations are checked. Show the link text
as Pigboard. Clone instructions can use an explicit `pigboard` destination and
`cd pigboard` without inventing a new remote. The current workspace directory
and saved app project name are operational identifiers, not the product name.

Runtime display strings, package metadata and generated comments should use
Pigboard. Internal compatibility identifiers need a separate reviewed change:
`SKI_*` configuration, claim encodings, signed handoff markers and bodies,
deterministic branch/ref names, and `.ski-stack` state directories cannot all be
blindly replaced. Old signed comments must remain verifiable without weakening
signature or exact-body checks. New names require an explicit read-old/write-new
policy, conflict precedence, recovery tests and migration instructions where
applicable. This design identifies that work; it does not invent those contracts.

## Mascot and visual system

Use the owner's established scuba pig, with a floating virtual Kanban board.
The board interpretation is the working assumption from the owner's
“floating virtual comboboard” wording until corrected. It has three columns and
simple task cards; it is a brand illustration, not a screenshot of shipped UI.

Preserve peach-pink skin, broad snout, triangular ears, glossy black eyes, teal
mask and flippers, black professional BCD, yellow tank, regulator and coherent
hoses. Front limbs end in simplified cloven hooves. Match the soft rounded
3D clay/plastic style and friendly proportions of the accepted Scubapig artwork.

Produce a coherent series: a transparent pig-and-board mascot, a graphite
horizontal wordmark composition, and a compact avatar/logo composition.
Use the same character reference for all three. Save source images in the repo,
record prompts and provenance, inspect anatomy/text/alpha, and show the series
for visual feedback. The owner approved the three-logo series on 4 October 2026 after viewing it.
The asset guide records production-export limits; tiny favicons may still need
a simpler derivative and their own small-size check.

The following was the original shared-color decision. On 4 October 2026, the
owner approved a distinct Pigboard palette while retaining the structure and
logo. The owner later rejected plum and requested a happy, colorful, bold
site with a transparent hero. The current
[visual direction](designs/pigboard-bold-visuals.md) supersedes both earlier
website palettes; the approved outcome-led copy stays unchanged.

The original decision called for Rovito's visual system: graphite `#272c33`,
white, teal `#58c9ce`, deep teal `#187b80`, coral `#f58d6c`, yellow `#f0c45a`,
system/Avenir Next fonts, rounded controls, generous spacing, visible keyboard
focus and reduced-motion support. It called for a flat graphite background
instead of the original mascot reference's warm cream. Those website colors
have been superseded by the Pigboard palette above.

## Website architecture and journey

The verified local Rovito reference is commit
`32875af00a19241541296bbb10543ec29fcb7a42`, including `website/README.md`,
`theme.css`, `styles.css`, `layout.html`, `pages/`, `build.mjs`, `app.js`,
`deployment.md`, the Go website handler and Fly deployment configuration.
This is source evidence; current production configuration must be rechecked
before deployment.

Rovito uses static HTML/CSS/JavaScript generated by a dependency-light Node build,
served by a Go HTTP handler in a Fly.io container. Its existing app also hosts
Rovito OAuth and downloads. Pigboard should reuse the website build, design and
serving pattern with Pigboard-owned configuration and assets. The marketing site
does not need Rovito's login service, credentials, download manifests or private
database. Deployment topology (separate Fly app or explicitly approved shared
app), domain, repository/CI ownership and release authority need to be settled
before production changes. “Same hosting” establishes Fly.io, not permission
to modify Rovito's live OAuth service.

The visitor journey is: understand the outcome and intended audience -> see
the maintained method and human decisions -> inspect present capability and
product direction. Start with the same Rovito layout, navigation, hero,
section patterns and footer. Adapt content and destinations to Pigboard's real
offer; do not advertise a downloadable hosted product or fabricated account flow.
Current guides must be useful to humans and agents through ordinary readable
HTML and copyable commands. Prefer local preview and reviewed copy before any
public release. If a lead-capture/contact action is chosen later, use a real
authorized destination and specify privacy/data ownership first.

Build verification covers output, internal links, metadata, artwork, responsive
layout and keyboard behavior. Serving verification covers direct routes, missing
pages, traversal protection, content types and security/cache headers. Deployment
must check the exact revision, health, critical routes and rollback. No public
deployment is claimed by a local preview or a successful build.

## Ordered candidate milestones

This is a dependency map, not groomed delivery-ready Stories. Groom after two
independent design reviews are CLEAN, using `write-pr-sized-stories`.

1. **Brand and documentation Tasks:** current main has 20 prose-bearing files.
   Split current identity/product guidance from technical guides and historical
   narrative before delivery, with every Task below 20 total files including
   plans/review evidence. Add this direction and a rebrand lane to the existing
   queue; verify names, links, examples, preserved evidence and product claims.
   Use the isolated current-main worktree; preserve the original dirty checkout.
2. **Logo Task:** produce the three matching assets and a concise usage/provenance
   record; inspect and present them. It can proceed alongside document review.
3. **Runtime identity discovery Task:** enumerate display strings and durable
   identifiers; design bounded compatibility changes and migration behavior.
   This must precede delivery-ready runtime rename Stories.
4. **Website discovery/design Task:** pin the current Rovito source/design and
   settle the Pigboard page map, honest calls to action, Fly topology/domain and
   repository/CI ownership. A local website can proceed once its own inputs are
   resolved; deployment choices need not block a local preview.
5. **Runtime and website Stories:** each delivers a complete usable outcome,
   at most 20 changed files and less than two human working days, including
   tests/docs/PR work. Detailed implementation plans need fresh independent
   reviews before code; exact committed code needs fresh reviews before PRs.
6. **Owner release and verification:** publish only with the necessary target
   and release authority; verify the released revision and recovery path.

The rejected alternative is a global textual replacement across stored state
and evidence: it would break links or invalidate signed history. A fresh visual
style or a Sites-hosted React rewrite would also conflict with the owner's
explicit Rovito design and hosting requirements. Reusing the existing system
keeps the website maintainable and the visual family consistent.

## Author assessment of the seven principles

| Principle | Assessment |
| --- | --- |
| Intuitive | One product name and an outcome-first introduction reduce confusion; familiar board imagery conveys coordination. |
| Discoverable | README links to product, strategy, direction and current-use guides; the website journey explains where to go next. |
| Delightful experience | Reuse the accepted mascot and Rovito design; preserve functioning setup and avoid repeated design decisions. |
| Token saver | Keep one product truth and one active queue; concise brand rules prevent agents reconstructing decisions from old chats. |
| Secure | Preserve signed-history checks and authority boundaries; review compatibility before changing identifiers or production services. |
| Agents are equal | Rename agent-facing instructions and structured-output descriptions alongside human copy; compatibility keeps existing consumers usable. |
| Dependable | Separate intended product, current implementation, historical evidence, generated candidates and released work; verify links and recovery. |

## Review and completion evidence

The companion [review record](reviews/pigboard-rebrand.md) is the source for
current verdicts and exact hashes. This direction does not mark future Stories
complete. Author assessments remain separate from independent reviews.
