/**
 * Queue adapters implement this contract:
 *
 * - listReady(workerType): Promise<WorkItem[]>
 * - claim(itemId, workerId, leaseSeconds): Promise<ClaimResult>
 * - heartbeat(claimId): Promise<void>
 * - appendEvent(itemId, event): Promise<void>
 * - transition(itemId, status): Promise<void>
 * - release(claimId): Promise<void>
 * - fail(claimId, reason): Promise<void>
 *
 * This file is intentionally documentation-only. JavaScript adapters stay
 * dependency-light while tests enforce behavior through shared fixtures.
 */

export class AdapterError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AdapterError";
    this.code = options.code ?? "ADAPTER_ERROR";
    this.cause = options.cause;
  }
}

export class ClaimLostError extends AdapterError {
  constructor(message = "Work item claim is no longer active") {
    super(message, { code: "CLAIM_LOST" });
    this.name = "ClaimLostError";
  }
}

