import canonicalize from 'canonicalize';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {isDeepStrictEqual as same} from 'node:util';
import {parseConfig} from '../config/parse.mjs';
import {parseContract,extractADF} from '../contracts/work.mjs';
import {digestValue,validateHandoff,extractHandoffCandidate} from '../contracts/handoff.mjs';
import {validBinding,projectRetainedInventory,providerRequestId} from '../state/contract.mjs';
import {inspectJiraInventory} from '../jira/inventory.mjs';
import {createJiraWriter} from '../jira/write.mjs';
import {composeOrdinarySnapshot} from './snapshot.mjs';
import {previewSnapshot} from './decisions.mjs';
const limits={streams:1000,members:1000,pending_attempts:1000,pages:10000,requests:10000,milliseconds:30000};
const known=new Set(['APPLIED','NO_ORDINARY_SELECTION','APPLY_EVENT_REQUIRED','APPLY_UNAVAILABLE','APPLY_HELD','LIMIT_REACHED','CONTROL_MISMATCH','BINDING_MISMATCH','REVISION_CONFLICT','UNCERTAIN_WRITE','PENDING_ATTEMPT','OWNERSHIP_CONFLICT','INVALID_INPUT','UNAVAILABLE','INCOMPLETE_INVENTORY','PUBLICATION_MISMATCH','PROOF_CONFLICT','UNSUPPORTED_PROOF','TRANSACTION_LIMIT','CHANGED_INPUT','RESPONSE_INVALID','SECRET_UNAVAILABLE','REDIRECT_REJECTED','RATE_LIMITED','SOURCE_EDGE_REQUIRED','LINEAGE_REQUIRED','HUMAN_REVIEW_CAP','EPIC_PAUSED','OCCUPIED','BLOCKED','REPAIR_REQUIRED','INCOMPLETE_SNAPSHOT','PENDING_INTENT','MEMBERSHIP_MISMATCH','INCOMPLETE_STREAM','INCOMPLETE_PROJECT','MISSING_KNOWN_ID','UNKNOWN_STATUS','SCOPE','NO_OPT_IN','INVALID_WORK','PREREQUISITE_UNSATISFIED','INCONSISTENT_OCCUPANCY']);
const fault=code=>Object.assign(new Error(code),{code});
const now=()=>new Date().toISOString();
const ordinal=(a,b)=>a<b?-1:a>b?1:0;
/** Tie-breaking only; policy owns candidate priority and eligibility. */
export function chooseOrdinaryStream(streams){return streams.filter(s=>s.decision==='select'&&s.proposal?.kind==='admit_new').slice().sort((a,b)=>ordinal(a.scope.project_id,b.scope.project_id)||ordinal(a.scope.label,b.scope.label))[0]??null;}
const normalizeIssue=i=>({...i,labels:[...i.labels].sort(),body:i.body===null?null:JSON.parse(i.body)});
const flattened=o=>o.comment_pages.flatMap(p=>p.comments.map(c=>({ticket_id:p.ticket_id,...c}))).sort((a,b)=>ordinal(a.ticket_id,b.ticket_id)||ordinal(a.id,b.id));
function unchangedSource(before,after,ticket,pointer,comment){
 if(after.report.status!=='complete'||!after.report.domain_complete)return false;
 const original=before.observations,updated=after.observations;
 const expected=original.issues.map(i=>normalizeIssue(i.id===ticket?{...i,pointer:{state:'present',value:pointer}}:i)).sort((a,b)=>ordinal(a.id,b.id));
 const actual=updated.issues.map(normalizeIssue).sort((a,b)=>ordinal(a.id,b.id));
 if(!same(expected,actual))return false;
 const comments=[...flattened(original),{ticket_id:ticket,...comment}].sort((a,b)=>ordinal(a.ticket_id,b.ticket_id)||ordinal(a.id,b.id));
 if(!same(comments,flattened(updated)))return false;
 const scopes=r=>r.scopes.map(s=>({project_id:s.project_id,label:s.label,complete:s.complete,current_issue_ids:s.current_issue_ids})).sort((a,b)=>ordinal(a.project_id,b.project_id)||ordinal(a.label,b.label));
 return same(scopes(before.report),scopes(after.report))&&updated.exact_comments.some(c=>c.ticket_id===ticket&&same(c,{ticket_id:ticket,...comment}));
}
/** One ordinary effect sequence. The prepared host owns State and resolver cleanup. */
export async function applyOrdinary(configText,{binding,control,state,resolveSecret,producer_invocation_id,deadline}={}){
 const out={status:'invalid',code:'APPLY_UNAVAILABLE',diagnostics:[],controls_match:null,writes:0,apply:{scope:null,ticket_id:null,attempt_id:null,stage:'prepare',hold:false,effects:Object.fromEntries(['intent','comment','pointer','transition','finalization'].map(k=>[k,'not_attempted']))}};
 let writer,selected=false;
 const finish=(status,code)=>{out.status=status;out.code=known.has(code)?code:'APPLY_HELD';out.apply.hold=status==='held';out.diagnostics=code==='APPLIED'||code==='NO_ORDINARY_SELECTION'?[]:[{code:out.code,message:status==='invalid'?'Correct the prepared admission inputs.':'Inspect the selected scope and original attempt before another authorized invocation.',scope:out.apply.scope}];return out;};
 const check=()=>{if(!Number.isFinite(deadline)||performance.now()>=deadline)throw fault('LIMIT_REACHED');};
 const stage=name=>{out.apply.stage=name;check();};
 const confirmed=r=>{if(r?.status!=='confirmed')throw fault(known.has(r?.code)?r.code:'APPLY_HELD');return r.data;};
 try{
  check();const parsed=parseConfig(configText),config=parseContract(configText),m=config.manager;
  if(!parsed.valid||!m||!validBinding(binding,control)||binding.configuration_digest!==parsed.configuration_digest||binding.site!==config.jira.site||binding.installation_id!==m.installation_id||binding.domain_id!==m.domain_id||binding.region!==m.aws.region||!same(control,{configuration_digest:parsed.configuration_digest,...Object.fromEntries(['schedule_enabled','writes_enabled','maintenance'].map(k=>[k,m.controls[k]]))})||typeof state?.readInventory!=='function'||typeof resolveSecret!=='function'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(producer_invocation_id??''))return finish('invalid','BINDING_MISMATCH');
  if(m.controls.mode!=='apply'||!control.schedule_enabled||!control.writes_enabled||control.maintenance||!['full_visibility_confirmed','sole_admitting_installation_confirmed','inventory_reviewed'].every(k=>m.activation[k]===true))return finish('held','CONTROL_MISMATCH');
  stage('acquire');let inventory=confirmed(await state.readInventory({limits}));out.controls_match=inventory.controls_match;
  if(!inventory.complete||!inventory.controls_match)throw fault('CONTROL_MISMATCH');
  let retained=projectRetainedInventory(inventory);const inspection=await inspectJiraInventory(configText,{...retained,retained_complete:true},{resolveSecret});check();
  const composed=composeOrdinarySnapshot(configText,inspection,{...retained,retained_complete:true,retained:[]});
  if(!composed.valid)return finish('held','APPLY_HELD');
  const preview=previewSnapshot(configText,JSON.stringify(composed.snapshot),{mode:'ordinary'});if(!preview.valid)return finish('held','APPLY_HELD');
  const choice=chooseOrdinaryStream(preview.streams);if(!choice){const refusal=preview.streams.flatMap(s=>s.reasons).find(r=>known.has(r.code));const held=refusal||preview.status==='held'||preview.status==='partial'||preview.scope_diagnostics.length;return finish(held?'held':'no_action',refusal?.code??(held?'APPLY_HELD':'NO_ORDINARY_SELECTION'));}
  selected=true;const stream=structuredClone(choice.scope),proposal=choice.proposal,ticket=inspection.observations.issues.find(i=>i.id===choice.selected_ticket_id),project=parsed.resolved_scope.projects.find(p=>p.id===stream.project_id);
  out.apply.scope=stream;out.apply.ticket_id=ticket?.id??null;
  if(!ticket||!project||stream.site!==binding.site||proposal.ticket_id!==ticket.id||!same(proposal.scope,stream)||proposal.from_stage!=='Ready to Work'||proposal.to_stage!=='In Progress'||ticket.project_id!==stream.project_id||ticket.status_id!==project.stages['Ready to Work']||proposal.from_status_id!==ticket.status_id||proposal.to_status_id!==project.stages['In Progress']||!choice.epic_id)throw fault('APPLY_HELD');
  const edges=m.transition_edges.filter(e=>e.project_id===stream.project_id&&!e.global&&e.target_status_id===proposal.to_status_id&&e.source_status_ids.includes(proposal.from_status_id));
  if(edges.length!==1)throw fault('SOURCE_EDGE_REQUIRED');const edge=edges[0];
  const scope=inspection.report.scopes.find(s=>s.project_id===stream.project_id&&s.label===stream.label);if(!scope?.complete)throw fault('APPLY_HELD');
  const ids=[...new Set([...scope.current_issue_ids,...scope.old_issue_ids])];if(ids.length<1||ids.length>97)throw fault('TRANSACTION_LIMIT');
  let members=ids.map(ticket_id=>{const prior=inventory.members.find(m=>m.ticket_id===ticket_id),issue=inspection.observations.issues.find(i=>i.id===ticket_id);if(!issue)throw fault('APPLY_HELD');return {...stream,ticket_id,epic_id:choice.epic_id,assignment:issue.pointer.state==='present'?issue.pointer.value.assignment:null,expected_revision:prior?.revision??null};});
  stage('retain_members');const retainedResult=confirmed(await state.retainMembers({expected_installation_revision:inventory.installation.revision,members,now:now()}));
  inventory=confirmed(await state.readInventory({limits}));if(!inventory.complete||!inventory.controls_match||inventory.installation.revision!==retainedResult.installation_revision)throw fault('REVISION_CONFLICT');
  members=members.map(m=>{const observed=inventory.members.find(r=>r.ticket_id===m.ticket_id);if(!observed||!['site','project_id','label','epic_id','ticket_id','assignment'].every(k=>same(m[k],observed[k])))throw fault('OWNERSHIP_CONFLICT');return {...m,expected_revision:observed.revision};});
  const oldStream=inventory.streams.find(s=>same({site:s.site,project_id:s.project_id,label:s.label},stream));
  const attempt_id=randomUUID();out.apply.attempt_id=attempt_id;
  const attempt={attempt_id,ticket_id:ticket.id,epic_id:choice.epic_id,issue_key:ticket.key,operation:'admit_ready',source_status_id:proposal.from_status_id,target_status_id:proposal.to_status_id,configuration_digest:parsed.configuration_digest,cause:[],publication:[]};
  stage('begin');out.apply.effects.intent='unconfirmed';let versions=confirmed(await state.begin({expected_installation_revision:inventory.installation.revision,stream,expected_stream_revision:oldStream?.revision??null,attempt,required_members:members,now:now()}));out.apply.effects.intent='confirmed';
  let revisions={expected_installation_revision:versions.installation_revision,expected_stream_revision:versions.stream_revision,expected_attempt_revision:versions.attempt_revision};
  const proofInput=()=>({attempt_id,...revisions});
  const acceptProof=data=>{revisions={expected_installation_revision:data.installation.revision,expected_stream_revision:data.stream.revision,expected_attempt_revision:data.attempt.revision};return data;};
  const record={schema:'pigboard-handoff/v1',record_id:attempt_id,operation_id:attempt_id,ticket_id:ticket.id,requirements_digest:digestValue(extractADF(ticket.body).value),assignment:null,role:'manager',kind:'admission',from_stage:'Ready to Work',to_stage:'In Progress',payload:{project_id:stream.project_id,stream:stream.label,mode:'new_work',previous_assignment:null,requests:[],existing_pr:null},resume_authorization:null};
  const body={type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:JSON.stringify(record)}]}]};const validation=validateHandoff(JSON.stringify(body),{format:'adf'});if(!validation.valid)throw fault('PUBLICATION_MISMATCH');
  writer=await createJiraWriter(configText,{resolveSecret,deadline});
  stage('comment');out.apply.effects.comment='unconfirmed';out.writes++;const appended=await writer.appendComment(ticket.id,body),comment=await writer.readComment(ticket.id,appended.id);
  const candidate=extractHandoffCandidate(comment.body);
  if(!same(appended,comment)||!project.actors.manager.includes(comment.author_id)||comment.author_id!==comment.update_author_id||comment.created!==comment.updated||!same(JSON.parse(comment.body),body)||candidate?.record_digest!==validation.record_digest||canonicalize(candidate.value)!==canonicalize(record))throw fault('PUBLICATION_MISMATCH');out.apply.effects.comment='confirmed';
  const reference={ticket_id:ticket.id,comment_id:comment.id,record_id:attempt_id,digest:validation.record_digest};
  stage('retain_publication');acceptProof(confirmed(await state.retainPublication({...proofInput(),reference,now:now()})));
  const pointer={schema:'pigboard-work-pointer/v1',assignment:reference};stage('pointer');out.apply.effects.pointer='unconfirmed';out.writes++;await writer.putPointer(ticket.id,pointer);if(!same(await writer.readPointer(ticket.id),pointer))throw fault('PUBLICATION_MISMATCH');out.apply.effects.pointer='confirmed';
  stage('retain_assignment');const member=members.find(m=>m.ticket_id===ticket.id);confirmed(await state.retainMembers({expected_installation_revision:revisions.expected_installation_revision,members:[{...member,assignment:reference}],now:now()}));
  const records=acceptProof(confirmed(await state.readAttempt({attempt_id})));if(!records.controls_match||records.attempt.attempt_id!==attempt_id||records.stream.pending_attempt_id!==attempt_id)throw fault('CONTROL_MISMATCH');
  stage('recheck');retained=projectRetainedInventory({...inventory,members:inventory.members.map(m=>m.ticket_id===ticket.id?{...m,assignment:reference}:m),pending_attempts:[records.attempt,...inventory.pending_attempts]});
  const recheck=await inspectJiraInventory(configText,{...retained,retained_complete:true},{resolveSecret});check();if(!unchangedSource(inspection,recheck,ticket.id,pointer,comment))throw fault('CHANGED_INPUT');
  const observations={comments:[{reference,author_id:comment.author_id,update_author_id:comment.update_author_id,created:new Date(comment.created).toISOString(),updated:new Date(comment.updated).toISOString()}],pointer:{mode:'published',assignment:reference}};
  stage('prepare_transition');const prepared=acceptProof(confirmed(await state.prepareTransitionCapture({...proofInput(),transition_id:edge.transition_id,producer_invocation_id,publication_observations:observations,now:now()})));
  stage('transition');out.apply.effects.transition='unconfirmed';out.writes++;const response=await writer.transition(ticket.id,edge.transition_id);out.apply.effects.transition='confirmed';
  stage('retain_response');acceptProof(confirmed(await state.recordTransitionResponse({...proofInput(),request_digest:prepared.attempt.extensions.pb_capture_request_digest,http_status:response.http_status,observed_at:response.observed_at,provider_request_id:providerRequestId(response.provider_request_id)})));
  stage('finalize');out.apply.effects.finalization='unconfirmed';confirmed(await state.finalize({...proofInput(),stream,outcome:'applied',evidence:{references:[reference],disposition:'confirmed_applied',actor_id:comment.author_id},now:now()}));out.apply.effects.finalization='confirmed';stage('complete');return finish('applied','APPLIED');
 }catch(error){return finish(selected||out.apply.stage!=='prepare'?'held':'invalid',known.has(error?.code)?error.code:'APPLY_HELD');}
 finally{writer?.close();}
}
