#!/usr/bin/env node
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';

const args = process.argv.slice(2);
let json = false;
for (let i=0; i<args.length; i++) {
  if (['--mode','--input','--format'].includes(args[i])) i++;
  else if (args[i] === '--json') json = true;
}
let options = { format:'yaml' }, result, exit = 2;
const diagnostic = (code,message) => ({ schema:'pigboard-work-validation/v1', mode:options.mode ?? null, format:options.format, document_schema:null, valid:false, draft_valid:null, start_structure_valid:null, readiness:'not_evaluated', diagnostics:[{code,path:'',message}], start_diagnostics:[] });
const help = `Validate local work structure (Node 20+).\nSource: node scripts/validate-work.mjs --mode draft|start --input FILE [--format yaml|adf] [--json]\nInstalled: node /opt/pigboard/skills/work-validator/scripts/validate-work.mjs --mode draft|start --input FILE [--json]\nStructure only; semantic and live readiness are not evaluated. See docs/authoring.md.\n`;
try {
  const seen = new Set();
  for (let i=0;i<args.length;i++) {
    const key = args[i];
    if (!['--mode','--input','--format','--json','--help'].includes(key) || seen.has(key)) throw new Error('USAGE');
    seen.add(key);
    if (key === '--json' || key === '--help') { options[key.slice(2)] = true; continue; }
    if (i+1 === args.length) throw new Error('USAGE');
    options[key.slice(2)] = args[++i];
  }
  if (options.help) {
    if (args.some(a => !['--help','--json'].includes(a))) throw new Error('USAGE');
    if (json) console.log(JSON.stringify({ schema:'pigboard-work-validation/v1',help,readiness:'not_evaluated' })); else process.stdout.write(help);
    process.exitCode=0;
  } else {
    if (!['draft','start'].includes(options.mode) || !['yaml','adf'].includes(options.format) || !options.input) throw new Error('USAGE');
    let runtime;
    try { runtime = await import('../lib/contracts/work.mjs'); } catch { throw new Error('SETUP'); }
    const limit = options.format === 'adf' ? runtime.LIMITS.adfBytes : runtime.LIMITS.workBytes;
    let bytes, file;
    try {
      file = await open(options.input,constants.O_RDONLY | constants.O_NONBLOCK);
      if (!(await file.stat()).isFile()) throw new Error('INPUT');
      bytes = Buffer.alloc(limit+1); let count=0;
      while (count < bytes.length) { const part = await file.read(bytes,count,bytes.length-count,null); if (!part.bytesRead) break; count += part.bytesRead; }
      bytes = bytes.subarray(0,count);
    } catch { throw new Error('INPUT'); } finally { await file?.close(); }
    result = runtime.validateWork(bytes,options); exit=result.valid ? 0 : 1;
  }
} catch (e) {
  const code = ['USAGE','INPUT','SETUP'].includes(e.message) ? e.message : 'INTERNAL';
  result = diagnostic(code, { USAGE:'Use --mode draft|start --input FILE [--format yaml|adf] [--json]. Run --help for examples.', INPUT:'Read a local regular file with sufficient permissions.', SETUP:'Validation runtime is missing or corrupt. Prepare dependencies with npm ci for source use, or rerun Pigboard preparation for an installed release.', INTERNAL:'Validation could not complete. Check the prepared runtime and report this failure.' }[code]);
}
if (result) {
  if (json) console.log(JSON.stringify(result));
  else {
    console.log(`${result.valid ? 'Valid' : 'Invalid'} ${result.mode ?? 'work'} structure. Structure only; semantic and live readiness are not evaluated.`);
    for (const [label,ds] of [['',result.diagnostics],['Start structure: ',result.start_diagnostics]]) for (const d of ds) console.log(`${label}${d.code} ${JSON.stringify(d.path)}: ${d.message}${d.line ? ` (line ${d.line}, column ${d.column})` : ''}${d.block !== undefined ? ` (ADF block ${d.block})` : ''}`);
  }
  process.exitCode=exit;
}
