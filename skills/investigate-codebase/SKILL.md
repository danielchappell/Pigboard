---
name: investigate-codebase
description: Find the existing behavior, reusable code and constraints needed to plan or correct a bounded change in a known repository.
---

# Learn the affected code

Use the caller's requirements, allowed repository, source/base revisions and
specific question. Read applicable project instructions and the shared
[engineering principles](../engineering-principles/SKILL.md). This is source-read-only
investigation; it does not authorize product edits, installation or side effects.

Start from the affected user or caller action. Trace it through the code that
owns the behavior and state. Inspect relevant consumers and tests, including paths
outside the obvious folder. Search for existing utilities and shared modules,
then read them rather than judging names or search snippets.

For each consequential reuse choice, establish:

- Whether this is the current supported pattern and who already uses it.
- Whether its permissions, data contract and failure behavior fit the new use.
- What existing behavior and consumers an extension must preserve.

Use history or recorded decisions when the reason for a boundary matters. Resolve
uncertain external behavior from authoritative documentation for the version in
use. An example or remembered API guarantee is not enough when the design depends
on it. Use only the caller's prepared source/documentation access.

Keep the search proportional. A known local fix does not need a repository-wide
survey. Reuse earlier findings when their source, requirements and assumptions
still match. Stop when the deciding questions are answered, or when a necessary
fact cannot be established with the available access and allowance.

Return **SUFFICIENT** or **UNRESOLVED** with a short context record:

- Inspected revisions, relevant paths, callers and contracts.
- Canonical examples, suitable reuse points and reasons to reject tempting ones.
- Behavior to preserve, answered questions and precise evidence references.
- Any remaining fact that changes design, scope, feasibility or verification.

The planner puts this record in its existing plan. Do not create a second plan,
claim an assumption is verified or resolve a product decision by guessing. If an
executable probe is needed, describe the smallest useful probe and return the
unknown to the caller, which owns permission and its outcome.
