# Human request example and local preparation

Load [request-rework](../SKILL.md) and same-release
[human-writing](../../human-writing/SKILL.md). A person uses their existing prepared
assistant; there is no request-rework executable, fourth automation or new identity.

> For EX-1, F01: searching the exact saved-filter name returns no result. Expected:
> the matching saved filter under AC-01. F02: the no-match message is unclear.
> Expected: wording a new report user understands under HQA-01. The supplied evidence
> shows each observation on the current PR revision. I authorize recording these
> in-scope findings and queueing EX-1 for rework on its existing open PR.

Trusted setup separately provides the exact Jira origin/project/ticket IDs/full
stream, canonical config, native Story/Bug IDs, configured human actor, prepared
Jira/PR/evidence capabilities and allowed destinations, same-release validator and
private durable output. Read the actual linked evidence, requirements and server
metadata. Config validity alone proves neither permission nor provider access.
A discussion such as “Should this behavior change?” is not a queue request.
Without explicit authorization return NEEDS_INPUT with retained findings and no
write. With authorization do not ask again as a routine step.

A valid request produces one verified canonical comment and one verified direct
Human Review -> Rework Queued transition. The readable result can say:

> Request recorded at the verified comment link; EX-1 is confirmed Rework Queued.
> F01 and F02 are preserved against its current PR and QA completion. Active B
> continues. The manager later admits EX-1 under its normal gates when available.

Do not substitute a guessed link for a verified receipt. If append succeeds but
transition is uncertain, say “Request recorded; queueing unconfirmed,” preserve the
body/receipt and stop without replay. If facts drift after append, retain publication
and explain the exact mismatch without another request or transition. A queued ticket
is inspection-only: retain old findings and identify new ones as unrecorded. Preparing
additional/conflicting queued findings requires a separately prepared authorized
request; this skill does not silently publish them. New scope returns to grooming,
closed/merged PR or stale QA requires human resolution, and missing integrations
retains the result privately. No Blocked fallback, Bug, new PR, pointer update,
manual card drag or automatic worker is part of this route.

## Canonical record mechanics

Use the existing envelope and current QA reference. Every finding retains its
stable ID, plain summary and actual authorized evidence reference. `qa_report` and
`resume_authorization` are explicit null. The operation ID is the admission's,
not a new manager operation. Expected/observed detail and authorization belong in
readable evidence/result, not added schema fields. The fixed exporter below creates
a complete `record.yaml` with two findings and real synthetic evidence bodies; its
UUID is an **example only**. An exercised assistant generates its own UUID/body.

The source and installed layouts differ. Use the column matching your copy;
installation preserves the same guide bytes. Links in the other column do not
apply to that layout.

| Help | Source checkout | Installed skills |
| --- | --- | --- |
| Canonical handoff | [Source handoff](../../../docs/handoffs.md) | [Installed handoff](../../work-validator/docs/handoffs.md) |

Source helpers are `scripts/check-config.mjs`, `scripts/validate-work.mjs`,
`scripts/validate-handoff.mjs` and `scripts/prepare-handoff.mjs`. Installed helpers
are at `<receipt.skills>/work-validator/scripts/`. Read all installed references
through the receipt's versioned directory, not a mutable stable symlink. Never
prepare/fetch/repair dependencies during a delivery invocation.

## PREP-01: fixed synthetic packets

These are disposable **synthetic local** native/raw receipt/evidence/request/response
cards, not live Jira data or a skill execution. The exporter only writes static
files; it cannot execute the skill, choose a run verdict or mutate a simulated
provider. Node 20+ and exact locked source dependencies must be prepared beforehand.
From a clean checkout of the tested candidate, run:

```sh
PGB79_SOURCE="$PWD"
PGB79_REVISION=$(git rev-parse HEAD)
PGB79_RUN=$(mktemp -d /private/tmp/pgb79-qa.XXXXXX)
chmod 700 "$PGB79_RUN"
mkdir "$PGB79_RUN/app" "$PGB79_RUN/evidence"
node "$PGB79_SOURCE/test/fixtures/human-rework.mjs" prepare "$PGB79_RUN/H01" H01
node "$PGB79_SOURCE/scripts/check-config.mjs" --input "$PGB79_RUN/H01/config.yaml" --label stream-1 --json
node "$PGB79_SOURCE/scripts/validate-work.mjs" --mode start --input "$PGB79_RUN/H01/work.yaml" --context "$PGB79_RUN/H01/facts.yaml" --json
node "$PGB79_SOURCE/scripts/validate-handoff.mjs" --mode chain --input "$PGB79_RUN/H01/preflight-chain.json" --json
node "$PGB79_SOURCE/scripts/validate-handoff.mjs" --mode record --input "$PGB79_RUN/H01/record.yaml" --format yaml --json
node "$PGB79_SOURCE/scripts/prepare-handoff.mjs" --input "$PGB79_RUN/H01/record.yaml" --summary "$PGB79_RUN/H01/summary.txt" --format html
node "$PGB79_SOURCE/scripts/validate-handoff.mjs" --mode chain --input "$PGB79_RUN/H01/published-chain.json" --json
```

Each `prepare` destination must be new. Root files include the raw work/start facts,
config, preflight chain, canonical record/summary example, static published-chain
example, audit sentinels, metadata binding to source commit and separate `oracle.json`.
The `assistant/` folder contains only request, initial trusted facts/config/native
observations, mock evidence bodies and B's active snapshot. The `tester-cards/`
folder contains separate raw responses for before-append, append, exact readback,
after-publication freshness, transition and native-destination reads. There are no
credentials, real HTTPS artifacts, prewritten tool trace or claimed execution.

H01 has A `1000`/EX-1 in native Human Review `5`, B `1001`/EX-2 active `2` in the same
site/project `100`/full `stream-1`, open PR `10` at the fixed full `111…111` revision
on `main`, actor `human` and complete current QA chain. Returned transition ID `61`
leads from status `5` to `6`; it is not the status ID. A's pointer and B snapshot are
immutable audit sentinels. F01/F02 have actual mock evidence bodies and matching
SHA256 references; `.invalid` URLs are never published as live artifacts.

## Install the actual candidate before exercising instructions

Run the existing installer with **default locked dependency preparation**. Do not
inject fakeInstall or fabricate a successful receipt. Local Git source support is
for isolated candidate QA; a customer installation requires a reviewed published pin.

```sh
node "$PGB79_SOURCE/scripts/install-cursor-skills.mjs" --source "$PGB79_SOURCE" --ref "$PGB79_REVISION" --app "$PGB79_RUN/app" --root "$PGB79_RUN/installed" > "$PGB79_RUN/install-receipt.json"
PGB79_SKILLS=$(node -e 'const fs=require("node:fs");process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1])).skills)' "$PGB79_RUN/install-receipt.json")
cd "$PGB79_RUN/app"
node "$PGB79_SKILLS/work-validator/scripts/check-config.mjs" --input "$PGB79_RUN/H01/config.yaml" --label stream-1 --json
node "$PGB79_SKILLS/work-validator/scripts/validate-work.mjs" --mode start --input "$PGB79_RUN/H01/work.yaml" --context "$PGB79_RUN/H01/facts.yaml" --json
node "$PGB79_SKILLS/work-validator/scripts/validate-handoff.mjs" --mode chain --input "$PGB79_RUN/H01/preflight-chain.json" --json
node "$PGB79_SKILLS/work-validator/scripts/validate-handoff.mjs" --mode record --input "$PGB79_RUN/H01/record.yaml" --format yaml --json
node "$PGB79_SKILLS/work-validator/scripts/prepare-handoff.mjs" --input "$PGB79_RUN/H01/record.yaml" --summary "$PGB79_RUN/H01/summary.txt" --format html
node "$PGB79_SKILLS/work-validator/scripts/validate-handoff.mjs" --mode chain --input "$PGB79_RUN/H01/published-chain.json" --json
```

Inspect receipt commit and manifest hashes. Compare the installed skill entrypoints
with the pinned prepared manifest's `bundle.skills`; require an exact match.
Verify dependencies and every existing smoke check. Compare source and installed outputs/extracted
records exactly; inspect the complete installed new folder and human-writing.
Stop and retain failure evidence if setup fails; no substitute dependencies or
invented success. Installation verifies packaging, not provider access or instruction
behavior. The formatter only checks/encodes immutable text, not authority or freshness.

