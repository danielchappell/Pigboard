#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {bindInstallation,configureInstallation,stopInstallation,hostError} from '../lib/aws/installation.mjs';
const help=`Usage:
 node scripts/manager-installation.mjs bind --config FILE --manifest FILE --stack ARN --operator-profile NAME --output NEW_RECEIPT [--json]
 node scripts/manager-installation.mjs configure --config FILE --installation RECEIPT --manifest FILE --asset FILE --operator-profile NAME --deployer-profile NAME --output NEW_RECEIPT [--json]
 node scripts/manager-installation.mjs stop --config FILE --installation RECEIPT --operator-profile NAME [--json]
Named profiles must resolve to the distinct roles in the canonical configuration.
No deployment occurs through bind. Configure supports only reviewed control-only
rebuilds of the same pinned source. Stop preserves all retained records.
`;
export async function runInstallationCommand(argv,dependencies={}){
 if(argv.length===1&&['--help','-h'].includes(argv[0]))return {exitCode:0,stdout:help};
 let args={};try{
 const command=argv[0],fields={bind:['config','manifest','stack','operator-profile','output'],configure:['config','installation','manifest','asset','operator-profile','deployer-profile','output'],stop:['config','installation','operator-profile']}[command];if(!fields)throw hostError('INVALID_INPUT');
 const seen=new Set();for(let i=1;i<argv.length;i++){const flag=argv[i];if(seen.has(flag))throw hostError('INVALID_INPUT');seen.add(flag);if(flag==='--json'){args.json=true;continue;}const key=flag.slice(2);if(!flag.startsWith('--')||!fields.includes(key)||!argv[i+1]||argv[i+1].startsWith('--')||argv[i+1].length>4096)throw hostError('INVALID_INPUT');args[key]=argv[++i];}if(fields.some(k=>!args[k]))throw hostError('INVALID_INPUT');
 let result;if(command==='bind'){const receipt=await bindInstallation({configText:readFileSync(args.config,'utf8'),manifest:JSON.parse(readFileSync(args.manifest,'utf8')),stackId:args.stack,operatorProfile:args['operator-profile']},dependencies);writeFileSync(args.output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});result={status:'bound',receipt_path:args.output,binding:receipt.binding};}
 else{const input={configPath:args.config,installationPath:args.installation,operatorProfile:args['operator-profile'],deployerProfile:args['deployer-profile'],manifestPath:args.manifest,assetPath:args.asset};result=await (command==='stop'?stopInstallation:configureInstallation)(input,dependencies);if(result.status==='configured'){writeFileSync(args.output,JSON.stringify(result.receipt,null,2)+'\n',{flag:'wx',mode:0o600});delete result.receipt;result.receipt_path=args.output;}}
 return {outcome:result,stdout:args.json?JSON.stringify(result)+'\n':result.status+': '+JSON.stringify(result)+'\n',exitCode:['bound','configured','stopped'].includes(result.status)?0:result.status==='partial'?1:2};
 }catch(e){const outcome={status:'unavailable',code:e.code??'INSTALLATION_UNAVAILABLE'};return {outcome,stdout:JSON.stringify(outcome)+'\n',exitCode:2};}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const r=await runInstallationCommand(process.argv.slice(2));process.stdout.write(r.stdout);process.exitCode=r.exitCode;}
