# Install the disabled customer runtime

PGB-83 packages an ordinary decision preview in your AWS account. It does not
include an admission sender. Local fixture evidence is separate from installed
acceptance, human review and permission verification. No vendor principal,
telemetry, public endpoint or runtime source download is configured.

Prepare a reviewed clean Git revision, Node 24, `/usr/bin/zip`, the locked root
and `runtime/aws` dependencies, and AWS CLI before packaging or deployment.
Dependency preparation happens separately; delivery commands never fetch or repair
packages. The repository's ordinary development checks still support Node 20+.
Use one canonical file following [configuration](configuration.md), with complete
Jira read settings and the complete disabled `manager` example below. The existing
`config/pigboss.example.yaml` supplies the project mappings; replace its secret
reference with an exact same-account/region ARN and add this section.
Use an exact Secrets Manager ARN in the same account and region, containing the
scoped service-account token string. This release supports the AWS-managed
Secrets Manager key; a customer-managed KMS key needs separately reviewed setup.
Never put the token in configuration, command arguments or evidence.

An authorized customer administrator prepares distinct operator and deployer
roles and named profiles. Runtime and scheduler roles are separate generated
roles. Profiles select credentials; the commands verify STS account and exact
canonical role before service access. Operator and deployer roles must have no
IAM path: use `arn:aws:iam::123456789012:role/pigboard-operator`, not
`arn:aws:iam::123456789012:role/team/pigboard-operator`. Configure distinct exact
role ARNs in the same account. Path-bearing role ARNs fail local configuration
validation before packaging or host operations. Prepare named profiles for those
supported roles; do not strip a path or substitute a basename to select another
identity. A denied selected profile never falls back to ambient credentials. No
role assumption or credential store is created by Pigboard.

## Build and deploy

Run from the pinned checkout with initial controls all disabled:

```sh
node scripts/package-manager.mjs --config /absolute/customer.json --revision FULL_COMMIT --output /absolute/new-package
```

The new directory contains `manager.zip`, `manifest.json`, `manifest.sha256` and
`template.json`, plus the exact copied payload for inspection. The manifest records
source revision, canonical digest, generated installation generation, production
payload/dependency hashes and zip digest. Keep this package and its manifest.
No source branch is resolved later. Packaging rejects dirty source, missing pinned
dependencies and existing output directories. JSON results name the output or a
safe failure code.

Initial provisioning is an explicitly authorized customer operation outside the
source/fixture checks. Upload the exact zip to your prepared versioned artifact
bucket using AWS CLI and the deployer profile. Record the returned object version,
bucket, key and manifest `zip_digest` in a generated asset JSON receipt. For example:

```sh
aws s3api put-object --profile customer-deployer --bucket APPROVED_BUCKET --key PACKAGE_KEY --body /absolute/new-package/manager.zip
aws cloudformation deploy --profile customer-deployer --stack-name CANONICAL_STACK_NAME --template-file /absolute/new-package/template.json --capabilities CAPABILITY_NAMED_IAM --parameter-overrides AssetBucket=APPROVED_BUCKET AssetKey=PACKAGE_KEY AssetVersion=RETURNED_VERSION QuiescenceConcurrency=1
```

The initial provisioning policy must permit creating the declared resources and
passing their exact roles. Template metadata contains separate intended operator
and control-update deployer policy documents; they are outputs for administrator
review, not automatically attached grants. Initial provisioning permissions must
not be copied to the operator role. Real customer grants, permission boundaries,
service control policies, bucket permissions and installed IAM behavior need live
acceptance. Synthesized allow/deny checks cannot establish them.

The function has reserved concurrency one, Node 24, a bounded timeout and no
sender. The schedule starts DISABLED, with fixed preview input and no flexible
window. Scheduler and asynchronous Lambda retry attempts are zero with a bounded
60-second event age. AWS may still deliver duplicates; preview performs no writes.
The state table has no TTL, stream or secondary index and is retained on deletion
and replacement. Logs use the configured finite retention.

## Bind, initialize and preview

Take the exact stack ARN from deployment output. Bind verifies actual stack,
resources, code hash, template-owned configuration metadata, roles, table identity
and scheduler target before writing a new receipt:

```sh
node scripts/manager-installation.mjs bind --config /absolute/customer.json --manifest /absolute/new-package/manifest.json --stack EXACT_STACK_ARN --operator-profile customer-operator --output /absolute/installation.json --json
node scripts/manager-state.mjs init --config /absolute/customer.json --installation /absolute/installation.json --operator-profile customer-operator --json
node scripts/manager-state.mjs inspect --config /absolute/customer.json --installation /absolute/installation.json --operator-profile customer-operator --kind installation --json
```

