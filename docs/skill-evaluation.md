# Check whether a skill change helps

Pigboard's evaluator freezes a comparison, retains independently graded run
evidence and reports gains, regressions and missing results. It can compare one
skill or a complete configured system. It does not run models or infer quality
from how a skill is written.

There are three separate checks:

| Check | What it establishes |
| --- | --- |
| `npm test` | Package, contract and deterministic framework checks pass |
| A recorded scenario | The supplied host and independent graders observed the stated result |
| A matched comparison | The candidate performed differently under the same declared conditions |

The importer checks record consistency and evidence hashes. It cannot authenticate
an operator's claim or decide whether arbitrary grading prose is true. Use a
prepared host and independent evaluators; keep their original receipts. No score
or green command authorizes a merge, release or activation.

## Try the complete local control

From a source checkout with Node 20+ and dependencies prepared:

```sh
npm ci --ignore-scripts --no-audit --no-fund
node evals/reuse-parser/control.mjs /tmp/pigboard-eval-control
node scripts/evaluate-skills.mjs compare /tmp/pigboard-eval-control/comparison
```

Choose a new output directory each time. The control copies a small existing
parser and CLI, applies a known reference correction and runs real public tests
and an outside evaluator. The original fails the requested delimiter behavior;
the corrected version passes while preserving the old comma/quoting contract.
It records both attempts through the same CLI used for real evidence.

Expected output: `kind: synthetic_control`, `direction: PROMISING`,
`qualification: PASS`, two planned/recorded attempts and an explicit statement
that no model performance was measured. A failed control is a framework or fixture
problem to fix before model trials, not a reason to relabel its result.

The output contains complete example campaign/packet JSON, retained source files,
actual test output, grades, receipts and the report. Inspect `campaign-input.json`,
`packet-baseline/packet.json` and `packet-candidate/packet.json` to learn the format.
These are synthetic examples, not reusable model results.

To replay the behavior checks while the control subjects are retained:

```sh
node --test /tmp/pigboard-eval-control/candidate/test.mjs
node evals/reuse-parser/private/grade.mjs /tmp/pigboard-eval-control/baseline
node evals/reuse-parser/private/grade.mjs /tmp/pigboard-eval-control/candidate
```

The baseline grader intentionally exits 1; the candidate exits 0. The private
grader must stay outside any evaluated agent's workspace. Later real scenarios
need their own reproducible probes and grading instructions. `compare` rechecks
stored evidence; it does not rerun a model or regrade a result.

## Prepare a real comparison

Use the [scenario plan](evaluation-scenarios.md) and a reviewed campaign. Freeze
requirements and grading before running either version. Record the exact bundle
or system snapshot, not just the changed SKILL.md: shared rules, tools and review
prompts can affect results. A full source revision plus a digest of the prepared
snapshot makes that boundary clear.

Keep the same task, fixture state, environment, model/effort settings, tools,
review policy, rubric and limits for both versions. Vary only the declared skill
or system treatment. A bundled change measures the bundle; it does not isolate
which sentence caused the result. Changes to any frozen condition require a new
campaign, not edits to an existing one.

The [versioned schema](../contracts/evaluation-v1.schema.json) defines every field.
All objects are closed: required keys must be present, with explicit nulls where
allowed. Input is bounded JSON; duplicate keys and unknown fields are rejected.

| Campaign field | Meaning |
| --- | --- |
| `kind`, `unit` | `model` or `synthetic_control`; `skill` or `system` |
| `baseline`, `candidate` | Exact source revision and SHA256 of each distinct prepared snapshot |
| `profile`, `environment` | Digest and readable description of shared model/role/tool settings and environment |
| `limits` | Finite wall milliseconds and total model tokens across all roles |
| `cases` | Stable IDs, split, fixture/task/grader/rubric hashes, expected outcome, repetitions and minimum successes |
| Case `assertions` | Exact graded IDs, behavior/integrity kind and whether every repetition must pass |
| Case `dimensions` | Optional separately scored quality dimensions; no weighted total |
| `graders_required` | One or two independent assessors, chosen before execution |

Use full Git commit IDs or `sha256:` identities for revisions, and `sha256:` plus
64 lowercase hexadecimal digits for digests. Compute hashes from the actual
artifacts. Use canonical record hashes returned by the CLI for campaign/packet
binding; evidence hashes cover raw bytes. Retain the inputs those hashes describe.

