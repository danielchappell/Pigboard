import { checkCaseGraph, equal, indexIds, pointer, unique } from './case-graph.mjs';
const SUPPORTED=new Set(['qa-api','qa-bruno','qa-database','qa-ui']);

// A complete, deterministic sizing projection; never returned as evidence.
export function sizeLedger(work,expanded=work.testing_strategy.cases.flatMap(c=>c.steps)) {
  const t=work.testing_strategy,uuid='00000000-0000-4000-8000-000000000000',digest='sha256:'+'0'.repeat(64);
  const reference={ticket_id:'0',comment_id:'0',record_id:uuid,digest};
  const projection={schema:'pigboard-handoff/v1',record_id:uuid,operation_id:uuid,ticket_id:'0',requirements_digest:digest,assignment:reference,role:'qa',kind:'qa',from_stage:'QA',to_stage:'Human Review',payload:{review:reference,pr:{provider:'github',repository:work.technical_acceptance_criteria.repository.url,number:'0',source_revision:'0'.repeat(40),target_branch:'a'},report:{steps:expanded.map(s=>({id:s.id,skill:s.skill,result:'PASS',evidence:s.evidence.map((_,i)=>({label:'e'+(i+1),uri:'https://e.invalid/'+(i+1),digest:null})),finding_ids:[],not_run_reason:null,reused_from:null})),human_pending:t.human_review.cases.map(c=>c.id),no_ai_cases_reason:t.human_review.no_ai_cases_reason}},resume_authorization:null};
  const diagnostics=[],add=(code,path,message)=>diagnostics.push({code,path,message});
  const scan=(v,path='',depth=0)=>{if(v&&typeof v==='object'){if(depth+1>16)add('LEDGER_DEPTH',path,'The complete ledger exceeds 16 nested containers.');if(Array.isArray(v)&&v.length>100)add('LEDGER_LIST',path,'The complete ledger exceeds 100 entries in this list; rescope without omitting entries.');Object.entries(v).forEach(([k,x])=>scan(x,path+'/'+pointer(k),depth+1));}};scan(projection);
  work.testing_strategy.cases.forEach((c,i)=>c.steps.forEach((s,j)=>{if([...s.id].length>255)add('LEDGER_FIELD','/testing_strategy/cases/'+i+'/steps/'+j+'/id','Use step IDs of at most 255 characters.');}));
  t.human_review.cases.forEach((h,i)=>{if([...h.id].length>255)add('LEDGER_FIELD','/testing_strategy/human_review/cases/'+i+'/id','Use human case IDs of at most 255 characters.');});
  if(t.human_review.no_ai_cases_reason!==null&&[...t.human_review.no_ai_cases_reason].length>2000)add('LEDGER_FIELD','/testing_strategy/human_review/no_ai_cases_reason','Use a reason of at most 2000 characters.');
  const projection_bytes=Buffer.byteLength(JSON.stringify(projection)+'\n','utf8');
  if(projection_bytes>16384)add('LEDGER_BYTES','/testing_strategy','The complete ledger projection exceeds 16384 UTF-8 bytes; rescope without omitting cases or evidence.');
  return {ledger_budget:{encoding:'json-yaml-1.2',projection_bytes,limit_bytes:16384,ai_steps:expanded.length,human_cases:t.human_review.cases.length,omitted_entries:0,actual_publication:'not_evaluated'},diagnostics};
}

