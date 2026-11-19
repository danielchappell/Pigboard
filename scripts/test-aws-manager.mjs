#!/usr/bin/env node
// Finite prescribed H01/H02 simulations; never accepts cloud credentials/endpoints.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import {syncBuiltinESMExports} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {StateProvider,fixture as stateFixture} from '../test/helpers/state-provider.mjs';
import {recordId} from '../lib/state/contract.mjs';
import {loadHostSDK,hostConfig,sha256,installationResourceBase,bindInstallation,resolveInstallation,observeInstallation,stopInstallation,configureInstallation} from '../lib/aws/installation.mjs';
import {runStateCommand} from './manager-state.mjs';
import {runInstallationCommand} from './manager-installation.mjs';
import {runPreview} from '../lib/aws/manager-lambda.mjs';
import {packageManager} from './package-manager.mjs';
import {synthesizeTemplate,runtimeRoleProperties,installationResourceMap,LIFECYCLE_TABLE_ID_ENV,LIFECYCLE_TABLE_ID_PARAMETER} from '../lib/aws/template.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export const hostFixture=()=>JSON.parse(fs.readFileSync(path.join(root,'test/fixtures/aws-manager.json')));
const inventoryPacket=()=>JSON.parse(fs.readFileSync(path.join(root,'test/fixtures/jira-inventory-cases.json')));
export function fixtureCloud(config=hostFixture().config,overrides={},packageManifest){
 const sdk=loadHostSDK(),m=config.manager,a=m.aws,{digest,config:canonical}=hostConfig(JSON.stringify(config));
 const manifest=packageManifest??{schema:'pigboard-manager-package/v1',source_revision:'a'.repeat(40),configuration_digest:digest,installation_id:m.installation_id,domain_id:m.domain_id,installation_generation:'fixture-generation',zip_digest:sha256('zip'),runtime:'nodejs24.x',canonical_config:config,dependency_hashes:{root:'r',aws:'a'},payload_hashes:{'lib/aws/manager-lambda.mjs':'source','config/manager.json':digest}};
 const stackId=`arn:aws:cloudformation:${a.region}:${a.account_id}:stack/${a.stack_name}/fixture-stack`,map=installationResourceMap(m.installation_id,manifest),name=map.physical.function_name,tableName=map.physical.table_name,tableArn=`arn:aws:dynamodb:${a.region}:${a.account_id}:table/${tableName}`,functionArn=`arn:aws:lambda:${a.region}:${a.account_id}:function:${name}`,scheduleArn=`arn:aws:scheduler:${a.region}:${a.account_id}:schedule/default/${name}`;
 const binding={schema:'pigboard-aws-installation/v1',installation_id:m.installation_id,domain_id:m.domain_id,site:config.jira.site,configuration_digest:digest,package_revision:manifest.source_revision,region:a.region,stack_id:stackId,table_name:tableName,table_arn:tableArn,installation_generation:manifest.installation_generation};
 const provider=new StateProvider(binding),audit=[],destroyed=[],table={TableName:tableName,TableArn:tableArn,TableId:'45fb5364-258e-4f57-86fd-d4e65c398d96',CreationDateTime:new Date('2026-11-17T08:00:22.410Z'),TableStatus:'ACTIVE',KeySchema:[{AttributeName:'PK',KeyType:'HASH'},{AttributeName:'SK',KeyType:'RANGE'}],AttributeDefinitions:[{AttributeName:'PK',AttributeType:'S'},{AttributeName:'SK',AttributeType:'S'}]};
 const env={PB_INSTALLATION_ID:m.installation_id,PB_DOMAIN_ID:m.domain_id,PB_INSTALLATION_GENERATION:manifest.installation_generation,PB_PACKAGE_REVISION:manifest.source_revision,PB_CONFIGURATION_DIGEST:digest,PB_MODE:m.controls.mode,PB_WRITES_ENABLED:String(m.controls.writes_enabled),PB_TABLE_NAME:tableName,PB_TABLE_ARN:tableArn,PB_STACK_ID:stackId};
 const created='2026-11-17T08:00:09.731Z',tableCreated='2026-11-17T08:00:24.908Z',completed='2026-11-17T08:00:45.078Z';
 const stackEvent=(ResourceStatus,Timestamp)=>({StackId:stackId,PhysicalResourceId:stackId,ResourceType:'AWS::CloudFormation::Stack',ResourceStatus,Timestamp});
 const createEvent=(LogicalResourceId,ResourceType,PhysicalResourceId,EventId,Timestamp,ResourceProperties)=>({
   StackId:stackId,LogicalResourceId,ResourceType,PhysicalResourceId,EventId,Timestamp,ResourceStatus:'CREATE_COMPLETE',ResourceProperties
 });
 const roleProperties=JSON.stringify(runtimeRoleProperties(canonical,manifest.sender===true,{legacy:overrides.birth==='legacy',manifest}));
 const events=[stackEvent('CREATE_COMPLETE',completed),
   createEvent('RuntimeRole','AWS::IAM::Role',name+'-runtime','RuntimeRole-CREATE_COMPLETE-fixture','2026-11-17T08:00:32.000Z',roleProperties),
   createEvent('StateTable','AWS::DynamoDB::Table',tableName,'StateTable-CREATE_COMPLETE-fixture',tableCreated),
   stackEvent('CREATE_IN_PROGRESS',created)];
 const cloud={stack:{StackId:stackId,StackStatus:'CREATE_COMPLETE',CreationTime:created,Outputs:[{OutputKey:'FunctionArn',OutputValue:functionArn}]},events,function:{FunctionArn:functionArn,Version:'$LATEST',Environment:{Variables:env},Role:`arn:aws:iam::${a.account_id}:role/${name}-runtime`,Runtime:'nodejs24.x',Handler:'lib/aws/manager-lambda.handler',Timeout:m.invocation_timeout_seconds,LastUpdateStatus:'Successful',State:'Active'},asyncConfig:{FunctionArn:functionArn+':$LATEST',MaximumRetryAttempts:0,MaximumEventAgeInSeconds:60},codeHash:Buffer.from(manifest.zip_digest.slice(7),'hex').toString('base64'),concurrency:1,table,schedule:{Arn:scheduleArn,GroupName:'default',Name:name,State:'DISABLED',ScheduleExpression:`rate(${m.schedule_minutes} minutes)`,FlexibleTimeWindow:{Mode:'OFF'},Target:{Arn:functionArn,RoleArn:`arn:aws:iam::${a.account_id}:role/${name}-scheduler`,Input:JSON.stringify({operation:m.controls.mode}),RetryPolicy:{MaximumRetryAttempts:0,MaximumEventAgeInSeconds:60}}},...overrides};
 const lifecycle=manifest.schema==='pigboard-manager-package/v2';
 const resources=()=>[
   ...Object.entries(map.logical).map(([key,LogicalResourceId])=>({
   LogicalResourceId,PhysicalResourceId:map.physical[key],ResourceType:cloud.template?.Resources[LogicalResourceId]?.Type,StackId:stackId
   })),...(lifecycle?[{LogicalResourceId:'AsyncInvocation',PhysicalResourceId:name+'|$LATEST',
     ResourceType:'AWS::Lambda::EventInvokeConfig',StackId:stackId}]:[])
 ];
 if(lifecycle&&!overrides.template){
   cloud.template=synthesizeTemplate(JSON.stringify(config),manifest,{initial:overrides.initial!==false});
   cloud.stack.Parameters=Object.entries({AssetBucket:'fixture-artifacts',AssetKey:'birth.zip',AssetVersion:'fixture-birth-version',[LIFECYCLE_TABLE_ID_PARAMETER]:'',QuiescenceConcurrency:'1'})
     .map(([ParameterKey,ParameterValue])=>({ParameterKey,ParameterValue}));
 }
 const terminalEvent=(token,status)=>({...stackEvent(status,new Date('2026-11-17T09:00:00Z')),
   ClientRequestToken:token,EventId:status+'-'+token});
 const credentials=profile=>({accessKeyId:profile==='operator'?'SELECTED_OPERATOR':profile==='deployer'?'SELECTED_DEPLOYER':'WRONG_AMBIENT',secretAccessKey:'dummy'});
 const injectedSDK={...sdk,fromIni:({profile})=>async()=>credentials(profile)};
 const makeClient=(kind,options)=>{const identity=options.credentials.accessKeyId;return {destroy:()=>destroyed.push({kind,identity}),send:async(command,sendOptions)=>{
  const n=command.constructor.name,i=command.input;audit.push({kind,identity,action:n,input:structuredClone(i)});if(cloud.fail===n)throw Object.assign(new Error('dummy denied'),{name:'AccessDeniedException'});
  if(n==='GetCallerIdentityCommand')return {Account:a.account_id,UserId:'AROAEXAMPLE:fixture',Arn:`arn:aws:sts::${a.account_id}:assumed-role/${identity==='SELECTED_OPERATOR'?'pigboard-operator':identity==='SELECTED_DEPLOYER'?'pigboard-deployer':'wrong'}/fixture`};
  if(n==='DescribeStacksCommand')return {Stacks:[cloud.stack]};
  if(n==='DescribeStackResourcesCommand')return {StackResources:resources()};
  if(n==='GetTemplateCommand'&&lifecycle)return {TemplateBody:JSON.stringify(cloud.template)};
  if(n==='DescribeStackEventsCommand'){if(cloud.executedToken&&cloud.completionPage)return cloud.completionPage(++cloud.completionReads);if(cloud.eventPage)return cloud.eventPage(i);return {StackEvents:cloud.events,...(cloud.eventsNextToken===undefined?{}:{NextToken:cloud.eventsNextToken})};}
  if(lifecycle&&cloud.stack.StackStatus==='DELETE_COMPLETE'&&['GetFunctionCommand','GetFunctionConfigurationCommand','GetFunctionConcurrencyCommand','GetFunctionEventInvokeConfigCommand','GetScheduleCommand'].includes(n))
   throw Object.assign(new Error('Fixture resource deleted'),{name:'ResourceNotFoundException'});
  if(n==='GetFunctionCommand')return {Configuration:{FunctionArn:functionArn,...(cloud.codeHash===undefined?{}:{CodeSha256:cloud.codeHash})},Code:{Location:'https://unused.example.invalid/fixture'}};
  if(n==='GetFunctionConfigurationCommand')return structuredClone(cloud.function);
  if(n==='GetFunctionEventInvokeConfigCommand'){if(!cloud.asyncConfig)throw Object.assign(new Error('dummy missing async config'),{name:'ResourceNotFoundException'});return structuredClone(cloud.asyncConfig);}
  if(n==='GetFunctionConcurrencyCommand')return {ReservedConcurrentExecutions:cloud.concurrency};
  if(n==='PutFunctionConcurrencyCommand'){cloud.concurrency=i.ReservedConcurrentExecutions;return {};}
  if(n==='GetScheduleCommand')return structuredClone(cloud.schedule);
  if(n==='UpdateScheduleCommand'){cloud.schedule={...structuredClone(i),Arn:scheduleArn,GroupName:i.GroupName??'default'};return {};}
  if(n==='DescribeTableCommand')return {Table:structuredClone(cloud.describeTable?.(i)??cloud.table)};
  if(kind==='DynamoDBDocument'&&n==='QueryCommand'&&i.KeyConditionExpression==='PK = :pk'){
   assert(i.ConsistentRead);
   provider.audit.push({name:n,input:structuredClone(i),abortSignal:!!sendOptions?.abortSignal});
   const rows=[...provider.rows.values()].filter(row=>row.PK===i.ExpressionAttributeValues[':pk']&&
     (!i.ExclusiveStartKey||row.SK>i.ExclusiveStartKey.SK)).sort((a,b)=>a.SK<b.SK?-1:a.SK>b.SK?1:0);
   const page=rows.slice(0,Math.min(i.Limit,provider.pageSize));
   return structuredClone({Items:page,...(rows.length>page.length?{LastEvaluatedKey:{PK:page.at(-1).PK,SK:page.at(-1).SK}}:{})});
  }
  if(lifecycle&&n==='CreateChangeSetCommand'){
   assert.equal(identity,'SELECTED_DEPLOYER');
   assert.equal(i.StackName,stackId);
   cloud.changeInput=structuredClone(i);
   cloud.changeSetId=`arn:aws:cloudformation:${a.region}:${a.account_id}:changeSet/${i.ChangeSetName}/00000000-0000-4000-8000-000000000005`;
   return {Id:cloud.changeSetId,StackId:stackId};
  }
  if(lifecycle&&n==='DescribeChangeSetCommand'){
   assert.equal(i.ChangeSetName,cloud.changeSetId);
   return {StackId:stackId,ChangeSetId:cloud.changeSetId,ChangeSetName:cloud.changeInput.ChangeSetName,Status:'CREATE_COMPLETE',ExecutionStatus:'AVAILABLE',Changes:cloud.changes??
     [{ResourceChange:{Action:'Modify',LogicalResourceId:'Function',Replacement:'False',
       Details:[{Target:{Attribute:'Properties',Name:cloud.changeInput.UsePreviousTemplate?'Environment':'Code'}}]}}]};
  }
  if(lifecycle&&n==='ExecuteChangeSetCommand'){
   assert.equal(identity,'SELECTED_DEPLOYER');
   assert.equal(i.StackName,stackId);
   assert.equal(i.ChangeSetName,cloud.changeSetId);
   assert.equal(i.ClientRequestToken,cloud.changeInput.ClientToken);
   await cloud.beforeExecute?.(i.ClientRequestToken);
   const {Parameters,TemplateBody}=cloud.changeInput;
   const params=new Map(cloud.stack.Parameters.map(({ParameterKey,ParameterValue})=>[ParameterKey,ParameterValue]));
   for(const {ParameterKey,ParameterValue,UsePreviousValue} of Parameters)if(!UsePreviousValue)params.set(ParameterKey,ParameterValue);
   cloud.stack.Parameters=[...params].map(([ParameterKey,ParameterValue])=>({ParameterKey,ParameterValue}));
   if(TemplateBody){
    cloud.template=JSON.parse(TemplateBody);
    const {Function,LifecycleSchedule}=cloud.template.Resources;
    Object.assign(cloud.function.Environment.Variables,Object.fromEntries(Object.entries(Function.Properties.Environment.Variables).filter(([,v])=>typeof v==='string')));
    cloud.function.Timeout=Function.Properties.Timeout;
    cloud.schedule.ScheduleExpression=LifecycleSchedule.Properties.ScheduleExpression;
    cloud.schedule.Target.Input=LifecycleSchedule.Properties.Target.Input;
    cloud.codeHash=cloud.assets?.get(params.get('AssetVersion'))??cloud.codeHash;
   }
   cloud.function.Environment.Variables[LIFECYCLE_TABLE_ID_ENV]=params.get(LIFECYCLE_TABLE_ID_PARAMETER);
   cloud.concurrency=Number(params.get('QuiescenceConcurrency'));
   cloud.schedule.State='DISABLED';
   cloud.stack.StackStatus='UPDATE_COMPLETE';
   cloud.events.unshift(terminalEvent(i.ClientRequestToken,'UPDATE_COMPLETE'));
   return {};
  }
  if(lifecycle&&n==='DeleteStackCommand'){
   assert.equal(identity,'SELECTED_DEPLOYER');
   assert.equal(i.StackName,stackId);
   cloud.stack.StackStatus='DELETE_COMPLETE';
   cloud.events.unshift(terminalEvent(i.ClientRequestToken,'DELETE_COMPLETE'),...resources().flatMap(resource=>{
    const definition=cloud.template.Resources[resource.LogicalResourceId];
    return definition.DeletionPolicy==='Retain'||cloud.omitDeleteEvent===resource.LogicalResourceId?[]:
      [{...resource,ClientRequestToken:i.ClientRequestToken,ResourceStatus:'DELETE_COMPLETE'}];
   }));
   return {};
  }
  if(n==='CreateChangeSetCommand'){cloud.changeInput=i;return {Id:'arn:aws:cloudformation:eu-west-1:123456789012:changeSet/pigboard-controls-fixture/id'};}
  if(n==='DescribeChangeSetCommand')return {Status:'CREATE_COMPLETE',Changes:cloud.changes??[{ResourceChange:{Action:'Modify',LogicalResourceId:'Function',Replacement:'False',Details:[{Target:{Attribute:'Properties',Name:'Code'}}]}}]};
  if(n==='ExecuteChangeSetCommand'){const t=JSON.parse(cloud.changeInput.TemplateBody);cloud.function.Environment.Variables={...cloud.function.Environment.Variables,...Object.fromEntries(Object.entries(t.Resources.Function.Properties.Environment.Variables).filter(([,v])=>typeof v==='string'))};cloud.function.Timeout=t.Resources.Function.Properties.Timeout;cloud.codeHash=cloud.nextCodeHash??cloud.codeHash;cloud.stack.StackStatus='UPDATE_COMPLETE';cloud.executedToken=i.ClientRequestToken;cloud.completionReads=0;cloud.events.unshift({ClientRequestToken:i.ClientRequestToken,StackId:stackId,PhysicalResourceId:stackId,ResourceType:'AWS::CloudFormation::Stack',ResourceStatus:'UPDATE_COMPLETE'});return {};}
  if(kind==='DynamoDBDocument'){if(n==='TransactWriteCommand'&&cloud.failCommitControls&&cloud.stack.StackStatus==='UPDATE_COMPLETE'&&cloud.schedule.State==='ENABLED'&&cloud.concurrency===1)throw Object.assign(new Error('dummy final commit unavailable'),{name:'TimeoutError'});return provider.send(command,sendOptions);}
  throw Error('Unexpected finite fixture command '+n);
 }};};
 const dependencies={sdk:injectedSDK,makeClient,wait:async()=>{}};
 return {config,manifest,binding,provider,audit,destroyed,cloud,environment:env,dependencies,stackId};
}
export async function preparedCloud(config=hostFixture().config,packageManifest,overrides={}){
 const fixture=fixtureCloud(config,overrides,packageManifest),directory=fs.mkdtempSync(path.join(os.tmpdir(),'pgb83-cloud-')),configPath=path.join(directory,'config.json'),installationPath=path.join(directory,'installation.json');fs.writeFileSync(configPath,JSON.stringify(config));
 const receipt=await bindInstallation({configText:JSON.stringify(config),manifest:fixture.manifest,stackId:fixture.stackId,operatorProfile:'operator'},fixture.dependencies);fs.writeFileSync(installationPath,JSON.stringify(receipt));
 return {...fixture,directory,configPath,installationPath,receipt,cleanup:()=>fs.rmSync(directory,{recursive:true,force:true}),resolve:input=>resolveInstallation(input,fixture.dependencies)};
}
export async function manifestConfigurationJourney(){
 const observations=[];
 for(const kind of ['valid_reordered','absent','malformed','different']){
  const f=fixtureCloud(),manifest=structuredClone(f.manifest),configText=JSON.stringify(f.config,null,2)+'\n';
  if(kind==='valid_reordered'){manifest.canonical_config=Object.fromEntries(Object.entries(manifest.canonical_config).reverse());manifest.canonical_config.manager=Object.fromEntries(Object.entries(manifest.canonical_config.manager).reverse());}
  if(kind==='absent')delete manifest.canonical_config;
  if(kind==='malformed')manifest.canonical_config={};
  if(kind==='different'){manifest.canonical_config.manager.log_retention_days=7;hostConfig(JSON.stringify(manifest.canonical_config));}
  let credentials=0,clients=0,receipt;const original=f.dependencies,sdk={...original.sdk,fromIni:input=>{credentials++;return original.sdk.fromIni(input);}},dependencies={...original,sdk,makeClient:(...args)=>{clients++;return original.makeClient(...args);}},before={credentials,clients,services:f.audit.length,state:f.provider.audit.length};
  const bind=async()=>{receipt=await bindInstallation({configText,manifest,stackId:f.stackId,operatorProfile:'operator'},dependencies);};
  if(kind!=='valid_reordered'){
   await assert.rejects(bind,{code:'PACKAGE_MISMATCH'});assert.equal(receipt,undefined);assert.deepEqual({credentials,clients,services:f.audit.length,state:f.provider.audit.length},before);
   observations.push({kind,code:'PACKAGE_MISMATCH',receipt_returned:false,credential_accesses:0,client_accesses:0,service_accesses:0});
  }else{
   await bind();assert.deepEqual(receipt.manifest.canonical_config,JSON.parse(configText));
   const directory=fs.mkdtempSync(path.join(os.tmpdir(),'pgb83-manifest-'));try{const configPath=path.join(directory,'config.json'),installationPath=path.join(directory,'installation.json');fs.writeFileSync(configPath,configText);fs.writeFileSync(installationPath,JSON.stringify(receipt));const resolved=await resolveInstallation({configPath,installationPath,purpose:'inspect',operatorProfile:'operator'},dependencies);try{assert.deepEqual(resolved.receipt.binding,receipt.binding);assert.deepEqual(resolved.receipt.manifest.canonical_config,JSON.parse(configText));}finally{resolved.dispose();}}finally{fs.rmSync(directory,{recursive:true,force:true});}
   observations.push({kind,receipt_returned:true,resolver_usable:true});
  }
 }
 return observations;
}
// Bounded local cases for original-create provenance and table continuity.
export async function originalCreateInitializationJourney(){
 const observations=[];
 const kinds=['direct_create','create_change_set','legacy','unexplained_last_update','updated_stack','update_event','missing_stack_milestone','different_table','paginated_events','invalid_timestamp','nonempty_table','role_event_denied','role_properties_missing','broader_original_role','second_table_id','second_table_time'];
 for(const kind of kinds){
  const f=await preparedCloud(undefined,undefined,{birth:kind==='legacy'?'legacy':'protected'});try{
   if(kind==='create_change_set'||kind==='unexplained_last_update'){
    f.cloud.stack.CreationTime='2026-11-17T08:00:04.419Z';
    // SDK Date and an equivalent offset string must compare as the same instant.
    f.cloud.stack.LastUpdatedTime=new Date('2026-11-17T08:00:09.731Z');
    f.cloud.events.find(e=>e.ResourceStatus==='CREATE_IN_PROGRESS').Timestamp='2026-11-17T08:00:09.731000+00:00';
    f.cloud.events.push({StackId:f.stackId,PhysicalResourceId:f.stackId,ResourceType:'AWS::CloudFormation::Stack',ResourceStatus:'REVIEW_IN_PROGRESS',Timestamp:f.cloud.stack.CreationTime});
   }
   if(kind==='unexplained_last_update')f.cloud.stack.LastUpdatedTime=new Date('2026-11-17T08:00:10.731Z');
   if(kind==='updated_stack')f.cloud.stack.StackStatus='UPDATE_COMPLETE';
   if(kind==='update_event')f.cloud.events.unshift({StackId:f.stackId,PhysicalResourceId:f.stackId,ResourceType:'AWS::CloudFormation::Stack',ResourceStatus:'UPDATE_IN_PROGRESS',Timestamp:'2026-11-17T08:01:00.000Z'});
   if(kind==='missing_stack_milestone')f.cloud.events=f.cloud.events.filter(e=>e.ResourceStatus!=='CREATE_IN_PROGRESS');
   if(kind==='different_table')f.cloud.events.find(e=>e.LogicalResourceId==='StateTable').PhysicalResourceId+='-replacement';
   if(kind==='paginated_events')f.cloud.eventsNextToken='another-page';
   if(kind==='invalid_timestamp')f.cloud.events.find(e=>e.ResourceStatus==='CREATE_IN_PROGRESS').Timestamp='invalid-time';
   if(kind==='nonempty_table')seedRetained(f,{retained_members:[{...stateFixture.memberA,project_id:'10001',label:'AI-Daniel-1'}],pending_intents:[]});
   const roleEvent=f.cloud.events.find(e=>e.LogicalResourceId==='RuntimeRole');
   if(kind==='role_event_denied')f.cloud.fail='DescribeStackEventsCommand';
   if(kind==='role_properties_missing')delete roleEvent.ResourceProperties;
   if(kind==='broader_original_role'){
    const role=JSON.parse(roleEvent.ResourceProperties);
    role.ManagedPolicyArns=['arn:aws:iam::aws:policy/AdministratorAccess'];
    roleEvent.ResourceProperties=JSON.stringify(role);
   }
   const secondPhysicalDrift=kind==='second_table_id'||kind==='second_table_time';
   if(secondPhysicalDrift){
    let reads=0;
    f.cloud.describeTable=()=>++reads===1?f.cloud.table:{...f.cloud.table,...(kind==='second_table_id'?
     {TableId:'00000000-0000-4000-8000-000000000001'}:{CreationDateTime:new Date('2026-11-17T08:01:23.000Z')})};
   }
   const before=f.provider.snapshot(),receipt=fs.readFileSync(f.installationPath),auditStart=f.audit.length,stateStart=f.provider.audit.length;
   const result=await runStateCommand(['init','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--json'],{resolveInstallation:f.resolve});
   const audit=f.audit.slice(auditStart),stateAudit=f.provider.audit.slice(stateStart),transactions=stateAudit.filter(a=>a.name==='TransactWriteCommand');
   assert.deepEqual(JSON.parse(result.stdout),result.outcome,kind+' JSON output');
   assert.deepEqual(fs.readFileSync(f.installationPath),receipt,kind+' preserves receipt bytes');
   assert.equal(audit.filter(a=>a.action==='DescribeStackEventsCommand').length,1,kind+' bounded events read');
   assert(audit.every(a=>/^(Get|Describe|Scan)/.test(a.action)||a.action==='TransactWriteCommand'),kind+' has no cloud control mutation');
   assert(audit.every(a=>a.identity==='SELECTED_OPERATOR'),kind+' selected operator only');
   assert(audit.filter(a=>a.kind==='DynamoDBDocument').every(a=>a.input.TableName===f.binding.table_name||a.input.TransactItems?.every(i=>i.Put?.TableName===f.binding.table_name)),kind+' original table only');
   assert(!f.destroyed.some(item=>item.kind==='SecretsManager'),kind+' never constructs a recovery-secret client');
   if(['direct_create','create_change_set','legacy'].includes(kind)){
    assert.equal(result.exitCode,0,kind+': '+result.stdout);assert.equal(result.outcome.status,'confirmed',kind);
    const records=f.provider.records(),legacy=kind==='legacy';
    assert.equal(records.length,legacy?1:2,kind+' expected installation and origin rows');const record=records.find(row=>row.kind==='installation');
    assert.equal(record.kind,'installation');
    for(const field of ['table_name','table_arn','stack_id','installation_generation','package_revision','configuration_digest'])assert.equal(record[field],f.binding[field],kind+' original '+field);
    for(const field of ['schedule_enabled','writes_enabled','maintenance'])assert.equal(record[field],false,kind+' disabled '+field);
    assert.equal(f.manifest.source_revision,'a'.repeat(40));assert.notEqual(f.manifest.source_revision,execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim());
    assert.equal(transactions.length,1,kind+' one conditional transaction');assert.equal(transactions[0].input.TransactItems.length,legacy?1:2);
    const puts=transactions[0].input.TransactItems.map(({Put})=>Put);
    assert(puts.every(put=>put.ConditionExpression==='attribute_not_exists(PK)'));
    if(!legacy){
     const origin=puts.find(put=>put.Item.PK==='operator-decision#'+f.binding.installation_id);
     assert.equal(origin.Item.SK,'ORIGIN');
     assert.equal(audit.filter(a=>a.action==='DescribeTableCommand').length,2,kind+' independently rechecks physical identity');
    }
   }else{
    if(!secondPhysicalDrift){
     assert.equal(result.outcome.code,'FRESH_INSTALLATION_REQUIRED',kind+': '+result.stdout);
     assert.equal(result.exitCode,kind==='nonempty_table'?1:2,kind);
    }else{
     assert.notEqual(result.exitCode,0,kind);
     assert.equal(audit.filter(a=>a.action==='DescribeTableCommand').length,2,kind+' independently rechecks physical identity');
    }
    assert.equal(f.provider.snapshot(),before,kind+' preserves retained state');assert.equal(transactions.length,0,kind+' no transaction');
    if(kind==='nonempty_table'){assert(stateAudit.some(a=>a.name==='GetCommand'));assert(stateAudit.some(a=>a.name==='ScanCommand'));assert.equal(f.provider.records().length,1);}
    else if(!secondPhysicalDrift){assert.equal(stateAudit.length,0,kind+' no State initialization reads');assert.equal(audit.filter(a=>a.action==='DescribeTableCommand').length,1,kind+' observation only');}
   }
   observations.push({kind,status:result.outcome.status,code:result.outcome.code,exit_code:result.exitCode,event_requests:1,transactions:transactions.length,receipt_unchanged:true,cloud_control_mutations:0});
  }finally{f.cleanup();}
 }
 return observations;
}
export async function resolverJourney(){const f=await preparedCloud();try{
 const args=['init','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--json'];const init=await runStateCommand(args,{resolveInstallation:f.resolve});assert.equal(init.exitCode,0,init.stdout);assert.equal(f.provider.records()[0].schedule_enabled,false);
 const now=stateFixture.now,identity={site:f.binding.site,project_id:'10001',label:'AI-Daniel-1'},member=Object.fromEntries(Object.entries({...stateFixture.memberA,...identity}).filter(([key])=>!['expected_revision','site'].includes(key)));seedRetained(f,{retained_members:[member],pending_intents:[{project_id:identity.project_id,label:identity.label,ticket_id:member.ticket_id,attempt_id:stateFixture.attemptA.attempt_id}]});
 const originalReceiptText=fs.readFileSync(f.installationPath,'utf8'),reorderedConfig=structuredClone(f.config);
 reorderedConfig.manager.aws=Object.fromEntries(Object.entries(reorderedConfig.manager.aws).reverse());fs.writeFileSync(f.configPath,JSON.stringify(reorderedConfig));assert.equal(hostConfig(JSON.stringify(reorderedConfig)).digest,f.binding.configuration_digest);
 const reorderedReceipt={...f.receipt,binding:Object.fromEntries(Object.entries(f.receipt.binding).reverse())},reorderedReceiptPath=path.join(f.directory,'reordered-installation.json');fs.writeFileSync(reorderedReceiptPath,JSON.stringify(reorderedReceipt));
 const reorderedInspection=await runStateCommand(['inspect','--config',f.configPath,'--installation',reorderedReceiptPath,'--operator-profile','operator','--kind','installation','--json'],{resolveInstallation:f.resolve});assert.equal(reorderedInspection.exitCode,0,reorderedInspection.stdout);assert.equal(fs.readFileSync(f.installationPath,'utf8'),originalReceiptText);
 const changedHostConfig=structuredClone(reorderedConfig);changedHostConfig.manager.aws.stack_name='replacement-stack';fs.writeFileSync(f.configPath,JSON.stringify(changedHostConfig));const beforeChangedHost=f.audit.length,changedHost=await runStateCommand(['inspect','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--kind','installation','--json'],{resolveInstallation:f.resolve});assert.equal(changedHost.outcome.code,'BINDING_MISMATCH');assert.equal(f.audit.length,beforeChangedHost);fs.writeFileSync(f.configPath,JSON.stringify(reorderedConfig));
 const inspections={};for(const kind of ['installation','stream','attempt','member'])for(const json of [false,true]){const command=['inspect','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--kind',kind,...(json?['--json']:[])];const result=await runStateCommand(command,{resolveInstallation:f.resolve});assert.equal(result.exitCode,0,result.stdout);assert.equal(result.outcome.data.records.length,1);inspections[kind+'-'+json]=result.stdout;}
 assert(f.audit.filter(a=>a.kind==='DynamoDBDocument').every(a=>a.identity==='SELECTED_OPERATOR'));assert(!f.audit.some(a=>a.identity==='WRONG_AMBIENT'));
 const originalHash=f.cloud.codeHash,rowsBefore=f.provider.snapshot();f.cloud.codeHash=Buffer.from('mismatched').toString('base64');const mismatchedHash=await runStateCommand(args,{resolveInstallation:f.resolve});assert.equal(mismatchedHash.outcome.code,'BINDING_MISMATCH');assert.equal(f.provider.snapshot(),rowsBefore);f.cloud.codeHash=undefined;const missingHash=await runStateCommand(args,{resolveInstallation:f.resolve});assert.equal(missingHash.outcome.code,'BINDING_MISMATCH');assert.equal(f.provider.snapshot(),rowsBefore);f.cloud.codeHash=originalHash;
 const saved=f.cloud.stack.StackStatus;f.cloud.stack.StackStatus='UPDATE_COMPLETE';const updated=await runStateCommand(args,{resolveInstallation:f.resolve});assert.equal(updated.outcome.code,'FRESH_INSTALLATION_REQUIRED');f.cloud.stack.StackStatus=saved;
 const original=structuredClone(f.receipt);original.original.table_arn=original.original.table_arn+'-replacement';fs.writeFileSync(f.installationPath,JSON.stringify(original));const substituted=await runStateCommand(args,{resolveInstallation:f.resolve});assert.equal(substituted.outcome.code,'BINDING_MISMATCH');const recoveryArgs=['inspect','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--kind','installation','--recovery','--json'];const recoverySubstituted=await runStateCommand(recoveryArgs,{resolveInstallation:f.resolve});assert.equal(recoverySubstituted.outcome.code,'BINDING_MISMATCH');fs.writeFileSync(f.installationPath,JSON.stringify(f.receipt));
 const generation=f.cloud.function.Environment.Variables.PB_INSTALLATION_GENERATION;f.cloud.function.Environment.Variables.PB_INSTALLATION_GENERATION='replacement-generation';const recoveryGeneration=await runStateCommand(recoveryArgs,{resolveInstallation:f.resolve});assert.equal(recoveryGeneration.outcome.code,'BINDING_MISMATCH');f.cloud.function.Environment.Variables.PB_INSTALLATION_GENERATION=generation;const recoveryProfile=await runStateCommand(recoveryArgs.map(v=>v==='operator'?'wrong-profile':v),{resolveInstallation:f.resolve});assert.notEqual(recoveryProfile.exitCode,0);assert.equal(f.provider.snapshot(),rowsBefore);
 f.cloud.events=[];const missing=await runStateCommand(args,{resolveInstallation:f.resolve});assert.equal(missing.outcome.code,'FRESH_INSTALLATION_REQUIRED');
 return {init,inspections,reorderedInspection,changedHost,updated,missing,substituted,recoverySubstituted,recoveryGeneration,recoveryProfile,mismatchedHash,missingHash,audit:f.audit,disposed:f.destroyed};
 }finally{f.cleanup();}}
