# D4 runner design review record

22 September 2026. The D4 rounds below are design reviews of
[runner-capabilities.md](../designs/runner-capabilities.md) and its
[delivery-queue update](../delivery-plan.md). They do not prove live provider
access or promote S26 to a ready Story. PR #7 has separate retrospective plan
and committed-code review evidence below.

| Round | Exact artifacts | Product review | Technical review |
| --- | --- | --- | --- |
| Initial | D4 SHA-256 `64a776c66d565c582f3f701a92cf1752d28ea718da94172c23478f55f9bab743` | NOT CLEAN: choose PR #7 disposition and correct read-only gate. 7/7 surfaces, second sweep, seven principles assessed. | CLEAN on that old artifact only. 9/9 surfaces, second sweep, seven principles assessed. |
| Revised | D4 SHA-256 `8f03cca4ab437a5fa3b3cfb0fddbc9a4b232df6169407edc16c3eccf032e88db`; queue SHA-256 `b86d5c11ff46dd97ff142b69ab824f1306a79f6025139820ec13a28a89667a66` | NOT CLEAN: the linked review record was missing. Both prior P2 causes are fixed. 8/8 surfaces, second sweep, seven principles assessed. | NOT CLEAN: hosted S03 start preceded S04/S05 durable ownership. D4 135/135 lines, queue 229/229 lines and all named contracts, second sweep, seven principles assessed. |
| Third | D4 SHA-256 `8759a828a35c339354b4838c5430c49ceb7fdfcb7689d07c6e709cc40aeea485`; queue `3353d6a28bb3a88562d472a295349bdeb1db00d89f8d10cb27657d993c59900d`; Story previews `44d6947efe514a6b3d98b82406335b198e92e975a4700589fa994205a5ef33b3`; this record before verdict entry `0bc8a335a9baa5f60dda2962877d95b6e22aa2a62d52a7794f88c68b5e4145b4` | CLEAN: 11/11 agreed surfaces, complete artifact/requirement walk, second sweep and independent seven-principle assessment. | CLEAN: 4/4 primary and 9/9 supporting surfaces, second sweep and independent seven-principle assessment. |

The current PR #11 feedback round addressed all four live review threads together:
uncertain `409`/lost replies remain unbound and need attention, D4-design and
D4-live are separate, the D4F fallback is conditional on failed read-only or
source binding, and S04 imports without actual-commit proof stay inspection-only.
D4L now owns per-run source evidence and live evidence for the exact S05 hosted
connection, repository and permission policy. Two fresh independent Sol
reviewers returned CLEAN for the revised seven-file feedback artifact against
`ea78c6d7c30a5750d84f525b9980eccb9f053930` (path/content SHA-256
`5746276a3e5b6c6a1fbf29a1a07e58e56c0823810dac10ffd060f21116cbf29d`).
The product reviewer checked 7/7 files, 4/4 comments, D4L's 6/6 acceptance,
3/3 technical and 3/3 testing criteria, the affected delivery dependencies,
and all seven principles with a second sweep. The technical reviewer checked
7/7 files, 4/4 comments, 3/3 earlier findings, 5/5 D2 runner operations,
6/6 affected delivery dependencies, all D4L/D4F criteria, and all seven
principles with a second sweep. No in-scope design finding remains; these
verdicts do not establish live provider access or approve a release.

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
permissions, second-user visibility and meaningful-work authority remain open
and are not implied by design CLEAN. PR #7's reviews were open at that
third-round design snapshot; their later evidence is recorded separately below.

## PR #7 retrospective and committed-code evidence

