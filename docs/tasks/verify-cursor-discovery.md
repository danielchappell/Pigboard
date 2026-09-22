# Verify Cursor with a trivial cloud run

Problem to solve

The company Cursor account is available only for trivial adapter tests.
We need live launch and result evidence before defining the first adapter Story.
Repository discovery and implementation stay in our local development workflow.

Acceptance Criteria

- Record the account context, selected model, run link, and exact returned marker.
- Distinguish the browser check from authenticated API verification.
- Through the API, launch one marker-only run and retrieve its final result.
- Repeat the API create request with its saved agent ID and confirm no second agent starts.
- Retrieve the original run from a fresh client process.
- Record any visible tool use, file changes, usage, or access restriction without guessing missing evidence.
- Record second-teammate visibility as unverified until an authorized teammate checks it.
- Identify the next complete implementation outcome and justify its file and time estimate from the evidence.

Technical Acceptance Criteria

- Keep this a discovery Task; record results in the feasibility document.
- Use one cloud run at a time with a fixed short reply and no tools, repository, or follow-up work.
- The single API run is complete; use its saved ID for reads and do not start further model work for this check.
- Use Cursor v1 with a retained client-generated `bc-<uuid>` ID and the prepared request.
- Omit `repos` and `env`, use `mode: "plan"`, and disable automatic PR creation.
- Select a supported single model from `GET /v1/models` before submitting the request.
- Keep credentials out of prompts, request files, logs, and the repository.
- Use run-level status and result; agent-level state alone does not prove success.
- Do not expand source-control access, change spending limits, or create credentials as an implicit workaround.
- Keep later repository tests to reading `package.json` after access is established; full codebase analysis is outside this work account's test scope.

Testing Strategy

- Manual QA: Open the recorded cloud run, confirm the exact marker, and reload to check that the result remains visible.
- Access and setup: The approved test key authenticated successfully; final billing, production credential setup, and second-teammate access remain unresolved.
- UI path: Use the API run link in the [feasibility record](../pilots/jira-discovery-feasibility.md); the browser-only check is separate.
- Postman: The scripted API check is recorded in [saved evidence](../pilots/cursor-api-probe-result.json); verify its create, recovery, `409 agent_id_conflict`, and final-result responses before considering another live experiment.
- Automated regression: Use the observed API responses to define later adapter lifecycle and duplicate-launch coverage with mocked calls.
