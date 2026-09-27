import { readFileSync } from "node:fs";

export const ROOT_TARGET = Object.freeze(JSON.parse(readFileSync(
  new URL("../../config/neon-pilot-root.json", import.meta.url), "utf8"
)));

export function checkRootTarget(candidate = {}) {
  const fields = ["host", "port", "database", "role"];
  const mismatch = fields.find((field) => candidate[field] !== ROOT_TARGET[field]);
  if (mismatch) {
    return {
      id: "root_target",
      status: "fail",
      reason: "target_mismatch",
      message: `The ${mismatch} is not the reviewed Pigboard production root. No connection was attempted.`
    };
  }
  return {
    id: "root_target", status: "pass", reason: "pinned_root",
    message: "The requested host, port, database and role match the reviewed production root."
  };
}

export function publicTarget() {
  const { projectId, branchId, host, port, database, role } = ROOT_TARGET;
  return { projectId, branchId, host, port, database, role };
}
