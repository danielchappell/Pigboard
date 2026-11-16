import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import canonicalize from 'canonicalize';
import { validateWork } from '../lib/contracts/work.mjs';
import { readDatabase, connectionConfig, safeError, QaError } from '../skills/qa-database/scripts/read-postgres.mjs';
import { prepareFixture, serveFixture, query } from './fixtures/qa-helper-case.mjs';

const read = p => readFile(new URL('../' + p, import.meta.url), 'utf8');

// Explicit pre81 data access for dated guards only; current checks read current files.
const pre81Digests={
  "ticket-drafts.json": {
    "raw": "9ffe565fa1565be450711f4f7fd87b8da3ec8071a3e9e4701426d658ede34990",
    "json": "eb14a9bbd25c649d209e2743e869ed613745f84db6e5629252b4d3abea92d653",
    "canonical": "9da9ac2fc693db4c2fe90402378bc400c5ce0b8c779fab95c5f8c1f76f29a767"
  },
  "plan-metadata.json": {
    "raw": "a6feff8162b173221522ddc257b6c244a800a17aebeb3e1bfee7404179e643d2",
    "json": "eb58c13c50f7acfe1610b73abe139703b4c92e312f8034c96d897843f41fe1b1",
    "canonical": "11cacaa064a13f4d67f897e65c5e5c2f215b147593e7a91ee73edee869415e02"
  },
  "publication.json": {
    "raw": "d4cf6fe3e07bdc156f29c4792eadc33a18f03392b2e0e07e2e9409398793d65e",
    "json": "8624d22abca43b0f9929c7de5df31edbebc1a3e858269677cdae5b0f6fb907ad",
    "canonical": "c9350ea0c9ad239450642e4e8666ece52114b7061a6c72a92d0f1924593c7611"
  },
  "config/skill-bundle.json": {
    "raw": "6385214b9fa380394b6da33ffbe4eb43015f6bb3c0983d86e58ed61c83f260c2",
    "json": "4fb87e988d1f8c4044cac5181b3df9d6c14ce0bb119b127865e822a0643c1ad8",
    "canonical": "2205195a0e67d68a177f3ae937d512a8c4ab39822f5b0d741116802222e905d1"
  }
};
async function pre81Capture(name){
 assert(Object.hasOwn(pre81Digests,name),'Only the three named catalog files and old bundle may be captured');
 const p=JSON.parse(await read('docs/delivery/manager-r1/publication.json')),c=p.installed_repair_preview_amendment.historical_source_capture.files[name],expected=pre81Digests[name];
 const sha=value=>createHash('sha256').update(value).digest('hex');
 assert.equal(sha(c.raw),expected.raw,name+' captured raw bytes');
 assert.deepEqual(JSON.parse(c.raw),c.object,name+' captured raw/object equality');
 assert.equal(sha(JSON.stringify(c.object)),expected.json,name+' JSON.stringify digest');
 assert.equal(sha(canonicalize(c.object)),expected.canonical,name+' RFC8785 digest');
 return structuredClone(c.object);
}

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

