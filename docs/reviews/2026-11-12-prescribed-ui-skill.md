# Prescribed frontend QA adaptation — PGB-61

## Scope and source

Adapted `skills/qa-ui/SKILL.md` to execute prescribed ticket cases through computer
use, inspect and retain screenshots, and stop for human-owned blockers. No test
design, discovery, alternative journey, environment repair or submission replay.
The QA entry point retains Jira reporting and transition ownership.

Checked ai-working-kit main `5bef5cf140bd5ea92e6600f0ff2a0be726e4c7ac` and its
complete source tree on 12 November 2026: it has no qa-ui skill. The baseline is
the existing local adoption, byte-identical to installed qa-ui, SHA256
`96930db15489bfa512c4198fc8f5f9bc9c826d282e593b84e90c096de7cfd794`.
It is not described as a new upstream version. A backup is retained at
`/tmp/pigboard-ui-adaptation-20261112/qa-ui-before.md`.

## Review and executed validation

Two fresh independent Sol High plan reviews returned CLEAN for SHA256
`dedcf04cc185e09bc8ffacae6d08bb41585bb10cf15028ca31a39cb0206029c1`.
Each read 4/4 supplied artifacts and 8/8 contract bullets, performed a second
sweep and independently assessed all seven principles. Final artifact review
and installation are separate gates, recorded below when completed.

The skill-format validator passes. This instruction-only adaptation changes no
Pigboard runtime, so the previous 198-test repository pass was not rerun or claimed
as new validation. Actual computer-use validation used one local synthetic form
with cases/expectations written before execution. Evidence is retained under
`evidence/2026-11-12-ui/`: fixture, cases, captures, results and five JPEG images.

| Case | Observed behavior | Outcome |
| --- | --- | --- |
| UI-1 | Entered Demo and clicked Save name; visible result Saved: Demo | PASS |
| UI-2 | Same prescribed actions; visible result Saved: Other | FAIL; defect preserved |
| UI-3 | Test identity unavailable; Sign-in required | BLOCKED; no login repair or form action |
| UI-4 | No navigation or action after UI-3 | NOT RUN |

Aggregate result is BLOCKED, retaining the earlier failure. The agent operated
through CUA accessibility-backed UI input and captured screenshots through that
same tool. No API, direct DOM writes or injected state substituted for test actions.
Images were inspected during execution and saved with case/step/time references;
all five were reopened and decoded after the owned tab closed. Each image is a
1280×720 desktop view, not mobile coverage. Cases/results bind paths to target,
requirements and synthetic revision. Fixture code and case definitions remained
unchanged during execution. The synthetic revision label is not a deployment proof.

The fixture contains no credentials/customer data, external messages or persistent
records. Closing the owned tab completed case cleanup; no unrelated tabs were
changed. The temporary fixture server is author validation infrastructure, not
something the QA skill provisions.

## Author assessment and limitations

Intuitive: consistent statuses explain defects versus blockers. Discoverable:
explicit case, access and screenshot prerequisites expose readiness. Delightful:
prepared cases avoid repeated setup. Token saver: no exploration or recovery loops.
Secure: scoped UI actions and restricted evidence protect data and authority.
Agents are equal: explicit contracts and readable case evidence serve both agents
and humans while leaving provider mechanics in the harness. Dependable: required
screenshots must be inspected and retrievable; partial actions and prior defects
survive a blocker, and changed revisions cannot inherit a stale pass.

This proves a local computer-use and screenshot-retention path in Codex. It does
not prove Cursor computer-use availability, real authentication, preview deployment,
remote screenshot upload/access, or Jira transition automation. Missing capabilities
on the chosen harness block execution until prepared by a human. PGB-60 continues
to own preview provisioning. Source publication, PRs, merge and deployment remain
outside this skill-authoring work.