export async function withJira(script,run){
 const tls=JSON.parse(fs.readFileSync(path.join(root,'test/fixtures/jira-preview-tls.json'))),trace=[],sockets=new Set();let index=0,error;
 const server=https.createServer({key:tls.key,cert:tls.cert},async(req,res)=>{let body='';for await(const c of req)body+=c;const step=script[index++];trace.push({method:req.method,path:req.url});if(req.headers.authorization!=='Bearer dummy-scoped-token'||!step||step.path!==req.url||req.method!==(step.method??'GET')||step.request_body&&body!==JSON.stringify(step.request_body)){error='Unexpected prescribed request';res.writeHead(500);res.end('{}');return;}res.writeHead(step.status,{'content-type':'application/json'});res.end(JSON.stringify(step.body));});server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const original=https.request;https.request=(url,options,callback)=>{assert.equal(url.origin,'https://api.atlassian.com');const local=new URL('https://localhost:'+server.address().port+url.pathname.replace('/ex/jira/00000000-0000-0000-0000-000000000001','')+url.search);return original(local,{...options,hostname:'127.0.0.1',servername:'localhost',ca:tls.ca},callback);};syncBuiltinESMExports();
 try{const result=await run();assert.equal(error,undefined);assert.equal(index,script.length);return {result,trace};}finally{https.request=original;syncBuiltinESMExports();for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));}
}
function seedRetained(f,request){const now=stateFixture.now;for(const member of request.retained_members){const record={kind:'member',schema_version:1,installation_id:f.binding.installation_id,domain_id:f.binding.domain_id,record_id:recordId('member',member),revision:0,created_at:now,updated_at:now,extensions:{},site:f.binding.site,...member};f.provider.seed(record);}
 for(const pending of request.pending_intents){const member=request.retained_members.find(m=>m.ticket_id===pending.ticket_id);const stream={site:f.binding.site,project_id:pending.project_id,label:pending.label};f.provider.seed({kind:'stream',schema_version:1,installation_id:f.binding.installation_id,domain_id:f.binding.domain_id,record_id:recordId('stream',stream),revision:0,created_at:now,updated_at:now,extensions:{},...stream,pending_attempt_id:pending.attempt_id});f.provider.seed({kind:'attempt',schema_version:1,installation_id:f.binding.installation_id,domain_id:f.binding.domain_id,record_id:recordId('attempt',pending),revision:0,created_at:now,updated_at:now,extensions:{},...stream,...stateFixture.attemptA,attempt_id:pending.attempt_id,ticket_id:pending.ticket_id,epic_id:member?.epic_id??'100',configuration_digest:f.binding.configuration_digest,outcome:'pending',evidence:null});}}
