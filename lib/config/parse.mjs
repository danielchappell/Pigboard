import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import canonicalize from 'canonicalize';
import { parseContract, checkValue } from '../contracts/work.mjs';
import { resolveProjects } from './projects.mjs';

export const CONFIG_LIMITS = Object.freeze({ bytes:1048576, depth:16, list:1000 });
export const sections = Object.freeze(['stages','accepted_later_stage_ids','types','actors','repositories','worker_prefixes','opt_in_label','preparation_stage_ids','cancelled_stage_ids']);
const optionalSections=new Set(['preparation_stage_ids','cancelled_stage_ids']);
const schema = JSON.parse(readFileSync(new URL('../../contracts/config-v1.schema.json',import.meta.url),'utf8'));
const ajv = new Ajv2020({ allErrors:true, ownProperties:true, strict:true });
addFormats(ajv,{ mode:'full' });
const validate = ajv.compile(schema), uri = ajv.compile({ type:'string',format:'uri',pattern:'^https://' });
const pointer = s => s.replace(/~/g,'~0').replace(/\//g,'~1');
// Walk actual schema positions; a declared name at the wrong position is still data.
function safePath(path) {
  let node=schema;const out=[];
  for(const part of (typeof path==='string'?path:'').split('/').slice(1)) {
    while(node?.$ref) node=schema.$defs[node.$ref.split('/').at(-1)];
    const key=part.replace(/~1/g,'/').replace(/~0/g,'~');
    if(node?.type==='array' && /^(0|[1-9][0-9]{0,2})$/.test(key) && Number(key)<node.maxItems){out.push(part);node=node.items;}
    else if(node?.properties && Object.hasOwn(node.properties,key)){out.push(pointer(key));node=node.properties[key];}
    else break;
  }
  return out.length?'/'+out.join('/'):'';
}
const messages={STRUCTURE:'Complete the declared configuration structure; remove undeclared fields.',FORMAT:'Use the declared string, ID, label or HTTPS destination format.',DUPLICATE_PROJECT:'Each immutable project ID must occur once.',AMBIGUOUS_MAPPING:'Supply each mapping section exactly once; use distinct native IDs and list entries.',MISSING_MAPPING:'Supply this complete section locally or explicitly inherit an existing default.',EXPECTED_SITE:'Use the independently expected Jira site origin.',LIMIT:'Keep configuration within the documented local input bounds.',PARSE:'Use one valid YAML 1.2 or JSON mapping with supported scalar values.'};
export function configError(code='STRUCTURE',path='') {if(typeof code!=='string'||!Object.hasOwn(messages,code))code='STRUCTURE';const diagnostic={code,path:safePath(path),message:messages[code]??messages.PARSE};return Object.assign(new Error(diagnostic.message),{diagnostic});}
export function httpsURL(value,origin=false) {
  if(typeof value!=='string'||!uri(value))return false;
  try{const u=new URL(value),authority=/^https:\/\/([^/?#]*)/.exec(value)?.[1];return !!u.hostname&&authority!==undefined&&!authority.includes('@')&&!u.username&&!u.password&&(!origin||u.origin===value);}catch{return false;}
}
function fail(code,path){throw configError(code,path);}
export function validateConfigValue(value) {
  try{checkValue(value,{depth:CONFIG_LIMITS.depth,list:CONFIG_LIMITS.list});}
  catch(e){throw configError(['BYTE_LIMIT','DEPTH_LIMIT','LIST_LIMIT'].includes(e.diagnostic?.code)?'LIMIT':'STRUCTURE',e.diagnostic?.path);}
  if(!validate(value)) {
    const e=validate.errors[0];const path=e.instancePath+(e.keyword==='required'?'/'+pointer(e.params.missingProperty):'');
    fail(['maxItems','maxLength'].includes(e.keyword)?'LIMIT':e.keyword==='uniqueItems'?'AMBIGUOUS_MAPPING':['pattern','minLength'].includes(e.keyword)?'FORMAT':'STRUCTURE',path);
  }
  if(!httpsURL(value.jira.site,true))fail('FORMAT','/jira/site');
  const seen=new Set();
  for(const [i,p]of value.projects.entries()){
    const path='/projects/'+i;
    if(seen.has(p.id))fail('DUPLICATE_PROJECT',path+'/id');seen.add(p.id);
    for(const section of sections){const local=Object.hasOwn(p.mappings,section),inherited=p.inherit.includes(section);if(local&&inherited)fail('AMBIGUOUS_MAPPING',path+'/mappings/'+section);if(!local&&!inherited&&!optionalSections.has(section))fail('MISSING_MAPPING',path+'/mappings/'+section);if(inherited&&!Object.hasOwn(value.defaults,section))fail('MISSING_MAPPING',path+'/inherit');}
  }
  for(const [path,m]of [['/defaults',value.defaults],...value.projects.map((p,i)=>['/projects/'+i+'/mappings',p.mappings])]){
    for(const field of ['stages','types'])if(m[field]&&new Set(Object.values(m[field])).size!==Object.values(m[field]).length)fail('AMBIGUOUS_MAPPING',path+'/'+field);
    if(m.repositories?.some(v=>!httpsURL(v)))fail('FORMAT',path+'/repositories');
  }
  for(const[i,p]of value.projects.entries()){
    const stages=p.inherit.includes('stages')?value.defaults.stages:p.mappings.stages;
    const ids=new Set(Object.values(stages));
    for(const section of ['accepted_later_stage_ids','preparation_stage_ids','cancelled_stage_ids']){const values=p.inherit.includes(section)?value.defaults[section]:(p.mappings[section]??[]);for(const id of values){if(ids.has(id))fail('AMBIGUOUS_MAPPING','/projects/'+i+'/mappings/'+section);ids.add(id);}}
  }
  return value;
}
export function parseConfig(input,options={}) {
  const result={valid:false,configuration_digest:null,destination_authority:'not_evaluated',live_readiness:'not_evaluated',resolved_scope:null,diagnostics:[]};
  try{
    try{checkValue(options);if(!options||Array.isArray(options)||typeof options!=='object'||Object.keys(options).some(k=>k!=='expectedSite'))fail('STRUCTURE','');}catch{throw configError('STRUCTURE');}
    if(options.expectedSite!==undefined&&!httpsURL(options.expectedSite,true))fail('EXPECTED_SITE','/jira/site');
    let value;try{value=parseContract(input,CONFIG_LIMITS);}catch(e){const code=e.diagnostic?.code;throw configError(['BYTE_LIMIT','DEPTH_LIMIT','LIST_LIMIT'].includes(code)?'LIMIT':'PARSE',e.diagnostic?.path);}
    validateConfigValue(value);
    if(options.expectedSite!==undefined){if(value.jira.site!==options.expectedSite){result.destination_authority='mismatch';fail('EXPECTED_SITE','/jira/site');}result.destination_authority='matched_expected_site';}
    result.resolved_scope=resolveProjects(value);result.configuration_digest='sha256:'+createHash('sha256').update(canonicalize(value)).digest('hex');result.valid=true;
  }catch(e){result.diagnostics=[e.diagnostic??configError('STRUCTURE').diagnostic];}
  return result;
}
