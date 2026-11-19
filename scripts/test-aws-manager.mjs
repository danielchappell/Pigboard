#!/usr/bin/env node
// Finite prescribed H01/H02 simulations; never accepts cloud credentials/endpoints.
import assert from 'node:assert/strict';
import canonicalize from 'canonicalize';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import {syncBuiltinESMExports} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {StateProvider,fixture as stateFixture} from '../test/helpers/state-provider.mjs';
import {recordId} from '../lib/state/contract.mjs';
import {loadHostSDK,hostConfig,sha256,installationResourceBase,bindInstallation,resolveInstallation,observeInstallation,stopInstallation,configureInstallation} from '../lib/aws/installation.mjs';
import {runStateCommand} from './manager-state.mjs';
import {runInstallationCommand} from './manager-installation.mjs';
import {runPreview} from '../lib/aws/manager-lambda.mjs';
import {packageManager} from './package-manager.mjs';
import {alarmDescriptors,alarmWindow,assertAlarmWindow,hasAlarmCapability} from '../lib/aws/alarms.mjs';
import {synthesizeTemplate,runtimeRoleProperties,installationResourceMap,lifecycleManifestFields,LIFECYCLE_TABLE_ID_ENV,LIFECYCLE_TABLE_ID_PARAMETER} from '../lib/aws/template.mjs';
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
 const descriptors=alarmDescriptors({function_name:name,account_id:a.account_id,region:a.region});
 const denied=()=>Object.assign(new Error('Fixture denied the selected AWS request'),{name:'AccessDeniedException',$metadata:{requestId:'fixture-request-id',httpStatusCode:403}});
 const resources=()=>[
   ...Object.entries(map.logical).map(([key,LogicalResourceId])=>({
   LogicalResourceId,PhysicalResourceId:map.physical[key],ResourceType:cloud.template?.Resources[LogicalResourceId]?.Type,StackId:stackId
   })),...(lifecycle?[{LogicalResourceId:'AsyncInvocation',PhysicalResourceId:name+'|$LATEST',
     ResourceType:'AWS::Lambda::EventInvokeConfig',StackId:stackId}]:[]),
   ...cloud.alarmResources
 ].filter(row=>row.LogicalResourceId!==cloud.omitStackAlarm);
 if(lifecycle){
   cloud.template??=synthesizeTemplate(JSON.stringify(config),manifest,{initial:overrides.initial!==false});
   cloud.stack.Parameters??=Object.entries({AssetBucket:'fixture-artifacts',AssetKey:'birth.zip',AssetVersion:'fixture-birth-version',[LIFECYCLE_TABLE_ID_PARAMETER]:'',QuiescenceConcurrency:'1'})
     .map(([ParameterKey,ParameterValue])=>({ParameterKey,ParameterValue}));
 }
 cloud.alarmResources??=[];
 cloud.alarms??=new Map();
 function deployAlarmResources(previousTemplate){
   cloud.alarmResources=descriptors.filter(row=>cloud.template?.Resources?.[row.logical_id]).map(row=>({
     LogicalResourceId:row.logical_id,PhysicalResourceId:row.name,ResourceType:'AWS::CloudWatch::Alarm',StackId:stackId
   }));
   cloud.stack.Outputs=[{OutputKey:'FunctionArn',OutputValue:functionArn},...descriptors.flatMap(row=>{
     const output=cloud.template?.Outputs?.[row.output_id];
     return output?[{OutputKey:row.output_id,OutputValue:output.Value}]:[];
   })];
   for(const row of descriptors){
     const definition=cloud.template?.Resources?.[row.logical_id]?.Properties;
     const prior=previousTemplate?.Resources?.[row.logical_id]?.Properties;
     if(definition&&(!prior||canonicalize(definition)!==canonicalize(prior)))putAlarm(definition,row);
     if(!definition&&prior)cloud.alarms.delete(row.name);
   }
 }
 function putAlarm(definition,row){
   const previous=cloud.alarms.get(row.name);
   const {StateValue='INSUFFICIENT_DATA',StateUpdatedTimestamp=completed}=previous??{};
   cloud.alarms.set(row.name,{...structuredClone(definition),AlarmArn:row.arn,StateValue,StateUpdatedTimestamp});
 }
 if(!Object.hasOwn(overrides,'alarmResources')&&cloud.template)deployAlarmResources();
 const terminalEvent=(token,status)=>({...stackEvent(status,new Date(dependencies.now?.()??'2026-11-17T09:00:00Z')),
   ClientRequestToken:token,EventId:status+'-'+token});
 const deployedParameters=()=>Object.fromEntries(cloud.stack.Parameters.map(({ParameterKey,ParameterValue})=>[ParameterKey,ParameterValue]));
 function effectiveParameters(request){
   const parameters=deployedParameters();
   for(const {ParameterKey,ParameterValue,UsePreviousValue} of request.Parameters){
    if(!UsePreviousValue)parameters[ParameterKey]=ParameterValue;
   }
   return parameters;
 }
 const functionChange=property=>({ResourceChange:{Action:'Modify',LogicalResourceId:map.logical.function_name,
   Replacement:'False',Details:[{Target:{Attribute:'Properties',Name:property}}]}});
 function changeSetDescription(){
   const request=cloud.changeInput;
   const envelope={StackId:stackId,ChangeSetId:cloud.changeSetId,ChangeSetName:request.ChangeSetName};
   const available=Changes=>({...envelope,Status:'CREATE_COMPLETE',ExecutionStatus:'AVAILABLE',Changes});
   if(cloud.changes!==undefined)return available(cloud.changes);
   if(cloud.compareEnablementChangeSets&&canonicalize(effectiveParameters(request))===canonicalize(deployedParameters())){
    const candidate=request.UsePreviousTemplate?cloud.template:JSON.parse(request.TemplateBody);
    if(canonicalize(candidate)===canonicalize(cloud.template))
     return {...envelope,Status:'FAILED',ExecutionStatus:'UNAVAILABLE',Changes:[]};
    const logical=map.logical.function_name;
    const candidateFunction=candidate.Resources[logical].Properties;
    const {Environment,...before}=cloud.template.Resources[logical].Properties;
    const {Environment:requestedEnvironment,...after}=candidateFunction;
    const sameOtherResources=Object.keys(candidate.Resources).length===Object.keys(cloud.template.Resources).length&&
      Object.entries(candidate.Resources).every(([key,value])=>key===logical||canonicalize(value)===canonicalize(cloud.template.Resources[key]));
    if(sameOtherResources&&canonicalize(before)===canonicalize(after)&&canonicalize(Environment)!==canonicalize(requestedEnvironment))
     return available([functionChange('Environment')]);
   }
   const changed=[functionChange(request.UsePreviousTemplate?'Environment':'Code')];
   if(!request.UsePreviousTemplate){
    const candidate=JSON.parse(request.TemplateBody);
    for(const row of descriptors){
     const before=cloud.template.Resources[row.logical_id]?.Properties,after=candidate.Resources[row.logical_id]?.Properties;
     if(!before&&after)changed.push({ResourceChange:{Action:'Add',LogicalResourceId:row.logical_id,ResourceType:'AWS::CloudWatch::Alarm'}});
     else if(before&&after&&canonicalize(before)!==canonicalize(after))changed.push({ResourceChange:{
      Action:'Modify',LogicalResourceId:row.logical_id,PhysicalResourceId:row.name,ResourceType:'AWS::CloudWatch::Alarm',Replacement:'False',
      Details:Object.keys(after).filter(key=>canonicalize(before[key]??null)!==canonicalize(after[key]??null)).map(Name=>({Target:{Attribute:'Properties',Name}}))
     }});
    }
   }
   return available(changed);
 }
 const credentials=profile=>({accessKeyId:profile==='operator'?'SELECTED_OPERATOR':profile==='deployer'?'SELECTED_DEPLOYER':'WRONG_AMBIENT',secretAccessKey:'dummy'});
 const injectedSDK={...sdk,fromIni:({profile})=>async()=>credentials(profile)};
 const makeClient=(kind,options)=>{const identity=options.credentials.accessKeyId;return {destroy:()=>destroyed.push({kind,identity}),send:async(command,sendOptions)=>{
  const n=command.constructor.name,i=command.input;audit.push({kind,identity,action:n,input:structuredClone(i)});if(cloud.fail===n)throw Object.assign(new Error('dummy denied'),{name:'AccessDeniedException'});
  if(n==='GetCallerIdentityCommand')return {Account:a.account_id,UserId:`AROAEXAMPLE:${identity==='SELECTED_OPERATOR'?(cloud.operatorSession??'fixture'):'fixture'}`,Arn:`arn:aws:sts::${a.account_id}:assumed-role/${identity==='SELECTED_OPERATOR'?'pigboard-operator':identity==='SELECTED_DEPLOYER'?'pigboard-deployer':'wrong'}/${identity==='SELECTED_OPERATOR'?(cloud.operatorSession??'fixture'):'fixture'}`};
  if(n==='ListTagsForResourceCommand'){
   assert.equal(kind,'CloudWatch');
   assert.equal(identity,'SELECTED_OPERATOR');
   assert(command instanceof sdk.CloudWatchListTagsForResourceCommand);
   const alarm=descriptors.find(row=>row.arn===i.ResourceARN);
   assert(alarm);
   assert.deepEqual(i,{ResourceARN:alarm.arn});
   const condition=cloud.alarmNameConditions?.[alarm.key]??(cloud.alarms.has(alarm.name)?'metric':'absent');
   audit.at(-1).simulated_alarm_name=condition;
   const metadata={httpStatusCode:404,requestId:'fixture-alarm-name'};
   const message='Private fixture error text';
   if(condition==='absent')throw new sdk.CloudWatchResourceNotFoundException({$metadata:metadata,message});
   if(condition==='denied')throw denied();
   if(condition==='timeout')throw Object.assign(Error(message),{name:'TimeoutError'});
   if(condition==='untyped_404')throw Object.assign(Error(message),{name:'ResourceNotFoundException',$metadata:metadata});
   if(condition==='wrong_service_404')throw new sdk.ResourceNotFoundException({$metadata:metadata,message});
   assert(['metric','composite','log','tagged'].includes(condition));
   return {Tags:condition==='tagged'?[{Key:'fixture-private-tag',Value:'fixture-private-value'}]:[]};
  }
  if(n==='DescribeAlarmsCommand'){
   assert.equal(identity,'SELECTED_OPERATOR');
   assert.deepEqual(i.AlarmTypes,['MetricAlarm']);
   assert.deepEqual(i.AlarmNames,descriptors.map(row=>row.name));
   if(cloud.denyAlarmRead)throw denied();
   return {MetricAlarms:i.AlarmNames.flatMap(name=>cloud.alarms.has(name)?[structuredClone(cloud.alarms.get(name))]:[]),
     ...(cloud.incompleteAlarmRead?{NextToken:'fixture-incomplete'}:{})};
  }
  if(['PutMetricAlarmCommand','EnableAlarmActionsCommand','DisableAlarmActionsCommand'].includes(n)){
   assert.equal(identity,'SELECTED_OPERATOR');
   const names=i.AlarmNames??[i.AlarmName];
   const selected=names.map(name=>descriptors.find(row=>row.name===name));
   assert(selected.every(row=>row&&cloud.alarmResources.some(resource=>resource.LogicalResourceId===row.logical_id)),n);
   if(n==='PutMetricAlarmCommand')assert(selected.every(row=>row.custom));
   if(n==='EnableAlarmActionsCommand')assert(selected.every(row=>!row.custom));
   if(cloud.denyAlarmMutation===n)throw denied();
   if(n==='PutMetricAlarmCommand')putAlarm(i,selected[0]);
   else for(const row of selected){
    const actual=cloud.alarms.get(row.name);
    if(actual)actual.ActionsEnabled=n==='EnableAlarmActionsCommand';
   }
   if(cloud.driftOnAlarmPut&&n==='PutMetricAlarmCommand')cloud.schedule.State=cloud.driftOnAlarmPut===true?'DISABLED':cloud.driftOnAlarmPut;
   if(Object.hasOwn(cloud,'driftConcurrencyOnAlarmPut')&&n==='PutMetricAlarmCommand')cloud.concurrency=cloud.driftConcurrencyOnAlarmPut;
   if(cloud.loseAlarmReply===n)throw Object.assign(new Error('Fixture lost the AWS response after applying it'),{name:'TimeoutError'});
   return {};
  }
  if(n==='DescribeStacksCommand')return {Stacks:cloud.hideDeletedStack&&cloud.stack.StackStatus==='DELETE_COMPLETE'?[]:[cloud.stack]};
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
  if(n==='UpdateScheduleCommand'){
   if(i.State==='DISABLED'&&cloud.rejectDisableSchedule)throw Object.assign(new Error('simulated denied Scheduler request'),{name:'AccessDeniedException'});
   cloud.schedule={...structuredClone(i),Arn:scheduleArn,GroupName:i.GroupName??'default'};
   if(i.State==='ENABLED'&&cloud.enabledScheduleExpression)cloud.schedule.ScheduleExpression=cloud.enabledScheduleExpression;
   if(i.State==='ENABLED'&&cloud.loseEnableScheduleReply)throw Object.assign(new Error('simulated lost Scheduler response'),{name:'TimeoutError'});
   return {};
  }
  if(n==='DescribeTableCommand'){
   const fault=cloud.deletionDispatched?cloud.retainedTableReadFault:undefined;
   if(fault==='denied')throw denied();
   const observed=structuredClone(cloud.describeTable?.(i)??cloud.table);
   if(fault==='substituted')observed.TableId=hostFixture().lifecycle.restored_table_id;
   return {Table:observed};
  }
  if(kind==='DynamoDBDocument'&&n==='QueryCommand'&&i.KeyConditionExpression==='PK = :pk'){
   assert(i.ConsistentRead);
   provider.audit.push({name:n,input:structuredClone(i),abortSignal:!!sendOptions?.abortSignal});
   if(cloud.incompleteInventory){
    const next=Number(i.ExclusiveStartKey?.SK??0)+1;
    return {Items:[],LastEvaluatedKey:{PK:i.ExpressionAttributeValues[':pk'],SK:String(next)}};
   }
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
   const description=changeSetDescription();
   cloud.lastChangeSetDescription=description;
   return description;
  }
  if(lifecycle&&n==='ExecuteChangeSetCommand'){
   assert.equal(identity,'SELECTED_DEPLOYER');
   assert.equal(i.StackName,stackId);
   assert.equal(i.ChangeSetName,cloud.changeSetId);
   assert.equal(i.ClientRequestToken,cloud.changeInput.ClientToken);
   await cloud.beforeExecute?.(i.ClientRequestToken);
   if(cloud.rollbackStatus){
    cloud.stack.StackStatus=cloud.rollbackStatus;
    cloud.events.unshift(terminalEvent(cloud.rollbackToken??i.ClientRequestToken,cloud.rollbackStatus));
    return {};
   }
   const {TemplateBody}=cloud.changeInput;
   const params=effectiveParameters(cloud.changeInput);
   cloud.stack.Parameters=Object.entries(params).map(([ParameterKey,ParameterValue])=>({ParameterKey,ParameterValue}));
   if(TemplateBody){
    const previousTemplate=cloud.template;
    cloud.template=JSON.parse(TemplateBody);
    deployAlarmResources(previousTemplate);
    const {Function,LifecycleSchedule}=cloud.template.Resources;
    delete cloud.function.Environment.Variables.PB_CONFIGURE_OPERATION_ID;
    Object.assign(cloud.function.Environment.Variables,Object.fromEntries(Object.entries(Function.Properties.Environment.Variables).filter(([,v])=>typeof v==='string')));
    cloud.function.Timeout=Function.Properties.Timeout;
    cloud.schedule.ScheduleExpression=LifecycleSchedule.Properties.ScheduleExpression;
    cloud.schedule.Target.Input=LifecycleSchedule.Properties.Target.Input;
    cloud.codeHash=cloud.assets?.get(params.AssetVersion)??cloud.codeHash;
   }
   cloud.function.Environment.Variables[LIFECYCLE_TABLE_ID_ENV]=params[LIFECYCLE_TABLE_ID_PARAMETER];
   cloud.concurrency=Number(params.QuiescenceConcurrency);
   cloud.schedule.State='DISABLED';
   cloud.stack.StackStatus='UPDATE_COMPLETE';
   cloud.events.unshift(terminalEvent(i.ClientRequestToken,'UPDATE_COMPLETE'));
   return {};
  }
  if(lifecycle&&n==='DeleteStackCommand'){
   assert.equal(identity,'SELECTED_DEPLOYER');
   assert.equal(i.StackName,stackId);
   const status=cloud.deleteStatus??'DELETE_COMPLETE';
   cloud.deletionDispatched=true;
   cloud.stack.StackStatus=status;
   cloud.events.unshift(terminalEvent(i.ClientRequestToken,status),...resources().flatMap(resource=>{
    const definition=cloud.template.Resources[resource.LogicalResourceId];
    return definition.DeletionPolicy==='Retain'||cloud.omitDeleteEvent===resource.LogicalResourceId?[]:
      [{...resource,ClientRequestToken:i.ClientRequestToken,ResourceStatus:'DELETE_COMPLETE'}];
   }));
   if(status==='DELETE_COMPLETE')for(const row of cloud.alarmResources){
    if(cloud.leaveAlarmAfterDelete!==row.LogicalResourceId)cloud.alarms.delete(row.PhysicalResourceId);
   }
   return {};
  }
  if(n==='CreateChangeSetCommand'){cloud.changeInput=i;return {Id:'arn:aws:cloudformation:eu-west-1:123456789012:changeSet/pigboard-controls-fixture/id'};}
  if(n==='DescribeChangeSetCommand')return {Status:'CREATE_COMPLETE',Changes:cloud.changes??[{ResourceChange:{Action:'Modify',LogicalResourceId:'Function',Replacement:'False',Details:[{Target:{Attribute:'Properties',Name:'Code'}}]}}]};
  if(n==='ExecuteChangeSetCommand'){const t=JSON.parse(cloud.changeInput.TemplateBody);cloud.function.Environment.Variables={...cloud.function.Environment.Variables,...Object.fromEntries(Object.entries(t.Resources.Function.Properties.Environment.Variables).filter(([,v])=>typeof v==='string'))};cloud.function.Timeout=t.Resources.Function.Properties.Timeout;cloud.codeHash=cloud.nextCodeHash??cloud.codeHash;cloud.stack.StackStatus='UPDATE_COMPLETE';cloud.executedToken=i.ClientRequestToken;cloud.completionReads=0;cloud.events.unshift({ClientRequestToken:i.ClientRequestToken,StackId:stackId,PhysicalResourceId:stackId,ResourceType:'AWS::CloudFormation::Stack',ResourceStatus:'UPDATE_COMPLETE'});return {};}
  if(kind==='DynamoDBDocument'){
   if(n==='TransactGetCommand'&&cloud.deletionDispatched&&cloud.denyProtectedStateAfterDelete)throw denied();
   if(n==='GetCommand'&&cloud.deletionDispatched&&cloud.faultTableAfterReadOperation&&i.Key?.SK.startsWith('O#')){
    const response=await provider.send(command,sendOptions);
    cloud.retainedTableReadFault=cloud.faultTableAfterReadOperation;
    return response;
   }
   if(n==='TransactWriteCommand'&&cloud.failCommitControls&&cloud.stack.StackStatus==='UPDATE_COMPLETE'&&cloud.schedule.State==='ENABLED'&&cloud.concurrency===1)
    throw Object.assign(new Error('dummy final commit unavailable'),{name:'TimeoutError'});
   if(n==='TransactWriteCommand'&&cloud.enablementWriteFault&&i.TransactItems.some(item=>item.Put?.Item?.SK==='CONTROL'&&item.Put.Item.owner?.verified_enablement))
    provider.fault=cloud.enablementWriteFault;
   if(n==='TransactWriteCommand'&&cloud.interruptAlarmClaim&&i.TransactItems.some(item=>item.Put?.Item?.SK==='CONTROL'&&
     item.Put.Item.owner?.effects.some(effect=>effect.name===cloud.interruptAlarmClaim&&effect.state==='claimed')))
    provider.fault='before';
   return provider.send(command,sendOptions);
  }
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
export function snapshotPackage({config=hostFixture().config,lifecycle=false,historical=false,historicalRegression=false}={}){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pigboard-pinned-')),source=path.join(temp,'source');
 const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
 const cleanup=()=>fs.rmSync(temp,{recursive:true,force:true});
 try{
  const source_parent=git(root,'rev-parse','HEAD');
  const source_dirty=git(root,'status','--porcelain','--untracked-files=normal');
  const exactCheckout=lifecycle&&source_dirty.length===0&&!historical;
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
   if(historical){
    const h=hostFixture().alarms.historical;
    const parent=execFileSync('git',['hash-object','-t','commit','-w','--stdin'],{cwd:source,input:h.commit,encoding:'utf8'}).trim();
    assert.equal(parent,h.base_revision);
    // The prepared fixture can run even in a shallow hosted checkout.
    fs.writeFileSync(path.join(source,'.git','shallow'),parent+'\n');
    const commit=git(source,'-c','user.name=Pigboard Fixture','-c','user.email=fixture@example.invalid','commit-tree',git(source,'write-tree'),'-p',parent,'-m','Disposable target with exact tested source tree');
    git(source,'update-ref','HEAD',commit);
   }else git(source,'-c','user.name=Pigboard Fixture','-c','user.email=fixture@example.invalid','commit','-qm','Disposable exact working source snapshot');
  }
  const revision=git(source,'rev-parse','HEAD'),tree=git(source,'rev-parse','HEAD^{tree}');
  if(exactCheckout){
   assert.equal(revision,source_parent);
   assert.equal(tree,git(root,'rev-parse',source_parent+'^{tree}'));
  }
  const configPath=writeFixtureJSON(temp,'config',config);
  const build=historicalRegression?legacyLifecycleFixturePackage:packageManager;
  const built=build({configPath,output:path.join(temp,'build'),source,revision,lifecycle});
  return {...built,temp,source,snapshot_revision:revision,snapshot_tree:tree,source_parent,source_dirty,historicalRegression,cleanup};
 }catch(error){cleanup();throw error;}
}

// Existing pre-alarm operation regressions drive the host with a simulated
// versioned artifact. Genuine historical adoption uses historicalPackage below.
function legacyLifecycleFixturePackage({configPath,output,revision,generation='31d20000-dead-4bad-8cad-0123456789ab',compatibleFrom}){
 const text=fs.readFileSync(configPath,'utf8'),{config,digest}=hostConfig(text);
 const {installation_id,domain_id}=config.manager;
 const payload=path.join(output,'payload');
 fs.mkdirSync(path.join(payload,'config'),{recursive:true});
 const canonical=JSON.stringify(config,null,2)+'\n';
 fs.writeFileSync(path.join(payload,'config/manager.json'),canonical);
 const manifest={...lifecycleManifestFields({installationId:installation_id,generation,previousRevision:compatibleFrom}),
   source_revision:revision,configuration_digest:digest,installation_id,domain_id,installation_generation:generation,
   runtime:'nodejs24.x',sender:true,canonical_config:config,dependency_hashes:hostFixture().alarms.historical.dependency_hashes,
   payload_hashes:{'config/manager.json':sha256(canonical)}};
 const embedded=JSON.stringify(manifest,null,2)+'\n';
 fs.writeFileSync(path.join(payload,'package-manifest.json'),embedded);
 const zip=path.join(output,'manager.zip');
 for(const file of ['config/manager.json','package-manifest.json']){
  const time=new Date('2000-01-01T00:00:00Z');
  fs.utimesSync(path.join(payload,file),time,time);
 }
 execFileSync('/usr/bin/zip',['-X','-q',zip,'config/manager.json','package-manifest.json'],{cwd:payload});
 manifest.payload_hashes['package-manifest.json']=sha256(embedded);
 manifest.zip_digest=sha256(fs.readFileSync(zip));
 writeFixtureJSON(output,'manifest',manifest);
 return {manifest,output,payload};
}

function historicalPackage(source){
 const {config}=hostFixture(), h=hostFixture().alarms.historical;
 const canonical=hostConfig(JSON.stringify(config));
 assert.equal(canonical.digest,h.config);
 const manifest={...lifecycleManifestFields({installationId:config.manager.installation_id,generation:h.generation}),
   source_revision:h.base_revision,configuration_digest:h.config,installation_id:config.manager.installation_id,
   domain_id:config.manager.domain_id,installation_generation:h.generation,runtime:'nodejs24.x',sender:true,
   canonical_config:canonical.config,dependency_hashes:h.dependency_hashes,payload_hashes:{},zip_digest:h.zip};
 assert.deepEqual(manifest.dependency_hashes,{root:sha256(fs.readFileSync(path.join(root,'package-lock.json'))),
   aws:sha256(fs.readFileSync(path.join(root,'runtime/aws/package-lock.json')))});
 const {['package-manifest.json']:self,...entries}=h.source_entries;
 for(const directory of ['node_modules','runtime/aws/node_modules']){
  for(const entry of fs.readdirSync(path.join(source.source,directory),{recursive:true,withFileTypes:true})){
   if(!entry.isFile())continue;
   const file=path.join(entry.parentPath??entry.path,entry.name);
   entries[path.relative(source.source,file)]??=sha256(fs.readFileSync(file));
  }
 }
 manifest.payload_hashes=Object.fromEntries(Object.keys(entries).sort().map(name=>[name,entries[name]]));
 const {zip_digest,...embedded}=manifest;
 assert.equal(sha256(JSON.stringify(embedded,null,2)+'\n'),self);
 manifest.payload_hashes['package-manifest.json']=self;
 assert.equal(Object.keys(manifest.payload_hashes).length,h.payload_entry_count);
 assert.equal(sha256(JSON.stringify(manifest,null,2)+'\n'),'sha256:'+h.manifest);
 assert.equal(sha256(JSON.stringify(synthesizeTemplate(JSON.stringify(config),manifest),null,2)+'\n'),h.template);
 return {manifest,template:synthesizeTemplate(JSON.stringify(config),manifest),manifestPath:writeFixtureJSON(source.temp,'historical-manifest',manifest)};
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
const lifecycleCases=['R1-16-H01','R1-16-H02','R1-23-H02-A'];
const alarmCases=['R1-23-H01','R1-23-H02'];
async function main(argv){
 if(argv.length===1&&argv[0]==='--help'){
  console.log('Usage: node scripts/test-aws-manager.mjs --case '+[...legacyCases,...lifecycleCases,...alarmCases].join('|')+' --output NEW_DIRECTORY');
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
 if(args['--case']&&![...legacyCases,...lifecycleCases,...alarmCases].includes(args['--case']))throw Error('Select a listed case.');
 const output=path.resolve(args['--output']);
 fs.mkdirSync(output,{mode:0o700});
 for(const id of args['--all']?[...legacyCases,...alarmCases]:[args['--case']]){
  const write=data=>fs.writeFileSync(path.join(output,id+'.json'),JSON.stringify({
   human_acceptance:'pending',installed_acceptance:'pending',live_iam:'unverified',command:process.argv,...data
  },alarmCases.includes(id)?(key,value)=>key==='payload_hashes'?{entries:Object.keys(value).length}:value:null,2)+'\n',{mode:0o600});
  try{
   const evidence=alarmCases.includes(id)?await runAlarmLifecycleFixture(id):
     lifecycleCases.includes(id)?await runLifecycleFixture(id):await runHumanCase(id);
   write({developer_observation:'confirmed_simulated',cleanup:'disposable fixtures removed',evidence});
   console.log(id+': developer simulation confirmed; human and installed acceptance pending');
  }catch(error){
   write({developer_observation:'blocked',blocker:error.message,evidence:error.fixtureEvidence??null,
     cleanup:'completed fixture paths are disposable'});
   throw error;
  }
 }
}

function setLifecycleClock(dependencies, start='2026-11-17T10:00:00Z', elapsed=0, onWait){
 let wall=Date.parse(start);
 Object.assign(dependencies,{
  now:()=>new Date(wall).toISOString(), monotonic:()=>elapsed,
  wait:async ms=>{wall+=ms;elapsed+=ms;onWait?.(ms);}
 });
}

export async function lifecycleBirthJourney({config=hostFixture().config,exerciseBootstrapRecovery=false,historical=false,historicalRegression=false}={}){
 const source=snapshotPackage({config,lifecycle:true,historical,historicalRegression});
 let historicalInput;
 try{historicalInput=historical?historicalPackage(source):null;}catch(error){source.cleanup();throw error;}
 const f=fixtureCloud(config,historicalInput?{template:historicalInput.template}:{},historicalInput?.manifest??source.manifest);
 const evidence = {source:snapshotRefForFixture(source),node:process.version,commands:[],waits:[]};
 const installPath=path.join(source.temp,'original-receipt.json');
 const configPath=path.join(source.temp,'config.json');
 const {dependencies}=f;
 setLifecycleClock(dependencies,undefined,0,ms=>evidence.waits.push(ms));
 const host=(args,branch=f)=>capture('manager-installation.mjs',args,
  ()=>runInstallationCommand(args,branch.dependencies),branch);
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
   const flags=['--config',configPath,'--operator-profile','operator'],manifestPath=historicalInput?.manifestPath??path.join(source.output,'manifest.json');
   const bound=await host(['bind',...flags,'--manifest',manifestPath,'--stack',f.stackId,'--output',installPath,'--json']);
   assert.equal(bound.exitCode,0,JSON.stringify(bound));
   const original=JSON.parse(fs.readFileSync(installPath));
   assert.equal(original.origin.table_id,f.cloud.table.TableId);
   const initialized=await state(['init',...flags,'--installation',installPath,'--json']);
   assert.equal(initialized.exitCode,0,initialized.stdout);
   if (exerciseBootstrapRecovery) {
    const before=readOnlyCheckpoint(f);
    assert(!f.cloud.function.Environment.Variables[LIFECYCLE_TABLE_ID_ENV]);
    const inspected=await host(['inspect-operation',...flags,'--installation',installPath,'--json']);
    assert.equal(inspected.exitCode,0,inspected.stdout);
    const idle=requireStatus(inspected,'inspected');
    assert.equal(idle.active,null);
    assert.equal(idle.last,null);
    requireReadOnly(f,before);
    assert(!f.cloud.function.Environment.Variables[LIFECYCLE_TABLE_ID_ENV]);
    await bootstrapRecoveryJourney({f,host,flags,source,installPath,evidence});
   }
   const outputs=path.join(source.temp,'bootstrap-receipt.json');
   const bootstrapped=await host(['bootstrap',...flags,'--installation',installPath,'--deployer-profile','deployer','--output',outputs,'--json']);
   assert.equal(bootstrapped.exitCode,0,JSON.stringify(bootstrapped));
   const observed=await state(['inspect',...flags,'--installation',outputs,'--kind','installation','--record-id',config.manager.installation_id,'--json']);
   assert.equal(observed.exitCode,0,observed.stdout);
   assert.equal(f.cloud.function.Environment.Variables[LIFECYCLE_TABLE_ID_ENV],original.origin.table_id);
   assert.equal(f.cloud.schedule.State,'DISABLED');
   assert.equal(f.cloud.concurrency,0);
   assert.equal(f.audit.filter(row=>row.action==='ExecuteChangeSetCommand').length,1);
   return {source,f,evidence,dependencies,host,state,flags,original,installationPath:outputs,configPath,manifestPath};
 }catch(error){source.cleanup();error.fixtureEvidence=evidence;throw error;}
}
async function bootstrapRecoveryJourney({f,host,flags,source,installPath,evidence}){
 const branch=forkLifecycle(f,{manifest:source.manifest},'superseded bootstrap');
 const command=(verb,extra=[],receipt=installPath)=>host([verb,...flags,'--installation',receipt,...extra,'--json'],branch);
 const out=name=>path.join(source.temp,name+'.json');
 branch.dependencies.beforeLifecycleFinish=async()=>{
  const stopped=await command('stop');
  assert.equal(stopped.outcome.code,'HOST_OWNER_ACTIVE',stopped.stdout);
  assert.equal(branch.cloud.schedule.State,'DISABLED');
  assert.equal(branch.cloud.concurrency,0);
 };
 const interrupted=await command('bootstrap',['--deployer-profile','deployer','--output',out('interrupted-bootstrap')]);
 delete branch.dependencies.beforeLifecycleFinish;
 assert.equal(interrupted.outcome.status,'partial',interrupted.stdout);
 assert.equal(providerExecutions(branch.audit).length,1);
 const id=interrupted.outcome.operation,named=['--operation',id];
 const observed=requireStatus(await command('inspect-operation',named),'inspected');
 assert.equal(observed.outcome,'awaiting_finish');
 assert.equal(observed.superseded,true);
 const held=JSON.parse(branch.provider.snapshot()).find(([,row])=>row.owner?.id===id)[1];
 const fence=held.fence_id;
 const finishArgs=[...named,'--output',out('bootstrap-recovered')];
 const start=branch.audit.length;
 const before=branch.provider.snapshot();
 const externalPin=branch.cloud.function.Environment.Variables[LIFECYCLE_TABLE_ID_ENV];
 branch.cloud.function.Environment.Variables[LIFECYCLE_TABLE_ID_ENV]=hostFixture().lifecycle.restored_table_id;
 const unverified=await command('finish-operation',[...named,'--output',out('unverified-bootstrap-pin')]);
 assert.notEqual(unverified.exitCode,0,unverified.stdout);
 assert.equal(branch.provider.snapshot(),before);
 assert.equal(operationRow(branch,id),undefined);
 branch.cloud.function.Environment.Variables[LIFECYCLE_TABLE_ID_ENV]=externalPin;
 const finish=requireStatus(await command('finish-operation',finishArgs),'superseded');
 assert.equal(finish.terminal.bootstrap_acknowledged,true);
 const saved=operationRow(branch,id);
 assert.equal(saved.fence_id,fence);
 assert.equal(finish.fence,fence);
 assert(JSON.parse(branch.provider.snapshot()).some(([,row])=>row.bootstrapped===true&&row.fence_id===fence));
 assert.equal(branch.cloud.schedule.State,'DISABLED');
 assert.equal(branch.cloud.concurrency,0);
 assert.equal(installationState(branch).writes_enabled,false);
 assert.equal(installationState(branch).schedule_enabled,false);
 assert.equal(installationState(branch).extensions.pb_stop_id,undefined);
 const recovered=JSON.parse(fs.readFileSync(out('bootstrap-recovered')));
 assert.deepEqual(recovered.origin,JSON.parse(fs.readFileSync(installPath)).origin);
 assert.equal(recovered.recovery_only,undefined);
 fs.unlinkSync(out('bootstrap-recovered'));
 const history=branch.provider.snapshot();
 const repeat=requireStatus(await command('finish-operation',finishArgs),'superseded');
 assert.deepEqual(repeat.terminal,finish.terminal);
 assert.deepEqual(JSON.parse(fs.readFileSync(out('bootstrap-recovered'))),recovered);
 assert.equal(branch.provider.snapshot(),history);
 operatorOnly(branch.audit.slice(start));
 noHostWrites(branch.audit.slice(start));
 assert.equal(providerExecutions(branch.audit).length,1);
 evidence.bootstrap_recovery={terminal:finish.terminal,fence};
 if(hasAlarmCapability(recovered.manifest)){
  const bootstrapped=lifecycleRow(branch);
  assert.equal(bootstrapped.current_alarm_package.intent,'disabled');
  assert.equal(bootstrapped.current_alarm_package.zip_digest,recovered.manifest.zip_digest);
  checkAlarmActions(branch,false);
  const stopped=requireStatus(await command('stop',[],out('bootstrap-recovered')),'stopped');
  assert.notEqual(stopped.operation,id);
  assert.equal(lifecycleRow(branch).last_operation_id,stopped.operation);
  assert.deepEqual(lifecycleRow(branch).current_alarm_package,bootstrapped.current_alarm_package);
  const maintenanceConfig=changedControls(recovered.manifest.canonical_config,{maintenance:true});
  const configPath=writeFixtureJSON(source.temp,'acknowledged-bootstrap-maintenance-config',maintenanceConfig);
  const target=packageManager({configPath,output:path.join(source.temp,'acknowledged-bootstrap-build'),source:source.source,
   revision:recovered.manifest.source_revision,generation:recovered.manifest.installation_generation,lifecycle:true});
  const asset={bucket:'fixture-artifacts',key:'acknowledged-bootstrap.zip',version:'acknowledged-bootstrap-version',zip_digest:target.manifest.zip_digest};
  branch.cloud.assets=new Map([[asset.version,Buffer.from(asset.zip_digest.slice(7),'hex').toString('base64')]]);
  const flagsForMaintenance=['--config',configPath,'--operator-profile','operator','--json'];
  const receipt=out('acknowledged-maintenance');
  const configured=requireStatus(await host(['configure',...flagsForMaintenance,'--installation',out('bootstrap-recovered'),
   '--manifest',path.join(target.output,'manifest.json'),'--asset',writeFixtureJSON(source.temp,'acknowledged-asset',asset),
   '--deployer-profile','deployer','--output',receipt],branch),'configured');
  const maintenancePackage=lifecycleRow(branch).current_alarm_package;
  const strict=requireStatus(await host(['stop',...flagsForMaintenance,'--installation',receipt],branch),'stopped');
  assert.equal(strict.proof,true);
  assert.notEqual(strict.operation,configured.operation);
  assert.equal(lifecycleRow(branch).last_operation_id,strict.operation);
  assert.deepEqual(lifecycleRow(branch).current_alarm_package,maintenancePackage);
  checkAlarmActions(branch,false);
  Object.assign(evidence.bootstrap_recovery,{initial_package:bootstrapped.current_alarm_package,stopped,configured,strict});
 }
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
const hostMutations=rows=>rows.filter(row=>/^(Update|PutFunction|PutMetricAlarm|EnableAlarmActions|DisableAlarmActions|Create|Execute|Delete)/.test(row.action));
const businessRows=f=>JSON.parse(f.provider.snapshot()).filter(([,row])=>/^[SMAN]#/.test(row.SK));
const operationRow=(f,id)=>[...f.provider.rows.values()].find(row=>row.owner?.id===id&&row.terminal);

export function lifecycleDriver(journey){
 const {source,f,host}=journey;
 const output=name=>path.join(source.temp,name+'.json');
 const initial={configPath:journey.configPath,installationPath:journey.installationPath,manifest:journey.original.manifest,manifestPath:journey.manifestPath};
 const previousPins=new Map();
 const currentRevision=()=>execFileSync('git',['rev-parse','HEAD'],{cwd:source.source,encoding:'utf8'}).trim();
 function nextPin(){
  execFileSync('git',['-c','user.name=Pigboard Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-qm','Disposable compatible successor pin'],{cwd:source.source});
  return currentRevision();
 }
 function build(name,config,{revision=currentRevision(),compatibleFrom,lifecycle=true,historicalRegression=source.historicalRegression}={}){
  if(compatibleFrom)previousPins.set(revision,compatibleFrom);
  const configPath=writeFixtureJSON(source.temp,name+'-config',config);
  const pack=historicalRegression&&lifecycle?legacyLifecycleFixturePackage:packageManager;
  const {manifest,output}=pack({configPath,output:path.join(source.temp,name+'-build'),source:source.source,
    revision,generation:initial.manifest.installation_generation,lifecycle,compatibleFrom:lifecycle?previousPins.get(revision):undefined});
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

function assertReadOnlyActionText(stdout){
 assert.match(stdout,/State mutation performed — false/);
 assert.doesNotMatch(stdout,/State admission fenced/);
}

function forkLifecycle(f,installed,name){
 const branch=fixtureCloud(installed.manifest.canonical_config,structuredClone(f.cloud),installed.manifest);
 setLifecycleClock(branch.dependencies,f.dependencies.now(),f.dependencies.monotonic());
 branch.name=name;
 branch.provider.rows=new Map(JSON.parse(f.provider.snapshot()));
 return branch;
}
const installationState=f=>f.provider.records().find(row=>row.kind==='installation');
const noHostWrites=rows=>assert.deepEqual(hostMutations(rows),[]);
const operatorOnly=rows=>assert(rows.every(row=>row.identity==='SELECTED_OPERATOR'));
const providerExecutions=rows=>rows.filter(row=>row.action==='ExecuteChangeSetCommand');
const readOnlyCheckpoint=f=>({
 state:f.provider.snapshot(),aws:f.audit.length,stateAudit:f.provider.audit.length,
 schedule:structuredClone(f.cloud.schedule),concurrency:f.cloud.concurrency,
 alarms:structuredClone(f.cloud.alarms),alarmResources:structuredClone(f.cloud.alarmResources),
 function:structuredClone(f.cloud.function),asset:structuredClone(f.cloud.stack.Parameters)
});
function requireReadOnly(f,before,{deployer=false}={}){
 assert.equal(f.provider.snapshot(),before.state);
 assert.deepEqual(f.cloud.schedule,before.schedule);
 assert.equal(f.cloud.concurrency,before.concurrency);
 assert.deepEqual(f.cloud.alarms,before.alarms);
 assert.deepEqual(f.cloud.alarmResources,before.alarmResources);
 assert.deepEqual(f.cloud.function,before.function);
 assert.deepEqual(f.cloud.stack.Parameters,before.asset);
 const reads=f.audit.slice(before.aws);
 operatorOnly(reads.filter(row=>!(deployer&&row.identity==='SELECTED_DEPLOYER'&&row.action==='GetCallerIdentityCommand')));
 assert(reads.every(row=>/^(Get|Describe|List|Scan|Query|TransactGet)/.test(row.action)));
 assert(f.provider.audit.slice(before.stateAudit).every(row=>/^(Get|Describe|Scan|Query|TransactGet)/.test(row.name)));
}

function actualAlarmRows(f){
 const base=f.cloud.schedule.Name;
 return hostFixture().alarms.expected.map(row=>({...row,name:base+'-'+row.suffix,
  definition:structuredClone(f.cloud.alarms.get(base+'-'+row.suffix))}));
}

function checkAlarmActions(f, enabled){
 const rows=actualAlarmRows(f);
 assert.equal(f.cloud.alarms.size,4);
 assert.equal(f.cloud.alarmResources.length,4);
 for(const {name,definition} of rows){
  assert.equal(definition.AlarmName,name);
  assert.equal(definition.ActionsEnabled,enabled,name);
  for(const key of ['AlarmActions','OKActions','InsufficientDataActions'])assert.deepEqual(definition[key],[],name);
 }
 return rows;
}

const alarmEpoch=f=>{
 const {health_enabled_at=null,health_generation=null}=installationState(f).extensions;
 return {health_enabled_at,health_generation};
};
const lifecycleRow=f=>[...f.provider.rows.values()].find(row=>row.bootstrapped===true);

function inspectAlarmTemplate(journey){
 const {f}=journey,{Resources,Outputs,Metadata:{Pigboard:metadata}}=f.cloud.template;
 const {manager}=f.config,{region,account_id}=manager.aws;
 const base=f.cloud.schedule.Name;
 const alarmRows=hostFixture().alarms.expected;
 const documents={operator:metadata.operator_policy,deployer:metadata.configure_deployer_policy,
  execution:metadata.alarm_execution_policy,removal:metadata.remove_execution_policy,
  tagging:metadata.alarm_tagging_policy,runtime:Resources.RuntimeRole.Properties.Policies[0].PolicyDocument,
  scheduler:Resources.SchedulerRole.Properties.Policies[0].PolicyDocument};
 const alarmActions=['DescribeAlarms','EnableAlarmActions','DisableAlarmActions','PutMetricAlarm','DeleteAlarms','TagResource','UntagResource','SetAlarmState','ListTagsForResource'];
 const native=['lambda-errors','lambda-throttles'];
 const permissions={operator:{DescribeAlarms:()=>true,DisableAlarmActions:()=>true,ListTagsForResource:()=>true,
  EnableAlarmActions:suffix=>native.includes(suffix),PutMetricAlarm:suffix=>!native.includes(suffix)},
  execution:{DescribeAlarms:()=>true,PutMetricAlarm:()=>true,DeleteAlarms:()=>true},
  removal:{DescribeAlarms:()=>true,DeleteAlarms:()=>true},tagging:{TagResource:()=>true,UntagResource:()=>true}};
 assert.equal(Resources.LogGroup.Properties.RetentionInDays,14);
 const facts=[];
 for(const {logical,suffix,key,metric} of alarmRows){
  const name=`${base}-${suffix}`,arn=`arn:aws:cloudwatch:${region}:${account_id}:alarm:${name}`;
  const link=`https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#alarmsV2:alarm/${name}`;
  const isNative=native.includes(suffix),completion=key==='missing_completion';
  const expected={AlarmName:name,ActionsEnabled:false,AlarmActions:[],OKActions:[],InsufficientDataActions:[],
   ComparisonOperator:completion?'LessThanThreshold':'GreaterThanOrEqualToThreshold',
   Threshold:key==='measured_budget'?80:1,EvaluationPeriods:completion?3:1,DatapointsToAlarm:completion?3:1,
   TreatMissingData:'notBreaching',Namespace:isNative?'AWS/Lambda':'Pigboard/Manager',MetricName:metric,
   Period:isNative?60:300,Statistic:isNative?'Sum':'Maximum',Dimensions:isNative?[{Name:'FunctionName',Value:base}]:
     [{Name:'InstallationId',Value:'fixture'},{Name:'EvidenceRevision',Value:'pigboard-unbound-v1'}]};
  assert.deepEqual(Resources[logical],{Type:'AWS::CloudWatch::Alarm',Properties:expected});
  assert.deepEqual(Outputs[logical+'ConsoleUrl'],{Value:link});
  const grants=[];
  for(const [role,document] of Object.entries(documents))for(const action of alarmActions){
   const permitted=Boolean(permissions[role]?.[action]?.(suffix));
   assert.equal(policyPermits(document,'cloudwatch:'+action,arn),permitted,role+' '+action+' '+logical);
   assert.equal(policyPermits(document,'cloudwatch:'+action,arn+'-other'),false,role+' '+action+' unrelated');
   if(permitted)grants.push({role,action});
  }
  facts.push({logical,name,arn,link,expected,actual:Resources[logical].Properties,grants});
 }
 assert.deepEqual(Object.keys(Resources).filter(key=>Resources[key].Type==='AWS::CloudWatch::Alarm').sort(),alarmRows.map(row=>row.logical).sort());
 return {retention_days:Resources.LogGroup.Properties.RetentionInDays,alarms:facts};
}

function checkAlarmWindows(journey){
 const {f,source}=journey;
 const run=(name,scheduleMinutes,freshnessSeconds,exitCode)=>{
  const config=structuredClone(f.config);
  config.manager.schedule_minutes=scheduleMinutes;
  config.manager.log_retention_days=3;
  config.manager.health={freshness_seconds:freshnessSeconds,warning_percent:80};
  const configPath=writeFixtureJSON(source.temp,name+'-config',config),output=path.join(source.temp,name);
  const command=['scripts/package-manager.mjs','--config',configPath,'--revision',source.snapshot_revision,'--output',output,'--lifecycle'];
  const result=spawnSync(process.execPath,command,{cwd:source.source,encoding:'utf8',maxBuffer:4*1024*1024});
  if(result.error)throw result.error;
  const actual=JSON.parse(result.stdout);
  assert.equal(result.status,exitCode,JSON.stringify(actual).slice(0,500));
  if(exitCode===0){assert.equal(actual.status,'packaged');assert(hasAlarmCapability(actual.manifest));}
  else {assert.equal(actual.code,'ALARM_WINDOW_UNSUPPORTED');assert.equal(fs.existsSync(output),false);}
  return {command:['node',...command],exit_code:result.status,expected_exit_code:exitCode,window:alarmWindow(config),
    actual:exitCode===0?{status:actual.status,zip_digest:actual.manifest.zip_digest}:actual};
 };
 const before=readOnlyCheckpoint(f);
 const commands=[run('short-window-at-limit',5,86400,0),run('short-window-over-limit',5,86401,2),run('valid-long-period',1440,259200,0)];
 requireReadOnly(f,before);
 assert.equal(commands[0].window.window_seconds,86400);
 assert.equal(commands[1].actual.alarm_window.window_seconds,86700);
 assert.equal(commands[2].window.limit_seconds,604800);
 const pure=structuredClone(f.config);
 pure.manager.schedule_minutes=1440;
 pure.manager.health={freshness_seconds:604800};
 const at=assertAlarmWindow(pure);
 assert.equal(at.window_seconds,604800);
 pure.manager.health.freshness_seconds++;
 assert.equal(alarmWindow(pure).window_seconds,691200);
 assert.throws(()=>assertAlarmWindow(pure),{code:'ALARM_WINDOW_UNSUPPORTED'});
 return {commands,pure:{at,over:alarmWindow(pure)}};
}

async function alarmPackageJourney(journey){
 const {f,evidence}=journey,{initial,build,configure,run,output,deployment}=lifecycleDriver(journey);
 const {runAlarmSignalHistories,readAlarmHealthFixture}=await import('./test-manager-health.mjs');
 evidence.template=inspectAlarmTemplate(journey);
 evidence.windows=checkAlarmWindows(journey);
 const repeatBootstrap={};
 for(const [scenario,code] of [['aligned',null],['drift','ALARM_DEFINITION_MISMATCH'],['denial','ALARM_READ_DENIED']]){
  const branch=forkLifecycle(f,initial,`repeat bootstrap ${scenario}`),receipt=output(`bootstrap-repeat-${scenario}`);
  if(scenario==='drift')branch.cloud.alarms.get(actualAlarmRows(branch)[3].name).Threshold=75;
  if(scenario==='denial')branch.cloud.denyAlarmRead=true;
  const before=readOnlyCheckpoint(branch);
  const repeat=await run('bootstrap',initial,[...deployment,'--output',receipt],{branch});
  assert.equal(repeat.exitCode,code?2:0,repeat.stdout);
  assert.equal(repeat.outcome.status,code?'unavailable':'bootstrapped');
  assert.equal(repeat.outcome.code,code??undefined);
  assert.equal(fs.existsSync(receipt),!code);
  const reads=branch.audit.filter(row=>row.action==='DescribeAlarmsCommand');
  assert.equal(reads.length,1);
  assert.deepEqual(reads[0].input.AlarmNames,actualAlarmRows(branch).map(row=>row.name));
  if(code)assert.equal(repeat.outcome.alarms.status,scenario==='drift'?'mismatch':'unknown');
  else assert.deepEqual(JSON.parse(fs.readFileSync(receipt)).manifest,initial.manifest);
  requireReadOnly(branch,before,{deployer:true});
  repeatBootstrap[scenario]=repeat.outcome;
 }
 evidence.repeat_bootstrap=repeatBootstrap;
 const disabled=await readAlarmHealthFixture(f,initial);
 assert.equal(disabled.json.outcome.state,'disabled');
 assert.equal(disabled.json.outcome.maximum_budget_utilization,null);
 assert(disabled.json.outcome.alarm_evidence.alarms.every(row=>disabled.human.stdout.includes(row.link)));
 f.cloud.alarms.get(actualAlarmRows(f)[0].name).StateValue='ALARM';
 const target=build('h01-enabled',changedControls(f.config,{schedule_enabled:true}));
 const active=await configure(initial,target,'h01-enabled-receipt');
 const definitions=checkAlarmActions(f,true);
 const completion=definitions[0].definition;
 const epoch=alarmEpoch(f);
 assert.equal(completion.Metrics[1].Expression,`IF(EPOCH(TIME_SERIES(1)) <= ${Date.parse(epoch.health_enabled_at)/1000+900}, 1, FILL(m1, 0))`);
 assert.deepEqual(completion.Metrics[0].MetricStat,{Metric:{Namespace:'Pigboard/Manager',MetricName:'CompletePresence',
   Dimensions:[{Name:'InstallationId',Value:'fixture'},definitions[3].definition.Dimensions[1]]},Period:300,Stat:'Maximum'});
 evidence.histories=runAlarmSignalHistories(definitions,{group:'R1-23-H01'});
 const starting=await readAlarmHealthFixture(f,active);
 evidence.health={disabled,starting};
 assert.equal(starting.json.exitCode,2,starting.json.stdout);
 assert.equal(starting.json.outcome.state,'starting');
 assert.equal(starting.json.outcome.maximum_budget_utilization,null);
 assert.equal(starting.json.outcome.alarm_evidence.alarms[0].raw_state,'ALARM');
 assert.equal(starting.json.outcome.alarm_evidence.alarms[0].evaluation,'unverified');
 assert.match(starting.human.stdout,/raw.*ALARM/i);
 const denied=await readAlarmHealthFixture(f,{...active,denyAlarmRead:true});
 assert.equal(denied.json.exitCode,2);
 assert.equal(denied.json.outcome.alarm_evidence.read_code,'ALARM_READ_DENIED');
 f.cloud.alarms.get(definitions[3].name).Threshold=75;
 const mismatch=await readAlarmHealthFixture(f,active);
 assert.equal(mismatch.json.exitCode,1);
 assert.equal(mismatch.json.outcome.state,'degraded');
 assert.equal(mismatch.json.outcome.alarm_evidence.alarms[3].code,'ALARM_DEFINITION_MISMATCH');
 evidence.health={disabled,starting,denied,mismatch};
}

async function alarmLifeJourney(journey){
 const {f,source,evidence}=journey;
 const driver=lifecycleDriver(journey),{initial,output,run,build,nextPin,configure,assetFlags,deployment}=driver;
 const {runAlarmSignalHistories,readAlarmHealthFixture}=await import('./test-manager-health.mjs');
 const {historical}=hostFixture().alarms;
 assert.equal(initial.manifest.source_revision,historical.base_revision);
 assert.equal(f.cloud.alarms.size,0);
 assert.equal(Object.keys(f.cloud.template.Resources).length,7);
 const originalTable=structuredClone(f.cloud.table),originalPhysical=structuredClone(initial.manifest.resource_map.physical);
 const legacyConfig=initial.manifest.canonical_config;
 const enabledConfig=changedControls(legacyConfig,{schedule_enabled:true});
 const maintenanceConfig=changedControls(legacyConfig,{maintenance:true});
 const resumeId='23230000-dead-4bad-8cad-0123456789ab';
 const rejectResume=async(installed,target,branch,code,id=resumeId)=>{
  const invalidResume=['--resume-operation',id];
  for(const verb of ['configure','stop']){
   const before=readOnlyCheckpoint(branch);
   const args=verb==='configure'?[...invalidResume,...assetFlags(target),...deployment,'--output',output(branch.name+'-refused')]:invalidResume;
   const result=await run(verb,installed,args,{branch,configPath:target.configPath});
   assert.equal(result.exitCode,2,result.stdout);
   assert.equal(result.outcome.code,code,result.stdout);
   assert.equal(branch.provider.snapshot(),before.state);
   noHostWrites(branch.audit.slice(before.aws));
  }
 };
 const canonicalActive=hostConfig(JSON.stringify(enabledConfig)),historicalActive=historical.active;
 assert.equal(canonicalActive.digest,historicalActive.config);
 assert.equal(sha256(JSON.stringify(canonicalActive.config,null,2)+'\n'),historicalActive.config_entry);
 const activeManifest=structuredClone(initial.manifest);
 activeManifest.canonical_config=canonicalActive.config;
 activeManifest.configuration_digest=historicalActive.config;
 activeManifest.zip_digest=historicalActive.zip;
 activeManifest.payload_hashes['config/manager.json']=historicalActive.config_entry;
 activeManifest.payload_hashes['package-manifest.json']=historicalActive.embedded;
 assert.equal(sha256(JSON.stringify(activeManifest,null,2)+'\n'),historicalActive.manifest);
 const legacyActiveAsset={bucket:'fixture-artifacts',key:'historical-active.zip',version:'fixture-active-version',zip_digest:activeManifest.zip_digest};
 f.cloud.assets=new Map([[legacyActiveAsset.version,Buffer.from(legacyActiveAsset.zip_digest.slice(7),'hex').toString('base64')]]);
 const legacyTarget={manifest:activeManifest,configPath:writeFixtureJSON(source.temp,'historical-active-config',enabledConfig),
  manifestPath:writeFixtureJSON(source.temp,'historical-active-manifest',activeManifest),assetPath:writeFixtureJSON(source.temp,'historical-active-asset',legacyActiveAsset)};
 const legacyActive=await configure(initial,legacyTarget,'historical-active-receipt');
 assert.equal(f.cloud.schedule.State,'ENABLED');
 assert.equal(f.cloud.alarms.size,0);
 const unmarked=forkLifecycle(f,legacyActive,'legacy-v2');
 unmarked.dependencies.beforeLifecycleFinish=()=>{throw Error('fixture interruption before legacy finish');};
 const legacyHold=requireStatus(await run('configure',legacyActive,[...assetFlags(legacyTarget),...deployment,
  '--output',output('legacy-hold')],{branch:unmarked}),'partial');
 await rejectResume(legacyActive,legacyTarget,unmarked,'ALARM_RESUME_STALE');
 delete unmarked.dependencies.beforeLifecycleFinish;
 const noCapability=await run('configure',legacyActive,['--resume-operation',legacyHold.operation,...assetFlags(legacyTarget),
  ...deployment,'--output',output('legacy-resume')],{branch:unmarked});
 assert.equal(noCapability.outcome.code,'ALARM_RESUME_UNSUPPORTED',noCapability.stdout);
 const v1=await preparedCloud(legacyConfig);
 try{
  v1.name='legacy-v1';
  await rejectResume(v1,legacyTarget,v1,'ALARM_RESUME_UNSUPPORTED');
 }finally{v1.cleanup();}
 const initialTarget=build('alarm-adoption',enabledConfig,{revision:source.snapshot_revision,compatibleFrom:historical.base_revision});
 const preAdoptionTemplate=structuredClone(f.cloud.template);
 const propose=async(installed,target,name,branch=f)=>{
  const preview=output(name+'-preview'),before=readOnlyCheckpoint(branch);
  const result=await run('upgrade-preview',installed,[...assetFlags(target),'--output',preview],{branch});
  requireStatus(result,'previewed');
  requireReadOnly(branch,before);
  return preview;
 };
 const preview=await propose(legacyActive,initialTarget,'alarm-adoption');
 const expectedArns=hostFixture().alarms.expected.map(row=>`arn:aws:cloudwatch:${legacyConfig.manager.aws.region}:${legacyConfig.manager.aws.account_id}:alarm:${f.cloud.schedule.Name}-${row.suffix}`);
 const nameReads=audit=>audit.filter(row=>row.action==='ListTagsForResourceCommand');
 const absence=nameReads(f.audit);
 assert.deepEqual(absence.map(row=>row.input.ResourceARN),expectedArns);
 assert(absence.every(row=>row.identity==='SELECTED_OPERATOR'&&row.kind==='CloudWatch'&&row.simulated_alarm_name==='absent'));
 const protection=hostFixture().alarms.adoption_name_checks;
 const adoptionNameChecks={absence,preview:{},upgrade:{}};
 const rejectNameCheck=async(scenario,code,verb)=>{
  const branch=forkLifecycle(f,legacyActive,`adoption ${verb} with ${scenario}`);
  branch.cloud.alarmNameConditions={measured_budget:scenario};
  const checkpoint=readOnlyCheckpoint(branch),file=output(`adoption-${verb}-${scenario}`);
  const extra=verb==='upgrade'?[...deployment,'--preview',preview]:[];
  const result=await run(verb,legacyActive,[...assetFlags(initialTarget),...extra,'--output',file],{branch,human:scenario==='tagged'});
  assert.equal(result.exitCode,2,result.stdout);
  assert.equal(result.outcome.code,code,result.stdout);
  assert.match(result.outcome.status,/^(unavailable|refused)$/);
  assert(!fs.existsSync(file));
  assert.doesNotMatch(result.stdout,/fixture-private-(tag|value)|Private fixture error text/);
  requireReadOnly(branch,checkpoint,{deployer:verb==='upgrade'});
  const reads=nameReads(branch.audit);
  assert.deepEqual(reads.map(row=>row.input.ResourceARN),expectedArns);
  assert.deepEqual(reads.map(row=>row.simulated_alarm_name),['absent','absent','absent',scenario]);
  return {result:result.outcome,reads};
 };
 for(const [scenarios,code] of [[protection.occupied,'ALARM_NAME_COLLISION'],[protection.unconfirmed,'ALARM_NAME_AVAILABILITY_UNCONFIRMED']]){
  for(const scenario of scenarios)adoptionNameChecks.preview[scenario]=await rejectNameCheck(scenario,code,'upgrade-preview');
 }
 for(const scenario of protection.changes_after_preview)adoptionNameChecks.upgrade[scenario]=await rejectNameCheck(scenario,
  scenario==='log'?'ALARM_NAME_COLLISION':'ALARM_NAME_AVAILABILITY_UNCONFIRMED','upgrade');
 const ownZip=path.join(path.dirname(initialTarget.manifestPath),'manager.zip');
 const badZipBranch=forkLifecycle(f,legacyActive,'tampered adjacent ZIP');
 const verifiedZip=fs.readFileSync(ownZip);
 try{
  fs.appendFileSync(ownZip,'fixture modification');
  const checkpoint=readOnlyCheckpoint(badZipBranch);
  const tampered=await run('upgrade-preview',legacyActive,[...assetFlags(initialTarget),'--output',output('tampered-zip')],{branch:badZipBranch});
  assert.equal(tampered.outcome.code,'PACKAGE_ZIP_MISMATCH',tampered.stdout);
  requireReadOnly(badZipBranch,checkpoint);
 }finally{fs.writeFileSync(ownZip,verifiedZip);}
 const retainedFixture={ticket_id:'1001',project_id:'10001',epic_id:'900',label:'AI-Daniel-fixture',assignment:null};
 seedRetained(f,{retained_members:[retainedFixture],pending_intents:[]});
 const retained=businessRows(f);
 assert.equal(retained.length,1);
 // Preview includes a lifecycle fence and State revisions. Reissue after
 // deliberately preparing retained work, then use its exact proposal.
 const livePreview=await propose(legacyActive,initialTarget,'alarm-adoption-with-retained-work');
 const adoptionStart=f.audit.length,adoptionReceipt=output('alarm-adopted');
 const adoption=requireStatus(await run('upgrade',legacyActive,[...assetFlags(initialTarget),...deployment,
  '--preview',livePreview,'--output',adoptionReceipt]),'upgraded');
 const adopted={...initialTarget,installationPath:adoptionReceipt};
 const dormant=checkAlarmActions(f,false);
 const adoptedHealth=await readAlarmHealthFixture(f,adopted);
 assert.equal(adoptedHealth.json.outcome.alarm_evidence.intent,'upgrade-maintenance');
 assert.equal(adoptedHealth.json.outcome.alarm_evidence.current.evidence_revision,null);
 assert(!adoptedHealth.telemetry.some(row=>row.action==='GetMetricStatisticsCommand'));
 assert.equal(f.cloud.schedule.State,'DISABLED');assert.equal(f.cloud.concurrency,0);
 assert.deepEqual(f.cloud.table,originalTable);
 assert.deepEqual(adopted.manifest.resource_map.physical,originalPhysical);
 assert.deepEqual(businessRows(f),retained);
 assert(f.audit.slice(adoptionStart).some(row=>row.action==='GetTemplateCommand'&&row.input.TemplateStage==='Original'));
 assert.equal(providerExecutions(f.audit.slice(adoptionStart)).length,1);
 assert.deepEqual(nameReads(f.audit.slice(adoptionStart)).map(row=>row.input.ResourceARN),expectedArns);
 const added=f.cloud.lastChangeSetDescription.Changes.filter(row=>row.ResourceChange.Action==='Add');
 assert.deepEqual(added.map(row=>row.ResourceChange.LogicalResourceId),hostFixture().alarms.expected.map(row=>row.logical));
 evidence.adoption={authentic_parent:{revision:historical.base_revision,template_sha256:historical.template,
  embedded_manifest_sha256:historical.source_entries['package-manifest.json'],payload_count:historical.payload_entry_count,
  outer_manifest_sha256:'sha256:'+historical.manifest,zip_digest:historical.zip},preAdoptionTemplate,preview,adoption,health:adoptedHealth,added,dormant,name_checks:adoptionNameChecks};
 const maintenanceTarget=build('alarm-adopted-maintenance',maintenanceConfig);
 const maintenance=await configure(adopted,maintenanceTarget,'alarm-adopted-maintenance-receipt');
 const firstDrain=requireStatus(await run('stop',maintenance),'stopped');
 assert.equal(firstDrain.proof,true);
 const unarmedHealth=await readAlarmHealthFixture(f,maintenance);
 assert.equal(unarmedHealth.json.outcome.alarm_evidence.current.evidence_revision,null);
 assert(!unarmedHealth.telemetry.some(row=>row.action==='GetMetricStatisticsCommand'));
 const audited=f.audit.length;
 const enabled=await configure(maintenance,initialTarget,'alarm-first-enabled');
 const activated=checkAlarmActions(f,true),enablement=alarmEpoch(f);
 assert(enablement.health_generation&&enablement.health_enabled_at);
 const activationWrites=hostMutations(f.audit.slice(audited));
 const native=activationWrites.findIndex(row=>row.action==='EnableAlarmActionsCommand');
 const enable=activationWrites.findIndex(row=>row.action==='UpdateScheduleCommand'&&row.input.State==='ENABLED');
 const firstCustom=activationWrites.findIndex(row=>row.action==='PutMetricAlarmCommand');
 assert(native>=0&&native<enable&&enable<firstCustom);
 assert.deepEqual(activationWrites[native].input.AlarmNames,activated.slice(1,3).map(row=>row.name));
 const external=forkLifecycle(f,enabled,'unexpected Scheduler loss');
 external.cloud.schedule.State='DISABLED';
 checkAlarmActions(external,true);
 const externalHealth=await readAlarmHealthFixture(external,enabled);
 assert.equal(externalHealth.json.outcome.state,'degraded');
 assert.equal(externalHealth.json.outcome.applied_controls.schedule_enabled,true);
 const same=await configure(enabled,initialTarget,'alarm-unchanged-enabled');
 assert.deepEqual(alarmEpoch(f),enablement);
 assert.deepEqual(actualAlarmRows(f),activated);
 const changed=structuredClone(enabledConfig);
 changed.manager.log_retention_days=7;
 const changedTarget=build('alarm-rotated-config',changed);
 const rotated=await configure(same,changedTarget,'alarm-rotated-receipt');
 const rotatedEpoch=alarmEpoch(f),rotatedRows=checkAlarmActions(f,true);
 assert.notDeepEqual(rotatedEpoch,enablement);
 assert.deepEqual(rotatedRows.map(row=>row.name),activated.map(row=>row.name));
 const previousRevision=activated[3].definition.Dimensions[1].Value;
 evidence.activation={firstDrain,enablement,activationWrites,unarmedHealth,externalHealth,rotatedEpoch,
  histories:runAlarmSignalHistories(rotatedRows,{group:'R1-23-H02',previousRevision})};
 await alarmFailureJourney(journey,driver,rotated,{changedTarget,maintenanceTarget});
 const maintenanceAgain=await configure(rotated,maintenanceTarget,'alarm-four-removal-maintenance');
 checkAlarmActions(f,false);
 const pastEpoch=alarmEpoch(f);
 assert.deepEqual(pastEpoch,rotatedEpoch);
 const laterHealth=await readAlarmHealthFixture(f,maintenanceAgain);
 assert.equal(laterHealth.json.outcome.alarm_evidence.current.evidence_revision,null);
 assert(!laterHealth.telemetry.some(row=>row.action==='GetMetricStatisticsCommand'));
 const drained=requireStatus(await run('stop',maintenanceAgain),'stopped');
 assert.equal(drained.proof,true);
 const originalMaintenance=JSON.parse(fs.readFileSync(maintenanceAgain.installationPath));
 const forged=structuredClone(originalMaintenance);
 forged.manifest.zip_digest=sha256('uncommitted stopped package bytes');
 const forgedPath=writeFixtureJSON(source.temp,'alarm-post-stop-tampered-receipt',forged);
 const safeBefore=readOnlyCheckpoint(f);
 const refusedForgery=await run('remove-preview',{...maintenanceAgain,installationPath:forgedPath},
  ['--output',output('alarm-post-stop-tampered-preview')]);
 assert.equal(refusedForgery.outcome.code,'CURRENT_PACKAGE_UNVERIFIED',refusedForgery.stdout);
 assert(!fs.existsSync(output('alarm-post-stop-tampered-preview')));
 requireReadOnly(f,safeBefore);
 const removal=output('alarm-removal-preview');
 requireStatus(await run('remove-preview',maintenanceAgain,['--output',removal]),'previewed');
 const {inventory}=JSON.parse(fs.readFileSync(removal));
 assert.equal(inventory.resources.length,11);
 assert.equal(inventory.resources.find(row=>row.logical==='StateTable').disposition,'retained');
 assert.equal(inventory.resources.filter(row=>row.type==='AWS::CloudWatch::Alarm'&&row.disposition==='deleted').length,4);
 evidence.removal={drained,health:laterHealth,inventory,refusedForgery:refusedForgery.outcome};
 for(const scenario of ['complete','missing alarm delete event','denied refreshed events']){
  const branch=forkLifecycle(f,maintenanceAgain,scenario);
  if(scenario!=='complete')branch.cloud.omitDeleteEvent='MeasuredBudgetAlarm';
  const removed=requireStatus(await run('remove',maintenanceAgain,[...deployment,'--preview',removal,'--output',output(scenario+'-removal')],
   {branch}),scenario==='complete'?'removed':'partial');
  assert.deepEqual(branch.cloud.table,originalTable);
  assert.deepEqual(businessRows(branch),retained);
  assert.equal(removed.terminal.resources.length,11);
  const row=removed.terminal.resources.find(row=>row.logical==='MeasuredBudgetAlarm');
  if(scenario==='complete')assert.equal(row.observation,'deleted');
  else {
   assert.equal(row.observation,'unobservable');
   assert.match(row.cost,/CloudWatch alarm charges/);
   if(scenario==='denied refreshed events')branch.cloud.fail='DescribeStackEventsCommand';
   branch.cloud.hideDeletedStack=true;
   const checkpoint=readOnlyCheckpoint(branch);
   const inspected=requireStatus(await run('inspect-operation',maintenanceAgain,['--operation',removed.operation],{branch}),'inspected');
   assert.equal(inspected.current_observation.status,'partial');
   assert.deepEqual(inspected.current_observation.resources.find(item=>item.logical===row.logical),row);
   if(scenario==='denied refreshed events')assert.equal(inspected.current_observation.code,'REMOVAL_OBSERVATION_UNAVAILABLE');
   requireReadOnly(branch,checkpoint);
   assert(!branch.audit.slice(checkpoint.aws).some(row=>['DescribeStacksCommand','GetFunctionCommand','GetScheduleCommand'].includes(row.action)));
   const resultPath=output(`${scenario}-finish`);
   const finishResult=await run('finish-operation',maintenanceAgain,['--operation',removed.operation,'--output',resultPath],{branch,human:true});
   const finished=requireStatus(finishResult,'partial');
   assert.equal(finishResult.exitCode,1);
   assert.deepEqual(finished.terminal,removed.terminal);
   assert.deepEqual(finished.current_observation.resources,inspected.current_observation.resources);
   assert.deepEqual(JSON.parse(fs.readFileSync(resultPath)).current_observation,finished.current_observation);
   assert.match(finishResult.stdout,/CloudWatch alarm charges/);
   assert(finishResult.stdout.includes(removed.operation));
   requireReadOnly(branch,checkpoint);
   evidence.removal[scenario]={removed,inspected,finished};
   continue;
  }
  evidence.removal[scenario]=removed;
 }
 evidence.removal.retained_table_checks=await verifyLateRemoval(journey,driver,maintenanceAgain,removal,inventory,retained);
}

async function verifyLateRemoval(journey,driver,installed,preview,inventory,retained){
 const {f}=journey,{output,run,deployment}=driver;
 const results={};
 for(const [scenario,code] of [['denied','RETAINED_TABLE_UNAVAILABLE'],['substituted','PHYSICAL_STATE_MISMATCH'],['state','REMOVAL_STATE_UNCONFIRMED']]){
  const branch=forkLifecycle(f,installed,`removal late ${scenario}`);
  branch.cloud.omitDeleteEvent='MeasuredBudgetAlarm';
  if(scenario==='state')branch.cloud.denyProtectedStateAfterDelete=true;
  else branch.cloud.retainedTableReadFault=scenario;
  const file=output(`remove-late-${scenario}`);
  const remove=await run('remove',installed,[...deployment,'--preview',preview,'--output',file],{branch,human:true});
  assert.equal(remove.exitCode,1,remove.stdout);
  const held=requireStatus(remove,'partial'),id=held.operation,named=['--operation',id];
  assert.equal(held.code,code,remove.stdout);
  assert.equal(held.receipt_publication,'operation_record_preserved');
  assert.equal(JSON.parse(fs.readFileSync(file)).original_receipt.binding.table_arn,f.binding.table_arn);
  assert.equal(JSON.parse(fs.readFileSync(file)).operation,id);
  assert.equal(operationRow(branch,id),undefined);
  assert.equal(lifecycleRow(branch).owner.id,id);
  assert.equal(lifecycleRow(branch).owner.effects[0].state,'claimed');
  assert.deepEqual(businessRows(branch),retained);
  const deletedIndex=branch.audit.findIndex(row=>row.action==='DeleteStackCommand');
  assert(deletedIndex!==-1);
  assert(!branch.audit.slice(deletedIndex+1).some(row=>row.action==='TransactWriteCommand'));
  const checkObservation=(observation,tableStatus)=>{
   assert.equal(observation.status,'partial');
   assert.equal(observation.provider.status,'DELETE_COMPLETE');
   assert.deepEqual(observation.externally_owned,inventory.externally_owned);
   assert.deepEqual(observation.resources.map(({logical,physical,type,disposition})=>({logical,physical,type,disposition})),
    inventory.resources.map(({logical,physical,type,disposition})=>({logical,physical,type,disposition})));
   assert.equal(observation.resources.find(row=>row.logical==='StateTable').observation,tableStatus);
   assert.match(observation.resources.find(row=>row.logical==='StateTable').cost,/DynamoDB storage/);
   assert.equal(observation.resources.find(row=>row.logical==='LambdaErrorsAlarm').observation,'deleted');
   const budget=observation.resources.find(row=>row.logical==='MeasuredBudgetAlarm');
   assert.equal(budget.observation,'unobservable');
   assert.match(budget.cost,/CloudWatch alarm charges/);
  };
  const tableStatus=scenario==='state'?'retained':'unobservable';
  checkObservation(held.current_observation,tableStatus);
  assert.equal(held.current_observation.state_persistence,'unconfirmed');
  assert.equal(held.current_observation.table_observation.status,tableStatus);
  if(scenario!=='state')assert.equal(held.current_observation.table_observation.code,code);
  assert.match(remove.stdout,/DynamoDB storage/);
  assert.match(remove.stdout,/CloudWatch alarm charges/);
  assert(remove.stdout.includes(id));
  const unavailable=await run('inspect-operation',installed,named,{branch});
  assert.equal(unavailable.exitCode,2,unavailable.stdout);
  assert.equal(unavailable.outcome.current_observation,undefined);
  delete branch.cloud.retainedTableReadFault;
  delete branch.cloud.denyProtectedStateAfterDelete;
  branch.cloud.hideDeletedStack=true;
  if(scenario!=='state')branch.cloud.faultTableAfterReadOperation=scenario;
  const checkpoint=readOnlyCheckpoint(branch);
  const inspected=requireStatus(await run('inspect-operation',installed,named,{branch}),'inspected');
  assert.equal(inspected.operation,id);
  checkObservation(inspected.current_observation,tableStatus);
  delete branch.cloud.retainedTableReadFault;
  if(scenario!=='state'){
   const blockedFile=output(`finish-late-${scenario}-blocked`);
   const blocked=await run('finish-operation',installed,[...named,'--output',blockedFile],{branch});
   const incomplete=requireStatus(blocked,'partial');
   assert.equal(blocked.exitCode,1);
   assert.equal(incomplete.code,code);
   checkObservation(incomplete.current_observation,'unobservable');
   assert(!fs.existsSync(blockedFile));
   requireReadOnly(branch,checkpoint);
  }
  delete branch.cloud.faultTableAfterReadOperation;
  delete branch.cloud.retainedTableReadFault;
  const reportFile=output(`finish-late-${scenario}-report`);
  const stored=requireStatus(await run('finish-operation',installed,[...named,'--output',reportFile],{branch}),'partial');
  assert.equal(operationRow(branch,id).terminal.status,'partial');
  checkObservation(stored.terminal,'retained');
  assert.equal(JSON.parse(fs.readFileSync(reportFile)).status,'partial');
  const history=operationRow(branch,id), storedCheckpoint=readOnlyCheckpoint(branch);
  if(scenario!=='state')branch.cloud.faultTableAfterReadOperation=scenario;
  const storedInspect=requireStatus(await run('inspect-operation',installed,named,{branch}),'inspected');
  checkObservation(storedInspect.current_observation,tableStatus);
  delete branch.cloud.retainedTableReadFault;
  const after=await run('finish-operation',installed,[...named,'--output',output(`finish-stored-${scenario}`)],{branch});
  const storedFinish=requireStatus(after,'partial');
  assert.equal(after.exitCode,1);
  assert.deepEqual(storedFinish.terminal,history.terminal);
  checkObservation(storedFinish.current_observation,tableStatus);
  assert.deepEqual(operationRow(branch,id),history);
  assert.equal(branch.audit.filter(row=>row.action==='DeleteStackCommand'&&row.input.ClientRequestToken===id).length,1);
  requireReadOnly(branch,storedCheckpoint);
  noHostWrites(branch.audit.slice(deletedIndex+1));
  results[scenario]={held,inspected,stored,storedInspect,storedFinish};
 }
 return results;
}

async function alarmFailureJourney(journey,driver,active,{changedTarget,maintenanceTarget}){
 const {f,evidence}=journey,{run,output,assetFlags,deployment,build}=driver;
 const fork=name=>forkLifecycle(f,active,name);
 const finishArgs=(target,id,name)=>['--operation',id,'--manifest',target.manifestPath,'--target-config',target.configPath,'--output',output(name)];
 const configureOn=(branch,target,name,extra=[])=>run('configure',active,[...assetFlags(target),...deployment,'--output',output(name),...extra],
  {branch,configPath:target.configPath});
 const stoppedHost=branch=>{
  assert.equal(branch.cloud.schedule.State,'DISABLED');
  assert.equal(branch.cloud.concurrency,0);
  assert.equal(installationState(branch).schedule_enabled,false);
  assert.equal(installationState(branch).writes_enabled,false);
 };
 const partial=async(branch,target,name,code)=>{
  const result=requireStatus(await configureOn(branch,target,name),'partial');
  if(code)assert.equal(result.code,code,JSON.stringify(result));
  if(fs.existsSync(output(name))){
   const record=JSON.parse(fs.readFileSync(output(name)));
   assert.equal(result.receipt_publication,'operation_record_preserved');
   assert.equal(record.operation,result.operation);
   assert.equal(record.original_receipt.manifest.zip_digest,active.manifest.zip_digest);
   assert.equal(record.manifest,undefined);
  }
  assert.equal(installationState(branch).schedule_enabled,false);
  assert.equal(installationState(branch).writes_enabled,false);
  return result;
 };
 const failures=evidence.failures={};
 const configureProtection={};
 for(const [scenario,code] of [['incompatible proposal','UNSUPPORTED_VERSION'],['incompatible inventory','MALFORMED_RECORD'],
  ['ordinary update','ALARM_OWNERSHIP_UNCONFIRMED'],['invalid window','ALARM_WINDOW_UNSUPPORTED']]){
  const branch=fork(`configure ${scenario}`);
  branch.cloud.alarmResources[0].PhysicalResourceId='unrelated-alarm';
  let target=active;
  if(scenario==='incompatible inventory'){
   const [key,row]=businessRows(branch).find(([,record])=>record.kind==='member');
   branch.provider.rows.set(key,{...row,schema:'pigboard-state-record/v99'});
  }
  if(scenario==='incompatible proposal'||scenario==='invalid window'){
   const manifest=structuredClone(active.manifest);
   const config=manifest.canonical_config;
   if(scenario==='incompatible proposal')manifest.schema='pigboard-manager-package/v999';
   else {
    config.manager.health={freshness_seconds:86401,warning_percent:80};
    config.manager.log_retention_days=3;
    manifest.configuration_digest=hostConfig(JSON.stringify(config)).digest;
   }
   target={...active,configPath:writeFixtureJSON(journey.source.temp,`configure-${scenario}-config`,config),
    manifestPath:writeFixtureJSON(journey.source.temp,`configure-${scenario}-manifest`,manifest)};
  }
  const protective=scenario.startsWith('incompatible'), checkpoint=readOnlyCheckpoint(branch);
  const response=await configureOn(branch,target,`configure-${scenario}-outcome`);
  assert.equal(response.outcome.code,code,response.stdout);
  assert.equal(response.exitCode,protective?1:2,response.stdout);
  if(protective){
   assert.equal(response.outcome.state_fenced,true);
   assert.equal(response.outcome.host,'stopped');
   assert.equal(response.outcome.alarms.code,'ALARM_OWNERSHIP_UNCONFIRMED');
   stoppedHost(branch);
   const writes=branch.audit.filter(row=>row.action==='TransactWriteCommand'||hostMutations([row]).length);
   assert.equal(writes[0].action,'TransactWriteCommand');
   assert.deepEqual(hostMutations(writes).map(row=>row.action),['UpdateScheduleCommand','PutFunctionConcurrencyCommand']);
  }else{
   assert(!fs.existsSync(output(`configure-${scenario}-outcome`)));
   requireReadOnly(branch,checkpoint,{deployer:true});
  }
  assert(!branch.audit.some(row=>row.action==='DescribeAlarmsCommand'||JSON.stringify(row.input).includes('unrelated-alarm')));
  configureProtection[scenario]=response.outcome;
 }
 failures.configureProtection=configureProtection;
 const priorPackage=structuredClone(lifecycleRow(f).current_alarm_package);
 const originalReceipt=fs.readFileSync(active.installationPath),table=structuredClone(f.cloud.table);
 for(const scenario of ['missing inventory','substituted membership','denied alarm reads']){
  const branch=fork('emergency '+scenario);
  if(scenario==='missing inventory')branch.cloud.omitStackAlarm='MissingCompletionAlarm';
  if(scenario==='substituted membership')branch.cloud.alarmResources[0].PhysicalResourceId='unrelated-alarm';
  if(scenario==='denied alarm reads')branch.cloud.denyAlarmRead=true;
  const result=requireStatus(await run('stop',active,[],{branch}),'partial');
  assert.equal(result.proof,false);
  assert.equal(result.state_fenced,true);
  stoppedHost(branch);
  assert(hostMutations(branch.audit).some(row=>row.action==='UpdateScheduleCommand'&&row.input.State==='DISABLED'));
  assert(hostMutations(branch.audit).some(row=>row.action==='PutFunctionConcurrencyCommand'&&row.input.ReservedConcurrentExecutions===0));
  assert(!hostMutations(branch.audit).some(row=>/Alarm/.test(row.action)));
  assert(!JSON.stringify(branch.audit.filter(row=>row.action==='DescribeAlarmsCommand')).includes('unrelated-alarm'));
  assert([...branch.cloud.alarms.values()].every(row=>row.ActionsEnabled===true));
  failures[scenario]=result;
 }
 for(const [scenario,code] of [['source denial','ALARM_ACTION_REJECTED'],['source rollback','DEPLOYMENT_ROLLED_BACK']]){
  const branch=fork(scenario);
  if(scenario==='source denial')branch.cloud.denyAlarmMutation='DisableAlarmActionsCommand';
  else branch.cloud.rollbackStatus='UPDATE_ROLLBACK_COMPLETE';
  const result=await partial(branch,maintenanceTarget,scenario+'-no-receipt',code);
  stoppedHost(branch);
  assert.deepEqual(branch.cloud.table,table);
  assert.equal(result.terminal.source_agreement,'committed_source');
  assert.equal(result.terminal.observed.configuration_digest,active.manifest.configuration_digest);
  assert.equal(result.terminal.alarms.alarms.length,4);
  assert(result.terminal.alarms.alarms.every(row=>row.actions_enabled===(scenario==='source denial')));
  assert.equal(providerExecutions(branch.audit).length,scenario==='source denial'?0:1);
  assert.equal(lifecycleRow(branch).owner,null);
  assert.deepEqual(lifecycleRow(branch).current_alarm_package,priorPackage);
  assert.deepEqual(fs.readFileSync(active.installationPath),originalReceipt);
  const checkpoint=readOnlyCheckpoint(branch);
  const repeat=requireStatus(await run('finish-operation',active,finishArgs(maintenanceTarget,result.operation,scenario+'-repeat'),{branch}),'partial');
  assert.deepEqual(repeat.terminal,result.terminal);
  assert(!fs.existsSync(output(scenario+'-repeat')));
  requireReadOnly(branch,checkpoint);
  failures[scenario]={result,repeat};
  if(scenario==='source denial'){
   delete branch.cloud.denyAlarmMutation;
   const retry=requireStatus(await configureOn(branch,maintenanceTarget,scenario+'-usable-original'),'configured');
   assert.equal(retry.observed.configuration_digest,maintenanceTarget.manifest.configuration_digest);
   failures[scenario].retry=retry;
  }
 }
 const foreign=fork('foreign rollback token');
 foreign.cloud.rollbackStatus='UPDATE_ROLLBACK_COMPLETE';
 foreign.cloud.rollbackToken='23230000-dead-4bad-8cad-0123456789ab';
 const tokenRefused=await partial(foreign,maintenanceTarget,'foreign-rollback','PROVIDER_TERMINAL_UNCONFIRMED');
 stoppedHost(foreign);
 assert.equal(lifecycleRow(foreign).owner.id,tokenRefused.operation);
 assert(lifecycleRow(foreign).owner.effects.some(effect=>effect.name==='execute-change-set'&&effect.state==='claimed'));
 assert.deepEqual(lifecycleRow(foreign).current_alarm_package,priorPackage);
 const tokenBefore=readOnlyCheckpoint(foreign);
 const tokenRepeat=await run('finish-operation',active,finishArgs(maintenanceTarget,tokenRefused.operation,'foreign-rollback-repeat'),{branch:foreign});
 assert.equal(tokenRepeat.outcome.code,'PROVIDER_TERMINAL_UNCONFIRMED',tokenRepeat.stdout);
 assert(!fs.existsSync(output('foreign-rollback-repeat')));
 requireReadOnly(foreign,tokenBefore);
 failures.foreignRollback={tokenRefused,tokenRepeat:tokenRepeat.outcome};
 const altered=structuredClone(changedTarget.manifest.canonical_config);
 altered.manager.log_retention_days=5;
 const target=build('h02-distinct-scheduled-host',altered);
 assert.notEqual(target.manifest.zip_digest,active.manifest.zip_digest);
 assert.notEqual(target.manifest.configuration_digest,active.manifest.configuration_digest);
 const controls={fork,finishArgs,configureOn,partial,stoppedHost,priorPackage,failures,table};
 await alarmConfigureRecovery(driver,active,changedTarget,target,controls);
 await alarmChangedHostRecovery(driver,active,target,controls);
 await alarmUpgradeAndManualJourney(journey,driver,active,{changedTarget,maintenanceTarget,table});
}

async function alarmConfigureRecovery(driver,active,changedTarget,target,{fork,finishArgs,configureOn,partial,priorPackage,failures}){
 const {run,output,assetFlags,deployment}=driver;
 const pending=fork('interruption after recorded stamp and first custom alarm');
 pending.cloud.interruptAlarmClaim='put-budget-alarm';
 const held=await partial(pending,target,'pending-custom-suffix');
 const id=held.operation,owner=lifecycleRow(pending).owner;
 assert.equal(owner.id,id);
 assert.equal(owner.verified_enablement.health_generation,id);
 assert.deepEqual(owner.effects.slice(-2).map(effect=>[effect.name,effect.state]),[['put-completion-alarm','settled'],['put-budget-alarm','pending']]);
 assert.equal(pending.cloud.function.Environment.Variables.PB_CONFIGURATION_DIGEST,target.manifest.configuration_digest);
 assert.deepEqual(lifecycleRow(pending).current_alarm_package,priorPackage);
 delete pending.cloud.interruptAlarmClaim;
 const resume=['--resume-operation',id],checkpoint=readOnlyCheckpoint(pending);
 for(const [flag,subject,code] of [[resume,changedTarget,'OPERATION_TARGET_MISMATCH'],
  [['--resume-operation','23230000-dead-4bad-8cad-0123456789ab'],target,'ALARM_RESUME_STALE']]){
  const refused=await configureOn(pending,subject,'refused-resume',flag);
  assert.equal(refused.outcome.code,code,refused.stdout);
  assert(!fs.existsSync(output('refused-resume')));
 }
 pending.cloud.operatorSession='other-session';
 const wrongActor=await configureOn(pending,target,'wrong-operator',resume);
 assert.equal(wrongActor.outcome.code,'ALARM_RESUME_STALE',wrongActor.stdout);
 delete pending.cloud.operatorSession;
 requireReadOnly(pending,checkpoint,{deployer:true});
 const mutationsBefore=pending.audit.length;
 const resumed=requireStatus(await configureOn(pending,target,'resumed-custom-suffix',resume),'configured');
 assert.equal(resumed.operation,id);
 assert.deepEqual(hostMutations(pending.audit.slice(mutationsBefore)).map(row=>row.action),['PutMetricAlarmCommand']);
 assert.equal(hostMutations(pending.audit.slice(mutationsBefore))[0].input.AlarmName,actualAlarmRows(pending)[3].name);
 assert.equal(providerExecutions(pending.audit).length,1);
 assert.deepEqual(alarmEpoch(pending),owner.verified_enablement);
 const resumedInstalled={...target,installationPath:output('resumed-custom-suffix')};
 const newer=requireStatus(await run('configure',resumedInstalled,[...assetFlags(changedTarget),...deployment,
  '--output',output('later-physical-target')],{branch:pending,configPath:changedTarget.configPath}),'configured');
 assert.notEqual(newer.observed.configuration_digest,resumed.observed.configuration_digest);
 const laterCheckpoint=readOnlyCheckpoint(pending);
 const exported=requireStatus(await run('finish-operation',active,finishArgs(target,id,'original-terminal-export'),{branch:pending}),'configured');
 assert.equal(exported.operation,id);
 assert.equal(JSON.parse(fs.readFileSync(output('original-terminal-export'))).manifest.zip_digest,target.manifest.zip_digest);
 requireReadOnly(pending,laterCheckpoint);
 failures.resumedCustom={held,owner,resumed,exported};

 const missing=fork('first stamp unavailable');
 missing.cloud.enablementWriteFault='before';
 const missingResult=await partial(missing,target,'missing-stamp');
 assert.equal(lifecycleRow(missing).owner.verified_enablement,undefined);
 assert.equal(hostMutations(missing.audit).filter(row=>row.action==='PutMetricAlarmCommand').length,0);
 const missingBefore=readOnlyCheckpoint(missing);
 const noStamp=await run('finish-operation',active,finishArgs(target,missingResult.operation,'missing-stamp-finish'),{branch:missing});
 assert.equal(noStamp.outcome.code,'ENABLEMENT_UNVERIFIED',noStamp.stdout);
 requireReadOnly(missing,missingBefore);
 failures.missingStamp={missingResult,noStamp};

 const lost=fork('lost custom request response');
 lost.cloud.loseAlarmReply='PutMetricAlarmCommand';
 const lostResult=await partial(lost,target,'unaccounted-custom-put');
 assert(lifecycleRow(lost).owner.effects.some(effect=>effect.name==='put-completion-alarm'&&effect.state==='claimed'));
 assert.equal(hostMutations(lost.audit).filter(row=>row.action==='PutMetricAlarmCommand').length,1);
 const lostBefore=readOnlyCheckpoint(lost);
 const noReplay=await configureOn(lost,target,'refused-unaccounted',['--resume-operation',lostResult.operation]);
 assert.equal(noReplay.outcome.code,'ALARM_RESUME_INCOMPLETE',noReplay.stdout);
 requireReadOnly(lost,lostBefore,{deployer:true});
 failures.uncertain={lostResult,noReplay};

 const drift=fork('host drift after verified enablement');
 drift.cloud.driftOnAlarmPut=true;
 const drifted=await partial(drift,target,'put-host-drift','HOST_UNCONFIRMED');
 assert.equal(drift.cloud.schedule.State,'DISABLED');
 assert.equal(drift.cloud.concurrency,1);
 assert.deepEqual(lifecycleRow(drift).current_alarm_package,priorPackage);
 failures.drift=drifted;

 const repeat=fork('all unchanged enabled effects settled except State promotion');
 const existingEpoch=alarmEpoch(repeat);
 repeat.dependencies.beforeLifecycleFinish=()=>{throw Error('fixture interruption before promotion');};
 const interrupted=await partial(repeat,changedTarget,'unchanged-before-state-finish');
 delete repeat.dependencies.beforeLifecycleFinish;
 const repeatStart=repeat.audit.length;
 const settled=requireStatus(await run('finish-operation',active,finishArgs(changedTarget,interrupted.operation,'unchanged-state-only-finish'),{branch:repeat}),'configured');
 assert.deepEqual(alarmEpoch(repeat),existingEpoch);
 noHostWrites(repeat.audit.slice(repeatStart));
 assert.equal(providerExecutions(repeat.audit).length,1);
 failures.readOnlyFinish={interrupted,settled};
}

async function alarmChangedHostRecovery(driver,active,target,{fork,finishArgs,partial,stoppedHost,priorPackage,failures,table}){
 const {run,output,assetFlags,deployment,build}=driver;
 const {readAlarmHealthFixture}=await import('./test-manager-health.mjs');
 const successorMaintenance=changedControls(target.manifest.canonical_config,{schedule_enabled:false,writes_enabled:false,maintenance:true});
 const bridgeTarget=build('changed-host-bridge',successorMaintenance);
 const branch=fork('changed deployed host with denied native actions');
 branch.cloud.denyAlarmMutation='EnableAlarmActionsCommand';
 const denied=await partial(branch,target,'changed-arming-denied','ALARM_ACTION_REJECTED');
 stoppedHost(branch);
 assert.equal(denied.terminal.source_agreement,'installed_target');
 assert.equal(denied.terminal.provider.status,'UPDATE_COMPLETE');
 assert.equal(denied.terminal.provider.operation,denied.operation);
 assert.equal(denied.terminal.observed.configuration_digest,target.manifest.configuration_digest);
 assert.equal(denied.terminal.observed.code_hash,Buffer.from(target.manifest.zip_digest.slice(7),'hex').toString('base64'));
 assert.equal(lifecycleRow(branch).owner.id,denied.operation);
 assert(lifecycleRow(branch).owner.effects.some(effect=>effect.name==='enable-native-alarm-actions'&&effect.state==='rejected'));
 assert.equal(lifecycleRow(branch).owner.verified_enablement,undefined);
 assert.deepEqual(lifecycleRow(branch).current_alarm_package,priorPackage);
 checkAlarmActions(branch,false);
 const denialCheckpoint=readOnlyCheckpoint(branch);
 const stillHeld=requireStatus(await run('finish-operation',active,finishArgs(target,denied.operation,'changed-denial-still-held'),{branch}),'partial');
 assert.equal(stillHeld.outcome,'held');
 assert(!fs.existsSync(output('changed-denial-still-held')));
 requireReadOnly(branch,denialCheckpoint);
 delete branch.cloud.denyAlarmMutation;
 const fenced=await run('stop',active,[],{branch});
 assert.equal(fenced.outcome.code,'HOST_OWNER_ACTIVE',fenced.stdout);
 const recoveryStart=branch.audit.length;
 const recovered=requireStatus(await run('finish-operation',active,finishArgs(target,denied.operation,'changed-host-recovery'),{branch}),'superseded');
 assert.equal(recovered.operation,denied.operation);
 assert.equal(recovered.terminal.provider.operation,denied.operation);
 assert.equal(recovered.terminal.observed.configuration_digest,target.manifest.configuration_digest);
 assert.deepEqual(lifecycleRow(branch).current_alarm_package,priorPackage);
 noHostWrites(branch.audit.slice(recoveryStart));
 const restricted={...target,installationPath:output('changed-host-recovery')};
 assert.equal(JSON.parse(fs.readFileSync(restricted.installationPath)).recovery_only.operation,denied.operation);
 const bridgeArgs=['--original-installation',active.installationPath,'--operation',denied.operation,'--source-manifest',target.manifestPath,
  ...assetFlags(bridgeTarget),...deployment];
 const runBridge=(name,more=[])=>run('maintenance-only',restricted,[...bridgeArgs,...more,'--output',output(name)],
  {branch,configPath:bridgeTarget.configPath});
 branch.cloud.interruptAlarmClaim='put-budget-alarm';
 const bridgeHold=requireStatus(await runBridge('bridge-held'),'partial');
 assert.notEqual(bridgeHold.operation,denied.operation);
 assert.equal(branch.cloud.codeHash,Buffer.from(bridgeTarget.manifest.zip_digest.slice(7),'hex').toString('base64'));
 assert.equal(lifecycleRow(branch).owner.details.superseded_operation,denied.operation);
 assert.equal(lifecycleRow(branch).owner.details.predecessor_fence,recovered.fence);
 assert.deepEqual(lifecycleRow(branch).owner.effects.slice(-2).map(effect=>effect.state),['settled','pending']);
 delete branch.cloud.interruptAlarmClaim;
 const bridgeStart=branch.audit.length;
 const bridge=requireStatus(await runBridge('bridge-resumed',['--resume-operation',bridgeHold.operation]),'configured');
 assert.equal(bridge.operation,bridgeHold.operation);
 assert.deepEqual(hostMutations(branch.audit.slice(bridgeStart)).map(row=>row.action),['PutMetricAlarmCommand']);
 assert.deepEqual(providerExecutions(branch.audit).map(row=>row.input.ClientRequestToken),[denied.operation,bridge.operation]);
 assert.deepEqual(branch.cloud.table,table);
 assert.equal(lifecycleRow(branch).current_alarm_package.zip_digest,bridgeTarget.manifest.zip_digest);
 const bridgeInstalled={...bridgeTarget,installationPath:output('bridge-resumed')};
 const bridgeHealth=await readAlarmHealthFixture(branch,bridgeInstalled);
 assert.equal(bridgeHealth.json.outcome.alarm_evidence.current.evidence_revision,null);
 assert(!bridgeHealth.telemetry.some(row=>row.action==='GetMetricStatisticsCommand'));
 failures.changedHost={denied,stillHeld,fenced:fenced.outcome,recovered,bridgeHold,bridge,bridgeHealth};
}

async function alarmUpgradeAndManualJourney(journey,driver,active,{changedTarget,maintenanceTarget,table}){
 const {f,evidence}=journey,{run,output,assetFlags,deployment,build,nextPin}=driver;
 const {readAlarmHealthFixture}=await import('./test-manager-health.mjs');
 const fork=name=>forkLifecycle(f,active,name);
 const manual=changedControls(active.manifest.canonical_config,{mode:'apply',schedule_enabled:false,writes_enabled:true,maintenance:false});
 manual.manager.activation=Object.fromEntries(Object.keys(manual.manager.activation).map(key=>[key,true]));
 manual.manager.invocation_timeout_seconds=480;
 manual.manager.schedule_minutes=10;
 const manualTarget=build('alarm-manual-writes-only',manual);
 const successor=build('alarm-four-to-four',active.manifest.canonical_config,{revision:nextPin(),compatibleFrom:active.manifest.source_revision});
 const branch=fork('four-to-four upgrade pending custom suffix');
 const previewPath=output('alarm-four-to-four-preview');
 requireStatus(await run('upgrade-preview',active,[...assetFlags(successor),'--output',previewPath],{branch}),'previewed');
 const upgradeArgs=[...assetFlags(successor),...deployment,'--preview',previewPath];
 branch.cloud.interruptAlarmClaim='put-budget-alarm';
 const interruption=requireStatus(await run('upgrade',active,[...upgradeArgs,'--output',output('alarm-upgrade-interruption')],{branch}),'partial');
 assert(lifecycleRow(branch).owner.effects.some(effect=>effect.name==='put-budget-alarm'&&effect.state==='pending'));
 assert.equal(lifecycleRow(branch).owner.details.target.zip_digest,successor.manifest.zip_digest);
 assert.equal(branch.cloud.function.Environment.Variables.PB_PACKAGE_REVISION,successor.manifest.source_revision);
 delete branch.cloud.interruptAlarmClaim;
 const start=branch.audit.length,finalFile=output('alarm-four-to-four-resumed');
 const four=requireStatus(await run('upgrade',active,[...upgradeArgs,'--resume-operation',interruption.operation,'--output',finalFile],{branch}),'upgraded');
 assert.equal(four.operation,interruption.operation);
 assert.deepEqual(hostMutations(branch.audit.slice(start)).map(row=>row.action),['PutMetricAlarmCommand']);
 assert.equal(providerExecutions(branch.audit).length,1);
 assert.deepEqual(branch.cloud.alarmResources,f.cloud.alarmResources);
 assert.equal(branch.stackId,f.stackId);
 assert.deepEqual(branch.cloud.table,table);
 assert.deepEqual(businessRows(branch),businessRows(f));
 checkAlarmActions(branch,false);
 const inactive=await readAlarmHealthFixture(branch,{...successor,installationPath:finalFile});
 assert.equal(inactive.json.outcome.alarm_evidence.current.evidence_revision,null);
 assert(!inactive.telemetry.some(row=>row.action==='GetMetricStatisticsCommand'));
 evidence.failures.fourToFour={interruption,four,inactive};

 const replacement=fork('unapproved CFN alarm replacement');
 replacement.cloud.changes=[{ResourceChange:{Action:'Modify',LogicalResourceId:'MeasuredBudgetAlarm',
  ResourceType:'AWS::CloudWatch::Alarm',PhysicalResourceId:actualAlarmRows(f)[3].name,Replacement:'True',
  Details:[{Target:{Attribute:'Properties',Name:'Threshold'}}]}}];
 const refused=requireStatus(await run('configure',active,[...assetFlags(changedTarget),...deployment,
  '--output',output('alarm-replacement-refused')],{branch:replacement}),'partial');
 assert.equal(refused.code,'UNSUPPORTED_CHANGE_SET');
 assert.equal(providerExecutions(replacement.audit).length,0);
 assert.equal(installationState(replacement).schedule_enabled,false);
 evidence.failures.replacement=refused;

 const guarded=fork('protected refusal with damaged alarm membership');
 const refusal=output('alarm-upgrade-refusal');
 const result=await run('upgrade-preview',active,[...assetFlags(changedTarget),'--output',refusal],{branch:guarded});
 assert.equal(result.outcome.status,'refused',result.stdout);
 assert.equal(result.outcome.code,'UNSUPPORTED_UPGRADE',result.stdout);
 guarded.cloud.omitStackAlarm='MeasuredBudgetAlarm';
 const refusedArgs=[...assetFlags(changedTarget),...deployment,'--protect-rejected',refusal];
 const protectedResult=requireStatus(await run('upgrade',active,[...refusedArgs,'--output',output('alarm-upgrade-protected')],{branch:guarded}),'partial');
 assert.equal(protectedResult.state_fenced,true);
 assert.equal(protectedResult.host,'stopped');
 assert.equal(protectedResult.alarms.code,'ALARM_OWNERSHIP_UNCONFIRMED');
 assert.equal(providerExecutions(guarded.audit).length,0);
 assert(!hostMutations(guarded.audit).some(row=>/Alarm/.test(row.action)));
 const stale=fork('stale protected refusal');
 lifecycleRow(stale).revision++;
 const staleBefore=readOnlyCheckpoint(stale);
 const rejected=await run('upgrade',active,[...refusedArgs,'--output',output('alarm-upgrade-refusal-stale')],{branch:stale});
 assert.equal(rejected.outcome.code,'UPGRADE_REFUSAL_STALE',rejected.stdout);
 requireReadOnly(stale,staleBefore,{deployer:true});
 evidence.failures.protectedRefusal={result,protectedResult,rejected};

 const maintenanceFork=fork('strict stop pending suppression');
 const maintenanceReceipt=output('alarm-strict-stop-maintenance');
 requireStatus(await run('configure',active,[...assetFlags(maintenanceTarget),...deployment,'--output',maintenanceReceipt],
  {branch:maintenanceFork,configPath:maintenanceTarget.configPath}),'configured');
 const maintenance={...maintenanceTarget,installationPath:maintenanceReceipt};
 maintenanceFork.cloud.interruptAlarmClaim='disable-alarm-actions';
 const pending=requireStatus(await run('stop',maintenance,[],{branch:maintenanceFork}),'partial');
 assert(lifecycleRow(maintenanceFork).owner.effects.some(effect=>effect.name==='disable-alarm-actions'&&effect.state==='pending'));
 delete maintenanceFork.cloud.interruptAlarmClaim;
 const stopStart=maintenanceFork.audit.length;
 const strict=requireStatus(await run('stop',maintenance,['--resume-operation',pending.operation],{branch:maintenanceFork}),'stopped');
 assert.equal(strict.stop.pb_stop_id,pending.operation);
 assert.deepEqual(hostMutations(maintenanceFork.audit.slice(stopStart)).map(row=>row.action),['DisableAlarmActionsCommand']);
 checkAlarmActions(maintenanceFork,false);
 evidence.failures.resumedStop={pending,strict};

 const manualFork=fork('manual writes only');
 const manualReceipt=output('alarm-manual-writes-receipt');
 const manualConfigured=requireStatus(await run('configure',active,[...assetFlags(manualTarget),...deployment,'--output',manualReceipt],
  {branch:manualFork,configPath:manualTarget.configPath}),'configured');
 assert.equal(installationState(manualFork).writes_enabled,true);
 assert.equal(manualFork.cloud.schedule.State,'DISABLED');
 assert.equal(manualFork.cloud.concurrency,1);
 assert.equal(lifecycleRow(manualFork).current_alarm_package.intent,'manual-writes-only');
 assert.deepEqual(alarmEpoch(manualFork),alarmEpoch(f));
 checkAlarmActions(manualFork,false);
 const manualHealth=await readAlarmHealthFixture(manualFork,{...manualTarget,installationPath:manualReceipt});
 assert.equal(manualHealth.json.outcome.alarm_evidence.current.evidence_revision,null);
 assert(!manualHealth.telemetry.some(row=>row.action==='GetMetricStatisticsCommand'));
 const runManual=(branch,name,flags=[])=>run('configure',active,[...assetFlags(manualTarget),...deployment,'--output',output(name),...flags],
  {branch,configPath:manualTarget.configPath});
 const manualHeld=fork('writes-only dormant mutex suffix');
 manualHeld.cloud.interruptAlarmClaim='put-budget-alarm';
 const manualPending=requireStatus(await runManual(manualHeld,'alarm-manual-pending'),'partial');
 const manualOwner=lifecycleRow(manualHeld).owner;
 assert.equal(manualOwner.verified_enablement,undefined);
 assert.deepEqual(manualOwner.effects.slice(-2).map(effect=>effect.state),['settled','pending']);
 assert.equal(manualHeld.cloud.schedule.State,'DISABLED');
 assert.equal(manualHeld.cloud.concurrency,1);
 delete manualHeld.cloud.interruptAlarmClaim;
 const resumeStart=manualHeld.audit.length;
 const manualResumed=requireStatus(await runManual(manualHeld,'alarm-manual-resumed',['--resume-operation',manualPending.operation]),'configured');
 assert.equal(manualResumed.operation,manualPending.operation);
 assert.deepEqual(hostMutations(manualHeld.audit.slice(resumeStart)).map(row=>row.action),['PutMetricAlarmCommand']);
 assert.equal(installationState(manualHeld).writes_enabled,true);
 assert.deepEqual(alarmEpoch(manualHeld),alarmEpoch(f));
 checkAlarmActions(manualHeld,false);
 const manualReadOnly=fork('writes-only all effects settled before finish');
 manualReadOnly.dependencies.beforeLifecycleFinish=()=>{throw Error('fixture interruption before manual promotion');};
 const manualReleased=requireStatus(await runManual(manualReadOnly,'alarm-manual-before-finish'),'partial');
 delete manualReadOnly.dependencies.beforeLifecycleFinish;
 assert(lifecycleRow(manualReadOnly).owner.effects.every(effect=>effect.state==='settled'));
 assert.equal(lifecycleRow(manualReadOnly).owner.verified_enablement,undefined);
 assert.equal(manualReadOnly.cloud.schedule.State,'DISABLED');
 assert.equal(manualReadOnly.cloud.concurrency,1);
 const manualFinish=(branch,name)=>run('finish-operation',active,['--operation',manualReleased.operation,
  '--manifest',manualTarget.manifestPath,'--target-config',manualTarget.configPath,'--output',output(name)],{branch});
 const finishDrift=forkLifecycle(manualReadOnly,active,'writes-only finish at zero reserved concurrency');
 finishDrift.cloud.concurrency=0;
 const staleFinish=readOnlyCheckpoint(finishDrift);
 const manualRefused=await manualFinish(finishDrift,'alarm-manual-finish-refused');
 assert.equal(manualRefused.outcome.code,'HOST_UNCONFIRMED',manualRefused.stdout);
 assert(!fs.existsSync(output('alarm-manual-finish-refused')));
 requireReadOnly(finishDrift,staleFinish);
 const manualFinishStart=manualReadOnly.audit.length;
 const manualFinished=requireStatus(await manualFinish(manualReadOnly,'alarm-manual-finish'),'configured');
 assert.equal(installationState(manualReadOnly).writes_enabled,true);
 assert.deepEqual(alarmEpoch(manualReadOnly),alarmEpoch(f));
 noHostWrites(manualReadOnly.audit.slice(manualFinishStart));
 checkAlarmActions(manualReadOnly,false);
 const drift=fork('unexpected schedule state during writes-only PutMetricAlarm');
 drift.cloud.driftOnAlarmPut='ENABLED';
 const drifted=requireStatus(await runManual(drift,'alarm-manual-drift'),'partial');
 assert.equal(drifted.code,'HOST_UNCONFIRMED');
 assert.equal(installationState(drift).writes_enabled,false);
 assert.deepEqual(alarmEpoch(drift),alarmEpoch(f));
 const concurrencyDrift=fork('unexpected concurrency during writes-only PutMetricAlarm');
 concurrencyDrift.cloud.driftConcurrencyOnAlarmPut=0;
 const zeroed=requireStatus(await runManual(concurrencyDrift,'alarm-manual-concurrency-drift'),'partial');
 assert.equal(zeroed.code,'HOST_UNCONFIRMED');
 assert.equal(installationState(concurrencyDrift).writes_enabled,false);
 assert.deepEqual(alarmEpoch(concurrencyDrift),alarmEpoch(f));
 evidence.failures.manual={manualConfigured,manualHealth,manualPending,manualResumed,manualReleased,manualFinished,
  manualRefused:manualRefused.outcome,drifted,zeroed};
}

async function alarmReconciliationJourney(){
 const {lifecycleSenderConfig,runLifecycleSender}=await import('./test-manager-apply.mjs');
 const journey=await lifecycleBirthJourney({config:lifecycleSenderConfig(),historicalRegression:true});
 const {source,f,evidence,state,dependencies}=journey;
 const {initial,run,configure,output,build,nextPin,assetFlags,deployment}=lifecycleDriver(journey);
 try{
  const activeConfig=lifecycleSenderConfig({disabled:false});
  const original=await configure(initial,build('h02-legacy-sender',activeConfig),'h02-original-sender-receipt');
  const revision=nextPin(),previous=original.manifest.source_revision;
  const successor=build('h02-capable-sender',activeConfig,{revision,compatibleFrom:previous,historicalRegression:false});
  const sender=await runLifecycleSender({...f,binding:JSON.parse(fs.readFileSync(original.installationPath)).binding,dependencies},
   original.manifest,async({provider,attemptId})=>{
    const retained=businessRows(f),table=structuredClone(f.cloud.table);
    assert(retained.some(([,row])=>row.kind==='attempt'&&row.attempt_id===attemptId&&row.outcome==='pending'));
    const preview=output('h02-reconciliation-preview'),receipt=output('h02-reconciliation-upgrade');
    requireStatus(await run('upgrade-preview',original,[...assetFlags(successor),'--output',preview]),'previewed');
    const upgraded=requireStatus(await run('upgrade',original,[...assetFlags(successor),...deployment,'--preview',preview,'--output',receipt]),'upgraded');
    const adopted={...successor,installationPath:receipt};
    assert.deepEqual(businessRows(f),retained);
    checkAlarmActions(f,false);
    const maintenanceConfig=changedControls(activeConfig,{schedule_enabled:false,writes_enabled:false,maintenance:true});
    const maintenanceTarget=build('h02-reconciliation-maintenance',maintenanceConfig,{revision,historicalRegression:false});
    const maintenance=await configure(adopted,maintenanceTarget,'h02-reconciliation-maintenance-receipt');
    const drained=requireStatus(await run('stop',maintenance),'stopped');
    assert.equal(drained.proof,true);
    const before=readOnlyCheckpoint(f);
    const blocked=await run('configure',maintenance,[...assetFlags(successor),...deployment,'--output',output('h02-unreconciled')],{configPath:successor.configPath});
    assert.equal(blocked.outcome.code,'PENDING_RECONCILIATION',blocked.stdout);
    requireReadOnly(f,before,{deployer:true});
    const records=provider.records();
    const decision={schema:'pigboard-reconciliation-request/v1',attempt_id:attemptId,disposition:'confirmed_applied',
     expected_installation_revision:records.find(row=>row.kind==='installation').revision,
     expected_stream_revision:records.find(row=>row.kind==='stream').revision,
     expected_attempt_revision:records.find(row=>row.kind==='attempt'&&row.attempt_id===attemptId).revision};
    const request=writeFixtureJSON(source.temp,'h02-reconciliation-request',decision);
    const reconciled=await state(['reconcile','--config',maintenance.configPath,'--installation',maintenance.installationPath,
      '--original-installation',original.installationPath,'--operator-profile','operator','--request',request,'--json']);
    assert.equal(reconciled.exitCode,0,reconciled.stdout);
    assert.equal(provider.records().find(row=>row.attempt_id===attemptId).outcome,'applied');
    const enabled=await configure(maintenance,successor,'h02-reconciled-restart');
    assert.equal(f.cloud.schedule.State,'ENABLED');
    assert.equal(f.cloud.concurrency,1);
    assert.equal(installationState(f).writes_enabled,true);
    checkAlarmActions(f,true);
    assert.deepEqual(f.cloud.table,table);
    return {upgraded,drained,decision,reconciled,enabled:JSON.parse(fs.readFileSync(enabled.installationPath)).binding};
   });
  return {commands:evidence.commands,jira_reads:sender.sender.lifecycle_jira_reads,result:sender.sender.lifecycle};
 }catch(error){error.reconciliationEvidence=evidence;throw error;}
 finally{source.cleanup();}
}

export async function runAlarmLifecycleFixture(id){
 assert(hostFixture().alarms.cases.includes(id));
 const journey=await lifecycleBirthJourney({historical:id==='R1-23-H02',exerciseBootstrapRecovery:id==='R1-23-H01'});
 const {source,evidence,f}=journey;
 Object.assign(evidence,{case:id,fixture:hostFixture().alarms.schema,simulated_account:f.config.manager.aws.account_id,
  simulated_roles:hostFixture().alarms.simulated_roles,omissions:['AWS evaluation and IAM','installed acceptance','human execution and acceptance']});
 try{
  if(id==='R1-23-H01')await alarmPackageJourney(journey);
  else {
   await alarmLifeJourney(journey);
   evidence.reconciliation=await alarmReconciliationJourney();
  }
  return evidence;
 }catch(error){
  if(error.reconciliationEvidence)evidence.reconciliation=error.reconciliationEvidence;
  error.fixtureEvidence=evidence;
  throw error;
 }
 finally{source.cleanup();}
}

async function configureRecoveryJourney(journey,driver,enabled){
 const {f,evidence}=journey;
 const {run,output,build,assetFlags,deployment}=driver;
 const epoch=branch=>{
  const {health_generation,health_enabled_at}=installationState(branch).extensions;
  assert(health_generation&&health_enabled_at);
  return {health_generation,health_enabled_at};
 };
 const initialEpoch=epoch(f);
 const configureArgs=name=>[...assetFlags(enabled),...deployment,'--output',output(name)];
 const targetArgs=['--manifest',enabled.manifestPath,'--target-config',enabled.configPath];
 const regular=forkLifecycle(f,enabled,'identical enabled configure preserves health observations');
 requireStatus(await run('configure',enabled,configureArgs('same-epoch'),{branch:regular}),'configured');
 assert.deepEqual(epoch(regular),initialEpoch);
 const lost=forkLifecycle(f,enabled,'lost enabled configure response preserves health observations');
 lost.dependencies.beforeLifecycleFinish=()=>{throw Error('simulated interruption before final State commit');};
 const lostResult=requireStatus(await run('configure',enabled,configureArgs('lost-epoch'),{branch:lost}),'partial');
 delete lost.dependencies.beforeLifecycleFinish;
 assert.equal(installationState(lost).schedule_enabled,false);
 assert.deepEqual(epoch(lost),initialEpoch);
 const lostStart=lost.audit.length;
 requireStatus(await run('finish-operation',enabled,['--operation',lostResult.operation,...targetArgs,
   '--output',output('recovered-epoch')],{branch:lost}),'configured');
 assert.deepEqual(epoch(lost),initialEpoch);
 assert.equal(installationState(lost).schedule_enabled,true);
 operatorOnly(lost.audit.slice(lostStart));
 noHostWrites(lost.audit.slice(lostStart));
 assert.equal(providerExecutions(lost.audit).length,1);
 const unknown=forkLifecycle(f,enabled,'unresolved claimed enabling Scheduler call');
 unknown.cloud.loseEnableScheduleReply=true;
 const lostSchedule=requireStatus(await run('configure',enabled,configureArgs('lost-scheduler-reply'),{branch:unknown}),'partial');
 const lostNamed=['--operation',lostSchedule.operation];
 assert.equal(unknown.cloud.schedule.State,'ENABLED');
 assert.equal((await run('stop',enabled,[],{branch:unknown})).outcome.code,'HOST_OWNER_ACTIVE');
 const uncertainStart=unknown.audit.length;
 const heldUnknown=requireStatus(await run('inspect-operation',enabled,lostNamed,{branch:unknown}),'inspected');
 assert.equal(heldUnknown.outcome,'held');
 assert(heldUnknown.effects.some(effect=>effect.name==='enable-schedule'&&effect.state==='claimed'));
 const denied=await run('finish-operation',enabled,[...lostNamed,...targetArgs,'--output',output('unresolved-scheduler')],
   {branch:unknown});
 assert.equal(denied.outcome.code,'HOST_DISPATCH_UNACCOUNTED',denied.stdout);
 assert.equal(operationRow(unknown,lostSchedule.operation),undefined);
 noHostWrites(unknown.audit.slice(uncertainStart));
 assert.equal(providerExecutions(unknown.audit).length,1);
 const branch=forkLifecycle(f,enabled,'superseded enabling configure');
 const options={branch};
 branch.dependencies.beforeLifecycleFinish=async()=>{
  assert.equal(branch.cloud.schedule.State,'ENABLED');
  assert.equal(branch.cloud.concurrency,1);
  const start=branch.audit.length;
  const stopped=await run('stop',enabled,[],options);
  assert.equal(stopped.outcome.code,'HOST_OWNER_ACTIVE',stopped.stdout);
  noHostWrites(branch.audit.slice(start));
 };
 const interrupted=await run('configure',enabled,[...assetFlags(enabled),...deployment,
   '--output',output('interrupted-enable')],options);
 delete branch.dependencies.beforeLifecycleFinish;
 assert.equal(interrupted.outcome.status,'partial',interrupted.stdout);
 const id=interrupted.outcome.operation,named=['--operation',id];
 const start=branch.audit.length;
 const held=requireStatus(await run('inspect-operation',enabled,named,options),'inspected');
 assert.equal(held.outcome,'awaiting_finish');
 for(const name of ['execute-change-set','enable-concurrency','enable-schedule'])
  assert.equal(held.effects.find(effect=>effect.name===name)?.state,'settled',name);
 const recoveryPath=output('enabling-recovery');
 const finish=requireStatus(await run('finish-operation',enabled,[...named,'--manifest',enabled.manifestPath,
   '--target-config',enabled.configPath,'--output',recoveryPath],options),'superseded');
 assert.equal(finish.terminal.observed.schedule,'ENABLED');
 assert.equal(finish.terminal.observed.concurrency,1);
 operatorOnly(branch.audit.slice(start));
 noHostWrites(branch.audit.slice(start));
 assert.equal(installationState(branch).schedule_enabled,false);
 const recovery=JSON.parse(fs.readFileSync(recoveryPath));
 assert.equal(recovery.recovery_only.kind,'configure');
 const installed={...enabled,installationPath:recoveryPath};
 const protective=forkLifecycle(branch,enabled,'operator protective stop on configure successor');
 const stopped=requireStatus(await run('stop',installed,[],{branch:protective}),'stopped');
 assert.equal(stopped.proof,false);
 assert.equal(protective.cloud.schedule.State,'DISABLED');
 assert.equal(protective.cloud.concurrency,0);
 operatorOnly(protective.audit);
 const maintenance=build('configure-recovery-maintenance',changedControls(enabled.manifest.canonical_config,
   {schedule_enabled:false,writes_enabled:false,maintenance:true}));
 // The build adapter publishes the asset before calling the isolated host.
 branch.cloud.assets.set(JSON.parse(fs.readFileSync(maintenance.assetPath)).version,
   Buffer.from(maintenance.manifest.zip_digest.slice(7),'hex').toString('base64'));
 const maintenancePath=output('configure-recovery-maintenance-receipt');
 const bridge=['--original-installation',enabled.installationPath,...named,
   '--source-manifest',enabled.manifestPath,...assetFlags(maintenance),...deployment];
 const rejected=await run('maintenance-only',installed,[...bridge,'--output',output('stale-configure-recovery')],
   {configPath:maintenance.configPath,branch:protective});
 assert.equal(rejected.exitCode,2,rejected.stdout);
 assert.equal(rejected.outcome.code,'MAINTENANCE_HANDOFF_STALE',rejected.stdout);
 assert.equal(providerExecutions(protective.audit).length,0);
 const bridgeStart=branch.audit.length;
 requireStatus(await run('maintenance-only',installed,[...bridge,'--output',maintenancePath],
   {...options,configPath:maintenance.configPath}),'configured');
 const bridgeAudit=branch.audit.slice(bridgeStart);
 assert(bridgeAudit.some(row=>row.action==='UpdateScheduleCommand'&&row.input.State==='DISABLED'));
 assert(bridgeAudit.some(row=>row.action==='PutFunctionConcurrencyCommand'&&row.input.ReservedConcurrentExecutions===0));
 assert(!bridgeAudit.some(row=>row.action==='UpdateScheduleCommand'&&row.input.State==='ENABLED'||
   row.action==='PutFunctionConcurrencyCommand'&&row.input.ReservedConcurrentExecutions!==0));
 assert.equal(providerExecutions(branch.audit).filter(row=>row.input.ClientRequestToken===id).length,1);
 const strict=requireStatus(await run('stop',{...maintenance,installationPath:maintenancePath},[],options),'stopped');
 assert.equal(strict.proof,true);
 evidence.configure_recovery={terminal:finish.terminal,protective_proof:stopped.proof,strict_proof:strict.proof};
}

async function removalJourney(journey){
 const {f,evidence,dependencies}=journey;
 const driver=lifecycleDriver(journey),{initial,run,configure,output,deployment,build}=driver;
 const config=initial.manifest.canonical_config;
 const enabled=await configure(initial,build('removal-enabled',changedControls(config,{schedule_enabled:true})), 'removal-enabled-receipt');
 assert.equal(f.cloud.schedule.State,'ENABLED');
 await configureRecoveryJourney(journey,driver,enabled);
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
 const completeBranch=forkLifecycle(f,maintenance,'complete provider deletion');
 const completeFile=output('complete-removal');
 const complete=requireStatus(await run('remove',maintenance,[...deployment,'--preview',preview,'--output',completeFile],
   {branch:completeBranch}),'removed');
 assert.equal(complete.terminal.retention_complete,true);
 assert(complete.terminal.resources.every(resource=>resource.disposition===resource.observation));
 assert.equal(completeBranch.cloud.table.TableId,f.cloud.table.TableId);
 assert.equal(completeBranch.audit.filter(row=>row.action==='DeleteStackCommand'&&row.identity==='SELECTED_DEPLOYER').length,1);
 const failedBranch=forkLifecycle(f,maintenance,'correlated DELETE_FAILED');
 failedBranch.cloud.deleteStatus='DELETE_FAILED';
 const failed=requireStatus(await run('remove',maintenance,[...deployment,'--preview',preview,'--output',output('failed-removal')],
   {branch:failedBranch}),'partial');
 const failedRead=requireStatus(await run('inspect-operation',maintenance,['--operation',failed.operation],
   {branch:failedBranch}),'inspected');
 assert.equal(failedRead.outcome,'partial');
 assert.equal(failedRead.terminal.provider.status,'DELETE_FAILED');
 assert.equal(failedRead.current_observation.status,'partial');
 const failedHistory=failedBranch.provider.snapshot();
 const failedFinish=await run('finish-operation',maintenance,['--operation',failed.operation,'--output',output('failed-report')],
   {branch:failedBranch,human:true});
 assert.equal(failedFinish.exitCode,1,failedFinish.stdout);
 assert.match(failedFinish.stdout,/^partial \(terminal\)/);
 assert.match(failedFinish.stdout,/Current removal observation.*DELETE_FAILED/);
 assert.deepEqual(failedFinish.outcome.terminal,failedRead.terminal);
 assert.equal(failedBranch.provider.snapshot(),failedHistory);
 assert.equal(failedBranch.audit.filter(row=>row.action==='DeleteStackCommand').length,1);
 const lateBranch=forkLifecycle(f,maintenance,'delayed exact log deletion evidence');
 lateBranch.cloud.omitDeleteEvent='LogGroup';
 const early=requireStatus(await run('remove',maintenance,[...deployment,'--preview',preview,'--output',output('early-removal')],
   {branch:lateBranch}),'partial');
 const lateNamed=['--operation',early.operation];
 const log=inventory.resources.find(row=>row.logical==='LogGroup');
 const logEvent={StackId:f.stackId,LogicalResourceId:log.logical,PhysicalResourceId:log.physical,
   ResourceType:log.type,ResourceStatus:'DELETE_COMPLETE',ClientRequestToken:early.operation};
 lateBranch.cloud.events.unshift({...logEvent,ClientRequestToken:complete.operation});
 const lateRead=async()=>requireStatus(await run('inspect-operation',maintenance,lateNamed,{branch:lateBranch}),'inspected');
 const history=lateBranch.provider.snapshot();
 const wrong=await lateRead();
 assert.equal(wrong.outcome,'partial');
 assert.equal(wrong.current_observation.status,'partial');
 assert.equal(wrong.current_observation.resources.find(row=>row.logical==='LogGroup').observation,'unobservable');
 assert.match(wrong.current_observation.resources.find(row=>row.logical==='LogGroup').cost,/CloudWatch Logs storage/i);
 lateBranch.cloud.events.unshift(logEvent);
 const later=await lateRead();
 assert.deepEqual(later.terminal,wrong.terminal);
 assert.equal(later.terminal.retention_complete,false);
 assert.equal(later.current_observation.status,'removed');
 assert.equal(later.current_observation.resources.find(row=>row.logical==='LogGroup').observation,'deleted');
 const laterFile=output('later-removal');
 const laterStart=lateBranch.audit.length;
 const laterResult=await run('finish-operation',maintenance,[...lateNamed,'--output',laterFile],{branch:lateBranch});
 const laterReport=requireStatus(laterResult,'removed');
 assert.equal(laterResult.exitCode,0,laterResult.stdout);
 assert.deepEqual(laterReport.current_observation,later.current_observation);
 assert.deepEqual(laterReport.terminal,wrong.terminal);
 assert.equal(JSON.parse(fs.readFileSync(laterFile)).current_observation.status,'removed');
 assert.deepEqual(await lateRead(),later);
 const laterHuman=await run('finish-operation',maintenance,[...lateNamed,'--output',output('later-removal-reexport')],
   {branch:lateBranch,human:true});
 assert.equal(laterHuman.exitCode,0);
 assert.match(laterHuman.stdout,/Current removal observation.*"status":"removed"/);
 assert.deepEqual(laterHuman.outcome.terminal,later.terminal);
 assert.deepEqual(laterHuman.outcome.current_observation,later.current_observation);
 assert.equal(lateBranch.provider.snapshot(),history);
 operatorOnly(lateBranch.audit.slice(laterStart));
 noHostWrites(lateBranch.audit.slice(laterStart));
 assert.equal(lateBranch.audit.filter(row=>row.action==='DeleteStackCommand').length,1);
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
 evidence.removal={inventory,complete:complete.terminal,terminal,table_id:tableId,
   failed:failedRead.terminal,later:later.current_observation};
}

async function configureEnablementJourney(journey){
 const {f,evidence,dependencies,state}=journey;
 const {initial,run,configure,output,build,assetFlags,deployment}=lifecycleDriver(journey);
 const {recovery_delay_ms:recoveryDelay,configure_log_retention_days:logRetention}=hostFixture().lifecycle.enablement;
 const config=initial.manifest.canonical_config;
 const enabledConfig=changedControls(config,{schedule_enabled:true});
 const target=build('enablement-enabled',enabledConfig);
 const configureArgs=(proposed,name)=>[...assetFlags(proposed),...deployment,'--output',output(name)];
 const targetArgs=proposed=>['--manifest',proposed.manifestPath,'--target-config',proposed.configPath];
 const configureOn=(branch,installed,proposed,name)=>run('configure',installed,configureArgs(proposed,name),
   {branch,configPath:proposed.configPath});
 const inspect=(branch,installed,id,human=false)=>run('inspect-operation',installed,['--operation',id],{branch,human});
 const finish=(branch,installed,proposed,id,name)=>run('finish-operation',installed,
   ['--operation',id,...targetArgs(proposed),'--output',output(name)],{branch});
 const epoch=branch=>Object.fromEntries(Object.entries(installationState(branch).extensions).filter(([key])=>
   ['health_generation','health_enabled_at'].includes(key)));
 const expectEpoch=(branch,value)=>assert.deepEqual(epoch(branch),value);
 const verifyHeld=(branch,before)=>{
  assert.equal(installationState(branch).schedule_enabled,false);
  assert.equal(installationState(branch).writes_enabled,false);
  assert.equal(installationState(branch).maintenance,true);
  requireReadOnly(branch,before);
 };

 const operationVariable='PB_CONFIGURE_OPERATION_ID';
 const functionName=installationResourceMap(target.manifest.installation_id,target.manifest).logical.function_name;
 const environment=template=>template.Resources[functionName].Properties.Environment.Variables;
 const requestFor=(branch,id)=>branch.audit.find(row=>row.action==='CreateChangeSetCommand'&&row.input.ClientToken===id).input;
 const providerEvent=(branch,id)=>branch.cloud.events.find(event=>event.ClientRequestToken===id&&event.ResourceStatus==='UPDATE_COMPLETE');
 const checkProviderEvent=(branch,outcome)=>{
  const event=providerEvent(branch,outcome.operation);
  assert.equal(event.EventId,outcome.terminal.provider.event_id);
  assert.equal(event.Timestamp.toISOString(),outcome.terminal.provider.recorded_at);
  return outcome.terminal.provider.recorded_at;
 };
 const withoutOperation=({ClientToken,ChangeSetName,TemplateBody,...request})=>{
  const template=JSON.parse(TemplateBody);
  delete environment(template)[operationVariable];
  return {...request,template};
 };
 const wrongCadence='rate(77 minutes)';
 f.cloud.compareEnablementChangeSets=true;
 assert.equal(f.cloud.schedule.State,'DISABLED');
 expectEpoch(f,{});
 dependencies.beforeLifecycleFinish=async()=>{await dependencies.wait(recoveryDelay);};
 const firstPath=output('enablement-first');
 const first=requireStatus(await configureOn(f,initial,target,'enablement-first'),'configured');
 delete dependencies.beforeLifecycleFinish;
 const enabled={...target,installationPath:firstPath};
 const original=first.verified_enablement;
 assert.equal(original.health_generation,first.operation);
 assert.equal(Date.parse(dependencies.now())-Date.parse(original.health_enabled_at),recoveryDelay);
 expectEpoch(f,original);
 const firstRead=requireStatus(await inspect(f,initial,first.operation),'inspected');
 assert.deepEqual(firstRead.verified_enablement,original);
 const readable=await inspect(f,initial,first.operation,true);
 assert(readable.stdout.includes('Verified schedule enablement — '+original.health_enabled_at));
 assert(readable.stdout.includes('Enablement generation — '+original.health_generation));

 const firstRequest=requestFor(f,first.operation);
 const firstEvent=checkProviderEvent(f,firstRead);
 assert.equal(firstEvent,original.health_enabled_at);
 const identical=forkLifecycle(f,enabled,'identical deployed template and parameters');
 const makeClient=identical.dependencies.makeClient;
 identical.dependencies.makeClient=(...args)=>{
  const client=makeClient(...args);
  return {...client,send:(command,options)=>{
   if(command.constructor.name==='CreateChangeSetCommand'){
    // Reuse the already-deployed identifier to simulate a truly identical request.
    const template=JSON.parse(command.input.TemplateBody);
    const deployed=environment(identical.cloud.template);
    if(Object.hasOwn(deployed,operationVariable))environment(template)[operationVariable]=deployed[operationVariable];
    else delete environment(template)[operationVariable];
    command.input.TemplateBody=JSON.stringify(template);
   }
   return client.send(command,options);
  }};
 };
 const refused=requireStatus(await configureOn(identical,enabled,target,'enablement-empty-change'),'partial');
 assert.equal(refused.code,'UNSUPPORTED_CHANGE_SET');
 assert.deepEqual(JSON.parse(requestFor(identical,refused.operation).TemplateBody),identical.cloud.template);
 assert.deepEqual(requestFor(identical,refused.operation).Parameters,identical.cloud.stack.Parameters);
 assert.equal(identical.cloud.lastChangeSetDescription.Status,'FAILED');
 assert.equal(identical.cloud.lastChangeSetDescription.ExecutionStatus,'UNAVAILABLE');
 assert.deepEqual(identical.cloud.lastChangeSetDescription.Changes,[]);
 assert.equal(providerExecutions(identical.audit).length,0);
 assert.equal(installationState(identical).schedule_enabled,false);
 expectEpoch(identical,original);

 const unchanged=requireStatus(await configureOn(f,enabled,target,'enablement-same'),'configured');
 const same={...target,installationPath:output('enablement-same')};
 const repeatRequest=requestFor(f,unchanged.operation);
 assert.deepEqual(withoutOperation(repeatRequest),withoutOperation(firstRequest));
 assert.equal(environment(JSON.parse(firstRequest.TemplateBody))[operationVariable],first.operation);
 assert.equal(environment(JSON.parse(repeatRequest.TemplateBody))[operationVariable],unchanged.operation);
 const repeatChanges=f.cloud.lastChangeSetDescription.Changes;
 assert.deepEqual(repeatChanges,[{ResourceChange:{Action:'Modify',LogicalResourceId:functionName,Replacement:'False',
   Details:[{Target:{Attribute:'Properties',Name:'Environment'}}]}}]);
 assert.deepEqual(JSON.parse(fs.readFileSync(same.installationPath)).manifest,JSON.parse(fs.readFileSync(enabled.installationPath)).manifest);
 expectEpoch(f,original);
 const unchangedRead=await inspect(f,enabled,unchanged.operation,true);
 assert.equal(requireStatus(unchangedRead,'inspected').enablement_status,'preserved');
 assert(unchangedRead.stdout.includes('Schedule enablement — original time preserved'));
 const repeatEvent=checkProviderEvent(f,unchangedRead.outcome);
 assert(Date.parse(repeatEvent)>Date.parse(firstEvent));
 const unchangedState=await state(['inspect','--config',same.configPath,'--installation',same.installationPath,
   '--operator-profile','operator','--kind','installation','--json']);
 assert.equal(unchangedState.exitCode,0,unchangedState.stdout);
 const {health_generation,health_enabled_at}=unchangedState.outcome.data.records[0].extensions;
 assert.deepEqual({health_generation,health_enabled_at},original);
 const protective=requireStatus(await run('stop',same),'stopped');
 assert.equal(protective.proof,false);
 expectEpoch(f,original);
 const maintenance=await configure(same,build('enablement-maintenance',changedControls(config,{maintenance:true})),
   'enablement-maintenance-receipt');
 const stopped=requireStatus(await run('stop',maintenance),'stopped');
 assert.equal(stopped.proof,true);
 expectEpoch(f,original);
 const reenabled=await configure(maintenance,target,'enablement-reenabled');
 const newEpoch=epoch(f);
 assert.notEqual(newEpoch.health_generation,original.health_generation);
 assert(Date.parse(newEpoch.health_enabled_at)>Date.parse(original.health_enabled_at));

 const historical=forkLifecycle(f,reenabled,'historical operation receipt');
 const oldRow=operationRow(historical,first.operation);
 delete oldRow.owner.verified_enablement;
 oldRow.owner.phase='settled';
 const oldBefore=readOnlyCheckpoint(historical);
 const old=requireStatus(await inspect(historical,initial,first.operation),'inspected');
 assert.equal(old.outcome,'completed');
 assert.equal(old.verified_enablement,null);
 requireReadOnly(historical,oldBefore);
 const oldExport=requireStatus(await finish(historical,initial,target,first.operation,'enablement-legacy-export'),'configured');
 assert.equal(oldExport.verified_enablement,null);
 requireReadOnly(historical,oldBefore);

 const changedConfig=structuredClone(enabledConfig);
 changedConfig.manager.log_retention_days=logRetention;
 const changed=build('enablement-config-change',changedConfig);
 const captureDrift=forkLifecycle(f,reenabled,'wrong cadence before enablement capture');
 captureDrift.cloud.enabledScheduleExpression=wrongCadence;
 const refusedCapture=requireStatus(await configureOn(captureDrift,reenabled,changed,'enablement-capture-drift'),'partial');
 assert.equal(refusedCapture.code,'HOST_UNCONFIRMED');
 assert.equal(captureDrift.cloud.schedule.State,'ENABLED');
 assert.equal(captureDrift.cloud.concurrency,1);
 assert.equal(captureDrift.cloud.schedule.ScheduleExpression,wrongCadence);
 assert.equal(installationState(captureDrift).schedule_enabled,false);
 expectEpoch(captureDrift,newEpoch);
 const captureBefore=readOnlyCheckpoint(captureDrift);
 const captureRead=requireStatus(await inspect(captureDrift,reenabled,refusedCapture.operation),'inspected');
 assert.equal(captureRead.outcome,'held');
 assert.equal(captureRead.verified_enablement,null);
 assert.equal(captureRead.code,'ENABLEMENT_UNVERIFIED');
 requireReadOnly(captureDrift,captureBefore);

 const interrupted=forkLifecycle(f,reenabled,'interrupted after verified enablement was recorded');
 interrupted.dependencies.beforeLifecycleFinish=()=>{throw Error('simulated interruption before final State commit');};
 const lost=requireStatus(await configureOn(interrupted,reenabled,changed,'enablement-after-recording'),'partial');
 assert.equal(interrupted.cloud.schedule.State,'ENABLED');
 assert.equal(installationState(interrupted).schedule_enabled,false);
 expectEpoch(interrupted,newEpoch);
 const stored=operationRow(interrupted,lost.operation);
 assert.equal(stored,undefined);
 const active=requireStatus(await inspect(interrupted,reenabled,lost.operation),'inspected');
 assert.equal(active.outcome,'awaiting_finish');
 assert.equal(active.phase,'enablement-recorded');
 const recorded=active.verified_enablement;
 assert.equal(recorded.health_generation,lost.operation);
 assert.notEqual(recorded.health_generation,newEpoch.health_generation);
 assert.equal(recorded.health_enabled_at,interrupted.dependencies.now());
 assert(Date.parse(recorded.health_enabled_at)>Date.parse(newEpoch.health_enabled_at));
 const interruptedEvent=checkProviderEvent(interrupted,{...active,terminal:{provider:active.provider}});
 assert.equal(interruptedEvent,recorded.health_enabled_at);

 const proved=forkLifecycle(interrupted,reenabled,'original operation with complete proof');
 await proved.dependencies.wait(recoveryDelay);
 const provedBefore=readOnlyCheckpoint(proved);
 const recoveredInspect=requireStatus(await inspect(proved,reenabled,lost.operation),'inspected');
 assert.deepEqual(recoveredInspect,active);
 requireReadOnly(proved,provedBefore);
 const provedStart=proved.audit.length;
 const recovered=requireStatus(await finish(proved,reenabled,changed,lost.operation,'enablement-finished'),'configured');
 assert.deepEqual(recovered.verified_enablement,recorded);
 expectEpoch(proved,recorded);
 assert.equal(installationState(proved).schedule_enabled,true);
 assert.equal(Date.parse(recovered.terminal.observed_at)-Date.parse(recorded.health_enabled_at),recoveryDelay);
 assert.equal(checkProviderEvent(proved,recovered),interruptedEvent);
 noHostWrites(proved.audit.slice(provedStart));
 operatorOnly(proved.audit.slice(provedStart));

 const unverifiable=forkLifecycle(interrupted,reenabled,'same interrupted operation with changed host');
 unverifiable.cloud.schedule.ScheduleExpression=wrongCadence;
 assert.equal(unverifiable.cloud.schedule.State,'ENABLED');
 assert.equal(unverifiable.cloud.concurrency,1);
 const unverifiableBefore=readOnlyCheckpoint(unverifiable);
 const unverifiableInspect=requireStatus(await inspect(unverifiable,reenabled,lost.operation),'inspected');
 assert.deepEqual(unverifiableInspect,active);
 requireReadOnly(unverifiable,unverifiableBefore);
 const denied=requireStatus(await finish(unverifiable,reenabled,changed,lost.operation,'enablement-host-unconfirmed'),'partial');
 assert.equal(denied.code,'HOST_UNCONFIRMED');
 verifyHeld(unverifiable,unverifiableBefore);

 const missing=forkLifecycle(f,reenabled,'interrupted before recording verified enablement');
 missing.cloud.enablementWriteFault='before';
 const notRecorded=requireStatus(await configureOn(missing,reenabled,changed,'enablement-before-recording'),'partial');
 assert.equal(notRecorded.code,'UNCERTAIN_WRITE');
 assert.equal(notRecorded.phase,'record_enablement');
 assert.equal(missing.cloud.schedule.State,'ENABLED');
 const transition=missing.audit.findLastIndex(row=>row.action==='UpdateScheduleCommand'&&row.input.State==='ENABLED');
 const recordAttempt=missing.audit.findLastIndex(row=>row.action==='TransactWriteCommand'&&
   row.input.TransactItems.some(item=>item.Put?.Item?.SK==='CONTROL'&&item.Put.Item.owner?.verified_enablement));
 assert(transition>=0&&recordAttempt>transition);
 assert(missing.audit.slice(transition+1,recordAttempt).some(row=>row.action==='GetScheduleCommand'));
 await missing.dependencies.wait(recoveryDelay);
 const missingBefore=readOnlyCheckpoint(missing);
 const held=requireStatus(await inspect(missing,reenabled,notRecorded.operation),'inspected');
 assert.equal(held.outcome,'held');
 assert.equal(held.code,'ENABLEMENT_UNVERIFIED');
 assert.equal(held.verified_enablement,null);
 const blocked=requireStatus(await finish(missing,reenabled,changed,notRecorded.operation,'enablement-missing'),'partial');
 assert.equal(blocked.code,'ENABLEMENT_UNVERIFIED');
 expectEpoch(missing,newEpoch);
 verifyHeld(missing,missingBefore);

 const uncertain=forkLifecycle(f,reenabled,'enablement recorded with lost write response');
 uncertain.cloud.enablementWriteFault='after';
 const notAcknowledged=requireStatus(await configureOn(uncertain,reenabled,changed,'enablement-uncertain'),'partial');
 assert.equal(notAcknowledged.code,'UNCERTAIN_WRITE');
 assert.equal(installationState(uncertain).schedule_enabled,false);
 expectEpoch(uncertain,newEpoch);
 const durable=requireStatus(await inspect(uncertain,reenabled,notAcknowledged.operation),'inspected');
 assert.equal(durable.outcome,'awaiting_finish');
 await uncertain.dependencies.wait(recoveryDelay);
 const confirmed=requireStatus(await finish(uncertain,reenabled,changed,notAcknowledged.operation,'enablement-confirmed'),'configured');
 assert.deepEqual(confirmed.verified_enablement,durable.verified_enablement);
 expectEpoch(uncertain,durable.verified_enablement);
 noHostWrites(uncertain.audit.slice(uncertain.audit.findLastIndex(row=>row.action==='UpdateScheduleCommand')+1));

 evidence.enablement={initial:original,reenabled:newEpoch,recovered:recorded,
   provider_event_times:{first:firstEvent,repeat:repeatEvent,interrupted:interruptedEvent},
   repeat:{operation:unchanged.operation,changes:repeatChanges},empty_change:{operation:refused.operation,code:refused.code},
   copies:{proved:{inspect:recoveredInspect.outcome,operation:recovered.operation,finished_at:recovered.terminal.observed_at},
     changed_cadence:{inspect:unverifiableInspect.outcome,operation:denied.operation,cadence:wrongCadence,code:denied.code}},
   capture_host_unconfirmed:refusedCapture.code,missing:held.code,host_unconfirmed:denied.code,
   uncertain_write_recovered:durable.verified_enablement,historical:old.verified_enablement};
}

export async function runLifecycleFixture(id){
 assert(lifecycleCases.includes(id));
 const config=id==='R1-16-H01'?(await import('./test-manager-apply.mjs')).lifecycleSenderConfig():hostFixture().config;
 const journey=await lifecycleBirthJourney({config,exerciseBootstrapRecovery:id==='R1-16-H02',historicalRegression:true});
 const {source,evidence}=journey;
 try{
  if(id==='R1-16-H02')await removalJourney(journey);
  else if(id==='R1-23-H02-A')await configureEnablementJourney(journey);
  else await upgradeJourney(journey);
  return evidence;
 }catch(error){error.fixtureEvidence=evidence;throw error;}
 finally{source.cleanup();}
}

async function checkIncompatibleUpdates(journey,driver,original,successor,previewPath){
 const {f,source,evidence}=journey;
 const {initial,run,output,build,assetFlags,deployment}=driver;
 const preview=JSON.parse(fs.readFileSync(previewPath));
 const legacy=build('protocol-v1',original.manifest.canonical_config,{lifecycle:false});
 const unknown=structuredClone(successor.manifest);
 unknown.compatibility.write.work.push('pigboard-ticket/v99');
 unknown.compatibility.write.state.envelope=99;
 const unsupported={...successor,manifest:unknown,manifestPath:writeFixtureJSON(source.temp,'unsupported-declarations',unknown)};
 const malformed={...successor,manifestPath:path.join(source.temp,'malformed-manifest.json')};
 fs.writeFileSync(malformed.manifestPath,'{');
 const ordinary=original;
 const cases=[
  {name:'unsupported protocol',target:legacy,code:'UNSUPPORTED_VERSION'},
  {name:'unsupported declarations',target:unsupported,code:'UNSUPPORTED_PACKAGE'},
  {name:'unsupported retained record',target:successor,configureTarget:ordinary,code:'MALFORMED_RECORD',setup:branch=>{
    const [key,record]=businessRows(branch).find(([,row])=>row.kind==='member');
    branch.provider.rows.set(key,{...record,schema:'pigboard-state-record/v99'});
  }},
  {name:'bounded incomplete inventory',target:successor,configureTarget:ordinary,code:'INCOMPLETE_INVENTORY',
   setup:branch=>{branch.cloud.incompleteInventory=true;}}
 ];
 const tested=[],refusals=[];
 for(const [i,{name,target,configureTarget=target,code,setup}] of cases.entries()){
  for(const verb of ['upgrade','configure']){
   const branch=forkLifecycle(f,original,verb+' '+name);
   setup?.(branch);
   const before=readOnlyCheckpoint(branch),rows=businessRows(branch);
   assert.equal(branch.cloud.schedule.State,'ENABLED');
   assert.equal(branch.cloud.concurrency,1);
   assert.equal(installationState(branch).writes_enabled,true);
   assert.equal(installationState(branch).schedule_enabled,true);
   const priorPin=branch.cloud.function.Environment.Variables.PB_PACKAGE_REVISION;
   const priorAsset=structuredClone(branch.cloud.stack.Parameters);
   const refusalPath=output(`bad-preview-${i}-${verb}`);
   const humanPreview=i===0&&verb==='configure';
   const previewResult=await run('upgrade-preview',original,[...assetFlags(target),'--output',refusalPath],{branch,human:humanPreview});
   const refusal=requireStatus(previewResult,'refused');
   assert.equal(previewResult.exitCode,2,previewResult.stdout);
   assert.equal(refusal.code,code,previewResult.stdout);
   assert.equal(refusal.state_fenced,false);
   assert.equal(refusal.host_mutated,false);
   if(humanPreview)assertReadOnlyActionText(previewResult.stdout);
   else assert.equal(JSON.parse(previewResult.stdout).state_mutated,false);
   assert.equal(refusal.receipt_path,refusalPath);
   assert.equal(refusal.receipt_publication,'written');
   const protectFlag=refusal.next_command.indexOf('--protect-rejected');
   assert(protectFlag>=0);
   assert.equal(refusal.next_command[protectFlag+1],refusalPath);
   const refusalBytes=fs.readFileSync(refusalPath);
   const proposal=JSON.parse(refusalBytes);
   assert.equal(proposal.schema,'pigboard-upgrade-refusal/v1');
   assert.equal(proposal.disposition,'protect-only');
   assert.equal(proposal.reason,code);
   assert.equal(proposal.stack_id,branch.stackId);
   assert.equal(proposal.table_id,branch.cloud.table.TableId);
   assert.equal(proposal.installation_generation,original.manifest.installation_generation);
   assert.equal(Object.hasOwn(proposal,'inventory'),!setup);
   assert.equal(proposal.source.manifest_digest,sha256(canonicalize(original.manifest)));
   assert.equal(proposal.target.manifest_digest,sha256(canonicalize(target.manifest)));
   assert.deepEqual(proposal.current_asset,preview.current_asset);
   const {bucket,key,version}=JSON.parse(fs.readFileSync(target.assetPath));
   assert.deepEqual(proposal.asset,{bucket,key,version});
   const lifecycle=branch.provider.records().find(row=>row.bootstrapped===true);
   assert.deepEqual(proposal.state,{revision:installationState(branch).revision,lifecycle_revision:lifecycle.revision,fence:lifecycle.fence_id});
   requireReadOnly(branch,before);
   const next=verb==='upgrade'?target:configureTarget;
   const extra=verb==='upgrade'?['--protect-rejected',refusalPath]:[];
   if(verb==='upgrade')refusals.push(refusalPath);
   const protectedStart=branch.audit.length;
   const rejected=await run(verb,original,[...assetFlags(next),...deployment,...extra,'--output',output(`rejected-${i}-${verb}`)],{branch});
   assert.deepEqual(fs.readFileSync(refusalPath),refusalBytes);
   const effects=branch.audit.slice(protectedStart);
   const firstStateWrite=effects.findIndex(row=>row.action==='TransactWriteCommand');
   const firstHostWrite=effects.findIndex(row=>['UpdateScheduleCommand','PutFunctionConcurrencyCommand'].includes(row.action));
   assert(firstStateWrite>=0&&firstHostWrite>firstStateWrite,'State must be fenced before host controls are changed');
   assert.equal(rejected.outcome.code,code,rejected.stdout);
   assert.equal(rejected.outcome.status,'partial',rejected.stdout);
   assert.equal(rejected.exitCode,1,rejected.stdout);
   assert.equal(rejected.outcome.state_fenced,true);
   assert.equal(rejected.outcome.host,'stopped');
   assert.equal(rejected.outcome.observed.schedule,'DISABLED');
   assert.equal(rejected.outcome.observed.concurrency,0);
   assert.equal(branch.cloud.schedule.State,'DISABLED');
   assert.equal(branch.cloud.concurrency,0);
   assert.equal(installationState(branch).writes_enabled,false);
   assert.equal(installationState(branch).schedule_enabled,false);
   assert.equal(installationState(branch).extensions.pb_stop_id,undefined);
   assert.deepEqual(businessRows(branch),rows);
   assert.equal(installationState(branch).package_revision,installationState(f).package_revision);
   assert.equal(branch.cloud.function.Environment.Variables.PB_PACKAGE_REVISION,priorPin);
   assert.deepEqual(branch.cloud.stack.Parameters,priorAsset);
   assert(branch.provider.records().some(row=>row.bootstrapped===true&&row.fence_id&&row.fence_id!==lifecycle.fence_id));
   operatorOnly(branch.audit.filter(row=>/^(TransactWrite|UpdateSchedule|PutFunctionConcurrency)/.test(row.action)));
   assert.equal(branch.audit.filter(row=>/ChangeSet/.test(row.action)).length,0);
   tested.push({verb,code});
  }
 }
 const late=forkLifecycle(f,original,'incompatible inventory after upgrade reservation');
 const originalWait=late.dependencies.wait;
 late.dependencies.wait=async ms=>{
  await originalWait(ms);
  late.cloud.incompleteInventory=true;
 };
 const lateResult=await run('upgrade',original,[...assetFlags(successor),...deployment,'--preview',previewPath,
   '--output',output('late-inventory-rejected')],{branch:late});
 assert.equal(lateResult.outcome.code,'INCOMPLETE_INVENTORY',lateResult.stdout);
 assert.equal(lateResult.outcome.host,'stopped');
 assert.equal(lateResult.outcome.state_fenced,true);
 const lateOperation=operationRow(late,lateResult.outcome.operation);
 assert.equal(lateOperation.owner.kind,'upgrade');
 assert.equal(lateOperation.terminal.status,'update_rejected');
 assert.equal(late.audit.filter(row=>row.action==='UpdateScheduleCommand').length,1);
 assert.equal(late.audit.filter(row=>row.action==='PutFunctionConcurrencyCommand').length,1);
 assert.equal(providerExecutions(late.audit).length,0);
 assert.deepEqual(businessRows(late),businessRows(f));
 const stoppedState=forkLifecycle(f,original,'rejected target with unconfirmed protective host stop');
 stoppedState.cloud.rejectDisableSchedule=true;
 const stopped=await run('configure',original,[...assetFlags(legacy),...deployment,'--output',output('incompatible-protection-unconfirmed')],
   {branch:stoppedState});
 assert.equal(stopped.outcome.code,'UNSUPPORTED_VERSION',stopped.stdout);
 assert.equal(stopped.outcome.state_fenced,true);
 assert.equal(stopped.outcome.host,'unconfirmed');
 assert(stopped.outcome.protection_code&&stopped.outcome.protection_code!=='UNSUPPORTED_VERSION');
 assert.equal(installationState(stoppedState).schedule_enabled,false);
 assert.equal(stoppedState.cloud.schedule.State,'ENABLED');
 const stoppedHeld=requireStatus(await run('inspect-operation',original,['--operation',stopped.outcome.operation],
   {branch:stoppedState}),'inspected');
 assert.equal(stoppedHeld.outcome,'held');
 assert(stoppedHeld.effects.some(effect=>effect.name==='disable-schedule'&&effect.state==='claimed'));
 assert.equal(providerExecutions(stoppedState.audit).length,0);
 const unchanged=forkLifecycle(f,original,'stale and malformed requests leave active host untouched');
 const before=readOnlyCheckpoint(unchanged);
 const protect=JSON.parse(fs.readFileSync(refusals[0]));
 const stalePreview=writeFixtureJSON(source.temp,'stale-preview',{...preview,current_asset:{...preview.current_asset,version:'stale-version'}});
 const editedPreview=writeFixtureJSON(source.temp,'edited-preview',{...preview,provisional:!preview.provisional});
 const staleRefusal=writeFixtureJSON(source.temp,'stale-refusal',{...protect,state:{...protect.state,revision:protect.state.revision-1}});
 const editedRefusal=writeFixtureJSON(source.temp,'edited-refusal',{...protect,unexpected:true});
 const malformedRefusal=output('malformed-refusal');
 fs.writeFileSync(malformedRefusal,'{');
 const guards=[
  ['stale current asset',successor,'--preview',stalePreview,'UPGRADE_PREVIEW_STALE'],
  ['edited successful snapshot',successor,'--preview',editedPreview,'UPGRADE_PREVIEW_STALE'],
  ['last successful preview for another target',legacy,'--preview',previewPath,'UPGRADE_PREVIEW_STALE'],
  ['refusal used as successful preview',legacy,'--preview',refusals[0],'UPGRADE_PREVIEW_STALE'],
  ['successful preview used as refusal',successor,'--protect-rejected',previewPath,'UPGRADE_REFUSAL_STALE'],
  ['stale protected State',legacy,'--protect-rejected',staleRefusal,'UPGRADE_REFUSAL_STALE'],
  ['extra refusal field',legacy,'--protect-rejected',editedRefusal,'UPGRADE_REFUSAL_STALE'],
  ['malformed refusal',legacy,'--protect-rejected',malformedRefusal,'INVALID_INPUT'],
  ['inventory now compatible',successor,'--protect-rejected',refusals[2],'UPGRADE_REFUSAL_STALE']
 ];
 for(const [i,[name,target,flag,proposal,code]] of guards.entries()){
  const rejectedPath=output(`guard-${i}`);
  const human=i===0;
  const denied=await run('upgrade',original,[...assetFlags(target),...deployment,flag,proposal,'--output',rejectedPath],{branch:unchanged,human});
  if(code==='UPGRADE_PREVIEW_STALE'||code==='UPGRADE_REFUSAL_STALE'){
   assert.equal(denied.outcome.state_fenced,false);
   if(human)assertReadOnlyActionText(denied.stdout);
   else assert.equal(JSON.parse(denied.stdout).state_mutated,false);
  }
  assert.equal(denied.exitCode,2,name+': '+denied.stdout);
  assert.equal(denied.outcome.code,code,name+': '+denied.stdout);
  assert(!fs.existsSync(rejectedPath),name);
  requireReadOnly(unchanged,before,{deployer:true});
 }
 const changed=forkLifecycle(f,original,'supported target since classified as incompatible');
 cases[2].setup(changed);
 const beforeChange=readOnlyCheckpoint(changed);
 const reclassified=await run('upgrade',original,[...assetFlags(successor),...deployment,'--preview',previewPath,
   '--output',output('reclassified-target')],{branch:changed});
 assert.equal(reclassified.exitCode,2,reclassified.stdout);
 assert.equal(reclassified.outcome.code,'UPGRADE_PREVIEW_STALE',reclassified.stdout);
 requireReadOnly(changed,beforeChange,{deployer:true});
 const unreadable=forkLifecycle(f,original,'unavailable inventory cannot produce a proposal');
 unreadable.cloud.fail='QueryCommand';
 const beforeUnavailable=readOnlyCheckpoint(unreadable),unavailablePath=output('unavailable-inventory');
 const unavailable=await run('upgrade-preview',original,[...assetFlags(legacy),'--output',unavailablePath],{branch:unreadable});
 assert.equal(unavailable.exitCode,2,unavailable.stdout);
 assert.equal(unavailable.outcome.code,'INVENTORY_UNCONFIRMED',unavailable.stdout);
 assert(!fs.existsSync(unavailablePath));
 requireReadOnly(unreadable,beforeUnavailable);
 const publication=forkLifecycle(f,original,'refusal file publication fails');
 publication.dependencies.fileOperations={fsyncSync:()=>{throw Error('simulated unavailable local output');}};
 const beforePublication=readOnlyCheckpoint(publication),failedPath=output('failed-refusal-publication');
 const failed=await run('upgrade-preview',original,[...assetFlags(legacy),'--output',failedPath],{branch:publication});
 assert.equal(failed.exitCode,2,failed.stdout);
 assert.equal(failed.outcome.code,'UNSUPPORTED_VERSION',failed.stdout);
 assert.equal(failed.outcome.receipt_publication,'failed');
 assert.equal(failed.outcome.publication_code,'RECEIPT_PUBLICATION_FAILED');
 assert.equal(failed.outcome.next_command,undefined);
 assert(!fs.existsSync(failedPath));
 requireReadOnly(publication,beforePublication);
 const invalidPreview=output('malformed-target-preview');
 const noProposal=await run('upgrade-preview',original,[...assetFlags(malformed),'--output',invalidPreview],{branch:unchanged});
 assert.equal(noProposal.exitCode,2,noProposal.stdout);
 assert.equal(noProposal.outcome.code,'INVALID_INPUT',noProposal.stdout);
 assert(!fs.existsSync(invalidPreview));
 const replacement=forkLifecycle(f,original,'physical State table replaced after refusal');
 replacement.cloud.table.TableId=hostFixture().lifecycle.restored_table_id;
 const replacementBefore=readOnlyCheckpoint(replacement);
 const replaced=await run('upgrade',original,[...assetFlags(legacy),...deployment,'--protect-rejected',refusals[0],
   '--output',output('replacement-target')],{branch:replacement});
 assert.equal(replaced.exitCode,2,replaced.stdout);
 assert.equal(replaced.outcome.code,'PHYSICAL_STATE_MISMATCH',replaced.stdout);
 requireReadOnly(replacement,replacementBefore,{deployer:true});
 const staleSource=await run('configure',initial,[...assetFlags(original),...deployment,'--output',output('stale-enabling-source')],
   {configPath:original.configPath,branch:unchanged});
 assert.equal(staleSource.exitCode,2,staleSource.stdout);
 assert.equal(staleSource.outcome.code,'UPDATE_PRECONDITION',staleSource.stdout);
 assert.notEqual(staleSource.outcome.status,'partial',staleSource.stdout);
 const invalid=await run('configure',original,[...assetFlags(malformed),...deployment,'--output',output('malformed-target')],
   {branch:unchanged});
 assert.equal(invalid.exitCode,2,invalid.stdout);
 assert.equal(invalid.outcome.code,'INVALID_INPUT',invalid.stdout);
 requireReadOnly(unchanged,before,{deployer:true});
 assert.equal(unchanged.cloud.schedule.State,'ENABLED');
 assert.equal(unchanged.cloud.concurrency,1);
 evidence.rejected_updates=tested;
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
    const before=readOnlyCheckpoint(f);
    const supported=await run('upgrade-preview',original,[...assetFlags(firstSuccessor),'--output',confirmedPreview]);
    assert.equal(supported.exitCode,0,supported.stdout);
    assert.equal(requireStatus(supported,'previewed').receipt_path,confirmedPreview);
    requireReadOnly(f,before);
    await checkIncompatibleUpdates(journey,{initial,run,output,build,assetFlags,deployment},original,firstSuccessor,confirmedPreview);
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
    const inspectionStart=readOnlyCheckpoint(f);
    const restricted=requireStatus(await run('inspect-operation',upgraded,named),'inspected');
    assert.equal(restricted.operation,id);
    assert.equal(restricted.outcome,recorded.outcome);
    assert.deepEqual(restricted.terminal,recorded.terminal);
    assert.equal(restricted.fence,recorded.fence);
    for(const operation of [[],['--operation','45fb5364-258e-4f57-86fd-d4e65c398d96']]){
     const denied=await run('inspect-operation',upgraded,operation);
     assert.equal(denied.exitCode,2,denied.stdout);
     assert.equal(denied.outcome.code,'BINDING_MISMATCH',denied.stdout);
    }
    const wrongConfig=await run('inspect-operation',upgraded,named,{configPath:initial.configPath});
    assert.equal(wrongConfig.exitCode,2,wrongConfig.stdout);
    assert.equal(wrongConfig.outcome.code,'OPERATION_SOURCE_MISMATCH',wrongConfig.stdout);
    const forbiddenReceipt=output('restricted-finish');
    const restrictedFinish=await run('finish-operation',upgraded,[...named,'--manifest',successor.manifestPath,
      '--target-config',successor.configPath,'--output',forbiddenReceipt]);
    assert.equal(restrictedFinish.exitCode,2,restrictedFinish.stdout);
    assert.equal(restrictedFinish.outcome.code,'BINDING_MISMATCH',restrictedFinish.stdout);
    assert(!fs.existsSync(forbiddenReceipt));
    requireReadOnly(f,inspectionStart);
    const staleInspection=forkLifecycle(f,upgraded,'restricted operation after newer fence');
    const [lifecycleKey,lifecycle]=[...staleInspection.provider.rows].find(([,row])=>row.bootstrapped===true);
    staleInspection.provider.rows.set(lifecycleKey,{...lifecycle,revision:lifecycle.revision+1,fence_id:'45fb5364-258e-4f57-86fd-d4e65c398d96'});
    const staleInspectionStart=readOnlyCheckpoint(staleInspection);
    const staleOperation=await run('inspect-operation',upgraded,named,{branch:staleInspection});
    assert.equal(staleOperation.exitCode,2,staleOperation.stdout);
    assert.equal(staleOperation.outcome.code,'RECOVERY_RECEIPT_UNVERIFIED',staleOperation.stdout);
    requireReadOnly(staleInspection,staleInspectionStart);
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