export function ordinaryWireFixture(change='baseline'){
 const truth=hostFixture().ordinary_source,config=structuredClone(truth.config),settings=hostFixture().config;
 config.manager=structuredClone(settings.manager);config.jira.connection=structuredClone(settings.jira.connection);config.jira.read_bounds=structuredClone(settings.jira.read_bounds);
 const [epic,ticket]=truth.snapshot.issues,adf=body=>({version:1,type:'doc',content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:body}]}]}),wire=i=>({id:i.id,key:i.key,fields:{project:{id:i.project_id},issuetype:{id:i.type_id},status:{id:i.status_id},...(i.parent_id?{parent:{id:i.parent_id}}:{}),labels:i.labels,description:adf(i.body)}}),epicWire=wire(epic),ticketWire=wire(ticket);
 // Inspect every mapped contract before network execution: original requirements,
 // keys, immutable IDs, project/type/status/parent/labels, absent pointers and empty history.
 assert.equal(epic.id,'900');assert.equal(ticket.id,'1001');assert.equal(ticket.parent_id,epic.id);assert.deepEqual(JSON.parse(epic.body).workstreams,[{label:'stream-1',story_order:[ticket.key]}]);assert.equal(epic.pointer,null);assert.equal(ticket.pointer,null);assert.deepEqual(epic.required_requests,[]);assert.deepEqual(ticket.required_requests,[]);assert.equal(truth.snapshot.retained_members.length,0);assert.equal(truth.snapshot.pending_intents.length,0);assert.equal(truth.snapshot.completion_receipts.length,0);
 for(const i of [epic,ticket]){const w=wire(i);assert.deepEqual(JSON.parse(w.fields.description.content[0].content[0].text),JSON.parse(i.body));assert.equal(w.fields.project.id,'100');assert.equal(w.id,i.id);assert.equal(w.key,i.key);assert.equal(w.fields.issuetype.id,i.type_id);assert.equal(w.fields.status.id,i.status_id);assert.deepEqual(w.fields.labels,i.labels);}
 const search=(predicate,issues)=>({method:'POST',path:'/rest/api/3/search/jql',request_body:{jql:'project = "100" AND '+predicate+' ORDER BY id ASC',maxResults:config.jira.read_bounds.page_size,fields:['project','issuetype','status','parent','labels','description']},status:200,body:{issues,isLast:true}}),issue=i=>({path:'/rest/api/3/issue/'+i.id+'?fields=project,issuetype,status,parent,labels,description',status:200,body:wire(i)}),keys=i=>({path:'/rest/api/3/issue/'+i.id+'/properties',status:200,body:{keys:[]}}),comments=i=>({path:'/rest/api/3/issue/'+i.id+'/comment?startAt=0&maxResults='+config.jira.read_bounds.page_size+'&orderBy=created',status:200,body:{startAt:0,maxResults:config.jira.read_bounds.page_size,total:0,comments:[]}});
 const retained={retained_members:[{ticket_id:ticket.id,project_id:'100',epic_id:epic.id,label:'stream-1',assignment:null}],pending_intents:[{ticket_id:ticket.id,project_id:'100',label:'stream-1',attempt_id:stateFixture.attemptA.attempt_id}],retained_complete:true};
 let script=[search('labels = "pigboard"',[epicWire]),issue(epic),keys(epic),comments(epic),search('parent = "900"',[ticketWire]),issue(ticket),keys(ticket),comments(ticket),search('labels = "stream-1"',[ticketWire])],request={retained_members:[],pending_intents:[],retained_complete:true};
 if(change==='rename'){
   const renamedEpic=structuredClone(epic),renamedTicket={...ticket,key:'RENAMED-2'};const body=JSON.parse(renamedEpic.body);body.workstreams[0].story_order=[renamedTicket.key];renamedEpic.body=JSON.stringify(body);config.projects[0].key='RENAMED';request=retained;
   script=[search('labels = "pigboard"',[wire(renamedEpic)]),issue(renamedTicket),keys(renamedTicket),comments(renamedTicket),issue(renamedEpic),keys(renamedEpic),comments(renamedEpic),search('parent = "900"',[wire(renamedTicket)]),search('labels = "stream-1"',[wire(renamedTicket)])];
 }else if(change==='move'){
   config.projects.push({...structuredClone(config.projects[0]),id:'200',key:'OPS'});const moved={...ticket,key:'OPS-2',project_id:'200',parent_id:null};request=retained;
   const second=(predicate,issues)=>{const step=search(predicate,issues);step.request_body.jql=step.request_body.jql.replace('project = "100"','project = "200"');return step;};
   script=[search('labels = "pigboard"',[epicWire]),second('labels = "pigboard"',[]),issue(moved),keys(moved),comments(moved),issue(epic),keys(epic),comments(epic),search('parent = "900"',[]),{...issue(moved),path:'/rest/api/3/issue/EX-2?fields=project,issuetype,status,parent,labels,description'},search('labels = "stream-1"',[]),second('labels = "stream-1"',[wire(moved)])];
 }else if(change==='removal'){
   config.projects=[{...structuredClone(config.projects[0]),id:'200',key:'OPS'}];request=retained;const step=search('labels = "pigboard"',[]);step.request_body.jql=step.request_body.jql.replace('project = "100"','project = "200"');script=[step];
 }else assert.equal(change,'baseline');
 return {change,config,request,script,expected:truth.expected,source:truth.fixture,reviewed_fields:['requirements/body','native ID/key','project/type/status','parent','labels','absent pointers via successful keys','empty original comments','no retained/pending/historical inputs']};
}
export async function wrapperJourney({runtime=root,retainedVariants=true,snapshotSource,snapshotRevision,buildDirectory,baselineBuild}={}){
 const out=[];
 for(const change of retainedVariants?['baseline','rename','move','removal']:['baseline']){
 const native=ordinaryWireFixture(change),config=native.config;let built;
 if(change==='baseline'&&baselineBuild)built=baselineBuild;else if(snapshotSource){const configPath=path.join(buildDirectory,change+'-config.json');fs.writeFileSync(configPath,JSON.stringify(config));built=packageManager({configPath,output:path.join(buildDirectory,change+'-package'),source:snapshotSource,revision:snapshotRevision});}
 const moduleRuntime=built?.payload??runtime,f=await preparedCloud(config,built?.manifest);try{
 const initialized=await runStateCommand(['init','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--json'],{resolveInstallation:f.resolve});assert.equal(initialized.exitCode,0,initialized.stdout);seedRetained(f,native.request);
 const {runPreview:actual}=await import(pathToFileURL(path.join(moduleRuntime,'lib/aws/manager-lambda.mjs')).href),{createDynamoState}=await import(pathToFileURL(path.join(moduleRuntime,'lib/aws/dynamodb.mjs')).href),{createSecretResolver}=await import(pathToFileURL(path.join(moduleRuntime,'lib/aws/installation.mjs')).href),before=f.provider.snapshot(),auditStart=f.provider.audit.length,secretAudit=[];let secretClosed=0;
 const sdk={...loadHostSDK(),SecretsManagerClient:class{async send(command,options){assert.equal(command.constructor.name,'GetSecretValueCommand');assert.equal(command.input.SecretId,config.jira.connection.secret_reference);assert(options.abortSignal);secretAudit.push({action:'GetSecretValue',reference:command.input.SecretId,cancelable:true});return {SecretString:'dummy-scoped-token'};}destroy(){secretClosed++;}}};
 const {result,trace}=await withJira(native.script,()=>actual({operation:'preview'},{...(built?{}:{configText:JSON.stringify(config),manifest:f.manifest}),environment:f.environment,createState:({binding,control})=>createDynamoState({binding,control,client:f.provider}),secretFactory:c=>createSecretResolver(c,{sdk})}));
 assert.equal(result.writes,0);assert.equal(result.execution_authorized,false);assert.equal(f.provider.snapshot(),before);assert(!f.provider.audit.slice(auditStart).some(a=>a.name==='TransactWriteCommand'));assert(!JSON.stringify(result).includes('dummy-scoped-token'));assert.equal(secretClosed,1);assert.equal(secretAudit.length,1);
 if(change==='baseline'){assert.equal(result.status,'preview',JSON.stringify(result));assert.equal(result.preview.streams[0].selected_ticket_id,native.expected.streams[0].selected_ticket_id);assert.equal(result.preview.streams[0].decision,native.expected.streams[0].decision);}
 else{assert(!result.preview?.streams.some(s=>s.selected_ticket_id));assert(['preview','incomplete'].includes(result.status));const retained=f.provider.records();assert(retained.some(r=>r.kind==='member'&&r.ticket_id==='1001'&&r.project_id==='100'));assert(retained.some(r=>r.kind==='attempt'&&r.outcome==='pending'&&r.project_id==='100'));if(result.status==='preview')assert(result.preview.streams.some(s=>s.reasons.some(r=>['PENDING_INTENT','MEMBERSHIP_MISMATCH','INCOMPLETE_STREAM','INCOMPLETE_PROJECT','SCOPE'].includes(r.code))));else assert(result.diagnostics.length);}
 if(built&&result.status==='preview'){assert.equal(result.package_revision,built.manifest.source_revision);assert.equal(result.configuration_digest,built.manifest.configuration_digest);}
 out.push({variant:change,package_manifest:built?.manifest??null,canonical_source:built?'copied config/manager.json and embedded package-manifest.json':'explicit source API inputs',truth_source:native.source,reviewed_mapping:native.reviewed_fields,native_fixture:native,result,trace,before,after:f.provider.snapshot(),secret_audit:secretAudit,provider_audit:f.provider.audit.slice(auditStart)});
 }finally{f.cleanup();}}
 return out;
}
export async function stopJourney(){const f=await preparedCloud();try{const init=await runStateCommand(['init','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--json'],{resolveInstallation:f.resolve});assert.equal(init.exitCode,0);const before=f.provider.records()[0];const stopped=await stopInstallation({configPath:f.configPath,installationPath:f.installationPath,operatorProfile:'operator'},f.dependencies);assert.equal(stopped.status,'stopped',JSON.stringify(stopped));assert.equal(f.cloud.concurrency,0);assert.equal(f.cloud.schedule.State,'DISABLED');const after=f.provider.records()[0];assert.equal(after.revision,before.revision+1);assert.equal(after.maintenance,true);assert.equal(after.configuration_digest,before.configuration_digest);return {stopped,before,after,audit:f.audit};}finally{f.cleanup();}}
async function prepareControls(f){
 assert.equal((await runStateCommand(['init','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--json'],{resolveInstallation:f.resolve})).exitCode,0);
 const config=structuredClone(f.config);config.manager.controls.schedule_enabled=true;
 const text=JSON.stringify(config),digest=hostConfig(text).digest,next={...f.manifest,canonical_config:config,configuration_digest:digest,zip_digest:sha256('updated zip'),payload_hashes:{...f.manifest.payload_hashes,'config/manager.json':digest}};
 f.cloud.nextCodeHash=Buffer.from(next.zip_digest.slice(7),'hex').toString('base64');fs.writeFileSync(f.configPath,text);
 const manifestPath=path.join(f.directory,'manifest.json'),assetPath=path.join(f.directory,'asset.json');fs.writeFileSync(manifestPath,JSON.stringify(next));fs.writeFileSync(assetPath,JSON.stringify({bucket:'prepared-bucket',key:'manager.zip',version:'version1',zip_digest:next.zip_digest}));
 return {digest,next,input:{configPath:f.configPath,installationPath:f.installationPath,manifestPath,assetPath,operatorProfile:'operator',deployerProfile:'deployer'}};
}
export async function configureArrayOrderRefusal(){
 const config=structuredClone(hostFixture().config);config.projects[0].board_ids=['1','2'];const f=await preparedCloud(config);
 try{
  const {next,input}=await prepareControls(f),desired=structuredClone(next.canonical_config);desired.projects[0].board_ids.reverse();const text=JSON.stringify(desired),digest=hostConfig(text).digest;
  fs.writeFileSync(f.configPath,text);fs.writeFileSync(input.manifestPath,JSON.stringify({...next,canonical_config:desired,configuration_digest:digest,payload_hashes:{...next.payload_hashes,'config/manager.json':digest}}));
  const before=f.provider.snapshot(),auditStart=f.audit.length,originalReceipt=fs.readFileSync(f.installationPath,'utf8'),outcome=await configureInstallation(input,f.dependencies);
  assert.equal(outcome.status,'unavailable');assert.equal(outcome.code,'UNSUPPORTED_CHANGE');assert.equal(outcome.phase,'resolve');assert.equal(f.audit.length,auditStart);assert.equal(f.provider.snapshot(),before);assert.equal(fs.readFileSync(f.installationPath,'utf8'),originalReceipt);return {outcome,before,after:f.provider.snapshot(),audit:f.audit.slice(auditStart)};
 }finally{f.cleanup();}
}
export async function asyncConfigRefusalJourney(){
 const observations=[],variants=['lambda_retry','lambda_age','missing_retry','missing_age','absent_config','denied_read','wrong_arn','scheduler_age','missing_scheduler_age'];
 for(const variant of variants)for(const operation of ['bind','inspect','configure']){
  const f=await preparedCloud();try{
   let input;if(operation==='configure')({input}=await prepareControls(f));else assert.equal((await runStateCommand(['init','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--json'],{resolveInstallation:f.resolve})).exitCode,0);
   if(variant==='lambda_retry')f.cloud.asyncConfig.MaximumRetryAttempts=1;
   if(variant==='lambda_age')f.cloud.asyncConfig.MaximumEventAgeInSeconds=120;
   if(variant==='missing_retry')delete f.cloud.asyncConfig.MaximumRetryAttempts;
   if(variant==='missing_age')delete f.cloud.asyncConfig.MaximumEventAgeInSeconds;
   if(variant==='absent_config')f.cloud.asyncConfig=null;
   if(variant==='denied_read')f.cloud.fail='GetFunctionEventInvokeConfigCommand';
   if(variant==='wrong_arn')f.cloud.asyncConfig.FunctionArn=f.cloud.function.FunctionArn+':other-version';
   if(variant==='scheduler_age')f.cloud.schedule.Target.RetryPolicy.MaximumEventAgeInSeconds=120;
   if(variant==='missing_scheduler_age')delete f.cloud.schedule.Target.RetryPolicy.MaximumEventAgeInSeconds;
   const before=f.provider.snapshot(),schedule=structuredClone(f.cloud.schedule),receipt=fs.readFileSync(f.installationPath),auditStart=f.audit.length,stateAuditStart=f.provider.audit.length;let waits=0;
   const dependencies={...f.dependencies,wait:async()=>{waits++;}},providerFailure=['absent_config','denied_read'].includes(variant);let outcome;
   if(operation==='bind'){
    let error;try{await bindInstallation({configText:JSON.stringify(f.config),manifest:f.manifest,stackId:f.stackId,operatorProfile:'operator'},dependencies);}catch(caught){error=caught;}
    assert(error,variant+': bind must not return a receipt');const code=error.code??error.name;assert.equal(code,providerFailure?(variant==='absent_config'?'ResourceNotFoundException':'AccessDeniedException'):'BINDING_MISMATCH');outcome={code};
   }else if(operation==='inspect'){
    const result=await runStateCommand(['inspect','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--kind','installation','--json'],{resolveInstallation:args=>resolveInstallation(args,dependencies)});assert.equal(result.exitCode,providerFailure?2:1);outcome=result.outcome;assert.equal(outcome.status,providerFailure?'unavailable':'conflict');assert.equal(outcome.code,providerFailure?'UNAVAILABLE':'BINDING_MISMATCH');assert.equal(outcome.recovery,undefined);
   }else{
    outcome=await configureInstallation(input,dependencies);assert.equal(outcome.status,'unavailable');assert.equal(outcome.phase,'resolve');assert.equal(outcome.code,providerFailure?'CONTROL_UNCERTAIN':'BINDING_MISMATCH');
    for(const field of ['receipt','recovery_receipt','recovery_receipt_role','applied','applied_confirmation','recovery_metadata'])assert.equal(Object.hasOwn(outcome,field),false,field);
   }
   const audit=f.audit.slice(auditStart),asyncReads=audit.filter(a=>a.action==='GetFunctionEventInvokeConfigCommand');assert.equal(asyncReads.length,variant.startsWith('scheduler')||variant==='missing_scheduler_age'?0:1);
   for(const read of asyncReads){assert.deepEqual(read.input,{FunctionName:installationResourceBase(f.config.manager.installation_id),Qualifier:'$LATEST'});assert.equal(read.identity,'SELECTED_OPERATOR');}
   assert(audit.every(a=>/^(Get|Describe|Query|TransactGet)/.test(a.action)));assert(f.provider.audit.slice(stateAuditStart).every(a=>/^(Get|Describe|Query|TransactGet)/.test(a.name)));assert.equal(waits,0);
   assert.equal(f.provider.snapshot(),before);assert.deepEqual(f.cloud.schedule,schedule);assert.equal(f.cloud.concurrency,1);assert.deepEqual(fs.readFileSync(f.installationPath),receipt);
   observations.push({variant,operation,code:outcome.code,async_reads:asyncReads.length,no_effects:true,waits});
  }finally{f.cleanup();}
 }
 return observations;
}
export async function asyncConfigRecoveryJourney(){
 const observations=[];
 for(const variant of ['combined_drift','absent_and_denied']){const f=await preparedCloud();try{
  assert.equal((await runStateCommand(['init','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--json'],{resolveInstallation:f.resolve})).exitCode,0);
  const member=Object.fromEntries(Object.entries({...stateFixture.memberA,project_id:'10001',label:'AI-Daniel-1'}).filter(([key])=>!['expected_revision','site'].includes(key)));
  seedRetained(f,{retained_members:[member],pending_intents:[{project_id:member.project_id,label:member.label,ticket_id:member.ticket_id,attempt_id:stateFixture.attemptA.attempt_id}]});
  const installation=f.provider.records().find(r=>r.kind==='installation');f.provider.seed({...installation,extensions:{customer_note:'retain'}});
  if(variant==='combined_drift'){f.cloud.asyncConfig.MaximumRetryAttempts=1;f.cloud.asyncConfig.MaximumEventAgeInSeconds=120;f.cloud.schedule.Target.RetryPolicy.MaximumEventAgeInSeconds=120;}else{f.cloud.asyncConfig=null;f.cloud.fail='GetFunctionEventInvokeConfigCommand';delete f.cloud.schedule.Target.RetryPolicy.MaximumEventAgeInSeconds;}
  const before=f.provider.snapshot(),receipt=fs.readFileSync(f.installationPath),auditStart=f.audit.length,stateAuditStart=f.provider.audit.length,args=['inspect','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--kind','installation','--recovery'];
  const json=await runStateCommand([...args,'--json'],{resolveInstallation:f.resolve}),readable=await runStateCommand(args,{resolveInstallation:f.resolve});assert.equal(json.exitCode,0,json.stdout);assert.equal(readable.exitCode,0,readable.stdout);assert.deepEqual(json.outcome,readable.outcome);assert.deepEqual(JSON.parse(json.stdout),json.outcome);assert(readable.stdout.includes(JSON.stringify(json.outcome.recovery)));
  assert.equal(json.outcome.recovery.package_verified,false);assert.deepEqual(json.outcome.recovery.original,{binding:f.receipt.binding,zip_digest:f.manifest.zip_digest});assert.equal(f.provider.snapshot(),before);assert(f.audit.slice(auditStart).every(a=>/^(Get|Describe|Query|TransactGet)/.test(a.action)));assert(f.provider.audit.slice(stateAuditStart).every(a=>/^(Get|Describe|Query|TransactGet)/.test(a.name)));
  const prior=f.provider.records().find(r=>r.kind==='installation'),retained=f.provider.records().filter(r=>r.kind!=='installation'),stopped=await stopInstallation({configPath:f.configPath,installationPath:f.installationPath,operatorProfile:'operator'},f.dependencies);assert.equal(stopped.status,'stopped',JSON.stringify(stopped));assert.equal(stopped.recovery.package_verified,false);assert.deepEqual(stopped.recovery.original,{binding:f.receipt.binding,zip_digest:f.manifest.zip_digest});
  const after=f.provider.records().find(r=>r.kind==='installation');assert.equal(after.revision,prior.revision+1);assert.equal(after.maintenance,true);assert.equal(after.schedule_enabled,false);assert.equal(after.writes_enabled,false);for(const field of ['configuration_digest','package_revision','installation_generation','table_arn','stack_id'])assert.equal(after[field],prior[field]);assert.deepEqual(after.extensions,prior.extensions);assert.deepEqual(f.provider.records().filter(r=>r.kind!=='installation'),retained);assert.equal(f.cloud.schedule.State,'DISABLED');assert.equal(f.cloud.concurrency,0);assert.deepEqual(fs.readFileSync(f.installationPath),receipt);
  const audit=f.audit.slice(auditStart),writes=f.provider.audit.slice(stateAuditStart).filter(a=>a.name==='TransactWriteCommand');assert.equal(writes.length,1);assert(writes[0].input.TransactItems[0].Update.ConditionExpression.includes('#old_revision = :old_revision'));assert.equal(writes[0].input.TransactItems[0].Update.ExpressionAttributeValues[':old_revision'],prior.revision);assert(!audit.some(a=>['GetFunctionEventInvokeConfigCommand','CreateChangeSetCommand','ExecuteChangeSetCommand'].includes(a.action)));
  observations.push({variant,recovery_formats:2,package_verified:false,async_reads:0,stopped:stopped.status,conditional_revision_increment:1,retained_records:retained.length,receipt_unchanged:true});
 }finally{f.cleanup();}}
 return observations;
}
export async function asyncConfigPostUpdateJourney(){const f=await preparedCloud();try{
 const {input}=await prepareControls(f),prior=f.provider.records().find(r=>r.kind==='installation'),receipt=fs.readFileSync(f.installationPath),auditStart=f.audit.length,makeClient=f.dependencies.makeClient;
 f.dependencies.makeClient=(kind,options)=>{const client=makeClient(kind,options);return {...client,send:async(command,sendOptions)=>{const result=await client.send(command,sendOptions);if(command.constructor.name==='ExecuteChangeSetCommand')f.cloud.asyncConfig.MaximumEventAgeInSeconds=120;return result;}};};
 const outcome=await configureInstallation(input,f.dependencies);assert.equal(outcome.status,'partial',JSON.stringify(outcome));assert.equal(outcome.phase,'observe');assert.equal(outcome.code,'BINDING_MISMATCH');assert.deepEqual(outcome.recovery_receipt,f.receipt);assert.equal(Object.hasOwn(outcome,'receipt'),false);assert.equal(outcome.recovery_metadata.package_verified,false);assert.equal(f.cloud.schedule.State,'DISABLED');assert.equal(f.cloud.concurrency,0);assert.deepEqual(fs.readFileSync(f.installationPath),receipt);
 const after=f.provider.records().find(r=>r.kind==='installation');assert.equal(after.revision,prior.revision+1);assert.equal(after.maintenance,true);assert.equal(after.schedule_enabled,false);assert.equal(after.configuration_digest,prior.configuration_digest);assert.equal(after.package_revision,prior.package_revision);assert.deepEqual(outcome.applied,after);
 const audit=f.audit.slice(auditStart),reads=audit.filter(a=>a.action==='GetFunctionEventInvokeConfigCommand');assert.equal(reads.length,2);for(const read of reads){assert.equal(read.identity,'SELECTED_OPERATOR');assert.deepEqual(read.input,{FunctionName:installationResourceBase(f.config.manager.installation_id),Qualifier:'$LATEST'});}assert.equal(audit.filter(a=>a.action==='ExecuteChangeSetCommand').length,1);assert.equal(audit.filter(a=>a.action==='TransactWriteCommand').length,1);assert.deepEqual(audit.filter(a=>a.action==='PutFunctionConcurrencyCommand').map(a=>a.input.ReservedConcurrentExecutions),[0]);assert.deepEqual(audit.filter(a=>a.action==='UpdateScheduleCommand').map(a=>a.input.State),['DISABLED']);
 return {status:outcome.status,phase:outcome.phase,code:outcome.code,async_reads:reads.length,execute_calls:1,restored_preview:false,committed_desired_controls:false,receipt_unchanged:true};
 }finally{f.cleanup();}}
