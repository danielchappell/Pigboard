import assert from "node:assert/strict";
import test from "node:test";

import {
  claimNextAvailable,
  createClaimId,
  createStageHandoff,
  DependencyState,
  formatStageHandoffComment,
  GitHubProjectsAdapter,
  HandoffStage,
  parseClaimId,
  Status,
  WorkerType
} from "../src/index.js";

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

test("GitHubProjectsAdapter normalizes native issue dependencies and source order", async () => {
  const { fetchImpl, calls } = createGraphqlMock([
    projectResponse({
      blockedBy: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [
          blockerNode({ id: "OPEN", number: 2, repository: "other/repo", state: "OPEN" }),
          blockerNode({ id: "DONE", number: 3, state: "CLOSED", stateReason: "COMPLETED" }),
          blockerNode({ id: "CANCELED", number: 4, state: "CLOSED", stateReason: "NOT_PLANNED" }),
          blockerNode({ id: "UNKNOWN", number: 5, state: null, stateReason: null })
        ]
      }
    })
  ]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl
  });

  const snapshot = await adapter.loadQueueSnapshot();

  assert.match(calls[0].query, /blockedBy\(first: 100\)/);
  assert.equal(snapshot.items[0].sourceOrder, 0);
  assert.deepEqual(snapshot.items[0].dependencies.map((dependency) => dependency.state), [
    DependencyState.ACTIVE,
    DependencyState.COMPLETED,
    DependencyState.CANCELED,
    DependencyState.UNKNOWN
  ]);
  assert.equal(snapshot.items[0].dependencies[0].targetId, "OPEN");
  assert.match(snapshot.items[0].dependencies[0].url, /other\/repo\/issues\/2/);
});

test("GitHubProjectsAdapter paginates issue blockedBy relationships", async () => {
  const { fetchImpl, calls } = createGraphqlMock([
    projectResponse({
      blockedBy: {
        pageInfo: { hasNextPage: true, endCursor: "dependency-page-1" },
        nodes: [blockerNode({ id: "OPEN", number: 2, state: "OPEN" })]
      }
    }),
    {
      data: {
        node: {
          blockedBy: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [blockerNode({ id: "DONE", number: 3, state: "CLOSED", stateReason: "COMPLETED" })]
          }
        }
      }
    }
  ]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl
  });

  const snapshot = await adapter.loadQueueSnapshot();

  assert.equal(snapshot.items[0].dependencies.length, 2);
  assert.match(calls[1].query, /SkiStackIssueBlockedBy/);
  assert.equal(calls[1].variables.id, "ISSUE_1");
  assert.equal(calls[1].variables.after, "dependency-page-1");
});

test("GitHubProjectsAdapter preserves Project item order as sourceOrder", async () => {
  const response = projectResponse();
  const first = response.data.organization.projectV2.items.nodes[0];
  const second = structuredClone(first);
  second.id = "PVTI_item_2";
  second.content.id = "ISSUE_2";
  second.content.number = 2;
  second.content.title = "Second item";
  response.data.organization.projectV2.items.nodes.push(second);
  const { fetchImpl } = createGraphqlMock([response]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl
  });

  const snapshot = await adapter.loadQueueSnapshot();

  assert.deepEqual(snapshot.items.map((item) => item.sourceOrder), [0, 1]);
});

test("GitHubProjectsAdapter leaves draft Project items dependency-free", async () => {
  const response = projectResponse();
  response.data.organization.projectV2.items.nodes[0].content = {
    __typename: "DraftIssue",
    id: "DRAFT_1",
    title: "Draft work",
    body: "Not backed by a GitHub issue"
  };
  const { fetchImpl } = createGraphqlMock([response]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl
  });

  const snapshot = await adapter.loadQueueSnapshot();

  assert.deepEqual(snapshot.items[0].dependencies, []);
});