## Independent instruction episodes

Prepare every other fixed packet with the **same exporter command**, replacing
`H01` in both the destination and final argument with the listed ID. These are all
NOT RUN until actual independent exercises and transcripts exist.

| Case ID | Fixed difference | Required observed result |
| --- | --- | --- |
| H01 | Authorized two findings, current QA, open PR, B active | One append/readback, recheck, one A transition, verified queued; both findings, pointer/B preserved, no worker/admission call. |
| H02-discussion | Human asks a question only | DISCUSSION; zero writes. |
| H02-scope | Request for excluded cross-tenant sharing | Explain grooming, retain supplied request; zero writes/queue/Bug. |
| H02-closed | PR closed | INELIGIBLE; zero writes/new PR/reopening. Merged is also ineligible. |
| H02-source | Current source differs from QA | Stale evidence explanation; zero writes/rebinding/review or QA rerun. |
| H02-missing | Exact QA comment missing from complete pages | Missing evidence, zero writes; no newest-comment substitution. |
| H02-queued | A already queued with original two findings | ALREADY_QUEUED, inspect existing repair target; zero append/transition. Additional supplied findings remain unrecorded. |
| H02-append-unknown | Append response lost | One attempted append, no replay/new UUID/transition; UNCERTAIN, preserve exact candidate. |
| H02-transition-unknown | Verified append, transition response lost | One append/one attempted transition; queueing unconfirmed, no retry/alternate action. |
| H02-drift-after-publish | Source changes after verified append | Preserve published request, zero transition/replacement/rollback; precise mismatch. |
| H02-authorization | Findings without record-and-queue permission | NEEDS_INPUT, preserve draft; zero writes. H01 needs no repeated confirmation. |
| H02-readback | Exact returned comment has wrong actor | One append, no transition/replacement; retain candidate/receipt and explain verification failure. |

An independent tester loads the **installed** SKILL/reference and supplies only the
neutral request and initial `assistant/` inputs, with trusted capability/durable-output
locations. Do not supply `oracle.json`, example record, static published chain,
future response cards or required verdicts in the assistant prompt. It must produce
its own record UUID/body and request actual bounded operations. Before the episode,
check packet coherence: raw/native and normalized facts, actors, PR/revision, exact
references/digests, evidence bodies, direct source/destination and audit sentinels.
The intentional invalid cases change one relevant fact only.

For each requested simulated provider operation retain the assistant's actual call
and arguments, then give only its corresponding frozen response. For readback the
tester binds `BIND_ACTUAL_ASSISTANT_PUBLICATION_BODY` to the actual produced bytes,
and the complete updated readback/after-publication pages and target to that UUID/digest, leaving server metadata
and other facts unchanged. This is mock provider observation, not a product runner.
Validate that actual updated chain with the new repair request target and retain
actual CLI output. Do not feed the sample UUID or oracle decision into the run.
Unknown-response cards establish neither success nor failure of the lost write;
stop rather than using later cards to manufacture certainty. The drift card changes
only the current source after publication. The wrong-actor card changes actual
server authorship, not the assistant's candidate. Retain all observed calls,
responses, generated body/result, CLI evidence and independently assessed verdict.

Keep per-case transcripts/tool audits under `$PGB79_RUN/evidence/<CASE_ID>/`, binding
tested and installed commits, exact invocation, requirement coverage, calls/effects,
all finding IDs, pointer/B comparison and second sweep for missed effects. Judge
against `oracle.json` **after** the episode; never mark its NOT RUN label as an
observed pass. Scripts cannot assert their own expected sequence as proof of agent
behavior. Real local canonical checks, independent simulated instruction behavior,
live Jira acceptance, current CI/bot, merge and release are separate claims.

PGB-79 has zero AI ticket cases. Developer and human QA reviewer still own
R1-09-H01/H02; supplemental agent exercises do not complete their human acceptance.
Retain evidence, then remove only owned disposable fixture/install/build outputs.
Do not change live records/resources. No manager deployment or activation occurs.
