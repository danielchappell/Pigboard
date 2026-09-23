# PR #13 Fly hosting feedback: independent technical review

23 September 2026. **CLEAN** for the five-file uncommitted design revision on base `346bf19aadf2f32f6822019a343c7e412a32b678`. This is a design and delivery-map verdict, not completion of D3, approval to provision paid resources, implementation acceptance, or a live restore result.

| Reviewed artifact | SHA-256 |
| --- | --- |
| `docs/designs/hosted-deployment-options.md` | `df6e77cd1fa193bd58871861b8c5860c4f320efe91ec599e666fda6cfc92385a` |
| `docs/tasks/architecture-decisions.md` | `dc5d9b955473261971883e18ba6f61d45cbe3efbb915137149a5c0cb288753d6` |
| `docs/stories/development-roadmap.md` | `e9dd3e6a7efecfceb4b874370520bd219a8278228934efd4b1360ae1bc6bfcf0` |
| `docs/delivery-plan.md` | `28dff3da3023bd1b71b7952d6c79afd92a2af06b8b7dc835b2bc9e9b247a26a0` |
| `docs/reviews/hosted-deployment-options.md` | `fbf587a65fb5925e0332f9b955ede182fec7353fbad68b28e08b8a720b188797` |

## Coverage and findings

I examined 5/5 changed files and the current diff; D3's 4/4 acceptance, 5/5 technical and 3/3 testing obligations; A1's 7/7 acceptance, 3/3 technical and 3/3 testing obligations; and S29-S31's 9/9 acceptance, 6/6 technical and 9/9 testing items. D3's five technical checks cover no paid provisioning or access expansion, one service/worker/team, fail-closed effect and access reconciliation, verification of Fly credentials and the external recovery grant against the role matrix, and verification of current Fly facts from official documentation. I compared the revision with the D1 Jira, D2 durable attempt, D4 runner and product architecture contracts (4/4 context areas) and the repo guidance. A second sweep traced every recovery actor and command through the role matrix, S29-S31, A1 and the delivery queue, then checked stale access, deploy overlap, unknown effect windows, retention, provider credential revocation, cost and historical review claims. `git diff --check` passed. No in-scope finding remains.

The revised design closes the five reported PR feedback topics. Restore now requires an out-of-database marker and expected target before attachment; every Fly Machine checks recovery state before effects, including restart and deploy overlap, while an old sender must be fenced. S30 distinguishes exact known effects from an unknown or unbounded lost-write window; S31 cannot reopen under incomplete evidence and obtains current roles, revocations, credentials and connection scope outside restored state. A separately authorized recovery principal owns entry, evidence and cutover. The command matrix denies ordinary recovery authority to viewers, operators, connection administrators and scoped agents; the proposed Fly machine-exec token is explicitly insufficient by itself. Source content, prompts, raw output, evidence, metadata, backups and restored copies each require an approved retention rule. Revoked provider credentials block authenticated reads and recovery as well as sends.

Fly's official documentation supports the stated platform facts: [Managed Postgres](https://fly.io/docs/mpg/) provides backups, high availability and pooling with Basic priced at $38/month plus storage; [restore](https://fly.io/docs/flyctl/mpg-restore/) creates a separately billed new cluster; [first deploy](https://fly.io/docs/launch/deploy/) may create two Machines; and [token scopes](https://fly.io/docs/security/tokens/) include app-scoped deploy and machine-exec tokens. Actual organization, plan, identity, budget, retention, recovery-grant mechanism and live verification remain D3 gates. S29-S31 are correctly provisional pending file/day sizing and implementation-plan review. A1 requires their completed outcomes and a real restore drill; S25 remains the later multi-team extension.

## Seven principles

| Principle | Independent assessment |
| --- | --- |
| Intuitive | Humans keep Jira as the work surface and see ordinary status and next action; the rare restore has named actors and explicit blocked states. Agents receive corresponding structured states. |
| Discoverable | Human setup/inspection and agent command responses expose missing identity, credential, evidence and recovery prerequisites before effects. D3 still must settle concrete onboarding. |
| Delightful experience | One hosted service avoids laptop-dependent coordination; fail-closed manual recovery is proportionate to duplicate-send and stale-access risk. |
| Token saver | Bounded summaries with exact identities, omission and uncertainty indicators avoid full-history retrieval and misleading terse success claims. |
| Secure | Scoped application roles, separate external recovery authority, pre-attachment quarantine, current-access reconciliation and explicit command denials cover ordinary and restored state. Fly token scope remains a verification gate, not assumed enforcement. |
| Agents are equal | Scoped noninteractive inspection, launch and reconciliation grants use the same checks as human commands; an ordinary agent cannot gain recovery or credential authority. |
| Dependable | Durable intents, old-sender fencing, an unknown-window quarantine path and an A1 restore drill make completed, uncertain and blocked outcomes explicit. No backup is presented as safe recovery without effect and access evidence. |

This review did not fetch GitHub PR comments because the GitHub API was unavailable. It assessed the five reported findings supplied with the review request and the exact local artifact. No infrastructure was provisioned or live provider write performed.
