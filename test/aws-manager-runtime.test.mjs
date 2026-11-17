import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolverJourney,stopJourney,configureJourney,configureArrayOrderRefusal,lateRecoveryJourney,publicationJourney,wrapperJourney} from '../scripts/test-aws-manager.mjs';
import {runPreview} from '../lib/aws/manager-lambda.mjs';
import {controlOnlyChange,roleMatches} from '../lib/aws/installation.mjs';
test('actual selected-profile resolver accepts original disabled binding and refuses missing updated freshness',async()=>{await resolverJourney();});
test('actual stop producer fences revision and retains applied digest before quiescing host',async()=>{await stopJourney();});
test('actual configure producer uses deployer only for bounded change set and commits controls last',async()=>{await configureJourney();await configureJourney({partial:true});});
test('preview event rejects authority overrides before creating clients',async()=>{let calls=0;const r=await runPreview({operation:'preview',writes_enabled:true},{createState:()=>{calls++;}});assert.equal(r.code,'PREVIEW_EVENT_REQUIRED');assert.equal(calls,0);});
test('actual retained State to Jira acquisition to ordinary composition stays write-free',async()=>{await wrapperJourney();});

test('late final controls failure retains changed intent and original-receipt recovery read and stop',async()=>{await lateRecoveryJourney();});
test('installation CLI reserves private output before configure and preserves confirmed outcome after publication failure',async()=>{await publicationJourney();});

test('canonical installation comparison preserves values and array order',async()=>{
 const previous={source_revision:'a'.repeat(40),runtime:'nodejs24.x',installation_generation:'fixture-generation',dependency_hashes:{root:'root-hash',aws:'aws-hash'},payload_hashes:{'lib/aws/manager-lambda.mjs':'runtime-hash','lib/manager/policy.mjs':'policy-hash','config/manager.json':'old-config','package-manifest.json':'old-manifest'}};
 const reordered={...previous,dependency_hashes:{aws:'aws-hash',root:'root-hash'},payload_hashes:{'package-manifest.json':'new-manifest','config/manager.json':'new-config','lib/manager/policy.mjs':'policy-hash','lib/aws/manager-lambda.mjs':'runtime-hash'}};
 assert.equal(controlOnlyChange(previous,reordered),true);
 const dependencyChanged=structuredClone(reordered);dependencyChanged.dependency_hashes.root='different';assert.equal(controlOnlyChange(previous,dependencyChanged),false);
 const payloadChanged=structuredClone(reordered);payloadChanged.payload_hashes['lib/aws/manager-lambda.mjs']='different';assert.equal(controlOnlyChange(previous,payloadChanged),false);
 for(const [field,value] of [['source_revision','b'.repeat(40)],['runtime','nodejs22.x'],['installation_generation','different-generation']])assert.equal(controlOnlyChange(previous,{...reordered,[field]:value}),false);
 const account='123456789012',role='arn:aws:iam::'+account+':role/pigboard-operator';assert.equal(roleMatches('arn:aws:sts::'+account+':assumed-role/pigboard-operator/session',role,account),true);assert.equal(roleMatches('arn:aws:sts::000000000000:assumed-role/pigboard-operator/session',role,account),false);assert.equal(roleMatches('arn:aws:sts::'+account+':assumed-role/another-role/session',role,account),false);
 await configureArrayOrderRefusal();
});
