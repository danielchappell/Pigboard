import { test } from 'node:test';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runFixture } from './fixtures/jira-preview-harness.mjs';
import { inspectJiraInventory } from '../lib/jira/inventory.mjs';
import { validateHandoff } from '../lib/contracts/handoff.mjs';

const packet=JSON.parse(readFileSync(new URL('./fixtures/jira-inventory-cases.json',import.meta.url),'utf8'));
const runtime=fileURLToPath(new URL('../',import.meta.url));
assert.equal(packet.variants.length,28);
assert.equal(packet.variants.filter(v=>v.control).length,4);
assert.equal(packet.human_acceptance,'NOT_RUN (0/4)');
for(const v of packet.variants)test(`inventory ${v.case} ${v.variant}`,async()=>{
 const main=await runFixture(v.case,v.variant,runtime);
 assert.equal(main.oracle_matched,true);assert.equal(main.effects,0);assert.equal(main.cleanup_complete,true);
 if(v.variant==='missing-retained-input')assert.equal(main.resolver_calls,0);
 if(v.control){const control=await runFixture(v.case,v.variant,runtime,{control:true});assert.equal(control.oracle_matched,true);}
});

// Focused configured-scope regression, separate from the prescribed32 observations.
test('inventory rejects a nonnumeric declared worker label before scope or member acquisition',async()=>{
 const authored=structuredClone(packet.variants.find(v=>v.variant==='complete-domain'));
 const invalidLabel=authored.config.defaults.worker_prefixes[0]+'x';
 const appendDeclaration=body=>{
  const text=body.content[0].content[0];
  const epic=JSON.parse(text.text);
  epic.workstreams.push({label:invalidLabel,story_order:['999']});
  text.text=JSON.stringify(epic);
 };
 appendDeclaration(authored.script[0].body.issues[0].fields.description);
 appendDeclaration(authored.script[2].body.fields.description);
 const expectedBody=JSON.parse(authored.oracle.raw_bodies['100']);
 appendDeclaration(expectedBody);
 authored.oracle.raw_bodies['100']=JSON.stringify(expectedBody);
 // The unchanged authored wire defines all24 legitimate calls and their bytes.
 authored.oracle.status='incomplete';authored.oracle.domain_complete=false;
 authored.oracle.code='WORK_INVALID';
 authored.oracle.scopes[0].complete=false;
 authored.oracle.counters.response_bytes=authored.script.reduce((sum,step)=>sum+Buffer.byteLength(JSON.stringify(step.body)),0);
 const run=await runFixture(authored.case,authored.variant,runtime,{authoredFixture:authored});
 assert.deepEqual(run.trace,authored.oracle.trace);
 assert(!run.report.scopes.some(scope=>scope.label===invalidLabel));
 assert(!run.trace.some(request=>request.path.includes('/issue/999')));
 assert(run.report.diagnostics.some(d=>d.code==='WORK_INVALID'&&d.operation==='work'&&d.issue_id==='100'));
 assert.equal(run.effects,0);assert.equal(run.cleanup_complete,true);
});

// One deterministic late-phase regression; the prescribed fixture packet is unchanged.
test('inventory enforces scan timeout during late composition',async t=>{
 const authored=structuredClone(packet.variants.find(v=>v.variant==='complete-domain'));
 authored.oracle.status='incomplete';authored.oracle.domain_complete=false;
 authored.oracle.code='LIMIT_REACHED';authored.oracle.scopes[0].complete=false;
 authored.oracle.diagnostic={code:'LIMIT_REACHED',bound:'scan_timeout_ms',scope:null};
 const source=readFileSync(new URL('../lib/jira/inventory.mjs',import.meta.url),'utf8');
 const marker='// Propagate acquired dependencies';
 assert.equal(source.split(marker).length,2);
 const markerLine=source.slice(0,source.indexOf(marker)).split('\n').length;
 const original=Object.getOwnPropertyDescriptor(performance,'now');
 let triggerStack=null;
 Object.defineProperty(performance,'now',{configurable:true,value(){
  if(!triggerStack){
   const stack=new Error().stack;
   const lines=[...stack.matchAll(/\/lib\/jira\/inventory\.mjs:(\d+):\d+/g)];
   if(lines.some(match=>Number(match[1])>=markerLine))triggerStack=stack;
  }
  return triggerStack?authored.config.jira.read_bounds.scan_timeout_ms+1:0;
 }});
 try{
  const run=await runFixture(authored.case,authored.variant,runtime,{authoredFixture:authored});
  assert(triggerStack?.includes('checkTime'),'Expiry must be observed by a late checkTime checkpoint.');
  assert.deepEqual(run.trace,authored.oracle.trace);
  assert(run.report.scopes.every(scope=>scope.complete===false));
  assert.equal(run.report.cleanup.jira,'complete');assert.equal(run.report.cleanup.resolver,'settled');
  assert.equal(run.cleanup_complete,true);assert.equal(run.effects,0);
 }finally{
  if(original)Object.defineProperty(performance,'now',original);else delete performance.now;
  t.diagnostic(triggerStack??'No late clock trigger observed.');
 }
});

