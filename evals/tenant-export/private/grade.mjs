// Operator-owned oracle. Run on a disposable submission copy after author work ends.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRepository } from '../public/repository.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const rows = [
  { id: 70, tenantId: 'birch', active: true, payload: 'private b' },
  { id: 51, tenantId: 'oak', active: true, payload: 'z' },
  { id: 11, tenantId: 'oak', active: false, payload: 'old' },
  { id: 30, tenantId: 'oak', active: true, payload: 'a' },
  { id: 80, tenantId: 'birch', active: false, payload: 'inactive b' },
  { id: 47, tenantId: 'oak', active: true, payload: 'unicode ☀' },
];
const expected = tenant => structuredClone(rows.filter(r => r.tenantId === tenant && r.active).sort((a,b) => a.id-b.id));
class Incomplete extends Error {}
export async function grade(subject, { withoutFaults = false } = {}) {
  subject = path.resolve(subject);
  const observations = [], requirements = {};
  const canonical = await readFile(path.join(here, '../public/repository.mjs'));
  const submitted = await readFile(path.join(subject, 'repository.mjs'));
  const adapterIntact = canonical.equals(submitted);
  if (!adapterIntact) return { adapter: 'FAIL', requirements: Object.fromEntries(['M1.1','M1.2','M1.3','M1.4'].map(id => [id,'INCOMPLETE'])), observations: [{ id:'adapter-integrity', result:'FAIL', detail:'Prepared repository adapter was changed' }], qualitative: ['M1.5 requires separate source-based review'] };
  const { createService } = await import(pathToFileURL(path.join(subject, 'service.mjs')));
  const { createServer } = await import(pathToFileURL(path.join(subject, 'server.mjs')));
  async function check(id, requirement, fn) {
    const evidence = {};
    try { await fn(evidence); observations.push({ id, requirement, result:'PASS', evidence }); }
    catch (error) { observations.push({ id, requirement, result:error instanceof Incomplete ? 'INCOMPLETE' : 'FAIL', detail:error.message, evidence }); }
  }
  for (const size of [1,2,100]) await check(`ordered-${size}`, 'M1.1', async evidence => {
    const source = structuredClone(rows), before = structuredClone(source), repository = createRepository(source);
    const actual = await createService(repository).exportActive({tenantId:'oak',pageSize:size});
    evidence.queries = repository.observations();
    assert.deepEqual(actual, expected('oak')); assert.deepEqual(source, before);
    assert.ok(evidence.queries.some(q => q.method === 'tenant'), 'Required tenant source boundary was not used');
  });
  await check('empty', 'M1.1', async () => assert.deepEqual(await createService(createRepository(rows)).exportActive({tenantId:'empty',pageSize:100}), []));
  await check('invalid-sizes', 'M1.1', async () => {
    for (const pageSize of [0,101,-1,1.5,'2',null,undefined,NaN]) await assert.rejects(createService(createRepository(rows)).exportActive({tenantId:'oak',pageSize}), {status:400});
  });
  async function withServer(repository, fn) {
    const server = createServer({service:createService(repository),authenticate:req => req.headers.authorization === 'Bearer oak' ? {tenantId:'oak',isAdmin:false} : req.headers.authorization === 'Bearer birch' ? {tenantId:'birch',isAdmin:false} : req.headers.authorization === 'Bearer admin' ? {tenantId:'oak',isAdmin:true} : null});
    await new Promise((resolve,reject) => {server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
    const base = `http://127.0.0.1:${server.address().port}`;
    async function get(route, token) { const r=await fetch(base+route,{headers:token?{authorization:`Bearer ${token}`}:{}});return {status:r.status,body:await r.json()}; }
    try { await fn(get); } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  }
  await check('http-identity', 'M1.2', async evidence => {
    const repository = createRepository(rows);
    await withServer(repository, async get => {
      for (const tenant of ['oak','birch']) {
        const r=await get('/records/export?pageSize=100',tenant);
        assert.equal(r.status,200);assert.deepEqual(r.body,{records:expected(tenant)});
      }
      assert.equal((await get('/records/export')).status,401);
      const override=await get('/records/export?tenantId=birch','oak');
      assert.equal(override.status,400);assert.equal(override.body.error.code,'VALIDATION');
      for(const pageSize of ['','no','1.5','0','101']) assert.equal((await get('/records/export?pageSize='+pageSize,'oak')).status,400);
    });
    evidence.queries=repository.observations();
  });
  async function fault(kind, controls, operation, inspect, evidence) {
    const repository=createRepository(rows,withoutFaults?{}:controls);
    let value,error;
    try {value=await operation(createService(repository),repository)}catch(e){error=e}
    evidence.queries=repository.observations();
    if (!evidence.queries.some(q=>q.fault===kind)) throw new Incomplete(`No delivery evidence for ${kind}`);
    await inspect(value,error);
  }
  await check('empty-continued', 'M1.3', evidence=>fault('empty-continued',{emptyPage:true},s=>s.exportActive({tenantId:'oak',pageSize:1}),(value,error)=>{if(error)throw error;assert.deepEqual(value,expected('oak'))},evidence));
  await check('repeated-cursor', 'M1.3', evidence=>fault('repeated-cursor',{repeatCursor:true},s=>s.exportActive({tenantId:'oak',pageSize:1}),(_value,error)=>assert.equal(error?.status,502),evidence));
  await check('later-error-retry', 'M1.4', async evidence => {
    const repository=createRepository(rows,withoutFaults?{}:{failAt:2}), service=createService(repository);
    let error;try{await service.exportActive({tenantId:'oak',pageSize:1})}catch(e){error=e}
    evidence.queries=repository.observations();
    if(!evidence.queries.some(q=>q.fault==='query-failure'))throw new Incomplete('No delivery evidence for later query failure');
    assert.equal(error?.status,502);
    const firstCount=evidence.queries.length;
    try { assert.deepEqual(await service.exportActive({tenantId:'oak',pageSize:1}),expected('oak')); }
    finally { evidence.retryQueries=repository.observations().slice(firstCount); }
  });
  await check('http-source-error', 'M1.4', async evidence => {
    const repository=createRepository(rows,withoutFaults?{}:{failAt:2});
    await withServer(repository,async get=>{
      const r=await get('/records/export?pageSize=1','oak');
      evidence.queries=repository.observations();
      if(!evidence.queries.some(q=>q.fault==='query-failure'))throw new Incomplete('No delivery evidence for HTTP source failure');
      assert.equal(r.status,502);assert.equal(r.body.error.code,'UPSTREAM');assert.equal(r.body.records,undefined);
    });
  });
  await check('old-library-and-http', 'M1.4', async () => {
    const service=createService(createRepository(rows));
    assert.deepEqual(await service.listRecords({tenantId:'oak',pageSize:2}),rows.filter(r=>r.tenantId==='oak').sort((a,b)=>a.id-b.id).slice(0,2));
    assert.deepEqual(await service.adminRecords({isAdmin:true,pageSize:100}),[...rows].sort((a,b)=>a.id-b.id));
    await assert.rejects(service.adminRecords({isAdmin:false}),{status:403});
    await withServer(createRepository(rows),async get=>{
      assert.equal((await get('/records','oak')).status,200);
      assert.equal((await get('/admin/records','oak')).status,403);
      assert.equal((await get('/admin/records','admin')).status,200);
    });
  });
  for(const id of ['M1.1','M1.2','M1.3','M1.4']) {
    const checks=observations.filter(o=>o.requirement===id);
    requirements[id]=checks.some(o=>o.result==='FAIL')?'FAIL':checks.some(o=>o.result==='INCOMPLETE')?'INCOMPLETE':'PASS';
  }
  return {adapter:'PASS',requirements,observations,qualitative:['M1.5 requires source/call-site review against public contract, not helper-name scoring']};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const result=await grade(process.argv[2],{withoutFaults:process.argv.includes('--without-faults')});
    console.log(JSON.stringify(result));
    process.exitCode=result.adapter==='FAIL'||Object.values(result.requirements).includes('FAIL')?1:Object.values(result.requirements).includes('INCOMPLETE')?2:0;
  } catch(error) {console.log(JSON.stringify({setup:'INCOMPLETE',detail:error.message}));process.exitCode=2;}
}
