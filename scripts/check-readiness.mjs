#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { checkReadiness, emptyReadiness, readLocalInput, parseLocalJSON, renderReadiness } from '../lib/release/readiness.mjs';

export const help = `Check Pig Boss supplied release evidence locally (Node 20+).
node scripts/check-readiness.mjs --config /absolute/customer.json --release /absolute/skill-receipt.json --revision FULL_APPROVED_SHA [--package-manifest /absolute/manifest.json] [--installation /absolute/installation.json] [--health /absolute/health.json] [--observations /absolute/observations.json] [--json]
--help alone displays this text. Paths must be absolute; revisions are lowercase 40-hex.
No provider calls, secret resolution, installation, scans, worker runs or activation.
The existing release verifier executes prepared local dependency code and disposable smokes.
Exit 0: compatible supplied evidence; 1: incompatible or unverified; 2: input/setup error.
Missing optional evidence remains UNVERIFIED. Human cases always remain NOT_RUN.
See docs/release-readiness.md for prerequisites, evidence qualifications and recovery.
`;
const values = new Map([['--config', 'configText'], ['--release', 'release'], ['--revision', 'revision'], ['--package-manifest', 'packageManifest'], ['--installation', 'installation'], ['--health', 'health'], ['--observations', 'observations']]);

export async function runReadinessCommand(argv) {
  let json = false;
  // Only a flag position selects JSON; a filename is never another option.
  for (let i = 0; i < argv.length; i++) if (values.has(argv[i])) i++; else if (argv[i] === '--json') json = true;
  const inputs = {};
  try {
    if (argv.length === 1 && argv[0] === '--help') return { outcome: { help }, stdout: help, exitCode: 0 };
    const seen = new Set();
    for (let i = 0; i < argv.length; i++) {
      const flag = argv[i];
      if (seen.has(flag) || !values.has(flag) && flag !== '--json') throw Error();
      seen.add(flag);
      if (flag === '--json') continue;
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw Error();
      inputs[values.get(flag)] = value;
    }
    if (!inputs.configText || !inputs.release || !/^[0-9a-f]{40}$/.test(inputs.revision)) throw Error();
    for (const [key, value] of Object.entries(inputs)) if (key !== 'revision' && !path.isAbsolute(value)) throw Error();
  } catch {
    const outcome = emptyReadiness();
    outcome.checks.push({ id: 'C01_INPUT', status: 'ERROR', code: 'USAGE', expected: 'declared flags and absolute paths', observed: null, evidence: [], next_step: 'Run --help alone, then supply --config, --release and --revision.' });
    return { outcome, stdout: json ? JSON.stringify(outcome) + '\n' : renderReadiness(outcome), exitCode: 2 };
  }
  const inputErrors = [];
  const inputFiles = [];
  for (const [key, filename] of Object.entries(inputs)) {
    if (key === 'revision') continue;
    try {
      const bytes = await readLocalInput(filename, 'bytes');
      inputFiles.push({ input: key, path: filename, sha256: createHash('sha256').update(bytes).digest('hex') });
      inputs[key] = key === 'configText' ? bytes.toString('utf8') : parseLocalJSON(bytes);
    }
    catch { delete inputs[key]; inputErrors.push(key); }
  }
  let outcome;
  try { outcome = await checkReadiness(inputs); }
  catch {
    outcome = emptyReadiness(inputs.revision);
    outcome.checks.push({ id: 'C01_INTERNAL', status: 'ERROR', code: 'CHECKER_FAILURE', expected: 'complete local comparison', observed: null, evidence: [], next_step: 'Retain inputs and report this checker failure; no hosted recovery was attempted.' });
  }
  if (inputErrors.length) {
    outcome.checks.unshift({ id: 'C01_INPUT', status: 'ERROR', code: 'INPUT_UNREADABLE_OR_MALFORMED', expected: 'readable bounded declared input files', observed: { fields: inputErrors.sort() }, evidence: [], next_step: 'Supply readable regular input files within the documented bounds; no raw parser error or content is returned.' });
    outcome.status = 'input_error'; outcome.exit_code = 2;
  }
  outcome.evidence_layers.local_compatibility ??= {};
  outcome.evidence_layers.local_compatibility.input_files = inputFiles.sort((a, b) => a.input.localeCompare(b.input));
  return { outcome, stdout: json ? JSON.stringify(outcome) + '\n' : renderReadiness(outcome), exitCode: outcome.exit_code };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runReadinessCommand(process.argv.slice(2));
  process.stdout.write(result.stdout);
  process.exitCode = result.exitCode;
}
