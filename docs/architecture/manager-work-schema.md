# Epic and Story schema draft

These two [design schemas](contracts/) describe the structure required before
admission. They do not install a validator, change the story-writing skill or
make a ticket ready by themselves. The [work contract](manager-work-contract.md)
owns readiness and authority; this document resolves field types and lists the
checks that JSON Schema cannot perform.

Use `pigboard-epic-v1.schema.json` for `pigboard-epic/v1` and
`pigboard-ticket-v1.schema.json` for `pigboard-ticket/v1`. Both use JSON Schema
2020-12. Every declared field is present, including nullable fields. Unknown fields
are rejected except inside named input values. Empty strings are never a substitute
for null. The editable YAML skeletons deliberately fail start validation until
completed. This publication does not add a separate draft validator.

## Human editing

The writing skill will produce the full skeleton. Humans edit values in familiar
sections: problem, acceptance criteria, repository and testing strategy. They can
use YAML multiline strings for prose. They need not write escaped JSON or invent
field placement. The future writer must leave optional null fields visible and
replace unused optional lists with `[]`.

One populated example is included as a synthetic illustration of field types. Its
repository, branch, access and fixtures are placeholders, not verified resources
or permission to execute it. Structural acceptance does not validate those facts.

## Types and explicit alternatives

| Fields | Shape |
| --- | --- |
| Problem, outcome, requirement, action, scope explanation, reference | Nonempty string; semantic validation also rejects whitespace-only values |
| Included/excluded scope, expectations, evidence, preconditions, outputs | Lists of strings; required result/evidence lists are nonempty |
| `inputs` | Named JSON-compatible values; no expressions, shell commands or secret values |
| Database `parameters` | Ordered JSON-compatible values for the prepared parameterized SQL; declared `parameter_bindings` map named step inputs to zero-based positions |
| Database `scope` | Tenant or inapplicable null, record selection, allowed columns, maximum rows from 1 to 200 |
| UI `viewport` | Positive width/height with null reference, or `supplied_default` with a receipt reference and null dimensions |
| Async observation | One named top-level read step, a finite elapsed-seconds schedule and explicit `until_expected` or `all_observations` completion |
| Cleanup | `none` with reason and null owner/steps; or `prescribed` with owner, ordered bounded steps and null reason |
| Existing/prepared artifact or route | Exactly one concrete reference/value or named implementer preparation ID; unused alternative stays null |
| `open_questions` | Empty list before start |

Structural shape does not make natural-language requirements executable code.
Workers still assess observed results against the prescribed expectations. The
manager does not ask an AI to interpret scheduling fields.

The release-one database schema deliberately selects PostgreSQL and the bundled
reader via `engine: postgresql` and `reader: qa-database/read-postgres.mjs`. This is
a stable design identifier for the existing helper, resolved by the installed skill;
it is not a new executable path or permission to download a tool. Other engines
remain follow-on work. AWS API observations use prepared `qa-api`/`qa-bruno` cases
when supported; they are not database-skill cases.

An API parent has one `qa-bruno` child. Both are listed in the case's steps; only
the parent appears in `dispatch_order`. Their API contract must agree. Database
and UI steps are top-level. A UI step has no prepared-file requirement, so its
`prepared_artifact` object's two fields are null; its routes, surface and evidence
requirements still must be supplied. Inapplicable `api`, `database` and `ui`
sections are null on a ready ticket, while the blank skeleton shows their fields.

`configured_target` chooses an approved existing target; `pipeline_pr_comment`
chooses the target announced by the pipeline. Both still require the pipeline's
PR-comment receipt to identify the exact target, current deployed PR revision and
readiness before QA, as the handoff contract requires. Configuration selects a
target; it does not replace deployment evidence.

Database bindings have two explicit hops. A step's `bindings` copies a declared
output from an earlier step into a named `inputs` entry. Its database
`parameter_bindings` then copies that input to an exact zero-based SQL parameter
position. The prepared array uses null at that position until binding; an unbound
null remains an intentional SQL null. Each target index is unique, in range and
within the reviewed query's parameter contract. No string substitution or
expression evaluation occurs. A preparation slot must deliver that same declared
parameter layout. The populated example maps the API parent's `record_id` output
to the database step's input, then to parameter index 1.

An asynchronous case contains exactly one top-level read-only observation step,
possibly an API parent with its Bruno child. `observation.step` names that top-level
step; a mutating action or other one-shot work belongs in a separate synchronous
case and precedes it through dispatch/dependency references. The clock starts when
the observation case's prerequisites are ready and its first scheduled dispatch
begins; the first offset must be zero. Execute only the supplied offsets. Never
overlap observations or catch up missed offsets. If an observation finishes after
the next offset or overall deadline, preserve partial evidence and block before
any further observation. Choose the supplied schedule to fit each helper's maximum
operation duration. With
`until_expected`, the first observation meeting all expectations ends successfully;
otherwise the last scheduled observation determines failure. With
`all_observations`, every scheduled observation must meet the expectations and the
entire schedule must complete. A missing access/artifact/evidence prerequisite
blocks immediately. These are prescribed observations, not error retries or a
reason to repeat setup/mutations. Positive offsets cannot exceed the deadline;
operations must fit the remaining deadline and helper limits.

