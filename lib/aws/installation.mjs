import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { sep } from 'node:path';
import { createHash } from 'node:crypto';
import canonicalize from 'canonicalize';
import { parseConfig } from '../config/parse.mjs';
import { parseContract } from '../contracts/work.mjs';
import { validBinding, validateRecord, nextRevision, failure } from '../state/contract.mjs';
import { createDynamoState } from './dynamodb.mjs';

export const sha256 = value => 'sha256:'+createHash('sha256').update(value).digest('hex');
export const hostError = code => Object.assign(new Error(code), {code});
// Physical names use the full validated canonical ID; readable replacement alone is lossy.
export function installationResourceBase(installationId){
  const readable=installationId.replace(/[^A-Za-z0-9-]/g,'-').slice(0,12),digest=createHash('sha256').update(installationId).digest('hex').slice(0,32);
  return 'pigboard-'+readable+'-'+digest;
}
const same=(a,b)=>canonicalize(a)===canonicalize(b);
export function hostConfig(text){
  const parsed=parseConfig(text);if(!parsed.valid)throw hostError('INVALID_CONFIG');
  const config=parseContract(text);if(!config.manager||parsed.live_configuration.status!=='complete')throw hostError('HOST_SETTINGS_REQUIRED');
  const m=config.manager,a=m.aws;
  if(!new RegExp('^arn:aws:secretsmanager:'+a.region+':'+a.account_id+':secret:[A-Za-z0-9/_+=.@-]+$').test(config.jira.connection.secret_reference))throw hostError('SECRET_REFERENCE');
  if(40+config.jira.read_bounds.scan_timeout_ms/1000>m.invocation_timeout_seconds)throw hostError('READ_BUDGET');
  return {config,digest:parsed.configuration_digest};
}
export function deriveHostControls(configText,{package_revision,binding}={}){
  const {config,digest}=hostConfig(configText),m=config.manager;
  if(!/^[a-f0-9]{40}$/.test(package_revision??''))throw hostError('PACKAGE_REVISION');
  const control={configuration_digest:digest,schedule_enabled:m.controls.schedule_enabled,writes_enabled:m.controls.writes_enabled,maintenance:m.controls.maintenance};
  if(binding&&(!validBinding(binding,{...control,configuration_digest:binding.configuration_digest})||binding.installation_id!==m.installation_id||binding.domain_id!==m.domain_id||binding.region!==m.aws.region||binding.site!==config.jira.site||binding.package_revision!==package_revision))throw hostError('BINDING_MISMATCH');
  return {configuration_digest:digest,installation_id:m.installation_id,domain_id:m.domain_id,package_revision,control,mode:m.controls.mode,activation:structuredClone(m.activation),transition_edges:structuredClone(m.transition_edges)};
}
export function previewOnly(projection){if(projection.mode!=='preview'||projection.control.writes_enabled)throw hostError('APPLY_UNSUPPORTED');}
export function loadHostSDK(){
  try{
    const url=new URL('../../runtime/aws/package.json',import.meta.url),require=createRequire(url),manifest=JSON.parse(readFileSync(url)),base=realpathSync(fileURLToPath(new URL('./node_modules/',url)))+sep;
    const names=['client-cloudformation','client-secrets-manager','client-lambda','client-scheduler','client-sts','credential-providers','client-dynamodb','lib-dynamodb'];let sdk={};
    for(const short of names){const name='@aws-sdk/'+short,p=realpathSync(require.resolve(name+'/package.json'));if(!p.startsWith(base)||!realpathSync(require.resolve(name)).startsWith(base)||JSON.parse(readFileSync(p)).version!==manifest.dependencies[name])throw Error();Object.assign(sdk,require(name));}return sdk;
  }catch{throw hostError('SETUP');}
}
export async function awsSend(client,sdk,name,input,duration=10000){const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),duration);try{return await client.send(new sdk[name](input),{abortSignal:abort.signal});}finally{clearTimeout(timer);}}
export function roleMatches(arn,role,account){
  if(arn===role)return role.startsWith('arn:aws:iam::'+account+':role/');
  const path=role.split(':role/')[1];if(!path||path.includes('/'))return false;
  return new RegExp('^arn:aws:sts::'+account+':assumed-role/'+path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/[^/]+$').test(arn??'');
}
export async function openHostSession(config,{operatorProfile,deployerProfile,configure=false,sdk=loadHostSDK(),makeClient}={}){
  if(!operatorProfile||configure&&!deployerProfile)throw hostError('PROFILE_REQUIRED');
  const owned=[];const create=(kind,credentials)=>{const options={region:config.manager.aws.region,maxAttempts:1,credentials};const client=makeClient?makeClient(kind,options):new sdk[kind+'Client'](options);owned.push(client);return client;};
  let closed=false;const dispose=()=>{if(!closed){closed=true;for(const client of owned)client.destroy?.();}};
  try{
    const verify=async(profile,role)=>{const provider=sdk.fromIni({profile}),credentials=await provider(),sts=create('STS',credentials),identity=await awsSend(sts,sdk,'GetCallerIdentityCommand',{});if(identity.Account!==config.manager.aws.account_id||!roleMatches(identity.Arn,role,identity.Account))throw hostError('IDENTITY_MISMATCH');return credentials;};
    const operator=await verify(operatorProfile,config.manager.aws.operator_role_arn),deployer=configure?await verify(deployerProfile,config.manager.aws.deployer_role_arn):null;
    const raw=create('DynamoDB',operator),document=makeClient?makeClient('DynamoDBDocument',{region:config.manager.aws.region,maxAttempts:1,credentials:operator}):sdk.DynamoDBDocumentClient.from(raw,{marshallOptions:{removeUndefinedValues:false}});
    if(makeClient)owned.push(document);
    return {sdk,operator:{cloudformation:create('CloudFormation',operator),lambda:create('Lambda',operator),scheduler:create('Scheduler',operator),state:document},deployer:deployer?{cloudformation:create('CloudFormation',deployer)}:null,dispose};
  }catch(error){dispose();throw error;}
}
export function validateManifest(manifest,configText){const projection=deriveHostControls(configText,{package_revision:manifest?.source_revision});if(manifest?.schema!=='pigboard-manager-package/v1'||manifest.configuration_digest!==projection.configuration_digest||manifest.installation_id!==projection.installation_id||manifest.domain_id!==projection.domain_id||!/^sha256:[0-9a-f]{64}$/.test(manifest.zip_digest??'')||!/^[-A-Za-z0-9._:]{1,255}$/.test(manifest.installation_generation??''))throw hostError('PACKAGE_MISMATCH');previewOnly(projection);return projection;}
function outputMap(stack){return Object.fromEntries((stack.Outputs??[]).map(v=>[v.OutputKey,v.OutputValue]));}
async function observeResources({config,manifest,stackId,session},recovery=false){
  const {sdk,operator:o}=session,a=config.manager.aws;
  if(!new RegExp('^arn:aws:cloudformation:'+a.region+':'+a.account_id+':stack/'+a.stack_name+'/[A-Za-z0-9-]+$').test(stackId??''))throw hostError('BINDING_MISMATCH');
  const response=await awsSend(o.cloudformation,sdk,'DescribeStacksCommand',{StackName:stackId}),stack=response.Stacks?.[0];if(!stack||stack.StackId!==stackId)throw hostError('BINDING_MISMATCH');
  const outputs=outputMap(stack),resources=(await awsSend(o.cloudformation,sdk,'DescribeStackResourcesCommand',{StackName:stackId})).StackResources??[];
  const physical=id=>resources.find(r=>r.LogicalResourceId===id)?.PhysicalResourceId;
  const names={function_name:physical('Function'),schedule_name:physical('Schedule'),table_name:physical('StateTable'),runtime_role:physical('RuntimeRole'),scheduler_role:physical('SchedulerRole'),log_group:physical('LogGroup')};
  if(Object.values(names).some(v=>typeof v!=='string'||!v.length))throw hostError('BINDING_MISMATCH');
  const base=installationResourceBase(config.manager.installation_id),expectedNames={function_name:base,schedule_name:base,table_name:base+'-state',runtime_role:base+'-runtime',scheduler_role:base+'-scheduler',log_group:'/aws/lambda/'+base};if(Object.entries(expectedNames).some(([k,v])=>names[k]!==v))throw hostError('BINDING_MISMATCH');
  const fn=await awsSend(o.lambda,sdk,'GetFunctionCommand',{FunctionName:names.function_name}),fc=await awsSend(o.lambda,sdk,'GetFunctionConfigurationCommand',{FunctionName:names.function_name}),concurrency=await awsSend(o.lambda,sdk,'GetFunctionConcurrencyCommand',{FunctionName:names.function_name}),schedule=await awsSend(o.scheduler,sdk,'GetScheduleCommand',{Name:names.schedule_name}),table=(await awsSend(o.state,sdk,'DescribeTableCommand',{TableName:names.table_name})).Table;
  const env=fc.Environment?.Variables??{},m=config.manager;
  const binding={schema:'pigboard-aws-installation/v1',installation_id:m.installation_id,domain_id:m.domain_id,site:config.jira.site,configuration_digest:manifest.configuration_digest,package_revision:manifest.source_revision,region:a.region,stack_id:stackId,table_name:names.table_name,table_arn:table?.TableArn,installation_generation:manifest.installation_generation};
  const expectedEnv={PB_INSTALLATION_ID:m.installation_id,PB_DOMAIN_ID:m.domain_id,PB_INSTALLATION_GENERATION:manifest.installation_generation,...(recovery?{}:{PB_PACKAGE_REVISION:manifest.source_revision,PB_CONFIGURATION_DIGEST:manifest.configuration_digest,PB_MODE:m.controls.mode,PB_WRITES_ENABLED:String(m.controls.writes_enabled)}),PB_TABLE_NAME:names.table_name,PB_TABLE_ARN:table?.TableArn,PB_STACK_ID:stackId};
  if(!validBinding(binding,{configuration_digest:binding.configuration_digest,schedule_enabled:false,writes_enabled:false,maintenance:false})||table?.TableArn!==`arn:aws:dynamodb:${a.region}:${a.account_id}:table/${names.table_name}`||table?.TableStatus!=='ACTIVE'||!same(table.KeySchema,[{AttributeName:'PK',KeyType:'HASH'},{AttributeName:'SK',KeyType:'RANGE'}])||!same(table.AttributeDefinitions,[{AttributeName:'PK',AttributeType:'S'},{AttributeName:'SK',AttributeType:'S'}])||Object.entries(expectedEnv).some(([k,v])=>env[k]!==v)||fc.Role!==`arn:aws:iam::${a.account_id}:role/${names.runtime_role}`||fn.Configuration?.FunctionArn!==`arn:aws:lambda:${a.region}:${a.account_id}:function:${names.function_name}`||fn.Configuration?.FunctionArn!==outputs.FunctionArn||fc.FunctionArn!==outputs.FunctionArn||(!recovery&&(fc.Runtime!=='nodejs24.x'||fc.Handler!=='lib/aws/manager-lambda.handler'||fc.Timeout!==m.invocation_timeout_seconds||fc.LastUpdateStatus!=='Successful'||fc.State!=='Active'||fn.Configuration?.CodeSha256!==Buffer.from(manifest.zip_digest.slice(7),'hex').toString('base64')))||schedule.Target?.Arn!==outputs.FunctionArn||schedule.Target?.RoleArn!==`arn:aws:iam::${a.account_id}:role/${names.scheduler_role}`||(!recovery&&(schedule.Target?.Input!==JSON.stringify({operation:'preview'})||schedule.Target?.RetryPolicy?.MaximumRetryAttempts!==0||schedule.Target?.RetryPolicy?.MaximumEventAgeInSeconds!==60||schedule.FlexibleTimeWindow?.Mode!=='OFF')))throw hostError('BINDING_MISMATCH');
  if(!recovery){const asyncConfig=await awsSend(o.lambda,sdk,'GetFunctionEventInvokeConfigCommand',{FunctionName:names.function_name,Qualifier:'$LATEST'});if(asyncConfig?.FunctionArn!==fn.Configuration.FunctionArn+':$LATEST'||asyncConfig?.MaximumRetryAttempts!==0||asyncConfig?.MaximumEventAgeInSeconds!==60)throw hostError('BINDING_MISMATCH');}
  return {binding,names,stack,outputs,function:fc,code_hash:fn.Configuration?.CodeSha256,concurrency:concurrency.ReservedConcurrentExecutions,schedule,table};
}
export async function observeInstallation(input){return observeResources(input);}
function validatedReceipt(receipt){
  const text=JSON.stringify(receipt?.manifest?.canonical_config),projection=validateManifest(receipt?.manifest,text),{config}=hostConfig(text),b=receipt?.binding;
  if(receipt.schema!=='pigboard-installation-receipt/v1'||!validBinding(b,projection.control)||b.installation_id!==projection.installation_id||b.domain_id!==projection.domain_id||b.site!==config.jira.site||b.region!==config.manager.aws.region||b.package_revision!==receipt.manifest.source_revision||['stack_id','table_name','table_arn','installation_generation'].some(k=>receipt.original?.[k]!==b[k])||b.installation_generation!==receipt.manifest.installation_generation)throw hostError('BINDING_MISMATCH');
  return {config,projection};
}
function recoveryMetadata(resolved,applied){
  const {receipt,projection,observed:o}=resolved,env=o.function.Environment?.Variables??{},safe=v=>['string','number','boolean'].includes(typeof v)?v:null;
  return {package_verified:false,warning:'Recovery observation only; package and runtime safety are unverified. No enable, apply or replay authority.',original:{binding:receipt.binding,zip_digest:receipt.manifest.zip_digest},desired:{...projection.control,package_revision:projection.package_revision},observed:{configuration_digest:safe(env.PB_CONFIGURATION_DIGEST),package_revision:safe(env.PB_PACKAGE_REVISION),code_hash:safe(o.code_hash),timeout_seconds:safe(o.function.Timeout),function_state:safe(o.function.State),update_status:safe(o.function.LastUpdateStatus),schedule_state:safe(o.schedule.State),concurrency:safe(o.concurrency)},applied:applied?{configuration_digest:applied.configuration_digest,package_revision:applied.package_revision,schedule_enabled:applied.schedule_enabled,writes_enabled:applied.writes_enabled,maintenance:applied.maintenance,revision:applied.revision}:null,omissions:'Null observations are unavailable; mutable observations never replace original receipt authority.'};
}
export async function bindInstallation({configText,manifest,stackId,operatorProfile},dependencies={}){
  validateManifest(manifest,configText);const {config}=hostConfig(configText),session=await openHostSession(config,{operatorProfile,...dependencies});
  try{const observed=await observeInstallation({config,manifest,stackId,session});return {schema:'pigboard-installation-receipt/v1',binding:observed.binding,manifest,original:{stack_id:stackId,table_name:observed.binding.table_name,table_arn:observed.binding.table_arn,installation_generation:manifest.installation_generation},observed_at:new Date().toISOString()};}finally{session.dispose();}
}
export async function resolveInstallation({configPath,installationPath,purpose,operatorProfile},dependencies={}){
  let session;try{
    const text=readFileSync(configPath,'utf8'),receipt=JSON.parse(readFileSync(installationPath,'utf8')),{config}=hostConfig(text),projection=deriveHostControls(text,{package_revision:receipt.manifest?.source_revision});
    const recovery=['recovery-inspect','safe-stop'].includes(purpose);if(recovery&&dependencies.health)throw hostError('BINDING_MISMATCH');
    previewOnly(projection);const {config:appliedConfig}=validatedReceipt(receipt);
    if(config.manager.installation_id!==appliedConfig.manager.installation_id||config.manager.domain_id!==appliedConfig.manager.domain_id||config.jira.site!==appliedConfig.jira.site||!same(config.manager.aws,appliedConfig.manager.aws))throw hostError('BINDING_MISMATCH');
    if(receipt.schema!=='pigboard-installation-receipt/v1')throw hostError('BINDING_MISMATCH');
    session=await openHostSession(config,{operatorProfile,...dependencies});const observed=await observeResources({config:appliedConfig,manifest:receipt.manifest,stackId:receipt.binding.stack_id,session},recovery);
    if(!same(observed.binding,receipt.binding)||['stack_id','table_name','table_arn','installation_generation'].some(k=>receipt.original?.[k]!==observed.binding[k]))throw hostError('BINDING_MISMATCH');
    let fresh_installation;
    if(purpose==='init'){
      const events=await awsSend(session.operator.cloudformation,session.sdk,'DescribeStackEventsCommand',{StackName:observed.binding.stack_id});
      if(projection.configuration_digest!==receipt.manifest.configuration_digest||observed.stack.StackStatus!=='CREATE_COMPLETE'||observed.stack.LastUpdatedTime||events.NextToken||!events.StackEvents?.some(e=>e.LogicalResourceId==='StateTable'&&e.ResourceStatus==='CREATE_COMPLETE'&&e.PhysicalResourceId===receipt.original.table_name)||observed.concurrency!==1||observed.schedule.State!=='DISABLED'||Object.values(projection.control).some(v=>v===true))throw hostError('FRESH_INSTALLATION_REQUIRED');
      fresh_installation={installation_id:projection.installation_id,domain_id:projection.domain_id,site:config.jira.site,configuration_digest:projection.configuration_digest,installation_generation:receipt.binding.installation_generation,observed_at:new Date().toISOString(),new_installation:true,table_empty:true};
    }
    const resolved={binding:{...receipt.binding,configuration_digest:projection.configuration_digest},control:projection.control,client:session.operator.state,dispose:session.dispose,fresh_installation,session,observed,receipt,projection,config};
    if(recovery){resolved.quiescence_timeout=Number.isInteger(observed.function.Timeout)&&observed.function.Timeout>=1&&observed.function.Timeout<=900?Math.max(appliedConfig.manager.invocation_timeout_seconds,observed.function.Timeout):null;resolved.recovery=recoveryMetadata(resolved,purpose==='recovery-inspect'?await appliedRecord(resolved):null);}
    return resolved;
  }catch(error){session?.dispose();throw error.stateResult?error:failure(['BINDING_MISMATCH','FRESH_INSTALLATION_REQUIRED','SETUP'].includes(error.code)?error.code:'UNAVAILABLE');}
}
export function createSecretResolver(config,{sdk=loadHostSDK(),client}={}){
  const owned=!client;client??=new sdk.SecretsManagerClient({region:config.manager.aws.region,maxAttempts:1});
  return {resolveSecret:async(reference,signal)=>{if(reference!==config.jira.connection.secret_reference)throw hostError('SECRET_REFERENCE');const response=await client.send(new sdk.GetSecretValueCommand({SecretId:reference}),{abortSignal:signal});if(typeof response.SecretString!=='string')throw hostError('SECRET_UNAVAILABLE');return response.SecretString;},dispose:()=>{if(owned)client.destroy();}};
}
export function controlOnlyChange(previous,next){
  if(previous.source_revision!==next.source_revision||previous.runtime!==next.runtime||!same(previous.dependency_hashes,next.dependency_hashes)||previous.installation_generation!==next.installation_generation)return false;
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
  let resolved,applied,phase='resolve';try{resolved=await resolveInstallation({...input,purpose:'safe-stop'},dependencies);phase='state_fence';const before=await appliedRecord(resolved);applied=await controlUpdate(resolved,before,{schedule_enabled:false,writes_enabled:false,maintenance:true});phase='host_stop';await quiesce(resolved,dependencies);return {status:'stopped',phase,recovery:{...recoveryMetadata(resolved,applied),observed_scope:'before_stop'},applied,desired:resolved.projection.control,intent_mismatch:resolved.control.schedule_enabled||resolved.control.writes_enabled,pending_work:'retained; inspect existing attempts'};}catch(error){return {status:resolved?'partial':'unavailable',phase,applied,...(resolved?{recovery_metadata:{...recoveryMetadata(resolved,applied),observed_scope:'before_stop'}}:{}),code:error.code??error.stateResult?.code??'CONTROL_UNCERTAIN',recovery:'Inspect this same installation; do not replay an uncertain mutation.'};}finally{resolved?.dispose();}
}
export async function configureInstallation(input,dependencies={}){
  let resolved,deployerSession,originalReceipt,desiredProjection,lastApplied,lastObserved,phase='resolve';try{
    const desiredText=readFileSync(input.configPath,'utf8'),desiredManifest=JSON.parse(readFileSync(input.manifestPath,'utf8')),desired=validateManifest(desiredManifest,desiredText),receipt=JSON.parse(readFileSync(input.installationPath,'utf8'));
    validatedReceipt(receipt);originalReceipt=receipt;desiredProjection=desired;
    if(!controlOnlyChange(receipt.manifest,desiredManifest))throw hostError('UNSUPPORTED_CHANGE');
    const oldConfig=receipt.manifest.canonical_config;if(!oldConfig)throw hostError('PACKAGE_MISMATCH');
    const old=structuredClone(oldConfig),next=hostConfig(desiredText).config;const strip=c=>{const v=structuredClone(c);for(const k of ['controls','activation','transition_edges','schedule_minutes','invocation_timeout_seconds','log_retention_days'])delete v.manager[k];return v;};if(!same(strip(old),strip(next)))throw hostError('UNSUPPORTED_CHANGE');
    // Resolve the currently applied package, then separately verify both identities before fencing.
    const previousText=JSON.stringify(oldConfig);const previousProjection=validateManifest(receipt.manifest,previousText);
    const asset=JSON.parse(readFileSync(input.assetPath,'utf8'));if(asset.zip_digest!==desiredManifest.zip_digest||!asset.bucket||!asset.key||!asset.version)throw hostError('ASSET_MISMATCH');
    deployerSession=await openHostSession(next,{operatorProfile:input.operatorProfile,deployerProfile:input.deployerProfile,configure:true,...dependencies});
    const observed=await observeInstallation({config:oldConfig,manifest:receipt.manifest,stackId:receipt.binding.stack_id,session:deployerSession});
    if(!same(observed.binding,receipt.binding))throw hostError('BINDING_MISMATCH');resolved={binding:observed.binding,control:previousProjection.control,client:deployerSession.operator.state,session:deployerSession,observed};
    phase='state_fence';let record=await controlUpdate(resolved,await appliedRecord(resolved),{schedule_enabled:false,writes_enabled:false,maintenance:true});lastApplied=record;phase='host_stop';const schedule=await quiesce(resolved,dependencies);
    const {synthesizeTemplate}=await import('./template.mjs');const template=synthesizeTemplate(desiredText,desiredManifest,{initial:false}),name='pigboard-controls-'+Date.now();phase='change_set';
    const cf=deployerSession.deployer.cloudformation,sdk=deployerSession.sdk;const created=await awsSend(cf,sdk,'CreateChangeSetCommand',{StackName:receipt.binding.stack_id,ChangeSetName:name,ChangeSetType:'UPDATE',TemplateBody:JSON.stringify(template),Parameters:[['AssetBucket',asset.bucket],['AssetKey',asset.key],['AssetVersion',asset.version],['QuiescenceConcurrency','0']].map(([ParameterKey,ParameterValue])=>({ParameterKey,ParameterValue})),Capabilities:['CAPABILITY_NAMED_IAM']});
    const changeId=created.Id;if(!changeId)throw hostError('CHANGE_UNCERTAIN');
    let change;for(let i=0;i<30;i++){change=await awsSend(cf,sdk,'DescribeChangeSetCommand',{StackName:receipt.binding.stack_id,ChangeSetName:changeId});if(change.Status!=='CREATE_PENDING'&&change.Status!=='CREATE_IN_PROGRESS')break;await (dependencies.wait??(ms=>new Promise(r=>setTimeout(r,ms))))(1000);}
    const allowed={Function:new Set(['Code','Environment','Timeout','ReservedConcurrentExecutions']),Schedule:new Set(['State','ScheduleExpression']),LogGroup:new Set(['RetentionInDays'])};
    if(change.Status!=='CREATE_COMPLETE'||change.NextToken||!Array.isArray(change.Changes)||change.Changes.some(c=>{const r=c.ResourceChange;return !r||r.Action!=='Modify'||r.Replacement!=='False'||!allowed[r.LogicalResourceId]||!r.Details?.length||r.Details.some(d=>d.Target?.Attribute!=='Properties'||!allowed[r.LogicalResourceId].has(d.Target.Name));}))throw hostError('UNSUPPORTED_CHANGE');
    phase='apply';await awsSend(cf,sdk,'ExecuteChangeSetCommand',{StackName:receipt.binding.stack_id,ChangeSetName:changeId});let stack;for(let i=0;i<120;i++){stack=(await awsSend(cf,sdk,'DescribeStacksCommand',{StackName:receipt.binding.stack_id})).Stacks?.[0];if(stack?.StackStatus!=='UPDATE_IN_PROGRESS'&&stack?.StackStatus!=='UPDATE_COMPLETE_CLEANUP_IN_PROGRESS')break;await (dependencies.wait??(ms=>new Promise(r=>setTimeout(r,ms))))(1000);}if(stack?.StackStatus!=='UPDATE_COMPLETE')throw hostError('DEPLOYMENT_UNCERTAIN');
    phase='observe';const after=await observeInstallation({config:next,manifest:desiredManifest,stackId:receipt.binding.stack_id,session:deployerSession});lastObserved=after;if(after.concurrency!==0||after.schedule.State!=='DISABLED'||after.binding.table_arn!==receipt.original.table_arn)throw hostError('BINDING_MISMATCH');
    phase='restore_preview';await awsSend(deployerSession.operator.lambda,sdk,'PutFunctionConcurrencyCommand',{FunctionName:after.names.function_name,ReservedConcurrentExecutions:1});await awsSend(deployerSession.operator.scheduler,sdk,'UpdateScheduleCommand',{...schedule,ScheduleExpression:`rate(${next.manager.schedule_minutes} minutes)`,State:desired.control.schedule_enabled?'ENABLED':'DISABLED'});
    const concurrency=await awsSend(deployerSession.operator.lambda,sdk,'GetFunctionConcurrencyCommand',{FunctionName:after.names.function_name}),scheduled=await awsSend(deployerSession.operator.scheduler,sdk,'GetScheduleCommand',{Name:after.names.schedule_name});if(concurrency.ReservedConcurrentExecutions!==1||scheduled.State!==(desired.control.schedule_enabled?'ENABLED':'DISABLED'))throw hostError('HOST_UNCONFIRMED');
    lastObserved={...after,concurrency:concurrency.ReservedConcurrentExecutions,schedule:scheduled};
    phase='commit_controls';record=await controlUpdate(resolved,record,{...desired.control,package_revision:desiredManifest.source_revision});return {status:'configured',phase,applied:record,desired:desired.control,receipt:{...receipt,binding:after.binding,manifest:desiredManifest,observed_at:new Date().toISOString()}};
  }catch(error){return {status:resolved?'partial':'unavailable',phase,code:error.code??'CONTROL_UNCERTAIN',...(resolved?{recovery_receipt:originalReceipt,recovery_receipt_role:'original recovery authority; not a successful new package receipt',desired:desiredProjection.control,applied:lastApplied??null,applied_confirmation:'last confirmed; final commit may be uncertain',recovery_metadata:recoveryMetadata({...resolved,receipt:originalReceipt,projection:desiredProjection,observed:lastObserved??resolved.observed},lastApplied)}:{}),recovery:'Preserve this result and original receipt. Inspect with --recovery and stop the same installation; do not repeat configure or reconstruct a receipt.'};}finally{deployerSession?.dispose();}
}
