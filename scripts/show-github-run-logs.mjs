import { readRunTranscript, findRuns } from "../src/index.js";

const args = parseArgs(process.argv.slice(2));
const runs = await findRuns({
  filters: {
    issue: args.issue ?? args.name,
    pr: args.pr,
    item: args.item,
    status: args.status,
    worker: args.worker,
    run: args.run,
    latest: args.latest
  }
});

if (args.json) {
  console.log(JSON.stringify(runs, null, 2));
  process.exit(0);
}

if (!runs.length) {
  console.error("No Ski Stack runs matched the filters.");
  process.exit(1);
}

const run = args.latest ? runs[runs.length - 1] : runs[0];
const transcript = await readRunTranscript(run);
process.stdout.write(args.tail ? tailText(transcript, args.tail) : transcript);

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    if (["latest", "json"].includes(key)) {
      parsed[key] = true;
    } else if (key === "tail") {
      const next = values[index + 1];
      if (next && !next.startsWith("--")) {
        parsed[key] = Number(next);
        index += 1;
      } else {
        parsed[key] = 80;
      }
    } else {
      parsed[key] = values[index + 1];
      index += 1;
    }
  }
  return parsed;
}

function tailText(text, lines) {
  const count = Number.isFinite(lines) && lines > 0 ? lines : 80;
  return text.split("\n").slice(-count).join("\n");
}
