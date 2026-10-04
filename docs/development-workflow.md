# How we develop Pigboard

These are the owner's standing instructions for substantive software lifecycle
work across projects: discovery, design, architecture, grooming, planning,
implementation, review and release. Use the Rovito/Pigboard process below.
They govern how we develop products, not requirements imposed on their users.
Do not apply the full ceremony to an ordinary question or a trivial edit.
Explicit task instructions and repository-specific constraints still apply.

## Map the work before choosing the first slice

Follow this order:

**Ideation -> product discovery -> technical discovery -> architecture/design ->
independent design review -> grooming and ordered delivery plan -> independent
plan review -> implementation -> independent committed-code review -> PR/checks ->
authorized merge/release and verification.**

1. Recover the intended outcome, users, agreed scope, non-goals, constraints,
   existing decisions, current code and active roadmap. Separate verified facts,
   assumptions, proposals and unresolved questions. Preserve work already done.
2. Product discovery defines the human and agent journeys and observable success.
   Technical discovery resolves facts that determine feasibility, contracts,
   security boundaries, reuse and estimates. Use focused Tasks for real unknowns.
3. Create the high-level architecture and development plan for the intended
   product or feature before selecting an implementation slice. Describe component
   responsibilities, data/authority ownership, interfaces, failure/recovery,
   rollout and verification. Show the path from today's system to the intended
   outcome and candidate dependency-ordered milestones. Consider alternatives.
   Design enough to see the whole path; do not prebuild speculative foundations.
4. Obtain independent adversarial design reviews. Fix in-scope findings and
   re-review to CLEAN before grooming that design into delivery-ready Stories.
5. Groom the reviewed design with `write-pr-sized-stories`. Map the whole agreed
   scope into ordered slices with dependencies, outcomes and verification. Keep
   uncertain later work provisional; detailed design evolves as evidence arrives.
   Choose the first Story because the roadmap and dependencies justify it, not
   because it is the easiest adapter or most convenient experiment.
6. Review the delivery plan for design fidelity, coverage, real dependencies,
   usable increments and size. Before each Story, recheck current code and write
   a concrete implementation plan covering changes, contracts, tests, docs,
   failure paths and rollout. Independently review it to CLEAN before coding.
7. Implement the approved Story and plan. Update tests and user/agent documentation
   together. Verify the smallest meaningful behavior first, then the required
   repository checks. Record an author assessment separately from review evidence.
8. Commit the implementation, then obtain fresh independent adversarial reviews
   of the exact committed diff. Fix confirmed in-scope issues, commit fixes and
   re-review the updated code until CLEAN before opening the PR. Design or plan
   review cannot substitute for code review; self-review is never independent.
9. Open/update the PR with the outcome, scope, reviewed commit, tests, docs and
   limitations. Complete required checks for the current changes. Merge/deploy
   only under the user's existing authorization and the repository's ownership
   rules. Verify the resulting revision and any required live/release behavior.

For a bounded bug fix or an already-reviewed roadmap item, reuse the applicable
product/design decisions; do not restart the whole project. Record what is reused
and run the gates affected by the change. If earlier work skipped a gate, perform
and label a retrospective review; never invent a prior approval or CLEAN result.

## Small, complete Stories

Always use `write-pr-sized-stories` when writing, splitting or revising development
work items. Every Story must deliver one complete usable behavior or technical
outcome in **one PR, at most 20 changed files total, and less than two human working
days**, including tests, configuration, documentation and PR preparation.

Split before implementation if any limit cannot be met. Do not relax the limits,
hide supporting files or create inert plumbing to make a Story appear small.
Research, discovery, decisions, design-only and documentation-only work are Tasks.
Resolve a Task before declaring its dependent Story ready when its answer changes
scope, interfaces, security, feasibility or sizing. Requested previews of later
Stories must say **Provisional — not ready for delivery**.

Use the skill's short title, Problem to solve, Acceptance Criteria, Technical
Acceptance Criteria and Testing Strategy. Keep dependencies, estimates and review
records in the delivery plan rather than adding ceremony to each Story.

## Independent review gates

Use fresh independent **Sol** agents with complementary lenses for substantive
architecture, delivery/implementation plans and committed-code reviews. Use at
least two distinct reviewers per round: one for product experience, goal/design
fidelity and documentation; one for correctness, boundaries, security, failure
recovery and tests. Each must still assess all seven principles below. This is
explicit authorization to delegate those bounded review tasks. If Sol or an
independent reviewer is unavailable, report the incomplete gate; do not silently
replace independence with the author's own pass.

Give reviewers the actual artifact/revision, agreed goals and non-goals, relevant
source, acceptance criteria and verification evidence. Reviewers inspect the
artifact independently before accepting author conclusions. Require:

- Coverage: enumerate the agreed review surface, walk every requirement/file/contract
  in it, and report examined/total counts plus a second sweep for missed findings.
  Reject a report without this denominator; partial coverage cannot be CLEAN.
- Concrete, evidenced findings with severity and references; separate speculation.
- Their own seven-principle assessment, including human/agent differences.
- A CLEAN or NOT CLEAN verdict for that exact artifact/revision.

Classify findings as real in-scope issues, out-of-scope follow-ups, or invalid with
evidence. Fix the root cause of real issues, not merely a reviewer's proposed
patch. Review changes and affected behavior again; a stale verdict does not cover
new code. CLEAN means every required reviewer completed the gate and no unresolved
in-scope findings remain. It does not authorize new product decisions or releases.
Do not turn review into an unbounded architecture exercise or add hypothetical
hardening. Genuine scope changes require the user; record adjacent findings.

