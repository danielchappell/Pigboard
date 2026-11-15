import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, lstat, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { exportPublic, publicFiles } from '../evals/tenant-export/export-public.mjs';
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
