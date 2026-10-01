import test from "node:test";
import assert from "node:assert/strict";
import { checkProductionImage, runImageCheckCommand } from "../scripts/check-pigboard-production-image.mjs";

const IMAGE = `sha256:${"a".repeat(64)}`;
const CONTAINER = "b".repeat(64);
const LABEL = "dev.pigboard.image-check";

function fixture({ foreign = false, foreignContainer = false, lostReply = false, exited = false,
  healthy = true, removalFails = false, buildFails = false } = {}) {
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
          containerExists = true;
          return lostReply ? fail() : ok(CONTAINER);
        }
        const [kind, action] = args;
        if (action === "ls") return ok((kind === "container" ? containerExists : imageExists) ? "aabbcc" : "");
        if (action === "inspect") {
          assert.equal(args[2], kind === "container" ? name : tag);
          const object = { Id: kind === "container" ? CONTAINER : IMAGE,
            Config: { Labels: { [LABEL]: foreign || (foreignContainer && kind === "container") ? "another-check" : identity } } };
          if (kind === "container") Object.assign(object, { Image: IMAGE,
            State: { Running: !exited, ExitCode: exited ? 1 : 0 },
            NetworkSettings: { Ports: { "8080/tcp": [{ HostIp: "127.0.0.1", HostPort: "32123" }] } } });
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
  onlyOwnedRemoval(f.commands, ["container", "image"]);
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
    check: () => checkProductionImage(f.dependencies) }), 0);
  const result = JSON.parse(output.at(-1));
  assert.equal(result.status, "pass");
  assert.equal(result.image, IMAGE);
  assert.deepEqual(result.omissions, ["live_neon_access", "caller_grants", "fly_deployment"]);
  onlyOwnedRemoval(f.commands, ["container", "image"]);
});