// Historical ownership is retained without authorizing out-of-domain label searches.
test('inventory preserves unsupported retained scopes without label queries',async()=>{
 const authored=structuredClone(packet.variants.find(v=>v.variant==='complete-domain'));
 const oldLabel=authored.config.defaults.worker_prefixes[0]+'x',pendingLabel='retired-worker';
 authored.request.retained_members.push({ticket_id:'103',project_id:'10001',epic_id:'100',label:oldLabel,assignment:null});
 authored.request.pending_intents.push({project_id:'10001',label:pendingLabel,ticket_id:'101',attempt_id:'00000000-0000-4000-8000-000000000009'});
 authored.oracle.status='incomplete';authored.oracle.domain_complete=false;authored.oracle.code='SCOPE_UNKNOWN';
 authored.oracle.scopes[0].complete=false;
 authored.oracle.scopes.push(
  {project_id:'10001',label:oldLabel,complete:false,old_issue_ids:['103'],current_issue_ids:[]},
  {project_id:'10001',label:pendingLabel,complete:false,old_issue_ids:[],current_issue_ids:[]},
 );
 authored.oracle.counters.streams=3;
 const run=await runFixture(authored.case,authored.variant,runtime,{authoredFixture:authored});
 assert.deepEqual(run.trace,authored.oracle.trace);
 assert.equal(run.report.retained_complete,true);
 const holds=run.report.diagnostics.filter(d=>d.code==='SCOPE_UNKNOWN');
 assert.equal(holds.length,2);assert(holds.every(d=>d.scope===null));
 assert.equal(run.effects,0);assert.equal(run.cleanup_complete,true);
});

test('inventory reports setup failure for missing resolver capability',async()=>{
 const authored=packet.variants.find(v=>v.variant==='complete-domain');
 const results=[];
 for(const dependencies of [undefined,{}])results.push(await inspectJiraInventory(JSON.stringify(authored.config),structuredClone(authored.request),dependencies));
 for(const result of results){
  assert.equal(result.report.status,'setup_failed');
  assert(result.report.diagnostics.some(d=>d.code==='SETUP_MISSING'&&d.scope===null));
  assert.equal(result.report.domain_complete,false);assert.equal(result.report.retained_complete,true);
  assert.equal(result.report.counters.requests_attempted,0);
  assert.deepEqual(result.report.cleanup,{jira:'not_started',resolver:'settled'});
  assert.deepEqual(result.report.scopes,[{project_id:'10001',label:'AI-Daniel-1',complete:false,old_issue_ids:['103'],current_issue_ids:[]}]);
  assert.deepEqual(result.observations,{issues:[],comment_pages:[],exact_comments:[],references:[],provenance:[
   {ticket_id:'103',source:'retained',source_ticket_id:null,project_id:'10001',label:'AI-Daniel-1'},
   {ticket_id:'100',source:'retained',source_ticket_id:'103',project_id:'10001',label:'AI-Daniel-1'},
  ]});
 }
});

