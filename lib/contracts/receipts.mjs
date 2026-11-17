import { createHash } from 'node:crypto';
import canonicalize from 'canonicalize';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { parseContract, parseWork, extractADF, validateWork } from './work.mjs';
import { recordSchema, extractHandoff, extractHandoffCandidate, checkURLs, sanitizeDiagnostics } from './handoff.mjs';
import { checkCaseGraph, equal, pointer } from './case-graph.mjs';
import { validateSchedulingSemantics } from './work-semantics.mjs';

export const RECEIPT_LIMITS = Object.freeze({ bytes: 8 * 1024 * 1024, depth: 40, list: 1000 });
const text={type:'string',minLength:1,pattern:'\\S'}, id={type:'string',pattern:'^[0-9]+$'}, hash={type:'string',pattern:'^sha256:[0-9a-f]{64}$'}, flag={type:'boolean'}, count={type:'integer',minimum:0,maximum:9007199254740991};
const en=(...values)=>({enum:values}), nullable=s=>({anyOf:[s,{type:'null'}]}), list=(items,max=100)=>({type:'array',items,maxItems:max}), obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const ref={$ref:'#/$defs/reference'}, pr={$ref:'#/$defs/pr'}, https={type:'string',format:'uri',pattern:'^https://',maxLength:2048}, time={type:'string',format:'date-time'};
const stages=['Ready to Work','In Progress','In Review','QA','Human Review','Rework Queued','Blocked'];
const roles=['manager','implementer','reviewer','qa','human_request'];
const prIdentity=obj({provider:en('github','bitbucket'),repository:https,number:id});
const evidenceDetails={
 plan:obj({requirements_digest:hash,author_id:text}),
 plan_review:obj({requirements_digest:hash,reviewer_id:text,outcome:en('CLEAN','NOT_CLEAN','unknown')}),
 ci:obj({status:en('passed','failed','pending','unknown')}),
 approval:obj({state:en('approved','changes_requested','pending','unknown'),reviewer_id:text}),
 review_report:obj({criteria_complete:flag,comments_handled:flag}),
 preparation:obj({preparation_id:text,requirements_digest:hash,consumers:list(text)}),
 environment:obj({target_reference:text,comment_id:id,pipeline_actor_id:text}),
 reuse:obj({case_id:text,step_id:text,basis:text,source:ref}),artifact:obj({})
};
const evidence={...obj({uri:https,observed_digest:nullable(hash),available:flag,actor_id:text,pr:nullable(pr),kind:en(...Object.keys(evidenceDetails)),details:{}}),allOf:Object.entries(evidenceDetails).map(([kind,details])=>({if:{properties:{kind:{const:kind}}},then:{properties:{details}}}))};
const metadata={author_id:text,update_author_id:text,created:time,updated:time};
export const receiptInputSchema={...obj({
 schema:{const:'pigboard-receipt-input/v1'},consumer:en('worker','manager'),target:ref,
 trusted:obj({site:https,projects:list(obj({id:text,stages:obj(Object.fromEntries(stages.map(s=>[s,text]))),accepted_later_stage_ids:list(text),actors:obj(Object.fromEntries(roles.map(s=>[s,list(text)]))),repositories:list(https),evidence_uris:list(https),pipeline_actors:list(text),configured_targets:list(text)})),manager_assignments:list(obj({ticket_id:id,assignment:ref}))}),
 issues:list(obj({site:https,id,key:text,project_id:text,stage_id:text,stream:text,pointer:JSON.parse(readFileSync(new URL('../../contracts/work-pointer-v1.schema.json',import.meta.url),'utf8')),requirements_digest:hash,required_requests:list(ref),pr_history_complete:flag,published_prs:list(prIdentity)})),
 requirements:list(obj({ticket_id:id,digest:hash,format:en('yaml','adf'),body:text,context_body:text})),
 comment_pages:list(obj({site:https,ticket_id:id,start_at:count,total:count,is_last:flag,comments:list(obj({id,...metadata,format:en('adf','html'),body:text}))})),
 pr_receipts:list(obj({...recordSchema.$defs.pr.properties,state:en('open','merged','closed','unknown'),current:flag})),
 evidence_receipts:list(evidence),
 retained:list(obj({site:https,ticket_id:id,comment_id:id,record_id:recordSchema.properties.record_id,digest:hash,...metadata})),
 request_resolutions:list(obj({request:ref,completion:ref}))
}),$defs:recordSchema.$defs};
// Reduced manager proof is a separate closed contract, never a strict-input fallback.
const strictProperties=receiptInputSchema.properties;
export const managerHandoffInputSchema={...obj({
 schema:{const:'pigboard-manager-handoff-input/v1'},consumer:{const:'manager'},target:structuredClone(ref),
 trusted:obj({site:https,projects:list(obj(Object.fromEntries(['id','stages','accepted_later_stage_ids','actors','repositories'].map(key=>[key,structuredClone(strictProperties.trusted.properties.projects.items.properties[key])])))),manager_assignments:structuredClone(strictProperties.trusted.properties.manager_assignments)}),
 issues:structuredClone(strictProperties.issues),
 requirements:list(obj({ticket_id:id,digest:hash,format:en('yaml','adf'),body:text})),
 comment_pages:structuredClone(strictProperties.comment_pages),retained:structuredClone(strictProperties.retained),request_resolutions:structuredClone(strictProperties.request_resolutions)
}),$defs:structuredClone(recordSchema.$defs)};
// Ordinary workers keep full current proof for their own assignment and authenticate ancestry.
export const workerHandoffInputSchema={...obj({
 schema:{const:'pigboard-worker-handoff-input/v1'},consumer:{const:'worker'},purpose:{const:'worker-current'},target:structuredClone(ref),
 trusted:obj({site:https,projects:structuredClone(strictProperties.trusted.properties.projects)}),
 issues:structuredClone(strictProperties.issues),requirements:structuredClone(managerHandoffInputSchema.properties.requirements),
 current_context_body:text,comment_pages:structuredClone(strictProperties.comment_pages),
 pr_receipts:structuredClone(strictProperties.pr_receipts),evidence_receipts:structuredClone(strictProperties.evidence_receipts),
 retained:structuredClone(strictProperties.retained),request_resolutions:structuredClone(strictProperties.request_resolutions),
 publisher:{...obj({role:en('implementer','reviewer','qa'),account_id:text}),properties:{role:en('implementer','reviewer','qa'),account_id:text,intent:en('success','repair_request')}},
 action_receipt:obj({site:https,project_id:text,ticket_id:id,actor_id:text,stage_id:text,can_read_issue:flag,can_append_comment:flag,transitions:list(obj({from_stage_id:text,to_stage_id:text}))})
}),$defs:structuredClone(recordSchema.$defs)};
const workerBase=()=>({schema:'pigboard-worker-handoff-validation/v1',mode:'worker-current',purpose:'worker-current',validation_scope:'supplied_current_worker_proof',live_freshness:'not_evaluated',execution_authorized:false,valid:false,target:null,record_digest:null,outcome:null,validated_leaf:null,assignment:null,requirements_digest:null,qa_report:null,ai_steps:null,human_pending:null,no_ai_cases_reason:null,diagnostics:[],trust_limitations:['Current authentication does not guarantee comparison against an earlier metadata observation. Supplied prior tuples must match.','Supplied current observations do not prove live freshness or grant execution authority.']});
const installedSkills=JSON.parse(readFileSync(new URL('../../config/skill-bundle.json',import.meta.url),'utf8')).skills;
const recordedBase=purpose=>({schema:'pigboard-recorded-handoff-validation/v1',mode:purpose,purpose,valid:false,validation_scope:'authenticated_recorded_handoffs',basis:'authenticated_jira_handoff',external_freshness:'not_evaluated',execution_authorized:false,recorded_completion_established:false,target:null,diagnostics:[],metadata_continuity:'supplied_prior_tuples_only',trust_limitations:['Current authentication does not guarantee comparison against an earlier metadata observation. Supplied prior tuples must match.','Supplied provider facts are not cryptographic proof of live provider origin; role accounts may overlap and do not establish exclusive execution.']});
const ajv=new Ajv2020({allErrors:true,strict:false,ownProperties:true});addFormats(ajv,{mode:'full'});const validateEnvelope=ajv.compile(receiptInputSchema),validateManagerEnvelope=ajv.compile(managerHandoffInputSchema),validateWorkerEnvelope=ajv.compile(workerHandoffInputSchema);
const digest=v=>'sha256:'+createHash('sha256').update(canonicalize(v),'utf8').digest('hex');
const resultBase=()=>({schema:'pigboard-handoff-validation/v1',mode:'chain',valid:false,validation_scope:'supplied_receipts',live_freshness:'not_evaluated',record_digest:null,target:null,outcome:null,completion_established:false,ai_steps:null,human_pending:null,validated_leaf:null,qa_report:null,diagnostics:[],trust_limitations:['Supplied provider facts are not cryptographic proof of live provider origin; role accounts may overlap and do not establish exclusive execution.']});
const fail=(code,path,message,reference)=>{throw Object.assign(new Error(message),{diagnostic:{code,path,message,...(reference?{reference}: {})}});};
const sorted=ds=>ds.sort((a,b)=>a.path.localeCompare(b.path)||a.code.localeCompare(b.code));
const identity=p=>p&&JSON.stringify([p.provider,p.repository,p.number]);
const prKey=p=>p&&JSON.stringify([p.provider,p.repository,p.number,p.source_revision]);
const refKey=r=>r&&JSON.stringify([r.ticket_id,r.comment_id,r.record_id,r.digest]);
const logical=r=>r&&JSON.stringify([r.ticket_id,r.record_id,r.digest]);
const location=(p,k)=>p+'/'+pointer(k);

