# PR #13 Fly hosting feedback: independent product review

23 September 2026. **CLEAN** for the five uncommitted documentation files below, on base commit `346bf19aadf2f32f6822019a343c7e412a32b678`. This is an independent product, experience and documentation design review of the owner's Fly.io choice and the five PR #13 feedback concerns. It is not an implementation, live-service, or release verdict.

| Reviewed file | SHA-256 |
| --- | --- |
| `docs/designs/hosted-deployment-options.md` | `df6e77cd1fa193bd58871861b8c5860c4f320efe91ec599e666fda6cfc92385a` |
| `docs/delivery-plan.md` | `28dff3da3023bd1b71b7952d6c79afd92a2af06b8b7dc835b2bc9e9b247a26a0` |
| `docs/tasks/architecture-decisions.md` | `dc5d9b955473261971883e18ba6f61d45cbe3efbb915137149a5c0cb288753d6` |
| `docs/stories/development-roadmap.md` | `e9dd3e6a7efecfceb4b874370520bd219a8278228934efd4b1360ae1bc6bfcf0` |
| `docs/reviews/hosted-deployment-options.md` | `fbf587a65fb5925e0332f9b955ede182fec7353fbad68b28e08b8a720b188797` |

## Coverage and findings

I examined 5/5 changed files, all 5/5 supplied PR feedback concerns, D3's 4/4 acceptance criteria, 5/5 technical criteria and 3/3 testing obligations, A1's 7/7 acceptance criteria, 3/3 technical criteria and 3/3 testing obligations, and 3/3 new Story previews (S29–S31), including each preview's problem, acceptance, technical and testing sections. I checked these against `AGENTS.md`, `docs/product.md`, `docs/architecture-plan.md`, and `docs/designs/hosted-work-contract.md`. The second sweep searched the five changed files for recovery entry, marker, authority, credential, retention, unknown window, role matrix, provisional status and dependencies; it found no additional in-scope gap. `git diff --check` passed.

The lost-write window now includes provider and Jira effects absent from the restored database. S29 places an external quarantine marker before a restored cluster can be attached, and requires all Machines, including an overlapping deployment, to reject effects while it is active. S30 distinguishes exact known effects from an unknown or unbounded window; absent enumeration evidence never means completion. S31 reconstructs membership, role, credential and connection scope from outside the restored database before ordinary access or commands resume. A revoked provider credential blocks provider reads as well as sends. The command matrix covers viewer, operator, connection administrator, scoped agent and separately authorized recovery principal; the entry command is allowed before recovery mode, whereas inspection, evidence and reopening require the active marker. This resolves my earlier recovery-authority and entry-bootstrap findings.

The Fly account choice is reflected without inventing an organization, app, paid plan, region, deployment authority or budget. The historical Render/AWS CLEAN verdict is explicitly confined to its old hashes. Retention is class-specific and still requires owner approval before live capture. S29–S31 sit before A1, while S25 remains the later multi-team extension. The new Stories remain **Provisional — not ready for delivery**; D3 must resolve the external identity and grant mechanism, and grooming must establish a credible file inventory and less-than-two-day estimate for each. The precise teammate authentication, membership administration and Fly recovery command confinement are appropriately open D3 decisions, not claims of shipped behavior.

## Independent seven-principle assessment

| Principle | Assessment |
| --- | --- |
| Intuitive | Jira stays the human work surface; a teammate sees attempt status and next action. Recovery has distinct enter, reconcile and reopen steps, so an operator need not infer them from database internals. The operating guide remains an implementation obligation. |
| Discoverable | Readiness distinguishes missing setup from service liveness. Human status and structured agent responses expose blocked and uncertain states; recovery shows known effects and an explicit unknown window. Exact commands and help await D3 and Story planning. |
| Delightful experience | One shared service removes repeated laptop setup. Recovery deliberately requires a named principal and evidence because silent resumption could duplicate paid or published work; that friction is confined to an exceptional operation. |
| Token saver | Bounded status and evidence digests put relevant state first while identifying omitted detail. Neither the human nor agent path hides an unknown effect or failed credential read to shorten output. |
| Secure | Separate per-person, scoped agent, credential-admin and recovery authority is specified with allowed and denied commands. The entry grant is outside restored roles; stale membership and credential data cannot authorize recovery or normal access. Fly token command confinement remains a D3 verification gate. |
| Agents are equal | Scoped agents have explicit noninteractive inspect/launch/reconcile grants and structured blocked states. Recovery is reserved for the separately authorized principal; an agent receives an actionable denied state rather than needing a browser workaround for its supported operations. |
| Dependable | External effects and authority changes in the lost-write window must be reconciled before cutover. Missing evidence, a revoked provider credential or an unbounded window leaves the connection quarantined. A1 demands both a safe cutover and a fail-closed drill on the selected Fly store. |

No unresolved in-scope finding remains for this exact design artifact. CLEAN does not complete D3, make S29–S31 ready, authorize Fly provisioning, or satisfy the technical review gate.
