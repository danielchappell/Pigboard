#!/usr/bin/env node
import {readFileSync,openSync,fstatSync,writeFileSync,fsyncSync,closeSync,lstatSync,unlinkSync,ftruncateSync,writeSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {bindInstallation,configureInstallation,stopInstallation,runLifecycle,hostError} from '../lib/aws/installation.mjs';
const common=['config','installation','operator-profile'];
const target=['manifest','asset'];
const dispatch=['deployer-profile','output'];
const commands={
 bind:{required:['config','manifest','stack','operator-profile','output']},
 bootstrap:{required:[...common,...dispatch]},
 configure:{required:[...common,...target,...dispatch],optional:['resume-operation']},
 'upgrade-preview':{required:[...common,...target,'output']},
 upgrade:{required:[...common,...target,...dispatch],oneOf:['preview','protect-rejected'],optional:['resume-operation']},
 'maintenance-only':{required:[...common,'original-installation','operation','source-manifest',...target,...dispatch],optional:['resume-operation']},
 stop:{required:common,optional:['resume-operation']},
 'remove-preview':{required:[...common,'output']},
 remove:{required:[...common,'preview',...dispatch]},
 'inspect-operation':{required:common,optional:['operation']},
 'finish-operation':{required:[...common,'operation','output'],optional:['manifest','target-config']}
};
const help=`Usage:
${Object.entries(commands).map(([verb,{required,optional=[],oneOf=[]}])=>' node scripts/manager-installation.mjs '+verb+' '+
 required.map(field=>'--'+field+({stack:' ARN','operator-profile':' NAME','deployer-profile':' NAME',operation:' UUID'}[field]??' FILE')).join(' ')+
 (oneOf.length?' ('+oneOf.map(field=>'--'+field+' FILE').join(' | ')+')':'')+
 optional.map(field=>' [--'+field+(['operation','resume-operation'].includes(field)?' UUID':' FILE')+']').join('')+' [--json]').join('\n')}

Use the named AWS profiles configured for this installation. Keep the original
private receipt and the exact manifests, configurations and versioned assets.
Bind and init leave admission disabled. Bootstrap pins original physical State
using a separately authorized disabled update. Configure is a same-pin change.
Upgrade with --preview applies the exact compatible proposal and leaves admission fenced.
Upgrade-preview may refuse and write a private refusal file while exiting 2.
Use upgrade --protect-rejected with that file to fence the original installation
and stop its host controls. The rejected package is never dispatched.
A protective stop fences State. A strict stop also measures a fresh drain
against matching disabled maintenance intent. Prior sends and workers may continue.
After a superseded upgrade or configure, use maintenance-only with its verified recovery receipt.
A fully deployed, superseded bootstrap can be acknowledged with operator-only finish-operation.
Preview removal before dispatch. Removal retains the original State table.
Inspect an operation by UUID before deciding whether to finish it. A configure
that starts a new enablement window needs its original verified enablement time.
Use --resume-operation with the original command and current owner ID to finish
a pending alarm suffix after the host prefix is independently verified.
Finish applies verified evidence to State and never dispatches another host request.
`;
const shellWord=value=>/^[a-zA-Z0-9_./:-]+$/.test(value)?value:"'"+value.replaceAll("'","'\\''")+"'";
function refusalCommand(args,jsonRequested){
 return ['node','scripts/manager-installation.mjs','upgrade',
  ...[...common,...target,'deployer-profile'].flatMap(field=>['--'+field,args[field]??'<DEPLOYER_PROFILE>']),
  '--protect-rejected',args.output,'--output',args.output+'.protected.json',...(jsonRequested?['--json']:[])];
}
function human(outcome){
 const rows=[outcome.status+(outcome.phase?' ('+outcome.phase+')':'')];
 for(const [key,label] of Object.entries({code:'Result',operation:'Operation',active:'Active operation',last:'Last operation',
  stack_id:'Stack',table_id:'Physical State',...(outcome.state_mutated===undefined?{state_fenced:'State admission fenced'}:{state_mutated:'State mutation performed'}),host_mutated:'Host mutation performed',host:'Host protection',protection_code:'Protection result',proof:'Measured drain proof',
  outcome:'Operation outcome',receipt_path:'Private output',
  ...(outcome.status==='refused'?{receipt_publication:'Refusal file publication',publication_code:'Publication result'}:{}),
  pending_work:'Retained work',recovery:'Next action'})){
  if(outcome[key]!==undefined&&outcome[key]!==null)rows.push(label+' — '+outcome[key]);
 }
 for(const [key,label] of Object.entries({provider:'Provider evidence',terminal:'Terminal evidence',receipt:'Output document',
   alarm_window:'CloudWatch evaluation window',alarms:'Alarm evidence',alarm_acknowledgements:'Acknowledged alarm writes',observed:'Observed host controls',observed_source:'Source package',observed_target:'Target package',source_verification:'Historical source verification',
   original_operator:'Original operator',original_deployer:'Original deployer',effects:'Host effects'})){
  if(outcome[key]!==undefined&&outcome[key]!==null)rows.push(label+' — '+JSON.stringify(outcome[key]));
 }
 const removal=outcome.current_observation;
 if(removal){
  rows.push('Current removal observation — '+JSON.stringify({status:removal.status,
   ...(removal.provider?{stack_status:removal.provider.status}:{})}));
  if(removal.code)rows.push('Removal observation result — '+removal.code);
  if(removal.provider_code)rows.push('Stack deletion evidence — '+removal.provider_code);
  if(removal.table_observation?.code)rows.push('Retained State table observation — '+removal.table_observation.code);
  if(removal.state_persistence==='unconfirmed')rows.push('Terminal State confirmation unavailable — '+removal.state_code);
  for(const {logical,physical,observation,cost} of removal.resources)
   rows.push(logical+' ('+physical+') — '+observation+(cost?' · '+cost:''));
  for(const {reference,cost} of removal.externally_owned)
   rows.push('Externally owned — '+(typeof reference==='string'?reference:JSON.stringify(reference))+(cost?' · '+cost:''));
 }
 if(outcome.enablement_status==='preserved')rows.push('Schedule enablement — original time preserved');
 if(outcome.enablement_status==='unavailable')rows.push('Verified schedule enablement — unavailable for this operation');
 if(outcome.verified_enablement){
  rows.push('Verified schedule enablement — '+outcome.verified_enablement.health_enabled_at);
  rows.push('Enablement generation — '+outcome.verified_enablement.health_generation);
 }
 if(outcome.next_command)rows.push('Protect original installation — '+outcome.next_command.map(shellWord).join(' '));
 return rows.join('\n')+'\n';
}
export async function runInstallationCommand(argv,dependencies={}){
 const jsonRequested=argv.includes('--json');
 let lifecycleOutput=Object.hasOwn(commands,argv[0])&&!['bind','configure','stop'].includes(argv[0]);
 lifecycleOutput ||= argv.includes('--resume-operation');
 if(argv.length===1&&['--help','-h'].includes(argv[0]))return {exitCode:0,stdout:help};
 let args={},reservation,result;
 const files={openSync,fstatSync,writeFileSync,fsyncSync,closeSync,lstatSync,unlinkSync,ftruncateSync,writeSync,...dependencies.fileOperations};
 const cleanup=()=>{
  if(!reservation)return 'not_reserved';
  if(reservation.fd!==null){try{files.closeSync(reservation.fd);}catch{}reservation.fd=null;}
  try{if(!reservation.stat)return 'untrusted_incomplete_output';const current=files.lstatSync(args.output);if(current.dev!==reservation.stat.dev||current.ino!==reservation.stat.ino)return 'replaced_path_retained';files.unlinkSync(args.output);return 'owned_reservation_removed';}
  catch(error){return error.code==='ENOENT'?'absent':'untrusted_incomplete_output';}
 };
 const answer=(outcome,exitCode)=>({outcome,stdout:jsonRequested?JSON.stringify(outcome)+'\n':lifecycleOutput?human(outcome):outcome.status+': '+JSON.stringify(outcome)+'\n',exitCode});
 try{
 const command=argv[0],contract=commands[command];
 if(!contract)throw hostError('INVALID_INPUT');
 const {required,optional=[],oneOf=[]}=contract,fields=[...required,...optional,...oneOf],seen=new Set();
 for(let i=1;i<argv.length;i++){
  const flag=argv[i],key=flag.slice(2);
  if(seen.has(flag))throw hostError('INVALID_INPUT');
  seen.add(flag);
  if(flag==='--json')continue;
  if(!flag.startsWith('--')||!fields.includes(key)||!argv[i+1]||argv[i+1].startsWith('--')||argv[i+1].length>4096)
   throw hostError('INVALID_INPUT');
  args[key]=argv[++i];
 }
 const invalidChoice=oneOf.length>0&&oneOf.filter(k=>args[k]).length!==1;
 if(required.some(k=>!args[k])||invalidChoice||command==='finish-operation'&&Boolean(args.manifest)!==Boolean(args['target-config'])||
   ['operation','resume-operation'].some(key=>args[key]&&!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(args[key])))throw hostError('INVALID_INPUT');
 if(args.output){
  try{const fd=files.openSync(args.output,'wx',0o600);reservation={fd,stat:null};reservation.stat=files.fstatSync(fd);}
  catch{throw hostError('OUTPUT_RESERVATION_FAILED');}
 }
 if(command==='bind'){const receipt=await bindInstallation({configText:readFileSync(args.config,'utf8'),manifest:JSON.parse(readFileSync(args.manifest,'utf8')),manifestPath:args.manifest,stackId:args.stack,operatorProfile:args['operator-profile']},dependencies);result={status:'bound',binding:receipt.binding,receipt};}
 else{
  const input={
   configPath:args.config,installationPath:args.installation,operatorProfile:args['operator-profile'],deployerProfile:args['deployer-profile'],
   manifestPath:args.manifest,assetPath:args.asset,previewPath:args.preview,protectRejectedPath:args['protect-rejected'],operation:args.operation,resumeOperation:args['resume-operation'],
   originalInstallationPath:args['original-installation'],sourceManifestPath:args['source-manifest'],targetConfigPath:args['target-config']
  };
  const call=command==='stop'?stopInstallation:command==='configure'?configureInstallation:(i,d)=>runLifecycle(command,i,d);
  const publishOperation=reservation?document=>{
   files.writeFileSync(reservation.fd,JSON.stringify(document,null,2)+'\n');
   files.fsyncSync(reservation.fd);
   reservation.operation=true;
  }:undefined;
  result=await call(input,{...dependencies,publishOperation});
 }
 lifecycleOutput ||= result.receipt?.schema==='pigboard-installation-receipt/v2'||Boolean(result.operation||result.alarm_window);
 if(result.receipt&&reservation&&(!['unavailable','partial'].includes(result.status)||result.terminal)){
  try{
   const serialized=JSON.stringify(result.receipt,null,2)+'\n';
   if(reservation.operation){
    const bytes=Buffer.from(serialized);
    files.ftruncateSync(reservation.fd,0);
    if(files.writeSync(reservation.fd,bytes,0,bytes.length,0)!==bytes.length)throw hostError('RECEIPT_PUBLICATION_FAILED');
   }else files.writeFileSync(reservation.fd,serialized);
   files.fsyncSync(reservation.fd);files.closeSync(reservation.fd);reservation.fd=null;
   const current=files.lstatSync(args.output);if(current.dev!==reservation.stat.dev||current.ino!==reservation.stat.ino)throw hostError('RECEIPT_PUBLICATION_FAILED');
   delete result.receipt;result.receipt_publication='written';result.receipt_path=args.output;
   if(result.status==='refused'){
    result.next_command=refusalCommand(args,jsonRequested);
    result.recovery='Supply your authorized deployer profile and choose a fresh output path for protection.';
   }
  }catch{
   if(result.status==='refused'){
    delete result.receipt;
    result={...result,receipt_publication:'failed',publication_code:'RECEIPT_PUBLICATION_FAILED',output_cleanup:cleanup(),
      recovery:'Repeat the read-only upgrade-preview with a fresh output path.'};
    return answer(result,2);
   }
   result={...result,receipt_publication:'failed',publication_code:'RECEIPT_PUBLICATION_FAILED',output_cleanup:cleanup(),recovery:'Preserve the full emitted receipt in a new private file and inspect using it. Do not repeat configure to obtain a receipt. Any residual output is untrusted/incomplete.'};
   return answer(result,1);
  }
 }else if(reservation?.operation){
  files.closeSync(reservation.fd);reservation.fd=null;
  result={...result,receipt_publication:'operation_record_preserved',receipt_path:args.output};
 }else if(reservation)result={...result,receipt_publication:'not_written',output_cleanup:cleanup()};
 return answer(result,['bound','configured','stopped','bootstrapped','previewed','upgraded','removed','inspected'].includes(result.status)?0:
  ['partial','superseded'].includes(result.status)?1:2);
 }catch(e){lifecycleOutput ||= Boolean(e.alarm_window);const outcome={status:'unavailable',code:['INVALID_INPUT','OUTPUT_RESERVATION_FAILED','PACKAGE_ZIP_MISMATCH','PACKAGE_ZIP_UNAVAILABLE','ALARM_OWNERSHIP_UNCONFIRMED','ALARM_READ_DENIED','ALARM_DEFINITION_MISMATCH'].includes(e.code)||e.alarm_window?e.code:'INSTALLATION_UNAVAILABLE',...(e.alarm_window?{alarm_window:e.alarm_window}:{}),...(reservation?{output_cleanup:cleanup()}: {})};return answer(outcome,2);}

}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const r=await runInstallationCommand(process.argv.slice(2));process.stdout.write(r.stdout);process.exitCode=r.exitCode;}
