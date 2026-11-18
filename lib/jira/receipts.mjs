import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parseConfig, CONFIG_LIMITS } from '../config/parse.mjs';
import { checkValue, parseContract } from '../contracts/work.mjs';
import { extractHandoffCandidate } from '../contracts/handoff.mjs';
import { inspectRecordedHistory, inspectRecordedCompletion } from '../contracts/receipts.mjs';
import { composeExactRecordedEnvelope, equal, SNAPSHOT_LIMITS } from '../manager/snapshot.mjs';
import { acquireJiraInventory, parseInventoryInput } from './inventory.mjs';
import { createJiraIssueAcquirer, createJiraReadSession, diagnostic, readJiraStatusHistory } from './read.mjs';

const schema=JSON.parse(readFileSync(new URL('../../contracts/manager-live-input-v1.schema.json',import.meta.url),'utf8'));
const ajv=new Ajv2020({strict:true,ownProperties:true});addFormats(ajv);
const validator=name=>ajv.compile({$ref:'#/$defs/'+name,$defs:schema.$defs});
const recordedValid=validator('recorded'),reconciliationValid=validator('reconciliation'),bindingValid=validator('binding'),captureValid=validator('capture');
const metadata=['author_id','update_author_id','created','updated'];
const stages={
 admit_ready:['Ready to Work','In Progress','admission','new_work'],
 admit_rework:['Rework Queued','In Progress','admission','repair'],
 queue_repair:['Human Review','Rework Queued','stack_update_request']
};
const messages={
 INPUT_INVALID:'Supply the closed exact target or retained attempt, publications and limits.',
 AUTHORITY_MISSING:'Prepare the matching installation, package, and canonical configuration authority.',
 ATTEMPT_MISSING:'Supply the confirmed original retained attempt for this read.',
 CAPTURE_MISSING:'Supply the original retained transition capture for the attempt.',
 ATTEMPT_MISMATCH:'Inspect the same original attempt and its exact publication references.',
 ATTEMPT_UNSUPPORTED:'Use a release that understands the original attempt and capture.',
 RETAINED_TUPLE_MISSING:'Supply the original native publication metadata from retained evidence.',
 PUBLICATION_METADATA_CHANGED:'Compare the exact publication with its original native metadata.',
 MANAGER_TARGET_MISMATCH:'Check the original operation, stages, stream and exact manager publication.',
 ASSIGNMENT_MISMATCH:'Inspect the exact native pointer and the originally bound member assignment.',
 CLOSURE_INCOMPLETE:'Check the target’s native pages, exact references and scoped ownership observations.',
 RECORDED_PROOF_INVALID:'Inspect the purpose-specific recorded proof diagnostics.',
 ISSUE_MISMATCH:'Check the native issue against the original project and identity.'
};

const problem=(status,code,extra={})=>({status,code,message:messages[code],...extra});
const complete={status:'complete',code:'OK'};
const tuple=r=>JSON.stringify([r.ticket_id,r.comment_id,r.record_id,r.digest]);
const uniqueSet=refs=>{
 const keys=refs.map(tuple).sort();
 return new Set(keys).size===keys.length&&new Set(refs.map(r=>JSON.stringify([r.ticket_id,r.comment_id]))).size===keys.length?keys:null;
};
function copy(value,limits=CONFIG_LIMITS){
 checkValue(value,limits);
 const raw=JSON.stringify(value);
 if(Buffer.byteLength(raw)>limits.bytes)throw Error('INPUT_INVALID');
 return JSON.parse(raw);
}
function siteBinding(configInput,binding){
 if(!bindingValid(binding))return null;
 const config=parseConfig(configInput,{expectedSite:binding.site});
 if(!config.valid||config.live_configuration.status!=='complete'||config.configuration_digest!==binding.configuration_digest)return null;
 const authored=parseContract(configInput,CONFIG_LIMITS);
 if(!authored.manager||authored.manager.installation_id!==binding.installation_id||authored.manager.domain_id!==binding.domain_id)return null;
 return {configInput:JSON.stringify(authored),binding,scope:config.resolved_scope,cloudId:authored.jira.connection.cloud_id};
}
function result({outcome,site=null,issueId=null,started=null,session=null,data=null}){
 const report=session?.report;
 const response={schema:'pigboard-native-receipt-result/v1',status:outcome.status,code:outcome.code,
  source:site?{site,issue_id:issueId,observation:{started_at:started,finished_at:started?new Date().toISOString():null}}:null,
  diagnostics:[...(outcome.message?[{code:outcome.code,message:outcome.message}]:[]),...report?.diagnostics??[]],
  counters:report?.counters??null,limits:report?.limits??null,cleanup:report?.cleanup??null,writes:0,execution_authorized:false};
 Object.defineProperty(response,'data',{value:data,enumerable:false});
 return response;
}
function nativeOutcome(d,fallback){
 if(!d)return fallback;
 const status=d.code==='HISTORY_UNSUPPORTED'?'unsupported':
  ['READ_DENIED_OR_MISSING','POINTER_UNKNOWN','SECRET_UNAVAILABLE','SETUP_MISSING','CONFIG_INVALID','TLS_FAILED'].includes(d.code)?'unavailable':'incomplete';
 return {status,code:d.code,message:d.message};
}

