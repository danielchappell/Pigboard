import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { checkProductionImage, runImageCheckCommand } from "../scripts/check-pigboard-production-image.mjs";

const IMAGE = `sha256:${"a".repeat(64)}`;
const CONTAINER = "b".repeat(64);
const LABEL = "dev.pigboard.image-check";

function fixture({ foreign = false, foreignContainer = false, lostReply = false, exited = false,
  healthy = true, removalFails = false, buildFails = false, inventoryFails = false,
  runTimeout = false, hostPort = 32123 } = {}) {
  let identity;
  let name;
  let tag;
  let imageExists = false;
  let containerExists = false;
  let time = 0;
  const commands = [];
  const ok = (stdout = "") => ({ ok: true, stdout, code: 0 });
  const fail = () => ({ ok: false, stdout: "credential-like raw log must stay private", code: 1 });
  return {
    commands,
    dependencies: {
      now: () => time,
      pause: async (ms) => { time += ms; },
      health: async () => healthy,
      choiceDenial: async () => true,
      docker: async (args) => {
        commands.push(args);
        if (args[0] === "build") {
          identity = args[args.indexOf("--label") + 1].split("=")[1];
          tag = args[args.indexOf("--tag") + 1];
          imageExists = !buildFails;
          return buildFails ? fail() : ok();
        }
        if (args[0] === "run") {
          name = args[args.indexOf("--name") + 1];
          containerExists = !runTimeout;
          return runTimeout ? { ...fail(), timedOut: true } : lostReply ? fail() : ok(CONTAINER);
        }
        if (args[0] === "exec") return ok();
        const [kind, action] = args;
        if (action === "ls") return inventoryFails ? fail() : ok((kind === "container" ? containerExists : imageExists) ? "aabbcc" : "");
        if (action === "inspect") {
          assert.equal(args[2], kind === "container" ? name : tag);
          const object = { Id: kind === "container" ? CONTAINER : IMAGE,
            Config: { Labels: { [LABEL]: foreign || (foreignContainer && kind === "container") ? "another-check" : identity } } };
          if (kind === "container") Object.assign(object, { Image: IMAGE,
            State: { Running: !exited, ExitCode: exited ? 1 : 0 },
            NetworkSettings: { Ports: { "8080/tcp": [{ HostIp: "127.0.0.1", HostPort: String(hostPort) }] } } });
          return ok(JSON.stringify([object]));
        }
        if (action === "rm") {
          if (kind === "image" && containerExists) return fail();
          if (removalFails) return fail();
          if (kind === "container") containerExists = false;
          else imageExists = false;
          return ok();
        }
        throw new Error("Unexpected Docker operation");
      }
    }
  };
}

function onlyOwnedRemoval(commands, expectedKinds) {
  const removals = commands.filter((args) => args[1] === "rm");
  assert.deepEqual(removals.map((args) => args[0]), expectedKinds);
  for (const args of removals) {
    assert.equal(args.at(-1), args[0] === "container" ? CONTAINER : IMAGE);
    assert.ok(!args.includes("prune"));
  }
}

test("foreign ownership fails without any destructive operation", async () => {
  const f = fixture({ foreign: true });
  const result = await checkProductionImage(f.dependencies);
  assert.equal(result.status, "fail");
  onlyOwnedRemoval(f.commands, []);
  assert.ok(result.checks.some((entry) => entry.reason === "ownership_unverified"));
});

test("lost run reply reconciles and removes only exact owned objects, without claiming startup", async () => {
  const f = fixture({ lostReply: true });
  const result = await checkProductionImage(f.dependencies);
  assert.equal(result.status, "fail");
  assert.ok(result.checks.some((entry) => entry.reason === "run_outcome_unverified"));
  assert.ok(f.commands.some((args) => args[0] === "container" && args[1] === "inspect"));
  onlyOwnedRemoval(f.commands, ["container", "image"]);
  assert.ok(!JSON.stringify(result).includes("credential-like"));
});

test("Docker creation timeout is distinct from the service startup deadline", async () => {
  const f = fixture({ runTimeout: true });
  const result = await checkProductionImage(f.dependencies);
  assert.equal(result.status, "fail");
  assert.ok(result.checks.some(entry => entry.id === "start" &&
    entry.reason === "docker_start_deadline"));
  onlyOwnedRemoval(f.commands, ["image"]);
});

test("a foreign container is retained, with no attempt to remove its identity", async () => {
  const f = fixture({ foreignContainer: true });
  const result = await checkProductionImage(f.dependencies);
  assert.equal(result.status, "fail");
  assert.ok(result.checks.some((entry) => entry.id === "cleanup_container" && entry.reason === "ownership_unverified"));
  onlyOwnedRemoval(f.commands, ["image"]);
});

test("startup deadline fails and cleans only owned objects", async () => {
  const f = fixture({ healthy: false });
  const result = await checkProductionImage(f.dependencies);
  assert.equal(result.status, "fail");
  assert.ok(result.checks.some((entry) => entry.reason === "startup_deadline"));
  onlyOwnedRemoval(f.commands, ["container", "image"]);
});

