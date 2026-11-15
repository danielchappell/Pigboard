import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { validateWork } from '../lib/contracts/work.mjs';
import { readDatabase, connectionConfig, safeError, QaError } from '../skills/qa-database/scripts/read-postgres.mjs';
import { prepareFixture, serveFixture, query } from './fixtures/qa-helper-case.mjs';

const read = p => readFile(new URL('../' + p, import.meta.url), 'utf8');
async function fixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'pgb-qa-contract-'));
  t.after(() => rm(dir, { recursive:true, force:true }));
  await prepareFixture(dir);
  return { dir, work:JSON.parse(await readFile(path.join(dir,'work.yaml'))), context:JSON.parse(await readFile(path.join(dir,'facts.yaml'))) };
}
const validate = ({work,context}) => validateWork(JSON.stringify(work), {mode:'start',contextInput:JSON.stringify(context)});
const refreshContracts = packet => { packet.context.operations.forEach(o => {o.contract=structuredClone(packet.work.testing_strategy.cases[0].steps.find(s=>s.id===o.step));}); };

test('fixed helper preparation preserves an exact full valid AI packet without claiming readiness', async t => {
  const p = await fixture(t), result=validate(p);
  assert.equal(result.valid,true,JSON.stringify(result.diagnostics));
  assert.deepEqual(p.work.testing_strategy.dispatch_order,['E01.S1','E01.S3','E01.S4']);
  const [parent,child,db,ui]=p.work.testing_strategy.cases[0].steps;
  assert.deepEqual(parent.children,[child.id]);assert.equal(child.caller,parent.id);
  assert.deepEqual(parent.api,child.api);assert.deepEqual(db.database.parameters,['tenant-a',null]);
  assert.deepEqual(db.bindings,[{from_step:'E01.S1',output:'record_id',to_input:'record_id'}]);
  assert.deepEqual(db.database.parameter_bindings,[{input:'record_id',index:1}]);
  assert.equal(ui.ui.viewport.mode,'supplied_default');assert.equal(ui.ui.screenshot_checkpoints.length,3);
  assert.equal(JSON.parse(await readFile(path.join(p.dir,'preparation.json'))).state,'NOT_READY');
  assert.equal(await readFile(path.join(p.dir,'query.sql'),'utf8'),query);
  assert.equal((await stat(path.join(p.dir,'response.json'))).mode&0o777,0o600);
  await assert.rejects(prepareFixture(p.dir)); // Never overwrite a frozen preparation.
});

test('real start validator rejects changed operation, late/undeclared bindings and SQL binding errors', async t => {
  const base=await fixture(t);
  const variants=[
    [p=>{p.context.operations[2].contract.action='Unreviewed action';},'CONTEXT_OPERATION'],
    [p=>{p.work.testing_strategy.cases[0].steps[2].bindings[0].from_step='E01.S4';refreshContracts(p);},'BINDING'],
    [p=>{p.work.testing_strategy.cases[0].steps[2].bindings[0].output='undeclared';refreshContracts(p);},'BINDING'],
    [p=>{p.work.testing_strategy.cases[0].steps[2].database.parameter_bindings.push({input:'record_id',index:1});refreshContracts(p);},'DATABASE_PARAMETERS'],
    [p=>{p.work.testing_strategy.cases[0].steps[2].database.parameter_bindings[0].index=2;refreshContracts(p);},'DATABASE_PARAMETERS'],
    [p=>{p.work.testing_strategy.cases[0].steps[2].database.parameters[1]='invented';refreshContracts(p);},'DATABASE_PARAMETERS'],
    [p=>{p.context.operations[2].read_only=false;},'DATABASE_READ_ONLY'],
    [p=>{p.work.testing_strategy.cases[0].steps[2].database.engine='mysql';refreshContracts(p);},null],
  ];
  for(const [change,code] of variants){const p=structuredClone(base);change(p);const r=validate(p);assert.equal(r.valid,false,JSON.stringify(r));if(code)assert(r.diagnostics.some(d=>d.code.includes(code)),JSON.stringify(r.diagnostics));}
  // A literal unbound null is distinct from a null placeholder receiving an output.
  const intentional=structuredClone(base);intentional.work.testing_strategy.cases[0].steps[2].database.parameters.push(null);intentional.context.operations[2].parameter_count=3;refreshContracts(intentional);
  assert.equal(validate(intentional).valid,true);
  const malformed=structuredClone(base);malformed.work.testing_strategy.cases[0].steps[2].database.parameter_bindings[0].index=-1;refreshContracts(malformed);assert.equal(validate(malformed).valid,false);
});

