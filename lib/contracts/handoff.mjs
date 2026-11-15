import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import canonicalize from 'canonicalize';
import { parseFragment } from 'parse5';
import { checkValue, parseContract } from './work.mjs';

export const HANDOFF_LIMITS = Object.freeze({ recordBytes: 16384, depth: 16, list: 100, wrapperBytes: 65536, wrapperDepth: 32, wrapperNodes: 1000, wrapperChildren: 100 });
const pointer = value => String(value).replace(/~/g, '~0').replace(/\//g, '~1');
const diagnostic = (code, path, message, extra = {}) => ({ code, path, message, ...extra });
const fail = (code, path, message, extra = {}) => { throw Object.assign(new Error(message), { diagnostic: diagnostic(code, path, message, extra) }); };
const unicodeOK = text => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(text);
const sorted = diagnostics => [...new Map(diagnostics.map(d => [JSON.stringify(d), d])).values()].sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code));

export const recordSchema = JSON.parse(readFileSync(new URL('../../contracts/handoff-v1.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, ownProperties: true, strict: true, strictTypes: false });
addFormats(ajv, { mode: 'full' });
// Ajv's default uniqueItems helper calls valueOf on objects, which is unsafe
// for the parser's null-prototype maps (and for JSON keys named valueOf).
// The domain is already JSON-only, so JCS equality preserves deep uniqueness.
ajv.removeKeyword('uniqueItems');
ajv.addKeyword({ keyword: 'uniqueItems', type: 'array', schemaType: 'boolean', errors: false, validate: (required, values) => !required || new Set(values.map(value => canonicalize(value))).size === values.length });
const validRecord = ajv.compile(recordSchema);
const validURL = ajv.compile({ type: 'string', format: 'uri', pattern: '^https://' });

// URI validation does not repair or normalize supplied strings. In particular,
// an exact allowlist match cannot make credential-bearing references acceptable.
function urlOK(value) {
  if (!validURL(value)) return false;
  try {
    const parsed = new URL(value), authority = /^https:\/\/([^/?#]*)/.exec(value)?.[1];
    return parsed.protocol === 'https:' && Boolean(parsed.hostname) && authority !== undefined && !authority.includes('@') && !parsed.username && !parsed.password;
  } catch { return false; }
}
export function checkURLs(value, path = '') {
  const diagnostics = [], stack = [{ value, path }];
  const check = (value, path) => { if (!urlOK(value)) diagnostics.push(diagnostic('FORMAT', path, 'Supply a valid HTTPS reference without user information.')); };
  while (stack.length) {
    const entry = stack.pop();
    if (!entry.value || typeof entry.value !== 'object') continue;
    for (const [key, child] of Object.entries(entry.value)) {
      const path = entry.path + '/' + pointer(key);
      if (key === 'repository' || key === 'uri') check(child, path);
      else if ((key === 'repositories' || key === 'evidence_uris') && Array.isArray(child)) {
        child.forEach((item, index) => { if (typeof item === 'string') check(item, path + '/' + index); });
      }
      if (child !== null && typeof child === 'object') stack.push({ value: child, path });
    }
  }
  return sorted(diagnostics);
}
function schemaDiagnostics(value) {
  if (validRecord(value)) return [];
  return sorted(validRecord.errors.map(error => {
    let path = error.instancePath;
    if (error.keyword === 'required') path += '/' + pointer(error.params.missingProperty);
    if (error.keyword === 'additionalProperties') path += '/' + pointer(error.params.additionalProperty);
    return diagnostic(error.keyword === 'format' ? 'FORMAT' : 'STRUCTURE', path,
      error.keyword === 'required' ? 'Include this required field, retaining explicit nulls where declared.' :
      error.keyword === 'additionalProperties' ? 'Remove this undeclared field.' :
      error.keyword === 'format' ? 'Supply the declared UUID or URI format.' :
      'Supply the complete declared handoff structure and supported values.');
  }));
}
const hash = value => 'sha256:' + createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
export function digestValue(value) { checkValue(value); return hash(value); }

function decode(input, limit) {
  if (!(typeof input === 'string' || input instanceof Uint8Array)) fail('INPUT', '', 'Supply UTF-8 text or bytes.');
  if (typeof input === 'string' && !unicodeOK(input)) fail('UNICODE', '', 'Use valid Unicode scalar values.');
  const bytes = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  if (bytes.byteLength > limit) fail('BYTE_LIMIT', '', `Use at most ${limit} UTF-8 bytes.`);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { fail('UTF8', '', 'Encode the input as valid UTF-8.'); }
}
function noBlocks() { fail('HANDOFF_BLOCK_COUNT', '', 'Supply exactly one supported handoff code block.', { blocks: 0 }); }
function onlyBlock(blocks) {
  if (!blocks.length) noBlocks();
  if (blocks.length !== 1) fail('HANDOFF_BLOCK_COUNT', '', 'Supply exactly one supported handoff code block.', { blocks: blocks.length });
  return blocks[0];
}
function fromADF(text) {
  try { JSON.parse(text); } catch { fail('ADF_JSON', '', 'Supply an ADF JSON document.'); }
  const doc = parseContract(text, { bytes: HANDOFF_LIMITS.wrapperBytes, depth: HANDOFF_LIMITS.wrapperDepth, list: HANDOFF_LIMITS.wrapperChildren });
  const values = [{ value: doc, path: '' }];
  while (values.length) {
    const { value, path } = values.pop();
    if (typeof value === 'string' && value.includes('\0')) fail('ADF_SHAPE', path, 'Use wrapper text without NUL characters.');
    if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
      if (key.includes('\0')) fail('ADF_SHAPE', path, 'Use wrapper keys without NUL characters.');
      values.push({ value: child, path: path + '/' + pointer(key) });
    }
  }
  if (doc.type !== 'doc' || doc.version !== 1 || !Array.isArray(doc.content)) fail('ADF_SHAPE', '', 'Supply an ADF doc version 1 with content.');
  const blocks = [], stack = [{ node: doc, path: '' }];
  let count = 0;
  while (stack.length) {
    const { node, path } = stack.pop();
    if (++count > HANDOFF_LIMITS.wrapperNodes) fail('NODE_LIMIT', path, 'Use at most 1000 wrapper nodes.');
    if (!node || typeof node !== 'object' || Array.isArray(node) || typeof node.type !== 'string') fail('ADF_SHAPE', path, 'ADF content must contain typed nodes.');
    if (node.type === 'text' && (typeof node.text !== 'string' || node.text.includes('\0'))) fail('ADF_SHAPE', path, 'Use valid text nodes without NUL characters.');
    if (node.content !== undefined && !Array.isArray(node.content)) fail('ADF_SHAPE', path + '/content', 'ADF node content must be an array.');
    if (node.type === 'codeBlock') blocks.push({ node, path });
    if (node.content) for (let index = node.content.length - 1; index >= 0; index--) stack.push({ node: node.content[index], path: path + '/content/' + index });
  }
  const { node, path } = onlyBlock(blocks);
  if (!['yaml', 'yml'].includes(node.attrs?.language?.toLowerCase?.()) || !Array.isArray(node.content) || node.content.some(child => child.type !== 'text' || typeof child.text !== 'string' || child.content !== undefined)) fail('ADF_BLOCK', path, 'Use a YAML code block containing only text children.');
  return node.content.map(child => child.text).join('');
}
function fromHTML(text) {
  const errors = [];
  const fragment = parseFragment(text, { scriptingEnabled: false, sourceCodeLocationInfo: true, onParseError: error => errors.push(error) });
  if (errors.length) fail('HTML_PARSE', '', 'Supply complete HTML with valid character references.');
  const blocks = [], stack = [{ node: fragment, depth: 1 }];
  let count = 0;
  while (stack.length) {
    const { node, depth } = stack.pop();
    if (++count > HANDOFF_LIMITS.wrapperNodes) fail('NODE_LIMIT', '', 'Use at most 1000 wrapper nodes.');
    if (depth > HANDOFF_LIMITS.wrapperDepth) fail('DEPTH_LIMIT', '', 'Use at most 32 wrapper levels.');
    if (node.nodeName === '#text' && node.value.includes('\0')) fail('HTML_PARSE', '', 'Use HTML without NUL characters.');
    if (node.tagName === 'pre') blocks.push(node);
    else if (node.tagName === 'code' && node.parentNode?.tagName !== 'pre' && node.attrs.some(attr => attr.name === 'class' && attr.value.split(/\s+/).some(token => ['language-yaml', 'language-yml'].includes(token)))) blocks.push(node);
    const children = node.childNodes ?? [];
    if (children.length > HANDOFF_LIMITS.wrapperChildren) fail('LIST_LIMIT', '', 'Use at most 100 children per wrapper node.');
    for (let index = children.length - 1; index >= 0; index--) stack.push({ node: children[index], depth: depth + 1 });
    if (node.content) stack.push({ node: node.content, depth: depth + 1 });
  }
  const pre = onlyBlock(blocks);
  const code = pre.childNodes?.find(node => node.tagName === 'code');
  if (pre.tagName !== 'pre' || !code) fail('HTML_BLOCK', '', 'Use a complete pre/code YAML block containing only text.');
  const language = code.attrs.find(attr => attr.name === 'class')?.value.split(/\s+/) ?? [];
  if (!language.some(token => ['language-yaml', 'language-yml'].includes(token)) || !code.sourceCodeLocation?.endTag || !pre.sourceCodeLocation?.endTag ||
      code.childNodes.some(node => node.nodeName !== '#text') || pre.childNodes.some(node => node !== code && (node.nodeName !== '#text' || node.value.trim()))) fail('HTML_BLOCK', '', 'Use a complete pre/code YAML block containing only text.');
  return code.childNodes.map(node => node.value).join('');
}

export function extractHandoff(input, { format = 'yaml' } = {}) {
  if (!['yaml', 'adf', 'html'].includes(format)) fail('USAGE', '', 'Use yaml, adf or html record format.');
  let raw = input;
  if (format !== 'yaml') {
    const wrapper = decode(input, HANDOFF_LIMITS.wrapperBytes);
    if (wrapper.includes('\0')) fail('PARSE', '', 'Use a wrapper without NUL characters.');
    raw = format === 'adf' ? fromADF(wrapper) : fromHTML(wrapper);
  }
  const value = parseContract(raw, { bytes: HANDOFF_LIMITS.recordBytes, depth: HANDOFF_LIMITS.depth, list: HANDOFF_LIMITS.list });
  const diagnostics = sorted([...schemaDiagnostics(value), ...checkURLs(value)]);
  if (diagnostics.length) throw Object.assign(new Error('Complete the declared record contract.'), { diagnostic: diagnostics[0], diagnostics });
  return { value, record_digest: hash(value) };
}
export function validateHandoff(input, options = {}) {
  const result = { schema: 'pigboard-handoff-validation/v1', mode: 'record', valid: false, validation_scope: 'record', live_freshness: 'not_evaluated', record_digest: null, target: null, outcome: null, completion_established: false, ai_steps: null, human_pending: null, diagnostics: [] };
  try {
    const { value, record_digest } = extractHandoff(input, options);
    result.valid = true; result.record_digest = record_digest; result.outcome = value.kind;
  } catch (error) {
    if (!error.diagnostic) throw error;
    result.diagnostics = sorted(error.diagnostics ?? [error.diagnostic]);
  }
  return result;
}
