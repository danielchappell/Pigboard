import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { bindJiraReceipts } from '../lib/jira/receipts.mjs';
import { fixtureCases, runFixture } from './fixtures/jira-preview-harness.mjs';

const source=fileURLToPath(new URL('../',import.meta.url));
const groups=[['PGB-163-H01',fixtureCases.native_receipts.positive],['PGB-163-H02',fixtureCases.native_receipts.negative]];
for(const [group,variants] of groups){
 test(group+' source native receipt scenarios',async t=>{
  for(const variant of Object.keys(variants))await t.test(variant,async()=>{
   const result=await runFixture(group,variant,source);
   assert(result.oracle_matched&&result.cleanup_complete);
   assert.equal(result.effects,0);
   t.diagnostic(variant+' '+result.report.status+' '+result.trace.length+' calls, '+(result.report.counters?.response_bytes??0)+' wire bytes');
  });
 });
}

test('native read selectors reject accessors without invoking them or the resolver',async()=>{
 let getters=0,resolves=0;
 const malicious=Object.defineProperty({},'purpose',{enumerable:true,get(){getters++;throw Error('ERROR-CANARY');}});
 const ports=bindJiraReceipts({resolveSecret(){resolves++;throw Error('ERROR-CANARY');}});
 for(const call of [ports.readRecordedReceipt,ports.readReconciliationFacts]){
  const result=await call(malicious);
  assert.equal(result.code,'INPUT_INVALID');
  assert.equal(result.writes,0);
  assert(!JSON.stringify(result).includes('ERROR-CANARY'));
 }
 assert.equal(getters,0);assert.equal(resolves,0);
});
