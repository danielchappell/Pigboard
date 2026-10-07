#!/usr/bin/env node
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { request } from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ROOT_TARGET } from "../src/hosted/root-target.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const LABEL = "dev.pigboard.image-check";
const STARTUP_MS = 20_000;
const HELP = `Check the actual Pigboard production image with synthetic credentials.

Usage:
  npm run --silent check:pigboard-image -- [--format text|json]
  npm run --silent check:pigboard-image -- --help

Requires Docker and registry/package access. Builds the repository Dockerfile,
starts its normal unprivileged command on one CPU/256 MiB, checks loopback-only
/health, then removes only this check's labelled resources. Failures are not
skipped. Raw Docker logs and credentials are never printed. This proves image
liveness, not Neon or live Jira access, caller grants or a deployed service.
Guide: docs/hosted-pigboard-first-service.md`;

function dockerCommand(args, timeout) {
  const env = {};
  for (const key of ["PATH", "HOME", "USER", "TMPDIR", "DOCKER_HOST",
    "DOCKER_CONTEXT", "DOCKER_CONFIG", "BUILDX_CONFIG"]) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  return new Promise((resolve) => execFile("docker", args, {
    cwd: ROOT, env, timeout, killSignal: "SIGKILL", maxBuffer: 1024 * 1024
  }, (error, stdout) => resolve({ ok: !error, stdout,
    code: error ? (Number.isInteger(error.code) ? error.code : null) : 0,
    timedOut: Boolean(error?.killed) })));
}

function probeHealth(port, timeout) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => { if (!settled) { settled = true; resolve(ok); } };
    const req = request({ hostname: "127.0.0.1", port, path: "/health",
      method: "GET" }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
        if (body.length > 4096) { req.destroy(); finish(false); }
      });
      res.on("error", () => finish(false));
      res.on("end", () => {
        try {
          const value = JSON.parse(body);
          finish(res.statusCode === 200 && value.schemaVersion === 1 &&
            value.status === "live" && Object.keys(value).length === 2);
        } catch { finish(false); }
      });
    });
    const deadline = setTimeout(() => { req.destroy(); finish(false); }, timeout);
    req.on("error", () => finish(false));
    req.on("close", () => clearTimeout(deadline));
    req.end();
  });
}

function probeChoiceDenial(port, timeout) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (!settled) { settled = true; clearTimeout(deadline); resolve(ok); }
    };
    const req = request({ hostname: "127.0.0.1", port, path: "/v1/jira/choices",
      method: "GET" }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
        if (body.length > 4096) { req.destroy(); finish(false); }
      });
      res.on("end", () => {
        try {
          const value = JSON.parse(body);
          finish(res.statusCode === 401 && value.schemaVersion === 1 &&
            value.status === "denied" && value.reason === "invalid_credential" &&
            !Object.hasOwn(value, "projects") && res.headers["cache-control"] === "no-store");
        } catch { finish(false); }
      });
      res.on("error", () => finish(false));
      res.on("aborted", () => finish(false));
      res.on("close", () => { if (!res.complete) finish(false); });
    });
    const deadline = setTimeout(() => { req.destroy(); finish(false); }, timeout);
    req.on("error", () => finish(false));
    req.end();
  });
}

function inspected(result) {
  if (!result.ok) return null;
  try {
    const value = JSON.parse(result.stdout);
    return Array.isArray(value) && value.length === 1 ? value[0] : null;
  } catch { return null; }
}