const context = {environment:'test',stage:'pgb77-local',targetIdentityEvidence:'fixture://actual-target',readOnlyRoleEvidence:'fixture://actual-role',database:{host:'127.0.0.1',port:5432,name:'pgb77_fixture',user:'qa_reader'}};
const rawUrl='postgresql://qa_reader:synthetic-private-password@127.0.0.1:5432/pgb77_fixture';
const input = (params=['tenant-a','record-001']) => ({context,rawUrl,tls:{ca:'prepared CA',servername:'localhost'},sql:query,params});
function driver({rows=[{record_id:'record-001',tenant_id:'tenant-a',state:'ready'}],role={},failAt}={}) {
  const calls=[];let config;
  const client={on(){},async connect(){calls.push('connect');if(failAt==='connect')throw Error('private connection failure');},async query(statement){calls.push(statement);if(failAt===statement||failAt==='observe'&&typeof statement==='object')throw Object.assign(Error('private payload and password'),{code:'42501'});if(typeof statement==='string'&&statement.startsWith('SELECT current_user'))return {rows:[{role:'qa_reader',rolsuper:false,rolcreaterole:false,rolcreatedb:false,rolreplication:false,rolbypassrls:false,...role}]};return {rows};},async end(){calls.push('end');if(failAt==='end')throw Error('private close failure');}};
  return {calls,makeClient:c=>{config=c;return client;},get config(){return config;}};
}

test('unchanged reader uses extended values, existing wrapper/read-only order and complete rollback/close',async()=>{
  const params=['tenant-a',"record-001'); DELETE FROM records; --",null],d=driver();
  const original=structuredClone(params),before=query;
  const result=await readDatabase(input(params),d.makeClient);
  assert.equal(result.status,'OBSERVED');assert.equal(result.rowCount,1);assert.equal(result.truncated,false);assert(!('testVerdict'in result));
  assert.equal(d.calls[0],'connect');assert.equal(d.calls[1],'BEGIN READ ONLY');assert.equal(d.calls[2],"SET LOCAL statement_timeout = '5s'");assert.match(d.calls[3],/^SELECT current_user/);
  const operation=d.calls[4];assert.equal(operation.queryMode,'extended');assert.deepEqual(operation.values,original);assert(!operation.text.includes(params[1]));assert.equal(operation.text,`SELECT * FROM (\n${query.trim()}\n) AS qa_observation LIMIT 201`);
  assert.deepEqual(d.calls.slice(5),['ROLLBACK','end']);assert.deepEqual(params,original);assert.equal(query,before);
  assert.equal(d.config.ssl.rejectUnauthorized,true);assert.equal(d.config.ssl.servername,'localhost');assert.equal(d.config.connectionTimeoutMillis,5000);assert.equal(d.config.query_timeout,5000);assert.equal(d.config.statement_timeout,5000);assert.equal(d.config.lock_timeout,2000);assert.equal(d.config.idle_in_transaction_session_timeout,7000);assert.equal(d.config.options,'-c default_transaction_read_only=on');
});

test('reader target/TLS/role guards reject without observation and retain safe cleanup',async()=>{
  for(const override of [
    {rawUrl:rawUrl+'?sslmode=disable'}, {context:{...context,environment:'production'}},
    {context:{...context,readOnlyRoleEvidence:''}}, {context:{...context,database:{...context.database,user:'admin'}}},
    {sql:'DELETE FROM qa_fixture.records'},
    {rawUrl:'postgresql://qa_reader:secret@localhost:5432/pgb77_fixture',context:{...context,database:{...context.database,host:'localhost'}},tls:{servername:'different.local'}},
  ]) {let made=false;await assert.rejects(readDatabase({...input(),...override},()=>{made=true;return driver().makeClient({});}));assert.equal(made,false);}
  for(const flag of ['rolsuper','rolcreaterole','rolcreatedb','rolreplication','rolbypassrls']){
    const d=driver({role:{[flag]:true}});await assert.rejects(readDatabase(input(),d.makeClient),/PRIVILEGED_OR_UNKNOWN_DATABASE_ROLE/);assert.equal(d.calls.filter(v=>typeof v==='object').length,0);assert.deepEqual(d.calls.slice(-2),['ROLLBACK','end']);
  }
  const cfg=connectionConfig(context,rawUrl);assert.equal(cfg.ssl.rejectUnauthorized,true);
});