test("GitHubProjectsAdapter loads trusted handoffs with backward pagination and deduplication", async () => {
  const secret = "test-handoff-secret-01234567890123456789";
  const older = createStageHandoff({
    secret,
    repository: "acme/repo",
    issueNumber: 1,
    itemId: "PVTI_item_1",
    stage: HandoffStage.IMPLEMENTATION,
    inputFingerprint: "old-input",
    payload: { summary: "old", branchName: "ski/issue-1", headSha: "a".repeat(40) },
    createdAt: "2026-07-18T11:00:00.000Z"
  });
  const latest = createStageHandoff({
    secret,
    repository: "acme/repo",
    issueNumber: 1,
    itemId: "PVTI_item_1",
    stage: HandoffStage.IMPLEMENTATION,
    inputFingerprint: "new-input",
    payload: { summary: "new", branchName: "ski/issue-1", headSha: "b".repeat(40) },
    createdAt: "2026-07-18T12:00:00.000Z"
  });
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    owner: "acme",
    projectNumber: 7,
    fetchImpl: async () => { throw new Error("unexpected fetch"); },
    handoffSecret: secret,
    trustedAuthorLogin: "ski-daemon"
  });
  adapter.verifyClaim = async () => ({
    active: true,
    claim: { repository: "acme/repo" },
    item: { id: "PVTI_item_1", contentType: "Issue", contentId: "ISSUE_1", number: 1 }
  });
  const cursors = [];
  adapter.graphql = async (_query, variables) => {
    cursors.push(variables.before);
    if (!variables.before) {
      return { node: { comments: {
        nodes: [comment("c2", latest)],
        pageInfo: { hasPreviousPage: true, startCursor: "cursor-2" }
      } } };
    }
    return { node: { comments: {
      nodes: [comment("c1", older), comment("c2", latest)],
      pageInfo: { hasPreviousPage: false, startCursor: null }
    } } };
  };

  const loaded = await adapter.loadStageHandoffsForClaim("claim", {
    stages: [HandoffStage.IMPLEMENTATION]
  });

  assert.deepEqual(cursors, [null, "cursor-2"]);
  assert.equal(loaded.handoffs.length, 1);
  assert.equal(loaded.handoffs[0].commentId, "c2");
  assert.equal(loaded.handoffs[0].envelope.payload.headSha, "b".repeat(40));
});

