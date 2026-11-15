import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, lstat, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { exportPublic, publicFiles } from '../evals/tenant-export/export-public.mjs';
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
