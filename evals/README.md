# Engineering trial exercises

These source-only exercises provide public tasks and prepared local tools. They
do not run models or measure skill effectiveness. Independent private qualification
for tenant export is pending; a runnable starter does not make a scored trial ready.

## Tenant export (M1)

Prerequisites: prepared Node 20+ and npm; local HTTP tests need permission to bind
localhost. No dependency installation, account or external service is needed.
From the repository root, export the public-only exercise to a new directory:

```sh
node evals/tenant-export/export-public.mjs /absolute/new-public-directory
```

The command prints a SHA256 manifest of nine copied files. It rejects an existing
destination, missing/extra arguments and non-regular source files. The copy has no
private oracle, reference solution or repository history. Never copy or mount the
whole fixture parent into an evaluated agent's workspace.

Inside the exported directory:

```sh
npm test
npm run task-test
```

`npm test` passes three supported-behavior tests and skips the missing export
example. `npm run task-test` selects only the export example and intentionally
fails on the starter. To run all four named examples together:

```sh
EXPORT_TASK_TEST=1 node --test --test-reporter=tap test.mjs
```

Expect three supported tests to pass and only export to fail. An exit code alone
is insufficient evidence: inspect the named TAP results and final counts. Read
README.md and task.md for signatures, trusted demo identities, fault controls and
the requested behavior. `npm start` runs the local demo service. Do not weaken
HTTP checks if localhost access is denied; record the missing prerequisite.

Run the repository's starter/export regression with:

```sh
node --test test/tenant-export-fixture.test.mjs
```

It verifies regular public files, refusal to overwrite an export, and both starter
modes with actual named execution. Child tests clear only Node's inherited test
runner marker; the parent environment is preserved. Passing temporary data is
removed; failed command evidence is retained for diagnosis.

For a manual replay, use another new export directory. Keep failed output for
review; remove only the exact owned directory once finished, never its shared
parent. Reference/negative qualification, host isolation, final campaign settings
and independent grading remain prerequisites to model-effectiveness claims.
