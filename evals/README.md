# Engineering trial exercises

These source-only exercises provide public tasks and prepared local tools. They
do not run models or measure skill effectiveness. Private controls qualify the tenant-export checks; a runnable starter or passing
controls alone do not make a scored trial ready.

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
parent. Host isolation, final campaign settings and independent grading remain
prerequisites to model-effectiveness claims.

## Qualify the tenant-export checks

With prepared Git and the same localhost permission, run from the repository root:

```sh
node evals/tenant-export/verify-controls.mjs /absolute/new-evidence-directory
node --test test/tenant-export-fixture.test.mjs
```

The first command refuses an existing directory and retains ten cases: reference,
six behavioral defects, adapter tampering, missing fault delivery and a valid
alternative. The reference and alternative must pass all behavioral requirements;
each negative must match its complete declared verdict map. Individual observations,
commands, output, exit status, duration and source hashes remain in each case folder.
A missing fault is INCOMPLETE, not a guessed pass or product failure. M1.5 reuse
quality requires separate source-based review; helper names do not earn scores.

Each case's `publicChecks` records COMPLETE or INCOMPLETE, named outcomes, counts
and any incomplete reason. Qualification requires all four named cases to finish,
with all three supported checks passing and export matching its declared result.
An empty, skipped, truncated or failed-to-start run cannot qualify just because
its exit code matches. Private results remain available when public evidence is
incomplete. Child commands remove only Node's inherited test-runner marker from
a copied environment; the parent environment is unchanged.

Requirement maps describe overlapping scenarios, not independent defect counts.
The admin-query leak fails M1.1–M1.4 because empty-page traversal and a fresh retry
must still return the complete tenant export. Its repeated-cursor and HTTP error
handling checks pass. The later-error observation retains first-call `queries`
and fresh-call `retryQueries`, including when the retry's result is wrong. Missing
fault delivery stays INCOMPLETE and does not enter that retry phase.

Successful qualification exits zero and prints `complete:true`, `controls:10`,
`matched:10`. A mismatch exits one; invalid invocation/setup exits two. A case-level
setup failure is retained as INCOMPLETE and makes qualification incomplete.
Inspect `report.json` and the failing case's receipts. Preserve failed evidence.
Replay with a different new directory; do not rerun over earlier evidence.
The root regression removes only its own passing temporary data. For manual runs,
remove only the exact evidence directory after review, never a shared parent.

The runner executes only these reviewed reference/mutation fixtures on local
copies. Before grading actual model submissions, the qualified host must isolate
submitted code and protect operator files and evidence. A copied directory is not
isolation. Freeze exact files, checks, treatment and host settings before scoring.
Retain final author verification separately from the private grade. This command
runs no models and proves neither skill effectiveness nor live Cursor/Jira behavior.
