# Pigboard website evidence

## Scope and baseline

W1 is the local three-page marketing website, using the actual Rovito build and
Go serving approach. Baseline main is
`533a1c9d99e2c6ba01d08c2796625a54be59fccf` after owner-authorized branding
merges #38 and #39. Its tree is identical to reviewed `c5c59aa`.
[Active queue](../delivery-plan.md) owns current stage and remaining decisions.

## Independent design review

Design: `docs/designs/pigboard-website.md`, SHA-256
`d335696e4d3bd2f9680453bf8fabd586520db2337c2b04a38835e3de5455d149`.
Two distinct fresh independent Sol reviewers returned CLEAN after corrections.

- `website_design_product`: 8/8 sections, 3/3 page roles, 7/7 architecture layers,
  3/3 delivery steps and a second sweep. Its P2 private-repository access ambiguity
  was fixed explicitly. Independent principles: intuitive journey/access;
  discoverable public routes and no-JS content; delightful approved visual family;
  token-saving shared concise content; secure public-only output and constrained
  metadata; equal semantic URLs/version information; dependable recovery and
  separate preview/CI/release states.
- `website_design_technical`: 8/8 sections, 7/7 architecture layers, 3/3 routes,
  3/3 milestones and second sweep against actual Rovito source. Three P2s were
  fixed: staged build/backup recovery, production origin/revision pairing and
  no-JS panel visibility. Independent principles: intuitive direct routes;
  discoverable availability and metadata; delightful progressive enhancement;
  token-saving finite pages/shared layout; secure public output/CSP/scoped target;
  equal semantic/no-JS/noninteractive paths; dependable promotion/readiness and
  exact-revision release evidence. Opaque-logo crop quality needs browser proof.

The owner subsequently selected GitHub and GitHub Actions. This resolves CI
placement while preserving the reviewed Go/Docker/Fly controls and W1 scope.
App/domain and live release remain separate. The hashes above identify the
reviewed artifact before this owner-directed clarification.

## Implementation planning

The [W1 Story and implementation plan](../plans/pigboard-website.md) has a
19-file inventory and a 12–14 human-hour estimate. Two distinct independent Sol
reviewers returned CLEAN on SHA-256
`191f03ce67b6db9bff9061d1a20ee2332f94ea08261b8e72647e350803719ffc`:

- `website_plan_product`: 6/6 acceptance criteria, 7/7 technical criteria, 5/5
  testing bullets, 19/19 files, 3/3 routes and milestones, 7/7 architecture layers
  and a second sweep. Fixed its P2 by requiring actual executable startup and
  SIGINT/SIGTERM verification. Principles: clear visitor journeys; discoverable
  setup/access; responsive/no-JS experience; concise shared content; public-only
  boundaries; equal noninteractive and semantic paths; explicit recovery proof.
- `website_plan_technical`: the same complete coverage and second sweep; CLEAN
  after independently checking the lifecycle correction. Principles: familiar
  direct routes; actionable setup/failure help; progressive interactions;
  dependency-light shared build; scoped output and request boundaries;
  noninteractive commands and structured metadata; tested promotion/readiness/
  shutdown. Watchpoints: independent artwork hash assertions, failed promotion/
  restore and post-success cleanup tests, and Go-version parity in CI.

The plan's later CI wording records the owner's GitHub Actions decision; its
19-file scope and contracts are unchanged. Implementation and committed-code
review are still separate gates.

## Author implementation assessment and local evidence

The W1 implementation follows the 19-file plan. Browser QA corrected the opaque
wordmark crop and increased the desktop hero clearance at the 1120px breakpoint.
The approved PNGs remain byte-identical. The owner-selected GitHub Actions check
workflow does not deploy or use production secrets.

- Focused Node regressions: 7/7 pass, including link/anchor and approved-hash
  assertions, origin/revision rules, preserved prior output, stale-file removal,
  unrelated-output protection and promotion/restore/cleanup failure injection.
- Go 1.26.6 race tests and vet pass; JavaScript syntax and generated build pass.
- Existing disposable Linux/PostgreSQL repository suite: 324/324 pass, no skips,
  with the worktree mounted read-only and container network disabled.
- Actual compiled Go process: Home/Method/Availability/version/readiness return
  200 with expected headers, HEAD is empty; missing and malformed builds exit 1.
  Separate SIGINT and SIGTERM runs exit 0 in 0.002 seconds each (10-second bound).
- Browser: 1280px desktop and 390px mobile artwork/layout, all three page routes,
  no horizontal overflow, arrow/End/Home tab selection and successful copy feedback.
  Corrected 1120px breakpoint has hero copy ending at 880.65px before the next
  section at 898.66px. A temporary generated-page fixture with its script tag
  removed shows all 3/3 panels and hides inactive tab controls, verifying the
  script-free fallback without claiming browser settings were changed.

