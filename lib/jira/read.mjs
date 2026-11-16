import https from 'node:https';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { isDeepStrictEqual } from 'node:util';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parseContract, checkValue, LIMITS } from '../contracts/work.mjs';
import { CONFIG_LIMITS } from '../config/parse.mjs';
import { resolveJiraReadConfig, validLabel } from '../config/projects.mjs';

const ajv = new Ajv2020({strict:true}); addFormats(ajv);
const pointerValid = ajv.compile(JSON.parse(readFileSync(new URL('../../contracts/work-pointer-v1.schema.json',import.meta.url),'utf8')));
const id = v => typeof v === 'string' && /^[0-9]{1,255}$/.test(v);
const key = v => typeof v === 'string' && /^[A-Z][A-Z0-9_]{0,254}-[0-9]{1,255}$/.test(v);
const same = (a,b) => isDeepStrictEqual({...a,body:JSON.parse(a.body)},{...b,body:JSON.parse(b.body)});
const closed = (v,keys) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join(',') === [...keys].sort().join(',');
const fault = (code,bound=null) => Object.assign(new Error(code),{code,bound});
const messages = Object.freeze({CONFIG_INVALID:'Correct the authored Jira configuration.',INPUT_INVALID:'Supply unique immutable issue IDs and matching exact comment targets.',SETUP_MISSING:'Prepare Jira read settings and a trusted secret resolver.',SECRET_UNAVAILABLE:'Check the prepared credential resolver.',RESOLVER_CANCEL_UNCONFIRMED:'Caller must confirm resolver cleanup before another attempt.',SCOPE_UNKNOWN:'Confirm the issue belongs to a configured project.',READ_DENIED_OR_MISSING:'Confirm visibility and the requested identity; absence is not established.',POINTER_UNKNOWN:'Confirm a visible assignment pointer; absence is not established.',PAGE_INCOMPLETE:'Obtain a complete stable comment enumeration.',CHANGED_INPUT:'Inspect the changed input before a new invocation.',RATE_LIMITED:'Wait for an operator-approved later invocation.',TLS_FAILED:'Check the prepared TLS trust, hostname, certificate validity and local clock.',REDIRECT_REJECTED:'Use the fixed Jira gateway; redirects are not followed.',RESPONSE_INVALID:'Inspect provider response shape outside the safe report.',LIMIT_REACHED:'Review the named bound and required scope before a new invocation.'});
const counters = () => ({requests_attempted:0,requests_completed:0,requests_failed:0,search_pages:0,comment_pages:0,epics:0,streams:0,known_issues:0,comments:0,response_bytes:0,observation_bytes:0,elapsed_ms:0});
const privateData = () => ({issues:[],comment_pages:[],exact_comments:[],references:[],provenance:[]});
function result(report, observations) {const value={report};Object.defineProperty(value,'observations',{value:observations,enumerable:false,writable:false});return value;}
function reportBase() {return {schema:'pigboard-jira-inspection/v1',status:'incomplete',inspection_scope:'requested_issues',domain_complete:false,retained_complete:null,admission:'not_evaluated',receipt_proof:'not_evaluated',visibility:'operator_prerequisite',issues:[],scopes:[],diagnostics:[],counters:counters(),limits:null,cleanup:{jira:'not_started',resolver:'settled'}};}
function diagnostic(report,error,operation=null,issue_id=null) {const code=Object.hasOwn(messages,error.code)?error.code:'RESPONSE_INVALID';report.diagnostics.push({code,message:messages[code],operation,issue_id,scope:null,...(error.bound?{bound:error.bound}:{})});}
function checkedJSON(value,limits=CONFIG_LIMITS) {checkValue(value,limits);if(Buffer.byteLength(JSON.stringify(value))>limits.bytes)throw fault('INPUT_INVALID');return value;}
function body(value) {try{checkedJSON(value,{bytes:LIMITS.adfBytes,depth:LIMITS.depth,list:LIMITS.adfList});}catch{throw fault('RESPONSE_INVALID');}if(!value||value.type!=='doc'||value.version!==1||!Array.isArray(value.content))throw fault('RESPONSE_INVALID');let count=0;const todo=[value];while(todo.length){const n=todo.pop();if(++count>1000||!n||typeof n!=='object'||Array.isArray(n)||typeof n.type!=='string'||(n.content!==undefined&&!Array.isArray(n.content))||(n.type==='text'&&typeof n.text!=='string'))throw fault('RESPONSE_INVALID');if(n.content)todo.push(...n.content);}return JSON.stringify(value);}
function commentValue(v){if(!v||!id(v.id)||typeof v.author?.accountId!=='string'||!v.author.accountId.length||v.author.accountId.length>255||typeof v.updateAuthor?.accountId!=='string'||!v.updateAuthor.accountId.length||v.updateAuthor.accountId.length>255||typeof v.created!=='string'||!Number.isFinite(Date.parse(v.created))||typeof v.updated!=='string'||!Number.isFinite(Date.parse(v.updated)))throw fault('RESPONSE_INVALID');return {id:v.id,author_id:v.author.accountId,update_author_id:v.updateAuthor.accountId,created:v.created,updated:v.updated,body:body(v.body)};}
function issueValue(v,requested){const f=v?.fields;if(!v||v.id!==requested||!key(v.key)||!f||!id(f.project?.id)||!id(f.issuetype?.id)||!id(f.status?.id)||(f.parent!==undefined&&f.parent!==null&&!id(f.parent.id))||!Array.isArray(f.labels)||f.labels.length>1000||f.labels.some(l=>!validLabel(l))||new Set(f.labels).size!==f.labels.length)throw fault('RESPONSE_INVALID');return {id:v.id,key:v.key,project_id:f.project.id,type_id:f.issuetype.id,status_id:f.status.id,parent_id:f.parent?.id??null,labels:[...f.labels],format:'adf',body:Object.hasOwn(f,'description')&&f.description===null?null:body(f.description),pointer:{state:'unknown',value:null}};}

