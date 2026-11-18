# One ordinary admission

The ordinary sender evaluates the configured Jira domain and attempts at most one
Ready to Work Story or Bug. It publishes the complete assignment before sending
one configured transition to In Progress. It does not launch Cursor or execute
repair admissions. Local fixture verification is separate from installed delivery
acceptance and designated human checks.

Use a reviewed sender package and the [installation guide](manager-installation.md).
Preview packages cannot acquire sending capability through a configuration toggle.
The package starts with its schedule and writes disabled. Deliberate activation
requires all three attestations: full visibility, sole admitting installation and
reviewed inventory. The configured transition must be source restricted from Ready
to Work to In Progress; a global transition is insufficient.

The scheduled input is exactly:

```json
{"operation":"apply"}
```

Callers cannot select a stream or override authority. The prepared host supplies
the canonical configuration, binding, controls and credential resolver. Preview
remains a separate write-free operation.

For multiple eligible ordinary streams, the sender compares immutable project IDs
as strings, then full stream labels as strings. For example, project `10` sorts
before `2`, and `AI-Daniel-10` before `AI-Daniel-2`. Existing Bug priority within a
stream is unchanged. Once selected, any refusal or failure ends this invocation.
A later invocation freshly evaluates all streams and may choose another eligible
stream. This provides deterministic choice without fairness or throughput promises.

The sender first retains native membership and a conditional original intent.
It publishes one admission comment, verifies its exact body and unchanged manager
metadata, retains its reference, publishes and verifies the assignment pointer,
and durably binds that assignment. Fresh discovery must then confirm unchanged
source facts apart from this invocation's own verified publication. Finally it
retains the original transition request, sends it once, retains the complete
response and conditionally finalizes the same attempt.

The structured result identifies only the chosen scope, immutable ticket ID,
original attempt ID and last attempted stage. `writes` counts Jira mutation send
attempts, from zero to three. Each of `intent`, `comment`, `pointer`, `transition`
and `finalization` is `not_attempted`, `confirmed` or `unconfirmed`. A confirmed
transition can coexist with an unconfirmed finalization. Only `applied` means all
required response retention and finalization completed. `execution_authorized:false`
means the returned observation grants no authority for another invocation; its
effects report what this invocation actually attempted.

`held` means inspect the original scope and attempt. A timeout or lost response
never permits searching for a possibly stored comment and publishing again,
resending a transition, clearing the pending intent or inferring success from the
current Jira status. Disable the installation when intervention is needed; stop
preserves pending evidence. The sender has no retry queue or automatic reconciliation.
Keep complete and uncertain facts separately when reporting recovery.

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
providers. The three prescribed groups cover ordinary admission/repeat, boundary
uncertainty and existing holds. They do not establish live Jira/AWS access, worker
acceptance, hosted CI, release readiness or designated-human PASS.

If membership retention or the original begin returns unconfirmed before Jira
publication, that invocation stops with zero Jira effects. A later independent
invocation can admit work only after complete coherent reads find no pending
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
memberships must remain unchanged apart from this invocation's verified own
publication. The sender never switches streams to bypass a refusal or replays an
uncertain effect; inspect the original scope and attempt when held.

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
