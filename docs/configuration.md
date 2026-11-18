# Check Pig Boss project configuration locally

One editable configuration describes the projects a company intends to manage in
one Jira site. This local checker validates that scope and previews changes. It
requires Node.js 20+ and the prepared validator dependencies. It does not install
or activate the manager, contact Jira/repositories, discover permissions, or write
configuration or operational state. Native Jira metadata remains authoritative.

Start with the complete synthetic [example](../config/pigboss.example.yaml), copy
it to your chosen configuration path and replace the synthetic IDs and mappings.
The example uses JSON syntax, which is valid YAML 1.2. Keep secrets out of this file.
The closed [canonical schema](../contracts/config-v1.schema.json) covers project scope and optional local Jira connection/read bounds. Optional `manager` settings include host controls, health and recorded repair preview. No second editable cloud binding file is needed.

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
| `live_configuration` | Safe local completeness/bounds/pending summary below, or `null` if either input is invalid |
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
`mappings_changed`, `connection_changed`, `read_bounds_changed`, `checks_required`, and `state_actions`. Identity lists use exact
`{site,project_id}`. Changed-field entries add only `fields`, without old/new values.
Effective sections are compared, so an unused default does not falsely change a
project. Key/board edits appear only as display changes. The same key with a new ID
is removal/addition. An unchanged effective scope and unchanged connection/bounds report `unchanged`; other edits
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

## Known preparation and cancelled native stages

Optional whole sections `preparation_stage_ids` and `cancelled_stage_ids` classify
known noncandidate native statuses for the [offline manager preview](manager-preview.md).
They use unique quoted decimal IDs, at most100 each, and are pairwise disjoint
with the seven operational stages, accepted-later IDs and each other within every
resolved project. Preparation is skipped; cancellation never proves completion.
Jira status names and broad categories cannot replace these explicit mappings.

Old v1 configurations remain valid and resolve omitted optional sections to `[]`.
A default is used only through explicit project `inherit`; no default is inherited
implicitly. Local-plus-inherited is ambiguous, and inheriting an absent default
fails. The example shows explicit inheritance and a local override/empty section.
The version remains v1 with optional declarations; older revisions reject these
new fields. Upgrade the reviewed source and configuration together before using
them. No native discovery, automatic provisioning or second customer file is added.

## Check optional Jira connection and explicit read budgets

Old v1 files may omit both `jira.connection` and `jira.read_bounds` and remain valid for offline use. If either is present, supply both complete blocks. Null, empty, partial or unknown fields fail. There is no coercion, environment override, implicit budget or secret lookup. Older Pigboard revisions reject these fields: upgrade the reviewed source and configuration together through normal preparation.

The example declares **Synthetic explicit budgets; not supported live defaults. No credentials or live readiness.** Never paste a token into `secret_reference`; arbitrary text cannot prove it is a reference. Keep the credential in the customer's store. The checker accepts only the declared reference syntax and never resolves it.

