# Filled synthetic Story examples

These are fictional authoring fixtures, not real tickets or permission to run tests.
Repository names, identities and routes illustrate supplied project context. Each
example is a separate Story/PR. Native Jira metadata is recorded by the writer in
Jira fields; it is not another authority block in the description. Estimates belong
in the delivery plan: each example assumes existing components and fewer than 20
changed files/less than two working days, to be verified against actual code.

## Example 1: show a clear empty search result

Native metadata supplied for this fixture: project DEMO; Story; epic DEMO-10;
assignee the supplied directory identity for Alex; label AI-Alex-1. These are not
real Jira IDs. Existing client-side list filtering is already implemented.

### Description

Problem to solve

The account list goes blank when a search has no matches. A support user needs to
see that the search completed and know how to show the list again.

Acceptance Criteria

- AC-01: A completed search with no matches displays “No accounts match your search”.
- AC-02: Clearing the search restores the available accounts and removes that message.

Technical Acceptance Criteria

- Ticket contract: pigboard-story/v1
- Repository: example/accounts-web
- Base branch: main
- Change boundary: Existing account-list empty state and its clear-search control.
- Out of scope: Search matching logic, API behavior, authorization and other list pages.
- Related repositories: None — existing API behavior is unchanged.
- Accepted decisions: None — the supplied requirements fully define this change.
- TAC-01: The existing keyboard-accessible clear-search control remains usable.

Testing Strategy

- Testing types: UI.
- QA dispatch: TC-01.S1, TC-01.S2, TC-01.S3.
- Test data and access: Existing synthetic support fixture SUP-A, with visible account “Demo Oak”; prepared login reference accounts-support-fixture; owner is the fixture operator.
- Environment source: Ready pipeline-owned PR environment comment matching the reviewed commit.
- Execution preparation: P-01 — owner: implementer; supplies: verified account-list route and control labels; used by: TC-01.S1–S3; acceptance: the existing search/clear controls and AC-01/02 are unchanged in meaning.

### TC-01 — Search has no matches and can be cleared

- Requirements: AC-01, AC-02, TAC-01.
- Actor: Synthetic support user SUP-A in tenant DEMO-A.
- Preconditions: The supplied fixture contains “Demo Oak”; the login and approved Chromium desktop computer-use surface are prepared.
- Case dependencies: None — independent.

| Step | Caller | Skill | Action / prepared artifact | Input and output bindings | Expected outcome | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| TC-01.S1 | qa-entrypoint | qa-ui | Open the supplied account-list route from P-01. | Input: SUP-A login reference. | “Demo Oak” is visible and the no-matches message is absent. | Start screenshot showing list and search control. |
| TC-01.S2 | qa-entrypoint | qa-ui | Enter `zz-no-fixture-match` in the P-01 search control. | Input: exact synthetic search text. | No account rows remain; AC-01 message is visible. | Screenshot of search value and empty message. |
| TC-01.S3 | qa-entrypoint | qa-ui | Focus the clear-search control with the keyboard and activate it. | Same page state from S2. | Search is empty, “Demo Oak” returns, and the message disappears. | Completion screenshot plus observed keyboard action/focus. |

- Observation limits: None — fixture specifies synchronous client-side filtering; use the computer-use tool's normal bounded observation.
- Cleanup: None — only local search state changes and S3 clears it.
- Manual QA: Perform these same three actions in the supplied preview as SUP-A and compare the visible states.

- Automated regression: Add component coverage for the empty-result message and clearing the search.

P-01 is completed in the implementation handoff before Review. The example does
not invent a preview URL, future commit, screenshot filename or successful result.

## Example 2: include the saved display name in the settings response

Native metadata supplied for this fixture: project DEMO; Story; epic DEMO-20;
assignee the supplied directory identity for Casey; label AI-Casey-1. The existing
GET operation and tenant permission rule are established in this fixture.

### Description

The settings response omits the saved display name. API consumers need to show that
name without querying the database themselves.

Acceptance Criteria

- AC-01: GET `/settings/CFG-A` returns HTTP 200 with ID `CFG-A` and displayName `Demo A` for its tenant's reader.
- AC-02: The same request returns HTTP 403 for a reader from the other tenant and exposes no settings fields.

Technical Acceptance Criteria

