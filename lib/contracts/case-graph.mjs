// Pure checks of an already structurally validated ticket. No execution or I/O.
export const pointer = key => String(key).replace(/~/g,'~0').replace(/\//g,'~1');
export const equal = (a,b) => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a)!==Array.isArray(b)) return false;
  const keys=Object.keys(a); return keys.length===Object.keys(b).length && keys.every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));
};
export function indexIds(entries,path,add,shared=new Map()) {
  entries.forEach((v,i)=>{const p=path+'/'+i+'/id';if(shared.has(v.id))add('DUPLICATE_ID',p,'Use a unique identifier in this namespace.');else shared.set(v.id,{value:v,path:path+'/'+i});});return shared;
}
export function unique(values,path,add) { const seen=new Set();values.forEach((v,i)=>{if(seen.has(v))add('DUPLICATE_REFERENCE',path+'/'+i,'Declare each reference once.');seen.add(v);}); }
export function checkCaseGraph(work,context,add) {
  const t=work.testing_strategy,p='/testing_strategy', humans=t.human_review.cases;
  const requirements=indexIds(work.acceptance_criteria,'/acceptance_criteria',add);
  indexIds(work.technical_acceptance_criteria.constraints,'/technical_acceptance_criteria/constraints',add,requirements);
  const cases=indexIds(t.cases,p+'/cases',add);indexIds(humans,p+'/human_review/cases',add,cases);
  const actors=indexIds(t.actors,p+'/actors',add),fixtures=indexIds(t.fixtures,p+'/fixtures',add),preparation=indexIds(t.preparation,p+'/preparation',add);
  const steps=new Map(),caseSteps=new Map(),covered=new Set();
  t.cases.forEach((c,i)=>{const path=p+'/cases/'+i; indexIds(c.steps,path+'/steps',add,steps);caseSteps.set(c.id,c.steps);});
  for(const [id,e]of steps)if(cases.has(id))add('DUPLICATE_ID',e.path+'/id','Step and case identifiers must not collide.');
  const reference=(map,id,path,message='Reference an existing declaration.')=>{if(!map.has(id))add('MISSING_REFERENCE',path,message);};
  for(const [id,e]of cases){unique(e.value.requirements,e.path+'/requirements',add);e.value.requirements.forEach((r,i)=>{reference(requirements,r,e.path+'/requirements/'+i);covered.add(r);});}
  for(const [id,e]of requirements)if(!covered.has(id))add('UNCOVERED_REQUIREMENT',e.path+'/id','Cover this requirement with an AI or human case.');
  t.cases.forEach((c,i)=>{const path=p+'/cases/'+i;for(const [key,map]of [['actors',actors],['fixtures',fixtures]]){unique(c[key],path+'/'+key,add);c[key].forEach((id,j)=>reference(map,id,path+'/'+key+'/'+j));}unique(c.depends_on.map(d=>d.step),path+'/depends_on',add);});
  unique(t.dispatch_order,p+'/dispatch_order',add);
  const top=[...steps].filter(([,e])=>e.value.caller==='qa-entrypoint').map(([id])=>id);
  t.dispatch_order.forEach((id,i)=>{if(!top.includes(id))add('DISPATCH',p+'/dispatch_order/'+i,'Dispatch only a top-level AI step.');});
  for(const id of top)if(!t.dispatch_order.includes(id))add('DISPATCH',steps.get(id).path+'/id','Include this top-level step once in dispatch_order.');
  const ownership=new Map(),stepCase=new Map();t.cases.forEach(c=>c.steps.forEach(s=>stepCase.set(s.id,c.id)));
  for(const [id,e]of steps){const s=e.value;unique(s.children,e.path+'/children',add);unique(s.outputs,e.path+'/outputs',add);
    if(s.api?.actor!==null&&s.api){reference(actors,s.api.actor,e.path+'/api/actor');if(!cases.get(stepCase.get(id)).value.actors.includes(s.api.actor))add('MISSING_REFERENCE',e.path+'/api/actor','Declare this API actor in its case actors.');}
    if(s.skill==='qa-api')for(const [j,childId]of s.children.entries()){
      const child=steps.get(childId);if(!child){add('MISSING_REFERENCE',e.path+'/children/'+j,'Name the API parent’s Bruno child.');continue;}
      if(ownership.has(childId))add('OWNERSHIP',e.path+'/children/'+j,'A helper must have exactly one parent.');ownership.set(childId,id);
      if(child.value.skill!=='qa-bruno'||child.value.caller!==id||stepCase.get(childId)!==stepCase.get(id))add('OWNERSHIP',e.path+'/children/'+j,'Own one Bruno child in this case with this parent as caller.');
      if(!equal(s.api,child.value.api)||!equal(s.expected,child.value.expected))add('PARENT_CHILD_MISMATCH',child.path+'/api','Make the API prescription and expectations agree with the parent.');
      s.outputs.forEach((name,j)=>{if(!child.value.outputs.includes(name))add('PARENT_CHILD_MISMATCH',e.path+'/outputs/'+j,'Declare this exact output on the Bruno child.');});
    }
  }
  for(const [id,e]of steps)if(e.value.skill==='qa-bruno'&&ownership.get(id)!==e.value.caller)add('OWNERSHIP',e.path+'/caller','Name the single API parent that owns this helper.');
  const expanded=[],start=new Map(),completion=new Map();
  for(const id of t.dispatch_order){const e=steps.get(id);if(!e||e.value.caller!=='qa-entrypoint')continue;start.set(id,expanded.length);expanded.push(e.value);if(e.value.skill==='qa-api'){for(const childId of e.value.children){const child=steps.get(childId);if(child){start.set(childId,expanded.length);expanded.push(child.value);completion.set(childId,expanded.length-1);}}}completion.set(id,expanded.length-1);}
  const types=[...new Set([...steps.values()].map(e=>e.value.skill==='qa-database'?'database':e.value.skill==='qa-ui'?'ui':'api'))];
  if(!equal([...t.testing_types].sort(),types.sort()))add('TESTING_TYPES',p+'/testing_types','Declare exactly the distinct testing types used by AI steps.');
  t.cases.forEach((c,i)=>{const first=Math.min(...c.steps.map(s=>start.get(s.id)??Infinity));c.depends_on.forEach((d,j)=>{const path=p+'/cases/'+i+'/depends_on/'+j+'/step';if(!steps.has(d.step))add('MISSING_REFERENCE',path,'Depend on an existing AI step.');else if(!(completion.get(d.step)<first))add('DEPENDENCY_ORDER',path,'Depend only on a completed earlier execution unit.');});});
  for(const [id,e]of steps){const s=e.value,targets=new Set();s.bindings.forEach((b,i)=>{const path=e.path+'/bindings/'+i,from=steps.get(b.from_step);if(!from)add('MISSING_REFERENCE',path+'/from_step','Bind an existing AI step output.');else{if(!from.value.outputs.includes(b.output))add('BINDING',path+'/output','Name an output declared by the source step.');if(!(completion.get(b.from_step)<start.get(id)))add('BINDING_ORDER',path+'/from_step','Consume only a completed earlier unit’s output.');}
      if(!Object.hasOwn(s.inputs,b.to_input))add('BINDING',path+'/to_input','Name an existing target input.');if(targets.has(b.to_input))add('BINDING',path+'/to_input','Bind each target input at most once.');targets.add(b.to_input);
    });}
  // Only these typed fields can consume mechanical preparation.
  const consumers=new Map();const consume=(id,consumer,path)=>{if(id===null)return;const slot=preparation.get(id);if(!slot)add('PREPARATION',path,'Reference a declared implementer preparation slot.');else{if(!slot.value.used_by.includes(consumer))add('PREPARATION',path,'Include this consumer in the slot used_by list.');if(!consumers.has(id))consumers.set(id,new Set());consumers.get(id).add(consumer);}};
  t.fixtures.forEach((f,i)=>consume(f.preparation_id,f.id,p+'/fixtures/'+i+'/preparation_id'));
  for(const [id,e]of steps){const s=e.value;consume(s.prepared_artifact.preparation_id,id,e.path+'/prepared_artifact/preparation_id');if(s.api)for(const k of ['route_preparation_id','selector_preparation_id'])consume(s.api[k],id,e.path+'/api/'+k);if(s.database)consume(s.database.parameters_preparation_id,id,e.path+'/database/parameters_preparation_id');if(s.ui)consume(s.ui.route_preparation_id,id,e.path+'/ui/route_preparation_id');}
  const humanIds=new Set(humans.map(h=>h.id));for(const [id,e]of preparation){unique(e.value.used_by,e.path+'/used_by',add);let actual=0;e.value.used_by.forEach((consumer,i)=>{if(humanIds.has(consumer)){actual++;return;}if(consumers.get(id)?.has(consumer)){actual++;return;}add('PREPARATION',e.path+'/used_by/'+i,'Name a human case or a fixture/step with a matching typed preparation reference.');});if(!actual)add('PREPARATION',e.path+'/used_by','Give this preparation slot an actual consumer.');}
  return { steps, cases, expanded, completion, start };
}
