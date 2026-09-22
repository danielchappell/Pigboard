# S01 implementation plan: validate a saved workflow configuration

21 September 2026. Plan for the [S01 Story](../stories/validate-workflow-profile.md),
following the independently CLEAN [D2/configuration design](../designs/hosted-work-contract.md)
SHA-256 `f1e5da047aeb1bbab85e6ca1979f194f941ea388b2a767482dd3e8b6bf0a847c`.
This is a plan, not a shipped command. Implementation waits for two independent
CLEAN plan reviews; status and hashes are in [review evidence](../development-review.md).

## Why this is first

M1 requires a teammate to configure, validate and inspect the intended workflow
before M2 launches paid work. S01 delivers the configuration part as a complete
offline tool that people and agents can already use to share/review their intended
route. S02 adds actual Jira eligibility; it remains blocked on live D1 evidence.
S01 follows the reviewed project map, rather than selecting the pre-existing
Cursor adapter just because it was implemented first.

D2 resolves the profile/state design. Configuration-only D1/D4 decisions are now
explicit: board names and connection references are non-authorizing inputs;
Cursor/researcher is the first supported pair; live native-ID resolution, model
availability, repository access and authorization remain unchecked. No hosting,
transactional store, credential setup or provider write is required for S01.

## Baseline and scope

Inspected planning base `b690882d862a1bb0a0fc6420f96dfa838986c29e`, based on runtime
main `5e48c3d`. All 198 baseline tests pass on Node 22.17.0. Those tests establish
current behavior only; they do not validate this unimplemented feature. The
separate Cursor PR #7 at `3df1eab` is not a dependency of S01 and remains untouched.

Include one profile validator/preview library, one command, a shareable example,
help/docs and behavior tests. Do not implement live connection resolution,
ticket eligibility, a runner call, database, scheduler, MCP, package installer,
new role, or change to current claims/transitions. A validated profile must never
be treated as an executable authorization by this slice.

## Public behavior and command contract

Add `npm run profile:check -- ...`, with these concrete forms:

```sh
npm run --silent profile:check -- --file ski.workflow.example.json
npm run --silent profile:check -- --file ski.workflow.example.json --format text
cat ski.workflow.example.json | npm run --silent profile:check -- --stdin
npm run --silent profile:check -- --help
```

Require exactly one of `--file PATH` or `--stdin`. Default `--format json` emits
one JSON result to stdout; `--format text` prints a readable view of the same
result. Help succeeds without an input or credentials. Reject unknown/repeated
options, both input modes, missing values and unsupported formats before reading
input. No implicit cwd search, interactive prompt or environment fallback.

Exit 0 means valid static configuration (or help), 1 means invalid profile, and
2 means usage/input-read failure. JSON-mode errors use the same safe envelope on
stdout; do not print raw exceptions, input values or file content on stderr.
The guide uses `--silent` with npm so npm banners do not contaminate JSON.

Bound file/stdin input to 64 KiB of UTF-8 bytes; stop reading at limit+1 and report
`input_too_large` without buffering an unbounded stream. Reject malformed UTF-8
and malformed JSON with generic errors that do not repeat parser excerpts.
Read only the explicitly supplied input. Ordinary permission/not-found failures
produce `input_unreadable`; never seek other files or credentials to recover.

Valid JSON result:

```json
{
  "schemaVersion": 1,
  "ok": true,
  "profileId": "int-discovery",
  "digest": "<sha256 of the validated canonical profile>",
  "route": {
    "teamRef": "example-team",
    "board": {
      "type": "jira", "connectionRef": "jira-int", "projectKey": "INT",
      "issueType": "Task", "readyStatus": "Ready to Work", "optInLabel": "ai-enabled"
    },
    "stage": "technical-discovery",
    "role": "researcher",
    "repository": {"url": "https://github.com/danielchappell/ski-stack", "revision": "<40-hex revision>"},
    "runner": {"type": "cursor", "connectionRef": "cursor-team", "model": "gpt-5.6-sol"}
  },
  "liveReady": false,
  "unchecked": [
    {"code": "connection_access", "status": "not_checked"},
    {"code": "native_workflow_resolution", "status": "not_checked"},
    {"code": "repository_access", "status": "not_checked"},
    {"code": "model_availability", "status": "not_checked"},
    {"code": "execution_authorization", "status": "not_checked"}
  ]
}
```

Invalid result: `{schemaVersion:1, ok:false, liveReady:false, code, errors}`.
Each error is `{path, code, message}` using known schema paths only. An unknown
property produces `unexpected_field` at its known parent, not an echo of the
property name. No success route/digest is returned for invalid input. Top-level
codes are `invalid_profile`, `invalid_json`, `invalid_encoding`, `input_too_large`,
`input_unreadable` and `invalid_usage`; field codes distinguish missing field,
wrong type, unsupported value, unexpected field and invalid value.

## Implementation steps

