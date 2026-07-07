const PROJECT_EVENTS = new Set(["projects_v2", "projects_v2_item", "projects_v2_status_update"]);

export function parseGitHubWebhook({ eventName, payload }) {
  if (!eventName) throw new Error("eventName is required");
  if (!payload || typeof payload !== "object") throw new Error("payload is required");

  if (PROJECT_EVENTS.has(eventName)) {
    return {
      source: "github",
      kind: "project",
      eventName,
      action: payload.action,
      organization: payload.organization?.login,
      projectNodeId: payload.projects_v2?.node_id ?? payload.projects_v2_item?.project_node_id,
      itemNodeId: payload.projects_v2_item?.node_id,
      delivery: payload.delivery
    };
  }

  return {
    source: "github",
    kind: "repo",
    eventName,
    action: payload.action,
    repository: payload.repository?.full_name,
    issueNumber: payload.issue?.number,
    pullRequestNumber: payload.pull_request?.number,
    delivery: payload.delivery
  };
}

