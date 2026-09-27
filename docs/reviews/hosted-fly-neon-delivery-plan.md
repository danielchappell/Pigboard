# D3 Fly + Neon Launch delivery-plan review

27 September 2026. This records independent **delivery-plan** reviews, not
design approval, implementation, hosted checks or acceptance. The selected
[D3 design](../designs/hosted-fly-neon-launch.md) separately reached CLEAN at
SHA-256 `bee1a78e9eb548030b599ebd98fcfadbcaf4579c101d10a1fcdb6db9299808ae`.
The owner chose one Fly app Machine, isolated Neon Launch, seven days of
within-project PITR and no scheduled snapshots; the 90-day minimal terminal
run-metadata policy remains.

## Finding and correction history

The first technical plan review found a P1 dependency cycle: the original
wording appeared to demand a full restored-state drill before S04, while
S29-S31 implement the controls needed for that drill. The author separated
the D3 store/access prerequisite, S08 hosted proof, S29-S31 recovery work and
A1's seven-day restore acceptance. Product review was CLEAN for its exact
earlier artifact; technical review was NOT CLEAN. That verdict is historical.

The next reviewed three-file staged diff, SHA-256
`3f9f36011782c8efb1697ce6fa6dd493e8e0d1ea1fe4440702af98e04748edb9`,
received a product CLEAN and technical NOT CLEAN. The technical reviewer found
one P2 ambiguity: a pre-S04 Task could be read as requiring S04's finished
registered-run inspection and role behavior. The author replaced that
prerequisite with a disposable two-client SQL persistence, uniqueness and
reconnect probe plus endpoint-identity and ordinary-grant checks. S04 now owns
the application root pin, historical-child read denial and complete scoped
inspection; S05 owns child-target send denial. The selected design received
fresh independent CLEAN reviews for this gate change before the final plan
review.

## Current round — CLEAN for the exact plan artifacts

The current review surface is [delivery-plan.md](../delivery-plan.md) at
SHA-256 `08c39f4d06defece8ea0e3f639640754d4cca684cf601567941c7457dbb310a1`,
[development-roadmap.md](../stories/development-roadmap.md) at SHA-256
`1fd8e6b21d09de5421a4feaa2b9afcae25fccf703fc62bf2e52060d23149c626`,
and [architecture-decisions.md](../tasks/architecture-decisions.md) at SHA-256
`769f49575d5dd8f42f3e3003003b495e23dccaf91a29fa91346816f4207f293e`.
The restricted staged diff of these three files has SHA-256
`88068a3c74e55106c7f70b2b85a46d1a1730b3952abd55f7e8130870160e7c3b`.
The design and its review record are context, not part of that three-file
plan-diff hash. Neither reviewer edited files or provisioned resources.

| Reviewer | Coverage and second sweep | Independent seven-principle assessment | Verdict |
| --- | --- | --- | --- |
| Product/experience | 13/13 plan requirements, 3/3 reviewed files, 4/4 context contracts, 6/6 directly affected Story previews plus S08/A1; second sweep traced pre-S04/S05/S08/A1 gates, five-PR order, root/child target, manifest transition and provisional size language. | Intuitive: inspect/launch stays familiar. Discoverable: prerequisites, blocked states and omissions are visible. Delightful: early useful slices do not wait for the recovery drill. Token saver: bounded status includes omissions. Secure: root pin and scoped grants precede the later manifest/fence. Agents are equal: scoped noninteractive inspection and recovery observation. Dependable: child reads/sends are denied in the early slices and full acceptance stays separate. | CLEAN |
| Technical/correctness | 3/3 reviewed plan files, 5/5 context files, 12/12 requirements, 5/5 authority/interface groups; second sweep traced the complete SQL probe → S04 → S05 → S08 → S29-S31 → A1 dependency path, including secret changes and endpoint grants. | Intuitive: ordinary flows stay familiar; recovery wording remains an implementation obligation. Discoverable: stage evidence is explicit. Delightful: S04 no longer waits for a capability it must build. Token saver: bounded status preserves useful omissions. Secure: S04 root pin/read denial, S05 send denial, later manifest/fence and D1/D4 gates are staged. Agents are equal: scoped noninteractive commands and separate role denials. Dependable: uncertain effects and failed proof remain blocked, and A1 does not inherit a plan verdict. | CLEAN |

S29-S31 remain **Provisional — not ready for delivery** until their own
feasibility answers and a ≤20-file, <2-human-day size check. D3 live isolation,
S08 load/teammate operation and A1 seven-day within-project restore evidence
remain open. This plan review does not mark any of them complete.