// These two small wire literals bind root authority and persistent admission capacity.
// They are separate from, and do not modify, the prescribed32-observation packet.
const closureFields=['project','issuetype','status','parent','labels','description'];
const closureSearch=(project,predicate,issues,pageSize=10)=>({method:'POST',path:'/rest/api/3/search/jql',request_body:{jql:`project = "${project}" AND ${predicate} ORDER BY id ASC`,maxResults:pageSize,fields:[...closureFields]},status:200,body:{issues:structuredClone(issues),isLast:true}});
const closureReads=(issue,pageSize=10)=>[
 {path:`/rest/api/3/issue/${issue.id}?fields=project,issuetype,status,parent,labels,description`,status:200,body:structuredClone(issue)},
 {path:`/rest/api/3/issue/${issue.id}/properties`,status:200,body:{keys:[]}},
 {path:`/rest/api/3/issue/${issue.id}/comment?startAt=0&maxResults=${pageSize}&orderBy=created`,status:200,body:{startAt:0,maxResults:pageSize,total:0,comments:[]}},
];
const closureEpic=(template,id,label,member,labels)=>{
 const issue=structuredClone(template);issue.id=id;issue.key='APP-'+id;issue.fields.labels=labels;
 const node=issue.fields.description.content[0].content[0],work=JSON.parse(node.text);
 work.workstreams=[{label,story_order:[member]}];node.text=JSON.stringify(work);return issue;
};
const closureStory=(id,{parent=null,labels=[],description=null}={})=>({id,key:'APP-'+id,fields:{project:{id:'10001'},issuetype:{id:'22'},status:{id:'11'},parent:parent?{id:parent}:null,labels,description}});
const closureProvenance=(ticket_id,source,source_ticket_id=null,project_id=null,label=null)=>({ticket_id,source,source_ticket_id,project_id,label});
function closureOracle(issues,provenance,script,counters,scope,{complete=true,code=null,bound=null}={}){
 const normalized=issues.map(issue=>({id:issue.id,key:issue.key,project_id:'10001',type_id:issue.fields.issuetype.id,status_id:issue.fields.status.id,parent_id:issue.fields.parent?.id??null,labels:[...issue.fields.labels],format:'adf',body:issue.fields.description===null?null:JSON.stringify(issue.fields.description),pointer:{state:'absent',value:null}}));
 return {status:complete?'complete':'incomplete',inspection_scope:'configured_inventory',domain_complete:complete,retained_complete:true,calls:script.length,scopes:[scope],...(code?{code,diagnostic:{code,...(bound?{bound}:{}),scope:null}}:{}),counters:{...counters,response_bytes:script.reduce((sum,step)=>sum+Buffer.byteLength(JSON.stringify(step.body)),0)},trace:script.map(step=>({method:step.method??'GET',path:step.path})),issue_rows:issues.map(issue=>({id:issue.id,key:issue.key,project_id:'10001',issue_read:'complete',pointer_read:'complete',comments_read:'complete',exact_comments_read:'not_requested',comment_ids:[],comment_count:0})),acquisition:{issues:normalized,comment_pages:issues.map(issue=>({site:'https://jira.example.invalid',ticket_id:issue.id,start_at:0,total:0,is_last:true,comments:[]})),exact_comments:[],references:[],provenance}};
}

test('inventory retains failed identity reservations across discovery waves',async t=>{
 const authored=structuredClone(packet.variants.find(v=>v.variant==='complete-domain'));
 authored.request={retained_members:[],pending_intents:[],retained_complete:true};
 Object.assign(authored.config.jira.read_bounds,{max_known_issues:2,max_epics:1,page_size:2});
 const epic=closureEpic(authored.script[0].body.issues[0],'100','AI-Daniel-1','101',['pigboard']);
 const found=closureStory('102',{labels:['AI-Daniel-1']});
 authored.script=[closureSearch('10001','labels = "pigboard"',[epic],2),closureSearch('10002','labels = "pigboard"',[],2),...closureReads(epic,2),closureSearch('10001','parent = "100"',[],2),{path:'/rest/api/3/issue/101?fields=project,issuetype,status,parent,labels,description',status:403,body:{}},closureSearch('10001','labels = "AI-Daniel-1"',[found],2)];
 const provenance=[closureProvenance('100','seed'),closureProvenance('100','seed',null,'10001'),closureProvenance('101','declared','100','10001','AI-Daniel-1')];
 authored.oracle=closureOracle([epic],provenance,authored.script,{requests_attempted:8,requests_completed:7,requests_failed:1,search_pages:4,comment_pages:1,known_issues:1,epics:1,streams:1,comments:0},{project_id:'10001',label:'AI-Daniel-1',complete:false,old_issue_ids:[],current_issue_ids:['102']},{complete:false,code:'LIMIT_REACHED',bound:'max_known_issues'});
 assert.equal(authored.script.length,8);t.diagnostic('Prebound wire:8 calls, '+authored.oracle.counters.response_bytes+' response bytes; private/row oracles authored before collection.');
 const run=await runFixture(authored.case,authored.variant,runtime,{authoredFixture:authored});
 assert(run.report.diagnostics.some(d=>d.code==='READ_DENIED_OR_MISSING'&&d.issue_id==='101'));
 assert.equal(run.trace.filter(r=>r.path.includes('/issue/101?')).length,1);
 assert(!run.trace.some(r=>r.path.includes('/issue/102')));
 assert.equal(run.effects,0);assert.equal(run.cleanup_complete,true);
});

