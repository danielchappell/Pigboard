import { AdapterError } from "../../core/adapter-contract.js";
import { evaluateQueueAvailability } from "../../core/availability.js";
import { createClaimId, createClaimV2Id, isClaimV2, parseClaimId } from "../../core/claims.js";
import { formatPublicEventComment, formatWithheldPublicEvent } from "../../core/public-output.js";
import { resolvedWorkerTypeForItem } from "../../core/routing.js";
import { Status } from "../../core/status.js";
import {
  buildProjectModel,
  FieldName,
  fieldId,
  normalizeIssueDependencies,
  normalizeProjectItem,
  singleSelectOptionId
} from "./fields.js";
import {
  ADD_COMMENT_MUTATION,
  CLEAR_FIELD_MUTATION,
  ISSUE_BLOCKED_BY_QUERY,
  ORGANIZATION_PROJECT_QUERY,
  USER_PROJECT_QUERY,
  UPDATE_FIELD_MUTATION
} from "./graphql.js";

export { isGlobalQueueWakeup, parseGitHubWebhook } from "./webhook.js";
export {
  buildProjectModel,
  FieldName,
  isReadyForWorker,
  normalizeProjectItem,
  normalizeIssueDependencies,
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
    let sourceOrder = 0;

    do {
      const project = await this.loadProjectPage(after);
      if (!project) {
        throw new AdapterError(`GitHub Project not found: ${this.owner}/${this.projectNumber}`, {
          code: "GITHUB_PROJECT_NOT_FOUND"
        });
      }

      projectModel ??= buildProjectModel(project);
      for (const node of project.items?.nodes ?? []) {
        if (!node?.isArchived) {
          const item = normalizeProjectItem(node, { sourceOrder });
          if (node.content?.__typename === "Issue" && node.content.blockedBy?.pageInfo?.hasNextPage) {
            const dependencyCursor = node.content.blockedBy.pageInfo.endCursor;
            if (dependencyCursor) {
              item.dependencies.push(
                ...(await this.loadRemainingIssueDependencies(node.content.id, dependencyCursor))
              );
            } else {
              item.dependencies.push({ kind: "blockedBy", targetId: "", state: "unknown" });
            }
          }
          allItems.push(item);
        }
        sourceOrder += 1;
      }

      const pageInfo = project.items?.pageInfo;
      after = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
    } while (after);

    this.projectModel = projectModel;
    return { projectModel, items: allItems };
  }

  async loadQueueSnapshot() {
    const { projectModel, items } = await this.loadProjectItems();
    return { projectModel, items, loadedAt: this.now().toISOString() };
  }

  async loadRemainingIssueDependencies(issueId, after) {
    const dependencies = [];
    const seenCursors = new Set();
    let cursor = after;
    while (cursor) {
      if (seenCursors.has(cursor)) {
        dependencies.push({ kind: "blockedBy", targetId: "", state: "unknown" });
        break;
      }
      seenCursors.add(cursor);
      const data = await this.graphql(ISSUE_BLOCKED_BY_QUERY, {
        id: issueId,
        first: 100,
        after: cursor
      });
      const blockedBy = data?.node?.blockedBy;
      if (!blockedBy) {
        dependencies.push({ kind: "blockedBy", targetId: "", state: "unknown" });
        break;
      }
      dependencies.push(...normalizeIssueDependencies(blockedBy.nodes));
      const hasNextPage = blockedBy.pageInfo?.hasNextPage === true;
      const nextCursor = blockedBy.pageInfo?.endCursor;
      if (hasNextPage && !nextCursor) {
        dependencies.push({ kind: "blockedBy", targetId: "", state: "unknown" });
        break;
      }
      cursor = hasNextPage ? nextCursor : null;
    }
    return dependencies;
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
    const snapshot = await this.loadQueueSnapshot();
    return evaluateQueueAvailability(snapshot, {
      workerType,
      repositories: this.repositories,
      now: this.now
    }).available.map((candidate) => candidate.item);
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

    const snapshot = await this.loadQueueSnapshot();
    const selection = evaluateQueueAvailability(snapshot, {
      workerType,
      workerId,
      repositories: this.repositories,
      now: this.now
    });
    const candidates = itemId
      ? selection.available.filter((candidate) => candidate.item.id === itemId)
      : selection.available;
    if (!candidates.length) return { claimed: false, reason: itemId ? "not_ready" : "none_ready" };

    const skipped = [];
    for (const candidate of candidates) {
      try {
        return await this.claimReadyItem({
          projectModel: snapshot.projectModel,
          item: candidate.item,
          workerType,
          workerId,
          leaseSeconds,
          availabilityFingerprint: candidate.fingerprint,
          context
        });
      } catch (error) {
        if (itemId || !isPullRequestMetadataError(error)) throw error;
        skipped.push({ itemId: candidate.item.id, reason: error.message });
      }
    }

    return { claimed: false, reason: skipped.length ? "pr_metadata_failed" : "none_ready", skipped };
  }

  async claimCandidate({
    itemId,
    workerType,
    workerId,
    leaseSeconds,
    expectedAvailabilityFingerprint,
    context = {}
  }) {
    const snapshot = await this.loadQueueSnapshot();
    const selection = evaluateQueueAvailability(snapshot, {
      workerType,
      workerId,
      repositories: this.repositories,
      now: this.now
    });
    const candidate = selection.available.find((entry) => entry.item.id === itemId);
    if (!candidate) {
      const unavailable = selection.unavailable.find((entry) => entry.item.id === itemId);
      return { claimed: false, reason: unavailable?.reasons[0]?.code ?? "not_available" };
    }
    if (expectedAvailabilityFingerprint && candidate.fingerprint !== expectedAvailabilityFingerprint) {
      return { claimed: false, reason: "availability_changed" };
    }
    return this.claimReadyItem({
      projectModel: snapshot.projectModel,
      item: candidate.item,
      workerType,
      workerId,
      leaseSeconds,
      availabilityFingerprint: candidate.fingerprint,
      context
    });
  }

  async claimReadyItem({
    projectModel,
    item,
    workerType,
    workerId,
    leaseSeconds,
    availabilityFingerprint,
    context
  }) {
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
      headRepository: pullRequest?.headRepository,
      headSha: pullRequest?.headSha,
      availabilityFingerprint,
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
    const verified = await this.verifyClaim(claimId, { requireAvailability: true });
    if (!verified.active) {
      this.claims.delete(claimId);
      await this.rollbackClaimAttempt(projectModel, item.id, { claimId, workerId, expiresAt });
      return { claimed: false, reason: verified.reason };
    }

    return {
      claimed: true,
      claim: { id: claimId, itemId: item.id, owner: workerId, expiresAt, availabilityFingerprint },
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
    {
      requireHeadSha = false,
      allowStatusChanged = false,
      allowWorkerTypeChanged = false,
      requireAvailability = false
    } = {}
  ) {
    const claim = this.claims.get(claimId) ?? parseClaimId(claimId);
    const snapshot = await this.loadQueueSnapshot();
    const { items } = snapshot;
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
      if (item.contentType !== "PullRequest" && claim.pullRequestNumber && item.prUrl) {
        const reference = parsePullRequestReference(item.prUrl);
        if (reference?.repository && reference.repository.toLowerCase() !== claim.repository.toLowerCase()) {
          return { active: false, reason: "pr_changed" };
        }
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
      if (requireAvailability) {
        const selection = evaluateQueueAvailability(snapshot, {
          workerType: claim.resolvedWorkerType,
          workerId: claim.workerId,
          repositories: this.repositories,
          now: this.now
        });
        const candidate = selection.available.find((entry) => entry.item.id === claim.itemId);
        if (!candidate) {
          const unavailable = selection.unavailable.find((entry) => entry.item.id === claim.itemId);
          return { active: false, reason: unavailable?.reasons[0]?.code ?? "not_available" };
        }
        if (claim.availabilityFingerprint && candidate.fingerprint !== claim.availabilityFingerprint) {
          return { active: false, reason: "availability_changed" };
        }
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

  async appendEventForClaim(claimId, event, verifyOptions = {}) {
    const verified = await this.verifyClaim(claimId, verifyOptions);
    if (!verified.active) return { appended: false, reason: verified.reason };
    await this.appendEvent(verified.claim.itemId, event);
    return { appended: true };
  }

  async transition(itemId, status) {
    const projectModel = await this.ensureProjectModel();
    await this.setSingleSelectField(projectModel, itemId, FieldName.STATUS, status);
  }

  async transitionForClaim(claimId, status, verifyOptions = {}) {
    const verified = await this.verifyClaim(claimId, verifyOptions);
    if (!verified.active) return { transitioned: false, reason: verified.reason };
    await this.transition(verified.claim.itemId, status);
    return { transitioned: true };
  }

  async setFieldForClaim(claimId, fieldName, value, verifyOptions = {}) {
    const verified = await this.verifyClaim(claimId, verifyOptions);
    if (!verified.active) return { updated: false, reason: verified.reason };
    const projectModel = await this.ensureProjectModel();
    if (typeof value === "number") await this.setNumberField(projectModel, verified.claim.itemId, fieldName, value);
    else await this.setTextField(projectModel, verified.claim.itemId, fieldName, value);
    return { updated: true };
  }

  async clearWorkerTypeForClaim(claimId, verifyOptions = {}) {
    const verified = await this.verifyClaim(claimId, { ...verifyOptions, allowStatusChanged: true });
    if (!verified.active) return { cleared: false, reason: verified.reason };
    const projectModel = await this.ensureProjectModel();
    await this.clearField(projectModel, verified.claim.itemId, FieldName.WORKER_TYPE);
    return { cleared: true };
  }

  async release(claimId) {
    return this.releaseClaim(claimId);
  }

  async releaseClaim(claimId, verifyOptions = {}) {
    const verified = await this.verifyClaim(claimId, {
      ...verifyOptions,
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

  async verifyPullRequestReadyForDoneForClaim(claimId) {
    return this.verifyPullRequestReadyForMergeForClaim(claimId);
  }

  async verifyPullRequestReadyForQaForClaim(claimId) {
    return this.verifyPullRequestReadyForMergeForClaim(claimId);
  }

  async verifyPullRequestReadyForMergeForClaim(claimId) {
    const verified = await this.verifyClaim(claimId, { requireHeadSha: true });
    if (!verified.active) return { ready: false, reason: verified.reason };
    const claim = verified.claim;
    const item = verified.item;
    const number = claim.pullRequestNumber ?? (item.contentType === "PullRequest" ? item.number : undefined);
    const repository = claim.repository ?? item.repository;
    if (!repository || !number) return { ready: false, reason: "missing_pr" };

    const state = await this.fetchPullRequestMergeState({ repository, number });
    if (claim.headSha && state.headSha && claim.headSha !== state.headSha) {
      return { ready: false, reason: "head_drift" };
    }
    if (state.merged) return { ready: true, reason: "merged" };
    if (state.state !== "open") return { ready: false, reason: "pr_not_open" };
    if (state.draft) return { ready: false, reason: "draft" };
    if (state.changesRequested) return { ready: false, reason: "changes_requested" };
    if (!state.approved) return { ready: false, reason: "not_approved" };
    if (!state.ciPresent) return { ready: false, reason: "ci_missing" };
    if (!state.checksClean) return { ready: false, reason: "checks_not_clean" };
    const mergeabilityReason = mergeabilityFailureReason(state);
    if (mergeabilityReason) return { ready: false, reason: mergeabilityReason };
    return { ready: true };
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
    const ownsRun = item.lastWorkerRun === claimId;
    const ownsLease = item.leaseOwner === workerId;
    if (ownsRun) await this.clearField(projectModel, itemId, FieldName.LAST_WORKER_RUN);
    if (ownsLease) await this.clearField(projectModel, itemId, FieldName.LEASE_OWNER);
    if ((ownsRun || ownsLease) && item.leaseExpiresAt === expiresAt) {
      await this.clearField(projectModel, itemId, FieldName.LEASE_EXPIRES);
    }
  }

  async resolveClaimPullRequest({ item, context = {} }) {
    if (context.pullRequestNumber || context.prUrl || context.headSha) {
      return {
        number: context.pullRequestNumber,
        url: context.prUrl,
        baseRef: context.baseRef,
        baseSha: context.baseSha,
        headRef: context.headRef,
        headRepository: context.headRepository,
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
        headRepository: item.headRepository,
        headSha: item.headSha
      };
    }

    if (!item.pullRequestNumber && !item.prUrl) return null;
    const repository = item.repository;
    if (!repository) return { number: item.pullRequestNumber, url: item.prUrl };
    const reference = parsePullRequestReference(item.prUrl);
    if (reference?.repository && reference.repository.toLowerCase() !== repository.toLowerCase()) {
      throw new AdapterError(`PR field points at ${reference.repository}, but item belongs to ${repository}`, {
        code: "GITHUB_PR_METADATA_INVALID"
      });
    }
    const number = item.pullRequestNumber ?? reference?.number;
    if (!number) return { url: item.prUrl };
    return this.fetchPullRequestMetadata({ repository, number });
  }

  async fetchPullRequestMetadata({ repository, number }) {
    const pr = await this.fetchGitHubJson(`https://api.github.com/repos/${repository}/pulls/${number}`, {
      errorCode: "GITHUB_PR_METADATA_HTTP",
      errorMessage: "GitHub pull request metadata request failed"
    });
    return {
      number: pr.number,
      url: pr.html_url,
      baseRef: pr.base?.ref,
      baseSha: pr.base?.sha,
      headRef: pr.head?.ref,
      headRepository: pr.head?.repo?.full_name,
      headSha: pr.head?.sha
    };
  }

  async fetchPullRequestMergeState({ repository, number }) {
    const pr = await this.fetchGitHubJson(`https://api.github.com/repos/${repository}/pulls/${number}`, {
      errorCode: "GITHUB_PR_METADATA_HTTP",
      errorMessage: "GitHub pull request metadata request failed"
    });
    const [reviews, reactions, status, checkRuns] = await Promise.all([
      this.fetchGitHubJsonPages(`https://api.github.com/repos/${repository}/pulls/${number}/reviews`, {
        errorCode: "GITHUB_PR_REVIEWS_HTTP",
        errorMessage: "GitHub pull request reviews request failed",
        itemKey: null
      }),
      this.fetchGitHubJsonPages(`https://api.github.com/repos/${repository}/issues/${number}/reactions`, {
        errorCode: "GITHUB_PR_REACTIONS_HTTP",
        errorMessage: "GitHub pull request reactions request failed",
        itemKey: null
      }),
      this.fetchGitHubJson(`https://api.github.com/repos/${repository}/commits/${pr.head?.sha}/status`, {
        errorCode: "GITHUB_PR_STATUS_HTTP",
        errorMessage: "GitHub pull request status request failed"
      }),
      this.fetchGitHubJsonPages(`https://api.github.com/repos/${repository}/commits/${pr.head?.sha}/check-runs`, {
        errorCode: "GITHUB_PR_CHECKS_HTTP",
        errorMessage: "GitHub pull request checks request failed",
        itemKey: "check_runs"
      })
    ]);

    const reviewState = reviewStateForHead(reviews, pr.head?.sha);
    const ciState = summarizeCiState(status, checkRuns);
    return {
      number: pr.number,
      url: pr.html_url,
      state: pr.state,
      draft: pr.draft === true,
      merged: pr.merged === true,
      headSha: pr.head?.sha,
      approved: reviewState.approved || hasThumbsUpReaction(reactions),
      changesRequested: reviewState.changesRequested,
      ciPresent: ciState.present,
      checksClean: ciState.clean,
      mergeable: pr.mergeable,
      mergeableState: pr.mergeable_state
    };
  }

  async loadPullRequestFeedbackForClaim(claimId, verifyOptions = {}) {
    const verified = await this.verifyClaim(claimId, { requireHeadSha: true, ...verifyOptions });
    if (!verified.active) {
      throw new Error(`claim lost: ${verified.reason}`);
    }
    const claim = verified.claim;
    const item = verified.item;
    const number = claim.pullRequestNumber ?? (item.contentType === "PullRequest" ? item.number : undefined);
    const repository = claim.repository ?? item.repository;
    const headSha = claim.headSha ?? item.headSha;
    if (!repository || !number) return null;

    const [issueComments, reviews, reviewComments, status, checkRuns] = await Promise.all([
      this.fetchGitHubJsonPages(`https://api.github.com/repos/${repository}/issues/${number}/comments`, {
        errorCode: "GITHUB_PR_COMMENTS_HTTP",
        errorMessage: "GitHub pull request comments request failed",
        itemKey: null,
        maxPages: 5
      }),
      this.fetchGitHubJsonPages(`https://api.github.com/repos/${repository}/pulls/${number}/reviews`, {
        errorCode: "GITHUB_PR_REVIEWS_HTTP",
        errorMessage: "GitHub pull request reviews request failed",
        itemKey: null,
        maxPages: 5
      }),
      this.fetchGitHubJsonPages(`https://api.github.com/repos/${repository}/pulls/${number}/comments`, {
        errorCode: "GITHUB_PR_REVIEW_COMMENTS_HTTP",
        errorMessage: "GitHub pull request review comments request failed",
        itemKey: null,
        maxPages: 5
      }),
      this.fetchGitHubJson(`https://api.github.com/repos/${repository}/commits/${headSha}/status`, {
        errorCode: "GITHUB_PR_STATUS_HTTP",
        errorMessage: "GitHub pull request status request failed"
      }),
      this.fetchGitHubJsonPages(`https://api.github.com/repos/${repository}/commits/${headSha}/check-runs`, {
        errorCode: "GITHUB_PR_CHECKS_HTTP",
        errorMessage: "GitHub pull request checks request failed",
        itemKey: "check_runs",
        maxPages: 5
      })
    ]);

    return {
      repository,
      number,
      url: claim.prUrl ?? item.url,
      headSha,
      comments: issueComments.slice(-20).map(formatIssueCommentForPrompt),
      reviews: reviews
        .filter((review) => !headSha || review.commit_id === headSha)
        .slice(-20)
        .map(formatReviewForPrompt),
      reviewComments: reviewComments.slice(-50).map(formatReviewCommentForPrompt),
      ci: formatCiForPrompt(status, checkRuns)
    };
  }

  async fetchGitHubJson(url, { errorCode, errorMessage }) {
    const response = await this.fetchImpl(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "ski-stack"
      }
    });
    if (!response.ok) {
      throw new AdapterError(`${errorMessage}: ${response.status}`, {
        code: errorCode
      });
    }
    return response.json();
  }

  async fetchGitHubJsonPages(url, { errorCode, errorMessage, itemKey, perPage = 100, maxPages = 20 }) {
    const items = [];
    let lastPayload;
    for (let page = 1; page <= maxPages; page += 1) {
      const payload = await this.fetchGitHubJson(withPagination(url, { perPage, page }), { errorCode, errorMessage });
      lastPayload = payload;
      const pageItems = itemKey ? payload?.[itemKey] : payload;
      const values = Array.isArray(pageItems) ? pageItems : [];
      items.push(...values);
      const totalCount = Number(itemKey ? payload?.total_count : undefined);
      if (values.length < perPage || (Number.isFinite(totalCount) && items.length >= totalCount)) {
        break;
      }
    }
    if (!itemKey) return items;
    return {
      ...(lastPayload && typeof lastPayload === "object" ? lastPayload : {}),
      [itemKey]: items,
      total_count: Number(lastPayload?.total_count ?? items.length)
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
      evidence: event.evidence ?? [],
      blocker: event.blocker ?? null
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

function formatIssueCommentForPrompt(comment) {
  return {
    author: comment.user?.login,
    createdAt: comment.created_at,
    body: truncatePromptText(comment.body)
  };
}

function formatReviewForPrompt(review) {
  return {
    author: review.user?.login,
    state: review.state,
    submittedAt: review.submitted_at,
    body: truncatePromptText(review.body)
  };
}

function formatReviewCommentForPrompt(comment) {
  return {
    author: comment.user?.login,
    path: comment.path,
    line: comment.line ?? comment.original_line,
    side: comment.side,
    createdAt: comment.created_at,
    body: truncatePromptText(comment.body)
  };
}

function formatCiForPrompt(status, checkRuns) {
  const failingStatuses = (status?.statuses ?? [])
    .filter((context) => context?.state && context.state !== "success")
    .slice(0, 30)
    .map((context) => ({
      name: context.context,
      state: context.state,
      description: truncatePromptText(context.description, 240),
      targetUrl: context.target_url
    }));
  const failingRuns = (checkRuns?.check_runs ?? [])
    .filter((run) => run?.status !== "completed" || !["success", "neutral", "skipped"].includes(run?.conclusion))
    .slice(0, 30)
    .map((run) => ({
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      detailsUrl: run.html_url
    }));
  return {
    statusState: status?.state,
    statusTotal: status?.total_count,
    failingStatuses,
    checkRunTotal: checkRuns?.total_count,
    failingCheckRuns: failingRuns
  };
}

function truncatePromptText(value, maxLength = 2000) {
  const text = String(value ?? "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function parsePullRequestReference(url) {
  const value = String(url ?? "").trim();
  if (/^\d+$/.test(value)) return { number: Number(value) };
  const match = value.match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/pull\/(\d+)(?:\b|$)/);
  return match ? { repository: match[1], number: Number(match[2]), url: value } : undefined;
}

function withPagination(url, { perPage, page }) {
  const parsed = new URL(url);
  parsed.searchParams.set("per_page", String(perPage));
  parsed.searchParams.set("page", String(page));
  return parsed.toString();
}

function reviewStateForHead(reviews, headSha) {
  if (!headSha) return { approved: false, changesRequested: false };
  const latestByAuthor = new Map();
  for (const review of Array.isArray(reviews) ? reviews : []) {
    if (review.commit_id !== headSha) continue;
    const author = review.user?.login;
    if (!author || !review.state) continue;
    if (review.state === "APPROVED" || review.state === "CHANGES_REQUESTED") {
      latestByAuthor.set(author, review.state);
    } else if (review.state === "DISMISSED") {
      latestByAuthor.delete(author);
    }
  }
  const states = [...latestByAuthor.values()];
  return {
    approved: states.includes("APPROVED"),
    changesRequested: states.includes("CHANGES_REQUESTED")
  };
}

function hasThumbsUpReaction(reactions) {
  return Array.isArray(reactions) && reactions.some((reaction) => reaction?.content === "+1");
}

function mergeabilityFailureReason(state) {
  if (state.mergeable === false) return "not_mergeable";
  const mergeableState = String(state.mergeableState ?? "").toLowerCase();
  if (["dirty", "blocked", "unknown", "behind"].includes(mergeableState)) {
    return `mergeability_${mergeableState}`;
  }
  if (state.mergeable !== true && !["clean", "unstable", "has_hooks"].includes(mergeableState)) {
    return "mergeability_unknown";
  }
  return null;
}

function areStatusChecksClean(status) {
  if (!status || Number(status.total_count ?? 0) === 0) return true;
  return status.state === "success";
}

function areCheckRunsClean(checkRuns) {
  const runs = Array.isArray(checkRuns?.check_runs) ? checkRuns.check_runs : [];
  if (!runs.length) return Number(checkRuns?.total_count ?? 0) === 0;
  return runs.every((run) => run.status === "completed" && ["success", "skipped", "neutral"].includes(run.conclusion));
}

function summarizeCiState(status, checkRuns) {
  const statusCount = Number(status?.total_count ?? 0);
  const runs = Array.isArray(checkRuns?.check_runs) ? checkRuns.check_runs : [];
  const checkRunCount = Number(checkRuns?.total_count ?? runs.length);
  const present = statusCount > 0 || checkRunCount > 0 || runs.length > 0;
  return {
    present,
    clean: areStatusChecksClean(status) && areCheckRunsClean(checkRuns)
  };
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
  return error?.code === "GITHUB_PR_METADATA_HTTP" || error?.code === "GITHUB_PR_METADATA_INVALID";
}
