import {
  formatValidationReport,
  GitHubProjectsAdapter,
  validateGitHubProjectSchema
} from "../src/index.js";

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const organization = process.env.GITHUB_ORG;
const projectNumber = process.env.GITHUB_PROJECT_NUMBER;

if (!token || !organization || !projectNumber) {
  console.error(`Missing required environment.

Required:
  GITHUB_TOKEN or GH_TOKEN
  GITHUB_ORG
  GITHUB_PROJECT_NUMBER
`);
  process.exit(2);
}

const adapter = new GitHubProjectsAdapter({
  token,
  organization,
  projectNumber,
  itemsFirst: 1
});

const { projectModel } = await adapter.loadProjectItems();
const result = validateGitHubProjectSchema(projectModel);
console.log(formatValidationReport(result));
process.exit(result.ok ? 0 : 1);

