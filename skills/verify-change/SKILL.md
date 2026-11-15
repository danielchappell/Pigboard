---
name: verify-change
description: Verify a scoped change against its requirements and final code revision, returning actual results and a repeatable recipe before implementation handoff.
---

# Verify the work you are handing over

Use the requirements, accepted plan/review, exact code state, required repository
checks, prescribed preparation and supplied environment. Apply
[engineering-principles](../engineering-principles/SKILL.md). The job calls this
method for final author verification and after changes that invalidate evidence.
It may also use it at a worthwhile intermediate checkpoint.

## Choose checks that could find the mistake

Connect changed behavior and affected consumers to meaningful checks. Inspect what
existing tests assert and which real path they exercise. A mock setter assertion
does not prove persistence; a helper test alone may miss the caller that bypasses
it. Use existing coverage when it answers the question. If a missing test or recipe
needs writing, return that gap to the job before declaring verification complete.

Run the relevant checks and required repository gates using prepared resources.
Confirm the intended tests were discovered and executed; exit zero, skipped cases
or an empty suite are insufficient. For visible behavior, use the required real
journey and inspect its results. Keep screenshots with the tested build identity;
check state or side effects separately when an image cannot prove them.

This method can run authorized tests, create their isolated fixture data and clean
up its own temporary state. It does not change product code, assertions, access,
dependencies or infrastructure. Preserve evidence before cleanup. Do not weaken
an expectation to obtain green output.

## Bind the evidence and make it repeatable

Record requirement/case references, actual commands or journey steps, prerequisites,
expected and actual results, executed counts where relevant, environment/build,
code revision and accessible sanitized evidence. Prefer checking the committed
revision. For an uncommitted check, retain a deterministic complete intended-tree
digest, including intended new files, and prove equality with the final commit;
otherwise rerun the affected checks on that commit. A later edit or conflict
resolution invalidates affected results. Explain any evidence retained unchanged.

Give the job a rerun recipe using the project's normal tests/docs: setup and test
data, commands or actions, expected outcomes, evidence location and safe cleanup.
Retain useful regression checks with the change. A recipe that names an unavailable
environment or missing secret is incomplete; name the prerequisite without exposing it.

Return **PASS**, **FAIL** or **INCOMPLETE** for the stated author checks. A demonstrated
failure is FAIL, with any unfinished checks still listed. Missing required evidence
is INCOMPLETE. PASS requires every required author check to have passed on the
applicable revision; planned, pending or unavailable checks cannot pass.

The job diagnoses failures, fills gaps and reruns affected checks. It alone decides
readiness after its remaining PR and current-head CI gates. Author PASS does not
claim independent QA, human acceptance, hosted CI, publication or release.
