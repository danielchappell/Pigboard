import {test} from 'node:test';
import assert from 'node:assert/strict';
import {originalCreateInitializationJourney,manifestConfigurationJourney,scheduleDriftJourney,configureMissingCompletionJourney,boundedConcurrencyJourney,configureCompletionJourney,resolverJourney,stopJourney,configureJourney,asyncConfigRecoveryJourney,asyncConfigPostUpdateJourney,asyncConfigRefusalJourney,configureAssetRefusalJourney,configureArrayOrderRefusal,lateRecoveryJourney,publicationJourney,wrapperJourney} from '../scripts/test-aws-manager.mjs';
import {runPreview} from '../lib/aws/manager-lambda.mjs';
import {controlOnlyChange,roleMatches} from '../lib/aws/installation.mjs';
import {runInstallationCommand} from '../scripts/manager-installation.mjs';
test('actual selected-profile resolver accepts original disabled binding and refuses missing updated freshness',async()=>{await resolverJourney();});
test('actual stop producer fences revision and retains applied digest before quiescing host',async()=>{await stopJourney();});
test('normal installation rejects unsafe effective async settings before effects',async(t)=>{for(const row of await asyncConfigRefusalJourney())t.diagnostic(JSON.stringify(row));});
test('recovery inspection and stop bypass unsafe or unavailable async settings',async(t)=>{for(const row of await asyncConfigRecoveryJourney())t.diagnostic(JSON.stringify(row));});
test('configure preserves original recovery authority after post-update async drift',async(t)=>{t.diagnostic(JSON.stringify(await asyncConfigPostUpdateJourney()));});
test('configure rejects invalid local assets before service acquisition',async(t)=>{for(const row of await configureAssetRefusalJourney())t.diagnostic(JSON.stringify(row));});
test('schedule drift refusal preserves diagnostic and control callers',async(t)=>{for(const row of await scheduleDriftJourney())t.diagnostic(JSON.stringify(row));});
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

test('ordinary apply host rejects stream overrides and preview package capability',async()=>{
 const {runApply}=await import('../lib/aws/manager-lambda.mjs');let calls=0;const r=await runApply({operation:'apply',stream:'stream-1'},{createState:()=>{calls++;}});assert.equal(r.code,'APPLY_EVENT_REQUIRED');assert.equal(calls,0);
 const {packet}=await import('../scripts/test-manager-apply.mjs');const c=structuredClone(packet.config);const {hostConfig}=await import('../lib/aws/installation.mjs');assert.throws(()=>hostConfig(JSON.stringify({...c,manager:{...c.manager,invocation_timeout_seconds:120}})),e=>e.code==='APPLY_BUDGET');
 const noSender=await runApply({operation:'apply'},{configText:JSON.stringify(c),manifest:{source_revision:'a'.repeat(40),sender:false},createState:()=>{calls++;}});assert.equal(noSender.status,'unavailable');assert.equal(calls,0);
});
test('ordinary apply prepared host projects actual success and disabled zero effects',async()=>{
 const {runApplyFixture}=await import('../scripts/test-manager-apply.mjs');const success=await runApplyFixture({host:true});assert.equal(success.result.schema,'pigboard-runtime-result/v1');assert.equal(success.result.status,'applied');assert.equal(success.result.writes,3);assert.equal(success.result.execution_authorized,false);assert.deepEqual(Object.keys(success.result.apply).sort(),['attempt_id','effects','hold','scope','stage','ticket_id']);const disabled=await runApplyFixture({host:true,enabled:false});assert.equal(disabled.result.status,'held');assert.equal(disabled.result.writes,0);assert.equal(disabled.mutations.length,0);
});

test('configure waits for its own terminal stack event before restoring preview',async(t)=>{for(const row of await configureCompletionJourney())t.diagnostic(JSON.stringify(row));});
test('configure preserves original authority when completion proof is unavailable',async(t)=>{for(const row of await configureMissingCompletionJourney())t.diagnostic(JSON.stringify(row));});
test('normal observation enforces bounded concurrency without blocking stopped recovery',async(t)=>{for(const row of await boundedConcurrencyJourney())t.diagnostic(JSON.stringify(row));});

test('manifest canonical configuration rejects unusable receipts before services',async(t)=>{for(const row of await manifestConfigurationJourney())t.diagnostic(JSON.stringify(row));});

