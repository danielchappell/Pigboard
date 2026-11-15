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

// Real canonical boundary checks below consume fixed preparation data. They do
// not execute qa-jira instructions or treat expected cards as observed output.
import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { parse, stringify } from 'yaml';
import { prepareQaFixture } from './fixtures/qa-helper-case.mjs';
import { records, targetRecord, changeTarget } from './fixtures/qa-partial-results.mjs';
import { validateReceiptChain } from '../lib/contracts/receipts.mjs';
import { validateHandoff, extractHandoff, digestValue } from '../lib/contracts/handoff.mjs';
import { parseConfig } from '../lib/config/parse.mjs';
const chain = e => validateReceiptChain(JSON.stringify(e));
const hash = v => createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
async function publisher(t) {
  const parent=await mkdtemp(path.join(tmpdir(),'pgb-publisher-'));t.after(()=>rm(parent,{recursive:true,force:true}));
  const prepared=await prepareQaFixture(path.join(parent,'private'));
  const input=async(id,file)=>JSON.parse(await readFile(path.join(prepared.cases[id],file),'utf8'));
  return {...prepared,input};
}

test('publisher preparation is private/exclusive, fixed, source-only and leaves every output empty',async t=>{
 const p=await publisher(t);
 assert.equal(p.ready,false);assert.equal((await stat(p.runDir)).mode&0o777,0o700);
 await assert.rejects(prepareQaFixture(p.runDir),/exist/i);
 const bad=path.join(p.runDir,'unsupported');await assert.rejects(prepareQaFixture(bad,{suite:'dispatch'}),/Unsupported/);await assert.rejects(stat(bad));
 await assert.rejects(prepareQaFixture('relative-path'),/absolute/);
 for(const [id,dir]of Object.entries(p.cases)){
  assert.deepEqual(await readdir(path.join(dir,'output')),[],id);
  assert.equal((await stat(path.join(dir,'inputs/assessment.json'))).mode&0o777,0o600);
  const cards=await p.input(id,'operator/cards.json');assert(cards.notice.includes('MOCK'));
  assert.equal(cards.readback.body,'MANUAL_ECHO_ACTUAL_SUBMITTED_TRANSPORT_ONLY');
  const terminal=targetRecord(await p.input(id,'operator/validator-inputs/published.json'));
  assert(!cards.reads.comments.filter(page=>page.ticket_id===terminal.ticket_id).flatMap(page=>page.comments).some(c=>JSON.parse(JSON.parse(c.body).content[0].content[0].text).record_id===terminal.record_id),'no current terminal candidate in cards: '+id);
 }
 const png=await readFile(path.join(p.cases['H01-story'],'inputs/evidence/mock.png'));
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),440);assert.equal(png.readUInt32BE(20),130);
 assert((await readFile(path.join(p.runDir,'manual-echo.md'),'utf8')).includes('unchanged submitted body'));
});

test('prepared native Story/Bug mixed reports raw-start and complete canonical chains validate with exact humans',async t=>{
 const p=await publisher(t);
 for(const id of ['H01-story','H01-bug']){
  const input=path.join(p.cases[id],'inputs');
  const raw=await readFile(path.join(input,'work.yaml'),'utf8'),facts=await readFile(path.join(input,'facts.yaml'),'utf8');
  const result=validateWork(raw,{mode:'start',contextInput:facts});assert.equal(result.valid,true,JSON.stringify(result));
  assert.equal(parseConfig(await readFile(path.join(input,'scope.yaml'),'utf8')).valid,true);
  const e=await p.input(id,'operator/validator-inputs/published.json'),r=chain(e);assert.equal(r.valid,true,JSON.stringify(r));assert.equal(r.completion_established,true);assert.equal(r.ai_steps,4);assert.deepEqual(r.human_pending,['HQA-01','HQA-02']);
  assert.deepEqual(r.qa_report.steps.map(x=>[x.id,x.skill,x.result]),[['E01.S1','qa-api','PASS'],['E01.S2','qa-bruno','PASS'],['E01.S3','qa-database','PASS'],['E01.S4','qa-ui','PASS']]);
  const pre=await p.input(id,'inputs/predecessors.json');assert.equal(chain(pre).valid,true,JSON.stringify(chain(pre)));assert.equal(records(pre).filter(x=>x.r.role==='qa').length,0);assert.equal(chain(pre).completion_established,false);
 }
});

