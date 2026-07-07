import { githubProjectsSchema } from "./schema.js";

const TYPE_MAP = Object.freeze({
  single_select: "SINGLE_SELECT",
  text: "TEXT",
  number: "NUMBER",
  date: "DATE"
});

export function validateGitHubProjectSchema(projectModel, schema = githubProjectsSchema) {
  const missingFields = [];
  const typeMismatches = [];
  const missingOptions = [];

  for (const expected of schema.fields) {
    const actual = projectModel.fields.get(expected.name);
    if (!actual) {
      missingFields.push(expected.name);
      continue;
    }

    const expectedType = TYPE_MAP[expected.type] ?? expected.type;
    if (actual.dataType && expectedType && actual.dataType !== expectedType) {
      typeMismatches.push({
        field: expected.name,
        expected: expectedType,
        actual: actual.dataType
      });
    }

    if (expected.type === "single_select") {
      for (const option of expected.options ?? []) {
        if (!actual.options.has(option)) {
          missingOptions.push({ field: expected.name, option });
        }
      }
    }
  }

  return {
    ok: missingFields.length === 0 && typeMismatches.length === 0 && missingOptions.length === 0,
    missingFields,
    typeMismatches,
    missingOptions
  };
}

export function formatValidationReport(result) {
  if (result.ok) return "GitHub Project schema is valid for Ski Stack.";

  const lines = ["GitHub Project schema is missing Ski Stack requirements."];

  if (result.missingFields.length) {
    lines.push("", "Missing fields:");
    for (const field of result.missingFields) lines.push(`- ${field}`);
  }

  if (result.typeMismatches.length) {
    lines.push("", "Field type mismatches:");
    for (const mismatch of result.typeMismatches) {
      lines.push(`- ${mismatch.field}: expected ${mismatch.expected}, found ${mismatch.actual}`);
    }
  }

  if (result.missingOptions.length) {
    lines.push("", "Missing single-select options:");
    for (const missing of result.missingOptions) {
      lines.push(`- ${missing.field}: ${missing.option}`);
    }
  }

  return lines.join("\n");
}