1. Add `src/core/workflow-profile.js`. Export `validateWorkflowProfile(profile)`
   and `formatWorkflowProfileReport(result)`. Validate fixed shape/types first,
   then exact version/provider/role/stage, bounded strings/reference syntax and
   credential-free GitHub URL plus immutable revision from the reviewed design.
   Unsupported nested structures are rejected before canonical recursion. Treat
   library input as JSON data, not executable objects; do not run callbacks,
   resolve references or mutate caller data.
2. For valid profiles, reuse `canonicalStringify` from `src/core/handoffs.js`
   unchanged and Node `createHash('sha256')`. Build a detached structured route
   from validated fields. Formatting must derive its facts and limitations from
   that same result. Reject inputs that cannot be represented as bounded JSON
   data; keep the library's shape/byte rules aligned with the CLI's input limit.
3. Add `scripts/check-workflow-profile.mjs`. Parse only the documented options,
   bound input reads, decode UTF-8 strictly, use standard JSON.parse and call the
   pure validator/formatter. Catch I/O/parser errors into fixed codes. Import the
   new module directly rather than initializing a GitHub adapter or runner.
4. Add the two exports to `src/index.js` and the npm script to `package.json`.
   Preserve every existing export/script and add no dependency or environment
   variable. Do not edit `ski.workers.example.json`, which configures the existing
   local worker pool and is not this new workflow profile.
5. Add `ski.workflow.example.json` with the exact illustrative profile from the
   design, pinned to the recorded source revision. Add `docs/workflow-profile.md`
   with copy/edit/check steps, JSON/text/stdin examples, error recovery and the
   explicit static-versus-live distinction. Link the guide from README. Mark the
   team/connection references as examples, not provisioned accounts.
6. Add behavior-oriented library and real-process CLI tests. Prove stable digests
   across key order, changed routes changing the digest, bounded/rejected inputs,
   non-authorizing valid output and safe diagnostics. Verify help/format/exit
   behavior and file/stdin parity through real child processes. Exercise the
   command with missing credentials and a test preload that rejects network and
   child-process execution; compare input bytes and the test directory before
   and after. Tests assert user outcomes, not a copy of the validator's code.
7. Run the focused tests, documented QA and `npm test`, then author-assess all
   seven principles and commit. Obtain two fresh independent committed-code
   reviews, fix/recommit/re-review to CLEAN, and only then open a PR. No live
   provider check or Jira write is appropriate for this offline feature.

## File and time budget

| File | Purpose |
| --- | --- |
| src/core/workflow-profile.js | Pure validation, stable route/digest and text formatter. |
| scripts/check-workflow-profile.mjs | Bounded file/stdin CLI and safe result/exit handling. |
| src/index.js | Public exports only. |
| package.json | npm entry point only. |
| ski.workflow.example.json | One shareable non-secret example. |
| docs/workflow-profile.md | Human/agent usage and recovery guide. |
| README.md | Discoverable command/guide link. |
| test/workflow-profile.test.js | Contract/route/digest/error behavior. |
| test/workflow-profile-cli.test.js | Real command, input limits and absence of side effects. |

Nine expected implementation files. Reserve at most three additional supporting
Story/plan/queue edits: twelve total, comfortably below twenty. Existing reviewed
planning documents belong to this separate documentation Task; if a stacked
implementation branch is used, name its actual parent and measure that diff.
Do not hide unmerged runtime changes in a parent to evade the Story limit.

Estimated time for a developer familiar with this Node repository: 5 hours for
library/CLI, 3 for tests, 2 for docs/manual QA and 2 for review/PR fixes: 12 hours,
less than two human working days. If an implementation discovery breaks that
bound, stop promotion and split the outcome; do not add live setup or a schema
framework to this Story.

## Validation and rollout

The implementer runs the documented example in JSON/text/stdin modes with no
credentials and checks the invalid-role path. Machine consumers can parse stdout
as exactly one JSON document. Expected future focused command:
`node --test test/workflow-profile.test.js test/workflow-profile-cli.test.js`.
Required repository check is `npm test`; the 198 passing baseline is not a future
feature pass. This repository currently has no hosted CI workflow; record that
limitation without claiming local checks are hosted CI or adding CI incidentally.

The command is additive and does not change daemon behavior or any saved legacy
configuration. Removing this additive entry point would restore prior command
availability without a data migration. There is no deployment/credential/board
mutation to roll back. Future activation still requires S02 and the remaining
D1/D3/D4 evidence; S01 never flips liveReady to true.

## Author's principle assessment

| Principle | Assessment |
| --- | --- |
| Intuitive | Copy, edit and check a file; output explains one configured route and explicitly denies live readiness. |
| Discoverable | README/help/guide and fixed field-path errors show setup and recovery without the conversation. |
| Delightful experience | No credentials, paid work, repeated questions or hidden file search; JSON and text convey the same facts. |
| Token saver | Deterministic bounded validation and structured unchecked codes avoid model calls or prose parsing. |
| Secure | No secret lookup/connection resolution; unknown fields and credential-bearing URLs are rejected, and parser errors do not echo source. |
| Agents are equal | Explicit file/stdin input, stable JSON and exit status support noninteractive agents; text uses identical route data. |
| Dependable | Profile validity is distinct from live readiness; canonical digests and tested process behavior support repeatable comparison and safe failure. |
