import {test} from 'node:test';
import assert from 'node:assert/strict';
import {configureMissingCompletionJourney,boundedConcurrencyJourney,configureCompletionJourney,resolverJourney,stopJourney,configureJourney,asyncConfigRecoveryJourney,asyncConfigPostUpdateJourney,asyncConfigRefusalJourney,configureAssetRefusalJourney,configureArrayOrderRefusal,lateRecoveryJourney,publicationJourney,wrapperJourney} from '../scripts/test-aws-manager.mjs';
import {runPreview} from '../lib/aws/manager-lambda.mjs';
import {controlOnlyChange,roleMatches} from '../lib/aws/installation.mjs';
import {runInstallationCommand} from '../scripts/manager-installation.mjs';
test('actual selected-profile resolver accepts original disabled binding and refuses missing updated freshness',async()=>{await resolverJourney();});
test('actual stop producer fences revision and retains applied digest before quiescing host',async()=>{await stopJourney();});
test('normal installation rejects unsafe effective async settings before effects',async(t)=>{for(const row of await asyncConfigRefusalJourney())t.diagnostic(JSON.stringify(row));});
test('recovery inspection and stop bypass unsafe or unavailable async settings',async(t)=>{for(const row of await asyncConfigRecoveryJourney())t.diagnostic(JSON.stringify(row));});
test('configure preserves original recovery authority after post-update async drift',async(t)=>{t.diagnostic(JSON.stringify(await asyncConfigPostUpdateJourney()));});
test('configure rejects invalid local assets before service acquisition',async(t)=>{for(const row of await configureAssetRefusalJourney())t.diagnostic(JSON.stringify(row));});
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

test('installation CLI renders invalid arguments as JSON regardless of flag position',async()=>{
 let reservations=0,clients=0;const dependencies={fileOperations:{openSync:()=>{reservations++;throw Error('Unexpected output reservation');}},sdk:{fromIni:()=>{clients++;throw Error('Unexpected credentials');}},makeClient:()=>{clients++;throw Error('Unexpected service client');}};
 for(const argv of [['unknown','--json'],['bind','--unknown','value','--json'],['bind','--config','--json'],['bind','--config','x','--config','y','--json']]){
  const result=await runInstallationCommand(argv,dependencies);assert.equal(result.exitCode,2);assert.deepEqual(result.outcome,{status:'unavailable',code:'INVALID_INPUT'});assert.deepEqual(JSON.parse(result.stdout),result.outcome);
 }
 const readable=await runInstallationCommand(['unknown'],dependencies);assert.equal(readable.exitCode,2);assert.deepEqual(readable.outcome,{status:'unavailable',code:'INVALID_INPUT'});assert.equal(readable.stdout,'unavailable: '+JSON.stringify(readable.outcome)+'\n');assert.equal(reservations,0);assert.equal(clients,0);
});

test('configure waits for its own terminal stack event before restoring preview',async(t)=>{for(const row of await configureCompletionJourney())t.diagnostic(JSON.stringify(row));});
test('configure preserves original authority when completion proof is unavailable',async(t)=>{for(const row of await configureMissingCompletionJourney())t.diagnostic(JSON.stringify(row));});
test('normal observation enforces bounded concurrency without blocking stopped recovery',async(t)=>{for(const row of await boundedConcurrencyJourney())t.diagnostic(JSON.stringify(row));});
