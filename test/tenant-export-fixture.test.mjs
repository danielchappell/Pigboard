import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, lstat, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { exportPublic, publicFiles } from '../evals/tenant-export/export-public.mjs';
import { verifyControls, inspectPublicChecks, publicChecksMatch } from '../evals/tenant-export/verify-controls.mjs';
const names=['existing tenant list and administrator access','prepared pagination handles empty continued pages and repeated cursors','existing HTTP trusted tenant and admin checks','export examples: pages, tenant scope, empty, validation and source error'];
test('public starter executes supported checks and exposes its missing export',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'pigboard-tenant-starter-'));
  const target=path.join(root,'subject');await exportPublic(target);
  const before=process.env.NODE_TEST_CONTEXT;
  for(const taskMode of [false,true]) {
    const env={...process.env,npm_lifecycle_event:'test',EXPORT_TASK_TEST:taskMode?'1':'0'};
    delete env.NODE_TEST_CONTEXT;
    const args=['--test','--test-reporter=tap','test.mjs'];
    const result=spawnSync(process.execPath,args,{cwd:target,env,encoding:'utf8',timeout:10000});
    const id=taskMode?'all-examples':'supported';
    await writeFile(path.join(root,id+'.stdout.txt'),result.stdout??'');
    await writeFile(path.join(root,id+'.stderr.txt'),result.stderr??'');
    await writeFile(path.join(root,id+'.receipt.json'),JSON.stringify({executable:process.execPath,args,status:result.status,signal:result.signal,error:result.error?.message??null},null,2));
    assert.equal(result.error,undefined,`Command setup failed; evidence: ${root}`);
    assert.equal(result.signal,null);
    assert.equal(result.status,taskMode?1:0,`Unexpected exit; evidence: ${root}`);
    const lines=result.stdout.split(/\r?\n/);
    const results=lines.filter(line=>/^(?:not )?ok \d+ - /.test(line));
    assert.equal(results.length,4,`Missing named execution; evidence: ${root}`);
    for(let index=0;index<3;index++)assert.equal(results[index],`ok ${index+1} - ${names[index]}`);
    assert.equal(results[3],taskMode?`not ok 4 - ${names[3]}`:`ok 4 - ${names[3]} # SKIP`);
    for(const line of ['1..4','# tests 4','# pass 3',`# fail ${taskMode?1:0}`,'# cancelled 0',`# skipped ${taskMode?0:1}`,'# todo 0'])assert.equal(lines.filter(value=>value===line).length,1,`Missing/duplicate ${line}; evidence: ${root}`);
    assert.equal(process.env.NODE_TEST_CONTEXT,before);
  }
  await rm(root,{recursive:true});
});
test('public export includes only regular starter files and refuses reuse',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'pigboard-tenant-public-'));
  const target=path.join(root,'subject');
  const manifest=await exportPublic(target);
  assert.deepEqual((await readdir(target)).sort(),[...publicFiles].sort());
  assert.deepEqual(Object.keys(manifest).sort(),[...publicFiles].sort());
  for(const name of publicFiles){const stat=await lstat(path.join(target,name));assert.ok(stat.isFile());assert.equal(stat.isSymbolicLink(),false);}
  const before=await readFile(path.join(target,'task.md'));
  await assert.rejects(exportPublic(target),{code:'EEXIST'});
  assert.deepEqual(await readFile(path.join(target,'task.md')),before);
  await rm(root,{recursive:true});
});

