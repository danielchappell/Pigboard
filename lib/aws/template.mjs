import canonicalize from 'canonicalize';
import { hostConfig, validateManifest, hostError, installationResourceBase, sha256 } from './installation.mjs';
import { alarmCapabilityFields, alarmDefinitions, alarmTemplate, assertAlarmManifest, hasAlarmCapability } from './alarms.mjs';

export const LIFECYCLE_PACKAGE_SCHEMA = 'pigboard-manager-package/v2';
export const LIFECYCLE_TABLE_ID_PARAMETER = 'OriginalTableId';
export const LIFECYCLE_TABLE_ID_ENV = 'PB_ORIGINAL_TABLE_ID';

export function installationResourceMap(installationId, manifest) {
  const lifecycle = manifest?.schema === LIFECYCLE_PACKAGE_SCHEMA;
  const base = lifecycle
    ? 'pigboard2-' + sha256(JSON.stringify([LIFECYCLE_PACKAGE_SCHEMA, installationId, manifest.installation_generation])).slice(7, 39)
    : installationResourceBase(installationId);
  return {
    logical: {
      function_name: 'Function', schedule_name: lifecycle ? 'LifecycleSchedule' : 'Schedule',
      table_name: 'StateTable', runtime_role: 'RuntimeRole', scheduler_role: 'SchedulerRole', log_group: 'LogGroup'
    },
    physical: {
      function_name: base, schedule_name: base, table_name: base + '-state',
      runtime_role: base + '-runtime', scheduler_role: base + '-scheduler', log_group: '/aws/lambda/' + base
    }
  };
}

export function lifecycleManifestFields({ installationId, generation, previousRevision = null, alarmCapability = false }) {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(generation ?? '') ||
      (previousRevision !== null && !/^[0-9a-f]{40}$/.test(previousRevision ?? ''))) throw hostError('PACKAGE_MISMATCH');
  const schema = LIFECYCLE_PACKAGE_SCHEMA;
  const resource_map = installationResourceMap(installationId, { schema, installation_generation: generation });
  const supported = {
    config: 'pigboard-config/v1',
    work: ['pigboard-epic/v1', 'pigboard-ticket/v1', 'pigboard-handoff/v1'],
    state: {
      envelope: 1, records: ['installation', 'stream', 'attempt', 'member'],
      proofs: ['pigboard-native-publication/v1', 'pigboard-operator-origin/v1', 'pigboard-operator-decision/v1',
        'pigboard-lifecycle/v1', 'pigboard-lifecycle-operation/v1']
    }
  };
  return { schema, resource_map, logical_resources: Object.values(resource_map.logical), compatibility: {
    lineage: 'pigboard-lifecycle/v2', previous_revision: previousRevision, read: supported, write: structuredClone(supported)
  }, ...(alarmCapability ? { alarm_capability: alarmCapabilityFields() } : {}) };
}

export function assertLifecycleManifest(manifest) {
  if (manifest?.schema !== LIFECYCLE_PACKAGE_SCHEMA) return;
  assertAlarmManifest(manifest);
  const previousRevision = manifest.compatibility?.previous_revision;
  if (previousRevision === manifest.source_revision) throw hostError('PACKAGE_MISMATCH');
  const expected = lifecycleManifestFields({ installationId: manifest.installation_id, generation: manifest.installation_generation, previousRevision });
  if (manifest.runtime !== 'nodejs24.x' || manifest.sender !== true ||
      Object.entries(expected).some(([key, value]) => canonicalize(manifest[key]) !== canonicalize(value))) throw hostError('PACKAGE_MISMATCH');
}

const allow = (Action, Resource, Condition) => ({ Effect: 'Allow', Action, Resource, ...(Condition ? { Condition } : {}) });
const policy = Statement => ({ Version: '2012-10-17', Statement });
const leadingKey = key => ({
  Null: { 'dynamodb:LeadingKeys': 'false' },
  'ForAllValues:StringEquals': { 'dynamodb:LeadingKeys': [key].flat() }
});
const enclosing = operation => ({ 'ForAnyValue:StringEquals': { 'dynamodb:EnclosingOperation': [operation] } });
const transactionWrite = (actions, table, key) => allow(actions, table, {
  ...leadingKey(key), ...enclosing('TransactWriteItems')
});

