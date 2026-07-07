import { execFile } from "node:child_process";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { promisify } from "node:util";

import {
  formatProvisioningPlan,
  GitHubProjectsAdapter,
  parseGitHubRepositoryUrl,
  parseRepositoryList,
  setupGitHubProject
} from "../src/index.js";

const execFileAsync = promisify(execFile);
const args = parseArgs(process.argv.slice(2));
const interactive = input.isTTY && output.isTTY && !args.flags.has("no-input");
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? (await readGhToken());

if (!token) {
  console.error(`Missing GitHub authentication.

Set GITHUB_TOKEN/GH_TOKEN or authenticate the local GitHub CLI with:
  gh auth login
`);
  process.exit(2);
}

const graphql = createGraphqlClient({ token });
const prompts = interactive ? createInterface({ input, output }) : null;

try {
  const localRepository = await readLocalGitHubRepository();
  const title = await promptValue({
    provided: process.env.SKI_PROJECT_TITLE ?? args.options.title,
    label: "Project title",
    defaultValue: "Ski Stack"
  });
  const owner = await promptValue({
    provided: process.env.GITHUB_OWNER ?? process.env.GITHUB_ORG ?? args.options.owner,
    label: "Project owner",
    defaultValue: "",
    hint: "blank uses the authenticated GitHub user"
  });
  const ownerType = process.env.GITHUB_OWNER_TYPE ?? args.options["owner-type"] ?? "auto";
  const repositories = await promptRepositories({
    provided: [process.env.SKI_REPOSITORIES, args.options.repo, args.options.repos],
    localRepository
  });
  const importOpenItems = await promptImportOpenItems({
    hasRepositories: repositories.length > 0,
    provided: process.env.SKI_IMPORT_OPEN_ITEMS ?? args.options["import-open"],
    disabled: args.flags.has("no-import")
  });

  const result = await setupGitHubProject({
    graphql,
    owner: owner || undefined,
    ownerType,
    title,
    repositories,
    importOpenItems,
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
  printRepositorySummary(result.repositories, importOpenItems);
  console.log("");
  console.log("Worker environment:");
  console.log(`GITHUB_OWNER=${result.owner.login}`);
  console.log(`GITHUB_PROJECT_NUMBER=${result.project.number}`);
  if (repositories.length) console.log(`SKI_REPOSITORIES=${repositories.join(",")}`);
} finally {
  prompts?.close();
}

function parseArgs(argv) {
  const options = {};
  const flags = new Set();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;

    const raw = arg.slice(2);
    const [name, inlineValue] = raw.split("=", 2);
    if (inlineValue !== undefined) {
      appendOption(options, name, inlineValue);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      appendOption(options, name, next);
      index += 1;
    } else {
      flags.add(name);
      options[name] = "true";
    }
  }

  return { options, flags };
}

function appendOption(options, name, value) {
  if (options[name] === undefined) {
    options[name] = value;
    return;
  }
  options[name] = Array.isArray(options[name]) ? [...options[name], value] : [options[name], value];
}

async function promptValue({ provided, label, defaultValue, hint }) {
  if (provided !== undefined) return String(provided);
  if (!prompts) return defaultValue;

  const suffix = hint ? ` (${hint})` : "";
  const answer = await prompts.question(`${label}${suffix} [${defaultValue || "none"}]: `);
  return answer.trim() || defaultValue;
}

async function promptRepositories({ provided, localRepository }) {
  const parsed = parseRepositoryList(provided);
  if (parsed.length) return parsed;
  if (!prompts) return [];

  const defaultLabel = localRepository ?? "none";
  const answer = await prompts.question(
    `Repositories to enroll, comma-separated [${defaultLabel}]: `
  );
  return parseRepositoryList(answer.trim() || localRepository || "");
}

async function promptImportOpenItems({ hasRepositories, provided, disabled }) {
  if (!hasRepositories || disabled) return false;
  if (provided !== undefined) return parseBoolean(provided);
  if (!prompts) return false;

  const answer = await prompts.question("Import current open issues and PRs for those repos? [Y/n]: ");
  return answer.trim() === "" ? true : parseBoolean(answer);
}

function parseBoolean(value) {
  return ["1", "true", "yes", "y", "on"].includes(String(value).trim().toLowerCase());
}

async function readLocalGitHubRepository() {
  try {
    const { stdout } = await execFileAsync("git", ["config", "--get", "remote.origin.url"]);
    return parseGitHubRepositoryUrl(stdout.trim());
  } catch {
    return null;
  }
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

function printRepositorySummary(repositories, importOpenItems) {
  console.log("");
  if (!repositories.length) {
    console.log("Repositories: none enrolled yet.");
    console.log("Add items manually, or run npm run import:github-repos later.");
    return;
  }

  console.log("Repositories:");
  for (const result of repositories) {
    const repo = result.repository.nameWithOwner;
    if (!importOpenItems) {
      console.log(`- ${repo}`);
      continue;
    }
    console.log(
      `- ${repo}: imported ${result.imported.issues} issues, ${result.imported.pullRequests} PRs` +
        (result.duplicates ? `, skipped ${result.duplicates} duplicates` : "")
    );
  }
}
