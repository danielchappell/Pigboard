import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import canonicalize from 'canonicalize';
import { parseContract, parseWork, extractADF, validateWork, canonicalSchemas } from '../contracts/work.mjs';
import { receiptInputSchema, inspectManagerCompletion, inspectManagerHistory, inspectRecordedCompletion, inspectRecordedHistory } from '../contracts/receipts.mjs';
import { validateSchedulingSemantics } from '../contracts/work-semantics.mjs';
import { extractHandoffCandidate, recordSchema } from '../contracts/handoff.mjs';
import { parseConfig } from '../config/parse.mjs';
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
 completion_receipts:list({type:'string',maxLength:8*1024*1024},100),
 repair_receipts:list({type:'string',maxLength:8*1024*1024},100)
}),$defs:receiptInputSchema.$defs};
snapshotSchema.required=snapshotSchema.required.filter(k=>k!=='repair_receipts');
export const ordinarySnapshotSchema=structuredClone(snapshotSchema);
ordinarySnapshotSchema.properties.schema={const:'pigboard-manager-snapshot/v2'};
const ordinaryIssue=ordinarySnapshotSchema.properties.issues.items;
delete ordinaryIssue.properties.context_body;ordinaryIssue.required=ordinaryIssue.required.filter(k=>k!=='context_body');
ordinaryIssue.properties.pointer.anyOf.push(obj({state:{const:'unknown'},value:{type:'null'}}));
const installedSkills=JSON.parse(readFileSync(new URL('../../config/skill-bundle.json',import.meta.url))).skills;
const ajv=new Ajv2020({allErrors:true,strict:false,ownProperties:true});addFormats(ajv);const validate=ajv.compile(snapshotSchema),validateOrdinary=ajv.compile(ordinarySnapshotSchema);
const retainedAjv=new Ajv2020({allErrors:true,strict:false,ownProperties:true});addFormats(retainedAjv,{mode:'full'});
const validateRetained=retainedAjv.compile({...receiptInputSchema.properties.retained.items,$defs:receiptInputSchema.$defs});
export const digest=value=>'sha256:'+createHash('sha256').update(canonicalize(value),'utf8').digest('hex');
export const equal=(a,b)=>canonicalize(a)===canonicalize(b);
const messages={REPAIR_REQUIRED:'Required repair work needs human handling; ordinary admission cannot bypass it.',REPAIR_PROOF_INVALID:'Reconcile conflicting supplied completion observations before using this scope; preview cannot choose a winning receipt.',STRUCTURE:'Supply every declared snapshot field once with its supported type; remove unknown fields.',LIMIT:'Keep inputs within the documented offline preview limits.',SCOPE:'Supply exactly the configured site and immutable project inventory.',INCOMPLETE_SNAPSHOT:'Obtain complete discovery and retained inventory before previewing.',INCOMPLETE_PROJECT:'Obtain the complete native inventory for this project.',INCOMPLETE_STREAM:'Supply complete known-ID and repair inventory checks for this stream.',MISSING_KNOWN_ID:'Supply native facts for every referenced or retained stable ticket ID.',MEMBERSHIP_MISMATCH:'Reconcile original and current project, parent, full label and Epic membership without dropping retained work.',OWNERSHIP_CONFLICT:'Reconcile competing Epic or retained ownership before choosing work.',UNKNOWN_STATUS:'Map the native status explicitly in canonical configuration.',PENDING_INTENT:'Resolve the retained manager intent through its owner; preview cannot clear it.',INVALID_WORK:'Correct the raw work and trusted context start contract, repository or prerequisite graph.',LINEAGE_REQUIRED:'Supply authenticated repair history for this queued ticket or required request before choosing work.',REPAIR_READY:'The required repair is ready for one nonexecuting admission proposal.',REPAIR_PREREQUISITE:'Complete this ready prerequisite before the required repair.',PARENT_REPAIR_PENDING:'Obtain the recorded immediate parent’s current coherent repaired QA before continuing.',STACK_UPDATE_REQUIRED:'The completed child must incorporate its recorded immediate parent’s repaired revision.',STACK_REQUEST_PUBLICATION_REQUIRED:'Publish the supplied stack-update payload through the authorized writer before execution.',PR_HUMAN_HANDLING:'The known child PR requires human handling before repair can proceed.',REPAIR_ACCOUNTED_FOR:'Current exactly bound canonical QA accounts for the retained repair obligations.',CHANGED_INPUT:'Inputs changed; evaluate this new snapshot before using its proposal.',NO_OPT_IN:'No configured opt-in Epic grants authority for this stream.',EPIC_PAUSED:'The opted-in Epic is paused; existing workers may finish their own cycle.',NO_READY_CANDIDATE:'No eligible Ready to Work candidate exists in the current Epic order.',PREREQUISITE_UNSATISFIED:'Obtain coherent current canonical AI-QA completion and resolve required repairs for every prerequisite.',OCCUPIED:'An existing automated cycle occupies this stream.',BLOCKED:'A known Blocked member holds this stream for human handling.',HUMAN_REVIEW_CAP:'One return would exceed five Human Review tickets.',INCONSISTENT_OCCUPANCY:'Multiple automated cycles are present; hold new work without interrupting them.'};
export const reason=(code,path='')=>({code,path,message:messages[code]??messages.STRUCTURE});
export function failure(code,path=''){return Object.assign(new Error(messages[code]??messages.STRUCTURE),{diagnostic:reason(code,path)});}
// Only actual schema positions are reportable; unknown keys and parser paths never echo data.
function safePath(path){let n=snapshotSchema;const out=[];for(const p of path.split('/').slice(1)){while(n?.$ref)n=snapshotSchema.$defs[n.$ref.split('/').at(-1)];if(n?.properties&&Object.hasOwn(n.properties,p)){out.push(p);n=n.properties[p];}else if(n?.type==='array'&&/^(0|[1-9][0-9]{0,2})$/.test(p)&&Number(p)<n.maxItems){out.push(p);n=n.items;}else break;}return out.length?'/'+out.join('/'):'';}
export function parseSnapshot(raw,scope,mode){
 const validator=mode==='ordinary'?validateOrdinary:validate;
 let value;try{value=parseContract(raw,SNAPSHOT_LIMITS);JSON.parse(typeof raw==='string'?raw:new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch(e){throw failure(['BYTE_LIMIT','DEPTH_LIMIT','LIST_LIMIT'].includes(e.diagnostic?.code)?'LIMIT':'STRUCTURE');}
 if(!validator(value)){const e=validator.errors[0];throw failure(['maxItems','maxLength'].includes(e.keyword)?'LIMIT':'STRUCTURE',safePath(e.instancePath));}
 // AST parsing intentionally produces null-prototype objects. Compare bounded
 // reference values canonically instead of Ajv's object uniqueItems comparator.
 for(const [i,issue]of value.issues.entries()){const refs=issue.required_requests.map(ref=>canonicalize(ref));if(new Set(refs).size!==refs.length)throw failure('STRUCTURE','/issues/'+i+'/required_requests');}
 for(const [i,repair]of value.required_repairs.entries()){const refs=repair.references.map(ref=>canonicalize(ref));if(new Set(refs).size!==refs.length)throw failure('STRUCTURE','/required_repairs/'+i+'/references');}
 if(value.completion_receipts.length+(value.repair_receipts?.length??0)>100)throw failure('LIMIT','/repair_receipts');
 if(scope.projects.length>100)throw failure('LIMIT');
 if(value.site!==scope.site||value.projects.length!==scope.projects.length||new Set(value.projects.map(x=>x.project_id)).size!==value.projects.length||value.projects.some(x=>!scope.projects.some(p=>p.id===x.project_id)))throw failure('SCOPE','/projects');
 for(const i of value.issues){if(i.body!==null&&Buffer.byteLength(i.body)>(i.format==='adf'?262144:65536)||i.context_body!=null&&Buffer.byteLength(i.context_body)>65536)throw failure('LIMIT','/issues');}
 if(value.issues.filter(i=>scope.projects.some(p=>p.id===i.project_id&&p.types.epic===i.type_id)).length>100)throw failure('LIMIT','/issues');
 for(const array of [value.issues.map(x=>x.id),value.issues.map(x=>x.key),value.retained_members.map(x=>canonicalize(x)),value.stream_checks.map(x=>JSON.stringify([x.project_id,x.label]))])if(new Set(array).size!==array.length)throw failure('STRUCTURE');
 return value;
}
const configuredWorkerLabel=(project,label)=>typeof label==='string'&&project.worker_prefixes.some(prefix=>label.startsWith(prefix)&&/^[0-9]+$/.test(label.slice(prefix.length)));
// Exact dependency acquisition preserves an Epic's body, but does not grant
// declaration-derived membership. Reuse the producer's three native root grants.
const declarationRoot=(issue,project,retained)=>issue.project_id===project.id&&issue.type_id===project.types.epic&&(issue.labels.includes(project.opt_in_label)||issue.labels.some(label=>configuredWorkerLabel(project,label))||retained.some(row=>row.epic_id===issue.id&&row.project_id===issue.project_id&&configuredWorkerLabel(project,row.label)));
export function normalizeSnapshot(snapshot,scope,mode){
 const ordinary=mode==='ordinary';
 const projects=new Map(scope.projects.map(p=>[p.id,p])),byId=new Map(snapshot.issues.map((i,index)=>[i.id,{...i,index}])),byKey=new Map([...byId.values()].map(i=>[i.key,i]));
 const streams=new Map(),diagnostics=[];const projectHolds=new Map(),shared=[];
 const scopeOf=(project_id,label=null)=>({site:scope.site,project_id,label});
 const mark=(code,path='',project_id=null,label=null)=>{const d={...reason(code,path),scope:project_id===null?null:scopeOf(project_id,label)};diagnostics.push(d);if(project_id===null)shared.push(d);else if(label===null){if(!projectHolds.has(project_id))projectHolds.set(project_id,[]);projectHolds.get(project_id).push(d);}else get(project_id,label)?.holds.push(d);return d;};
 function get(project_id,label){const p=projects.get(project_id);if(!p||!p.worker_prefixes.some(prefix=>label.startsWith(prefix)&&/^[0-9]+$/.test(label.slice(prefix.length)))){mark('SCOPE','',null);return null;}let key;try{key=streamKey(scope.site,project_id,label);}catch{mark('SCOPE');return null;}if(!streams.has(key)){if(streams.size>=1000)throw failure('LIMIT');streams.set(key,{scope:scopeOf(project_id,label),project:p,epics:[],members:new Set(),holds:[],orders:new Map()});}return streams.get(key);}
 if(!snapshot.discovery_complete||!snapshot.retained_complete)mark('INCOMPLETE_SNAPSHOT');for(const p of snapshot.projects)if(!p.complete)mark('INCOMPLETE_PROJECT','/projects',p.project_id);
 const stage=i=>{const p=projects.get(i.project_id);if(!p)return null;return Object.entries(p.stages).find(([,v])=>v===i.status_id)?.[0]??(p.accepted_later_stage_ids.includes(i.status_id)?'accepted':p.preparation_stage_ids.includes(i.status_id)?'preparation':p.cancelled_stage_ids.includes(i.status_id)?'cancelled':null);};
 const labels=i=>{const p=projects.get(i.project_id);return p?i.labels.filter(l=>p.worker_prefixes.some(prefix=>l.startsWith(prefix)&&/^[0-9]+$/.test(l.slice(prefix.length)))):[];};
 const contextSchema=JSON.parse(readFileSync(new URL('../../contracts/work-validation-context-v1.schema.json',import.meta.url)));
 const workPath=(path,value)=>{const context=path.startsWith('/context'),root=context?contextSchema:canonicalSchemas[value?.schema];if(!root)return '';let node=root;const out=context?['context']:[];for(const part of path.split('/').slice(context?2:1)){while(node?.$ref)node=root.$defs?.[node.$ref.split('/').at(-1)];if(node?.properties&&Object.hasOwn(node.properties,part)){out.push(part);node=node.properties[part];}else if(node?.items&&/^(0|[1-9][0-9]{0,2})$/.test(part)&&Number(part)<(node.maxItems??1000)){out.push(part);node=node.items;}else break;}return out.length?'/'+out.join('/'):'';};
 const works=new Map();
 const prerequisites=w=>Array.isArray(w.value?.prerequisites)?w.value.prerequisites.filter(r=>r&&typeof r.ticket==='string'):[];
 function work(i){if(works.has(i.id))return works.get(i.id);let value=null,context=null,valid=false,diagnosticPaths=[];try{const r=validateWork(i.body,ordinary?{mode:'structure',format:i.format}:{mode:'start',format:i.format,contextInput:i.context_body});value=i.format==='adf'?extractADF(i.body).value:parseWork(i.body);context=ordinary?{subject:{site:scope.site,project_id:i.project_id,key:i.key},prerequisite_graph:[...byId.values()].flatMap(other=>{try{const v=other.format==='adf'?extractADF(other.body).value:parseWork(other.body);return [{ticket:other.key,prerequisites:(v.prerequisites??[]).map(p=>p.ticket)}];}catch{return [{ticket:other.key,prerequisites:[]}];}}),related_changes:(value.technical_acceptance_criteria?.repository.related_repositories??[]).map(v=>({repository:v.url,change_story:v.change_story}))}:parseWork(i.context_body);diagnosticPaths=r.diagnostics.map(d=>(d.path.startsWith('/context')?'': '/body')+workPath(d.path,value));const p=projects.get(i.project_id),expectedSchema=i.type_id===p.types.epic?'pigboard-epic/v1':[p.types.story,p.types.bug].includes(i.type_id)?'pigboard-ticket/v1':null;if(r.valid&&value.schema!==expectedSchema)diagnosticPaths.push('/body/schema');valid=r.valid&&value.schema===expectedSchema&&(ordinary?true:context.subject_key===i.key&&context.repositories.every(r=>p.repositories.includes(r.url)));if(value.schema==='pigboard-ticket/v1')valid&&=p.repositories.includes(value.technical_acceptance_criteria.repository.url)&&value.technical_acceptance_criteria.repository.related_repositories.every(r=>p.repositories.includes(r.url));if(ordinary&&valid){const semantic=validateSchedulingSemantics(value,context,p,installedSkills);valid=semantic.diagnostics.length===0;diagnosticPaths.push(...semantic.diagnostics.map(d=>'/body'+workPath(d.path,value)));}}catch{}if(!valid&&!diagnosticPaths.length)diagnosticPaths=['/body'];const result={valid,value,context,diagnosticPaths:[...new Set(diagnosticPaths)]};works.set(i.id,result);return result;}
 // Every extant declaration below must match its native parent; safe removal
 // applies to genuinely unlisted work, never to a contradictory declaration.
 // Use one removal rule for native fallback and later membership validation.
 const retainedFor=i=>snapshot.retained_members.filter(r=>r.ticket_id===i.id);
 const canRemove=i=>['preparation','Ready to Work','cancelled'].includes(stage(i))&&!retainedFor(i).some(r=>r.assignment!==null)&&i.pointer===null&&i.required_requests.length===0&&!snapshot.pending_intents.some(r=>r.ticket_id===i.id)&&!snapshot.required_repairs.some(r=>r.ticket_id===i.id)&&![...byId.values()].some(t=>prerequisites(work(t)).some(r=>r.ticket===i.key));
 // Build the complete declared/observed/retained union before evaluating availability.
 for(const i of byId.values()){
  const p=projects.get(i.project_id);if(!p){mark('SCOPE','/issues/'+i.index);continue;}
  if(i.type_id===p.types.epic){if(ordinary&&!declarationRoot(i,p,snapshot.retained_members))continue;const w=work(i);let known=false;if(w.value?.schema==='pigboard-epic/v1'&&Array.isArray(w.value.workstreams)){for(const ws of w.value.workstreams){if(!ws||typeof ws.label!=='string'||!Array.isArray(ws.story_order)||ws.story_order.some(k=>typeof k!=='string')){if(i.labels.includes(p.opt_in_label))mark('INVALID_WORK','/issues/'+i.index,p.id);continue;}const s=get(p.id,ws.label);if(!s)continue;known=true;s.epics.push({issue:i,opted:i.labels.includes(p.opt_in_label),active:stage(i)==='In Progress',valid:w.valid});s.orders.set(i.id,ws.story_order.map(key=>byKey.get(key)?.id??null));for(const key of ws.story_order){const member=byKey.get(key);if(member){s.members.add(member.id);if(member.parent_id!==i.id)mark('MEMBERSHIP_MISMATCH','/issues/'+member.index+'/parent_id',p.id,ws.label);}else mark('MISSING_KNOWN_ID','/issues/'+i.index,p.id,ws.label);}if(!w.valid&&i.labels.includes(p.opt_in_label))mark('INVALID_WORK','/issues/'+i.index,p.id,ws.label);}}if(!known&&i.labels.includes(p.opt_in_label))mark('INVALID_WORK','/issues/'+i.index,p.id);continue;}
  for(const l of labels(i)){const s=get(p.id,l);s?.members.add(i.id);}
 }
 // Labels establish observation, not a removed native child's former ownership.
 for(const i of byId.values()){
  const parentStreams=[...streams.values()].filter(s=>i.parent_id!==null&&s.epics.some(e=>e.issue.id===i.parent_id));
  if(!parentStreams.length||parentStreams.some(s=>(s.orders.get(i.parent_id)??[]).includes(i.id)))continue;
  const retained=retainedFor(i),row=retained.length===1?retained[0]:null;
  const owner=row&&row.project_id===i.project_id&&row.epic_id===i.parent_id&&equal(row.assignment,i.pointer?.assignment??null)&&parentStreams.find(s=>s.scope.project_id===row.project_id&&s.scope.label===row.label);
  if(owner){owner.members.add(i.id);continue;}
  if(canRemove(i))continue;
  if(parentStreams.length===1)parentStreams[0].members.add(i.id);
  else for(const s of parentStreams)mark('MEMBERSHIP_MISMATCH','/issues/'+i.index,s.scope.project_id,s.scope.label);
 }
 for(const field of ['retained_members','pending_intents','required_repairs'])for(const [index,row]of snapshot[field].entries()){const s=get(row.project_id,row.label);s?.members.add(row.ticket_id);if(!byId.has(row.ticket_id))mark('MISSING_KNOWN_ID','/'+field+'/'+index,row.project_id,row.label);}
 // Contradictory repair metadata cannot free any established member scope.
 for(const [index,row]of snapshot.required_repairs.entries()){
  const associated=[...streams.values()].filter(s=>s.members.has(row.ticket_id));
  if(associated.some(s=>s.scope.project_id!==row.project_id||s.scope.label!==row.label))for(const s of associated)mark('MEMBERSHIP_MISMATCH','/required_repairs/'+index,s.scope.project_id,s.scope.label);
 }
 for(const i of byId.values()){const w=work(i);for(const ref of prerequisites(w)){const target=byKey.get(ref.ticket);for(const l of labels(i)){const s=get(i.project_id,l);if(target){/* prerequisite has its own native ownership, not consumer capacity */}else mark('MISSING_KNOWN_ID','/issues/'+i.index,i.project_id,l);}}}
 // Graph entries cannot supply alternative dependency facts for a present work document.
 for(const [id,w]of works){if(!w.valid)continue;for(const node of w.context.prerequisite_graph){const other=byKey.get(node.ticket),actual=other&&work(other).value;if(actual?.schema==='pigboard-ticket/v1'&&!equal(node.prerequisites,prerequisites({value:actual}).map(p=>p.ticket))){w.valid=false;w.diagnosticPaths.push('/context/prerequisite_graph');}}}
 for(const s of streams.values()){
  for(const e of s.epics){e.valid=work(e.issue).valid;if(e.opted&&!e.valid)mark('INVALID_WORK','/issues/'+e.issue.index,s.scope.project_id,s.scope.label);}
  const check=snapshot.stream_checks.find(c=>c.project_id===s.scope.project_id&&c.label===s.scope.label);if(!check||!check.known_ids_complete||!check.repair_inventory_complete)mark('INCOMPLETE_STREAM','/stream_checks',s.scope.project_id,s.scope.label);
  const owners=s.epics.filter(e=>e.opted&&e.active);
  if(owners.length>1)for(const {issue}of owners)mark('OWNERSHIP_CONFLICT','/issues/'+issue.index+'/id',s.scope.project_id,s.scope.label).message=`Active opted-in Epic ID ${issue.id} conflicts with another active opted-in Epic for this stream. Reconcile competing Epic ownership before choosing work.`;
  s.owner=owners.length>1?null:owners[0]??s.epics.find(e=>e.opted)??null;
  for(const id of s.members){const i=byId.get(id);if(!i)continue;const path='/issues/'+i.index,ls=labels(i),st=stage(i),p=s.project;
   if(![p.types.story,p.types.bug].includes(i.type_id))mark('MEMBERSHIP_MISMATCH',path,s.scope.project_id,s.scope.label);
   if(st===null)mark('UNKNOWN_STATUS',path+'/status_id',s.scope.project_id,s.scope.label);
   const listed=s.epics.some(e=>(s.orders.get(e.issue.id)??[]).includes(id)&&i.parent_id===e.issue.id);
   const retained=retainedFor(i),removable=canRemove(i);
   if(ordinary&&i.pointer?.state==='unknown')mark('INCOMPLETE_STREAM',path+'/pointer',s.scope.project_id,s.scope.label);
   if(i.pointer!==null&&retained.length!==1)mark('MEMBERSHIP_MISMATCH',path+'/pointer',s.scope.project_id,s.scope.label);
   const mismatch=i.project_id!==s.scope.project_id||ls.length!==1||ls[0]!==s.scope.label||(!listed&&!removable);
   if(mismatch)mark('MEMBERSHIP_MISMATCH',path,s.scope.project_id,s.scope.label);
   for(const r of retained)if(r.project_id!==i.project_id||r.epic_id!==i.parent_id||r.label!==ls[0]||!equal(r.assignment,i.pointer?.assignment??null)||(!listed&&!removable)){mark('MEMBERSHIP_MISMATCH','/retained_members',r.project_id,r.label);for(const l of ls)mark('MEMBERSHIP_MISMATCH',path,i.project_id,l);}
   if(new Set(retained.map(r=>JSON.stringify([r.project_id,r.epic_id,r.label,r.assignment]))).size>1)for(const r of retained)mark('OWNERSHIP_CONFLICT','/retained_members',r.project_id,r.label);
  }
  for(const e of s.epics)if(e.opted&&stage(e.issue)===null)mark('UNKNOWN_STATUS','/issues/'+e.issue.index+'/status_id',s.scope.project_id,s.scope.label);
  if(snapshot.pending_intents.some(i=>(i.project_id===s.scope.project_id&&i.label===s.scope.label)||s.members.has(i.ticket_id)))mark('PENDING_INTENT','/pending_intents',s.scope.project_id,s.scope.label);
 }
 for(const check of snapshot.stream_checks)if(!streams.has(streamKey(scope.site,check.project_id,check.label))){if(ordinary){const s=get(check.project_id,check.label);if(s&&!check.known_ids_complete)mark('INCOMPLETE_STREAM','/stream_checks',check.project_id,check.label);}else throw failure('SCOPE','/stream_checks');}
 const proofs=new Map(),targets=new Set(),histories=new Map(),coverageSegments=new Map(),invalidProofs=new Map(),envelopes=[],historyTargets=new Set();
 function boundEnvelope(e){
  if(e.consumer!=='manager'||e.trusted?.site!==scope.site||![e.trusted.projects,e.trusted.manager_assignments,e.issues,e.requirements].every(Array.isArray))return false;
  const boundProjects=new Set(),boundIssues=new Set();
  for(const p of e.trusted.projects){const current=projects.get(p?.id);if(!current||boundProjects.has(p.id)||!['stages','accepted_later_stage_ids','actors','repositories'].every(k=>equal(p[k],current[k])))return false;boundProjects.add(p.id);}
  for(const fact of e.issues){
   const i=byId.get(fact?.id);
   if(!i||boundIssues.has(i.id)||!boundProjects.has(i.project_id)||fact.site!==scope.site||fact.key!==i.key||fact.project_id!==i.project_id||fact.stage_id!==i.status_id||labels(i).length!==1||fact.stream!==labels(i)[0]||!equal(fact.pointer,i.pointer)||!equal(fact.required_requests,i.required_requests))return false;
   const w=work(i),rows=e.requirements.filter(r=>r?.ticket_id===i.id),r=rows.find(r=>r.digest===fact.requirements_digest),rs=retainedFor(i),assignments=e.trusted.manager_assignments.filter(a=>a?.ticket_id===i.id);
   if(!w.value||fact.requirements_digest!==digest(w.value)||!r||r.body!==i.body||(!ordinary&&r.context_body!==i.context_body)||r.format!==i.format)return false;
   if(ordinary&&fact.pointer===null){
    const p=projects.get(i.project_id);
    if(!w.valid||stage(i)!=='Ready to Work'||![p.types.story,p.types.bug].includes(i.type_id)||w.value.schema!=='pigboard-ticket/v1'||rows.length!==1||rs.length>1||rs.some(row=>row.project_id!==i.project_id||row.epic_id!==i.parent_id||row.label!==fact.stream||row.assignment!==null)||assignments.length)return false;
   }else if(!w.valid||rs.length!==1||!equal(rs[0].assignment,i.pointer?.assignment)||assignments.length!==1||!equal(assignments[0].assignment,rs[0].assignment))return false;
   boundIssues.add(i.id);
  }
  return boundIssues.has(e.target?.ticket_id);
 }
 // Scheduling consumers locate affected scopes; they never grant membership or proof validity.
 const proofScopes=new Map(),proofConsumers=new Map();
 if(ordinary){
  for(const s of streams.values())for(const id of s.members){if(!proofScopes.has(id))proofScopes.set(id,new Set());proofScopes.get(id).add(s);}
  for(const i of byId.values())for(const ref of prerequisites(work(i))){const target=byKey.get(ref.ticket);if(!target)continue;if(!proofConsumers.has(target.id))proofConsumers.set(target.id,new Set());proofConsumers.get(target.id).add(i.id);}
 }
 function markProof(target,path){
  if(!ordinary){let located=false;for(const s of streams.values())if(s.members.has(target)){mark('REPAIR_PROOF_INVALID',path,s.scope.project_id,s.scope.label);located=true;}if(!located)mark('REPAIR_PROOF_INVALID',path);return;}
  if(!byId.has(target)){mark('REPAIR_PROOF_INVALID',path);return;}
  const affected=new Set(),visited=new Set(),anchored=new Set(),consumers=new Map(),pending=[target];
  for(let at=0;at<pending.length;at++){
   const id=pending[at];if(visited.has(id))continue;visited.add(id);
   for(const s of proofScopes.get(id)??[]){affected.add(s);anchored.add(id);}
   for(const consumer of proofConsumers.get(id)??[]){if(!consumers.has(consumer))consumers.set(consumer,new Set());consumers.get(consumer).add(id);pending.push(consumer);}
  }
  // Resolve every branch after traversal so one anchor cannot hide an unlocated cycle.
  const located=new Set(anchored),resolved=[...anchored];for(let at=0;at<resolved.length;at++)for(const id of consumers.get(resolved[at])??[])if(!located.has(id)){located.add(id);resolved.push(id);}
  if(!affected.size||[...visited].some(id=>!located.has(id))){mark('REPAIR_PROOF_INVALID',path);return;}
  for(const s of affected)mark('REPAIR_PROOF_INVALID',path,s.scope.project_id,s.scope.label);
 }
 for(const field of ['completion_receipts','repair_receipts'])for(const [index,raw]of (snapshot[field]??[]).entries()){
  const path='/'+field+'/'+index;let e;try{e=parseContract(raw,{bytes:8*1024*1024,depth:40,list:1000});}catch{if(field==='repair_receipts')markProof(null,path);continue;}
  const target=e.target?.ticket_id;if(typeof target!=='string'){if(field==='repair_receipts')markProof(null,path);continue;}
  if(field==='completion_receipts'){if(targets.has(target))throw failure('STRUCTURE','/completion_receipts');targets.add(target);}else{const key=canonicalize(e.target);if(historyTargets.has(key)){markProof(target,path);continue;}historyTargets.add(key);}
  const bound=boundEnvelope(e);let current=null,history=null,currentBindings=[];
  if(bound)try{if(field==='completion_receipts'){const inspected=ordinary?inspectRecordedCompletion(raw):inspectManagerCompletion(raw);current=inspected.validation;currentBindings=inspected.bindings;}history=ordinary?inspectRecordedHistory(raw):inspectManagerHistory(raw);}catch{}
  if(!bound||field==='completion_receipts'&&!current?.valid){if(!invalidProofs.has(target))invalidProofs.set(target,[]);invalidProofs.get(target).push({...reason('REPAIR_PROOF_INVALID',path),message:'Supply coherent bound repair or completion evidence; invalid proof cannot account for required repair work.'});}
  if(field==='repair_receipts'&&(!bound||!history?.valid))markProof(target,path);
  const i=byId.get(target),covered=!!i&&snapshot.required_repairs.filter(row=>row.ticket_id===target).every(row=>row.references.every(ref=>i.required_requests.some(native=>equal(ref,native))));
  envelopes.push({target,path,bound,history,current,currentBindings,e,scopes:[...streams.values()].filter(s=>Array.isArray(e.issues)&&e.issues.some(f=>s.members.has(f?.id))),proof:bound&&i&&['Human Review','accepted'].includes(stage(i))&&covered&&current?.valid&&(ordinary?current.recorded_completion_established:current.completion_established)&&equal(current.target,e.target),conflict:false});
 }
 // Compare complete authenticated fingerprints before any envelope contributes
 // policy facts. Conflicting overlap cannot be selected by array order.
 const groups=new Map();
 for(const entry of envelopes.filter(e=>e.bound)){
  const accepted=[...(entry.current?.valid?entry.currentBindings:[]),...(entry.history?.valid?entry.history.bindings:[])];
  for(const binding of accepted){const key=JSON.stringify([binding.kind,binding.key]);if(!groups.has(key))groups.set(key,{digests:new Set(),entries:new Set()});const group=groups.get(key);group.digests.add(binding.digest);group.entries.add(entry);}
 }
 // Finalize every participant before accepting current proofs or historical facts.
 for(const group of groups.values())if(group.digests.size>1)for(const entry of group.entries)entry.conflict=true;
 for(const entry of envelopes){if(entry.conflict){if(entry.scopes.length)for(const s of entry.scopes)mark('REPAIR_PROOF_INVALID',entry.path,s.scope.project_id,s.scope.label);else mark('REPAIR_PROOF_INVALID',entry.path);continue;}if(!entry.bound)continue;if(entry.proof)proofs.set(entry.target,entry.current);if(entry.history?.valid){for(const row of entry.history.records)histories.set(canonicalize(row.reference),row);for(const pair of entry.history.coverage_segments)coverageSegments.set(canonicalize([pair.parent_completion,pair.cutoff_completion]),pair);}}
 return {mode,snapshot,scope,projects,byId,byKey,streams,diagnostics,shared,projectHolds,stage,labels,work,proofs,histories,coverageSegments,invalidProofs,envelopes,mark};
}

/** Compose supplied native acquisition and confirmed State facts only. No I/O or effects. */
export function composeOrdinarySnapshot(configInput,inspection,state){
 const diagnostics=[];
 const reject=(code,path='')=>{throw failure(code,path);};
 try{
  const config=parseConfig(configInput);if(!config.valid)reject('SCOPE');
  const scope=config.resolved_scope,report=inspection?.report&&parseContract(JSON.stringify(inspection.report),SNAPSHOT_LIMITS),observations=inspection?.observations;
  if(!report||report.schema!=='pigboard-jira-inventory/v1'||!['complete','incomplete'].includes(report.status)||report.inspection_scope!=='configured_inventory'||!observations||!state||state.retained_complete!==true||report.retained_complete!==true)reject('INCOMPLETE_SNAPSHOT');
  // Parsing copies private input, checks unsafe values and applies the same aggregate limits.
  const raw=parseContract(JSON.stringify(observations),SNAPSHOT_LIMITS),supplied=parseContract(JSON.stringify(state),SNAPSHOT_LIMITS);
  if(Object.keys(raw).sort().join(',')!=='comment_pages,exact_comments,issues,provenance,references'||Object.keys(supplied).sort().join(',')!=='pending_intents,retained,retained_complete,retained_members'||!Array.isArray(report.scopes)||!Array.isArray(report.diagnostics)||!Object.values(raw).every(Array.isArray))reject('STRUCTURE');
  if(!Array.isArray(supplied.retained))reject('STRUCTURE');
  const retainedReferences=new Set();
  for(const r of supplied.retained){
   if(!validateRetained(r)||r.site!==scope.site)reject('STRUCTURE');
   const key=canonicalize([r.site,r.ticket_id,r.comment_id,r.record_id,r.digest]);if(retainedReferences.has(key))reject('STRUCTURE');retainedReferences.add(key);
  }
  const scopes=new Map();
  for(const row of report.scopes){
   if(Object.keys(row).sort().join(',')!=='complete,current_issue_ids,label,old_issue_ids,project_id'||typeof row.complete!=='boolean'||!scope.projects.some(p=>p.id===row.project_id)||typeof row.label!=='string')reject('STRUCTURE');
   for(const field of ['old_issue_ids','current_issue_ids'])if(!Array.isArray(row[field])||row[field].some(id=>typeof id!=='string'||!/^\d+$/.test(id))||new Set(row[field]).size!==row[field].length||!equal([...row[field]].sort(),row[field]))reject('STRUCTURE');
   const key=JSON.stringify([row.project_id,row.label]);if(scopes.has(key))reject('STRUCTURE');scopes.set(key,row);
  }
  for(const d of report.diagnostics){if(d.scope===null)reject('INCOMPLETE_SNAPSHOT');const row=scopes.get(JSON.stringify([d.scope?.project_id,d.scope?.label]));if(!row||row.complete)reject('INCOMPLETE_SNAPSHOT');}
  const incomplete=[...scopes.values()].filter(s=>!s.complete);
  if(incomplete.some(row=>!report.diagnostics.some(d=>d.scope?.project_id===row.project_id&&d.scope?.label===row.label)))reject('INCOMPLETE_SNAPSHOT');
  if(typeof report.domain_complete!=='boolean'||report.domain_complete!==(report.status==='complete')||report.domain_complete&&(incomplete.length||report.diagnostics.length)||!report.domain_complete&&(!incomplete.length||!report.diagnostics.length))reject('INCOMPLETE_SNAPSHOT');
  const issues=raw.issues.map(i=>{
   if(!i.pointer||!['present','absent','unknown'].includes(i.pointer.state)||i.pointer.state!=='present'&&i.pointer.value!==null||i.pointer.state==='present'&&!i.pointer.value)reject('STRUCTURE');
   return {...i,pointer:i.pointer.state==='unknown'?{state:'unknown',value:null}:i.pointer.value,required_requests:[]};
  });
  const byId=new Map(issues.map(i=>[i.id,i])),byKey=new Map(issues.map(i=>[i.key,i]));if(byId.size!==issues.length||byKey.size!==issues.length)reject('STRUCTURE');
  const declarations=new Map();for(const i of issues)try{declarations.set(i.id,i.format==='adf'?extractADF(i.body).value:parseWork(i.body));}catch{}
  const associated=new Map([...scopes.keys()].map(k=>[k,new Set()]));
  const add=(project,label,id)=>{const key=JSON.stringify([project,label]);if(!associated.has(key))reject('INCOMPLETE_SNAPSHOT');associated.get(key).add(id);};
  for(const i of issues){const p=scope.projects.find(p=>p.id===i.project_id);if(!p)reject('SCOPE');for(const l of i.labels.filter(l=>p.worker_prefixes.some(prefix=>l.startsWith(prefix)&&/^\d+$/.test(l.slice(prefix.length)))))add(i.project_id,l,i.id);
   const w=declarations.get(i.id);if(w?.schema==='pigboard-epic/v1'&&declarationRoot(i,p,supplied.retained_members))for(const ws of w.workstreams??[])for(const key of ws.story_order??[]){const member=byKey.get(key);if(member)add(i.project_id,ws.label,member.id);else if(scopes.get(JSON.stringify([i.project_id,ws.label]))?.complete)reject('INCOMPLETE_SNAPSHOT');}
  }
  for(const [key,row]of scopes){const old=supplied.retained_members.filter(r=>r.project_id===row.project_id&&r.label===row.label).map(r=>r.ticket_id);if(!equal([...new Set(old)].sort(),row.old_issue_ids)||[...associated.get(key)].some(id=>!row.current_issue_ids.includes(id))||row.current_issue_ids.some(id=>!associated.get(key).has(id)&&(row.complete||!raw.provenance.some(p=>p.ticket_id===id&&p.project_id===row.project_id&&p.label===row.label&&['label','declared'].includes(p.source)))))reject('MEMBERSHIP_MISMATCH');}
  for(const row of [...supplied.retained_members,...supplied.pending_intents])if(!scopes.has(JSON.stringify([row.project_id,row.label])))reject('INCOMPLETE_SNAPSHOT');
  const checks=[...scopes.values()].map(row=>({project_id:row.project_id,label:row.label,known_ids_complete:row.complete,repair_inventory_complete:row.complete}));
  const incoming=new Map();for(const row of raw.provenance){if(!incoming.has(row.ticket_id))incoming.set(row.ticket_id,[]);incoming.get(row.ticket_id).push(row);}
  const provenanceSources=new Set(['seed','label','retained','intent','child','declared','prerequisite','typed_reference']);
  const nativeIssue=name=>{const id=byId.get(name),key=byKey.get(name);if(id&&key&&id.id!==key.id)reject('INCOMPLETE_SNAPSHOT');return id??key;};
  // Incoming dependency/reference provenance locates every affected consumer; it
  // never adds membership. A valid composition can still contain held scopes.
  const hold=id=>{
   const affected=new Set(),visited=new Set(),anchored=new Set(),consumers=new Map(),pending=[id];
   for(let at=0;at<pending.length;at++){
    const name=pending[at],issue=nativeIssue(name),nativeId=issue?.id??name;if(visited.has(nativeId))continue;visited.add(nativeId);
    for(const [key,row]of scopes)if(row.old_issue_ids.includes(nativeId)||row.current_issue_ids.includes(nativeId)||report.diagnostics.some(d=>d.issue_id===nativeId&&d.scope?.project_id===row.project_id&&d.scope?.label===row.label)){affected.add(key);anchored.add(nativeId);}
    if(!issue)continue; // An unavailable old member retains its existing anchors.
    const rows=new Set([...(incoming.get(issue.id)??[]),...(incoming.get(issue.key)??[])]);
    for(const row of rows){
     if(nativeIssue(row.ticket_id)?.id!==issue.id||!provenanceSources.has(row.source))reject('INCOMPLETE_SNAPSHOT');
     if(row.label!==null&&row.label!==undefined){
      const project=scope.projects.find(p=>p.id===row.project_id),key=JSON.stringify([row.project_id,row.label]);
      if(!project||!configuredWorkerLabel(project,row.label)||!scopes.has(key))reject('INCOMPLETE_SNAPSHOT');affected.add(key);anchored.add(nativeId);
     }
     // A project-only acquisition observation does not identify a whole stream.
     if(['prerequisite','typed_reference'].includes(row.source)){
      const source=nativeIssue(row.source_ticket_id);if(!source)reject('INCOMPLETE_SNAPSHOT');if(!consumers.has(source.id))consumers.set(source.id,new Set());consumers.get(source.id).add(nativeId);pending.push(source.id);
     }
    }
   }
   // Resolve only after traversal: an anchored branch cannot conceal an
   // unlocatable branch or closed unanchored cycle elsewhere in the same reach.
   const located=new Set(anchored),resolved=[...anchored];for(let at=0;at<resolved.length;at++)for(const consumer of consumers.get(resolved[at])??[])if(!located.has(consumer)){located.add(consumer);resolved.push(consumer);}
   if(!affected.size||[...visited].some(id=>!located.has(id)))reject('INCOMPLETE_SNAPSHOT');
   for(const c of checks)if(affected.has(JSON.stringify([c.project_id,c.label]))){c.known_ids_complete=false;c.repair_inventory_complete=false;}
  };
  for(const i of issues)if(i.pointer?.state==='unknown')hold(i.id);
  const pages=raw.comment_pages.map(p=>({...p,comments:p.comments.map(c=>({...c,format:'adf'}))})),comments=new Map(),records=new Map(),completePages=new Set();
  const refKey=r=>canonicalize(r),logical=r=>canonicalize([r.ticket_id,r.record_id,r.digest]);
  for(const i of issues){const ps=pages.filter(p=>p.ticket_id===i.id).sort((a,b)=>a.start_at-b.start_at);let next=0,total=null,last=false;
   for(const p of ps){if(p.site!==scope.site||last||p.start_at!==next||total!==null&&p.total!==total){last=false;break;}total=p.total;next+=p.comments.length;last=p.is_last;if(next>total||last!==(next===total)||!last&&!p.comments.length){last=false;break;}
    for(const c of p.comments){const key=JSON.stringify([i.id,c.id]);if(comments.has(key))reject('STRUCTURE');comments.set(key,c);try{const candidate=extractHandoffCandidate(c.body);if(candidate){const reference={ticket_id:i.id,comment_id:c.id,record_id:candidate.value.record_id,digest:candidate.record_digest};records.set(refKey(reference),{reference,value:candidate.value});}}catch{hold(i.id);}}
   }if(!last||next!==total)hold(i.id);else completePages.add(i.id);
  }
  // Supplied prior observations remain binding even without an assigned target.
  // Missing current data holds the input; it does not prove metadata changed.
  for(const r of supplied.retained){
   const reference=Object.fromEntries(['ticket_id','comment_id','record_id','digest'].map(k=>[k,r[k]])),c=comments.get(JSON.stringify([r.ticket_id,r.comment_id])),record=records.get(refKey(reference));
   if(!byId.has(r.ticket_id)||!c||!record||record.value.ticket_id!==r.ticket_id||!['author_id','update_author_id','created','updated'].every(k=>c[k]===r[k]))hold(r.ticket_id);
  }
  // Follow only schema-owned references from every original comment on each relevant issue.
  const recordReferences=value=>{const refs=new Map();const walk=(v,schema)=>{if(v===null||v===undefined||!schema)return;if(schema.$ref){if(schema.$ref==='#/$defs/reference'){refs.set(refKey(v),v);return;}walk(v,recordSchema.$defs[schema.$ref.split('/').at(-1)]);return;}for(const branch of [...schema.anyOf??[],...schema.oneOf??[],...schema.allOf??[],...schema.then?[schema.then]:[]])walk(v,branch);if(schema.items&&Array.isArray(v))for(const item of v)walk(item,schema.items);for(const [key,child]of Object.entries(schema.properties??{}))if(Object.hasOwn(v,key))walk(v[key],child);};walk(value,recordSchema);return [...refs.values()];};
  const exactComments=new Set();
  for(const exact of raw.exact_comments){const key=JSON.stringify([exact.ticket_id,exact.id]),c=comments.get(key);if(!c||!['id','author_id','update_author_id','created','updated','body'].every(k=>equal(c[k],exact[k])))hold(exact.ticket_id);else exactComments.add(key);}
  for(const edge of raw.references){const ref=Object.fromEntries(['ticket_id','comment_id','record_id','digest'].map(k=>[k,edge[k]]));if(!records.has(refKey(ref))||!raw.exact_comments.some(c=>c.ticket_id===ref.ticket_id&&c.id===ref.comment_id))hold(edge.source_ticket_id??edge.ticket_id);}
  for(const r of records.values())for(const ref of recordReferences(r.value))if(!records.has(refKey(ref))||!raw.exact_comments.some(c=>c.ticket_id===ref.ticket_id&&c.id===ref.comment_id))hold(r.value.ticket_id);
  for(const i of issues)if(i.pointer?.assignment&&(!records.has(refKey(i.pointer.assignment))||!raw.exact_comments.some(c=>c.ticket_id===i.pointer.assignment.ticket_id&&c.id===i.pointer.assignment.comment_id)))hold(i.id);
  const find=r=>r&&records.get(refKey(r));
  const lineage=i=>{const seen=new Set();let ref=i.pointer?.assignment;while(ref){const k=refKey(ref);if(seen.has(k))break;seen.add(k);const record=find(ref);if(!record||record.value.kind!=='admission'||record.value.ticket_id!==i.id){hold(i.id);break;}ref=record.value.payload.previous_assignment;}return seen;};
  const current=new Map();
  for(const i of issues){const line=lineage(i),own=[...records.values()].filter(r=>r.value.ticket_id===i.id);i.required_requests=own.filter(r=>(['repair_request','stack_update_request'].includes(r.value.kind)||r.value.kind==='dependency_wait'&&line.has(refKey(r.value.assignment)))).map(r=>r.reference).sort((a,b)=>refKey(a).localeCompare(refKey(b)));
   if(!i.pointer?.assignment)continue;
   const candidates=own.filter(r=>r.value.kind==='qa'&&equal(r.value.assignment,i.pointer?.assignment)&&r.value.requirements_digest===digest(declarations.get(i.id)??null));const distinct=new Map(candidates.sort((a,b)=>refKey(a.reference).localeCompare(refKey(b.reference))).map(r=>[logical(r.reference),r]));if(distinct.size>1)hold(i.id);else if(distinct.size===1)current.set(i.id,[...distinct.values()][0]);
  }
  const assigned=issues.filter(i=>i.pointer?.assignment);
  const ready=issues.filter(i=>{
   const p=scope.projects.find(p=>p.id===i.project_id);
   return i.pointer===null&&i.status_id===p.stages['Ready to Work']&&[p.types.story,p.types.bug].includes(i.type_id)&&declarations.get(i.id)?.schema==='pigboard-ticket/v1';
  });
  const receiptIssues=[...assigned,...ready];
  const requirements=receiptIssues.filter(i=>declarations.get(i.id)?.schema==='pigboard-ticket/v1').map(i=>({ticket_id:i.id,digest:digest(declarations.get(i.id)),format:i.format,body:i.body}));
  const manager_assignments=supplied.retained_members.filter(r=>r.assignment!==null).map(r=>({ticket_id:r.ticket_id,assignment:r.assignment}));
  const facts=receiptIssues.map(i=>({site:scope.site,id:i.id,key:i.key,project_id:i.project_id,stage_id:i.status_id,stream:i.labels.find(l=>scopes.has(JSON.stringify([i.project_id,l])))??'',pointer:i.pointer,requirements_digest:digest(declarations.get(i.id)??null),required_requests:i.required_requests,pr_history_complete:completePages.has(i.id)&&checks.filter(c=>{
   const row=scopes.get(JSON.stringify([c.project_id,c.label]));
   return row.current_issue_ids.includes(i.id)||i.pointer===null&&row.old_issue_ids.includes(i.id);
  }).every(c=>c.repair_inventory_complete),published_prs:[...new Map([...records.values()].filter(r=>r.value.ticket_id===i.id).flatMap(r=>{const p=r.value.payload,pr=p.pr??p.existing_pr??p.child_pr;return pr?[[canonicalize([pr.provider,pr.repository,pr.number]),{provider:pr.provider,repository:pr.repository,number:pr.number}]]:[];})).values()]}));
  // Candidate resolutions come from actual QA -> review -> implementation consumption.
  const resolutions=new Map();
  const roots=(ref,seen=new Set())=>{const k=refKey(ref);if(seen.has(k))return [];seen.add(k);const r=find(ref);if(!r)return [];const p=r.value.payload;return [ref,...(r.value.kind==='repair_request'?[]:p.roots??p.requests??[]).flatMap(r=>roots(r,seen))];};
  for(const qa of current.values()){const review=find(qa.value.payload.review),impl=review&&find(review.value.payload.implementation);for(const request of (impl?.value.payload.consumed_requests??[]).flatMap(r=>roots(r))){const k=logical(request),prior=resolutions.get(k);if(prior&&!equal(prior.completion,qa.reference))hold(qa.value.ticket_id);else resolutions.set(k,{request,completion:qa.reference});}}
  const readyIds=new Set(ready.map(i=>i.id));
  function reachableReady(target){
   const anchors=new Set(),visited=new Set(),pending=[target];
   while(pending.length){
    const ref=pending.pop(),key=refKey(ref);
    if(visited.has(key))continue;visited.add(key);
    const record=find(ref);
    if(!record||record.value.ticket_id!==ref.ticket_id||ref!==target&&!exactComments.has(JSON.stringify([ref.ticket_id,ref.comment_id])))continue;
    if(byId.get(ref.ticket_id)?.pointer?.assignment)anchors.add(ref.ticket_id);
    pending.push(...recordReferences(record.value));
   }
   const reached=new Set(),walked=new Set(),workIds=[...anchors];
   while(workIds.length){
    const id=workIds.pop();if(walked.has(id))continue;walked.add(id);
    const work=declarations.get(id);
    if(work?.schema!=='pigboard-ticket/v1'||!Array.isArray(work.prerequisites))continue;
    for(const prerequisite of work.prerequisites){
     const dependency=byKey.get(prerequisite?.ticket);
     if(!dependency)continue;
     if(readyIds.has(dependency.id))reached.add(dependency.id);
     workIds.push(dependency.id);
    }
   }
   return reached;
  }
  const envelope=target=>{
   // Retain existing supporting assigned evidence. The exact target determines
   // which read-only declarations may accompany that evidence.
   const ids=new Set(),pending=[target.ticket_id];while(pending.length){
    const id=pending.pop();if(ids.has(id))continue;ids.add(id);
    for(const r of records.values())if(r.value.ticket_id===id)for(const ref of recordReferences(r.value))if(!ids.has(ref.ticket_id))pending.push(ref.ticket_id);
    const work=declarations.get(id);
    if(work?.schema==='pigboard-ticket/v1'&&Array.isArray(work.prerequisites))for(const prerequisite of work.prerequisites){
     const dependency=typeof prerequisite?.ticket==='string'?byKey.get(prerequisite.ticket):null;
     if(dependency&&!ids.has(dependency.id))pending.push(dependency.id);
    }
   }
   const reachedReady=ready.length?reachableReady(target):new Set();
   const included=id=>reachedReady.has(id)||ids.has(id)&&byId.get(id)?.pointer?.assignment;
   return {
    schema:'pigboard-manager-handoff-input/v1',consumer:'manager',target,
    trusted:{
     site:scope.site,
     projects:scope.projects.map(p=>Object.fromEntries(['id','stages','accepted_later_stage_ids','actors','repositories'].map(k=>[k,p[k]]))),
     manager_assignments:manager_assignments.filter(r=>included(r.ticket_id))
    },
    issues:facts.filter(r=>included(r.id)),
    requirements:requirements.filter(r=>included(r.ticket_id)),
    comment_pages:pages.filter(p=>included(p.ticket_id)),
    retained:supplied.retained.filter(r=>included(r.ticket_id)),
    request_resolutions:[...resolutions.values()].filter(r=>ids.has(r.request.ticket_id))
   };
  };
  const completion_receipts=[],repair_receipts=[];
  const targets=new Set();
  const addEnvelope=(target,completion=false)=>{const key=refKey(target);if(targets.has(key))return;targets.add(key);const raw=JSON.stringify(envelope(target));if(completion)completion_receipts.push(raw);else repair_receipts.push(raw);};
  for(const i of assigned){const qa=current.get(i.id);addEnvelope(qa?.reference??i.pointer.assignment,!!qa);for(const ref of i.required_requests)addEnvelope(ref);}
  const snapshot={schema:'pigboard-manager-snapshot/v2',site:scope.site,discovery_complete:true,retained_complete:true,projects:scope.projects.map(p=>({project_id:p.id,complete:true})),issues,retained_members:supplied.retained_members,stream_checks:checks,pending_intents:supplied.pending_intents,required_repairs:[],completion_receipts,repair_receipts};
  parseSnapshot(JSON.stringify(snapshot),scope,'ordinary');
  return {valid:true,snapshot,diagnostics};
 }catch(e){return {valid:false,snapshot:null,diagnostics:[e.diagnostic??reason('STRUCTURE')]};}
}
