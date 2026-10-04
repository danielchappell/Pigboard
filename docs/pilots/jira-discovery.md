# First pilot: a Jira ticket gets a useful discovery answer

Historical design and discovery record, 21 September 2026. The user approved
this pilot direction at the time. The INT workflow below was proposed, not run,
and was superseded for the active pilot by the
[PIG connection design](../designs/pig-jira-connection-discovery.md).
See [feasibility findings](jira-discovery-feasibility.md) for the evidence.
The trivial API check is complete; the [architecture plan](../architecture-plan.md)
and [delivery plan](../delivery-plan.md) now govern the next work.

## The outcome

A teammate submits one technical question through an INT Task. A cloud agent
investigates the configured repository. Everyone working on the ticket can see
the run's progress, findings, evidence, and next decision in Jira.

The pilot uses one team, INT only, one repository, the `researcher` role, Cursor
as the candidate execution provider, and one active job. Pigboard's coordinator
must run on shared infrastructure so a developer's laptop can be off.

## The ticket journey

1. A teammate writes a Task with a specific question and enough context to
   recognize a useful answer, then adds `ai-enabled`.
2. They move it to **Ready to Work**. Pigboard checks project, issue type,
   label, status, configured repository, dependencies, and existing run ownership.
3. Pigboard records the request and starts the configured discovery agent.
   A ticket comment distinguishes queued work from an accepted provider run.
4. After the provider accepts the run, the ticket moves to **In Progress**.
   Its progress comment contains the run link and stays current.
5. The agent returns findings, evidence, open questions, and a recommended next
   step. Pigboard validates the result and publishes it on the same ticket.
6. A usable answer moves the ticket to **Product Acceptance** for human review.
   A question or failure remains clearly marked as needing attention; it does
   not silently advance. A human decides what happens next.

These status names already exist in INT. They are a proposed pilot mapping,
not new statuses or a change to the team's workflow. Transition IDs and required
fields must be checked under the integration identity before activation.

Keep the human assignee. INT's current board filter allows named people and
unassigned tickets; assigning a ticket to a new bot could hide it from the board.
The agent's identity and ownership belong in the run record and progress comment.

The first trigger is a status move after applying the label. Adding the label to
a ticket already in Ready to Work must also be picked up by reconciliation;
users should not need to move a ticket out and back just to make it visible.

## What the agent receives and returns

Pigboard supplies the question, relevant ticket context, configured repository
and revision, role instructions, and a run identifier. The repository and role
come from configuration, not model guesses or instructions in ticket comments.

The expected answer contains:

- A direct answer or an explicit explanation of what remains unknown.
- File or source references supporting the findings.
- A recommended next step and the main tradeoff.
- Any question that needs a human answer.

The owner selected [Pigboard itself](https://github.com/danielchappell/ski-stack)
on 21 September. Its selected revision is
`5e48c3def05fa8dc840d51ae6683113b9faa0ba2`.

The owner then restricted the company Cursor account to trivial adapter tests.
The immediate probe asks only for `SKI_STACK_CURSOR_PROBE_OK`, without a
repository or tools. The [prepared API request](cursor-discovery-request.json)
contains the exact API request used for the successful check, including the
selected model. [API evidence](cursor-api-probe-result.json) records recovery
after a timeout, duplicate rejection, and the final result. The earlier browser
check is separate evidence and is not the adapter test.

The broader question about the smallest useful Jira change stays in our local
development workflow. It must not be sent to the company Cursor account.
Once source-control access is established, a repository probe can read only
`package.json` and report its name and version. The intended Jira journey above
remains a product target; it is not permission for substantial work-account runs.

Use Cursor's documented `plan` mode for the prepared API probe and disable
automatic PR creation. Prompt instructions are not enforced permission or
spending limits. Pigboard's Jira and orchestration credentials stay outside
the agent context.

## Visible failure and recovery

| Situation | Expected behavior |
| --- | --- |
| Missing label, wrong project/type/status, or blocked dependency | No agent starts; a setup inspection can explain the reason. |
| Repeated event for the same request | Reuse the existing run identity. |
| Coordinator restarts or launch response is lost | Recover the provider run before considering a new launch. |
| Provider fails or asks a question | Show the failure or question on the ticket without claiming completion. |
| Result exists but a Jira write fails | Retry publishing the stored result, not the model work. |
| Human removes eligibility or takes over during a run | Recheck current ticket state; do not overwrite the human's status choice. |
| User deliberately requests another attempt | Create a new attempt explicitly; comments and progress updates do not trigger it. |

## How we demonstrate the milestone

Use one agreed test Task and repository. Observe eligibility, queued/running
progress, a useful answer, and the human-review handoff. Open the ticket and run
as a second authorized teammate. Repeat an event and restart the coordinator:
the original provider run must remain the one being tracked. Exercise one
provider failure and one interrupted Jira publication. The coordinator and
agent continue while the submitting developer's laptop is offline.

This milestone can span several PRs. Each Story still needs one complete usable
outcome, at most 20 changed files, and less than two human days including tests
and PR preparation. We will groom Stories after reviewing the overall architecture and delivery path.

## Seven-principle assessment

This is the author's design assessment, not an independent review or release
approval. All rows still require implementation evidence.

| Principle | Assessment |
| --- | --- |
| Intuitive | Uses existing board statuses and keeps the human assignee; verify actual transition permissions. |
| Discoverable | The ticket template and setup inspection must explain the opt-in label and next action. |
| Delightful experience | One board action starts work; update a progress comment instead of flooding the ticket. |
| Token saver | Code chooses the role and repository; live work-account probes are restricted to trivial tasks. |
| Secure | Keep Jira credentials out of the agent; the current probe uses no repository, and new credentials or access need explicit authorization. |
| Agents are equal | API launch, recovery, duplicate rejection, and final-result retrieval now have live evidence; the production adapter remains to be built. |
| Dependable | Track stable run identity and publication separately; launch recovery and failed-write behavior need live and regression evidence. |

Later outcomes include additional roles, concurrent jobs, MCP control, another
execution provider, and installable packages. Their detailed designs wait until
the next working slice needs them.