```sh
node scripts/evaluate-skills.mjs prepare campaign.json /tmp/pigboard-comparison
```

This creates the scheduled baseline/candidate slots before execution. It refuses
an existing destination. The source-only evaluator is not copied into an installed
customer skill bundle. Run it from this prepared checkout; it has no installed
`work-validator` alias or model-provider dependency.

## Run with a prepared host, then record evidence

The host owns actual execution, isolation, role/model verification and budget
enforcement. Select and verify that binding before paid trials; the intended
model name is not an invocation receipt. No automatic fallback is permitted in a
matched comparison. This CLI neither creates a sandbox nor enforces model spend.

Give the evaluated agent only its public task, fixture and selected skills. It
must not be able to write the campaign, private grader, scoring expectations or
evidence store. Independent graders assess observable artifacts and actions;
the evaluated agent's self-score cannot supply the independent grade. Use two
assessors for ambiguous judgments and retain both initial reports and their
resolved evidence-based result. Do not collect private chain-of-thought.

Create one packet per actual attempt, including interrupted and unsuccessful
attempts. The generated control packets show the complete structure:

- `run_id` is a globally unique UUID; `case`, `repetition` and `arm` identify its
  frozen slot. `binding` must match all seven campaign identities exactly.
- `status` distinguishes completion, incomplete collection, infrastructure failure
  and budget exhaustion. `outcome` names a completed change, correct block or
  dependency wait. A missing observation is null, not an invented success.
- `host` records the actor, verified profile, enforced budgets and receipt. Use
  null when unavailable. The receipt must describe the actual settings and controls.
- `graders` identify independent assessors and reports. Their IDs must differ from
  the evaluated actor. An empty list preserves an ungraded attempt as incomplete.
- Every prescribed assertion appears once with PASS, FAIL or INCOMPLETE and
  evidence. Quality dimensions use scores 0–3 with reasons/evidence; inapplicability
  needs a reason and evidence, not a zero score. Unknown applicable scores are null.
- A completed change needs `result_revision` and passing `author_verification`
  evidence bound to that revision. Independent grading does not replace the
  author's checks. Correct stops need their own prescribed assertions; they do not
  require a result revision or PASS author check. An explicit author FAIL prevents
  success for every outcome, including a block or dependency wait.
- `metrics` records actual wall time and total tokens, including review/fix rounds.
  Unknown values stay null and prevent complete qualification.
- `evidence` lists IDs, relative regular-file paths and raw SHA256 digests. Preserve
  final source/diff, outputs, commands, environment, model/role receipts, graded
  observations and a usable replay recipe. Reference evidence by ID throughout.

Quality anchors: 0 means a demonstrated serious miss; 1 a material avoidable
weakness; 2 meets the case's intended standard; 3 a demonstrated improvement
without extra scope or ceremony. Freeze case-specific interpretations in the rubric.
Retain disagreement and resolution in the grader evidence, rather than silently
choosing the higher score.

```sh
node scripts/evaluate-skills.mjs record /tmp/pigboard-comparison packet.json
node scripts/evaluate-skills.mjs compare /tmp/pigboard-comparison
```

Recording copies evidence into its own store and seals the retained packet.
Copied evidence paths change to `evidence/<id>`; the returned packet hash identifies
those retained bytes, not the original import file. Reusing a slot or run ID in a
campaign is rejected. An invalid import leaves the slot missing; correct the
collection error without inventing another model attempt. A genuinely rerun task
is a new planned experiment, with the old attempt retained and its reason reported.

Metadata is limited to 256 KiB, individual evidence files to 8 MiB, total evidence
per attempt to 64 MiB, 64 files and 1,000 campaign slots. Partition large sanitized
logs into bounded files before freezing their hashes. Do not omit relevant evidence
to obtain a pass. Paths cannot be absolute, traverse parents or use symbolic links.
Case IDs and evidence filenames must remain distinct on case-insensitive filesystems.
The metadata limit also applies after evidence paths are rewritten for storage.
A LIMIT error publishes no attempt; reduce unnecessary inline duplication while
keeping required observations in referenced evidence files.

## Read the result

`direction` reports observed gains and losses. `qualification` asks whether the
candidate met the frozen requirements. They are deliberately separate.

