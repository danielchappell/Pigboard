import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertLocalChatGptCodexAuth,
  createGitHubWebhookServer,
  GitHubCodeLoopWorker,
  GitHubProjectsAdapter,
  runCodexIsolationDiagnostics,
  runSettledWorkerSlot,
  WorkerType
} from "../src/index.js";

const args = new Set(process.argv.slice(2));
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const host = process.env.SKI_WEBHOOK_HOST ?? "127.0.0.1";
const port = Number(process.env.SKI_WEBHOOK_PORT ?? 8787);
const secret = process.env.GITHUB_WEBHOOK_SECRET;
const insecureLocalWebhook = args.has("--insecure-local-webhook");
const config = await loadWorkerConfig(process.env.SKI_WORKER_CONFIG);

await assertLocalChatGptCodexAuth();
await runCodexIsolationDiagnostics({ cwd: process.cwd() });

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const owner = config.github?.owner ?? process.env.GITHUB_OWNER ?? process.env.GITHUB_ORG;
const projectNumber = config.github?.projectNumber ?? process.env.GITHUB_PROJECT_NUMBER;
if (!token || !owner || !projectNumber) {
  throw new Error("GITHUB_TOKEN/GH_TOKEN, GitHub owner, and project number are required");
}

const workers = await createWorkers({
  config,
  adapterConfig: {
    token,
    owner,
    projectNumber,
    ownerType: config.github?.ownerType ?? "auto"
  }
});
const dirty = new Set(workers.keys());
const inFlight = new Set();
let draining = false;
let drainRequested = false;

const server = createGitHubWebhookServer({
  secret,
  host,
  insecureLocalWebhook,
  onEvent: async (event) => {
    for (const [key, worker] of workers) {
      if (event.kind === "project" || matchesWorkerRepository(worker, event.repository)) dirty.add(key);
    }
    requestDrain();
  }
});

server.listen(port, host, () => {
  console.log(`Ski Stack GitHub worker daemon listening on http://${host}:${port}/webhooks/github`);
});

setInterval(() => {
  for (const key of workers.keys()) dirty.add(key);
  requestDrain();
}, Number(process.env.SKI_RECONCILE_SECONDS ?? 600) * 1000).unref();

await drain();

function requestDrain() {
  drainRequested = true;
  drain().catch((error) => console.error(error));
}

async function drain() {
  if (draining) return;
  draining = true;
  try {
    do {
      drainRequested = false;
      while (dirty.size) {
        const batch = [];
        for (const key of [...dirty]) {
          if (inFlight.has(key)) continue;
          const worker = workers.get(key);
          dirty.delete(key);
          if (!worker) continue;
          inFlight.add(key);
          batch.push(runWorkerSlot(key, worker));
        }
        if (!batch.length) break;
        const results = await Promise.all(batch);
        const ranAny = results.some((result) => result?.ran);
        for (const result of results) {
          if (result?.ran) dirty.add(result.key);
        }
        if (!ranAny) break;
      }
    } while (drainRequested || dirty.size);
  } finally {
    draining = false;
  }
}

async function runWorkerSlot(key, worker) {
  try {
    return await runSettledWorkerSlot({ key, worker });
  } finally {
    inFlight.delete(key);
  }
}

async function createWorkers({ config, adapterConfig }) {
  const workers = new Map();
  for (const slot of config.slots ?? []) {
    if (![WorkerType.IMPLEMENTER, WorkerType.REVIEWER, WorkerType.PR_BABYSITTER].includes(slot.type)) continue;
    if (slot.observeOnly) continue;
    const slotRepositories = repositoriesForSlot({ slot, config });
    if (!slotRepositories.length && !slot.allowUnfilteredRepositories && !config.repoPolicy?.allowUnfilteredRepositories) {
      throw new Error(
        `Worker slot ${slot.type} must set repository/repositories or explicitly set allowUnfilteredRepositories`
      );
    }
    const partitions = slotRepositories.length ? slotRepositories : [null];
    const count = Number(slot.count ?? 1);
    for (const repository of partitions) {
      const repoPolicy = policyForRepository({ config, repository, token: adapterConfig.token });
      if (!repoPolicy?.cwd) {
        throw new Error(`Missing repo policy cwd for worker ${slot.type}${repository ? ` on ${repository}` : ""}`);
      }
      const workerRole = repoPolicy.workerRole ?? (await readWorkerRole(slot.type));
      const repositories = repository ? [repository] : [];
      for (let index = 0; index < count; index += 1) {
        const partitionName = slot.name ? `${slot.name}:${repository ?? "all"}` : repository ?? "all";
        const key = `${slot.type}:${safeKey(partitionName)}:${index}`;
        const adapter = new GitHubProjectsAdapter({
          ...adapterConfig,
          repositories
        });
        const worker = new GitHubCodeLoopWorker({
          adapter,
          workerType: slot.type,
          workerId: slot.workerId ?? `${key}:${process.pid}`,
          leaseSeconds: Number(slot.leaseSeconds ?? process.env.SKI_LEASE_SECONDS ?? 1800),
          repoPolicy: {
            ...repoPolicy,
            workerRole
          }
        });
        worker.allowedRepositories = new Set(repositories.map((repo) => repo.toLowerCase()));
        workers.set(key, worker);
      }
    }
  }
  return workers;
}

function matchesWorkerRepository(worker, repository) {
  if (!repository) return true;
  if (!worker.allowedRepositories?.size) return true;
  return worker.allowedRepositories.has(String(repository).toLowerCase());
}

function repositoriesForSlot({ slot, config }) {
  const value =
    slot.repositories ??
    (slot.repository ? [slot.repository] : undefined) ??
    config.github?.repositories ??
    process.env.SKI_REPOSITORIES;
  return normalizeRepositories(value);
}

function normalizeRepositories(value) {
  const repositories = Array.isArray(value) ? value : String(value ?? "").split(",");
  return repositories.map((repo) => String(repo).trim()).filter(Boolean);
}

function policyForRepository({ config, repository, token }) {
  const policy = repository ? config.repositories?.[repository] : config.repoPolicy;
  if (!policy) return undefined;
  return {
    ...policy,
    repository: policy.repository ?? repository,
    githubToken: policy.githubToken ?? token
  };
}

async function readWorkerRole(type) {
  try {
    return await readFile(join(repoRoot, "agents", `${type}.md`), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return `No role card found for worker type: ${type}`;
    throw error;
  }
}

function safeKey(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]+/g, "_");
}

async function loadWorkerConfig(path) {
  if (!path) {
    return {
      github: {
        repositories: process.env.SKI_REPOSITORIES
      },
      repoPolicy: {
        cwd: process.cwd(),
        defaultBaseBranch: "main",
        setupCommands: [],
        verifyCommands: []
      },
      slots: [
        { type: WorkerType.IMPLEMENTER, count: 1 },
        { type: WorkerType.REVIEWER, count: 1 },
        { type: WorkerType.PR_BABYSITTER, count: 1 }
      ]
    };
  }
  return JSON.parse(await readFile(path, "utf8"));
}
