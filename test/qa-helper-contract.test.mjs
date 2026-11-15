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

// Reconstruct the exact pre-PGB-136 source checkpoint for immutable historical hashes.
// Only the new Story and its single added PGB-81 prerequisite are reversed.
function beforeOwnSelection(drafts) {
 const baseline=structuredClone(drafts).filter(x=>x.id!=='R1-28');
 const preview=baseline.find(x=>x.id==='R1-11').contract;
 assert.deepEqual(preview.prerequisites,[
  {ticket:'R1-10',required_outcome:'ai_qa_complete'},
  {ticket:'R1-25',required_outcome:'ai_qa_complete'},
  {ticket:'R1-26',required_outcome:'ai_qa_complete'},
  {ticket:'R1-28',required_outcome:'ai_qa_complete'}
 ]);
 preview.prerequisites.pop();
 return baseline;
}

test('approved delivery mirrors preserve original contracts/order, counts and all requirements/scenarios',async()=>{
 const drafts=JSON.parse(await read('docs/delivery/manager-r1/ticket-drafts.json')),plan=JSON.parse(await read('docs/delivery/manager-r1/plan-metadata.json')),publication=JSON.parse(await read('docs/delivery/manager-r1/publication.json'));
 const ids=['R1-01','R1-02','R1-03','R1-04','R1-21','R1-05','R1-06','R1-07','R1-24','R1-30','R1-27','R1-08','R1-09','R1-10','R1-25','R1-26','R1-28','R1-11','R1-12','R1-13','R1-14','R1-15','R1-16','R1-22','R1-23','R1-17','R1-18','R1-19','R1-20'];
 assert.deepEqual(plan.map(x=>x.id),ids);assert.equal(drafts.length,29);assert.equal(new Set(drafts.map(x=>x.id)).size,29);assert.equal(new Set(Object.values(publication.stories)).size,29);assert.equal(publication.stories['R1-24'],'PGB-110');assert.equal(publication.stories['R1-27'],'PGB-132');
 assert.equal(hash(beforeOwnSelection(drafts).filter(x=>!['R1-08','R1-24','R1-11','R1-25','R1-26','R1-27','R1-30','R1-28'].includes(x.id))),'2f3a696d34467daa7036ed3907226fc403226dc09c08a97cb4af48b264b3b897');
 const b=drafts.find(x=>x.id==='R1-08').contract;
 assert.equal(hash([b.acceptance_criteria,b.technical_acceptance_criteria.constraints,b.testing_strategy.human_review.cases]),'1146a6dcd1340d1c9ecbff1c13249e937a2268a364e3e83da6a63898f1bb1c9d');
 for(const [id,count]of [['R1-24',20],['R1-30',18],['R1-27',12],['R1-08',17]]){const entry=plan.find(x=>x.id===id);assert.equal(entry.files.length,count);assert.equal(new Set(entry.files).size,count);assert(entry.dependencies.includes('PGB-108'));}
 assertDeliverySizing(plan);
 assert(plan.find(x=>x.id==='R1-08').dependencies.includes('R1-24'));
 const cases=new Set(drafts.flatMap(x=>x.contract.testing_strategy.human_review.cases.map(c=>c.id)));assert.equal(cases.size,128);assert.equal(publication.case_count,128);assert.equal(publication.story_count,29);
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
 assert.deepEqual(plan.find(x=>x.id==='R1-24').hours,{min:26.75,max:36.5});
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
 const reforecast=structuredClone(plan),a=reforecast.find(x=>x.id==='R1-24');a.hours.max=37;a.days=37/8;
 assertDeliverySizing(reforecast); // Forecast update is not a substitute permission cap.
});