test("GitHubProjectsAdapter rejects claim-time dependency drift before field writes", async () => {
  const completed = projectResponse({
    blockedBy: {
      pageInfo: { hasNextPage: false, endCursor: null },
      nodes: [blockerNode({ id: "BLOCKER", state: "CLOSED", stateReason: "COMPLETED" })]
    }
  });
  const pending = projectResponse({
    blockedBy: {
      pageInfo: { hasNextPage: false, endCursor: null },
      nodes: [blockerNode({ id: "BLOCKER", state: "OPEN", stateReason: null })]
    }
  });
  const { fetchImpl, calls } = createGraphqlMock([completed, pending]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await claimNextAvailable({
    adapter,
    workerType: WorkerType.IMPLEMENTER,
    workerId: "worker-1",
    leaseSeconds: 1800
  });

  assert.equal(result.claimed, false);
  assert.equal(result.reason, "candidates_changed");
  assert.equal(result.skipped[0].reason, "dependency_pending");
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => String(call.query).includes("projectV2(number: $projectNumber)")));
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

test("GitHubProjectsAdapter infers manual worker types from status when Worker Type is blank", async () => {
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

  const ready = await adapter.listReady(WorkerType.QA);

  assert.equal(ready.length, 1);
  assert.equal(ready[0].status, Status.QA);
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

test("GitHubProjectsAdapter carries PR metadata from issue-backed PR field claims", async () => {
  const responses = [
    projectResponse({
      status: Status.REVIEW,
      workerType: WorkerType.REVIEWER,
      prUrl: "42"
    }),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ];
  const graphql = createGraphqlState(responses);
  const fetchImpl = async (url, options) => {
    if (String(url).endsWith("/repos/acme/repo/pulls/42")) {
      return {
        ok: true,
        json: async () => ({
          number: 42,
          html_url: "https://github.com/acme/repo/pull/42",
          base: { ref: "main", sha: "b".repeat(40) },
          head: { ref: "feature", sha: "a".repeat(40), repo: { full_name: "acme/repo" } }
        })
      };
    }
    return {
      ok: true,
      json: async () => graphql.next(options)
    };
  };
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.REVIEWER,
    workerId: "reviewer-1",
    leaseSeconds: 1800
  });

  assert.equal(result.claimed, true);
  const claim = parseClaimId(result.claim.id);
  assert.equal(claim.pullRequestNumber, 42);
  assert.equal(claim.prUrl, "https://github.com/acme/repo/pull/42");
  assert.equal(claim.headSha, "a".repeat(40));
  assert.equal(claim.headRepository, "acme/repo");
  assert.equal(claim.baseSha, "b".repeat(40));
});

test("GitHubProjectsAdapter rejects cross-repo PR field URLs", async () => {
  const { fetchImpl } = createGraphqlMock([
    projectResponse({
      status: Status.REVIEW,
      workerType: WorkerType.REVIEWER,
      prUrl: "https://github.com/acme/other/pull/42"
    })
  ]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  await assert.rejects(
    () =>
      adapter.claimReadyForWorker({
        itemId: "PVTI_item_1",
        workerType: WorkerType.REVIEWER,
        workerId: "reviewer-1",
        leaseSeconds: 1800
      }),
    /points at acme\/other/
  );
});

test("GitHubProjectsAdapter does not parse non-GitHub PR field URLs", async () => {
  const { fetchImpl } = createGraphqlMock([
    projectResponse({
      status: Status.REVIEW,
      workerType: WorkerType.REVIEWER,
      prUrl: "https://gitlab.example/acme/repo/pull/42"
    })
  ]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const ready = await adapter.listReady(WorkerType.REVIEWER);

  assert.equal(ready[0].prUrl, "https://gitlab.example/acme/repo/pull/42");
  assert.equal(ready[0].pullRequestNumber, undefined);
});

test("GitHubProjectsAdapter preserves fork head repositories on PR content claims", async () => {
  const response = projectResponse({
    status: Status.BABYSIT,
    workerType: WorkerType.PR_BABYSITTER
  });
  const node = response.data.organization.projectV2.items.nodes[0];
  node.content = {
    __typename: "PullRequest",
    id: "PR_42",
    title: "Fork PR",
    body: "Fork body",
    url: "https://github.com/acme/repo/pull/42",
    number: 42,
    baseRefName: "main",
    baseRefOid: "b".repeat(40),
    headRefName: "feature",
    headRefOid: "a".repeat(40),
    headRepository: { nameWithOwner: "contributor/repo" },
    repository: { nameWithOwner: "acme/repo" }
  };
  const { fetchImpl } = createGraphqlMock([
    response,
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

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.PR_BABYSITTER,
    workerId: "babysitter-1",
    leaseSeconds: 1800
  });

  const claim = parseClaimId(result.claim.id);
  assert.deepEqual(result.item.dependencies, []);
  assert.equal(claim.pullRequestNumber, 42);
  assert.equal(claim.headRepository, "contributor/repo");
  assert.equal(claim.headSha, "a".repeat(40));
});

test("GitHubProjectsAdapter does not return claims lost during write/readback", async () => {
  const { fetchImpl } = createGraphqlMock([
    projectResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    projectResponse({
      leaseOwner: "worker-2",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: "other-run"
    })
  ]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.IMPLEMENTER,
    workerId: "worker-1",
    leaseSeconds: 1800
  });

  assert.equal(result.claimed, false);
  assert.equal(result.reason, "owner_mismatch");
});

test("GitHubProjectsAdapter rolls back its lease fields after failed readback", async () => {
  const driftedOwnLeaseResponse = ({ calls }) =>
    projectResponse({
      status: Status.REVIEW,
      workerType: WorkerType.IMPLEMENTER,
      leaseOwner: "worker-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: calls.find((call) => call.variables?.input?.fieldId === "field_last_worker_run")?.variables.input.value.text
    });
  const { fetchImpl, calls } = createGraphqlMock([
    projectResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    driftedOwnLeaseResponse,
    driftedOwnLeaseResponse,
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

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.IMPLEMENTER,
    workerId: "worker-1",
    leaseSeconds: 1800
  });

  assert.equal(result.claimed, false);
  assert.equal(result.reason, "status_changed");
  const clearFieldIds = calls
    .filter((call) => String(call.query).includes("clearProjectV2ItemFieldValue"))
    .map((call) => call.variables.input.fieldId);
  assert.deepEqual(clearFieldIds, ["field_last_worker_run", "field_lease_owner", "field_lease_expires"]);
});

test("GitHubProjectsAdapter re-checks issue-backed PR heads during guarded verification", async () => {
  const responses = [
    projectResponse({
      status: Status.REVIEW,
      workerType: WorkerType.REVIEWER,
      prUrl: "42"
    }),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ];
  const graphql = createGraphqlState(responses);
  let metadataCalls = 0;
  const fetchImpl = async (url, options) => {
    if (String(url).endsWith("/repos/acme/repo/pulls/42")) {
      metadataCalls += 1;
      return {
        ok: true,
        json: async () => ({
          number: 42,
          html_url: "https://github.com/acme/repo/pull/42",
          base: { ref: "main", sha: "b".repeat(40) },
          head: { ref: "feature", sha: (metadataCalls === 1 ? "a" : "c").repeat(40), repo: { full_name: "acme/repo" } }
        })
      };
    }
    return {
      ok: true,
      json: async () => graphql.next(options)
    };
  };
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.REVIEWER,
    workerId: "reviewer-1",
    leaseSeconds: 1800
  });
  responses.push(
    projectResponse({
      status: Status.REVIEW,
      workerType: WorkerType.REVIEWER,
      leaseOwner: "reviewer-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: result.claim.id,
      prUrl: "42"
    })
  );

  const verified = await adapter.verifyClaim(result.claim.id, { requireHeadSha: true });

  assert.equal(verified.active, false);
  assert.equal(verified.reason, "head_drift");
});

