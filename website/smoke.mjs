import {createHash} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {routes, artwork} from './build.mjs';

export const canonicalOrigin = 'https://pigboard.scubapig.software';
export const currentContract = {pages:routes.map(([file]) => file), artwork};
export function saveReport(path, report) {
  if (!path) return;
  mkdirSync(dirname(path), {recursive:true});
  writeFileSync(path, JSON.stringify(report,null,2)+'\n');
}
export async function smoke({origin=canonicalOrigin, expectedOrigin=canonicalOrigin, commit,
  contract=currentContract, output, fetcher=fetch}={}) {
  const report = {origin, expected_origin:expectedOrigin, expected_commit:commit, status:'running', checks:[]};
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  try {
    check(/^[a-f0-9]{40}$/.test(commit), 'Supply a full expected commit');
    const target=new URL(origin);
    check(target.origin===origin && !target.username && !target.password &&
      (target.protocol==='https:' || (target.protocol==='http:' && ['127.0.0.1','localhost','[::1]'].includes(target.hostname))), 'Use HTTPS or a loopback fixture origin');
    async function get(path, {method='GET',status=200}={}) {
      const response = await fetcher(origin+path,{method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
      check(response.status===status, `${method} ${path}: expected ${status}, received ${response.status}`);
      check(response.headers.get('x-content-type-options')==='nosniff',path+': missing nosniff');
      check(response.headers.get('referrer-policy')==='strict-origin-when-cross-origin',path+': missing referrer policy');
      const csp=response.headers.get('content-security-policy') || '';
      check(["default-src 'self'","script-src 'self'","object-src 'none'","frame-ancestors 'none'"].every(v=>csp.includes(v)),path+': missing CSP');
      check(response.headers.get('cache-control')===(['/version.json','/readyz','/healthz'].includes(path)?'no-store':'no-cache'),path+': incorrect caching');
      report.checks.push({method,path,status:response.status});
      return response;
    }
    const version=await (await get('/version.json')).json();
    check(version.commit===commit && version.origin===expectedOrigin && version.preview===false,'Unexpected revision, canonical origin or preview mode');
    for (const file of contract.pages) {
      const path=file==='index.html'?'/':'/'+file;
      const response=await get(path); const html=await response.text();
      check(response.headers.get('content-type')?.includes('text/html') && html.includes('<main id="main">'),path+': invalid HTML');
      check(html.includes(`rel="canonical" href="${expectedOrigin}${path}"`) && html.includes('content="index, follow"'),path+': incorrect public metadata');
    }
    for (const [file,mime] of [['app.js','javascript'],['styles.css','text/css'],['theme.css','text/css'],['robots.txt','text/plain'],['sitemap.xml','xml']]) {
      const response=await get('/'+file); const body=await response.text();
      check(response.headers.get('content-type')?.includes(mime) && body.length>0,file+': invalid static resource');
      if(file==='robots.txt') check(body.includes('Allow: /') && body.includes(expectedOrigin+'/sitemap.xml'),'Incorrect robots metadata');
      if(file==='sitemap.xml') check(contract.pages.every(f=>body.includes(expectedOrigin+(f==='index.html'?'/':'/'+f))),'Incomplete sitemap');
    }
    for (const [file,hash] of Object.entries(contract.artwork)) {
      const response=await get('/assets/'+file);
      check(response.headers.get('content-type')?.includes('image/png'),file+': invalid image type');
      check(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex')===hash,file+': artwork digest differs');
    }
    for (const path of ['/readyz','/healthz']) check((await (await get(path)).json()).ok===true,path+': unhealthy');
    const head=await get('/',{method:'HEAD'});
    check((await head.arrayBuffer()).byteLength===0 && Number(head.headers.get('content-length'))>0,'Invalid HEAD response');
    for(const path of ['/.env','/v1/me','/not-a-public-file']) await get(path,{status:404});
    report.status='passed';
  } catch(error) {
    report.status='failed'; report.error=error.message;
    error.report=report;
    throw error;
  } finally {
    report.checked_at=new Date().toISOString(); saveReport(output,report);
  }
  return report;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  smoke({origin:process.env.PIGBOARD_SMOKE_ORIGIN || canonicalOrigin,
    expectedOrigin:process.env.PIGBOARD_SITE_ORIGIN || canonicalOrigin,
    commit:process.env.PIGBOARD_SITE_COMMIT,
    output:process.env.PIGBOARD_SMOKE_REPORT || 'dist/website-release/smoke.json'})
    .then(report=>console.log(`Verified ${report.expected_commit}: ${report.checks.length} HTTP checks`))
    .catch(error=>{console.error('Website smoke failed: '+error.message);process.exitCode=1;});
}
