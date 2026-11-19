import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {buildScanSummary,validScanSummary,evaluateHealth,evidenceRevision} from '../lib/manager/health.mjs';
import {embeddedMetricEvent} from '../lib/aws/health.mjs';
import {alarmDefinitions} from '../lib/aws/alarms.mjs';
import {runPreview,handler,emitHealthRecord} from '../lib/aws/manager-lambda.mjs';
import {openHostSession,awsSend,loadHostSDK} from '../lib/aws/installation.mjs';
import {wrapperJourney,configureJourney,preparedCloud,ordinaryWireFixture,withJira,lifecycleBirthJourney,lifecycleDriver,hostFixture} from '../scripts/test-aws-manager.mjs';
import {runAlarmSignalHistories,readAlarmHealthFixture,scanFixture} from '../scripts/test-manager-health.mjs';
import {runStateCommand} from '../scripts/manager-state.mjs';
import {createDynamoState} from '../lib/aws/dynamodb.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/manager-health.json',import.meta.url))),now=Date.parse(fixture.now);
export const current={installation_id:'fixture',package_revision:'a'.repeat(40),configuration_digest:'sha256:'+'b'.repeat(64),health_generation:'epoch-1',health_enabled_at:fixture.enabled_at};
export function summary(overrides={}){return buildScanSummary({...current,scan_id:'scan-1',started_at:new Date(now-20000).toISOString(),ended_at:new Date(now-10000).toISOString(),mode:'preview',result:'complete',elapsed_ms:10,invocation_timeout_seconds:120,project_count:0,selected_count:0,held_count:0,counts_complete:true,counters:{requests_attempted:0,search_pages:0,comment_pages:0,epics:0,streams:0,known_issues:0,comments:0,response_bytes:0,observation_bytes:0,elapsed_ms:0},limits:{max_requests:100,max_pages:100,max_epics:100,max_streams:100,max_known_issues:100,max_comments:100,max_total_response_bytes:1000000,max_response_bytes:100000,request_timeout_ms:1000,scan_timeout_ms:10000,page_size:100},...overrides});}
export function observation(overrides={}){return {now:fixture.now,current,settings:{freshness_seconds:900,warning_percent:80},desired_enabled:true,observed_enabled:true,reads_complete:true,binding_coherent:true,events:[],...overrides};}
const event=s=>({summary:s,timestamp:Date.parse(s.ended_at)});
test('R1-22-H01 portable complete summaries preserve holds, budgets, optional peaks and fixed EMF dimensions',()=>{
 for(const held of [0,5,1]){const s=summary({held_count:held});assert(validScanSummary(s));assert.equal(s.result,'complete');assert.equal(s.counts.held,held);assert.equal(s.budgets.response_bytes.used,null);assert.equal(s.budgets.request_milliseconds.status,'not_observed');const emf=embeddedMetricEvent(s);assert.deepEqual(emf._aws.CloudWatchMetrics[0].Dimensions,[['InstallationId','EvidenceRevision']]);assert.equal(emf.CompletePresence,1);assert(!JSON.stringify(emf._aws).includes('stream'));}
 const s=summary({counters:{requests_attempted:80,search_pages:2,comment_pages:0,peak_response_bytes:50,peak_request_elapsed_ms:25}});assert.equal(s.maximum_budget_utilization,80);assert.equal(evaluateHealth(observation({events:[event(s)],metrics:{CompletePresence:1}})).state,'degraded');
});
test('R1-22-H02 exact ordered overlap and freshness cases retain secondary failure',()=>{
 for(const row of fixture.groups[1].overlaps){const enabledAt=new Date(now-(row.enablement_age??Math.max(600,(row.complete_age??0)+1))*1000).toISOString(),identity={...current,health_enabled_at:enabledAt},events=[];if(row.complete_age!==undefined)events.push(event(summary({...identity,scan_id:'complete',started_at:new Date(now-(row.complete_age+1)*1000).toISOString(),ended_at:new Date(now-row.complete_age*1000).toISOString()})));if(row.failure_age!==undefined)events.push(event(summary({...identity,scan_id:'failed',result:'failed',started_at:new Date(now-(row.failure_age+1)*1000).toISOString(),ended_at:new Date(now-row.failure_age*1000).toISOString(),reason_codes:['RUNTIME_UNAVAILABLE']})));const result=evaluateHealth(observation({current:identity,desired_enabled:row.enabled,observed_enabled:row.observed,reads_complete:row.reads_complete??true,events}));assert.equal(result.state,row.expected,row.name);assert.equal(result.exit_code,['healthy','disabled'].includes(row.expected)?0:['degraded','stale'].includes(row.expected)?1:2,row.name);if(row.failure_age!==undefined)assert(result.latest_failure);}
 const success=summary(),unbound=summary({scan_id:'unbound',health_generation:null,health_enabled_at:null,result:'incomplete',ended_at:fixture.now,reason_codes:['STATE_UNAVAILABLE']});assert.equal(evaluateHealth(observation({events:[event(success),event(unbound)]})).state,'unknown');
});
test('R1-22-H01 actual wrapper accumulates complete, incomplete and failed summaries without duplicate events',async()=>{
 const journeys=await wrapperJourney({retainedVariants:false});const actual=journeys[0].result;assert(validScanSummary(actual.summary));assert.equal(actual.summary.result,'complete');assert(actual.summary.budgets.response_bytes.used>0);assert(actual.summary.budgets.request_milliseconds.used>0);
 const f=await preparedCloud();try{for(const kind of ['incomplete','failed']){const logs=[];const result=await runPreview({operation:'preview'},{configText:JSON.stringify(f.config),manifest:f.manifest,environment:f.environment,createState:()=>({readInventory:async()=>{if(kind==='failed')throw Error('dummy-secret-provider-body');return {status:'incomplete',code:'UNAVAILABLE'};},close(){}}),log:record=>logs.push(record)});assert.equal(result.summary.result,kind);assert.equal(logs.length,1);assert(validScanSummary(result.summary));assert.equal(result.summary.budgets.response_bytes.used,null);assert(!JSON.stringify(logs).includes('dummy-secret'));assert.equal(logs[0].CompletePresence,undefined);}}
 finally{f.cleanup();}
});

