import { parseConfig, httpsURL } from '../config/parse.mjs';
import { checkValue } from '../contracts/work.mjs';
import { parseSnapshot, normalizeSnapshot, digest, reason } from './snapshot.mjs';
import { availability } from './availability.mjs';
import { repairPolicy, ordinaryProposal } from './repair-policy.mjs';
export const previewBase=()=>({schema:'pigboard-manager-preview/v1',valid:false,status:'invalid',validation_scope:'supplied_snapshot',live_freshness:'not_evaluated',permission:'not_evaluated',destination_authority:'not_evaluated',execution_authorized:false,writes:0,configuration_digest:null,snapshot_digest:null,scope_diagnostics:[],streams:[]});
const sortReasons=rs=>[...new Map(rs.map(r=>[JSON.stringify(r),r])).values()].sort((a,b)=>a.path.localeCompare(b.path)||a.code.localeCompare(b.code));
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
   const repair=repairPolicy(model,s,a,candidates);a.reasons.push(...repair.reasons);
   const chosen=a.decision===null&&!repair.required?(candidates.find(c=>c.eligible&&c.kind==='bug')??candidates.find(c=>c.eligible)):null;
   if(a.decision===null&&!chosen&&!repair.required&&!repair.proposal)a.reasons.push(...candidates.flatMap(c=>c.reasons),reason('NO_READY_CANDIDATE'));
   out.streams.push({scope:s.scope,epic_id:s.owner?.issue.id??null,decision:repair.decision??a.decision??(chosen?'select':'wait'),selected_ticket_id:repair.proposal?.ticket_id??chosen?.ticket_id??null,selected_key:repair.proposal?model.byId.get(repair.proposal.ticket_id).key:chosen?.key??null,proposal:repair.proposal??(chosen?ordinaryProposal(s,model.byId.get(chosen.ticket_id)):null),repair_order:repair.repair_order,occupied_ids:a.occupied_ids,blocked_ids:a.blocked_ids,human_review_ids:a.human_review_ids,counts_complete:a.counts_complete,return_count:a.return_count,reasons:sortReasons(a.reasons),candidates});
  }
  out.scope_diagnostics=model.diagnostics.sort((a,b)=>JSON.stringify(a.scope).localeCompare(JSON.stringify(b.scope))||a.path.localeCompare(b.path)||a.code.localeCompare(b.code));
  const held=out.streams.some(s=>s.decision==='hold')||model.shared.length||model.projectHolds.size;out.status=held?(out.streams.some(s=>['select','queue'].includes(s.decision))?'partial':'held'):'complete';
 }catch(e){out.valid=false;out.status='invalid';out.configuration_digest=null;out.snapshot_digest=null;out.streams=[];out.scope_diagnostics=[{...(e.diagnostic??reason('STRUCTURE')),scope:null}];}
 return out;
}
