# Decide who may see a Pigboard Jira issue

Problem to solve

Pigboard will read Jira with one service account. That account's access does not
prove that a particular Pigboard human or agent may see an issue. S02b needs a
caller-specific rule before it can show ticket facts.

Acceptance Criteria

- Record what the Scubapig service identity can read from a designated, nonsensitive PIG issue without its body.
- Choose how a current human or agent caller is authorized to see that issue and each linked blocker, including any issue security restriction.
- Show how the rule returns generic unavailable when a caller's audience cannot be proved.
- Record the rule, its owner approval, live evidence, remaining limits, and the S02b contract it changes.

Technical Acceptance Criteria

- A Pigboard grant, selected project-board pair, or successful service-account read alone must not prove caller audience.
- The rule must work noninteractively for an agent without inventing a Jira user identity.
- Minimal reads must stay internal until the caller-specific decision passes for the selected issue and each blocker; denied or unknown results expose no restricted facts.
- A blocker whose project or caller audience cannot be proved remains unknown and blocks eligibility.
- Do not read issue bodies, change Jira issues, or send content to Cursor during this Task.

Testing Strategy

- Manual QA: In Scubapig PIG, compare the designated issue and an in-project linked blocker with the chosen human and agent audience rule; record a permitted and a denied or unknown result.
- Access and setup: Use only approved Scubapig identities and a named nonsensitive test issue; the service credential and safe fixture remain pending.
- Automated regression: After the rule is chosen, name S02b tests for permitted, denied, restricted, and unknown selected issues and blockers; this Task adds no runtime test.
