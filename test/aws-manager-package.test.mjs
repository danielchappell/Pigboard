import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,readFileSync,realpathSync,rmSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {hostConfig,deriveHostControls,sha256,installationResourceBase,resolveInstallation} from '../lib/aws/installation.mjs';
import {synthesizeTemplate} from '../lib/aws/template.mjs';
import {parseConfig} from '../lib/config/parse.mjs';
import {fixtureCloud,preparedCloud,policyPermits,templateJourney} from '../scripts/test-aws-manager.mjs';
import {runStateCommand} from '../scripts/manager-state.mjs';
const fixtureBase='pigboard-fixture-f16d05ec6b29248d2c61adb1e9263f78';
const fixture=()=>JSON.parse(readFileSync(new URL('./fixtures/aws-manager.json',import.meta.url)));
const recoveryArn='arn:aws:secretsmanager:eu-west-1:123456789012:secret:team/pigboard-evidence-aB23Z9';
test('R1-23-H02-A preserves verified enablement through configure recovery', async () => {
 const {runLifecycleFixture}=await import('../scripts/test-aws-manager.mjs');
 const {enablement}=await runLifecycleFixture('R1-23-H02-A');
 assert.equal(enablement.missing,'ENABLEMENT_UNVERIFIED');
 assert.equal(enablement.host_unconfirmed,'HOST_UNCONFIRMED');
 assert.equal(enablement.capture_host_unconfirmed,'HOST_UNCONFIRMED');
 assert.equal(enablement.empty_change.code,'UNSUPPORTED_CHANGE_SET');
 assert.equal(enablement.copies.proved.operation,enablement.copies.changed_cadence.operation);
 assert.equal(enablement.historical,null);
});

test('fresh lifecycle package declares isolated resources and a disabled external table pin', async () => {
 const {config} = fixture(), text=JSON.stringify(config);
 const {lifecycleManifestFields,installationResourceMap} = await import('../lib/aws/template.mjs');
 const generation='33ce7473-f8b5-4cdd-aeba-f2e907235014';
 const revision='a'.repeat(40), previousRevision='b'.repeat(40);
 const fields=lifecycleManifestFields({installationId:'fixture',generation,previousRevision});
 const manifest={...fields,source_revision:revision,configuration_digest:hostConfig(text).digest,installation_id:'fixture',domain_id:'fixture-domain',installation_generation:generation,zip_digest:sha256('zip'),runtime:'nodejs24.x',sender:true,canonical_config:config};
 const template=synthesizeTemplate(text,manifest), {Resources:r,Parameters:p}=template;
 const map=installationResourceMap('fixture',manifest), base=map.physical.function_name;
 assert.deepEqual(manifest.resource_map,map);
 assert.equal(manifest.compatibility.previous_revision,previousRevision);
 assert.equal(manifest.compatibility.read.config,'pigboard-config/v1');
 assert.deepEqual(manifest.compatibility.read,manifest.compatibility.write);
 assert.deepEqual(Object.keys(r).filter(key=>key!=='AsyncInvocation').sort(),[...manifest.logical_resources].sort());
 assert.equal(r.Function.Properties.FunctionName,base);
 assert.equal(r.StateTable.Properties.TableName,map.physical.table_name);
 assert.equal(r.RuntimeRole.Properties.RoleName,map.physical.runtime_role);
 assert.equal(r.SchedulerRole.Properties.RoleName,map.physical.scheduler_role);
 assert.equal(r.LogGroup.Properties.LogGroupName,map.physical.log_group);
 assert.notEqual(base,installationResourceBase('fixture'));
 assert.notEqual(base,installationResourceMap('fixture',{...manifest,installation_generation:'b72ea154-320d-4af4-93ad-8fd3892edf28'}).physical.function_name);
 assert(!Object.hasOwn(r,'Schedule'));
 assert.equal(r.LifecycleSchedule.Properties.Name,map.physical.schedule_name);
 assert.equal(r.LifecycleSchedule.Properties.State,'DISABLED');
 assert.equal(r.Function.Properties.Environment.Variables.PB_WRITES_ENABLED,'false');
 assert.deepEqual(r.Function.Properties.Environment.Variables.PB_ORIGINAL_TABLE_ID,{Ref:'OriginalTableId'});
 assert.equal(p.OriginalTableId.Default,'');
 assert.equal(p.QuiescenceConcurrency.Default,1);
 assert.equal(r.StateTable.DeletionPolicy,'Retain');
 assert.equal(r.StateTable.UpdateReplacePolicy,'Retain');
 assert.equal(r.LogGroup.DeletionPolicy,'Delete');
 const table='arn:aws:dynamodb:eu-west-1:123456789012:table/'+map.physical.table_name;
 const {operator_policy:operator,configure_deployer_policy:deployer}=template.Metadata.Pigboard;
 const runtime=r.RuntimeRole.Properties.Policies[0].PolicyDocument;
 const lifecycle={leadingKeys:['operator-lifecycle#fixture']};
 assert(policyPermits(operator,'dynamodb:GetItem',table,lifecycle));
 assert(policyPermits(operator,'dynamodb:PutItem',table,{...lifecycle,enclosing:'TransactWriteItems'}));
 assert(!policyPermits(operator,'dynamodb:PutItem',table,lifecycle));
 assert(!policyPermits(runtime,'dynamodb:GetItem',table,lifecycle));
 assert(!policyPermits(deployer,'dynamodb:GetItem',table,lifecycle));
 assert(!JSON.stringify(template).includes('dynamodb:DeleteTable'));
 assert.throws(()=>synthesizeTemplate(text,{...manifest,resource_map:{...map,physical:{...map.physical,table_name:'other-table'}}}),{code:'PACKAGE_MISMATCH'});
 assert.throws(()=>synthesizeTemplate(text,{...manifest,compatibility:{...manifest.compatibility,read:{...manifest.compatibility.read,work:['pigboard-epic/v2']}}}),{code:'PACKAGE_MISMATCH'});
});

