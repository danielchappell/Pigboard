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
