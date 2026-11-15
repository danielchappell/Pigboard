# Release coverage and gaps

This is the requirements audit for the [independently reviewed delivery set](../delivery/manager-r1/README.md), with the approved amendments mirrored in 28 Stories/122 cases. Jira remains the delivery queue.
There are 53 requirements: A01–A12, W01–W12, M01–M14 and O01–O15. Every row below
now map to implementation Stories and acceptance cases. PGB-91 is installed manager acceptance, PGB-58 is actual worker acceptance, and PGB-92 records the later activation decision. No test is claimed passed by this mapping.

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

## Baseline requirement coverage (50 retained requirements)

The complete case instructions are in the Jira Story and [review pack](../delivery/manager-r1/stories.md). Existing capabilities are retained and verified, not rebuilt merely to fill a row.

| Requirement | Design / evidence anchor | Required delivery outcome | Story / acceptance cases |
| --- | --- | --- | --- |
| A01 | Existing writer; work contract | Bounded structured Story/Bug authoring | [PGB-73](https://scubapig.atlassian.net/browse/PGB-73); R1-03-H01, R1-03-H02 |
| A02 | Existing bundle + sibling human-writing reference | Self-contained published skill dependency | [PGB-73](https://scubapig.atlassian.net/browse/PGB-73), [PGB-90](https://scubapig.atlassian.net/browse/PGB-90); R1-03-H01, R1-20-H01 |
| A03 | Epic/ticket skeletons; schema guide | Full editable YAML output | [PGB-71](https://scubapig.atlassian.net/browse/PGB-71), [PGB-73](https://scubapig.atlassian.net/browse/PGB-73); R1-01-H01, R1-03-H01 |
| A04 | Epic schema; work contract | Explicit stream membership/order | [PGB-73](https://scubapig.atlassian.net/browse/PGB-73); R1-03-H01 |
| A05 | Ticket schema; work contract | One-repository scope and prerequisites | [PGB-72](https://scubapig.atlassian.net/browse/PGB-72), [PGB-73](https://scubapig.atlassian.net/browse/PGB-73); R1-02-H02, R1-03-H01, R1-03-H02 |
| A06 | Ticket schema testing strategy | Complete executable acceptance cases | [PGB-72](https://scubapig.atlassian.net/browse/PGB-72), [PGB-78](https://scubapig.atlassian.net/browse/PGB-78); R1-02-H01, R1-02-H02, R1-02-H03, R1-08-H01; [PGB-110](https://scubapig.atlassian.net/browse/PGB-110); R1-24-H01, R1-24-H02, R1-24-H03; [PGB-132](https://scubapig.atlassian.net/browse/PGB-132); R1-27-H01, R1-27-H02; R1-30-H01, R1-30-H02 |
| A07 | Schema execution graph | Exact dispatch and helper ownership | [PGB-72](https://scubapig.atlassian.net/browse/PGB-72), [PGB-77](https://scubapig.atlassian.net/browse/PGB-77), [PGB-78](https://scubapig.atlassian.net/browse/PGB-78); R1-02-H01, R1-07-H01, R1-08-H01; [PGB-132](https://scubapig.atlassian.net/browse/PGB-132); R1-27-H01, R1-27-H02; R1-30-H01, R1-30-H02 |
| A08 | Human cases; coverage validation | AI/human separation and requirement coverage | [PGB-72](https://scubapig.atlassian.net/browse/PGB-72), [PGB-78](https://scubapig.atlassian.net/browse/PGB-78); R1-02-H01, R1-08-H03; [PGB-110](https://scubapig.atlassian.net/browse/PGB-110); R1-24-H01, R1-24-H02, R1-24-H03; [PGB-132](https://scubapig.atlassian.net/browse/PGB-132); R1-27-H03; R1-30-H03 |
| A09 | Preparation slots | Prepared execution details without changed expectations | [PGB-72](https://scubapig.atlassian.net/browse/PGB-72), [PGB-75](https://scubapig.atlassian.net/browse/PGB-75), [PGB-77](https://scubapig.atlassian.net/browse/PGB-77); R1-02-H02, R1-05-H01, R1-07-H02 |
| A10 | Extraction/semantic rules | Safe parsing and useful validation errors | [PGB-71](https://scubapig.atlassian.net/browse/PGB-71), [PGB-72](https://scubapig.atlassian.net/browse/PGB-72); R1-01-H02, R1-02-H02 |
| A11 | Start conditions | Invalid/unresolved ticket cannot start | [PGB-71](https://scubapig.atlassian.net/browse/PGB-71), [PGB-72](https://scubapig.atlassian.net/browse/PGB-72), [PGB-73](https://scubapig.atlassian.net/browse/PGB-73); R1-01-H01, R1-02-H01, R1-02-H03, R1-03-H02 |
| A12 | Config/work authority boundary | Work text cannot grant authority | [PGB-72](https://scubapig.atlassian.net/browse/PGB-72), [PGB-73](https://scubapig.atlassian.net/browse/PGB-73), [PGB-82](https://scubapig.atlassian.net/browse/PGB-82); R1-02-H01, R1-03-H02, R1-12-H03 |
| W01 | Existing model configuration; handoffs | High plan + one High review, Medium execution, High PR/QA | [PGB-75](https://scubapig.atlassian.net/browse/PGB-75), [PGB-76](https://scubapig.atlassian.net/browse/PGB-76), [PGB-78](https://scubapig.atlassian.net/browse/PGB-78), [PGB-90](https://scubapig.atlassian.net/browse/PGB-90); R1-05-H01, R1-06-H01, R1-08-H01, R1-20-H01 |
| W02 | Work/stack contracts | Relevant Epic context with bounded change scope | [PGB-75](https://scubapig.atlassian.net/browse/PGB-75); R1-05-H01 |
| W03 | Implementation handoff | Current CI, PR and prepared QA evidence | [PGB-75](https://scubapig.atlassian.net/browse/PGB-75); R1-05-H01, R1-05-H02; [PGB-132](https://scubapig.atlassian.net/browse/PGB-132); R1-27-H01, R1-27-H02; R1-30-H01, R1-30-H02 |
| W04 | Actual lineage fields | Correct PR target and recorded parent revision | [PGB-75](https://scubapig.atlassian.net/browse/PGB-75); R1-05-H01, R1-05-H02, R1-26-PC01–PC06; R1-25-C01, R1-25-C02, R1-25-C03 |
| W05 | Review handoff; shared pr-review | Approval or queued repair with PR/Jira findings | [PGB-76](https://scubapig.atlassian.net/browse/PGB-76); R1-06-H01, R1-06-H02 |
| W06 | QA ledger/handoff | Exact cases, evidence and correct stage result | [PGB-78](https://scubapig.atlassian.net/browse/PGB-78); R1-08-H01, R1-08-H02, R1-08-H03; [PGB-110](https://scubapig.atlassian.net/browse/PGB-110); R1-24-H01, R1-24-H02, R1-24-H03; [PGB-132](https://scubapig.atlassian.net/browse/PGB-132); R1-27-H01, R1-27-H03; R1-30-H01, R1-30-H03 |
| W07 | Existing QA helpers; schema skill sections | Prescribed API/PostgreSQL/UI execution | [PGB-77](https://scubapig.atlassian.net/browse/PGB-77); R1-07-H01, R1-07-H02; [PGB-132](https://scubapig.atlassian.net/browse/PGB-132); R1-27-H01, R1-27-H02; R1-30-H01, R1-30-H02 |
| W08 | Workflow environment contract | Trusted current-revision supplied environment | [PGB-77](https://scubapig.atlassian.net/browse/PGB-77), [PGB-78](https://scubapig.atlassian.net/browse/PGB-78); R1-07-H02, R1-08-H03; [PGB-110](https://scubapig.atlassian.net/browse/PGB-110); R1-24-H01, R1-24-H02, R1-24-H03; [PGB-132](https://scubapig.atlassian.net/browse/PGB-132); R1-27-H02, R1-27-H03; R1-30-H02, R1-30-H03 |
| W09 | Repair/dependency-wait handoffs | Queue understood rework without launching it | [PGB-75](https://scubapig.atlassian.net/browse/PGB-75), [PGB-76](https://scubapig.atlassian.net/browse/PGB-76), [PGB-78](https://scubapig.atlassian.net/browse/PGB-78), [PGB-79](https://scubapig.atlassian.net/browse/PGB-79), [PGB-88](https://scubapig.atlassian.net/browse/PGB-88); R1-05-H02, R1-06-H02, R1-08-H02, R1-09-H01, R1-18-H01; [PGB-110](https://scubapig.atlassian.net/browse/PGB-110); R1-24-H01, R1-24-H02, R1-24-H03; [PGB-132](https://scubapig.atlassian.net/browse/PGB-132); R1-27-H03 |
| W10 | Role authority; resume contract | Human-requested repair producer and human-only authority | [PGB-79](https://scubapig.atlassian.net/browse/PGB-79), [PGB-90](https://scubapig.atlassian.net/browse/PGB-90); R1-09-H01, R1-09-H02, R1-20-H03 |
| W11 | Human Review / UAT / production stages | Human reviews/cases recorded before acceptance | [PGB-78](https://scubapig.atlassian.net/browse/PGB-78), [PGB-90](https://scubapig.atlassian.net/browse/PGB-90); R1-08-H03, R1-20-H03; [PGB-110](https://scubapig.atlassian.net/browse/PGB-110); R1-24-H01, R1-24-H02, R1-24-H03; [PGB-113](https://scubapig.atlassian.net/browse/PGB-113); [PGB-132](https://scubapig.atlassian.net/browse/PGB-132); R1-27-H03; R1-30-H03 |
| W12 | Publication/semantic rules | Structured trustworthy role result and single transition | [PGB-74](https://scubapig.atlassian.net/browse/PGB-74), [PGB-75](https://scubapig.atlassian.net/browse/PGB-75), [PGB-76](https://scubapig.atlassian.net/browse/PGB-76), [PGB-78](https://scubapig.atlassian.net/browse/PGB-78), [PGB-79](https://scubapig.atlassian.net/browse/PGB-79); R1-04-H01, R1-04-H02, R1-04-H03, R1-05-H02, R1-06-H02, R1-08-H03, R1-09-H02; [PGB-110](https://scubapig.atlassian.net/browse/PGB-110); R1-24-H01, R1-24-H02, R1-24-H03; [PGB-113](https://scubapig.atlassian.net/browse/PGB-113); R1-26-PC01–PC06; R1-25-C01, R1-25-C02, R1-25-C03; [PGB-132](https://scubapig.atlassian.net/browse/PGB-132); R1-27-H03; R1-30-H03 |
| M01 | S01–S02 | Opt-in, active Epic and full stream identity | [PGB-81](https://scubapig.atlassian.net/browse/PGB-81), [PGB-87](https://scubapig.atlassian.net/browse/PGB-87); R1-11-S01, R1-11-S02, R1-17-H01 |
| M02 | S18, S30 | Independent streams; conflicting ownership hold | [PGB-81](https://scubapig.atlassian.net/browse/PGB-81); R1-11-S18, R1-11-S30 |
| M03 | S03–S04, S08–S09 | Ignore unready work without bypassing repair | [PGB-81](https://scubapig.atlassian.net/browse/PGB-81); R1-11-S03, R1-11-S04, R1-11-S08, R1-11-S09 |
| M04 | S11, S17, S39 | One occupied cycle across worker stages | [PGB-81](https://scubapig.atlassian.net/browse/PGB-81), [PGB-87](https://scubapig.atlassian.net/browse/PGB-87); R1-11-S11, R1-11-S17, R1-11-S39, R1-17-H03 |
| M05 | S12–S16 | Five-ticket cap including Bugs/rework | [PGB-81](https://scubapig.atlassian.net/browse/PGB-81), [PGB-88](https://scubapig.atlassian.net/browse/PGB-88); R1-11-S12, R1-11-S13, R1-11-S14, R1-11-S15, R1-11-S16, R1-18-H01 |
| M06 | S07–S10, S37 | Repair/prerequisite/Bug/Story priority | [PGB-81](https://scubapig.atlassian.net/browse/PGB-81), [PGB-88](https://scubapig.atlassian.net/browse/PGB-88); R1-11-S07, R1-11-S08, R1-11-S09, R1-11-S10, R1-11-S37, R1-18-H01 |
| M07 | S05–S06, S34 | Current evidence satisfies prerequisites | [PGB-81](https://scubapig.atlassian.net/browse/PGB-81); R1-11-S05, R1-11-S06, R1-11-S34 |
| M08 | S19–S21 | Finish active work, then oldest repair | [PGB-81](https://scubapig.atlassian.net/browse/PGB-81), [PGB-79](https://scubapig.atlassian.net/browse/PGB-79), [PGB-88](https://scubapig.atlassian.net/browse/PGB-88); R1-11-S19, R1-11-S20, R1-11-S21, R1-09-H01, R1-18-H01 |
| M09 | S22–S24 | Queue stale completed child after parent QA | [PGB-81](https://scubapig.atlassian.net/browse/PGB-81), [PGB-89](https://scubapig.atlassian.net/browse/PGB-89); R1-11-S22, R1-11-S23, R1-11-S24, R1-19-H01 |
| M10 | S25, S29; stack chain | Consume roots once and propagate actual descendants | [PGB-81](https://scubapig.atlassian.net/browse/PGB-81), [PGB-88](https://scubapig.atlassian.net/browse/PGB-88), [PGB-89](https://scubapig.atlassian.net/browse/PGB-89); R1-11-S25, R1-11-S29, R1-18-H02, R1-19-H02, R1-26-PC01–PC06; R1-25-C01, R1-25-C02, R1-25-C03 |
| M11 | S26–S28; stack boundary cases | No guessed lineage/merge cascade or active interruption | [PGB-81](https://scubapig.atlassian.net/browse/PGB-81), [PGB-89](https://scubapig.atlassian.net/browse/PGB-89); R1-11-S24, R1-11-S26, R1-11-S27, R1-11-S28, R1-19-H03 |
| M12 | S02, S40 | Paused Epic starts no new cycle | [PGB-81](https://scubapig.atlassian.net/browse/PGB-81), [PGB-89](https://scubapig.atlassian.net/browse/PGB-89); R1-11-S02, R1-11-S40, R1-19-H03 |
| M13 | S30–S36; retained inventory closure | Edits/missing work cannot release occupied stream | [PGB-81](https://scubapig.atlassian.net/browse/PGB-81), [PGB-82](https://scubapig.atlassian.net/browse/PGB-82), [PGB-84](https://scubapig.atlassian.net/browse/PGB-84); R1-11-S30, R1-11-S31, R1-11-S32, R1-11-S33, R1-11-S34, R1-11-S35, R1-11-S36, R1-12-H02, R1-14-H01 |
| M14 | S38, S41; intent protocol | Read-only preview and fresh directed mutations | [PGB-81](https://scubapig.atlassian.net/browse/PGB-81), [PGB-82](https://scubapig.atlassian.net/browse/PGB-82), [PGB-87](https://scubapig.atlassian.net/browse/PGB-87), [PGB-88](https://scubapig.atlassian.net/browse/PGB-88), [PGB-89](https://scubapig.atlassian.net/browse/PGB-89); R1-11-S37, R1-11-S38, R1-11-S41, R1-12-H01, R1-17-H02, R1-18-H03, R1-19-H03 |
| O01 | Customer-owned release design | Runnable private AWS installation | [PGB-83](https://scubapig.atlassian.net/browse/PGB-83); R1-13-H01, R1-13-H02 |
| O02 | Core/adapter/wrapper boundary | Local harness without cloud imports or credentials | [PGB-80](https://scubapig.atlassian.net/browse/PGB-80), [PGB-83](https://scubapig.atlassian.net/browse/PGB-83); R1-10-H01, R1-13-H01 |
| O03 | Config ownership | One validated customer configuration | [PGB-82](https://scubapig.atlassian.net/browse/PGB-82), [PGB-83](https://scubapig.atlassian.net/browse/PGB-83), [PGB-86](https://scubapig.atlassian.net/browse/PGB-86), [PGB-90](https://scubapig.atlassian.net/browse/PGB-90); R1-12-H01, R1-12-H03, R1-13-H01, R1-16-H01, R1-20-H02 |
| O04 | Existing fetch/refresh scripts | Compatible pinned bundle verified in Build | [PGB-90](https://scubapig.atlassian.net/browse/PGB-90); R1-20-H01 |
| O05 | State ownership; reviewed closure | Four record types with retained history/member identity | [PGB-84](https://scubapig.atlassian.net/browse/PGB-84); R1-14-H01, R1-14-H02 |
| O06 | Publication order; provider receipts | Conditional intent before manager Jira side effects | [PGB-84](https://scubapig.atlassian.net/browse/PGB-84), [PGB-87](https://scubapig.atlassian.net/browse/PGB-87), [PGB-89](https://scubapig.atlassian.net/browse/PGB-89); R1-14-H02, R1-17-H01, R1-17-H02, R1-19-H01 |
| O07 | State failure table; partial probe evidence | Failure/uncertainty holds without replay | [PGB-84](https://scubapig.atlassian.net/browse/PGB-84), [PGB-87](https://scubapig.atlassian.net/browse/PGB-87), [PGB-88](https://scubapig.atlassian.net/browse/PGB-88), [PGB-89](https://scubapig.atlassian.net/browse/PGB-89); R1-14-H02, R1-17-H02, R1-18-H03, R1-19-H03 |
| O08 | Evidence-only reconciliation closure | Operator can inspect and reconcile proved outcomes | [PGB-85](https://scubapig.atlassian.net/browse/PGB-85); R1-15-H01, R1-15-H02 |
| O09 | Security boundaries; scoped probe evidence | Restricted runtime and sanitized outputs | [PGB-82](https://scubapig.atlassian.net/browse/PGB-82), [PGB-83](https://scubapig.atlassian.net/browse/PGB-83), [PGB-85](https://scubapig.atlassian.net/browse/PGB-85); R1-12-H03, R1-13-H02, R1-15-H02 |
| O10 | Deployment/inventory closure | Disabled install, preview and bounded operation | [PGB-83](https://scubapig.atlassian.net/browse/PGB-83), [PGB-85](https://scubapig.atlassian.net/browse/PGB-85), [PGB-86](https://scubapig.atlassian.net/browse/PGB-86), [PGB-87](https://scubapig.atlassian.net/browse/PGB-87); R1-13-H02, R1-15-H02, R1-16-H02, R1-17-H03 |
| O11 | State lifecycle | Safe upgrade/rollback/restore/removal | [PGB-84](https://scubapig.atlassian.net/browse/PGB-84), [PGB-85](https://scubapig.atlassian.net/browse/PGB-85), [PGB-86](https://scubapig.atlassian.net/browse/PGB-86); R1-14-H01, R1-15-H02, R1-16-H01, R1-16-H02 |
| O12 | Coordinated rollout audit; PGB-58 | Complete compatible release accepted before activation | [PGB-90](https://scubapig.atlassian.net/browse/PGB-90); R1-20-H01, R1-20-H02, R1-20-H03 |

## Historical consolidation decisions and review record

The review, grooming and owner-review sequence below records the original 20-Story consolidation; the approved amendments and current source mapping are recorded below.

1. **D01 — approved:** human-only plans may reach Human Review with a truthful
   zero-AI-case report; CI and PR review remain required.
2. **D02 — approved:** pause every manager transition while the Epic is paused;
   workers may finish existing permitted handoffs. Reconcile older proposal text.
3. **Technical compatibility:** incorporate the identified MCP HTML code-block and
   bounded comment lookup into the design. Provider reads preserved the fixture
   records/metadata; actual configured Cursor publication and transitions remain
   installed acceptance before activation. No new integration or pre-groom delivery
   run is implied.
4. **Combined review — complete:** two independent CLEAN reviews are published for the merged design and for the complete delivery set. Exact manifests preserve the reviewed revisions.
5. **Groom and audit — complete:** 20 Stories, 88 cases, 50 requirement mappings and 41 scenario mappings have independent CLEAN plan reviews. File/time forecasts and ordered dependencies are in the linked plan. Implementation acceptance has not run.
6. **Owner review:** present the whole fixed scope before implementation. Keep
   all delivery workers/rules inactive throughout discovery and grooming.
7. **D03 — approved human repair entry:** deliver a separate human-invoked
   `request-rework` skill for findings → typed request → Rework Queued. Keep story
   writing focused on specifications. Include this skill in the complete bundle
   and Story set; the deferred unblock producer is a different feature.

## Author assessment of the consolidation

- Intuitive: separate authoring, delivery, scheduling and operation specifications
  let a reader locate a responsibility without reading every technical detail.
- Discoverable: stable requirement IDs and design links make omissions inspectable;
  the Story/case mappings expose both coverage and the still-unexecuted acceptance.
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
feature silently added to this release. The original consolidation reviewed 50 requirements; that count is historical. Current product and technical reviews cover all 53 requirements, the revised design and complete delivery set, source consistency and a second sweep. The exact reviewed artifacts and CLEAN verdicts are recorded in the delta review reports linked below.

## Approved company/health delta coverage

The original 50-requirement reviews remain historical evidence. The historical 53-requirement, 23-Story set had CLEAN independent [product](../reviews/pigboss-plan-product.md) and [technical](../reviews/pigboss-plan-technical.md) reviews, including native Jira publication audits and second sweeps. The later 24-Story QA split is owner-approved; installed acceptance remains pending.

| Requirement | Additional Story cases | Installed acceptance |
| --- | --- | --- |
| M01, M02, M04, M05 | R1-04-H04, R1-10-H03, R1-21-H01, R1-21-H02 | AT-01.7 |
| M07, M13, O03, O05, O07 | R1-12-H04, R1-14-H03, R1-21-H03 | AT-01.7 |
| O13 | R1-04-H04, R1-10-H03, R1-12-H04, R1-14-H03, R1-21-H01–H03 | AT-01.7 |
| O14 | R1-22-H01–H04 | AT-01.8 |
| O15, O09–O12 | R1-23-H01–H04, R1-20-H04 | AT-01.8 |

The original 41 scheduling scenarios remain; these additional explicit cases cover
project identity and health without renumbering them. Capacity/worker monitoring
follow-ons are not missing MVP coverage: see the Jira-linked follow-on roadmap.

The owner-approved QA split adds publisher coverage only. All 53 requirements and 41 scenarios, including R1-08 execution coverage, remain. Earlier 20/23-Story review records retain their historical scope; mapping is not passing acceptance.
PGB-113/R1-25 adds three human cases for current repeated-parent proof, retained history and exact causes. All 53 requirement IDs, 41 scenarios and R1-11-H02 remain. The preceding source checkpoint contains 26 Stories/116 cases and composes the publisher, repeated-parent and current-proof consistency amendments. Native 25/110 figures in this receipt describe the recorded 15 November 2026 PGB-110/PGB-113 amendment-publication snapshot; Jira owns subsequent queue changes. These mappings do not record acceptance execution.

PGB-129/R1-26 adds six current-proof consistency cases PC01–PC06 before PGB-81. All 53 requirement mappings, 41 scenario mappings and PGB-81's 42 full cases remain. The preceding PGB-110-first composition was 26 Stories/116 cases; dated earlier publication snapshots remain historical. No human acceptance is recorded by this composition.

## QA input-preparation amendment, 15 November 2026

PGB-132/R1-27 adds three supporting preparation cases immediately before PGB-78/R1-08. The preceding source/native amendment snapshot contained 27 Stories/119 cases. Core's 26/116 source checkpoint and prior native readbacks above remain historical. All original 53 requirement rows, 41 scenarios and R1-08 cases remain; preparation does not prove model selection, final dispatch, live publication or human acceptance. That source layering used Core's reviewed commit `261a3856c9710a62be3c2c8ac4424778cb1ca0a0`, subsequently merged through PR #98; PGB-129 is not a preparation dependency. Final PGB-78 remains **Provisional — not ready for delivery** until PGB-132 actually merges and its concrete plan is rebound/reviewed.

## Three-input controls amendment, 15 November 2026

PGB-138/R1-30 adds three preparation/inspection cases before the unchanged full PGB-132 outcome. Source at main275 composes 28 Stories/122 human cases, preserving all 53 requirement rows, 41 scenarios and prior case IDs. R1-30-H01 inspects the complete mixed Story handoff, hashes and occupied-root refusal; H02 isolates missing trusted parameter_count with DATABASE_PARAMETERS; H03 isolates coherent stale deployment proof. These are supporting input checks, not helper execution, publisher acceptance or runtime delivery. All three remain NOT_RUN; PGB-132's original three also remain NOT_RUN.

The separate Director native inventory on 15 November is30 Stories/130 cases, including native-only PGB-136/137. It is not this source count. PGB-132 adds the remaining 48 inputs after the three available here; full-suite coverage is pending. Owner10765 is specific to PGB-132's historical helper/publisher evidence gap and does not waive PGB-138 acceptance. Final PGB-78 still requires actual prerequisite completion and a rebound/reviewed concrete plan.