export async function configureAssetRefusalJourney(){
 const observations=[];
 for(const [variant,code] of [['missing','ENOENT'],['malformed','CONTROL_UNCERTAIN'],['zip_digest','ASSET_MISMATCH'],['bucket','ASSET_MISMATCH'],['key','ASSET_MISMATCH'],['version','ASSET_MISMATCH'],['object_bucket','ASSET_MISMATCH'],['array_key','ASSET_MISMATCH'],['numeric_version','ASSET_MISMATCH']]){
  const f=await preparedCloud();try{
   const {input}=await prepareControls(f);
   if(variant==='missing')fs.unlinkSync(input.assetPath);else if(variant==='malformed')fs.writeFileSync(input.assetPath,'{');else{const asset=JSON.parse(fs.readFileSync(input.assetPath,'utf8'));if(variant==='zip_digest')asset.zip_digest=sha256('different zip');else if(variant==='object_bucket')asset.bucket={};else if(variant==='array_key')asset.key=['manager.zip'];else if(variant==='numeric_version')asset.version=1;else delete asset[variant];fs.writeFileSync(input.assetPath,JSON.stringify(asset));}
   const before=f.provider.snapshot(),schedule=structuredClone(f.cloud.schedule),originalReceipt=fs.readFileSync(f.installationPath),auditStart=f.audit.length,stateAuditStart=f.provider.audit.length,calls={fromIni:0,makeClient:0,wait:0};
   assert.equal(f.provider.records().find(r=>r.kind==='installation').maintenance,false);assert.equal(f.cloud.schedule.State,'DISABLED');assert.equal(f.cloud.concurrency,1);
   const dependencies={...f.dependencies,sdk:{...f.dependencies.sdk,fromIni:(...args)=>{calls.fromIni++;return f.dependencies.sdk.fromIni(...args);}},makeClient:(...args)=>{calls.makeClient++;return f.dependencies.makeClient(...args);},wait:(...args)=>{calls.wait++;return f.dependencies.wait(...args);}};
   const outcome=await configureInstallation(input,dependencies);
   assert.equal(outcome.status,'unavailable',variant);assert.equal(outcome.phase,'resolve',variant);assert.equal(outcome.code,code,variant);
   for(const field of ['receipt','recovery_receipt','recovery_receipt_role','desired','applied','applied_confirmation','recovery_metadata'])assert.equal(Object.hasOwn(outcome,field),false,variant+': '+field);
   assert.equal(f.provider.snapshot(),before,variant);assert.deepEqual(f.cloud.schedule,schedule,variant);assert.equal(f.cloud.concurrency,1,variant);assert.deepEqual(fs.readFileSync(f.installationPath),originalReceipt,variant);
   assert.equal(f.audit.length,auditStart,variant);assert.equal(f.provider.audit.length,stateAuditStart,variant);assert.deepEqual(calls,{fromIni:0,makeClient:0,wait:0},variant);
   observations.push({variant,status:outcome.status,phase:outcome.phase,code:outcome.code,calls,aws_audit_entries:f.audit.length-auditStart,state_audit_entries:f.provider.audit.length-stateAuditStart,state_unchanged:true,schedule_unchanged:true,concurrency:f.cloud.concurrency,receipt_unchanged:true});
  }finally{f.cleanup();}
 }
 return observations;
}
export async function scheduleDriftJourney(){
 const observations=[];
 const seedPending=f=>{const member=Object.fromEntries(Object.entries({...stateFixture.memberA,project_id:'10001',label:'AI-Daniel-1'}).filter(([key])=>!['expected_revision','site'].includes(key)));seedRetained(f,{retained_members:[member],pending_intents:[{project_id:member.project_id,label:member.label,ticket_id:member.ticket_id,attempt_id:stateFixture.attemptA.attempt_id}]});const record=f.provider.records().find(r=>r.kind==='installation');f.provider.seed({...record,extensions:{customer_note:'retain'}});const retained=f.provider.records().filter(r=>r.kind!=='installation');assert(retained.some(r=>r.kind==='attempt'&&r.outcome==='pending'));return retained;};
 const unrelatedExtensions=extensions=>Object.fromEntries(Object.entries(extensions).filter(([key])=>!['health_generation','health_enabled_at'].includes(key)));
 const seededExtension=f=>assert.equal(f.provider.records().find(r=>r.kind==='installation').extensions.customer_note,'retain');
 const capture=f=>(seededExtension(f),{state:f.provider.snapshot(),schedule:structuredClone(f.cloud.schedule),concurrency:f.cloud.concurrency,receipt:fs.readFileSync(f.installationPath),aws:f.audit.length,stateAudit:f.provider.audit.length});
 const unchanged=(f,before)=>{seededExtension(f);assert.equal(f.provider.snapshot(),before.state);assert.deepEqual(f.cloud.schedule,before.schedule);assert.equal(f.cloud.concurrency,before.concurrency);assert.deepEqual(fs.readFileSync(f.installationPath),before.receipt);assert(f.audit.slice(before.aws).every(a=>/^(Get|Describe|Query|TransactGet)/.test(a.action)));assert(f.provider.audit.slice(before.stateAudit).every(a=>/^(Get|Describe|Query|TransactGet)/.test(a.name)));};
 const inspect=f=>runStateCommand(['inspect','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--kind','installation','--json'],{resolveInstallation:f.resolve});
 const health=async(f,input,desired,actual)=>{const before=capture(f),resolved=await resolveInstallation({...input,purpose:'inspect'},{...f.dependencies,health:true});try{assert.equal(resolved.control.schedule_enabled,desired);assert.equal(resolved.observed.schedule.State,actual);const final=await observeInstallation({config:resolved.receipt.manifest.canonical_config,manifest:resolved.receipt.manifest,stackId:resolved.receipt.binding.stack_id,session:resolved.session});assert.equal(final.schedule.State,actual);}finally{resolved.dispose();}unchanged(f,before);};
 const retainedIdentity=(f,record,retained,configureHealth=false)=>{seededExtension(f);const after=f.provider.records().find(r=>r.kind==='installation');for(const field of ['installation_id','domain_id','table_arn','stack_id','installation_generation','package_revision'])assert.equal(after[field],record[field]);if(configureHealth)assert.deepEqual(unrelatedExtensions(after.extensions),unrelatedExtensions(record.extensions));else assert.deepEqual(after.extensions,record.extensions);assert.deepEqual(f.provider.records().filter(r=>r.kind!=='installation'),retained);return after;};
 const f=await preparedCloud();try{
  const {input}=await prepareControls(f),retained=seedPending(f),prior=f.provider.records().find(r=>r.kind==='installation'),originalReceipt=fs.readFileSync(f.installationPath),desiredText=fs.readFileSync(f.configPath,'utf8');let waits=0;f.dependencies.wait=async()=>{waits++;};f.cloud.schedule.State='ENABLED';const before=capture(f);
  await assert.rejects(()=>bindInstallation({configText:JSON.stringify(f.config),manifest:f.manifest,stackId:f.stackId,operatorProfile:'operator'},f.dependencies),{code:'BINDING_MISMATCH'});unchanged(f,before);
  const inspected=await inspect(f);assert.equal(inspected.exitCode,1,inspected.stdout);assert.equal(inspected.outcome.status,'conflict');assert.equal(inspected.outcome.code,'BINDING_MISMATCH');assert.equal(inspected.outcome.recovery,undefined);unchanged(f,before);
  const configured=await configureInstallation(input,f.dependencies);assert.equal(configured.status,'unavailable');assert.equal(configured.phase,'resolve');assert.equal(configured.code,'BINDING_MISMATCH');for(const field of ['receipt','recovery_receipt','recovery_receipt_role','desired','applied','applied_confirmation','recovery_metadata'])assert.equal(Object.hasOwn(configured,field),false,field);unchanged(f,before);assert.equal(waits,0);
  fs.writeFileSync(f.configPath,JSON.stringify(f.config));await health(f,input,false,'ENABLED');fs.writeFileSync(f.configPath,desiredText);
  const recovery=await runStateCommand(['inspect','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--kind','installation','--recovery','--json'],{resolveInstallation:f.resolve});assert.equal(recovery.exitCode,0,recovery.stdout);assert.equal(recovery.outcome.recovery.package_verified,false);assert.deepEqual(recovery.outcome.recovery.original,{binding:f.receipt.binding,zip_digest:f.manifest.zip_digest});unchanged(f,before);assert.equal(waits,0);
  const stopped=await stopInstallation(input,f.dependencies);assert.equal(stopped.status,'stopped',JSON.stringify(stopped));assert.deepEqual(stopped.recovery.original,{binding:f.receipt.binding,zip_digest:f.manifest.zip_digest});assert.equal(f.cloud.schedule.State,'DISABLED');assert.equal(f.cloud.concurrency,0);const after=retainedIdentity(f,prior,retained);assert.deepEqual(after,{...prior,schedule_enabled:false,writes_enabled:false,maintenance:true,revision:prior.revision+1,updated_at:after.updated_at});assert.equal(f.provider.audit.slice(before.stateAudit).filter(a=>a.name==='TransactWriteCommand').length,1);assert.deepEqual(fs.readFileSync(f.installationPath),originalReceipt);assert.equal(waits,1);
  observations.push({sequence:'disabled_receipt_enabled_drift',bind:'BINDING_MISMATCH',inspect:inspected.outcome.code,configure:configured.code,preflight_writes:0,preflight_waits:0,health_observations:2,recovery:recovery.outcome.status,stop:stopped.status,retained_records:retained.length,original_authority:true});
 }finally{f.cleanup();}
 const g=await preparedCloud();try{
  const {digest,next,input}=await prepareControls(g),retained=seedPending(g),prior=g.provider.records().find(r=>r.kind==='installation'),originalReceipt=g.receipt,desiredText=fs.readFileSync(g.configPath,'utf8');let waits=0;g.dependencies.wait=async()=>{waits++;};let before=capture(g);
  const toggle=await inspect(g);assert.equal(toggle.exitCode,0,toggle.stdout);assert.equal(toggle.outcome.data.controls_match,false);unchanged(g,before);assert.equal(waits,0);
  const configured=await configureInstallation(input,g.dependencies);assert.equal(configured.status,'configured',JSON.stringify(configured));assert.deepEqual(configured.receipt.original,originalReceipt.original);assert.equal(configured.receipt.binding.installation_generation,originalReceipt.binding.installation_generation);assert.equal(g.cloud.schedule.State,'ENABLED');assert.equal(g.cloud.concurrency,1);let after=retainedIdentity(g,prior,retained,true);assert.deepEqual(after,{...prior,...configured.desired,extensions:after.extensions,configuration_digest:digest,revision:prior.revision+2,updated_at:after.updated_at});assert.equal(g.provider.audit.slice(before.stateAudit).filter(a=>a.name==='TransactWriteCommand').length,2);assert.equal(waits,1);fs.writeFileSync(g.installationPath,JSON.stringify(configured.receipt));
  const disabled=structuredClone(next.canonical_config);disabled.manager.controls.schedule_enabled=false;fs.writeFileSync(g.configPath,JSON.stringify(disabled));before=capture(g);const changedIntent=await inspect(g);assert.equal(changedIntent.exitCode,0,changedIntent.stdout);assert.equal(changedIntent.outcome.data.controls_match,false);unchanged(g,before);fs.writeFileSync(g.configPath,desiredText);assert.equal(waits,1);
  const preStop=after;before=capture(g);const stopped=await stopInstallation(input,g.dependencies);assert.equal(stopped.status,'stopped',JSON.stringify(stopped));assert.deepEqual(stopped.recovery.original,{binding:configured.receipt.binding,zip_digest:configured.receipt.manifest.zip_digest});assert.equal(g.cloud.schedule.State,'DISABLED');assert.equal(g.cloud.concurrency,0);after=retainedIdentity(g,preStop,retained);assert.deepEqual(after,{...preStop,schedule_enabled:false,writes_enabled:false,maintenance:true,revision:preStop.revision+1,updated_at:after.updated_at});assert.equal(g.provider.audit.slice(before.stateAudit).filter(a=>a.name==='TransactWriteCommand').length,1);assert.deepEqual(fs.readFileSync(g.installationPath),before.receipt);assert.equal(waits,2);
  before=capture(g);const stoppedInspect=await inspect(g);assert.equal(stoppedInspect.exitCode,0,stoppedInspect.stdout);assert.equal(stoppedInspect.outcome.data.controls_match,false);unchanged(g,before);await health(g,input,true,'DISABLED');unchanged(g,before);assert.equal(waits,2);
  const preEnable=after,reenabled=await configureInstallation(input,g.dependencies);assert.equal(reenabled.status,'configured',JSON.stringify(reenabled));assert.deepEqual(reenabled.receipt.original,originalReceipt.original);assert.deepEqual(reenabled.receipt.binding,configured.receipt.binding);assert.equal(g.cloud.schedule.State,'ENABLED');assert.equal(g.cloud.concurrency,1);after=retainedIdentity(g,preEnable,retained,true);assert.deepEqual(after,{...preEnable,...reenabled.desired,extensions:after.extensions,configuration_digest:digest,revision:preEnable.revision+2,updated_at:after.updated_at});assert.equal(g.provider.audit.slice(before.stateAudit).filter(a=>a.name==='TransactWriteCommand').length,2);assert.deepEqual(fs.readFileSync(g.installationPath),before.receipt);assert.equal(waits,3);
  observations.push({sequence:'legitimate_toggle_stop_reenable',toggle_controls_match:toggle.outcome.data.controls_match,configure:configured.status,changed_intent_controls_match:changedIntent.outcome.data.controls_match,stop:stopped.status,stopped_inspect:stoppedInspect.outcome.status,health_observations:2,reenable:reenabled.status,state_writes:5,retained_records:retained.length,original_authority:true});
 }finally{g.cleanup();}
 return observations;
}
function completionEvent(f,status='UPDATE_COMPLETE',changes={}){return {ClientRequestToken:f.cloud.executedToken,StackId:f.stackId,PhysicalResourceId:f.stackId,ResourceType:'AWS::CloudFormation::Stack',ResourceStatus:status,...changes};}
export async function configureCompletionJourney(){
 const rows=[];
 for(const variant of ['delayed','immediate']){const f=await preparedCloud();try{
  const {input,digest}=await prepareControls(f),prior=structuredClone(f.provider.records().find(r=>r.kind==='installation')),original=fs.readFileSync(f.installationPath),auditStart=f.audit.length;let reads=0,proofIndex;
  f.cloud.completionPage=count=>{
   reads++;assert.equal(f.cloud.concurrency,0);assert.equal(f.cloud.schedule.State,'DISABLED');assert.deepEqual(fs.readFileSync(f.installationPath),original);
   const applied=f.provider.records().find(r=>r.kind==='installation');assert.equal(applied.revision,prior.revision+1);assert.equal(applied.configuration_digest,prior.configuration_digest);assert.equal(applied.schedule_enabled,false);assert.equal(applied.maintenance,true);
   assert(!f.audit.slice(auditStart).some(a=>a.action==='PutFunctionConcurrencyCommand'&&a.input.ReservedConcurrentExecutions===1||a.action==='UpdateScheduleCommand'&&a.input.State==='ENABLED'));
   // Desired Lambda is already observable; it cannot substitute for operation proof.
   assert.equal(f.cloud.function.Environment.Variables.PB_CONFIGURATION_DIGEST,digest);
   if(variant==='delayed'&&count===1)return {StackEvents:[completionEvent(f,'UPDATE_COMPLETE',{ClientRequestToken:'old-token'}),completionEvent(f,'UPDATE_COMPLETE',{StackId:f.stackId+'-other'}),completionEvent(f,'UPDATE_COMPLETE',{PhysicalResourceId:f.stackId+'-other'}),completionEvent(f,'UPDATE_COMPLETE',{ResourceType:'AWS::Lambda::Function'})]};
   if(variant==='delayed'&&count===2)return {StackEvents:[completionEvent(f,'UPDATE_IN_PROGRESS'),completionEvent(f,'UPDATE_COMPLETE')]};
   proofIndex=f.audit.length-1;return {StackEvents:[completionEvent(f)]};
  };
  const outcome=await configureInstallation(input,f.dependencies);assert.equal(outcome.status,'configured',JSON.stringify(outcome));assert.equal(reads,variant==='delayed'?3:1);assert(outcome.receipt);assert.equal(outcome.applied.configuration_digest,digest);assert.equal(f.cloud.concurrency,1);assert.equal(f.cloud.schedule.State,'ENABLED');
  const audit=f.audit.slice(auditStart),execute=audit.filter(a=>a.action==='ExecuteChangeSetCommand'),events=audit.filter(a=>a.action==='DescribeStackEventsCommand');assert.equal(execute.length,1);assert.equal(typeof execute[0].input.ClientRequestToken,'string');assert(execute[0].input.ClientRequestToken.length>0);assert.equal(execute[0].identity,'SELECTED_DEPLOYER');assert.equal(events.length,reads);for(const event of events){assert.equal(event.identity,'SELECTED_OPERATOR');assert.deepEqual(event.input,{StackName:f.stackId});}
  for(let i=auditStart;i<f.audit.length;i++){const a=f.audit[i];if(a.action==='PutFunctionConcurrencyCommand'&&a.input.ReservedConcurrentExecutions===1||a.action==='UpdateScheduleCommand'&&a.input.State==='ENABLED'||a.action==='TransactWriteCommand'&&a.input.TransactItems[0].Update.ExpressionAttributeValues[':v0']===digest)assert(i>proofIndex);}
  rows.push({variant,status:outcome.status,execute_calls:execute.length,event_reads:events.length,restore_after_proof:true});
 }finally{f.cleanup();}}
 return rows;
}
export async function configureMissingCompletionJourney(){
 const rows=[];
 for(const variant of ['rollback','denied','missing']){const f=await preparedCloud();try{
  const {input}=await prepareControls(f),member=Object.fromEntries(Object.entries({...stateFixture.memberA,project_id:'10001',label:'AI-Daniel-1'}).filter(([key])=>!['expected_revision','site'].includes(key)));
  seedRetained(f,{retained_members:[member],pending_intents:[{project_id:member.project_id,label:member.label,ticket_id:member.ticket_id,attempt_id:stateFixture.attemptA.attempt_id}]});
  const prior=structuredClone(f.provider.records().find(r=>r.kind==='installation')),retained=f.provider.records().filter(r=>r.kind!=='installation'),original=fs.readFileSync(f.installationPath),auditStart=f.audit.length;let polls=0;
  f.dependencies.wait=async ms=>{if(ms===1000)polls++;};
  if(variant==='denied')f.cloud.fail='DescribeStackEventsCommand';
  else f.cloud.completionPage=()=>({StackEvents:[completionEvent(f,variant==='rollback'?'UPDATE_ROLLBACK_COMPLETE':'UPDATE_COMPLETE',variant==='missing'?{ClientRequestToken:'old-token'}:{})],...(variant==='missing'?{NextToken:'unread-page'}:{})});
  const outcome=await configureInstallation(input,f.dependencies);assert.equal(outcome.status,'partial',JSON.stringify(outcome));assert.equal(outcome.phase,'apply');assert.equal(outcome.code,variant==='denied'?'CONTROL_UNCERTAIN':'DEPLOYMENT_UNCERTAIN');assert.equal(Object.hasOwn(outcome,'receipt'),false);assert.deepEqual(outcome.recovery_receipt,f.receipt);assert.equal(outcome.recovery_metadata.package_verified,false);assert.deepEqual(fs.readFileSync(f.installationPath),original);assert.equal(f.cloud.concurrency,0);assert.equal(f.cloud.schedule.State,'DISABLED');
  const after=f.provider.records().find(r=>r.kind==='installation');assert.equal(after.revision,prior.revision+1);for(const field of ['configuration_digest','package_revision','installation_generation','table_arn','stack_id'])assert.equal(after[field],prior[field]);assert.equal(after.maintenance,true);assert.equal(after.schedule_enabled,false);assert.equal(after.writes_enabled,false);assert.deepEqual(f.provider.records().filter(r=>r.kind!=='installation'),retained);assert.deepEqual(outcome.applied,after);
  const audit=f.audit.slice(auditStart),events=audit.filter(a=>a.action==='DescribeStackEventsCommand'),execute=audit.filter(a=>a.action==='ExecuteChangeSetCommand');assert.equal(execute.length,1);assert(execute[0].input.ClientRequestToken);assert.equal(events.length,variant==='missing'?120:1);assert.equal(polls,variant==='missing'?120:0);for(const event of events){assert.equal(event.identity,'SELECTED_OPERATOR');assert.deepEqual(event.input,{StackName:f.stackId});}assert.equal(audit.filter(a=>a.action==='TransactWriteCommand').length,1);assert.deepEqual(audit.filter(a=>a.action==='PutFunctionConcurrencyCommand').map(a=>a.input.ReservedConcurrentExecutions),[0]);assert.deepEqual(audit.filter(a=>a.action==='UpdateScheduleCommand').map(a=>a.input.State),['DISABLED']);
  rows.push({variant,status:outcome.status,phase:outcome.phase,code:outcome.code,event_reads:events.length,polls,execute_calls:1,retained_records:retained.length,restored:false,original_authority:true});
 }finally{f.cleanup();}}
 return rows;
}
export async function boundedConcurrencyJourney(){
 const rows=[];
 for(const value of [undefined,2]){const f=await preparedCloud();try{
  const {input}=await prepareControls(f),original=fs.readFileSync(f.installationPath),before=f.provider.snapshot(),schedule=structuredClone(f.cloud.schedule),auditStart=f.audit.length;let waits=0;f.cloud.concurrency=value;f.dependencies.wait=async()=>{waits++;};
  let error;try{await bindInstallation({configText:JSON.stringify(f.config),manifest:f.manifest,stackId:f.stackId,operatorProfile:'operator'},f.dependencies);}catch(caught){error=caught;}assert.equal(error?.code,'BINDING_MISMATCH');
  const args=['inspect','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--kind','installation','--json'],inspected=await runStateCommand(args,{resolveInstallation:f.resolve});assert.equal(inspected.exitCode,1);assert.equal(inspected.outcome.status,'conflict');assert.equal(inspected.outcome.code,'BINDING_MISMATCH');
  const configured=await configureInstallation(input,f.dependencies);assert.equal(configured.status,'unavailable');assert.equal(configured.phase,'resolve');assert.equal(configured.code,'BINDING_MISMATCH');for(const field of ['receipt','recovery_receipt','applied','recovery_metadata'])assert.equal(Object.hasOwn(configured,field),false);
  assert.equal(f.provider.snapshot(),before);assert.deepEqual(f.cloud.schedule,schedule);assert.equal(f.cloud.concurrency,value);assert.deepEqual(fs.readFileSync(f.installationPath),original);assert.equal(waits,0);assert(f.audit.slice(auditStart).every(a=>/^(Get|Describe|Query|TransactGet)/.test(a.action)));
  const recovery=await runStateCommand([...args,'--recovery'],{resolveInstallation:f.resolve});assert.equal(recovery.exitCode,0,recovery.stdout);assert.deepEqual(recovery.outcome.recovery.original,{binding:f.receipt.binding,zip_digest:f.manifest.zip_digest});assert.equal(recovery.outcome.recovery.package_verified,false);assert.equal(f.provider.snapshot(),before);
  const prior=f.provider.records().find(r=>r.kind==='installation'),stopped=await stopInstallation(input,f.dependencies);assert.equal(stopped.status,'stopped',JSON.stringify(stopped));assert.deepEqual(stopped.recovery.original,{binding:f.receipt.binding,zip_digest:f.manifest.zip_digest});assert.equal(f.cloud.concurrency,0);assert.equal(f.cloud.schedule.State,'DISABLED');const after=f.provider.records().find(r=>r.kind==='installation');assert.equal(after.revision,prior.revision+1);for(const field of ['configuration_digest','package_revision','installation_generation','table_arn','stack_id'])assert.equal(after[field],prior[field]);assert.deepEqual(fs.readFileSync(f.installationPath),original);assert.equal(waits,1);
  rows.push({value:value??'absent',bind:'BINDING_MISMATCH',inspect:inspected.outcome.code,configure:configured.code,preflight_mutations:0,recovery:recovery.outcome.status,stop:stopped.status,final_concurrency:0,original_authority:true});
 }finally{f.cleanup();}}
 const f=await preparedCloud();try{
  const args=['inspect','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--kind','installation','--json'];assert.equal((await runStateCommand(['init','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--json'],{resolveInstallation:f.resolve})).exitCode,0);
  const running=await runStateCommand(args,{resolveInstallation:f.resolve});assert.equal(running.exitCode,0,running.stdout);f.cloud.concurrency=0;const before=f.provider.snapshot(),auditStart=f.audit.length,original=fs.readFileSync(f.installationPath),stopped=await runStateCommand(args,{resolveInstallation:f.resolve});assert.equal(stopped.exitCode,0,stopped.stdout);const init=await runStateCommand(['init','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--json'],{resolveInstallation:f.resolve});assert.equal(init.outcome.code,'FRESH_INSTALLATION_REQUIRED');assert.equal(f.provider.snapshot(),before);assert.equal(f.cloud.concurrency,0);assert.deepEqual(fs.readFileSync(f.installationPath),original);assert(f.audit.slice(auditStart).every(a=>/^(Get|Describe|Query|TransactGet)/.test(a.action)));
  rows.push({value:1,normal_inspect:running.outcome.status},{value:0,normal_inspect:stopped.outcome.status,init:init.outcome.code,post_update_zero:'covered by prescribed configure control'});
 }finally{f.cleanup();}
 return rows;
}
export async function configureJourney({partial=false}={}){const f=await preparedCloud();try{
 const {digest,input}=await prepareControls(f);if(partial)f.cloud.fail='ExecuteChangeSetCommand';
 const outcome=await configureInstallation(input,f.dependencies);assert.equal(outcome.status,partial?'partial':'configured',JSON.stringify(outcome));assert(f.audit.filter(a=>['CreateChangeSetCommand','DescribeChangeSetCommand','ExecuteChangeSetCommand'].includes(a.action)).every(a=>a.identity==='SELECTED_DEPLOYER'));assert(f.audit.filter(a=>['TransactWriteCommand','UpdateScheduleCommand','PutFunctionConcurrencyCommand'].includes(a.action)).every(a=>a.identity==='SELECTED_OPERATOR'));
 if(partial){assert.equal(f.cloud.schedule.State,'DISABLED');assert.equal(f.cloud.concurrency,0);assert.equal(f.provider.records()[0].writes_enabled,false);assert.deepEqual(outcome.recovery_receipt,f.receipt);}else{assert.equal(f.provider.records()[0].configuration_digest,digest);assert.equal(f.cloud.schedule.State,'ENABLED');assert.equal(f.cloud.concurrency,1);}return {outcome,audit:f.audit,records:f.provider.records()};
 }finally{f.cleanup();}}
