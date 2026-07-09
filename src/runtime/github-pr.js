export async function ensurePullRequest({
  token,
  repository,
  branchName,
  baseBranch,
  title,
  body,
  fetchImpl = globalThis.fetch
}) {
  if (!token) throw new Error("GitHub token is required to create or update pull requests");
  if (!repository) throw new Error("repository is required");
  if (!branchName) throw new Error("branchName is required");
  if (!baseBranch) throw new Error("baseBranch is required");
  if (!fetchImpl) throw new Error("fetch implementation is required");

  const [owner, repo] = repository.split("/");
  if (!owner || !repo) throw new Error(`Invalid GitHub repository: ${repository}`);

  const existing = await githubJson({
    token,
    fetchImpl,
    method: "GET",
    path: `/repos/${owner}/${repo}/pulls?state=open&head=${encodeURIComponent(`${owner}:${branchName}`)}&base=${encodeURIComponent(baseBranch)}`
  });
  if (existing[0]) {
    const updated = await githubJson({
      token,
      fetchImpl,
      method: "PATCH",
      path: `/repos/${owner}/${repo}/pulls/${existing[0].number}`,
      body: { title, body }
    });
    return normalizePullRequest(updated);
  }

  const created = await githubJson({
    token,
    fetchImpl,
    method: "POST",
    path: `/repos/${owner}/${repo}/pulls`,
    body: {
      title,
      head: branchName,
      base: baseBranch,
      body,
      maintainer_can_modify: true
    }
  });
  return normalizePullRequest(created);
}

export async function mergePullRequest({
  token,
  repository,
  number,
  expectedHeadSha,
  method = "squash",
  title,
  message,
  fetchImpl = globalThis.fetch
}) {
  if (!token) throw new Error("GitHub token is required to merge pull requests");
  if (!repository) throw new Error("repository is required");
  if (!number) throw new Error("pull request number is required");
  if (!expectedHeadSha) throw new Error("expectedHeadSha is required");
  if (!fetchImpl) throw new Error("fetch implementation is required");

  const [owner, repo] = repository.split("/");
  if (!owner || !repo) throw new Error(`Invalid GitHub repository: ${repository}`);

  const body = {
    sha: expectedHeadSha,
    merge_method: method
  };
  if (title) body.commit_title = title;
  if (message) body.commit_message = message;

  const merged = await githubJson({
    token,
    fetchImpl,
    method: "PUT",
    path: `/repos/${owner}/${repo}/pulls/${number}/merge`,
    body
  });
  if (merged.merged !== true) {
    throw new Error(`GitHub did not merge pull request: ${merged.message ?? "merge rejected"}`);
  }
  return {
    merged: true,
    sha: merged.sha,
    message: merged.message
  };
}

async function githubJson({ token, fetchImpl, method, path, body }) {
  const response = await fetchImpl(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "ski-stack"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub REST ${method} ${path} failed: ${response.status} ${text}`);
  }
  return response.json();
}

function normalizePullRequest(pr) {
  return {
    number: pr.number,
    url: pr.html_url,
    nodeId: pr.node_id,
    headSha: pr.head?.sha,
    baseSha: pr.base?.sha
  };
}
