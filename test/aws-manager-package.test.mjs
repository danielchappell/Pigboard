import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hostConfig,deriveHostControls,sha256,installationResourceBase} from '../lib/aws/installation.mjs';
import {synthesizeTemplate} from '../lib/aws/template.mjs';
import {fixtureCloud,preparedCloud} from '../scripts/test-aws-manager.mjs';
import {runStateCommand} from '../scripts/manager-state.mjs';
const fixtureBase='pigboard-fixture-f16d05ec6b29248d2c61adb1e9263f78';
const fixture=()=>JSON.parse(readFileSync(new URL('./fixtures/aws-manager.json',import.meta.url)));
test('disabled package synthesizes scoped read-only runtime and retained bounded host',()=>{
 const {config}=fixture(),text=JSON.stringify(config),{digest}=hostConfig(text),manifest={schema:'pigboard-manager-package/v1',source_revision:'a'.repeat(40),configuration_digest:digest,installation_id:config.manager.installation_id,domain_id:config.manager.domain_id,installation_generation:'fixture-generation',zip_digest:sha256('zip'),canonical_config:config};
 const t=synthesizeTemplate(text,manifest),r=t.Resources;assert.equal(r.Schedule.Properties.State,'DISABLED');assert.equal(r.Function.Properties.ReservedConcurrentExecutions.Ref,'QuiescenceConcurrency');assert.equal(t.Parameters.QuiescenceConcurrency.Default,1);assert.equal(r.Function.Properties.Runtime,'nodejs24.x');assert.equal(r.AsyncInvocation.Properties.Qualifier,'$LATEST');assert.equal(r.AsyncInvocation.Properties.MaximumRetryAttempts,0);assert.equal(r.AsyncInvocation.Properties.MaximumEventAgeInSeconds,60);assert.equal(r.Schedule.Properties.Target.RetryPolicy.MaximumRetryAttempts,0);assert.equal(r.Schedule.Properties.Target.RetryPolicy.MaximumEventAgeInSeconds,60);assert.equal(r.StateTable.DeletionPolicy,'Retain');assert.equal(r.StateTable.UpdateReplacePolicy,'Retain');assert.equal(r.LogGroup.Properties.RetentionInDays,14);
 const runtime=r.RuntimeRole.Properties.Policies[0].PolicyDocument.Statement;assert(!JSON.stringify(runtime).includes('dynamodb:Scan'));assert(!JSON.stringify(runtime).includes('dynamodb:PutItem'));assert(!JSON.stringify(runtime).includes('dynamodb:UpdateItem'));assert(!JSON.stringify(t).includes('DeleteItem'));assert(!JSON.stringify(t).includes('ConditionCheckItem'));assert(!Object.values(r).some(v=>['AWS::Lambda::Url','AWS::ApiGateway::RestApi'].includes(v.Type)));
 const op=t.Metadata.Pigboard.operator_policy.Statement;const writes=op.find(v=>v.Action.includes?.('dynamodb:PutItem'));assert.deepEqual(writes.Condition,{'ForAnyValue:StringEquals':{'dynamodb:EnclosingOperation':['TransactWriteItems']}});assert(writes.Resource.endsWith('/'+fixtureBase+'-state'));assert(op.some(v=>v.Action.includes?.('dynamodb:Scan')));assert(!JSON.stringify(op).includes('ExecuteChangeSet'));
 const projected=deriveHostControls(text,{package_revision:manifest.source_revision});assert.equal(projected.mode,'preview');assert.deepEqual(projected.control,{configuration_digest:digest,schedule_enabled:false,writes_enabled:false,maintenance:false});
});

