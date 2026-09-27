# D3 selected Fly + Neon Launch design review

27 September 2026. This is independent **design** evidence for [the selected
hosting design](../designs/hosted-fly-neon-launch.md), not a deployment, plan,
committed-code or live-acceptance verdict. The prior Fly Managed Postgres
reviews remain historical for their exact artifacts.

The owner selected one low-cost Fly app Machine and Neon Launch, then reduced
the backup recovery window to seven days with no scheduled snapshots. The
approved 90-day lifetime for minimal post-terminal run metadata is unchanged.

## First round — NOT CLEAN

Reviewed design SHA-256
`4aab26a6dc7295d151b38b227a9b648d4f038cf99dd1bafca71f49ce078c9e56`;
historical-notice SHA-256
`2bb94b3af5047ba63432a2837ccd688deb9c4c256598cbc5eda3cdd1bd6adcb4`.

- Product reviewer: CLEAN for that draft, 10/10 agreed requirements, 7/7 files,
  3/3 inherited contracts, second sweep and independent seven-principle
  assessment. The reviewer identified active-plan and Story updates as
  subsequent work.
- Technical reviewer: NOT CLEAN, 12/12 requirements and 8/8 relevant files
  examined, second sweep and independent seven-principle assessment. P1: no
  concrete current-authority source and durable recovery-marker protocol
  outside the historical restored branch. P2: the Fly 1 GB cost used the
  shared-cpu-4x preset even though a shared-cpu-1x Machine with added RAM is
  cheaper. P2: seven-day PITR was not explicitly limited to within-project
  recovery under the no-snapshot policy.

The author classified all three technical findings as real and in scope.
The design now uses a live-root authority journal and a separate private
GitHub recovery-control manifest with read/write separation and expected-head
updates. Quarantined child data must be reconciled and copied back to the live
root before sends reopen. The starting Fly size is shared-cpu-1x/1 GB with
recalculated estimates and a load gate. The seven-day recovery claim excludes
project/account loss.

## Second round — historical CLEAN for design

Both reviewers independently re-examined selected design SHA-256
`a0d2c5fc79b406952e347a4fe412525f27217253c52b8459a70dda7ec9529925`;
the historical-notice hash above did not change. Neither reviewer edited files
or provisioned resources.

| Reviewer | Coverage and second sweep | Independent seven-principle assessment | Verdict |
| --- | --- | --- | --- |
| Product/experience | 11/11 agreed requirements, 7/7 relevant files, 3/3 inherited contracts; second sweep of recovery, cost, retention and human/agent paths. | Intuitive: ordinary actions remain familiar with plain quarantine language needed. Discoverable: planned setup guide and structured agent errors, still to implement. Delightful: laptop-independent service with honest wake/control delays. Token saver: bounded state with explicit omissions. Secure: separated org, SQL, control grants and physical fence, live proof pending. Agents are equal: noninteractive commands and CLI recovery observation. Dependable: uncertain sends stay quarantined and PITR limit is explicit. | CLEAN |
| Technical/correctness | 12/12 requirements, 8/8 relevant files, all 57/57 selected-design lines; second sweep of original findings, source boundaries, effect admission and recovery. | Intuitive: normal run actions unchanged and blocked states explicit. Discoverable: role/setup checks named, live details gated. Delightful: idle database with accepted wake and control outage tradeoff. Token saver: bounded summaries expose uncertainty. Secure: current authority, manifest grants and physical/provider fence, live tests pending. Agents are equal: scoped noninteractive observation and commands. Dependable: D2 atomic reservations only reopen on reconciled root; no wider disaster claim. | CLEAN |

The subsequent delivery-plan review exposed a dependency cycle: that draft
appeared to require the complete restore drill before S04 even though S29-S31
implement its controls later. The author separated the store/access, hosted
operation and recovery acceptance gates in the design. In that staged-gate
draft (SHA-256 prefix `9a5258`),
the product reviewer was CLEAN, but the technical reviewer was NOT CLEAN:
requiring an external manifest before ordinary S05 effects would have blocked
S05 until S29. A later draft at SHA-256
`b9cb895697973f4626f942af1206d17815c5469563b9b9fa97eaab7f79f742c8`
deferred that manifest gate to S29. The product reviewer found a P1: changing
the Fly database secret could point a pre-S29 revision at a historical child,
despite the absence of an application attachment command. The author added a
separate, reviewed root-endpoint pin and a denial test before S04, while
retaining the trusted custodian's privileged endpoint-reassignment limit.
Historical CLEAN verdicts above do not cover these later hashes.

