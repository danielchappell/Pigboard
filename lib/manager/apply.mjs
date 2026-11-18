import canonicalize from 'canonicalize';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {isDeepStrictEqual as same} from 'node:util';
import {CONFIG_LIMITS,parseConfig} from '../config/parse.mjs';
import {parseContract,extractADF,checkValue} from '../contracts/work.mjs';
import {digestValue,validateHandoff,extractHandoffCandidate} from '../contracts/handoff.mjs';
import {STATE_LIMITS,attemptSchema,memberSchema,recordId,validateRecord,valid,validBinding,projectRetainedInventory,providerRequestId,proofEqual} from '../state/contract.mjs';
import {inspectJiraInventory} from '../jira/inventory.mjs';
import {acquisitionSource} from '../jira/read.mjs';
import {createJiraWriter} from '../jira/write.mjs';
import {composeOrdinarySnapshot,normalizeSnapshot} from './snapshot.mjs';
import {safeReason,evidenceRevision} from './health.mjs';
import {previewSnapshot} from './decisions.mjs';
const limits={streams:1000,members:1000,pending_attempts:1000,pages:10000,requests:10000,milliseconds:30000};
const known=new Set(['APPLIED','NO_ORDINARY_SELECTION','APPLY_EVENT_REQUIRED','APPLY_UNAVAILABLE','APPLY_HELD','LIMIT_REACHED','CONTROL_MISMATCH','BINDING_MISMATCH','REVISION_CONFLICT','UNCERTAIN_WRITE','PENDING_ATTEMPT','OWNERSHIP_CONFLICT','INVALID_INPUT','UNAVAILABLE','INCOMPLETE_INVENTORY','PUBLICATION_MISMATCH','PROOF_CONFLICT','UNSUPPORTED_PROOF','TRANSACTION_LIMIT','CHANGED_INPUT','RESPONSE_INVALID','SECRET_UNAVAILABLE','REDIRECT_REJECTED','RATE_LIMITED','SOURCE_EDGE_REQUIRED','LINEAGE_REQUIRED','HUMAN_REVIEW_CAP','EPIC_PAUSED','OCCUPIED','BLOCKED','REPAIR_REQUIRED','INCOMPLETE_SNAPSHOT','PENDING_INTENT','MEMBERSHIP_MISMATCH','INCOMPLETE_STREAM','INCOMPLETE_PROJECT','MISSING_KNOWN_ID','UNKNOWN_STATUS','SCOPE','NO_OPT_IN','INVALID_WORK','PREREQUISITE_UNSATISFIED','INCONSISTENT_OCCUPANCY']);
const fault=code=>Object.assign(new Error(code),{code});
const now=()=>new Date().toISOString();
const ordinal=(a,b)=>a<b?-1:a>b?1:0;
/** Tie-breaking only; policy owns candidate priority and eligibility. */
export function chooseOrdinaryStream(streams,{reworkEnabled=false}={}){
 return streams.filter(s=>s.decision==='select'&&(s.proposal?.kind==='admit_new'||reworkEnabled&&s.proposal?.kind==='admit_repair'))
  .sort((a,b)=>ordinal(a.scope.project_id,b.scope.project_id)||ordinal(a.scope.label,b.scope.label))[0]??null;
}
const normalizeIssue=i=>({...i,labels:[...i.labels].sort(),body:i.body===null?null:JSON.parse(i.body)});
const referenceKey=r=>JSON.stringify([r.ticket_id,r.comment_id,r.record_id,r.digest,r.source_ticket_id,r.source_comment_id]);
const targetKey=(ticket,comment)=>JSON.stringify([ticket,comment]);
const canonicalRows=(rows,key=canonicalize)=>rows.map(row=>key(row)).sort(ordinal);
const serializedBytes=value=>Buffer.byteLength(JSON.stringify(value));
const enqueue=(ticket_id,source,source_ticket_id=null,project_id=null,label=null)=>({ticket_id,source,source_ticket_id,project_id,label});
const referenceEdge=(ref,source_ticket_id,source_comment_id=null)=>({...ref,source_ticket_id,source_comment_id});
const sameMembership=(a,b)=>['site','project_id','label','epic_id','ticket_id'].every(k=>a[k]===b[k])&&proofEqual(a.assignment,b.assignment);

function replaceRows(rows,removed,added,key=canonicalize){
 const outstanding=new Map();
 for(const row of removed){const k=key(row);outstanding.set(k,(outstanding.get(k)??0)+1);}
 const kept=rows.filter(row=>{
  const k=key(row),count=outstanding.get(k);
  if(!count)return true;
  if(count===1)outstanding.delete(k);else outstanding.set(k,count-1);
  return false;
 });
 if(outstanding.size)throw fault('CHANGED_INPUT');
 return [...kept,...added];
}

function retainedContributions(retained){
 const references=[],enqueues=[];
 for(const row of retained.retained_members){
  const {ticket_id,project_id,epic_id,label,assignment}=row;
  enqueues.push(enqueue(ticket_id,'retained',null,project_id,label),enqueue(epic_id,'retained',ticket_id,project_id,label));
  if(assignment){
   references.push(referenceEdge(assignment,ticket_id));
   enqueues.push(enqueue(assignment.ticket_id,'typed_reference',ticket_id,project_id,label));
  }
 }
 for(const row of retained.pending_intents)enqueues.push(enqueue(row.ticket_id,'intent',null,row.project_id,row.label));
 return {references,enqueues};
}

