# D3r atomic caller rotation design review

28 September 2026. The reviewed [design Task](../designs/pigboard-atomic-caller-rotation.md)
has SHA-256 `70cf92d7e109570e14d3c1f163bf96a3148cda6e77e3704ececf0483fee649ce`.
This is a design verdict only. No D3r implementation Story, SQL migration,
service code, live peer or rotation has been delivered.

Two independent Sol reviewers with complementary product and technical lenses
returned **CLEAN** for that exact artifact. The product reviewer read 177/177
lines, 5/5 substantive sections, 6/6 agreed requirements and 4/4 pertinent
source contracts. The technical reviewer read 5/5 sections, 4/4 protocol
phases, 5/5 feasibility items, 4/4 outcome boundaries and 7/7 principles.
Both made a second sweep of missed failure paths and found no remaining
in-scope design issue. Relevant source checks included repository `AGENTS.md`,
the selected D3e authority boundary and custody findings, S02a's final locked
authorization rule, current authority SQL/owner recovery and the delivery
queue. Partial source inspection is not a committed-code review.

Earlier rounds were **NOT CLEAN** on their exact earlier hashes. At
`dbea6cd65de068384bbccf8cc77bcc111b188e36dc70aea23e8853777633dde2`,
reviewers found missing recipient durable custody, in-flight command ordering,
global-generation collision, inactive-bearer replay authorization and peer
identity ambiguity. At `d184b5e3fc14f10b9df62680ab8706660e071267e00bb71a62019d5322501f87`,
reviewers found an unsound wall-clock completion promise and a pending rotation
that could survive initiating-owner recovery. The final revision requires
protected recipient file durability, dual-bearer activation, recipient-specific
old credential and current initiating-owner checks, exact root-lock
authorization ordering, and owner/current-recipient status without inactive
bearer disclosure. It treats WireGuard as private reach, not as a proven
application identity signal.

| Principle | Product reviewer | Technical reviewer |
| --- | --- | --- |
| Intuitive | Named owner start and recipient activation are understandable; two steps add pilot friction. | Stable recipient key and secure-save-before-activate are clear; manual handoff remains. |
| Discoverable | Human saved-ID/custody recovery and structured agent contracts are identified; exact commands come later. | Targeted status and actionable noninteractive errors are specified as design obligations; commands are still open. |
| Delightful experience | Old access persists through normal transfer; peer setup is disclosed friction. | Handoff avoids a planned outage for both caller types. |
| Token saver | Targeted status names omitted bearer and peer proof. | Request/key status avoids an authority dump and does not imply peer removal. |
| Secure | Dual bearer, current-owner recheck, private route and root lock preserve the agreed boundary. | Recipient possession and owner-recovery invalidation are checked; peer identity is not falsely claimed. |
| Agents are equal | Human and agent recipients get distinct peers/stores and the same noninteractive activation; human owner alone initiates. | Both recipient kinds use the same capability and structured result; owner-only control remains deliberate. |
| Dependable | Durable files, no POST replay and fresh status support recovery; real loss is reported. | Root reconciliation and old/new `/me` checks distinguish outcomes, while lost newly active custody remains an honest interruption. |

The design remains a Task. Before grooming D3r, prove the pending-state SQL and
restricted grants, private peer behavior, concurrency/unknown-commit cases and
a credible complete Story within one PR, at most 20 files and less than two
human working days. D3e's complete owner API remains separately NOT CLEAN on
size and unimplemented. The six ordered product outcomes and live D1/D3/D4
gates are unchanged.
