import { runOwnerCommand } from "./bootstrap-pigboard-owner.mjs";

process.exitCode = await runOwnerCommand(["inspect", ...process.argv.slice(2)]);
