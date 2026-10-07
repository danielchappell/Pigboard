import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, renameSync, readdirSync, existsSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {build, buildMode, promote, source, assetSource} from './build.mjs';

const expectedArtwork = {
  'mascot-board-v1.png':'2c71d6bb56c00d716d7f686660021f7f1518a7ae1761f36c44e620dbb144e0cd',
  'lockup-graphite-v1.png':'58bebdc91db30033ac9070bafdc951d5fb064328a88b64c11dd82b15df755bac',
  'avatar-graphite-v1.png':'1ee65c0d994cf39c0d10857140c99b7127d1056257d199e442f3671e309cb9d8'
};
const revision = '533a1c9d99e2c6ba01d08c2796625a54be59fccf';
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(),'pigboard-website-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  return {root, out:join(root,'out'), origin:'http://127.0.0.1:8772', commit:'local'};
}
const read = (out,file) => readFileSync(join(out,file),'utf8');

test('complete preview has working local links, semantic pages and unchanged approved artwork', t => {
  const options=fixture(t); build(options);
  const files=['index.html','method.html','status.html'];
  for (const file of files) {
    const html=read(options.out,file);
    assert.equal((html.match(/<h1\b/g)||[]).length,1,file);
    assert.match(html,/<main\b/); assert.match(html,/noindex, nofollow/);
    assert.doesNotMatch(html,/\{\{\w+\}\}/);
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size,'unique IDs in '+file);
    for (const [,link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^https?:/.test(link)) continue;
      const url=new URL(link,'http://127.0.0.1:8772/'+file);
      const target=url.pathname==='/'?'index.html':url.pathname.slice(1);
      assert.ok(existsSync(join(options.out,target)),file+' -> '+link);
      if (url.hash) assert.ok(read(options.out,target).includes('id="'+url.hash.slice(1)+'"'),file+' -> '+link);
    }
  }
  const home=read(options.out,'index.html');
  assert.match(home,/data-tablist[^>]*hidden/);
  assert.match(home,/data-copy="feature-brief" hidden/);
  for (const panel of [...home.matchAll(/<section[^>]*class="command-panel"[^>]*>/g)]) assert.doesNotMatch(panel[0],/hidden/);
  assert.equal([...home.matchAll(/class="command-panel"/g)].length,3);
  for (const [file,hash] of Object.entries(expectedArtwork)) {
    assert.equal(createHash('sha256').update(readFileSync(join(options.out,'assets',file))).digest('hex'),hash);
  }
  assert.match(read(options.out,'robots.txt'),/Disallow: \//);
  assert.deepEqual(JSON.parse(read(options.out,'version.json')),{origin:options.origin,commit:'local',preview:true});
});

