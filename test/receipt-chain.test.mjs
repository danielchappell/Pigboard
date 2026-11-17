import { test } from 'node:test';import assert from 'node:assert/strict';import { readFileSync } from 'node:fs';import { mkdtemp,writeFile,readFile,rm,mkdir,cp } from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import { spawnSync,execFileSync } from 'node:child_process';
import canonicalize from 'canonicalize';import{createHash}from'node:crypto';
import { validateReceiptChain,validateWorkerCurrent,inspectRecordedHistory,inspectManagerCompletion,inspectManagerHistory,RECEIPT_LIMITS } from '../lib/contracts/receipts.mjs';import { digestValue, extractHandoff } from '../lib/contracts/handoff.mjs';
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/handoff-chains.json',import.meta.url))),clone=(name='mixed')=>structuredClone(fixtures.chains[name]),run=e=>validateReceiptChain(JSON.stringify(e)),cli=new URL('../scripts/validate-handoff.mjs',import.meta.url).pathname;
const entries=e=>e.comment_pages.flatMap(p=>p.comments.map(c=>({p,c,r:JSON.parse(JSON.parse(c.body).content[0].content[0].text)}))),target=e=>entries(e).find(x=>x.r.record_id===e.target.record_id);
function seal(e){for(let round=0;round<20;round++){let changed=false;const map=new Map(entries(e).map(x=>[x.r.record_id,digestValue(x.r)]));function walk(v){if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){if(k==='digest'&&v.record_id&&map.has(v.record_id)&&x!==map.get(v.record_id)){v[k]=map.get(v.record_id);changed=true;}else if(x&&typeof x==='object')walk(x);}}walk(e);for(const x of entries(e)){walk(x.r);x.c.body=JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:JSON.stringify(x.r)}]}]});}if(!changed&&round>0)return e;}return e;}
function mutateRecord(e,id,fn){const x=entries(e).find(x=>x.r.record_id===id);fn(x.r);x.c.body=JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:JSON.stringify(x.r)}]}]});return seal(e);}
function rejects(name,mutate,code,fixture='mixed'){test(name,()=>{const e=clone(fixture);mutate(e);const before=JSON.stringify(e),r=run(e);assert.equal(r.valid,false,JSON.stringify(r));if(code)assert(r.diagnostics.some(x=>x.code===code),JSON.stringify(r.diagnostics));assert.equal(JSON.stringify(e),before);assert.equal(r.completion_established,false);});}
test('complete independent supplied new, repaired, stacked, resumed, human-only and partial fixtures are truthful and unchanged',()=>{for(const [name,original]of Object.entries(fixtures.chains)){const e=structuredClone(original),before=JSON.stringify(e),r=run(e);assert.equal(r.valid,true,name+JSON.stringify(r.diagnostics));assert.equal(r.live_freshness,'not_evaluated');assert.equal(r.validation_scope,'supplied_receipts');assert.deepEqual(r.validated_leaf,e.target);assert.equal(r.completion_established,!['blocked','partial'].includes(name));assert.equal(JSON.stringify(e),before);assert.deepEqual(JSON.parse(JSON.stringify(r.qa_report)),target(e).r.payload.report??target(e).r.payload.qa_report);if(name==='human'){assert.equal(r.ai_steps,0);assert.equal(r.no_ai_cases_reason,JSON.parse(e.requirements[0].body).testing_strategy.human_review.no_ai_cases_reason);assert(r.human_pending.length);assert.deepEqual(r.qa_report.steps,[]);}}});
for(const [name,fn,code]of [
 ['closed envelope unknown field',e=>e.extra=true,'STRUCTURE'],['missing exact evidence',e=>e.evidence_receipts.pop(),'EVIDENCE'],['missing project',e=>e.trusted.projects=[],'PROJECT'],['foreign issue site',e=>e.issues[0].site='https://foreign.example.invalid','PROJECT'],['native moved project',e=>e.issues[0].project_id='200','PROJECT'],['wrong manager pointer',e=>e.issues[0].pointer.assignment.comment_id='999','ASSIGNMENT'],['changed issue requirements',e=>e.issues[0].requirements_digest='sha256:'+'0'.repeat(64),'REQUIREMENTS'],['ordinary page gap',e=>e.comment_pages[0].start_at=1,'INCOMPLETE_READ'],['missing final page',e=>e.comment_pages[0].is_last=false,'INCOMPLETE_READ'],['missing source revision',e=>e.pr_receipts[0].source_revision='f'.repeat(40),'PR'],['closed unmerged completion',e=>e.pr_receipts[0].state='closed','PR'],['unknown PR completion',e=>e.pr_receipts[0].state='unknown','PR'],['publication inventory omitted',e=>e.issues[0].published_prs=[],'PR'],['false CI',e=>e.evidence_receipts.find(x=>x.kind==='ci').details.status='failed','EVIDENCE'],['unapproved PR',e=>e.evidence_receipts.find(x=>x.kind==='approval').details.state='changes_requested','EVIDENCE'],['wrong approval actor',e=>e.evidence_receipts.find(x=>x.kind==='approval').actor_id='stranger','EVIDENCE'],['incomplete shared report',e=>e.evidence_receipts.find(x=>x.kind==='review_report').details.comments_handled=false,'EVIDENCE'],['same plan reviewer context',e=>e.evidence_receipts.find(x=>x.kind==='plan_review').details.reviewer_id='plan-author','EVIDENCE'],['stale environment',e=>e.evidence_receipts.find(x=>x.kind==='environment').pr.source_revision='f'.repeat(40),'EVIDENCE'],['wrong pipeline actor',e=>e.evidence_receipts.find(x=>x.kind==='environment').actor_id='stranger','EVIDENCE'],['missing pipeline observation',e=>e.evidence_receipts=e.evidence_receipts.filter(x=>x.kind!=='environment'),'EVIDENCE'],['wrong project native stage',e=>e.issues[0].stage_id='cancelled','PROJECT'],['wrong configured repository',e=>e.trusted.projects[0].repositories=[],'PR'],['missing requirements context',e=>e.requirements[0].context_body='{}',null],['requirements changed text digest',e=>{const w=JSON.parse(e.requirements[0].body);w.problem_to_solve+=' Changed.';e.requirements[0].body=JSON.stringify(w);},'REQUIREMENTS']
])rejects(name,fn,code);
for(const [name,fn,code]of [
 ['wrong typed server author',e=>target(e).c.author_id='stranger','METADATA'],['wrong author with unchanged editor',e=>{target(e).c.author_id='stranger';target(e).c.update_author_id='stranger';},'ACTOR'],['changed editor same timestamp',e=>target(e).c.update_author_id='stranger','METADATA'],['edited server timestamp',e=>target(e).c.updated='2026-11-15T10:01:00Z','METADATA'],['wrong exact target comment',e=>e.target.comment_id='999','REFERENCE'],['wrong exact target digest',e=>e.target.digest='sha256:'+'0'.repeat(64),'REFERENCE'],['wrong exact target UUID',e=>e.target.record_id='00000000-0000-4000-8000-999999999999','REFERENCE'],['retained deleted comment',e=>e.retained.push({...e.target,site:e.trusted.site,comment_id:'999',author_id:'qa',update_author_id:'qa',created:'2026-11-15T10:00:00Z',updated:'2026-11-15T10:00:00Z'}),'REFERENCE'],['retained changed metadata',e=>e.retained.push({...e.target,site:e.trusted.site,author_id:'qa',update_author_id:'qa',created:'2026-11-15T09:00:00Z',updated:'2026-11-15T09:00:00Z'}),'METADATA']
])rejects(name,fn,code);
rejects('conflicting same final slot holds instead of picking latest',e=>{const x=target(e),copy=structuredClone(x.c),r=structuredClone(x.r);r.record_id='00000000-0000-4000-8000-999999999999';copy.id='9999';copy.body=JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:JSON.stringify(r)}]}]});e.comment_pages[0].comments.push(copy);e.comment_pages[0].total++;},'SLOT_CONFLICT');
test('identical logical publications retain distinct valid comment receipts',()=>{const e=clone(),copy=structuredClone(target(e).c);copy.id='9999';copy.created=copy.updated='2026-11-15T10:02:00Z';e.comment_pages[0].comments.push(copy);e.comment_pages[0].total++;assert(run(e).valid);copy.update_author_id='stranger';assert.equal(run(e).valid,false);});
for(const [name,fn]of [
 ['partial missing step',r=>r.payload.report.steps.pop()],['ledger wrong order',r=>r.payload.report.steps.reverse()],['ledger skill swapped',r=>r.payload.report.steps[0].skill='qa-ui'],['missing PASS evidence',r=>r.payload.report.steps[0].evidence=[]],['human pending omitted',r=>r.payload.report.human_pending=[]],['invented all human reason',r=>r.payload.report.no_ai_cases_reason='invented'],['invented human PASS',r=>r.payload.report.steps.push({id:'HQA-01',skill:'qa-ui',result:'PASS',evidence:[],finding_ids:[],not_run_reason:null,reused_from:null})],['missing coherent review',r=>r.payload.review.comment_id='999']
])rejects(name,e=>mutateRecord(e,e.target.record_id,fn),null);
rejects('partial repair unknown finding ID',e=>mutateRecord(e,e.target.record_id,r=>r.payload.qa_report.steps[1].finding_ids=['unknown']),'LEDGER','partial');
rejects('partial repair unexplained NOT_RUN',e=>mutateRecord(e,e.target.record_id,r=>r.payload.qa_report.steps[1].not_run_reason=' '),'LEDGER','partial');
rejects('partial repair missing remaining NOT_RUN',e=>mutateRecord(e,e.target.record_id,r=>r.payload.qa_report.steps.pop()),'LEDGER','partial');
rejects('blocked QA preserves complete partial ledger',e=>mutateRecord(e,e.target.record_id,r=>r.payload.qa_report=null),'LEDGER','blocked');
rejects('human-only invents AI result',e=>mutateRecord(e,e.target.record_id,r=>r.payload.report.steps=[{id:'fiction',skill:'qa-ui',result:'PASS',evidence:[],finding_ids:[],not_run_reason:null,reused_from:null}]),null,'human');
test('accepted later stage and merged PR completion differ from publication at QA',()=>{for(const [stage,state,complete]of [['QA','open',false],['Human Review','merged',true],['later','merged',true]]){const e=clone();e.issues[0].stage_id=stage==='later'?'8':e.trusted.projects[0].stages[stage];e.pr_receipts[0].state=state;const r=run(e);assert.equal(r.valid,true,JSON.stringify(r.diagnostics));assert.equal(r.completion_established,complete);}});
test('manager mode alone requires the exact supplied stored current assignment',()=>{const e=clone();e.consumer='manager';assert.equal(run(e).valid,false);e.trusted.manager_assignments=[{ticket_id:e.issues[0].id,assignment:e.issues[0].pointer.assignment}];assert(run(e).valid);e.trusted.manager_assignments[0].assignment={...e.target};assert.equal(run(e).valid,false);});
test('native project IDs isolate equal stream labels, and key rename preserves immutable identity',()=>{const e=clone();e.trusted.projects.push({...structuredClone(e.trusted.projects[0]),id:'200'});assert(run(e).valid);e.issues[0].key='RENAMED-1';const facts=JSON.parse(e.requirements[0].context_body);facts.subject_key='RENAMED-1';facts.prerequisite_graph[0].ticket='RENAMED-1';e.requirements[0].context_body=JSON.stringify(facts);assert(run(e).valid);});
rejects('unconsumed current request cannot be dropped',e=>e.issues[0].required_requests=[e.target],'REPAIR');
rejects('repair must retain every consumed request',e=>{const imp=entries(e).filter(x=>x.r.kind==='implementation').at(-1);mutateRecord(e,imp.r.record_id,r=>r.payload.consumed_requests=[]);},'REPAIR','repair');
rejects('repair existing PR identity cannot be changed',e=>{const a=entries(e).filter(x=>x.r.kind==='admission').at(-1);mutateRecord(e,a.r.record_id,r=>r.payload.existing_pr.number='88');},'PR','repair');
rejects('known PR cannot become no-PR repair',e=>{const a=entries(e).filter(x=>x.r.kind==='admission').at(-1);mutateRecord(e,a.r.record_id,r=>r.payload.existing_pr=null);},'REPAIR','repair');
rejects('stack roots must be complete and exact',e=>{const s=entries(e).find(x=>x.r.kind==='stack_update_request');mutateRecord(e,s.r.record_id,r=>r.payload.roots=[{...r.payload.roots[0],comment_id:'999'}]);},'REFERENCE','stack');
rejects('stack cannot claim independent child lineage',e=>{const imp=entries(e).find(x=>x.r.ticket_id==='1001'&&x.r.kind==='implementation');mutateRecord(e,imp.r.record_id,r=>r.payload.stack_parent=null);},'REPAIR','stack');
rejects('stack incorporated parent source cannot be stale',e=>{const imp=entries(e).filter(x=>x.r.ticket_id==='1001'&&x.r.kind==='implementation').at(-1);mutateRecord(e,imp.r.record_id,r=>r.payload.stack_parent.incorporated_revision='1'.repeat(40));},'REPAIR','stack');
rejects('resume changed PR is rejected',e=>{const auth=entries(e).find(x=>x.r.kind==='resume_authorization');mutateRecord(e,auth.r.record_id,r=>r.payload.pr.source_revision='f'.repeat(40));},null,'resume');
rejects('resume wrong source blocker is rejected',e=>{const auth=entries(e).find(x=>x.r.kind==='resume_authorization');mutateRecord(e,auth.r.record_id,r=>r.payload.blocked_result=r.assignment);},'RESUME','resume');
rejects('resume cannot authorize a successful result',e=>{const auth=entries(e).find(x=>x.r.kind==='resume_authorization');mutateRecord(e,auth.r.record_id,r=>r.payload.blocked_result=target(e).r.payload.review);},'RESUME','resume');
rejects('resume wrong worker return stage is rejected',e=>{const auth=entries(e).find(x=>x.r.kind==='resume_authorization');mutateRecord(e,auth.r.record_id,r=>r.to_stage='In Review');},'RESUME','resume');
rejects('two authorizations do not select a newest leaf',e=>{const x=entries(e).find(x=>x.r.kind==='resume_authorization'),copy=structuredClone(x.c),r=structuredClone(x.r);copy.id='9999';r.record_id='00000000-0000-4000-8000-999999999999';copy.body=JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:JSON.stringify(r)}]}]});e.comment_pages[0].comments.push(copy);e.comment_pages[0].total++;},'RESUME','resume');
for(const credential of ['https://user@example.invalid/repo','https://user:secret@example.invalid/repo','https://@example.invalid/repo'])rejects('credential URL exact allowlist still rejects '+credential.split('@')[0],e=>{const p=target(e).r.payload.pr,old=p.repository;function replace(v){if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){if(x===old)v[k]=credential;else if(x&&typeof x==='object')replace(x);}}replace(e);for(const x of entries(e)){replace(x.r);x.c.body=JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:JSON.stringify(x.r)}]}]});}seal(e);},'FORMAT');
test('input JSON syntax, duplicate keys, byte budget and outer-array limits are bounded',()=>{for(const raw of ['{','{"schema":"x","schema":"y"}','schema: nope',Buffer.alloc(RECEIPT_LIMITS.bytes+1,32),JSON.stringify({...clone(),retained:Array(1001).fill(null)})]){const r=validateReceiptChain(raw);assert.equal(r.valid,false);}assert.equal(validateReceiptChain({}).diagnostics[0].code,'INPUT');});
test('chain CLI reports honest partial/full results, regular input and sanitized usage failures',async t=>{const dir=await mkdtemp(path.join(os.tmpdir(),'handoff-cli-'));t.after(()=>rm(dir,{recursive:true,force:true}));const file=path.join(dir,'chain.json');for(const name of ['mixed','partial','human','resume','stack']){const raw=JSON.stringify(clone(name));await writeFile(file,raw);const p=spawnSync(process.execPath,[cli,'--mode','chain','--input',file,'--json'],{encoding:'utf8',cwd:dir});assert.equal(p.status,0,p.stdout+p.stderr);const r=JSON.parse(p.stdout);assert.equal(r.valid,true);assert(r.qa_report);assert.equal(await readFile(file,'utf8'),raw);}for(const args of [['--mode','chain','--input',dir],['--mode','chain','--input',file,'--format','json'],['--mode','chain','--input',file,'--input',file],['--input','https://user:secret@host.invalid'],['--mode','chain','--input','missing']]){const p=spawnSync(process.execPath,[cli,...args,'--json'],{encoding:'utf8'});assert.equal(p.status,2);assert(!p.stdout.includes('secret'));assert(!p.stderr);}const p=spawnSync(process.execPath,[cli,'--help'],{encoding:'utf8'});assert.equal(p.status,0);assert.match(p.stdout,/Installed/);});