- Ticket contract: pigboard-story/v1
- Repository: example/settings-api
- Base branch: main
- Change boundary: Existing settings response mapping and regression tests.
- Out of scope: New endpoints, writes, schema changes and changes to tenant authorization.
- Related repositories: None — consumers are reference context only.
- Accepted decisions: Fixture's existing settings API contract and tenant access rule, supplied with the Story.
- TAC-01: The response display name matches the saved value for exactly CFG-A in tenant A.

Testing Strategy

- Testing types: API and database.
- QA dispatch: TC-01.S1, TC-01.S2 (owns S2.1), TC-01.S3, TC-02.S1 (owns S1.1).
- Test data and access: Pre-seeded CFG-A in tenant A, display name “Demo A”; API reader A and reader B access references; restricted PostgreSQL reader QA-READ. Fixture operator supplies data/access before QA.
- Environment source: Ready pipeline-owned PR environment comment and prepared database target evidence for the same deployment.
- Execution preparation: P-01 — owner: implementer; supplies: Bruno requests/assertions and exact request selectors for both actors; used by: TC-01.S2.1, TC-02.S1.1; acceptance: preserve AC-01/02 status, field and permission expectations.
- Execution preparation: P-02 — owner: implementer; supplies: PostgreSQL SELECT, parameters and reader context using the bundled read-postgres.mjs; used by: TC-01.S1/S3; acceptance: bounded observation of only CFG-A in tenant A, ID/display name values, verified read-only identity and TAC-01 comparison.

### TC-01 — Response matches the scoped stored display name

- Requirements: AC-01, TAC-01.
- Actor: API reader A; database QA-READ restricted to the prepared test scope.
- Preconditions: CFG-A exists in tenant A with display name “Demo A”; roles, TLS context and fixture state are prepared.
- Case dependencies: S2 follows S1; S3 requires S1 baseline and S2.1 returned ID.

| Step | Caller | Skill | Action / prepared artifact | Input and output bindings | Expected outcome | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| TC-01.S1 | qa-entrypoint | qa-database | Execute P-02 baseline SELECT once. | params: tenant=A, record_id=CFG-A; output: baseline ID/name. | Exactly CFG-A with display name “Demo A”. | Sanitized SQL/parameters, row count and values, target/revision. |
| TC-01.S2 | qa-entrypoint | qa-api | Assess AC-01 using its named child and supplied requirements. | Child S2.1 response. | Status and fields meet AC-01; record actual returned ID. | Assertion results and child receipt. |
| TC-01.S2.1 | TC-01.S2 | qa-bruno | Execute P-01's reader-A GET and assertions once. | input: reader-A reference, CFG-A; output: response.id. | HTTP 200, id=CFG-A, displayName=Demo A. | Sanitized request/response and executed assertions. |
| TC-01.S3 | qa-entrypoint | qa-database | Execute P-02 after-observation once. | S2.1.response.id -> params.record_id; tenant=A; compare S1 baseline. | Same ID/display name as S1; no changed values in this observed scope. | Sanitized query/results and baseline comparison. |

- Observation limits: None — GET and SELECT are synchronous; use the prepared readers' fixed execution bounds.
- Cleanup: None — only reads are prescribed; fixture remains operator-owned.
- Manual QA: Run the same prepared Bruno request and read-only observations, then inspect status, fields and baseline comparison.

### TC-02 — Other tenant cannot read the settings

- Requirements: AC-02.
- Actor: API reader B, tenant B.
- Preconditions: Same CFG-A fixture and prepared reader-B identity.
- Case dependencies: None — independent of TC-01; run afterward in the stated dispatch order.

| Step | Caller | Skill | Action / prepared artifact | Input and output bindings | Expected outcome | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| TC-02.S1 | qa-entrypoint | qa-api | Assess AC-02 using its named child. | Child S1.1 response. | Required rejection, with no settings fields. | Assertion results and child receipt. |
| TC-02.S1.1 | TC-02.S1 | qa-bruno | Execute P-01's reader-B GET and assertions once. | input: reader-B reference, CFG-A. | HTTP 403; no id or displayName fields exposed. | Sanitized request/response and executed negative assertions. |

- Observation limits: None — synchronous request.
- Cleanup: None — only a denied read is prescribed.
- Manual QA: Run the same prepared reader-B request and inspect the rejection and absence assertions.

- Automated regression: Add API integration coverage for display-name mapping and the existing tenant rejection; preserve tenant-scoped response coverage.

This case establishes only the specified observed values, not an unobserved claim
about every database field or transient writes. Do not count child requests twice.
No example grants access, creates fixtures during QA or proves a live system passed.
