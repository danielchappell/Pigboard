import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, readdir, chmod, rm, realpath, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const installer = fileURLToPath(new URL('../config/cursor/rovito-install.sh', import.meta.url));
// Fixture tools simulate the vendor download/hash/probes. Real Linux acceptance
// uses the official archive and is a separate Cursor Build gate.
test('Rovito setup publishes verified tools and preserves failures', async t => {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), 'pigboard-rovito-')));
  t.after(() => rm(tmp,{recursive:true,force:true}));
  const bin=path.join(tmp,'bin'), app=path.join(tmp,'app');
  await mkdir(bin); await mkdir(app);
  const log=path.join(tmp,'events'), control=path.join(tmp,'control');
  const binary=`#!${process.execPath}
const fs=require('node:fs');
if(process.env.ROVITO_API_TOKEN || process.env.ROVITO_EMAIL || process.env.ROVITO_PROFILE || process.env.XDG_CONFIG_HOME) throw Error('inherited credentials/config');
fs.appendFileSync(${JSON.stringify(log)},'probe\\n');
if(fs.readFileSync(${JSON.stringify(control)},'utf8')==='probe-failure') process.exit(1);
if(process.argv.includes('version')) console.log(JSON.stringify({data:{version:'0.1.295'}}));
`;
  const driver=`#!${process.execPath}
const fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2), name=path.basename(process.argv[1]);
const mode=fs.readFileSync(${JSON.stringify(control)},'utf8');
const log=${JSON.stringify(log)};
if(name==='uname'){console.log(args[0]==='-s'?'Linux':mode==='wrong-platform'?'aarch64':'x86_64');process.exit(0);}
if(name==='curl'){
 if(process.env.ROVITO_API_TOKEN || process.env.ROVITO_EMAIL) throw Error('secret inherited');
 fs.appendFileSync(log,JSON.stringify(args)+'\\n');
 fs.writeFileSync(args[args.indexOf('--output')+1],mode==='corrupt-download'?'bad':'fixture archive');process.exit(0);
}
if(name==='sha256sum'){
 const line=fs.readFileSync(0,'utf8').trim(); const file=line.slice(line.indexOf('  ')+2);
 const content=fs.readFileSync(file,'utf8');
 if(file.endsWith('.tar.gz')){if(content!=='fixture archive')process.exit(1);}
 else if(content!==${JSON.stringify(binary)})process.exit(1);
 process.exit(0);
}
if(name==='tar'){
 fs.appendFileSync(log,'extract\\n');
 const dir=args[args.indexOf('-C')+1];
 for(const file of ['docs/cli.md','docs/oauth.md','schemas/rovito.review-submission.v1.schema.json','LICENSE','NOTICE']){
  fs.mkdirSync(path.dirname(path.join(dir,file)),{recursive:true});fs.writeFileSync(path.join(dir,file),'fixture');
 }
 fs.writeFileSync(path.join(dir,'rovito'),${JSON.stringify(binary)},{mode:0o700});
}
`;
  for(const tool of ['uname','curl','sha256sum','tar']){
    await writeFile(path.join(bin,tool),driver); await chmod(path.join(bin,tool),0o700);
  }
  const root=path.join(tmp,'tools'), dest=path.join(root,'rovito-0.1.295-linux-amd64');
  const env={...process.env,PATH:bin+path.delimiter+process.env.PATH,PIGBOARD_APP:app,PIGBOARD_TOOL_ROOT:root,
    ROVITO_API_TOKEN:'fixture-secret-never-log',ROVITO_EMAIL:'fixture@example.test',ROVITO_PROFILE:'fixture',XDG_CONFIG_HOME:tmp};
  const run=(extra={})=>execFileSync('bash',[installer],{env:{...env,...extra},encoding:'utf8',stdio:'pipe'});
  async function reset(mode='') {await writeFile(control,mode); await writeFile(log,'');}
  await t.test('download, verify, publish and reuse without credentials',async()=>{
    await reset(); const receipt=JSON.parse(run());
    assert.equal(receipt.executable,path.join(dest,'rovito'));assert.equal(receipt.reused,false);
    const events=await readFile(log,'utf8'); assert.match(events,/--proto-redir/); assert.match(events,/--max-time/);
    assert.ok(events.indexOf('extract') < events.indexOf('probe'));
    await reset(); assert.equal(JSON.parse(run()).reused,true);
    assert.equal(await readFile(log,'utf8'),'probe\nprobe\n');
    assert.deepEqual(await readdir(root),['rovito-0.1.295-linux-amd64']);
  });
  await t.test('tampered existing binary is preserved and never executed',async()=>{
    await writeFile(path.join(dest,'rovito'),'unmanaged'); await reset(); assert.throws(()=>run());
    assert.equal(await readFile(path.join(dest,'rovito'),'utf8'),'unmanaged');
    assert.equal(await readFile(log,'utf8'),''); await rm(root,{recursive:true});
  });
  await t.test('corrupt download is not extracted or executed',async()=>{
    await reset('corrupt-download');assert.throws(()=>run());
    assert.doesNotMatch(await readFile(log,'utf8'),/extract|probe/);assert.deepEqual(await readdir(root),[]);
  });
  await t.test('failed executable probe is not published',async()=>{
    await reset('probe-failure');assert.throws(()=>run());assert.deepEqual(await readdir(root),[]);
  });
  await t.test('unsupported machine stops before download',async()=>{
    await reset('wrong-platform');assert.throws(()=>run());assert.equal(await readFile(log,'utf8'),'');
  });
  await t.test('unsafe roots and symlink destinations are refused',async()=>{
    await reset(); await mkdir(path.join(app,'.git'));
    assert.throws(()=>run({PIGBOARD_TOOL_ROOT:path.join(app,'tools')}));
    assert.throws(()=>run({PIGBOARD_TOOL_ROOT:'relative'}));
    assert.throws(()=>run({PIGBOARD_TOOL_ROOT:'/'}));
    const checkout=path.join(tmp,'other-checkout');await mkdir(checkout);await writeFile(path.join(checkout,'.git'),'gitdir: elsewhere');
    assert.throws(()=>run({PIGBOARD_TOOL_ROOT:path.join(checkout,'tools')}));
    const linked=path.join(tmp,'linked');await symlink(root,linked);
    assert.throws(()=>run({PIGBOARD_TOOL_ROOT:linked}));
    await symlink(app,dest);assert.throws(()=>run());
    assert.equal(await readFile(log,'utf8'),'');
  });
});
