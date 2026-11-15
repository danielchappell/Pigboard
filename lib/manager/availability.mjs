import { equal, reason } from './snapshot.mjs';
/** Availability always examines the normalized whole member union, before candidates. */
export function availability(model,stream){
 const {snapshot,byId,stage,proofs}=model,s=stream,scope=s.scope;
 const members=[...s.members].map(id=>byId.get(id)).filter(Boolean);
 const occupied=members.filter(i=>['In Progress','In Review','QA'].includes(stage(i))).map(i=>i.id).sort();
 const blocked=members.filter(i=>stage(i)==='Blocked').map(i=>i.id).sort();
 const human=members.filter(i=>stage(i)==='Human Review').map(i=>i.id).sort();
 const holds=[...model.shared,...(model.projectHolds.get(scope.project_id)??[]),...s.holds];
 const countsComplete=!holds.some(d=>['INCOMPLETE_SNAPSHOT','INCOMPLETE_PROJECT','MISSING_KNOWN_ID','UNKNOWN_STATUS','SCOPE'].includes(d.code))&&snapshot.stream_checks.some(c=>c.project_id===scope.project_id&&c.label===scope.label&&c.known_ids_complete);
 const reasons=holds.map(({code,path})=>reason(code,path));let repair=false;
 for(const i of members){const obligations=snapshot.required_repairs.filter(r=>r.ticket_id===i.id&&r.project_id===scope.project_id&&r.label===scope.label);const covered=obligations.every(r=>r.references.every(ref=>i.required_requests.some(outer=>equal(ref,outer))));
  if(i.required_requests.length||obligations.length){if(covered&&proofs.has(i.id))reasons.push(reason('REPAIR_ACCOUNTED_FOR','/issues/'+i.index));else repair=true;}
  if(stage(i)==='Rework Queued')repair=true;
 }
 if(occupied.length>1){reasons.push(reason('INCONSISTENT_OCCUPANCY'));holds.push(reason('INCONSISTENT_OCCUPANCY'));}
 if(blocked.length){reasons.push(reason('BLOCKED'));holds.push(reason('BLOCKED'));}
 if(!s.owner)reasons.push(reason('NO_OPT_IN'));else if(!s.owner.active)reasons.push(reason('EPIC_PAUSED'));
 if(occupied.length)reasons.push(reason('OCCUPIED'));
 if(repair)reasons.push(reason('REPAIR_POLICY_PENDING'));
 if(human.length>=5)reasons.push(reason('HUMAN_REVIEW_CAP'));
 return {decision:holds.length?'hold':!s.owner||!s.owner.active||occupied.length||repair||human.length>=5?'wait':null,reasons,occupied_ids:occupied,blocked_ids:blocked,human_review_ids:human,counts_complete:countsComplete,return_count:countsComplete?human.length+1:null};
}
