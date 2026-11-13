---
name: qa-bruno
description: Run prepared Bruno requests and assertions for prescribed QA cases, retaining reproducible evidence. Block on missing artifacts or prerequisites; do not author requests, repair tests or discover alternative tools.
---

# Prescribed API execution with Bruno

Run the reviewed requests assigned to this skill. The ticket supplies case IDs,
requirement references/version, ordered steps, explicit expectations and evidence
requirements. The implementer supplies the collection, assertions, exact selected
requests, parameter bindings and reviewed revision. Check these agree before
running; missing or conflicting inputs block, rather than authorizing test design.

Also require the ready nonproduction target/deployed revision matching the reviewed
PR, permitted network destinations/actions/data, prepared identity/tenant and secret
references, evidence destination and prescribed cleanup (or explicit none).
Do not discover collection conventions or create a collection during QA.

## Prepared runtime

Resolve `QA_BRUNO_ROOT` to the absolute directory containing this `SKILL.md`.
Use only its locked Bruno 4.2.1 executable:

```sh
"$QA_BRUNO_ROOT/scripts/node_modules/.bin/bru" --version
```

Dependency installation is preparation by the operator/implementer, before the QA
run. Preparation command, **not an automatic recovery action during QA**:

```sh
npm ci --prefix "$QA_BRUNO_ROOT/scripts"
```

If the prepared executable is absent, incompatible or fails, return BLOCKED. Do
not install packages during QA, use unpinned npx, switch to a global CLI, require
the GUI or choose a different HTTP tool. Version checks prove installation only.

Use the prepared command and exact selectors from the collection directory. Never
run the whole collection implicitly: it may contain unrelated requests. Before
execution verify the selection maps to the assigned case IDs, honors declared
ordering/data dependencies, uses `--sandbox=safe`, and writes a JSON report to the
supplied private evidence location. Do not enable developer mode to bypass errors.

Inspect the selected request definitions, resolved URLs/redirect/auth destinations,
environment and pre/post scripts. A script or inherited request cannot broaden the
approved actions, network destinations or data scope. A mismatch blocks without
rewriting the artifact. Keep credentials in the approved runtime source, never in
collection files, command arguments or shared logs.

For explicitly prescribed AWS SigV4 requests, use the supplied region/service and
prepared credential provider. Bruno 4.2.1 supports `auth:awsv4` with `profileName`,
`region` and `service`; with profile auth leave literal keys/token fields empty.
Use the selected provider's process environment; never assume personal SSO for a
bot or mix fallback credentials. Credential-resolution/signing failures block;
this skill does not login, refresh credentials or pick an identity. A response alone
does not prove that the intended identity signed the request.

## Execute without redesign

Execute only the prescribed requests and assertions. Bind returned IDs only as
declared, preserve sequential steps and do not parallelize dependent requests.
Check meaningful assertions against supplied expected outcomes, including expected
denials. Zero executed assertions cannot pass. Record any missing assertion or
conflicting expectation as BLOCKED; never add or correct it during this run.
An expected denial under the verified prescribed identity can PASS. Unexpected
failure to establish that identity/access blocks; a demonstrated authorization
defect under the verified identity is FAIL.

Use only explicitly prescribed finite observation intervals/deadlines for async
cases, retaining the initial response. No ad hoc retry, connection recovery or
replay of an uncertain write. An assertion mismatch under valid prerequisites is
FAIL. Continue other independent prescribed cases; if later steps need state that
the defect prevented, mark those steps/cases NOT RUN. Stop execution immediately
on a prerequisite blocker. A batch command must support these stop/dependency
rules; if it cannot, the handoff is BLOCKED before running that batch.

## Evidence and result

Verify report creation, exit state, actual request/assertion counts, each expected
assertion and unexecuted cases; command success or a report file alone is not PASS.
Count actual checks in both Bruno's assertion and test-script results. Inspect
runtime errors too: a script/assertion-engine failure is BLOCKED even if a report
labels checks PASS or FAIL. It cannot establish product behavior.
A command that failed before requests ran is a blocker, not a product verdict.
Treat a truncated/missing report needed for assessment as BLOCKED.

Return per case: ID, expected/actual, PASS/FAIL/BLOCKED/NOT RUN, sanitized evidence,
requirement source, selected identity/tenant label, versions, environment/deployed
revision, reviewed source revision, timestamps, correlation IDs, executed definitions,
selection, sanitized command and cleanup status. Raw reports can contain headers
and bodies: keep them private and redact secrets/unnecessary personal payloads
before sharing. Preserve the original observation; never lower assertions to fit
the response, create regression cases or edit/commit repository files during QA.

Aggregate PASS requires all assigned cases and evidence; FAIL means demonstrated
defects with no unresolved prerequisite blocker. BLOCKED takes precedence: retain
observed defects, mark remaining cases NOT RUN, state the missing prerequisite and
human action, and stop. Perform only already authorized bounded cleanup, without
retries or repair; uncertain cleanup blocks and must be reported. The calling QA
entry point owns the ticket report and transitions; this helper never claims a
whole-Story pass, approves/merges a PR or changes Jira status.
Recheck the supplied requirement and source/deployed revisions before returning
success. If they changed, affected evidence is stale: return BLOCKED for a fresh
handoff rather than testing a different revision or declaring it passed.
