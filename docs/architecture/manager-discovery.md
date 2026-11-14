# First manager release: discovery progress

14 November 2026. PGB-67 and PGB-68 remain In Progress. The approved outcome is
admission of the next eligible ticket from customer-owned AWS Lambda, using
DynamoDB for Pigboard's operational state. No feature implementation, deployment
or activation is authorized. The owner reviews the complete fixed Story set first.

## Resolved direction

- One canonical customer configuration; secret references and generated outputs
  remain distinct from authored intent. Jira tickets contain work data.
- Cloud-independent manager policy/application; Jira and DynamoDB adapters; a thin
  Lambda wrapper and separate AWS deployment package. No archived runtime reuse.
- [State ownership and upgrade rules](manager-state.md): one coherent operational
  persistence approach, versioned records, conditional changes, durable uncertainty,
  safe upgrades/rollback and retained state. Exact operational protocol still open.
- Launch with the existing QA skill set. Expanding database/tool support is later
  work. Unsupported required AI execution blocks for a human; no improvised tools.
- Tickets explicitly separate AI-executed cases from human test cases. Human cases
  do not execute during AI QA and remain pending for Human Review.

## Ticket extraction and readiness

Proposed contract refinement for PGB-67:

1. Fetch Jira's structured description document. Walk its code-block nodes; do not
   parse rendered HTML, Markdown fences or conversational comments with regex.
2. A Pigboard contract block is identified by an explicit supported top-level schema
   discriminator after bounded safe YAML parsing. Require exactly one matching
   block. Duplicate or unsupported Pigboard contract blocks are errors. Other code
   examples are not scheduling instructions.
3. Reject duplicate keys, aliases/custom tags, executable values, unknown fields,
   oversized documents and unresolved required references. Final parser limits and
   schema versions are part of the remaining contract work.
4. Read native issue identity, type, stage, parent and numbered stream label for all
   relevant work. A preparation-stage Story may have incomplete YAML; ignore it as
   a candidate. Its blank requirements must not block independent ready work.
5. Ready to Work and Rework Queued candidates must have their complete applicable
   execution contract. Required nulls prevent their admission. Do not launch an
   agent to fill in requirements or silently demote the issue's Jira status.
6. Distinguish a candidate's missing inputs from domain uncertainty. An unreadable
   potentially active issue, conflicting stream ownership, unknown stage or missing
   page can hide occupied capacity and must hold the affected scope. A known unready
   issue with unfinished text is not that condition.

Epic membership/order does not imply readiness, a code dependency or a branch stack.
The published prose ticket contract remains the installed behavior. YAML is a
proposed versioned replacement and requires a coordinated authoring/worker rollout.

## Explicit AI and human QA ownership

Owner decision: every required case appears on the ticket with stable IDs,
requirement mapping, steps, expectations, prerequisites, evidence and cleanup.
AI cases additionally name the exact existing skills and their execution order.
Human cases live in a separate visible section, with a human role responsible.

Illustrative fields, not a released schema:

```yaml
testing_strategy:
  # The existing full case skeleton remains; these are ownership additions.
  dispatch_order: null          # AI-owned step IDs only; [] if explicitly none.
  cases:                       # AI cases only.
    - id: TC-01
      execution: ai
      requirements: null
      steps:
        - id: TC-01.S1
          skill: null          # Exact approved installed skill; never inferred.
          action: null
          expected: null
          evidence: null
  human_review:
    cases:
      - id: HQA-01
        execution: human
        owner_role: null
        requirements: null
        prerequisites: null
        steps: null
        expected: null
        evidence: null
        cleanup: null
    no_ai_cases_reason: null    # Required only when cases and dispatch_order are [].
```

`null` means unresolved; an explicit empty list means none where allowed. All
human-case instructions must also be ready before admission; Human Review is for
executing agreed cases, not discovering missing acceptance requirements.

- AI QA executes only the AI case list and named skills. It reads the human section
  to report the handoff but must not execute or mark those cases passed.
- Once all assigned AI cases pass, QA moves to Human Review with two separate
  coverage counts: AI completed results and human cases pending. This is an AI-QA
  completion result, not a claim that all ticket testing passed.
- A required AI case that cannot execute remains BLOCKED. The agent cannot relabel
  it human, drop it, select another skill or weaken its expected result.
- A human may explicitly revise the approved testing contract to assign a case to
  human review. That is a requirements change requiring the normal review/handoff;
  it is not an automatic fallback by the blocked worker.
- Human Review requires the designated human review and prescribed human cases to
  be completed before acceptance. Human tests stay visibly pending until recorded
  by a human; automated counts cannot imply their completion.
- A ticket deliberately assigned entirely to human testing must say so explicitly,
  with a reason and a complete human case set. AI QA reports zero AI cases assigned,
  rather than fabricated test passes. This does not bypass implementation checks,
  CI or PR review. This edge-case contract is a design proposal for final review.