test('copied fresh lifecycle package refuses a direct apply before original table continuity', async () => {
 const {snapshotPackage}=await import('../scripts/test-aws-manager.mjs');
 const {runPackageCommand}=await import('../scripts/package-manager.mjs');
 const {packet}=await import('../scripts/test-manager-apply.mjs');
 const config=structuredClone(packet.config);
 config.manager.controls.schedule_enabled=false;
 config.manager.controls.writes_enabled=false;
 const pinned=snapshotPackage({config});
 try{
  const output=join(pinned.temp,'lifecycle-build');
  // Use the snapshotted command entry point exactly as a pinned operator would.
  execFileSync(process.execPath,[join(pinned.source,'scripts/package-manager.mjs'),'--lifecycle','--config',join(pinned.temp,'config.json'),'--revision',pinned.snapshot_revision,'--output',output],{stdio:['ignore','ignore','inherit']});
  const manifest=JSON.parse(readFileSync(join(output,'manifest.json'),'utf8')), payload=join(output,'payload');
  const invalid=runPackageCommand(['--lifecycle','--lifecycle']);
  assert.equal(JSON.parse(invalid.stdout).code,'INVALID_INPUT');
  assert.equal(manifest.schema,'pigboard-manager-package/v2');
  assert.equal(manifest.compatibility.previous_revision,null);
  const text=readFileSync(join(payload,'config/manager.json'),'utf8'), embeddedText=readFileSync(join(payload,'package-manifest.json'),'utf8'), embedded=JSON.parse(embeddedText);
  assert.deepEqual(embedded.resource_map,manifest.resource_map);
  assert.deepEqual(embedded.compatibility,manifest.compatibility);
  assert.equal(sha256(embeddedText),manifest.payload_hashes['package-manifest.json']);
  assert.equal(sha256(readFileSync(join(output,'manager.zip'))),manifest.zip_digest);
  const template=JSON.parse(readFileSync(join(output,'template.json'),'utf8'));
  const a=config.manager.aws, tableName=manifest.resource_map.physical.table_name, tableArn=`arn:aws:dynamodb:${a.region}:${a.account_id}:table/${tableName}`;
  const env={...template.Resources.Function.Properties.Environment.Variables,PB_TABLE_NAME:tableName,PB_TABLE_ARN:tableArn,PB_STACK_ID:`arn:aws:cloudformation:${a.region}:${a.account_id}:stack/${a.stack_name}/example`};
  delete env.PB_ORIGINAL_TABLE_ID;
  const {runApply}=await import(pathToFileURL(join(payload,'lib/aws/manager-lambda.mjs')).href);
  const original='33ce7473-f8b5-4cdd-aeba-f2e907235014';
  for(const testCase of [
   {name:'missing pin',pin:undefined,observed:original,reads:0,state:0},
   {name:'restored table',pin:original,observed:'b72ea154-320d-4af4-93ad-8fd3892edf28',reads:1,state:0},
   {name:'original table',pin:original,observed:original,reads:1,state:1}
  ]){
   let reads=0, state=0, secrets=0;
   const result=await runApply({operation:'apply'},{configText:text,manifest:embedded,environment:{...env,PB_ORIGINAL_TABLE_ID:testCase.pin},
    describeTable:async binding=>{reads++;assert.equal(binding.table_arn,tableArn);return {TableArn:tableArn,TableId:testCase.observed,TableStatus:'ACTIVE'};},
    createState:()=>{state++;throw new Error('End simulated state setup');},
    secretFactory:()=>{secrets++;throw new Error('Unexpected secret access');}});
   assert.equal(result.code,testCase.state?'APPLY_UNAVAILABLE':'TABLE_CONTINUITY_UNVERIFIED',testCase.name);
   assert.equal(result.writes,0,testCase.name);
   assert.deepEqual({reads,state,secrets},{reads:testCase.reads,state:testCase.state,secrets:0},testCase.name);
  }
 }finally{pinned.cleanup();}
});
test('disabled package synthesizes scoped read-only runtime and retained bounded host',()=>{
 const {config}=fixture(),text=JSON.stringify(config),{digest}=hostConfig(text),manifest={schema:'pigboard-manager-package/v1',source_revision:'a'.repeat(40),configuration_digest:digest,installation_id:config.manager.installation_id,domain_id:config.manager.domain_id,installation_generation:'fixture-generation',zip_digest:sha256('zip'),canonical_config:config};
 const t=synthesizeTemplate(text,manifest),r=t.Resources;assert.equal(r.Schedule.Properties.State,'DISABLED');assert.equal(r.Function.Properties.ReservedConcurrentExecutions.Ref,'QuiescenceConcurrency');assert.equal(t.Parameters.QuiescenceConcurrency.Default,1);assert.equal(r.Function.Properties.Runtime,'nodejs24.x');assert.equal(r.AsyncInvocation.Properties.Qualifier,'$LATEST');assert.equal(r.AsyncInvocation.Properties.MaximumRetryAttempts,0);assert.equal(r.AsyncInvocation.Properties.MaximumEventAgeInSeconds,60);assert.equal(r.Schedule.Properties.Target.RetryPolicy.MaximumRetryAttempts,0);assert.equal(r.Schedule.Properties.Target.RetryPolicy.MaximumEventAgeInSeconds,60);assert.equal(r.StateTable.DeletionPolicy,'Retain');assert.equal(r.StateTable.UpdateReplacePolicy,'Retain');assert.equal(r.LogGroup.Properties.RetentionInDays,14);
 const runtime=r.RuntimeRole.Properties.Policies[0].PolicyDocument.Statement;assert(!JSON.stringify(runtime).includes('dynamodb:Scan'));assert(!JSON.stringify(runtime).includes('dynamodb:PutItem'));assert(!JSON.stringify(runtime).includes('dynamodb:UpdateItem'));assert(!JSON.stringify(t).includes('DeleteItem'));assert(!JSON.stringify(t).includes('ConditionCheckItem'));assert(!Object.values(r).some(v=>['AWS::Lambda::Url','AWS::ApiGateway::RestApi'].includes(v.Type)));
 const op=t.Metadata.Pigboard.operator_policy.Statement;const writes=op.find(v=>v.Action.includes?.('dynamodb:PutItem'));assert.deepEqual(writes.Condition,{Null:{'dynamodb:LeadingKeys':'false'},'ForAllValues:StringEquals':{'dynamodb:LeadingKeys':['installation#fixture']},'ForAnyValue:StringEquals':{'dynamodb:EnclosingOperation':['TransactWriteItems']}});assert(writes.Resource.endsWith('/'+fixtureBase+'-state'));assert(op.some(v=>v.Action.includes?.('dynamodb:Scan')));assert(!JSON.stringify(op).includes('ExecuteChangeSet'));
 const projected=deriveHostControls(text,{package_revision:manifest.source_revision});assert.equal(projected.mode,'preview');assert.deepEqual(projected.control,{configuration_digest:digest,schedule_enabled:false,writes_enabled:false,maintenance:false});
});

