import { Status, WorkerType } from "./status.js";

export const AUTO_RUN_WORKER_TYPES = new Set([
  WorkerType.IMPLEMENTATION_PLANNER,
  WorkerType.IMPLEMENTER,
  WorkerType.REVIEWER,
  WorkerType.PR_BABYSITTER
]);

export const WORKER_TYPE_BY_STATUS = Object.freeze({
  [Status.PLANNING]: WorkerType.PLANNER,
  [Status.ARCHITECTURE]: WorkerType.ARCHITECT,
  [Status.GROOMING]: WorkerType.GROOMER,
  [Status.READY]: WorkerType.RESEARCHER,
  [Status.IMPLEMENTATION_PLANNING]: WorkerType.IMPLEMENTATION_PLANNER,
  [Status.IMPLEMENTATION]: WorkerType.IMPLEMENTER,
  [Status.QA]: WorkerType.QA,
  [Status.REVIEW]: WorkerType.REVIEWER,
  [Status.BABYSIT]: WorkerType.PR_BABYSITTER
});

export const NONCLAIMABLE_STATUSES = new Set([
  Status.TODO,
  Status.READY_FOR_OWNER,
  Status.BLOCKED,
  Status.DONE,
  Status.CANCELED
]);

const COMPLETED_TRANSITIONS = Object.freeze({
  [WorkerType.IMPLEMENTATION_PLANNER]: new Set([Status.IMPLEMENTATION_PLANNING, Status.IMPLEMENTATION]),
  [WorkerType.IMPLEMENTER]: new Set([Status.REVIEW]),
  [WorkerType.REVIEWER]: new Set([Status.IMPLEMENTATION, Status.BABYSIT]),
  [WorkerType.PR_BABYSITTER]: new Set([Status.BABYSIT, Status.READY_FOR_OWNER, Status.CANCELED])
});

export function resolvedWorkerTypeForItem(item) {
  if (!item?.status || NONCLAIMABLE_STATUSES.has(item.status)) return undefined;
  if (item.workerType) return item.workerType;
  return WORKER_TYPE_BY_STATUS[item.status];
}

export function isReadyForWorkerType(item, workerType, now = new Date()) {
  if (!workerType) return false;
  if (!item || !item.status || NONCLAIMABLE_STATUSES.has(item.status)) return false;
  if (resolvedWorkerTypeForItem(item) !== workerType) return false;
  return !hasActiveLease(item, now);
}

export function hasActiveLease(item, now = new Date()) {
  if (!item?.leaseExpiresAt) return false;
  const expires = new Date(item.leaseExpiresAt);
  return Number.isFinite(expires.getTime()) && expires > now;
}

export function isAutoRunnableWorker(workerType) {
  return AUTO_RUN_WORKER_TYPES.has(workerType);
}

export function statusForResult(result) {
  if (["blocked", "needs-human", "failed"].includes(result?.outcome)) {
    return Status.BLOCKED;
  }
  return result?.nextStatus ?? null;
}

export function validateWorkerTransition({ workerType, result }) {
  if (!workerType) throw new Error("workerType is required");
  if (!result?.outcome) throw new Error("result.outcome is required");

  if (["blocked", "needs-human", "failed"].includes(result.outcome)) {
    return Status.BLOCKED;
  }

  if (workerType === WorkerType.IMPLEMENTER && result.outcome === "no-op") {
    throw new Error("implementer no-op cannot auto-advance in the current runtime");
  }
  if (
    workerType === WorkerType.IMPLEMENTATION_PLANNER &&
    result.outcome === "no-op" &&
    result.nextStatus !== Status.IMPLEMENTATION_PLANNING
  ) {
    throw new Error("implementation-planner no-op must remain in Implementation Planning");
  }

  if (!["completed", "no-op"].includes(result.outcome)) {
    throw new Error(`Unsupported worker outcome: ${result.outcome}`);
  }

  const nextStatus = result.nextStatus;
  if (!nextStatus) throw new Error("nextStatus is required for completed/no-op outcomes");

  const allowed = COMPLETED_TRANSITIONS[workerType];
  if (!allowed?.has(nextStatus)) {
    throw new Error(`${workerType} cannot transition to ${nextStatus}`);
  }
  return nextStatus;
}