The installed `qa-database` skill includes a PostgreSQL reader, not an old manager
database. It must not be used as a DynamoDB reader. Existing `qa-api`/`qa-bruno`
support prepared AWS-signed API requests; those can be evaluated for prescribed
DynamoDB read observations without adding a database skill. No live AWS QA proof
has occurred. If the necessary prepared access/execution is unavailable, use the
ticket's agreed human cases or block its AI-assigned cases; never invent support.

## Stack repair: decision still open

Agreed: do not interrupt active B; queue A; repair each affected PR oldest first;
each implementer owns one ticket/PR; use Rework Queued for understood work and
Blocked for human intervention. Humans own ordinary merge order and retargeting.

The owner asked how we know A's repair affects B, and whether a new Bug could own
all branch repairs. No automatic Human Review-to-Rework Queued rule is approved yet.

Recommendation for the next scenario: record the actual parent PR and tested parent
revision when publishing B. After confirmed repair of A passes QA, that relationship
identifies B as needing stack update/revalidation; it does not prove B has a defect.
Conservatively update/revalidate recorded descendants on their existing tickets/PRs,
oldest first. Mere Epic order, routine merge or retargeting is not a repair trigger.
The tradeoff is extra prescribed verification instead of AI impact classification.

A single Bug editing all branches/PRs would change the accepted one-ticket/one-PR
boundary and admission/ownership rules. Do not introduce it implicitly. If a PR
has already merged or the fix needs additional scope, return to a human for a
properly scoped Bug/decision. The exact handoff record, repeated-repair generations,
revision checks and authority to queue a dependent in Human Review remain open.

## What still prevents a fixed implementation backlog

| Gate | Remaining result | Owner |
| --- | --- | --- |
| Work contract | Final schema, required/null rules, dependency satisfaction and complete examples | PGB-67 |
| Repair handoff | Accepted cascade behavior, durable machine-readable repair/lineage evidence and role authority | PGB-67; owner decision for cascade |
| Capacity and edits | Rework returning to the five-ticket queue; removals/cancellation/renumbering without hiding live work | PGB-67 |
| Admission safety | Successful/uncertain outcome protocol, fresh known-issue reads, source-specific transition validation, operator reconciliation | PGB-68 |
| Deployment lifecycle | Final IAM/auth matrix, request/size/time bounds, retention, install/upgrade/restore/removal and bounded fixture proof | PGB-68 |
| Compatibility | YAML authoring, separate role handoffs, Story/Bug Jira filters and worker bundle changed together before enablement | PGB-67/PGB-68 |
| Complete delivery plan | Independently reviewed coverage, ordered PR-sized Stories, cases, skills and estimates | PGB-69 after discovery |

Do not call these resolved merely because there is a DynamoDB table. A durable
record cannot make Jira search globally current or atomically change a ticket.
Official Jira search reconciliation covers specified known IDs only (up to 50 per
request); unknown issues and permission-hidden work need a deliberate domain/read
contract. Jira's transition request has no documented expected-source-status field;
workflow configuration and permitted source-specific transitions need evidence.

Evidence required: inspect the supported workflow without writes; agree disposable
AWS/Jira fixtures and narrowly authorize tests before provisioning or transitioning.
Current documentation research is not actual IAM, workflow or failure-injection
acceptance. Existing delivery automations remain inactive and untouched.

## References and review boundary

- [Jira structured code blocks](https://developer.atlassian.com/cloud/jira/platform/apis/document/nodes/codeBlock/)
- [Jira search consistency](https://developer.atlassian.com/cloud/jira/platform/search-and-reconcile/)
- [Jira transitions](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-post)
- [Current API QA](../../skills/qa-api/SKILL.md), [request execution](../../skills/qa-bruno/SKILL.md), [database QA](../../skills/qa-database/SKILL.md)

This is an interim discovery revision. Independent review may find these documents
accurate and internally consistent while discovery is still incomplete. Such a
CLEAN verdict does not approve unresolved proposals or make Stories delivery-ready.

## Author assessment

- Intuitive: case ownership keeps human work visible without making the AI guess.
- Discoverable: complete case instructions and reason codes expose missing inputs.
- Delightful: a deliberate human testing path keeps useful work possible without
  requiring every testing capability at launch.
- Token saver: fixed cases and installed skills avoid AI test-design/setup loops.
- Secure: ticket content cannot widen configured destinations, skills or authority;
  structured text is a contract, not a security boundary by itself.
- Agents are equal: humans and agents receive executable cases, with explicit
  ownership and evidence rather than forcing identical testing interfaces.
- Dependable: partial results, pending human work and unsupported execution remain
  distinct; unresolved safety and repair contracts prevent readiness today.
- Unified configuration: one source of setup intent; ticket cases remain work data.
