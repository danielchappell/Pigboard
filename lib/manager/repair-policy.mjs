import { equal, reason } from './snapshot.mjs';
import { HANDOFF_LIMITS } from '../contracts/handoff.mjs';
const key=ref=>JSON.stringify([ref.ticket_id,ref.comment_id,ref.record_id,ref.digest]);
const uniq=refs=>[...new Map(refs.map(r=>[key(r),r])).values()].sort((a,b)=>key(a).localeCompare(key(b)));
/** Pure scheduling over authenticated facts. Proposals carry no execution authority. */
export function repairPolicy(model,stream,available,candidates){
 const {snapshot,byId,stage,proofs,histories,coverageSegments,invalidProofs}=model;
 const rows=[...histories.values()],byReference=new Map(rows.map(r=>[key(r.reference),r])),lookup=ref=>ref&&byReference.get(key(ref));
 const prKey=pr=>pr&&JSON.stringify([pr.provider,pr.repository,pr.number]);
 // Current assignment references stay exact. Only duplicate publications of the
 // same logical QA result coalesce for completion coherence.
 const chainCache=new Map();
 function chain(i){
  if(chainCache.has(i.id))return chainCache.get(i.id);
  const admission=lookup(i.pointer?.assignment),lineage=new Set(admission?.kind==='admission'&&admission.ticket_id===i.id?admission.assignment_lineage.map(key):[]);
  const completed=rows.filter(r=>r.ticket_id===i.id&&r.completed&&lineage.has(key(r.assignment))),groups=new Map();
  for(const r of completed){const assignment=key(r.assignment),logical=JSON.stringify([r.reference.ticket_id,r.reference.record_id,r.reference.digest]);if(!groups.has(assignment))groups.set(assignment,new Set());groups.get(assignment).add(logical);}
  const result={admission,lineage,completed,coherent:![...groups.values()].some(g=>g.size>1)};chainCache.set(i.id,result);return result;
 }
 const order=stream.orders.get(stream.owner?.issue.id)??[],members=[...stream.members].map(id=>byId.get(id)).filter(Boolean),reasons=[],repair_order=[],ready=[],queues=[];
 let required=false,unprovedChain=false;const parentWaits=[];
 const knownPR=pr=>model.envelopes.filter(e=>e.bound&&e.history?.valid&&!e.conflict).flatMap(e=>e.e.pr_receipts).find(p=>p.current&&p.repository===pr?.repository&&p.provider===pr?.provider&&p.number===pr?.number);
 function publishable(i,update,requirements_digest){
  if(update.roots.length>HANDOFF_LIMITS.list)return false;
  // Size only: UUID widths are fixed. The existing UUID supplies that width;
  // this shell is never returned, published or treated as a future identity.
  const uuid=i.pointer.assignment.record_id,shell={schema:'pigboard-handoff/v1',record_id:uuid,operation_id:uuid,ticket_id:i.id,requirements_digest,assignment:i.pointer.assignment,role:'manager',kind:'stack_update_request',from_stage:'Human Review',to_stage:'Rework Queued',payload:update,resume_authorization:null};
  return Buffer.byteLength(JSON.stringify(shell))<=HANDOFF_LIMITS.recordBytes;
 }
 const rowFor=(ticket,state,rs=[])=>{const row={ticket_id:ticket.id,key:ticket.key,state,reasons:rs};repair_order.push(row);return row;};
 const complete=i=>{const p=proofs.get(i.id);return p&&lookup(p.target);};
 function proposal(i,kind,{requests=[],roots=[],parent=null,child=null,updates=[],pr=null}={}){const from=stage(i),to=kind==='queue_stack_update'?'Rework Queued':'In Progress';return {kind,ticket_id:i.id,scope:stream.scope,from_stage:from,to_stage:to,from_status_id:i.status_id,to_status_id:stream.project.stages[to],existing_assignment:i.pointer?.assignment??null,existing_pr:pr,request_refs:uniq(requests),roots:uniq(roots),required_parent:parent,child_completion:child,required_stack_updates:updates,publication_required:updates.length>0,execution_authorized:false};}
 function missing(i,path,invalid=false){const rs=invalid?[{...reason('REPAIR_PROOF_INVALID',path),message:'Supply coherent bound repair or completion evidence; invalid proof cannot account for required repair work.'}]:invalidProofs.get(i.id)?.length?[...invalidProofs.get(i.id)]:[reason('LINEAGE_REQUIRED',path)];
  // Keep declaration provenance without granting its claimed scope authority.
  // Assigned native-bound gaps keep their original location (Q4/S28).
  if(rs.every(r=>r.code==='LINEAGE_REQUIRED')&&!proofs.has(i.id))for(const [index,row]of snapshot.required_repairs.entries())if(row.ticket_id===i.id&&row.references.some(ref=>!i.required_requests.some(n=>equal(n,ref))||!i.pointer?.assignment&&!lookup(ref))){const extra=reason('LINEAGE_REQUIRED','/required_repairs/'+index);if(!rs.some(r=>equal(r,extra)))rs.push(extra);}
  reasons.push(...rs);rowFor(i,'human_hold',rs);required=true;unprovedChain=true;
 }
 function pendingParent(i,own,pr,requestRows){
  if(knownPR(pr)?.state!=='open')return null;
  const assignment=i.pointer.assignment,waits=requestRows.filter(r=>r.kind==='dependency_wait'&&equal(r.assignment,assignment)&&prKey(r.pr)===prKey(pr)&&i.required_requests.some(ref=>equal(ref,r.reference)));
  if(!waits.length||waits.some(r=>!r.request_refs.length))return null;
  const relations=rows.filter(r=>r.ticket_id===i.id&&equal(r.assignment,assignment)&&prKey(r.pr)===prKey(pr)&&r.stack_parent).map(r=>r.stack_parent);
  for(const r of requestRows.filter(r=>r.kind==='stack_update_request')){
   const child=lookup(r.child_completion),parent=lookup(r.parent_completion);
   if(!child?.completed||child.ticket_id!==i.id||!own.lineage.has(key(child.assignment))||prKey(child.pr)!==prKey(pr)||!parent?.completed||child.stack_parent?.ticket_id!==parent.ticket_id||prKey(child.stack_parent.pr)!==prKey(parent.pr))return null;
   relations.push({ticket_id:parent.ticket_id,pr:parent.pr});
  }
  const relation=relations[0];if(!relation||relations.some(r=>r.ticket_id!==relation.ticket_id||prKey(r.pr)!==prKey(relation.pr)))return null;
  const parent=byId.get(relation.ticket_id);if(!parent||!stream.members.has(parent.id)||parent.project_id!==stream.scope.project_id||model.labels(parent).length!==1||model.labels(parent)[0]!==stream.scope.label||proofs.has(parent.id))return null;
  const upstream=waits.flatMap(r=>r.request_refs),parentOwn=chain(parent),completed=parentOwn.completed;if(!parentOwn.coherent)return null;
  if(upstream.some(ref=>{const r=lookup(ref);return !r||r.ticket_id!==parent.id||!['repair_request','stack_update_request','dependency_wait'].includes(r.kind)||!parentOwn.lineage.has(key(r.assignment))||prKey(r.pr)!==prKey(relation.pr)||!parent.required_requests.some(n=>equal(n,ref))||completed.some(c=>c.consumed_requests.some(n=>equal(n,ref)));}))return null;
  return parent.id;
 }
 function prerequisite(i,seen=new Set()){
  if(seen.has(i.id))return null;seen.add(i.id);const w=model.work(i);if(!w.valid)return null;
  for(const p of w.value.prerequisites??[]){const t=model.byKey.get(p.ticket);if(t&&proofs.has(t.id))continue;if(!t)return null;const nested=prerequisite(t,seen);if(nested)return nested;
   const candidate=candidates.find(c=>c.ticket_id===t.id&&c.eligible);if(stage(t)==='Ready to Work'&&candidate&&stream.members.has(t.id))return t;return null;}
  return null;
 }
 for(const i of members){
  const obligations=snapshot.required_repairs.map((r,index)=>({...r,index})).filter(r=>r.ticket_id===i.id&&r.project_id===stream.scope.project_id&&r.label===stream.scope.label),native=i.required_requests,refs=uniq([...native,...obligations.flatMap(r=>r.references)]),accounted=proofs.has(i.id)&&obligations.every(r=>r.references.every(ref=>native.some(n=>equal(n,ref))));
  const extra=obligations.find(r=>r.references.some(ref=>!native.some(n=>equal(n,ref))));
  if(extra){missing(i,'/required_repairs/'+extra.index);continue;}
  const assignment=i.pointer?.assignment,own=chain(i);
  if(!own.coherent){missing(i,'/issues/'+i.index,true);continue;}
  if(refs.length&&accounted){reasons.push(reason('REPAIR_ACCOUNTED_FOR','/issues/'+i.index));rowFor(i,'accounted');}
  const completion=own.completed.find(r=>equal(r.assignment,assignment)),implementation=completion&&lookup(completion.reference),stack=implementation?.stack_parent;
  const queued=stage(i)==='Rework Queued',unaccounted=refs.length&&!accounted;
  if(['In Progress','In Review','QA','Blocked'].includes(stage(i))){if(queued||unaccounted){required=true;rowFor(i,stage(i)==='Blocked'?'human_hold':'active');}continue;}
  if((queued||unaccounted)&&(!assignment||!refs.length||refs.some(ref=>!lookup(ref)))){missing(i,native.length?'/issues/'+i.index+'/required_requests':'/issues/'+i.index);continue;}
  let parent=null,roots=[],updates=[],child=null,pr=completion?.pr??rows.find(r=>r.ticket_id===i.id&&equal(r.assignment,assignment)&&r.pr)?.pr??null;
  // Check complete native retention before subtracting completed direct work.
  const inventoryRows=refs.map(lookup);
  const inventoryValid=!!own.admission&&!inventoryRows.some(r=>!r||r.ticket_id!==i.id||!['repair_request','stack_update_request','dependency_wait'].includes(r.kind)||!own.lineage.has(key(r.assignment))||prKey(r.pr)!==prKey(pr));
  const consumed=new Set(own.completed.filter(r=>prKey(r.pr)===prKey(pr)).flatMap(r=>r.consumed_requests.map(key)));
  const requests=refs.filter(ref=>!consumed.has(key(ref))),requestRows=requests.map(lookup).filter(Boolean),stackRequest=requestRows.find(r=>r.kind==='stack_update_request');
  // An authenticated unfinished child can explain a parent wait, never a
  // child admission. Successful current QA remains required everywhere else.
  if(queued&&pr!==null&&!completion){const parentId=inventoryValid&&requests.length?pendingParent(i,own,pr,requestRows):null;if(parentId){required=true;parentWaits.push({ticket:i.id,parent:parentId});const rs=[reason('PARENT_REPAIR_PENDING','/issues/'+i.index)];reasons.push(...rs);rowFor(i,'parent_completion',rs);continue;}missing(i,'/issues/'+i.index);continue;}
  if((queued||unaccounted)&&!inventoryValid){missing(i,'/issues/'+i.index+'/required_requests');continue;}
  if(queued&&!requests.length){missing(i,'/issues/'+i.index);continue;}
  const parentId=stack?.ticket_id??stackRequest?.parent_completion?.ticket_id;
  if(parentId){child=completion?.reference??null;const p=byId.get(parentId),pCompletion=p&&complete(p),cutoff=stack?.completion??(stackRequest?.child_completion&&rows.find(r=>r.kind==='implementation'&&equal(r.assignment,lookup(stackRequest.child_completion)?.assignment))?.stack_parent?.completion);
   if(pCompletion&&cutoff){const segment=coverageSegments.get(JSON.stringify([pCompletion.reference,cutoff]))??[...coverageSegments.values()].find(s=>equal(s.parent_completion,pCompletion.reference)&&equal(s.cutoff_completion,cutoff));
    if(!segment){missing(i,'/issues/'+i.index);continue;}
    roots=segment.roots;parent={ticket_id:p.id,pr:pCompletion.pr,completion:pCompletion.reference,required_revision:pCompletion.pr.source_revision};
    if(roots.length&&completion){const published=requestRows.some(r=>r.kind==='stack_update_request'&&equal(r.child_completion,completion.reference)&&equal(r.parent_completion,pCompletion.reference)&&equal(r.roots,roots));if(!published)updates=[{child_completion:completion.reference,child_pr:completion.pr,roots,parent_completion:pCompletion.reference,parent_pr:pCompletion.pr,required_parent_revision:pCompletion.pr.source_revision,reason:'Incorporate the recorded immediate parent repair; retain every applicable cause.'}];}
   }else if(queued||unaccounted||p&&(!proofs.has(p.id)&&(p.required_requests.length||['Rework Queued','In Progress','In Review','QA'].includes(stage(p))))){required=true;parentWaits.push({ticket:i.id,parent:parentId});const rs=[reason('PARENT_REPAIR_PENDING','/issues/'+i.index)];reasons.push(...rs);rowFor(i,'parent_completion',rs);continue;}
  }
  if(queued||unaccounted){required=true;
   const observed=knownPR(pr);if(pr&&!observed){missing(i,'/issues/'+i.index);continue;}
   // A real pre-first-PR dependency wait carries upstream obligations even when
   // the current work body has no explicit prerequisite list. History alone
   // cannot resolve them: each upstream ticket needs strict current completion.
   const waits=requestRows.filter(r=>r.kind==='dependency_wait');
   if(pr===null&&(!waits.length||waits.some(r=>r.request_refs.some(ref=>!proofs.has(ref.ticket_id))))){required=true;parentWaits.push({ticket:i.id,parent:waits.flatMap(r=>r.request_refs)[0]?.ticket_id??null});const rs=[reason('PARENT_REPAIR_PENDING','/issues/'+i.index)];reasons.push(...rs);rowFor(i,'parent_completion',rs);continue;}
   if(observed&&['merged','closed'].includes(observed.state)){unprovedChain=true;const rs=[reason('PR_HUMAN_HANDLING','/issues/'+i.index)];reasons.push(...rs);rowFor(i,'human_hold',rs);continue;}
   if(updates.some(update=>!publishable(i,update,completion?.requirements_digest))){const rs=[reason('LIMIT','/issues/'+i.index)];reasons.push(...rs);rowFor(i,'human_hold',rs);continue;}
   roots=uniq([...roots,...requestRows.flatMap(r=>r.roots)]);
   if(!queued){missing(i,'/issues/'+i.index+'/required_requests');continue;}
   const prereq=prerequisite(i);if(prereq){const rs=[reason('REPAIR_PREREQUISITE','/issues/'+prereq.index)];rowFor(prereq,'prerequisite',rs);ready.push({issue:prereq,proposal:proposal(prereq,'admit_new'),reasons:rs,dependency:i.id});continue;}
   const w=model.work(i);if(!w.valid||(w.value.prerequisites??[]).some(p=>!proofs.has(model.byKey.get(p.ticket)?.id))){unprovedChain=true;const rs=[reason('PREREQUISITE_UNSATISFIED','/issues/'+i.index)];reasons.push(...rs);rowFor(i,'prerequisite',rs);continue;}
   const rs=[reason('REPAIR_READY','/issues/'+i.index),...(updates.length?[reason('STACK_REQUEST_PUBLICATION_REQUIRED','/issues/'+i.index)]:[])];rowFor(i,'ready',rs);ready.push({issue:i,proposal:proposal(i,'admit_repair',{requests,roots,parent,child,updates,pr}),reasons:rs});
  }else if(stage(i)==='Human Review'&&stack&&parent&&roots.length){required=true;
   const observation=[...histories.values()].find(r=>r.completed&&equal(r.reference,completion.reference));
   if(!observation){missing(i,'/issues/'+i.index);continue;}
   if(updates.some(update=>!publishable(i,update,completion.requirements_digest))){const rs=[reason('LIMIT','/issues/'+i.index)];reasons.push(...rs);rowFor(i,'human_hold',rs);continue;}
   const currentPR=knownPR(pr);
   if(currentPR&&['closed','merged'].includes(currentPR.state)){unprovedChain=true;const rs=[reason('PR_HUMAN_HANDLING','/issues/'+i.index)];reasons.push(...rs);rowFor(i,'human_hold',rs);continue;}
   const rs=[reason('STACK_UPDATE_REQUIRED','/issues/'+i.index),...(updates.length?[reason('STACK_REQUEST_PUBLICATION_REQUIRED','/issues/'+i.index)]:[])];rowFor(i,'needs_stack_publication',rs);queues.push({issue:i,proposal:proposal(i,'queue_stack_update',{requests,roots,parent,child,updates,pr}),reasons:rs});
  }
 }
 const rank=item=>{let depth=0,current=item.issue,seen=new Set();while(current&&!seen.has(current.id)){seen.add(current.id);const c=rows.find(r=>r.ticket_id===current.id&&r.kind==='implementation'&&equal(r.assignment,current.pointer?.assignment));if(!c?.stack_parent)break;depth++;current=byId.get(c.stack_parent.ticket_id);}return depth;};
 const compare=(a,b)=>rank(a)-rank(b)||(order.indexOf(a.dependency??a.issue.id)-order.indexOf(b.dependency??b.issue.id))||a.issue.id.localeCompare(b.issue.id);
 ready.sort(compare);queues.sort(compare);repair_order.sort((a,b)=>rank({issue:byId.get(a.ticket_id)})-rank({issue:byId.get(b.ticket_id)})||order.indexOf(a.ticket_id)-order.indexOf(b.ticket_id)||a.ticket_id.localeCompare(b.ticket_id));
 // A missing/incoherent required chain cannot be bypassed by another ready
 // repair. A proven upstream repair may progress while its child awaits it.
 const safe=available.queue_allowed&&!unprovedChain,admit=available.admission_allowed;
 for(const c of candidates)if(stage(byId.get(c.ticket_id))==='Rework Queued')c.eligible=safe&&admit&&ready.some(r=>r.issue.id===c.ticket_id&&r.proposal.kind==='admit_repair');
 const waiting=parentWaits.sort((a,b)=>order.indexOf(a.ticket)-order.indexOf(b.ticket))[0],ancestors=new Set();
 for(let id=waiting?.parent;id&&!ancestors.has(id);){ancestors.add(id);const issue=byId.get(id),result=rows.find(r=>r.ticket_id===id&&r.completed&&equal(r.assignment,issue?.pointer?.assignment));id=result?.stack_parent?.ticket_id;}
 const permitted=item=>!waiting||ancestors.has(item.dependency??item.issue.id);
 const chosen=safe&&admit?ready.find(permitted)??queues.find(permitted):safe?queues.find(permitted):null;
 if(chosen)return {required,proposal:chosen.proposal,decision:chosen.proposal.kind==='queue_stack_update'?'queue':'select',reasons:[...reasons,...chosen.reasons],repair_order};
 const publicationWarnings=ready.filter(entry=>entry.proposal.kind==='admit_repair'&&entry.proposal.publication_required).flatMap(entry=>entry.reasons.filter(r=>r.code==='STACK_REQUEST_PUBLICATION_REQUIRED'));
 return {required,proposal:null,decision:null,reasons:[...reasons,...publicationWarnings],repair_order};
}
export function ordinaryProposal(stream,issue){return {kind:'admit_new',ticket_id:issue.id,scope:stream.scope,from_stage:'Ready to Work',to_stage:'In Progress',from_status_id:issue.status_id,to_status_id:stream.project.stages['In Progress'],existing_assignment:null,existing_pr:null,request_refs:[],roots:[],required_parent:null,child_completion:null,required_stack_updates:[],publication_required:false,execution_authorized:false};}
