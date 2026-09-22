# S01 implementation evidence

22 September 2026. This record covers the offline workflow profile validator.
It does not accept the hosted journey or grant merge/release authority.

## Scope and reused gates

Reused the independently reviewed [D2 contract](../designs/hosted-work-contract.md),
[S01 Story](../stories/validate-workflow-profile.md) and
[implementation plan](../plans/validate-workflow-profile.md), including the
foundation-direction alignment review in [the review record](../development-review.md).
Their SHA-256 hashes remain, respectively:

- `f1e5da047aeb1bbab85e6ca1979f194f941ea388b2a767482dd3e8b6bf0a847c`
- `24bb3a2a5343cfff469da768b72679d6bc6147c4eff5257404126d5073e99ec7`
- `0fb7f854769b74cc6cc9e89b76945b08ed43c283faf3aab9a3e9d02ff07c1813`

Implementation branch: `codex/workflow-profile-preview`, stacked on the separate
documentation Task branch `codex/development-lifecycle-plan` at
`6d44a924e403634c871dedeaa9069dc2ab1408ae`. Current runtime files at that base match
the plan's inspected runtime `5e48c3def05fa8dc840d51ae6683113b9faa0ba2`.
The implementation changes nine planned files plus this record and the delivery
queue: eleven total. The original twelve-file/12-hour estimate still applies.
The parent contains planning documents, not hidden runtime implementation.

The implementation adds bounded validation and detached route/digest output,
file/stdin CLI, public exports, example, guide and tests. It does not initialize
an adapter, runner, database or scheduler. Existing local runtime behavior and
Cursor PR #7 remain separate. All live prerequisites remain unchecked.

## Author verification

On Node.js 22.17.0, before the implementation commit:

- Focused library/real-process tests: **17/17 passed**.
- Full `npm test`: **215/215 passed**, including the 198 pre-existing tests.
- Documented npm JSON, text and stdin examples produced the same route/digest
  and five unchecked prerequisites; unsupported-role recovery is covered in the
  real-process tests.
- Boundary tests accept exactly 65,536 UTF-8 bytes, reject byte 65,537 and stop
  oversized stdin without waiting for the producer to close.
- A test preload rejects network/subprocess calls; the command succeeds with no
  credentials and leaves the input/test directory unchanged.
- Whitespace checks pass. New guide/README links resolve to repository files.

These are local tests and offline QA. The repository has no hosted CI workflow.
No live Jira/Cursor check, paid compute, deployment, merge or release occurred.

## Author's seven-principle assessment

| Principle | Implementation assessment |
| --- | --- |
| Intuitive | Copy/edit/check exposes the full route in familiar terms; static validity and live readiness are visibly separate. |
| Discoverable | README, help and guide explain inputs, the supported role/provider and recovery; agents receive stable field paths and codes. |
| Delightful experience | No account setup or prompts are needed; errors report all supported field failures in one pass without starting work. |
| Token saver | Deterministic validation and a canonical digest need no model; compact JSON carries the route and all unchecked prerequisites. |
| Secure | No credentials or external actions; invalid data is never echoed, executable object hooks are rejected, and stream reads are bounded. |
| Agents are equal | File/stdin, JSON and exit statuses provide noninteractive access; the human text view derives from the same result. |
| Dependable | Valid and invalid results retain `liveReady: false`; tests cover repeatability, detached data, byte limits and safe failure without side effects. |

## Initial independent committed-code gate

Two fresh independent Sol agents reviewed implementation commit
`74dee57e82b9463b6f674ca810e28b1a7e0c3113` against the explicit stacked base
`6d44a924e403634c871dedeaa9069dc2ab1408ae`, inspecting the implementation before
the author's conclusions. Both returned **CLEAN**, with no findings or suggested
scope expansion. Each independently reran focused 17/17 and full 215/215 tests,
manual command/error checks, whitespace and documentation checks.

| Reviewer | Coverage and second sweep | Verdict |
| --- | --- | --- |
| `/root/s01_code_product_review` | 11/11 changed files, 4/4 governing artifacts, 10/10 Story requirements, 9/9 contract groups; repeated requirement and file sweep. | CLEAN |
| `/root/s01_code_technical_review` | 11/11 changed files, 4/4 governing artifacts, 1/1 supporting serializer, 16/16 contract obligations; repeated 11/11 and 16/16 sweep. | CLEAN |

