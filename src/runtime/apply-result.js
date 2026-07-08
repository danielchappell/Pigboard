import { parseClaimId } from "../core/claims.js";
import { isAutoRunnableWorker, statusForResult, validateWorkerTransition } from "../core/routing.js";
import { Status } from "../core/status.js";

export async function applyWorkerResult({ adapter, claimId, result, workerType }) {
  if (!adapter) throw new Error("adapter is required");
  if (!claimId) throw new Error("claimId is required");
  if (!result) throw new Error("result is required");

  const claim = parseClaimId(claimId);
  const resolvedWorkerType = workerType ?? claim.resolvedWorkerType;

  if (resolvedWorkerType && isAutoRunnableWorker(resolvedWorkerType)) {
    validateWorkerTransition({ workerType: resolvedWorkerType, result });
  }

  if (result.outcome === "failed") {
    await guardedCall({
      adapter,
      claimAwareMethod: "failClaim",
      legacyMethod: "fail",
      claimId,
      legacyUsesClaimId: true,
      args: [result.blocker ?? result.summary ?? "Worker failed"],
      falseKey: "failed"
    });
    return { itemId: claim.itemId, status: Status.BLOCKED, released: true };
  }

  await guardedCall({
    adapter,
    claimAwareMethod: "appendEventForClaim",
    legacyMethod: "appendEvent",
    claimId,
    args: [
      {
        type: "worker_result",
        actor: claim.workerId,
        workerType: resolvedWorkerType ?? claim.workerId,
        runId: claim.runId ?? claim.attemptId ?? claim.workerId,
        outcome: result.outcome,
        nextStatus: result.nextStatus,
        body: result.summary ?? "",
        evidence: result.evidence ?? [],
        blocker: result.blocker ?? null
      }
    ],
    falseKey: "appended"
  });

  const status = statusForResult(result);
  if (status) {
    await guardedCall({
      adapter,
      claimAwareMethod: "transitionForClaim",
      legacyMethod: "transition",
      claimId,
      args: [status],
      falseKey: "transitioned"
    });
    if (result.preserveWorkerType !== true && typeof adapter.clearWorkerTypeForClaim === "function") {
      await guardedCall({
        adapter,
        claimAwareMethod: "clearWorkerTypeForClaim",
        legacyMethod: "clearWorkerType",
        claimId,
        falseKey: "cleared"
      });
    }
  }
  await guardedCall({
    adapter,
    claimAwareMethod: "releaseClaim",
    legacyMethod: "release",
    claimId,
    legacyUsesClaimId: true,
    falseKey: "released"
  });

  return {
    itemId: claim.itemId,
    status,
    released: true
  };
}

async function guardedCall({
  adapter,
  claimAwareMethod,
  legacyMethod,
  claimId,
  args = [],
  legacyUsesClaimId = false,
  falseKey
}) {
  let result;
  if (typeof adapter[claimAwareMethod] === "function") {
    result = await adapter[claimAwareMethod](claimId, ...args);
  } else {
    const claim = parseClaimId(claimId);
    result = await adapter[legacyMethod](legacyUsesClaimId ? claimId : claim.itemId, ...args);
  }
  if (falseKey && result?.[falseKey] === false) {
    throw new Error(`claim lost: ${result.reason ?? claimAwareMethod}`);
  }
  return result;
}