| `jira.connection` field | Required value |
| --- | --- |
| `credential_kind` | Exactly `atlassian_scoped_service_account_token` |
| `cloud_id` | Lowercase canonical UUID text: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`, with lowercase hexadecimal digits; no imposed version or case repair |
| `secret_reference` | Opaque printable ASCII identifier, 1–2,048 characters, with no spaces or control characters; no decoding, interpolation or ARN parsing |

No token/email/password field, direct-site/basic/OAuth class, `api_origin`, URL override or transport/trust flag is accepted. `jira.site` remains the exact tenant identity, including existing enterprise/nondefault-port support. It is not the HTTP target. Local checks cannot establish that the site and cloud ID belong together. `--expected-site` binds only the exact next site.

Every `jira.read_bounds` field below is a required positive JSON safe integer. Ceilings prevent structurally invalid values; they are **not defaults or supported capacity**.

| Field | Upper ceiling | Synthetic example | Later consumer counts |
| --- | ---: | ---: | --- |
| `max_epics` | 100 | 4 | Relevant unique Epics |
| `max_streams` | 1,000 | 8 | Distinct site/project/full-label tuples |
| `max_known_issues` | 1,000 | 32 | Deduplicated relevant union, including Epics/retained/referenced IDs |
| `max_comments` | 1,000 | 256 | All comments on required issues, including ordinary comments |
| `max_pages` | 9,007,199,254,740,991 | 64 | Combined search/comment pages |
| `max_requests` | 9,007,199,254,740,991 | 256 | All attempted requests, including failed/aborted reads |
| `page_size` | 100 | 25 | Requested page size; continuation determines completeness |
| `max_response_bytes` | 8,388,608 | 1,048,576 | Received bytes per response |
| `max_total_response_bytes` | 16,777,216 | 8,388,608 | All received response bytes, not only retained bodies |
| `request_timeout_ms` | 2,147,483,647 | 5,000 | Per-request timeout, below Node timer overflow |
| `scan_timeout_ms` | 2,147,483,647 | 60,000 | Total invocation deadline, including later resolution/parsing/composition |

Relations are checked in this order after shape validation: `max_epics <= max_known_issues`, `max_pages <= max_requests`, `max_response_bytes <= max_total_response_bytes`, `request_timeout_ms <= scan_timeout_ms`, `page_size <= max_known_issues`, `page_size <= max_comments`. `READ_BOUNDS` names the first inconsistent left-hand field. Smaller pages do not bound total inventory. Very large page/request counts are not usable service envelopes; later consumers must enforce the finite deadline and independent content ceilings. This checker introduces no runtime enforcement or retries.

The project count comes only from `projects`. Offline validity still allows up to 1,000 projects within input bytes. Live compatibility has a 100-project ceiling; a complete pair with 101 projects stays valid offline and reports `incompatible_scope`. Never silently truncate, split the installation or discard retained work to satisfy this ceiling. A changed managed domain needs normal operator review.

Response bytes are not serialized snapshot bytes. The existing 16 MiB snapshot, 8 MiB receipt, aggregate 1,000 comments, combined 100 receipts, record/body/ADF/depth/list limits and envelope duplication still apply downstream. The limits cannot necessarily be reached simultaneously. Final PGB-82 must supply supported initial defaults and measured small-domain source/copied acceptance; these synthetic values do not satisfy it. Later acquisition measures relevant closure, bytes and time rather than unrelated project history.

`live_configuration` always contains these fields on valid inputs:

| Field | Meaning |
| --- | --- |
| `status` | `incompatible_scope` above 100 projects; otherwise `missing_settings` when both blocks are absent; otherwise `complete` |
| `project_count` | Actual configured count |
| `required_settings` | Exactly `[/jira/connection,/jira/read_bounds]` when absent, otherwise `[]`; retained even with incompatible scope |
| `effective_bounds` | All11 declared integers, or `null` when absent |
| `checks_required` | Installation-scoped pending checks listed below, including when settings are absent |
| `diagnostics` | One safe `LIVE_SCOPE_LIMIT` at `/projects` when incompatible; otherwise `[]` |

The pending checks are `SITE_CLOUD_BINDING` (site belongs to cloud ID), `CREDENTIAL_ACCESS` (credential can access the domain), `INITIAL_VISIBILITY` (operator verifies whole-domain visibility), `OWNERSHIP_INVENTORY` (existing work and ownership), and `RELEASE_READINESS` (remaining installation/release checks). Each is `{code,scope:null,status:"pending"}`. Search results cannot prove invisible issues do not exist. Local completeness never passes any check; `live_readiness` remains `not_evaluated`.

Human and JSON output show the same summary. Neither prints cloud IDs, references or the operational projection. The digest includes the complete authored accepted configuration, so a reference edit changes it; the digest is no access or authority proof. There is no separate reference hash.

Trusted in-process consumers may call `resolveJiraReadConfig(config)`. It validates the full input every time, returns `null` with both blocks absent, and throws sanitized `LIVE_SCOPE_LIMIT` for a complete pair above 100 projects. Otherwise it returns fresh `{site,project_ids,connection,read_bounds}` with IDs sorted like resolved scope and a connection containing the three authored fields plus derived `api_base` of `https://api.atlassian.com/ex/jira/<cloud_id>` without a trailing slash. The reference remains inert. This object is intentionally not public checker output and establishes neither access nor site/cloud binding. `resolveProjects`, `resolveProject` and `inspectStreams` retain their closed pure scope.

