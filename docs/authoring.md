# Check an editable Epic or ticket

This local command checks editable structure, complete scheduling declarations
and, with separately supplied trusted execution facts, local start semantics.
It never reads Jira, changes a file, starts a worker, executes tests or establishes
live readiness. The
writing skill now authors versioned
Epic and Story/Bug YAML with full templates and readable requirements. The
structured implementer and reviewer consume current versioned assignments and
canonical receipts. Use the QA contract declared by the selected installed
entrypoint; the basic prose contract applies only to a release that declares it.
Authoring does not activate workers or convert their inputs.

## Author a draft

Read the writing skill and its human-writing sibling first. Supply agreed scope,
native Jira context, exact repository/base and separately prepared trusted facts.
Ask for an Epic, Story/Bug, or a plain-language discovery/design Task. Start from
the full Epic or ticket template; the complete examples show two streams, mixed AI/human cases
and a non-runtime human-only Bug.

Choose the navigation column matching this guide's location. **Source checkout**
means `<repository>/docs/authoring.md`; those links use that checkout's `skills/`.
**Prepared installation** means `<skills>/work-validator/docs/authoring.md`; those
links reach the writer beside `work-validator` in the **same receipt's** `skills`
directory. Both routes work offline; use only the column matching your layout.

| Open | Source checkout only | Prepared installation only |
| --- | --- | --- |
| Reviewer entrypoint | [Source reviewer](../skills/pigboard-pr-review/SKILL.md) | [Installed reviewer](../../pigboard-pr-review/SKILL.md) |
| Writer entrypoint | [Source writer](../skills/write-pr-sized-stories/SKILL.md) | [Installed writer](../../write-pr-sized-stories/SKILL.md) |
| Epic template | [Source Epic](../skills/write-pr-sized-stories/references/epic.yaml) | [Installed Epic](../../write-pr-sized-stories/references/epic.yaml) |
| Ticket template | [Source ticket](../skills/write-pr-sized-stories/references/ticket.yaml) | [Installed ticket](../../write-pr-sized-stories/references/ticket.yaml) |
| Complete briefs, work and contexts | [Source examples](../skills/write-pr-sized-stories/references/pigboard-example.md) | [Installed examples](../../write-pr-sized-stories/references/pigboard-example.md) |

For example, if the preparation receipt gives `/absolute/receipt/skills`, open
`/absolute/receipt/skills/write-pr-sized-stories/SKILL.md`; its references and
`/absolute/receipt/skills/human-writing/SKILL.md` stay together in that release.
Use the versioned receipt path when refresh can overlap the run.

Keep the short title/native fields outside the YAML. Drafting does not publish,
change readiness/status/labels/parent, launch workers or request rework.

Keep every field, optional null and explicit empty list. Use ordinary prose inside
the four familiar sections; selected-skill alternatives become null when complete.
A missing fact stays null with an owned question. Only declared mechanical details
may be deferred to implementation. Unknown scope, access or unavailable QA skills
need resolution, never invented context or silent human reassignment. Split known
oversized work; use a Task for an unknown that determines the split. Each Story/Bug
is one repository/PR, <=20 total files and <2 human working days, including docs.

## Prepare and run

Use Node.js 20+. For a source checkout, prepare the locked dependencies once with
`npm ci --ignore-scripts --no-audit --no-fund`, then run from that checkout:

```sh
node scripts/validate-work.mjs --mode draft --input docs/architecture/examples/manager-ticket.yaml
node scripts/validate-work.mjs --mode structure --input docs/architecture/examples/manager-ticket-populated.yaml --json
node scripts/validate-work.mjs --mode start --input /absolute/work.yaml --context /absolute/facts.yaml --json
node scripts/validate-work.mjs --help
```

For a prepared bundle, take the exact `skills` directory from the preparation
receipt. Replace `/absolute/receipt/skills` and the work-file path below:

```sh
node /absolute/receipt/skills/work-validator/scripts/validate-work.mjs --mode draft --input /absolute/work.yaml --json
node /opt/pigboard/skills/work-validator/scripts/validate-work.mjs --mode start --input /absolute/work.yaml --context /absolute/facts.yaml --json
```

