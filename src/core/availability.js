import { createHash } from "node:crypto";

import { hasActiveLease, resolvedWorkerTypeForItem } from "./routing.js";

export const DependencyState = Object.freeze({
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELED: "canceled",
  UNKNOWN: "unknown"
});

export const UnavailableReason = Object.freeze({
  STATUS: "status_mismatch",
  WORKER: "worker_mismatch",
  REPOSITORY: "repository_mismatch",
  FOREIGN_LEASE: "foreign_lease",
  NOT_BEFORE: "not_before",
  SOURCE_TERMINAL: "source_terminal",
  UNSUPPORTED_CONTENT_TYPE: "unsupported_content_type",
  DEPENDENCY_PENDING: "dependency_pending",
  DEPENDENCY_CANCELED: "dependency_canceled",
  DEPENDENCY_UNKNOWN: "dependency_unknown",
  DEPENDENCY_CYCLE: "dependency_cycle"
});

const MAX_REASONS_PER_ITEM = 20;

export function evaluateQueueAvailability(snapshot, options = {}) {
  const items = Array.isArray(snapshot) ? snapshot : snapshot?.items ?? [];
  const now = normalizeNow(options.now);
  const repositories = normalizeRepositories(options.repositories);
  const cycleIds = findCyclicItemIds(items);
  const available = [];
  const unavailable = [];

  for (const item of items) {
    const reasons = availabilityReasons(item, {
      workerType: options.workerType,
      workerId: options.workerId,
      repositories,
      now,
      cycleIds
    });
    const candidate = {
      item,
      fingerprint: availabilityFingerprint(item)
    };
    if (reasons.length) unavailable.push({ ...candidate, reasons });
    else available.push(candidate);
  }

  available.sort((left, right) => compareAvailableItems(left.item, right.item));
  return { available, unavailable };
}

