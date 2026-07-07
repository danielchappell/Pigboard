import { execFile } from "node:child_process";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { promisify } from "node:util";

import {
  enrollRepositoriesInGitHubProject,
  GitHubProjectsAdapter,
  parseGitHubRepositoryUrl,
  parseRepositoryList
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
  const owner = await promptRequired({
    provided: process.env.GITHUB_OWNER ?? process.env.GITHUB_ORG ?? args.options.owner,
    label: "Project owner"
  });
  const projectNumber = await promptRequired({
    provided: process.env.GITHUB_PROJECT_NUMBER ?? args.options.project,
    label: "Project number"
  });
  const repositories = await promptRepositories({
    provided: [process.env.SKI_REPOSITORIES, args.options.repo, args.options.repos],
    localRepository
  });
  const importOpenItems = args.flags.has("no-import")
    ? false
    : parseBoolean(process.env.SKI_IMPORT_OPEN_ITEMS ?? args.options["import-open"] ?? "true");

  if (!repositories.length) {
    console.error("No repositories selected.");
    process.exit(2);
  }

  const adapter = new GitHubProjectsAdapter({
    token,
    owner,
    projectNumber,
    itemsFirst: 1
  });
  const { projectModel } = await adapter.loadProjectItems();
  const results = await enrollRepositoriesInGitHubProject({
    graphql,
    projectId: projectModel.id,
    repositories,
    importOpenItems
  });

  console.log("Repositories imported into GitHub Project:");
  for (const result of results) {
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

async function promptRequired({ provided, label }) {
  if (provided !== undefined && String(provided).trim()) return String(provided).trim();
  if (!prompts) return "";

  const answer = await prompts.question(`${label}: `);
  return answer.trim();
}

async function promptRepositories({ provided, localRepository }) {
  const parsed = parseRepositoryList(provided);
  if (parsed.length) return parsed;
  if (!prompts) return [];

  const defaultLabel = localRepository ?? "none";
  const answer = await prompts.question(
    `Repositories to import, comma-separated [${defaultLabel}]: `
  );
  return parseRepositoryList(answer.trim() || localRepository || "");
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
