import assert from "node:assert/strict";
import test from "node:test";

import { shouldRequeueWorkerSlot, Status, WorkerDrainScheduler } from "../src/index.js";

test("worker drain scheduler starts newly dirtied slots while another slot is still running", async () => {
  let releaseImplementer;
  const calls = [];
  const workers = new Map([
    [
      "implementer:repo:0",
      {
        runOnce: async () => {
          calls.push("implementer:start");
          await new Promise((resolve) => {
            releaseImplementer = resolve;
          });
          calls.push("implementer:done");
          return { ran: false };
        }
      }
    ],
    [
      "reviewer:repo:0",
      {
        runOnce: async () => {
          calls.push("reviewer");
          return { ran: false };
        }
      }
    ]
  ]);
  const scheduler = new WorkerDrainScheduler({ workers });

  scheduler.markDirty("implementer:repo:0");
  scheduler.requestDrain();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(calls, ["implementer:start"]);

  scheduler.markDirty("reviewer:repo:0");
  scheduler.requestDrain();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(calls, ["implementer:start", "reviewer"]);

  releaseImplementer();
  await scheduler.waitForIdle();
  assert.deepEqual(calls, ["implementer:start", "reviewer", "implementer:done"]);
});

test("worker drain scheduler does not immediately rerun a waiting same-status item", async () => {
  let runs = 0;
  const workers = new Map([
    [
      "pr-babysitter:repo:0",
      {
        runOnce: async () => {
          runs += 1;
          return {
            ran: true,
            itemId: "item-1",
            claimedStatus: Status.BABYSIT,
            status: Status.BABYSIT,
            result: { outcome: "no-op", nextStatus: Status.BABYSIT }
          };
        }
      }
    ]
  ]);
  const scheduler = new WorkerDrainScheduler({ workers });

  scheduler.markDirty("pr-babysitter:repo:0");
  scheduler.requestDrain();
  await scheduler.waitForIdle();

  assert.equal(runs, 1);
});

test("worker drain scheduler requeues a slot after a status-changing run", async () => {
  let runs = 0;
  const workers = new Map([
    [
      "implementer:repo:0",
      {
        runOnce: async () => {
          runs += 1;
          if (runs === 1) {
            return {
              ran: true,
              itemId: "item-1",
              claimedStatus: Status.IMPLEMENTATION,
              status: Status.REVIEW,
              result: { outcome: "completed", nextStatus: Status.REVIEW }
            };
          }
          return { ran: false, reason: "empty" };
        }
      }
    ]
  ]);
  const scheduler = new WorkerDrainScheduler({ workers });

  scheduler.markDirty("implementer:repo:0");
  scheduler.requestDrain();
  await scheduler.waitForIdle();

  assert.equal(runs, 2);
});

test("worker slot requeue decision only suppresses unchanged status results", () => {
  assert.equal(
    shouldRequeueWorkerSlot({
      ran: true,
      claimedStatus: Status.IMPLEMENTATION,
      status: Status.REVIEW,
      result: { outcome: "completed", nextStatus: Status.REVIEW }
    }),
    true
  );
  assert.equal(
    shouldRequeueWorkerSlot({
      ran: true,
      claimedStatus: Status.BABYSIT,
      status: Status.BABYSIT,
      result: { outcome: "no-op", nextStatus: Status.BABYSIT }
    }),
    false
  );
  assert.equal(shouldRequeueWorkerSlot({ ran: false, reason: "empty" }), false);
});
