import { parseClaimId } from "../core/claims.js";
import { Status } from "../core/status.js";

export async function applyWorkerResult({ adapter, claimId, result }) {
  if (!adapter) throw new Error("adapter is required");
  if (!claimId) throw new Error("claimId is required");
  if (!result) throw new Error("result is required");

  const claim = parseClaimId(claimId);

  if (result.outcome === "failed") {
    await adapter.fail(claimId, result.blocker ?? result.summary ?? "Worker failed");
    return { itemId: claim.itemId, status: Status.BLOCKED, released: true };
  }

  await adapter.appendEvent(claim.itemId, {
    type: "worker_result",
    actor: claim.workerId,
    outcome: result.outcome,
    body: result.summary ?? "",
    evidence: result.evidence ?? [],
    blocker: result.blocker ?? null
  });

  const status = statusForResult(result);
  if (status) await adapter.transition(claim.itemId, status);
  await adapter.release(claimId);

  return {
    itemId: claim.itemId,
    status,
    released: true
  };
}

function statusForResult(result) {
  if (result.outcome === "blocked" || result.outcome === "needs-human") {
    return Status.BLOCKED;
  }
  return result.nextStatus ?? null;
}