test('R1-22-H03 actual configure epoch producer and all desired/observed combinations',async()=>{const {runHumanCase}=await import('../scripts/test-manager-health.mjs');await runHumanCase('R1-22-H03');});
test('R1-22-H04 selected-profile health reader, no-epoch disabled, denied reads and changed host',async()=>{const {runHumanCase}=await import('../scripts/test-manager-health.mjs');await runHumanCase('R1-22-H04');});
test('R1-22-H01 actual fixed metric reads use maximum duplicate points with scoped log traversal',async()=>{const {healthFixture,scanFixture}=await import('../scripts/test-manager-health.mjs'),{readManagerHealth}=await import('../lib/aws/health.mjs');const f=await healthFixture({epoch:true,events:identity=>[scanFixture(identity)],emptyPage:true});try{const result=await readManagerHealth(f.input,f.dependencies);assert.equal(result.state,'disabled',JSON.stringify(result));assert.equal(result.metric_evidence.metrics.CompletePresence.maximum,1);assert.equal(result.metric_evidence.metrics.CompletePresence.points,2);assert.equal(f.telemetry.filter(a=>a.action==='FilterLogEventsCommand').length,2);assert.equal(f.telemetry.filter(a=>a.action==='GetMetricStatisticsCommand').length,5);assert(f.telemetry.every(a=>a.identity==='SELECTED_OPERATOR'));}finally{f.cleanup();}});
test('R1-22-H01 finite actual empty, five-ticket wait and retained-uncertainty wrapper cases',async()=>{const {runHumanCase}=await import('../scripts/test-manager-health.mjs');await runHumanCase('R1-22-H01');});
test('invalid runtime events emit no fabricated scan summary',async()=>{const logs=[];const r=await runPreview({operation:'apply'},{log:record=>logs.push(record)});assert.equal(r.status,'invalid');assert.equal(r.summary,undefined);assert.deepEqual(logs,[]);});

