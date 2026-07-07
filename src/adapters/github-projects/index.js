import { AdapterError } from "../../core/adapter-contract.js";
import { createClaimId, parseClaimId } from "../../core/claims.js";
import { Status } from "../../core/status.js";
import {
  buildProjectModel,
  FieldName,
  fieldId,
  isReadyForWorker,
  normalizeProjectItem,
  priorityRank,
  singleSelectOptionId
} from "./fields.js";
import {
  ADD_COMMENT_MUTATION,
  CLEAR_FIELD_MUTATION,
  PROJECT_QUERY,
  UPDATE_FIELD_MUTATION
} from "./graphql.js";

export { parseGitHubWebhook } from "./webhook.js";
export {
  buildProjectModel,
  FieldName,
  isReadyForWorker,
  normalizeProjectItem,
  priorityRank
} from "./fields.js";

export class GitHubProjectsAdapter {
  constructor({
    token,
    organization,
    projectNumber,
    fetchImpl = globalThis.fetch,
    now = () => new Date(),
    itemsFirst = 100
  }) {
    if (!token) throw new Error("token is required");
    if (!organization) throw new Error("organization is required");
    if (!projectNumber) throw new Error("projectNumber is required");
    if (!fetchImpl) throw new Error("fetch implementation is required");

    this.token = token;
    this.organization = organization;
    this.projectNumber = projectNumber;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.itemsFirst = itemsFirst;
    this.projectModel = null;
    this.claims = new Map();
  }

  async graphql(query, variables = {}) {
    const response = await this.fetchImpl("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "User-Agent": "ski-stack"
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new AdapterError(`GitHub GraphQL request failed: ${response.status}`, {
        code: "GITHUB_GRAPHQL_HTTP"
      });
    }

    const payload = await response.json();
    if (payload.errors?.length) {
      throw new AdapterError(payload.errors.map((error) => error.message).join("; "), {
        code: "GITHUB_GRAPHQL_ERROR"
      });
    }

    return payload.data;
  }

  async loadProjectItems() {
    const allItems = [];
    let after = null;
    let projectModel = null;

    do {
      const data = await this.graphql(PROJECT_QUERY, {
        organization: this.organization,
        projectNumber: Number(this.projectNumber),
        itemsFirst: this.itemsFirst,
        after
      });

      const project = data?.organization?.projectV2;
      if (!project) {
        throw new AdapterError(`GitHub Project not found: ${this.organization}/${this.projectNumber}`, {
          code: "GITHUB_PROJECT_NOT_FOUND"
        });
      }

      projectModel ??= buildProjectModel(project);
      for (const node of project.items?.nodes ?? []) {
        if (!node?.isArchived) allItems.push(normalizeProjectItem(node));
      }

      const pageInfo = project.items?.pageInfo;
      after = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
    } while (after);

    this.projectModel = projectModel;
    return { projectModel, items: allItems };
  }

  async listReady(workerType) {
    const { items } = await this.loadProjectItems();
    const now = this.now();
    return items
      .filter((item) => isReadyForWorker(item, workerType, now))
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  }

  async claim(itemId, workerId, leaseSeconds) {
    const { projectModel, items } = await this.loadProjectItems();
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) return { claimed: false, reason: "missing" };

    const now = this.now();
    if (item.leaseExpiresAt && new Date(item.leaseExpiresAt) > now) {
      return { claimed: false, reason: "leased" };
    }

    const expiresAt = new Date(now.getTime() + leaseSeconds * 1000).toISOString();
    const claimId = createClaimId({ itemId, workerId, expiresAt });

    await this.setTextField(projectModel, itemId, FieldName.LEASE_OWNER, workerId);
    await this.setTextField(projectModel, itemId, FieldName.LEASE_EXPIRES, expiresAt);
    await this.setNumberField(projectModel, itemId, FieldName.ATTEMPTS, Number(item.attempts ?? 0) + 1);
    await this.setTextField(projectModel, itemId, FieldName.LAST_WORKER_RUN, claimId);

