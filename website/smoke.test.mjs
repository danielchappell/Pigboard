import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {build} from './build.mjs';
import {smoke,canonicalOrigin} from './smoke.mjs';
const commit='a'.repeat(40);
async function fixture(t,broken) {
 const dir=mkdtempSync(join(tmpdir(),'pigboard-smoke-'));build({out:join(dir,'site'),origin:canonicalOrigin,commit});
 const server=createServer((req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'");
  res.setHeader('Cache-Control',['/version.json','/healthz','/readyz'].includes(req.url)?'no-store':'no-cache');
  let data; const name=req.url==='/'?'index.html':req.url.slice(1);
  if(['/healthz','/readyz'].includes(req.url)) {res.setHeader('Content-Type','application/json');data=Buffer.from('{"ok":true}');}
  else {try {data=readFileSync(join(dir,'site',name));}catch{res.statusCode=404;data=Buffer.from('Not found');}}
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.txt':'text/plain','.xml':'text/xml','.json':'application/json'};
  if(types[extname(name)])res.setHeader('Content-Type',types[extname(name)]);
  if(broken===req.url) {
   if(req.url==='/styles.css')res.removeHeader('Content-Security-Policy');
   else if(req.url==='/v1/me')res.statusCode=200;
   else if(req.url==='/method.html')data=Buffer.from('<main id="main">missing canonical</main>');
   else if(req.url==='/readyz')data=Buffer.from('{"ok":false}');
   else if(req.url==='/version.json')data=Buffer.from(JSON.stringify({commit:'b'.repeat(40),origin:canonicalOrigin,preview:false}));
   else data=Buffer.from('different artwork');
  }
  res.setHeader('Content-Length',data.length);res.end(req.method==='HEAD'?undefined:data);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});});
 return {origin:`http://127.0.0.1:${server.address().port}`,commit,output:join(dir,'report.json')};
}
test('smoke verifies complete production metadata through a local HTTP fixture',async t=>{
 const input=await fixture(t);const report=await smoke(input);assert.equal(report.status,'passed');assert.ok(report.checks.length>=18);
});
for(const path of ['/version.json','/method.html','/styles.css','/assets/mascot-board-v2.png','/readyz','/v1/me']) {
 test('smoke fails and records evidence for '+path,async t=>{
  const input=await fixture(t,path);await assert.rejects(smoke(input));
  const report=JSON.parse(readFileSync(input.output));assert.equal(report.status,'failed');assert.ok(report.error);
 });
}
