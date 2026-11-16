import { test } from 'node:test';import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';import { mkdtemp,writeFile,readFile,readdir,rm } from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import { spawnSync } from 'node:child_process';import { stringify } from 'yaml';import Ajv2020 from 'ajv/dist/2020.js';import addFormats from 'ajv-formats';
import { validateValue,validateWork,parseWork } from '../lib/contracts/work.mjs';import { sizeLedger } from '../lib/contracts/work-semantics.mjs';
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/work-semantics.json',import.meta.url))),cli=new URL('../scripts/validate-work.mjs',import.meta.url).pathname;
const clone=(name='mixed')=>structuredClone(fixtures[name]),run=p=>validateValue(p.work,{mode:'start',context:p.context});
const uriControls=[
 ['https://example.invalid/repo',true],
 ['https://example.invalid/saved%20filters',true],
 ['https://example.invalid/caf%C3%A9',true],
 ['https://xn--caf-dma.invalid/repo',true],
 ['https://[2001:db8::1]/repo',true],
 ['https://example.invalid/a%2Fb?name=one%20two&sort=a#section',true],
 ['https://example.invalid/raw space',false],
 ['https://example.invalid/raw\tpath',false],
 ['https://example.invalid/raw\npath',false],
 ['https://[2001:db8::1/repo',false],
 ['https://exa[mple.invalid/repo',false],
 ['https://example.invalid/%',false],
 ['https://example.invalid/%2',false],
 ['https://example.invalid/%GG',false],
 ['https://example.invalid/café',false],
 ['https://café.invalid/repo',false],
];
const refresh=p=>{for(const o of p.context.operations){const s=p.work.testing_strategy.cases.flatMap(c=>c.steps).find(s=>s.id===o.step);if(s)o.contract=structuredClone(s);}};
function reject(mutate,code,name='mixed'){const p=clone(name);mutate(p);refresh(p);const r=run(p);assert.equal(r.valid,false);assert(r.diagnostics.some(d=>d.code===code),JSON.stringify(r.diagnostics));}
test('H01 mixed and human-only local starts are truthful and immutable',()=>{for(const name of ['mixed','human']){const p=clone(name),before=JSON.stringify(p),r=run(p);assert.equal(r.valid,true);assert.equal(r.validation_scope,'local_start');assert.equal(r.readiness,'not_evaluated');assert.equal(r.start_semantics_valid,true);assert.equal(r.ledger_budget.omitted_entries,0);assert.equal(r.ledger_budget.human_cases,1);assert(!JSON.stringify(r).includes('"PASS"'));assert.equal(JSON.stringify(p),before);}});
test('H02 explicit structure and draft preserve shape-only contract',()=>{const p=clone();p.work.testing_strategy.dispatch_order=['missing'];for(const mode of ['draft','structure']){const r=validateValue(p.work,{mode});assert(r.valid);assert.equal(r.start_semantics_valid,null);assert.equal(r.ledger_budget,null);}assert.equal(run(p).valid,false);assert.equal(validateValue(p.work,{mode:'start'}).diagnostics[0].path,'/context');});
test('H02 optional documentary citations remain prose while runtime references and repositories stay trusted',()=>{
 const citation='docs/supporting/unprepared-contract.md',relatedUrl='https://example.invalid/related';
 const ticket=clone('human');ticket.work.technical_acceptance_criteria.accepted_decisions=[{id:'D-1',decision:'Keep the reviewed boundary.',reference:citation}];
 ticket.work.technical_acceptance_criteria.repository.related_repositories=[{url:relatedUrl,responsibility:'Reference-only supporting contract; no related code change.',contract_reference:citation,change_story:null}];
 ticket.context.repositories.push({url:relatedUrl,base_branches:['main']});assert.deepEqual(ticket.context.references,[]);
 const epic={work:{schema:'pigboard-epic/v1',problem_to_solve:'Describe the agreed shared outcome.',outcome:'Reviewed work has a clear order.',scope:{included:['The agreed local behavior.'],excluded:[]},workstreams:[{label:'stream-1',story_order:['EX-2']}],accepted_decisions:[{id:'D-1',decision:'Keep the reviewed boundary.',reference:citation}],open_questions:[]},context:structuredClone(ticket.context)};
 epic.context.prerequisite_graph.push({ticket:'EX-2',prerequisites:[]});
 for(const pair of [ticket,epic]){const before=JSON.stringify(pair),r=run(pair);assert.equal(r.valid,true,JSON.stringify(r.diagnostics));assert.equal(r.readiness,'not_evaluated');assert.equal(JSON.stringify(pair),before);assert(!JSON.stringify(r).includes(citation));}
 for(const [source,path,setBlank]of [
  [ticket,'/technical_acceptance_criteria/accepted_decisions/0/reference',p=>p.work.technical_acceptance_criteria.accepted_decisions[0].reference=' '],
  [ticket,'/technical_acceptance_criteria/repository/related_repositories/0/contract_reference',p=>p.work.technical_acceptance_criteria.repository.related_repositories[0].contract_reference=' '],
  [epic,'/accepted_decisions/0/reference',p=>p.work.accepted_decisions[0].reference=' '],
 ]){const p=structuredClone(source);setBlank(p);const r=run(p);assert.equal(r.valid,false);assert(r.diagnostics.some(d=>d.code==='BLANK_CONTENT'&&d.path===path));}
 const untrustedRepository=structuredClone(ticket);untrustedRepository.context.repositories.pop();assert(run(untrustedRepository).diagnostics.some(d=>d.code==='TRUSTED_SCOPE'&&d.path==='/technical_acceptance_criteria/repository/related_repositories/0/url'));
 const fixture=structuredClone(ticket);fixture.work.testing_strategy.fixtures=[{id:'DATA-citation',description:'A supplied fixture.',initial_state:'Prepared initial state.',reference:citation,preparation_id:null,owner:'Fixture owner'}];assert(run(fixture).diagnostics.some(d=>d.code==='TRUSTED_SCOPE'&&d.path==='/testing_strategy/fixtures/0/reference'));
 const artifact=clone();artifact.work.testing_strategy.cases[0].steps[0].prepared_artifact.reference=citation;refresh(artifact);assert(!artifact.context.references.includes(citation));assert(run(artifact).diagnostics.some(d=>d.code==='TRUSTED_SCOPE'&&d.path==='/testing_strategy/cases/0/steps/0/prepared_artifact/reference'));
});
test('H02 related changes retain every supplied obligation without turning separate links into execution authority',()=>{
 const url='https://example.invalid/related',extraUrl='https://example.invalid/another';
 const base=clone('human');base.context.repositories.push({url,base_branches:['main']},{url:extraUrl,base_branches:['main']});
 const related=(repository,story)=>({url:repository,responsibility:'Separately owned related work; no second PR in this ticket.',contract_reference:null,change_story:story});
 base.work.technical_acceptance_criteria.repository.related_repositories=[related(url,'EX-2')];assert.deepEqual(base.context.related_changes,[]);
 const controls=[
  ['additional separate link with no required obligation',p=>{},true,null],
  ['matching required repository and Story',p=>p.context.related_changes=[{repository:url,change_story:'EX-2'}],true,null],
  ['required pair plus additional separate link',p=>{p.context.related_changes=[{repository:url,change_story:'EX-2'}];p.work.technical_acceptance_criteria.repository.related_repositories.push(related(extraUrl,'EX-3'));},true,null],
  ['omitted required pair',p=>{p.context.related_changes=[{repository:url,change_story:'EX-2'}];p.work.technical_acceptance_criteria.repository.related_repositories=[];},false,'/technical_acceptance_criteria/repository/related_repositories'],
  ['substituted required Story',p=>{p.context.related_changes=[{repository:url,change_story:'EX-2'}];p.work.technical_acceptance_criteria.repository.related_repositories[0].change_story='EX-3';},false,'/technical_acceptance_criteria/repository/related_repositories'],
  ['substituted required repository',p=>p.context.related_changes=[{repository:extraUrl,change_story:'EX-2'}],false,'/technical_acceptance_criteria/repository/related_repositories'],
  ['unapproved related repository',p=>p.context.repositories=p.context.repositories.filter(r=>r.url!==url),false,'/technical_acceptance_criteria/repository/related_repositories/0/url'],
  ['unapproved primary branch remains forbidden',p=>{p.work.technical_acceptance_criteria.repository.url=url;p.work.technical_acceptance_criteria.repository.base_branch='unapproved';},false,'/technical_acceptance_criteria/repository'],
 ];
 for(const [name,mutate,expected,path]of controls){const pair=structuredClone(base);mutate(pair);const before=JSON.stringify(pair),r=run(pair);assert.equal(r.valid,expected,name+JSON.stringify(r.diagnostics));if(!expected)assert(r.diagnostics.some(d=>d.code==='TRUSTED_SCOPE'&&d.path===path),name);assert.equal(r.readiness,'not_evaluated');assert.equal(r.ledger_budget.ai_steps,0);assert.deepEqual(pair.context.operations,[]);assert.deepEqual(pair.work.prerequisites,[]);assert.equal(JSON.stringify(pair),before);}
});
test('H02 strict JS context and raw YAML/ADF floating provenance remain separate',()=>{for(const format of ['yaml','adf']){const p=clone();p.work.testing_strategy.cases[0].steps[0].inputs.amount='MARK';refresh(p);const raw=stringify(p.work).replace('MARK','1e20'),context=stringify(p.context).replace('MARK','1e20');const input=format==='adf'?JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:raw}]}]}):raw;assert(validateWork(input,{mode:'start',format,contextInput:context}).valid);assert.equal(validateValue(parseWork(raw),{mode:'structure'}).diagnostics[0].code,'NUMBER');const v=clone();v.context.operations[0].contract.inputs.amount=1e20;const r=run(v);assert.equal(r.diagnostics[0].code,'NUMBER');assert.equal(r.diagnostics[0].path,'/context/operations/0/contract/inputs/amount');}});
const rules=[
 ['blank prose',p=>p.work.problem_to_solve=' \n','BLANK_CONTENT'],
 ['blank evidence',p=>p.work.testing_strategy.cases[0].steps[0].evidence=[' '],'BLANK_CONTENT'],
 ['blank access owner',p=>p.work.testing_strategy.actors[0].access_owner=' ','BLANK_CONTENT'],
 ['blank screenshot',p=>p.work.testing_strategy.cases[0].steps[3].ui.screenshot_checkpoints=[' '],'BLANK_CONTENT'],
 ['untrusted repo',p=>p.work.technical_acceptance_criteria.repository.url='other','TRUSTED_SCOPE'],
 ['untrusted branch',p=>p.work.technical_acceptance_criteria.repository.base_branch='other','TRUSTED_SCOPE'],
 ['untrusted reference',p=>p.work.testing_strategy.actors[0].identity_reference='other','TRUSTED_SCOPE'],
 ['uninstalled skill extension',p=>p.context.allowed_skills.push('new-qa-engine'),'TRUSTED_SCOPE'],
 ['context narrows skill',p=>p.context.allowed_skills=[],'TRUSTED_SCOPE'],
 ['missing graph node',p=>{p.work.prerequisites=[{ticket:'EX-2',required_outcome:'ai_qa_complete'}];p.context.prerequisite_graph[0].prerequisites=['EX-2'];},'MISSING_REFERENCE'],
 ['self prerequisite',p=>{p.work.prerequisites=[{ticket:'EX-1',required_outcome:'ai_qa_complete'}];p.context.prerequisite_graph[0].prerequisites=['EX-1'];},'PREREQUISITE_CYCLE'],
 ['graph cycle',p=>{p.work.prerequisites=[{ticket:'EX-2',required_outcome:'ai_qa_complete'}];p.context.prerequisite_graph[0].prerequisites=['EX-2'];p.context.prerequisite_graph.push({ticket:'EX-2',prerequisites:['EX-1']});},'PREREQUISITE_CYCLE'],
 ['subject graph mismatch',p=>p.context.prerequisite_graph[0].prerequisites=['EX-2'],'CONTEXT_GRAPH'],
 ['duplicate graph node',p=>p.context.prerequisite_graph.push(structuredClone(p.context.prerequisite_graph[0])),'DUPLICATE_ID'],
 ['missing operation',p=>p.context.operations.pop(),'CONTEXT_OPERATION'],
 ['extra operation',p=>p.context.operations.push({...structuredClone(p.context.operations[0]),step:'extra'}),'CONTEXT_OPERATION'],
 ['related change obligation',p=>p.context.related_changes=[{repository:'other',change_story:'EX-2'}],'TRUSTED_SCOPE'],
 ['DB count mismatch',p=>p.context.operations[2].parameter_count=1,'DATABASE_PARAMETERS'],
 ['DB index range',p=>p.work.testing_strategy.cases[0].steps[2].database.parameter_bindings[0].index=2,'DATABASE_PARAMETERS'],
 ['DB duplicate position',p=>p.work.testing_strategy.cases[0].steps[2].database.parameter_bindings.push({input:'record_id',index:1}),'DATABASE_PARAMETERS'],
 ['DB missing input',p=>p.work.testing_strategy.cases[0].steps[2].database.parameter_bindings[0].input='missing','DATABASE_PARAMETERS'],
 ['DB non-null placeholder',p=>p.work.testing_strategy.cases[0].steps[2].database.parameters[1]='value','DATABASE_PARAMETERS'],
 ['sync DB mutation',p=>p.context.operations[2].read_only=false,'DATABASE_READ_ONLY'],
];for(const[name,mutate,code]of rules)test('H02 rejects '+name,()=>reject(mutate,code));
test('H02 stale context cannot bless changed prescription',()=>{const p=clone();p.work.testing_strategy.cases[0].steps[0].action='Changed operation.';assert(run(p).diagnostics.some(d=>d.code==='CONTEXT_OPERATION'));});
test('H02 opaque input/SQL strings and supported synchronous API/UI mutations remain valid',()=>{const p=clone();p.work.testing_strategy.cases[0].steps[0].inputs.record_id=' ';p.work.testing_strategy.cases[0].steps[2].database.parameters[0]=' ';p.context.operations[0].read_only=false;p.context.operations[1].read_only=false;p.context.operations[3].read_only=false;refresh(p);assert(run(p).valid);});
function asyncDb(){const p=clone(),t=p.work.testing_strategy,c=t.cases[0];c.steps=[c.steps[2]];const s=c.steps[0];s.bindings=[];s.inputs.record_id='fixture-1';c.observation={mode:'asynchronous',schedule:[0,25],deadline_seconds:45,step:s.id,completion:'until_expected'};t.dispatch_order=[s.id];t.testing_types=['database'];p.context.operations=[p.context.operations[2]];refresh(p);return p;}
test('H02 asynchronous observation uses reviewed read-only durations without guessing prose',()=>{const p=asyncDb();assert(run(p).valid,JSON.stringify(run(p).diagnostics));for(const mutate of [q=>q.context.operations[0].read_only=false,q=>q.context.operations[0].max_duration_seconds=19,q=>q.context.operations[0].max_duration_seconds=null,q=>q.work.testing_strategy.cases[0].observation.schedule=[0,10],q=>q.work.testing_strategy.cases[0].observation.schedule=[0,0],q=>q.work.testing_strategy.cases[0].observation.deadline_seconds=44,q=>q.work.testing_strategy.cases[0].observation.step='other']){const q=structuredClone(p);mutate(q);refresh(q);assert(run(q).diagnostics.some(d=>d.code==='OBSERVATION'));}});
test('H02 context schema fails closed, safely and before semantics',()=>{for(const mutate of [p=>p.context.schema='wrong',p=>p.context.extra='secret',p=>delete p.context.references,p=>p.context.operations[0].max_duration_seconds=0,p=>p.context.operations[2].parameter_count=-1]){const p=clone();mutate(p);const r=run(p);assert(!r.valid);assert(r.diagnostics.every(d=>d.path.startsWith('/context')));}const p=clone();p.work.problem_to_solve=null;const r=validateWork(stringify(p.work),{mode:'start',contextInput:'broken: ['});assert.equal(r.start_structure_valid,false);assert(!r.diagnostics.some(d=>d.path.startsWith('/context')));});
test('H02 asynchronous API bound covers child without double counting',()=>{const p=clone(),t=p.work.testing_strategy,c=t.cases[0];c.steps=c.steps.slice(0,2);t.testing_types=['api'];t.dispatch_order=['TC-01.S1'];p.context.operations=p.context.operations.slice(0,2);p.context.operations[0].max_duration_seconds=5;p.context.operations[1].max_duration_seconds=4;c.observation={mode:'asynchronous',schedule:[0,5],deadline_seconds:10,step:'TC-01.S1',completion:'all_observations'};refresh(p);assert(run(p).valid);p.context.operations[1].max_duration_seconds=6;assert(run(p).diagnostics.some(d=>d.code==='OBSERVATION'));});
test('H03 deterministic complete-ledger byte boundary and multi-evidence retention',()=>{const p=clone();const step=p.work.testing_strategy.cases[0].steps[0];step.evidence.push('Second evidence obligation.');let r=run(p); // intentionally stale until refreshed
 refresh(p);r=run(p);assert(r.valid);const before=r.ledger_budget.projection_bytes;step.id+='x'.repeat(20); // size-only oracle independent of graph
 assert.equal(sizeLedger(p.work).ledger_budget.projection_bytes,before+20);
 const h=clone('human');const base=sizeLedger(h.work).ledger_budget.projection_bytes;
 // Pad human identifiers within 255 chars over many cases to reach 16KiB without violating other limits.
 const template=h.work.testing_strategy.human_review.cases[0];h.work.testing_strategy.human_review.cases=Array.from({length:65},(_,i)=>({...structuredClone(template),id:'H'+i+'x'.repeat(200)}));let size=sizeLedger(h.work).ledger_budget.projection_bytes;
 while(size>16384){h.work.testing_strategy.human_review.cases.pop();size=sizeLedger(h.work).ledger_budget.projection_bytes;}
 let remaining=16384-size;for(const c of h.work.testing_strategy.human_review.cases){const n=Math.min(255-c.id.length,remaining);c.id+='x'.repeat(n);remaining-=n;}if(remaining){h.work.testing_strategy.human_review.no_ai_cases_reason+='x'.repeat(remaining);}assert.equal(sizeLedger(h.work).ledger_budget.projection_bytes,16384);assert.equal(run(h).valid,true);h.work.testing_strategy.human_review.no_ai_cases_reason+='x';const over=run(h);assert(!over.valid);assert(over.diagnostics.some(d=>d.code==='LEDGER_BYTES'));assert.equal(over.ledger_budget.omitted_entries,0);assert.equal(over.ledger_budget.human_cases,h.work.testing_strategy.human_review.cases.length);
 const count=clone();const all=Array(101).fill(count.work.testing_strategy.cases[0].steps[0]);assert(sizeLedger(count.work,all).diagnostics.some(d=>d.code==='LEDGER_LIST'));assert(base>0);
});
test('H03 publication field bounds and earlier reachable parser/context limits stay distinct',()=>{reject(p=>p.work.testing_strategy.human_review.cases[0].id='h'.repeat(256),'LEDGER_FIELD','human');reject(p=>p.work.testing_strategy.human_review.no_ai_cases_reason='r'.repeat(2001),'LEDGER_FIELD','human');const p=clone();p.context.operations=Array(101).fill(p.context.operations[0]);const r=run(p);assert.equal(r.diagnostics[0].code,'LIST_LIMIT');assert.equal(r.ledger_budget,null);assert.equal(r.diagnostics[0].path,'/context/operations');});
test('H03 copied repository handoff bounds retain the complete ledger with matching trusted context',()=>{
 const prefix='https://example.invalid/';
 const cases=[
  {url:prefix+'a'.repeat(2048-prefix.length),valid:true},
  {url:prefix+'a'.repeat(2049-prefix.length),valid:false,reason:/at most 2048 characters/},
  {url:'ssh://example.invalid/repo',valid:false,reason:/HTTPS repository URL/},
  {url:'http://example.invalid/repo',valid:false,reason:/HTTPS repository URL/},
 ];
 for(const name of ['mixed','human'])for(const {url,valid,reason}of cases){
  const p=clone(name);p.work.technical_acceptance_criteria.repository.url=url;p.context.repositories[0].url=url;
  const r=run(p);assert.equal(r.valid,valid);assert.equal(r.start_structure_valid,true);assert.equal(r.start_semantics_valid,valid);
  assert.equal(r.ledger_budget.ai_steps,name==='mixed'?4:0);assert.equal(r.ledger_budget.human_cases,1);assert.equal(r.ledger_budget.omitted_entries,0);
  assert.equal(r.ledger_budget.actual_publication,'not_evaluated');
  if(!valid){assert.equal(r.diagnostics.length,1);assert.equal(r.diagnostics[0].code,'LEDGER_FIELD');assert.equal(r.diagnostics[0].path,'/technical_acceptance_criteria/repository/url');assert.match(r.diagnostics[0].message,reason);}
 }
});
test('H03 URI lexical syntax rejects malformed original strings without normalization',()=>{
 for(const name of ['mixed','human'])for(const [url,expected]of uriControls){const p=clone(name);p.work.technical_acceptance_criteria.repository.url=url;p.context.repositories[0].url=url;const before=JSON.stringify(p),r=run(p);assert.equal(r.valid,expected,JSON.stringify({url,diagnostics:r.diagnostics}));assert.equal(JSON.stringify(p),before);assert.equal(r.ledger_budget.ai_steps,name==='mixed'?4:0);assert.equal(r.ledger_budget.human_cases,1);assert.equal(r.ledger_budget.omitted_entries,0);if(!expected)assert(r.diagnostics.some(d=>d.code==='LEDGER_FIELD'&&d.path==='/technical_acceptance_criteria/repository/url'&&d.message.includes('valid URI')));}
});
test('H03 independent full-envelope oracle matches design schema and byte projection',()=>{
 const w=clone().work,uuid='00000000-0000-4000-8000-000000000000',digest='sha256:'+'0'.repeat(64),ref={ticket_id:'0',comment_id:'0',record_id:uuid,digest};
 const records=w.testing_strategy.cases.flatMap(c=>c.steps).map(s=>({id:s.id,skill:s.skill,result:'PASS',evidence:s.evidence.map((_,j)=>({label:`e${j+1}`,uri:`https://e.invalid/${j+1}`,digest:null})),finding_ids:[],not_run_reason:null,reused_from:null}));
 const oracle={schema:'pigboard-handoff/v1',record_id:uuid,operation_id:uuid,ticket_id:'0',requirements_digest:digest,assignment:ref,role:'qa',kind:'qa',from_stage:'QA',to_stage:'Human Review',payload:{review:ref,pr:{provider:'github',repository:w.technical_acceptance_criteria.repository.url,number:'0',source_revision:'0'.repeat(40),target_branch:'a'},report:{steps:records,human_pending:w.testing_strategy.human_review.cases.map(c=>c.id),no_ai_cases_reason:null}},resume_authorization:null};
 const schema=JSON.parse(readFileSync(new URL('../contracts/handoff-v1.schema.json',import.meta.url)));const ajv=new Ajv2020({strict:false});addFormats(ajv,{mode:'full',formats:['uri','uuid']});const validate=ajv.compile(schema);assert(validate(oracle),JSON.stringify(validate.errors));
 assert.equal(sizeLedger(w).ledger_budget.projection_bytes,Buffer.byteLength(JSON.stringify(oracle)+'\n'));assert.equal(records.length,4);assert.equal(records[1].skill,'qa-bruno');
 for(const [repository,expected]of uriControls){const envelope=structuredClone(oracle);envelope.payload.pr.repository=repository;assert.equal(validate(envelope),expected,repository);if(!expected)assert(validate.errors.some(e=>e.keyword==='format'&&e.instancePath==='/payload/pr/repository'));const work=structuredClone(w);work.technical_acceptance_criteria.repository.url=repository;assert.equal(sizeLedger(work).ledger_budget.projection_bytes,Buffer.byteLength(JSON.stringify(envelope)+'\n'));}
 const invalidUuid=structuredClone(oracle);invalidUuid.record_id='invalid';assert.equal(validate(invalidUuid),false);assert(validate.errors.some(e=>e.keyword==='format'&&e.instancePath==='/record_id'));

 // Independently verify every carried repository boundary against the complete
 // current handoff schema, rather than reproducing the product guard.
 const prefix='https://example.invalid/';
 for(const [repository,valid,keyword]of [[prefix+'a'.repeat(2048-prefix.length),true,null],[prefix+'a'.repeat(2049-prefix.length),false,'maxLength'],['ssh://example.invalid/repo',false,'pattern']]){
  const envelope=structuredClone(oracle);envelope.payload.pr.repository=repository;
  assert.equal(validate(envelope),valid,JSON.stringify(validate.errors));
  if(!valid)assert(validate.errors.some(e=>e.keyword===keyword&&e.instancePath==='/payload/pr/repository'));
  const work=structuredClone(w);work.technical_acceptance_criteria.repository.url=repository;
  const sized=sizeLedger(work);assert.equal(sized.diagnostics.length===0,valid);assert.equal(sized.ledger_budget.projection_bytes,Buffer.byteLength(JSON.stringify(envelope)+'\n'));
 }

});
test('H01/H02 actual CLI preserves local files and reports modes/context exits',async t=>{const dir=await mkdtemp(path.join(os.tmpdir(),'pgb72-cli-'));t.after(()=>rm(dir,{recursive:true,force:true}));const p=clone(),work=path.join(dir,'work.json'),context=path.join(dir,'facts.json');await writeFile(work,JSON.stringify(p.work));await writeFile(context,JSON.stringify(p.context));const before=await readdir(dir);const command=(args)=>{const c=spawnSync(process.execPath,[cli,...args,'--json'],{cwd:dir,encoding:'utf8',timeout:30000});return {...c,result:JSON.parse(c.stdout)};};let c=command(['--mode','start','--input',work,'--context',context]);assert.equal(c.status,0);assert.equal(c.result.valid,true);for(const args of [['--mode','start','--input',work],['--mode','draft','--input',work,'--context',context],['--mode','start','--input',work,'--context',context,'--context',context]])assert.equal(command(args).status,2);await writeFile(context,'unknown: [');c=command(['--mode','start','--input',work,'--context',context]);assert.equal(c.status,2);assert(c.result.diagnostics[0].path.startsWith('/context'));assert.deepEqual(await readdir(dir),before);assert.equal(await readFile(work,'utf8'),JSON.stringify(p.work));});

