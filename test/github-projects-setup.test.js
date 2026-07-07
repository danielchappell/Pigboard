import assert from "node:assert/strict";
import test from "node:test";

import {
  createGitHubProject,
  enrollRepositoriesInGitHubProject,
  parseGitHubRepositoryUrl,
  parseRepositoryList,
  resolveProjectOwner
} from "../src/index.js";

test("resolveProjectOwner defaults to the authenticated viewer", async () => {
  const owner = await resolveProjectOwner({
    graphql: async () => ({
      viewer: {
        id: "USER_1",
        login: "danielchappell"
      }
    })
  });

  assert.deepEqual(owner, {
    id: "USER_1",
    login: "danielchappell",
    type: "User"
  });
});

test("resolveProjectOwner can prefer an organization owner", async () => {
  const owner = await resolveProjectOwner({
    owner: "acme",
    ownerType: "organization",
    graphql: async () => ({
      organization: {
        id: "ORG_1",
        login: "acme",
        __typename: "Organization"
      },
      user: null
    })
  });

  assert.deepEqual(owner, {
    id: "ORG_1",
    login: "acme",
    type: "Organization"
  });
});

test("createGitHubProject sends owner id and title", async () => {
  const calls = [];
  const project = await createGitHubProject({
    ownerId: "OWNER_1",
    title: "Delivery Queue",
    graphql: async (query, variables) => {
      calls.push({ query, variables });
      return {
        createProjectV2: {
          projectV2: {
            id: "PROJECT_1",
            number: 12,
            title: "Delivery Queue",
            url: "https://github.com/users/danielchappell/projects/12"
          }
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].variables.input, {
    ownerId: "OWNER_1",
    title: "Delivery Queue"
  });
  assert.equal(project.number, 12);
});

test("parseRepositoryList accepts names and GitHub remotes", () => {
  assert.deepEqual(
    parseRepositoryList([
      "acme/app, acme/api",
      "git@github.com:acme/docs.git",
      "https://github.com/acme/site.git"
    ]),
    ["acme/app", "acme/api", "acme/docs", "acme/site"]
  );
  assert.equal(parseGitHubRepositoryUrl("ssh://git@github.com/acme/worker.git"), "acme/worker");
});

test("enrollRepositoriesInGitHubProject can import open issues and PRs", async () => {
  const calls = [];
  const results = await enrollRepositoriesInGitHubProject({
    projectId: "PROJECT_1",
    repositories: ["acme/app"],
    importOpenItems: true,
    graphql: async (_query, variables) => {
      calls.push(variables);
      if (variables.input?.contentId) {
        return {
          addProjectV2ItemById: {
            item: {
              id: `PVTI_${variables.input.contentId}`
            }
          }
        };
      }
      if (variables.first) {
        return {
          repository: {
            issues: {
              nodes: [{ id: "ISSUE_1", title: "Issue", number: 1, url: "https://example.test/i/1" }]
            },
            pullRequests: {
              nodes: [{ id: "PR_1", title: "PR", number: 2, url: "https://example.test/p/2" }]
            }
          }
        };
      }
      return {
        repository: {
          id: "REPO_1",
          name: "app",
          nameWithOwner: "acme/app",
          owner: { login: "acme" },
          url: "https://github.com/acme/app"
        }
      };
    }
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].repository.nameWithOwner, "acme/app");
  assert.deepEqual(results[0].imported, {
    issues: 1,
    pullRequests: 1,
    total: 2
  });
  assert.deepEqual(
    calls.filter((call) => call.input?.projectId).map((call) => call.input.contentId),
    ["ISSUE_1", "PR_1"]
  );
});
