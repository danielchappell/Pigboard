import { applyWorkerResult } from "./apply-result.js";
import {
  claimNextAvailable,
  isAvailabilityChangeReason,
  verifyClaimAvailability
} from "./claim-next-available.js";

export class QueueDispatcher {
  constructor({ adapter, workerId, workerType, runWorker, leaseSeconds = 1800 }) {
    if (!adapter) throw new Error("adapter is required");
    if (!workerId) throw new Error("workerId is required");
    if (!workerType) throw new Error("workerType is required");
    if (!runWorker) throw new Error("runWorker is required");

    this.adapter = adapter;
    this.workerId = workerId;
    this.workerType = workerType;
    this.runWorker = runWorker;
    this.leaseSeconds = leaseSeconds;
  }

  async runOnce() {
    const claimResult = await claimNextAvailable({
      adapter: this.adapter,
      workerType: this.workerType,
      workerId: this.workerId,
      leaseSeconds: this.leaseSeconds
    });
    if (!claimResult.claimed) {
      return {
        ran: false,
        reason: claimResult.reason,
        skipped: claimResult.skipped,
        unavailable: claimResult.unavailable
      };
    }

    const { claim, item } = claimResult;
    try {
      const result = await this.runWorker({
        item,
        claim,
        workerId: this.workerId,
        workerType: this.workerType
      });
      const availability = await verifyClaimAvailability({
        adapter: this.adapter,
        claimId: claim.id,
        workerType: this.workerType,
        workerId: this.workerId
      });
      if (!availability.available) {
        return { ran: true, itemId: item.id, stale: true, reason: availability.reason, result };
      }

      await applyWorkerResult({
        adapter: this.adapter,
        claimId: claim.id,
        workerType: this.workerType,
        result,
        verifyOptions: { requireAvailability: true }
      });
      return { ran: true, itemId: item.id, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const reason = message.match(/^claim lost: ([a-z_]+)/)?.[1];
      if (isAvailabilityChangeReason(reason)) {
        await this.adapter.releaseClaim?.(claim.id);
        return { ran: true, itemId: item.id, stale: true, reason, error };
      }
      let failed;
      if (typeof this.adapter.failClaim === "function") {
        failed = await this.adapter.failClaim(claim.id, message);
      } else {
        failed = await this.adapter.fail(claim.id, message);
      }
      if (failed?.failed === false && typeof this.adapter.releaseClaim === "function") {
        await this.adapter.releaseClaim(claim.id);
      }
      return { ran: true, itemId: item.id, error };
    }
  }
}
