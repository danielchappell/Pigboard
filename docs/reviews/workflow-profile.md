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

## Independent committed-code gate

Pending two fresh independent Sol reviews of the committed implementation.
Author checks above are not independent review. The PR opens only after both
reviewers report CLEAN for the exact revision, with complete coverage and a
second sweep. No current claim of hosted readiness or release is implied.
