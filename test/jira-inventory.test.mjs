import { test } from 'node:test';
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