test('all76 fixed packets bind complete mock actor/access facts and preserve canonical negatives and expectations',async t=>{
 const p=await publisher(t),ids=Object.keys(p.cases).sort(),preserved=[];assert.equal(ids.length,76);
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

 }
 // Independent frozen70c68b preparation hashes, not newly generated expectations.
 // All63 legacy record/envelope/work/context specimens are checked independently in R3 below; nineteen explicitly revised usage expectations are not old instruction oracles.
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

function assertSavedProof(body,step,report,artifacts,{image}={}){
 assert(body.notice.includes('MOCK'));assert.equal(body.step,step.id);assert.equal(body.tenant,'example');
 if(step.api){
  assert.equal(body.request.method,'GET');assert.equal(body.request.route,'/api/filters?name=Monthly');assert.equal(body.selected_request,'filters/search.bru');assert.equal(body.request.actor_id,'ACTOR-01');
  assert.equal(body.prepared_collection_reference,step.prepared_artifact.reference);assert.equal(body.response.status,200);
  const row=report.steps.find(x=>x.id===step.id);assert.deepEqual(body.response.body.results,row.result==='FAIL'?[]:[{id:'fixture-1',name:'Monthly',tenant_id:'example'}]);
 }
 if(step.database){
  assert.equal(body.query,'SELECT id, name, tenant_id\nFROM synthetic_saved_filters\nWHERE tenant_id = $1 AND id = $2\nLIMIT 1;\n');
  assert.equal(body.query_reference,'fixture://example/reviewed-filter-query.sql');assert.equal(body.query_sha256,'sha256:'+hash(body.query));
  assert.deepEqual(body.original_parameters,step.database.parameters);assert.deepEqual(body.bound_parameters,['example','fixture-1']);
  assert.deepEqual(body.transaction,{begin:'BEGIN READ ONLY',observation_count:1,rollback:'completed',close:'completed'});
  assert.equal(body.identity.tenant,'example');assert.equal(body.identity.read_only,true);assert.equal(body.identity.access_reference,step.database.access_reference);
  if(step.bindings.length){
   const binding=body.output_binding;assert(binding);assert.equal(binding.original_source.value,'fixture-1');assert.equal(binding.original_source.json_pointer,'/response/body/results/0/id');
   assert.equal(binding.parent_exposure.value,'fixture-1');assert.equal(binding.consumer.step,step.id);assert.deepEqual(binding.consumer.bound_parameters,body.bound_parameters);
   const source=artifacts.find(x=>x.uri===binding.original_source.artifact_uri);assert(source);assert.equal(source.body.response.body.results[0].id,binding.original_source.value);assert.equal(source.body.step,binding.original_source.step);
  }else{assert.equal(body.output_binding,null);assert.equal(body.independent_input.value,step.inputs.record_id);}
  const row=report.steps.find(x=>x.id===step.id);assert.deepEqual(body.rows,row.result==='FAIL'?[]:[{id:'fixture-1',name:'Monthly',tenant_id:'example'}]);assert.equal(body.row_count,body.rows.length);assert.equal(body.truncated,false);
 }
 if(step.ui){
  assert.equal(body.entry_route,'/filters');assert.equal(body.surface,'prepared-browser-tab');assert.equal(body.browser,'Chromium');assert.equal(body.device,'desktop');
  assert.deepEqual(body.viewport,step.ui.viewport);assert.equal(body.input_value,'Monthly');assert.equal(body.input_provenance,null);assert.deepEqual(step.bindings,[]);
  assert.equal(body.checkpoints.length,1);const screenshot=body.checkpoints[0].screenshot;
  assert.equal(screenshot.width,1280);assert.equal(screenshot.height,800);assert(image);assert.equal(image.readUInt32BE(16),1280);assert.equal(image.readUInt32BE(20),800);assert.equal(screenshot.digest,'sha256:'+hash(image));
  assert(body.checkpoints[0].visible_text.includes('Monthly'));assert(body.checkpoints[0].visible_text.includes('fixture-1'));assert(body.checkpoints[0].visible_text.includes('tenant example'));
 }
}
function assertDependencyFact(facts,work,report,requests){
 assert.equal(facts.dependency_observations.length,1);const fact=facts.dependency_observations[0],body=fact.original_response.body;
 assert.equal(fact.ticket_id,'1000');assert.equal(fact.case_id,work.testing_strategy.cases[0].id);assert.equal(fact.tenant,'example');assert.equal(fact.actor_id,'ACTOR-01');
 assert.equal(fact.resource,'fixture://example/filter');assert.equal(fact.upstream.ticket_id,'1002');assert.equal(fact.upstream.key,'EX-3');
 assert.deepEqual(fact.upstream.request,requests[0]);assert.deepEqual(body.request,requests[0]);assert.equal(body.case_id,fact.case_id);assert.equal(body.resolved,false);assert.equal(body.ready,false);assert.equal(fact.original_response.status,409);
 assert.deepEqual(body.affected_steps,report.steps.filter(x=>x.result==='NOT_RUN').map(x=>x.id));assert.deepEqual(fact.affected_steps,body.affected_steps);
 assert(work.testing_strategy.cases[0].preconditions.some(x=>x.includes('fixture://example/filter')&&x.includes('1002/2032')));
}
function assertDomainFact(facts,work,report,artifacts){
 assert(facts.domain_inabilities.length>=1);const fact=facts.domain_inabilities.find(x=>x.surface),step=work.testing_strategy.cases.flatMap(c=>c.steps).find(x=>x.id===fact.step_id);
 assert(step?.ui);assert.equal(report.steps.find(x=>x.id===step.id).result,'NOT_RUN');assert.equal(fact.surface,step.ui.surface);assert.equal(fact.tenant,'example');assert.equal(fact.actor_id,'ACTOR-01');
 assert.equal(fact.identity_reference,'fixture://example/reader');assert.equal(fact.publisher_authority_affected,false);
 assert.equal(fact.original_response.status,503);assert.equal(fact.original_response.body.code,'SESSION_UNAVAILABLE');assert.equal(fact.original_response.body.session_available,false);assert.equal(fact.original_response.body.observation_started,false);
 const prior=artifacts.filter(x=>x.body.observed_at&&x.body.kind==='api_parent_observation');assert(prior.length);assert(prior.every(x=>x.body.observed_at<fact.observed_at));
}

test('R2 all63 scopes retain optional19/20 and instruction-ready claimed rows have typed matching evidence',async t=>{
 const p=await publisher(t);let claimed=0,saved=0;
 for(const [id,dir]of Object.entries(p.cases)){
  const scopeRaw=await readFile(path.join(dir,'inputs/scope.yaml'),'utf8'),scope=parse(scopeRaw),checked=parseConfig(scopeRaw);
  assert.equal(checked.valid,true,id+JSON.stringify(checked.diagnostics));
  for(const key of ['preparation_stage_ids','cancelled_stage_ids'])assert(scope.projects[0].inherit.includes(key));
  assert.deepEqual(checked.resolved_scope.projects[0].preparation_stage_ids,['19']);assert.deepEqual(checked.resolved_scope.projects[0].cancelled_stage_ids,['20']);
  assert.equal(checked.resolved_scope.projects[0].stages.QA,'4');assert.equal(checked.resolved_scope.projects[0].id,'100');
  const work=JSON.parse(await readFile(path.join(dir,'inputs/work.yaml'),'utf8')),assessment=await p.input(id,'inputs/assessment.json'),cards=await p.input(id,'operator/cards.json');
  if((await p.input(id,'operator/expectations.json')).usage==='canonical-only'){assert((await readFile(path.join(dir,'invocation.txt'),'utf8')).includes('CANONICAL-ONLY'));continue;}
  assert(!(await readFile(path.join(dir,'invocation.txt'),'utf8')).includes('CANONICAL-ONLY'),id);
  const steps=work.testing_strategy.cases.flatMap(c=>c.steps),observations=await p.input(id,'inputs/evidence/observations.json');
  const savedUi=cards.reads.artifacts.find(x=>x.body.kind==='ui_observation'&&x.body.entry_route==='/filters');
  if(savedUi){assert.deepEqual(observations.ui_checkpoints,savedUi.body.checkpoints);assert.deepEqual(observations.screenshot,savedUi.body.checkpoints[0].screenshot);assert((await readFile(path.join(dir,'evidence-guide.txt'),'utf8')).includes('inputs/evidence/filter-result.png'));}
  else if(!steps.some(x=>x.id==='E01.S1')){assert.equal(observations.screenshot.unused_sample,true);assert.deepEqual(observations.ui_checkpoints,[]);assert((await readFile(path.join(dir,'evidence-guide.txt'),'utf8')).includes('unused'));}
  for(const row of assessment.qa_report.steps.filter(x=>x.result==='PASS'||x.result==='FAIL')){
   claimed++;const step=steps.find(x=>x.id===row.id);assert(step,id);
   for(const ref of row.evidence){
    const artifact=cards.reads.artifacts.find(x=>x.uri===ref.uri);assert(artifact,id);assert(artifact.body.kind,id+':'+row.id);
    if(artifact.body.tenant==='example'){
     saved++;const image=step.ui?await readFile(path.join(dir,'inputs',artifact.body.checkpoints[0].screenshot.path)):undefined;
     assertSavedProof(artifact.body,step,assessment.qa_report,cards.reads.artifacts,{image});
     if(step.database)assert.equal(await readFile(path.join(dir,'inputs/evidence/saved-filter-query.sql'),'utf8'),artifact.body.query);
    }
   }
  }
 }
 assert.equal(claimed,180);assert.equal(saved,37); // 154 retained instruction claims plus26 new paired claims; canonical-only20 excluded.
});

test('R2 saved-filter resume proof catches missing query/rollback/image and corrupt provenance/UI contracts with valid controls',async t=>{
 const p=await publisher(t),dir=p.cases['H03-resume'],work=JSON.parse(await readFile(path.join(dir,'inputs/work.yaml'),'utf8')),assessment=await p.input('H03-resume','inputs/assessment.json'),cards=await p.input('H03-resume','operator/cards.json');
 const steps=work.testing_strategy.cases.flatMap(c=>c.steps),dbStep=steps.find(x=>x.skill==='qa-database'),db=cards.reads.artifacts.find(x=>x.body.step===dbStep.id).body;
 assertSavedProof(db,dbStep,assessment.qa_report,cards.reads.artifacts);
 for(const mutate of [b=>delete b.query,b=>delete b.transaction.rollback,b=>b.bound_parameters[1]='invented',b=>b.output_binding.original_source.artifact_uri='https://evidence.example.invalid/absent']){const b=structuredClone(db);mutate(b);assert.throws(()=>assertSavedProof(b,dbStep,assessment.qa_report,cards.reads.artifacts));}
 const uiStep=steps.find(x=>x.skill==='qa-ui'),ui=cards.reads.artifacts.find(x=>x.body.step===uiStep.id).body,image=await readFile(path.join(dir,'inputs',ui.checkpoints[0].screenshot.path));
 assertSavedProof(ui,uiStep,assessment.qa_report,cards.reads.artifacts,{image});
 assert.throws(()=>assertSavedProof(ui,uiStep,assessment.qa_report,cards.reads.artifacts));
 const wrong=structuredClone(ui);wrong.checkpoints[0].screenshot.width=440;assert.throws(()=>assertSavedProof(wrong,uiStep,assessment.qa_report,cards.reads.artifacts,{image}));
 const invented=structuredClone(ui);invented.input_provenance={from_step:'TC-01.S1'};assert.throws(()=>assertSavedProof(invented,uiStep,assessment.qa_report,cards.reads.artifacts,{image}));
 assert.equal(chain(await p.input('H03-resume','operator/validator-inputs/published.json')).valid,true);
 assert.equal(chain(await p.input('Q21-resume-ambiguous','operator/validator-inputs/published.json')).valid,false);
});

test('R2 six distinct H02 families and joined control have independently inspectable causes without changing publisher authority',async t=>{
 const p=await publisher(t);
 const cases=[['H02-defect-instruction','repair_request','Rework Queued'],['H02-upstream-wait','dependency_wait','Rework Queued'],['H02-inability','blocked','Blocked'],['H02-defect-inability-instruction','blocked','Blocked'],['H02-wait-instruction','dependency_wait','Rework Queued'],['H02-discussion','discussion','QA']];
 for(const [id,kind,destination]of cases){
  const dir=p.cases[id],work=JSON.parse(await readFile(path.join(dir,'inputs/work.yaml'),'utf8')),assessment=await p.input(id,'inputs/assessment.json'),cards=await p.input(id,'operator/cards.json'),facts=await p.input(id,'inputs/evidence/outcome-facts.json'),expected=await p.input(id,'operator/expectations.json');
  assert.deepEqual(cards.reads.outcome_facts,facts);
  if(facts.dependency_observations.length||facts.domain_inabilities.length){const reference=cards.reads.outcome_facts_reference;assert(reference);const artifact=cards.reads.artifacts.find(x=>x.uri===reference.uri);assert.deepEqual(artifact.body,facts);assert.equal(reference.digest,artifact.body_sha256);assert.equal(reference.digest,'sha256:'+hash(await readFile(path.join(dir,'inputs/evidence/outcome-facts.json'))));const receipts=await p.input(id,'inputs/predecessors.json');assert(receipts.evidence_receipts.some(x=>x.uri===reference.uri&&x.observed_digest===reference.digest&&x.available));}
  assert.equal(assessment.proposed_outcome,kind);assert.equal(expected.destination,destination);
  assert.equal(cards.capabilities.append,true);assert.equal(cards.capabilities.direct_transitions,true);assert.equal(cards.reads.access.available,true);
  const observed=assessment.qa_report.steps.filter(x=>x.result==='FAIL');if(id==='H02-upstream-wait'){assert.equal(observed.length,0);assert.deepEqual(assessment.findings,[]);assert(assessment.qa_report.steps.every(x=>x.result==='NOT_RUN'));}
  if(id==='H02-wait-instruction'||id==='H02-upstream-wait'){
   const requests=await p.input(id,'inputs/known-requests.json');assertDependencyFact(facts,work,assessment.qa_report,requests);
   assert.equal(requests[0].comment_id,'2032');assert.equal(requests[0].digest,'sha256:f26f93bf42ad628b6040631dd5728ab339a1d54584ac292cf131dc6fde539f28');
   for(const control of await p.input(id,'operator/cause-controls.json'))assert.throws(()=>assertDependencyFact(control.outcome_facts,work,assessment.qa_report,requests),control.id);
   const original=await p.input(id,'operator/validator-inputs/published.json');assert.equal(hash({issues:original.issues.filter(x=>x.id!=='1000'),requirements:original.requirements.filter(x=>x.ticket_id!=='1000'),pages:original.comment_pages.filter(x=>x.ticket_id!=='1000')}),'7f303182bcb6643d3ac7ca7e142a79f14eeea97186deee812ff56f11dc2a106e');
  }else assert.deepEqual(facts.dependency_observations,[]);
  if(id==='H02-defect-inability-instruction'){
   assertDomainFact(facts,work,assessment.qa_report,cards.reads.artifacts);
   for(const control of await p.input(id,'operator/cause-controls.json'))assert.throws(()=>assertDomainFact(control.outcome_facts,work,assessment.qa_report,cards.reads.artifacts),control.id);
  }else assert.deepEqual(facts.domain_inabilities,[]);
  assert.equal(chain(await p.input(id,'operator/validator-inputs/published.json')).valid,true,id);
 }
 for(const [alias,original]of [['Q09-wait','H02-wait'],['Q11-retained-findings','H02-defect-inability']]){
  assert.deepEqual(await p.input(alias,'inputs/assessment.json'),await p.input(original,'inputs/assessment.json'));
  assert.deepEqual((await p.input(alias,'operator/cards.json')).reads.outcome_facts,(await p.input(original,'operator/cards.json')).reads.outcome_facts);
  assert.equal(chain(await p.input(alias,'operator/validator-inputs/published.json')).valid,true);
 }
 const joined=await p.input('Q11-joined-inability','operator/validator-inputs/published.json'),r=targetRecord(joined),work=JSON.parse(joined.requirements.find(x=>x.ticket_id===r.ticket_id).body),db=work.testing_strategy.cases.find(c=>c.steps[0].skill==='qa-database');
 assert.deepEqual(db.depends_on,[]);assert.deepEqual(db.steps[0].bindings,[]);assert.deepEqual(db.steps[0].database.parameter_bindings,[]);assert.deepEqual(db.steps[0].database.parameters,['example','fixture-1']);
 assert.deepEqual(r.payload.qa_report.steps.map(x=>x.result),['FAIL','FAIL','FAIL','NOT_RUN','NOT_RUN']);assert.deepEqual(r.payload.qa_report.steps.at(-1).finding_ids,['F1','F2']);assert.deepEqual(r.payload.findings.map(x=>x.id),['F1','F2']);assert.equal(chain(joined).valid,true);
 const joinedCards=await p.input('Q11-joined-inability','operator/cards.json');assertDomainFact(joinedCards.reads.outcome_facts,work,r.payload.qa_report,joinedCards.reads.artifacts);
 const defect=await p.input('H02-defect','inputs/assessment.json');
 for(const id of ['H02-wait','Q09-wait','H02-defect-inability','Q11-retained-findings']){
  const assessment=await p.input(id,'inputs/assessment.json');assert.deepEqual(assessment.qa_report.steps[0],defect.qa_report.steps[0]);assert.deepEqual(assessment.findings,defect.findings);
  for(const row of assessment.qa_report.steps.slice(1))assert(row.not_run_reason.startsWith('The first finding prevents continuing.'));
 }

});

test('PGB-113 source amendment preserves native contracts and full preview in combined publication',async()=>{
 const drafts=JSON.parse(await read('docs/delivery/manager-r1/ticket-drafts.json')),metadata=JSON.parse(await read('docs/delivery/manager-r1/plan-metadata.json')),publication=JSON.parse(await read('docs/delivery/manager-r1/publication.json'));
 const ids=['R1-01','R1-02','R1-03','R1-04','R1-21','R1-05','R1-06','R1-07','R1-24','R1-30','R1-27','R1-08','R1-09','R1-10','R1-25','R1-26','R1-28','R1-11','R1-12','R1-13','R1-14','R1-15','R1-16','R1-22','R1-23','R1-17','R1-18','R1-19','R1-20'];
 assert.deepEqual(drafts.map(x=>x.id),ids);assert.deepEqual(metadata.map(x=>x.id),ids);assert.equal(new Set(ids).size,29);
 const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),contract=id=>drafts.find(x=>x.id===id).contract,plan=id=>metadata.find(x=>x.id===id),preview=contract('R1-11');
 // Fixed original335036 object hashes, frozen before source publication edits.
 assert.equal(hash(preview.acceptance_criteria),'1ee61a851ab66f31145a483f68c8bc1bb83dfd9e3422d3caaf4cb7e11e059639');
 assert.equal(hash(preview.technical_acceptance_criteria),'4929e0feaf998f0a0bca191409dff3dd0c902350e8e4efea59a10e99a87cbdce');
 assert.equal(hash(preview.testing_strategy),'efacc7e0fe916c48cb664d75748883054e694a60de119a7c5783aefdd3ea09db');
 assert.equal(preview.testing_strategy.human_review.cases.length,42);
 assert.equal(hash(contract('R1-12')),'b33f93b3b47fa68e023c06e2e340047219090ee365712633823d19deab9d7813');
 assert.equal(hash(beforeOwnSelection(drafts).filter(x=>!['R1-08','R1-24','R1-11','R1-25','R1-26','R1-27','R1-30','R1-28'].includes(x.id))),'2f3a696d34467daa7036ed3907226fc403226dc09c08a97cb4af48b264b3b897');
 assert.equal(hash(metadata.filter(x=>!['R1-08','R1-24','R1-11','R1-25','R1-26','R1-27','R1-30','R1-28'].includes(x.id))),'0f95ad054e6ebf772addea9b8a55edea1f5c24ca2947cb17739800a5a463d128');
 const native113=structuredClone(contract('R1-25'));native113.prerequisites[0].ticket='PGB-80';assert.equal(hash(native113),'36bdc9fc15aa1dfc69db7e8f9d81e1ff3d089fb43d876aa9df37734ab0b9052a');
 assert.deepEqual(contract('R1-25').prerequisites,[{ticket:'R1-10',required_outcome:'ai_qa_complete'}]);assert.deepEqual(preview.prerequisites,[{ticket:'R1-10',required_outcome:'ai_qa_complete'},{ticket:'R1-25',required_outcome:'ai_qa_complete'},{ticket:'R1-26',required_outcome:'ai_qa_complete'},{ticket:'R1-28',required_outcome:'ai_qa_complete'}]);
 assert.deepEqual(plan('R1-25').dependencies,['R1-10']);assert.deepEqual(plan('R1-11').dependencies,['R1-10','R1-25','R1-26','R1-28']);assert.deepEqual(plan('R1-12').dependencies,['R1-11','R1-21']);assert.deepEqual([plan('R1-25').days,plan('R1-25').files.length,plan('R1-11').days,plan('R1-11').files.length],[1.98,15,1.53,20]);
 assert.equal(drafts.reduce((n,x)=>n+x.contract.testing_strategy.cases.length+x.contract.testing_strategy.human_review.cases.length,0),128);
 for(const id of ['R1-25','R1-11']){const r=validateWork(JSON.stringify(contract(id)),{mode:'structure'});assert.equal(r.valid,true,JSON.stringify(r.diagnostics));assert.equal(r.readiness,'not_evaluated');}
 const baseline=structuredClone(publication.baseline_before_amendments);assert.equal(hash(baseline),'aeeaa43078df97c68c580211cdc9bb8bca05d0f06161d004626c87c55b93d20a');
 assert.deepEqual([publication.story_count,publication.case_count,publication.requirement_count,publication.scenario_count],[29,128,53,41]);
 const current=publication.current_source_scope;assert.deepEqual([current.story_count,current.case_count],[29,128]);assert.deepEqual([current.native_snapshot.story_count,current.native_snapshot.case_count],[30,130]);assert.deepEqual(current.pending_source_amendments,['PGB-137']);
 const amendment=publication.repeated_parent_amendment,mapping={...publication.stories,...amendment.stories};assert.equal(mapping['R1-25'],'PGB-113');assert.equal(Object.keys(mapping).length,29);assert.equal(new Set(Object.values(mapping)).size,29);assert.equal(mapping['R1-24'],'PGB-110');
 assert.deepEqual(amendment.dependency_links,[{id:'10685',from:'PGB-80',to:'PGB-113'},{id:'10686',from:'PGB-113',to:'PGB-81'}]);assert.deepEqual(amendment.preserved_links,[{id:'10637',from:'PGB-80',to:'PGB-81'},{id:'10638',from:'PGB-81',to:'PGB-82'}]);assert.equal(amendment.human_acceptance,'NOT_RUN');assert.equal(amendment.activation_authorized,false);
 assert.deepEqual(amendment.description_sha256,{original:'edf424525be88eba96d937ae88605d031b012f412b9155787470b6086aa9c497',validator:'c987a76d937e7d162dec793c4f840079206342460d2c406d28a8a27caf02acd8',final_preview:'8b2f146d4bfec454d297c8cd9cec1aa5c42bba7cd1d2cbf2b41294d527113dfe'});
 for(const file of ['docs/delivery/manager-r1/coverage.md','docs/product/coverage.md']){const text=await read(file),requirements=text.split('\n').filter(line=>/^\| [AWMO]\d\d/.test(line)),covered=new Set(requirements.flatMap(line=>line.split('|')[1].match(/[AWMO]\d\d/g)??[]));assert.deepEqual([...covered].sort(),['A','W','M','O'].flatMap((prefix,i)=>Array.from({length:[12,12,14,15][i]},(_,j)=>prefix+String(j+1).padStart(2,'0'))).sort());for(const id of ['W04','W12','M10']){const row=requirements.find(line=>line.startsWith('| '+id+' |'));for(const caseId of ['R1-25-C01','R1-25-C02','R1-25-C03'])assert(row.includes(caseId));}assert(text.includes('R1-11-H02'));}
 const stories=await read('docs/delivery/manager-r1/stories.md');assert(stories.indexOf('## R1-25:')<stories.indexOf('## R1-11:'));for(const c of contract('R1-25').testing_strategy.human_review.cases){assert(stories.includes(c.id));for(const key of ['prerequisites','steps','expected','evidence'])for(const value of c[key])assert(stories.includes(value));}
 const bundle=JSON.parse(await read('config/skill-bundle.json'));for(const name of ['qa-entrypoint','qa-api','qa-bruno','qa-database','qa-ui','human-writing','write-pr-sized-stories'])assert(bundle.skills.includes(name));assert(!JSON.stringify(bundle).includes('qa-helper-case'));assert(!JSON.stringify(bundle).includes('handoff-chains'));
});

