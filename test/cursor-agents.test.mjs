import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {installCursorAgents} from '../scripts/install-cursor-agents.mjs';

test('phase definitions install outside the app and preserve conflicts',async t=>{
  const temp=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pigboard-phases-')));
  t.after(()=>fs.rm(temp,{recursive:true,force:true}));
  const app=path.join(temp,'app'),directory=path.join(temp,'user','.cursor','agents');
  await fs.mkdir(app);await fs.mkdir(directory,{recursive:true});
  await fs.writeFile(path.join(directory,'other.md'),'unrelated agent');
  const first=await installCursorAgents({app,directory});
  assert.equal(first.actualModelVerified,false);assert.equal(first.definitions.length,2);
  assert.ok(first.definitions.every(x=>!x.reused));
  const reviewer=await fs.readFile(path.join(directory,'pigboard-plan-review.md'),'utf8');
  const executor=await fs.readFile(path.join(directory,'pigboard-execution.md'),'utf8');
  assert.match(reviewer,/model: grok-4\.7\[effort=high,fast=false\]/);
  assert.match(reviewer,/readonly: true/);
  assert.match(executor,/model: grok-4\.7\[effort=medium,fast=false\]/);
  assert.match(executor,/NEEDS_HIGH_PLAN/);
  assert.equal(await fs.readFile(path.join(directory,'other.md'),'utf8'),'unrelated agent');
  assert.deepEqual(await fs.readdir(app),[]);
  assert.ok((await installCursorAgents({app,directory})).definitions.every(x=>x.reused));
  const receipt=execFileSync(process.execPath,[fileURLToPath(new URL('../scripts/install-cursor-agents.mjs',import.meta.url)),'--app',app,'--directory',directory],{encoding:'utf8',env:{...process.env,ROVITO_API_TOKEN:'fixture-secret-never-store'}});
  assert.doesNotMatch(receipt+reviewer+executor,/fixture-secret-never-store/);
  await t.test('different existing definition prevents all publication',async()=>{
    const conflict=path.join(temp,'conflict');await fs.mkdir(conflict);
    await fs.writeFile(path.join(conflict,'pigboard-execution.md'),'operator content');
    await assert.rejects(installCursorAgents({app,directory:conflict}),/differs/);
    assert.deepEqual(await fs.readdir(conflict),['pigboard-execution.md']);
    assert.equal(await fs.readFile(path.join(conflict,'pigboard-execution.md'),'utf8'),'operator content');
  });
  await t.test('project names and declared aliases cannot shadow a phase',async()=>{
    for(const tool of ['.cursor','.claude','.codex']){
      const dir=path.join(app,tool,'agents');await fs.mkdir(dir,{recursive:true});
      for(const [file,content] of [['pigboard-plan-review.md','local'],['other.md','---\nname: pigboard-execution\n---\nlocal']]){
        await fs.writeFile(path.join(dir,file),content);
        await assert.rejects(installCursorAgents({app,directory}),/shadows/);
        await fs.unlink(path.join(dir,file));
      }
      await fs.rm(path.join(app,tool),{recursive:true});
    }
  });
  await t.test('unsafe destinations and linked files stay untouched',async()=>{
    await assert.rejects(installCursorAgents({app,directory:path.join(app,'agents')}),/separate/);
    const checkout=path.join(temp,'checkout');await fs.mkdir(checkout);await fs.writeFile(path.join(checkout,'.git'),'gitdir: elsewhere');
    await assert.rejects(installCursorAgents({app,directory:path.join(checkout,'agents')}),/Git checkouts/);
    const linked=path.join(temp,'linked');await fs.symlink(directory,linked);
    await assert.rejects(installCursorAgents({app,directory:linked}),/canonical/);
    const target=path.join(directory,'pigboard-plan-review.md');await fs.rename(target,target+'.original');await fs.symlink(target+'.original',target);
    await assert.rejects(installCursorAgents({app,directory}),/differs/);
    assert.equal(await fs.readFile(target+'.original','utf8'),reviewer);
    await fs.unlink(target);await fs.rename(target+'.original',target);
  });
});
