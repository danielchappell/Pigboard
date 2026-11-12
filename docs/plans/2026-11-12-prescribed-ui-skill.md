# Prescribed frontend computer-use QA

PGB-61 adapts `qa-ui` to the accepted Jira/QA contract, following the completed
API/database adaptation. No new workflow or runtime is being designed here.

## Baseline and scope

The latest ai-working-kit main at `5bef5cf140bd5ea92e6600f0ff2a0be726e4c7ac`
contains no qa-ui skill (tree checked 12 November 2026). Use the existing local
adoption, identical to the installed file, SHA256
`96930db15489bfa512c4198fc8f5f9bc9c826d282e593b84e90c096de7cfd794`.
Save a portable copy in `skills/qa-ui/SKILL.md`, validate, and replace only the
installed qa-ui file after backing it up and checking it has not changed.

Keep computer-use API names and model selection in the harness. The shared skill
requires the supplied, prepared computer-use surface and its current tool
instructions. Reading those instructions and current UI observations is necessary
execution, not discovery of alternative tools. No new browser framework, dependency,
preview environment, application change, automation, PR, merge or deployment.

## Contract changes

- Require ticket/requirement version, explicit case IDs assigned to qa-ui, actor,
  prepared access/data, permitted target/actions, reviewed and deployed revision,
  ordered steps, expected visible outcomes, required screenshot checkpoints,
  evidence destination, case dependencies and cleanup (or explicit none).
- Require browser/device/viewport only as needed by the prescribed case. Record
  the actual surface used; never invent a device matrix or claim mobile coverage
  from desktop resizing. Missing required capability or ambiguous expectations block.
- Operate through supported computer-use UI controls, observing current state
  between actions. Select visible controls/labels from fresh observations; no API,
  database, DOM mutation, injected application state or alternate testing framework
  may substitute for a prescribed UI step. Use only explicitly named other skills
  at their assigned steps, preserving ordering.
- Capture and inspect screenshots at case start, required checkpoints, final state
  and failures when capture remains available. Pair each image with the step,
  expected/actual observation, time, safe route, actual surface and revisions.
  Require durable retrievable evidence in the approved destination. A transient
  image without a retained reference is insufficient; failed required capture,
  storage or access is BLOCKED. Do not invent filenames or claim uploads succeeded.
- Use prepared synthetic/sanitized data. Keep raw sensitive images restricted;
  only use supplied approved evidence handling, preserving the tested region.
  Missing permission or a safe evidence path blocks. Screenshots prove visible
  state, not persistence or downstream effects without prescribed corroboration.
- PASS requires every prescribed step/expectation/evidence item. Demonstrated
  product mismatch under valid prerequisites is FAIL, including a required UI
  control visibly absent. Remaining independent cases may run; dependent cases
  lacking defect-prevented state are NOT RUN. Missing access, capabilities,
  input/evidence or scope decisions stop the job as BLOCKED, preserving prior FAILs.
- Expected access denial can pass; unexpected inability to establish the intended
  identity blocks. Ambiguous observation is not evidence of a product defect.
  No retries, refresh-until-success, alternate navigation, missing-case design,
  environment/code repair or uncertain submission replay. Use only supplied bounded
  waits/observations and authorized bounded cleanup; stop for human intervention.
- Recheck requirement/source/deployed revisions before success, flag affected stale
  evidence and block for a fresh handoff. Return results for every case, screenshot
  references, coverage, partial/uncertain actions, cleanup and human recovery. The
  QA entry point owns Jira reporting/transitions; this skill neither merges nor
  moves tickets. Existing target instructions remain authoritative.

## Validation

Independently review the plan and final exact artifacts against the accepted
workflow and seven principles. Validate skill format and baseline/source provenance.
Use one isolated local fixture with a prepared form: a successful visible result,
a deliberately wrong visible result, and unavailable test identity. Supply case
steps and screenshot expectations before execution. Exercise with actual computer
use, inspect images and verify retained evidence; no customer data or external
service mutation. Do not count a fixture as live Cursor/PR-environment acceptance.
Separately walk missing screenshot export, stale revision, absent control,
ambiguous control, dependency failure and uncertain-submit scenarios without
inventing live evidence. No new product tests or repeated repository suite are
needed for this instruction-only change. Update PGB-61/PGB-58 with exact limits.

## Seven principles

Intuitive: consistent case statuses explain the next actor. Discoverable: explicit
inputs and screenshot requirements show readiness. Delightful: prepared access and
bounded actions avoid repeated setup. Token saver: only supplied journeys execute.
Secure: scoped actions and restricted evidence preserve permissions and data.
Agents are equal: explicit inputs/results also serve human QA; provider mechanics
remain in the harness. Dependable: screenshots must be observed and retrievable,
partial work stays visible, and unsupported success or recovery is forbidden.
