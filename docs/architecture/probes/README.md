# Prepared manager observations

These five requests prepare read-only parts of the [isolated discovery packet](../manager-test-packet.md).
They do not implement the manager, create fixtures or authorize live execution.
Use the existing `qa-api` → `qa-bruno` chain after the full packet is ready and
approved. The localhost check below is usable now with the prepared locked CLI.

| Exact selector | Observes | Packet coverage and limit |
| --- | --- | --- |
| `issue.bru` | Stable issue/project/status IDs | P1/P4 current state only; no workflow/history proof |
| `reconcile.bru` | One known ID using enhanced search reconciliation | P2; reject missing, extra or paged results |
| `comment.bru` | Comment ID, actor, created/updated metadata and exact JSON record in ADF | P7 transport only; no YAML/JCS/schema or business-authority proof |
| `pointer.bru` | Exact property key/value | P7 assignment pointer transport only |
| `dynamodb.bru` | Strong GetItem with exact synthetic typed attributes | P3–P5 observation only; live execution disabled |

The operator still owns all setup, mutations and fault injection. No Lambda request,
workflow/history request, resource template, credential setup or cleanup operation
is supplied here. Those are remaining preparation. All provider cases are NOT RUN.

## Run the local checks

Prepare the locked CLI using [qa-bruno's instructions](../../../skills/qa-bruno/SKILL.md)
before testing; installation is not automatic recovery. From the repository root:

```sh
node docs/architecture/probes/test-observations.mjs \
  /absolute/path/to/qa-bruno/scripts/node_modules/.bin/bru
```

The path must resolve to the existing **4.2.1** executable. Node 20+ is required.
The harness opens two loopback listeners, supplies fake responses and temporary
fake credentials, and runs exact selectors with safe mode, no proxy and no redirects.
It checks five successful requests, intentionally wrong responses, missing binding,
wrong selector/target, unauthorized live mode and invalid local credential files.
The second listener proves the supplied proxy receives no traffic. It does not
prove that every OS/network configuration is isolated; use an approved local host.
No Jira, AWS or Cursor request is made by these checks.

A valid response must execute its named test. Negative responses must fail that
same test; missing reports, zero tests or script errors cannot count as success.
Missing binding/profile is a separate prerequisite rejection with zero requests.
Non-ASCII boundary cases verify the 16 KiB limit in UTF-8 bytes, including exact
limit acceptance and one-byte-over rejection. The final JSON is a sanitized summary. Successful runs delete their temporary raw
reports; failed runs retain them privately and print the path for diagnosis. Even
though local credentials are dummy values, do not publish raw reports by habit.

## Bind a future authorized observation

Use the packet's single manifest and generated fixture receipt to prepare a runtime
`PIGBOARD_PROBE_BINDING` JSON value. Never infer IDs from the examples or treat a
boolean in this value as authorization. A reviewed invocation and the operator's
request counter enforce the approved test scope; the collection guard only catches
mistakes. Do not use a whole-collection command.

Common binding fields are `schema: pigboard-observation-binding/v1`, `observation`
(the selector without `.bru`), `mode`, `base`, `region`, `issue_id`, `project_id`,
`issue_allowlist` and `expected`. `comment_id` is required for comment reads.
The expected fields are `status_id` for issue/search; `actor_id`, `created`, `updated`
and `record` for comments; `pointer` for property; `item` for DynamoDB.

Local mode additionally supplies `local_port` and `profile: pigboard-local-fixture`.
Its base must be exactly `http://127.0.0.1:<local_port>`. The harness supplies the
complete example binding from [fixtures.json](fixtures.json); these are fake transport
values, not semantic completion evidence. The pointer digest is deliberately a
placeholder; no local case establishes reference integrity or authorization.

Future Jira live mode requires `execution_authorized: true`, `approved_revision`,
`identity_receipt`, `counter_receipt` and `site`. The only current live base is
`https://scubapig.atlassian.net`, equal to `site`; fixture IDs must come from the
approved isolated project. Put the prepared Authorization value only in runtime
`PIGBOARD_JIRA_AUTHORIZATION`, never a file, command argument or shared report.
If the chosen scoped token requires an Atlassian gateway URL, this collection is
not yet compatible: leave the case NOT RUN and revise/review the binding contract.
Do not switch token types or broaden credentials to make it pass.

From this collection directory, the approved invocation selects one file:

```sh
"$QA_BRUNO_ROOT/scripts/node_modules/.bin/bru" run issue.bru \
  --sandbox=safe --bail --noproxy --reporter-json /private/evidence/issue.json
```

The operator verifies the actual identity, fixture scope, execution authorization
and current artifact first. Use no retries. Each request has a ten-second deadline
and no redirects. Inspect both exit status and JSON report, including all assertion,
test, pre/post-script results and runtime errors. Keep raw reports private.

## AWS credential limit

Bruno 4.2.1's profile helper can continue without signing after credential resolution
fails. The local harness validates its exact dummy profile and verifies the dummy
SigV4 credential/service/region at the fake server. That proves local serialization
only. The DynamoDB request refuses live mode until a separately reviewed credential
preflight can prove the prescribed identity and stop before sending on failure.
A profile name alone is not identity evidence. No new AWS login, role or permanent
key is created by these artifacts.

DynamoDB bindings include the exact `table`, typed `key`, `profile` and `region`.
The only implemented operation is `DynamoDB_20120810.GetItem` with
`ConsistentRead: true`. No write request exists in the collection. Its tiny synthetic
record is probe data, not the proposed manager's production record layout.

## Evidence and review

The preparation plan was independently reviewed by two fresh Sol reviewers at
SHA-256 `29610b2dede62211f98f307e00525f6eb33b644627362b522ec0d57b2838228a`.
Both completed second sweeps and assessed all seven principles and unified
configuration. Initial findings added explicit safe-report checks, proxy isolation
and fail-closed handling of the unverified live AWS credential path.
Author verification: 28/28 local cases passed with zero provider/proxy requests;
`npm test` passed 24/24 retained installation tests; 15 relative documentation links
resolve. Local checks do not establish Jira/AWS acceptance. Committed artifact
review and live acceptance remain separate gates.

Author assessment: named selectors are intuitive; prerequisites and limitations
are discoverable; local repeatability respects user time; exact assertions save
agent inference; credentials/targets are bounded; humans and agents share the same
checks; failed setup cannot masquerade as a product result. Bindings derive from
one probe manifest; the fixture JSON is test data, not another installation config.
