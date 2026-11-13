# Cursor review profile

Verify this profile during setup; it is not a claim about enabled account features.
Invoke `pigboard-pr-review` when an opted-in Story enters In Review. First workstream:
Safeguard INT board 1234, exact label `AI-Daniel-1`. Resolve real project/status IDs;
a board label/number is not authorization or a transition identifier.

Use the latest available configured **Grok at High** throughout review and handoff.
Pin the actual available model identifier at setup and record actual model/effort
and reviewer identity in each run. The reviewer must be independent of implementation.
No silent provider/effort substitution, inferred settings or second runtime reviewer.
If the profile/independence cannot be established, stop before review execution.

Provide trusted run/visit identity, exclusive ownership, deduplication and durable
phase/run records. A supported comment/new-commit wake must belong to the currently
owned In Review visit; a comment cannot start work in QA, Human Review or another
stage. Discussion-only continuations stay in Review; confirmed fixes are handed to
In Progress, and subsequent review requires its new eligible stage entry. Do not
install extra triggers as part of using this skill.

Prepare these capabilities and permissions before activation:

- Actual Jira requirements/cases and available transitions; allowed repo and the
  same PR; complete paged Bitbucket comparison, comments/tasks and required CI.
- The approved Rovito Bitbucket instructions and `rovito-safeguard` MCP. A Rovito
  CLI route may be explicitly selected and verified in setup; it is never a fallback
  discovered after a failed tool call. Do not use GitHub commands for Bitbucket.
- Shared pr-review, its review-state reference, human-writing and pr-commenting at
  the reviewed versions. The wrapper preserves their criteria and writing behavior.
- Permission to post/edit review comments, publish Jira reports, approve as an
  eligible configured actor, revoke only that actor's invalid approval, inspect
  actual approval receipts/state, and transition to QA/In Progress/Blocked.
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
Use pigboard-pr-review for <Story>, PR <verified URL>, In Review visit <visit-id>,
run <run-id>, under the verified Grok High independent-review profile.
Use the shared criteria and existing threads. Publish the exact-revision review,
then perform only its authorized approval and Jira handoff. Stop on a blocker.
```

The stage never fixes code, merges, deploys, prepares previews, sends Teams messages
or schedules new work. Authoring/testing this profile does not enable an automation.
