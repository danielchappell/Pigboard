import assert from "node:assert/strict";
import test from "node:test";

import {
  copyGitHubProject,
  createGitHubProject,
  DEFAULT_GITHUB_PROJECT_TEMPLATE_ID,
  enrollRepositoriesInGitHubProject,
  parseGitHubRepositoryUrl,
  parseRepositoryList,
  resolveProjectOwner,
  setupGitHubProject,
  Status
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

test("copyGitHubProject sends template id, owner id, and title", async () => {
  const calls = [];
  const project = await copyGitHubProject({
    ownerId: "OWNER_1",
    templateProjectId: "TEMPLATE_1",
    title: "Delivery Queue",
    graphql: async (query, variables) => {
      calls.push({ query, variables });
      return {
        copyProjectV2: {
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
    projectId: "TEMPLATE_1",
    ownerId: "OWNER_1",
    title: "Delivery Queue",
    includeDraftIssues: false
  });
  assert.equal(project.id, "PROJECT_1");
});

test("DEFAULT_GITHUB_PROJECT_TEMPLATE_ID points to the canonical template", () => {
  assert.equal(DEFAULT_GITHUB_PROJECT_TEMPLATE_ID, "PVT_kwHOAFTxNM4Bcv6K");
});

test("setupGitHubProject copies from a template when provided", async () => {
  const calls = [];
  const result = await setupGitHubProject({
    owner: "acme",
    ownerType: "organization",
    title: "Delivery Queue",
    templateProjectId: "TEMPLATE_1",
    adapterFactory: () => fakeAdapter(),
    graphql: async (query, variables) => {
      calls.push({ query, variables });
      if (variables.owner) {
        return {
          organization: {
            id: "OWNER_1",
            login: "acme",
            __typename: "Organization"
          },
          user: null
        };
      }
      return {
        copyProjectV2: {
          projectV2: {
            id: "PROJECT_1",
            number: 12,
            title: "Delivery Queue",
            url: "https://github.com/orgs/acme/projects/12"
          }
        }
      };
    }
  });

  assert.equal(result.createdFromTemplate, true);
  assert.equal(result.project.id, "PROJECT_1");
  assert.equal(calls[1].variables.input.projectId, "TEMPLATE_1");
});

test("setupGitHubProject creates a project without a template", async () => {
  const calls = [];
  const result = await setupGitHubProject({
    owner: "acme",
    ownerType: "organization",
    title: "Delivery Queue",
    adapterFactory: () => fakeAdapter(),
    graphql: async (query, variables) => {
      calls.push({ query, variables });
      if (variables.owner) {
        return {
          organization: {
            id: "OWNER_1",
            login: "acme",
            __typename: "Organization"
          },
          user: null
        };
      }
      return {
        createProjectV2: {
          projectV2: {
            id: "PROJECT_1",
            number: 12,
            title: "Delivery Queue",
            url: "https://github.com/orgs/acme/projects/12"
          }
        }
      };
    }
  });

  assert.equal(result.createdFromTemplate, false);
  assert.equal(calls[1].variables.input.ownerId, "OWNER_1");
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
    projectModel: defaultProjectModel(),
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
      if (variables.input?.fieldId) {
        return {
          updateProjectV2ItemFieldValue: {
            projectV2Item: {
              id: variables.input.itemId
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
    calls.filter((call) => call.input?.contentId).map((call) => call.input.contentId),
    ["ISSUE_1", "PR_1"]
  );
  assert.deepEqual(
    calls.filter((call) => call.input?.fieldId).map((call) => ({
      itemId: call.input.itemId,
      fieldId: call.input.fieldId,
      value: call.input.value.singleSelectOptionId
    })),
    [
      { itemId: "PVTI_ISSUE_1", fieldId: "field_status", value: "status_todo" },
      { itemId: "PVTI_ISSUE_1", fieldId: "field_priority", value: "priority_p3" },
      { itemId: "PVTI_PR_1", fieldId: "field_status", value: "status_todo" },
      { itemId: "PVTI_PR_1", fieldId: "field_priority", value: "priority_p3" }
    ]
  );
});

function fakeAdapter(projectModel = defaultProjectModel()) {
  return {
    projectModel,
    loadProjectItems: async () => ({ projectModel, items: [] }),
    graphql: async () => {
      throw new Error("fake adapter graphql should not be called for a complete schema");
    }
  };
}

function defaultProjectModel() {
  return {
    id: "PROJECT_1",
    fields: new Map([
      singleSelectField("Status", "field_status", [
        [Status.TODO, "status_todo"],
        [Status.PLANNING, "status_planning"],
        [Status.ARCHITECTURE, "status_architecture"],
        [Status.GROOMING, "status_grooming"],
        [Status.READY, "status_ready"],
        [Status.IMPLEMENTATION_PLANNING, "status_implementation_planning"],
        [Status.IMPLEMENTATION, "status_implementation"],
        [Status.QA, "status_qa"],
        [Status.REVIEW, "status_review"],
        [Status.BABYSIT, "status_babysit"],
        [Status.READY_FOR_OWNER, "status_ready_for_owner"],
        [Status.BLOCKED, "status_blocked"],
        [Status.DONE, "status_done"],
        [Status.CANCELED, "status_canceled"]
      ]),
      singleSelectField("Worker Type", "field_worker_type", [
        ["planner", "worker_planner"],
        ["architect", "worker_architect"],
        ["groomer", "worker_groomer"],
        ["implementation-planner", "worker_implementation_planner"],
        ["implementer", "worker_implementer"],
        ["qa", "worker_qa"],
        ["reviewer", "worker_reviewer"],
        ["pr-babysitter", "worker_pr_babysitter"],
        ["researcher", "worker_researcher"]
      ]),
      singleSelectField("Priority", "field_priority", [
        ["P0", "priority_p0"],
        ["P1", "priority_p1"],
        ["P2", "priority_p2"],
        ["P3", "priority_p3"]
      ]),
      plainField("Lease Owner", "field_lease_owner", "TEXT"),
      plainField("Lease Expires", "field_lease_expires", "TEXT"),
      plainField("Attempts", "field_attempts", "NUMBER"),
      plainField("Last Worker Run", "field_last_worker_run", "TEXT"),
      plainField("PR", "field_pr", "TEXT"),
      plainField("Epic", "field_epic", "TEXT")
    ])
  };
}

function singleSelectField(name, id, options) {
  return [
    name,
    {
      id,
      name,
      dataType: "SINGLE_SELECT",
      options: new Map(options),
      optionsList: options.map(([optionName, optionId]) => ({ id: optionId, name: optionName }))
    }
  ];
}

function plainField(name, id, dataType) {
  return [name, { id, name, dataType, options: new Map(), optionsList: [] }];
}