test('canonical recovery credential validates exact distinct ARNs and adds one operator-only grant',()=>{
 const {config}=fixture(), senderArn=config.jira.connection.secret_reference;
 const baseline=JSON.stringify(config), baselineDigest=hostConfig(baseline).digest;
 const template=value=>{
  const text=JSON.stringify(value),digest=hostConfig(text).digest;
  return synthesizeTemplate(text,{schema:'pigboard-manager-package/v1',source_revision:'a'.repeat(40),configuration_digest:digest,
   installation_id:value.manager.installation_id,domain_id:value.manager.domain_id,installation_generation:'fixture-generation',zip_digest:sha256('zip'),canonical_config:value});
 };
 const original=template(config);
 config.manager.aws.recovery_jira_secret_arn=recoveryArn;
 assert.notEqual(hostConfig(JSON.stringify(config)).digest,baselineDigest);
 const withRecovery=template(config);
 const originalPolicies=original.Metadata.Pigboard, proposedPolicies=withRecovery.Metadata.Pigboard;
 assert.deepEqual(proposedPolicies.operator_policy.Statement,[...originalPolicies.operator_policy.Statement,
  {Effect:'Allow',Action:'secretsmanager:GetSecretValue',Resource:recoveryArn}]);
 assert.deepEqual(originalPolicies.operator_policy.Statement.filter(s=>[s.Action].flat().some(a=>a.startsWith('secretsmanager:'))),[]);
 assert.deepEqual(proposedPolicies.configure_deployer_policy,originalPolicies.configure_deployer_policy);
 assert.deepEqual(withRecovery.Resources.RuntimeRole,original.Resources.RuntimeRole);
 assert.deepEqual(withRecovery.Resources.SchedulerRole,original.Resources.SchedulerRole);
 assert.deepEqual(withRecovery.Resources.RuntimeRole.Properties.Policies[0].PolicyDocument.Statement.filter(s=>[s.Action].flat().some(a=>a.startsWith('secretsmanager:'))),
  [{Effect:'Allow',Action:'secretsmanager:GetSecretValue',Resource:senderArn}]);
 for(const [recovery,sender] of [
  [senderArn,senderArn], [senderArn.slice(0,-6)+'123456',senderArn], [recoveryArn+'-pq1234',recoveryArn],
  [recoveryArn,recoveryArn+'-pq1234'], [recoveryArn.slice(0,-7),senderArn], ['pigboard-evidence',senderArn],
  [recoveryArn.replace('eu-west-1','us-east-1'),senderArn], [recoveryArn.replace('123456789012','123456789013'),senderArn],
  [recoveryArn.replace('team/','*/'),senderArn], [recoveryArn+'\n',senderArn], [recoveryArn,senderArn.slice(0,-7)],
  [recoveryArn,senderArn.replace('123456789012','123456789013')], [recoveryArn,'pigboard-fixture']
 ]){
  config.manager.aws.recovery_jira_secret_arn=recovery;
  config.jira.connection.secret_reference=sender;
  const parsed=parseConfig(JSON.stringify(config));
  assert.equal(parsed.valid,false);
  assert.equal(parsed.diagnostics[0].path,'/manager/aws/recovery_jira_secret_arn');
  assert(!JSON.stringify(parsed).includes(sender));
 }
 delete config.manager.aws.recovery_jira_secret_arn;
 config.jira.connection.secret_reference=senderArn.slice(0,-7);
 assert(hostConfig(JSON.stringify(config)).digest);
});

