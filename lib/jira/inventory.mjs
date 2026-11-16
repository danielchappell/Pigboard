import { isDeepStrictEqual } from 'node:util';
import { parseContract, checkValue, extractADF, validateValue } from '../contracts/work.mjs';
import { CONFIG_LIMITS } from '../config/parse.mjs';
import { resolveProjects, validLabel } from '../config/projects.mjs';
import { extractHandoffCandidate, recordSchema } from '../contracts/handoff.mjs';
import { createJiraReadSession, createJiraIssueAcquirer, issueValue, diagnostic } from './read.mjs';

const id=v=>typeof v==='string'&&/^[0-9]{1,255}$/.test(v);
const identity=v=>id(v)||(typeof v==='string'&&/^[A-Z][A-Z0-9_]{0,254}-[0-9]{1,255}$/.test(v));
const closed=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const reference=v=>closed(v,['ticket_id','comment_id','record_id','digest'])&&id(v.ticket_id)&&id(v.comment_id)&&typeof v.record_id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.record_id)&&/^sha256:[0-9a-f]{64}$/.test(v.digest);
const fault=(code,bound=null)=>Object.assign(new Error(code),{code,bound});
const tuple=(project_id,label)=>JSON.stringify([project_id,label]);
const sameIssue=(a,b)=>isDeepStrictEqual({...a,pointer:null},{...b,pointer:null});
const configuredLabel=(project,label)=>validLabel(label)&&project.worker_prefixes.some(prefix=>label.startsWith(prefix)&&/^[0-9]+$/.test(label.slice(prefix.length)));

// Traverse only schema-declared reference locations. Conditional schemas apply
// only to their actual record kind, and arbitrary provider objects are not edges.
function typedReferences(value){
 const found=new Map();
 function visit(v,s){
  if(!s||typeof s!=='object'||v===null||v===undefined)return;
  if(s.$ref){if(s.$ref==='#/$defs/reference'){found.set(JSON.stringify(v),v);return;}visit(v,recordSchema.$defs[s.$ref.split('/').at(-1)]);return;}
  if(s.if?.properties?.kind?.const&&s.if.properties.kind.const!==value.kind)return;
  for(const branch of ['anyOf','oneOf','allOf'])for(const child of s[branch]??[])visit(v,child);
  if(s.then)visit(v,s.then);
  if(Array.isArray(v)){for(const x of v)visit(x,s.items);}
  else if(typeof v==='object')for(const [k,child]of Object.entries(s.properties??{}))visit(v[k],child);
 }
 visit(value,recordSchema);return [...found.values()];
}