test("GitHubProjectsAdapter rejects issue-backed claims when the PR field changes", async () => {
  const responses = [
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      prUrl: "42"
    }),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ];
  const graphql = createGraphqlState(responses);
  const fetchImpl = async (url, options) => {
    if (String(url).endsWith("/repos/acme/repo/pulls/42")) {
      return {
        ok: true,
        json: async () => ({
          number: 42,
          html_url: "https://github.com/acme/repo/pull/42",
          base: { ref: "main", sha: "b".repeat(40) },
          head: { ref: "feature", sha: "a".repeat(40), repo: { full_name: "acme/repo" } }
        })
      };
    }
    return {
      ok: true,
      json: async () => graphql.next(options)
    };
  };
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.PR_BABYSITTER,
    workerId: "babysitter-1",
    leaseSeconds: 1800
  });
  responses.push(
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      leaseOwner: "babysitter-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: result.claim.id,
      prUrl: "43"
    })
  );

  const verified = await adapter.verifyClaim(result.claim.id, { requireHeadSha: true });

  assert.equal(verified.active, false);
  assert.equal(verified.reason, "pr_changed");
});

test("GitHubProjectsAdapter rejects issue-backed claims when the PR field repository changes", async () => {
  const responses = [
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      prUrl: "42"
    }),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ];
  const graphql = createGraphqlState(responses);
  const fetchImpl = async (url, options) => {
    if (String(url).endsWith("/repos/acme/repo/pulls/42")) {
      return {
        ok: true,
        json: async () => ({
          number: 42,
          html_url: "https://github.com/acme/repo/pull/42",
          base: { ref: "main", sha: "b".repeat(40) },
          head: { ref: "feature", sha: "a".repeat(40), repo: { full_name: "acme/repo" } }
        })
      };
    }
    return {
      ok: true,
      json: async () => graphql.next(options)
    };
  };
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.PR_BABYSITTER,
    workerId: "babysitter-1",
    leaseSeconds: 1800
  });
  responses.push(
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      leaseOwner: "babysitter-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: result.claim.id,
      prUrl: "https://github.com/acme/other/pull/42"
    })
  );

  const verified = await adapter.verifyClaim(result.claim.id, { requireHeadSha: true });

  assert.equal(verified.active, false);
  assert.equal(verified.reason, "pr_changed");
});

test("GitHubProjectsAdapter requires approvals on the current PR head before QA", async () => {
  const responses = [
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      prUrl: "42"
    }),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ];
  const fetchImpl = createPrMergeFetchImpl({
    responses,
    reviews: [{ user: { login: "reviewer" }, state: "APPROVED", commit_id: "b".repeat(40) }]
  });
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.PR_BABYSITTER,
    workerId: "babysitter-1",
    leaseSeconds: 1800
  });
  responses.push(
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      leaseOwner: "babysitter-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: result.claim.id,
      prUrl: "42"
    })
  );

  const verified = await adapter.verifyPullRequestReadyForQaForClaim(result.claim.id);

  assert.equal(verified.ready, false);
  assert.equal(verified.reason, "not_approved");
});

test("GitHubProjectsAdapter accepts a PR description thumbs-up reaction before QA", async () => {
  const responses = [
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      prUrl: "42"
    }),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ];
  const fetchImpl = createPrMergeFetchImpl({
    responses,
    reviews: [],
    reactions: [{ user: { login: "maintainer" }, content: "+1" }]
  });
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.PR_BABYSITTER,
    workerId: "babysitter-1",
    leaseSeconds: 1800
  });
  responses.push(
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      leaseOwner: "babysitter-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: result.claim.id,
      prUrl: "42"
    })
  );

  const verified = await adapter.verifyPullRequestReadyForQaForClaim(result.claim.id);

  assert.equal(verified.ready, true);
});

test("GitHubProjectsAdapter loads pull request feedback for worker prompts", async () => {
  const responses = [
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      prUrl: "42"
    }),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ];
  const fetchImpl = createPrMergeFetchImpl({
    responses,
    issueComments: [{ user: { login: "maintainer" }, created_at: "2026-07-07T12:00:00Z", body: "Top-level note" }],
    reviews: [{ user: { login: "reviewer" }, state: "APPROVED", commit_id: "a".repeat(40), body: "Approved" }],
    reviewComments: [
      {
        user: { login: "reviewer" },
        path: "src/runtime/code-loop-worker.js",
        line: 42,
        side: "RIGHT",
        created_at: "2026-07-07T12:01:00Z",
        body: "Fix this review comment"
      }
    ],
    checkRuns: {
      total_count: 1,
      check_runs: [{ name: "unit", status: "completed", conclusion: "failure", html_url: "https://checks.example/unit" }]
    }
  });
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.PR_BABYSITTER,
    workerId: "babysitter-1",
    leaseSeconds: 1800
  });
  responses.push(
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      leaseOwner: "babysitter-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: result.claim.id,
      prUrl: "42"
    })
  );

  const feedback = await adapter.loadPullRequestFeedbackForClaim(result.claim.id);

  assert.equal(feedback.comments[0].body, "Top-level note");
  assert.equal(feedback.reviews[0].state, "APPROVED");
  assert.equal(feedback.reviewComments[0].body, "Fix this review comment");
  assert.equal(feedback.ci.failingCheckRuns[0].name, "unit");
});

