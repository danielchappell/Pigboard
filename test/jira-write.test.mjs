import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runApplyFixture,packet} from '../scripts/test-manager-apply.mjs';
test('fixed Jira admission wire and readbacks match independent literal packet',async()=>{const e=await runApplyFixture();assert.equal(e.result.status,'applied');assert.deepEqual(e.mutations,packet.oracle.mutations);assert.deepEqual(e.trace.filter(x=>x.path==='/rest/api/3/issue/1001/comment/700').map(x=>x.method),['GET','GET']);assert(e.trace.some(x=>x.method==='GET'&&x.path==='/rest/api/3/issue/1001/properties/pigboard.work-context'));});
