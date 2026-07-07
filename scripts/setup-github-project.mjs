import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  formatProvisioningPlan,
  GitHubProjectsAdapter,
  setupGitHubProject
} from "../src/index.js";

const execFileAsync = promisify(execFile);

const title = process.env.SKI_PROJECT_TITLE ?? optionValue("--title") ?? "Ski Stack";
const owner = process.env.GITHUB_OWNER ?? process.env.GITHUB_ORG ?? optionValue("--owner");
const ownerType = process.env.GITHUB_OWNER_TYPE ?? optionValue("--owner-type") ?? "auto";
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? (await readGhToken());

if (!token) {
  console.error(`Missing GitHub authentication.

Set GITHUB_TOKEN/GH_TOKEN or authenticate the local GitHub CLI with:
  gh auth login
`);
  process.exit(2);
}

const graphql = createGraphqlClient({ token });

const result = await setupGitHubProject({
  graphql,
  owner,
  ownerType,
  title,
  adapterFactory: ({ owner: resolvedOwner, projectNumber }) =>
    new GitHubProjectsAdapter({
      token,
      owner: resolvedOwner,
      projectNumber,
      itemsFirst: 1
    })
});

console.log(`Created GitHub Project: ${result.project.title}`);
console.log(`URL: ${result.project.url}`);
console.log(`Owner: ${result.owner.login} (${result.owner.type})`);
console.log(`Project number: ${result.project.number}`);
console.log("");
console.log(formatProvisioningPlan(result.provision.plan));
if (result.provision.applied) console.log("Applied Ski Stack Project fields/options.");
console.log("");
console.log("Worker environment:");
console.log(`GITHUB_OWNER=${result.owner.login}`);
console.log(`GITHUB_PROJECT_NUMBER=${result.project.number}`);

function optionValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function readGhToken() {
  try {
    const { stdout } = await execFileAsync("gh", ["auth", "token"]);
    return stdout.trim();
  } catch {
    return undefined;
  }
}

function createGraphqlClient({ token }) {
  return async function graphql(query, variables = {}) {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "ski-stack"
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`GitHub GraphQL request failed: ${response.status}`);
    }

    const payload = await response.json();
    if (payload.errors?.length) {
      throw new Error(payload.errors.map((error) => error.message).join("; "));
    }

    return payload.data;
  };
}

