import { applyWorkerResult } from "./apply-result.js";

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
    const readyItems = await this.adapter.listReady(this.workerType);

    for (const item of readyItems) {
      const claimResult =
        typeof this.adapter.claimReadyForWorker === "function"
          ? await this.adapter.claimReadyForWorker({
              itemId: item.id,
              workerType: this.workerType,
              workerId: this.workerId,
              leaseSeconds: this.leaseSeconds
            })
          : await this.adapter.claim(item.id, this.workerId, this.leaseSeconds);
      if (!claimResult.claimed) continue;

      const { claim } = claimResult;
      try {
        const result = await this.runWorker({
          item: claimResult.item ?? item,
          claim,
          workerId: this.workerId,
          workerType: this.workerType
        });

        await applyWorkerResult({
          adapter: this.adapter,
          claimId: claim.id,
          workerType: this.workerType,
          result
        });
        return { ran: true, itemId: item.id, result };
      } catch (error) {
        if (typeof this.adapter.failClaim === "function") {
          await this.adapter.failClaim(claim.id, error instanceof Error ? error.message : String(error));
        } else {
          await this.adapter.fail(claim.id, error instanceof Error ? error.message : String(error));
        }
        return { ran: true, itemId: item.id, error };
      }
    }

    return { ran: false };
  }
}