test('copied pinned package imports and rejects extra event fields under selected Node runtime',async()=>{
 const {snapshotPackage}=await import('../scripts/test-aws-manager.mjs'),{config}=fixture();
 config.manager.aws.recovery_jira_secret_arn=recoveryArn;
 const built=snapshotPackage({config});try{
 const node24=process.env.PGB_NODE24??process.execPath;if(process.env.PGB_NODE24)assert.match(execFileSync(node24,['--version'],{encoding:'utf8'}),/^v24\./);
 const url=pathToFileURL(built.payload+'/lib/aws/manager-lambda.mjs').href,code=`const {handler}=await import(${JSON.stringify(url)});console.log(JSON.stringify(await handler({operation:'preview',override:true},{})));`;
 const lines=execFileSync(node24,['--input-type=module','-e',code],{encoding:'utf8'}).trim().split('\n'),out=JSON.parse(lines.at(-1));assert(lines.every(line=>!line.includes('dummy-scoped-token')));assert.equal(out.code,'PREVIEW_EVENT_REQUIRED');assert.equal(out.writes,0);assert(built.manifest.payload_hashes['contracts/epic-v1.schema.json']);assert(built.manifest.payload_hashes['runtime/aws/package-lock.json']);
 for(const path of ['contracts/config-v1.schema.json','lib/config/parse.mjs','lib/aws/installation.mjs']){
  const source=readFileSync(new URL('../'+path,import.meta.url)),copied=readFileSync(join(built.payload,path));
  assert.deepEqual(copied,source,path);
  assert.equal(built.manifest.payload_hashes[path],sha256(copied),path);
 }
 const canonical=readFileSync(join(built.payload,'config/manager.json'));
 assert.deepEqual(JSON.parse(canonical),config);
 assert.equal(built.manifest.payload_hashes['config/manager.json'],sha256(canonical));
 assert.equal(built.manifest.configuration_digest,hostConfig(canonical.toString()).digest);
 const host=await preparedCloud(config,built.manifest),{sdk,makeClient}=host.dependencies;
 try{
  writeFileSync(host.installationPath,JSON.stringify(host.receipt,null,2)+'\n');
  const resolved=await resolveInstallation({configPath:host.configPath,installationPath:host.installationPath,
   originalInstallationPath:host.installationPath,purpose:'evidence-inspect',operatorProfile:'operator'},
  {sdk,makeClient(kind,options){
   const client=makeClient(kind,options);
   if(kind!=='STS')return client;
   return {...client,send:async(...args)=>({...await client.send(...args),UserId:'fixture-user-id'})};
  }});
  try{
   assert.deepEqual(resolved.evidenceAuthority.original?.binding,resolved.evidenceAuthority.binding);
   assert.equal(resolved.evidenceAuthority.recoverySecretOutcome(),'not-called');
   assert(host.audit.every(entry=>/^(Get|Describe)/.test(entry.action)));
  }finally{resolved.dispose();}
 }finally{host.cleanup();}
 }finally{built.cleanup();}
});

test('protected history follows bounded AWS pages with one frozen operator snapshot and no secret client',async()=>{
 const {config}=fixture();config.manager.aws.recovery_jira_secret_arn=recoveryArn;
 const f=await preparedCloud(config);try{
  const {events}=f.cloud;
  f.cloud.stack.StackStatus='UPDATE_COMPLETE';
  const first={StackEvents:[{StackId:f.stackId,PhysicalResourceId:f.stackId,ResourceType:'AWS::CloudFormation::Stack',ResourceStatus:'UPDATE_COMPLETE'}],NextToken:'original'};
  const cases=[
   {name:'complete',eventPage:({NextToken})=>NextToken?{StackEvents:events}:first,kind:'protected',pages:2},
   {name:'legacy',eventPage:()=>({StackEvents:fixtureCloud(config,{birth:'legacy'}).cloud.events}),kind:'legacy',pages:1},
   {name:'repeated-token',eventPage:()=>first,kind:'unverified',pages:2},
   {name:'bounded-pages',eventPage:({NextToken})=>({StackEvents:[],NextToken:String(Number(NextToken??0)+1)}),kind:'unverified',pages:8}
  ];
  // Live route age affects new settlement. Named historical lookup still binds
  // the current receipt and authenticates the original protected table.
  f.cloud.fail='GetFunctionEventInvokeConfigCommand';
  for(const {name,eventPage,kind,pages} of cases){
   f.cloud.eventPage=eventPage;
   const {sdk,makeClient}=f.dependencies,created=[],before=f.audit.length;
   let snapshot,credentialsCalls=0;
   const wrappedSdk={...sdk,fromIni(options){
    const load=sdk.fromIni(options);
    return async()=>{credentialsCalls++;return load();};
   }};
   const resolved=await resolveInstallation({configPath:f.configPath,installationPath:f.installationPath,operatorProfile:'operator',purpose:'decision-inspect'},{
    sdk:wrappedSdk,
    makeClient(clientKind,options){
     created.push(clientKind);
     assert(Object.isFrozen(options.credentials));
     snapshot??=options.credentials;
     assert.equal(options.credentials,snapshot);
     return makeClient(clientKind,options);
    }
   });
   try{
    assert.equal(credentialsCalls,1,name);
    assert.equal(resolved.birthClassification,kind,name);
    assert.equal(resolved.originEvidence?.table_id,kind==='protected'?f.cloud.table.TableId:undefined,name);
    assert.equal(resolved.session.operator.identity.UserId,'AROAEXAMPLE:fixture',name);
    assert(!created.includes('SecretsManager'),name);
    assert.equal(f.audit.slice(before).filter(call=>call.action==='DescribeStackEventsCommand').length,pages,name);
    assert(!f.audit.slice(before).some(call=>call.action==='GetFunctionEventInvokeConfigCommand'),name);
   }finally{resolved.dispose();}
  }
 }finally{f.cleanup();}
});

