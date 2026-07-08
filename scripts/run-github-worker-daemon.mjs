import { readFile } from "node:fs/promises";

import {
  assertLocalChatGptCodexAuth,
  createGitHubWebhookServer,
  GitHubCodeLoopWorker,
  GitHubProjectsAdapter,
  runCodexIsolationDiagnostics,
  WorkerType
} from "../src/index.js";

const args = new Set(process.argv.slice(2));
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

const workers = createWorkers({
  config,
  adapterConfig: {
    token,
    owner,
    projectNumber,
    ownerType: config.github?.ownerType ?? "auto"
  }
});
const dirty = new Set(workers.keys());

const server = createGitHubWebhookServer({
  secret,
  host,
  insecureLocalWebhook,
  onEvent: async (event) => {
    for (const [key, worker] of workers) {
      if (event.kind === "project" || matchesWorkerRepository(worker, event.repository)) dirty.add(key);
    }
    drain().catch((error) => console.error(error));
  }
});

server.listen(port, host, () => {
  console.log(`Ski Stack GitHub worker daemon listening on http://${host}:${port}/webhooks/github`);
});

setInterval(() => {
  for (const key of workers.keys()) dirty.add(key);
  drain().catch((error) => console.error(error));
}, Number(process.env.SKI_RECONCILE_SECONDS ?? 600) * 1000).unref();

await drain();

async function drain() {
  for (const key of [...dirty]) {
    const worker = workers.get(key);
    if (!worker) {
      dirty.delete(key);
      continue;
    }
    const result = await worker.runOnce();
    if (!result.ran) dirty.delete(key);
  }
}

function createWorkers({ config, adapterConfig }) {
  const workers = new Map();
  for (const slot of config.slots ?? []) {
    if (![WorkerType.IMPLEMENTER, WorkerType.REVIEWER, WorkerType.PR_BABYSITTER].includes(slot.type)) continue;
    if (slot.observeOnly) continue;
    const slotRepositories = repositoriesForSlot({ slot, config });
    const primaryRepository = slot.repository ?? slotRepositories[0];
    const repoPolicy = config.repositories?.[primaryRepository] ?? config.repoPolicy;
    if (!repoPolicy?.cwd) throw new Error(`Missing repo policy cwd for worker ${slot.type}`);
    const count = Number(slot.count ?? 1);
    for (let index = 0; index < count; index += 1) {
      const key = `${slot.type}:${index}`;
      const adapter = new GitHubProjectsAdapter({
        ...adapterConfig,
        repositories: slotRepositories
      });
      const worker = new GitHubCodeLoopWorker({
        adapter,
        workerType: slot.type,
        workerId: slot.workerId ?? `${key}:${process.pid}`,
        leaseSeconds: Number(slot.leaseSeconds ?? process.env.SKI_LEASE_SECONDS ?? 1800),
        repoPolicy
      });
      worker.allowedRepositories = new Set(slotRepositories.map((repo) => repo.toLowerCase()));
      workers.set(key, worker);
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
