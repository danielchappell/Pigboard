import { test } from 'node:test';
import { createHash } from 'node:crypto';
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
test('review architecture and untouched companion contracts retain their original bytes',async()=>{
 // Fixed SHA256 of raw baseline bytes at 9f03c1561b0e32de05cd296b24e50885f4abbe91.
 const baseline = {
  'skills/pr-review/SKILL.md': 'd15c0c072b4e43c1893f7456fe007045590dc2178ab1fe6a55480a496902effe',
  'skills/pr-review/references/review-state.md': 'cb63c3bd4f55ecd036ce435a63e56ea9884582a8bd138a7977ce0705520167d5',
  'skills/pr-commenting/SKILL.md': '10436d8f7b2700b7ab44ac30310f4c99c9b3983583212388d270d27c95dfc2a4',
  'config/cursor/pr-review-prompt.txt': '6ac09b149eeac87b09559dc7998561b8f1cb33d690f53ea3ceaf3f207eb1e58a'
 };
 for(const [file,expected] of Object.entries(baseline)){
  let bytes=await readFile(new URL('../'+file,import.meta.url));
  if(file === 'skills/pr-review/SKILL.md') {
   // PGB-106 permits only this context paragraph and four criterion additions.
   // Removing them must reconstruct every original byte, including verdicts/mapping.
   const additions = ["Read [engineering-principles](../engineering-principles/SKILL.md) for investigation guidance on reuse, design and verification. It does not add a reporting category, replace project authority or make a preference a finding; the scope and evidence rules below still govern.\n\n", " Check whether a changed assumption needed a revised plan and whether the required review covers the implemented approach; ordinary details within that approach do not require replanning.", " Check that author verification covers the final code state, that later edits or conflict resolution did not invalidate it, and that the intended tests actually ran; do not require a new test or an intermediate check when existing evidence suffices.", " Inspect actual callers and compare permissions, ownership, data and failure behavior; a matching helper name or nearby legacy example does not establish suitability.", " Check that the handoff gives another engineer usable prerequisites, actions and expected outcomes to verify the change, with retained evidence and any required cleanup."];
   let text = bytes.toString('utf8');
   for(const addition of additions) {
    assert.equal(text.split(addition).length, 2, 'Each reviewed addition occurs once');
    text = text.replace(addition, '');
   }
   // PGB-134 permits only these report edits; reverse each exact block.
   // All other original bytes, including criteria and verdicts, stay protected.
   const reportEdits = [
    [
        "The human-facing report helps people understand the change and choose where to look. Include one verdict, a change summary, a short file map, eight category rows with concise evidence, and the findings, gaps or risks needed for action. Humans can use it to spot-check; the AI still reviews the complete required scope. Do not publish a second 20-row checklist, per-requirement table, raw file inventory, evidence catalogue or long mandatory appendix by default.",
        "The human-facing report is the merge checklist: one verdict, eight category rows with concise evidence, and only the findings, gaps or risks needed for action. Do not publish a second 20-row checklist, per-requirement table, file inventory, evidence catalogue or long mandatory appendix by default."
    ],
    [
        "Keep the change summary to a few sentences: explain the changed behavior, the main implementation choices and what verification supports. Separate intended behavior from confirmed results and mention important gaps. Do not impose a length cap that hides a material finding or evidence gap. Deduplicate underlying issues and omit empty detail sections. The eight rows always remain visible, including justified NOT APPLICABLE rows.\n\nUse the existing change inventory to make the **Where to look** table. Group related files by behavior or necessary supporting work, including substantive configuration or deletions. Name the few useful code, test and guidance entry points; one change may need only one row. Link files or symbols at the reviewed revision. Before a PR exists, exact repository paths and symbols with that revision suffice; never invent links. A test-file reference does not mean the test ran. On re-review, keep the summary and map accurate for the whole current PR under the existing evidence-reuse rules. This map requires no extra review pass.\n\nSee the [fictional report example](references/report-example.md) for the shape; use actual evidence in real reports.",
        "Keep the summary to a few sentences. Do not impose a length cap that hides a material finding or evidence gap. Deduplicate underlying issues and omit empty detail sections. The eight rows always remain visible, including justified NOT APPLICABLE rows."
    ],
    [
        "**Change summary:** [changed behavior, main choices and supported verification; important gaps when present].\n\n**PR / Jira:** [PR link, or pre-PR and prepared title/description reference; Jira link]",
        "**PR / Jira:** [PR link, or pre-PR and prepared title/description reference; Jira link]"
    ],
    [
        "**Where to look**\n\n| Change | Main files | Tests and guidance |\n| --- | --- | --- |\n| [behavior or supporting change] | [useful files/symbols and their role] | [relevant tests and guidance] |\n\n| Merge criterion                    | Result       | Evidence summary or required action                             |",
        "| Merge criterion                    | Result       | Evidence summary or required action                             |"
    ]
];
   for (const [current, original] of reportEdits) {
    assert.equal(text.split(current).length, 2, 'Each approved report edit occurs once');
    text = text.replace(current, original);
   }
   bytes = Buffer.from(text);
  }
  assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,file);
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