test('H01 actual local-start CLI has no filesystem writes, network or subprocess effects',async t=>{const dir=await mkdtemp(path.join(os.tmpdir(),'pgb72-audit-'));t.after(()=>rm(dir,{recursive:true,force:true}));const p=clone(),work=path.join(dir,'work.json'),context=path.join(dir,'facts.json'),guard=path.join(dir,'guard.mjs');const inputs=[JSON.stringify(p.work),JSON.stringify(p.context)];await writeFile(work,inputs[0]);await writeFile(context,inputs[1]);
 await writeFile(guard,`import fs from 'node:fs';import fsp from 'node:fs/promises';import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';let attempts=0;const deny=()=>{attempts++;throw Error('unexpected effect');};for(const api of [fs,fsp])for(const key of ['writeFile','appendFile','mkdir','rm','rmdir','unlink','rename','copyFile','cp','symlink','link','chmod','chown','truncate','write','writev','createWriteStream'])for(const name of [key,key+'Sync'])if(typeof api[name]==='function')api[name]=deny;const original=fsp.open;fsp.open=async(...args)=>{if(args[1]!==undefined&&args[1]!==0&&args[1]!==fs.constants.O_NONBLOCK&&args[1]!=='r')deny();const h=await original(...args);for(const key of ['write','writeFile','appendFile','writev','truncate','chmod','chown'])h[key]=deny;return h;};for(const api of [http,https])for(const key of ['request','get'])api[key]=deny;for(const api of [net,tls])for(const key of ['connect','createConnection','createServer'])if(api[key])api[key]=deny;for(const key of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork'])cp[key]=deny;globalThis.fetch=deny;syncBuiltinESMExports();process.on('exit',()=>process.stderr.write('AUDIT attempts='+attempts+'\\n'));`);
 const before=await readdir(dir),command=spawnSync(process.execPath,['--import',guard,cli,'--mode','start','--input',work,'--context',context,'--json'],{cwd:dir,encoding:'utf8',timeout:30000});assert.equal(command.status,0,command.stdout+command.stderr);assert.equal(JSON.parse(command.stdout).valid,true);assert.equal(command.stderr,'AUDIT attempts=0\n');assert.deepEqual(await readdir(dir),before);assert.equal(await readFile(work,'utf8'),inputs[0]);assert.equal(await readFile(context,'utf8'),inputs[1]);});