test("GitHubProjectsAdapter requires a clean CI run before QA", async () => {
  const responses = [
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      prUrl: "42"
    }),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ];
  const fetchImpl = createPrMergeFetchImpl({
    responses,
    reviews: [{ user: { login: "reviewer" }, state: "APPROVED", commit_id: "a".repeat(40) }],
    status: { total_count: 0, state: "success" },
    checkRuns: { total_count: 0, check_runs: [] }
  });
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.PR_BABYSITTER,
    workerId: "babysitter-1",
    leaseSeconds: 1800
  });
  responses.push(
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      leaseOwner: "babysitter-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: result.claim.id,
      prUrl: "42"
    })
  );

  const verified = await adapter.verifyPullRequestReadyForQaForClaim(result.claim.id);

  assert.equal(verified.ready, false);
  assert.equal(verified.reason, "ci_missing");
});

test("GitHubProjectsAdapter blocks current-head change requests before QA", async () => {
  const responses = [
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      prUrl: "42"
    }),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ];
  const fetchImpl = createPrMergeFetchImpl({
    responses,
    reviews: [{ user: { login: "reviewer" }, state: "CHANGES_REQUESTED", commit_id: "a".repeat(40) }],
    reactions: [{ user: { login: "maintainer" }, content: "+1" }]
  });
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.PR_BABYSITTER,
    workerId: "babysitter-1",
    leaseSeconds: 1800
  });
  responses.push(
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      leaseOwner: "babysitter-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: result.claim.id,
      prUrl: "42"
    })
  );

  const verified = await adapter.verifyPullRequestReadyForQaForClaim(result.claim.id);

  assert.equal(verified.ready, false);
  assert.equal(verified.reason, "changes_requested");
});

test("GitHubProjectsAdapter rejects unmergeable PRs before QA", async () => {
  const responses = [
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      prUrl: "42"
    }),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ];
  const fetchImpl = createPrMergeFetchImpl({
    responses,
    pullRequest: pullRequestResponse({ mergeable: false, mergeable_state: "dirty" }),
    reviews: [{ user: { login: "reviewer" }, state: "APPROVED", commit_id: "a".repeat(40) }]
  });
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.PR_BABYSITTER,
    workerId: "babysitter-1",
    leaseSeconds: 1800
  });
  responses.push(
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      leaseOwner: "babysitter-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: result.claim.id,
      prUrl: "42"
    })
  );

  const verified = await adapter.verifyPullRequestReadyForQaForClaim(result.claim.id);

  assert.equal(verified.ready, false);
  assert.equal(verified.reason, "not_mergeable");
});

test("GitHubProjectsAdapter pages through PR reviews before QA and blocks change requests", async () => {
  const responses = [
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      prUrl: "42"
    }),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ];
  const firstPage = [
    { user: { login: "reviewer" }, state: "APPROVED", commit_id: "a".repeat(40) },
    ...Array.from({ length: 99 }, (_, index) => ({
      user: { login: `reviewer-${index}` },
      state: "COMMENTED",
      commit_id: "a".repeat(40)
    }))
  ];
  const fetchImpl = createPrMergeFetchImpl({
    responses,
    reviews: [firstPage, [{ user: { login: "reviewer" }, state: "CHANGES_REQUESTED", commit_id: "a".repeat(40) }]]
  });
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.PR_BABYSITTER,
    workerId: "babysitter-1",
    leaseSeconds: 1800
  });
  responses.push(
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      leaseOwner: "babysitter-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: result.claim.id,
      prUrl: "42"
    })
  );

  const verified = await adapter.verifyPullRequestReadyForQaForClaim(result.claim.id);

  assert.equal(verified.ready, false);
  assert.equal(verified.reason, "changes_requested");
});

test("GitHubProjectsAdapter preserves change requests when later comments follow", async () => {
  const responses = [
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      prUrl: "42"
    }),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ];
  const fetchImpl = createPrMergeFetchImpl({
    responses,
    reviews: [
      { user: { login: "reviewer" }, state: "CHANGES_REQUESTED", commit_id: "a".repeat(40) },
      { user: { login: "reviewer" }, state: "COMMENTED", commit_id: "a".repeat(40) },
      { user: { login: "maintainer" }, state: "APPROVED", commit_id: "a".repeat(40) }
    ]
  });
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.PR_BABYSITTER,
    workerId: "babysitter-1",
    leaseSeconds: 1800
  });
  responses.push(
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      leaseOwner: "babysitter-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: result.claim.id,
      prUrl: "42"
    })
  );

  const verified = await adapter.verifyPullRequestReadyForQaForClaim(result.claim.id);

  assert.equal(verified.ready, false);
  assert.equal(verified.reason, "changes_requested");
});

