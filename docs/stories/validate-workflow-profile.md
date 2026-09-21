# Validate a saved workflow configuration

Problem to solve

Teammates cannot yet share a predictable configuration for the Jira/cloud path.
They need to catch mistakes and see the intended route before enabling agent work.

Acceptance Criteria

- A teammate can copy the documented example, supply their non-secret references and preview its configured route.
- The library and command return the same profile digest, structured route and named unchecked live prerequisites.
- Human-readable output shows the same route and explicitly says that live access and eligibility have not been checked.
- Invalid or unsupported configuration returns stable field-path errors without echoing raw invalid values or file content.
- Checking a profile does not contact Jira or a runner, read credentials, create files or start work.

Technical Acceptance Criteria

- Implement version 1 of the reviewed configuration contract in `docs/designs/hosted-work-contract.md`.
- Use Node ESM and standard APIs; preserve existing exports and GitHub/local runtime behavior.
- Accept one bounded JSON input through an explicit file or stdin, with the reviewed schema and immutable repository revision.
- Return `liveReady: false` for valid and invalid profiles; opaque references grant no permission.
- Fit the change, tests, examples and documentation in one PR with at most 20 files and less than two human working days.

Testing Strategy

- Manual QA: Copy `ski.workflow.example.json`, run `npm run --silent profile:check -- --file ski.workflow.example.json`, and confirm the route, digest and five unchecked prerequisites in JSON.
- Manual QA: Repeat with `--format text`, then change the role to an unsupported value and confirm a field-path error and nonzero exit without a launch.
- Access and setup: Use Node 20 or later and the repository example; no account, credential, network connection or paid compute is needed.
- Automated regression: Cover profile/route semantics, stable digests, safe errors and the real file/stdin command flow without side effects.