Fresh initialization additionally requires the original CREATE_COMPLETE stack,
its original table creation event, no stack update, disabled schedule, preview
mode, no writes, concurrency one, and an empty exact active table. The State
adapter independently checks identity and emptiness and conditionally creates the
installation record. An empty replacement is never a fresh installation. Missing
or paginated required creation evidence is a setup failure, not an inference.
Keep the original receipt and generation; never reset or recreate state to resolve
an uncertain initialization. Inspect the same retained table instead.

Invoke the generated function name from stack outputs, using the operator profile:

```sh
aws lambda invoke --profile customer-operator --function-name GENERATED_FUNCTION_NAME --cli-binary-format raw-in-base64-out --payload '{"operation":"preview"}' /absolute/preview.json
```

Only that exact event is accepted. Runtime reads retained identities, acquires
Jira facts, composes the ordinary snapshot and invokes the actual ordinary policy.
Incomplete state never becomes empty input. Renames, moves, removed projects,
pending attempts and missing historical facts preserve holds. This release has no
historical worker-tuple producer. Results exclude private Jira bodies and secret
values. `writes: 0` and `execution_authorized: false` remain explicit even when a
proposal is selected. A proposal is no permission to execute it.

Use [state inspection](manager-state.md) for all four kinds, pagination and holds.
CLI exit zero confirms the reported operation and required receipt publication;
one means conflict/incomplete, partial work or failed receipt publication, and
two means invalid, unavailable or uncertain. Readable and JSON
output expose the same facts. Preserve partial results and inspect the same
installation; do not repeat an uncertain write to make output look complete.

## Deliberate scheduling and stop

To schedule preview, change only canonical `manager.controls.schedule_enabled`,
keep mode preview and writes false, then rebuild the same clean source with the
original generation using `--generation ORIGINAL_GENERATION`. Upload that exact
zip and save its generated asset receipt as JSON with `bucket`, `key`, `version`
and `zip_digest`. Source/dependency/package migration, identity/scope/secret
changes, table replacement and role changes are unsupported by this controller.
A separately authorized release owns source upgrades.

```sh
node scripts/package-manager.mjs --config /absolute/customer.json --revision SAME_FULL_COMMIT --generation ORIGINAL_GENERATION --output /absolute/control-package
node scripts/manager-installation.mjs configure --config /absolute/customer.json --installation /absolute/installation.json --manifest /absolute/control-package/manifest.json --asset /absolute/asset.json --operator-profile customer-operator --deployer-profile customer-deployer --output /absolute/new-installation-receipt.json --json
```

The controller verifies both identities before mutation, fences the existing
installation revision with writes and schedule disabled, disables actual
scheduling, sets concurrency zero and waits the previous timeout plus ten seconds.
It inspects a bounded CloudFormation change set, rejects replacement/deletion or
changes outside function configuration/code, schedule and retention, and applies
while quiesced. It observes code/configuration and original resources, restores
preview concurrency and desired schedule, verifies them and commits final applied
controls last. Successful output creates a new receipt retaining original anchors.
Use that receipt subsequently and preserve its predecessors. Bind/configure
exclusively reserve `--output` with private permissions before dispatch. An existing
path or unavailable parent refuses the command before configure changes anything.
Choose a new path; existing contents are never overwritten.

Storage can still fail after the operation. `receipt_publication: failed` with
`publication_code: RECEIPT_PUBLICATION_FAILED` exits one while preserving the actual
`configured` or `bound` status, phase, controls and **full receipt** in both output
forms. Save the emitted `receipt` object as JSON in a new private file (permissions
0600), preserve the complete result, and inspect with that receipt. Do not repeat
configure just to obtain a receipt. `output_cleanup` reports whether this command's
reservation was removed, replaced or left uncertain; treat any residual output as
untrusted/incomplete. A replacement path is left untouched.

Partial/uncertain configure output includes `recovery_receipt` with its explicit
original-authority role. It is not a successful new-package receipt and is never
published to `--output` as one. Preserve the result, original receipt and desired
build outputs. Inspect the original installation explicitly, then stop it:

```sh
node scripts/manager-state.mjs inspect --config /absolute/customer.json --installation /absolute/installation.json --operator-profile customer-operator --kind installation --recovery --json
node scripts/manager-installation.mjs stop --config /absolute/customer.json --installation /absolute/installation.json --operator-profile customer-operator --json
```

Keep the desired canonical file when recovering. Recovery checks the original
account/role, resources and installation generation, reads actual retained controls
and reports original, desired, observed and applied identities separately. Its
`package_verified: false` warning means that a confirmed read does not validate the
changed package or runtime safety. Normal inspection, health, init and configure
retain strict package checks and may refuse the original receipt after a partial
host update. Recovery inspection and stop do not reconstruct that authority or
provide apply, rollback, replay, initialization or state-clearing permission. If
normal binding remains unresolved, retain the evidence for the operator/owner's
release decision. No mutation is automatically retried.

For emergency stop, only the operator profile is needed:

```sh
node scripts/manager-installation.mjs stop --config /absolute/customer.json --installation /absolute/installation.json --operator-profile customer-operator --json
```

