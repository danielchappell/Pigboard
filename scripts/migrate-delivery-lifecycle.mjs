import { GitHubProjectsAdapter, planDeliveryLifecycleMigration, Status } from "../src/index.js";

const apply = process.argv.includes("--apply");
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const owner = process.env.GITHUB_OWNER ?? process.env.GITHUB_ORG;
const projectNumber = process.env.GITHUB_PROJECT_NUMBER;

if (!token || !owner || !projectNumber) {
  throw new Error("GITHUB_TOKEN/GH_TOKEN, GITHUB_OWNER, and GITHUB_PROJECT_NUMBER are required");
}

const adapter = new GitHubProjectsAdapter({
  token,
  owner,
  projectNumber,
  ownerType: process.env.GITHUB_OWNER_TYPE ?? "auto",
  handoffSecret: process.env.SKI_HANDOFF_SECRET,
  trustedAuthorLogin: process.env.SKI_HANDOFF_AUTHOR_LOGIN
});
const snapshot = await adapter.loadQueueSnapshot();
const remoteBranches = new Map();

for (const item of snapshot.items) {
  if (![Status.IMPLEMENTATION, Status.REVIEW].includes(item.status)) continue;
  const branchName = item.contentType === "Issue" && item.number ? `ski/issue-${item.number}` : null;
  const branch = branchName && item.repository
    ? await adapter.loadRemoteBranch({ repository: item.repository, branchName })
    : null;
  if (branch?.headSha) remoteBranches.set(item.id, branch);
}

const changes = planDeliveryLifecycleMigration(snapshot.items, { remoteBranches });
for (const change of changes) {
  if (apply && change.action === "move") await adapter.transition(change.itemId, Status.IMPLEMENTATION_PLANNING);
}

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", changes }, null, 2));