test('H03 actual source CLI checks original repository URI syntax and leaves both inputs unchanged',async t=>{const dir=await mkdtemp(path.join(os.tmpdir(),'pgb72-uri-cli-'));t.after(()=>rm(dir,{recursive:true,force:true}));const work=path.join(dir,'work.json'),context=path.join(dir,'facts.json');for(const url of ['https://example.invalid/a%20b','https://example.invalid/raw space']){const p=clone();p.work.technical_acceptance_criteria.repository.url=url;p.context.repositories[0].url=url;const before=[JSON.stringify(p.work),JSON.stringify(p.context)];await writeFile(work,before[0]);await writeFile(context,before[1]);const command=spawnSync(process.execPath,[cli,'--mode','start','--input',work,'--context',context,'--json'],{cwd:dir,encoding:'utf8',timeout:30000}),result=JSON.parse(command.stdout);assert.equal(command.status,url.includes('%20')?0:1);assert.equal(result.valid,url.includes('%20'));assert.equal(result.ledger_budget.ai_steps,4);assert.equal(result.ledger_budget.human_cases,1);assert.equal(result.ledger_budget.omitted_entries,0);if(!result.valid)assert(result.diagnostics.some(d=>d.code==='LEDGER_FIELD'&&d.path==='/technical_acceptance_criteria/repository/url'));assert.equal(await readFile(work,'utf8'),before[0]);assert.equal(await readFile(context,'utf8'),before[1]);}});