export async function inspectJiraInventory(configInput,supplied,dependencies){
 let input,inputError=false;
 try{
  checkValue(supplied,CONFIG_LIMITS);if(Buffer.byteLength(JSON.stringify(supplied))>CONFIG_LIMITS.bytes||!closed(supplied,['retained_members','pending_intents','retained_complete'])||typeof supplied.retained_complete!=='boolean'||!Array.isArray(supplied.retained_members)||!Array.isArray(supplied.pending_intents))throw Error();
  for(const v of supplied.retained_members)if(!closed(v,['ticket_id','project_id','epic_id','label','assignment'])||!id(v.ticket_id)||!id(v.project_id)||!id(v.epic_id)||!validLabel(v.label)||(v.assignment!==null&&!reference(v.assignment)))throw Error();
  for(const v of supplied.pending_intents)if(!closed(v,['project_id','label','ticket_id','attempt_id'])||!id(v.project_id)||!id(v.ticket_id)||!validLabel(v.label)||typeof v.attempt_id!=='string'||v.attempt_id.length>255||!v.attempt_id.length)throw Error();
  for(const list of [supplied.retained_members,supplied.pending_intents])if(new Set(list.map(v=>JSON.stringify([v.project_id,v.label,v.ticket_id]))).size!==list.length)throw Error();
  input=structuredClone(supplied);
 }catch{inputError=true;}
 // Invalid supplied state must never invoke a resolver or send a request.
 const s=await createJiraReadSession(configInput,dependencies),{report,observations}=s;
 report.schema='pigboard-jira-inventory/v1';report.inspection_scope='configured_inventory';
 if(inputError){report.status='invalid';diagnostic(report,fault('INPUT_INVALID'));return s.finish();}
 report.retained_complete=input.retained_complete;
 if(!s.ready)return s.finish();
 const projects=resolveProjects(parseContract(configInput,CONFIG_LIMITS)).projects,projectMap=new Map(projects.map(p=>[p.id,p]));
 const scopes=new Map(),queue=new Map(),aliases=new Map(),done=new Map(),expectations=new Map(),queries=new Set(),epics=new Set(),edges=[],targets=new Map(),records=new Map(),processedTargets=new Set(),exactMatches=new Set(),attempted=new Set(),declaredMembers=new Map(),issueScopes=new Map(),reservations=new Set(),rootEvidence=new Map(),expandedRoots=new Set(),workByIssue=new Map();
 const acquirer=createJiraIssueAcquirer(s,{inventory:true});
 const grantRoot=(project_id,issue_id)=>rootEvidence.set(JSON.stringify([project_id,issue_id]),{project_id,issue_id});
 const addScope=(p,l)=>{
  const k=tuple(p,l);
  if(!scopes.has(k)){
   s.reserve('streams','max_streams');const project=projectMap.get(p),supported=project&&configuredLabel(project,l);
   scopes.set(k,{project_id:p,label:l,complete:!!supported,old_issue_ids:[],current_issue_ids:[]});
   if(!supported)diagnostic(report,fault('SCOPE_UNKNOWN'));
  }
  return k;
 };
 const depend=(name,k)=>{if(!k)return;if(!issueScopes.has(name))issueScopes.set(name,new Set());issueScopes.get(name).add(k);};
 const enqueue=(name,source,source_ticket_id=null,k=null)=>{
  if(!identity(name))throw fault('WORK_INVALID');
  const canonical=aliases.get(name)??name;depend(canonical,k);
  // Failed and unresolved obligations retain their admission slot after dequeue.
  if(!reservations.has(canonical)){
   if(reservations.size>=report.limits.max_known_issues)throw fault('LIMIT_REACHED','max_known_issues');
   reservations.add(canonical);
  }
  if(!queue.has(canonical)&&!done.has(canonical)&&!aliases.has(canonical)&&!attempted.has(canonical))queue.set(canonical,{source,source_ticket_id,k});
  s.retain('provenance',{ticket_id:name,source,source_ticket_id,project_id:k?JSON.parse(k)[0]:null,label:k?JSON.parse(k)[1]:null});
 };
 const addTarget=(r,source_ticket_id,source_comment_id=null,k=null)=>{
  if(!reference(r))throw fault('REFERENCE_INVALID');
  const key=JSON.stringify(r),logical=JSON.stringify([r.ticket_id,r.comment_id]);
  const previous=targets.get(logical);
  if(previous&&JSON.stringify(previous.r)!==key)throw fault('REFERENCE_INVALID');
  if(!previous){if(targets.size>=report.limits.max_comments)throw fault('LIMIT_REACHED','max_comments');targets.set(logical,{r,k});}
  s.retain('references',{...r,source_ticket_id,source_comment_id});
  if(source_ticket_id)edges.push([source_ticket_id,r.ticket_id]);
  enqueue(r.ticket_id,'typed_reference',source_ticket_id,k);
 };
 const fail=(e,operation=null,issue_id=null)=>diagnostic(report,e,operation,issue_id);
 async function search(p,kind,arg=null){
  const qid=JSON.stringify([p.id,kind,arg]);if(queries.has(qid))return;queries.add(qid);
  const predicate=kind==='opt_in'?`labels = ${JSON.stringify(p.opt_in_label)}`:kind==='children'?`parent = ${JSON.stringify(arg)}`:`labels = ${JSON.stringify(arg)}`;
  const jql=`project = ${JSON.stringify(p.id)} AND ${predicate} ORDER BY id ASC`;
  let token=null;const tokens=new Set(),seen=new Set();
  while(true){
   const page=await s.search(jql,token);s.checkTime();
   if(!page||!Array.isArray(page.issues)||page.issues.length>report.limits.page_size||typeof page.isLast!=='boolean')throw fault('PAGE_INCOMPLETE');
   if(page.isLast&&page.nextPageToken!==undefined&&page.nextPageToken!==null)throw fault('PAGE_INCOMPLETE');
   for(const raw of page.issues){
    if(!id(raw?.id))throw fault('RESPONSE_INVALID');const v=issueValue(raw,raw.id);
    if(seen.has(v.id))throw fault('CHANGED_INPUT');seen.add(v.id);
    if(v.project_id!==p.id||(kind==='children'?v.parent_id!==arg:!v.labels.includes(kind==='opt_in'?p.opt_in_label:arg)))throw fault('CHANGED_INPUT');
    if(expectations.has(v.id)&&!isDeepStrictEqual(expectations.get(v.id),v)){if(kind==='full_label'){depend(v.id,addScope(p.id,arg));fail(fault('CHANGED_INPUT'),'issue',v.id);}else throw fault('CHANGED_INPUT');}else expectations.set(v.id,v);
    const k=kind==='full_label'?addScope(p.id,arg):null;
    if(k){const row=scopes.get(k);if(!row.current_issue_ids.includes(v.id))row.current_issue_ids.push(v.id);}
    if((kind==='opt_in'||kind==='full_label')&&v.type_id===p.types.epic)grantRoot(p.id,v.id);
    enqueue(v.id,kind==='opt_in'?'seed':kind==='children'?'child':'label',kind==='children'?arg:null,k);
    if(kind==='opt_in'){if(v.type_id!==p.types.epic)throw fault('WORK_INVALID');seedIds.add(v.id);}
    if(done.has(v.id)&&!sameIssue(done.get(v.id).issue,v)){if(kind==='full_label')fail(fault('CHANGED_INPUT'),'issue',v.id);else throw fault('CHANGED_INPUT');}
   }
   if(page.isLast)break;
   if(typeof page.nextPageToken!=='string'||!page.nextPageToken.length||Buffer.byteLength(page.nextPageToken)>report.limits.max_response_bytes||tokens.has(page.nextPageToken)||!page.issues.length)throw fault('PAGE_INCOMPLETE');
   tokens.add(page.nextPageToken);token=page.nextPageToken;
  }
 }
 // Only independently granted, freshly validated Epics enumerate breadth.
 // Pending evidence is separate from acquisition order and processed expansion.
 const expandRoots=async()=>{
  let progressed=false;
  const ordered=[...rootEvidence.keys()].sort();s.checkTime();
  for(const key of ordered){
   s.checkTime();if(expandedRoots.has(key))continue;
   const root=rootEvidence.get(key),acquired=done.get(aliases.get(root.issue_id)??root.issue_id);
   if(!acquired?.issue)continue;const issue=acquired.issue,p=projectMap.get(root.project_id);
   if(issue.project_id!==root.project_id){expandedRoots.add(key);fail(fault('SCOPE_UNKNOWN'),'issue',issue.id);continue;}
   if(!p||issue.type_id!==p.types.epic){expandedRoots.add(key);continue;}
   if(!epics.has(issue.id)){s.reserve('epics','max_epics');epics.add(issue.id);}
   expandedRoots.add(key);progressed=true;
   await search(p,'children',issue.id);
   const work=workByIssue.get(issue.id);
   if(work?.schema==='pigboard-epic/v1')for(const stream of work.workstreams??[]){
    s.checkTime();
    if(!stream||!configuredLabel(p,stream.label)||!Array.isArray(stream.story_order)){fail(fault('WORK_INVALID'),'work',issue.id);continue;}
    const k=addScope(p.id,stream.label);depend(issue.id,k);
    for(const member of stream.story_order){
     s.checkTime();enqueue(member,'declared',issue.id,k);
     if(!declaredMembers.has(k))declaredMembers.set(k,new Set());declaredMembers.get(k).add(member);edges.push([issue.id,member]);
    }
   }
  }
  return progressed;
 };
 const seedIds=new Set();
 try{
  if(!input.retained_complete)fail(fault('RETAINED_INCOMPLETE'));
  for(const member of input.retained_members){const k=addScope(member.project_id,member.label);scopes.get(k).old_issue_ids.push(member.ticket_id);if(projectMap.has(member.project_id)){enqueue(member.ticket_id,'retained',null,k);enqueue(member.epic_id,'retained',member.ticket_id,k);if(configuredLabel(projectMap.get(member.project_id),member.label))grantRoot(member.project_id,member.epic_id);if(member.assignment)addTarget(member.assignment,member.ticket_id,null,k);}}
  for(const intent of input.pending_intents){const k=addScope(intent.project_id,intent.label);if(projectMap.has(intent.project_id))enqueue(intent.ticket_id,'intent',null,k);}
  await s.resolve();
  for(const p of projects)await search(p,'opt_in');
  while(true){
   while(queue.size){
    s.checkTime();const name=[...queue.keys()].sort()[0],source=queue.get(name);queue.delete(name);
    if(aliases.has(name)||done.has(name)||attempted.has(name))continue;attempted.add(name);
    let raw,issue;
    try{raw=await s.issue(name);if(!id(raw?.id))throw fault('RESPONSE_INVALID');issue=issueValue(raw,raw.id);if((id(name)&&issue.id!==name)||[name,issue.key].some(proven=>aliases.has(proven)&&aliases.get(proven)!==issue.id))throw fault('CHANGED_INPUT');}
    catch(e){fail(e,'issue',id(name)?name:null);if(e.code==='LIMIT_REACHED')throw e;continue;}
    // A validated fresh observation proves only these names equivalent.
    for(const proven of [name,issue.key,issue.id])reservations.delete(proven);
    reservations.add(issue.id);
    aliases.set(name,issue.id);aliases.set(issue.key,issue.id);aliases.set(issue.id,issue.id);
    if(issueScopes.has(name))for(const k of issueScopes.get(name))depend(issue.id,k);
    if(!projectMap.has(issue.project_id)){fail(fault('SCOPE_UNKNOWN'),'issue',issue.id);continue;}
    if(done.has(issue.id)){if(!sameIssue(done.get(issue.id).issue,issue))fail(fault('CHANGED_INPUT'),'issue',issue.id);continue;}
    const expectation=expectations.get(issue.id);if(expectation&&!sameIssue(expectation,issue))fail(fault('CHANGED_INPUT'),'issue',issue.id);
    const acquired=await acquirer.acquire(issue.id,{ticket_id:issue.id,source:source.source,source_ticket_id:source.source_ticket_id,project_id:issue.project_id,label:source.k?JSON.parse(source.k)[1]:null},raw);done.set(issue.id,acquired);
    if(!acquired.issue)continue;issue=acquired.issue;
    const p=projectMap.get(issue.project_id);
    for(const l of issue.labels)if(configuredLabel(p,l)){const k=addScope(p.id,l);depend(issue.id,k);const row=scopes.get(k);if(!row.current_issue_ids.includes(issue.id))row.current_issue_ids.push(issue.id);}
    if(issue.parent_id){edges.push([issue.id,issue.parent_id]);enqueue(issue.parent_id,'prerequisite',issue.id);}
    let work=null;
    if(issue.body!==null){try{work=extractADF(issue.body).value;if(!validateValue(work,{mode:'draft'}).valid)throw Error();}catch{if(seedIds.has(issue.id)||issue.body.includes('pigboard-epic/')||issue.body.includes('pigboard-ticket/'))fail(fault('WORK_INVALID'),'work',issue.id);}}
    if(seedIds.has(issue.id)&&work?.schema!=='pigboard-epic/v1')fail(fault('WORK_INVALID'),'work',issue.id);
    workByIssue.set(issue.id,work);await expandRoots();
    if(work?.schema==='pigboard-ticket/v1')for(const prerequisite of work.prerequisites??[]){if(!prerequisite||!identity(prerequisite.ticket)){fail(fault('WORK_INVALID'),'work',issue.id);continue;}enqueue(prerequisite.ticket,'prerequisite',issue.id);edges.push([issue.id,prerequisite.ticket]);}
    if(issue.pointer.state==='present')addTarget(issue.pointer.value.assignment,issue.id);
    for(const page of observations.comment_pages.filter(v=>v.ticket_id===issue.id))for(const comment of page.comments){s.checkTime();try{const candidate=extractHandoffCandidate(comment.body);s.checkTime();if(candidate){if(candidate.value.ticket_id!==issue.id)throw fault('REFERENCE_INVALID');records.set(JSON.stringify([issue.id,comment.id]),candidate);for(const r of typedReferences(candidate.value))addTarget(r,issue.id,comment.id);}}catch(e){if(e.code==='LIMIT_REACHED')throw e;fail(fault('REFERENCE_INVALID'),'record',issue.id);}}
   }
   let searched=false;for(const row of [...scopes.values()].sort((a,b)=>tuple(a.project_id,a.label).localeCompare(tuple(b.project_id,b.label)))){const p=projectMap.get(row.project_id);if(p&&configuredLabel(p,row.label)&&!queries.has(JSON.stringify([p.id,'full_label',row.label]))){await search(p,'full_label',row.label);searched=true;}}
   const expanded=await expandRoots();
   if(queue.size)continue;
   for(const [logical,target]of targets){if(processedTargets.has(logical))continue;processedTargets.add(logical);const {r}=target;const acquired=done.get(r.ticket_id);if(!acquired?.issue){fail(fault('REFERENCE_INVALID'),'reference',r.ticket_id);continue;}acquired.row.exact_comments_read='incomplete';const candidate=records.get(logical);if(candidate&&(candidate.value.record_id!==r.record_id||candidate.record_digest!==r.digest)){fail(fault('REFERENCE_INVALID'),'reference',r.ticket_id);continue;}const exact=await acquirer.exact(r.ticket_id,r.comment_id);if(!exact)continue;try{const c=extractHandoffCandidate(exact.body);s.checkTime();if(!c||c.value.ticket_id!==r.ticket_id||c.value.record_id!==r.record_id||c.record_digest!==r.digest)throw Error();exactMatches.add(logical);}catch{fail(fault('REFERENCE_INVALID'),'reference',r.ticket_id);}}
   if(!searched&&!expanded&&!queue.size)break;
  }
 }catch(e){fail(e);if(e.code==='SETUP_MISSING')report.status='setup_failed';}
 // Propagate acquired dependencies, including aliases, before assigning reach.
 // Essential reporting can still materialize positive facts after a global stop;
 // it never resumes dependency propagation or provider acquisition.
 const materializeKnownScopes=(check=()=>{})=>{
  for(const [k,members]of declaredMembers)for(const name of members){
   check();const resolved=aliases.get(name),row=scopes.get(k);
   if(resolved&&!row.current_issue_ids.includes(resolved))row.current_issue_ids.push(resolved);
  }
  for(const row of scopes.values()){
   check();row.old_issue_ids=[...new Set(row.old_issue_ids)].sort();check();
   row.current_issue_ids=[...new Set(row.current_issue_ids)].sort();check();
  }
  report.scopes=[...scopes.values()].sort((a,b)=>a.project_id.localeCompare(b.project_id)||a.label.localeCompare(b.label));check();
 };
 let shared=false;
 try{
  s.checkTime();
  let changed=true;
  while(changed){
   s.checkTime();changed=false;
   for(const [from,to]of edges){
    s.checkTime();const a=aliases.get(from)??from,b=aliases.get(to)??to;
    for(const k of issueScopes.get(a)??[]){
     s.checkTime();const set=issueScopes.get(b)??new Set();
     if(!set.has(k)){set.add(k);issueScopes.set(b,set);changed=true;}
    }
   }
  }
  for(const [name,sc]of issueScopes){
   s.checkTime();const resolved=aliases.get(name);
   if(resolved&&resolved!==name)for(const k of sc){s.checkTime();depend(resolved,k);}
  }
  for(const [issueId,acquired]of done){
   s.checkTime();let required=false,complete=true;
   for(const [logical,target]of targets){
    s.checkTime();if(target.r.ticket_id===issueId){required=true;if(!exactMatches.has(logical))complete=false;}
   }
   if(required)acquired.row.exact_comments_read=complete?'complete':'incomplete';
  }
  for(const row of scopes.values())for(const [issueId,acquired]of done){
   s.checkTime();if(!acquired.issue)continue;const w=acquired.issue;
   if(w.project_id===row.project_id&&w.labels.includes(row.label)&&!row.current_issue_ids.includes(issueId))row.current_issue_ids.push(issueId);
  }
  materializeKnownScopes(s.checkTime);
  // Keep originals intact until the entire reach expansion and decision finish.
  const expanded=[];
  for(const d of report.diagnostics){
   s.checkTime();const affected=d.issue_id?issueScopes.get(d.issue_id):null;
   const isolated=affected?.size&&['issue','pointer','comments','comment','record','reference','work'].includes(d.operation)&&!['LIMIT_REACHED','SCOPE_UNKNOWN'].includes(d.code);
   if(isolated){
    const ordered=[...affected].sort();s.checkTime();
    for(const k of ordered){
     s.checkTime();const row=scopes.get(k);
     if(row){row.complete=false;expanded.push({...d,scope:{project_id:row.project_id,label:row.label}});}
    }
   }else{shared=true;expanded.push(d);}
  }
  let domainComplete=input.retained_complete&&!expanded.length;
  for(const row of report.scopes){
   s.checkTime();if(shared)row.complete=false;if(!row.complete)domainComplete=false;
  }
  s.checkTime();
  report.diagnostics=expanded;report.domain_complete=domainComplete;
  report.status=domainComplete?'complete':report.status==='setup_failed'?'setup_failed':'incomplete';
 }catch(error){
  shared=true;
  if(!report.diagnostics.some(d=>d.code===error.code&&d.bound===error.bound&&d.operation===null&&d.issue_id===null&&d.scope===null))fail(error);
  // An interrupted aggregation cannot claim all exact targets were checked.
  for(const target of targets.values()){
   const acquired=done.get(target.r.ticket_id);if(acquired)acquired.row.exact_comments_read='incomplete';
  }
  materializeKnownScopes();
  for(const row of report.scopes)row.complete=false;
  report.domain_complete=false;report.status='incomplete';
 }
 // This is the only session operation after the checked completion decision.
 const result=s.finish();
 if(report.cleanup.resolver!=='settled'){
  for(const row of report.scopes)row.complete=false;
  report.domain_complete=false;report.status='incomplete';
 }
 return result;
}
