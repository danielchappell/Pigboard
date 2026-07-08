import { AdapterError } from "../../core/adapter-contract.js";
import { createClaimId, createClaimV2Id, isClaimV2, parseClaimId } from "../../core/claims.js";
import { formatPublicEventComment, formatWithheldPublicEvent } from "../../core/public-output.js";
import { resolvedWorkerTypeForItem } from "../../core/routing.js";
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
  ORGANIZATION_PROJECT_QUERY,
  USER_PROJECT_QUERY,
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
    owner,
    organization,
    projectNumber,
    fetchImpl = globalThis.fetch,
    now = () => new Date(),
    itemsFirst = 100,
    repositories = [],
    ownerType = organization ? "Organization" : "auto"
  }) {
    if (!token) throw new Error("token is required");
    const projectOwner = owner ?? organization;
    if (!projectOwner) throw new Error("owner is required");
    if (!projectNumber) throw new Error("projectNumber is required");
    if (!fetchImpl) throw new Error("fetch implementation is required");

    this.token = token;
    this.owner = projectOwner;
    this.organization = projectOwner;
    this.projectNumber = projectNumber;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.itemsFirst = itemsFirst;
    this.repositories = normalizeRepositoryFilter(repositories);
    this.ownerType = normalizeOwnerType(ownerType);
    this.detectedOwnerType = this.ownerType === "auto" ? null : this.ownerType;
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
      const project = await this.loadProjectPage(after);
      if (!project) {
        throw new AdapterError(`GitHub Project not found: ${this.owner}/${this.projectNumber}`, {
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

  async loadProjectPage(after) {
    const candidates = this.detectedOwnerType
      ? [this.detectedOwnerType]
      : ownerTypeCandidates(this.ownerType);
    const errors = [];

    for (const ownerType of candidates) {
      try {
        const data = await this.graphql(projectQueryForOwnerType(ownerType), {
          owner: this.owner,
          projectNumber: Number(this.projectNumber),
          itemsFirst: this.itemsFirst,
          after
        });
        const project = projectFromOwnerData(data, ownerType);
        if (project) {
          this.detectedOwnerType = ownerType;
          return project;
        }
      } catch (error) {
        if (!isOwnerKindMismatch(error)) throw error;
        errors.push(error);
      }
    }

    if (errors.length && candidates.length === errors.length) throw errors[errors.length - 1];
    return null;
  }

  async listReady(workerType) {
    const { items } = await this.loadProjectItems();
    const now = this.now();
    return items
      .filter((item) => this.matchesRepositoryFilter(item))
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

  async claimReadyForWorker({ workerType, workerId, leaseSeconds, itemId, context = {} }) {
    if (!workerType) throw new Error("workerType is required");
    if (!workerId) throw new Error("workerId is required");
    if (!leaseSeconds) throw new Error("leaseSeconds is required");

    const { projectModel, items } = await this.loadProjectItems();
    const ready = items
      .filter((item) => this.matchesRepositoryFilter(item))
      .filter((item) => isReadyForWorker(item, workerType, this.now()))
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
    const candidates = itemId ? ready.filter((candidate) => candidate.id === itemId) : ready;
    if (!candidates.length) return { claimed: false, reason: itemId ? "not_ready" : "none_ready" };

    const skipped = [];
    for (const item of candidates) {
      try {
        return await this.claimReadyItem({ projectModel, item, workerType, workerId, leaseSeconds, context });
      } catch (error) {
        if (itemId || !isPullRequestMetadataError(error)) throw error;
        skipped.push({ itemId: item.id, reason: error.message });
      }
    }

    return { claimed: false, reason: skipped.length ? "pr_metadata_failed" : "none_ready", skipped };
  }

  async claimReadyItem({ projectModel, item, workerType, workerId, leaseSeconds, context }) {
    const now = this.now();
    const expiresAt = new Date(now.getTime() + leaseSeconds * 1000).toISOString();
    const pullRequest = await this.resolveClaimPullRequest({ item, context });
    const claimId = createClaimV2Id({
      itemId: item.id,
      workerId,
      attemptId: context.attemptId ?? `${workerId}:${Number(item.attempts ?? 0) + 1}`,
      runId: context.runId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      expiresAt,
      resolvedWorkerType: resolvedWorkerTypeForItem(item) ?? workerType,
      claimedStatus: item.status,
      claimedWorkerType: item.workerType,
      repository: item.repository ?? context.repository ?? "unknown/unknown",
      contentType: item.contentType ?? context.contentType ?? "Unknown",
      issueNumber: item.contentType === "Issue" ? item.number : undefined,
      pullRequestNumber: pullRequest?.number,
      prUrl: pullRequest?.url,
      baseRef: pullRequest?.baseRef,
      baseSha: pullRequest?.baseSha,
      headRef: pullRequest?.headRef,
      headSha: pullRequest?.headSha,
      claimedAt: now.toISOString(),
      ...context
    });

    try {
      await this.setTextField(projectModel, item.id, FieldName.LAST_WORKER_RUN, claimId);
      await this.setTextField(projectModel, item.id, FieldName.LEASE_OWNER, workerId);
      await this.setTextField(projectModel, item.id, FieldName.LEASE_EXPIRES, expiresAt);
      await this.setNumberField(projectModel, item.id, FieldName.ATTEMPTS, Number(item.attempts ?? 0) + 1);
    } catch (error) {
      await this.rollbackClaimAttempt(projectModel, item.id, { claimId, workerId, expiresAt });
      throw error;
    }

    this.claims.set(claimId, { id: claimId, ...parseClaimId(claimId) });

    return {
      claimed: true,
      claim: { id: claimId, itemId: item.id, owner: workerId, expiresAt },
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

  async verifyClaim(
    claimId,
    { requireHeadSha = false, allowStatusChanged = false, allowWorkerTypeChanged = false } = {}
  ) {
    const claim = this.claims.get(claimId) ?? parseClaimId(claimId);
    const { items } = await this.loadProjectItems();
    const item = items.find((candidate) => candidate.id === claim.itemId);
    if (!item) return { active: false, reason: "missing" };
    if (item.leaseOwner !== claim.workerId) return { active: false, reason: "owner_mismatch" };
    if (item.lastWorkerRun && item.lastWorkerRun !== claimId) return { active: false, reason: "run_mismatch" };
    if (!item.leaseExpiresAt || new Date(item.leaseExpiresAt) <= this.now()) {
      return { active: false, reason: "expired" };
    }
    if (isClaimV2(claim)) {
      if (!allowStatusChanged && item.status !== claim.claimedStatus) {
        return { active: false, reason: "status_changed" };
      }
      if (!allowWorkerTypeChanged && (item.workerType ?? undefined) !== (claim.claimedWorkerType ?? undefined)) {
        return { active: false, reason: "worker_type_changed" };
      }
      if ((item.repository ?? "unknown/unknown") !== claim.repository) {
        return { active: false, reason: "repository_changed" };
      }
      if (item.contentType === "PullRequest" && claim.pullRequestNumber && item.number !== claim.pullRequestNumber) {
        return { active: false, reason: "pr_changed" };
      }
      if (item.contentType !== "PullRequest" && claim.pullRequestNumber && item.pullRequestNumber !== claim.pullRequestNumber) {
        return { active: false, reason: "pr_changed" };
      }
      if (requireHeadSha && !claim.headSha) return { active: false, reason: "missing_head_sha" };
      if (requireHeadSha && item.contentType !== "PullRequest" && claim.pullRequestNumber) {
        const pullRequest = await this.fetchPullRequestMetadata({
          repository: claim.repository,
          number: claim.pullRequestNumber
        });
        if (pullRequest.headSha && pullRequest.headSha !== claim.headSha) {
          return { active: false, reason: "head_drift" };
        }
        if (pullRequest.baseSha && claim.baseSha && pullRequest.baseSha !== claim.baseSha) {
          return { active: false, reason: "base_drift" };
        }
      }
      if (requireHeadSha && item.headSha && item.headSha !== claim.headSha) {
        return { active: false, reason: "head_drift" };
      }
      if (requireHeadSha && item.baseSha && claim.baseSha && item.baseSha !== claim.baseSha) {
        return { active: false, reason: "base_drift" };
      }
    }
    return { active: true, claim, item };
  }

  async extendClaim(claimId, leaseSeconds) {
    const verified = await this.verifyClaim(claimId);
    if (!verified.active) return { extended: false, reason: "CLAIM_LOST" };
    const expiresAt = new Date(this.now().getTime() + leaseSeconds * 1000).toISOString();
    const projectModel = await this.ensureProjectModel();
    await this.setTextField(projectModel, verified.claim.itemId, FieldName.LEASE_EXPIRES, expiresAt);
    return { extended: true, expiresAt };
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

  async appendEventForClaim(claimId, event) {
    const verified = await this.verifyClaim(claimId);
    if (!verified.active) return { appended: false, reason: verified.reason };
    await this.appendEvent(verified.claim.itemId, event);
    return { appended: true };
  }

  async transition(itemId, status) {
    const projectModel = await this.ensureProjectModel();
    await this.setSingleSelectField(projectModel, itemId, FieldName.STATUS, status);
  }

  async transitionForClaim(claimId, status) {
    const verified = await this.verifyClaim(claimId);
    if (!verified.active) return { transitioned: false, reason: verified.reason };
    await this.transition(verified.claim.itemId, status);
    return { transitioned: true };
  }

  async setFieldForClaim(claimId, fieldName, value) {
    const verified = await this.verifyClaim(claimId);
    if (!verified.active) return { updated: false, reason: verified.reason };
    const projectModel = await this.ensureProjectModel();
    if (typeof value === "number") await this.setNumberField(projectModel, verified.claim.itemId, fieldName, value);
    else await this.setTextField(projectModel, verified.claim.itemId, fieldName, value);
    return { updated: true };
  }

  async clearWorkerTypeForClaim(claimId) {
    const verified = await this.verifyClaim(claimId, { allowStatusChanged: true });
    if (!verified.active) return { cleared: false, reason: verified.reason };
    const projectModel = await this.ensureProjectModel();
    await this.clearField(projectModel, verified.claim.itemId, FieldName.WORKER_TYPE);
    return { cleared: true };
  }

  async release(claimId) {
    return this.releaseClaim(claimId);
  }

  async releaseClaim(claimId) {
    const verified = await this.verifyClaim(claimId, {
      allowStatusChanged: true,
      allowWorkerTypeChanged: true
    });
    if (!verified.active) return { released: false, reason: verified.reason };
    const claim = verified.claim;

    const projectModel = await this.ensureProjectModel();
    await this.clearField(projectModel, claim.itemId, FieldName.LEASE_OWNER);
    await this.clearField(projectModel, claim.itemId, FieldName.LEASE_EXPIRES);
    this.claims.delete(claimId);
    return { released: true };
  }

  async fail(claimId, reason) {
    return this.failClaim(claimId, reason);
  }

  async failClaim(claimId, reason, verifyOptions = {}) {
    const verified = await this.verifyClaim(claimId, verifyOptions);
    if (!verified.active) return { failed: false, reason: verified.reason };
    const claim = verified.claim;

    await this.appendEvent(claim.itemId, {
      type: "worker_failed",
      actor: claim.workerId,
      body: reason
    });
    await this.transition(claim.itemId, Status.BLOCKED);
    const released = await this.releaseClaim(claimId);
    if (released?.released === false) return { failed: false, reason: released.reason };
    return { failed: true };
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

  async rollbackClaimAttempt(projectModel, itemId, { claimId, workerId, expiresAt }) {
    const { items } = await this.loadProjectItems();
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    if (item.lastWorkerRun === claimId) await this.clearField(projectModel, itemId, FieldName.LAST_WORKER_RUN);
    if (item.leaseOwner === workerId) await this.clearField(projectModel, itemId, FieldName.LEASE_OWNER);
    if (item.leaseExpiresAt === expiresAt) await this.clearField(projectModel, itemId, FieldName.LEASE_EXPIRES);
  }

  matchesRepositoryFilter(item) {
    if (!this.repositories.size) return true;
    if (!item.repository) return false;
    return this.repositories.has(item.repository.toLowerCase());
  }

  async resolveClaimPullRequest({ item, context = {} }) {
    if (context.pullRequestNumber || context.prUrl || context.headSha) {
      return {
        number: context.pullRequestNumber,
        url: context.prUrl,
        baseRef: context.baseRef,
        baseSha: context.baseSha,
        headRef: context.headRef,
        headSha: context.headSha
      };
    }

    if (item.contentType === "PullRequest") {
      return {
        number: item.number,
        url: item.url,
        baseRef: item.baseRef,
        baseSha: item.baseSha,
        headRef: item.headRef,
        headSha: item.headSha
      };
    }

    if (!item.pullRequestNumber && !item.prUrl) return null;
    const repository = item.repository;
    if (!repository) return { number: item.pullRequestNumber, url: item.prUrl };
    const number = item.pullRequestNumber ?? parsePullRequestNumber(item.prUrl);
    if (!number) return { url: item.prUrl };
    return this.fetchPullRequestMetadata({ repository, number });
  }

  async fetchPullRequestMetadata({ repository, number }) {
    const response = await this.fetchImpl(`https://api.github.com/repos/${repository}/pulls/${number}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "ski-stack"
      }
    });
    if (!response.ok) {
      throw new AdapterError(`GitHub pull request metadata request failed: ${response.status}`, {
        code: "GITHUB_PR_METADATA_HTTP"
      });
    }
    const pr = await response.json();
    return {
      number: pr.number,
      url: pr.html_url,
      baseRef: pr.base?.ref,
      baseSha: pr.base?.sha,
      headRef: pr.head?.ref,
      headSha: pr.head?.sha
    };
  }
}

function formatEventComment(event) {
  const output =
    event?.publicOutput ?? {
      runId: event.runId ?? event.claimId ?? "manual",
      workerType: event.workerType ?? event.actor ?? "worker",
      outcome: event.outcome ?? event.type ?? "worker_event",
      nextStatus: event.nextStatus,
      summary: event.body ?? event.summary ?? "",
      evidence: event.evidence ?? []
    };
  try {
    return formatPublicEventComment(output);
  } catch {
    return formatWithheldPublicEvent({
      runId: output.runId,
      workerType: output.workerType,
      outcome: output.outcome
    });
  }
}

function parsePullRequestNumber(url) {
  const value = String(url ?? "").trim();
  if (/^\d+$/.test(value)) return Number(value);
  const match = value.match(/\/pull\/(\d+)(?:\b|$)/);
  return match ? Number(match[1]) : undefined;
}

function normalizeRepositoryFilter(repositories) {
  const values = Array.isArray(repositories) ? repositories : String(repositories ?? "").split(",");
  return new Set(
    values
      .map((value) => String(value).trim().toLowerCase())
      .filter(Boolean)
  );
}

function normalizeOwnerType(ownerType) {
  if (!ownerType) return "auto";
  const normalized = String(ownerType).toLowerCase();
  if (normalized === "user") return "User";
  if (normalized === "organization" || normalized === "org") return "Organization";
  if (normalized === "auto") return "auto";
  throw new Error(`Unsupported GitHub Project owner type: ${ownerType}`);
}

function ownerTypeCandidates(ownerType) {
  if (ownerType === "User") return ["User"];
  if (ownerType === "Organization") return ["Organization"];
  return ["Organization", "User"];
}

function projectQueryForOwnerType(ownerType) {
  return ownerType === "User" ? USER_PROJECT_QUERY : ORGANIZATION_PROJECT_QUERY;
}

function projectFromOwnerData(data, ownerType) {
  return ownerType === "User" ? data?.user?.projectV2 : data?.organization?.projectV2;
}

function isOwnerKindMismatch(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /Could not resolve to an (Organization|User) with the login/i.test(message);
}

function isPullRequestMetadataError(error) {
  return error?.code === "GITHUB_PR_METADATA_HTTP";
}
