import { evaluateQueueAvailability } from "../core/availability.js";

const MAX_DIAGNOSTICS = 20;

export async function claimNextAvailable({
  adapter,
  workerType,
  workerId,
  leaseSeconds,
  itemId,
  context = {},
  repositories
}) {
  if (!adapter?.loadQueueSnapshot) throw new Error("adapter.loadQueueSnapshot is required");
  if (!adapter?.claimCandidate) throw new Error("adapter.claimCandidate is required");
  if (!workerType) throw new Error("workerType is required");
  if (!workerId) throw new Error("workerId is required");
  if (!leaseSeconds) throw new Error("leaseSeconds is required");

  const snapshot = await adapter.loadQueueSnapshot();
  const selection = evaluateQueueAvailability(snapshot, {
    workerType,
    workerId,
    repositories: repositories ?? adapter.repositories,
    now: adapter.now
  });
  const candidates = itemId
    ? selection.available.filter((candidate) => candidate.item.id === itemId)
    : selection.available;
  if (!candidates.length) {
    return {
      claimed: false,
      reason: itemId ? unavailableReasonForItem(selection, itemId) ?? "not_available" : "none_available",
      unavailable: summarizeUnavailable(selection.unavailable)
    };
  }

  const skipped = [];
  for (const candidate of candidates) {
    const claimed = await adapter.claimCandidate({
      itemId: candidate.item.id,
      workerType,
      workerId,
      leaseSeconds,
      expectedAvailabilityFingerprint: candidate.fingerprint,
      context
    });
    if (!claimed?.claimed) {
      skipped.push({ itemId: candidate.item.id, reason: claimed?.reason ?? "claim_rejected" });
      continue;
    }

    const verification = await verifyClaimAvailability({
      adapter,
      claimId: claimed.claim.id,
      workerType,
      workerId,
      repositories: repositories ?? adapter.repositories
    });
    if (verification.available) return claimed;
    skipped.push({ itemId: candidate.item.id, reason: verification.reason });
  }

  return {
    claimed: false,
    reason: skipped.length ? "candidates_changed" : "none_available",
    skipped: skipped.slice(0, MAX_DIAGNOSTICS),
    unavailable: summarizeUnavailable(selection.unavailable)
  };
}

export async function verifyClaimAvailability({ adapter, claimId, workerType, workerId, repositories }) {
  const verified = await adapter.verifyClaim(claimId, { requireAvailability: true });
  if (!verified.active) {
    if (isAvailabilityChangeReason(verified.reason)) {
      await adapter.releaseClaim?.(claimId);
    }
    return { available: false, reason: verified.reason ?? "claim_lost" };
  }

  const snapshot = await adapter.loadQueueSnapshot();
  const selection = evaluateQueueAvailability(snapshot, {
    workerType: workerType ?? verified.claim.resolvedWorkerType,
    workerId: workerId ?? verified.claim.workerId,
    repositories: repositories ?? adapter.repositories,
    now: adapter.now
  });
  const candidate = selection.available.find((entry) => entry.item.id === verified.claim.itemId);
  if (!candidate) {
    const unavailable = selection.unavailable.find((entry) => entry.item.id === verified.claim.itemId);
    const reason = unavailable?.reasons[0]?.code ?? "not_available";
    await adapter.releaseClaim?.(claimId);
    return { available: false, reason };
  }
  if (
    verified.claim.availabilityFingerprint &&
    candidate.fingerprint !== verified.claim.availabilityFingerprint
  ) {
    await adapter.releaseClaim?.(claimId);
    return { available: false, reason: "availability_changed" };
  }
  return { available: true, claim: verified.claim, item: candidate.item };
}

export function isAvailabilityChangeReason(reason) {
  return [
    "availability_changed",
    "status_changed",
    "worker_type_changed",
    "repository_changed",
    "status_mismatch",
    "worker_mismatch",
    "repository_mismatch",
    "foreign_lease",
    "not_available",
    "dependency_pending",
    "dependency_canceled",
    "dependency_unknown",
    "dependency_cycle"
  ].includes(reason);
}

function unavailableReasonForItem(selection, itemId) {
  return selection.unavailable.find((entry) => entry.item.id === itemId)?.reasons[0]?.code;
}

function summarizeUnavailable(unavailable) {
  return unavailable.slice(0, MAX_DIAGNOSTICS).map((entry) => ({
    itemId: entry.item.id,
    reasons: entry.reasons
  }));
}
