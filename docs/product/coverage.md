# Release coverage and gaps

This is a requirements audit, not a second delivery queue or a frozen Story set.
There are 50 requirements: A01–A12, W01–W12, M01–M14 and O01–O12. Every row below
must acquire actual implementation Story/operational Task links and acceptance
case IDs before PGB-69 is ready for owner review. A grouping is not a sized Story.

## Required delivery surfaces

- **Authoring:** evolve the existing writer and preserve its human-writing dependency.
- **Validation:** executable draft/start validation with actionable field errors.
- **Worker integration:** separate role handoff skills plus compatible entry points,
  shared review behavior and existing QA helpers.
- **Manager:** executable preview, safe new/rework admission and recorded stack queueing.
- **Operations:** customer AWS package, durable state, reconciliation and lifecycle.
- **Coordinated rollout:** filters, environment bundle, installed acceptance and guides.

The final Stories must make each slice usable and meet the file/time limits; these
surfaces are not permission to create six oversized Stories or disconnected plumbing.

## Requirement coverage

“Pending” means no delivery-ready Story/case mapping exists yet. It does not mean
the decision or cited design is missing. Existing behavior must be verified and
linked instead of rebuilt simply to fill a row.

| Requirement | Design / evidence anchor | Required delivery outcome | Story / acceptance cases |
| --- | --- | --- | --- |
| A01 | Existing writer; work contract | Bounded structured Story/Bug authoring | Pending |
| A02 | Existing bundle + sibling human-writing reference | Self-contained published skill dependency | Pending: existing capability/provenance audit |
| A03 | Epic/ticket skeletons; schema guide | Full editable YAML output | Pending |
| A04 | Epic schema; work contract | Explicit stream membership/order | Pending |
| A05 | Ticket schema; work contract | One-repository scope and prerequisites | Pending |
| A06 | Ticket schema testing strategy | Complete executable acceptance cases | Pending |
| A07 | Schema execution graph | Exact dispatch and helper ownership | Pending |
| A08 | Human cases; coverage validation | AI/human separation and requirement coverage | Pending; include approved D01 |
| A09 | Preparation slots | Prepared execution details without changed expectations | Pending |
| A10 | Extraction/semantic rules | Safe parsing and useful validation errors | Pending |
| A11 | Start conditions | Invalid/unresolved ticket cannot start | Pending |
| A12 | Config/work authority boundary | Work text cannot grant authority | Pending |
| W01 | Existing model configuration; handoffs | High plan + one High review, Medium execution, High PR/QA | Pending: retain and verify |
| W02 | Work/stack contracts | Relevant Epic context with bounded change scope | Pending |
| W03 | Implementation handoff | Current CI, PR and prepared QA evidence | Pending |
| W04 | Actual lineage fields | Correct PR target and recorded parent revision | Pending |
| W05 | Review handoff; shared pr-review | Approval or queued repair with PR/Jira findings | Pending |
| W06 | QA ledger/handoff | Exact cases, evidence and correct stage result | Pending |
| W07 | Existing QA helpers; schema skill sections | Prescribed API/PostgreSQL/UI execution | Pending |
| W08 | Workflow environment contract | Trusted current-revision supplied environment | Pending; producer separate |
| W09 | Repair/dependency-wait handoffs | Queue understood rework without launching it | Pending |
| W10 | Role authority; resume contract | Human-requested repair producer and human-only authority | Pending: repair entry mechanism unresolved; unblock producer follow-up |
| W11 | Human Review / UAT / production stages | Human reviews/cases recorded before acceptance | Pending: guide/config acceptance |
| W12 | Publication/semantic rules | Structured trustworthy role result and single transition | Pending |
| M01 | S01–S02 | Opt-in, active Epic and full stream identity | Pending |
| M02 | S18, S30 | Independent streams; conflicting ownership hold | Pending |
| M03 | S03–S04, S08–S09 | Ignore unready work without bypassing repair | Pending |
| M04 | S11, S17, S39 | One occupied cycle across worker stages | Pending |
| M05 | S12–S16 | Five-ticket cap including Bugs/rework | Pending |
| M06 | S07–S10, S37 | Repair/prerequisite/Bug/Story priority | Pending |
| M07 | S05–S06, S34 | Current evidence satisfies prerequisites | Pending |
| M08 | S19–S21 | Finish active work, then oldest repair | Pending |
| M09 | S22–S24 | Queue stale completed child after parent QA | Pending |
| M10 | S25, S29; stack chain | Consume roots once and propagate actual descendants | Pending |
| M11 | S26–S28; stack boundary cases | No guessed lineage/merge cascade or active interruption | Pending |
| M12 | S02, S40 | Paused Epic starts no new cycle | Pending; include approved D02 |
| M13 | S30–S36; retained inventory closure | Edits/missing work cannot release occupied stream | Pending |
| M14 | S38, S41; intent protocol | Read-only preview and fresh directed mutations | Pending |
| O01 | Customer-owned release design | Runnable private AWS installation | Pending |
| O02 | Core/adapter/wrapper boundary | Local harness without cloud imports or credentials | Pending |
| O03 | Config ownership | One validated customer configuration | Pending |
| O04 | Existing fetch/refresh scripts | Compatible pinned bundle verified in Build | Pending: retained scripts + rollout |
| O05 | State ownership; reviewed closure | Four record types with retained history/member identity | Pending |
| O06 | Publication order; provider receipts | Conditional intent before all side effects | Pending |
| O07 | State failure table; partial probe evidence | Failure/uncertainty holds without replay | Pending; include unrun proof cases |
| O08 | Evidence-only reconciliation closure | Operator can inspect and reconcile proved outcomes | Pending |
| O09 | Security boundaries; scoped probe evidence | Restricted runtime and sanitized outputs | Pending |
| O10 | Deployment/inventory closure | Disabled install, preview and bounded operation | Pending |
| O11 | State lifecycle | Safe upgrade/rollback/restore/removal | Pending |
| O12 | Coordinated rollout audit; PGB-58 | Complete compatible release accepted before activation | Pending |