test('health document client shares the absolute acquisition deadline',async t=>{
 const real=loadHostSDK(),config=JSON.parse(fs.readFileSync(new URL('./fixtures/aws-manager.json',import.meta.url))).config,rows=[];
 for(const route of ['sdk','injected']){
  const calls=[],credentials={accessKeyId:'AKIDEXAMPLE',secretAccessKey:'dummy-local-only',$source:{CREDENTIALS_PROFILE:'n'}},destroyed=[];let raw,session;
  const waitForAbort=(signal,action)=>new Promise((resolve,reject)=>{
   assert(signal);assert.equal(signal.aborted,false);assert.equal(action,'DescribeTableCommand');
   const call={action,signal_received:true,aborted:false,watchdog:false,network:false};calls.push(call);
   const finish=error=>{clearTimeout(watchdog);signal.removeEventListener('abort',abort);reject(error);};
   const abort=()=>{call.aborted=signal.aborted;finish(Object.assign(new Error('Local request aborted'),{name:'AbortError'}));};
   const watchdog=setTimeout(()=>{call.watchdog=true;finish(new Error('TEST_WATCHDOG'));},1500);
   signal.addEventListener('abort',abort,{once:true});
  });
  const requestHandler={handle:async(request,{abortSignal})=>{
   assert.equal(request.headers['x-amz-target'],'DynamoDB_20120810.DescribeTable');
   assert.deepEqual(JSON.parse(request.body),{TableName:'pigboard-deadline-fixture-state'});
   return waitForAbort(abortSignal,'DescribeTableCommand');
  },destroy:()=>destroyed.push('sdk-transport')};
  const account=config.manager.aws.account_id,role=config.manager.aws.operator_role_arn.split(':role/')[1];
  const identity={Account:account,Arn:`arn:aws:sts::${account}:assumed-role/${role}/fixture`,UserId:'AROAEXAMPLE:fixture'};
  const sdk={...real,fromIni:({profile})=>{assert.equal(profile,'operator');return async()=>credentials;},
   STSClient:class{constructor(options){assert.equal(options.maxAttempts,1);}async send(command,{abortSignal}){assert.equal(command.constructor.name,'GetCallerIdentityCommand');assert(abortSignal);return identity;}destroy(){destroyed.push('sts');}},
   DynamoDBClient:class extends real.DynamoDBClient{constructor(options){super({...options,requestHandler});raw=this;}}
  };
  const makeClient=route==='injected'?(kind,options)=>{
   assert.equal(options.maxAttempts,1);assert.deepEqual(options.credentials,credentials);assert(Object.isFrozen(options.credentials));
   const client={destroy:()=>destroyed.push(kind),send:async(command,{abortSignal})=>{
    if(kind==='STS'){assert.equal(command.constructor.name,'GetCallerIdentityCommand');return identity;}
    assert.equal(kind,'DynamoDBDocument');assert.deepEqual(command.input,{TableName:'pigboard-deadline-fixture-state'});
    return waitForAbort(abortSignal,command.constructor.name);
   }};if(kind==='DynamoDB')raw=client;return client;
  }:undefined;
  const deadline=performance.now()+250;
  try{
   session=await openHostSession(config,{operatorProfile:'operator',health:true,deadline,sdk,...(makeClient?{makeClient}:{})});
   assert.notEqual(session.operator.state,raw);if(route==='sdk')assert(session.operator.state instanceof real.DynamoDBDocumentClient);
   await assert.rejects(awsSend(session.operator.state,sdk,'DescribeTableCommand',{TableName:'pigboard-deadline-fixture-state'}),error=>error.name==='AbortError');
   assert.equal(calls.length,1);assert.equal(calls[0].aborted,true);assert.equal(calls[0].watchdog,false);
   await new Promise(resolve=>setTimeout(resolve,Math.max(0,deadline-performance.now())+5));
   await assert.rejects(awsSend(session.operator.state,sdk,'DescribeTableCommand',{TableName:'pigboard-deadline-fixture-state'}),error=>error.code==='HEALTH_DEADLINE');
   assert.equal(calls.length,1);assert(calls.every(call=>call.action==='DescribeTableCommand'));
  }finally{session?.dispose();}
  assert(destroyed.length>0);rows.push({route,calls,expired_send_dispatched:false,disposed:true});
 }
 t.diagnostic(JSON.stringify({document_deadline_rows:rows}));
});

