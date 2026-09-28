# D1 send-time audience follow-up review

28 September 2026. Two fresh independent Sol reviewers found the design and
delivery correction **CLEAN** for the five substantive document revisions below.
This is a design review. It does not choose or prove the live caller-audience
rule, create a Jira credential, or make S02b or S05 ready for delivery.

| Reviewed artifact | SHA-256 at design review |
| --- | --- |
| [D1 design](../designs/pig-jira-connection-discovery.md) | `8f1c724a79256cf958ae643b4b66c1bb68edd30b06eb619872067e46838553a4` |
| [Neon Free design](../designs/hosted-fly-neon-free.md) | `09f1c24384cfb050c034d0d6503420546276de6f0b4b9a2a0443bb1bba70236b` |
| [Delivery plan](../delivery-plan.md) | `d3cb0abe75df5e9bb0a505725ba9b75f835759deaf6e68ccc30c24b3f2457cfc` |
| [D3 Task](../tasks/architecture-decisions.md) | `b52882543492e9e6cacda52aa578ef59f4a9a88e0eaedfbec670c44fae71a0ea` |
| [S05 Story preview](../stories/development-roadmap.md) | `dfb3b055764bc292989fe5c58ba741689429776c5c8b11c42eeab3416d8eeee8` |

The review addresses two valid comments posted after [PR #28](https://github.com/danielchappell/ski-stack/pull/28)
merged. [The first](https://github.com/danielchappell/ski-stack/pull/28#discussion_r4118038250)
found that S05 had not explicitly re-proved the selected issue's current,
caller-specific audience before a rich read and send. [The second](https://github.com/danielchappell/ski-stack/pull/28#discussion_r4118038254)
found that S02b readiness could be read as satisfied by Jira service metadata
and an app grant without the D1 caller-audience Task. The correction makes the
live caller-specific rule a separate S02b gate and requires S05 to re-prove
the initiating caller's current grant and selected issue audience at send time.
Each in-project blocker remains separately guarded. Denied or unknown selected
audience gives generic unavailable before rich read, reservation or send.

The product reviewer examined 5/5 modified documents, 30/30 changed lines and
6/6 requested areas: S05 selected issue and blocker proof, separation from
Cursor disclosure, S02b service metadata versus caller proof, readiness,
and the human/agent journey. A second sweep searched all five documents for
audience and readiness contradictions and checked links. There were no
unresolved in-scope findings. The technical reviewer independently matched
all five hashes, examined 5/5 documents, 30/30 changed lines and 7/7 contract
areas: S05 sequence, app grant, selected issue, blockers, provider disclosure,
denial/races, and readiness/tests. A second cross-document terminology sweep
found no in-scope issue. Both reported `git diff --check` clean.

The product review's seven-principle assessment: **Intuitive:** inspection
followed by an explicit start remains familiar, and lost access has a generic
outcome. **Discoverable:** the D1 Task names missing human and agent setup.
**Delightful experience:** no repeated issue-ID entry or leaked partial launch.
**Token saver:** concise denial with no restricted ticket facts.
**Secure:** current app and issue access are re-proved before rich read and
effect reservation. **Agents are equal:** noninteractive scoped agents are
covered without an invented Jira user identity. **Dependable:** stale S02b
inspection cannot authorize a send and an unknown audience closes it.

The technical review's separate assessment: **Intuitive:** generic unavailable
does not imply eligibility. **Discoverable:** both human and agent paths retain
actionable safe recovery while restricted facts stay hidden. **Delightful
experience:** only the necessary send-time reproof is added. **Token saver:**
minimal lookup stays internal and denial is bounded. **Secure:** selected issue,
blocker, app grant and Cursor disclosure are distinct checks. **Agents are
equal:** the noninteractive rule remains a required D1 decision. **Dependable:**
unknown blockers, changed authority and the residual Jira read race are named;
live proof remains a gate.

After this design review, the delivery-plan introduction and D1 status were
updated to record the active goal and link this review. Those bookkeeping edits
are not included in the design-review hash above. The final committed revision
requires its own independent exact-commit review before a PR.