## Seven defining principles

1. **Intuitive.** Familiar language, consistent behavior and sensible defaults;
   everyday work should not require knowledge of internal APIs or machinery.
2. **Discoverable.** Humans get useful help, examples and guided choices; agents
   get clear capabilities, structured inputs and actionable errors.
3. **Delightful experience.** Respect time and attention. Avoid repeated setup,
   unnecessary questions and confusing output. Smooth use matters, not decoration.
4. **Token saver.** Return relevant information first, make detail available and
   identify omissions. Fewer words that require many extra calls are not a gain.
5. **Secure.** Protect credentials and permissions and prevent accidental
   consequential actions. Friction must be proportionate; prompts alone are not
   safety, and security does not justify obstructing normal authorized work.
6. **Agents are equal.** Agent workflows are a primary experience with explicit
   inputs, structured results and noninteractive execution. Humans get readable
   guidance. Equal capability does not require identical interfaces.
7. **Dependable.** Describe queued, completed, partial and failed outcomes honestly.
   Explain recovery without causing completed work to be repeated accidentally.

The author and every independent reviewer assess all seven separately in each
substantive design, plan and implementation review: explain how each is met,
identify a concrete gap/tradeoff, or justify why it is unaffected. Names alone
are not an assessment. Never hide essential information or failure to save tokens
or create delight. These principles do not expand the agreed scope.

## Documentation, evidence and continuity

Documentation is part of the slice. Identify affected human guides, agent
contracts, help and examples in the plan. Explain prerequisites, normal use,
success and common recovery in plain language. Check examples and links; keep
proposed/unreleased behavior distinct from what works now. Authors and reviewers
check that a new user can follow the result without the original conversation.
Explain when an internal change needs no user-facing documentation; no filler.

Keep local tests, live integration acceptance, hosted CI, merge and release
verification separate. Name the tested/reviewed commit or artifact. Passing tests
or a CLEAN plan alone is not release readiness. Never weaken tests, inflate
timeouts or change shared infrastructure just to make a blocker disappear.
Use meaningful regression coverage for behavior changes, not tests mirroring the
implementation; documentation-only or trivial reversible edits need no new tests.

Continue the authorized roadmap autonomously through its applicable gates.
Do not stop for routine approval between stages or call a broad objective complete
because one PR exists. Stop for a requested pause, real missing authority/access,
or a consequential unresolved decision; continue independent useful work where
possible. Preserve the user's merge/release authority rather than assuming it.

Maintain one active delivery queue with dependencies, current stage, review
results, exact revisions, validation evidence, remaining decisions and next work.
Approved slices may overlap through explicitly identified stacked PRs where the
repository permits it. Follow that repository's merge strategy; verify the tested
file tree survives. Code changes/conflict resolutions need relevant tests and
review; do not repeat identical checks merely for ceremony.

At handoff, record exact state and outstanding work. Historical evidence remains
historical; do not mark implementation complete by rewriting a plan or ticket.

## Applying Pigboard to itself

Use the existing roles as our development process. This does not require a new
runtime feature or an automated board before we can follow it.

| Stage | Existing role and required output | Gate |
| --- | --- | --- |
| Ideation and product discovery | Planner shapes the problem, users, journeys, goals and scope. | Success is observable; product choices are explicit. |
| Technical discovery | Researcher resolves focused feasibility, contract and sizing questions. | Evidence separates facts from assumptions. |
| Architecture | Architect defines responsibilities, interfaces, state ownership, recovery and the migration path. | Two independent design reviews CLEAN. |
| Grooming | Groomer decomposes the reviewed design with write-pr-sized-stories. | Ordered usable slices cover the scope; unresolved work remains Tasks/provisional. |
| Implementation Planning | Implementation Planner makes a concrete plan for one ready Story. | Two independent plan reviews CLEAN. |
| Implementation | Implementer builds the Story, tests it and updates docs. | Committed code and author assessment available. |
| Review | Fresh independent reviewers assess committed code, contracts, experience and docs. | Two independent code reviews CLEAN before PR publication. |
| Babysit and Ready for Owner | Reconcile confirmed PR feedback and check results. | Required current checks pass; owner retains merge authority. |

Reviewers advise; they do not silently redesign the product or expand its scope.
Product and technical reviewers challenge each other's conclusions through the
recorded findings. The author resolves them against the agreed goals; genuine
product ties go to the owner. A permanent executive bot is not necessary.

The existing runtime automates only Implementation Planning, Implementation,
Review and Babysit. Earlier roles are usable manually. Following this process
here is not a claim that the SaaS or Jira automation already implements it.
Keep the current runtime handoff contract unchanged in this documentation Task.

## Sources and precedence

Recorded 21 September 2026 from Rovito's working agreement at origin/main
32875af00a19241541296bbb10543ec29fcb7a42, its independently reviewed lifecycle
designs and active delivery records, Pigboard's role cards and adversarial-review
skill, and the owner's corrections in this task. The owner explicitly requires
architecture and development mapping before grooming/selecting the first Story.

Rovito records different stack merge strategies at different times. Do not copy
its queue-specific merge authorization into Pigboard. Pigboard retains its
owner-merge boundary. This working agreement requires independent committed-code
review before opening a PR; generic skill advice to open earlier does not waive
that gate. Repository-specific checks are npm test; Rovito's Go/native release
commands are not Pigboard requirements.

The active product architecture is in [architecture-plan.md](architecture-plan.md).
It leads to the delivery plan after the design gate; existing pilots are evidence,
not the authority for selecting the next implementation.
