import { Status } from "../core/status.js";

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
      const claimResult = await this.adapter.claim(item.id, this.workerId, this.leaseSeconds);
      if (!claimResult.claimed) continue;

      const { claim } = claimResult;
      try {
        const result = await this.runWorker({
          item: claimResult.item ?? item,
          claim,
          workerId: this.workerId,
          workerType: this.workerType
        });

        await this.adapter.appendEvent(item.id, {
          type: "worker_result",
          actor: this.workerId,
          outcome: result.outcome,
          body: result.summary ?? "",
          evidence: result.evidence ?? [],
          blocker: result.blocker ?? null
        });

        if (result.outcome === "blocked" || result.outcome === "needs-human") {
          await this.adapter.transition(item.id, Status.BLOCKED);
        } else if (result.nextStatus) {
          await this.adapter.transition(item.id, result.nextStatus);
        }

        await this.adapter.release(claim.id);
        return { ran: true, itemId: item.id, result };
      } catch (error) {
        await this.adapter.fail(claim.id, error instanceof Error ? error.message : String(error));
        return { ran: true, itemId: item.id, error };
      }
    }

    return { ran: false };
  }
}