// Internal B2 composition point. No caller-selected URL, method or transport.
export async function createJiraReadSession(configInput,dependencies) {
 const report=reportBase(),observations=privateData(),started=performance.now();let config;
 try {config=resolveJiraReadConfig(parseContract(configInput,CONFIG_LIMITS));}catch{diagnostic(report,fault('CONFIG_INVALID'));report.status='invalid';return {report,observations,ready:false,finish:()=>result(report,observations)};}
 if(!config){diagnostic(report,fault('SETUP_MISSING'));report.status='setup_failed';return {report,observations,ready:false,finish:()=>result(report,observations)};}
 report.limits={...config.read_bounds};const b=report.limits,c=report.counters,controller=new AbortController();const deadline=started+b.scan_timeout_ms;
 let secret=null,active=null,closedSession=false,resolverSettled=true;
 const checkTime=()=>{if(closedSession||performance.now()>=deadline)throw fault('LIMIT_REACHED','scan_timeout_ms');};
 const reserve=(counter,bound,n=1)=>{if(c[counter]+n>b[bound])throw fault('LIMIT_REACHED',bound);c[counter]+=n;};
 const retain=(field,value)=>{checkTime();observations[field].push(value);const bytes=Buffer.byteLength(JSON.stringify(observations));if(bytes>b.max_total_response_bytes){observations[field].pop();throw fault('LIMIT_REACHED','max_total_response_bytes');}c.observation_bytes=bytes;checkTime();};
 const resolve=async()=>{
  if(!dependencies||Object.getPrototypeOf(dependencies)!==Object.prototype||Reflect.ownKeys(dependencies).length!==1||!Object.hasOwn(dependencies,'resolveSecret')||typeof Object.getOwnPropertyDescriptor(dependencies,'resolveSecret')?.value!=='function')throw fault('SETUP_MISSING');
  checkTime();resolverSettled=false;let timer;const pending=Promise.resolve().then(()=>dependencies.resolveSecret(config.connection.secret_reference,controller.signal));
  const settled=pending.then(value=>{resolverSettled=true;return value;},()=>{resolverSettled=true;throw fault('SECRET_UNAVAILABLE');});
  try {const value=await Promise.race([settled,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(fault('LIMIT_REACHED','scan_timeout_ms'));},Math.max(1,deadline-performance.now()));})]);checkTime();if(typeof value!=='string'||!value.length||Buffer.byteLength(value)>16384||/[\x00-\x1f\x7f]/.test(value))throw fault('SECRET_UNAVAILABLE');secret=value;}
  finally {clearTimeout(timer);}
 };
 const get=async(operation,issueId,suffix='')=>{
  checkTime();reserve('requests_attempted','max_requests');report.cleanup.jira='complete';
  const path='/rest/api/3/issue/'+encodeURIComponent(issueId)+suffix,url=new URL(config.connection.api_base+path);
  return await new Promise((resolve,reject)=>{
   let req,res,timer,done=false,bytes=0,chunks=[];
   const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);active=null;if(error){c.requests_failed++;res?.destroy();req?.destroy();reject(error);}else{c.requests_completed++;resolve(value);}};
   active=()=>finish(fault('LIMIT_REACHED','scan_timeout_ms'));
   timer=setTimeout(()=>finish(fault('LIMIT_REACHED',performance.now()>=deadline?'scan_timeout_ms':'request_timeout_ms')),Math.max(1,Math.min(b.request_timeout_ms,deadline-performance.now())));
   try {req=https.request(url,{method:'GET',agent:false,rejectUnauthorized:true,headers:{Authorization:'Bearer '+secret,Accept:'application/json','Accept-Encoding':'identity'}},incoming=>{
    res=incoming;const status=res.statusCode;const encoding=res.headers['content-encoding'];
    if(encoding&&encoding!=='identity'){finish(fault('RESPONSE_INVALID'));return;}
    res.on('data',chunk=>{if(done)return;bytes+=chunk.length;c.response_bytes+=chunk.length;if(bytes>b.max_response_bytes){finish(fault('LIMIT_REACHED','max_response_bytes'));return;}if(c.response_bytes>b.max_total_response_bytes){finish(fault('LIMIT_REACHED','max_total_response_bytes'));return;}chunks.push(chunk);});
    res.on('aborted',()=>finish(fault('PAGE_INCOMPLETE')));res.on('error',()=>finish(fault('PAGE_INCOMPLETE')));
    res.on('end',()=>{if(done)return;try{checkTime();if(status>=300&&status<400)throw fault('REDIRECT_REJECTED');if(status===429)throw fault('RATE_LIMITED');if(status!==200)throw fault(operation==='pointer'&&status===404?'POINTER_UNKNOWN':'READ_DENIED_OR_MISSING');const text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));chunks=[];const value=JSON.parse(text);try{checkedJSON(value,{bytes:b.max_response_bytes,depth:32,list:1000});}catch{throw fault('RESPONSE_INVALID');}checkTime();finish(null,value);}catch(error){finish(error.code?error:fault('RESPONSE_INVALID'));}});
   });req.on('error',error=>finish(fault((req.socket?.authorized===false&&!!req.socket.authorizationError)||['CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY','ERR_TLS_CERT_ALTNAME_INVALID'].includes(error.code)?'TLS_FAILED':'READ_DENIED_OR_MISSING')));req.end();}catch{finish(fault('RESPONSE_INVALID'));}
  });
 };
 return {report,observations,config,ready:true,resolve,retain,reserve,checkTime,
  issue:issueId=>get('issue',issueId,'?fields=project,issuetype,status,parent,labels,description'),
  pointer:issueId=>get('pointer',issueId,'/properties/pigboard.work-context'),
  comments:async(issueId,start)=>{reserve('comment_pages','max_pages');return get('comments',issueId,`/comment?startAt=${start}&maxResults=${b.page_size}&orderBy=created`);},
  comment:(issueId,commentId)=>get('comment',issueId,'/comment/'+encodeURIComponent(commentId)),
  finish(){closedSession=true;active?.();controller.abort();secret=null;if(!resolverSettled){report.cleanup.resolver='cancel_unconfirmed';diagnostic(report,fault('RESOLVER_CANCEL_UNCONFIRMED'));}c.elapsed_ms=Math.ceil(performance.now()-started);return result(report,observations);}
 };
}

