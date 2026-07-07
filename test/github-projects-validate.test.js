import assert from "node:assert/strict";
import test from "node:test";

import { formatValidationReport, githubProjectsSchema, validateGitHubProjectSchema } from "../src/index.js";

test("validateGitHubProjectSchema accepts the expected field set", () => {
  const result = validateGitHubProjectSchema(projectModelFromSchema());

  assert.equal(result.ok, true);
  assert.deepEqual(result.missingFields, []);
  assert.deepEqual(result.typeMismatches, []);
  assert.deepEqual(result.missingOptions, []);
});

test("validateGitHubProjectSchema reports missing fields and options", () => {
  const projectModel = projectModelFromSchema();
  projectModel.fields.delete("Lease Owner");
  projectModel.fields.get("Status").options.delete("QA");

  const result = validateGitHubProjectSchema(projectModel);

  assert.equal(result.ok, false);
  assert.deepEqual(result.missingFields, ["Lease Owner"]);
  assert.deepEqual(result.missingOptions, [{ field: "Status", option: "QA" }]);
  assert.match(formatValidationReport(result), /Missing fields/);
  assert.match(formatValidationReport(result), /Status: QA/);
});

test("validateGitHubProjectSchema reports type mismatches", () => {
  const projectModel = projectModelFromSchema();
  projectModel.fields.get("Attempts").dataType = "TEXT";

  const result = validateGitHubProjectSchema(projectModel);

  assert.equal(result.ok, false);
  assert.deepEqual(result.typeMismatches, [
    { field: "Attempts", expected: "NUMBER", actual: "TEXT" }
  ]);
});

function projectModelFromSchema() {
  const fields = new Map();

  for (const field of githubProjectsSchema.fields) {
    fields.set(field.name, {
      id: `field_${field.name}`,
      name: field.name,
      dataType: typeName(field.type),
      options: new Map((field.options ?? []).map((option) => [option, `option_${option}`]))
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

