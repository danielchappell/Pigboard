import { readFileSync } from 'node:fs';
import { parseAllDocuments, isMap, isSeq, isScalar, isAlias, LineCounter } from 'yaml';
import Ajv2020 from 'ajv/dist/2020.js';
export { CONFIG_LIMITS } from '../config/parse.mjs';
import { parseConfig, validateConfigValue } from '../config/parse.mjs';
import { resolveProjects, resolveProject } from '../config/projects.mjs';
import { validateSemantics, validateSchedulingSemantics } from './work-semantics.mjs';

export const LIMITS = Object.freeze({ workBytes: 65536, depth: 32, list: 100, adfBytes: 262144, adfList: 1000, blocks: 100 });
const pointer = key => String(key).replace(/~/g, '~0').replace(/\//g, '~1');
const issue = (code, path, message, extra = {}) => { const { col, ...rest } = extra; return { code, path, message, ...rest, ...(col === undefined ? {} : { column: col }) }; };
const unicodeOK = s => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(s);
const failure = d => { throw Object.assign(new Error(d.message), { diagnostic: d }); };
const ordered = ds => [...new Map(ds.map(d => [JSON.stringify(d), d])).values()].sort((a,b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code) || a.message.localeCompare(b.message));

// Raw validation can retain AST-checked floating-literal provenance only inside
// this synchronous module call. Public JS values have no such provenance.
function walkValue(value, { list = LIMITS.list, depth = LIMITS.depth } = {}, strictNumbers = true) {
  const seen = new Set(), stack = [{ value, path: '', level: 0 }];
  while (stack.length) {
    const { value: v, path: p, level, leave } = stack.pop();
    if (leave) { seen.delete(v); continue; }
    if (typeof v === 'string') { if (!unicodeOK(v)) failure(issue('UNICODE', p, 'Use valid Unicode scalar values.')); }
    else if (typeof v === 'number') { if (!Number.isFinite(v) || (strictNumbers && Number.isInteger(v) && !Number.isSafeInteger(v))) failure(issue('NUMBER', p, 'Use finite numbers and safe integers; quote exact identifiers.')); }
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

export function checkValue(value, options = {}) { return walkValue(value, options, true); }

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
function parsed(text, { list = LIMITS.list, depth = LIMITS.depth, rootMap = true } = {}) {
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
      if (level + 1 > depth) fail('DEPTH_LIMIT', `Use at most ${depth} nested containers.`);
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
export function parseContract(input, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) failure(issue('USAGE', '', 'Supply parser bounds as an object.'));
  const { bytes = LIMITS.workBytes, depth = LIMITS.depth, list = LIMITS.list } = options;
  for (const value of [bytes, depth, list]) if (!Number.isSafeInteger(value) || value <= 0) failure(issue('USAGE', '', 'Use finite positive integer parser bounds.'));
  return parsed(decode(input, bytes), { depth, list });
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
      const language = node.attrs?.language;
      if (language !== undefined && typeof language !== 'string') failure(issue('ADF_BLOCK', '', 'Code block language must be a string when supplied.', { block: index }));
      blocks.push({ text: node.content.map(n => n.text).join(''), index, yaml: typeof language === 'string' && ['yaml','yml'].includes(language.toLowerCase()) });
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
    const reasons = { required: ['MISSING_KEY','Include this declared field, using null for an unresolved draft value.'], additionalProperties: ['UNKNOWN_FIELD','Remove this undeclared field.'], type: ['REQUIRED_VALUE',e.params.type === 'null' ? 'Use null for this alternative.' : `Supply a non-null ${e.params.type}.`], minLength: ['REQUIRED_VALUE','Supply a nonempty string; use null for an unresolved draft value.'], const: ['VALUE','Supply the declared constant.'], enum: ['VALUE','Supply a supported declared value.'], minimum: ['MINIMUM',`Supply a number greater than or equal to ${e.params.limit}.`], maximum: ['MAXIMUM',`Supply a number less than or equal to ${e.params.limit}.`], minItems: ['REQUIRED_ITEMS',`Supply at least ${e.params.limit} items.`], maxItems: ['MAX_ITEMS',`Use at most ${e.params.limit} items.`], uniqueItems: ['DUPLICATE_ITEM','Array items must be distinct.'], oneOf: ['ALTERNATIVE','Supply exactly one complete supported alternative.'], anyOf: ['ALTERNATIVE','Supply a complete supported alternative.'], if: ['CONDITION','Complete the selected conditional structure.'] };
    const [code,message] = reasons[e.keyword] ?? ['STRUCTURE','Complete the declared structure.'];
    return issue(code,p,message);
  }));
}
const contextSchema=JSON.parse(readFileSync(new URL('../../contracts/work-validation-context-v1.schema.json',import.meta.url),'utf8'));
const contextValidator=ajv.compile(contextSchema);
const projectIdSchema=JSON.parse(readFileSync(new URL('../../contracts/config-v1.schema.json',import.meta.url),'utf8')).properties.projects.items.properties.id;
const schedulingValidator=ajv.compile({
  type:'object',additionalProperties:false,
  required:['schema','subject','prerequisite_graph','related_changes'],
  properties:{
    schema:{const:'pigboard-work-scheduling/v1'},
    subject:{type:'object',additionalProperties:false,required:['site','project_id','key'],properties:{site:{type:'string',minLength:1},project_id:structuredClone(projectIdSchema),key:{type:'string',minLength:1}}},
    prerequisite_graph:structuredClone(contextSchema.properties.prerequisite_graph),
    related_changes:structuredClone(contextSchema.properties.related_changes),
  },
});
const installedSkills=JSON.parse(readFileSync(new URL('../../config/skill-bundle.json',import.meta.url),'utf8')).skills;
const resultBase=(mode,format)=>({schema:'pigboard-work-validation/v1',mode,format,document_schema:null,valid:false,draft_valid:null,start_structure_valid:null,start_semantics_valid:null,validation_scope:mode==='start'?'local_start':mode,ledger_budget:null,readiness:'not_evaluated',diagnostics:[],start_diagnostics:[],...(mode==='scheduling'?{purpose:'scheduling',validation_scope:'scheduling_declarations',scheduling_semantics_valid:null,execution_authorized:false}:{})});
function validateDocument(value, { mode = 'draft', format = 'yaml', block, context, contextInput, config, configInput, scheduling, schedulingInput } = {}, strictNumbers = true) {
  const base=resultBase(mode,format);
  try {
    if(!['draft','structure','start','scheduling'].includes(mode))failure(issue('USAGE','','Use draft, structure, scheduling or start mode.'));
    if(mode!=='start'&&(context!==undefined||contextInput!==undefined))failure(issue('USAGE','/context','Supply context only for start mode.'));
    if(mode!=='scheduling'&&[config,configInput,scheduling,schedulingInput].some(v=>v!==undefined))failure(issue('USAGE','','Supply configuration and scheduling facts only for scheduling mode.'));
    if(mode==='scheduling'&&(strictNumbers?[configInput,schedulingInput]:[config,scheduling]).some(v=>v!==undefined))failure(issue('USAGE','','Use value auxiliary inputs with validateValue and raw auxiliary inputs with validateWork.'));
    walkValue(value, undefined, strictNumbers);
    if (!value || typeof value !== 'object' || Array.isArray(value)) failure(issue('ROOT_TYPE','','Supply a root mapping.'));
    base.document_schema = typeof value.schema === 'string' ? value.schema : null;
    if (!Object.hasOwn(validators, base.document_schema)) failure(issue('SCHEMA','/schema','Use pigboard-epic/v1 or pigboard-ticket/v1.'));
    const v = validators[base.document_schema], draft = schemaDiagnostics(v.draft,value), start = schemaDiagnostics(v.start,value);
    const annotate = ds => ds.map(d => block === undefined || ['/context','/config','/scheduling'].some(root=>d.path===root||d.path.startsWith(root+'/')) ? d : { ...d,block });
    base.draft_valid = !draft.length; base.start_structure_valid = !start.length;
    base.valid = mode === 'draft' ? base.draft_valid : base.start_structure_valid;
    base.diagnostics = annotate(mode === 'draft' ? draft : start);
    base.start_diagnostics = mode === 'draft' ? annotate(start) : [];
    if(mode==='scheduling'&&!start.length){
      let facts,scope;
      const auxiliaryFailure=(diagnostics)=>{base.valid=false;base.diagnostics=diagnostics;return base;};
      try {
        if(strictNumbers){
          if(config===undefined)failure(issue('CONFIG_REQUIRED','','Supply a separate canonical configuration value.'));
          validateConfigValue(config);scope=resolveProjects(config);
        }else{
          if(configInput===undefined)failure(issue('CONFIG_REQUIRED','','Supply separate raw canonical configuration text or bytes.'));
          const parsed=parseConfig(configInput);
          if(!parsed.valid)return auxiliaryFailure(parsed.diagnostics.map(d=>({...d,path:'/config'+d.path})));
          scope=parsed.resolved_scope;
        }
      }catch(e){if(!e.diagnostic)throw e;return auxiliaryFailure([{...e.diagnostic,path:'/config'+e.diagnostic.path}]);}
      try {
        if(strictNumbers){if(scheduling===undefined)failure(issue('SCHEDULING_REQUIRED','','Supply a separate scheduling facts value.'));walkValue(scheduling);facts=scheduling;}
        else{if(schedulingInput===undefined)failure(issue('SCHEDULING_REQUIRED','','Supply separate raw scheduling text or bytes.'));facts=parseWork(schedulingInput);}
      }catch(e){if(!e.diagnostic)throw e;return auxiliaryFailure([{...e.diagnostic,path:'/scheduling'+e.diagnostic.path}]);}
      const invalid=schemaDiagnostics(schedulingValidator,facts).map(d=>({...d,path:'/scheduling'+d.path}));
      if(invalid.length)return auxiliaryFailure(invalid);
      let project;
      try{project=resolveProject(scope,{site:facts.subject.site,project_id:facts.subject.project_id});}
      catch{base.valid=false;base.scheduling_semantics_valid=false;base.diagnostics=[issue('TRUSTED_SCOPE','/scheduling/subject','Select the exact site and immutable project ID in canonical configuration.')];return base;}
      const semantic=validateSchedulingSemantics(value,facts,project,installedSkills);
      base.diagnostics=annotate(ordered(semantic.diagnostics));base.ledger_budget=semantic.ledger_budget;
      base.scheduling_semantics_valid=!base.diagnostics.length;base.valid=base.scheduling_semantics_valid;
    }
    if(mode==='start'&&!start.length){
      let facts;
      try {
        if(strictNumbers){ if(context===undefined)failure(issue('CONTEXT_REQUIRED','','Supply a separate trusted context value for start mode.'));walkValue(context);facts=context; }
        else { if(contextInput===undefined)failure(issue('CONTEXT_REQUIRED','','Supply separate raw context text or bytes for start mode.'));facts=parseWork(contextInput); }
      }catch(e){if(!e.diagnostic)throw e;base.diagnostics=[{...e.diagnostic,path:'/context'+e.diagnostic.path}];base.valid=false;base.start_semantics_valid=false;return base;}
      const invalid=schemaDiagnostics(contextValidator,facts).map(d=>({...d,path:'/context'+d.path}));
      if(invalid.length){base.diagnostics=invalid;base.valid=false;base.start_semantics_valid=false;return base;}
      const semantic=validateSemantics(value,facts,installedSkills);base.diagnostics=annotate(ordered(semantic.diagnostics));base.ledger_budget=semantic.ledger_budget;base.start_semantics_valid=!base.diagnostics.length;base.valid=base.start_semantics_valid;
    }
  } catch (e) { if (!e.diagnostic) throw e; base.valid=false;base.diagnostics = [e.diagnostic]; }
  return base;
}
export function validateValue(value, options = {}) { return validateDocument(value, options, true); }
export function validateWork(input, options = {}) {
  const {mode='draft',format='yaml'}=options;
  try { const extracted = format === 'adf' ? extractADF(input) : { value: parseWork(input) }; return validateDocument(extracted.value,{...options,mode,format,block:extracted.block},false); }
  catch (e) { if (!e.diagnostic) throw e; return {...resultBase(mode,format),diagnostics:[e.diagnostic]}; }
}
