import { githubProjectsSchema } from "./schema.js";
import { validateGitHubProjectSchema } from "./validate.js";
import {
  CREATE_PROJECT_FIELD_MUTATION,
  UPDATE_PROJECT_FIELD_MUTATION
} from "../../adapters/github-projects/graphql.js";

const TYPE_MAP = Object.freeze({
  single_select: "SINGLE_SELECT",
  text: "TEXT",
  number: "NUMBER",
  date: "DATE"
});

const OPTION_COLORS = ["GRAY", "BLUE", "GREEN", "YELLOW", "ORANGE", "RED", "PINK", "PURPLE"];

export function planGitHubProjectProvisioning(projectModel, schema = githubProjectsSchema) {
  const validation = validateGitHubProjectSchema(projectModel, schema);
  const createFields = [];
  const updateFields = [];

  for (const field of schema.fields) {
    const actual = projectModel.fields.get(field.name);
    if (!actual) {
      createFields.push(field);
      continue;
    }

    if (field.type === "single_select") {
      const missingOptions = (field.options ?? []).filter((option) => !actual.options.has(option));
      if (missingOptions.length) {
        updateFields.push({
          field,
          actual,
          missingOptions
        });
      }
    }
  }

  return {
    ok: validation.ok,
    validation,
    createFields,
    updateFields,
    needsChanges: createFields.length > 0 || updateFields.length > 0
  };
}

export async function provisionGitHubProject({ adapter, schema = githubProjectsSchema, apply = false }) {
  const { projectModel } = await adapter.loadProjectItems();
  const plan = planGitHubProjectProvisioning(projectModel, schema);
  if (!apply || !plan.needsChanges) return { applied: false, plan };

  for (const field of plan.createFields) {
    await adapter.graphql(CREATE_PROJECT_FIELD_MUTATION, {
      input: {
        projectId: projectModel.id,
        dataType: TYPE_MAP[field.type],
        name: field.name,
        ...(field.type === "single_select"
          ? { singleSelectOptions: buildNewOptions(field.options ?? []) }
          : {})
      }
    });
  }

  for (const update of plan.updateFields) {
    await adapter.graphql(UPDATE_PROJECT_FIELD_MUTATION, {
      input: {
        fieldId: update.actual.id,
        singleSelectOptions: buildUpdatedOptions(update.actual, update.missingOptions)
      }
    });
  }

  return { applied: true, plan };
}

export function formatProvisioningPlan(plan) {
  if (!plan.needsChanges) return "GitHub Project already has the Ski Stack schema.";

  const lines = ["GitHub Project needs Ski Stack schema changes."];

  if (plan.createFields.length) {
    lines.push("", "Fields to create:");
    for (const field of plan.createFields) {
      lines.push(`- ${field.name} (${field.type})`);
    }
  }

  if (plan.updateFields.length) {
    lines.push("", "Single-select options to add:");
    for (const update of plan.updateFields) {
      lines.push(`- ${update.field.name}: ${update.missingOptions.join(", ")}`);
    }
  }

  return lines.join("\n");
}

function buildNewOptions(optionNames) {
  return optionNames.map((name, index) => ({
    name,
    color: OPTION_COLORS[index % OPTION_COLORS.length],
    description: ""
  }));
}

function buildUpdatedOptions(actualField, missingOptions) {
  const existing = (actualField.optionsList ?? []).map((option, index) => ({
    id: option.id,
    name: option.name,
    color: option.color ?? OPTION_COLORS[index % OPTION_COLORS.length],
    description: option.description ?? ""
  }));

  return [
    ...existing,
    ...missingOptions.map((name, index) => ({
      name,
      color: OPTION_COLORS[(existing.length + index) % OPTION_COLORS.length],
      description: ""
    }))
  ];
}

