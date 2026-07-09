export function buildWorkerPrompt({ item, workerRole, claim }) {
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
    `## Worker Role`,
    workerRole ?? "No role card supplied.",
    ``,
    `## Required Output`,
    `Return a JSON-compatible result with outcome, nextStatus, summary, evidence, and blocker.`,
    `Only pr-babysitter may include qaWhenApprovedAndClean=true when moving an approved, clean PR to QA.`
  ].join("\n");
}
