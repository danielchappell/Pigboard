# Bitbucket review comments

Read and apply [human-writing](../../human-writing/SKILL.md) for the summary,
[pr-commenting](../../pr-commenting/SKILL.md) for individual comments, and
[review-state](review-state.md) for retained evidence and re-reviews.

Use the verified PR, review inputs and posting authority supplied by the entry
point. Read existing summaries and threads before posting. If there is no relevant
input change, keep the existing review. For discussion only, respond in the
affected threads and update assessments only where the discussion changes them.
Before each write, recheck the reviewed source and target and apply the entry
point's freshness checks.

Post or update one top-level in-progress summary naming the reviewed commit,
then assess. Save the completed review round and update the index only after
the round completes. Interrupted work
cannot replace completed evidence. Verify the private cache is ignored and
untracked or use prepared storage.

Publish each confirmed finding once with the correct diff side and smallest
useful range, or explain why it needs a top-level comment. With Rovito MCP, use
the expected source head, an empty summary and `commented` to publish inline
findings without a second summary or a review decision. Rovito calls the old
diff side `source` and the new side `destination`. Reuse existing threads.
Resolve a finding only after verifying the fix or counterevidence. Retain stable
finding IDs and links to superseded threads. Keep evidence gaps visible in the
report.

Replace the progress summary with the final report. Include the change summary,
grouped file map, eight category rows, coverage and links to verified evidence
and comments. Include all confirmed in-scope findings and pending references.
If editing is known to be unsupported before trying, post a linked replacement.
If an attempted write fails or its result is uncertain, check the exact prior
action once. Continue with distinct remaining actions only if the check confirms
that write. Keep the summary and threads consistent, retain unpublished findings,
and report delivery failures separately from the verdict. Recheck the source and
target after posting and report concurrent changes.