test('copied pinned package imports and rejects extra event fields under selected Node runtime',async()=>{
 const {snapshotPackage}=await import('../scripts/test-aws-manager.mjs');const {execFileSync}=await import('node:child_process');const {pathToFileURL}=await import('node:url');const built=snapshotPackage();try{
 const node24=process.env.PGB_NODE24??process.execPath;if(process.env.PGB_NODE24)assert.match(execFileSync(node24,['--version'],{encoding:'utf8'}),/^v24\./);
 const url=pathToFileURL(built.payload+'/lib/aws/manager-lambda.mjs').href,code=`const {handler}=await import(${JSON.stringify(url)});console.log(JSON.stringify(await handler({operation:'preview',override:true},{})));`;
 const lines=execFileSync(node24,['--input-type=module','-e',code],{encoding:'utf8'}).trim().split('\n'),out=JSON.parse(lines.at(-1));assert(lines.every(line=>!line.includes('dummy-scoped-token')));assert.equal(out.code,'PREVIEW_EVENT_REQUIRED');assert.equal(out.writes,0);assert(built.manifest.payload_hashes['contracts/epic-v1.schema.json']);assert(built.manifest.payload_hashes['runtime/aws/package-lock.json']);
 }finally{built.cleanup();}
});

test('disabled package IAM allows concrete intended transactions and denies unrelated or runtime mutations',()=>{
 const {config}=fixture(),text=JSON.stringify(config),manifest={schema:'pigboard-manager-package/v1',source_revision:'a'.repeat(40),configuration_digest:hostConfig(text).digest,installation_id:'fixture',domain_id:'fixture-domain',installation_generation:'generation',zip_digest:sha256('zip'),canonical_config:config},template=synthesizeTemplate(text,manifest),runtime=template.Resources.RuntimeRole.Properties.Policies[0].PolicyDocument,operator=template.Metadata.Pigboard.operator_policy;
 const permits=(policy,action,resource,enclosing)=>policy.Statement.some(s=>[s.Action].flat().includes(action)&&[s.Resource].flat().some(r=>typeof r==='string'&&r===resource)&&(!s.Condition||s.Condition['ForAnyValue:StringEquals']?.['dynamodb:EnclosingOperation']?.includes(enclosing)));
 const table='arn:aws:dynamodb:eu-west-1:123456789012:table/'+fixtureBase+'-state',other=table+'-unrelated';
 for(const action of ['dynamodb:GetItem','dynamodb:Query','dynamodb:DescribeTable','dynamodb:Scan']){assert(permits(operator,action,table));assert(!permits(operator,action,other));}
 for(const action of ['dynamodb:PutItem','dynamodb:UpdateItem']){assert(permits(operator,action,table,'TransactWriteItems'));assert(!permits(operator,action,table));assert(!permits(operator,action,other,'TransactWriteItems'));assert(!permits(runtime,action,table,'TransactWriteItems'));}
 for(const action of ['dynamodb:GetItem','dynamodb:Query','dynamodb:DescribeTable']){assert(permits(runtime,action,table));assert(!permits(runtime,action,other));}assert(!permits(runtime,'dynamodb:Scan',table));assert(!permits(runtime,'secretsmanager:GetSecretValue',config.jira.connection.secret_reference+'other'));assert(permits(runtime,'secretsmanager:GetSecretValue',config.jira.connection.secret_reference));assert(!permits(runtime,'lambda:InvokeFunction','anything'));assert(!permits(operator,'cloudformation:ExecuteChangeSet','anything'));
 const action='lambda:GetFunctionEventInvokeConfig',functionArn='arn:aws:lambda:eu-west-1:123456789012:function:'+fixtureBase,latest=functionArn+':$LATEST',scheduler=template.Resources.SchedulerRole.Properties.Policies[0].PolicyDocument,deployer=template.Metadata.Pigboard.configure_deployer_policy;
 const read=operator.Statement.filter(s=>[s.Action].flat().includes(action));assert.equal(read.length,1);assert.deepEqual(read[0],{Effect:'Allow',Action:action,Resource:latest});assert(permits(operator,action,latest));for(const resource of [functionArn,functionArn+'-other:$LATEST',functionArn+':1'])assert(!permits(operator,action,resource));
 for(const policy of [runtime,scheduler,deployer])assert(!permits(policy,action,latest));for(const mutation of ['lambda:InvokeFunction','lambda:PutFunctionConcurrency','lambda:UpdateFunctionCode','lambda:UpdateFunctionConfiguration']){assert(!permits(operator,mutation,latest));assert(!permits(deployer,mutation,latest));}

});

