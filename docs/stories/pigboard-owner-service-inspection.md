# Inspect a current Pigboard owner grant through the private service

Problem to solve

The first owner can be created in Neon, but the Pigboard service cannot yet recognize that credential. An operator needs to prove that the running service sees the current grant and that a recovered credential replaced the old one.

Acceptance Criteria

- The named owner authenticates to the private service and sees only their own current principal, team and grants after a restart.
- An invalid, inactive or replaced credential receives no owner or grant details.
- An unavailable Neon store or wrong pinned root returns an incomplete inspection without authority data; it is not reported as a denied grant.
- `/health` remains independent of Neon and does not reveal owner presence.

Technical Acceptance Criteria

- The service uses only the restricted `pigboard_app` login and reviewed production-root pin. The migration-only owner URL stays outside the service.
- A versioned owner migration gives the runtime role only the column reads needed for self-inspection, and the owner command checks those grants before reporting the schema current.
- Each inspection checks the live database identity and reads the active credential, principal, grants and authority generation in one parameterized statement. No permission is cached.
- `GET /v1/authority/me` accepts a bounded bearer credential and returns secret-free success, generic denial or safe unavailable JSON. It makes no Jira or Cursor call and changes no authority state.

Testing Strategy

- Manual QA: On the dedicated Pigboard root, bootstrap a named owner, inspect current grants on the private host, restart it and inspect again. On an authorized disposable setup, recover at the observed generation and verify old-token denial and new-token success.
- Access and setup: Use a private owner credential, restricted runtime URL and one private Fly Machine or an authorized disposable TLS PostgreSQL host. Live acceptance needs credential custody and a running Machine.
- UI path: There is no graphical interface in this technical slice. Inspect the private JSON response.
- Postman: No collection is needed. The private GET route takes `Authorization: Bearer <caller credential>` and returns 200, generic 401 or safe 503.
- Automated regression: Cover fresh and upgraded migrations, restricted SQL grants, current and recovered credentials, wrong-root refusal, restart behavior and Neon failure with a disposable TLS PostgreSQL fixture and HTTP tests.

The [owner guide](../hosted-pigboard-authority.md) and [private host guide](../hosted-pigboard-first-service.md) give the operator sequence. Local tests and this Story do not establish live acceptance.