test('inventory promotes independently discovered Epic roots without refetch',async t=>{
 const authored=structuredClone(packet.variants.find(v=>v.variant==='complete-domain'));
 authored.request={retained_members:[],pending_intents:[],retained_complete:true};
 const template=authored.script[0].body.issues[0];
 const first=closureEpic(template,'100','AI-Daniel-1','101',['pigboard']);
 const promoted=closureEpic(template,'200','AI-Daniel-1','201',['AI-Daniel-1']);
 const closureOnly=closureEpic(template,'300','AI-Daniel-2','999',[]);
 const description=structuredClone(authored.script[6].body.fields.description),node=description.content[0].content[0],work=JSON.parse(node.text);
 work.prerequisites=[{ticket:'200',required_outcome:'ai_qa_complete'},{ticket:'300',required_outcome:'ai_qa_complete'}];node.text=JSON.stringify(work);
 const member=closureStory('101',{parent:'100',labels:['AI-Daniel-1'],description});
 const declared=closureStory('201'),child=closureStory('202',{parent:'200'});
 authored.script=[closureSearch('10001','labels = "pigboard"',[first]),closureSearch('10002','labels = "pigboard"',[]),...closureReads(first),closureSearch('10001','parent = "100"',[member]),...closureReads(member),...closureReads(promoted),...closureReads(closureOnly),closureSearch('10001','labels = "AI-Daniel-1"',[member,promoted]),closureSearch('10001','parent = "200"',[child]),...closureReads(declared),...closureReads(child)];
 const p=closureProvenance,provenance=[p('100','seed'),p('100','seed',null,'10001'),p('101','child','100'),p('101','declared','100','10001','AI-Daniel-1'),p('101','child','100','10001'),p('100','prerequisite','101'),p('200','prerequisite','101'),p('300','prerequisite','101'),p('200','prerequisite','101','10001'),p('300','prerequisite','101','10001'),p('101','label',null,'10001','AI-Daniel-1'),p('200','label',null,'10001','AI-Daniel-1'),p('202','child','200'),p('201','declared','200','10001','AI-Daniel-1'),p('201','declared','200','10001','AI-Daniel-1'),p('202','child','200','10001'),p('200','prerequisite','202')];
 authored.oracle=closureOracle([first,member,promoted,closureOnly,declared,child],provenance,authored.script,{requests_attempted:23,requests_completed:23,requests_failed:0,search_pages:5,comment_pages:6,known_issues:6,epics:2,streams:1,comments:0},{project_id:'10001',label:'AI-Daniel-1',complete:true,old_issue_ids:[],current_issue_ids:['101','200','201']});
 assert.equal(authored.script.length,23);t.diagnostic('Prebound wire:23 calls, '+authored.oracle.counters.response_bytes+' response bytes; private/row oracles authored before collection.');
 const run=await runFixture(authored.case,authored.variant,runtime,{authoredFixture:authored});
 assert.equal(run.trace.filter(r=>r.path.includes('/issue/200?')).length,1);
 assert(!run.trace.some(r=>r.path.includes('/issue/999')));
 assert(!run.report.scopes.some(scope=>scope.label==='AI-Daniel-2'));
 assert.equal(run.effects,0);assert.equal(run.cleanup_complete,true);
});

