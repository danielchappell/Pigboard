import { createClaimId, createClaimV2Id, isClaimV2, parseClaimId } from "../core/claims.js";
import { availabilityFingerprint, evaluateQueueAvailability } from "../core/availability.js";
import { contextFingerprint, createStageHandoff, verifyStageHandoff } from "../core/handoffs.js";
import { resolvedWorkerTypeForItem } from "../core/routing.js";
import { Status } from "../core/status.js";

export class MemoryQueueAdapter {
  constructor(items = [], {
    now = () => new Date(),
    repositories = [],
    handoffSecret = "memory-adapter-handoff-secret-000000",
    ownerApprovers = []
  } = {}) {
    this.items = new Map(
      items.map((item, sourceOrder) => [
        item.id,
        structuredClone({ sourceOrder, dependencies: [], ...item })
      ])
    );
    this.claims = new Map();
    this.events = [];
    this.handoffs = [];
    this.now = now;
    this.repositories = normalizeRepositoryFilter(repositories);
    this.handoffSecret = handoffSecret;
    this.ownerApprovers = new Set(ownerApprovers.map((login) => String(login).toLowerCase()));
  }

  async loadQueueSnapshot() {
    return {
      loadedAt: this.now().toISOString(),
      items: [...this.items.values()].map((item) => structuredClone(item))
    };
  }

  async listReady(workerType) {
    const snapshot = await this.loadQueueSnapshot();
    return evaluateQueueAvailability(snapshot, {
      workerType,
      repositories: this.repositories,
      now: this.now
    }).available.map((candidate) => candidate.item);
  }

