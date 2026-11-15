# Cursor review profile

This profile states the requirements of the current structured reviewer; it does
not describe the saved pilot's verified routing. An authorized native Story or Bug
currently In Review may use this skill only with the trusted assignment, current
receipts and prepared capabilities below. Its outcomes are QA, Rework Queued or
Blocked; discussion stays In Review. It never hands confirmed fixes directly to
In Progress.

The saved INT/AI-Daniel-1 basic pilot is inactive and still contains Story-only
routing and an older In Progress repair checklist. Those records do not configure
or establish compatibility with this profile.
[PGB-90](https://scubapig.atlassian.net/browse/PGB-90) owns compatible-release
readiness and updating or superseding the saved inactive setup artifacts before
full-loop acceptance or activation. Keep triggers inactive; verify actual
Story/Bug routing and the required direct QA/Rework Queued/Blocked edges as
separate setup evidence. Local skill tests or this profile's publication do not
prove them.

A separately authorized bounded Story/Bug exercise remains possible with complete
trusted inputs, receipts and prepared capabilities under this skill's current
contract. It does not establish compatible full-loop or hosted activation readiness.
The dated first-pilot context is Safeguard INT board 1234, exact label
`AI-Daniel-1`. Resolve real project/status IDs; a board label or number is not
authorization or a transition identifier.

Use the latest available configured **Grok at High** throughout review and handoff.
Pin the actual available model identifier at setup and record actual model/effort
and reviewer identity in each run. The reviewer must be independent of implementation.
No silent provider/effort substitution, inferred settings or second runtime reviewer.
If the profile/independence cannot be established, stop before review execution.

Retain review rounds and action receipts. An actual Cursor run link/ID is optional;
otherwise identify execution by Story, stage, revision and time. Missing run/visit
IDs or a lock is not a blocker. Duplicate prevention, cancellation and cross-run
coordination are deferred; the operator takes care around repeated launches. A
supported comment/new-commit wake must find the ticket currently In Review; a
comment cannot start work in QA, Human Review or another stage. Discussion-only continuations stay in Review; confirmed fixes are handed to
Rework Queued on the same PR, and subsequent review requires its new eligible stage entry. Do not
install extra triggers as part of using this skill.

Prepare these capabilities and permissions before activation:

- Actual Jira requirements/cases and available transitions; allowed repo and the
  same PR; complete paged Bitbucket comparison, comments/tasks and required CI.
- The approved Rovito Bitbucket instructions and `rovito-safeguard` MCP. A Rovito
  CLI route may be explicitly selected and verified in setup; it is never a fallback
  discovered after a failed tool call. For that configured route, read the
  [prepared CLI contract](rovito-cli.md). Do not use GitHub commands for Bitbucket.
- Complete reviewer-jira sibling and its exact assignment/implementation receipt preflight and final publication contract.
- Shared pr-review, its review-state reference, human-writing and pr-commenting at
  the reviewed versions. The wrapper preserves their criteria and writing behavior.
- Permission to post/edit review comments, publish Jira reports, approve as an
  eligible configured actor, revoke only that actor's invalid approval, inspect
  actual approval receipts/state, and transition to QA/Rework Queued/Blocked.
- Snapshot/expected-head support or equivalent verified current-state controls;
  permissions and identity restrictions must be checked with the real provider.
  An approval response alone is insufficient. Do not assume approvals survive or
  reset on commits, or that a provider records the reviewed commit on approval.
- Private retained review state and reviewer-accessible evidence destinations.
  Verify permissions separately from local ignored-cache storage. Never publish secrets.

Missing controls block activation; prompts do not implement locks, transactional
approval/transition or a hosted coordinator. Repository-required gates must remain
compatible; unresolved conflicts need a human, not silent waivers.

Invocation shape:

```text
Use pigboard-pr-review for the assigned <Story> currently In Review, PR <verified
URL>, under the verified Grok High independent-review profile.
Use the shared criteria and existing threads. Publish the exact-revision review,
then perform only its authorized approval and Jira handoff. Stop on a blocker.
```

The stage never fixes code, merges, deploys, prepares previews, sends Teams messages
or schedules new work. Authoring/testing this profile does not enable an automation.