function projectedSource(original,beforeRetained,afterRetained,ticket,pointer,record,commentId){
 const before=retainedContributions(beforeRetained),after=retainedContributions(afterRetained);
 const {id:ticketId}=ticket;
 if(ticket.pointer.state==='present'){
  const previous=ticket.pointer.value.assignment;
  before.references.push(referenceEdge(previous,ticketId));
  before.enqueues.push(enqueue(previous.ticket_id,'typed_reference',ticketId));
 }
 after.references.push(referenceEdge(pointer.assignment,ticketId));
 after.enqueues.push(enqueue(pointer.assignment.ticket_id,'typed_reference',ticketId));
 // Only these admission fields are schema-owned references. The collector emits
 // one edge per distinct reference in each record, even if fields repeat it.
 const typed=new Map();
 for(const ref of [record.payload.previous_assignment,...record.payload.requests]){
  if(ref){const edge=referenceEdge(ref,ticketId,commentId);typed.set(referenceKey(edge),edge);}
 }
 after.references.push(...typed.values());
 for(const edge of typed.values())after.enqueues.push(enqueue(edge.ticket_id,'typed_reference',ticketId));

 const references=replaceRows(original.references,before.references,after.references,referenceKey);
 const enqueues=replaceRows(original.provenance.filter(r=>!Object.hasOwn(r,acquisitionSource)),before.enqueues,after.enqueues);
 const targets=new Map();
 for(const ref of references){
  const key=targetKey(ref.ticket_id,ref.comment_id),other=targets.get(key);
  if(other&&(other.record_id!==ref.record_id||other.digest!==ref.digest))throw fault('CHANGED_INPUT');
  targets.set(key,ref);
 }
 return {references,enqueues,targets};
}

function expectedExactComments(before,projection,ticket,comment){
 const original=before.observations,oldTargets=new Set(original.references.map(r=>targetKey(r.ticket_id,r.comment_id)));
 const exact=original.exact_comments.filter(row=>projection.targets.has(targetKey(row.ticket_id,row.id)));
 const priorPages=new Map(original.comment_pages.flatMap(p=>p.comments.map(c=>[targetKey(p.ticket_id,c.id),{ticket_id:p.ticket_id,...c}])));
 const ownTarget=targetKey(ticket.id,comment.id);
 if(oldTargets.has(ownTarget)||priorPages.has(ownTarget))throw fault('CHANGED_INPUT');
 for(const [key,ref] of projection.targets){
  if(key===ownTarget){exact.push({ticket_id:ticket.id,...comment});continue;}
  if(oldTargets.has(key))continue;
  const row=priorPages.get(key),issue=before.report.issues.find(issue=>issue.id===ref.ticket_id);
  if(!row||issue?.comments_read!=='complete')throw fault('CHANGED_INPUT');
  const candidate=extractHandoffCandidate(row.body);
  if(candidate?.record_digest!==ref.digest||candidate?.value?.record_id!==ref.record_id||candidate?.value?.ticket_id!==ref.ticket_id)throw fault('CHANGED_INPUT');
  exact.push(row);
 }
 return exact;
}

function checkedAcquisitions(observations){
 const issues=new Map(observations.issues.map(i=>[i.id,i])),seen=new Set();
 const enqueues=new Set(observations.provenance.filter(r=>!Object.hasOwn(r,acquisitionSource)).map(r=>canonicalize(r)));
 for(const row of observations.provenance.filter(r=>Object.hasOwn(r,acquisitionSource))){
  const issue=issues.get(row.ticket_id),source=row[acquisitionSource];
  if(!issue||seen.has(issue.id)||row.project_id!==issue.project_id) return false;
  if(!enqueues.has(canonicalize(source))||!['source','source_ticket_id','label'].every(k=>row[k]===source[k]))return false;
  seen.add(issue.id);
 }
 return seen.size===issues.size;
}

function reportSafe(report,selectedScope){
 const localCodes=new Set(['READ_DENIED_OR_MISSING','WORK_INVALID','REFERENCE_INVALID','POINTER_UNKNOWN','PAGE_INCOMPLETE','CHANGED_INPUT','RESPONSE_INVALID','RATE_LIMITED','REDIRECT_REJECTED']);
 const localOperations=new Set(['issue','pointer','comments','comment','record','reference','work']);
 if(!report||!['complete','incomplete'].includes(report.status)||report.retained_complete!==true||report.cleanup?.resolver!=='settled'||report.cleanup?.jira!=='complete'||!Array.isArray(report.scopes)||!Array.isArray(report.diagnostics))return false;
 const selected=report.scopes.filter(s=>s.project_id===selectedScope.project_id&&s.label===selectedScope.label);
 if(selected.length!==1||selected[0].complete!==true)return false;
 if(report.status==='complete'?(report.domain_complete!==true||report.diagnostics.length||report.scopes.some(s=>s.complete!==true)):(report.domain_complete!==false||!report.diagnostics.length))return false;
 return report.diagnostics.every(d=>{
  const scope=d?.scope;
  if(!scope||Object.keys(scope).sort().join(',')!=='label,project_id'||typeof scope.project_id!=='string'||typeof scope.label!=='string'||!localCodes.has(d.code)||!localOperations.has(d.operation)||typeof d.issue_id!=='string'||!/^[0-9]{1,255}$/.test(d.issue_id)||Object.hasOwn(d,'bound'))return false;
  const bound=report.scopes.filter(s=>s.project_id===scope.project_id&&s.label===scope.label);
  return bound.length===1&&bound[0].complete===false&&(scope.project_id!==selectedScope.project_id||scope.label!==selectedScope.label);
 });
}