export function availabilityFingerprint(item) {
  const dependencies = normalizeDependencies(item?.dependencies)
    .map((dependency) => ({
      kind: dependency.kind,
      targetId: dependency.targetId,
      state: dependency.state
    }))
    .sort(compareDependencies);
  const payload = JSON.stringify({
    status: item?.status ?? null,
    workerType: item?.workerType ?? null,
    resolvedWorkerType: resolvedWorkerTypeForItem(item) ?? null,
    repository: item?.repository ?? null,
    contentType: item?.contentType ?? null,
    contentState: item?.contentState ?? null,
    availableAfter: normalizeAvailableAfter(item?.availableAfter),
    dependencies
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function compareAvailableItems(left, right) {
  const priority = priorityRank(left?.priority) - priorityRank(right?.priority);
  if (priority) return priority;
  const sourceOrder = normalizeSourceOrder(left?.sourceOrder) - normalizeSourceOrder(right?.sourceOrder);
  if (sourceOrder) return sourceOrder;
  return compareStrings(stableItemId(left), stableItemId(right));
}

export function priorityRank(priority = "P3") {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[priority] ?? 99;
}

export function normalizeDependencies(dependencies) {
  if (!Array.isArray(dependencies)) return [];
  return dependencies.map((dependency) => ({
    kind: String(dependency?.kind ?? "blocks"),
    targetId: dependency?.targetId == null ? "" : String(dependency.targetId),
    title: dependency?.title == null ? undefined : String(dependency.title),
    url: dependency?.url == null ? undefined : String(dependency.url),
    state: normalizeDependencyState(dependency?.state)
  }));
}

export function findCyclicItemIds(items) {
  const ids = new Set(items.map(queueGraphId).filter(Boolean));
  const graph = new Map();
  for (const item of items) {
    const id = queueGraphId(item);
    if (!id) continue;
    graph.set(
      id,
      normalizeDependencies(item.dependencies)
        .map((dependency) => dependency.targetId)
        .filter((targetId) => ids.has(targetId))
    );
  }

  const indexById = new Map();
  const lowLinkById = new Map();
  const stack = [];
  const onStack = new Set();
  const cyclic = new Set();
  let nextIndex = 0;

  function visit(id) {
    indexById.set(id, nextIndex);
    lowLinkById.set(id, nextIndex);
    nextIndex += 1;
    stack.push(id);
    onStack.add(id);

    for (const targetId of graph.get(id) ?? []) {
      if (!indexById.has(targetId)) {
        visit(targetId);
        lowLinkById.set(id, Math.min(lowLinkById.get(id), lowLinkById.get(targetId)));
      } else if (onStack.has(targetId)) {
        lowLinkById.set(id, Math.min(lowLinkById.get(id), indexById.get(targetId)));
      }
    }

    if (lowLinkById.get(id) !== indexById.get(id)) return;
    const component = [];
    let current;
    do {
      current = stack.pop();
      onStack.delete(current);
      component.push(current);
    } while (current !== id);
    if (component.length > 1 || (graph.get(id) ?? []).includes(id)) {
      for (const componentId of component) cyclic.add(componentId);
    }
  }

  for (const id of graph.keys()) {
    if (!indexById.has(id)) visit(id);
  }
  return cyclic;
}

function availabilityReasons(item, { workerType, workerId, repositories, now, cycleIds }) {
  const reasons = [];
  const resolvedWorkerType = resolvedWorkerTypeForItem(item);
  if (!resolvedWorkerType) {
    reasons.push({ code: UnavailableReason.STATUS });
  } else if (workerType && resolvedWorkerType !== workerType) {
    reasons.push({ code: UnavailableReason.WORKER, expected: workerType, actual: resolvedWorkerType });
  }
  if (repositories.size && !repositories.has(String(item?.repository ?? "").toLowerCase())) {
    reasons.push({ code: UnavailableReason.REPOSITORY, repository: item?.repository });
  }
  if (hasActiveLease(item, now) && (!workerId || item.leaseOwner !== workerId)) {
    reasons.push({ code: UnavailableReason.FOREIGN_LEASE, leaseOwner: item.leaseOwner });
  }
  const availableAfter = normalizeAvailableAfter(item?.availableAfter);
  if (availableAfter && availableAfter > now.toISOString()) {
    reasons.push({ code: UnavailableReason.NOT_BEFORE, availableAfter });
  }
  if (
    resolvedWorkerType &&
    item?.contentType &&
    (item.contentType === "DraftIssue" ||
      (["implementation-planner", "implementer"].includes(resolvedWorkerType) && item.contentType !== "Issue"))
  ) {
    reasons.push({ code: UnavailableReason.UNSUPPORTED_CONTENT_TYPE, contentType: item.contentType });
  }
  if (
    (item?.contentType === "Issue" && item.contentState === "CLOSED") ||
    (item?.contentType === "PullRequest" && ["CLOSED", "MERGED"].includes(item.contentState))
  ) {
    reasons.push({ code: UnavailableReason.SOURCE_TERMINAL, contentState: item.contentState });
  }

  const itemGraphId = queueGraphId(item);
  if (itemGraphId && cycleIds.has(itemGraphId)) {
    reasons.push({ code: UnavailableReason.DEPENDENCY_CYCLE, targetId: itemGraphId });
  }
  for (const dependency of normalizeDependencies(item?.dependencies)) {
    if (reasons.length >= MAX_REASONS_PER_ITEM) break;
    const detail = dependencyDetail(dependency);
    if (dependency.state === DependencyState.ACTIVE) {
      reasons.push({ code: UnavailableReason.DEPENDENCY_PENDING, ...detail });
    } else if (dependency.state === DependencyState.CANCELED) {
      reasons.push({ code: UnavailableReason.DEPENDENCY_CANCELED, ...detail });
    } else if (dependency.state !== DependencyState.COMPLETED || !dependency.targetId) {
      reasons.push({ code: UnavailableReason.DEPENDENCY_UNKNOWN, ...detail });
    }
  }
  return reasons.slice(0, MAX_REASONS_PER_ITEM);
}

function dependencyDetail(dependency) {
  return {
    kind: dependency.kind,
    targetId: dependency.targetId || undefined,
    title: dependency.title,
    url: dependency.url
  };
}

function normalizeDependencyState(state) {
  return Object.values(DependencyState).includes(state) ? state : DependencyState.UNKNOWN;
}

function compareDependencies(left, right) {
  return compareStrings(
    `${left.kind}\u0000${left.targetId}\u0000${left.state}`,
    `${right.kind}\u0000${right.targetId}\u0000${right.state}`
  );
}

function compareStrings(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function normalizeNow(now) {
  if (now instanceof Date) return now;
  if (typeof now === "function") return normalizeNow(now());
  return now ? new Date(now) : new Date();
}

function normalizeRepositories(repositories) {
  if (repositories instanceof Set) {
    return new Set([...repositories].map((repository) => String(repository).toLowerCase()));
  }
  const values = Array.isArray(repositories) ? repositories : String(repositories ?? "").split(",");
  return new Set(values.map((repository) => String(repository).trim().toLowerCase()).filter(Boolean));
}

function normalizeSourceOrder(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
}

function normalizeAvailableAfter(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function stableItemId(item) {
  return String(item?.id ?? item?.contentId ?? "");
}

function queueGraphId(item) {
  const id = item?.contentId ?? item?.id;
  return id == null ? "" : String(id);
}
