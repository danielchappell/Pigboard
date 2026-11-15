# Check Pig Boss project configuration locally

One editable configuration describes the projects a company intends to manage in
one Jira site. This local checker validates that scope and previews changes. It
requires Node.js 20+ and the prepared validator dependencies. It does not install
or activate the manager, contact Jira/repositories, discover permissions, or write
configuration or operational state. Native Jira metadata remains authoritative.

Start with the complete synthetic [example](../config/pigboss.example.yaml), copy
it to your chosen configuration path and replace the synthetic IDs and mappings.
The example uses JSON syntax, which is valid YAML 1.2. Keep secrets out of this file.
The closed [canonical schema](../contracts/config-v1.schema.json) currently covers
project scope only. Schedule budgets, health settings, deployment and secret-store
references belong to later Stories in this same configuration; they are not
accepted namespaces yet. No second editable cloud binding file is needed.

## Run a check

For source use, prepare the existing dependencies through the normal documented
`docs/install.md` installation flow from the same Pigboard revision. The checker never fetches or repairs dependencies.
Run from the Pigboard source checkout:

```sh
node scripts/check-config.mjs --input /absolute/company.yaml
node scripts/check-config.mjs --input /absolute/company.yaml --label AI-Daniel-1 --json
node scripts/check-config.mjs --input /absolute/next.yaml --previous /absolute/previous.yaml --json
node scripts/check-config.mjs --input /absolute/company.yaml --expected-site https://jira.example.invalid --json
```

The same commands work from any directory with the installed entrypoint. Substitute
the actual versioned `skills` path from your preparation/installation receipt:

```sh
node /absolute/receipt/skills/work-validator/scripts/check-config.mjs --input /absolute/company.yaml --json
node /absolute/receipt/skills/work-validator/scripts/check-config.mjs --input /absolute/next.yaml --previous /absolute/previous.yaml --label AI-Daniel-1 --json
```

`npm run check-config -- --input /absolute/company.yaml --json` is a source shortcut.
`--help` and `--help --json` need no input file. Arguments are noninteractive and
must occur once. Files must be readable local regular files; FIFOs and directories
are rejected. Files remain untouched, including on failure.

A valid configuration proves local syntax and mapping consistency. Without
`--expected-site`, destination authority is `not_evaluated`. The optional argument
is an independently trusted invocation input, not another configuration file. It
must exactly match the next configuration's Jira origin; a mismatch rejects at
`/jira/site` without echoing either URL. A match reports `matched_expected_site`;
that means only a site match. It proves neither repository approval nor live access,
native ID existence, role separation or readiness. A newly configured enterprise
HTTPS repository is a scope change with pending checks, not an access approval.

## Author the complete scope

All root fields below and all five project fields are required. Objects reject
unknown fields; version is exactly `pigboard-config/v1`. There is no coercion,
trimming, recursive merge or implicit default inheritance.

| Field | Value |
| --- | --- |
| `jira.site` | Exact HTTPS origin, such as `https://jira.example.invalid` or an origin with a nondefault port; no path, slash suffix, credentials, query or fragment |
| `defaults` | Zero or more complete mapping sections from the table below |
| `projects` | Nonempty list of unique immutable native project IDs; up to 1,000 within the byte bound |
| Project `id` | Quoted decimal ID string, 1–255 characters; never a project key or board ID |
| Project `key` | Nonblank display string up to 255 characters, or `null` |
| Project `board_ids` | Unique quoted decimal board-ID strings, or `[]`; display/context only |
| Project `inherit` | Unique section names explicitly inherited from `defaults` |
| Project `mappings` | Complete local sections replacing inherited sections |

Every project must supply each of the following seven sections exactly once:
locally in `mappings`, or in `inherit` with a matching default. Supplying both is
ambiguous even when the values agree. Omitted inherited defaults fail validation.
For a project-specific override, remove the section from `inherit` and supply its
whole value in `mappings`. Defaults may omit unused sections.

| Section | Complete value |
| --- | --- |
| `stages` | All seven native status IDs: `Ready to Work`, `In Progress`, `In Review`, `QA`, `Human Review`, `Rework Queued`, `Blocked` |
| `accepted_later_stage_ids` | Unique native status-ID strings, possibly `[]`; disjoint from the seven active stages |
| `types` | Native issue-type ID strings for `epic`, `story`, `bug` |
| `actors` | Each of `manager`, `implementer`, `reviewer`, `qa`, `human_request` maps to a nonempty unique account-ID list |
| `repositories` | Nonempty unique list of exact HTTPS repository URIs, up to 2,048 characters each; enterprise hosts and paths accepted |
| `worker_prefixes` | Nonempty unique list of whitespace-free prefixes with text before a trailing `-`, such as `AI-Daniel-` |
| `opt_in_label` | One nonblank whitespace-free label, up to 255 characters |

Stage IDs must be pairwise distinct, as must the three issue-type IDs. IDs can be
shared across projects. Account IDs may overlap across roles; this is a trust
limitation, not proof of exclusive worker ownership. Other text fields are nonblank
strings up to 255 characters. Arrays other than `projects` have at most 100 items.
Repository and Jira URLs must already be valid HTTPS URIs: no repaired spaces,
invalid percent escapes, empty/username/password userinfo, normalization or silent
identity rewriting. The accepted exact string is preserved.

## Read resolved scope and stream identities

Readable output prints every resolved project and mapping, the authored-configuration
digest, optional stream inspection and preview checks. JSON returns one object:

