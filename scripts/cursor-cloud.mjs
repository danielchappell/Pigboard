import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { CursorCloudError, CursorCloudRunner, prepareCursorRequest } from "../src/runners/cursor-cloud.js";

const HELP = `Ski Stack Cursor cloud jobs

prepare --prompt-file FILE --model ID [--param ID=VALUE] [--name NAME] [--repo URL --ref REF]
  Prints a new request without contacting Cursor. Save it before starting.
start --request FILE
  Starts or recovers the saved request. Never edit or regenerate its agent ID on retry.
get --agent-id ID [--run-id ID]
  Reads status and reply without starting work. Use the returned run ID for exact retrieval.
models [--model ID]
  Lists supported model IDs and parameters.

Use: npm run --silent cursor -- COMMAND [options]
API commands require CURSOR_API_KEY. All output is JSON; errors go to stderr.
Plan mode only; one optional GitHub repo/ref; no automatic PR or follow-up launch.
Prepare/get do not run a model. FINISHED means a turn ended, not human acceptance.
`;

const ALLOWED = {
  prepare: ["prompt-file", "model", "param", "name", "repo", "ref"],
  start: ["request"],
  get: ["agent-id", "run-id"],
  models: ["model"]
};

export async function runCursorCloudCli(argv, {
  env = process.env,
  stdout = (message) => process.stdout.write(message),
  stderr = (message) => process.stderr.write(message),
  readFileImpl = readFile,
  runnerFactory = (options) => new CursorCloudRunner(options)
} = {}) {
  const writeJson = (writer, value) => {
    let output = JSON.stringify(value, null, 2);
    const key = env.CURSOR_API_KEY;
    if (key) output = output.replaceAll(JSON.stringify(key).slice(1, -1), "[REDACTED]");
    writer(`${output}\n`);
  };
  try {
    if (!argv.length || argv.includes("--help") || argv[0] === "help") {
      stdout(HELP);
      return 0;
    }
    let parsed;
    try {
      parsed = parseArgs({ args: argv, allowPositionals: true, strict: true, options: {
        "prompt-file": { type: "string" }, model: { type: "string" },
        param: { type: "string", multiple: true }, name: { type: "string" },
        repo: { type: "string" }, ref: { type: "string" }, request: { type: "string" },
        "agent-id": { type: "string" }, "run-id": { type: "string" }
      } });
    } catch {
      throw new CursorCloudError("invalid_arguments", "Invalid command or option; use --help.");
    }
    const [command] = parsed.positionals;
    const values = parsed.values;
    if (parsed.positionals.length !== 1 || !ALLOWED[command]
      || Object.keys(values).some((key) => !ALLOWED[command].includes(key))) {
      throw new CursorCloudError("invalid_arguments", "Invalid command or option; use --help.");
    }
    let result;
    if (command === "prepare") {
      if (!values["prompt-file"] || !values.model) throw new CursorCloudError("invalid_arguments", "prepare requires --prompt-file and --model.");
      const params = (values.param ?? []).map((entry) => {
        const index = entry.indexOf("=");
        if (index < 1 || index === entry.length - 1) throw new CursorCloudError("invalid_arguments", "Use --param ID=VALUE.");
        return { id: entry.slice(0, index), value: entry.slice(index + 1) };
      });
      result = prepareCursorRequest({
        prompt: await readFileImpl(values["prompt-file"], "utf8"),
        model: { id: values.model, ...(params.length ? { params } : {}) },
        name: values.name, repository: values.repo, ref: values.ref
      });
      if (env.CURSOR_API_KEY && JSON.stringify(result).includes(JSON.stringify(env.CURSOR_API_KEY).slice(1, -1))) {
        throw new CursorCloudError("invalid_request", "Remove the API key from the prompt and configuration.");
      }
    } else {
      const runner = runnerFactory({ apiKey: env.CURSOR_API_KEY });
      if (command === "start") {
        if (!values.request) throw new CursorCloudError("invalid_arguments", "start requires --request FILE.");
        let request;
        try { request = JSON.parse(await readFileImpl(values.request, "utf8")); }
        catch { throw new CursorCloudError("invalid_request_file", "Cannot read the saved request as JSON; use prepare first."); }
        result = await runner.start(request);
      } else if (command === "get") {
        result = await runner.get({ agentId: values["agent-id"], runId: values["run-id"] });
      } else {
        const models = await runner.models();
        result = values.model ? models.filter((model) => model.id === values.model) : models;
        if (values.model && !result.length) throw new CursorCloudError("unknown_model", "That model ID is not listed; run models without a filter.");
      }
    }
    writeJson(stdout, result);
    return ["ERROR", "CANCELLED", "EXPIRED"].includes(result?.status) ? 1 : 0;
  } catch (error) {
    const known = error instanceof CursorCloudError;
    writeJson(stderr, { error: {
      code: known ? error.code : "command_failed",
      message: known ? error.message : "Unable to read input or complete the command; check the file and retry with the same saved IDs.",
      ...(known ? Object.fromEntries(["agentId", "runId", "httpStatus", "recoveryRequired", "recoveryCode"]
        .filter((key) => error[key] !== undefined).map((key) => [key, error[key]])) : {})
    } });
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCursorCloudCli(process.argv.slice(2));
}