function append(e,r,actor){const page=e.comment_pages.find(p=>p.ticket_id===r.ticket_id),comment={id:String(9000+page.comments.length),author_id:actor,update_author_id:actor,created:'2026-11-15T12:00:00Z',updated:'2026-11-15T12:00:00Z',format:'adf',body:JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:JSON.stringify(r)}]}]})};page.comments.push(comment);page.total=page.comments.length;return{ticket_id:r.ticket_id,comment_id:comment.id,record_id:r.record_id,digest:digestValue(r)};}
function beforeFirstPR(){const e=clone('stack'),parent=e.issues.find(x=>x.id==='1000'),child=e.issues.find(x=>x.id==='1001'),all=entries(e),firstParent=all.find(x=>x.r.ticket_id==='1000'&&x.r.kind==='admission'),firstChild=all.find(x=>x.r.ticket_id==='1001'&&x.r.kind==='admission'),root=all.find(x=>x.r.ticket_id==='1000'&&x.r.kind==='repair_request');for(const page of e.comment_pages){const keep=page.ticket_id==='1000'?all.filter(x=>x.p===page&&['admission','implementation','review','qa','repair_request'].includes(x.r.kind)).slice(0,5):[firstChild];page.comments=keep.map(x=>x.c);page.total=page.comments.length;}const reference=x=>({ticket_id:x.r.ticket_id,comment_id:x.c.id,record_id:x.r.record_id,digest:digestValue(x.r)});parent.pointer.assignment=reference(firstParent);parent.stage_id=e.trusted.projects[0].stages['Rework Queued'];parent.published_prs=parent.published_prs.slice(0,1);child.pointer.assignment=reference(firstChild);child.published_prs=[];child.required_requests=[];e.pr_receipts=e.pr_receipts.filter(p=>p.number==='10'&&p.source_revision==='1'.repeat(40)).map(p=>({...p,current:true}));const a=reference(firstChild),wait={...firstChild.r,record_id:'10000000-0000-4000-8000-000000000001',operation_id:firstChild.r.operation_id,assignment:a,role:'implementer',kind:'dependency_wait',from_stage:'In Progress',to_stage:'Rework Queued',payload:{pr:null,requests:[reference(root)],reason:'Wait for the declared upstream repair before publishing the first PR.',qa_report:null}};const w=append(e,wait,'implementer');child.stage_id=e.trusted.projects[0].stages['Rework Queued'];e.target=w;return{e,a,w};}
test('all nine kinds have usable supplied-chain targets, including queued stack and authorization',()=>{for(const kind of ['admission','implementation','review']){const e=clone('human'),x=entries(e).find(x=>x.r.kind===kind);e.target={ticket_id:x.r.ticket_id,comment_id:x.c.id,record_id:x.r.record_id,digest:digestValue(x.r)};e.issues[0].stage_id=e.trusted.projects[0].stages[x.r.to_stage];const r=run(e);assert.equal(r.valid,true,kind+JSON.stringify(r.diagnostics));assert.equal(r.completion_established,false);}const {e}=beforeFirstPR();assert.equal(run(e).valid,true,JSON.stringify(run(e).diagnostics));const auth=clone('resume'),a=entries(auth).find(x=>x.r.kind==='resume_authorization');auth.comment_pages[0].comments=auth.comment_pages[0].comments.filter(c=>c.id!==auth.target.comment_id);auth.comment_pages[0].total--;auth.target={ticket_id:a.r.ticket_id,comment_id:a.c.id,record_id:a.r.record_id,digest:digestValue(a.r)};auth.issues[0].stage_id=auth.trusted.projects[0].stages.QA;assert.equal(run(auth).valid,true,JSON.stringify(run(auth).diagnostics));const {e:stack}=queuedStackTarget();assert.equal(run(stack).valid,true,JSON.stringify(run(stack).diagnostics));});
test('documented pre-first-PR dependency wait permits null-PR repair only with complete no-publication history',()=>{const {e,a,w}=beforeFirstPR(),child=e.issues.find(x=>x.id==='1001'),old=entries(e).find(x=>x.r.record_id===a.record_id).r,uuid='10000000-0000-4000-8000-000000000002',admission={...old,record_id:uuid,operation_id:uuid,from_stage:'Rework Queued',payload:{...old.payload,mode:'repair',previous_assignment:a,requests:[w],existing_pr:null}},ref=append(e,admission,'manager');e.target=ref;child.pointer.assignment=ref;child.stage_id=e.trusted.projects[0].stages['In Progress'];const r=run(e);assert.equal(r.valid,true,JSON.stringify(r.diagnostics));child.pr_history_complete=false;assert.equal(run(e).valid,false);child.pr_history_complete=true;child.published_prs=[{provider:'github',repository:e.trusted.projects[0].repositories[0],number:'99'}];assert.equal(run(e).valid,false);});
test('a second explicit blocker authorization retains one current leaf on the same assignment',()=>{const e=clone('resume'),q=target(e),oldReport=structuredClone(q.r.payload.report);for(const s of oldReport.steps){s.result='NOT_RUN';s.evidence=[];s.not_run_reason='A later access blocker prevents remaining execution.';}q.r.kind='blocked';q.r.to_stage='Blocked';q.r.payload={pr:q.r.payload.pr,basis:q.r.payload.review,reason:'access',detail:'Prepared access failed again.',human_action:'Restore prepared access.',evidence:[],qa_report:oldReport};q.c.body=JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:JSON.stringify(q.r)}]}]});seal(e);const blocker={...e.target},authTemplate=entries(e).find(x=>x.r.kind==='resume_authorization').r,auth={...authTemplate,record_id:'10000000-0000-4000-8000-000000000003',payload:{...authTemplate.payload,blocked_result:blocker}},a=append(e,auth,'human'),original=target(clone('resume')).r,final={...original,record_id:'10000000-0000-4000-8000-000000000004',resume_authorization:a};e.target=append(e,final,'qa');const r=run(e);assert.equal(r.valid,true,JSON.stringify(r.diagnostics));assert.deepEqual(JSON.parse(JSON.stringify(r.validated_leaf)),e.target);});
test('declared preparation requires exact hashed artifacts and consumers without changing requirements',()=>{const e=clone('human'),work=JSON.parse(e.requirements[0].body);work.testing_strategy.preparation=[{id:'PREP-1',owner:'implementer',supplies:'Prepared review evidence for the unchanged human case.',used_by:['HQA-01'],preserves:['AC-01']}];e.requirements[0].body=JSON.stringify(work);const req=digestValue(work);e.requirements[0].digest=req;e.issues[0].requirements_digest=req;for(const x of entries(e))mutateRecord(e,x.r.record_id,r=>r.requirements_digest=req);for(const o of e.evidence_receipts)if(o.details.requirements_digest)o.details.requirements_digest=req;const imp=entries(e).find(x=>x.r.kind==='implementation'),uri='https://evidence.example.invalid/prepared',hash='sha256:'+'f'.repeat(64);e.trusted.projects[0].evidence_uris.push(uri);e.evidence_receipts.push({uri,observed_digest:hash,available:true,actor_id:'observer',pr:imp.r.payload.pr,kind:'preparation',details:{preparation_id:'PREP-1',requirements_digest:req,consumers:['HQA-01']}});mutateRecord(e,imp.r.record_id,r=>r.payload.prepared_inputs=[{id:'PREP-1',artifacts:[{label:'Prepared human review input',uri,digest:hash}]}]);assert.equal(run(e).valid,true,JSON.stringify(run(e).diagnostics));e.evidence_receipts.at(-1).observed_digest='sha256:'+'e'.repeat(64);assert.equal(run(e).valid,false);});

test('case-specific reuse retains the exact previously completed step and requires its linked report',()=>{const e=clone('resume'),q=target(e),b=entries(e).find(x=>x.r.kind==='blocked'),first=q.r.payload.report.steps[0];mutateRecord(e,b.r.record_id,r=>r.payload.qa_report.steps[0]=structuredClone(first));const blocker=entries(e).find(x=>x.r.kind==='blocked'),source={ticket_id:blocker.r.ticket_id,comment_id:blocker.c.id,record_id:blocker.r.record_id,digest:digestValue(blocker.r)},uri='https://evidence.example.invalid/case-reuse',work=JSON.parse(e.requirements[0].body),caseId=work.testing_strategy.cases.find(c=>c.steps.some(s=>s.id===first.id)).id;e.trusted.projects[0].evidence_uris.push(uri);e.evidence_receipts.push({uri,observed_digest:null,available:true,actor_id:'observer',pr:q.r.payload.pr,kind:'reuse',details:{case_id:caseId,step_id:first.id,basis:'This exact completed observation remains applicable at the unchanged source revision; no completed action is replayed.',source}});mutateRecord(e,e.target.record_id,r=>r.payload.report.steps[0].reused_from={label:'Case-specific reuse report',uri,digest:null});assert.equal(run(e).valid,true,JSON.stringify(run(e).diagnostics));const missingEnvironment=structuredClone(e);missingEnvironment.evidence_receipts=missingEnvironment.evidence_receipts.filter(x=>x.kind!=='environment');assert.equal(run(missingEnvironment).valid,false);assert(run(missingEnvironment).diagnostics.some(x=>x.code==='EVIDENCE'));e.evidence_receipts.at(-1).details.step_id='unknown';assert.equal(run(e).valid,false);});
rejects('parent completion with a newer unresolved root cannot queue its child',e=>{const parentQA=entries(e).filter(x=>x.r.ticket_id==='1000'&&x.r.kind==='qa').at(-1),basis={ticket_id:'1000',comment_id:parentQA.c.id,record_id:parentQA.r.record_id,digest:digestValue(parentQA.r)},old=entries(e).find(x=>x.r.kind==='repair_request').r,newRequest={...old,record_id:'10000000-0000-4000-8000-000000000005',assignment:parentQA.r.assignment,operation_id:parentQA.r.operation_id,payload:{...old.payload,basis,pr:parentQA.r.payload.pr}};append(e,newRequest,'human');},'REPAIR','stack');
test('an explicit verified resolution cannot waive an unrelated outstanding root',()=>{const e=clone('repair'),request=entries(e).find(x=>x.r.kind==='repair_request'),r={ticket_id:request.r.ticket_id,comment_id:request.c.id,record_id:request.r.record_id,digest:digestValue(request.r)};e.request_resolutions=[{request:r,completion:e.target}];assert.equal(run(e).valid,true,JSON.stringify(run(e).diagnostics));const old=entries(e).find(x=>x.r.kind==='qa');e.request_resolutions[0].completion={ticket_id:old.r.ticket_id,comment_id:old.c.id,record_id:old.r.record_id,digest:digestValue(old.r)};assert.equal(run(e).valid,false);});