function scopeRows(report,retained){
 const groups=new Map();
 for(const row of retained.retained_members){
  const key=JSON.stringify([row.project_id,row.label]),group=groups.get(key)??[];
  group.push(row.ticket_id);groups.set(key,group);
 }
 const rows=[];
 for(const {project_id,label,complete,current_issue_ids,old_issue_ids} of report.scopes){
  const key=JSON.stringify([project_id,label]),expected=groups.get(key)??[];
  if(!same(old_issue_ids,[...new Set(expected)].sort(ordinal)))throw fault('CHANGED_INPUT');
  groups.delete(key);
  rows.push({project_id,label,complete,current_issue_ids});
 }
 if(groups.size)throw fault('CHANGED_INPUT');
 return canonicalRows(rows);
}

function ticketComments(pages,ticketId){
 return pages.filter(p=>p.ticket_id===ticketId).sort((a,b)=>a.start_at-b.start_at).flatMap(p=>p.comments);
}

function unchangedSource(before,after,selectedScope,ticket,pointer,record,comment,beforeRetained,afterRetained){
 if(!reportSafe(before.report,selectedScope)||!reportSafe(after.report,selectedScope)
  ||!same(canonicalRows(before.report.diagnostics),canonicalRows(after.report.diagnostics))
  ||!same(scopeRows(before.report,beforeRetained),scopeRows(after.report,afterRetained)))return false;

 const original=before.observations,updated=after.observations,ticketId=ticket.id;
 const expected=original.issues.map(i=>normalizeIssue(i.id===ticketId?{...i,pointer:{state:'present',value:pointer}}:i));
 if(!same(canonicalRows(expected),canonicalRows(updated.issues.map(normalizeIssue))))return false;
 // A complete enumeration can be split into different provider pages or return
 // tied timestamps in a different order. Preserve partial pages exactly.
 const complete=new Set(before.report.issues.filter(row=>row.comments_read==='complete').map(row=>row.id));
 const commentKey=row=>canonicalize(row.ticket_id===ticketId&&row.id===comment.id?row:{...row,body:JSON.parse(row.body)});
 const fullRows=pages=>pages.filter(p=>complete.has(p.ticket_id)).flatMap(p=>p.comments.map(c=>({ticket_id:p.ticket_id,...c})));
 const partialRows=pages=>canonicalRows(pages.filter(p=>!complete.has(p.ticket_id)));
 if(!same(canonicalRows([...fullRows(original.comment_pages),{ticket_id:ticketId,...comment}],commentKey),canonicalRows(fullRows(updated.comment_pages),commentKey))
  ||!same(partialRows(original.comment_pages),partialRows(updated.comment_pages)))return false;

 const projection=projectedSource(original,beforeRetained,afterRetained,ticket,pointer,record,comment.id);
 const expectedExact=expectedExactComments(before,projection,ticket,comment);
 const expectedReports=before.report.issues.map(row=>row.id===ticketId?{
  ...row,pointer_read:'complete',exact_comments_read:'complete',comment_count:row.comment_count+1,comment_ids:[...row.comment_ids,comment.id]
 }:row);
 const issueRows=rows=>canonicalRows(rows.map(row=>complete.has(row.id)?{...row,comment_ids:[...row.comment_ids].sort(ordinal)}:row));
 return same(issueRows(expectedReports),issueRows(after.report.issues))
  &&same(canonicalRows(expectedExact,commentKey),canonicalRows(updated.exact_comments,commentKey))
  &&same(canonicalRows(projection.references,referenceKey),canonicalRows(updated.references,referenceKey))
  &&same(canonicalRows(projection.enqueues),canonicalRows(updated.provenance.filter(r=>!Object.hasOwn(r,acquisitionSource))))
  &&checkedAcquisitions(original)&&checkedAcquisitions(updated);
}
function prepareAdmission(ticket,choice,stream,configurationDigest){
 const proposal=choice.proposal,repair=proposal.kind==='admit_repair',attempt_id=randomUUID();
 const requests=repair?proposal.request_refs:[];
 const attempt={attempt_id,ticket_id:ticket.id,epic_id:choice.epic_id,issue_key:ticket.key,
  operation:repair?'admit_rework':'admit_ready',source_status_id:proposal.from_status_id,
  target_status_id:proposal.to_status_id,configuration_digest:configurationDigest,cause:requests,publication:[]};
 const record={schema:'pigboard-handoff/v1',record_id:attempt_id,operation_id:attempt_id,
  ticket_id:ticket.id,requirements_digest:digestValue(extractADF(ticket.body).value),assignment:null,
  role:'manager',kind:'admission',from_stage:proposal.from_stage,to_stage:proposal.to_stage,
  payload:{project_id:stream.project_id,stream:stream.label,mode:repair?'repair':'new_work',
   previous_assignment:repair?ticket.pointer.value.assignment:null,requests,existing_pr:repair?proposal.existing_pr:null},
  resume_authorization:null};
 const body={type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:JSON.stringify(record)}]}]};
 const validation=validateHandoff(JSON.stringify(body),{format:'adf'});
 if(!validation.valid)throw fault('PUBLICATION_MISMATCH');
 return {attempt,record,body,digest:validation.record_digest};
}

