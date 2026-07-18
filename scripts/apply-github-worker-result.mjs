import { readFile } from "node:fs/promises";

import { applyWorkerResult, GitHubProjectsAdapter } from "../src/index.js";

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const owner = process.env.GITHUB_OWNER ?? process.env.GITHUB_ORG;
const projectNumber = process.env.GITHUB_PROJECT_NUMBER;
const claimId = process.env.SKI_CLAIM_ID ?? process.argv[2];
const resultFile = process.env.SKI_RESULT_FILE ?? process.argv[3];
const handoffSecret = process.env.SKI_HANDOFF_SECRET;

if (!token || !owner || !projectNumber || !claimId) {
  console.error(`Missing required input.

Required environment:
  GITHUB_TOKEN or GH_TOKEN
  GITHUB_OWNER
  GITHUB_PROJECT_NUMBER

Claim id:
  SKI_CLAIM_ID or first positional argument

Result:
  JSON on stdin, SKI_RESULT_FILE, or second positional argument
`);
  process.exit(2);
}

const result = JSON.parse(await readResultInput(resultFile));
const adapter = new GitHubProjectsAdapter({
  token,
  owner,
  projectNumber,
  itemsFirst: 1,
  handoffSecret,
  trustedAuthorLogin: process.env.SKI_HANDOFF_AUTHOR_LOGIN
});

const applied = await applyWorkerResult({ adapter, claimId, result });
console.log(JSON.stringify(applied, null, 2));

async function readResultInput(filePath) {
  if (filePath) return readFile(filePath, "utf8");

  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const input = Buffer.concat(chunks).toString("utf8").trim();
  if (!input) {
    throw new Error("Missing worker result JSON on stdin or in SKI_RESULT_FILE");
  }
  return input;
}