test('disabled package IAM allows concrete intended transactions and denies unrelated or runtime mutations',()=>{
 const {config}=fixture(),text=JSON.stringify(config),manifest={schema:'pigboard-manager-package/v1',source_revision:'a'.repeat(40),configuration_digest:hostConfig(text).digest,installation_id:'fixture',domain_id:'fixture-domain',installation_generation:'generation',zip_digest:sha256('zip'),canonical_config:config},template=synthesizeTemplate(text,manifest),runtime=template.Resources.RuntimeRole.Properties.Policies[0].PolicyDocument,operator=template.Metadata.Pigboard.operator_policy;
 const permits=policyPermits, txn={enclosing:'TransactWriteItems',leadingKeys:['installation#fixture']}, normal={leadingKeys:txn.leadingKeys};
 const table='arn:aws:dynamodb:eu-west-1:123456789012:table/'+fixtureBase+'-state',other=table+'-unrelated';
 for(const action of ['dynamodb:GetItem','dynamodb:Query','dynamodb:DescribeTable','dynamodb:Scan']){assert(permits(operator,action,table));assert(!permits(operator,action,other));}
 for(const action of ['dynamodb:PutItem','dynamodb:UpdateItem']){assert(permits(operator,action,table,txn));assert(!permits(operator,action,table));assert(!permits(operator,action,other,txn));assert(!permits(runtime,action,table,txn));}
 for(const action of ['dynamodb:GetItem','dynamodb:Query','dynamodb:DescribeTable']){assert(permits(runtime,action,table,normal));assert(!permits(runtime,action,other,normal));}assert(!permits(runtime,'dynamodb:Scan',table));assert(!permits(runtime,'secretsmanager:GetSecretValue',config.jira.connection.secret_reference+'other'));assert(permits(runtime,'secretsmanager:GetSecretValue',config.jira.connection.secret_reference));assert(!permits(runtime,'lambda:InvokeFunction','anything'));assert(!permits(operator,'cloudformation:ExecuteChangeSet','anything'));
 const action='lambda:GetFunctionEventInvokeConfig',functionArn='arn:aws:lambda:eu-west-1:123456789012:function:'+fixtureBase,latest=functionArn+':$LATEST',scheduler=template.Resources.SchedulerRole.Properties.Policies[0].PolicyDocument,deployer=template.Metadata.Pigboard.configure_deployer_policy;
 const read=operator.Statement.filter(s=>[s.Action].flat().includes(action));assert.equal(read.length,1);assert.deepEqual(read[0],{Effect:'Allow',Action:action,Resource:latest});assert(permits(operator,action,latest));for(const resource of [functionArn,functionArn+'-other:$LATEST',functionArn+':1'])assert(!permits(operator,action,resource));
 for(const policy of [runtime,scheduler,deployer])assert(!permits(policy,action,latest));for(const mutation of ['lambda:InvokeFunction','lambda:PutFunctionConcurrency','lambda:UpdateFunctionCode','lambda:UpdateFunctionConfiguration']){assert(!permits(operator,mutation,latest));assert(!permits(deployer,mutation,latest));}

});

test('configure deployer reads only the generated resource metadata',()=>{
 const {config}=fixture(),text=JSON.stringify(config),f=fixtureCloud(config),a=config.manager.aws,arn=(service,resource)=>`arn:aws:${service}:${a.region}:${a.account_id}:${resource}`,role=kind=>`arn:aws:iam::${a.account_id}:role/${fixtureBase}-${kind}`;
 const stack={'Fn::Sub':'arn:aws:cloudformation:${AWS::Region}:${AWS::AccountId}:stack/${AWS::StackName}/*'},functionArn=arn('lambda','function:'+fixtureBase),tableArn=arn('dynamodb','table/'+fixtureBase+'-state');
 const original=[
  {Effect:'Allow',Action:['cloudformation:CreateChangeSet','cloudformation:DescribeChangeSet','cloudformation:ExecuteChangeSet','cloudformation:DeleteChangeSet'],Resource:[stack,arn('cloudformation','changeSet/pigboard-controls-*/*')]},
  {Effect:'Allow',Action:['cloudformation:DescribeStacks','cloudformation:DescribeStackResources'],Resource:stack},
  {Effect:'Allow',Action:['lambda:UpdateFunctionCode','lambda:UpdateFunctionConfiguration','lambda:GetFunction','lambda:GetFunctionConfiguration','lambda:PutFunctionConcurrency'],Resource:functionArn},
  {Effect:'Allow',Action:['scheduler:GetSchedule','scheduler:UpdateSchedule'],Resource:arn('scheduler','schedule/default/'+fixtureBase)},
  {Effect:'Allow',Action:'logs:PutRetentionPolicy',Resource:arn('logs','log-group:/aws/lambda/'+fixtureBase+':*')},
  {Effect:'Allow',Action:'iam:PassRole',Resource:[role('runtime'),role('scheduler')]},
  {Effect:'Allow',Action:'iam:GetRole',Resource:role('runtime')}
 ];
 for(const initial of [true,false]){
  const t=synthesizeTemplate(text,f.manifest,{initial}),deployer=t.Metadata.Pigboard.configure_deployer_policy.Statement;
  assert.deepEqual(deployer,[...original,
   {Effect:'Allow',Action:'dynamodb:DescribeTable',Resource:tableArn},
   {Effect:'Allow',Action:'iam:GetRole',Resource:role('scheduler')}
  ]);
  assert(deployer.every(s=>[s.Action].flat().every(action=>!action.includes('*'))));
  for(const policy of [t.Metadata.Pigboard.operator_policy,t.Resources.RuntimeRole.Properties.Policies[0].PolicyDocument,t.Resources.SchedulerRole.Properties.Policies[0].PolicyDocument])assert(!policy.Statement.some(s=>[s.Action].flat().includes('iam:GetRole')));
 }
});

