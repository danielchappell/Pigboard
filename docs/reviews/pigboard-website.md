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
