import { Status, readyStatusForWorker } from "../core/status.js";
import { createClaimId, parseClaimId } from "../core/claims.js";

export class MemoryQueueAdapter {
  constructor(items = [], { now = () => new Date() } = {}) {
    this.items = new Map(items.map((item) => [item.id, structuredClone(item)]));
    this.claims = new Map();
    this.events = [];
    this.now = now;
  }

  async listReady(workerType) {
    const now = this.now();
    const workerStatus = readyStatusForWorker(workerType);
    return [...this.items.values()]
      .filter((item) => item.workerType === workerType)
      .filter((item) => item.status === Status.READY || item.status === workerStatus || item.status === item.readyStatus)
      .filter((item) => !item.leaseExpiresAt || new Date(item.leaseExpiresAt) <= now)
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
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
    this.claims.set(claimId, { id: claimId, itemId, workerId, expiresAt });

    return {
      claimed: true,
      claim: { id: claimId, itemId, owner: workerId, expiresAt },
      item: structuredClone(item)
    };
  }

  async heartbeat(claimId) {
    const claim = this.claims.get(claimId);
    if (!claim) return;
    const item = this.items.get(claim.itemId);
    if (item) item.leaseExpiresAt = claim.expiresAt;
  }

  async appendEvent(itemId, event) {
    this.events.push({ itemId, ...structuredClone(event) });
  }

  async transition(itemId, status) {
    const item = this.items.get(itemId);
    if (!item) return;
    item.status = status;
  }

  async release(claimId) {
    const claim = this.claims.get(claimId) ?? parseClaimId(claimId);
    const item = this.items.get(claim.itemId);
    if (item && item.leaseOwner === claim.workerId) {
      delete item.leaseOwner;
      delete item.leaseExpiresAt;
    }
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

  getItem(id) {
    return structuredClone(this.items.get(id));
  }
}

function priorityRank(priority = "P3") {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[priority] ?? 99;
}