function inspectExact(authority,input,session,state){
 const {attempt: originalAttempt,...inventory}=state;
 const built=composeExactRecordedEnvelope(authority.configInput,session,inventory,input.target);
 if(!built.valid)return {outcome:problem('incomplete','CLOSURE_INCOMPLETE'),proof:null};
 const envelope=built.envelope,raw=JSON.stringify(envelope);
 const proof=input.purpose==='recorded-history'?inspectRecordedHistory(raw):inspectRecordedCompletion(raw);
 const validation=proof.validation??proof;
 if(!validation.valid||!equal(validation.target,input.target))
  return {outcome:problem('incomplete','RECORDED_PROOF_INVALID'),proof};
 return {outcome:complete,proof,envelope};
}

function prepareReconciliation(input,state,current,original){
 if(!state.attempt)return problem('unavailable','ATTEMPT_MISSING');
 if(state.attempt.schema_version!==1)return problem('unsupported','ATTEMPT_UNSUPPORTED');
 if(!reconciliationValid(input))return problem('unavailable','INPUT_INVALID');
 const {attempt,publicationReferences}=input,retained=state.attempt;
 const relevant=uniqueSet(publicationReferences),publication=uniqueSet(retained.publication??[]);
 const cause=uniqueSet(retained.cause??[]);
 if(!relevant||!publication||!cause||!equal(relevant,publication)||
    !equal({...attempt,publication:relevant,cause:uniqueSet(attempt.cause)}, {...retained,publication,cause})||
    attempt.record_id!=='attempt:'+attempt.attempt_id)return problem('incomplete','ATTEMPT_MISMATCH');
 const capture=Object.fromEntries(Object.entries(retained.extensions).filter(([k])=>k.startsWith('pb_capture_')));
 if(!Object.keys(capture).length)return problem('unavailable','CAPTURE_MISSING');
 if(!captureValid(capture)||(capture.pb_capture_status===null)!==(capture.pb_capture_received_at===null)||
    capture.pb_capture_status===null&&capture.pb_capture_provider_request_id!==null)return problem('unsupported','ATTEMPT_UNSUPPORTED');
 const authority=original??current;
 if(!authority?.binding||!current||!['installation_id','domain_id','site'].every(k=>authority.binding[k]===attempt[k]&&current.binding[k]===attempt[k])||
    authority.binding.configuration_digest!==attempt.configuration_digest||
    authority.binding.package_revision!==capture.pb_capture_package_revision||
    authority.cloudId!==current.cloudId||!equal(authority.scope,current.scope))return problem('unavailable','AUTHORITY_MISSING');
 const project=authority.scope.projects.find(p=>p.id===attempt.project_id);
 const manager=retained.publication.filter(r=>r.ticket_id===attempt.ticket_id&&r.record_id===attempt.attempt_id);
 const [from,to]=stages[attempt.operation];
 const members=state.retained_members.filter(m=>m.ticket_id===attempt.ticket_id);
 if(!project||!project.worker_prefixes.some(prefix=>attempt.label.startsWith(prefix)&&/^\d+$/.test(attempt.label.slice(prefix.length)))||
    project.stages[from]!==attempt.source_status_id||project.stages[to]!==attempt.target_status_id||manager.length!==1||
    members.length!==1||!['project_id','epic_id','label'].every(k=>members[0][k]===attempt[k]))
  return problem('incomplete','MANAGER_TARGET_MISMATCH');
 const intents=state.pending_intents.filter(i=>i.ticket_id===attempt.ticket_id||i.attempt_id===attempt.attempt_id);
 if(intents.length!==1||!['project_id','label','ticket_id','attempt_id'].every(k=>intents[0][k]===attempt[k]))
  return problem('incomplete','ATTEMPT_MISMATCH');
 const assignment=members[0].assignment;
 if(!assignment||assignment.ticket_id!==attempt.ticket_id||
    (attempt.operation==='queue_repair'?tuple(assignment)===tuple(manager[0]):tuple(assignment)!==tuple(manager[0])))
  return problem('incomplete','ASSIGNMENT_MISMATCH');
 return {authority,project,attempt,manager:manager[0],assignment,references:retained.publication};
}

