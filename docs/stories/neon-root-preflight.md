# Check the Pigboard database target and runtime role

Problem to solve

The first hosted Pigboard service needs a database login that cannot use the
wrong Neon branch or broad owner powers. Today only the owner console has been
tested, so an operator cannot repeat that check before deployment.

Acceptance Criteria

- One command reports whether a dedicated Pigboard runtime login reaches the
  configured production root with verified TLS and the expected database and role.
- The command reports restricted role attributes, effective database and schema
  creation denial, and allowed/denied grants on a disposable owner-created table.
- A child or pooled hostname, missing private password file, failed connection
  or incomplete check gives a named failure or unknown result, never a pass.
- Human text and agent JSON state what was checked without printing a password,
  connection string or ticket data.

Technical Acceptance Criteria

- Keep the reviewed production hostname, database and role in source-controlled
  non-secret configuration separate from the password file; reject another target
  before connecting.
- Use `psql` with `sslmode=verify-full` and a regular nonsymlink password file
  owned by the executing user with owner-only permissions. Do not put a password
  in arguments, environment values, logs or repository files.
- The diagnostic reads role and TLS state and tests only the disposable fixture;
  it cannot migrate the application schema, issue grants or deploy Fly.

Testing Strategy

- Manual QA: With the approved runtime login and owner-created fixture, run the
  text and JSON commands; each check must pass. Retry with the known child host
  and see refusal before any connection.
- Access and setup: Only the dedicated Pigboard Neon production root and
  `pigboard_app` login are allowed. The owner creates and removes the fixture.
  Actual login creation, credential custody and live client proof are separate
  acceptance gates and remain unverified until performed.
- Automated regression: Cover root/refusal decisions, private-file metadata,
  credential-safe process invocation, complete and partial results, and text/JSON.