test('raw finite exponent requirements retain AST provenance while unsafe integer literals reject',()=>{const e=clone(),w=JSON.parse(e.requirements[0].body),context=JSON.parse(e.requirements[0].context_body);w.testing_strategy.cases[0].steps[0].inputs.amount='FLOAT';context.operations[0].contract=structuredClone(w.testing_strategy.cases[0].steps[0]);const raw=JSON.stringify(w).replace('"FLOAT"','1e20'),facts=JSON.stringify(context).replace('"FLOAT"','1e20'),req='sha256:'+createHash('sha256').update(canonicalize(JSON.parse(raw))).digest('hex');e.requirements[0].body=raw;e.requirements[0].context_body=facts;e.requirements[0].digest=req;e.issues[0].requirements_digest=req;for(const x of entries(e))mutateRecord(e,x.r.record_id,r=>r.requirements_digest=req);for(const x of e.evidence_receipts)if(x.details.requirements_digest)x.details.requirements_digest=req;assert.equal(run(e).valid,true,JSON.stringify(run(e).diagnostics));e.requirements[0].body=raw.replace('1e20','9007199254740993');const result=run(e);assert.equal(result.valid,false);assert(result.diagnostics.some(d=>d.code==='NUMBER'));});

test('repair admission captures the prior head while current implementation/review/QA advance the same PR',()=>{for(const name of ['repair','stack']){const e=clone(name),admissions=entries(e).filter(x=>x.r.kind==='admission'&&x.r.payload.mode==='repair');assert(admissions.length);for(const a of admissions){const own=e.pr_receipts.find(p=>p.provider===a.r.payload.existing_pr.provider&&p.repository===a.r.payload.existing_pr.repository&&p.number===a.r.payload.existing_pr.number&&p.current);assert.notEqual(a.r.payload.existing_pr.source_revision,own.source_revision);}assert.equal(run(e).valid,true,JSON.stringify(run(e).diagnostics));}const e=clone('repair'),a=entries(e).filter(x=>x.r.kind==='admission').at(-1),ref={ticket_id:a.r.ticket_id,comment_id:a.c.id,record_id:a.r.record_id,digest:digestValue(a.r)};e.target=ref;e.issues[0].stage_id=e.trusted.projects[0].stages['In Progress'];assert.equal(run(e).valid,false,'Selecting the admission itself must still require its current observed PR facts.');for(const p of e.pr_receipts)p.current=p.source_revision===a.r.payload.existing_pr.source_revision;assert.equal(run(e).valid,true,JSON.stringify(run(e).diagnostics));});
rejects('historical repair admission still requires its exact observed old PR receipt',e=>{const a=entries(e).filter(x=>x.r.kind==='admission').at(-1);e.pr_receipts=e.pr_receipts.filter(p=>p.source_revision!==a.r.payload.existing_pr.source_revision);},'PR','repair');
function transformOwnPRs(e,key,value){const walk=v=>{if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){if(k===key)v[k]=value;else if(x&&typeof x==='object')walk(x);}};walk(e);for(const x of entries(e)){walk(x.r);x.c.body=JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:JSON.stringify(x.r)}]}]});}return seal(e);}
test('another allowed project repository cannot satisfy the assigned ticket, while coherent retargets remain valid',()=>{for(const name of ['human','repair','stack']){const e=clone(name),other='https://example.invalid/another/application';e.trusted.projects[0].repositories.push(other);assert.equal(run(e).valid,true);transformOwnPRs(e,'repository',other);const r=run(e);assert.equal(r.valid,false);assert(r.diagnostics.some(d=>d.code==='PR'&&d.path.endsWith('/repository')));}const e=clone('human');transformOwnPRs(e,'target_branch','owner-approved-retarget');assert.equal(run(e).valid,true,JSON.stringify(run(e).diagnostics));assert.equal(run(clone('stack')).valid,true,'The recorded stacked target differs from requirements base_branch and remains valid.');});
test('chain diagnostics never echo undeclared keys from schema, parser, requirements or comment wrappers in either output format',async t=>{const dir=await mkdtemp(path.join(os.tmpdir(),'chain-safe-path-'));t.after(()=>rm(dir,{recursive:true,force:true}));const secret='https://user:FICTITIOUS-SECRET@example.invalid/private-report',key=JSON.stringify(secret),cases=[];{const e=clone();e[secret]=true;cases.push([JSON.stringify(e),'']);}{const e=clone();e.trusted.projects[0][secret]={uri:'https://user:FICTITIOUS-SECRET@example.invalid'};cases.push([JSON.stringify(e),'/trusted/projects/0']);}{const e=clone();cases.push([JSON.stringify(e).replace('"schema":"pigboard-receipt-input/v1"',`"schema":"pigboard-receipt-input/v1",${key}:0,${key}:1`),'']);}{const e=clone();e.requirements[0].body=e.requirements[0].body.replace('"schema":"pigboard-ticket/v1"',`"schema":"pigboard-ticket/v1",${key}:9007199254740993`);cases.push([JSON.stringify(e),'/requirements/0/body']);}{const e=clone();const x=target(e),doc=JSON.parse(x.c.body);doc.content[0].content[0].text=doc.content[0].content[0].text.replace('"schema":"pigboard-handoff/v1"',`"schema":"pigboard-handoff/v1",${key}:9007199254740993`);x.c.body=JSON.stringify(doc);cases.push([JSON.stringify(e),'/comment_pages/0/comments/3/body']);}
for(const [i,[raw,safePath]]of cases.entries()){const r=validateReceiptChain(raw);assert.equal(r.valid,false);assert(r.diagnostics.some(d=>d.path===safePath),JSON.stringify(r.diagnostics));assert(!JSON.stringify(r).includes('FICTITIOUS-SECRET'));const file=path.join(dir,'input-'+i+'.json');await writeFile(file,raw);for(const json of [false,true]){const p=spawnSync(process.execPath,[cli,'--mode','chain','--input',file,...(json?['--json']:[])],{encoding:'utf8'});assert.equal(p.status,1);assert(!p.stdout.includes('FICTITIOUS-SECRET'));assert(!p.stdout.includes('private-report'));assert(!p.stderr);}assert.equal(await readFile(file,'utf8'),raw);}});

function queuedStackTarget(){const e=clone('stack'),all=entries(e),request=all.find(x=>x.r.kind==='stack_update_request'),admission=all.find(x=>x.r.record_id===request.r.assignment.record_id),child=e.issues.find(x=>x.id===request.r.ticket_id),page=request.p;page.comments=all.filter(x=>x.p===page&&(x.r.operation_id===admission.r.operation_id||x.r.record_id===request.r.record_id)).map(x=>x.c);page.total=page.comments.length;child.pointer.assignment=request.r.assignment;child.stage_id=e.trusted.projects[0].stages['Rework Queued'];e.target={ticket_id:request.r.ticket_id,comment_id:request.c.id,record_id:request.r.record_id,digest:digestValue(request.r)};e.pr_receipts=e.pr_receipts.filter(p=>p.number!==request.r.payload.child_pr.number||p.source_revision===request.r.payload.child_pr.source_revision).map(p=>p.number===request.r.payload.child_pr.number?{...p,current:true}:p);return{e,request};}
test('selected stack queue requires the child current head, while consumed historical requests retain their old head',()=>{const {e,request}=queuedStackTarget();assert.equal(run(e).valid,true,JSON.stringify(run(e).diagnostics));const old=e.pr_receipts.find(p=>p.number===request.r.payload.child_pr.number);old.current=false;e.pr_receipts.push({...old,source_revision:'f'.repeat(40),current:true});const r=run(e);assert.equal(r.valid,false);assert(r.diagnostics.some(d=>d.code==='PR'&&d.path.endsWith('/payload/child_pr')),JSON.stringify(r.diagnostics));assert.equal(run(clone('stack')).valid,true,'A historical request consumed by later repaired QA retains its original child head.');});
test('selected stack queue requires the child current target without changing queued PR state policy',()=>{const changed=queuedStackTarget(),current=changed.e.pr_receipts.find(p=>p.number===changed.request.r.payload.child_pr.number);current.target_branch='different-current-target';const r=run(changed.e);assert.equal(r.valid,false);assert(r.diagnostics.some(d=>d.code==='PR'&&d.path.endsWith('/payload/pr')),JSON.stringify(r.diagnostics));for(const state of ['open','merged','closed','unknown']){const {e,request}=queuedStackTarget();e.pr_receipts.find(p=>p.number===request.r.payload.child_pr.number).state=state;assert.equal(run(e).valid,true,state+JSON.stringify(run(e).diagnostics));}});

// Each snapshot retains exact earlier comment bytes while removing future records.
function firstPRSnapshot(kind='qa',repeated=false){
 const e=clone('first_pr_after_wait'),child=e.issues.find(i=>i.id==='1001'),page=e.comment_pages.find(p=>p.ticket_id==='1001');
 if(repeated){
  const all=entries(e).filter(x=>x.r.ticket_id==='1001'),a=all.find(x=>x.r.kind==='admission'&&x.r.payload.mode==='repair'),wait=all.find(x=>x.r.kind==='dependency_wait'),later=all.filter(x=>['implementation','review','qa'].includes(x.r.kind));
  page.comments=page.comments.filter(c=>!later.some(x=>x.c===c));page.total=page.comments.length;
  const w={...wait.r,record_id:'20000000-0000-4000-8000-000000000001',assignment:child.pointer.assignment,operation_id:a.r.operation_id},wr=append(e,w,'implementer'),uuid='20000000-0000-4000-8000-000000000002',ar=append(e,{...a.r,record_id:uuid,operation_id:uuid,payload:{...a.r.payload,previous_assignment:child.pointer.assignment,requests:[wr]}},'manager');
  child.pointer.assignment=ar;
  let predecessor;for(const x of later){x.r.assignment=ar;x.r.operation_id=uuid;if(x.r.kind==='implementation')x.r.payload.consumed_requests=[wr];if(x.r.kind==='review')x.r.payload.implementation=predecessor;if(x.r.kind==='qa')x.r.payload.review=predecessor;predecessor=append(e,x.r,x.c.author_id);}seal(e);
 }
 const all=entries(e).filter(x=>x.r.ticket_id==='1001'),chosen=all.find(x=>x.r.kind===kind&&(kind!=='admission'||x.r.record_id===child.pointer.assignment.record_id)),index=all.indexOf(chosen);
 page.comments=all.slice(0,index+1).map(x=>x.c);page.total=page.comments.length;e.target={ticket_id:chosen.r.ticket_id,comment_id:chosen.c.id,record_id:chosen.r.record_id,digest:digestValue(chosen.r)};child.stage_id=e.trusted.projects[0].stages[chosen.r.to_stage];
 if(kind==='admission')child.published_prs=[];
 return e;
}
for(const repeated of [false,true])test('first PR immutable historical admission through complete stages, repeated='+repeated,()=>{
 let old;
 for(const kind of ['admission','implementation','review','qa']){
  const e=firstPRSnapshot(kind,repeated),a=entries(e).filter(x=>x.r.ticket_id==='1001'&&x.r.kind==='admission'),bytes=a.map(x=>x.c.body),raw=JSON.stringify(e),r=run(e);
  assert.equal(r.valid,true,kind+JSON.stringify(r.diagnostics));assert.equal(r.completion_established,kind==='qa');assert.equal(r.validation_scope,'supplied_receipts');assert.equal(r.live_freshness,'not_evaluated');assert.equal(JSON.stringify(e),raw);if(old)assert.deepEqual(bytes,old);old=bytes;
 }
 const e=firstPRSnapshot('implementation',repeated),a=entries(e).find(x=>x.r.record_id===e.issues.find(i=>i.id==='1001').pointer.assignment.record_id);e.target={...e.issues.find(i=>i.id==='1001').pointer.assignment};assert.equal(run(e).valid,false,'Fresh admission target cannot use historical publication exception');
});
function firstPRPartial(kind,repeated){const e=firstPRSnapshot('implementation',repeated),x=target(e),oldWait=entries(e).find(x=>x.r.ticket_id==='1001'&&x.r.kind==='dependency_wait'),pr=x.r.payload.pr;
 mutateRecord(e,x.r.record_id,r=>{r.kind=kind;r.to_stage=kind==='blocked'?'Blocked':'Rework Queued';r.payload=kind==='blocked'?{pr,basis:null,reason:'access',detail:'Prepared access became unavailable after first publication.',human_action:'Restore prepared access.',evidence:[],qa_report:null}:{pr,requests:oldWait.r.payload.requests,reason:'Known upstream repair remains outstanding after publication.',qa_report:null};});e.issues.find(i=>i.id==='1001').stage_id=e.trusted.projects[0].stages[kind==='blocked'?'Blocked':'Rework Queued'];return e;}