function sameTicketRepair(proposal,ticket){
 return ticket.pointer.state==='present'&&ticket.pointer.value.assignment.ticket_id===ticket.id
  &&proofEqual(ticket.pointer.value.assignment,proposal.existing_assignment)&&proposal.existing_pr!=null
  &&proposal.request_refs.length>0&&proposal.request_refs.every(r=>r.ticket_id===ticket.id)
  &&proposal.required_parent===null&&proposal.child_completion===null&&!proposal.publication_required
  &&proposal.required_stack_updates.length===0;
}

function projectedRetained(inventory,members,stream,attempt,reference){
 const projected=new Map(inventory.members.map(m=>[m.ticket_id,m]));
 for(const member of members)projected.set(member.ticket_id,member.ticket_id===attempt.ticket_id?{...member,assignment:reference}:member);
 const pending={...stream,...attempt};
 return projectRetainedInventory({...inventory,members:[...projected.values()],pending_attempts:[pending,...inventory.pending_attempts]});
}

function lowerSearchPages(inspection,projectIds){
 const {issues,provenance}=inspection.observations,byId=new Map(issues.map(i=>[i.id,i]));
 const counts=new Map();
 const bound=inspection.report.limits.page_size;
 const seed=p=>JSON.stringify(['seed',p]);
 const child=e=>JSON.stringify(['child',e]);
 const label=(p,l)=>JSON.stringify(['label',p,l]);
 for(const p of projectIds)counts.set(seed(p),0);
 for(const scope of inspection.report.scopes)counts.set(label(scope.project_id,scope.label),0);
 const add=key=>counts.set(key,(counts.get(key)??0)+1);
 const childGroups=new Set();
 for(const row of provenance){
  if(Object.hasOwn(row,acquisitionSource))continue;
  if(row.source==='seed'&&byId.has(row.ticket_id))add(seed(byId.get(row.ticket_id).project_id));
  if(row.source==='label')add(label(row.project_id,row.label));
  if(row.source==='child'){childGroups.add(row.source_ticket_id);add(child(row.source_ticket_id));}
 }
 // Expanded Epics with no children still use a page.
 return inspection.report.counters.epics-childGroups.size+
  [...counts.values()].reduce((sum,n)=>sum+Math.max(1,Math.ceil(n/bound)),0);
}

