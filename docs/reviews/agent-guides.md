# Contributor and consumer documentation review

14 November 2026. Documentation-only cleanup against verified Pigboard main
`fd725b7b1eac6ead32fe61fffe811bcc3dfecfaf` (PR #71). Jira PGB remains the authority;
PGB-58 owns current delivery acceptance and PGB-66/67/68/69 own the manager design
and complete implementation Story-set review. No manager behavior, skills, source
schemas, discovery probes, service settings or activation is changed by this work.

## Scope and source reconciliation

The active GitHub source already contains the skills/scripts product. The stale
local checkout was on a previous development branch and must not be used as the
product specification. Current root documentation now routes agents to contribute,
install or consume a capability. Contributor gates remain in CONTRIBUTING.md;
consumer instructions retain target-repository and selected-skill authority.

The reviewed surface is seven files: AGENTS.md, README.md, CONTRIBUTING.md,
ARCHITECTURE.md, docs/install.md, docs/using-pigboard.md and this record.
The root package/distribution manifest, installer interfaces, current entrypoints,
workflow, setup matrix and manager discovery/contract documents are supporting
source evidence. Current schemas, examples, target diagrams and bounded AWS probes
are retained unchanged. Structured YAML authoring migration remains coordinated
product work; the installed Story skill and human-writing dependency are preserved.

The GitHub repository name, description and default branch were read live. They
already identify Pigboard, shared Jira delivery skills/deterministic Cursor setup
and main. The complete tracked tree was searched for obsolete product names and
architecture promotion. No obsolete runtime is present in current main. Dated
setup records, explicitly superseded recent discovery proposals and required legal
notices remain evidence; they do not override current guidance.

Local project-folder and memory reconciliation are separate operational changes.
This commit does not claim that a remote merge switches a local checkout or updates
Codex project memory. The coordinating planning thread owns memory correction and
ongoing product-spec consolidation. No Git history or archive is deleted.

## Plan review

Two distinct fresh Sol reviewers independently reviewed the documentation plan,
completed second sweeps and returned CLEAN. Product coverage: 7/7 work areas and
8/8 primary documents. Technical coverage: 7/7 work packages, 8/8 documentation
surfaces and 10/10 affected contracts. Each assessed all seven principles and the
unified-configuration requirement. Final committed-artifact review is a separate
gate; its exact head and reports belong in the PR evidence.

## Verification

- Baseline installation tests: 24 passed, zero failed. Final checks are recorded
  with the reviewed commit in PR evidence.
- Commands, required flags, default/alternate paths and receipt fields were checked
  against preparation, stable-installation and Cursor bootstrap code.
- Skill names and count were checked against the eleven-entry manifest; complete
  sibling folders and helper dependency contracts are preserved.
- Local Markdown destinations and retained README setup anchor are checked before
  publication. No runtime tests were added for this documentation-only change.
- No fresh service access, live provider write, deployment or delivery acceptance
  is claimed by these checks.

## Author assessment

| Principle | Concrete assessment |
| --- | --- |
| Intuitive | AGENTS and README route contribute/install/use separately; pilot settings are identified as installation-specific. |
| Discoverable | Eleven skills have direct links, required context and entrypoint/helper distinctions; installed and target contracts have separate sources. |
| Delightful experience | One setup guide covers acquisition, verification, failure, refresh and removal without requiring the original chat. |
| Token saver | The short AGENTS router avoids loading contributor policy or every skill for an assigned consumer job. |
| Secure | Trusted setup owns destinations/access; ticket text cannot expand authority. Secrets remain external and setup does not grant publication or activation. |
| Agents are equal | Noninteractive commands and JSON receipt meanings support agents, while the same guides explain human ownership and recovery. |
| Dependable | Source checks, current versus planned labels, partial-acceptance limits and explicit remaining gates prevent a successful Build from being called delivery success. |

Unified configuration: the approved single customer intent/configuration and
separate secret references/generated outputs are documented as target design.
No installer, generic adapter framework or runtime feature is invented by prose.

## Codex review correction

The first published revision's Codex review found that an active run using the
mutable stable skill link could read a newer release after refresh. The install
guide now requires those runs to finish before a shared-root refresh, or to bind
explicitly to the receipt's versioned `skills` path. Keeping an old directory alone
is not isolation. Cursor's separate snapshots remain a distinct case. The corrected
commit requires renewed independent assessment and current-head Codex review.

The entry guides also route readers to the product-specification consolidation
(PR #73) and `docs/product/README.md` when present. Its proposed requirements and
coverage remain distinct from installed behavior; cleanup does not define the
open human repair-entry interface or modify the coordinating product worktree.
