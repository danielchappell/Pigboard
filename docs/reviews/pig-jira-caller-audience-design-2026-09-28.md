# D1 caller-audience design review

28 September 2026. Two fresh independent Sol reviewers found the final D1
design revision **CLEAN**. This is a design and delivery-dependency verdict,
not a code, Jira API, credential, or live S02b acceptance verdict.

| Reviewed artifact | Exact SHA-256 |
| --- | --- |
| [D1 design](../designs/pig-jira-connection-discovery.md) | `da187abf64b4c418e32587cd9e8c1492cb2c4a59dc9c0a0f7c60f661d633bed2` |
| [Delivery plan](../delivery-plan.md), D1/S02a/S02b/S04 and principles | `7b29bc42bf25a751c3ac732a1820140c8718da55b4c793ad069579ee34655442` |
| [Caller-audience Task](../tasks/pig-jira-caller-audience.md) | `216754398314e3a813cc694012562d4d8733fc38d134485f8a0a2aa5643cf590` |

The product reviewer examined 3/3 artifacts and 8/8 review areas: D1 identity
and metadata, S02a selection and correction, S02b selected-issue access, linked
blockers, S04 import and disclosure, S05/S06 handoff, human/agent journeys, and
Task/readiness/documentation clarity. Their second sweep traced every audience,
blocker, unavailable, eligible, and S02a/S02b/S04 reference. No in-scope finding
remained. The technical reviewer examined 3/3 files and 643/643 lines, then
rechecked every audience, blocker, security, S02b, S04 and S05 reference. No
in-scope finding remained.

Earlier exact revisions were **NOT CLEAN**. Both reviewers confirmed that a Jira
service-account read alone did not prove an individual Pigboard caller's issue
audience, and S04 omitted its S02a pair dependency. Those were corrected with a
focused discovery Task and explicit dependency. The next technical review found
that an in-project linked blocker could have a narrower audience than the
selected issue. The final revision requires separate current caller-audience
proof before reading or disclosing each blocker's status or body. An unproved
blocker remains unknown and blocks eligibility without exposing its ID, status
or count. S05 applies the same rule before send. Neither earlier CLEAN verdict
was reused for these changed artifacts.

The product review's seven-principle assessment: **Intuitive:** named pair
selection and the existing label remain familiar, while S02b stays gated.
**Discoverable:** humans get named choices and agents stable IDs; the Task names
the missing proof. **Delightful experience:** one saved pair avoids repeated
setup, with deliberate owner approval. **Token saver:** decisive facts follow
access checks; generic denial reveals no restricted blocker detail.
**Secure:** selected and linked issues each need caller-specific proof.
**Agents are equal:** the Task must cover a noninteractive agent without an
invented Jira user. **Dependable:** unknown blockers stop eligibility, and a
saved pair or imported run creates no launch authority.

The technical review's separate seven-principle assessment:
**Intuitive:** guided selection and generic unavailable avoid a false eligible
result. **Discoverable:** human choices and structured agent errors identify
safe recovery; the live audience rule is still open. **Delightful experience:**
the pair remains saved and an unauthorized read stops once. **Token saver:**
minimal internal fields and explicit omissions avoid linked payload dumps.
**Secure:** app grants, service visibility, selected-issue audience and each
blocker's audience are distinct checks. **Agents are equal:** a future rule must
work noninteractively without assuming an agent has a Jira identity.
**Dependable:** unknown or partial blocker evidence closes eligibility and
S05; historical design evidence stays distinct from live proof.

The Scubapig OAuth credential is staged but uncreated. The existing human UI
board `35` and filter `10034` are correction fixtures, not service-identity
proof. Jira's [bulk permissions API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-permissions/)
requires global Administer Jira to check another user from this service-account
model. The [issue-security members API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-security-level/)
returns only classic-project members and also requires global administration;
PIG is team-managed. These facts narrow the Task's options, but the caller
audience rule remains undecided and unproved. No global Jira administration was
granted or requested. S02a and S02b remain provisional pending their distinct
service-identity, authority, implementation-size and live gates.