const R3_NEW=['H02-defect-instruction','H02-defect-inability-instruction','H02-wait-instruction','Q11-three-inability','Q11-independent-inability','Q13-partial-pass-inability','Q11-missing-middle-instruction','Q13-null-pass-instruction','Q13-null-fail-instruction','Q13-null-foreign-artifacts-instruction','Q13-foreign-result-instruction','Q13-null-environment-instruction','Q13-wait-foreign-finding-instruction'];
const R3_CANONICAL=['H02-defect','Q08-defect','H02-defect-inability','Q11-retained-findings','H02-wait','Q09-wait','V03-three','V03-independent','V03-join','V03-missing-middle','V04-proof-blocked-exact-fail','V04-proof-blocked-exact-pass','V04-proof-blocked-null-real-environment','V04-proof-blocked-null-pass','V04-proof-blocked-null-fail','V04-proof-blocked-null-foreign-artifacts','V04-proof-blocked-foreign-result','V04-proof-blocked-real-null-environment','V04-proof-wait-foreign-finding'];
const R3_MIXED=['H01-bug','H01-story','H02-discussion','H03-changed-requirements','H03-changed-stage','H03-epic','H03-ledger-within-limit','H03-oversized-ledger','H03-stale-deployment','H03-task','H03-wrong-scope','Q03-site','Q03-stream','Q04-duplicate-row','Q04-missing-row','Q04-reordered-child','Q05-helper-pass-only','Q05-unavailable-artifact','Q06-source','Q07-missing-environment','Q07-wrong-pipeline','Q12-discussion','Q13-wrong-approval','Q14-append-absent','Q14-append-ambiguous','Q14-append-rejected','Q14-stored-timeout','Q15-readback-failed','Q15-wrong-actor','Q15-wrong-body','Q15-wrong-uuid','Q16-chain-pages','Q17-source-drift','Q18-transition-failed','Q19-transition-ambiguous','Q20-transition-stored-timeout'];
function assertR3Clock(cards,assessment,{missingChild=false}={}){
 const bodies=cards.reads.artifacts.map(x=>x.body),parent=bodies.find(x=>x.kind==='api_parent_observation'),child=bodies.find(x=>x.kind==='bruno_response');
 if(parent&&child){assert(child.observed_at<=parent.observed_at);assert.deepEqual(parent.response,child.response);}
 const ui=bodies.find(x=>x.kind==='ui_observation');
 if(ui){
  const points=ui.checkpoints;
  assert(points.every(x=>x.observed_at<=ui.observed_at));
  for(let i=1;i<points.length;i++)assert(points[i-1].observed_at<=points[i].observed_at);
  if(ui.entry_route==='/ui'&&!missingChild){assert(child);assert(child.observed_at<=points.find(x=>x.id==='input').observed_at);assert(child.observed_at<=points.find(x=>x.id==='result').observed_at);}
 }
 const db=bodies.find(x=>x.kind==='postgresql_read_only_observation');
 if(db?.output_binding&&!missingChild){assert(child);assert(child.observed_at<=db.observed_at);}
 for(const fact of cards.reads.outcome_facts.dependency_observations){const ref=fact.upstream.request,page=cards.reads.comments.find(x=>x.ticket_id===ref.ticket_id&&x.comments.some(c=>c.id===ref.comment_id)),comment=page?.comments.find(c=>c.id===ref.comment_id);assert(comment);assert(comment.created<=fact.observed_at);assert(fact.affected_steps.every(id=>assessment.qa_report.steps.find(x=>x.id===id)?.result==='NOT_RUN'));}
 for(const fact of cards.reads.outcome_facts.domain_inabilities){assert(assessment.qa_report.steps.find(x=>x.id===fact.step_id)?.result==='NOT_RUN');if(child)assert(child.observed_at<fact.observed_at);}
 const authorizations=cards.reads.comments.flatMap(p=>p.comments).filter(c=>{try{return extractHandoff(c.body,{format:c.format}).value.kind==='resume_authorization';}catch{return false;}});
 if(authorizations.length)for(const body of bodies.filter(x=>x.observed_at))assert(authorizations.every(c=>c.created<body.observed_at));
}