function inspectPublication(prepared,session,state){
 const {authority,attempt,manager,assignment,project,references}=prepared;
 const {issues,exact_comments}=session.observations;
 const nativeIssue=issues.find(issue=>issue.id===attempt.ticket_id);
 if(!nativeIssue||nativeIssue.project_id!==attempt.project_id||nativeIssue.parent_id!==attempt.epic_id||
    nativeIssue.key!==attempt.issue_key||!nativeIssue.labels.includes(attempt.label))
  return {outcome:problem('incomplete','ISSUE_MISMATCH')};
 const pointer=nativeIssue.pointer;
 if(pointer.state!=='present'||!equal(pointer.value.assignment,assignment))
  return {outcome:problem('incomplete','ASSIGNMENT_MISMATCH')};
 const known=new Map(state.retained.map(r=>[tuple(r),r])),comments=[];
 const [from,to,kind,mode]=stages[attempt.operation];
 for(const reference of references){
  const prior=known.get(tuple(reference));
  if(!prior)return {outcome:problem('unavailable','RETAINED_TUPLE_MISSING')};
  const native=exact_comments.find(c=>c.ticket_id===reference.ticket_id&&c.id===reference.comment_id);
  const issue=issues.find(i=>i.id===reference.ticket_id),owner=authority.scope.projects.find(p=>p.id===issue?.project_id);
  const record=native&&extractHandoffCandidate(native.body);
  if(!record||record.record_digest!==reference.digest||record.value.ticket_id!==reference.ticket_id||
     record.value.record_id!==reference.record_id)return {outcome:problem('incomplete','MANAGER_TARGET_MISMATCH')};
  if(prior.site!==authority.binding.site||metadata.some(k=>native[k]!==prior[k])||
    native.author_id!==native.update_author_id||Date.parse(native.created)!==Date.parse(native.updated))
   return {outcome:problem('incomplete','PUBLICATION_METADATA_CHANGED')};
  const body=record.value;
  if(!owner?.actors[body.role]?.includes(native.author_id))return {outcome:problem('incomplete','MANAGER_TARGET_MISMATCH')};
  if(tuple(reference)===tuple(manager)&&
     (body.role!=='manager'||!project.actors.manager.includes(native.author_id)||body.operation_id!==attempt.attempt_id||
      body.kind!==kind||body.from_stage!==from||body.to_stage!==to||
      (kind==='admission'?body.payload.project_id!==attempt.project_id||body.payload.stream!==attempt.label||body.payload.mode!==mode:
       !equal(body.assignment,assignment))))
    return {outcome:problem('incomplete','MANAGER_TARGET_MISMATCH')};
  comments.push({reference,author_id:native.author_id,update_author_id:native.update_author_id,
   created:new Date(native.created).toISOString(),updated:new Date(native.updated).toISOString()});
 }
 const exact=inspectExact(authority,{purpose:'recorded-history',target:manager},session,state);
 if(exact.outcome.status!=='complete')return exact;
 // Each additional publication must independently authenticate its own exact role and chain.
 for(const reference of references){
  if(tuple(reference)===tuple(manager))continue;
  const extra=inspectExact(authority,{purpose:'recorded-history',target:reference},session,state);
  if(extra.outcome.status!=='complete')return extra;
 }
 return {...exact,observations:{comments,pointer:{mode:attempt.operation==='queue_repair'?'preserved':'published',assignment}}};
}

