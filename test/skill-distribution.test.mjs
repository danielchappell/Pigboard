import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { prepare } from '../scripts/prepare-pigboard-skills.mjs';
const bundle = JSON.parse(await readFile(new URL('../config/skill-bundle.json', import.meta.url)));
const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim();
async function fixture(t) {
 const root = await mkdtemp(path.join(os.tmpdir(), 'pigboard-test-'));
 t.after(() => rm(root, { recursive: true, force: true }));
 const source=path.join(root,'source'), app=path.join(root,'app'), cache=path.join(root,'cache');
 await mkdir(source); await mkdir(app); git(source,'init','-b','main');
 git(source,'config','user.name','Fixture'); git(source,'config','user.email','fixture@example.invalid');
 for(const name of bundle.skills){await mkdir(path.join(source,'skills',name),{recursive:true});await writeFile(path.join(source,'skills',name,'SKILL.md'),name);}
 for(const d of bundle.dependencyDirectories) await mkdir(path.join(source,'skills',d),{recursive:true});
 git(source,'add','.');git(source,'commit','-m','initial');
 return {source,app,cache,ref:'main'};
}
const installed=[];
const install=async dir=>{installed.push(dir);await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'installed'),'yes');};
test('fetch and refresh preserve prior release and application; prepare dependencies', async t=>{
 const o=await fixture(t); const a=await prepare(o,install);
 assert.equal(await readFile(path.join(a.skills,'qa-api/SKILL.md'),'utf8'),'qa-api');
 assert.equal((await readdir(o.app)).length,0);
 await writeFile(path.join(o.source,'skills/qa-api/SKILL.md'),'updated');git(o.source,'add','.');git(o.source,'commit','-m','update');
 const b=await prepare(o,install);assert.notEqual(a.commit,b.commit);
 assert.equal(await readFile(path.join(a.skills,'qa-api/SKILL.md'),'utf8'),'qa-api');
 assert.equal(await readFile(path.join(b.skills,'qa-api/SKILL.md'),'utf8'),'updated');
 assert.equal(await readFile(path.join(b.skills,'qa-bruno/scripts/installed'),'utf8'),'yes');
 assert.ok(JSON.parse(await readFile(b.manifest)).sourceFiles['qa-api/SKILL.md']);
});
test('invalid ref and dependency failure publish nothing',async t=>{
 const o=await fixture(t);await assert.rejects(prepare({...o,ref:'missing'},install));
 await assert.rejects(prepare(o,async()=>{throw new Error('dependency failure');}));
 assert.deepEqual(await readdir(o.cache),[]);
});
test('missing helper and symlink cannot publish a release',async t=>{
 const o=await fixture(t);await rm(path.join(o.source,'skills/pr-review'),{recursive:true});git(o.source,'add','.');git(o.source,'commit','-m','missing');
 await assert.rejects(prepare(o,install));
 await mkdir(path.join(o.source,'skills/pr-review'));await writeFile(path.join(o.source,'skills/pr-review/SKILL.md'),'review');
 await symlink('/etc/passwd',path.join(o.source,'skills/qa-ui/leak'));git(o.source,'add','.');git(o.source,'commit','-m','link');
 await assert.rejects(prepare(o,install),/symlink/);assert.deepEqual(await readdir(o.cache),[]);
});
test('reject app paths, other git worktrees and symlink aliases',async t=>{
 const o=await fixture(t);
 await assert.rejects(prepare({...o,cache:path.join(o.app,'cache')},install),/separate/);
 await assert.rejects(prepare({...o,cache:path.join(o.source,'cache')},install),/Git checkout/);
 const alias=path.join(path.dirname(o.app),'alias');await symlink(o.app,alias);
 await assert.rejects(prepare({...o,cache:path.join(alias,'cache')},install),/separate/);
});
test('concurrent installs publish separate stable receipts',async t=>{
 const o=await fixture(t);const [a,b]=await Promise.all([prepare(o,install),prepare(o,install)]);
 assert.equal(a.commit,b.commit);assert.notEqual(a.release,b.release);
 assert.equal((await readdir(o.cache)).length,2);
});
test('reject a symlink at the skills root before reading external data',async t=>{
 const o=await fixture(t); const external=path.join(path.dirname(o.source),'external');
 const {rename}=await import('node:fs/promises');
 await rename(path.join(o.source,'skills'),external);
 await symlink(external,path.join(o.source,'skills'));
 git(o.source,'add','-A');git(o.source,'commit','-m','root symlink');
 await assert.rejects(prepare(o,install),/symlink/);
 assert.deepEqual(await readdir(o.cache),[]);
});
