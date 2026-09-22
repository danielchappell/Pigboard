# D3 hosted deployment design review

22 September 2026. Two independent Sol reviewers assessed the
[one-team hosting brief](../designs/hosted-deployment-options.md),
[D3 Task](../tasks/architecture-decisions.md#d3--choose-the-first-hosted-deployment-and-team-access)
and [delivery queue](../delivery-plan.md) against the D1, D2 and D4 contracts.
They reviewed the revised design at these SHA-256 values:

| Artifact | Reviewed SHA-256 |
| --- | --- |
| `docs/designs/hosted-deployment-options.md` | `4b37991e5ab9e1e689c00c7f72cbb060433a657b7d619a4d6289006da570c46b` |
| `docs/delivery-plan.md`, before status/review-link bookkeeping | `1d9750907f545b4978975d709d178d0bcc25a1be12ba27aa1dff2843da180cc6` |
| `docs/tasks/architecture-decisions.md` | `d1105548b56ddb86d0aa1fc11510b923cfc47bc38f32e70e019dce06fc9c3650` |

The current delivery-plan hash is
`9714f3917c4acb4de0df25dcacde4cf2b94feb16f25b3afb9dfd1c6f0def8fa7`;
that later change only marks D3's design verdict and links this record. It
does not select a host or authorize spending.

Both first-round verdicts were NOT CLEAN. The product reviewer found
overstated denial across Jira/Cursor and a purported spending ceiling. The
technical reviewer found a more serious point-in-time restore hole: effects
sent after a recovery point could be absent from the restored database, then
duplicated. The author scoped denial to Pigboard, separated provider billing
from launch admission, and made restore fence the old sender and quarantine
the whole connection until the lost-write window is reconciled. Incomplete
evidence keeps sends disabled.

Both independent re-reviews were **CLEAN for the revised three-file design
artifact**. Product coverage: 3/3 changed files, 4/4 D3 acceptance criteria,
3/3 technical criteria, 3/3 testing obligations, and a second sweep of team
access, cost and dependencies. Technical coverage: 3/3 changed files, 5/5
D1/D2/D4/architecture/delivery contract areas, linked primary Render/AWS
documentation and a second sweep of restore, budget and authority. Each
reviewer assessed all seven principles, including different human and agent
inspection paths. No unresolved in-scope design issue remains.

This verdict does not complete D3. The owner has not chosen a paid host,
account, region, team identity, source/result audience, budget or retention.
No infrastructure was provisioned, no live host/store test was run, and no
implementation Story became ready merely from this brief. Documentation-only
changes needed no new tests; relative links and diff whitespace were checked.
