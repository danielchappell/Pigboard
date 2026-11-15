import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateValue } from '../lib/contracts/work.mjs';
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/work-semantics.json',import.meta.url)));
const clone=()=>structuredClone(fixtures.mixed);
const refresh=p=>{for(const o of p.context.operations){const s=p.work.testing_strategy.cases.flatMap(c=>c.steps).find(s=>s.id===o.step);if(s)o.contract=structuredClone(s);}};
const run=p=>validateValue(p.work,{mode:'start',context:p.context});
const negatives=[
 ['requirement duplicate',p=>p.work.technical_acceptance_criteria.constraints[0].id='AC-01','DUPLICATE_ID'],
 ['case duplicate',p=>p.work.testing_strategy.human_review.cases[0].id='TC-01','DUPLICATE_ID'],
 ['step duplicate',p=>p.work.testing_strategy.cases[0].steps[3].id='TC-01.S3','DUPLICATE_ID'],
 ['case step collision',p=>p.work.testing_strategy.human_review.cases[0].id='TC-01.S1','DUPLICATE_ID'],
 ['actor duplicate',p=>p.work.testing_strategy.actors.push(structuredClone(p.work.testing_strategy.actors[0])),'DUPLICATE_ID'],
 ['fixture duplicate',p=>p.work.testing_strategy.fixtures.push(structuredClone(p.work.testing_strategy.fixtures[0])),'DUPLICATE_ID'],
 ['missing requirement',p=>p.work.testing_strategy.cases[0].requirements[1]='missing','MISSING_REFERENCE'],
 ['uncovered requirement',p=>p.work.acceptance_criteria.push({id:'AC-new',requirement:'New behavior.'}),'UNCOVERED_REQUIREMENT'],
 ['missing actor',p=>p.work.testing_strategy.cases[0].actors[0]='missing','MISSING_REFERENCE'],
 ['missing fixture',p=>p.work.testing_strategy.cases[0].fixtures[0]='missing','MISSING_REFERENCE'],
 ['missing child',p=>p.work.testing_strategy.cases[0].steps[0].children[0]='missing','MISSING_REFERENCE'],
 ['orphan child',p=>p.work.testing_strategy.cases[0].steps[1].caller='orphan','OWNERSHIP'],
 ['child in dispatch',p=>p.work.testing_strategy.dispatch_order.push('TC-01.S2'),'DISPATCH'],
 ['human in dispatch',p=>p.work.testing_strategy.dispatch_order.push('HQA-01'),'DISPATCH'],
 ['missing dispatch',p=>p.work.testing_strategy.dispatch_order.pop(),'DISPATCH'],
 ['duplicate dispatch',p=>p.work.testing_strategy.dispatch_order.push('TC-01.S4'),'DUPLICATE_REFERENCE'],
 ['testing types mismatch',p=>p.work.testing_strategy.testing_types.pop(),'TESTING_TYPES'],
 ['parent route mismatch',p=>p.work.testing_strategy.cases[0].steps[1].api.route='/other','PARENT_CHILD_MISMATCH'],
 ['parent expectation mismatch',p=>p.work.testing_strategy.cases[0].steps[1].expected=['Different expectation.'],'PARENT_CHILD_MISMATCH'],
 ['parent output mismatch',p=>p.work.testing_strategy.cases[0].steps[1].outputs=[],'PARENT_CHILD_MISMATCH'],
 ['source output missing',p=>p.work.testing_strategy.cases[0].steps[2].bindings[0].output='missing','BINDING'],
 ['binding target missing',p=>p.work.testing_strategy.cases[0].steps[2].bindings[0].to_input='missing','BINDING'],
 ['forward binding',p=>p.work.testing_strategy.dispatch_order=['TC-01.S3','TC-01.S1','TC-01.S4'],'BINDING_ORDER'],
 ['self binding',p=>p.work.testing_strategy.cases[0].steps[2].bindings[0].from_step='TC-01.S3','BINDING_ORDER'],
 ['human binding',p=>p.work.testing_strategy.cases[0].steps[2].bindings[0].from_step='HQA-01','MISSING_REFERENCE'],
 ['duplicate binding target',p=>p.work.testing_strategy.cases[0].steps[2].bindings.push(structuredClone(p.work.testing_strategy.cases[0].steps[2].bindings[0])),'BINDING'],
 ['parent cannot consume own child',p=>p.work.testing_strategy.cases[0].steps[0].bindings=[{from_step:'TC-01.S2',output:'record_id',to_input:'record_id'}],'BINDING_ORDER'],
 ['child cannot consume incomplete parent',p=>p.work.testing_strategy.cases[0].steps[1].bindings=[{from_step:'TC-01.S1',output:'record_id',to_input:'record_id'}],'BINDING_ORDER'],
 ['case dependency cannot be own step',p=>p.work.testing_strategy.cases[0].depends_on=[{step:'TC-01.S1',required_outcome:'Complete.'}],'DEPENDENCY_ORDER'],
 ['missing dependency',p=>p.work.testing_strategy.cases[0].depends_on=[{step:'missing',required_outcome:'Complete.'}],'MISSING_REFERENCE'],
 ['duplicate outputs',p=>p.work.testing_strategy.cases[0].steps[0].outputs.push('record_id'),'DUPLICATE_REFERENCE'],
 ['actor not declared by case',p=>p.work.testing_strategy.cases[0].actors=[],'MISSING_REFERENCE'],
];
for(const [name,mutate,code]of negatives)test('H01/H02 graph rejects '+name,()=>{const p=clone();mutate(p);refresh(p);const r=run(p);assert.equal(r.valid,false);assert(r.diagnostics.some(d=>d.code===code),JSON.stringify(r.diagnostics));});
test('H02 earlier completed units feed later cases and children',()=>{const p=clone(),t=p.work.testing_strategy,c=t.cases[0];const later=structuredClone(c);later.id='TC-02';later.steps=later.steps.slice(0,2);later.steps[0].id='TC-02.S1';later.steps[0].children=['TC-02.S2'];later.steps[1].id='TC-02.S2';later.steps[1].caller='TC-02.S1';for(const s of later.steps)s.bindings=[{from_step:'TC-01.S1',output:'record_id',to_input:'record_id'}];later.depends_on=[{step:'TC-01.S1',required_outcome:'First result recorded.'}];t.cases.push(later);t.dispatch_order.push('TC-02.S1');for(const s of later.steps)p.context.operations.push({step:s.id,contract:s,read_only:true,max_duration_seconds:5,parameter_count:null});assert.equal(run(p).valid,true,JSON.stringify(run(p).diagnostics));});
test('H02 preparation is mechanical, reciprocal and human consumers stay pending',()=>{const p=clone(),t=p.work.testing_strategy,s=t.cases[0].steps[2];s.database.parameters=null;s.database.parameters_preparation_id='PREP';t.preparation=[{id:'PREP',owner:'implementer',supplies:'Prepare parameter layout only.',used_by:[s.id,'HQA-01'],preserves:['Keep scope and expected outcomes.']}];refresh(p);assert(run(p).valid);for(const mutate of [q=>q.work.testing_strategy.preparation[0].used_by=['HQA-01'],q=>q.work.testing_strategy.preparation[0].used_by.push('TC-01.S4'),q=>q.work.testing_strategy.preparation[0].id='other']){const q=structuredClone(p);mutate(q);refresh(q);assert(run(q).diagnostics.some(d=>d.code==='PREPARATION'));}const q=structuredClone(p);q.work.testing_strategy.preparation.push(structuredClone(q.work.testing_strategy.preparation[0]));assert(run(q).diagnostics.some(d=>d.code==='DUPLICATE_ID'));});