/** Validate only bounded, supplied local receipts. Never fetch, write or infer live freshness. */
function evaluateReceiptChain(input,purpose='current-chain'){
 const worker=purpose==='worker-current';
 const recorded=purpose==='recorded-history'||purpose==='recorded-completion',history=purpose==='manager-history'||purpose==='recorded-history',historyProof=history?Object.freeze({purpose}):null;
 const schema=worker?workerHandoffInputSchema:recorded?managerHandoffInputSchema:receiptInputSchema,validateInput=worker?validateWorkerEnvelope:recorded?validateManagerEnvelope:validateEnvelope;
 const bindings=[],out=worker?workerBase():recorded?{...recordedBase(purpose),...(history?{records:[],coverage_segments:[],bindings:[]}:{record_digest:null,outcome:null,validated_leaf:null,qa_report:null,ai_steps:null,human_pending:null,no_ai_cases_reason:null})}:history?{valid:false,validation_scope:'supplied_receipts',live_freshness:'not_evaluated',completion_established:false,execution_authorized:false,target:null,records:[],coverage_segments:[],bindings:[],diagnostics:[]}:resultBase();
 const finish=()=>{out.diagnostics=sanitizeDiagnostics(out.diagnostics,[schema]);if(worker&&!out.valid)for(const key of ['record_digest','outcome','validated_leaf','assignment','requirements_digest','qa_report','ai_steps','human_pending','no_ai_cases_reason'])out[key]=null;if(recorded&&!out.valid){out.recorded_completion_established=false;if(history){out.records=[];out.coverage_segments=[];out.bindings=[];}else{out.validated_leaf=null;out.qa_report=null;out.ai_steps=null;out.human_pending=null;out.no_ai_cases_reason=null;}}return history?out:{validation:out,bindings:out.valid?bindings:[]};};
 try{
  // JSON.parse is a syntax gate only; the shared AST parser rejects duplicate keys
  // and unsafe literals before any provider facts are interpreted.
  const envelope=parseContract(input,{bytes:RECEIPT_LIMITS.bytes,depth:RECEIPT_LIMITS.depth,list:RECEIPT_LIMITS.list});
  try{JSON.parse(typeof input==='string'?input:new TextDecoder('utf-8',{fatal:true}).decode(input));}catch{fail('PARSE','','Supply one JSON receipt envelope.');}
  if(!validateInput(envelope)){
   out.diagnostics=sorted(validateInput.errors.map(e=>({code:e.keyword==='format'?'FORMAT':'STRUCTURE',path:e.instancePath+(e.keyword==='required'?'/'+pointer(e.params.missingProperty):''),message:'Supply the complete declared receipt field with its supported type and value.'})));return finish();
  }
  const urls=checkURLs(envelope,'',[schema]);if(urls.length){out.diagnostics=sorted(urls);return finish();}
  const E=envelope;out.target=E.target;
  if(history&&E.consumer!=='manager')fail('PROJECT','/consumer','Historical inspection requires the manager consumer.');
  const site=E.trusted.site;
  let origin;try{origin=new URL(site);if(origin.origin!==site||origin.protocol!=='https:')throw Error();}catch{fail('PROJECT','/trusted/site','Supply the exact configured HTTPS Jira origin.');}
  const uniqueIndex=(entries,key,path)=>{const m=new Map();entries.forEach((e,i)=>{const k=key(e);if(m.has(k))fail('REFERENCE',path+'/'+i,'Supply each identity once, without conflicting observations.');m.set(k,{value:e,path:path+'/'+i});});return m;};
  const projects=uniqueIndex(E.trusted.projects,x=>x.id,'/trusted/projects'),issues=uniqueIndex(E.issues,x=>x.id,'/issues'),manager=uniqueIndex(E.trusted.manager_assignments??[],x=>x.ticket_id,'/trusted/manager_assignments');
  const issueFor=(ticket,path)=>{const e=issues.get(ticket);if(!e)fail('REFERENCE',path,'Supply the referenced native issue snapshot.');if(e.value.site!==site)fail('PROJECT',e.path+'/site','Use the configured Jira site for every supplied issue.');if(!projects.has(e.value.project_id))fail('PROJECT',e.path+'/project_id','Use an explicitly configured immutable project ID.');return e;};
  const projectFor=(ticket,path)=>projects.get(issueFor(ticket,path).value.project_id).value;
  const requirements=new Map(),requirementObservations=[];
  if(recorded||worker)uniqueIndex(E.issues,x=>x.key,'/issues');
  for(const [i,r]of E.requirements.entries()){
   const path='/requirements/'+i,checked=validateWork(r.body,(recorded||worker)?{mode:'structure',format:r.format}:{mode:'start',format:r.format,contextInput:r.context_body});
   if(!checked.valid){out.diagnostics=checked.diagnostics.map(d=>({...d,path:path+(d.path.startsWith('/context')?'/context_body'+d.path.slice(8):'/body'+d.path)}));return finish();}
   const work=r.format==='adf'?extractADF(r.body).value:parseWork(r.body);if(work.schema!=='pigboard-ticket/v1')fail('REQUIREMENTS',path+'/body','Supply a complete start-valid ticket contract.');
   if(digest(work)!==r.digest)fail('REQUIREMENTS',path+'/digest','Match the complete canonical requirements digest.');
   const native=issueFor(r.ticket_id,path+'/ticket_id').value;
   if(recorded||worker){
    if(r.digest!==native.requirements_digest)fail('REQUIREMENTS',path+'/digest','Supply only the native current requirements version.');
    if(requirementObservations.some(x=>x.ticket===r.ticket_id))fail('REQUIREMENTS',path,'Supply one unambiguous current requirements row per ticket.');
    requirements.set(JSON.stringify([r.ticket_id,r.digest]),{work,path,raw:r});requirementObservations.push({ticket:r.ticket_id,digest:r.digest,format:r.format,body:r.body,work});continue;
   }
   const facts=parseWork(r.context_body);
   if(facts.subject_key!==native.key)fail('PROJECT',path+'/context_body/subject_key','Bind start context to the current native issue key.');
   const configured=projectFor(r.ticket_id,path+'/ticket_id');
   if(!configured.repositories.includes(work.technical_acceptance_criteria.repository.url))fail('PR',path+'/body/technical_acceptance_criteria/repository/url','Use an exact configured repository.');
   const key=JSON.stringify([r.ticket_id,r.digest]);if(requirements.has(key)&&canonicalize(requirements.get(key).work)!==canonicalize(work))fail('REQUIREMENTS',path,'Supply one coherent body per requirements digest.');
   requirements.set(key,{work,facts,path});
   requirementObservations.push({ticket:r.ticket_id,digest:r.digest,work,facts});
  }
  const requirementFor=(r,path)=>{const x=requirements.get(JSON.stringify([r.ticket_id,r.requirements_digest]));if(!x)fail('REQUIREMENTS',path+'/requirements_digest','Supply this exact assignment requirements snapshot.');return x;};
  const checkedDeclarations=new Set();
  function currentDeclaration(r,path){
   const req=requirementFor(r,path);if(checkedDeclarations.has(r.ticket_id))return req;
   const native=issueFor(r.ticket_id,path).value;
   const facts={subject:{site:native.site,project_id:native.project_id,key:native.key},prerequisite_graph:requirementObservations.map(row=>({ticket:issueFor(row.ticket,row.path??path).value.key,prerequisites:row.work.prerequisites.map(d=>d.ticket)})),related_changes:req.work.technical_acceptance_criteria.repository.related_repositories.map(v=>({repository:v.url,change_story:v.change_story}))};
   const semantic=validateSchedulingSemantics(req.work,facts,projectFor(r.ticket_id,path),installedSkills);
   if(semantic.diagnostics.length)throw {diagnostics:semantic.diagnostics.map(d=>({...d,path:req.path+'/body'+d.path}))};
   req.facts=facts;checkedDeclarations.add(r.ticket_id);return req;
  }
  const prs=new Map(),currents=new Map();
  if(!recorded)E.pr_receipts.forEach((p,i)=>{const path='/pr_receipts/'+i,k=prKey(p);if(prs.has(k))fail('PR',path,'Supply one coherent receipt per PR revision.');prs.set(k,{value:p,path});if(p.current){if(currents.has(identity(p)))fail('PR',path+'/current','Supply exactly one current revision for this PR.');currents.set(identity(p),p);}});
  const observations=recorded?new Map():uniqueIndex(E.evidence_receipts,x=>x.uri,'/evidence_receipts');
  const comments=new Map(),records=[],byLogical=new Map(),byUUID=new Map();let aggregate=0;
  for(const [ticket,entry]of issues){
   issueFor(ticket,entry.path);const pages=E.comment_pages.map((value,i)=>({value,path:'/comment_pages/'+i})).filter(p=>p.value.ticket_id===ticket).sort((a,b)=>a.value.start_at-b.value.start_at);
   if(!pages.length)fail('INCOMPLETE_READ','/comment_pages','Supply complete comment discovery for every referenced issue.');
   let next=0,total=null,last=false;
   for(const page of pages){const p=page.value;
    if(p.site!==site)fail('PROJECT',page.path+'/site','Use the configured Jira site.');
    if(last||p.start_at!==next||(total!==null&&p.total!==total))fail('INCOMPLETE_READ',page.path,'Supply contiguous nonoverlapping pages with a consistent total.');
    total=p.total;next+=p.comments.length;if(next>total||p.is_last!==(next===total)||(!p.is_last&&!p.comments.length))fail('INCOMPLETE_READ',page.path,'End discovery exactly at the declared total with a final page.');last=p.is_last;
    for(const [j,c]of p.comments.entries()){
     const path=page.path+'/comments/'+j,k=JSON.stringify([ticket,c.id]);if(comments.has(k))fail('INCOMPLETE_READ',path+'/id','Supply each server comment ID once per issue.');
     if(++aggregate>1000)fail('LIMIT','/comment_pages','Supply at most 1000 comments in aggregate.');
     const comment={comment:c,path,issue:entry.value,reference:null,record:null};comments.set(k,comment);
     let extracted;try{extracted=(recorded||worker)&&c.format==='adf'?extractHandoffCandidate(c.body):extractHandoff(c.body,{format:c.format});if(extracted===null)continue;}catch(e){if(e.diagnostic?.code==='HANDOFF_BLOCK_COUNT'&&e.diagnostic.blocks===0)continue;const ds=e.diagnostics??(e.diagnostic?[e.diagnostic]:null);if(!ds)throw e;out.diagnostics=ds.map(d=>({...d,path:path+'/body'+d.path}));return finish();}
     const r=extracted.value;comment.record=r;comment.reference={ticket_id:ticket,comment_id:c.id,record_id:r.record_id,digest:extracted.record_digest};
     if(r.ticket_id!==ticket)fail('REFERENCE',path+'/body/ticket_id','Match the enclosing native issue ID.',comment.reference);
     if(c.created!==c.updated||c.author_id!==c.update_author_id)fail('METADATA',path,'Typed records must retain unchanged creation, update and actor metadata.',comment.reference);
     if(!projectFor(ticket,path).actors[r.role].includes(c.author_id))fail('ACTOR',path+'/author_id','Use an explicitly configured server actor for this role.',comment.reference);
     if(!recorded&&!worker)requirementFor(r,path+'/body');
     const uuid=byUUID.get(r.record_id);if(uuid&&logical(uuid.reference)!==logical(comment.reference))fail('REFERENCE',path+'/body/record_id','A record UUID must have one exact body and issue.');byUUID.set(r.record_id,comment);
     const lk=logical(comment.reference);if(!byLogical.has(lk)){byLogical.set(lk,comment);records.push(comment);}
    }
   }
   if(!last||next!==total)fail('INCOMPLETE_READ','/comment_pages','Supply the final page and every declared comment.');
  }
  E.comment_pages.forEach((p,i)=>{if(!issues.has(p.ticket_id))fail('REFERENCE','/comment_pages/'+i+'/ticket_id','Supply the native issue for this page.');});
  const resolve=(r,path)=>{
   const c=comments.get(JSON.stringify([r.ticket_id,r.comment_id]));
   if(!c?.record||!equal(c.reference,r))fail('REFERENCE',path,'Resolve this exact ticket, comment, record UUID and digest.',{ticket_id:r.ticket_id,comment_id:r.comment_id,record_id:r.record_id});return c;
  };
  const retained=uniqueIndex(E.retained,r=>JSON.stringify([r.site,refKey(r)]),'/retained');
  for(const [i,r]of E.retained.entries()){
   if(r.site!==site)fail('PROJECT','/retained/'+i+'/site','Use the configured Jira site.');
   const c=resolve({ticket_id:r.ticket_id,comment_id:r.comment_id,record_id:r.record_id,digest:r.digest},'/retained/'+i);
   for(const k of Object.keys(metadata))if(c.comment[k]!==r[k])fail('METADATA','/retained/'+i+'/'+k,'Retained consumed metadata must match the current server receipt exactly.',c.reference);
  }
  // Complete supplied discovery also preserves publication history even when an
  // old result is not a predecessor of the selected target.
  for(const c of records){
   const p=c.record.payload,field=p.pr?'pr':p.existing_pr?'existing_pr':p.child_pr?'child_pr':null,ownPR=field&&p[field];
   const req=(recorded||worker)?requirements.get(JSON.stringify([c.record.ticket_id,c.record.requirements_digest])):requirementFor(c.record,c.path);
   if(ownPR&&req&&ownPR.repository!==req.work.technical_acceptance_criteria.repository.url)fail('PR',c.path+'/body/payload/'+field+'/repository','Use the exact repository in this record’s assigned requirements.',c.reference);
   if((recorded||worker)&&ownPR&&!projectFor(c.record.ticket_id,c.path).repositories.includes(ownPR.repository))fail('PR',c.path+'/body/payload/'+field+'/repository','Use an exact configured repository.',c.reference);
   if(ownPR&&!c.issue.published_prs.some(v=>identity(v)===identity(ownPR)))fail('PR',c.path+'/body/payload/'+field,'Retain every discovered own-ticket PR in the complete publication inventory.',c.reference);
  }
  const target=resolve(E.target,'/target'),targetRecord=target.record,targetIssue=issueFor(targetRecord.ticket_id,'/target').value,targetAssignment=targetRecord.kind==='admission'?target.reference:targetRecord.assignment;
  if(!history){out.record_digest=target.reference.digest;out.outcome=targetRecord.kind;}
  if(recorded&&!history&&targetRecord.kind!=='qa')fail('COMPLETION','/target','Recorded completion requires an exact current QA target.');
  const activeAssignment=resolve(targetAssignment,'/target/assignment');
  const isSame=(a,b)=>logical(a)===logical(b);
  // This classification is local to each immutable record, never a global reduced-proof switch.
  const ownCurrent=c=>c.record.ticket_id===targetRecord.ticket_id&&currentRecordedAssignment(c);
  const recordedProof=c=>recorded||(worker&&!ownCurrent(c));
  if(worker){
   const intent=E.publisher.intent??'success';
   const routes={implementer:{success:['admission','implementation','In Progress','In Review']},reviewer:{success:['implementation','review','In Review','QA'],repair_request:['implementation','repair_request','In Review','Rework Queued']},qa:{success:['review','qa','QA','Human Review'],repair_request:['review','repair_request','QA','Rework Queued']}};
   const route=routes[E.publisher.role][intent];
   if(!route||![route[0],route[1]].includes(targetRecord.kind)||activeAssignment.record.payload.mode!=='new_work'||targetRecord.resume_authorization!==null)fail('UNSUPPORTED','/target','Use a supported new_work publisher intent and actual predecessor or matching published leaf; retain unsupported work locally without mutation.');
   const leaf=targetRecord.kind===route[1];
   if(leaf&&(targetRecord.role!==E.publisher.role||targetRecord.from_stage!==route[2]||targetRecord.to_stage!==route[3]))fail('UNSUPPORTED','/target','Match the published leaf role and exact source/destination to the selected publisher intent.');
   const req=requirementFor(targetRecord,'/target'),raw=req.raw,native=targetIssue,config=projectFor(native.id,'/target');
   const checked=validateWork(raw.body,{mode:'start',format:raw.format,contextInput:E.current_context_body});
   if(!checked.valid){out.diagnostics=checked.diagnostics.map(d=>({...d,path:d.path.startsWith('/context')?'/current_context_body'+d.path.slice(8):req.path+'/body'+d.path}));return finish();}
   req.facts=parseWork(E.current_context_body);
   if(req.facts.subject_key!==native.key)fail('PROJECT','/current_context_body/subject_key','Bind start context to the current native issue key.');
   if(!config.repositories.includes(req.work.technical_acceptance_criteria.repository.url))fail('PR',req.path+'/body/technical_acceptance_criteria/repository/url','Use an exact configured repository.');
   const actor=E.publisher.account_id,a=E.action_receipt,[,,from,to]=route;
   if(!config.actors[E.publisher.role].includes(actor))fail('AUTHORITY','/publisher/account_id','Use the configured current role account.');
   if(leaf&&(target.comment.author_id!==actor||target.comment.update_author_id!==actor))fail('AUTHORITY','/publisher/account_id','Match the final target author and update author to the configured current publisher account.',target.reference);
   for(const [key,value]of Object.entries({site,project_id:native.project_id,ticket_id:native.id,actor_id:actor,stage_id:config.stages[from]}))if(a[key]!==value)fail('AUTHORITY','/action_receipt/'+key,'Match the selected native issue, configured actor and current source stage.');
   if(native.stage_id!==a.stage_id)fail('AUTHORITY','/action_receipt/stage_id','Observe the selected native issue in the role source stage before transition.');
   for(const key of ['can_read_issue','can_append_comment'])if(!a[key])fail('AUTHORITY','/action_receipt/'+key,'Supply current read and append capability.');
   const edges=new Set();for(const edge of a.transitions){const key=JSON.stringify([edge.from_stage_id,edge.to_stage_id]);if(edges.has(key))fail('AUTHORITY','/action_receipt/transitions','Supply unique observed direct transition pairs.');edges.add(key);}
   if(!a.transitions.some(e=>e.from_stage_id===config.stages[from]&&e.to_stage_id===config.stages[to]))fail('AUTHORITY','/action_receipt/transitions','Supply the configured direct role transition.');
  }

  const checkCurrent=(c,path)=>{
   const r=c.record,issue=issueFor(r.ticket_id,path).value,assignment=r.kind==='admission'?c.reference:r.assignment;
   if(!equal(issue.pointer.assignment,assignment)||!equal(issue.pointer.assignment,resolve(issue.pointer.assignment,path+'/pointer').reference))fail('ASSIGNMENT',path+'/assignment','Use the issue’s exact current admission pointer.',c.reference);
   if(r.requirements_digest!==issue.requirements_digest)fail('REQUIREMENTS',path+'/requirements_digest','Current work must use the native issue’s current requirements digest.',c.reference);
   if(E.consumer==='manager'){const m=manager.get(r.ticket_id);if(!m||!equal(m.value.assignment,issue.pointer.assignment))fail('ASSIGNMENT','/trusted/manager_assignments','Supply the exact current stored manager assignment.',c.reference);}
  };
  const checkPR=(p,c,path,{current=false,completion=false,blocked=false}={})=>{
   if(!p)return;
   const req=(recorded||worker)?requirements.get(JSON.stringify([c.record.ticket_id,c.record.requirements_digest])):requirementFor(c.record,path);
   const assignedRepository=req?.work.technical_acceptance_criteria.repository.url;
   if(assignedRepository&&p.repository!==assignedRepository)fail('PR',path+'/repository','Use the exact repository in this assignment’s validated requirements.',c.reference);
   const config=projectFor(c.record.ticket_id,path);if(!config.repositories.includes(p.repository))fail('PR',path+'/repository','Use an exact allowed repository.',c.reference);
   if(recordedProof(c)&&!(worker&&current))return; // Embedded identities are authenticated assertions, not external PR observations.
   const observation=prs.get(prKey(p));if(!observation||observation.value.target_branch!==p.target_branch)fail('PR',path,'Supply the exact observed PR revision and target branch.',c.reference);
   const now=currents.get(identity(p));if(!now)fail('PR',path,'Supply exactly one current observation for this PR.',c.reference);
   if(current&&(!equal({...p,state:now.state,current:now.current},now)))fail('PR',path,'Match the current observed PR source and target.',c.reference);
   if(current&&!blocked&&!((completion&&['open','merged'].includes(now.state))||(!completion&&now.state==='open')))fail('PR',path,'Current advancement requires an open PR; accepted completion also permits merged.',c.reference);
   const issue=issueFor(c.record.ticket_id,path).value;
   if(!issue.published_prs.some(x=>identity(x)===identity(p)))fail('PR',path,'Retain every own-ticket PR in the supplied publication inventory.',c.reference);
  };
  const evidenceFor=(e,c,path,kind=null,{successful=false,hashed=false}={})=>{
   const o=observations.get(e.uri),config=projectFor(c.record.ticket_id,path);
   if(!config.evidence_uris.includes(e.uri)||!o||!o.value.available)fail('EVIDENCE',path,'Supply an approved retrievable evidence observation.',c.reference);
   const v=o.value;if((e.digest!==null&&e.digest!==v.observed_digest)||(hashed&&(e.digest===null||e.digest!==v.observed_digest)))fail('EVIDENCE',path+'/digest','Match the exact required evidence content hash.',c.reference);
   if(kind&&v.kind!==kind)fail('EVIDENCE',path,'Supply an observation of the required evidence kind.',c.reference);
   const p=c.record.payload.pr??null;if(p&&!equal(v.pr,p))fail('EVIDENCE',path,'Bind evidence to this exact PR source and target.',c.reference);
   if(successful){
    const d=v.details;
    if(['plan','plan_review','preparation'].includes(v.kind)&&d.requirements_digest!==c.record.requirements_digest)fail('REQUIREMENTS',o.path+'/details/requirements_digest','Bind the report to the same complete requirements digest.',c.reference);
    if(v.kind==='plan_review'&&d.outcome!=='CLEAN')fail('EVIDENCE',o.path+'/details/outcome','Supply a CLEAN independent plan review.',c.reference);
    if(v.kind==='ci'&&d.status!=='passed')fail('EVIDENCE',o.path+'/details/status','Supply passing CI for this exact revision.',c.reference);
    if(v.kind==='approval'&&(d.state!=='approved'||!config.actors.reviewer.includes(d.reviewer_id)||d.reviewer_id!==v.actor_id))fail('EVIDENCE',o.path+'/details','Supply the configured reviewer’s observed current approval.',c.reference);
    if(v.kind==='review_report'&&(!d.criteria_complete||!d.comments_handled||!config.actors.reviewer.includes(v.actor_id)))fail('EVIDENCE',o.path+'/details','Supply a complete shared review report and handled comment evidence.',c.reference);
   }
   return v;
  };
  const slots=new Map(),authorizations=new Map();
  for(const c of records){const r=c.record;
   if(['implementer','reviewer','qa'].includes(r.role)){
    const key=JSON.stringify([site,r.ticket_id,logical(r.assignment),r.role,logical(r.resume_authorization)]);
    if(slots.has(key)&&!isSame(slots.get(key).reference,c.reference))fail('SLOT_CONFLICT',c.path+'/body','Different final records occupy the same assignment, role and resume slot.',c.reference);slots.set(key,c);
   }
   if(r.kind==='resume_authorization'){
    const key=logical(resolve(r.payload.blocked_result,c.path+'/body/payload/blocked_result').reference);
    if(authorizations.has(key)&&!isSame(authorizations.get(key).reference,c.reference))fail('RESUME',c.path+'/body','A blocker has competing human authorizations.',c.reference);authorizations.set(key,c);
   }
  }
  const memo=new Map(),visiting=new Set(),nullObligations=new Map();
  // Structure is immutable within this call. Completed closures contain no
  // temporal authority and deliberately survive failed semantic speculation.
  const rootClosures=new Map(),rootActive=new Set(),segments=new Map();
  const incorporatedParents=new Map();
  let incorporation=null;
  if(!history&&['implementation','review','qa'].includes(targetRecord.kind)){
   let candidate=target;const seen=new Set();
   while(['qa','review'].includes(candidate.record.kind)){
    const k=logical(candidate.reference);if(seen.has(k))fail('REFERENCE','/target','Remove cyclic result predecessors.');seen.add(k);
    candidate=resolve(candidate.record.payload[candidate.record.kind==='qa'?'review':'implementation'],'/target');
   }
   if(candidate.record.kind==='implementation'&&candidate.record.payload.stack_parent)incorporation={anchor:resolve(candidate.record.payload.stack_parent.completion,'/target/payload/stack_parent/completion')};
  }
  function retainClosure(c,path,seen=new Set()){
   const key=refKey(c.reference);if(seen.has(key))return;seen.add(key);
   if(!recorded&&!worker&&!retained.has(JSON.stringify([site,key])))fail('METADATA',path,'Supply exact retained server metadata for every historical proof record.',c.reference);
   const walk=v=>{if(!v||typeof v!=='object')return;if(v.ticket_id&&v.comment_id&&v.record_id&&v.digest){retainClosure(resolve(v,path),path,seen);return;}for(const value of Object.values(v))walk(value);};walk(c.record);
   for(const step of (c.record.payload.report?.steps??c.record.payload.qa_report?.steps??[])){const reuse=step.reused_from&&observations.get(step.reused_from.uri);if(reuse?.value.kind==='reuse')retainClosure(resolve(reuse.value.details.source,path),path,seen);}
  }
  function successor(chosen,previous,path){
   if(chosen.record.kind!=='qa'||previous.record.kind!=='qa'||chosen.record.ticket_id!==previous.record.ticket_id||identity(chosen.record.payload.pr)!==identity(previous.record.payload.pr))fail('REPAIR',path,'Use the same parent ticket and preserved PR through explicit successor admissions.',chosen.reference);
   const line=admissionLineage(resolve(chosen.record.assignment,path),path),index=line.findIndex(a=>isSame(a.reference,previous.record.assignment));
   if(index<0)fail('REPAIR',path,'Prove the requested parent is in the chosen completion’s admission ancestry.',previous.reference);
   for(const a of line.slice(0,index+1))if(a.record.ticket_id!==previous.record.ticket_id||(a.record.payload.existing_pr&&identity(a.record.payload.existing_pr)!==identity(previous.record.payload.pr)))fail('REPAIR',path,'Preserve the parent ticket and PR throughout successor ancestry.',a.reference);
   return line.slice(0,index);
  }
  function completedLeaf(c,path,proof){
   const related=records.filter(x=>x.record.ticket_id===c.record.ticket_id&&isSame(x.record.assignment,c.record.assignment)&&x.record.role==='qa'),initial=related.filter(x=>x.record.resume_authorization===null);
   if(initial.length!==1)fail('RESUME',path,'Supply one initial QA result for this historical assignment.',c.reference);
   let leaf=initial[0];const traversed=new Set();
   while(leaf.record.kind==='blocked'&&authorizations.has(logical(leaf.reference))){
    if(traversed.has(logical(leaf.reference)))fail('RESUME',path,'Remove cyclic QA resumption.',c.reference);traversed.add(logical(leaf.reference));
    const auth=authorizations.get(logical(leaf.reference));validateRecord(auth,proof);const children=related.filter(x=>isSame(x.record.resume_authorization,auth.reference));
    if(children.length!==1)fail('RESUME',path,'Supply the unique authorized resumed QA result.',auth.reference);leaf=children[0];
   }
   if(leaf.record.kind!=='qa'||!isSame(leaf.reference,c.reference)||related.some(x=>x.record.resume_authorization&&!traversed.has(logical(resolve(resolve(x.record.resume_authorization,path).record.payload.blocked_result,path).reference))))fail('RESUME',path,'Use the unique coherent authorized QA completion.',c.reference);
  }
  function effectiveBetween(parent,cutoff,path,proof,parentResult){
   const pairKey=JSON.stringify([purpose,refKey(parent.reference),refKey(cutoff.reference),proof?.anchor?refKey(proof.anchor.reference):null]);
   if(segments.has(pairKey))return segments.get(pairKey);
   const segment=successor(parent,cutoff,path),roots=new Set();completedLeaf(cutoff,path,proof);
   for(const a of segment){
    const candidates=records.filter(q=>q.record.kind==='qa'&&q.record.ticket_id===parent.record.ticket_id&&isSame(q.record.assignment,a.reference));
    if(candidates.length!==1)fail('REPAIR',path,'Supply the coherent QA completion for every contributing parent repair.',a.reference);
    const completion=candidates[0],v=isSame(completion.reference,parent.reference)?parentResult:validateRecord(completion,proof);completedLeaf(completion,path,proof);
    for(const root of rootsFor(consumedBy(v),path))roots.add(root);
   }const result=Object.freeze([...roots]);segments.set(pairKey,result);return result;
  }
  const reportOf=c=>c.record.payload.report?.steps?c.record.payload.report:c.record.payload.qa_report;
  const assertSameAttempt=(a,b,path)=>{if(!isSame(a.record.assignment,b.record.assignment)||a.record.operation_id!==b.record.operation_id||a.record.requirements_digest!==b.record.requirements_digest)fail('ASSIGNMENT',path,'Predecessors must use the same assignment, operation and requirements.',a.reference);if(!equal(a.record.payload.pr,b.record.payload.pr))fail('PR',path,'Predecessors must use the same exact PR revision and target.',a.reference);};
  const consumedBy=(c)=>c?.implementation?.record.payload.consumed_requests??[];
  const completeCurrent=c=>{const r=c.record,i=issueFor(r.ticket_id,c.path).value,p=projectFor(r.ticket_id,c.path);return r.kind==='qa'&&(i.stage_id===p.stages['Human Review']||p.accepted_later_stage_ids.includes(i.stage_id));};
  function checkFindings(c,path){
   const ids=new Set();(c.record.payload.findings??[]).forEach((f,j)=>{
    if(!f.id.trim()||ids.has(f.id)||!f.summary.trim())fail('REPAIR',path+'/'+j,'Supply distinct nonblank confirmed finding IDs and summaries.',c.reference);
    ids.add(f.id);if(!recordedProof(c))f.evidence.forEach((e,k)=>evidenceFor(e,c,path+'/'+j+'/evidence/'+k));
   });
  }
  function qaReport(c,report,path,success,proof=null){
   const r=c.record;
   if((recorded||worker)&&historicalRecord(c,proof)){
    if(report===null)fail('LEDGER',path,'Retain the authenticated partial ledger.',c.reference);
    const ids=new Set(),human=new Set(),findings=new Set((r.payload.findings??[]).map(f=>f.id));
    for(const [index,step]of report.steps.entries()){
     const ep=path+'/steps/'+index;if(ids.has(step.id))fail('LEDGER',ep+'/id','Use unique authenticated step IDs.',c.reference);ids.add(step.id);
     if(success&&step.result!=='PASS')fail('LEDGER',ep+'/result','A successful recorded QA assertion requires PASS steps.',c.reference);
     if(step.finding_ids.some(id=>!findings.has(id))||(step.result==='FAIL'&&!step.finding_ids.length))fail('LEDGER',ep+'/finding_ids','Keep coherent declared finding references.',c.reference);
     if(step.result==='NOT_RUN'&&!step.not_run_reason?.trim())fail('LEDGER',ep+'/not_run_reason','Explain an unrun step.',c.reference);
    }
    for(const id of report.human_pending){if(human.has(id))fail('LEDGER',path+'/human_pending','Retain unique human case IDs.',c.reference);human.add(id);}
    if((report.steps.length===0&&(!report.no_ai_cases_reason?.trim()))||(report.steps.length>0&&report.no_ai_cases_reason!==null))fail('LEDGER',path+'/no_ai_cases_reason','Keep a coherent human-only or AI ledger reason.',c.reference);
    return;
   }
   const {work,facts}=recorded?currentDeclaration(r,path):requirementFor(r,path),t=work.testing_strategy;const graph=checkCaseGraph(work,facts,()=>{}),expected=graph.expanded;
   if(report===null)fail('LEDGER',path,'Retain the complete prescribed partial QA ledger.',c.reference);
   if(!equal(report.human_pending,t.human_review.cases.map(x=>x.id)))fail('LEDGER',path+'/human_pending','Retain every prescribed human case ID, in declared order.',c.reference);
   if(report.no_ai_cases_reason!==t.human_review.no_ai_cases_reason)fail('LEDGER',path+'/no_ai_cases_reason','Retain the exact prescribed all-human reason.',c.reference);
   if(report.steps.length!==expected.length)fail('LEDGER',path+'/steps','Cover every prescribed AI step including nested helpers exactly once.',c.reference);
   const findings=r.payload.findings??[],findingIds=new Set(findings.map(x=>x.id));if(findingIds.size!==findings.length)fail('LEDGER',path,'Give each finding a unique ID.',c.reference);
   report.steps.forEach((s,i)=>{
    const ep=path+'/steps/'+i,expectedStep=expected[i];
    if(s.id!==expectedStep.id||s.skill!==expectedStep.skill)fail('LEDGER',ep,'Match exact prescribed step ID, skill and expanded dispatch order.',c.reference);
    if(success&&s.result!=='PASS')fail('LEDGER',ep+'/result','A successful QA record requires every assigned AI step PASS.',c.reference);
    if(s.finding_ids.some(x=>!findingIds.has(x)))fail('LEDGER',ep+'/finding_ids','Reference only findings declared in this partial result.',c.reference);
    if(s.result==='FAIL'&&!s.finding_ids.length)fail('LEDGER',ep+'/finding_ids','Associate a failing result with its declared finding.',c.reference);
    if(s.result!=='NOT_RUN'&&s.evidence.length<expectedStep.evidence.length)fail('LEDGER',ep+'/evidence','Retain the required evidence for each PASS or FAIL.',c.reference);
    if(!recordedProof(c))s.evidence.forEach((e,j)=>evidenceFor(e,c,ep+'/evidence/'+j));
    if(s.result==='NOT_RUN'){
     if(!s.not_run_reason.trim())fail('LEDGER',ep+'/not_run_reason','Explain why the prescribed step was not run.',c.reference);
     const sourceCase=t.cases.find(x=>x.steps.some(v=>v.id===s.id));
     const failures=new Set((sourceCase?.depends_on??[]).flatMap(d=>report.steps.filter(v=>v.id===d.step&&(v.result==='FAIL'||v.result==='NOT_RUN')).flatMap(v=>v.finding_ids)));
     if([...failures].some(id=>!s.finding_ids.includes(id)))fail('LEDGER',ep+'/finding_ids','Retain the finding IDs for a defect-dependent skipped step.',c.reference);
    }
    if(!recordedProof(c)&&s.reused_from){const reuse=evidenceFor(s.reused_from,c,ep+'/reused_from','reuse'),d=reuse.details,previous=resolve(d.source,ep+'/reused_from/source');validateRecord(previous,proof);
     const prior=reportOf(previous)?.steps.find(x=>x.id===s.id),caseId=t.cases.find(x=>x.steps.some(v=>v.id===s.id))?.id;
     if(d.case_id!==caseId||d.step_id!==s.id||!d.basis.trim()||!prior||prior.result!==s.result||prior.skill!==s.skill||!equal(prior.evidence,s.evidence))fail('LEDGER',ep+'/reused_from','Supply a case-specific basis and exact prior step, result and evidence.',c.reference);
    }
   });
   const env=t.environment;
   if(!recordedProof(c)&&((success&&(expected.length || env.required_capabilities.length || env.source==='pipeline_pr_comment'))||report.steps.some(s=>s.result==='PASS'||s.result==='FAIL'))){
    const config=projectFor(r.ticket_id,path),p=r.payload.pr;
    if(p===null)fail('PR',c.path+'/body/payload/pr','Supply the tested PR revision for claimed QA execution.',c.reference);
    const ok=E.evidence_receipts.some(e=>e.kind==='environment'&&e.available&&equal(e.pr,p)&&config.evidence_uris.includes(e.uri)&&config.pipeline_actors.includes(e.actor_id)&&e.actor_id===e.details.pipeline_actor_id&&config.configured_targets.includes(e.details.target_reference)&&(env.target_reference===null||e.details.target_reference===env.target_reference));
    if(!ok)fail('EVIDENCE',path+'/environment','Supply the configured pipeline PR-comment environment observation for this exact revision.',c.reference);
   }
  }
  // Follow explicit assignment links; publication dates and array order grant no authority.
  function admissionLineage(a,path){
   const chain=[],seen=new Set();
   while(a){const k=logical(a.reference);if(seen.has(k)||chain.length>=RECEIPT_LIMITS.list)fail('REFERENCE',path,'Remove cyclic admission ancestry.',a.reference);seen.add(k);
    if(a.record.kind!=='admission')fail('ASSIGNMENT',path,'Resolve an admission ancestry.',a.reference);chain.push(a);
    a=a.record.payload.previous_assignment?resolve(a.record.payload.previous_assignment,path):null;
   }return chain;
  }
  function dischargeNullAdmissions(){
   for(const c of nullObligations.values()){
    const path=c.path+'/body/payload/existing_pr',inventory=c.issue.published_prs;
    let proven=false;
    for(const w of records.filter(x=>x.record.ticket_id===c.record.ticket_id&&x.record.role==='implementer'&&x.record.from_stage==='In Progress'&&['implementation','dependency_wait','blocked'].includes(x.record.kind)&&x.record.payload.pr)){
     const p=w.record.payload.pr;if(inventory.some(x=>identity(x)!==identity(p)))continue;
     const ancestry=admissionLineage(resolve(w.record.assignment,path),path),index=ancestry.findIndex(a=>isSame(a.reference,c.reference));
     if(index<0||ancestry.slice(0,index+1).some(a=>a.record.payload.existing_pr!==null))continue;
     // Every own publication must belong to this first attempt or an explicit
     // later continuation. Null ancestors cannot forget an already published PR.
     const coherent=records.filter(x=>x.record.ticket_id===c.record.ticket_id&&(x.record.payload.pr||x.record.payload.existing_pr||x.record.payload.child_pr)).every(x=>{
      const own=x.record.payload.pr??x.record.payload.existing_pr??x.record.payload.child_pr;if(identity(own)!==identity(p))return false;
      const a=x.record.kind==='admission'?x:resolve(x.record.assignment,path),line=admissionLineage(a,path),j=line.findIndex(v=>isSame(v.reference,w.record.assignment));
      return j>=0&&line.slice(0,j).every(v=>v.record.payload.existing_pr&&identity(v.record.payload.existing_pr)===identity(p));
     });
     if(!coherent)continue;
     // Failed speculative validation must not leave a memoized/provisional proof.
     const savedMemo=new Map(memo),savedVisiting=new Set(visiting),savedObligations=new Map(nullObligations);
     try{validateRecord(w);proven=true;break;}catch(e){
      memo.clear();for(const [k,v]of savedMemo)memo.set(k,v);visiting.clear();for(const k of savedVisiting)visiting.add(k);nullObligations.clear();for(const [k,v]of savedObligations)nullObligations.set(k,v);
      if(!e.diagnostic&&!e.diagnostics)throw e;
     }
    }
    if(!proven)fail('REPAIR',path,'Historical null PR repair requires a fully validated first implementer publication through its PR-free assignment lineage.',c.reference);
   }
  }
  function currentRecordedAssignment(c){const r=c.record,issue=issueFor(r.ticket_id,c.path).value,assignment=r.kind==='admission'?c.reference:r.assignment;return equal(assignment,issue.pointer.assignment)&&r.requirements_digest===issue.requirements_digest;}
  function historicalRecord(c,proof){if(worker)return !ownCurrent(c);return recorded?(history||proof?.purpose==='recorded-history'||!currentRecordedAssignment(c)):proof?.purpose==='manager-history';}
  function validateRecord(c,proof=historyProof){
   const historical=historicalRecord(c,proof);
   const activeKey=logical(c.reference),key=JSON.stringify([(recorded||worker)?purpose+(historical?':historical':':current'):historical?'manager-history':'current-chain',refKey(c.reference),proof?.anchor?refKey(proof.anchor.reference):null]);if(visiting.has(activeKey))fail('REFERENCE',c.path+'/body','Remove cyclic record or resolution references.',c.reference);if(memo.has(key))return memo.get(key);visiting.add(activeKey);
   const validate=child=>validateRecord(child,proof);
   try{
   const r=c.record,p=r.payload,path=c.path+'/body',i=issueFor(r.ticket_id,path).value,config=projectFor(r.ticket_id,path),req=worker?(historical?requirements.get(JSON.stringify([r.ticket_id,r.requirements_digest])):requirementFor(r,path)):recorded?(historical?null:currentDeclaration(r,path)):requirementFor(r,path);let result={record:c,implementation:null};
   if((recorded||worker)&&historical)retainClosure(c,path);
   if((recorded||worker)&&!historical)checkCurrent(c,path);
   if(worker&&!historical&&((r.kind==='admission'&&p.mode!=='new_work')||(!['admission','implementation','review','qa'].includes(r.kind)&&!(r.kind==='repair_request'&&['reviewer','qa'].includes(r.role)))||r.resume_authorization!==null))fail('UNSUPPORTED','/target','Retain local findings and hold unsupported assignments, resume, wait or inability publication without mutation.');
   if(r.kind==='admission'){
    if(r.operation_id!==r.record_id)fail('ASSIGNMENT',path+'/operation_id','Admission operation ID must equal its record UUID.',c.reference);
    if(p.project_id!==i.project_id||p.stream!==i.stream)fail('PROJECT',path+'/payload','Bind the admission to the immutable native project and full stream.',c.reference);
    if(p.mode==='repair'){
     const prev=resolve(p.previous_assignment,path+'/payload/previous_assignment');if(prev.record.kind!=='admission'||prev.record.ticket_id!==r.ticket_id)fail('ASSIGNMENT',path+'/payload/previous_assignment','Repair must reference this issue’s previous admission.',c.reference);validate(prev);
     const requests=p.requests.map((ref,j)=>{const q=resolve(ref,path+'/payload/requests/'+j);if(!['repair_request','stack_update_request','dependency_wait'].includes(q.record.kind)||q.record.ticket_id!==r.ticket_id||!isSame(q.record.assignment,prev.reference))fail('REPAIR',path+'/payload/requests/'+j,'Consume an explicit request for this previous assignment.',q.reference);validate(q);return q;});
     if(new Set(requests.map(x=>logical(x.reference))).size!==requests.length)fail('REPAIR',path+'/payload/requests','Do not repeat a logical request through another publication.',c.reference);
     const lineage=admissionLineage(prev,path+'/payload/previous_assignment');
     const known=lineage.flatMap(a=>[a.record.payload.existing_pr,...records.filter(x=>x.record.ticket_id===r.ticket_id&&isSame(x.record.assignment,a.reference)).map(x=>x.record.payload.pr??x.record.payload.child_pr)]).filter(Boolean);
     if(p.existing_pr){checkPR(p.existing_pr,c,path+'/payload/existing_pr',{current:!historical&&isSame(c.reference,target.reference)});if(known.some(x=>identity(x)!==identity(p.existing_pr)))fail('PR',path+'/payload/existing_pr','Repair must preserve the already published PR identity.',c.reference);}
     else {
      if(!i.pr_history_complete||known.length||!requests.some(x=>x.record.kind==='dependency_wait'&&x.record.payload.pr===null)||(!historical&&isSame(c.reference,target.reference)&&i.published_prs.length))fail('REPAIR',path+'/payload/existing_pr','Null PR repair requires complete no-publication history and a documented pre-PR dependency wait.',c.reference);
      if(i.published_prs.length)nullObligations.set(key,c);
     }
    }
   }else{
    const a=resolve(r.assignment,path+'/assignment');if(a.record.kind!=='admission'||a.record.ticket_id!==r.ticket_id)fail('ASSIGNMENT',path+'/assignment','Reference this issue’s manager admission.',c.reference);validate(a);
    if(r.requirements_digest!==a.record.requirements_digest||(r.kind==='stack_update_request'?r.operation_id!==r.record_id:r.operation_id!==a.record.operation_id))fail('ASSIGNMENT',path+'/operation_id','Match the admission operation and complete assigned requirements.',c.reference);
    const currentAttempt=isSame(a.reference,targetAssignment)&&r.ticket_id===targetRecord.ticket_id;
    const targetRelative=!historical&&currentAttempt&&r.payload.pr&&targetRecord.payload.pr&&equal(r.payload.pr,targetRecord.payload.pr);
    if(p.pr){checkPR(p.pr,c,path+'/payload/pr',{current:targetRelative,completion:targetRecord.kind==='qa'&&completeCurrent(target),blocked:targetRecord.kind==='blocked'});if(a.record.payload.existing_pr&&identity(a.record.payload.existing_pr)!==identity(p.pr))fail('PR',path+'/payload/pr','Preserve the admission’s existing PR identity.',c.reference);}
    if(r.resume_authorization){
     const auth=resolve(r.resume_authorization,path+'/resume_authorization');if(auth.record.kind!=='resume_authorization')fail('RESUME',path+'/resume_authorization','Reference an explicit configured human authorization.',c.reference);validate(auth);
     const blocker=resolve(auth.record.payload.blocked_result,path+'/resume_authorization/blocked_result');if(blocker.record.role!==r.role||!isSame(auth.record.assignment,r.assignment)||!equal(auth.record.payload.pr,p.pr??null)||auth.record.to_stage!==r.from_stage)fail('RESUME',path+'/resume_authorization','Resume the same blocked worker stage, assignment and exact revision.',c.reference);
    }
    if(r.kind==='implementation'){
     result.implementation=c;
     if(recordedProof(c)){
      const slots=req?.work.testing_strategy.preparation,seen=new Set();
      if(slots&&p.prepared_inputs.length!==slots.length)fail('EVIDENCE',path+'/payload/prepared_inputs','Cover every declared preparation slot exactly once.',c.reference);
      p.prepared_inputs.forEach((v,j)=>{if(seen.has(v.id)||(slots&&!slots.some(slot=>slot.id===v.id)))fail('EVIDENCE',path+'/payload/prepared_inputs/'+j,'Name each declared preparation slot once.',c.reference);seen.add(v.id);if(v.artifacts.some(e=>e.digest===null))fail('EVIDENCE',path+'/payload/prepared_inputs/'+j+'/artifacts','Retain nonnull preparation artifact hashes.',c.reference);});
     }else{
     const plan=evidenceFor(p.plan,c,path+'/payload/plan','plan',{successful:true}),review=evidenceFor(p.plan_review,c,path+'/payload/plan_review','plan_review',{successful:true});
     if(plan.details.author_id===review.details.reviewer_id)fail('EVIDENCE',path+'/payload/plan_review','Plan review must name an independent reviewer context.',c.reference);
     evidenceFor(p.ci,c,path+'/payload/ci','ci',{successful:true});p.verification.forEach((e,j)=>evidenceFor(e,c,path+'/payload/verification/'+j));
     const slots=req.work.testing_strategy.preparation;if(p.prepared_inputs.length!==slots.length)fail('EVIDENCE',path+'/payload/prepared_inputs','Cover every declared preparation slot exactly once.',c.reference);
     const seen=new Set();p.prepared_inputs.forEach((v,j)=>{const slot=slots.find(s=>s.id===v.id);if(!slot||seen.has(v.id))fail('EVIDENCE',path+'/payload/prepared_inputs/'+j,'Name each prescribed preparation slot once.',c.reference);seen.add(v.id);v.artifacts.forEach((e,k)=>{const o=evidenceFor(e,c,path+'/payload/prepared_inputs/'+j+'/artifacts/'+k,'preparation',{successful:true,hashed:true});if(o.details.preparation_id!==v.id||!equal(o.details.consumers,slot.used_by))fail('EVIDENCE',path+'/payload/prepared_inputs/'+j,'Match the exact declared preparation and consumers.',c.reference);});});
     }
     const expected=a.record.payload.requests;if(new Set(p.consumed_requests.map(logical)).size!==p.consumed_requests.length||p.consumed_requests.length!==expected.length||expected.some(v=>!p.consumed_requests.some(x=>isSame(v,x))))fail('REPAIR',path+'/payload/consumed_requests','Consume every assigned request exactly once.',c.reference);
     const stackRequests=expected.map(x=>resolve(x,path)).filter(x=>x.record.kind==='stack_update_request');
     if(stackRequests.length){if(!p.stack_parent)fail('REPAIR',path+'/payload/stack_parent','Record the required parent completion and incorporated revision.',c.reference);for(const q of stackRequests){const d=q.record.payload;const chosen=resolve(p.stack_parent.completion,path+'/payload/stack_parent'),required=resolve(d.parent_completion,path+'/payload/stack_parent');successor(chosen,required,path+'/payload/stack_parent');if(!equal(p.stack_parent.pr,chosen.record.payload.pr)||p.stack_parent.incorporated_revision!==p.stack_parent.pr.source_revision)fail('REPAIR',path+'/payload/stack_parent','Incorporate the exact chosen parent revision and completion.',c.reference);}}
     if(p.stack_parent){const parent=resolve(p.stack_parent.completion,path+'/payload/stack_parent/completion'),validated=validate(parent);if(parent.record.kind!=='qa'||parent.record.ticket_id!==p.stack_parent.ticket_id||!equal(parent.record.payload.pr,p.stack_parent.pr)||p.stack_parent.incorporated_revision!==p.stack_parent.pr.source_revision)fail('REPAIR',path+'/payload/stack_parent','Resolve the exact recorded parent completion and revision.',c.reference);const parentIssue=issueFor(parent.record.ticket_id,path).value;if(parentIssue.project_id!==i.project_id||parentIssue.stream!==i.stream||p.stack_parent.pr.repository!==p.pr.repository||identity(p.stack_parent.pr)===identity(p.pr))fail('PROJECT',path+'/payload/stack_parent','Use a distinct parent PR in the same project, full stream and repository.',c.reference);if(!validated.implementation)fail('REPAIR',path+'/payload/stack_parent','Supply a coherent parent completion.',c.reference);if(worker&&!historical){checkCurrent(parent,path+'/payload/stack_parent/completion');if(!completeCurrent(parent))fail('REPAIR',path+'/payload/stack_parent','Require the current accepted parent completion.',parent.reference);currentDeclaration(parent.record,path+'/payload/stack_parent');checkPR(p.stack_parent.pr,parent,path+'/payload/stack_parent/pr',{current:true,completion:true});incorporatedParents.set(refKey(parent.reference),{target:parent,validated});}}
    }else if(r.kind==='review'){
     const impl=resolve(p.implementation,path+'/payload/implementation');if(impl.record.kind!=='implementation')fail('REFERENCE',path+'/payload/implementation','Resolve the implementation result.');const v=validate(impl);assertSameAttempt(c,impl,path+'/payload/implementation');result.implementation=v.implementation;if(!recordedProof(c)){evidenceFor(p.approval,c,path+'/payload/approval','approval',{successful:true});evidenceFor(p.report,c,path+'/payload/report','review_report',{successful:true});}
    }else if(r.kind==='qa'){
     const review=resolve(p.review,path+'/payload/review');if(review.record.kind!=='review')fail('REFERENCE',path+'/payload/review','Resolve the review result.');const v=validate(review);assertSameAttempt(c,review,path+'/payload/review');result.implementation=v.implementation;qaReport(c,p.report,path+'/payload/report',true,proof);
    }else if(r.kind==='repair_request'){
     const basis=resolve(p.basis,path+'/payload/basis'),kind={reviewer:'implementation',qa:'review',human_request:'qa'}[r.role];if(basis.record.kind!==kind)fail('REPAIR',path+'/payload/basis','Use the prescribed completed predecessor as repair basis.',c.reference);validate(basis);assertSameAttempt(c,basis,path+'/payload/basis');
     if(r.role==='human_request'){const candidates=records.filter(x=>x.record.kind==='qa'&&isSame(x.record.assignment,r.assignment));if(candidates.length!==1||!isSame(candidates[0].reference,basis.reference))fail('REPAIR',path+'/payload/basis','Use the latest unique valid QA completion, including authorized resume.',c.reference);}
     checkFindings(c,path+'/payload/findings');
     if(r.role==='qa'){qaReport(c,p.qa_report,path+'/payload/qa_report',false,proof);if(worker&&!historical&&!p.qa_report.steps.some(step=>step.result==='FAIL'))fail('LEDGER',path+'/payload/qa_report/steps','A current QA repair request requires at least one demonstrated FAIL linked to a declared finding.',c.reference);}else if(p.qa_report!==null)fail('LEDGER',path+'/payload/qa_report','Only a QA-origin request carries the partial AI report.',c.reference);
    }else if(r.kind==='dependency_wait'){
     if(r.role==='qa')checkFindings(c,path+'/payload/findings');
     for(const [j,x]of p.requests.entries()){const q=resolve(x,path+'/payload/requests/'+j);if(!['repair_request','stack_update_request'].includes(q.record.kind))fail('REPAIR',path+'/payload/requests/'+j,'Wait on a typed outstanding upstream request.',c.reference);validate(q);}
     if(r.role==='qa')qaReport(c,p.qa_report,path+'/payload/qa_report',false,proof);else if(p.qa_report!==null)fail('LEDGER',path+'/payload/qa_report','Retain QA reports only for a QA-stage result.',c.reference);
    }else if(r.kind==='blocked'){
     if(r.role==='qa')checkFindings(c,path+'/payload/findings');
     if(p.basis){const basis=resolve(p.basis,path+'/payload/basis');validate(basis);assertSameAttempt(c,basis,path+'/payload/basis');}if(!recordedProof(c))p.evidence.forEach((e,j)=>evidenceFor(e,c,path+'/payload/evidence/'+j));
     if(r.role==='qa')qaReport(c,p.qa_report,path+'/payload/qa_report',false,proof);else if(p.qa_report!==null)fail('LEDGER',path+'/payload/qa_report','Retain QA reports only for a QA-stage result.',c.reference);
    }else if(r.kind==='resume_authorization'){
     const b=resolve(p.blocked_result,path+'/payload/blocked_result');if(b.record.kind!=='blocked')fail('RESUME',path+'/payload/blocked_result','Only a terminal blocked result can be resumed.',c.reference);validate(b);
     if(!isSame(b.record.assignment,r.assignment)||r.operation_id!==b.record.operation_id||r.requirements_digest!==b.record.requirements_digest||!equal(p.pr,b.record.payload.pr)||r.to_stage!==b.record.from_stage)fail('RESUME',path+'/payload','Keep the exact blocked assignment, operation, requirements, PR and original worker stage.',c.reference);
    }else if(r.kind==='stack_update_request'){
     const old=resolve(p.child_completion,path+'/payload/child_completion'),parent=resolve(p.parent_completion,path+'/payload/parent_completion');
     if(old.record.kind!=='qa'||parent.record.kind!=='qa'||old.record.ticket_id!==r.ticket_id||!isSame(old.record.assignment,r.assignment))fail('REPAIR',path+'/payload','Resolve B’s prior QA and the parent’s coherent new QA.',c.reference);
     const childResult=validate(old),parentResult=validate(parent),oldParent=childResult.implementation?.record.payload.stack_parent;
     if(!oldParent||oldParent.ticket_id!==parent.record.ticket_id||!equal(p.child_pr,old.record.payload.pr)||!equal(p.parent_pr,parent.record.payload.pr)||p.required_parent_revision!==p.parent_pr.source_revision||oldParent.incorporated_revision===p.required_parent_revision||identity(oldParent.pr)!==identity(p.parent_pr))fail('REPAIR',path+'/payload','Only the recorded immediate parent’s changed revision creates a stack update.',c.reference);
     const pi=issueFor(parent.record.ticket_id,path).value;if(pi.project_id!==i.project_id||pi.stream!==i.stream||p.child_pr.repository!==p.parent_pr.repository||identity(p.child_pr)===identity(p.parent_pr))fail('PROJECT',path+'/payload','Keep parent and child in the same native project, repository and full stream.',c.reference);
     const parentPath=path+'/payload/parent_completion';
     const isCurrent=equal(pi.pointer.assignment,parent.record.assignment);
     if(historical){
      completedLeaf(parent,parentPath,proof);retainClosure(parent,parentPath);
     }else if(!isCurrent){
      if(!proof)checkCurrent(parent,parentPath);
      // A discovered future result is not authority. Only the selected worker's
      // actual incorporation anchor can discharge this historical allowance.
      successor(proof.anchor,parent,path+'/payload/parent_completion');
      retainClosure(c,path);retainClosure(proof.anchor,parentPath);
      const anchorResult=validateRecord(proof.anchor);checkCurrent(proof.anchor,parentPath);
      completedLeaf(proof.anchor,parentPath,null);
      if(!anchorResult.implementation||!completeCurrent(proof.anchor))fail('REPAIR',parentPath,'Require a current accepted successor completion.',proof.anchor.reference);
      checkPR(proof.anchor.record.payload.pr,proof.anchor,parentPath,{current:true,completion:true});
     }else{
      checkCurrent(parent,parentPath);if(!completeCurrent(parent))fail('REPAIR',parentPath,'The parent must have a current accepted coherent completion.',parent.reference);checkPR(p.parent_pr,parent,path+'/payload/parent_pr',{current:true,completion:true});
     }
     const cutoff=resolve(oldParent.completion,path+'/payload/child_completion');
     const roots=rootsFor(p.roots,path+'/payload/roots'),consumed=effectiveBetween(parent,cutoff,parentPath,proof,parentResult);
     // Every nested structural publication remains a semantic proof obligation.
     for(const root of p.roots){const nested=resolve(root,path+'/payload/roots');if(nested.record.kind!=='repair_request')validate(nested);}
     if(!historical&&isCurrent){
      const parentRequired=[...pi.required_requests,...records.filter(x=>x.record.ticket_id===pi.id&&['repair_request','stack_update_request'].includes(x.record.kind)).map(x=>x.reference)];
      const covered=new Set(consumed);for(const a of admissionLineage(resolve(cutoff.record.assignment,parentPath),parentPath)){const qs=records.filter(q=>q.record.kind==='qa'&&q.record.ticket_id===cutoff.record.ticket_id&&isSame(q.record.assignment,a.reference));if(qs.length!==1)fail('REPAIR',parentPath,'Supply each incorporated historical parent completion.',a.reference);const v=validate(qs[0]);completedLeaf(qs[0],parentPath,proof);for(const root of rootsFor(consumedBy(v),parentPath))covered.add(root);}
      // Cutoff history contributes roots already incorporated by B. It cannot
      // erase a cause in the required segment or invent a resolution.
      for(const obligation of new Map(parentRequired.map(x=>[logical(x),x])).values()){
       const needed=rootsFor([obligation],parentPath+'/required_requests');
       if(needed.some(k=>!covered.has(k))){
        const accounted=E.request_resolutions.some(pair=>isSame(pair.request,obligation)&&(()=>{const completion=resolve(pair.completion,path),v=validate(completion);successor(parent,completion,parentPath);return completion.record.kind==='qa'&&completion.record.ticket_id===pi.id&&needed.every(k=>rootsFor(consumedBy(v),path).includes(k));})());
        if(!accounted)fail('REPAIR',parentPath,'The parent has an outstanding root not incorporated or explicitly resolved by verified completion.',parent.reference);
       }
      }
     }
     if(!equal([...roots].sort(),[...consumed].sort()))fail('REPAIR',path+'/payload/roots','Carry every root repair consumed by the parent completion.',c.reference);
     checkPR(p.child_pr,c,path+'/payload/child_pr');
     if(!recorded&&!historical&&isSame(c.reference,target.reference)){
      const currentChild=currents.get(identity(p.child_pr));
      // Queue publication rechecks B's observed revision, but does not establish
      // that its PR is open. Later admission owns that separate state check.
      if(!equal({...p.child_pr,state:currentChild.state,current:currentChild.current},currentChild))fail('PR',path+'/payload/child_pr','Match the child’s current observed PR source and target before queue publication.',c.reference);
     }
    }
   }
   memo.set(key,result);return result;
   }finally{visiting.delete(activeKey);}
  }
  function rootsFor(refs,path){
   const roots=new Set(),direct=new Set();
   for(const [j,x]of refs.entries()){
    const c=resolve(x,path+'/'+j),logicalKey=logical(c.reference),key=JSON.stringify([site,refKey(c.reference)]);
    if(direct.has(logicalKey))fail('REPAIR',path+'/'+j,'Do not repeat a direct root request.',c.reference);direct.add(logicalKey);
    if(rootActive.has(key))fail('REPAIR',path+'/'+j,'Remove cyclic root requests.',c.reference);
    let closure=rootClosures.get(key);
    if(!closure){
     rootActive.add(key);
     try{
      if(c.record.kind==='repair_request')closure=[logicalKey];
      else if(c.record.kind==='stack_update_request')closure=rootsFor(c.record.payload.roots,path+'/'+j);
      else if(c.record.kind==='dependency_wait')closure=rootsFor(c.record.payload.requests,path+'/'+j);
      else fail('REPAIR',path+'/'+j,'Resolve an explicit typed repair or stack root.',c.reference);
      closure=Object.freeze([...closure]);rootClosures.set(key,closure);
     }finally{rootActive.delete(key);}
    }
    for(const leaf of closure)roots.add(leaf);
   }return [...roots];
  }
  const validated=validateRecord(target,history?historyProof:incorporation);
  if(!history)checkCurrent(target,'/target');
  const configured=projectFor(targetRecord.ticket_id,'/target'),native=targetIssue.stage_id,allowed=[configured.stages[targetRecord.from_stage],configured.stages[targetRecord.to_stage]];
  if(targetRecord.kind==='qa')allowed.push(...configured.accepted_later_stage_ids);
  if(recorded&&!history&&!completeCurrent(target))fail('COMPLETION','/target','Recorded completion requires a current QA leaf in an accepted stage.');
  if(!history&&!allowed.includes(native))fail('PROJECT','/target/stage_id','Observe the target in its recorded native source/destination stage or accepted QA stage.',target.reference);
  if(targetRecord.payload.pr)checkPR(targetRecord.payload.pr,target,'/target/payload/pr',{current:!history,completion:targetRecord.kind==='qa'&&completeCurrent(target),blocked:targetRecord.kind==='blocked'});
  // Explicit resumption has one chain per role. A later blocker needs another
  // authorization; neither an old result nor a timestamp selects the leaf.
  // Final selected-role checks retain this worker's established incorporation.
  const role=targetRecord.kind==='resume_authorization'?resolve(targetRecord.payload.blocked_result,'/target').record.role:targetRecord.role;
  if(['implementer','reviewer','qa'].includes(role)){
   const related=records.filter(x=>x.record.ticket_id===targetRecord.ticket_id&&isSame(x.record.assignment,targetAssignment)&&x.record.role===role),initial=related.filter(x=>x.record.resume_authorization===null);
   if(initial.length!==1)fail('RESUME','/target','Supply one initial result for this worker role.',target.reference);
   let leaf=initial[0];const visited=new Set();
   while(leaf.record.kind==='blocked'&&authorizations.has(logical(leaf.reference))){if(visited.has(logical(leaf.reference)))fail('RESUME','/target','Remove cyclic resume lineage.');visited.add(logical(leaf.reference));const auth=authorizations.get(logical(leaf.reference));validateRecord(auth,history?historyProof:incorporation);const children=related.filter(x=>isSame(x.record.resume_authorization,auth.reference));if(!children.length){if(targetRecord.kind==='resume_authorization'&&isSame(target.reference,auth.reference)){leaf=auth;break;}fail('RESUME','/target','Supply the unique resumed result after human authorization.',auth.reference);}if(children.length!==1)fail('RESUME','/target','Do not publish competing resumed leaves.',auth.reference);leaf=children[0];validateRecord(leaf,history?historyProof:incorporation);}
   if(!isSame(leaf.reference,target.reference))fail('RESUME','/target','Validate the unique authorized current leaf rather than replacing or reusing a terminal result.',target.reference);
   for(const c of related)if(c.record.resume_authorization&&!visited.has(logical(resolve(resolve(c.record.resume_authorization,c.path).record.payload.blocked_result,c.path).reference)))fail('RESUME',c.path,'Every resumed record must follow the unique blocker chain.',c.reference);
   if(!history)out.validated_leaf=leaf.reference;
  }else if(!history)out.validated_leaf=target.reference;
  // Validate resolution evidence before subtracting obligations. Current target
  // completion itself can prove consumption; arbitrary pairs cannot waive roots.
  // Reuse only the exact already validated selected publication; other subjects
  // still require independent validation without the selected worker's proof.
  const resolutions=new Map();
  for(const [j,pair]of E.request_resolutions.entries()){
   const request=resolve(pair.request,'/request_resolutions/'+j+'/request'),completion=resolve(pair.completion,'/request_resolutions/'+j+'/completion'),v=refKey(completion.reference)===refKey(target.reference)?validated:validateRecord(completion),k=logical(request.reference);
   if(completion.record.kind!=='qa'||completion.record.ticket_id!==request.record.ticket_id||!(consumedBy(v).some(x=>isSame(x,request.reference))||rootsFor(consumedBy(v),'/request_resolutions/'+j).includes(k)))fail('REPAIR','/request_resolutions/'+j,'Resolve a coherent QA completion that actually consumes this request.',request.reference);
   if(resolutions.has(k)&&!isSame(resolutions.get(k).reference,completion.reference))fail('REPAIR','/request_resolutions/'+j,'Do not supply contradictory resolution completions.',request.reference);resolutions.set(k,completion);for(const root of rootsFor([request.reference],'/request_resolutions/'+j))resolutions.set(root,completion);
  }
  if(!history&&['implementation','review','qa','admission'].includes(targetRecord.kind))for(const proofTarget of [{target,validated},...incorporatedParents.values()]){
   const {target:subject,validated}=proofTarget,targetRecord=subject.record,targetIssue=issueFor(targetRecord.ticket_id,subject.path).value,targetAssignment=targetRecord.kind==='admission'?subject.reference:targetRecord.assignment,activeAssignment=resolve(targetAssignment,subject.path),obligationPath=subject===target?'/target':subject.path+'/body/payload';
   const currentConsumed=validated.implementation?rootsFor(consumedBy(validated),obligationPath+'/consumed_requests'):rootsFor(activeAssignment.record.payload.requests,obligationPath+'/requests');
   const required=[...targetIssue.required_requests];
   // Complete discovery finds unaccounted typed current-issue requests. Requests
   // already consumed by a historical coherent QA chain remain accounted for.
   for(const c of records.filter(x=>x.record.ticket_id===targetRecord.ticket_id&&['repair_request','stack_update_request'].includes(x.record.kind))){
    const k=logical(c.reference);const historical=records.some(q=>q.record.kind==='qa'&&q.record.ticket_id===targetRecord.ticket_id&&!isSame(q.record.assignment,targetAssignment)&&(()=>{const savedMemo=new Map(memo),savedVisiting=new Set(visiting),savedObligations=new Map(nullObligations);try{return rootsFor(consumedBy(validateRecord(q)),q.path).includes(k);}catch(e){memo.clear();for(const [key,value]of savedMemo)memo.set(key,value);visiting.clear();for(const key of savedVisiting)visiting.add(key);nullObligations.clear();for(const [key,value]of savedObligations)nullObligations.set(key,value);if(!e.diagnostic&&!e.diagnostics)throw e;return false;}})());
    if(historical){if(currentConsumed.includes(k))fail('REPAIR',obligationPath+'/requests','Do not consume a root already incorporated by historical completion.',c.reference);}else if(!resolutions.has(k))required.push(c.reference);
   }
   const needed=rootsFor([...new Map(required.map(r=>[logical(r),r])).values()],obligationPath+'/required_requests');
   for(const k of needed)if(!currentConsumed.includes(k)&&!resolutions.has(k))fail('REPAIR',obligationPath+'/required_requests','Retain every outstanding root request until coherent verified consumption.',subject.reference);
  }
  dischargeNullAdmissions();
  function collectBindings(){
   // Both purposes collect the same fully validated canonical inventory.
   // Preserve every requirement context before lookup-map replacement.
   const observe=(kind,key,value)=>bindings.push({kind,key:JSON.stringify(key),digest:digest(value)});
   for(const c of comments.values())observe('comment',[site,c.issue.id,c.comment.id],{reference:c.reference,comment:c.comment});
   for(const [uuid,c]of byUUID)observe('uuid',[site,uuid],{ticket_id:c.issue.id,digest:c.reference.digest});
   for(const r of requirementObservations)observe('requirements',[site,r.ticket,r.digest],recorded?{format:r.format,body:r.body,work:r.work}:{work:r.work,context:r.facts});
   for(const [ticket,{value}]of issues)observe('current',[site,ticket],{issue:value,manager_assignment:manager.get(ticket)?.value??null});
   if(recorded){for(const {value}of projects.values())observe('trusted',[site,value.id],value);for(const {value}of retained.values())observe('retained',[site,refKey(value)],value);return bindings.sort((a,b)=>a.key.localeCompare(b.key)||a.kind.localeCompare(b.kind)||a.digest.localeCompare(b.digest));}
   for(const {value}of prs.values())observe('pr',[value.provider,value.repository,value.number,value.source_revision],value);
   for(const value of currents.values())observe('current_pr',[value.provider,value.repository,value.number],value);
   for(const {value}of observations.values())observe('evidence',[value.uri],value);
   return bindings;
  }
  if(history){
   const leafRefs=keys=>keys.map(k=>{const matches=[...comments.values()].filter(c=>c.record&&logical(c.reference)===k).sort((a,b)=>refKey(a.reference).localeCompare(refKey(b.reference)));if(!matches.length)fail('REFERENCE','/target','Supply every historical root publication.');retainClosure(matches[0],'/target');return matches[0].reference;}).sort((a,b)=>refKey(a).localeCompare(refKey(b)));
   const coverage=[];
   // Only real incorporated cutoffs introduce parent segments. A supplied later
   // QA must prove explicit admission ancestry; array/date order never does.
   for(const v of [...memo.values()]){const stack=v.implementation?.record.payload.stack_parent;if(!stack)continue;const cutoff=resolve(stack.completion,'/target');for(const q of records.filter(c=>c.record.kind==='qa'&&c.record.ticket_id===stack.ticket_id&&identity(c.record.payload.pr)===identity(stack.pr))){const line=admissionLineage(resolve(q.record.assignment,'/target'),'/target');if(!line.some(a=>isSame(a.reference,cutoff.record.assignment)))continue;const pv=validateRecord(q,historyProof);completedLeaf(q,'/target',historyProof);retainClosure(q,'/target');const roots=leafRefs(effectiveBetween(q,cutoff,'/target',historyProof,pv));if(!coverage.some(x=>equal(x.parent_completion,q.reference)&&equal(x.cutoff_completion,cutoff.reference)))coverage.push({parent_completion:q.reference,cutoff_completion:cutoff.reference,roots});}}
   const accepted=new Map();for(const v of memo.values())accepted.set(refKey(v.record.reference),v);
   for(const v of accepted.values()){const c=v.record,r=c.record,p=r.payload;retainClosure(c,c.path);if(r.kind==='qa')completedLeaf(c,c.path,historyProof);const requests=r.kind==='admission'?p.requests:r.kind==='dependency_wait'?p.requests:[],consumed=consumedBy(v);const rootInput=r.kind==='repair_request'?[c.reference]:r.kind==='stack_update_request'?p.roots:requests.length?requests:consumed;out.records.push({reference:c.reference,kind:r.kind,ticket_id:r.ticket_id,assignment:r.kind==='admission'?c.reference:r.assignment,requirements_digest:r.requirements_digest,pr:p.pr??p.existing_pr??p.child_pr??null,previous_assignment:r.kind==='admission'?p.previous_assignment:null,request_refs:requests,consumed_requests:consumed,roots:leafRefs(rootsFor(rootInput,c.path)),stack_parent:v.implementation?.record.payload.stack_parent??null,child_completion:r.kind==='stack_update_request'?p.child_completion:null,parent_completion:r.kind==='stack_update_request'?p.parent_completion:null,assignment_lineage:admissionLineage(r.kind==='admission'?c:resolve(r.assignment,c.path),c.path).map(a=>a.reference),completed:r.kind==='qa'});}
   out.records.sort((a,b)=>refKey(a.reference).localeCompare(refKey(b.reference)));out.coverage_segments=coverage.sort((a,b)=>canonicalize(a).localeCompare(canonicalize(b)));
   out.bindings=collectBindings().sort((a,b)=>a.key.localeCompare(b.key)||a.kind.localeCompare(b.kind)||a.digest.localeCompare(b.digest));out.valid=true;return finish();
  }
  const report=reportOf(target);if(report){out.qa_report=report;out.ai_steps=report.steps.length;out.human_pending=report.human_pending;out.no_ai_cases_reason=report.no_ai_cases_reason;}
  if(worker){out.assignment=activeAssignment.reference;out.requirements_digest=targetRecord.requirements_digest;}else if(recorded)out.recorded_completion_established=targetRecord.kind==='qa'&&completeCurrent(target);else out.completion_established=targetRecord.kind==='qa'&&completeCurrent(target);out.valid=true;
  collectBindings();
 }catch(e){if(!e.diagnostic&&!e.diagnostics)throw e;if(history){out.records=[];out.coverage_segments=[];out.bindings=[];}out.diagnostics=sorted(e.diagnostics??[e.diagnostic]);}
 return finish();
}

/** Public chain compatibility: no private observations enter this result. */
export function validateReceiptChain(input){return evaluateReceiptChain(input).validation;}

/** Manager-internal strict-current inspection; no history or caller-authored authority. */
export function inspectManagerCompletion(input){return evaluateReceiptChain(input);}

/** Authenticated historical facts for the offline manager; never current authority. */
export function inspectManagerHistory(input){return evaluateReceiptChain(input,'manager-history');}

/** Authenticate an exact recorded target; never current completion or execution rights. */
export function inspectRecordedHistory(input){return evaluateReceiptChain(input,'recorded-history');}

/** Establish exact current recorded QA completion, without external freshness claims. */
export function inspectRecordedCompletion(input){return evaluateReceiptChain(input,'recorded-completion');}

/** Ordinary current worker proof with authenticated recorded ancestry; never execution authority. */
export function validateWorkerCurrent(input){return evaluateReceiptChain(input,'worker-current').validation;}