test('production health emission is one raw JSON line consumable by the health reader',{concurrency:false},async t=>{
 const {healthFixture,scanFixture}=await import('../scripts/test-manager-health.mjs'),{readManagerHealth}=await import('../lib/aws/health.mjs');
 const unsafe='DUMMY_SECRET_BODY_PROVIDER_ERROR',makeSummary=(identity,result)=>scanFixture(identity,{scan_id:'framing-'+result,result,reason_codes:[unsafe],provider_body:unsafe});
 const f=await healthFixture({epoch:true,events:identity=>[makeSummary(identity,'complete')]});
 try{
  const summaries=['complete','incomplete','failed'].map(result=>makeSummary(f.identity,result)),records=summaries.map(embeddedMetricEvent),writes=[],original=process.stdout.write;let invalid;
  try{
   process.stdout.write=function(chunk,encoding,callback){writes.push(Buffer.isBuffer(chunk)?chunk.toString('utf8'):chunk);const done=typeof encoding==='function'?encoding:callback;done?.();return true;};
   for(const record of records)emitHealthRecord(record);
   const beforeInvalid=writes.length;invalid=await handler({operation:'apply',override:true});assert.equal(writes.length,beforeInvalid);
  }finally{process.stdout.write=original;}
  assert.equal(invalid.status,'invalid');assert.equal(invalid.summary,undefined);assert.equal(writes.length,3);
  for(let i=0;i<writes.length;i++){
   assert.equal(writes[i],JSON.stringify(records[i])+'\n');assert.equal(writes[i].split('\n').length,2);assert.deepEqual(JSON.parse(writes[i]),records[i]);assert(!writes[i].includes(unsafe));
   assert(validScanSummary(records[i].summary));assert.deepEqual(records[i]._aws.CloudWatchMetrics[0].Dimensions,[['InstallationId','EvidenceRevision']]);
   assert.equal(records[i].InstallationId,f.identity.installation_id);assert.equal(records[i].EvidenceRevision,evidenceRevision(f.identity));
  }
  const originalMake=f.dependencies.makeClient,returned=[],before=f.provider.snapshot(),auditStart=f.audit.length;
  const result=await readManagerHealth(f.input,{...f.dependencies,makeClient:(kind,options)=>{
   const client=originalMake(kind,options);if(kind!=='CloudWatchLogs')return client;
   const send=client.send.bind(client);client.send=async(command,options)=>{
    assert.equal(command.constructor.name,'FilterLogEventsCommand');assert.equal(command.input.filterPattern,'{ $.summary.schema = "pigboard-scan-summary/v1" }');
    const response=await send(command,options);assert.equal(response.events.length,1);response.events[0].message=writes[0];returned.push(response.events[0].message);return response;
   };return client;
  }});
  assert.deepEqual(returned,[writes[0]]);assert.equal(result.query_coverage.complete,true);assert.deepEqual(result.latest_complete,summaries[0]);
  assert.equal(result.state,'disabled');assert.equal(result.exit_code,0);assert.equal(f.provider.snapshot(),before);
  assert(f.audit.slice(auditStart).every(row=>row.action==='GetFunctionEventInvokeConfigCommand'||!row.action.match(/Write|Update|Put|Invoke|Execute/)));assert(f.telemetry.every(row=>row.identity==='SELECTED_OPERATOR'));
  t.diagnostic(JSON.stringify({production_lines:writes,invalid:{status:invalid.status,summary_absent:invalid.summary===undefined,emissions:0},reader:{state:result.state,exit_code:result.exit_code,coverage:result.query_coverage,latest_complete:result.latest_complete},actions:f.audit.slice(auditStart),telemetry:f.telemetry,state_unchanged:true}));
 }finally{f.cleanup();}
});

for(const id of fixture.apply_groups.map(g=>g.id))test(id+' prescribed apply completion group',async(t)=>{const {runApplyHealthCase}=await import('../scripts/test-manager-health.mjs');const result=await runApplyHealthCase(id);const directory=path.join(os.tmpdir(),'pgb178-evidence');fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,id+'.json'),JSON.stringify({local_result:'PASS',...result},null,2));t.diagnostic('Saved '+path.join(directory,id+'.json')+'; human acceptance NOT_RUN');});
test('apply closed summary rejects forged workload totals and absent-mode cannot admit apply',()=>{const s=summary({mode:'apply'});assert(validScanSummary(s));assert.equal(s.counts.jira_requests,null);const forged=structuredClone(s);forged.counts.jira_requests=0;assert(!validScanSummary(forged));assert.equal(evaluateHealth(observation({events:[event(s)]})).state,'starting');assert.equal(evaluateHealth(observation({current:{...current,mode:'invalid'}})).state,'unknown');});

