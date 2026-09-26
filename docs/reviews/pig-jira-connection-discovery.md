# D1 Pigboard pilot design review

26 September 2026. The active design is
[Pigboard Jira connection discovery](../designs/pig-jira-connection-discovery.md)
for `scubapig.atlassian.net` project `PIG`. The earlier INT review remains
historical. Neither design review is proof of a live service identity, Jira
permission, provider run or release readiness.

## First round: NOT CLEAN

Two independent Sol reviewers examined commit
`087c70f6a7a60e7a4da55c68736abc257321b134` against main
`19e4ba68705381dfecce8ab4fc40419ead7d7ec6`. Each covered 6/6 changed
files and 8/8 agreed contract areas, then made a second sweep. They found a
broken CLI test after the example profile ID changed, stale INT and S03 claims
in active product/roadmap/hosting documents, a mismatch between Product
Acceptance and Pigboard's observed statuses, and a missing pre-send disclosure
race rule. The author accepted these as in scope and corrected them in
`902b62b13d75e748c21c7d3138615f86b9090fea`.

## Final design round: CLEAN

Two fresh independent Sol reviewers inspected exact commit
`902b62b13d75e748c21c7d3138615f86b9090fea`. Each examined all **12/12**
changed files and **10/10** agreed areas: target and historical boundary;
selector; identity and native mapping; complete dependencies; S02 inspection;
source audience and pre-send race; events and reconciliation; comments and
transitions; D2/D3 recovery; and example, tests and queue consistency. Each
made a second sweep through a PIG ticket's human and agent journey and found
no unresolved in-scope issue. Their separate product and technical verdicts
are **CLEAN for that commit only**.

The product reviewer found the existing To Do status and opt-in label familiar,
the manual In Review handoff clear, and the active documents discoverable for
humans and agents. The technical reviewer found bounded authority, complete
read requirements, explicit uncertain outcomes and no automatic transition
without a full Jira guard. Both assessed all seven principles independently:
Intuitive, Discoverable, Delightful experience, Token saver, Secure, Agents are
equal and Dependable. The product review focused on journey and documentation;
the technical review focused on correctness, authority and recovery. Neither
used earlier INT CLEAN verdicts as proof of the PIG design.

Local verification for that candidate: focused profile tests **19/19 pass**;
full `npm test` **239/239 pass**; example `profile:check` succeeds with
`liveReady: false`; `git diff --check` passes. No hosted CI workflow exists.
The sample profile is an offline route preview, not an authorization to launch.

D1 live gates remain open: dedicated service identity, native IDs, contextual
grants, full link and blocker mapping, selected issue/audience and controlled
write checks. S02 is not delivery-ready until the identity-scoped read-only
facts are verified. D3/D4 live gates still precede hosted send and acceptance.