export function validateSemantics(work,context,installedSkills) {
  const diagnostics=[],add=(code,path,message)=>diagnostics.push({code,path,message});
  // Values in named inputs and SQL parameters are deliberately opaque data.
  const content=(v,path='')=>{if(typeof v==='string'){if(!v.trim())add('BLANK_CONTENT',path,'Supply nonblank content without deferring scope or expectations.');}else if(v&&typeof v==='object'){for(const[k,x]of Object.entries(v)){if(k==='inputs'){for(const name of Object.keys(x))if(!name.trim())add('BLANK_CONTENT',path+'/inputs/'+pointer(name),'Supply a nonblank input name.');continue;}if(k==='parameters')continue;content(x,path+'/'+pointer(k));}}};content(work);content(context,'/context');
  for(const key of ['allowed_skills','configured_targets','references'])unique(context[key],'/context/'+key,add);
  context.allowed_skills.forEach((skill,i)=>{if(!SUPPORTED.has(skill)||!installedSkills.includes(skill))add('TRUSTED_SCOPE','/context/allowed_skills/'+i,'Allow only supported QA skills present in the installed manifest.');});
  const nodes=new Map();context.prerequisite_graph.forEach((n,i)=>{const path='/context/prerequisite_graph/'+i;if(nodes.has(n.ticket))add('DUPLICATE_ID',path+'/ticket','Declare each graph ticket once.');else nodes.set(n.ticket,{...n,path});unique(n.prerequisites,path+'/prerequisites',add);});
  if(!nodes.has(context.subject_key))add('CONTEXT_GRAPH','/context/prerequisite_graph','Include the subject ticket in the supplied graph.');
  if(work.schema==='pigboard-ticket/v1'){
    unique(work.prerequisites.map(x=>x.ticket),'/prerequisites',add);
    const actual=work.prerequisites.map(x=>x.ticket),subject=nodes.get(context.subject_key);
    if(subject&&!equal([...subject.prerequisites].sort(),[...actual].sort()))add('CONTEXT_GRAPH',subject.path+'/prerequisites','Match the subject graph entry to the work prerequisites.');
    if(subject)nodes.set(context.subject_key,{...subject,prerequisites:actual});
  }
  const visit=(id,active=new Set(),done=new Set())=>{if(active.has(id)){add('PREREQUISITE_CYCLE',nodes.get(id)?.path??'/context/prerequisite_graph','Remove self-links and cycles from reachable prerequisites.');return;}if(done.has(id))return;const n=nodes.get(id);if(!n){add('MISSING_REFERENCE','/context/prerequisite_graph','Supply every reachable prerequisite graph node.');return;}active.add(id);n.prerequisites.forEach(x=>visit(x,active,done));active.delete(id);done.add(id);};visit(context.subject_key);
  if(work.schema==='pigboard-epic/v1'){
    indexIds(work.accepted_decisions,'/accepted_decisions',add);unique(work.workstreams.map(s=>s.label),'/workstreams',add);const members=new Set();work.workstreams.forEach((s,i)=>s.story_order.forEach((id,j)=>{const path='/workstreams/'+i+'/story_order/'+j;if(members.has(id))add('DUPLICATE_REFERENCE',path,'A ticket belongs to one Epic stream position.');members.add(id);if(!nodes.has(id))add('MISSING_REFERENCE',path,'Include this ticket in the supplied graph inventory.');visit(id);}));
    if(context.operations.length)add('CONTEXT_OPERATION','/context/operations','An Epic has no AI operations.');return {diagnostics,ledger_budget:null};
  }
  const repository=work.technical_acceptance_criteria.repository;
  context.repositories.forEach((r,i)=>{unique(r.base_branches,'/context/repositories/'+i+'/base_branches',add);if(context.repositories.findIndex(x=>x.url===r.url)!==i)add('DUPLICATE_REFERENCE','/context/repositories/'+i+'/url','Declare each allowed repository once.');});
  if(!context.repositories.some(r=>r.url===repository.url&&r.base_branches.includes(repository.base_branch)))add('TRUSTED_SCOPE','/technical_acceptance_criteria/repository','Use an allowed exact repository and base branch.');
  repository.related_repositories.forEach((r,i)=>{if(!context.repositories.some(a=>a.url===r.url))add('TRUSTED_SCOPE','/technical_acceptance_criteria/repository/related_repositories/'+i+'/url','Use an allowed related repository.');});
  unique(repository.related_repositories.map(r=>r.url),'/technical_acceptance_criteria/repository/related_repositories',add);
  context.related_changes.forEach((r,i)=>{if(!repository.related_repositories.some(x=>x.url===r.repository&&x.change_story===r.change_story))add('TRUSTED_SCOPE','/technical_acceptance_criteria/repository/related_repositories','Declare the supplied related-repository change obligation and its separate change Story.');if(context.related_changes.findIndex(x=>x.repository===r.repository)!==i)add('DUPLICATE_REFERENCE','/context/related_changes/'+i,'Declare each related change once.');});
  indexIds(work.technical_acceptance_criteria.accepted_decisions,'/technical_acceptance_criteria/accepted_decisions',add);
  const t=work.testing_strategy,p='/testing_strategy',reference=(ref,path)=>{if(ref!==null&&!context.references.includes(ref))add('TRUSTED_SCOPE',path,'Use an exact prepared reference from the invocation context.');};
  if(t.environment.source==='configured_target'&&!context.configured_targets.includes(t.environment.target_reference))add('TRUSTED_SCOPE',p+'/environment/target_reference','Use an approved configured target reference.');
  t.actors.forEach((a,i)=>reference(a.identity_reference,p+'/actors/'+i+'/identity_reference'));t.fixtures.forEach((f,i)=>reference(f.reference,p+'/fixtures/'+i+'/reference'));
  const graph=checkCaseGraph(work,context,add),operations=new Map();
  context.operations.forEach((o,i)=>{const path='/context/operations/'+i;if(operations.has(o.step))add('DUPLICATE_ID',path+'/step','Supply exactly one operation fact per AI step.');else operations.set(o.step,{...o,path});if(!graph.steps.has(o.step))add('CONTEXT_OPERATION',path+'/step','Remove operation facts without a current AI step.');else if(!equal(graph.steps.get(o.step).value,o.contract))add('CONTEXT_OPERATION',path+'/contract','Refresh the reviewed operation fact to match the complete current step prescription.');});
  for(const [id,e]of graph.steps){const s=e.value,o=operations.get(id);if(!o)add('CONTEXT_OPERATION',e.path+'/id','Supply a matching reviewed operation fact for this AI step.');
    if(!SUPPORTED.has(s.skill)||!installedSkills.includes(s.skill)||!context.allowed_skills.includes(s.skill))add('TRUSTED_SCOPE',e.path+'/skill','Use a supported installed skill allowed by the invocation context.');
    reference(s.prepared_artifact.reference,e.path+'/prepared_artifact/reference');
    if(s.ui)reference(s.ui.viewport.reference,e.path+'/ui/viewport/reference');
    if(s.database){const db=s.database;reference(db.access_reference,e.path+'/database/access_reference');
      if(o&&!o.read_only)add('DATABASE_READ_ONLY',e.path+'/database','The database helper supports read-only observations only; supply a reviewed read-only operation.');
      if(o?.parameter_count===null)add('DATABASE_PARAMETERS',e.path+'/database/parameters','Supply the reviewed database parameter count.');
      const count=o?.parameter_count;if(count!==undefined&&count!==null){if(db.parameters!==null&&db.parameters.length!==count)add('DATABASE_PARAMETERS',e.path+'/database/parameters','Match the reviewed parameter count exactly.');const positions=new Set();db.parameter_bindings.forEach((b,i)=>{const path=e.path+'/database/parameter_bindings/'+i;if(!Object.hasOwn(s.inputs,b.input))add('DATABASE_PARAMETERS',path+'/input','Name an existing step input.');if(b.index>=count||positions.has(b.index))add('DATABASE_PARAMETERS',path+'/index','Use a unique zero-based index within the reviewed parameter count.');positions.add(b.index);if(db.parameters!==null&&db.parameters[b.index]!==null)add('DATABASE_PARAMETERS',path+'/index','Use a null placeholder at each bound parameter position.');});}
    }else if(o&&o.parameter_count!==null)add('CONTEXT_OPERATION',o.path+'/parameter_count','Use null for a non-database parameter count.');
  }
  t.cases.forEach((c,i)=>{if(c.observation.mode!=='asynchronous')return;const path=p+'/cases/'+i+'/observation',tops=c.steps.filter(s=>s.caller==='qa-entrypoint'),obs=c.observation;
    if(tops.length!==1||tops[0].id!==obs.step)add('OBSERVATION',path+'/step','Name the single top-level observation unit in this asynchronous case.');
    c.steps.forEach(s=>{const o=operations.get(s.id);if(o&&!o.read_only)add('OBSERVATION',graph.steps.get(s.id).path,'Every asynchronous participating operation must be reviewed read-only.');if(o?.max_duration_seconds===null)add('OBSERVATION',graph.steps.get(s.id).path,'Supply a reviewed observation duration bound.');});
    const parent=tops[0],bound=parent&&operations.get(parent.id)?.max_duration_seconds;
    if(parent?.skill==='qa-api'){const child=operations.get(parent.children[0]);if(child&&!(bound>=child.max_duration_seconds))add('OBSERVATION',path,'The API total duration bound must cover its Bruno child.');}
    if(parent?.skill==='qa-database'&&!(bound>=20))add('OBSERVATION',path,'Allow the database reader’s 20-second outer deadline.');
    obs.schedule.forEach((time,j)=>{if((j===0&&time!==0)||(j>0&&time<=obs.schedule[j-1]))add('OBSERVATION',path+'/schedule/'+j,'Start at zero and use strictly increasing observation times.');const available=Math.min(obs.deadline_seconds-time,j+1<obs.schedule.length?obs.schedule[j+1]-time:Infinity);if(!(bound>0&&bound<=available))add('OBSERVATION',path+'/schedule/'+j,'Fit the reviewed operation bound within the next gap and remaining deadline.');});
  });
  const sized=sizeLedger(work,graph.expanded);diagnostics.push(...sized.diagnostics);return {diagnostics,ledger_budget:sized.ledger_budget};
}