test('R3 preserves all63 legacy specimens/work/context and accounts76/19/57 with explicit replacement guidance',async t=>{
 const p=await publisher(t),ids=Object.keys(p.cases).sort(),legacy=[];assert.equal(ids.length,76);let canonical=0,instruction=0;
 assert.deepEqual(ids.filter(id=>R3_NEW.includes(id)),[...R3_NEW].sort());
 for(const id of ids){const expected=await p.input(id,'operator/expectations.json'),dir=p.cases[id];
  if(R3_CANONICAL.includes(id)){canonical++;assert.equal(expected.usage,'canonical-only');assert(expected.counterpart);assert.equal(expected.append_attempts,0);assert.equal(expected.transition_attempts,0);assert.equal(expected.destination,null);assert((await readFile(path.join(dir,'invocation.txt'),'utf8')).includes(expected.counterpart));}
  else{instruction++;assert.equal(expected.usage,'instruction');}
  const specimen=await p.input(id,'operator/validator-inputs/published.json'),context=await p.input(id,'operator/validator-inputs/legacy-context.json');
  assert.deepEqual(context.work,specimen.requirements.find(x=>x.ticket_id===specimen.target.ticket_id));
  for(const artifact of context.artifacts)assert.equal(artifact.body_sha256,'sha256:'+hash(JSON.stringify(artifact.body)));
  if(context.outcome_facts_reference){const ref=context.outcome_facts_reference;assert.equal(ref.digest,'sha256:'+hash(JSON.stringify(context.outcome_facts)));assert(specimen.evidence_receipts.some(x=>x.uri===ref.uri&&x.observed_digest===ref.digest));}
  if(!R3_NEW.includes(id))legacy.push([id,...await Promise.all(['operator/validator-inputs/record.yaml','operator/validator-inputs/published.json','inputs/work.yaml','inputs/facts.yaml'].map(async file=>hash(await readFile(path.join(dir,file)))))]);
 }
 assert.equal(canonical,19);assert.equal(instruction,57);assert.equal(legacy.length,63);
 assert.equal(hash(legacy),'2556819df99194b08522cd7f59f8e878deb3511cb6cf26af32047bf01b562305');
});

test('R3 complete saved-filter pairs, causes and seven negative counterparts preserve the actual fault boundary',async t=>{
 const p=await publisher(t),positives=R3_NEW.slice(0,6);
 for(const id of R3_NEW){const cards=await p.input(id,'operator/cards.json'),assessment=await p.input(id,'inputs/assessment.json'),parent=cards.reads.artifacts.find(x=>x.body.kind==='api_parent_observation'),child=cards.reads.artifacts.find(x=>x.body.kind==='bruno_response');
  assert(parent&&child,id);assert.deepEqual(parent.body.response,child.body.response);assert.equal(parent.body.child_source.uri,child.uri);assert.equal(parent.body.child_source.response_digest,'sha256:'+hash(JSON.stringify(child.body.response)));assert.equal(parent.body.selected_request_count,1);assert.equal(child.body.selected_request_count,1);
  const pair=assessment.qa_report.steps.slice(0,2);assert(pair.every(x=>x.result===(id.includes('partial-pass')||id.includes('null-pass')?'PASS':'FAIL')));assert(pair.every(x=>x.not_run_reason===null&&x.evidence.length>0));
  assert.equal(parent.body.observed_at,'2026-11-15T10:01:03Z');assert.equal(child.body.observed_at,parent.body.observed_at);assertR3Clock(cards,assessment);
  if(pair[0].result==='FAIL'){assert.deepEqual(parent.body.response.body.results,[]);assert.deepEqual(parent.body.exposed_output,{});assert(assessment.findings.some(x=>x.id==='F1'));}
  else{assert.deepEqual(parent.body.response.body.results,[{id:'fixture-1',name:'Monthly',tenant_id:'example'}]);assert.deepEqual(assessment.findings,[]);assert(assessment.qa_report.steps.slice(2).every(x=>x.result==='NOT_RUN'&&x.finding_ids.length===0));assert(!cards.reads.artifacts.some(x=>['postgresql_read_only_observation','ui_observation'].includes(x.body.kind)));}
  const result=chain(await p.input(id,'operator/validator-inputs/published.json'));assert.equal(result.valid,positives.includes(id),id+JSON.stringify(result.diagnostics));
  if(id==='H02-wait-instruction'||id==='Q13-wait-foreign-finding-instruction')assert.deepEqual(cards.reads.outcome_facts.dependency_observations[0].affected_steps,['TC-01.S3','TC-01.S4']);
  if(id==='Q11-independent-inability'){assert(assessment.qa_report.steps.slice(2).every(x=>x.finding_ids.length===0));assert.deepEqual(cards.reads.outcome_facts.domain_inabilities.map(x=>x.step_id).sort(),['TC-01.S3','TC-01.S4']);}
 }
 const cards=await p.input('H02-defect-inability-instruction','operator/cards.json'),assessment=await p.input('H02-defect-inability-instruction','inputs/assessment.json');
 for(const change of [a=>a.qa_report.steps[1].result='NOT_RUN',a=>a.qa_report.steps[1].evidence=[]]){const bad=structuredClone(assessment);change(bad);assert.throws(()=>{assert(bad.qa_report.steps.slice(0,2).every(x=>x.result==='FAIL'&&x.evidence.length>0));});}
 const before=structuredClone(cards);before.reads.outcome_facts.domain_inabilities[0].observed_at='2026-11-15T09:00:00Z';assert.throws(()=>assertR3Clock(before,assessment));
 const three=await p.input('Q11-three-inability','operator/validator-inputs/published.json');for(const index of [2,3]){const bad=structuredClone(three);changeTarget(bad,r=>r.payload.qa_report.steps[index].finding_ids=[]);const result=chain(bad);assert.equal(result.valid,false);assert(result.diagnostics.some(x=>x.code==='LEDGER'&&x.path.endsWith('/finding_ids')));}
});