function preflightRepair(inspection,inventory,retained,members,stream,ticket,prepared,binding,projectIds){
 const {attempt,record,body,digest}=prepared,{observations,report}=inspection;
 if(!reportSafe(report,stream))throw fault('APPLY_HELD');
 const pages=observations.comment_pages.filter(p=>p.ticket_id===ticket.id);
 const prior=ticketComments(pages,ticket.id);
 const usedIds=new Set([...prior.map(c=>c.id),...observations.references.filter(r=>r.ticket_id===ticket.id).map(r=>r.comment_id)]);
 let id=0;
 while(usedIds.has(String(id)))id++;
 // The original record and position are known. Use minimal provider metadata
 // here and leave real metadata and full wire limits to the actual reader/writer.
 const shortest={id:'0',author_id:'x',update_author_id:'x',created:'0',updated:'0',body:JSON.stringify(body)};
 const comment={...shortest,id:String(id)};
 const reference={ticket_id:ticket.id,comment_id:comment.id,record_id:attempt.attempt_id,digest};
 const minimumReference={...reference,comment_id:shortest.id};
 const pointer={schema:'pigboard-work-pointer/v1',assignment:reference};
 const projected=projectedRetained(inventory,members,stream,attempt,reference);
 const supplied={...projected,retained_complete:true};
 try{checkValue(supplied,CONFIG_LIMITS);}catch{throw fault('LIMIT_REACHED');}
 if(serializedBytes({...supplied,retained_members:supplied.retained_members.map(m=>m.ticket_id===ticket.id?{...m,assignment:minimumReference}:m)})>CONFIG_LIMITS.bytes)throw fault('LIMIT_REACHED');
 const time=now(),reserved={kind:'attempt',schema_version:1,installation_id:binding.installation_id,domain_id:binding.domain_id,
  record_id:recordId('attempt',attempt),revision:0,created_at:time,updated_at:time,extensions:{},...stream,...attempt,
  publication:[minimumReference],outcome:'pending',evidence:null};
 if(!valid(attempt,attemptSchema)||!members.every(m=>valid(m,memberSchema))
  ||attempt.publication.length>=attemptSchema.properties.publication.maxItems
  ||validateRecord(reserved,binding)!==null||members.length+3>STATE_LIMITS.actions
  ||projected.retained_members.length>limits.members||projected.pending_intents.length>limits.pending_attempts
  ||(inventory.streams.length>=limits.streams&&!inventory.streams.some(s=>s.project_id===stream.project_id&&s.label===stream.label)))throw fault('TRANSACTION_LIMIT');

 const projection=projectedSource(observations,retained,projected,ticket,pointer,record,comment.id);
 const oldTargets=new Set(observations.references.map(r=>targetKey(r.ticket_id,r.comment_id)));
 const extraTargets=[...projection.targets.keys()].filter(k=>!oldTargets.has(k)).length;
 const {page_size,max_pages,max_comments,max_requests,max_response_bytes,max_total_response_bytes}=report.limits;
 const counters=report.counters,leastPages=[];
 let knownPageCount=0;
 for(const row of report.issues.filter(row=>row.comments_read==='complete')){
  const currentPages=observations.comment_pages.filter(p=>p.ticket_id===row.id);
  const comments=ticketComments(currentPages,row.id);
  knownPageCount+=currentPages.length;
  if(row.id===ticket.id)comments.push(shortest);
  for(let start=0;start<Math.max(1,comments.length);start+=page_size){
   // Zero offsets and a shorter terminal flag undercount on purpose.
   leastPages.push({site:stream.site,ticket_id:row.id,start_at:0,total:comments.length,is_last:true,comments:comments.slice(start,start+page_size)});
  }
 }
 const searchPages=lowerSearchPages(inspection,projectIds),commentPages=counters.comment_pages-knownPageCount+leastPages.length;
 const requests=counters.requests_attempted-counters.search_pages-counters.comment_pages+searchPages+commentPages+extraTargets;
 if(counters.comments+1>max_comments||projection.targets.size>max_comments||searchPages+commentPages>max_pages||requests>max_requests)throw fault('LIMIT_REACHED');

 const minimumPointer={...pointer,assignment:minimumReference};
 const commentResponseBytes=serializedBytes({id:shortest.id,author:{accountId:shortest.author_id},
  updateAuthor:{accountId:shortest.update_author_id},created:shortest.created,updated:shortest.updated,body});
 const pointerResponseBytes=serializedBytes({key:'pigboard.work-context',value:minimumPointer});
 if(Math.max(commentResponseBytes,pointerResponseBytes)>max_response_bytes
  ||2*commentResponseBytes+pointerResponseBytes>max_total_response_bytes)throw fault('LIMIT_REACHED');
 const partialTickets=new Set(report.issues.filter(row=>row.comments_read!=='complete').map(row=>row.id));
 const minimumObservation={
  issues:observations.issues.map(i=>i.id===ticket.id?{...i,pointer:{state:'present',value:minimumPointer}}:i),
  comment_pages:[...leastPages,...observations.comment_pages.filter(p=>partialTickets.has(p.ticket_id))],
  exact_comments:expectedExactComments(inspection,projection,ticket,comment).map(c=>c.ticket_id===ticket.id&&c.id===comment.id?{ticket_id:ticket.id,...shortest}:c),
  references:projection.references.map(r=>r.ticket_id===ticket.id&&r.comment_id===comment.id?{...r,comment_id:shortest.id}
   :r.source_ticket_id===ticket.id&&r.source_comment_id===comment.id?{...r,source_comment_id:shortest.id}:r),
  provenance:[...projection.enqueues,...observations.issues.map(i=>enqueue(i.id,'','',i.project_id,''))]
 };
 if(serializedBytes(minimumObservation)>max_total_response_bytes)throw fault('LIMIT_REACHED');
}

function applyDiagnostic(status,{stage,ticket_id,effects}){
 if(status==='invalid')return 'Correct the prepared admission inputs.';
 if(effects.intent==='confirmed')return 'Inspect the original attempt and its recorded effects in State before another apply.';
 if(effects.intent==='unconfirmed')return 'Check State for the original attempt ID before another apply. Jira writes did not start.';
 if(stage==='retain_members')return 'Verify the selected stream membership and revisions in State before another apply. Apply stopped before starting an attempt.';
 if(ticket_id!==null)return 'Review the reason for holding the selected ticket before another apply. Apply stopped before starting an attempt.';
 return 'Review the reported reason and any held streams before another apply.';
}