Stop first fences the same installation record, then disables actual scheduling
and sets concurrency zero. It waits for the greater of the original and valid observed timeout plus ten
seconds (within the AWS 900-second timeout bound);
it cannot revoke an already in-flight request. Retained pending/uncertain work
remains. Output distinguishes stopped from partial/unavailable and reports whether
canonical intent still asks for scheduling. In stop results, `observed_scope: before_stop`
labels the host snapshot captured before the stop; `stopped` confirms the later
disable/quiescence checks, while `partial` does not confirm completion. If disabling or bounded quiescence
cannot be confirmed, the result remains partial and identifies the failed phase;
an unknown timeout cannot become a stopped result. Stop never edits your file or
changes retained digest/package, generation, extensions or pending work. To converge
intent later, set desired controls disabled and use the supported control rebuild
only when a strictly verified current receipt/package is available. Recovery stop
alone does not establish that prerequisite. Do not initialize again or clear holds.

Apply mode is refused: this pinned package has no sender. Future apply support
must also require explicit writes, all three operator confirmations, current
reviewed inventory, supported non-global source-specific transition mappings and
compatible retained state. Operator assertions are not automated proofs of full
Jira visibility or absence of another installation. Check project permissions,
issue security, service-account access and sole admission ownership; Jira search
completeness cannot prove invisible issues do not exist. Reconfirm after scope,
credential or workflow changes. Customer grants can be broader than requested.

## Remove and recover

Stop and inspect first. Stack deletion retains the original operational table;
replacement also retains it. Do not delete retained state with unresolved attempts
or use a replacement to bypass it. Log, secret and artifact ownership and their
ongoing costs remain the customer's responsibility. Review the generated template
and account resources before separately authorized removal. There is no blanket
cleanup, automatic repair, migration or rollback engine. Keep writes off and use
inspection for incompatible configuration/state until the authorized release or
operator recovery decision is established.

For a source-only simulation, prepare Node 24 and run
`node scripts/test-aws-manager.mjs --all --output /absolute/new-evidence`.
It executes exactly H01/H02 with dummy providers and loopback HTTPS, records the
source/snapshot pins, outputs, commands and audits, then removes disposable fixtures.
Human acceptance and live IAM remain pending; no cloud resource is deployed.

## Complete disabled manager example

Merge this dummy section into the same canonical project configuration. Replace
the account, role and identity values once; do not copy generated resource IDs.

```json
{
  "manager": {
    "installation_id": "fixture",
    "domain_id": "fixture-domain",
    "aws": {
      "account_id": "123456789012",
      "region": "eu-west-1",
      "stack_name": "pigboard-fixture",
      "operator_role_arn": "arn:aws:iam::123456789012:role/pigboard-operator",
      "deployer_role_arn": "arn:aws:iam::123456789012:role/pigboard-deployer"
    },
    "controls": {
      "mode": "preview",
      "schedule_enabled": false,
      "writes_enabled": false,
      "maintenance": false
    },
    "schedule_minutes": 5,
    "invocation_timeout_seconds": 120,
    "log_retention_days": 14,
    "activation": {
      "full_visibility_confirmed": false,
      "sole_admitting_installation_confirmed": false,
      "inventory_reviewed": false
    },
    "transition_edges": []
  }
}
```

## Basic health and enablement evidence

Use [the health command](manager-health.md) with the same canonical configuration,
verified installation receipt and explicit operator profile. The package includes
portable health and AWS adapters through the real runtime import closure. Prepare
its exact root and runtime/AWS lockfile dependencies before delivery; health adds
matching pinned CloudWatch and CloudWatch Logs read clients. Do not fetch or repair
dependencies inside a delivery invocation.

The existing final conditional configure update owns two generated installation
extension scalars: `health_generation` and `health_enabled_at`. It writes them only
after host readiness when enabling from stopped, changing an enabled canonical
configuration, or explicitly establishing a missing epoch. Compare the original
applied record before the temporary disable fence: an unchanged enabled configure
preserves its epoch. Stop preserves historical epoch; explicit re-enable rotates it.
Unrelated extension fields, the 16-key/32-KiB limits and revision fencing remain.
An extension capacity failure refuses the final write; inspect partial lifecycle
state using the same receipt rather than replaying an uncertain update.

Scans, failures, retries and health reads never create or rotate an epoch. Disabled
initial installation can have none. Enabled installation without valid current
code/configuration/generation evidence is unknown, and old completion cannot grant
health. General source upgrades/removal remain deferred; configure does not expand
its existing supported-change boundary. Health settings may change with the same
bounded canonical configuration package update.

The operator health grants add only exact-log-group FilterLogEvents and regional
GetMetricStatistics. The latter requires Resource `*`; AWS IAM does not enforce
per-installation metric dimensions, so the reader fixes requests in code. Existing
operator lifecycle permissions remain. No new resource, alarm, SNS action, runtime
metric-write permission, second State store or activation is installed by health.
