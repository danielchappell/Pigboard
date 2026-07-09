export function buildWorkerPrompt({ item, workerRole, claim, feedbackContext }) {
  return [
    `# Ski Stack Worker Run`,
    ``,
    `You are running the \`${item.workerType}\` stage for one queue item.`,
    `Do exactly this stage. Do not silently expand scope or spawn a broader org.`,
    ``,
    `## Claim`,
    `- Claim id: ${claim.id}`,
    `- Lease owner: ${claim.owner}`,
    `- Lease expires: ${claim.expiresAt}`,
    ``,
    `## Work Item`,
    `- Id: ${item.id}`,
    `- Title: ${item.title}`,
    `- Status: ${item.status}`,
    `- Priority: ${item.priority ?? "unset"}`,
    ``,
    `## Body`,
    item.body ?? "",
    ``,
    ...(feedbackContext
      ? [
          `## Pull Request Feedback`,
          formatFeedbackContext(feedbackContext),
          ``
        ]
      : []),
    ``,
    `## Worker Role`,
    workerRole ?? "No role card supplied.",
    ``,
    `## Required Output`,
    `Return a JSON-compatible result with outcome, nextStatus, summary, evidence, and blocker.`,
    `Only pr-babysitter may include mergeWhenApprovedAndClean=true when asking the harness to merge a clean-CI, mergeable PR with review approval or PR-description thumbs-up before QA.`
  ].join("\n");
}

function formatFeedbackContext(feedbackContext) {
  if (typeof feedbackContext === "string") return feedbackContext;
  return JSON.stringify(feedbackContext, null, 2);
}