test("GitHubProjectsAdapter preserves approvals when later comments follow", async () => {
  const responses = [
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      prUrl: "42"
    }),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ];
  const fetchImpl = createPrMergeFetchImpl({
    responses,
    reviews: [
      { user: { login: "reviewer" }, state: "APPROVED", commit_id: "a".repeat(40) },
      { user: { login: "reviewer" }, state: "COMMENTED", commit_id: "a".repeat(40) }
    ]
  });
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.PR_BABYSITTER,
    workerId: "babysitter-1",
    leaseSeconds: 1800
  });
  responses.push(
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      leaseOwner: "babysitter-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: result.claim.id,
      prUrl: "42"
    })
  );

  const verified = await adapter.verifyPullRequestReadyForQaForClaim(result.claim.id);

  assert.equal(verified.ready, true);
});

test("GitHubProjectsAdapter pages through check runs before QA", async () => {
  const responses = [
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      prUrl: "42"
    }),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ];
  const fetchImpl = createPrMergeFetchImpl({
    responses,
    reviews: [{ user: { login: "reviewer" }, state: "APPROVED", commit_id: "a".repeat(40) }],
    checkRuns: {
      total_count: 101,
      pages: [
        Array.from({ length: 100 }, (_, index) => ({
          name: `check-${index}`,
          status: "completed",
          conclusion: "success"
        })),
        [{ name: "late-check", status: "completed", conclusion: "failure" }]
      ]
    }
  });
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await adapter.claimReadyForWorker({
    itemId: "PVTI_item_1",
    workerType: WorkerType.PR_BABYSITTER,
    workerId: "babysitter-1",
    leaseSeconds: 1800
  });
  responses.push(
    projectResponse({
      status: Status.BABYSIT,
      workerType: WorkerType.PR_BABYSITTER,
      leaseOwner: "babysitter-1",
      leaseExpiresAt: "2026-07-07T12:30:00.000Z",
      lastWorkerRun: result.claim.id,
      prUrl: "42"
    })
  );

  const verified = await adapter.verifyPullRequestReadyForQaForClaim(result.claim.id);

  assert.equal(verified.ready, false);
  assert.equal(verified.reason, "checks_not_clean");
});

test("GitHubProjectsAdapter returns a local PR metadata rejection so the coordinator can try the next item", async () => {
  const response = projectResponse({
    status: Status.REVIEW,
    workerType: WorkerType.REVIEWER,
    prUrl: "404"
  });
  const firstNode = response.data.organization.projectV2.items.nodes[0];
  const secondNode = structuredClone(firstNode);
  secondNode.id = "PVTI_item_2";
  secondNode.content = {
    ...secondNode.content,
    id: "ISSUE_2",
    title: "Review second PR",
    number: 2,
    url: "https://github.com/acme/repo/issues/2"
  };
  secondNode.fieldValues.nodes = secondNode.fieldValues.nodes.map((fieldValue) =>
    fieldValue.field?.name === "PR" ? textValue("PR", "42") : fieldValue
  );
  response.data.organization.projectV2.items.nodes.push(secondNode);

  const responses = [
    response,
    structuredClone(response),
    structuredClone(response),
    mutationResponse(),
    mutationResponse(),
    mutationResponse(),
    mutationResponse()
  ];
  const graphql = createGraphqlState(responses);
  const metadataCalls = [];
  const fetchImpl = async (url, options) => {
    const requestUrl = String(url);
    if (requestUrl.endsWith("/repos/acme/repo/pulls/404")) {
      metadataCalls.push(404);
      return {
        ok: false,
        status: 404,
        json: async () => ({})
      };
    }
    if (requestUrl.endsWith("/repos/acme/repo/pulls/42")) {
      metadataCalls.push(42);
      return {
        ok: true,
        json: async () => ({
          number: 42,
          html_url: "https://github.com/acme/repo/pull/42",
          base: { ref: "main", sha: "b".repeat(40) },
          head: { ref: "feature", sha: "a".repeat(40), repo: { full_name: "acme/repo" } }
        })
      };
    }
    return {
      ok: true,
      json: async () => graphql.next(options)
    };
  };
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  const result = await claimNextAvailable({
    adapter,
    workerType: WorkerType.REVIEWER,
    workerId: "reviewer-1",
    leaseSeconds: 1800
  });

  assert.equal(result.claimed, true);
  assert.equal(result.item.id, "PVTI_item_2");
  assert.deepEqual(metadataCalls, [404, 42]);
});

