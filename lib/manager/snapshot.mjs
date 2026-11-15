import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import canonicalize from 'canonicalize';
import { parseContract, parseWork, extractADF, validateWork, canonicalSchemas } from '../contracts/work.mjs';
import { receiptInputSchema, validateReceiptChain } from '../contracts/receipts.mjs';
import { streamKey } from '../config/projects.mjs';

export const SNAPSHOT_LIMITS=Object.freeze({bytes:16*1024*1024,depth:48,list:1000,projects:100,epics:100,issues:1000,streams:1000,receipts:100});
const text={type:'string',minLength:1,maxLength:255,pattern:'\\S'},id={...text,pattern:'^[0-9]+$'},flag={type:'boolean'};
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const list=(items,max=1000)=>({type:'array',items,maxItems:max});
const nullable=s=>({anyOf:[s,{type:'null'}]});
const reference=structuredClone(receiptInputSchema.$defs.reference);
for(const field of ['ticket_id','comment_id'])reference.properties[field].maxLength=255;
const pointer=JSON.parse(readFileSync(new URL('../../contracts/work-pointer-v1.schema.json',import.meta.url)));
for(const field of ['ticket_id','comment_id'])pointer.properties.assignment.properties[field].maxLength=255;
const body=nullable({type:'string',maxLength:262144});
const scope={project_id:id,label:text};
export const snapshotSchema={...obj({
 schema:{const:'pigboard-manager-snapshot/v1'},site:{type:'string',maxLength:2048},discovery_complete:flag,retained_complete:flag,
 projects:list(obj({project_id:id,complete:flag}),100),
 issues:list(obj({id,key:text,project_id:id,type_id:id,status_id:id,parent_id:nullable(id),labels:{...list(text,100),uniqueItems:true},format:{enum:['yaml','adf']},body,context_body:body,pointer:nullable(pointer),required_requests:list(reference,100)})),
 retained_members:list(obj({ticket_id:id,project_id:id,epic_id:id,label:text,assignment:nullable(reference)})),
 stream_checks:list(obj({...scope,known_ids_complete:flag,repair_inventory_complete:flag})),
 pending_intents:list(obj({...scope,ticket_id:id,attempt_id:text})),
 required_repairs:list(obj({...scope,ticket_id:id,reason:{enum:['required_request','required_stack_update']},references:{...list(reference,100),minItems:1}})),
 completion_receipts:list({type:'string',maxLength:8*1024*1024},100)
}),$defs:receiptInputSchema.$defs};
const ajv=new Ajv2020({allErrors:true,strict:false,ownProperties:true});addFormats(ajv);const validate=ajv.compile(snapshotSchema);
export const digest=value=>'sha256:'+createHash('sha256').update(canonicalize(value),'utf8').digest('hex');
export const equal=(a,b)=>canonicalize(a)===canonicalize(b);
const messages={STRUCTURE:'Supply every declared snapshot field once with its supported type; remove unknown fields.',LIMIT:'Keep inputs within the documented offline preview limits.',SCOPE:'Supply exactly the configured site and immutable project inventory.',INCOMPLETE_SNAPSHOT:'Obtain complete discovery and retained inventory before previewing.',INCOMPLETE_PROJECT:'Obtain the complete native inventory for this project.',INCOMPLETE_STREAM:'Supply complete known-ID and repair inventory checks for this stream.',MISSING_KNOWN_ID:'Supply native facts for every referenced or retained stable ticket ID.',MEMBERSHIP_MISMATCH:'Reconcile original and current project, parent, full label and Epic membership without dropping retained work.',OWNERSHIP_CONFLICT:'Reconcile competing Epic or retained ownership before choosing work.',UNKNOWN_STATUS:'Map the native status explicitly in canonical configuration.',PENDING_INTENT:'Resolve the retained manager intent through its owner; preview cannot clear it.',INVALID_WORK:'Correct the raw work and trusted context start contract, repository or prerequisite graph.',REPAIR_POLICY_PENDING:'Unproved repair work remains; full repair ordering belongs to PGB-81.',REPAIR_ACCOUNTED_FOR:'Current exactly bound canonical QA accounts for the retained repair obligations.',CHANGED_INPUT:'Inputs changed; evaluate this new snapshot before using its proposal.',NO_OPT_IN:'No configured opt-in Epic grants authority for this stream.',EPIC_PAUSED:'The opted-in Epic is paused; existing workers may finish their own cycle.',NO_READY_CANDIDATE:'No eligible Ready to Work candidate exists in the current Epic order.',PREREQUISITE_UNSATISFIED:'Obtain current coherent canonical AI-QA completion for every prerequisite.',OCCUPIED:'An existing automated cycle occupies this stream.',BLOCKED:'A known Blocked member holds this stream for human handling.',HUMAN_REVIEW_CAP:'One return would exceed five Human Review tickets.',INCONSISTENT_OCCUPANCY:'Multiple automated cycles are present; hold new work without interrupting them.'};
export const reason=(code,path='')=>({code,path,message:messages[code]??messages.STRUCTURE});
export function failure(code,path=''){return Object.assign(new Error(messages[code]??messages.STRUCTURE),{diagnostic:reason(code,path)});}
// Only actual schema positions are reportable; unknown keys and parser paths never echo data.
function safePath(path){let n=snapshotSchema;const out=[];for(const p of path.split('/').slice(1)){while(n?.$ref)n=snapshotSchema.$defs[n.$ref.split('/').at(-1)];if(n?.properties&&Object.hasOwn(n.properties,p)){out.push(p);n=n.properties[p];}else if(n?.type==='array'&&/^(0|[1-9][0-9]{0,2})$/.test(p)&&Number(p)<n.maxItems){out.push(p);n=n.items;}else break;}return out.length?'/'+out.join('/'):'';}
export function parseSnapshot(raw,scope){
 let value;try{value=parseContract(raw,SNAPSHOT_LIMITS);JSON.parse(typeof raw==='string'?raw:new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch(e){throw failure(['BYTE_LIMIT','DEPTH_LIMIT','LIST_LIMIT'].includes(e.diagnostic?.code)?'LIMIT':'STRUCTURE');}
 if(!validate(value)){const e=validate.errors[0];throw failure(['maxItems','maxLength'].includes(e.keyword)?'LIMIT':'STRUCTURE',safePath(e.instancePath));}
 // AST parsing intentionally produces null-prototype objects. Compare bounded
 // reference values canonically instead of Ajv's object uniqueItems comparator.
 for(const [i,issue]of value.issues.entries()){const refs=issue.required_requests.map(ref=>canonicalize(ref));if(new Set(refs).size!==refs.length)throw failure('STRUCTURE','/issues/'+i+'/required_requests');}
 for(const [i,repair]of value.required_repairs.entries()){const refs=repair.references.map(ref=>canonicalize(ref));if(new Set(refs).size!==refs.length)throw failure('STRUCTURE','/required_repairs/'+i+'/references');}
 if(scope.projects.length>100)throw failure('LIMIT');
 if(value.site!==scope.site||value.projects.length!==scope.projects.length||new Set(value.projects.map(x=>x.project_id)).size!==value.projects.length||value.projects.some(x=>!scope.projects.some(p=>p.id===x.project_id)))throw failure('SCOPE','/projects');
 for(const i of value.issues){if(i.body!==null&&Buffer.byteLength(i.body)>(i.format==='adf'?262144:65536)||i.context_body!==null&&Buffer.byteLength(i.context_body)>65536)throw failure('LIMIT','/issues');}
 if(value.issues.filter(i=>scope.projects.some(p=>p.id===i.project_id&&p.types.epic===i.type_id)).length>100)throw failure('LIMIT','/issues');
 for(const array of [value.issues.map(x=>x.id),value.issues.map(x=>x.key),value.retained_members.map(x=>canonicalize(x)),value.stream_checks.map(x=>JSON.stringify([x.project_id,x.label]))])if(new Set(array).size!==array.length)throw failure('STRUCTURE');
 return value;
}
export function normalizeSnapshot(snapshot,scope){
 const projects=new Map(scope.projects.map(p=>[p.id,p])),byId=new Map(snapshot.issues.map((i,index)=>[i.id,{...i,index}])),byKey=new Map([...byId.values()].map(i=>[i.key,i]));
 const streams=new Map(),diagnostics=[];const projectHolds=new Map(),shared=[];
 const scopeOf=(project_id,label=null)=>({site:scope.site,project_id,label});
 const mark=(code,path='',project_id=null,label=null)=>{const d={...reason(code,path),scope:project_id===null?null:scopeOf(project_id,label)};diagnostics.push(d);if(project_id===null)shared.push(d);else if(label===null){if(!projectHolds.has(project_id))projectHolds.set(project_id,[]);projectHolds.get(project_id).push(d);}else get(project_id,label)?.holds.push(d);};
 function get(project_id,label){const p=projects.get(project_id);if(!p||!p.worker_prefixes.some(prefix=>label.startsWith(prefix)&&/^[0-9]+$/.test(label.slice(prefix.length)))){mark('SCOPE','',null);return null;}let key;try{key=streamKey(scope.site,project_id,label);}catch{mark('SCOPE');return null;}if(!streams.has(key)){if(streams.size>=1000)throw failure('LIMIT');streams.set(key,{scope:scopeOf(project_id,label),project:p,epics:[],members:new Set(),holds:[],orders:new Map()});}return streams.get(key);}
 if(!snapshot.discovery_complete||!snapshot.retained_complete)mark('INCOMPLETE_SNAPSHOT');for(const p of snapshot.projects)if(!p.complete)mark('INCOMPLETE_PROJECT','/projects',p.project_id);
 const stage=i=>{const p=projects.get(i.project_id);if(!p)return null;return Object.entries(p.stages).find(([,v])=>v===i.status_id)?.[0]??(p.accepted_later_stage_ids.includes(i.status_id)?'accepted':p.preparation_stage_ids.includes(i.status_id)?'preparation':p.cancelled_stage_ids.includes(i.status_id)?'cancelled':null);};
 const labels=i=>{const p=projects.get(i.project_id);return p?i.labels.filter(l=>p.worker_prefixes.some(prefix=>l.startsWith(prefix)&&/^[0-9]+$/.test(l.slice(prefix.length)))):[];};
 const contextSchema=JSON.parse(readFileSync(new URL('../../contracts/work-validation-context-v1.schema.json',import.meta.url)));
 const workPath=(path,value)=>{const context=path.startsWith('/context'),root=context?contextSchema:canonicalSchemas[value?.schema];if(!root)return '';let node=root;const out=context?['context']:[];for(const part of path.split('/').slice(context?2:1)){while(node?.$ref)node=root.$defs?.[node.$ref.split('/').at(-1)];if(node?.properties&&Object.hasOwn(node.properties,part)){out.push(part);node=node.properties[part];}else if(node?.items&&/^(0|[1-9][0-9]{0,2})$/.test(part)&&Number(part)<(node.maxItems??1000)){out.push(part);node=node.items;}else break;}return out.length?'/'+out.join('/'):'';};
 const works=new Map();
 const prerequisites=w=>Array.isArray(w.value?.prerequisites)?w.value.prerequisites.filter(r=>r&&typeof r.ticket==='string'):[];
 function work(i){if(works.has(i.id))return works.get(i.id);let value=null,context=null,valid=false,diagnosticPaths=[];try{const r=validateWork(i.body,{mode:'start',format:i.format,contextInput:i.context_body});value=i.format==='adf'?extractADF(i.body).value:parseWork(i.body);context=parseWork(i.context_body);diagnosticPaths=r.diagnostics.map(d=>(d.path.startsWith('/context')?'': '/body')+workPath(d.path,value));const p=projects.get(i.project_id),expectedSchema=i.type_id===p.types.epic?'pigboard-epic/v1':[p.types.story,p.types.bug].includes(i.type_id)?'pigboard-ticket/v1':null;if(r.valid&&value.schema!==expectedSchema)diagnosticPaths.push('/body/schema');valid=r.valid&&value.schema===expectedSchema&&context.subject_key===i.key&&context.repositories.every(r=>p.repositories.includes(r.url));if(value.schema==='pigboard-ticket/v1')valid&&=p.repositories.includes(value.technical_acceptance_criteria.repository.url)&&value.technical_acceptance_criteria.repository.related_repositories.every(r=>p.repositories.includes(r.url));}catch{}if(!valid&&!diagnosticPaths.length)diagnosticPaths=['/body'];const result={valid,value,context,diagnosticPaths:[...new Set(diagnosticPaths)]};works.set(i.id,result);return result;}
 // Build the complete declared/observed/retained union before evaluating availability.
 for(const i of byId.values()){
  const p=projects.get(i.project_id);if(!p){mark('SCOPE','/issues/'+i.index);continue;}
  if(i.type_id===p.types.epic){const w=work(i);let known=false;if(w.value?.schema==='pigboard-epic/v1'&&Array.isArray(w.value.workstreams)){for(const ws of w.value.workstreams){if(!ws||typeof ws.label!=='string'||!Array.isArray(ws.story_order)||ws.story_order.some(k=>typeof k!=='string')){if(i.labels.includes(p.opt_in_label))mark('INVALID_WORK','/issues/'+i.index,p.id);continue;}const s=get(p.id,ws.label);if(!s)continue;known=true;s.epics.push({issue:i,opted:i.labels.includes(p.opt_in_label),active:stage(i)==='In Progress',valid:w.valid});s.orders.set(i.id,ws.story_order.map(key=>byKey.get(key)?.id??null));for(const key of ws.story_order){const member=byKey.get(key);if(member)s.members.add(member.id);else mark('MISSING_KNOWN_ID','/issues/'+i.index,p.id,ws.label);}if(!w.valid&&i.labels.includes(p.opt_in_label))mark('INVALID_WORK','/issues/'+i.index,p.id,ws.label);}}if(!known&&i.labels.includes(p.opt_in_label))mark('INVALID_WORK','/issues/'+i.index,p.id);continue;}
  for(const l of labels(i)){const s=get(p.id,l);s?.members.add(i.id);}
 }
 // Native children remain visible even when filters omit their labels/order.
 for(const i of byId.values()){const parentStreams=[...streams.values()].filter(s=>i.parent_id!==null&&s.epics.some(e=>e.issue.id===i.parent_id));if(parentStreams.length&&labels(i).length===0&&!parentStreams.some(s=>s.members.has(i.id))){if(parentStreams.length===1)parentStreams[0].members.add(i.id);else mark('MEMBERSHIP_MISMATCH','/issues/'+i.index,i.project_id);}}
 for(const row of [...snapshot.retained_members,...snapshot.pending_intents,...snapshot.required_repairs]){const s=get(row.project_id,row.label);s?.members.add(row.ticket_id);if(!byId.has(row.ticket_id))mark('MISSING_KNOWN_ID','/retained_members',row.project_id,row.label);}
 for(const i of byId.values()){const w=work(i);for(const ref of prerequisites(w)){const target=byKey.get(ref.ticket);for(const l of labels(i)){const s=get(i.project_id,l);if(target){/* prerequisite has its own native ownership, not consumer capacity */}else mark('MISSING_KNOWN_ID','/issues/'+i.index,i.project_id,l);}}}
 // Graph entries cannot supply alternative dependency facts for a present work document.
 for(const [id,w]of works){if(!w.valid)continue;for(const node of w.context.prerequisite_graph){const other=byKey.get(node.ticket),actual=other&&work(other).value;if(actual?.schema==='pigboard-ticket/v1'&&!equal(node.prerequisites,prerequisites({value:actual}).map(p=>p.ticket))){w.valid=false;w.diagnosticPaths.push('/context/prerequisite_graph');}}}
 for(const s of streams.values()){
  for(const e of s.epics){e.valid=work(e.issue).valid;if(e.opted&&!e.valid)mark('INVALID_WORK','/issues/'+e.issue.index,s.scope.project_id,s.scope.label);}
  const check=snapshot.stream_checks.find(c=>c.project_id===s.scope.project_id&&c.label===s.scope.label);if(!check||!check.known_ids_complete||!check.repair_inventory_complete)mark('INCOMPLETE_STREAM','/stream_checks',s.scope.project_id,s.scope.label);
  const owners=s.epics.filter(e=>e.opted&&e.active);if(owners.length>1)mark('OWNERSHIP_CONFLICT','/issues',s.scope.project_id,s.scope.label);
  s.owner=owners[0]??s.epics.find(e=>e.opted)??null;
  for(const id of s.members){const i=byId.get(id);if(!i)continue;const path='/issues/'+i.index,ls=labels(i),st=stage(i),p=s.project;
   if(![p.types.story,p.types.bug].includes(i.type_id))mark('MEMBERSHIP_MISMATCH',path,s.scope.project_id,s.scope.label);
   if(st===null)mark('UNKNOWN_STATUS',path+'/status_id',s.scope.project_id,s.scope.label);
   const listed=s.epics.some(e=>(s.orders.get(e.issue.id)??[]).includes(id)&&i.parent_id===e.issue.id);
   const retained=snapshot.retained_members.filter(r=>r.ticket_id===id),incoming=[...byId.values()].some(t=>prerequisites(work(t)).some(r=>r.ticket===i.key));
   const canRemove=['preparation','Ready to Work','cancelled'].includes(st)&&!incoming&&!retained.some(r=>r.assignment!==null)&&i.pointer===null;
   if(i.pointer!==null&&retained.length!==1)mark('MEMBERSHIP_MISMATCH',path+'/pointer',s.scope.project_id,s.scope.label);
   const mismatch=i.project_id!==s.scope.project_id||ls.length!==1||ls[0]!==s.scope.label||(!listed&&!canRemove);
   if(mismatch)mark('MEMBERSHIP_MISMATCH',path,s.scope.project_id,s.scope.label);
   for(const r of retained)if(r.project_id!==i.project_id||r.epic_id!==i.parent_id||r.label!==ls[0]||!equal(r.assignment,i.pointer?.assignment??null)||(!listed&&!canRemove)){mark('MEMBERSHIP_MISMATCH','/retained_members',r.project_id,r.label);for(const l of ls)mark('MEMBERSHIP_MISMATCH',path,i.project_id,l);}
   if(new Set(retained.map(r=>JSON.stringify([r.project_id,r.epic_id,r.label,r.assignment]))).size>1)for(const r of retained)mark('OWNERSHIP_CONFLICT','/retained_members',r.project_id,r.label);
  }
  for(const e of s.epics)if(e.opted&&stage(e.issue)===null)mark('UNKNOWN_STATUS','/issues/'+e.issue.index+'/status_id',s.scope.project_id,s.scope.label);
  if(snapshot.pending_intents.some(i=>i.project_id===s.scope.project_id&&i.label===s.scope.label))mark('PENDING_INTENT','/pending_intents',s.scope.project_id,s.scope.label);
 }
 for(const check of snapshot.stream_checks)if(!streams.has(streamKey(scope.site,check.project_id,check.label)))throw failure('SCOPE','/stream_checks');
 const proofs=new Map(),targets=new Set();
 for(const [index,raw]of snapshot.completion_receipts.entries()){
  let e;try{e=parseContract(raw,{bytes:8*1024*1024,depth:40,list:1000});}catch{continue;}
  const target=e.target?.ticket_id;if(typeof target!=='string')continue;if(targets.has(target))throw failure('STRUCTURE','/completion_receipts');targets.add(target);
  let bound=e.consumer==='manager'&&e.trusted?.site===scope.site;
  for(const p of e.trusted?.projects??[]){const current=projects.get(p.id);bound&&=!!current&&['stages','accepted_later_stage_ids','actors','repositories'].every(k=>equal(p[k],current[k]));}
  for(const fact of e.issues??[]){const i=byId.get(fact.id),w=i&&work(i),r=(e.requirements??[]).find(r=>r.ticket_id===fact.id&&r.digest===fact.requirements_digest),rs=snapshot.retained_members.filter(r=>r.ticket_id===fact.id),assignments=(e.trusted?.manager_assignments??[]).filter(a=>a.ticket_id===fact.id);bound&&=!!i&&!!w?.valid&&fact.site===scope.site&&fact.key===i.key&&fact.project_id===i.project_id&&fact.stage_id===i.status_id&&labels(i).length===1&&fact.stream===labels(i)[0]&&equal(fact.pointer,i.pointer)&&equal(fact.required_requests,i.required_requests)&&fact.requirements_digest===digest(w.value)&&!!r&&r.body===i.body&&r.context_body===i.context_body&&r.format===i.format&&rs.length===1&&equal(rs[0].assignment,i.pointer?.assignment)&&assignments.length===1&&equal(assignments[0].assignment,rs[0].assignment);}
  const i=byId.get(target),current=i&&['Human Review','accepted'].includes(stage(i));let result;try{result=validateReceiptChain(raw);}catch{continue;}
  if(bound&&current&&result.valid&&result.completion_established&&result.target?.ticket_id===target&&equal(result.target,e.target))proofs.set(target,result);
 }
 return {snapshot,scope,projects,byId,byKey,streams,diagnostics,shared,projectHolds,stage,labels,work,proofs,mark};
}