The [product/documentation review](cursor-cloud-job-product.md) and
[technical/security review](cursor-cloud-job-technical.md) are the two distinct
reviewer-authored records for the exact PR #7 head. The standalone Cursor [Story](https://github.com/danielchappell/ski-stack/blob/da2fc8ccc0cdc4cd0493c16691d286309f513c9f/docs/stories/run-cursor-cloud-job.md) and
[implementation plan](https://github.com/danielchappell/ski-stack/blob/da2fc8ccc0cdc4cd0493c16691d286309f513c9f/docs/plans/cursor-cloud-job.md) were reviewed
retrospectively at `da2fc8ccc0cdc4cd0493c16691d286309f513c9f`.
Two fresh independent Sol reviewers separately returned CLEAN for the plan:
each examined both primary artifacts, all 8/8 Story acceptance criteria,
7/7 technical criteria and 4/4 testing requirements, with a second sweep.
This did not turn retrospective review into prior approval.

The same two reviewers separately returned CLEAN for the exact committed PR
diff at `da2fc8c` against `005419b63460540bfbb96400c46e7274a47af723`:
12/12 changed files, 8/8 Story acceptance criteria and 7/7 technical criteria
were examined, followed by a second file/contract sweep. The technical review
also counted 4/4 testing requirements. Both reviewed the three-file feedback
commit separately. Focused tests passed 22/22, the full suite 239/239, and
`git diff --check` passed. No new live Cursor run or hosted CI check occurred.
The current Cursor endpoint reference documents List Runs; that path still has
mocked-only coverage. The provider's `FINISHED` response now needs a nonempty
reply. This evidence supports the standalone manual S03 code, not D2's hosted
binding, a repository grant, or meaningful-work acceptance.

| Principle | Product reviewer | Technical reviewer |
| --- | --- | --- |
| Intuitive | Prepare/start/get and run-level status make the manual journey clear. | Exact saved IDs and status checks prevent a follow-up from silently replacing the intended run. |
| Discoverable | Help, model listing, examples and the guide explain normal use and same-ID retry. | JSON error codes and retained IDs identify what an agent or operator can inspect next. |
| Delightful experience | Reusing a saved ID avoids asking a person to repeat setup or a paid prompt. | Uncertain creates do not trigger a second POST; read-only observation can recover visible work. |
| Token saver | Direct retrieval and bounded run listing avoid extra model calls. | Deterministic validation and exact-run reads avoid model-based recovery decisions. |
| Secure | The guide warns that plan mode does not enforce read-only source access. | Fixed API origin, rejected redirects, request shape and key redaction limit credential exposure. |
| Agents are equal | Human examples and the Cursor URL coexist with an exported library and JSON CLI. | Structured noninteractive errors, results and exit codes support agent callers. |
| Dependable | A finished turn is not human acceptance; unresolved work retains its original ID. | Missing/blank finished replies, malformed IDs and ambiguous follow-ups fail closed. |

Reviewers found no in-scope defect in the final standalone diff. Their CLEAN
verdicts do not override the separate D4 live access gates or the stricter
provider-binding rule for hosted attempts.

## Imported-run format and source gate correction

On 27 September, two fresh independent Sol reviewers examined the imported-run
provenance revision at `a8aa7b7045677c8805d8de596c4dd65e7670b8cb`
(D4 file SHA-256 `79bf36bccd1b9e1deb251bca7b94030a1a148d709b2f85828174ef39d1b703a0`).
Both returned **NOT CLEAN**: the D4 design allowed S26 to check an
audience-authorized moving-ref import's output format, but the delivery queue
made D4-source a blanket S26 dependency and the S04 preview used “validated”
without separating format from ticket acceptance. The product reviewer covered
the D4 design 1/1 and four affected artifacts 4/4 with a dependency second
sweep. The technical reviewer covered 8/8 named surfaces with a provenance
and disclosure second sweep. Each assessed all seven principles independently.

The first, unpublished correction commit
`4e9de6f31594b27a4c50e5c1888723f982f90e14`
received two fresh **NOT CLEAN** reviews: the D4L Task still stated the old
blanket gate. Both covered all 3/3 changed files, the affected contracts and
all seven principles, then made second sweeps. The author amended it to
`b962618281c4a3a611fba1d598f9e97dac77a66d`, correcting D4L as the fourth
file. Two new independent Sol reviewers returned **CLEAN** for that exact
commit. Product review covered 4/4 changed files and 9/9 relevant contracts;
technical review covered 4/4 files and 8/8 requirements. Both made a second
cross-artifact sweep and independently assessed all seven principles.
The amended-away commit is not an ancestor of this PR, so it is preserved by
the [review-evidence tag](https://github.com/danielchappell/ski-stack/commit/4e9de6f31594b27a4c50e5c1888723f982f90e14).
The remote tag `review-evidence/d4-first-correction-20260927` peels to that
exact commit; its tree is `2b28ccd9533447cc7f2f9427678396364f2a612c`.
Readers can inspect the historical three-file diff without treating that
rejected revision as approved.

The reviewed rule is: prove exact-run original audience and current disclosure
before any provider status or result read. Within that audience, S26 may record
a format-valid but unbound result without D4-source. That result remains
nonpublishable. Validated ticket work and publication require the actual
checkout commit for the same run, independent original-request binding and
the later trusted S05 launch record. The S02a → S02b → S04 → S26 → S05 → S06
order is unchanged. This is documentation evidence, not a Cursor account grant,
live origin proof, running service or completed Story.

GitHub's hosted review of PR #23 at `5898656f4c1bee13a7b4042d86fb1d46c0738c84`
found two in-scope P2 gaps. It could not inspect the amended-away first
correction commit, and D2/S06 still described `valid` output without the
separate binding guard. The tag above preserves that historical artifact.
The [D2 contract](../designs/hosted-work-contract.md) now records format and
the three binding facts separately, and S06 requires all of them before a
Jira write. These are design and provisional-Story corrections; no code or
live gate changed. Fresh review of this feedback revision is still required.

| Principle | Author assessment of this feedback revision |
| --- | --- |
| Intuitive | A format-valid answer is described as nonpublishable until the exact work it answers is proven. |
| Discoverable | D2 and S06 name the missing launch, request and source facts for humans and agents. |
| Delightful experience | Authorized people can inspect an imported result without a repeated run while publication stays safely withheld. |
| Token saver | Separate format and binding facts explain the outcome in one inspection. |
| Secure | A Jira write requires the trusted launch, original request, actual checkout commit and current scope. |
| Agents are equal | The same publish guard applies to human and noninteractive callers; their presentation can differ. |
| Dependable | An unbound import cannot be silently treated as ticket work, and an amended-away review artifact remains auditable. |
