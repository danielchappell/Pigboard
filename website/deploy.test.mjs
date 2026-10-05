import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {guard,historicalContract,immutableImage,publish,app} from './deploy.mjs';
import {canonicalOrigin,currentContract} from './smoke.mjs';
const current='a'.repeat(40),old='b'.repeat(40),digest='sha256:'+'c'.repeat(64);
const context={GITHUB_REPOSITORY:'danielchappell/ski-stack',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'push',GITHUB_SHA:current,FLY_API_TOKEN:'test-secret'};
const source=readFileSync(new URL('./build.mjs',import.meta.url),'utf8');
const historical=source.replaceAll('mascot-board-v2.png','mascot-board-v1.png').replaceAll(currentContract.artwork['mascot-board-v2.png'],'d'.repeat(64));
const machine={id:'example',image_ref:{registry:'registry.fly.io',repository:app,digest}};
function fixture(t,options={}) {
 const output=mkdtempSync(join(tmpdir(),'pigboard-deploy-'));t.after(()=>rmSync(output,{recursive:true,force:true}));
 const commands=[],checks=[]; let remoteCalls=0;
 const run=(cmd,args)=>{
  commands.push([cmd,...args]);
  if(cmd==='git') {
   if(args[0]==='rev-parse')return current;
   if(args[0]==='ls-remote')return (++remoteCalls===2 && options.stale?'e'.repeat(40):current)+'\trefs/heads/main';
   if(args[0]==='show')return options.badContract?'malformed':historical;
   return '';
  }
  if(args[0]==='machine')return JSON.stringify(options.first?[]:[options.machine || machine]);
  if(args[0]==='config')return "app = 'pigboard-website'\nprimary_region = 'cdg'";
  if(args[0]==='deploy') {
   if(args.includes('--image') && options.rollbackFailure)throw new Error('rollback rejected');
   if(!args.includes('--image') && options.deployFailure)throw new Error('deployment interrupted');
   return '';
  }
  throw new Error('Unexpected command');
 };
 const verify=async({commit,contract})=>{
  checks.push({commit,contract});
  if(commit===current && options.smokeFailure)throw new Error('new release smoke failed');
  if(commit===old)assert.deepEqual(contract,historicalContract(historical));
 };
 const args={env:{...context,...options.env},run,verify,buildSite:()=>{},pause:async()=>{},output,
  fetcher:async()=>({ok:true,json:async()=>({commit:old,origin:canonicalOrigin,preview:false})})};
 return {args,commands,checks,output};
}
test('release context rejects foreign, PR, branch, token and stale revisions',()=>{
 for(const [key,value] of [['GITHUB_REPOSITORY','other/repo'],['GITHUB_REF','refs/heads/test'],['GITHUB_EVENT_NAME','pull_request'],['GITHUB_SHA','local'],['FLY_API_TOKEN','']]) assert.throws(()=>guard({...context,[key]:value},current,current));
 assert.throws(()=>guard(context,old,current));assert.throws(()=>guard(context,current,old));
 guard(context,current,current);
});
test('historical contracts are parsed as data and unsupported exports fail closed',()=>{
 assert.deepEqual(historicalContract(source),currentContract);
 for(const bad of [source.replace("'mascot-board-v2.png'","getName()"),source.replace("['index.html'","[calculateRoute()"),source.replace("'styles.css'","'styles.css'").replace('export const routes = [','const routes = [')])assert.throws(()=>historicalContract(bad));
 assert.throws(()=>immutableImage({...machine,image_ref:{...machine.image_ref,repository:'rovito-oauth'}}));
});
test('wrong context and a main change just before deploy never mutate Fly',async t=>{
 for(const options of [{env:{GITHUB_EVENT_NAME:'pull_request'}},{stale:true},{badContract:true},{machine:{...machine,image_ref:{...machine.image_ref,digest:'latest'}}}]){
  const f=fixture(t,options); const result=await publish(f.args);
  assert.equal(result.status,'refused');assert.equal(f.commands.some(c=>c[0]==='flyctl'&&c[1]==='deploy'),false);
 }
});
test('first launch succeeds with exact current verification',async t=>{
 const f=fixture(t,{first:true});const result=await publish(f.args);
 assert.equal(result.status,'deployed');assert.equal(result.previous,null);assert.equal(f.checks[0].commit,current);
});
test('failed first launch records partial failure without inventing rollback',async t=>{
 const f=fixture(t,{first:true,deployFailure:true});const result=await publish(f.args);
 assert.equal(result.status,'first_release_failed');assert.equal(f.commands.filter(c=>c.includes('--image')).length,0);
 assert.equal(JSON.parse(readFileSync(join(f.output,'release.json'))).status,'first_release_failed');
});
test('failed replacement restores immutable image/config and OLD artwork contract',async t=>{
 for(const mode of [{smokeFailure:true},{deployFailure:true}]){
  const f=fixture(t,mode);const result=await publish(f.args);
  assert.equal(result.status,'rolled_back');assert.ok(result.error);
  const rollback=f.commands.find(c=>c.includes('--image'));
  assert.equal(rollback[rollback.indexOf('--image')+1],`registry.fly.io/${app}@${digest}`);
  assert.equal(rollback[rollback.indexOf('--config')+1],join(f.output,'previous.toml'));
  assert.equal(f.checks.at(-1).commit,old);
  assert.equal(f.checks.at(-1).contract.artwork['mascot-board-v1.png'],'d'.repeat(64));
  assert.equal(f.checks.at(-1).contract.artwork['mascot-board-v2.png'],undefined);
 }
});
test('rollback failure preserves both failure outcomes',async t=>{
 const f=fixture(t,{deployFailure:true,rollbackFailure:true});const result=await publish(f.args);
 assert.equal(result.status,'rollback_failed');assert.match(result.error,/deployment interrupted/);assert.match(result.rollback_error,/rollback rejected/);
});