test("GitHubProjectsAdapter surfaces PR metadata service failures to the coordinator", async () => {
  const response = projectResponse({
    status: Status.REVIEW,
    workerType: WorkerType.REVIEWER,
    prUrl: "500"
  });
  const graphql = createGraphqlState([response, structuredClone(response)]);
  const fetchImpl = async (url, options) => {
    if (String(url).endsWith("/repos/acme/repo/pulls/500")) {
      return { ok: false, status: 500, json: async () => ({}) };
    }
    return { ok: true, json: async () => graphql.next(options) };
  };
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl,
    now: () => new Date("2026-07-07T12:00:00.000Z")
  });

  await assert.rejects(
    claimNextAvailable({
      adapter,
      workerType: WorkerType.REVIEWER,
      workerId: "reviewer-1",
      leaseSeconds: 1800
    }),
    /pull request metadata request failed: 500/
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
    evidence: ["npm test"],
    blocker: "Waiting for approval"
  });

  const commentInput = calls[1].variables.input;
  assert.equal(commentInput.subjectId, "ISSUE_1");
  assert.match(commentInput.body, /Ski Stack Worker Event/);
  assert.match(commentInput.body, /Outcome: completed/);
  assert.match(commentInput.body, /- npm test/);
  assert.match(commentInput.body, /Blocker: Waiting for approval/);
});

test("GitHubProjectsAdapter withholds unsafe public event output", async () => {
  const { fetchImpl, calls } = createGraphqlMock([projectResponse(), mutationResponse()]);
  const adapter = new GitHubProjectsAdapter({
    token: "test-token",
    organization: "acme",
    projectNumber: 7,
    fetchImpl
  });

  await adapter.appendEvent("PVTI_item_1", {
    type: "worker_failed",
    actor: "worker-1",
    outcome: "failed",
    body: "failed in /tmp/ski-secret"
  });

  const commentInput = calls[1].variables.input;
  assert.match(commentInput.body, /output withheld locally/);
  assert.doesNotMatch(commentInput.body, /\/tmp\/ski-secret/);
});

function createGraphqlMock(responses) {
  const graphql = createGraphqlState(responses);

  return {
    calls: graphql.calls,
    fetchImpl: async (_url, options) => {
      return {
        ok: true,
        json: async () => graphql.next(options)
      };
    }
  };
}

function createGraphqlState(responses) {
  const calls = [];
  let latestProjectResponse = null;

  return {
    calls,
    next(options, requestUrl = "https://api.github.com/graphql") {
      const call = JSON.parse(options.body);
      calls.push(call);
      if (latestProjectResponse) applyGraphqlFieldMutation(latestProjectResponse, call);

      const response = responses.shift();
      if (!response) {
        if (isProjectQuery(call) && latestProjectResponse) return structuredClone(latestProjectResponse);
        throw new Error(`No mocked GraphQL response left${requestUrl ? ` for ${requestUrl}` : ""}`);
      }

      const resolved = typeof response === "function" ? response({ call, calls, latestProjectResponse }) : response;
      if (projectFromGraphqlResponse(resolved)) latestProjectResponse = structuredClone(resolved);
      return resolved;
    }
  };
}

function createPrMergeFetchImpl({
  responses,
  pullRequest = pullRequestResponse(),
  reviews = [],
  reactions = [],
  issueComments = [],
  reviewComments = [],
  status = { total_count: 0, state: "success" },
  checkRuns = { total_count: 1, check_runs: [{ name: "ci", status: "completed", conclusion: "success" }] }
}) {
  const graphql = createGraphqlState(responses);
  return async (url, options) => {
    const requestUrl = String(url);
    const parsedUrl = new URL(requestUrl);
    const page = Number(parsedUrl.searchParams.get("page") ?? 1);
    if (parsedUrl.pathname.endsWith("/repos/acme/repo/pulls/42")) {
      return {
        ok: true,
        json: async () => pullRequest
      };
    }
    if (parsedUrl.pathname.endsWith("/repos/acme/repo/pulls/42/reviews")) {
      const reviewPages = Array.isArray(reviews[0]) ? reviews : [reviews];
      return {
        ok: true,
        json: async () => reviewPages[page - 1] ?? []
      };
    }
    if (parsedUrl.pathname.endsWith("/repos/acme/repo/pulls/42/comments")) {
      const reviewCommentPages = Array.isArray(reviewComments[0]) ? reviewComments : [reviewComments];
      return {
        ok: true,
        json: async () => reviewCommentPages[page - 1] ?? []
      };
    }
    if (parsedUrl.pathname.endsWith("/repos/acme/repo/issues/42/comments")) {
      const commentPages = Array.isArray(issueComments[0]) ? issueComments : [issueComments];
      return {
        ok: true,
        json: async () => commentPages[page - 1] ?? []
      };
    }
    if (parsedUrl.pathname.endsWith("/repos/acme/repo/issues/42/reactions")) {
      const reactionPages = Array.isArray(reactions[0]) ? reactions : [reactions];
      return {
        ok: true,
        json: async () => reactionPages[page - 1] ?? []
      };
    }
    if (parsedUrl.pathname.includes("/repos/acme/repo/commits/") && parsedUrl.pathname.endsWith("/status")) {
      return {
        ok: true,
        json: async () => status
      };
    }
    if (parsedUrl.pathname.includes("/repos/acme/repo/commits/") && parsedUrl.pathname.endsWith("/check-runs")) {
      const runs = checkRuns.pages?.[page - 1] ?? checkRuns.check_runs?.slice((page - 1) * 100, page * 100) ?? [];
      return {
        ok: true,
        json: async () => ({
          ...checkRuns,
          check_runs: runs,
          total_count: Number(checkRuns.total_count ?? runs.length)
        })
      };
    }
    return {
      ok: true,
      json: async () => graphql.next(options, requestUrl)
    };
  };
}

