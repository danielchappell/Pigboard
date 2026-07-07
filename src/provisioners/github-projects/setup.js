import {
  CREATE_PROJECT_MUTATION,
  RESOLVE_PROJECT_OWNER_QUERY,
  VIEWER_QUERY
} from "../../adapters/github-projects/graphql.js";
import { provisionGitHubProject } from "./provision.js";

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

export async function setupGitHubProject({ graphql, adapterFactory, owner, ownerType, title }) {
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

  return {
    owner: resolvedOwner,
    project,
    provision
  };
}

