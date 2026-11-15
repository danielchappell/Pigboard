#!/usr/bin/env node
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
const args=process.argv.slice(2);let json=false;
// Only flag positions affect output format; filenames remain data.
for(let i=0;i<args.length;i++){if(['--input','--previous','--expected-site','--label'].includes(args[i]))i++;else if(args[i]==='--json')json=true;}
const options={},base=()=>({schema:'pigboard-config-check/v1',mode:options.previous===undefined?'validate':'preview',valid:false,configuration_digest:null,destination_authority:'not_evaluated',live_readiness:'not_evaluated',resolved_scope:null,streams:[],preview:null,diagnostics:[]});
const help=`Check local Pig Boss project scope (Node 20+).\nSource: node scripts/check-config.mjs --input FILE [--previous PREVIOUS] [--expected-site HTTPS_ORIGIN] [--label FULL_LABEL] [--json]\nInstalled: node <receipt.skills>/work-validator/scripts/check-config.mjs --input FILE --json\nOne YAML 1.2/JSON configuration; no credentials, provider calls or writes.\nValidity is local only. Expected site binds only the supplied site; live readiness is not evaluated.\nPreview lists pending checks, never enablement or state actions. See docs/configuration.md.\n`;
async function readLocal(filePath){let file;try{file=await open(filePath,constants.O_RDONLY|constants.O_NONBLOCK);if(!(await file.stat()).isFile())throw Error();const bytes=Buffer.alloc(1048577);let count=0;while(count<bytes.length){const part=await file.read(bytes,count,bytes.length-count,null);if(!part.bytesRead)break;count+=part.bytesRead;}return bytes.subarray(0,count);}catch{throw Error('INPUT');}finally{await file?.close();}}
let result,exit=2;
try{
  const seen=new Set();for(let i=0;i<args.length;i++){const flag=args[i];if(!['--input','--previous','--expected-site','--label','--json','--help'].includes(flag)||seen.has(flag))throw Error('USAGE');seen.add(flag);if(['--json','--help'].includes(flag))options[flag.slice(2)]=true;else{if(!args[i+1]||args[i+1].startsWith('--'))throw Error('USAGE');options[flag.slice(2)]=args[++i];}}
  if(options.help){if(args.some(a=>!['--help','--json'].includes(a)))throw Error('USAGE');if(json)console.log(JSON.stringify({schema:'pigboard-config-check/v1',help,live_readiness:'not_evaluated'}));else process.stdout.write(help);process.exitCode=0;}
  else{
    if(!options.input)throw Error('USAGE');let runtime,projects,diff,parser;
    try{[runtime,projects,diff,parser]=await Promise.all([import('../lib/config/parse.mjs'),import('../lib/config/projects.mjs'),import('../lib/config/diff.mjs'),import('../lib/contracts/work.mjs')]);}catch{throw Error('SETUP');}
    if(options['expected-site']!==undefined&&!runtime.httpsURL(options['expected-site'],true)||options.label!==undefined&&!projects.validLabel(options.label))throw Error('USAGE');
    const bytes=await readLocal(options.input),next=runtime.parseConfig(bytes,{...(options['expected-site']===undefined?{}:{expectedSite:options['expected-site']})});
    result={...base(),...next};let previous,old;
    if(options.previous!==undefined){try{previous=await readLocal(options.previous);}catch{throw Error('PREVIOUS_INPUT');}old=runtime.parseConfig(previous);result.diagnostics=[...old.diagnostics.map(d=>({...d,path:'/previous'+d.path})),...result.diagnostics];}
    result.valid=next.valid&&(old?.valid??true);
    if(!result.valid){result.configuration_digest=null;result.resolved_scope=null;exit=1;}
    else{if(options.label!==undefined)result.streams=projects.inspectStreams(result.resolved_scope,options.label);if(previous!==undefined)result.preview=diff.diffConfig(parser.parseContract(previous,runtime.CONFIG_LIMITS),parser.parseContract(bytes,runtime.CONFIG_LIMITS));exit=result.preview?.status==='identity_change_held'?1:0;}
  }
}catch(e){const code=['USAGE','INPUT','PREVIOUS_INPUT','SETUP'].includes(e.message)?e.message:'INTERNAL';result={...base(),diagnostics:[{code,path:code==='PREVIOUS_INPUT'?'/previous':'',message:{USAGE:'Use --input FILE with optional --previous FILE, --expected-site HTTPS_ORIGIN, --label FULL_LABEL and --json. Run --help for examples.',INPUT:'Read a local regular configuration file with sufficient permissions.',PREVIOUS_INPUT:'Read a local regular previous configuration file with sufficient permissions.',SETUP:'Configuration runtime is missing or corrupt. Prepare source dependencies or rerun normal Pigboard preparation; this command never repairs dependencies.',INTERNAL:'Configuration checking could not complete. Check the prepared runtime and report this failure.'}[code]}]};}
if(result){if(json)console.log(JSON.stringify(result));else{
 console.log(`${result.valid?'Valid':'Invalid'} local configuration. Live readiness: not evaluated. Destination authority: ${result.destination_authority}.`);
 if(result.configuration_digest)console.log(`Authored configuration digest: ${result.configuration_digest}`);
 if(result.resolved_scope)console.log(`Resolved scope: ${JSON.stringify(result.resolved_scope,null,2)}`);
 if(result.streams.length)console.log(`Streams: ${JSON.stringify(result.streams,null,2)}`);
 if(result.preview){console.log(`Preview: ${JSON.stringify(result.preview,null,2)}`);if(result.preview.checks_required.length)console.log('Pending checks must inspect retained active, queued, Blocked and Human Review work, unresolved attempts and original stream occupancy. Unknown retained work keeps writes disabled. This local command cannot mark checks passed.');if(result.preview.status==='identity_change_held')console.log('Local inputs are valid; the site identity change is held. No state is deleted, migrated, released or enabled.');}
 for(const d of result.diagnostics)console.log(`${d.code} ${JSON.stringify(d.path)}: ${d.message}`);
 }process.exitCode=exit;}
