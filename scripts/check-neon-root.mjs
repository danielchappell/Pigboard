import { ROOT_TARGET, publicTarget } from "../src/hosted/root-target.js";
import { formatPreflightText, runPreflight } from "../src/hosted/neon-preflight.js";

const help = `Check the Pigboard production Neon root and a restricted runtime login.

Usage:
  npm run --silent neon:preflight -- --passfile /absolute/private/path [--format text|json]
  npm run --silent neon:preflight -- --passfile /absolute/private/path --target-host HOST
  npm run --silent neon:preflight -- --help

The default host is the reviewed production root. --target-host is for an exact
refusal test, not a target override. A child, pooler or other host is rejected
before the password file is inspected or psql is started. The password file must
be regular, nonsymlink, owned by the current user and mode 0600 or stricter.
It must contain an exact host:5432:database:role entry; this command never reads
the file, so only a successful pinned login proves a matching credential exists.
No password, connection string, Jira data or app grant is printed.

Text is the default. JSON includes status, expected target, safely printable
requested host, checks and omissions.
Exit 0 means every check passed; 1 means failed or unverified; 2 means bad usage.
The operator guide is docs/hosted-neon-preflight.md. This does not deploy Fly
or claim S02a is ready.`;

function usage(args) {
  if (args.length === 1 && args[0] === "--help") return { help: true };
  const options = { format: "text", targetHost: ROOT_TARGET.host };
  const allowed = new Map([["--passfile", "passfile"], ["--format", "format"],
    ["--target-host", "targetHost"]]);
  const seen = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!allowed.has(flag) || seen.has(flag)) return null;
    seen.add(flag);
    const value = args[++index];
    if (!value || value.startsWith("--")) return null;
    options[allowed.get(flag)] = value;
  }
  if (!options.passfile || !["text", "json"].includes(options.format)) return null;
  return options;
}

const options = usage(process.argv.slice(2));
if (options?.help) {
  console.log(help);
} else if (!options) {
  const report = {
    schemaVersion: 1, status: "fail", target: publicTarget(), requestedHost: null,
    checks: [{ id: "usage", status: "fail", reason: "invalid_usage",
      message: "Use --passfile ABSOLUTE_PATH, optional --format text|json and --target-host HOST. See --help." }],
    omissions: ["connection", "identity", "tls", "role_attributes", "role_membership",
      "database_privileges", "schema_privileges", "fixture_grants"]
  };
  const requestedJson = process.argv.slice(2).some((arg, index, args) =>
    arg === "--format" && args[index + 1] === "json");
  console.log(requestedJson ? JSON.stringify(report) : formatPreflightText(report));
  process.exitCode = 2;
} else {
  const report = await runPreflight({ targetHost: options.targetHost, passfile: options.passfile });
  console.log(options.format === "json" ? JSON.stringify(report) : formatPreflightText(report));
  process.exitCode = report.status === "pass" ? 0 : 1;
}