test('generated installation names distinguish valid IDs and bind exact resources',async()=>{
 assert.equal(installationResourceBase('fixture'),fixtureBase);
 const ids=['team:prod','team.prod','a'.repeat(40)+'-one','a'.repeat(40)+'-two'],generated=[];
 for(const id of ids){
  const {config}=fixture();config.manager.installation_id=id;const f=fixtureCloud(config),text=JSON.stringify(config),t=synthesizeTemplate(text,f.manifest),r=t.Resources;
  assert.deepEqual(synthesizeTemplate(text,f.manifest),t);
  const names={Function:r.Function.Properties.FunctionName,Schedule:r.Schedule.Properties.Name,StateTable:r.StateTable.Properties.TableName,RuntimeRole:r.RuntimeRole.Properties.RoleName,SchedulerRole:r.SchedulerRole.Properties.RoleName,LogGroup:r.LogGroup.Properties.LogGroupName},base=names.Function;
  assert.match(base,/-[a-f0-9]{32}$/);assert(base.startsWith('pigboard-'+id.replace(/[^A-Za-z0-9-]/g,'-').slice(0,12)+'-'));
  for(const [kind,max] of Object.entries({Function:54,Schedule:54,StateTable:60,RuntimeRole:62,SchedulerRole:64,LogGroup:66})){assert(names[kind].length<=max);assert.match(names[kind],kind==='LogGroup'?/^\/aws\/lambda\/[A-Za-z0-9-]+$/:/^[A-Za-z0-9-]+$/);}
  assert.equal(names.Schedule,base);assert.equal(names.StateTable,base+'-state');assert.equal(names.RuntimeRole,base+'-runtime');assert.equal(names.SchedulerRole,base+'-scheduler');assert.equal(names.LogGroup,'/aws/lambda/'+base);
  const a=config.manager.aws,arn=(service,value)=>`arn:aws:${service}:${a.region}:${a.account_id}:${value}`,tableArn=arn('dynamodb','table/'+names.StateTable),functionArn=arn('lambda','function:'+base),scheduleArn=arn('scheduler','schedule/default/'+base),logArn=arn('logs','log-group:'+names.LogGroup+':*'),role=kind=>`arn:aws:iam::${a.account_id}:role/${names[kind]}`;
  const permits=(policy,action,resource)=>policy.Statement.some(s=>[s.Action].flat().includes(action)&&[s.Resource].flat().includes(resource));
  for(const current of [t,synthesizeTemplate(text,f.manifest,{initial:false})]){
  const deployer=current.Metadata.Pigboard.configure_deployer_policy;
  assert.deepEqual(deployer,t.Metadata.Pigboard.configure_deployer_policy);assert.equal(deployer.Statement.length,9);
  assert.deepEqual(deployer.Statement.slice(7),[{Effect:'Allow',Action:'dynamodb:DescribeTable',Resource:tableArn},{Effect:'Allow',Action:'iam:GetRole',Resource:role('SchedulerRole')}]);
  for(const statement of deployer.Statement.slice(7)){assert(!statement.Action.includes('*'));assert(!statement.Resource.includes('*'));}
  assert(permits(deployer,'dynamodb:DescribeTable',tableArn));assert(!permits(deployer,'dynamodb:DescribeTable',tableArn+'-unrelated'));
  for(const kind of ['RuntimeRole','SchedulerRole']){assert(permits(deployer,'iam:GetRole',role(kind)));assert(!permits(deployer,'iam:GetRole',role(kind)+'-unrelated'));}
  assert(permits(deployer,'lambda:GetFunction',functionArn));assert(!permits(deployer,'lambda:GetFunction',functionArn+'-unrelated'));
  for(const action of ['dynamodb:GetItem','dynamodb:Query','dynamodb:Scan','dynamodb:PutItem','dynamodb:UpdateItem'])assert(!permits(deployer,action,tableArn));
  for(const action of ['iam:CreateRole','iam:UpdateRole','iam:PutRolePolicy'])for(const kind of ['RuntimeRole','SchedulerRole'])assert(!permits(deployer,action,role(kind)));
  }
  assert(permits(t.Metadata.Pigboard.operator_policy,'dynamodb:GetItem',tableArn));assert(permits(t.Metadata.Pigboard.operator_policy,'lambda:GetFunction',functionArn));assert(permits(t.Metadata.Pigboard.operator_policy,'scheduler:GetSchedule',scheduleArn));assert(permits(t.Metadata.Pigboard.operator_policy,'iam:PassRole',role('SchedulerRole')));
  assert(permits(t.Metadata.Pigboard.configure_deployer_policy,'lambda:UpdateFunctionCode',functionArn));assert(permits(t.Metadata.Pigboard.configure_deployer_policy,'logs:PutRetentionPolicy',logArn));assert(permits(t.Metadata.Pigboard.configure_deployer_policy,'iam:PassRole',role('RuntimeRole')));
  assert(permits(r.RuntimeRole.Properties.Policies[0].PolicyDocument,'dynamodb:GetItem',tableArn));assert(permits(r.RuntimeRole.Properties.Policies[0].PolicyDocument,'logs:PutLogEvents',logArn));assert(permits(r.SchedulerRole.Properties.Policies[0].PolicyDocument,'lambda:InvokeFunction',functionArn));
  assert.equal(t.Outputs.ScheduleArn.Value,scheduleArn);for(const [output,resource] of [['FunctionName','Function'],['ScheduleName','Schedule'],['TableName','StateTable'],['LogGroupName','LogGroup']])assert.deepEqual(t.Outputs[output].Value,{Ref:resource});for(const [output,resource] of [['FunctionArn','Function'],['TableArn','StateTable']])assert.deepEqual(t.Outputs[output].Value,{'Fn::GetAtt':[resource,'Arn']});assert.deepEqual(r.Schedule.Properties.Target.Arn,{'Fn::GetAtt':['Function','Arn']});assert.deepEqual(r.Schedule.Properties.Target.RoleArn,{'Fn::GetAtt':['SchedulerRole','Arn']});
  assert.equal(r.Function.Properties.Environment.Variables.PB_INSTALLATION_ID,id);assert.equal(f.environment.PB_INSTALLATION_ID,id);assert.equal(f.binding.table_name,names.StateTable);generated.push({id,config,names});
 }
 for(const kind of Object.keys(generated[0].names))assert.equal(new Set(generated.map(v=>v.names[kind])).size,ids.length);
 for(const sample of [generated[0],generated[2]]){
  const f=await preparedCloud(sample.config);try{
   const originalReceipt=readFileSync(f.installationPath,'utf8'),args=['--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--json'];
   const initialized=await runStateCommand(['init',...args],{resolveInstallation:f.resolve});assert.equal(initialized.exitCode,0,initialized.stdout);
   const inspected=await runStateCommand(['inspect',...args,'--kind','installation'],{resolveInstallation:f.resolve});assert.equal(inspected.exitCode,0,inspected.stdout);assert.equal(inspected.outcome.data.records[0].installation_id,sample.id);assert.equal(f.receipt.binding.installation_id,sample.id);assert.equal(f.receipt.binding.table_name,sample.names.StateTable);assert.equal(f.receipt.original.table_name,sample.names.StateTable);
   if(sample===generated[0]){
    const original=f.dependencies.makeClient;f.dependencies.makeClient=(kind,options)=>{const client=original(kind,options);return {...client,send:async(command,sendOptions)=>{const response=await client.send(command,sendOptions);if(command.constructor.name==='DescribeStackResourcesCommand')return {...response,StackResources:response.StackResources.map(r=>r.LogicalResourceId==='StateTable'?{...r,PhysicalResourceId:generated[1].names.StateTable}:r)};return response;}};};
    const before=f.provider.snapshot(),auditStart=f.audit.length,mismatched=await runStateCommand(['inspect',...args,'--kind','installation'],{resolveInstallation:f.resolve});assert.equal(mismatched.outcome.code,'BINDING_MISMATCH');assert.equal(f.provider.snapshot(),before);assert(f.audit.slice(auditStart).every(a=>/^(Get|Describe|Query|TransactGet)/.test(a.action)));assert.equal(f.cloud.schedule.State,'DISABLED');assert.equal(f.cloud.concurrency,1);
   }
   assert.equal(readFileSync(f.installationPath,'utf8'),originalReceipt);
  }finally{f.cleanup();}
 }
});