/** One ordinary effect sequence. The prepared host owns State and resolver cleanup. */
export async function applyOrdinary(configText,{binding,control,state,resolveSecret,producer_invocation_id,deadline}={}){
 const out={status:'invalid',code:'APPLY_UNAVAILABLE',diagnostics:[],controls_match:null,writes:0,apply:{scope:null,ticket_id:null,attempt_id:null,stage:'prepare',hold:false,effects:Object.fromEntries(['intent','comment','pointer','transition','finalization'].map(k=>[k,'not_attempted']))}};
 const processing={result:'incomplete',identity:null,project_count:null,stream_count:null,issue_count:null,selected_count:null,held_count:null,counts_complete:false,acquisition:{status:'not_observed',domain_complete:false,scopes:[]},policy_complete:false,recheck_complete:false,reason_codes:[],projects:[]};out.processing=processing;
 let writer,selected=false,acquired=false,policy=false,rechecked=false,identityConflict=false,setupFailed=false;
 const observeIdentity=inventory=>{const i=inventory?.installation,identity=i?{installation_id:i.installation_id,package_revision:i.package_revision,configuration_digest:i.configuration_digest,health_generation:i.extensions?.health_generation??null,health_enabled_at:i.extensions?.health_enabled_at??null}:null;
  if(!inventory?.complete||inventory.controls_match!==true||!identity||identity.installation_id!==binding.installation_id||identity.package_revision!==binding.package_revision||identity.configuration_digest!==binding.configuration_digest||!evidenceRevision(identity)||typeof identity.health_enabled_at!=='string'||!Number.isFinite(Date.parse(identity.health_enabled_at))||new Date(identity.health_enabled_at).toISOString()!==identity.health_enabled_at||processing.identity&&!same(processing.identity,identity)){identityConflict=true;processing.identity=null;}
  else if(!identityConflict)processing.identity=identity;
 };
 const observeRead=(report,{recheck=false}={})=>{if(report?.status==='setup_failed'||!recheck&&report?.status==='incomplete'&&report.counters?.requests_attempted===0&&(report.diagnostics??[]).some(d=>d.code==='SECRET_UNAVAILABLE'))setupFailed=true;const complete=report?.status==='complete'&&report.domain_complete===true&&Array.isArray(report.scopes)&&report.scopes.every(s=>s.complete===true);if(recheck)processing.recheck_complete=complete;else processing.acquisition={status:['complete','incomplete','setup_failed'].includes(report?.status)?report.status:'unavailable',domain_complete:report?.domain_complete===true,scopes:(report?.scopes??[]).map(s=>({project_id:s.project_id,label:s.label,complete:s.complete===true}))};processing.reason_codes.push(...(report?.diagnostics??[]).map(d=>safeReason(d.code)));return complete;};
 const finish=(status,code)=>{const expired=!Number.isFinite(deadline)||performance.now()>=deadline;if(expired)processing.reason_codes.push('LIMIT_REACHED');out.status=status;out.code=known.has(code)?code:'APPLY_HELD';out.apply.hold=status==='held';processing.result=acquired&&policy&&(!selected||code==='APPLIED'&&rechecked)&&!identityConflict&&!expired?'complete':setupFailed||['UNAVAILABLE','SECRET_UNAVAILABLE','APPLY_UNAVAILABLE'].includes(code)?'failed':'incomplete';processing.reason_codes=[...new Set([...processing.reason_codes,code==='APPLIED'?'OK':processing.result==='complete'?'NO_READY_WORK':safeReason(code)])];out.diagnostics=code==='APPLIED'||code==='NO_ORDINARY_SELECTION'?[]:[{code:out.code,message:applyDiagnostic(status,out.apply),scope:out.apply.scope}];return out;};
 const check=()=>{if(!Number.isFinite(deadline)||performance.now()>=deadline)throw fault('LIMIT_REACHED');};
 const stage=name=>{out.apply.stage=name;check();};
 const confirmed=r=>{if(r?.status!=='confirmed')throw fault(known.has(r?.code)?r.code:'APPLY_HELD');return r.data;};
 try{
  check();const parsed=parseConfig(configText),config=parseContract(configText),m=config.manager;
  if(!parsed.valid||!m||!validBinding(binding,control)||binding.configuration_digest!==parsed.configuration_digest||binding.site!==config.jira.site||binding.installation_id!==m.installation_id||binding.domain_id!==m.domain_id||binding.region!==m.aws.region||!same(control,{configuration_digest:parsed.configuration_digest,...Object.fromEntries(['schedule_enabled','writes_enabled','maintenance'].map(k=>[k,m.controls[k]]))})||typeof state?.readInventory!=='function'||typeof resolveSecret!=='function'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(producer_invocation_id??''))return finish('invalid','BINDING_MISMATCH');
  if(m.controls.mode!=='apply'||!control.schedule_enabled||!control.writes_enabled||control.maintenance||!['full_visibility_confirmed','sole_admitting_installation_confirmed','inventory_reviewed'].every(k=>m.activation[k]===true))return finish('held','CONTROL_MISMATCH');
  stage('acquire');let inventory=confirmed(await state.readInventory({limits}));out.controls_match=inventory.controls_match;
  observeIdentity(inventory);if(!inventory.complete||!inventory.controls_match)throw fault('CONTROL_MISMATCH');
  if(inventory.installation.installation_generation!==binding.installation_generation)throw fault('BINDING_MISMATCH');
  const initialRetained=projectRetainedInventory(inventory);const inspection=await inspectJiraInventory(configText,{...initialRetained,retained_complete:true},{resolveSecret});check();
  acquired=observeRead(inspection.report);
  const composed=composeOrdinarySnapshot(configText,inspection,{...initialRetained,retained_complete:true,retained:[]});
  if(!composed.valid)return finish('held','APPLY_HELD');
  const preview=previewSnapshot(configText,JSON.stringify(composed.snapshot),{mode:'ordinary'});if(!preview.valid||preview.mode!=='ordinary'||preview.configuration_digest!==parsed.configuration_digest)return finish('held','APPLY_HELD');
  policy=true;processing.policy_complete=true;const rows=preview.streams;processing.project_count=acquired?config.projects.length:null;processing.stream_count=rows.length;processing.issue_count=acquired?inspection.report.issues.length:null;processing.selected_count=rows.filter(s=>s.selected_ticket_id!==null).length;processing.held_count=rows.filter(s=>['hold','wait'].includes(s.decision)).length;processing.counts_complete=acquired&&rows.every(s=>s.counts_complete===true);processing.reason_codes.push(...rows.flatMap(s=>s.reasons.map(r=>safeReason(r.code))));processing.projects=config.projects.map(p=>{const projectRows=rows.filter(s=>s.scope.project_id===p.id);return {project_id:p.id,stream_count:projectRows.length,issue_count:acquired?inspection.report.issues.filter(i=>i.project_id===p.id).length:null,selected_count:projectRows.filter(s=>s.selected_ticket_id!==null).length,held_count:projectRows.filter(s=>['hold','wait'].includes(s.decision)).length,reason_codes:projectRows.flatMap(s=>s.reasons.map(r=>safeReason(r.code)))};});
  const choice=chooseOrdinaryStream(preview.streams,{reworkEnabled:m.rework_enabled===true});if(!choice){const refusal=preview.streams.flatMap(s=>s.reasons).find(r=>known.has(r.code));const held=refusal||preview.status==='held'||preview.status==='partial'||preview.scope_diagnostics.length;return finish(held?'held':'no_action',refusal?.code??(held?'APPLY_HELD':'NO_ORDINARY_SELECTION'));}
  selected=true;const stream=structuredClone(choice.scope),proposal=choice.proposal,ticket=inspection.observations.issues.find(i=>i.id===choice.selected_ticket_id),project=parsed.resolved_scope.projects.find(p=>p.id===stream.project_id);
  out.apply.scope=stream;out.apply.ticket_id=ticket?.id??null;
  const repair=proposal.kind==='admit_repair',sourceStage=repair?'Rework Queued':'Ready to Work';
  if(!ticket||!project||stream.site!==binding.site||proposal.ticket_id!==ticket.id||!same(proposal.scope,stream)
   ||proposal.from_stage!==sourceStage||proposal.to_stage!=='In Progress'||ticket.project_id!==stream.project_id
   ||ticket.status_id!==project.stages[sourceStage]||proposal.from_status_id!==ticket.status_id
   ||proposal.to_status_id!==project.stages['In Progress']||!choice.epic_id||ticket.parent_id!==choice.epic_id
   ||![project.types.story,project.types.bug].includes(ticket.type_id)||!project.actors.manager.length
   ||repair&&!sameTicketRepair(proposal,ticket))throw fault('APPLY_HELD');
  const edges=m.transition_edges.filter(e=>e.project_id===stream.project_id&&!e.global&&e.target_status_id===proposal.to_status_id&&e.source_status_ids.includes(proposal.from_status_id));
  if(edges.length!==1)throw fault('SOURCE_EDGE_REQUIRED');const edge=edges[0];
  const scope=inspection.report.scopes.find(s=>s.project_id===stream.project_id&&s.label===stream.label);if(!scope?.complete)throw fault('APPLY_HELD');
  const normalized=normalizeSnapshot(composed.snapshot,parsed.resolved_scope,'ordinary'),memberScope=[...normalized.streams.values()].find(s=>same(s.scope,stream));
  if(!memberScope||memberScope.holds.length)throw fault('APPLY_HELD');
  const ids=[...memberScope.members].sort(ordinal);if(ids.length<1||ids.length>97)throw fault('TRANSACTION_LIMIT');if(!ids.includes(ticket.id))throw fault('OWNERSHIP_CONFLICT');
  let members=ids.map(ticket_id=>{
   const prior=inventory.members.find(m=>m.ticket_id===ticket_id),issue=normalized.byId.get(ticket_id);
   if(!issue||issue.project_id!==stream.project_id||![project.types.story,project.types.bug].includes(issue.type_id)||typeof issue.parent_id!=='string'||!/^[0-9]{1,255}$/.test(issue.parent_id)||issue.pointer?.state==='unknown')throw fault('OWNERSHIP_CONFLICT');
   const member={site:stream.site,project_id:issue.project_id,label:stream.label,ticket_id,epic_id:issue.parent_id,assignment:issue.pointer===null?null:structuredClone(issue.pointer?.assignment),expected_revision:prior?.revision??null};
   if(member.assignment===undefined||prior&&!sameMembership(member,prior))throw fault('OWNERSHIP_CONFLICT');
   return member;
  });
  let preparedAdmission;
  if(repair){
   stage('preflight');preparedAdmission=prepareAdmission(ticket,choice,stream,parsed.configuration_digest);
   preflightRepair(inspection,inventory,initialRetained,members,stream,ticket,preparedAdmission,binding,config.projects.map(p=>p.id));
  }
  stage('retain_members');const retainedResult=confirmed(await state.retainMembers({expected_installation_revision:inventory.installation.revision,members,now:now()}));
  inventory=confirmed(await state.readInventory({limits}));observeIdentity(inventory);if(!inventory.complete||!inventory.controls_match||inventory.installation.revision!==retainedResult.installation_revision)throw fault('REVISION_CONFLICT');
  members=members.map(m=>{const observed=inventory.members.find(r=>r.ticket_id===m.ticket_id);if(!observed||!sameMembership(m,observed))throw fault('OWNERSHIP_CONFLICT');return {...m,expected_revision:observed.revision};});
  const oldStream=inventory.streams.find(s=>same({site:s.site,project_id:s.project_id,label:s.label},stream));
  preparedAdmission??=prepareAdmission(ticket,choice,stream,parsed.configuration_digest);
  const {attempt,record,body,digest}=preparedAdmission,{attempt_id}=attempt;
  out.apply.attempt_id=attempt_id;
  stage('begin');out.apply.effects.intent='unconfirmed';let versions=confirmed(await state.begin({expected_installation_revision:inventory.installation.revision,stream,expected_stream_revision:oldStream?.revision??null,attempt,required_members:members,now:now()}));out.apply.effects.intent='confirmed';
  let revisions={expected_installation_revision:versions.installation_revision,expected_stream_revision:versions.stream_revision,expected_attempt_revision:versions.attempt_revision};
  const proofInput=()=>({attempt_id,...revisions});
  const acceptProof=data=>{observeIdentity({...data,complete:true,controls_match:data.controls_match!==false&&['configuration_digest','schedule_enabled','writes_enabled','maintenance'].every(k=>data.installation[k]===control[k])});revisions={expected_installation_revision:data.installation.revision,expected_stream_revision:data.stream.revision,expected_attempt_revision:data.attempt.revision};return data;};
  writer=await createJiraWriter(configText,{resolveSecret,deadline});
  stage('comment');out.apply.effects.comment='unconfirmed';out.writes++;const appended=await writer.appendComment(ticket.id,body),comment=await writer.readComment(ticket.id,appended.id);
  const candidate=extractHandoffCandidate(comment.body);
  if(!same(appended,comment)||!project.actors.manager.includes(comment.author_id)||comment.author_id!==comment.update_author_id||comment.created!==comment.updated||!same(JSON.parse(comment.body),body)||candidate?.record_digest!==digest||canonicalize(candidate.value)!==canonicalize(record))throw fault('PUBLICATION_MISMATCH');out.apply.effects.comment='confirmed';
  const reference={ticket_id:ticket.id,comment_id:comment.id,record_id:attempt_id,digest};
  stage('retain_publication');acceptProof(confirmed(await state.retainPublication({...proofInput(),reference,now:now()})));
  const pointer={schema:'pigboard-work-pointer/v1',assignment:reference};stage('pointer');out.apply.effects.pointer='unconfirmed';out.writes++;await writer.putPointer(ticket.id,pointer);if(!same(await writer.readPointer(ticket.id),pointer))throw fault('PUBLICATION_MISMATCH');out.apply.effects.pointer='confirmed';
  stage('retain_assignment');const member=members.find(m=>m.ticket_id===ticket.id);
  const assignment=confirmed(await state.retainMembers({expected_installation_revision:revisions.expected_installation_revision,members:[{...member,assignment:reference}],now:now()}));
  const records=confirmed(await state.readAttempt({attempt_id}));
  if(!records.controls_match||records.attempt.attempt_id!==attempt_id||records.stream.pending_attempt_id!==attempt_id)throw fault('CONTROL_MISMATCH');
  if(records.installation.revision!==assignment.installation_revision||records.stream.revision!==revisions.expected_stream_revision||records.attempt.revision!==revisions.expected_attempt_revision)throw fault('REVISION_CONFLICT');
  acceptProof(records);
  stage('recheck');const retained=projectedRetained(inventory,members,stream,records.attempt,reference);
  const recheck=await inspectJiraInventory(configText,{...retained,retained_complete:true},{resolveSecret});
  rechecked=observeRead(recheck.report,{recheck:true});check();
  if(!unchangedSource(inspection,recheck,stream,ticket,pointer,record,comment,initialRetained,retained))throw fault('CHANGED_INPUT');
  const observations={comments:[{reference,author_id:comment.author_id,update_author_id:comment.update_author_id,created:new Date(comment.created).toISOString(),updated:new Date(comment.updated).toISOString()}],pointer:{mode:'published',assignment:reference}};
  stage('prepare_transition');const prepared=acceptProof(confirmed(await state.prepareTransitionCapture({...proofInput(),transition_id:edge.transition_id,producer_invocation_id,publication_observations:observations,now:now()})));
  stage('transition');out.apply.effects.transition='unconfirmed';out.writes++;const response=await writer.transition(ticket.id,edge.transition_id);out.apply.effects.transition='confirmed';
  stage('retain_response');acceptProof(confirmed(await state.recordTransitionResponse({...proofInput(),request_digest:prepared.attempt.extensions.pb_capture_request_digest,http_status:response.http_status,observed_at:response.observed_at,provider_request_id:providerRequestId(response.provider_request_id)})));
  stage('finalize');out.apply.effects.finalization='unconfirmed';confirmed(await state.finalize({...proofInput(),stream,outcome:'applied',evidence:{references:[reference],disposition:'confirmed_applied',actor_id:comment.author_id},now:now()}));out.apply.effects.finalization='confirmed';stage('complete');return finish('applied','APPLIED');
 }catch(error){if(out.apply.stage==='acquire'&&!policy&&!known.has(error?.code))setupFailed=true;return finish(selected||out.apply.stage!=='prepare'?'held':'invalid',known.has(error?.code)?error.code:'APPLY_HELD');}
 finally{writer?.close();}
}
