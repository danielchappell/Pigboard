import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, cp, readdir } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { stringify } from 'yaml';
import { parseWork, validateWork, validateValue, canonicalSchemas, checkValue, LIMITS } from '../lib/contracts/work.mjs';
const root = path.resolve(new URL('..',import.meta.url).pathname), cli = path.join(root,'scripts/validate-work.mjs');
const example = kind => readFile(path.join(root,`docs/architecture/examples/manager-${kind}.yaml`),'utf8');
const populated = parseWork(await example('ticket-populated'));
const skeleton = await example('ticket');
const epic = await example('epic-populated');
const adf = blocks => JSON.stringify({type:'doc',version:1,content:blocks.map(text=>({type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text}]}))});
const codeOf = result => result.diagnostics[0]?.code;
async function fixture(t) { const dir=await mkdtemp(path.join(os.tmpdir(),'pigboard-work-')); t.after(()=>rm(dir,{recursive:true,force:true})); return dir; }
function run(file,...args) { const p=spawnSync(process.execPath,[cli,'--mode','draft','--input',file,'--json',...args],{cwd:os.tmpdir(),encoding:'utf8',timeout:30000}); return { ...p, result:JSON.parse(p.stdout) }; }
function withValue(value,section='inputs') { const v=structuredClone(populated); const step=v.testing_strategy.cases[0].steps[section==='parameters'?2:0]; if(section==='parameters') step.database.parameters=[value]; else step.inputs={value}; return v; }

