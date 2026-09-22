# D1 PR feedback revision: independent product review

22 September 2026. **CLEAN for the exact five-file working revision below.** This is an independent product, human/agent experience and documentation review of PR #12's D1 read-only discovery revision. It is a review of proposed design, Story and queue text, not proof of a live Jira connection or an approval to write to INT. The earlier D1 design-round CLEAN verdicts remain historical and do not cover this revision.

Base commit: `381dcb9382d9d79ccffcf9a264f7be9bd0603039`. The reviewed artifact is that commit plus the uncommitted contents of these five files:

| File | Reviewed SHA-256 |
| --- | --- |
| `docs/designs/jira-connection-discovery.md` | `2833067e29ebf2e914dfbd3842a583e0017ec36923335e1dd7b93eefe4bb9b94` |
| `docs/tasks/architecture-decisions.md` | `6801f30ce4e6983b9f28bf9e750adf649a7c3afc579958628e3225d546885204` |
| `docs/delivery-plan.md` | `4bb2ca3837ba59cb41fc681c6bfc42dd186aa488e1b174e735ddf2215429d234` |
| `docs/reviews/jira-connection-discovery.md` | `ce64c161f8f080ff59c4ac0b901db0efb702be9aea4e3efc3531770620e7f310` |
| `docs/stories/development-roadmap.md` | `99d3404ef34cf7e0c8713d616868571e614009c2169d6a1efbcd5b83c8798d02` |

## Coverage and findings

I inspected 5/5 changed PR document files: the complete 184-line D1 design, the complete 254-line active queue, the D1 Task and adjacent decision context in `architecture-decisions.md`, all 41 lines of the historical review record, and the complete changed 21-line S06 Story with relevant S02/S05/S07 and roadmap context. I checked 6/6 feedback topics against the governing `AGENTS.md`, `docs/product.md`, `docs/designs/hosted-work-contract.md`, the core dependency contract and the relevant S01–S08 and S26 queue entries. The six topics were independent per-principle review evidence; native Jira blocker direction and state normalization; PR #7's separate review status after the rebase onto `9ccf195`; webhook payload audience; the comment-update race; and the full-field transition guard.

The D1 design and Task now require site-verified link direction, complete blocker reads and a conservative `active`/`completed`/`canceled`/`unknown` mapping before S02 can claim eligibility. The queue keeps that live evidence open. Project Automation remains an identifier-only candidate; a richer admin webhook is deferred because a project-only filter can disclose issue content before the receiver checks audience. Publication uses append-only integration comments with an operation marker and uncertain-create recovery; it does not claim that Jira comment updates are safe against a human edit. Automatic transition is conditional on a server-enforced guard over status, opt-in, assignee, audience/security and revision. The queue now states the manual handoff when that guard cannot be proven. The review record labels its old hashes and verdicts historical, and clarifies that `f5c28480…` was the queue hash at that time. The queue keeps PR #7's separate reviewed status rather than folding it into D1.

My first pass found the S06 queue wording overstated guarded transition as a committed result. The author changed it to the conditional wording at `docs/delivery-plan.md` S06. A technical review then found the provisional S06 Story still promised a transition without the same condition. The author revised its acceptance, technical criteria and manual QA to require append-only comment evidence and a verified full guard or clear manual handoff. I re-read the Story against the D1 publication gate and queue; its human-visible outcome and agent recovery contract now agree. A second sweep followed an INT ticket from admission through blocker resolution, event receipt, provider send, comment publication, status movement and recovery, then checked readiness claims in the Task, Story and queue. **No unresolved in-scope finding remains.** I found no reason to expand the agreed one-project discovery scope.

## Seven-principle assessment

| Principle | Independent assessment, including human and agent use |
| --- | --- |
| Intuitive | Humans retain familiar board status, label and assignee controls; the queue and S06 Story now say when movement is manual. Agents receive the same eligibility decision through explicit normalized inputs rather than interpreting Jira link labels. |
| Discoverable | The Task names the identity, permission, link and transition evidence still needed by a human operator. Agent inspection is designed to report verified, denied and unknown facts, including incomplete blocker evidence, so the next action is visible. |
| Delightful experience | One reusable connection and a small wake-up event avoid per-ticket bot setup. Append-only comments preserve human edits; uncertain publication goes to operator attention rather than making humans reconcile duplicates. |
| Token saver | Identifier-only events and bounded re-reads keep irrelevant Jira content out of notification traffic. Agents can get decisive eligibility and omission reasons without consuming a full ticket history by default. |
| Secure | The service identity, board/assignee restriction and approved source/result audience gate the flow. Rich webhooks are deferred and unsafe status advancement is blocked; human and agent paths use the same authority checks. |
| Agents are equal | The proposed noninteractive inspection and recovery path exposes the same state that humans see on the board, with structured outcomes. Humans can still move a ticket directly when the server guard cannot support automatic movement. |
| Dependable | Hidden, incomplete or canceled blockers do not disappear from eligibility. Ambiguous comment creation is not retried blindly, and the Story, queue and design agree on manual status handoff when transition safety remains unproven. |

## Evidence boundary

This revision is documentation-only. `git diff --check` passed. No new automated test or Jira live write was run. The selected service identity, actual link configuration, permissions, comment behavior, transition guard and source/result audience still require the authorized D1 checks before S02 or Jira write Stories become ready. This CLEAN verdict applies only to the five hashes above; later edits need their own review.