test('prepared partial, explicit transitive and tested-PR controls retain exact delivered boundaries',async t=>{
 const p=await publisher(t);
 const valid=['H02-defect','H02-wait','H02-inability','H02-defect-inability','H03-static','H03-resume','V03-three','V03-join','V03-independent','V04-proof-blocked-exact-pass','V04-proof-blocked-exact-fail','V04-proof-blocked-not-run'];
 for(const id of valid){const e=await p.input(id,'operator/validator-inputs/published.json'),before=JSON.stringify(e),r=chain(e);assert.equal(r.valid,true,id+JSON.stringify(r));assert.equal(JSON.stringify(e),before);if(id==='H03-static'){assert.equal(r.ai_steps,0);assert(r.human_pending.length>0);assert(r.no_ai_cases_reason);}if(id==='H02-defect-inability'||id==='H02-wait')assert.equal(targetRecord(e).payload.findings[0].id,'F1');}
 for(const id of ['V03-missing-middle','V04-proof-blocked-null-pass','V04-proof-blocked-null-fail','V04-proof-blocked-real-null-environment','V04-proof-blocked-foreign-result','V04-proof-wait-foreign-finding']){
  const e=await p.input(id,'operator/validator-inputs/published.json'),r=chain(e);assert.equal(r.valid,false,id);if(id.includes('null-pass')||id.includes('null-fail'))assert(r.diagnostics.some(x=>x.code==='PR'&&x.path.endsWith('/payload/pr')),JSON.stringify(r));
 }
});

test('complete positive control prevents unrelated record/chain negatives from masking ledger and authority guards',async t=>{
 const p=await publisher(t),original=await p.input('H01-story','operator/validator-inputs/published.json');assert.equal(chain(original).valid,true);
 const negatives=[
  ['missing row',e=>changeTarget(e,r=>r.payload.report.steps.pop())],
  ['extra row',e=>changeTarget(e,r=>r.payload.report.steps.push({...r.payload.report.steps[0],id:'extra'}))],
  ['duplicate row',e=>changeTarget(e,r=>r.payload.report.steps[1]=r.payload.report.steps[0])],
  ['reordered child',e=>changeTarget(e,r=>r.payload.report.steps.reverse())],
  ['wrong skill',e=>changeTarget(e,r=>r.payload.report.steps[0].skill='qa-ui')],
  ['helper PASS only',e=>changeTarget(e,r=>r.payload.report.steps[0].evidence=[])],
  ['unknown finding',e=>changeTarget(e,r=>{r.payload.report.steps[0].result='FAIL';r.payload.report.steps[0].finding_ids=['unknown'];})],
  ['human omitted',e=>changeTarget(e,r=>r.payload.report.human_pending=[])],
  ['invented zero AI',e=>changeTarget(e,r=>r.payload.report.no_ai_cases_reason='Expected no AI')],
  ['unavailable evidence',e=>e.evidence_receipts.at(-1).available=false],
  ['wrong actor',e=>{e.comment_pages[0].comments.at(-1).author_id='stranger';e.comment_pages[0].comments.at(-1).update_author_id='stranger';}],
  ['assignment',e=>e.issues[0].pointer.assignment.comment_id='999'],
  ['requirements',e=>e.issues[0].requirements_digest='sha256:'+'0'.repeat(64)],
  ['source',e=>e.pr_receipts[0].source_revision='f'.repeat(40)],
  ['incomplete pages',e=>e.comment_pages[0].is_last=false],
  ['approval',e=>e.evidence_receipts.find(x=>x.kind==='approval').actor_id='stranger'],
  ['environment',e=>e.evidence_receipts.find(x=>x.kind==='environment').pr.source_revision='f'.repeat(40)]
 ];
 for(const [name,mutate]of negatives){const e=structuredClone(original);mutate(e);assert.equal(chain(e).valid,false,name);}
 const partial=await p.input('H02-defect-inability','operator/validator-inputs/published.json');changeTarget(partial,r=>r.payload.findings=[]);assert.equal(chain(partial).valid,false);
 const resumed=await p.input('H03-resume','operator/validator-inputs/published.json');const auth=records(resumed).find(x=>x.r.kind==='resume_authorization');const duplicate=structuredClone(auth.c),authRecord=structuredClone(auth.r);authRecord.record_id='93000000-0000-4000-8000-000000000003';duplicate.body=JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:JSON.stringify(authRecord)}]}]});duplicate.id='9999';resumed.comment_pages[0].comments.push(duplicate);resumed.comment_pages[0].total++;assert.equal(chain(resumed).valid,false);
});