test('R3 finite clock mirrors, child-bound consumption, request existence and resume authorization are independently coherent',async t=>{
 const p=await publisher(t);let mixed=0,children=0,uis=0,both=0;
 for(const [id,dir]of Object.entries(p.cases)){
  const expected=await p.input(id,'operator/expectations.json');if(expected.usage==='canonical-only')continue;
  const cards=await p.input(id,'operator/cards.json'),assessment=await p.input(id,'inputs/assessment.json'),summary=await p.input(id,'inputs/evidence/observations.json');
  assert.deepEqual(summary.artifacts,cards.reads.artifacts);assert.deepEqual(summary.observations,cards.reads.evidence);assert.deepEqual(summary.outcome_facts,cards.reads.outcome_facts);assert.deepEqual(summary.outcome_facts_reference,cards.reads.outcome_facts_reference);
  const predecessor=await p.input(id,'inputs/predecessors.json');assert.deepEqual(predecessor.evidence_receipts,cards.reads.evidence);
  for(const a of cards.reads.artifacts)assert.equal(a.body_sha256,'sha256:'+hash(JSON.stringify(a.body)));
  if(cards.reads.outcome_facts_reference){const ref=cards.reads.outcome_facts_reference;assert.equal(ref.digest,'sha256:'+hash(await readFile(path.join(dir,'inputs/evidence/outcome-facts.json'))));assert(cards.reads.evidence.some(x=>x.uri===ref.uri&&x.observed_digest===ref.digest));}
  assertR3Clock(cards,assessment,{missingChild:id==='Q04-duplicate-row'});
  if(R3_MIXED.includes(id)){mixed++;const child=cards.reads.artifacts.find(x=>x.body.step==='E01.S2'),ui=cards.reads.artifacts.find(x=>x.body.kind==='ui_observation');if(child)children++;if(ui)uis++;if(child&&ui)both++;
   if(ui){assert.deepEqual(ui.body.checkpoints.map(x=>x.observed_at),['2026-11-15T10:01:05Z','2026-11-15T10:01:06Z','2026-11-15T10:01:07Z']);assert.deepEqual(summary.ui_checkpoints,ui.body.checkpoints);assert.equal(ui.body.observed_at,'2026-11-15T10:01:07Z');}
  }
 }
 assert.deepEqual([mixed,children,uis,both],[36,35,35,34]);
 for(const id of ['H01-story','H02-upstream-wait','H03-resume']){
  const cards=await p.input(id,'operator/cards.json'),assessment=await p.input(id,'inputs/assessment.json');assertR3Clock(cards,assessment);
  const bad=structuredClone(cards);
  if(id==='H01-story'){const ui=bad.reads.artifacts.find(x=>x.body.kind==='ui_observation');ui.body.checkpoints[1].observed_at='2026-11-15T09:40:01Z';}
  if(id==='H02-upstream-wait')bad.reads.outcome_facts.dependency_observations[0].observed_at='2026-11-15T09:40:10Z';
  if(id==='H03-resume')bad.reads.artifacts.find(x=>x.body.kind==='bruno_response').body.observed_at='2026-11-15T09:40:03Z';
  assert.throws(()=>assertR3Clock(bad,assessment),id);
 }
});

test('scoped UI cause controls preserve independent DB inability, completed observations and separate null proof',async t=>{
 const p=await publisher(t);let corrected=0;
 for(const id of ['Q11-independent-inability','Q13-partial-pass-inability','Q13-null-pass-instruction']){
  const work=JSON.parse(await readFile(path.join(p.cases[id],'inputs/work.yaml'),'utf8')),assessment=await p.input(id,'inputs/assessment.json'),cards=await p.input(id,'operator/cards.json');
  const controls=await p.input(id,'operator/cause-controls.json'),failed=id==='Q11-independent-inability',nullProof=id==='Q13-null-pass-instruction';
  const dbCase=work.testing_strategy.cases.find(c=>c.steps.some(s=>s.id==='TC-01.S3')),dbStep=dbCase.steps.find(s=>s.id==='TC-01.S3');
  assert.equal(dbStep.skill,'qa-database');assert.deepEqual(dbCase.depends_on,[]);assert.equal(assessment.qa_report.steps.find(s=>s.id===dbStep.id).result,'NOT_RUN');
  assert.deepEqual(assessment.qa_report.steps.slice(0,2).map(s=>s.result),failed?['FAIL','FAIL']:['PASS','PASS']);
  assert(assessment.qa_report.steps.slice(0,2).every(s=>s.evidence.length>0));
  assert.deepEqual(assessment.findings.map(f=>f.id),failed?['F1']:[]);
  const expectedDb={observed_at:'2026-11-15T10:01:20Z',ticket_id:'1000',case_id:failed?'TC-02':'TC-01',step_id:'TC-01.S3',actor_id:'ACTOR-01',tenant:'example',identity_reference:'fixture://example/reader',pr:{provider:'github',repository:'https://example.invalid/example/application',number:'10',source_revision:'1'.repeat(40),target_branch:'main'},capability:'prepared PostgreSQL session',original_response:{status:503,body:{code:'SESSION_UNAVAILABLE',session_available:false,observation_started:false}},publisher_authority_affected:false,source:'Fixed original mock database capability failure; no query executed.'};
  assert.equal(dbCase.id,expectedDb.case_id);assert.deepEqual(cards.reads.outcome_facts.domain_inabilities[1],expectedDb);
  assert.deepEqual(controls.map(c=>c.id),['missing-event','before-observation','wrong-actor','wrong-tenant','wrong-step','success-response']);
  for(const control of controls){
   const facts=control.outcome_facts,wording=control.expected_boundary;
   assert.deepEqual(control.cards.reads.outcome_facts,facts);
   if(control.id==='missing-event'){
    assert.deepEqual(facts.domain_inabilities,[]);
    if(!failed){corrected++;assert.match(wording,/No supplied domain-inability observations remain/);assert.match(wording,/completed PASS rows and empty findings/);assert.match(wording,/do not invent a local defect or infer a terminal route/);}
   }else{
    corrected++;assert.equal(facts.domain_inabilities.length,2);assert.deepEqual(facts.domain_inabilities[1],expectedDb);
    const ui=facts.domain_inabilities[0];
    if(control.id==='before-observation')assert.equal(ui.observed_at,'2026-11-15T09:00:00Z');
    if(control.id==='wrong-actor')assert.equal(ui.actor_id,'OTHER');
    if(control.id==='wrong-tenant')assert.equal(ui.tenant,'tenant-a');
    if(control.id==='wrong-step')assert.equal(ui.step_id,'UNRELATED');
    if(control.id==='success-response')assert.deepEqual(ui.original_response,{status:200,body:{session_available:true,observation_started:false}});
    assert.match(wording,/mutated UI observation cannot establish the UI inability/);assert.match(wording,/unchanged TC-01.S3 DB inability remains valid/);assert.match(wording,/does not establish absence of all later inability/);
    assert(!wording.includes('No verified later domain inability'));
    if(failed)assert.match(wording,/existing F1 local defect repair evidence/);
    else assert.match(wording,/completed PASS rows and empty findings; do not invent a local defect/);
   }
   if(!failed)assert(!/retained local defect|existing F1/.test(wording));
   if(nullProof){
    assert.match(wording,/separate null-proof fault remains/);assert.match(wording,/do not isolate a global routing decision/);assert.match(wording,/no valid remaining cause can waive missing runtime proof/);
    assert.equal(control.cards.reads.evidence.find(r=>r.kind==='environment').pr,null);
    for(const row of assessment.qa_report.steps.slice(0,2))for(const ref of row.evidence)assert.equal(control.cards.reads.evidence.find(r=>r.uri===ref.uri).pr,null);
   }
  }
  if(nullProof){const r=chain(await p.input(id,'operator/validator-inputs/published.json'));assert.equal(r.valid,false);assert(r.diagnostics.some(d=>d.code==='EVIDENCE'&&d.path.endsWith('/qa_report/steps/0/evidence/0')));}
 }
 assert.equal(corrected,17);
});

