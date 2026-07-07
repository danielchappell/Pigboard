import { GitHubProjectsAdapter, parseClaimId } from "../src/index.js";

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const owner = process.env.GITHUB_OWNER ?? process.env.GITHUB_ORG;
const projectNumber = process.env.GITHUB_PROJECT_NUMBER;
const claimId = process.env.SKI_CLAIM_ID ?? process.argv[2];

if (!token || !owner || !projectNumber || !claimId) {
  console.error(`Missing required input.

Required environment:
  GITHUB_TOKEN or GH_TOKEN
  GITHUB_OWNER
  GITHUB_PROJECT_NUMBER

Claim id:
  SKI_CLAIM_ID or first positional argument
`);
  process.exit(2);
}

const claim = parseClaimId(claimId);
const adapter = new GitHubProjectsAdapter({
  token,
  owner,
  projectNumber,
  itemsFirst: 1
});

await adapter.release(claimId);
console.log(`Released claim for ${claim.itemId} held by ${claim.workerId}.`);