test("truncated denial body settles the real probe and cleans exact owned objects", async () => {
  const server = createServer((_req, response) => {
    response.writeHead(401, { "content-type": "application/json", "cache-control": "no-store",
      "content-length": "1000" });
    response.write("{");
    setTimeout(() => response.destroy(), 10);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const f = fixture({ hostPort: server.address().port });
  const { choiceDenial: _stub, ...dependencies } = f.dependencies;
  let watchdog;
  try {
    const result = await Promise.race([checkProductionImage(dependencies),
      new Promise((_, reject) => { watchdog = setTimeout(() => reject(
        new Error("interrupted denial probe did not settle and clean up")), 1200); })]);
    assert.equal(result.status, "fail");
    assert.ok(result.checks.some(entry => entry.id === "jira_denial" &&
      entry.reason === "unauthenticated_route_unverified"));
    onlyOwnedRemoval(f.commands, ["container", "image"]);
    assert.equal(result.resources.container.cleanup, "removed");
    assert.equal(result.resources.image.cleanup, "removed");
  } finally {
    clearTimeout(watchdog);
    await new Promise(resolve => server.close(resolve));
  }
});

test("early process exit fails and cleans only owned objects", async () => {
  const f = fixture({ exited: true });
  const result = await checkProductionImage(f.dependencies);
  assert.equal(result.status, "fail");
  assert.ok(result.checks.some((entry) => entry.reason === "container_exited"));
  onlyOwnedRemoval(f.commands, ["container", "image"]);
});

test("cleanup failure keeps an otherwise healthy result failed", async () => {
  const f = fixture({ removalFails: true });
  const result = await checkProductionImage(f.dependencies);
  assert.ok(result.checks.some((entry) => entry.id === "health" && entry.status === "pass"));
  assert.equal(result.status, "fail");
  assert.ok(result.checks.some((entry) => entry.reason === "removal_failed"));
  assert.equal(result.resources.container.id, CONTAINER);
  assert.equal(result.resources.container.cleanup, "retained");
  assert.equal(result.resources.image.id, IMAGE);
  assert.equal(result.resources.image.cleanup, "retained");
  assert.ok(result.resources.container.name.endsWith(result.resources.ownershipValue));
  onlyOwnedRemoval(f.commands, ["container", "image"]);
});

test("unverified cleanup inventory retains exact run references without claiming deletion", async () => {
  const f = fixture({ lostReply: true, inventoryFails: true });
  const result = await checkProductionImage(f.dependencies);
  assert.equal(result.status, "fail");
  assert.equal(result.resources.container.id, null);
  assert.equal(result.resources.container.cleanup, "unverified");
  assert.equal(result.resources.image.cleanup, "unverified");
  assert.ok(result.resources.container.name.endsWith(result.resources.ownershipValue));
  assert.ok(result.resources.image.tag.endsWith(result.resources.ownershipValue));
  assert.equal(result.resources.ownershipLabel, LABEL);
  onlyOwnedRemoval(f.commands, []);
});

test("text and JSON failed results identify only this run for safe reconciliation", async () => {
  for (const format of ["text", "json"]) {
    const f = fixture({ removalFails: true });
    const output = [];
    assert.equal(await runImageCheckCommand(["--format", format], {
      output: (value) => output.push(value), check: () => checkProductionImage(f.dependencies) }), 1);
    const rendered = output[0];
    assert.match(rendered, /pigboard-image-check/u);
    assert.ok(rendered.includes(CONTAINER));
    assert.match(rendered, /retained/u);
    assert.ok(rendered.includes(LABEL));
    assert.ok(!rendered.includes("credential-like"));
    assert.ok(!rendered.includes("synthetic-image-check"));
    onlyOwnedRemoval(f.commands, ["container", "image"]);
  }
});

test("failed build remains failure and does not delete absent resources", async () => {
  const f = fixture({ buildFails: true });
  const result = await checkProductionImage(f.dependencies);
  assert.equal(result.status, "fail");
  onlyOwnedRemoval(f.commands, []);
});

test("CLI documents prerequisites, rejects overrides, and reports safe structured omissions", async () => {
  const output = [];
  const write = (value) => output.push(value);
  const noCheck = () => { throw new Error("must not run"); };
  assert.equal(await runImageCheckCommand(["--help"], { output: write, check: noCheck }), 0);
  assert.match(output.pop(), /Docker.*registry\/package access/u);
  assert.equal(await runImageCheckCommand(["--url", "https://example.com"], { output: write, check: noCheck }), 2);
  const f = fixture();
  assert.equal(await runImageCheckCommand(["--format", "json"], { output: write,
    check: () => checkProductionImage(f.dependencies) }), 0, output.at(-1));
  const result = JSON.parse(output.at(-1));
  assert.equal(result.status, "pass", JSON.stringify(result.checks));
  assert.equal(result.image, IMAGE);
  assert.deepEqual(result.omissions, ["live_neon_access", "caller_grants", "fly_deployment"]);
  onlyOwnedRemoval(f.commands, ["container", "image"]);
});
