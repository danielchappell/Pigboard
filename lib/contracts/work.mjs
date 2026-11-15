import { readFileSync } from 'node:fs';
import { parseAllDocuments, isMap, isSeq, isScalar, isAlias, LineCounter } from 'yaml';
import Ajv2020 from 'ajv/dist/2020.js';

export const LIMITS = Object.freeze({ workBytes: 65536, depth: 32, list: 100, adfBytes: 262144, adfList: 1000, blocks: 100 });
const pointer = key => String(key).replace(/~/g, '~0').replace(/\//g, '~1');
const issue = (code, path, message, extra = {}) => { const { col, ...rest } = extra; return { code, path, message, ...rest, ...(col === undefined ? {} : { column: col }) }; };
const unicodeOK = s => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(s);
const failure = d => { throw Object.assign(new Error(d.message), { diagnostic: d }); };
const ordered = ds => [...new Map(ds.map(d => [JSON.stringify(d), d])).values()].sort((a,b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code) || a.message.localeCompare(b.message));

// This guard also protects exported JS-value callers before schema evaluation.
export function checkValue(value, { list = LIMITS.list, depth = LIMITS.depth } = {}) {
  const seen = new Set(), stack = [{ value, path: '', level: 0 }];
  while (stack.length) {
    const { value: v, path: p, level, leave } = stack.pop();
    if (leave) { seen.delete(v); continue; }
    if (typeof v === 'string') { if (!unicodeOK(v)) failure(issue('UNICODE', p, 'Use valid Unicode scalar values.')); }
    else if (typeof v === 'number') { if (!Number.isFinite(v)) failure(issue('NUMBER', p, 'Use finite numbers and safe integers; quote exact identifiers.')); }
    else if (v !== null && typeof v === 'object') {
      if (seen.has(v)) failure(issue('VALUE_DOMAIN', p, 'Use acyclic JSON values.'));
      seen.add(v); stack.push({ value:v, leave:true });
      if (level + 1 > depth) failure(issue('DEPTH_LIMIT', p, `Use at most ${depth} nested containers.`));
      if (!Array.isArray(v) && ![Object.prototype, null].includes(Object.getPrototypeOf(v))) failure(issue('VALUE_DOMAIN', p, 'Use plain JSON objects.'));
      if (Reflect.ownKeys(v).some(k => typeof k !== 'string')) failure(issue('KEY_TYPE', p, 'Use string object keys.'));
      if (Array.isArray(v) && v.length > list) failure(issue('LIST_LIMIT', p, `Use at most ${list} array items.`));
      for (const k of Object.getOwnPropertyNames(v).filter(k => !(Array.isArray(v) && k === 'length'))) {
        if (!unicodeOK(k)) failure(issue('UNICODE', p + '/' + pointer(k), 'Use valid Unicode scalar values in keys.'));
        const descriptor = Object.getOwnPropertyDescriptor(v, k);
        if (!descriptor.enumerable) failure(issue('VALUE_DOMAIN', p + '/' + pointer(k), 'Use enumerable JSON data properties.'));
        if (!('value' in descriptor)) failure(issue('VALUE_DOMAIN', p + '/' + pointer(k), 'Use data properties, without accessors.'));
        stack.push({ value: descriptor.value, path: p + '/' + pointer(k), level: level + 1 });
      }
      if (Array.isArray(v) && (Object.keys(v).length !== v.length || Object.keys(v).some((k,i) => k !== String(i)))) failure(issue('VALUE_DOMAIN', p, 'Use dense JSON arrays.'));
    } else if (v !== null && !['boolean'].includes(typeof v)) failure(issue('VALUE_DOMAIN', p, 'Use JSON-compatible values.'));
  }
  return value;
}

const parseOptions = { version: '1.2', schema: 'core', strict: true, uniqueKeys: true, intAsBigInt: true, stringKeys: false, merge: false, prettyErrors: false };
const coreTags = new Set(['tag:yaml.org,2002:str','tag:yaml.org,2002:null','tag:yaml.org,2002:bool','tag:yaml.org,2002:int','tag:yaml.org,2002:float','tag:yaml.org,2002:map','tag:yaml.org,2002:seq']);
function decode(input, limit) {
  if (!(typeof input === 'string' || input instanceof Uint8Array)) failure(issue('INPUT', '', 'Supply UTF-8 text or bytes.'));
  const bytes = typeof input === 'string' ? Buffer.from(input) : input;
  if (bytes.byteLength > limit) failure(issue('BYTE_LIMIT', '', `Use at most ${limit} UTF-8 bytes.`));
  if (typeof input === 'string' && !unicodeOK(input)) failure(issue('UNICODE', '', 'Use valid Unicode scalar values.'));
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { failure(issue('UTF8', '', 'Encode the input as valid UTF-8.')); }
}
function documents(text) {
  const lines = new LineCounter();
  let docs;
  try { docs = parseAllDocuments(text, { ...parseOptions, lineCounter: lines }); }
  catch { failure(issue('YAML_SYNTAX', '', 'YAML parsing failed within local resource limits.')); }
  return { docs, lines };
}
function parsed(text, { list = LIMITS.list, rootMap = true } = {}) {
  const { docs, lines } = documents(text);
  if (docs.length !== 1 || !docs[0].contents) failure(issue('DOCUMENT_COUNT', '', 'Supply exactly one nonempty document.'));
  const doc = docs[0];
  const errors = [...doc.errors, ...doc.warnings];
  if (errors.some(e => e.code !== 'DUPLICATE_KEY')) {
    const e = errors[0], pos = lines.linePos(e.pos?.[0] ?? 0);
    failure(issue(e.code === 'DUPLICATE_KEY' ? 'DUPLICATE_KEY' : 'YAML_SYNTAX', '', e.code === 'DUPLICATE_KEY' ? 'Each mapping key must occur once.' : 'Use unambiguous YAML 1.2 core syntax and supported tags.', pos));
  }
  if (doc.directives.yaml.version !== '1.2' || /^%[^\n]*/m.test(text.replace(/^%YAML 1\.2[^\S\n]*(?:#.*)?$/gm, ''))) failure(issue('DIRECTIVE', '', 'Only the YAML 1.2 version directive is supported.'));
  if (rootMap && !isMap(doc.contents)) failure(issue('ROOT_TYPE', '', 'Supply a root mapping.'));
  function convert(node, p, level) {
    const location = node?.range ? lines.linePos(node.range[0]) : {};
    const fail = (code, message) => failure(issue(code, p, message, location));
    if (isAlias(node)) fail('ALIAS', 'Aliases are not supported; write the value explicitly.');
    if (node?.tag && !coreTags.has(node.tag)) fail('TAG', 'Only JSON-compatible YAML core tags are supported.');
    if (isMap(node) || isSeq(node)) {
      if (level + 1 > LIMITS.depth) fail('DEPTH_LIMIT', 'Use at most 32 nested containers.');
      if (isSeq(node)) {
        if (node.items.length > list) fail('LIST_LIMIT', `Use at most ${list} array items.`);
        return node.items.map((v,i) => convert(v, p + '/' + i, level + 1));
      }
      const result = Object.create(null), keys = new Set();
      for (const pair of node.items) {
        if (!isScalar(pair.key) || typeof pair.key.value !== 'string') fail('KEY_TYPE', 'Mapping keys must already be strings.');
        const k = pair.key.value, child = p + '/' + pointer(k);
        if (!unicodeOK(k)) failure(issue('UNICODE', child, 'Use valid Unicode scalar values in keys.', location));
        if (keys.has(k)) failure(issue('DUPLICATE_KEY', child, 'Each mapping key must occur once.', location));
        keys.add(k); result[k] = convert(pair.value, child, level + 1);
      }
      return result;
    }
    if (node === null) return null;
    if (!isScalar(node)) fail('VALUE_DOMAIN', 'Use JSON-compatible scalar values.');
    let v = node.value;
    if (typeof v === 'bigint') {
      if (v > 9007199254740991n || v < -9007199254740991n) fail('NUMBER', 'Quote integer identifiers outside the safe integer range.');
      v = Number(v);
    }
    if (typeof v === 'number' && (!Number.isFinite(v))) fail('NUMBER', 'Use finite numbers and safe integers.');
    if (typeof v === 'string' && !unicodeOK(v)) fail('UNICODE', 'Use valid Unicode scalar values.');
    if (v !== null && !['number','boolean','string'].includes(typeof v)) fail('VALUE_DOMAIN', 'Use JSON-compatible scalar values.');
    return v;
  }
  const value = convert(doc.contents, '', 0);
  if (errors.length) failure(issue('DUPLICATE_KEY', '', 'Each mapping key must occur once.'));
  return value;
}
export function parseWork(input) { return parsed(decode(input, LIMITS.workBytes)); }

export function extractADF(input) {
  const text = decode(input, LIMITS.adfBytes);
  try { JSON.parse(text); } catch { failure(issue('ADF_JSON', '', 'Supply a JSON description document.')); }
  const envelope = parsed(text, { list: LIMITS.adfList });
  if (envelope.type !== 'doc' || envelope.version !== 1 || !Array.isArray(envelope.content)) failure(issue('ADF_SHAPE', '', 'Supply an ADF doc version 1 with content.'));
  const blocks = [], stack = [...envelope.content].reverse();
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object' || Array.isArray(node) || typeof node.type !== 'string') failure(issue('ADF_SHAPE', '', 'ADF content must contain typed nodes.'));
    if (node.type === 'codeBlock') {
      const index = blocks.length;
      if (index >= LIMITS.blocks) failure(issue('BLOCK_LIMIT', '', 'Use at most 100 ADF code blocks.', { block: index }));
      if (!Array.isArray(node.content) || node.content.some(n => !n || n.type !== 'text' || typeof n.text !== 'string' || n.content !== undefined)) failure(issue('ADF_BLOCK', '', 'Code blocks must contain only text children.', { block: index }));
      blocks.push({ text: node.content.map(n => n.text).join(''), index, yaml: ['yaml','yml'].includes(node.attrs?.language?.toLowerCase?.()) });
    } else if (node.content !== undefined) {
      if (!Array.isArray(node.content)) failure(issue('ADF_SHAPE', '', 'ADF node content must be an array.'));
      stack.push(...[...node.content].reverse());
    }
  }
  const candidates = [];
  for (const block of blocks) {
    const { docs } = documents(block.text);
    const hasFamily = docs.some(d => isMap(d.contents) && d.contents.items.some(p => isScalar(p.key) && p.key.value === 'schema' && isScalar(p.value) && typeof p.value.value === 'string' && /^(pigboard-epic|pigboard-ticket)\//.test(p.value.value)));
    if (block.yaml && docs.some(d => d.errors.length || d.warnings.length)) failure(issue('ADF_BLOCK', '', 'YAML-designated block cannot be inspected safely.', { block: block.index }));
    if (hasFamily) candidates.push(block);
  }
  if (candidates.length !== 1) failure(issue('WORK_BLOCK_COUNT', '', 'Supply exactly one Epic or ticket code block.'));
  const selected = candidates[0];
  try { return { value: parseWork(selected.text), block: selected.index }; }
  catch (e) { if (e.diagnostic) e.diagnostic.block = selected.index; throw e; }
}

export const canonicalSchemas = Object.fromEntries(['epic','ticket'].map(kind => [ `pigboard-${kind}/v1`, JSON.parse(readFileSync(new URL(`../../contracts/${kind}-v1.schema.json`, import.meta.url), 'utf8')) ]));
const deferred = new Set(['/properties/testing_strategy','/properties/testing_strategy/properties/environment','/properties/testing_strategy/properties/fixtures/items','/$defs/cleanup','/$defs/artifact','/$defs/api','/$defs/database','/$defs/ui/properties/viewport','/$defs/ui','/$defs/step','/$defs/case/properties/observation']);
export function draftSchema(schema) {
  function project(s, p = '') {
    if (typeof s !== 'object' || s === null) return s;
    if (Array.isArray(s)) return s.map((v,i) => project(v,p+'/'+i));
    const out = {};
    for (const [k,v] of Object.entries(s)) {
      if (k === 'minItems' || (p === '/properties/open_questions' && k === 'maxItems') || (deferred.has(p) && ['oneOf','allOf','if','then','else'].includes(k))) continue;
      if (k === 'properties' || k === '$defs') {
        out[k] = Object.fromEntries(Object.entries(v).map(([name, child]) => {
          const projected = project(child,p+'/'+k+'/'+name);
          return [name, k === 'properties' && !(p === '' && name === 'schema') ? { anyOf: [projected, { type: 'null' }] } : projected];
        }));
      } else if (k === 'items') out[k] = { anyOf: [project(v,p+'/items'), { type:'null' }] };
      else if (['anyOf','oneOf','allOf','additionalProperties'].includes(k)) out[k] = project(v,p+'/'+k);
      else out[k] = structuredClone(v);
    }
    return out;
  }
  const result = project(schema); result.$id += ':draft'; return result;
}
// Approved alternative fragments omit type; the observation schedule deliberately
// leaves its prefixItems tuple open. Disable only these lint checks, not validation.
const ajv = new Ajv2020({ allErrors: true, ownProperties: true, strict: true, strictTypes: false, strictTuples: false, allowUnionTypes: true });
const validators = Object.fromEntries(Object.entries(canonicalSchemas).map(([id,s]) => [id,{ start: ajv.compile(s), draft: ajv.compile(draftSchema(s)) }]));
function schemaDiagnostics(validate, value) {
  if (validate(value)) return [];
  return ordered(validate.errors.map(e => {
    let p = e.instancePath;
    if (e.keyword === 'required') p += '/' + pointer(e.params.missingProperty);
    if (e.keyword === 'additionalProperties') p += '/' + pointer(e.params.additionalProperty);
    const reasons = { required: ['MISSING_KEY','Include this declared field, using null for an unresolved draft value.'], additionalProperties: ['UNKNOWN_FIELD','Remove this undeclared field.'], type: ['REQUIRED_VALUE',e.params.type === 'null' ? 'Use null for this alternative.' : `Supply a non-null ${e.params.type}.`], minLength: ['REQUIRED_VALUE','Supply a nonempty string; use null for an unresolved draft value.'], const: ['VALUE','Supply the declared constant.'], enum: ['VALUE','Supply a supported declared value.'], minItems: ['REQUIRED_ITEMS',`Supply at least ${e.params.limit} items.`], maxItems: ['MAX_ITEMS',`Use at most ${e.params.limit} items.`], uniqueItems: ['DUPLICATE_ITEM','Array items must be distinct.'], oneOf: ['ALTERNATIVE','Supply exactly one complete supported alternative.'], anyOf: ['ALTERNATIVE','Supply a complete supported alternative.'], if: ['CONDITION','Complete the selected conditional structure.'] };
    const [code,message] = reasons[e.keyword] ?? ['STRUCTURE','Complete the declared structure.'];
    return issue(code,p,message);
  }));
}
export function validateValue(value, { mode = 'draft', format = 'yaml', block } = {}) {
  const base = { schema:'pigboard-work-validation/v1', mode, format, document_schema:null, valid:false, draft_valid:null, start_structure_valid:null, readiness:'not_evaluated', diagnostics:[], start_diagnostics:[] };
  try {
    checkValue(value);
    if (!value || typeof value !== 'object' || Array.isArray(value)) failure(issue('ROOT_TYPE','','Supply a root mapping.'));
    base.document_schema = typeof value.schema === 'string' ? value.schema : null;
    if (!Object.hasOwn(validators, base.document_schema)) failure(issue('SCHEMA','/schema','Use pigboard-epic/v1 or pigboard-ticket/v1.'));
    const v = validators[base.document_schema], draft = schemaDiagnostics(v.draft,value), start = schemaDiagnostics(v.start,value);
    const annotate = ds => ds.map(d => block === undefined ? d : { ...d,block });
    base.draft_valid = !draft.length; base.start_structure_valid = !start.length;
    base.valid = mode === 'draft' ? base.draft_valid : base.start_structure_valid;
    base.diagnostics = annotate(mode === 'draft' ? draft : start);
    base.start_diagnostics = mode === 'draft' ? annotate(start) : [];
  } catch (e) { if (!e.diagnostic) throw e; base.diagnostics = [e.diagnostic]; }
  return base;
}
export function validateWork(input, { mode = 'draft', format = 'yaml' } = {}) {
  try { const extracted = format === 'adf' ? extractADF(input) : { value: parseWork(input) }; return validateValue(extracted.value,{mode,format,block:extracted.block}); }
  catch (e) { if (!e.diagnostic) throw e; return { schema:'pigboard-work-validation/v1',mode,format,document_schema:null,valid:false,draft_valid:null,start_structure_valid:null,readiness:'not_evaluated',diagnostics:[e.diagnostic],start_diagnostics:[] }; }
}
