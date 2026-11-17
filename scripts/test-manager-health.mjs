#!/usr/bin/env node
// Only the four prescribed local simulated-provider groups. No cloud credentials or target overrides.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildScanSummary,evaluateHealth,evidenceRevision,validScanSummary,METRICS} from '../lib/manager/health.mjs';
import {readManagerHealth,embeddedMetricEvent} from '../lib/aws/health.mjs';
import {runHealthCommand} from './manager-health.mjs';
import {preparedCloud,hostFixture,wrapperJourney,configureJourney,ordinaryWireFixture,withJira} from './test-aws-manager.mjs';
import {runStateCommand} from './manager-state.mjs';
import {runPreview} from '../lib/aws/manager-lambda.mjs';
import {createDynamoState} from '../lib/aws/dynamodb.mjs';
import {configureInstallation,stopInstallation,hostConfig,sha256} from '../lib/aws/installation.mjs';
import {synthesizeTemplate} from '../lib/aws/template.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export const packet=()=>JSON.parse(fs.readFileSync(new URL('../test/fixtures/manager-health.json',import.meta.url)));
export function scanFixture(identity,overrides={}){const now=Date.parse(packet().now);return buildScanSummary({...identity,scan_id:'fixture-scan',started_at:new Date(now-20000).toISOString(),ended_at:new Date(now-10000).toISOString(),mode:'preview',result:'complete',elapsed_ms:20,invocation_timeout_seconds:120,project_count:0,selected_count:0,held_count:0,counts_complete:true,counters:{requests_attempted:1,search_pages:1,comment_pages:0,epics:0,streams:0,known_issues:0,comments:0,response_bytes:50,observation_bytes:50,peak_response_bytes:50,peak_request_elapsed_ms:5,elapsed_ms:20},limits:{max_requests:100,max_pages:100,max_epics:100,max_streams:100,max_known_issues:100,max_comments:100,max_total_response_bytes:1000000,max_response_bytes:100000,request_timeout_ms:1000,scan_timeout_ms:10000,page_size:100},...overrides});}
export async function healthFixture({epoch=false,events=[],denied=false,change=false,emptyPage=false,pageSize=null,changeState=false}={}){
 const f=await preparedCloud();assert.equal((await runStateCommand(['init','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--json'],{resolveInstallation:f.resolve})).exitCode,0);
 return augment(f,{epoch,events,denied,change,emptyPage,pageSize,changeState});
}
function augment(f,options){
 const auditStart=f.audit.length;
 const record=f.provider.records()[0];if(options.epoch){record.extensions={...record.extensions,health_generation:'fixture-epoch',health_enabled_at:packet().enabled_at};f.provider.seed(record);}
 const identity=options.expectedIdentity??{installation_id:f.binding.installation_id,package_revision:f.binding.package_revision,configuration_digest:f.binding.configuration_digest,health_generation:record.extensions.health_generation??null,health_enabled_at:record.extensions.health_enabled_at??null},telemetry=[],events=typeof options.events==='function'?options.events(identity):options.events;
 let pages=0,eventOffset=0;
 const dependencies={...f.dependencies,now:()=>packet().now,makeClient:(kind,clientOptions)=>{
  if(!['CloudWatch','CloudWatchLogs'].includes(kind))return f.dependencies.makeClient(kind,clientOptions);
  return {destroy:()=>f.destroyed.push({kind,identity:clientOptions.credentials.accessKeyId}),send:async(command,sendOptions)=>{
   const action=command.constructor.name,input=command.input;telemetry.push({kind,identity:clientOptions.credentials.accessKeyId,action,input:structuredClone(input)});assert.equal(clientOptions.maxAttempts,1);assert(sendOptions.abortSignal);
   if(options.denied)throw Error('DUMMY_SECRET_BODY_PROVIDER_ERROR');
   if(action==='FilterLogEventsCommand'){assert.equal(input.logGroupName,f.cloud.function.Environment.Variables.PB_TABLE_NAME.replace(/-state$/,'').replace(/^/,'/aws/lambda/'));assert.equal(input.filterPattern,'{ $.summary.schema = "pigboard-scan-summary/v1" }');if(options.emptyPage&&pages++===0)return {events:[],nextToken:'fixture-next'};if(options.change)f.cloud.schedule.State='ENABLED';if(options.changeState){const record=f.provider.records()[0];record.revision++;f.provider.seed(record);}const slice=options.pageSize?events.slice(eventOffset,eventOffset+options.pageSize):events;eventOffset+=slice.length;return {events:slice.map(s=>({message:JSON.stringify(embeddedMetricEvent(s)),timestamp:Date.parse(s.ended_at)})),...(eventOffset<events.length?{nextToken:'page-'+eventOffset}:{})};}
   assert.equal(action,'GetMetricStatisticsCommand');assert.equal(input.Namespace,'Pigboard/Manager');assert.deepEqual(input.Statistics,['Maximum']);assert.deepEqual(input.Dimensions,[{Name:'InstallationId',Value:identity.installation_id},{Name:'EvidenceRevision',Value:evidenceRevision(identity)}]);const values=events.map(embeddedMetricEvent).map(e=>e[input.MetricName]).filter(v=>v!==undefined);return {Label:input.MetricName,Datapoints:values.flatMap(v=>[1,1].map(()=>({Timestamp:new Date(Date.parse(packet().now)-60000),Maximum:v})))};
  }};
 }};
 return {...f,identity,telemetry,auditStart,dependencies,input:{configPath:f.configPath,installationPath:f.installationPath,operatorProfile:'operator'}};
}
async function emptyWrapper(kind='empty'){const native=ordinaryWireFixture(),config=native.config,f=await preparedCloud(config);try{assert.equal((await runStateCommand(['init','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--json'],{resolveInstallation:f.resolve})).exitCode,0);let script=[{...native.script[0],body:{issues:[],isLast:true}}];
 if(kind==='cap'){
  const epic=structuredClone(native.script[1].body),ticket=native.script[5].body,tickets=[ticket,...Array.from({length:5},(_,i)=>{const row=structuredClone(ticket);row.id=String(1002+i);row.key='EX-'+(3+i);row.fields.status.id=config.defaults.stages['Human Review'];return row;})];const body=JSON.parse(epic.fields.description.content[0].content[0].text);body.workstreams[0].story_order=tickets.map(t=>t.key);epic.fields.description.content[0].content[0].text=JSON.stringify(body);
  const read=i=>[{path:'/rest/api/3/issue/'+i.id+'?fields=project,issuetype,status,parent,labels,description',status:200,body:i},{path:'/rest/api/3/issue/'+i.id+'/properties',status:200,body:{keys:[]}},{path:'/rest/api/3/issue/'+i.id+'/comment?startAt=0&maxResults='+config.jira.read_bounds.page_size+'&orderBy=created',status:200,body:{startAt:0,maxResults:config.jira.read_bounds.page_size,total:0,comments:[]}}];
  script=[{...native.script[0],body:{issues:[epic],isLast:true}},...read(epic),{...native.script[4],body:{issues:tickets,isLast:true}},...tickets.flatMap(read),{...native.script[8],body:{issues:tickets,isLast:true}}];
 }
 const logs=[];const wire=await withJira(script,()=>runPreview({operation:'preview'},{configText:JSON.stringify(config),manifest:f.manifest,environment:f.environment,createState:({binding,control})=>createDynamoState({binding,control,client:f.provider}),secretFactory:()=>({resolveSecret:async()=> 'dummy-scoped-token',dispose(){}}),log:r=>logs.push(r)}));assert.equal(wire.result.summary.result,'complete');assert.equal(wire.result.summary.counts.selected,0);if(kind==='cap')assert(wire.result.summary.reason_codes.includes('HUMAN_REVIEW_CAP'));assert.equal(logs.length,1);return {...wire,logs};}finally{f.cleanup();}}