test('actual independently chosen candidate encodings roundtrip and exact simulated transport echo validates each observed leaf',async t=>{
 const p=await publisher(t),e=await p.input('H01-story','operator/validator-inputs/published.json');
 for(const [i,uuid]of ['91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000002'].entries()){
  const record=structuredClone(targetRecord(e));record.record_id=uuid;
  const raw=i?stringify(record):JSON.stringify(record,null,2),input=path.join(p.runDir,'actual-'+i+'.yaml'),summary=path.join(p.runDir,'summary-'+i+'.txt');
  await import('node:fs/promises').then(fs=>Promise.all([fs.writeFile(input,raw),fs.writeFile(summary,'Prepared <literal> & complete evidence.')]));
  assert.equal(validateHandoff(raw,{mode:'record'}).valid,true);
  for(const format of ['html','adf']){
   const output=JSON.parse(execFileSync(process.execPath,[new URL('../scripts/prepare-handoff.mjs',import.meta.url).pathname,'--input',input,'--summary',summary,'--format',format],{encoding:'utf8'}));
   const submitted=format==='html'?output.body:JSON.stringify(output.body),observed=extractHandoff(submitted,{format});
   assert.equal(observed.record_digest,digestValue(record));assert.equal(observed.value.record_id,uuid);assert.deepEqual(JSON.parse(JSON.stringify(observed.value)),record);
   if(format==='html')assert(output.body.includes('&lt;literal&gt; &amp;'));
   // Only actual submitted transport is echoed, with fixed mock metadata. No
   // expected candidate is substituted into the readback under test.
   const receipts=structuredClone(e),comment=receipts.comment_pages[0].comments.at(-1);comment.id='9901';comment.format=format;comment.body=submitted;
   receipts.target={ticket_id:record.ticket_id,comment_id:comment.id,record_id:observed.value.record_id,digest:observed.record_digest};
   const result=chain(receipts);assert.equal(result.valid,true,JSON.stringify(result));assert.deepEqual(result.validated_leaf,receipts.target);
   const wrong=structuredClone(receipts);wrong.target.record_id='93000000-0000-4000-8000-000000000003';assert.equal(chain(wrong).valid,false);
   const wrongBody=structuredClone(receipts);wrongBody.comment_pages[0].comments.at(-1).body='unrelated discussion';assert.equal(chain(wrongBody).valid,false);
  }
 }
 const record=targetRecord(e);assert.equal(validateHandoff(JSON.stringify({...record,unexpected:true}),{mode:'record'}).valid,false);
 assert.equal(validateHandoff(' '.repeat(16385),{mode:'record'}).valid,false);
});

// Narrow evidence check for the actual PGB-110-only owner decision. This is
// delivery metadata validation in tests, not a runtime policy/permission engine.
function assertDeliverySizing(entries) {
 let exceptions=0;
 for(const entry of entries){
  if(entry.hours){
   assert(Number.isFinite(entry.hours.min)&&Number.isFinite(entry.hours.max));
   assert(entry.hours.min>=0&&entry.hours.max>=entry.hours.min);
   assert.equal(entry.days,entry.hours.max/8);
  }
  if(entry.time_limit_exception){
   exceptions++;
   const decision=entry.time_limit_exception;
   assert.equal(entry.id,'R1-24');assert.equal(decision.ticket,'PGB-110');
   assert.equal(decision.approved_by,'owner');
   assert.equal(decision.approval_reference,'https://scubapig.atlassian.net/browse/PGB-110?focusedCommentId=10684');
   assert.equal(decision.approved_at,'2026-11-15');
   assert.equal(decision.rule,'ordinary less-than-two-human-working-days limit');
   assert.equal(decision.base_commit,'6595e645bd91cec263a5ee0eaf1a3db95e7b9109');
   assert.equal(decision.scope,'Existing standalone prepared QA publisher; one PR; exact approved 20 files; all acceptance cases and review/QA/CI gates retained');
   assert(!Object.hasOwn(decision,'maximum_hours'));assert(entry.hours);
   assert.equal(entry.files.length,20);
   assert.equal(hash([...entry.files].sort()),'6005fc4ca4f126d52ec43f21279e63db4f1c344a7082bd1ccb709d68573ef35a');
  }else if(entry.hours)assert(entry.hours.max<16);
  else assert(Number.isFinite(entry.days)&&entry.days>=0&&entry.days<2);
 }
 assert.equal(exceptions,1);
}

