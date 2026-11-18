import {performance} from 'node:perf_hooks';
import {resolveInstallation,observeInstallation,deriveHostControls,awsSend,hostError} from './installation.mjs';
import {createDynamoState} from './dynamodb.mjs';
import {SUMMARY_SCHEMA,METRICS,validScanSummary,evidenceRevision,healthSettings,evaluateHealth} from '../manager/health.mjs';

export function embeddedMetricEvent(summary){
 const event={summary};if(!validScanSummary(summary)||!summary.evidence_revision||!summary.installation_id)return event;
 const values={AttemptPresence:1,DurationMilliseconds:summary.elapsed_ms,...(summary.result==='complete'?{CompletePresence:1}:{FailurePresence:1}),...(summary.maximum_budget_utilization!==null?{MaximumBudgetUtilization:summary.maximum_budget_utilization}:{})};
 const units={DurationMilliseconds:'Milliseconds',MaximumBudgetUtilization:'Percent'};
 return {...event,_aws:{Timestamp:Date.parse(summary.ended_at),CloudWatchMetrics:[{Namespace:'Pigboard/Manager',Dimensions:[['InstallationId','EvidenceRevision']],Metrics:Object.keys(values).map(Name=>({Name,Unit:units[Name]??'Count'}))}]},InstallationId:summary.installation_id,EvidenceRevision:summary.evidence_revision,...values};
}
const tuple=(observed,record)=>JSON.stringify({binding:observed.binding,names:observed.names,package_hash:observed.function.Environment?.Variables,code_state:observed.function.State,code_update:observed.function.LastUpdateStatus,timeout:observed.function.Timeout,concurrency:observed.concurrency,schedule:observed.schedule,table:observed.table,record});
function links(resolved){const {region}=resolved.binding,n=resolved.observed.names,base=`https://${region}.console.aws.amazon.com`;return {logs:`${base}/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${encodeURIComponent(n.log_group)}`,metrics:`${base}/cloudwatch/home?region=${region}#metricsV2:namespace=Pigboard%2FManager`,function:`${base}/lambda/home?region=${region}#/functions/${encodeURIComponent(n.function_name)}`,schedule:`${base}/scheduler/home?region=${region}#schedules/default/${encodeURIComponent(n.schedule_name)}`};}
export async function readManagerHealth(input,dependencies={}){
 const {now=()=>new Date().toISOString(),resolve=resolveInstallation,...hostDependencies}=dependencies;
 let resolved,state;const started=performance.now(),deadline=started+30000,observedAt=now();let observation={now:observedAt,reads_complete:false,binding_coherent:false,events:[],omissions:[]};
 const remaining=()=>{const n=deadline-performance.now();if(n<=0)throw hostError('HEALTH_DEADLINE');return Math.min(10000,n);};
 try{
  resolved=await resolve({...input,purpose:'inspect'},{...hostDependencies,health:true,deadline});
  remaining();const appliedProjection=deriveHostControls(JSON.stringify(resolved.receipt.manifest.canonical_config),{package_revision:resolved.receipt.manifest.source_revision});
  const guardedClient={send:(command)=>{const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),remaining());return resolved.client.send(command,{abortSignal:abort.signal}).finally(()=>clearTimeout(timer));}};
  state=createDynamoState({binding:resolved.observed.binding,control:appliedProjection.control,client:guardedClient});
  const inspect=async()=>{remaining();const r=await state.inspect({kind:'installation',record_id:resolved.binding.installation_id});if(r.status!=='confirmed'||r.data.records.length!==1)throw hostError('STATE_UNAVAILABLE');return r.data.records[0];};
  const record=await inspect(),before=tuple(resolved.observed,record),current={mode:appliedProjection.mode,installation_id:resolved.binding.installation_id,package_revision:resolved.observed.binding.package_revision,configuration_digest:resolved.observed.binding.configuration_digest,health_generation:record.extensions.health_generation??null,health_enabled_at:record.extensions.health_enabled_at??null};
  const settings=healthSettings(resolved.config),end=Date.parse(observedAt),lookback=Math.min(resolved.config.manager.log_retention_days*86400000,Math.max(86400000,settings.freshness_seconds*2000)),start=end-lookback;
  observation={...observation,current,settings,desired_enabled:resolved.control.schedule_enabled,observed_enabled:resolved.observed.schedule.State==='ENABLED'?true:resolved.observed.schedule.State==='DISABLED'?false:null,applied_controls:{schedule_enabled:record.schedule_enabled,writes_enabled:record.writes_enabled,maintenance:record.maintenance,revision:record.revision},binding_coherent:record.configuration_digest===current.configuration_digest&&record.package_revision===current.package_revision&&resolved.projection.configuration_digest===current.configuration_digest,coverage:{start:new Date(start).toISOString(),end:observedAt,pages:0,fetched_events:0,decoded_bytes:0,complete:false,last_complete_absence:'within_query_window_only'},links:links(resolved)};
  const {session}=resolved,events=[],tokens=new Set();let token;
  do{
   if(observation.coverage.pages>=10)throw hostError('TELEMETRY_LIMIT');
   const r=await awsSend(session.operator.logs,session.sdk,'FilterLogEventsCommand',{logGroupName:resolved.observed.names.log_group,startTime:start,endTime:end,filterPattern:'{ $.summary.schema = "'+SUMMARY_SCHEMA+'" }',limit:1000,...(token?{nextToken:token}:{})},remaining());
   observation.coverage.pages++;
   if(!Array.isArray(r.events??[])||r.nextToken!==undefined&&(typeof r.nextToken!=='string'||!r.nextToken.length))throw hostError('INVALID_TELEMETRY');
   for(const event of r.events??[]){observation.coverage.fetched_events++;if(typeof event.message!=='string')throw hostError('INVALID_TELEMETRY');observation.coverage.decoded_bytes+=Buffer.byteLength(event.message);if(observation.coverage.fetched_events>1000||observation.coverage.decoded_bytes>1048576)throw hostError('TELEMETRY_LIMIT');let parsed;try{parsed=JSON.parse(event.message);}catch{throw hostError('INVALID_TELEMETRY');}if(!validScanSummary(parsed.summary)||!Number.isFinite(event.timestamp)||event.timestamp<start||event.timestamp>end)throw hostError('INVALID_TELEMETRY');events.push({summary:parsed.summary,timestamp:event.timestamp});observation.events=events;}
   token=r.nextToken;if(token){if(tokens.has(token))throw hostError('INVALID_TELEMETRY');tokens.add(token);}
  }while(token);
  observation.events=events;observation.coverage.complete=true;
  const evidence=evidenceRevision(current),metrics={},metricEvidence={status:evidence?'observed':'not_applicable',reason:evidence?null:'No retained enablement epoch; no metric dimension is invented.',statistics:'Maximum',metrics:{}};
  if(evidence){
   const period=Math.max(60,Math.ceil(((end-start)/1000+60)/1440/60)*60);
   for(const name of METRICS){const r=await awsSend(session.operator.metrics,session.sdk,'GetMetricStatisticsCommand',{Namespace:'Pigboard/Manager',MetricName:name,Dimensions:[{Name:'InstallationId',Value:current.installation_id},{Name:'EvidenceRevision',Value:evidence}],StartTime:new Date(start),EndTime:new Date(end),Period:period,Statistics:['Maximum']},remaining());
    if(!Array.isArray(r.Datapoints??[])||(r.Datapoints??[]).length>1440||r.Label!==undefined&&r.Label!==name)throw hostError('INVALID_TELEMETRY');const points=(r.Datapoints??[]).map(p=>({timestamp:p.Timestamp instanceof Date?p.Timestamp.getTime():NaN,maximum:p.Maximum}));if(points.some(p=>!Number.isFinite(p.timestamp)||p.timestamp<Math.floor(start/60000)*60000||p.timestamp>=end||!Number.isFinite(p.maximum)||p.maximum<0||name.endsWith('Presence')&&p.maximum>1))throw hostError('INVALID_TELEMETRY');points.sort((a,b)=>a.timestamp-b.timestamp);metrics[name]=points.length?Math.max(...points.map(p=>p.maximum)):null;metricEvidence.metrics[name]={maximum:metrics[name],points:points.length,latest_at:points.length?new Date(points.at(-1).timestamp).toISOString():null};observation.metrics=metrics;observation.metric_evidence=metricEvidence;
   }
   // A complete summary can precede EMF ingestion; absence is uncertainty, never a fabricated point.
   observation.metrics=metrics;observation.metric_evidence=metricEvidence;
   const bound=events.filter(e=>e.summary.mode===current.mode&&e.summary.installation_id===current.installation_id&&e.summary.health_enabled_at===current.health_enabled_at&&e.summary.evidence_revision===evidence),expected=new Set(bound.flatMap(e=>Object.keys(embeddedMetricEvent(e.summary)).filter(k=>METRICS.includes(k))));
   if([...expected].some(name=>metrics[name]===null)){observation.omissions.push('Current complete summary has no completion metric yet; allow ingestion and inspect again.');throw hostError('METRIC_EVIDENCE_MISSING');}
  }
  observation.metrics=metrics;observation.metric_evidence=metricEvidence;
  const afterHost=await observeInstallation({config:resolved.receipt.manifest.canonical_config,manifest:resolved.receipt.manifest,stackId:resolved.observed.binding.stack_id,session}),afterRecord=await inspect();observation.changed=before!==tuple(afterHost,afterRecord);remaining();observation.reads_complete=true;
 }catch(error){observation.reads_complete=false;observation.omissions.push(['HEALTH_DEADLINE','STATE_UNAVAILABLE','TELEMETRY_LIMIT','INVALID_TELEMETRY','METRIC_EVIDENCE_MISSING'].includes(error.code)?error.code:'Required installation or telemetry observation unavailable; check selected profile access.');}
 finally{state?.close();resolved?.dispose();}
 return evaluateHealth(observation);
}
