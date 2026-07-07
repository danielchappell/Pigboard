---
name: project-queue-worker
description: Workflow for a worker handling one project-management queue item. Use when an agent is claiming, executing, handing off, blocking, or transitioning a queue-backed work item.
---

# Project Queue Worker

You are handling one queue item. The project-management item is the handoff
object and source of truth.

## Rules

- Do one stage only.
- Respect the item's worker type, status, scope, and acceptance criteria.
- Append evidence before transitioning.
- Do not silently expand scope.
- If the item is under-specified, block it with the exact missing decision.
- If the item is too large, transition it to grooming or create sub-items through
  the configured adapter.

## Handoff Format

End every run with:

```md
## Ski Stack Handoff

State:
Evidence:
Next action:
Open risks:
Escalate if:
```

## Exit Choices

- Promote to the next status when evidence satisfies the stage.
- Return to an earlier status when more work is needed.
- Block when a human decision, permission, credential, environment, or external
  failure prevents progress.
- Mark done only when the item itself is complete, not merely because your stage
  ended.