export async function lateRecoveryJourney(){const f=await preparedCloud();try{
 const {digest,input}=await prepareControls(f),originalReceipt=fs.readFileSync(f.installationPath,'utf8');
 const member=Object.fromEntries(Object.entries({...stateFixture.memberA,project_id:'10001',label:'AI-Daniel-1'}).filter(([key])=>!['expected_revision','site'].includes(key)));
 seedRetained(f,{retained_members:[member],pending_intents:[{project_id:member.project_id,label:member.label,ticket_id:member.ticket_id,attempt_id:stateFixture.attemptA.attempt_id}]});
 const installation=f.provider.records().find(r=>r.kind==='installation');f.provider.seed({...installation,extensions:{customer_note:'retain'}});
 const retained=f.provider.records().filter(r=>r.kind!=='installation');f.cloud.failCommitControls=true;
 const outcome=await configureInstallation(input,f.dependencies);assert.equal(outcome.status,'partial',JSON.stringify(outcome));assert.equal(outcome.phase,'commit_controls');assert.deepEqual(outcome.recovery_receipt,f.receipt);assert.equal(outcome.receipt,undefined);assert.equal(f.cloud.schedule.State,'ENABLED');assert.equal(f.cloud.concurrency,1);f.cloud.failCommitControls=false;
 const reorderedDesired=JSON.parse(fs.readFileSync(f.configPath,'utf8'));reorderedDesired.manager.aws=Object.fromEntries(Object.entries(reorderedDesired.manager.aws).reverse());fs.writeFileSync(f.configPath,JSON.stringify(reorderedDesired));assert.equal(hostConfig(JSON.stringify(reorderedDesired)).digest,digest);
 const recoveryStart=f.audit.length,args=['inspect','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--kind','installation'];
 const normal=await runStateCommand([...args,'--json'],{resolveInstallation:f.resolve});assert.equal(normal.outcome.code,'BINDING_MISMATCH');assert.equal(normal.outcome.recovery,undefined);
 const resolved=await f.resolve({...input,purpose:'recovery-inspect'});assert.equal(resolved.binding.configuration_digest,digest);assert.equal(resolved.control.configuration_digest,digest);assert.notEqual(resolved.receipt.binding.configuration_digest,digest);resolved.dispose();
 const json=await runStateCommand([...args,'--recovery','--json'],{resolveInstallation:f.resolve}),readable=await runStateCommand([...args,'--recovery'],{resolveInstallation:f.resolve});
 assert.equal(json.exitCode,0,json.stdout);assert.equal(readable.exitCode,0,readable.stdout);assert.deepEqual(JSON.parse(json.stdout),json.outcome);assert.deepEqual(json.outcome,readable.outcome);assert(readable.stdout.includes(JSON.stringify(json.outcome.recovery)));
 assert.equal(json.outcome.recovery.package_verified,false);assert.equal(json.outcome.recovery.original.binding.configuration_digest,f.receipt.binding.configuration_digest);assert.equal(json.outcome.recovery.desired.configuration_digest,digest);assert.equal(json.outcome.recovery.observed.configuration_digest,digest);assert.equal(json.outcome.recovery.applied.configuration_digest,f.receipt.binding.configuration_digest);assert.equal(json.outcome.data.controls_match,false);
 const before=f.provider.records().find(r=>r.kind==='installation'),stopped=await stopInstallation(input,f.dependencies);assert.equal(stopped.status,'stopped',JSON.stringify(stopped));assert.equal(stopped.recovery.observed_scope,'before_stop');assert.equal(stopped.recovery.observed.schedule_state,'ENABLED');assert.equal(stopped.recovery.observed.concurrency,1);assert.equal(f.cloud.schedule.State,'DISABLED');assert.equal(f.cloud.concurrency,0);
 const after=f.provider.records().find(r=>r.kind==='installation');assert.equal(after.revision,before.revision+1);assert.equal(after.configuration_digest,before.configuration_digest);assert.equal(after.package_revision,before.package_revision);assert.deepEqual(after.extensions,before.extensions);assert.equal(after.installation_generation,before.installation_generation);assert.equal(after.schedule_enabled,false);assert.equal(after.writes_enabled,false);assert.equal(after.maintenance,true);assert.deepEqual(f.provider.records().filter(r=>r.kind!=='installation'),retained);
 assert.equal(fs.readFileSync(f.installationPath,'utf8'),originalReceipt);assert.equal(hostConfig(fs.readFileSync(f.configPath,'utf8')).digest,digest);assert(!f.audit.slice(recoveryStart).some(a=>['ExecuteChangeSetCommand','CreateChangeSetCommand','PutItemCommand'].includes(a.action)));assert.equal(f.audit.filter(a=>a.action==='ExecuteChangeSetCommand').length,1);
 return {outcome,normal,json,readable,stopped,before,after,retained,audit:f.audit,original_receipt:f.receipt,desired_digest:digest,cleanup:'disposable fixture removed'};
 }finally{f.cleanup();}}