export async function epochJourney({capacity=false}={}){
 const f=await preparedCloud();try{
  const knownPackage='a'.repeat(40);assert.equal(f.manifest.source_revision,knownPackage);
  assert.equal((await runStateCommand(['init','--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator','--json'],{resolveInstallation:f.resolve})).exitCode,0);
  const expectedFor=config=>({installation_id:config.manager.installation_id,package_revision:knownPackage,configuration_digest:hostConfig(JSON.stringify(config)).digest});
  const agree=expected=>{
   const state=f.provider.records()[0],receipt=JSON.parse(fs.readFileSync(f.installationPath));
   for(const key of ['installation_id','package_revision','configuration_digest']){assert.equal(state[key],expected[key]);assert.equal(receipt.binding[key],expected[key]);}
   assert.equal(receipt.manifest.source_revision,expected.package_revision);assert.equal(receipt.manifest.configuration_digest,expected.configuration_digest);
   assert.equal(f.cloud.function.Environment.Variables.PB_PACKAGE_REVISION,expected.package_revision);assert.equal(f.cloud.function.Environment.Variables.PB_CONFIGURATION_DIGEST,expected.configuration_digest);return state;
  };
  const validEpoch=(record,{before,after})=>{
   assert.match(record.extensions.health_generation,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
   const value=record.extensions.health_enabled_at;assert.equal(typeof value,'string');assert.equal(new Date(value).toISOString(),value);const stamp=Date.parse(value);assert(stamp>=before&&stamp<=after);
  };
  const initialExpected=expectedFor(f.config),original=agree(initialExpected);original.extensions=capacity?Object.fromEntries(Array.from({length:16},(_,i)=>['key_'+i,'retained'])):{customer_flag:'retained'};f.provider.seed(original);const steps=[],checks=[{stage:'initial',expected:initialExpected}];
  const apply=async(config,{rotates=true,stage}={})=>{
   const expected=expectedFor(config),text=JSON.stringify(config),digest=expected.configuration_digest,prior=JSON.parse(fs.readFileSync(f.installationPath)).manifest,next={...prior,canonical_config:config,configuration_digest:digest,zip_digest:sha256(text),payload_hashes:{...prior.payload_hashes,'config/manager.json':digest}};
   const manifestPath=path.join(f.directory,'next.json'),assetPath=path.join(f.directory,'asset.json');fs.writeFileSync(f.configPath,text);fs.writeFileSync(manifestPath,JSON.stringify(next));fs.writeFileSync(assetPath,JSON.stringify({bucket:'fixture',key:'manager.zip',version:'fixture-v1',zip_digest:next.zip_digest}));f.cloud.nextCodeHash=Buffer.from(next.zip_digest.slice(7),'hex').toString('base64');
   const before=Date.now(),outcome=await configureInstallation({configPath:f.configPath,installationPath:f.installationPath,manifestPath,assetPath,operatorProfile:'operator',deployerProfile:'deployer'},f.dependencies),after=Date.now();
   if(outcome.status==='configured'){fs.writeFileSync(f.installationPath,JSON.stringify(outcome.receipt));const retained=agree(expected);assert.deepEqual(outcome.applied,retained);if(rotates)validEpoch(retained,{before,after});}
   steps.push(outcome);checks.push({stage,expected,configure_window:{before:new Date(before).toISOString(),after:new Date(after).toISOString()}});return outcome;
  };
  const enabled=structuredClone(f.config);enabled.manager.controls.schedule_enabled=true;const enabledExpected=expectedFor(enabled),start=f.audit.length,first=await apply(enabled,{stage:'first-enable'});
  if(capacity){assert.equal(first.code,'MALFORMED_RECORD');assert(f.audit.slice(start).every(a=>!a.action.match(/Write|Update|Put|Invoke|Execute/)));assert.deepEqual(agree(initialExpected).extensions,original.extensions);return {steps,checks,actions:f.audit.slice(start)};}
  assert.equal(first.status,'configured');const generation=first.applied.extensions.health_generation,enabledAt=first.applied.extensions.health_enabled_at;assert.equal(first.applied.extensions.customer_flag,'retained');
  const same=await apply(enabled,{rotates:false,stage:'same-enabled-configure'});assert.equal(same.status,'configured');assert.equal(same.applied.extensions.health_generation,generation);assert.equal(same.applied.extensions.health_enabled_at,enabledAt);
  const stopped=await stopInstallation({configPath:f.configPath,installationPath:f.installationPath,operatorProfile:'operator'},f.dependencies);assert.equal(stopped.status,'stopped');assert.equal(stopped.applied.extensions.health_generation,generation);assert.equal(stopped.applied.extensions.health_enabled_at,enabledAt);assert.deepEqual(stopped.applied,agree(enabledExpected));steps.push(stopped);
  const expectedIdentity={...enabledExpected,health_generation:generation,health_enabled_at:enabledAt},observedAt=new Date().toISOString();assert(Date.parse(observedAt)>=Date.parse(enabledAt));
  const health=augment(f,{epoch:false,events:[],expectedIdentity}),stoppedBefore=f.provider.snapshot(),auditStart=f.audit.length,stoppedHealth=await readManagerHealth(health.input,{...health.dependencies,now:()=>observedAt}),healthActions=f.audit.slice(auditStart);
  const observationEvidence={expected_identity:expectedIdentity,observed_at:observedAt,metric_requests:health.telemetry,result:stoppedHealth,actions:healthActions};
  assert.equal(stoppedHealth.state,'degraded',JSON.stringify(observationEvidence));assert.equal(stoppedHealth.applied_controls.schedule_enabled,false);assert.equal(stoppedHealth.desired_enabled,true);assert.equal(stoppedHealth.observed_enabled,false);assert.equal(f.provider.snapshot(),stoppedBefore);assert(healthActions.every(a=>!a.action.match(/Write|Update|Put|Invoke|Execute/)));steps.push({stopped_health:stoppedHealth,observation:observationEvidence});
  const reenabled=await apply(enabled,{stage:'same-config-reenable'});assert.equal(reenabled.status,'configured');assert.notEqual(reenabled.applied.extensions.health_generation,generation);
  const changed=structuredClone(enabled);changed.manager.health={warning_percent:75};const reconfigured=await apply(changed,{stage:'enabled-health-config-change'});assert.equal(reconfigured.status,'configured');assert.notEqual(reconfigured.applied.extensions.health_generation,reenabled.applied.extensions.health_generation);assert.equal(reconfigured.applied.extensions.customer_flag,'retained');
  return {steps,checks,actions:f.audit.slice(start)};
 }finally{f.cleanup();}
}
export async function runHumanCase(id){
 const p=packet(),now=Date.parse(p.now),identity={installation_id:'fixture',package_revision:'a'.repeat(40),configuration_digest:'sha256:'+'b'.repeat(64),health_generation:'epoch',health_enabled_at:p.enabled_at};
 const base={now:p.now,current:identity,settings:{freshness_seconds:900,warning_percent:80},desired_enabled:true,observed_enabled:true,reads_complete:true,binding_coherent:true};
 if(id==='R1-22-H01'){
  const empty=await emptyWrapper(),five_ticket_wait=await emptyWrapper('cap'),held=await wrapperJourney(),summaries=[0,5,1].map((n,i)=>scanFixture(identity,{scan_id:'hold-'+i,held_count:n}));for(const s of summaries){assert(validScanSummary(s));assert.equal(s.result,'complete');}
  const capacity=scanFixture(identity,{scan_id:'capacity',counters:{requests_attempted:80,search_pages:1,comment_pages:0}}),out=evaluateHealth({...base,events:[{summary:capacity,timestamp:Date.parse(capacity.ended_at)}],metrics:{CompletePresence:1}});assert.equal(out.state,'degraded');
  const emf=summaries.map(embeddedMetricEvent);for(const event of emf)assert.deepEqual(event._aws.CloudWatchMetrics[0].Dimensions,[['InstallationId','EvidenceRevision']]);return {empty,five_ticket_wait,actual_wrapper:held,summaries,emf,capacity:out};
 }
 if(id==='R1-22-H02'){
  const results=p.groups[1].overlaps.map(row=>{const current={...identity,health_enabled_at:new Date(now-(row.enablement_age??Math.max(600,(row.complete_age??0)+1))*1000).toISOString()},events=[];if(row.complete_age!==undefined)events.push(scanFixture(current,{scan_id:'complete',started_at:new Date(now-(row.complete_age+1)*1000).toISOString(),ended_at:new Date(now-row.complete_age*1000).toISOString()}));if(row.failure_age!==undefined)events.push(scanFixture(current,{scan_id:'failed',result:'failed',started_at:new Date(now-(row.failure_age+1)*1000).toISOString(),ended_at:new Date(now-row.failure_age*1000).toISOString()}));const result=evaluateHealth({...base,current,desired_enabled:row.enabled,observed_enabled:row.observed,reads_complete:row.reads_complete??true,events:events.map(summary=>({summary,timestamp:Date.parse(summary.ended_at)}))});assert.equal(result.state,row.expected,row.name);return {input:row,result};});return {results};
 }
 if(id==='R1-22-H03'){
  const lifecycle=await epochJourney(),capacity=await epochJourney({capacity:true});const applied=lifecycle.steps[0].applied;assert.match(applied.extensions.health_generation,/^[0-9a-f-]{36}$/);assert(Number.isFinite(Date.parse(applied.extensions.health_enabled_at)));
  const results=[];for(const desired of [false,true])for(const actual of [false,true]){const result=evaluateHealth({...base,desired_enabled:desired,observed_enabled:actual,events:[]});assert.equal(result.state,desired!==actual?'degraded':desired?'starting':'disabled');results.push(result);}
  const historical=[];for(const change of [{health_generation:'old-epoch'},{package_revision:'c'.repeat(40)},{configuration_digest:'sha256:'+'c'.repeat(64)}]){const old=scanFixture({...identity,...change}),result=evaluateHealth({...base,events:[{summary:old,timestamp:Date.parse(old.ended_at)}]});assert.equal(result.state,'starting');historical.push(result);}return {lifecycle,capacity,results,old_evidence:historical};
 }
 if(id==='R1-22-H04'){
  const outcomes=[];for(const denied of [false,true]){const f=await healthFixture({denied,emptyPage:!denied});try{const before=f.provider.snapshot(),args=['--config',f.configPath,'--installation',f.installationPath,'--operator-profile','operator'];const readable=await runHealthCommand(args,f.dependencies),json=await runHealthCommand([...args,'--json'],f.dependencies);assert.equal(json.outcome.state,denied?'unknown':'disabled');assert.equal(readable.outcome.state,json.outcome.state);assert(!JSON.stringify([readable,json]).includes('DUMMY_SECRET'));assert.equal(f.provider.snapshot(),before);assert(f.audit.slice(f.auditStart).every(a=>!a.action?.match(/Write|Update|Put|Invoke|Execute/)));assert(f.telemetry.every(a=>a.identity==='SELECTED_OPERATOR'));outcomes.push({denied,readable,json,actions:f.audit.slice(f.auditStart),telemetry:f.telemetry});}finally{f.cleanup();}}
  const f=await healthFixture({change:true});try{const result=await readManagerHealth(f.input,f.dependencies);assert.equal(result.state,'unknown');outcomes.push({changed_host:result,actions:f.audit});}finally{f.cleanup();}
  const wrong=await healthFixture();try{const result=await readManagerHealth({...wrong.input,operatorProfile:'wrong'},wrong.dependencies);assert.equal(result.state,'unknown');assert.equal(wrong.telemetry.length,0);outcomes.push({wrong_identity:result,actions:wrong.audit.slice(wrong.auditStart)});}finally{wrong.cleanup();}
  const changedState=await healthFixture({changeState:true});try{const result=await readManagerHealth(changedState.input,changedState.dependencies);assert.equal(result.state,'unknown');outcomes.push({changed_state:result,actions:changedState.audit.slice(changedState.auditStart)});}finally{changedState.cleanup();}
  const capped=await healthFixture({pageSize:600,events:identity=>Array.from({length:1001},(_,i)=>scanFixture({...identity,package_revision:'c'.repeat(40)},{scan_id:'historical-'+i}))});try{const result=await readManagerHealth(capped.input,capped.dependencies);assert.equal(result.state,'unknown');assert(result.query_coverage.fetched_events<1001);assert(result.query_coverage.decoded_bytes>1048576);assert(result.omissions.includes('TELEMETRY_LIMIT'));outcomes.push({aggregate_byte_bound:result,telemetry:capped.telemetry});}finally{capped.cleanup();}
  const policyFixture=await healthFixture();let permissions;try{const template=synthesizeTemplate(JSON.stringify(policyFixture.config),policyFixture.manifest),operator=template.Metadata.Pigboard.operator_policy,runtime=template.Resources.RuntimeRole.Properties.Policies[0].PolicyDocument;const logStatement=operator.Statement.find(s=>s.Action==='logs:FilterLogEvents'),metricStatement=operator.Statement.find(s=>s.Action==='cloudwatch:GetMetricStatistics');assert.equal(logStatement.Resource,'arn:aws:logs:'+policyFixture.config.manager.aws.region+':'+policyFixture.config.manager.aws.account_id+':log-group:/aws/lambda/pigboard-fixture-f16d05ec6b29248d2c61adb1e9263f78:*');assert(!logStatement.Resource.includes('unrelated'));assert.equal(metricStatement.Resource,'*');assert.equal(metricStatement.Condition.StringEquals['aws:RequestedRegion'],policyFixture.config.manager.aws.region);assert(!JSON.stringify(runtime).includes('cloudwatch:'));assert(!Object.values(template.Resources).some(r=>['AWS::CloudWatch::Alarm','AWS::SNS::Topic'].includes(r.Type)));permissions={operator,runtime,unrelated_log_group_permitted:false,metric_dimension_iam_restriction:false};}finally{policyFixture.cleanup();}
  return {outcomes,permissions,installed_iam:'NOT_RUN'};
 }
 throw Error('Select an existing R1-22-H01 through R1-22-H04 group.');
}
async function main(argv){if(argv.length===1&&argv[0]==='--help'){console.log('Usage: node scripts/test-manager-health.mjs (--case R1-22-H01|R1-22-H02|R1-22-H03|R1-22-H04 | --all) --output NEW_DIRECTORY');return;}
 const all=argv[0]==='--all',id=argv[0]==='--case'?argv[1]:null,offset=all?1:2;if((!all&&!packet().groups.some(g=>g.id===id))||argv[offset]!=='--output'||argv.length!==offset+2)throw Error('Select a prescribed case and new evidence directory.');const output=path.resolve(argv[offset+1]);if(fs.existsSync(output))throw Error('Evidence directory must be new.');fs.mkdirSync(output,{recursive:true});const metadata={schema:'pigboard-health-evidence/v1',simulated_provider:true,human_acceptance:'NOT_RUN',node:process.version,source_head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),source_tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root,encoding:'utf8'}).trim(),source_dirty:execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}),fixtures:packet()};fs.writeFileSync(path.join(output,'inputs.json'),JSON.stringify(metadata,null,2));for(const selected of all?packet().groups.map(g=>g.id):[id]){try{const result=await runHumanCase(selected);fs.writeFileSync(path.join(output,selected+'.json'),JSON.stringify({local_result:'PASS',human_acceptance:'NOT_RUN',...result},null,2));}catch(error){fs.writeFileSync(path.join(output,selected+'.json'),JSON.stringify({local_result:'FAILED',code:error.code??'ASSERTION',message:error.message},null,2));throw error;}}console.log(JSON.stringify({output,local_result:'PASS',human_acceptance:'NOT_RUN'}));}
if(process.argv[1]===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(error=>{console.error(error.code??error.message);process.exitCode=2;});