export async function inspectJiraIssues(configInput,request,dependencies){
 // Validate closed input before invoking the capability, including accessor safety.
 let requestError=false,issueIds,commentTargets;
 try{checkedJSON(request);if(!closed(request,['issue_ids','comment_targets'])||!Array.isArray(request.issue_ids)||!request.issue_ids.length||request.issue_ids.some(v=>!id(v))||new Set(request.issue_ids).size!==request.issue_ids.length||!Array.isArray(request.comment_targets)||request.comment_targets.some(v=>!closed(v,['ticket_id','comment_id'])||!id(v.ticket_id)||!id(v.comment_id)||!request.issue_ids.includes(v.ticket_id))||new Set(request.comment_targets.map(v=>JSON.stringify([v.ticket_id,v.comment_id]))).size!==request.comment_targets.length)throw Error();issueIds=[...request.issue_ids];commentTargets=request.comment_targets.map(v=>({ticket_id:v.ticket_id,comment_id:v.comment_id}));}catch{requestError=true;}
 if(requestError){const report=reportBase();report.status='invalid';diagnostic(report,fault('INPUT_INVALID'));return result(report,privateData());}
 const s=await createJiraReadSession(configInput,dependencies),{report,observations}=s;if(!s.ready)return s.finish();
 const fail=(error,operation=null,issueId=null)=>diagnostic(report,error,operation,issueId);
 try{
  if(issueIds.length>report.limits.max_known_issues)throw fault('LIMIT_REACHED','max_known_issues');if(commentTargets.length>report.limits.max_comments)throw fault('LIMIT_REACHED','max_comments');
  await s.resolve();
 }catch(error){fail(error);report.status=error.code==='SETUP_MISSING'?'setup_failed':(report.counters.requests_attempted===0&&error.bound&&['max_known_issues','max_comments'].includes(error.bound)?'invalid':'incomplete');return s.finish();}
 issueScan: for(const issueId of issueIds){
  const row={id:issueId,key:null,project_id:null,issue_read:'incomplete',pointer_read:'not_requested',comments_read:'not_requested',exact_comments_read:'not_requested',comment_ids:[],comment_count:0};report.issues.push(row);let issue;
  try{s.checkTime();issue=issueValue(await s.issue(issueId),issueId);if(!s.config.project_ids.includes(issue.project_id))throw fault('SCOPE_UNKNOWN');s.reserve('known_issues','max_known_issues');s.retain('issues',issue);s.retain('provenance',{ticket_id:issueId,source:'requested',source_ticket_id:null,project_id:issue.project_id,label:null});row.key=issue.key;row.project_id=issue.project_id;row.issue_read='complete';}catch(error){fail(error,'issue',issueId);if(error.code==='LIMIT_REACHED')break;continue;}
  row.pointer_read='incomplete';
  try{const pointer=await s.pointer(issueId);if(!closed(pointer,['key','value'])||pointer.key!=='pigboard.work-context'||!pointerValid(pointer.value))throw fault('RESPONSE_INVALID');issue.pointer={state:'present',value:pointer.value}; // Roll back if private projection no longer fits.
   const bytes=Buffer.byteLength(JSON.stringify(observations));if(bytes>report.limits.max_total_response_bytes){issue.pointer={state:'unknown',value:null};throw fault('LIMIT_REACHED','max_total_response_bytes');}report.counters.observation_bytes=bytes;row.pointer_read='complete';}catch(error){fail(error,'pointer',issueId);if(error.code==='LIMIT_REACHED')break;}
  row.comments_read='incomplete';const seen=new Map();let start=0,total=null,complete=false;
  try{while(true){const page=await s.comments(issueId,start);if(!page||!Number.isSafeInteger(page.startAt)||page.startAt!==start||!Number.isSafeInteger(page.maxResults)||page.maxResults<1||!Number.isSafeInteger(page.total)||page.total<0||!Array.isArray(page.comments)||page.comments.length>page.maxResults||start+page.comments.length>page.total)throw fault('PAGE_INCOMPLETE');if(total!==null&&page.total!==total)throw fault('CHANGED_INPUT');total=page.total;if(!page.comments.length&&start<total)throw fault('PAGE_INCOMPLETE');const normalized=page.comments.map(commentValue);if(normalized.some(v=>seen.has(v.id))||new Set(normalized.map(v=>v.id)).size!==normalized.length)throw fault('CHANGED_INPUT');if(report.counters.comments+normalized.length>report.limits.max_comments)throw fault('LIMIT_REACHED','max_comments');s.retain('comment_pages',{site:s.config.site,ticket_id:issueId,start_at:start,total,is_last:start+normalized.length===total,comments:normalized});report.counters.comments+=normalized.length;for(const v of normalized)seen.set(v.id,v);row.comment_ids=[...seen.keys()];row.comment_count=seen.size;start+=normalized.length;if(start===total){complete=true;row.comments_read='complete';break;}}}catch(error){fail(error,'comments',issueId);if(error.code==='LIMIT_REACHED')break;}
  const targets=commentTargets.filter(v=>v.ticket_id===issueId);row.exact_comments_read=targets.length?'incomplete':'not_requested';
  if(complete&&targets.length){let all=true;for(const target of targets){try{const value=commentValue(await s.comment(issueId,target.comment_id));s.checkTime();const previous=seen.get(target.comment_id),matched=previous!==undefined&&same(value,previous);s.checkTime();if(!matched)throw fault('CHANGED_INPUT');s.retain('exact_comments',{ticket_id:issueId,...value});}catch(error){all=false;fail(error,'comment',issueId);if(error.code==='LIMIT_REACHED')break issueScan;}}if(all)row.exact_comments_read='complete';}
 }
 try{s.checkTime();}catch(error){fail(error);}
 report.status=report.diagnostics.length?'incomplete':'complete';return s.finish();
}