test('approved delivery mirrors preserve original contracts/order, counts and all requirements/scenarios',async()=>{
 const drafts=JSON.parse(await read('docs/delivery/manager-r1/ticket-drafts.json')),plan=JSON.parse(await read('docs/delivery/manager-r1/plan-metadata.json')),publication=JSON.parse(await read('docs/delivery/manager-r1/publication.json'));
 const ids=['R1-01','R1-02','R1-03','R1-04','R1-21','R1-05','R1-06','R1-07','R1-24','R1-08','R1-09','R1-10','R1-11','R1-12','R1-13','R1-14','R1-15','R1-16','R1-22','R1-23','R1-17','R1-18','R1-19','R1-20'];
 assert.deepEqual(plan.map(x=>x.id),ids);assert.equal(drafts.length,24);assert.equal(new Set(drafts.map(x=>x.id)).size,24);assert.equal(new Set(Object.values(publication.stories)).size,24);assert.equal(publication.stories['R1-24'],'PGB-110');
 assert.equal(hash(drafts.filter(x=>!['R1-08','R1-24'].includes(x.id))),'32dfca8539691420f84e55d5346063429a14c9e16ccbb76a6c311c284b816e27');
 const b=drafts.find(x=>x.id==='R1-08').contract;
 assert.equal(hash([b.acceptance_criteria,b.technical_acceptance_criteria.constraints,b.testing_strategy.human_review.cases]),'1146a6dcd1340d1c9ecbff1c13249e937a2268a364e3e83da6a63898f1bb1c9d');
 for(const id of ['R1-24','R1-08']){const entry=plan.find(x=>x.id===id);assert.equal(entry.files.length,20);assert.equal(new Set(entry.files).size,20);assert(entry.dependencies.includes('PGB-108'));}
 assertDeliverySizing(plan);
 assert(plan.find(x=>x.id==='R1-08').dependencies.includes('R1-24'));
 const cases=new Set(drafts.flatMap(x=>x.contract.testing_strategy.human_review.cases.map(c=>c.id)));assert.equal(cases.size,107);assert.equal(publication.case_count,107);assert.equal(publication.story_count,24);
 for(const [from,to]of [['PGB-74','PGB-110'],['PGB-76','PGB-110'],['PGB-77','PGB-110'],['PGB-108','PGB-110'],['PGB-110','PGB-78'],['PGB-108','PGB-78'],['PGB-78','PGB-87'],['PGB-78','PGB-90']])assert(publication.dependency_links.some(x=>x.from===from&&x.to===to),from+'->'+to);
 const coverage=await read('docs/delivery/manager-r1/coverage.md');const requirements=new Set(coverage.split('\n').filter(line=>/^\| [AWMO]\d/.test(line)).flatMap(line=>[...line.split('|')[1].matchAll(/[AWMO]\d\d/g)].map(x=>x[0])));assert.equal(requirements.size,53);
 for(const id of coverage.matchAll(/R1-\d\d-(?:H\d\d|S\d\d)/g))assert(cases.has(id[0]),id[0]);
 assert.equal(new Set([...coverage.matchAll(/R1-11-S\d\d/g)].map(x=>x[0])).size,41);
 const expectedBoundaries=['A06','A08','W06','W08','W09','W11','W12'];for(const file of ['docs/product/coverage.md','docs/delivery/manager-r1/coverage.md'])for(const id of expectedBoundaries)assert((await read(file)).split('\n').find(line=>line.startsWith('| '+id+' |')).includes('R1-24-H'));
 assert.equal(publication.qa_split.verified_body_count,2);assert.equal(publication.qa_split.current_all_story_status_verification,false);assert.equal(publication.history[0].story_count,23);
});

