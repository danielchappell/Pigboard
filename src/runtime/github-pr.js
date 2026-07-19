export async function ensurePullRequest({
  token,
  repository,
  branchName,
  baseBranch,
  expectedHeadSha,
  draft = false,
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
    assertExpectedPullRequest(normalizePullRequest(existing[0]), {
      expectedHeadSha,
      repository,
      branchName,
      baseBranch
    });
    const updated = await githubJson({
      token,
      fetchImpl,
      method: "PATCH",
      path: `/repos/${owner}/${repo}/pulls/${existing[0].number}`,
      body: { title, body }
    });
    const ready = draft === false && updated.draft === true
      ? await markPullRequestReady({ token, nodeId: updated.node_id, fetchImpl })
      : updated;
    return assertExpectedPullRequest(normalizePullRequest(ready), { expectedHeadSha, repository, branchName, baseBranch });
  }

  try {
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
        draft,
        maintainer_can_modify: true
      }
    });
    return assertExpectedPullRequest(normalizePullRequest(created), { expectedHeadSha, repository, branchName, baseBranch });
  } catch (error) {
    if (error?.status !== 422) throw error;
    const recovered = await githubJson({
      token,
      fetchImpl,
      method: "GET",
      path: `/repos/${owner}/${repo}/pulls?state=open&head=${encodeURIComponent(`${owner}:${branchName}`)}&base=${encodeURIComponent(baseBranch)}`
    });
    if (!recovered[0]) throw error;
    const ready = draft === false && recovered[0].draft === true
      ? await markPullRequestReady({ token, nodeId: recovered[0].node_id, fetchImpl })
      : recovered[0];
    return assertExpectedPullRequest(normalizePullRequest(ready), { expectedHeadSha, repository, branchName, baseBranch });
  }
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
    throw Object.assign(new Error(`GitHub REST ${method} ${path} failed: ${response.status} ${text}`), {
      status: response.status
    });
  }
  return response.json();
}

async function markPullRequestReady({ token, nodeId, fetchImpl }) {
  const response = await fetchImpl("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "ski-stack"
    },
    body: JSON.stringify({
      query: `mutation SkiStackMarkReady($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { pullRequest { number url: url isDraft headRefName baseRefName headRefOid baseRefOid headRepository { nameWithOwner } } } }`,
      variables: { id: nodeId }
    })
  });
  if (!response.ok) throw new Error(`GitHub GraphQL mark ready failed: ${response.status}`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).join("; "));
  const pr = payload.data?.markPullRequestReadyForReview?.pullRequest;
  return {
    number: pr.number,
    html_url: pr.url,
    node_id: nodeId,
    draft: pr.isDraft,
    head: { ref: pr.headRefName, sha: pr.headRefOid, repo: { full_name: pr.headRepository?.nameWithOwner } },
    base: { ref: pr.baseRefName, sha: pr.baseRefOid }
  };
}

function assertExpectedPullRequest(pr, { expectedHeadSha, repository, branchName, baseBranch }) {
  if (expectedHeadSha && pr.headSha !== expectedHeadSha) {
    throw new Error("pull request head drifted before publication");
  }
  if (pr.headRef !== branchName || pr.baseRef !== baseBranch) {
    throw new Error("pull request branch or base drifted before publication");
  }
  if (pr.headRepository && pr.headRepository.toLowerCase() !== repository.toLowerCase()) {
    throw new Error("pull request head repository drifted before publication");
  }
  return pr;
}

function normalizePullRequest(pr) {
  return {
    number: pr.number,
    url: pr.html_url,
    nodeId: pr.node_id,
    headRef: pr.head?.ref,
    headRepository: pr.head?.repo?.full_name,
    headSha: pr.head?.sha,
    baseRef: pr.base?.ref,
    baseSha: pr.base?.sha
  };
}