// Dependencies are a unit-test seam only; production CLI exposes no overrides.
export async function checkProductionImage({ docker = dockerCommand,
  health = probeHealth, choiceDenial = probeChoiceDenial, now = Date.now,
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const identity = randomUUID();
  const name = `pigboard-image-check-${identity}`;
  const tag = `pigboard-image-check:${identity}`;
  const result = { schemaVersion: 1, status: "fail", image: null, checks: [],
    resources: { ownershipLabel: LABEL, ownershipValue: identity,
      container: { name, id: null, cleanup: "unverified" },
      image: { tag, id: null, cleanup: "unverified" } },
    omissions: ["live_neon_access", "live_jira_access", "caller_grants", "fly_deployment"] };
  const record = (id, status, reason, code) => result.checks.push({ id, status,
    ...(reason ? { reason } : {}), ...(Number.isInteger(code) ? { exitCode: code } : {}) });
  const command = async (args, bound = 5000) => {
    try { return await docker(args, bound); }
    catch { return { ok: false, code: null, stdout: "" }; }
  };
  const inspect = async (kind, target, bound) => inspected(await command([kind, "inspect", target], bound));
  const owned = (object) => object?.Config?.Labels?.[LABEL] === identity;
  let image;
  let passed = false;
  let healthPort;

  async function presence(kind, target) {
    const listed = await command([kind, "ls", ...(kind === "container" ? ["--all",
      "--filter", `name=^/${target}$`] : [target]), "--format", "{{.ID}}"]);
    return { ...listed, present: listed.ok ? Boolean(listed.stdout.trim()) : null };
  }

  async function cleanup(kind, target) {
    const reference = result.resources[kind];
    const listed = await presence(kind, target);
    if (!listed.ok) { record(`cleanup_${kind}`, "fail", "inventory_unverified", listed.code); return; }
    if (!listed.present) { reference.cleanup = "absent"; record(`cleanup_${kind}`, "pass", "absent"); return; }
    const object = await inspect(kind, target);
    if (!owned(object) || (kind === "image" ? !/^sha256:[a-f0-9]{64}$/.test(object.Id) :
      !/^[a-f0-9]{64}$/.test(object.Id))) {
      record(`cleanup_${kind}`, "fail", "ownership_unverified"); return;
    }
    reference.id = object.Id;
    // IDs avoid deleting a different object if a name/tag changes after inspection.
    const removed = await command([kind, "rm", ...(kind === "container" ? ["--force"] :
      ["--no-prune"]), object.Id], 20_000);
    if (removed.ok) reference.cleanup = "removed";
    else {
      // A failed reply alone does not prove the object still exists.
      const remaining = await presence(kind, target);
      if (remaining.ok && !remaining.present) reference.cleanup = "absent";
      else if (remaining.present) {
        const current = await inspect(kind, target);
        if (owned(current) && current.Id === object.Id) reference.cleanup = "retained";
      }
    }
    record(`cleanup_${kind}`, removed.ok ? "pass" : "fail",
      removed.ok ? "removed_owned_object" : "removal_failed", removed.code);
  }

  try {
    const built = await command(["build", "--label", `${LABEL}=${identity}`, "--tag", tag, "."], 120_000);
    record("build", built.ok ? "pass" : "fail", built.ok ? undefined : "build_failed", built.code);
    if (!built.ok) return result;
    image = await inspect("image", tag);
    if (!owned(image) || !/^sha256:[a-f0-9]{64}$/.test(image.Id)) {
      record("image", "fail", "ownership_unverified"); return result;
    }
    result.image = image.Id;
    result.resources.image.id = image.Id;
    const synthetic = new URL(`postgresql://${ROOT_TARGET.role}:synthetic-image-check@${ROOT_TARGET.host}:${ROOT_TARGET.port}/${ROOT_TARGET.database}`);
    synthetic.searchParams.set("sslmode", "verify-full");
    // Docker itself can take longer than the service's separate 20s health bound
    // while creating the container on the local engine.
    const started = await command(["run", "--detach", "--name", name,
      "--label", `${LABEL}=${identity}`, "--cpus", "1", "--memory", "256m",
      "--publish", "127.0.0.1::8080", "--env", `PIGBOARD_NEON_URL=${synthetic.href}`, image.Id], 30_000);
    if (!started.ok) { record("start", "fail", started.timedOut ?
      "docker_start_deadline" : "run_outcome_unverified", started.code); return result; }
    record("start", "pass");
    const deadline = now() + STARTUP_MS;
    while (now() < deadline) {
      const container = await inspect("container", name, Math.min(5000, Math.max(1, deadline - now())));
      if (!owned(container) || container.Image !== image.Id) {
        record("health", "fail", "container_unverified"); return result;
      }
      if (/^[a-f0-9]{64}$/.test(container.Id)) result.resources.container.id = container.Id;
      if (!container.State?.Running) {
        record("health", "fail", "container_exited", container.State?.ExitCode); return result;
      }
      const ports = container.NetworkSettings?.Ports?.["8080/tcp"];
      const port = Array.isArray(ports) && ports.length === 1 &&
        ports[0].HostIp === "127.0.0.1" && /^\d{1,5}$/.test(ports[0].HostPort) ?
        Number(ports[0].HostPort) : null;
      if (!port || port > 65535) { record("health", "fail", "loopback_port_unverified"); return result; }
      if (now() >= deadline) break;
      if (await health(port, Math.max(1, Math.min(1000, deadline - now())))) {
        record("health", "pass"); passed = true; healthPort = port; break;
      }
      await pause(Math.min(200, Math.max(0, deadline - now())));
    }
    if (!passed) record("health", "fail", "startup_deadline");
    if (passed) {
      const imported = await command(["exec", name, "node", "--input-type=module", "-e",
        "import('/app/src/jira/approved-discovery.js').then(async m => { const fs = await import('node:fs'); const value = JSON.parse(fs.readFileSync('/app/config/pigboard-approved-jira.json', 'utf8')); if (!m.validApprovedJira(value)) process.exitCode = 1; })"], 5000);
      record("jira_import", imported.ok ? "pass" : "fail",
        imported.ok ? undefined : "approved_jira_not_packaged", imported.code);
      const denied = await choiceDenial(healthPort, 1000);
      record("jira_denial", denied ? "pass" : "fail",
        denied ? undefined : "unauthenticated_route_unverified");
    }
  } catch {
    record("check", "fail", "check_unverified");
  } finally {
    await cleanup("container", name);
    await cleanup("image", tag);
    result.status = passed && result.checks.every((check) => check.status === "pass") ? "pass" : "fail";
  }
  return result;
}

export async function runImageCheckCommand(args, { output = console.log,
  check = checkProductionImage } = {}) {
  if (args.length === 1 && args[0] === "--help") { output(HELP); return 0; }
  const format = args.length === 0 ? "text" :
    args.length === 2 && args[0] === "--format" && ["text", "json"].includes(args[1]) ? args[1] : null;
  if (!format) { output("Use --help for check:pigboard-image usage."); return 2; }
  const result = await check();
  output(format === "json" ? JSON.stringify(result) : [
    `status: ${result.status}`, `image: ${result.image ?? "unverified"}`,
    `ownership: ${result.resources.ownershipLabel}=${result.resources.ownershipValue}`,
    `container: ${result.resources.container.name} (${result.resources.container.id ?? "ID unverified"}); cleanup: ${result.resources.container.cleanup}`,
    `imageTag: ${result.resources.image.tag}; cleanup: ${result.resources.image.cleanup}`,
    ...result.checks.map((entry) => `${entry.status}: ${entry.id}${entry.reason ? ` (${entry.reason})` : ""}`),
    `omissions: ${result.omissions.join(", ")}`
  ].join("\n"));
  return result.status === "pass" ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runImageCheckCommand(process.argv.slice(2));
}
