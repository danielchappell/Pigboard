---
name: engineering-principles
description: Apply Pigboard's shared engineering judgment when planning, implementing, diagnosing or reviewing a scoped software change.
---

# Work as a collaborating author

Read these rules once when entering the assigned phase. Apply them through that
phase's decisions and evidence; do not produce another checklist or report.
The assignment and target repository own scope and authority. These methods do
not grant tools, access, publication rights or permission to change the project.

## Learn what the code already knows

Trace the affected behavior through its callers, shared modules and tests before
choosing a solution. Find the current, supported pattern; the nearest example may
be deprecated or serve a different purpose. Read the implementation behind a
search result. Use history or version-matched documentation to resolve a fact that
would change the design.

Reuse or extend a suitable mechanism before adding a competing one. Compare its
ownership, permissions, inputs, failure behavior and callers with this task.
A similarly named helper is not necessarily safe to reuse. Explain a consequential
departure from the project's pattern; do not copy a known defect for consistency.

## Make decisions where they belong

Plan the behavior, ownership, interfaces and conditions that must stay true.
Leave ordinary code details to the implementer. Choose the simplest design that
meets the actual requirements and fits its consumers; fewer lines alone do not
make a better design. Avoid speculative frameworks and unrelated cleanup.

An omission within the agreed approach is an implementation decision. A false
assumption that changes the approach needs a revised, independently reviewed plan.
A choice that changes product intent, scope or access needs the existing owner
decision route. Preserve completed work and evidence when returning that decision.

## Diagnose before adding another patch

Follow the failure to the first incorrect decision or state change. Test the
assumption that distinguishes plausible causes. If repeated fixes fail, reconsider
that assumption instead of adding more guards. Preserve legitimate behavior; a
patch that hides the symptom can still break the contract.

## Deliver work that can be checked

Choose intermediate checks when they reduce uncertainty, isolate a mistake or
make recovery cheaper. Checking after every edit is not a rule. Final relevant
author verification is required before handing off a completed change.

Prefer checks of observable behavior and affected consumers. Existing tests may
be enough. Add a useful regression check when a behavior change needs one; use a
failing-before example when practical. Do not add tests merely to restate the code.
Confirm that the intended tests ran: an empty green command proves nothing.

Ship useful tests and a repeatable verification recipe with the change, using the
project's existing locations. Bind results to the code actually checked. Recheck
affected behavior after a fix or conflict resolution. Keep author checks, independent
review, hosted CI and live acceptance distinct, including what remains unverified.
