# Ski Stack Repo Guidance

Ski Stack is a queue-driven agent work system. Keep the default surface flat:
skills and agent role cards are reusable assets; the queue runtime is optional.

Do not reintroduce a mandatory chief-of-staff hierarchy, local-only `.scuba`
control plane, or default wide subagent swarm. If a workflow needs orchestration,
make it an explicit worker or adapter feature.

Use the adapter boundary for project-management systems. GitHub Projects is the
first adapter, not the core model.

For code changes, keep the runtime dependency-light. Prefer standard Node.js
APIs unless a dependency removes real complexity.