for(const kind of ['dependency_wait','blocked'])for(const repeated of [false,true])test('first PR partial '+kind+' validates full kind rules, repeated='+repeated,()=>{const e=firstPRPartial(kind,repeated),r=run(e);assert.equal(r.valid,true,JSON.stringify(r.diagnostics));assert.equal(r.completion_established,false);const id=e.target.record_id;mutateRecord(e,id,r=>r.operation_id='90000000-0000-4000-8000-000000000001');assert.equal(run(e).valid,false);});
for(const [label,change,code]of[
 ['incomplete inventory',e=>e.issues.find(i=>i.id==='1001').pr_history_complete=false,'REPAIR'],
 ['missing publication',e=>e.issues.find(i=>i.id==='1001').published_prs=[],'PR'],
 ['extra publication',e=>e.issues.find(i=>i.id==='1001').published_prs.push({...e.issues.find(i=>i.id==='1001').published_prs[0],number:'999'}),'REPAIR'],
 ['invalid successful CI',e=>e.evidence_receipts.filter(x=>x.kind==='ci'&&x.pr?.number==='11').forEach(x=>x.details.status='failed'),'EVIDENCE'],
 ['wrong consumed wait',e=>mutateRecord(e,e.target.record_id,r=>r.payload.consumed_requests=[]),'REPAIR'],
 ['missing exact prior admission',e=>mutateRecord(e,e.issues.find(i=>i.id==='1001').pointer.assignment.record_id,r=>r.payload.previous_assignment.comment_id='99999'),'REFERENCE'],
 ['mismatched intermediate assigned wait',e=>mutateRecord(e,e.issues.find(i=>i.id==='1001').pointer.assignment.record_id,r=>r.payload.requests=[entries(e).find(x=>x.r.ticket_id==='1001'&&x.r.kind==='admission'&&x.r.payload.mode==='repair').r.payload.requests[0]]),'REPAIR']
])test('historical first PR rejects '+label,()=>{const e=firstPRSnapshot('implementation',true);change(e);const raw=JSON.stringify(e),r=run(e);assert.equal(r.valid,false,JSON.stringify(r));assert(r.diagnostics.some(d=>d.code===code),JSON.stringify(r.diagnostics));assert.equal(r.completion_established,false);assert.equal(JSON.stringify(e),raw);});
test('first publication CLI snapshots preserve immutable inputs and readable boundaries',async t=>{const dir=await mkdtemp(path.join(os.tmpdir(),'first-pr-chain-'));t.after(()=>rm(dir,{recursive:true,force:true}));for(const kind of ['admission','implementation','review','qa','dependency_wait','blocked']){const e=['dependency_wait','blocked'].includes(kind)?firstPRPartial(kind,true):firstPRSnapshot(kind,true),file=path.join(dir,kind+'.json'),raw=JSON.stringify(e);await writeFile(file,raw);for(const json of [true,false]){const p=spawnSync(process.execPath,[cli,'--mode','chain','--input',file,...(json?['--json']:[])],{cwd:dir,encoding:'utf8'});assert.equal(p.status,0,p.stdout+p.stderr);}assert.equal(await readFile(file,'utf8'),raw);}});

