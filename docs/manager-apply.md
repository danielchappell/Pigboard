# One ordinary admission

The ordinary sender evaluates the configured Jira domain and attempts at most one
Story or Bug per invocation. It can admit new work from Ready to Work and, with
explicit opt-in, a supported same-PR repair from Rework Queued. It publishes the
assignment before sending one configured transition to In Progress. Workers run
through their existing triggers and verify current PR openness and freshness.

Use a reviewed compatible sender package and the [installation guide](manager-installation.md).
The package starts with its schedule and writes disabled. Deliberate activation
requires full visibility, sole admitting installation and reviewed inventory.
Configure the matching direct, non-global edge for each supported source stage
and project. An available Jira transition ID alone carries no source authority.

For repair, set the optional canonical boolean `manager.rework_enabled` to true.
Omitting it or setting it to false preserves ordinary new-work sending and holds
required repairs. Use a package revision that supports repair sending. The sender
accepts an authenticated [ordinary repair proposal](manager-preview.md#recorded-same-pr-repair-preview)
from its own fresh acquisition. The queued ticket must have its actual current
assignment pointer and a complete unresolved same-ticket request union with a
recorded non-null PR. Parent updates, dependent-stack work, null PRs and
wait/resume work stay held. An active worker is never interrupted.

The scheduled input is exactly:

```json
{"operation":"apply"}
```

Callers cannot select a stream or override authority. The prepared host supplies
the canonical configuration, binding, controls and credential resolver. Preview
remains a separate write-free operation.

For multiple eligible ordinary streams, the sender compares immutable project IDs
as strings, then full stream labels as strings. For example, project `10` sorts
before `2`, and `AI-Daniel-10` before `AI-Daniel-2`. Within a stream, a ready
prerequisite comes before repair, then eligible unrelated Bugs and Stories. A
refusal to send the chosen repair ends this invocation without admitting
unrelated ready work in its place.
A later invocation freshly evaluates all streams and may choose another eligible
stream. This provides deterministic choice without fairness or throughput promises.

For a selected repair, the sender checks the handoff, membership, reference, State
and acquisition limits it can determine from the acquired facts and planned
publication before retaining membership. It projects the selected ticket's
comment pages with the new comment using Jira's observed page layout and page
size. It uses that layout and all response bytes received, including error
responses, to forecast verification requests, pages and bytes after the planned
publication. The sender separately estimates the size of the normalized data
needed for verification, including the recorded reason each issue was read.
When available, the current assignment's verified comment supplies metadata sizes
for both estimates. Jira may return a different page layout, metadata or
formatting on the next read. The readers and writer enforce their bounds on
actual provider traffic, and State checks conditional revisions and transaction
limits. If a publication or verification read exceeds a limit,
the sender retains the original attempt for recovery and stops before transition
or finalization. New work follows the existing sequence. After eligibility and
member checks, the sender retains membership, reloads coherent State, and prepares
the admission before the conditional begin.

A repair gets one original attempt ID. Its admission records the actual previous
assignment, the recorded PR and every unresolved cause from the proposal,
including older causes after a repeated failure. An implementation acknowledgment
alone cannot resolve a repair cause. Inspect the verified admission record for
the PR and cause list.

The sender retains native membership and a conditional original intent.
It publishes one admission comment, verifies its exact body and unchanged manager
metadata, retains its reference, publishes and verifies the assignment pointer,
and durably binds that assignment. Fresh discovery must then confirm unchanged
source facts apart from this invocation's own verified publication. Finally it
prepares the original transition request and saves the exact Jira comment
metadata. Only confirmed preparation permits the one transition POST. This
capture adds one conditional write and one retained item per prepared attempt
on fresh installations using a package that includes it. See
[the State capture contract](manager-state.md#retain-and-inspect-original-transition-proof).
Earlier attempts may lack this evidence and remain readable.

The structured result includes the latest stage reached and, when available, the
selected scope, immutable ticket ID and original attempt ID. `writes` counts Jira
mutation send attempts, from zero to three. Each of `intent`, `comment`, `pointer`, `transition`
and `finalization` is `not_attempted`, `confirmed` or `unconfirmed`. A confirmed
transition can coexist with an unconfirmed finalization. Only `applied` means all
required response retention and finalization completed. `execution_authorized:false`
means the returned observation grants no authority for another invocation; its
effects report what this invocation actually attempted.

For `held`, use the diagnostic with `apply.stage`, `apply.ticket_id`,
`apply.attempt_id` and `apply.effects.intent` to decide what to inspect.

| Evidence in the result | What to inspect |
| --- | --- |
| No selected ticket or current attempt | Review the reported reason and any held streams. A pending attempt from an earlier invocation can hold a stream without this invocation selecting a ticket. |
| Selected ticket, intent `not_attempted`, outside `retain_members` | Review the reason for holding that ticket. A repair preflight refusal occurs before membership retention or reservation. An allocated ID alone does not establish an attempt in State. |
| Stage `retain_members`, intent `not_attempted` | Verify the selected stream membership and installation revision in State. Retention may have taken effect. This invocation stopped before beginning an attempt or writing to Jira. |
| Intent `unconfirmed` | Check State for the returned original attempt ID. Begin may have reserved it. This invocation stopped before starting Jira writes. |
| Intent `confirmed` | Inspect the original attempt and its recorded effects in State. Keep confirmed effects separate from uncertain ones. A confirmed transition with unconfirmed finalization remains a partial outcome. |

### Inspect the original transition attempt

| Sender observation | What happens next |
| --- | --- |
| Preparation failed or was uncertain | The sender stops before the transition. Inspect the original attempt to see whether State retained the prepared request. |
| Complete, empty HTTP 204 | The transition effect is confirmed. The sender first saves the original reply and then conditionally finalizes the same attempt. |
| Complete HTTP 409 saved in State | Jira rejected the transition. The sender reports `held` with `TRANSITION_REJECTED`. The attempt remains pending and finalization is `not_attempted`. |
| Another complete final reply saved in State | The sender reports `held` with `TRANSITION_RESPONSE_UNSUPPORTED`. The attempt remains pending and finalization is `not_attempted`. |
| Deadline expires after preparation and before sending the transition | The Jira comment and assignment pointer are confirmed. The sender reports `held` with `LIMIT_REACHED` and transition `not_attempted`. Inspect the named pending attempt in State. |
| Missing, incomplete or invalid transition reply | The transition outcome is unknown. The attempt remains pending with the prepared request and no saved reply. |
| Uncertain reply save or finalization | Stages `retain_response` and `finalize` identify the uncertain write. The original attempt can show what committed even if State's acknowledgement was lost. |

The Jira comment and assignment pointer can both be confirmed even when Jira
rejects the transition. To check what State retained, run the read-only inspection
from the reviewed package checkout with the prepared dependencies, customer
configuration, original installation receipt and named AWS profile for the
canonical operator role. See [the bound customer CLI](manager-state.md#bound-customer-cli).
Replace `<UUID>` with the sender's `apply.attempt_id` and keep the `attempt:` prefix.

```sh
node scripts/manager-state.mjs inspect --config FILE --installation RECEIPT --operator-profile NAME --kind attempt --record-id 'attempt:<UUID>'
```

Append `--json` for the same observation as structured data. Check the recorded
HTTP status and time, the attempt outcome and its publication reference before
any subsequent action. If needed, inspect the original stream to confirm its
pending attempt ID. A saved reply and a finalized attempt are separate facts.
Leave the original records and partial effects in place. Ordinary invocations
keep the pending stream held and send nothing for that attempt. Disable the
installation when intervention is needed. Stop preserves pending evidence.
Operator inspection of the full native evidence and settlement are planned
separately. Real installation acceptance is pending.

The invocation budget must cover ten bounded State calls, two bounded acquisitions,
five Jira writer requests and one writer credential resolution. Configuration is
refused when its existing timeout/cadence cannot cover this sequence; settings are
never silently increased. Response bytes and request bodies remain bounded and
provider bodies, credentials and ticket content stay out of public results/logs.

The disposable developer checks are:

```sh
node --test test/manager-apply.test.mjs test/jira-write.test.mjs
```

They use the actual collector, ordinary policy and State APIs with local simulated
providers. Run the two original-transition evidence groups from the reviewed
checkout with prepared dependencies:

```sh
node scripts/test-manager-apply.mjs --group SEND-H01
node scripts/test-manager-apply.mjs --group SEND-H02
```

Retain each group's JSON with the exact command and source revision. The groups
check completed replies, preparation and reply faults, and read-only restart
inspection against disposable providers. Designated human acceptance, hosted CI,
release and live Jira and AWS behavior require separate evidence.

After unconfirmed membership retention or begin, a later independent invocation
can admit work only after complete coherent reads find no pending
attempt, its new conditional membership retention succeeds and advances the
installation revision, its follow-up coherent inventory matches that revision,
and its new conditional begin succeeds. Absence alone is not authority. The later
retention and earlier begin compete on the same increasing revision: a committed
earlier pending attempt holds or conflicts with later work; a successful later
retention fences the earlier begin from subsequently succeeding. This is a new
original attempt, never a resend or continuation of the uncertain attempt.
Actually persisted pending intents and uncertain Jira effects keep their existing
holds. No record is cleared or finalized to obtain this result. This bounded
pre-publication guarantee uses the existing conditional State protocol; it does
not promise generic timeout cancellation or duplicate-worker prevention.

Retention follows each actual Story or Bug's native Epic and the ordinary policy's
complete member set. Acquiring an Epic to discover work does not make that Epic a
member. Earlier-Epic members retain their own parent; the selected active Epic
owns only the selected admission attempt. Missing or conflicting ownership holds
before publication, and retained assignment/revision checks remain mandatory.

The source recheck requires the selected stream complete in both acquisitions.
An unchanged, positively isolated read refusal in an unrelated stream may remain
held while the selected admission completes. Shared, unknown, newly changed or
selected-stream failures still hold the original attempt before transition. All
previously observed native facts, bodies, labels, comments, references and scope
memberships must remain unchanged apart from this invocation's verified admission
comment, replacement pointer and the exact references they add or replace. A
new request during recheck holds the attempt before transition. Inspect the
original scope and attempt when held. The sender ends the invocation at the
refusal or uncertain effect.

## Check same-PR admission with prepared fixtures

Use a clean reviewed source checkout or a complete prepared source copy at that
same revision, with physical root and AWS dependencies already available. Run
the fixed selectors from that checkout and retain their JSON output and exit
codes.

```sh
node scripts/test-manager-apply.mjs --group R3B-H01
node scripts/test-manager-apply.mjs --group R3B-H02
node scripts/test-manager-apply.mjs --group R3B-H03
```

| Group | Inspect |
| --- | --- |
| R3B-H01 | Reviewer, QA, human and repeated failure. Compare the previous assignment, same recorded PR and complete request union. Check original State intent, ordered verified Jira writes and confirmed finalization. |
| R3B-H02 | Opt-out, missing repair edge, repair before an unrelated Bug and over-bound assignment. Check held cases for zero admission effects and carry existing PGB-82 occupancy, project, prerequisite and capacity evidence. |
| R3B-H03 | New request and invalid own-reference delta during recheck, then the four prescribed uncertainties. Inspect the original attempt and one later scan per uncertainty for no repeated writes or bypass. |
| R3B-H04 | Match H01 sender output with [PGB-82 preview proof](https://scubapig.atlassian.net/browse/PGB-82) and [PGB-166 worker evidence and disposition](https://scubapig.atlassian.net/browse/PGB-166?focusedCommentId=11199) for automatic, human and repeated entry. Preserve each earlier evidence limitation. |

For H04, compare the preview proposal to the published admission's previous
assignment, PR provider/repository/number/head/target and exact request references.
Check matching request tuples against earlier worker evidence where available.
Identify different fixture identities and any worker step that did not run.

From the clean checkout at the reviewed commit, run this separate package smoke
with prepared Node.js 24 and `/usr/bin/zip`. It builds the real payload at the
pinned commit and executes one reviewer case with the copied host and State
modules and embedded configuration and manifest. The fixture driver stays
outside the payload.

```sh
PGB_REPAIR_PACKAGE_SOURCE_PIN="$(git rev-parse HEAD)" node --test --test-name-pattern='PGB-88 pinned package repair admission' test/aws-manager-package.test.mjs
```

Retain the source revision, prepared pin, exact commands, input and module hashes,
exit codes, sanitized result, ordered provider calls and original State records.
The commands execute real source or copied code against dummy Jira and AWS
providers. Describe actual earlier worker invocations separately from supplied
proof and mock effects. Mark designated human acceptance and any unperformed
execution `NOT_RUN`. Keep that evidence for the reviewer, then remove only
disposable output. Hosted CI, live permission checks and activation are separate.

## Inspect processing completion

The application result now includes a bounded `processing` observation; the AWS
runtime adds a sanitized `summary` and emits one root JSON health record for each
finished valid apply invocation. Existing status, code, writes and every `apply`
effect keep their original meaning and order. No extra Jira or State call is made
for health. Use the existing [health command](manager-health.md) for readable or
JSON inspection with the same state and exit code.

Complete processing requires coherent retained installation/package/configuration
and enablement identity, full domain acquisition and valid policy evaluation.
Selected work additionally requires complete unchanged-source recheck and confirmed
finalization. Empty work and safely evaluated holds can complete processing. A
pre-existing uncertain attempt stays held and unresolved; newly uncertain effects
or failed finalization cannot supply completion. An admitted scope alongside an
incomplete scope remains an applied outcome with incomplete processing health.

Health construction, emission and timing/console failures are contained after
admission. They cannot replace the original result, repeat effects or trigger a
new admission. Missing logs are missing evidence, not completion. Invocation-wide
Jira/writer/State consumption remains unobserved; measured duration and original
effects are separate. Workers, alarms and automatic recovery remain outside this
source increment. Existing installed packages and live acceptance are unchanged.
