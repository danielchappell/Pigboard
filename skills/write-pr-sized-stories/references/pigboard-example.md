# Complete synthetic authoring examples

These are editable examples, not real Jira records, verified repositories, access
receipts or permission to execute. Native metadata stays outside each work body.
The separate contexts are demonstration facts only; real trusted facts must come
from their owner. Do not manufacture matching facts from a real work document.
All declared fields and inactive null alternatives remain visible; no aliases or
merge keys shorten them. Save each explicitly named block verbatim into its named
file, then use the [shared checker commands](pigboard-ticket.md#save-check-and-return).
Draft, structure and local start pass with these supplied contexts; live readiness
and human cases remain not evaluated/pending. Changing a step requires newly
reviewed full matching operation facts, not an automatic context rewrite.

## Find saved filters and understand empty results

Brief: Author an Epic for saved-filter search and its empty-result wording. Include those two outcomes and exclude ownership/sharing changes. Native context supplies full streams AI-Example-1 with created Story EX-1 and AI-Example-2 with created Bug EX-2, each with no prerequisites. There are no additional decisions or open questions.

Synthetic native context: project EX; type Epic; key EX-EPIC; title “Find saved filters and understand empty results”; no parent; assignee Example owner; label AI-Example-1; status Draft. These describe supplied context, not a competing authority object or a publication request.

Save as `epic-work.yaml`:

<!-- example:epic:work -->
```yaml
schema: pigboard-epic/v1
# Problem to solve
problem_to_solve: Readers need to find saved report filters and recognize an empty result.
outcome: Readers find saved filters by name and understand an empty result.
scope:
  included:
    - Search saved filters in the existing application.
    - Correct the search empty-state wording.
  excluded:
    - Changing filter ownership or sharing.
workstreams:
  - label: AI-Example-1
    story_order:
      - EX-1
  - label: AI-Example-2
    story_order:
      - EX-2
accepted_decisions: []
open_questions: []
```

Save separately as `epic-context.yaml`:

<!-- example:epic:context -->
```yaml
schema: pigboard-work-validation-context/v1
subject_key: EX-EPIC
repositories:
  - url: https://example.invalid/example/application
    base_branches:
      - main
allowed_skills: []
configured_targets:
  - local-review
references: []
prerequisite_graph:
  - ticket: EX-EPIC
    prerequisites: []
  - ticket: EX-1
    prerequisites: []
  - ticket: EX-2
    prerequisites: []
related_changes: []
operations: []
```

## Find a saved filter by name

Brief: Author a Story for finding a saved filter by name within its reader tenant. The supplied repository is https://example.invalid/example/application on verified main, limited to existing saved-filter search and tests; exclude ownership and cross-tenant access. No prerequisites, related changes or decisions apply. The fixture operator supplies reader ACTOR-01 in tenant example and fixture-1 named Monthly. Prescribe GET search through qa-api and its single qa-bruno child, a read-only PostgreSQL observation bound to the returned record_id, and a desktop Chromium UI search at 1280 × 800. Retain the exact operation prescriptions, query bounds and references supplied in the separate context below. All steps are synchronous, with no cleanup mutations. Product review checks wording after same-revision AI evidence; add API authorization/search regression coverage. Estimate: 1.5 human days and 8 changed files in one PR, recorded in the delivery plan.

Synthetic native context: project EX; type Story; key EX-1; title “Find a saved filter by name”; parent EX-EPIC; assignee Example owner; label AI-Example-1; status Draft. These describe supplied context, not a competing authority object or a publication request.

Save as `mixed-work.yaml`:

<!-- example:mixed:work -->
```yaml
schema: pigboard-ticket/v1
# Problem to solve
problem_to_solve: A reader cannot find a saved filter without scanning the whole list.
prerequisites: []
# Acceptance Criteria
acceptance_criteria:
  - id: AC-01
    requirement: A reader can find a saved filter by its name.
# Technical Acceptance Criteria
technical_acceptance_criteria:
  repository:
    url: https://example.invalid/example/application
    base_branch: main
    change_boundary: Existing saved-filter search and its tests.
    out_of_scope:
      - Changing ownership or cross-tenant access.
    related_repositories: []
  accepted_decisions: []
  constraints:
    - id: TAC-01
      requirement: Search and observations remain within the reader tenant.
# Testing Strategy
testing_strategy:
  testing_types:
    - api
    - database
    - ui
  environment:
    source: pipeline_pr_comment
    target_reference: null
    required_capabilities:
      - Prepared API requests
      - Restricted PostgreSQL reader
      - Computer-use browser
  actors:
    - id: ACTOR-01
      role: reader
      tenant: example
      identity_reference: fixture://example/reader
      access_owner: Fixture operator
  fixtures:
    - id: DATA-01
      description: Synthetic Monthly filter.
      initial_state: fixture-1 exists in tenant example with name Monthly.
      reference: fixture://example/filter
      preparation_id: null
      owner: Fixture operator
  preparation: []
  dispatch_order:
    - TC-01.S1
    - TC-01.S3
    - TC-01.S4
  cases:
    - id: TC-01
      execution: ai
      purpose: Find the prepared filter through the API, stored state and UI.
      requirements:
        - AC-01
        - TAC-01
      actors:
        - ACTOR-01
      fixtures:
        - DATA-01
      preconditions:
        - Prepared target contains the approved synthetic fixture.
      depends_on: []
      observation:
        mode: synchronous
        schedule: null
        deadline_seconds: null
        step: null
        completion: null
      cleanup:
        mode: none
        reason: All observations are read-only against a prepared fixture.
        owner: null
        steps: null
      manual_qa: Using the supplied reader identity, search Monthly and inspect the named
        prepared API request and database observation.
      steps:
        - id: TC-01.S1
          caller: qa-entrypoint
          skill: qa-api
          action: Observe the prepared filter search.
          children:
            - TC-01.S2
          inputs:
            record_id: fixture-1
          bindings: []
          outputs:
            - record_id
          expected:
            - The Monthly filter is shown for tenant example.
          evidence:
            - Sanitized observation with fixture identity and timestamp.
          prepared_artifact:
            reference: fixture://example/reviewed-search-collection
            preparation_id: null
          api:
            method: GET
            operation: Search saved filters by name
            route: /api/filters?name=Monthly
            route_preparation_id: null
            actor: ACTOR-01
            request_selector: filters/search.bru
            selector_preparation_id: null
            expected_status: 200
            expected_response:
              - Contains fixture-1 named Monthly in tenant example.
              - Does not contain records belonging to another tenant.
          database: null
          ui: null
        - id: TC-01.S2
          caller: TC-01.S1
          skill: qa-bruno
          action: Observe the prepared filter search.
          children: []
          inputs:
            record_id: fixture-1
          bindings: []
          outputs:
            - record_id
          expected:
            - The Monthly filter is shown for tenant example.
          evidence:
            - Sanitized observation with fixture identity and timestamp.
          prepared_artifact:
            reference: fixture://example/reviewed-search-collection
            preparation_id: null
          api:
            method: GET
            operation: Search saved filters by name
            route: /api/filters?name=Monthly
            route_preparation_id: null
            actor: ACTOR-01
            request_selector: filters/search.bru
            selector_preparation_id: null
            expected_status: 200
            expected_response:
              - Contains fixture-1 named Monthly in tenant example.
              - Does not contain records belonging to another tenant.
          database: null
          ui: null
        - id: TC-01.S3
          caller: qa-entrypoint
          skill: qa-database
          action: Observe the prepared filter search.
          children: []
          inputs:
            record_id: null
          bindings:
            - from_step: TC-01.S1
              output: record_id
              to_input: record_id
          outputs: []
          expected:
            - The Monthly filter is shown for tenant example.
          evidence:
            - Sanitized observation with fixture identity and timestamp.
          prepared_artifact:
            reference: fixture://example/reviewed-filter-query.sql
            preparation_id: null
          api: null
          database:
            engine: postgresql
            reader: qa-database/read-postgres.mjs
            access_reference: fixture://example/restricted-reader-receipt
            scope:
              tenant: example
              records: Only fixture-1 in tenant example
              columns:
                - id
                - name
                - tenant_id
              max_rows: 1
            parameters:
              - example
              - null
            parameters_preparation_id: null
            observations:
              - Exactly one row has id fixture-1, name Monthly and tenant_id example.
            parameter_bindings:
              - input: record_id
                index: 1
          ui: null
        - id: TC-01.S4
          caller: qa-entrypoint
          skill: qa-ui
          action: Enter Monthly in the filter search and inspect the results.
          children: []
          inputs:
            record_id: fixture-1
          bindings: []
          outputs: []
          expected:
            - The Monthly filter is shown for tenant example.
          evidence:
            - Screenshot of Monthly filter result and its visible tenant context.
          prepared_artifact:
            reference: null
            preparation_id: null
          api: null
          database: null
          ui:
            surface: prepared-browser-tab
            browser: Chromium
            device: desktop
            viewport:
              mode: dimensions
              width: 1280
              height: 800
              reference: null
            entry_route: /filters
            route_preparation_id: null
            required_capabilities:
              - Browser navigation
              - Keyboard input
              - Screenshot capture
            screenshot_checkpoints:
              - Search results showing Monthly for the prepared tenant.
  human_review:
    no_ai_cases_reason: null
    cases:
      - id: HQA-01
        execution: human
        owner_role: Product reviewer
        requirements:
          - AC-01
        prerequisites:
          - AI evidence is available for the same PR revision.
        steps:
          - Review the search label and empty-state wording with product expectations.
        expected:
          - The wording is understandable to a new report user.
        evidence:
          - Human review comment with the PR revision and outcome.
        cleanup:
          mode: none
          reason: All observations are read-only against a prepared fixture.
          owner: null
          steps: null
  automated_regression: Add API authorization and search behavior regression tests.
open_questions: []
```

Save separately as `mixed-context.yaml`:

<!-- example:mixed:context -->
```yaml
schema: pigboard-work-validation-context/v1
subject_key: EX-1
repositories:
  - url: https://example.invalid/example/application
    base_branches:
      - main
allowed_skills:
  - qa-api
  - qa-bruno
  - qa-database
  - qa-ui
configured_targets:
  - local-review
references:
  - fixture://example/reader
  - fixture://example/filter
  - fixture://example/reviewed-search-collection
  - fixture://example/reviewed-filter-query.sql
  - fixture://example/restricted-reader-receipt
prerequisite_graph:
  - ticket: EX-1
    prerequisites: []
related_changes: []
operations:
  - step: TC-01.S1
    contract:
      id: TC-01.S1
      caller: qa-entrypoint
      skill: qa-api
      action: Observe the prepared filter search.
      children:
        - TC-01.S2
      inputs:
        record_id: fixture-1
      bindings: []
      outputs:
        - record_id
      expected:
        - The Monthly filter is shown for tenant example.
      evidence:
        - Sanitized observation with fixture identity and timestamp.
      prepared_artifact:
        reference: fixture://example/reviewed-search-collection
        preparation_id: null
      api:
        method: GET
        operation: Search saved filters by name
        route: /api/filters?name=Monthly
        route_preparation_id: null
        actor: ACTOR-01
        request_selector: filters/search.bru
        selector_preparation_id: null
        expected_status: 200
        expected_response:
          - Contains fixture-1 named Monthly in tenant example.
          - Does not contain records belonging to another tenant.
      database: null
      ui: null
    read_only: true
    max_duration_seconds: 5
    parameter_count: null
  - step: TC-01.S2
    contract:
      id: TC-01.S2
      caller: TC-01.S1
      skill: qa-bruno
      action: Observe the prepared filter search.
      children: []
      inputs:
        record_id: fixture-1
      bindings: []
      outputs:
        - record_id
      expected:
        - The Monthly filter is shown for tenant example.
      evidence:
        - Sanitized observation with fixture identity and timestamp.
      prepared_artifact:
        reference: fixture://example/reviewed-search-collection
        preparation_id: null
      api:
        method: GET
        operation: Search saved filters by name
        route: /api/filters?name=Monthly
        route_preparation_id: null
        actor: ACTOR-01
        request_selector: filters/search.bru
        selector_preparation_id: null
        expected_status: 200
        expected_response:
          - Contains fixture-1 named Monthly in tenant example.
          - Does not contain records belonging to another tenant.
      database: null
      ui: null
    read_only: true
    max_duration_seconds: 5
    parameter_count: null
  - step: TC-01.S3
    contract:
      id: TC-01.S3
      caller: qa-entrypoint
      skill: qa-database
      action: Observe the prepared filter search.
      children: []
      inputs:
        record_id: null
      bindings:
        - from_step: TC-01.S1
          output: record_id
          to_input: record_id
      outputs: []
      expected:
        - The Monthly filter is shown for tenant example.
      evidence:
        - Sanitized observation with fixture identity and timestamp.
      prepared_artifact:
        reference: fixture://example/reviewed-filter-query.sql
        preparation_id: null
      api: null
      database:
        engine: postgresql
        reader: qa-database/read-postgres.mjs
        access_reference: fixture://example/restricted-reader-receipt
        scope:
          tenant: example
          records: Only fixture-1 in tenant example
          columns:
            - id
            - name
            - tenant_id
          max_rows: 1
        parameters:
          - example
          - null
        parameters_preparation_id: null
        observations:
          - Exactly one row has id fixture-1, name Monthly and tenant_id example.
        parameter_bindings:
          - input: record_id
            index: 1
      ui: null
    read_only: true
    max_duration_seconds: 20
    parameter_count: 2
  - step: TC-01.S4
    contract:
      id: TC-01.S4
      caller: qa-entrypoint
      skill: qa-ui
      action: Enter Monthly in the filter search and inspect the results.
      children: []
      inputs:
        record_id: fixture-1
      bindings: []
      outputs: []
      expected:
        - The Monthly filter is shown for tenant example.
      evidence:
        - Screenshot of Monthly filter result and its visible tenant context.
      prepared_artifact:
        reference: null
        preparation_id: null
      api: null
      database: null
      ui:
        surface: prepared-browser-tab
        browser: Chromium
        device: desktop
        viewport:
          mode: dimensions
          width: 1280
          height: 800
          reference: null
        entry_route: /filters
        route_preparation_id: null
        required_capabilities:
          - Browser navigation
          - Keyboard input
          - Screenshot capture
        screenshot_checkpoints:
          - Search results showing Monthly for the prepared tenant.
    read_only: true
    max_duration_seconds: 5
    parameter_count: null
```

## Correct misleading empty-search wording

Brief: Author a Bug that corrects misleading empty-search wording in the existing application component and its snapshot test. The accepted text is “No matching filters” with a suggestion to try another name. It must make no deletion claim and reveal no tenant/record details. Use the supplied application repository on verified main; exclude ownership/cross-tenant access changes. There are no dependencies, related repositories or decisions. Product reviewer inspects current-PR same-revision static before/after renders at configured non-runtime local-review, with no live identity, fixture or deployment needed. This agreed human-only wording assessment has no AI cases; CI/snapshot regression and PR review still apply. Retain a human comment naming inspected renders/revision, requirements and observations; no cleanup is needed. Estimate: half a human day and 3 changed files in one PR, recorded in the delivery plan.

Synthetic native context: project EX; type Bug; key EX-2; title “Correct misleading empty-search wording”; parent EX-EPIC; assignee Example owner; label AI-Example-2; status Draft. These describe supplied context, not a competing authority object or a publication request.

Save as `human-work.yaml`:

<!-- example:human:work -->
```yaml
schema: pigboard-ticket/v1
# Problem to solve
problem_to_solve: The empty search result says the filter was deleted, although it may
  simply have another name.
prerequisites: []
# Acceptance Criteria
acceptance_criteria:
  - id: AC-01
    requirement: The empty search result says “No matching filters” and suggests trying another name.
# Technical Acceptance Criteria
technical_acceptance_criteria:
  repository:
    url: https://example.invalid/example/application
    base_branch: main
    change_boundary: Correct the existing empty-result component text and its snapshot test.
    out_of_scope:
      - Changing ownership or cross-tenant access.
    related_repositories: []
  accepted_decisions: []
  constraints:
    - id: TAC-01
      requirement: The wording makes no claim that a filter was deleted and shows no tenant or
        record details.
# Testing Strategy
testing_strategy:
  testing_types: []
  environment:
    source: configured_target
    target_reference: local-review
    required_capabilities: []
  actors: []
  fixtures: []
  preparation: []
  dispatch_order: []
  cases: []
  human_review:
    no_ai_cases_reason: A human must assess the wording in the supplied static before/after
      component render; this case needs no live application.
    cases:
      - id: HQA-01
        execution: human
        owner_role: Product reviewer
        requirements:
          - AC-01
          - TAC-01
        prerequisites:
          - The current PR provides before/after static empty-result renders for the same
            source revision.
        steps:
          - Open the current PR diff and its same-revision static empty-result renders.
          - Read the empty-result text and compare it with AC-01 and TAC-01.
        expected:
          - The result reads “No matching filters” and suggests trying another name.
          - It makes no deletion claim and reveals no tenant or record details.
        evidence:
          - Human review comment with source revision, inspected render references and
            observations for AC-01 and TAC-01.
        cleanup:
          mode: none
          reason: All observations are read-only against a prepared fixture.
          owner: null
          steps: null
  automated_regression: Update the component text snapshot to catch accidental wording
    changes; human readability remains separately assessed.
open_questions: []
```

Save separately as `human-context.yaml`:

<!-- example:human:context -->
```yaml
schema: pigboard-work-validation-context/v1
subject_key: EX-2
repositories:
  - url: https://example.invalid/example/application
    base_branches:
      - main
allowed_skills: []
configured_targets:
  - local-review
references: []
prerequisite_graph:
  - ticket: EX-2
    prerequisites: []
related_changes: []
operations: []
```

For example, from a contributor checkout run:

```sh
node scripts/validate-work.mjs --mode draft --input /absolute/mixed-work.yaml --json
node scripts/validate-work.mjs --mode start --input /absolute/mixed-work.yaml --context /absolute/mixed-context.yaml --json
```

In a prepared installation substitute the same receipt’s exact
`/absolute/receipt/skills/work-validator/scripts/validate-work.mjs` path. Repeat
with `epic` and `human`. No source/test-fixture fallback is needed.