The second command uses the default stable installation. For another install root,
use its returned `stableSkills` path. Commands work from an unrelated directory;
all schemas and dependencies resolve from the prepared payload. Preparation and
verification are described in the repository [installation guide](https://github.com/danielchappell/Pigboard/blob/main/docs/install.md).
The command never downloads or repairs packages. A missing/corrupt source runtime
needs the setup command above; an installed runtime needs preparation/installation
repeated from the reviewed source. A failed refresh retains the previous stable
binding.

## Modes and editable structure

Start from the writer templates in the matching navigation column above. Their
complete examples include separate synthetic contexts; they are not authorized targets. Save raw YAML and
validate that text, preserving numeric parser provenance rather than passing a
reserialized object. Without trusted execution context, use scheduling for complete declarations or
draft/structure for shape, and report start not run. Report actual mode/result and exact missing paths/owners. If the checker
is missing or corrupt, preserve the draft and report setup missing; do not repair
or download dependencies during authoring. Use a versioned receipt path when a
refresh could overlap your run.

`draft` requires every declared key, including nested keys when an object is
present. Use explicit `null` for unresolved values and `[]` for an empty list.
Non-null supplied values must have the declared type/enum; use null rather than
an empty string. Unknown fields fail, including misspellings inside skill sections.
Draft permits incomplete alternatives, empty lists and open questions; it does
not certify a populated plan. `structure` enforces all canonical structural constraints,
including required values, alternatives and no open questions. Optional nulls stay
visible and pass where prescribed. `start` adds local semantic checks and requires
`--context FILE`. `scheduling` adds complete declaration semantics without requiring future execution
facts. It requires `--config CONFIG.yaml --scheduling FACTS.yaml`. All four modes
enforce the same safe value domain. Context is accepted only in start;
configuration/scheduling inputs are accepted only in scheduling.

The canonical [Epic](../contracts/epic-v1.schema.json) and
[ticket](../contracts/ticket-v1.schema.json) schemas are JSON Schema 2020-12.
Draft rules are projected from them, not a second field inventory. Local start checks add uniqueness, AC/TAC coverage, reference/dispatch/binding
graphs, nonblank prose, preparation consumers, supplied scope and installed-skill
allowlists, observation/read-only/duration facts, ownership/cleanup/evidence
requirements and complete-ledger sizing. They check explicit declarations, not
the adequacy of natural-language expectations or observed permissions. Native
state, provider access, admission, prerequisite completion and actual evidence
publication remain separate gates.

## Input, limits and diagnostics

Supply `--mode draft|structure|scheduling|start --input FILE`; `--format yaml` is the default. Input must
be one local regular file, never a URL or stdin. Options cannot repeat; unknown
options and extra arguments fail. A filename beginning with `-` is accepted as an
input option value. Values are never executed or interpolated.

YAML uses 1.2 core types, one nonempty root mapping, string keys and no aliases,
duplicate keys, custom/non-JSON tags or unsupported directives. Integer literals must be
within +/-9007199254740991, including hexadecimal/octal literals. Larger exact
identifiers must be strings. Finite decimals use binary64 representation; quote
values needing exact higher precision. Nonfinite values, invalid UTF-8 and lone
Unicode surrogates fail, including nested input values and SQL parameters.

For JavaScript callers, `checkValue` and `validateValue` reject nonfinite Numbers
and integral Numbers outside the safe-integer range at every depth. Direct JS
values cannot prove whether a Number originated as an integer or floating literal.
These public checks have no option to bypass that rule. `parseWork` returns
ordinary data: passing a parsed `1e20` value separately to `validateValue` therefore
fails the strict JS check, as does mutating parsed data to an unsafe integral
Number. To retain the supported raw finite-floating-literal behavior, call
`validateWork` with the original YAML/ADF text or bytes. That single call checks
integer literal precision in the AST before privately validating the parsed data;
it does not mark returned values as trusted or cache their provenance.

Local immutable budgets: work text at most 65,536 UTF-8 bytes (comments count),
32 nested containers including the root, and 100 items per sequence. For an ADF
JSON envelope: 262,144 UTF-8 bytes, 32 containers, 1,000 items per array and 100
code blocks. Selected YAML keeps the stricter work limits. These are local parser
budgets, not AWS capacity or handoff publication limits. Nothing is truncated.

`--format adf` takes an exported description `{type:"doc",version:1,content:[...]}`.
Only structured `codeBlock` text children are inspected. Exactly one block must
have a top-level `schema` scalar in the `pigboard-epic/` or `pigboard-ticket/`
family, counting unsupported versions too. Ordinary code/prose is context. Language
hints never select a block; a YAML-designated block with unsafe/uninspectable syntax
fails closed rather than being silently skipped. Invalid code-block children fail.
Issue wrappers, HTML and Markdown-fence extraction are unsupported.

JSON mode prints exactly one `pigboard-work-validation/v1` object. `valid` is the
selected mode; `draft_valid` and `start_structure_valid` report both checks or null
when unavailable. `start_semantics_valid` is boolean or null; `validation_scope` is `draft`,
`structure`, `scheduling_declarations` or `local_start`. Scheduling additionally reports
`purpose: scheduling`, `scheduling_semantics_valid` (null before auxiliary validation,
otherwise boolean) and `execution_authorized: false`; its `start_semantics_valid`
stays null. Those extra fields do not change legacy results. `ledger_budget` is null or the sizing summary below.
`readiness` is always `not_evaluated`. `diagnostics` contains
selected-mode failures. In draft mode, `start_diagnostics` lists remaining structure
work; in structure/scheduling/start modes that array is empty to avoid duplication. Each diagnostic has
a stable code, JSON Pointer path and safe reason, with line/column or zero-based
ADF block index when known. Root is `""`; `~0` and `~1` escape key characters.
Human output safely quotes paths. No values, source snippets or stack traces are
printed. Fix the named field, then rerun; the input stays unchanged. Exit 0 means
selected-mode validity/help, 1 invalid work, 2 usage/read/setup/invalid-auxiliary-input/internal failure. Scheduling declaration
errors, including graph/scope failures under `/scheduling`, exit 1. Malformed or
missing configuration/facts exit 2. Context
diagnostics use `/context/...`; structural failures are reported before semantics.

## Check complete scheduling declarations

Use scheduling before execution details exist. For an installed checker, use a
receipt prepared from a reviewed revision containing this mode. Supply the saved work, the
canonical [customer configuration](configuration.md) and a separate closed facts
object with exactly `schema`, `subject`, `prerequisite_graph` and `related_changes`.
The schema is `pigboard-work-scheduling/v1`. `subject` contains nonempty `site`,
`project_id` and `key` strings. `project_id` is the immutable decimal project ID,
at most 255 characters, not its changeable display key. Select the exact site and
project; no default project is chosen. Repository URLs come from its resolved
configuration, including inherited defaults. A declared base branch is required
but this check does not authorize that branch.

`prerequisite_graph` contains `{ticket, prerequisites}` nodes for the subject and
every reachable prerequisite; the subject edges must match work. `related_changes`
contains minimum `{repository, change_story}` obligations to retain in the work.
Use empty lists when none apply. Native acquisition and freshness remain the
caller's responsibility. These declarations do not prove native status, access,
parent/stream ownership, readiness or permission.

The checker shares coverage, dispatch/child/binding order, reference resolution,
preparation consumers, graph/cycle checks, complete-ledger sizing and installed
supported-skill checks with start. SQL bindings name existing inputs and unique
zero-based indices; a declared parameter array must contain null at bound slots.
A valid preparation slot may leave the array unfilled. Asynchronous observations
select one top-level unit, start at zero, increase strictly and leave positive
windows; database units need the known 20-second helper window. Actual reviewed
SQL layout, read-only behavior, operation durations, runtime references, configured
targets, access and branch authority remain start inputs. Do not invent those
facts to obtain a scheduling result.

Scheduling facts use the work limits: 65,536 bytes, depth 32, lists of 100.
Configuration keeps its own limits: 1 MiB, depth 16, lists of 1,000, plus its
schema-specific bounds. `--format adf` changes only the work encoding; both
auxiliary files remain raw YAML/JSON. Work structure is checked before auxiliary
files. Auxiliary errors use `/config` or `/scheduling` paths without a work ADF
block index. Output never includes configuration or secret references.

Raw API:

```js
validateWork(rawWork, {mode: 'scheduling', format: 'yaml', configInput: rawConfig, schedulingInput: rawFacts});
```

Value API:

```js
validateValue(work, {mode: 'scheduling', config, scheduling: facts});
```

Do not mix raw and value auxiliary forms or pass execution context to scheduling.
Direct JS values retain the strict numeric checks described above. Scheduling
reads supplied data only. It does not run tests, acquire native facts, launch work,
change Jira status or make the human Ready to Work decision.

### Runnable synthetic example

From a prepared contributor checkout, create these three complete disposable JSON
inputs. All identities and destinations are synthetic. The human case consumes
an unfilled implementer preparation slot; no execution context is invented.

```sh
pgb159_example_dir=$(mktemp -d)
node --input-type=module - "$pgb159_example_dir" <<'JS'
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
const folder = process.argv[2];
const config = {
  schema: 'pigboard-config/v1', jira: {site: 'https://jira.example.invalid'},
  defaults: {
    stages: {'Ready to Work':'11', 'In Progress':'12', 'In Review':'13', QA:'14',
      'Human Review':'15', 'Rework Queued':'16', Blocked:'17'},
    accepted_later_stage_ids: ['18'], types: {epic:'21', story:'22', bug:'23'},
    actors: {manager:['demo'], implementer:['demo'], reviewer:['demo'], qa:['demo'], human_request:['demo']},
    repositories: ['https://example.invalid/example/application'],
    worker_prefixes: ['AI-Demo-'], opt_in_label: 'pigboard'
  },
  projects: [{id:'10001', key:'EX', board_ids:[], mappings:{},
    inherit:['stages','accepted_later_stage_ids','types','actors','repositories','worker_prefixes','opt_in_label']}]
};
const facts = {
  schema: 'pigboard-work-scheduling/v1',
  subject: {site:config.jira.site, project_id:'10001', key:'EX-1'},
  prerequisite_graph: [{ticket:'EX-1', prerequisites:[]}], related_changes:[]
};
const work = {
  schema:'pigboard-ticket/v1', problem_to_solve:'A new reader needs clear search wording.',
  prerequisites:[], acceptance_criteria:[{id:'AC1', requirement:'A new reader understands the search label.'}],
  technical_acceptance_criteria: {
    repository: {url:config.defaults.repositories[0], base_branch:'main',
      change_boundary:'Search wording only.', out_of_scope:['Changing search behavior.'], related_repositories:[]},
    accepted_decisions:[], constraints:[]
  },
  testing_strategy: {
    testing_types:[], environment:{source:'configured_target', target_reference:'local-review', required_capabilities:[]},
    actors:[], fixtures:[], dispatch_order:[], cases:[],
    preparation:[{id:'PREP-01', owner:'implementer', supplies:'Provide the saved proposed wording artifact for review.',
      used_by:['H1'], preserves:['Keep the agreed search meaning and expected result.']}],
    human_review: {no_ai_cases_reason:'The product reviewer assesses wording.', cases:[{
      id:'H1', execution:'human', owner_role:'Product reviewer', requirements:['AC1'],
      prerequisites:['The proposed wording is available.'], steps:['Read the search label as a new reader.'],
      expected:['The reader understands how to search.'], evidence:['Review comment naming the tested revision.'],
      cleanup:{mode:'none', reason:'Review changes no records.', owner:null, steps:null}
    }]}, automated_regression:'Run the prescribed wording regression checks.'
  }, open_questions:[]
};
for (const [name,value] of Object.entries({work,config,facts}))
  writeFileSync(join(folder,name+'.json'), JSON.stringify(value)+'\n');
JS
node scripts/validate-work.mjs --mode scheduling --input "$pgb159_example_dir/work.json" --config "$pgb159_example_dir/config.json" --scheduling "$pgb159_example_dir/facts.json" --json
node scripts/validate-work.mjs --mode scheduling --input "$pgb159_example_dir/work.json" --config "$pgb159_example_dir/config.json" --scheduling "$pgb159_example_dir/facts.json"
```

Both commands exit 0: scheduling declarations pass, human cases stay pending,
readiness is `not_evaluated` and execution is unauthorized. Strict start with the
same work and no `--context` exits 2; supply the full applicable independently
prepared context to run start. An unfilled, valid mechanical slot can also pass
start when that full context exists; scheduling does not relax start.

For the prepared runtime, replace the checker path with the exact versioned
receipt path and reuse the same three input files:

```sh
node /absolute/receipt/skills/work-validator/scripts/validate-work.mjs --mode scheduling --input "$pgb159_example_dir/work.json" --config "$pgb159_example_dir/config.json" --scheduling "$pgb159_example_dir/facts.json" --json
```

Fix declaration errors at the named field. Supply missing canonical inputs through
their owner; missing runtime is setup work outside delivery. Rerun the affected
check after repair, preserving prior valid evidence. Do not fetch dependencies
inside the delivery run. After retaining evidence, remove only the disposable
example directory, using `rm -r -- "$pgb159_example_dir"`.

### Prepare PGB-159-H01 and H02

PREP-01 uses `test/fixtures/work-semantics.json` at the reviewed PR revision. Its
`scheduling` section holds canonical config, facts, preparation-bearing mixed and
human plans, an asynchronous database variant and the fixed twelve negative
controls. The unchanged `mixed` and `human` roots retain full-start oracles.
`test/work-semantics.test.mjs` applies only this finite inventory and documents the
reachable ledger-overflow construction. The implementer exports the resulting
work, config and facts to a disposable directory before human acceptance. Use
`mixed`, `human` and `negative-01` through `negative-12` in fixture inventory order
as filenames: `<name>-work.json`, `<name>-config.json` and
`<name>-scheduling.json`. Preserve the positive source fixtures unchanged.
Set `pgb159_fixture_dir` to that prepared directory, and `pgb159_checker` first to
the absolute source checker, then to the exact receipt checker. Run both output
forms from an unrelated directory:

```sh
for pgb159_name in mixed human negative-01 negative-02 negative-03 negative-04 negative-05 negative-06 negative-07 negative-08 negative-09 negative-10 negative-11 negative-12; do
  node "$pgb159_checker" --mode scheduling --input "$pgb159_fixture_dir/$pgb159_name-work.json" --config "$pgb159_fixture_dir/$pgb159_name-config.json" --scheduling "$pgb159_fixture_dir/$pgb159_name-scheduling.json" --json
  node "$pgb159_checker" --mode scheduling --input "$pgb159_fixture_dir/$pgb159_name-work.json" --config "$pgb159_fixture_dir/$pgb159_name-config.json" --scheduling "$pgb159_fixture_dir/$pgb159_name-scheduling.json"
done
```

For strict start, the same preparation-bearing work without `--context` must exit 2:

```sh
node "$pgb159_checker" --mode start --input "$pgb159_fixture_dir/mixed-work.json" --json
node "$pgb159_checker" --mode start --input "$pgb159_fixture_dir/human-work.json" --json
```

Use the unchanged full-context controls or a separately reviewed context matching
the complete current preparation-bearing work for a valid start comparison; never
feed execution facts into scheduling.

H01 expects both plans to pass scheduling, strict start to require its full
context, complete ledgers with zero omissions, and truthful purpose/readiness/
execution fields. H02 expects twelve separate exit-1 declaration controls: missing
AC coverage, missing TAC coverage, duplicate dispatch, wrong API child, forward
binding, unknown preparation consumer, unauthorized repository, unsupported skill,
dependency cycle, missing SQL input, invalid observation schedule and exceeded
ledger bound. Each fixture records its expected code/path. Preserve every case,
expectation and evidence obligation; parser rejection cannot count as ledger
coverage. Use the inherited catalogue/history/current-runtime checks for AC3/TAC3;
do not rewrite immutable historical records to match current bytes.

Developer regressions prepare evidence; designated human H01/H02 stay NOT_RUN
until their owners execute them. Retain the revision/pin, exact commands, sanitized
ordered results and observed outcome per control; distinguish simulated fixture
results from actual runtime observations. After evidence is retained, remove only
disposable fixtures/build output. Leave shared setup and live records unchanged.
If a prescribed result remains unavailable after the bounded attempt, record the
unknown and request the authorized human decision rather than retrying indefinitely.

## Prepare trusted local facts

The caller supplies a separate YAML or JSON file matching the closed
[context schema](../contracts/work-validation-context-v1.schema.json). Every field
is required; use `[]` for inapplicable collections and null only where permitted.
It is an invocation snapshot from approved setup/review, not customer configuration,
a freshness guarantee or authority supplied by the work document. Never copy ticket
claims into it as permission. Do not put secrets in either file. Context uses the
same safe parser and 65,536-byte/depth-32/list-100 bounds as work; `--format adf`
selects only the work encoding, not context extraction.

This complete context matches the synthetic all-human fixture below:

```yaml
schema: pigboard-work-validation-context/v1
subject_key: EX-1
repositories:
  - url: https://example.invalid/example/application
    base_branches: [main]
allowed_skills: []
configured_targets: [local-review]
references: []
prerequisite_graph:
  - ticket: EX-1
    prerequisites: []
related_changes: []
operations: []
```

For mixed plans, supply exact approved repository/branch pairs, targets, references,
the complete reachable prerequisite graph and related-change Story obligations.
`context.related_changes` lists caller-supplied obligations: every supplied
`(repository, change_story)` pair must appear unchanged in the work's related
repositories. `[]` supplies no required obligation. This is not a complete approval
list of separate work: a ticket may name additional separate Stories in already
allowed repositories, subject to normal scope review. Those links grant no extra
writes, second PR, launch or completion authority, and this local check does not
prove that the linked tickets exist or are approved. Prerequisites are independent:
when linked work is a dependency, declare it in `prerequisites` and the matching
reachable graph; a `change_story` link alone is neither a dependency edge nor proof
of its completion.

`context.references` checks exact prepared values for actor `identity_reference`,
fixture `reference`, step `prepared_artifact.reference`, database `access_reference`
and a supplied-default UI viewport `reference`. Repository/branch and configured
location checks use `repositories` and `configured_targets` instead.

Related repositories' optional `contract_reference` and ticket/Epic accepted
decisions' optional `reference` fields are supporting citations. They need not
appear in `context.references`; supplied text must still be nonblank. These
citations do not grant access, approve a source, override instructions or become
URLs to fetch. A successful local check does not prove the source exists, is
current or supports the decision; authors and reviewers still assess that content.
Reusing a citation as a fixture, prepared artifact or other runtime reference
requires the corresponding prepared-context membership above.

Allowed QA skills are intersected with the installed manifest; context cannot add
an uninstalled engine. Each AI step, including a Bruno child, needs an operation
fact with `step`, `contract`, `read_only`, `max_duration_seconds` and
`parameter_count`. `contract` is the complete corresponding step object: object
key order is irrelevant, array order matters. Changed work requires newly reviewed
matching facts; a reused step ID cannot reuse stale authority. Duration is a
positive finite bound where needed, otherwise null; parameter count is the reviewed
SQL layout count for database steps, otherwise null. Read-only is an explicit
boolean, never inferred from GET or prose. Database operations must be read-only;
asynchronous operations also need reviewed read-only and duration facts.

Fix work errors at the named field. Missing scope, access references or operation
facts require the caller to prepare the context. Do not widen ticket text to grant
authority. Local checks do not fetch a referenced artifact or verify credentials.
All-human plans still need coverage, scope, ownership, cleanup and ledger checks;
a configured non-runtime review target needs no invented deployment receipt.
Their human cases remain pending, never automated passes.

## Complete-ledger budget

The repository URL copied into the sizing envelope must be a valid URI beginning
with `https://` and at most 2,048 characters. Percent-encode spaces and non-ASCII
path characters (for example, `/saved%20filters` or `/caf%C3%A9`); use an ASCII
punycode hostname where needed. Invalid text is rejected at the repository field
without normalization. This syntax check does not contact or establish access to
the repository.

Local start expands every AI step (including nested helpers), every human case ID
and every prescribed step evidence entry without truncation. It checks the handoff
bounds: 16,384 UTF-8 bytes, container depth 16, 100 entries per list, IDs up to 255
characters and an all-human reason up to 2,000 characters. Parser/context bounds
can reject a document before this phase; that is not a ledger validation result.

The deterministic byte projection is the complete QA envelope in compact JSON
(a supported YAML 1.2 encoding), with one final newline. It uses fixed small valid
assignment/review/PR placeholders and one distinct nonempty placeholder per evidence
obligation. It is a sizing model, never a report, evidence or test PASS. It is not a
minimum over every YAML spelling. Longer real values may fail: actual final records
must be checked again at publication. This command does not publish them.

The summary is `ledger_budget` with `encoding: "json-yaml-1.2"`,
`projection_bytes`, `limit_bytes: 16384`, `ai_steps`, `human_cases`,
`omitted_entries: 0` and `actual_publication: "not_evaluated"`. An overflow names
the affected count/field/budget; rescope through the normal Story process rather
than omitting cases or splitting automatically.

## Mechanical preparation for R1-02-H01, H02 and H03

These three cases remain human-owned and pending until their owners execute them.
Developer tests and agent verification cannot claim a human PASS. From the reviewed
source checkout, prepare disposable mixed and all-human YAML/JSON inputs:

```sh
node --input-type=module -e 'import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import YAML from "yaml"; const fixtures=JSON.parse(fs.readFileSync("test/fixtures/work-semantics.json","utf8")); const dir=fs.mkdtempSync(path.join(os.tmpdir(),"pgb72-human-")); for(const name of ["mixed","human"]) for(const kind of ["work","context"]) { const value=fixtures[name][kind]; fs.writeFileSync(path.join(dir,`${name}-${kind}.json`),JSON.stringify(value)+"\n"); fs.writeFileSync(path.join(dir,`${name}-${kind}.yaml`),YAML.stringify(value)); } console.log(dir);'
```

Use the printed directory as `/absolute/fixture-directory` in these commands:

```sh
node scripts/validate-work.mjs --mode start --input /absolute/fixture-directory/mixed-work.yaml --context /absolute/fixture-directory/mixed-context.yaml --json
node scripts/validate-work.mjs --mode start --input /absolute/fixture-directory/human-work.json --context /absolute/fixture-directory/human-context.json --json
node --test test/work-semantics.test.mjs test/case-graph.test.mjs
```

H01 checks valid mixed/all-human plans and paired coverage, human/child dispatch
and unsupported-skill mutations. H02 exercises namespace/reference/order/binding,
preparation, parameter-layout, trusted-operation, observation and ownership failures
with valid controls. It includes a synchronous database read-only pair with matching
operation contracts, so stale-context rejection cannot mask the read-only rule.
H03 checks exact/+1 projected bytes, complete IDs/evidence obligations, reachable
field/list bounds and isolated sizing guards. More than 100 operation facts fail
the earlier context limit; that CLI ledger-overflow variant is unreachable and must
not be recorded as a ledger PASS. Tests distinguish isolated sizing coverage from
reachable CLI checks. Save complete output, exit statuses, tested revision and
before/after fixture evidence. Retain evidence before removing disposable files.
Neither these commands nor installation tests contact providers or execute cases.

## Mechanical preparation for R1-01-H01 and H02

These remain human-owned acceptance cases. Developer tests and agent verification
do not claim a human PASS. In the reviewed source checkout, run:

```sh
node --test test/work-syntax.test.mjs
node --test test/skill-distribution.test.mjs test/cursor-environment.test.mjs
```

The named H01 tests run all four reviewed examples in draft/structure modes and formats of
output, fill exactly the first missing acceptance requirement in a disposable
copy, compare input bytes, and report the disappearing field error. H02 tests build
separate syntax/value/byte/depth/list/ADF fixtures, run the actual CLI with guarded
filesystem/network/process APIs, and compare fixture trees. The output includes
local limit timing/memory and side-effect audit counts. Save the commands, complete
output, tested PR revision and fixture before/after evidence before cleanup.
Installation tests use real copied parser/schema runtime packages offline; helper
service packages are simulated. They do not prove live providers.

For manual structural inspection run the source draft command on all four example
paths, replacing `draft` with `structure` and adding/removing `--json`. Keep the
complete output and exit status. Copy a skeleton to a disposable directory, fill
only `acceptance_criteria[0].requirement`, rerun draft/structure modes and compare that exact
path with remaining failures. The validator writes nothing. Retain evidence, then
remove disposable fixtures/build outputs without changing live records/resources.

## Prepare the writer's R1-03 human acceptance

R1-03-H01 and H02 remain human-owned and pending until their owners run them.
Developer tests/agent exercises do not supply a human PASS. Use a disposable
folder, save the actual prompt/conversation and first returned work, and record
the tested revision. H01 invokes the writer plus human-writing for the example
Epic with two streams, mixed Story and human-only Bug, using their supplied
briefs and separate synthetic facts. Validate saved raw outputs in draft and
start modes. A human edits one requirement value, reruns, and records whether
the prose is clear and editing needed no structural redesign. Retain commands,
outputs, original/edited bodies and readability observations.

H02 separately omits repository, requests an unavailable QA engine, requires two
repository changes, exceeds 20 files, or reaches two human working days. Save
actual writer outputs and validate any work draft. Expect owned missing inputs,
complete bounded splits when facts permit, or a discovery Task when an unknown
determines scope. Start is not applicable to a non-executable Task; record why.
Never fabricate authority, credentials, routes, skill replacements, state changes
or rework actions. Preserve evidence before removing disposable assets; do not
change live Jira, PRs, deployment or other resources for these exercises.

## Structured helpers and the selected QA entrypoint

Current `qa-api`, `qa-bruno`, `qa-database` and `qa-ui` consume the exact structured
AI steps in a complete start-valid ticket plus separately trusted context. Supply
full operation facts, actual earlier observations and resolved preparation; prose
or a selected YAML fragment is insufficient. API child ownership, two-hop SQL
bindings and UI checkpoints follow the existing schema, with no new fields.
The helpers return observations only and never execute human cases or publish a
canonical QA ledger. The selected installed entrypoint owns its input contract.
Check its compatibility instructions before connecting these helpers into a
delivery loop. Do not infer compatible full-loop delivery from valid authoring or
an isolated helper result.

## Prepare the declared inputs

A `testing_strategy.preparation` slot names one mechanical obligation, its owner,
exact `used_by` consumers and preserved requirements. The implementation receipt's
`prepared_inputs` must cover every slot once with hashed, retrievable artifacts;
its evidence receipt repeats the slot ID and exact consumer order. Review the
actual request/assertions, query/parameter positions, UI checkpoints and extraction
mapping with the full original work and separately trusted context. Keep expected
values separate from actual outputs and caller/access authority.

Record source commit, immutable installed skills/manifest/payload hashes and input
hashes before use. A missing route, mapping, identity/tenant, capability, bound or
proof remains incomplete; name the owner and required fact, preserve results and
resume only the uncompleted authorized work. The source checkout's
`docs/using-pigboard.md#prepare-prescribed-qa-inputs` has the source-only PREP-01
command and existing helper handoff; this fixture guide is not installed.
