Connect and disconnect the fixed pilot agent

Problem to solve

The private host has an owner but no separately authorized agent. Sharing the owner bearer would give the agent the wrong authority. The operator needs a complete way to connect one agent and remove its access while preserving the owner.

Acceptance Criteria

- The protected operator enrolls `pilot-agent` with its own durable bearer file and can inspect its current authority.
- Retrying the same file reconciles the same identity without issuing another credential or changing an active grant.
- The recipient uses a distinct mapped private peer and its own bearer to inspect its agent identity and `connection_admin` grant.
- The operator revokes every active credential and grant for that exact agent, verifies next-call denial, and removes its peer.
- Owner self-inspection and the owner peer still work after the agent is disconnected.
- Lost replies, unsafe files, lost files and conflicting authority return a clear recovery step without silently replacing an identity.

Technical Acceptance Criteria

- Only the pinned protected owner connection can administer this fixed agent; runtime authority remains SELECT-only.
- Persist the UUID-named bearer file before activation; never print a token or digest or accept either in arguments.
- All owner and agent mutations use explicit READ COMMITTED, await the authority row lock, then read current decision state.
- Migration v3 preserves immutable v1/v2 sources, adds permanent digest uniqueness and agent events, and validates the latest catalog receipt.
- Refuse revoked-token reuse, human or owner revoke targets, contradictory authority and a second active agent.
- Report local preparation and SQL completion separately from recipient delivery, peer routing and peer removal.

Testing Strategy

- Manual QA: run the protected enroll/status commands, hand off the bearer privately, prove the agent's own `/me`, revoke its UUID, prove denial, remove its mapped peer, and recheck the owner.
- Access and setup: use the pinned private Pigboard host, protected owner URL, existing verified owner bearer/peer, and a distinct isolated local Linux agent runtime that can retain its own protected bearer and distinct peer; reuse the existing owner namespace proof pattern.
- Automated regression: extend the real independent-session PostgreSQL lifecycle and private HTTP regression, plus protected-file and command recovery coverage.
