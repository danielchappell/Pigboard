import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runStateCommand} from '../scripts/manager-state.mjs';
import {resolverJourney} from '../scripts/test-aws-manager.mjs';
test('bound state CLI resolves selected operator and renders readable JSON all four record kinds',async()=>{const r=await resolverJourney();assert.equal(Object.keys(r.inspections).length,8);});
test('state CLI help and strict flags perform no resolution',async()=>{let calls=0;const options={resolveInstallation:()=>{calls++;}};assert.equal((await runStateCommand(['--help'],options)).exitCode,0);assert.equal((await runStateCommand(['init','--config','x','--installation','x','--operator-profile','operator','--force'],options)).exitCode,2);assert.equal((await runStateCommand(['init','--config','x','--installation','x','--operator-profile','operator','--recovery'],options)).exitCode,2);assert.equal(calls,0);});

test('explicit recovery inspect dispatches only the recovery purpose and preserves State result and warning parity',async()=>{
 const purposes=[],stateResult={schema:'pigboard-state-result/v1',status:'confirmed',code:'OK',diagnostics:[],data:{records:[],controls_match:false,complete:true,next_cursor:null}},metadata={package_verified:false,warning:'Recovery only; package safety unverified',original:{configuration_digest:'original'},desired:{configuration_digest:'desired'},observed:{configuration_digest:null},applied:{configuration_digest:'applied'},omissions:'unavailable observed digest'};
 const dependencies={resolveInstallation:async input=>{purposes.push(input.purpose);return {recovery:metadata};},createState:()=>({inspect:async()=>stateResult,close(){}})},args=['inspect','--config','x','--installation','x','--operator-profile','operator','--kind','attempt'];
 const normal=await runStateCommand([...args,'--json'],dependencies);assert.equal(normal.outcome.recovery,undefined);
 const readable=await runStateCommand([...args,'--recovery'],dependencies),json=await runStateCommand([...args,'--recovery','--json'],dependencies);assert.equal(json.exitCode,0);assert.deepEqual(json.outcome.data,stateResult.data);assert.deepEqual(readable.outcome,json.outcome);assert(readable.stdout.includes(JSON.stringify(metadata)));assert.deepEqual(JSON.parse(json.stdout),json.outcome);assert.deepEqual(purposes,['inspect','recovery-inspect','recovery-inspect']);
 let calls=0;const refused=await runStateCommand(args,{resolveInstallation:async()=>{calls++;throw Error('strict binding failed');}});assert.equal(refused.exitCode,2);assert.equal(calls,1);assert.equal(refused.outcome.recovery,undefined);assert((await runStateCommand(['--help'])).stdout.includes('--recovery'));
});
