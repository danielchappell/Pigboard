import { readFile } from "node:fs/promises";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildWorkerPrompt, GitHubProjectsAdapter } from "../src/index.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const args = new Set(process.argv.slice(2));
const holdLease = args.has("--hold");

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const owner = process.env.GITHUB_OWNER ?? process.env.GITHUB_ORG;
const projectNumber = process.env.GITHUB_PROJECT_NUMBER;
const workerType = process.env.SKI_WORKER_TYPE;
const workerId = process.env.SKI_WORKER_ID ?? `${hostname()}:${process.pid}:${workerType ?? "worker"}`;
const leaseSeconds = Number(process.env.SKI_LEASE_SECONDS ?? 1800);
const repositories = process.env.SKI_REPOSITORIES;

if (!token || !owner || !projectNumber || !workerType) {
  console.error(`Missing required environment.

Required:
  GITHUB_TOKEN or GH_TOKEN
  GITHUB_OWNER
  GITHUB_PROJECT_NUMBER
  SKI_WORKER_TYPE

Optional:
  SKI_WORKER_ID
  SKI_LEASE_SECONDS
  SKI_REPOSITORIES       Comma-separated owner/repo allow-list for this worker

Flags:
  --hold    Keep the lease after printing the prompt. By default, the lease is released.
`);
  process.exit(2);
}

const adapter = new GitHubProjectsAdapter({
  token,
  owner,
  projectNumber,
  repositories
});

const ready = await adapter.listReady(workerType);
if (ready.length === 0) {
  console.log(`No ready items for worker type: ${workerType}`);
  process.exit(0);
}

const item = ready[0];
const claimResult = await adapter.claim(item.id, workerId, leaseSeconds);
if (!claimResult.claimed) {
  console.error(`Could not claim ${item.id}: ${claimResult.reason}`);
  process.exit(3);
}

const workerRole = await readWorkerRole(workerType);
const prompt = buildWorkerPrompt({
  item: claimResult.item,
  claim: claimResult.claim,
  workerRole
});

console.log(prompt);

if (!holdLease) {
  await adapter.release(claimResult.claim.id);
  console.error(`\nReleased lease ${claimResult.claim.id}. Re-run with --hold to keep the claim.`);
} else {
  console.error(`\nHolding lease ${claimResult.claim.id} until ${claimResult.claim.expiresAt}.`);
}

async function readWorkerRole(type) {
  const rolePath = join(repoRoot, "agents", `${type}.md`);
  try {
    return await readFile(rolePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return `No role card found for worker type: ${type}`;
    }
    throw error;
  }
}