export async function publicationJourney(){const observations=[];
 for(const json of [true,false]){const f=await preparedCloud();try{
 const {input}=await prepareControls(f),output=path.join(f.directory,'new-receipt.json'),original=fs.readFileSync(f.installationPath,'utf8'),args=['configure','--config',input.configPath,'--installation',input.installationPath,'--manifest',input.manifestPath,'--asset',input.assetPath,'--operator-profile','operator','--deployer-profile','deployer','--output',output,...(json?['--json']:[])];
 fs.writeFileSync(output,'existing receipt');const audit=f.audit.length,refused=await runInstallationCommand(args,f.dependencies);assert.equal(refused.exitCode,2);assert.equal(refused.outcome.code,'OUTPUT_RESERVATION_FAILED');assert.equal(f.audit.length,audit);assert.equal(fs.readFileSync(output,'utf8'),'existing receipt');fs.unlinkSync(output);
 let privateMode;const failed=await runInstallationCommand(args,{...f.dependencies,fileOperations:{fsyncSync:fd=>{privateMode=fs.fstatSync(fd).mode&0o777;throw Object.assign(new Error('dummy storage full'),{code:'ENOSPC'});}}});
 assert.equal(privateMode,0o600);assert.equal(failed.exitCode,1,failed.stdout);assert.equal(failed.outcome.status,'configured');assert.equal(failed.outcome.phase,'commit_controls');assert.equal(failed.outcome.receipt_publication,'failed');assert.equal(failed.outcome.publication_code,'RECEIPT_PUBLICATION_FAILED');assert.equal(failed.outcome.receipt.schema,'pigboard-installation-receipt/v1');assert.deepEqual(failed.outcome.applied.configuration_digest,failed.outcome.receipt.binding.configuration_digest);assert.equal(f.cloud.schedule.State,'ENABLED');assert.equal(fs.readFileSync(f.installationPath,'utf8'),original);assert.equal(f.audit.filter(a=>a.action==='ExecuteChangeSetCommand').length,1);assert.equal(fs.existsSync(output),false);assert.deepEqual(JSON.parse(json?failed.stdout:failed.stdout.slice('configured: '.length)),failed.outcome);assert(!failed.stdout.includes('dummy storage full'));
 // The emitted complete receipt is usable without a second configure dispatch.
 fs.writeFileSync(output,JSON.stringify(failed.outcome.receipt),{mode:0o600});const inspected=await f.resolve({...input,installationPath:output,purpose:'inspect'});inspected.dispose();assert.equal(f.audit.filter(a=>a.action==='ExecuteChangeSetCommand').length,1);
 observations.push({format:json?'json':'readable',refused,failed,audit:f.audit,cleanup:'disposable fixture removed'});
 }finally{f.cleanup();}}
 return observations;
}
export function snapshotPackage({config=hostFixture().config,lifecycle=false}={}){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pigboard-pinned-')),source=path.join(temp,'source');
 const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
 const cleanup=()=>fs.rmSync(temp,{recursive:true,force:true});
 try{
  const source_parent=git(root,'rev-parse','HEAD');
  const source_dirty=git(root,'status','--porcelain','--untracked-files=normal');
  const exactCheckout=lifecycle&&source_dirty.length===0;
  if(exactCheckout){
   git(root,'clone','--quiet','--shared','--no-checkout','--',root,source);
   git(source,'checkout','--quiet','--detach',source_parent);
  }else{
   fs.mkdirSync(source);
   const tracked=git(root,'ls-files','--cached','--others','--exclude-standard').split('\n');
   for(const file of tracked){
    if(!file||!fs.existsSync(path.join(root,file)))continue;
    fs.mkdirSync(path.dirname(path.join(source,file)),{recursive:true});
    fs.cpSync(path.join(root,file),path.join(source,file));
   }
  }
  for(const file of ['node_modules','runtime/aws/node_modules']){
   fs.cpSync(path.join(root,file),path.join(source,file),{recursive:true});
  }
  if(!exactCheckout){
   git(source,'init','-q');
   git(source,'add','.');
   git(source,'-c','user.name=Pigboard Fixture','-c','user.email=fixture@example.invalid','commit','-qm','Disposable exact working source snapshot');
  }
  const revision=git(source,'rev-parse','HEAD'),tree=git(source,'rev-parse','HEAD^{tree}');
  if(exactCheckout){
   assert.equal(revision,source_parent);
   assert.equal(tree,git(root,'rev-parse',source_parent+'^{tree}'));
  }
  const configPath=writeFixtureJSON(temp,'config',config);
  const built=packageManager({configPath,output:path.join(temp,'build'),source,revision,lifecycle});
  return {...built,temp,source,snapshot_revision:revision,snapshot_tree:tree,source_parent,source_dirty,cleanup};
 }catch(error){cleanup();throw error;}
}
// Evaluate the generated statement set for concrete fixture requests, including
// transaction context as DynamoDB evaluates it per item.
export function policyPermits(policy, action, resource, { enclosing, leadingKeys } = {}) {
 const glob = (pattern, value, insensitive = false) => typeof pattern === 'string' &&
  new RegExp('^'+pattern.split('*').map(piece=>piece.replace(/[-/\\^$+?.()|[\]{}]/g,'\\$&')).join('.*')+'$', insensitive?'i':'').test(value);
 const context = {'dynamodb:EnclosingOperation': enclosing ? [enclosing] : [], 'dynamodb:LeadingKeys': leadingKeys??[]};
 const conditions = (condition = {}) => Object.entries(condition).every(([rule, terms]) => Object.entries(terms).every(([key, allowed]) => {
  const actual = context[key]??[], choices = [allowed].flat();
  if (rule==='Null') return choices.includes(String(actual.length===0));
  if (rule==='ForAllValues:StringEquals') return actual.every(value=>choices.includes(value));
  if (rule==='ForAnyValue:StringEquals'||rule==='StringEquals') return actual.some(value=>choices.includes(value));
  return false;
 }));
 const matches = policy.Statement.filter(s=>[s.Action].flat().some(pattern=>glob(pattern,action,true))&&
   [s.Resource].flat().some(pattern=>glob(pattern,resource))&&conditions(s.Condition));
 return matches.some(s=>s.Effect==='Allow')&&!matches.some(s=>s.Effect==='Deny');
}