Preview reports only changed declared names in `connection_changed` and `read_bounds_changed`, ordered as the tables above. Adding/removing the pair reports every field. Any connection change adds the five installation checks above; any bounds change adds `READ_BOUNDS` and `RELEASE_READINESS`. Identical code/scope checks are deduplicated after existing checks. Cloud-ID edits at the same site require review; site changes retain the identity hold. Mapping/actor/repository/removal checks and `state_actions:[]` remain unchanged. No old/new connection values appear.

Missing/incompatible live settings alone retain exit 0 for a valid offline file. Either invalid input clears `live_configuration`, digest and resolved scope, leaves preview null and returns exit 1. Correct the named field for `LIVE_SETTINGS`, `READ_BOUNDS`, `STRUCTURE`, `FORMAT` or `LIMIT`, then rerun. For absent settings, preserve offline use or supply the whole pair. For `LIVE_SCOPE_LIMIT`, preserve the valid offline scope while arranging an explicitly reviewed compatible domain. For SETUP/exit 2, use the same-revision normal preparation flow; a damaged disposable copy must not cause repair or replacement of a usable release. There is no force flag, auto-write, dependency repair, secret lookup or implicit live probe.

## Optional customer manager host

The optional complete `manager` section is the single authored host configuration.
Existing offline configurations remain valid without it. Packaging requires full
Jira connection/read settings and an exact same-account/region Secrets Manager ARN.
Keep the project mappings in `config/pigboss.example.yaml` and add the complete
disabled manager example in the [installation guide](manager-installation.md).

`installation_id` and `domain_id` are stable bounded tokens. `aws` supplies the
12-digit account, region, stack name and distinct same-account operator/deployer
role ARNs with no IAM path (for example `role/pigboard-operator`, not
`role/team/pigboard-operator`). A path-bearing operator or deployer ARN is invalid
configuration and fails before packaging or host operations; see the supported
role/profile prerequisites in the [installation guide](manager-installation.md).
Profiles select credentials for those exact roles, never substitute resource IDs. Generated stack/table/function/schedule IDs and installation receipts are
outputs, not another configuration file to author.

`controls` explicitly names mode (`preview` or `apply`), `schedule_enabled`,
`writes_enabled` and `maintenance`. Preview requires writes false. Initial
packaging requires scheduling, writes and maintenance false. The included sender
supports ordinary apply after deliberate activation with the prerequisites below.
`schedule_minutes` is 1–1440, `invocation_timeout_seconds` is 30–900, and schedule
interval must exceed timeout. The preview budget must cover the 30-second State
read bound, Jira scan bound and ten seconds of headroom. Excessive read budgets
fail packaging without clipping. `log_retention_days` uses the declared finite
CloudWatch values (for example 14), never unlimited retention.

All three `activation` confirmations are explicit operator assertions:
`full_visibility_confirmed`, `sole_admitting_installation_confirmed`, and
`inventory_reviewed`. They may remain false for preview. They do not infer
permissions or another installation's absence from search results. Reconfirm when
scope, credentials or workflow changes. The digest covers the whole canonical
file, including manager controls; rebuild the pinned package for control updates.

`transition_edges` may be empty for preview. Each closed row has numeric
`project_id`, `transition_id`, explicit unique nonempty `source_status_ids`,
`target_status_id` and boolean `global`. Project/transition pairs are unique and
refer to configured projects. Ordinary apply requires a unique project edge
matching the proposed source and In Progress target with `global: false`.
The source is Ready to Work for new work and Rework Queued for opted-in same-PR
repair. An available transition ID alone proves no source condition. The source
list records configured constraints. Jira and State still use separate effects.
Missing, ambiguous or global edges hold the selected admission.