## Third round — historical CLEAN for exact selected design

Both reviewers independently re-examined SHA-256
`2c3a4ce20f92553dcbb2af00fe48e16ce2992cd771fd2f0eefa8f7ef2cbecbfc`.
Neither edited files or provisioned resources.

| Reviewer | Coverage and second sweep | Independent seven-principle assessment | Verdict |
| --- | --- | --- | --- |
| Product/experience | 13/13 agreed requirements, 8/8 relevant files, 4/4 contract groups; second sweep traced secret swaps, reconnect, release pin, ordinary versus custodian Neon grants, and privileged endpoint reassociation. | Intuitive: ordinary inspect/launch/publish remains familiar. Discoverable: stage and blocked-state guidance is explicit. Delightful: early slices need not wait for a full restore system. Token saver: bounded status retains omissions. Secure: secret swaps and ordinary endpoint moves are denied, while custodian reach is disclosed. Agents are equal: scoped noninteractive commands and recovery CLI remain. Dependable: pre-S29 original-root-only behavior and later manifest/fence/quarantine have distinct guarantees. | CLEAN |
| Technical/correctness | 12/12 requirements, 8/8 files including 56/56 selected-design lines; second sweep checked D2 effects, root pin, Neon endpoint reassociation, S29 transition and A1 gate. | Intuitive: unavailable/quarantine states are explicit. Discoverable: human and agent prerequisites and blocked reasons are named. Delightful: no premature seven-day delay; bounded wake/control outage is accepted. Token saver: status omits irrelevant detail but identifies omissions. Secure: root pin, scoped Neon API grant, D2 transaction and later physical/provider fence, with live proof pending. Agents are equal: scoped noninteractive commands and recovery CLI. Dependable: uncertain effects remain unresolved and PITR is limited to within-project recovery. | CLEAN |

The next delivery-plan review found a P2 dependency wording ambiguity: the
pre-S04 D3 gate could be read as requiring S04's finished cross-process
registered-run inspection and historical-child app denial. The author revised
the design and plan so the prerequisite is a disposable two-client SQL and
endpoint-identity feasibility probe; S04 implements the app pin and inspection,
and S05 tests send denial. The third-round CLEAN verdict above is historical
for its exact hash.

## Current round — CLEAN for gate wording revision

Both reviewers independently examined selected design SHA-256
`bee1a78e9eb548030b599ebd98fcfadbcaf4579c101d10a1fcdb6db9299808ae`.
Neither edited files or provisioned resources.

| Reviewer | Coverage and second sweep | Independent seven-principle assessment | Verdict |
| --- | --- | --- | --- |
| Product/experience | 13/13 agreed requirements, 8/8 files, 4/4 contracts; second sweep traced each pre-Story fact versus implemented behavior and rechecked retention/safety. | Intuitive: normal actions remain familiar. Discoverable: probe and app capability are distinguished. Delightful: S04 does not wait on itself or the seven-day drill. Token saver: bounded status retains omissions. Secure: SQL isolation and later child-read/send denials have distinct gates. Agents are equal: scoped noninteractive commands and recovery CLI. Dependable: D2 reservation and fail-closed restore remain, with A1 live proof still required. | CLEAN |
| Technical/correctness | 12/12 requirements, 8/8 files including 56/56 selected-design lines, 4/4 contracts; second sweep rechecked the dependency path and safety gates. | Intuitive: inspect/launch and quarantine are clear. Discoverable: setup and denial reasons are staged. Delightful: no premature full-restore wait. Token saver: bounded results identify omissions. Secure: scoped SQL and endpoint grants precede S04, with app pin/read denial in S04 and effect reservation/send denial in S05. Agents are equal: scoped noninteractive inspection, launch and recovery paths. Dependable: uncertain sends stay unresolved and seven-day restore remains an A1 claim. | CLEAN |

The full seven-day within-project restore drill remains an A1 acceptance gate;
this design review does not prove live resources or ready S04 implementation.
