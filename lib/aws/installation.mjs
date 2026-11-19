import { closeSync, constants, fstatSync, openSync, readFileSync, readSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { sep } from 'node:path';
import {performance} from 'node:perf_hooks';
import { createHash, randomUUID } from 'node:crypto';
import canonicalize from 'canonicalize';
import { parseConfig } from '../config/parse.mjs';
import { parseContract } from '../contracts/work.mjs';
import { validBinding, validateRecord, nextRevision, failure, result, valid, originEvidenceSchema, operatorActorId, STOP_KEYS, completedStop } from '../state/contract.mjs';
import { readReconciliationContext, projectBoundRuntime } from './reconcile-context.mjs';
import * as dynamo from './dynamodb.mjs';
const { createDynamoState } = dynamo;
import * as deployment from './template.mjs';
import { currentSupersededUpdate, pendingRecovery, recordedEnablement, recoverableSupersededUpdate, rotateHealthEpoch, verifyLifecycleRecovery } from '../manager/lifecycle.mjs';

export const sha256 = value => 'sha256:'+createHash('sha256').update(value).digest('hex');
export const hostError = code => Object.assign(new Error(code), {code});
// Physical names use the full validated canonical ID; readable replacement alone is lossy.
export function installationResourceBase(installationId){
  const readable=installationId.replace(/[^A-Za-z0-9-]/g,'-').slice(0,12),digest=createHash('sha256').update(installationId).digest('hex').slice(0,32);
  return 'pigboard-'+readable+'-'+digest;
}
const same=(a,b)=>canonicalize(a)===canonicalize(b);
const manifestDigest = manifest => sha256(canonicalize(manifest));
const lifecycle = manifest => manifest?.schema === 'pigboard-manager-package/v2';
const lifecycleReceiptSchema = 'pigboard-installation-receipt/v2';
const disabled = {schedule_enabled:false,writes_enabled:false,maintenance:true};
export function hostConfig(text,{evidence=false}={}){
  const parsed=parseConfig(text);
  if(!parsed.valid){
    const recoveryInvalid=parsed.diagnostics.some(({code,path})=>path==='/manager/aws/recovery_jira_secret_arn'&&['HOST_SETTINGS','FORMAT','LIMIT','STRUCTURE'].includes(code));
    throw hostError(evidence&&recoveryInvalid?'RECOVERY_SECRET_INVALID':'INVALID_CONFIG');
  }
  const config=parseContract(text);if(!config.manager||parsed.live_configuration.status!=='complete')throw hostError('HOST_SETTINGS_REQUIRED');
  const m=config.manager,a=m.aws;
  if(!new RegExp('^arn:aws:secretsmanager:'+a.region+':'+a.account_id+':secret:[A-Za-z0-9/_+=.@-]+$').test(config.jira.connection.secret_reference))throw hostError('SECRET_REFERENCE');
  if(40+config.jira.read_bounds.scan_timeout_ms/1000>m.invocation_timeout_seconds)throw hostError('READ_BUDGET');
  if(m.controls.mode==='apply'&&310+2*config.jira.read_bounds.scan_timeout_ms/1000+6*config.jira.read_bounds.request_timeout_ms/1000>m.invocation_timeout_seconds)throw hostError('APPLY_BUDGET');
  return {config,digest:parsed.configuration_digest};
}
export function deriveHostControls(configText,{package_revision,binding}={}){
  const {config,digest}=hostConfig(configText),m=config.manager;
  if(!/^[a-f0-9]{40}$/.test(package_revision??''))throw hostError('PACKAGE_REVISION');
  const control={configuration_digest:digest,schedule_enabled:m.controls.schedule_enabled,writes_enabled:m.controls.writes_enabled,maintenance:m.controls.maintenance};
  if(binding&&(!validBinding(binding,{...control,configuration_digest:binding.configuration_digest})||binding.installation_id!==m.installation_id||binding.domain_id!==m.domain_id||binding.region!==m.aws.region||binding.site!==config.jira.site||binding.package_revision!==package_revision))throw hostError('BINDING_MISMATCH');
  return {configuration_digest:digest,installation_id:m.installation_id,domain_id:m.domain_id,package_revision,control,rework_enabled:m.rework_enabled===true,mode:m.controls.mode,activation:structuredClone(m.activation),transition_edges:structuredClone(m.transition_edges)};
}
export function senderCapability(projection,manifest){if(manifest?.sender!==true)previewOnly(projection);}
export function previewOnly(projection){if(projection.mode!=='preview'||projection.control.writes_enabled)throw hostError('APPLY_UNSUPPORTED');}
export function loadHostSDK(){
  try{
    const url=new URL('../../runtime/aws/package.json',import.meta.url),require=createRequire(url),manifest=JSON.parse(readFileSync(url)),base=realpathSync(fileURLToPath(new URL('./node_modules/',url)))+sep;
    const names=['client-cloudformation','client-secrets-manager','client-lambda','client-scheduler','client-sts','credential-providers','client-dynamodb','lib-dynamodb','client-cloudwatch','client-cloudwatch-logs'];let sdk={};
    for(const short of names){const name='@aws-sdk/'+short,p=realpathSync(require.resolve(name+'/package.json'));if(!p.startsWith(base)||!realpathSync(require.resolve(name)).startsWith(base)||JSON.parse(readFileSync(p)).version!==manifest.dependencies[name])throw Error();Object.assign(sdk,require(name));}return sdk;
  }catch{throw hostError('SETUP');}
}
const clientDeadlines=new WeakMap();
export async function awsSend(client,sdk,name,input,duration=10000){const remaining=(clientDeadlines.get(client)??Infinity)-performance.now();if(remaining<=0)throw hostError('HEALTH_DEADLINE');const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),Math.min(duration,remaining));try{return await client.send(new sdk[name](input),{abortSignal:abort.signal});}finally{clearTimeout(timer);}}
export function roleMatches(arn,role,account){
  if(arn===role)return role.startsWith('arn:aws:iam::'+account+':role/');
  const path=role.split(':role/')[1];if(!path||path.includes('/'))return false;
  return new RegExp('^arn:aws:sts::'+account+':assumed-role/'+path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/[^/]+$').test(arn??'');
}
export async function openHostSession(config,{operatorProfile,deployerProfile,configure=false,health=false,requireVerifiedOperatorIdentity=false,needRecoverySecretClient=false,deadline,sdk=loadHostSDK(),makeClient}={}){
  if(!operatorProfile||configure&&!deployerProfile)throw hostError('PROFILE_REQUIRED');
  const owned=[];const create=(kind,credentials)=>{const options={region:config.manager.aws.region,maxAttempts:1,credentials};const client=makeClient?makeClient(kind,options):new sdk[kind+'Client'](options);owned.push(client);if(health)clientDeadlines.set(client,deadline??performance.now()+30000);return client;};
  let closed=false;const dispose=()=>{if(!closed){closed=true;for(const client of owned)client.destroy?.();}};
  try{
    const verify=async(profile,role,requireIdentity=false)=>{
      const provider=sdk.fromIni({profile});let timer;
      const supplied=health?await Promise.race([provider(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(hostError('HEALTH_DEADLINE')),Math.max(1,(deadline??performance.now()+30000)-performance.now()));})]).finally(()=>clearTimeout(timer)):await provider();
      if(requireIdentity&&(!supplied?.accessKeyId||!supplied?.secretAccessKey))throw hostError('PROFILE_REQUIRED');
      const credentials=requireIdentity?Object.freeze({...supplied}):supplied;
      const {Account,UserId,Arn}=await awsSend(create('STS',credentials),sdk,'GetCallerIdentityCommand',{})??{};
      if(Account!==config.manager.aws.account_id||!roleMatches(Arn,role,Account)||
        (requireIdentity&&(
          typeof UserId!=='string'||!UserId.trim()||/[\x00-\x1f\x7f]/.test(UserId)||
          !/^arn:aws:sts::[0-9]{12}:assumed-role\/[A-Za-z0-9_+=,.@-]+\/[A-Za-z0-9_+=,.@-]+$/.test(Arn??'')))){
        throw hostError('IDENTITY_MISMATCH');
      }
      return {credentials,identity:{Account,UserId,Arn}};
    };
    const verified=await verify(operatorProfile,config.manager.aws.operator_role_arn,requireVerifiedOperatorIdentity),operator=verified.credentials;
    const deployer=configure?await verify(deployerProfile,config.manager.aws.deployer_role_arn,requireVerifiedOperatorIdentity):null;
    const raw=create('DynamoDB',operator),document=makeClient?makeClient('DynamoDBDocument',{region:config.manager.aws.region,maxAttempts:1,credentials:operator}):sdk.DynamoDBDocumentClient.from(raw,{marshallOptions:{removeUndefinedValues:false}});
    // The document wrapper has its own identity; retain the raw client's absolute expiry.
    if(health)clientDeadlines.set(document,clientDeadlines.get(raw));
    if(makeClient)owned.push(document);
    let secrets;
    const getRecoverySecretClient = () => {
      if (closed || !requireVerifiedOperatorIdentity || !needRecoverySecretClient || !config.manager.aws.recovery_jira_secret_arn) {
        throw hostError('RECOVERY_SECRET_UNAVAILABLE');
      }
      return secrets ??= create('SecretsManager',operator);
    };
    return {sdk,operator:{cloudformation:create('CloudFormation',operator),lambda:create('Lambda',operator),scheduler:create('Scheduler',operator),state:document,...(health?{logs:create('CloudWatchLogs',operator),metrics:create('CloudWatch',operator)}:{}),...(requireVerifiedOperatorIdentity?{identity:verified.identity}:{}),...(needRecoverySecretClient?{getRecoverySecretClient}:{})},deployer:deployer?{cloudformation:create('CloudFormation',deployer.credentials),identity:deployer.identity}:null,dispose};
  }catch(error){dispose();throw error;}
}
function validateManifestInputs(manifest,configText){
  const projection=deriveHostControls(configText,{package_revision:manifest?.source_revision});
  if(typeof manifest?.schema!=='string'||!/^pigboard-manager-package\/v[1-9][0-9]*$/.test(manifest.schema)||
    manifest.configuration_digest!==projection.configuration_digest||manifest.installation_id!==projection.installation_id||
    manifest.domain_id!==projection.domain_id||!/^sha256:[0-9a-f]{64}$/.test(manifest.zip_digest??'')||
    !/^[-A-Za-z0-9._:]{1,255}$/.test(manifest.installation_generation??''))throw hostError('PACKAGE_MISMATCH');
  const supplied=hostConfig(configText);
  let embedded;
  try{embedded=hostConfig(JSON.stringify(manifest.canonical_config));}
  catch{throw hostError('PACKAGE_MISMATCH');}
  if(embedded.digest!==supplied.digest||!same(embedded.config,supplied.config))throw hostError('PACKAGE_MISMATCH');
  return projection;
}
export function validateManifest(manifest,configText){
  if(!['pigboard-manager-package/v1','pigboard-manager-package/v2'].includes(manifest?.schema))throw hostError('PACKAGE_MISMATCH');
  const projection=validateManifestInputs(manifest,configText);
  if(lifecycle(manifest))deployment.assertLifecycleManifest(manifest);
  senderCapability(projection,manifest);
  return projection;
}
function outputMap(stack){return Object.fromEntries((stack.Outputs??[]).map(v=>[v.OutputKey,v.OutputValue]));}
async function observeResources({config,manifest,stackId,session},{recovery=false,authorityOnly=false,settlement=false,originalTableId,allowMissingPin=false}={}){
  const {sdk,operator:o}=session,a=config.manager.aws;
  if(!new RegExp('^arn:aws:cloudformation:'+a.region+':'+a.account_id+':stack/'+a.stack_name+'/[A-Za-z0-9-]+$').test(stackId??''))throw hostError('BINDING_MISMATCH');
  const response=await awsSend(o.cloudformation,sdk,'DescribeStacksCommand',{StackName:stackId}),stack=response.Stacks?.[0];if(!stack||stack.StackId!==stackId)throw hostError('BINDING_MISMATCH');
  const outputs=outputMap(stack),resources=(await awsSend(o.cloudformation,sdk,'DescribeStackResourcesCommand',{StackName:stackId})).StackResources??[];
  const physical=id=>resources.find(r=>r.LogicalResourceId===id)?.PhysicalResourceId;
  const map = deployment.installationResourceMap(config.manager.installation_id, manifest);
  const names = Object.fromEntries(Object.entries(map.logical).map(([key, id]) => [key, physical(id)]));
  if (!same(names, map.physical)) throw hostError('BINDING_MISMATCH');
  const fn=await awsSend(o.lambda,sdk,'GetFunctionCommand',{FunctionName:names.function_name}),fc=await awsSend(o.lambda,sdk,'GetFunctionConfigurationCommand',{FunctionName:names.function_name}),concurrency=await awsSend(o.lambda,sdk,'GetFunctionConcurrencyCommand',{FunctionName:names.function_name}),schedule=await awsSend(o.scheduler,sdk,'GetScheduleCommand',{Name:names.schedule_name}),table=(await awsSend(o.state,sdk,'DescribeTableCommand',{TableName:names.table_name})).Table;
  const env=fc.Environment?.Variables??{},m=config.manager;
  const binding={schema:'pigboard-aws-installation/v1',installation_id:m.installation_id,domain_id:m.domain_id,site:config.jira.site,configuration_digest:manifest.configuration_digest,package_revision:manifest.source_revision,region:a.region,stack_id:stackId,table_name:names.table_name,table_arn:table?.TableArn,installation_generation:manifest.installation_generation};
  const expectedEnv={PB_INSTALLATION_ID:m.installation_id,PB_DOMAIN_ID:m.domain_id,PB_INSTALLATION_GENERATION:manifest.installation_generation,...(recovery?{}:{PB_PACKAGE_REVISION:manifest.source_revision,PB_CONFIGURATION_DIGEST:manifest.configuration_digest,PB_MODE:m.controls.mode,PB_WRITES_ENABLED:String(m.controls.writes_enabled)}),PB_TABLE_NAME:names.table_name,PB_TABLE_ARN:table?.TableArn,PB_STACK_ID:stackId};
  if(!validBinding(binding,{configuration_digest:binding.configuration_digest,schedule_enabled:false,writes_enabled:false,maintenance:false})||table?.TableArn!==`arn:aws:dynamodb:${a.region}:${a.account_id}:table/${names.table_name}`||table?.TableStatus!=='ACTIVE'||!same(table.KeySchema,[{AttributeName:'PK',KeyType:'HASH'},{AttributeName:'SK',KeyType:'RANGE'}])||!same(table.AttributeDefinitions,[{AttributeName:'PK',AttributeType:'S'},{AttributeName:'SK',AttributeType:'S'}])||Object.entries(expectedEnv).some(([k,v])=>env[k]!==v)||fc.Role!==`arn:aws:iam::${a.account_id}:role/${names.runtime_role}`||fn.Configuration?.FunctionArn!==`arn:aws:lambda:${a.region}:${a.account_id}:function:${names.function_name}`||fn.Configuration?.FunctionArn!==outputs.FunctionArn||fc.FunctionArn!==outputs.FunctionArn||(!recovery&&(fc.Runtime!=='nodejs24.x'||fc.Handler!=='lib/aws/manager-lambda.handler'||fc.Timeout!==m.invocation_timeout_seconds||fc.LastUpdateStatus!=='Successful'||fc.State!=='Active'||fn.Configuration?.CodeSha256!==Buffer.from(manifest.zip_digest.slice(7),'hex').toString('base64')))||schedule.Target?.Arn!==outputs.FunctionArn||schedule.Target?.RoleArn!==`arn:aws:iam::${a.account_id}:role/${names.scheduler_role}`)throw hostError('BINDING_MISMATCH');
  if (lifecycle(manifest) && !recovery) {
    const pin = env[deployment.LIFECYCLE_TABLE_ID_ENV];
    if (!physicalTableId(table?.TableId) || (originalTableId && table.TableId !== originalTableId) ||
        (allowMissingPin ? !['', undefined, table.TableId].includes(pin) : pin !== table.TableId)) {
      throw hostError('PHYSICAL_STATE_MISMATCH');
    }
  }
  if(!recovery&&!authorityOnly&&(schedule.Target?.Input!==JSON.stringify({operation:m.controls.mode})||schedule.Target?.RetryPolicy?.MaximumRetryAttempts!==0||schedule.Target?.RetryPolicy?.MaximumEventAgeInSeconds!==60||schedule.FlexibleTimeWindow?.Mode!=='OFF'))throw hostError(settlement?'BOUNDS_UNSUPPORTED':'BINDING_MISMATCH');
  if(!recovery&&!authorityOnly&&(concurrency.ReservedConcurrentExecutions!==0&&concurrency.ReservedConcurrentExecutions!==1))throw hostError('BINDING_MISMATCH');
  let asyncConfig;
  if(!recovery&&!authorityOnly){
    try { asyncConfig=await awsSend(o.lambda,sdk,'GetFunctionEventInvokeConfigCommand',{FunctionName:names.function_name,Qualifier:'$LATEST'}); }
    catch (error) { if(settlement)throw hostError('BOUNDS_UNSUPPORTED');throw error; }
    if(asyncConfig?.FunctionArn!==fn.Configuration.FunctionArn+':$LATEST'||asyncConfig?.MaximumRetryAttempts!==0||asyncConfig?.MaximumEventAgeInSeconds!==60)throw hostError(settlement?'BOUNDS_UNSUPPORTED':'BINDING_MISMATCH');
  }
  return {binding,names,stack,outputs,function:fc,code_hash:fn.Configuration?.CodeSha256,concurrency:concurrency.ReservedConcurrentExecutions,schedule,table,asyncConfig};
}
export async function observeInstallation(input){return observeResources(input);}
function validatedReceipt(receipt){
  const text=JSON.stringify(receipt?.manifest?.canonical_config),projection=validateManifest(receipt?.manifest,text),{config}=hostConfig(text),b=receipt?.binding;
  if(receipt.schema!==(lifecycle(receipt.manifest)?lifecycleReceiptSchema:'pigboard-installation-receipt/v1')||!validBinding(b,projection.control)||b.installation_id!==projection.installation_id||b.domain_id!==projection.domain_id||b.site!==config.jira.site||b.region!==config.manager.aws.region||b.package_revision!==receipt.manifest.source_revision||['stack_id','table_name','table_arn','installation_generation'].some(k=>receipt.original?.[k]!==b[k])||b.installation_generation!==receipt.manifest.installation_generation)throw hostError('BINDING_MISMATCH');
  if(lifecycle(receipt.manifest)&&(!valid(receipt.origin,originEvidenceSchema)||
    !physicalTableId(receipt.origin.table_id)||receipt.birth_operator_role!==config.manager.aws.operator_role_arn||
    !/^[a-f0-9]{40}$/.test(receipt.birth_package_revision??'')||
    !/^sha256:[a-f0-9]{64}$/.test(receipt.birth_manifest_digest??'')||
    ['installation_id','domain_id','site','stack_id','table_arn','installation_generation'].some(key=>receipt.origin[key]!==b[key])))
    throw hostError('ORIGIN_UNVERIFIED');
  return {config,projection};
}
function recoveryMetadata(resolved,applied){
  const {receipt,projection,observed:o}=resolved,env=o.function.Environment?.Variables??{},safe=v=>['string','number','boolean'].includes(typeof v)?v:null;
  return {package_verified:false,warning:'Recovery observation only; package and runtime safety are unverified. No enable, apply or replay authority.',original:{binding:receipt.binding,zip_digest:receipt.manifest.zip_digest},desired:{...projection.control,package_revision:projection.package_revision},observed:{configuration_digest:safe(env.PB_CONFIGURATION_DIGEST),package_revision:safe(env.PB_PACKAGE_REVISION),code_hash:safe(o.code_hash),timeout_seconds:safe(o.function.Timeout),function_state:safe(o.function.State),update_status:safe(o.function.LastUpdateStatus),schedule_state:safe(o.schedule.State),concurrency:safe(o.concurrency)},applied:applied?{configuration_digest:applied.configuration_digest,package_revision:applied.package_revision,schedule_enabled:applied.schedule_enabled,writes_enabled:applied.writes_enabled,maintenance:applied.maintenance,revision:applied.revision}:null,omissions:'Null observations are unavailable; mutable observations never replace original receipt authority.'};
}
export async function bindInstallation({configText,manifest,stackId,operatorProfile},dependencies={}){
  const projection=validateManifest(manifest,configText);
  const {config}=hostConfig(configText),v2=lifecycle(manifest);
  const session=await openHostSession(config,{...dependencies,operatorProfile,requireVerifiedOperatorIdentity:v2});
  try{
    const observed=await observeResources({config,manifest,stackId,session},{allowMissingPin:v2});
    if(config.manager.controls.schedule_enabled===false&&observed.schedule.State==='ENABLED')throw hostError('BINDING_MISMATCH');
    const receipt={schema:v2?lifecycleReceiptSchema:'pigboard-installation-receipt/v1',binding:observed.binding,manifest,
      original:{stack_id:stackId,table_name:observed.binding.table_name,table_arn:observed.binding.table_arn,installation_generation:manifest.installation_generation},
      observed_at:new Date().toISOString()};
    if(v2){
      if(projection.control.schedule_enabled||projection.control.writes_enabled||observed.schedule.State!=='DISABLED'||
        observed.concurrency!==1||observed.function.Environment?.Variables?.[deployment.LIFECYCLE_TABLE_ID_ENV])throw hostError('FRESH_INSTALLATION_REQUIRED');
      const birth=await classifyBirth({appliedConfig:config,receipt,observed,session},true);
      if(birth.kind!=='protected')throw hostError('ORIGIN_UNVERIFIED');
      receipt.origin=birth.evidence;
      receipt.birth_package_revision=manifest.source_revision;
      receipt.birth_operator_role=config.manager.aws.operator_role_arn;
      receipt.birth_manifest_digest=manifestDigest(manifest);
    }
    return receipt;
  }finally{session.dispose();}
}
const instant = value => value instanceof Date ? value.getTime() : typeof value === 'string' ? Date.parse(value) : NaN;
const originalTime = value => new Date(value).toISOString();
const physicalTableId = value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const eventId = value => typeof value === 'string' && /^[A-Za-z0-9._:/+=-]{1,1024}$/.test(value);