    this.claims.set(claimId, { id: claimId, itemId, workerId, expiresAt });

    return {
      claimed: true,
      claim: { id: claimId, itemId, owner: workerId, expiresAt },
      item: {
        ...item,
        leaseOwner: workerId,
        leaseExpiresAt: expiresAt,
        attempts: Number(item.attempts ?? 0) + 1,
        lastWorkerRun: claimId
      }
    };
  }

  async heartbeat(claimId) {
    const claim = this.claims.get(claimId) ?? parseClaimId(claimId);
    const projectModel = await this.ensureProjectModel();
    await this.setTextField(projectModel, claim.itemId, FieldName.LEASE_EXPIRES, claim.expiresAt);
  }

  async appendEvent(itemId, event) {
    const { items } = await this.loadProjectItems();
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item?.contentId) {
      throw new AdapterError(`Project item has no commentable content: ${itemId}`, {
        code: "GITHUB_ITEM_NOT_COMMENTABLE"
      });
    }

    const body = formatEventComment(event);
    await this.graphql(ADD_COMMENT_MUTATION, {
      input: { subjectId: item.contentId, body }
    });
  }

  async transition(itemId, status) {
    const projectModel = await this.ensureProjectModel();
    await this.setSingleSelectField(projectModel, itemId, FieldName.STATUS, status);
  }

  async release(claimId) {
    const claim = this.claims.get(claimId) ?? parseClaimId(claimId);

    const projectModel = await this.ensureProjectModel();
    await this.clearField(projectModel, claim.itemId, FieldName.LEASE_OWNER);
    await this.clearField(projectModel, claim.itemId, FieldName.LEASE_EXPIRES);
    this.claims.delete(claimId);
  }

  async fail(claimId, reason) {
    const claim = this.claims.get(claimId) ?? parseClaimId(claimId);

    await this.appendEvent(claim.itemId, {
      type: "worker_failed",
      actor: claim.workerId,
      body: reason
    });
    await this.transition(claim.itemId, Status.BLOCKED);
    await this.release(claimId);
  }

  async ensureProjectModel() {
    if (this.projectModel) return this.projectModel;
    const { projectModel } = await this.loadProjectItems();
    return projectModel;
  }

  async setSingleSelectField(projectModel, itemId, fieldName, optionName) {
    await this.updateField(projectModel, itemId, fieldName, {
      singleSelectOptionId: singleSelectOptionId(projectModel, fieldName, optionName)
    });
  }

  async setTextField(projectModel, itemId, fieldName, text) {
    await this.updateField(projectModel, itemId, fieldName, { text: text ?? "" });
  }

  async setNumberField(projectModel, itemId, fieldName, number) {
    await this.updateField(projectModel, itemId, fieldName, { number });
  }

  async updateField(projectModel, itemId, fieldName, value) {
    await this.graphql(UPDATE_FIELD_MUTATION, {
      input: {
        projectId: projectModel.id,
        itemId,
        fieldId: fieldId(projectModel, fieldName),
        value
      }
    });
  }

  async clearField(projectModel, itemId, fieldName) {
    await this.graphql(CLEAR_FIELD_MUTATION, {
      input: {
        projectId: projectModel.id,
        itemId,
        fieldId: fieldId(projectModel, fieldName)
      }
    });
  }
}

function formatEventComment(event) {
  const lines = [
    "## Ski Stack Worker Event",
    "",
    `Type: ${event.type ?? "worker_event"}`,
    `Actor: ${event.actor ?? "unknown"}`,
    event.outcome ? `Outcome: ${event.outcome}` : null,
    "",
    event.body ?? ""
  ].filter((line) => line !== null);

  if (event.evidence?.length) {
    lines.push("", "Evidence:");
    for (const evidence of event.evidence) lines.push(`- ${evidence}`);
  }

  if (event.blocker) {
    lines.push("", `Blocker: ${event.blocker}`);
  }

  return lines.join("\n");
}