// These inputs represent canonical observations only; no helper execution occurs.
test('incomplete QA can report missing deployment and retain defects on block or real upstream wait', async () => {
  const { partialFixtures, targetRecord, records } = await import('./fixtures/qa-partial-results.mjs');
  const cases = partialFixtures();
  for (const name of ['blocked-no-environment', 'blocked-retained-fail', 'wait-retained-fail', 'old-blocked', 'old-wait', 'human-static']) {
    const e = cases[name], before = JSON.stringify(e), r = run(e), target = targetRecord(e);
    assert.equal(r.valid, true, name + JSON.stringify(r.diagnostics));
    assert.equal(r.completion_established, name === 'human-static');
    assert.deepEqual(JSON.parse(JSON.stringify(r.qa_report)), target.payload.qa_report ?? target.payload.report ?? null);
    assert.deepEqual(r.human_pending, name === 'old-wait' ? null : ['HQA-01']); assert.equal(JSON.stringify(e), before);
    if (name.includes('retained-fail')) {
      assert.equal(r.qa_report.steps[0].result, 'FAIL'); assert.deepEqual(r.qa_report.steps[0].finding_ids, ['F1']);
      assert.equal(target.payload.findings[0].id, 'F1'); assert(target.payload.findings[0].evidence.length);
      assert(r.qa_report.steps.slice(1).every(s => s.result === 'NOT_RUN' && s.finding_ids.includes('F1')));
    }
  }
  assert(cases['blocked-no-environment'].evidence_receipts.every(x => x.kind !== 'environment'));
  assert(run(cases['blocked-no-environment']).qa_report.steps.every(x => x.result === 'NOT_RUN'));
  const wait = targetRecord(cases['wait-retained-fail']), upstream = records(cases['wait-retained-fail']).find(x => x.r.record_id === wait.payload.requests[0].record_id).r;
  assert.equal(upstream.kind, 'repair_request'); assert.notEqual(upstream.ticket_id, wait.ticket_id);
});
test('partial results retain environment, evidence, finding, ledger and authority boundaries', async () => {
  const { partialFixtures, targetRecord, changeTarget } = await import('./fixtures/qa-partial-results.mjs');
  const cases = partialFixtures();
  for (const [name, code] of [['success-no-environment', 'EVIDENCE'], ['blocked-fail-no-environment', 'EVIDENCE'], ['wait-fail-no-environment', 'EVIDENCE'], ['blocked-pass-no-environment', 'EVIDENCE'], ['wait-pass-no-environment', 'EVIDENCE'], ['blank-finding-id', 'REPAIR'], ['malformed-finding', 'STRUCTURE'], ['non-qa-findings', 'STRUCTURE'], ['missing-finding-evidence', 'STRUCTURE'], ['duplicate-finding-id', 'REPAIR'], ['unknown-finding-id', 'LEDGER'], ['blank-finding', 'REPAIR'], ['missing-result-evidence', 'STRUCTURE'], ['altered-human-list', 'LEDGER'], ['missing-findings', 'LEDGER']]) {
    const e = cases[name], before = JSON.stringify(e), r = run(e);
    assert.equal(r.valid, false, name); assert.equal(r.completion_established, false);
    assert(r.diagnostics.some(x => x.code === code), name + JSON.stringify(r.diagnostics)); assert.equal(JSON.stringify(e), before);
  }
  for (const name of ['blocked-retained-fail', 'wait-retained-fail']) {
    for (const mutate of [e => e.evidence_receipts.find(x => x.uri.endsWith('/finding')).available = false, e => e.evidence_receipts.find(x => x.kind === 'environment').actor_id = 'stranger', e => e.pr_receipts[0].source_revision = 'f'.repeat(40), e => target(e).c.author_id = 'stranger']) {
      const e = structuredClone(cases[name]); mutate(e); assert.equal(run(e).valid, false, name);
    }
    const pass = structuredClone(cases[name]); changeTarget(pass, r => { r.payload.qa_report.steps[0].result = 'PASS'; r.payload.qa_report.steps[0].finding_ids = []; });
    assert.equal(run(pass).valid, true, JSON.stringify(run(pass).diagnostics)); pass.evidence_receipts = pass.evidence_receipts.filter(x => x.kind !== 'environment'); assert.equal(run(pass).valid, false);
    const skipped = structuredClone(cases[name]); changeTarget(skipped, r => { for (const s of r.payload.qa_report.steps) { s.result = 'NOT_RUN'; s.not_run_reason = 'No further work was run.'; } });
    assert.equal(run(skipped).valid, true); skipped.evidence_receipts.find(x => x.uri.endsWith('/finding')).available = false; assert.equal(run(skipped).valid, false);
  }
});
test('fixture preparation preserves every input hash and refuses to overwrite evidence', async t => {
  const { preparePartialFixtures, partialFixtures, targetRecord } = await import('./fixtures/qa-partial-results.mjs');
  const dir = await mkdtemp(path.join(os.tmpdir(), 'partial-preparation-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const out = path.join(dir, 'inputs'), hashes = await preparePartialFixtures(out);
  for (const [name, e] of Object.entries(partialFixtures())) {
    const raw = await readFile(path.join(out, name + '.json')), yaml = await readFile(path.join(out, name + '.yaml'));
    assert.equal(createHash('sha256').update(raw).digest('hex'), hashes[name + '.json']);
    assert.equal(createHash('sha256').update(yaml).digest('hex'), hashes[name + '.yaml']);
    assert.deepEqual(JSON.parse(raw), e);
    const { validateHandoff } = await import('../lib/contracts/handoff.mjs');
    const record = validateHandoff(yaml); if (record.valid) assert.equal(record.record_digest, digestValue(targetRecord(e)));
  }
  await assert.rejects(preparePartialFixtures(out), { code: 'EEXIST' });
});

// An intermediate skipped prerequisite must not sever the declared finding chain.
test('transitive skipped prerequisites retain the original finding at the final consumer', async () => {
  const { transitiveFixtures } = await import('./fixtures/qa-partial-results.mjs');
  const inputs = transitiveFixtures();
  for (const kind of ['repair', 'blocked', 'wait']) {
    const complete = run(inputs['transitive-' + kind + '-three']);
    assert.equal(complete.valid, true, JSON.stringify(complete.diagnostics));
    const omitted = run(inputs['transitive-' + kind + '-missing-last']);
    assert.equal(omitted.valid, false, kind + ': omitted final finding must reject');
    assert(omitted.diagnostics.some(x => x.code === 'LEDGER' && x.path.endsWith('/qa_report/steps/3/finding_ids')), JSON.stringify(omitted));
  }
});

// Expectations are independent of fixture preparation and validator decisions.
test('declared prerequisite matrix preserves complete partial evidence without inferring other edges', async () => {
  const { transitiveFixtures, targetRecord, records, partialFixtures } = await import('./fixtures/qa-partial-results.mjs');
  const inputs = transitiveFixtures();
  const validVariants = ['three', 'four', 'join', 'independent', 'ownership', 'binding', 'pass'];
  const invalidVariants = { 'missing-middle': ['LEDGER', '/steps/2/finding_ids'], 'missing-last': ['LEDGER', '/steps/3/finding_ids'], 'unknown-last': ['LEDGER', '/steps/3/finding_ids'], 'four-missing-last': ['LEDGER', '/steps/4/finding_ids'], 'join-missing-F1': ['LEDGER', '/steps/4/finding_ids'], 'join-missing-F2': ['LEDGER', '/steps/4/finding_ids'] };
  let examined = 0, valid = 0;
  for (const kind of ['repair', 'blocked', 'wait']) {
    const variants = [...validVariants, ...Object.keys(invalidVariants), 'empty', ...(kind === 'repair' ? ['empty-array'] : [])];
    for (const variant of variants) {
      const name = 'transitive-' + kind + '-' + variant, e = inputs[name], before = JSON.stringify(e), hash = createHash('sha256').update(before).digest('hex'), target = targetRecord(e), r = run(e);
      const expectedValid = validVariants.includes(variant) || (variant === 'empty' && kind !== 'repair');
      assert.equal(r.valid, expectedValid, name + JSON.stringify(r.diagnostics));
      assert.equal(r.completion_established, false, name);
      assert.equal(JSON.stringify(e), before, name);
      assert.equal(createHash('sha256').update(JSON.stringify(e)).digest('hex'), hash, name);
      if (expectedValid) {
        valid++;
        assert.deepEqual(JSON.parse(JSON.stringify(r.qa_report)), target.payload.qa_report, name);
        assert.deepEqual(r.human_pending, target.payload.qa_report.human_pending, name);
        assert.deepEqual(r.human_pending, ['HQA-01'], name);
        if (!['empty', 'pass'].includes(variant)) {
          assert.equal(r.qa_report.steps[0].result, 'FAIL', name);
          assert.deepEqual(r.qa_report.steps[0].finding_ids, ['F1'], name);
          assert(target.payload.findings[0].evidence.length, name);
        }
        if (variant === 'join') assert.deepEqual(r.qa_report.steps[4].finding_ids, ['F1', 'F2'], name);
        if (['independent', 'ownership', 'binding', 'pass', 'empty'].includes(variant)) assert(r.qa_report.steps.slice(1).every(x => x.finding_ids.length === 0), name);
        if (variant === 'empty') { assert(!Object.hasOwn(target.payload, 'findings')); assert(e.evidence_receipts.every(x => x.kind !== 'environment')); }
        if (kind === 'wait') {
          const reference = target.payload.requests[0], upstream = records(e).find(x => x.r.record_id === reference.record_id).r;
          assert.equal(upstream.kind, 'repair_request'); assert.notEqual(upstream.ticket_id, target.ticket_id);
          assert.equal(reference.digest, digestValue(upstream));
          const original = partialFixtures()['wait-retained-fail'];
          assert.deepEqual(e.requirements.find(x => x.ticket_id === upstream.ticket_id), original.requirements.find(x => x.ticket_id === upstream.ticket_id));
          assert.deepEqual(records(e).filter(x => x.r.ticket_id === upstream.ticket_id), records(original).filter(x => x.r.ticket_id === upstream.ticket_id));
          assert.equal(records(e).find(x => x.r.record_id === upstream.payload.basis.record_id).r.kind, 'qa');
        }
      } else {
        const [code, suffix] = invalidVariants[variant] ?? ['STRUCTURE', null];
        const expectedPath = suffix ? '/comment_pages/0/comments/3/body/payload/qa_report' + suffix : '/comment_pages/0/comments/3/body/payload/findings';
        assert(r.diagnostics.some(x => x.code === code && x.path === expectedPath), name + JSON.stringify(r.diagnostics));
      }
      examined++;
    }
  }
  assert.equal(examined, 43); assert.equal(valid, 23); assert.equal(Object.keys(inputs).length, examined);
});

// Explicit expectations for the missing execution identity, independent of parity.
test('executed QA requires a tested PR while exact proof and unexecuted exceptions remain usable', async () => {
  const { executionProofFixtures, partialFixtures, targetRecord, records } = await import('./fixtures/qa-partial-results.mjs');
  const { validateHandoff } = await import('../lib/contracts/handoff.mjs');
  const { stringify } = await import('yaml');
  const inputs = { ...executionProofFixtures(), 'human-static': partialFixtures()['human-static'] };
  let valid = 0, invalid = 0;
  for (const [name, e] of Object.entries(inputs)) {
    const before = JSON.stringify(e), hash = createHash('sha256').update(before).digest('hex'), target = targetRecord(e), r = run(e);
    const expectedValid = /-exact-(pass|fail)$|-not-run$/.test(name) || name === 'human-static';
    assert.equal(validateHandoff(stringify(target)).valid, true, name + ': partial null PR remains structurally valid');
    assert.equal(r.valid, expectedValid, name + JSON.stringify(r.diagnostics));
    assert.equal(r.completion_established, name === 'human-static', name);
    assert.equal(JSON.stringify(e), before, name);
    assert.equal(createHash('sha256').update(JSON.stringify(e)).digest('hex'), hash, name);
    if (expectedValid) {
      valid++;
      assert.deepEqual(JSON.parse(JSON.stringify(r.qa_report)), target.payload.qa_report ?? target.payload.report, name);
      assert.deepEqual(r.human_pending, ['HQA-01'], name);
      if (name === 'human-static') { assert.equal(r.ai_steps, 0); assert.deepEqual(r.qa_report.steps, []); assert(e.evidence_receipts.every(x => x.kind !== 'environment')); }
      if (name.endsWith('-not-run')) { assert.equal(target.payload.pr, null); assert(r.qa_report.steps.every(s => s.result === 'NOT_RUN')); assert(!e.evidence_receipts.some(x => x.kind === 'environment' && x.pr.number === '10')); }
    } else {
      invalid++;
      const base = '/comment_pages/0/comments/3/body/payload/';
      const [code, field] = name.endsWith('-real-null-environment') ? ['EVIDENCE', 'qa_report/environment'] : name.endsWith('-foreign-result') ? ['EVIDENCE', 'qa_report/steps/0/evidence/0'] : name.endsWith('-foreign-finding') ? ['EVIDENCE', 'findings/0/evidence/0'] : ['PR', 'pr'];
      assert(r.diagnostics.some(x => x.code === code && x.path === base + field), name + JSON.stringify(r.diagnostics));
    }
    if (name.startsWith('proof-wait-')) {
      const original = partialFixtures()['wait-retained-fail'], request = target.payload.requests[0], upstream = records(e).find(x => x.r.record_id === request.record_id).r;
      assert.equal(upstream.kind, 'repair_request'); assert.notEqual(upstream.ticket_id, target.ticket_id); assert.equal(request.digest, digestValue(upstream));
      assert.deepEqual(e.requirements.filter(x => x.ticket_id === upstream.ticket_id), original.requirements.filter(x => x.ticket_id === upstream.ticket_id));
      assert.deepEqual(e.comment_pages.filter(x => x.ticket_id === upstream.ticket_id), original.comment_pages.filter(x => x.ticket_id === upstream.ticket_id));
      assert.deepEqual(e.evidence_receipts.filter(x => x.pr?.number === '12'), original.evidence_receipts.filter(x => x.pr?.number === '12'));
      assert.equal(records(e).find(x => x.r.record_id === upstream.payload.basis.record_id).r.kind, 'qa');
    }
  }
  assert.equal(Object.keys(inputs).length, 19); assert.equal(valid, 7); assert.equal(invalid, 12);
});

// PGB-113 oracles and complete alternate graphs were frozen before correction.
// Synthetic fixture preparation is separate from immutable H02 chronology.
const repeated=fixtures.repeated_parent;
function checkRepeatedResult(result,expected,input,label){
 assert.equal(result.valid,expected.valid,label+JSON.stringify(result.diagnostics));assert.equal(result.completion_established,expected.completion_established,label);
 assert.equal(result.validation_scope,'supplied_receipts');assert.equal(result.live_freshness,'not_evaluated');
 if(expected.diagnostic)assert(result.diagnostics.some(d=>d.code===expected.diagnostic.code&&(!expected.diagnostic.path||d.path===expected.diagnostic.path)),label+JSON.stringify(result.diagnostics));
 if(expected.valid){assert.deepEqual(result.validated_leaf,input.target);if(expected.validated_leaf)assert.deepEqual(result.validated_leaf,expected.validated_leaf);if(expected.qa_report)assert.deepEqual(JSON.parse(JSON.stringify(result.qa_report)),expected.qa_report,label);if(result.outcome==='qa')assert.deepEqual(result.human_pending,target(input).r.payload.report.human_pending);}
}
function auditRepeated(input){
 const all=entries(input),locations=new Map(all.map(x=>[JSON.stringify([x.r.ticket_id,x.c.id]),x]));assert.equal(locations.size,all.length);
 const visit=v=>{if(!v||typeof v!=='object')return;if(v.ticket_id&&v.comment_id&&v.record_id&&v.digest){const x=locations.get(JSON.stringify([v.ticket_id,v.comment_id]));assert(x,'missing exact fixture reference');assert.equal(v.record_id,x.r.record_id);assert.equal(v.digest,digestValue(x.r));}for(const child of Object.values(v))visit(child);};
 let edges=0;for(const x of all){visit(x.r);const count=v=>{if(!v||typeof v!=='object')return;if(v.ticket_id&&v.comment_id&&v.record_id&&v.digest)edges++;for(const child of Object.values(v))count(child);};count(x.r);}
 for(const r of input.retained){visit(r);const x=locations.get(JSON.stringify([r.ticket_id,r.comment_id]));for(const key of ['author_id','update_author_id','created','updated'])assert.equal(r[key],x.c[key]);}
 for(const p of input.comment_pages){assert.equal(p.start_at,0);assert.equal(p.total,p.comments.length);assert.equal(p.is_last,true);}
 return{records:all.length,reference_occurrences:edges,repair_leaves:all.filter(x=>x.r.kind==='repair_request').length,bytes:Buffer.byteLength(JSON.stringify(input)),pages:input.comment_pages.map(p=>p.comments.length)};
}
test('repeated-parent fixtures retain independently sealed DAGs, exact phases and bounded layered topology',()=>{
 assert.equal(Object.keys(repeated.inputs).length,35);assert.deepEqual(Object.keys(repeated.inputs).filter(name=>name.startsWith('F1-')),Array.from({length:10},(_,i)=>'F1-'+String(i+1).padStart(2,'0')));
 for(const [name,input]of Object.entries(repeated.inputs))if(name.startsWith('F1-')){auditRepeated(input);for(const x of entries(input)){if(x.r.assignment){const a=entries(input).find(a=>a.r.record_id===x.r.assignment.record_id);assert(a&&a.r.kind==='admission');assert.equal(x.r.operation_id,x.r.kind==='stack_update_request'?x.r.record_id:a.r.operation_id);}}}
 for(const [name,input]of Object.entries(repeated.inputs))if(repeated.audits[name])assert.deepEqual(auditRepeated(input),repeated.audits[name],name);
 for(const [name,edges,budget]of [['layered-positive',256,545536],['layered-extra-r2',257,546304]]){const a=auditRepeated(repeated.inputs[name]);assert.deepEqual([a.records,a.reference_occurrences,a.repair_leaves,a.pages],[68,edges,2,[14,50,4]]);assert.equal(256*(68+edges+1)*3+64*68**2,budget);assert.equal(repeated.layered_budgets[name],budget);assert(budget<2**20);assert(a.bytes<RECEIPT_LIMITS.bytes);}
 const base=repeated.inputs['c01-b2-qa-in-human-review'];for(const name of ['c01-b2-implementation-in-review','c01-b2-review-in-qa']){const e=structuredClone(repeated.inputs[name]);e.target=base.target;e.issues.find(i=>i.id==='1001').stage_id='5';assert.deepEqual(e,base);}
});
test('current implementation/review/QA accept authentic repeated-parent history while malformed semantic proof rejects',()=>{
 for(const [name,input]of Object.entries(repeated.inputs)){const raw=JSON.stringify(input),r=validateReceiptChain(raw);checkRepeatedResult(r,repeated.expected[name],input,name);assert.equal(JSON.stringify(input),raw);}
 // Cache state belongs to one call, even for unchanged UUIDs in altered envelopes.
 for(const name of ['c03-missing-u1-retained-metadata','c01-b2-qa-in-human-review','layered-extra-r2','layered-positive','c02-stale-u1-selected','c01-b2-qa-in-human-review','F1-05','F1-04','F1-09','F1-03'])checkRepeatedResult(run(repeated.inputs[name]),repeated.expected[name],repeated.inputs[name],name);
 const duplicated=structuredClone(repeated.inputs['c01-b2-qa-in-human-review']);duplicated.retained.push(structuredClone(duplicated.retained[0]));assert.equal(run(duplicated).valid,false,'Duplicate retained observations cannot choose authority by array order.');
});
test('source readable and JSON repeated-parent matrix uses absolute inputs from an unrelated cwd without writes',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'repeated-source-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 for(const[name,input]of Object.entries(repeated.inputs)){const raw=JSON.stringify(input),file=path.join(dir,name+'.json');await writeFile(file,raw);for(const json of [false,true]){const p=spawnSync(process.execPath,[cli,'--mode','chain','--input',file,...(json?['--json']:[])],{cwd:os.tmpdir(),encoding:'utf8',timeout:30000});assert.equal(p.status,repeated.expected[name].valid?0:1,name+p.stderr);assert.equal(p.stderr,'');if(json)checkRepeatedResult(JSON.parse(p.stdout),repeated.expected[name],input,name);else{assert(p.stdout.startsWith((repeated.expected[name].valid?'Valid':'Invalid')+' chain validation;'));if(repeated.expected[name].valid)assert(p.stdout.includes('completion established: '+repeated.expected[name].completion_established));if(repeated.expected[name].diagnostic){assert(p.stdout.includes(repeated.expected[name].diagnostic.code+' '));if(repeated.expected[name].diagnostic.path)assert(p.stdout.includes(JSON.stringify(repeated.expected[name].diagnostic.path)));}}}assert.equal(await readFile(file,'utf8'),raw);}
});
async function measuredReceiptCall(raw,validate,moduleURL){
 const {Session}=await import('node:inspector/promises'),session=new Session();session.connect();
 try{await session.post('Profiler.enable');await session.post('Profiler.startPreciseCoverage',{callCount:true,detailed:true});const result=validate(raw);const {result:coverage}=await session.post('Profiler.takePreciseCoverage');const scripts=coverage.filter(x=>x.url===moduleURL);assert.equal(scripts.length,1,'Require exactly the actual receipt module in precise coverage.');const entries=scripts[0].functions.reduce((sum,f)=>sum+f.ranges[0].count,0);return{result,entries};}finally{try{await session.post('Profiler.stopPreciseCoverage');}finally{session.disconnect();}}
}
test('source shared-DAG closures finish below the independently fixed whole-module entry budgets',async t=>{
 for(const name of ['layered-positive','layered-extra-r2']){const input=repeated.inputs[name],{result,entries}=await measuredReceiptCall(JSON.stringify(input),validateReceiptChain,new URL('../lib/contracts/receipts.mjs',import.meta.url).href);checkRepeatedResult(result,repeated.expected[name],input,name);assert(entries>0&&entries<=repeated.layered_budgets[name],`${name}: ${entries} > ${repeated.layered_budgets[name]}`);t.diagnostic(`${name}: ${entries} receipt-module entries <= ${repeated.layered_budgets[name]}`);}
});

const proofConflictFixtures=JSON.parse(readFileSync(new URL('./fixtures/manager-proof-conflicts.json',import.meta.url)));
test('private current inspection preserves complete fixed public results and retained-empty authority',()=>{
 for(const c of proofConflictFixtures.public_controls){
  const raw=JSON.stringify(c.input),before=raw,inspected=inspectManagerCompletion(raw);
  assert.deepEqual(Object.keys(inspected).sort(),['bindings','validation']);
  assert.deepEqual(JSON.parse(JSON.stringify(inspected.validation)),c.expected,c.name);
  assert.deepEqual(validateReceiptChain(raw),inspected.validation);
  assert.equal(c.input.retained.length,0);assert(inspected.bindings.length>0);
  assert.deepEqual([...new Set(inspected.bindings.map(b=>b.kind))].sort(),['comment','current','current_pr','evidence','pr','requirements','uuid']);
  for(const b of inspected.bindings){assert.deepEqual(Object.keys(b).sort(),['digest','key','kind']);assert.match(b.digest,/^sha256:[0-9a-f]{64}$/);}
  assert.deepEqual(inspectManagerCompletion(JSON.stringify(c.input,null,2)),inspected,'Envelope formatting does not change canonical observations.');
  assert.equal(JSON.stringify(c.input),before);
 }
 for(const raw of ['{}','not JSON',JSON.stringify({...proofConflictFixtures.public_controls[0].input,retained:[{}]})]){
  const r=inspectManagerCompletion(raw);assert.equal(r.validation.valid,false);assert.deepEqual(r.bindings,[]);assert.deepEqual(r.validation,validateReceiptChain(raw));
 }
});

test('five remaining observation boundaries retain canonical validity and authority separation',()=>{
 for(const c of proofConflictFixtures.invalid_public_controls){const r=inspectManagerCompletion(JSON.stringify(c.input));assert.deepEqual(JSON.parse(JSON.stringify(r.validation)),c.expected,c.name);assert.deepEqual(r.bindings,[]);}
 const requirementCase=proofConflictFixtures.cases.find(c=>c.id==='requirements-context-duplicate'),inspected=inspectManagerCompletion(requirementCase.snapshot.completion_receipts[0]);
 assert.equal(inspected.validation.valid,true);const requirements=inspected.bindings.filter(b=>b.kind==='requirements');assert.equal(requirements.length,2);assert.equal(requirements[0].key,requirements[1].key);assert.notEqual(requirements[0].digest,requirements[1].digest,'Keep every validated context before map overwrite.');
 const currentCase=proofConflictFixtures.cases.find(c=>c.id==='current-outer-unbound'),current=inspectManagerCompletion(currentCase.snapshot.completion_receipts[0]);assert.equal(current.validation.valid,true);assert.equal(current.validation.completion_established,false,'Valid current QA before Human Review grants no completion.');
 assert.equal(Object.keys(proofConflictFixtures.family_boundaries).length,7);
});

test('three distinct current envelopes export all 57 matching observation bindings',()=>{
 const F=proofConflictFixtures,c=F.cases.find(c=>c.id==='matching-shared-inventory-123'),expected=F.matching_overlap.expected_bindings;
 const sorted=bs=>structuredClone(bs).sort((a,b)=>JSON.stringify([a.kind,a.key,a.digest]).localeCompare(JSON.stringify([b.kind,b.key,b.digest]))),groups=new Map();
 assert.equal(expected.length,57);assert.equal(new Set(expected.map(b=>JSON.stringify([b.kind,b.key]))).size,57);
 for(const [index,raw]of c.snapshot.completion_receipts.entries()){
  const target=F.matching_overlap.targets[index],control=F.public_controls.find(c=>c.input.target.ticket_id===target.ticket_id),r=inspectManagerCompletion(raw);
  const validation=JSON.parse(JSON.stringify(r.validation));assert.deepEqual(validation,control.expected);assert.deepEqual(validation.target,target);
  assert.deepEqual(sorted(r.bindings),sorted(expected));assert.equal(new Set(r.bindings.map(b=>JSON.stringify([b.kind,b.key]))).size,57);
  for(const b of r.bindings){const key=JSON.stringify([b.kind,b.key]);if(!groups.has(key))groups.set(key,{digests:new Set(),participants:new Set()});groups.get(key).digests.add(b.digest);groups.get(key).participants.add(target.ticket_id);}
 }
 assert.equal(groups.size,57);
 for(const b of expected){const group=groups.get(JSON.stringify([b.kind,b.key]));assert.deepEqual([...group.digests],[b.digest]);assert.deepEqual([...group.participants],['1000','2000','3000']);}
});

test('manager history and strict current purposes preserve the complete audited paired contract',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/manager-repairs.json',import.meta.url))),pair=fixture.projection_pair,raw=pair.input;assert.equal(typeof raw,'string');
 const histories=[],currents=[];for(const mode of ['history','current','current','history','history','current']){const result=JSON.parse(JSON.stringify(mode==='history'?inspectManagerHistory(raw):validateReceiptChain(raw)));if(mode==='history'){assert.deepEqual(result,pair.expected_history);histories.push(result);}else{assert.deepEqual(result,pair.expected_current);currents.push(result);}assert.equal(pair.input,raw);}
 assert.equal(histories.length,3);assert.equal(currents.length,3);for(const h of histories)assert.deepEqual(h,histories[0]);for(const c of currents)assert.deepEqual(c,currents[0]);
});
test('manager history projects exact B1/B2/A3 role consumption, parents, coverage and authenticated inventories',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/manager-repairs.json',import.meta.url)));assert.deepEqual(fixture.projections.map(c=>c.id),['B1-at-A2','B2-at-final','A3-at-final']);
 for(const c of fixture.projections){const raw=c.input,before=JSON.stringify(c),result=JSON.parse(JSON.stringify(inspectManagerHistory(raw)));assert.deepEqual(result,c.expected,c.id);assert.equal(result.completion_established,false);assert.equal(result.execution_authorized,false);assert.deepEqual(JSON.parse(JSON.stringify(inspectManagerHistory(raw))),result);assert.equal(JSON.stringify(c),before);}
});

