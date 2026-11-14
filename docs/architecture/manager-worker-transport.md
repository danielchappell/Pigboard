# Existing Atlassian transport for worker handoffs

Discovery result, 14 November 2026. This resolves the supported representation and
lookup strategy for the design. It is not a successful Cursor delivery run or
permission to activate workers.

## What was inspected

The existing Cursor team plugin is Atlassian, with all tools enabled. Its linked
official plugin source is pinned at
`9de1ab435251042efbb6839a1ca748eacecf4727`; the connection uses the Atlassian v2 MCP
endpoint. No team setting or connection was changed, and no Cursor run was started.

The provider's current tool contract supplies:

- `getJiraEntityProperty` for reading the exact `pigboard.work-context` key.
- `listJiraIssueComments` with pagination, full metadata and HTML body output.
- `addOrEditJiraIssueComment` with explicit HTML input and returned comment identity.
- `listJiraIssueTransitions` and `transitionJiraIssue` using explicit native IDs.

The manager continues using Jira REST for its own reads/writes. MCP property writes
are restricted to an `atlassian-mcp.` namespace; workers do not need to write the
Pigboard pointer, so no new permission, key or integration is required for that.

## Representation and exact lookup

REST uses the canonical ADF code-block node already defined in the handoff contract.
MCP exposes that node as HTML `<pre><code class="language-yaml">…</code></pre>`.
Use a real HTML parser to locate that node and recover its text, then the same safe
YAML/JSON-compatible validation and canonical digest rules. Escape text correctly
when constructing the supported HTML for publication. Do not parse HTML/fences with
regex, hash rendered HTML, or reconstruct dropped null fields from guesses.

The provider read preserves nulls inside the code-block text. The pointer has only
non-null reference fields, so the tool's documented filtering of null JSON fields
does not alter that contract. Read and validate the full pointer; absence is an error.

The exposed worker tool does not offer a verified direct single-comment lookup.
Use bounded complete pagination, then select the exact referenced comment ID and
verify its record ID, parsed digest, author and update metadata. Do not choose the
latest comment. A missing page/record or exhausted bound blocks the handoff.
Manager REST can still fetch a comment directly by its known ID. This is a provider
adaptation of the same reference contract, not a new product feature.

Do not attach the evidence comment to a transition request: the provider explicitly
warns that such a comment may be dropped while the transition succeeds. Publish,
verify and then transition separately, as the existing design requires. Do not
combine transition with sprint/backlog moves. Unknown outcomes are not retried.

## Observed read compatibility

An authorized read-only Codex call through Atlassian MCP read the existing PGBT-1
pointer and all eight synthetic comments in one complete page. A standard HTML
parser recovered the code-block text. Each parsed record matched the earlier raw
REST receipt exactly, including null fields; created/updated metadata matched too.
Author and update-author account IDs were present for every record.

The records were admission, implementation, review, QA, repair request, dependency
wait, Blocked and human resume. They remain synthetic transport fixtures, not real
PR approval, QA completion or human authorization. No new Jira write was performed.
Local evidence is `outputs/manager-discovery-20261114/mcp-read-compatibility.json`;
the original provider receipts remain the separately audited bounded proof.

This demonstrates provider conversion/read behavior through the Codex connection.
It does not prove Cursor has the same site permissions or that a Cursor write will
succeed. The existing Cursor read-only INT probe demonstrates connection access,
not these new handoffs. Installed acceptance must verify exposed operations,
HTML publication/read-back, metadata, pointer reads and permitted stage transitions
through the actual configured worker connection before activation. That belongs
with the coordinated skill delivery and PGB-58 acceptance, not a new unbounded
pre-grooming experiment.

## Design changes required

The handoff reader contract must allow canonical ADF on REST and its documented
HTML code-block representation on MCP. Exact-ID selection may require bounded
pagination for workers. The role-specific helper owns parsing/validation; prompts
must not instruct agents to invent conversions or scrape rendered Jira pages.
Unsupported capability or incomplete reads produce a clear blocker.

Official sources: [Atlassian supported tools](https://support.atlassian.com/atlassian-ai-gateway/docs/supported-tools/)
and [the inspected plugin revision](https://github.com/atlassian/atlassian-mcp-server/tree/9de1ab435251042efbb6839a1ca748eacecf4727).
The live `getContentFormatGuide` for `addOrEditJiraIssueComment` specifies the HTML
code-block representation; exact tool schemas were inspected through discovery.
