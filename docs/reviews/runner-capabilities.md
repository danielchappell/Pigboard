# D4 runner design review record

22 September 2026. These are design reviews of
[runner-capabilities.md](../designs/runner-capabilities.md) and its
[delivery-queue update](../delivery-plan.md). They do not approve PR #7 code,
prove live provider access, or promote S03/S26 to ready Stories.

| Round | Exact artifacts | Product review | Technical review |
| --- | --- | --- | --- |
| Initial | D4 SHA-256 `64a776c66d565c582f3f701a92cf1752d28ea718da94172c23478f55f9bab743` | NOT CLEAN: choose PR #7 disposition and correct read-only gate. 7/7 surfaces, second sweep, seven principles assessed. | CLEAN on that old artifact only. 9/9 surfaces, second sweep, seven principles assessed. |
| Revised | D4 SHA-256 `8f03cca4ab437a5fa3b3cfb0fddbc9a4b232df6169407edc16c3eccf032e88db`; queue SHA-256 `b86d5c11ff46dd97ff142b69ab824f1306a79f6025139820ec13a28a89667a66` | NOT CLEAN: the linked review record was missing. Both prior P2 causes are fixed. 8/8 surfaces, second sweep, seven principles assessed. | NOT CLEAN: hosted S03 start preceded S04/S05 durable ownership. D4 135/135 lines, queue 229/229 lines and all named contracts, second sweep, seven principles assessed. |
| Third | D4 SHA-256 `8759a828a35c339354b4838c5430c49ceb7fdfcb7689d07c6e709cc40aeea485`; queue `3353d6a28bb3a88562d472a295349bdeb1db00d89f8d10cb27657d993c59900d`; Story previews `44d6947efe514a6b3d98b82406335b198e92e975a4700589fa994205a5ef33b3`; this record before verdict entry `0bc8a335a9baa5f60dda2962877d95b6e22aa2a62d52a7794f88c68b5e4145b4` | CLEAN: 11/11 agreed surfaces, complete artifact/requirement walk, second sweep and independent seven-principle assessment. | CLEAN: 4/4 primary and 9/9 supporting surfaces, second sweep and independent seven-principle assessment. |

The product reviewer checked the D4 Task, full design and queue, D2 runner and
authority contract, M2 goal, and PR #7 Story, plan, and targeted source. The
technical reviewer checked the design, repo instructions, D2 contract, D4 Task,
queue dependencies, PR #7 Story/plan/source/guide, and official Cursor docs.
Each reviewer assessed all seven principles independently. An old CLEAN verdict
does not cover a revised artifact.

The product finding was resolved by this record's creation. The technical
finding led to the revised S03-S05 order: PR #7's manual command, then shared
inspection of an existing run, then the first hosted send after durable attempt
and send intent. Both reviewers found that ordering consistent in the design,
queue and provisional Story previews. They confirmed that plan mode is not a
source-write permission control and that a disposable-repository trial cannot
prove read-only operation against a real source repository. The product review
covered D4 lines 1-141, the queue 1-230, the affected Story previews plus the
catalog dependency sweep, this record and seven supporting surfaces. The
technical review covered D4 141/141 lines, queue 230/230, this record 22/22,
the Story catalog's affected sections and full dependency sweep, and nine
supporting surfaces. Both assessed all seven principles for human and agent use.
No in-scope finding remains on the third-round artifacts.

After the verdicts, the queue's status lines alone were updated to record
"design CLEAN; live gates open"; its resulting SHA-256 is
`3b2d193a3b82d3f706c3b468e04246fa69427188a54560d6521f6e4f0cf0b6c5`.
This record was updated with the verdicts. Neither metadata update changes the
reviewed design or the Story boundaries; both reviewers confirmed that limited
assertion against the final queue and record in separate CLEAN metadata-delta
reviews, with full changed-file coverage and a second sweep. Repository
permissions, second-user visibility, meaningful-work authority and PR #7's
retrospective/code reviews
remain open and are not implied by design CLEAN.
