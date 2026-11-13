---
name: write-pr-sized-stories
description: Write, split, or revise developer work items as concise, plain-language PR-sized Stories or non-code Tasks. Use when turning requirements, epics, product notes, technical proposals, or existing tracker items into work a developer can understand, implement, test, and review; when deciding whether work is implementation or research; or when auditing scope, acceptance criteria, technical constraints, manual QA steps, and automated regression coverage.
---

# Write PR-Sized Stories

Produce work items that a developer can understand, implement, test, and review without translating product-management or AI-generated language. Use the simplest accurate language possible. Keep the writing brief.

## Pigboard Jira delivery

For Stories entering Pigboard's agent workflow, use the
[structured ticket contract](references/pigboard-ticket.md) and its
[filled examples](references/pigboard-example.md). Keep the four body sections below,
but use that contract's fixed field labels, IDs, preparation slots and QA step table.
The contract defines implementation readiness separately from QA readiness.
Apply the generic writing, sizing and scope rules here as well. Tasks keep the
plain structure; do not populate an execution contract for research/design work.

This adaptation starts from ai-working-kit main checked 13 November 2026, commit
`5bef5cf140bd5ea92e6600f0ff2a0be726e4c7ac`, source Story blob
`560be8a00c977eb90e13d05e022855eff4175b0e`. It preserves the owner's later Pigboard
amendments: one repository/PR, at most 20 files, less than two working days, explicit
ownership and all acceptance cases with named QA skills. Pigboard owns this copy;
upstream's shorter human-only test strategy does not override those decisions.

## Apply human-writing

Before drafting or revising a work item, read and apply the [human-writing skill](../human-writing/SKILL.md). Use it to write for the intended reader, cut unnecessary content, and preserve meaning and the owner's perspective. Keep this skill's required structure, scope, sizing rules, and verification requirements.

Apply human-writing's final cutting pass before delivering each item, then complete the audit below.

## Use simple words and short sentences

Treat plain, concise writing as a hard requirement.

- Use the simplest accurate word.
- Prefer common words used in everyday speech.
- Write short sentences. Put one idea in each sentence.
- Keep paragraphs and lists short.
- Include only details needed to understand, build, test, or review the work.
- Remove filler, repetition, and background that does not help the developer.
- Avoid jargon, business language, and industry terms when plain words will work.
- Rewrite difficult or formal source wording instead of copying it into the work item.
- Do not keep a source term just because the source uses it.
- Replace phrases such as “nonviable payment method,” “terminal failure,” and “downstream interoperability” with plain wording such as “payment method that cannot be charged,” “final failure,” and “works with existing callers.”
- Use a technical or domain term only when it is needed for accuracy. Define it in plain words the first time it appears.
- Keep exact names for APIs, data fields, services, laws, or system parts only when they are established names. Do not treat a vague source phrase as an exact name.
- Read every sentence again. Shorten it if the same meaning can be stated with fewer or simpler words.

## Follow the workflow

1. Inspect the supplied requirements and any available code or project context.
2. Identify unresolved facts and decisions. Research discoverable facts; do not invent requirements.
3. Classify each item as a Story or Task.
4. Split implementation work until every Story fits the size and review boundaries.
5. Write each item in the required structure. Use simple words and short sentences.
6. Audit every item before finalizing it.

## Classify the work

Use **Story** only when the item:

- Produces a code, configuration, infrastructure-as-code, or automated-test change.
- Can be completed by an average developer familiar with the codebase in less than two human working days, including tests, documentation and pull-request preparation.
- Targets one repository and ends in one reviewable pull request changing no more than 20 files total, including tests, configuration and documentation.
- Delivers one complete, usable behavior or technical outcome.

Use **Task** for research, discovery, investigation, a spike, a decision, design-only work, documentation-only work, or another activity that does not produce a code change.

Do not combine research and implementation in one Story. Create a Task for unresolved research, then write implementation Stories only after the decision is known.

Stop after writing the Task when its result determines the implementation boundary, interface contract, security behavior, feasibility, or ability to estimate the work. Do not invent delivery-ready implementation Stories before the result exists. If the user explicitly asks to preview likely follow-up work, label it **Provisional — not ready for delivery**.

## Enforce the size limit

Split the work before writing it when any part could reach two human working days, change more than 20 files total, or require more than one repository or pull request. Treat these as strong split signals:

- Multiple independent behaviors or user outcomes.
- Changes across several services or repositories.
- A data migration combined with new application behavior.
- Backend, frontend, and infrastructure work bundled together.
- Work crossing more than one major boundary, such as a user interface, API, datastore, asynchronous worker, or infrastructure layer.
- New foundations combined with the first feature using them.
- Important unanswered technical questions.

Prefer small, complete vertical slices. Do not create a Story that ends with unused plumbing or only part of its stated behavior. Check the available code and project context rather than assuming familiar-sounding work fits. If no complete slice can fit within two days, explain the conflict and propose smaller work items; never relax the limit.

## Identify the repository and change boundary

For each implementation Story, include these facts under Technical Acceptance Criteria:

- **Repository:** An unambiguous repository URL or organization/repository identifier for the one PR.
- **Change boundary:** The behavior or component this repository owns and what this Story may change.
- **Related repositories:** When relevant, name their responsibilities and shared contracts; distinguish reference context from changes owned by separate linked Stories.

The Jira project groups work; it does not imply that every Story uses the same repository. Resolve the target from trusted project context or ask for it. Do not guess from the project name or declare a Story ready while its repository or ownership boundary is unresolved. For Pigboard, record the verified base branch explicitly, including when it is the documented default; do not invent one.

When an outcome needs changes in several repositories, split it into linked Stories with explicit contract boundaries. Keep dependency order in the delivery plan. Each Story must still deliver a complete usable behavior or technical outcome within the size limit; a repository split does not justify inert plumbing. Resolve uncertain contracts in a Task first.

Repository metadata describes scope, not credentials or access permission. If delivery later requires changes outside the agreed boundary, stop for human scope review; in a workflow with a Blocked status, move the Story there. Do not silently add another repository or PR.

## Keep the work item focused

- Anchor each Story to the parent's agreed goal and the actual consumer of the result, which may be a test, agent or another service rather than a person.
- Explain what that consumer can do or prove after this slice and why it matters to the goal; a component change is not its own justification.
- For test-framework work, name what the tests can now set up, drive, observe or assert; do not replace that purpose with generic developer convenience or troubleshooting.
- Distinguish the usable outcome delivered now from capabilities that require later Stories; do not claim a prerequisite already delivers the full flow.
- Audit the slice, dependencies and delivery order, not just the prose. Flag missing, misplaced or unnecessary work and propose compliant corrections; do not invent value to preserve a weak split or silently expand approved scope.
- Use a short title that states the outcome.
- Write for a developer who is new to the project.
- Use direct verbs and concrete nouns.
- Avoid filler such as “leverage,” “utilize,” “seamless,” “robust,” “streamline,” “best practices,” and “future-proof.”
- Do not use “As a user, I want…” unless the user explicitly requests it.
- Identify unresolved decisions clearly.
- Do not invent requirements or speculative implementation details.

## Use the required structure

Write the title above the body. Do not add other sections unless the user requests them.

```markdown
<Short outcome-focused title>

Problem to solve

<Use two or three short sentences to explain the current problem, who or what is affected, and why it matters. Do not prescribe the implementation.>

Acceptance Criteria

- <An independently verifiable functional or operational outcome.>
- <The important failure, permission, or boundary behavior, when relevant.>

Technical Acceptance Criteria

- <Only a required technical constraint, contract, security rule, data rule, compatibility rule, or operational requirement.>

Testing Strategy

- QA skills: <Name the exact approved skill identifiers for backend/API, database and/or frontend/UI testing; map each case to its required skills.>
- Test cases: <Include every acceptance test case on the ticket: stable ID, requirement, skill(s), prerequisites/data, ordered steps, expected outcomes, evidence and cleanup.>
- Manual QA: <Explain how a human can run or inspect these same cases.>
- Access and setup: <Name the test environment, test data, credentials, feature flag, role, or permission needed. Include only what applies.>
- UI path: <Name the page, menu, tab, or control to use and what QA should see. Omit when there is no UI.>
- Postman: <If direct API testing is needed, name the request, authentication, input, and expected response. Omit when Postman is not needed.>
- Automated regression: <Briefly name the broad regression test to add or update. Do not list unit-test cases.>
```

Omit **Testing Strategy** only when testing or validation genuinely does not apply; never write “N/A.” Testing normally applies to a Story.

Write each criterion and testing bullet as one short sentence whenever possible.