// Reuse the sealed68-node, two-root graph. Precise coverage counts only the actual
// production module; the harness and independent topology audit are excluded.
test('bounded historical coverage reuses sealed DAG outcomes and fixed module budgets',async t=>{
 const packet=JSON.parse(readFileSync(new URL('./fixtures/manager-repairs.json',import.meta.url)));assert.equal(packet.bounded_history_cases.length,2);
 for(const c of packet.bounded_history_cases){const input=JSON.parse(c.input),audit=auditRepeated(input);assert.equal(input.consumer,'manager');assert.deepEqual([audit.records,audit.reference_occurrences,audit.repair_leaves],[68,c.reference_occurrences,2]);assert.equal(c.module_entry_budget,256*(68+c.reference_occurrences+1)*3+64*68**2);const before=c.input,{result,entries}=await measuredReceiptCall(before,inspectManagerHistory,new URL('../lib/contracts/receipts.mjs',import.meta.url).href);assert.equal(result.valid,c.expected.valid,c.id+JSON.stringify(result.diagnostics));assert.equal(result.completion_established,false);assert.equal(result.execution_authorized,false);if(c.expected.diagnostic){assert(result.diagnostics.some(d=>d.code===c.expected.diagnostic.code&&d.path===c.expected.diagnostic.path));assert.deepEqual(result.records,[]);assert.deepEqual(result.coverage_segments,[]);assert.deepEqual(result.bindings,[]);}assert(entries>0&&entries<=c.module_entry_budget,c.id+': '+entries+' > '+c.module_entry_budget);assert.equal(c.input,before);t.diagnostic(c.id+': '+entries+' receipt-module entries <= '+c.module_entry_budget);}
});

test('historical shared inventories and early current/history negatives match full independent reports',()=>{
 const n=JSON.parse(readFileSync(new URL('./fixtures/manager-repairs.json',import.meta.url))).normalization,plain=v=>JSON.parse(JSON.stringify(v));assert.equal(n.positive_history_projections.length,3);assert.equal(n.canonical_controls.length,2);for(const c of n.positive_history_projections){assert.deepEqual(plain(inspectManagerHistory(c.input)),c.expected,c.id);assert.equal(c.expected.records.length,4);assert.equal(c.expected.bindings.length,57);}for(const c of n.canonical_controls)for(const mode of ['current','history','history','current'])assert.deepEqual(plain(mode==='current'?validateReceiptChain(c.input):inspectManagerHistory(c.input)),mode==='current'?c.expected_current:c.expected_history,c.id+' '+mode);for(const c of n.positive_history_projections)assert.deepEqual(plain(inspectManagerHistory(c.input)),c.expected,c.id+'after invalid calls');
});

// Recorded fixtures and expectations are prepared independently from immutable
// source publications. JSON normalization compares the declared wire domain.

// Adopted ordinary guarantee: missing prior capture alone no longer rejects N13.
// Its original supplied input is exactly P05 with one retained tuple removed.
function applyOrdinaryCaptureCut(packet){
 const missing=packet.rows.find(r=>r.id==='N13'),positive=packet.rows.find(r=>r.id==='P05');
 assert.deepEqual({...missing.input,retained:[]},{...positive.input,retained:[]});
 const absent=positive.input.retained.filter(r=>!missing.input.retained.some(n=>n.ticket_id===r.ticket_id&&n.comment_id===r.comment_id));assert.equal(absent.length,1);
 const r=absent[0],key=JSON.stringify([r.site,JSON.stringify([r.ticket_id,r.comment_id,r.record_id,r.digest])]);
 missing.modes=structuredClone(positive.modes);missing.expected_bindings=positive.expected_bindings.filter(b=>!(b.kind==='retained'&&b.key===key));
}
const recordedPacket=structuredClone(fixtures.recorded);applyOrdinaryCaptureCut(recordedPacket);
const plainRecorded=value=>JSON.parse(JSON.stringify(value));
async function recordedAPI(mode,input){const runtime=await import('../lib/contracts/receipts.mjs');return plainRecorded(mode==='recorded-history'?runtime.inspectRecordedHistory(input):runtime.inspectRecordedCompletion(input));}
function assertRecordedResult(result,expected,row,mode){
 const validation=mode==='recorded-history'?result:result.validation;
 assert.equal(validation.schema,'pigboard-recorded-handoff-validation/v1');assert.equal(validation.mode,mode);assert.equal(validation.purpose,mode);assert.equal(validation.validation_scope,'authenticated_recorded_handoffs');assert.equal(validation.basis,'authenticated_jira_handoff');assert.equal(validation.external_freshness,'not_evaluated');assert.equal(validation.execution_authorized,false);assert.equal(Object.hasOwn(validation,'completion_established'),false);assert.equal(validation.valid,expected.valid,row.id+': '+JSON.stringify(validation.diagnostics));
 if(expected.valid||!['STRUCTURE','NUMBER'].includes(expected.code))assert.deepEqual(validation.target,row.input.target);else assert.equal(validation.target,null);const actualBindings=mode==='recorded-history'?validation.bindings:result.bindings;
 if(expected.valid){assert.deepEqual(validation.diagnostics,[]);assert.deepEqual(actualBindings,row.expected_bindings,row.id+' full independently expected recorded/native bindings');if(mode==='recorded-history'){assert.equal(validation.recorded_completion_established,false);assert.deepEqual(validation.records,expected.records);assert.deepEqual(validation.coverage_segments,expected.coverage_segments);}else{assert.equal(validation.recorded_completion_established,true);assert.equal(validation.record_digest,row.input.target.digest);assert.equal(validation.outcome,'qa');assert.deepEqual(validation.validated_leaf,expected.leaf);assert.deepEqual(validation.qa_report,expected.qa_report);assert.equal(validation.ai_steps,expected.qa_report.steps.length);assert.deepEqual(validation.human_pending,expected.qa_report.human_pending);assert.equal(validation.no_ai_cases_reason,expected.qa_report.no_ai_cases_reason);}}
 else{assert.equal(validation.recorded_completion_established,false);assert.deepEqual(actualBindings,[]);if(mode==='recorded-history'){assert.deepEqual(validation.records,[]);assert.deepEqual(validation.coverage_segments,[]);}else assert.equal(validation.validated_leaf,null);assert(validation.diagnostics.some(d=>d.code===expected.code&&(!expected.path||d.path===expected.path)),row.id+': '+JSON.stringify(validation.diagnostics));}
}
test('recorded purposes distinguish exact historical targets from current completion',async()=>{
 const selected=recordedPacket.rows.filter(r=>['P01','P03','N04'].includes(r.id));assert.equal(selected.length,3);
 for(const row of selected)for(const [mode,expected]of Object.entries(row.modes)){const raw=JSON.stringify(row.input),before=raw;assert.equal(createHash('sha256').update(raw).digest('hex'),row.input_sha256);const result=await recordedAPI(mode,raw);assertRecordedResult(result,expected,row,mode);assert.equal(JSON.stringify(row.input),before);}
});


test('recorded finite30-row source packet and CLI preserve exact proof boundaries',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'recorded-source-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const ids=[...Array.from({length:6},(_,i)=>'P'+String(i+1).padStart(2,'0')),...Array.from({length:3},(_,i)=>'X'+String(i+1).padStart(2,'0')),...Array.from({length:17},(_,i)=>'N'+String(i+1).padStart(2,'0')),...Array.from({length:4},(_,i)=>'B'+String(i+1).padStart(2,'0'))];
 assert.equal(recordedPacket.row_count,30);assert.deepEqual(recordedPacket.rows.map(r=>r.id),ids);let states=0,invocations=0;
 const invoke=(mode,file,args=[])=>spawnSync(process.execPath,[cli,'--mode',mode,'--input',file,...args,'--json'],{cwd:dir,encoding:'utf8',timeout:30000});
 for(const row of recordedPacket.rows)for(const state of [row,...row.additional_states??[]]){
  states++;const raw=state.raw_input??JSON.stringify(state.input),file=path.join(dir,state.id+'.json');await writeFile(file,raw);assert.equal(createHash('sha256').update(raw).digest('hex'),state.input_sha256);
  for(const [mode,expected]of Object.entries(state.modes)){invocations++;const actual=await recordedAPI(mode,raw);assertRecordedResult(actual,expected,state,mode);const child=invoke(mode,file);assert.equal(child.stderr,'');assert.equal(child.status,expected.valid?0:1,state.id+child.stdout);assert.deepEqual(JSON.parse(child.stdout),actual,state.id+' exact source CLI/API parity');assert.equal(await readFile(file,'utf8'),raw);}
  if(row.strict_input){const strict=validateReceiptChain(JSON.stringify(row.strict_input));assert.equal(strict.valid,false);assert(strict.diagnostics.some(d=>d.code===row.strict_expected.code));const external=path.join(dir,row.id+'-strict.json');await writeFile(external,JSON.stringify(row.strict_input));const strictCLI=invoke('chain',external);assert.equal(strictCLI.status,1);assert.deepEqual(JSON.parse(strictCLI.stdout),plainRecorded(strict));const reduced=validateReceiptChain(raw);assert.equal(reduced.valid,false);assert(reduced.diagnostics.some(d=>d.code==='STRUCTURE'));assert.equal(invoke('chain',file).status,1);}
 }
 assert.equal(states,31);assert.equal(invocations,46);assert.equal(recordedPacket.state_count,31);assert.equal(recordedPacket.purpose_invocations,46);
 const base=validateReceiptChain(JSON.stringify(recordedPacket.strict_baseline));assert.equal(base.valid,true,JSON.stringify(base.diagnostics));const baseline=path.join(dir,'strict-baseline.json');await writeFile(baseline,JSON.stringify(recordedPacket.strict_baseline));assert.equal(invoke('chain',baseline).status,0);
 const b=recordedPacket.rows.find(r=>r.id==='B04').additional_checks,unknown=b.unknown_key,raw=JSON.stringify(unknown.input),file=path.join(dir,'unknown.json');await writeFile(file,raw);const unknownResult=await recordedAPI(unknown.mode,raw);assert.equal(unknownResult.valid,false);assert(unknownResult.diagnostics.some(d=>d.code==='STRUCTURE'));assert(!JSON.stringify(unknownResult).includes('SECRET_UNKNOWN'));assert.equal(invoke(unknown.mode,file).status,1);
 const misuse=invoke(b.format_misuse.mode,path.join(dir,'MISSING_SECRET_INPUT'),['--format',b.format_misuse.format]);assert.equal(misuse.status,2);assert.equal(JSON.parse(misuse.stdout).diagnostics[0].code,'USAGE');assert(!misuse.stdout.includes('MISSING_SECRET'));
 for(const [id,mode]of [['P01','recorded-completion'],['P03','recorded-history']]){const row=recordedPacket.rows.find(r=>r.id===id),file=path.join(dir,id+'.json'),human=spawnSync(process.execPath,[cli,'--mode',mode,'--input',file],{cwd:dir,encoding:'utf8',timeout:30000});assert.equal(human.status,0,human.stdout);assert.match(human.stdout,/execution_authorized:false/);assert.match(human.stdout,/external freshness not evaluated/);assert(human.stdout.includes(JSON.stringify(row.input.target)));}
 t.diagnostic('30 explicit rows,31 ordered states,46 purpose invocations; independently prepared bindings/history/ledger; source API/CLI;3 strict external companions and no reduced-envelope fallback.');
});

