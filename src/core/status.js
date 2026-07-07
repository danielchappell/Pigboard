export const Status = Object.freeze({
  INBOX: "Inbox",
  PLANNING: "Planning",
  ARCHITECTURE: "Architecture",
  GROOMING: "Grooming",
  READY: "Ready",
  IMPLEMENTATION: "Implementation",
  QA: "QA",
  REVIEW: "Review",
  BABYSIT: "Babysit",
  BLOCKED: "Blocked",
  DONE: "Done",
  CANCELED: "Canceled"
});

export const WorkerType = Object.freeze({
  PLANNER: "planner",
  ARCHITECT: "architect",
  GROOMER: "groomer",
  IMPLEMENTER: "implementer",
  QA: "qa",
  REVIEWER: "reviewer",
  PR_BABYSITTER: "pr-babysitter",
  RESEARCHER: "researcher"
});

export const TERMINAL_STATUSES = new Set([Status.DONE, Status.CANCELED]);

export const READY_STATUS_BY_WORKER_TYPE = Object.freeze({
  [WorkerType.PLANNER]: Status.PLANNING,
  [WorkerType.ARCHITECT]: Status.ARCHITECTURE,
  [WorkerType.GROOMER]: Status.GROOMING,
  [WorkerType.IMPLEMENTER]: Status.IMPLEMENTATION,
  [WorkerType.QA]: Status.QA,
  [WorkerType.REVIEWER]: Status.REVIEW,
  [WorkerType.PR_BABYSITTER]: Status.BABYSIT,
  [WorkerType.RESEARCHER]: Status.READY
});

export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(status);
}

export function readyStatusForWorker(workerType) {
  return READY_STATUS_BY_WORKER_TYPE[workerType] ?? Status.READY;
}