### Keep each section distinct

For **Problem to solve**:

- Describe the present problem and its impact.
- Give only enough context to explain why the work exists.
- Keep the solution out unless a prior decision makes it a required constraint.

For **Acceptance Criteria**:

- Describe externally observable behavior or a clear operational outcome.
- Make every criterion independently verifiable.
- Cover the happy path and meaningful failure, access, or boundary behavior.
- Avoid vague claims such as “works correctly,” “is user-friendly,” or “handles errors.”
- Do not turn the criteria into an implementation checklist.

For **Technical Acceptance Criteria**:

- Include only constraints required to protect the system or its contracts.
- Capture required authentication, authorization, data integrity, compatibility, performance, observability, and interface behavior when relevant.
- Name an endpoint, table, queue, class, library, or cloud service only when it is an established constraint.
- Leave ordinary implementation choices to the developer.

For **Testing Strategy**:

- Write for the QA person who will check the finished work.
- Make the ticket executable by both a human and the QA agent without designing missing acceptance tests during execution.
- Give the shortest clear steps for reaching the feature and using it.
- Say which environment, URL, route, page, menu, tab, or control to use when known.
- State what QA should see after each important action. Visual checks are the priority for UI work.
- State whether QA needs a test account, credentials, a feature flag, seeded data, a role, or a permission.
- For permission-based work, name the role that should have access and the role that should not.
- State whether Postman is needed for API checks. If it is, include the HTTP method, route, authentication, required input, and expected status or response. Name an existing Postman collection or environment when known.
- If there is no UI, name the exact place QA can observe the result, such as an API response, email, log view, or admin tool.
- Do not invent access details, credentials, routes, collections, or permissions. Mark missing details as unresolved.
- Include the complete acceptance test-case set on the ticket, covering the requirements and relevant normal, boundary, failure and permission behavior. This is the QA execution contract, not a catalogue of internal unit tests.
- Give each case a stable ID, requirement reference, exact approved QA skill(s), actor, prerequisites/test data, ordered actions, expected outcomes, evidence to retain and any cleanup. State ordering or shared test-data dependencies when cases interact.
- Name the required testing types and installed/approved skill identifiers. Do not invent skill names or silently substitute one type of test for another. Missing cases, ambiguous expected outcomes or unresolved skill mapping prevent readiness for automated QA.
- Keep expected outcomes grounded in the accepted requirements. Implementation may add verified URLs, commands, fixtures and access references before review, but must not weaken tests or rewrite expectations to match its own behavior. The PR reviewer checks case coverage and any additions before QA.
- End with one separate **Automated regression** bullet. Name the broad behavior and suitable test level to add or update.
- Keep internal unit-test inventories, test-file lists and implementation mechanics out of the acceptance case set; include boundary cases where the requirements need them.

## Audit the result

Confirm that:

- Every item is correctly classified as Story or Task.
- Every Story fits in less than two human working days, one repository, one pull request and no more than 20 changed files total.
- Every Story identifies its target repository and change boundary; related repositories are context or separately owned work, not implicit permission to change them.
- Every Story produces a complete code change rather than research or a partial implementation.
- A reader can explain how this slice advances the parent goal, what its actual consumer gains now, and how that gain will be demonstrated without depending on an unbuilt later capability.
- Every sentence is short, direct, and limited to one main idea.
- The title and body use the simplest accurate words.
- Source jargon, business language, difficult formal wording, and avoidable industry terms have been removed.
- Every technical name kept from the source is an established name or needed for accuracy.
- Any required technical or domain term is defined in plain words on first use.
- No filler, repetition, or unnecessary background remains.
- Functional criteria state outcomes, while technical criteria state only necessary constraints.
- A QA person can tell how to access the work, where to test it, and what to look for.
- The testing strategy names needed credentials, roles, permissions, test data, or feature flags when relevant.
- UI work has clear visual verification steps.
- API work says whether Postman is needed and gives usable request details when known.
- Automated regression coverage is a separate, brief note.
- The complete acceptance cases and their explicit QA skill mapping are on the ticket, with expected results, evidence and prerequisites; internal unit-test inventories remain separate.
- No requirement is duplicated, contradictory, speculative, or outside the parent epic's scope.

When editing an existing tracker item, preserve its parent, workflow status, completion state, and already-delivered scope unless the user explicitly asks to change them. Never mark work complete based only on rewritten wording.
