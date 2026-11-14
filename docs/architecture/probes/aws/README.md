# Isolated AWS proof fixture

Prepared for PGB-68. **Not deployed; no live execution is authorized.** This is a
small research fixture for the [test packet](../../manager-test-packet.md), not the
manager implementation. It cannot read Jira, start Cursor, choose work or recover a run.

The [template](template.json) prepares a DynamoDB table, a read-only Lambda observer,
its execution role and a one-day log group. An optional customer operator role is
omitted unless its exact trusted IAM principal is supplied. There is no schedule,
public endpoint, secret, packaging bucket, VPC or vendor access.

## What is ready and what is missing

The only handler source is inside the template, as newline-joined source lines.
It uses Python 3.13 and its bundled AWS SDK. The observer returns the actual SDK
version with successful observations; retain that in the test receipt. No moving
source is fetched during execution. This packaging choice is for the isolated
probe, not a production manager dependency decision.

The local tests and exact conditional-write payloads are prepared. Before any
resource creation, bind the existing [manifest](../../examples/manager-probe.yaml)
to the verified customer account/region, a non-root customer operator principal,
reviewed artifact revision, approved setup budget and isolated Jira fixture. The
current proposal is `eu-north-1` in the new Scuba Pig Free-plan account. Account
creation does not prove quotas, deployment access or that this package is free.
No paid upgrade is permitted.

Live SigV4 execution through the Bruno kit remains disabled pending its separate
credential preflight. This fixture does not fix that limitation or grant permission
to improvise a provider. Its operator requests are inspectable payloads, not an
executable runner. Credentials and execution tooling must be prepared before tests.

## Local verification

From the repository root, using Python 3.10+ on a POSIX host:

```sh
python3 docs/architecture/probes/aws/test_observer.py
```

The standard-library test loads the exact inline source with fake SDK modules.
It checks permitted inputs, strongly consistent reads, sanitized results, errors,
phase timeout settings, a real local wall-clock timer and timer cleanup. Static
checks cover the resource set and important IAM/retention boundaries. The nine
conditional payloads are walked against synthetic state; that is not DynamoDB
acceptance or an alternative production state adapter.

Author result: 15/15 tests pass, with no SDK installation, credential lookup,
network request or AWS resource. Static assertions are not CloudFormation service
validation, IAM simulation or proof that this runtime works in the new account.

## Permissions to review before deployment

| Actor | Permission | Boundary |
| --- | --- | --- |
| Lambda runtime | `dynamodb:GetItem` | Its generated table ARN and the two fixture keys only |
| Lambda runtime | `logs:CreateLogStream`, `logs:PutLogEvents` | Its precreated log group only |
| Optional operator role | `lambda:InvokeFunction` | This observer only |
| Optional operator role | `dynamodb:GetItem`, `PutItem`, `UpdateItem` | This table and the two fixture keys only |
| Customer deployer | CloudFormation and its required resource/IAM creation rights | Existing customer authority; not granted by this template |

The optional role's account principal is constrained by exact `aws:PrincipalArn`.
`TrustedOperatorArn` must be the verified IAM role/user ARN in this customer account,
not a copied STS session ARN, root ARN or vendor identity. Empty means no role is
created; it does not select the signed-in identity automatically. The caller also
needs authority to assume that role. This template does not grant it to the caller.

Actual permissions on an existing customer identity may be broader. Record that
honestly. P6's denied invocation must use a prepared restricted STS session of the
same role with an explicit deny for this function. Missing credentials or failed
role assumption is a prerequisite failure, not a successful denied-access test.
No new user, permanent access key or root execution path is prepared here.

## Binding and setup sequence

After exact-artifact approval, use a stack name beginning `pigboard-proof-` and no
more than 55 characters, so the generated function name fits AWS's limit. Review a
CloudFormation change set before executing it. Reject any unexpected resource,
region, principal or replacement. Save generated table/function/role/log IDs in the
manifest receipt; never copy them into a competing customer configuration file.

The observer has 128 MiB memory, a 30-second invocation limit and reserved concurrency
one. If the new account cannot reserve that concurrency, stop and record the quota
constraint. Do not remove the limit or upgrade the account to make a test pass.
Only synchronous, no-retry observation invocations are prescribed. No asynchronous
invocation settings, delivery retries or scheduler are created.

At most 40 **operator control-plane requests**: one CreateChangeSet, one
ExecuteChangeSet, up to 20 status/description calls and up to 18 identity, policy,
template, account or STS checks. Count every request, including failures. No retries.
CloudFormation's internal AWS calls are not counted by this client ceiling; the
resource ceiling separately limits what the stack may create. Cleanup is a separate
approved operation, not an implicit part of this allowance.