test('apply unavailable setup has a sanitized unbound failed summary and invalid event has none',async()=>{const {runApply}=await import('../lib/aws/manager-lambda.mjs');const logs=[];const failed=await runApply({operation:'apply'},{configText:'invalid',healthLog:r=>logs.push(r)});assert.equal(failed.status,'unavailable');assert.equal(failed.summary.result,'failed');assert.equal(failed.summary.binding_status,'unavailable');assert.equal(logs.length,1);const invalid=await runApply({operation:'apply',extra:true},{healthLog:r=>logs.push(r)});assert.equal(invalid.summary,undefined);assert.equal(logs.length,1);});

test('original CREATE initialization accepts proven creation and preserves refusal boundaries',async(t)=>{for(const row of await originalCreateInitializationJourney())t.diagnostic(JSON.stringify(row));});

test('R3A-03 supported same-source rework configure round trip and uncertainty retain receipt',async()=>{
 const fs=await import('node:fs'),path=await import('node:path'),{preparedCloud}=await import('../scripts/test-aws-manager.mjs'),{configureInstallation,hostConfig,sha256}=await import('../lib/aws/installation.mjs');const config=JSON.parse(fs.readFileSync(new URL('./fixtures/aws-manager.json',import.meta.url))).config;config.manager.rework_enabled=false;
 const f=await preparedCloud(config);try{
 assert.equal((await (await import('../scripts/manager-state.mjs')).runStateCommand(['init','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--json'],{resolveInstallation:f.resolve})).exitCode,0);
 const original=structuredClone(f.receipt);let receipt=f.receipt;
 for(const value of [true,false]){const nextConfig=structuredClone(receipt.manifest.canonical_config);nextConfig.manager.rework_enabled=value;const text=JSON.stringify(nextConfig),digest=hostConfig(text).digest,next={...receipt.manifest,canonical_config:nextConfig,configuration_digest:digest,zip_digest:sha256('rework-'+value),payload_hashes:{...receipt.manifest.payload_hashes,'config/manager.json':digest}};fs.writeFileSync(f.configPath,text);const manifestPath=path.join(f.directory,'rework-manifest.json'),assetPath=path.join(f.directory,'rework-asset.json');fs.writeFileSync(manifestPath,JSON.stringify(next));fs.writeFileSync(assetPath,JSON.stringify({bucket:'prepared-bucket',key:'manager.zip',version:'version1',zip_digest:next.zip_digest}));f.cloud.nextCodeHash=Buffer.from(next.zip_digest.slice(7),'hex').toString('base64');const input={configPath:f.configPath,installationPath:f.installationPath,manifestPath,assetPath,operatorProfile:'operator',deployerProfile:'deployer'};
 const before=f.provider.records().find(r=>r.kind==='installation'),outcome=await configureInstallation(input,f.dependencies);assert.equal(outcome.status,'configured',JSON.stringify(outcome));assert.equal(outcome.receipt.manifest.canonical_config.manager.rework_enabled,value);assert.deepEqual(outcome.receipt.original,original.original);assert.equal(outcome.receipt.binding.package_revision,original.binding.package_revision);assert.equal(outcome.receipt.binding.configuration_digest,digest);const after=f.provider.records().find(r=>r.kind==='installation');assert.equal(after.revision,before.revision+2);assert.deepEqual(after.extensions,before.extensions,'disabled schedule retains health epoch');assert.equal(f.cloud.schedule.State,'DISABLED');assert.equal(f.cloud.concurrency,1);receipt=outcome.receipt;fs.writeFileSync(f.installationPath,JSON.stringify(receipt));}
 // Reuse the established uncertainty and source-change controls without replay.
 const desired=structuredClone(receipt.manifest);desired.canonical_config.manager.rework_enabled=true;desired.configuration_digest=hostConfig(JSON.stringify(desired.canonical_config)).digest;desired.payload_hashes['config/manager.json']=desired.configuration_digest;desired.zip_digest=sha256('uncertain-rework');fs.writeFileSync(f.configPath,JSON.stringify(desired.canonical_config));const manifestPath=path.join(f.directory,'rework-manifest.json'),assetPath=path.join(f.directory,'rework-asset.json');fs.writeFileSync(manifestPath,JSON.stringify(desired));fs.writeFileSync(assetPath,JSON.stringify({bucket:'prepared-bucket',key:'manager.zip',version:'version1',zip_digest:desired.zip_digest}));const input={configPath:f.configPath,installationPath:f.installationPath,manifestPath,assetPath,operatorProfile:'operator',deployerProfile:'deployer'};
 const audit=f.audit.length,source={...desired,source_revision:'b'.repeat(40)};fs.writeFileSync(manifestPath,JSON.stringify(source));const refused=await configureInstallation(input,f.dependencies);assert.equal(refused.code,'UNSUPPORTED_CHANGE');assert.equal(f.audit.length,audit);fs.writeFileSync(manifestPath,JSON.stringify(desired));f.cloud.fail='ExecuteChangeSetCommand';const bytes=fs.readFileSync(f.installationPath,'utf8'),partial=await configureInstallation(input,f.dependencies);assert.equal(partial.status,'partial');assert.deepEqual(partial.recovery_receipt,receipt);assert.equal(fs.readFileSync(f.installationPath,'utf8'),bytes);
 }finally{f.cleanup();}
});