/** Trusted composition. Only the returned operation arguments are caller selectors. */
export function bindJiraReceipts({configInput,resolveSecret,binding,state,original=null}){
 let current,prior,retained,inventory;
 try{
  current=siteBinding(configInput,copy(binding));
  if(original!==null)prior=siteBinding(original.configInput,copy(original.binding));
  const supplied=copy(state,SNAPSHOT_LIMITS);
  const {retained_members,pending_intents,retained_complete,retained:metadataRows,attempt=null}=supplied;
  inventory=parseInventoryInput({retained_members,pending_intents,retained_complete});
  if(inventory.retained_complete&&Array.isArray(metadataRows))retained={...inventory,retained:metadataRows,attempt};
 }catch{}
 const unavailable=()=>result({outcome:problem('unavailable','AUTHORITY_MISSING')});

 async function acquire(authority, issueId, references, limits, afterInventory){
  const started=new Date().toISOString();
  // Current connection and bounds apply even when a separately pinned authority
  // authenticates an earlier running configuration.
  const session=await createJiraReadSession(current.configInput,{resolveSecret},limits);
  let output;
  try{
   if(!session.ready)output={outcome:nativeOutcome(session.report.diagnostics[0],problem('unavailable','AUTHORITY_MISSING'))};
   else{
    await acquireJiraInventory(current.configInput,session,inventory,createJiraIssueAcquirer(session,{inventory:true}),references);
    output=await afterInventory(session);
   }
  }catch(error){
   diagnostic(session.report,error);
   output={outcome:nativeOutcome(session.report.diagnostics.at(-1))};
  }finally{session.finish();}
  return result({...output,site:authority.binding.site,issueId,started,session});
 }

 return {
  async readRecordedReceipt(selector){
   let input;try{input=copy(selector);if(!recordedValid(input))throw Error();}catch{return result({outcome:problem('unavailable','INPUT_INVALID')});}
   if(!current||!retained)return unavailable();
   return acquire(current,input.target.ticket_id,[input.target],null,session=>{
    session.checkTime();
    const observation=inspectExact(current,input,session,retained);
    session.checkTime();
    if(observation.outcome.status!=='complete')
     observation.outcome=nativeOutcome(session.report.diagnostics[0],observation.outcome);
    return {outcome:observation.outcome,data:{receipt_input:observation.envelope??null,proof:observation.proof}};
   });
  },
  async readReconciliationFacts(selector){
   let input;try{input=copy(selector);}catch{return result({outcome:problem('unavailable','INPUT_INVALID')});}
   if(!input||typeof input!=='object'||Array.isArray(input)||!Object.hasOwn(input,'attempt'))
    return result({outcome:problem('unavailable','INPUT_INVALID')});
   if(!current||!retained)return unavailable();
   const prepared=prepareReconciliation(input,retained,current,original===null?null:prior??{});
   if(!prepared.authority)return result({outcome:prepared});
   const {authority,attempt,references}=prepared;
   const obligations=[...new Map([...references,...attempt.cause].map(r=>[tuple(r),r])).values()];
   return acquire(authority,attempt.ticket_id,obligations,input.limits,async session=>{
    let publication;
    try{
     if(!session.report.domain_complete){
      publication={outcome:nativeOutcome(session.report.diagnostics[0],problem('incomplete','CLOSURE_INCOMPLETE'))};
     }else{
      session.checkTime();
      publication=inspectPublication(prepared,session,retained);
      session.checkTime();
     }
    }catch(error){
     diagnostic(session.report,error,'publication',attempt.ticket_id);
     publication={outcome:nativeOutcome(session.report.diagnostics.at(-1),problem('incomplete','CLOSURE_INCOMPLETE'))};
    }
    const items=[];
    let history=complete;
    try{
     // A changelog is attributed only after seeing the immutable issue and its project.
     const issue=session.observations.issues.find(i=>i.id===attempt.ticket_id);
     if(!issue||issue.project_id!==attempt.project_id)history=nativeOutcome(session.report.diagnostics[0],problem('unavailable','ISSUE_MISMATCH'));
     else await readJiraStatusHistory(session,attempt.ticket_id,items);
    }catch(error){
     diagnostic(session.report,error,'changelog',attempt.ticket_id);
     history=nativeOutcome(session.report.diagnostics.at(-1));
    }
    const outcome=publication.outcome.status!=='complete'?publication.outcome:history;
    return {outcome,data:{complete:outcome.status==='complete',history:{...history,items},
     publication:publication.outcome,receipt_input:publication.envelope??null,
     proof:publication.proof??null,publication_observations:publication.observations??null}};
   });
  }
 };
}
