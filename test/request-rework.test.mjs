import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { stringify } from 'yaml';
import { validateWork } from '../lib/contracts/work.mjs';
import { validateHandoff, extractHandoff, digestValue } from '../lib/contracts/handoff.mjs';
import { validateReceiptChain } from '../lib/contracts/receipts.mjs';
import { parseConfig } from '../lib/config/parse.mjs';
import { resolveProject, inspectStreams } from '../lib/config/projects.mjs';
import { CASE_IDS, packet, prepare } from './fixtures/human-rework.mjs';
const root = new URL('../', import.meta.url).pathname;
const plain = value => JSON.parse(JSON.stringify(value));
const chain = e => validateReceiptChain(JSON.stringify(e));
const adf = r => JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:stringify(r)}]}]});
function replaceRepair(e, mutate) {
  const comment = e.comment_pages[0].comments.find(c=>c.id===e.target.comment_id);
  const record = plain(extractHandoff(comment.body,{format:comment.format}).value);
  mutate(record);comment.body=adf(record);comment.format='adf';e.target.digest=digestValue(record);
}
// These checks exercise shared canonical contracts, not an emulated assistant policy.
test('human-only QA and human repair are distinct valid targets, preserving findings/nulls/current operation',()=>{
  const p=packet(),before=JSON.stringify(p);
  const work=validateWork(p.preflight.requirements[0].body,{mode:'start',contextInput:p.preflight.requirements[0].context_body});
  assert.equal(work.valid,true,JSON.stringify(work));
  const configResult=parseConfig(stringify(p.config));assert.equal(configResult.valid,true,JSON.stringify(configResult));
  const scope=configResult.resolved_scope;
  const project=resolveProject(scope,{site:p.preflight.trusted.site,project_id:'100'});
  assert.deepEqual(project.actors,p.preflight.trusted.projects[0].actors);
  assert.equal(inspectStreams(scope,'stream-1')[0].mapped,true);
  const qa=chain(p.preflight);assert.equal(qa.valid,true);assert.equal(qa.completion_established,true);
  assert.deepEqual(qa.human_pending,['HQA-01']);assert.equal(qa.ai_steps,0);
  assert.equal(validateHandoff(stringify(p.record)).valid,true);
  for(const e of [p.published,p.queued]) {
    const result=chain(e);assert.equal(result.valid,true,JSON.stringify(result.diagnostics));
    assert.deepEqual(result.validated_leaf,e.target);assert.equal(result.completion_established,false);
    const r=extractHandoff(e.comment_pages[0].comments.at(-1).body,{format:'adf'}).value;
    assert.deepEqual(plain(r.payload.findings),p.record.payload.findings);
    assert.deepEqual(r.payload.findings.map(f=>f.id),['F01','F02']);
    assert.equal(r.payload.qa_report,null);assert.equal(r.resume_authorization,null);
    assert.equal(r.operation_id,p.record.assignment.record_id);
    assert.deepEqual(plain(e.issues[0].pointer),p.sentinels.pointer);
  }
  assert.equal(JSON.stringify(p),before);
  // A completion that predates a new unresolved request cannot erase that request.
  const oldTarget=plain(p.published);oldTarget.target=p.preflight.target;
  assert.equal(chain(oldTarget).valid,false);
});
test('human request predecessor/current binding and supplied provider metadata reject concrete stale or incomplete observations',()=>{
  for(const [name,mutate,code] of [
    ['wrong predecessor',e=>replaceRepair(e,r=>r.payload.basis=plain(r.assignment)),'REPAIR'],
    ['changed current source',e=>e.pr_receipts[0].source_revision='f'.repeat(40),'PR'],
    ['changed requirements',e=>e.issues[0].requirements_digest='sha256:'+'f'.repeat(64),'REQUIREMENTS'],
    ['changed assignment',e=>e.issues[0].pointer.assignment.comment_id='999','ASSIGNMENT'],
    ['wrong native stage',e=>e.issues[0].stage_id='2','PROJECT'],
    ['wrong human actor',e=>{const c=e.comment_pages[0].comments.at(-1);c.author_id=c.update_author_id='stranger';},'ACTOR'],
    ['edited metadata',e=>e.comment_pages[0].comments.at(-1).updated='2026-11-15T13:00:00Z','METADATA'],
    ['incomplete pages',e=>e.comment_pages[0].is_last=false,'INCOMPLETE_READ'],
    ['missing finding evidence',e=>e.evidence_receipts=e.evidence_receipts.filter(o=>!o.uri.endsWith('F02')),'EVIDENCE'],
    ['wrong finding digest',e=>replaceRepair(e,r=>r.payload.findings[0].evidence[0].digest='sha256:'+'f'.repeat(64)),'EVIDENCE'],
    ['wrong body digest',e=>e.target.digest='sha256:'+'f'.repeat(64),'REFERENCE'],
    ['missing exact QA receipt',e=>{const p=e.comment_pages[0];p.comments=p.comments.filter(c=>c.id!=='2004');p.total--;},'REFERENCE']
  ]) {
    const e=packet().published;mutate(e);const before=JSON.stringify(e),r=chain(e);
    assert.equal(r.valid,false,name+JSON.stringify(r));
    assert(r.diagnostics.some(d=>d.code===code),name+JSON.stringify(r.diagnostics));
    assert.equal(JSON.stringify(e),before,name);
  }
});
test('merged completion is generic validator support, never human-producer eligibility',()=>{
  for(const state of ['closed','merged','unknown']) {
    const {preflight,published}=packet();preflight.pr_receipts[0].state=state;published.pr_receipts[0].state=state;
    const qa=chain(preflight);assert.equal(qa.valid,state==='merged',state+JSON.stringify(qa.diagnostics));
    if(state==='merged')assert.equal(qa.completion_established,true);
    // Repair publication has its own open-PR requirement; instruction QA separately
    // proves the producer checks this before any provider mutation.
    assert.equal(chain(published).valid,false,state);
  }
});
test('fixed packets isolate variants, native identity, raw evidence, transition IDs and audit sentinels',()=>{
  assert.equal(CASE_IDS.length,12);
  for(const id of CASE_IDS) {
    const p=packet(id), card=p.cards['preflight.json'];
    assert.match(p.notice,/SYNTHETIC/);assert.equal(p.oracle.status,'NOT RUN');
    assert.equal(p.preflight.consumer,'worker');assert.equal(p.preflight.trusted.site,p.config.jira.site);
    assert.deepEqual(card.native_a.properties['pigboard.work-context'],p.preflight.issues[0].pointer);
    assert.equal(card.native_a.fields.status.id,p.preflight.issues[0].stage_id);
    assert.equal(card.native_a.fields.project.id,'100');assert.equal(card.native_a.fields.issuetype.id,'22');
    assert.deepEqual(card.comments,p.preflight.comment_pages);
    assert.equal(card.pr[0].source.revision,p.preflight.pr_receipts[0].source_revision);
    assert.equal(card.pr[0].state,p.preflight.pr_receipts[0].state);
    assert.equal(card.transitions.transitions[0].id,'61');assert.notEqual(card.transitions.transitions[0].id,card.transitions.transitions[0].to.id);
    assert.equal(card.transitions.from_status_id,'5');assert.equal(card.transitions.transitions[0].to.id,'6');
    assert.equal(p.nativeB.stage_id,'2');assert.equal(p.nativeB.stream,p.preflight.issues[0].stream);
    assert.equal(p.nativeB.project_id,'100');assert.deepEqual(p.sentinels.pointer,p.preflight.issues[0].pointer);
    for(const raw of card.evidence) {
      assert.match(raw.body,/SYNTHETIC/);assert.equal(raw.status,200);
      const observation=p.preflight.evidence_receipts.find(x=>x.uri===raw.uri);assert.deepEqual(raw.observation,observation);
      if(observation.observed_digest)assert.equal(observation.observed_digest,'sha256:'+createHash('sha256').update(raw.body).digest('hex'));
      const body=JSON.parse(raw.body);assert.deepEqual(body.pr,observation.pr);
    }
    const result=chain(p.preflight);
    assert.equal(result.valid,!['H02-closed','H02-source','H02-missing'].includes(id),id+JSON.stringify(result.diagnostics));
    if(id==='H02-queued')assert.equal(result.outcome,'repair_request');
    else if(result.valid)assert.equal(result.completion_established,true);
    if(id==='H02-append-unknown')assert.equal(p.cards['append.json'].publication,'unknown');
    if(id==='H02-transition-unknown')assert.equal(p.cards['transition.json'].status,'unknown');
    if(id==='H02-drift-after-publish')assert.notEqual(p.cards['after-publish.json'].pr[0].source.revision,card.pr[0].source.revision);
    if(id==='H02-readback')assert.equal(p.cards['readback.json'].author_id,'stranger');
  }
});
test('exporter creates static packets only, keeps future cards/oracle out of initial assistant inputs and never overwrites a run',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'pgb-human-packets-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const output=path.join(dir,'H01');const meta=await prepare(output,'H01');
  assert.match(meta.source_revision,/^[0-9a-f]{40}$/);assert.equal(meta.status,'NOT RUN');
  const packetChain=JSON.parse(await readFile(path.join(output,'preflight-chain.json'),'utf8'));
  assert.equal(chain(packetChain).valid,true);
  assert.equal(JSON.parse(await readFile(path.join(output,'oracle.json'),'utf8')).status,'NOT RUN');
  await assert.rejects(readFile(path.join(output,'assistant/oracle.json')));
  await assert.rejects(readFile(path.join(output,'assistant/record.yaml')));
  await assert.rejects(readFile(path.join(output,'assistant/append.json')));
  await assert.rejects(prepare(output,'H01'));
  assert.equal(await readFile(path.join(output,'request.txt'),'utf8'),packet().request+'\n');
  for(const id of CASE_IDS.slice(1)) {
    await prepare(path.join(dir,id),id);
    assert.equal(JSON.parse(await readFile(path.join(dir,id,'oracle.json'),'utf8')).caseId,id);
  }
});
test('actual formatter retains human findings and rejects record/summary/wrapper bounds without truncation',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'pgb-human-formatter-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const {writeFile}=await import('node:fs/promises');
  const input=path.join(dir,'record.yaml'),summary=path.join(dir,'summary.txt'),p=packet();
  const invoke=(format='html')=>spawnSync(process.execPath,[path.join(root,'scripts/prepare-handoff.mjs'),'--input',input,'--summary',summary,'--format',format],{cwd:dir,encoding:'utf8'});
  await writeFile(input,stringify(p.record));await writeFile(summary,p.summary);
  for(const format of ['html','adf']) {
    const result=invoke(format);assert.equal(result.status,0,result.stderr);
    assert.equal(result.stdout,invoke(format).stdout);
    const publication=JSON.parse(result.stdout),extracted=extractHandoff(format==='html'?publication.body:JSON.stringify(publication.body),{format});
    assert(extracted.value);assert.deepEqual(plain(extracted.value),p.record);assert.equal(publication.record_digest,digestValue(p.record));
    const envelope=plain(p.published),comment=envelope.comment_pages[0].comments.at(-1);
    comment.body=format==='html'?publication.body:JSON.stringify(publication.body);comment.format=format;
    assert.equal(chain(envelope).valid,true);
  }
  const bounds=[
    r=>r.payload.findings=Array.from({length:101},(_,i)=>({...r.payload.findings[0],id:'F'+i})),
    r=>r.payload.findings[0].summary='x'.repeat(16384),
    r=>r.payload.findings[0].evidence[0].extra={a:{a:{a:{a:{a:{a:{a:{a:{a:{a:{a:{a:{a:{a:1}}}}}}}}}}}}}}
  ];
  for(const mutate of bounds){const r=plain(p.record);mutate(r);await writeFile(input,stringify(r));assert.equal(invoke().status,1);}
  await writeFile(input,stringify(p.record));await writeFile(summary,'x'.repeat(2001));assert.equal(invoke().status,1);
  const wrapper=plain(p.record);wrapper.payload.findings=Array.from({length:6},(_,i)=>({id:'F'+i,summary:'&'.repeat(1800),evidence:[{label:'x',uri:'https://x.invalid',digest:null}]}));await writeFile(input,stringify(wrapper));await writeFile(summary,'&'.repeat(2000));
  assert.equal(validateHandoff(stringify(wrapper)).valid,true);assert.equal(invoke().status,1);
});
test('installed instruction contract is bounded and keeps live/provider claims separate from local checks',async()=>{
  const skill=await readFile(new URL('../skills/request-rework/SKILL.md',import.meta.url),'utf8');
  const example=await readFile(new URL('../skills/request-rework/references/example.md',import.meta.url),'utf8');
  for(const required of ['human-writing/SKILL.md','consumer: worker','completion_established:true','new repair request as target','transition ID','already Rework','unknown append','REQUEST_PREPARED','ALREADY_QUEUED','deliveryOutcome','same PR','No Blocked producer']) assert(skill.includes(required),required);
  for(const id of CASE_IDS)assert(example.includes(id),id);
  assert(example.includes('default locked dependency preparation'));assert(example.includes('NOT RUN'));
  assert(example.includes('R1-09-H01/H02'));assert(example.includes('BIND_ACTUAL_ASSISTANT_PUBLICATION_BODY'));
  // Wording/link guards support, but never replace, independent instruction episodes.
});