function originalCreateEvidence(observed, events, fresh) {
  const { stack, names, table } = observed;
  if (!events.length || (fresh && (stack.StackStatus !== 'CREATE_COMPLETE' || events.some(event => /UPDATE|DELETE|ROLLBACK|IMPORT|FAILED/.test(event?.ResourceStatus ?? ''))))) return null;
  const exactStack = event => event?.StackId === stack.StackId &&
    event.PhysicalResourceId === stack.StackId && event.ResourceType === 'AWS::CloudFormation::Stack';
  const milestone = status => events.filter(event => exactStack(event) && event.ResourceStatus === status);
  const started = milestone('CREATE_IN_PROGRESS'), completed = milestone('CREATE_COMPLETE');
  if (started.length !== 1 || completed.length !== 1) return null;
  const start = instant(started[0].Timestamp), end = instant(completed[0].Timestamp), creation = instant(stack.CreationTime);
  if (![start, end, creation].every(Number.isFinite) || creation > start || start >= end) return null;
  if (fresh && stack.LastUpdatedTime !== undefined && instant(stack.LastUpdatedTime) !== start) return null;

  const originalResource = (logical, type, physical) => {
    const rows = events.filter(event => event?.StackId === stack.StackId && event.LogicalResourceId === logical);
    if (rows.some(event => event.ResourceType !== type ||
      (event.PhysicalResourceId && event.PhysicalResourceId !== physical) ||
      !Number.isFinite(instant(event.Timestamp)) || instant(event.Timestamp) < start || instant(event.Timestamp) > end ||
      !['CREATE_IN_PROGRESS', 'CREATE_COMPLETE'].includes(event.ResourceStatus))) return null;
    const successes = rows.filter(event => event.ResourceStatus === 'CREATE_COMPLETE' &&
      event.PhysicalResourceId === physical && eventId(event.EventId));
    return successes.length === 1 ? successes[0] : null;
  };
  const roleEvent = originalResource('RuntimeRole', 'AWS::IAM::Role', names.runtime_role);
  const tableEvent = originalResource('StateTable', 'AWS::DynamoDB::Table', names.table_name);
  const tableCreated = instant(table?.CreationDateTime);
  if (!roleEvent || !tableEvent || roleEvent.EventId === tableEvent.EventId || !physicalTableId(table?.TableId) ||
    !Number.isFinite(tableCreated) || tableCreated < start || tableCreated > instant(tableEvent.Timestamp)) return null;
  return { roleEvent, tableEvent, tableCreated };
}

async function classifyBirth({ appliedConfig, receipt, observed, session }, fresh = false) {
  const { binding } = observed;
  const unverified = { kind: 'unverified' };
  try {
    const events = [], tokens = new Set();
    let token;
    for (let index = 0; index < (fresh ? 1 : 8); index++) {
      const page = await awsSend(session.operator.cloudformation, session.sdk, 'DescribeStackEventsCommand', {
        StackName: binding.stack_id, ...(token ? { NextToken: token } : {})
      });
      if (!Array.isArray(page?.StackEvents) || page.StackEvents.some(event => !event || typeof event !== 'object')) return unverified;
      events.push(...page.StackEvents);
      if (page.NextToken === undefined) {
        const birth = originalCreateEvidence(observed, events, fresh);
        const raw = birth?.roleEvent.ResourceProperties;
        if (typeof raw !== 'string' || !raw.length || Buffer.byteLength(raw) > 32768) return unverified;
        const shown = JSON.parse(raw);
        const { runtimeRoleProperties } = await import('./template.mjs');
        const expected = runtimeRoleProperties(appliedConfig, receipt.manifest.sender === true, {manifest:receipt.manifest});
        if (!same(shown, expected)) {
          if (lifecycle(receipt.manifest)) return unverified;
          return same(shown, runtimeRoleProperties(appliedConfig, receipt.manifest.sender === true, { legacy: true }))
            ? { kind: 'legacy' } : unverified;
        }
        const { installation_id, domain_id, site, stack_id, installation_generation, table_arn } = binding;
        return { kind: 'protected', evidence: {
          installation_id, domain_id, site, stack_id, installation_generation, table_arn,
          table_id: observed.table.TableId,
          table_created_at: originalTime(birth.tableCreated),
          role_event_id: birth.roleEvent.EventId,
          role_event_at: originalTime(instant(birth.roleEvent.Timestamp)),
          table_event_id: birth.tableEvent.EventId,
          table_event_at: originalTime(instant(birth.tableEvent.Timestamp)),
          policy_digest: sha256(canonicalize(expected))
        } };
      }
      token = page.NextToken;
      if (typeof token !== 'string' || !token.length || tokens.has(token)) return unverified;
      tokens.add(token);
    }
  } catch { return unverified; }
  return unverified;
}

function evidenceBinding(binding){
  return Object.fromEntries(['installation_id','domain_id','site','configuration_digest','package_revision'].map(key=>[key,binding[key]]));
}

function readOriginalAuthority(path,current,config,currentReceipt){
  if(!path)return null;
  // Generated receipts include the canonical configuration and all dependency file hashes.
  const limit=8*1024*1024;
  let fd;
  try{
    fd=openSync(path,constants.O_RDONLY|constants.O_NONBLOCK);
    const stat=fstatSync(fd);
    if(!stat.isFile()||stat.size>limit)return null;
    const bytes=Buffer.alloc(stat.size+1);
    let size=0;
    while(size<bytes.length){
      const count=readSync(fd,bytes,size,bytes.length-size,null);
      if(count===0)break;
      size+=count;
    }
    if(size!==stat.size)return null;
    const receipt=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,size)));
    const {config:original}=validatedReceipt(receipt);
    if(['installation_id','domain_id','site','region','stack_id','table_name','table_arn','installation_generation'].some(key=>receipt.binding[key]!==current[key])||
      ['account_id','region','stack_name'].some(key=>original.manager.aws[key]!==config.manager.aws[key]))return null;
    if(lifecycle(currentReceipt?.manifest)&&(!lifecycle(receipt.manifest)||receipt.recovery_only||
      !same(currentReceipt.origin,receipt.origin)||currentReceipt.birth_manifest_digest!==receipt.birth_manifest_digest))return null;
    return {configInput:JSON.stringify(original),binding:evidenceBinding(receipt.binding)};
  }catch{return null;}finally{if(fd!==undefined)closeSync(fd);}
}