// Object key insertion and unique-label order are immaterial; ADF array order is not.
const equalityADF_A={type:'doc',version:1,content:[{type:'paragraph',attrs:{alignment:'start',indent:0},content:[{type:'text',text:'A'},{type:'text',text:'B'}]}]};
const equalityADF_B={content:[{content:[{text:'A',type:'text'},{text:'B',type:'text'}],attrs:{indent:0,alignment:'start'},type:'paragraph'}],version:1,type:'doc'};

test('inventory accepts reordered equivalent native observations without rewriting raw facts',async t=>{
 const authored=structuredClone(packet.variants.find(v=>v.variant==='complete-domain'));
 authored.request={retained_members:[],pending_intents:[],retained_complete:true};
 const epic=closureEpic(authored.script[0].body.issues[0],'100','AI-Daniel-1','101',['pigboard']);
 const node=epic.fields.description.content[0].content[0],work=JSON.parse(node.text);
 work.workstreams[0].story_order=['101','OLD-101'];node.text=JSON.stringify(work);
 const first=closureStory('101',{parent:'100',labels:['AI-Daniel-1','z-note'],description:equalityADF_A});
 const fresh=closureStory('101',{parent:'100',labels:['z-note','AI-Daniel-1'],description:equalityADF_B});
 const later=closureStory('101',{parent:'100',labels:['AI-Daniel-1','z-note'],description:equalityADF_B});
 authored.script=[closureSearch('10001','labels = "pigboard"',[epic]),closureSearch('10002','labels = "pigboard"',[]),...closureReads(epic),closureSearch('10001','parent = "100"',[first]),...closureReads(fresh),{path:'/rest/api/3/issue/OLD-101?fields=project,issuetype,status,parent,labels,description',status:200,body:structuredClone(first)},closureSearch('10001','labels = "AI-Daniel-1"',[later])];
 const p=closureProvenance,provenance=[p('100','seed'),p('100','seed',null,'10001'),p('101','child','100'),p('101','declared','100','10001','AI-Daniel-1'),p('OLD-101','declared','100','10001','AI-Daniel-1'),p('101','child','100','10001'),p('100','prerequisite','101'),p('101','label',null,'10001','AI-Daniel-1')];
 authored.oracle=closureOracle([epic,fresh],provenance,authored.script,{requests_attempted:11,requests_completed:11,requests_failed:0,search_pages:4,comment_pages:2,known_issues:2,epics:1,streams:1,comments:0},{project_id:'10001',label:'AI-Daniel-1',complete:true,old_issue_ids:[],current_issue_ids:['101']});
 assert.equal(authored.script.length,11);
 assert.deepEqual(authored.oracle.acquisition.issues[1].labels,['z-note','AI-Daniel-1']);
 assert.equal(authored.oracle.acquisition.issues[1].body,JSON.stringify(equalityADF_B));
 t.diagnostic('Prebound equality wire:11 calls, '+authored.oracle.counters.response_bytes+' response bytes; full raw/provenance oracle authored before collection.');
 const run=await runFixture(authored.case,authored.variant,runtime,{authoredFixture:authored});
 assert.equal(run.trace.filter(r=>r.path.includes('/issue/101?')).length,1);
 assert.equal(run.trace.filter(r=>r.path.includes('/issue/OLD-101?')).length,1);
 assert.equal(run.effects,0);assert.equal(run.cleanup_complete,true);
});