const schedulingFixture=()=>structuredClone(fixtures.scheduling);
const schedule=(work,inputs=schedulingFixture())=>validateValue(work,{mode:'scheduling',config:inputs.config,scheduling:inputs.facts});
test('PGB-159 first scheduling slice accepts declared mixed preparation without execution facts and preserves strict start',()=>{
 const inputs=schedulingFixture(),work=inputs.variants.mixed,before=JSON.stringify(inputs);
 const result=schedule(work,inputs);
 assert.equal(result.valid,true,JSON.stringify(result.diagnostics));
 assert.equal(result.mode,'scheduling');assert.equal(result.purpose,'scheduling');
 assert.equal(result.validation_scope,'scheduling_declarations');assert.equal(result.scheduling_semantics_valid,true);
 assert.equal(result.start_semantics_valid,null);assert.equal(result.readiness,'not_evaluated');assert.equal(result.execution_authorized,false);
 assert.equal(result.ledger_budget.ai_steps,4);assert.equal(result.ledger_budget.human_cases,1);assert.equal(result.ledger_budget.omitted_entries,0);
 const refused=validateValue(work,{mode:'start'});assert.equal(refused.valid,false);assert.equal(refused.diagnostics[0].path,'/context');
 assert.equal(run(clone()).valid,true);assert.equal(JSON.stringify(inputs),before);
});
function schedulingControl(control){
 const inputs=schedulingFixture(),sample={work:inputs.variants[control.variant],config:inputs.config,facts:inputs.facts};
 for(const [pointer,value]of control.patches){const keys=pointer.split('/');let target=sample;for(const key of keys.slice(0,-1))target=target[key];target[keys.at(-1)]=structuredClone(value);}
 if(control.ledger_bytes){
  const t=sample.work.testing_strategy,template=t.human_review.cases[0];
  t.human_review.cases=Array.from({length:65},(_,i)=>({...structuredClone(template),id:i===0?template.id:'H'+i+'x'.repeat(200)}));
  while(sizeLedger(sample.work).ledger_budget.projection_bytes>16384)t.human_review.cases.pop();
  let remaining=control.ledger_bytes-sizeLedger(sample.work).ledger_budget.projection_bytes;
  for(const c of t.human_review.cases.slice(1)){const n=Math.min(255-c.id.length,remaining);c.id+='x'.repeat(n);remaining-=n;}
  t.human_review.no_ai_cases_reason+='x'.repeat(remaining);
 }
 return sample;
}
const schedulingADF=work=>JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:stringify(work)}]}]});
for(const name of ['mixed','human'])test('PGB-159 accepts '+name+' scheduling through value, raw and ADF without context',()=>{
 const inputs=schedulingFixture(),work=inputs.variants[name],before=JSON.stringify(inputs);
 const results=[schedule(work,inputs),validateWork(stringify(work),{mode:'scheduling',configInput:stringify(inputs.config),schedulingInput:stringify(inputs.facts)}),validateWork(schedulingADF(work),{mode:'scheduling',format:'adf',configInput:JSON.stringify(inputs.config),schedulingInput:JSON.stringify(inputs.facts)})];
 for(const result of results){assert.equal(result.valid,true,JSON.stringify(result.diagnostics));assert.equal(result.scheduling_semantics_valid,true);assert.equal(result.execution_authorized,false);assert.equal(result.start_semantics_valid,null);assert.equal(result.ledger_budget.ai_steps,name==='mixed'?4:0);assert.equal(result.ledger_budget.human_cases,1);assert.equal(result.ledger_budget.omitted_entries,0);assert.equal(result.ledger_budget.actual_publication,'not_evaluated');assert.deepEqual(result.start_diagnostics,[]);assert.equal(result.readiness,'not_evaluated');}
 assert.equal(validateValue(work,{mode:'start'}).valid,false);
 const complete=clone(name);complete.work=work;refresh(complete);assert.equal(run(complete).valid,true,JSON.stringify(run(complete).diagnostics));
 assert.equal(JSON.stringify(inputs),before);
});
for(const control of fixtures.scheduling.negatives)test('PGB-159 H02 declaration rejects '+control.name,()=>{
 const sample=schedulingControl(control),before=JSON.stringify(sample);
 for(const result of [schedule(sample.work,sample),validateWork(JSON.stringify(sample.work),{mode:'scheduling',configInput:JSON.stringify(sample.config),schedulingInput:JSON.stringify(sample.facts)})]){
  assert.equal(result.valid,false);assert(result.diagnostics.some(d=>d.code===control.code&&(d.path===control.path||d.path.startsWith(control.path+'/'))),JSON.stringify(result.diagnostics));
  if(control.code==='VALUE'){assert.equal(result.scheduling_semantics_valid,null);assert.equal(result.start_structure_valid,false);}else{assert.equal(result.scheduling_semantics_valid,false);assert.equal(result.start_structure_valid,true);}
  if(control.ledger_bytes){assert.equal(result.ledger_budget.projection_bytes,16385);assert.equal(result.ledger_budget.omitted_entries,0);}
 }
 assert.equal(JSON.stringify(sample),before);
});
test('PGB-159 keeps legacy result shapes and rejects mixed-purpose inputs',()=>{
 const inputs=schedulingFixture(),work=inputs.variants.mixed;
 const expected=['schema','mode','format','document_schema','valid','draft_valid','start_structure_valid','start_semantics_valid','validation_scope','ledger_budget','readiness','diagnostics','start_diagnostics'].sort();
 for(const mode of ['draft','structure','start']){
  const old=validateValue(fixtures.mixed.work,{mode,...(mode==='start'?{context:fixtures.mixed.context}:{})});assert.equal(old.valid,true);assert.deepEqual(Object.keys(old).sort(),expected);
  for(const extra of [{config:inputs.config},{scheduling:inputs.facts},{configInput:'{}'},{schedulingInput:'{}'}])assert.equal(validateValue(work,{mode,...extra}).diagnostics[0].code,'USAGE');
 }
 for(const extra of [{context:{}},{contextInput:'{}'},{configInput:'{}'},{schedulingInput:'{}'}]){const result=validateValue(work,{mode:'scheduling',config:inputs.config,scheduling:inputs.facts,...extra});assert.equal(result.valid,false);assert.equal(result.diagnostics[0].code,'USAGE');assert.equal(result.execution_authorized,false);}
 for(const extra of [{config:inputs.config},{scheduling:inputs.facts}])assert.equal(validateWork(stringify(work),{mode:'scheduling',configInput:stringify(inputs.config),schedulingInput:stringify(inputs.facts),...extra}).diagnostics[0].code,'USAGE');
});
test('PGB-159 canonical selection, related obligations and closed auxiliary failures are distinct',()=>{
 const inputs=schedulingFixture(),work=inputs.variants.mixed;
 for(const change of [s=>s.facts.subject.site='https://elsewhere.example.invalid',s=>s.facts.subject.project_id='999']){const s=schedulingFixture();change(s);const result=schedule(s.variants.mixed,s);assert.equal(result.scheduling_semantics_valid,false);assert.equal(result.diagnostics[0].path,'/scheduling/subject');}
 for(const change of [s=>s.facts.extra='sensitive',s=>delete s.facts.related_changes,s=>s.facts.subject.project_id='APP',s=>s.facts.subject.project_id='1'.repeat(256),s=>s.facts.schema='wrong']){const s=schedulingFixture();change(s);const result=schedule(s.variants.mixed,s);assert.equal(result.valid,false);assert.equal(result.scheduling_semantics_valid,null);assert.equal(result.ledger_budget,null);assert(result.diagnostics.every(d=>d.path.startsWith('/scheduling')));}
 const bad=schedulingFixture();bad.config.defaults['secret-key']='secret-value';const result=schedule(work,bad);assert.equal(result.scheduling_semantics_valid,null);assert(!JSON.stringify(result).includes('secret-key'));assert(!JSON.stringify(result).includes('secret-value'));assert(!JSON.stringify(schedule(work,inputs)).includes('resolved_scope'));
 const obligation=schedulingFixture();obligation.facts.related_changes=[{repository:inputs.config.defaults.repositories[0],change_story:'EX-2'}];assert(schedule(work,obligation).diagnostics.some(d=>d.path==='/technical_acceptance_criteria/repository/related_repositories'));
 const local=schedulingFixture();local.config.projects[0].inherit=local.config.projects[0].inherit.filter(s=>s!=='repositories');local.config.projects[0].mappings.repositories=['https://example.invalid/local'];assert.equal(schedule(work,local).scheduling_semantics_valid,false);
});
test('PGB-159 SQL declaration and observation bounds do not fabricate execution proof',()=>{
 const inputs=schedulingFixture(),work=inputs.variants.mixed,db=work.testing_strategy.cases[0].steps[2].database;
 for(const bindings of [[{input:'record_id',index:1},{input:'record_id',index:1}],[{input:'missing',index:1}]]){db.parameter_bindings=bindings;assert(schedule(work,inputs).diagnostics.some(d=>d.code==='DATABASE_PARAMETERS'));}
 db.parameter_bindings=[{input:'record_id',index:1}];db.parameters=['tenant',null];db.parameters_preparation_id=null;assert.equal(schedule(work,inputs).valid,true);
 for(const parameters of [['tenant'],['tenant','not-null']]){db.parameters=parameters;assert(schedule(work,inputs).diagnostics.some(d=>d.code==='DATABASE_PARAMETERS'));}
 const asynchronous=schedulingFixture();assert.equal(schedule(asynchronous.variants.asynchronous_database,asynchronous).valid,true);
 const offset=schedulingFixture();offset.variants.asynchronous_database.testing_strategy.cases[0].observation.schedule=[1,25];
 const structural=schedule(offset.variants.asynchronous_database,offset);
 assert.equal(structural.valid,false);
 assert.equal(structural.start_structure_valid,false);
 assert.equal(structural.scheduling_semantics_valid,null);
 assert.equal(structural.ledger_budget,null);
 assert(structural.diagnostics.some(d=>d.code==='VALUE'&&d.path==='/testing_strategy/cases/0/observation/schedule/0'));
 for(const observation of [{schedule:[0,0]},{deadline_seconds:44},{step:'missing-step'}]){const s=schedulingFixture();Object.assign(s.variants.asynchronous_database.testing_strategy.cases[0].observation,observation);assert(schedule(s.variants.asynchronous_database,s).diagnostics.some(d=>d.code==='OBSERVATION'));}
});
test('PGB-159 raw and JS scheduling numeric provenance, bounds and ADF locations remain separate',()=>{
 const inputs=schedulingFixture(),work=inputs.variants.mixed;work.testing_strategy.cases[0].steps[0].inputs.large=1e20;
 const raw=stringify(work).replace('large: 100000000000000000000','large: 1e20');
 assert.equal(validateWork(raw,{mode:'scheduling',configInput:stringify(inputs.config),schedulingInput:stringify(inputs.facts)}).valid,true);
 assert.equal(schedule(work,inputs).diagnostics[0].code,'NUMBER');
 for(const schedulingInput of ['broken: [',JSON.stringify(inputs.facts)+' '.repeat(65536),JSON.stringify({...inputs.facts,prerequisite_graph:Array(101).fill(inputs.facts.prerequisite_graph[0])})]){
  const result=validateWork(schedulingADF(inputs.variants.human),{mode:'scheduling',format:'adf',configInput:stringify(inputs.config),schedulingInput});assert.equal(result.valid,false);assert.equal(result.scheduling_semantics_valid,null);assert(result.diagnostics.every(d=>d.path.startsWith('/scheduling')&&!Object.hasOwn(d,'block')));
 }
 const result=validateWork(schedulingADF(inputs.variants.human),{mode:'scheduling',format:'adf',configInput:'secret: value',schedulingInput:'broken: ['});assert.equal(result.diagnostics[0].path,'/config/schema');assert(!Object.hasOwn(result.diagnostics[0],'block'));
 const invalid=structuredClone(inputs.variants.human);invalid.problem_to_solve=null;const structural=validateWork(schedulingADF(invalid),{mode:'scheduling',format:'adf',configInput:'broken: [',schedulingInput:'broken: ['});assert.equal(structural.diagnostics[0].block,0);assert.equal(structural.scheduling_semantics_valid,null);
});
test('PGB-159 source CLI handles two positives, twelve negatives and safe setup failures from unrelated cwd',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'pgb159-cli-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const work=path.join(dir,'work.json'),config=path.join(dir,'config.json'),facts=path.join(dir,'scheduling.json');
 const command=(extra=[],readable=false)=>{const c=spawnSync(process.execPath,[cli,'--mode','scheduling','--input',work,'--config',config,'--scheduling',facts,...extra,...(readable?[]:['--json'])],{cwd:dir,encoding:'utf8',timeout:30000});return {...c,...(readable?{}:{result:JSON.parse(c.stdout)})};};
 const save=async sample=>{await writeFile(work,JSON.stringify(sample.work));await writeFile(config,JSON.stringify(sample.config));await writeFile(facts,JSON.stringify(sample.facts));};
 for(const name of ['mixed','human']){
  const sample=schedulingFixture();await save({...sample,work:sample.variants[name]});const before=await Promise.all([work,config,facts].map(p=>readFile(p,'utf8')));
  const c=command();assert.equal(c.status,0,c.stdout);assert.equal(c.result.purpose,'scheduling');assert.equal(c.result.execution_authorized,false);
  const readable=command([],true);assert.equal(readable.status,0);assert.match(readable.stdout,/Scheduling declarations passed/);assert.match(readable.stdout,/human Ready to Work are not evaluated/);
  assert.deepEqual(await Promise.all([work,config,facts].map(p=>readFile(p,'utf8'))),before);
 }
 for(const control of fixtures.scheduling.negatives){await save(schedulingControl(control));const c=command();assert.equal(c.status,1,c.stdout);assert(c.result.diagnostics.some(d=>d.code===control.code&&(d.path===control.path||d.path.startsWith(control.path+'/'))),c.stdout);const readable=command([],true);assert.equal(readable.status,1);assert.match(readable.stdout,/Scheduling declarations failed/);}
 const sample=schedulingFixture();await save({...sample,work:sample.variants.human});
 await writeFile(config,'secret-key: secret-value');let c=command();assert.equal(c.status,2);assert.equal(c.result.diagnostics[0].path,'/config/schema');assert(!c.stdout.includes('secret-key'));assert(!c.stdout.includes('secret-value'));
 await writeFile(config,JSON.stringify(sample.config));await writeFile(facts,'broken: [');c=command();assert.equal(c.status,2);assert.equal(c.result.scheduling_semantics_valid,null);assert(c.result.diagnostics[0].path.startsWith('/scheduling'));
 await rm(config);await rm(facts);await writeFile(work,JSON.stringify({...sample.variants.human,problem_to_solve:null}));c=command();assert.equal(c.status,1);assert.equal(c.result.start_structure_valid,false);assert.equal(c.result.scheduling_semantics_valid,null);assert.equal(c.result.execution_authorized,false);
 await writeFile(work,JSON.stringify(sample.variants.human));c=command();assert.equal(c.status,2);assert.equal(c.result.diagnostics[0].path,'/config');assert.equal(c.result.execution_authorized,false);
 for(const extra of [['--context','unreadable'],['--config',config],['--unknown']]){c=command(extra);assert.equal(c.status,2);assert.equal(c.result.diagnostics[0].code,'USAGE');assert.equal(c.result.mode,'scheduling');assert.equal(c.result.execution_authorized,false);}
 await writeFile(config,JSON.stringify(sample.config));await writeFile(facts,JSON.stringify(sample.facts));c=command(['--scheduling',dir]);assert.equal(c.status,2); // duplicate option fails before reading
 const directory=spawnSync(process.execPath,[cli,'--mode','scheduling','--input',work,'--config',config,'--scheduling',dir,'--json'],{cwd:dir,encoding:'utf8',timeout:30000});assert.equal(directory.status,2);assert.equal(JSON.parse(directory.stdout).diagnostics[0].path,'/scheduling');
 const help=spawnSync(process.execPath,[cli,'--help','--json'],{cwd:dir,encoding:'utf8',timeout:30000});assert.equal(help.status,0);assert.deepEqual(JSON.parse(help.stdout).modes,['draft','structure','scheduling','start']);assert(JSON.parse(help.stdout).schemas.includes('pigboard-work-scheduling/v1'));
});
test('PGB-159 source config/work import orders and canonical config CLI remain usable',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'pgb159-import-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const configURL=new URL('../lib/config/parse.mjs',import.meta.url).href,workURL=new URL('../lib/contracts/work.mjs',import.meta.url).href;
 for(const order of [[configURL,workURL],[workURL,configURL]]){
  const program=`await import(${JSON.stringify(order[0])});const second=await import(${JSON.stringify(order[1])});const runtime=await import(${JSON.stringify(workURL)});const fixture=JSON.parse((await import('node:fs')).readFileSync(${JSON.stringify(new URL('./fixtures/work-semantics.json',import.meta.url).pathname)},'utf8')).scheduling;const result=runtime.validateValue(fixture.variants.mixed,{mode:'scheduling',config:fixture.config,scheduling:fixture.facts});if(!result.valid)throw Error(JSON.stringify(result.diagnostics));`;
  const c=spawnSync(process.execPath,['--input-type=module','--eval',program],{cwd:dir,encoding:'utf8',timeout:30000});assert.equal(c.status,0,c.stderr);
 }
 const config=path.join(dir,'config.json');await writeFile(config,JSON.stringify(fixtures.scheduling.config));
 const c=spawnSync(process.execPath,[new URL('../scripts/check-config.mjs',import.meta.url).pathname,'--input',config,'--json'],{cwd:dir,encoding:'utf8',timeout:30000});assert.equal(c.status,0,c.stdout+c.stderr);assert.equal(JSON.parse(c.stdout).valid,true);
});