test('H01 all four reviewed examples: draft/start readable/JSON and zero input changes',async t=>{
 for(const kind of ['epic','ticket','epic-populated','ticket-populated']) {
  const text=await example(kind), file=path.join(root,`docs/architecture/examples/manager-${kind}.yaml`);
  for(const mode of ['draft','structure']) for(const json of [false,true]) {
   const p=spawnSync(process.execPath,[cli,'--mode',mode,'--input',file,...json?['--json']:[]],{encoding:'utf8',timeout:30000});
   assert.equal(p.status,mode==='structure'&&!kind.includes('populated')?1:0,kind+' '+p.stdout+p.stderr);
   if(json){const r=JSON.parse(p.stdout);assert.equal(r.readiness,'not_evaluated');assert.equal(r.start_structure_valid,kind.includes('populated'));assert.equal(r.valid,mode==='draft'||kind.includes('populated'));if(mode==='structure')assert.deepEqual(r.start_diagnostics,[]);}
   else assert.match(p.stdout,/Structure only; semantic and live readiness are not evaluated/);
  }
  assert.equal(await readFile(file,'utf8'),text);
 }
 const dir=await fixture(t), file=path.join(dir,'ticket.yaml');await writeFile(file,skeleton);
 const before=run(file).result; const value=parseWork(skeleton);value.acceptance_criteria[0].requirement='A complete supplied requirement';const filled=stringify(value);await writeFile(file,filled);
 const after=run(file).result;assert.equal(after.valid,true);assert(before.start_diagnostics.some(d=>d.path==='/acceptance_criteria/0/requirement'));assert(!after.start_diagnostics.some(d=>d.path==='/acceptance_criteria/0/requirement'));assert(after.start_diagnostics.some(d=>d.path==='/problem_to_solve'));assert.equal(await readFile(file,'utf8'),filled);
 t.diagnostic('H01 input byte comparisons unchanged after every command; exact first acceptance requirement error disappears.');
});
test('H01 canonical schemas moved; required keys, nulls, unknown fields and closed families',async()=>{
 assert.equal(Object.keys(canonicalSchemas).length,2);
 for(const kind of ['epic','ticket']) await assert.rejects(readFile(path.join(root,`docs/architecture/contracts/pigboard-${kind}-v1.schema.json`)),{code:'ENOENT'});
 for(const text of [skeleton,await example('epic')]) {const v=parseWork(text);for(const key of Object.keys(v)){const c=structuredClone(v);delete c[key];const r=validateValue(c);assert.equal(r.valid,false,key);assert(r.diagnostics.some(d=>d.path==='/'+key));}}
 for(const [name,s] of Object.entries(canonicalSchemas)) {
  function walk(schema,value,p=''){
   if(!schema||typeof schema!=='object')return;
   if(schema.$ref) schema=s.$defs[schema.$ref.split('/').at(-1)];
   if(value&&typeof value==='object'&&!Array.isArray(value)&&schema.properties){
    if(schema.additionalProperties===false){const copy=structuredClone(parseWork(name.includes('epic')?epic:awaitText));let node=copy;for(const part of p.split('/').slice(1))node=node[part];node['bad/~\nfield']=true;const r=validateValue(copy);assert.equal(r.valid,false,p);assert(r.diagnostics.some(d=>d.code==='UNKNOWN_FIELD'&&d.path.endsWith('/bad~1~0\nfield')),p);}
    for(const [key,child]of Object.entries(schema.properties))if(value[key]!==undefined)walk(child,value[key],p+'/'+key);
   } else if(Array.isArray(value)&&schema.items)value.forEach((v,i)=>walk(schema.items,v,p+'/'+i));
  }
  const awaitText=await example('ticket-populated');walk(s,parseWork(name.includes('epic')?epic:awaitText));
 }
 const v=parseWork(skeleton);delete v.technical_acceptance_criteria.repository.url;assert.equal(validateValue(v).valid,false);
 v.technical_acceptance_criteria.repository.url=12;assert.equal(validateValue(v).valid,false);
 const c=structuredClone(populated);c.problem_to_solve=null;assert(validateValue(c).valid);assert(!validateValue(c,{mode:'structure'}).valid);
 assert.equal(validateValue(populated,{mode:'structure'}).valid,true);
 const q=parseWork(skeleton);q.open_questions=[{question:null,owner:null}];assert(validateValue(q).valid);delete q.open_questions[0].owner;assert(!validateValue(q).valid);
});
test('H01 human-only ticket and semantic-invalid shape remain correctly bounded',async()=>{
 const human=JSON.parse(await readFile(path.join(root,'docs/delivery/manager-r1/ticket-drafts.json')))[0].contract;assert.equal(validateValue(human,{mode:'structure'}).valid,true);
 for(const mutate of [v=>v.acceptance_criteria.push(structuredClone(v.acceptance_criteria[0])),v=>v.testing_strategy.dispatch_order[0]='nonexistent',v=>v.problem_to_solve='   ']){const v=structuredClone(populated);mutate(v);assert.equal(validateValue(v,{mode:'structure'}).valid,true);}
});
test('H01 CLI numeric bound failures name the inclusive limit and exact field in readable and JSON output',async t=>{
 const dir=await fixture(t), file=path.join(dir,'numeric-bound.yaml');
 const status='/testing_strategy/cases/0/steps/0/api/expected_status', rows='/testing_strategy/cases/0/steps/2/database/scope/max_rows';
 const field=(value,pointer)=>pointer===status?value.testing_strategy.cases[0].steps[0].api:value.testing_strategy.cases[0].steps[2].database.scope;
 for(const [pointer,key,bad,code,message] of [[status,'expected_status',99,'MINIMUM','Supply a number greater than or equal to 100.'],[rows,'max_rows',201,'MAXIMUM','Supply a number less than or equal to 200.']]) {
  const value=structuredClone(populated);field(value,pointer)[key]=bad;value.problem_to_solve='PRIVATE_WORK_TEXT_MUST_NOT_BE_ECHOED';const input=stringify(value);await writeFile(file,input);
  for(const json of [false,true]) {
   const command=spawnSync(process.execPath,[cli,'--mode','structure','--input',file,...json?['--json']:[]],{encoding:'utf8',timeout:30000});assert.equal(command.status,1);assert.equal(command.stderr,'');assert(!command.stdout.includes('PRIVATE_WORK_TEXT_MUST_NOT_BE_ECHOED'));
   if(json){const result=JSON.parse(command.stdout);assert.equal(result.valid,false);assert.equal(result.start_structure_valid,false);assert(result.diagnostics.some(d=>d.path===pointer&&d.code===code&&d.message===message));}
   else assert(command.stdout.includes(`${code} ${JSON.stringify(pointer)}: ${message}`));
  }
  assert.equal(await readFile(file,'utf8'),input);
 }
 for(const [pointer,key,boundary] of [[status,'expected_status',100],[status,'expected_status',599],[rows,'max_rows',1],[rows,'max_rows',200]]) {
  const value=structuredClone(populated);field(value,pointer)[key]=boundary;await writeFile(file,stringify(value));
  for(const json of [false,true]) {
   const command=spawnSync(process.execPath,[cli,'--mode','structure','--input',file,...json?['--json']:[]],{encoding:'utf8',timeout:30000});assert.equal(command.status,0,command.stdout+command.stderr);assert.equal(command.stderr,'');
   if(json){const result=JSON.parse(command.stdout);assert.equal(result.valid,true);assert.equal(result.start_structure_valid,true);assert.deepEqual(result.diagnostics,[]);}else assert.match(command.stdout,/^Valid structure structure/);
  }
 }
});
test('H02 forbidden syntax, keys, directives, aliases, document boundaries and safe diagnostics',()=>{
 const bad=['schema: pigboard-epic/v1\nschema: pigboard-ticket/v1','a: {b: 1, b: 2}','a: 1\n"\\u0061": 2','1: a','true: a','null: a','[a]: b','{a: b}: c','1: a\n"1": b','a: &x [*x]','a: &x 1\nb: *x','a: !custom x','a: !!timestamp 2020-01-01','a: !!set {}','%YAML 1.1\n---\na: yes','%TAG !e! tag:example.org,2020:\n---\na: x','a: [','', 'null','[]','a: x\n---','---\n---','schema: pigboard-epic/v999'];
 for(const text of bad){const r=validateWork(text);assert(!r.valid,JSON.stringify(text));assert(r.diagnostics.length);assert(!JSON.stringify(r).includes('Error:'));}
 const duplicate=validateWork('schema: pigboard-epic/v1\nscope: {included: [], included: []}');assert.equal(duplicate.diagnostics[0].path,'/scope/included');assert(duplicate.diagnostics[0].line);
 const p=validateWork('schema: pigboard-epic/v1\nproblem_to_solve: "SECRET["\nunterminated: [');assert(!JSON.stringify(p).includes('SECRET'));
});
test('H02 nested inputs/SQL values: integer literals, nonfinite values, Unicode, inert strings and prototypes',()=>{
 for(const section of ['inputs','parameters']) for(const literal of ['.nan','.inf','-.inf','1e309','9007199254740992','-9007199254740992','0x20000000000000','0o400000000000000000']) {
  const text=stringify(withValue('MARK',section)).replace('MARK',literal);const r=validateWork(text);assert.equal(codeOf(r),'NUMBER',section+' '+literal);assert(r.diagnostics[0].path.includes(section==='inputs'?'/inputs/value':'/parameters/0'));
 }
 for(const literal of ['9007199254740991','-9007199254740991','0x1fffffffffffff','0o377777777777777777','1.5','1e20','1.7976931348623157e308']) { const text=stringify(withValue('MARK')).replace('MARK',literal);assert.equal(validateWork(text,{mode:'structure'}).valid,true,literal); }
 for(const literal of ['"\\uD800"','"\\uDC00"']) assert.equal(codeOf(validateWork(stringify(withValue('MARK')).replace('MARK',literal))),'UNICODE');
 assert.equal(codeOf(validateWork('"\\uD800": x')),'UNICODE');
 assert.equal(validateValue(withValue('😀')).valid,true);
 assert.equal(codeOf(validateWork(Buffer.from([0xff,0xfe]))),'UTF8');
 const v=withValue('$(touch /tmp/never) `id` ${SECRET}');v.testing_strategy.cases[0].steps[0].inputs=JSON.parse('{"__proto__":{"polluted":true},"constructor":"safe"}');assert(validateWork(stringify(v)).valid);assert.equal({}.polluted,undefined);
 const cycle={};cycle.x=cycle;for(const x of [cycle,undefined,()=>{},Symbol(),1n,NaN,Infinity,new Date(),{[Symbol()]:1},[,,],Object.defineProperty({},'x',{enumerable:true,get(){throw Error('must not execute')}})])assert.throws(()=>checkValue(x));
 const shared={x:1};assert.doesNotThrow(()=>checkValue([shared,shared]));
});
test('H02 public JS numeric guards are strict without a caller-selectable raw-number bypass',()=>{
 const invalid=[9007199254740992,-9007199254740992,Number('9007199254740993'),Number('-9007199254740993'),1e20,NaN,Infinity,-Infinity];
 for(const section of ['inputs','parameters']) for(const number of invalid) {
  const value=withValue(number,section), before=structuredClone(value);
  const field=section==='inputs'?'/testing_strategy/cases/0/steps/0/inputs/value':'/testing_strategy/cases/0/steps/2/database/parameters/0';
  for(const options of [{},{strictNumbers:false,allowUnsafeIntegers:true,trusted:true,parsed:true,astVerified:true}]) {
   assert.throws(()=>checkValue(value,options,false),error=>error.diagnostic?.code==='NUMBER'&&error.diagnostic.path===field);
   const result=validateValue(value,{mode:'structure',...options},false);assert.equal(result.valid,false);assert.equal(codeOf(result),'NUMBER');assert.equal(result.diagnostics[0].path,field);assert.equal(result.draft_valid,null);assert.equal(result.start_structure_valid,null);
   assert.deepEqual(value,before);
  }
 }
 for(const number of [9007199254740991,-9007199254740991,1.5,-1.5,Number.MIN_VALUE]) for(const section of ['inputs','parameters']) {
  const value=withValue(number,section), before=structuredClone(value);assert.equal(checkValue(value),value);assert.equal(validateValue(value,{mode:'structure'}).valid,true);assert.deepEqual(value,before);
 }
});
test('H02 raw YAML/ADF finite floats keep parser provenance only within validateWork and CLI',async t=>{
 const dir=await fixture(t), file=path.join(dir,'number.txt');
 for(const section of ['inputs','parameters']) for(const literal of ['1e20','-1e20','100000000000000000000.0','1.7976931348623157e308']) {
  const yaml=stringify(withValue('MARK',section)).replace('MARK',literal);
  const parsed=parseWork(yaml);assert.equal(codeOf(validateValue(parsed,{mode:'structure'})),'NUMBER');assert.throws(()=>checkValue(parsed),error=>error.diagnostic?.code==='NUMBER');
  for(const format of ['yaml','adf']) {
   const input=format==='yaml'?yaml:adf([yaml]);assert.equal(validateWork(input,{format,mode:'structure'}).valid,true);
   await writeFile(file,input);const command=run(file,'--format',format);assert.equal(command.status,0);assert.equal(command.result.valid,true);assert.equal(await readFile(file,'utf8'),input);
  }
 }
 const parsed=parseWork(stringify(withValue(1.5)));parsed.testing_strategy.cases[0].steps[0].inputs.value=9007199254740992;const before=JSON.stringify(parsed);assert.equal(codeOf(validateValue(parsed)),'NUMBER');assert.throws(()=>checkValue(parsed));assert.equal(JSON.stringify(parsed),before);assert.equal(Object.getPrototypeOf(parsed),null);
 for(const section of ['inputs','parameters']) for(const literal of ['9007199254740992','-9007199254740992','9007199254740993','-9007199254740993']) {
  const yaml=stringify(withValue('MARK',section)).replace('MARK',literal);
  for(const format of ['yaml','adf'])assert.equal(codeOf(validateWork(format==='yaml'?yaml:adf([yaml]),{format,mode:'structure'})),'NUMBER');
 }
});
test('H02 exact/+1 work byte, depth, list and UTF-8 limits with local measurements',t=>{
 const start=performance.now();
 const at=epic+'\n#'+ 'x'.repeat(LIMITS.workBytes-Buffer.byteLength(epic)-2);assert.equal(Buffer.byteLength(at),65536);assert(validateWork(at,{mode:'structure'}).valid);assert.equal(codeOf(validateWork(at+'x')),'BYTE_LIMIT');
 const unicode=epic+'\n#'+'é'.repeat(Math.floor((65536-Buffer.byteLength(epic)-2)/2));assert(validateWork(unicode).valid);assert.equal(codeOf(validateWork(unicode+'é')),'BYTE_LIMIT');
 const base=withValue(null);const depthFor=v=>{let n=0;function walk(x,d){if(x&&typeof x==='object'){n=Math.max(n,d+1);Object.values(x).forEach(y=>walk(y,d+1));}}walk(v,0);return n;};
 while(depthFor(base)<32){const input=base.testing_strategy.cases[0].steps[0].inputs;input.value={value:input.value};}assert.equal(depthFor(base),32);assert(validateWork(stringify(base),{mode:'structure'}).valid);base.testing_strategy.cases[0].steps[0].inputs.value={value:base.testing_strategy.cases[0].steps[0].inputs.value};assert.equal(codeOf(validateWork(stringify(base))),'DEPTH_LIMIT');
 assert(validateWork(stringify(withValue(Array(100).fill(null)))).valid);assert.equal(codeOf(validateWork(stringify(withValue(Array(101).fill(null))))),'LIST_LIMIT');
 assert(['YAML_SYNTAX','DEPTH_LIMIT'].includes(codeOf(validateWork('a: '+ '['.repeat(5000)+'0'+']'.repeat(5000)))));
 t.diagnostic(JSON.stringify({localOnly:true,elapsedMs:Math.round(performance.now()-start),peakRSSBytes:process.resourceUsage().maxRSS*1024,bounds:LIMITS}));
});
test('H02 ADF safe selection, ambiguity, code-block children, envelope bounds and no prose guessing',()=>{
 assert(validateWork(adf([epic]),{format:'adf',mode:'structure'}).valid);
 for(const blocks of [[],['print(1)'],[epic,epic],[epic,epic.replace('/v1','/v9')]])assert(!validateWork(adf(blocks),{format:'adf'}).valid);
 assert(!validateWork(adf([epic,'bad: [']),{format:'adf'}).valid);
 assert.equal(codeOf(validateWork('{"type":"doc","type":"doc","version":1,"content":[]}',{format:'adf'})),'DUPLICATE_KEY');
 assert.equal(codeOf(validateWork(JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',content:[{type:'paragraph',text:epic}]}]}),{format:'adf'})),'ADF_BLOCK');
 const ordinary={type:'codeBlock',content:[{type:'text',text:'nested: {schema: pigboard-epic/v1}'}]};
 assert(validateWork(JSON.stringify({type:'doc',version:1,content:[{type:'paragraph',content:[{type:'text',text:epic}]},ordinary,{type:'codeBlock',content:[{type:'text',text:epic}]}]}),{format:'adf'}).valid);
 assert.equal(codeOf(validateWork(adf(Array(101).fill('a: x')),{format:'adf'})),'BLOCK_LIMIT');
 assert.equal(codeOf(validateWork(' '.repeat(262145),{format:'adf'})),'BYTE_LIMIT');
 const document={type:'doc',version:1,content:[{type:'codeBlock',content:[{type:'text',text:epic}]}],padding:'x'};let text=JSON.stringify(document);document.padding='x'.repeat(262144-Buffer.byteLength(text)+1);text=JSON.stringify(document);assert.equal(Buffer.byteLength(text),262144);assert(validateWork(text,{format:'adf'}).valid);assert.equal(codeOf(validateWork(text+' ',{format:'adf'})),'BYTE_LIMIT');
 assert.equal(codeOf(validateWork(adf([epic+'\n#'+'x'.repeat(65536)]),{format:'adf'})),'BYTE_LIMIT');
 assert(validateWork(adf([epic,...Array(99).fill('a: x')]),{format:'adf'}).valid);
 const nodes=Array.from({length:999},()=>({type:'paragraph',content:[]}));nodes.push({type:'codeBlock',content:[{type:'text',text:epic}]});const envelope={type:'doc',version:1,content:nodes};assert(validateWork(JSON.stringify(envelope),{format:'adf'}).valid);envelope.content.push({type:'paragraph'});assert.equal(codeOf(validateWork(JSON.stringify(envelope),{format:'adf'})),'LIST_LIMIT');
 const depthEnvelope={type:'doc',version:1,content:[{type:'codeBlock',content:[{type:'text',text:epic}]}],padding:null};let data=null;for(let i=0;i<31;i++)data={value:data};depthEnvelope.padding=data;assert(validateWork(JSON.stringify(depthEnvelope),{format:'adf'}).valid);depthEnvelope.padding={value:data};assert.equal(codeOf(validateWork(JSON.stringify(depthEnvelope),{format:'adf'})),'DEPTH_LIMIT');

});
test('H02 malformed ADF language metadata returns controlled block diagnostics in helper and CLI',async t=>{
 const dir=await fixture(t), file=path.join(dir,'description.json');
 const block=(text,language)=>({type:'codeBlock',attrs:{language},content:[{type:'text',text}]});
 for(const language of [{toLowerCase:'bad'},{toLowerCase:null},{},[],['yaml'],true,1,null]) {
  const input=JSON.stringify({type:'doc',version:1,content:[{type:'paragraph',content:[]},block('ordinary code','python'),block(epic,language)]});
  let result;assert.doesNotThrow(()=>{result=validateWork(input,{format:'adf'});});
  assert.equal(result.valid,false);assert.equal(codeOf(result),'ADF_BLOCK');assert.equal(result.diagnostics[0].block,1);
  await writeFile(file,input);const command=run(file,'--format','adf');assert.equal(command.status,1);assert.equal(codeOf(command.result),'ADF_BLOCK');assert.equal(command.result.diagnostics[0].block,1);assert.equal(command.stderr,'');
 }
 for(const language of ['python','', 'YaML',undefined]) {
  const input=JSON.stringify({type:'doc',version:1,content:[block('ordinary code: [','python'),block(epic,language)]});
  assert.equal(validateWork(input,{format:'adf'}).valid,true);
  await writeFile(file,input);assert.equal(run(file,'--format','adf').status,0);
 }
});
test('H02 actual CLI argument/read/setup boundaries including dash names and nonblocking FIFO',async t=>{
 const dir=await fixture(t), file=path.join(dir,'-input');await writeFile(file,epic);assert.equal(run(file).status,0);
 await writeFile(path.join(dir,'--json'),epic);const dash=spawnSync(process.execPath,[cli,'--mode','draft','--input','--json'],{cwd:dir,encoding:'utf8',timeout:30000});assert.equal(dash.status,0);assert.match(dash.stdout,/^Valid draft structure/);
 for(const args of [[],['--mode','bogus','--input',file],['--mode','draft','--input',file,'extra'],['--mode','draft','--mode','draft','--input',file],['--mode','draft','--input',file,'--json','--json'],['--input'],['--help','--mode','draft']]) {const p=spawnSync(process.execPath,[cli,'--json',...args],{encoding:'utf8',timeout:30000});assert.equal(p.status,2);assert.equal(JSON.parse(p.stdout).diagnostics[0].code,'USAGE');}
 for(const bad of [dir,path.join(dir,'missing')]) assert.equal(run(bad).result.diagnostics[0].code,'INPUT');
 if(process.platform!=='win32'){const fifo=path.join(dir,'fifo');execFileSync('mkfifo',[fifo]);assert.equal(run(fifo).result.diagnostics[0].code,'INPUT');}
 const broken=path.join(dir,'broken/scripts');await mkdir(broken,{recursive:true});await cp(cli,path.join(broken,'validate-work.mjs'));const p=spawnSync(process.execPath,[path.join(broken,'validate-work.mjs'),'--mode','draft','--input',file,'--json'],{encoding:'utf8',timeout:30000});assert.equal(p.status,2);assert.equal(JSON.parse(p.stdout).diagnostics[0].code,'SETUP');
});
test('H02 actual CLI external side-effect audit and before/after fixture tree',async t=>{
 const dir=await fixture(t), input=path.join(dir,'work.yaml'), guard=path.join(dir,'guard.mjs');await writeFile(input,epic);
 await writeFile(guard,`import fs from 'node:fs';import fsp from 'node:fs/promises';import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';let count=0;const deny=()=>{count++;throw Error('unexpected effect')};for(const obj of [fs,fsp])for(const key of ['writeFile','appendFile','mkdir','rm','rmdir','unlink','rename','copyFile','cp','symlink','link','chmod','chown','truncate','write','writev','createWriteStream'])for(const name of [key,key+'Sync'])if(typeof obj[name]==='function')obj[name]=deny;const original=fsp.open;fsp.open=async(...args)=>{if(args[1]!==undefined&&args[1]!==0&&args[1]!==fs.constants.O_NONBLOCK&&args[1]!=='r')deny();const h=await original(...args);for(const key of ['write','writeFile','appendFile','writev','truncate','chmod','chown'])h[key]=deny;return h;};for(const obj of [http,https])for(const key of ['request','get'])obj[key]=deny;for(const obj of [net,tls])for(const key of ['connect','createConnection','createServer'])if(obj[key])obj[key]=deny;for(const key of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork'])cp[key]=deny;globalThis.fetch=deny;syncBuiltinESMExports();process.on('exit',()=>process.stderr.write('AUDIT attemptedEffects='+count+'\\n'));
`);
 const before=await readdir(dir);const p=spawnSync(process.execPath,['--import',guard,cli,'--mode','structure','--input',input,'--json'],{cwd:dir,encoding:'utf8',timeout:30000});assert.equal(p.status,0,p.stderr+p.stdout);assert.equal(JSON.parse(p.stdout).valid,true);assert.match(p.stderr,/AUDIT attemptedEffects=0/);assert.deepEqual(await readdir(dir),before);assert.equal(await readFile(input,'utf8'),epic);t.diagnostic(p.stderr.trim()+'; fixture tree and input unchanged.');
});
