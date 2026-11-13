import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('../scripts/configure-reviewer-cli.mjs',import.meta.url));
test('persistent reviewer profile stays isolated, read-only and credential-free',async t=>{
  const tmp=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'reviewer-config-')));
  t.after(()=>fs.rm(tmp,{recursive:true,force:true}));
  const app=path.join(tmp,'app'),root=path.join(tmp,'reviewer');await fs.mkdir(app);
  const args=['--email','reviewer@example.test','--account-uuid','{11111111-1111-1111-1111-111111111111}',
    '--repository','workspace/repo','--repository-uuid','{22222222-2222-2222-2222-222222222222}','--app',app,'--root',root];
  const run=(argv=args)=>execFileSync(process.execPath,[script,...argv],{encoding:'utf8',stdio:'pipe',env:{...process.env,ROVITO_API_TOKEN:'fixture-do-not-store',ROVITO_PROFILE:'unrelated'}});
  const first=JSON.parse(run());assert.equal(first.configured,true);assert.equal(first.reused,false);
  const configPath=path.join(root,'config/rovito/config.json');const text=await fs.readFile(configPath,'utf8');
  const config=JSON.parse(text);assert.equal(config.active_profile,'pigboard-pr-review');
  assert.equal(config.profiles['pigboard-pr-review'].policy,'read-only');
  assert.equal(config.profiles['pigboard-pr-review'].username,'reviewer@example.test');
  assert.equal(config.profiles['pigboard-pr-review'].default_repository,'workspace/repo');
  assert.doesNotMatch(text,/fixture-do-not-store|unrelated/);
  assert.equal((await fs.stat(configPath)).mode & 0o777,0o600);
  assert.equal((await fs.stat(root)).mode & 0o777,0o700);
  assert.deepEqual(await fs.readdir(app),[]);
  assert.equal(JSON.parse(run()).reused,true);
  const capability=JSON.parse(await fs.readFile(path.join(root,'capability.json'),'utf8'));
  assert.equal(capability.configHome,path.join(root,'config'));assert.equal(capability.fullReviewReady,false);
  await t.test('mismatched profile is preserved',async()=>{
    await fs.writeFile(configPath,text.replace('read-only','review-write'));
    assert.throws(()=>run());assert.match(await fs.readFile(configPath,'utf8'),/review-write/);
    await fs.writeFile(configPath,text);
  });
  await t.test('unsafe existing config is preserved',async()=>{
    await fs.chmod(configPath,0o644);assert.throws(()=>run());await fs.chmod(configPath,0o600);
    await fs.rename(configPath,configPath+'.original');await fs.symlink(configPath+'.original',configPath);
    assert.throws(()=>run());assert.equal(await fs.readFile(configPath+'.original','utf8'),text);
    await fs.unlink(configPath);await fs.rename(configPath+'.original',configPath);
  });
  await t.test('invalid identity and unsupported policy cannot create a profile',()=>{
    assert.throws(()=>run(args.map(x=>x==='workspace/repo'?'../repo':x)));
    assert.throws(()=>run(args.map(x=>x==='reviewer@example.test'?'bad\nemail':x)));
    assert.throws(()=>run([...args,'--policy','admin']));
    assert.throws(()=>run([...args,'--email','another@example.test']));
  });
  await t.test('review-write is explicit, reusable and does not imply verified access',async()=>{
    const writeRoot=path.join(tmp,'reviewer-write');
    const writeArgs=[...args.map(x=>x===root?writeRoot:x),'--policy','review-write'];
    const receipt=JSON.parse(run(writeArgs));
    assert.equal(receipt.policy,'review-write');assert.equal(receipt.providerAccessVerified,false);
    const writeConfigPath=path.join(writeRoot,'config/rovito/config.json');
    const writeConfig=await fs.readFile(writeConfigPath,'utf8');
    const writeCapability=await fs.readFile(path.join(writeRoot,'capability.json'),'utf8');
    assert.equal(JSON.parse(writeConfig).profiles['pigboard-pr-review'].policy,'review-write');
    assert.equal(JSON.parse(writeCapability).policy,'review-write');
    assert.equal(JSON.parse(writeCapability).providerAccessVerified,false);
    assert.equal(JSON.parse(writeCapability).fullReviewReady,false);
    assert.doesNotMatch(writeConfig+writeCapability,/fixture-do-not-store|unrelated/);
    assert.equal(JSON.parse(run(writeArgs)).reused,true);
    assert.throws(()=>run([...args,'--policy','review-write']));
    assert.equal(await fs.readFile(configPath,'utf8'),text);
    assert.throws(()=>run(args.map(x=>x===root?writeRoot:x)));
    assert.equal(await fs.readFile(writeConfigPath,'utf8'),writeConfig);
    assert.equal(await fs.readFile(path.join(writeRoot,'capability.json'),'utf8'),writeCapability);
  });
  await t.test('invalid policy creates no destination',async()=>{
    const invalidRoot=path.join(tmp,'invalid');
    for(const policy of ['admin','automation','review','READ-ONLY']){
      assert.throws(()=>run([...args.map(x=>x===root?invalidRoot:x),'--policy',policy]));
      await assert.rejects(fs.stat(invalidRoot),{code:'ENOENT'});
    }
  });
  await t.test('application and other checkout destinations are rejected',async()=>{
    assert.throws(()=>run(args.map(x=>x===root?path.join(app,'config'):x)));
    const other=path.join(tmp,'checkout');await fs.mkdir(other);await fs.writeFile(path.join(other,'.git'),'gitdir: elsewhere');
    assert.throws(()=>run(args.map(x=>x===root?path.join(other,'config'):x)));
    const linked=path.join(tmp,'linked');await fs.symlink(root,linked);assert.throws(()=>run(args.map(x=>x===root?linked:x)));
    assert.throws(()=>run(args.map(x=>x===root?'relative':x)));
  });
});
