import https from 'node:https';
import crypto from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {parseConfig} from '../lib/config/parse.mjs';
import {createDynamoState} from '../lib/aws/dynamodb.mjs';
import {StateProvider,fixture as stateFixture} from '../test/helpers/state-provider.mjs';
import {runApply} from '../lib/aws/manager-lambda.mjs';
import {applyOrdinary} from '../lib/manager/apply.mjs';
export const packet=JSON.parse(readFileSync(new URL('../test/fixtures/manager-apply.json',import.meta.url),'utf8'));
const tls=JSON.parse(readFileSync(new URL('../test/fixtures/jira-preview-tls.json',import.meta.url),'utf8'));
/** Disposable providers only. No live URL, credential or transport option. */
export async function runApplyFixture({fault=null,global=false,repeat=false,hold=null,host=false,enabled=true,twoStreams=false,bug=false}={}){
 const p=structuredClone(packet),config=p.config;if(twoStreams)p.issues=p.dispatch_issues;if(bug)p.issues[1]=p.bug_issue;if(global||hold==='global-only transition')config.manager.transition_edges[0].global=true;
 if(hold==='paused Epic')p.issues[0].fields.status.id='1';
 if(hold==='unauthorized scope')p.issues[1].fields.project.id='999';
 if(['queued repair','five Human Review'].includes(hold)){const count=hold==='queued repair'?1:5;for(let n=0;n<count;n++){const issue=structuredClone(p.issues[1]);issue.id=String(1100+n);issue.key='EX-'+String(100+n);issue.fields.status.id=hold==='queued repair'?'6':'5';p.issues.push(issue);}}
 if(!enabled){config.manager.controls.schedule_enabled=false;config.manager.controls.writes_enabled=false;}
 const parsed=parseConfig(JSON.stringify(config));assert.equal(parsed.valid,true);
 const control={configuration_digest:parsed.configuration_digest,schedule_enabled:enabled,writes_enabled:enabled,maintenance:false};
 const binding={...stateFixture.binding,site:config.jira.site,installation_id:config.manager.installation_id,domain_id:config.manager.domain_id,configuration_digest:parsed.configuration_digest};
 const provider=new StateProvider(binding),disabled=createDynamoState({binding,control:{...control,schedule_enabled:false,writes_enabled:false},client:provider});
 assert.equal((await disabled.initialize({fresh_installation:{...stateFixture.fresh,installation_id:binding.installation_id,domain_id:binding.domain_id,site:binding.site,configuration_digest:binding.configuration_digest,installation_generation:binding.installation_generation,observed_at:p.time},now:p.time})).status,'confirmed');if(enabled)provider.enable();
 const real=createDynamoState({binding,control,client:provider}),stateCalls=[],trace=[],mutations=[],events=[],issues=p.issues,comments=new Map(),pointers=new Map();let injected=false,scan=0;
 const state=Object.fromEntries(Object.keys(real).map(name=>[name,async input=>{const call={name,input:structuredClone(input)};stateCalls.push(call);events.push('state:'+name);const boundary={retainMembers:stateCalls.filter(c=>c.name==='retainMembers').length===1?'member':'assignment',begin:'intent',finalize:'finalize'}[name];const proofInjection=p.oracle.proof_boundary_injections?.[fault];if(!injected&&proofInjection?.state_call===name){provider.fault=proofInjection.fault;injected=true;}else if(!injected&&!proofInjection&&fault?.startsWith(boundary+':')){provider.fault=fault.endsWith(':after')?'after':'before';injected=true;}const result=await real[name](input);call.result=structuredClone(result);return result;} ]));
 let serverError=null,workerCalls=0,uuidIndex=0,currentComment=p.comment,currentMutationOracle=p.oracle.mutations;const sockets=new Set();
 const server=https.createServer({key:tls.key,cert:tls.cert},async(req,res)=>{try{
  let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):null;const path=req.url;trace.push({method:req.method,path,body});assert.equal(req.headers.authorization,'Bearer LOCAL_APPLY_DUMMY');
  const mutation=req.method!=='GET'&&!path.includes('/search/');let boundary=path.endsWith('/comment')?'comment':path.endsWith('/transitions')?'transition':mutation?'pointer':null;
  const shouldFault=!injected&&fault?.startsWith(boundary+':');if(shouldFault&&fault.endsWith(':before')){injected=true;req.socket.destroy();return;}
  let value={},status=200;
  if(path==='/rest/api/3/search/jql'){
   if(body.jql.includes('labels = "pigboard"'))scan++;
   if(hold==='incomplete shared discovery'){res.writeHead(403);res.end('{}');return;}
   if(!injected&&fault?.startsWith('source-check:')&&scan===2){injected=true;if(fault.endsWith(':before')){req.socket.destroy();return;}res.writeHead(403);res.end('{}');return;}
   const matches=body.jql.includes('labels = "pigboard"')?issues.filter(i=>i.fields.labels.includes('pigboard')):body.jql.includes('parent = "900"')?issues.filter(i=>i.fields.parent?.id==='900'):issues.filter(i=>i.fields.labels.includes(body.jql.match(/labels = "([^"]+)"/)?.[1]));
   value={issues:matches,isLast:true};
  }else{
   const m=path.match(/^\/rest\/api\/3\/issue\/([^/?]+)(.*)$/);assert(m);const issue=issues.find(i=>i.id===m[1]||i.key===m[1]);assert(issue);const suffix=m[2],id=issue.id;
   if(mutation){events.push('jira:'+req.method+':'+path);const reservation=stateCalls.findLast(c=>c.name==='begin');assert.equal(reservation?.result?.status,'confirmed','Jira effects require confirmed original begin');if(suffix==='/comment'){const record=JSON.parse(body.body.content[0].content[0].text);if(record.record_id===p.fresh_attempt_id){currentComment=p.fresh_comment;currentMutationOracle=p.oracle.fresh_mutations;}}mutations.push({method:req.method,path,body});assert.deepEqual(mutations.at(-1),currentMutationOracle[mutations.length-1]);}
   if(suffix.startsWith('?fields='))value=issue;
   else if(suffix==='/properties')value={keys:pointers.has(id)?[{key:'pigboard.work-context',self:'https://api.atlassian.com/property'}]:[]};
   else if(suffix.startsWith('/comment?')){const list=comments.get(id)??[];value={startAt:0,maxResults:25,total:list.length,comments:list};}
   else if(suffix==='/comment'&&req.method==='POST'){comments.set(id,[currentComment]);value=currentComment;status=201;}
   else if(suffix==='/comment/700')value=currentComment;
   else if(suffix==='/properties/pigboard.work-context'&&req.method==='PUT'){pointers.set(id,body);status=201;value=null;}
   else if(suffix==='/properties/pigboard.work-context')value={key:'pigboard.work-context',value:pointers.get(id)};
   else if(suffix==='/transitions'){issue.fields.status.id='2';status=204;value=null;}
   else throw Error('Unexpected fixed fixture route');
  }
  if(shouldFault){injected=true;req.socket.destroy();return;}
  res.writeHead(status,{'content-type':'application/json','x-arequestid':'fixture-request-1'});res.end(value===null?'':JSON.stringify(value));
 }catch(error){serverError=error;res.writeHead(500);res.end('{}');}});
 server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const original=https.request,uuid=crypto.randomUUID;
 https.request=(url,options,callback)=>{if(url.origin!=='https://api.atlassian.com')workerCalls++;assert.equal(url.origin,'https://api.atlassian.com');assert(url.pathname.startsWith('/ex/jira/00000000-0000-0000-0000-000000000001/rest/api/3/'));assert.equal(options.rejectUnauthorized,true);assert.equal(options.agent,false);assert.equal(options.headers['Accept-Encoding'],'identity');return original(new URL('https://localhost:'+server.address().port+url.pathname.replace('/ex/jira/00000000-0000-0000-0000-000000000001','')+url.search),{...options,hostname:'127.0.0.1',servername:'localhost',ca:tls.ca},callback);};
 crypto.randomUUID=()=>[p.attempt_id,p.fresh_attempt_id][uuidIndex++];syncBuiltinESMExports();
 let result,second;try{
  const invoke=()=>host?runApply({operation:'apply'},{configText:JSON.stringify(config),manifest:{schema:'pigboard-manager-package/v1',runtime:'nodejs24.x',canonical_config:config,sender:true,source_revision:binding.package_revision,configuration_digest:binding.configuration_digest,installation_id:binding.installation_id,domain_id:binding.domain_id,installation_generation:binding.installation_generation},environment:{PB_STACK_ID:binding.stack_id,PB_TABLE_NAME:binding.table_name,PB_TABLE_ARN:binding.table_arn,PB_INSTALLATION_ID:binding.installation_id,PB_DOMAIN_ID:binding.domain_id,PB_INSTALLATION_GENERATION:binding.installation_generation,PB_PACKAGE_REVISION:binding.package_revision,PB_CONFIGURATION_DIGEST:binding.configuration_digest,PB_MODE:'apply',PB_WRITES_ENABLED:String(enabled)},createState:()=>({...state,close(){}}),secretFactory:()=>({resolveSecret:()=> 'LOCAL_APPLY_DUMMY',dispose(){}}),producer_invocation_id:p.producer_invocation_id}):applyOrdinary(JSON.stringify(config),{binding,control,state,resolveSecret:()=> 'LOCAL_APPLY_DUMMY',producer_invocation_id:p.producer_invocation_id,deadline:performance.now()+600000});
  result=await invoke();if(repeat)second=await invoke();
 }finally{https.request=original;crypto.randomUUID=uuid;syncBuiltinESMExports();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}
 if(serverError)throw serverError;
 assert(!JSON.stringify(result).includes('LOCAL_APPLY_DUMMY'));return {result,second,records:provider.records(),state_calls:stateCalls,trace,mutations,events,injected,human_status:'NOT_RUN',worker_calls:workerCalls};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const groups=['R1-17-H01 ordinary admission and no replay','R1-17-H02 uncertain intent','R1-17-H03 global-only transition'];
 const runs=[];for(const [name,options] of [[groups[0],{repeat:true}],[groups[1],{fault:'intent:after',repeat:true}],[groups[2],{global:true}]]){const evidence=await runApplyFixture(options);assert.equal(evidence.result.status,name===groups[0]?'applied':'held');assert.equal(evidence.worker_calls,0);runs.push({name,...evidence});}
 console.log(JSON.stringify({groups:runs,human_status:'NOT_RUN'}));
}