test('inventory preserves real label and ADF array changes as incomplete',async t=>{
 const authored=structuredClone(packet.variants.find(v=>v.variant==='complete-domain'));
 authored.request={retained_members:[],pending_intents:[],retained_complete:true};
 const epic=closureEpic(authored.script[0].body.issues[0],'100','AI-Daniel-1','101',['pigboard']);
 const node=epic.fields.description.content[0].content[0],work=JSON.parse(node.text);
 work.workstreams[0].story_order=['101','102','OLD-101'];node.text=JSON.stringify(work);
 const first101=closureStory('101',{parent:'100',labels:['AI-Daniel-1','z-note'],description:equalityADF_A});
 const first102=closureStory('102',{parent:'100',labels:['AI-Daniel-1','z-note'],description:equalityADF_A});
 const fresh101=closureStory('101',{parent:'100',labels:['y-note','AI-Daniel-1'],description:equalityADF_B});
 const reversed={content:[{content:[{text:'B',type:'text'},{text:'A',type:'text'}],attrs:{indent:0,alignment:'start'},type:'paragraph'}],version:1,type:'doc'};
 const fresh102=closureStory('102',{parent:'100',labels:['z-note','AI-Daniel-1'],description:reversed});
 authored.script=[closureSearch('10001','labels = "pigboard"',[epic]),closureSearch('10002','labels = "pigboard"',[]),...closureReads(epic),closureSearch('10001','parent = "100"',[first101,first102]),...closureReads(fresh101),...closureReads(fresh102),{path:'/rest/api/3/issue/OLD-101?fields=project,issuetype,status,parent,labels,description',status:200,body:structuredClone(fresh101)},closureSearch('10001','labels = "AI-Daniel-1"',[fresh101,fresh102])];
 const p=closureProvenance,provenance=[p('100','seed'),p('100','seed',null,'10001'),p('101','child','100'),p('102','child','100'),p('101','declared','100','10001','AI-Daniel-1'),p('102','declared','100','10001','AI-Daniel-1'),p('OLD-101','declared','100','10001','AI-Daniel-1'),p('101','child','100','10001'),p('100','prerequisite','101'),p('102','child','100','10001'),p('100','prerequisite','102'),p('101','label',null,'10001','AI-Daniel-1'),p('102','label',null,'10001','AI-Daniel-1')];
 authored.oracle=closureOracle([epic,fresh101,fresh102],provenance,authored.script,{requests_attempted:14,requests_completed:14,requests_failed:0,search_pages:4,comment_pages:3,known_issues:3,epics:1,streams:1,comments:0},{project_id:'10001',label:'AI-Daniel-1',complete:false,old_issue_ids:[],current_issue_ids:['101','102']},{complete:false,code:'CHANGED_INPUT'});
 // F1 is prebound: existing helper shorthand cannot represent nested scoped diagnostics.
 delete authored.oracle.diagnostic;
 assert.equal(authored.script.length,14);
 assert.deepEqual(authored.oracle.acquisition.issues[1].labels,['y-note','AI-Daniel-1']);
 assert.equal(authored.oracle.acquisition.issues[1].body,JSON.stringify(equalityADF_B));
 assert.equal(authored.oracle.acquisition.issues[2].body,JSON.stringify(reversed));
 t.diagnostic('Prebound equality control:14 calls, '+authored.oracle.counters.response_bytes+' response bytes; both scoped changes and full raw/provenance oracle authored before collection.');
 const run=await runFixture(authored.case,authored.variant,runtime,{authoredFixture:authored});
 for(const issue_id of ['101','102']){
  const changes=run.report.diagnostics.filter(d=>d.code==='CHANGED_INPUT'&&d.operation==='issue'&&d.issue_id===issue_id);
  assert(changes.length>0,issue_id+' must retain its actual changed-input hold.');
  for(const change of changes)assert.deepEqual(change.scope,{project_id:'10001',label:'AI-Daniel-1'});
 }
 assert.equal(run.effects,0);assert.equal(run.cleanup_complete,true);
});

