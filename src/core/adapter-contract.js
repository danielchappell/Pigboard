/**
 * Queue adapters implement this contract:
 *
 * - listReady(workerType): Promise<WorkItem[]>
 * - claimReadyForWorker({ workerType, workerId, leaseSeconds, itemId, context }): Promise<ClaimResult>
 * - verifyClaim(claimId, options): Promise<ClaimVerification>
 * - extendClaim(claimId, leaseSeconds): Promise<ClaimExtension>
 * - appendEvent(itemId, event): Promise<void>
 * - appendEventForClaim(claimId, event, options): Promise<GuardedMutationResult>
 * - transition(itemId, status): Promise<void>
 * - transitionForClaim(claimId, status, options): Promise<GuardedMutationResult>
 * - setFieldForClaim(claimId, fieldName, value, options): Promise<GuardedMutationResult>
 * - clearWorkerTypeForClaim(claimId, options): Promise<GuardedMutationResult>
 * - releaseClaim(claimId, options): Promise<GuardedMutationResult>
 * - failClaim(claimId, reason, options): Promise<GuardedMutationResult>
 *
 * Legacy claim/heartbeat/release/fail names may exist as compatibility shims.
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
