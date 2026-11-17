import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createDynamoState} from './dynamodb.mjs';
import {projectRetainedInventory,validBinding} from '../state/contract.mjs';
import {inspectJiraInventory} from '../jira/inventory.mjs';
import {composeOrdinarySnapshot} from '../manager/snapshot.mjs';
import {previewSnapshot} from '../manager/decisions.mjs';
import {buildScanSummary,safeReason} from '../manager/health.mjs';
import {embeddedMetricEvent} from './health.mjs';
import {hostConfig,deriveHostControls,previewOnly,createSecretResolver,hostError} from './installation.mjs';
export async function runPreview(event,{configText,manifest,environment=process.env,createState=createDynamoState,secretFactory=createSecretResolver,log=()=>{},now=()=>new Date().toISOString(),monotonic=()=>performance.now(),scanId=randomUUID}={}){
 if(!event||Object.getPrototypeOf(event)!==Object.prototype||Object.keys(event).length!==1||event.operation!=='preview')return {schema:'pigboard-runtime-result/v1',status:'invalid',code:'PREVIEW_EVENT_REQUIRED',writes:0,execution_authorized:false};
 let state,secret,config,projection,inventory,inspection,preview;const started=monotonic(),observation={scan_id:scanId(),started_at:now(),mode:'preview'};
 const finish=result=>{
  const report=inspection?.report,streams=preview?.streams??[],readComplete=report?.status==='complete'&&report.domain_complete===true;
  const complete=result.status==='preview'&&preview?.valid&&readComplete;
  const installation=inventory?.data?.installation,coherent=inventory?.data?.controls_match===true&&installation?.package_revision===manifest?.source_revision&&installation?.configuration_digest===projection?.configuration_digest;
  const projects=config?.projects.map(p=>{const rows=streams.filter(s=>s.scope.project_id===p.id);return {project_id:p.id,stream_count:preview?rows.length:null,issue_count:readComplete?report.issues.filter(i=>i.project_id===p.id).length:null,selected_count:preview?rows.filter(s=>s.selected_ticket_id!==null).length:null,held_count:preview?rows.filter(s=>s.decision==='hold'||s.decision==='wait').length:null,reason_codes:rows.flatMap(s=>s.reasons.map(r=>safeReason(r.code)))};});
  const summary=buildScanSummary({...observation,...(projection?{installation_id:projection.installation_id,package_revision:manifest.source_revision,configuration_digest:projection.configuration_digest}:{}),health_generation:coherent?installation.extensions.health_generation:null,health_enabled_at:coherent?installation.extensions.health_enabled_at:null,ended_at:now(),elapsed_ms:Math.max(0,monotonic()-started),invocation_timeout_seconds:config?.manager.invocation_timeout_seconds,result:complete?'complete':result.status==='unavailable'||inventory?.status==='unavailable'||report?.status==='setup_failed'?'failed':'incomplete',counters:report?.counters,limits:config?.jira.read_bounds,project_count:readComplete?config.projects.length:null,selected_count:preview?streams.filter(s=>s.selected_ticket_id!==null).length:null,held_count:preview?streams.filter(s=>['hold','wait'].includes(s.decision)).length:null,counts_complete:complete&&streams.every(s=>s.counts_complete===true),reason_codes:[safeReason(result.code),...(report?.diagnostics.map(d=>safeReason(d.code))??[]),...streams.flatMap(s=>s.reasons.map(r=>safeReason(r.code))),...(inventory?.data?.controls_match===false?['CONTROL_MISMATCH']:[])],projects});
  const final={...result,...(projection?{configuration_digest:projection.configuration_digest,package_revision:manifest.source_revision}:{}),summary};log(embeddedMetricEvent(summary));return final;
 };
 try{
  configText??=readFileSync(new URL('../../config/manager.json',import.meta.url),'utf8');manifest??=JSON.parse(readFileSync(new URL('../../package-manifest.json',import.meta.url),'utf8'));
  config=hostConfig(configText).config;projection=deriveHostControls(configText,{package_revision:manifest.source_revision});previewOnly(projection);
  const binding={schema:'pigboard-aws-installation/v1',installation_id:projection.installation_id,domain_id:projection.domain_id,site:config.jira.site,configuration_digest:projection.configuration_digest,package_revision:manifest.source_revision,region:config.manager.aws.region,stack_id:environment.PB_STACK_ID,table_name:environment.PB_TABLE_NAME,table_arn:environment.PB_TABLE_ARN,installation_generation:manifest.installation_generation};
  const expected={PB_INSTALLATION_ID:binding.installation_id,PB_DOMAIN_ID:binding.domain_id,PB_INSTALLATION_GENERATION:binding.installation_generation,PB_PACKAGE_REVISION:binding.package_revision,PB_CONFIGURATION_DIGEST:binding.configuration_digest,PB_MODE:'preview',PB_WRITES_ENABLED:'false'};
  if(!validBinding(binding,projection.control)||Object.entries(expected).some(([k,v])=>environment[k]!==v)||manifest.configuration_digest!==projection.configuration_digest)throw hostError('BINDING_MISMATCH');
  state=createState({binding,control:projection.control});inventory=await state.readInventory({limits:{streams:1000,members:1000,pending_attempts:1000,pages:10000,requests:10000,milliseconds:30000}});
  if(inventory.status!=='confirmed'||inventory.data?.complete!==true)return finish({schema:'pigboard-runtime-result/v1',status:'incomplete',code:safeReason(inventory.code),diagnostics:inventory.diagnostics,writes:0,execution_authorized:false});
  const retained=projectRetainedInventory(inventory.data);secret=secretFactory(config);
  inspection=await inspectJiraInventory(configText,{...retained,retained_complete:true},{resolveSecret:secret.resolveSecret});
  const composed=composeOrdinarySnapshot(configText,inspection,{...retained,retained_complete:true,retained:[]});
  if(!composed.valid)return finish({schema:'pigboard-runtime-result/v1',status:'incomplete',code:'COMPOSITION_INCOMPLETE',diagnostics:[...inspection.report.diagnostics,...composed.diagnostics],writes:0,execution_authorized:false});
  preview=previewSnapshot(configText,JSON.stringify(composed.snapshot),{mode:'ordinary'});
  return finish({schema:'pigboard-runtime-result/v1',status:preview.valid?'preview':'incomplete',code:preview.valid?'OK':'PREVIEW_INCOMPLETE',controls_match:inventory.data.controls_match,acquisition:{status:inspection.report.status,diagnostics:inspection.report.diagnostics,counters:inspection.report.counters},preview,writes:0,execution_authorized:false});
 }catch(error){return finish({schema:'pigboard-runtime-result/v1',status:'unavailable',code:safeReason(error.code??error.stateResult?.code),writes:0,execution_authorized:false});}
 finally{secret?.dispose?.();state?.close?.();}
}
export async function handler(event){return runPreview(event,{log:record=>console.info(JSON.stringify(record))});}
