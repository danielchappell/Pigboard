#!/usr/bin/env node
import {readFileSync,openSync,fstatSync,writeFileSync,fsyncSync,closeSync,lstatSync,unlinkSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {bindInstallation,configureInstallation,stopInstallation,hostError} from '../lib/aws/installation.mjs';
const help=`Usage:
 node scripts/manager-installation.mjs bind --config FILE --manifest FILE --stack ARN --operator-profile NAME --output NEW_RECEIPT [--json]
 node scripts/manager-installation.mjs configure --config FILE --installation RECEIPT --manifest FILE --asset FILE --operator-profile NAME --deployer-profile NAME --output NEW_RECEIPT [--json]
 node scripts/manager-installation.mjs stop --config FILE --installation RECEIPT --operator-profile NAME [--json]
Named profiles must resolve to the distinct roles in the canonical configuration.
No deployment occurs through bind. Configure supports only reviewed control-only
rebuilds of the same pinned source. Stop preserves all retained records.
Bind/configure reserve a new private output before dispatch. If publication fails,
preserve the emitted receipt in a new private file; do not repeat configure.
`;
export async function runInstallationCommand(argv,dependencies={}){
 if(argv.length===1&&['--help','-h'].includes(argv[0]))return {exitCode:0,stdout:help};
 let args={},reservation,result;
 const files={openSync,fstatSync,writeFileSync,fsyncSync,closeSync,lstatSync,unlinkSync,...dependencies.fileOperations};
 const cleanup=()=>{
  if(!reservation)return 'not_reserved';
  if(reservation.fd!==null){try{files.closeSync(reservation.fd);}catch{}reservation.fd=null;}
  try{if(!reservation.stat)return 'untrusted_incomplete_output';const current=files.lstatSync(args.output);if(current.dev!==reservation.stat.dev||current.ino!==reservation.stat.ino)return 'replaced_path_retained';files.unlinkSync(args.output);return 'owned_reservation_removed';}
  catch(error){return error.code==='ENOENT'?'absent':'untrusted_incomplete_output';}
 };
 const answer=(outcome,exitCode)=>({outcome,stdout:args.json?JSON.stringify(outcome)+'\n':outcome.status+': '+JSON.stringify(outcome)+'\n',exitCode});
 try{
 const command=argv[0],fields={bind:['config','manifest','stack','operator-profile','output'],configure:['config','installation','manifest','asset','operator-profile','deployer-profile','output'],stop:['config','installation','operator-profile']}[command];if(!fields)throw hostError('INVALID_INPUT');
 const seen=new Set();for(let i=1;i<argv.length;i++){const flag=argv[i];if(seen.has(flag))throw hostError('INVALID_INPUT');seen.add(flag);if(flag==='--json'){args.json=true;continue;}const key=flag.slice(2);if(!flag.startsWith('--')||!fields.includes(key)||!argv[i+1]||argv[i+1].startsWith('--')||argv[i+1].length>4096)throw hostError('INVALID_INPUT');args[key]=argv[++i];}if(fields.some(k=>!args[k]))throw hostError('INVALID_INPUT');
 if(command!=='stop'){
  try{const fd=files.openSync(args.output,'wx',0o600);reservation={fd,stat:null};reservation.stat=files.fstatSync(fd);}
  catch{throw hostError('OUTPUT_RESERVATION_FAILED');}
 }
 if(command==='bind'){const receipt=await bindInstallation({configText:readFileSync(args.config,'utf8'),manifest:JSON.parse(readFileSync(args.manifest,'utf8')),stackId:args.stack,operatorProfile:args['operator-profile']},dependencies);result={status:'bound',binding:receipt.binding,receipt};}
 else{const input={configPath:args.config,installationPath:args.installation,operatorProfile:args['operator-profile'],deployerProfile:args['deployer-profile'],manifestPath:args.manifest,assetPath:args.asset};result=await (command==='stop'?stopInstallation:configureInstallation)(input,dependencies);}
 if(['bound','configured'].includes(result.status)){
  try{
   files.writeFileSync(reservation.fd,JSON.stringify(result.receipt,null,2)+'\n');files.fsyncSync(reservation.fd);files.closeSync(reservation.fd);reservation.fd=null;
   const current=files.lstatSync(args.output);if(current.dev!==reservation.stat.dev||current.ino!==reservation.stat.ino)throw hostError('RECEIPT_PUBLICATION_FAILED');
   delete result.receipt;result.receipt_publication='written';result.receipt_path=args.output;
  }catch{
   result={...result,receipt_publication:'failed',publication_code:'RECEIPT_PUBLICATION_FAILED',output_cleanup:cleanup(),recovery:'Preserve the full emitted receipt in a new private file and inspect using it. Do not repeat configure to obtain a receipt. Any residual output is untrusted/incomplete.'};
   return answer(result,1);
  }
 }else if(reservation)result={...result,receipt_publication:'not_written',output_cleanup:cleanup()};
 return answer(result,['bound','configured','stopped'].includes(result.status)?0:result.status==='partial'?1:2);
 }catch(e){const outcome={status:'unavailable',code:['INVALID_INPUT','OUTPUT_RESERVATION_FAILED'].includes(e.code)?e.code:'INSTALLATION_UNAVAILABLE',...(reservation?{output_cleanup:cleanup()}: {})};return answer(outcome,2);}

}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const r=await runInstallationCommand(process.argv.slice(2));process.stdout.write(r.stdout);process.exitCode=r.exitCode;}