The schema admits the existing all-human proposal only with empty AI cases,
dispatch and testing types, a reason and at least one complete human case. That
proposal still needs final owner review. It does not remove CI or PR review.
`environment` continues to identify the human test target when there are no AI
cases. `automated_regression` describes behavior and test level, or explicitly
states why no automated regression is applicable; it is never an unexplained null.

## Validation after structural parsing

These checks are mandatory in the future validator and remain separate from the
schemas. A schema-valid document is not sufficient to admit work.

1. **Native facts and scope.** Confirm Jira type, Ready to Work/Rework Queued stage,
   parent, full stream label and allowed project. Resolve the exact repository and
   branch within customer configuration. Links, tool names, targets and work text
   cannot expand credentials, hosts, skills, transitions or change boundaries.
2. **Stable identity and uniqueness.** Resolve every Epic ticket key to an accessible
   stable ID; reject duplicate membership and conflicting active Epic ownership.
   Require unique AC/TAC IDs across both requirement lists, and unique case, step,
   actor, fixture, preparation and decision IDs in their namespaces. Human and AI
   case IDs must not collide. Reject whitespace-only strings used as content/IDs.
3. **References and coverage.** Resolve prerequisites without self-links/cycles and
   use `ai_qa_complete` only. Resolve all requirement, actor, fixture, preparation,
   output and step references. Every AC/TAC requirement needs at least one prescribed
   AI or human case; requirement coverage does not imply a test passed. Each related
   repository requiring a change must name its separate change Story.
4. **Execution graph.** Every top-level AI step occurs exactly once in dispatch.
   Each API parent owns exactly its named Bruno child in the same case, whose caller
   names the parent. Children never appear in dispatch or belong to multiple parents.
   API parent/child method, operation, route, actor, selector and expectations agree.
   `testing_types` equals the types used by AI steps (Bruno counts as API). Human
   cases never appear in AI dispatch or bindings. Dependencies and bindings reference
   earlier executed declared outputs, with no cycles or undeclared input names.
   Database parameter mappings resolve those inputs to unique valid parameter
   indices; bound slots are null before binding and populated only from the named
   outputs. API parent outputs must identify corresponding child observations.
5. **Prepared details.** All preparation IDs resolve to implementer-owned slots;
   `used_by` and actual consumers agree. Slots defer only mechanical artifacts or
   routes/selectors/parameter values. They cannot defer expectations, authority,
   identity, skill availability or scope. Existing references must be prepared and
   accessible at the required stage; resolution does not follow arbitrary URLs.
6. **Observation and evidence.** Async offsets increase strictly and do not exceed
   the deadline or configured operation budget. Async cases have exactly one
   top-level read-only observation, named by `observation.step`, with the clock
   origin and completion policy described above. Evidence and screenshot checkpoints
   cover the required results; database rows stay within the current reader's bound.
   Actors, tenancy, cleanup and fixture authority are explicit. Human cases remain
   pending until humans execute them; AI cannot convert its blocked cases to human.
7. **Admission conditions.** Apply current occupancy, five-ticket capacity, priority,
   prerequisite completion, repair lineage and unresolved-intent rules. Parser limits,
   configured scope, live-read completeness and provider checks are independent gates.

No validation step fetches secrets from ticket text or executes its values. JSON
Schema checks only data shape; safe YAML parsing, document byte/depth/list budgets,
semantic validation and live authorization remain required. Final budgets must be
measured in the platform proof, not guessed from this small example.

## Verification and rollout

The local design check `contracts/check_work_examples.py` uses jsonschema 4.25.1
and PyYAML 6.0.3 in a disposable validation environment. It reads the published
examples, validates both schemas, and exercises 48 structural/limitation cases.
It makes no network calls or artifact writes. These are research tooling
dependencies, not the choice of production parser or validator.

Validate the schema documents themselves and exercise positive and negative
structural examples locally. The blank skeletons must parse but fail start
validation. Mutation cases should reject missing required fields, unknown fields,
wrong skill sections, invalid alternatives and mixed human/AI dispatch shapes.
Semantic cases require the future validator and provider evidence; local schema
tests cannot claim them passed.

The authoring skill, validators, separate role handoffs, Story/Bug filters and
worker environment must roll out together with manager writes and delivery
automations disabled. Existing prose tickets are not silently accepted as this
version. The complete Story set remains subject to owner review before building.

## Author assessment

- Intuitive: standard story sections and visible nulls keep editing predictable.
- Discoverable: exact field types and the remaining semantic checks show what a
  human must supply and what a future validator must explain.
- Delightful: one complete skeleton avoids repeated formatting decisions; the
  detailed case structure is a deliberate cost for deterministic execution.
- Token saver: fixed dispatch and named references reduce worker inference, while
  prose requirements preserve the information needed to assess behavior.
- Secure: schemas confer no authority; configured destinations, prepared access
  and semantic validation remain separate checks.
- Agents are equal: machine-checkable structure and human prose share one source;
  human cases remain visible without being counted as AI passes.
- Dependable: structural success, execution readiness and observed success are
  separate; incomplete drafts cannot accidentally become runnable tickets.
- Unified configuration: these are work contracts, not copies of installation
  settings or a second source of secrets and tool authority.
