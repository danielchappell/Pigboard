# Durable review state

Both parent workflows use this record so a fresh Codex or Cursor reviewer can continue without the earlier conversation. Use plain Markdown and repository-relative source references with exact commits. Record conclusions and evidence, not private reasoning or secrets.

## Location and ownership

Use `.cache/pr-review/<ticket-or-pr>/` in the checkout. `.cache/` is already ignored in Plexus. Before writing, confirm the directory is ignored with `git check-ignore` and contains no tracked files with `git ls-files`; never stage or force-add it. In another repository, use its approved ignored location or a private directory outside the checkout.

Keep `index.md` as the current handoff and numbered `round-001.md`, `round-002.md` reports that are never overwritten. Update the index only after a round is saved; an interrupted round cannot replace the last completed result. The parent workflow maintains the index and author responses; the reviewer writes their own report and assessments. Never edit an earlier reviewer verdict. Keep authoritative decisions and shareable evidence in Jira; this cache is a local handoff, not a replacement for Jira or published evidence. For another checkout or machine, explicitly transfer the needed records through an authorized private channel; Git will not carry them.

## Minimum record

The index links the latest completed round and earlier rounds needed to support carried assessments. Each round records the following, directly or through exact references to unchanged records:

- **Identity:** the [core's required inputs](../SKILL.md#inputs-and-scope), rule version/content hash, round and review time.
- **Reviewer:** agent identity, model, reasoning effort and independence from implementation. Record actual settings; unavailable settings are a blocker, not an inferred success.
- **Coverage and evidence:** the [core's working records](../SKILL.md#working-review-records). Distinguish newly examined from carried evidence, recording its originating round/revision and why it remains valid.
- **Findings:** the [core's finding records](../SKILL.md#report-template), with author response, proposed classification, fix commit and test evidence, reviewer disposition and remaining action. Use states such as open, fixed and verified, withdrawn with counterevidence, or awaiting human decision.
- **Outcome:** the [core's report](../SKILL.md#compact-report) and final summary, unresolved gaps, human decisions with source/date/scope, and the next safe action. Preserve the initial issue and resolution for findings from every unclean round.
- **Bitbucket only:** processed comment IDs/update times, source/target snapshot, summary/finding/thread IDs and links, and confirmed publication receipts or uncertain writes. Pending delivery stays pending until verified.

Keep the index short: current identity and verdict, changed inputs, open findings/decisions, evidence links and next action. Link earlier evidence instead of copying it into each round. The final report must be understandable without loading every earlier round.

## Reusing a review safely

A fresh reviewer reads the index, latest report and earlier evidence needed for the current scope. Independently verify the repository, commits, comparison, requirements, rules, coverage and where the evidence came from. Author notes and old PASS labels alone cannot establish a pass. Re-examine anything whose evidence or coverage cannot be verified; mark remaining gaps UNVERIFIED.

Compare old and new source trees, full PR comparisons, target/base, metadata, requirement/rule versions, relevant check results and comment updates. Review new/edited code and comments, fixes, affected unchanged producers/consumers, tests and failure paths. A target change, rebase or rewritten history requires verifying the resulting comparison; matching patch text alone is insufficient. Requirement or rule changes invalidate all affected assessments. Expand to a full review if the affected surface cannot be bounded reliably.

Reuse a check only when its evidence, requirements and assumptions still apply. Show coverage counts for the combined review and this round, distinguishing new work from reused work. Make a second pass over the changes and confirm the combined review covers the full change. The report must satisfy the [core coverage and verdict rules](../SKILL.md#assessments-and-verdict). Do not repeat unchanged tests just for process; old results cannot establish changed behavior.

No relevant input change means no new assessment. If evidence later becomes available, reassess only what it resolves. Persist blockers and stop unchanged retries; do not loop until a reviewer yields a preferred answer.
