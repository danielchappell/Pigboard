import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, lstat, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportPublic, publicFiles } from '../evals/tenant-export/export-public.mjs';
import { verifyControls, inspectPublicChecks, publicChecksMatch } from '../evals/tenant-export/verify-controls.mjs';
const names=['existing tenant list and administrator access','prepared pagination handles empty continued pages and repeated cursors','existing HTTP trusted tenant and admin checks','export examples: pages, tenant scope, empty, validation and source error'];
test('public starter executes documented commands independently of its export path',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'pigboard-tenant-starter-'));
  const target=path.join(root,'task-test-subject');await exportPublic(target);
  const before=process.env.NODE_TEST_CONTEXT;
  const parentNodeOptions=process.env.NODE_OPTIONS;
  const cases=[
    {id:'supported',executable:'npm',args:['test'],flag:'0',exit:0},
    {id:'task',executable:'npm',args:['run','task-test'],flag:'0',exit:1},
    {id:'all-examples',executable:process.execPath,args:['--test','--test-reporter=tap','test.mjs'],flag:'1',exit:1}
  ];
  for(const command of cases) {
    const env={...process.env,EXPORT_TASK_TEST:command.flag};
    delete env.NODE_TEST_CONTEXT;
    delete env.npm_lifecycle_event;
    if(command.id==='all-examples')env.npm_lifecycle_event='test';
    else env.NODE_OPTIONS=[env.NODE_OPTIONS,'--test-reporter=tap'].filter(Boolean).join(' ');
    const result=spawnSync(command.executable,command.args,{cwd:target,env,encoding:'utf8',timeout:10000});
    await writeFile(path.join(root,command.id+'.stdout.txt'),result.stdout??'');
    await writeFile(path.join(root,command.id+'.stderr.txt'),result.stderr??'');
    await writeFile(path.join(root,command.id+'.receipt.json'),JSON.stringify({executable:command.executable,args:command.args,cwd:target,reporter:'tap',status:result.status,signal:result.signal,error:result.error?.message??null},null,2));
    assert.equal(result.error,undefined,`Command setup failed; evidence: ${root}`);
    assert.equal(result.signal,null);
    assert.equal(result.status,command.exit,`Unexpected exit; evidence: ${root}`);
    const lines=result.stdout.split(/\r?\n/);
    const results=lines.filter(line=>/^(?:not )?ok \d+ - /.test(line));
    let skipped=0,passed=0,failed=0,total=4;
    if(command.id==='task') {
      assert.ok(results.length===1 || results.length===4,`Invalid filtered results; evidence: ${root}`);
      total=results.length;skipped=total-1;failed=1;
      if(total===4)for(let index=0;index<3;index++)
        assert.match(results[index],new RegExp(`^ok ${index+1} - ${names[index]} # SKIP(?: .*|$)`));
      assert.equal(results[total-1],`not ok ${total} - ${names[3]}`);
    } else {
      assert.equal(results.length,4,`Missing named execution; evidence: ${root}`);
      for(let index=0;index<3;index++)assert.equal(results[index],`ok ${index+1} - ${names[index]}`);
      passed=3;skipped=command.id==='supported'?1:0;failed=1-skipped;
      assert.equal(results[3],skipped?`ok 4 - ${names[3]} # SKIP`:`not ok 4 - ${names[3]}`);
    }
    assert.equal(lines.filter(line=>/^\d+\.\./.test(line)).length,1);
    for(const line of [`1..${total}`,`# tests ${total}`,`# pass ${passed}`,`# fail ${failed}`,'# cancelled 0',`# skipped ${skipped}`,'# todo 0'])
      assert.equal(lines.filter(value=>value===line).length,1,`Missing/duplicate ${line}; evidence: ${root}`);
    assert.equal(process.env.NODE_TEST_CONTEXT,before);
    assert.equal(process.env.NODE_OPTIONS,parentNodeOptions);
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

test('trusted HTTP setup denial is incomplete while subject errors remain failures',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'pigboard-tenant-bind-'));
  const subject=path.join(root,'subject');await exportPublic(subject);
  const grader=fileURLToPath(new URL('../evals/tenant-export/private/grade.mjs',import.meta.url));
  const reference=fileURLToPath(new URL('../evals/tenant-export/private/reference.patch',import.meta.url));
  const childEnv={...process.env};delete childEnv.NODE_TEST_CONTEXT;
  async function run(id,executable,args) {
    const result=spawnSync(executable,args,{cwd:subject,env:childEnv,encoding:'utf8',timeout:10000});
    await writeFile(path.join(root,id+'.stdout.txt'),result.stdout??'');
    await writeFile(path.join(root,id+'.stderr.txt'),result.stderr??'');
    await writeFile(path.join(root,id+'.receipt.json'),JSON.stringify({executable,args,cwd:subject,status:result.status,signal:result.signal,error:result.error?.message??null},null,2));
    assert.equal(result.error,undefined,`Setup error; evidence: ${root}`);assert.equal(result.signal,null);
    return result;
  }
  assert.equal((await run('apply-reference','git',['apply',reference])).status,0);
  const pass={'M1.1':'PASS','M1.2':'PASS','M1.3':'PASS','M1.4':'PASS'};
  for(const code of ['EPERM','EACCES']) {
    const preload=path.join(root,code+'.mjs');
    await writeFile(preload,`import {Server} from 'node:net';\nServer.prototype.listen=function(){queueMicrotask(()=>this.emit('error',Object.assign(new Error('synthetic bind denial'),{code:'${code}'})));return this;};\n`);
    const result=await run(code,process.execPath,['--import',preload,grader,subject]);
    assert.equal(result.status,2);
    const grade=JSON.parse(result.stdout);assert.equal(grade.adapter,'PASS');
    assert.deepEqual(grade.requirements,{...pass,'M1.2':'INCOMPLETE','M1.4':'INCOMPLETE'});
    const httpIds=['http-identity','http-source-error','old-library-and-http'];
    for(const id of httpIds) {
      const observation=grade.observations.find(o=>o.id===id);assert.equal(observation.result,'INCOMPLETE');
      assert.deepEqual(observation.evidence.httpSetup,{phase:'trusted-http-listen',address:'127.0.0.1',port:0,status:'INCOMPLETE',code});
    }
    for(const observation of grade.observations.filter(o=>!httpIds.includes(o.id)))assert.equal(observation.result,'PASS');
  }
  const recovered=await run('recovered',process.execPath,[grader,subject]);assert.equal(recovered.status,0);
  assert.deepEqual(JSON.parse(recovered.stdout).requirements,pass);
  const server=path.join(subject,'server.mjs'), source=await readFile(server,'utf8');
  const declaration='export function createServer({ service, authenticate }) {';
  assert.equal(source.split(declaration).length,2);
  await writeFile(server,source.replace(declaration,declaration+"\n  throw Object.assign(new Error('subject server defect'),{code:'EPERM'});"));
  const spoof=await run('subject-error',process.execPath,[grader,subject]);assert.equal(spoof.status,1);
  const failed=JSON.parse(spoof.stdout);assert.deepEqual(failed.requirements,{...pass,'M1.2':'FAIL','M1.4':'FAIL'});
  for(const id of ['http-identity','http-source-error','old-library-and-http']) {
    const observation=failed.observations.find(o=>o.id===id);assert.equal(observation.result,'FAIL');
    assert.equal(observation.evidence.httpSetup.status,'PASS');assert.match(observation.detail,/subject server defect/);
  }
  await rm(root,{recursive:true});
});