export function templateJourney(){
 const baseline=fixtureCloud(),f=fixtureCloud(baseline.config,{}, {...baseline.manifest,sender:true}),template=synthesizeTemplate(JSON.stringify(f.config),f.manifest),r=template.Resources,operator=template.Metadata.Pigboard.operator_policy,runtime=r.RuntimeRole.Properties.Policies[0].PolicyDocument;
 assert.equal(r.Schedule.Properties.State,'DISABLED');assert.equal(template.Parameters.QuiescenceConcurrency.Default,1);assert.equal(r.AsyncInvocation.Properties.Qualifier,'$LATEST');assert.equal(r.AsyncInvocation.Properties.MaximumRetryAttempts,0);assert.equal(r.AsyncInvocation.Properties.MaximumEventAgeInSeconds,60);assert.equal(r.Schedule.Properties.Target.RetryPolicy.MaximumRetryAttempts,0);assert.equal(r.Schedule.Properties.Target.RetryPolicy.MaximumEventAgeInSeconds,60);assert.equal(r.StateTable.DeletionPolicy,'Retain');assert.equal(r.StateTable.UpdateReplacePolicy,'Retain');assert.equal(r.LogGroup.Properties.RetentionInDays,14);
 const permits=policyPermits,table=f.binding.table_arn,other=table+'-unrelated',checks=[];
 const normal='installation#'+f.binding.installation_id,protectedKey='operator-decision#'+f.binding.installation_id;
 const transact=leadingKeys=>({enclosing:'TransactWriteItems',leadingKeys});
 const check=(role,policy,action,resource,context,expected)=>{
  assert.equal(permits(policy,action,resource,context),expected,JSON.stringify({role,action,resource,context}));
  checks.push({role,action,resource,context,allowed:expected});
 };
 for(const action of ['dynamodb:GetItem','dynamodb:Query','dynamodb:DescribeTable','dynamodb:Scan']){
  check('operator',operator,action,table,undefined,true);
  check('operator',operator,action,other,undefined,false);
 }
 for(const action of ['dynamodb:PutItem','dynamodb:UpdateItem','dynamodb:ConditionCheckItem','dynamodb:DeleteItem']){
  const operatorNormal=['dynamodb:PutItem','dynamodb:UpdateItem'].includes(action);
  const runtimeNormal=action!=='dynamodb:DeleteItem';
  for(const [role,policy,normalAllowed,protectedAllowed] of [
   ['operator',operator,operatorNormal,action==='dynamodb:PutItem'],['runtime',runtime,runtimeNormal,false]
  ]){
   check(role,policy,action,table,transact([normal]),normalAllowed);
   check(role,policy,action,table,transact([protectedKey]),protectedAllowed);
   for(const keys of [undefined,[],['installation#unrelated'],[normal,'installation#unrelated']]){
    check(role,policy,action,table,transact(keys),false);
   }
   check(role,policy,action,table,{leadingKeys:[protectedKey]},false);
   check(role,policy,action,table,{leadingKeys:[normal]},false);
   check(role,policy,action,other,transact([normal]),false);
  }
 }
 for(const action of ['dynamodb:GetItem','dynamodb:Query']){
  check('runtime',runtime,action,table,{leadingKeys:[normal]},true);
  check('runtime',runtime,action,table,{leadingKeys:[protectedKey]},false);
  check('runtime',runtime,action,table,undefined,false);
  check('runtime',runtime,action,other,{leadingKeys:[normal]},false);
 }
 check('runtime',runtime,'dynamodb:GetItem',table,{enclosing:'TransactGetItems',leadingKeys:[normal]},true);
 check('runtime',runtime,'dynamodb:DescribeTable',table,undefined,true);
 check('runtime',runtime,'dynamodb:Scan',table,undefined,false);
 assert(permits(runtime,'secretsmanager:GetSecretValue',f.config.jira.connection.secret_reference));assert(!permits(runtime,'secretsmanager:GetSecretValue',f.config.jira.connection.secret_reference+'unrelated'));assert(!JSON.stringify(template).includes('DeleteItem'));assert(!JSON.stringify(operator).includes('ExecuteChangeSet'));assert(!Object.values(r).some(v=>['AWS::Lambda::Url','AWS::ApiGateway::RestApi'].includes(v.Type)));
 const action='lambda:GetFunctionEventInvokeConfig',functionArn=f.cloud.function.FunctionArn,latest=functionArn+':$LATEST',scheduler=r.SchedulerRole.Properties.Policies[0].PolicyDocument,deployer=template.Metadata.Pigboard.configure_deployer_policy;
 const read=operator.Statement.filter(s=>[s.Action].flat().includes(action));assert.equal(read.length,1);assert.deepEqual(read[0],{Effect:'Allow',Action:action,Resource:latest});
 for(const resource of [latest,functionArn,functionArn+'-other:$LATEST',functionArn+':1']){const allowed=resource===latest;assert.equal(permits(operator,action,resource),allowed);checks.push({role:'operator',action,resource,allowed});}
 for(const [role,policy] of [['runtime',runtime],['scheduler',scheduler],['deployer',deployer]]){assert(!permits(policy,action,latest));checks.push({role,action,resource:latest,allowed:false});}
 for(const mutation of ['lambda:InvokeFunction','lambda:PutFunctionConcurrency','lambda:UpdateFunctionCode','lambda:UpdateFunctionConfiguration']){assert(!permits(operator,mutation,latest));assert(!permits(deployer,mutation,latest));}
 return {template,checks,installed_iam:'unverified'};
}
export async function runHumanCase(id){if(id==='R1-13-H01'){if(Number(process.versions.node.split('.')[0])!==24)throw Error('SETUP: invoke this copied runtime acceptance packet with prepared Node24');const built=snapshotPackage({config:ordinaryWireFixture().config});try{return {package_manifest:built.manifest,snapshot_revision:built.snapshot_revision,snapshot_tree:built.snapshot_tree,source_parent:built.source_parent,source_dirty:built.source_dirty,node:process.version,resolver:await resolverJourney(),copied_wrapper:await wrapperJourney({snapshotSource:built.source,snapshotRevision:built.snapshot_revision,buildDirectory:built.temp,baselineBuild:built})};}finally{built.cleanup();}}if(id==='R1-13-H02')return {node:process.version,template:templateJourney(),resolver:await resolverJourney(),stop:await stopJourney(),configure:await configureJourney(),partial:await configureJourney({partial:true}),late_recovery:await lateRecoveryJourney(),publication:await publicationJourney()};throw Error('Select R1-13-H01 or R1-13-H02');}
const legacyCases=['R1-13-H01','R1-13-H02'];
const lifecycleCases=['R1-16-H01','R1-16-H02'];
async function main(argv){
 if(argv.length===1&&argv[0]==='--help'){
  console.log('Usage: node scripts/test-aws-manager.mjs --case '+[...legacyCases,...lifecycleCases].join('|')+' --output NEW_DIRECTORY');
  console.log('       node scripts/test-aws-manager.mjs --all --output NEW_DIRECTORY');
  return;
 }
 const args={};
 for(let i=0;i<argv.length;i++){
  if(!['--all','--case','--output'].includes(argv[i])||Object.hasOwn(args,argv[i]))throw Error('Use the prescribed flags once.');
  const flag=argv[i];
  if(flag!=='--all'&&(!argv[i+1]||argv[i+1].startsWith('--')))throw Error('Missing flag value.');
  args[flag]=flag==='--all'?true:argv[++i];
 }
 if(!args['--output']||!!args['--all']===!!args['--case'])throw Error('Select one case or --all and new output.');
 if(args['--case']&&![...legacyCases,...lifecycleCases].includes(args['--case']))throw Error('Select a listed case.');
 const output=path.resolve(args['--output']);
 fs.mkdirSync(output,{mode:0o700});
 for(const id of args['--all']?legacyCases:[args['--case']]){
  const write=data=>fs.writeFileSync(path.join(output,id+'.json'),JSON.stringify({
   human_acceptance:'pending',installed_acceptance:'pending',live_iam:'unverified',command:process.argv,...data
  },null,2)+'\n',{mode:0o600});
  try{
   const evidence=lifecycleCases.includes(id)?await runLifecycleFixture(id):await runHumanCase(id);
   write({developer_observation:'confirmed_simulated',cleanup:'disposable fixtures removed',evidence});
   console.log(id+': developer simulation confirmed; human and installed acceptance pending');
  }catch(error){
   write({developer_observation:'blocked',blocker:error.message,evidence:error.fixtureEvidence??null,
     cleanup:'completed fixture paths are disposable'});
   throw error;
  }
 }
}

export async function lifecycleBirthJourney({config=hostFixture().config}={}){
 const source=snapshotPackage({config,lifecycle:true});
 const f=fixtureCloud(config,{},source.manifest);
 const evidence = {source:snapshotRefForFixture(source),node:process.version,commands:[],waits:[]};
 const installPath=path.join(source.temp,'original-receipt.json');
 const configPath=path.join(source.temp,'config.json');
 let clock=Date.parse('2026-11-17T10:00:00Z'),monotonic=0;
 const dependencies={...f.dependencies,now:()=>new Date(clock).toISOString(),monotonic:()=>monotonic,
   wait:async ms=>{evidence.waits.push(ms);clock+=ms;monotonic+=ms;}};
 const host=(args,branch=f)=>capture('manager-installation.mjs',args,
  ()=>runInstallationCommand(args,branch===f?dependencies:branch.dependencies),branch);
 const state=args=>capture('manager-state.mjs',args,()=>runStateCommand(args,{resolveInstallation:input=>resolveInstallation(input,dependencies)}));
 async function capture(script,args,run,branch=f){
   const before=branch.provider.snapshot(),start=branch.audit.length;
   const command=['node','scripts/'+script,...args];
   const record={command,state_before:JSON.parse(before),...(branch===f?{}:{isolated_branch:branch.name})};
   evidence.commands.push(record);
   try{
    const outcome=await run();
    Object.assign(record,outcome);
    return outcome;
   }finally{
    record.state_after=JSON.parse(branch.provider.snapshot());
    record.aws=branch.audit.slice(start);
   }
 }
 try{
   const flags=['--config',configPath,'--operator-profile','operator'],manifestPath=path.join(source.output,'manifest.json');
   const bound=await host(['bind',...flags,'--manifest',manifestPath,'--stack',f.stackId,'--output',installPath,'--json']);
   assert.equal(bound.exitCode,0,JSON.stringify(bound));
   const original=JSON.parse(fs.readFileSync(installPath));
   assert.equal(original.origin.table_id,f.cloud.table.TableId);
   const initialized=await state(['init',...flags,'--installation',installPath,'--json']);
   assert.equal(initialized.exitCode,0,initialized.stdout);
   const outputs=path.join(source.temp,'bootstrap-receipt.json');
   const bootstrapped=await host(['bootstrap',...flags,'--installation',installPath,'--deployer-profile','deployer','--output',outputs,'--json']);
   assert.equal(bootstrapped.exitCode,0,JSON.stringify(bootstrapped));
   const observed=await state(['inspect',...flags,'--installation',outputs,'--kind','installation','--record-id',config.manager.installation_id,'--json']);
   assert.equal(observed.exitCode,0,observed.stdout);
   assert.equal(f.cloud.function.Environment.Variables[LIFECYCLE_TABLE_ID_ENV],original.origin.table_id);
   assert.equal(f.cloud.schedule.State,'DISABLED');
   assert.equal(f.cloud.concurrency,0);
   assert.equal(f.audit.filter(row=>row.action==='ExecuteChangeSetCommand').length,1);
   return {source,f,evidence,dependencies,host,state,flags,original,installationPath:outputs,configPath};
 }catch(error){source.cleanup();error.fixtureEvidence=evidence;throw error;}
}
function snapshotRefForFixture(source){
 return {snapshot_revision:source.snapshot_revision,snapshot_tree:source.snapshot_tree,source_parent:source.source_parent,source_dirty:source.source_dirty};
}

