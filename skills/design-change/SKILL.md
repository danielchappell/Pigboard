---
name: design-change
description: Choose the behavior, ownership and interfaces for a scoped change using verified codebase context and existing accepted decisions.
---

# Design the change that fits

Use the requirements, accepted decisions, current source and investigation result.
Apply the shared [engineering principles](../engineering-principles/SKILL.md).
Resolve facts that determine the design before treating it as complete. This
method proposes decisions; it neither implements them nor approves itself.

Begin with what the affected human or caller can do and observe. Choose the
existing component that should own the behavior. Describe the smallest extension
that preserves coherent ownership, then cover the relevant contracts:

- Inputs, outputs, state changes and affected callers.
- Conditions that must remain true, including permissions and data ownership.
- Errors, partial success, retries, concurrency or recovery where the change
  actually touches them.
- Compatibility, migration and rollout needed by the agreed scope.

For a consequential choice, compare viable approaches and explain why the selected
one fits. Include extending an existing mechanism when suitable. Do not invent
alternatives, prototypes or a new architecture for an ordinary local fix. If an
accepted design still applies, return **REUSE_EXISTING** with its source and the
reason it covers this change.

Separate binding decisions from ordinary implementation freedom. For example,
“use the tenant-scoped query path and preserve pagination” is binding; an internal
loop variable name is not. Describe observable checks that could disprove the
design, including affected old callers and relevant failure paths.

Return **DESIGNED**, **REUSE_EXISTING** or **UNRESOLVED**. Give the planner the
chosen ownership/reuse points, contracts, relevant failure behavior, rationale,
verification and remaining decisions. A material unknown needs its deciding fact
or bounded discovery, not a speculative code skeleton. A choice outside approved
product intent or scope returns through the caller's existing owner-decision route.