function isProjectQuery(call) {
  return String(call.query).includes("projectV2(number: $projectNumber)");
}

function projectFromGraphqlResponse(response) {
  return response?.data?.organization?.projectV2 ?? response?.data?.user?.projectV2;
}

function applyGraphqlFieldMutation(response, call) {
  const input = call.variables?.input;
  if (!input?.itemId || !input.fieldId) return;

  const project = projectFromGraphqlResponse(response);
  const item = project?.items?.nodes?.find((candidate) => candidate.id === input.itemId);
  if (!item) return;

  const fieldNode = project.fields.nodes.find((candidate) => candidate.id === input.fieldId);
  const fieldName = fieldNode?.name;
  if (!fieldName) return;

  item.fieldValues.nodes = item.fieldValues.nodes.filter((value) => value.field?.name !== fieldName);
  if (String(call.query).includes("clearProjectV2ItemFieldValue")) return;

  const value = input.value ?? {};
  if (Object.hasOwn(value, "text")) item.fieldValues.nodes.push(textValue(fieldName, value.text));
  if (Object.hasOwn(value, "number")) item.fieldValues.nodes.push(numberValue(fieldName, value.number));
  if (Object.hasOwn(value, "singleSelectOptionId")) {
    const option = fieldNode.options?.find((candidate) => candidate.id === value.singleSelectOptionId);
    item.fieldValues.nodes.push(singleSelectValue(fieldName, option?.name, value.singleSelectOptionId));
  }
}

function pullRequestResponse(overrides = {}) {
  return {
    number: 42,
    html_url: "https://github.com/acme/repo/pull/42",
    state: "open",
    draft: false,
    merged: false,
    mergeable: true,
    mergeable_state: "clean",
    base: { ref: "main", sha: "b".repeat(40) },
    head: { ref: "feature", sha: "a".repeat(40), repo: { full_name: "acme/repo" } },
    ...overrides
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
  lastWorkerRun = "",
  prUrl = "",
  blockedBy = { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] }
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
                ["status_review", Status.REVIEW],
                ["status_babysit", Status.BABYSIT],
                ["status_done", Status.DONE],
                ["status_blocked", Status.BLOCKED]
              ]),
              singleSelectField("field_worker_type", "Worker Type", [
                ["worker_implementer", WorkerType.IMPLEMENTER],
                ["worker_qa", WorkerType.QA],
                ["worker_reviewer", WorkerType.REVIEWER],
                ["worker_pr_babysitter", WorkerType.PR_BABYSITTER]
              ]),
              singleSelectField("field_priority", "Priority", [["priority_p1", "P1"]]),
              field("field_lease_owner", "Lease Owner", "TEXT"),
              field("field_lease_expires", "Lease Expires", "TEXT"),
              field("field_attempts", "Attempts", "NUMBER"),
              field("field_last_worker_run", "Last Worker Run", "TEXT"),
              field("field_pr", "PR", "TEXT")
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
                  repository: { nameWithOwner: "acme/repo" },
                  blockedBy
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
                    lastWorkerRun ? textValue("Last Worker Run", lastWorkerRun) : null,
                    prUrl ? textValue("PR", prUrl) : null
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

function blockerNode({
  id,
  number = 2,
  repository = "acme/repo",
  state,
  stateReason = null
}) {
  return {
    id,
    title: `Blocker ${number}`,
    url: `https://github.com/${repository}/issues/${number}`,
    number,
    state,
    stateReason,
    repository: { nameWithOwner: repository }
  };
}

function comment(id, envelope) {
  return {
    id,
    body: formatStageHandoffComment(envelope),
    createdAt: envelope.createdAt,
    updatedAt: envelope.createdAt,
    author: { login: "ski-daemon" }
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
