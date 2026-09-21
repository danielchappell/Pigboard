# Development workflow, architecture and delivery review

21 September 2026. This record separates independent review from author checks,
implementation evidence and permission to release. No runtime was implemented or
external service activated by this planning Task.

## Scope and recovered process

The owner required the Rovito development lifecycle globally and in Ski Stack,
then clarified the ordering: map the product/feature architecture and development
path, review it, groom ordered PR-sized Stories, review each concrete plan, then
implement and independently review committed code. Use Ski Stack's own roles.
An arbitrary provider-adapter slice cannot substitute for the development map.

Sources checked: Rovito origin/main working agreement at `32875af`, its 12 September
lifecycle design/review record and active roadmap, its 13 September repository
account plan, Ski Stack role cards/architecture/core boundaries, and the owner's
write-pr-sized-stories skill. Local Rovito main was stale and lacked AGENTS.md;
the committed origin/main file was used. Queue-specific Rovito merge authorization
and Go/native release commands were not imported into Ski Stack.

The global file is the owner's Codex-home `AGENTS.md`. OpenAI's
[documented instruction discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
loads it before project instructions. It was previously empty; no override file
was present. The reviewed file was installed and subsequently appeared as active
instructions in this task. This is local Codex configuration, not a claim of
automatic synchronization to other computers or every AI product.

## Procedure review

Reviewer identities: `/root/workflow_review` (source fidelity/operating rules)
and `/root/design_product_review` (product/process experience), separate Sol
agents independent of the author.

- Initial procedure review: NOT CLEAN. Required complete coverage denominators
  and a second sweep; removed a machine-specific skill path from project guidance.
- Corrections: each review now enumerates/walks its whole agreed surface and
  reports examined/total counts. The skill resolves from the active catalog.
- Final: both reviewers CLEAN on the identical final procedure artifacts.
  Workflow reviewer covered 3/3 artifacts and 10/10 procedural requirements with
  a second sweep. Product reviewer covered those artifacts within its 5-file,
  16-requirement design/process pass and repeated the sweep after correction.

| Principle | Workflow reviewer's independent assessment | Product reviewer's independent assessment |
| --- | --- | --- |
| Intuitive | Ordered stages and role mapping are consistent. | Architecture precedes grooming and first-slice selection explicitly. |
| Discoverable | Gates, outputs, Story format and catalog skill resolution are findable. | Linked process and clear setup/design stages expose the next action. |
| Delightful experience | Routine approval pauses and repeated full-project ceremony are avoided. | Reuse prior decisions and continue authorized work through normal gates. |
| Token saver | Coverage evidence reduces churn without hiding omissions. | Scope and staged detail avoid unnecessary work/context. |
| Secure | Scope/access and consequential authority remain proportionate. | CLEAN never creates new product, merge or release authority. |
| Agents are equal | Agent roles and human/agent assessments are first-class. | Agent work follows the same reviewed lifecycle with explicit evidence. |
| Dependable | Exact revisions, exhaustive coverage and honest partial states are required. | Author review and historical gates cannot be misrepresented as independent/current. |

## Architecture review

Reviewers: `/root/design_product_review` (product/experience) and
`/root/design_technical_review` (technical/security/recovery), independent Sol agents.

| Round | Product | Technical | Resolution |
| --- | --- | --- | --- |
| 1 | NOT CLEAN | NOT CLEAN | D1 incorrectly blocked its own diagnostics; M1 omitted a complete setup outcome. |
| 2 | CLEAN | CLEAN | D1 permits authorized bounded read-only investigation while gating dependent implementation/write activation. M1 configures, validates and previews the route; M4 separately handles package distribution/upgrades. |

Product review walked 16/16 product/process requirements across five artifacts.
Technical review reported 20/20 source/design artifacts and 41/41 requirement/
contract elements, including authority, recovery, milestones and discovery gates.
Both completed a second sweep on the final architecture; no unresolved in-scope
finding remained. The source inventory itself was a separate read-only discovery
agent's work, not one of these independent review verdicts.

| Principle | Product reviewer's independent assessment | Technical reviewer's independent assessment |
| --- | --- | --- |
| Intuitive | Preflight and visible board destinations make the journey predictable. | Internal claims remain behind configured roles and honest states. |
| Discoverable | Setup and eligibility diagnostics precede paid work. | Capability gaps and later package/MCP behavior stay explicit. |
| Delightful experience | Shared progress and resumable recovery avoid repeated questions. | Publication-only retry and reusable setup reduce duplicate work/noise. |
| Token saver | Routing/reconciliation use code and scoped agent context. | Models do not schedule; evidence is available on demand. |
| Secure | Read discovery respects existing access; write activation stays gated. | Team/project/repository, secret custody, audiences and application authority are explicit. |
| Agents are equal | MCP includes actual inspection and ticket creation through shared commands. | Structured agent capabilities share policy with the board. |
| Dependable | Attempts, checkpoints, fencing and human acceptance are separate. | External ambiguity is reconciled without an unsupported exactly-once claim. |

CLEAN is for the architecture level. D1-D4 still need their evidence/contracts
before dependent Stories are ready. This review did not execute a Jira journey,
verify a production service identity or accept PR #7's implementation.

## Delivery-plan review

Reviewers: `/root/delivery_product_review` (product/design fidelity and grooming)
and `/root/delivery_technical_review` (dependencies/security/verification), fresh
independent Sol agents for this gate.

| Round | Product | Technical | Resolution |
| --- | --- | --- | --- |
| 1 | NOT CLEAN | NOT CLEAN | Assign provider-result validation, a reviewed technical-discovery handoff, PR publication/recovery and a named hosted acceptance gate. |
| 2 | CLEAN | CLEAN | S26 owns observation/validation, S27 owns reviewed technical discovery, S28 owns non-draft PR publication/recovery, and A1 owns M2 acceptance. Dependencies and Story criteria agree. |

Both reviewers walked 3/3 delivery artifacts, 9/9 Tasks and 28/28 provisional
Stories and completed a second sweep of the affected graph. The product pass
also traced 7/7 milestones and 4/4 defining product requirements. Both confirmed
no circular/orphaned dependency, unowned reviewed outcome or prematurely ready
Story. Story IDs stay stable; table order and dependencies control execution.

| Principle | Product reviewer's independent assessment | Technical reviewer's independent assessment |
| --- | --- | --- |
| Intuitive | Configuration through hosted acceptance and product through owner handoff now form complete paths. | Stable IDs, table order and explicit validation/publication operations are understandable. |
| Discoverable | Every required outcome has a named item, prerequisites, criteria and QA. | A1 and new slices have linked bodies and clear incomplete states. |
| Delightful experience | Recovery avoids repeated model work, tickets and PRs. | Deliberate commands compose into automation without extra routine owner prompts. |
| Token saver | Reviewed inputs and structured states remove repeated lifecycle inference. | Reuses commands/evidence and avoids speculative contracts. |
| Secure | Validation precedes publication; source writes bind to reviewed commits and scoped authority. | Identity, audience, secrets, fencing, denied paths and controlled live authority remain intact. |
| Agents are equal | Board/command/MCP share policy and structured handoffs while preserving human decisions. | Noninteractive tools and human inspection/acceptance have equivalent authorized outcomes. |
| Dependable | Provider finish, validation, publication, acceptance, code review and PR readiness are distinct. | Ambiguity, stale state, incomplete A1, missing CI and changed revisions retain explicit recovery. |

These are CLEAN delivery-design verdicts, not delivery-ready implementation plans.
All Story previews remain gated on discovery, concrete QA, file/day sizing and
independently reviewed per-Story implementation plans. D2 is the next ready Task.

## Author assessment and validation

The architecture and delivery plan each contain the author's seven-principle
assessment. For the procedure: ordered phases are intuitive; linked gates and
outputs are discoverable; routine autonomy avoids needless questions; bounded
records avoid wasted context; scoped authority protects consequential actions;
agent and human journeys are explicit; and exact reviewed artifacts plus honest
states make the process dependable. These author checks do not replace the
independent assessments above.

All changes are documentation and recorded non-secret pilot evidence. The active
planning branch started at `5e48c3d`. Original uncommitted work and PR #7's branch
are preserved. Validation passed: 47 relative documentation links resolve; all 28 Story previews
and 9 Tasks have the required sections and separate regression note; the 14-file
change contains only documentation/recorded evidence; whitespace checks pass. No new runtime test or paid model probe
is justified by these documentation changes; earlier 220-test evidence belongs
to PR #7 and is not a new check on this Task.

## Exact reviewed artifacts

| Artifact | SHA-256 |
| --- | --- |
| Global Codex AGENTS.md | `94d6a48af0a6ee5a4ec2b4be1ecb95ccd582a9e41403f3be19968a67e834fb3a` |
| Project AGENTS.md | `58f68c79e18f3709498d930d3e51333b934dbe8f93f03756337b5b0119749eff` |
| development-workflow.md | `68cae1bc10d370f8ab13fed7e9c1a6a3c070cda42771ad0e0a653c7804a7121b` |
| product.md | `8b9c0096956dbb6279543bae0928f59a174689d5cc402e1b008e76ab780ab715` |
| architecture-plan.md | `9ea5d85ecc648a743631d4d137fc7ea90016f533618f23b91191594f02c4205f` |
| delivery-plan.md | `a8693e5301fa0425e54d5141f10ae559c6aede1c4a4b2aca94a2e4b35219e8c4` |
| tasks/architecture-decisions.md | `70cfad45215eca3ce833df76bc739cb3d60c21174cccc6b3692afce9736610f3` |
| stories/development-roadmap.md | `e25413c56cfa8d32aee87091151b3f4829e1cf3d27547be35db9a3ac70542d25` |

The record is appended as gates complete; modifying an artifact requires checking
whether its evidence is still applicable rather than silently retaining CLEAN.
