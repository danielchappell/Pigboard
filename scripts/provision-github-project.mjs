import {
  formatProvisioningPlan,
  GitHubProjectsAdapter,
  provisionGitHubProject
} from "../src/index.js";

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const owner = process.env.GITHUB_OWNER ?? process.env.GITHUB_ORG;
const projectNumber = process.env.GITHUB_PROJECT_NUMBER;
const apply = process.argv.includes("--apply");

if (!token || !owner || !projectNumber) {
  console.error(`Missing required environment.

Required:
  GITHUB_TOKEN or GH_TOKEN
  GITHUB_OWNER
  GITHUB_PROJECT_NUMBER

Flags:
  --apply    Create missing fields and add missing options. Without this flag, print the plan only.
`);
  process.exit(2);
}

const adapter = new GitHubProjectsAdapter({
  token,
  owner,
  projectNumber,
  itemsFirst: 1
});

const result = await provisionGitHubProject({ adapter, apply });
console.log(formatProvisioningPlan(result.plan));
if (result.applied) console.log("\nApplied GitHub Project schema changes.");
if (!apply && result.plan.needsChanges) {
  console.log("\nRe-run with --apply to make these changes.");
}