// Reproduce the complete published role, including the prior supported shape,
// for comparison with CloudFormation's original resource properties.
export function runtimeRoleProperties(config, sender, { legacy = false, manifest } = {}) {
  const { installation_id, aws } = config.manager;
  const {physical} = installationResourceMap(installation_id, manifest);
  const table = `arn:aws:dynamodb:${aws.region}:${aws.account_id}:table/${physical.table_name}`;
  const log = `arn:aws:logs:${aws.region}:${aws.account_id}:log-group:${physical.log_group}:*`;
  const normal = 'installation#' + installation_id;
  const base = [
    allow('secretsmanager:GetSecretValue', config.jira.connection.secret_reference),
    allow(['logs:CreateLogStream', 'logs:PutLogEvents'], log)
  ];
  const writes = ['dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:ConditionCheckItem'];
  const state = legacy
    ? [
        allow(['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:DescribeTable'], table),
        ...(sender ? [
          allow(['dynamodb:GetItem'], table, enclosing('TransactGetItems')),
          allow(writes, table, enclosing('TransactWriteItems'))
        ] : [])
      ]
    : [
        allow('dynamodb:DescribeTable', table),
        allow(['dynamodb:GetItem', 'dynamodb:Query'], table, leadingKey(normal)),
        ...(sender ? [transactionWrite(writes, table, normal)] : [])
      ];
  return {
    RoleName: physical.runtime_role,
    AssumeRolePolicyDocument: policy([{ Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' }, Action: 'sts:AssumeRole' }]),
    Policies: [{ PolicyName: sender ? 'ordinary-admission' : 'preview-only', PolicyDocument: policy([...base, ...state]) }]
  };
}

export function synthesizeTemplate(configText,manifest,{initial=true}={}){
 const projection=validateManifest(manifest,configText),{config}=hostConfig(configText),m=config.manager,a=m.aws;
 if(initial&&(m.controls.schedule_enabled||m.controls.writes_enabled||m.controls.maintenance))throw hostError('INITIAL_DISABLED_REQUIRED');
 const lifecycle=manifest.schema===LIFECYCLE_PACKAGE_SCHEMA;
 const {logical,physical}=installationResourceMap(m.installation_id,manifest);
 const alarms=lifecycle&&hasAlarmCapability(manifest)
  ? alarmDefinitions({config,function_name:physical.function_name}) : [];
 const {resources:alarmResources,outputs:alarmOutputs}=alarmTemplate(alarms);
 const alarmArns=alarms.map(alarm=>alarm.arn);
 const operatorAlarmStatements=alarms.length?[
  allow(['cloudwatch:DescribeAlarms','cloudwatch:DisableAlarmActions','cloudwatch:ListTagsForResource'],alarmArns),
  allow('cloudwatch:EnableAlarmActions',alarms.filter(alarm=>!alarm.custom).map(alarm=>alarm.arn)),
  allow('cloudwatch:PutMetricAlarm',alarms.filter(alarm=>alarm.custom).map(alarm=>alarm.arn))
 ]:[];
 const alarmExecutionStatements=alarms.length?[
  allow(['cloudwatch:PutMetricAlarm','cloudwatch:DescribeAlarms','cloudwatch:DeleteAlarms'],alarmArns)
 ]:[];
 const arn=(service,resource)=>`arn:aws:${service}:${a.region}:${a.account_id}:${resource}`;
 const tableArn=arn('dynamodb','table/'+physical.table_name);
 const functionArn=arn('lambda','function:'+physical.function_name);
 const scheduleArn=arn('scheduler','schedule/default/'+physical.schedule_name);
 const logGroupArn=arn('logs','log-group:'+physical.log_group), logArn=logGroupArn+':*';
 const runtimeRoleArn=`arn:aws:iam::${a.account_id}:role/${physical.runtime_role}`;
 const schedulerRoleArn=`arn:aws:iam::${a.account_id}:role/${physical.scheduler_role}`;
 const ref=Ref=>({Ref}),get=(id,attr)=>({'Fn::GetAtt':[id,attr]});
 const stack={'Fn::Sub':'arn:aws:cloudformation:${AWS::Region}:${AWS::AccountId}:stack/${AWS::StackName}/*'};
 const controlChangeSet=arn('cloudformation','changeSet/pigboard-controls-*/*');
 const lifecycleChangeSet=arn('cloudformation','changeSet/pigboard-lifecycle-*/*');
 const normal='installation#'+m.installation_id, decision='operator-decision#'+m.installation_id;
 const lifecycleKey='operator-lifecycle#'+m.installation_id, stateKeys=[normal,decision,lifecycleKey];
 const operatorState=lifecycle?[
  allow(['dynamodb:DescribeTable','dynamodb:Scan'],tableArn),
  allow(['dynamodb:GetItem','dynamodb:Query'],tableArn,leadingKey(stateKeys)),
  transactionWrite(['dynamodb:PutItem','dynamodb:ConditionCheckItem'],tableArn,stateKeys),
  transactionWrite('dynamodb:UpdateItem',tableArn,[normal,lifecycleKey])
 ]:[
  allow(['dynamodb:DescribeTable','dynamodb:GetItem','dynamodb:Query','dynamodb:Scan'],tableArn),
  transactionWrite(['dynamodb:PutItem','dynamodb:UpdateItem'],tableArn,normal),
  transactionWrite('dynamodb:PutItem',tableArn,decision)
 ];
 const operatorStatements=[
  allow('logs:FilterLogEvents',logArn),
  allow('cloudwatch:GetMetricStatistics','*',{StringEquals:{'aws:RequestedRegion':a.region}}),
  allow(['cloudformation:DescribeStacks','cloudformation:DescribeStackResources','cloudformation:DescribeStackEvents'],stack),
  allow('cloudformation:DescribeChangeSet',controlChangeSet),
  allow(['lambda:GetFunction','lambda:GetFunctionConfiguration','lambda:GetFunctionConcurrency','lambda:InvokeFunction','lambda:PutFunctionConcurrency'],functionArn),
  allow('lambda:GetFunctionEventInvokeConfig',functionArn+':$LATEST'),
  allow(['scheduler:GetSchedule','scheduler:UpdateSchedule'],scheduleArn),
  ...operatorState,
  allow('iam:PassRole',schedulerRoleArn,{StringEquals:{'iam:PassedToService':'scheduler.amazonaws.com'}}),
  ...(a.recovery_jira_secret_arn?[allow('secretsmanager:GetSecretValue',a.recovery_jira_secret_arn)]:[]),
  ...(lifecycle?[allow('cloudformation:GetTemplate',stack),allow('cloudformation:DescribeChangeSet',lifecycleChangeSet)]:[]),
  ...operatorAlarmStatements
 ];
 const deployerStatements=[
  allow(['cloudformation:CreateChangeSet','cloudformation:DescribeChangeSet','cloudformation:ExecuteChangeSet','cloudformation:DeleteChangeSet'],
   [stack,controlChangeSet,...(lifecycle?[lifecycleChangeSet]:[])]),
  allow(['cloudformation:DescribeStacks','cloudformation:DescribeStackResources'],stack),
  allow(['lambda:UpdateFunctionCode','lambda:UpdateFunctionConfiguration','lambda:GetFunction','lambda:GetFunctionConfiguration','lambda:PutFunctionConcurrency'],functionArn),
  allow(['scheduler:GetSchedule','scheduler:UpdateSchedule'],scheduleArn),
  allow('logs:PutRetentionPolicy',lifecycle?logGroupArn:logArn),
  allow('iam:PassRole',[runtimeRoleArn,schedulerRoleArn]),
  allow('iam:GetRole',runtimeRoleArn),
  allow('dynamodb:DescribeTable',tableArn),
  allow('iam:GetRole',schedulerRoleArn),
  ...(lifecycle?[allow(['cloudformation:GetTemplate','cloudformation:DescribeStackEvents','cloudformation:DeleteStack'],stack)]:[])
 ];
 const lifecycleMetadata=lifecycle?{
  lifecycle_protocol: LIFECYCLE_PACKAGE_SCHEMA,
  resource_map: {logical,physical},
  remove_execution_policy: policy([
   allow('lambda:DeleteFunction',functionArn),
   allow('lambda:DeleteFunctionEventInvokeConfig',functionArn+':$LATEST'),
   allow('scheduler:DeleteSchedule',scheduleArn),
   allow('logs:DeleteLogGroup',logGroupArn),
   allow(['iam:DeleteRolePolicy','iam:DeleteRole'],[runtimeRoleArn,schedulerRoleArn]),
   ...(alarms.length?[allow(['cloudwatch:DescribeAlarms','cloudwatch:DeleteAlarms'],alarmArns)]:[])
  ]),
  ...(alarms.length?{
   alarm_capability: manifest.alarm_capability,
   alarm_execution_policy: policy(alarmExecutionStatements),
   alarm_tagging_policy: policy([allow(['cloudwatch:TagResource','cloudwatch:UntagResource'],alarmArns)])
  }:{})
 }:{};
 return {AWSTemplateFormatVersion:'2010-09-09',Description:manifest.sender===true?'Pigboard customer-owned ordinary admission runtime.':'Pigboard customer-owned preview runtime; no admission sender.',Metadata:{Pigboard:{source_revision:manifest.source_revision,configuration_digest:manifest.configuration_digest,operator_policy:policy(operatorStatements),configure_deployer_policy:policy(deployerStatements),operator_role_arn:a.operator_role_arn,deployer_role_arn:a.deployer_role_arn,...lifecycleMetadata}},Parameters:{AssetBucket:{Type:'String'},AssetKey:{Type:'String'},AssetVersion:{Type:'String'},QuiescenceConcurrency:{Type:'Number',Default:1,AllowedValues:[0,1]},...(lifecycle?{[LIFECYCLE_TABLE_ID_PARAMETER]:{Type:'String',Default:'',AllowedPattern:'^([0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12})?$'}}:{})},Resources:{
 [logical.table_name]:{Type:'AWS::DynamoDB::Table',DeletionPolicy:'Retain',UpdateReplacePolicy:'Retain',Properties:{TableName:physical.table_name,BillingMode:'PAY_PER_REQUEST',AttributeDefinitions:[{AttributeName:'PK',AttributeType:'S'},{AttributeName:'SK',AttributeType:'S'}],KeySchema:[{AttributeName:'PK',KeyType:'HASH'},{AttributeName:'SK',KeyType:'RANGE'}]}},
 [logical.log_group]:{Type:'AWS::Logs::LogGroup',...(lifecycle?{DeletionPolicy:'Delete'}:{}),Properties:{LogGroupName:physical.log_group,RetentionInDays:m.log_retention_days}},
 [logical.runtime_role]:{Type:'AWS::IAM::Role',Properties:runtimeRoleProperties(config,manifest.sender===true,{manifest})},
 [logical.scheduler_role]:{Type:'AWS::IAM::Role',Properties:{RoleName:physical.scheduler_role,AssumeRolePolicyDocument:policy([{Effect:'Allow',Principal:{Service:'scheduler.amazonaws.com'},Action:'sts:AssumeRole',Condition:{StringEquals:{'aws:SourceAccount':a.account_id},ArnEquals:{'aws:SourceArn':arn('scheduler','schedule-group/default')}}}]),Policies:[{PolicyName:'invoke-only',PolicyDocument:policy([allow('lambda:InvokeFunction',functionArn)])}]}},
 [logical.function_name]:{Type:'AWS::Lambda::Function',DependsOn:logical.log_group,Properties:{FunctionName:physical.function_name,Runtime:'nodejs24.x',Architectures:['arm64'],Handler:'lib/aws/manager-lambda.handler',MemorySize:256,Timeout:m.invocation_timeout_seconds,ReservedConcurrentExecutions:ref('QuiescenceConcurrency'),Role:get(logical.runtime_role,'Arn'),Code:{S3Bucket:ref('AssetBucket'),S3Key:ref('AssetKey'),S3ObjectVersion:ref('AssetVersion')},Environment:{Variables:{PB_INSTALLATION_ID:m.installation_id,PB_DOMAIN_ID:m.domain_id,PB_INSTALLATION_GENERATION:manifest.installation_generation,PB_PACKAGE_REVISION:manifest.source_revision,PB_CONFIGURATION_DIGEST:manifest.configuration_digest,PB_MODE:projection.mode,PB_WRITES_ENABLED:String(projection.control.writes_enabled),PB_TABLE_NAME:ref(logical.table_name),PB_TABLE_ARN:get(logical.table_name,'Arn'),PB_STACK_ID:ref('AWS::StackId'),...(lifecycle?{[LIFECYCLE_TABLE_ID_ENV]:ref(LIFECYCLE_TABLE_ID_PARAMETER)}:{})}}}},
 AsyncInvocation:{Type:'AWS::Lambda::EventInvokeConfig',Properties:{FunctionName:ref(logical.function_name),Qualifier:'$LATEST',MaximumRetryAttempts:0,MaximumEventAgeInSeconds:60}},
 [logical.schedule_name]:{Type:'AWS::Scheduler::Schedule',Properties:{Name:physical.schedule_name,State:'DISABLED',ScheduleExpression:`rate(${m.schedule_minutes} minutes)`,FlexibleTimeWindow:{Mode:'OFF'},Target:{Arn:get(logical.function_name,'Arn'),RoleArn:get(logical.scheduler_role,'Arn'),Input:JSON.stringify({operation:projection.mode}),RetryPolicy:{MaximumRetryAttempts:0,MaximumEventAgeInSeconds:60}}}},
 ...alarmResources
 },Outputs:{FunctionArn:{Value:get(logical.function_name,'Arn')},FunctionName:{Value:ref(logical.function_name)},ScheduleName:{Value:ref(logical.schedule_name)},ScheduleArn:{Value:scheduleArn},LogGroupName:{Value:ref(logical.log_group)},TableName:{Value:ref(logical.table_name)},TableArn:{Value:get(logical.table_name,'Arn')},StackId:{Value:ref('AWS::StackId')},InstallationGeneration:{Value:manifest.installation_generation},...alarmOutputs}};
}