// PGB-132 checks emitted raw inputs independently of helper/dispatcher decisions.
// These checks do not execute designated human acceptance or infer a QA verdict.
test('dispatch-inputs supplies the finite prescribed handoff without producing an assessment',async t=>{
 const temp=await mkdtemp(path.join(tmpdir(),'pgb-dispatch-inputs-'));t.after(()=>rm(temp,{recursive:true,force:true}));
 const p=await prepareQaFixture(path.join(temp,'private'),{suite:'dispatch-inputs'});
 const input=async(id,file)=>JSON.parse(await readFile(path.join(p.cases[id],'input',file),'utf8'));
 const raw=async(id,file)=>readFile(path.join(p.cases[id],'input',file),'utf8');
 assert.equal(p.ready,false);assert.equal((await stat(p.runDir)).mode&0o777,0o700);
 await assert.rejects(prepareQaFixture(p.runDir,{suite:'dispatch-inputs'}),/exist/i);
 await assert.rejects(prepareQaFixture('relative',{suite:'dispatch-inputs'}),/absolute/);
 assert.deepEqual(Object.keys(p.cases),['I01-story','I02-parameters','I11-stale-environment']);
 const summary=JSON.parse(await readFile(p.preparation,'utf8'));assert.equal(summary.cases.length,3);
 assert.equal(summary.human_acceptance,'R1-30-H01/H02/H03 NOT RUN');
 assert.equal(summary.source_module_sha256,'sha256:'+hash(await readFile(new URL('./fixtures/qa-helper-case.mjs',import.meta.url))));
 for(const [id,dir]of Object.entries(p.cases)){
  assert.deepEqual(await readdir(path.join(dir,'output')),[],id);
  const files=await readdir(path.join(dir,'input'));for(const forbidden of ['assessment.json','record.yaml','verdict.json','expectations.json','candidate.json'])assert(!files.includes(forbidden),id);
  const index=await input(id,'index.json');assert.equal(index.preparation_id,'PREP-01');
  for(const a of index.artifacts){const bytes=await readFile(path.join(p.runDir,a.path));assert.equal(a.digest,'sha256:'+hash(bytes));assert.equal((await stat(path.join(p.runDir,a.path))).mode&0o777,0o600);}
  const work=JSON.parse(await raw(id,'work.yaml')),facts=await raw(id,'facts.yaml');
  assert.deepEqual(index.consumers,work.testing_strategy.cases.flatMap(c=>c.steps.map(s=>s.id)));
  const result=validateWork(await raw(id,'work.yaml'),{mode:'start',contextInput:facts});
  assert.equal(result.valid,id!=='I02-parameters',id+JSON.stringify(result.diagnostics));
  if(id==='I02-parameters')assert(result.diagnostics.some(d=>d.code==='DATABASE_PARAMETERS'));
  assert.equal(parseConfig(await raw(id,'scope.yaml')).valid,true,id);
  const e=await input(id,'predecessors.json'),target=targetRecord(e);assert.equal(target.kind,'review',id);
  assert.equal(validateHandoff(JSON.stringify(target),{mode:'record'}).valid,true);
  const expectedChain=id!=='I02-parameters';
  const receipt=chain(e);assert.equal(receipt.valid,expectedChain,id+JSON.stringify(receipt.diagnostics));
  if(id==='I02-parameters')assert(receipt.diagnostics.some(d=>d.code==='DATABASE_PARAMETERS'));
  for(const {r}of records(e).filter(x=>x.r.ticket_id===target.ticket_id)){
   assert(!['qa','repair_request','dependency_wait'].includes(r.kind),id+' current terminal leak');
   assert(!['blocked','resume_authorization'].includes(r.kind),id+' unexpected historical terminal');
  }
  const cards=await input(id,'cards.json');assert.equal(cards.category,'supplied/mock');
  assert.deepEqual(cards.reads.evidence,e.evidence_receipts,id+' receipt mirrors');
  for(const {r}of records(e).filter(x=>x.r.kind==='implementation'))for(const ref of r.payload.verification){assert(e.evidence_receipts.some(receipt=>receipt.uri===ref.uri),id+' retained verification');assert(e.trusted.projects.some(project=>project.evidence_uris.includes(ref.uri)));}
  const currentOnly=e.evidence_receipts.filter(receipt=>/^https:\/\/evidence\.example\.invalid\/1000-(?:005|009|013)-1-TC-01\.S[1-4]-0$/.test(receipt.uri));
  assert.deepEqual(currentOnly.map(r=>r.uri).sort(),[],id+' no unused current-step receipt');
  for(const uri of ['https://evidence.example.invalid/1000-009-1-TC-01.S2-0','https://evidence.example.invalid/1000-009-1-TC-01.S3-0','https://evidence.example.invalid/1000-009-1-TC-01.S4-0']){assert(!cards.reads.evidence.some(r=>r.uri===uri),id);assert(!e.trusted.projects.some(project=>project.evidence_uris.includes(uri)),id);}
  assert(!e.evidence_receipts.some(r=>r.uri==='https://evidence.example.invalid/finding'),id+' no unused current finding');
  for(const forbidden of ['assessment','qa_report','findings','proposed_outcome','destination','candidate'])assert(!Object.hasOwn(cards,forbidden),id);
  assert((await readFile(path.join(dir,'invocation.txt'),'utf8')).includes('independently authorize caller qa-entrypoint'));
 }
 await t.test('mixed Story preserves exact types, consumers, request/assertions, two-hop extraction and three actual image inputs',async()=>{
  for(const id of ['I01-story']){
   const work=JSON.parse(await raw(id,'work.yaml')),cards=await input(id,'cards.json'),[api,child,db,ui]=work.testing_strategy.cases[0].steps;
   assert.deepEqual(work.testing_strategy.dispatch_order,[api.id,db.id,ui.id]);assert.deepEqual(api.children,[child.id]);assert.equal(child.caller,api.id);
   assert.equal(cards.reads.native.type_id,'22');
   const request=await raw(id,'collection/selected.bru');for(const text of ['/api/record','res.status: 200','res.body.tenant_id: tenant-a','res.body.state: ready','res.getBody().record_id'])assert(request.includes(text));
   assert(!request.includes('REQUIRED_PORT'));assert.equal(await raw(id,'query.sql'),query);
   assert.deepEqual(await input(id,'parameters.json'),['tenant-a',null]);assert.deepEqual(db.database.parameter_bindings,[{input:'record_id',index:1}]);
   const extraction=await input(id,'extraction.json');assert.equal(extraction.json_pointer,'/response/body/record_id');assert.equal(extraction.value,null);assert.equal(extraction.parent_exposes,api.id+'.record_id');
   assert.deepEqual(ui.bindings,[{from_step:api.id,output:'record_id',to_input:'record_id'}]);
   assert.equal(cards.tool_inputs.ui.checkpoints.length,3);
   for(const point of cards.tool_inputs.ui.checkpoints){const png=await readFile(path.join(p.cases[id],'input',point.screenshot));assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),point.width);assert.equal(png.readUInt32BE(20),point.height);assert.equal(point.digest,'sha256:'+hash(png));}
   assert.equal(cards.reads.pipeline.original_comments[0].author_id,'pipeline');
   assert.equal(cards.reads.access.actor_id,'ACTOR-01');assert.equal(cards.reads.access.tenant,'tenant-a');
   assert.deepEqual(cards.tool_inputs.api.responses,[{status:200,body:{record_id:'record-001',tenant_id:'tenant-a',state:'ready'}}]);
  }
 });
 await t.test('missing trusted parameter count is the sole context difference and rejects at the named boundary',async()=>{
  const base='I01-story',negative='I02-parameters';
  for(const file of ['work.yaml','query.sql','extraction.json','reference-map.json','database-context.json'])assert.equal(await raw(negative,file),await raw(base,file),file);
  const work=JSON.parse(await raw(base,'work.yaml')),db=work.testing_strategy.cases[0].steps.find(s=>s.skill==='qa-database');
  assert.deepEqual(db.database.parameters,['tenant-a',null]);assert.deepEqual(db.database.parameter_bindings,[{input:'record_id',index:1}]);
  const positive=await input(base,'facts.yaml'),missing=await input(negative,'facts.yaml');
  const operation=missing.operations.find(o=>o.step===db.id);assert.equal(operation.parameter_count,null);
  operation.parameter_count=positive.operations.find(o=>o.step===db.id).parameter_count;assert.deepEqual(missing,positive);
  const predecessors=await input(negative,'predecessors.json');assert.equal(JSON.parse(predecessors.requirements[0].context_body).operations.find(o=>o.step===db.id).parameter_count,null);
  assert.equal(await input(negative,'parameters.json'),null); // Sidecar is not the validator's refusal cause.
  assert.deepEqual(await input(base,'parameters.json'),db.database.parameters);
 });
 await t.test('stale deployment receipt and original pipeline body agree without changing current review or PR',async()=>{
  const positive=await input('I01-story','cards.json'),stale=await input('I11-stale-environment','cards.json');
  const e=await input('I11-stale-environment','predecessors.json'),current=targetRecord(e).payload.pr;
  assert.deepEqual(stale.reads.pr,positive.reads.pr);assert.equal(await raw('I11-stale-environment','work.yaml'),await raw('I01-story','work.yaml'));
  const old=stale.reads.evidence.filter(r=>r.kind==='environment'),fresh=positive.reads.evidence.filter(r=>r.kind==='environment');assert(old.length>0);
  for(let i=0;i<old.length;i++){
   const receipt=old[i],original=stale.reads.pipeline.original_comments.find(c=>c.uri===receipt.uri),body=JSON.parse(original.body);
   assert.equal(receipt.pr.source_revision,'f'.repeat(40));assert.notEqual(receipt.pr.source_revision,current.source_revision);
   assert.equal(body.source_revision,receipt.pr.source_revision);assert.equal(body.deployed_revision,receipt.pr.source_revision);
   assert.equal(original.id,receipt.details.comment_id);assert.equal(original.author_id,receipt.details.pipeline_actor_id);assert.equal(original.update_author_id,receipt.details.pipeline_actor_id);
   assert.equal(original.repository,receipt.pr.repository);assert.equal(original.pr_number,receipt.pr.number);
   assert.equal(body.repository,receipt.pr.repository);assert.equal(body.pr_number,receipt.pr.number);assert.equal(body.target_branch,receipt.pr.target_branch);
   assert.equal(body.target_reference,receipt.details.target_reference);assert.equal(body.readiness,'ready');
   const restored=structuredClone(receipt);restored.pr.source_revision=fresh[i].pr.source_revision;assert.deepEqual(restored,fresh[i]);
   const freshComment=positive.reads.pipeline.original_comments.find(c=>c.uri===receipt.uri),freshBody=JSON.parse(freshComment.body);
   assert.equal(freshBody.source_revision,current.source_revision);assert.equal(freshBody.deployed_revision,current.source_revision);
   body.source_revision=freshBody.source_revision;body.deployed_revision=freshBody.deployed_revision;assert.deepEqual(body,freshBody);
   const copy={...original,body:freshComment.body};assert.deepEqual(copy,freshComment);
  }
 });
});

