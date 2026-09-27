# Bootstrap and inspect one Pigboard owner

Problem to solve

The Pigboard service needs one named owner before it can grant people or agents access. The first owner must be created on the live database root without adding an unauthenticated service route. An operator needs to tell whether setup succeeded before retrying after an interruption.

Acceptance Criteria

- An authorized operator runs a protected migration command, verifies its version, creates one named owner, then inspects that owner's name and authority generation.
- Repeating first setup cannot create another active owner or reveal the first credential again.
- A lost or undelivered credential can be replaced through an explicit recovery command using the generation just inspected.
- A wrong database target, unavailable database, stale recovery generation, or unsafe output location stops with a clear, secret-free result.

Technical Acceptance Criteria

- Migration creates one keyed team-authority row before credentials; first setup and recovery lock it and commit one grant change plus one generation event atomically.
- The owner database role has its own reviewed pin. It must use the runtime pin's exact production host and database, but never its `pigboard_app` role.
- The owner URL is read only from a protected local file. The one-time caller credential is written only to a new file in a verified private owner directory, never stdout, logs, source control, Fly secrets, or a normal API route.
- Stored caller credentials use a one-way digest. Recovery invalidates the old credential and rejects a stale expected generation.
- If a commit or file delivery is uncertain, the command does not automatically repeat it; the operator inspects the row before recovery or retry.

Testing Strategy

- Manual QA: On the dedicated Pigboard Neon root, bootstrap once, inspect one owner, and confirm repeat setup refuses without another credential.
- Access and setup: Use the existing `pigboard_owner` role, a private owner-URL file, and a separate private output path; do not use the runtime or Jira credential.
- Automated regression: Run a non-skipping real two-session Postgres race, unique owner setup, guarded replacement, target and private-file refusal, and interrupted result handling.

Implementation and plan review are recorded separately. Local tests do not close live acceptance. See the [owner operator guide](../hosted-pigboard-authority.md).
