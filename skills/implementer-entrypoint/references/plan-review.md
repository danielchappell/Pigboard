# Single independent plan reviewer

Read when invoking the plan reviewer. Use exactly one fresh independent reviewer
at the configured High profile per review round; no implementation permissions.
The caller supplies current actual ticket/requirements and fingerprint, plan and
revision/hash, relevant source/base revisions, repository rules, case definitions,
accepted decisions, prior finding dispositions and evidence. Do not provide the
author's conclusion as a substitute for source inspection.

Review request:

```text
Independently adversarially review this exact implementation plan against the
actual Story, current repository and prescribed testing contract. Inspect the
artifacts before accepting any author conclusions. Do not edit code or the ticket.
Check every requirement and plan step for correctness, feasible ordering, scope,
interfaces, failure behavior, tests, docs, security and downstream QA execution.
Check one repository/one PR, <=20 changed files total, and <2 human working days.
Do not add requirements. Optional improvements outside the ticket are deferred.
If satisfying the ticket needs more scope, identify the human decision and stop.

Enumerate the requirement/step/contract review surface, report examined/total
counts, and perform a second sweep for missed findings. Give concrete evidenced
findings with stable IDs, severity, requirement/source references and scope
classification. Distinguish demonstrated issues from speculation. Assess all
seven principles individually using the descriptions below, including human and
agent differences. Return CLEAN or NOT CLEAN for the exact plan/revisions, with
limitations; unavailable evidence or incomplete coverage cannot be CLEAN.
```

The author and reviewer separately assess:

1. **Intuitive:** familiar behavior and sensible defaults for users and maintainers.
2. **Discoverable:** humans can find use/help; agents have explicit inputs/errors.
3. **Delightful experience:** avoid repeated setup, confusing results and needless work.
4. **Token saver:** concise useful handoffs and bounded effort without hiding omissions.
5. **Secure:** preserve credentials, permissions and consequential-action boundaries.
6. **Agents are equal:** noninteractive capability and readable human evidence both work.
7. **Dependable:** success, partial results, failure and recovery remain distinguishable.

Explain how each is met, a concrete gap/tradeoff, or why unaffected. Principles do
not authorize scope expansion. Return reviewer identity and model/effort evidence
under the configured harness profile, exact plan
hash and source/base/requirements fingerprint, coverage, findings, second-sweep
result and verdict. A required scope increase is NOT CLEAN with a human blocker;
no revised scope may be treated as approved. In-scope corrections require an
updated plan and a new independent round. The caller must not convert its own
rebuttal into a CLEAN verdict or accept one based on partial inspection.

For the verified [Cursor Task binding](cursor.md#verified-cursor-task-binding),
distinguish requested model/effort, the parent's accepted Task ID and dispatch
record, setup-observed model evidence, and any actual per-call metadata. The caller
adds the accepted Task receipt when the review returns. If the response omits model
telemetry, say so; do not invent it or ask the reviewer to infer its own model.
Other harnesses retain actual model/effort verification. This evidence route does
not waive independent inspection, fresh review context, coverage or any scope gate.
