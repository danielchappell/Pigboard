import { test } from 'node:test';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runFixture } from './fixtures/jira-preview-harness.mjs';

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
