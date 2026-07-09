import assert from "node:assert/strict";
import test from "node:test";

import {
  isReadyForWorkerType,
  resolvedWorkerTypeForItem,
  Status,
  validateWorkerTransition,
  WorkerType
} from "../src/index.js";

test("status-first routing lets implementer claim Implementation with blank Worker Type", () => {
  const item = {
    id: "item-1",
    status: Status.IMPLEMENTATION,
    workerType: undefined
  };

  assert.equal(resolvedWorkerTypeForItem(item), WorkerType.IMPLEMENTER);
  assert.equal(isReadyForWorkerType(item, WorkerType.IMPLEMENTER), true);
});

test("status-first routing blocks implementer from QA", () => {
  assert.equal(
    isReadyForWorkerType({ id: "item-1", status: Status.QA, workerType: undefined }, WorkerType.IMPLEMENTER),
    false
  );
});

test("Worker Type override blocks status-inferred implementer", () => {
  assert.equal(
    isReadyForWorkerType(
      { id: "item-1", status: Status.IMPLEMENTATION, workerType: WorkerType.QA },
      WorkerType.IMPLEMENTER
    ),
    false
  );
});

test("v1 implementer can only complete to Review", () => {
  assert.equal(
    validateWorkerTransition({
      workerType: WorkerType.IMPLEMENTER,
      result: { outcome: "completed", nextStatus: Status.REVIEW }
    }),
    Status.REVIEW
  );
  assert.throws(
    () =>
      validateWorkerTransition({
        workerType: WorkerType.IMPLEMENTER,
        result: { outcome: "completed", nextStatus: Status.QA }
      }),
    /cannot transition to QA/
  );
});

test("automated reviewers cannot bypass Babysit and mark Done", () => {
  assert.throws(
    () =>
      validateWorkerTransition({
        workerType: WorkerType.REVIEWER,
        result: { outcome: "completed", nextStatus: Status.DONE }
      }),
    /reviewer cannot transition to Done/
  );
});

test("pr-babysitter can no-op and remain in Babysit", () => {
  assert.equal(
    validateWorkerTransition({
      workerType: WorkerType.PR_BABYSITTER,
      result: { outcome: "no-op", nextStatus: Status.BABYSIT }
    }),
    Status.BABYSIT
  );
});

test("pr-babysitter can move merge-gated PRs to QA only with the explicit flag", () => {
  assert.equal(
    validateWorkerTransition({
      workerType: WorkerType.PR_BABYSITTER,
      result: { outcome: "completed", nextStatus: Status.QA, mergeWhenApprovedAndClean: true }
    }),
    Status.QA
  );
  assert.throws(
    () =>
      validateWorkerTransition({
        workerType: WorkerType.PR_BABYSITTER,
        result: { outcome: "completed", nextStatus: Status.QA }
      }),
    /mergeWhenApprovedAndClean/
  );
});

test("pr-babysitter can terminally cancel superseded PRs", () => {
  assert.equal(
    validateWorkerTransition({
      workerType: WorkerType.PR_BABYSITTER,
      result: { outcome: "completed", nextStatus: Status.CANCELED }
    }),
    Status.CANCELED
  );
});

test("pr-babysitter does not route PR feedback back to implementation", () => {
  assert.throws(
    () =>
      validateWorkerTransition({
        workerType: WorkerType.PR_BABYSITTER,
        result: { outcome: "completed", nextStatus: Status.IMPLEMENTATION }
      }),
    /pr-babysitter cannot transition to Implementation/
  );
});