test('public build binds canonical URLs, sitemap and revision; loopback always stays a preview', t => {
  const options={...fixture(t),origin:'https://pigboard.example',commit:revision}; build(options);
  assert.match(read(options.out,'index.html'),/href="https:\/\/pigboard\.example\/"/);
  assert.match(read(options.out,'method.html'),/href="https:\/\/pigboard\.example\/method.html"/);
  assert.equal((read(options.out,'sitemap.xml').match(/<loc>/g)||[]).length,3);
  assert.match(read(options.out,'robots.txt'),/Allow: \//);
  assert.equal(JSON.parse(read(options.out,'version.json')).commit,revision);
  assert.equal(buildMode('https://localhost',revision).preview,true);
  for (const [origin,commit] of [
    ['https://pigboard.example','local'], ['http://pigboard.example',revision],
    ['https://user:pass@pigboard.example',revision],['https://pigboard.example/path',revision],
    ['https://pigboard.example/?x=1',revision],['https://pigboard.example/#x',revision],
    ['file:///tmp','local'],['broken','local'],['https://pigboard.example','1234567']
  ]) assert.throws(()=>buildMode(origin,commit),origin+' '+commit);
});

test('failed source validation preserves the old build; successful replacement removes stale routes', t => {
  const options=fixture(t); build(options);
  const before=read(options.out,'index.html');
  writeFileSync(join(options.out,'obsolete.html'),'old route');
  const sourceDir=join(options.root,'source'); cpSync(source,sourceDir,{recursive:true});
  writeFileSync(join(sourceDir,'pages/index.html'),'{{unknown}}');
  assert.throws(()=>build({...options,sourceDir}),/Unknown page placeholder/);
  writeFileSync(join(sourceDir,'pages/index.html'),'{{constructor}}');
  assert.throws(()=>build({...options,sourceDir}),/Unknown page placeholder/);
  assert.equal(read(options.out,'index.html'),before);
  assert.equal(read(options.out,'obsolete.html'),'old route');
  const assetsDir=join(options.root,'artwork'); cpSync(assetSource,assetsDir,{recursive:true});
  writeFileSync(join(assetsDir,'mascot-board-v1.png'),'changed');
  assert.throws(()=>build({...options,assetsDir}),/Approved artwork changed/);
  rmSync(join(assetsDir,'mascot-board-v1.png'));
  assert.throws(()=>build({...options,assetsDir}),/ENOENT/);
  assert.equal(read(options.out,'index.html'),before);
  build(options); assert.equal(existsSync(join(options.out,'obsolete.html')),false);
  assert.deepEqual(readdirSync(options.root).filter(x=>x.includes('-build-')||x.includes('.previous-')),[]);
});

test('output ownership rejects files, unrelated directories and symlinks without deleting them', t => {
  const options=fixture(t);
  writeFileSync(options.out,'keep'); assert.throws(()=>build(options),/directory/);
  assert.equal(readFileSync(options.out,'utf8'),'keep'); rmSync(options.out);
  mkdirSync(options.out); writeFileSync(join(options.out,'important'),'keep');
  assert.throws(()=>build(options),/unrelated/); assert.equal(read(options.out,'important'),'keep');
  const link=join(options.root,'link'); symlinkSync(options.out,link);
  assert.throws(()=>build({...options,out:link}),/symlink/);
  const dangling=join(options.root,'dangling'); symlinkSync(join(options.root,'missing'),dangling);
  assert.throws(()=>build({...options,out:dangling}),/symlink/);
});

function staged(t) {
  const options=fixture(t); build(options);
  const stage=join(options.root,'staged'); mkdirSync(stage); writeFileSync(join(stage,'index.html'),'new');
  return {...options,stage};
}
test('failed promotion restores previous complete build and cleans owned staging', t => {
  const {out,stage,root}=staged(t); const before=read(out,'index.html');
  assert.throws(()=>promote(stage,out,{rename:(from,to)=>{
    if(from===stage) throw new Error('injected promotion failure'); renameSync(from,to);
  }}),/injected promotion failure/);
  assert.equal(read(out,'index.html'),before); assert.equal(existsSync(stage),false);
  assert.deepEqual(readdirSync(root),['out']);
});
test('failed restoration retains both recovery paths and reports them', t => {
  const {out,stage,root}=staged(t); let error;
  try { promote(stage,out,{rename:(from,to)=>{
    if (from===stage || from.includes('.previous-')) throw new Error('injected rename failure');
    renameSync(from,to);
  }}); } catch (caught) { error=caught; }
  assert.ok(error instanceof AggregateError);
  const backup=join(root,readdirSync(root).find(x=>x.startsWith('out.previous-')));
  assert.ok(error.message.includes(backup)); assert.ok(error.message.includes(stage));
  assert.match(read(backup,'index.html'),/Pigboard/); assert.equal(read(stage,'index.html'),'new');
});
test('post-promotion cleanup failure reports a complete new site and retained backup', t => {
  const {out,stage}=staged(t);
  const result=promote(stage,out,{remove:()=>{throw new Error('injected cleanup failure');}});
  assert.equal(read(out,'index.html'),'new'); assert.ok(result.retainedBackup);
  assert.match(read(result.retainedBackup,'index.html'),/Pigboard/);
});
