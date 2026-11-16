#!/usr/bin/env node
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
const args=process.argv.slice(2);let json=false;
const valueOptions=['--mode','--input','--format','--context','--config','--scheduling'];
for(let i=0;i<args.length;i++){if(valueOptions.includes(args[i]))i++;else if(args[i]==='--json')json=true;}
let options={format:'yaml'},result,exit=2;
const schedulingFields=()=>options.mode==='scheduling'?{purpose:'scheduling',validation_scope:'scheduling_declarations',scheduling_semantics_valid:null,execution_authorized:false}:{};
const diagnostic=(code,message,path='')=>({schema:'pigboard-work-validation/v1',mode:options.mode??null,format:options.format,document_schema:null,valid:false,draft_valid:null,start_structure_valid:null,start_semantics_valid:null,validation_scope:options.mode==='start'?'local_start':options.mode??null,ledger_budget:null,readiness:'not_evaluated',diagnostics:[{code,path,message}],start_diagnostics:[],...schedulingFields()});
const modes=['draft','structure','scheduling','start'];
const schemas=['pigboard-epic/v1','pigboard-ticket/v1','pigboard-work-validation-context/v1','pigboard-config/v1','pigboard-work-scheduling/v1'];
const help=`Validate local work (Node 20+).
Source: node scripts/validate-work.mjs --mode draft|structure|scheduling|start --input FILE [--format yaml|adf] [--json]
Scheduling additionally requires --config CONFIG.yaml --scheduling FACTS.yaml (separate canonical configuration and scheduling declarations).
Start additionally requires --context FACTS.yaml (trusted local YAML/JSON execution facts).
Installed: node /absolute/receipt/skills/work-validator/scripts/validate-work.mjs --mode scheduling --input FILE --config CONFIG.yaml --scheduling FACTS.yaml --json
Draft/structure: structure only; semantic and live readiness are not evaluated.
Scheduling: complete declarations only; execution readiness and human Ready to Work are not evaluated; execution is not authorized.
Start: local semantic checks; live readiness and test execution are not evaluated.
Configuration and facts are raw YAML/JSON in every work format. Accepted schemas: ${schemas.join(', ')}. See docs/authoring.md.
`;
async function readLocal(filePath,limit,code){
  let file;
  try{
    file=await open(filePath,constants.O_RDONLY|constants.O_NONBLOCK);
    if(!(await file.stat()).isFile())throw Error(code);
    const bytes=Buffer.alloc(limit+1);let count=0;
    while(count<bytes.length){const part=await file.read(bytes,count,bytes.length-count,null);if(!part.bytesRead)break;count+=part.bytesRead;}
    return bytes.subarray(0,count);
  }catch{throw Error(code);}finally{await file?.close();}
}
try{
  const seen=new Set();
  for(let i=0;i<args.length;i++){
    const key=args[i];
    if(![...valueOptions,'--json','--help'].includes(key)||seen.has(key))throw Error('USAGE');
    seen.add(key);
    if(key==='--json'||key==='--help'){options[key.slice(2)]=true;continue;}
    if(i+1===args.length)throw Error('USAGE');
    options[key.slice(2)]=args[++i];
  }
  if(options.help){
    if(args.some(a=>!['--help','--json'].includes(a)))throw Error('USAGE');
    if(json)console.log(JSON.stringify({schema:'pigboard-work-validation/v1',help,modes,schemas,readiness:'not_evaluated'}));else process.stdout.write(help);
    process.exitCode=0;
  }else{
    if(!modes.includes(options.mode)||!['yaml','adf'].includes(options.format)||!options.input)throw Error('USAGE');
    if(options.mode==='start'?!options.context:options.context!==undefined)throw Error('USAGE');
    if(options.mode==='scheduling'?(!options.config||!options.scheduling):(options.config!==undefined||options.scheduling!==undefined))throw Error('USAGE');
    let runtime;try{runtime=await import('../lib/contracts/work.mjs');}catch{throw Error('SETUP');}
    const bytes=await readLocal(options.input,options.format==='adf'?runtime.LIMITS.adfBytes:runtime.LIMITS.workBytes,'INPUT');
    if(options.mode==='scheduling'){
      const structure=runtime.validateWork(bytes,{mode:'structure',format:options.format});
      if(!structure.valid){result={...structure,mode:'scheduling',...schedulingFields()};exit=1;}
      else{
        const configInput=await readLocal(options.config,runtime.CONFIG_LIMITS.bytes,'CONFIG_INPUT');
        const schedulingInput=await readLocal(options.scheduling,runtime.LIMITS.workBytes,'SCHEDULING_INPUT');
        result=runtime.validateWork(bytes,{mode:'scheduling',format:options.format,configInput,schedulingInput});
        exit=result.valid?0:result.scheduling_semantics_valid===null?2:1;
      }
    }else{
      const contextInput=options.mode==='start'?await readLocal(options.context,runtime.LIMITS.workBytes,'CONTEXT_INPUT'):undefined;
      result=runtime.validateWork(bytes,{mode:options.mode,format:options.format,contextInput});
      exit=result.valid?0:result.diagnostics.some(d=>d.path.startsWith('/context'))?2:1;
    }
  }
}catch(e){
  const messages={
    USAGE:'Use --mode draft|structure --input FILE, --mode scheduling --input FILE --config CONFIG.yaml --scheduling FACTS.yaml, or --mode start --input FILE --context FACTS.yaml; add --json for structured output. Run --help for examples.',
    INPUT:'Read a local regular work file with sufficient permissions.',
    CONTEXT_INPUT:'Read a separate local regular context file with sufficient permissions.',
    CONFIG_INPUT:'Read a separate local regular canonical configuration file with sufficient permissions.',
    SCHEDULING_INPUT:'Read a separate local regular scheduling facts file with sufficient permissions.',
    SETUP:'Validation runtime is missing or corrupt. Prepare dependencies with npm ci for source use, or rerun Pigboard preparation for an installed release.',
    INTERNAL:'Validation could not complete. Check the prepared runtime and report this failure.',
  };
  const code=Object.hasOwn(messages,e.message)?e.message:'INTERNAL';
  result=diagnostic(code,messages[code],{CONTEXT_INPUT:'/context',CONFIG_INPUT:'/config',SCHEDULING_INPUT:'/scheduling'}[code]??'');
}
if(result){
  if(json)console.log(JSON.stringify(result));
  else{
    if(result.mode==='scheduling')console.log(`Scheduling declarations ${result.valid?'passed':'failed'}; execution readiness and human Ready to Work are not evaluated; execution is not authorized.`);
    else if(result.mode==='start')console.log(`Local start checks ${result.valid?'passed':'failed'}; live readiness and test execution are not evaluated.`);
    else console.log(`${result.valid?'Valid':'Invalid'} ${result.mode??'work'} structure. Structure only; semantic and live readiness are not evaluated.`);
    for(const[label,ds]of [['',result.diagnostics],['Start structure: ',result.start_diagnostics]])for(const d of ds)console.log(`${label}${d.code} ${JSON.stringify(d.path)}: ${d.message}${d.line?` (line ${d.line}, column ${d.column})`:''}${d.block!==undefined?` (ADF block ${d.block})`:''}`);
  }
  process.exitCode=exit;
}