test('native H03 frozen preparation separates requirements drift, stale deployment, ledger byte bounds and definite append rejection',async t=>{
 const p=await publisher(t),baseline=await p.input('H01-story','operator/validator-inputs/published.json');
 assert.equal(chain(baseline).valid,true);
 const originalCards=await p.input('H01-story','operator/cards.json');
 const changed=await p.input('H03-changed-requirements','operator/cards.json');
 const restored=structuredClone(changed.reads.native);restored.description=originalCards.reads.native.description;
 assert.deepEqual(restored,originalCards.reads.native,'only native requirement content changes');
 const oldWork=JSON.parse(await readFile(path.join(p.cases['H03-changed-requirements'],'inputs/work.yaml'),'utf8'));
 const currentWork=JSON.parse(changed.reads.native.description);
 assert.notEqual(digestValue(currentWork),digestValue(oldWork));
 assert.deepEqual({...currentWork,problem_to_solve:oldWork.problem_to_solve},oldWork);
 assert.equal(validateWork(changed.reads.native.description,{mode:'start',contextInput:await readFile(path.join(p.cases['H03-changed-requirements'],'inputs/facts.yaml'),'utf8')}).valid,true,'changed content remains valid work; mismatch is authority drift, not malformed syntax');
 assert.deepEqual(await p.input('H03-changed-requirements','inputs/predecessors.json'),await p.input('H01-story','inputs/predecessors.json'));
 const stale=await p.input('H03-stale-deployment','operator/validator-inputs/published.json');
 const repaired=structuredClone(stale),environment=repaired.evidence_receipts.find(x=>x.kind==='environment');
 environment.pr.source_revision=baseline.evidence_receipts.find(x=>x.kind==='environment').pr.source_revision;
 assert.deepEqual(repaired,baseline,'only environment source revision changes');
 assert.equal(chain(repaired).valid,true);
 const staleResult=chain(stale);assert.equal(staleResult.valid,false);
 assert(staleResult.diagnostics.some(x=>x.code==='EVIDENCE'&&x.path.endsWith('/payload/report/environment')),JSON.stringify(staleResult));
 const small=await p.input('H03-ledger-within-limit','operator/validator-inputs/published.json'),large=await p.input('H03-oversized-ledger','operator/validator-inputs/published.json');
 assert.equal(chain(small).valid,true);
 const smallRecord=targetRecord(small),largeRecord=targetRecord(large),compact=structuredClone(largeRecord);
 for(let i=0;i<compact.payload.report.steps.length;i++){
  assert.equal(largeRecord.payload.report.steps[i].evidence.length,3);
  largeRecord.payload.report.steps[i].evidence.forEach(x=>assert(x.label.length<=2000));
  for(let j=0;j<3;j++)compact.payload.report.steps[i].evidence[j].label=smallRecord.payload.report.steps[i].evidence[j].label;
 }
 assert.deepEqual(compact,smallRecord,'same full ledger/evidence identities; label size is the only record difference');
 assert.equal(validateHandoff(JSON.stringify(compact)).valid,true);
 const raw=await readFile(path.join(p.cases['H03-oversized-ledger'],'operator/validator-inputs/record.yaml'),'utf8');
 assert(Buffer.byteLength(raw)>16384);
 assert.equal(validateHandoff(raw).diagnostics[0].code,'BYTE_LIMIT');
 const bigChain=chain(large);assert.equal(bigChain.valid,false);assert.equal(bigChain.diagnostics[0].code,'BYTE_LIMIT');
 const rejected=await p.input('Q14-append-rejected','operator/cards.json'),timeout=await p.input('Q14-append-absent','operator/cards.json');
 assert.deepEqual(rejected.reads,originalCards.reads,'definite rejection starts with the same valid read facts');
 assert.equal(rejected.append.storage,'not_stored');assert.equal(rejected.append.reply.definite_failure,true);assert.equal(rejected.append.reply.status,403);
 assert.equal(timeout.append.reply,'timeout');assert.equal(timeout.append.storage,'not_stored');
 assert.equal(chain(await p.input('Q14-append-rejected','operator/validator-inputs/published.json')).valid,true);
 for(const id of ['H03-changed-requirements','H03-stale-deployment','H03-oversized-ledger','Q14-append-rejected']){
  const expected=await p.input(id,'operator/expectations.json');
  assert.equal(expected.append_attempts,id==='Q14-append-rejected'?1:0);assert.equal(expected.transition_attempts,0);
  assert((await readFile(path.join(p.cases[id],'preparation-notes.txt'),'utf8')).length>100);
  assert.deepEqual(await readdir(path.join(p.cases[id],'output')),[]);
 }
});