test('configure deployer reads only the generated runtime role',()=>{
 const {config}=fixture(),text=JSON.stringify(config),f=fixtureCloud(config),role=kind=>`arn:aws:iam::${config.manager.aws.account_id}:role/${fixtureBase}-${kind}`;
 for(const initial of [true,false]){
  const t=synthesizeTemplate(text,f.manifest,{initial}),deployer=t.Metadata.Pigboard.configure_deployer_policy.Statement;
  assert.deepEqual(deployer.filter(s=>[s.Action].flat().some(action=>action.startsWith('iam:'))),[
   {Effect:'Allow',Action:'iam:PassRole',Resource:[role('runtime'),role('scheduler')]},
   {Effect:'Allow',Action:'iam:GetRole',Resource:role('runtime')}
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
  assert(permits(t.Metadata.Pigboard.operator_policy,'dynamodb:GetItem',tableArn));assert(permits(t.Metadata.Pigboard.operator_policy,'lambda:GetFunction',functionArn));assert(permits(t.Metadata.Pigboard.operator_policy,'scheduler:GetSchedule',scheduleArn));assert(permits(t.Metadata.Pigboard.operator_policy,'iam:PassRole',role('SchedulerRole')));
  assert(permits(t.Metadata.Pigboard.configure_deployer_policy,'lambda:UpdateFunctionCode',functionArn));assert(permits(t.Metadata.Pigboard.configure_deployer_policy,'logs:PutRetentionPolicy',logArn));assert(permits(t.Metadata.Pigboard.configure_deployer_policy,'iam:PassRole',role('RuntimeRole')));
  assert(permits(t.Metadata.Pigboard.configure_deployer_policy,'iam:GetRole',role('RuntimeRole')));for(const other of [role('SchedulerRole'),role('RuntimeRole')+'-unrelated'])assert(!permits(t.Metadata.Pigboard.configure_deployer_policy,'iam:GetRole',other));
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
 const {packet}=await import('../scripts/test-manager-apply.mjs');const config=structuredClone(packet.config);config.manager.controls.schedule_enabled=false;config.manager.controls.writes_enabled=false;const text=JSON.stringify(config),manifest={schema:'pigboard-manager-package/v1',sender:true,source_revision:'a'.repeat(40),configuration_digest:hostConfig(text).digest,installation_id:config.manager.installation_id,domain_id:config.manager.domain_id,installation_generation:'generation',zip_digest:sha256('zip'),canonical_config:config};const template=synthesizeTemplate(text,manifest),r=template.Resources;assert.equal(r.Schedule.Properties.State,'DISABLED');assert.equal(r.Schedule.Properties.Target.Input,'{"operation":"apply"}');assert.equal(r.AsyncInvocation.Properties.MaximumRetryAttempts,0);assert.equal(r.Schedule.Properties.Target.RetryPolicy.MaximumRetryAttempts,0);assert.deepEqual(Object.keys(r).sort(),['AsyncInvocation','Function','LogGroup','RuntimeRole','Schedule','SchedulerRole','StateTable']);const statements=r.RuntimeRole.Properties.Policies[0].PolicyDocument.Statement;const write=statements.find(s=>s.Action.includes?.('dynamodb:PutItem'));assert.deepEqual(write.Action,['dynamodb:PutItem','dynamodb:UpdateItem','dynamodb:ConditionCheckItem']);assert.deepEqual(write.Condition,{'ForAnyValue:StringEquals':{'dynamodb:EnclosingOperation':['TransactWriteItems']}});assert.equal(write.Resource,'arn:aws:dynamodb:eu-west-1:123456789012:table/pigboard-fixture-f16d05ec6b29248d2c61adb1e9263f78-state');assert(!JSON.stringify(statements).includes('DeleteItem'));assert(!JSON.stringify(statements).includes('dynamodb:Scan'));assert(statements.some(s=>s.Condition?.['ForAnyValue:StringEquals']?.['dynamodb:EnclosingOperation']?.includes('TransactGetItems')));assert.throws(()=>synthesizeTemplate(text,{...manifest,sender:false}),e=>e.code==='APPLY_UNSUPPORTED');
});
