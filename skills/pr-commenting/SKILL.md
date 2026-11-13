---
name: pr-commenting
description: Write individual PR comments from existing findings. Use when a finding needs a clear, concise explanation for the author. Do not use to review the PR or write summaries or PR descriptions.
metadata:
  source: Daniel Chappell
---

# PR Commenting

Turn review findings into comments the author can understand and act on.

## Use human-writing

First read [human-writing](../human-writing/SKILL.md) and apply its concise, plain-language style.

## Explain the finding

Write to the author as a colleague. Be kind and respectful. Phrase corrections as suggestions, without blame or judgment. Use a short paragraph to explain what triggers the problem, what goes wrong, and the needed correction. Add a regression test suggestion only when it helps verify the fix.

Keep exact code names that help locate or fix the issue. An inline comment already has a code location; repeat it only when useful. Omit investigation history and internal checklist labels unless the required format needs them.


