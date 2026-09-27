# D3 Fly + Neon Free delivery-plan review

27 September 2026. This records independent **delivery-plan** evidence, not
implementation, hosted checks or acceptance. The [selected Free design](../designs/hosted-fly-neon-free.md)
separately reached CLEAN at SHA-256
`24c9b461146ab1ebe209623759326ad09edfaabe07fd4b86ac85e1c0d2b89ccb`.
The prior [Launch plan review](hosted-fly-neon-delivery-plan.md) is historical
for its own artifact. The owner chose an isolated Pigboard Neon Free project,
one Fly Machine and Free's short measured restore history. The separate 90-day
minimal terminal metadata policy remains unchanged.

## Findings and corrections

The first three-file plan diff, SHA-256
`a199fc233a910d85dfe3e5f2afd15b994c6ba7d5dbd0dc949b37b13d575ec053`,
received a product **NOT CLEAN** and technical **CLEAN**. Product review found
two in-scope P2 gaps: S08 had no explicit health/sleep and Free-quota criteria,
and S06 did not explicitly forbid a Jira write when its durable reservation
fails. The author added those criteria and tests, including S07's quiet polling.

The next diff, SHA-256
`c3ddd0c6adce748952b71f9751237ee0f60bc5a19959f9bc41e13add149ae9c1`,
received a product **CLEAN** and technical **NOT CLEAN**. The technical reviewer
found one in-scope P2 ambiguity: the D3 Task said an expired restore point
stops effects generally. The author clarified that it blocks an attempted
restore or reopen, while an unavailable or quota-exhausted store stops new
effects. Ordinary work on the pinned live root still follows D2 admission.
Each earlier verdict is historical for its exact diff.

## Final round — CLEAN for the exact plan diff

Two fresh Sol reviewers independently examined the restricted
`git diff --binary origin/main` over [delivery-plan.md](../delivery-plan.md),
[architecture-decisions.md](../tasks/architecture-decisions.md) and
[development-roadmap.md](../stories/development-roadmap.md), SHA-256
`c2910a11d7655895f6fe88d901a5fac02314038de85274e72c1d42b9ffe0f0ba`.
The selected design and D2 contract were review context, not part of that
three-file hash. Neither reviewer edited files or provisioned resources.

| Reviewer | Coverage and second sweep | Independent seven-principle assessment | Verdict |
| --- | --- | --- | --- |
| Product/experience | 3/3 changed files, 12/12 touched blocks, 10/10 agreed requirement groups and 6/6 context artifacts; second sweep searched stale Launch, PITR, quota and retention wording and traced S04→S26→S05→S06→S07/S08→S29–S31→A1. | Intuitive: familiar inspect/launch/publish actions and clear blocked status. Discoverable: human prerequisites and agent outcomes are explicit. Delightful: quiet sleep and teammate use avoid needless setup. Token saver: omissions and uncertainty remain visible. Secure: class policy precedes capture and scope/root/effect guards are staged. Agents are equal: scoped noninteractive commands and recovery observation are specified. Dependable: quota and reservation failures close effects; expired PITR only blocks the attempted restore/reopen. | **CLEAN** |
| Technical/correctness | 3/3 changed files, 13/13 technical requirement groups and 2/2 selected D2/D3 contracts; second sweep traced S02→S04→S26→S05→S06→S07/S08→S29–S31→A1 and checked stale Launch claims. | Intuitive: normal sequence and blocked states are clear. Discoverable: setup gates and agent errors are named. Delightful: bounded wake and quiet checks protect time and cost. Token saver: inspection names omitted evidence. Secure: SQL scope, root pin, app grants and recovery fence are distinct. Agents are equal: commands are scoped and noninteractive. Dependable: failed reservations forbid sends and short restore history is reported honestly. | **CLEAN** |

All implementation Stories remain **Provisional — not ready for delivery** until
their own facts, reviewed plans and 20-file, less-than-two-day size checks are
resolved. Pigboard Neon isolation, actual Free quotas, Fly load, provider
authority and restore behavior remain live gates; this plan verdict does not
close them.
