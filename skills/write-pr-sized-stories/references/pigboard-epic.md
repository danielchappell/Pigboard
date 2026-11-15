# Author a versioned Epic

Start from the complete [epic.yaml](epic.yaml) template for `pigboard-epic/v1`.
Keep the short title outside the YAML. Native Jira owns the key, title, type,
project, assignee, parent where applicable, labels and status. The body records
the problem, outcome, included/excluded scope, workstreams, accepted decisions
and owned open questions. Do not add native metadata keys or a second prose copy.

Keep every field visible. Use null for unresolved values, not empty strings or
invented ticket keys. Replace unused optional list scaffolding with `[]`.
Each stream contains its **full numbered label** and ordered actual Story/Bug
keys. Never shorten `AI-Example-1` to `1`. Equal label text across Jira projects
is not a global stream identity; site/project context remains native/trusted input.
List order breaks ties among eligible tickets; it does not create prerequisites.
Declare dependency edges on tickets, with `ai_qa_complete`, independently.

Accepted decisions have stable IDs and readable decisions. Their optional nonblank
references are supporting citations, not automatically trusted runtime inputs or
fetch instructions. Authors/reviewers assess their support. `open_questions`
contains question/owner pairs until resolved and must be `[]` before local start.
Do not claim readiness while scope or ticket membership is unknown.

Use the [ticket guide's shared checker instructions](pigboard-ticket.md#save-check-and-return),
substituting the Epic path. Run draft and structure on saved raw YAML; run start
only with caller-supplied trusted context containing the reachable ticket graph.
The [two-stream example](pigboard-example.md) supplies a full synthetic brief,
body and separate context. Canonical schemas remain in the repository's
[Epic schema](https://github.com/danielchappell/Pigboard/blob/main/contracts/epic-v1.schema.json)
and same-release prepared validator, never a private writer copy.

Return the editable body and actual validation/missing-input summary. Missing
checker/context preserves the draft and honest checks-not-run result. Do not
install dependencies, invent context, publish without separate authorization,
change status/labels/parent, mark Ready to Work, start workers, complete work or
request rework. Local validity is not live readiness. Generic discovery/design
Tasks stay prose; each eventual implementation Story/Bug remains one repository,
one PR, at most 20 changed files and less than two human working days. Existing
basic workers have not migrated to this YAML contract.