test('PGB-129 source publication binds the actual native prerequisite and preserves original preview scope',async()=>{
 const drafts=JSON.parse(await read('docs/delivery/manager-r1/ticket-drafts.json')),metadata=JSON.parse(await read('docs/delivery/manager-r1/plan-metadata.json')),publication=JSON.parse(await read('docs/delivery/manager-r1/publication.json'));
 const draft=drafts.find(x=>x.id==='R1-26'),plan=metadata.find(x=>x.id==='R1-26'),a=publication.current_proof_conflict_amendment;
 assert.equal(draft.title,'Reject conflicting completion receipts');assert.deepEqual(draft.contract.prerequisites,[{ticket:'R1-25',required_outcome:'ai_qa_complete'}]);
 assert.deepEqual(plan.dependencies,['R1-25']);assert.equal(plan.days,1.28);assert.equal(plan.files.length,17);assert.equal(new Set(plan.files).size,17);
 assert.equal(draft.contract.acceptance_criteria.length,3);assert.equal(draft.contract.technical_acceptance_criteria.constraints.length,3);assert.equal(draft.contract.testing_strategy.human_review.cases.length,6);
 assert.deepEqual(draft.contract.testing_strategy.cases,[]);assert.deepEqual(draft.contract.testing_strategy.testing_types,[]);assert(draft.contract.testing_strategy.human_review.no_ai_cases_reason);
 const native=structuredClone(draft.contract);native.prerequisites[0].ticket='PGB-113';assert.equal(createHash('sha256').update(JSON.stringify(native)).digest('hex'),'b4443ea379deebc69e3deb56a4b94d8932ebd68bc772728d52700216069f191c');
 assert.deepEqual(a.stories,{'R1-26':'PGB-129'});assert.equal(a.native_id,'10589');assert.equal(a.native_publication_verified,true);assert.equal(a.description_sha256.prerequisite,'b6bacbb594b7008dfeba4722fd686b5379bd7336834cbcfa811d07187ce255b5');
 assert.deepEqual(a.dependency_links,[{id:'10704',type_id:'10000',from:'PGB-113',to:'PGB-129'},{id:'10705',type_id:'10000',from:'PGB-129',to:'PGB-81'}]);assert.equal(a.original_preview_cases,42);assert.equal(a.additive_cases,6);assert.equal(a.human_acceptance,'NOT_RUN');assert.equal(a.activation_authorized,false);
 const stories=await read('docs/delivery/manager-r1/stories.md');assert(stories.indexOf('## R1-25:')<stories.indexOf('## R1-26:'));assert(stories.indexOf('## R1-26:')<stories.indexOf('## R1-11:'));assert(stories.includes(JSON.stringify(draft.contract,null,2)));
 for(const file of ['docs/delivery/manager-r1/coverage.md','docs/product/coverage.md'])for(const id of ['W04','W12','M10'])assert((await read(file)).split('\n').find(l=>l.startsWith('| '+id+' |')).includes('R1-26-PC01–PC06'));
 const r=validateWork(JSON.stringify(draft.contract),{mode:'structure'});assert.equal(r.valid,true,JSON.stringify(r.diagnostics));assert.equal(r.readiness,'not_evaluated');
});

test('PGB-132 source publication preserves Core history and binds the preparation-only slice',async()=>{
 const drafts=JSON.parse(await read('docs/delivery/manager-r1/ticket-drafts.json')),metadata=JSON.parse(await read('docs/delivery/manager-r1/plan-metadata.json')),publication=JSON.parse(await read('docs/delivery/manager-r1/publication.json'));
 const contract=id=>drafts.find(x=>x.id===id).contract,plan=id=>metadata.find(x=>x.id===id),a=publication.qa_input_preparation_amendment,prepared=contract('R1-27'),dispatcher=contract('R1-08');
 assert.equal(hash(beforeOwnSelection(drafts).filter(x=>!['R1-08','R1-27','R1-30','R1-28'].includes(x.id))),'7a152baf7eeb37385f7560fc430d50a2ed7cfdd26de05df75c202695420ab4ad');
 const upstream=['R1-04','R1-06','R1-07','PGB-108','R1-24'];
 assert.deepEqual(plan('R1-27').dependencies,[...upstream,'R1-30']);assert.deepEqual(plan('R1-08').dependencies,[...upstream,'R1-27']);
 assert.deepEqual(prepared.prerequisites,[...upstream,'R1-30'].map(ticket=>({ticket,required_outcome:'ai_qa_complete'})));
 const preserved=structuredClone(prepared);preserved.prerequisites=preserved.prerequisites.filter(p=>p.ticket!=='R1-30');assert.equal(hash(preserved),'4abbf7e64a417adf166848d1a7675fb9a5d7c61e06add6609091f50607a5ef6f');
 assert.deepEqual(dispatcher.prerequisites,[...upstream,'R1-27'].map(ticket=>({ticket,required_outcome:'ai_qa_complete'})));
 assert.equal(hash([...plan('R1-27').files].sort()),'b9236d7417b1d57b9bbf8954a82b1ecfe24a314464733faa446571a2ce801af6');
 assert.equal(hash([...plan('R1-08').files].sort()),'5a066e773dae845a29b4df278fb01d129f6c6ba0a23f0c2585e1f66c540cfaad');
 assert.deepEqual(plan('R1-27').hours,{min:6.75,max:9.75});assert.deepEqual(plan('R1-08').hours,{min:10.5,max:14.5});
 assert.equal(plan('R1-27').days,1.21875);assert.equal(plan('R1-08').days,1.8125);
 const prepFiles=new Set(plan('R1-27').files),dispatchFiles=new Set(plan('R1-08').files);assert.equal(new Set([...prepFiles,...dispatchFiles]).size,23);assert.equal([...prepFiles].filter(f=>dispatchFiles.has(f)).length,6);
 for(const id of ['R1-27','R1-08']){assert(!plan(id).time_limit_exception);assert(plan(id).hours.max<16);const r=validateWork(JSON.stringify(contract(id)),{mode:'structure'});assert.equal(r.valid,true,JSON.stringify(r.diagnostics));}
 assert.deepEqual(a.stories,{'R1-27':'PGB-132'});assert.equal(a.native_id,'10592');assert.equal(a.native_publication_verified,true);assert.equal(a.human_acceptance,'NOT_RUN');assert.equal(a.activation_authorized,false);
 assert.deepEqual(a.description_sha256,{prerequisite:'42b2b5e0334cc2c520e802b83bb4f6dcf1afa58a59f1650ad13b60fddfbc3ca5',dispatcher_after:'6a553206c0768143f0b478fc787c98140a233cc937189b6818cb83a5db02c97a'});
 assert.equal(a.plan_sha256,'d5cf649c727ee3c83edc016ce7fc02ad0524c6c2f83f59d31c1c3e56cb070a5a');assert.equal(a.actual_base_binding.main,'19649b701646af065b583c8c603dca648d7413ca');assert.equal(a.source_composition_base.commit,'261a3856c9710a62be3c2c8ac4424778cb1ca0a0');
 assert.equal(a.original_dispatcher_criteria_and_cases_preserved,true);assert.equal(a.original_dispatcher_cases,3);assert.equal(a.additive_cases,3);
 const newEdges=[['PGB-74','PGB-132'],['PGB-76','PGB-132'],['PGB-77','PGB-132'],['PGB-108','PGB-132'],['PGB-110','PGB-132'],['PGB-132','PGB-78']];
 assert.deepEqual(a.dependency_links,newEdges.map(([from,to],i)=>({id:String(10709+i),type_id:'10000',from,to})));for(const [from,to]of newEdges)assert(publication.dependency_links.some(x=>x.from===from&&x.to===to));
 for(const from of ['PGB-74','PGB-76','PGB-77','PGB-108','PGB-110'])assert(a.preserved_links.some(x=>x.from===from&&x.to==='PGB-78'));
 for(const to of ['PGB-87','PGB-90'])assert(a.preserved_links.some(x=>x.from==='PGB-78'&&x.to===to));
 assert.equal(prepared.acceptance_criteria.length,4);assert.equal(prepared.technical_acceptance_criteria.constraints.length,3);
 assert.deepEqual(prepared.testing_strategy.human_review.cases.map(c=>c.id),['R1-27-H01','R1-27-H02','R1-27-H03']);
 for(const field of ['cases','testing_types','dispatch_order'])assert.deepEqual(prepared.testing_strategy[field],[]);assert(prepared.testing_strategy.human_review.no_ai_cases_reason);
 assert.equal(prepared.testing_strategy.preparation[0].id,'PREP-01');assert.deepEqual(prepared.testing_strategy.preparation[0].used_by,['DATA-01','R1-27-H01','R1-27-H02','R1-27-H03']);
 assert(publication.history.some(x=>x.story_count===26&&x.case_count===116));
 const support={H01:['A06','A07','W03','W06','W07'],H02:['A06','A07','W03','W07','W08'],H03:['A08','W06','W08','W09','W11','W12']};
 for(const file of ['docs/product/coverage.md','docs/delivery/manager-r1/coverage.md']){const rows=(await read(file)).split('\n');for(const [human,ids]of Object.entries(support))for(const id of ids)assert(rows.find(row=>row.startsWith('| '+id+' |')).includes('R1-27-'+human),file+': '+id+' '+human);}
 const stories=await read('docs/delivery/manager-r1/stories.md');assert(stories.indexOf('## R1-24:')<stories.indexOf('## R1-27:'));assert(stories.indexOf('## R1-27:')<stories.indexOf('## R1-08:'));assert(stories.includes(JSON.stringify(prepared,null,2)));
});