| Result | Meaning |
| --- | --- |
| PROMISING | Observed gain without observed loss, complete evidence and candidate qualification |
| REGRESSION / MIXED | A measured loss, with or without gains elsewhere |
| NO_MEASURED_CHANGE | No supported gain or loss; inspect qualification, which may still fail |
| INCOMPLETE | Required evidence or comparability is missing; known failures remain listed |

Any candidate integrity failure, failed must-pass assertion or failed final author
verification blocks qualification. Candidate success counts must reach each case's
minimum. Missing runs/observations prevent complete qualification unless a known
failure already establishes FAIL. A failure shared with the baseline never becomes
safe just because the direction is unchanged.

The report includes every planned pair, its run IDs, assertion changes, separate
quality scores/evidence, correct terminal outcomes, costs and missing data. Cost
differences alone do not establish an engineering improvement. Quality applicability
must match before scores can be compared. Unverified host/grading conditions do
not support a measured comparison. No aggregate score hides a permission violation.

Report `totals.<arm>.wall_ms` and `totals.<arm>.tokens` sum every known cost,
including failed attempts. Each total is a JSON number up to `9007199254740991`
(`Number.MAX_SAFE_INTEGER`), then an exact decimal integer string, for example
`"27021597764222973"`. Consumers should keep that string or parse it with an
exact integer type such as JavaScript `BigInt`; converting it to `Number` can round
it. The two fields may have different types. Stored packet metrics remain numbers
or null, and per-pair `cost_delta` values remain numbers or null. Unknown costs are
excluded from the known subtotal and counted by numeric `missing_costs`; they
never become zero-cost observations.

Exit 0 means a qualified sample with PROMISING or NO_MEASURED_CHANGE. Exit 1 means
a failed/incomplete gate, including a regression or tradeoff. Exit 2 means usage,
invalid input, a duplicate/busy store or damaged evidence. Reports are JSON for
agents and CI; the command's `--help` gives the short operating instructions.

## Use this on a pull request

Run deterministic tests in ordinary CI; they require no model credentials. For a
behavioral skill change, also link a frozen comparison against the agreed baseline
and exact candidate head when the trial host is ready. Inspect per-case results
and tradeoffs, not only the exit code. Until then label effectiveness **not measured**;
do not make synthetic controls a substitute gate for real model behavior.

Retain both skill/system snapshots, full campaign, attempt packets, source/results,
grader reports and final comparison with the PR evidence. If a fix changes the
candidate, create a new versioned campaign. Do not combine tuning runs from several
versions into an improved headline. A small sample supports a bounded decision,
not statistical superiority across codebases or models.

For A/B/C research, use matched A-v-B and A-v-C campaigns with the same A run IDs,
conditions and underlying evidence. The CLI reports each pair separately. When
writing a combined report, deduplicate A by run ID and verify identical original
receipts/evidence; do not double its actual executions or costs. Campaign binding
and copied packet paths differ between imports, so use the underlying identities
and raw evidence digests rather than requiring identical retained packet hashes.

## Recovery and maintenance

Completed attempts are never overwritten. The store is operator-owned, with
exclusive recording and temporary staging. If recording is interrupted, preserve
the error and original packet. Verify no recorder is active before removing its
stale `.record-lock` or unpublished `.record-*` directory. Never remove `runs/` to
make an attempt disappear. Comparison can still show the missing slot.

Hash mismatches stop comparison with an integrity error. Preserve the store and
investigate; do not recompute seals to hide a change. Hashes detect drift relative
to retained records, not an attacker able to rewrite the whole trusted store.
Archive evidence outside the agent's writable area before deleting owned fixtures.
Compare replays the original grades. A regrade uses a new campaign/rubric and
retains the original report; it is not a fresh model run.

The framework uses existing Node/schema dependencies and original Pigboard code.
It adopts paired old/new runs, independent grading and retained observations from
[Anthropic's skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md),
and pinned input/evidence practices from
[Compound Engineering's evaluation cells](https://github.com/EveryInc/compound-engineering-plugin/blob/ee46dde75a40e297bd8eac4055a410a771d3ac1d/tests/skill-eval-cell/README.md).
Their host runners and fallback policies are not imported. This keeps Pigboard's
prepared execution and model authority in one place.
