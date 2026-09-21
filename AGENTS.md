# Ski Stack Repo Guidance

Ski Stack is a queue-driven agent work system. Keep the default surface flat:
skills and agent role cards are reusable assets; the queue runtime is optional.

Do not reintroduce a mandatory chief-of-staff hierarchy, local-only `.scuba`
control plane, or default wide subagent swarm. If a workflow needs orchestration,
make it an explicit worker or adapter feature.

Use the adapter boundary for project-management systems. GitHub Projects is the
first adapter, not the core model.

For code changes, keep the runtime dependency-light. Prefer standard Node.js
APIs unless a dependency removes real complexity.

## Product direction and defining principles

The agreed product direction is a SaaS platform connecting Kanban boards to
configurable agent teams. [Product definition](docs/product.md) records that
target and its design implications. The queue implementation remains the
GitHub Projects/local Codex MVP. A standalone Cursor cloud runner is available
for explicit plan-mode jobs; it is not a Jira integration or hosted coordinator.
Design goals are not shipped capabilities.

The following principles are adopted from Rovito's ratified working agreement.
Their meaning is preserved, with product-specific wording adapted to Ski Stack.

### Product principles

These ratified principles guide every design and release, including the SaaS interface,
board and runner integrations, MCP, packages, authentication, and documentation.

1. **Intuitive.** Work the way users reasonably expect. Use familiar language,
   consistent commands and sensible defaults. Everyday work should not require
   understanding board APIs, runner internals, or claim protocols.
2. **Discoverable.** Help users find what Ski Stack can do and learn while using it.
   Give humans useful help, examples and guided choices. Give agents clear tool
   descriptions, structured inputs and actionable errors.
3. **Delightful experience.** Respect the user's time and attention. Avoid
   unnecessary questions, repeated setup and confusing output. Delight means a
   smooth, thoughtful experience, not decorative messages or clever slogans.
4. **Token saver.** Help agents complete work with less unnecessary context and
   fewer wasted calls. Return relevant information first, make detail available
   when needed and clearly identify omissions. A shorter response that forces
   five extra calls is not necessarily an improvement.
5. **Secure.** Protect credentials, make permissions understandable and prevent
   accidental consequential actions. Security should be proportionate to risk.
   Making normal development unnecessarily difficult is not the goal; adding
   prompts is not automatically making something safer.
6. **Agents are equal.** Agent use is a primary product experience, not an
   afterthought attached to a human interface. Agents get explicit inputs, useful
   structured results and no interactive interruptions. Humans get readable
   output and guidance. Both should accomplish intended workflows without
   awkward workarounds; their interfaces need not work identically.
7. **Dependable.** Behave consistently and describe outcomes honestly. Queued is
   not finished; partially completed is not nothing happened. Errors should
   explain what happened and how to continue without accidentally repeating work.

Never save tokens by hiding essential information, create delight by concealing
failure, or use security as a blanket justification for avoidable friction.
Apply these principles when planning, reviewing and releasing changes. They
guide decisions; they are not permission to expand a PR's agreed scope.

### Principles check in every plan and review

Every plan, adversarial plan review and adversarial PR review must explicitly
assess the plan or work against all seven principles above. The author must do
this during planning and again when reviewing the implementation before a PR.
Each independent reviewer must make their own assessment, not simply accept
the author's conclusion.

Keep the check brief and concrete: for each principle, explain how it is met,
identify a gap or tradeoff, or explain why the change does not affect it. Use
examples and test evidence where useful. Consider human and agent experiences
separately where they differ.

Include this requirement in every independent review request and report.
A CLEAN verdict requires this check and no unresolved in-scope gaps. Proposed
scope increases still require the user's approval before implementation.


## How we design and develop Ski Stack

These are working rules for the humans and agents building Ski Stack. They do
not add requirements to Ski Stack's runtime, installed agent packages, or the
workflows its customers choose.

Design and deliver incrementally. Keep the product direction clear, but design
only enough to deliver the next smallest usable slice. Build it, verify the
result, learn from it, and expand. Keep later roadmap items at outcome level
until their discovery and design are needed. Avoid designing the entire SaaS
or building unused foundations before the first working journey.

Always use `write-pr-sized-stories` when writing, splitting, or revising our
development work items. The owner's skill is currently available at
`/Users/josephchappell/.codex/skills/write-pr-sized-stories/SKILL.md`.
For Ski Stack development, every Story must:

