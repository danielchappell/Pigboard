import { Status, WorkerType } from "../../core/status.js";

export const githubProjectsSchema = Object.freeze({
  fields: [
    {
      name: "Status",
      type: "single_select",
      options: Object.values(Status)
    },
    {
      name: "Worker Type",
      type: "single_select",
      options: Object.values(WorkerType)
    },
    {
      name: "Priority",
      type: "single_select",
      options: ["P0", "P1", "P2", "P3"]
    },
    { name: "Lease Owner", type: "text" },
    { name: "Lease Expires", type: "text" },
    { name: "Attempts", type: "number" },
    { name: "Last Worker Run", type: "text" },
    { name: "PR", type: "text" },
    { name: "Epic", type: "text" }
  ],
  labels: [
    "ski:planning",
    "ski:architecture",
    "ski:grooming",
    "ski:implementation",
    "ski:qa",
    "ski:review",
    "ski:babysit",
    "ski:blocked"
  ]
});