test('sender capability keeps initial off and scopes concrete transactional IAM',async()=>{
 const {packet}=await import('../scripts/test-manager-apply.mjs');const config=structuredClone(packet.config);config.manager.controls.schedule_enabled=false;config.manager.controls.writes_enabled=false;const text=JSON.stringify(config),manifest={schema:'pigboard-manager-package/v1',sender:true,source_revision:'a'.repeat(40),configuration_digest:hostConfig(text).digest,installation_id:config.manager.installation_id,domain_id:config.manager.domain_id,installation_generation:'generation',zip_digest:sha256('zip'),canonical_config:config};const template=synthesizeTemplate(text,manifest),r=template.Resources;assert.equal(r.Schedule.Properties.State,'DISABLED');assert.equal(r.Schedule.Properties.Target.Input,'{"operation":"apply"}');assert.equal(r.AsyncInvocation.Properties.MaximumRetryAttempts,0);assert.equal(r.Schedule.Properties.Target.RetryPolicy.MaximumRetryAttempts,0);assert.deepEqual(Object.keys(r).sort(),['AsyncInvocation','Function','LogGroup','RuntimeRole','Schedule','SchedulerRole','StateTable']);const statements=r.RuntimeRole.Properties.Policies[0].PolicyDocument.Statement;const write=statements.find(s=>s.Action.includes?.('dynamodb:PutItem'));assert.deepEqual(write.Action,['dynamodb:PutItem','dynamodb:UpdateItem','dynamodb:ConditionCheckItem']);assert.deepEqual(write.Condition,{Null:{'dynamodb:LeadingKeys':'false'},'ForAllValues:StringEquals':{'dynamodb:LeadingKeys':['installation#fixture']},'ForAnyValue:StringEquals':{'dynamodb:EnclosingOperation':['TransactWriteItems']}});assert.equal(write.Resource,'arn:aws:dynamodb:eu-west-1:123456789012:table/pigboard-fixture-f16d05ec6b29248d2c61adb1e9263f78-state');assert(!JSON.stringify(statements).includes('DeleteItem'));assert(!JSON.stringify(statements).includes('dynamodb:Scan'));assert(templateJourney().checks.length>0);assert.throws(()=>synthesizeTemplate(text,{...manifest,sender:false}),e=>e.code==='APPLY_UNSUPPORTED');
});

test('R3A-03 canonical opt-in projects outside State control columns and binds manifest',async()=>{
 const {validateManifest,controlOnlyChange}=await import('../lib/aws/installation.mjs');const {config}=fixture(),revision='a'.repeat(40);
 for(const value of [undefined,false,true]){const c=structuredClone(config);if(value!==undefined)c.manager.rework_enabled=value;const text=JSON.stringify(c),p=deriveHostControls(text,{package_revision:revision});assert.equal(p.rework_enabled,value===true);assert.deepEqual(Object.keys(p.control).sort(),['configuration_digest','maintenance','schedule_enabled','writes_enabled']);const manifest={schema:'pigboard-manager-package/v1',source_revision:revision,configuration_digest:p.configuration_digest,installation_id:p.installation_id,domain_id:p.domain_id,installation_generation:'fixture-generation',zip_digest:sha256('zip'),canonical_config:c};assert.equal(validateManifest(manifest,text).rework_enabled,value===true);const changed=structuredClone(manifest);changed.canonical_config.manager.rework_enabled=value!==true;assert.throws(()=>validateManifest(changed,text),e=>e.code==='PACKAGE_MISMATCH');assert.equal(controlOnlyChange(manifest,{...manifest,source_revision:'b'.repeat(40)}),false);}
});