function evidenceAuthority(config,binding,session,originalPath,receipt){
  const {recovery_jira_secret_arn:secretArn}=config.manager.aws;
  const reference=config.jira.connection.secret_reference;
  let outcome='not-called';
  const reject=code=>{outcome=code;throw hostError(code);};
  const resolveSecret=secretArn?async(selector,signal)=>{
    if(selector!==reference)reject('RECOVERY_SECRET_IDENTITY_MISMATCH');
    let response;
    try{
      response=await session.operator.getRecoverySecretClient().send(new session.sdk.GetSecretValueCommand({SecretId:secretArn}),{abortSignal:signal});
    }catch(error){
      const denied=['AccessDenied','AccessDeniedException'].includes(error?.name)&&[400,403].includes(error?.$metadata?.httpStatusCode);
      reject(denied?'RECOVERY_SECRET_DENIED':'RECOVERY_SECRET_UNAVAILABLE');
    }
    if(response?.ARN!==secretArn)reject('RECOVERY_SECRET_IDENTITY_MISMATCH');
    const value=response.SecretString;
    if(typeof value!=='string'||!value.trim()||Buffer.byteLength(value)>16384||/[\x00-\x1f\x7f]/.test(value))reject('RECOVERY_SECRET_UNAVAILABLE');
    outcome='OK';
    return value;
  }:null;
  return {configInput:JSON.stringify(config),binding:evidenceBinding(binding),original:readOriginalAuthority(originalPath,binding,config,receipt),
    resolveSecret,recoverySecretConfigured:!!secretArn,recoverySecretOutcome:()=>outcome};
}