const original160SectionHashes={
  "notice": "sha256:b77c4a87fc92da9511059e1f73637904883b229dc1f145bbc8dbb6541669defd",
  "chains": "sha256:2a626de2152c1a92b4163bd9b494702742b03e5c46fb0031ee292950eb6dda88",
  "mutations": "sha256:7469a39f83deb37712e7c6bf3f1d23ec89a609cbda767ff8d0b0229411624a92",
  "repeated_parent": "sha256:e6a3cb5dd005083ec0d430bde53f6f116b23f908d7bc48d2a7d32d7d1cb5c94b"
};
test('recorded fixture append preserves exact strict sections and final159 cursor prefix',()=>{
 assert.deepEqual(Object.keys(fixtures).sort(),[...Object.keys(original160SectionHashes),'recorded','worker_current','rework_queue_p165','repair_loop_p166'].sort());
 for(const [key,digest]of Object.entries(original160SectionHashes))assert.equal('sha256:'+createHash('sha256').update(canonicalize(fixtures[key])).digest('hex'),digest,key+' original complete section');
 // A changed current copied test file is not an archived-prefix reconstruction obligation.

});

test('recorded ADF recognition reuses ordinary and attempted-record172 controls',async()=>{
 const source=readFileSync(new URL('./handoff.test.mjs',import.meta.url),'utf8');const start=source.indexOf('const candidateCases = ')+23,end=source.indexOf('\n];',start)+2;const controls=JSON.parse(source.slice(start,end));
 const e=structuredClone(recordedPacket.rows.find(r=>r.id==='P01').input),page=e.comment_pages[0];
 page.comments.push({id:'999999',author_id:'ordinary-user',update_author_id:'ordinary-user',created:'2026-11-15T10:00:00Z',updated:'2026-11-15T10:00:00Z',format:'adf',body:controls.find(c=>c.id==='P01').input});page.total++;
 assert.equal((await recordedAPI('recorded-completion',JSON.stringify(e))).validation.valid,true);
 const original=JSON.parse(page.comments[0].body);original.content.unshift({type:'codeBlock',attrs:{language:'python'},content:[{type:'text',text:'print("ordinary")'}]});page.comments[0].body=JSON.stringify(original);
 assert.equal((await recordedAPI('recorded-completion',JSON.stringify(e))).validation.valid,true);
 const malformed=controls.find(c=>c.id==='P04');assert.equal(malformed.expected.diagnostic,'HANDOFF_BLOCK_COUNT');page.comments.at(-1).body=malformed.input;const invalid=(await recordedAPI('recorded-completion',JSON.stringify(e))).validation;assert.equal(invalid.valid,false);
});

test('ordinary recorded missing capture cut still rejects a genuinely supplied mismatched tuple',async()=>{
 const input=structuredClone(recordedPacket.rows.find(r=>r.id==='P05').input);input.retained[0].created='2020-01-01T00:00:00Z';const r=(await recordedAPI('recorded-completion',JSON.stringify(input))).validation;assert.equal(r.valid,false);assert(r.diagnostics.some(d=>d.code==='METADATA'&&d.path==='/retained/0/created'));
});

// PGB-175: finite original H01/H02 supplied-proof inputs, prepared before production changes.
const workerCases=fixtures.worker_current;
test('ordinary worker final readback binds the configured publisher actor',()=>{
 const original=workerCases.artifacts.find(r=>r.id==='mixed-implementer-readback').input,input=structuredClone(original),source=JSON.stringify(original);
 const issue=input.issues.find(i=>i.id===input.target.ticket_id),project=input.trusted.projects.find(p=>p.id===issue.project_id),actor='second-configured-implementer';
 assert(!project.actors.implementer.includes(actor));project.actors.implementer.push(actor);input.publisher.account_id=actor;input.action_receipt.actor_id=actor;
 const before=JSON.stringify(input),r=validateWorkerCurrent(before);
 assert.equal(r.valid,false);assert.deepEqual(r.diagnostics,[{code:'AUTHORITY',path:'/publisher/account_id',message:'Match the final target author and update author to the configured current publisher account.',reference:input.target}]);
 for(const [key,value]of Object.entries(workerCases.negative_invariants))assert.deepEqual(r[key],value,key);
 for(const [key,value]of Object.entries(workerCases.common_result))assert.deepEqual(r[key],value,key);
 for(const key of workerCases.omitted_result_fields)assert.equal(Object.hasOwn(r,key),false,key);
 assert.equal(JSON.stringify(input),before);assert.equal(JSON.stringify(original),source);
});
for(const row of workerCases.artifacts.filter(r=>r.group<=7))test('ordinary worker supplied proof: '+row.id,()=>{
 const before=JSON.stringify(row.input),mode=row.id==='mixed-version-worker-in-chain'?'chain':row.id==='mixed-version-worker-in-recorded-history'?'recorded-history':'worker-current';
 const r=mode==='chain'?validateReceiptChain(before):mode==='recorded-history'?inspectRecordedHistory(before):validateWorkerCurrent(before);
 assert.equal(JSON.stringify(row.input),before);assert.equal(r.valid,row.expected.valid,JSON.stringify(r));
 if(mode==='worker-current'){
  for(const [key,value]of Object.entries(workerCases.common_result))assert.deepEqual(r[key],value,key);
  for(const key of workerCases.omitted_result_fields)assert.equal(Object.hasOwn(r,key),false,key);
  if(!r.valid)for(const [key,value]of Object.entries(workerCases.negative_invariants))assert.deepEqual(r[key],value,key);
 }
 if(row.expected.valid){assert.deepEqual(r.diagnostics,[]);assert.deepEqual(r.validated_leaf,row.input.target);assert.equal(r.record_digest,row.input.target.digest);for(const key of ['assignment','requirements_digest'])if(row.expected[key])assert.deepEqual(r[key],row.expected[key]);}
 else{const d=r.diagnostics.find(d=>d.code===row.expected.code&&(!row.expected.path||d.path===row.expected.path)&&(!row.expected.path_suffix||d.path.endsWith(row.expected.path_suffix)));assert(d,JSON.stringify(r.diagnostics));if(row.group===3)assert.match(d.path,/\/(?:payload\/pr|payload\/stack_parent\/pr)(?:\/|$)/);} if(row.id==='missing-authority-direct-edge'){
  const normal=workerCases.artifacts.find(r=>r.id===row.base).input;assert.equal(validateWorkerCurrent(JSON.stringify(normal)).valid,true);
  const edge=normal.action_receipt.transitions[0];
  const identical={from_stage_id:edge.from_stage_id,to_stage_id:edge.to_stage_id},reordered={to_stage_id:edge.to_stage_id,from_stage_id:edge.from_stage_id};
  for(const duplicate of [identical,reordered]){const input=structuredClone(normal);input.action_receipt.transitions.push(duplicate);const original=JSON.stringify(input),rejected=validateWorkerCurrent(original);assert.equal(rejected.valid,false);assert(rejected.diagnostics.some(d=>d.code==='AUTHORITY'&&d.path==='/action_receipt/transitions'));for(const[key,value]of Object.entries(workerCases.negative_invariants))assert.deepEqual(rejected[key],value,key);assert.equal(JSON.stringify(input),original);}
 }
});

// PGB-165 exact outcome paths. Expectations are independent fixture declarations.
for(const row of fixturesP165())test(row.id,()=>{
 const raw=JSON.stringify(row.input),result=validateWorkerCurrent(raw);
 assert.equal(result.valid,row.expected.valid,row.id+JSON.stringify(result.diagnostics));
 if(row.expected.code)assert(result.diagnostics.some(d=>d.code===row.expected.code),JSON.stringify(result.diagnostics));
 assert.equal(JSON.stringify(row.input),raw);assert.equal(result.execution_authorized,false);
 if(result.valid){assert.deepEqual(result.validated_leaf,row.input.target);assert.deepEqual(result.assignment,row.input.issues.find(i=>i.id===row.input.target.ticket_id).pointer.assignment);}
 else for(const [key,value]of Object.entries(workerCases.negative_invariants))assert.deepEqual(result[key],value,key);
 if(row.id==='P165-PROOF-qa-partial'){assert.equal(result.qa_report.steps[0].result,'FAIL');assert.deepEqual(result.qa_report.steps[0].finding_ids,['F1','F2']);}
});
function fixturesP165(){return JSON.parse(readFileSync(new URL('./fixtures/handoff-chains.json',import.meta.url))).rework_queue_p165.proof_cases;}

test('P165-PROOF-qa-no-fail isolates the missing demonstrated failure',()=>{
 const baseline=fixturesP165().find(r=>r.id==='P165-PROOF-qa-partial'),negative=fixturesP165().find(r=>r.id==='P165-PROOF-qa-no-fail');
 const original=JSON.stringify(negative.input),find=e=>e.comment_pages.flatMap(p=>p.comments).find(c=>extractHandoff(c.body,{format:c.format}).value.record_id===e.target.record_id),before=find(baseline.input),after=find(negative.input);
 const oldRecord=JSON.parse(JSON.stringify(extractHandoff(before.body,{format:before.format}).value)),newRecord=JSON.parse(JSON.stringify(extractHandoff(after.body,{format:after.format}).value));
 assert.deepEqual(oldRecord.payload.qa_report.steps.map(s=>s.result),['FAIL','PASS','PASS','PASS']);assert(newRecord.payload.qa_report.steps.every(s=>s.result==='PASS'));newRecord.payload.qa_report.steps[0].result='FAIL';assert.deepEqual(newRecord,oldRecord);
 const normalized=structuredClone(negative.input);find(normalized).body=before.body;normalized.target.digest=baseline.input.target.digest;assert.deepEqual(normalized,baseline.input);
 const positive=validateWorkerCurrent(JSON.stringify(baseline.input)),rejected=validateWorkerCurrent(original);assert.equal(positive.valid,true);assert.equal(rejected.valid,false);assert(rejected.diagnostics.some(d=>d.code==='LEDGER'&&d.path.endsWith('/payload/qa_report/steps')),JSON.stringify(rejected.diagnostics));
 for(const [key,value]of Object.entries(workerCases.negative_invariants))assert.deepEqual(rejected[key],value,key);assert.equal(JSON.stringify(negative.input),original);
});

test('P165-PROOF-complete-transitive-ledger retains every result and joined finding',()=>{
 const packet=JSON.parse(readFileSync(new URL('./fixtures/handoff-chains.json',import.meta.url))).rework_queue_p165.packets['P165-Q-QUEUE'],input=JSON.parse(packet.assistant_files['current-worker.json']);
 const rows=input.comment_pages.flatMap(page=>page.comments.map(comment=>({comment,record:extractHandoff(comment.body,{format:comment.format}).value})));
 const predecessor=rows.find(x=>x.record.record_id===input.target.record_id).record;
 const findingEvidence=rows.find(x=>x.record.kind==='implementation').record.payload.verification[0];
 const record={...predecessor,record_id:'b1650000-0000-4000-8000-000000000001',role:'qa',kind:'repair_request',from_stage:'QA',to_stage:'Rework Queued',payload:{basis:input.target,pr:predecessor.payload.pr,findings:[{id:'F1',summary:'Negative count is accepted.',evidence:[findingEvidence]},{id:'F2',summary:'Zero is labelled positive.',evidence:[findingEvidence]}],qa_report:{steps:[['A.S1','PASS',[]],['B.S1','FAIL',['F1']],['C.S1','NOT_RUN',['F1']],['D.S1','NOT_RUN',['F1']],['E.S1','FAIL',['F2']],['F.S1','NOT_RUN',['F1','F2']],['G.S1','PASS',[]]].map(([id,result,finding_ids])=>({id,skill:'qa-database',result,evidence:result==='NOT_RUN'?[]:[findingEvidence],finding_ids,not_run_reason:result==='NOT_RUN'?'Explicit failed/skipped prerequisite.':null,reused_from:null})),human_pending:['HQA-01'],no_ai_cases_reason:null}}};
 const comment={id:'99165',author_id:'qa',update_author_id:'qa',created:'2026-11-17T08:00:00Z',updated:'2026-11-17T08:00:00Z',format:'adf',body:JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:JSON.stringify(record)}]}]})};
 const page=input.comment_pages[0];page.comments.push(comment);page.total++;input.publisher.intent='repair_request';input.target={ticket_id:record.ticket_id,comment_id:comment.id,record_id:record.record_id,digest:digestValue(record)};
 const result=validateWorkerCurrent(JSON.stringify(input));assert.equal(result.valid,true,JSON.stringify(result.diagnostics));assert.deepEqual(JSON.parse(JSON.stringify(result.qa_report)),JSON.parse(JSON.stringify(record.payload.qa_report)));assert.equal(result.ai_steps,7);assert.deepEqual(result.human_pending,['HQA-01']);
 const changed=structuredClone(input),body=JSON.parse(changed.comment_pages[0].comments.at(-1).body),changedRecord=JSON.parse(body.content[0].content[0].text);changedRecord.payload.qa_report.steps[5].finding_ids=['F2'];body.content[0].content[0].text=JSON.stringify(changedRecord);changed.comment_pages[0].comments.at(-1).body=JSON.stringify(body);changed.target.digest=digestValue(changedRecord);
 const rejected=validateWorkerCurrent(JSON.stringify(changed));assert.equal(rejected.valid,false);assert(rejected.diagnostics.some(d=>d.code==='LEDGER'&&d.path.endsWith('/steps/5/finding_ids')));
});

