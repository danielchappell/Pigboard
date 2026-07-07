import {
  ADD_PROJECT_ITEM_MUTATION,
  CREATE_PROJECT_MUTATION,
  REPOSITORY_OPEN_ITEMS_QUERY,
  RESOLVE_PROJECT_OWNER_QUERY,
  RESOLVE_REPOSITORY_QUERY,
  VIEWER_QUERY
} from "../../adapters/github-projects/graphql.js";
import { provisionGitHubProject } from "./provision.js";

const REPOSITORY_LIST_SEPARATOR = /[\s,]+/;

export async function resolveProjectOwner({ graphql, owner, ownerType = "auto" }) {
  if (!owner) {
    const data = await graphql(VIEWER_QUERY);
    return {
      id: data.viewer.id,
      login: data.viewer.login,
      type: "User"
    };
  }

  const data = await graphql(RESOLVE_PROJECT_OWNER_QUERY, { owner });
  const organization = data.organization;
  const user = data.user;

  if (ownerType === "organization") {
    if (!organization) throw new Error(`GitHub organization not found: ${owner}`);
    return { id: organization.id, login: organization.login, type: "Organization" };
  }

  if (ownerType === "user") {
    if (!user) throw new Error(`GitHub user not found: ${owner}`);
    return { id: user.id, login: user.login, type: "User" };
  }

  const resolved = organization ?? user;
  if (!resolved) throw new Error(`GitHub owner not found: ${owner}`);
  return {
    id: resolved.id,
    login: resolved.login,
    type: resolved.__typename === "Organization" ? "Organization" : "User"
  };
}

export async function createGitHubProject({ graphql, ownerId, title }) {
  if (!ownerId) throw new Error("ownerId is required");
  if (!title) throw new Error("title is required");

  const data = await graphql(CREATE_PROJECT_MUTATION, {
    input: {
      ownerId,
      title
    }
  });

  return data.createProjectV2.projectV2;
}

export function parseRepositoryList(value) {
  const values = Array.isArray(value) ? value : [value];
  const repositories = [];
  const seen = new Set();

  for (const item of values) {
    if (!item) continue;
    for (const candidate of String(item).split(REPOSITORY_LIST_SEPARATOR)) {
      if (!candidate) continue;
      const repository = normalizeRepositoryName(candidate);
      if (seen.has(repository)) continue;
      seen.add(repository);
      repositories.push(repository);
    }
  }

  return repositories;
}

export function normalizeRepositoryName(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) throw new Error("repository is required");

  const fromUrl = parseGitHubRepositoryUrl(trimmed);
  const repository = fromUrl ?? trimmed.replace(/^@/, "").replace(/\.git$/, "");
  const parts = repository.split("/");
  if (parts.length !== 2 || parts.some((part) => !part)) {
    throw new Error(`GitHub repository must be OWNER/REPO: ${value}`);
  }

  return `${parts[0]}/${parts[1]}`;
}

export function parseGitHubRepositoryUrl(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;

  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) return `${sshMatch[1]}/${sshMatch[2]}`;

  const sshUrlMatch = trimmed.match(/^ssh:\/\/git@github\.com\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshUrlMatch) return `${sshUrlMatch[1]}/${sshUrlMatch[2]}`;

  const httpsMatch = trimmed.match(/^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (httpsMatch) return `${httpsMatch[1]}/${httpsMatch[2]}`;

  return null;
}

export async function resolveGitHubRepository({ graphql, repository }) {
  const nameWithOwner = normalizeRepositoryName(repository);
  const [owner, name] = nameWithOwner.split("/");
  const data = await graphql(RESOLVE_REPOSITORY_QUERY, { owner, name });
  if (!data.repository) throw new Error(`GitHub repository not found: ${nameWithOwner}`);

  return {
    id: data.repository.id,
    name: data.repository.name,
    nameWithOwner: data.repository.nameWithOwner,
    owner: data.repository.owner?.login ?? owner,
    url: data.repository.url
  };
}

export async function listOpenRepositoryItems({ graphql, repository, first = 50 }) {
  const nameWithOwner = normalizeRepositoryName(repository);
  const [owner, name] = nameWithOwner.split("/");
  const data = await graphql(REPOSITORY_OPEN_ITEMS_QUERY, {
    owner,
    name,
    first
  });

  if (!data.repository) throw new Error(`GitHub repository not found: ${nameWithOwner}`);

  return {
    issues: data.repository.issues?.nodes ?? [],
    pullRequests: data.repository.pullRequests?.nodes ?? []
  };
}

export async function addProjectItem({ graphql, projectId, contentId }) {
  if (!projectId) throw new Error("projectId is required");
  if (!contentId) throw new Error("contentId is required");

  const data = await graphql(ADD_PROJECT_ITEM_MUTATION, {
    input: {
      projectId,
      contentId
    }
  });

  return data.addProjectV2ItemById.item;
}

export async function enrollRepositoriesInGitHubProject({
  graphql,
  projectId,
  repositories = [],
  importOpenItems = false,
  importFirst = 50
}) {
  if (!projectId) throw new Error("projectId is required");

  const results = [];
  for (const repository of parseRepositoryList(repositories)) {
    const resolved = await resolveGitHubRepository({ graphql, repository });
    const result = {
      repository: resolved,
      imported: {
        issues: 0,
        pullRequests: 0,
        total: 0
      },
      duplicates: 0
    };

    if (importOpenItems) {
      const openItems = await listOpenRepositoryItems({
        graphql,
        repository: resolved.nameWithOwner,
        first: importFirst
      });
      for (const issue of openItems.issues) {
        const imported = await tryAddProjectItem({ graphql, projectId, contentId: issue.id });
        if (imported) result.imported.issues += 1;
        else result.duplicates += 1;
      }
      for (const pullRequest of openItems.pullRequests) {
        const imported = await tryAddProjectItem({
          graphql,
          projectId,
          contentId: pullRequest.id
        });
        if (imported) result.imported.pullRequests += 1;
        else result.duplicates += 1;
      }
      result.imported.total = result.imported.issues + result.imported.pullRequests;
    }

    results.push(result);
  }

  return results;
}

export async function setupGitHubProject({
  graphql,
  adapterFactory,
  owner,
  ownerType,
  title,
  repositories = [],
  importOpenItems = false,
  importFirst = 50
}) {
  const resolvedOwner = await resolveProjectOwner({ graphql, owner, ownerType });
  const project = await createGitHubProject({
    graphql,
    ownerId: resolvedOwner.id,
    title
  });

  const adapter = adapterFactory({
    owner: resolvedOwner.login,
    projectNumber: project.number
  });
  const provision = await provisionGitHubProject({ adapter, apply: true });
  const enrolledRepositories = await enrollRepositoriesInGitHubProject({
    graphql,
    projectId: project.id,
    repositories,
    importOpenItems,
    importFirst
  });

  return {
    owner: resolvedOwner,
    project,
    provision,
    repositories: enrolledRepositories
  };
}

async function tryAddProjectItem({ graphql, projectId, contentId }) {
  try {
    await addProjectItem({ graphql, projectId, contentId });
    return true;
  } catch (error) {
    if (isDuplicateProjectItemError(error)) return false;
    throw error;
  }
}

function isDuplicateProjectItemError(error) {
  return /already exists|already.*project|duplicate/i.test(error instanceof Error ? error.message : String(error));
}
