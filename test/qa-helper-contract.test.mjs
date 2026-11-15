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
  const manifest=JSON.parse(await read('config/skill-bundle.json'));assert.equal(manifest.skills.length,15);assert(!JSON.stringify(manifest).includes('qa-helper-case'));
  for(const [file,expected] of [['skills/qa-bruno/scripts/package.json','4.2.1'],['skills/qa-database/scripts/package.json','8.23.1']])assert(Object.values(JSON.parse(await read(file)).dependencies).includes(expected));
  const hash=createHash('sha256').update(await read('skills/qa-database/scripts/read-postgres.mjs')).digest('hex');assert.equal(hash,'7dad94032016c48210ea115d0a62a7632d50f8193fb2fa621376e60b9f64f0d7');
});
