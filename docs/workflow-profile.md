# Check a saved workflow profile

Use a workflow profile to share and review the intended route from a Jira ticket
to a worker. This command validates the file and previews that route offline.
It requires Node.js 20+ and a checkout of this repository. It needs no installed
dependencies, credentials, Jira setup or runner account, and starts no paid work.

## Copy, edit and check

From the repository directory:

```sh
cp ski.workflow.example.json ski.workflow.json
npm run --silent profile:check -- --file ski.workflow.json
npm run --silent profile:check -- --file ski.workflow.json --format text
```

Edit the copied file to describe your team, Jira project, issue type, ready
status, opt-in label, source repository/revision and intended model. Keep the
supported version and role/provider values shown in the example. `teamRef` and
both `connectionRef` values are illustrative identifiers, not provisioned
accounts. Put no tokens or passwords in the file. References are opaque names;
the checker does not look them up in files, environment variables or services.

The current profile supports version `1`, Jira, the `researcher` role in
`technical-discovery`, and Cursor. Other combinations return an unsupported
value error. This is the configuration contract for the first hosted discovery
journey; hosted execution and live eligibility inspection remain future work.
The example's model is illustrative: availability is not verified.

JSON is the default output. `--silent` suppresses npm's banner so stdout contains
exactly one JSON document. For pipes and help:

```sh
cat ski.workflow.json | npm run --silent profile:check -- --stdin
npm run --silent profile:check -- --help
```

Use exactly one `--file PATH` or `--stdin`. Flags cannot repeat. `--format` accepts
`json` or `text`; `--help` is used alone. Paths beginning with `--` can be written
with a `./` prefix. There is no default file search or interactive setup.

## Read the result

A successful result has `schemaVersion: 1`, `ok: true`, `profileId`, a SHA-256
`digest`, and a `route` containing the team, board selection, worker stage/role,
repository/revision and runner/model. Object key order and JSON whitespace do
not affect the digest. Values are not normalized; changing a value changes the
digest. The digest identifies configuration content, not approval or authenticity.

**`liveReady` is always `false`.** Success means only that this static profile is
valid. These `unchecked` prerequisites each have `status: "not_checked"`:

| Code | Still required before live work |
| --- | --- |
| `connection_access` | Resolve authorized team connections and permissions. |
| `native_workflow_resolution` | Resolve project/type/status/label against Jira and inspect ticket eligibility. |
| `repository_access` | Verify access to the repository and pinned source. |
| `model_availability` | Verify the intended model is available to the runner. |
| `execution_authorization` | Establish permission to start that work. |

The text view displays the same route and unchecked prerequisites. Neither output
connects to Jira or Cursor, creates tickets/runs, or authorizes execution. This
file is separate from [`ski.workers.example.json`](../ski.workers.example.json),
which configures the existing local worker pool. The local daemon does not read
workflow profiles.

## File rules and recovery

Input must be one standard JSON document encoded as UTF-8, without a byte-order
mark, at most **65,536 bytes**, including whitespace. All example fields are
required; extra fields at any level are rejected, including prompts, credentials,
API hosts and environment maps. Normal JSON parsing applies; avoid duplicate
keys, whose last value is the parsed value.

- `id`, `teamRef` and `connectionRef`: 1–64 ASCII letters, digits, dots,
  underscores or hyphens, starting with a letter or digit.
- Jira project, issue type, ready status, opt-in label and model: 1–128 Unicode
  characters, no outer whitespace, control/format characters or unpaired
  surrogates. Names are not checked against a provider here.
- Repository: `https://github.com/owner/repository`, at most 2,048 characters;
  ASCII letters/digits/hyphens in the owner, plus dots/underscores in the
  repository name. No credentials, ports, query, fragment, trailing slash, dot
  path segments or extra path. Use a 40-character hexadecimal commit revision,
  not a branch name. Repository existence and native naming validity are unchecked.

Errors contain `schemaVersion: 1`, `ok: false`, `liveReady: false`, a top-level
`code`, and `errors` with `path`, `code`, and an actionable `message`. Paths use
known fields such as `$.worker.role`; an extra field is reported at its parent.
Diagnostics never echo invalid values, unknown field names or raw file contents.
Invalid results do not contain a route or digest.

| Exit | Code/result | Recovery |
| --- | --- | --- |
| 0 | Valid static profile, or help | Inspect the route and outstanding live prerequisites. |
| 1 | `invalid_profile` | Fix each named field using its message and the example. |
| 2 | `invalid_usage` | Use one documented input mode and supported options. Usage errors always use JSON. |
| 2 | `input_unreadable` | Check the explicit path or input stream and read permissions. |
| 2 | `input_too_large` | Reduce the file to 65,536 UTF-8 bytes or less. |
| 2 | `invalid_encoding` | Save the file as UTF-8. |
| 2 | `invalid_json` | Fix JSON syntax; remove any byte-order mark. |

Field codes distinguish `missing_field`, `wrong_type`, `unsupported_value`,
`unexpected_field`, and `invalid_value`. For example, change an unsupported
`$.worker.role` back to `researcher`. Retrying this offline check cannot repeat
agent work because it starts none.

## Library use

```js
import { validateWorkflowProfile, formatWorkflowProfileReport } from "./src/index.js";

const result = validateWorkflowProfile(profile); // Parsed JSON data supplied by you.
if (result.ok) console.log(result.route);
console.log(formatWorkflowProfileReport(result));
```

The validator accepts plain JSON data and returns the same structured result as
the CLI. It rejects unsupported object shapes, accessors, proxies and non-JSON
values without invoking getters or serialization callbacks. Inputs are not
modified; returned routes are detached from the input. The library validates
field bounds and canonical JSON size. The CLI additionally enforces the byte
limit on the original input, including whitespace, before parsing. A formatter
expects a result from the validator; it is not a validator for arbitrary objects.

Return to the [README](../README.md) or inspect the
[reviewed contract](designs/hosted-work-contract.md).