test('H01 prepared original mock deployment and typed bound API/database/UI artifacts are accessible before instruction execution',async t=>{
 const p=await publisher(t);
 for(const id of ['H01-story','H01-bug']){
  const cards=await p.input(id,'operator/cards.json'),assessment=await p.input(id,'inputs/assessment.json');
  const original=cards.reads.pipeline.original_comments.find(x=>x.id==='999');assert(original);
  assert.equal(original.author_id,'pipeline');assert.equal(original.update_author_id,'pipeline');assert.equal(original.created,original.updated);
  assert.match(original.created,/^2026-11-15T/);assert(original.notice.includes('MOCK'));
  const deployment=JSON.parse(original.body),pr=cards.reads.pr.find(x=>x.current);
  assert.equal(deployment.readiness,'ready');assert.equal(deployment.source_revision,pr.source_revision);assert.equal(deployment.deployed_revision,pr.source_revision);
  assert.equal(deployment.target_reference,'local-review');assert.equal(new URL(deployment.target_uri).protocol,'https:');
  assert.deepEqual(await p.input(id,'inputs/evidence/pipeline-comment.json'),cards.reads.pipeline.original_comments);
  const byStep=new Map(assessment.qa_report.steps.map(row=>{
    const artifact=cards.reads.artifacts.find(x=>x.uri===row.evidence[0].uri);assert(artifact?.available,row.id);
    assert.equal(artifact.category,'supplied/mock');assert.equal(artifact.body.step,row.id);assert.equal(artifact.body.pr.source_revision,pr.source_revision);
    assert.equal(artifact.body_sha256,'sha256:'+hash(JSON.stringify(artifact.body)));return [row.id,artifact.body];
  }));
  const child=byStep.get('E01.S2'),parent=byStep.get('E01.S1'),database=byStep.get('E01.S3'),ui=byStep.get('E01.S4');
  assert.equal(child.kind,'bruno_response');assert.equal(child.response.body.record_id,'record-001');assert.equal(child.selected_request_count,1);assert.equal(child.sentinel_request_count,0);
  assert.equal(parent.exposed_output.record_id,child.response.body.record_id);
  const provenance=await p.input(id,'inputs/evidence/output-binding.json');
  assert.equal(provenance.original_source.step,'E01.S2');assert.equal(provenance.original_source.artifact_uri,assessment.qa_report.steps[1].evidence[0].uri);
  assert.equal(provenance.original_source.json_pointer,'/response/body/record_id');assert.equal(provenance.original_source.value,child.response.body.record_id);
  assert.equal(provenance.parent_exposure.step,'E01.S1');assert.equal(provenance.consumer.step,'E01.S3');
  assert.equal(database.kind,'postgresql_read_only_observation');assert.equal(database.query,query);assert.equal(database.query_sha256,'sha256:'+hash(query));
  assert.deepEqual(database.original_parameters,['tenant-a',null]);assert.deepEqual(database.bound_parameters,['tenant-a',child.response.body.record_id]);
  assert.deepEqual(database.rows,[{record_id:'record-001',tenant_id:'tenant-a',state:'ready'}]);assert.equal(database.row_count,1);assert.equal(database.truncated,false);
  assert.deepEqual(database.transaction,{begin:'BEGIN READ ONLY',observation_count:1,rollback:'completed',close:'completed'});assert.equal(database.identity.read_only,true);
  assert(!('request_observation'in database));assert.equal(ui.kind,'ui_observation');assert(!('request_observation'in ui));
  const work=JSON.parse(await readFile(path.join(p.cases[id],'inputs/work.yaml'),'utf8')),uiContract=work.testing_strategy.cases[0].steps.find(step=>step.id==='E01.S4').ui;
  assert.equal(ui.surface,uiContract.surface);assert.equal(ui.browser,uiContract.browser);
  assert.equal(ui.input_value,child.response.body.record_id);assert.deepEqual(ui.checkpoints.map(x=>x.id),['start','input','result']);
  const images=[];
  for(const checkpoint of ui.checkpoints){
    const bytes=await readFile(path.join(p.cases[id],'inputs',checkpoint.screenshot.path));images.push(hash(bytes));
    assert.equal(checkpoint.category,'supplied/mock');assert.equal(checkpoint.screenshot.digest,'sha256:'+hash(bytes));
    assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),440);assert.equal(bytes.readUInt32BE(20),130);
  }
  assert.equal(new Set(images).size,3,'three separately inspectable checkpoint images');
  assert(ui.checkpoints[0].visible_text.includes('RECORD ID'));assert(ui.checkpoints[1].visible_text.includes('RECORD ID RECORD-001'));assert(ui.checkpoints[2].visible_text.includes('TENANT-A READY'));
  const observations=await p.input(id,'inputs/evidence/observations.json');assert.deepEqual(observations.artifacts,cards.reads.artifacts);assert.deepEqual(observations.output_binding,provenance);
  assert.equal(chain(await p.input(id,'operator/validator-inputs/published.json')).valid,true,'typed mock facts do not alter canonical positive chain');
  assert.deepEqual(await readdir(path.join(p.cases[id],'output')),[],'preparation still emits no observed skill result');
 }
});


