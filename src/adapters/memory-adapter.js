import { createClaimId, createClaimV2Id, isClaimV2, parseClaimId } from "../core/claims.js";
import { availabilityFingerprint, evaluateQueueAvailability } from "../core/availability.js";
import { resolvedWorkerTypeForItem } from "../core/routing.js";
import { Status } from "../core/status.js";

export class MemoryQueueAdapter {
  constructor(items = [], { now = () => new Date(), repositories = [] } = {}) {
    this.items = new Map(
      items.map((item, sourceOrder) => [
        item.id,
        structuredClone({ sourceOrder, dependencies: [], ...item })
      ])
    );
    this.claims = new Map();
    this.events = [];
    this.now = now;
    this.repositories = normalizeRepositoryFilter(repositories);
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

  async transition(itemId, status) {
    const item = this.items.get(itemId);
    if (!item) return;
    item.status = status;
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
    const item = this.items.get(verified.claim.itemId);
    if (fieldName === "Last Worker Run") {
      const nextClaim = parseClaimId(value);
      item.lastWorkerRun = value;
      if (nextClaim.headSha) item.headSha = nextClaim.headSha;
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
