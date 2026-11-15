import { parseConfig, httpsURL } from '../config/parse.mjs';
import { checkValue } from '../contracts/work.mjs';
import { parseSnapshot, normalizeSnapshot, digest, reason, equal } from './snapshot.mjs';
import { availability } from './availability.mjs';
export const previewBase=()=>({schema:'pigboard-manager-preview/v1',valid:false,status:'invalid',validation_scope:'supplied_snapshot',live_freshness:'not_evaluated',permission:'not_evaluated',destination_authority:'not_evaluated',execution_authorized:false,writes:0,configuration_digest:null,snapshot_digest:null,scope_diagnostics:[],streams:[]});
const sortReasons=rs=>[...new Map(rs.map(r=>[JSON.stringify(r),r])).values()].sort((a,b)=>a.path.localeCompare(b.path)||a.code.localeCompare(b.code));
const ownReason=(code,path)=>({code,path,message:code==='REPAIR_READY'?'An own-ticket repair is ready for this offline selection.':'Complete this ready prerequisite before the required own-ticket repair.'});
const refIdentity=r=>JSON.stringify([r.ticket_id,r.comment_id,r.record_id,r.digest]);
const prIdentity=p=>p&&JSON.stringify([p.provider,p.repository,p.number]);
/** Resolve only the understood pending state; every existing safety gate wins. */
function ownRepairSelection(model,stream,available){
 if(available.decision!=='wait'||!available.reasons.some(r=>r.code==='REPAIR_POLICY_PENDING')||available.reasons.some(r=>!['REPAIR_POLICY_PENDING','REPAIR_ACCOUNTED_FOR'].includes(r.code)))return null;
 const order=stream.orders.get(stream.owner?.issue.id)??[],rows=[...model.histories.values()],byRef=new Map(rows.map(r=>[refIdentity(r.reference),r])),repairs=[];
 for(const id of stream.members){
  const issue=model.byId.get(id);if(!issue)return null;
  const obligations=model.snapshot.required_repairs.filter(r=>r.ticket_id===id&&r.project_id===stream.scope.project_id&&r.label===stream.scope.label),inventory=[...new Map([...issue.required_requests,...obligations.flatMap(r=>r.references)].map(r=>[refIdentity(r),r])).values()];
  const covered=obligations.every(r=>r.references.every(ref=>issue.required_requests.some(native=>equal(ref,native))));
  if(!inventory.length&&model.stage(issue)!=='Rework Queued')continue;
  if(covered&&model.proofs.has(id)&&model.stage(issue)!=='Rework Queued')continue;
  if(!covered||model.stage(issue)!=='Rework Queued'||!order.includes(id)||!model.work(issue).valid||!issue.pointer||!inventory.length)return null;
  const assignment=byRef.get(refIdentity(issue.pointer.assignment));
  if(!assignment||assignment.kind!=='admission'||assignment.ticket_id!==id||!equal(assignment.reference,issue.pointer.assignment))return null;
  const lineage=new Set(assignment.assignment_lineage.map(refIdentity)),completed=rows.filter(r=>r.ticket_id===id&&r.completed&&lineage.has(refIdentity(r.assignment))),completionsByAssignment=new Map();
  // Per-envelope validity does not establish coherence across supplied history.
  // Identical publications share one logical QA result; distinct leaves must wait.
  for(const row of completed){const key=refIdentity(row.assignment),logical=JSON.stringify([row.reference.ticket_id,row.reference.record_id,row.reference.digest]);if(!completionsByAssignment.has(key))completionsByAssignment.set(key,new Set());completionsByAssignment.get(key).add(logical);}
  if([...completionsByAssignment.values()].some(results=>results.size>1))return null;
  const baseline=completed.find(r=>equal(r.assignment,assignment.reference));
  if(!baseline?.pr||baseline.stack_parent!==null)return null;
  const identity=prIdentity(baseline.pr),observed=model.envelopes.filter(e=>e.bound&&e.history?.valid&&!e.conflict).flatMap(e=>e.e.pr_receipts).find(p=>p.current&&prIdentity(p)===identity);
  if(!observed||observed.state!=='open')return null;
  // Validate the complete retained inventory before subtracting proven direct
  // consumption. Root overlap, another ticket or a future assignment is no proof.
  const requests=inventory.map(ref=>byRef.get(refIdentity(ref)));
  if(requests.some(r=>!r||r.kind!=='repair_request'||r.ticket_id!==id||!lineage.has(refIdentity(r.assignment))||prIdentity(r.pr)!==identity))return null;
  const consumed=new Set(completed.filter(r=>prIdentity(r.pr)===identity).flatMap(r=>r.consumed_requests.map(refIdentity)));
  const remaining=inventory.filter(ref=>!consumed.has(refIdentity(ref)));if(!remaining.length)return null;
  repairs.push(issue);
 }
 if(!repairs.length)return null;
 repairs.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
 const visiting=new Set(),memo=new Map();
 function necessary(issue){
  if(memo.has(issue.id))return memo.get(issue.id);if(visiting.has(issue.id))return null;visiting.add(issue.id);
  const work=model.work(issue);if(!work.valid){visiting.delete(issue.id);return null;}const leaves=[];
  for(const prerequisite of work.value.prerequisites??[]){const target=model.byKey.get(prerequisite.ticket);if(target&&model.proofs.has(target.id))continue;
   if(!target||!stream.members.has(target.id)||!order.includes(target.id)||model.stage(target)!=='Ready to Work'){visiting.delete(issue.id);return null;}
   const nested=necessary(target);if(nested===null){visiting.delete(issue.id);return null;}leaves.push(...(nested.length?nested:[target]));
  }
  visiting.delete(issue.id);const result=[...new Map(leaves.map(i=>[i.id,i])).values()].sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));memo.set(issue.id,result);return result;
 }
 const first=repairs[0],needed=necessary(first);if(needed===null)return null;
 const selected=needed[0]??first,eligible=new Set();for(const repair of repairs){const dependencies=necessary(repair);if(dependencies!==null&&!dependencies.length)eligible.add(repair.id);}
 return{selected,eligible,reason:ownReason(needed.length?'REPAIR_PREREQUISITE':'REPAIR_READY','/issues/'+selected.index)};
}
/** Deterministic offline proposal only. No client, writer, mutable state or execution authority. */
export function previewSnapshot(configInput,snapshotInput,options={}){
 const out=previewBase();try{
  checkValue(options);if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['expectedSite','expectedSnapshotDigest'].includes(k))||options.expectedSite!==undefined&&!httpsURL(options.expectedSite,true)||options.expectedSnapshotDigest!==undefined&&!/^sha256:[0-9a-f]{64}$/.test(options.expectedSnapshotDigest))throw Error();
  const config=parseConfig(configInput,options.expectedSite===undefined?{}:{expectedSite:options.expectedSite});out.destination_authority=config.destination_authority;
  if(!config.valid){out.scope_diagnostics=config.diagnostics.map(d=>({...d,scope:null}));return out;}
  const snapshot=parseSnapshot(snapshotInput,config.resolved_scope),model=normalizeSnapshot(snapshot,config.resolved_scope);
  out.valid=true;out.configuration_digest=config.configuration_digest;out.snapshot_digest=digest({configuration_digest:config.configuration_digest,snapshot});
  if(options.expectedSnapshotDigest!==undefined&&options.expectedSnapshotDigest!==out.snapshot_digest)model.mark('CHANGED_INPUT');
  for(const s of [...model.streams.values()].sort((a,b)=>JSON.stringify(Object.values(a.scope)).localeCompare(JSON.stringify(Object.values(b.scope))))){
   const a=availability(model,s),candidates=[];
   for(const id of s.orders.get(s.owner?.issue.id)??[]){const i=model.byId.get(id);if(!i||i.project_id!==s.scope.project_id||![s.project.types.story,s.project.types.bug].includes(i.type_id))continue;
    const reasons=[];let eligible=false;const st=model.stage(i),w=model.work(i);
    if(st==='Ready to Work'){
     if(!w.valid)reasons.push(...w.diagnosticPaths.map(path=>reason('INVALID_WORK','/issues/'+i.index+path)));
     else if((w.value.prerequisites??[]).some(r=>!model.proofs.has(model.byKey.get(r.ticket)?.id)))reasons.push(reason('PREREQUISITE_UNSATISFIED','/issues/'+i.index));
     else eligible=true;
    }
    candidates.push({ticket_id:i.id,key:i.key,kind:i.type_id===s.project.types.bug?'bug':'story',eligible,reasons});
   }
   const own=ownRepairSelection(model,s,a);if(own)for(const c of candidates)if(own.eligible.has(c.ticket_id))c.eligible=true;
   const chosen=own?candidates.find(c=>c.ticket_id===own.selected.id):a.decision===null?(candidates.find(c=>c.eligible&&c.kind==='bug')??candidates.find(c=>c.eligible)):null;
   if(a.decision===null&&!chosen)a.reasons.push(...candidates.flatMap(c=>c.reasons),reason('NO_READY_CANDIDATE'));
   out.streams.push({scope:s.scope,epic_id:s.owner?.issue.id??null,decision:own?'select':a.decision??(chosen?'select':'wait'),selected_ticket_id:chosen?.ticket_id??null,selected_key:chosen?.key??null,occupied_ids:a.occupied_ids,blocked_ids:a.blocked_ids,human_review_ids:a.human_review_ids,counts_complete:a.counts_complete,return_count:a.return_count,reasons:sortReasons(own?[...a.reasons.filter(r=>r.code!=='REPAIR_POLICY_PENDING'),own.reason]:a.reasons),candidates});
  }
  out.scope_diagnostics=model.diagnostics.sort((a,b)=>JSON.stringify(a.scope).localeCompare(JSON.stringify(b.scope))||a.path.localeCompare(b.path)||a.code.localeCompare(b.code));
  const held=out.streams.some(s=>s.decision==='hold')||model.shared.length||model.projectHolds.size;out.status=held?(out.streams.some(s=>s.decision==='select')?'partial':'held'):'complete';
 }catch(e){out.valid=false;out.status='invalid';out.configuration_digest=null;out.snapshot_digest=null;out.streams=[];out.scope_diagnostics=[{...(e.diagnostic??reason('STRUCTURE')),scope:null}];}
 return out;
}