| Principle | Author assessment |
| --- | --- |
| Intuitive | Home, Method and Availability use familiar links and direct routes; the preview starts with two build commands. |
| Discoverable | Access limits and status are explicit; semantic headings, skip link, page navigation and setup errors guide readers. |
| Delightful experience | Approved art, shared Rovito styling, mobile layout, keyboard tabs and copy feedback were browser-checked. |
| Token saver | Shared layout and concise static pages avoid repeated setup; agents can fetch the same HTML and version metadata directly. |
| Secure | Only generated public files are served; strict paths/methods/CSP, no credentials, no private-host changes and loopback defaults constrain scope. |
| Agents are equal | Noninteractive build/test/server commands and structured readiness/version complement readable human pages without account setup. |
| Dependable | Failure-injection tests preserve previous output or report recovery paths; actual startup/shutdown checks passed; local, CI and release remain distinct. |

These are author/local results for the implementation prepared for commit.
Fresh independent committed-code reviews and hosted checks remain required.
No website deployment or production provisioning has occurred.

## First committed-code review and repairs

Both independent Sol reviewers examined commit
`a0f34b2f847892fad35e755c2faca768ec1c2a7f` and returned NOT CLEAN.
Each covered 19/19 changed files, 6/6 acceptance criteria, 7/7 technical criteria,
5/5 testing bullets, 3/3 pages and a second sweep of the affected contracts.

- Product reviewer: P2 headline/action below the first 1280×720 screen; P3 an
  inert copy button in the script-free page. Both are real in-scope experience
  defects. The hero now places the unchanged art beside the lead at desktop and
  tablet sizes; mobile remains stacked. Copy controls appear only after their
  handler is installed. Its independent principle assessment found these gaps
  in intuitive/discoverable/delightful behavior; concise content, noninteractive
  agent access, explicit availability and recovery met the other principles.
- Technical reviewer: P2 unlisted files and symlinks could expose content outside
  the generated site. This is a real in-scope boundary defect. The handler now
  allows only generated public filenames and the executable uses Go's rooted
  filesystem. A real-filesystem regression covers an allowlisted symlink escape,
  alongside an unlisted-file denial. Its independent Secure assessment identified
  that gap; direct routes/setup, progressive content, shared build, equal human/
  agent access and observable recovery met the remaining principles.
- Author also corrected inherited-object placeholder names being accepted;
  the builder now requires an own template value and tests that rejection.

Affected validation after repairs: 7/7 Node regressions, JS syntax, generated
build, Go race tests and vet pass. The updated executable again refused bad
startup and passed live route/header/readiness and SIGINT/SIGTERM checks.
Browser: at 1280×720 the heading begins at y202 and the primary action ends at
439px; at 1024×768 the action ends at 393px with no horizontal overflow. The
390px mobile layout and live copy feedback pass. The script-free fixture shows
3/3 panels with the copy control hidden. These supersede the earlier hero
spacing measurements. The full 324-test Linux result above predates these
website-only repairs; affected checks were rerun, and current-head hosted checks
will run the full suite. Fresh updated-commit review remains next.

## Updated committed-code verdicts

Both independent Sol reviewers returned CLEAN on
`6f021755d477df2227e49d2cb269cfa45d370be9` after the repairs above.
Each covered the original 19/19 files, 10/10 repair files, 13/13 criteria,
5/5 testing items, 3/3 pages and a second sweep.

The product reviewer verified the responsive grid and progressive-control source,
unchanged asset hashes, generated output, access claims and CI boundary. It reran
7/7 Node tests and syntax. Updated browser access was unavailable to that reviewer;
its visual conclusion uses the inspected source, earlier independent baseline and
recorded author screenshots. Go was absent from its shell. Its own seven-principle
assessment found the three experience principles repaired and no remaining gaps
in concise content, public boundaries, human/agent access or dependable evidence.

The technical reviewer independently compared the 12 generated public paths with
the handler allowlist, verified the rooted-file and placeholder regressions, and
reran 7/7 Node tests, Go 1.26.6 race tests, vet, syntax and diff checks. Its own
seven-principle assessment found the Secure gap repaired and the other principles
preserved through direct routes, useful help, progressive interactions, shared
content, equal noninteractive access and tested recovery/lifecycle behavior.

The author also reran the complete disposable Linux/PostgreSQL suite on this
updated code: **324/324 pass, zero skips**. Website runtime sources are unchanged
by the following evidence/queue update. Hosted CI, owner merge and production
release still require their own results.

## Production setup discovery

