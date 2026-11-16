import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {fixtureCases,runFixture} from './fixtures/jira-preview-harness.mjs';
import {inspectJiraIssues} from '../lib/jira/read.mjs';
const runtime=fileURLToPath(new URL('..',import.meta.url));
for(const v of fixtureCases.variants){test(v.case+' '+v.variant,async()=>{const r=await runFixture(v.case,v.variant,runtime);assert(r.oracle_matched);if(v.control)assert((await runFixture(v.case,v.variant,runtime,{control:true})).oracle_matched);if(v.private_projection)assert((await runFixture(v.case,v.variant,runtime,{privateProjection:true})).oracle_matched);});}
test('accessors and non-JSON inputs are rejected without invoking either accessor or resolver',async()=>{let effects=0;const request={get issue_ids(){effects++;return ['1000'];},comment_targets:[]};const r=await inspectJiraIssues('{}',request,{resolveSecret(){effects++;}});assert.equal(r.report.status,'invalid');assert.equal(effects,0);assert.equal(Object.keys(r).join(','),'report');assert.equal(Object.getOwnPropertyDescriptor(r,'observations').writable,false);});
