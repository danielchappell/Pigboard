Check PIG Jira metadata with the service account

Problem to solve

The PIG project and two boards have been checked only in a human Jira session. A developer cannot yet repeat those metadata checks with the dedicated integration identity, so the setup may appear ready when the service account cannot read it.

Acceptance Criteria

- An operator can run one command to check the known PIG project, Task/To Do mapping, boards 2 and 35, their configurations and their actual filters with the dedicated service account.
- The command shows the same selected facts and route results as text or JSON, and states that pair validity, issue access and caller audience remain unproved.
- A wrong identity, denied or malformed response, missing known target, changed QA fixture or unfinished list produces a named incomplete result and a nonzero exit.
- An empty static board-project association is reported separately and never claims the pair is invalid.

Technical Acceptance Criteria

- Accept the OAuth client ID and secret only from separate protected files, and refuse unsafe files before making a network request.
- Send the credentials only to Atlassian's token endpoint and the bearer only to the fixed Scubapig Jira gateway; reject redirects and make no issue or write request.
- Check `/myself` against the dedicated account before reading project or board metadata.
- Bound responses and output, and never print a credential, bearer, raw filter query, vendor error body or unrelated project or board name.
- Exit zero only when every required metadata route and known-target check succeeds; it does not close D1 or accept S02a.

Testing Strategy

- Manual QA: Run the command with the dedicated service credential and inspect the selected metadata and omissions in text and JSON; retry with a wrong-identity credential or a denied test fixture and confirm a nonzero incomplete result.
- Access and setup: Live QA needs the Scubapig Pigboard Jira Integration OAuth credential with the targeted read scopes in two local mode-0600 files under mode-0700 directories; the credential and its effective PIG access have not yet been verified.
- Automated regression: Test protected-file, identity, route validation, fixture drift and output-boundary behavior with fake Atlassian responses.