On 2026-10-04, read-only Fly inspection found `rovito-oauth` in `personal` and
`pigboard-pilot-jdc` in the `pigboard` organization, with no existing dedicated
Pigboard website app. GitHub reported no repository environments, variables or
secret names. This is current setup evidence, not permission to reuse either app
or its credentials.

The owner selected GitHub/GitHub Actions. The proposed public target is
`pigboard.scubapig.software` in a dedicated website app in the existing `pigboard`
organization; a question for the owner is pending. W2/W3 remain at that named
target decision before production implementation/provisioning. Retain the actual
Rovito Go 1.26.6, Debian/nonroot Docker, cdg/shared-CPU/256MB Fly configuration,
readiness and graceful shutdown approach. The GitHub pipeline must retain
main/repository/current-revision guards, serial deployment, an app-scoped token,
pinned Fly CLI, exact-revision smoke and recorded rollback state. Do not copy
Rovito OAuth, downloads, database or Bitbucket-specific credentials.

GitHub's current [runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
confirms `ubuntu-24.04-arm` for private repositories, so the matching official
Linux ARM64 Fly CLI archive can be reused when this slice is groomed. Its
[deployment guidance](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments)
documents environment controls and serialized deployment. No app, credential,
DNS, production image or GitHub deployment setting was created or changed here.

## Owner-approved palette refinement — 4 October 2026

The owner retained the structure and approved logo, requested a separate color
scheme from Rovito, then explicitly approved the plum/rose/amber palette. This
bounded visual follow-up reuses the reviewed W1 architecture, interactions and
recovery contracts. It does not restart product or infrastructure design.

Pigboard now has plum `#2d2233`, ivory `#fff5e9`, rose `#eeb7cf` and amber
`#f1c777`, with related plum surfaces. Rose identifies links/selected controls;
amber identifies primary actions and focus. The root class is `pigboard-theme`;
shared `--rv-*` component aliases are preserved and documented. Neutral frames
accommodate the opaque original art without tinting or changing its bytes.
The old brand-color decision is explicitly labeled superseded, making the
whole PR 20 files. Typography, layout, copy, behavior, server and CI are unchanged.

The palette was built and 7/7 existing Node website tests passed, including the
independent approved-artwork hash assertions and all routes/links. Relative-
luminance calculations across all four page surface colors found minimum text
contrast of 5.08:1 (muted), 6.79:1 (secondary), 10.35:1 (ivory), 6.54:1 (rose)
and 7.00:1 (amber). Action text across normal/hover/active colors is at least
7.74:1; control borders are at least 3.75:1. No mirror-image unit tests were added
for this reversible styling change. The owner saw and approved the palette.
Agent browser inspection was unavailable because the in-app tab connection timed
out; fresh automated screenshots/responsive checks are not claimed for this pass.

Rebuilding exposed an existing preview-guide error: the rooted Go server retains
its startup directory, so replacing that directory requires restarting the
preview. The guide now tells maintainers to stop, rebuild and restart. The local
preview was restarted and `/readyz` returned `{"ok":true}`. No server code changed.

Author principles: Intuitive—familiar structure with consistent color roles;
Discoverable—selected tabs, links and focus remain distinguishable;
Delightful—owner-approved variation and unchanged mascot; Token saver—shared
component aliases and one palette; Secure—no request, credential or service
change; Agents are equal—same semantic pages and noninteractive build, with
clearer restart guidance; Dependable—measured contrast, checked asset hashes,
explicit browser-verification limit and separate hosted CI evidence.

Fresh independent review of this committed palette delta follows. Earlier CLEAN
verdicts and CI results remain historical evidence for their named revisions.
The subsequent marketing refinement is a separate task: lead with customer
outcomes for a lead with an existing technical team, using the recovered product
and competitive research. The owner requested that it follow palette completion.

## Palette committed-code verdicts

Two fresh independent Sol reviewers returned CLEAN on
`07fd9282de0ce329198311d44aaaa823ea496612` against `6b4297e`. Both covered
9/9 changed files, the 1/1 documentation repair and a second sweep. The product
reviewer covered 6/6 affected contracts and the technical reviewer 5/5. The
product review's P3 ambiguous historical graphite instruction was a real
in-scope issue, corrected to past tense with an explicit supersession statement.
No other in-scope finding remains. The technical reviewer independently reran
7/7 Node tests and verified the documented contrast minima.

Each independently assessed all seven principles: consistent color roles;
discoverable links, selection and focus; preserved approved artwork and layout;
one token palette and shared aliases; unchanged security/authority boundaries;
equal semantic pages and noninteractive build instructions; measured contrast,
verified hashes and honest preview/review/CI limits. Neither claims fresh browser
QA. This evidence-only update does not change the reviewed website files.