// Reconstruct the historical 27-Story checkpoint without changing its fixed hash.
function beforeThreeInputControls(drafts) {
 const baseline=structuredClone(drafts).filter(x=>x.id!=='R1-30');
 const preparation=baseline.find(x=>x.id==='R1-27').contract;
 assert.deepEqual(preparation.prerequisites.map(x=>x.ticket),['R1-04','R1-06','R1-07','PGB-108','R1-24','R1-30']);
 preparation.prerequisites.pop();
 return baseline;
}

test('PGB-136 partial source publication binds the exact own-selection split and preserves all earlier contracts',async()=>{
 const drafts=JSON.parse(await read('docs/delivery/manager-r1/ticket-drafts.json')),metadata=JSON.parse(await read('docs/delivery/manager-r1/plan-metadata.json')),publication=JSON.parse(await read('docs/delivery/manager-r1/publication.json'));
 const contract=id=>drafts.find(x=>x.id===id).contract,plan=id=>metadata.find(x=>x.id===id),own=contract('R1-28'),preview=contract('R1-11'),a=publication.own_ticket_selection_amendment;
 assert.equal(hash(beforeThreeInputControls(beforeOwnSelection(drafts)).filter(x=>x.id!=='R1-11')),'9e9e6274f7677f1150650cef8dd44233bec0e17769624af4646082f02cc28a81');
 assert.equal(hash(beforeOwnSelection(drafts).find(x=>x.id==='R1-11').contract),'a913b1a7e2f8efe4a129d35d8c15d29f3474a647851dfacdaea8f4a3fe32b403');
 assert.deepEqual(own.prerequisites,[{ticket:'R1-26',required_outcome:'ai_qa_complete'}]);assert.deepEqual(plan('R1-28').dependencies,['R1-26']);
 assert.equal(own.acceptance_criteria.length,3);assert.equal(own.technical_acceptance_criteria.constraints.length,3);
 assert.deepEqual(own.testing_strategy.human_review.cases.map(c=>c.id),['R1-28-OC01','R1-28-OC02','R1-28-OC03','R1-28-OC04','R1-28-OC05','R1-28-OC06']);
 for(const field of ['cases','testing_types','dispatch_order'])assert.deepEqual(own.testing_strategy[field],[]);assert(own.testing_strategy.human_review.no_ai_cases_reason);
 const native=structuredClone(own);native.prerequisites[0].ticket='PGB-129';assert.equal(hash(native),'1138b04d17c451dbeac01a1d8c3e9463fed4070ae844a5d10d71483d65cd001f');
 const residual=structuredClone(preview);for(const prerequisite of residual.prerequisites)prerequisite.ticket=publication.stories[prerequisite.ticket]??prerequisite.ticket;
 assert.equal(hash(residual),'b5d07161501b813ef54e978fe6f8ca7095eadd7c01b83c2876384ec6df1720d2');
 for(const [id,days]of [['R1-28',1.92],['R1-11',1.53]]){assert.equal(plan(id).days,days);assert.equal(plan(id).files.length,20);assert.equal(new Set(plan(id).files).size,20);assert(!plan(id).time_limit_exception);}
 const publicationFiles=['docs/delivery/manager-r1/README.md','docs/delivery/manager-r1/plan-metadata.json','docs/delivery/manager-r1/ticket-drafts.json','docs/delivery/manager-r1/publication.json','docs/delivery/manager-r1/stories.md','docs/delivery/manager-r1/coverage.md','docs/product/README.md','docs/product/coverage.md','test/qa-helper-contract.test.mjs'];
 for(const file of publicationFiles)assert(plan('R1-28').files.includes(file),file);for(const file of ['test/story-authoring.test.mjs','test/manager-preview.test.mjs'])assert(plan('R1-28').files.includes(file),file);assert(!plan('R1-28').files.includes('test/receipt-chain.test.mjs'));assert(plan('R1-28').files.includes('README.md'));assert(!plan('R1-28').files.includes('lib/manager/availability.mjs'));
 assert.equal(Number(metadata.reduce((n,x)=>n+x.days,0).toFixed(5)),47.86625);
 assert.equal(publication.stories['R1-28'],'PGB-136');assert.equal(a.native_id,'10596');assert.equal(a.parent,'PGB-66');assert.equal(a.native_publication_verified,true);
 assert.deepEqual(a.dependency_links,[{id:'10715',type_id:'10000',from:'PGB-129',to:'PGB-136'},{id:'10716',type_id:'10000',from:'PGB-136',to:'PGB-81'}]);for(const edge of a.dependency_links)assert(publication.dependency_links.some(x=>x.id===edge.id&&x.from===edge.from&&x.to===edge.to));
 assert.deepEqual(a.preserved_link_ids,['10637','10638','10686','10705']);assert.equal(a.description_sha256.prerequisite,'905166bacbffd705eed56e3ee4c018ded0ccb047a23a8d3b37cdcb51809a71b7');assert.equal(a.description_sha256.preview_after,'7506971ef565beb236c1006ade1104ad83762e748526dedc45c28420ffdadfb4');
 assert.equal(a.plan_sha256,'9ee1a33ad6862b62fb3f5639b2013041916a6292c4fc29456c07f9b0b4bb5694');assert.equal(a.review_manifest_sha256,'4b61a0a13355f58c35314d57afb96e59421499bdaa005f7320c268fa8eab97d1');
 assert.deepEqual(a.stage_receipt,{'PGB-136':{status:'In Progress',comment_id:'10772'},'PGB-81':{status:'Blocked',comment_id:'10773'}});assert(a.initial_edit_failure.includes('CONTENT_LIMIT_EXCEEDED'));
 assert.equal(a.source_composition_base.commit,'29ba86017ec8ce5c27392f699a9a387cc8902260');assert(a.source_composition_base.status.includes('unmerged PGB-132'));
 assert.equal(a.original_preview_cases,42);assert.equal(a.additive_cases,6);assert.equal(a.human_acceptance,'NOT_RUN');assert.equal(a.original_preview_human_acceptance,'NOT_RUN');assert.equal(a.activation_authorized,false);
 assert(publication.history.some(x=>x.story_count===27&&x.case_count===119));assert.deepEqual(publication.current_source_scope.pending_source_amendments,['PGB-137']);
 const stories=await read('docs/delivery/manager-r1/stories.md');assert(stories.indexOf('## R1-26:')<stories.indexOf('## R1-28:'));assert(stories.indexOf('## R1-28:')<stories.indexOf('## R1-11:'));assert(stories.includes(JSON.stringify(own,null,2)));
 const support={W04:['OC02','OC05'],W12:['OC02','OC05','OC06'],M01:['OC04'],M02:['OC04'],M03:['OC01','OC05'],M04:['OC04'],M05:['OC04'],M06:['OC01','OC03','OC06'],M07:['OC03'],M10:['OC02','OC05']};
 for(const file of ['docs/product/coverage.md','docs/delivery/manager-r1/coverage.md']){const rows=(await read(file)).split('\n');for(const [id,cases]of Object.entries(support))for(const caseId of cases)assert(rows.find(row=>row.startsWith('| '+id+' |')).includes('R1-28-'+caseId),file+': '+id+' '+caseId);}
 const result=validateWork(JSON.stringify(own),{mode:'structure'});assert.equal(result.valid,true,JSON.stringify(result.diagnostics));assert.equal(result.readiness,'not_evaluated');
});