## Decisions, evidence and remaining work

1. **D01 — approved:** human-only plans may reach Human Review with a truthful
   zero-AI-case report; CI and PR review remain required.
2. **D02 — approved:** pause every manager transition while the Epic is paused;
   workers may finish existing permitted handoffs. Reconcile older proposal text.
3. **Technical compatibility:** incorporate the identified MCP HTML code-block and
   bounded comment lookup into the design. Provider reads preserved the fixture
   records/metadata; actual configured Cursor publication and transitions remain
   installed acceptance before activation. No new integration or pre-groom delivery
   run is implied.
4. **Combined review:** reconcile technical closure and provider evidence into the
   design; independently review design/requirements together. Record disagreements
   instead of letting one document silently override another.
5. **Groom and audit:** fill this matrix with the complete Story set, explicit
   operational Tasks, dependency order, <2-day/≤20-file estimates and executable
   cases. Review in both directions: no missing requirement and no unapproved Story.
6. **Owner review:** present the whole fixed scope before implementation. Keep
   all delivery workers/rules inactive throughout discovery and grooming.
7. **Human repair entry:** resolve how a human submits findings that become a typed
   repair request and Human Review → Rework Queued transition. This is required for
   the agreed repair journey; the deferred unblock producer does not cover it.
   The entry mechanism is under owner discussion. No new UI/service is assumed.

## Author assessment of the consolidation

- Intuitive: separate authoring, delivery, scheduling and operation specifications
  let a reader locate a responsibility without reading every technical detail.
- Discoverable: stable requirement IDs and design links make omissions inspectable;
  the empty Story mappings explicitly show the work still owed.
- Delightful: preserve current skills and agreed decisions; avoid re-planning the
  product or making users repeat the conversation for every worker.
- Token saver: a short index and bounded specs provide relevant context first;
  exact technical contracts remain linked rather than copied in full.
- Secure: authority and customer-data boundaries remain explicit; prose does not
  claim IAM enforces separate worker roles or grant additional access.
- Agents are equal: the same requirement IDs support machine-checkable coverage and
  human review, with different execution ownership stated explicitly.
- Dependable: current source, planned behavior, pending choices, partial proof and
  release acceptance remain separate; this draft claims no completed implementation.

Unified configuration remains a cross-cutting principle, not an automatic installer
feature silently added to this release. Product and technical reviewers must assess
all 50 requirements, the six documents and source consistency, perform a second
sweep and return CLEAN/NOT CLEAN for the exact reviewed artifact.