export async function resolveInstallation({configPath,installationPath,purpose,operatorProfile,originalInstallationPath},dependencies={}){
  const evidence=purpose==='evidence-inspect', reconcile=purpose==='reconcile';
  const sensitive=evidence||reconcile||purpose==='decision-inspect', initialize=purpose==='init';
  let session,phase='config';
  try{
    const text=readFileSync(configPath,'utf8'),{config}=hostConfig(text,{evidence:evidence||reconcile});
    const sessionOptions={operatorProfile,...dependencies,
      ...(sensitive||initialize?{configure:false,requireVerifiedOperatorIdentity:true,needRecoverySecretClient:evidence||reconcile}:{})};
    if(sensitive){
      phase='operator';
      session=await openHostSession(config,sessionOptions);
    }
    phase='installation';
    const receipt=JSON.parse(readFileSync(installationPath,'utf8')),projection=deriveHostControls(text,{package_revision:receipt.manifest?.source_revision});
    const recovery=['recovery-inspect','safe-stop'].includes(purpose);if(recovery&&dependencies.health)throw hostError('BINDING_MISMATCH');
    if(receipt.recovery_only&&!recovery)throw hostError('RECOVERY_RECEIPT_RESTRICTED');
    senderCapability(projection,receipt.manifest);const {config:appliedConfig,projection:appliedProjection}=validatedReceipt(receipt);
    if(config.manager.installation_id!==appliedConfig.manager.installation_id||config.manager.domain_id!==appliedConfig.manager.domain_id||config.jira.site!==appliedConfig.jira.site||!same(config.manager.aws,appliedConfig.manager.aws))throw hostError('BINDING_MISMATCH');

    session??=await openHostSession(config,sessionOptions);
    const observationArgs={config:appliedConfig,manifest:receipt.manifest,stackId:receipt.binding.stack_id,session};
    const observed=await observeResources(observationArgs,{recovery,authorityOnly:reconcile||purpose==='decision-inspect',allowMissingPin:initialize&&lifecycle(receipt.manifest),originalTableId:receipt.origin?.table_id});
    if(lifecycle(receipt.manifest)&&!matchesBirthTable(observed.table,receipt))throw hostError('PHYSICAL_STATE_MISMATCH');
    if(!same(observed.binding,receipt.binding)||['stack_id','table_name','table_arn','installation_generation'].some(k=>receipt.original?.[k]!==observed.binding[k]))throw hostError('BINDING_MISMATCH');
    if(!initialize&&!recovery&&!sensitive&&!dependencies.health&&appliedConfig.manager.controls.schedule_enabled===false&&observed.schedule.State==='ENABLED')throw hostError('BINDING_MISMATCH');
    let fresh_installation,originEvidence,birthClassification;
    if(initialize||reconcile||purpose==='decision-inspect'){
      const birth=lifecycle(receipt.manifest)&&!initialize ?
        {kind:'protected',evidence:receipt.origin} : await classifyBirth({appliedConfig,receipt,observed,session},initialize);
      if(lifecycle(receipt.manifest)&&(birth.kind!=='protected'||!same(birth.evidence,receipt.origin)))throw hostError('ORIGIN_UNVERIFIED');
      originEvidence=birth.evidence??null;birthClassification=birth.kind;
      if(initialize){
        if(birth.kind==='unverified'||projection.configuration_digest!==receipt.manifest.configuration_digest||observed.concurrency!==1||observed.schedule.State!=='DISABLED'||Object.values(projection.control).some(v=>v===true))throw hostError('FRESH_INSTALLATION_REQUIRED');
        fresh_installation={installation_id:projection.installation_id,domain_id:projection.domain_id,site:config.jira.site,configuration_digest:projection.configuration_digest,installation_generation:receipt.binding.installation_generation,observed_at:new Date().toISOString(),new_installation:true,table_empty:true};
      }
    }
    const binding=sensitive?observed.binding:{...receipt.binding,configuration_digest:projection.configuration_digest};
    const resolved={lifecycleInit:initialize&&lifecycle(receipt.manifest),binding,control:projection.control,client:session.operator.state,dispose:session.dispose,fresh_installation,originEvidence,birthClassification,session,observed,receipt,projection,config};
    const lifecycleState = lifecycle(receipt.manifest) && (reconcile || purpose==='decision-inspect')
      ? lifecycleAdapter(receipt, session) : null;
    if(lifecycleState && (reconcile || purpose==='decision-inspect')){
      const current = checked(await lifecycleState.read());
      if(!current.lifecycle.bootstrapped || !receiptMatchesState(receipt, current.installation) ||
          !roleMatches(current.lifecycle.actor?.arn,receipt.birth_operator_role,config.manager.aws.account_id))throw hostError('PHYSICAL_STATE_MISMATCH');
    }
    if(evidence)resolved.evidenceAuthority=evidenceAuthority(appliedConfig,binding,session,originalInstallationPath,receipt);
    if(reconcile){
      let authority;
      resolved.getEvidenceAuthority=()=>authority??=evidenceAuthority(appliedConfig,binding,session,originalInstallationPath,receipt);
      const fixtureGeneration=dependencies.sdk&&typeof dependencies.makeClient==='function'&&typeof dependencies.currentStopGeneration==='function'
        ? dependencies.currentStopGeneration : undefined;
      resolved.checkReconciliationStop=async installation=>{
        let current;
        try{current=await observeResources(observationArgs,{settlement:true,originalTableId:receipt.origin?.table_id});}
        catch(error){return result('conflict',error.code==='BOUNDS_UNSUPPORTED'?'BOUNDS_UNSUPPORTED':'CONTROL_MISMATCH');}
        return readReconciliationContext({binding,config:appliedConfig,desired:projection.control,
          applied:appliedProjection.control,observed:current,originEvidence,installation},lifecycleState ? scope=>lifecycleState.readGeneration(scope) : fixtureGeneration);
      };
    }
    if(recovery){resolved.quiescence_timeout=Number.isInteger(observed.function.Timeout)&&observed.function.Timeout>=1&&observed.function.Timeout<=900?Math.max(appliedConfig.manager.invocation_timeout_seconds,observed.function.Timeout):null;resolved.recovery=recoveryMetadata(resolved,purpose==='recovery-inspect'?await appliedRecord(resolved):null);}
    return resolved;
  }catch(error){
    session?.dispose();
    if(sensitive){
      if(phase==='config')throw hostError(error.code==='RECOVERY_SECRET_INVALID'?'RECOVERY_SECRET_INVALID':'CONFIG_INVALID');
      if(phase==='operator')throw hostError(error.code==='IDENTITY_MISMATCH'?'OPERATOR_UNAUTHORIZED':'OPERATOR_SESSION_UNAVAILABLE');
      throw hostError('INSTALLATION_UNAVAILABLE');
    }
    throw error.stateResult?error:failure(['BINDING_MISMATCH','FRESH_INSTALLATION_REQUIRED','SETUP'].includes(error.code)?error.code:'UNAVAILABLE');
  }
}
export function createSecretResolver(config,{sdk=loadHostSDK(),client}={}){
  const owned=!client;client??=new sdk.SecretsManagerClient({region:config.manager.aws.region,maxAttempts:1});
  return {resolveSecret:async(reference,signal)=>{if(reference!==config.jira.connection.secret_reference)throw hostError('SECRET_REFERENCE');const response=await client.send(new sdk.GetSecretValueCommand({SecretId:reference}),{abortSignal:signal});if(typeof response.SecretString!=='string')throw hostError('SECRET_UNAVAILABLE');return response.SecretString;},dispose:()=>{if(owned)client.destroy();}};
}
export function controlOnlyChange(previous,next){
  if(previous.source_revision!==next.source_revision||previous.runtime!==next.runtime||previous.sender!==next.sender||!same(previous.dependency_hashes,next.dependency_hashes)||previous.installation_generation!==next.installation_generation)return false;
  const strip=m=>Object.fromEntries(Object.entries(m.payload_hashes??{}).filter(([p])=>!['config/manager.json','package-manifest.json'].includes(p)));return same(strip(previous),strip(next));
}
async function controlUpdate(resolved,record,changes){
  const {binding,session}=resolved,updated={...record,...changes,revision:nextRevision(record.revision),updated_at:new Date().toISOString()};if(validateRecord(updated,binding))throw hostError('MALFORMED_RECORD');
  const names={},values={},conditions=[];for(const field of ['revision','installation_id','domain_id','table_arn','stack_id','installation_generation','configuration_digest','package_revision','schedule_enabled','writes_enabled','maintenance']){names['#old_'+field]=field;values[':old_'+field]=record[field];conditions.push('#old_'+field+' = :old_'+field);}
  const sets=Object.entries({...changes,revision:updated.revision,updated_at:updated.updated_at}).map(([field,value],i)=>{names['#v'+i]=field;values[':v'+i]=value;return '#v'+i+' = :v'+i;});
  await awsSend(session.operator.state,session.sdk,'TransactWriteCommand',{TransactItems:[{Update:{TableName:binding.table_name,Key:{PK:'installation#'+binding.installation_id,SK:'I#'+binding.installation_id},ConditionExpression:conditions.join(' AND '),UpdateExpression:'SET '+sets.join(', '),ExpressionAttributeNames:names,ExpressionAttributeValues:values}}]});return updated;
}
async function appliedRecord(resolved){const state=createDynamoState({binding:resolved.binding,control:resolved.control,client:resolved.client});try{const result=await state.inspect({kind:'installation',record_id:resolved.binding.installation_id});if(result.status!=='confirmed')throw hostError(result.code);return result.data.records[0];}finally{state.close();}}
async function quiesce(resolved,{wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
  const {session:s,observed:o}=resolved;const schedule={...o.schedule,State:'DISABLED'};const allowed=['Name','GroupName','ScheduleExpression','ScheduleExpressionTimezone','StartDate','EndDate','FlexibleTimeWindow','Target','State','Description','KmsKeyArn','ActionAfterCompletion'];const input=Object.fromEntries(allowed.filter(k=>schedule[k]!==undefined).map(k=>[k,schedule[k]]));input.Name=o.names.schedule_name;
  await awsSend(s.operator.scheduler,s.sdk,'UpdateScheduleCommand',input);await awsSend(s.operator.lambda,s.sdk,'PutFunctionConcurrencyCommand',{FunctionName:o.names.function_name,ReservedConcurrentExecutions:0});
  const actual=await awsSend(s.operator.scheduler,s.sdk,'GetScheduleCommand',{Name:o.names.schedule_name}),concurrency=await awsSend(s.operator.lambda,s.sdk,'GetFunctionConcurrencyCommand',{FunctionName:o.names.function_name});if(actual.State!=='DISABLED'||concurrency.ReservedConcurrentExecutions!==0)throw hostError('STOP_UNCONFIRMED');const timeout=resolved.quiescence_timeout===undefined?o.function.Timeout:resolved.quiescence_timeout;if(!Number.isInteger(timeout)||timeout<1||timeout>900)throw hostError('QUIESCENCE_UNCONFIRMED');await wait((timeout+10)*1000);return input;
}
export async function stopInstallation(input,dependencies={}){
  try { const receipt = readJSON(input.installationPath); if(lifecycle(receipt.manifest)) return runLifecycle('stop',input,dependencies); } catch {}
  let resolved,applied,phase='resolve';try{resolved=await resolveInstallation({...input,purpose:'safe-stop'},dependencies);phase='state_fence';const before=await appliedRecord(resolved);applied=await controlUpdate(resolved,before,{schedule_enabled:false,writes_enabled:false,maintenance:true});phase='host_stop';await quiesce(resolved,dependencies);return {status:'stopped',phase,recovery:{...recoveryMetadata(resolved,applied),observed_scope:'before_stop'},applied,desired:resolved.projection.control,intent_mismatch:resolved.control.schedule_enabled||resolved.control.writes_enabled,pending_work:'retained; inspect existing attempts'};}catch(error){return {status:resolved?'partial':'unavailable',phase,applied,...(resolved?{recovery_metadata:{...recoveryMetadata(resolved,applied),observed_scope:'before_stop'}}:{}),code:error.code??error.stateResult?.code??'CONTROL_UNCERTAIN',recovery:'Inspect this same installation; do not replay an uncertain mutation.'};}finally{resolved?.dispose();}
}
export async function configureInstallation(input,dependencies={}){
  try { const receipt = readJSON(input.installationPath); if(lifecycle(receipt.manifest)) return runLifecycle('configure',input,dependencies); } catch {}
  let resolved,deployerSession,originalReceipt,desiredProjection,lastApplied,lastObserved,phase='resolve';try{
    const desiredText=readFileSync(input.configPath,'utf8'),desiredManifest=JSON.parse(readFileSync(input.manifestPath,'utf8')),desired=validateManifest(desiredManifest,desiredText),receipt=JSON.parse(readFileSync(input.installationPath,'utf8'));
    validatedReceipt(receipt);originalReceipt=receipt;desiredProjection=desired;
    if(!controlOnlyChange(receipt.manifest,desiredManifest))throw hostError('UNSUPPORTED_CHANGE');
    const oldConfig=receipt.manifest.canonical_config;if(!oldConfig)throw hostError('PACKAGE_MISMATCH');
    const old=structuredClone(oldConfig),next=hostConfig(desiredText).config;const strip=c=>{const v=structuredClone(c);for(const k of ['controls','activation','transition_edges','schedule_minutes','invocation_timeout_seconds','log_retention_days','health','rework_enabled'])delete v.manager[k];return v;};if(!same(strip(old),strip(next)))throw hostError('UNSUPPORTED_CHANGE');
    // Resolve the currently applied package, then separately verify both identities before fencing.
    const previousText=JSON.stringify(oldConfig);const previousProjection=validateManifest(receipt.manifest,previousText);
    const asset=JSON.parse(readFileSync(input.assetPath,'utf8'));if(asset.zip_digest!==desiredManifest.zip_digest||['bucket','key','version'].some(field=>typeof asset[field]!=='string'||asset[field].length===0))throw hostError('ASSET_MISMATCH');
    deployerSession=await openHostSession(next,{operatorProfile:input.operatorProfile,deployerProfile:input.deployerProfile,configure:true,...dependencies});
    const observed=await observeInstallation({config:oldConfig,manifest:receipt.manifest,stackId:receipt.binding.stack_id,session:deployerSession});
    if(!same(observed.binding,receipt.binding)||oldConfig.manager.controls.schedule_enabled===false&&observed.schedule.State==='ENABLED')throw hostError('BINDING_MISMATCH');resolved={binding:observed.binding,control:previousProjection.control,client:deployerSession.operator.state,session:deployerSession,observed};
    phase='state_fence';const original=await appliedRecord(resolved);
    const rotate=rotateHealthEpoch(original,desired.control);
    // Check the existing record/key/byte ceiling before the first mutation, without creating the epoch early.
    if(rotate&&validateRecord({...original,...desired.control,package_revision:desiredManifest.source_revision,revision:nextRevision(original.revision),extensions:{...original.extensions,health_generation:'00000000-0000-0000-0000-000000000000',health_enabled_at:'2000-01-01T00:00:00.000Z'}},resolved.binding))throw hostError('MALFORMED_RECORD');
    let record=await controlUpdate(resolved,original,{schedule_enabled:false,writes_enabled:false,maintenance:true});lastApplied=record;phase='host_stop';const schedule=await quiesce(resolved,dependencies);
    const {synthesizeTemplate}=await import('./template.mjs');const template=synthesizeTemplate(desiredText,desiredManifest,{initial:false}),name='pigboard-controls-'+Date.now();phase='change_set';
    const cf=deployerSession.deployer.cloudformation,sdk=deployerSession.sdk;const created=await awsSend(cf,sdk,'CreateChangeSetCommand',{StackName:receipt.binding.stack_id,ChangeSetName:name,ChangeSetType:'UPDATE',TemplateBody:JSON.stringify(template),Parameters:[['AssetBucket',asset.bucket],['AssetKey',asset.key],['AssetVersion',asset.version],['QuiescenceConcurrency','0']].map(([ParameterKey,ParameterValue])=>({ParameterKey,ParameterValue})),Capabilities:['CAPABILITY_NAMED_IAM']});
    const changeId=created.Id;if(!changeId)throw hostError('CHANGE_UNCERTAIN');
    let change;for(let i=0;i<30;i++){change=await awsSend(cf,sdk,'DescribeChangeSetCommand',{StackName:receipt.binding.stack_id,ChangeSetName:changeId});if(change.Status!=='CREATE_PENDING'&&change.Status!=='CREATE_IN_PROGRESS')break;await (dependencies.wait??(ms=>new Promise(r=>setTimeout(r,ms))))(1000);}
    const allowed={Function:new Set(['Code','Environment','Timeout','ReservedConcurrentExecutions']),Schedule:new Set(['State','ScheduleExpression','Target']),LogGroup:new Set(['RetentionInDays'])};
    if(change.Status!=='CREATE_COMPLETE'||change.NextToken||!Array.isArray(change.Changes)||change.Changes.some(c=>{const r=c.ResourceChange;return !r||r.Action!=='Modify'||r.Replacement!=='False'||!allowed[r.LogicalResourceId]||!r.Details?.length||r.Details.some(d=>d.Target?.Attribute!=='Properties'||!allowed[r.LogicalResourceId].has(d.Target.Name));}))throw hostError('UNSUPPORTED_CHANGE');
    phase='apply';const operationToken=randomUUID();await awsSend(cf,sdk,'ExecuteChangeSetCommand',{StackName:receipt.binding.stack_id,ChangeSetName:changeId,ClientRequestToken:operationToken});
    let completed=false;
    for(let i=0;i<120;i++){
      const stack=(await awsSend(cf,sdk,'DescribeStacksCommand',{StackName:receipt.binding.stack_id})).Stacks?.[0];
      const events=await awsSend(deployerSession.operator.cloudformation,sdk,'DescribeStackEventsCommand',{StackName:receipt.binding.stack_id});
      // AWS returns newest events first. Only this operation's exact stack event is proof.
      const operation=events.StackEvents?.find(e=>e.ClientRequestToken===operationToken&&e.StackId===receipt.binding.stack_id&&e.PhysicalResourceId===receipt.binding.stack_id&&e.ResourceType==='AWS::CloudFormation::Stack');
      if(operation?.ResourceStatus==='UPDATE_COMPLETE'&&stack?.StackId===receipt.binding.stack_id&&stack.StackStatus==='UPDATE_COMPLETE'){completed=true;break;}
      if(operation&&(operation.ResourceStatus?.includes('FAILED')||operation.ResourceStatus?.includes('ROLLBACK')))throw hostError('DEPLOYMENT_UNCERTAIN');
      await (dependencies.wait??(ms=>new Promise(r=>setTimeout(r,ms))))(1000);
    }
    if(!completed)throw hostError('DEPLOYMENT_UNCERTAIN');
    phase='observe';const after=await observeInstallation({config:next,manifest:desiredManifest,stackId:receipt.binding.stack_id,session:deployerSession});lastObserved=after;if(after.concurrency!==0||after.schedule.State!=='DISABLED'||after.binding.table_arn!==receipt.original.table_arn)throw hostError('BINDING_MISMATCH');
    phase='restore_preview';await awsSend(deployerSession.operator.lambda,sdk,'PutFunctionConcurrencyCommand',{FunctionName:after.names.function_name,ReservedConcurrentExecutions:1});await awsSend(deployerSession.operator.scheduler,sdk,'UpdateScheduleCommand',{...schedule,Target:{...schedule.Target,Input:JSON.stringify({operation:desired.mode})},ScheduleExpression:`rate(${next.manager.schedule_minutes} minutes)`,State:desired.control.schedule_enabled?'ENABLED':'DISABLED'});
    const concurrency=await awsSend(deployerSession.operator.lambda,sdk,'GetFunctionConcurrencyCommand',{FunctionName:after.names.function_name}),scheduled=await awsSend(deployerSession.operator.scheduler,sdk,'GetScheduleCommand',{Name:after.names.schedule_name});if(concurrency.ReservedConcurrentExecutions!==1||scheduled.State!==(desired.control.schedule_enabled?'ENABLED':'DISABLED'))throw hostError('HOST_UNCONFIRMED');
    lastObserved={...after,concurrency:concurrency.ReservedConcurrentExecutions,schedule:scheduled};
    phase='commit_controls';const extensions=rotate?{...original.extensions,health_generation:randomUUID(),health_enabled_at:new Date().toISOString()}:original.extensions;record=await controlUpdate(resolved,record,{...desired.control,package_revision:desiredManifest.source_revision,extensions});return {status:'configured',phase,applied:record,desired:desired.control,receipt:{...receipt,binding:after.binding,manifest:desiredManifest,observed_at:new Date().toISOString()}};
  }catch(error){return {status:resolved?'partial':'unavailable',phase,code:error.code??'CONTROL_UNCERTAIN',...(resolved?{recovery_receipt:originalReceipt,recovery_receipt_role:'original recovery authority; not a successful new package receipt',desired:desiredProjection.control,applied:lastApplied??null,applied_confirmation:'last confirmed; final commit may be uncertain',recovery_metadata:recoveryMetadata({...resolved,receipt:originalReceipt,projection:desiredProjection,observed:lastObserved??resolved.observed},lastApplied)}:{}),recovery:'Preserve this result and original receipt. Inspect with --recovery and stop the same installation; do not repeat configure or reconstruct a receipt.'};}finally{deployerSession?.dispose();}
}

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const isoNow = () => new Date().toISOString();
const readJSON = path => JSON.parse(readFileSync(path,'utf8'));
const isDisabled = controls => Object.entries(disabled).every(([name,value])=>controls?.[name]===value);
const scopeOf = ({binding, origin}) => Object.fromEntries(
  ['installation_id','domain_id','site','stack_id','table_arn','table_id','installation_generation'].map(key=>[key,origin[key]??binding[key]]));
const matchesBirthTable = (table, receipt) =>
  table?.TableId === receipt.origin.table_id && table.TableArn === receipt.binding.table_arn &&
  instant(table.CreationDateTime) === instant(receipt.origin.table_created_at) && table.TableStatus === 'ACTIVE' &&
  same(table.KeySchema,[{AttributeName:'PK',KeyType:'HASH'},{AttributeName:'SK',KeyType:'RANGE'}]) &&
  same(table.AttributeDefinitions,[{AttributeName:'PK',AttributeType:'S'},{AttributeName:'SK',AttributeType:'S'}]);
const receiptMatchesState = (r, state) =>
  state.package_revision === r.binding.package_revision && state.configuration_digest === r.binding.configuration_digest;
const checked = outcome => {
  if(outcome?.status!=='confirmed')throw hostError(outcome?.code??'STATE_UNCONFIRMED');
  return outcome.data;
};
const lifecycleAdapter = (receipt,session) => dynamo.createDynamoLifecycleState({
  binding:receipt.binding, control:validateManifest(receipt.manifest,JSON.stringify(receipt.manifest.canonical_config)).control,
  client:session.operator.state, identity:session.operator.identity, originEvidence:receipt.origin
});

async function resolveLifecycle(input, dependencies, {dispatch=false, originalPath=input.installationPath, command}={}){
  const receipt = readJSON(originalPath);
  const {config} = validatedReceipt(receipt);
  const suppliedConfig = hostConfig(readFileSync(input.configPath,'utf8')), supplied=suppliedConfig.config;
  const allowRecovery=command==='stop'||(command==='inspect-operation'&&input.operation===receipt.recovery_only?.operation);
  if(!lifecycle(receipt.manifest) || (receipt.recovery_only&&!allowRecovery) || !valid(receipt.origin,originEvidenceSchema) ||
    receipt.birth_operator_role !== config.manager.aws.operator_role_arn || !physicalTableId(receipt.origin.table_id) ||
    !same(supplied.manager.aws,config.manager.aws) || supplied.manager.installation_id!==receipt.binding.installation_id ||
    supplied.manager.domain_id!==receipt.binding.domain_id || supplied.jira.site!==receipt.binding.site)throw hostError('BINDING_MISMATCH');
  const origin = receipt.origin;
  if(['installation_id','domain_id','site','stack_id','table_arn','installation_generation'].some(key=>origin[key]!==receipt.binding[key]))throw hostError('BINDING_MISMATCH');
  const session = await openHostSession(config,{...dependencies,operatorProfile:input.operatorProfile,deployerProfile:input.deployerProfile,
    requireVerifiedOperatorIdentity:true,configure:dispatch});
  try {
    const table = (await awsSend(session.operator.state,session.sdk,'DescribeTableCommand',{TableName:receipt.binding.table_name})).Table;
    if(!matchesBirthTable(table,receipt))throw hostError('PHYSICAL_STATE_MISMATCH');
    const state = lifecycleAdapter(receipt,session);
    const initial = checked(await state.read());
    const role = initial.lifecycle.actor?.arn ?? initial.lifecycle.actor?.Arn;
    if(!roleMatches(role,receipt.birth_operator_role,config.manager.aws.account_id))throw hostError('ORIGIN_UNVERIFIED');
    const context={receipt,config,session,state,initial,table,suppliedDigest:suppliedConfig.digest,
      now:dependencies.now??isoNow,mono:dependencies.monotonic??(()=>performance.now()),wait:dependencies.wait??pause};
    if(receipt.recovery_only){
      const reference=receipt.recovery_only;
      const stored=checked(await state.readOperation(reference.operation));
      if(!currentSupersededUpdate(stored,initial)||stored.owner.kind!==reference.kind||stored.fence_id!==reference.fence||
          !same(stored.owner.details.target,boundManifest(receipt.manifest))||!same(stored.owner.details.source,reference.original)||
          stored.terminal?.observed_at!==receipt.observed_at)throw hostError('RECOVERY_RECEIPT_UNVERIFIED');
      const observed=await verifiedTarget(context,receipt.manifest,stored.owner.details.asset);
      if(!same(observedMetadata(observed),stored.terminal.observed))throw hostError('RECOVERY_RECEIPT_UNVERIFIED');
      context.recoveryOperation=stored;
    }
    return context;
  } catch (error) {session.dispose();throw error;}
}

async function readHost(context, manifest=context.receipt.manifest, {birth=false,settlement=false}={}){
  const {receipt,session} = context;
  const actual = await observeResources({manifest,session,config:manifest.canonical_config,stackId:receipt.binding.stack_id},
    {originalTableId:receipt.origin.table_id,allowMissingPin:birth,settlement});
  if(!matchesBirthTable(actual.table,receipt))throw hostError('PHYSICAL_STATE_MISMATCH');
  return actual;
}
async function mutate(context, {now=context.now(), ...action}) {
  return checked(await context.state.mutate({...action,now}));
}
async function refresh(context) {return checked(await context.state.read());}
const noWorkCanceled = 'Retained records are unchanged. Previously issued Jira requests and Cursor work may continue.';
const operationScope = context => ({stack_id:context.receipt.binding.stack_id,table_id:context.receipt.origin.table_id,
  installation_generation:context.receipt.binding.installation_generation});

async function reserve(context, expected, kind, effects, details, {emergency=false,id=randomUUID(),stop_id,superseded_id}={}){
  const data = await mutate(context,{type:emergency?'emergency':'reserve',expected,id,kind,effects,details,
    ...(stop_id?{stop_id}:{}),...(superseded_id?{superseded_id}:{})});
  return {data,id};
}
async function dispatchEffect(context,id,effect,dispatch){
  const expected=await refresh(context);
  const {lifecycle:control}=expected;
  if(control.owner?.id!==id||control.owner.fence_id!==control.fence_id)throw hostError('OPERATION_SUPERSEDED');
  await mutate(context,{type:'claim',id,effect,expected});
  // This call is never retried. An uncertain response leaves a claimed effect
  // which cannot be inferred to have settled from an unrelated observation.
  const response = await dispatch();
  await settleEffect(context,id,effect);
  return response;
}
async function settleEffect(context,id,effect){
  return mutate(context,{type:'settle',id,effect,expected:await refresh(context)});
}
function scheduleInput(observed,state){
  const keys=['Name','GroupName','ScheduleExpression','ScheduleExpressionTimezone','StartDate','EndDate','FlexibleTimeWindow','Target','Description','KmsKeyArn','ActionAfterCompletion'];
  return {...Object.fromEntries(keys.filter(key=>observed.schedule[key]!==undefined).map(key=>[key,observed.schedule[key]])),
    Name:observed.names.schedule_name,State:state};
}
async function disableHost(context,id,observed,{all=false}={}){
  const {sdk,operator}=context.session;
  if(observed.schedule.State!=='DISABLED')await dispatchEffect(context,id,'disable-schedule',()=>
    awsSend(operator.scheduler,sdk,'UpdateScheduleCommand',scheduleInput(observed,'DISABLED')));
  else if(all)await mutate(context,{type:'skip',id,effect:'disable-schedule',expected:await refresh(context)});
  if(observed.concurrency!==0)await dispatchEffect(context,id,'disable-concurrency',()=>
    awsSend(operator.lambda,sdk,'PutFunctionConcurrencyCommand',{FunctionName:observed.names.function_name,ReservedConcurrentExecutions:0}));
  else if(all)await mutate(context,{type:'skip',id,effect:'disable-concurrency',expected:await refresh(context)});
}
const protectiveEffects = observed => [
  ...(observed.schedule.State!=='DISABLED'?['disable-schedule']:[]),
  ...(observed.concurrency!==0?['disable-concurrency']:[])
];
function requireStopped(observed) {
  if(observed.schedule.State!=='DISABLED'||observed.concurrency!==0)throw hostError('STOP_UNCONFIRMED');
  return observed;
}
async function drain(context,manifest,id,{bootstrap=false}={}){
  const initial=requireStopped(await readHost(context, manifest, {birth:bootstrap,settlement:true}));
  const projection = observed => projectBoundRuntime({binding:observed.binding,config:manifest.canonical_config,observed,scope:scopeOf(context.receipt)});
  const before=projection(initial);
  if(!before)throw hostError('BOUNDS_UNSUPPORTED');
  const started=context.now(),mono=context.mono();
  await context.wait(before.window_ms);
  const after=projection(requireStopped(await readHost(context,manifest,{birth:bootstrap,settlement:true})));
  const completed=context.now(),elapsed=Math.floor(context.mono()-mono),current=await refresh(context);
  if(!same(before,after)||elapsed<before.window_ms||Date.parse(completed)-Date.parse(started)<before.window_ms)throw hostError('DRAIN_INCOMPLETE');
  if(current.lifecycle.owner?.id!==id||current.lifecycle.owner.fence_id!==current.lifecycle.fence_id)throw hostError('OPERATION_SUPERSEDED');
  return {started,completed,elapsed,projection:before,current};
}
async function fenceStop(context,expected){
  const id=randomUUID();
  let data;
  try { ({data}=await reserve(context,expected,'stop',['disable-schedule','disable-concurrency'],
    {source_manifest:manifestDigest(context.receipt.manifest)},
    {emergency:true,id,superseded_id:context.receipt.recovery_only?.operation})); }
  catch(error) {
    if(error.code!=='UNCERTAIN_WRITE')throw error;
    context.operation=id;
    const actual=await refresh(context).catch(()=>{throw error;});
    if(actual.lifecycle.fence_id!==id||!isDisabled(actual.installation))throw error;
    data=actual;
  }
  context.operation=id;
  context.fenced=true;
  return {id,data};
}
async function lifecycleStop(context,input){
  const supplied = hostConfig(readFileSync(input.configPath,'utf8'));
  const intent=validateManifest(context.receipt.manifest,JSON.stringify(context.receipt.manifest.canonical_config)).control;
  const sourceDigest=supplied.digest;
  // Reserve every possible direct effect before observation because access may be partial.
  const {id,data}=await fenceStop(context,context.initial);
  if(data.lifecycle.owner?.id!==id)return {status:'partial',phase:'state_fenced',state_fenced:true,
    code:'HOST_OWNER_ACTIVE',operation:data.lifecycle.owner?.id,host:'unconfirmed',...operationScope(context),pending_work:noWorkCanceled};
  context.phase='host_stop';
  const observed=context.recoveryOperation ?
    await verifiedTarget(context,context.receipt.manifest,context.recoveryOperation.owner.details.asset) :
    await readHost(context,context.receipt.manifest,{birth:!data.lifecycle.bootstrapped});
  if(context.recoveryOperation&&!same(observedMetadata(observed),context.recoveryOperation.terminal.observed))
    throw hostError('RECOVERY_RECEIPT_UNVERIFIED');
  await disableHost(context,id,observed,{all:true});
  requireStopped(await readHost(context,context.receipt.manifest,{birth:!data.lifecycle.bootstrapped}));
  const current=await refresh(context);
  if(context.receipt.recovery_only||!isDisabled(intent)||sourceDigest!==intent.configuration_digest||!receiptMatchesState(context.receipt,current.installation)||!current.lifecycle.bootstrapped){
    await finishLifecycle(context,id,current,{terminal:{status:'protective_stop',observed_at:context.now()},outcome:'completed'});
    return {status:'stopped',phase:'protective_stop',proof:false,state_fenced:true,operation:id,...operationScope(context),
      pending_work:noWorkCanceled,recovery:'Use an explicitly authorized disabled maintenance configuration and run stop again to measure a current drain.'};
  }
  context.phase='measured_drain';
  const proof=await drain(context,context.receipt.manifest,id);
  const actor=operatorActorId({account_id:context.session.operator.identity.Account,user_id:context.session.operator.identity.UserId});
  if(Object.keys(proof.current.installation.extensions).filter(key=>!STOP_KEYS.includes(key)).length+STOP_KEYS.length>16)throw hostError('STOP_PROOF_CAPACITY');
  const stop={pb_stop_version:1,pb_stop_id:id,pb_stop_actor:actor,pb_stop_config_digest:sourceDigest,
    pb_stop_package_revision:context.receipt.binding.package_revision,pb_stop_resource_digest:proof.projection.resource_digest,
    pb_stop_bounds_digest:proof.projection.bounds_digest,pb_stop_fence_revision:proof.current.lifecycle.owner.installation_revision,
    pb_stop_started_at:proof.started,pb_stop_window_ms:proof.projection.window_ms,pb_stop_completed_at:proof.completed,pb_stop_elapsed_ms:proof.elapsed};
  await finishLifecycle(context,id,proof.current,{terminal:{status:'drained',observed_at:proof.completed},outcome:'completed',stop});
  return {status:'stopped',phase:'drained',proof:true,operation:id,stop,...operationScope(context),pending_work:noWorkCanceled};
}
async function finishLifecycle(context,id,expected,details){
  return mutate(context,{type:'finish',id,expected,...details});
}

const boundManifest = manifest => ({manifest_digest:manifestDigest(manifest),package_revision:manifest.source_revision,
  configuration_digest:manifest.configuration_digest,zip_digest:manifest.zip_digest});
const assetParameters = fields => Object.entries(fields).map(([ParameterKey,ParameterValue])=>({ParameterKey,ParameterValue}));
const parameters = stack => Object.fromEntries((stack.Parameters??[]).map(({ParameterKey,ParameterValue})=>[ParameterKey,ParameterValue]));
const versionedAsset = stack => {
  const p=parameters(stack);
  if(['AssetBucket','AssetKey','AssetVersion'].some(k=>typeof p[k]!=='string'||!p[k]))throw hostError('ASSET_MISMATCH');
  return {bucket:p.AssetBucket,key:p.AssetKey,version:p.AssetVersion};
};
function readAsset(path,manifest){
  let asset;
  try { asset=readJSON(path); }
  catch(error) {
    if(error instanceof SyntaxError)throw hostError('ASSET_MISMATCH');
    throw error;
  }
  if(!asset||asset.zip_digest!==manifest.zip_digest||Object.keys(asset).length!==4||
    ['bucket','key','version'].some(k=>typeof asset[k]!=='string'||!asset[k].trim()||asset[k].length>2048||/[\x00-\x1f\x7f]/.test(asset[k])))throw hostError('ASSET_MISMATCH');
  return {bucket:asset.bucket,key:asset.key,version:asset.version};
}
function samePinControls(source,target,{strict=false}={}){
  if(!controlOnlyChange(source,target)||!same(source.resource_map,target.resource_map)||!same(source.compatibility,target.compatibility))
    throw hostError('UNSUPPORTED_CHANGE');
  const strip=config=>{
    const next=structuredClone(config);
    const fields=strict?['controls']:['controls','activation','transition_edges','schedule_minutes','invocation_timeout_seconds','log_retention_days','health','rework_enabled'];
    for(const key of fields)delete next.manager[key];
    return next;
  };
  if(!same(strip(source.canonical_config),strip(target.canonical_config)))throw hostError('UNSUPPORTED_CHANGE');
}
const updateKind = kind => ['bootstrap','upgrade','configure','maintenance-only'].includes(kind);
const changeName = id => 'pigboard-lifecycle-'+id;
function receiptFor(original,target,observedAt,{recovery}={}){
  return {...original,binding:{...original.binding,configuration_digest:target.configuration_digest,package_revision:target.source_revision},
    manifest:target,observed_at:observedAt,...(recovery?{recovery_only:recovery}:{})};
}
async function dispatchCloudFormation(context,id,effect,command,input){
  const expected=await refresh(context),owner=expected.lifecycle.owner;
  if(owner?.id!==id||owner.fence_id!==expected.lifecycle.fence_id)throw hostError('OPERATION_SUPERSEDED');
  const change_set_id=effect==='execute-change-set'?input.ChangeSetName:undefined;
  await mutate(context,{type:'claim',id,effect,expected,...(change_set_id?{change_set_id}:{})});
  await awsSend(context.session.deployer.cloudformation,context.session.sdk,command,input);
  // A successful dispatch acknowledgement is not terminal stack evidence.
}
async function providerTerminal(context,id,verb,{poll=false}={}){
  const {session,receipt}=context,stackId=receipt.binding.stack_id;
  for(let attempt=0;attempt<(poll?120:1);attempt++){
    let next,seen=new Set();
    for(let page=0;page<8;page++){
      const result=await awsSend(session.operator.cloudformation,session.sdk,'DescribeStackEventsCommand',
        {StackName:stackId,...(next?{NextToken:next}:{})});
      const matched=result.StackEvents?.find(event=>event.ClientRequestToken===id&&event.StackId===stackId&&
        event.PhysicalResourceId===stackId&&event.ResourceType==='AWS::CloudFormation::Stack');
      if(matched){
        if((matched.ResourceStatus===verb+'_COMPLETE' || (verb==='DELETE'&&matched.ResourceStatus==='DELETE_FAILED'))&&eventId(matched.EventId)&&Number.isFinite(instant(matched.Timestamp)))
          return {event_id:matched.EventId,status:matched.ResourceStatus,recorded_at:originalTime(instant(matched.Timestamp))};
        if(matched.ResourceStatus?.includes('FAILED')||matched.ResourceStatus?.includes('ROLLBACK'))throw hostError('DEPLOYMENT_UNCERTAIN');
        break;
      }
      next=result.NextToken;
      if(!next||seen.has(next))break;
      seen.add(next);
    }
    if(poll)await context.wait(1000);
  }
  throw hostError('PROVIDER_TERMINAL_UNCONFIRMED');
}
function validateChangeSet(change,context,kind){
  const logical = deployment.installationResourceMap(context.config.manager.installation_id,context.receipt.manifest).logical;
  const allowed = kind==='bootstrap' ? {[logical.function_name]:['Environment','ReservedConcurrentExecutions']} :
    {[logical.function_name]:['Code','Environment','Timeout','ReservedConcurrentExecutions'],
      [logical.schedule_name]:['State','ScheduleExpression','Target'],[logical.log_group]:['RetentionInDays']};
  if(change.StackId!==context.receipt.binding.stack_id||change.ExecutionStatus!=='AVAILABLE'||change.Status!=='CREATE_COMPLETE'||
    change.NextToken||!Array.isArray(change.Changes)||!change.Changes.length||change.Changes.some(({ResourceChange:r})=>
      !r||r.Action!=='Modify'||r.Replacement!=='False'||!allowed[r.LogicalResourceId]||!r.Details?.length||
      r.Details.some(({Target:t})=>t?.Attribute!=='Properties'||!allowed[r.LogicalResourceId].includes(t.Name))))
    throw hostError('UNSUPPORTED_CHANGE_SET');
}
async function applyChange(context,id,kind,target,asset){
  const {receipt,session}=context, {sdk}=session, cf=session.deployer.cloudformation;
  const stackId=receipt.binding.stack_id,name=changeName(id);
  const controls={[deployment.LIFECYCLE_TABLE_ID_PARAMETER]:receipt.origin.table_id,QuiescenceConcurrency:'0'};
  const bootstrap=kind==='bootstrap';
  const pinnedParams=bootstrap ? ['AssetBucket','AssetKey','AssetVersion'].map(ParameterKey=>({ParameterKey,UsePreviousValue:true})) :
    assetParameters({AssetBucket:asset.bucket,AssetKey:asset.key,AssetVersion:asset.version});
  const body=bootstrap ? {UsePreviousTemplate:true} : {TemplateBody:JSON.stringify(deployment.synthesizeTemplate(
    JSON.stringify(target.canonical_config),target,{initial:false}))};
  const created=await dispatchEffect(context,id,'create-change-set',()=>awsSend(cf,sdk,'CreateChangeSetCommand',{
    StackName:stackId,ChangeSetName:name,ChangeSetType:'UPDATE',ClientToken:id,...body,
    Parameters:[...pinnedParams,...assetParameters(controls)],Capabilities:['CAPABILITY_NAMED_IAM']
  }));
  if(!dynamo.validLifecycleChangeSetId(created?.Id,stackId,id)||created.StackId!==stackId)throw hostError('CHANGE_UNCERTAIN');
  let change;
  for(let i=0;i<30;i++){
    change=await awsSend(cf,sdk,'DescribeChangeSetCommand',{StackName:stackId,ChangeSetName:created.Id});
    if(!['CREATE_PENDING','CREATE_IN_PROGRESS'].includes(change.Status))break;
    await context.wait(1000);
  }
  if(change?.ChangeSetId!==created.Id||change.ChangeSetName!==name)throw hostError('CHANGE_UNCERTAIN');
  validateChangeSet(change,context,kind);
  await mutate(context,{type:'record-change-set',id,expected:await refresh(context),change_set_id:created.Id});
  await dispatchCloudFormation(context,id,'execute-change-set','ExecuteChangeSetCommand',{
    StackName:stackId,ChangeSetName:created.Id,ClientRequestToken:id});
  const terminal=await providerTerminal(context,id,'UPDATE',{poll:true});
  await settleEffect(context,id,'execute-change-set');
  return terminal;
}
async function verifiedTarget(context,target,asset){
  const observed=await readHost(context,target);
  if(!same(versionedAsset(observed.stack),asset)||observed.stack.StackStatus!=='UPDATE_COMPLETE')throw hostError('ASSET_MISMATCH');
  return observed;
}
function observedMetadata(observed){
  const env=observed.function.Environment.Variables;
  return {package_revision:env.PB_PACKAGE_REVISION,configuration_digest:env.PB_CONFIGURATION_DIGEST,
    writes_intended:env.PB_WRITES_ENABLED==='true',code_hash:observed.code_hash,schedule:observed.schedule.State,concurrency:observed.concurrency};
}
const updateDetails = (context, source, target, asset, more={}) => ({
  ...operationScope(context),source:boundManifest(source),target:boundManifest(target),asset,
  deployer:context.session.deployer.identity,...more
});
const safeControls = manifest=>({...disabled,configuration_digest:manifest.configuration_digest,package_revision:manifest.source_revision});
async function bootstrapLifecycle(context,input){
  const {receipt,initial}=context;
  if(!receiptMatchesState(receipt,initial.installation)||initial.installation.schedule_enabled||initial.installation.writes_enabled||
    hostConfig(readFileSync(input.configPath,'utf8')).digest!==receipt.binding.configuration_digest)throw hostError('BOOTSTRAP_PRECONDITION');
  if(initial.lifecycle.bootstrapped){
    const record=checked(await context.state.readOperation(initial.lifecycle.last_operation_id));
    if(record?.owner.kind!=='bootstrap'||record.outcome!=='completed')throw hostError('BOOTSTRAP_ALREADY_COMPLETED');
    const actual=requireStopped(await readHost(context));
    if(!same(versionedAsset(actual.stack),record.owner.details.asset))throw hostError('ASSET_MISMATCH');
    return {status:'bootstrapped',operation:record.owner.id,receipt:receiptFor(receipt,receipt.manifest,record.recorded_at),...operationScope(context)};
  }
  const observed=await readHost(context,receipt.manifest,{birth:true});
  if(observed.concurrency!==1||observed.schedule.State!=='DISABLED'||observed.function.Environment.Variables[deployment.LIFECYCLE_TABLE_ID_ENV])
    throw hostError('BOOTSTRAP_PRECONDITION');
  const asset=versionedAsset(observed.stack),details=updateDetails(context,receipt.manifest,receipt.manifest,asset);
  const {id,data}=await reserve(context,initial,'bootstrap',['create-change-set','execute-change-set'],details);
  rememberOperation(context,id,data);
  const bound=await readHost(context,receipt.manifest,{birth:true});
  if(bound.schedule.State!=='DISABLED'||bound.concurrency!==1||!same(versionedAsset(bound.stack),asset))throw hostError('BOOTSTRAP_PRECONDITION');
  const terminal=await applyChange(context,id,'bootstrap',receipt.manifest,asset);
  const actual=requireStopped(await verifiedTarget(context,receipt.manifest,asset));
  return commitUpdate(context,id,'bootstrap',receipt.manifest,actual,terminal,{
    ...validateManifest(receipt.manifest,JSON.stringify(context.config)).control,package_revision:receipt.manifest.source_revision});
}
function rememberOperation(context,id,data){
  context.operation=id;
  context.fenced=true;
  context.phase='host_owned';
  context.publishOperation?.({operation:id,phase:context.phase,fence:data.lifecycle.fence_id,...operationScope(context),original_receipt:context.receipt});
}
async function commitUpdate(context,id,kind,target,observed,provider,controls,{recovery,expected}={}){
  await context.beforeFinish?.(id);
  const complete={status:kind==='bootstrap'?'bootstrapped':kind==='upgrade'?'upgraded':'configured',
    provider,observed:observedMetadata(observed),observed_at:context.now()};
  await finishLifecycle(context,id,expected??await refresh(context),{terminal:complete,outcome:'completed',controls,...(recovery?{recovery}:{})});
  return {status:complete.status,phase:'committed',operation:id,...operationScope(context),pending_work:noWorkCanceled,
    ...(kind==='configure'&&expected?enablementSummary(expected.lifecycle.owner):{}),
    observed:complete.observed,receipt:receiptFor(context.receipt,target,complete.observed_at)};
}

function proposalJSON(path){
  try { return readJSON(path); }
  catch(error) {
    if(error instanceof SyntaxError)throw hostError('INVALID_INPUT');
    throw error;
  }
}
function proposedTarget(input){
  const manifest=proposalJSON(input.manifestPath),text=readFileSync(input.targetConfigPath??input.configPath,'utf8');
  const desired=validateManifestInputs(manifest,text);
  const asset=input.assetPath?readAsset(input.assetPath,manifest):undefined;
  if(!lifecycle(manifest))return {manifest,desired,asset,incompatible:'UNSUPPORTED_VERSION'};
  try { deployment.assertLifecycleManifest(manifest); }
  catch(error) {
    if(error.code!=='PACKAGE_MISMATCH')throw error;
    return {manifest,desired,asset,incompatible:'UNSUPPORTED_PACKAGE'};
  }
  return {manifest,desired,asset};
}
function loadedTarget(input){
  const target=proposedTarget(input);
  if(target.incompatible)throw hostError(target.incompatible);
  return target;
}
function compatibleUpgrade(source,target){
  const from=source.compatibility,to=target.compatibility;
  if(target.source_revision===source.source_revision||to?.previous_revision!==source.source_revision||
    !same(from.lineage,to.lineage)||!same(from.read,to.read)||!same(from.write,to.write)||
    target.sender!==source.sender||target.runtime!==source.runtime||!same(target.resource_map,source.resource_map)||
    target.installation_generation!==source.installation_generation||
    !same(target.canonical_config,source.canonical_config))throw hostError('UNSUPPORTED_UPGRADE');
}
const snapshotRef = inventory => ({
  revision:inventory.installation.revision,lifecycle_revision:inventory.lifecycle.revision,
  digest:sha256(canonicalize([inventory.records,inventory.decisions,inventory.publications])),
  counts:{records:inventory.records.length,decisions:inventory.decisions.length,pending:inventory.pending_attempts.length}
});
const upgradeScope = (context,manifest,asset,observed)=>({
  ...operationScope(context),
  source:boundManifest(context.receipt.manifest),target:boundManifest(manifest),asset,
  current_asset:versionedAsset(observed.stack)
});
async function evaluateUpgrade(context,input){
  const {receipt,initial}=context;
  if(context.suppliedDigest!==receipt.binding.configuration_digest||!initial.lifecycle.bootstrapped||
    initial.lifecycle.owner||!receiptMatchesState(receipt,initial.installation))throw hostError('UPGRADE_PRECONDITION');
  if(!input.assetPath)throw hostError('INVALID_INPUT');
  const target=proposedTarget(input);
  const observed=await readHost(context);
  const scope=upgradeScope(context,target.manifest,target.asset,observed);
  let reason=target.incompatible;
  if(!reason){
    try { compatibleUpgrade(receipt.manifest,target.manifest); }
    catch(error){
      if(error.code!=='UNSUPPORTED_UPGRADE')throw error;
      reason=error.code;
    }
  }
  // Read both sources of compatibility evidence even when the package declarations already fail.
  const {inventory,reason:inventoryReason}=await readUpgradeInventory(context);
  const expected=inventory?{installation:inventory.installation,lifecycle:inventory.lifecycle}:await refresh(context);
  if(!same(initial,expected))throw hostError('REVISION_CONFLICT');
  reason??=inventoryReason;
  const artifact=reason?{
    schema:'pigboard-upgrade-refusal/v1',...scope,disposition:'protect-only',reason,
    state:{revision:expected.installation.revision,lifecycle_revision:expected.lifecycle.revision,fence:expected.lifecycle.fence_id},
    ...(inventory?{inventory:snapshotRef(inventory)}:{inventory_reason:inventoryReason})
  }:{
    schema:'pigboard-upgrade-preview/v1',...scope,inventory:snapshotRef(inventory),provisional:inventory.provisional
  };
  return {target,observed,expected,inventory,artifact,reason};
}
async function upgradePreview(context,input){
  const {artifact,reason}=await evaluateUpgrade(context,input);
  const report={phase:'upgrade_preview',...operationScope(context),receipt:artifact,pending_work:noWorkCanceled};
  return reason?{status:'refused',...report,code:reason,state_fenced:false,state_mutated:false,host_mutated:false}:
    {status:'previewed',...report};
}
async function verifiedStop(context, observed, manifest, installed){
  const expected=validateManifest(manifest,JSON.stringify(manifest.canonical_config)).control;
  return checked(await readReconciliationContext({binding:observed.binding,config:manifest.canonical_config,
    desired:expected,applied:expected,observed,originEvidence:context.receipt.origin,installation:installed},
    scope=>context.state.readGeneration(scope))).stop;
}
async function enableAfterUpdate(context,id,actual,desired,manifest,asset){
  const {sdk,operator}=context.session;
  await dispatchEffect(context,id,'enable-concurrency',()=>awsSend(operator.lambda,sdk,'PutFunctionConcurrencyCommand',{
    FunctionName:actual.names.function_name,ReservedConcurrentExecutions:1}));
  if(desired.control.schedule_enabled)await dispatchEffect(context,id,'enable-schedule',()=>awsSend(operator.scheduler,sdk,'UpdateScheduleCommand',
    scheduleInput(actual,'ENABLED')));
  const expected=await refresh(context);
  const {owner,fence_id}=expected.lifecycle;
  if(owner?.id!==id||owner.fence_id!==fence_id)throw hostError('OPERATION_SUPERSEDED');
  const observed=await verifiedTarget(context,manifest,asset);
  if(observed.concurrency!==1||observed.schedule.State!==(desired.control.schedule_enabled?'ENABLED':'DISABLED'))
    throw hostError('HOST_UNCONFIRMED');
  if(!owner.details.rotate_health_epoch)return {observed,expected};
  // Observe, timestamp and persist under the same owner and fence. Recovery
  // never records the timestamp because its later host read cannot recover it.
  context.phase='record_enablement';
  const recorded=await mutate(context,{type:'record-enablement',id,expected,now:context.now()});
  const verified=await refresh(context);
  if(!same(recorded,verified))throw hostError('REVISION_CONFLICT');
  context.phase='enablement_recorded';
  return {observed,expected:verified};
}
const incompatibleInventory = new Set(['UNSUPPORTED_VERSION','UNSUPPORTED_PROOF','MALFORMED_RECORD',
  'INCOMPLETE_INVENTORY','BINDING_MISMATCH','OPERATOR_PROVENANCE_UNAVAILABLE']);
async function updateInventory(context){
  const result=await context.state.inventory();
  if(!result||result.code==='UNAVAILABLE')throw hostError('INVENTORY_UNCONFIRMED');
  return checked(result);
}
async function readUpgradeInventory(context){
  const result=await context.state.inventory();
  if(result?.inventory_validation===true&&incompatibleInventory.has(result.code))return {reason:result.code};
  if(!result||result.code==='UNAVAILABLE')throw hostError('INVENTORY_UNCONFIRMED');
  return {inventory:checked(result)};
}
async function protectRejectedUpdate(context,kind,code,{reservedId,expected=context.initial,currentAsset}={}){
  const outcome={status:'partial',phase:kind+'_rejected',code,state_fenced:false,host:'unconfirmed',
    ...operationScope(context),pending_work:noWorkCanceled};
  let canObserveHost=false;
  const confirmHost=async()=>{
    const observed=await readHost(context);
    if(currentAsset&&!same(currentAsset,versionedAsset(observed.stack)))throw hostError('ASSET_MISMATCH');
    outcome.observed=observedMetadata(observed);
    requireStopped(observed);
    outcome.host='stopped';
  };
  try {
    if(reservedId){
      const current=await refresh(context);
      if(!isDisabled(current.installation)||current.lifecycle.owner?.id!==reservedId)throw hostError('REVISION_CONFLICT');
      outcome.operation=reservedId;
      outcome.state_fenced=true;
      await confirmHost();
      const superseded=current.lifecycle.fence_id!==current.lifecycle.owner.fence_id;
      await finishLifecycle(context,reservedId,current,{outcome:superseded?'superseded':'partial',
        terminal:{status:'update_rejected',code,observed:outcome.observed,observed_at:context.now()}});
    }else{
      const {id,data}=await fenceStop(context,expected);
      outcome.state_fenced=true;
      outcome.operation=data.lifecycle.owner?.id??id;
      if(data.lifecycle.owner?.id!==id)throw hostError('HOST_OWNER_ACTIVE');
      context.phase='host_stop';
      canObserveHost=true;
      const observed=await readHost(context);
      if(currentAsset&&!same(currentAsset,versionedAsset(observed.stack)))throw hostError('ASSET_MISMATCH');
      await disableHost(context,id,observed,{all:true});
      await confirmHost();
      await finishLifecycle(context,id,await refresh(context),{outcome:'completed',
        terminal:{status:'protective_stop',code,observed:outcome.observed,observed_at:context.now()}});
    }
  }catch(error){
    outcome.protection_code=error.code??'CONTROL_UNCERTAIN';
    if(context.operation&&!outcome.operation)outcome.operation=context.operation;
    if(canObserveHost&&!outcome.observed)await confirmHost().catch(()=>{});
  }
  outcome.recovery=outcome.protection_code?
    (outcome.operation?'Preserve the original receipt and operation ID. Inspect the operation to determine what settled.':
      'Verify the current original receipt and host controls before attempting protection again.'):
    'Preserve the original receipt. Resolve the reported compatibility or inventory issue before applying a reviewed target.';
  return outcome;
}
async function lifecycleUpdate(context,input,kind){
  const {receipt,initial}=context;
  const source=receipt.manifest;
  let observed, target, desired, asset, inventory, expected;
  let enabling=false;
  if(kind==='upgrade'){
    const protective=Boolean(input.protectRejectedPath);
    if(protective===Boolean(input.previewPath))throw hostError('INVALID_INPUT');
    const proposed=proposalJSON(input.protectRejectedPath??input.previewPath);
    const evaluation=await evaluateUpgrade(context,input);
    // A file only selects the action requested by the flag if every field still matches live evidence.
    if(protective!==Boolean(evaluation.reason)||!same(proposed,evaluation.artifact)){
      const code=protective?'UPGRADE_REFUSAL_STALE':'UPGRADE_PREVIEW_STALE';
      return {status:'unavailable',phase:'upgrade_preview',code,state_fenced:false,state_mutated:false,host_mutated:false,
        ...operationScope(context),pending_work:noWorkCanceled,
        recovery:'Run upgrade-preview with the current original receipt, proposed manifest and asset, and a fresh output path.'};
    }
    ({observed,expected,inventory}=evaluation);
    ({manifest:target,desired,asset}=evaluation.target);
    const currentAsset=evaluation.artifact.current_asset;
    const current=await readHost(context);
    if(!same(currentAsset,versionedAsset(current.stack)))throw hostError('ASSET_MISMATCH');
    if(!same(expected,await refresh(context)))throw hostError('REVISION_CONFLICT');
    if(protective)return protectRejectedUpdate(context,kind,evaluation.reason,{expected,currentAsset});
  }else{
    if(!initial.lifecycle.bootstrapped||!receiptMatchesState(receipt,initial.installation))throw hostError('UPDATE_PRECONDITION');
    observed=await readHost(context);
    const proposal=proposedTarget(input);
    ({manifest:target,desired,asset}=proposal);
    enabling=desired.control.schedule_enabled||desired.control.writes_enabled;
    try {
      if(proposal.incompatible)throw hostError(proposal.incompatible);
      samePinControls(source,target);
    }catch(error){
      if(enabling&&['UNSUPPORTED_VERSION','UNSUPPORTED_PACKAGE','UNSUPPORTED_CHANGE'].includes(error.code))
        return protectRejectedUpdate(context,kind,error.code);
      throw error;
    }
    try { inventory=await updateInventory(context); }
    catch(error){
      if(enabling&&incompatibleInventory.has(error.code))return protectRejectedUpdate(context,kind,error.code);
      throw error;
    }
    expected={installation:inventory.installation,lifecycle:inventory.lifecycle};
    if(!same(initial,expected))throw hostError('REVISION_CONFLICT');
    if(initial.lifecycle.owner)throw hostError('UPDATE_PRECONDITION');
  }
  let stop;
  if(enabling){
    if(inventory.pending_attempts.length)throw hostError('PENDING_RECONCILIATION');
    const alreadyAdmitting=inventory.installation.schedule_enabled||inventory.installation.writes_enabled;
    const initialActivation=!inventory.lifecycle.recovery.length&&inventory.lifecycle.last_operation_id&&
      checked(await context.state.readOperation(inventory.lifecycle.last_operation_id))?.owner?.kind==='bootstrap';
    if(!alreadyAdmitting&&!initialActivation){
      stop=await verifiedStop(context,observed,source,inventory.installation);
    }
    if(inventory.lifecycle.recovery.length){
      if(!stop)throw hostError('DRAIN_INCOMPLETE');
      verifyLifecycleRecovery(inventory.lifecycle.recovery,inventory.decisions,stop.pb_stop_id);
    }
    if(desired.control.writes_enabled&&Object.values(desired.activation).some(value=>value!==true))throw hostError('ACTIVATION_CONFIRMATIONS_REQUIRED');
  }
  const effects=['disable-schedule','disable-concurrency','create-change-set','execute-change-set',
    ...(enabling?['enable-concurrency',...(desired.control.schedule_enabled?['enable-schedule']:[])]:[])];
  const {id,data}=await reserve(context,expected,kind,effects,
    updateDetails(context,source,target,asset,{enabling,schedule_enabled:desired.control.schedule_enabled,before_asset:versionedAsset(observed.stack)}),
    {stop_id:stop?.pb_stop_id});
  rememberOperation(context,id,data);
  const bound=await readHost(context,source);
  if(!same(versionedAsset(bound.stack),versionedAsset(observed.stack)))throw hostError('ASSET_MISMATCH');
  await disableHost(context,id,bound,{all:true});
  await drain(context,source,id);
  let fencedInventory;
  if(kind==='upgrade'){
    const result=await readUpgradeInventory(context);
    if(result.reason)return protectRejectedUpdate(context,kind,result.reason,{reservedId:id});
    fencedInventory=result.inventory;
  }else{
    try { fencedInventory=await updateInventory(context); }
    catch(error){
      if(enabling&&incompatibleInventory.has(error.code))return protectRejectedUpdate(context,kind,error.code,{reservedId:id});
      throw error;
    }
  }
  if(kind==='upgrade'){
    const recovery=pendingRecovery(fencedInventory.pending_attempts);
    if(recovery.length)await mutate(context,{type:'retain-recovery',id,recovery,
      expected:{installation:fencedInventory.installation,lifecycle:fencedInventory.lifecycle}});
  }else if(enabling&&fencedInventory.pending_attempts.length)throw hostError('PENDING_RECONCILIATION');
  const provider=await applyChange(context,id,kind,target,asset);
  const stopped=requireStopped(await verifiedTarget(context,target,asset));
  const {observed:actual,expected:enablementState}=enabling?await enableAfterUpdate(context,id,stopped,desired,target,asset):{observed:stopped};
  const controls=kind==='upgrade'?safeControls(target):{...desired.control,package_revision:target.source_revision};
  return commitUpdate(context,id,kind,target,actual,provider,controls,{recovery:enabling?[]:undefined,expected:enablementState});
}
async function bridgeMaintenance(context,input){
  const {receipt,initial}=context;
  const recoveryReceipt=readJSON(input.installationPath), source=readJSON(input.sourceManifestPath);
  const originalOperation=checked(await context.state.readOperation(input.operation));
  const recovery=recoveryReceipt.recovery_only;
  if(!recovery||!currentSupersededUpdate(originalOperation,initial)||recovery.kind!==originalOperation.owner.kind||
    originalOperation.owner.id!==input.operation||recovery.operation!==input.operation||
    recovery.fence!==originalOperation.fence_id||!receiptMatchesState(receipt,initial.installation)||
    !same(recovery.original,originalOperation.owner.details.source)||
    !same(originalOperation.owner.details.source,boundManifest(receipt.manifest))||
    !same(originalOperation.owner.details.target,boundManifest(source))||
    !same(recoveryReceipt,receiptFor(receipt,source,originalOperation.terminal.observed_at,{recovery})))
    throw hostError('MAINTENANCE_HANDOFF_STALE');
  const {manifest:target,desired,asset}=loadedTarget(input);
  if(!isDisabled(desired.control))throw hostError('MAINTENANCE_REQUIRED');
  validateManifest(source,JSON.stringify(source.canonical_config));
  samePinControls(source,target,{strict:true});
  const observed=await verifiedTarget(context,source,originalOperation.owner.details.asset);
  if(!same(observedMetadata(observed),originalOperation.terminal.observed))throw hostError('MAINTENANCE_HANDOFF_STALE');
  const {id,data}=await reserve(context,initial,'maintenance-only',[...protectiveEffects(observed),'create-change-set','execute-change-set'],
    updateDetails(context,source,target,asset,{superseded_operation:input.operation,held:boundManifest(receipt.manifest)}),
    {superseded_id:input.operation});
  rememberOperation(context,id,data);
  const bound=await verifiedTarget(context,source,originalOperation.owner.details.asset);
  if(!same(observedMetadata(bound),observedMetadata(observed)))throw hostError('MAINTENANCE_HANDOFF_STALE');
  await disableHost(context,id,bound);
  requireStopped(await readHost(context,source));
  const provider=await applyChange(context,id,'maintenance-only',target,asset);
  const actual=requireStopped(await verifiedTarget(context,target,asset));
  return commitUpdate(context,id,'maintenance-only',target,actual,provider,safeControls(target));
}

function operationSourceMatches(context,owner){
  const scope=operationScope(context),details=owner.details;
  return Object.entries(scope).every(([key,value])=>details[key]===value) &&
    same(details.held??details.source,boundManifest(context.receipt.manifest));
}
function operationTarget(context,input,owner){
  const target=owner.details.target;
  if(!target)throw hostError('OPERATION_INPUTS_UNAVAILABLE');
  const manifest=owner.kind==='bootstrap'?context.receipt.manifest:loadedTarget(input).manifest;
  if(!same(boundManifest(manifest),target))throw hostError('OPERATION_TARGET_MISMATCH');
  return manifest;
}
const effectState = (owner,name)=>owner.effects.find(effect=>effect.name===name)?.state;
function enablementSummary(owner){
  const {schedule_enabled,rotate_health_epoch}=owner.details;
  const epoch=recordedEnablement(owner);
  let status='unavailable';
  if(epoch)status='recorded';
  else if(schedule_enabled===false)status='not_applicable';
  else if(schedule_enabled===true&&rotate_health_epoch===false)status='preserved';
  return {enablement_status:status,verified_enablement:epoch};
}
function operationSummary(context,owner,stored){
  return {operation:owner.id,kind:owner.kind,...operationScope(context),phase:stored?'terminal':owner.phase,
    original_operator:owner.actor,original_deployer:owner.details.deployer??null,source:owner.details.source??null,target:owner.details.target??null,
    change_set_id:owner.details.change_set_id??null,effects:owner.effects,
    ...(owner.kind==='configure'?enablementSummary(owner):{}),
    ...(stored?{outcome:stored.outcome,terminal:stored.terminal,finished_by:stored.actor,
      fence:stored.fence_id,recorded_at:stored.recorded_at}:{})};
}
async function operationReadback(context,input,finish){
  if(context.suppliedDigest!==context.receipt.binding.configuration_digest)throw hostError('OPERATION_SOURCE_MISMATCH');
  const initial=await refresh(context);
  if(context.receipt.recovery_only){
    const stored=context.recoveryOperation;
    // The terminal row is immutable. Check that its fence is still current after the host read.
    if(finish||stored?.owner.id!==input.operation||!currentSupersededUpdate(stored,initial))
      throw hostError('RECOVERY_RECEIPT_UNVERIFIED');
    return {status:'inspected',...operationSummary(context,stored.owner,stored)};
  }
  if(!input.operation){
    if(finish)throw hostError('OPERATION_REQUIRED');
    return {status:'inspected',...operationScope(context),active:initial.lifecycle.owner?.id??null,last:initial.lifecycle.last_operation_id,
      observed_source:initial.lifecycle.owner?.details?.source??null,observed_target:initial.lifecycle.owner?.details?.target??null};
  }
  const stored=checked(await context.state.readOperation(input.operation));
  if(!stored)throw hostError('OPERATION_NOT_FOUND');
  const owner=stored.owner??stored;
  if((updateKind(owner.kind)||owner.kind==='remove')&&!operationSourceMatches(context,owner))throw hostError('OPERATION_SOURCE_MISMATCH');
  const summary=operationSummary(context,owner,stored.owner?stored:null);
  if(stored.owner){
    if(owner.kind==='remove'&&stored.terminal?.status==='partial'&&stored.terminal.provider){
      return inspectPartialRemoval(context,stored,summary,finish);
    }
    if(!finish)return {status:'inspected',...summary};
    return exportOperation(context,input,stored,summary);
  }
  if(!same(initial.lifecycle.owner,owner))throw hostError('REVISION_CONFLICT');
  context.operation=owner.id;
  context.fenced=isDisabled(initial.installation);
  context.phase=owner.phase;
  const superseded=owner.fence_id!==initial.lifecycle.fence_id;
  const deleting=owner.kind==='remove';
  const effect=deleting?'delete-stack':'execute-change-set';
  const finalState=effectState(owner,effect);
  if(!deleting&&owner.effects.some(item=>item.name!==effect&&item.state==='claimed')){
    if(!finish)return {status:'inspected',...summary,outcome:'held',superseded,code:'HOST_DISPATCH_UNACCOUNTED'};
    throw hostError('HOST_DISPATCH_UNACCOUNTED');
  }
  if(!finalState||finalState==='pending'){
    if(owner.effects.some(item=>item.state==='claimed'))throw hostError('HOST_DISPATCH_UNACCOUNTED');
    if(!finish)return {status:'inspected',...summary,outcome:'held',superseded,provider:'no final dispatch confirmed',
      ...(owner.kind==='bootstrap'?{recovery:'Use finish-operation with the original birth receipt to close this operation.'}:{})};
    const terminal={status:superseded?'superseded_before_final_dispatch':'closed_before_final_dispatch',
      observed_at:context.now(),...(owner.kind==='bootstrap'?{recovery:'Use bootstrap with the original birth receipt and both verified profiles. Bootstrap will recheck the birth preconditions.'}:{})};
    await finishLifecycle(context,owner.id,initial,{terminal,outcome:superseded?'superseded':'partial'});
    return {status:superseded?'superseded':'partial',...summary,phase:'terminal',terminal,state_fenced:true};
  }
  if(!deleting&&!dynamo.validLifecycleChangeSetId(owner.details.change_set_id,context.receipt.binding.stack_id,owner.id))
    throw hostError('CHANGE_UNCERTAIN');
  let provider;
  try { provider=await providerTerminal(context,owner.id,deleting?'DELETE':'UPDATE'); }
  catch (error) {
    if(finish)throw error;
    return {status:'inspected',...summary,outcome:'held',superseded,code:error.code??'PROVIDER_UNAVAILABLE'};
  }
  if(!superseded&&owner.details.enabling){
    let code;
    if(owner.details.rotate_health_epoch&&!recordedEnablement(owner))code='ENABLEMENT_UNVERIFIED';
    else if(owner.effects.some(item=>item.state!=='settled'))code='OPERATION_INCOMPLETE';
    if(code){
      if(finish)throw hostError(code);
      return {status:'inspected',...summary,outcome:'held',superseded,provider,code};
    }
  }
  if(!finish)return {status:'inspected',...summary,outcome:'awaiting_finish',superseded,provider};
  if(deleting)return finishRemoval(context,owner,initial,provider,superseded);
  if(!updateKind(owner.kind))throw hostError('OPERATION_INCOMPLETE');
  const target=operationTarget(context,input,owner);
  const observed=await verifiedTarget(context,target,owner.details.asset);
  if(!owner.details.enabling)requireStopped(observed);
  const desired=validateManifest(target,JSON.stringify(target.canonical_config)).control;
  if(owner.details.enabling&&!superseded&&(observed.concurrency!==1||observed.schedule.State!==(desired.schedule_enabled?'ENABLED':'DISABLED')))
    throw hostError('HOST_UNCONFIRMED');
  const acknowledgeBootstrap=superseded&&owner.kind==='bootstrap';
  if(acknowledgeBootstrap&&(desired.schedule_enabled||desired.writes_enabled||!receiptMatchesState(context.receipt,initial.installation)||
      parameters(observed.stack)[deployment.LIFECYCLE_TABLE_ID_PARAMETER]!==context.receipt.origin.table_id))
    throw hostError('BOOTSTRAP_PRECONDITION');
  // Both writes use the exact snapshot that authorized the provider and host
  // observations. A new fence requires a fresh finish attempt and observations.
  const current=finalState==='claimed'?await mutate(context,{type:'settle',id:owner.id,effect,expected:initial}):initial;
  const status=superseded?'host_updated_admission_fenced':owner.kind==='bootstrap'?'bootstrapped':owner.kind==='upgrade'?'upgraded':'configured';
  const terminal={status,provider,observed:observedMetadata(observed),observed_at:context.now(),
    ...(acknowledgeBootstrap?{bootstrap_acknowledged:true,bootstrap_pin:observed.table.TableId}:{}),
    held:{package_revision:initial.installation.package_revision,configuration_digest:initial.installation.configuration_digest},
    applied:Object.fromEntries(Object.keys(disabled).map(key=>[key,initial.installation[key]]))};
  const controls=owner.kind==='upgrade'?safeControls(target):{...desired,package_revision:target.source_revision};
  await finishLifecycle(context,owner.id,current,{terminal,outcome:superseded?'superseded':'completed',
    ...(!superseded?{controls,...(owner.details.enabling?{recovery:[]}:{})}:{})});
  const saved=checked(await context.state.readOperation(owner.id));
  return exportOperation(context,input,saved,operationSummary(context,owner,saved));
}
function exportOperation(context,input,stored,summary){
  const {terminal,owner,outcome}=stored;
  if(owner.kind==='remove')return {status:outcome==='superseded'?'superseded':terminal.status,...summary,receipt:terminal};
  if(terminal.status==='update_rejected')return {status:outcome,...summary};
  if(!updateKind(owner.kind)||!terminal.observed)return {status:outcome==='superseded'?'superseded':'inspected',...summary};
  const target=operationTarget(context,input,owner);
  const recovery=recoverableSupersededUpdate(stored)?{operation:owner.id,fence:stored.fence_id,kind:owner.kind,
    original:boundManifest(context.receipt.manifest)}:null;
  // An interrupted maintenance bridge is intentionally not a new handoff.
  return {status:outcome==='superseded'?'superseded':terminal.status,...summary,
    ...(outcome==='superseded'&&!recovery&&!terminal.bootstrap_acknowledged?{}:{receipt:receiptFor(context.receipt,target,terminal.observed_at,{recovery})})};
}

async function stackInventory(context,observed){
  const {session,receipt}=context,{sdk,operator}=session,stackId=receipt.binding.stack_id;
  const template=await awsSend(operator.cloudformation,sdk,'GetTemplateCommand',{StackName:stackId,TemplateStage:'Original'});
  let deployed;
  try{deployed=typeof template.TemplateBody==='string'?JSON.parse(template.TemplateBody):template.TemplateBody;}
  catch{throw hostError('RETENTION_UNVERIFIED');}
  const generated=deployment.synthesizeTemplate(JSON.stringify(context.config),receipt.manifest,{initial:false});
  const map=deployment.installationResourceMap(context.config.manager.installation_id,receipt.manifest);
  const actual=await awsSend(operator.cloudformation,sdk,'DescribeStackResourcesCommand',{StackName:stackId});
  const items=actual.StackResources;
  if(!Array.isArray(items)||items.length!==Object.keys(generated.Resources).length||
    new Set(items.map(item=>item.LogicalResourceId)).size!==items.length||!deployed?.Resources||
    !same(Object.keys(deployed.Resources).sort(),Object.keys(generated.Resources).sort()))throw hostError('RETENTION_UNVERIFIED');
  const resources=items.map(item=>{
    const logical=item.LogicalResourceId, definition=deployed.Resources[logical],expected=generated.Resources[logical];
    const key=Object.keys(map.logical).find(key=>map.logical[key]===logical);
    const physical=item.PhysicalResourceId;
    if(!expected||!definition||definition.Type!==expected.Type||item.ResourceType!==definition.Type||!physical||
      (key&&physical!==map.physical[key])||(item.StackId&&item.StackId!==stackId))throw hostError('RETENTION_UNVERIFIED');
    const retain=definition.DeletionPolicy==='Retain';
    if(logical===map.logical.table_name&&(!retain||definition.UpdateReplacePolicy!=='Retain'))throw hostError('RETENTION_UNVERIFIED');
    if(definition.DeletionPolicy&&!['Retain','Delete'].includes(definition.DeletionPolicy))throw hostError('RETENTION_UNVERIFIED');
    if(logical!==map.logical.table_name&&logical!==map.logical.log_group&&retain)throw hostError('RETENTION_UNVERIFIED');
    return {logical,physical,type:definition.Type,disposition:retain?'retained':'deleted',
      ...(retain?{cost:definition.Type==='AWS::DynamoDB::Table'?'DynamoDB storage and applicable backups':'CloudWatch Logs storage'}:{})};
  }).sort((a,b)=>a.logical.localeCompare(b.logical));
  const a=context.config.manager.aws;
  return {resources,asset:versionedAsset(observed.stack),externally_owned:[
    {reference:context.config.jira.connection.secret_reference,cost:'Secrets Manager storage and API use'},
    ...(a.recovery_jira_secret_arn?[{reference:a.recovery_jira_secret_arn,cost:'Secrets Manager storage and API use'}]:[]),
    {reference:versionedAsset(observed.stack),cost:'Artifact object storage and applicable versions'},
    {reference:a.operator_role_arn},{reference:a.deployer_role_arn},
    ...(observed.stack.RoleARN?[{reference:observed.stack.RoleARN}]:[])],
    execution_role:observed.stack.RoleARN??a.deployer_role_arn};
}
async function removalPreview(context){
  const {receipt,initial}=context;
  if(!initial.lifecycle.bootstrapped||initial.lifecycle.owner||!receiptMatchesState(receipt,initial.installation))
    throw hostError('REMOVAL_PRECONDITION');
  const observed=await readHost(context,receipt.manifest,{settlement:true});
  const stop=await verifiedStop(context,observed,receipt.manifest,initial.installation);
  const inventory=await stackInventory(context,observed);
  const after=await refresh(context);
  if(!same(initial,after))throw hostError('REVISION_CONFLICT');
  return {schema:'pigboard-removal-preview/v1',...operationScope(context),source:boundManifest(receipt.manifest),
    stop_id:stop.pb_stop_id,inventory};
}
async function removeLifecycle(context,input){
  const preview=readJSON(input.previewPath),expected=await removalPreview(context);
  if(!same(preview,expected))throw hostError('REMOVAL_PREVIEW_STALE');
  const a=context.config.manager.aws,role=expected.inventory.execution_role;
  if(role!==a.deployer_role_arn||!roleMatches(context.session.deployer.identity.Arn,role,a.account_id))
    throw hostError('REMOVAL_EXECUTION_AUTHORITY_UNCONFIRMED');
  const {receipt,session}=context,stackId=receipt.binding.stack_id;
  const details={...operationScope(context),source:boundManifest(receipt.manifest),inventory:expected.inventory,
    stop_id:expected.stop_id,deployer:session.deployer.identity};
  const {id,data}=await reserve(context,context.initial,'remove',['delete-stack'],details,{stop_id:expected.stop_id});
  rememberOperation(context,id,data);
  const host=requireStopped(await readHost(context,receipt.manifest,{settlement:true}));
  if(!same(await stackInventory(context,host),details.inventory))throw hostError('REMOVAL_PREVIEW_STALE');
  await dispatchCloudFormation(context,id,'delete-stack','DeleteStackCommand',{StackName:stackId,ClientRequestToken:id});
  const terminal=await providerTerminal(context,id,'DELETE',{poll:true});
  await context.beforeFinish?.(id);
  const current=await refresh(context);
  if(current.lifecycle.fence_id!==data.lifecycle.fence_id)throw hostError('OPERATION_SUPERSEDED');
  return finishRemoval(context,current.lifecycle.owner,current,terminal,false);
}
async function deletionObservations(context,owner){
  const {session,receipt}=context,{operator,sdk}=session;
  const table=(await awsSend(operator.state,sdk,'DescribeTableCommand',{TableName:receipt.binding.table_name})).Table;
  if(!matchesBirthTable(table,receipt))throw hostError('PHYSICAL_STATE_MISMATCH');
  let events=[],token;
  for(let page=0;page<8;page++){
    const response=await awsSend(operator.cloudformation,sdk,'DescribeStackEventsCommand',{
      StackName:receipt.binding.stack_id,...(token?{NextToken:token}:{})});
    events.push(...(response.StackEvents??[]));
    if(!response.NextToken||response.NextToken===token)break;
    token=response.NextToken;
  }
  const inventory=owner.details.inventory;
  const resources=inventory.resources.map(row=>{
    const relevant=events.find(event=>event.StackId===receipt.binding.stack_id&&event.LogicalResourceId===row.logical&&
      event.PhysicalResourceId===row.physical&&event.ResourceType===row.type&&event.ClientRequestToken===owner.id);
    const observation=row.type==='AWS::DynamoDB::Table'?'retained':
      row.disposition==='deleted'&&relevant?.ResourceStatus==='DELETE_COMPLETE'?'deleted':
      row.disposition==='retained'&&relevant?.ResourceStatus==='DELETE_SKIPPED'?'retained':'unobservable';
    const possibleLogCost=observation==='unobservable'&&row.type==='AWS::Logs::LogGroup'&&!row.cost;
    return {...row,observation,...(possibleLogCost?{cost:'CloudWatch Logs storage if the log group remains'}:{})};
  });
  return {resources,externally_owned:inventory.externally_owned,retention_complete:resources.every(row=>row.observation===row.disposition)};
}
function removalStatus(provider,observations){
  return provider.status==='DELETE_COMPLETE' && observations.retention_complete ? 'removed' : 'partial';
}

async function inspectPartialRemoval(context,stored,summary,finish){
  const original=stored.terminal;
  let observation;
  try {
    const observed=await deletionObservations(context,stored.owner);
    observation={status:removalStatus(original.provider,observed),provider:original.provider,...observed,observed_at:context.now()};
  } catch(error) {
    observation={status:'partial',code:error.code??'RETENTION_UNVERIFIED',observed_at:context.now()};
  }
  const report={...summary,current_observation:observation};
  if(!finish)return {status:'inspected',...report};
  const status=stored.outcome==='superseded'?'superseded':observation.status;
  return {status,...report,receipt:{...original,current_observation:observation}};
}

async function finishRemoval(context,owner,initial,provider,superseded){
  if(!operationSourceMatches(context,owner))throw hostError('OPERATION_SOURCE_MISMATCH');
  const observed=await deletionObservations(context,owner);
  const terminal={status:removalStatus(provider,observed),provider,...observed,observed_at:context.now(),
    meaning:provider.status==='DELETE_FAILED'?'Stack deletion failed; inspect the retained and deleted resources.':superseded?'Stack deleted; admission fenced.':'Stack delete confirmed.',pending_work:noWorkCanceled};
  if(effectState(owner,'delete-stack')==='claimed')await settleEffect(context,owner.id,'delete-stack');
  const current=await refresh(context);
  if(current.lifecycle.fence_id!==initial.lifecycle.fence_id||current.lifecycle.owner?.id!==owner.id)throw hostError('REVISION_CONFLICT');
  const outcome=superseded?'superseded':terminal.status==='removed'?'completed':'partial';
  await finishLifecycle(context,owner.id,current,{terminal,outcome});
  const saved=checked(await context.state.readOperation(owner.id));
  return exportOperation(context,{},saved,operationSummary(context,owner,saved));
}

export async function runLifecycle(command,input,dependencies={}){
  let context;
  try {
    const dispatch=['bootstrap','configure','upgrade','maintenance-only','remove'].includes(command);
    context=await resolveLifecycle(input,dependencies,{dispatch,originalPath:command==='maintenance-only'?input.originalInstallationPath:input.installationPath,
      command});
    context.phase='verified_state';
    context.publishOperation=dependencies.publishOperation;
    context.beforeFinish=dependencies.beforeLifecycleFinish;
    switch(command){
      case 'stop': return await lifecycleStop(context,input);
      case 'bootstrap': return await bootstrapLifecycle(context,input);
      case 'configure': case 'upgrade': return await lifecycleUpdate(context,input,command);
      case 'upgrade-preview': return await upgradePreview(context,input);
      case 'maintenance-only': return await bridgeMaintenance(context,input);
      case 'remove-preview': return {status:'previewed',phase:'removal_preview',receipt:await removalPreview(context)};
      case 'remove': return await removeLifecycle(context,input);
      case 'inspect-operation': case 'finish-operation': return await operationReadback(context,input,command==='finish-operation');
      default: throw hostError('INVALID_INPUT');
    }
  }catch(error){
    return {status:context?.operation?'partial':'unavailable',phase:context?.phase??'verify_state',
      code:error.code??error.stateResult?.code??'CONTROL_UNCERTAIN',state_fenced:context?.fenced?'confirmed':'unconfirmed',
      ...(context?.operation?{operation:context.operation,...operationScope(context)}:{}),pending_work:noWorkCanceled,
      recovery:error.code==='ENABLEMENT_UNVERIFIED'?'Keep admission fenced. Preserve the original receipt and operation ID for inspection or protective stop.':
        context?.operation?'Preserve the operation ID and original receipt. Use inspect-operation to determine what settled before any other action.':
        'Verify the original receipt, configured profiles and physical State before dispatching a change.'};
  }finally{context?.session.dispose();}
}
