import assert from "node:assert/strict";
import test from "node:test";

import {
  formatProvisioningPlan,
  githubProjectsSchema,
  planGitHubProjectProvisioning
} from "../src/index.js";

test("planGitHubProjectProvisioning plans missing fields", () => {
  const projectModel = emptyProjectModel();

  const plan = planGitHubProjectProvisioning(projectModel);

  assert.equal(plan.needsChanges, true);
  assert.deepEqual(
    plan.createFields.map((field) => field.name),
    githubProjectsSchema.fields.map((field) => field.name)
  );
  assert.match(formatProvisioningPlan(plan), /Fields to create/);
});

test("planGitHubProjectProvisioning adds missing single-select options only", () => {
  const projectModel = projectModelWithRequiredFields();
  projectModel.fields.get("Status").options.delete("QA");

  const plan = planGitHubProjectProvisioning(projectModel);

  assert.equal(plan.needsChanges, true);
  assert.equal(plan.createFields.length, 0);
  assert.deepEqual(plan.updateFields, [
    {
      field: githubProjectsSchema.fields[0],
      actual: projectModel.fields.get("Status"),
      missingOptions: ["QA"]
    }
  ]);
});

function emptyProjectModel() {
  return { id: "PROJECT_1", fields: new Map() };
}

function projectModelWithRequiredFields() {
  const fields = new Map();
  for (const field of githubProjectsSchema.fields) {
    fields.set(field.name, {
      id: `field_${field.name}`,
      name: field.name,
      dataType: typeName(field.type),
      options: new Map((field.options ?? []).map((option) => [option, `option_${option}`])),
      optionsList: (field.options ?? []).map((option) => ({
        id: `option_${option}`,
        name: option,
        color: "GRAY",
        description: ""
      }))
    });
  }
  return { id: "PROJECT_1", fields };
}

function typeName(type) {
  return {
    single_select: "SINGLE_SELECT",
    text: "TEXT",
    number: "NUMBER",
    date: "DATE"
  }[type];
}

