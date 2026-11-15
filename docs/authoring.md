# Check an editable Epic or ticket

This local command checks structure only. It never reads Jira, changes a file,
starts a worker, computes a digest, or establishes semantic/live readiness. The
existing writing skill still uses its installed contract; the structured writer
and complete manager release are separate work.

## Prepare and run

Use Node.js 20+. For a source checkout, prepare the locked dependencies once with
`npm ci --ignore-scripts --no-audit --no-fund`, then run from that checkout:

```sh
node scripts/validate-work.mjs --mode draft --input docs/architecture/examples/manager-ticket.yaml
node scripts/validate-work.mjs --mode start --input docs/architecture/examples/manager-ticket-populated.yaml --json
node scripts/validate-work.mjs --help
```

For a prepared bundle, take the exact `skills` directory from the preparation
receipt. Replace `/absolute/receipt/skills` and the work-file path below:

```sh
node /absolute/receipt/skills/work-validator/scripts/validate-work.mjs --mode draft --input /absolute/work.yaml --json
node /opt/pigboard/skills/work-validator/scripts/validate-work.mjs --mode start --input /absolute/work.yaml --json
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

Start from the complete [Epic skeleton](architecture/examples/manager-epic.yaml)
or [ticket skeleton](architecture/examples/manager-ticket.yaml). Their populated
[Epic](architecture/examples/manager-epic-populated.yaml) and
[ticket](architecture/examples/manager-ticket-populated.yaml) counterparts are
synthetic shape examples, not authorized targets.

`draft` requires every declared key, including nested keys when an object is
present. Use explicit `null` for unresolved values and `[]` for an empty list.
Non-null supplied values must have the declared type/enum; use null rather than
an empty string. Unknown fields fail, including misspellings inside skill sections.
Draft permits incomplete alternatives, empty lists and open questions; it does
not certify a populated plan. `start` enforces all canonical structural constraints,
including required values, alternatives and no open questions. Optional nulls stay
visible and pass where prescribed. Both modes enforce the same safe value domain.

The canonical [Epic](../contracts/epic-v1.schema.json) and
[ticket](../contracts/ticket-v1.schema.json) schemas are JSON Schema 2020-12.
Draft rules are projected from them, not a second field inventory. Semantic
uniqueness, coverage, reference/dispatch/binding graphs, whitespace-only prose,
installed-skill/customer authority, publication sizing and native readiness are
not evaluated here. A shape-valid document may still fail those later checks.

## Input, limits and diagnostics

Supply `--mode draft|start --input FILE`; `--format yaml` is the default. Input must
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
when unavailable. `readiness` is always `not_evaluated`. `diagnostics` contains
selected-mode failures. In draft mode, `start_diagnostics` lists remaining structure
work; in start mode that array is empty to avoid duplication. Each diagnostic has
a stable code, JSON Pointer path and safe reason, with line/column or zero-based
ADF block index when known. Root is `""`; `~0` and `~1` escape key characters.
Human output safely quotes paths. No values, source snippets or stack traces are
printed. Fix the named field, then rerun; the input stays unchanged. Exit 0 means
selected-mode validity/help, 1 invalid work, 2 usage/read/setup/internal failure.

## Mechanical preparation for R1-01-H01 and H02

These remain human-owned acceptance cases. Developer tests and agent verification
do not claim a human PASS. In the reviewed source checkout, run:

```sh
node --test test/work-syntax.test.mjs
node --test test/skill-distribution.test.mjs test/cursor-environment.test.mjs
```

The named H01 tests run all four reviewed examples in both modes and formats of
output, fill exactly the first missing acceptance requirement in a disposable
copy, compare input bytes, and report the disappearing field error. H02 tests build
separate syntax/value/byte/depth/list/ADF fixtures, run the actual CLI with guarded
filesystem/network/process APIs, and compare fixture trees. The output includes
local limit timing/memory and side-effect audit counts. Save the commands, complete
output, tested PR revision and fixture before/after evidence before cleanup.
Installation tests use real copied parser/schema runtime packages offline; helper
service packages are simulated. They do not prove live providers.

For manual inspection run the three source commands above on all four example
paths, replacing `draft` with `start` and adding/removing `--json`. Keep the
complete output and exit status. Copy a skeleton to a disposable directory, fill
only `acceptance_criteria[0].requirement`, rerun both modes and compare that exact
path with remaining failures. The validator writes nothing. Retain evidence, then
remove disposable fixtures/build outputs without changing live records/resources.