test('tenant export qualification detects declared defects and accepts valid designs',async t=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'pigboard-tenant-controls-'));
  // Preserve any failed result. Passing test evidence is disposable and replayable.
  const output=path.join(root,'evidence');
  const parentContext=process.env.NODE_TEST_CONTEXT;
  const report=await verifyControls(output);
  assert.equal(process.env.NODE_TEST_CONTEXT,parentContext);
  for(const result of report.results) {
    assert.equal(result.publicChecks.status,'COMPLETE',result.id);
    assert.deepEqual(result.publicChecks.outcomes.map(o=>o.result),['PASS','PASS','PASS',result.expectedPublicExit===0?'PASS':'FAIL'],result.id);
  }
  assert.equal(report.results.length,10);
  assert.equal(report.complete,true,JSON.stringify(report.results.filter(r=>!r.matched)));
  assert.ok(report.results.every(r=>r.matched));
  const byId=id=>{const value=report.results.find(r=>r.id===id);assert.ok(value,`Missing control ${id}`);return value;};
  const observation=(control,id)=>{const value=control.observations.find(o=>o.id===id);assert.ok(value,`Missing observation ${id}`);return value;};
  const leak=byId('admin-leak');
  assert.deepEqual(leak.actual,{adapter:'PASS',requirements:{'M1.1':'FAIL','M1.2':'FAIL','M1.3':'FAIL','M1.4':'FAIL'}});
  assert.equal(leak.publicExit,1);assert.equal(leak.graderExit,1);
  const empty=observation(leak,'empty-continued');assert.equal(empty.result,'FAIL');
  const emptyIndex=empty.evidence.queries.findIndex(q=>q.method==='admin'&&q.fault==='empty-continued');
  assert.ok(emptyIndex>=0);assert.ok(empty.evidence.queries.slice(emptyIndex+1).some(q=>q.cursor!==null));
  const repeat=observation(leak,'repeated-cursor');assert.equal(repeat.result,'PASS');
  assert.ok(repeat.evidence.queries.some(q=>q.fault==='repeated-cursor'));
  function retryEvidence(control,method,result) {
    const retry=observation(control,'later-error-retry');assert.equal(retry.result,result);
    assert.ok(retry.evidence.queries.some(q=>q.fault==='query-failure'));
    assert.ok(retry.evidence.retryQueries.length>0);assert.equal(retry.evidence.retryQueries[0].cursor,null);
    assert.ok(retry.evidence.retryQueries.every(q=>q.method===method&&q.fault!=='query-failure'));
  }
  retryEvidence(leak,'admin','FAIL');
  const httpError=observation(leak,'http-source-error');assert.equal(httpError.result,'PASS');
  assert.ok(httpError.evidence.queries.some(q=>q.fault==='query-failure'));
  assert.equal(observation(leak,'old-library-and-http').result,'PASS');
  for(const id of ['reference','valid-tenant-loop']) {
    const valid=byId(id);assert.deepEqual(valid.actual,{adapter:'PASS',requirements:{'M1.1':'PASS','M1.2':'PASS','M1.3':'PASS','M1.4':'PASS'}});
    retryEvidence(valid,'tenant','PASS');
  }
  const missing=byId('missing-fault-delivery');
  assert.equal(missing.actual.requirements['M1.3'],'INCOMPLETE');assert.equal(missing.actual.requirements['M1.4'],'INCOMPLETE');
  const noRetry=observation(missing,'later-error-retry');assert.equal(noRetry.result,'INCOMPLETE');
  assert.ok(noRetry.evidence.queries.every(q=>q.fault!=='query-failure'));assert.equal(noRetry.evidence.retryQueries,undefined);
  assert.ok(Object.values(byId('adapter-tamper').actual.requirements).every(v=>v==='INCOMPLETE'));
  assert.equal(report.results.find(r=>r.id==='adapter-tamper').actual.adapter,'FAIL');
  assert.equal(report.results.find(r=>r.id==='missing-fault-delivery').actual.requirements['M1.3'],'INCOMPLETE');
  const before=await readFile(path.join(output,'report.json'));
  await assert.rejects(verifyControls(output),{code:'EEXIST'});
  assert.deepEqual(await readFile(path.join(output,'report.json')),before);
  await rm(root,{recursive:true});
});

test('qualification rejects missing execution through its production match',()=>{
  const results=names.map((name,index)=>`${index===3?'not ok':'ok'} ${index+1} - ${name}`);
  const summary=['1..4','# tests 4','# pass 3','# fail 1','# cancelled 0','# skipped 0','# todo 0'];
  const complete=[...results,...summary].join('\n');
  const receipt={status:1,signal:null,error:null};
  assert.equal(inspectPublicChecks(complete).status,'COMPLETE');
  assert.equal(publicChecksMatch(inspectPublicChecks(complete),receipt,1),true);
  const invalid=[
    '', results.slice(0,3).concat(summary).join('\n'),
    complete.replace(results[3],results[3]+' # SKIP'),
    complete.replace(results[2],results[1]),
    complete.replace(names[2],'unexpected public case'),
    results.join('\n'), complete.replace('# todo 0',''),
    complete+'\nok 5 - unexpected public case', complete+'\n1..4',
    complete.replace('# pass 3','# pass 4'),
    complete.replace('# fail 1','# fail 1\n# fail 1'),
    'Bail out! stopped\n'+complete
  ];
  for(const sample of invalid) {
    const evidence=inspectPublicChecks(sample);
    assert.equal(evidence.status,'INCOMPLETE',sample);
    assert.equal(publicChecksMatch(evidence,{status:0,signal:null,error:null},0),false);
    assert.equal(publicChecksMatch(evidence,receipt,1),false);
  }
  const wrongFailure=complete.replace(results[0],results[0].replace('ok ','not ok ')).replace(results[3],results[3].replace('not ok ','ok '));
  assert.equal(inspectPublicChecks(wrongFailure).status,'COMPLETE');
  assert.equal(publicChecksMatch(inspectPublicChecks(wrongFailure),receipt,1),false);
  const evidence=inspectPublicChecks(complete);
  for(const badReceipt of [{...receipt,error:'timeout'},{...receipt,signal:'SIGTERM'},{...receipt,status:null},{...receipt,status:0}])
    assert.equal(publicChecksMatch(evidence,badReceipt,1),false);
});
