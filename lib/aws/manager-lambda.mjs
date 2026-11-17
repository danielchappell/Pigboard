import {performance} from 'node:perf_hooks';
import {randomUUID} from 'node:crypto';
import {applyOrdinary} from '../manager/apply.mjs';
import {readFileSync} from 'node:fs';
import {createDynamoState} from './dynamodb.mjs';
import {projectRetainedInventory,validBinding} from '../state/contract.mjs';
import {inspectJiraInventory} from '../jira/inventory.mjs';
import {composeOrdinarySnapshot} from '../manager/snapshot.mjs';
import {previewSnapshot} from '../manager/decisions.mjs';
import {hostConfig,deriveHostControls,previewOnly,createSecretResolver,hostError} from './installation.mjs';
export async function runPreview(event,{configText,manifest,environment=process.env,createState=createDynamoState,secretFactory=createSecretResolver,log=()=>{}}={}){
 if(!event||Object.getPrototypeOf(event)!==Object.prototype||Object.keys(event).length!==1||event.operation!=='preview')return {schema:'pigboard-runtime-result/v1',status:'invalid',code:'PREVIEW_EVENT_REQUIRED',writes:0,execution_authorized:false};
 let state,secret;const started=Date.now();try{
  configText??=readFileSync(new URL('../../config/manager.json',import.meta.url),'utf8');manifest??=JSON.parse(readFileSync(new URL('../../package-manifest.json',import.meta.url),'utf8'));
  const {config}=hostConfig(configText),projection=deriveHostControls(configText,{package_revision:manifest.source_revision});previewOnly(projection);
  const binding={schema:'pigboard-aws-installation/v1',installation_id:projection.installation_id,domain_id:projection.domain_id,site:config.jira.site,configuration_digest:projection.configuration_digest,package_revision:manifest.source_revision,region:config.manager.aws.region,stack_id:environment.PB_STACK_ID,table_name:environment.PB_TABLE_NAME,table_arn:environment.PB_TABLE_ARN,installation_generation:manifest.installation_generation};
  const expected={PB_INSTALLATION_ID:binding.installation_id,PB_DOMAIN_ID:binding.domain_id,PB_INSTALLATION_GENERATION:binding.installation_generation,PB_PACKAGE_REVISION:binding.package_revision,PB_CONFIGURATION_DIGEST:binding.configuration_digest,PB_MODE:'preview',PB_WRITES_ENABLED:'false'};
  if(!validBinding(binding,projection.control)||Object.entries(expected).some(([k,v])=>environment[k]!==v)||manifest.configuration_digest!==projection.configuration_digest)throw hostError('BINDING_MISMATCH');
  state=createState({binding,control:projection.control});const inventory=await state.readInventory({limits:{streams:1000,members:1000,pending_attempts:1000,pages:10000,requests:10000,milliseconds:30000}});
  if(inventory.status!=='confirmed'||inventory.data?.complete!==true)return {schema:'pigboard-runtime-result/v1',status:'incomplete',code:inventory.code,diagnostics:inventory.diagnostics,writes:0,execution_authorized:false};
  const retained=projectRetainedInventory(inventory.data);secret=secretFactory(config);
  const inspection=await inspectJiraInventory(configText,{...retained,retained_complete:true},{resolveSecret:secret.resolveSecret});
  const composed=composeOrdinarySnapshot(configText,inspection,{...retained,retained_complete:true,retained:[]});
  if(!composed.valid)return {schema:'pigboard-runtime-result/v1',status:'incomplete',code:'COMPOSITION_INCOMPLETE',diagnostics:[...inspection.report.diagnostics,...composed.diagnostics],writes:0,execution_authorized:false};
  const preview=previewSnapshot(configText,JSON.stringify(composed.snapshot),{mode:'ordinary'});
  return {schema:'pigboard-runtime-result/v1',status:preview.valid?'preview':'incomplete',code:preview.valid?'OK':'PREVIEW_INCOMPLETE',configuration_digest:projection.configuration_digest,package_revision:manifest.source_revision,controls_match:inventory.data.controls_match,acquisition:{status:inspection.report.status,diagnostics:inspection.report.diagnostics,counters:inspection.report.counters},preview,writes:0,execution_authorized:false};
 }catch(error){return {schema:'pigboard-runtime-result/v1',status:'unavailable',code:error.code??error.stateResult?.code??'RUNTIME_UNAVAILABLE',writes:0,execution_authorized:false};}
 finally{secret?.dispose?.();state?.close?.();log({operation:'preview',elapsed_ms:Date.now()-started,writes:0});}
}
export async function runApply(event,{configText,manifest,environment=process.env,createState=createDynamoState,secretFactory=createSecretResolver,log=()=>{},producer_invocation_id=randomUUID()}={}){
 const empty={scope:null,ticket_id:null,attempt_id:null,stage:'prepare',hold:false,effects:{intent:'not_attempted',comment:'not_attempted',pointer:'not_attempted',transition:'not_attempted',finalization:'not_attempted'}};
 const base={schema:'pigboard-runtime-result/v1',status:'invalid',code:'APPLY_EVENT_REQUIRED',diagnostics:[],configuration_digest:null,package_revision:null,controls_match:null,writes:0,execution_authorized:false,apply:empty};
 if(!event||Object.getPrototypeOf(event)!==Object.prototype||Reflect.ownKeys(event).length!==1||Object.getOwnPropertyDescriptor(event,'operation')?.value!=='apply')return base;
 let state,secret;const started=performance.now();let result=base;
 try{
  configText??=readFileSync(new URL('../../config/manager.json',import.meta.url),'utf8');manifest??=JSON.parse(readFileSync(new URL('../../package-manifest.json',import.meta.url),'utf8'));
  const {config}=hostConfig(configText),projection=deriveHostControls(configText,{package_revision:manifest.source_revision});
  base.configuration_digest=projection.configuration_digest;base.package_revision=projection.package_revision;
  if(manifest.schema!=='pigboard-manager-package/v1'||manifest.runtime!=='nodejs24.x'||manifest.sender!==true||!manifest.canonical_config||hostConfig(JSON.stringify(manifest.canonical_config)).digest!==projection.configuration_digest||projection.mode!=='apply'||manifest.configuration_digest!==projection.configuration_digest||manifest.installation_id!==projection.installation_id||manifest.domain_id!==projection.domain_id)throw hostError('BINDING_MISMATCH');
  const binding={schema:'pigboard-aws-installation/v1',installation_id:projection.installation_id,domain_id:projection.domain_id,site:config.jira.site,configuration_digest:projection.configuration_digest,package_revision:manifest.source_revision,region:config.manager.aws.region,stack_id:environment.PB_STACK_ID,table_name:environment.PB_TABLE_NAME,table_arn:environment.PB_TABLE_ARN,installation_generation:manifest.installation_generation};
  const expected={PB_INSTALLATION_ID:binding.installation_id,PB_DOMAIN_ID:binding.domain_id,PB_INSTALLATION_GENERATION:binding.installation_generation,PB_PACKAGE_REVISION:binding.package_revision,PB_CONFIGURATION_DIGEST:binding.configuration_digest,PB_MODE:'apply',PB_WRITES_ENABLED:String(projection.control.writes_enabled)};
  if(!validBinding(binding,projection.control)||Object.entries(expected).some(([k,v])=>environment[k]!==v))throw hostError('BINDING_MISMATCH');
  state=createState({binding,control:projection.control});secret=secretFactory(config);
  const outcome=await applyOrdinary(configText,{binding,control:projection.control,state,resolveSecret:secret.resolveSecret,producer_invocation_id,deadline:started+config.manager.invocation_timeout_seconds*1000});
  result={schema:base.schema,status:outcome.status,code:outcome.code,diagnostics:outcome.diagnostics,configuration_digest:base.configuration_digest,package_revision:base.package_revision,controls_match:outcome.controls_match,writes:outcome.writes,execution_authorized:false,apply:{scope:outcome.apply.scope,ticket_id:outcome.apply.ticket_id,attempt_id:outcome.apply.attempt_id,stage:outcome.apply.stage,hold:outcome.apply.hold,effects:{intent:outcome.apply.effects.intent,comment:outcome.apply.effects.comment,pointer:outcome.apply.effects.pointer,transition:outcome.apply.effects.transition,finalization:outcome.apply.effects.finalization}}};return result;
 }catch{result={...base,status:'unavailable',code:'APPLY_UNAVAILABLE'};return result;}
 finally{try{secret?.dispose?.();}catch{/* Preserve the observed outcome during cleanup. */}try{state?.close?.();}catch{/* Injected clients remain caller owned. */}log({operation:'apply',elapsed_ms:Math.ceil(performance.now()-started),writes:result.writes});}
}
export async function handler(event,context){let timing={};const run=event?.operation==='apply'?runApply:runPreview;const result=await run(event,{producer_invocation_id:context?.awsRequestId??randomUUID(),log:record=>{timing=record;}});console.info(JSON.stringify({...timing,invocation_id:context?.awsRequestId??null,configuration_digest:result.configuration_digest??null,package_revision:result.package_revision??null,status:result.status,code:result.code,stream_count:result.preview?.streams.length??0,writes:result.writes,...(result.apply?{apply:result.apply}:{})}));return result;}