test('R1-23-H01 and H02 generated definitions respect the controlled signal histories',()=>{
 const {config}=hostFixture(),epoch={health_generation:'alarm-fixture',health_enabled_at:'2026-11-17T10:00:00.000Z'};
 config.manager.schedule_minutes=5;
 config.manager.health={freshness_seconds:900,warning_percent:80};
 const definitions=alarmDefinitions({config,function_name:'pigboard-controlled-fixture',...current,epoch,actions_enabled:true});
 for(const group of Object.keys(fixture.alarm_histories.groups)){
  const result=runAlarmSignalHistories(definitions,{group});
  assert.equal(result.deadline,'2026-11-17T10:15:00.000Z');
  assert.equal(result.histories.length,fixture.alarm_histories.groups[group].length);
 }
});

test('R1-23-H01 and H02 health CLI distinguishes observed alarms, inactive metrics, and unexpected stop',async()=>{
 const {config}=hostFixture(),journey=await lifecycleBirthJourney({config});
 const {f}=journey,{initial,build,configure}=lifecycleDriver(journey);
 const getHealth=(installed,options={})=>readAlarmHealthFixture(f,{...installed,...options});
 const metricReads=e=>e.telemetry.filter(row=>row.action==='GetMetricStatisticsCommand');
 const alarmReads=e=>e.telemetry.filter(row=>row.action==='DescribeAlarmsCommand');
 const assertUnverified=(observed,prior)=>{
  const {human,json}=observed,outcome=json.outcome;
  assert.equal(json.exitCode,2);
  assert.deepEqual(human.outcome,outcome);
  assert.equal(outcome.state,'unknown');
  assert.equal(outcome.alarm_evidence.stable_host_and_state,false);
  assert.equal(outcome.alarm_evidence.status,'unknown');
  assert.equal(outcome.alarm_evidence.current.evidence_revision,null);
  assert.equal(outcome.alarm_evidence.intent,null);
  assert(Object.values(outcome.current).every(value=>value===null));
  assert.equal(outcome.latest_complete,null);
  assert.equal(outcome.latest_attempt,null);
  assert.equal(outcome.maximum_budget_utilization,null);
  assert.equal(outcome.desired_enabled,null);
  assert.equal(outcome.applied_controls,null);
  assert.deepEqual(outcome.metric_evidence.metrics,{});
  assert.deepEqual(outcome.reasons,['HOST_OR_STATE_CHANGED_OR_UNCONFIRMED']);
  assert.equal(outcome.prior_observation.attribution,'unverified');
  assert.deepEqual(outcome.prior_observation.binding,prior.current);
  assert.equal(outcome.alarm_evidence.observed_at,prior.alarm_evidence.observed_at);
  const alarms=outcome.alarm_evidence.alarms;
  assert.equal(alarms.length,4);
  assert(alarms.every(a=>a.status==='unknown'&&a.evaluation==='unverified'));
  const raw=alarms.find(a=>a.key==='missing_completion'),old=prior.alarm_evidence.alarms.find(a=>a.key===raw.key);
  assert.deepEqual(raw.actual,old.actual);
  assert.deepEqual(raw.expected,old.expected);
  assert.equal(raw.raw_state,'ALARM');
  assert.equal(raw.raw_state_updated_at,old.raw_state_updated_at);
  assert.match(human.stdout,/Current package, schedule, completion and budget — unverified/);
  assert.match(human.stdout,/raw state ALARM at .*current evaluation unverified/);
  assert.doesNotMatch(human.stdout,/definition aligned|current evaluation dormant|Latest complete:/);
  const lines=human.stdout.split('\n');
  const earlierHeader=`Earlier observations from ${outcome.prior_observation.observed_at} — current attribution unverified`;
  const earlierIndex=lines.indexOf(earlierHeader);
  assert(earlierIndex>=0);
  const {links}=JSON.parse(json.stdout);
  assert.deepEqual(Object.keys(links).sort(),['function','logs','metrics','schedule']);
  for(const [label,url] of Object.entries(links)){
   assert(url.startsWith('https://'));
   assert(lines.indexOf(`${label} — ${url}`)>earlierIndex,label);
  }
  for(const alarm of alarms)assert(lines.includes(alarm.link),alarm.key);
  return outcome.prior_observation;
 };
 try{
  const fresh=await getHealth(initial),outcome=fresh.json.outcome;
  assert.equal(outcome.state,'disabled');
  assert.equal(fresh.json.exitCode,0);
  assert.equal(outcome.alarm_evidence.status,'aligned');
  assert.equal(outcome.alarm_evidence.stable_host_and_state,true);
  assert.deepEqual(outcome.alarm_evidence.current,{health_generation:null,health_enabled_at:null,evidence_revision:null});
  assert.equal(outcome.metric_evidence.status,'not_applicable');
  assert.equal(outcome.maximum_budget_utilization,null);
  assert.equal(metricReads(fresh).length,0);
  const alarms=outcome.alarm_evidence.alarms;
  assert.equal(alarms.length,4);
  assert(alarms.every(a=>a.status==='aligned'&&a.actions_enabled===false));
  assert.deepEqual(alarms.filter(a=>a.evaluation==='dormant').map(a=>a.key),['missing_completion','measured_budget']);
  for(const alarm of alarms)assert(fresh.human.stdout.includes(alarm.link));
  for(const [label,url] of Object.entries(outcome.links))assert(fresh.human.stdout.split('\n').includes(`${label}: ${url}`));
  assert.equal(alarmReads(fresh).length,2);
  for(const request of alarmReads(fresh))assert.deepEqual(request.input,{AlarmNames:alarms.map(a=>a.name),AlarmTypes:['MetricAlarm']});
  const denied=await getHealth(initial,{denyAlarmRead:true});
  assert.equal(denied.json.exitCode,2);
  assert.equal(denied.json.outcome.alarm_evidence.read_code,'ALARM_READ_DENIED');
  assert(denied.json.outcome.alarm_evidence.alarms.every(a=>a.actual===null&&a.actions_enabled===null));
  for(const alarm of denied.json.outcome.alarm_evidence.alarms){
   assert.deepEqual(alarm.expected_actions,{AlarmActions:[],OKActions:[],InsufficientDataActions:[]});
   assert.deepEqual(alarm.observed_actions,{AlarmActions:null,OKActions:null,InsufficientDataActions:null});
  }
  assert.match(denied.human.stdout,/ALARM destinations — expected \[\], observed unknown/);
  const afterLogDenial=await getHealth(initial,{denyLogs:true});
  assert.equal(afterLogDenial.json.exitCode,2);
  assert.equal(afterLogDenial.json.outcome.alarm_evidence.status,'aligned');
  assert.equal(afterLogDenial.json.outcome.alarm_evidence.alarms.length,4);

  const completion=alarms.find(a=>a.key==='missing_completion');
  const definition=f.cloud.alarms.get(completion.name);
  definition.Threshold=2;
  const mismatch=await getHealth(initial);
  assert.equal(mismatch.json.exitCode,1);
  assert(mismatch.json.outcome.reasons.includes('ALARM_DEFINITION_MISMATCH'));
  const observed=mismatch.json.outcome.alarm_evidence.alarms.find(a=>a.key==='missing_completion');
  assert.equal(observed.expected.Threshold,1);
  assert.equal(observed.actual.Threshold,2);
  definition.Threshold=1;
  f.cloud.omitStackAlarm=completion.logical_id;
  const ownership=await getHealth(initial);
  assert.equal(ownership.json.exitCode,1);
  assert.equal(ownership.json.outcome.alarm_evidence.inventory_code,'ALARM_OWNERSHIP_UNCONFIRMED');
  assert.equal(ownership.json.outcome.alarm_evidence.read_status,'aligned');
  delete f.cloud.omitStackAlarm;
  definition.StateValue='ALARM';
  definition.StateUpdatedTimestamp=new Date('2026-11-17T09:59:00.000Z');

  const enabledConfig=structuredClone(config);
  enabledConfig.manager.controls.schedule_enabled=true;
  const enabled=await configure(initial,build('health-enabled',enabledConfig),'health-enabled-receipt');
  const starting=await getHealth(enabled);
  assert.equal(starting.json.outcome.state,'starting',starting.json.stdout);
  assert.equal(starting.json.outcome.alarm_evidence.status,'aligned');
  const enabledCompletion=starting.json.outcome.alarm_evidence.alarms.find(a=>a.key==='missing_completion');
  assert.equal(enabledCompletion.raw_state,'ALARM');
  assert.equal(enabledCompletion.evaluation,'unverified');
  assert.match(starting.human.stdout,/raw state ALARM.*current evaluation unverified/);
  assert.equal(metricReads(starting).length,10);
  assert.equal(starting.json.outcome.maximum_budget_utilization,null);

  const prior=starting.json.outcome.current,epoch=Date.parse(prior.health_enabled_at),finished=epoch+30000;
  const measuredScan=scanFixture(prior,{started_at:prior.health_enabled_at,ended_at:new Date(finished).toISOString(),
   counters:{requests_attempted:81}});
  const measuredInput={events:[measuredScan],now:new Date(epoch+120000).toISOString()};
  const measured=await getHealth(enabled,measuredInput);
  assert.equal(measured.json.outcome.state,'degraded');
  assert(measured.json.outcome.reasons.includes('CAPACITY_WARNING'));
  assert.equal(measured.json.outcome.maximum_budget_utilization,81);
  const closingDenied=await getHealth(enabled,{...measuredInput,denyClosingHost:true});
  const captured=assertUnverified(closingDenied,measured.json.outcome);
  assert.deepEqual(captured.latest_complete,measuredScan);
  assert.equal(captured.maximum_budget_utilization,81);
  assert.equal(captured.metric_evidence.metrics.MaximumBudgetUtilization.latest_at,new Date(epoch+60000).toISOString());
  assert.match(closingDenied.human.stdout,/Observed maximum budget use — 81.0% \(latest metric point at /);

  f.cloud.schedule.State='DISABLED';
  const unexpected=await getHealth(enabled);
  assert.equal(unexpected.json.exitCode,1);
  assert(unexpected.json.outcome.reasons.includes('SCHEDULE_MISMATCH'));
  assert.equal(unexpected.json.outcome.desired_enabled,true);
  assert.equal(unexpected.json.outcome.observed_enabled,false);
  assert(unexpected.json.outcome.alarm_evidence.alarms.every(a=>a.actions_enabled===true));
  f.cloud.schedule.State='ENABLED';

  const stopped=await configure(enabled,build('health-disabled',config),'health-disabled-receipt');
  const historical=measuredScan;
  const dormantInput={events:[historical],now:new Date(Math.max(finished+1,Date.parse(f.dependencies.now()))).toISOString()};
  const dormant=await getHealth(stopped,dormantInput);
  assert.equal(dormant.json.outcome.state,'disabled',dormant.json.stdout);
  assert.equal(dormant.json.outcome.alarm_evidence.current.evidence_revision,null);
  assert.deepEqual(dormant.json.outcome.alarm_evidence.retained_epoch,{
   health_generation:prior.health_generation,health_enabled_at:prior.health_enabled_at,
   evidence_revision:null,attribution:'unknown'
  });
  assert.equal(dormant.json.outcome.current.health_generation,null);
  assert.equal(dormant.json.outcome.latest_complete,null);
  assert.equal(dormant.json.outcome.latest_historical_scan.evidence_revision,prior.evidence_revision);
  assert.equal(dormant.json.outcome.maximum_budget_utilization,null);
  assert.equal(metricReads(dormant).length,0);
  const closingChanged=await getHealth(stopped,{...dormantInput,changeState:true});
  const dormantCapture=assertUnverified(closingChanged,dormant.json.outcome);
  assert.deepEqual(dormantCapture.latest_historical_scan,historical);
  assert.equal(metricReads(closingChanged).length,0);
 }finally{journey.source.cleanup();}
});
