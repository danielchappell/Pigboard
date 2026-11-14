# After the first Pig Boss release

These are tracked follow-ons, not extra release-one acceptance requirements. Jira
owns their priority and progress. Discovery does not authorize implementation.
Use the current customer-owned design; older platform Epics are not a substitute.

| Order / opportunity | Jira | Intended next outcome |
| --- | --- | --- |
| First capacity follow-on | [PGB-94](https://scubapig.atlassian.net/browse/PGB-94) | Measure 1/10/25/50-project workloads and plan supported 50-project capacity; optimize before introducing project partitions. |
| Installation ergonomics | [PGB-95](https://scubapig.atlassian.net/browse/PGB-95) | Discover and design automatic Jira and Cursor provisioning from one configuration, including unavoidable authorization steps. |
| Worker visibility | [PGB-70](https://scubapig.atlassian.net/browse/PGB-70) | Identify active/finished/unknown Cursor work without assuming Jira stage is a heartbeat. Basic Pig Boss health already belongs in release one. |
| Reliable dispatch | [PGB-63](https://scubapig.atlassian.net/browse/PGB-63) → [PGB-64](https://scubapig.atlassian.net/browse/PGB-64) → [PGB-65](https://scubapig.atlassian.net/browse/PGB-65) | Verify provider launch/cancel behavior, review a design, then groom launch deduplication and any approved recovery. |
| Human unblock | [PGB-62](https://scubapig.atlassian.net/browse/PGB-62) | Define visible blocked stage and the human-authorized resume producer under current project-scoped contracts. |
| Blocked-work alerts | [PGB-98](https://scubapig.atlassian.net/browse/PGB-98) | Customer-owned Jira-to-Teams routing; separate from AWS operating alarms. |
| PR environment provisioning | [PGB-60](https://scubapig.atlassian.net/browse/PGB-60) | Pipeline produces trusted environment/revision readiness on the PR. QA consumes it. |
| Additional QA support | [PGB-96](https://scubapig.atlassian.net/browse/PGB-96) | Select concrete unsupported cases and groom the next prescribed helper; keep human-only plans valid. |
| Other customer clouds | [PGB-97](https://scubapig.atlassian.net/browse/PGB-97) | Choose a real customer need and design another wrapper using the same portable policy/state guarantees. |

The rows after the capacity target are a proposed planning order, not a committed
release sequence. PGB-60 is separate pipeline work but a prepared environment is
still needed for environment-dependent delivery acceptance. Deferred provisioning
does not waive that prerequisite.

A richer dashboard, transcript inspection, automatic recovery and cancellation are
options to assess in PGB-70/PGB-64, not promised features. SaaS hosting, automatic PR
retarget/merge, automatic bug creation and old runtime reuse are excluded product
choices, not missing implementation tickets. State compaction/retirement is a
capacity consideration in PGB-94; it cannot delete unresolved attempts or retained
occupancy. Version one does not need these additions to ship its agreed scope.
