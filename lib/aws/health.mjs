import {performance} from 'node:perf_hooks';
import canonicalize from 'canonicalize';
import {resolveInstallation,observeInstallation,deriveHostControls,awsSend,hostError,readLifecycleState,alarmPackageMatches,verifyAlarmInventory} from './installation.mjs';
import {alarmDescriptors,alarmDefinitions,hasAlarmCapability,readAlarms} from './alarms.mjs';
import {createDynamoState} from './dynamodb.mjs';
import {SUMMARY_SCHEMA,METRICS,validScanSummary,evidenceRevision,healthSettings,evaluateHealth} from '../manager/health.mjs';

export function embeddedMetricEvent(summary){
 const event={summary};if(!validScanSummary(summary)||!summary.evidence_revision||!summary.installation_id)return event;
 const values={AttemptPresence:1,DurationMilliseconds:summary.elapsed_ms,...(summary.result==='complete'?{CompletePresence:1}:{FailurePresence:1}),...(summary.maximum_budget_utilization!==null?{MaximumBudgetUtilization:summary.maximum_budget_utilization}:{})};
 const units={DurationMilliseconds:'Milliseconds',MaximumBudgetUtilization:'Percent'};
 return {...event,_aws:{Timestamp:Date.parse(summary.ended_at),CloudWatchMetrics:[{Namespace:'Pigboard/Manager',Dimensions:[['InstallationId','EvidenceRevision']],Metrics:Object.keys(values).map(Name=>({Name,Unit:units[Name]??'Count'}))}]},InstallationId:summary.installation_id,EvidenceRevision:summary.evidence_revision,...values};
}
function tuple(observed,state){
 const resources=observed.resources?.map(({StackId,LogicalResourceId,PhysicalResourceId,ResourceType})=>
  [StackId,LogicalResourceId,PhysicalResourceId,ResourceType].map(value=>value??null));
 return canonicalize({
  binding:observed.binding,names:observed.names,code_hash:observed.code_hash,
  package_hash:observed.function.Environment?.Variables,code_state:observed.function.State,
  code_update:observed.function.LastUpdateStatus,timeout:observed.function.Timeout,
  concurrency:observed.concurrency,schedule:observed.schedule,table:observed.table,
  stack_status:observed.stack?.StackStatus,
  stack_parameters:observed.stack?.Parameters?.toSorted((a,b)=>a.ParameterKey.localeCompare(b.ParameterKey)),
  resources:resources?.toSorted((a,b)=>canonicalize(a).localeCompare(canonicalize(b))),
  outputs:observed.outputs,state
 });
}
function links(resolved){const {region}=resolved.binding,n=resolved.observed.names,base=`https://${region}.console.aws.amazon.com`;return {logs:`${base}/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${encodeURIComponent(n.log_group)}`,metrics:`${base}/cloudwatch/home?region=${region}#metricsV2:namespace=Pigboard%2FManager`,function:`${base}/lambda/home?region=${region}#/functions/${encodeURIComponent(n.function_name)}`,schedule:`${base}/scheduler/home?region=${region}#schedules/default/${encodeURIComponent(n.schedule_name)}`};}

function alarmIntent(receipt,snapshot){
 const control=snapshot?.lifecycle;
 if(!control)return {code:'ALARM_INTENT_UNAVAILABLE'};
 const commitment=control.current_alarm_package;
 const matches=alarmPackageMatches(receipt.manifest,commitment);
 if(control.owner){
  const {id,kind,phase}=control.owner;
  return {code:'LIFECYCLE_OPERATION_PENDING',pendingOperation:{id,kind,phase},previousIntent:matches?commitment.intent:null};
 }
 if(!matches)return {code:'ALARM_PACKAGE_UNVERIFIED'};
 const intent=commitment.intent;
 const maintenanceReason={scheduled:null,'manual-writes-only':'MANUAL_WRITES_ONLY',disabled:'CONFIGURED_DISABLED','upgrade-maintenance':'UPGRADE_MAINTENANCE'}[intent];
 return {intent,maintenanceReason};
}

function retainedEpoch(record){
 return {health_generation:record?.extensions.health_generation??null,health_enabled_at:record?.extensions.health_enabled_at??null};
}

