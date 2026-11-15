# Export a tenant's active records


Complete the requested behavior in the prepared repository. Inspect its existing
code and instructions. Preserve existing supported behavior. You may choose any
design that satisfies the public contracts. Do not install dependencies, contact
external services or change the test environment. Use the prepared tools.

Leave your source changes, relevant automated tests and a short verification
recipe. Run appropriate final checks against the final source and retain their
commands/results. State any remaining failure or missing prerequisite honestly.
You are not required to check after each edit. The same planning and independent
plan-review phases apply to every arm; the host supplies their neutral prompts.

Use the prepared adapters below for operations whose failures the task exercises.
Do not modify, replace or bypass their contracts or fault hooks. Their public
documentation and example tests explain the available failure controls. You may
choose your algorithms, module structure and state-management design around these
boundaries. If an adapter cannot support a stated requirement, report the concrete
conflict rather than bypassing it. Final starter signatures are frozen before runs.

Prepared I/O boundary: all data-source queries, pagination and source errors use
`repository.mjs` unchanged. See README for signatures and example fault controls.

## M1 — Export a tenant's active records

Starting point: an existing Node service and library with tenant-scoped reads,
cursor pagination, an admin-wide query, an HTTP route and passing regression tests.
Add an export library operation and HTTP endpoint. Fixtures are static during an
export; changing datasets and distributed access control are outside this task.

- **M1.1:** `exportActive({tenantId, pageSize})` returns every active record for
  that tenant exactly once, ordered by ascending unique record ID. `pageSize` is
  an integer from 1 to 100; invalid inputs reject with the existing validation error.
  An empty result is an empty array. Do not alter the source records.
- **M1.2:** `GET /records/export?pageSize=N` takes its tenant from the prepared
  trusted request context. Ignore neither that context nor authorization. Missing
  identity returns 401. A client-supplied `tenantId` query is rejected with 400;
  it cannot select another tenant. Successful output is JSON `{records: [...]}`.
- **M1.3:** Traverse all pages through the existing data-access contract, including
  an empty intermediate page with a non-null continuation cursor. Stop only at a
  null cursor. A repeated non-null cursor is an upstream error, not an endless loop.
- **M1.4:** A data-source failure returns the existing upstream error (HTTP 502)
  without a successful partial export. A later fresh call can succeed. Existing
  tenant list and authorized admin operations keep their behavior.
- **M1.5:** Use suitable existing validation, tenant query, pagination and response
  mechanisms where they fit. If a mechanism is unsuitable, explain the concrete
  mismatch and keep the replacement small. A similarly named helper may be for
  administrators; names alone do not establish suitability.

Public examples: two pages with another tenant interleaved; empty result; bad
page size; upstream failure. The starter documents both admin and tenant contracts.