Ordinary apply uses the existing manager activation attestations. The
operation-only scheduled event takes its configuration and scope from the host.
Sender capability comes from the reviewed package, with initial schedule and
writes off.

For apply mode, the host requires
`310 + 2 * scan_timeout_ms / 1000 + 6 * request_timeout_ms / 1000 <= invocation_timeout_seconds`.
This covers ten State calls, two acquisitions, five writer requests, credential
resolution and the existing margin. Preview keeps its existing
`40 + scan_timeout_ms / 1000` requirement. The 900-second maximum and cadence
strictly exceeding the invocation timeout remain. Insufficient configuration is
rejected before effects; the host never changes these settings automatically.

## Optional manager health settings

The same canonical `manager` object may contain:

```json
"health": { "freshness_seconds": 900, "warning_percent": 80 }
```

Omitting it uses the existing defaults subject to the bounds below: effective
freshness is three schedule cadences (`schedule_minutes * 180` seconds), and warning
is 80 percent. Explicit freshness must be an integer from 1 to 259200. Effective
freshness, including the default, must be strictly greater than one cadence plus
the full invocation timeout and no greater than `log_retention_days * 86400`
seconds. Equality with retention is allowed: the freshness window must fit the
retained logs. Correct incompatible settings in the canonical configuration before
packaging or configuration, choosing supported retention or freshness/cadence
values. Warning is finite, greater than 0 and at most 100. Explicit settings
participate in the existing canonical digest; no separate monitoring configuration
or SNS setting exists. Defaults require deployed acceptance and do not promise
capacity or detection latency.

Detailed preview-scan health measures each scan budget separately and reports the maximum measured
percentage. Exactly the threshold warns. Page size is a batch size. Missing request
peaks/counters remain null/not observed. Generated health generation and enablement
time are outputs retained in the existing installation extensions, not customer
authored configuration. Use the existing verified configure lifecycle to change
enabled settings. See [health states and safe recovery](manager-health.md).

Preview and apply processing use distinct health evidence. The source apply
runtime adds a [processing summary](manager-apply.md#inspect-processing-completion)
alongside its original result and effects. Mode and configuration changes change
the evidence identity. Check current apply health against the current apply
installation, package and enablement identity.

## Preview recorded same-PR rework

The optional boolean `manager.rework_enabled` defaults effectively to false.
Omitting it leaves the authored configuration unchanged; no default is inserted.
Set it to `true` in the existing complete `manager` section to let ordinary preview
propose supported own-ticket repairs. Strings such as `"true"` are invalid.
The complete canonical configuration digest binds this value, including the
distinction between omission and explicit false.

A compatible [sender package](manager-apply.md) can also admit the freshly selected
repair with existing write authority and the direct Rework Queued → In Progress
edge described above. Preview remains write-free. The worker checks current PR
openness and freshness. Schedule and write activation use their existing separate
controls. Earlier pins may support only [recorded preview](manager-preview.md#recorded-same-pr-repair-preview).
Existing installations may toggle the flag through
[same-source configure](manager-installation.md#recorded-repair-preview-configuration).
Source upgrades remain a separate authorized release.

## Native handoff and attempt reads

The native receipt library uses the existing canonical Jira connection,
configured project and role mappings, and `jira.read_bounds`. One invocation
shares its page, request, response and retained bytes, and time limits across
inventory, exact comments and native changelog pages. The attempt selector
can reduce the page, request and scan time limits. It cannot change the Jira
site, resolver, authorized actors or per-response limits.

A pending attempt is bound to the installed package and configuration
recorded when it ran. Maintenance can change the current configuration
digest. A trusted caller can supply the original approved `{configInput,
binding}` pair in `original`, along with the current configuration and
binding. The original pair must match the attempt's capture and agree with
the current Jira site, connection cloud ID and resolved project authority.
Missing original configuration or package evidence leaves reconciliation
unavailable. See [the read library and fixture examples](manager-preview.md#read-an-exact-jira-handoff-or-original-attempt).
