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
 configure:{required:[...common,...target,...dispatch]},
 'upgrade-preview':{required:[...common,...target,'output']},
 upgrade:{required:[...common,...target,'preview',...dispatch]},
 'maintenance-only':{required:[...common,'original-installation','operation','source-manifest',...target,...dispatch]},
 stop:{required:common},
 'remove-preview':{required:[...common,'output']},
 remove:{required:[...common,'preview',...dispatch]},
 'inspect-operation':{required:common,optional:['operation']},
 'finish-operation':{required:[...common,'operation','output'],optional:['manifest','target-config']}
};
const help=`Usage:
${Object.entries(commands).map(([verb,{required,optional=[]}])=>' node scripts/manager-installation.mjs '+verb+' '+
 required.map(field=>'--'+field+({stack:' ARN','operator-profile':' NAME','deployer-profile':' NAME',operation:' UUID'}[field]??' FILE')).join(' ')+
 optional.map(field=>' [--'+field+(field==='operation'?' UUID':' FILE')+']').join('')+' [--json]').join('\n')}

Use the named AWS profiles configured for this installation. Keep the original
private receipt and the exact manifests, configurations and versioned assets.
Bind and init leave admission disabled. Bootstrap pins original physical State
using a separately authorized disabled update. Configure is a same-pin change.
Upgrade requires a compatible pinned package and leaves admission fenced.
A protective stop fences State. A strict stop also measures a fresh drain
against matching disabled maintenance intent. Prior sends and workers may continue.
After a superseded upgrade, use maintenance-only with its verified recovery receipt.
Preview removal before dispatch. Removal retains the original State table.
Inspect an operation by UUID before deciding whether to finish it. Finish applies
verified evidence to State and never dispatches another host request.
`;
function human(outcome){
 const rows=[outcome.status+(outcome.phase?' ('+outcome.phase+')':'')];
 for(const [key,label] of Object.entries({code:'Result',operation:'Operation',active:'Active operation',last:'Last operation',
  stack_id:'Stack',table_id:'Physical State',state_fenced:'State admission fenced',proof:'Measured drain proof',
  outcome:'Operation outcome',receipt_path:'Private output',pending_work:'Retained work',recovery:'Next action'})){
  if(outcome[key]!==undefined&&outcome[key]!==null)rows.push(label+' — '+outcome[key]);
 }
 for(const [key,label] of Object.entries({provider:'Provider evidence',terminal:'Terminal evidence',receipt:'Output document',
   observed:'Observed host controls',observed_source:'Source package',observed_target:'Target package',
   original_operator:'Original operator',original_deployer:'Original deployer',effects:'Host effects'})){
  if(outcome[key]!==undefined&&outcome[key]!==null)rows.push(label+' — '+JSON.stringify(outcome[key]));
 }
 return rows.join('\n')+'\n';
}
export async function runInstallationCommand(argv,dependencies={}){
 const jsonRequested=argv.includes('--json');
 let lifecycleOutput=Object.hasOwn(commands,argv[0])&&!['bind','configure','stop'].includes(argv[0]);
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
 const {required,optional=[]}=contract,fields=[...required,...optional],seen=new Set();
 for(let i=1;i<argv.length;i++){
  const flag=argv[i],key=flag.slice(2);
  if(seen.has(flag))throw hostError('INVALID_INPUT');
  seen.add(flag);
  if(flag==='--json')continue;
  if(!flag.startsWith('--')||!fields.includes(key)||!argv[i+1]||argv[i+1].startsWith('--')||argv[i+1].length>4096)
   throw hostError('INVALID_INPUT');
  args[key]=argv[++i];
 }
 if(required.some(k=>!args[k])||command==='finish-operation'&&Boolean(args.manifest)!==Boolean(args['target-config'])||
   args.operation&&!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(args.operation))throw hostError('INVALID_INPUT');
 if(args.output){
  try{const fd=files.openSync(args.output,'wx',0o600);reservation={fd,stat:null};reservation.stat=files.fstatSync(fd);}
  catch{throw hostError('OUTPUT_RESERVATION_FAILED');}
 }
 if(command==='bind'){const receipt=await bindInstallation({configText:readFileSync(args.config,'utf8'),manifest:JSON.parse(readFileSync(args.manifest,'utf8')),stackId:args.stack,operatorProfile:args['operator-profile']},dependencies);result={status:'bound',binding:receipt.binding,receipt};}
 else{
  const input={
   configPath:args.config,installationPath:args.installation,operatorProfile:args['operator-profile'],deployerProfile:args['deployer-profile'],
   manifestPath:args.manifest,assetPath:args.asset,previewPath:args.preview,operation:args.operation,
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
 lifecycleOutput ||= result.receipt?.schema==='pigboard-installation-receipt/v2'||Boolean(result.operation);
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
  }catch{
   result={...result,receipt_publication:'failed',publication_code:'RECEIPT_PUBLICATION_FAILED',output_cleanup:cleanup(),recovery:'Preserve the full emitted receipt in a new private file and inspect using it. Do not repeat configure to obtain a receipt. Any residual output is untrusted/incomplete.'};
   return answer(result,1);
  }
 }else if(reservation?.operation){
  files.closeSync(reservation.fd);reservation.fd=null;
  result={...result,receipt_publication:'operation_record_preserved',receipt_path:args.output};
 }else if(reservation)result={...result,receipt_publication:'not_written',output_cleanup:cleanup()};
 return answer(result,['bound','configured','stopped','bootstrapped','previewed','upgraded','removed','inspected'].includes(result.status)?0:
  ['partial','superseded'].includes(result.status)?1:2);
 }catch(e){const outcome={status:'unavailable',code:['INVALID_INPUT','OUTPUT_RESERVATION_FAILED'].includes(e.code)?e.code:'INSTALLATION_UNAVAILABLE',...(reservation?{output_cleanup:cleanup()}: {})};return answer(outcome,2);}

}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const r=await runInstallationCommand(process.argv.slice(2));process.stdout.write(r.stdout);process.exitCode=r.exitCode;}
