# Start and retrieve one Cursor cloud job

Problem to solve

Ski Stack cannot yet send work to Cursor through its own commands or library.
The live API probe showed that a launch can succeed even when the client times out.
Callers need to retrieve that work without paying for a duplicate job.

Acceptance Criteria

- A user can prepare a saved request, start one cloud job, and retrieve its status and final reply from another process.
- Preparing a request generates its stable agent ID before any paid work starts.
- Starting requires an explicit model and prompt, with an optional single GitHub repository and revision.
- Retrying the same saved request recovers the existing agent instead of launching another agent.
- A lost launch response triggers read-only recovery using the original ID.
- If recovery cannot identify one run, the error retains the agent ID and explains how to retrieve the intended run.
- Output distinguishes active runs, finished turns, and failed or cancelled runs without treating a finished turn as human acceptance.
- Help and model discovery are available without requiring the caller to use the Cursor chat interface.

Technical Acceptance Criteria

- Use the documented Cursor v1 API and built-in Node APIs without adding a dependency.
- Keep the provider runner separate from queue adapters and the existing GitHub/Codex daemon.
- Use plan mode, disable automatic PR creation, and disallow session credentials, MCP servers, and follow-up launches in this slice.
- Accept the API key through the environment or library constructor, never through request files or CLI arguments.
- Preserve explicit agent and run IDs, reject malformed responses, and do not retry a create automatically.
- Treat a saved request as immutable; reusing its agent ID does not authorize a different prompt.
- Fit this implementation, tests, supporting discovery, and documentation in one PR with at most 20 changed files and less than two human working days.

Testing Strategy

- Manual QA: Follow the documented prepare, start, and get commands and confirm the returned IDs, provider URL, status, and reply.
- Access and setup: Use mocked provider calls for development and the recorded trivial API probe as live contract evidence; repository access and teammate visibility remain unverified.
- UI path: Open the returned Cursor URL to inspect the same job without sending another prompt.
- Postman: No additional live launch is needed; compare the recorded create-conflict and run-result evidence with the command output contract.
- Automated regression: Cover provider lifecycle, ambiguous launch recovery, duplicate prevention, credential handling, and the command workflow with mocked API responses.
