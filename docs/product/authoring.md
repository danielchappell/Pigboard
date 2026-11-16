# Authoring Epics and executable tickets

The human decides scope and readiness. The writing skill makes that decision clear
and complete for both humans and workers. A worker must not spend a run inventing
the requirements or testing strategy that should have been prepared first.

## Approved role amendment — 16 November 2026

The [role amendment](../delivery/manager-r1/role-amendment.md) replaces the input
coupling described in the retained baseline below. It is an approved target,
not installed behavior: PGB-159 adds scheduling validation; PGB-161/PGB-164 add
the compatible worker checks and preparation.

For A03–A12, admission checks the entire structured declaration: required values,
repository/scope, supported installed skills, AC/TAC coverage, all cases and child
steps, dispatch/dependency order, references, declared preparation, finite
observations and ledgers. It does not require future execution-context facts.
Scheduling success neither establishes full current `start` nor proves a test
passed. The existing strict `draft`, `structure` and `start` meanings remain.
The human still decides when a complete ticket enters Ready to Work.

A09 permits the implementer to fill only declared mechanical slots, including a
route or request artifact that needs code to exist first. Scope, expectations,
permissions and facts required for the next action must already be established;
they cannot be deferred or guessed. Full current start and completed prepared
coverage remain required before READY publication and applicable review/QA work.
Ticket text and validator results never grant action rights.

## Retained requirement baseline

| ID | Required behavior |
| --- | --- |
| A01 | Evolve Pigboard's existing `write-pr-sized-stories`, retaining its source/provenance, plain-language structure, one-repository/one-PR rule, 20-file maximum and under-two-day limit. Split larger work; discovery/design-only work is a Task. |
| A02 | Keep `human-writing` in Pigboard as the writer's reusable dependency. Ship complete skill folders and valid sibling references through the bundle, without copies in every application repository. |
| A03 | The writer emits the complete versioned Epic or Story/Bug YAML skeleton, with visible nullable fields and explicit empty lists. Requirements remain readable prose inside the structure. Drafts may be incomplete; readiness may not. |
| A04 | An Epic records its outcome, included/excluded scope, full numbered workstreams, ordered ticket keys and accepted decisions. Native Jira owns key, title, status and opt-in label. |
| A05 | Each ticket records its problem, AC/TAC requirement IDs, one exact repository, verified intended base branch, change boundary/exclusions, explicit prerequisites and related-repository responsibilities. Other-repository changes require separate linked tickets. |
| A06 | Each ticket contains the full acceptance test plan: stable case IDs, stable AI step IDs, covered requirements, actors/access references, fixtures, prerequisites, ordered actions, expected results, evidence and cleanup. Human steps remain ordered readable instructions. Internal unit-test inventories are separate. |
| A07 | AI cases explicitly name installed approved skills and execution order. Preserve parent/helper relationships: `qa-api` invokes its named `qa-bruno` child once; UI and database steps use their prescribed skills. No agent chooses a replacement engine. |
| A08 | Human test cases occupy a separate section with owner role and complete instructions. They never enter AI dispatch or count as AI passes. Every AC/TAC has AI or human acceptance coverage. |
| A09 | Implementation may fill declared mechanical preparation slots, such as a verified route or prepared request artifact. It may not fill missing scope, test expectations, authority or unavailable skills by guessing. |
| A10 | Standard safe YAML parsing and schema/semantic validation identify the exact missing or invalid field. Reject ambiguous blocks, unsupported versions, duplicate/unknown fields and unresolved references; do not extract scheduling rules with regex or an LLM. |
| A11 | Starting requires a complete contract, no open questions, resolved repository/scope/prerequisites, complete prescribed cases and supported skills. Required nulls fail readiness; optional nulls remain visible. Missing execution artifacts must have valid preparation slots. |
| A12 | The ticket is work data, not authority to expand configured repositories, hosts, permissions, transitions or tools. Credentials never appear in it. Native Jira remains authoritative for type/status/parent/labels. |

The agreed [Epic](../architecture/examples/manager-epic.yaml) and
[ticket](../architecture/examples/manager-ticket.yaml) skeletons, their
[schema guide](../architecture/manager-work-schema.md) and
[semantic contract](../architecture/manager-work-contract.md) provide the exact
fields. These are design assets today. The production authoring/validation change
must keep examples, schemas, skill instructions and error messages consistent.

The validator distinguishes a valid editable draft, an executable ticket and a
test that actually passed. None implies either of the others. A human decides
when to place a complete ticket in Ready to Work; the manager never grooms it.

Explicitly human-only plans are allowed under D01, with a reason, complete human
cases and empty AI dispatch. The skill must not silently convert a blocked AI case
into a human case to continue execution.
