import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runStateCommand} from '../scripts/manager-state.mjs';
import {resolverJourney} from '../scripts/test-aws-manager.mjs';
test('bound state CLI resolves selected operator and renders readable JSON all four record kinds',async()=>{const r=await resolverJourney();assert.equal(Object.keys(r.inspections).length,8);});
test('state CLI help and strict flags perform no resolution',async()=>{let calls=0;const options={resolveInstallation:()=>{calls++;}};assert.equal((await runStateCommand(['--help'],options)).exitCode,0);assert.equal((await runStateCommand(['init','--config','x','--installation','x','--operator-profile','operator','--force'],options)).exitCode,2);assert.equal(calls,0);});
