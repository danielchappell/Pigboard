import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { stringify } from 'yaml';
import { extractHandoff, validateHandoff, digestValue } from '../lib/contracts/handoff.mjs';
import { validateReceiptChain } from '../lib/contracts/receipts.mjs';
// Real canonical helpers against supplied facts, not an emulated agent or live proof.
const root = new URL('../', import.meta.url).pathname;
const seeds = JSON.parse(await readFile(new URL('./fixtures/handoff-chains.json', import.meta.url))).chains;
const entries = e => e.comment_pages.flatMap(p => p.comments.map(c => ({ c, r: extractHandoff(c.body, { format: c.format }).value })));
const ref = x => ({ ticket_id:x.r.ticket_id, comment_id:x.c.id, record_id:x.r.record_id, digest:digestValue(x.r) });
function review(name='human') {
 const e=structuredClone(seeds[name]), x=entries(e).filter(x=>x.r.kind==='review').at(-1);
 e.target=ref(x);e.issues.find(i=>i.id===x.r.ticket_id).stage_id=e.trusted.projects[0].stages['In Review'];
 return {e,x};
}
const chain=e=>validateReceiptChain(JSON.stringify(e));
test('review targets bind actual implementation including repair, stack and historical first PR after wait',()=>{
 for(const name of ['human','mixed','repair','stack','first_pr_after_wait']){
  const {e,x}=review(name), before=JSON.stringify(e), result=chain(e);
  assert.equal(result.valid,true,name+JSON.stringify(result.diagnostics));
  assert.deepEqual(result.validated_leaf,e.target);assert.equal(result.live_freshness,'not_evaluated');
  const implementation=entries(e).find(a=>a.r.record_id===x.r.payload.implementation.record_id);
  assert.deepEqual(JSON.parse(JSON.stringify(x.r.payload.implementation)),ref(implementation));
  assert.equal(JSON.stringify(e),before);
 }
});
test('review receipts reject missing/stale approval, wrong actor, incomplete report and changed lineage',()=>{
 for(const mutate of [
 e=>e.evidence_receipts=e.evidence_receipts.filter(a=>a.kind!=='approval'),
 e=>e.evidence_receipts.find(a=>a.kind==='approval').actor_id='other',
 e=>e.evidence_receipts.find(a=>a.kind==='approval').details.state='pending',
 e=>e.evidence_receipts.find(a=>a.kind==='approval').pr.source_revision='f'.repeat(40),
 e=>e.evidence_receipts.find(a=>a.kind==='review_report').details.criteria_complete=false,
 e=>e.evidence_receipts.find(a=>a.kind==='review_report').details.comments_handled=false,
 e=>e.comment_pages[0].comments[0].updated='2026-11-15T12:00:00Z',
 e=>e.comment_pages[0].is_last=false,
 e=>e.issues[0].pointer.assignment.comment_id='missing',
 e=>e.issues[0].project_id='999',
 e=>e.issues[0].stage_id=e.trusted.projects[0].stages['Human Review'],
 e=>e.requirements[0].body='schema: pigboard-ticket/v1\n',
 e=>e.pr_receipts.filter(p=>p.current).forEach(p=>p.source_revision='f'.repeat(40))
 ]) {const {e}=review();mutate(e);const result=chain(e);assert.equal(result.valid,false,JSON.stringify(result));assert(result.diagnostics.length);}
});
test('reviewer repair/block preserve every finding, null and implementation basis through both formatter transports',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'pgb-reviewer-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const {x}=review('repair');
 const findings=Array.from({length:7},(_,i)=>({id:`F${i+1}`,summary:`Confirmed finding ${i+1} <literal>`,evidence:[structuredClone(x.r.payload.report)]}));
 for(const kind of ['review','repair_request','blocked']){
  const record=structuredClone(x.r);
  if(kind==='repair_request')Object.assign(record,{kind,to_stage:'Rework Queued',payload:{basis:x.r.payload.implementation,pr:x.r.payload.pr,findings,qa_report:null}});
  if(kind==='blocked')Object.assign(record,{kind,to_stage:'Blocked',payload:{basis:x.r.payload.implementation,pr:x.r.payload.pr,reason:'access',detail:'Required access unavailable; findings retained in report.',human_action:'Restore prepared access and deliberately re-enter Review.',evidence:[x.r.payload.report],qa_report:null}});
  const raw=stringify(record),input=path.join(dir,'record.yaml'),summary=path.join(dir,'summary.txt');
  assert.equal(validateHandoff(raw).valid,true,kind+JSON.stringify(validateHandoff(raw).diagnostics));await writeFile(input,raw);await writeFile(summary,'Review result <literal> & all findings.');
  for(const format of ['html','adf']){
   const run=()=>spawnSync(process.execPath,[path.join(root,'scripts/prepare-handoff.mjs'),'--input',input,'--summary',summary,'--format',format],{cwd:dir,encoding:'utf8'});
   const p=run();assert.equal(p.status,0,p.stderr);assert.equal(p.stdout,run().stdout);
   const publication=JSON.parse(p.stdout),value=extractHandoff(format==='html'?publication.body:JSON.stringify(publication.body),{format}).value;
   assert.equal(publication.record_digest,digestValue(record));assert.deepEqual(JSON.parse(JSON.stringify(value)),JSON.parse(JSON.stringify(record)));
   if(kind==='repair_request')assert.deepEqual(value.payload.findings.map(f=>f.id),findings.map(f=>f.id));
  }
 }
 const oversized=structuredClone(x.r);oversized.kind='repair_request';oversized.to_stage='Rework Queued';oversized.payload={basis:x.r.payload.implementation,pr:x.r.payload.pr,findings:[...findings,...Array.from({length:101},(_,i)=>({...findings[0],id:`Extra${i}`}))],qa_report:null};
 assert.equal(validateHandoff(stringify(JSON.parse(JSON.stringify(oversized)))).valid,false);
});
test('shared review core and comment contracts remain byte-identical to implementation base',()=>{
 for(const file of ['skills/pr-review/SKILL.md','skills/pr-review/references/review-state.md','skills/pr-commenting/SKILL.md','config/cursor/pr-review-prompt.txt']){
  const base=spawnSync('git',['show',`9f03c1561b0e32de05cd296b24e50885f4abbe91:${file}`],{cwd:root});
  const current=spawnSync('git',['hash-object',file],{cwd:root,encoding:'utf8'});
  const original=spawnSync('git',['hash-object','--stdin'],{cwd:root,input:base.stdout,encoding:'utf8'});
  assert.equal(base.status,0);assert.equal(current.stdout,original.stdout,file);
 }
});

