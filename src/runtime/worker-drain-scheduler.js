import { runSettledWorkerSlot } from "./worker-slot.js";

export class WorkerDrainScheduler {
  constructor({ workers, runWorkerSlot = runSettledWorkerSlot, onError = console.error } = {}) {
    if (!workers) throw new Error("workers is required");
    this.workers = workers;
    this.runWorkerSlot = runWorkerSlot;
    this.onError = onError;
    this.dirty = new Set();
    this.inFlight = new Set();
    this.pending = new Set();
    this.scheduled = false;
  }

  markDirty(key) {
    if (this.workers.has(key)) this.dirty.add(key);
  }

  markAllDirty(predicate = () => true) {
    for (const [key, worker] of this.workers) {
      if (predicate(key, worker)) this.dirty.add(key);
    }
  }

  requestDrain() {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => this.drain());
  }

  drain() {
    this.scheduled = false;
    for (const key of [...this.dirty]) {
      if (this.inFlight.has(key)) continue;
      const worker = this.workers.get(key);
      this.dirty.delete(key);
      if (!worker) continue;
      this.startSlot(key, worker);
    }
  }

  startSlot(key, worker) {
    this.inFlight.add(key);
    const pending = Promise.resolve()
      .then(() => this.runWorkerSlot({ key, worker, onError: this.onError }))
      .then((result) => {
        if (shouldRequeueWorkerSlot(result)) this.dirty.add(key);
      })
      .catch((error) => {
        this.onError?.(error);
      })
      .finally(() => {
        this.inFlight.delete(key);
        this.pending.delete(pending);
        if (this.dirty.size) this.requestDrain();
      });
    this.pending.add(pending);
  }

  async waitForIdle() {
    while (this.scheduled || this.inFlight.size || this.pending.size) {
      if (!this.pending.size) {
        await Promise.resolve();
        continue;
      }
      await Promise.allSettled([...this.pending]);
    }
  }
}

export function shouldRequeueWorkerSlot(result) {
  if (!result?.ran) return false;
  const nextStatus = result.status ?? result.result?.nextStatus;
  if (nextStatus && result.claimedStatus && nextStatus === result.claimedStatus) return false;
  return true;
}