test('inventory accepts reordered equivalent references without rewriting raw facts',async t=>{
 const authored=structuredClone(packet.variants.find(v=>v.variant==='complete-domain'));
 const R={ticket_id:'105',comment_id:'501',record_id:'00000000-0000-4000-8000-000000000001',digest:'sha256:2827bfc88e7af13ef6376278628895a6cd618a89c527eff0c00cc06c753fc52f'};
 const S={digest:'sha256:2827bfc88e7af13ef6376278628895a6cd618a89c527eff0c00cc06c753fc52f',record_id:'00000000-0000-4000-8000-000000000001',comment_id:'501',ticket_id:'105'};
 authored.request.retained_members[0].assignment=R;
 authored.script[11].body.value.assignment=S;
 const native501=authored.script[18].body.comments[0];
 const native502=structuredClone(native501);native502.id='502';
 const node=native502.body.content[0].content[0],record=JSON.parse(node.text);
 record.record_id='00000000-0000-4000-8000-000000000002';
 record.operation_id='00000000-0000-4000-8000-000000000002';record.ticket_id='101';
 record.from_stage='Rework Queued';record.payload.mode='repair';
 record.payload.previous_assignment=R;record.payload.requests=[S];node.text=JSON.stringify(record);
 const prepared=validateHandoff(JSON.stringify(record));
 assert.equal(prepared.valid,true,JSON.stringify(prepared.diagnostics));
 authored.script[8].body.total=1;authored.script[8].body.comments=[native502];
 const acquired=[2,6,9,13,16,20].map(index=>authored.script[index].body);
 const p=closureProvenance,provenance=[
  p('103','retained',null,'10001','AI-Daniel-1'),p('100','retained','103','10001','AI-Daniel-1'),p('105','typed_reference','103','10001','AI-Daniel-1'),
  p('100','seed'),p('100','retained','103','10001','AI-Daniel-1'),p('101','child','100'),p('103','declared','100','10001','AI-Daniel-1'),
  p('101','child','100','10001'),p('100','prerequisite','101'),p('104','prerequisite','101'),p('105','typed_reference','101'),
  p('103','retained',null,'10001','AI-Daniel-1'),p('105','typed_reference','103'),
  p('104','prerequisite','101','10002'),p('105','typed_reference','103','10001','AI-Daniel-1'),
  p('101','label',null,'10001','AI-Daniel-1'),p('102','label',null,'10001','AI-Daniel-1'),p('103','label',null,'10001','AI-Daniel-1'),p('102','label',null,'10001','AI-Daniel-1'),
 ];
 authored.oracle=closureOracle(acquired,provenance,authored.script,{requests_attempted:24,requests_completed:24,requests_failed:0,search_pages:4,comment_pages:6,known_issues:6,epics:1,streams:1,comments:2},{project_id:'10001',label:'AI-Daniel-1',complete:true,old_issue_ids:['103'],current_issue_ids:['101','102','103']});
 authored.oracle.reference_count=3;
 const expected=authored.oracle.acquisition;
 expected.issues.find(issue=>issue.id==='104').project_id='10002';
 expected.issues.find(issue=>issue.id==='103').pointer={state:'present',value:{schema:'pigboard-work-pointer/v1',assignment:S}};
 const comment501={id:'501',author_id:native501.author.accountId,update_author_id:native501.updateAuthor.accountId,created:native501.created,updated:native501.updated,body:JSON.stringify(native501.body)};
 const comment502={id:'502',author_id:native502.author.accountId,update_author_id:native502.updateAuthor.accountId,created:native502.created,updated:native502.updated,body:JSON.stringify(native502.body)};
 Object.assign(expected.comment_pages.find(page=>page.ticket_id==='101'),{total:1,comments:[comment502]});
 Object.assign(expected.comment_pages.find(page=>page.ticket_id==='105'),{total:1,comments:[comment501]});
 expected.exact_comments=[{ticket_id:'105',...comment501}];
 expected.references=[{...R,source_ticket_id:'103',source_comment_id:null},{...S,source_ticket_id:'101',source_comment_id:'502'},{...S,source_ticket_id:'103',source_comment_id:null}];
 authored.oracle.issue_rows.find(issue=>issue.id==='104').project_id='10002';
 Object.assign(authored.oracle.issue_rows.find(issue=>issue.id==='101'),{comment_ids:['502'],comment_count:1});
 Object.assign(authored.oracle.issue_rows.find(issue=>issue.id==='105'),{comment_ids:['501'],comment_count:1,exact_comments_read:'complete'});
 assert.equal(authored.script.length,24);assert.equal(provenance.length,19);
 const expectedHash=createHash('sha256').update(JSON.stringify(expected)).digest('hex');
 t.diagnostic('Prebound reference wire:24 calls, '+authored.oracle.counters.response_bytes+' response bytes; full private SHA256 '+expectedHash+';19 provenance rows.');
 const run=await runFixture(authored.case,authored.variant,runtime,{authoredFixture:authored});
 assert.equal(run.private_comparison.expected_sha256,expectedHash);
 assert.equal(run.private_comparison.actual_sha256,expectedHash);
 assert.equal(run.trace.filter(request=>request.path==='/rest/api/3/issue/105/comment/501').length,1);
 assert(!run.trace.some(request=>request.path==='/rest/api/3/issue/101/comment/502'));
 assert.equal(run.effects,0);assert.equal(run.cleanup_complete,true);
});
