# Start and retrieve one Cursor cloud job

Problem to solve

Pigboard cannot yet send work to Cursor through its own commands or library.
The live API probe showed that a launch can succeed even when the client times out.
Callers need to retrieve that work without paying for a duplicate job.

Acceptance Criteria

- A user can prepare a saved request, start one cloud job, and retrieve its status and final reply from another process.
- Preparing a request generates its stable agent ID before any paid work starts.
- Starting requires an explicit model and prompt, with an optional single GitHub repository and revision.
- Retrying the same saved request recovers the existing agent instead of launching another agent.
- A lost launch response triggers read-only recovery using the original ID.
- If recovery cannot identify one run, the error retains the agent ID and leaves the outcome unresolved until the original run ID can be established; it never guesses from a follow-up run.
- Output distinguishes active runs, finished turns, and failed or cancelled runs without treating a finished turn as human acceptance.
- Help and model discovery are available without requiring the caller to use the Cursor chat interface.

Technical Acceptance Criteria

- Use the documented Cursor v1 API and built-in Node APIs without adding a dependency.
- Keep the provider runner separate from queue adapters and the existing GitHub/Codex daemon.
- Use plan mode, disable automatic PR creation, and disallow session credentials, MCP servers, and follow-up launches in this slice.
- Accept the API key through the environment or library constructor, never through request files or CLI arguments.
- Preserve explicit agent and run IDs, reject malformed responses, and do not retry a create automatically.
- The caller must preserve the original saved request. Recovery by agent ID identifies existing work but cannot attest that an edited prompt, model, or repository matches it; hosted request-digest binding belongs to a later slice.
- Fit this implementation, tests, supporting discovery, and documentation in one PR with at most 20 changed files and less than two human working days.

Testing Strategy

- Manual QA: Run the plan's offline help and prepare commands; inspect the saved agent ID without starting paid work. Run the focused mocked CLI/provider tests for start and get.
- Access and setup: The recorded trivial API probe is live contract evidence, not a test of this implementation. Repository access and teammate visibility remain unverified; a fresh live launch requires separate account, task, and cost authority.
- UI path: With an authorized existing run, open its returned Cursor URL to inspect the same job without sending another prompt.
- Automated regression: Cover provider lifecycle, ambiguous launch recovery, duplicate prevention, credential handling, and the command workflow with mocked API responses.
