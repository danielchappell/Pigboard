import { AdapterError } from "../../core/adapter-contract.js";
export { parseGitHubWebhook } from "./webhook.js";

export class GitHubProjectsAdapter {
  constructor({ token, organization, projectNumber, fetchImpl = globalThis.fetch }) {
    if (!token) throw new Error("token is required");
    if (!organization) throw new Error("organization is required");
    if (!projectNumber) throw new Error("projectNumber is required");
    if (!fetchImpl) throw new Error("fetch implementation is required");

    this.token = token;
    this.organization = organization;
    this.projectNumber = projectNumber;
    this.fetchImpl = fetchImpl;
  }

  async graphql(query, variables = {}) {
    const response = await this.fetchImpl("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "User-Agent": "ski-stack"
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new AdapterError(`GitHub GraphQL request failed: ${response.status}`, {
        code: "GITHUB_GRAPHQL_HTTP"
      });
    }

    const payload = await response.json();
    if (payload.errors?.length) {
      throw new AdapterError(payload.errors.map((error) => error.message).join("; "), {
        code: "GITHUB_GRAPHQL_ERROR"
      });
    }

    return payload.data;
  }

  async listReady() {
    throw new AdapterError("GitHubProjectsAdapter.listReady is not implemented yet", {
      code: "NOT_IMPLEMENTED"
    });
  }

  async claim() {
    throw new AdapterError("GitHubProjectsAdapter.claim is not implemented yet", {
      code: "NOT_IMPLEMENTED"
    });
  }

  async heartbeat() {
    throw new AdapterError("GitHubProjectsAdapter.heartbeat is not implemented yet", {
      code: "NOT_IMPLEMENTED"
    });
  }

  async appendEvent() {
    throw new AdapterError("GitHubProjectsAdapter.appendEvent is not implemented yet", {
      code: "NOT_IMPLEMENTED"
    });
  }

  async transition() {
    throw new AdapterError("GitHubProjectsAdapter.transition is not implemented yet", {
      code: "NOT_IMPLEMENTED"
    });
  }

  async release() {
    throw new AdapterError("GitHubProjectsAdapter.release is not implemented yet", {
      code: "NOT_IMPLEMENTED"
    });
  }

  async fail() {
    throw new AdapterError("GitHubProjectsAdapter.fail is not implemented yet", {
      code: "NOT_IMPLEMENTED"
    });
  }
}

