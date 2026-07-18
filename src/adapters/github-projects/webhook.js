const PROJECT_EVENTS = new Set(["projects_v2", "projects_v2_item", "projects_v2_status_update"]);

export function isGlobalQueueWakeup(event) {
  return event?.kind === "project" || ["issues", "pull_request", "reaction"].includes(event?.eventName);
}

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
    ...compact({
      issueStateReason: payload.issue?.state_reason,
      pullRequestUrl: payload.pull_request?.html_url,
      pullRequestMerged: payload.pull_request?.merged === true,
      pullRequestHeadSha: payload.pull_request?.head?.sha,
      reactionContent: payload.reaction?.content,
      reactionUser: payload.sender?.login ?? payload.reaction?.user?.login,
      reactionId: payload.reaction?.id,
      reactionSubject: eventName === "reaction"
        ? payload.comment
          ? "comment"
          : payload.issue?.pull_request
            ? "pull_request_description"
            : payload.issue
              ? "issue"
              : undefined
        : undefined
    }),
    delivery: payload.delivery
  };
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== false));
}
