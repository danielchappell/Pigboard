#!/usr/bin/env node
// Local encoding only. Provider authorization and freshness belong to the caller.
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';

const schema = 'pigboard-handoff-publication/v1';
const help = `Prepare immutable local handoff text (Node 20+; prepared dependencies required).
Source: node scripts/prepare-handoff.mjs --input RECORD.yaml --summary SUMMARY.txt --format html|adf
Installed: node <receipt.skills>/work-validator/scripts/prepare-handoff.mjs --input RECORD.yaml --summary SUMMARY.txt --format html
Outputs one JSON object; no files or provider records are written. Validation does not establish live authority.
Exit 0: prepared; 1: invalid input; 2: usage, read or setup failure.
`;
const messages = {
  USAGE: 'Use --input FILE --summary FILE --format html|adf, or --help.',
  INPUT: 'Read local regular UTF-8 record and summary files with sufficient permissions.',
  SETUP: 'Prepare the same release validation runtime before use; do not repair dependencies in a delivery run.',
  SUMMARY: 'Use at most 2000 UTF-8 bytes of summary text without NUL or invalid Unicode.',
  ROUNDTRIP: 'Prepared transport must preserve the complete validated record and digest.',
  INTERNAL: 'Preparation could not complete. Preserve the inputs and report this failure.'
};
const failure = code => Object.assign(new Error(code), { code });
async function readLocal(filePath, limit) {
  let file;
  try {
    file = await open(filePath, constants.O_RDONLY | constants.O_NONBLOCK);
    if (!(await file.stat()).isFile()) throw failure('INPUT');
    const bytes = Buffer.alloc(limit + 1); let count = 0;
    while (count < bytes.length) {
      const part = await file.read(bytes, count, bytes.length - count, null);
      if (!part.bytesRead) break;
      count += part.bytesRead;
    }
    return bytes.subarray(0, count);
  } catch { throw failure('INPUT'); }
  finally { await file?.close(); }
}
const escapeText = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
try {
  const args = process.argv.slice(2), options = {}, seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (!['--input', '--summary', '--format', '--help'].includes(key) || seen.has(key)) throw failure('USAGE');
    seen.add(key);
    if (key === '--help') { options.help = true; continue; }
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw failure('USAGE');
    options[key.slice(2)] = args[++i];
  }
  if (options.help) {
    if (args.length !== 1) throw failure('USAGE');
    process.stdout.write(help);
  } else {
    if (!options.input || !options.summary || !['html', 'adf'].includes(options.format)) throw failure('USAGE');
    let runtime;
    try { runtime = await import('../lib/contracts/handoff.mjs'); } catch { throw failure('SETUP'); }
    const bytes = await readLocal(options.input, runtime.HANDOFF_LIMITS.recordBytes);
    // Validate raw bytes first: never parse/stringify away duplicate keys or provenance.
    const record = runtime.extractHandoff(bytes);
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const summaryBytes = await readLocal(options.summary, 2000);
    let summary;
    try { summary = new TextDecoder('utf-8', { fatal: true }).decode(summaryBytes); } catch { throw failure('SUMMARY'); }
    if (summaryBytes.length > 2000 || summary.includes('\0') || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(summary)) throw failure('SUMMARY');
    const body = options.format === 'html'
      ? `<p>${escapeText(summary)}</p><pre><code class="language-yaml">${escapeText(raw)}</code></pre>`
      : { type: 'doc', version: 1, content: [
        { type: 'paragraph', content: summary ? [{ type: 'text', text: summary }] : [] },
        { type: 'codeBlock', attrs: { language: 'yaml' }, content: [{ type: 'text', text: raw }] }
      ] };
    const checked = runtime.extractHandoff(options.format === 'html' ? body : JSON.stringify(body), { format: options.format });
    if (checked.record_digest !== record.record_digest) throw failure('ROUNDTRIP');
    console.log(JSON.stringify({ schema, record_id: record.value.record_id, record_digest: record.record_digest, format: options.format, body }));
  }
} catch (error) {
  const code = error.code && Object.hasOwn(messages, error.code) ? error.code : error.diagnostic ? null : 'INTERNAL';
  const diagnostics = code ? [{ code, path: '', message: messages[code] }] : error.diagnostics ?? [error.diagnostic];
  console.error(JSON.stringify({ schema, valid: false, diagnostics }));
  process.exitCode = ['USAGE', 'INPUT', 'SETUP', 'INTERNAL'].includes(code) ? 2 : 1;
}
