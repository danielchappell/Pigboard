import { Status } from "./status.js";

export function planDeliveryLifecycleMigration(items, {
  now = new Date(),
  remoteBranches = new Map()
} = {}) {
  const changes = [];
  for (const item of items ?? []) {
    if (![Status.IMPLEMENTATION, Status.REVIEW].includes(item.status)) continue;
    const evidence = recoverableDeliveryEvidence(item, { now, remoteBranch: remoteBranches.get(item.id) });
    if (evidence) {
      changes.push({ itemId: item.id, action: "preserve", ...evidence });
      continue;
    }
    changes.push({
      itemId: item.id,
      action: "move",
      from: item.status,
      to: Status.IMPLEMENTATION_PLANNING
    });
  }
  return changes;
}

export function recoverableDeliveryEvidence(item, { now = new Date(), remoteBranch } = {}) {
  if (item?.leaseExpiresAt && new Date(item.leaseExpiresAt) > now) return { reason: "active_lease" };
  if (item?.hasSignedPlan) return { reason: "signed_plan" };
  if (item?.prUrl || item?.pullRequestNumber) return { reason: "pull_request" };
  if (remoteBranch?.headSha) {
    return { reason: "remote_branch", branchName: remoteBranch.branchName, headSha: remoteBranch.headSha };
  }
  if (item?.lastWorkerRun || Number(item?.attempts ?? 0) > 0) return { reason: "worker_evidence" };
  return null;
}
