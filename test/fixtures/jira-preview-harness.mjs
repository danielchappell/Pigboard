// Test-process HTTPS redirection only. Production has no fixture transport option.
import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const here=path.dirname(fileURLToPath(import.meta.url));
export const fixtureCases=JSON.parse(fs.readFileSync(path.join(here,'jira-preview-cases.json'),'utf8'));
const tls=JSON.parse(fs.readFileSync(path.join(here,'jira-preview-tls.json'),'utf8'));
const digest=b=>createHash('sha256').update(b).digest('hex');
const fixedPrefix='/ex/jira/00000000-0000-0000-0000-000000000001';
const jiraSourcePaths=['lib/jira/read.mjs','test/fixtures/jira-preview-harness.mjs','test/fixtures/jira-preview-cases.json','test/fixtures/jira-preview-tls.json'];
function oracleCheck(report,oracle,trace){assert.equal(report.status,oracle.status);if(oracle.code)assert(report.diagnostics.some(d=>d.code===oracle.code),JSON.stringify(report));else assert.deepEqual(report.diagnostics,[]);assert.equal(report.counters.requests_attempted,oracle.calls);assert.equal(trace.length,oracle.calls);if(oracle.trace)assert.deepEqual(trace,oracle.trace);if(oracle.counters)for(const [k,value]of Object.entries(oracle.counters))assert.equal(report.counters[k],value,k);if(oracle.diagnostic)assert(report.diagnostics.some(d=>Object.entries(oracle.diagnostic).every(([k,value])=>d[k]===value)));if(oracle.cleanup_resolver)assert.equal(report.cleanup.resolver,oracle.cleanup_resolver);assert.equal(report.domain_complete,false);assert.equal(report.admission,'not_evaluated');assert.equal(report.receipt_proof,'not_evaluated');}

async function runtimeSources(root){
 const manifest=JSON.parse(await fsp.readFile(path.join(root,'config/skill-bundle.json'),'utf8'));
 return [...new Set([...manifest.validatorPayload.sources,...jiraSourcePaths])];
}
async function runtimeSnapshot(root, missing = []) {
 const entries=[];
 for(const relative of await runtimeSources(root)){
  try{assert((await fsp.lstat(path.join(root,relative))).isFile());entries.push([relative,digest(await fsp.readFile(path.join(root,relative)))]);}
  catch(error){if(!missing.includes(relative)||error.code!=='ENOENT')throw error;entries.push([relative,null]);}
 }
 async function walk(relative){for(const entry of await fsp.readdir(path.join(root,relative),{withFileTypes:true})){const file=relative+'/'+entry.name;if(entry.isDirectory())await walk(file);else if(entry.isFile())entries.push([file,digest(await fsp.readFile(path.join(root,file)))]);else assert(entry.isSymbolicLink());}}
 await walk('node_modules');return Object.fromEntries(entries.sort(([a],[b])=>a.localeCompare(b)));
}
const inputSnapshot=v=>Object.fromEntries(['config','request','script'].map(k=>[k,digest(JSON.stringify(v[k]))]));