test('reader truncation and failed observations/rollback/close never become product PASS',async()=>{
  const d=driver({rows:Array.from({length:201},(_,i)=>({record_id:String(i)}))});
  const result=await readDatabase(input(),d.makeClient);assert.equal(result.rows.length,200);assert.equal(result.rowCount,200);assert.equal(result.truncated,true);
  for(const failAt of ['connect','observe','ROLLBACK','end']){
    const d=driver({failAt});await assert.rejects(readDatabase(input(),d.makeClient),e=>{const safe=safeError(e);assert.equal(safe.status,'INCOMPLETE');assert(!JSON.stringify(safe).includes('private'));return true;});assert.equal(d.calls.at(-1),'end');if(failAt!=='connect')assert(d.calls.includes('ROLLBACK'));
  }
  assert.deepEqual(safeError(new QaError('VERIFIED_ACCESS_CONTEXT_REQUIRED')),{status:'INCOMPLETE',error:'VERIFIED_ACCESS_CONTEXT_REQUIRED'});
  assert.deepEqual(safeError(Object.assign(Error(rawUrl),{code:'42501'})),{status:'INCOMPLETE',error:'DATABASE_OR_TOOL_ERROR',sqlState:'42501'});
});

test('fixed server serves only local prepared routes and records real requests without an oracle',async t=>{
  const p=await fixture(t),{server,receipt}=await serveFixture(p.dir,{port:0});t.after(()=>new Promise(resolve=>server.close(resolve)));
  assert.equal(server.address().address,'127.0.0.1');const url=`http://127.0.0.1:${receipt.port}`;
  const body=await(await fetch(url+'/api/record')).json();assert.deepEqual(body,{record_id:'record-001',tenant_id:'tenant-a',state:'ready'});
  assert.match(await(await fetch(url+'/ui')).text(),/Record ID/);assert.equal((await fetch(url+'/unselected')).status,418);assert.equal((await fetch(url+'/query.sql')).status,404);
  const audit=(await readFile(receipt.auditFile,'utf8')).trim().split('\n').map(JSON.parse);assert.deepEqual(audit.map(x=>x.path),['/api/record','/ui','/unselected','unrecognized']);assert(audit.every(x=>x.at&&x.method==='GET'&&!('testVerdict'in x)));
  assert.equal(await readFile(path.join(p.dir,'query.sql'),'utf8'),query);
});

test('shared instruction/reference closure keeps exact ownership, observations and retained entrypoint boundary explicit',async()=>{
  const common=await read('skills/qa-api/references/structured-steps.md');
  for(const name of ['qa-api','qa-bruno','qa-database','qa-ui']){
    const skill=await read(`skills/${name}/SKILL.md`);assert(skill.includes('structured-steps.md'));assert(skill.includes('BLOCKED'));assert.match(skill,/revision/i);
  }
  for(const term of ['read_only: true','original raw','testVerdict','NOT_RUN','supplied/mock','human case','configured_target','before success','No expression evaluation','one Bruno child','20-second','canonical ledger enum'])assert(common.includes(term),term);
  const api=await read('skills/qa-api/SKILL.md');assert(api.includes('exactly one prescribed'));assert(!api.includes('If another approved execution'));
  const db=await read('skills/qa-database/SKILL.md');assert(db.includes('parameter_bindings'));assert(db.includes('zero-based'));assert(!db.includes('different engine requires'));
  const ui=await read('skills/qa-ui/SKILL.md');assert(ui.includes('supplied_default'));assert(ui.includes('ui.screenshot_checkpoints'));assert(ui.includes('transient image display'));
  for(const p of ['skills/qa-entrypoint/SKILL.md','skills/qa-entrypoint/references/execution-record.md'])assert((await read(p)).includes('PGB-78'));
  const manifest=JSON.parse(await read('config/skill-bundle.json'));
  for(const name of ['qa-entrypoint','qa-api','qa-bruno','qa-database','qa-ui','human-writing','write-pr-sized-stories'])assert(manifest.skills.includes(name),`required QA skill missing: ${name}`);
  assert(!JSON.stringify(manifest).includes('qa-helper-case'));
  for(const [file,expected] of [['skills/qa-bruno/scripts/package.json','4.2.1'],['skills/qa-database/scripts/package.json','8.23.1']])assert(Object.values(JSON.parse(await read(file)).dependencies).includes(expected));
  const hash=createHash('sha256').update(await read('skills/qa-database/scripts/read-postgres.mjs')).digest('hex');assert.equal(hash,'7dad94032016c48210ea115d0a62a7632d50f8193fb2fa621376e60b9f64f0d7');
});