test('only the actual fixed-scope PGB-110 owner decision exempts the ordinary time limit without a replacement hourly cap',async()=>{
 const plan=JSON.parse(await read('docs/delivery/manager-r1/plan-metadata.json'));
 assertDeliverySizing(plan);
 for(const change of [
  entries=>{entries.find(x=>x.id==='R1-08').time_limit_exception=structuredClone(entries.find(x=>x.id==='R1-24').time_limit_exception);},
  entries=>{delete entries.find(x=>x.id==='R1-24').time_limit_exception;},
  entries=>{entries.find(x=>x.id==='R1-24').time_limit_exception.approved_by='reviewer';},
  entries=>{entries.find(x=>x.id==='R1-24').time_limit_exception.approval_reference='https://scubapig.atlassian.net/browse/PGB-110?focusedCommentId=0';},
  entries=>{entries.find(x=>x.id==='R1-24').time_limit_exception.approved_at='2026-11-14';},
  entries=>{entries.find(x=>x.id==='R1-24').files[0]='unapproved/path';},
  entries=>{entries.find(x=>x.id==='R1-24').hours.max=Infinity;},
  entries=>{entries.find(x=>x.id==='R1-24').hours.min=100;},
  entries=>{entries.find(x=>x.id==='R1-24').time_limit_exception.maximum_hours=18;},
  entries=>{entries.find(x=>x.id==='R1-08').hours.max=16;}
 ]){const mutated=structuredClone(plan);change(mutated);assert.throws(()=>assertDeliverySizing(mutated));}
 const reforecast=structuredClone(plan),a=reforecast.find(x=>x.id==='R1-24');a.hours.max=19;a.days=19/8;
 assertDeliverySizing(reforecast); // Forecast update is not a substitute permission cap.
});

