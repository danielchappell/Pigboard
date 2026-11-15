# Example: a small reviewed change

This is a fictional example, not a review result or evidence of a test run. The
paths, ticket and results below describe an imaginary label editor. Replace them
with actual references and assessed results in a real report. Here, `source`,
`target` and `base` stand for the full recorded commit IDs; each file reference is
for `source`. There is no PR yet, so the example uses paths and symbols.

---

**Verdict:** PASS (CLEAN).

**Change summary:** Label names now ignore surrounding spaces before the existing
length check. The change reuses `normalizeName`; save permissions and stored fields
stay the same. Inspection and the recorded focused test run support the behavior
and the existing blank-name rejection.

**PR / Jira:** Pre-PR; prepared title and description in `review/pr-draft.md`,
both referencing the supplied fictional Story `EXAMPLE-1`.

**Reviewed:** `source` against `target`, diff base `base`; review time and Story
retrieval time recorded in `review/inputs.md`; repository rules from `AGENTS.md`
at `source`.

**Where to look**

| Change | Main files | Tests and guidance |
| --- | --- | --- |
| Ignore surrounding spaces when saving a label | `src/labels.mjs`, `saveLabel`: calls the existing `normalizeName` before validation | `test/labels.test.mjs`: spaced, blank and overlong names; `docs/labels.md`: explains the saved value |

| Merge criterion | Result | Evidence summary or required action |
| --- | --- | --- |
| Jira requirements | PASS | The title and description reference EXAMPLE-1; `saveLabel` and the three label cases cover its trimming and validation requirements. |
| Scope and design | PASS | The three changed files implement the approved normalize-before-validation approach in EXAMPLE-1; no extra behavior. |
| Security and review integrity | PASS | Inspection of `saveLabel` confirms the existing permission check still runs first; the diff changes no review rules or CI requirements. |
| Compatibility and regressions | PASS | `saveLabel` retains its inputs, stored fields and return value; the recorded tests cover existing rejection behavior as well as trimming. |
| Reliability and operations | PASS | Inspection confirms normalization happens before the existing write and error handling; no added I/O, migration or deployment step. |
| Tests and verification | PASS | `node --test test/labels.test.mjs` at `source`: 3/3 pass, recorded in `review/test-output.txt`; assertions check stored values and rejected writes. |
| Repository fit and maintainability | PASS | `src/names.mjs`, `normalizeName` already supplies the required behavior; inspected callers confirm it fits label strings without another helper. |
| Documentation and usability | PASS | `docs/labels.md` matches the saved value and explains blank-name rejection; the focused command and expected results appear in `review/test-output.txt`. |

**Coverage:** Requirements 2/2; changed files 3/3; affected contracts 2/2
(label validation and save result); second sweep completed; no material omissions.

---

If the test output were missing and the required result could not be established,
Tests and verification would be UNVERIFIED and the overall verdict INCOMPLETE.
The summary would say the tests were inspected but execution was unverified.
The test-file entry in the map would remain useful without implying a passed run.