  async claimReadyForWorker({ workerType, workerId, leaseSeconds, itemId, context = {} }) {
    const snapshot = await this.loadQueueSnapshot();
    const selection = evaluateQueueAvailability(snapshot, {
      workerType,
      workerId,
      repositories: this.repositories,
      now: this.now
    });
    const candidate = itemId
      ? selection.available.find((entry) => entry.item.id === itemId)
      : selection.available[0];
    if (!candidate) return { claimed: false, reason: itemId ? "not_ready" : "none_ready" };
    return this.claimCandidate({
      itemId: candidate.item.id,
      workerType,
      workerId,
      leaseSeconds,
      expectedAvailabilityFingerprint: candidate.fingerprint,
      context
    });
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
    return this.#claimItem({
      item: candidate.item,
      workerType,
      workerId,
      leaseSeconds,
      availabilityFingerprint: candidate.fingerprint,
      context,
      version: 2
    });
  }

  async claim(itemId, workerId, leaseSeconds) {
    const item = this.items.get(itemId);
    if (!item) return { claimed: false, reason: "missing" };

    const now = this.now();
    if (item.leaseExpiresAt && new Date(item.leaseExpiresAt) > now) {
      return { claimed: false, reason: "leased" };
    }

    const expiresAt = new Date(now.getTime() + leaseSeconds * 1000).toISOString();
    const claimId = createClaimId({ itemId, workerId, expiresAt });
    item.leaseOwner = workerId;
    item.leaseExpiresAt = expiresAt;
    item.attempts = (item.attempts ?? 0) + 1;
    item.lastWorkerRun = claimId;
    this.claims.set(claimId, { id: claimId, itemId, workerId, expiresAt });

    return {
      claimed: true,
      claim: { id: claimId, itemId, owner: workerId, expiresAt },
      item: structuredClone(item)
    };
  }

  async heartbeat(claimId) {
    const claim = this.claims.get(claimId) ?? parseClaimId(claimId);
    const item = this.items.get(claim.itemId);
    if (item) item.leaseExpiresAt = claim.expiresAt;
  }

  async verifyClaim(
    claimId,
    {
      allowStatusChanged = false,
      allowWorkerTypeChanged = false,
      requireHeadSha = false,
      requireAvailability = false
    } = {}
  ) {
    const claim = this.claims.get(claimId) ?? parseClaimId(claimId);
    const item = this.items.get(claim.itemId);
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
      if (requireHeadSha && !claim.headSha) return { active: false, reason: "missing_head_sha" };
      if (requireHeadSha && item.headSha && item.headSha !== claim.headSha) {
        return { active: false, reason: "head_drift" };
      }
      if (requireHeadSha && item.baseSha && claim.baseSha && item.baseSha !== claim.baseSha) {
        return { active: false, reason: "base_drift" };
      }
      if (requireAvailability) {
        const selection = evaluateQueueAvailability([...this.items.values()], {
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
    return { active: true, claim, item: structuredClone(item) };
  }

  async extendClaim(claimId, leaseSeconds) {
    const verified = await this.verifyClaim(claimId);
    if (!verified.active) return { extended: false, reason: "CLAIM_LOST" };
    const expiresAt = new Date(this.now().getTime() + leaseSeconds * 1000).toISOString();
    const item = this.items.get(verified.claim.itemId);
    item.leaseExpiresAt = expiresAt;
    return { extended: true, expiresAt };
  }

  async appendEvent(itemId, event) {
    this.events.push({ itemId, ...structuredClone(event) });
  }

  async appendEventForClaim(claimId, event, verifyOptions = {}) {
    const verified = await this.verifyClaim(claimId, verifyOptions);
    if (!verified.active) return { appended: false, reason: verified.reason };
    await this.appendEvent(verified.claim.itemId, event);
    return { appended: true };
  }

  async appendStageHandoffForClaim(claimId, { stage, inputFingerprint, payload }, verifyOptions = {}) {
    const verified = await this.verifyClaim(claimId, verifyOptions);
    if (!verified.active) return { appended: false, reason: verified.reason };
    const commentable = verified.item.contentType === "Issue" ||
      (verified.item.contentType === "PullRequest" && ["review", "babysit"].includes(stage));
    if (!commentable || !verified.item.number) {
      return { appended: false, reason: "unsupported_content_type" };
    }
    const envelope = createStageHandoff({
      secret: this.handoffSecret,
      repository: verified.claim.repository,
      issueNumber: verified.item.number,
      itemId: verified.item.id,
      stage,
      inputFingerprint,
      payload,
      createdAt: this.now().toISOString()
    });
    const recovered = this.handoffs.find((handoff) => handoff.envelope.operationId === envelope.operationId);
    if (recovered) return { appended: true, recovered: true, envelope: structuredClone(recovered.envelope) };
    this.handoffs.push({ itemId: verified.item.id, envelope });
    return { appended: true, envelope: structuredClone(envelope) };
  }

  async loadStageHandoffsForClaim(claimId, { stages, ...verifyOptions } = {}) {
    const verified = await this.verifyClaim(claimId, verifyOptions);
    if (!verified.active) throw new Error(`claim lost: ${verified.reason}`);
    return this.loadStageHandoffsForItem(verified.item, {
      stages,
      repository: verified.claim.repository
    });
  }

  async loadStageHandoffsForItem(item, { stages, repository = item?.repository } = {}) {
    if (!["Issue", "PullRequest"].includes(item.contentType) || !item.number) {
      return { handoffs: [], fingerprint: contextFingerprint([]), item: structuredClone(item), reason: "unsupported_content_type" };
    }
    const wanted = new Set(stages ?? []);
    const latestByStage = new Map();
    for (const [index, record] of this.handoffs.entries()) {
      if (record.itemId !== item.id || (wanted.size && !wanted.has(record.envelope.stage))) continue;
      verifyStageHandoff(record.envelope, {
        secret: this.handoffSecret,
        repository,
        issueNumber: item.number,
        itemId: item.id
      });
      latestByStage.set(record.envelope.stage, { commentId: `memory-${index}`, envelope: structuredClone(record.envelope) });
    }
    const handoffs = [...latestByStage.values()];
    return {
      handoffs,
      item: structuredClone(item),
      fingerprint: contextFingerprint(handoffs.map(({ commentId, envelope }) => ({
        commentId,
        operationId: envelope.operationId,
        payloadHash: envelope.payloadHash
      })))
    };
  }

  async transition(itemId, status) {
    const item = this.items.get(itemId);
    if (!item) return;
    item.status = status;
  }

  async migrateToImplementationPlanning(itemId) {
    const item = this.items.get(itemId);
    if (!item) return { migrated: false, reason: "missing" };
    if (item.leaseOwner && item.leaseExpiresAt && new Date(item.leaseExpiresAt) > this.now()) {
      return { migrated: false, reason: "active_lease" };
    }
    if (![Status.IMPLEMENTATION, Status.REVIEW].includes(item.status)) {
      return { migrated: false, reason: "status_changed" };
    }
    item.status = Status.IMPLEMENTATION_PLANNING;
    delete item.workerType;
    delete item.leaseOwner;
    delete item.leaseExpiresAt;
    return { migrated: true, itemId };
  }

  async transitionForClaim(claimId, status, verifyOptions = {}) {
    const verified = await this.verifyClaim(claimId, verifyOptions);
    if (!verified.active) return { transitioned: false, reason: verified.reason };
    await this.transition(verified.claim.itemId, status);
    return { transitioned: true };
  }

  async reconcileLifecycleEvent(event) {
    const item = [...this.items.values()].find((candidate) => {
      if (candidate.repository !== event.repository) return false;
      if (event.eventName === "issues") return candidate.contentType === "Issue" && candidate.number === event.issueNumber;
      return candidate.pullRequestNumber === (event.pullRequestNumber ?? event.issueNumber) ||
        (candidate.contentType === "PullRequest" && candidate.number === (event.pullRequestNumber ?? event.issueNumber));
    });
    if (!item) return { reconciled: false, reason: "missing" };
    if (event.eventName === "issues" && event.action === "closed") {
      const status = event.issueStateReason === "not_planned" ? Status.CANCELED : Status.DONE;
      if (item.status === Status.DONE || item.status === status) {
        return { reconciled: false, reason: "terminal_state_protected" };
      }
      item.status = status;
    } else if (event.eventName === "pull_request" && event.action === "closed" && event.pullRequestMerged) {
      item.status = Status.DONE;
    } else if (event.eventName === "pull_request" && event.action === "closed") {
      if (item.status === Status.DONE) return { reconciled: false, reason: "terminal_state_protected" };
      item.status = Status.CANCELED;
    } else if (
      event.eventName === "reaction" &&
      event.reactionSubject === "pull_request_description" &&
      event.reactionContent === "+1"
    ) {
      if (!this.ownerApprovers.has(String(event.reactionUser ?? "").toLowerCase())) {
        return { reconciled: false, reason: "unauthorized_approval" };
      }
      if (event.action === "created" && item.status === Status.BABYSIT) {
        delete item.approvalInvalidatedHeadSha;
        if (item.lastWorkerRun) {
          try {
            const prior = parseClaimId(item.lastWorkerRun);
            if (isClaimV2(prior) && prior.approvalInvalidatedHeadSha) {
              item.lastWorkerRun = createClaimV2Id({ ...prior, approvalInvalidatedHeadSha: undefined });
            }
          } catch {
            // Invalid legacy run metadata remains visible for operator repair.
          }
        }
        item.status = Status.READY_FOR_OWNER;
      }
      else if (event.action === "deleted" && item.status === Status.READY_FOR_OWNER) {
        item.status = Status.BABYSIT;
        item.availableAfter = undefined;
      }
      else return { reconciled: false, reason: "no_transition" };
    } else if (event.eventName === "pull_request" && event.action === "synchronize") {
      let prior;
      try {
        prior = item.lastWorkerRun ? parseClaimId(item.lastWorkerRun) : null;
      } catch {
        return { reconciled: false, reason: "invalid_last_worker_run" };
      }
      if (isClaimV2(prior) && prior.headSha === event.pullRequestHeadSha) {
        return { reconciled: false, reason: "no_transition" };
      }
      const ownerApprovalInvalidated = item.status === Status.READY_FOR_OWNER;
      if (ownerApprovalInvalidated) {
        item.status = Status.BABYSIT;
        delete item.workerType;
        delete item.leaseOwner;
        delete item.leaseExpiresAt;
      }
      if (isClaimV2(prior)) {
        item.lastWorkerRun = createClaimV2Id({
          ...prior,
          headSha: event.pullRequestHeadSha,
          nextEligibleAt: undefined,
          approvalInvalidatedHeadSha: ownerApprovalInvalidated
            ? event.pullRequestHeadSha
            : prior.approvalInvalidatedHeadSha
        });
      }
      item.headSha = event.pullRequestHeadSha;
      item.availableAfter = undefined;
      if (!ownerApprovalInvalidated && !(isClaimV2(prior) && prior.nextEligibleAt)) {
        return { reconciled: false, reason: "no_transition" };
      }
      return {
        reconciled: true,
        itemId: item.id,
        status: ownerApprovalInvalidated ? Status.BABYSIT : undefined,
        cooldownCleared: Boolean(prior?.nextEligibleAt),
        ownerApprovalInvalidated
      };
    } else {
      return { reconciled: false, reason: "no_transition" };
    }
    delete item.workerType;
    delete item.leaseOwner;
    delete item.leaseExpiresAt;
    return { reconciled: true, itemId: item.id, status: item.status };
  }

  async reconcileCompletedOperations() {
    const actions = [];
    for (const item of this.items.values()) {
      if (!item.lastWorkerRun || !item.leaseOwner || !item.leaseExpiresAt || new Date(item.leaseExpiresAt) <= this.now()) continue;
      let claim;
      try {
        claim = parseClaimId(item.lastWorkerRun);
      } catch {
        continue;
      }
      const stage = handoffStageForWorker(claim.resolvedWorkerType);
      if (!isClaimV2(claim) || !claim.operationId || !stage) continue;
      const completed = this.handoffs.find(
        (record) => record.itemId === item.id && record.envelope.stage === stage && record.envelope.operationId === claim.operationId
      );
      if (!completed) continue;
      delete item.workerType;
      delete item.leaseOwner;
      delete item.leaseExpiresAt;
      this.claims.delete(item.lastWorkerRun);
      actions.push({ itemId: item.id, operationId: claim.operationId, leaseReleased: true });
    }
    return { reconciled: actions.length, actions };
  }

  async setFieldForClaim(claimId, fieldName, value, verifyOptions = {}) {
    const verified = await this.verifyClaim(claimId, verifyOptions);
    if (!verified.active) return { updated: false, reason: verified.reason };
    const item = this.items.get(verified.claim.itemId);
    if (fieldName === "Last Worker Run") {
      const nextClaim = parseClaimId(value);
      item.lastWorkerRun = value;
      if (nextClaim.headSha) item.headSha = nextClaim.headSha;
      item.availableAfter = nextClaim.nextEligibleAt;
      this.claims.set(value, { id: value, ...nextClaim });
      this.claims.delete(claimId);
      return { updated: true };
    }
    item.fields ??= {};
    item.fields[fieldName] = value;
    return { updated: true };
  }

  async clearWorkerTypeForClaim(claimId, verifyOptions = {}) {
    const verified = await this.verifyClaim(claimId, { ...verifyOptions, allowStatusChanged: true });
    if (!verified.active) return { cleared: false, reason: verified.reason };
    const item = this.items.get(verified.claim.itemId);
    delete item.workerType;
    return { cleared: true };
  }

  async release(claimId) {
    return this.releaseClaim(claimId);
  }

  async releaseClaim(claimId, verifyOptions = {}) {
    const claim = this.claims.get(claimId) ?? parseClaimId(claimId);
    const verified = await this.verifyClaim(claimId, {
      ...verifyOptions,
      allowStatusChanged: true,
      allowWorkerTypeChanged: true
    });
    if (!verified.active) return { released: false, reason: verified.reason };
    const item = this.items.get(claim.itemId);
    if (item && item.leaseOwner === claim.workerId) {
      delete item.leaseOwner;
      delete item.leaseExpiresAt;
    }
    this.claims.delete(claimId);
    return { released: true };
  }

  async fail(claimId, reason) {
    return this.failClaim(claimId, reason);
  }

  async failClaim(claimId, reason, verifyOptions = {}) {
    const verified = await this.verifyClaim(claimId, verifyOptions);
    if (!verified.active) return { failed: false, reason: verified.reason };
    await this.appendEvent(verified.claim.itemId, {
      type: "worker_failed",
      actor: verified.claim.workerId,
      body: reason
    });
    await this.transition(verified.claim.itemId, Status.BLOCKED);
    const released = await this.releaseClaim(claimId);
    if (released?.released === false) return { failed: false, reason: released.reason };
    return { failed: true };
  }

  getItem(id) {
    return structuredClone(this.items.get(id));
  }

  async loadRemoteBranch({ repository, branchName }) {
    const item = [...this.items.values()].find(
      (candidate) => candidate.repository === repository && candidate.branchName === branchName && candidate.headSha
    );
    return item ? { branchName, headSha: item.headSha } : null;
  }

  async verifyOwnerApprovalForClaim(claimId) {
    const verified = await this.verifyClaim(claimId, { requireHeadSha: true });
    if (!verified.active) return { approved: false, reason: verified.reason };
    const actor = (verified.item.thumbsUpActors ?? []).find((login) => this.ownerApprovers.has(String(login).toLowerCase()));
    return actor ? { approved: true, actor } : { approved: false, reason: "authorized_thumbs_up_missing" };
  }

  async #claimItem({ item, workerType, workerId, leaseSeconds, availabilityFingerprint: fingerprint, context, version }) {
    const live = this.items.get(item.id);
    const now = this.now();
    const selection = evaluateQueueAvailability([...this.items.values()], {
      workerType,
      workerId,
      repositories: this.repositories,
      now
    });
    const candidate = selection.available.find((entry) => entry.item.id === live?.id);
    if (!candidate) {
      const unavailable = selection.unavailable.find((entry) => entry.item.id === live?.id);
      return { claimed: false, reason: unavailable?.reasons[0]?.code ?? "not_available" };
    }
    const expiresAt = new Date(now.getTime() + leaseSeconds * 1000).toISOString();
    const claimId =
      version === 2
        ? createClaimV2Id({
            itemId: live.id,
            workerId,
            attemptId: context.attemptId ?? `${workerId}:${Number(live.attempts ?? 0) + 1}`,
            runId: context.runId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            expiresAt,
            resolvedWorkerType: resolvedWorkerTypeForItem(live) ?? workerType,
            claimedStatus: live.status,
            claimedWorkerType: live.workerType,
            repository: live.repository ?? context.repository ?? "unknown/unknown",
            contentType: live.contentType ?? context.contentType ?? "Unknown",
            issueNumber: live.contentType === "Issue" ? live.number : undefined,
            pullRequestNumber: live.contentType === "PullRequest" ? live.number : undefined,
            prUrl: live.contentType === "PullRequest" ? live.url : context.prUrl,
            baseRef: live.baseRef,
            baseSha: live.baseSha,
            headRef: live.headRef,
            headRepository: live.headRepository,
            headSha: live.headSha,
            approvalInvalidatedHeadSha: approvalInvalidatedHeadSha(live),
            availabilityFingerprint: fingerprint ?? availabilityFingerprint(live),
            claimedAt: now.toISOString(),
            ...context
          })
        : createClaimId({ itemId: live.id, workerId, expiresAt });

    live.leaseOwner = workerId;
    live.leaseExpiresAt = expiresAt;
    live.lastWorkerRun = claimId;
    live.attempts = Number(live.attempts ?? 0) + 1;
    this.claims.set(claimId, { id: claimId, ...parseClaimId(claimId) });
    return {
      claimed: true,
      claim: {
        id: claimId,
        itemId: live.id,
        owner: workerId,
        expiresAt,
        availabilityFingerprint: fingerprint ?? availabilityFingerprint(live)
      },
      item: structuredClone(live)
    };
  }
}

function normalizeRepositoryFilter(repositories) {
  const values = Array.isArray(repositories) ? repositories : String(repositories ?? "").split(",");
  return new Set(values.map((value) => String(value).trim().toLowerCase()).filter(Boolean));
}

function approvalInvalidatedHeadSha(item) {
  if (item?.approvalInvalidatedHeadSha) return item.approvalInvalidatedHeadSha;
  if (!item?.lastWorkerRun) return undefined;
  try {
    const claim = parseClaimId(item.lastWorkerRun);
    return isClaimV2(claim) ? claim.approvalInvalidatedHeadSha : undefined;
  } catch {
    return undefined;
  }
}

function handoffStageForWorker(workerType) {
  return {
    "implementation-planner": "implementation_plan",
    implementer: "implementation",
    reviewer: "review",
    "pr-babysitter": "babysit"
  }[workerType];
}