test('reviewer repair and blocked canonical receipts use implementation basis and real server metadata',()=>{
 for(const kind of ['repair_request','blocked']){
  const {e,x}=review(), implementation=x.r.payload.implementation, report=x.r.payload.report;
  const record=JSON.parse(JSON.stringify(x.r));
  Object.assign(record,{kind,to_stage:kind==='blocked'?'Blocked':'Rework Queued',payload:kind==='blocked'
   ?{basis:implementation,pr:x.r.payload.pr,reason:'access',detail:'Evidence inaccessible.',human_action:'Restore prepared access.',evidence:[report],qa_report:null}
   :{basis:implementation,pr:x.r.payload.pr,findings:[{id:'F01',summary:'Confirmed defect.',evidence:[report]},{id:'F02',summary:'Second confirmed defect.',evidence:[structuredClone(report)]}],qa_report:null}});
  for(const p of e.comment_pages){p.comments=p.comments.filter(c=>extractHandoff(c.body,{format:c.format}).value.kind!=='qa');p.total=p.comments.length;}
  x.c.format='adf';x.c.body=JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:stringify(JSON.parse(JSON.stringify(record)))}]}]});e.target=ref({c:x.c,r:record});
  const valid=chain(e);assert.equal(valid.valid,true,kind+JSON.stringify(valid.diagnostics));
  assert.deepEqual(valid.validated_leaf,e.target);
  const changed=structuredClone(e);changed.target.digest='sha256:'+'f'.repeat(64);assert.equal(chain(changed).valid,false);
  x.c.updated='2026-11-15T12:00:00Z';assert.equal(chain(e).valid,false);
 }
});