async function observeHealthAlarms(resolved,snapshot,observation,current,remaining,now){
 const {receipt,observed,session:{operator,sdk}}=resolved;
 const config=receipt.manifest.canonical_config;
 const {account_id,region}=config.manager.aws;
 const owner={function_name:observed.names.function_name,account_id,region};
 const descriptors=alarmDescriptors(owner);
 const {intent,maintenanceReason,code,pendingOperation,previousIntent}=alarmIntent(receipt,snapshot);
 const record=snapshot?.installation;
 const retained=retainedEpoch(record);
 const enabled=intent===undefined?null:intent==='scheduled';
 const evidence=enabled&&evidenceRevision({...current,...retained});
 const enabledAt=Date.parse(retained.health_enabled_at);
 const epoch=evidence&&Number.isFinite(enabledAt)&&new Date(enabledAt).toISOString()===retained.health_enabled_at&&enabledAt<=Date.parse(observation.now)?retained:null;
 observation.desired_enabled=enabled;
 Object.assign(current,epoch??retainedEpoch());
 if(intent){
  const manual=intent==='manual-writes-only';
  const writes=manual||enabled&&config.manager.controls.writes_enabled;
  const concurrency=enabled||manual?1:0;
  observation.control_mismatch=record.schedule_enabled!==enabled||record.writes_enabled!==writes||
   ((enabled||manual)&&record.maintenance)||(intent==='upgrade-maintenance'&&!record.maintenance)||
   observed.concurrency!==concurrency||observed.schedule.ScheduleExpression!==`rate(${config.manager.schedule_minutes} minutes)`;
 }
 const definitionCode=code??(enabled&&!epoch?'EVIDENCE_UNAVAILABLE':null);
 const expected=definitionCode?null:alarmDefinitions({config,...owner,...current,epoch,actions_enabled:enabled});
 let inventoryCode=null;
 try{verifyAlarmInventory(receipt.manifest,observed);}catch(error){inventoryCode=error.code==='ALARM_OWNERSHIP_UNCONFIRMED'?error.code:'ALARM_INVENTORY_UNAVAILABLE';}
 const startedAt=now();
 const read=await readAlarms({
  descriptors,expected,now,
  describe:input=>awsSend(operator.metrics,sdk,'DescribeAlarmsCommand',input,remaining())
 });
 const inventoryUnknown=inventoryCode==='ALARM_INVENTORY_UNAVAILABLE';
 const unknown=definitionCode||inventoryUnknown||read.status==='unknown';
 const status=unknown?'unknown':inventoryCode||read.status==='mismatch'?'mismatch':'aligned';
 const dormant=enabled===false&&inventoryCode===null;
 observation.alarm_evidence={
  status,code:definitionCode??(read.status==='unknown'?read.code:null)??inventoryCode??(read.status==='mismatch'?read.code:null),
  inventory_code:inventoryCode,read_status:read.status,read_code:read.code??null,intent:intent??null,
  pending_operation:pendingOperation??null,previous_intent:previousIntent??null,
  maintenance_reason:maintenanceReason??null,stack_id:observed.binding.stack_id,function_name:owner.function_name,
  installation_generation:observed.binding.installation_generation,region,concurrency:observed.concurrency,
  observed_from:startedAt,observed_to:now(),observed_at:read.observed_at,delivery:'console_only',
  current:{...(epoch??retainedEpoch()),evidence_revision:epoch?evidence:null},
  retained_epoch:!epoch&&(retained.health_generation||retained.health_enabled_at)?{...retained,evidence_revision:null,attribution:'unknown'}:null,
  alarms:read.alarms.map(alarm=>({
   ...alarm,evaluation:dormant&&alarm.custom&&alarm.status==='aligned'?'dormant':'unverified'
  }))
 };
}
export async function readManagerHealth(input,dependencies={}){
 const {now=()=>new Date().toISOString(),resolve=resolveInstallation,...hostDependencies}=dependencies;
 let resolved,state,verifyUnchanged;
 const deadline=performance.now()+30000,observedAt=now();
 let observation={now:observedAt,reads_complete:false,binding_coherent:false,events:[],omissions:[]};
 const remaining=()=>{const n=deadline-performance.now();if(n<=0)throw hostError('HEALTH_DEADLINE');return Math.min(10000,n);};
 try{
  resolved=await resolve({...input,purpose:'inspect'},{...hostDependencies,health:true,deadline,requireVerifiedOperatorIdentity:true});
  remaining();
  const {receipt,session,observed}=resolved,manifest=receipt.manifest,capable=hasAlarmCapability(manifest);
  const appliedProjection=deriveHostControls(JSON.stringify(manifest.canonical_config),{package_revision:manifest.source_revision});
  const guardedClient={send:(command)=>{const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),remaining());return resolved.client.send(command,{abortSignal:abort.signal}).finally(()=>clearTimeout(timer));}};
  const boundSession={...session,operator:{...session.operator,state:guardedClient}};
  if(!capable)state=createDynamoState({binding:observed.binding,control:appliedProjection.control,client:guardedClient});
  const inspect=async()=>{
   remaining();
   if(capable)return readLifecycleState(receipt,boundSession);
   const r=await state.inspect({kind:'installation',record_id:resolved.binding.installation_id});
   if(r.status!=='confirmed'||r.data.records.length!==1)throw hostError('STATE_UNAVAILABLE');
   return {installation:r.data.records[0]};
  };
  let snapshot=null;
  try{snapshot=await inspect();}catch(error){if(!capable)throw error;observation.omissions.push('STATE_UNAVAILABLE');}
  const record=snapshot?.installation;
  const before=tuple(observed,snapshot);
  verifyUnchanged=async()=>{
   const afterHost=await observeInstallation({config:manifest.canonical_config,manifest,stackId:observed.binding.stack_id,session},{alarmInventory:false});
   const after=await inspect();
   observation.changed=before!==tuple(afterHost,after);
   remaining();
   if(observation.alarm_evidence)observation.alarm_evidence.stable_host_and_state=!observation.changed;
  };
  const current={mode:appliedProjection.mode,installation_id:resolved.binding.installation_id,package_revision:observed.binding.package_revision,configuration_digest:observed.binding.configuration_digest,...retainedEpoch(capable?null:record)};
  const settingsConfig=capable?manifest.canonical_config:resolved.config;
  const settings=healthSettings(settingsConfig),end=Date.parse(observedAt),lookback=Math.min(settingsConfig.manager.log_retention_days*86400000,Math.max(86400000,settings.freshness_seconds*2000)),start=end-lookback;
  observation={...observation,current,settings,requested_enabled:resolved.control.schedule_enabled,desired_enabled:capable?null:resolved.control.schedule_enabled,observed_enabled:observed.schedule.State==='ENABLED'?true:observed.schedule.State==='DISABLED'?false:null,applied_controls:record?{schedule_enabled:record.schedule_enabled,writes_enabled:record.writes_enabled,maintenance:record.maintenance,revision:record.revision}:null,binding_coherent:record?.configuration_digest===current.configuration_digest&&record.package_revision===current.package_revision&&resolved.projection.configuration_digest===current.configuration_digest,coverage:{start:new Date(start).toISOString(),end:observedAt,pages:0,fetched_events:0,decoded_bytes:0,complete:false,last_complete_absence:'within_query_window_only'},links:links(resolved)};
  if(capable)await observeHealthAlarms(resolved,snapshot,observation,current,remaining,now);
  else if(manifest.schema==='pigboard-manager-package/v2')verifyAlarmInventory(manifest,observed);
  const evidence=capable?(observation.binding_coherent?observation.alarm_evidence.current.evidence_revision:null):evidenceRevision(current);
  const metrics={},metricEvidence={
   status:evidence||capable&&observation.desired_enabled!==false?'unknown':'not_applicable',
   reason:evidence?'The five metric reads could not be confirmed.':capable?(observation.desired_enabled===false?'No scheduled alarm epoch is active.':'No verified current scheduled alarm epoch.'):'No retained enablement epoch; no metric dimension is invented.',
   statistics:'Maximum',metrics:{}
  };
  observation.metrics=metrics;observation.metric_evidence=metricEvidence;
  const events=[],tokens=new Set();let token;
  do{
   if(observation.coverage.pages>=10)throw hostError('TELEMETRY_LIMIT');
   const r=await awsSend(session.operator.logs,session.sdk,'FilterLogEventsCommand',{logGroupName:resolved.observed.names.log_group,startTime:start,endTime:end,filterPattern:'{ $.summary.schema = "'+SUMMARY_SCHEMA+'" }',limit:1000,...(token?{nextToken:token}:{})},remaining());
   observation.coverage.pages++;
   if(!Array.isArray(r.events??[])||r.nextToken!==undefined&&(typeof r.nextToken!=='string'||!r.nextToken.length))throw hostError('INVALID_TELEMETRY');
   for(const event of r.events??[]){observation.coverage.fetched_events++;if(typeof event.message!=='string')throw hostError('INVALID_TELEMETRY');observation.coverage.decoded_bytes+=Buffer.byteLength(event.message);if(observation.coverage.fetched_events>1000||observation.coverage.decoded_bytes>1048576)throw hostError('TELEMETRY_LIMIT');let parsed;try{parsed=JSON.parse(event.message);}catch{throw hostError('INVALID_TELEMETRY');}if(!validScanSummary(parsed.summary)||!Number.isFinite(event.timestamp)||event.timestamp<start||event.timestamp>end)throw hostError('INVALID_TELEMETRY');events.push({summary:parsed.summary,timestamp:event.timestamp});observation.events=events;}
   token=r.nextToken;if(token){if(tokens.has(token))throw hostError('INVALID_TELEMETRY');tokens.add(token);}
  }while(token);
  observation.events=events;observation.coverage.complete=true;
  if(evidence){
   const period=Math.max(60,Math.ceil(((end-start)/1000+60)/1440/60)*60);
   for(const name of METRICS){const r=await awsSend(session.operator.metrics,session.sdk,'GetMetricStatisticsCommand',{Namespace:'Pigboard/Manager',MetricName:name,Dimensions:[{Name:'InstallationId',Value:current.installation_id},{Name:'EvidenceRevision',Value:evidence}],StartTime:new Date(start),EndTime:new Date(end),Period:period,Statistics:['Maximum']},remaining());
    if(!Array.isArray(r.Datapoints??[])||(r.Datapoints??[]).length>1440||r.Label!==undefined&&r.Label!==name)throw hostError('INVALID_TELEMETRY');const points=(r.Datapoints??[]).map(p=>({timestamp:p.Timestamp instanceof Date?p.Timestamp.getTime():NaN,maximum:p.Maximum}));if(points.some(p=>!Number.isFinite(p.timestamp)||p.timestamp<Math.floor(start/60000)*60000||p.timestamp>=end||!Number.isFinite(p.maximum)||p.maximum<0||name.endsWith('Presence')&&p.maximum>1))throw hostError('INVALID_TELEMETRY');points.sort((a,b)=>a.timestamp-b.timestamp);metrics[name]=points.length?Math.max(...points.map(p=>p.maximum)):null;metricEvidence.metrics[name]={maximum:metrics[name],points:points.length,latest_at:points.length?new Date(points.at(-1).timestamp).toISOString():null};observation.metrics=metrics;observation.metric_evidence=metricEvidence;
   }
   metricEvidence.status='observed';metricEvidence.reason=null;
   // A complete summary can precede EMF ingestion; absence is uncertainty, never a fabricated point.
   observation.metrics=metrics;observation.metric_evidence=metricEvidence;
   const bound=events.filter(e=>e.summary.mode===current.mode&&e.summary.installation_id===current.installation_id&&e.summary.health_enabled_at===current.health_enabled_at&&e.summary.evidence_revision===evidence),expected=new Set(bound.flatMap(e=>Object.keys(embeddedMetricEvent(e.summary)).filter(k=>METRICS.includes(k))));
   if([...expected].some(name=>metrics[name]===null)){observation.omissions.push('Current complete summary has no completion metric yet; allow ingestion and inspect again.');throw hostError('METRIC_EVIDENCE_MISSING');}
  }
  observation.metrics=metrics;observation.metric_evidence=metricEvidence;
  observation.reads_complete=true;
 }catch(error){observation.reads_complete=false;observation.omissions.push(['HEALTH_DEADLINE','STATE_UNAVAILABLE','TELEMETRY_LIMIT','INVALID_TELEMETRY','METRIC_EVIDENCE_MISSING','ALARM_OWNERSHIP_UNCONFIRMED'].includes(error.code)?error.code:'Required installation or telemetry observation unavailable; check selected profile access.');}
 finally{
  try{if(verifyUnchanged)await verifyUnchanged();}
  catch(error){observation.reads_complete=false;observation.omissions.push(error.code==='HEALTH_DEADLINE'?'HEALTH_DEADLINE':'Could not verify the same host and State at the end of inspection.');}
  if(observation.alarm_evidence&&observation.alarm_evidence.stable_host_and_state!==true){
   observation.alarm_evidence.stable_host_and_state=false;
   observation.alarm_evidence.status='unknown';
   observation.alarm_evidence.code??='HOST_OR_STATE_CHANGED_OR_UNCONFIRMED';
  }
  state?.close();resolved?.dispose();
 }
 return evaluateHealth(observation);
}
