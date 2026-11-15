# Tenant service trial

Use prepared Node 20+ and npm. No install is needed. This repository contains an
existing service and a missing tenant-export feature. Read task.md for the task.

- `npm test`: existing supported behavior; expected to pass on the starter.
- `npm run task-test`: export examples; expected to fail until implemented.
- `npm start`: demo HTTP service at http://127.0.0.1:3000 (PORT overrides it).

Synthetic bearer tokens `demo-alpha`, `demo-beta`, `demo-admin` select trusted
contexts in the demo authenticator. They are test data, not credentials. Existing
GET /records returns one tenant page; GET /admin/records requires the admin role
and returns one all-tenant page. Both return `{records:[...]}`. Missing identity
is 401, denied admin is 403. Errors are `{error:{code,message}}`. HTTP pageSize
defaults to 10; non-integer/out-of-range values are 400. Library pageSize is numeric.
The new GET /records/export must satisfy task.md, including rejecting tenantId
query overrides. Its library entrypoint is `createService(repository).exportActive`.

`createRepository(records, controls={})` is the required unchanged I/O boundary.
It defensively copies records (unique integer id, tenantId string, active boolean,
payload). `queryTenant({tenantId,pageSize,cursor})` and admin-only
`queryAdmin({pageSize,cursor})` return promises of `{records,nextCursor}`. Cursor
starts null; returned non-null strings are opaque and must be passed back unchanged.
Null completion differs from an empty page. Never substitute the admin query for
an authorized tenant query. Source collection access is not exposed.

Prepared fault controls:

```js
createRepository(rows, { emptyPage: true }); // one empty continued page
createRepository(rows, { repeatCursor: true }); // repeated non-null cursor
createRepository(rows, { failAt: 2 }); // second query fails once, before results
```

`observations()` returns copies of method/input/fault records for diagnostics.
`collectPages(fetchPage)` already handles null completion and cursor loops.
`validatePageSize`, typed errors and the HTTP response path are existing helpers.
Any small valid design is allowed; explain concrete reasons for replacing fitting
mechanisms. Do not edit the prepared repository adapter or bypass its fault hooks.

After implementation, run the complete relevant final checks and document a short
verification recipe including export, identity rejection and source-error retry.
Report failures honestly. Automated examples do not exhaust the requirements.