| Principle | Independent product assessment | Independent technical assessment |
| --- | --- | --- |
| Intuitive | Copy/edit/check and familiar route labels distinguish static validity from live readiness for humans and agents. | Deterministic JSON and readable text expose the same complete route without hidden authority. |
| Discoverable | README/help/guide and field-path recovery work without the original conversation. | Explicit input modes, stable codes, supported values and recovery limits are all documented. |
| Delightful experience | No accounts, dependency installation or prompts; one pass reports all schema failures. | Validation is bounded, offline and free of setup or paid work. |
| Token saver | Compact output includes the full route and all omissions; longer help remains in the guide. | Canonical digests and structured facts avoid provider calls or prose interpretation. |
| Secure | Invalid values and unknown keys are not reflected; source/references grant no authority. | Allow-listed detached data prevents callbacks; bounded reads and safe errors preserve the offline boundary. |
| Agents are equal | Agents have library/stdin/JSON/exit status; humans have equivalent text and copyable examples. | Both interfaces expose the same result and limitations without interactive workarounds. |
| Dependable | File/stdin agree, digests are stable, failure has no success fields, and live readiness is always false. | Boundary, malformed-input, detachment and no-side-effect tests substantiate the documented outcomes. |

[S01 PR #9](https://github.com/danielchappell/ski-stack/pull/9) opened only after
both CLEAN code reviews. It is stacked on the documentation-only
[PR #8](https://github.com/danielchappell/ski-stack/pull/8). At publication commit
`05018bbcffa12671af058d1692b3a2211903ea34`, two bookkeeping files were the only
changes after the initial reviewed implementation commit; runtime, tests, public
guide, help and example retained that reviewed file tree. Both reviewers also
returned CLEAN for that documentation delta before it was pushed. Subsequent
feedback and changes are recorded below; the initial verdicts remain historical.

No hosted CI, Jira/Cursor acceptance, merge or release is implied. The owner
retains merge authority; the broader foundation remains incomplete. D1 and D4
are the next independent discovery Tasks before their dependent live Stories.

## PR feedback cycle: display safety and explicit eligibility

The first babysitting poll found two unresolved, non-outdated P2 threads against
code unchanged since the original review. Both were reproduced or confirmed on
published head `05018bbcffa12671af058d1692b3a2211903ea34` and classified as valid:

- [Unicode separators](https://github.com/danielchappell/ski-stack/pull/9#discussion_r4067123410):
  U+2028/U+2029 inside each display-name field were accepted and reflected into
  text. Reject their Unicode categories before route creation, alongside the
  existing control-character checks, so they cannot inject readiness lines.
- [Unchecked eligibility wording](https://github.com/danielchappell/ski-stack/pull/9#discussion_r4067123413):
  stable prerequisite codes alone did not satisfy the Story's explicit human
  warning. The text report now says live access and ticket eligibility have not
  been checked while preserving its structured codes and `liveReady: false`.

This bounded correction reuses the existing S01 design and implementation plan:
safe names, safe diagnostics and an explicit human-readable eligibility warning
were already in scope. No schema, provider, authority or architecture expansion.
New library tests cover both separators in all five name fields; real-process
tests cover JSON/text rejection and the readable warning. The guide documents
the restriction. Focused tests passed **19/19**, and full local tests passed
**217/217** on Node 22.17.0; whitespace checks also pass.

| Principle | Author's feedback-fix assessment |
| --- | --- |
| Intuitive | The standalone report now states the live access/eligibility limitation plainly. |
| Discoverable | Error text and guide name the forbidden separators so users can repair the field. |
| Delightful experience | Normal names still work; correction needs no extra setup or question. |
| Token saver | One short sentence makes the consequential limitation clear without a guide lookup. |
| Secure | Validation rejects injected line/paragraph boundaries before display and does not echo rejected content. |
| Agents are equal | Stable JSON codes and readiness stay unchanged; humans receive an equally explicit warning. |
| Dependable | Regression tests cover both separators, every name field and real CLI output. |

Fresh independent committed-code review outcomes for this feedback commit are
recorded against its exact SHA in [PR #9](https://github.com/danielchappell/ski-stack/pull/9).
The initial CLEAN verdicts do not substitute for that gate. Babysitting ends only
on a PR-description thumbs-up; no merge or review-request comment is authorized.