test('PGB-88 ordinary apply host reports confirmed same-PR repair processing',async()=>{
 const {packet,runApplyFixture}=await import('../scripts/test-manager-apply.mjs');
 const history=packet.recorded_repair_preview.cases.find(row=>row.id==='reviewer');
 const {result,mutations,state_calls,worker_calls}=await runApplyFixture({host:true,repairCase:{historyId:history.id}});
 assert.equal(result.schema,'pigboard-runtime-result/v1');
 assert.equal(result.status,'applied',JSON.stringify(result));
 assert.equal(result.execution_authorized,false);
 assert.equal(result.writes,3);
 assert.equal(result.apply.effects.finalization,'confirmed');
 assert.equal(result.summary.mode,'apply');
 assert.equal(result.summary.result,'complete');
 assert.equal(result.summary.counts.selected,1);
 assert.equal(result.summary.counts.complete,true);
 const assignment=JSON.parse(mutations[0].body.body.content[0].content[0].text);
 assert.equal(assignment.record_id,result.apply.attempt_id);
 assert.deepEqual(assignment.payload.existing_pr,history.expected.pr);
 assert.deepEqual(assignment.payload.requests,history.expected.request_refs);
 assert.equal(state_calls.find(call=>call.name==='finalize').result.status,'confirmed');
 assert.equal(worker_calls,0);
});

test('lifecycle runtime rejects a same-name replacement before State or Jira acquisition',async()=>{
 const {packet}=await import('../scripts/test-manager-apply.mjs');
 const {fixtureCloud}=await import('../scripts/test-aws-manager.mjs');
 const {runApply}=await import('../lib/aws/manager-lambda.mjs');
 const {hostConfig,sha256}=await import('../lib/aws/installation.mjs');
 const {lifecycleManifestFields,LIFECYCLE_TABLE_ID_ENV}=await import('../lib/aws/template.mjs');
 const config=packet.config,configText=JSON.stringify(config);
 const generation='00000000-0000-4000-8000-000000000003';
 const manifest={...lifecycleManifestFields({installationId:config.manager.installation_id,generation}),
  runtime:'nodejs24.x',sender:true,canonical_config:config,configuration_digest:hostConfig(configText).digest,
  source_revision:'a'.repeat(40),installation_id:config.manager.installation_id,domain_id:config.manager.domain_id,
  installation_generation:generation,zip_digest:sha256('lifecycle runtime fixture')};
 const f=fixtureCloud(config,{initial:false},manifest);
 const environment={...f.environment,[LIFECYCLE_TABLE_ID_ENV]:f.cloud.table.TableId};
 let describes=0,acquisitions=0;
 const result=await runApply({operation:'apply'},{configText,manifest,environment,
  describeTable:async()=>{describes++;return {...f.cloud.table,TableId:'00000000-0000-4000-8000-000000000099'};},
  createState:()=>{acquisitions++;},secretFactory:()=>{acquisitions++;}});
 assert.equal(result.code,'TABLE_CONTINUITY_UNVERIFIED');
 assert.equal(result.writes,0);
 assert.equal(describes,1);
 assert.equal(acquisitions,0);
});

test('lifecycle removal preserves the original table and reports unobserved resource outcomes',async()=>{
 const {runLifecycleFixture}=await import('../scripts/test-aws-manager.mjs');
 const {removal}=await runLifecycleFixture('R1-16-H02');
 assert.equal(removal.terminal.resources.find(row=>row.logical==='StateTable').observation,'retained');
 assert.equal(removal.terminal.retention_complete,false);
});