test('PGB-113 source amendment preserves native contracts, full preview and pending other-owner publication',async()=>{
 const drafts=JSON.parse(await read('docs/delivery/manager-r1/ticket-drafts.json')),metadata=JSON.parse(await read('docs/delivery/manager-r1/plan-metadata.json')),publication=JSON.parse(await read('docs/delivery/manager-r1/publication.json'));
 const ids=['R1-01','R1-02','R1-03','R1-04','R1-21','R1-05','R1-06','R1-07','R1-08','R1-09','R1-10','R1-25','R1-11','R1-12','R1-13','R1-14','R1-15','R1-16','R1-22','R1-23','R1-17','R1-18','R1-19','R1-20'];
 assert.deepEqual(drafts.map(x=>x.id),ids);assert.deepEqual(metadata.map(x=>x.id),ids);assert.equal(new Set(ids).size,24);
 const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),contract=id=>drafts.find(x=>x.id===id).contract,plan=id=>metadata.find(x=>x.id===id),preview=contract('R1-11');
 // Fixed original335036 object hashes, frozen before source publication edits.
 assert.equal(hash(preview.acceptance_criteria),'1ee61a851ab66f31145a483f68c8bc1bb83dfd9e3422d3caaf4cb7e11e059639');
 assert.equal(hash(preview.technical_acceptance_criteria),'4929e0feaf998f0a0bca191409dff3dd0c902350e8e4efea59a10e99a87cbdce');
 assert.equal(hash(preview.testing_strategy),'efacc7e0fe916c48cb664d75748883054e694a60de119a7c5783aefdd3ea09db');
 assert.equal(preview.testing_strategy.human_review.cases.length,42);
 assert.equal(hash(contract('R1-12')),'b33f93b3b47fa68e023c06e2e340047219090ee365712633823d19deab9d7813');
 assert.equal(hash(drafts.filter(x=>!['R1-11','R1-25'].includes(x.id))),'a6e266f99e7ab85fb7b0e3b0475f5228f71cd4662579955c363e41ccdb56af7b');
 assert.equal(hash(metadata.filter(x=>!['R1-11','R1-25'].includes(x.id))),'0b6f7ca4170a3ec06b9926197c11cca2de7f18660e65e80b0a3aba86cfd7a714');
 const native113=structuredClone(contract('R1-25'));native113.prerequisites[0].ticket='PGB-80';assert.equal(hash(native113),'36bdc9fc15aa1dfc69db7e8f9d81e1ff3d089fb43d876aa9df37734ab0b9052a');
 assert.deepEqual(contract('R1-25').prerequisites,[{ticket:'R1-10',required_outcome:'ai_qa_complete'}]);assert.deepEqual(preview.prerequisites,[{ticket:'R1-10',required_outcome:'ai_qa_complete'},{ticket:'R1-25',required_outcome:'ai_qa_complete'}]);
 assert.deepEqual(plan('R1-25').dependencies,['R1-10']);assert.deepEqual(plan('R1-11').dependencies,['R1-10','R1-25']);assert.deepEqual(plan('R1-12').dependencies,['R1-11','R1-21']);assert.deepEqual([plan('R1-25').days,plan('R1-25').files.length,plan('R1-11').days,plan('R1-11').files.length],[1.98,15,1.7,19]);
 assert.equal(drafts.reduce((n,x)=>n+x.contract.testing_strategy.cases.length+x.contract.testing_strategy.human_review.cases.length,0),107);
 for(const id of ['R1-25','R1-11']){const r=validateWork(JSON.stringify(contract(id)),{mode:'structure'});assert.equal(r.valid,true,JSON.stringify(r.diagnostics));assert.equal(r.readiness,'not_evaluated');}
 const baseline=structuredClone(publication);delete baseline.repeated_parent_amendment;delete baseline.current_source_scope;assert.equal(hash(baseline),'aeeaa43078df97c68c580211cdc9bb8bca05d0f06161d004626c87c55b93d20a');
 assert.deepEqual([publication.story_count,publication.case_count,publication.requirement_count,publication.scenario_count],[23,104,53,41]);
 const current=publication.current_source_scope;assert.deepEqual([current.story_count,current.case_count,current.native_story_count,current.native_case_count],[24,107,25,110]);assert.deepEqual(current.pending_source_amendments,[{local_id:'R1-24',ticket:'PGB-110',owner:'Skills',status:'source publication pending'}]);
 const amendment=publication.repeated_parent_amendment,mapping={...publication.stories,...amendment.stories};assert.equal(mapping['R1-25'],'PGB-113');assert.equal(Object.keys(mapping).length,24);assert.equal(new Set(Object.values(mapping)).size,24);assert(!('R1-24'in mapping));
 assert.deepEqual(amendment.dependency_links,[{id:'10685',from:'PGB-80',to:'PGB-113'},{id:'10686',from:'PGB-113',to:'PGB-81'}]);assert.deepEqual(amendment.preserved_links,[{id:'10637',from:'PGB-80',to:'PGB-81'},{id:'10638',from:'PGB-81',to:'PGB-82'}]);assert.equal(amendment.human_acceptance,'NOT_RUN');assert.equal(amendment.activation_authorized,false);
 assert.deepEqual(amendment.description_sha256,{original:'edf424525be88eba96d937ae88605d031b012f412b9155787470b6086aa9c497',validator:'c987a76d937e7d162dec793c4f840079206342460d2c406d28a8a27caf02acd8',final_preview:'8b2f146d4bfec454d297c8cd9cec1aa5c42bba7cd1d2cbf2b41294d527113dfe'});
 for(const file of ['docs/delivery/manager-r1/coverage.md','docs/product/coverage.md']){const text=await read(file),requirements=text.split('\n').filter(line=>/^\| [AWMO]\d\d/.test(line)),covered=new Set(requirements.flatMap(line=>line.split('|')[1].match(/[AWMO]\d\d/g)??[]));assert.deepEqual([...covered].sort(),['A','W','M','O'].flatMap((prefix,i)=>Array.from({length:[12,12,14,15][i]},(_,j)=>prefix+String(j+1).padStart(2,'0'))).sort());for(const id of ['W04','W12','M10']){const row=requirements.find(line=>line.startsWith('| '+id+' |'));for(const caseId of ['R1-25-C01','R1-25-C02','R1-25-C03'])assert(row.includes(caseId));}assert(text.includes('R1-11-H02'));}
 const stories=await read('docs/delivery/manager-r1/stories.md');assert(stories.indexOf('## R1-25:')<stories.indexOf('## R1-11:'));for(const c of contract('R1-25').testing_strategy.human_review.cases){assert(stories.includes(c.id));for(const key of ['prerequisites','steps','expected','evidence'])for(const value of c[key])assert(stories.includes(value));}
 const bundle=JSON.parse(await read('config/skill-bundle.json'));for(const name of ['qa-entrypoint','qa-api','qa-bruno','qa-database','qa-ui','human-writing','write-pr-sized-stories'])assert(bundle.skills.includes(name));assert(!JSON.stringify(bundle).includes('qa-helper-case'));assert(!JSON.stringify(bundle).includes('handoff-chains'));
});