function requireStatus(result,status){
 assert.equal(result.outcome.status,status,result.stdout);
 return result.outcome;
}
const writeFixtureJSON=(directory,name,data)=>{
 const file=path.join(directory,name+'.json');
 fs.writeFileSync(file,JSON.stringify(data));
 return file;
};
const changedControls=(config,changes)=>{
 const changed=structuredClone(config);
 Object.assign(changed.manager.controls,changes);
 return changed;
};
const hostMutations=rows=>rows.filter(row=>/^(Update|PutFunction|Create|Execute|Delete)/.test(row.action));
const businessRows=f=>JSON.parse(f.provider.snapshot()).filter(([,row])=>/^[SMAN]#/.test(row.SK));
const operationRow=(f,id)=>[...f.provider.rows.values()].find(row=>row.owner?.id===id&&row.terminal);

function lifecycleDriver(journey){
 const {source,f,host}=journey;
 const output=name=>path.join(source.temp,name+'.json');
 const initial={configPath:journey.configPath,installationPath:journey.installationPath,manifest:source.manifest};
 const previousPins=new Map();
 const currentRevision=()=>execFileSync('git',['rev-parse','HEAD'],{cwd:source.source,encoding:'utf8'}).trim();
 function nextPin(){
  execFileSync('git',['-c','user.name=Pigboard Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-qm','Disposable compatible successor pin'],{cwd:source.source});
  return currentRevision();
 }
 function build(name,config,{revision=currentRevision(),compatibleFrom}={}){
  if(compatibleFrom)previousPins.set(revision,compatibleFrom);
  const configPath=writeFixtureJSON(source.temp,name+'-config',config);
  const {manifest,output}=packageManager({configPath,output:path.join(source.temp,name+'-build'),source:source.source,
    revision,generation:source.manifest.installation_generation,lifecycle:true,compatibleFrom:previousPins.get(revision)});
  const asset={bucket:'fixture-artifacts',key:name+'.zip',version:name+'-version',zip_digest:manifest.zip_digest};
  f.cloud.assets??=new Map();
  f.cloud.assets.set(asset.version,Buffer.from(asset.zip_digest.slice(7),'hex').toString('base64'));
  return {configPath,manifest,manifestPath:path.join(output,'manifest.json'),assetPath:writeFixtureJSON(source.temp,name+'-asset',asset)};
 }
 const context=(installed,configPath=installed.configPath)=>['--config',configPath,'--installation',installed.installationPath,'--operator-profile','operator'];
 const assetFlags=target=>['--manifest',target.manifestPath,'--asset',target.assetPath];
 const deployment=['--deployer-profile','deployer'];
 const run=(verb,installed,extra=[],{configPath,human=false,branch}={})=>
  host([verb,...context(installed,configPath),...extra,...(human?[]:['--json'])],branch);
 async function configure(installed,target,name){
  const installationPath=output(name);
  requireStatus(await run('configure',installed,[...assetFlags(target),...deployment,'--output',installationPath],
    {configPath:target.configPath}),'configured');
  return {...target,installationPath};
 }
 return {initial,output,build,nextPin,run,configure,assetFlags,deployment};
}

async function removalJourney(journey){
 const {f,evidence,dependencies}=journey;
 const driver=lifecycleDriver(journey),{initial,run,configure,output,deployment,build}=driver;
 const config=initial.manifest.canonical_config;
 const enabled=await configure(initial,build('removal-enabled',changedControls(config,{schedule_enabled:true})), 'removal-enabled-receipt');
 assert.equal(f.cloud.schedule.State,'ENABLED');
 // No provider cancellation is modeled. The active invocation ages through
 // the same Lambda/Scheduler bounds used by the production stop producer.
 f.cloud.activeInvocation=true;
 const wait=dependencies.wait;
 dependencies.wait=async ms=>{await wait(ms);if(ms>=f.cloud.function.Timeout*1000)f.cloud.activeInvocation=false;};
 const beforeUnverified=f.provider.snapshot();
 const tableIdBefore=f.cloud.table.TableId;
 f.cloud.table.TableId=hostFixture().lifecycle.restored_table_id;
 try{
  const rejected=await run('stop',enabled);
  assert.equal(rejected.outcome.state_fenced,'unconfirmed',rejected.stdout);
  assert.equal(rejected.outcome.code,'PHYSICAL_STATE_MISMATCH');
  assert.equal(f.provider.snapshot(),beforeUnverified);
 }finally{f.cloud.table.TableId=tableIdBefore;}
 f.cloud.fail='GetScheduleCommand';
 let schedulerUnavailable;
 try{schedulerUnavailable=await run('stop',enabled);}finally{delete f.cloud.fail;}
 assert.equal(schedulerUnavailable.outcome.status,'partial',schedulerUnavailable.stdout);
 assert.equal(schedulerUnavailable.outcome.state_fenced,'confirmed');
 assert.equal(f.cloud.schedule.State,'ENABLED','Remote scheduler may still be active when unavailable');
 const superseding=await run('stop',enabled);
 assert.equal(superseding.outcome.code,'HOST_OWNER_ACTIVE',superseding.stdout);
 const abandoned=await run('finish-operation',enabled,['--operation',schedulerUnavailable.outcome.operation,'--output',output('unissued-stop')]);
 assert.equal(abandoned.outcome.status,'superseded',abandoned.stdout);
 const protective=requireStatus(await run('stop',enabled),'stopped');
 assert.equal(protective.proof,false);
 assert.equal(f.cloud.schedule.State,'DISABLED');
 assert.equal(f.cloud.concurrency,0);
 const maintenance=await configure(enabled,build('removal-maintenance',changedControls(config,{maintenance:true})), 'removal-maintenance-receipt');
 const {assetFlags}=driver;
 f.cloud.beforeExecute=async id=>{
  const before=f.audit.length;
  const emergency=await run('stop',maintenance);
  assert.equal(emergency.outcome.code,'HOST_OWNER_ACTIVE',emergency.stdout);
  assert.equal(hostMutations(f.audit.slice(before)).length,0);
  const named=['--operation',id];
  const held=requireStatus(await run('inspect-operation',maintenance,named),'inspected');
  assert.equal(held.outcome,'held');
  assert(held.effects.some(effect=>effect.name==='execute-change-set'&&effect.state==='claimed'));
  const unfinished=await run('finish-operation',maintenance,[...named,'--manifest',maintenance.manifestPath,
    '--target-config',maintenance.configPath,'--output',output('paused-owner-finish')]);
  assert.equal(unfinished.outcome.code,'PROVIDER_TERMINAL_UNCONFIRMED',unfinished.stdout);
  assert.equal(hostMutations(f.audit.slice(before)).length,0);
 };
 let incumbent;
 try{
  incumbent=await run('configure',maintenance,[...assetFlags(maintenance),...deployment,'--output',output('paused-owner')]);
 }finally{delete f.cloud.beforeExecute;}
 assert.equal(incumbent.outcome.status,'partial',incumbent.stdout);
 const finishConfigure=await run('finish-operation',maintenance,['--operation',incumbent.outcome.operation,
   '--manifest',maintenance.manifestPath,'--target-config',maintenance.configPath,'--output',output('settled-owner')]);
 assert.equal(finishConfigure.outcome.status,'superseded',finishConfigure.stdout);
 f.cloud.activeInvocation=true;
 const drained=requireStatus(await run('stop',maintenance),'stopped');
 assert.equal(drained.proof,true);
 assert.equal(f.cloud.activeInvocation,false);
 assert(drained.stop.pb_stop_elapsed_ms>=drained.stop.pb_stop_window_ms);
 const preview=output('removal-preview');
 const before=f.provider.snapshot();
 f.cloud.template.Resources.StateTable.DeletionPolicy='Delete';
 const badRetention=await run('remove-preview',maintenance,['--output',output('bad-retention')]);
 assert.equal(badRetention.outcome.code,'RETENTION_UNVERIFIED',badRetention.stdout);
 f.cloud.template.Resources.StateTable.DeletionPolicy='Retain';
 requireStatus(await run('remove-preview',maintenance,['--output',preview]),'previewed');
 assert.equal(f.provider.snapshot(),before);
 const inventory=JSON.parse(fs.readFileSync(preview)).inventory;
 assert.equal(inventory.resources.find(row=>row.logical==='StateTable').disposition,'retained');
 assert(inventory.externally_owned.some(row=>row.cost?.includes('Secrets Manager')));
 const wrongProfile=await run('remove',maintenance,['--deployer-profile','ambient','--preview',preview,'--output',output('wrong-deployer')]);
 assert.equal(wrongProfile.outcome.code,'IDENTITY_MISMATCH',wrongProfile.stdout);
 assert.equal(f.provider.snapshot(),before);
 const completeBranch=fixtureCloud(maintenance.manifest.canonical_config,structuredClone(f.cloud),maintenance.manifest);
 completeBranch.name='complete provider deletion';
 completeBranch.provider.rows=new Map(JSON.parse(before));
 const completeFile=output('complete-removal');
 const complete=requireStatus(await run('remove',maintenance,[...deployment,'--preview',preview,'--output',completeFile],
   {branch:completeBranch}),'removed');
 assert.equal(complete.terminal.retention_complete,true);
 assert(complete.terminal.resources.every(resource=>resource.disposition===resource.observation));
 assert.equal(completeBranch.cloud.table.TableId,f.cloud.table.TableId);
 assert.equal(completeBranch.audit.filter(row=>row.action==='DeleteStackCommand'&&row.identity==='SELECTED_DEPLOYER').length,1);
 const start=f.audit.length,tableId=f.cloud.table.TableId;
 f.cloud.omitDeleteEvent='LogGroup';
 // Model the operator losing the first response after CloudFormation completed.
 // The concurrent emergency may fence State while this owner is held.
 dependencies.beforeLifecycleFinish=async()=>{
  const auditStart=f.audit.length;
  const emergency=await run('stop',maintenance);
  assert.equal(emergency.outcome.code,'HOST_OWNER_ACTIVE',emergency.stdout);
  assert.equal(hostMutations(f.audit.slice(auditStart)).length,0);
 };
 const removed=await run('remove',maintenance,[...deployment,'--preview',preview,'--output',output('remove-operation')]);
 assert.equal(removed.outcome.code,'OPERATION_SUPERSEDED',removed.stdout);
 delete dependencies.beforeLifecycleFinish;
 const id=removed.outcome.operation, named=['--operation',id];
 const inspect1=requireStatus(await run('inspect-operation',maintenance,named),'inspected');
 const inspect2=requireStatus(await run('inspect-operation',maintenance,named),'inspected');
 assert.deepEqual(inspect1,inspect2);
 assert.equal(inspect1.outcome,'awaiting_finish');
 const finish=await run('finish-operation',maintenance,[...named,'--output',output('removal-report')]);
 assert.equal(finish.outcome.outcome,'superseded',finish.stdout);
 const terminal=finish.outcome.terminal;
 assert.equal(terminal.resources.find(row=>row.logical==='StateTable').observation,'retained');
 const unknownLog=terminal.resources.find(row=>row.logical==='LogGroup');
 assert.equal(unknownLog.observation,'unobservable');
 assert.match(unknownLog.cost,/CloudWatch Logs storage/i);
 assert.equal(terminal.retention_complete,false);
 assert.equal(f.cloud.table.TableId,tableId);
 const read1=requireStatus(await run('inspect-operation',maintenance,named,{human:true}),'inspected');
 const read2=requireStatus(await run('inspect-operation',maintenance,named),'inspected');
 assert.deepEqual(read1,read2);
 assert.deepEqual(read2.terminal,terminal);
 assert.deepEqual(read2.original_operator,inspect1.original_operator);
 assert.deepEqual(read2.original_deployer,inspect1.original_deployer);
 assert.equal(operationRow(f,id)?.outcome,'superseded');
 const deletes=f.audit.slice(start).filter(row=>row.action==='DeleteStackCommand');
 assert.equal(deletes.length,1);
 assert.equal(deletes[0].identity,'SELECTED_DEPLOYER');
 assert.equal(deletes[0].input.ClientRequestToken,id);
 evidence.removal={inventory,complete:complete.terminal,terminal,table_id:tableId};
}

export async function runLifecycleFixture(id){
 assert(['R1-16-H01','R1-16-H02'].includes(id));
 const config=id==='R1-16-H01'?(await import('./test-manager-apply.mjs')).lifecycleSenderConfig():hostFixture().config;
 const journey=await lifecycleBirthJourney({config});
 const {source,evidence}=journey;
 try{
  if(id==='R1-16-H02')await removalJourney(journey);
  else await upgradeJourney(journey);
  return evidence;
 }catch(error){error.fixtureEvidence=evidence;throw error;}
 finally{source.cleanup();}
}

async function upgradeJourney(journey){
 const {lifecycleSenderConfig,runLifecycleSender}=await import('./test-manager-apply.mjs');
 const {f,source,evidence,state,dependencies}=journey;
 const {initial,run,configure,output,deployment,build,nextPin,assetFlags}=lifecycleDriver(journey);
 const enabledConfig=lifecycleSenderConfig({disabled:false});
 const original=await configure(initial,build('sender-enabled',enabledConfig),'sender-original-receipt');
 const maintenanceConfig=changedControls(enabledConfig,{schedule_enabled:false,writes_enabled:false,maintenance:true});
 const oldMaintenance=build('old-incompatible-maintenance',maintenanceConfig);
 const firstSuccessor=build('compatible-successor',enabledConfig,{revision:nextPin(),compatibleFrom:original.manifest.source_revision});
 const sender=await runLifecycleSender({...f,binding:JSON.parse(fs.readFileSync(original.installationPath)).binding,dependencies},
   original.manifest,async({provider,attemptId})=>{
    const work=businessRows(f), retained=work.map(([,row])=>row);
    assert(retained.some(row=>row.kind==='member'));
    assert(retained.some(row=>row.kind==='attempt'&&row.attempt_id===attemptId&&row.outcome==='pending'));
    assert(retained.some(row=>row.SK==='N#'+attemptId));
    const confirmedPreview=output('compatible-preview'), confirmedPath=output('compatible-receipt');
    const before=f.provider.snapshot();
    requireStatus(await run('upgrade-preview',original,[...assetFlags(firstSuccessor),'--output',confirmedPreview]),'previewed');
    assert.equal(f.provider.snapshot(),before);
    const normalStart=f.audit.length;
    requireStatus(await run('upgrade',original,[...assetFlags(firstSuccessor),...deployment,
      '--preview',confirmedPreview,'--output',confirmedPath]),'upgraded');
    assert.equal(f.audit.slice(normalStart).filter(row=>row.action==='ExecuteChangeSetCommand').length,1);
    assert.deepEqual(businessRows(f),work);
    const regularReceipt=JSON.parse(fs.readFileSync(confirmedPath));
    const attemptReceipt=JSON.parse(fs.readFileSync(original.installationPath));
    assert.deepEqual(regularReceipt.manifest.canonical_config,attemptReceipt.manifest.canonical_config);
    assert.equal(regularReceipt.origin.table_id,attemptReceipt.origin.table_id);
    assert.equal(regularReceipt.binding.package_revision,firstSuccessor.manifest.source_revision);
    assert.equal(regularReceipt.recovery_only,undefined);
    const prior={...firstSuccessor,installationPath:confirmedPath};
    const successor=build('interrupted-successor',enabledConfig,{revision:nextPin(),compatibleFrom:prior.manifest.source_revision});
    const preview=output('upgrade-preview');
    const beforeInterrupted=f.provider.snapshot();
    requireStatus(await run('upgrade-preview',prior,[...assetFlags(successor),'--output',preview]),'previewed');
    assert.equal(f.provider.snapshot(),beforeInterrupted);
    const changeStart=f.audit.length;
    const upgradedFile=output('upgraded');
    // Simulate a local process interruption after the actual provider's
    // terminal update event, before its operation can be committed to State.
    dependencies.beforeLifecycleFinish=async()=>{
     const start=f.audit.length;
     const emergency=await run('stop',prior);
     assert.equal(emergency.outcome.code,'HOST_OWNER_ACTIVE',emergency.stdout);
     assert.equal(hostMutations(f.audit.slice(start)).length,0);
    };
    const interrupted=await run('upgrade',prior,[...assetFlags(successor),...deployment,'--preview',preview,'--output',upgradedFile]);
    delete dependencies.beforeLifecycleFinish;
    assert.equal(interrupted.outcome.status,'partial',interrupted.stdout);
    assert.equal(interrupted.outcome.receipt_publication,'operation_record_preserved');
    const id=interrupted.outcome.operation,named=['--operation',id];
    const first=requireStatus(await run('inspect-operation',prior,named),'inspected');
    const second=requireStatus(await run('inspect-operation',prior,named),'inspected');
    assert.deepEqual(first,second);
    assert.equal(first.outcome,'awaiting_finish');
    const finishedFile=output('successor-receipt');
    requireStatus(await run('finish-operation',prior,[...named,'--manifest',successor.manifestPath,'--target-config',successor.configPath,
      '--output',finishedFile]),'superseded');
    const recorded=requireStatus(await run('inspect-operation',prior,named,{human:true}),'inspected');
    assert.deepEqual(requireStatus(await run('inspect-operation',prior,named),'inspected'),recorded);
    assert.equal(recorded.outcome,'superseded');
    assert.equal(recorded.terminal.status,'host_updated_admission_fenced');
    assert.deepEqual(recorded.original_operator,first.original_operator);
    assert.deepEqual(recorded.original_deployer,first.original_deployer);
    assert.equal(f.audit.slice(changeStart).filter(row=>row.action==='ExecuteChangeSetCommand').length,1);
    assert.deepEqual(businessRows(f),work);
    const upgraded={...successor,installationPath:finishedFile};
    const receipt=JSON.parse(fs.readFileSync(finishedFile));
    assert.deepEqual(receipt.manifest.canonical_config,JSON.parse(JSON.stringify(original.manifest.canonical_config)));
    assert.equal(receipt.origin.table_id,f.cloud.table.TableId);
    assert.equal(f.cloud.schedule.State,'DISABLED');
    assert.equal(f.cloud.concurrency,0);
    const denied=await run('configure',upgraded,[...assetFlags(successor),...deployment,'--output',output('recovery-enable')]);
    assert.equal(denied.outcome.code,'BINDING_MISMATCH',denied.stdout);
    const target=build('successor-maintenance',maintenanceConfig), maintenanceFile=output('successor-maintenance-receipt');
    const bridgeStart=f.audit.length;
    requireStatus(await run('maintenance-only',upgraded,['--original-installation',prior.installationPath,...named,
      '--source-manifest',successor.manifestPath,...assetFlags(target),...deployment,'--output',maintenanceFile],
      {configPath:target.configPath}),'configured');
    assert.equal(f.audit.slice(bridgeStart).some(row=>row.action==='PutFunctionConcurrencyCommand'&&row.input.ReservedConcurrentExecutions!==0),false);
    assert.deepEqual(businessRows(f),work);
    const maintenance={...target,installationPath:maintenanceFile};
    const fenced=f.provider.snapshot();
    const fork=(name,changes={})=>{
     const cloud=structuredClone(f.cloud);
     Object.assign(cloud.table,changes);
     const branch=fixtureCloud(maintenanceConfig,cloud,maintenance.manifest);
     branch.name=name;
     branch.provider.rows=new Map(JSON.parse(fenced));
     return branch;
    };
    const rollbackBranch=fork('incompatible rollback');
    const rollback=await run('upgrade-preview',maintenance,[...assetFlags(oldMaintenance),'--output',output('incompatible-rollback')],
      {branch:rollbackBranch});
    assert.equal(rollback.outcome.code,'UNSUPPORTED_UPGRADE',rollback.stdout);
    assert.equal(hostMutations(rollbackBranch.audit).length,0);
    assert.equal(rollbackBranch.provider.snapshot(),fenced);
    const restoredBranch=fork('restored physical table',{TableId:hostFixture().lifecycle.restored_table_id});
    const restored=await run('configure',maintenance,[...assetFlags(successor),...deployment,'--output',output('restored-enable')],
      {configPath:successor.configPath,branch:restoredBranch});
    assert.equal(restored.outcome.code,'PHYSICAL_STATE_MISMATCH',restored.stdout);
    assert.equal(hostMutations(restoredBranch.audit).length,0);
    assert.equal(restoredBranch.provider.snapshot(),fenced);
    assert.equal(f.provider.snapshot(),fenced);
    const unsafe=await run('configure',maintenance,[...assetFlags(successor),...deployment,'--output',output('pending-enable')],{configPath:successor.configPath});
    assert.equal(unsafe.outcome.code,'PENDING_RECONCILIATION',unsafe.stdout);
    assert.equal(f.provider.snapshot(),fenced);
    const stop=requireStatus(await run('stop',maintenance),'stopped');
    assert.equal(stop.proof,true);
    const records=provider.records();
    const decisionInput={schema:'pigboard-reconciliation-request/v1',attempt_id:attemptId,disposition:'confirmed_applied',
      expected_installation_revision:records.find(row=>row.kind==='installation').revision,
      expected_stream_revision:records.find(row=>row.kind==='stream').revision,
      expected_attempt_revision:records.find(row=>row.kind==='attempt'&&row.attempt_id===attemptId).revision};
    const request=writeFixtureJSON(source.temp,'reconciliation-request',decisionInput);
    const reconciliation=await state(['reconcile','--config',maintenance.configPath,'--installation',maintenance.installationPath,
      '--original-installation',original.installationPath,'--operator-profile','operator','--request',request,'--json']);
    assert.equal(reconciliation.exitCode,0,reconciliation.stdout);
    assert.equal(provider.records().find(row=>row.attempt_id===attemptId).outcome,'applied');
    const restarted=await configure(maintenance,successor,'restart-receipt');
    assert.equal(f.cloud.schedule.State,'ENABLED');
    assert.equal(f.cloud.concurrency,1);
    const installed=provider.records().find(row=>row.kind==='installation');
    assert.equal(installed.writes_enabled,true);
    assert.equal(installed.extensions.pb_stop_id,undefined);
    return {original_receipt:attemptReceipt,compatible_receipt:regularReceipt,recovery_receipt:receipt,
      restart_receipt:JSON.parse(fs.readFileSync(restarted.installationPath)),retained_work:work,
      deployment_changes:f.audit.slice(changeStart).filter(row=>row.action==='CreateChangeSetCommand'),decision_input:decisionInput};
   });
 evidence.sender={writes:sender.result.writes,reply:sender.sender.provider_reply,original_aws_writes:sender.sender.first_transactions,
   jira_mutations:sender.mutations,jira_reconciliation_reads:sender.sender.lifecycle_jira_reads,...sender.sender.lifecycle};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=2;});