test('shared instruction/reference closure keeps exact ownership, observations and composer/publisher boundary explicit',async()=>{
  const common=await read('skills/qa-api/references/structured-steps.md');
  for(const name of ['qa-api','qa-bruno','qa-database','qa-ui']){
    const skill=await read(`skills/${name}/SKILL.md`);assert(skill.includes('structured-steps.md'));assert(skill.includes('BLOCKED'));assert.match(skill,/revision/i);
  }
  for(const term of ['read_only: true','original raw','testVerdict','NOT_RUN','supplied/mock','human case','configured_target','before success','No expression evaluation','one Bruno child','20-second','canonical ledger enum'])assert(common.includes(term),term);
  const api=await read('skills/qa-api/SKILL.md');assert(api.includes('exactly one prescribed'));assert(!api.includes('If another approved execution'));
  const db=await read('skills/qa-database/SKILL.md');assert(db.includes('parameter_bindings'));assert(db.includes('zero-based'));assert(!db.includes('different engine requires'));
  const ui=await read('skills/qa-ui/SKILL.md');assert(ui.includes('supplied_default'));assert(ui.includes('ui.screenshot_checkpoints'));assert(ui.includes('transient image display'));
  // Structural instruction/closure checks, not evidence that an agent executed it.
  const composer=await read('skills/qa-entrypoint/SKILL.md'), record=await read('skills/qa-entrypoint/references/execution-record.md'), profile=await read('skills/qa-entrypoint/references/cursor.md');
  for(const text of [composer,record])assert(text.includes('PGB-78'));
  assert(composer.indexOf('## 1. Bind inputs')<composer.indexOf('## 2. Validate'));
  assert(composer.indexOf('## 2. Validate')<composer.indexOf('## 3. Dispatch'));
  assert(composer.indexOf('## 3. Dispatch')<composer.indexOf('## 4. Execute finite'));
  assert(composer.indexOf('## 4. Execute finite')<composer.indexOf('## 5. Preserve'));
  assert(composer.indexOf('## 5. Preserve')<composer.indexOf('## 6. Submit'));
  for(const field of ['scope','capabilities','work','assignment','retained_delivery','prepared_assessment','known_requests','test_verdict','human_only','qa_report','findings','human_pending','intended_destination','actual_jira_status','delivery_outcome','recovery'])assert(composer.includes('`'+field+'`'),field);
  for(const term of ['dispatch_order','parameter_count','max_duration_seconds','depends_on','until_expected','all_observations','canonical row enum','20-second outer bound','union','whole-unit','original raw','actual configured latest available Grok'])assert(composer.includes(term),term);
  for(const term of ['not a second request','case-specific','supplied/mock','candidate bytes','NOT_ATTEMPTED','UNCERTAIN'])assert(record.replace(/\s+/g,' ').includes(term),term);
  for(const term of ['same-release','Grok','High','clock','immutable','no subagents','PGB-90','PGB-58'])assert(profile.replace(/\s+/g,' ').includes(term),term);
  assert(!composer.includes('In Progress, same Story'));
  assert(!composer.includes('still consumes basic prose'));
  assert(!composer.includes('testVerdict`, `deliveryOutcome'));
  const publisher=await read('skills/qa-jira/SKILL.md');assert(publisher.includes('../qa-entrypoint/SKILL.md'));
  assert(!publisher.includes('is incompatible with this protocol'));
  assert(publisher.includes('No In Progress transition'));
  assert(publisher.includes('Any unresolved access/evidence/cleanup/scope inability takes priority while preserving earlier defects'));

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
import { records, targetRecord, changeTarget, executionProofFixtures } from './fixtures/qa-partial-results.mjs';
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
 const drafts=beforeReadConfiguration(await pre81Capture('ticket-drafts.json'),'drafts'),plan=beforeReadConfiguration(await pre81Capture('plan-metadata.json'),'metadata'),publication=beforeReadConfiguration(await pre81Capture('publication.json'),'publication');
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
 const currentCases=new Set(JSON.parse(await read('docs/delivery/manager-r1/ticket-drafts.json')).flatMap(x=>x.contract.testing_strategy.human_review.cases.map(c=>c.id)));for(const id of coverage.matchAll(/R1-\d\d-(?:H\d\d|S\d\d)/g))assert(currentCases.has(id[0]),id[0]);
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
 const plan=beforeReadConfiguration(await pre81Capture('plan-metadata.json'),'metadata');
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
 const drafts=beforeReadConfiguration(await pre81Capture('ticket-drafts.json'),'drafts'),metadata=beforeReadConfiguration(await pre81Capture('plan-metadata.json'),'metadata'),publication=beforeReadConfiguration(await pre81Capture('publication.json'),'publication');
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
 assert.deepEqual([...new Set(Object.keys(p.cases).map(id=>id.slice(0,3)))].sort(),Array.from({length:14},(_,i)=>'I'+String(i+1).padStart(2,'0')));
 const summary=JSON.parse(await readFile(p.preparation,'utf8'));assert.equal(summary.cases.length,51);
 assert.deepEqual(Object.fromEntries(Array.from({length:14},(_,i)=>{const family='I'+String(i+1).padStart(2,'0');return [family,Object.keys(p.cases).filter(id=>id.startsWith(family+'-')).length];})),{I01:2,I02:6,I03:2,I04:2,I05:5,I06:4,I07:2,I08:4,I09:3,I10:7,I11:4,I12:2,I13:4,I14:4});
 assert.equal(summary.human_acceptance,'R1-27-H01/H02/H03 NOT RUN; R1-30-H01/H02/H03 NOT RUN');
 assert.equal(summary.source_module_sha256,'sha256:'+hash(await readFile(new URL('./fixtures/qa-helper-case.mjs',import.meta.url))));
 for(const [id,dir]of Object.entries(p.cases)){
  assert.deepEqual(await readdir(path.join(dir,'output')),[],id);
  const operator=JSON.parse(await readFile(path.join(p.runDir,'operator',id+'.json'),'utf8'));
  assert.deepEqual(operator.native_cases,['R1-27-H01','R1-27-H02','R1-27-H03']);
  assert.deepEqual(operator.shared_control_cases,['I01-story','I02-parameters','I11-stale-environment'].includes(id)?['R1-30-H01','R1-30-H02','R1-30-H03']:[]);
  const files=await readdir(path.join(dir,'input'));for(const forbidden of ['assessment.json','record.yaml','verdict.json','expectations.json','candidate.json'])assert(!files.includes(forbidden),id);
  const index=await input(id,'index.json');assert.equal(index.preparation_id,'PREP-01');
  for(const a of index.artifacts){const bytes=await readFile(path.join(p.runDir,a.path));assert.equal(a.digest,'sha256:'+hash(bytes));assert.equal((await stat(path.join(p.runDir,a.path))).mode&0o777,0o600);}
  const work=JSON.parse(await raw(id,'work.yaml')),facts=await raw(id,'facts.yaml');
  assert.deepEqual(index.consumers,work.testing_strategy.cases.flatMap(c=>c.steps.map(s=>s.id)));
  const result=validateWork(await raw(id,'work.yaml'),{mode:'start',contextInput:facts});
  assert.equal(result.valid,!['I02-parameters','I05-missing-bound','I14-oversized-ledger'].includes(id),id+JSON.stringify(result.diagnostics));
  if(id==='I02-parameters')assert(result.diagnostics.some(d=>d.code==='DATABASE_PARAMETERS'));
  if(id==='I05-missing-bound')assert(result.diagnostics.some(d=>d.code==='OBSERVATION'));
  if(id==='I14-oversized-ledger')assert.deepEqual(result.diagnostics.map(d=>[d.code,d.path]),[['LEDGER_BYTES','/testing_strategy']]);
  assert.equal(parseConfig(await raw(id,'scope.yaml')).valid,true,id);
  const e=await input(id,'predecessors.json'),target=targetRecord(e);assert.equal(target.kind,'review',id);
  assert.equal(validateHandoff(JSON.stringify(target),{mode:'record'}).valid,true);
  const expectedChain=!['I02-parameters','I05-missing-bound','I10-incomplete-pages','I13-untrusted-approval','I14-oversized-ledger'].includes(id);
  const receipt=chain(e);assert.equal(receipt.valid,expectedChain,id+JSON.stringify(receipt.diagnostics));
  if(id==='I02-parameters')assert(receipt.diagnostics.some(d=>d.code==='DATABASE_PARAMETERS'));
  const diagnostic={ 'I05-missing-bound':'OBSERVATION','I10-incomplete-pages':'INCOMPLETE_READ','I13-untrusted-approval':'ACTOR','I14-oversized-ledger':'LEDGER_BYTES' }[id];
  if(diagnostic)assert(receipt.diagnostics.some(d=>d.code===diagnostic),id+JSON.stringify(receipt.diagnostics));
  for(const {r}of records(e).filter(x=>x.r.ticket_id===target.ticket_id)){
   assert(!['qa','repair_request','dependency_wait'].includes(r.kind),id+' current terminal leak');
   if(r.kind==='blocked'||r.kind==='resume_authorization')assert(id.startsWith('I13-'));
  }
  const cards=await input(id,'cards.json');assert.equal(cards.category,'supplied/mock');
  assert.deepEqual(cards.reads.evidence,e.evidence_receipts,id+' receipt mirrors');
  for(const {r}of records(e).filter(x=>x.r.kind==='implementation'))for(const ref of r.payload.verification){assert(e.evidence_receipts.some(receipt=>receipt.uri===ref.uri),id+' retained verification');assert(e.trusted.projects.some(project=>project.evidence_uris.includes(ref.uri)));}
  const currentOnly=e.evidence_receipts.filter(receipt=>/^https:\/\/evidence\.example\.invalid\/1000-(?:005|009|013)-1-TC-01\.S[1-4]-0$/.test(receipt.uri));
  assert.deepEqual(currentOnly.map(r=>r.uri).sort(),id.startsWith('I13-')?['https://evidence.example.invalid/1000-013-1-TC-01.S1-0','https://evidence.example.invalid/1000-013-1-TC-01.S2-0']:[],id+' no unused current-step receipt');
  for(const uri of ['https://evidence.example.invalid/1000-009-1-TC-01.S2-0','https://evidence.example.invalid/1000-009-1-TC-01.S3-0','https://evidence.example.invalid/1000-009-1-TC-01.S4-0']){assert(!cards.reads.evidence.some(r=>r.uri===uri),id);assert(!e.trusted.projects.some(project=>project.evidence_uris.includes(uri)),id);}
  assert(!e.evidence_receipts.some(r=>r.uri==='https://evidence.example.invalid/finding'),id+' no unused current finding');
  for(const forbidden of ['assessment','qa_report','findings','proposed_outcome','destination','candidate'])assert(!Object.hasOwn(cards,forbidden),id);
  const invocation=await readFile(path.join(dir,'invocation.txt'),'utf8');
  for(const text of ['immutable installed qa-entrypoint/SKILL.md','independently authorize caller qa-entrypoint','input/work.yaml','input/facts.yaml','qa-jira preflight before helper dispatch','API alone owns its Bruno child','fixed supplied/mock declarations','actual inspected evidence','qa-jira final once','snake_case','Never expose operator files'])assert(invocation.includes(text),id+': '+text);
  assert(!invocation.includes('execute legacy qa-entrypoint'));
  assert(!invocation.includes('prepared_assessment: input/assessment.json'));

 }
 await t.test('mixed Story/Bug preserve exact types, consumers, request/assertions, two-hop extraction and three actual image inputs',async()=>{
  for(const id of ['I01-story','I01-bug']){
   const work=JSON.parse(await raw(id,'work.yaml')),cards=await input(id,'cards.json'),[api,child,db,ui]=work.testing_strategy.cases[0].steps;
   assert.deepEqual(work.testing_strategy.dispatch_order,[api.id,db.id,ui.id]);assert.deepEqual(api.children,[child.id]);assert.equal(child.caller,api.id);
   assert.equal(cards.reads.native.type_id,id==='I01-story'?'22':'23');
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
 await t.test('negative facts remain incomplete at their own boundary without rewriting original expectations',async()=>{
  const positive=await raw('I01-story','work.yaml');
  for(const id of ['I02-child-receipt','I02-extraction','I02-provenance','I02-query','I02-parameters','I02-checkpoint','I10-wrong-actor','I10-wrong-tenant'])assert.equal(await raw(id,'work.yaml'),positive,id);
  assert.equal((await input('I02-extraction','extraction.json')).json_pointer,null);
  await assert.rejects(stat(path.join(p.cases['I02-query'],'input/query.sql')),/ENOENT/);
  assert.equal(await input('I02-parameters','parameters.json'),null);
  assert.equal((await input('I02-checkpoint','cards.json')).tool_inputs.ui.checkpoints.length,2);
  const checkpointWork=JSON.parse(await raw('I02-checkpoint','work.yaml'));assert.equal(checkpointWork.testing_strategy.cases[0].steps.find(s=>s.skill==='qa-ui').ui.screenshot_checkpoints.length,3);
  await assert.rejects(stat(path.join(p.cases['I02-checkpoint'],'input/screens/ui-2.png')),/ENOENT/);
  assert.equal((await input('I02-provenance','cards.json')).tool_inputs.api.responses[0].actor_id,'OTHER');
  assert.deepEqual((await input('I10-wrong-actor','access.json')).actors,[]);
  assert.equal((await input('I10-wrong-tenant','access.json')).actors[0].tenant,'tenant-b');
  assert.equal((await input('I14-no-model','capabilities.json')).model_profile,null);
  assert.equal((await input('I14-no-clock','capabilities.json')).clock,null);
  assert.deepEqual((await input('I14-no-helper','capabilities.json')).helpers,[]);
 });
 await t.test('earlier unresolved child history is bound before invocation without available fresh API observations',async()=>{
  const id='I02-child-receipt',cards=await input(id,'cards.json'),positive=await input('I01-story','cards.json');
  const work=JSON.parse(await raw(id,'work.yaml')),e=await input(id,'predecessors.json'),access=await input(id,'access.json'),current=targetRecord(e);
  const c=work.testing_strategy.cases[0],[parent,child]=c.steps,history=cards.reads.child_operation_history;
  assert.equal(history.length,1);const [attempt]=history;assert.equal(attempt.category,'supplied/mock');assert(attempt.attempt_id.trim());
  assert.equal(attempt.ticket_id,current.ticket_id);assert.deepEqual(attempt.assignment,current.assignment);assert.equal(attempt.requirements_digest,current.requirements_digest);
  assert.deepEqual(attempt.pr,current.payload.pr);assert.equal(attempt.deployed_revision,e.evidence_receipts.find(r=>r.kind==='environment').pr.source_revision);
  assert.equal(attempt.case_id,c.id);assert.equal(attempt.parent_step,parent.id);assert.equal(attempt.child_step,child.id);
  assert.deepEqual(parent.children,[attempt.child_step]);assert.equal(attempt.caller,child.caller);assert.equal(attempt.caller,parent.id);assert.equal(attempt.parent_caller,parent.caller);
  assert.equal(attempt.actor_id,access.actor_id);assert.equal(attempt.actor_id,child.api.actor);assert.equal(attempt.tenant,access.tenant);assert.equal(attempt.identity_reference,access.identity_reference);
  assert.deepEqual(attempt.request,{method:child.api.method,operation:child.api.operation,route:child.api.route,request_selector:child.api.request_selector});
  assert.deepEqual(attempt.original_transport,{submitted:true});assert.deepEqual(attempt.response,{available:false});assert.deepEqual(attempt.report,{available:false});assert.equal(attempt.execution,'unknown');assert.equal(attempt.effects,'unknown');
  const clock=await input(id,'clock.json'),lastReview=e.comment_pages.flatMap(p=>p.comments).find(x=>x.id===e.target.comment_id);
  assert.equal(attempt.attempted_at,'2026-11-15T10:01:03Z');assert.equal(attempt.unavailability_observed_at,'2026-11-15T10:01:04Z');assert.equal(clock.origin,'2026-11-15T10:01:10Z');
  assert(lastReview.updated<attempt.attempted_at);assert(attempt.attempted_at<attempt.unavailability_observed_at);assert(attempt.unavailability_observed_at<clock.origin);
  const positiveClock=await input('I01-story','clock.json');clock.origin=positiveClock.origin;assert.deepEqual(clock,positiveClock);
  assert.deepEqual(cards.tool_inputs.api,{step:parent.id,child:child.id,responses:[]});
  const copy=structuredClone(cards);delete copy.reads.child_operation_history;copy.tool_inputs.api=positive.tool_inputs.api;assert.deepEqual(copy,positive,'all other cards unchanged');
  assert(!Object.hasOwn(positive.reads,'child_operation_history'));assert.equal(positive.tool_inputs.api.selected_request_count,1);assert.equal(positive.tool_inputs.api.responses[0].body.state,'ready');
  for(const file of ['work.yaml','facts.yaml','predecessors.json','known-requests.json','access.json','extraction.json','collection/selected.bru'])assert.equal(await raw(id,file),await raw('I01-story',file),file);
  assert.deepEqual(await input(id,'known-requests.json'),[]);assert.equal((await input(id,'extraction.json')).value,null);
  const invocation=await readFile(path.join(p.cases[id],'invocation.txt'),'utf8');
  assert(invocation.startsWith('Before invoking qa-api, independently bind and supply input/cards.json#/reads/child_operation_history'));
  const composerStart=invocation.indexOf('Use the exact immutable installed qa-entrypoint/SKILL.md');
  assert(composerStart>0);assert(invocation.indexOf('before any action')<composerStart);
  assert.equal(invocation.slice(composerStart),await readFile(path.join(p.cases['I01-story'],'invocation.txt'),'utf8'),'case-only history precedes unchanged generic composer invocation');
  assert.match(invocation,/earlier submitted operation/);assert.match(invocation,/not a reply to a fresh tool call/);
  // These assertions inspect inputs. No helper interpreter or call counter runs,
  // and declaration validity does not prove execution readiness or zero calls.
 });
 await t.test('finite observation, dependency, inability, static and publisher seam inputs retain distinct facts',async()=>{
  for(const id of ['I03-pending-ready','I03-all-pending','I04-all-ready','I04-one-mismatch']){
   const work=JSON.parse(await raw(id,'work.yaml')),c=work.testing_strategy.cases[0],clock=await input(id,'clock.json');
   assert.deepEqual(c.observation.schedule,[0,30,60]);assert.equal(c.observation.deadline_seconds,90);assert.equal(c.observation.completion,id.startsWith('I03')?'until_expected':'all_observations');
   assert.deepEqual(work.testing_strategy.dispatch_order,['E01.S1']);assert.deepEqual(clock.offsets,[0,30,60]);assert.equal(clock.whole_unit_bound_seconds,20);assert.equal(clock.child_bound_seconds,5);
  }
  assert.deepEqual((await input('I03-pending-ready','cards.json')).tool_inputs.api.responses.map(r=>r.body.state),['pending','ready','ready']);
  assert.deepEqual((await input('I04-one-mismatch','cards.json')).tool_inputs.api.responses.map(r=>r.body.state),['ready','pending','ready']);
  assert.deepEqual((await input('I05-next-offset','clock.json')).unit_elapsed_seconds,[31]);
  assert.deepEqual((await input('I05-missed-offset','clock.json')).now_offsets_seconds,[0,31]);
  const pure=await input('I08-pure-wait','cards.json'),fail=await input('I08-fail-wait','cards.json');
  for(const cards of [pure,fail]){assert.equal(cards.dependency_observations.length,1);const cause=cards.dependency_observations[0];assert.equal(cause.original_response.body.resolved,false);assert.equal(cause.original_response.body.case_id,cause.case_id);assert.equal(cause.upstream.request.digest,cause.original_response.body.request.digest);}
  assert.deepEqual((await input('I08-missing-cause','cards.json')).dependency_observations,[]);
  assert.notDeepEqual(pure.tool_inputs.api.responses,fail.tool_inputs.api.responses);
  assert.equal((await input('I07-cleanup-inability','cards.json')).tool_inputs.database.rollback,'unavailable');
  assert.equal((await input('I07-domain-inability','cards.json')).capability_observations[0].body.observation_started,false);
  const joined=JSON.parse(await raw('I06-join','work.yaml')),dbCase=joined.testing_strategy.cases.find(c=>c.steps.some(s=>s.skill==='qa-database')),db=dbCase.steps.find(s=>s.skill==='qa-database');
  assert.deepEqual(dbCase.depends_on,[]);assert.deepEqual(db.bindings,[]);assert.deepEqual(db.inputs,{record_id:'fixture-1'});assert.deepEqual(db.database.parameters,['example','fixture-1']);assert.deepEqual(db.database.parameter_bindings,[]);
  assert.deepEqual((await input('I06-join','cards.json')).tool_inputs.api.responses[0].body,{results:[]});assert.deepEqual((await input('I06-join','cards.json')).tool_inputs.database.rows,[]);
  const joinCase=joined.testing_strategy.cases.find(c=>c.depends_on.length===2);assert(joinCase);assert.deepEqual(joinCase.depends_on.map(d=>d.step).sort(),['TC-01.S3','TC-01.S4']);
  assert.equal((await input('I01-story','cards.json')).tool_inputs.database.rows.length,1);
  const staticWork=JSON.parse(await raw('I09-static-bug','work.yaml'));assert.deepEqual(staticWork.testing_strategy.cases,[]);assert.deepEqual(staticWork.testing_strategy.human_review.cases.map(c=>c.id),['HQA-01','HQA-02']);
  assert.deepEqual((await input('I11-missing-environment','cards.json')).reads.pipeline.original_comments,[]);
  assert.equal((await input('I12-append-unknown','cards.json')).append.storage,'ambiguous');
  assert.equal((await input('I12-transition-unknown','cards.json')).transition.resolving_status,'unknown');
 });
 await t.test('emitted missing environment proof rejects test-only partial claims while preserving actual input facts',async()=>{
  const positive=await input('I01-story','predecessors.json'),positiveCards=await input('I01-story','cards.json');
  const proof=positive.evidence_receipts.filter(r=>r.kind==='environment');assert.equal(proof.length,1);
  assert.deepEqual(positiveCards.reads.evidence,positive.evidence_receipts);
  assert.equal(JSON.parse(positiveCards.reads.pipeline.original_comments[0].body).source_revision,proof[0].pr.source_revision);
  const specimens=executionProofFixtures();
  for(const [id,result]of [['I11-partial-pass-null-proof','PASS'],['I11-partial-fail-null-proof','FAIL']]){
   const emitted=await input(id,'predecessors.json'),cards=await input(id,'cards.json');
   const withoutProof=structuredClone(positive);withoutProof.evidence_receipts=withoutProof.evidence_receipts.filter(r=>r.kind!=='environment');
   assert.deepEqual(emitted,withoutProof,id+' actual envelope changes only environment proof');
   assert.deepEqual(cards.reads.evidence,emitted.evidence_receipts);assert.deepEqual(cards.reads.pipeline.original_comments,[]);
   assert(!Object.hasOwn(cards,'proof_inputs'));assert(!emitted.evidence_receipts.some(r=>r.kind==='environment'));
   assert.deepEqual(targetRecord(emitted).payload.pr,targetRecord(positive).payload.pr);assert.notEqual(targetRecord(emitted).payload.pr,null);
   const expectedCards=structuredClone(positiveCards);expectedCards.reads.evidence=withoutProof.evidence_receipts;expectedCards.reads.pipeline.original_comments=[];
   if(result==='FAIL')expectedCards.tool_inputs.api.responses[0].body.state='pending';
   assert.deepEqual(cards,expectedCards,id+' observations/current reads retained');
   for(const file of ['work.yaml','facts.yaml','clock.json','capabilities.json','known-requests.json'])assert.equal(await raw(id,file),await raw('I01-story',file),id+' '+file);
   // Only actual emitted environment slices vary. This canonical candidate is
   // test-local, never an actor input or a claim of earlier helper execution.
   const original=specimens['proof-blocked-exact-'+result.toLowerCase()],before=JSON.stringify(original);
   for(const [source,valid]of [[positive,true],[emitted,false]]){
    const probe=structuredClone(original),environment=source.evidence_receipts.filter(r=>r.kind==='environment');
    probe.evidence_receipts=[...probe.evidence_receipts.filter(r=>r.kind!=='environment'),...structuredClone(environment)];
    for(const project of probe.trusted.projects)project.evidence_uris=[...new Set([...project.evidence_uris,...environment.map(r=>r.uri)])];
    assert.notEqual(targetRecord(probe).payload.pr,null);assert.equal(targetRecord(probe).payload.qa_report.steps[0].result,result);
    const checked=chain(probe);assert.equal(checked.valid,valid,id+JSON.stringify(checked.diagnostics));
    if(!valid)assert.deepEqual(checked.diagnostics.map(d=>[d.code,d.path]),[['EVIDENCE','/comment_pages/0/comments/3/body/payload/qa_report/environment']]);
   }
   assert.equal(JSON.stringify(original),before,'canonical specimen remains unchanged');
  }
 });
 await t.test('emitted oversized declared evidence binds all mirrors and refuses only complete pre-dispatch projection',async()=>{
  const id='I14-oversized-ledger',work=JSON.parse(await raw(id,'work.yaml')),facts=await input(id,'facts.yaml');
  const positiveWork=JSON.parse(await raw('I01-story','work.yaml')),positiveFacts=await raw('I01-story','facts.yaml');
  const steps=work.testing_strategy.cases.flatMap(c=>c.steps),positiveSteps=positiveWork.testing_strategy.cases.flatMap(c=>c.steps);
  assert.deepEqual(steps.map(s=>s.id),positiveSteps.map(s=>s.id));assert.equal(steps.length,4);
  for(let i=0;i<steps.length;i++){
   assert.equal(steps[i].evidence.length,100);assert.equal(new Set(steps[i].evidence).size,100);assert.equal(steps[i].evidence[0],positiveSteps[i].evidence[0]);
   assert.deepEqual(facts.operations.find(o=>o.step===steps[i].id).contract,steps[i]);
   steps[i].evidence=positiveSteps[i].evidence;
  }
  assert.deepEqual(work,positiveWork,'IDs/order/children/outputs/expectations/human cases unchanged');
  const emitted=await input(id,'predecessors.json'),cards=await input(id,'cards.json'),bound=emitted.requirements.find(r=>r.ticket_id===emitted.target.ticket_id);
  const actual=JSON.parse(await raw(id,'work.yaml')),digest=digestValue(actual);
  assert.equal(bound.body,await raw(id,'work.yaml'));assert.equal(bound.context_body,await raw(id,'facts.yaml'));assert.equal(bound.digest,digest);
  assert.equal(cards.reads.native.description,bound.body);assert.deepEqual(cards.reads.comments,emitted.comment_pages);assert.deepEqual(cards.reads.evidence,emitted.evidence_receipts);
  assert.equal(emitted.issues.find(i=>i.id===emitted.target.ticket_id).requirements_digest,digest);
  for(const {r}of records(emitted).filter(x=>x.r.ticket_id===emitted.target.ticket_id))assert.equal(r.requirements_digest,digest);
  for(const receipt of emitted.evidence_receipts.filter(r=>Object.hasOwn(r.details,'requirements_digest')))assert.equal(receipt.details.requirements_digest,digest);
  assert.equal(emitted.target.digest,digestValue(targetRecord(emitted)));assert(!Object.hasOwn(cards,'evidence_label_inputs'));
  const checked=validateWork(bound.body,{mode:'start',contextInput:bound.context_body});
  assert.equal(checked.valid,false);assert.equal(checked.draft_valid,true);assert.equal(checked.start_structure_valid,true);assert.equal(checked.start_semantics_valid,false);
  assert.deepEqual(checked.diagnostics.map(d=>[d.code,d.path]),[['LEDGER_BYTES','/testing_strategy']]);
  assert.deepEqual(checked.ledger_budget,{encoding:'json-yaml-1.2',projection_bytes:25003,limit_bytes:16384,ai_steps:4,human_cases:2,omitted_entries:0,actual_publication:'not_evaluated'});
  assert.equal(validateWork(await raw('I01-story','work.yaml'),{mode:'start',contextInput:positiveFacts}).valid,true);
 });
 await t.test('designated historical reuse closes the review/blocker/auth proofs and separates earlier observations from current output',async()=>{
  const e=await input('I13-valid','predecessors.json'),history=await input('I13-valid','historical.json'),rows=records(e);
  const blocker=rows.find(x=>x.r.kind==='blocked'),auth=rows.find(x=>x.r.kind==='resume_authorization');
  assert.deepEqual(blocker.r.payload.qa_report.steps.map(s=>s.result),['PASS','PASS','NOT_RUN','NOT_RUN']);assert(!blocker.r.payload.findings);
  assert.deepEqual(auth.r.payload.blocked_result,history.blocker);assert.equal(auth.c.author_id,'human');
  const parent=history.artifacts.find(a=>a.body.kind==='api_parent_observation'),child=history.artifacts.find(a=>a.body.kind==='bruno_response');
  assert.deepEqual(parent.body.response,child.body.response);assert.equal(parent.body.child_source.uri,child.uri);
  assert.equal(parent.body.child_source.response_digest,'sha256:'+hash(JSON.stringify(child.body.response)));
  for(const artifact of history.artifacts){assert.equal(artifact.body_sha256,'sha256:'+hash(JSON.stringify(artifact.body)));assert.equal(artifact.body.category,'historical supplied/mock');assert(artifact.body.observed_at<history.domain_inabilities[0].observed_at);assert(e.evidence_receipts.some(r=>r.uri===artifact.uri&&r.observed_digest===artifact.body_sha256));}
  assert(history.domain_inabilities.every(f=>f.observed_at<blocker.c.created));assert(blocker.c.updated<auth.c.created);assert(auth.c.updated<history.new_execution_not_before);
  assert.equal(history.reuse.length,2);for(const ref of history.reuse){const receipt=e.evidence_receipts.find(r=>r.uri===ref.uri);assert.equal(receipt.kind,'reuse');assert.deepEqual(receipt.details.source,history.blocker);assert.equal(receipt.details.case_id,'TC-01');assert(['TC-01.S1','TC-01.S2'].includes(receipt.details.step_id));}
  // Validate separate historical snapshots; future authorization is not present
  // in the earlier blocker snapshot. No current terminal is invented for a pass.
  for(const entry of [blocker,auth]){const copy=structuredClone(e);copy.target={ticket_id:entry.r.ticket_id,comment_id:entry.c.id,record_id:entry.r.record_id,digest:digestValue(entry.r)};copy.issues[0].stage_id=copy.trusted.projects[0].stages[entry.r.to_stage];if(entry===blocker)for(const page of copy.comment_pages){page.comments=page.comments.filter(c=>c.created<=blocker.c.created);page.total=page.comments.length;}const r=chain(copy);assert.equal(r.valid,true,entry.r.kind+JSON.stringify(r.diagnostics));}
  const stale=await input('I13-stale','historical.json');assert(stale.artifacts.every(a=>a.body.pr.source_revision==='f'.repeat(40)));
  assert.equal((await input('I13-wrong-tenant','historical.json')).artifacts.find(a=>a.body.kind==='bruno_response').body.tenant,'foreign');
  const untrusted=await input('I13-untrusted-approval','predecessors.json');assert(chain(untrusted).diagnostics.some(d=>d.code==='ACTOR'));
  for(const id of ['I13-stale','I13-wrong-tenant','I13-untrusted-approval'])assert.equal(await raw(id,'work.yaml'),await raw('I13-valid','work.yaml'));
  for(const id of ['I13-valid','I13-stale','I13-wrong-tenant','I13-untrusted-approval']){const clock=await input(id,'clock.json'),old=await input(id,'historical.json');assert.equal(clock.origin,old.new_execution_not_before);assert.equal(clock.origin,'2026-11-15T10:03:01Z');assert.equal(old.artifacts[0].body.observed_at,'2026-11-15T10:01:03Z');assert.deepEqual(clock.offsets,[0]);assert.equal(clock.whole_unit_bound_seconds,20);}
  assert.equal((await input('I01-story','clock.json')).origin,'2026-11-15T10:00:00Z');
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

test('current PGB-132 forecast agrees across product, delivery and metadata while earlier estimates remain history',async()=>{
 const metadata=JSON.parse(await read('docs/delivery/manager-r1/plan-metadata.json')),plan=metadata.find(x=>x.id==='R1-27'),dated=beforeReadConfiguration(await pre81Capture('plan-metadata.json'),'metadata');
 const forecast={key:'PGB-132',minDays:'1.0625',maxDays:'1.59375',days:1.59375,files:12,minHours:8.5,maxHours:12.75};
 assert(plan,'Current R1-27 metadata must exist');
 assert.equal(plan.forecast_provenance.native_key,forecast.key);assert.equal(plan.forecast_provenance.min_days,forecast.minDays);assert.equal(plan.forecast_provenance.max_days,forecast.maxDays);
 assert.equal(plan.days,forecast.days);assert.equal(plan.files.length,forecast.files);assert.equal(new Set(plan.files).size,forecast.files);
 const expected=`Current PGB-132 whole residual forecast: **${forecast.minHours}–${forecast.maxHours} hours / ${forecast.minDays}–${forecast.maxDays} days**.`;
 const product=await read('docs/product/README.md'),delivery=await read('docs/delivery/manager-r1/README.md');
 for(const document of [product,delivery]){const statements=document.split('\n').filter(line=>line.startsWith('Current PGB-132 whole residual forecast:'));assert.equal(statements.length,1);assert(statements[0].startsWith(expected));}
 const lower=dated.reduce((sum,x)=>sum+(x.hours?x.hours.min/8:x.days),0).toFixed(5),upper=dated.reduce((sum,x)=>sum+x.days,0).toFixed(5);
 assert(delivery.includes(`Dated 29-Story metadata aggregate: **${lower}–${upper} days**`));
 assert(delivery.includes(`### R1-27 — ${forecast.files} residual forecast files, ${forecast.minHours}–${forecast.maxHours} hours`));
 assert(delivery.split('\n').find(line=>line.startsWith('| R1-27 /')).includes(`| ${forecast.minDays}–${forecast.maxDays} | ${forecast.files} |`));
 for(const document of [product,delivery]){assert(document.includes('15 November'));assert(document.includes('6.75–9.75h'));assert(document.includes('16 November'));assert(document.includes('7.5–11.25h'));assert(document.includes('history'));}
});

test('PGB-129 source publication binds the actual native prerequisite and preserves original preview scope',async()=>{
 const drafts=beforeReadConfiguration(await pre81Capture('ticket-drafts.json'),'drafts'),metadata=beforeReadConfiguration(await pre81Capture('plan-metadata.json'),'metadata'),publication=beforeReadConfiguration(await pre81Capture('publication.json'),'publication');
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
 const drafts=beforeReadConfiguration(await pre81Capture('ticket-drafts.json'),'drafts'),metadata=beforeReadConfiguration(await pre81Capture('plan-metadata.json'),'metadata'),publication=beforeReadConfiguration(await pre81Capture('publication.json'),'publication');
 const contract=id=>drafts.find(x=>x.id===id).contract,plan=id=>metadata.find(x=>x.id===id),a=publication.qa_input_preparation_amendment,prepared=contract('R1-27'),dispatcher=contract('R1-08');
 assert.equal(hash(beforeOwnSelection(drafts).filter(x=>!['R1-08','R1-27','R1-30','R1-28'].includes(x.id))),'7a152baf7eeb37385f7560fc430d50a2ed7cfdd26de05df75c202695420ab4ad');
 const upstream=['R1-04','R1-06','R1-07','PGB-108','R1-24'];
 assert.deepEqual(plan('R1-27').dependencies,[...upstream,'R1-30']);assert.deepEqual(plan('R1-08').dependencies,[...upstream,'R1-27']);
 assert.deepEqual(prepared.prerequisites,[...upstream,'R1-30'].map(ticket=>({ticket,required_outcome:'ai_qa_complete'})));
 const preserved=structuredClone(prepared);preserved.prerequisites=preserved.prerequisites.filter(p=>p.ticket!=='R1-30');assert.equal(hash(preserved),'4abbf7e64a417adf166848d1a7675fb9a5d7c61e06add6609091f50607a5ef6f');
 assert.deepEqual(dispatcher.prerequisites,[...upstream,'R1-27'].map(ticket=>({ticket,required_outcome:'ai_qa_complete'})));
 assert.equal(hash([...plan('R1-27').files].sort()),'b9236d7417b1d57b9bbf8954a82b1ecfe24a314464733faa446571a2ce801af6');
 assert.equal(hash([...plan('R1-08').files].sort()),'5a066e773dae845a29b4df278fb01d129f6c6ba0a23f0c2585e1f66c540cfaad');
 assert.deepEqual(plan('R1-27').hours,{min:8.5,max:12.75});assert.deepEqual(plan('R1-08').hours,{min:10.5,max:14.5});
 assert.equal(plan('R1-27').days,1.59375);assert.equal(plan('R1-08').days,1.8125);
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
 const drafts=beforeReadConfiguration(await pre81Capture('ticket-drafts.json'),'drafts'),metadata=beforeReadConfiguration(await pre81Capture('plan-metadata.json'),'metadata'),publication=beforeReadConfiguration(await pre81Capture('publication.json'),'publication');
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
 assert.equal(Number(metadata.reduce((n,x)=>n+x.days,0).toFixed(5)),48.24125);
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

const readConfigHash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

// Reconcile only the reviewed runtime/catalog split. Every predecessor is a complete object.
const catalogStateKeys=['source_repair_preview_amendment','machine_repair_preview_amendment','current_pr_repair_amendment','duplicate_qa_repair_amendment','readable_repair_preview_amendment','readable_repair_integration_amendment'];
const catalogSourceKeys=['native_source_issue_inspection_amendment','native_observation_repair_amendment','native_target_identity_repair_amendment'];
const catalogReceiptLinks=[{from:'PGB-145',to:'PGB-150',id:'10744',preserved:true},{from:'PGB-150',to:'PGB-147',id:'10745',preserved:true},{from:'PGB-152',to:'PGB-150',id:'10748',preserved:true},{from:'PGB-154',to:'PGB-150',id:'10751',preserved:true},{from:'PGB-145',to:'PGB-155',id:'10752',preserved:false},{from:'PGB-155',to:'PGB-150',id:'10753',preserved:false}];
// Reverse only the named PGB-156 final runtime rebind before the reviewed catalog layers.
function beforeFinalRuntimeRebind(value,kind){
 const prior=structuredClone(value);
 if(kind==='drafts'){
  assert.equal(readConfigHash(prior),'eb14a9bbd25c649d209e2743e869ed613745f84db6e5629252b4d3abea92d653');
  assert.equal(prior.length,31);assert(!prior.some(x=>x.id==='R1-41'||x.id==='R1-42'));return prior;
 }
 const expectedBoundary='ad6e348269539dc109e048e9ec1adaf7c2d02b99cfb341c3a604d92257b148d5';
 if(kind==='metadata'){
  assert.equal(readConfigHash(prior),'eb58c13c50f7acfe1610b73abe139703b4c92e312f8034c96d897843f41fe1b1');
  const rows=prior.filter(x=>x.id==='R1-36');assert.equal(rows.length,1);const r=rows[0],a=r.source_catalog_integration;assert(a);
  assert.equal(readConfigHash(a),'9100bfd70281c9b6c1351d7995300aa11a5b1f2d803fc96cfdbf41ab0e328dc3');
  assert.deepEqual(r.hours,{min:9.95,max:14.3});assert.equal(r.days,1.7875);
  assert.equal(a.runtime.commit,'fd5b04eaa2cd7265f4528a8be37beb75ff463254');assert.equal(a.runtime.tree,'879a3382edafc52989446a67d93508a16e44bec5');
  assert.deepEqual(a.runtime.parents,['23bb352b4d9f945f65e34d3d15d28dced51d9b80','0c61e80151ffcc7cb4d319f6048d46357dc650dd']);
  assert.deepEqual(a.whole_hours,{runtime:{min:9.95,max:14.3},catalog:{min:5.45,max:8.65},boundary_repair:{min:5.55,max:9.4}});
  assert.deepEqual(a.source_forecast_days,{min:48.26625,max:51.935});assert.deepEqual(a.source_plus_catalog_days,{min:48.9475,max:53.01625});
  assert.deepEqual(a.known_repair_total_days,{min:49.76,max:54.40375});assert.deepEqual(a.including_boundary_repair_days,{min:50.45375,max:55.57875});
  assert.equal(readConfigHash(a.native_boundary_repair),expectedBoundary);assert.equal(a.native_boundary_repair.native_key,'PGB-156');
  assert.equal(a.native_boundary_repair.receipt_sha256,'05c33a85cbc7f4e3d381fbc354df15b4f4c2324105de863a0a51ec8e4cf1e908');
  assert.deepEqual(a.native_boundary_repair.links.map(x=>[x.id,x.from,x.to]),[['10754','PGB-145','PGB-156'],['10755','PGB-156','PGB-150']]);
  assert.equal(Object.keys(a.native_boundary_repair.changed_artifacts_sha256).length,5);assert.equal(readConfigHash(a.historical23bb),'40770768832a0205576b59ae0fce850c17c9a32ad5e14a7f736ee7f8631c49c0');
  const h=a.historical23bb;r.hours=h.hours;r.days=h.days;r.delivery_state=h.delivery_state;
  a.runtime=h.runtime;a.whole_hours=h.whole_hours;a.source_forecast_days=h.source_forecast_days;a.source_plus_catalog_days=h.source_plus_catalog_days;a.known_repair_total_days=h.known_repair_total_days;
  delete a.including_boundary_repair_days;delete a.native_boundary_repair;delete a.historical23bb;
  assert.equal(readConfigHash(prior),'af020bceb570fb00c5b7632c3262cd048f7c6ea2b72cfa48141d47f80bd92c4d');return prior;
 }
 assert.equal(kind,'publication');assert.equal(readConfigHash(prior),'8624d22abca43b0f9929c7de5df31edbebc1a3e858269677cdae5b0f6fb907ad');
 const a=prior.source_inspection_catalog_integration_amendment;assert(a);assert.equal(readConfigHash(a),'92b3753b354125107f6c62bc56f784aa8b1669a2e28b764c6f967efa94a3fe62');
 assert.equal(readConfigHash(a.native_boundary_repair),expectedBoundary);assert.equal(a.native_boundary_repair.receipt_sha256,'05c33a85cbc7f4e3d381fbc354df15b4f4c2324105de863a0a51ec8e4cf1e908');
 assert.deepEqual([prior.story_count,prior.case_count,prior.requirement_count,prior.scenario_count],[31,136,53,41]);assert.equal(prior.stories['R1-36'],'PGB-150');assert(!Object.hasOwn(prior.stories,'R1-42'));
 assert.deepEqual(prior.current_source_scope.pending_source_amendments.at(-1),'PGB-156');assert.equal(prior.current_source_scope.pending_source_dependencies.at(-1).native_link_id,'10755');
 assert.deepEqual(prior.current_source_scope.forecast_days,{min:48.26625,max:51.935});assert.deepEqual(a.including_boundary_repair_days,{min:50.45375,max:55.57875});
 assert.deepEqual(a.whole_hours,{runtime:{min:9.95,max:14.3},catalog:{min:5.45,max:8.65},boundary_repair:{min:5.55,max:9.4}});
 assert.equal(readConfigHash(a.historical23bb),'4624d7d8e719b2ddb8e40b69101d013080455569fb2ce78759ff6d427ddf31ca');
 const h=a.historical23bb;prior.status=h.status;prior.current_source_scope=h.current_source_scope;
 a.runtime=h.runtime;a.current_source_status=h.status;a.source_forecast_days=h.source_forecast_days;a.source_plus_catalog_days=h.source_plus_catalog_days;a.known_repair_total_days=h.known_repair_total_days;a.whole_hours=h.whole_hours;a.human=h.human;a.pending_source_dependencies=h.pending_source_dependencies;
 delete a.including_boundary_repair_days;delete a.native_boundary_repair;delete a.historical23bb;
 assert.equal(readConfigHash(prior),'a5d3adc6dc53cf4640b8887b2955fff11e88142ef3e1f9a5597dfee0efe9bddd');return prior;
}

const catalogCurrentKeys=["date","epic","grooming","status","stories","operational_tasks","story_count","case_count","requirement_count","scenario_count","dependency_links","baseline_publication","follow_on_tasks","health_precedence_correction","baseline_design_commit","reviewed_design_artifacts","startup_alarm_correction","history","qa_split","repeated_parent_amendment","current_source_scope","baseline_before_amendments","current_proof_conflict_amendment","qa_input_preparation_amendment","qa_input_controls_amendment","own_ticket_selection_amendment","read_configuration_amendment","native_source_issue_inspection_amendment","native_observation_repair_amendment","native_target_identity_repair_amendment","source_repair_preview_amendment","machine_repair_preview_amendment","current_pr_repair_amendment","duplicate_qa_repair_amendment","readable_repair_preview_amendment","readable_repair_integration_amendment","source_inspection_catalog_integration_amendment"];
function beforeCatalogIntegration(value,kind){
 const prior=structuredClone(value);
 if(kind==='drafts'){
  assert.equal(readConfigHash(prior),'eb14a9bbd25c649d209e2743e869ed613745f84db6e5629252b4d3abea92d653');
  assert.equal(prior.length,31);assert(!prior.some(x=>x.id==='R1-41'));return prior;
 }
 if(kind==='metadata'){
  assert.equal(readConfigHash(prior),'af020bceb570fb00c5b7632c3262cd048f7c6ea2b72cfa48141d47f80bd92c4d');
  const rows=prior.filter(x=>x.id==='R1-36');assert.equal(rows.length,1);const r=rows[0],a=r.source_catalog_integration;assert(a);
  assert.deepEqual(r.hours,{min:9.7,max:13.85});assert.equal(r.days,1.73125);
  assert.equal(a.plan_sha256,'64089b7feb21d36a4ed2fce8d2923c98d2475c6b27d433d92833dc1ee5ccd9e1');
  assert.deepEqual(a.whole_hours,{runtime:{min:9.7,max:13.85},catalog:{min:5,max:7.85}});
  assert.deepEqual(a.source_forecast_days,{min:48.235,max:51.87875});assert.deepEqual(a.source_plus_catalog_days,{min:48.86,max:52.86});
  assert.deepEqual(a.known_repair_total_days,{min:49.6725,max:54.2475});
  assert.deepEqual(a.native_catalog.source_id,'R1-41');assert.deepEqual(a.native_catalog.native_key,'PGB-155');
  assert.equal(a.native_catalog.receipt_sha256,'bb881eb154977a84b49b758fe6d4b42d109831dc153a14bc6bdd416e6cda2dd2');
  assert.deepEqual(a.native_catalog.links,catalogReceiptLinks);assert.equal(a.native_catalog.source_composed,false);
  assert.equal(a.runtime_paths.length,8);assert.equal(a.catalog_paths.length,10);assert.equal(a.final_parent_union_paths.length,18);
  assert.deepEqual([...new Set([...a.runtime_paths,...a.catalog_paths])].sort(),[...r.files].sort());
  assert.deepEqual(a.historical449.hours,{min:11.25,max:15.7});assert.equal(a.historical449.days,1.9625);
  r.hours=a.historical449.hours;r.days=a.historical449.days;r.delivery_state=a.historical449.delivery_state;delete r.source_catalog_integration;
  assert.equal(readConfigHash(prior),'163c5a517dfa878043db4db2e209e7e69e7da37a0015d87574bf06a45e14e54c');return prior;
 }
 assert.equal(kind,'publication');assert.equal(readConfigHash(prior),'a5d3adc6dc53cf4640b8887b2955fff11e88142ef3e1f9a5597dfee0efe9bddd');
 assert.deepEqual(Object.keys(prior),catalogCurrentKeys);const a=prior.source_inspection_catalog_integration_amendment;assert(a);
 assert.equal(readConfigHash(a),'3be54e0d258212aa0dea0bda8fb46092a15efb008bd622f787121ef0db3b6541');
 assert.equal(a.plan_sha256,'64089b7feb21d36a4ed2fce8d2923c98d2475c6b27d433d92833dc1ee5ccd9e1');
 assert.deepEqual([a.runtime.commit,a.runtime.actual_state_main,a.runtime.actual_state_main_tree,a.runtime.same_tree],['23bb352b4d9f945f65e34d3d15d28dced51d9b80','a17841ee3e9e1a08a0ad3c322ae98fbff1cb41a9','de9fbb160b016fefcac70424761fa9905520cb58',true]);
 assert.equal(a.runtime.tree,'8ba753f6ab12405e87d03ce5eda30bcd4876535f');
 assert.equal(a.predecessor_publications.source449.json_sha256,'5919293a6640bd5952577f3a21793089fba7087fcbe80d4e4a5aa4dffbdad116');
 assert.equal(a.predecessor_publications.state_main.json_sha256,'549c5f4913e4be75a72c16e0f985dcc534b01c7b1cc40901d744f61f9af8c8a6');
 assert.deepEqual(Object.keys(a.amendment_hashes.source),catalogSourceKeys);assert.deepEqual(Object.keys(a.amendment_hashes.state),catalogStateKeys);
 for(const k of catalogSourceKeys)assert.equal(readConfigHash(prior[k]),a.amendment_hashes.source[k],k);
 for(const k of catalogStateKeys)assert.equal(readConfigHash(prior[k]),a.amendment_hashes.state[k].json_sha256,k);
 assert.deepEqual([prior.story_count,prior.case_count,prior.requirement_count,prior.scenario_count],[31,136,53,41]);
 assert.equal(prior.status,a.current_source_status);assert.equal(prior.current_source_scope.status,a.current_source_status);
 assert.deepEqual(a.counts,{stories:31,human_groups:136,requirements:53,scenarios:41});
 assert.deepEqual(prior.current_source_scope.pending_source_amendments,['PGB-137','PGB-146','PGB-147','PGB-148','PGB-149','PGB-152','PGB-154','PGB-151','PGB-153','PGB-155']);
 assert.deepEqual(prior.current_source_scope.pending_source_dependencies.at(-1),a.pending_source_dependencies[0]);
 assert.deepEqual(prior.current_source_scope.forecast_days,{min:48.235,max:51.87875});
 assert.deepEqual(a.source_plus_catalog_days,{min:48.86,max:52.86});assert.deepEqual(a.known_repair_total_days,{min:49.6725,max:54.2475});
 assert.deepEqual(a.catalog.links,catalogReceiptLinks);assert.deepEqual(a.packet,{variants:35,controls:8,private_projection:1});assert.equal(a.paths.runtime.length,8);assert.equal(a.paths.catalog.length,10);assert.equal(a.paths.final_parent_union.length,18);
 assert.equal(new Set([...a.paths.runtime,...a.paths.catalog]).size,18);
 assert.deepEqual([a.human.p150,a.human.p152,a.human.p154,a.human.p155],Array(4).fill('NOT_RUN (0/4)').map((x,i)=>['NOT_RUN (0/4)','NOT_RUN (0/2)','NOT_RUN (0/1)','NOT_RUN (0/1)'][i]));
 assert.equal(a.verification.activation_authorized,false);
 for(const k of catalogStateKeys)delete prior[k];delete prior.source_inspection_catalog_integration_amendment;
 prior.status=a.historical449.status;prior.story_count=a.historical449.story_count;prior.case_count=a.historical449.case_count;
 prior.current_source_scope=a.historical449.current_source_scope;
 assert.equal(readConfigHash(prior),'5919293a6640bd5952577f3a21793089fba7087fcbe80d4e4a5aa4dffbdad116');return prior;
}
function stateCheckpoint(value,kind){
 const state=kind==='publication'?Object.fromEntries(catalogStateKeys.map(k=>[k,structuredClone(value[k])])):null;
 const prior=beforeSourceIssueInspection(value,kind);
 if(kind==='publication'){
  for(const k of catalogStateKeys)prior[k]=state[k];
  assert.equal(readConfigHash(prior),'549c5f4913e4be75a72c16e0f985dcc534b01c7b1cc40901d744f61f9af8c8a6');
  assert.equal(createHash('sha256').update(canonicalize(prior)).digest('hex'),'7e999933eba22d8c7109df7a23aaae4715a60a97fc9abb6ea96ef6f53f887a7b');
 }else assert.equal(readConfigHash(prior),kind==='drafts'?'2346cacf0b501580a2f9284d49068a82926c0b04ee9f5e74e0c1bc50104f8f62':'47ee11ec184c11874371e80cfe78653ac933c963d62199b88ae002a0c2d5a088');
 return prior;
}

// A dated State projection is never passed back through the current-catalog assertion.
function stateBeforeReadConfiguration(value,kind){
 const state=stateCheckpoint(value,kind),earlier=beforeReadConfiguration(value,kind);
 if(kind==='publication')for(const k of catalogStateKeys)earlier[k]=structuredClone(state[k]);
 return earlier;
}
async function stateRawFile(file){
 assert(['ticket-drafts.json','plan-metadata.json'].includes(file));
 const kind=file==='ticket-drafts.json'?'drafts':'metadata';
 const current=await pre81Capture(file);
 return JSON.stringify(stateCheckpoint(current,kind),null,2)+'\n';
}

// Assert and reverse only the verified native-only R1-40 repair before the unchanged R1-38 and source-history guards.
function beforeNativeTargetIdentityRepair(value,kind) {
 const prior=beforeCatalogIntegration(beforeFinalRuntimeRebind(value,kind),kind);
 if(kind==='drafts') {
  assert.equal(readConfigHash(prior),'eb14a9bbd25c649d209e2743e869ed613745f84db6e5629252b4d3abea92d653');
  assert(!prior.some(x=>x.id==='R1-40'));return prior;
 }
 if(kind==='metadata') {
  assert.equal(readConfigHash(prior),'163c5a517dfa878043db4db2e209e7e69e7da37a0015d87574bf06a45e14e54c');
  const rows=prior.filter(x=>x.id==='R1-36');assert.equal(rows.length,1);const story=rows[0],a=story.native_target_identity_repair;assert(a);
  assert.equal(readConfigHash(a),'7bbac5ed143e0e846c9d607736298754bd3632385902eb35b63a1eebbf2a9f22');
  assert.deepEqual([a.source_id,a.native_key,a.native_id,a.parent,a.source_composed],['R1-40','PGB-154','10614','PGB-66',false]);
  assert.equal(a.reviewed_plan_sha256,'a479bb57472cabb565e34133fdecdc9923396223c1ba7db909c267b58f68bf8b');
  assert.equal(a.receipt_sha256,'be2202f8398ef5f511a11afd4209f2ae083cbed4121d3e35f619c84521867d8a');
  assert.deepEqual([a.native_prerequisite.link_id,a.native_child_to_feature.link_id],['10750','10751']);
  assert.deepEqual(a.verified_parent_body_sha256,{before:'5aa49be36a16b0bc8077796aa62033c6a1793018a830653e9e077f249d252ea9',after:'758552ba1ff16df8570e751ca7ef303e247cb5598d0835adb3c89ccc7646937b'});
  assert.deepEqual([a.pinned_feature_revision,a.pinned_feature_tree],['1524127c6d9ffbad8481cf7ce86bcc19cb712f52','b35fa3cb57dbdd133d61f76f6b6d1ba19ebb43a2']);
  assert.deepEqual(a.changed_files,['lib/jira/read.mjs','test/jira-read.test.mjs','docs/manager-preview.md','docs/delivery/manager-r1/README.md','docs/delivery/manager-r1/plan-metadata.json','docs/delivery/manager-r1/publication.json','test/story-authoring.test.mjs','test/qa-helper-contract.test.mjs']);
  assert.equal(a.changed_file_count,8);assert.equal(new Set(a.changed_files).size,8);assert.deepEqual(a.child_hours,{min:3,max:5.1});assert.deepEqual(a.child_days,{min:0.375,max:0.6375});
  assert.deepEqual(a.child_human_groups,{count:1,status:'NOT_RUN'});assert.deepEqual(a.source_counts,{stories:31,human_groups:136,requirements:53,scenarios:41});
  assert.deepEqual(a.source_forecast_days,{min:48.42875,max:52.11});assert.deepEqual(a.historical152_delivery_forecast_days,{min:48.86625,max:52.86});assert.deepEqual(a.current_delivery_forecast_days,{min:49.24125,max:53.4975});
  assert.equal(readConfigHash(story.delivery_state),'814d9fe0a1b515e87a978ef16d3ae80c443baff732d85f5738e4c065e67eec9c');
  assert.equal(readConfigHash(a.historical_parent.delivery_state),'ae47ae3d15c37da54fc083efac4df17e72dd26b06ffb3231a8717d87dcc32e6e');
  assert.equal(readConfigHash(story.native_observation_repair),'683a1a5ff5cdcd8f5ac3eef9ace2f61ed080496b3b213f27708cdd7b8fb62012');
  story.delivery_state=a.historical_parent.delivery_state;delete story.native_target_identity_repair;
  assert.equal(readConfigHash(prior),'349721b5858c1fbb3494371c3c41ac8a464e3a463c435245558f7636759c9c67');return prior;
 }
 assert.equal(kind,'publication');assert.equal(readConfigHash(prior),'5919293a6640bd5952577f3a21793089fba7087fcbe80d4e4a5aa4dffbdad116');
 assert.equal(readConfigHash(prior.status),'958477720aa43c0814539a4158e6e207673c698280cada83296e260fb36e0487');
 assert.equal(readConfigHash(prior.current_source_scope.status),'958477720aa43c0814539a4158e6e207673c698280cada83296e260fb36e0487');
 assert.deepEqual([prior.story_count,prior.case_count,prior.requirement_count,prior.scenario_count],[31,136,53,41]);assert(!Object.hasOwn(prior.stories,'R1-40'));
 const a=prior.native_target_identity_repair_amendment;assert(a);assert.equal(readConfigHash(a),'841ed253700348ceb1a572ec7a5a379f9ded8e15a04ebcdc238af421e8dfdb48');
 assert.deepEqual([a.source_id,a.native_key,a.native_id,a.parent],['R1-40','PGB-154','10614','PGB-66']);assert.deepEqual(a.source_composed,[]);assert.deepEqual(a.source_counts,{stories:31,human_groups:136,requirements:53,scenarios:41});
 assert.equal(a.reviewed_plan_sha256,'a479bb57472cabb565e34133fdecdc9923396223c1ba7db909c267b58f68bf8b');assert.equal(a.receipt_sha256,'be2202f8398ef5f511a11afd4209f2ae083cbed4121d3e35f619c84521867d8a');
 assert.deepEqual(a.parent_body_sha256,{before:'5aa49be36a16b0bc8077796aa62033c6a1793018a830653e9e077f249d252ea9',after:'758552ba1ff16df8570e751ca7ef303e247cb5598d0835adb3c89ccc7646937b'});assert.equal(a.parent_contract_preserved_except_child_prerequisite,true);
 assert.deepEqual(a.native_links.map(x=>[x.from,x.to,x.id]),[['PGB-145','PGB-150','10744'],['PGB-150','PGB-147','10745'],['PGB-152','PGB-150','10748'],['PGB-145','PGB-154','10750'],['PGB-154','PGB-150','10751']]);
 assert.deepEqual(a.child_hours,{min:3,max:5.1});assert.deepEqual(a.child_days,{min:0.375,max:0.6375});assert.equal(a.child_changed_files.length,8);assert.deepEqual(a.child_human_groups,{count:1,status:'NOT_RUN'});
 const pending={source_id:'R1-36',native_key:'PGB-150',prerequisite_source_id:'R1-40',prerequisite_native_key:'PGB-154',required_outcome:'ai_qa_complete',native_link_id:'10751',status:'native_verified_source_pending'};
 assert.deepEqual(prior.current_source_scope.pending_source_amendments,['PGB-137','PGB-146','PGB-147','PGB-148','PGB-149','PGB-152','PGB-154']);
 assert.deepEqual(prior.current_source_scope.pending_source_dependencies.at(-1),pending);assert.equal(prior.current_source_scope.pending_source_dependencies.length,4);assert.deepEqual(a.pending_source_dependency,pending);
 assert.deepEqual(prior.current_source_scope.forecast_days,{min:48.42875,max:52.11});assert.deepEqual(a.source_forecast_days,prior.current_source_scope.forecast_days);
 assert.deepEqual(a.historical152_delivery_forecast_days,{min:48.86625,max:52.86});assert.deepEqual(a.current_delivery_forecast_days,{min:49.24125,max:53.4975});
 assert.equal(Number((48.42875+3.5/8+3/8).toFixed(5)),49.24125);assert.equal(Number((52.11+6/8+5.1/8).toFixed(5)),53.4975);
 assert.equal(readConfigHash(a.historical_parent.status),'6818d30efc77711a9a30184178c893391c6e09cadc03ae56c00b1d2236f80f5b');
 assert.equal(readConfigHash(a.historical_parent.current_source_scope_status),'6818d30efc77711a9a30184178c893391c6e09cadc03ae56c00b1d2236f80f5b');
 assert.equal(readConfigHash(prior.native_observation_repair_amendment),'de763f9470c3feb256bfb07acbe89395b83b81b2c8c731b2807937b7c7803cd9');
 prior.current_source_scope.pending_source_amendments.pop();prior.current_source_scope.pending_source_dependencies.pop();prior.status=a.historical_parent.status;prior.current_source_scope.status=a.historical_parent.current_source_scope_status;delete prior.native_target_identity_repair_amendment;
 assert.equal(readConfigHash(prior),'803a89019366f32951d2be2e34fb237c5977a3526f6101daeb6a1f4bc7584081');return prior;
}

// Assert and reverse the verified native-only R1-38 repair before the unchanged source/history guards.
function beforeNativeObservationRepair(value,kind) {
 const prior=beforeNativeTargetIdentityRepair(value,kind);
 if(kind==='drafts') {
  assert.equal(readConfigHash(prior),'eb14a9bbd25c649d209e2743e869ed613745f84db6e5629252b4d3abea92d653');
  assert(!prior.some(x=>x.id==='R1-38'));return prior;
 }
 if(kind==='metadata') {
  assert.equal(readConfigHash(prior),'349721b5858c1fbb3494371c3c41ac8a464e3a463c435245558f7636759c9c67');
  const r=prior.filter(x=>x.id==='R1-36');assert.equal(r.length,1);const story=r[0],a=story.native_observation_repair;assert(a);
  assert.equal(readConfigHash(a),'683a1a5ff5cdcd8f5ac3eef9ace2f61ed080496b3b213f27708cdd7b8fb62012');
  assert.deepEqual([a.source_id,a.native_key,a.native_id,a.parent,a.source_composed],['R1-38','PGB-152','10612','PGB-66',false]);
  assert.deepEqual([a.native_prerequisite.link_id,a.native_child_to_feature.link_id],['10747','10748']);
  assert.deepEqual(a.verified_parent_body_sha256,{before:'afdea52dc57999eea105106f57fc540ba10f25c6318832237aba9d5ed9450c94',after:'5aa49be36a16b0bc8077796aa62033c6a1793018a830653e9e077f249d252ea9'});
  assert.equal(a.reviewed_plan_sha256,'53ed8317173824d822e2c55f3030837f1ac1e02785228d4470e0bff4b26a789c');assert.equal(a.receipt_sha256,'4879f236fe516d8d5fe31e93da48d7be6f3ea1f522301bd3b26e6cd6b4a2b8ae');
  assert.deepEqual(a.changed_files,['lib/jira/read.mjs','test/jira-read.test.mjs','docs/manager-preview.md','docs/delivery/manager-r1/README.md','docs/delivery/manager-r1/plan-metadata.json','docs/delivery/manager-r1/publication.json','test/story-authoring.test.mjs','test/qa-helper-contract.test.mjs']);
  assert.equal(a.changed_file_count,8);assert.equal(new Set(a.changed_files).size,8);assert.deepEqual(a.child_hours,{min:3.5,max:6});assert.deepEqual(a.child_days,{min:0.4375,max:0.75});
  assert.deepEqual(story.hours,{min:11.25,max:15.7});assert.equal(story.days,1.9625);assert.equal(readConfigHash(story.delivery_state),'ae47ae3d15c37da54fc083efac4df17e72dd26b06ffb3231a8717d87dcc32e6e');
  assert.deepEqual(a.current_source_forecast_days,{min:48.42875,max:52.11});assert.deepEqual(a.current_delivery_forecast_days,{min:48.86625,max:52.86});
  assert.equal(a.historical95.revision,'95c711999b90b20842dfd172f7966f73c8cfde34');assert.equal(a.historical95.tree,'63632cbb9b184c0cc7af3b833d35ce043190b185');
  assert.deepEqual(a.historical95.hours,{min:10.85,max:15});assert.equal(a.historical95.days,1.875);assert.equal(readConfigHash(a.historical95.delivery_state),'2c71d86620a6393593857ff8e9c64813ced56b3e20757eaf50ab6e4941b5fef5');
  assert.deepEqual(a.historical95.source_forecast_days,{min:48.37875,max:52.0225});assert.deepEqual(a.historical95.native_source_forecast_days,{base_min:47.0225,base_max:50.1475,added_min:1.35625,added_max:1.875,current_min:48.37875,current_max:52.0225});
  assert.deepEqual(story.dependencies,['R1-31']);assert.equal(story.files.length,18);assert.equal(story.plan_sha256,'5f94612e3ae7d77210daba67361cef2ef3e8cb3fcf662156d74d825b648c1e47');
  story.hours=a.historical95.hours;story.days=a.historical95.days;story.delivery_state=a.historical95.delivery_state;delete story.native_observation_repair;
  assert.equal(readConfigHash(prior),'c0acb72e06de6270229fe4e3d534a89166bd142f854b216c0992e0402b292c20');return prior;
 }
 assert.equal(kind,'publication');assert.equal(readConfigHash(prior),'803a89019366f32951d2be2e34fb237c5977a3526f6101daeb6a1f4bc7584081');
 assert.equal(readConfigHash(prior.status),'6818d30efc77711a9a30184178c893391c6e09cadc03ae56c00b1d2236f80f5b');
 assert.equal(readConfigHash(prior.current_source_scope.status),'6818d30efc77711a9a30184178c893391c6e09cadc03ae56c00b1d2236f80f5b');
 assert.deepEqual([prior.story_count,prior.case_count,prior.requirement_count,prior.scenario_count],[31,136,53,41]);assert.equal(prior.stories['R1-36'],'PGB-150');assert(!Object.hasOwn(prior.stories,'R1-38'));
 const a=prior.native_observation_repair_amendment;assert(a);assert.equal(readConfigHash(a),'de763f9470c3feb256bfb07acbe89395b83b81b2c8c731b2807937b7c7803cd9');
 assert.equal(readConfigHash(a.historical95.status),'a07a1b9bc0d41b8c55e0992fb7515e311538d35f3149ecea3a70ec1b7f15b750');
 assert.equal(readConfigHash(a.historical95.current_source_scope_status),'a07a1b9bc0d41b8c55e0992fb7515e311538d35f3149ecea3a70ec1b7f15b750');
 assert.deepEqual([a.source_id,a.native_key,a.native_id,a.parent],['R1-38','PGB-152','10612','PGB-66']);assert.deepEqual(a.source_composed,[]);assert.deepEqual(a.source_counts,{stories:31,human_groups:136,requirements:53,scenarios:41});
 assert.equal(a.reviewed_plan_sha256,'53ed8317173824d822e2c55f3030837f1ac1e02785228d4470e0bff4b26a789c');assert.equal(a.receipt_sha256,'4879f236fe516d8d5fe31e93da48d7be6f3ea1f522301bd3b26e6cd6b4a2b8ae');
 assert.deepEqual(a.parent_body_sha256,{before:'afdea52dc57999eea105106f57fc540ba10f25c6318832237aba9d5ed9450c94',after:'5aa49be36a16b0bc8077796aa62033c6a1793018a830653e9e077f249d252ea9'});
 assert.deepEqual(a.native_links.map(x=>[x.from,x.to,x.id]),[['PGB-145','PGB-150','10744'],['PGB-150','PGB-147','10745'],['PGB-145','PGB-152','10747'],['PGB-152','PGB-150','10748']]);
 assert.deepEqual(a.child_hours,{min:3.5,max:6});assert.deepEqual(a.child_days,{min:0.4375,max:0.75});assert.equal(a.child_changed_files.length,8);assert.deepEqual(a.child_human_groups,{count:2,status:'NOT_RUN'});
 const pending={source_id:'R1-36',native_key:'PGB-150',prerequisite_source_id:'R1-38',prerequisite_native_key:'PGB-152',required_outcome:'ai_qa_complete',native_link_id:'10748',status:'native_verified_source_pending'};
 assert.deepEqual(prior.current_source_scope.pending_source_amendments,['PGB-137','PGB-146','PGB-147','PGB-148','PGB-149','PGB-152']);
 assert.deepEqual(prior.current_source_scope.pending_source_dependencies.at(-1),pending);assert.equal(prior.current_source_scope.pending_source_dependencies.length,3);assert.deepEqual(a.pending_source_dependency,pending);
 assert.deepEqual(prior.current_source_scope.forecast_days,{min:48.42875,max:52.11});assert.deepEqual(prior.native_source_issue_inspection_amendment.forecast_days,{base_min:47.0225,base_max:50.1475,added_min:1.40625,added_max:1.9625,current_min:48.42875,current_max:52.11});
 assert.deepEqual(a.source_forecast_days,prior.current_source_scope.forecast_days);assert.deepEqual(a.current_delivery_forecast_days,{min:48.86625,max:52.86});
 assert.equal(Number((47.0225+11.25/8).toFixed(5)),48.42875);assert.equal(Number((50.1475+15.7/8).toFixed(5)),52.11);assert.equal(Number((48.42875+3.5/8).toFixed(5)),48.86625);assert.equal(Number((52.11+6/8).toFixed(5)),52.86);
 assert.deepEqual(a.historical95.metadata.hours,{min:10.85,max:15});assert.equal(a.historical95.metadata.days,1.875);assert.equal(readConfigHash(a.historical95.metadata.delivery_state),'2c71d86620a6393593857ff8e9c64813ced56b3e20757eaf50ab6e4941b5fef5');
 assert.deepEqual(a.historical95.source_forecast_days,{min:48.37875,max:52.0225});assert.deepEqual(a.historical95.native_source_forecast_days,{base_min:47.0225,base_max:50.1475,added_min:1.35625,added_max:1.875,current_min:48.37875,current_max:52.0225});
 prior.current_source_scope.pending_source_amendments.pop();prior.current_source_scope.pending_source_dependencies.pop();prior.current_source_scope.forecast_days=a.historical95.source_forecast_days;prior.native_source_issue_inspection_amendment.forecast_days=a.historical95.native_source_forecast_days;prior.status=a.historical95.status;prior.current_source_scope.status=a.historical95.current_source_scope_status;delete prior.native_observation_repair_amendment;
 assert.equal(readConfigHash(prior),'2905e297fb57297a652f9fbc1eee8a4a4b319b74430adab5e01e319a6e2072b7');return prior;
}

// Assert and reverse only R1-36 before exercising the unchanged historical guards.
function beforeSourceIssueInspection(value,kind) {
 const prior=beforeNativeObservationRepair(value,kind);
 if(kind==='drafts') {
  assert.equal(readConfigHash(prior),'eb14a9bbd25c649d209e2743e869ed613745f84db6e5629252b4d3abea92d653');
  const added=prior.filter(x=>x.id==='R1-36');assert.equal(added.length,1);
  assert.equal(readConfigHash(added[0]),'edd0ee2f2be6bcee256fddff8b8f39de729115a88684c69990fa42ec643c94ed');
  assert.equal(readConfigHash(added[0].contract),'8694885ffd4d05bd7aec9a7f951aa99a4bf3d9ab4d2465a6081a20f2a6e839e3');
  assert.deepEqual(added[0].contract.prerequisites,[{ticket:'R1-31',required_outcome:'ai_qa_complete'}]);
  assert.deepEqual([added[0].contract.acceptance_criteria.length,added[0].contract.technical_acceptance_criteria.constraints.length,added[0].contract.testing_strategy.human_review.cases.length,added[0].contract.testing_strategy.cases.length],[5,4,4,0]);
  assert.deepEqual(added[0].contract.testing_strategy.human_review.cases.map(x=>x.id),['R1-36-H01','R1-36-H02','R1-36-H03','R1-36-H04']);
  assert.equal(prior[prior.findIndex(x=>x.id==='R1-31')+1].id,'R1-36');
  const result=prior.filter(x=>x.id!=='R1-36');assert.equal(readConfigHash(result),'2346cacf0b501580a2f9284d49068a82926c0b04ee9f5e74e0c1bc50104f8f62');return result;
 }
 if(kind==='metadata') {
  assert.equal(readConfigHash(prior),'c0acb72e06de6270229fe4e3d534a89166bd142f854b216c0992e0402b292c20');
  const added=prior.filter(x=>x.id==='R1-36');assert.equal(added.length,1);
  assert.deepEqual(added[0].dependencies,['R1-31']);assert.deepEqual(added[0].hours,{min:10.85,max:15});assert.equal(added[0].days,1.875);
  assert.deepEqual(added[0].files,['lib/jira/read.mjs','test/jira-read.test.mjs','test/fixtures/jira-preview-harness.mjs','test/fixtures/jira-preview-cases.json','test/fixtures/jira-preview-tls.json','docs/manager-preview.md','README.md','ARCHITECTURE.md','docs/delivery/manager-r1/stories.md','docs/delivery/manager-r1/README.md','docs/delivery/manager-r1/coverage.md','docs/delivery/manager-r1/plan-metadata.json','docs/delivery/manager-r1/publication.json','docs/delivery/manager-r1/ticket-drafts.json','docs/product/README.md','docs/product/coverage.md','test/story-authoring.test.mjs','test/qa-helper-contract.test.mjs']);
  assert.equal(added[0].files.length,18);assert.equal(new Set(added[0].files).size,18);assert.equal(prior[prior.findIndex(x=>x.id==='R1-31')+1].id,'R1-36');
  const result=prior.filter(x=>x.id!=='R1-36');assert.equal(readConfigHash(result),'47ee11ec184c11874371e80cfe78653ac933c963d62199b88ae002a0c2d5a088');return result;
 }
 assert.equal(readConfigHash(prior),'2905e297fb57297a652f9fbc1eee8a4a4b319b74430adab5e01e319a6e2072b7');
 assert.deepEqual([prior.story_count,prior.case_count,prior.requirement_count,prior.scenario_count],[31,136,53,41]);
 assert.equal(prior.stories['R1-36'],'PGB-150');assert.equal(Object.keys(prior.stories).length,31);
 const a=prior.native_source_issue_inspection_amendment;assert(a);assert.deepEqual(a.source_composed,['R1-36']);
 assert.deepEqual([a.native_id,a.parent,a.receipt_sha256,a.plan_sha256],['10610','PGB-66','93029aad4c561c70072d96eb542780a72540bd69ba172650325885149f0b226a','5f94612e3ae7d77210daba67361cef2ef3e8cb3fcf662156d74d825b648c1e47']);
 assert.equal(a.source_contract_sha256,'edd0ee2f2be6bcee256fddff8b8f39de729115a88684c69990fa42ec643c94ed');assert.equal(a.current_drafts_sha256,'eb14a9bbd25c649d209e2743e869ed613745f84db6e5629252b4d3abea92d653');
 assert.deepEqual(a.description_sha256,{source:'afdea52dc57999eea105106f57fc540ba10f25c6318832237aba9d5ed9450c94',amended147:'1b1f744f9ba73466a814315896bcb68d64bf10495edfc4d623408828ea0e8ee6'});
 assert.deepEqual(a.dependency_links.map(x=>[x.id,x.from,x.to]),[['10735','PGB-145','PGB-147'],['10736','PGB-147','PGB-148'],['10737','PGB-148','PGB-82'],['10744','PGB-145','PGB-150'],['10745','PGB-150','PGB-147']]);
 assert.deepEqual(prior.dependency_links.filter(x=>x.id==='10744'),[{id:'10744',type_id:'10000',from:'PGB-145',to:'PGB-150'}]);
 assert.deepEqual(prior.current_source_scope.pending_source_amendments,['PGB-137','PGB-146','PGB-147','PGB-148','PGB-149']);
 assert.deepEqual(prior.current_source_scope.pending_source_dependencies,[{source_id:'R1-33',native_key:'PGB-147',prerequisite_source_id:'R1-36',prerequisite_native_key:'PGB-150',required_outcome:'ai_qa_complete',native_link_id:'10745',status:'native_verified_source_pending'},{source_id:'R1-12',native_key:'PGB-82',prerequisite_source_id:'R1-34',prerequisite_native_key:'PGB-148',required_outcome:'ai_qa_complete',native_link_id:'10737',status:'native_verified_source_pending'}]);
 assert.deepEqual(prior.current_source_scope.forecast_days,{min:48.37875,max:52.0225});
 assert.equal(Number((47.0225+10.85/8).toFixed(5)),48.37875);assert.equal(Number((50.1475+15/8).toFixed(5)),52.0225);
 assert.equal(a.human_acceptance,'NOT_RUN');assert.equal(a.activation_authorized,false);assert.equal(a.original82_source_unchanged,true);assert.equal(a.original82_cases,4);
 assert.deepEqual(a.historical_native_snapshots.map(x=>[x.story_count,x.case_count]),[[31,134],[34,144]]);
 assert.equal(prior.current_source_scope.prior_source_scope.story_count,30);assert.equal(prior.current_source_scope.prior_source_scope.case_count,132);
 prior.status=prior.current_source_scope.prior_source_scope.status;prior.current_source_scope=prior.current_source_scope.prior_source_scope;
 delete prior.native_source_issue_inspection_amendment;delete prior.stories['R1-36'];prior.story_count=30;prior.case_count=132;
 prior.dependency_links=prior.dependency_links.filter(x=>x.id!=='10744');
 assert.equal(readConfigHash(prior),'edf9a584ffb7e9bdbc6fe1fa494aa7883bf6834af21d5427aab683af8f2ba132');return prior;
}

// Reverse only the asserted PGB-145 additive amendment for dated historical guards.
function beforeReadConfiguration(value,kind) {
 const prior=beforeSourceIssueInspection(value,kind);
 if(kind==='drafts') {
  const added=prior.filter(x=>x.id==='R1-31');assert.equal(added.length,1);
  assert.equal(readConfigHash(added[0]),'c8edf2b1a30c246b6010c8427c5253f66dcd2b43579509f17e758e3b6cf17a81');
  const dependent=prior.find(x=>x.id==='R1-12').contract;
  assert.deepEqual(dependent.prerequisites,[{ticket:'R1-11',required_outcome:'ai_qa_complete'},{ticket:'R1-21',required_outcome:'ai_qa_complete'},{ticket:'R1-31',required_outcome:'ai_qa_complete'}]);
  dependent.prerequisites.pop();return prior.filter(x=>x.id!=='R1-31');
 }
 if(kind==='metadata') {
  assert.equal(prior.filter(x=>x.id==='R1-31').length,1);
  const dependent=prior.find(x=>x.id==='R1-12');assert.deepEqual(dependent.dependencies,['R1-11','R1-21','R1-31']);dependent.dependencies.pop();return prior.filter(x=>x.id!=='R1-31');
 }
 assert.equal(prior.stories['R1-31'],'PGB-145');assert.deepEqual([prior.story_count,prior.case_count],[30,132]);
 const dated=prior.history.find(x=>x.scope==='Pre-PGB-145 e54 dated partial source checkpoint');assert(dated);assert.deepEqual([dated.story_count,dated.case_count],[29,128]);
 delete prior.stories['R1-31'];prior.story_count=dated.story_count;prior.case_count=dated.case_count;prior.current_source_scope=dated.current_source_scope;return prior;
}

test('PGB-145 current source independently binds the complete published amendment and retained original82 contract',async()=>{
 const load=async name=>pre81Capture(name);
 const drafts=beforeSourceIssueInspection(await load('ticket-drafts.json'),'drafts'),metadata=beforeSourceIssueInspection(await load('plan-metadata.json'),'metadata'),p=beforeSourceIssueInspection(await load('publication.json'),'publication'),a=p.read_configuration_amendment;
 assert.equal(drafts.length,30);assert.equal(new Set(drafts.map(x=>x.id)).size,30);assert.deepEqual(drafts.map(x=>x.id),metadata.map(x=>x.id));assert.equal(drafts[drafts.findIndex(x=>x.id==='R1-21')+1].id,'R1-31');
 assert.equal(readConfigHash(drafts),'2346cacf0b501580a2f9284d49068a82926c0b04ee9f5e74e0c1bc50104f8f62');assert.equal(a.current_drafts_sha256,readConfigHash(drafts));
 const story=drafts.find(x=>x.id==='R1-31'),plan=metadata.find(x=>x.id==='R1-31'),contract=story.contract;
 assert.equal(readConfigHash(story),'c8edf2b1a30c246b6010c8427c5253f66dcd2b43579509f17e758e3b6cf17a81');assert.equal(a.source_contract_sha256,readConfigHash(story));assert.deepEqual(contract.prerequisites,[{ticket:'R1-21',required_outcome:'ai_qa_complete'}]);assert.deepEqual(plan.dependencies,['R1-21']);
 assert.equal(contract.acceptance_criteria.length,6);assert.equal(contract.technical_acceptance_criteria.constraints.length,7);assert.equal(contract.testing_strategy.human_review.cases.length,4);assert.deepEqual(contract.testing_strategy.cases,[]);assert.deepEqual(plan.hours,{min:12.25,max:15.25});assert.equal(plan.files.length,20);assert.equal(new Set(plan.files).size,20);assert.equal(plan.days,1.90625);assert.equal(Number(metadata.reduce((n,x)=>n+x.days,0).toFixed(5)),50.1475);
 assert.deepEqual([p.story_count,p.case_count,p.requirement_count,p.scenario_count],[30,132,53,41]);assert.equal(drafts.reduce((n,x)=>n+x.contract.testing_strategy.cases.length+x.contract.testing_strategy.human_review.cases.length,0),132);assert.equal(Object.keys(p.stories).length,30);assert.equal(new Set(Object.values(p.stories)).size,30);assert.equal(p.stories['R1-31'],'PGB-145');assert(!drafts.some(x=>['R1-29','R1-32'].includes(x.id)));assert.deepEqual(p.current_source_scope.pending_source_amendments,['PGB-137']);assert.deepEqual([p.current_source_scope.native_snapshot.story_count,p.current_source_scope.native_snapshot.case_count],[31,134]);
 assert.equal(a.native_id,'10605');assert.equal(a.parent,'PGB-66');assert.equal(a.native_publication_verified,true);assert.equal(a.human_acceptance,'NOT_RUN');assert.equal(a.activation_authorized,false);assert.equal(a.original82_body_preserved_except_prerequisite,true);assert.equal(a.original82_cases,4);
 assert.deepEqual(a.dependency_links,[{id:'10728',type_id:'10000',from:'PGB-99',to:'PGB-145'},{id:'10729',type_id:'10000',from:'PGB-145',to:'PGB-82'}]);for(const edge of a.dependency_links)assert(p.dependency_links.some(x=>JSON.stringify(x)===JSON.stringify(edge)));
 assert.equal(a.description_sha256.body,'365029d6439052f74217db9f4b56bfdb535234cb20901fc785a55891027fe483');assert.equal(a.description_sha256.original82_before,'d5357e7018361264d0d730b56b8dedf419efcba0c42202463ba035aef399c1de');assert.equal(a.description_sha256.original82_after,'682017a9f3efa4c70bdc4f903edcd5c77c3587c65b72bd1f18ff891e57003c7b');
 const old=beforeReadConfiguration(await load('ticket-drafts.json'),'drafts').find(x=>x.id==='R1-12').contract;assert.equal(readConfigHash(old),'b33f93b3b47fa68e023c06e2e340047219090ee365712633823d19deab9d7813');assert.equal(old.acceptance_criteria.length,5);assert.equal(old.technical_acceptance_criteria.constraints.length,3);assert.equal(old.testing_strategy.human_review.cases.length,4);
 const result=validateWork(JSON.stringify(contract),{mode:'structure'});assert.equal(result.valid,true,JSON.stringify(result.diagnostics));assert.equal(result.readiness,'not_evaluated');
 for(const f of ['docs/product/coverage.md','docs/delivery/manager-r1/coverage.md']){const text=await readFile(new URL('../'+f,import.meta.url),'utf8');for(const [id,cases]of Object.entries({O03:['H01','H02','H03'],O09:['H02','H04'],A12:['H02','H04'],O13:['H01'],M14:['H04']}))for(const c of cases)assert(text.split('\n').find(l=>l.startsWith('| '+id+' |')).includes('R1-31-'+c));}
 const stories=await readFile(new URL('../docs/delivery/manager-r1/stories.md',import.meta.url),'utf8');assert(stories.indexOf('## R1-21:')<stories.indexOf('## R1-31:'));assert(stories.indexOf('## R1-31:')<stories.indexOf('## R1-05:'));assert(stories.includes(JSON.stringify(contract,null,2)));
});

test('PGB-146 dated partial receipt preserves actual source inventory and complete native omissions',async()=>{
 const publication=stateBeforeReadConfiguration(await pre81Capture('publication.json'),'publication'),drafts=stateBeforeReadConfiguration(await pre81Capture('ticket-drafts.json'),'drafts'),metadata=stateBeforeReadConfiguration(await pre81Capture('plan-metadata.json'),'metadata'),a=publication.source_repair_preview_amendment,n=a.latest_native_receipt;
 assert.equal(a.date,'2026-11-16');assert.equal(a.story_id,'R1-32');assert.equal(a.native_key,'PGB-146');assert.equal(a.native_id,'10606');assert.equal(a.parent,'PGB-66');assert.equal(a.native_publication_verified,true);assert.equal(a.partial_publication,true);assert.equal(a.plan_sha256,'fdf2dd3397f17aed6816760660b202517f3109acaa199aa4da82ea98817e8f03');assert.equal(a.literal_sha256,'86b435b4431abcef7c57853de804d9d14e5d9e7b4503bac2c11b176173a32649');
 assert.equal(drafts.length,29);assert.equal(metadata.length,29);assert.equal(drafts.reduce((c,d)=>c+d.contract.testing_strategy.human_review.cases.length,0),128);assert.equal(publication.story_count,29);assert.equal(publication.case_count,128);assert(!drafts.some(d=>d.id==='R1-32'));assert(!Object.hasOwn(publication.stories,'R1-32'));assert.equal(hash(JSON.stringify(drafts,null,2)+'\n'),a.source_inventory.ticket_drafts_sha256);assert.equal(a.source_inventory.plan_metadata_sha256,'d2309a2e6c76787b98f439ec4f5e1605b900c9d0204d20017dec183e69ea496e');
 assert.equal(n.date,'2026-11-16');assert.equal(n.isLast,true);assert.equal(n.native_story_count,32);assert.equal(n.native_case_count,136);assert.equal(n.native_readback_sha256,'674dd6c195575459f3ebb0a0b68bf8351389bbf47b4b9da33a802fee55ba00d3');assert.equal(n.observed_stories.length,32);assert.equal(new Set(n.observed_stories.map(i=>i.key)).size,32);assert.equal(n.observed_stories.reduce((sum,i)=>sum+i.human_cases,0),136);assert.deepEqual(n.unmatched_native_bodies_or_dependencies.map(i=>i.key),['PGB-81','PGB-82','PGB-85','PGB-137','PGB-145','PGB-146']);assert.equal(n.full_reconciliation_owner,'PGB-81');
 const {default:canonicalize}=await import('canonicalize'),canonicalHash=v=>hash(canonicalize(v));
 // Receipt: original UTF-8 bytes; object: complete29-row d34b2bb0e26ad58ae1e7564e32acfadaa9d9f45f docs/delivery/manager-r1/plan-metadata.json.
 assert.equal(canonicalHash(metadata),'6e1fba025f1b35d8037b13e29f73d5b157dd6ea08dbbd8bff86e17c6ecacf910');
 for(const row of n.observed_stories){const d=drafts.find(d=>publication.stories[d.id]===row.key);assert.equal(row.source_id,d?.id??null);if(d){const c=structuredClone(d.contract);for(const p of c.prerequisites)p.ticket=publication.stories[p.ticket]??p.ticket;assert.equal(canonicalHash(c),row.source_contract_sha256);assert.deepEqual(c.prerequisites.map(p=>p.ticket),row.source_prerequisites);}assert.equal(row.body_matches_source,row.source_contract_sha256===row.native_contract_sha256);assert.equal(n.unmatched_native_bodies_or_dependencies.some(i=>i.key===row.key),!row.body_matches_source);}
 const links=[['10730','PGB-80','PGB-146'],['10731','PGB-113','PGB-146'],['10732','PGB-129','PGB-146'],['10733','PGB-136','PGB-146'],['10734','PGB-146','PGB-81']].map(([id,from,to])=>({id,type_id:'10000',from,to}));assert.deepEqual(a.dependency_links,links);assert.equal(a.PGB81.original_acceptance_criteria,4);assert.equal(a.PGB81.original_technical_constraints,2);assert.equal(a.PGB81.original_human_cases,42);assert.equal(a.PGB81.preserved_complete_testing_strategy,true);assert.equal(a.PGB81.scope_comment_id,'10845');assert.equal(a.State_A.key,'PGB-145');assert.equal(a.State_A.preserved,true);assert.equal(a.State_A.unmerged_source_not_absorbed,true);
 const runtime=a.source_runtime_revision,bundle=await pre81Capture('config/skill-bundle.json'),paths=bundle.validatorPayload.sources.filter(p=>p.endsWith('.mjs')||p.endsWith('.schema.json')||['package.json','package-lock.json'].includes(p)).sort();assert.deepEqual(Object.keys(runtime.artifacts_sha256),paths);assert.equal(canonicalHash(runtime),'b83fe45c41976f4cdcb0f389b1c5ca4d20a4f11f6374f642bce9e432ee2c657b');assert.equal('sha256:'+canonicalHash(runtime.artifacts_sha256),runtime.revision_sha256);assert.equal(hash(await read('test/fixtures/manager-repairs.json')),runtime.source_fixture_sha256);assert(bundle.validatorPayload.sources.includes('lib/manager/repair-policy.mjs'));assert(!bundle.validatorPayload.sources.includes('test/fixtures/manager-repairs.json'));
 assert.equal(publication.current_source_scope.native_snapshot.date,'2026-11-15');assert.equal(publication.current_source_scope.native_snapshot.story_count,30);assert.equal(publication.current_source_scope.native_snapshot.case_count,130);assert.deepEqual(publication.current_source_scope.pending_source_amendments,['PGB-137']);assert.equal(a.human_acceptance,'NOT_RUN');assert.equal(a.PGB81_human_acceptance,'NOT_RUN');assert.equal(a.activation_authorized,false);
});

test('R1-35 machine source integration preserves complete historical receipts and runtime maps',async()=>{
 const p=stateCheckpoint(await pre81Capture('publication.json'),'publication'),a=p.machine_repair_preview_amendment,old=p.source_repair_preview_amendment;
 const {default:canonicalize}=await import('canonicalize'),canonicalHash=v=>hash(canonicalize(v));
 const drafts=stateCheckpoint(await pre81Capture('ticket-drafts.json'),'drafts'),metadata=stateCheckpoint(await pre81Capture('plan-metadata.json'),'metadata');
 assert.equal(a.story_id,'R1-35');assert.equal(a.native_key,'PGB-149');assert.equal(a.native_id,'10609');assert.equal(a.parent,'PGB-66');assert.equal(a.plan_sha256,'a2668b38252feb7227432d67bc2dd88e6feea4a8b69dddc1ab86bc44d0189e68');assert.equal(a.partial_publication,true);assert.equal(a.native_publication_verified,true);
 assert.equal(canonicalHash(old),'03026e5fa6c3443556bee62262311d5ebd88cdf78c6629c8388c187d200e7425');assert.equal(hash(old),'8efd0c844d9bcfbaf7f7ee99e0c272b29f32e8c9e60fb8e19b0c394d1873c10e');assert.equal(a.historical_source_capture.canonical_sha256,canonicalHash(old));assert.equal(a.historical_source_capture.json_sha256,hash(old));assert(a.historical_source_capture.meaning.includes('historical'));
 assert.equal(a.source_provenance.base_commit,'da39e3762f31704a832e0cbc503c3b0d6d2284dc');assert.equal(a.source_provenance.base_tree,'0a5c210464bd041cd2e70f4ce2475e4a8ca9c800');assert.equal(a.source_provenance.reused_machine_commit,'d34b2bb0e26ad58ae1e7564e32acfadaa9d9f45f');assert.equal(a.source_provenance.PGB145_included,true);assert.equal(canonicalHash(p.read_configuration_amendment),'82bd2f1594e142f513c5c1d1ddd2189e9eb97022a761529f54d161cc6018094d');assert.equal(a.source_provenance.read_configuration_amendment_sha256,canonicalHash(p.read_configuration_amendment));
 assert.deepEqual([drafts.length,metadata.length,p.story_count,p.case_count],[30,30,30,132]);assert.equal(drafts.reduce((n,d)=>n+d.contract.testing_strategy.human_review.cases.length,0),132);assert(!drafts.some(d=>['R1-32','R1-35','R1-33','R1-34'].includes(d.id)));assert(!Object.hasOwn(p.stories,'R1-35'));assert.deepEqual([a.source_inventory.story_count,a.source_inventory.case_count],[30,132]);assert.equal(hash(JSON.stringify(stateCheckpoint(await pre81Capture('ticket-drafts.json'),'drafts'),null,2)+'\n'),a.source_inventory.ticket_drafts_sha256);assert.equal(hash(JSON.stringify(stateCheckpoint(await pre81Capture('plan-metadata.json'),'metadata'),null,2)+'\n'),a.source_inventory.plan_metadata_sha256);
 const bundle=await pre81Capture('config/skill-bundle.json'),paths=bundle.validatorPayload.sources.filter(f=>f.endsWith('.mjs')||f.endsWith('.schema.json')||['package.json','package-lock.json'].includes(f)).sort(),runtime=a.source_runtime_revision;assert.deepEqual(Object.keys(runtime.artifacts_sha256),paths);assert.equal(canonicalHash(a),'0683f0b84c1cfc37c6ea9df15b35cbd9238bc03df4fa39b4f06a3227b5e2f9c3');assert.equal(hash(a),'9dccea4120ef740ed1b59dc2a4d72bb5fa2c7ecc432154fb245a4c5c657de013');assert.equal(canonicalHash(runtime),'bcd999e01ea89308aaad5b7c295b26a3454ac387a49139689abb83eae2a7d1ae');assert.equal(runtime.revision_sha256,'sha256:'+canonicalHash(runtime.artifacts_sha256));assert.equal(runtime.source_fixture_sha256,'26280bc8c5095b32fe1bd8279a060f7b6fdafec1b3fc442569c4916d1c1665a7');assert.equal(hash(await read('test/fixtures/manager-repairs.json')),runtime.source_fixture_sha256);
 assert.deepEqual(paths.filter(f=>runtime.artifacts_sha256[f]!==old.source_runtime_revision.artifacts_sha256[f]),['contracts/config-v1.schema.json','lib/config/diff.mjs','lib/config/parse.mjs','lib/config/projects.mjs','scripts/check-config.mjs']);assert(bundle.validatorPayload.sources.includes('lib/manager/repair-policy.mjs'));assert(!bundle.validatorPayload.sources.includes('test/fixtures/manager-repairs.json'));
 const publication=a.native_publication;assert.equal(publication.receipt_sha256,'f20cb80be5248db901dc6d06d6125e2d515cc179191702f2660aae8017238777');assert.equal(publication.readback_sha256,'43bbfab38e74c7c9a029b0f2b2f3493ed5fc28e772beaf38055275e6149eefc1');
 const bound={'PGB-149':['10609','9311afb53d125c112cbcbfec6cff80cd721d455e000f3903f83936aa249a530f','e1fea555cb032753af11ca7214b1738737c0aa4bb59f789c0c3611988eab0d0a'],'PGB-146':['10606','45932a2a2b29fca7ff67dc235a7c3f6b29bd8b3609fad26a9c1c755d9bb5af6d','1d7bc7075c214b6eed4d4d9280c30f39fee35454a2efd1ce075860cc9afa6fcc'],'PGB-81':['10541','2fc67b655eb29893408d9dfca2ca7b7c567e05740c75b2e417a3a143333d1c17','5514508fe0c18a500dbe4a3939bcd0e193fbf123eb09b1299e26612d779fff5f']};assert.deepEqual(Object.keys(publication.contracts),Object.keys(bound));for(const [key,[id,description,digest]]of Object.entries(bound)){const row=publication.contracts[key];assert.equal(row.native_id,id);assert.equal(row.description_sha256,description);assert.equal(row.canonical_contract_sha256,digest);assert.equal(canonicalHash(row.contract),digest,key);}
 const contract=publication.contracts['PGB-149'].contract,prerequisites=[80,113,129,136,145].map(i=>({ticket:'PGB-'+i,required_outcome:'ai_qa_complete'}));assert.deepEqual(contract.prerequisites,prerequisites);assert.equal(contract.acceptance_criteria.length,3);assert.equal(contract.technical_acceptance_criteria.constraints.length,3);assert.deepEqual(contract.testing_strategy.human_review.cases.map(c=>c.id),['R1-35-H01','R1-35-H02']);assert.deepEqual(contract.testing_strategy.cases,[]);assert.deepEqual(contract.testing_strategy.testing_types,[]);assert(contract.testing_strategy.human_review.no_ai_cases_reason);
 const residual=structuredClone(publication.contracts['PGB-146'].contract);assert.deepEqual(residual.prerequisites,[...prerequisites.slice(0,4),{ticket:'PGB-149',required_outcome:'ai_qa_complete'}]);residual.prerequisites.pop();assert.equal(canonicalHash(residual),a.historical_source_capture.original146_contract_sha256);assert.equal(canonicalHash(residual),old.native_contract_sha256);assert.deepEqual(residual.testing_strategy.human_review.cases.map(c=>c.id),['R1-32-H01','R1-32-H02']);assert.equal(publication.contracts['PGB-81'].contract.testing_strategy.human_review.cases.length,42);assert.equal(publication.original146_unchanged_except_appended149_prerequisite,true);assert.equal(publication.original81_complete_description_and_links_unchanged,true);
 const newLinks=[[10738,80,149],[10739,113,149],[10740,129,149],[10741,136,149],[10742,145,149],[10743,149,146]],oldLinks=[[10730,80,146],[10731,113,146],[10732,129,146],[10733,136,146],[10734,146,81]],edges=values=>values.map(([id,from,to])=>({id:String(id),type_id:'10000',from:'PGB-'+from,to:'PGB-'+to}));assert.deepEqual(publication.dependency_links,edges(newLinks));assert.deepEqual(publication.preserved_146_edges,edges(oldLinks));assert.equal(new Set([...publication.dependency_links,...publication.preserved_146_edges].map(x=>x.id)).size,11);
 const comparison=a.recorded_comparison;assert.equal(comparison.exhaustive_current_native,false);assert(comparison.meaning.includes('not an exhaustive current'));assert.equal(comparison.dated_native_readback_sha256,old.latest_native_receipt.native_readback_sha256);assert.equal(comparison.overlay_native_readback_sha256,publication.readback_sha256);assert.deepEqual(comparison.overlay_keys,['PGB-146','PGB-149']);assert.equal(comparison.rows.length,33);assert.deepEqual(comparison.unmatched_keys,['PGB-81','PGB-85','PGB-137','PGB-146','PGB-149']);assert.equal(new Set(comparison.rows.map(x=>x.key)).size,33);
 for(const row of comparison.rows){const observed=publication.contracts[row.key]??old.latest_native_receipt.observed_stories.find(x=>x.key===row.key);assert(observed);assert.equal(row.native_contract_sha256,observed.canonical_contract_sha256??observed.native_contract_sha256);assert.equal(row.native_description_sha256,observed.description_sha256??observed.native_description_sha256);const d=drafts.find(d=>p.stories[d.id]===row.key);assert.equal(row.source_id,d?.id??null);if(d){const c=structuredClone(d.contract);for(const dep of c.prerequisites)dep.ticket=p.stories[dep.ticket]??dep.ticket;assert.equal(canonicalHash(c),row.source_contract_sha256);assert.deepEqual(c.prerequisites,row.source_prerequisites);}else assert.equal(row.source_contract_sha256,null);assert.equal(row.body_matches_source,row.source_contract_sha256===row.native_contract_sha256);assert.equal(comparison.unmatched_keys.includes(row.key),!row.body_matches_source);}
 const later=a.known_later_native_omissions;assert.equal(later.readback_sha256,'196e22a15cc36a4cbefc74e9dbec23ae085a354cec8e539d8dc0a3637b39fab0');assert.deepEqual([later.dated_story_count,later.dated_human_case_count],[34,144]);assert.deepEqual(later.rows.map(x=>x.key),['PGB-82','PGB-147','PGB-148']);assert(later.rows[0].native_prerequisites.some(x=>x.ticket==='PGB-148'));for(const row of later.rows)assert.equal(row.source_composition,'DEFERRED_TO_PGB-81');
 assert.deepEqual(a.readable_cause_parity,{owner:'PGB-146',status:'PENDING',guidance:'Use source API or --json for every exact cause identity; readable output remains available but incomplete for cause identities.'});assert.equal(a.full_reconciliation_owner,'PGB-81');assert.equal(a.full_installed_fixture_kit_owner,'PGB-81');for(const field of ['human_acceptance','original146_human_acceptance','PGB81_human_acceptance'])assert.equal(a[field],'NOT_RUN');assert.equal(a.activation_authorized,false);
});

test('R1-37 current PR repair preserves its complete historical runtime and native amendment',async()=>{
 const p=stateCheckpoint(await pre81Capture('publication.json'),'publication'),a=p.current_pr_repair_amendment,old=p.machine_repair_preview_amendment;
 const {default:canonicalize}=await import('canonicalize'),canonicalHash=value=>hash(canonicalize(value));
 assert.equal(canonicalHash(a),'4edbd5f22d7bf97c3a268e150c1c67254ca2eae7deeec08750a143d97378e89d');
 assert.deepEqual([a.story_id,a.native_key,a.native_id,a.parent],['R1-37','PGB-151','10611','PGB-66']);
 assert.equal(a.date,'2026-11-16');assert.equal(a.plan_sha256,'88b737dab61feab436bf91021031047b56dcecd370b654246de874c895a9c71d');
 assert.equal(a.partial_publication,true);assert.equal(a.native_publication_verified,true);
 assert.equal(a.source_provenance.base_commit,'90c92fbcf9c8122bf03bcb5a9ee2f756e72dd379');assert.equal(a.source_provenance.base_tree,'62b8e8b4754e504a7ca75a7d7cb983b8d19f3ffe');
 assert.equal(a.source_provenance.branch,'codex/pgb151-current-pr');assert.equal(a.source_provenance.target_branch,'codex/pgb149-machine-preview');
 assert.deepEqual(a.source_provenance.changed_paths,['lib/manager/repair-policy.mjs','test/repair-policy.test.mjs','docs/manager-preview.md','docs/delivery/manager-r1/publication.json','test/qa-helper-contract.test.mjs']);
 assert.equal(a.historical_machine_capture.canonical_sha256,canonicalHash(old));assert.equal(a.historical_machine_capture.json_sha256,hash(old));assert.equal(a.historical_machine_capture.runtime_canonical_sha256,canonicalHash(old.source_runtime_revision));assert(a.historical_machine_capture.meaning.includes('immutable dated history'));
 const bundle=await pre147Capture('config/skill-bundle.json'),paths=bundle.validatorPayload.sources.filter(f=>f.endsWith('.mjs')||f.endsWith('.schema.json')||['package.json','package-lock.json'].includes(f)).sort(),runtime=a.source_runtime_revision;
 assert.equal(paths.length,25);assert.deepEqual(Object.keys(runtime.artifacts_sha256),paths);
 assert.equal(hash(a),'105a64ed1f40ffcff8fc7f8e30c96e46c4a4f5e7c12c40cf33557f02609e27f9');assert.equal(canonicalHash(runtime),'6ad14edcecd823fb23097aa0767e884ae0dbc311992b5d07b1c6377dc59485be');
 assert.equal(runtime.revision_sha256,'sha256:'+canonicalHash(runtime.artifacts_sha256));assert.equal(hash(await read('test/fixtures/manager-repairs.json')),runtime.source_fixture_sha256);assert.equal(runtime.source_fixture_sha256,old.source_runtime_revision.source_fixture_sha256);
 assert.deepEqual(paths.filter(file=>runtime.artifacts_sha256[file]!==old.source_runtime_revision.artifacts_sha256[file]),['lib/manager/repair-policy.mjs']);
 assert.deepEqual([p.story_count,p.case_count,a.source_inventory.story_count,a.source_inventory.case_count],[30,132,30,132]);
 assert.equal(hash(JSON.stringify(stateCheckpoint(await pre81Capture('ticket-drafts.json'),'drafts'),null,2)+'\n'),a.source_inventory.ticket_drafts_sha256);assert.equal(hash(JSON.stringify(stateCheckpoint(await pre81Capture('plan-metadata.json'),'metadata'),null,2)+'\n'),a.source_inventory.plan_metadata_sha256);
 assert(!Object.hasOwn(p.stories,'R1-37'));assert(a.source_inventory.meaning.includes('no exhaustive current native inventory'));
 const n=a.native_publication;assert.equal(n.receipt_sha256,'44d8b0e88cfdde7ba459b540a9355663080c5af88f35c7e7e0ea030272a404b4');assert.equal(hash(JSON.stringify(n.receipt,null,2)+'\n'),n.receipt_sha256);assert.equal(n.readback_sha256,'1b8e111b78a79e921c92b677541720bf99d1c5fb3e41fc8866b95c65fb92487b');assert.equal(n.receipt.native_readback_sha256,n.readback_sha256);assert.equal(n.receipt.work_sha256,'ce27bc1678a1137f4888820a9d7be9e2458ac6d4e6abf1ed3a90dbb2a4635b42');
 const bound={'PGB-151':['10611','756707e48cbe4aab24dd51748f637cd90d72d5c799a9f29bcda9f12995e15a3c','da6a1977ecb12d1e43f0ce89bcc2fabd6d4c483edf2442f1fdb8d7feb788c3e2'],'PGB-149':['10609','27edc3e6f35d957de95fcaf7ed77b6fd359c6bb24e8fcc55f9fb1c6b1abe65b9','5ada6d116a0aee07eca88fba6a19eaf7c24079cdc4744623998b1789a2b4004d'],'PGB-146':['10606','45932a2a2b29fca7ff67dc235a7c3f6b29bd8b3609fad26a9c1c755d9bb5af6d','1d7bc7075c214b6eed4d4d9280c30f39fee35454a2efd1ce075860cc9afa6fcc'],'PGB-81':['10541','2fc67b655eb29893408d9dfca2ca7b7c567e05740c75b2e417a3a143333d1c17','5514508fe0c18a500dbe4a3939bcd0e193fbf123eb09b1299e26612d779fff5f']};
 assert.deepEqual(Object.keys(n.contracts),Object.keys(bound));
 for(const [key,[id,description,digest]]of Object.entries(bound)){const row=n.contracts[key];assert.equal(row.native_id,id);assert.equal(row.description_sha256,description);assert.equal(row.canonical_contract_sha256,digest);assert.equal(canonicalHash(row.contract),digest,key);}
 const repair=n.contracts['PGB-151'].contract,current=n.contracts['PGB-149'].contract,prior=old.native_publication.contracts['PGB-149'].contract;
 assert.deepEqual(repair.prerequisites,[]);assert.equal(repair.technical_acceptance_criteria.repository.base_branch,'codex/pgb149-machine-preview');assert.equal(repair.acceptance_criteria.length,3);assert.equal(repair.technical_acceptance_criteria.constraints.length,3);assert.deepEqual(repair.testing_strategy.testing_types,[]);assert.deepEqual(repair.testing_strategy.cases,[]);assert.deepEqual(repair.testing_strategy.human_review.cases.map(c=>c.id),[1,2,3,4,5].map(i=>'R1-37-D'+i));assert(repair.testing_strategy.human_review.cases.every(c=>c.execution==='human'));
 assert.deepEqual(current.prerequisites,[...prior.prerequisites,{ticket:'PGB-151',required_outcome:'ai_qa_complete'}]);
 const restored=structuredClone(current);restored.prerequisites.pop();restored.technical_acceptance_criteria.constraints.find(c=>c.id==='TAC3').requirement=prior.technical_acceptance_criteria.constraints.find(c=>c.id==='TAC3').requirement;assert.deepEqual(restored,prior);
 for(const key of ['PGB-146','PGB-81'])assert.deepEqual(n.contracts[key],old.native_publication.contracts[key],key+' complete native contract and description hash preserved');
 assert.deepEqual(n.dependency_links,[{id:'10746',type_id:'10000',from:'PGB-151',to:'PGB-149'}]);assert.deepEqual(n.preserved_149_edges,old.native_publication.dependency_links);assert.deepEqual(n.preserved_146_edges,old.native_publication.preserved_146_edges);
 assert.equal(n.original149_unchanged_except_added151_prerequisite_and_TAC3,true);assert.equal(n.original146_and81_complete_descriptions_unchanged,true);
 assert.equal(a.full_reconciliation_owner,'PGB-81');assert.equal(a.full_installed_fixture_kit_owner,'PGB-81');assert.deepEqual(a.readable_cause_parity,old.readable_cause_parity);
 for(const field of ['human_acceptance','original149_human_acceptance','original146_human_acceptance','PGB81_human_acceptance'])assert.equal(a[field],'NOT_RUN');assert.equal(a.activation_authorized,false);
});

test('R1-39 duplicate QA repair preserves complete historical captures',async()=>{
 const p=stateCheckpoint(await pre81Capture('publication.json'),'publication'),a=p.duplicate_qa_repair_amendment,old=p.current_pr_repair_amendment;
 const {default:canonicalize}=await import('canonicalize'),canonicalHash=v=>hash(canonicalize(v));
 assert.equal(canonicalHash(a),'e54c5650f1b2ec7cf6b9702128f65baf94f118d2bbf5fb91c072c07785ff2f1c');assert.deepEqual([a.story_id,a.native_key,a.native_id,a.parent],['R1-39','PGB-153','10613','PGB-66']);
 assert.equal(a.date,'2026-11-16');assert.equal(a.plan_sha256,'91819fcd235c9c3209ced8a1a3a603e3d57a476f1a68a9f26e88238a1376b078');assert.equal(a.partial_publication,true);assert.equal(a.native_publication_verified,true);
 assert.equal(a.source_provenance.base_commit,'9305f5cd2beea8bba84121b076efc8210a625459');assert.equal(a.source_provenance.base_tree,'cd94c4be3e9b1ef5527307214d890701eba1f39c');assert.equal(a.source_provenance.branch,'codex/pgb153-qa-publication');assert.equal(a.source_provenance.target_branch,'codex/pgb149-machine-preview');assert.deepEqual(a.source_provenance.changed_paths,old.source_provenance.changed_paths);
 assert.equal(a.historical_current_pr_capture.canonical_sha256,canonicalHash(old));assert.equal(a.historical_current_pr_capture.json_sha256,hash(old));assert.equal(a.historical_current_pr_capture.runtime_canonical_sha256,canonicalHash(old.source_runtime_revision));assert(a.historical_current_pr_capture.meaning.includes('immutable historical captures'));
 const bundle=await pre147Capture('config/skill-bundle.json'),paths=bundle.validatorPayload.sources.filter(f=>f.endsWith('.mjs')||f.endsWith('.schema.json')||['package.json','package-lock.json'].includes(f)).sort(),runtime=a.source_runtime_revision;
 assert.equal(paths.length,25);assert.deepEqual(Object.keys(runtime.artifacts_sha256),paths);
 // Complete immutable153 capture; current bytes are bound by the repaired-parent integration guard.
 assert.equal(runtime.revision_sha256,'sha256:fc6e56b9c892d04af56f1679bfade4420ac3ee1142a8eac3068c0eabf1c8e556');
 assert.equal(runtime.revision_sha256,'sha256:'+canonicalHash(runtime.artifacts_sha256));assert.equal(hash(await read('test/fixtures/manager-repairs.json')),runtime.source_fixture_sha256);assert.equal(runtime.source_fixture_sha256,old.source_runtime_revision.source_fixture_sha256);assert.deepEqual(paths.filter(file=>runtime.artifacts_sha256[file]!==old.source_runtime_revision.artifacts_sha256[file]),['lib/manager/repair-policy.mjs']);
 assert.deepEqual([p.story_count,p.case_count,a.source_inventory.story_count,a.source_inventory.case_count],[30,132,30,132]);for(const [file,field]of [['ticket-drafts.json','ticket_drafts_sha256'],['plan-metadata.json','plan_metadata_sha256']])assert.equal(hash(await stateRawFile(file)),a.source_inventory[field]);assert(!Object.hasOwn(p.stories,'R1-39'));assert(a.source_inventory.meaning.includes('no exhaustive native inventory'));
 const n=a.native_publication;assert.equal(n.receipt_sha256,'4bb4ed4d3adcea23d2493046116c29f4875f00a3e096b8bc5cac81e4d5f4506f');assert.equal(hash(JSON.stringify(n.receipt,null,2)+'\n'),n.receipt_sha256);assert.equal(n.readback_sha256,'315a8d7c8fa6b5c12b52138f622df19bdb3244d18d68202851409c16f87eecd1');assert.equal(n.receipt.native_readback_sha256,n.readback_sha256);assert.equal(n.receipt.work_sha256,'200dcddd0ff147e4e16cb6f957a1cd4f85dd52cc8d84a9ce595e78b3f70dec17');
 const bound={'PGB-153':['10613','59c2b5fe721c26d22d666087d3c88459c3f5e7ec04e1464fd35ad63b9c4710e4','0b9c78b511db03f49c14dff20ad9e16d7094a8bf10786429efd94ba3f4a5d56e'],'PGB-149':['10609','04045bdb1015f5ac75ecb6c65afaf260a3de75c459579bda129fa452031b387c','4576fdfe550451e5ecbd671cdf1c8a7a76bd62dff407a1fd5ed091d21cc46f39'],'PGB-151':['10611','756707e48cbe4aab24dd51748f637cd90d72d5c799a9f29bcda9f12995e15a3c','da6a1977ecb12d1e43f0ce89bcc2fabd6d4c483edf2442f1fdb8d7feb788c3e2'],'PGB-146':['10606','45932a2a2b29fca7ff67dc235a7c3f6b29bd8b3609fad26a9c1c755d9bb5af6d','1d7bc7075c214b6eed4d4d9280c30f39fee35454a2efd1ce075860cc9afa6fcc'],'PGB-81':['10541','2fc67b655eb29893408d9dfca2ca7b7c567e05740c75b2e417a3a143333d1c17','5514508fe0c18a500dbe4a3939bcd0e193fbf123eb09b1299e26612d779fff5f']};
 assert.deepEqual(Object.keys(n.contracts),Object.keys(bound));for(const [key,[id,description,digest]]of Object.entries(bound)){const row=n.contracts[key];assert.equal(row.native_id,id);assert.equal(row.description_sha256,description);assert.equal(row.canonical_contract_sha256,digest);assert.equal(canonicalHash(row.contract),digest,key);}
 const repair=n.contracts['PGB-153'].contract,current=n.contracts['PGB-149'].contract,prior=old.native_publication.contracts['PGB-149'].contract;assert.deepEqual(repair.prerequisites,[]);assert.equal(repair.acceptance_criteria.length,3);assert.equal(repair.technical_acceptance_criteria.constraints.length,2);assert.equal(repair.technical_acceptance_criteria.repository.base_branch,'codex/pgb149-machine-preview');assert.deepEqual(repair.testing_strategy.testing_types,[]);assert.deepEqual(repair.testing_strategy.cases,[]);assert.deepEqual(repair.testing_strategy.dispatch_order,[]);assert.deepEqual(repair.testing_strategy.human_review.cases.map(c=>c.id),['R1-39-H01','R1-39-H02']);assert(repair.testing_strategy.human_review.cases.every(c=>c.execution==='human'));assert(repair.testing_strategy.human_review.no_ai_cases_reason.startsWith('QA skills: []'));
 assert.deepEqual(current.prerequisites,[...prior.prerequisites,{ticket:'PGB-153',required_outcome:'ai_qa_complete'}]);const restored=structuredClone(current);restored.prerequisites.pop();restored.technical_acceptance_criteria.constraints.find(c=>c.id==='TAC3').requirement=prior.technical_acceptance_criteria.constraints.find(c=>c.id==='TAC3').requirement;assert.deepEqual(restored,prior);
 for(const key of ['PGB-151','PGB-146','PGB-81'])assert.deepEqual(n.contracts[key],old.native_publication.contracts[key],key+' complete native body binding preserved');
 assert.deepEqual(n.dependency_links,[{id:'10749',type_id:'10000',from:'PGB-153',to:'PGB-149'}]);assert.deepEqual(n.preserved_149_edges,[...old.native_publication.preserved_149_edges,...old.native_publication.dependency_links]);assert.deepEqual(n.preserved_146_edges,[...old.native_publication.preserved_146_edges,old.native_publication.preserved_149_edges.find(e=>e.from==='PGB-149'&&e.to==='PGB-146')]);assert.equal(n.preserved_81_edges.length,6);
 assert.equal(n.original149_unchanged_except_added153_prerequisite_and_TAC3,true);assert.equal(n.original151_146_81_complete_descriptions_unchanged,true);assert.equal(a.full_reconciliation_owner,'PGB-81');assert.equal(a.full_installed_fixture_kit_owner,'PGB-81');assert.deepEqual(a.readable_cause_parity,old.readable_cause_parity);
 for(const field of ['human_acceptance','original149_human_acceptance','original151_human_acceptance','original146_human_acceptance','PGB81_human_acceptance'])assert.equal(a[field],'NOT_RUN');assert.equal(a.activation_authorized,false);
});

test('PGB-146 readable completion preserves its complete historical capture',async()=>{
 const p=stateCheckpoint(await pre81Capture('publication.json'),'publication'),a=p.readable_repair_preview_amendment,machine=p.machine_repair_preview_amendment,current=p.current_pr_repair_amendment;
 const {default:canonicalize}=await import('canonicalize'),canonicalHash=value=>hash(canonicalize(value));
 const parent=structuredClone(p);delete parent.readable_repair_preview_amendment;delete parent.duplicate_qa_repair_amendment;delete parent.readable_repair_integration_amendment;
 assert.equal(canonicalHash(parent),'448d1c187e99926790dcad16ceb797fc55188edf5c77b4ed33874c3add9ccc1d','complete9767 publication object preserved, including every dated capture');
 assert.equal(a.historical_captures.parent_publication_canonical_sha256,canonicalHash(parent));
 assert.equal(canonicalHash(machine),'0683f0b84c1cfc37c6ea9df15b35cbd9238bc03df4fa39b4f06a3227b5e2f9c3');assert.equal(canonicalHash(current),'4edbd5f22d7bf97c3a268e150c1c67254ca2eae7deeec08750a143d97378e89d');
 assert.equal(a.historical_captures.machine_amendment_canonical_sha256,canonicalHash(machine));assert.equal(a.historical_captures.current_pr_amendment_canonical_sha256,canonicalHash(current));
 assert.equal(a.historical_captures.machine_runtime_revision_sha256,'sha256:e1e6614949fab7afaea835e2883f061572f0896c87649fff9bdb3be39c7c7028');assert.equal(a.historical_captures.current_pr_runtime_revision_sha256,'sha256:5714b94f17855020d619ae63a10883e50008a1b5d5504e5444cfa5333bcb3740');
 assert.deepEqual([a.date,a.story_id,a.native_key,a.native_id,a.parent],['2026-11-16','R1-32','PGB-146','10606','PGB-66']);assert.equal(a.partial_publication,true);
 assert.equal(a.plan_sha256,'a2668b38252feb7227432d67bc2dd88e6feea4a8b69dddc1ab86bc44d0189e68');assert.equal(a.stack_rebind_plan_sha256,'a9cfb76f048a34a60ef6fcd02ec17fdc350ac695be594d4c25847f39c18b85e2');
 assert.deepEqual([a.source_provenance.base_commit,a.source_provenance.base_tree,a.source_provenance.machine_commit,a.source_provenance.current_pr_repair_commit],['9767adec408e0c14cadce8723969e91d6589f999','cd94c4be3e9b1ef5527307214d890701eba1f39c','90c92fbcf9c8122bf03bcb5a9ee2f756e72dd379','9767adec408e0c14cadce8723969e91d6589f999']);
 assert.equal(a.source_provenance.branch,'codex/pgb146-readable-parity');assert(a.source_provenance.integrated_parent_binding.includes('Pending Director verification'));assert(a.source_provenance.implementation_revision.includes('external committed evidence'));
 const bundle=await pre147Capture('config/skill-bundle.json'),paths=bundle.validatorPayload.sources.filter(f=>f.endsWith('.mjs')||f.endsWith('.schema.json')||['package.json','package-lock.json'].includes(f)).sort(),runtime=a.source_runtime_revision;
 assert.equal(paths.length,25);for(const captured of [machine.source_runtime_revision,current.source_runtime_revision,runtime]){assert.deepEqual(Object.keys(captured.artifacts_sha256),paths);assert.equal(captured.revision_sha256,'sha256:'+canonicalHash(captured.artifacts_sha256));assert.equal(captured.source_fixture_sha256,'26280bc8c5095b32fe1bd8279a060f7b6fdafec1b3fc442569c4916d1c1665a7');}
 assert.equal(canonicalHash(a),'1a786ec14e05fa05d6cb74f49cbaa0116b6e829b6b4fc804a45825e600527254','complete immutable146 capture');assert.equal(hash(await read('test/fixtures/manager-repairs.json')),runtime.source_fixture_sha256);
 const differences=(left,right)=>paths.filter(file=>left.artifacts_sha256[file]!==right.artifacts_sha256[file]);
 assert.deepEqual(differences(runtime,current.source_runtime_revision),['scripts/manager-preview.mjs']);assert.deepEqual(differences(current.source_runtime_revision,machine.source_runtime_revision),['lib/manager/repair-policy.mjs']);assert.deepEqual(differences(runtime,machine.source_runtime_revision),['lib/manager/repair-policy.mjs','scripts/manager-preview.mjs']);
 assert.deepEqual([p.story_count,p.case_count,a.source_inventory.story_count,a.source_inventory.case_count],[30,132,30,132]);
 for(const [file,field]of [['ticket-drafts.json','ticket_drafts_sha256'],['plan-metadata.json','plan_metadata_sha256']]){assert.equal(hash(await stateRawFile(file)),a.source_inventory[field]);assert.equal(a.source_inventory[field],current.source_inventory[field]);}
 assert(a.source_inventory.meaning.includes('not an exhaustive current native inventory'));assert(a.source_inventory.meaning.includes('later82/147/148'));assert.equal(a.full_reconciliation_owner,'PGB-81');assert.equal(a.full_installed_fixture_kit_owner,'PGB-81');
 assert.equal(a.readable_cause_parity.owner,'PGB-146');assert.equal(a.readable_cause_parity.status,'SOURCE_COMPLETE');assert.deepEqual(a.readable_cause_parity.fields,['ticket_id','comment_id','record_id','digest']);assert.equal(a.readable_cause_parity.order,'Canonical proposal.roots order; no sorting or deduplication.');
 for(const field of ['human_acceptance','original149_human_acceptance','original151_human_acceptance','PGB81_human_acceptance'])assert.equal(a[field],'NOT_RUN');for(const field of ['hosted_checks','merge','release'])assert.equal(a[field],'NOT_CLAIMED');assert.equal(a.activation_authorized,false);
});

test('PGB-146 historical integration receipt preserves both captures and unchanged State runtime compatibility',async()=>{
 const p=stateCheckpoint(await pre81Capture('publication.json'),'publication'),a=p.readable_repair_integration_amendment;
 const {default:canonicalize}=await import('canonicalize'),canonicalHash=value=>hash(canonicalize(value));
 assert.deepEqual(Object.keys(p),["date", "epic", "grooming", "status", "stories", "operational_tasks", "story_count", "case_count", "requirement_count", "scenario_count", "dependency_links", "baseline_publication", "follow_on_tasks", "health_precedence_correction", "baseline_design_commit", "reviewed_design_artifacts", "startup_alarm_correction", "history", "qa_split", "repeated_parent_amendment", "current_source_scope", "baseline_before_amendments", "current_proof_conflict_amendment", "qa_input_preparation_amendment", "qa_input_controls_amendment", "own_ticket_selection_amendment", "read_configuration_amendment", "source_repair_preview_amendment", "machine_repair_preview_amendment", "current_pr_repair_amendment", "duplicate_qa_repair_amendment", "readable_repair_preview_amendment", "readable_repair_integration_amendment"]);assert.equal(Object.keys(p).length,33);
 const parent153=structuredClone(p);delete parent153.readable_repair_preview_amendment;delete parent153.readable_repair_integration_amendment;
 assert.equal(Object.keys(parent153).length,31);assert.equal(canonicalHash(parent153),'ede585e971742d22bdfa412f6336de6438ff40208cb47568ea86e54aca37dba9','complete153 publication');
 const renderer146=structuredClone(p);delete renderer146.duplicate_qa_repair_amendment;delete renderer146.readable_repair_integration_amendment;
 assert.equal(Object.keys(renderer146).length,31);assert.equal(canonicalHash(renderer146),'e5c4035078a6662b18adf86ca991a7b15831d6d0c718c1abb7989248fbd8ef16','complete146 publication');
 const historical={"date": "faffe734ef290597a139fa056e87a8ad295127cb0e390e1ea35540b79e420978", "epic": "828dc4e18e4f5b0d8037b95adc6dc11a00809bc5ec85b45e22f02ee017cf3325", "grooming": "ec0ad0427f1cb21ba9f5ac145557c10842225f12b186ca63fbfa3093225dfa9c", "status": "e4bbf9010f6ab6ce051e45e69a34e9e3e7bc8281bce6a1ceb23489219a5952cc", "stories": "8ee52fc23a344bcac6596d6a1bd180acf5c2c495f29ed4f4e3da2c236ced5f0d", "operational_tasks": "e2e386e7303351a51b6d6a08bae62494c1dcca06347cd71f7cec09dd6163466a", "story_count": "624b60c58c9d8bfb6ff1886c2fd605d2adeb6ea4da576068201b6c6958ce93f4", "case_count": "dbb1ded63bc70732626c5dfe6c7f50ced3d560e970f30b15335ac290358748f6", "requirement_count": "2858dcd1057d3eae7f7d5f782167e24b61153c01551450a628cee722509f6529", "scenario_count": "3d914f9348c9cc0ff8a79716700b9fcd4d2f3e711608004eb8f138bcba7f14d9", "dependency_links": "d8ceefd44d1be789aa02afdbe31b6a135e03b64e458f06c0e6199348f1f0151d", "baseline_publication": "a9ace78b278fe5e658148f78d6a3862dffc62b898d93e5cbbd2c39032e685bad", "follow_on_tasks": "5357e9df2f1b28aa6809d7251234dd8c6f1ce8ff633918d52f0946ec16c4d837", "health_precedence_correction": "92c0cc0bc4cb06bed8d2b57e2e84929867145eeb8e62dae0f0e5bf62a98f4ab0", "baseline_design_commit": "f23064f3bac1338bb9af99db042624661c849d5a2683e17bc7593aec5a110bb8", "reviewed_design_artifacts": "08d547efb542f6c6bfeb526e61ca70455b2fbd3849f1c004c24649c2545683c6", "startup_alarm_correction": "92f91852c319276343073208419b3ca674fc087c2e4b717ed62a22fd79bb88b2", "history": "749af3fc56b45131f9379c8c05091f87a5d32c3f380b5c352c9d2813b786bb8e", "qa_split": "cabe884d76ac72a4dda051fbbcadaad0861af45e3d5b1af99e234d5584a59e15", "repeated_parent_amendment": "71c6af2106ea9ea6ba64f5c593662ce47434037742fbf73596fcf06d4cfc27a3", "current_source_scope": "689e7c2ff674c111aac1953cf26e54897b84ae30529e6a649800db8c42d06336", "baseline_before_amendments": "09cd5c3844fb0fd3a4b7918adfd8f13f3788642fb57cb279629bb2b93bfbae2f", "current_proof_conflict_amendment": "0f43ea4500941fac0401279e515e9b95f0334f4b1d3350478d24bd7238a93714", "qa_input_preparation_amendment": "c9a487965ceec3138db899a37c76b6ec033091a76ce020e664cbb4080e16be83", "qa_input_controls_amendment": "9fe36ff2cd2ea5d622c5e73eaedaa8849cbc6e5462b6dc50a63f7a4144896ccd", "own_ticket_selection_amendment": "2e672235049d2b7f73ce8735d3e8a44d6e34d3d7a5dc1280697d6b02dfa59ef2", "read_configuration_amendment": "82bd2f1594e142f513c5c1d1ddd2189e9eb97022a761529f54d161cc6018094d", "source_repair_preview_amendment": "03026e5fa6c3443556bee62262311d5ebd88cdf78c6629c8388c187d200e7425", "machine_repair_preview_amendment": "0683f0b84c1cfc37c6ea9df15b35cbd9238bc03df4fa39b4f06a3227b5e2f9c3", "current_pr_repair_amendment": "4edbd5f22d7bf97c3a268e150c1c67254ca2eae7deeec08750a143d97378e89d", "duplicate_qa_repair_amendment": "e54c5650f1b2ec7cf6b9702128f65baf94f118d2bbf5fb91c072c07785ff2f1c", "readable_repair_preview_amendment": "1a786ec14e05fa05d6cb74f49cbaa0116b6e829b6b4fc804a45825e600527254"};
 assert.deepEqual(a.historical_captures.objects_canonical_sha256,historical);for(const [key,digest]of Object.entries(historical))assert.equal(canonicalHash(p[key]),digest,key+' complete historical object');
 assert.equal(a.historical_captures.parent153_publication_canonical_sha256,canonicalHash(parent153));assert.equal(a.historical_captures.renderer146_publication_canonical_sha256,canonicalHash(renderer146));assert.equal(a.historical_captures.common_publication_canonical_sha256,'448d1c187e99926790dcad16ceb797fc55188edf5c77b4ed33874c3add9ccc1d');
 assert.equal(canonicalHash(a),'76d16ffb7e040fcc86a234ef4eb47889d547d5cc6845aecca50e6e89571d3285','complete integration provenance');
 assert.deepEqual([a.date,a.story_id,a.native_key,a.native_id,a.parent],['2026-11-16','R1-32','PGB-146','10606','PGB-66']);assert.equal(a.plan_sha256,'5abde8e2a7ae224450755a22411b2a7a973c338c6cf43697a310d284aed21a74');assert.equal(a.partial_publication,true);assert(a.meaning.includes('not a native publication or a complete native inventory'));
 assert.deepEqual(a.source_provenance,{base_commit:'de35d90b7cdb664b9491c85c573c2089db55556f',base_tree:'77a0e6aafa1c6aa4f412e57fd1c52ec3d901a4f1',renderer_source_commit:'24f58b1759cc8d264f30afa1d12f222d7486291e',renderer_source_tree:'ca8c2409f7f4cfe2097b8e6fdc942e2bbc6cdc9c',branch:'codex/pgb146-pgb153-integration',implementation_revision:'Bound by external committed evidence; no self-referential source receipt.'});
 const bundle=JSON.parse(await historicalArtifactBytes('config/skill-bundle.json')),paths=bundle.validatorPayload.sources.filter(f=>f.endsWith('.mjs')||f.endsWith('.schema.json')||['package.json','package-lock.json'].includes(f)).sort(),runtime=a.source_runtime_revision;
 const source153=p.duplicate_qa_repair_amendment.source_runtime_revision,source146=p.readable_repair_preview_amendment.source_runtime_revision,source151=p.current_pr_repair_amendment.source_runtime_revision;
 assert.equal(paths.length,25);for(const captured of [runtime,source153,source146,source151]){assert.deepEqual(Object.keys(captured.artifacts_sha256),paths);assert.equal(captured.revision_sha256,'sha256:'+canonicalHash(captured.artifacts_sha256));assert.equal(captured.source_fixture_sha256,'26280bc8c5095b32fe1bd8279a060f7b6fdafec1b3fc442569c4916d1c1665a7');}
 assert.equal(runtime.revision_sha256,'sha256:c9bb78fbb34077cc7e7c114885fa1f014566acd20acb4aa3903e13ebb8038e8d');assert.deepEqual(runtime.artifacts_sha256,installed81RuntimeExpected.artifacts_sha256,'original146 integration map equals81 baseline');for(const file of paths)assert.equal(hash(await historicalArtifactBytes(file)),runtime.artifacts_sha256[file],file+' historical integration artifact');assert.equal(hash(await historicalArtifactBytes('test/fixtures/manager-repairs.json')),runtime.source_fixture_sha256);
 const differences=(left,right)=>paths.filter(file=>left.artifacts_sha256[file]!==right.artifacts_sha256[file]);assert.deepEqual(differences(runtime,source153),['scripts/manager-preview.mjs']);assert.deepEqual(differences(runtime,source146),['lib/manager/repair-policy.mjs']);assert.deepEqual(differences(runtime,source151),['lib/manager/repair-policy.mjs','scripts/manager-preview.mjs']);
 assert.deepEqual([p.story_count,p.case_count,a.source_inventory.story_count,a.source_inventory.case_count],[30,132,30,132]);assert.deepEqual(a.source_inventory,p.readable_repair_preview_amendment.source_inventory);for(const [file,field]of [['ticket-drafts.json','ticket_drafts_sha256'],['plan-metadata.json','plan_metadata_sha256']])assert.equal(hash(await stateRawFile(file)),a.source_inventory[field]);
 assert(a.source_inventory.meaning.includes('not an exhaustive current native inventory'));assert.equal(a.full_reconciliation_owner,'PGB-81');assert.equal(a.full_installed_fixture_kit_owner,'PGB-81');assert.deepEqual(a.readable_cause_parity,p.readable_repair_preview_amendment.readable_cause_parity);assert.equal(a.readable_cause_parity.status,'SOURCE_COMPLETE');assert.deepEqual(a.readable_cause_parity.fields,['ticket_id','comment_id','record_id','digest']);assert.equal(a.readable_cause_parity.order,'Canonical proposal.roots order; no sorting or deduplication.');
 assert.equal(a.preview_execution_authorized,false);assert.equal(a.preview_writes,0);for(const field of ['human_acceptance','original149_human_acceptance','original151_human_acceptance','original153_human_acceptance','PGB81_human_acceptance'])assert.equal(a[field],'NOT_RUN');for(const field of ['hosted_checks','merge','release'])assert.equal(a[field],'NOT_CLAIMED');assert.equal(a.activation_authorized,false);
});

const installed81HistoryExpected={
  "capture": "fc04c489ab7a8339b37ae310f3f8368319f31b228296450265041d418d03a982",
  "files": {
    "ticket-drafts.json": {
      "raw": "9ffe565fa1565be450711f4f7fd87b8da3ec8071a3e9e4701426d658ede34990",
      "json": "eb14a9bbd25c649d209e2743e869ed613745f84db6e5629252b4d3abea92d653",
      "canonical": "9da9ac2fc693db4c2fe90402378bc400c5ce0b8c779fab95c5f8c1f76f29a767"
    },
    "plan-metadata.json": {
      "raw": "a6feff8162b173221522ddc257b6c244a800a17aebeb3e1bfee7404179e643d2",
      "json": "eb58c13c50f7acfe1610b73abe139703b4c92e312f8034c96d897843f41fe1b1",
      "canonical": "11cacaa064a13f4d67f897e65c5e5c2f215b147593e7a91ee73edee869415e02"
    },
    "publication.json": {
      "raw": "d4cf6fe3e07bdc156f29c4792eadc33a18f03392b2e0e07e2e9409398793d65e",
      "json": "8624d22abca43b0f9929c7de5df31edbebc1a3e858269677cdae5b0f6fb907ad",
      "canonical": "c9350ea0c9ad239450642e4e8666ece52114b7061a6c72a92d0f1924593c7611"
    },
    "config/skill-bundle.json": {
      "raw": "6385214b9fa380394b6da33ffbe4eb43015f6bb3c0983d86e58ed61c83f260c2",
      "json": "4fb87e988d1f8c4044cac5181b3df9d6c14ce0bb119b127865e822a0643c1ad8",
      "canonical": "2205195a0e67d68a177f3ae937d512a8c4ab39822f5b0d741116802222e905d1"
    }
  },
  "amendments": {
    "native_source_issue_inspection_amendment": "b802c5dca056c8672da3299bafe861de6a23a417c5087a62f61db963a5e601f7",
    "native_observation_repair_amendment": "f26c0b04235d02b30efe4805fa60ecc19178f0a0da3419aae714ae25e9920f35",
    "native_target_identity_repair_amendment": "fcbf4dc6136308a711d674fe1eb70575d3653d276a2ae5367fedaae52a6db351",
    "source_repair_preview_amendment": "03026e5fa6c3443556bee62262311d5ebd88cdf78c6629c8388c187d200e7425",
    "machine_repair_preview_amendment": "0683f0b84c1cfc37c6ea9df15b35cbd9238bc03df4fa39b4f06a3227b5e2f9c3",
    "current_pr_repair_amendment": "4edbd5f22d7bf97c3a268e150c1c67254ca2eae7deeec08750a143d97378e89d",
    "duplicate_qa_repair_amendment": "e54c5650f1b2ec7cf6b9702128f65baf94f118d2bbf5fb91c072c07785ff2f1c",
    "readable_repair_preview_amendment": "1a786ec14e05fa05d6cb74f49cbaa0116b6e829b6b4fc804a45825e600527254",
    "readable_repair_integration_amendment": "76d16ffb7e040fcc86a234ef4eb47889d547d5cc6845aecca50e6e89571d3285"
  },
  "catalog": "92b3753b354125107f6c62bc56f784aa8b1669a2e28b764c6f967efa94a3fe62",
  "predecessors": {
    "source449": {
      "raw": "71b2dc34074009d1ba2673d98d221d597a0b749882958bafe626af3d7f8ec238",
      "json": "5919293a6640bd5952577f3a21793089fba7087fcbe80d4e4a5aa4dffbdad116",
      "canonical": "ee31b50545cc3f92d72856b9366e909879e5da13b4aa0655697dde254d3f732d"
    },
    "state_main": {
      "raw": "7f8053650b42ca413c0af1e1bcfb19be3f8528f82a2807abcb2c877db68ae39d",
      "json": "549c5f4913e4be75a72c16e0f985dcc534b01c7b1cc40901d744f61f9af8c8a6",
      "canonical": "7e999933eba22d8c7109df7a23aaae4715a60a97fc9abb6ea96ef6f53f887a7b"
    }
  }
};
const installed81ForecastExpected=[
  {
    "id": "R1-01",
    "key": "PGB-71",
    "min": "1.5",
    "max": "1.5",
    "files": [
      "package.json",
      "package-lock.json",
      "contracts/epic-v1.schema.json",
      "contracts/ticket-v1.schema.json",
      "docs/architecture/contracts/pigboard-epic-v1.schema.json",
      "docs/architecture/contracts/pigboard-ticket-v1.schema.json",
      "scripts/validate-work.mjs",
      "lib/contracts/parse.mjs",
      "lib/contracts/schema.mjs",
      "test/work-syntax.test.mjs",
      "test/fixtures/work-syntax.json",
      "docs/authoring.md",
      "config/skill-bundle.json",
      "scripts/prepare-pigboard-skills.mjs",
      "test/skill-distribution.test.mjs",
      "docs/architecture/manager-work-schema.md",
      "docs/architecture/contracts/check_work_examples.py",
      "docs/architecture/manager-work-contract.md",
      "docs/architecture/examples/manager-ticket.yaml"
    ]
  },
  {
    "id": "R1-02",
    "key": "PGB-72",
    "min": "1.5",
    "max": "1.5",
    "files": [
      "lib/contracts/work-semantics.mjs",
      "lib/contracts/case-graph.mjs",
      "scripts/validate-work.mjs",
      "test/work-semantics.test.mjs",
      "test/case-graph.test.mjs",
      "test/fixtures/work-semantics.json",
      "docs/authoring.md"
    ]
  },
  {
    "id": "R1-03",
    "key": "PGB-73",
    "min": "1.25",
    "max": "1.25",
    "files": [
      "skills/write-pr-sized-stories/SKILL.md",
      "skills/write-pr-sized-stories/references/pigboard-ticket.md",
      "skills/write-pr-sized-stories/references/pigboard-example.md",
      "skills/write-pr-sized-stories/references/pigboard-epic.md",
      "skills/write-pr-sized-stories/references/epic.yaml",
      "skills/write-pr-sized-stories/references/ticket.yaml",
      "test/story-authoring.test.mjs",
      "docs/authoring.md"
    ]
  },
  {
    "id": "R1-04",
    "key": "PGB-74",
    "min": "1.75",
    "max": "1.75",
    "files": [
      "contracts/handoff-v1.schema.json",
      "contracts/work-pointer-v1.schema.json",
      "docs/architecture/contracts/pigboard-handoff-v1.schema.json",
      "docs/architecture/contracts/pigboard-work-pointer-v1.schema.json",
      "lib/contracts/handoff.mjs",
      "lib/contracts/canonical.mjs",
      "lib/contracts/receipts.mjs",
      "scripts/validate-handoff.mjs",
      "test/handoff.test.mjs",
      "test/receipt-chain.test.mjs",
      "test/fixtures/handoff-chains.json",
      "docs/handoffs.md",
      "config/skill-bundle.json",
      "scripts/prepare-pigboard-skills.mjs",
      "test/skill-distribution.test.mjs",
      "docs/architecture/manager-handoff-contract.md",
      "docs/architecture/contracts/check_work_examples.py",
      "docs/architecture/examples/handoffs/admission.yaml"
    ]
  },
  {
    "id": "R1-21",
    "key": "PGB-99",
    "min": "1.5",
    "max": "1.5",
    "files": [
      "contracts/config-v1.schema.json",
      "lib/config/parse.mjs",
      "lib/config/projects.mjs",
      "scripts/check-config.mjs",
      "lib/config/diff.mjs",
      "test/config-projects.test.mjs",
      "test/fixtures/project-configs.json",
      "docs/configuration.md",
      "config/pigboss.example.yaml"
    ]
  },
  {
    "id": "R1-31",
    "key": "PGB-145",
    "min": "1.53125",
    "max": "1.90625",
    "files": [
      "contracts/config-v1.schema.json",
      "lib/config/parse.mjs",
      "lib/config/projects.mjs",
      "lib/config/diff.mjs",
      "config/pigboss.example.yaml",
      "scripts/check-config.mjs",
      "test/config-projects.test.mjs",
      "test/config-diff.test.mjs",
      "test/skill-distribution.test.mjs",
      "docs/configuration.md",
      "docs/delivery/manager-r1/stories.md",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/coverage.md",
      "docs/product/README.md",
      "docs/delivery/manager-r1/plan-metadata.json",
      "docs/delivery/manager-r1/publication.json",
      "docs/delivery/manager-r1/ticket-drafts.json",
      "test/story-authoring.test.mjs",
      "test/qa-helper-contract.test.mjs",
      "docs/product/coverage.md"
    ]
  },
  {
    "id": "R1-05",
    "key": "PGB-75",
    "min": "1.5",
    "max": "1.5",
    "files": [
      "skills/implementer-entrypoint/SKILL.md",
      "skills/implementer-entrypoint/references/cursor.md",
      "skills/implementer-entrypoint/references/handoff.md",
      "skills/implementer-entrypoint/references/plan-review.md",
      "skills/implementer-jira/SKILL.md",
      "skills/implementer-jira/references/publication.md",
      "config/skill-bundle.json",
      "test/implementer-contract.test.mjs",
      "test/fixtures/implementer-transcripts.json",
      "docs/workflow.md"
    ]
  },
  {
    "id": "R1-06",
    "key": "PGB-76",
    "min": "1.25",
    "max": "1.25",
    "files": [
      "skills/pigboard-pr-review/SKILL.md",
      "skills/pigboard-pr-review/references/cursor.md",
      "skills/pigboard-pr-review/references/jira-handoff.md",
      "skills/reviewer-jira/SKILL.md",
      "config/skill-bundle.json",
      "test/reviewer-contract.test.mjs",
      "test/fixtures/reviewer-transcripts.json",
      "docs/workflow.md"
    ]
  },
  {
    "id": "R1-07",
    "key": "PGB-77",
    "min": "1.5",
    "max": "1.5",
    "files": [
      "skills/qa-api/SKILL.md",
      "skills/qa-bruno/SKILL.md",
      "skills/qa-database/SKILL.md",
      "skills/qa-ui/SKILL.md",
      "test/qa-helper-contract.test.mjs",
      "test/fixtures/qa-helper-cases.json",
      "docs/qa-cases.md"
    ]
  },
  {
    "id": "R1-24",
    "key": "PGB-110",
    "min": "3.34375",
    "max": "4.5625",
    "files": [
      "skills/qa-jira/SKILL.md",
      "config/skill-bundle.json",
      "test/qa-helper-contract.test.mjs",
      "test/fixtures/qa-helper-case.mjs",
      "test/cursor-environment.test.mjs",
      "README.md",
      "ARCHITECTURE.md",
      "docs/workflow.md",
      "docs/install.md",
      "docs/using-pigboard.md",
      "docs/handoffs.md",
      "config/cursor/automations.md",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/plan-metadata.json",
      "docs/delivery/manager-r1/ticket-drafts.json",
      "docs/delivery/manager-r1/publication.json",
      "docs/delivery/manager-r1/stories.md",
      "docs/delivery/manager-r1/coverage.md",
      "docs/product/coverage.md",
      "docs/product/README.md"
    ]
  },
  {
    "id": "R1-30",
    "key": "PGB-138",
    "min": "1.0625",
    "max": "1.5625",
    "files": [
      "skills/write-pr-sized-stories/SKILL.md",
      "skills/write-pr-sized-stories/references/basic-workflow-ticket.md",
      "skills/implementer-entrypoint/references/handoff.md",
      "skills/pigboard-pr-review/references/jira-handoff.md",
      "docs/authoring.md",
      "test/story-authoring.test.mjs",
      "test/fixtures/qa-helper-case.mjs",
      "test/qa-helper-contract.test.mjs",
      "docs/using-pigboard.md",
      "skills/qa-api/references/structured-steps.md",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/plan-metadata.json",
      "docs/delivery/manager-r1/ticket-drafts.json",
      "docs/delivery/manager-r1/publication.json",
      "docs/delivery/manager-r1/stories.md",
      "docs/delivery/manager-r1/coverage.md",
      "docs/product/coverage.md",
      "docs/product/README.md"
    ]
  },
  {
    "id": "R1-27",
    "key": "PGB-132",
    "min": "1.0625",
    "max": "1.59375",
    "files": [
      "test/story-authoring.test.mjs",
      "test/fixtures/qa-helper-case.mjs",
      "test/qa-helper-contract.test.mjs",
      "docs/using-pigboard.md",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/plan-metadata.json",
      "docs/delivery/manager-r1/ticket-drafts.json",
      "docs/delivery/manager-r1/publication.json",
      "docs/delivery/manager-r1/stories.md",
      "docs/delivery/manager-r1/coverage.md",
      "docs/product/coverage.md",
      "docs/product/README.md"
    ]
  },
  {
    "id": "R1-08",
    "key": "PGB-78",
    "min": "1.3125",
    "max": "1.8125",
    "files": [
      "skills/qa-entrypoint/SKILL.md",
      "skills/qa-entrypoint/references/execution-record.md",
      "skills/qa-entrypoint/references/cursor.md",
      "test/fixtures/qa-helper-case.mjs",
      "test/qa-helper-contract.test.mjs",
      "test/cursor-environment.test.mjs",
      "test/story-authoring.test.mjs",
      "README.md",
      "ARCHITECTURE.md",
      "docs/workflow.md",
      "docs/install.md",
      "docs/using-pigboard.md",
      "docs/handoffs.md",
      "config/cursor/automations.md",
      "skills/qa-jira/SKILL.md",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/plan-metadata.json"
    ]
  },
  {
    "id": "R1-09",
    "key": "PGB-79",
    "min": "1.25",
    "max": "1.25",
    "files": [
      "skills/request-rework/SKILL.md",
      "skills/request-rework/references/example.md",
      "config/skill-bundle.json",
      "test/request-rework.test.mjs",
      "test/fixtures/human-rework.json",
      "docs/using-pigboard.md",
      "docs/workflow.md"
    ]
  },
  {
    "id": "R1-10",
    "key": "PGB-80",
    "min": "1.75",
    "max": "1.75",
    "files": [
      "lib/manager/snapshot.mjs",
      "lib/manager/availability.mjs",
      "lib/manager/decisions.mjs",
      "scripts/manager-preview.mjs",
      "test/manager-preview.test.mjs",
      "test/fixtures/manager-candidates.json",
      "docs/manager-preview.md"
    ]
  },
  {
    "id": "R1-25",
    "key": "PGB-113",
    "min": "1.98",
    "max": "1.98",
    "files": [
      "lib/contracts/receipts.mjs",
      "test/receipt-chain.test.mjs",
      "test/fixtures/handoff-chains.json",
      "test/cursor-environment.test.mjs",
      "docs/handoffs.md",
      "docs/architecture/manager-handoff-contract.md",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/plan-metadata.json",
      "docs/delivery/manager-r1/ticket-drafts.json",
      "docs/delivery/manager-r1/stories.md",
      "docs/delivery/manager-r1/coverage.md",
      "docs/delivery/manager-r1/publication.json",
      "docs/product/README.md",
      "docs/product/coverage.md",
      "test/qa-helper-contract.test.mjs"
    ]
  },
  {
    "id": "R1-26",
    "key": "PGB-129",
    "min": "1.28",
    "max": "1.28",
    "files": [
      "lib/contracts/receipts.mjs",
      "lib/manager/snapshot.mjs",
      "test/receipt-chain.test.mjs",
      "test/manager-preview.test.mjs",
      "test/fixtures/manager-proof-conflicts.json",
      "test/cursor-environment.test.mjs",
      "docs/manager-preview.md",
      "docs/architecture/manager-handoff-contract.md",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/plan-metadata.json",
      "docs/delivery/manager-r1/ticket-drafts.json",
      "docs/delivery/manager-r1/stories.md",
      "docs/delivery/manager-r1/coverage.md",
      "docs/delivery/manager-r1/publication.json",
      "docs/product/README.md",
      "docs/product/coverage.md",
      "test/qa-helper-contract.test.mjs"
    ]
  },
  {
    "id": "R1-28",
    "key": "PGB-136",
    "min": "1.92",
    "max": "1.92",
    "files": [
      "lib/contracts/receipts.mjs",
      "lib/manager/snapshot.mjs",
      "README.md",
      "lib/manager/decisions.mjs",
      "test/story-authoring.test.mjs",
      "test/manager-preview.test.mjs",
      "test/cursor-environment.test.mjs",
      "test/fixtures/manager-repairs.json",
      "docs/manager-preview.md",
      "docs/architecture/manager-handoff-contract.md",
      "ARCHITECTURE.md",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/plan-metadata.json",
      "docs/delivery/manager-r1/ticket-drafts.json",
      "docs/delivery/manager-r1/publication.json",
      "docs/delivery/manager-r1/stories.md",
      "docs/delivery/manager-r1/coverage.md",
      "docs/product/README.md",
      "docs/product/coverage.md",
      "test/qa-helper-contract.test.mjs"
    ]
  },
  {
    "id": "R1-11",
    "key": "PGB-81",
    "min": "1.91",
    "max": "1.91",
    "files": [
      "config/skill-bundle.json",
      "scripts/install-cursor-skills.mjs",
      "test/cursor-environment.test.mjs",
      "docs/manager-preview.md",
      "docs/install.md",
      "README.md",
      "ARCHITECTURE.md",
      "docs/handoffs.md",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/plan-metadata.json",
      "docs/delivery/manager-r1/ticket-drafts.json",
      "docs/delivery/manager-r1/publication.json",
      "docs/delivery/manager-r1/stories.md",
      "docs/delivery/manager-r1/coverage.md",
      "docs/product/README.md",
      "docs/product/coverage.md",
      "test/story-authoring.test.mjs",
      "test/qa-helper-contract.test.mjs"
    ]
  },
  {
    "id": "R1-12",
    "key": "PGB-82",
    "min": "1.375",
    "max": "1.875",
    "files": [
      "config/pigboss.example.yaml",
      "lib/manager/live-preview.mjs",
      "test/manager-jira-preview.test.mjs",
      "test/fixtures/jira-preview-harness.mjs",
      "test/fixtures/jira-preview-cases.json",
      "config/skill-bundle.json",
      "scripts/install-cursor-skills.mjs",
      "test/skill-distribution.test.mjs",
      "docs/configuration.md",
      "docs/manager-preview.md",
      "docs/install.md",
      "README.md",
      "ARCHITECTURE.md"
    ],
    "hours": {
      "min": 11,
      "max": 15
    }
  },
  {
    "id": "R1-13",
    "key": "PGB-83",
    "min": "1.75",
    "max": "1.75",
    "files": [
      "lib/aws/lambda.mjs",
      "lib/aws/secrets.mjs",
      "infra/aws/template.yaml",
      "scripts/package-manager.mjs",
      "scripts/deploy-manager.mjs",
      "contracts/config-v1.schema.json",
      "test/aws-package.test.mjs",
      "test/aws-iam.test.mjs",
      "test/fixtures/aws-config.json",
      "docs/install-manager.md",
      "docs/configuration.md",
      "package.json",
      "package-lock.json"
    ]
  },
  {
    "id": "R1-14",
    "key": "PGB-84",
    "min": "1.75",
    "max": "1.75",
    "files": [
      "lib/state/contract.mjs",
      "lib/aws/dynamodb.mjs",
      "scripts/manager-state.mjs",
      "lib/aws/lambda.mjs",
      "infra/aws/template.yaml",
      "test/state-conformance.test.mjs",
      "test/dynamodb-state.test.mjs",
      "test/fixtures/state-history.json",
      "docs/manager-state.md",
      "docs/install-manager.md"
    ]
  },
  {
    "id": "R1-15",
    "key": "PGB-85",
    "min": "1.5",
    "max": "1.5",
    "files": [
      "lib/manager/reconcile.mjs",
      "lib/state/contract.mjs",
      "lib/aws/dynamodb.mjs",
      "scripts/manager-state.mjs",
      "lib/aws/reconcile-context.mjs",
      "test/reconciliation.test.mjs",
      "test/fixtures/reconciliation.json",
      "scripts/test-manager-state.mjs",
      "docs/manager-state.md",
      "docs/install-manager.md",
      "infra/aws/template.yaml",
      "test/manager-state-cli.test.mjs"
    ]
  },
  {
    "id": "R1-16",
    "key": "PGB-86",
    "min": "1.25",
    "max": "1.25",
    "files": [
      "scripts/deploy-manager.mjs",
      "scripts/manager-state.mjs",
      "lib/config/compatibility.mjs",
      "infra/aws/template.yaml",
      "test/install-lifecycle.test.mjs",
      "test/fixtures/upgrade-state.json",
      "docs/install-manager.md",
      "docs/manager-state.md"
    ]
  },
  {
    "id": "R1-22",
    "key": "PGB-100",
    "min": "1.75",
    "max": "1.75",
    "files": [
      "lib/manager/scan-summary.mjs",
      "lib/manager/health.mjs",
      "lib/aws/scan-telemetry.mjs",
      "lib/aws/health-reader.mjs",
      "lib/aws/lambda.mjs",
      "scripts/pigboss-health.mjs",
      "test/manager-health.test.mjs",
      "test/aws-health.test.mjs",
      "test/fixtures/health-results.json",
      "docs/operate-pigboss.md",
      "contracts/config-v1.schema.json"
    ]
  },
  {
    "id": "R1-23",
    "key": "PGB-101",
    "min": "1.5",
    "max": "1.5",
    "files": [
      "infra/aws/health.yaml",
      "infra/aws/template.yaml",
      "lib/aws/lifecycle.mjs",
      "scripts/check-manager-readiness.mjs",
      "test/aws-health-package.test.mjs",
      "test/aws-lifecycle.test.mjs",
      "test/fixtures/health-package.json",
      "docs/operate-pigboss.md",
      "docs/install-manager.md",
      "contracts/config-v1.schema.json"
    ]
  },
  {
    "id": "R1-17",
    "key": "PGB-87",
    "min": "1.75",
    "max": "1.75",
    "files": [
      "lib/manager/apply.mjs",
      "lib/jira/mutations.mjs",
      "lib/aws/lambda.mjs",
      "scripts/manager-apply.mjs",
      "scripts/manager-state.mjs",
      "test/new-admission.test.mjs",
      "test/admission-failures.test.mjs",
      "test/fixtures/admission-traces.json",
      "docs/manager-operations.md",
      "docs/install-manager.md"
    ]
  },
  {
    "id": "R1-18",
    "key": "PGB-88",
    "min": "1.25",
    "max": "1.25",
    "files": [
      "lib/manager/apply.mjs",
      "lib/manager/repair-admission.mjs",
      "test/repair-admission.test.mjs",
      "test/fixtures/repair-admissions.json",
      "docs/manager-operations.md"
    ]
  },
  {
    "id": "R1-19",
    "key": "PGB-89",
    "min": "1.5",
    "max": "1.5",
    "files": [
      "lib/manager/stack-queue.mjs",
      "lib/manager/apply.mjs",
      "test/stack-queue.test.mjs",
      "test/fixtures/stack-traces.json",
      "docs/manager-operations.md"
    ]
  },
  {
    "id": "R1-20",
    "key": "PGB-90",
    "min": "1.5",
    "max": "1.5",
    "files": [
      "config/skill-bundle.json",
      "config/cursor/automations.md",
      "config/cursor/implementer-prompt.txt",
      "config/cursor/pr-review-prompt.txt",
      "config/cursor/qa-prompt.txt",
      "config/jira/exports/AI-Daniel-1-implementer.json",
      "config/jira/exports/AI-Daniel-1-pr-review.json",
      "config/jira/exports/AI-Daniel-1-qa.json",
      "scripts/check-manager-readiness.mjs",
      "scripts/prepare-pigboard-skills.mjs",
      "test/manager-readiness.test.mjs",
      "test/skill-distribution.test.mjs",
      "docs/install-manager.md",
      "docs/workflow.md",
      "docs/using-pigboard.md"
    ]
  },
  {
    "id": "R1-29",
    "key": "PGB-137",
    "min": "1.5625",
    "max": "1.5625",
    "files": [
      "lib/state/contract.mjs",
      "lib/aws/dynamodb.mjs",
      "test/manager-state-contract.test.mjs",
      "test/fixtures/transition-proof.json",
      "scripts/test-transition-proof.mjs",
      "scripts/manager-state.mjs",
      "test/manager-state-cli.test.mjs",
      "docs/manager-state.md",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/plan-metadata.json",
      "docs/delivery/manager-r1/ticket-drafts.json",
      "docs/delivery/manager-r1/publication.json",
      "docs/delivery/manager-r1/stories.md",
      "docs/delivery/manager-r1/coverage.md",
      "docs/product/README.md",
      "docs/product/coverage.md",
      "test/qa-helper-contract.test.mjs"
    ]
  },
  {
    "id": "R1-32",
    "key": "PGB-146",
    "min": "0.86",
    "max": "0.86",
    "files": [
      "ARCHITECTURE.md",
      "README.md",
      "docs/delivery/manager-r1/publication.json",
      "docs/manager-preview.md",
      "docs/product/README.md",
      "scripts/manager-preview.mjs",
      "test/cursor-environment.test.mjs",
      "test/manager-preview.test.mjs",
      "test/qa-helper-contract.test.mjs",
      "test/repair-policy.test.mjs"
    ],
    "hours": {
      "min": 6.88,
      "max": 6.88
    }
  },
  {
    "id": "R1-33",
    "key": "PGB-147",
    "min": "0.94375",
    "max": "1.28125",
    "files": [
      "ARCHITECTURE.md",
      "README.md",
      "config/skill-bundle.json",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/coverage.md",
      "docs/delivery/manager-r1/plan-metadata.json",
      "docs/delivery/manager-r1/publication.json",
      "docs/delivery/manager-r1/stories.md",
      "docs/delivery/manager-r1/ticket-drafts.json",
      "docs/manager-preview.md",
      "docs/product/README.md",
      "docs/product/coverage.md",
      "test/fixtures/jira-preview-harness.mjs",
      "test/qa-helper-contract.test.mjs",
      "test/skill-distribution.test.mjs",
      "test/story-authoring.test.mjs"
    ]
  },
  {
    "id": "R1-34",
    "key": "PGB-148",
    "min": "1.34375",
    "max": "1.8125",
    "files": [
      "lib/jira/read.mjs",
      "lib/jira/inventory.mjs",
      "test/jira-inventory.test.mjs",
      "test/fixtures/jira-preview-harness.mjs",
      "test/fixtures/jira-preview-cases.json",
      "config/skill-bundle.json",
      "test/skill-distribution.test.mjs",
      "docs/manager-preview.md",
      "README.md",
      "ARCHITECTURE.md",
      "docs/delivery/manager-r1/stories.md",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/coverage.md",
      "docs/product/README.md",
      "docs/delivery/manager-r1/plan-metadata.json",
      "docs/delivery/manager-r1/publication.json",
      "docs/delivery/manager-r1/ticket-drafts.json",
      "test/story-authoring.test.mjs",
      "test/qa-helper-contract.test.mjs",
      "docs/product/coverage.md"
    ]
  },
  {
    "id": "R1-35",
    "key": "PGB-149",
    "min": "1.965",
    "max": "1.965",
    "files": [
      "lib/contracts/receipts.mjs",
      "lib/manager/availability.mjs",
      "lib/manager/decisions.mjs",
      "lib/manager/repair-policy.mjs",
      "lib/manager/snapshot.mjs",
      "scripts/manager-preview.mjs",
      "test/fixtures/manager-candidates.json",
      "test/fixtures/manager-repairs.json",
      "test/manager-preview.test.mjs",
      "test/receipt-chain.test.mjs",
      "test/repair-policy.test.mjs",
      "config/skill-bundle.json",
      "test/cursor-environment.test.mjs",
      "docs/manager-preview.md",
      "docs/delivery/manager-r1/publication.json",
      "test/qa-helper-contract.test.mjs",
      "docs/product/README.md",
      "ARCHITECTURE.md",
      "README.md",
      "docs/architecture/manager-handoff-contract.md"
    ]
  },
  {
    "id": "R1-36",
    "key": "PGB-150",
    "min": "1.24375",
    "max": "1.7875",
    "files": [
      "lib/jira/read.mjs",
      "test/jira-read.test.mjs",
      "test/fixtures/jira-preview-harness.mjs",
      "test/fixtures/jira-preview-cases.json",
      "test/fixtures/jira-preview-tls.json",
      "README.md",
      "ARCHITECTURE.md",
      "docs/manager-preview.md",
      "docs/delivery/manager-r1/stories.md",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/coverage.md",
      "docs/delivery/manager-r1/plan-metadata.json",
      "docs/delivery/manager-r1/publication.json",
      "docs/delivery/manager-r1/ticket-drafts.json",
      "docs/product/README.md",
      "docs/product/coverage.md",
      "test/story-authoring.test.mjs",
      "test/qa-helper-contract.test.mjs"
    ],
    "hours": {
      "min": 9.95,
      "max": 14.3
    }
  },
  {
    "id": "R1-37",
    "key": "PGB-151",
    "min": "0.55",
    "max": "0.55",
    "files": [
      "lib/manager/repair-policy.mjs",
      "test/repair-policy.test.mjs",
      "docs/manager-preview.md",
      "docs/delivery/manager-r1/publication.json",
      "test/qa-helper-contract.test.mjs"
    ]
  },
  {
    "id": "R1-38",
    "key": "PGB-152",
    "min": "0.4375",
    "max": "0.75",
    "files": [
      "lib/jira/read.mjs",
      "test/jira-read.test.mjs",
      "docs/manager-preview.md",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/plan-metadata.json",
      "docs/delivery/manager-r1/publication.json",
      "test/story-authoring.test.mjs",
      "test/qa-helper-contract.test.mjs"
    ]
  },
  {
    "id": "R1-39",
    "key": "PGB-153",
    "min": "0.65",
    "max": "0.65",
    "files": [
      "lib/manager/repair-policy.mjs",
      "test/repair-policy.test.mjs",
      "docs/manager-preview.md",
      "docs/delivery/manager-r1/publication.json",
      "test/qa-helper-contract.test.mjs"
    ]
  },
  {
    "id": "R1-40",
    "key": "PGB-154",
    "min": "0.375",
    "max": "0.6375",
    "files": [
      "lib/jira/read.mjs",
      "test/jira-read.test.mjs",
      "docs/manager-preview.md",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/plan-metadata.json",
      "docs/delivery/manager-r1/publication.json",
      "test/story-authoring.test.mjs",
      "test/qa-helper-contract.test.mjs"
    ],
    "hours": {
      "min": 3,
      "max": 5.1
    }
  },
  {
    "id": "R1-41",
    "key": "PGB-155",
    "min": "0.68125",
    "max": "1.08125",
    "files": [
      "docs/delivery/manager-r1/stories.md",
      "docs/delivery/manager-r1/README.md",
      "docs/delivery/manager-r1/coverage.md",
      "docs/delivery/manager-r1/plan-metadata.json",
      "docs/delivery/manager-r1/publication.json",
      "docs/delivery/manager-r1/ticket-drafts.json",
      "docs/product/README.md",
      "docs/product/coverage.md",
      "test/story-authoring.test.mjs",
      "test/qa-helper-contract.test.mjs"
    ],
    "hours": {
      "min": 5.45,
      "max": 8.65
    }
  },
  {
    "id": "R1-42",
    "key": "PGB-156",
    "min": "0.69375",
    "max": "1.175",
    "files": [
      "lib/jira/read.mjs",
      "test/jira-read.test.mjs",
      "test/fixtures/jira-preview-harness.mjs",
      "test/fixtures/jira-preview-tls.json",
      "docs/manager-preview.md"
    ],
    "hours": {
      "min": 5.55,
      "max": 9.4
    }
  }
];
const installed81CoverageExpected={
  "docs/product/coverage.md": [
    {
      "ids": [
        "A01"
      ],
      "prefix": " A01 | Existing writer; work contract | Bounded structured Story/Bug authoring ",
      "references": [
        "R1-03-H01",
        "R1-03-H02"
      ]
    },
    {
      "ids": [
        "A02"
      ],
      "prefix": " A02 | Existing bundle + sibling human-writing reference | Self-contained published skill dependency ",
      "references": [
        "R1-03-H01",
        "R1-20-H01"
      ]
    },
    {
      "ids": [
        "A03"
      ],
      "prefix": " A03 | Epic/ticket skeletons; schema guide | Full editable YAML output ",
      "references": [
        "R1-01-H01",
        "R1-03-H01"
      ]
    },
    {
      "ids": [
        "A04"
      ],
      "prefix": " A04 | Epic schema; work contract | Explicit stream membership/order ",
      "references": [
        "R1-03-H01"
      ]
    },
    {
      "ids": [
        "A05"
      ],
      "prefix": " A05 | Ticket schema; work contract | One-repository scope and prerequisites ",
      "references": [
        "R1-02-H02",
        "R1-03-H01",
        "R1-03-H02"
      ]
    },
    {
      "ids": [
        "A06"
      ],
      "prefix": " A06 | Ticket schema testing strategy | Complete executable acceptance cases ",
      "references": [
        "R1-02-H01",
        "R1-02-H02",
        "R1-02-H03",
        "R1-08-H01",
        "R1-24-H01",
        "R1-24-H02",
        "R1-24-H03",
        "R1-27-H01",
        "R1-27-H02",
        "R1-30-H01",
        "R1-30-H02"
      ]
    },
    {
      "ids": [
        "A07"
      ],
      "prefix": " A07 | Schema execution graph | Exact dispatch and helper ownership ",
      "references": [
        "R1-02-H01",
        "R1-07-H01",
        "R1-08-H01",
        "R1-27-H01",
        "R1-27-H02",
        "R1-30-H01",
        "R1-30-H02"
      ]
    },
    {
      "ids": [
        "A08"
      ],
      "prefix": " A08 | Human cases; coverage validation | AI/human separation and requirement coverage ",
      "references": [
        "R1-02-H01",
        "R1-08-H03",
        "R1-24-H01",
        "R1-24-H02",
        "R1-24-H03",
        "R1-27-H03",
        "R1-30-H03"
      ]
    },
    {
      "ids": [
        "A09"
      ],
      "prefix": " A09 | Preparation slots | Prepared execution details without changed expectations ",
      "references": [
        "R1-02-H02",
        "R1-05-H01",
        "R1-07-H02"
      ]
    },
    {
      "ids": [
        "A10"
      ],
      "prefix": " A10 | Extraction/semantic rules | Safe parsing and useful validation errors ",
      "references": [
        "R1-01-H02",
        "R1-02-H02"
      ]
    },
    {
      "ids": [
        "A11"
      ],
      "prefix": " A11 | Start conditions | Invalid/unresolved ticket cannot start ",
      "references": [
        "R1-01-H01",
        "R1-02-H01",
        "R1-02-H03",
        "R1-03-H02"
      ]
    },
    {
      "ids": [
        "A12"
      ],
      "prefix": " A12 | Config/work authority boundary | Work text cannot grant authority ",
      "references": [
        "R1-02-H01",
        "R1-03-H02",
        "R1-12-H03",
        "R1-31-H02",
        "R1-31-H04",
        "R1-36-H03"
      ]
    },
    {
      "ids": [
        "W01"
      ],
      "prefix": " W01 | Existing model configuration; handoffs | High plan + one High review, Medium execution, High PR/QA ",
      "references": [
        "R1-05-H01",
        "R1-06-H01",
        "R1-08-H01",
        "R1-20-H01"
      ]
    },
    {
      "ids": [
        "W02"
      ],
      "prefix": " W02 | Work/stack contracts | Relevant Epic context with bounded change scope ",
      "references": [
        "R1-05-H01"
      ]
    },
    {
      "ids": [
        "W03"
      ],
      "prefix": " W03 | Implementation handoff | Current CI, PR and prepared QA evidence ",
      "references": [
        "R1-05-H01",
        "R1-05-H02",
        "R1-27-H01",
        "R1-27-H02",
        "R1-30-H01",
        "R1-30-H02"
      ]
    },
    {
      "ids": [
        "W04"
      ],
      "prefix": " W04 | Actual lineage fields | Correct PR target and recorded parent revision ",
      "references": [
        "R1-05-H01",
        "R1-05-H02",
        "R1-26-PC01",
        "R1-25-C01",
        "R1-25-C02",
        "R1-25-C03",
        "R1-28-OC02",
        "R1-28-OC05"
      ]
    },
    {
      "ids": [
        "W05"
      ],
      "prefix": " W05 | Review handoff; shared pr-review | Approval or queued repair with PR/Jira findings ",
      "references": [
        "R1-06-H01",
        "R1-06-H02"
      ]
    },
    {
      "ids": [
        "W06"
      ],
      "prefix": " W06 | QA ledger/handoff | Exact cases, evidence and correct stage result ",
      "references": [
        "R1-08-H01",
        "R1-08-H02",
        "R1-08-H03",
        "R1-24-H01",
        "R1-24-H02",
        "R1-24-H03",
        "R1-27-H01",
        "R1-27-H03",
        "R1-30-H01",
        "R1-30-H03"
      ]
    },
    {
      "ids": [
        "W07"
      ],
      "prefix": " W07 | Existing QA helpers; schema skill sections | Prescribed API/PostgreSQL/UI execution ",
      "references": [
        "R1-07-H01",
        "R1-07-H02",
        "R1-27-H01",
        "R1-27-H02",
        "R1-30-H01",
        "R1-30-H02"
      ]
    },
    {
      "ids": [
        "W08"
      ],
      "prefix": " W08 | Workflow environment contract | Trusted current-revision supplied environment ",
      "references": [
        "R1-07-H02",
        "R1-08-H03",
        "R1-24-H01",
        "R1-24-H02",
        "R1-24-H03",
        "R1-27-H02",
        "R1-27-H03",
        "R1-30-H02",
        "R1-30-H03"
      ]
    },
    {
      "ids": [
        "W09"
      ],
      "prefix": " W09 | Repair/dependency-wait handoffs | Queue understood rework without launching it ",
      "references": [
        "R1-05-H02",
        "R1-06-H02",
        "R1-08-H02",
        "R1-09-H01",
        "R1-18-H01",
        "R1-24-H01",
        "R1-24-H02",
        "R1-24-H03",
        "R1-27-H03"
      ]
    },
    {
      "ids": [
        "W10"
      ],
      "prefix": " W10 | Role authority; resume contract | Human-requested repair producer and human-only authority ",
      "references": [
        "R1-09-H01",
        "R1-09-H02",
        "R1-20-H03"
      ]
    },
    {
      "ids": [
        "W11"
      ],
      "prefix": " W11 | Human Review / UAT / production stages | Human reviews/cases recorded before acceptance ",
      "references": [
        "R1-08-H03",
        "R1-20-H03",
        "R1-24-H01",
        "R1-24-H02",
        "R1-24-H03",
        "R1-27-H03",
        "R1-30-H03"
      ]
    },
    {
      "ids": [
        "W12"
      ],
      "prefix": " W12 | Publication/semantic rules | Structured trustworthy role result and single transition ",
      "references": [
        "R1-04-H01",
        "R1-04-H02",
        "R1-04-H03",
        "R1-05-H02",
        "R1-06-H02",
        "R1-08-H03",
        "R1-09-H02",
        "R1-24-H01",
        "R1-24-H02",
        "R1-24-H03",
        "R1-26-PC01",
        "R1-25-C01",
        "R1-25-C02",
        "R1-25-C03",
        "R1-27-H03",
        "R1-30-H03",
        "R1-28-OC02",
        "R1-28-OC05",
        "R1-28-OC06"
      ]
    },
    {
      "ids": [
        "M01"
      ],
      "prefix": " M01 | S01–S02 | Opt-in, active Epic and full stream identity ",
      "references": [
        "R1-11-S01",
        "R1-11-S02",
        "R1-17-H01",
        "R1-28-OC04"
      ]
    },
    {
      "ids": [
        "M02"
      ],
      "prefix": " M02 | S18, S30 | Independent streams; conflicting ownership hold ",
      "references": [
        "R1-11-S18",
        "R1-11-S30",
        "R1-28-OC04"
      ]
    },
    {
      "ids": [
        "M03"
      ],
      "prefix": " M03 | S03–S04, S08–S09 | Ignore unready work without bypassing repair ",
      "references": [
        "R1-11-S03",
        "R1-11-S04",
        "R1-11-S08",
        "R1-11-S09",
        "R1-28-OC01",
        "R1-28-OC05"
      ]
    },
    {
      "ids": [
        "M04"
      ],
      "prefix": " M04 | S11, S17, S39 | One occupied cycle across worker stages ",
      "references": [
        "R1-11-S11",
        "R1-11-S17",
        "R1-11-S39",
        "R1-17-H03",
        "R1-28-OC04"
      ]
    },
    {
      "ids": [
        "M05"
      ],
      "prefix": " M05 | S12–S16 | Five-ticket cap including Bugs/rework ",
      "references": [
        "R1-11-S12",
        "R1-11-S13",
        "R1-11-S14",
        "R1-11-S15",
        "R1-11-S16",
        "R1-18-H01",
        "R1-28-OC04"
      ]
    },
    {
      "ids": [
        "M06"
      ],
      "prefix": " M06 | S07–S10, S37 | Repair/prerequisite/Bug/Story priority ",
      "references": [
        "R1-11-S07",
        "R1-11-S08",
        "R1-11-S09",
        "R1-11-S10",
        "R1-11-S37",
        "R1-18-H01",
        "R1-28-OC01",
        "R1-28-OC03",
        "R1-28-OC06"
      ]
    },
    {
      "ids": [
        "M07"
      ],
      "prefix": " M07 | S05–S06, S34 | Current evidence satisfies prerequisites ",
      "references": [
        "R1-11-S05",
        "R1-11-S06",
        "R1-11-S34",
        "R1-28-OC03"
      ]
    },
    {
      "ids": [
        "M08"
      ],
      "prefix": " M08 | S19–S21 | Finish active work, then oldest repair ",
      "references": [
        "R1-11-S19",
        "R1-11-S20",
        "R1-11-S21",
        "R1-09-H01",
        "R1-18-H01"
      ]
    },
    {
      "ids": [
        "M09"
      ],
      "prefix": " M09 | S22–S24 | Queue stale completed child after parent QA ",
      "references": [
        "R1-11-S22",
        "R1-11-S23",
        "R1-11-S24",
        "R1-19-H01"
      ]
    },
    {
      "ids": [
        "M10"
      ],
      "prefix": " M10 | S25, S29; stack chain | Consume roots once and propagate actual descendants ",
      "references": [
        "R1-11-S25",
        "R1-11-S29",
        "R1-18-H02",
        "R1-19-H02",
        "R1-26-PC01",
        "R1-25-C01",
        "R1-25-C02",
        "R1-25-C03",
        "R1-28-OC02",
        "R1-28-OC05"
      ]
    },
    {
      "ids": [
        "M11"
      ],
      "prefix": " M11 | S26–S28; stack boundary cases | No guessed lineage/merge cascade or active interruption ",
      "references": [
        "R1-11-S24",
        "R1-11-S26",
        "R1-11-S27",
        "R1-11-S28",
        "R1-19-H03"
      ]
    },
    {
      "ids": [
        "M12"
      ],
      "prefix": " M12 | S02, S40 | Paused Epic starts no new cycle ",
      "references": [
        "R1-11-S02",
        "R1-11-S40",
        "R1-19-H03"
      ]
    },
    {
      "ids": [
        "M13"
      ],
      "prefix": " M13 | S30–S36; retained inventory closure | Edits/missing work cannot release occupied stream ",
      "references": [
        "R1-11-S30",
        "R1-11-S31",
        "R1-11-S32",
        "R1-11-S33",
        "R1-11-S34",
        "R1-11-S35",
        "R1-11-S36",
        "R1-12-H02",
        "R1-14-H01"
      ]
    },
    {
      "ids": [
        "M14"
      ],
      "prefix": " M14 | S38, S41; intent protocol | Read-only preview and fresh directed mutations ",
      "references": [
        "R1-11-S37",
        "R1-11-S38",
        "R1-11-S41",
        "R1-12-H01",
        "R1-17-H02",
        "R1-18-H03",
        "R1-19-H03",
        "R1-31-H04",
        "R1-36-H01",
        "R1-36-H02"
      ]
    },
    {
      "ids": [
        "O01"
      ],
      "prefix": " O01 | Customer-owned release design | Runnable private AWS installation ",
      "references": [
        "R1-13-H01",
        "R1-13-H02"
      ]
    },
    {
      "ids": [
        "O02"
      ],
      "prefix": " O02 | Core/adapter/wrapper boundary | Local harness without cloud imports or credentials ",
      "references": [
        "R1-10-H01",
        "R1-13-H01"
      ]
    },
    {
      "ids": [
        "O03"
      ],
      "prefix": " O03 | Config ownership | One validated customer configuration ",
      "references": [
        "R1-12-H01",
        "R1-12-H03",
        "R1-13-H01",
        "R1-16-H01",
        "R1-20-H02",
        "R1-31-H01",
        "R1-31-H02",
        "R1-31-H03",
        "R1-36-H01",
        "R1-36-H04"
      ]
    },
    {
      "ids": [
        "O04"
      ],
      "prefix": " O04 | Existing fetch/refresh scripts | Compatible pinned bundle verified in Build ",
      "references": [
        "R1-20-H01"
      ]
    },
    {
      "ids": [
        "O05"
      ],
      "prefix": " O05 | State ownership; reviewed closure | Four record types with retained history/member identity ",
      "references": [
        "R1-14-H01",
        "R1-14-H02"
      ]
    },
    {
      "ids": [
        "O06"
      ],
      "prefix": " O06 | Publication order; provider receipts | Conditional intent before manager Jira side effects ",
      "references": [
        "R1-14-H02",
        "R1-17-H01",
        "R1-17-H02",
        "R1-19-H01"
      ]
    },
    {
      "ids": [
        "O07"
      ],
      "prefix": " O07 | State failure table; partial probe evidence | Failure/uncertainty holds without replay ",
      "references": [
        "R1-14-H02",
        "R1-17-H02",
        "R1-18-H03",
        "R1-19-H03"
      ]
    },
    {
      "ids": [
        "O08"
      ],
      "prefix": " O08 | Evidence-only reconciliation closure | Operator can inspect and reconcile proved outcomes ",
      "references": [
        "R1-15-H01",
        "R1-15-H02"
      ]
    },
    {
      "ids": [
        "O09"
      ],
      "prefix": " O09 | Security boundaries; scoped probe evidence | Restricted runtime and sanitized outputs ",
      "references": [
        "R1-12-H03",
        "R1-13-H02",
        "R1-15-H02",
        "R1-31-H02",
        "R1-31-H04",
        "R1-36-H02",
        "R1-36-H03",
        "R1-36-H04"
      ]
    },
    {
      "ids": [
        "O10"
      ],
      "prefix": " O10 | Deployment/inventory closure | Disabled install, preview and bounded operation ",
      "references": [
        "R1-13-H02",
        "R1-15-H02",
        "R1-16-H02",
        "R1-17-H03"
      ]
    },
    {
      "ids": [
        "O11"
      ],
      "prefix": " O11 | State lifecycle | Safe upgrade/rollback/restore/removal ",
      "references": [
        "R1-14-H01",
        "R1-15-H02",
        "R1-16-H01",
        "R1-16-H02"
      ]
    },
    {
      "ids": [
        "O12"
      ],
      "prefix": " O12 | Coordinated rollout audit; PGB-58 | Complete compatible release accepted before activation ",
      "references": [
        "R1-20-H01",
        "R1-20-H02",
        "R1-20-H03"
      ]
    },
    {
      "ids": [
        "M01",
        "M02",
        "M04",
        "M05"
      ],
      "prefix": " M01, M02, M04, M05 | R1-04-H04, R1-10-H03, R1-21-H01, R1-21-H02 ",
      "references": []
    },
    {
      "ids": [
        "M07",
        "M13",
        "O03",
        "O05",
        "O07"
      ],
      "prefix": " M07, M13, O03, O05, O07 | R1-12-H04, R1-14-H03, R1-21-H03 ",
      "references": []
    },
    {
      "ids": [
        "O13"
      ],
      "prefix": " O13 | R1-04-H04, R1-10-H03, R1-12-H04, R1-14-H03, R1-21-H01–H03 ",
      "references": [
        "R1-31-H01"
      ]
    },
    {
      "ids": [
        "O14"
      ],
      "prefix": " O14 | R1-22-H01–H04 ",
      "references": []
    },
    {
      "ids": [
        "O15",
        "O09",
        "O12"
      ],
      "prefix": " O15, O09–O12 | R1-23-H01–H04, R1-20-H04 ",
      "references": []
    }
  ],
  "docs/delivery/manager-r1/coverage.md": [
    {
      "ids": [
        "A01"
      ],
      "prefix": " A01 ",
      "references": [
        "R1-03-H01",
        "R1-03-H02"
      ]
    },
    {
      "ids": [
        "A02"
      ],
      "prefix": " A02 ",
      "references": [
        "R1-03-H01",
        "R1-20-H01"
      ]
    },
    {
      "ids": [
        "A03"
      ],
      "prefix": " A03 ",
      "references": [
        "R1-01-H01",
        "R1-03-H01"
      ]
    },
    {
      "ids": [
        "A04"
      ],
      "prefix": " A04 ",
      "references": [
        "R1-03-H01"
      ]
    },
    {
      "ids": [
        "A05"
      ],
      "prefix": " A05 ",
      "references": [
        "R1-02-H02",
        "R1-03-H01",
        "R1-03-H02"
      ]
    },
    {
      "ids": [
        "A06"
      ],
      "prefix": " A06 ",
      "references": [
        "R1-02-H01",
        "R1-02-H02",
        "R1-02-H03",
        "R1-08-H01",
        "R1-24-H01",
        "R1-24-H02",
        "R1-24-H03",
        "R1-27-H01",
        "R1-27-H02",
        "R1-30-H01",
        "R1-30-H02"
      ]
    },
    {
      "ids": [
        "A07"
      ],
      "prefix": " A07 ",
      "references": [
        "R1-02-H01",
        "R1-07-H01",
        "R1-08-H01",
        "R1-27-H01",
        "R1-27-H02",
        "R1-30-H01",
        "R1-30-H02"
      ]
    },
    {
      "ids": [
        "A08"
      ],
      "prefix": " A08 ",
      "references": [
        "R1-02-H01",
        "R1-08-H03",
        "R1-24-H01",
        "R1-24-H02",
        "R1-24-H03",
        "R1-27-H03",
        "R1-30-H03"
      ]
    },
    {
      "ids": [
        "A09"
      ],
      "prefix": " A09 ",
      "references": [
        "R1-02-H02",
        "R1-05-H01",
        "R1-07-H02"
      ]
    },
    {
      "ids": [
        "A10"
      ],
      "prefix": " A10 ",
      "references": [
        "R1-01-H02",
        "R1-02-H02"
      ]
    },
    {
      "ids": [
        "A11"
      ],
      "prefix": " A11 ",
      "references": [
        "R1-01-H01",
        "R1-02-H01",
        "R1-02-H03",
        "R1-03-H02"
      ]
    },
    {
      "ids": [
        "A12"
      ],
      "prefix": " A12 ",
      "references": [
        "R1-02-H01",
        "R1-03-H02",
        "R1-12-H03",
        "R1-31-H02",
        "R1-31-H04",
        "R1-36-H03"
      ]
    },
    {
      "ids": [
        "W01"
      ],
      "prefix": " W01 ",
      "references": [
        "R1-05-H01",
        "R1-06-H01",
        "R1-08-H01",
        "R1-20-H01"
      ]
    },
    {
      "ids": [
        "W02"
      ],
      "prefix": " W02 ",
      "references": [
        "R1-05-H01"
      ]
    },
    {
      "ids": [
        "W03"
      ],
      "prefix": " W03 ",
      "references": [
        "R1-05-H01",
        "R1-05-H02",
        "R1-27-H01",
        "R1-27-H02",
        "R1-30-H01",
        "R1-30-H02"
      ]
    },
    {
      "ids": [
        "W04"
      ],
      "prefix": " W04 ",
      "references": [
        "R1-05-H01",
        "R1-05-H02",
        "R1-26-PC01",
        "R1-25-C01",
        "R1-25-C02",
        "R1-25-C03",
        "R1-28-OC02",
        "R1-28-OC05"
      ]
    },
    {
      "ids": [
        "W05"
      ],
      "prefix": " W05 ",
      "references": [
        "R1-06-H01",
        "R1-06-H02"
      ]
    },
    {
      "ids": [
        "W06"
      ],
      "prefix": " W06 ",
      "references": [
        "R1-08-H01",
        "R1-08-H02",
        "R1-08-H03",
        "R1-24-H01",
        "R1-24-H02",
        "R1-24-H03",
        "R1-27-H01",
        "R1-27-H03",
        "R1-30-H01",
        "R1-30-H03"
      ]
    },
    {
      "ids": [
        "W07"
      ],
      "prefix": " W07 ",
      "references": [
        "R1-07-H01",
        "R1-07-H02",
        "R1-27-H01",
        "R1-27-H02",
        "R1-30-H01",
        "R1-30-H02"
      ]
    },
    {
      "ids": [
        "W08"
      ],
      "prefix": " W08 ",
      "references": [
        "R1-07-H02",
        "R1-08-H03",
        "R1-24-H01",
        "R1-24-H02",
        "R1-24-H03",
        "R1-27-H02",
        "R1-27-H03",
        "R1-30-H02",
        "R1-30-H03"
      ]
    },
    {
      "ids": [
        "W09"
      ],
      "prefix": " W09 ",
      "references": [
        "R1-05-H02",
        "R1-06-H02",
        "R1-08-H02",
        "R1-09-H01",
        "R1-18-H01",
        "R1-24-H01",
        "R1-24-H02",
        "R1-24-H03",
        "R1-27-H03"
      ]
    },
    {
      "ids": [
        "W10"
      ],
      "prefix": " W10 ",
      "references": [
        "R1-09-H01",
        "R1-09-H02",
        "R1-20-H03"
      ]
    },
    {
      "ids": [
        "W11"
      ],
      "prefix": " W11 ",
      "references": [
        "R1-08-H03",
        "R1-20-H03",
        "R1-24-H01",
        "R1-24-H02",
        "R1-24-H03",
        "R1-27-H03",
        "R1-30-H03"
      ]
    },
    {
      "ids": [
        "W12"
      ],
      "prefix": " W12 ",
      "references": [
        "R1-04-H01",
        "R1-04-H02",
        "R1-04-H03",
        "R1-05-H02",
        "R1-06-H02",
        "R1-08-H03",
        "R1-09-H02",
        "R1-24-H01",
        "R1-24-H02",
        "R1-24-H03",
        "R1-26-PC01",
        "R1-25-C01",
        "R1-25-C02",
        "R1-25-C03",
        "R1-27-H03",
        "R1-30-H03",
        "R1-28-OC02",
        "R1-28-OC05",
        "R1-28-OC06"
      ]
    },
    {
      "ids": [
        "M01"
      ],
      "prefix": " M01 ",
      "references": [
        "R1-11-S01",
        "R1-11-S02",
        "R1-17-H01",
        "R1-28-OC04"
      ]
    },
    {
      "ids": [
        "M02"
      ],
      "prefix": " M02 ",
      "references": [
        "R1-11-S18",
        "R1-11-S30",
        "R1-28-OC04"
      ]
    },
    {
      "ids": [
        "M03"
      ],
      "prefix": " M03 ",
      "references": [
        "R1-11-S03",
        "R1-11-S04",
        "R1-11-S08",
        "R1-11-S09",
        "R1-28-OC01",
        "R1-28-OC05"
      ]
    },
    {
      "ids": [
        "M04"
      ],
      "prefix": " M04 ",
      "references": [
        "R1-11-S11",
        "R1-11-S17",
        "R1-11-S39",
        "R1-17-H03",
        "R1-28-OC04"
      ]
    },
    {
      "ids": [
        "M05"
      ],
      "prefix": " M05 ",
      "references": [
        "R1-11-S12",
        "R1-11-S13",
        "R1-11-S14",
        "R1-11-S15",
        "R1-11-S16",
        "R1-18-H01",
        "R1-28-OC04"
      ]
    },
    {
      "ids": [
        "M06"
      ],
      "prefix": " M06 ",
      "references": [
        "R1-11-S07",
        "R1-11-S08",
        "R1-11-S09",
        "R1-11-S10",
        "R1-11-S37",
        "R1-18-H01",
        "R1-28-OC01",
        "R1-28-OC03",
        "R1-28-OC06"
      ]
    },
    {
      "ids": [
        "M07"
      ],
      "prefix": " M07 ",
      "references": [
        "R1-11-S05",
        "R1-11-S06",
        "R1-11-S34",
        "R1-28-OC03"
      ]
    },
    {
      "ids": [
        "M08"
      ],
      "prefix": " M08 ",
      "references": [
        "R1-11-S19",
        "R1-11-S20",
        "R1-11-S21",
        "R1-09-H01",
        "R1-18-H01"
      ]
    },
    {
      "ids": [
        "M09"
      ],
      "prefix": " M09 ",
      "references": [
        "R1-11-S22",
        "R1-11-S23",
        "R1-11-S24",
        "R1-19-H01"
      ]
    },
    {
      "ids": [
        "M10"
      ],
      "prefix": " M10 ",
      "references": [
        "R1-11-S25",
        "R1-11-S29",
        "R1-18-H02",
        "R1-19-H02",
        "R1-26-PC01",
        "R1-25-C01",
        "R1-25-C02",
        "R1-25-C03",
        "R1-28-OC02",
        "R1-28-OC05"
      ]
    },
    {
      "ids": [
        "M11"
      ],
      "prefix": " M11 ",
      "references": [
        "R1-11-S24",
        "R1-11-S26",
        "R1-11-S27",
        "R1-11-S28",
        "R1-19-H03"
      ]
    },
    {
      "ids": [
        "M12"
      ],
      "prefix": " M12 ",
      "references": [
        "R1-11-S02",
        "R1-11-S40",
        "R1-19-H03"
      ]
    },
    {
      "ids": [
        "M13"
      ],
      "prefix": " M13 ",
      "references": [
        "R1-11-S30",
        "R1-11-S31",
        "R1-11-S32",
        "R1-11-S33",
        "R1-11-S34",
        "R1-11-S35",
        "R1-11-S36",
        "R1-12-H02",
        "R1-14-H01"
      ]
    },
    {
      "ids": [
        "M14"
      ],
      "prefix": " M14 ",
      "references": [
        "R1-11-S37",
        "R1-11-S38",
        "R1-11-S41",
        "R1-12-H01",
        "R1-17-H02",
        "R1-18-H03",
        "R1-19-H03",
        "R1-31-H04",
        "R1-36-H01",
        "R1-36-H02"
      ]
    },
    {
      "ids": [
        "O01"
      ],
      "prefix": " O01 ",
      "references": [
        "R1-13-H01",
        "R1-13-H02"
      ]
    },
    {
      "ids": [
        "O02"
      ],
      "prefix": " O02 ",
      "references": [
        "R1-10-H01",
        "R1-13-H01"
      ]
    },
    {
      "ids": [
        "O03"
      ],
      "prefix": " O03 ",
      "references": [
        "R1-12-H01",
        "R1-12-H03",
        "R1-13-H01",
        "R1-16-H01",
        "R1-20-H02",
        "R1-31-H01",
        "R1-31-H02",
        "R1-31-H03",
        "R1-36-H01",
        "R1-36-H04"
      ]
    },
    {
      "ids": [
        "O04"
      ],
      "prefix": " O04 ",
      "references": [
        "R1-20-H01"
      ]
    },
    {
      "ids": [
        "O05"
      ],
      "prefix": " O05 ",
      "references": [
        "R1-14-H01",
        "R1-14-H02"
      ]
    },
    {
      "ids": [
        "O06"
      ],
      "prefix": " O06 ",
      "references": [
        "R1-14-H02",
        "R1-17-H01",
        "R1-17-H02",
        "R1-19-H01"
      ]
    },
    {
      "ids": [
        "O07"
      ],
      "prefix": " O07 ",
      "references": [
        "R1-14-H02",
        "R1-17-H02",
        "R1-18-H03",
        "R1-19-H03"
      ]
    },
    {
      "ids": [
        "O08"
      ],
      "prefix": " O08 ",
      "references": [
        "R1-15-H01",
        "R1-15-H02"
      ]
    },
    {
      "ids": [
        "O09"
      ],
      "prefix": " O09 ",
      "references": [
        "R1-12-H03",
        "R1-13-H02",
        "R1-15-H02",
        "R1-31-H02",
        "R1-31-H04",
        "R1-36-H02",
        "R1-36-H03",
        "R1-36-H04"
      ]
    },
    {
      "ids": [
        "O10"
      ],
      "prefix": " O10 ",
      "references": [
        "R1-13-H02",
        "R1-15-H02",
        "R1-16-H02",
        "R1-17-H03"
      ]
    },
    {
      "ids": [
        "O11"
      ],
      "prefix": " O11 ",
      "references": [
        "R1-14-H01",
        "R1-15-H02",
        "R1-16-H01",
        "R1-16-H02"
      ]
    },
    {
      "ids": [
        "O12"
      ],
      "prefix": " O12 ",
      "references": [
        "R1-20-H01",
        "R1-20-H02",
        "R1-20-H03"
      ]
    },
    {
      "ids": [
        "M01",
        "M02",
        "M04",
        "M05"
      ],
      "prefix": " M01, M02, M04, M05 | R1-04-H04, R1-10-H03, R1-21-H01, R1-21-H02 ",
      "references": []
    },
    {
      "ids": [
        "M07",
        "M13",
        "O03",
        "O05",
        "O07"
      ],
      "prefix": " M07, M13, O03, O05, O07 | R1-12-H04, R1-14-H03, R1-21-H03 ",
      "references": []
    },
    {
      "ids": [
        "O13"
      ],
      "prefix": " O13 | R1-04-H04, R1-10-H03, R1-12-H04, R1-14-H03, R1-21-H01–H03 ",
      "references": [
        "R1-31-H01"
      ]
    },
    {
      "ids": [
        "O14"
      ],
      "prefix": " O14 | R1-22-H01–H04 ",
      "references": []
    },
    {
      "ids": [
        "O15",
        "O09",
        "O12"
      ],
      "prefix": " O15, O09–O12 | R1-23-H01–H04, R1-20-H04 ",
      "references": []
    }
  ]
};
const installed81RuntimeExpected={
  "artifacts_sha256": {
    "contracts/config-v1.schema.json": "58a48a7e51bbee8c0dde0ffaaaed1479a531c2bbaa7919773931b43f355592b2",
    "contracts/epic-v1.schema.json": "d495ec3de052ac8daeb26bb3b43e55b839c889d232c692025ce02c0c5f5242ac",
    "contracts/handoff-v1.schema.json": "6ef02c5c8d297155520a14f890ac99cdfa5e160c95d5754c6127cd27f8f4e596",
    "contracts/ticket-v1.schema.json": "5b54d5e8c89a25f288cb1aaa032b67a0b85a3fa0eb31fcd1abcab53893839660",
    "contracts/work-pointer-v1.schema.json": "24dec200e48b2529bb6fc5931d513baaae2c74b72c497f4e2693dd3ede783242",
    "contracts/work-validation-context-v1.schema.json": "19931601db402fc13e7f4587997434d1c833c05b52219f94727286063b26af15",
    "lib/config/diff.mjs": "07233ae79e7dd39386b3a70c4ca5f137310ae44d4f79bf5ad2742eccff72102d",
    "lib/config/parse.mjs": "f5cf9845195725ada2761490f4b92ffad2de1c31ca979302d4066b7ef9c893b7",
    "lib/config/projects.mjs": "b6c67027e204ad7f5cbefbed5905b0da7c2eb5890ae515130d54ded5166436d5",
    "lib/contracts/case-graph.mjs": "9508880a82a7066348a3aa0a6d91ddfa42769e75fb03d869e7607f4f895c75d2",
    "lib/contracts/handoff.mjs": "eeeca554108af3744c439e84a0487a1dda1dd48a925cec76000de17715889c3f",
    "lib/contracts/receipts.mjs": "82bfee1c5a2174852ad1931fa872fe860ab9c170ba1f0af11bd9a3f96a54d9e7",
    "lib/contracts/work-semantics.mjs": "ba1a3acadba6d169ec3bad52a3689c9b4b78b713dbac9fe408b949b966f2cc8d",
    "lib/contracts/work.mjs": "50dbbd8a11237b1b90508a059a5ca9be44c4a39662e94ffbe39ab89db2808df4",
    "lib/manager/availability.mjs": "d31f127d719416e943f43b973aeba1eb7aa69f9c2c51807f0171514f47a7024e",
    "lib/manager/decisions.mjs": "adbd01534853836341ae9c45fd4deb28c21c6397bc3f007bc303b567c246536c",
    "lib/manager/repair-policy.mjs": "349f197f563794d3f9722605047f472f31aa1f16a8b97f1701d5aa9760b3b766",
    "lib/manager/snapshot.mjs": "40a851769b5b1261cd070db1a7f330846aeb93433dfca819c0a292184db5cb17",
    "package-lock.json": "25bf17a5f4a5a4ae917114cdbb66ebe3e743358cb19427d1337fa2549cc68373",
    "package.json": "ccd116a2865faf81720d2180e7379df5ecea76ebde8c9732a2cef64e3572a4c9",
    "scripts/check-config.mjs": "b883334a57bf2e2b0abe4d96c3bb07dd117359a95c7814b3cf4685a95c1dd75c",
    "scripts/manager-preview.mjs": "ba79458f2855bedbc34291a80168e049698b5f1477342dab3c20a012773e13f4",
    "scripts/prepare-handoff.mjs": "5e47da76d68125fd66917af26a1256364501ac461ccd15bbac056c0e04e75eef",
    "scripts/validate-handoff.mjs": "bf5bf6bfb1dcc3b217154c916a99e18502862a56bec5d0438a84e64aafb67807",
    "scripts/validate-work.mjs": "46023df5916da4ab7d5eaa8c44fec19e8aef708eb3e5ab76343662ddde06776d"
  },
  "revision_sha256": "sha256:c9bb78fbb34077cc7e7c114885fa1f014566acd20acb4aa3903e13ebb8038e8d",
  "source_fixture_sha256": "26280bc8c5095b32fe1bd8279a060f7b6fdafec1b3fc442569c4916d1c1665a7"
};
const installed81RoutesExpected=[
  {
    "case_id": "R1-29-H01",
    "case_sha256": "a80e641cc7f4afb95d37803433fb1e91a9452e300a16b6fe7018b7a6bf93f83a",
    "requirements": [
      "O08"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Retains and inspects matching original transition proof without resending."
  },
  {
    "case_id": "R1-29-H02",
    "case_sha256": "2ea8a579039d85f1ef3062e4fc0af082c5855d1dc164a19fcc7929e8f13757c1",
    "requirements": [
      "O08",
      "O09"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Conflicting proof and bounded/uncertain observations preserve the evidence boundary."
  },
  {
    "case_id": "R1-32-H01",
    "case_sha256": "eae26476aeb1eabb39fb25a5f08824bd1704635814e7a771d15afe02bb89e127",
    "requirements": [
      "M08",
      "M09",
      "M10",
      "M11",
      "M14"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Full fixed repair reports include ordering, descendant lineage, parent QA and nonexecuting proposals."
  },
  {
    "case_id": "R1-32-H02",
    "case_sha256": "23f459d1b95fa984c107eed10f23a3342ae4d26fd6dd4e3e4e6b04386541d2bb",
    "requirements": [
      "M14"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Historical authentication remains distinct from current proof and performs no effects."
  },
  {
    "case_id": "R1-33-H01",
    "case_sha256": "6de8e247af9cf4998a4950ee14fb3b37beb6869f79277c1a04eb8f3c6a8e4bf7",
    "requirements": [
      "M13"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Bounded requested observations explicitly do not prove full domain inventory."
  },
  {
    "case_id": "R1-33-H02",
    "case_sha256": "b19ff8afb563f90a8c11e50c782e0bdcb60a76d677392b5c4ba28a042a95ea94",
    "requirements": [
      "M13",
      "O09"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Partial, changed or denied reads remain incomplete within explicit budgets."
  },
  {
    "case_id": "R1-33-H03",
    "case_sha256": "9a0e6b14ddc53e3ff4b96f4fcb0d027a9ce3e9f4b682eb8b967e91bfa13cd576",
    "requirements": [
      "O03",
      "O09"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Exact configuration scope, destination/TLS and safe output boundaries are enforced."
  },
  {
    "case_id": "R1-33-H04",
    "case_sha256": "7d9d4ec8f5874f061f7afc74b89be72277d8d48587387c1805fb3bbaff214bf9",
    "requirements": [
      "M14",
      "O09"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Copied guide/recovery and no-effects checks preserve the read-only boundary."
  },
  {
    "case_id": "R1-34-H01",
    "case_sha256": "985058f64d9cee1103cba98b65e611e92509825d2b44f81b17d4f8c4563e1c31",
    "requirements": [
      "M13"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Collects the complete scoped occupancy/domain including retained members."
  },
  {
    "case_id": "R1-34-H02",
    "case_sha256": "e9a91a8010b24e0ec8c99c6ab39fe1a66bbcb935c00125df8d00b0b14a680f93",
    "requirements": [
      "M13",
      "O09"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Partial, changed or denied reads remain incomplete within explicit budgets."
  },
  {
    "case_id": "R1-34-H03",
    "case_sha256": "b0732e8e38813867ecbe527639fe827c2ebe618e3efac916f067f6f3bfb50e7a",
    "requirements": [
      "O03",
      "O09"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Exact configuration scope, destination/TLS and safe output boundaries are enforced."
  },
  {
    "case_id": "R1-34-H04",
    "case_sha256": "3dfaed8c28fe2b7202d827b0fccc828ff2a4eaae3cc667f0e231eb92168ae94a",
    "requirements": [
      "M14",
      "O09"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Copied guide/recovery and no-effects checks preserve the read-only boundary."
  },
  {
    "case_id": "R1-35-H01",
    "case_sha256": "7ba944cb9abb614d8d1dcc5ccaaa619d88fc3d9ce8c09f24e5d10438467b1f64",
    "requirements": [
      "M08",
      "M09",
      "M10",
      "M11",
      "M14"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Fixed full reports prove typed repair order, parent revision, publication and false authority."
  },
  {
    "case_id": "R1-35-H02",
    "case_sha256": "248f91d47cb2bf8b77f96a79b11b3273b632a31990bd3ea36c5e4beb3c192a1f",
    "requirements": [
      "M14"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Copied fixed reports preserve zero effects and source/installed boundary."
  },
  {
    "case_id": "R1-37-D1",
    "case_sha256": "f5b868626ced1a416fb046b4d3b4c2232f827a048a9c0569ac3f009cc4f5f0cb",
    "requirements": [
      "M14"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Existing own repair uses the current observed source/target without new publication."
  },
  {
    "case_id": "R1-37-D2",
    "case_sha256": "8936790c95d293eac96ed195bce85f60ec7ba4debb02eccb31f3227efc96ac67",
    "requirements": [
      "M09",
      "M14"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Stale child QA holds a queued stack-update proposal."
  },
  {
    "case_id": "R1-37-D3",
    "case_sha256": "f39279c0f4dc1b1ccbee63350bfc61f3c3d4e6c4246701d83d391eab590b6bd3",
    "requirements": [
      "M09",
      "M14"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "New stack publication requires coherent current child QA."
  },
  {
    "case_id": "R1-37-D4",
    "case_sha256": "31f6fc65c208f8535e7e2039a7b1e86996815e3438e18a573e47f5c7d6b447c4",
    "requirements": [
      "M10",
      "M14"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Already published child request remains retained without duplicate publication."
  },
  {
    "case_id": "R1-37-D5",
    "case_sha256": "25d1863ddc6b3f56ba2cbb6dccd83f3721fd15f6e99feeb8d5af8b9066a0a53a",
    "requirements": [
      "M14"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Copied current-PR reports and immutable runtime maps preserve the same contract."
  },
  {
    "case_id": "R1-38-H01",
    "case_sha256": "c5d4f953d40ead865a238677239dd339dacfb29fc41c480db0b67a80e3547d3a",
    "requirements": [
      "M13",
      "O09"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Null description is retained while missing description remains invalid, without proof/admission."
  },
  {
    "case_id": "R1-38-H02",
    "case_sha256": "e9532ff9688ea97d0924175e68f4bcbf67ac759e35b8153bb8a4b53b6b1474d6",
    "requirements": [
      "M13",
      "O09"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Object member order is accepted but changed ADF array order is an incomplete observation."
  },
  {
    "case_id": "R1-39-H01",
    "case_sha256": "4b2f0216907d08117b9fb8c2dd5f4926ca805ab259b8ae8f98c7d26dbfc6b44c",
    "requirements": [
      "M09",
      "M10",
      "M11"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Canonical duplicate QA preserves the published request and incorporated-root coverage."
  },
  {
    "case_id": "R1-39-H02",
    "case_sha256": "51bc717228a0cf0d149ae52b02e4500e696b6ea17b68bd311c612b739d54592a",
    "requirements": [
      "M10",
      "M14"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Copied request/coverage controls retain nonexecuting fixed reports."
  },
  {
    "case_id": "R1-40-H01",
    "case_sha256": "e625f56a7634fcdb2064e403c6a4a54ca1abdbc95ee7db9c6988d81b5805f27e",
    "requirements": [
      "O09"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Duplicate exact comment targets fail before resolver/network/effects."
  },
  {
    "case_id": "R1-41-H01",
    "case_sha256": "3fa0f8c906e99851f99184ada897d23c2a2938789de34eaef89d7a0527a00236",
    "requirements": [],
    "disposition": "catalog_only_preservation",
    "rationale": "Catalog-only source/native preservation supports delivery accountability; it does not prove runtime selection or introduce a product requirement."
  },
  {
    "case_id": "R1-42-H01",
    "case_sha256": "de087beab674ac145fef77dc28eafed32ff3503e9cb1e440298ab7532fd6d825",
    "requirements": [
      "M13",
      "O09"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Caller target mutation cannot change acquired issue/comment identity."
  },
  {
    "case_id": "R1-42-H02",
    "case_sha256": "757a9ba5e51f8a42dafc1a72f9d35fb1f6958ec232b1ac21d303b5b4c946fe34",
    "requirements": [
      "O09"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Wire and private-byte budgets stop oversized observations."
  },
  {
    "case_id": "R1-42-H03",
    "case_sha256": "49dca9352e2f84c1befee518c683ff79aa5583333710f789cfd4af36c8200ccc",
    "requirements": [
      "O09"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Oversized provider JSON is RESPONSE_INVALID within the original bounds."
  },
  {
    "case_id": "R1-42-H04",
    "case_sha256": "28c5a525b4bd6f027eacae4e1fb31f9393ad93607d7f153e955627ad23502d0f",
    "requirements": [
      "O09"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Future/expired certificates fail TLS before HTTP observations."
  },
  {
    "case_id": "R1-12-H05",
    "case_sha256": "4e75fa6cec28030363d62c413ee989f1934ff521a70f0937b0f895fb043d55d7",
    "requirements": [
      "M13",
      "M14",
      "O03",
      "O09"
    ],
    "disposition": "existing_requirement_support",
    "rationale": "Complete profile/proof inputs bind offline-equivalent read-only decisions; mixed/changed inputs hold and hidden external changes remain unclaimed."
  }
];
// Dated81 checkpoint only: every byte assertion below reads the explicit historical capture.
async function assertHistorical81Checkpoint(){
 const p=JSON.parse(await read('docs/delivery/manager-r1/publication.json')),a=p.installed_repair_preview_amendment,metadata=JSON.parse(await historicalArtifactBytes('docs/delivery/manager-r1/plan-metadata.json')),drafts=JSON.parse(await historicalArtifactBytes('docs/delivery/manager-r1/ticket-drafts.json')),canonical=v=>hash(canonicalize(v)),history=a.historical_source_capture;
 assert.equal(canonical(history),installed81HistoryExpected.capture);assert.equal(history.files['publication.json'].object.installed_repair_preview_amendment,undefined);assert.equal(Object.keys(history.files['publication.json'].object).length,37);
 for(const name of Object.keys(pre81Digests))await pre81Capture(name);
 for(const [key,digest]of Object.entries(installed81HistoryExpected.amendments)){assert.equal(canonical(p[key]),digest,key+' unchanged complete historic amendment');assert.deepEqual(p[key],history.files['publication.json'].object[key]);}
 assert.equal(hash(p.source_inspection_catalog_integration_amendment),installed81HistoryExpected.catalog);
 for(const [key,digests]of Object.entries(installed81HistoryExpected.predecessors)){const c=history.predecessors[key];assert.equal(hash(c.raw),digests.raw);assert.deepEqual(JSON.parse(c.raw),c.object);assert.equal(hash(c.object),digests.json);assert.equal(canonical(c.object),digests.canonical);}
 const scale=100000n,toUnits=s=>{const [whole,fraction='']=String(s).split('.');assert(fraction.length<=5);return BigInt(whole)*scale+BigInt(fraction.padEnd(5,'0'));};let lower=0n,upper=0n;
 for(const expected of installed81ForecastExpected){const row=metadata.find(r=>r.id===expected.id);assert(row);assert.deepEqual(row.files,expected.files);assert.equal(new Set(row.files).size,row.files.length);assert.equal(toUnits(row.days),toUnits(expected.max));if(expected.hours)assert.deepEqual(row.hours,expected.hours);else assert.equal(row.hours,undefined);assert.equal(row.forecast_provenance.min_days,expected.min);assert.equal(row.forecast_provenance.max_days,expected.max);lower+=toUnits(expected.min);upper+=toUnits(expected.max);}
 assert.equal(metadata.length,42);assert.deepEqual([String(lower),String(upper)],['5833375','6476500']);assert.deepEqual(a.forecast.derivation,{scale:100000,integer_sums:{min_days:5833375,max_days:6476500},min_days:'58.33375',max_days:'64.765'});assert.deepEqual({min:Number(a.forecast.derivation.min_days),max:Number(a.forecast.derivation.max_days)},{min:58.33375,max:64.765});
 const delivery=await read('docs/delivery/manager-r1/README.md');assert(delivery.includes('Current scoped source-row forecast: **58.33375–64.76500 days**'));assert(delivery.includes('excludes the eight later Core Stories'));assert(delivery.includes('18 paths / 1.91 days / 15.28 hours'));assert(delivery.includes('48.26625')||JSON.stringify(history).includes('48.26625'));
 const human=new Map(drafts.flatMap(d=>d.contract.testing_strategy.human_review.cases.map(c=>[c.id,c])));assert.equal(human.size,166);
 for(const [file,expectedRows]of Object.entries(installed81CoverageExpected)){const text=await historicalArtifactBytes(file),rows=text.split('\n').filter(l=>/^\| [AWMO]\d{2}/.test(l)),ids=new Set(rows.flatMap(l=>l.split('|')[1].match(/[AWMO]\d{2}/g)??[]));assert.equal(ids.size,53);for(const expected of expectedRows){const matches=rows.filter(line=>{const actualIds=line.split('|')[1].match(/[AWMO]\d{2}/g)??[];return actualIds.length===expected.ids.length&&actualIds.every((id,index)=>id===expected.ids[index]);});assert.equal(matches.length,1,file+' exact baseline row '+expected.ids.join(', '));const actual=matches[0];assert.equal(actual.split('|').slice(1,-2).join('|'),expected.prefix);for(const ref of expected.references)assert(actual.includes(ref),file+' retained '+ref);}for(const match of text.matchAll(/R1-\d{2}-(?:H\d{2}|S\d{2}|C\d{2}|OC\d{2}|PC\d{2}|D\d)/g))assert(human.has(match[0]),match[0]);}
 const coverage=await historicalArtifactBytes('docs/delivery/manager-r1/coverage.md');assert.equal(new Set([...coverage.matchAll(/^\| S(\d{2}) \|/gm)].map(m=>m[1])).size,41);
 assert.deepEqual(a.case_requirement_dispositions,installed81RoutesExpected);
 const originalCases=new Set(history.files['ticket-drafts.json'].object.flatMap(d=>d.contract.testing_strategy.human_review.cases.map(c=>c.id))),added=[...human.keys()].filter(id=>!originalCases.has(id));assert.deepEqual([...added].sort(),a.case_requirement_dispositions.map(r=>r.case_id).sort());
 for(const route of a.case_requirement_dispositions){assert.equal(canonical(human.get(route.case_id)),route.case_sha256);assert(route.rationale);if(!route.requirements.length){assert.equal(route.case_id,'R1-41-H01');assert.equal(route.disposition,'catalog_only_preservation');}for(const file of ['docs/product/coverage.md','docs/delivery/manager-r1/coverage.md']){const rows=(await historicalArtifactBytes(file)).split('\n');for(const id of route.requirements)assert(rows.find(l=>l.startsWith('| '+id+' |')).includes(route.case_id));}}
 const bundle=JSON.parse(await historicalArtifactBytes('config/skill-bundle.json')),oldBundle=await pre81Capture('config/skill-bundle.json');assert.deepEqual(bundle.skills,oldBundle.skills);assert.equal(bundle.skills.length,22);assert.deepEqual(bundle.dependencyDirectories,oldBundle.dependencyDirectories);assert.equal(bundle.dependencyDirectories.length,3);assert.deepEqual(bundle.validatorPayload.sources,[...oldBundle.validatorPayload.sources,'test/fixtures/manager-repairs.json']);assert.equal(bundle.validatorPayload.sources.length,37);assert.deepEqual(a.payload_sources,bundle.validatorPayload.sources);
 assert.deepEqual(a.source_runtime_revision,installed81RuntimeExpected);const paths=bundle.validatorPayload.sources.filter(f=>f.endsWith('.mjs')||f.endsWith('.schema.json')||['package.json','package-lock.json'].includes(f)).sort();assert.equal(paths.length,25);assert.deepEqual(Object.keys(a.source_runtime_revision.artifacts_sha256),paths);
 for(const file of paths)assert.equal(hash(await historicalArtifactBytes(file)),installed81RuntimeExpected.artifacts_sha256[file],file+' actual unchanged runtime');assert.equal(installed81RuntimeExpected.revision_sha256,'sha256:'+canonical(installed81RuntimeExpected.artifacts_sha256));assert.equal(hash(await historicalArtifactBytes('test/fixtures/manager-repairs.json')),'26280bc8c5095b32fe1bd8279a060f7b6fdafec1b3fc442569c4916d1c1665a7');
 for(const file of bundle.validatorPayload.sources)assert.equal(hash(await historicalArtifactBytes(file)),a.payload_artifacts_sha256[file],file+' complete payload');assert.equal(hash(await historicalArtifactBytes('config/skill-bundle.json')),a.bundle_sha256);assert.equal(hash(await historicalArtifactBytes('scripts/install-cursor-skills.mjs')),a.installer_sha256);for(const [file,digest]of Object.entries(a.source_artifacts_sha256))assert.equal(hash(await historicalArtifactBytes(file)),digest);
 assert.equal(a.verification.activation_authorized,false);assert(a.verification.human_acceptance.includes('42 original81 NOT_RUN'));
}
test('PGB-81 current scoped forecast, preserved history and installed closure have independent bindings',assertHistorical81Checkpoint);


// Independent dated byte and current allocation/case expectations, captured before editing.
const catalogue169Expected = {
  "capture_sha256": "bb05c2d855eb26174aa695838a18b16b50a123f78c58ec9c91c47d42452bf517",
  "files": {
    "config/pigboss.example.yaml": "21e38dc635fcc894fb3882731d458bc8e5d67b3cccc396953dfb57ea6baaa949",
    "config/skill-bundle.json": "aa84523d0236fe00eeebe1fdcfafefd5669fd8c64754b666a9a15c07714c72bc",
    "contracts/config-v1.schema.json": "58a48a7e51bbee8c0dde0ffaaaed1479a531c2bbaa7919773931b43f355592b2",
    "contracts/epic-v1.schema.json": "d495ec3de052ac8daeb26bb3b43e55b839c889d232c692025ce02c0c5f5242ac",
    "contracts/handoff-v1.schema.json": "6ef02c5c8d297155520a14f890ac99cdfa5e160c95d5754c6127cd27f8f4e596",
    "contracts/ticket-v1.schema.json": "5b54d5e8c89a25f288cb1aaa032b67a0b85a3fa0eb31fcd1abcab53893839660",
    "contracts/work-pointer-v1.schema.json": "24dec200e48b2529bb6fc5931d513baaae2c74b72c497f4e2693dd3ede783242",
    "contracts/work-validation-context-v1.schema.json": "19931601db402fc13e7f4587997434d1c833c05b52219f94727286063b26af15",
    "docs/architecture/examples/manager-epic-populated.yaml": "015d8a1f97ef24a8eb78d8832256ba3d711f15675cacc005f40a8a315eccd62c",
    "docs/architecture/examples/manager-epic.yaml": "47da131cf06ddb68d042ec09113ab0132125a4454c46c7e72062219d3bbc4936",
    "docs/architecture/examples/manager-ticket-populated.yaml": "67684c400a6ebf50b2bb3b2db509d7b3c989dd2a89a713d56b3d91c088635338",
    "docs/architecture/examples/manager-ticket.yaml": "ce9a6532bee4a6a561957d62a0198de61e7da0342ef8128853cc11dba3200ff0",
    "docs/authoring.md": "792e7e28714a0e07dcffd011d3b628e1d1bfb14b4bde9e5e355de54ca7ce2c9d",
    "docs/configuration.md": "4daf03b46702cf35b9e7f64c5f45cb94b6c26703796171c5cb0f7481af23ccb9",
    "docs/delivery/manager-r1/coverage.md": "80a1a35bddc3d1ba71c8b047abaa98194e0e3d886a7be8cade91e4946876129e",
    "docs/delivery/manager-r1/plan-metadata.json": "e6f6e565292473e1e5060856778e265ebfe85368504f98669b94a95bcdbbb681",
    "docs/delivery/manager-r1/stories.md": "a4785e244bf34d6739b3a3622e33f075580c3ee56e5a41aa59c8dbe3c6406fa4",
    "docs/delivery/manager-r1/ticket-drafts.json": "cbfbe1b2363e67989eec0f3837547627e377b3104f043ef74119502824f0dd3f",
    "docs/handoffs.md": "08157ffd354999c44554040d44a73fccf31c86e1e37626131bc82e97562c17e4",
    "docs/manager-preview.md": "e81605c01a69ef69cb7710742d838852b163dca6266d1448fc1abb8446b0d707",
    "docs/product/coverage.md": "503ca2bb8d3ddba70a4a889cc55db0b93279dd6d6c9cc57a3284f6c0e95f812e",
    "lib/config/diff.mjs": "07233ae79e7dd39386b3a70c4ca5f137310ae44d4f79bf5ad2742eccff72102d",
    "lib/config/parse.mjs": "f5cf9845195725ada2761490f4b92ffad2de1c31ca979302d4066b7ef9c893b7",
    "lib/config/projects.mjs": "b6c67027e204ad7f5cbefbed5905b0da7c2eb5890ae515130d54ded5166436d5",
    "lib/contracts/case-graph.mjs": "9508880a82a7066348a3aa0a6d91ddfa42769e75fb03d869e7607f4f895c75d2",
    "lib/contracts/handoff.mjs": "eeeca554108af3744c439e84a0487a1dda1dd48a925cec76000de17715889c3f",
    "lib/contracts/receipts.mjs": "82bfee1c5a2174852ad1931fa872fe860ab9c170ba1f0af11bd9a3f96a54d9e7",
    "lib/contracts/work-semantics.mjs": "ba1a3acadba6d169ec3bad52a3689c9b4b78b713dbac9fe408b949b966f2cc8d",
    "lib/contracts/work.mjs": "50dbbd8a11237b1b90508a059a5ca9be44c4a39662e94ffbe39ab89db2808df4",
    "lib/manager/availability.mjs": "d31f127d719416e943f43b973aeba1eb7aa69f9c2c51807f0171514f47a7024e",
    "lib/manager/decisions.mjs": "adbd01534853836341ae9c45fd4deb28c21c6397bc3f007bc303b567c246536c",
    "lib/manager/repair-policy.mjs": "349f197f563794d3f9722605047f472f31aa1f16a8b97f1701d5aa9760b3b766",
    "lib/manager/snapshot.mjs": "40a851769b5b1261cd070db1a7f330846aeb93433dfca819c0a292184db5cb17",
    "package-lock.json": "25bf17a5f4a5a4ae917114cdbb66ebe3e743358cb19427d1337fa2549cc68373",
    "package.json": "ccd116a2865faf81720d2180e7379df5ecea76ebde8c9732a2cef64e3572a4c9",
    "scripts/check-config.mjs": "b883334a57bf2e2b0abe4d96c3bb07dd117359a95c7814b3cf4685a95c1dd75c",
    "scripts/install-cursor-skills.mjs": "2c0a249487888a6932a715ec69d2b84517c071f3ba4177c30490887e52b21814",
    "scripts/manager-preview.mjs": "ba79458f2855bedbc34291a80168e049698b5f1477342dab3c20a012773e13f4",
    "scripts/prepare-handoff.mjs": "5e47da76d68125fd66917af26a1256364501ac461ccd15bbac056c0e04e75eef",
    "scripts/validate-handoff.mjs": "bf5bf6bfb1dcc3b217154c916a99e18502862a56bec5d0438a84e64aafb67807",
    "scripts/validate-work.mjs": "46023df5916da4ab7d5eaa8c44fec19e8aef708eb3e5ab76343662ddde06776d",
    "test/fixtures/manager-candidates.json": "83d9fee49345eb078f9c9cb8ea1d2ddd962dd655e921bf9ae74f0e54042d71ca",
    "test/fixtures/manager-repairs.json": "26280bc8c5095b32fe1bd8279a060f7b6fdafec1b3fc442569c4916d1c1665a7"
  },
  "new_forecast_rows": [
    {
      "id": "PGB-169",
      "native_key": "PGB-169",
      "min_days": "0.84375",
      "max_days": "1.3125",
      "paths": [
        "docs/delivery/manager-r1/ticket-drafts.json",
        "docs/delivery/manager-r1/plan-metadata.json",
        "docs/delivery/manager-r1/publication.json",
        "docs/delivery/manager-r1/stories.md",
        "docs/delivery/manager-r1/README.md",
        "docs/delivery/manager-r1/coverage.md",
        "docs/product/README.md",
        "docs/product/coverage.md",
        "test/story-authoring.test.mjs",
        "test/qa-helper-contract.test.mjs",
        "test/cursor-environment.test.mjs"
      ],
      "path_count": 11,
      "min_hours": "6.75",
      "max_hours": "10.5",
      "provenance": "Approved role delivery allocation; PGB-159/PGB-169 split bound to native comment10942; later implementation plans remain provisional."
    },
    {
      "id": "PGB-159",
      "native_key": "PGB-159",
      "min_days": "1.4375",
      "max_days": "1.875",
      "paths": [
        "lib/contracts/work.mjs",
        "lib/contracts/work-semantics.mjs",
        "scripts/validate-work.mjs",
        "test/work-semantics.test.mjs",
        "test/fixtures/work-semantics.json",
        "test/cursor-environment.test.mjs",
        "docs/authoring.md",
        "skills/write-pr-sized-stories/references/pigboard-ticket.md",
        "docs/architecture/manager-work-contract.md"
      ],
      "path_count": 9,
      "min_hours": "11.5",
      "max_hours": "15",
      "provenance": "Approved role delivery allocation; PGB-159/PGB-169 split bound to native comment10942; later implementation plans remain provisional."
    },
    {
      "id": "PGB-160",
      "native_key": "PGB-160",
      "min_days": "1.4375",
      "max_days": "1.875",
      "paths": [
        "lib/contracts/receipts.mjs",
        "scripts/validate-handoff.mjs",
        "test/receipt-chain.test.mjs",
        "test/handoff.test.mjs",
        "test/fixtures/handoff-chains.json",
        "docs/handoffs.md",
        "docs/architecture/manager-handoff-contract.md",
        "test/cursor-environment.test.mjs"
      ],
      "path_count": 8,
      "min_hours": "11.5",
      "max_hours": "15",
      "provenance": "Approved role delivery allocation; PGB-159/PGB-169 split bound to native comment10942; later implementation plans remain provisional."
    },
    {
      "id": "PGB-161",
      "native_key": "PGB-161",
      "min_days": "1.3125",
      "max_days": "1.8125",
      "paths": [
        "lib/contracts/receipts.mjs",
        "scripts/validate-handoff.mjs",
        "test/receipt-chain.test.mjs",
        "test/handoff.test.mjs",
        "test/fixtures/handoff-chains.json",
        "test/cursor-environment.test.mjs",
        "docs/handoffs.md",
        "docs/install.md",
        "test/qa-helper-contract.test.mjs"
      ],
      "path_count": 9,
      "min_hours": "10.5",
      "max_hours": "14.5",
      "provenance": "Approved role delivery allocation; PGB-159/PGB-169 split bound to native comment10942; later implementation plans remain provisional."
    },
    {
      "id": "PGB-162",
      "native_key": "PGB-162",
      "min_days": "1.375",
      "max_days": "1.9375",
      "paths": [
        "lib/manager/snapshot.mjs",
        "lib/manager/decisions.mjs",
        "lib/manager/repair-policy.mjs",
        "scripts/manager-preview.mjs",
        "test/manager-preview.test.mjs",
        "test/repair-policy.test.mjs",
        "test/fixtures/manager-candidates.json",
        "test/fixtures/manager-repairs.json",
        "test/fixtures/manager-proof-conflicts.json",
        "scripts/install-cursor-skills.mjs",
        "docs/manager-preview.md",
        "ARCHITECTURE.md",
        "test/cursor-environment.test.mjs",
        "docs/install.md",
        "README.md"
      ],
      "path_count": 15,
      "min_hours": "11",
      "max_hours": "15.5",
      "provenance": "Approved role delivery allocation; PGB-159/PGB-169 split bound to native comment10942; later implementation plans remain provisional."
    },
    {
      "id": "PGB-163",
      "native_key": "PGB-163",
      "min_days": "1.375",
      "max_days": "1.875",
      "paths": [
        "lib/jira/receipts.mjs",
        "contracts/manager-live-input-v1.schema.json",
        "test/jira-receipts.test.mjs",
        "test/fixtures/jira-preview-harness.mjs",
        "test/fixtures/jira-preview-cases.json",
        "config/skill-bundle.json",
        "test/skill-distribution.test.mjs",
        "docs/handoffs.md",
        "README.md",
        "ARCHITECTURE.md",
        "lib/jira/read.mjs",
        "test/jira-read.test.mjs",
        "docs/manager-preview.md",
        "docs/configuration.md"
      ],
      "path_count": 14,
      "min_hours": "11",
      "max_hours": "15",
      "provenance": "Approved role delivery allocation; PGB-159/PGB-169 split bound to native comment10942; later implementation plans remain provisional."
    },
    {
      "id": "PGB-164",
      "native_key": "PGB-164",
      "min_days": "0.75",
      "max_days": "1.125",
      "paths": [
        "skills/implementer-entrypoint/SKILL.md",
        "skills/implementer-entrypoint/references/handoff.md",
        "skills/implementer-job/SKILL.md",
        "skills/implementer-jira/SKILL.md",
        "test/implementer-contract.test.mjs",
        "docs/using-pigboard.md",
        "README.md"
      ],
      "path_count": 7,
      "min_hours": "6",
      "max_hours": "9",
      "provenance": "Approved role delivery allocation; PGB-159/PGB-169 split bound to native comment10942; later implementation plans remain provisional."
    },
    {
      "id": "PGB-165",
      "native_key": "PGB-165",
      "min_days": "0.5625",
      "max_days": "0.875",
      "paths": [
        "skills/pigboard-pr-review/SKILL.md",
        "skills/pigboard-pr-review/references/jira-handoff.md",
        "skills/reviewer-jira/SKILL.md",
        "test/reviewer-contract.test.mjs",
        "docs/using-pigboard.md"
      ],
      "path_count": 5,
      "min_hours": "4.5",
      "max_hours": "7",
      "provenance": "Approved role delivery allocation; PGB-159/PGB-169 split bound to native comment10942; later implementation plans remain provisional."
    },
    {
      "id": "PGB-166",
      "native_key": "PGB-166",
      "min_days": "0.875",
      "max_days": "1.3125",
      "paths": [
        "skills/qa-entrypoint/SKILL.md",
        "skills/qa-entrypoint/references/execution-record.md",
        "skills/qa-jira/SKILL.md",
        "skills/request-rework/SKILL.md",
        "skills/request-rework/references/example.md",
        "test/request-rework.test.mjs",
        "test/fixtures/human-rework.mjs",
        "test/fixtures/qa-helper-case.mjs",
        "test/qa-helper-contract.test.mjs",
        "docs/using-pigboard.md",
        "README.md"
      ],
      "path_count": 11,
      "min_hours": "7",
      "max_hours": "10.5",
      "provenance": "Approved role delivery allocation; PGB-159/PGB-169 split bound to native comment10942; later implementation plans remain provisional."
    }
  ],
  "dispositions": [
    {
      "case_id": "PGB-159-H01",
      "case_sha256": "3795b1146fa62bfcada2d5c3adfaf76e45d421975b1de3c9f4fe491d2915b1a2",
      "requirements": [
        "A06",
        "A08",
        "A09",
        "A11",
        "A12"
      ],
      "scenario_support": [],
      "disposition": "existing_requirement_support",
      "rationale": "Complete mixed/allhuman scheduling declarations,futureartifactslots and strictstart distinction; not previewselection."
    },
    {
      "case_id": "PGB-159-H02",
      "case_sha256": "489fc90a4eacfac1bb4385c0fbc8f484f2fc477ee3e7c51fcc7191fda5e598aa",
      "requirements": [
        "A05",
        "A06",
        "A07",
        "A08",
        "A09",
        "A10",
        "A11",
        "A12"
      ],
      "scenario_support": [],
      "disposition": "existing_requirement_support",
      "rationale": "Namednegative declarationcontrols,scope,coverage,graph,ledger andpreparedconsumers; cataloguepart is preservation support."
    },
    {
      "case_id": "PGB-160-H01",
      "case_sha256": "94a79d83e8f929124b9c8d55053aa7c88d10ab32ca157ef9ebb214e46fca5b7e",
      "requirements": [
        "M07",
        "M10",
        "M11",
        "W12"
      ],
      "scenario_support": [],
      "disposition": "existing_requirement_support",
      "rationale": "Exactrecordedcompletion/history,allroots/parentsegments and truthfuluncheckedexternalfreshness; doesnotrunmanagerselection."
    },
    {
      "case_id": "PGB-160-H02",
      "case_sha256": "c099e3df73146046865b23436c0e20dc55abb9772e2af4676295045b1869c7fb",
      "requirements": [
        "M07",
        "M10",
        "M11",
        "W12",
        "A12"
      ],
      "scenario_support": [],
      "disposition": "existing_requirement_support",
      "rationale": "Rejectmismatchedmetadata/UUID/requirements/assignment/ancestry/cutoffs without fabricatedproof."
    },
    {
      "case_id": "PGB-161-H01",
      "case_sha256": "ec3fec66ff3f0fecb38f0630367578734cd1a9f4301b3c334c8263a48ae81365",
      "requirements": [
        "A09",
        "A11",
        "A12",
        "W03",
        "W04",
        "W05",
        "W06",
        "W10",
        "W12"
      ],
      "scenario_support": [],
      "disposition": "existing_requirement_support",
      "rationale": "CurrentREADY/review/QA/humanreworkproof,own/parentPR,preparedinputs andactualrights; checkercomposition notfullproduceracceptance."
    },
    {
      "case_id": "PGB-161-H02",
      "case_sha256": "b76f6f99e4ac4618ac494bed098849663e6e35ce3b7f82ce4e364c8eccb25d06",
      "requirements": [
        "A11",
        "A12",
        "W09",
        "W12",
        "O07"
      ],
      "scenario_support": [],
      "disposition": "existing_requirement_support",
      "rationale": "Assignment/inabilityshape,candidateversusreadback,unknownpublicationhold; noexecutionorcompletionfromassignment."
    },
    {
      "case_id": "PGB-162-H01",
      "case_sha256": "d310b21591c62a85976f68c7bbff89a8fba2de70aafbc215c910d5d5e2f1bba7",
      "requirements": [
        "M03",
        "M06",
        "M07",
        "M08",
        "M09",
        "M10",
        "M11",
        "M14",
        "O04"
      ],
      "scenario_support": [
        "S01",
        "S09",
        "S23",
        "S25",
        "S29"
      ],
      "disposition": "existing_requirement_support",
      "rationale": "Existingordinary/ownrepair/stack/rootfamilies andactual81v2export/copiedsmoke; these are relatedfamilysupport,original41casesremainrequired."
    },
    {
      "case_id": "PGB-162-H02",
      "case_sha256": "c34fe441830301e7fdd355ec6939542a0d7f0d1a2954742a506c948cf02bdf81",
      "requirements": [
        "M02",
        "M04",
        "M05",
        "M07",
        "M10",
        "M12",
        "M13",
        "M14",
        "O07"
      ],
      "scenario_support": [
        "S11",
        "S13",
        "S17",
        "S30",
        "S38",
        "S40",
        "S41"
      ],
      "disposition": "existing_requirement_support",
      "rationale": "Namedoccupancy/cap/pause/Epicconflict/changedproof/retaineduncertaintyholds. S41support is retaineduncertaintyonly,notliveintent/transitionexecution."
    },
    {
      "case_id": "PGB-163-H01",
      "case_sha256": "5ee7a86871810a2aca821f21aa15a91484c1993972ea143925a0e5d85427a596",
      "requirements": [
        "M07",
        "M13",
        "M14",
        "O03",
        "O05",
        "O08"
      ],
      "scenario_support": [],
      "disposition": "existing_requirement_support",
      "rationale": "Exactnativeproofandseparateoriginal-attemptnativehistory,sharedbounds,retainedidentity,zero writes; doesnotfinalizereconciliationorprovetransitionoutcome."
    },
    {
      "case_id": "PGB-163-H02",
      "case_sha256": "1b09c89ce69bde50e6dc9e4962708d315c570bbdb6caf961b1ddb6651884b49d",
      "requirements": [
        "M13",
        "O07",
        "O09"
      ],
      "scenario_support": [],
      "disposition": "existing_requirement_support",
      "rationale": "Missing/denied/budget/timeout/destination/secret/proofshapecontrols; proofacquisitionfailuresnotwholeinventoryscenarioexecution."
    },
    {
      "case_id": "PGB-164-H01",
      "case_sha256": "052c9528d14fcca7dd8c2f565477173d516d119290ae9c0fdcad392a102979ce",
      "requirements": [
        "W01",
        "W03",
        "W04",
        "W12",
        "A09",
        "A11"
      ],
      "scenario_support": [],
      "disposition": "existing_requirement_support",
      "rationale": "ExistingHigh\u2192review\u2192Mediumroute,declaredartifactpreparation,READYcandidate/readback andcurrentparentproof; simulatedinstructionevidence labelled."
    },
    {
      "case_id": "PGB-164-H02",
      "case_sha256": "e0bc2a03f15b4869331ab029807f4593e131c592cd75ba70d125d8959492c74c",
      "requirements": [
        "A11",
        "A12",
        "W09",
        "W12",
        "O07"
      ],
      "scenario_support": [],
      "disposition": "existing_requirement_support",
      "rationale": "Missingactionauthority/finalartifact/assignment anduncertainPR/publication/transitionholdwithoutreplay."
    },
    {
      "case_id": "PGB-165-H01",
      "case_sha256": "079c57b0c66fa477be8e0494a137a0b47ddc6fcfa5778cecd00d096db3dac126",
      "requirements": [
        "W01",
        "W03",
        "W05",
        "W12",
        "A11"
      ],
      "scenario_support": [],
      "disposition": "existing_requirement_support",
      "rationale": "Oneindependentreviewjob,currentPR/CI/approvals/preparedinputs andclean/findingpublication."
    },
    {
      "case_id": "PGB-165-H02",
      "case_sha256": "5cdfca261c4b4a68299f4b29e50f449b8ecfbba7f00e1f25f0151bc36d5760b6",
      "requirements": [
        "A11",
        "A12",
        "W05",
        "W09",
        "W12",
        "O07"
      ],
      "scenario_support": [],
      "disposition": "existing_requirement_support",
      "rationale": "Stale/missingcurrentproof,unsupportedcapability anduncertainpublicationstoptruthfullywithoutduplicatejob."
    },
    {
      "case_id": "PGB-166-H01",
      "case_sha256": "a1973fb1e1e158c63c408b902d18a50bfba0ec609bd8942276aed0ce4ebe7d56",
      "requirements": [
        "A07",
        "A08",
        "W06",
        "W07",
        "W11",
        "W12"
      ],
      "scenario_support": [],
      "disposition": "existing_requirement_support",
      "rationale": "Prescribedmixedhelperparent/childorder,fullledger,FAIL/NOT_RUN/humanpending andallhumanseparation."
    },
    {
      "case_id": "PGB-166-H02",
      "case_sha256": "791583de00758a696b972ab165226e39f4c9af6b5a7b8053b56ea2f113dcedc2",
      "requirements": [
        "A09",
        "A11",
        "A12",
        "W06",
        "W08",
        "W09",
        "W12",
        "O07"
      ],
      "scenario_support": [],
      "disposition": "existing_requirement_support",
      "rationale": "Missingpreparedartifact/environment/access,unsafe/changed/deadline/unknownoutcomes preservepartialledger andstopdependentactions."
    },
    {
      "case_id": "PGB-166-H03",
      "case_sha256": "a79f12a480a3fd3ce9ee89def86062fb6959ac2d3b497657197f79ebcd9c74cd",
      "requirements": [
        "W09",
        "W10",
        "W12",
        "O07"
      ],
      "scenario_support": [
        "S19"
      ],
      "disposition": "existing_requirement_support",
      "rationale": "Authorizedsame-open-PRhumanrecord-and-queueproducer only. ThisdoesnotproveS19'sseparateactiveworker/managerconcurrencybehavior."
    },
    {
      "case_id": "PGB-169-H01",
      "case_sha256": "eee6d7e5688636e34b85b82766515043cd8f8e50febb4a3482737c424c4a2690",
      "requirements": [],
      "scenario_support": [],
      "disposition": "catalog_only_preservation",
      "rationale": "`catalog_only_preservation`: completeapprovedcontracts/cases/dependencies/coverage/forecasts; administrativeevidenceintegrityisnotanewproductruntimeclaim."
    },
    {
      "case_id": "PGB-169-H02",
      "case_sha256": "68a3dea2554a85ea9a7cfef725d6ada2c5dd48774912c8c8588497385aede8ec",
      "requirements": [
        "O04"
      ],
      "scenario_support": [],
      "disposition": "existing_requirement_support",
      "rationale": "`existing_requirement_support`: exactlocalcurrentpinnedpayload/manifest/sourcecopyintegrity andstrictcontrols. DoesnotclaimwholeBuildorfinalinstalledloopacceptance."
    }
  ]
};
function assertHistoricalCapture(capture,expected) {
 assert.equal(hash(canonicalize(capture)),expected.capture_sha256,'complete43-entry historical capture');
 assert.deepEqual(Object.keys(capture).sort(),Object.keys(expected.files).sort());
 for(const [file,original]of Object.entries(expected.files)) {
  const entry=capture[file];assert.equal(entry.representation,'utf8_source_file');
  assert.equal(hash(entry.utf8),original,file+' exact historical bytes');assert.equal(entry.sha256,original,file+' independently expected SHA');
 }
}
let historical169Capture;
async function historicalArtifactBytes(file) {
 if(!historical169Capture) {
  const p=JSON.parse(await read('docs/delivery/manager-r1/publication.json'));
  historical169Capture=p.approved_delivery_catalogue_amendment.historical_file_bytes;
  assertHistoricalCapture(historical169Capture,catalogue169Expected);
 }
 assert(Object.hasOwn(historical169Capture,file),file+' explicitly retained historical file');
 return historical169Capture[file].utf8;
}
async function assertCurrentCatalogueCoverage() {
 const p=JSON.parse(await read('docs/delivery/manager-r1/publication.json')),a=p.approved_delivery_catalogue_amendment,metadata=JSON.parse(await read('docs/delivery/manager-r1/plan-metadata.json')),drafts=JSON.parse(await read('docs/delivery/manager-r1/ticket-drafts.json'));
 assertHistoricalCapture(a.historical_file_bytes,catalogue169Expected);
 const tampered=structuredClone(a.historical_file_bytes);tampered['lib/contracts/work.mjs'].utf8+='\nchanged historical byte';
 assert.throws(()=>assertHistoricalCapture(tampered,catalogue169Expected),/complete43-entry historical capture/);
 assert.equal(hash(canonicalize(p.installed_repair_preview_amendment)),'14f9022022778fdb23afe24f2fddd28f574f05768f8cd2027d70e53073e6c53e');
 assert.equal(metadata.length,51);assert.equal(drafts.length,51);
 const priorMetadata=JSON.parse(await historicalArtifactBytes('docs/delivery/manager-r1/plan-metadata.json')),integration=assert147IntegrationBindings(p),expectedCurrent=structuredClone(priorMetadata);expectedCurrent[expectedCurrent.findIndex(r=>r.id==='R1-33')]=structuredClone(integration.actual147.r1_33_metadata);
 assert.deepEqual(metadata.filter(r=>r.id.startsWith('R1-')),expectedCurrent,'only exact actual147 R1-33 replaces original42 metadata');
 const approvedMetadata=metadata.map(r=>r.id==='R1-33'?priorMetadata.find(old=>old.id==='R1-33'):r);
 const project=m=>({id:m.id,native_key:p.stories[m.id],min_days:m.forecast_provenance.min_days,max_days:m.forecast_provenance.max_days,paths:m.files,path_count:m.files.length,...(m.hours?{min_hours:String(m.hours.min),max_hours:String(m.hours.max)}:{}),...(m.forecast_provenance.provenance===undefined?{}:{provenance:m.forecast_provenance.provenance})}),rows=approvedMetadata.map(project),currentRows=metadata.map(project);
 assert.deepEqual(rows.filter(r=>r.id.startsWith('PGB-')),catalogue169Expected.new_forecast_rows,'nine independently expected complete allocations');
 assert.deepEqual(a.forecast.rows,JSON.parse(JSON.stringify(rows)));
 const units=value=>{const [whole,fraction='']=String(value).split('.');assert(fraction.length<=5);return BigInt(whole)*100000n+BigInt(fraction.padEnd(5,'0'));};let lower=0n,upper=0n;
 for(const r of rows){lower+=units(r.min_days);upper+=units(r.max_days);assert.equal(new Set(r.paths).size,r.path_count);assert(r.path_count<=20);if(r.min_hours){assert.equal(units(r.min_days)*8n,units(r.min_hours));assert.equal(units(r.max_days)*8n,units(r.max_hours));assert(Number(r.max_hours)<16);}}
 assert.deepEqual([String(lower),String(upper)],['6830250','7876500']);
 assert.deepEqual(a.forecast.derivation,{scale:100000,integer_sums:{min_days:6830250,max_days:7876500},min_days:'68.3025',max_days:'78.765'});assert.deepEqual(p.current_source_scope.forecast_days,{min:68.5275,max:79.13375});
 assert.deepEqual(integration.current_forecast.rows,currentRows);assert.equal(canonical147(integration.current_forecast),integration147Expected.current_forecast_canonical_sha256);let currentLower=0n,currentUpper=0n;for(const r of currentRows){currentLower+=units(r.min_days);currentUpper+=units(r.max_days);}assert.deepEqual([String(currentLower),String(currentUpper)],['6852750','7913375']);assert.deepEqual(integration.current_forecast.derivation,{scale:100000,integer_sums:{min_days:6852750,max_days:7913375},min_days:'68.5275',max_days:'79.13375'});
 assert.deepEqual(a.reviewed_allocation.catalogue.hours,[6.75,10.5]);assert.equal(a.reviewed_allocation.catalogue.paths.length,11);assert.deepEqual(a.reviewed_allocation.catalogue.paths,metadata.find(r=>r.id==='PGB-169').files);
 assert.deepEqual(a.reviewed_allocation.residual159.hours,[11.5,15]);assert.equal(a.reviewed_allocation.residual159.paths.length,9);assert.deepEqual(a.reviewed_allocation.residual159.paths,metadata.find(r=>r.id==='PGB-159').files);assert.deepEqual(a.reviewed_allocation.combined_hours,[18.25,25.5]);assert.equal(new Set([...a.reviewed_allocation.catalogue.paths,...a.reviewed_allocation.residual159.paths]).size,19);assert.equal(a.reviewed_allocation.change_incidences,20);
 const human=new Map(drafts.flatMap(r=>r.contract.testing_strategy.human_review.cases.map(c=>[c.id,c])));assert.equal(human.size,185);assert(drafts.every(r=>r.contract.testing_strategy.cases.length===0));
 assert.deepEqual(a.case_dispositions,catalogue169Expected.dispositions);
 const known=new Set(human.keys()),empty=[];
 for(const route of [...p.installed_repair_preview_amendment.case_requirement_dispositions,...a.case_dispositions]) {
  assert.equal(hash(canonicalize(human.get(route.case_id))),route.case_sha256,route.case_id+' full current object');
  assert(route.rationale);if(!route.requirements.length){empty.push(route.case_id);assert.equal(route.disposition,'catalog_only_preservation');}
 }
 assert.deepEqual(empty.sort(),['PGB-169-H01','R1-41-H01']);
 for(const [file,expectedRows]of Object.entries(installed81CoverageExpected)) {
  const text=await read(file),lines=text.split('\n'),rows=lines.filter(l=>/^\| [AWMO]\d{2}/.test(l)),ids=new Set(rows.flatMap(l=>l.split('|')[1].match(/[AWMO]\d{2}/g)??[]));assert.equal(ids.size,53);
  for(const expected of expectedRows){const matches=rows.filter(line=>{const ids=line.split('|')[1].match(/[AWMO]\d{2}/g)??[];return ids.length===expected.ids.length&&ids.every((id,i)=>id===expected.ids[i]);});assert.equal(matches.length,1,file+' exact requirement row');assert.equal(matches[0].split('|').slice(1,-2).join('|'),expected.prefix);for(const ref of expected.references)assert(matches[0].includes(ref),file+' retains '+ref);}
  for(const ref of text.matchAll(/(?:R1-\d{2}|PGB-\d+)-(?:H\d{2}|S\d{2}|C\d{2}|OC\d{2}|PC\d{2}|D\d)/g))assert(known.has(ref[0]),file+' unknown case '+ref[0]);
  const dispositionRows=lines.filter(l=>/^\| PGB-(?:159|160|161|162|163|164|165|166|169)-H\d{2} \|/.test(l)&&l.split('|').length===7);assert.equal(dispositionRows.length,19,file+' complete disposition table');
  for(const route of a.case_dispositions){const line=dispositionRows.find(l=>l.startsWith('| '+route.case_id+' |'));assert(line);const fields=line.split('|').slice(1,-1).map(s=>s.trim());assert.deepEqual(fields.slice(0,4),[route.case_id,route.requirements.join(', ')||'none',route.scenario_support.join(', ')||'none',route.disposition]);for(const id of route.requirements)assert(rows.find(l=>l.startsWith('| '+id+' |')).includes(route.case_id));}
  assert(text.includes('51 Stories'));assert(text.includes('185 full human cases'));assert(text.includes('68.3025–78.765'));
 }
 const historicalCoverage=await historicalArtifactBytes('docs/delivery/manager-r1/coverage.md'),currentCoverage=await read('docs/delivery/manager-r1/coverage.md'),scenarioRows=text=>text.split('\n').filter(l=>/^\| S\d{2} \|/.test(l));assert.equal(scenarioRows(currentCoverage).length,41);assert.deepEqual(scenarioRows(currentCoverage),scenarioRows(historicalCoverage),'all41 original scenario rows unchanged');
 const delivery=await read('docs/delivery/manager-r1/README.md'),product=await read('docs/product/README.md');for(const text of [delivery,product]){assert(text.includes('68.3025–78.765'));assert(text.includes('6.75–10.5'));assert(text.includes('11.5–15'));assert(text.includes('NOT_RUN'));}assert(delivery.includes('original 43-entry historical byte closure'));assert(delivery.includes('six additional147 bodies'));assert(delivery.includes('68.5275–79.13375'));assert(delivery.includes('9.75–15.25'));assert(delivery.includes('actual PR footprint is 19 paths'));assert(delivery.includes('eighth semantic smoke'));assert.equal(a.verification.activation_authorized,false);
}
test('PGB-169 current catalogue coverage and forecast retain historical evidence',assertCurrentCatalogueCoverage);

// Exact pre-PGB-147 snapshot: four complete JSON objects and two changed text inputs.
const pre147Digests={"publication.json": ["f0a3a38292404fa1d180cfe2ae791f41bef8b5fca84c0e20b4c6737462042a31", "870f438e41a5acb8f4fcd9e087952dea8ea25d6dc7a0b2b636d42575ff4e8710"], "plan-metadata.json": ["e6f6e565292473e1e5060856778e265ebfe85368504f98669b94a95bcdbbb681", "32fb888754fbad25b9c44575fb42d49247fd07c7c8778cd821a417640c7fdc03"], "ticket-drafts.json": ["cbfbe1b2363e67989eec0f3837547627e377b3104f043ef74119502824f0dd3f", "51d888ce1ae1e046b29298d46594bd3fb9216ad7770ac48dfaeb91363a8fd4c3"], "config/skill-bundle.json": ["aa84523d0236fe00eeebe1fdcfafefd5669fd8c64754b666a9a15c07714c72bc", "3c032b634a068017464c7b2b9e2b0b83059678a76cc18a1099a2d18da772632b"], "docs/delivery/manager-r1/README.md": ["8360bb12066e95e230632716eeb1f8c724ab46a4c0e3b8fac84cdc003f3b27f6", null], "docs/manager-preview.md": ["e81605c01a69ef69cb7710742d838852b163dca6266d1448fc1abb8446b0d707", null]};
async function pre147Capture(name){
 assert(Object.hasOwn(pre147Digests,name),'Only six named PGB-81 predecessor inputs may be captured');
 const p=JSON.parse(await read('docs/delivery/manager-r1/publication.json')),c=p.installed_issue_inspection_amendment.historical_source_capture.files[name],[rawDigest,jsonDigest]=pre147Digests[name];
 const sha=value=>createHash('sha256').update(value).digest('hex');
 assert.equal(sha(c.raw),rawDigest,name+' original raw bytes');
 assert.equal(c.raw_sha256,rawDigest,name+' named raw digest');
 if(jsonDigest){assert.deepEqual(JSON.parse(c.raw),c.object,name+' complete raw/object identity');assert.equal(sha(JSON.stringify(c.object)),jsonDigest,name+' original JSON digest');assert.equal(c.json_stringify_sha256,jsonDigest,name+' named JSON digest');return structuredClone(c.object);}
 assert.equal(c.object,undefined,name+' text has no parsed object');return c.raw;
}


// Exact actual147 projection. Only these dated assertions use retained bytes.
const integration147Expected = {
  "original_candidate": "7e8a14dce62cfb89ff963c5ec52f60ec3c8a2d61",
  "actual147": "af9735fac9612d711a4194191852fb031e51b797",
  "actual147_tree": "268b760daed22d5be234845659542ab51c8f42c6",
  "publication_canonical_sha256": "41ffe768590c2a9180c24b4611cba5e4f5bca1c7a6fe2970a50022e7aa6f2382",
  "metadata_canonical_sha256": "0ea832d345c347f29f9b9dfd672612fb827cfe27430cd7422d613d9ce8d07e3a",
  "amendment_canonical_sha256": "f9469ec8c8f5b639ee58440092c62e4c406c6590382b58e43bd40472b47a656a",
  "row_canonical_sha256": "17e76f93512a81b31d72eafce517bfcc5334411369842776aff998ef18a70f60",
  "files_canonical_sha256": "23c89cb9356aa2d3cd14ea9ae19ee304d1d7b694961a3520a489916be7c6beb5",
  "file_sha256": {
    "config/skill-bundle.json": "3063c9117d1e1724fb0341c7b610cf1b9518c77f585161ae95c4a1ab86efec99",
    "docs/manager-preview.md": "2dd6b2738ba3758337d23733128997a3fe6959462ca222ceb00b728577e8d339",
    "lib/jira/read.mjs": "13e35c3e319f1a29f7b664a4503693dfd48590961435909f718efbcec37ab0a5",
    "test/fixtures/jira-preview-harness.mjs": "c81b81789f3ecdcc801f7cdf8efde31d3d168e93d703fe2bbb3c57ceb5d0ab22",
    "test/fixtures/jira-preview-cases.json": "dc88760cd897cfb997d6def8e50c59598ff133a5c19fe3fdd4a55dbcc1ff341e",
    "test/fixtures/jira-preview-tls.json": "264fa815a82ab6c8b9ff2433b9113070130460c8ace7bfd8f6429116a4f33762"
  },
  "payload_sources": [
    "package.json",
    "package-lock.json",
    "scripts/validate-work.mjs",
    "lib/contracts/work.mjs",
    "contracts/epic-v1.schema.json",
    "contracts/ticket-v1.schema.json",
    "docs/authoring.md",
    "docs/architecture/examples/manager-epic.yaml",
    "docs/architecture/examples/manager-epic-populated.yaml",
    "docs/architecture/examples/manager-ticket.yaml",
    "docs/architecture/examples/manager-ticket-populated.yaml",
    "lib/contracts/work-semantics.mjs",
    "lib/contracts/case-graph.mjs",
    "contracts/work-validation-context-v1.schema.json",
    "config/skill-bundle.json",
    "contracts/handoff-v1.schema.json",
    "contracts/work-pointer-v1.schema.json",
    "lib/contracts/handoff.mjs",
    "lib/contracts/receipts.mjs",
    "scripts/validate-handoff.mjs",
    "docs/handoffs.md",
    "scripts/check-config.mjs",
    "lib/config/parse.mjs",
    "lib/config/projects.mjs",
    "lib/config/diff.mjs",
    "contracts/config-v1.schema.json",
    "config/pigboss.example.yaml",
    "docs/configuration.md",
    "scripts/prepare-handoff.mjs",
    "lib/manager/snapshot.mjs",
    "lib/manager/availability.mjs",
    "lib/manager/decisions.mjs",
    "lib/manager/repair-policy.mjs",
    "scripts/manager-preview.mjs",
    "docs/manager-preview.md",
    "test/fixtures/manager-candidates.json",
    "test/fixtures/manager-repairs.json",
    "lib/jira/read.mjs",
    "test/fixtures/jira-preview-harness.mjs",
    "test/fixtures/jira-preview-cases.json",
    "test/fixtures/jira-preview-tls.json"
  ],
  "payload_sha256": {
    "package.json": "ccd116a2865faf81720d2180e7379df5ecea76ebde8c9732a2cef64e3572a4c9",
    "package-lock.json": "25bf17a5f4a5a4ae917114cdbb66ebe3e743358cb19427d1337fa2549cc68373",
    "scripts/validate-work.mjs": "46023df5916da4ab7d5eaa8c44fec19e8aef708eb3e5ab76343662ddde06776d",
    "lib/contracts/work.mjs": "50dbbd8a11237b1b90508a059a5ca9be44c4a39662e94ffbe39ab89db2808df4",
    "contracts/epic-v1.schema.json": "d495ec3de052ac8daeb26bb3b43e55b839c889d232c692025ce02c0c5f5242ac",
    "contracts/ticket-v1.schema.json": "5b54d5e8c89a25f288cb1aaa032b67a0b85a3fa0eb31fcd1abcab53893839660",
    "docs/authoring.md": "792e7e28714a0e07dcffd011d3b628e1d1bfb14b4bde9e5e355de54ca7ce2c9d",
    "docs/architecture/examples/manager-epic.yaml": "47da131cf06ddb68d042ec09113ab0132125a4454c46c7e72062219d3bbc4936",
    "docs/architecture/examples/manager-epic-populated.yaml": "015d8a1f97ef24a8eb78d8832256ba3d711f15675cacc005f40a8a315eccd62c",
    "docs/architecture/examples/manager-ticket.yaml": "ce9a6532bee4a6a561957d62a0198de61e7da0342ef8128853cc11dba3200ff0",
    "docs/architecture/examples/manager-ticket-populated.yaml": "67684c400a6ebf50b2bb3b2db509d7b3c989dd2a89a713d56b3d91c088635338",
    "lib/contracts/work-semantics.mjs": "ba1a3acadba6d169ec3bad52a3689c9b4b78b713dbac9fe408b949b966f2cc8d",
    "lib/contracts/case-graph.mjs": "9508880a82a7066348a3aa0a6d91ddfa42769e75fb03d869e7607f4f895c75d2",
    "contracts/work-validation-context-v1.schema.json": "19931601db402fc13e7f4587997434d1c833c05b52219f94727286063b26af15",
    "config/skill-bundle.json": "3063c9117d1e1724fb0341c7b610cf1b9518c77f585161ae95c4a1ab86efec99",
    "contracts/handoff-v1.schema.json": "6ef02c5c8d297155520a14f890ac99cdfa5e160c95d5754c6127cd27f8f4e596",
    "contracts/work-pointer-v1.schema.json": "24dec200e48b2529bb6fc5931d513baaae2c74b72c497f4e2693dd3ede783242",
    "lib/contracts/handoff.mjs": "eeeca554108af3744c439e84a0487a1dda1dd48a925cec76000de17715889c3f",
    "lib/contracts/receipts.mjs": "82bfee1c5a2174852ad1931fa872fe860ab9c170ba1f0af11bd9a3f96a54d9e7",
    "scripts/validate-handoff.mjs": "bf5bf6bfb1dcc3b217154c916a99e18502862a56bec5d0438a84e64aafb67807",
    "docs/handoffs.md": "08157ffd354999c44554040d44a73fccf31c86e1e37626131bc82e97562c17e4",
    "scripts/check-config.mjs": "b883334a57bf2e2b0abe4d96c3bb07dd117359a95c7814b3cf4685a95c1dd75c",
    "lib/config/parse.mjs": "f5cf9845195725ada2761490f4b92ffad2de1c31ca979302d4066b7ef9c893b7",
    "lib/config/projects.mjs": "b6c67027e204ad7f5cbefbed5905b0da7c2eb5890ae515130d54ded5166436d5",
    "lib/config/diff.mjs": "07233ae79e7dd39386b3a70c4ca5f137310ae44d4f79bf5ad2742eccff72102d",
    "contracts/config-v1.schema.json": "58a48a7e51bbee8c0dde0ffaaaed1479a531c2bbaa7919773931b43f355592b2",
    "config/pigboss.example.yaml": "21e38dc635fcc894fb3882731d458bc8e5d67b3cccc396953dfb57ea6baaa949",
    "docs/configuration.md": "4daf03b46702cf35b9e7f64c5f45cb94b6c26703796171c5cb0f7481af23ccb9",
    "scripts/prepare-handoff.mjs": "5e47da76d68125fd66917af26a1256364501ac461ccd15bbac056c0e04e75eef",
    "lib/manager/snapshot.mjs": "40a851769b5b1261cd070db1a7f330846aeb93433dfca819c0a292184db5cb17",
    "lib/manager/availability.mjs": "d31f127d719416e943f43b973aeba1eb7aa69f9c2c51807f0171514f47a7024e",
    "lib/manager/decisions.mjs": "adbd01534853836341ae9c45fd4deb28c21c6397bc3f007bc303b567c246536c",
    "lib/manager/repair-policy.mjs": "349f197f563794d3f9722605047f472f31aa1f16a8b97f1701d5aa9760b3b766",
    "scripts/manager-preview.mjs": "ba79458f2855bedbc34291a80168e049698b5f1477342dab3c20a012773e13f4",
    "docs/manager-preview.md": "2dd6b2738ba3758337d23733128997a3fe6959462ca222ceb00b728577e8d339",
    "test/fixtures/manager-candidates.json": "83d9fee49345eb078f9c9cb8ea1d2ddd962dd655e921bf9ae74f0e54042d71ca",
    "test/fixtures/manager-repairs.json": "26280bc8c5095b32fe1bd8279a060f7b6fdafec1b3fc442569c4916d1c1665a7",
    "lib/jira/read.mjs": "13e35c3e319f1a29f7b664a4503693dfd48590961435909f718efbcec37ab0a5",
    "test/fixtures/jira-preview-harness.mjs": "c81b81789f3ecdcc801f7cdf8efde31d3d168e93d703fe2bbb3c57ceb5d0ab22",
    "test/fixtures/jira-preview-cases.json": "dc88760cd897cfb997d6def8e50c59598ff133a5c19fe3fdd4a55dbcc1ff341e",
    "test/fixtures/jira-preview-tls.json": "264fa815a82ab6c8b9ff2433b9113070130460c8ace7bfd8f6429116a4f33762"
  },
  "runtime_paths": [
    "contracts/config-v1.schema.json",
    "contracts/epic-v1.schema.json",
    "contracts/handoff-v1.schema.json",
    "contracts/ticket-v1.schema.json",
    "contracts/work-pointer-v1.schema.json",
    "contracts/work-validation-context-v1.schema.json",
    "lib/config/diff.mjs",
    "lib/config/parse.mjs",
    "lib/config/projects.mjs",
    "lib/contracts/case-graph.mjs",
    "lib/contracts/handoff.mjs",
    "lib/contracts/receipts.mjs",
    "lib/contracts/work-semantics.mjs",
    "lib/contracts/work.mjs",
    "lib/jira/read.mjs",
    "lib/manager/availability.mjs",
    "lib/manager/decisions.mjs",
    "lib/manager/repair-policy.mjs",
    "lib/manager/snapshot.mjs",
    "package-lock.json",
    "package.json",
    "scripts/check-config.mjs",
    "scripts/manager-preview.mjs",
    "scripts/prepare-handoff.mjs",
    "scripts/validate-handoff.mjs",
    "scripts/validate-work.mjs",
    "test/fixtures/jira-preview-harness.mjs"
  ],
  "current_forecast_canonical_sha256": "2da529ade802d35c33435c3c69221fcb1b8270404abc710e5dcfa14c334c8d1c"
};
const hash147=value=>createHash('sha256').update(value).digest('hex');
const canonical147=value=>hash147(canonicalize(value));
let retained147Source;
async function read147Source(){if(!retained147Source)retained147Source=JSON.parse(await readFile(new URL('../docs/delivery/manager-r1/publication.json',import.meta.url),'utf8'));return retained147Source;}
function assert147IntegrationBindings(p){
 const a=p.installed_issue_inspection_amendment,i=p.approved_delivery_catalogue_amendment.parent_integration;
 assert.equal(canonical147(a),integration147Expected.amendment_canonical_sha256,'complete immutable actual147 amendment');
 assert.equal(i.actual147.commit,integration147Expected.actual147);assert.equal(i.actual147.tree,integration147Expected.actual147_tree);
 assert.equal(i.actual147.publication_canonical_sha256,integration147Expected.publication_canonical_sha256);assert.equal(i.actual147.metadata_canonical_sha256,integration147Expected.metadata_canonical_sha256);
 assert.equal(canonical147(i.actual147.r1_33_metadata),integration147Expected.row_canonical_sha256);assert.equal(i.actual147.r1_33_metadata_canonical_sha256,integration147Expected.row_canonical_sha256);
 assert.equal(canonical147(i.historical_file_bytes),integration147Expected.files_canonical_sha256,'exact six additional actual147 bodies');assert.equal(i.historical_file_bytes_canonical_sha256,integration147Expected.files_canonical_sha256);
 assert.deepEqual(Object.keys(i.historical_file_bytes).sort(),Object.keys(integration147Expected.file_sha256).sort());
 for(const [file,digest]of Object.entries(integration147Expected.file_sha256)){const entry=i.historical_file_bytes[file];assert.equal(entry.representation,'utf8_source_file');assert.equal(hash147(entry.utf8),digest,file+' direct Git147 bytes');assert.equal(entry.sha256,digest);}
 return i;
}
async function historical147File(file){
 const p=await read147Source(),i=assert147IntegrationBindings(p);assert(integration147Expected.payload_sources.includes(file),file+' explicitly dated147 payload');
 const entry=i.historical_file_bytes[file]??p.approved_delivery_catalogue_amendment.historical_file_bytes[file];assert(entry,file+' retained body');assert.equal(hash147(entry.utf8),integration147Expected.payload_sha256[file],file+' complete dated147 payload');return entry.utf8;
}
async function historical147Publication(){
 const p=await read147Source(),i=assert147IntegrationBindings(p),prior=await pre147Capture('publication.json'),result=structuredClone(prior);
 result.installed_issue_inspection_amendment=structuredClone(p.installed_issue_inspection_amendment);result.status=i.actual147.status;result.current_source_scope=structuredClone(i.actual147.current_source_scope);
 assert.equal(canonical147(result),integration147Expected.publication_canonical_sha256,'entire reconstructed actual147 publication');return result;
}
async function historical147Metadata(){
 const p=await read147Source(),i=assert147IntegrationBindings(p),rows=await pre147Capture('plan-metadata.json');const index=rows.findIndex(r=>r.id==='R1-33');assert(index>=0);rows[index]=structuredClone(i.actual147.r1_33_metadata);
 assert.equal(canonical147(rows),integration147Expected.metadata_canonical_sha256,'entire reconstructed actual147 metadata');return rows;
}
async function assertHistorical147PayloadClosure(){
 const p=await read147Source(),i=assert147IntegrationBindings(p),a=p.installed_issue_inspection_amendment;
 assert.equal(canonical147(p.approved_delivery_catalogue_amendment.historical_file_bytes),'bb05c2d855eb26174aa695838a18b16b50a123f78c58ec9c91c47d42452bf517');
 assert.equal(Object.keys(p.approved_delivery_catalogue_amendment.historical_file_bytes).length,43);
 assert.deepEqual(a.payload.sources,integration147Expected.payload_sources);assert.equal(a.payload.sources.length,41);
 for(const file of a.payload.sources)assert.equal(hash147(await historical147File(file)),a.payload.artifacts_sha256[file]);
 assert.deepEqual(a.runtime.paths,integration147Expected.runtime_paths);assert.equal(a.runtime.paths.length,27);
 for(const file of a.runtime.paths)assert.equal(hash147(await historical147File(file)),a.runtime.artifacts_sha256[file]);
 assert.equal(a.runtime.artifacts_json_sha256,hash147(JSON.stringify(a.runtime.artifacts_sha256)));
}

// Unchanged147 assertions evaluated against its exact independently pinned dated view.
test('PGB-147 current installed payload and forecast preserve complete PGB-81 history',async()=>{
 for(const name of Object.keys(pre147Digests))await pre147Capture(name);
 const p=await historical147Publication(),prior=await pre147Capture('publication.json'),a=p.installed_issue_inspection_amendment;
 assert.equal(Object.keys(prior).length,38);assert.equal(Object.keys(p).length,39);assert.deepEqual(p.installed_repair_preview_amendment,prior.installed_repair_preview_amendment);assert.equal(a.predecessor.commit,'850e0127c4f2105d7cb564efa868c70dd600b521');assert.equal(a.predecessor.tree,'857ac885534b41d4c3ae640b9b1f2b280a55c23c');
 const restored=structuredClone(p);restored.status=prior.status;restored.current_source_scope.status=prior.current_source_scope.status;restored.current_source_scope.forecast_days=prior.current_source_scope.forecast_days;delete restored.installed_issue_inspection_amendment;assert.deepEqual(restored,prior);
 assert.deepEqual([p.story_count,p.case_count,p.requirement_count,p.scenario_count],[42,166,53,41]);assert.deepEqual(p.current_source_scope.forecast_days,{min:58.55875,max:65.13375});assert.equal(p.current_source_scope.pending_source_amendments.length,0);
 const metadata=await historical147Metadata(),oldMetadata=await pre147Capture('plan-metadata.json'),current=metadata.find(r=>r.id==='R1-33'),old=oldMetadata.find(r=>r.id==='R1-33');assert.equal(current.files.length,12);assert.equal(current.days,1.65);assert.deepEqual(current.hours,{min:9.35,max:13.2});assert.equal(current.forecast_provenance.min_days,'1.16875');assert.equal(current.forecast_provenance.max_days,'1.65000');assert.equal(current.forecast_provenance.plan_sha256,a.plan_sha256);
 const oldify=structuredClone(metadata);oldify[metadata.findIndex(r=>r.id==='R1-33')]=old;assert.deepEqual(oldify,oldMetadata);assert.deepEqual(await pre147Capture('ticket-drafts.json'),await pre147Capture('ticket-drafts.json'));
 const scale=100000n,toUnits=s=>{const [whole,fraction='']=String(s).split('.');assert(fraction.length<=5);return BigInt(whole)*scale+BigInt(fraction.padEnd(5,'0'));};let lower=0n,upper=0n;
 for(const expected of installed81ForecastExpected){const row=metadata.find(r=>r.id===expected.id);assert(row);if(row.id==='R1-33'){assert.deepEqual(row.files,a.whole.paths);assert.equal(toUnits(row.days),165000n);assert.equal(toUnits(row.forecast_provenance.min_days),116875n);lower+=116875n;upper+=165000n;}else{assert.deepEqual(row.files,expected.files);assert.equal(toUnits(row.days),toUnits(expected.max));assert.equal(toUnits(row.forecast_provenance.min_days),toUnits(expected.min));lower+=toUnits(expected.min);upper+=toUnits(expected.max);}}assert.deepEqual([String(lower),String(upper)],['5855875','6513375']);assert.equal(metadata.length,42);
 const bundle=JSON.parse(await read('config/skill-bundle.json')),oldBundle=await pre147Capture('config/skill-bundle.json'),added=['lib/jira/read.mjs','test/fixtures/jira-preview-harness.mjs','test/fixtures/jira-preview-cases.json','test/fixtures/jira-preview-tls.json'];assert.deepEqual(bundle.validatorPayload.sources,[...oldBundle.validatorPayload.sources,...added]);assert.deepEqual(a.payload.sources,bundle.validatorPayload.sources);assert.deepEqual(bundle.skills,oldBundle.skills);assert.deepEqual(bundle.dependencyDirectories,oldBundle.dependencyDirectories);assert.equal(bundle.skills.length,22);assert.equal(bundle.dependencyDirectories.length,3);assert.equal(bundle.validatorPayload.sources.length,41);
 const runtime=bundle.validatorPayload.sources.filter(f=>f.endsWith('.mjs')||f.endsWith('.schema.json')||['package.json','package-lock.json'].includes(f)).sort();assert.deepEqual(runtime,a.runtime.paths);assert.equal(runtime.length,27);assert.equal(a.runtime.artifacts_json_sha256,hash(JSON.stringify(a.runtime.artifacts_sha256)));assert.deepEqual(a.runtime.preserved_predecessor25_artifacts_sha256,prior.installed_repair_preview_amendment.source_runtime_revision.artifacts_sha256);
 for(const file of bundle.validatorPayload.sources)assert.equal(hash(await historical147File(file)),a.payload.artifacts_sha256[file],file+' current installed payload');for(const file of runtime)assert.equal(hash(await historical147File(file)),a.runtime.artifacts_sha256[file],file+' current runtime');for(const [file,digest]of Object.entries(a.runtime.preserved_predecessor25_artifacts_sha256))assert.equal(hash(await historical147File(file)),digest,file+' actual live predecessor runtime');
 assert.equal(hash(await historical147File('test/fixtures/jira-preview-cases.json')),a.literal_packet.cases_sha256);assert.equal(hash(await historical147File('test/fixtures/jira-preview-tls.json')),a.literal_packet.tls_sha256);assert.deepEqual([a.literal_packet.variants,a.literal_packet.controls,a.literal_packet.private_projection],[35,8,1]);assert.equal(a.verification.human_acceptance,'NOT_RUN (0/4)');assert.equal(a.verification.activation_authorized,false);
 const oldDelivery=await pre147Capture('docs/delivery/manager-r1/README.md');assert(oldDelivery.includes('58.33375–64.76500 days'));assert((await read('docs/delivery/manager-r1/README.md')).includes('58.55875–65.13375 days'));assert((await read('docs/product/README.md')).includes('58.55875–65.13375-day forecast'));
 await assertHistorical147PayloadClosure();
});