// The exact-revision check is called separately from dirty-worktree regression runs.
const repairSourcePin = process.env.PGB_REPAIR_PACKAGE_SOURCE_PIN;
if (repairSourcePin !== undefined) test('PGB-88 pinned package repair admission', async t => {
  assert.match(repairSourcePin, /^[a-f0-9]{40}$/);
  assert.match(process.version, /^v24\./, 'Use prepared Node.js 24 for the packaged repair check.');
  const {packageManager} = await import('../scripts/package-manager.mjs');
  const {packet,repairFixtureConfig,runRepairGroup} = await import('../scripts/test-manager-apply.mjs');
  const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
  const git = (...args) => execFileSync('git', args, {cwd:root,encoding:'utf8'}).trim();
  assert.equal(git('rev-parse','HEAD'), repairSourcePin);
  assert.equal(git('status','--porcelain','--untracked-files=normal'), '');
  const temp = mkdtempSync(join(tmpdir(), 'pigboard-repair-package-'));
  t.after(() => rmSync(temp, {recursive:true,force:true}));

  const configPath = join(temp, 'repair-config.json');
  const historyId = 'reviewer';
  writeFileSync(configPath, JSON.stringify(repairFixtureConfig(historyId)));
  const generation = 'disposable-repair-package-generation';
  const built = packageManager({
    configPath, output:join(temp, 'build'), source:root, revision:repairSourcePin, generation
  });
  const payload = realpathSync(built.payload);
  const embeddedConfigPath = join(payload, 'config/manager.json');
  const embeddedManifestPath = join(payload, 'package-manifest.json');
  const configText = readFileSync(embeddedConfigPath, 'utf8');
  const manifestText = readFileSync(embeddedManifestPath, 'utf8');
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.source_revision, repairSourcePin);
  assert.equal(built.manifest.source_revision, repairSourcePin);
  assert.equal(manifest.installation_generation, generation);
  assert.equal(manifest.sender, true);
  assert.equal(manifest.runtime, 'nodejs24.x');
  assert.deepEqual(JSON.parse(configText), manifest.canonical_config);
  assert.equal(hostConfig(configText).digest, manifest.configuration_digest);
  assert.equal(sha256(configText), built.manifest.payload_hashes['config/manager.json']);
  assert.equal(sha256(manifestText), built.manifest.payload_hashes['package-manifest.json']);
  assert.equal(existsSync(join(payload, 'scripts/test-manager-apply.mjs')), false);
  assert.equal(existsSync(join(payload, 'test/fixtures/manager-apply.json')), false);

  const modules = {};
  for (const path of ['lib/aws/manager-lambda.mjs','lib/aws/dynamodb.mjs','lib/manager/apply.mjs','lib/jira/read.mjs']) {
    const copied = join(payload, path);
    assert.equal(realpathSync(copied), copied);
    const sourceHash = sha256(execFileSync('git', ['show', repairSourcePin + ':' + path], {cwd:root}));
    assert.equal(sha256(readFileSync(join(root, path))), sourceHash, path);
    const copyHash = sha256(readFileSync(copied));
    assert.equal(copyHash, sourceHash, path);
    assert.equal(copyHash, manifest.payload_hashes[path], path);
    modules[path] = {path:copied,sha256:copyHash};
  }
  const {runApply} = await import(pathToFileURL(modules['lib/aws/manager-lambda.mjs'].path).href);
  const {createDynamoState} = await import(pathToFileURL(modules['lib/aws/dynamodb.mjs'].path).href);
  const group = await runRepairGroup('R3B-H01', {
    caseId:historyId, runtime:{runApply,createDynamoState,configText,manifest}
  });
  assert.equal(group.runs.length, 1);
  const receipt = group.runs[0];
  assert.equal(receipt.execution.manager, 'prepared_package');
  const expected = packet.recorded_repair_preview.cases.find(history => history.id === historyId).expected;
  const {result,mutations,state_calls,records} = receipt;
  const verifiedAdmission = JSON.parse(mutations[0]?.body?.body?.content[0]?.content[0]?.text ?? 'null');
  assert.equal(result.status, 'applied', JSON.stringify(result));
  assert.equal(result.package_revision, repairSourcePin);
  assert.equal(result.configuration_digest, manifest.configuration_digest);
  assert.equal(result.writes, 3);
  assert.equal(result.apply.effects.finalization, 'confirmed');
  assert.equal(result.execution_authorized, false);
  const issue = '/rest/api/3/issue/' + expected.assignment.ticket_id;
  assert.deepEqual(mutations.map(({method,path}) => [method,path]), [
    ['POST',issue + '/comment'],
    ['PUT',issue + '/properties/pigboard.work-context'],
    ['POST',issue + '/transitions']
  ]);
  assert.equal(verifiedAdmission.record_id, result.apply.attempt_id);
  assert.deepEqual(verifiedAdmission.payload.previous_assignment, expected.assignment);
  assert.deepEqual(verifiedAdmission.payload.requests, expected.request_refs);
  assert.deepEqual(verifiedAdmission.payload.existing_pr, expected.pr);
  const original = state_calls.find(call => call.name === 'begin');
  assert.equal(original.input.attempt.attempt_id, result.apply.attempt_id);
  assert.deepEqual(original.input.attempt.cause, expected.request_refs);
  assert.equal(state_calls.filter(call => call.name === 'begin').length, 1);
  assert.equal(state_calls.filter(call => call.name === 'finalize').length, 1);
  assert.equal(state_calls.find(call => call.name === 'finalize').result.status, 'confirmed');
  assert.equal(records.find(row => row.kind === 'attempt').outcome, 'applied');
  assert.equal(receipt.worker_calls, 0);
  assert.equal(receipt.human_status, 'NOT_RUN');

  const fixturePath = 'test/fixtures/manager-apply.json';
  const fixtureHash = sha256(readFileSync(join(root, fixturePath)));
  assert.equal(fixtureHash, sha256(execFileSync('git', ['show', repairSourcePin + ':' + fixturePath], {cwd:root})));
  assert.equal(fixtureHash, 'sha256:' + group.input_sha256);
  const evidence = {
    node:process.version, source_revision:repairSourcePin, source_tree:git('rev-parse','HEAD^{tree}'),
    prepared_pin:manifest.source_revision, configuration_sha256:sha256(configText),
    fixture_sha256:fixtureHash,
    embedded_manifest_sha256:sha256(manifestText), zip_sha256:built.manifest.zip_digest,
    modules, receipt
  };
  assert(!JSON.stringify(evidence).includes('LOCAL_APPLY_DUMMY'));
  t.diagnostic(JSON.stringify(evidence));
});
