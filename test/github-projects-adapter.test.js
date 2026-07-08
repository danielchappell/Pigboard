import assert from "node:assert/strict";
import test from "node:test";

import { createClaimId, GitHubProjectsAdapter, parseClaimId, Status, WorkerType } from "../src/index.js";

test("GitHubProjectsAdapter lists ready items from project fields", async () => {
  const { fetchImpl } = createGraphqlMock([projectResponse()]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const ready = await adapter.listReady(WorkerType.IMPLEMENTER);

  assert.equal(ready.length, 1);
  assert.equal(ready[0].id, "PVTI_item_1");
  assert.equal(ready[0].title, "Implement queue adapter");
  assert.equal(ready[0].status, Status.IMPLEMENTATION);
  assert.equal(ready[0].workerType, WorkerType.IMPLEMENTER);
  assert.equal(ready[0].contentId, "ISSUE_1");
});

test("GitHubProjectsAdapter can load a user-owned project", async () => {
  const { fetchImpl, calls } = createGraphqlMock([userProjectResponse()]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    owner: "danielchappell",
    ownerType: "User",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const ready = await adapter.listReady(WorkerType.IMPLEMENTER);

  assert.equal(ready.length, 1);
  assert.match(calls[0].query, /user\(login: \$owner\)/);
  assert.doesNotMatch(calls[0].query, /organization\(login: \$owner\)/);
});

test("GitHubProjectsAdapter auto-falls back from organization to user owner", async () => {
  const { fetchImpl, calls } = createGraphqlMock([
    {
      errors: [
        {
          message: "Could not resolve to an Organization with the login of 'danielchappell'."
        }
      ]
    },
    userProjectResponse()
  ]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    owner: "danielchappell",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const ready = await adapter.listReady(WorkerType.IMPLEMENTER);

  assert.equal(ready.length, 1);
  assert.match(calls[0].query, /organization\(login: \$owner\)/);
  assert.match(calls[1].query, /user\(login: \$owner\)/);
});

test("GitHubProjectsAdapter can filter ready items by repository", async () => {
  const { fetchImpl } = createGraphqlMock([projectResponse()]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    repositories: "acme/other",
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const ready = await adapter.listReady(WorkerType.IMPLEMENTER);

  assert.equal(ready.length, 0);
});

test("GitHubProjectsAdapter infers worker type from status when Worker Type is blank", async () => {
  const { fetchImpl } = createGraphqlMock([projectResponse({ workerType: null })]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const ready = await adapter.listReady(WorkerType.IMPLEMENTER);

  assert.equal(ready.length, 1);
  assert.equal(ready[0].status, Status.IMPLEMENTATION);
  assert.equal(ready[0].workerType, undefined);
});

test("GitHubProjectsAdapter does not claim another worker status", async () => {
  const { fetchImpl } = createGraphqlMock([
    projectResponse({ status: Status.QA, workerType: null })
  ]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const ready = await adapter.listReady(WorkerType.IMPLEMENTER);

  assert.equal(ready.length, 0);
});

test("GitHubProjectsAdapter treats Worker Type as an override", async () => {
  const { fetchImpl } = createGraphqlMock([
    projectResponse({ status: Status.IMPLEMENTATION, workerType: WorkerType.QA })
  ]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const ready = await adapter.listReady(WorkerType.IMPLEMENTER);

  assert.equal(ready.length, 0);
});

test("GitHubProjectsAdapter claims by writing lease fields", async () => {
  const { fetchImpl, calls } = createGraphqlMock([
    projectResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claim("PVTI_item_1", "worker-1", 1800);

  assert.equal(result.claimed, true);
  assert.equal(result.claim.owner, "worker-1");
  assert.equal(result.claim.expiresAt, "2026-07-07T12:30:00.000Z");
  assert.deepEqual(parseClaimId(result.claim.id), {
    itemId: "PVTI_item_1",
    workerId: "worker-1",
    expiresAt: "2026-07-07T12:30:00.000Z"
  });

  const updates = calls.slice(1).map((call) => call.variables.input);
  assert.deepEqual(
    updates.map((update) => update.fieldId),
    ["field_lease_owner", "field_lease_expires", "field_attempts", "field_last_worker_run"]
  );
  assert.equal(updates[0].value.text, "worker-1");
  assert.equal(updates[1].value.text, "2026-07-07T12:30:00.000Z");
  assert.equal(updates[2].value.number, 1);
  assert.match(updates[3].value.text, /^ski\./);
});

test("GitHubProjectsAdapter releases a claim from a fresh process", async () => {
  const claimId = createClaimId({
    itemId: "PVTI_item_1",
    workerId: "worker-1",
    expiresAt: "2026-07-07T12:30:00.000Z"
  });
  const { fetchImpl, calls } = createGraphqlMock([
    projectResponse({
      leaseOwner: "worker-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: claimId
    }),
    mutationResponse(),
    mutationResponse()
  ]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  await adapter.release(claimId);

  const clears = calls.slice(1).map((call) => call.variables.input);
  assert.deepEqual(
    clears.map((clear) => clear.fieldId),
    ["field_lease_owner", "field_lease_expires"]
  );
});

test("GitHubProjectsAdapter transitions status with a single-select option", async () => {
  const { fetchImpl, calls } = createGraphqlMock([projectResponse(), mutationResponse()]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl
  });

  await adapter.transition("PVTI_item_1", Status.QA);

  const mutationInput = calls[1].variables.input;
  assert.equal(mutationInput.projectId, "PROJECT_1");
  assert.equal(mutationInput.itemId, "PVTI_item_1");
  assert.equal(mutationInput.fieldId, "field_status");
  assert.deepEqual(mutationInput.value, { singleSelectOptionId: "status_qa" });
});

test("GitHubProjectsAdapter appends worker events as comments", async () => {
  const { fetchImpl, calls } = createGraphqlMock([projectResponse(), mutationResponse()]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl
  });

  await adapter.appendEvent("PVTI_item_1", {
    type: "worker_result",
    actor: "worker-1",
    outcome: "completed",
    body: "Implemented the adapter.",
    evidence: ["npm test"]
  });

  const commentInput = calls[1].variables.input;
  assert.equal(commentInput.subjectId, "ISSUE_1");
  assert.match(commentInput.body, /Ski Stack Worker Event/);
  assert.match(commentInput.body, /Outcome: completed/);
  assert.match(commentInput.body, /- npm test/);
});

function createGraphqlMock(responses) {
  const calls = [];

  return {
    calls,
    fetchImpl: async (_url, options) => {
      const call = JSON.parse(options.body);
      calls.push(call);
      const response = responses.shift();
      if (!response) throw new Error("No mocked GraphQL response left");
      return {
        ok: true,
        json: async () => response
      };
    }
  };
}

function mutationResponse() {
  return { data: {} };
}

function projectResponse({
  status = Status.IMPLEMENTATION,
  workerType = WorkerType.IMPLEMENTER,
  leaseOwner = "",
  leaseExpiresAt = "2026-07-07T11:30:00.000Z",
  lastWorkerRun = ""
} = {}) {
  return {
    data: {
      organization: {
        projectV2: {
          id: "PROJECT_1",
          fields: {
            nodes: [
              singleSelectField("field_status", "Status", [
                ["status_ready", Status.READY],
                ["status_implementation", Status.IMPLEMENTATION],
                ["status_qa", Status.QA],
                ["status_blocked", Status.BLOCKED]
              ]),
              singleSelectField("field_worker_type", "Worker Type", [
                ["worker_implementer", WorkerType.IMPLEMENTER],
                ["worker_qa", WorkerType.QA]
              ]),
              singleSelectField("field_priority", "Priority", [["priority_p1", "P1"]]),
              field("field_lease_owner", "Lease Owner", "TEXT"),
              field("field_lease_expires", "Lease Expires", "TEXT"),
              field("field_attempts", "Attempts", "NUMBER"),
              field("field_last_worker_run", "Last Worker Run", "TEXT")
            ]
          },
          items: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                id: "PVTI_item_1",
                isArchived: false,
                content: {
                  __typename: "Issue",
                  id: "ISSUE_1",
                  title: "Implement queue adapter",
                  body: "Adapter body",
                  url: "https://github.com/acme/repo/issues/1",
                  number: 1,
                  repository: { nameWithOwner: "acme/repo" }
                },
                fieldValues: {
                  nodes: [
                    singleSelectValue("Status", status, optionIdForStatus(status)),
                    workerType
                      ? singleSelectValue("Worker Type", workerType, optionIdForWorkerType(workerType))
                      : null,
                    singleSelectValue("Priority", "P1", "priority_p1"),
                    textValue("Lease Owner", leaseOwner),
                    textValue("Lease Expires", leaseExpiresAt),
                    numberValue("Attempts", 0),
                    lastWorkerRun ? textValue("Last Worker Run", lastWorkerRun) : null
                  ].filter(Boolean)
                }
              }
            ]
          }
        }
      }
    }
  };
}

function optionIdForStatus(status) {
  return `status_${status.toLowerCase().replaceAll(" ", "_")}`;
}

function optionIdForWorkerType(workerType) {
  return `worker_${workerType.replaceAll("-", "_")}`;
}

function userProjectResponse() {
  const response = projectResponse();
  response.data.user = response.data.organization;
  response.data.organization = undefined;
  return response;
}

function field(id, name, dataType) {
  return { __typename: "ProjectV2Field", id, name, dataType };
}

function singleSelectField(id, name, options) {
  return {
    __typename: "ProjectV2SingleSelectField",
    id,
    name,
    dataType: "SINGLE_SELECT",
    options: options.map(([optionId, optionName]) => ({ id: optionId, name: optionName }))
  };
}

function fieldRef(name) {
  return { name };
}

function singleSelectValue(fieldName, name, optionId) {
  return {
    __typename: "ProjectV2ItemFieldSingleSelectValue",
    field: fieldRef(fieldName),
    name,
    optionId
  };
}

function textValue(fieldName, text) {
  return {
    __typename: "ProjectV2ItemFieldTextValue",
    field: fieldRef(fieldName),
    text
  };
}

function numberValue(fieldName, number) {
  return {
    __typename: "ProjectV2ItemFieldNumberValue",
    field: fieldRef(fieldName),
    number
  };
}