Before execution, record the exact tooling, prepared identity and individual
request definitions for these controls. If mandatory inspection cannot fit the
budget, revise the reviewed packet first. A file existing here is not authorization.

## Observer contract

Only these two payloads are accepted:

```json
{"operation":"observe","key":"PROBE#CONTENTION"}
```

```json
{"operation":"observe","key":"PROBE#STREAM"}
```

Unknown fields, operations and keys are rejected before client creation. Table,
endpoint and identity cannot come from the event. One GetItem uses `ConsistentRead`.
The runtime role has no write API. Success returns `FOUND`, key, numeric revision,
fixed attempt/state values, request ID and SDK version; extra stored fields are
not returned. `MISSING`, `MALFORMED_ITEM`, `ACCESS_DENIED`, `PROVIDER_ERROR`,
`TIMEOUT`, `INVALID_REQUEST` and `ENV_UNAVAILABLE` are separate outcomes. None is
a whole-packet PASS. No event, raw exception or response dump is logged.

SDK connection/read limits are three/five seconds with one total attempt. A separate
ten-second POSIX timer bounds client creation and the read together. Unavailable
main-thread/timer support or an already active timer prevents a request. Timer state
is restored after success or failure. The deadline sentinel bypasses ordinary SDK exception wrappers and is caught
explicitly by the handler. Local tests interrupt a deliberately slow fake operation,
including a transport that wraps ordinary exceptions; actual Lambda behavior remains a live proof requirement.

## Operator sequence and evidence

[operator-requests.json](operator-requests.json) contains nine ordered write
attempts. `TableName: null` deliberately makes each payload incomplete. Bind it from
the approved receipt, preserve all conditions, and validate the whole request
against the reviewed artifact before sending. The file's authorization flag is
false; no script reads it to execute requests.

| Step | Required action and outcome |
| --- | --- |
| P3-A, P3-B | Conditional creates on `PROBE#CONTENTION`; A succeeds and B conflicts; strongly observe A |
| P4-F3-BEGIN | Create pending F3 at revision 1; perform authorized Jira F3 transition, then observe pending |
| P4-F3-CONFIRM | Human records proven F3 outcome, conditional on attempt/revision/state; revision becomes 2 |
| P4-QUEUE-BEGIN | Begin pending F4 queue at revision 3; perform authorized Jira queue, then observe pending |
| P4-QUEUE-CONFIRM | Human records proven queue outcome; revision becomes 4 |
| P4-REPAIR-BEGIN | Begin pending F4 repair at revision 5; perform authorized Jira repair, then observe pending |
| P5-REPAIR-CONFIRM | Human records proven repair outcome; revision becomes 6 |
| P5-STALE | Completion expecting revision 5 conflicts; strongly observe unchanged revision 6 |

This uses nine DynamoDB write attempts, including two expected conflicts, within
the packet's 40-write ceiling. Counts do not replace the packet's Jira, read,
invocation or time ceilings. Record every request's case, time, identity, expected
and actual outcome. Retain sanitized receipts for all pending observations and
reconciliations; do not claim three simultaneous pending owners. These two fixture
records are not the manager's future history layout.

Only deliberately omitted local confirmation is fault injection. A genuinely
unknown Jira transition stops dependent steps. No automatic retry, lock deletion,
new attempt or change to expected results is allowed. The operator must inspect
Jira history and the exact attempt before a reconciliation request.

## Removal and retained evidence

The table and log group are retained on stack deletion/replacement. Table TTL and
streams are absent; log events expire after one day. Export the required sanitized
receipts before they expire. Stop invocations first and inspect actual outcomes.
Do not delete an unresolved record or shared role/secret/workflow. A separate cleanup
plan names exact receipt IDs, retained data and continuing costs. Permanent deletion
requires explicit approval; this preparation performs none.

## Review and limits

The bounded plan received two fresh independent Sol CLEAN reviews after separating
phase timeouts from the total deadline. Plan SHA-256:
`5f94dec449d43232592059dc0c7b6bd4a1361e368d938a36ed32d550b642314f`.
Executable review and provider acceptance remain separate gates.

Author principles: one operation is intuitive; exact inputs and failure codes are
discoverable; offline checks respect user time; fixed requests save agent inference;
customer-only scoped roles protect authority; structured results and human steps
support both audiences; conditional order and explicit evidence limits are dependable.
The existing manifest owns preparation intent; generated receipt IDs are outputs.

Sources: [Lambda runtimes and bundled SDKs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html),
[DynamoDB conditional puts](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html),
[strong reads](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html),
[CloudFormation retention](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html).
These document platform behavior; the proposed fixture has not been deployed.