test('all61 fixed packets bind complete mock actor/access facts and preserve canonical negatives and expectations',async t=>{
 const p=await publisher(t),ids=Object.keys(p.cases).sort(),preserved=[];assert.equal(ids.length,61);
 const fixed={
  'fixture://pgb77/tenant-a':{id:'ACTOR-01',role:'reader',tenant:'tenant-a',identity_reference:'fixture://pgb77/tenant-a',access_owner:'Fixture operator'},
  'fixture://example/reader':{id:'ACTOR-01',role:'reader',tenant:'example',identity_reference:'fixture://example/reader',access_owner:'Fixture operator'}
 };
 for(const id of ids){
  const work=JSON.parse(await readFile(path.join(p.cases[id],'inputs/work.yaml'),'utf8')),
    assessment=await p.input(id,'inputs/assessment.json'),cards=await p.input(id,'operator/cards.json'),access=cards.reads.access;
  assert(access.notice.includes('MOCK'));assert.equal(access.category,'supplied/mock');
  assert.equal(access.runtime_access_required,work.testing_strategy.cases.length>0,id);
  assert.equal(access.actors.length,work.testing_strategy.actors.length,id);
  if(!work.testing_strategy.cases.length){
   assert.equal(access.available,false);assert.deepEqual(access.actors,[]);assert.equal(access.tenant,null);assert.equal(access.actor_id,null);assert.deepEqual(access.database_access,[]);
   assert.equal(access.availability,'no runtime access required');
  }
  for(const actor of work.testing_strategy.actors){
   assert.deepEqual(actor,fixed[actor.identity_reference],id+' independently frozen actor tuple');
   const supplied=access.actors.find(x=>x.actor_id===actor.id);assert(supplied,id);
   for(const key of ['role','tenant','identity_reference','access_owner'])assert.equal(supplied[key],actor[key],id+':'+key);
   assert.equal(supplied.read_only,true);assert.equal(supplied.available,true);
   if(access.actors.length===1){assert.equal(access.actor_id,actor.id);assert.equal(access.role,actor.role);assert.equal(access.tenant,actor.tenant);assert.equal(access.identity_reference,actor.identity_reference);assert.equal(access.access_owner,actor.access_owner);}
  }
  for(const step of work.testing_strategy.cases.flatMap(c=>c.steps)){
   if(step.api)assert(access.actors.some(actor=>actor.actor_id===step.api.actor),id+' API actor');
   if(step.database){const db=access.database_access.find(x=>x.step===step.id);assert(db,id);assert.equal(db.tenant,step.database.scope.tenant);assert.equal(db.access_reference,step.database.access_reference);assert.equal(db.database_role,'qa_reader');assert.equal(db.read_only,true);assert.deepEqual(db.scope,step.database.scope);}
  }
  for(const row of assessment.qa_report.steps.filter(x=>x.result==='PASS'||x.result==='FAIL')){
   for(const ref of row.evidence){const artifact=cards.reads.artifacts.find(x=>x.uri===ref.uri);assert(artifact,id);assert(access.actors.some(actor=>actor.tenant===artifact.body.tenant),id+' claimed observation tenant');}
  }
  if(assessment.qa_report.steps.length&&assessment.qa_report.steps.every(x=>x.result==='NOT_RUN')){
   assert.equal(access.available,true,id+' supplied identity remains truthful');
   assert(!JSON.stringify(access).includes('deployment_ready'));assert(access.proof_scope.includes('no deployment availability'));
  }
  preserved.push([id,...await Promise.all(['operator/validator-inputs/record.yaml','operator/validator-inputs/published.json','operator/expectations.json'].map(async file=>hash(await readFile(path.join(p.cases[id],file)))))]);
 }
 // Independent frozen70c68b preparation hashes, not newly generated expectations.
 assert.equal(hash(preserved),'06ad8c11010321c29a6f28f6704a2c0fe694470746f4d0885382d5ac8bc916e8');
 for(const id of ['H02-defect','H02-wait','H02-defect-inability','H03-resume']){
  const cards=await p.input(id,'operator/cards.json');assert.equal(cards.reads.access.tenant,'example');assert.equal(chain(await p.input(id,'operator/validator-inputs/published.json')).valid,true,id);
 }
 for(const id of ['V04-proof-blocked-null-pass','V04-proof-blocked-null-fail','V04-proof-blocked-real-null-environment','V04-proof-blocked-foreign-result','V04-proof-wait-foreign-finding','V03-missing-middle','Q21-resume-ambiguous']){
  const result=chain(await p.input(id,'operator/validator-inputs/published.json'));assert.equal(result.valid,false,id);
  if(id.includes('null-pass')||id.includes('null-fail'))assert(result.diagnostics.some(x=>x.code==='PR'&&x.path.endsWith('/payload/pr')));
  if(id==='V03-missing-middle')assert(result.diagnostics.some(x=>x.code==='LEDGER'&&x.path.endsWith('/finding_ids')));
  if(id==='Q21-resume-ambiguous')assert(result.diagnostics.some(x=>x.code==='RESUME'));
 }
});
