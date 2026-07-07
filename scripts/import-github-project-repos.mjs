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
import {
  assertGitHubProjectScopes,
  createGraphqlClient,
  formatGitHubAuthError,
  missingGitHubAuthMessage,
  resolveGitHubAuth
} from "./lib/github-auth.mjs";

const execFileAsync = promisify(execFile);
const args = parseArgs(process.argv.slice(2));
const interactive = input.isTTY && output.isTTY && !args.flags.has("no-input");
const auth = await resolveGitHubAuth();

if (!auth?.token) {
  console.error(missingGitHubAuthMessage());
  process.exit(2);
}

const { token } = auth;
const graphql = createGraphqlClient(auth);
const prompts = interactive ? createInterface({ input, output }) : null;

try {
  await assertGitHubProjectScopes(auth);
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
} catch (error) {
  const authMessage = formatGitHubAuthError(error, auth);
  if (!authMessage) throw error;
  console.error(authMessage);
  process.exitCode = 2;
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
