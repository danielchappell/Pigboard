# D1 Jira connection feedback: technical review

22 September 2026. **CLEAN** for the exact five-file, uncommitted documentation
revision below, relative to `381dcb9382d9d79ccffcf9a264f7be9bd0603039`.
This is an independent technical, security and failure-recovery design review.
It does not close D1's live identity or Jira write gates, approve a Jira mutation,
or review implemented adapter code.

| Reviewed source file | SHA-256 |
| --- | --- |
| `docs/designs/jira-connection-discovery.md` | `2833067e29ebf2e914dfbd3842a583e0017ec36923335e1dd7b93eefe4bb9b94` |
| `docs/tasks/architecture-decisions.md` | `6801f30ce4e6983b9f28bf9e750adf649a7c3afc579958628e3225d546885204` |
| `docs/delivery-plan.md` | `4bb2ca3837ba59cb41fc681c6bfc42dd186aa488e1b174e735ddf2215429d234` |
| `docs/reviews/jira-connection-discovery.md` | `ce64c161f8f080ff59c4ac0b901db0efb702be9aea4e3efc3531770620e7f310` |
| `docs/stories/development-roadmap.md` | `99d3404ef34cf7e0c8713d616868571e614009c2169d6a1efbcd5b83c8798d02` |

## Coverage and finding disposition

I examined **5/5 changed source files**: all 184/184 lines of the D1 design,
34/34 D1 Task lines (39–72), all 254/254 delivery-plan lines, all 41/41 lines
of the historical review record, and the 22/22 provisional S06 Story lines
(140–161) plus the Story catalog's readiness statement. I also checked 2/2
governing sources (`AGENTS.md` and `docs/designs/hosted-work-contract.md`),
1/1 core dependency implementation (`src/core/availability.js`), and 3/3
relevant official Atlassian source areas: the
[issue-link model](https://developer.atlassian.com/cloud/jira/platform/issue-linking-model/),
[comment API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/),
and [admin webhook documentation](https://developer.atlassian.com/cloud/jira/software/webhooks/).
I performed a second sweep through admission, source disclosure, send,
publication, and recovery for incomplete reads or uncertain writes.

All **6/6 PR feedback topics** have a consistent design disposition:

1. The older review verdict is explicitly historical. This review supplies an
   independent, per-principle technical record for the current hashes; a
   complementary product review remains necessary for the combined gate.
2. The design resolves site-specific link type and direction before S02. For
   the usual `Blocks` type, Jira's `inwardIssue` on the candidate is its blocker.
   It maps verified terminal success to `completed` and active, canceled or
   uncertain states to blocking core states. Cross-project, hidden, missing,
   conflicting or incomplete link evidence cannot become an empty dependency
   set. This agrees with `src/core/availability.js`, which permits only
   `completed` blockers to clear eligibility.
3. The queue treats PR #7 as a manual S03 operation and retains the separate
   D4 live gates before hosted S05 send. No stale PR #7 rebase instruction was
   introduced by this revision.
4. Rich admin webhooks are deferred because a project-only filter may deliver
   issue content outside the approved board or source audience. The pilot's
   identifier-only Automation candidate still requires rule-editor, allowlist,
   secret-custody and delivery checks.
5. Progress comments are append-only. A reserved marker/body digest and
   bounded readback can confirm one ambiguous create; uncertain or conflicting
   readback requires attention and never a blind second POST. This preserves
   D2's effect reservation and recovery contract.
6. Automatic transition requires a server-enforced guard covering source
   status, opt-in, assignee, audience/security and issue revision. The design,
   queue and provisional S06 preview all use a manual handoff when that guard
   is unavailable. A fresh `GET transitions` cannot substitute for the guard.

I found no unresolved in-scope technical defect after the second sweep. The
initial stale `current SHA-256` wording and the S06 preview's implied required
transition were corrected and rechecked before this verdict.

## Seven-principle assessment

| Principle | Independent technical assessment |
| --- | --- |
| Intuitive | Humans keep familiar ticket status, label and assignee controls. If automatic status movement is unsupported, the ticket receives a clear manual handoff; the agent gets the same outcome as a structured state. |
| Discoverable | Identity preflight distinguishes verified, denied and unknown grants and mappings. S02 must explain the precise blocker or unreadable input to human and agent callers; those diagnostics are designed, not implemented here. |
| Delightful experience | One identifier-only wake-up rule avoids ticket-by-ticket bot reassignment. Operator attention after an ambiguous comment is necessary to avoid duplicate visible output. |
| Token saver | Bounded eligibility output should lead with decisive facts and identify incomplete pages or hidden evidence, so an agent need not infer eligibility from a large raw Jira payload. The future adapter must verify that behavior. |
| Secure | One-project binding, selected service identity, source/result audience, cross-project blocker handling and pre-send recheck gate disclosure and compute. Rich webhook payloads are deferred. Owner audience approval and the residual race after provider send remain explicit live decisions. |
| Agents are equal | A noninteractive inspection and recovery path is specified alongside the human Jira view; neither relies on an interactive prompt or a bot assignee. S02 and later hosted commands must implement these structured outcomes. |
| Dependable | Missed events get a bounded scan; partial dependency reads block launch; ambiguous comment creation is not replayed; unsupported transition guards leave manual work instead of claiming success. Queued, partial and failed outcomes stay distinct. |

`git diff --check` passed for the reviewed tree. This documentation change needs
no new automated test. D1 still needs identity-scoped REST evidence, verified
link and blocker mapping, a controlled comment write/readback check, and
transition capability evidence before its dependent Jira write Stories are ready.
