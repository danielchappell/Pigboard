import { createReadStream } from "node:fs";
import { validateWorkflowProfile, formatWorkflowProfileReport } from "../src/core/workflow-profile.js";

const MAX_BYTES = 64 * 1024;
const help = `Check a saved workflow profile and preview its route offline.

Usage:
  npm run --silent profile:check -- --file PATH [--format json|text]
  npm run --silent profile:check -- --stdin [--format json|text]
  npm run --silent profile:check -- --help

Node.js 20+; no credentials or network required. Input is UTF-8 JSON, at most
64 KiB. Choose exactly one input. JSON is the default output format.
Valid static configuration is NOT live readiness or permission to run an agent.
Connections, native workflow, repository access, model availability and execution
authorization remain unchecked. No tickets or runs are created.

Exit status: 0 valid static profile/help; 1 invalid profile; 2 usage/input failure.
Guide: docs/workflow-profile.md`;

function failure(code, message) {
  return { schemaVersion: 1, ok: false, liveReady: false, code, errors: [{ path: "$", code, message }] };
}

function parseOptions(args) {
  if (args.length === 1 && args[0] === "--help") return { help: true };
  const options = { format: "json" };
  const seen = new Set();
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    if (!["--file", "--stdin", "--format"].includes(flag) || seen.has(flag)) return null;
    seen.add(flag);
    if (flag === "--stdin") options.stdin = true;
    else {
      const value = args[++i];
      if (!value || value.startsWith("--")) return null;
      options[flag.slice(2)] = value;
    }
  }
  if (Boolean(options.file) === Boolean(options.stdin) || !["json", "text"].includes(options.format)) return null;
  return options;
}

async function readInput(options) {
  const stream = options.stdin ? process.stdin : createReadStream(options.file, { highWaterMark: MAX_BYTES + 1 });
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of stream) {
      const portion = chunk.subarray(0, MAX_BYTES + 1 - size);
      chunks.push(portion);
      size += portion.length;
      if (size > MAX_BYTES) return { error: failure("input_too_large", "Input must fit within 64 KiB of UTF-8 JSON.") };
    }
    return { bytes: Buffer.concat(chunks, size) };
  } catch {
    return { error: failure("input_unreadable", "Could not read the selected input. Check the path or input stream and its permissions.") };
  } finally {
    stream.destroy();
  }
}

const options = parseOptions(process.argv.slice(2));
if (options?.help) {
  console.log(help);
} else {
  let result;
  let exitCode = 2;
  if (!options) {
    result = failure("invalid_usage", "Choose exactly one --file PATH or --stdin, with optional --format json|text. Use --help for examples.");
  } else {
    const input = await readInput(options);
    result = input.error;
    if (!result) {
      let source;
      try {
        source = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(input.bytes);
      } catch {
        result = failure("invalid_encoding", "Input must be valid UTF-8 JSON. Save it as UTF-8 and retry.");
      }
      if (!result) {
        let profile;
        try {
          profile = JSON.parse(source);
        } catch {
          result = failure("invalid_json", "Input must contain one valid JSON document. Fix its syntax and retry.");
        }
        if (!result) {
          result = validateWorkflowProfile(profile);
          exitCode = result.ok ? 0 : 1;
        }
      }
    }
  }
  console.log(options?.format === "text" ? formatWorkflowProfileReport(result) : JSON.stringify(result));
  process.exitCode = exitCode;
}