export async function runFixture(caseId,variant,runtime,{control=false,privateProjection=false}={}) {
 const authored=fixtureCases.variants.find(v=>v.case===caseId&&v.variant===variant);if(!authored)throw Error('Use a prescribed case and variant.');
 const v=structuredClone(authored),root=path.resolve(runtime),trace=[],serverTrace=[];let disposable=null;
 if(control){assert(v.control);if(v.control.bound)v.config.jira.read_bounds[v.control.bound]=v.control.value;if(v.control.immediate){delete v.resolver_delay_ms;for(const step of v.script){delete step.header_delay_ms;delete step.body_delay_ms;}}v.oracle=v.control.oracle;}
 for(const entry of fixtureCases.variants)for(const [i,step]of entry.script.entries())if(Object.hasOwn(step,'wire_prefix')){if(entry.variant==='total-byte-limit'){assert.equal(i,0);assert.equal(step.wire_prefix,' '.repeat(256));}else{assert.equal(entry.case,'R1-42-H02');assert(['exact-wire-stop','exact-two-issue-control'].includes(entry.variant));assert.equal(i,3);assert.equal(step.wire_prefix,' '.repeat(600));}}
 if(privateProjection){assert(v.private_projection);if(v.private_projection.omit_wire_prefix)delete v.script[0].wire_prefix;v.config.jira.read_bounds.max_total_response_bytes=v.private_projection.bound;v.oracle=v.private_projection.oracle;}
 const before={cases:digest(fs.readFileSync(path.join(here,'jira-preview-cases.json'))),tls:digest(fs.readFileSync(path.join(here,'jira-preview-tls.json')))};
 const inputBefore=inputSnapshot(v);let moduleRoot=root,missing=[];
 if(variant==='damaged-copy'){
  const original=await runtimeSnapshot(root),sources=await runtimeSources(root);
  disposable=await fsp.mkdtemp(path.join(os.tmpdir(),'pigboard-jira-damaged-'));
  for(const relative of sources){const target=path.join(disposable,relative);await fsp.mkdir(path.dirname(target),{recursive:true});await fsp.cp(path.join(root,relative),target);}
  await fsp.cp(path.join(root,'node_modules'),path.join(disposable,'node_modules'),{recursive:true});assert.deepEqual(await runtimeSnapshot(disposable),original);
  await fsp.rm(path.join(disposable,'lib/config/projects.mjs'));moduleRoot=disposable;missing=['lib/config/projects.mjs'];
 }
 const runtimeBefore=await runtimeSnapshot(moduleRoot,missing);
 let inspect;
 try{({inspectJiraIssues:inspect}=await import(pathToFileURL(path.join(moduleRoot,'lib/jira/read.mjs')).href));}
 catch{
  const runtimeAfter=await runtimeSnapshot(moduleRoot,missing),inputAfter=inputSnapshot(v);assert.deepEqual(runtimeAfter,runtimeBefore);assert.deepEqual(inputAfter,inputBefore);
  if(disposable)await fsp.rm(disposable,{recursive:true,force:true});
  const report={status:'setup_failed',diagnostics:[{code:'SETUP_MISSING',message:'Prepare the complete copied validator; no source fallback or dependency repair was attempted.'}],counters:{requests_attempted:0},domain_complete:false,admission:'not_evaluated',receipt_proof:'not_evaluated'};oracleCheck(report,v.oracle,trace);
  return {report,trace,server_trace:[],fixture_hashes:before,input_hashes:{before:inputBefore,after:inputAfter},runtime_hashes:{before:runtimeBefore,after:runtimeAfter},effects:0,resolver_calls:0,cleanup_complete:true,oracle_matched:true};
 }
 if(disposable){await fsp.rm(disposable,{recursive:true,force:true});throw Error('Damaged copy unexpectedly imported.');}
 const sockets=new Set(),timers=new Set();let scriptIndex=0,serverError=null,redirectRequests=0;
 const redirect=https.createServer({key:tls.key,cert:tls.cert},(req,res)=>{redirectRequests++;res.end('{}');});
 await new Promise(resolve=>redirect.listen(0,'127.0.0.1',resolve));
 const server=https.createServer({key:v.tls==='future-certificate'?tls.future.key:tls.key,cert:v.tls==='future-certificate'?tls.future.cert:tls.cert},(req,res)=>{
  serverTrace.push({method:req.method,path:req.url});const step=v.script[scriptIndex++];
  if(!step||step.path!==req.url||req.method!=='GET'||req.headers.authorization!=='Bearer '+fixtureCases.token){serverError='Unexpected fixture operation.';res.writeHead(500);res.end('{}');return;}
  const later=(fn,delay)=>{if(delay){const t=setTimeout(()=>{timers.delete(t);fn();},delay);timers.add(t);}else fn();};
  later(()=>{if(res.destroyed)return;res.writeHead(step.status,{'content-type':'application/json',...(step.encoding?{'content-encoding':step.encoding}:{}),...(step.status===302?{location:`https://localhost:${redirect.address().port}/leak`}:{})});if(step.body_delay_ms)res.flushHeaders();later(()=>{if(!res.destroyed)res.end((step.wire_prefix??'')+JSON.stringify(step.body));},step.body_delay_ms);},step.header_delay_ms);
 });server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));if(v.tls==='connection-reset-control')socket.destroy();});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const originals={request:https.request,httpRequest:http.request,httpGet:http.get,fetch:globalThis.fetch};const restore=[];let effects=0,resolverCalls=0,resolverTimer=null,lateResolve=null,lateAck=null,lateSignal=null,lateDelivered=0,lateSettled=0,lateEvidence=null,mutations=0,getterCalls=0,tlsObservation=null;
 const callerRequest=structuredClone(v.request);
 const deny=()=>{effects++;throw Error('Disallowed fixture effect.');};
 for(const api of [fs,fsp])for(const name of ['writeFile','appendFile','mkdir','rm','rmdir','unlink','rename','copyFile','cp','symlink','link','chmod','chown','truncate','write','writev','createWriteStream'])for(const k of [name,name+'Sync'])if(typeof api[k]==='function'){const old=api[k];restore.push(()=>{api[k]=old;});api[k]=deny;}
 for(const k of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork']){const old=cp[k];restore.push(()=>{cp[k]=old;});cp[k]=deny;}
 http.request=deny;http.get=deny;globalThis.fetch=deny;
 https.request=(url,options,callback)=>{
  assert.equal(url.origin,'https://api.atlassian.com');assert(url.pathname.startsWith(fixedPrefix+'/rest/api/3/issue/'));assert.equal(options.method,'GET');assert.equal(options.agent,false);assert.equal(options.rejectUnauthorized,true);assert.equal(options.headers['Accept-Encoding'],'identity');assert.equal(options.headers.Authorization,'Bearer '+fixtureCases.token);
  const operation=url.pathname.slice(fixedPrefix.length)+url.search;
  // Audit before redirecting; fixture scripts alone determine permitted paths.
  assert.equal(operation,v.script[trace.length]?.path??operation);trace.push({method:options.method,path:operation});
  const local=new URL('https://localhost:'+server.address().port+operation);
  const client=originals.request(local,{...options,hostname:'127.0.0.1',servername:v.tls==='wrong-host'?'wrong.example.invalid':'localhost',...(v.tls==='untrusted-ca'?{}:{ca:v.tls==='future-certificate'?tls.future.ca:tls.ca})},callback);
  if(v.case==='R1-42-H04'){
   assert.equal(tlsObservation,null);
   tlsObservation={socket_observed:false,request_error_observed:false,secure_connect_observed:false,authorized:null,authorization_error_present:null};
   client.on('socket',socket=>{tlsObservation.socket_observed=true;socket.on('secureConnect',()=>{tlsObservation.secure_connect_observed=true;});});
   client.on('error',()=>{tlsObservation.request_error_observed=true;const socket=client.socket;if(socket){tlsObservation.authorized=typeof socket.authorized==='boolean'?socket.authorized:null;tlsObservation.authorization_error_present=typeof socket.authorizationError==='string'&&socket.authorizationError.length>0;}});
  }
  return client;
 };
 syncBuiltinESMExports();
 let acquired;
 async function acknowledgeLate(check){
  const snapshot=check?JSON.stringify({report:acquired.report,observations:acquired.observations}):null,requestsBefore=trace.length;
  if(check){assert(lateSignal.aborted);assert.equal(lateDelivered,0);assert.equal(lateSettled,0);assert.equal(requestsBefore,0);}
  if(lateDelivered===0){lateDelivered++;lateResolve(fixtureCases.token);}
  await lateAck;await new Promise(resolve=>setImmediate(resolve));
  if(check){assert.equal(JSON.stringify({report:acquired.report,observations:acquired.observations}),snapshot);lateEvidence={delivered:lateDelivered,settled:lateSettled,signal_aborted:lateSignal.aborted,requests_before:requestsBefore,requests_after:trace.length};assert.deepEqual(lateEvidence,{delivered:1,settled:1,signal_aborted:true,requests_before:0,requests_after:0});assert.equal(acquired.report.cleanup.resolver,'cancel_unconfirmed');}
 }
 try{
  acquired=await inspect(JSON.stringify(v.config),callerRequest,{resolveSecret(reference,signal){resolverCalls++;assert.equal(reference,v.config.jira.connection.secret_reference);if(v.resolver==='mutate-values'||v.resolver==='replace-accessors')return Promise.resolve().then(()=>{mutations++;if(v.resolver==='mutate-values'){callerRequest.issue_ids[0]='1001';callerRequest.comment_targets[0].ticket_id='1001';callerRequest.comment_targets[0].comment_id='2002';}else for(const name of ['issue_ids','comment_targets'])Object.defineProperty(callerRequest,name,{get(){getterCalls++;throw Error('ERROR-CANARY');}});return fixtureCases.token;});if(v.resolver==='reject')throw Error('ERROR-CANARY '+fixtureCases.token);if(v.resolver==='abort')return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('ERROR-CANARY')),{once:true}));if(v.resolver==='late'){lateSignal=signal;const deferred=new Promise(resolve=>{lateResolve=resolve;});lateAck=deferred.then(()=>{lateSettled++;});return deferred;}if(v.resolver_delay_ms)return new Promise(resolve=>{resolverTimer=setTimeout(()=>resolve(fixtureCases.token),v.resolver_delay_ms);});return fixtureCases.token;}});
  if(v.resolver==='late')await acknowledgeLate(true);
 }finally{
  try{if(lateResolve&&lateDelivered===0)await acknowledgeLate(false);}finally{
  https.request=originals.request;http.request=originals.httpRequest;http.get=originals.httpGet;globalThis.fetch=originals.fetch;for(const undo of restore)undo();syncBuiltinESMExports();
  clearTimeout(resolverTimer);for(const timer of timers)clearTimeout(timer);const closing=[...sockets].map(socket=>new Promise(resolve=>socket.once('close',resolve)));for(const socket of sockets)socket.destroy();await Promise.all([...closing,new Promise(resolve=>server.close(resolve)),new Promise(resolve=>redirect.close(resolve))]);
  }
 }
 assert.equal(sockets.size,0);const report=acquired.report;oracleCheck(report,v.oracle,trace);if(v.oracle.issue_rows)assert.deepEqual(report.issues,v.oracle.issue_rows);let privateComparison=null;if(v.oracle.acquisition){assert.deepEqual(acquired.observations,v.oracle.acquisition);privateComparison={algorithm:'sha256',actual_sha256:digest(JSON.stringify(acquired.observations)),expected_sha256:digest(JSON.stringify(v.oracle.acquisition)),matched:true};}assert.equal(effects,0);assert.equal(redirectRequests,0);assert.equal(serverError,null);assert.equal(report.counters.requests_completed+report.counters.requests_failed,report.counters.requests_attempted);assert.equal(JSON.stringify(acquired),JSON.stringify({report}));
 for(const canary of [fixtureCases.token,'ERROR-CANARY',v.config.jira.connection.secret_reference])assert(!JSON.stringify(acquired).includes(canary));
 assert.equal(digest(fs.readFileSync(path.join(here,'jira-preview-cases.json'))),before.cases);assert.equal(digest(fs.readFileSync(path.join(here,'jira-preview-tls.json'))),before.tls);
 const inputAfter=inputSnapshot(v),runtimeAfter=await runtimeSnapshot(moduleRoot,missing);assert.deepEqual(inputAfter,inputBefore);assert.deepEqual(runtimeAfter,runtimeBefore);
 return {report,trace,server_trace:serverTrace,fixture_hashes:before,input_hashes:{before:inputBefore,after:inputAfter},runtime_hashes:{before:runtimeBefore,after:runtimeAfter},private_comparison:privateComparison,tls_observation:tlsObservation,...(lateEvidence?{late_resolver:lateEvidence}:{}),effects,resolver_calls:resolverCalls,mutations,getter_calls:getterCalls,cleanup_complete:sockets.size===0,oracle_matched:true};
}

