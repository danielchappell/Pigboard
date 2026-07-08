import { isReadyForWorkerType } from "../../core/routing.js";

export const FieldName = Object.freeze({
  STATUS: "Status",
  WORKER_TYPE: "Worker Type",
  PRIORITY: "Priority",
  LEASE_OWNER: "Lease Owner",
  LEASE_EXPIRES: "Lease Expires",
  ATTEMPTS: "Attempts",
  LAST_WORKER_RUN: "Last Worker Run",
  PR: "PR",
  EPIC: "Epic"
});

export function buildProjectModel(project) {
  if (!project?.id) throw new Error("project.id is required");

  const fields = new Map();
  for (const field of project.fields?.nodes ?? []) {
    if (!field?.name) continue;
    fields.set(field.name, {
      id: field.id,
      name: field.name,
      dataType: field.dataType,
      options: new Map((field.options ?? []).map((option) => [option.name, option.id])),
      optionsList: field.options ?? []
    });
  }

  return {
    id: project.id,
    fields
  };
}

export function fieldId(projectModel, fieldName) {
  const field = projectModel.fields.get(fieldName);
  if (!field?.id) throw new Error(`Missing GitHub Projects field: ${fieldName}`);
  return field.id;
}

export function singleSelectOptionId(projectModel, fieldName, optionName) {
  const field = projectModel.fields.get(fieldName);
  if (!field) throw new Error(`Missing GitHub Projects field: ${fieldName}`);
  const optionId = field.options.get(optionName);
  if (!optionId) throw new Error(`Missing option "${optionName}" on field "${fieldName}"`);
  return optionId;
}

export function normalizeProjectItem(node) {
  const fields = {};
  const optionIds = {};

  for (const value of node.fieldValues?.nodes ?? []) {
    const name = value.field?.name;
    if (!name) continue;

    switch (value.__typename) {
      case "ProjectV2ItemFieldSingleSelectValue":
        fields[name] = value.name ?? null;
        optionIds[name] = value.optionId ?? null;
        break;
      case "ProjectV2ItemFieldTextValue":
        fields[name] = value.text ?? "";
        break;
      case "ProjectV2ItemFieldDateValue":
        fields[name] = value.date ?? "";
        break;
      case "ProjectV2ItemFieldNumberValue":
        fields[name] = value.number ?? null;
        break;
      default:
        break;
    }
  }

  const content = node.content ?? {};

  return {
    id: node.id,
    projectItemId: node.id,
    contentId: content.id,
    contentType: content.__typename,
    title: content.title ?? "(untitled project item)",
    body: content.body ?? "",
    url: content.url,
    number: content.number,
    repository: content.repository?.nameWithOwner,
    prUrl: fields[FieldName.PR],
    pullRequestNumber: parseGitHubPullRequestNumber(fields[FieldName.PR]),
    baseRef: content.baseRefName,
    baseSha: content.baseRefOid,
    headRef: content.headRefName,
    headSha: content.headRefOid,
    status: fields[FieldName.STATUS],
    workerType: fields[FieldName.WORKER_TYPE],
    priority: fields[FieldName.PRIORITY],
    leaseOwner: fields[FieldName.LEASE_OWNER],
    leaseExpiresAt: fields[FieldName.LEASE_EXPIRES],
    attempts: fields[FieldName.ATTEMPTS],
    lastWorkerRun: fields[FieldName.LAST_WORKER_RUN],
    fields,
    optionIds,
    raw: node
  };
}

function parseGitHubPullRequestNumber(url) {
  const value = String(url ?? "").trim();
  if (/^\d+$/.test(value)) return Number(value);
  const match = value.match(/\/pull\/(\d+)(?:\b|$)/);
  return match ? Number(match[1]) : undefined;
}

export function isReadyForWorker(item, workerType, now = new Date()) {
  return isReadyForWorkerType(item, workerType, now);
}

export function priorityRank(priority = "P3") {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[priority] ?? 99;
}