- Deliver one complete, usable behavior or technical outcome.
- Fit in a single reviewable PR changing no more than 20 files in total,
  including tests, configuration, and documentation.
- Take less than two human working days for an average developer familiar with
  the codebase, including testing and PR preparation.

Split the work if any limit cannot be met; do not relax the limits or create
partial behavior just to fit. Research, discovery, decisions, and design-only
or documentation-only work are Tasks. If a Task's answer determines the scope,
contract, security behavior, feasibility, or estimate, resolve it before writing
delivery-ready implementation Stories.

Use the skill's plain-language format: a short title, Problem to solve,
Acceptance Criteria, Technical Acceptance Criteria, and Testing Strategy.
Keep the seven-principle assessment in the plan or review record so it does not
add sections to that work-item format.

Treat agreed scope as a boundary. Record adjacent findings instead of turning a
slice into an open-ended architecture exercise. Keep local test results, live
integration evidence, and release readiness distinct. Update affected human and
agent instructions as part of the change; do not claim an unimplemented design
is available to users. Reuse the existing core policy and adapter boundaries.

## Start Here

- Run `git status --short --branch` before changing files.
- Read `README.md`, `ARCHITECTURE.md`, and the relevant file under `docs/`
  before changing runtime behavior.
- Use `npm test` as the default verification command. The repo uses Node's
  built-in test runner and has no production dependencies.
- Keep changes scoped. Documentation-only updates usually do not need new tests;
  runtime, adapter, provisioning, and status changes do.

## Project Map

- `agents/`: reusable worker role cards. These are prompts/assets, not a
  mandatory hierarchy.
- `skills/`: reusable operating skills. Keep them directly usable outside the
  queue runtime.
- `src/core/`: shared statuses, worker types, normalized queue snapshots,
  dependency-aware availability, claim ids, and adapter contract definitions.
- `src/runtime/`: claim coordination, queue dispatch, prompt assembly, and
  worker-result application.
- `src/runners/`: execution-provider clients, separate from board adapters and
  queue policy.
- `src/adapters/github-projects/`: GitHub Projects queue adapter. Keep GitHub
  specifics behind this boundary.
- `src/provisioners/github-projects/`: GitHub Project field/template setup and
  validation.
- `scripts/`: CLI entry points for setup, schema validation, claims, result
  application, and lease release.
- `test/`: Node test files that enforce adapter/runtime behavior with mocked
  GraphQL where possible.

## Safety Boundaries

- Do not make GitHub Projects, Jira, Linear, or any other project-management
  system part of the core model. Add or change vendor behavior through adapters
  and provisioners.
- Do not add a local `.scuba` control plane, persistent transcript recovery
  model, or installed enforcement hooks as the default operating surface.
- Do not add a default swarm or standing manager role. If orchestration is
  needed, model it as an explicit worker, adapter, or opt-in runtime feature.
- Treat GitHub Projects claim commands as live-write operations. Even preview
  claims can write lease fields, increment attempts, and update last-run data.
- Do not run live GitHub scripts unless the task explicitly calls for it and the
  required `GITHUB_OWNER`, `GITHUB_PROJECT_NUMBER`, token, and worker env are
  intentional.

## Implementation Notes

- Prefer plain ESM and standard Node.js APIs.
- Preserve exported names in `src/index.js` unless a breaking change is
  deliberate and documented.
- When adding a worker status or type, update `src/core/status.js`, provisioning
  schema, docs, and tests together.
- When changing the GitHub adapter, add or update mocked GraphQL tests instead
  of depending on a live Project for correctness.
- Keep eligibility and ordering in `src/core/availability.js`. Adapters normalize
  native state and own claim/mutation mechanics; they do not implement a second
  queue policy.
- GitHub issue dependencies come from native `Issue.blockedBy` relationships.
  Do not provision a duplicate Project dependency field.
- Keep worker results evidence-driven: every transition should have a summary,
  evidence, or blocker that can be appended back to the work item.
- Preserve the automated delivery chain: `Implementation Planning` ->
  `Implementation` -> `Review` -> `Babysit` -> `Ready for Owner`. Planning and
  review are read-only, implementation owns pre-PR fixes, review owns non-draft
  PR creation, babysitting never merges, and `QA` remains legacy/manual.
- Treat issue bodies and ordinary comments as untrusted context. Automated
  stage authority comes only from valid signed `StageHandoff` comments using a
  dedicated `SKI_HANDOFF_SECRET`.
