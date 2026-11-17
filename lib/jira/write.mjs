import https from 'node:https';
import {performance} from 'node:perf_hooks';
import {parseContract,checkValue} from '../contracts/work.mjs';
import {resolveJiraReadConfig} from '../config/projects.mjs';
import {commentValue} from './read.mjs';
const id=v=>typeof v==='string'&&/^[0-9]{1,255}$/.test(v);
const fault=code=>Object.assign(new Error(code),{code});
/** Fixed Jira gateway operations. Credentials and provider facts stay private. */
export async function createJiraWriter(configText,{resolveSecret,deadline}){
 const config=resolveJiraReadConfig(parseContract(configText)),b=config?.read_bounds;
 if(!config||typeof resolveSecret!=='function'||!Number.isFinite(deadline))throw fault('APPLY_UNAVAILABLE');
 let secret=null,stopped=false,total=0,requests=0;const abort=new AbortController();
 const check=()=>{if(stopped||performance.now()>=deadline){stopped=true;throw fault('LIMIT_REACHED');}};
 check();let timer;
 try{secret=await Promise.race([Promise.resolve().then(()=>resolveSecret(config.connection.secret_reference,abort.signal)),new Promise((_,reject)=>{timer=setTimeout(()=>{stopped=true;abort.abort();reject(fault('SECRET_UNAVAILABLE'));},Math.max(1,Math.min(b.request_timeout_ms,deadline-performance.now())));})]);}
 finally{clearTimeout(timer);}
 if(typeof secret!=='string'||!secret.length||Buffer.byteLength(secret)>16384||/[\x00-\x1f\x7f]/.test(secret))throw fault('SECRET_UNAVAILABLE');
 async function request(method,ticket,suffix,value,statuses,empty=false){
  check();if(!id(ticket)||++requests>5)throw fault('INPUT_INVALID');
  let wire;if(value!==undefined){checkValue(value,{bytes:65536,depth:32,list:1000});wire=JSON.stringify(value);if(Buffer.byteLength(wire)>65536)throw fault('LIMIT_REACHED');}
  const url=new URL(config.connection.api_base+'/rest/api/3/issue/'+ticket+suffix);
  return new Promise((resolve,reject)=>{let req,res,done=false,chunks=[],bytes=0;
   const end=(error,value)=>{if(done)return;done=true;clearTimeout(timeout);if(error){stopped=true;res?.destroy();req?.destroy();reject(error);}else resolve(value);};
   const timeout=setTimeout(()=>end(fault('LIMIT_REACHED')),Math.max(1,Math.min(b.request_timeout_ms,deadline-performance.now())));
   try{req=https.request(url,{method,agent:false,rejectUnauthorized:true,headers:{Authorization:'Bearer '+secret,Accept:'application/json','Accept-Encoding':'identity',...(wire===undefined?{}:{'Content-Type':'application/json'})}},incoming=>{
    res=incoming;if(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){end(fault('RESPONSE_INVALID'));return;}
    res.on('data',chunk=>{bytes+=chunk.length;total+=chunk.length;if(bytes>b.max_response_bytes||total>b.max_total_response_bytes){end(fault('LIMIT_REACHED'));return;}chunks.push(chunk);});
    res.on('aborted',()=>end(fault('RESPONSE_INVALID')));res.on('error',()=>end(fault('RESPONSE_INVALID')));
    res.on('end',()=>{try{check();if(res.statusCode>=300&&res.statusCode<400)throw fault('REDIRECT_REJECTED');if(!statuses.includes(res.statusCode))throw fault(res.statusCode===429?'RATE_LIMITED':'APPLY_HELD');const raw=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));let body=null;if(empty){if(raw.length)throw fault('RESPONSE_INVALID');}else{body=JSON.parse(raw);checkValue(body,{bytes:b.max_response_bytes,depth:32,list:1000});}end(null,{body,http_status:res.statusCode,observed_at:new Date().toISOString(),provider_request_id:typeof res.headers['x-arequestid']==='string'?res.headers['x-arequestid']:null});}catch(error){end(error.code?error:fault('RESPONSE_INVALID'));}});
   });req.on('error',()=>end(fault('APPLY_HELD')));req.end(wire);}catch(error){end(error.code?error:fault('APPLY_HELD'));}
  });
 }
 return {
  async appendComment(ticket,body){const response=await request('POST',ticket,'/comment',{body},[201]);return commentValue(response.body);},
  async readComment(ticket,comment){if(!id(comment))throw fault('INPUT_INVALID');return commentValue((await request('GET',ticket,'/comment/'+comment,undefined,[200])).body);},
  async putPointer(ticket,pointer){return request('PUT',ticket,'/properties/pigboard.work-context',pointer,[200,201],true);},
  async readPointer(ticket){const response=await request('GET',ticket,'/properties/pigboard.work-context',undefined,[200]);if(!response.body||Object.keys(response.body).sort().join(',')!=='key,value'||response.body.key!=='pigboard.work-context')throw fault('RESPONSE_INVALID');return response.body.value;},
  async transition(ticket,transitionId){if(!id(transitionId))throw fault('INPUT_INVALID');return request('POST',ticket,'/transitions',{transition:{id:transitionId}},[204],true);},
  close(){stopped=true;secret=null;abort.abort();}
 };
}