| Field | Meaning |
| --- | --- |
| `schema`, `mode`, `valid` | `pigboard-config-check/v1`, `validate` or `preview`, and local input validity |
| `configuration_digest` | `sha256:` plus JCS/SHA-256 of the complete validated authored configuration, or `null` on invalid input; not a live revision |
| `destination_authority` | `not_evaluated`, `matched_expected_site`, or `mismatch` |
| `live_readiness` | Always `not_evaluated` |
| `resolved_scope` | `{site,projects}` or `null`; projects sorted by exact ID using UTF-16 order |
| `streams` | `[]` without `--label`; otherwise one mapped/unmapped result for every project |
| `preview` | Change report, or `null` without two valid configurations |
| `diagnostics` | Safe `{code,path,message}` entries; no rejected values or arbitrary field names |

Each resolved project contains `id`, `key`, `board_ids` and all seven mapping
sections. Set-like lists use UTF-16 sorting. Formatting/comments do not change the
digest; editing an unused default or display context can change it even if effective
mappings stay equal. No resolved entries are omitted to shorten output.

`--label` is a local inspection aid, not a persisted workstream inventory or routing
execution. A match is a literal prefix followed by one or more ASCII digits.
`AI-Daniel-0`, `AI-Daniel-01` and `AI-Daniel-1` are distinct full labels. Labels are
nonblank, whitespace-free valid Unicode up to 255 characters. Prefixes are never
interpreted as regular expressions. A project with no match reports `mapped:false`
and null `worker_prefix`/`key`; no matching project is not a configuration error.
The result also includes exact `project_id` and `label`.

A stream key is exactly `JSON.stringify([site, projectId, fullLabel])`. Equal full
labels in different projects remain independent, including Unicode or separator
characters. Keys and boards never select or own a project; renaming them does not
change its identity. Pure library entrypoints in `lib/config/parse.mjs`,
`projects.mjs` and `diff.mjs` validate their inputs and return independent results.
`resolveProject(scope,{site,project_id})` requires exact native identity; a matching
key or board cannot rescue a wrong site/project ID. The normalized site, project,
stages, accepted-later stages, actors and repositories compose with the current
receipt input; runtime evidence and assignments remain separate inputs.

## Preview changes and recover safely

`--previous` compares the historical configuration with the next file. Preview
contains `status`, `site_changed`, `added`, `removed`, `retained`, `display_changed`,
`mappings_changed`, `checks_required`, and `state_actions`. Identity lists use exact
`{site,project_id}`. Changed-field entries add only `fields`, without old/new values.
Effective sections are compared, so an unused default does not falsely change a
project. Key/board edits appear only as display changes. The same key with a new ID
is removal/addition. An unchanged effective scope reports `unchanged`; other edits
report `review_required` except a site change, which is `identity_change_held`.

| Change | Pending checks |
| --- | --- |
| Added project | `INITIAL_VISIBILITY`, `OWNERSHIP_INVENTORY`, `NATIVE_MAPPINGS`, `RELEASE_READINESS` |
| Removed project | `RETAINED_MEMBERS`, `UNRESOLVED_ATTEMPTS` |
| Effective mapping/repository/prefix/actor change | `RETAINED_MEMBERS`, `UNRESOLVED_ATTEMPTS`, `NATIVE_MAPPINGS`, `RELEASE_READINESS` |
| Site change | All old identities removed/all new added, plus installation-scoped `SITE_IDENTITY_RECONCILIATION` |
| Display-only change | No invented state migration; live readiness still unperformed |

Every check is `{code,scope,status:"pending"}` with exact project identity or null
installation scope. Inspect retained active, queued, Blocked and Human Review work,
unresolved attempts and original stream occupancy. Unknown retained work keeps
writes disabled. This local command cannot pass those checks. `state_actions` is
always `[]`: no delete, migrate, release or enable instruction. A site change stays
held even when the next site matches `--expected-site`; that argument does not
override historical identity or transfer ownership. Preserve previous configuration
and operational records for the later readiness/apply lifecycle.

Exit 0 means valid local input, including previews with pending review. Exit 1
means invalid configuration, expected-site mismatch, or a held site-identity change.
A held preview can have `valid:true` and exit 1: validity concerns inputs; the hold
concerns identity. Exit 2 means usage, local input, setup or internal failure. Invalid
input has no digest/resolved scope; preview is null unless both inputs validate.
Previous-input diagnostics start with `/previous`; next-input paths are unchanged.

Correct the safe named field or inheritance and rerun; rejected content is never
echoed. Errors include `STRUCTURE`, `FORMAT`, `DUPLICATE_PROJECT`,
`AMBIGUOUS_MAPPING`, `MISSING_MAPPING`, `EXPECTED_SITE`, `PARSE` and `LIMIT`.
Setup failures require the normal preparation flow; never repair dependencies
inside a delivery/checking run. No force flag bypasses a hold.

Local resource limits are 1 MiB per UTF-8 input, 16 nested containers (root is one),
and 1,000 parser list items; schema lists apply the stricter limits above. Duplicate
keys, aliases, unsupported tags/directives, multiple documents, non-string keys,
invalid UTF-8/Unicode, unsafe numbers and unknown fields/versions fail closed.
Depth-limit adversarial shapes may fail schema earlier; they are not valid config
examples. Fifty complete project entries are regression-tested locally. Neither
that result nor the 1,000-item parser bound promises live throughput or that 1,000
maximum-size projects fit the byte bound simultaneously.