// Dedicated local fixture command. Importing runFixture never starts a read.
let isMain=false;
if(process.argv[1]){
 try{isMain=fs.realpathSync(process.argv[1])===fs.realpathSync(fileURLToPath(import.meta.url));}
 catch{/* An imported harness need not have a resolvable host entry. */}
}
if(isMain){
 let json=false,selected=null,failedRole=null;
 const runs=[],runRoles=[];
 try{
  const args=process.argv.slice(2),values={};
  for(let i=0;i<args.length;i++){
   if(args[i]==='--json'){json=true;continue;}
   if(!['--case','--variant','--runtime'].includes(args[i])||values[args[i]]||!args[i+1])throw Error('Invalid fixture selection.');
   values[args[i]]=args[++i];
  }
  if(Object.keys(values).length!==3)throw Error('Invalid fixture selection.');
  selected=fixtureCases.variants.find(v=>v.case===values['--case']&&v.variant===values['--variant']);
  if(!selected)throw Error('Invalid fixture selection.');
  for(const [role,options]of [['main',{}],...(selected.control?[['control',{control:true}]]:[]),...(selected.private_projection?[['private_projection',{privateProjection:true}]]:[])]){
   failedRole=role;
   const run=await runFixture(selected.case,selected.variant,values['--runtime'],options);
   runs.push(run);runRoles.push(role);failedRole=null;
  }
  if(json)console.log(JSON.stringify({case:selected.case,variant:selected.variant,runs}));
  else{console.log(selected.case+' / '+selected.variant+': literal oracle matched. Human acceptance remains a separate review.');for(const run of runs)console.log(JSON.stringify(run.report,null,2));}
 }catch(error){
  const selectionFailed=!selected,setupFailed=!selectionFailed&&['ENOENT','ERR_MODULE_NOT_FOUND'].includes(error?.code);
  const status=selectionFailed?'selection_failed':setupFailed?'setup_failed':'fixture_failed';
  const diagnostic=selectionFailed
   ?{code:'FIXTURE_SELECTION_INVALID',message:'Use --case CASE --variant NAME --runtime ROOT [--json] with a prescribed case and variant; no fixture run was started.'}
   :setupFailed
    ?{code:'SETUP_MISSING',message:'A required runtime file or module is unavailable. Prepare the complete explicit runtime; no fallback or repair was attempted. Completed runs are retained.'}
    :{code:'FIXTURE_RUN_FAILED',message:'The fixture run did not verify. Retain completed runs and inspect the prescribed check; do not treat this as missing setup or a passing observation.'};
  console.log(JSON.stringify({status,diagnostics:[diagnostic],case:selected?.case??null,variant:selected?.variant??null,runs,run_roles:runRoles,failed_run:failedRole?{role:failedRole,observations:'unavailable',cleanup:'not_reported'}:null,domain_complete:false,admission:'not_evaluated',receipt_proof:'not_evaluated'}));
  process.exitCode=2;
 }
}
