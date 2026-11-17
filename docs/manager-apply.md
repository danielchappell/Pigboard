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