test('P165-source copied runtime and documented private packet extraction',async t=>{
 const {prepare}=await import('../scripts/prepare-pigboard-skills.mjs');
 const bundle=JSON.parse(await readFile(new URL('../config/skill-bundle.json',import.meta.url)));
 const git=(cwd,...args)=>execFileSync('git',args,{cwd,stdio:'pipe'}).toString().trim();
 async function makeP165DistributionFixture(t){
  const root=await mkdtemp(path.join(os.tmpdir(),'pigboard-p165-copied-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const source=path.join(root,'source'),app=path.join(root,'app'),cache=path.join(root,'cache');
  await mkdir(source);await mkdir(app);git(source,'init','-b','main');
  git(source,'config','user.name','Fixture');git(source,'config','user.email','fixture@example.invalid');
  for(const name of bundle.skills){await mkdir(path.join(source,'skills',name),{recursive:true});await writeFile(path.join(source,'skills',name,'SKILL.md'),name);}
  for(const d of bundle.dependencyDirectories)await mkdir(path.join(source,'skills',d),{recursive:true});
  for(const relative of bundle.validatorPayload.sources){const target=path.join(source,relative);await mkdir(path.dirname(target),{recursive:true});await cp(new URL('../'+relative,import.meta.url),target);}
  git(source,'add','.');git(source,'commit','-m','initial');
  return {source,app,cache,ref:'main'};
 }
 const install=async dir=>{await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'installed'),'yes');};
 const {spawnSync}=await import('node:child_process'),{validateWorkerCurrent}=await import('../lib/contracts/receipts.mjs');
 const o=await makeP165DistributionFixture(t),root=path.dirname(o.source),a=await prepare(o,async dir=>{if(path.basename(dir)==='work-validator')await cp(new URL('../node_modules/',import.meta.url),path.join(dir,'node_modules'),{recursive:true,dereference:true});else await install(dir);});
 const runtime=path.join(a.skills,'work-validator'),cwd=path.join(root,'unrelated');await mkdir(cwd);
 const sourceRoot=new URL('../',import.meta.url).pathname,packet=JSON.parse(await readFile(new URL('./fixtures/handoff-chains.json',import.meta.url))).rework_queue_p165;
 const env={...process.env};delete env.NODE_PATH;
 for(const row of packet.proof_cases){
  const input=path.join(root,row.id+'.json'),raw=JSON.stringify(row.input);await writeFile(input,raw);
  const args=['--mode','worker-current','--input',input,'--json'],copied=spawnSync(process.execPath,[path.join(runtime,'scripts/validate-handoff.mjs'),...args],{cwd,env,encoding:'utf8'}),source=spawnSync(process.execPath,[path.join(sourceRoot,'scripts/validate-handoff.mjs'),...args],{cwd,env,encoding:'utf8'});
  assert.equal(copied.status,row.expected.valid?0:1,row.id+copied.stdout+copied.stderr);assert.equal(source.status,copied.status);assert.equal(copied.stderr,'');assert.deepEqual(JSON.parse(copied.stdout),JSON.parse(source.stdout));assert.deepEqual(JSON.parse(copied.stdout),JSON.parse(JSON.stringify(validateWorkerCurrent(raw))));assert.equal(await readFile(input,'utf8'),raw);
  if(row.expected.code)assert(JSON.parse(copied.stdout).diagnostics.some(d=>d.code===row.expected.code&&(!row.expected.path_suffix||d.path.endsWith(row.expected.path_suffix))),row.id+copied.stdout);
 }
 const guide=await readFile(new URL('../docs/handoffs.md',import.meta.url),'utf8'),start=guide.indexOf("node --input-type=module - \"$PIGBOARD_SOURCE\" \"$PIGBOARD_CASE\" \"$PIGBOARD_PACKET\" <<'NODE'\n");assert(start>0);
 const codeStart=guide.indexOf('\n',start)+1,code=guide.slice(codeStart,guide.indexOf('\nNODE',codeStart));
 const extract=(id,out)=>spawnSync(process.execPath,['--input-type=module','-',sourceRoot,id,out],{input:code,cwd,env,encoding:'utf8'});
 assert.equal(Object.keys(packet.packets).length,8);
 for(const [id,p]of Object.entries(packet.packets)){
  const out=path.join(root,id);assert.equal(extract(id,out).status,0);assert.equal((await (await import('node:fs/promises')).stat(out)).mode&0o777,0o700);
  for(const [area,key]of [['assistant','assistant_files'],['operator','operator_files']])for(const [name,content]of Object.entries(p[key])){const file=path.join(out,area,name);assert.equal(await readFile(file,'utf8'),content);assert.equal((await (await import('node:fs/promises')).stat(file)).mode&0o777,0o600);}
  for(const name of ['invocation.md','work.yaml','facts.yaml','observations.json','current-worker.json','change.diff'])assert(p.assistant_files[name]);
  assert(!Object.keys(p.assistant_files).some(n=>/oracle|candidate|report/.test(n)));assert(p.operator_files['oracle.json']);assert(p.operator_files['operation-cards.json']);assert(p.operator_files['sentinels.json']);
  const current=p.assistant_files['current-worker.json'],observations=JSON.parse(p.assistant_files['observations.json']);assert.equal(validateWorkerCurrent(current).valid,true,id);
  assert.equal(observations.pr.provider,'bitbucket');assert.match(observations.pr.title,/EX-1/);assert.match(observations.pr.description,/EX-1/);assert.equal(observations.native.type_id,'22');assert.equal(observations.scope.config_file,'config.yaml');assert.match(observations.capabilities.prepared_route,/rovito-safeguard mock/);assert(p.assistant_files['config.yaml']);assert(p.assistant_files['query.sql']);
  const currentFile=path.join(out,'assistant','current-worker.json'),args=['--mode','worker-current','--input',currentFile,'--json'];
  const copied=spawnSync(process.execPath,[path.join(runtime,'scripts/validate-handoff.mjs'),...args],{cwd,env,encoding:'utf8'}),source=spawnSync(process.execPath,[path.join(sourceRoot,'scripts/validate-handoff.mjs'),...args],{cwd,env,encoding:'utf8'});assert.equal(copied.status,0,id+copied.stdout+copied.stderr);assert.equal(source.status,0,id+source.stdout+source.stderr);assert.deepEqual(JSON.parse(copied.stdout),JSON.parse(source.stdout));
  assert.equal(extract(id,out).status,1);assert.equal(await readFile(path.join(out,'assistant','current-worker.json'),'utf8'),current);
 }
 // These are the actual two documented layouts, not a fictional shared path.
 assert.deepEqual(await readFile(path.join(runtime,'docs/handoffs.md')),await readFile(path.join(sourceRoot,'docs/handoffs.md')));assert.match(await readFile(path.join(runtime,'docs/handoffs.md'),'utf8'),/## Ordinary worker release boundary/);
 const unknown=path.join(root,'unknown');assert.equal(extract('UNKNOWN',unknown).status,1);await assert.rejects(readFile(path.join(unknown,'assistant','invocation.md')));
 const damaged=path.join(root,'damaged');await cp(runtime,damaged,{recursive:true});await rm(path.join(damaged,'lib/contracts/receipts.mjs'));const failed=spawnSync(process.execPath,[path.join(damaged,'scripts/validate-handoff.mjs'),'--mode','worker-current','--input',path.join(root,packet.proof_cases[0].id+'.json'),'--json'],{cwd,env,encoding:'utf8'});assert.notEqual(failed.status,0);
});

// P166 fixed supplied-contract proofs; actual subject/human execution is separate.
const p166=fixtures.repair_loop_p166;
for(const [name,input]of Object.entries(p166.inputs))test('P166-PROOF-positive '+name,()=>{
 const before=JSON.stringify(input),r=validateWorkerCurrent(before);assert.equal(r.valid,true,JSON.stringify(r.diagnostics));assert.equal(r.execution_authorized,false);assert.equal(Object.hasOwn(r,'completion_established'),false);assert.equal(Object.hasOwn(r,'recorded_completion_established'),false);assert.equal(JSON.stringify(input),before);
});
test('P166-PROOF-missing unresolved ancestor rejects despite prior implementation',()=>{
 const e=structuredClone(p166.inputs.ancestor_union_admission);mutateRecord(e,e.target.record_id,r=>r.payload.requests.shift());const r=validateWorkerCurrent(JSON.stringify(e));assert.equal(r.valid,false);assert(r.diagnostics.some(d=>d.code==='REPAIR'),JSON.stringify(r.diagnostics));
});
for(const [name,change,code]of [
 ['wrong human actor',e=>{e.publisher.account_id='qa';e.action_receipt.actor_id='qa';},'AUTHORITY'],
 ['merged PR',e=>e.pr_receipts.filter(p=>p.current).forEach(p=>p.state='merged'),'PR'],
 ['missing intent',e=>delete e.publisher.intent,'STRUCTURE'],
 ['success intent',e=>e.publisher.intent='success','STRUCTURE'],
 ['wrong queue edge',e=>e.action_receipt.transitions=[],'AUTHORITY'],
 ['changed head',e=>e.pr_receipts.find(p=>p.current).source_revision='f'.repeat(40),'PR'],
])test('P166-HUMAN-refuses '+name,()=>{const e=structuredClone(p166.inputs.human_preflight);change(e);const r=validateWorkerCurrent(JSON.stringify(e));assert.equal(r.valid,false);assert(r.diagnostics.some(d=>d.code===code),JSON.stringify(r.diagnostics));});
for(const [label,mutate,code]of [
 ['duplicate assigned refs',e=>mutateRecord(e,e.target.record_id,r=>r.payload.requests.push(r.payload.requests[0])),'STRUCTURE'],
 ['omitted old with no native hint',e=>{e.issues[0].required_requests=[];mutateRecord(e,e.target.record_id,r=>r.payload.requests.shift());},'REPAIR'],
 ['unrelated previous lineage',e=>mutateRecord(e,e.target.record_id,r=>r.payload.previous_assignment=r.payload.requests[0]),'ASSIGNMENT'],
 ['requirements drift',e=>e.issues[0].requirements_digest='sha256:'+'f'.repeat(64),'REQUIREMENTS'],
 ['conflicting existing PR',e=>mutateRecord(e,e.target.record_id,r=>r.payload.existing_pr.number='99'),'PR'],
])test('P166-PROOF-ancestor refusal '+label,()=>{const e=structuredClone(p166.inputs.ancestor_union_admission);mutate(e);const r=validateWorkerCurrent(JSON.stringify(e));assert.equal(r.valid,false);assert(r.diagnostics.some(d=>d.code===code),JSON.stringify(r.diagnostics));});
test('P166-PROOF-request leaf cannot hide another unaccounted current request',()=>{
 const e=structuredClone(p166.inputs.human_readback),r=structuredClone(target(e).r);r.record_id='16600000-0000-4000-8000-000000000099';append(e,r,'human');const result=validateWorkerCurrent(JSON.stringify(e));assert.equal(result.valid,false);assert(result.diagnostics.some(d=>d.code==='REPAIR'),JSON.stringify(result.diagnostics));
});
test('P166-PROOF recorded ancestry authenticates both unresolved requests and their real bases',()=>{
 const input=structuredClone(p166.inputs.ancestor_union_admission),targets=target(input).r.payload.requests;
 const projection=e=>{e.schema='pigboard-manager-handoff-input/v1';e.consumer='manager';delete e.purpose;delete e.current_context_body;delete e.publisher;delete e.action_receipt;delete e.pr_receipts;delete e.evidence_receipts;e.trusted.projects=e.trusted.projects.map(({evidence_uris,pipeline_actors,configured_targets,...p})=>p);e.trusted.manager_assignments=[{ticket_id:e.issues[0].id,assignment:e.issues[0].pointer.assignment}];return e;};
 for(const request of targets){const row=entries(input).find(x=>x.r.record_id===request.record_id);for(const exact of [request,row.r.payload.basis]){const e=projection(structuredClone(input));e.target=exact;const r=inspectRecordedHistory(JSON.stringify(e));assert.equal(r.valid,true,JSON.stringify(r.diagnostics));assert.equal(r.execution_authorized,false);assert(r.records.some(x=>x.reference.record_id===exact.record_id));}}
});
for(const [name,input]of Object.entries(p166.refusals))test('P166-PROOF unsupported/stale '+name,()=>{const r=validateWorkerCurrent(JSON.stringify(input));assert.equal(r.valid,false,name);assert.equal(r.execution_authorized,false);for(const[key,value]of Object.entries(workerCases.negative_invariants))assert.deepEqual(r[key],value,key);});
