# One retained implementation plan

Use the caller's authorized evidence destination. Keep this artifact behind the
existing handoff's plan reference; do not add fields to the canonical handoff.

Record the artifact version, assignment reference, requirements digest, repository
and branch, source/base commits, prepared bundle revision and creation time. If
planning from local changes, include their complete tree identity and provenance.
Hash the finished plan bytes. The independent review must bind to that exact hash
and its inputs; the author cannot infer a review receipt from a prior CLEAN label.

## Context

Name the affected flow, actual callers, canonical examples, suitable reuse and
constraints. Cite the inspected source. Identify material uncertainty explicitly.

## Design

State behavior, ownership, contracts and relevant failure/recovery decisions.
Explain consequential alternatives briefly. Distinguish binding decisions from
ordinary implementation choices. Reference an unchanged accepted design instead
of repeating it, with the reason it still applies.

## Steps

Order complete changes by dependency. Name each outcome, intended paths and useful
checkpoint. Map requirements to steps without turning every edit into a task.

## Verification

Map requirements and affected consumers to meaningful existing or new checks.
State prerequisites, commands/journeys, expected results and final repository
gates. Planned checks are not executed results. Specify how results will bind to
the final code revision and where the repeatable recipe belongs.

## Documentation and preparation

Identify affected human/agent guides, help and examples. Explain when they are
unaffected. Map prescribed case preparation to its declared owner and artifacts;
preserve expected results and case order. Do not invent access or environments.

## Scope and sizing

Record the repository, PR/repair lineage, allowed change boundary, non-goals,
estimated complete file count and human effort, including tests and documentation.
Include any required rollout/compatibility work within that count.

## Open decisions

List only unresolved facts or decisions that matter, their impact and next permitted
action. State none when resolved. Unresolved consequential decisions prevent
DRAFT_COMPLETE; ordinary implementation freedom belongs under Design.

## Author assessment

Find the target repository's accepted principles in its rules and referenced
standards. Cite their sources and assess each principle using the project's names,
groups and required format. Do not impose a fixed count or another project's list.
Explain how each is met, its concrete gap/tradeoff or why it is unaffected. Consider
differences between human and agent use where relevant.

If the project defines no principles, say so; still assess the assignment and
applicable standards. This is the author's assessment, not independent review.
